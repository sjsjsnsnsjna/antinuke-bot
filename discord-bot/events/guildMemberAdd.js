'use strict';

const { AuditLogEvent } = require('discord.js');
const { checkRaidJoin } = require('../detection/actionTracker');
const { sendLogAlert, dmWhitelistedAdmins, fetchAuditLogEntry, shouldSkip } = require('../utils/quarantine');
const { alertMessage } = require('../utils/components');
const config = require('../config/config');
const db = require('../database/db');
const logger = require('../utils/logger');

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  async execute(client, member) {
    try {
      const guild = member.guild;

      // ── Unauthorized bot add detection ──────────────────────────────────────
      if (member.user.bot) {
        const entry = await fetchAuditLogEntry(guild, AuditLogEvent.BotAdd, member.id);
        const actor = entry?.executor;
        if (actor && !shouldSkip(actor.id, client.user.id)) {
          const payload = alertMessage(
            '⚠️ Yetkisiz Bot Eklendi',
            `**Eklenen Bot:** ${member.user.tag} (${member.id})\n**Ekleyen:** ${actor.tag} (${actor.id})`,
            [{ name: '🛡️ Durum', value: 'Lütfen bu botu manuel olarak kontrol edin.' }],
          );
          await sendLogAlert(client, payload);
          await dmWhitelistedAdmins(client, alertMessage('⚠️ Yetkisiz Bot', `${actor.tag} bir bot ekledi! ${guild.name}`));
        }
        return;
      }

      // ── Raid detection ────────────────────────────────────────────────────────
      const raidActive = db.getConfig('raid_mode') === '1';
      const { triggered, count } = checkRaidJoin(guild.id);

      if (triggered && !raidActive) {
        // Auto-activate raid mode
        db.setConfig('raid_mode', '1');
        logger.warn(`[guildMemberAdd] RAID TESPİT EDİLDİ: ${count} katılım`);

        try {
          await guild.setVerificationLevel(4, 'AntiNuke: Baskın tespiti — yüksek doğrulama');
        } catch (err) {
          logger.error('[guildMemberAdd] Doğrulama seviyesi değiştirilemedi:', err);
        }

        const payload = alertMessage(
          '🚨 BASKINDI TESPİT EDİLDİ',
          `**${count}** üye çok kısa sürede katıldı!\nDoğrulama seviyesi yükseltildi.`,
          [{ name: '⚙️ Otomatik Aksiyon', value: 'Raid modu aktif edildi. /raid-modu-kapat ile devre dışı bırakın.' }],
        );
        await sendLogAlert(client, payload);
        await dmWhitelistedAdmins(client, alertMessage('🚨 Baskın!', `${guild.name} sunucusunda baskın tespit edildi!`));
      }

      // ── Auto-kick new accounts in raid mode ──────────────────────────────────
      const isRaidNow = db.getConfig('raid_mode') === '1';
      if (isRaidNow && config.raid.autoKickNewAccounts) {
        const accountAgeDays = (Date.now() - member.user.createdTimestamp) / (1_000 * 60 * 60 * 24);
        if (accountAgeDays < config.raid.accountAgeDays) {
          try {
            await member.kick(`AntiNuke: Baskın modu — yeni hesap (${Math.floor(accountAgeDays)} gün)`);
            db.logPunishment(member.id, member.user.tag, 'kick', 'Baskın modu — yeni hesap');
            logger.info(`[guildMemberAdd] Baskın kick: ${member.user.tag} (${Math.floor(accountAgeDays)} gün)`);
          } catch (err) {
            logger.error('[guildMemberAdd] Raid kick hatası:', err);
          }
        }
      }
    } catch (err) {
      logger.error('[guildMemberAdd event]', err);
    }
  },
};
