'use strict';

const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { successMessage, errorMessage } = require('../utils/components');
const { requireAdmin, reply } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whitelist-cikar')
    .setDescription('Bir kullanıcı veya rolü whitelist\'ten çıkarır.')
    .addMentionableOption(opt =>
      opt.setName('hedef').setDescription('Çıkarılacak kullanıcı veya rol').setRequired(true)
    ),
  aliases: ['whitelist-cikar'],

  async execute(source, args, isSlash) {
    try {
      if (!source.guild) return;
      const denied = requireAdmin(source.member);
      if (denied) return reply(source, isSlash, denied);

      let targetId, targetName;

      if (isSlash) {
        const mentionable = source.options.getMentionable('hedef');
        if (!mentionable) return reply(source, isSlash, errorMessage('Hata', 'Geçerli bir hedef belirtin.'));
        targetId   = mentionable.id;
        targetName = mentionable.user?.tag ?? mentionable.name;
      } else {
        const raw = args[0];
        if (!raw) return reply(source, isSlash, errorMessage('Kullanım', '`B!whitelist-cikar @kullanıcı/rol`'));
        targetId = raw.replace(/[<@!&>]/g, '');
        targetName = targetId;
      }

      const removed = db.removeWhitelist(targetId);
      if (!removed) return reply(source, isSlash, errorMessage('Hata', 'Bu kişi/rol whitelist\'te bulunamadı.'));

      return reply(source, isSlash, successMessage(
        'Whitelist\'ten Çıkarıldı',
        `**${targetName}** artık güvenlik kontrollerine tabi.`,
      ));
    } catch (err) {
      console.error('[whitelist-cikar]', err);
      return reply(source, isSlash, errorMessage('Hata', err.message));
    }
  },
};
