'use strict';

const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const config = require('../config/config');
const db = require('../database/db');
const { infoMessage, successMessage, errorMessage } = require('../utils/components');
const { requireAdmin, reply } = require('../utils/permissions');

// Build a readable display of current thresholds
function buildThresholdDisplay() {
  const lines = Object.entries(config.thresholds).map(([key, val]) => {
    const stored = db.getConfig(`threshold_${key}_count`);
    const storedWin = db.getConfig(`threshold_${key}_window`);
    const count  = stored ?? val.count;
    const win    = storedWin ?? (val.window / 1000);
    return `• **${key}**: ${count} aksiyon / ${win}s`;
  });
  return lines.join('\n');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('guvenlik-ayarlar')
    .setDescription('Mevcut güvenlik eşiklerini ve ayarlarını gösterir veya günceller.'),
  aliases: ['guvenlik-ayarlar'],

  async execute(source, args, isSlash) {
    try {
      if (!source.guild) return;
      const denied = requireAdmin(source.member);
      if (denied) return reply(source, isSlash, denied);

      const display = buildThresholdDisplay();
      const autoBan = db.getConfig('auto_ban') === '1' ? 'Aktif' : 'Kapalı';

      return reply(source, isSlash, infoMessage(
        '⚙️ Güvenlik Ayarları',
        `Mevcut eşikler aşağıdadır. Değiştirmek için \`B!guvenlik-ayarla <aksiyon> <sayi> <saniye>\` kullanın.\n\nÖrnek: \`B!guvenlik-ayarla channelDelete 3 10\``,
        [
          { name: '📊 Eşikler', value: display },
          { name: '🔨 Otomatik Ban', value: autoBan },
        ],
      ));
    } catch (err) {
      console.error('[guvenlik-ayarlar]', err);
      return reply(source, isSlash, errorMessage('Hata', err.message));
    }
  },

  // Handles "guvenlik-ayarla" prefix command to actually set a threshold
  async handleAdjust(source, args, isSlash) {
    try {
      const denied = requireAdmin(source.member);
      if (denied) return reply(source, isSlash, denied);
      const [key, count, window] = args;
      if (!key || !count) return reply(source, isSlash, errorMessage('Kullanım', '`B!guvenlik-ayarla <aksiyon> <sayı> [saniye]`'));
      if (!config.thresholds[key]) return reply(source, isSlash, errorMessage('Hata', `Geçersiz aksiyon: ${key}`));
      db.setConfig(`threshold_${key}_count`, parseInt(count, 10));
      if (window) db.setConfig(`threshold_${key}_window`, parseInt(window, 10));
      return reply(source, isSlash, successMessage('Eşik Güncellendi', `**${key}**: ${count} aksiyon / ${window ?? '?'}s olarak ayarlandı.`));
    } catch (err) {
      return reply(source, isSlash, errorMessage('Hata', err.message));
    }
  },

  async handleSelect(interaction) {
    // Reserved for future select menu interactions
  },
};
