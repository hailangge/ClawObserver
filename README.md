# ClawObserver

ClawObserver is a lightweight, runtime-first monitoring application for OpenClaw. It serves a local web UI for current runtime state, archives sampled snapshots into SQLite, and deploys as a user-level `systemd` web service plus capture timer.

It is not a general observability stack. It does not ship a metrics backend, log explorer, trace store, or minute-resolution history.

The product scope and implementation record live in:

- `specification/requirements.md`
- `specification/design.md`
- `specification/tasks.md`

## Architecture

ClawObserver keeps live and historical data separate on purpose:

1. Live views read current runtime state from an OpenClaw adapter.
2. Historical views read archived snapshots from a local SQLite database.
3. A user-level `systemd` timer runs archive capture every 30 minutes.
4. The same Python app serves the Realtime, History, and Token Statistics pages.

This avoids pretending that a 30-minute archive can reproduce minute-level telemetry.

## Prerequisites

- Linux with `systemd --user`
- Python 3.12 or newer
- A checkout of this repository on the target host
- For real OpenClaw data, a working `openclaw` CLI in `PATH` or at `~/.npm-global/bin/openclaw`

## Installation

The primary operator entrypoint is:

```bash
./scripts/install.sh
```

What it does:

- renders `deploy/systemd/clawobserver.service` into `~/.config/systemd/user/clawobserver.service`
- renders `deploy/systemd/clawobserver-capture.service` into `~/.config/systemd/user/clawobserver-capture.service`
- installs `deploy/systemd/clawobserver-capture.timer` into `~/.config/systemd/user/clawobserver-capture.timer`
- creates `~/.config/clawobserver/clawobserver.env` on first install
- preserves an existing env file on reruns
- runs `systemctl --user daemon-reload`
- enables and starts `clawobserver.service`
- enables and starts `clawobserver-capture.timer`
- prints status, journal, timer, and management commands

Compatibility wrappers:

- `./scripts/deploy.sh` forwards to `./scripts/install.sh`
- `./scripts/install_user_service.sh` forwards to `./scripts/install.sh`

After install, the default local URL is:

```text
http://127.0.0.1:8420/
```

## Configuration

The installed env file is:

```text
~/.config/clawobserver/clawobserver.env
```

Important settings:

- `CLAWOBSERVER_HOST`
- `CLAWOBSERVER_PORT`
- `CLAWOBSERVER_REFRESH_SECONDS`
- `CLAWOBSERVER_ARCHIVE_CADENCE_MINUTES`
- `CLAWOBSERVER_DATA_DIR`
- `CLAWOBSERVER_DATABASE_PATH`
- `CLAWOBSERVER_RUNTIME_COMMAND`
- `CLAWOBSERVER_RUNTIME_JSON`

Default runtime source precedence:

1. `CLAWOBSERVER_RUNTIME_COMMAND`
2. `CLAWOBSERVER_RUNTIME_JSON`
3. Built-in demo payload

The shipped env template points `CLAWOBSERVER_RUNTIME_COMMAND` at:

```text
/usr/bin/env python3 <repo>/scripts/openclaw_runtime_adapter.py
```

The template also defaults automatic refresh to `30` seconds, matching the frontend minimum auto-refresh floor.

## Service And Timer Management

Installed units:

- `clawobserver.service`
- `clawobserver-capture.service`
- `clawobserver-capture.timer`

Common commands:

```bash
systemctl --user status clawobserver.service
systemctl --user status clawobserver-capture.timer
systemctl --user list-timers clawobserver-capture.timer
systemctl --user restart clawobserver.service
systemctl --user stop clawobserver.service
systemctl --user start clawobserver.service
systemctl --user start clawobserver-capture.service
systemctl --user stop clawobserver-capture.timer
systemctl --user start clawobserver-capture.timer
journalctl --user -u clawobserver.service -n 100 --no-pager
journalctl --user -u clawobserver-capture.service -n 100 --no-pager
```

These are user-level units. They run while the user session is active unless lingering is enabled separately on the host.

## Manual Capture

Capture one snapshot without waiting for the timer:

```bash
python3 -m clawobserver capture
```

Or through the installed user unit:

```bash
systemctl --user start clawobserver-capture.service
```

Seed demo history for UI validation:

```bash
python3 -m clawobserver seed-demo --days 7 --interval-minutes 30
```

## Uninstall

Remove the user units while preserving config and archive state by default:

```bash
./scripts/uninstall.sh
```

Optional destructive flags:

- `./scripts/uninstall.sh --purge-config`
- `./scripts/uninstall.sh --purge-state`
- `./scripts/uninstall.sh --purge-all`

Default uninstall behavior:

- stops and disables the web service and capture timer
- stops the one-shot capture service if it is running
- removes the rendered user unit files
- runs `systemctl --user daemon-reload`
- preserves `~/.config/clawobserver/clawobserver.env`
- preserves `~/.local/state/clawobserver/`

## Manual Development

Run the backend directly:

