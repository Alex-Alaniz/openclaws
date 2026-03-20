# Per-Agent Plus Orchestrator Analysis

## Recommendation

Keep both layers.

Per-agent `launchd` jobs should remain the primary scheduler. The orchestrator should stay as a stale-job recovery layer and reporting trigger, not as the first mechanism that drives work.

## Why The Combo Helps

1. Per-agent isolation limits blast radius.
   If `bearo-lead` or `blazecamp-lead` breaks, the other lead heartbeat jobs still fire on schedule. A single shared scheduler would turn one corrupt plist, bad path, or transient user-session failure into a multi-agent outage.

2. The orchestrator catches silent drift that individual jobs miss.
   The current operational evidence already shows stale workdirs, duplicated runs, and dormant agents. A general sweep can detect "heartbeat never ran" scenarios that a per-agent job cannot self-report.

3. Reporting becomes simpler with one aggregation point.
   Daily tracking is much easier when the orchestrator always rewrites the current-day report after recovery attempts.

4. Recovery semantics are clearer.
   Per-agent jobs answer "did this agent's heartbeat run?" The orchestrator answers "if not, who noticed and what did it do?"

## Risks

1. Duplicate runs.
   If both layers invoke the same heartbeat simultaneously, the agent can double-log or compete for the same workspace. The implementation mitigates that with a per-agent lock directory and a stale threshold before kickstarts.

2. False positives on dormant teams.
   `cybear-lead` is intentionally quieter than the others. Treating it like a normal delivery lead would inflate failure numbers and trigger unnecessary restarts. The policy is hardcoded as `dormant-ok`.

3. Missing repo paths look like outages.
   `blazecamp-lead` has already shown a missing workdir in operational logs. That should stay visible as an error, because it is actionable and it means the lead heartbeat cannot actually do useful work.

## When The Combo Would Not Be Worth It

If all six leads were running inside a single supervisor with native restart, metrics, and health checks, separate launchd jobs would be redundant. That is not the current shape of the system. The evidence outside this repo points to independent lead environments, uneven repo availability, and manual recovery history, which makes the dual-layer design justified.
