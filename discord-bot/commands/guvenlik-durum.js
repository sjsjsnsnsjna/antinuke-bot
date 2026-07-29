'use strict';

const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { infoMessage, errorMessage } = require('../utils/components');
const { requireAdmin, reply } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('guvenlik-durum')
    .setDescription('Botun güvenlik durumunu, son olayları ve istatistikleri gösterir.'),
  aliases: ['guvenlik-durum'],

  async execute(source, args, isSlash) {
    try {
      if (!source.guild) return;
      const denied = requireAdmin(source.member);
      if (denied) return reply(source, isSlash, denied);

      const raidActive  = db.getConfig('raid_mode') === '1';
      const panicActive = db.getConfig('panic_active') === '1';
      const logChannel  = db.getConfig('log_channel_id');

      const now     = Math.floor(Date.now() / 1000);
      const day24   = now - 86_400;
      const day7    = now - 86_400 * 7;
      const last24h = db.countPunishments(day24);
      const last7d  = db.countPunishments(day7);

      const recentPunishments = db.getRecentPunishments(5);
      const punishText = recentPunishments.length
        ? recentPunishments.map(p => {
            const ts = `<t:${p.timestamp}:R>`;
            return `• ${ts} — **${p.target_tag}** — ${p.action}`;
          }).join('\n')
        : 'Henüz kayıt yok.';

      const snap = db.getLatestSnapshot();
      const snapText = snap
        ? `<t:${Math.floor(snap.created_at)}:R>`
        : 'Henüz yedek alınmadı.';

      const whitelistCount = db.getWhitelist().length;

      return reply(source, isSlash, infoMessage(
        '📊 Güvenlik Durumu',
        null,
        [
          {
            name: '🚦 Aktif Modlar',
            value: [
              `Baskın Modu: ${raidActive ? '🔴 AKTİF' : '🟢 Kapalı'}`,
              `Panik Modu: ${panicActive ? '🔴 AKTİF' : '🟢 Kapalı'}`,
            ].join('\n'),
          },
          {
            name: '📈 Ceza İstatistikleri',
            value: `Son 24 Saat: **${last24h}**\nSon 7 Gün: **${last7d}**`,
          },
          {
            name: '🕒 Son 5 Ceza',
            value: punishText,
          },
          {
            name: '💾 Son Yedek',
            value: snapText,
          },
          {
            name: '⚙️ Diğer',
            value: `Log Kanalı: ${logChannel ? `<#${logChannel}>` : '❌ Ayarlanmamış'}\nWhitelist: **${whitelistCount}** kayıt`,
          },
        ],
      ));
    } catch (err) {
      console.error('[guvenlik-durum]', err);
      return reply(source, isSlash, errorMessage('Hata', err.message));
    }
  },
};
