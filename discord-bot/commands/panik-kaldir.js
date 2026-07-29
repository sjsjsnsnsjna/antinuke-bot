'use strict';

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const db = require('../database/db');
const { sendLogAlert } = require('../utils/quarantine');
const { successMessage, errorMessage, confirmationMessage, warnMessage } = require('../utils/components');
const { requireAdmin, reply } = require('../utils/permissions');
const { awaitConfirmation } = require('../utils/confirmationManager');
const { markBotAction } = require('../detection/actionTracker');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panik-kaldir')
    .setDescription('Panik modunu kaldırır ve tüm kanalları önceki izin durumuna döndürür.'),
  aliases: ['panik-kaldir'],

  async execute(source, args, isSlash) {
    try {
      if (!source.guild) return;
      const denied = requireAdmin(source.member);
      if (denied) return reply(source, isSlash, denied);

      if (!db.hasPanicState()) {
        return reply(source, isSlash, warnMessage('Panik Modu', 'Panik modu şu anda aktif değil.'));
      }

      const confirmId = `confirm_panikkaldir_${source.id ?? source.member?.id}`;
      const cancelId  = `cancel_panikkaldir_${source.id ?? source.member?.id}`;

      await reply(source, isSlash, {
        ...confirmationMessage(
          '✅ Panik Modunu Kaldır — Onay',
          'Panik modu kaldırılacak ve tüm kanallar **önceki izin durumuna** geri döndürülecek.',
          confirmId,
          cancelId,
        ),
        ephemeral: true,
      });

      const confirmed = await awaitConfirmation(confirmId, cancelId, 30_000);
      if (!confirmed) {
        if (isSlash) source.editReply(errorMessage('İptal', 'İşlem iptal edildi.')).catch(() => {});
        return;
      }

      const guild = source.guild;
      const savedStates = db.getPanicState();
      let restored = 0;

      for (const state of savedStates) {
        const channel = guild.channels.cache.get(state.channel_id);
        if (!channel) continue;
        try {
          markBotAction('channelPermUpdate', channel.id);
          if (!state.had_overwrite) {
            // There was no overwrite before — delete it
            const existing = channel.permissionOverwrites.cache.get(guild.id);
            if (existing) await existing.delete('AntiNuke: Panik modu kaldırıldı');
          } else {
            // Restore previous allow/deny values
            await channel.permissionOverwrites.edit(guild.roles.everyone, {
              SendMessages: state.previous_deny.includes('SendMessages') ? false
                          : state.previous_allow.includes('SendMessages') ? true : null,
              CreateInstantInvite: state.previous_deny.includes('CreateInstantInvite') ? false
                                 : state.previous_allow.includes('CreateInstantInvite') ? true : null,
            }, { reason: 'AntiNuke: Panik modu kaldırıldı' });
          }
          restored++;
        } catch {}
      }

      db.clearPanicState();
      db.setConfig('panic_active', '0');

      const actor = isSlash ? source.user : source.author;
      await sendLogAlert(source.client, successMessage(
        '✅ Panik Modu Kaldırıldı',
        `**Kapatan:** ${actor.tag}\n${restored} kanal önceki durumuna döndürüldü.`,
      ));

      if (isSlash) source.editReply(successMessage('Panik Modu Kaldırıldı', `${restored} kanal normale döndürüldü.`)).catch(() => {});
    } catch (err) {
      console.error('[panik-kaldir]', err);
      return reply(source, isSlash, errorMessage('Hata', err.message));
    }
  },
};
