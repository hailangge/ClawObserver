# Requirements

## 1. Purpose

ClawObserver is a lightweight monitoring application for OpenClaw that replaces the current heavy SigNoz workflow with a runtime-first local dashboard and a low-cost historical archive.

The product must preserve the meaning of the already-audited OpenClaw/SigNoz monitoring views where feasible, while being explicit about where a 30-minute archive cadence cannot reproduce minute-level dashboard behavior.

## 2. Product goals

1. Show current OpenClaw runtime state directly from live runtime/CLI data, not from a historical database cache.
2. Preserve the important operational views already used in the audited SigNoz dashboards.
3. Support lightweight historical analysis through local archival snapshots collected on an approximately 30-minute cadence.
4. Provide a dedicated token statistics view for cost and usage analysis.
5. Stay small enough to run comfortably on a host where SigNoz/ClickHouse was considered too heavy.

## 3. Source-of-truth constraints

### 3.1 Realtime source of truth

Realtime views must be derived from current OpenClaw runtime state.

Accepted realtime sources:
- OpenClaw CLI output
- runtime APIs or local IPC endpoints
- local process/runtime inspection exposed by OpenClaw itself

Rejected realtime sources:
- stale DB/cache replicas used as a proxy for current runtime state
- historical archive tables treated as if they were live state

### 3.2 Historical source of truth

Historical views must be derived from locally archived snapshots written by ClawObserver or a companion collector.

Constraints:
- Target archive cadence: every 30 minutes
- Historical semantics must be labeled honestly as sampled/archive data
- For ranges longer than one day, charts must use only each day’s last archived record as the daily comparison point
- The old `sigz_openclaw_monitoring_summary.md` and its obsolete `openclaw_agent_*` metrics must not be used as the basis for this product

## 4. In-scope monitoring views

The approved scope is limited to the following domains.

### 4.1 Realtime runtime-derived state

The product must provide a realtime overview page containing at minimum:

1. **Active session total**
2. **Per-agent active session totals**
3. **Per-agent active-session bar chart**
   - show only agents with active sessions > 0
   - sort descending left-to-right by active count
4. **Session statistics summary**
   - total sessions
   - active sessions
   - derived idle sessions
5. **Queue depth by lane**
6. **Gateway counts**
   - must include total currently known gateways
   - if runtime exposes gateway state safely, may also show per-state counts such as online/offline
   - must include today’s gateway exit count when the runtime or host service metadata can provide it conservatively
   - if today’s exit count is derived from logs or the journal, the product must document that heuristic clearly instead of presenting it as an exact runtime-native counter

### 4.2 Historical archive views

The product must provide a historical page grounded in the audited dashboard definitions and later verified overview additions.

Required historical panels:

1. **Active Sessions**
2. **Active Sessions by Agent**
3. **Session State**
4. **Agent Activity Statistics**
5. **Queue Depth by Lane**
6. **Gateway Reliability**
   - must include historical snapshots of the gateway exit count for the selected range
7. **Token Throughput per day by Model / Provider / Channel**
8. **Agent Active Sessions Count**
9. **Session Statistics**
10. **Agent Session Count**

Historical interpretation rules:
- If the archive cadence is 30 minutes, panels must present 30-minute sampled state rather than pretending to be 15-minute or minute-resolution telemetry.
- Current-day views may show each archived point for that day.
- Multi-day and multi-month comparison views must use only the last archived sample of each day.
- Time must remain on the X-axis.
- Separate data objects must remain separate series instead of being flattened into a single aggregate unless the panel is explicitly an aggregate KPI.

### 4.3 Dedicated token statistics page

The product must provide a historical statistics page focused on token usage.

Required outputs for the selected range:
- total input tokens
- total output tokens
- provider distribution
- model distribution
- channel distribution if the source data includes channel

Token aggregation rules:
- use each day’s last archived record because counters reset daily
- current-day totals use the latest archived record available for the current day
- cross-day totals sum daily end-of-day values over the selected range

Recommended optional additions only if the underlying runtime/archive exposes them cleanly:
- request or model error counts
- same-day gateway error counts
- same-day gateway start counts

## 5. Time-range behavior

The UI must expose simple range selectors appropriate for archive-based history, for example:
- Current Day
- Last 7 Days
- Last 30 Days
- Last 90 Days

Required behavior:
- Current Day: show intra-day archived points
- More than one day: show each day’s final archived point only
- The UI must clearly indicate whether the view is showing sampled intra-day points or daily last-record summaries

## 6. UX and style requirements

The approved style direction is:
- deep-tech
- concise
- visually deep
- high-tech
- not flashy
- not over-decorated

This means:
- dense, useful information is preferred over decorative motion
- restrained color accents are preferred over loud gradients or neon overload
- typography and layout should feel precise and operational
- panels should look intentional and modern without feeling like a sci-fi gimmick
- the header should include reliable branded ClawObserver artwork using an OpenClaw-style lobster with a magnifying glass and an enlarged magnified eye
- historical charts must render visible Y-axis labels and mouse-hover exact-value tooltips

## 7. Non-goals

The first version must not attempt to become a full observability suite.

Explicit non-goals:
- logs explorer
- traces explorer
- metrics ingestion platform replacement beyond this monitoring scope
- minute-level or second-level historical fidelity from the archive layer
- synthetic metrics not present in the approved monitoring scope, unless explicitly labeled as optional additions
- model routing or fallback-model features; the agent environment remains GPT-5.4 only

## 8. Deployment and publication requirements

The public repository and deployment story must stay aligned with the lightweight host-native model.

Required expectations:

1. The repository must ship a single operator-facing deployment script as the primary documented deployment entrypoint.
2. The deployment model must remain host-native Python plus user-level `systemd`; no extra service stack should be introduced.
3. The default bind address must remain `127.0.0.1` unless the operator explicitly overrides it in configuration.
4. The repository README must be suitable as an operator manual and must explain prerequisites, quick start, deployment, service management, runtime adapter behavior, archive cadence semantics, and troubleshooting.

## 9. Acceptance criteria

ClawObserver is acceptable when all of the following are true:

1. Realtime pages read current runtime state directly rather than replaying history.
2. Historical pages reflect the audited dashboard families listed in this document.
3. Archive cadence and day-last-record behavior are visible in both the product behavior and labeling.
4. Token statistics correctly aggregate daily-reset counters using daily last records.
5. Gateway counts are present in the approved scope without inventing unsupported gateway metrics.
6. Gateway exit counts are available in both realtime and archive-backed views, with any journal/log heuristic documented honestly.
7. Historical charts show visible Y-axis numeric labels and mouse-hover exact-value tooltips.
8. The UI follows the approved deep-tech minimal style direction, including branded ClawObserver header artwork.
9. The implementation remains lightweight enough to be a credible alternative to the prior SigNoz setup.
10. Public-repo deployment documentation stays consistent with the actual script-first user-level `systemd` install flow.

## 10. Open questions

These should be resolved conservatively during implementation:

1. What exact OpenClaw runtime command/API is the canonical live source for gateway state counts?
2. Which queue lanes are guaranteed stable enough to expose as first-class series labels?
3. Does channel always exist for token accounting, or must the UI gracefully omit that breakdown?
4. Are gateway historical error/start counts available from the runtime, or should they stay optional and hidden by default?
5. Should OpenClaw expose a first-class gateway exits-today counter so ClawObserver can retire the journal heuristic where it is currently needed?
