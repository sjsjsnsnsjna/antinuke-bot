'use strict';

const {
  joinVoiceChannel,
  entersState,
  VoiceConnectionStatus,
  VoiceConnectionDisconnectReason,
} = require('@discordjs/voice');
const { PermissionsBitField } = require('discord.js');
const logger = require('../utils/logger');

const VC_ID = process.env.VOICE_CHANNEL_ID || null;

let currentConnection = null;
let joining = false;
let lastAttemptAt = 0;
let lastAutoRejoinAt = 0;
let watchdog = null;

async function join(client) {
  if (!VC_ID || joining) return;
  if (currentConnection && currentConnection.state.status === VoiceConnectionStatus.Ready) return;

  joining = true;
  lastAttemptAt = Date.now();
  try {
    const guild = client.guilds.cache.find(g => g.channels.cache.has(VC_ID));
    if (!guild) {
      logger.warn(`[Ses] ${VC_ID} kanalı hiçbir sunucuda bulunamadı.`);
      return;
    }
    const channel = guild.channels.cache.get(VC_ID);
    if (!channel || !channel.isVoiceBased()) {
      logger.warn(`[Ses] ${VC_ID} geçerli bir ses kanalı değil.`);
      return;
    }

    const me = guild.members.me;
    if (me) {
      const required = [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.Connect,
        PermissionsBitField.Flags.Speak,
      ];
      const missing = required
        .filter(flag => !me.permissionsIn(channel).has(flag))
        .map(flag => Object.keys(PermissionsBitField.Flags).find(k => PermissionsBitField.Flags[k] === flag));
      if (missing.length) {
        logger.warn(`[Ses] UYARI: ${channel.name} kanalında eksik izinler: ${missing.join(', ')}. Bot rolüne bu izinleri verip tekrar deneyecek.`);
      }
    }

    try {
      currentConnection?.destroy();
    } catch {}

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false,
    });
    currentConnection = connection;

    connection.on('error', err => logger.error(`[Ses] Bağlantı hatası: ${err.message}`));

    connection.on('stateChange', (oldState, newState) => {
      if (newState.status !== VoiceConnectionStatus.Disconnected) return;
      if (newState.reason === VoiceConnectionDisconnectReason.Manual) return;
      if (Date.now() - lastAutoRejoinAt < 20_000) return;
      lastAutoRejoinAt = Date.now();
      logger.warn('[Ses] Bağlantı koptu, yeniden bağlanılıyor...');
      setTimeout(() => {
        if (connection.state.status === VoiceConnectionStatus.Disconnected) {
          try {
            connection.rejoin();
          } catch {}
        }
      }, 5_000);
    });

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
      logger.info(`[Ses] 🔊 ${channel.name} kanalında beklemede.`);
    } catch {
      logger.warn(`[Ses] ${channel.name} kanalına 15sn içinde bağlanılamadı, tekrar denenecek.`);
    }
  } catch (err) {
    logger.error('[Ses] Bağlantı hatası:', err);
  } finally {
    joining = false;
  }
}

function startVoice(client) {
  if (!VC_ID) {
    logger.info('[Ses] VOICE_CHANNEL_ID tanımlı değil, ses kanalına bağlanılmayacak.');
    return;
  }
  join(client).catch(err => logger.error('[Ses] İlk bağlantı hatası:', err));

  if (watchdog) return;
  watchdog = setInterval(() => {
    if (joining) return;
    const state = currentConnection?.state.status;
    if (state === VoiceConnectionStatus.Ready) return;
    if (Date.now() - lastAttemptAt < 30_000) return;
    join(client).catch(err => logger.error('[Ses] Watchdog hatası:', err));
  }, 30_000);
  watchdog.unref();
}

module.exports = { startVoice };