# ClawObserver

ClawObserver is a lightweight, runtime-first monitoring application for OpenClaw. It keeps the approved OpenClaw monitoring scope, replaces the prior heavy SigNoz deployment path with a small host-native Python service, and stores low-frequency historical snapshots in a local SQLite database.

This repository contains both the runnable implementation and the internal product documents that define its scope and operating model.

## What ClawObserver is

ClawObserver is designed for operators who need:

- a local dashboard for current OpenClaw runtime state
- a small historical archive collected on a 30-minute cadence
- token usage rollups based on archived daily counters
- a deployment model that stays close to the host by using Python plus user-level `systemd`

It is not a general observability platform. It does not ship a metrics backend, log explorer, or trace system.

## Architecture

ClawObserver intentionally separates live state from history:

1. The live path reads current runtime state on demand from an OpenClaw runtime adapter.
2. The archive path stores normalized snapshots in SQLite.
3. The web UI serves both the realtime overview and the archive-backed historical pages from the same local process.
4. A `systemd --user` timer triggers archive capture every 30 minutes.

This split matters because a 30-minute archive cannot honestly reproduce minute-level historical telemetry. ClawObserver keeps the semantics explicit instead of replaying archive data as if it were live.

## Features and scope

The current implementation covers the approved monitoring scope:

- realtime overview of total sessions, active sessions, derived idle sessions, queue depth, per-agent session counts, gateway counts, and today’s gateway exit count
- historical overview panels derived from archived snapshots, including gateway reliability history
- token statistics based on daily end-of-day archive selection
- local SQLite storage with no external database dependency
- host-native user-level `systemd` deployment
- branded header artwork and operator-oriented historical charts with visible Y-axis labels plus hover tooltips

The internal scope documents remain in this repo:

- `requirements.md` for product scope and acceptance criteria
- `design.md` for architecture, storage, and deployment design
- `tasks.md` for implementation milestones and validation notes

## Prerequisites

ClawObserver is intentionally small, but operators should have the following available on the target host:

- Linux with `systemd --user`
- Python 3.12 or newer
- a working OpenClaw runtime source if you want real data
- access to the repository checkout on the target machine

For the bundled runtime adapter, the expected real-data prerequisite is the `openclaw` CLI in `PATH` or at `~/.npm-global/bin/openclaw`.

## Quick start

For a local manual run from the repository root:

```bash
python3 -m clawobserver serve
```

Open the default local URL:

```text
http://127.0.0.1:8420/
```

The UI header ships with a bundled ClawObserver logo: an OpenClaw-style lobster holding a magnifying glass with an enlarged magnified eye. The visual direction stays deep-tech and restrained rather than decorative.

Capture one archive snapshot manually:

```bash
python3 -m clawobserver capture
```

Seed demo history for UI validation:

```bash
python3 -m clawobserver seed-demo --days 7 --interval-minutes 30
```

Useful environment overrides for manual runs:

- `CLAWOBSERVER_RUNTIME_COMMAND`: command that prints runtime JSON
- `CLAWOBSERVER_RUNTIME_JSON`: path to a JSON payload file
- `CLAWOBSERVER_DATABASE_PATH`: SQLite archive location
- `CLAWOBSERVER_HOST`: bind address, default `127.0.0.1`
- `CLAWOBSERVER_PORT`: listen port, default `8420`

If no runtime command or runtime JSON file is configured, the app falls back to a built-in demo payload generator.

## Deployment via script

The primary deployment entrypoint for operators is:

```bash
./scripts/deploy.sh
```

That script keeps the existing host-native deployment model and performs the recommended user-level install/start flow:

- renders `deploy/systemd/clawobserver.service` into `~/.config/systemd/user/`
- renders `deploy/systemd/clawobserver-capture.service` into `~/.config/systemd/user/`
- installs `deploy/systemd/clawobserver-capture.timer`
- creates `~/.config/clawobserver/clawobserver.env` from the repo template if it does not already exist
- preserves an existing env file on reruns
- runs `systemctl --user daemon-reload`
- enables and starts `clawobserver.service`
- enables and starts `clawobserver-capture.timer`
- prints the local access URL plus the most useful status and journal commands

Compatibility note:

- `./scripts/install_user_service.sh` still exists, but it now forwards to `./scripts/deploy.sh`

## Installed units and files

The script installs or references these operator-visible artifacts:

- `clawobserver.service`: long-running local web UI and API process
- `clawobserver-capture.service`: one-shot archive capture command
- `clawobserver-capture.timer`: 30-minute archive schedule
- `~/.config/clawobserver/clawobserver.env`: runtime configuration
- `~/.local/state/clawobserver/clawobserver.sqlite3`: archive database

The default env template points `CLAWOBSERVER_RUNTIME_COMMAND` at the bundled adapter:

