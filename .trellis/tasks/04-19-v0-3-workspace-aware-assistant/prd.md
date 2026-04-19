# V0.3 Workspace Aware Assistant

## Goal

Implement V0.3 from `ai_os/ai_os_docs/04-implementation-roadmap.md`: make AI OS workspace-aware and upgrade the App from a long demo page into a structured workbench.

## Requirements

- Add workspace metadata persistence.
- Add active workspace selection.
- Scope chat threads to workspace when a workspace is selected.
- Add artifact persistence.
- Add artifact list and artifact detail APIs.
- Add run history persistence for demo/executor runs.
- Save executor transcript artifacts into the artifact store.
- Add a three-panel layout:
  - left: workspace + threads
  - center: chat
  - right: provider + run + artifacts
- Preserve V0.2 provider security and persistent chat behavior.
- Rebuild and verify `product/build/AI OS.app`.

## Acceptance Criteria

- [ ] `cd product && npm test` passes.
- [ ] `cd product && npm ci --ignore-scripts --dry-run` passes.
- [ ] `cd product && npm run package:mac` succeeds.
- [ ] User can create/select a workspace.
- [ ] Active workspace survives app restart.
- [ ] Threads can be associated with a workspace.
- [ ] Artifact can be saved and reopened.
- [ ] Run history survives app restart.
- [ ] User can distinguish chat output, run output, and saved artifact.
- [ ] App is no longer a single long unstructured page.

## Non-Goals

- No full IDE.
- No cloud workspace sync.
- No team workspace sharing.
- No complex file indexing engine.
- No approval UI.
- No automation.
- No Forge.

## Technical Notes

- Use the existing SQLite app store.
- Add `workspaces`, `artifacts`, `runs`, and `run_events` tables.
- Use local-first artifact placement rules; V0.3 can store artifact content in SQLite and optional path metadata.
- Browser still talks only to local APIs.
