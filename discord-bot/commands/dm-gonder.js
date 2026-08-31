'use strict';

const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

const MSG = 'kusura bakmayın bi oç topluluğu sunucuyu patlatmaya çalıştı banlayan ben değilim gelin geri isterseinz discord.gg/burtyper';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dm-gonder')
    .setDescription('Belirli kullanıcı IDlerine DM mesajı gönderir.')
    .addStringOption(opt =>
      opt.setName('ids')
        .setDescription('Virgülle ayrılmış kullanıcı IDleri (ör: 123,456,789)')
        .setRequired(true)),
  aliases: ['dm-gonder'],

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: '❌ Yeterli yetkin yok.', ephemeral: true });
    }

    const raw = interaction.options.getString('ids') || '';
    const ids = [...new Set(raw.split(/[,\s]+/).map(s => s.trim()).filter(s => /^\d{17,20}$/.test(s)))];

    if (!ids.length) {
      return interaction.reply({ content: '❌ Geçerli kullanıcı IDsi bulunamadı. Virgülle ayırarak gir.', ephemeral: true });
    }

    await interaction.reply({ content: `⏳ **${ids.length}** kullanıcıya mesaj gönderiliyor...`, ephemeral: true });

    let ok = 0, fail = 0;

    for (const id of ids) {
      try {
        const user = await interaction.client.users.fetch(id);
        await user.send(MSG);
        ok++;
      } catch {
        fail++;
      }
      await new Promise(r => setTimeout(r, 1500));
    }

    await interaction.followUp({
      content: [
        '✅ **Tamamlandı!**',
        `• Mesaj gönderilen: **${ok}**`,
        `• Gönderilemeyen (DM kapalı/engelli/bulunamadı): **${fail}**`,
      ].join('\n'),
      ephemeral: true,
    });
  },
};
