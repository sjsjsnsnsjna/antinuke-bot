'use strict';

const { PermissionFlagsBits } = require('discord.js');
const { sendLogAlert } = require('../utils/quarantine');
const { infoMessage, warnMessage } = require('../utils/components');
const db     = require('../database/db');
const logger = require('../utils/logger');

const DANGEROUS_PERMS = {
  Administrator:  PermissionFlagsBits.Administrator,
  ManageGuild:    PermissionFlagsBits.ManageGuild,
  ManageRoles:    PermissionFlagsBits.ManageRoles,
  ManageChannels: PermissionFlagsBits.ManageChannels,
  BanMembers:     PermissionFlagsBits.BanMembers,
  KickMembers:    PermissionFlagsBits.KickMembers,
};

// In-memory fingerprint per guild — only alert when the result changes
const lastFingerprint = new Map();

/**
 * Scan all members and roles for dangerous permissions and report ONLY when
 * something has changed since the last audit run.
 *
 * Skips:
 *  - Whitelisted IDs
 *  - Managed roles (Discord bot integration roles — they cannot be abused by humans)
 *  - Bot members
 */
async function runPermissionAudit(client, guild) {
  try {
    const suspiciousRoles = [];
    for (const [, role] of guild.roles.cache) {
      if (role.managed) continue;           // skip bot-integration roles
      if (db.isWhitelisted(role.id)) continue;
      const perms = Object.entries(DANGEROUS_PERMS)
        .filter(([, flag]) => role.permissions.has(flag))
        .map(([name]) => name);
      if (!perms.length) continue;
      suspiciousRoles.push(`• **${role.name}**: ${perms.join(', ')}`);
    }

    const suspiciousMembers = [];
    try {
      const members = await guild.members.fetch();
      for (const [, member] of members) {
        if (member.user.bot) continue;
        if (db.isWhitelisted(member.id)) continue;
        const perms = Object.entries(DANGEROUS_PERMS)
          .filter(([, flag]) => member.permissions.has(flag))
          .map(([name]) => name);
        if (!perms.length) continue;
        suspiciousMembers.push(`• ${member.user.tag} (${member.id}): ${perms.join(', ')}`);
      }
    } catch (err) {
      logger.error('[permissionAudit] members fetch hatası:', err);
    }

    // Build a simple fingerprint — if identical to last run, stay silent
    const fingerprint = JSON.stringify({ suspiciousRoles, suspiciousMembers });
    const prev = lastFingerprint.get(guild.id);
    if (prev === fingerprint) {
      logger.info('[permissionAudit] Değişiklik yok, log kanalına mesaj gönderilmedi.');
      return;
    }
    lastFingerprint.set(guild.id, fingerprint);

    const fields = [];
    if (suspiciousRoles.length) {
      fields.push({ name: '⚠️ Tehlikeli İzinli Roller', value: suspiciousRoles.slice(0, 15).join('\n') });
    }
    if (suspiciousMembers.length) {
      fields.push({ name: '👤 Tehlikeli İzinli Üyeler', value: suspiciousMembers.slice(0, 15).join('\n') });
    }

    if (!fields.length) {
      await sendLogAlert(client, infoMessage(
        '✅ Periyodik İzin Denetimi',
        `**${guild.name}** — Tehlikeli izin bulunamadı.`,
      ));
    } else {
      await sendLogAlert(client, warnMessage(
        '⚠️ Periyodik İzin Denetimi',
        `**${guild.name}** — Tehlikeli izin tespiti:`,
        fields,
      ));
    }

    logger.info(`[permissionAudit] Tamamlandı: ${suspiciousRoles.length} rol, ${suspiciousMembers.length} üye`);
  } catch (err) {
    logger.error('[permissionAudit]', err);
  }
}

module.exports = { runPermissionAudit };
