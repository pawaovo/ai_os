# Bilingual App Language Toggle

## Goal

Add a real user-selectable bilingual mode to AI OS Personal so the app can be used in Chinese or English, and switching language updates the visible UI consistently instead of only changing a few labels.

## Requirements

- Support two UI languages: English and Chinese.
- Add a visible language selector that users can change themselves.
- Persist the selected language so the choice survives app restart.
- Make the main page surfaces adapt to the selected language, including static page copy and key dynamic UI messages.
- Ensure the browser sends the current language to the local server so major server-backed UI text can also be localized.
- Keep the implementation scoped to bilingual support without introducing a larger i18n framework than needed.

## Acceptance Criteria

- [ ] Users can choose between English and Chinese in the app UI.
- [ ] The language choice persists across reload or restart.
- [ ] Core visible surfaces switch language consistently:
  - Start
  - Space
  - Chat
  - Runs
  - Automations
  - Approvals
  - Memory
  - Capabilities
  - Forge
  - Providers
  - Settings
- [ ] Key server-backed UI text respects the selected language for at least readiness and major provider or run flows.
- [ ] `cd product && npm test` passes.
- [ ] `cd product && npm run validate:electron` passes.

## Out Of Scope

- Adding a third language.
- Building a generic translation management system for the whole repository.
- Translating user-authored content such as workspace names, chat messages, or saved note content.

## Technical Notes

- Main implementation files are expected to be:
  - `product/apps/space-desktop/public/index.html`
  - `product/apps/space-desktop/src/browser.ts`
  - `product/apps/space-desktop/scripts/dev-server.mjs`
  - `product/tests/space-desktop.test.mjs`
- Cross-layer requirement:
  - browser language state
  - persisted local setting
  - request header / server language resolution
  - localized readiness or workflow text
