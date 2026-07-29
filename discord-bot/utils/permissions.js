'use strict';

const { PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const { errorMessage } = require('./components');

/**
 * Check if the invoker (member) has Administrator permission or is whitelisted.
 * Returns null if OK, or a reply payload if not.
 */
function requireAdmin(member) {
  if (!member) {
    return errorMessage('Yetki Hatası', 'Bu komut sadece sunucu içinde kullanılabilir.');
  }
  if (
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    db.isWhitelisted(member.id)
  ) {
    return null; // allowed
  }
  return errorMessage('Yetersiz Yetki', 'Bu komutu kullanmak için **Yönetici** yetkisine ihtiyacınız var.');
}

/**
 * Unified reply helper for both slash interactions and prefix messages.
 */
async function reply(source, isSlash, payload) {
  try {
    if (isSlash) {
      if (source.deferred || source.replied) {
        return source.editReply(payload);
      }
      return source.reply({ ...payload, ephemeral: true });
    } else {
      return source.reply(payload);
    }
  } catch {}
}

/**
 * Get a member mention from a slash command option or first prefix arg.
 */
async function resolveMember(guild, source, isSlash, optionName) {
  try {
    if (isSlash) {
      return source.options.getMember(optionName) ?? null;
    } else {
      const arg = source._args?.[0];
      if (!arg) return null;
      const id = arg.replace(/[<@!>]/g, '');
      return guild.members.fetch(id).catch(() => null);
    }
  } catch { return null; }
}

async function resolveUser(source, isSlash, optionName) {
  try {
    if (isSlash) {
      return source.options.getUser(optionName) ?? null;
    } else {
      const arg = source._args?.[0];
      if (!arg) return null;
      const id = arg.replace(/[<@!>]/g, '');
      return source.client.users.fetch(id).catch(() => null);
    }
  } catch { return null; }
}

async function resolveChannel(guild, source, isSlash, optionName) {
  try {
    if (isSlash) {
      return source.options.getChannel(optionName) ?? null;
    } else {
      const arg = source._args?.[0];
      if (!arg) return null;
      const id = arg.replace(/[<#>]/g, '');
      return guild.channels.cache.get(id) ?? null;
    }
  } catch { return null; }
}

module.exports = { requireAdmin, reply, resolveMember, resolveUser, resolveChannel };
