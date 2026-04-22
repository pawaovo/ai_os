# Reference Project Comparison And Absorption Plan

## Goal

Turn the recent multi-repo research work into durable AI OS documentation that can guide future product and architecture decisions.

## Requirements

- Add one formal research document that compares Proma, CodePilot, AionUi, Claude Code, Codex, and Alma.
- Add one formal absorption and iteration planning document for AI OS.
- Keep the focus on practical product and runtime implications rather than broad historical narration.
- Clearly distinguish between:
  - latest remote snapshot analysis
  - local reconstructed or extracted snapshot analysis
- Include both project-level and module-level comparison tables.
- Map each useful idea back to AI OS priorities and stage boundaries.
- Avoid overdesign and avoid proposing to copy any reference project wholesale.

## Acceptance Criteria

- [ ] `ai_os/ai_os_docs/05-reference-project-comparison.md` exists and summarizes the six reference projects with concrete module and architecture comparisons.
- [ ] `ai_os/ai_os_docs/06-reference-absorption-and-iteration-plan.md` exists and translates the comparison into staged AI OS iteration guidance.
- [ ] The documentation explicitly states which references are best for provider governance, executor protocol, workspace model, memory, MCP, skills, bridge, team, and automation.
- [ ] The guidance includes both "do now" and "do later / not now" boundaries.
- [ ] Existing roadmap docs are updated with links to the new documents.

## Technical Notes

- Proma, CodePilot, AionUi, and Codex should be treated as latest remote snapshot analysis.
- Claude Code should be treated as local reconstructed-source analysis from `ClaudeCodeRev`.
- Alma should be treated as local extracted-bundle analysis because the public repository was not available.
- Keep terminology aligned with AI OS docs:
  - AI Space
  - AI Forge
  - Companion
  - Workspace / Thread / Artifact / Run / Capability
