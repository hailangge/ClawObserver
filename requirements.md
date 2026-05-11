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
5. **Queue / backlog state**
   - ClawObserver must prefer the real OpenClaw delivery queue on disk when it is available
   - at minimum the product must expose truthful `delivery_queue_pending` and `delivery_queue_failed` depths from `~/.openclaw/delivery-queue/` and `~/.openclaw/delivery-queue/failed/`
   - if the on-disk queue later exposes trustworthy finer-grained queue lanes, the product may surface them
   - if the delivery-queue path is unavailable and OpenClaw exposes structured runtime queue depth safely, the UI may fall back to that runtime queue data
   - if only a coarse public runtime backlog such as queued system events is available, the UI must present that honest backlog instead of inventing lane depth
6. **Gateway counts**
   - must include total currently known gateways
   - if runtime exposes gateway state safely, may also show per-state counts such as online/offline
   - must include today’s gateway exit count when the runtime or host service metadata can provide it conservatively
   - if today’s exit count is derived from logs or the journal, the product must document that heuristic clearly instead of presenting it as an exact runtime-native counter

### 4.2 Realtime central scene MVP

The Realtime page must keep a central embeddable scene region that presents current agent state through a lightweight 3D office/workstation view.

MVP requirements:
- Use Three.js plus React Three Fiber as the recommended primary rendering route for this scene.
- The React Three Fiber office scene is the production central scene for the Realtime page served at `/`; it is not limited to a prototype-only route.
- Treat the scene as a simple state-presentation engine, not as a game, simulation, or visual-effects showcase.
- Keep MVP desktop-only; mobile support is explicitly out of scope.
- Keep MVP lightweight; do not require shadows, complex post-processing, or complex UI effects.
- Do not use image-batch or state-image generation as the core rendering approach.
- Optional static textures or image assets may be used later, but they are not the core rendering contract.
- The scene layout must include exactly 12 fixed workstation/desk slots in MVP; desk count is not dynamic in this phase.
- The 12 desks must be clustered more tightly than the initial horizontal prototype, with reduced spacing between workstations while still leaving readable aisle/lounge structure.
- The production Realtime page must allocate the scene as the dominant horizontally-filling content area; `SceneStatusSummary` and related scene summary/status copy should sit above the 3D canvas instead of consuming a narrow right column that shrinks the scene.
- Desk-scale content must be large enough to read at normal desktop viewport sizes: desks, monitors, labels, status lamps, and task stacks should be enlarged relative to the room/camera framing instead of appearing as tiny distant objects.
- Final 3D styling direction must reference `clawobserver/static/assets/static_scene.jpg` and include both a work area and a rest/lounge area region.
- The rest/lounge area may be visually simple in MVP, but it must exist as a reserved scene region for Phase 2 person/task/status expansion.
- The MVP scene vocabulary is limited to: office shell, workstations/desks, monitors/screens, status lamps, task/file stacks, labels/nameplates, a global status board, basic open-source/static office props, and basic hover/click interactions.
- The production scene should more closely match the warmth, geometry, and human-friendly skeuomorphic office feel of `static_scene.jpg` while remaining lightweight and reliable.
- The current implementation should prefer a small curated repo-local subset of permissively licensed open-source office models for desks, chairs, monitor gear, plants, lounge furniture, and bookcases when a deterministic redistribution path is available.
- Any adopted asset must be repo-local, license-documented, provenance-documented with exact upstream archive/file identity, deterministic/offline at runtime, and compatible with production bundling.
- The scene must keep primitive fallbacks behind the same component seam so future asset failures or swaps do not change the live data contract or blank the scene.
- People, avatars, and agent-behavior animation are explicitly Phase 2 and out of MVP scope, but the scene contract must reserve extension points for them.

Data contract requirements:
- The scene component must accept a stable data protocol that is independent of OpenClaw runtime internals.
- OpenClaw-specific data must be adapted through a separate adapter layer into `AgentVisualState[]`.
- The scene renderer must not know OpenClaw runtime command structure, response shape, or storage details.
- The scene must remain embeddable inside the existing web dashboard rather than becoming a separate application shell.
- The scene configuration must define a constant for exactly 12 fixed workstation slots for MVP placement and interaction.

`AgentVisualState` must be defined with at least:
- `id`
- `name`
- `status`: `idle | busy | error | offline`
- `taskCount`
- `currentTask`
- `errorMessage`
- `updatedAt`
- optional `avatarState` reserved for Phase 2

