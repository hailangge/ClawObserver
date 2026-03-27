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
- [ ] Final review and commit implementation changes

## Notes
- Current status: implementation complete; local and real-runtime system validation passed. Final review/commit is still pending.
- App scaffold created with a dependency-light Python server, SQLite archive store, static UI shell, and built-in demo runtime adapter for local validation.
- Verified locally on 2026-03-27: `python3 -m unittest discover -s tests -v`, `python3 -m compileall clawobserver`, seeded demo history, served the app, and smoke-tested `/api/health`, `/api/live/overview`, `/api/history/overview?range=last_7_days`, `/api/history/tokens?range=last_7_days`, and `POST /api/archive/capture` successfully.
- Verified against a real OpenClaw runtime source on 2026-03-27 by setting `CLAWOBSERVER_RUNTIME_COMMAND` to a temporary adapter built from `openclaw sessions --all-agents --json` plus `openclaw gateway status`, then smoke-testing `/api/health`, `/api/live/overview`, `/api/history/overview?range=current_day`, `/api/history/tokens?range=current_day`, and `POST /api/archive/capture` successfully.
- Historical scope must remain grounded in the audited 2026-03-27 dashboard families, not obsolete `openclaw_agent_*` summary notes.
- Live runtime state and archive-backed history must remain separate paths.
- Gateway history beyond count snapshots remains conservative/optional until the runtime source is confirmed.
