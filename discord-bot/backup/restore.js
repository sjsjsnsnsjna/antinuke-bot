'use strict';

const { ChannelType, PermissionsBitField } = require('discord.js');
const { markBotAction } = require('../detection/actionTracker');
const logger = require('../utils/logger');

/**
 * Restore missing channels from a snapshot.
 * Only recreates channels that no longer exist.
 * Returns { created, skipped, errors }
 */
async function restoreChannels(guild, snapshot, reason = 'AntiNuke: Kanal geri yükleme') {
  const result = { created: 0, skipped: 0, errors: 0 };
  if (!snapshot?.channels?.length) return result;

  const existingNames = new Set(guild.channels.cache.map(c => c.name.toLowerCase()));
  const existingIds  = new Set(guild.channels.cache.map(c => c.id));

  // Sort: categories first (type 4), then others
  const sorted = [...snapshot.channels].sort((a, b) => {
    if (a.type === ChannelType.GuildCategory && b.type !== ChannelType.GuildCategory) return -1;
    if (a.type !== ChannelType.GuildCategory && b.type === ChannelType.GuildCategory) return 1;
    return a.position - b.position;
  });

  // Map old category IDs to newly created ones
  const categoryIdMap = new Map();

  for (const ch of sorted) {
    if (existingIds.has(ch.id)) {
      result.skipped++;
      continue;
    }
    try {
      const opts = {
        name: ch.name,
        type: ch.type,
        reason,
      };

      if (ch.topic) opts.topic = ch.topic;
      if (ch.nsfw) opts.nsfw = ch.nsfw;
      if (ch.bitrate) opts.bitrate = ch.bitrate;
      if (ch.userLimit) opts.userLimit = ch.userLimit;
      if (ch.rateLimitPerUser) opts.rateLimitPerUser = ch.rateLimitPerUser;

      // Resolve parent
      if (ch.parentId) {
        const mappedParent = categoryIdMap.get(ch.parentId);
        if (mappedParent) {
          opts.parent = mappedParent;
        } else if (guild.channels.cache.has(ch.parentId)) {
          opts.parent = ch.parentId;
        }
      }

      // Permission overwrites
      if (ch.permissionOverwrites?.length) {
        opts.permissionOverwrites = ch.permissionOverwrites.map(ow => ({
          id: ow.id,
          type: ow.type,
          allow: ow.allow,
          deny: ow.deny,
        }));
      }

      markBotAction('channelCreate', ch.name);
      const newChannel = await guild.channels.create(opts);

      if (ch.type === ChannelType.GuildCategory) {
        categoryIdMap.set(ch.id, newChannel.id);
      }

      result.created++;
    } catch (err) {
      logger.error(`[restoreChannels] Kanal oluşturulamadı: ${ch.name}`, err);
      result.errors++;
    }
  }

  return result;
}

/**
 * Restore missing roles from a snapshot.
 * Only recreates roles that no longer exist by name.
 */
async function restoreRoles(guild, snapshot, reason = 'AntiNuke: Rol geri yükleme') {
  const result = { created: 0, skipped: 0, errors: 0 };
  if (!snapshot?.roles?.length) return result;

  const existingNames = new Set(guild.roles.cache.map(r => r.name.toLowerCase()));

  // Sort by position ascending so lower roles are created first
  const sorted = [...snapshot.roles]
    .filter(r => !r.managed)
    .sort((a, b) => a.position - b.position);

  for (const role of sorted) {
    if (existingNames.has(role.name.toLowerCase())) {
      result.skipped++;
      continue;
    }
    try {
      const perms = new PermissionsBitField(role.permissions);
      markBotAction('roleCreate', role.name);
      await guild.roles.create({
        name: role.name,
        color: role.color,
        hoist: role.hoist,
        mentionable: role.mentionable,
        permissions: perms,
        reason,
      });
      result.created++;
    } catch (err) {
      logger.error(`[restoreRoles] Rol oluşturulamadı: ${role.name}`, err);
      result.errors++;
    }
  }

  return result;
}

module.exports = { restoreChannels, restoreRoles };