Required visual mappings:
- `idle` => green, low-brightness, normal desk presentation
- `busy` => blue highlighted monitor plus visible task/file stack
- `error` => red lamp or alert treatment; simple blink is optional
- `offline` => greyed desk with monitor off
- degraded or waiting global runtime states must be reflected honestly through the global board, desk emptiness, and detail copy rather than demo-invented activity
- `taskCount` must map to a capped number of visible task/file blocks; the renderer must never create unbounded objects from raw counts
- interactions are limited to hover highlight plus name, and click selection plus detail panel

### 4.3 Historical archive views

The product must provide a historical page grounded in the audited dashboard definitions and later verified overview additions.

Required historical panels:

1. **Session Statistics**
   - total sessions
   - active sessions
   - idle sessions
   - this may subsume a standalone Active Sessions chart if that produces a cleaner historical view
2. **Active Sessions by Agent**
3. **Session State**
4. **Agent Activity Statistics**
5. **Queue / Backlog State**
   - archive the real delivery-queue depth from disk when available, at minimum as pending and failed item counts
   - use finer-grained lane depth only when the live/archive source actually exposes it truthfully
   - otherwise show the truthful backlog metric that is available instead of inventing queue lanes
6. **Session Type Comparison**
   - compare Persistent vs One-Shot session totals
   - a right-side pie chart for the latest archived point is acceptable
7. **Gateway Reliability**
   - must include historical snapshots of the gateway exit count for the selected range
8. **Token Throughput per day by Model / Provider / Channel**
9. **Agent Session Count**

Historical interpretation rules:
- If the archive cadence is 30 minutes, panels must present 30-minute sampled state rather than pretending to be 15-minute or minute-resolution telemetry.
- Current-day views may show each archived point for that day.
- Multi-day and multi-month comparison views must use only the last archived sample of each day.
- Time must remain on the X-axis.
- Separate data objects must remain separate series instead of being flattened into a single aggregate unless the panel is explicitly an aggregate KPI.

### 4.4 Dedicated token statistics page

The product must provide a historical statistics page focused on token usage.

Required outputs for the selected range:
- total input tokens
- total output tokens
- token cache-hit ratio when archived `cacheRead` / `cacheWrite` counters are present
- provider distribution
- model distribution
- channel distribution if the source data includes channel

Token aggregation rules:
- use each day’s last archived record because counters reset daily
- current-day totals use the latest archived record available for the current day
- cross-day totals sum daily end-of-day values over the selected range
- if cache counters are unavailable from the runtime/archive source, the UI must label cache-hit ratio as unavailable rather than substituting zero

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
- the central Realtime scene should read as a clean operational workspace rather than a toy or a cinematic setpiece
- the 3D scene should emphasize state legibility and embedding practicality over rendering spectacle
- the header should include reliable branded ClawObserver artwork using an OpenClaw-style lobster with a magnifying glass and an enlarged magnified eye
- historical charts must render visible Y-axis labels and shared mouse-hover tooltips that show every series value at the hovered X bucket

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
7. Historical charts show visible Y-axis numeric labels and shared mouse-hover tooltips that reveal every series value at the hovered X bucket.
8. The UI follows the approved deep-tech minimal style direction, including branded ClawObserver header artwork.
9. The Realtime page keeps a central visualization area as the main agent-work scene instead of flattening that view into ordinary cards.
10. The main Realtime scene served at `/` is a minimal state-driven 3D office/workstation presentation built around Three.js plus React Three Fiber, replacing the prior static-image center scene area.
11. The scene accepts a stable renderer-facing `AgentVisualState[]` contract that remains independent of OpenClaw runtime internals.
12. OpenClaw runtime data reaches the scene only through a separate adapter layer; the scene renderer does not know OpenClaw-specific command or payload details.
13. The MVP scene supports only the approved minimal object set: office shell, desks/workstations, monitors, status lamps, capped task/file stacks, labels/nameplates, global status board, and basic hover/click interaction.
14. The status mapping is explicit and consistent: `idle` green/low-brightness desk, `busy` blue highlighted monitor plus task stack, `error` red alert treatment, `offline` greyed desk with monitor off.
15. `taskCount` renders through a capped visible stack rule rather than unbounded object creation.
16. Interaction scope is limited to hover highlight/name and click selection/detail panel for MVP.
17. The scene remains desktop-only for MVP; mobile support is deferred.
18. The MVP omits shadows and complex UI/rendering effects.
19. Images are not the core rendering route; optional static textures/assets may be layered later without changing the main scene contract.
20. The design reserves extension points for future avatar/person rendering through optional `avatarState`, but avatars and behavior remain Phase 2 and out of MVP scope.
21. The implementation remains lightweight enough to be a credible alternative to the prior SigNoz setup.
22. Public-repo deployment documentation stays consistent with the actual script-first user-level `systemd` install flow.
23. Validation must include real browser loading of the production `/` Realtime page with zero console errors, zero page errors, zero failed requests, screenshot artifacts under `tmp/`, and proof that live `/api/live/overview` data changes visible scene and summary state.

