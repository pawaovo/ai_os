# P11 Real Codex Success Smoke

## Goal

Add a repeatable smoke command that proves the real local Codex executor can complete a successful end-to-end run inside the product and produce the expected follow-up objects.

## Requirements

- Launch the product dev server with isolated local storage.
- Create and select a strict-trust workspace for the current repository.
- Start a real Codex run with a read-only summarization prompt.
- Auto-grant the pre-run approval when the product requests it.
- Wait for the run to reach the completed state.
- Assert that run artifacts include the transcript fallback artifact.
- Create a Forge recipe from the completed run and verify source-run linkage.
- Emit a concise machine-readable summary for debugging.

## Acceptance Criteria

- [x] `npm run smoke:real:codex` exists and runs the dedicated smoke script.
- [x] The smoke script validates approval, terminal completion, transcript artifact persistence, and recipe creation.
- [x] The smoke script cleans up temporary storage when it created the storage directory itself.
- [x] Static tests assert the smoke script contract and package script wiring.
- [x] `npm run smoke:real:codex` passes on the current host with the local Codex configuration.

## Technical Notes

- Reuse the existing HTTP product APIs instead of adding a separate test-only control channel.
- Keep the smoke output small and structured so failures are easy to inspect in CI-like local runs.
- Fail fast when the run reaches `failed` or `interrupted` instead of silently waiting for timeout.
