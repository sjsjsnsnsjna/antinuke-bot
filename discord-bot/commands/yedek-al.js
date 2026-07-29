'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { takeSnapshot } = require('../backup/snapshot');
const { sendLogAlert } = require('../utils/quarantine');
const { successMessage, errorMessage } = require('../utils/components');
const { requireAdmin, reply } = require('../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('yedek-al')
    .setDescription('Sunucunun kanal ve rol yapısını şu an için yedekler.'),
  aliases: ['yedek-al'],

  async execute(source, args, isSlash) {
    try {
      if (!source.guild) return;
      const denied = requireAdmin(source.member);
      if (denied) return reply(source, isSlash, denied);

      if (isSlash) await source.deferReply({ ephemeral: true });

      const snapshot = await takeSnapshot(source.guild);
      if (!snapshot) {
        const msg = errorMessage('Hata', 'Yedek alınamadı. Lütfen tekrar deneyin.');
        return isSlash ? source.editReply(msg) : reply(source, isSlash, msg);
      }

      const actor = isSlash ? source.user : source.author;
      await sendLogAlert(source.client, successMessage(
        '💾 Manuel Yedek Alındı',
        `**Talep Eden:** ${actor.tag}\n**Kanallar:** ${snapshot.channels.length}\n**Roller:** ${snapshot.roles.length}`,
      ));

      const resultMsg = successMessage(
        'Yedek Alındı',
        `✅ **${snapshot.channels.length}** kanal ve **${snapshot.roles.length}** rol yedeklendi.`,
      );
      return isSlash ? source.editReply(resultMsg) : reply(source, isSlash, resultMsg);
    } catch (err) {
      console.error('[yedek-al]', err);
      return reply(source, isSlash, errorMessage('Hata', err.message));
    }
  },
};
