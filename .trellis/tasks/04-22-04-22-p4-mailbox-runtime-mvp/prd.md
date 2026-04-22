# P4 Mailbox Runtime MVP

## Goal

Add a local-first mailbox runtime that records handoff-style coordination messages from orchestration and remote bridge flows, and make those mailbox items visible in the Agents product surface.

## Requirements

- Keep mailbox additive and local-first.
- Mailbox must not become a second run/runtime store.
- Each mailbox item must stay traceable to:
  - workspace
  - source flow
  - optional run / orchestration / remote session context
- Mailbox items should be created automatically by existing product flows:
  - agent orchestration handoffs
  - remote bridge session and approval events
- Provide a minimal lifecycle:
  - `delivered`
  - `handled`
- Surface mailbox items in the Agents page as a readable timeline/list.

## Scope Boundary

- In scope:
  - mailbox item persistence
  - mailbox list API
  - automatic writes from orchestration and remote bridge
  - mailbox panel in Agents page
  - regression coverage for mailbox creation and scoping
- Out of scope:
  - team chat
  - free-form mailbox compose UI
  - multi-channel routing
  - remote mailbox replication
  - workflow graph editor

## Technical Notes

- Mailbox status should reflect handoff lifecycle, not approval lifecycle.
- Orchestration should mark a previous handoff as `handled` when the downstream role actually starts.
- Remote bridge writes may remain `delivered` in MVP unless a clear handled transition exists.

## Acceptance Criteria

- [ ] AI OS persists mailbox items with workspace and flow linkage.
- [ ] Agent orchestration writes mailbox handoff items during planner/worker/reviewer progression.
- [ ] Remote bridge writes mailbox items for session creation and approval-related actions.
- [ ] Agents page renders mailbox items from backend state.
- [ ] `npm test`, `npm run validate:electron`, and `npm run package:mac` pass.
