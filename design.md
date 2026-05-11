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
   - normalizes active sessions, per-agent session counts, session-type totals, truthful queue/backlog state, gateway counts, and the conservative gateway exits-today metric
   - for queue depth, prefers the real OpenClaw delivery queue on disk and records pending versus failed item counts when that path is available

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

### 3.3 Deployment shape

The first public deployment path remains deliberately simple:

- operator checks out the repository on the target host
- operator runs a single deployment script from the repo
- the script renders user-level `systemd` units and an env file into the operator's home directory
- the web service runs with `/usr/bin/env python3 -m clawobserver serve`
- archive capture runs with `/usr/bin/env python3 -m clawobserver capture`
- the default bind remains `127.0.0.1`

The deployment script is the primary operator entrypoint, but it is only a thin wrapper around the existing host-native Python plus user-level `systemd` model, not a new packaging system.

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
- supports Agent Session Count
- supplies both the active-series chart and the latest agent activity table without duplicating the historical chart family

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
- supports truthful queue/backlog history
- stores truthful delivery-queue depth from disk, at minimum `delivery_queue_pending` and `delivery_queue_failed`
- may store real finer-grained lane depth only if OpenClaw later exposes it truthfully
- otherwise stores the best public runtime backlog metric available as an explicit fallback

### 4.6 Session type samples

**Table: `session_type_samples`**
- `snapshot_id`
- `session_type`
- `session_count`

Purpose:
- supports Persistent vs One-Shot comparison
- supports the historical session-type pie chart

### 4.7 Token daily samples

**Table: `token_counter_samples`**
- `snapshot_id`
- `day_key`
- `provider`
- `model`
- `channel`
- `input_tokens`
- `output_tokens`
- `cache_read_tokens`
- `cache_write_tokens`
- `cache_metrics_present`

Purpose:
- supports Token Throughput per day by Model / Provider / Channel
- supports token statistics page with daily-reset counter handling
- supports cache-hit ratio when OpenClaw exposes cache counters cleanly

### 4.8 Gateway samples

**Table: `gateway_samples`**
- `snapshot_id`
- `gateway_group`
- `gateway_count`

Minimum required design:
- support a total gateway count series
- support an `exits_today` series for gateway reliability views

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
3. delivery queue depth
   - current validated semantics are delivery-queue pending and failed item counts from the on-disk queue
4. compact agent/session table
5. gateway exit count card and gateway reliability breakdown
6. central embeddable 3D scene for agent state presentation

Behavior:
- fast refresh from live runtime source
- no dependence on archive availability for core live status

Scene MVP behavior:
- The central scene is a state-driven presentation layer, not a simulation or game loop.
- The scene must be embed-friendly inside the existing dashboard layout.
- The production Realtime page at `/` owns this scene; `/prototype` may remain as a thin development route over the same renderer, but the shipped operator flow uses the 3D scene in the current Realtime view.
- MVP is desktop-only.
- MVP omits shadows and complex UI/rendering effects.
- MVP uses exactly 12 fixed workstation/desk slots; slot count is fixed by config in this phase.
- The desk grid should be compact rather than overly horizontal: reduce inter-desk gaps, use a denser 4x3 or equivalent cluster, and tune camera/framing around readability rather than preserving the old wide spread.
- The production Realtime layout should make the 3D scene horizontally fill the main dashboard card. Scene summary/status information belongs above the canvas in ordinary HTML so it does not squeeze the WebGL region into a narrow composition.
- Desk-scale objects should be visibly larger: enlarge desk/table geometry, monitor screens, labels/nameplates, status lamps, and task stacks relative to the room and camera so text/status information can be inspected without zooming.
- Visual layout and style should be aligned to `clawobserver/static/assets/static_scene.jpg`, covering both the work area and a reserved rest/lounge area.
- The visual treatment should push closer to the reference image's warmer, friendlier, lightly skeuomorphic office feel while keeping geometry and materials inexpensive to render.
- The rest/lounge area can be simple in MVP but must remain a distinct reserved region for Phase 2 person/task/status expansion.
- The MVP object vocabulary is limited to office shell, desks/workstations, monitors, status lamps, capped task/file stacks, labels/nameplates, a global status board, and simple low-poly office props.
- Evaluate permissively licensed open-source 3D asset libraries for office furniture/props when practical. Imported assets must be small, license-documented, repo-local, and runtime-offline; otherwise implement a clear local `OfficeProps`/asset seam using richer primitive low-poly components.
- Interactions are limited to hover highlight/name and click selection/detail panel.

## 6.2 Realtime scene architecture

Proposed data flow:
1. **OpenClaw live data from `/api/live/overview`**
2. **Realtime dashboard fetch/poll loop**
3. **AgentVisualAdapter**
4. **AgentVisualState store**
5. **R3F scene components mounted into the Realtime center panel**
6. **HTML detail overlay / side detail panel**

