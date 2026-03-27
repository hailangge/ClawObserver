# Tasks

## In progress
- [x] Confirm scope from `requirements.md` and `design.md`
- [x] Scaffold the application structure for ClawObserver
- [x] Implement live runtime data collection for realtime overview
- [x] Implement archive schema and 30-minute snapshot pipeline
- [x] Implement realtime overview UI
- [x] Implement historical views with day-last-record behavior
- [x] Implement token statistics page
- [x] Run local integration/system validation
- [x] Validate against a real OpenClaw runtime source
- [x] Add user-level systemd service/timer deployment
- [x] Register and validate the running user services
- [x] Add public-release deployment script and detailed README manual
- [x] Publish to a public GitHub repository
- [x] Add MIT license and first public release tag
- [x] Add branded ClawObserver header artwork/logo
- [x] Add Y-axis labels and hover tooltips to historical charts
- [x] Add gateway exit counts to realtime and historical monitoring
- [x] Update operator manual/spec docs for the new UX and gateway reliability metrics
- [x] Final review and commit implementation changes

## Notes
- Current status: the next feature pass is implemented and validated in-repo for branded artwork, improved historical chart UX, gateway exit reliability metrics, and GitHub release metadata; repo changes are committed and pushed.
- App scaffold created with a dependency-light Python server, SQLite archive store, static UI shell, and built-in demo runtime adapter for local validation.
- Verified locally on 2026-03-27: `python3 -m unittest discover -s tests -v`, `python3 -m compileall clawobserver`, seeded demo history, served the app, and smoke-tested `/api/health`, `/api/live/overview`, `/api/history/overview?range=last_7_days`, `/api/history/tokens?range=last_7_days`, and `POST /api/archive/capture` successfully.
- Verified against a real OpenClaw runtime source on 2026-03-27 by setting `CLAWOBSERVER_RUNTIME_COMMAND` to an adapter built from `openclaw sessions --all-agents --json` plus `openclaw gateway status`, then smoke-testing `/api/health`, `/api/live/overview`, `/api/history/overview?range=current_day`, `/api/history/tokens?range=current_day`, and `POST /api/archive/capture` successfully.
- Registered the app as user-level systemd units on 2026-03-27 via `./scripts/install_user_service.sh`: `clawobserver.service` is active/running, `clawobserver-capture.timer` is active/waiting, and a manual `systemctl --user start clawobserver-capture.service` completed successfully.
- Added the operator-facing deployment entrypoint `./scripts/deploy.sh` on 2026-03-27 and kept `./scripts/install_user_service.sh` as a compatibility wrapper. The repo now documents the script-first deployment flow, default loopback bind, runtime adapter precedence, and archive cadence semantics.
- Repo-local validation for the public-release edits remained non-destructive: shell syntax checks, unit tests, doc review, and a rerun of `./scripts/deploy.sh` all passed before publication.
- Verified the next feature pass locally on 2026-03-27: `python3 -m unittest discover -s tests -v`, `python3 -m compileall clawobserver scripts/openclaw_runtime_adapter.py`, `node --check clawobserver/static/app.js`, and a temp-dir smoke test using `CLAWOBSERVER_RUNTIME_COMMAND="python3 scripts/openclaw_runtime_adapter.py"` all passed. The smoke test confirmed `gateways.exits_today` appears in both `/api/live/overview` and archive-backed history payloads.
- Published publicly on 2026-03-27 at `https://github.com/hailangge/ClawObserver`; the repository now includes an MIT license and a `v0.1.0` GitHub release tag.
- Historical scope must remain grounded in the audited 2026-03-27 dashboard families, not obsolete `openclaw_agent_*` summary notes.
- Live runtime state and archive-backed history must remain separate paths.
- Gateway reliability history remains conservative: `exits_today` is archived as a count snapshot, and the bundled adapter uses structured runtime data when available or a documented `systemd` journal exit-event heuristic otherwise.
- After restarting the user service and triggering a fresh archive capture on 2026-03-27, `exits_today` was observed in realtime payloads immediately and in the latest historical archive point once a new snapshot had been captured.
