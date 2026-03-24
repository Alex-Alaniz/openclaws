# Telegram Raid-Link Monitor

Monitors the **BEARCOTEAM** Telegram channel for raid links (x.com / twitter.com URLs) and relays them to:

1. **Paperclip** — Comment on BEA-398 mentioning @Marketing for instant wake
2. **Slack** — Backup relay to `#raid-links` for human visibility

## Architecture

Uses **GramJS** (MTProto User API) instead of Bot API. This allows reading any channel the authenticated user has access to, without needing bot channel membership.

## Setup

### 1. Install dependencies

```bash
cd scripts/telegram-raid-monitor
npm install
```

### 2. One-time authentication

Run the interactive auth flow to generate a session string:

```bash
npm run auth
```

You'll be prompted for:
- Phone number (with country code)
- Verification code (sent via Telegram)
- 2FA password (if enabled)

The session is saved to `~/.openclaw/telegram-mtproto-session.txt`.

### 3. Run the monitor

```bash
# Normal run (relays new raid links)
npm run monitor

# Dry run (detects but doesn't relay)
npm test
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TELEGRAM_SESSION_FILE` | `~/.openclaw/telegram-mtproto-session.txt` | Path to persisted session |
| `RAID_DEDUP_FILE` | `~/.openclaw/raid-links-seen.json` | Path to dedup store |
| `RAID_LOOKBACK_SECONDS` | `3600` | How far back to scan (seconds) |
| `PAPERCLIP_API_URL` | `http://localhost:3101` | Paperclip API base URL |
| `PAPERCLIP_API_KEY` | — | Paperclip auth token (injected by agent infra) |
| `PAPERCLIP_RUN_ID` | — | Run ID for audit trail (injected by agent infra) |
| `PAPERCLIP_RELAY_ISSUE_ID` | BEA-398 UUID | Issue to post raid comments on |
| `RAID_SLACK_CHANNEL` | `#raid-links` | Slack channel for backup relay |

## Cron Integration

To run every 15 minutes via OpenClaw cron:

```json
{
  "schedule": { "kind": "every", "everyMs": 900000 },
  "payload": {
    "kind": "agentTurn",
    "message": "Run the raid-link monitor: cd ~/Code/openclaws/scripts/telegram-raid-monitor && node monitor.mjs"
  },
  "sessionTarget": "isolated"
}
```

## Dedup

The monitor deduplicates by both `telegramMessageId` and normalized `raidUrl` (x.com/twitter.com normalized, query params stripped). Entries expire after 7 days.

## Credentials

- **api_id:** 34989152
- **api_hash:** 824ca954e41bc1c4f963b03ad1b83585
- **Prod DC:** 149.154.167.50:443 (DC 2)

These are Board-provided User-level MTProto app credentials.