Responsibilities:
- `OpenClaw live data from /api/live/overview` is the raw runtime/CLI/API source already used for truthful live status.
- `Realtime dashboard fetch/poll loop` remains the owner of production polling, loading, retry, and degraded-state behavior for `/`.
- `AgentVisualAdapter` translates OpenClaw-specific payloads into a stable renderer-facing scene contract.
- `AgentVisualState store` holds the adapted agent array plus lightweight UI state such as selected agent and hovered agent.
- `R3F scene components` render only the stable scene contract and interaction callbacks.
- `HTML detail overlay` renders ordinary dashboard/UI detail outside the WebGL scene boundary.

Renderer contract:
- The scene renderer consumes `AgentVisualState[]` and scene-level selection/hover state.
- The renderer must not depend on OpenClaw runtime field names, command semantics, or storage internals.
- The scene uses a fixed workstation-slot configuration with exactly 12 slots in MVP.
- `AgentVisualState` should include:
  - `id`
  - `name`
  - `status`: `idle | busy | error | offline`
  - `taskCount`
  - `currentTask`
  - `errorMessage`
  - `updatedAt`
  - optional `avatarState` reserved for Phase 2

State-to-visual mapping:
- `idle` => green, low-brightness, normal desk presentation
- `busy` => blue highlighted monitor plus capped task/file stack
- `error` => red lamp or alert treatment; optional simple blink only
- `offline` => greyed desk with monitor off
- `taskCount` maps to a capped visible stack; raw task counts must never create unbounded scene objects

Suggested stack:
- React
- `three`
- `@react-three/fiber`
- `@react-three/drei`
- `zustand` or an equivalent minimal store
- optional `@react-spring/three` later if restrained motion is needed

Component breakdown:
- `AgentOfficeScene`
- `OfficeShell`
- `DeskGrid`
- `AgentDesk`
- `DeskModel`
- `Monitor`
- `StatusLamp`
- `TaskStack`
- `AgentLabel`
- `GlobalStatusBoard`
- `AgentDetailPanel`

Boundary rules:
- `AgentDetailPanel` is an ordinary HTML overlay/panel, not an in-canvas UI system.
- Hover and selection state may originate from the scene, but detailed text layout stays in normal React/HTML.
- The MVP scene should remain small enough to mount inside a dashboard card or center panel without re-owning the whole page.
- Production bundling should emit Python-served static assets with stable entry points so `clawobserver/static/app.js` can mount/update the scene without hard-coding hashed filenames.

Production behavior rules:
- The prior static-image center scene area in the Realtime page is replaced by the R3F mount region while the rest of the Realtime dashboard stays intact.
- Live data drives at minimum desk occupancy, monitor glow/color, status lamps, task/file stack height, readable labels/nameplates, selected detail content, and a global status board.
- Waiting/degraded states must remain truthful: empty desks stay visibly distinct, the status board reflects runtime state, and no synthetic busy work is created to fill the room.
- Browser smoke must validate the actual `/` page, not only `/prototype`, and assert zero console/page/request errors plus visible canvas, 12 desks, lounge, status board, and live-data-driven state differences.

Phase 2 extension point:
- Reserve `AgentAvatar` and `avatarState` as the extension seam for future people/avatar rendering.
- Avatar/person rendering, movement, and behavior are explicitly out of MVP scope.

### 6.3 Historical page

Sections:
1. Session Statistics with Total / Active / Idle together
2. Session Type Totals pie chart for Persistent vs One-Shot
3. Active Sessions by Agent
4. Session State
5. Agent Activity Statistics
6. Delivery Queue Depth
   - current validated semantics are the on-disk delivery queue pending/failed counts rather than generic synthetic lane names
7. Agent Session Count
8. Gateway Reliability
9. Token Throughput by Model / Provider / Channel

Behavior:
- shared range selector
- explicit mode label: intra-day sampled vs daily last-record summary

### 6.4 Token statistics page

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
- include branded ClawObserver header art that feels operator-facing rather than promotional

### 7.4 Charts

- prefer crisp line, bar, and stacked-state charts
- keep gridlines subtle
- emphasize legends and labels over visual effects
- use consistent color mapping per agent/lane/state wherever possible
- render visible Y-axis numeric labels
- support shared mouse-hover tooltips on historical charts so hovering an X bucket reveals every series value at that bucket
- keep the Realtime page's central visualization region as a dedicated but lightweight 3D office/work scene rather than downgrading it to ordinary summary panels
- use simple geometry and restrained lighting tuned for state legibility, not visual spectacle
- avoid shadows and complex post-processing in MVP
- keep motion minimal and purposeful; scene state changes should read clearly without turning into a decorative effects layer
- make working state, error state, and offline state immediately legible from desk-level cues
- cap repeated scene objects such as task/file stacks so scene complexity stays bounded
- keep detailed text and secondary controls in ordinary HTML outside the canvas where practical
- reserve the avatar/person layer as a future extension rather than forcing placeholder character systems into MVP

