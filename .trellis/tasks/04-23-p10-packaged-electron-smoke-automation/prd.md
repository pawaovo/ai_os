# P10 Packaged Electron Smoke Automation

## Goal

Add a low-risk packaged Electron smoke command so local desktop packaging validation is repeatable instead of relying on hand-written one-off shell commands.

## Requirements

- Keep the change local to packaging and validation scripts.
- Do not change packaged runtime behavior.
- Reuse the existing `/api/app/readiness` readiness contract.

## Acceptance Criteria

- [x] A dedicated npm script exists for packaged macOS smoke.
- [x] The smoke script launches the packaged Electron app, waits for readiness, and exits cleanly.
- [x] Static tests cover the new script contract.
- [x] `npm run smoke:packaged:mac` passes on the current host.
