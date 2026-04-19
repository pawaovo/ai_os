# V0.5 Approval And Trust

## Goal

Implement V0.5 from `ai_os/ai_os_docs/04-implementation-roadmap.md`: make risky executor actions visible, interruptible, and auditable without expanding into V0.6 automation or enterprise permission management.

## Requirements

- Add a small `approval-core` package for shared approval vocabulary and risk assessment.
- Add approval policy rules for executor runs:
  - file mutation risk
  - shell/command/install risk
  - network/send/upload/download risk
  - generic code executor risk
- Add workspace trust mode:
  - strict mode requires approval for risky actions
  - trusted local write mode can auto-grant local file-write actions
  - shell/network risks still require explicit approval
- Persist approval requests and decisions in SQLite.
- Show approval history in the desktop workbench.
- Show risk category, risk level, requested action, reason, decision, and resolution time.
- Record rejected decisions and stop/fail the run clearly.
- Preserve V0.4 executor workflow behavior:
  - executor doctor
  - live streaming
  - cancel
  - run/event/artifact persistence

## Acceptance Criteria

- [x] `cd product && npm test` passes.
- [x] `cd product && npm ci --ignore-scripts --dry-run` passes.
- [x] `cd product && npm run package:mac` succeeds.
- [x] File mutation goal can trigger an approval request.
- [x] Shell/command goal can trigger an approval request.
- [x] Network/send goal can trigger an approval request.
- [x] User decision is recorded and visible in approval history.
- [x] Rejected approval stops or fails the run clearly.
- [x] Trusted local write mode can auto-grant local file-write actions while still recording the decision.
- [x] Packaged `AI OS.app` launches and shows the V0.5 approval/trust workflow without white screen regression.

## Non-Goals

- No V0.6 automation or scheduler.
- No enterprise/team approval workflow.
- No public trust marketplace.
- No complex policy language.
- No unattended external send/write defaults.

## Technical Notes

- Keep approval rules deterministic and local for V0.5.
- Do not let UI or adapters define risk categories independently; use `approval-core`.
- Approval history should be scoped to the active workspace where possible.
- V0.5 trust mode is a product baseline, not the final policy engine.
