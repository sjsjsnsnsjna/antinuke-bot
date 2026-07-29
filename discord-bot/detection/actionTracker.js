'use strict';

const config = require('../config/config');

// Rolling window counters: Map<`${userId}:${actionType}`, number[]>
const counters = new Map();

// Bot-own-action exclusion set: Set<`${type}:${identifier}`>
// Entries expire after 30 seconds to avoid memory leaks
const botActions = new Map(); // key -> expiresAt
const BOT_ACTION_TTL = 30_000;

// Raid join tracking
const raidJoins = [];

/**
 * Record an action for a user and check if the threshold is exceeded.
 * Returns { triggered: boolean, count: number }
 */
function checkAndRecord(userId, actionType) {
  const threshold = config.thresholds[actionType];
  if (!threshold) return { triggered: false, count: 1 };

  const key = `${userId}:${actionType}`;
  const now = Date.now();

  if (!counters.has(key)) counters.set(key, []);
  const timestamps = counters.get(key);
  timestamps.push(now);

  // Prune entries outside the time window
  const cutoff = now - threshold.window;
  const fresh = timestamps.filter(t => t >= cutoff);
  counters.set(key, fresh);

  return { triggered: fresh.length >= threshold.count, count: fresh.length };
}

/**
 * Clear counters for a user (e.g. after they have been punished).
 */
function clearUser(userId) {
  for (const key of counters.keys()) {
    if (key.startsWith(`${userId}:`)) counters.delete(key);
  }
}

/**
 * Mark an action as performed by the bot itself so it can be excluded from detection.
 */
function markBotAction(type, identifier) {
  const key = `${type}:${identifier}`;
  botActions.set(key, Date.now() + BOT_ACTION_TTL);
}

/**
 * Check if an action was recently performed by the bot itself.
 */
function isBotAction(type, identifier) {
  const key = `${type}:${identifier}`;
  const expiry = botActions.get(key);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    botActions.delete(key);
    return false;
  }
  return true;
}

/**
 * Track a member join for raid detection.
 * Returns { triggered: boolean, count: number }
 */
function checkRaidJoin() {
  const now = Date.now();
  raidJoins.push(now);
  const cfg = config.raid;
  const cutoff = now - cfg.joinWindow;
  const fresh = raidJoins.filter(t => t >= cutoff);
  // Replace in place
  raidJoins.splice(0, raidJoins.length, ...fresh);
  return { triggered: fresh.length >= cfg.joinCount, count: fresh.length };
}

/**
 * Reset raid join counter (e.g. after raid mode is manually deactivated).
 */
function resetRaidJoins() {
  raidJoins.splice(0, raidJoins.length);
}

// Periodic cleanup of expired bot actions (every 60 seconds)
setInterval(() => {
  const now = Date.now();
  for (const [key, expiry] of botActions.entries()) {
    if (now > expiry) botActions.delete(key);
  }
}, 60_000).unref();

module.exports = {
  checkAndRecord,
  clearUser,
  markBotAction,
  isBotAction,
  checkRaidJoin,
  resetRaidJoins,
};
