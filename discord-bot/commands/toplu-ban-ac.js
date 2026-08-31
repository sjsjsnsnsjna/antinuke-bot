'use strict';

const {
  SlashCommandBuilder,
  PermissionsBitField,
  AuditLogEvent,
} = require('discord.js');

const MSG = 'kusura bakmayın bi oç topluluğu sunucuyu patlatmaya çalıştı banlayan ben değilim gelin geri isterseinz discord.gg/burtyper';

// 31 Ağustos 2026 22:41 Türkiye saati (UTC+3) = 19:41 UTC — bu tarihten SONRA banlananlara mesaj at
const CUTOFF = Date.UTC(2026, 7, 31, 19, 41, 0, 0); // Ağustos = month 7, Türkiye UTC+3

module.exports = {
  data: new SlashCommandBuilder()
    .setName('toplu-ban-ac')
    .setDescription('Belirli bir tarihten sonra banlanan üyelere af mesajı gönderir.'),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return interaction.reply({ content: '❌ Ban kaldırma iznin yok.', ephemeral: true });
    }

    await interaction.reply({ content: '⏳ Tarama yapılıyor, lütfen bekle...', ephemeral: true });

    const guild = interaction.guild;

    // 1) Tüm mevcut banları al
    const bans = await guild.bans.fetch();
    const banIds = new Set(bans.keys());

    // 2) Audit log'dan CUTOFF sonrası banlananları bul
    const targetUserIds = new Set();
    let lastTimestamp = null;

    for (let i = 0; i < 20; i++) { // max 20 sayfa (2000 entry)
      const options = { type: AuditLogEvent.MemberBanAdd, limit: 100 };
      if (lastTimestamp) options.before = lastTimestamp;

      const audit = await guild.fetchAuditLogs(options);
      const entries = [...audit.entries.values()];

      if (!entries.length) break;

      let olderFound = false;
      for (const entry of entries) {
        if (entry.createdTimestamp < CUTOFF) {
          olderFound = true;
          break;
        }
        if (entry.target && banIds.has(entry.target.id)) {
          targetUserIds.add(entry.target.id);
        }
      }

      lastTimestamp = entries[entries.length - 1].createdTimestamp;
      if (olderFound) break;

      await new Promise(r => setTimeout(r, 1200));
    }

    if (!targetUserIds.size) {
      return interaction.followUp({
        content: 'ℹ️ Belirtilen tarihten sonra banlanan ve hâlâ banlı kalan kimse bulunamadı.',
        ephemeral: true,
      });
    }

    // 3) Sadece o kişilere DM at (banları AÇMA)
    let dmOk = 0;
    let dmFail = 0;

    for (const id of targetUserIds) {
      try {
        const user = await guild.client.users.fetch(id);
        await user.send(MSG);
        dmOk++;
      } catch {
        dmFail++;
      }
      await new Promise(r => setTimeout(r, 1500));
    }

    await interaction.followUp({
      content: [
        '✅ **İşlem tamamlandı!**',
        `• Hedeflenen ban sayısı: **${targetUserIds.size}**`,
        `• DM gönderilen: **${dmOk}**`,
        `• DM gönderilemeyen (DM kapalı/engelli): **${dmFail}**`,
        '',
        '_Banlar açılmadı, sadece mesaj gönderildi._',
      ].join('\n'),
      ephemeral: true,
    });
  },
};