## 10. Open questions

These should be resolved conservatively during implementation:

1. What exact OpenClaw runtime command/API is the canonical live source for gateway state counts?
2. Will a future OpenClaw delivery-queue format or runtime/CLI surface expose trustworthy finer-grained queue lanes beyond the currently validated pending/failed on-disk queue counts?
3. Does channel always exist for token accounting, or must the UI gracefully omit that breakdown?
4. Are gateway historical error/start counts available from the runtime, or should they stay optional and hidden by default?
5. Should OpenClaw expose a first-class gateway exits-today counter so ClawObserver can retire the journal heuristic where it is currently needed?
6. Which minimal scene-store contract should own hover/selection state for the embeddable R3F scene?
7. How many workstation slots should the MVP office shell support before layout/config generalization is required?

## 11. Focused repair: Realtime hanging tags and agent status (2026-05-07)

This repair is intentionally limited to the ClawObserver Realtime scene. It must not redesign unrelated UI.

Functional requirements:
- Hanging tags/nameplates in the Realtime scene must show the correct agent identity and that agent's current parallel task count.
- A tag for an idle agent must remain attached to that agent's canonical workstation and display `0`, not another agent's count or a stale active count.
- Lounge/resting visual placement must not cause the agent's workstation tag to appear under the wrong identity.
- Agent status text/metadata shown in scene hover cards and scene DOM state must match runtime state: active agents are Working, idle agents are Idle/resting, unassigned anchors are Unassigned.
- The status derivation must use live per-agent runtime fields conservatively, with `active_sessions > 0` treated as working and `active_sessions === 0` treated as idle/resting.
- Realtime scene anchor geometry must come from the measured `clawobserver/static/reference-scene-layout.json` contract rather than ad-hoc CSS coordinates, and that contract must include the background image, workstation tag boxes, workstation character boxes, lounge area, and lounge slots.
- The renderer must normalize measured image-pixel coordinates from the real `static_scene.jpg` asset into responsive percentage-based placement before rendering scene overlays.
- Active/working agents must render at configured workstation slots, idle/resting agents must render only in configured lounge slots, and unassigned workstation slots must remain visually empty while still being able to show placeholder tags.
- Role/style presentation must remain configured through `clawobserver/static/scene-role-styles.json`, separate from the scene geometry contract.
- The fix must preserve the current reference-image scene layout, existing configurable role/agent presentation contract, and scope boundaries.

Acceptance criteria for this repair:
- Local tests or a browser/DOM smoke check demonstrate that configured agents keep their intended tag identity/count across mixed active/idle payloads.
- Local tests or a browser/DOM smoke check demonstrate that scene status labels and DOM state agree with the live payload for active, idle, and unassigned slots.
- Local tests or a browser/DOM smoke check demonstrate that the loaded layout config matches the measured reference-scene tag/desk boxes and that pixel-space measurements are normalized into the expected percentage anchors.
- Local tests or a browser/DOM smoke check demonstrate that idle agents do not remain seated at desks and instead render only in configured lounge slots while their desk anchors stay empty/placeholder-capable.
- `node --check clawobserver/static/app.js` and relevant Python/unit tests pass.
- Independent `kimi-cli` validation reviews the final diff and verification evidence before completion.

## 12. Focused repair: Realtime refresh must not fall into false Load failed (2026-05-08)

This repair is limited to the ClawObserver Realtime page loading/refresh stability. It must not redesign unrelated UI.

