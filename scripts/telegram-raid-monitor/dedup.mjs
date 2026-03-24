/**
 * Dedup store for raid links.
 * Persists seen message IDs and URLs to JSON file with TTL-based pruning.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { DEDUP_FILE, DEDUP_TTL_MS } from './config.mjs';

/**
 * Load the dedup store from disk.
 * @returns {{ byMessageId: Record<string, number>, byUrl: Record<string, number> }}
 */
export function loadStore() {
  if (!existsSync(DEDUP_FILE)) {
    return { byMessageId: {}, byUrl: {} };
  }
  try {
    const raw = readFileSync(DEDUP_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return {
      byMessageId: data.byMessageId || {},
      byUrl: data.byUrl || {},
    };
  } catch {
    return { byMessageId: {}, byUrl: {} };
  }
}

/**
 * Save the dedup store to disk.
 */
export function saveStore(store) {
  const dir = dirname(DEDUP_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(DEDUP_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

/**
 * Prune entries older than DEDUP_TTL_MS.
 */
export function pruneStore(store) {
  const cutoff = Date.now() - DEDUP_TTL_MS;
  for (const key of Object.keys(store.byMessageId)) {
    if (store.byMessageId[key] < cutoff) {
      delete store.byMessageId[key];
    }
  }
  for (const key of Object.keys(store.byUrl)) {
    if (store.byUrl[key] < cutoff) {
      delete store.byUrl[key];
    }
  }
  return store;
}

/**
 * Check if a message has already been seen (by message ID or URL).
 */
export function isSeen(store, messageId, url) {
  const normalizedUrl = normalizeUrl(url);
  return (
    store.byMessageId[String(messageId)] !== undefined ||
    store.byUrl[normalizedUrl] !== undefined
  );
}

/**
 * Mark a message as seen.
 */
export function markSeen(store, messageId, url) {
  const now = Date.now();
  store.byMessageId[String(messageId)] = now;
  store.byUrl[normalizeUrl(url)] = now;
}

/**
 * Normalize a URL for dedup: strip query params, lowercase, normalize domain.
 */
function normalizeUrl(url) {
  try {
    const u = new URL(url);
    // Normalize x.com / twitter.com
    let host = u.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'twitter.com') host = 'x.com';
    // Keep only pathname (strip query/hash)
    return `${host}${u.pathname}`.replace(/\/$/, '');
  } catch {
    return url.toLowerCase().trim();
  }
}
