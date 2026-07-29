'use strict';

const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { sendLogAlert } = require('../utils/quarantine');
const { successMessage, errorMessage, warnMessage } = require('../utils/components');
const { requireAdmin, reply } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raid-modu-ac')
    .setDescription('Baskın modunu manuel olarak aktif eder (doğrulama seviyesini yükseltir).'),
  aliases: ['raid-modu-ac'],

  async execute(source, args, isSlash) {
    try {
      if (!source.guild) return;
      const denied = requireAdmin(source.member);
      if (denied) return reply(source, isSlash, denied);

      if (db.getConfig('raid_mode') === '1') {
        return reply(source, isSlash, warnMessage('Baskın Modu', 'Baskın modu zaten aktif.'));
      }

      db.setConfig('raid_mode', '1');
      try {
        await source.guild.setVerificationLevel(4, 'AntiNuke: Manuel baskın modu');
      } catch {}

      const actor = isSlash ? source.user : source.author;
      await sendLogAlert(source.client, warnMessage(
        '⚠️ Baskın Modu Aktif Edildi',
        `**Aktif Eden:** ${actor.tag}\nDoğrulama seviyesi en yüksek seviyeye çıkarıldı. Yeni hesaplar kısıtlandı.`,
      ));

      return reply(source, isSlash, successMessage(
        'Baskın Modu Açıldı',
        'Sunucu baskın moduna alındı. Doğrulama seviyesi yükseltildi.',
      ));
    } catch (err) {
      console.error('[raid-modu-ac]', err);
      return reply(source, isSlash, errorMessage('Hata', err.message));
    }
  },
};
