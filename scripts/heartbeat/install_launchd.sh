#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEMPLATE_DIR="$REPO_ROOT/ops/heartbeat/launchd"
DEST_DIR="${HOME}/Library/LaunchAgents"
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage: install_launchd.sh [--dest <launch-agents-dir>] [--dry-run]
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dest)
      DEST_DIR="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown argument: %s\n' "$1" >&2
      usage >&2
      exit 64
      ;;
  esac
done

if [[ "$(uname -s)" != "Darwin" ]]; then
  printf 'install_launchd.sh only supports macOS launchd.\n' >&2
  exit 1
fi

mkdir -p "$DEST_DIR" "$REPO_ROOT/var/heartbeat/logs"

render_plist() {
  local template="$1"
  local destination="$2"
  python3 - "$template" "$destination" "$REPO_ROOT" <<'PY'
from pathlib import Path
import sys

template_path = Path(sys.argv[1])
destination_path = Path(sys.argv[2])
repo_root = sys.argv[3]
content = template_path.read_text(encoding="utf-8").replace("__REPO_ROOT__", repo_root)
destination_path.write_text(content, encoding="utf-8")
PY
}

for template in "$TEMPLATE_DIR"/*.plist; do
  [[ -f "$template" ]] || continue
  basename="$(basename "$template")"
  destination="$DEST_DIR/$basename"
  label="${basename%.plist}"

  if [[ "$DRY_RUN" == "1" ]]; then
    printf 'DRY-RUN: render %s -> %s\n' "$template" "$destination"
    printf 'DRY-RUN: launchctl bootout %s/%s\n' "gui/${UID:-$(id -u)}" "$label"
    printf 'DRY-RUN: launchctl bootstrap %s %s\n' "gui/${UID:-$(id -u)}" "$destination"
    printf 'DRY-RUN: launchctl kickstart -k %s/%s\n' "gui/${UID:-$(id -u)}" "$label"
    continue
  fi

  render_plist "$template" "$destination"
  launchctl bootout "gui/${UID:-$(id -u)}/$label" >/dev/null 2>&1 || true
  launchctl bootstrap "gui/${UID:-$(id -u)}" "$destination"
  launchctl kickstart -k "gui/${UID:-$(id -u)}/$label"
done
