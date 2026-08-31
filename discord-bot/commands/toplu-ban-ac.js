'use strict';

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

const APM = 'kusura bakmayın bi oç topluluğu sunucuyu patlatmaya çalıştı banlayan ben değilim gelin geri isterseinz discord.gg/burtyper';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('toplu-ban-ac')
    .setDescription('Banlanan tüm üyelere af mesajı göndererek banlarını kaldırır.'),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return interaction.reply({ content: '❌ Ban kaldırma iznin yok.', ephemeral: true });
    }

    await interaction.reply({ content: '⏳ Ban kaldırılıyor ve mesaj gönderiliyor... (bu biraz sürebilir)', ephemeral: true });

    const guild = interaction.guild;
    const bans = await guild.bans.fetch();
    let unbanned = 0, dmOk = 0, dmFail = 0, unbanFail = 0;

    for (const [, ban] of bans) {
      try {
        await ban.user.send(APM);
        dmOk++;
      } catch {
        dmFail++;
      }

      try {
        await guild.members.unban(ban.user.id, 'Toplu affetme - sunucuyu patlatmaya çalışan OC topluluğu');
        unbanned++;
      } catch {
        unbanFail++;
      }

      await new Promise(r => setTimeout(r, 1500));
    }

    await interaction.followUp({
      content: [
        `✅ **İşlem tamamlandı!**`,
        `• Ban kaldırılan: **${unbanned}**`,
        `• DM gönderilen: **${dmOk}**`,
        `• DM gönderilemeyen (DM kapalı/engelli): **${dmFail}**`,
        `• Ban kaldırılamayan: **${unbanFail}**`,
      ].join('\n'),
      ephemeral: true,
    });
  },
};
