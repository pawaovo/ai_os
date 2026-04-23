# P7 Cross Object Navigation Shortcuts

## Goal

Improve day-to-day usability by letting users jump directly between related product objects such as approvals, mailbox items, capabilities, recipes, remote sessions, and their source runs or orchestrations.

## Requirements

- Keep the work additive and local-first.
- Prefer reusing existing IDs and existing `openRun(...)`, `openAgentOrchestration(...)`, `openRemoteBridgeSession(...)`, and page navigation flows.
- Add direct navigation shortcuts where source linkage already exists.
- Do not introduce new persistence just for navigation.
- Keep bilingual support for all new copy.

## Acceptance Criteria

- [x] Approval history can jump to the related run when `approval.runId` exists.
- [x] Mailbox and related views continue to jump correctly to linked runs or orchestrations where applicable.
- [x] Capability/recipe related history surfaces expose source object navigation where linkage already exists.
- [x] `npm test`, `npm run validate:electron`, and `npm run package:mac` pass.
- [x] Packaged app smoke confirms the new navigation actions render for linked records.

## Technical Notes

- Prefer browser-side reuse of existing open/navigation helpers.
- If a linked object does not exist, actions should remain disabled or fall back gracefully.
