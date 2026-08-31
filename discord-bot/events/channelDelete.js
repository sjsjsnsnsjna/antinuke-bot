'use strict';

const { AuditLogEvent } = require('discord.js');
const { checkAndRecord, isBotAction } = require('../detection/actionTracker');
const { quarantineUser, sendLogAlert, fetchAuditLogEntry, shouldSkip } = require('../utils/quarantine');
const { alertMessage, successMessage } = require('../utils/components');
const { getLatestSnapshot } = require('../database/db');
const { restoreChannels } = require('../backup/restore');
const logger = require('../utils/logger');

module.exports = {
  name: 'channelDelete',
  once: false,
  async execute(client, channel) {
    try {
      if (!channel.guild) return;
      // Skip if bot performed this action (e.g. it won't delete channels, but just in case)
      if (isBotAction('channelDelete', channel.name)) return;

      const guild  = channel.guild;
      const entry  = await fetchAuditLogEntry(guild, AuditLogEvent.ChannelDelete, channel.id);
      const actor  = entry?.executor;

      if (!actor || shouldSkip(actor.id, client.user.id)) return;

      const { triggered, count } = checkAndRecord(actor.id, 'channelDelete');

      if (!triggered) {
        // Log single deletion but don't act yet
        logger.info(`[channelDelete] ${actor.tag} #${channel.name} sildi. (${count})`);
        return;
      }

      logger.warn(`[channelDelete] EŞİK AŞILDI: ${actor.tag} ${count} kanal sildi!`);

      // Attempt quarantine
      let member;
      try { member = await guild.members.fetch(actor.id); } catch {}

      let actionText = 'Üye sunucuda bulunamadı, işlem yapılamadı.';
      if (member) {
        try {
          await member.kick(`${count} kanal silme (saldırı)`);
          actionText = `${actor.tag} atıldı (kick).`;
        } catch {
          const result = await quarantineUser(guild, member, `${count} kanal silme (saldırı)`, client);
          if (result.success) {
            actionText = `${actor.tag} karantinaya alındı (kick başarısız).`;
          } else if (result.reason === 'OWNER') {
            actionText = '⚠️ Sunucu sahibi — işlem yapılamaz!';
          } else if (result.reason === 'HIGHER_ROLE') {
            actionText = '⚠️ Bottan yüksek rütbe — işlem yapılamaz!';
          } else {
            actionText = `Kick ve karantina başarısız: ${result.reason}`;
          }
        }
      }

      // Attempt channel restore from snapshot
      let restoreText = 'Yedek bulunamadı, kanal geri yüklenemedi.';
      try {
        const snap = getLatestSnapshot();
        if (snap?.data) {
          const res = await restoreChannels(guild, snap.data, 'AntiNuke: Otomatik kanal geri yükleme');
          restoreText = `${res.created} kanal yeniden oluşturuldu, ${res.errors} hata.`;
        }
      } catch (err) {
        restoreText = `Geri yükleme hatası: ${err.message}`;
      }

      const payload = alertMessage(
        '🚨 KANAL SİLME SALDIRISI',
        `**Saldırgan:** ${actor.tag} (${actor.id})\n**Silinen Kanal:** #${channel.name}\n**Toplam Silme:** ${count}`,
        [
          { name: '🛡️ Bot Aksiyonu', value: actionText },
          { name: '💾 Geri Yükleme', value: restoreText },
        ],
      );

      await sendLogAlert(client, payload);
      try {
        const ownerMember = await guild.members.fetch(guild.ownerId);
        await ownerMember.send(alertMessage('🚨 Acil Durum', `${actor.tag} mass kanal sildi! Sunucu: ${guild.name}`));
      } catch {}
    } catch (err) {
      logger.error('[channelDelete event]', err);
    }
  },
};
