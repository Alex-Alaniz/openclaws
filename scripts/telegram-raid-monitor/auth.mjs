#!/usr/bin/env node
/**
 * One-time Telegram MTProto authentication flow.
 *
 * Run this interactively once to generate a session string.
 * The session is persisted to SESSION_FILE for reuse by the monitor.
 *
 * Usage: node auth.mjs
 *
 * You will be prompted for:
 *   1. Your phone number (with country code, e.g. +1...)
 *   2. The verification code Telegram sends
 *   3. (Optional) 2FA password if enabled
 */

import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { createInterface } from 'readline';
import { TELEGRAM_API_ID, TELEGRAM_API_HASH, SESSION_FILE } from './config.mjs';

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log('=== Telegram MTProto Auth ===');
  console.log(`Session will be saved to: ${SESSION_FILE}`);
  console.log();

  // Check for existing session
  let sessionString = '';
  if (existsSync(SESSION_FILE)) {
    sessionString = readFileSync(SESSION_FILE, 'utf-8').trim();
    if (sessionString) {
      console.log('Found existing session. Testing connection...');
    }
  }

  const session = new StringSession(sessionString);
  const client = new TelegramClient(session, TELEGRAM_API_ID, TELEGRAM_API_HASH, {
    connectionRetries: 3,
  });

  await client.start({
    phoneNumber: () => ask('Phone number (with country code): '),
    password: () => ask('2FA password (if enabled, otherwise press Enter): '),
    phoneCode: () => ask('Verification code: '),
    onError: (err) => {
      console.error('Auth error:', err.message);
    },
  });

  console.log('\n✅ Authentication successful!');

  // Persist session
  const newSession = client.session.save();
  const dir = dirname(SESSION_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(SESSION_FILE, newSession, 'utf-8');
  console.log(`Session saved to: ${SESSION_FILE}`);

  // Quick test: get self info
  const me = await client.getMe();
  console.log(`\nLogged in as: ${me.firstName} ${me.lastName || ''} (@${me.username || 'n/a'})`);

  await client.disconnect();
  console.log('\nDone. You can now run the monitor: node monitor.mjs');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
