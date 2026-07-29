'use strict';

module.exports = {
  // Komut önekleri
  prefixes: ['/', 'B!'],
  classicPrefix: 'B!',

  // Karantina rol adı
  quarantineRoleName: '🔒 Karantina',

  // Varsayılan eşikler (her aksiyon tipi için ayrı ayarlanabilir)
  // window: milisaniye cinsinden zaman penceresi
  // count: tetiklenme sayısı
  thresholds: {
    channelDelete:  { count: 2,  window: 10_000 },
    channelCreate:  { count: 5,  window: 10_000 },
    roleDelete:     { count: 2,  window: 10_000 },
    roleCreate:     { count: 5,  window: 10_000 },
    banAdd:         { count: 3,  window: 10_000 },
    kick:           { count: 3,  window: 10_000 },
    webhookCreate:  { count: 2,  window: 10_000 },
    botAdd:         { count: 1,  window: 60_000 },
    guildUpdate:    { count: 2,  window: 10_000 },
  },

  // Baskın algılama
  raid: {
    joinCount: 10,      // kısa sürede katılım sayısı
    joinWindow: 10_000, // ms
    accountAgeDays: 7,  // yeni hesap yaşı eşiği (gün)
    autoKickNewAccounts: true,
  },

  // Yedek alma sıklığı (dakika)
  backupIntervalMinutes: 60,

  // İzin denetimi sıklığı (dakika)
  permissionAuditIntervalMinutes: 30,

  // Tehdit tespitinde ban uygulansın mı?
  autoBanOnThreat: false,

  // Yüksek öneme sahip izinler (izin denetiminde izlenecek)
  dangerousPermissions: [
    'Administrator',
    'ManageGuild',
    'ManageRoles',
    'ManageChannels',
    'BanMembers',
    'KickMembers',
  ],

  // Audit log çekimi için yeniden deneme ayarları
  auditLog: {
    maxRetries: 3,
    retryDelayMs: 1_500,
  },

  // Aksiyon tipleri
  actions: {
    QUARANTINE: 'quarantine',
    BAN: 'ban',
    ALERT_ONLY: 'alert_only',
  },

  // Her aksiyon tipinin varsayılan tepki seviyesi
  actionSeverity: {
    channelDelete:  'quarantine',
    channelCreate:  'quarantine',
    roleDelete:     'quarantine',
    roleCreate:     'quarantine',
    banAdd:         'quarantine',
    kick:           'quarantine',
    webhookCreate:  'quarantine',
    botAdd:         'alert_only',
    guildUpdate:    'alert_only',
  },
};
