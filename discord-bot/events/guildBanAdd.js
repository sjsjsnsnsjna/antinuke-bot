'use strict';

const { AuditLogEvent } = require('discord.js');
const { checkAndRecord, isBotAction } = require('../detection/actionTracker');
const { quarantineUser, sendLogAlert, dmWhitelistedAdmins, fetchAuditLogEntry, shouldSkip } = require('../utils/quarantine');
const { alertMessage } = require('../utils/components');
const logger = require('../utils/logger');

module.exports = {
  name: 'guildBanAdd',
  once: false,
  async execute(client, ban) {
    try {
      const guild = ban.guild;
      if (isBotAction('ban', ban.user.id)) return;

      const entry = await fetchAuditLogEntry(guild, AuditLogEvent.MemberBanAdd, ban.user.id);
      const actor = entry?.executor;

      if (!actor || shouldSkip(actor.id, client.user.id)) return;

      const { triggered, count } = checkAndRecord(actor.id, 'banAdd');
      if (!triggered) return;

      logger.warn(`[guildBanAdd] EŞİK AŞILDI: ${actor.tag} ${count} ban!`);

      let member;
      try { member = await guild.members.fetch(actor.id); } catch {}

      let actionText = 'Üye bulunamadı.';
      if (member) {
        // Önce kick dene, başarısız olursa karantinaya al
        try {
          await member.kick(`${count} ban (mass ban saldırısı)`);
          actionText = `${actor.tag} atıldı (kick).`;
        } catch {
          const result = await quarantineUser(guild, member, `${count} ban (mass ban saldırısı)`, client);
          actionText = result.success
            ? `${actor.tag} karantinaya alındı (kick başarısız).`
            : `Kick ve karantina başarısız: ${result.reason}`;
        }
      }

      const payload = alertMessage(
        '🚨 MASS BAN SALDIRISI',
        `**Saldırgan:** ${actor.tag} (${actor.id})\n**Son Hedef:** ${ban.user.tag}\n**Toplam Ban:** ${count}`,
        [{ name: '🛡️ Bot Aksiyonu', value: actionText }],
      );

      await sendLogAlert(client, payload);
      await dmWhitelistedAdmins(client, alertMessage('🚨 Acil', `${actor.tag} mass ban yaptı! ${guild.name}`));
    } catch (err) {
      logger.error('[guildBanAdd event]', err);
    }
  },
};
