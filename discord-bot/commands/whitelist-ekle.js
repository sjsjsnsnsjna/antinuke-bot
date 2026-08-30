'use strict';

const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { successMessage, errorMessage } = require('../utils/components');
const { requireAdmin, reply, resolveMember } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whitelist-ekle')
    .setDescription('Bir kullanıcıyı veya rolü güvenlik kontrollerinden muaf tutar.')
    .addMentionableOption(opt =>
      opt.setName('hedef').setDescription('Eklenecek kullanıcı veya rol').setRequired(true)
    ),
  aliases: ['whitelist-ekle'],

  async execute(source, args, isSlash) {
    try {
      if (!source.guild) return;
      const member = isSlash ? source.member : source.member;
      const denied = requireAdmin(member);
      if (denied) return reply(source, isSlash, denied);

      let targetId, targetName, type;

      if (isSlash) {
        const mentionable = source.options.getMentionable('hedef');
        if (!mentionable) return reply(source, isSlash, errorMessage('Hata', 'Geçerli bir kullanıcı veya rol etiketleyin.'));
        targetId   = mentionable.id;
        targetName = mentionable.user?.tag ?? mentionable.name;
        type       = mentionable.user ? 'user' : 'role';
      } else {
        const raw = args[0];
        if (!raw) return reply(source, isSlash, errorMessage('Kullanım', '`B!whitelist-ekle @kullanıcı/rol`'));
        targetId = raw.replace(/[<@!&>]/g, '');
        // Try member first, then role
        const m = await source.guild.members.fetch(targetId).catch(() => null);
        if (m) { targetName = m.user.tag; type = 'user'; }
        else {
          const r = source.guild.roles.cache.get(targetId);
          if (r) { targetName = r.name; type = 'role'; }
          else return reply(source, isSlash, errorMessage('Hata', 'Kullanıcı veya rol bulunamadı.'));
        }
      }

      if (db.isWhitelisted(targetId)) {
        return reply(source, isSlash, errorMessage('Hata', 'Bu kişi/rol zaten whitelist\'te.'));
      }

      const ok = db.addWhitelist(type, targetId, source.member?.id ?? 'unknown');
      if (!ok) return reply(source, isSlash, errorMessage('Hata', 'Veritabanı hatası: eklenemedi.'));

      return reply(source, isSlash, successMessage(
        'Whitelist\'e Eklendi',
        `**${targetName}** (${type === 'user' ? 'kullanıcı' : 'rol'}) artık güvenlik kontrollerinden muaf.`,
      ));
    } catch (err) {
      console.error('[whitelist-ekle]', err);
      return reply(source, isSlash, errorMessage('Hata', err.message));
    }
  },
};
