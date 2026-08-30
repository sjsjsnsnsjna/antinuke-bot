'use strict';

const db = require('../database/db');
const { alertMessage, successMessage } = require('./components');
const { markBotAction } = require('../detection/actionTracker');
const config = require('../config/config');
const logger = require('./logger');

/**
 * Send a message to the configured log channel.
 */
async function sendLogAlert(client, payload) {
  try {
    const channelId = db.getConfig('log_channel_id') || process.env.LOG_CHANNEL_ID;
    if (!channelId) return;
    const channel = client.channels.cache.get(channelId);
    if (!channel) return;
    await channel.send(payload);
  } catch (err) {
    logger.error('[sendLogAlert]', err);
  }
}

/**
 * DM all whitelisted user admins with a high-severity alert.
 * Silently skips users with closed DMs.
 */
async function dmWhitelistedAdmins(client, payload) {
  try {
    const whitelist = db.getWhitelist();
    const userIds = whitelist.filter(w => w.type === 'user').map(w => w.entity_id);
    for (const userId of userIds) {
      try {
        const user = await client.users.fetch(userId);
        await user.send(payload);
      } catch {
        // DM closed or user not found — skip silently
      }
    }
  } catch (err) {
    logger.error('[dmWhitelistedAdmins]', err);
  }
}

/**
 * Find or create the quarantine role with all channel permissions denied.
 */
async function getOrCreateQuarantineRole(guild) {
  const roleName = config.quarantineRoleName;
  let role = guild.roles.cache.find(r => r.name === roleName);
  if (!role) {
    markBotAction('roleCreate', roleName);
    role = await guild.roles.create({
      name: roleName,
      color: 0x808080,
      permissions: [],
      reason: 'AntiNuke: Karantina rolü otomatik oluşturuldu',
    });
    // Deny all text + voice channels
    for (const [, channel] of guild.channels.cache) {
      try {
        markBotAction('channelPermUpdate', channel.id);
        await channel.permissionOverwrites.create(role, {
          SendMessages: false,
          Connect: false,
          AddReactions: false,
          CreatePublicThreads: false,
          CreatePrivateThreads: false,
          SendMessagesInThreads: false,
          Speak: false,
        }, { reason: 'AntiNuke: Karantina rolü kanal izinleri ayarlanıyor' });
      } catch {
        // Some channels may not support overwrites — skip
      }
    }
  }
  return role;
}

/**
 * Quarantine a member: strip all roles, assign quarantine role, optionally ban.
 * Returns { success, reason } where reason is set only on non-actionable failures.
 */
async function quarantineUser(guild, member, reason, client) {
  try {
    // Can't act on server owner
    if (member.id === guild.ownerId) {
      return { success: false, reason: 'OWNER' };
    }

    const botMember = await guild.members.fetchMe();

    // Can't act on higher-role members
    if (member.roles.highest.position >= botMember.roles.highest.position) {
      return { success: false, reason: 'HIGHER_ROLE' };
    }

    // Strip all roles
    markBotAction('roleClear', member.id);
    await member.roles.set([], `AntiNuke: ${reason}`);

    // Assign quarantine role
    const qRole = await getOrCreateQuarantineRole(guild);
    markBotAction('roleAdd', `${member.id}:${qRole.id}`);
    await member.roles.add(qRole, `AntiNuke: ${reason}`);

    db.logPunishment(member.id, member.user?.tag ?? member.id, 'quarantine', reason);

    // Auto-ban if configured
    if (config.autoBanOnThreat) {
      markBotAction('ban', member.id);
      await guild.bans.create(member.id, { reason: `AntiNuke (otomatik ban): ${reason}`, deleteMessageSeconds: 0 });
      db.logPunishment(member.id, member.user?.tag ?? member.id, 'ban', reason);
    }

    return { success: true };
  } catch (err) {
    logger.error('[quarantineUser]', err);
    return { success: false, reason: 'ERROR', error: err };
  }
}

/**
 * Release a quarantined member: remove quarantine role.
 */
async function releaseUser(guild, member) {
  try {
    const qRole = guild.roles.cache.find(r => r.name === config.quarantineRoleName);
    if (!qRole) return { success: false, reason: 'NO_ROLE' };
    markBotAction('roleRemove', `${member.id}:${qRole.id}`);
    await member.roles.remove(qRole, 'AntiNuke: Karantina kaldırıldı');
    db.logPunishment(member.id, member.user?.tag ?? member.id, 'release', 'Manuel karantina kaldırma');
    return { success: true };
  } catch (err) {
    logger.error('[releaseUser]', err);
    return { success: false, reason: 'ERROR', error: err };
  }
}

/**
 * Fetch audit log entries for a specific action type, with retry for eventual consistency.
 */
async function fetchAuditLogEntry(guild, auditLogEvent, targetId) {
  const { maxRetries, retryDelayMs } = config.auditLog;
  const NON_RETRYABLE = new Set([10004, 10003, 50001, 50013]);
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await new Promise(r => setTimeout(r, attempt === 0 ? 800 : retryDelayMs));
      const logs = await guild.fetchAuditLogs({ type: auditLogEvent, limit: 5 });
      const entry = logs.entries.find(e => {
        const recentEnough = Date.now() - e.createdTimestamp < 15_000;
        if (!recentEnough) return false;
        if (targetId) return e.target?.id === targetId || e.targetId === targetId;
        return true;
      });
      if (entry) return entry;
    } catch (err) {
      if (NON_RETRYABLE.has(err?.code)) return null;
      logger.error(`[fetchAuditLogEntry] attempt ${attempt + 1} failed:`, err);
    }
  }
  return null;
}

/**
 * Check if an actor should be skipped (bot itself, whitelisted, or unresolvable).
 */
function shouldSkip(actorId, botId) {
  if (!actorId) return true;
  if (actorId === botId) return true;
  if (db.isWhitelisted(actorId)) return true;
  return false;
}

module.exports = {
  sendLogAlert,
  dmWhitelistedAdmins,
  getOrCreateQuarantineRole,
  quarantineUser,
  releaseUser,
  fetchAuditLogEntry,
  shouldSkip,
};
