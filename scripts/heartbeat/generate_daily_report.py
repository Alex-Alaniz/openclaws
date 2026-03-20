#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate a daily heartbeat report.")
    parser.add_argument(
        "--state-dir",
        default=None,
        help="Heartbeat state directory. Defaults to <repo>/var/heartbeat.",
    )
    parser.add_argument(
        "--date",
        default=None,
        help="UTC date to summarize in YYYY-MM-DD. Defaults to today's UTC date.",
    )
    parser.add_argument(
        "--stdout",
        action="store_true",
        help="Also print the markdown report to stdout.",
    )
    return parser.parse_args()


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def resolve_state_dir(path: str | None) -> Path:
    if path:
        return Path(path)
    return repo_root() / "var" / "heartbeat"


def load_events(metrics_dir: Path, report_date: str) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    for path in sorted(metrics_dir.glob("*-events.jsonl")):
        inferred_agent_id = path.stem.removesuffix("-events")
        with path.open("r", encoding="utf-8") as fh:
            for raw in fh:
                raw = raw.strip()
                if not raw:
                    continue
                item = json.loads(raw)
                item.setdefault("agent_id", inferred_agent_id)
                timestamp = str(item.get("timestamp", ""))
                if timestamp.startswith(report_date):
                    events.append(item)
    return events


def summarize(events: list[dict[str, Any]]) -> tuple[dict[str, Any], str]:
    lead_events = [event for event in events if event.get("agent_id") != "orchestrator"]
    orchestrator_events = [event for event in events if event.get("agent_id") == "orchestrator"]

    status_counts = Counter(event.get("status", "unknown") for event in lead_events)
    result_counts = Counter(event.get("result", "unknown") for event in lead_events)

    per_agent: dict[str, dict[str, Any]] = {}
    per_model: dict[str, dict[str, Any]] = defaultdict(lambda: {"runs": 0, "duration_ms": 0, "warn": 0, "error": 0})

    for event in lead_events:
        agent_id = str(event["agent_id"])
        model = str(event.get("model", "unknown"))
        per_model[model]["runs"] += 1
        per_model[model]["duration_ms"] += int(event.get("duration_ms", 0))
        if event.get("status") == "warn":
            per_model[model]["warn"] += 1
        if event.get("status") == "error":
            per_model[model]["error"] += 1
        per_agent[agent_id] = event

    failure_rate = 0.0
    degraded_rate = 0.0
    if lead_events:
        failure_rate = status_counts.get("error", 0) / len(lead_events)
        degraded_rate = (status_counts.get("warn", 0) + status_counts.get("error", 0)) / len(lead_events)

    summary = {
        "total_lead_events": len(lead_events),
        "total_orchestrator_events": len(orchestrator_events),
        "failure_rate": failure_rate,
        "degraded_rate": degraded_rate,
        "status_counts": dict(status_counts),
        "result_counts": dict(result_counts),
        "per_agent_latest": per_agent,
        "per_model": {
            model: {
                "runs": data["runs"],
                "warn": data["warn"],
                "error": data["error"],
                "avg_duration_ms": round(data["duration_ms"] / data["runs"], 2) if data["runs"] else 0,
            }
            for model, data in sorted(per_model.items())
        },
    }

    lines = [
        "# Daily Heartbeat Report",
        "",
        f"- Lead heartbeat events: {len(lead_events)}",
        f"- Orchestrator events: {len(orchestrator_events)}",
        f"- Failure rate: {failure_rate:.2%}",
        f"- Degraded rate: {degraded_rate:.2%}",
        "",
        "## Lead Status",
        "",
        "| Agent | Status | Result | Active Sessions | Detail |",
        "| --- | --- | --- | ---: | --- |",
    ]

    for agent_id in sorted(per_agent):
        event = per_agent[agent_id]
        detail = str(event.get("detail", "")).replace("\n", " ").strip()
        lines.append(
            f"| {agent_id} | {event.get('status', 'unknown')} | {event.get('result', 'unknown')} | "
            f"{event.get('active_sessions', 0)} | {detail} |"
        )

    lines.extend(
        [
            "",
            "## Model Performance",
            "",
            "| Model | Runs | Warnings | Errors | Avg Duration (ms) |",
            "| --- | ---: | ---: | ---: | ---: |",
        ]
    )

    for model, data in summary["per_model"].items():
        lines.append(
            f"| {model} | {data['runs']} | {data['warn']} | {data['error']} | {data['avg_duration_ms']} |"
        )

    markdown = "\n".join(lines) + "\n"
    return summary, markdown


def main() -> int:
    args = parse_args()
    state_dir = resolve_state_dir(args.state_dir)
    metrics_dir = state_dir / "metrics"
    reports_dir = state_dir / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)

    report_date = args.date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    events = load_events(metrics_dir, report_date)
    summary, markdown = summarize(events)

    json_path = reports_dir / f"{report_date}.json"
    md_path = reports_dir / f"{report_date}.md"
    latest_json = reports_dir / "latest.json"
    latest_md = reports_dir / "latest.md"

    json_path.write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    md_path.write_text(markdown, encoding="utf-8")
    latest_json.write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    latest_md.write_text(markdown, encoding="utf-8")

    if args.stdout:
        print(markdown, end="")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
