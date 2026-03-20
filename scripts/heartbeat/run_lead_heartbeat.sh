#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lead_config.sh"

AGENT_ID=""
SOURCE="manual"
DRY_RUN=0

usage() {
  cat <<'EOF'
Usage: run_lead_heartbeat.sh --agent-id <lead-id> [--source <launchd|orchestrator|manual>] [--dry-run]
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --agent-id)
      AGENT_ID="${2:-}"
      shift 2
      ;;
    --source)
      SOURCE="${2:-}"
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

if [[ -z "$AGENT_ID" ]]; then
  usage >&2
  exit 64
fi

if ! has_lead_agent "$AGENT_ID"; then
  printf 'Unknown lead agent: %s\n' "$AGENT_ID" >&2
  exit 64
fi

ensure_heartbeat_dirs

MODEL="$(lead_primary_model "$AGENT_ID")"
POLICY="$(lead_policy "$AGENT_ID")"
LAUNCHD_LABEL="$(lead_launchd_label "$AGENT_ID")"
RUNTIME_LABEL="$(resolved_agent_runtime_label "$AGENT_ID")"
STATE_FILE="$(heartbeat_state_file "$AGENT_ID")"
EVENT_FILE="$(heartbeat_events_file "$AGENT_ID")"
LOCK_PATH="$(heartbeat_lock_path "$AGENT_ID")"

log() {
  printf '[%s] [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$AGENT_ID" "$*"
}

file_mtime_epoch() {
  local path="$1"
  if stat -f %m "$path" >/dev/null 2>&1; then
    stat -f %m "$path"
  else
    stat -c %Y "$path"
  fi
}

active_session_count() {
  local pattern="$1"
  local count=0
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    [[ "$line" == *"run_lead_heartbeat.sh"* ]] && continue
    [[ "$line" == *"run_orchestrator.sh"* ]] && continue
    count=$((count + 1))
  done < <(pgrep -af "$pattern" 2>/dev/null || true)
  printf '%s\n' "$count"
}

write_payload() {
  local status="$1"
  local result="$2"
  local detail="$3"
  local duration_ms="$4"
  local active_sessions="$5"
  local stale_seconds="$6"
  local missing_dirs_csv="$7"
  local work_dirs_csv="$8"
  local launchd_registered="$9"
  local timestamp
  timestamp="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

  python3 - "$STATE_FILE" "$EVENT_FILE" "$timestamp" "$AGENT_ID" "$status" "$result" "$SOURCE" \
    "$MODEL" "$LAUNCHD_LABEL" "$RUNTIME_LABEL" "$detail" "$duration_ms" "$active_sessions" \
    "$stale_seconds" "$POLICY" "$launchd_registered" "$missing_dirs_csv" "$work_dirs_csv" <<'PY'
import json
import pathlib
import sys

(state_path, event_path, timestamp, agent_id, status, result, source, model, launchd_label,
 runtime_label, detail, duration_ms, active_sessions, stale_seconds, policy,
 launchd_registered, missing_dirs_csv, work_dirs_csv) = sys.argv[1:]

def split_csv(raw: str) -> list[str]:
    return [item for item in raw.split("::") if item]

payload = {
    "timestamp": timestamp,
    "agent_id": agent_id,
    "status": status,
    "result": result,
    "source": source,
    "model": model,
    "launchd_label": launchd_label,
    "runtime_label": runtime_label,
    "detail": detail,
    "duration_ms": int(duration_ms),
    "active_sessions": int(active_sessions),
    "stale_seconds": int(stale_seconds),
    "policy": policy,
    "launchd_registered": launchd_registered == "true",
    "missing_work_dirs": split_csv(missing_dirs_csv),
    "work_dirs": split_csv(work_dirs_csv),
}

state = pathlib.Path(state_path)
events = pathlib.Path(event_path)
state.parent.mkdir(parents=True, exist_ok=True)
events.parent.mkdir(parents=True, exist_ok=True)
state.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
with events.open("a", encoding="utf-8") as fh:
    fh.write(json.dumps(payload, sort_keys=True) + "\n")
PY
}

start_epoch_ms="$(python3 - <<'PY'
import time
print(int(time.time() * 1000))
PY
)"

if ! mkdir "$LOCK_PATH" 2>/dev/null; then
  log "SKIP: Heartbeat already in progress"
  write_payload "ok" "skip_locked" "Heartbeat already in progress" "0" "0" "-1" "" "" \
    "$(launchctl_job_exists "$LAUNCHD_LABEL" && printf 'true' || printf 'false')"
  exit 0
fi

cleanup() {
  rmdir "$LOCK_PATH" 2>/dev/null || true
}
trap cleanup EXIT

launchd_registered="false"
if launchctl_job_exists "$LAUNCHD_LABEL"; then
  launchd_registered="true"
fi

log "=== Lead heartbeat: $AGENT_ID ==="

mapfile -t work_dirs < <(lead_work_dirs "$AGENT_ID")
missing_dirs=()
for dir in "${work_dirs[@]}"; do
  if [[ ! -d "$dir" ]]; then
    missing_dirs+=("$dir")
  fi
done

work_dirs_csv=""
missing_dirs_csv=""
if ((${#work_dirs[@]} > 0)); then
  work_dirs_csv="$(IFS='::'; printf '%s' "${work_dirs[*]}")"
fi
if ((${#missing_dirs[@]} > 0)); then
  missing_dirs_csv="$(IFS='::'; printf '%s' "${missing_dirs[*]}")"
fi

stale_seconds=-1
if [[ -f "$STATE_FILE" ]]; then
  last_epoch="$(file_mtime_epoch "$STATE_FILE")"
  stale_seconds="$(( $(date +%s) - last_epoch ))"
fi

active_sessions="$(active_session_count "$AGENT_ID")"
status="ok"
result="idle_no_session"
detail="No active session detected"

if ((${#missing_dirs[@]} > 0)); then
  if [[ "$POLICY" == "dormant-ok" ]]; then
    status="warn"
    result="missing_workdir_dormant_ok"
    detail="Missing expected work directories for dormant agent"
    log "WARN: Missing expected work directories: ${missing_dirs[*]}"
  else
    status="error"
    result="missing_workdir"
    detail="Missing expected work directories"
    log "ERROR: Missing expected work directories: ${missing_dirs[*]}"
  fi
elif ((active_sessions > 0)); then
  result="active_session"
  detail="Agent already has an active session"
  log "SKIP: Already has ${active_sessions} active task window(s)"
elif [[ "$POLICY" == "dormant-ok" ]]; then
  result="idle_dormant_ok"
  detail="Dormant lead heartbeat completed without active work"
  log "Dormant lead is idle by policy"
else
  status="warn"
  result="idle_no_session"
  detail="No active session detected; heartbeat recorded"
  log "No active session detected"
fi

if [[ "$DRY_RUN" == "1" ]]; then
  detail="${detail}; dry-run"
fi

end_epoch_ms="$(python3 - <<'PY'
import time
print(int(time.time() * 1000))
PY
)"
duration_ms="$((end_epoch_ms - start_epoch_ms))"

write_payload "$status" "$result" "$detail" "$duration_ms" "$active_sessions" "$stale_seconds" \
  "$missing_dirs_csv" "$work_dirs_csv" "$launchd_registered"
