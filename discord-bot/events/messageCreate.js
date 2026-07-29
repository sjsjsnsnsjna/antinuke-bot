'use strict';

const config = require('../config/config');
const logger = require('../utils/logger');
const { errorMessage } = require('../utils/components');

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(client, message) {
    try {
      if (message.author.bot) return;
      if (!message.guild) return;
      if (!message.content.startsWith(config.classicPrefix)) return;

      const args    = message.content.slice(config.classicPrefix.length).trim().split(/\s+/);
      const cmdName = args.shift().toLowerCase();

      const command = client.commands.get(cmdName)
        || client.commands.find(c => c.aliases && c.aliases.includes(cmdName));

      if (!command) return;

      try {
        await command.execute(message, args, false);
      } catch (err) {
        logger.error(`[messageCreate] B!${cmdName}:`, err);
        const payload = errorMessage('Komut Hatası', 'Komut çalıştırılırken bir hata oluştu.');
        message.reply(payload).catch(() => {});
      }
    } catch (err) {
      logger.error('[messageCreate]', err);
    }
  },
};
