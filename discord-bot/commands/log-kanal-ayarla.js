'use strict';

const { SlashCommandBuilder, ChannelType } = require('discord.js');
const db = require('../database/db');
const { successMessage, errorMessage } = require('../utils/components');
const { requireAdmin, reply, resolveChannel } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('log-kanal-ayarla')
    .setDescription('Bot güvenlik uyarılarının gönderileceği kanalı ayarlar.')
    .addChannelOption(opt =>
      opt.setName('kanal')
        .setDescription('Log kanalı')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),
  aliases: ['log-kanal-ayarla'],

  async execute(source, args, isSlash) {
    try {
      if (!source.guild) return;
      const denied = requireAdmin(source.member);
      if (denied) return reply(source, isSlash, denied);

      let channel;
      if (isSlash) {
        channel = source.options.getChannel('kanal');
      } else {
        const raw = args[0];
        if (!raw) return reply(source, isSlash, errorMessage('Kullanım', '`B!log-kanal-ayarla #kanal`'));
        const id = raw.replace(/[<#>]/g, '');
        channel = source.guild.channels.cache.get(id);
      }

      if (!channel) return reply(source, isSlash, errorMessage('Hata', 'Kanal bulunamadı.'));

      db.setConfig('log_channel_id', channel.id);

      return reply(source, isSlash, successMessage(
        'Log Kanalı Ayarlandı',
        `Tüm güvenlik uyarıları artık ${channel} kanalına gönderilecek.`,
      ));
    } catch (err) {
      console.error('[log-kanal-ayarla]', err);
      return reply(source, isSlash, errorMessage('Hata', err.message));
    }
  },
};
