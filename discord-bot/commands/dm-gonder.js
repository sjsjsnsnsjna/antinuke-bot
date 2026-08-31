'use strict';

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

const MSG = 'kusura bakmayın bi oç topluluğu sunucuyu patlatmaya çalıştı banlayan ben değilim gelin geri isterseinz discord.gg/burtyper';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dm-gonder')
    .setDescription('Belirli kullanıcıları banlarını açar ve DM + duyuru yollar.')
    .addStringOption(opt =>
      opt.setName('ids')
        .setDescription('Virgülle ayrılmış kullanıcı IDleri (ör: 123,456,789)')
        .setRequired(true))
    .addChannelOption(opt =>
      opt.setName('duyuru-kanali')
        .setDescription('Duyuru mesajının gönderileceği kanal (opsiyonel)')
        .setRequired(false)),
  aliases: ['dm-gonder'],

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: '❌ Yeterli yetkin yok.', ephemeral: true });
    }

    const raw = interaction.options.getString('ids') || '';
    const ids = [...new Set(raw.split(/[,\s]+/).map(s => s.trim()).filter(s => /^\d{17,20}$/.test(s)))];

    if (!ids.length) {
      return interaction.reply({ content: '❌ Geçerli kullanıcı IDsi bulunamadı.', ephemeral: true });
    }

    await interaction.reply({ content: `⏳ **${ids.length}** kullanıcı işleniyor...`, ephemeral: true });

    const guild = interaction.guild;
    let unbanned = 0, dmOk = 0, dmFail = 0, unbanFail = 0;

    for (const id of ids) {
      // Ban aç
      try {
        await guild.members.unban(id, 'Toplu af - mass ban düzeltmesi');
        unbanned++;
      } catch {
        unbanFail++;
      }

      // DM dene (büyük ihtimalle başarısız olacak ama deneyelim)
      try {
        const user = await interaction.client.users.fetch(id);
        await user.send(MSG);
        dmOk++;
      } catch {
        dmFail++;
      }

      await new Promise(r => setTimeout(r, 1500));
    }

    // Duyuru kanalına mesaj gönder (DM'ler başarısız olsa bile)
    const announceChannel = interaction.options.getChannel('duyuru-kanali');
    if (announceChannel && announceChannel.isTextBased()) {
      try {
        await announceChannel.send(`📢 **Duyuru**\n\n${MSG}`);
      } catch {}
    }

    await interaction.followUp({
      content: [
        '✅ **Tamamlandı!**',
        `• Ban kaldırılan: **${unbanned}**`,
        `• Ban açılamayan: **${unbanFail}**`,
        `• DM gönderilen: **${dmOk}**`,
        `• DM gönderilemeyen (DM kapalı): **${dmFail}**`,
        '',
        '_DM\'ler çoğu zaman kapalı olur. Duyuru kanalına mesaj atmayı unutma._',
      ].join('\n'),
      ephemeral: true,
    });
  },
};
