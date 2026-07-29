'use strict';

const { AuditLogEvent } = require('discord.js');
const { checkAndRecord, isBotAction } = require('../detection/actionTracker');
const { quarantineUser, sendLogAlert, fetchAuditLogEntry, shouldSkip } = require('../utils/quarantine');
const { alertMessage } = require('../utils/components');
const logger = require('../utils/logger');

module.exports = {
  name: 'channelCreate',
  once: false,
  async execute(client, channel) {
    try {
      if (!channel.guild) return;
      if (isBotAction('channelCreate', channel.name)) return;

      const guild = channel.guild;
      const entry = await fetchAuditLogEntry(guild, AuditLogEvent.ChannelCreate, channel.id);
      const actor = entry?.executor;

      if (!actor || shouldSkip(actor.id, client.user.id)) return;

      const { triggered, count } = checkAndRecord(actor.id, 'channelCreate');
      if (!triggered) return;

      logger.warn(`[channelCreate] EŞİK AŞILDI: ${actor.tag} ${count} kanal oluşturdu!`);

      let member;
      try { member = await guild.members.fetch(actor.id); } catch {}

      let actionText = 'Üye bulunamadı.';
      if (member) {
        const result = await quarantineUser(guild, member, `${count} kanal oluşturma (spam)`, client);
        actionText = result.success
          ? `${actor.tag} karantinaya alındı.`
          : `Karantina uygulanamadı: ${result.reason}`;
      }

      await sendLogAlert(client, alertMessage(
        '🚨 KANAL OLUŞTURMA SPAMLAMA',
        `**Saldırgan:** ${actor.tag} (${actor.id})\n**Toplam:** ${count} kanal oluşturuldu`,
        [{ name: '🛡️ Bot Aksiyonu', value: actionText }],
      ));
    } catch (err) {
      logger.error('[channelCreate event]', err);
    }
  },
};
