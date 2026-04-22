# P3 Remote Bridge Single-Channel Pilot

## Goal

Add the first safe remote bridge pilot so a remote principal can bind to one local workspace, start a run through existing runtime flows, observe progress, and resolve safe continuation steps through a single channel.

## Requirements

- Keep the pilot local-first and additive.
- Reuse existing run, approval, and continuation semantics.
- Bind every remote session to:
  - one principal identity
  - one workspace
  - one channel type
- Require explicit remote authentication for bridge actions.
- Keep the pilot single-channel only.
- Provide minimal product visibility in Settings for:
  - bridge status
  - recent sessions
  - connection details for the latest session
- Allow remote actions to:
  - start a run
  - inspect run live state
  - resolve a pending approval
- Record auditable remote bridge events.

## Scope Boundary

- In scope:
  - remote bridge session creation
  - token-authenticated bridge actions
  - single channel session summary
  - reuse of local run lifecycle
  - minimal settings surface
  - deterministic integration tests
- Out of scope:
  - multi-channel routing
  - team mailbox runtime
  - remote marketplace / publish flow
  - executor-native remote resume
  - cloud-hosted bridge infrastructure

## Technical Notes

- MVP may use a local HTTP channel with explicit bearer token auth.
- Bridge sessions must pin workspace context so later remote actions do not drift when local UI selection changes.
- Remote continuation must only expose already-safe local continuation paths.

## Acceptance Criteria

- [ ] AI OS can create a single remote bridge pilot session bound to a workspace and principal.
- [ ] An authenticated remote client can start and monitor a child run through the pilot.
- [ ] An authenticated remote client can resolve a pending approval through existing approval semantics.
- [ ] Remote bridge events are auditable and session-bound.
- [ ] `npm test`, `npm run validate:electron`, and `npm run package:mac` pass.
