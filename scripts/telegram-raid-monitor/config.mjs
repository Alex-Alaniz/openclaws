// Telegram MTProto credentials (Board-provided)
export const TELEGRAM_API_ID = 34989152;
export const TELEGRAM_API_HASH = '824ca954e41bc1c4f963b03ad1b83585';

// Session file path
export const SESSION_FILE = process.env.TELEGRAM_SESSION_FILE
  || `${process.env.HOME}/.openclaw/telegram-mtproto-session.txt`;

// BEARCOTEAM channel identifier
// The channel URL is https://t.me/BEARCOTEAM — we resolve the entity at runtime
export const CHANNEL_USERNAME = 'BEARCOTEAM';

// Dedup store path
export const DEDUP_FILE = process.env.RAID_DEDUP_FILE
  || `${process.env.HOME}/.openclaw/raid-links-seen.json`;

// Dedup TTL: 7 days in milliseconds
export const DEDUP_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// How far back to look for messages (in seconds)
export const LOOKBACK_SECONDS = parseInt(process.env.RAID_LOOKBACK_SECONDS || '3600', 10);

// Paperclip relay config
// BEA-398 issue ID (parent viral issue) — relay raid links as comments here
export const PAPERCLIP_ISSUE_ID = process.env.PAPERCLIP_RELAY_ISSUE_ID
  || '8c59ba59-0fbc-4e52-b098-b3a9ccb5c682'; // BEA-398

// Slack channel for backup relay
export const SLACK_CHANNEL = process.env.RAID_SLACK_CHANNEL || '#raid-links';

// URL patterns to match raid links
export const RAID_URL_PATTERNS = [
  /https?:\/\/(www\.)?(x\.com|twitter\.com)\/\S+/gi,
];
