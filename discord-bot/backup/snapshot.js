'use strict';

const db = require('../database/db');
const { markBotAction } = require('../detection/actionTracker');
const logger = require('../utils/logger');

/**
 * Capture a full guild snapshot (channels + roles) and persist it.
 */
async function takeSnapshot(guild) {
  try {
    const channels = [];
    for (const [, channel] of guild.channels.cache) {
      try {
        const overwrites = [];
        for (const [id, overwrite] of channel.permissionOverwrites.cache) {
          overwrites.push({
            id,
            type: overwrite.type,
            allow: overwrite.allow.toArray(),
            deny: overwrite.deny.toArray(),
          });
        }
        channels.push({
          id: channel.id,
          name: channel.name,
          type: channel.type,
          position: channel.rawPosition,
          parentId: channel.parentId || null,
          topic: channel.topic || null,
          nsfw: channel.nsfw || false,
          bitrate: channel.bitrate || null,
          userLimit: channel.userLimit || null,
          rateLimitPerUser: channel.rateLimitPerUser || 0,
          permissionOverwrites: overwrites,
        });
      } catch (err) {
        logger.error('[takeSnapshot] channel error:', channel.id, err);
      }
    }

    const roles = [];
    for (const [, role] of guild.roles.cache) {
      if (role.id === guild.id) continue; // skip @everyone
      try {
        roles.push({
          id: role.id,
          name: role.name,
          color: role.color,
          hoist: role.hoist,
          mentionable: role.mentionable,
          permissions: role.permissions.toArray(),
          position: role.rawPosition,
          managed: role.managed,
        });
      } catch (err) {
        logger.error('[takeSnapshot] role error:', role.id, err);
      }
    }

    const snapshot = {
      guildId: guild.id,
      guildName: guild.name,
      takenAt: Date.now(),
      channels,
      roles,
    };

    db.saveSnapshot(snapshot);
    logger.info(`[takeSnapshot] Snapshot alındı: ${channels.length} kanal, ${roles.length} rol`);
    return snapshot;
  } catch (err) {
    logger.error('[takeSnapshot] Genel hata:', err);
    return null;
  }
}

module.exports = { takeSnapshot };
