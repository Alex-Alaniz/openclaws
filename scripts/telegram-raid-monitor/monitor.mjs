#!/usr/bin/env node
/**
 * Telegram Raid-Link Monitor
 *
 * Connects to Telegram via MTProto User API, reads recent messages from
 * the BEARCOTEAM channel, filters for x.com/twitter.com URLs, deduplicates,
 * and relays new raid links to:
 *   1. Paperclip (comment on BEA-398) — triggers Marketing agent wake
 *   2. Slack (#raid-links) — human visibility backup
 *
 * Usage:
 *   node monitor.mjs              # Normal run
 *   node monitor.mjs --dry-run    # Test without relaying
 *
 * Prerequisites:
 *   - Run auth.mjs once to create session
 *   - Environment: PAPERCLIP_API_KEY, PAPERCLIP_API_URL (for Paperclip relay)
 */

import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { Api } from 'telegram/tl/index.js';
import { readFileSync, existsSync } from 'fs';
import {
  TELEGRAM_API_ID,
  TELEGRAM_API_HASH,
  SESSION_FILE,
  CHANNEL_USERNAME,
  LOOKBACK_SECONDS,
  RAID_URL_PATTERNS,
  PAPERCLIP_ISSUE_ID,
  SLACK_CHANNEL,
} from './config.mjs';
import { loadStore, saveStore, pruneStore, isSeen, markSeen } from './dedup.mjs';

const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Extract raid URLs (x.com / twitter.com) from message text.
 */
function extractRaidUrls(text) {
  if (!text) return [];
  const urls = [];
  for (const pattern of RAID_URL_PATTERNS) {
    // Reset lastIndex for global regex
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      urls.push(match[0]);
    }
  }
  return urls;
}

/**
 * Relay a raid link to Paperclip as a comment on BEA-398.
 */
async function relayToPaperclip(raidData) {
  const apiUrl = process.env.PAPERCLIP_API_URL || 'http://localhost:3101';
  const apiKey = process.env.PAPERCLIP_API_KEY;
  const runId = process.env.PAPERCLIP_RUN_ID;

  if (!apiKey) {
    console.warn('⚠ PAPERCLIP_API_KEY not set — skipping Paperclip relay');
    return false;
  }

  const body = [
    `## 🚨 Raid Link Detected`,
    ``,
    `**Source:** BEARCOTEAM Telegram`,
    `**Target:** ${raidData.raidUrl}`,
    `**Detected:** ${raidData.detectedAt}`,
    `**Telegram Message ID:** ${raidData.telegramMessageId}`,
    ``,
    `@Marketing — New raid target ready for engagement.`,
  ].join('\n');

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  if (runId) {
    headers['X-Paperclip-Run-Id'] = runId;
  }

  try {
    const res = await fetch(`${apiUrl}/api/issues/${PAPERCLIP_ISSUE_ID}/comments`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ body }),
    });
    if (!res.ok) {
      console.error(`Paperclip relay failed: ${res.status} ${await res.text()}`);
      return false;
    }
    console.log(`✅ Relayed to Paperclip (BEA-398)`);
    return true;
  } catch (err) {
    console.error(`Paperclip relay error: ${err.message}`);
    return false;
  }
}

/**
 * Relay a raid link to Slack via stdout message (for OpenClaw skill integration).
 * When run as an OpenClaw cron/skill, the caller can pipe this to the Slack bot.
 * For standalone use, this just logs the message.
 */
function relayToSlack(raidData) {
  const msg = `🚨 *Raid Link Detected*\nSource: BEARCOTEAM\nTarget: ${raidData.raidUrl}\nDetected: ${raidData.detectedAt}`;
  // Output in a format that OpenClaw can pick up for Slack relay
  console.log(`[SLACK_RELAY] ${SLACK_CHANNEL}: ${msg}`);
  return true;
}

async function main() {
  console.log(`=== Telegram Raid-Link Monitor ===`);
  console.log(`Channel: ${CHANNEL_USERNAME}`);
  console.log(`Lookback: ${LOOKBACK_SECONDS}s`);
  console.log(`Dry run: ${DRY_RUN}`);
  console.log();

  // Load session
  if (!existsSync(SESSION_FILE)) {
    console.error(`❌ No session file found at ${SESSION_FILE}`);
    console.error('Run auth.mjs first to authenticate.');
    process.exit(1);
  }
  const sessionString = readFileSync(SESSION_FILE, 'utf-8').trim();
  if (!sessionString) {
    console.error('❌ Session file is empty. Run auth.mjs first.');
    process.exit(1);
  }

  // Connect
  const session = new StringSession(sessionString);
  const client = new TelegramClient(session, TELEGRAM_API_ID, TELEGRAM_API_HASH, {
    connectionRetries: 3,
  });
  await client.connect();

  if (!await client.checkAuthorization()) {
    console.error('❌ Session expired. Run auth.mjs again.');
    await client.disconnect();
    process.exit(1);
  }

  console.log('Connected to Telegram.');

  // Resolve channel entity
  let channel;
  try {
    channel = await client.getEntity(CHANNEL_USERNAME);
    console.log(`Resolved channel: ${channel.title || CHANNEL_USERNAME} (ID: ${channel.id})`);
  } catch (err) {
    console.error(`❌ Cannot resolve channel "${CHANNEL_USERNAME}": ${err.message}`);
    await client.disconnect();
    process.exit(1);
  }

  // Fetch recent messages
  const offsetDate = Math.floor(Date.now() / 1000) - LOOKBACK_SECONDS;
  const messages = await client.getMessages(channel, {
    limit: 100,
    offsetDate: Math.floor(Date.now() / 1000), // from now going back
  });

  // Filter to messages within lookback window
  const recentMessages = messages.filter(
    (m) => m.date && m.date >= offsetDate
  );

  console.log(`Fetched ${messages.length} messages, ${recentMessages.length} within lookback window.`);

  // Load dedup store
  const store = pruneStore(loadStore());
  let newRaidLinks = 0;

  for (const msg of recentMessages) {
    const text = msg.message || '';
    const urls = extractRaidUrls(text);

    for (const url of urls) {
      if (isSeen(store, msg.id, url)) {
        console.log(`⏭ Already seen: ${url} (msg ${msg.id})`);
        continue;
      }

      const raidData = {
        source: 'BEARCOTEAM',
        raidUrl: url,
        detectedAt: new Date(msg.date * 1000).toISOString(),
        telegramMessageId: msg.id,
      };

      console.log(`🔗 New raid link: ${url} (msg ${msg.id})`);

      if (!DRY_RUN) {
        await relayToPaperclip(raidData);
        relayToSlack(raidData);
      } else {
        console.log(`  [DRY RUN] Would relay: ${JSON.stringify(raidData)}`);
      }

      markSeen(store, msg.id, url);
      newRaidLinks++;
    }
  }

  // Save dedup store
  saveStore(store);

  console.log(`\n=== Summary ===`);
  console.log(`New raid links found: ${newRaidLinks}`);
  console.log(`Dedup store entries: ${Object.keys(store.byMessageId).length} messages, ${Object.keys(store.byUrl).length} URLs`);

  await client.disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
