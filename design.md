# Design

## 1. Design summary

ClawObserver is designed as a small local monitoring application with two intentionally different data paths:

1. **Live path** for current OpenClaw runtime state
2. **Archive path** for low-frequency historical analysis

This split is mandatory because the audited historical panels originated from SigNoz dashboards with finer-grained semantics than a lightweight 30-minute archive can reproduce.

## 2. Architectural principles

### 2.1 Separate live and historical concerns

- Realtime UI reads directly from OpenClaw runtime sources.
- Historical UI reads from a local archive store.
- The product must never fake live state by replaying the archive.
- The product must never fake minute-resolution history from 30-minute samples.

### 2.2 Lightweight by default

- Prefer a single local application process plus a small scheduled collector.
- Avoid heavyweight observability infrastructure such as ClickHouse, large OTEL pipelines, or always-on metric backends for this use case.
- Use local storage that is queryable without introducing a service fleet.

### 2.3 Honest semantics

- Realtime panels are labeled as live runtime state.
- Historical panels are labeled as sampled archive data.
- Multi-day views are labeled as daily last-record summaries.

## 3. Proposed system shape

### 3.1 Runtime components

1. **Live collector adapter**
   - reads OpenClaw runtime/CLI/API state on demand
   - normalizes active sessions, per-agent session counts, queue depth, and gateway counts

2. **Archive snapshot job**
   - runs roughly every 30 minutes
   - collects the same normalized monitoring snapshot families needed for history
   - writes local historical records

3. **Local web UI**
   - overview/realtime page
   - historical page
   - token statistics page

### 3.2 Storage choice

Use a local SQLite database as the default archive store.

Why SQLite:
- lightweight single-file storage
- good fit for time-range queries
- easy daily-last-record selection
- does not require a server process like ClickHouse or Postgres

A companion JSON export may be added later for portability, but SQLite is the primary design target.

## 4. Data model

The schema should be minimal and aligned to the approved scope.

### 4.1 Snapshot cadence metadata

**Table: `archive_snapshots`**
- `id`
- `captured_at`
- `capture_date`
- `source_version`
- `capture_status`

Purpose:
- anchors every archived sample
- enables current-day point queries and day-last-record queries

### 4.2 Session overview samples

**Table: `session_overview_samples`**
- `snapshot_id`
- `total_sessions`
- `active_sessions`
- `idle_sessions`

Purpose:
- supports Session Statistics
- supports headline historical KPIs

### 4.3 Per-agent session samples

**Table: `agent_session_samples`**
- `snapshot_id`
- `agent_name`
- `active_sessions`
- `total_sessions`

Purpose:
- supports Active Sessions by Agent
- supports Agent Active Sessions Count
- supports Agent Session Count

### 4.4 Session state samples

**Table: `session_state_samples`**
- `snapshot_id`
- `state_name`
- `session_count`

Purpose:
- supports Session State panels

### 4.5 Queue depth samples

**Table: `queue_lane_samples`**
- `snapshot_id`
- `lane_name`
- `depth`

Purpose:
- supports Queue Depth by Lane

### 4.6 Token daily samples

**Table: `token_counter_samples`**
- `snapshot_id`
- `day_key`
- `provider`
- `model`
- `channel`
- `input_tokens`
- `output_tokens`

Purpose:
- supports Token Throughput per day by Model / Provider / Channel
- supports token statistics page with daily-reset counter handling

### 4.7 Gateway samples

**Table: `gateway_samples`**
- `snapshot_id`
- `gateway_group`
- `gateway_count`

Minimum required design:
- support a total gateway count series

Optional future columns only if backed by real source data:
- `online_count`
- `offline_count`
- `starts_today`
- `errors_today`

## 5. Query semantics

### 5.1 Current day

For Current Day:
- query all archive points for the selected day
- sort by capture time ascending
- render each archived sample on the time axis

### 5.2 Multi-day ranges

For ranges greater than one day:
- collapse each metric family to the last archived sample per calendar day
- plot one point per day per series
- explicitly label the view as daily last-record summary

### 5.3 Token calculations

Token statistics use daily-reset counters.

Rules:
- for a finished day, use that day’s last archived token record
- for the current day, use the latest archived record available so far
- range totals are sums of the selected daily end-state records
- provider/model/channel distributions are based on the same daily selected records

## 6. Information architecture

### 6.1 Realtime overview page

Sections:
1. headline KPIs
   - active sessions
   - total sessions
   - derived idle sessions
   - gateway count
2. per-agent active-session distribution
3. queue depth by lane
4. compact agent/session table

Behavior:
- fast refresh from live runtime source
- no dependence on archive availability for core live status

### 6.2 Historical page

Sections:
1. Active Sessions
2. Active Sessions by Agent
3. Session State
4. Agent Activity Statistics
5. Queue Depth by Lane
6. Agent Active Sessions Count / Session Statistics / Agent Session Count group
7. Token Throughput by Model / Provider / Channel

Behavior:
- shared range selector
- explicit mode label: intra-day sampled vs daily last-record summary

### 6.3 Token statistics page

Sections:
1. total input tokens
2. total output tokens
3. provider distribution
4. model distribution
5. channel distribution when available
6. optional daily gateway/request error or start stats if the source exists

## 7. Visual design language

The UI should feel like an operational console, not a marketing demo.

### 7.1 Tone

- deep-tech
- restrained
- precise
- slightly dark and layered
- high signal density

### 7.2 Palette

Recommended direction:
- dark graphite / ink background
- slate panels with subtle elevation differences
- one restrained cool accent family for interactive emphasis
- one muted warning color and one muted error color

Avoid:
- rainbow accents
- excessive neon glow
- animated chrome for its own sake
- decorative gradients competing with the data

### 7.3 Typography and spacing

- use compact, readable type with clear numeric emphasis
- prioritize tabular alignment for counts and token values
- use consistent metric-card rhythm rather than oversized hero cards

### 7.4 Charts

- prefer crisp line, bar, and stacked-state charts
- keep gridlines subtle
- emphasize legends and labels over visual effects
- use consistent color mapping per agent/lane/state wherever possible

## 8. Failure and degraded behavior

1. If live runtime access fails, realtime panels show explicit degraded-state messaging rather than stale values disguised as current.
2. If archive data is missing for a day, charts show a gap rather than synthetic interpolation.
3. If token channel data is absent, the UI hides that breakdown cleanly rather than inventing an `unknown` distribution unless the source explicitly emits it.

## 9. Implementation sequencing

Recommended build order:
1. live collector contract
2. archive schema and snapshot writer
3. realtime overview UI
4. historical chart queries with day-last-record rules
5. token statistics page
6. optional gateway/request error daily extras

## 10. Open questions

1. Which exact OpenClaw command/API should back the live collector contract for sessions, queues, and gateways?
2. Is gateway state available as a direct runtime value or only as derived counts?
3. Are Agent Activity Statistics best represented as archived sampled counters, sampled rates, or a compact multi-series daily summary from the available runtime source?
4. Should the archive scheduler live inside the app process or as a separate cron-safe collector command?
