'use strict';

require('dotenv').config();

const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs   = require('fs');
const path = require('path');

const { initDB }    = require('./database/db');
const { startJobs } = require('./jobs');
const logger        = require('./utils/logger');

// ── Validate required env vars ────────────────────────────────────────────────
const required = ['DISCORD_TOKEN', 'CLIENT_ID', 'GUILD_ID'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`[HATA] Gerekli ortam değişkeni eksik: "${key}". Bot kapatılıyor.`);
    process.exit(1);
  }
}

// ── Client ────────────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.GuildMember, Partials.User],
});

client.commands = new Collection();

// ── Load Commands ─────────────────────────────────────────────────────────────
const commandsDir = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'))) {
  try {
    const cmd = require(path.join(commandsDir, file));
    if (cmd.data && typeof cmd.execute === 'function') {
      client.commands.set(cmd.data.name, cmd);
    }
  } catch (err) {
    logger.error(`[CommandLoader] ${file} yüklenemedi:`, err);
  }
}

// ── Load Events ───────────────────────────────────────────────────────────────
const eventsDir = path.join(__dirname, 'events');
for (const file of fs.readdirSync(eventsDir).filter(f => f.endsWith('.js'))) {
  try {
    const event = require(path.join(eventsDir, file));
    if (!event.name || typeof event.execute !== 'function') continue;
    if (event.once) {
      client.once(event.name, (...args) => {
        event.execute(client, ...args).catch(err => logger.error(`[Event:${event.name}]`, err));
      });
    } else {
      client.on(event.name, (...args) => {
        Promise.resolve(event.execute(client, ...args)).catch(err => logger.error(`[Event:${event.name}]`, err));
      });
    }
  } catch (err) {
    logger.error(`[EventLoader] ${file} yüklenemedi:`, err);
  }
}

// ── Global Error Handlers ─────────────────────────────────────────────────────
process.on('unhandledRejection', (error) => {
  logger.error('[unhandledRejection]', error);
  _tryLogToChannel(client, `⚠️ Yakalanmamış hata: ${error?.message ?? 'Bilinmiyor'}`);
});

process.on('uncaughtException', (error) => {
  logger.error('[uncaughtException]', error);
  _tryLogToChannel(client, `💥 Kritik hata: ${error?.message ?? 'Bilinmiyor'}`);
});

function _tryLogToChannel(client, msg) {
  try {
    if (!client.isReady()) return;
    const db = require('./database/db');
    const channelId = db.getConfig('log_channel_id') || process.env.LOG_CHANNEL_ID;
    if (!channelId) return;
    const channel = client.channels.cache.get(channelId);
    if (!channel) return;
    const { errorMessage } = require('./utils/components');
    channel.send(errorMessage('Bot Hatası', msg)).catch(() => {});
  } catch {}
}

// ── Boot ──────────────────────────────────────────────────────────────────────
initDB();

client.login(process.env.DISCORD_TOKEN)
  .then(() => {
    startJobs(client);
  })
  .catch(err => {
    logger.error('[Login] Giriş başarısız:', err);
    process.exit(1);
  });
