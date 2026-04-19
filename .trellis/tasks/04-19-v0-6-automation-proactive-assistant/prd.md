# V0.6 Automation And Proactive Assistant

## Goal

Implement V0.6 from `ai_os/ai_os_docs/04-implementation-roadmap.md`: make AI OS proactive through local automations while preserving V0.5 approval and trust safety.

## Requirements

- Add local automation objects:
  - one-off reminder
  - scheduled interval task
  - heartbeat follow-up
- Add a lightweight local scheduler inside the Space Desktop server.
- Add automation run history and visible results.
- Add automation UI:
  - create automation
  - pause/resume automation
  - delete automation
  - view automation runs
- Integrate V0.5 approval:
  - risky automation actions create approval records
  - no unattended shell/network/external-send behavior by default
  - trusted local write mode still applies only to local file-write risk
- Keep all state local in SQLite and scoped to active workspace.
- Preserve V0.5 executor, approval, artifact, and workspace behavior.

## Acceptance Criteria

- [x] `cd product && npm test` passes.
- [x] `cd product && npm ci --ignore-scripts --dry-run` passes.
- [x] `cd product && npm run package:mac` succeeds.
- [x] User can create a one-off reminder.
- [x] User can create an interval scheduled task.
- [x] User can create a heartbeat follow-up.
- [x] Scheduled task runs locally.
- [x] User can pause/resume/delete an automation.
- [x] Automation result appears in the app and persists.
- [x] Risky automation action requires approval and records approval history.
- [x] Packaged `AI OS.app` launches and shows the V0.6 automation workflow without white screen regression.

## Non-Goals

- No cloud scheduler.
- No enterprise workflow engine.
- No unattended external sends by default.
- No full calendar/email integration.
- No V0.7 local memory system.

## Technical Notes

- Keep the scheduler simple and deterministic for V0.6.
- Use small interval-based schedules instead of full cron syntax.
- The automation worker can produce local artifacts/results; it does not need to call external providers.
- Risk assessment should reuse `approval-core`.
