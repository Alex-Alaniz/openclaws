# Playwright MCP — Chrome Profile Setup

## Problem

Playwright MCP by default launches a fresh browser instance with no cookies or sessions. This blocks all browser automation that requires authentication (Sentry, Vercel, GitHub, etc.).

## Solution

Connect Playwright MCP to your existing Chrome via Chrome DevTools Protocol (CDP).

### Step 1: Launch Chrome with Remote Debugging

```bash
# Close Chrome if running, then:
./scripts/chrome-debug.sh

# Or with a specific profile:
./scripts/chrome-debug.sh --profile "Profile 1"
```

This launches Chrome with `--remote-debugging-port=9222` using your real profile directory (`~/Library/Application Support/Google/Chrome`), preserving all cookies and logged-in sessions.

### Step 2: Use Playwright MCP

The `.mcp.json` config connects to `http://127.0.0.1:9222` via CDP. Claude Code / Codex will automatically pick this up.

### Alternative: Extension Mode

If you prefer not to restart Chrome:

1. Install the [Playwright MCP Bridge extension](https://chromewebstore.google.com/detail/playwright-mcp-bridge) in Chrome
2. Use `--extension` flag instead of `--cdp-endpoint`

However, extension mode has known limitations with multiple profiles.

### Profiles

| Directory   | Name           | Account              |
|------------|----------------|----------------------|
| `Default`  | alexalaniz.com | Alex Alaniz (primary)|
| `Profile 1`| alexDotEth     | alexDotEth           |

### Troubleshooting

- **"Chrome is running but without remote debugging"**: Quit Chrome fully (Cmd+Q), then re-run the script
- **Port conflict**: Use `--port 9223` or set `CHROME_DEBUG_PORT=9223`
- **Wrong profile**: Pass `--profile "Profile 1"` for a different profile
