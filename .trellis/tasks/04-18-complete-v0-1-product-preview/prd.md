# Complete V0.1 Product Preview

## Goal

Turn the clickable V0.1 App from a technical demo into a product preview that can be meaningfully tested as a personal AI assistant.

The product preview must let a user:

- Open `AI OS.app`.
- Configure a custom model provider with API URL, API key, protocol, and model.
- Save the provider locally.
- Send real chat messages through the configured provider.
- Keep using the existing executor/artifact demo panel.

## Requirements

- Add a Provider Settings panel to the Space Desktop UI.
- Support OpenAI-compatible and Anthropic-compatible provider protocols.
- Persist provider configuration locally through the dev server.
- Load saved provider configuration when the app starts.
- Add a real chat panel that sends messages to the configured provider.
- Keep chat state in the current app session.
- Surface provider/chat errors clearly in the UI.
- Keep the existing mock/Codex/Claude executor demo path.
- Rebuild the clickable macOS app after implementation.

## Acceptance Criteria

- [x] `cd product && npm test` passes.
- [x] `cd product && npm run package:mac` builds `product/build/AI OS.app`.
- [x] The app opens as a native macOS window.
- [x] The app shows Provider Settings.
- [x] Provider Settings can be saved locally.
- [x] Saved provider settings load through the local server API.
- [x] A chat message can be submitted through the local server API.
- [x] OpenAI-compatible chat request construction is covered by automated tests.
- [x] Anthropic-compatible protocol remains selectable and validates through the same persistence path.
- [x] Existing executor/artifact demo path still works.

## Non-Goals

- No account system.
- No cloud sync.
- No encrypted keychain storage yet.
- No multi-thread persistence yet.
- No database.
- No signed/notarized app.
- No `.dmg` installer.
- No full automation platform.
- No Forge shell.

## Technical Notes

- V0.1 may store the provider API key in a local JSON file. This is not the final security model.
- Use `~/.ai_os/space-demo/provider.json` for local preview persistence.
- Browser code should call local server APIs; it should not call external model providers directly.
- Keep server APIs small:
  - `GET /api/provider`
  - `POST /api/provider`
  - `POST /api/chat/send`
- Keep tests deterministic by mocking provider fetch responses.
