'use strict';

const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { sendLogAlert } = require('../utils/quarantine');
const { successMessage, errorMessage, warnMessage } = require('../utils/components');
const { requireAdmin, reply } = require('../utils/permissions');
const { resetRaidJoins } = require('../detection/actionTracker');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raid-modu-kapat')
    .setDescription('Baskın modunu devre dışı bırakır ve doğrulama seviyesini normale döndürür.'),
  aliases: ['raid-modu-kapat'],

  async execute(source, args, isSlash) {
    try {
      if (!source.guild) return;
      const denied = requireAdmin(source.member);
      if (denied) return reply(source, isSlash, denied);

      if (db.getConfig('raid_mode') !== '1') {
        return reply(source, isSlash, warnMessage('Baskın Modu', 'Baskın modu zaten kapalı.'));
      }

      db.setConfig('raid_mode', '0');
      resetRaidJoins();
      try {
        await source.guild.setVerificationLevel(1, 'AntiNuke: Baskın modu devre dışı');
      } catch {}

      const actor = isSlash ? source.user : source.author;
      await sendLogAlert(source.client, successMessage(
        '✅ Baskın Modu Kapatıldı',
        `**Kapatan:** ${actor.tag}\nDoğrulama seviyesi normale döndürüldü.`,
      ));

      return reply(source, isSlash, successMessage(
        'Baskın Modu Kapatıldı',
        'Sunucu normal moda döndü. Doğrulama seviyesi düşürüldü.',
      ));
    } catch (err) {
      console.error('[raid-modu-kapat]', err);
      return reply(source, isSlash, errorMessage('Hata', err.message));
    }
  },
};
