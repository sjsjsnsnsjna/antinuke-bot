'use strict';

const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { infoMessage, errorMessage } = require('../utils/components');
const { requireAdmin, reply } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whitelist-listele')
    .setDescription('Güvenlik kontrollerinden muaf tutulan tüm kullanıcı ve rolleri listeler.'),
  aliases: ['whitelist-listele'],

  async execute(source, args, isSlash) {
    try {
      if (!source.guild) return;
      const denied = requireAdmin(source.member);
      if (denied) return reply(source, isSlash, denied);

      const list = db.getWhitelist();
      if (!list.length) {
        return reply(source, isSlash, infoMessage(
          'Whitelist Boş',
          'Whitelist\'e henüz kimse eklenmemiş.\nSunucu sahibi ve bot otomatik eklenir.',
        ));
      }

      const users = list.filter(w => w.type === 'user')
        .map(w => `• <@${w.entity_id}> (${w.entity_id})`).join('\n') || 'Yok';
      const roles = list.filter(w => w.type === 'role')
        .map(w => `• <@&${w.entity_id}> (${w.entity_id})`).join('\n') || 'Yok';

      return reply(source, isSlash, infoMessage(
        `Whitelist (${list.length} kayıt)`,
        null,
        [
          { name: '👤 Kullanıcılar', value: users },
          { name: '🎭 Roller', value: roles },
        ],
      ));
    } catch (err) {
      console.error('[whitelist-listele]', err);
      return reply(source, isSlash, errorMessage('Hata', err.message));
    }
  },
};
