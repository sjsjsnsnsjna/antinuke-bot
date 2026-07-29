'use strict';

const { takeSnapshot } = require('../backup/snapshot');
const { sendLogAlert } = require('../utils/quarantine');
const { successMessage } = require('../utils/components');
const logger = require('../utils/logger');

async function runBackupSnapshot(client) {
  try {
    for (const [, guild] of client.guilds.cache) {
      const snapshot = await takeSnapshot(guild);
      if (snapshot) {
        logger.info(`[backupSnapshot] ${guild.name} yedeği alındı.`);
      }
    }
  } catch (err) {
    logger.error('[backupSnapshot]', err);
  }
}

module.exports = { runBackupSnapshot };