## 8. Operator documentation expectations

The public repository documentation should function as an operator manual rather than a sparse developer note.

Minimum README coverage:

1. what ClawObserver is and is not
2. high-level architecture and data-path split
3. prerequisites
4. quick start from the repo checkout
5. deployment through the repo script
6. installed unit names and service-management commands
7. loopback default access behavior and how to override it intentionally
8. runtime adapter precedence and fallback behavior
9. archive cadence and daily-last-record semantics
10. troubleshooting focused on the local host-native install path

## 9. Failure and degraded behavior

1. If live runtime access fails, realtime panels show explicit degraded-state messaging rather than stale values disguised as current.
2. If archive data is missing for a day, charts show a gap rather than synthetic interpolation.
3. If token channel data is absent, the UI hides that breakdown cleanly rather than inventing an `unknown` distribution unless the source explicitly emits it.
4. If token cache counters are absent, the cache-hit ratio is shown as unavailable rather than silently substituting zero.
5. If gateway exit counts are unavailable, the UI shows them as unavailable rather than silently substituting zero.

## 10. Implementation sequencing

Recommended build order:
1. live collector contract
2. archive schema and snapshot writer
3. `AgentVisualAdapter` contract and `AgentVisualState` mapping tests
4. minimal scene store plus embeddable R3F scene shell
5. desk/status/task-stack MVP components and HTML detail overlay
6. historical chart queries with day-last-record rules
7. token statistics page
8. optional gateway/request error daily extras

## 11. Open questions

1. Which exact OpenClaw command/API should back the live collector contract for sessions, queues, and gateways?
2. Is gateway exits-today available as a first-class runtime/service value everywhere, or should the systemd journal heuristic remain the conservative default on Linux hosts?
3. Are Agent Activity Statistics best represented as archived sampled counters, sampled rates, or a compact multi-series daily summary from the available runtime source?
4. Should the archive scheduler live inside the app process or as a separate cron-safe collector command?
5. Should workstation layout be fully data-driven from config in MVP, or can the first prototype keep a fixed desk-grid component with configurable counts and labels?
   - Resolved for MVP: fixed desk-grid with exactly 12 slots is required.
6. Which hover details are guaranteed in the live payload for MVP versus deferred to later adapter enrichment?

## 12. Testing and validation strategy

Required validation layers for the scene MVP:
1. data-protocol tests
   - verify `AgentVisualAdapter` maps raw OpenClaw payloads into valid `AgentVisualState[]`
   - verify unsupported/missing OpenClaw fields degrade conservatively without leaking runtime-specific assumptions into the renderer
2. mapping-rule tests
   - verify `idle`, `busy`, `error`, and `offline` states map to the approved visual-state configuration
   - verify `taskCount` caps visible stack size
3. interaction tests
   - verify hover state exposes highlight plus label/name behavior
   - verify click selection drives the chosen agent and the HTML detail panel
4. smoke rendering
   - verify the scene mounts in the existing dashboard without taking over page layout
   - verify the MVP scene renders on supported desktop targets without shadows/effects dependencies
5. protocol-boundary tests
   - verify scene components do not import or depend directly on OpenClaw runtime adapter internals

## 13. Focused repair design: Realtime tag identity and status correctness (2026-05-07)

Scope is limited to the Realtime scene renderer/model pipeline.

Design decisions:
- The scene model remains the single source for rendered workstations, lounge occupants, hanging tags, and tooltip/status payloads.
- Workstation assignment must be deterministic and agent-centric: configured workstation slots win, previous refresh assignments may only fill unconfigured agents, and no agent may occupy more than one workstation anchor.
- The hanging tag is rendered from the exact workstation agent object, never from lounge ordering or active-agent sorted lists.
- Agent visual/status state is derived once while creating the scene agent object and reused for DOM attributes, aria labels, tooltip status, sidecar counts, and tests.
- Scene geometry is split out into `clawobserver/static/reference-scene-layout.json`, which stores measured pixel boxes for the background, desk tags, desk character placements, lounge area, and lounge slots. `app.js` loads that file and normalizes the measured image-space coordinates into percentage rectangles before any rendering.
- Idle agents keep their canonical desk tag with task count `0`, but their character avatar renders only in a configured lounge slot. Their desk slot stays visually empty apart from the tag/placeholder treatment.
- Unassigned desk anchors are explicit placeholders and must not be counted as idle agents.

