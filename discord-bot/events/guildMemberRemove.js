'use strict';

const { AuditLogEvent } = require('discord.js');
const { checkAndRecord, isBotAction } = require('../detection/actionTracker');
const { quarantineUser, sendLogAlert, fetchAuditLogEntry, shouldSkip } = require('../utils/quarantine');
const { alertMessage } = require('../utils/components');
const logger = require('../utils/logger');

module.exports = {
  name: 'guildMemberRemove',
  once: false,
  async execute(client, member) {
    try {
      const guild = member.guild;

      // Wait a moment then check if this was a kick (not a leave)
      await new Promise(r => setTimeout(r, 1_000));

      const entry = await fetchAuditLogEntry(guild, AuditLogEvent.MemberKick, member.id);
      if (!entry) return; // voluntary leave, not a kick

      const actor = entry.executor;
      if (!actor || shouldSkip(actor.id, client.user.id)) return;
      if (isBotAction('kick', member.id)) return;

      const { triggered, count } = checkAndRecord(actor.id, 'kick');
      if (!triggered) return;

      logger.warn(`[guildMemberRemove/kick] EŞİK AŞILDI: ${actor.tag} ${count} kick!`);

      let actorMember;
      try { actorMember = await guild.members.fetch(actor.id); } catch {}

      let actionText = 'Üye bulunamadı.';
      if (actorMember) {
        try {
          await actorMember.kick(`${count} kick (mass kick saldırısı)`);
          actionText = `${actor.tag} atıldı (kick).`;
        } catch {
          const result = await quarantineUser(guild, actorMember, `${count} kick (mass kick saldırısı)`, client);
          actionText = result.success
            ? `${actor.tag} karantinaya alındı (kick başarısız).`
            : `Kick ve karantina başarısız: ${result.reason}`;
        }
      }

      await sendLogAlert(client, alertMessage(
        '🚨 MASS KICK SALDIRISI',
        `**Saldırgan:** ${actor.tag} (${actor.id})\n**Son Hedef:** ${member.user.tag}\n**Toplam Kick:** ${count}`,
        [{ name: '🛡️ Bot Aksiyonu', value: actionText }],
      ));
    } catch (err) {
      logger.error('[guildMemberRemove event]', err);
    }
  },
};
