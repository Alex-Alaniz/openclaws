#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lead_config.sh"

DRY_RUN=0
FORCE=0

usage() {
  cat <<'EOF'
Usage: run_orchestrator.sh [--dry-run] [--force]
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --force)
      FORCE=1
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

ensure_heartbeat_dirs

ORCHESTRATOR_STATE_FILE="$(heartbeat_state_file orchestrator)"
ORCHESTRATOR_EVENT_FILE="$(heartbeat_events_file orchestrator)"
ORCHESTRATOR_LOCK_PATH="$(heartbeat_lock_path orchestrator)"

log() {
  printf '[%s] [orchestrator] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

file_mtime_epoch() {
  local path="$1"
  if stat -f %m "$path" >/dev/null 2>&1; then
    stat -f %m "$path"
  else
    stat -c %Y "$path"
  fi
}

write_summary() {
  local status="$1"
  local detail="$2"
  local triggered="$3"
  local fresh="$4"
  local failed="$5"
  local total="$6"
  local timestamp
  timestamp="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

  python3 - "$ORCHESTRATOR_STATE_FILE" "$ORCHESTRATOR_EVENT_FILE" "$timestamp" "$status" "$detail" \
    "$triggered" "$fresh" "$failed" "$total" <<'PY'
import json
import pathlib
import sys

state_path, event_path, timestamp, status, detail, triggered, fresh, failed, total = sys.argv[1:]
payload = {
    "agent_id": "orchestrator",
    "timestamp": timestamp,
    "status": status,
    "detail": detail,
    "triggered": int(triggered),
    "fresh": int(fresh),
    "failed": int(failed),
    "total_agents": int(total),
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

if ! mkdir "$ORCHESTRATOR_LOCK_PATH" 2>/dev/null; then
  log "SKIP: Orchestrator already in progress"
  write_summary "ok" "Orchestrator already in progress" "0" "0" "0" "0"
  exit 0
fi

cleanup() {
  rmdir "$ORCHESTRATOR_LOCK_PATH" 2>/dev/null || true
}
trap cleanup EXIT

log "=== Orchestrator run start ==="

total=0
triggered=0
fresh=0
failed=0

while IFS= read -r agent; do
  [[ -z "$agent" ]] && continue
  total=$((total + 1))

  state_file="$(heartbeat_state_file "$agent")"
  stale_limit_seconds="$(( $(lead_stale_minutes "$agent") * 60 ))"
  label="$(lead_launchd_label "$agent")"
  stale=1

  if [[ -f "$state_file" ]]; then
    last_epoch="$(file_mtime_epoch "$state_file")"
    age_seconds="$(( $(date +%s) - last_epoch ))"
    if (( age_seconds <= stale_limit_seconds )) && [[ "$FORCE" != "1" ]]; then
      stale=0
    fi
  fi

  if (( stale == 0 )); then
    fresh=$((fresh + 1))
    log "Fresh heartbeat for $agent; no action needed"
    continue
  fi

  triggered=$((triggered + 1))
  log "Heartbeat stale for $agent; requesting recovery via $label"

  recovered=0
  if [[ "$DRY_RUN" == "1" ]]; then
    log "DRY-RUN: Would kickstart $(launchctl_domain)/$label"
    recovered=1
  elif launchctl_job_exists "$label"; then
    if launchctl kickstart -k "$(launchctl_domain)/$label" >/dev/null 2>&1; then
      recovered=1
    fi
  fi

  if (( recovered == 0 )); then
    if [[ "$DRY_RUN" == "1" ]]; then
      log "DRY-RUN: Would directly invoke heartbeat runner for $agent"
      recovered=1
    elif "$SCRIPT_DIR/run_lead_heartbeat.sh" --agent-id "$agent" --source orchestrator >/dev/null 2>&1; then
      recovered=1
    fi
  fi

  if (( recovered == 0 )); then
    failed=$((failed + 1))
    log "ERROR: Failed to recover stale heartbeat for $agent"
  fi
done < <(lead_agent_ids)

report_status="ok"
report_detail="Orchestrator completed successfully"
if (( failed > 0 )); then
  report_status="warn"
  report_detail="One or more stale heartbeat jobs could not be recovered"
fi

if [[ "$DRY_RUN" != "1" ]]; then
  if ! python3 "$SCRIPT_DIR/generate_daily_report.py" --state-dir "$HEARTBEAT_VAR_DIR" --date "$(date +%F)" >/dev/null 2>&1; then
    report_status="warn"
    report_detail="Orchestrator completed but report generation failed"
    log "WARN: Failed to generate daily heartbeat report"
  fi
else
  log "DRY-RUN: Skipping report generation"
fi

log "=== Orchestrator complete: $total agents, $triggered triggered, $fresh fresh, $failed failed ==="
write_summary "$report_status" "$report_detail" "$triggered" "$fresh" "$failed" "$total"
