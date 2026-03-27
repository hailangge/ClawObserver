# ClawObserver

Lightweight OpenClaw monitoring spec repository.

This repo now contains the approved spec set plus an initial lightweight implementation of a runtime-first monitoring app intended to replace the heavy SigNoz-based setup for the OpenClaw use case.

## Spec files

- `requirements.md` — product scope and acceptance criteria
- `design.md` — proposed architecture, UX, and data model
- `tasks.md` — live execution and validation checklist

## App structure

- `clawobserver/` — Python application package
- `clawobserver/static/` — static UI assets for the local dashboard
- `tests/` — archive semantics tests
- `data/` — local SQLite archive location

## Run locally

Serve the app:

```bash
python3 -m clawobserver serve
```

Capture one archive snapshot from the live adapter:

```bash
python3 -m clawobserver capture
```

Seed demo archive history for validation:

```bash
python3 -m clawobserver seed-demo --days 7 --interval-minutes 30
```

Environment overrides:

- `CLAWOBSERVER_DATABASE_PATH` — SQLite archive path
- `CLAWOBSERVER_RUNTIME_JSON` — JSON file used as the live runtime source
- `CLAWOBSERVER_RUNTIME_COMMAND` — command that prints live runtime JSON

## Register as a user service

This repo includes a host-native systemd user deployment for the recommended first production path.

Install/register the service and timer:

```bash
./scripts/install_user_service.sh
```

This installs:
- `clawobserver.service` — persistent web UI/API service
- `clawobserver-capture.timer` — 30-minute archive capture timer

Generated runtime config:
- `~/.config/clawobserver/clawobserver.env`

Bundled real-runtime adapter:
- `scripts/openclaw_runtime_adapter.py`

Useful commands:

```bash
systemctl --user status clawobserver.service
systemctl --user status clawobserver-capture.timer
journalctl --user -u clawobserver.service -n 100 --no-pager
systemctl --user start clawobserver-capture.service
```
