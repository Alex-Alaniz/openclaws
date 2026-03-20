# Heartbeat Hardening

This directory vendors the operational artifacts for ENG-524:

- one `launchd` heartbeat plist per lead agent
- one general orchestrator plist as a safety net
- local metrics/state/report generation for daily tracking
- a short design analysis covering whether both layers are worth keeping

## Lead Roster

The hardcoded lead set in this repo matches the active operational references that already existed outside the repo:

| Lead | Project | Expected work dirs | Policy | Model |
| --- | --- | --- | --- | --- |
| `bearcrawl-lead` | BearCrawl | `/Users/alexalaniz/Code/BearCrawl` | normal | `anthropic/claude-sonnet-4-6` |
| `bearo-lead` | Bearo | `/Users/alexalaniz/Code/Bearo-iOS` | normal | `anthropic/claude-sonnet-4-6` |
| `blazecamp-lead` | BlazeCamp | `/Users/alexalaniz/Code/blazecamp`, `/Users/alexalaniz/Code/blazecamp-ios` | normal | `anthropic/claude-sonnet-4-6` |
| `cybear-lead` | Cybear | `/Users/alexalaniz/Code/cybear-frontend`, `/Users/alexalaniz/Code/cybear-backend` | dormant-ok | `anthropic/claude-sonnet-4-6` |
| `openclaws-lead` | OpenClaws | `/Users/alexalaniz/Code/openclaws` | normal | `anthropic/claude-sonnet-4-6` |
| `storefront-lead` | Storefront | `/Users/alexalaniz/Code/storefront` | normal | `anthropic/claude-sonnet-4-6` |

`cybear-lead` is treated as monitored dormancy rather than a hard outage. That matches the current org guidance that Cybear can stay quiet until the partnership activates.

## Files

- `scripts/heartbeat/lead_config.sh`
  Central hardcoded roster, labels, workdir expectations, stale thresholds.
- `scripts/heartbeat/run_lead_heartbeat.sh`
  Per-agent heartbeat check. It records state, flags missing workdirs, and detects whether an agent session is already active.
- `scripts/heartbeat/run_orchestrator.sh`
  Safety net. It restarts stale per-agent heartbeat jobs via `launchctl kickstart`, falls back to direct execution when needed, and regenerates the current-day report.
- `scripts/heartbeat/generate_daily_report.py`
  Aggregates per-agent JSONL events into markdown + JSON daily reports.
- `scripts/heartbeat/install_launchd.sh`
  Renders the versioned plists into `~/Library/LaunchAgents` and bootstraps them.
- `ops/heartbeat/launchd/*.plist`
  Versioned plist templates with one file per lead plus the orchestrator.

## Install

Dry-run first:

```bash
bash scripts/heartbeat/install_launchd.sh --dry-run
```

Install for real:

```bash
bash scripts/heartbeat/install_launchd.sh
```

The install script rewrites `__REPO_ROOT__` in the plist templates so the committed files stay portable across worktrees while the installed plists remain agent-specific and hardcoded.

## Run Manually

Single lead:

```bash
bash scripts/heartbeat/run_lead_heartbeat.sh --agent-id openclaws-lead
```

Orchestrator dry-run:

```bash
bash scripts/heartbeat/run_orchestrator.sh --dry-run
```

Daily report to stdout:

```bash
python3 scripts/heartbeat/generate_daily_report.py --stdout
```

## Outputs

Generated artifacts are written under `var/heartbeat/`:

- `state/<agent>.json`
  Last heartbeat result for that lead.
- `metrics/<agent>-events.jsonl`
  Append-only event stream used for daily rollups.
- `reports/YYYY-MM-DD.{md,json}`
  Daily summary report.
- `reports/latest.{md,json}`
  Current snapshot for dashboards or quick inspection.
- `logs/`
  Launchd stdout/stderr targets.

## Daily Tracking

The report script tracks:

- failure rate: fraction of lead heartbeat events with `status=error`
- degraded rate: warnings plus errors
- per-agent latest state
- model performance: runs, warnings, errors, and average heartbeat duration grouped by the lead's configured primary model

This is intentionally launch/heartbeat performance, not token-level model quality. It is enough to answer which model cohort is correlated with unstable heartbeat behavior.
