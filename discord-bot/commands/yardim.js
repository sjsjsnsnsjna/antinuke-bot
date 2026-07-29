'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { helpPage, errorMessage } = require('../utils/components');
const { reply } = require('../utils/permissions');

// Help pages definition
function getPages(isAdmin) {
  const intro = {
    title: '🛡️ AntiNuke Bot — Nedir?',
    body: [
      '**Bu bot ne yapar?**',
      '',
      'Bu bot, Discord sunucunuzu otomatik olarak korur.',
      'Kanal/rol silme, mass ban, baskın (raid) gibi saldırıları hiçbir yönetici',
      'çevrimiçi olmasa bile algılar, saldırganı anında karantinaya alır',
      've silinen içerikleri yedeğinizden geri yükler.',
      '',
      '**Her iki şekilde de çalışır:**',
      '• `/komut` — Slash komut',
      '• `B!komut` — Prefix komut',
      '',
      isAdmin ? '👇 Sonraki sayfalarda tüm yönetici komutları listelenmektedir.' : '⚠️ Yönetici komutlarını görmek için sunucu yöneticisi olmanız gerekir.',
    ].join('\n'),
  };

  if (!isAdmin) return [intro];

  const securitySettings = {
    title: '🛡️ Güvenlik Ayarları',
    body: [
      '**`/whitelist-ekle @kullanıcı-veya-rol`** — `B!whitelist-ekle @...`',
      '→ Belirtilen kişi/rolü güvenlik kontrollerinden muaf tutar.',
      '   *Örnek:* `/whitelist-ekle @YöneticiRolü`',
      '',
      '**`/whitelist-cikar @kullanıcı-veya-rol`** — `B!whitelist-cikar @...`',
      '→ Kişi/rolü muafiyet listesinden çıkarır.',
      '',
      '**`/whitelist-listele`** — `B!whitelist-listele`',
      '→ Muafiyet listesindeki tüm kullanıcı ve rolleri gösterir.',
      '',
      '**`/log-kanal-ayarla #kanal`** — `B!log-kanal-ayarla #kanal`',
      '→ Bot uyarılarının gönderileceği kanalı belirler.',
      '',
      '**`/guvenlik-ayarlar`** — `B!guvenlik-ayarlar`',
      '→ Mevcut güvenlik eşiklerini (kaç saniyede kaç aksiyon tetikler) gösterir.',
      '',
      '**`/karantina-kaldir @kullanıcı`** — `B!karantina-kaldir @...`',
      '→ Karantinaya alınmış bir üyeyi manuel olarak serbest bırakır.',
    ].join('\n'),
  };

  const emergency = {
    title: '🚨 Acil Durum Komutları',
    body: [
      '**`/panik`** — `B!panik`',
      '→ Sunucuyu TAM OLARAK kilitler: tüm kanallarda mesaj gönderimi ve davet linki',
      '   oluşturmayı engeller, tüm aktif davetleri iptal eder.',
      '   Onay düğmesiyle çalışır (yanlışlıkla tetiklenmez).',
      '   *Örnek:* Sunucuya saldırı başladığında hemen kullanın.',
      '',
      '**`/panik-kaldir`** — `B!panik-kaldir`',
      '→ Panik modunu kaldırır; tüm kanallar panikten ÖNCEKİ',
      '   izin durumuna geri döner (tahmin etmez, kaydedilmiş halini kullanır).',
      '',
      '**`/raid-modu-ac`** — `B!raid-modu-ac`',
      '→ Baskın algılama eşiği tetiklenmeden önce sizi manuel olarak aktif eder.',
      '   Sunucu doğrulama seviyesi en yükseğe çıkar, yeni hesaplar otomatik atılır.',
      '',
      '**`/raid-modu-kapat`** — `B!raid-modu-kapat`',
      '→ Baskın modunu kapatır, doğrulama seviyesini normale döndürür.',
    ].join('\n'),
  };

  const backup = {
    title: '💾 Yedekleme',
    body: [
      '**`/yedek-al`** — `B!yedek-al`',
      '→ Sunucunun kanal ve rol yapısını hemen yedekler.',
      '   (Bot zaten otomatik olarak düzenli yedek alır.)',
      '',
      '**`/yedek-geri-yukle`** — `B!yedek-geri-yukle`',
      '→ En son yedekten eksik kanalları ve rolleri geri oluşturur.',
      '   Mevcut kanalları SİLMEZ — sadece eksik olanları ekler.',
      '   Onay düğmesiyle çalışır.',
      '   *Örnek:* Saldırı sonrası silinen kanalları geri almak için kullanın.',
    ].join('\n'),
  };

  const status = {
    title: '📊 Durum & Bilgi',
    body: [
      '**`/guvenlik-durum`** — `B!guvenlik-durum`',
      '→ Baskın modu / panik modu durumunu, son 24 saat ve 7 günlük',
      '   ceza sayısını, son 5 cezayı ve son yedek zamanını gösterir.',
      '   Bir saldırı sonrası "ne oldu?" sorusunun cevabı burada.',
      '',
      '**`/whitelist-listele`** — `B!whitelist-listele`',
      '→ Kim güvenlik kontrollerinden muaf? Hepsini görün.',
      '',
      '**`/yardim`** — `B!yardim`',
      '→ Bu yardım menüsünü açar.',
    ].join('\n'),
  };

  return [intro, securitySettings, emergency, backup, status];
}