Testing strategy:
- Add/adjust scene logic tests to cover configured mixed active/idle payloads where agent input order differs from workstation-slot order.
- Assert rendered tag text, `data-scene-agent-name`, `data-scene-task-count`, `data-scene-state`, tooltip status, active/resting counts, and unassigned slot behavior.
- Assert the measured scene-layout config normalizes to the expected percentage anchors for workstation tags, workstation character boxes, lounge area, and lounge slots.
- Run frontend syntax checks, Python tests, a local browser/DOM smoke check, and independent `kimi-cli` acceptance review.

## Realtime refresh stability design (2026-05-08)

Current root-cause hypothesis:
- `refreshPage()` uses one generic catch path for initial loads and background realtime polls. Any error from `/api/live/overview` or dependent assets calls `renderFailureState(...)`, so a single transient realtime failure can replace the last good realtime page with `Load failed`.
- The request sequence check prevents some stale writes, but there is no state machine distinction between first load, recovered live data, retrying background poll, and terminal failure.
- On the bundled OpenClaw adapter path, the deeper deterministic failure was earlier than the frontend state machine: `build_payload_from_sources()` assumed `gateway_call_status.sessions`, `gateway_call_status.sessions.recent`, and `gateway_status.service` always had dict/list shapes. During refresh/startup those values can be `null`, `[]`, or otherwise temporarily empty while OpenClaw is still warming its live gateway/session surfaces, which caused `/api/live/overview` to throw on every retry.
- The current repo still has one more deterministic backend crash after those adapter guards: `clawobserver/runtime.py` still assumes the top-level `payload["sessions"]` object is always a dictionary. When the configured runtime command or runtime JSON returns `{"sessions": null}`, `_normalize_payload()` raises before the frontend can render a recoverable waiting state.

Design direction:
- Introduce explicit realtime load state: last successful payload/render timestamp, consecutive failure count, current request sequence, and whether a realtime view has rendered at least once.
- Split initial-load failure handling from background-poll failure handling.
- Preserve the last good realtime DOM on background failures and update only the status pill / inline transient warning.
- Treat stale/obsolete request failures as no-ops.
- Validate payload shape before rendering; invalid first payload may be fatal, invalid later payload should be treated as transient while preserving last good view.
- Schedule bounded retries for transient realtime failures instead of parking permanently in `Load failed`.
- Normalize recoverable backend waiting shapes into an honest live payload with empty totals / waiting capture status so the first screen can render while the gateway/session substructures are still warming up.
- Extend that normalization one layer later in the pipeline as well: `LiveRuntimeAdapter._normalize_payload()` must treat malformed/null top-level containers as a waiting snapshot instead of dereferencing them.

Testing strategy:
- Node/vm tests around `refreshPage()` with fake DOM, fake timers, and programmable fetch responses.
- Adapter tests should cover waiting gateway/session shapes that previously threw before any frontend retry could succeed.
- Runtime/server tests should cover the proved `sessions: null` crash path so `/api/live/overview` returns HTTP 200 waiting JSON instead of HTTP 503.
- Tests should cover: page refresh initial success, initial transient failure then recovery, background poll failure preserving prior DOM, stale failure after newer success, malformed payload behavior, and a first payload marked `capture_status: "waiting"` that still renders the Realtime scene instead of `Load failed`.

## Realtime production runtime fail-soft design (2026-05-08)

Kimi audit found the remaining root cause is the live data pipeline, not the scene renderer.

Design:
- Add bounded command execution in `scripts/openclaw_runtime_adapter.py` for OpenClaw CLI calls. Treat `sessions` as the most valuable source; gateway call/status failures should be represented as degraded/waiting payload fields rather than crashing the whole adapter.
- Add bounded runtime command execution in `clawobserver/runtime.py`. On timeout, non-zero exit, or malformed JSON, construct a valid `RuntimeSnapshot` from a minimal waiting payload with source/error metadata, and keep that outer timeout budget below the frontend's 4s `/api/live/overview` abort so the first waiting frame can render.
- Add broad but controlled API error handling in `clawobserver/server.py` for live runtime collection failures so clients receive JSON instead of an empty socket close.
- Add frontend timeout support around `fetchJson()` for realtime requests using `AbortController`, ensuring each retry has a bounded duration.
- Keep `Load failed` only for exhausted first-load attempts; subsequent polls preserve the last good snapshot.

Testing:
- Unit-test adapter command failure paths without invoking real OpenClaw.
- Unit-test runtime command timeout/non-zero/invalid JSON fallback, including an elapsed-time contract proving the live endpoint's fail-soft path completes before the browser's 4s timeout budget.
- Unit-test server `/api/live/overview` response when app collection raises.
- VM-test frontend hanging fetch timeout so failure happens in bounded time rather than backend-duration time, and VM-test a delayed waiting payload that arrives just under the timeout and still renders the first Realtime frame.
- Retain existing 28-test validation and HTTP fixture smoke checks.
