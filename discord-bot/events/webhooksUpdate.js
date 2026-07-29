'use strict';

const { AuditLogEvent } = require('discord.js');
const { checkAndRecord, isBotAction } = require('../detection/actionTracker');
const { quarantineUser, sendLogAlert, fetchAuditLogEntry, shouldSkip } = require('../utils/quarantine');
const { alertMessage } = require('../utils/components');
const logger = require('../utils/logger');

module.exports = {
  name: 'webhooksUpdate',
  once: false,
  async execute(client, channel) {
    try {
      const guild = channel.guild;
      if (!guild) return;

      const entry = await fetchAuditLogEntry(guild, AuditLogEvent.WebhookCreate);
      if (!entry) return;

      const actor = entry.executor;
      if (!actor || shouldSkip(actor.id, client.user.id)) return;
      if (isBotAction('webhookCreate', actor.id)) return;

      const { triggered, count } = checkAndRecord(actor.id, 'webhookCreate');

      logger.warn(`[webhooksUpdate] Webhook oluşturuldu: ${actor.tag} #${channel.name} (${count})`);

      // Even single webhook creation is suspicious — alert always, quarantine if threshold
      let actionText = `${count} webhook oluşturma tespit edildi.`;
      if (triggered) {
        let member;
        try { member = await guild.members.fetch(actor.id); } catch {}
        if (member) {
          const result = await quarantineUser(guild, member, `${count} webhook oluşturma`, client);
          actionText = result.success
            ? `${actor.tag} karantinaya alındı.`
            : `Karantina uygulanamadı: ${result.reason}`;
        }
      }

      await sendLogAlert(client, alertMessage(
        triggered ? '🚨 WEBHOOK SALDIRISI' : '⚠️ Webhook Oluşturuldu',
        `**Oluşturan:** ${actor.tag} (${actor.id})\n**Kanal:** #${channel.name}\n**Toplam:** ${count}`,
        [{ name: '🛡️ Bot Aksiyonu', value: actionText }],
      ));
    } catch (err) {
      logger.error('[webhooksUpdate event]', err);
    }
  },
};
