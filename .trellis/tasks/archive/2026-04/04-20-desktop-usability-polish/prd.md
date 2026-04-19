# Desktop Usability Polish

## Goal

Make a small, high-value polish pass on the current AI OS Personal product so it is easier to package, understand, and manually try as a real local-first desktop assistant, without introducing new architecture or broad redesign.

## What I Already Know

- The repo is currently clean on branch `codex/desktop-usability-polish`.
- The previous Electron migration is complete and verified on macOS.
- The product already includes chat, providers, workspaces, runs, approvals, artifacts, automations, memory, capabilities, and Forge.
- The user wants pragmatic improvement only, with no overdesign.
- The final deliverable must include implementation, testing, GitHub push, and a detailed explanation of current modules and expected usage outcomes.

## Assumptions (Temporary)

- The best improvements will be small polish items around usability, platform clarity, and user guidance rather than new feature development.
- Changes may touch both product runtime/readiness text and docs if that improves first-run experience.
- Cross-platform packaging/readiness messaging is a good target because it was recently migrated and is easy to regress.

## Open Questions

- Which low-risk improvements most improve real first-run/manual usage?

## Requirements (Evolving)

- Identify a short list of non-overdesigned improvements from the current product state.
- Implement only the most valuable low-risk improvements.
- Keep behavior and docs aligned with the real product state.
- Keep all existing validation paths passing.
- Provide a detailed user-facing summary of modules, features, and expected usage outcomes after implementation.

## Chosen Scope

- Make Electron install guidance host-aware instead of hard-coding the Apple Silicon output path everywhere.
- Surface the existing Windows packaging command inside the desktop install panel so cross-platform guidance is visible in the app, not only in docs.
- Refresh product docs so they describe the current V1.0 system, first-run path, modules, and expected results rather than older mixed V0.1 or V0.2 framing.

## Acceptance Criteria (Evolving)

- [ ] A focused improvement plan is derived from the current codebase and docs.
- [ ] Implemented changes stay scoped and do not introduce broad redesign.
- [ ] `cd product && npm test` passes.
- [ ] `cd product && npm run validate:electron` passes.
- [ ] Any new or changed user guidance matches real product behavior.
- [ ] Changes are committed and pushed to GitHub.
- [ ] Final response explains current system modules, available functionality, and expected user experience in detail.

## Definition of Done

- Tests updated and passing where needed
- Docs and runtime hints updated if behavior or guidance changes
- No unnecessary new subsystems, abstraction layers, or speculative features
- Git history is clean and pushed

## Out of Scope

- New major product features
- New platform architecture
- Auto-update, cloud sync, team collaboration, marketplace, or large UI redesign
- Executor/runtime redesign beyond small polish needed for usability

## Technical Notes

- Likely focus area: `product/`
- Recent high-risk area: Electron packaging/readiness/install messaging
- Likely files to inspect: `product/README.md`, `product/apps/space-desktop/README.md`, `product/apps/space-desktop/public/index.html`, `product/apps/space-desktop/src/browser.ts`, `product/apps/space-desktop/scripts/dev-server.mjs`, `product/tests/space-desktop.test.mjs`
- Relevant code-specs: `.trellis/spec/backend/electron-desktop-shell.md`, `.trellis/spec/frontend/desktop-readiness-contract.md`
- Verification target: `npm ci --ignore-scripts --dry-run`, `npm test`, `npm run validate:electron`, `npm run package:mac`, packaged-app smoke against `/api/app/readiness`
