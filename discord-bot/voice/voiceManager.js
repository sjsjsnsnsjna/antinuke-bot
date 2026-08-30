'use strict';

const {
  joinVoiceChannel,
  entersState,
  VoiceConnectionStatus,
  VoiceConnectionDisconnectReason,
} = require('@discordjs/voice');
const logger = require('../utils/logger');

const VC_ID = process.env.VOICE_CHANNEL_ID || null;

let currentConnection = null;
let watchdog = null;

async function join(client) {
  if (!VC_ID) return;
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

  if (currentConnection && currentConnection.state.status === VoiceConnectionStatus.Ready) return;

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
    if (newState.status === VoiceConnectionStatus.Disconnected) {
      if (newState.reason === VoiceConnectionDisconnectReason.Manual) return;
      logger.warn('[Ses] Bağlantı koptu, yeniden bağlanılıyor...');
      setTimeout(() => {
        if (connection.state.status === VoiceConnectionStatus.Disconnected) {
          try { connection.rejoin(); } catch {}
        }
      }, 5_000);
    }
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
    logger.info(`[Ses] 🔊 ${channel.name} kanalında beklemede.`);
  } catch {
    logger.warn('[Ses] Bağlantı 15sn içinde hazır olamadı, watchdog tekrar deneyecek.');
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
    const state = currentConnection?.state.status;
    if (!currentConnection || state === VoiceConnectionStatus.Disconnected || state === VoiceConnectionStatus.Destroyed) {
      join(client).catch(err => logger.error('[Ses] Watchdog hatası:', err));
    }
  }, 30_000);
  watchdog.unref();
}

module.exports = { startVoice };