// Per-user page state store (ephemeral, in-memory)
const pageState = new Map(); // interactionId -> { page, pages, memberId }

module.exports = {
  data: new SlashCommandBuilder()
    .setName('yardim')
    .setDescription('Botun tüm komutlarını ve özelliklerini Türkçe olarak açıklar.'),
  aliases: ['yardim'],

  async execute(source, args, isSlash) {
    try {
      const member = isSlash ? source.member : source.member;
      const isAdmin = member?.permissions?.has(PermissionFlagsBits.Administrator) ?? false;
      const pages = getPages(isAdmin);

      if (!pages.length) {
        return reply(source, isSlash, errorMessage('Yardım', 'Görüntüleyebileceğiniz komut bulunamadı.'));
      }

      const key     = isSlash ? source.id : `${source.author.id}_${Date.now()}`;
      const memberId = isSlash ? source.user.id : source.author.id;
      pageState.set(key, { page: 0, pages, memberId });

      // Cleanup after 5 minutes
      setTimeout(() => pageState.delete(key), 300_000);

      const p = pages[0];
      const payload = helpPage(p.title, p.body, 0, pages.length, `help_prev_${key}`, `help_next_${key}`);

      if (isSlash) {
        await source.reply({ ...payload, ephemeral: true });
      } else {
        await source.reply(payload);
      }
    } catch (err) {
      console.error('[yardim]', err);
      return reply(source, isSlash, errorMessage('Hata', err.message));
    }
  },

  async handleButton(interaction) {
    try {
      const customId = interaction.customId;
      // Find matching state key
      let stateKey = null;
      let direction = null;

      if (customId.startsWith('help_prev_')) {
        stateKey  = customId.replace('help_prev_', '');
        direction = -1;
      } else if (customId.startsWith('help_next_')) {
        stateKey  = customId.replace('help_next_', '');
        direction = 1;
      } else {
        return; // help_noop or unknown
      }

      const state = pageState.get(stateKey);
      if (!state) {
        await interaction.reply({
          ...errorMessage('Zaman Aşımı', 'Bu buton süresi doldu. Lütfen `/yardim` komutunu tekrar çalıştırın.'),
          ephemeral: true,
        });
        return;
      }

      if (interaction.user.id !== state.memberId) {
        await interaction.reply({
          ...errorMessage('Hata', 'Bu yardım menüsü size ait değil.'),
          ephemeral: true,
        });
        return;
      }

      state.page = Math.max(0, Math.min(state.pages.length - 1, state.page + direction));
      const p = state.pages[state.page];
      const payload = helpPage(
        p.title, p.body, state.page, state.pages.length,
        `help_prev_${stateKey}`, `help_next_${stateKey}`,
      );

      await interaction.update(payload);
    } catch (err) {
      console.error('[yardim handleButton]', err);
    }
  },
};
