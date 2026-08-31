'use strict';

const { AuditLogEvent, PermissionFlagsBits } = require('discord.js');
const { checkAndRecord, isBotAction } = require('../detection/actionTracker');
const { quarantineUser, sendLogAlert, dmWhitelistedAdmins, fetchAuditLogEntry, shouldSkip } = require('../utils/quarantine');
const { alertMessage } = require('../utils/components');
const config = require('../config/config');
const logger = require('../utils/logger');

const DANGEROUS_PERMS = [
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.KickMembers,
];

module.exports = {
  name: 'guildMemberUpdate',
  once: false,
  async execute(client, oldMember, newMember) {
    try {
      const guild = newMember.guild;

      // Detect newly added roles
      const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
      if (!addedRoles.size) return;

      // Check if any added role has dangerous permissions
      const dangerousRoles = addedRoles.filter(role =>
        DANGEROUS_PERMS.some(perm => role.permissions.has(perm))
      );
      if (!dangerousRoles.size) return;

      // Skip if the member is already whitelisted
      const db = require('../database/db');
      if (shouldSkip(newMember.id, client.user.id)) return;

      const entry = await fetchAuditLogEntry(guild, AuditLogEvent.MemberRoleUpdate, newMember.id);
      const actor = entry?.executor;

      // Log even if actor unknown
      const actorText = actor ? `${actor.tag} (${actor.id})` : 'Bilinmiyor';
      const rolesText = dangerousRoles.map(r => r.name).join(', ');

      logger.warn(`[guildMemberUpdate] Tehlikeli rol verildi: ${newMember.user.tag} ← ${rolesText} (${actorText})`);

      let actionText = 'Sadece uyarı gönderildi.';
      if (actor && !shouldSkip(actor.id, client.user.id)) {
        const actorMember = await guild.members.fetch(actor.id).catch(() => null);
        if (actorMember) {
          try {
            await actorMember.kick(`Tehlikeli rol yetkisi verme: ${rolesText}`);
            actionText = `${actor.tag} atıldı (kick).`;
          } catch {
            const result = await quarantineUser(guild, actorMember, `Tehlikeli rol yetkisi verme: ${rolesText}`, client);
            actionText = result.success
              ? `${actor.tag} karantinaya alındı (kick başarısız).`
              : `Kick ve karantina başarısız: ${result.reason}`;
          }
        }
      }

      const payload = alertMessage(
        '🚨 TEHLİKELİ ROL VERİLDİ',
        `**Hedef Üye:** ${newMember.user.tag} (${newMember.id})\n**Tehlikeli Roller:** ${rolesText}\n**Veren:** ${actorText}`,
        [{ name: '🛡️ Bot Aksiyonu', value: actionText }],
      );

      await sendLogAlert(client, payload);

      // Owner kendi başına yaptıysa DM uyarı gönderme
      if (actor && actor.id !== guild.ownerId) {
        await dmWhitelistedAdmins(client, alertMessage('🚨 Acil', `${newMember.user.tag} tehlikeli rol aldı! ${guild.name}`));
      }
    } catch (err) {
      logger.error('[guildMemberUpdate event]', err);
    }
  },
};
