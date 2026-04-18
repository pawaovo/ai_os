# V0.2 Secure Provider And Persistent Chat

## Goal

Implement the first V0.2 product stage from `ai_os/ai_os_docs/04-implementation-roadmap.md`: make AI OS usable as a daily local chat assistant with safer provider storage and persistent chat history.

## Requirements

- Move provider API keys out of the local provider JSON file.
- Store provider secrets in macOS Keychain.
- Store provider metadata, chat threads, and messages in a local database.
- Add a Provider Doctor API and UI.
- Add model list loading and model selection.
- Add a persistent thread list.
- Support creating and selecting threads.
- Preserve chat messages after app restart.
- Keep existing executor demo path working.
- Rebuild and verify `product/build/AI OS.app`.

## Acceptance Criteria

- [x] `cd product && npm test` passes.
- [x] `cd product && npm ci --ignore-scripts --dry-run` passes.
- [x] `cd product && npm run package:mac` succeeds.
- [x] Provider API key is stored in Keychain, not in local JSON.
- [x] Provider metadata survives app restart.
- [x] Thread list survives app restart.
- [x] Chat messages survive app restart.
- [x] Provider Doctor can validate model/provider connectivity.
- [x] Model selector can load models from the configured provider.
- [x] Existing mock executor path still succeeds.
- [x] Codex executor path still succeeds when Codex service is available.

## Non-Goals

- No workspace file execution.
- No automation.
- No Forge.
- No cloud sync.
- No team features.
- No full installer signing/notarization.

## Technical Notes

- Use local SQLite via Node's `node:sqlite` module for V0.2 preview persistence.
- Use macOS `security` CLI as the first Keychain bridge.
- Keep browser code talking only to local server APIs.
- Keep OpenAI-compatible and Anthropic-compatible providers behind the existing Provider Protocol.
