# V0.7 Local Memory And Personal Context

## Goal

Implement V0.7 from `ai_os/ai_os_docs/04-implementation-roadmap.md`: let AI OS remember useful personal and project context locally and expose that memory to users through clear UI and usage visibility.

## Requirements

- Add a local memory object model.
- Add local memory persistence in SQLite.
- Add memory management UI:
  - create/save memory
  - inspect memory
  - delete/forget memory
  - see sensitivity label
- Add memory retrieval for:
  - chat
  - executor task start
- Add visible memory usage feedback:
  - show when memory was used
  - show which memory items were injected
- Keep all memory local:
  - no cloud sync
  - no model training
  - no organization knowledge base
- Preserve V0.6.1 product shell navigation and V0.6 automation / V0.5 approval behavior.

## Acceptance Criteria

- [x] `cd product && npm test` passes.
- [x] `cd product && npm ci --ignore-scripts --dry-run` passes.
- [x] `cd product && npm run package:mac` succeeds.
- [x] User can add a memory.
- [x] User can delete a memory.
- [x] Chat can use relevant memory.
- [x] Run/task prompt can use relevant memory.
- [x] App shows memory usage when applicable.
- [x] Packaged `AI OS.app` launches and shows the V0.7 memory workflow without white screen regression.

## Non-Goals

- No model training.
- No cloud memory sync.
- No organization knowledge base.
- No semantic vector search service.
- No external embedding dependency.

## Technical Notes

- Keep retrieval deterministic and local-first for V0.7.
- Prefer simple lexical relevance scoring over remote embedding infrastructure.
- Memory usage UI must not require reading logs or developer tooling.
