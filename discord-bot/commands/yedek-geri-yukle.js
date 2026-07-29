'use strict';

const { SlashCommandBuilder } = require('discord.js');
const db = require('../database/db');
const { restoreChannels, restoreRoles } = require('../backup/restore');
const { sendLogAlert } = require('../utils/quarantine');
const { successMessage, errorMessage, confirmationMessage, infoMessage } = require('../utils/components');
const { requireAdmin, reply } = require('../utils/permissions');
const { awaitConfirmation } = require('../utils/confirmationManager');
const { markBotAction } = require('../detection/actionTracker');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('yedek-geri-yukle')
    .setDescription('En son alınan yedekten kanalları ve rolleri geri yükler.'),
  aliases: ['yedek-geri-yukle'],

  async execute(source, args, isSlash) {
    try {
      if (!source.guild) return;
      const denied = requireAdmin(source.member);
      if (denied) return reply(source, isSlash, denied);

      const snap = db.getLatestSnapshot();
      if (!snap) {
        return reply(source, isSlash, errorMessage('Yedek Bulunamadı', 'Henüz bir yedek alınmamış. Önce `/yedek-al` kullanın.'));
      }

      const snapDate = `<t:${Math.floor(snap.created_at)}:F>`;
      const confirmId = `confirm_yedek_${source.id ?? source.member?.id}`;
      const cancelId  = `cancel_yedek_${source.id ?? source.member?.id}`;

      await reply(source, isSlash, {
        ...confirmationMessage(
          '💾 Yedek Geri Yükleme — Onay',
          `Yedek tarihi: **${snapDate}**\n**${snap.data.channels.length}** kanal ve **${snap.data.roles.length}** rol kontrol edilecek.\n\n⚠️ Sadece eksik kanallar/roller oluşturulur — mevcut olanlar silinmez.`,
          confirmId,
          cancelId,
        ),
        ephemeral: true,
      });

      const confirmed = await awaitConfirmation(confirmId, cancelId, 30_000);
      if (!confirmed) {
        if (isSlash) source.editReply(errorMessage('İptal', 'Geri yükleme iptal edildi.')).catch(() => {});
        return;
      }

      if (isSlash) await source.editReply(infoMessage('İşlem Devam Ediyor', 'Geri yükleme yapılıyor, lütfen bekleyin...')).catch(() => {});

      // Exclude this restore from detection
      markBotAction('bulkRestore', 'channels');
      markBotAction('bulkRestore', 'roles');

      const chResult   = await restoreChannels(source.guild, snap.data, 'AntiNuke: Manuel geri yükleme');
      const roleResult = await restoreRoles(source.guild, snap.data, 'AntiNuke: Manuel geri yükleme');

      const actor = isSlash ? source.user : source.author;
      await sendLogAlert(source.client, successMessage(
        '💾 Yedek Geri Yüklendi',
        `**Talep Eden:** ${actor.tag}\nKanallar: +${chResult.created} oluşturuldu, ${chResult.errors} hata\nRoller: +${roleResult.created} oluşturuldu, ${roleResult.errors} hata`,
      ));

      const doneMsg = successMessage(
        'Geri Yükleme Tamamlandı',
        `**Kanallar:** +${chResult.created} yeni, ${chResult.skipped} mevcut, ${chResult.errors} hata\n**Roller:** +${roleResult.created} yeni, ${roleResult.skipped} mevcut, ${roleResult.errors} hata`,
      );
      if (isSlash) source.editReply(doneMsg).catch(() => {});
      else reply(source, isSlash, doneMsg);
    } catch (err) {
      console.error('[yedek-geri-yukle]', err);
      return reply(source, isSlash, errorMessage('Hata', err.message));
    }
  },
};
