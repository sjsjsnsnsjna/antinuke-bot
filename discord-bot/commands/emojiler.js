'use strict';

const { SlashCommandBuilder } = require('discord.js');
const emoji = require('../utils/emojiMap');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('emojiler')
    .setDescription('Sunucudaki tüm özel emojileri listeler ve kopyalama formatını gösterir.')
    .addStringOption(opt =>
      opt.setName('ara')
        .setDescription('İsme göre emoji ara (ör: tick, ban, fire)')
        .setRequired(false)),
  aliases: ['emojiler'],

  async execute(interaction) {
    const query = (interaction.options.getString('ara') || '').toLowerCase().trim();

    let list = [];
    for (const [name, code] of emoji.all()) {
      if (typeof code !== 'string' || typeof name !== 'string') continue;
      if (!/<:(a:)?\w+:\d+>/.test(code)) continue;
      if (query && !name.includes(query)) continue;
      list.push(`${code} \`${name}\``);
    }

    if (!list.length) {
      return interaction.reply({
        content: `❌ ${query ? `"${query}" için emoji bulunamadı.` : 'Emoji bulunamadı.'}`,
        ephemeral: true,
      });
    }

    const chunk = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

    const pages = chunk(list, 15).map(pageLines => pageLines.join('\n'));
    const total = pages.length;

    const base = emoji.LOGO;
    const intro = `${base} **Sunucu Emojileri** — toplam **${list.length}**${query ? ` (aranan: "${query}")` : ''}\n\n`;

    if (total === 1) {
      return interaction.reply({ content: intro + '```' + pages[0] + '```', ephemeral: false });
    }

    await interaction.reply({ content: intro + '```' + pages[0] + '```\n_Sayfa 1/' + total + ' — ileri gitmek için aynı komutu tekrarla, ara ile filtrele._', ephemeral: false });
    return null;
  },
};