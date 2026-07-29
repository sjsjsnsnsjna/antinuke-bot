'use strict';

const { InteractionType } = require('discord.js');
const logger = require('../utils/logger');
const { errorMessage } = require('../utils/components');

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(client, interaction) {
    try {
      // ── Slash commands ──────────────────────────────────────────────────────
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
          await command.execute(interaction, [], true);
        } catch (err) {
          logger.error(`[interactionCreate] /${interaction.commandName}:`, err);
          const payload = errorMessage('Komut Hatası', 'Komut çalıştırılırken bir hata oluştu. Lütfen tekrar deneyin.');
          try {
            if (interaction.deferred || interaction.replied) {
              await interaction.editReply({ ...payload, ephemeral: true });
            } else {
              await interaction.reply({ ...payload, ephemeral: true });
            }
          } catch {}
        }
        return;
      }

      // ── Button interactions ─────────────────────────────────────────────────
      if (interaction.isButton()) {
        const customId = interaction.customId;

        // Help pagination
        if (customId.startsWith('help_')) {
          const helpCmd = client.commands.get('yardim');
          if (helpCmd?.handleButton) {
            await helpCmd.handleButton(interaction).catch(err => logger.error('[help button]', err));
          }
          return;
        }

        // Confirmation buttons (format: confirm_ACTION_TOKEN or cancel_ACTION_TOKEN)
        if (customId.startsWith('confirm_') || customId.startsWith('cancel_')) {
          // Delegated to each command's button handler via pendingConfirmations
          const { handleConfirmButton } = require('../utils/confirmationManager');
          await handleConfirmButton(interaction).catch(err => logger.error('[confirm button]', err));
          return;
        }
      }

      // ── Select menus (guvenlik-ayarlar) ─────────────────────────────────────
      if (interaction.isStringSelectMenu()) {
        if (interaction.customId.startsWith('settings_')) {
          const settingsCmd = client.commands.get('guvenlik-ayarlar');
          if (settingsCmd?.handleSelect) {
            await settingsCmd.handleSelect(interaction).catch(err => logger.error('[settings select]', err));
          }
        }
      }
    } catch (err) {
      logger.error('[interactionCreate]', err);
    }
  },
};