```bash
python3 -m clawobserver serve
```

Run the bundled runtime adapter directly:

```bash
python3 scripts/openclaw_runtime_adapter.py
```

Run backend tests:

```bash
python3 -m pytest
```

Frontend workflow:

```bash
npm --prefix frontend/office-scene-prototype install
npm --prefix frontend/office-scene-prototype test
npm --prefix frontend/office-scene-prototype run build
```

The built frontend bundle is emitted into `clawobserver/static/prototype/`.

## Validation

Useful local validation commands:

```bash
bash -n scripts/install.sh scripts/uninstall.sh scripts/deploy.sh scripts/install_user_service.sh scripts/systemd_user_common.sh
python3 -m pytest
node --check clawobserver/static/app.js
```

If you change the embedded scene or prototype bundle, also rerun:

```bash
npm --prefix frontend/office-scene-prototype test
npm --prefix frontend/office-scene-prototype run build
npm --prefix frontend/office-scene-prototype run smoke:browser
```

## Runtime Adapter Behavior

`scripts/openclaw_runtime_adapter.py` is the bundled conservative OpenClaw adapter. It:

- reads OpenClaw session/runtime data
- reads the on-disk delivery queue from `~/.openclaw/delivery-queue/` and `~/.openclaw/delivery-queue/failed/`
- derives active versus idle sessions from stable runtime fields
- aggregates per-agent totals and token counters
- classifies Persistent vs One-Shot sessions conservatively from stable session-key conventions when a first-class mode field is unavailable
- reports delivery queue depth as `delivery_queue_pending` and `delivery_queue_failed`
- reports gateway totals conservatively
- emits `gateways.exits_today` from structured runtime data when available, otherwise from a documented `systemd` journal heuristic on supported Linux hosts

If the delivery queue path is unavailable, the adapter can fall back to other truthful runtime backlog signals instead of inventing queue lanes.

If the real adapter is not usable yet, either:

- set `CLAWOBSERVER_RUNTIME_JSON` to a fixture file
- remove both runtime overrides and use built-in demo data

## Archive Cadence Semantics

- The shipped timer uses `OnCalendar=*:0/30`.
- `current_day` history shows every archived point for that day.
- Multi-day ranges use the last archived record from each day.
- Token statistics also use the latest archived record per day because the source counters reset daily.

Operationally:

- history can be empty right after install until the first successful capture runs
- `systemctl --user start clawobserver-capture.service` forces an initial sample
- multi-day charts are daily summaries, not minute-resolution traces

## Data Paths

Default operator-visible paths:

- `~/.config/clawobserver/clawobserver.env`
- `~/.config/systemd/user/clawobserver.service`
- `~/.config/systemd/user/clawobserver-capture.service`
- `~/.config/systemd/user/clawobserver-capture.timer`
- `~/.local/state/clawobserver/`
- `~/.local/state/clawobserver/clawobserver.sqlite3`

Repo-local implementation paths:

- `deploy/systemd/` for unit and env templates
- `scripts/` for install, uninstall, deploy wrappers, and the runtime adapter
- `frontend/office-scene-prototype/` for the embeddable scene source
- `clawobserver/static/prototype/` for the built frontend bundle served by the Python app

## Realtime Scene And Assets

The production Realtime page at `/` embeds the repo-local office scene bundle. The scene keeps a stable renderer-facing `AgentVisualState[]` contract and exactly 12 fixed workstation slots for the current MVP.

Asset and provenance notes:

- repo-local Kenney office assets ship under `frontend/office-scene-prototype/public/office-assets/kenney/`
- provenance metadata is recorded in `frontend/office-scene-prototype/public/office-assets/kenney/provenance.json`
- Kenney license text ships in `frontend/office-scene-prototype/public/office-assets/kenney/licenses/Kenney-Furniture-Kit-CC0.txt`
- preview/avatar and WorkAdventure-derived assets ship with their own repo-local provenance and license files under `frontend/office-scene-prototype/public/office-assets/`
- runtime delivery stays offline and deterministic after local install; the app does not rely on live third-party asset fetches

## Troubleshooting

If install fails:

- confirm `systemctl --user` works in the current login session
- confirm Python 3.12+ is installed
- rerun `./scripts/install.sh` and read the first failing command

If the UI is unreachable:

- check `systemctl --user status clawobserver.service`
- check the configured host and port in `~/.config/clawobserver/clawobserver.env`
- remember that the default bind is loopback-only

If data is empty or degraded:

- inspect `~/.config/clawobserver/clawobserver.env`
- run `journalctl --user -u clawobserver.service -n 100 --no-pager`
- run `journalctl --user -u clawobserver-capture.service -n 100 --no-pager`
- run `python3 scripts/openclaw_runtime_adapter.py`

If gateway exits today looks unavailable or low:

- run `openclaw gateway status --json`
- run `journalctl --user -u openclaw-gateway.service --since today --no-pager`
- remember that the journal-derived count is a conservative heuristic, not a runtime-native guaranteed counter
