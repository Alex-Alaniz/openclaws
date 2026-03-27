#!/bin/bash
set -euo pipefail

readonly HEARTBEAT_REPO_ROOT="${OPENCLAWS_HEARTBEAT_REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
readonly HEARTBEAT_VAR_DIR="${OPENCLAWS_HEARTBEAT_STATE_DIR:-$HEARTBEAT_REPO_ROOT/var/heartbeat}"
readonly HEARTBEAT_LOG_DIR="$HEARTBEAT_VAR_DIR/logs"
readonly HEARTBEAT_METRICS_DIR="$HEARTBEAT_VAR_DIR/metrics"
readonly HEARTBEAT_REPORT_DIR="$HEARTBEAT_VAR_DIR/reports"
readonly HEARTBEAT_STATE_DIR="$HEARTBEAT_VAR_DIR/state"
readonly HEARTBEAT_LOCK_DIR="$HEARTBEAT_STATE_DIR/locks"
readonly HEARTBEAT_DEFAULT_MODEL="anthropic/claude-sonnet-4-6"

ensure_heartbeat_dirs() {
  mkdir -p \
    "$HEARTBEAT_LOG_DIR" \
    "$HEARTBEAT_METRICS_DIR" \
    "$HEARTBEAT_REPORT_DIR" \
    "$HEARTBEAT_STATE_DIR" \
    "$HEARTBEAT_LOCK_DIR"
}

lead_agent_ids() {
  cat <<'EOF'
bearcrawl-lead
bearo-lead
blazecamp-lead
cybear-lead
openclaws-lead
storefront-lead
EOF
}

has_lead_agent() {
  local target="$1"
  while IFS= read -r agent; do
    if [[ "$agent" == "$target" ]]; then
      return 0
    fi
  done < <(lead_agent_ids)
  return 1
}

lead_project_name() {
  case "$1" in
    bearcrawl-lead) printf '%s\n' "BearCrawl" ;;
    bearo-lead) printf '%s\n' "Bearo" ;;
    blazecamp-lead) printf '%s\n' "BlazeCamp" ;;
    cybear-lead) printf '%s\n' "Cybear" ;;
    openclaws-lead) printf '%s\n' "OpenClaws" ;;
    storefront-lead) printf '%s\n' "Storefront" ;;
    *) return 1 ;;
  esac
}

lead_primary_model() {
  case "$1" in
    bearcrawl-lead|bearo-lead|blazecamp-lead|cybear-lead|openclaws-lead|storefront-lead)
      printf '%s\n' "$HEARTBEAT_DEFAULT_MODEL"
      ;;
    *)
      return 1
      ;;
  esac
}

lead_policy() {
  case "$1" in
    cybear-lead) printf '%s\n' "dormant-ok" ;;
    *) printf '%s\n' "normal" ;;
  esac
}

lead_work_dirs() {
  case "$1" in
    bearcrawl-lead)
      printf '%s\n' "/Users/alexalaniz/Code/BearCrawl"
      ;;
    bearo-lead)
      printf '%s\n' "/Users/alexalaniz/Code/Bearo-iOS"
      ;;
    blazecamp-lead)
      printf '%s\n' "/Users/alexalaniz/Code/blazecamp"
      printf '%s\n' "/Users/alexalaniz/Code/blazecamp-ios"
      ;;
    cybear-lead)
      printf '%s\n' "/Users/alexalaniz/Code/cybear-frontend"
      printf '%s\n' "/Users/alexalaniz/Code/cybear-backend"
      ;;
    openclaws-lead)
      printf '%s\n' "/Users/alexalaniz/Code/openclaws"
      ;;
    storefront-lead)
      printf '%s\n' "/Users/alexalaniz/Code/storefront"
      ;;
    *)
      return 1
      ;;
  esac
}

lead_stale_minutes() {
  case "$1" in
    bearcrawl-lead|bearo-lead|blazecamp-lead|cybear-lead|openclaws-lead|storefront-lead)
      printf '%s\n' "25"
      ;;
    *)
      return 1
      ;;
  esac
}

lead_launchd_label() {
  case "$1" in
    bearcrawl-lead|bearo-lead|blazecamp-lead|cybear-lead|openclaws-lead|storefront-lead)
      printf 'com.openclaws.heartbeat.%s\n' "$1"
      ;;
    *)
      return 1
      ;;
  esac
}

heartbeat_state_file() {
  printf '%s/%s.json\n' "$HEARTBEAT_STATE_DIR" "$1"
}

heartbeat_events_file() {
  printf '%s/%s-events.jsonl\n' "$HEARTBEAT_METRICS_DIR" "$1"
}

heartbeat_log_file() {
  printf '%s/%s.log\n' "$HEARTBEAT_LOG_DIR" "$1"
}

heartbeat_lock_path() {
  printf '%s/%s.lock\n' "$HEARTBEAT_LOCK_DIR" "$1"
}

launchctl_domain() {
  printf 'gui/%s\n' "${UID:-$(id -u)}"
}

agent_runtime_label() {
  printf 'com.openclaws.agent.%s\n' "$1"
}

agent_runtime_label_override() {
  local key="${1//-/_}"
  key="${key^^}"
  local env_name="OPENCLAWS_AGENT_LABEL_${key}"
  printf '%s' "${!env_name:-}"
}

resolved_agent_runtime_label() {
  local override
  override="$(agent_runtime_label_override "$1")"
  if [[ -n "$override" ]]; then
    printf '%s\n' "$override"
    return 0
  fi
  agent_runtime_label "$1"
}

launchctl_job_exists() {
  local label="$1"
  command -v launchctl >/dev/null 2>&1 || return 1
  launchctl print "$(launchctl_domain)/$label" >/dev/null 2>&1
}
