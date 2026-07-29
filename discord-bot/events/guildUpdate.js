'use strict';

const { AuditLogEvent } = require('discord.js');
const { checkAndRecord } = require('../detection/actionTracker');
const { sendLogAlert, fetchAuditLogEntry, shouldSkip } = require('../utils/quarantine');
const { alertMessage, warnMessage } = require('../utils/components');
const logger = require('../utils/logger');

module.exports = {
  name: 'guildUpdate',
  once: false,
  async execute(client, oldGuild, newGuild) {
    try {
      const guild = newGuild;

      const entry = await fetchAuditLogEntry(guild, AuditLogEvent.GuildUpdate);
      const actor = entry?.executor;
      if (!actor || shouldSkip(actor.id, client.user.id)) return;

      // Detect suspicious changes
      const changes = [];
      if (oldGuild.name !== newGuild.name) {
        changes.push(`**İsim:** ${oldGuild.name} → ${newGuild.name}`);
      }
      if (oldGuild.vanityURLCode !== newGuild.vanityURLCode) {
        changes.push(`**Vanity URL:** ${oldGuild.vanityURLCode ?? 'yok'} → ${newGuild.vanityURLCode ?? 'yok'}`);
      }
      if (oldGuild.verificationLevel > newGuild.verificationLevel) {
        changes.push(`**Doğrulama:** ${oldGuild.verificationLevel} → ${newGuild.verificationLevel} (düşürüldü!)`);
      }
      if (oldGuild.mfaLevel !== newGuild.mfaLevel) {
        changes.push(`**MFA Seviyesi:** ${oldGuild.mfaLevel} → ${newGuild.mfaLevel}`);
      }

      if (!changes.length) return;

      const { triggered, count } = checkAndRecord(actor.id, 'guildUpdate');

      await sendLogAlert(client, (triggered ? alertMessage : warnMessage)(
        triggered ? '🚨 SUNUCU AYARLARI DEĞİŞTİRİLDİ (SALDIRI)' : '⚠️ Sunucu Ayarları Değiştirildi',
        `**Değiştiren:** ${actor.tag} (${actor.id})\n${changes.join('\n')}`,
        triggered ? [{ name: '🛡️ Durum', value: 'Eşik aşıldı. Lütfen manuel kontrol edin.' }] : [],
      ));
    } catch (err) {
      logger.error('[guildUpdate event]', err);
    }
  },
};
