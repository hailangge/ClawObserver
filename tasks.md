# Tasks

## In progress

- [x] Restore the real OpenClaw data chain so Realtime and archive capture stop writing empty/waiting-only snapshots when bounded local session stores are available (`scripts/openclaw_runtime_adapter.py`, `clawobserver/runtime.py`, `clawobserver/app.py`).
- [x] Prove the true chain split: frontend, archive schema, timer, and SQLite insertion were healthy; the empty-today failure came from the runtime adapter's hanging all-agents/gateway collection path zeroing the upstream snapshot before archive capture (`tasks.md`, live validation).
- [x] Reconnect Phase A historical restoration and Phase B live OpenClaw data collection with regression tests covering local-store-primary sessions plus degraded gateway/all-agents failures (`tests/test_openclaw_runtime_adapter.py`, `tests/test_runtime.py`, `tests/test_server.py`, `tests/test_archive.py`).
- [x] Reproduce and document the actual Realtime refresh failure chain, including the backend `/api/live/overview` waiting-shape crash (`scripts/openclaw_runtime_adapter.py`, tests, spec docs).
- [x] Explain and verify why retries remained ineffective before the fix: the adapter hit the same deterministic nested-shape exception on every request before any first successful payload existed.
- [x] Fix the core cause in code by normalizing recoverable gateway/session waiting shapes into a valid live payload instead of throwing (`scripts/openclaw_runtime_adapter.py`).
- [x] Add/update tests that cover the root cause and repaired first-screen refresh path, not just retry behavior (`tests/test_openclaw_runtime_adapter.py`, `tests/test_realtime_scene_logic.py`).
- [x] Reproduce the still-open live failure in the current repo state: `clawobserver/runtime.py` crashes on `sessions: null`, which makes `/api/live/overview` return 503 and drives first-load `Load failed`.
- [x] Fix `clawobserver/runtime.py` normalization so null/malformed top-level runtime containers degrade to `capture_status: "waiting"` instead of throwing.
- [x] Add regression coverage for the repaired runtime/server path (`tests/test_runtime.py`, `tests/test_server.py`).
- [x] Extend the runtime/server guard to malformed top-level live payloads and invalid `captured_at`, which still bypassed waiting-state normalization and could keep `/api/live/overview` on the 503 path (`clawobserver/runtime.py`, `tests/test_runtime.py`, `tests/test_server.py`).
- [x] Add bounded/fail-soft OpenClaw CLI command handling in `scripts/openclaw_runtime_adapter.py`.
- [x] Add bounded/fail-soft runtime command handling in `clawobserver/runtime.py`.
- [x] Add controlled live API error response handling in `clawobserver/server.py`.
- [x] Add frontend realtime fetch timeout handling in `clawobserver/static/app.js`.
- [x] Add tests for adapter command failure, runtime command timeout/failure, server controlled response, and frontend hanging fetch timeout.
- [x] Fix the real 8420 timeout-contract mismatch: backend runtime-command fail-soft now returns before the frontend's 4s live abort so first-load waiting payloads can render.
- [x] Add regression coverage for the 8420 timeout contract and a delayed first waiting payload reaching the Realtime scene.
- [x] Re-run unit, syntax, compile, HTTP smoke, and production-like runtime failure validation.
- [x] Run local unit/syntax checks and browser/DOM-level validation for Realtime refresh, first load, continued updates, and short recovery.
- [x] Repair Realtime scene model/tag/status logic for mixed active/idle agents (`clawobserver/static/app.js`, `tests/test_realtime_scene_logic.py`)
- [x] Validate locally with syntax/unit/browser-or-DOM smoke checks (`clawobserver/static/app.js`, `tests`)
- [x] Run independent Kimi acceptance review (`kimi-cli`) — **accepted 2026-05-08**
- [x] Record concise result and key validation in workspace memory (`/mnt/data/workspace-se-codex/memory/2026-05-08.md`)
- [x] Fix Realtime hanging-tag placeholder rendering so waiting/unassigned desks still show explicit tag label/count instead of dropping tag DOM (`clawobserver/static/app.js`, `tests/test_realtime_scene_logic.py`)
- [x] Validate hanging-tag regression with targeted DOM-string tests plus JavaScript syntax check (`tests/test_realtime_scene_logic.py`, `node --check clawobserver/static/app.js`)
- [x] Phase A: restore historically normal non-empty Realtime behavior by preventing all-agents CLI failure from collapsing the page into an empty/waiting shell (`scripts/openclaw_runtime_adapter.py`, `tests/test_openclaw_runtime_adapter.py`, `tests/test_realtime_scene_logic.py`)
- [x] Phase B: connect truthful OpenClaw realtime session data from bounded local runtime sources by rebuilding all-agent session payloads from `~/.openclaw/agents/*/sessions/sessions.json` and merging fast CLI data when available (`scripts/openclaw_runtime_adapter.py`, `tests/test_openclaw_runtime_adapter.py`)
- [x] Validate the repaired real runtime path end-to-end with the production adapter command and confirm non-empty `openclaw-cli-runtime` payloads despite degraded gateway/all-agent commands

