'use strict';

const config = require('../config/config');
const { runPermissionAudit } = require('./permissionAudit');
const { runBackupSnapshot }  = require('./backupSnapshot');
const logger = require('../utils/logger');

function startJobs(client) {
  const backupMs = config.backupIntervalMinutes * 60_000;
  const auditMs  = config.permissionAuditIntervalMinutes * 60_000;

  // Backup snapshot job
  setInterval(() => {
    runBackupSnapshot(client).catch(err => logger.error('[Job:backup]', err));
  }, backupMs);

  // Permission audit job
  setInterval(() => {
    for (const [, guild] of client.guilds.cache) {
      runPermissionAudit(client, guild).catch(err => logger.error('[Job:audit]', err));
    }
  }, auditMs);

  // Initial backup after 10 seconds (let client fully settle)
  setTimeout(() => {
    runBackupSnapshot(client).catch(err => logger.error('[Job:backup initial]', err));
  }, 10_000);

  logger.info(`[Jobs] Yedek: ${config.backupIntervalMinutes}dk | İzin denetimi: ${config.permissionAuditIntervalMinutes}dk`);
}

module.exports = { startJobs };
