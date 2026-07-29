'use strict';

const path = require('path');
const fs = require('fs');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

let db;

function initDB() {
  try {
    const Database = require('better-sqlite3');
    db = new Database(path.join(dataDir, 'bot.db'));
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    db.exec(`
      CREATE TABLE IF NOT EXISTS config (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS whitelist (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        type      TEXT NOT NULL CHECK(type IN ('user','role')),
        entity_id TEXT NOT NULL UNIQUE,
        added_by  TEXT,
        added_at  INTEGER DEFAULT (strftime('%s','now'))
      );

      CREATE TABLE IF NOT EXISTS punishment_log (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        target_id  TEXT NOT NULL,
        target_tag TEXT,
        action     TEXT NOT NULL,
        reason     TEXT,
        timestamp  INTEGER DEFAULT (strftime('%s','now'))
      );

      CREATE TABLE IF NOT EXISTS snapshots (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        data       TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s','now'))
      );

      CREATE TABLE IF NOT EXISTS panic_state (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id          TEXT NOT NULL,
        previous_allow      TEXT NOT NULL,
        previous_deny       TEXT NOT NULL,
        had_overwrite       INTEGER NOT NULL DEFAULT 0,
        created_at          INTEGER DEFAULT (strftime('%s','now'))
      );
    `);

    console.log('[DB] Veritabanı başlatıldı.');
  } catch (err) {
    console.error('[DB] Veritabanı başlatma hatası:', err);
    process.exit(1);
  }
}

// ── Config ──────────────────────────────────────────────
function getConfig(key) {
  try {
    const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key);
    return row ? row.value : null;
  } catch { return null; }
}

function setConfig(key, value) {
  try {
    db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, String(value));
  } catch (err) {
    console.error('[DB] setConfig hatası:', err);
  }
}

// ── Whitelist ────────────────────────────────────────────
function addWhitelist(type, entityId, addedBy) {
  try {
    db.prepare('INSERT OR IGNORE INTO whitelist (type, entity_id, added_by) VALUES (?, ?, ?)').run(type, entityId, addedBy);
    return true;
  } catch (err) {
    console.error('[DB] addWhitelist hatası:', err);
    return false;
  }
}

function removeWhitelist(entityId) {
  try {
    const info = db.prepare('DELETE FROM whitelist WHERE entity_id = ?').run(entityId);
    return info.changes > 0;
  } catch (err) {
    console.error('[DB] removeWhitelist hatası:', err);
    return false;
  }
}

function getWhitelist() {
  try {
    return db.prepare('SELECT * FROM whitelist ORDER BY added_at DESC').all();
  } catch { return []; }
}

function isWhitelisted(entityId) {
  try {
    const row = db.prepare('SELECT id FROM whitelist WHERE entity_id = ?').get(entityId);
    return !!row;
  } catch { return false; }
}

// ── Punishment Log ───────────────────────────────────────
function logPunishment(targetId, targetTag, action, reason) {
  try {
    db.prepare('INSERT INTO punishment_log (target_id, target_tag, action, reason) VALUES (?, ?, ?, ?)')
      .run(targetId, targetTag || 'Bilinmiyor', action, reason || '');
  } catch (err) {
    console.error('[DB] logPunishment hatası:', err);
  }
}

function getRecentPunishments(limit = 10) {
  try {
    return db.prepare('SELECT * FROM punishment_log ORDER BY timestamp DESC LIMIT ?').all(limit);
  } catch { return []; }
}

function countPunishments(since) {
  try {
    const row = db.prepare('SELECT COUNT(*) as cnt FROM punishment_log WHERE timestamp >= ?').get(since);
    return row ? row.cnt : 0;
  } catch { return 0; }
}

// ── Snapshots ────────────────────────────────────────────
function saveSnapshot(data) {
  try {
    db.prepare('INSERT INTO snapshots (data) VALUES (?)').run(JSON.stringify(data));
    // Keep only last 10 snapshots
    db.prepare('DELETE FROM snapshots WHERE id NOT IN (SELECT id FROM snapshots ORDER BY created_at DESC LIMIT 10)').run();
  } catch (err) {
    console.error('[DB] saveSnapshot hatası:', err);
  }
}

function getLatestSnapshot() {
  try {
    const row = db.prepare('SELECT * FROM snapshots ORDER BY created_at DESC LIMIT 1').get();
    if (!row) return null;
    return { ...row, data: JSON.parse(row.data) };
  } catch (err) {
    console.error('[DB] getLatestSnapshot hatası:', err);
    return null;
  }
}

function getAllSnapshots() {
  try {
    return db.prepare('SELECT id, created_at FROM snapshots ORDER BY created_at DESC').all();
  } catch { return []; }
}

// ── Panic State ──────────────────────────────────────────
function clearPanicState() {
  try {
    db.prepare('DELETE FROM panic_state').run();
  } catch {}
}

function savePanicChannelState(channelId, allowBigInt, denyBigInt, hadOverwrite) {
  try {
    db.prepare('INSERT OR REPLACE INTO panic_state (channel_id, previous_allow, previous_deny, had_overwrite) VALUES (?, ?, ?, ?)')
      .run(channelId, String(allowBigInt), String(denyBigInt), hadOverwrite ? 1 : 0);
  } catch (err) {
    console.error('[DB] savePanicChannelState hatası:', err);
  }
}

function getPanicState() {
  try {
    return db.prepare('SELECT * FROM panic_state').all();
  } catch { return []; }
}

function hasPanicState() {
  try {
    const row = db.prepare('SELECT COUNT(*) as cnt FROM panic_state').get();
    return row && row.cnt > 0;
  } catch { return false; }
}

module.exports = {
  initDB,
  getConfig,
  setConfig,
  addWhitelist,
  removeWhitelist,
  getWhitelist,
  isWhitelisted,
  logPunishment,
  getRecentPunishments,
  countPunishments,
  saveSnapshot,
  getLatestSnapshot,
  getAllSnapshots,
  clearPanicState,
  savePanicChannelState,
  getPanicState,
  hasPanicState,
};
