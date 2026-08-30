'use strict';

const { ActivityType } = require('discord.js');
const db     = require('../database/db');
const logger = require('../utils/logger');
const { runPermissionAudit } = require('../jobs/permissionAudit');
const { startVoice } = require('../voice/voiceManager');

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    try {
      logger.info(`[Ready] ${client.user.tag} çevrimiçi! ${client.guilds.cache.size} sunucu.`);

      client.user.setActivity('🛡️ Sunucuyu Koruyorum', { type: ActivityType.Watching });

      startVoice(client);

      // Auto-whitelist bot owner (server owner per guild) and the bot itself
      for (const [, guild] of client.guilds.cache) {
        try {
          db.addWhitelist('user', client.user.id, 'system');
          if (guild.ownerId) db.addWhitelist('user', guild.ownerId, 'system');
        } catch {}
      }

      // Auto-whitelist OWNER_IDS'deki sistem sahipleri (virgülle ayrılmış)
      const ownerIds = (process.env.OWNER_IDS || '')
        .split(',')
        .map(id => id.trim())
        .filter(id => /^\d{17,20}$/.test(id));
      for (const id of ownerIds) {
        db.addWhitelist('user', id, 'system');
      }
      if (ownerIds.length) {
        logger.info(`[Ready] Sistem sahipleri whitelist'e eklendi: ${ownerIds.join(', ')}`);
      }

      // Restore log channel from env if not already set
      if (!db.getConfig('log_channel_id') && process.env.LOG_CHANNEL_ID) {
        db.setConfig('log_channel_id', process.env.LOG_CHANNEL_ID);
      }

      // Startup permission audit (after a short delay to let cache populate)
      setTimeout(() => {
        for (const [, guild] of client.guilds.cache) {
          runPermissionAudit(client, guild).catch(err => logger.error('[PermAudit startup]', err));
        }
      }, 5_000);
    } catch (err) {
      logger.error('[ready]', err);
    }
  },
};
