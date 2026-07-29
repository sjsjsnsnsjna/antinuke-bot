'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');
const { sendLogAlert } = require('../utils/quarantine');
const { alertMessage, successMessage, errorMessage, confirmationMessage } = require('../utils/components');
const { requireAdmin, reply } = require('../utils/permissions');
const { awaitConfirmation } = require('../utils/confirmationManager');
const { markBotAction } = require('../detection/actionTracker');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panik')
    .setDescription('Sunucuyu TAM OLARAK kilitler: mesaj gönderimi ve davet linki oluşturmayı engeller.'),
  aliases: ['panik'],

  async execute(source, args, isSlash) {
    try {
      if (!source.guild) return;
      const denied = requireAdmin(source.member);
      if (denied) return reply(source, isSlash, denied);

      if (db.hasPanicState()) {
        return reply(source, isSlash, errorMessage(
          'Hata',
          'Panik modu zaten aktif! Önce `/panik-kaldir` ile mevcut kilidi kaldırın.',
        ));
      }

      const confirmId = `confirm_panik_${source.id ?? source.member?.id}`;
      const cancelId  = `cancel_panik_${source.id ?? source.member?.id}`;

      await reply(source, isSlash, {
        ...confirmationMessage(
          '🚨 PANİK MODU — ONAY GEREKLİ',
          'Bu komut **TÜM metin kanallarında** mesaj gönderimi ve davet linki oluşturmayı **engelleyecek**.\n\nTüm aktif davetler de iptal edilecek.\n\n⚠️ Bu geri alınabilir bir işlemdir — `/panik-kaldir` ile normal duruma dönülebilir.',
          confirmId,
          cancelId,
        ),
        ephemeral: true,
      });

      const confirmed = await awaitConfirmation(confirmId, cancelId, 30_000);
      if (!confirmed) {
        if (isSlash) source.editReply(errorMessage('İptal', 'Panik modu iptal edildi.')).catch(() => {});
        return;
      }

      const guild = source.guild;

      // Save current @everyone overwrite states for ALL text channels
      db.clearPanicState();
      for (const [, channel] of guild.channels.cache) {
        if (!channel.isTextBased()) continue;
        try {
          const existing = channel.permissionOverwrites.cache.get(guild.id);
          const allow  = existing ? existing.allow.valueOf() : 0n;
          const deny   = existing ? existing.deny.valueOf() : 0n;
          db.savePanicChannelState(channel.id, allow, deny, !!existing);
        } catch {}
      }

      // Deny @everyone SendMessages and CreateInstantInvite on all text channels
      let locked = 0;
      for (const [, channel] of guild.channels.cache) {
        if (!channel.isTextBased()) continue;
        try {
          markBotAction('channelPermUpdate', channel.id);
          await channel.permissionOverwrites.edit(guild.roles.everyone, {
            SendMessages: false,
            CreateInstantInvite: false,
          }, { reason: 'AntiNuke: Panik modu' });
          locked++;
        } catch {}
      }

      // Revoke all active invites
      let revokedInvites = 0;
      try {
        const invites = await guild.invites.fetch();
        for (const [, invite] of invites) {
          try { await invite.delete('AntiNuke: Panik modu — davetler iptal edildi'); revokedInvites++; } catch {}
        }
      } catch {}

      db.setConfig('panic_active', '1');

      const actor = isSlash ? source.user : source.author;
      await sendLogAlert(source.client, alertMessage(
        '🚨 PANİK MODU AKTİF',
        `**Aktif Eden:** ${actor.tag}\n**Kilitlenen Kanal:** ${locked}\n**İptal Edilen Davet:** ${revokedInvites}\n\nTüm metin kanallarında mesaj gönderimi engellendi.`,
      ));

      if (isSlash) source.editReply(successMessage('Panik Modu Aktif', `${locked} kanal kilitlendi, ${revokedInvites} davet iptal edildi.`)).catch(() => {});
    } catch (err) {
      console.error('[panik]', err);
      return reply(source, isSlash, errorMessage('Hata', err.message));
    }
  },
};