```text
scripts/openclaw_runtime_adapter.py
```

## Service management commands

Common operator commands:

```bash
systemctl --user status clawobserver.service
systemctl --user status clawobserver-capture.timer
systemctl --user restart clawobserver.service
systemctl --user stop clawobserver.service
systemctl --user start clawobserver.service
systemctl --user start clawobserver-capture.service
journalctl --user -u clawobserver.service -n 100 --no-pager
journalctl --user -u clawobserver-capture.service -n 100 --no-pager
```

These are user-level units. They run while the user session is active unless lingering is enabled separately on the host.

## Access path and binding behavior

By default, ClawObserver binds to:

```text
127.0.0.1:8420
```

That means the intended access path is a local browser on the same host:

```text
http://127.0.0.1:8420/
```

The service does not change this default during deployment. If you need a different bind address or port, edit `~/.config/clawobserver/clawobserver.env` and restart the service:

```bash
systemctl --user restart clawobserver.service
```

If you intentionally override `CLAWOBSERVER_HOST`, do it with full awareness that you are changing exposure beyond the default loopback-only model.

## Runtime adapter behavior

ClawObserver resolves live runtime data in this order:

1. `CLAWOBSERVER_RUNTIME_COMMAND`
2. `CLAWOBSERVER_RUNTIME_JSON`
3. built-in demo payload

The bundled `scripts/openclaw_runtime_adapter.py` is a conservative OpenClaw CLI adapter. It:

- runs `openclaw sessions --all-agents --json`
- derives active versus idle sessions from `ageMs`
- aggregates per-agent totals and token counters
- runs `openclaw gateway status --json`
- reports gateway totals conservatively as available/not available rather than inventing extra metrics
- emits `gateways.exits_today` when it can do so conservatively
  - if OpenClaw exposes a structured exits-today value in gateway status output, the adapter uses that directly
  - otherwise, on Linux hosts using the OpenClaw user-level `systemd` gateway unit, the adapter counts today’s `Main process exited` journal events for `openclaw-gateway.service`
  - this journal-derived count is a heuristic for gateway exits today and can include operator-initiated restarts/stops if systemd records them as a main-process exit event
- emits a normalized JSON payload that ClawObserver can use for both live views and archive capture

Current adapter limitations are intentional:

- queue depth is reported as a placeholder `default=0` lane because no richer stable queue source is defined here
- gateway history remains limited to count snapshots, including the archived `exits_today` sample when available
- if the adapter command fails, live requests and archive capture requests will fail until the configured runtime source is corrected

If you provide your own runtime command instead of the bundled adapter, emit the gateway reliability metric as `gateways.exits_today` in the normalized payload so it appears in both realtime and historical views.

For static testing, point `CLAWOBSERVER_RUNTIME_JSON` at a JSON file or run without either runtime override to use demo data.

## Archive cadence semantics

ClawObserver treats archived history as sampled state, not continuous telemetry.

- The shipped timer runs every 30 minutes using `OnCalendar=*:0/30`.
- `current_day` history returns every archived point for the day.
- Multi-day ranges return only the last archived snapshot from each day.
- Token statistics also use the latest archived record per day because the counters are expected to reset daily.

Operationally, this means:

- history may be empty immediately after deployment until the first successful archive capture completes
- if you want an initial historical sample right away, run `systemctl --user start clawobserver-capture.service`
- longer-range charts are daily summaries, not minute-resolution traces
- historical line charts now render visible Y-axis numeric labels and mouse-hover point tooltips with exact values

## Troubleshooting

If the deployment script fails:

- confirm `systemctl --user` works in the current login session
- confirm Python 3.12+ is installed
- read the exact error before retrying

If the web UI starts but data is empty or failing:

- inspect `~/.config/clawobserver/clawobserver.env`
- run `journalctl --user -u clawobserver.service -n 100 --no-pager`
- run `journalctl --user -u clawobserver-capture.service -n 100 --no-pager`
- test the bundled adapter directly with `python3 scripts/openclaw_runtime_adapter.py`

If the real runtime adapter is not usable yet:

- comment out `CLAWOBSERVER_RUNTIME_COMMAND` in the env file and set `CLAWOBSERVER_RUNTIME_JSON`, or
- remove both runtime overrides for a demo-data smoke test

If gateway exits today looks unavailable or suspiciously low:

- run `openclaw gateway status --json` and confirm the gateway service is detectable
- run `journalctl --user -u openclaw-gateway.service --since today --no-pager`
- remember that the journal-derived count is a conservative exit-event heuristic, not a perfect runtime-native counter

If you cannot reach the UI:

- confirm the service is active with `systemctl --user status clawobserver.service`
- confirm the configured host and port in `~/.config/clawobserver/clawobserver.env`
- remember that the default bind address is loopback-only, so remote machines cannot reach it unless you intentionally change the bind configuration
