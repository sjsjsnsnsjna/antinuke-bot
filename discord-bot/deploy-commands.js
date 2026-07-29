'use strict';

require('dotenv').config();

const { REST, Routes } = require('discord.js');
const fs   = require('fs');
const path = require('path');

const token    = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId  = process.env.GUILD_ID;

if (!token || !clientId || !guildId) {
  console.error('[Deploy] DISCORD_TOKEN, CLIENT_ID ve GUILD_ID ortam değişkenleri gereklidir.');
  process.exit(1);
}

const commands = [];
const commandsDir = path.join(__dirname, 'commands');

for (const file of fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'))) {
  try {
    const cmd = require(path.join(commandsDir, file));
    if (cmd.data) commands.push(cmd.data.toJSON());
  } catch (err) {
    console.error(`[Deploy] ${file} yüklenemedi:`, err);
  }
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(`[Deploy] ${commands.length} slash komut kayıt ediliyor...`);
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands },
    );
    console.log('[Deploy] Slash komutlar başarıyla kaydedildi.');
  } catch (err) {
    console.error('[Deploy] Hata:', err);
    process.exit(1);
  }
})();
