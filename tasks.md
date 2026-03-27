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
- [ ] Publish to a public GitHub repository
- [ ] Final review and commit implementation changes

## Notes
- Current status: implementation complete; local validation, real-runtime validation, user-level systemd service registration, and public-release docs/deployment repo updates are done. GitHub publication and final release validation are still pending.
- App scaffold created with a dependency-light Python server, SQLite archive store, static UI shell, and built-in demo runtime adapter for local validation.
- Verified locally on 2026-03-27: `python3 -m unittest discover -s tests -v`, `python3 -m compileall clawobserver`, seeded demo history, served the app, and smoke-tested `/api/health`, `/api/live/overview`, `/api/history/overview?range=last_7_days`, `/api/history/tokens?range=last_7_days`, and `POST /api/archive/capture` successfully.
- Verified against a real OpenClaw runtime source on 2026-03-27 by setting `CLAWOBSERVER_RUNTIME_COMMAND` to an adapter built from `openclaw sessions --all-agents --json` plus `openclaw gateway status`, then smoke-testing `/api/health`, `/api/live/overview`, `/api/history/overview?range=current_day`, `/api/history/tokens?range=current_day`, and `POST /api/archive/capture` successfully.
- Registered the app as user-level systemd units on 2026-03-27 via `./scripts/install_user_service.sh`: `clawobserver.service` is active/running, `clawobserver-capture.timer` is active/waiting, and a manual `systemctl --user start clawobserver-capture.service` completed successfully.
- Added the operator-facing deployment entrypoint `./scripts/deploy.sh` on 2026-03-27 and kept `./scripts/install_user_service.sh` as a compatibility wrapper. The repo now documents the script-first deployment flow, default loopback bind, runtime adapter precedence, and archive cadence semantics.
- Repo-local validation for the new public-release edits should remain non-destructive: shell syntax checks, unit tests, and doc review inside the repo are appropriate; a fresh end-to-end deploy run should be validated separately on the target host before publication.
- Historical scope must remain grounded in the audited 2026-03-27 dashboard families, not obsolete `openclaw_agent_*` summary notes.
- Live runtime state and archive-backed history must remain separate paths.
- Gateway history beyond count snapshots remains conservative/optional until the runtime source is confirmed.
