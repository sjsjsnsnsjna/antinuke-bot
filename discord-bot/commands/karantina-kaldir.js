'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { releaseUser } = require('../utils/quarantine');
const { successMessage, errorMessage } = require('../utils/components');
const { requireAdmin, reply } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('karantina-kaldir')
    .setDescription('Karantinaya alınmış bir üyeyi serbest bırakır.')
    .addUserOption(opt =>
      opt.setName('kullanici').setDescription('Serbest bırakılacak kullanıcı').setRequired(true)
    ),
  aliases: ['karantina-kaldir'],

  async execute(source, args, isSlash) {
    try {
      if (!source.guild) return;
      const denied = requireAdmin(source.member);
      if (denied) return reply(source, isSlash, denied);

      let member;
      if (isSlash) {
        member = source.options.getMember('kullanici');
      } else {
        const raw = args[0];
        if (!raw) return reply(source, isSlash, errorMessage('Kullanım', '`B!karantina-kaldir @kullanıcı`'));
        const id = raw.replace(/[<@!>]/g, '');
        member = await source.guild.members.fetch(id).catch(() => null);
      }

      if (!member) return reply(source, isSlash, errorMessage('Hata', 'Kullanıcı sunucuda bulunamadı.'));

      const result = await releaseUser(source.guild, member);
      if (result.success) {
        return reply(source, isSlash, successMessage(
          'Karantina Kaldırıldı',
          `**${member.user.tag}** serbest bırakıldı. Karantina rolü kaldırıldı.`,
        ));
      } else {
        return reply(source, isSlash, errorMessage('Hata', `Karantina kaldırılamadı: ${result.reason}`));
      }
    } catch (err) {
      console.error('[karantina-kaldir]', err);
      return reply(source, isSlash, errorMessage('Hata', err.message));
    }
  },
};
