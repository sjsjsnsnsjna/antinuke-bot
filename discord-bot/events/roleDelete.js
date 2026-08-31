'use strict';

const { AuditLogEvent } = require('discord.js');
const { checkAndRecord, isBotAction } = require('../detection/actionTracker');
const { quarantineUser, sendLogAlert, fetchAuditLogEntry, shouldSkip } = require('../utils/quarantine');
const { alertMessage } = require('../utils/components');
const { getLatestSnapshot } = require('../database/db');
const { restoreRoles } = require('../backup/restore');
const logger = require('../utils/logger');

module.exports = {
  name: 'roleDelete',
  once: false,
  async execute(client, role) {
    try {
      if (!role.guild) return;
      if (isBotAction('roleDelete', role.name)) return;

      const guild = role.guild;
      const entry = await fetchAuditLogEntry(guild, AuditLogEvent.RoleDelete, role.id);
      const actor = entry?.executor;

      if (!actor || shouldSkip(actor.id, client.user.id)) return;

      const { triggered, count } = checkAndRecord(actor.id, 'roleDelete');
      if (!triggered) return;

      logger.warn(`[roleDelete] EŞİK AŞILDI: ${actor.tag} ${count} rol sildi!`);

      let member;
      try { member = await guild.members.fetch(actor.id); } catch {}

      let actionText = 'Üye bulunamadı.';
      if (member) {
        try {
          await member.kick(`${count} rol silme (saldırı)`);
          actionText = `${actor.tag} atıldı (kick).`;
        } catch {
          const result = await quarantineUser(guild, member, `${count} rol silme (saldırı)`, client);
          actionText = result.success
            ? `${actor.tag} karantinaya alındı (kick başarısız).`
            : `Kick ve karantina başarısız: ${result.reason}`;
        }
      }

      let restoreText = 'Yedek bulunamadı.';
      try {
        const snap = getLatestSnapshot();
        if (snap?.data) {
          const res = await restoreRoles(guild, snap.data, 'AntiNuke: Otomatik rol geri yükleme');
          restoreText = `${res.created} rol yeniden oluşturuldu, ${res.errors} hata.`;
        }
      } catch (err) {
        restoreText = `Geri yükleme hatası: ${err.message}`;
      }

      const payload = alertMessage(
        '🚨 ROL SİLME SALDIRISI',
        `**Saldırgan:** ${actor.tag} (${actor.id})\n**Silinen Rol:** ${role.name}\n**Toplam:** ${count}`,
        [
          { name: '🛡️ Bot Aksiyonu', value: actionText },
          { name: '💾 Geri Yükleme', value: restoreText },
        ],
      );

      await sendLogAlert(client, payload);
      try {
        const ownerMember = await guild.members.fetch(guild.ownerId);
        await ownerMember.send(alertMessage('🚨 Acil', `${actor.tag} mass rol sildi! ${guild.name}`));
      } catch {}
    } catch (err) {
      logger.error('[roleDelete event]', err);
    }
  },
};