Observed behavior to reproduce:
- Refreshing or re-entering the Realtime page can display `Load failed` even when the failure is transient or recoverable.
- The current frontend treats any failed realtime fetch/poll as fatal and replaces the page with the generic failure panel.
- In the current live repo state, `/api/live/overview` can still fail deterministically before the frontend retry logic matters when `clawobserver/runtime.py` normalizes a runtime payload containing `{"sessions": null}`. `LiveRuntimeAdapter._normalize_payload()` dereferenced `sessions.get(...)`, raised `AttributeError: 'NoneType' object has no attribute 'get'`, and the server returned HTTP 503 instead of an honest waiting payload.

Functional requirements:
- Initial Realtime load should only show `Load failed` for unrecoverable errors after reasonable retry/diagnostic handling; transient interface jitter must keep a loading/retrying state.
- After a successful Realtime payload has rendered, subsequent polling failures must not replace the last good view with `Load failed`. The UI should keep the last good snapshot visible and show a degraded/retrying status.
- Refresh/re-entry/navigation races must not allow stale request failures to overwrite newer successful Realtime renders.
- Realtime loading must handle short API failures, aborted/obsolete requests, delayed style JSON, malformed/incompatible live payloads, and poll timing without false fatal failure states.
- Realtime loading must also treat recoverable backend waiting/empty states as non-fatal first-frame payloads rather than endpoint crashes.
- Explicitly null or malformed top-level live containers such as `sessions`, `queues`, `gateways`, or `tokens` must degrade to a truthful `capture_status: "waiting"` snapshot instead of crashing the live endpoint.
- Any real unrecoverable error should expose a clear status/message and retry path.

Validation requirements:
- Add/update frontend logic tests for initial load retry, post-success polling failure, stale request failure suppression, and successful recovery after failure.
- Add/update backend tests that reproduce the `sessions: null` runtime normalization crash and verify `/api/live/overview` stays HTTP 200 with a waiting payload after the repair.
- Run local unit tests and syntax checks.
- Perform browser-level or equivalent DOM-level validation for page refresh and continued realtime updates when practical.

## 13. Focused repair: Realtime production runtime command must fail soft (2026-05-08)

Owner validation and Kimi audit confirmed the Realtime page is still not fully fixed when ClawObserver uses the production runtime command.

Observed failure chain:
- `/api/live/overview` runs `CLAWOBSERVER_RUNTIME_COMMAND`, which invokes `scripts/openclaw_runtime_adapter.py`.
- The adapter currently calls OpenClaw CLI commands without bounded timeouts and treats command failure as fatal.
- `openclaw gateway call status --json` can time out / exit non-zero while the rest of runtime data is still recoverable.
- `LiveRuntimeAdapter._load_payload()` runs the command with `check=True` and no timeout, so the HTTP request can hang then raise.
- `clawobserver/server.py` only catches `ValueError`, so subprocess/runtime failures drop the HTTP connection instead of returning a controlled JSON response.
- The frontend has no per-request fetch timeout, so each retry waits on the whole backend hang and eventually cycles into `Load failed`.
- Real 8420 validation after those guards showed one remaining contract bug on the production path: the backend runtime-command fail-soft path still waited about 5.05s before returning a valid waiting payload, while `clawobserver/static/app.js` aborts `/api/live/overview` after `LIVE_FETCH_TIMEOUT_MS = 4000`. First-load realtime therefore still landed in `Load failed` even though the backend response body was recoverable.

Requirements:
- Production Realtime endpoint must return a bounded response time even if OpenClaw gateway calls hang/fail.
- The bounded backend response time for `/api/live/overview` must stay below the frontend's 4s live fetch timeout so the first waiting payload can reach the browser.
- `scripts/openclaw_runtime_adapter.py` must tolerate optional gateway command failures by returning a valid payload with `capture_status: "waiting"` / degraded metadata where possible.
- `LiveRuntimeAdapter` must bound runtime command execution and convert command timeout/failure/invalid JSON into a recoverable live snapshot, not an unhandled request crash.
- `server.py` must never drop `/api/live/overview` with an empty reply for expected runtime collection failures; it should return controlled JSON and status semantics.
- Frontend realtime fetches must have a client-side timeout/abort so retries are not hostage to long backend hangs.
- Tests must cover runtime command timeout/failure, adapter command failures, server controlled response, frontend hanging fetch timeout, and existing happy/waiting paths.
