#!/usr/bin/env bash
# Launch Chrome with remote debugging enabled so Playwright MCP can connect
# to the user's existing profile with all cookies/sessions intact.
#
# Usage: ./scripts/chrome-debug.sh [--port 9222] [--profile "Default"]
#
# Profiles on this machine:
#   Default    = alexalaniz.com (Alex Alaniz) — primary workspace profile
#   Profile 1  = alexDotEth

set -euo pipefail

PORT="${CHROME_DEBUG_PORT:-9222}"
PROFILE="Default"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
USER_DATA_DIR="$HOME/Library/Application Support/Google/Chrome"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port) PORT="$2"; shift 2 ;;
    --profile) PROFILE="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Check if Chrome is already running with debugging
if curl -s "http://127.0.0.1:$PORT/json/version" >/dev/null 2>&1; then
  echo "✅ Chrome already running with remote debugging on port $PORT"
  curl -s "http://127.0.0.1:$PORT/json/version" | python3 -m json.tool
  exit 0
fi

# Check if Chrome is running without debugging
if pgrep -x "Google Chrome" >/dev/null 2>&1; then
  echo "⚠️  Chrome is running but without remote debugging."
  echo "   Close Chrome first, then re-run this script."
  echo "   Or add to Chrome shortcut: --remote-debugging-port=$PORT"
  exit 1
fi

echo "🚀 Launching Chrome with remote debugging on port $PORT (profile: $PROFILE)..."
"$CHROME" \
  --remote-debugging-port="$PORT" \
  --profile-directory="$PROFILE" \
  --user-data-dir="$USER_DATA_DIR" \
  &

# Wait for Chrome to start
for i in $(seq 1 10); do
  if curl -s "http://127.0.0.1:$PORT/json/version" >/dev/null 2>&1; then
    echo "✅ Chrome ready on port $PORT"
    curl -s "http://127.0.0.1:$PORT/json/version" | python3 -m json.tool
    exit 0
  fi
  sleep 1
done

echo "❌ Chrome failed to start with remote debugging"
exit 1
