# P5 Multi-Agent Product Surface

## Goal

Turn the existing Agents page from a collection of separate MVP panels into a coherent multi-agent control surface with one backend-owned governance summary and clearer operator-facing status.

## Requirements

- Keep the product surface additive and local-first.
- Reuse existing runtime layers:
  - agent runtime registry
  - agent orchestration
  - remote bridge pilot
  - mailbox runtime
  - approval records
- Add a backend-owned multi-agent governance summary endpoint.
- Render that summary directly in the Agents page instead of rebuilding it in multiple frontend places.
- Make the Agents page easier to scan by surfacing:
  - overall system status
  - key counts
  - current focus / attention items
  - recent activity feed
- Preserve deep-links into existing Runs where applicable.

## Scope Boundary

- In scope:
  - governance summary API
  - Agents page overview / activity surface
  - wiring existing panels to the unified summary
  - regression tests for aggregated product behavior
- Out of scope:
  - canvas / graph editor
  - free-form team collaboration workspace
  - arbitrary custom dashboard builder
  - new executor/runtime families

## Technical Notes

- Governance summary should remain backend-owned and read-only.
- Agents page can still keep detailed panels, but overview and attention state should come from one summary payload.
- Summary should expose enough structure for the UI without leaking storage internals.

## Acceptance Criteria

- [ ] AI OS exposes a backend-owned multi-agent governance summary.
- [ ] Agents page renders a unified overview and recent activity section.
- [ ] Overview reflects orchestration, remote bridge, mailbox, runtime, and approval state together.
- [ ] `npm test`, `npm run validate:electron`, and `npm run package:mac` pass.