## Done
- [x] Confirm focused scope: only ClawObserver Realtime hanging-tag display and agent status display
- [x] Update SPEC docs for the focused 2026-05-07 repair (`requirements.md`, `design.md`, `tasks.md`)

## Notes
- Phase A historical restoration finding on 2026-05-08: archive history, SQLite schema, archive reads, and the user `systemd` timer/service chain remained healthy. The database still accumulated snapshots every 30 minutes and prior days retained non-empty totals, so the historical path did not need schema/timer repair.
- Phase B real-data connection finding on 2026-05-08: the break was in the live runtime adapter source chain. `scripts/openclaw_runtime_adapter.py` began with `openclaw sessions --all-agents --json`, which hangs on the current host, and gateway status calls can also hang/fail. That combination exhausted the outer runtime-command timeout and replaced real OpenClaw local session-store data with empty waiting payloads, which then propagated unchanged through `/api/live/overview`, `clawobserver capture`, and today's archive rows.
- Phase B repair on 2026-05-08: the adapter now treats `~/.openclaw/agents/*/sessions/sessions.json` as the primary real source for all-agent sessions, token counters, and agent metadata; bounded CLI calls are now optional best-effort enrichments instead of the gate for all live data. Gateway failures now produce truthful degraded status/reasons without erasing real session totals or delivery-queue depth.
- Deployment/timer finding on 2026-05-08: the installed user units and env file already pointed both web and capture services at the repo runtime adapter and the correct SQLite path. No `systemd` unit or env-file changes were required for the fix.
- Current focused session starts from the live repository state and ignores prior failed reasoning tracks.
- Do not expand into unrelated UI redesign.
- Additional verification on 2026-05-08 found two remaining backend escape hatches after the earlier `sessions: null` fix: a non-object top-level runtime payload (for example a JSON list) raised `AttributeError` in `LiveRuntimeAdapter._normalize_payload()`, and an invalid `captured_at` raised `ValueError` in `_parse_timestamp()`. Both now degrade to HTTP 200 `capture_status: "waiting"` live payloads instead of falling through to the server's controlled 503 error wrapper.
- Additional real-instance verification on 2026-05-08 found the still-live 8420 failure was not another payload-shape crash. `/api/live/overview` returned HTTP 200 waiting JSON, but only after about 5.05s because `clawobserver/runtime.py` allowed the configured runtime command to run for 5s while the browser aborts live fetches after 4s. The repair is to keep the backend fail-soft budget under that 4s client deadline.
- Additional real-instance verification on 2026-05-08 confirmed the true current root cause after the timeout-contract fix: `/usr/bin/env python3 /mnt/data/repositories/ClawObserver/scripts/openclaw_runtime_adapter.py` still depended on `openclaw sessions --all-agents --json`, which timed out and forced the adapter to emit a generic zero-session waiting payload even though local OpenClaw session stores remained readable and non-empty.
- Phase A historical baseline is still the non-empty demo/runtime payload from `build_demo_payload()` in `clawobserver/runtime.py` across `v0.1.0`, `v0.2.0`, `v0.2.1`, and `8b5bab9`, which populated session overview totals, per-agent counts, session states, session types, queues, gateways, and token rows.
- Phase B validation on 2026-05-08 after the repair:
  `python3 scripts/openclaw_runtime_adapter.py` returned `capture_status: "waiting"` but with `sessions.total = 91`, `sessions.active = 3`, per-agent rows including `main`, `media-manager`, and `se-codex`, plus truthful queue rows from `~/.openclaw/delivery-queue`.
  `CLAWOBSERVER_RUNTIME_COMMAND='/usr/bin/env python3 /mnt/data/repositories/ClawObserver/scripts/openclaw_runtime_adapter.py' python3 - <<'PY' ... app.live_overview_payload() ... PY` returned `source_version: "openclaw-cli-runtime"`, `total_sessions = 91`, `active_sessions = 3`, `agent_count = 10`, non-empty `queue_lanes`, and degraded-but-honest gateway counts instead of the prior empty shell.
