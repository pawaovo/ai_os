# Desktop Readiness Contract

> Executable contract for how the browser UI renders readiness/install state for the Electron desktop shell.

## Scenario: Start And Settings Must Reflect The Current Desktop Shell

### 1. Scope / Trigger

- Trigger: changing `product/apps/space-desktop/src/browser.ts`.
- Trigger: changing `product/apps/space-desktop/public/index.html`.
- Trigger: changing `/api/app/readiness` fields consumed by the renderer.
- Trigger: changing README/install text that the Start and Settings pages mirror.

### 2. Signatures

#### Renderer Fetch

```ts
await apiJson<AppReadinessSummary>("/api/app/readiness");
```

#### Required DOM Anchors

- `#app-readiness-status`
- `#app-readiness-list`
- `#app-readiness-help`
- `#install-status-list`
- `#install-help`
- navigation buttons with `data-page-target`
- readiness/install buttons with `data-readiness-target`

#### Required Install Fields Consumed By The Renderer

```ts
interface AppReadinessSummary {
  install: {
    mode: string;
    signed: boolean;
    notarized: boolean;
    nodeRequired: boolean;
    buildCommand: string;
    openCommand: string;
    windowsCommand: string;
    note: string;
  };
}
```

### 3. Contracts

- `browser.ts` is a consumer of `/api/app/readiness`; it must not invent packaging paths locally.
- Start and Settings must show the same Electron install path the backend emits in `install.openCommand`.
- Start and Settings must also show the Windows package command emitted by `install.windowsCommand`.
- The Node Runtime card must render:
  - `"Electron provides the packaged desktop runtime."` when `nodeRequired === false`
  - `"Node must be available on PATH when running the local server outside Electron."` when `nodeRequired === true`
- `#install-help` must describe the current product shell, not a stale legacy shell.
- Settings copy in `public/index.html` must remain generic enough that host-specific install output can come from readiness JSON instead of a stale hard-coded path.

### 4. Validation & Error Matrix

| Condition | Expected Behavior | Validation Point |
| --- | --- | --- |
| `/api/app/readiness` fetch fails | renderer shows load failure message instead of crashing | `renderAppReadiness()` fallback path |
| Install path changes on backend only | regression test fails because docs/UI strings drift | `space-desktop.test.mjs` |
| Windows package command exists on backend but is not rendered | install panel hides part of the documented cross-platform story | `space-desktop.test.mjs` source assertion and manual UI smoke |
| `nodeRequired` toggles but UI copy does not | readiness install card shows wrong runtime expectation | manual smoke in Settings |
| Start page loads but Settings page is blank | packaged app smoke fails because navigation does not render the page | packaged app UI smoke |

### 5. Good / Base / Bad Cases

#### Good

- Start page shows Electron build/open commands.
- Install panel also surfaces the Windows packaging command.
- Settings page still renders after navigation from Start.
- Local install help text says Electron is the product shell.

#### Base

- Windows packaging is documented, but macOS install cards remain the immediate local CTA on this host.

#### Bad

- Leaving `product/build/AI OS.app` in the install card after `package:mac` now points to Electron.
- Hard-coding build/open text in multiple renderer locations without test coverage.
- Hiding the Windows packaging command in docs only while the backend already exposes it.

### 6. Tests Required

- `space-desktop.test.mjs` must assert:
  - Electron install wording in README and HTML.
  - `package:mac` and `package:win` scripts point to Electron commands.
  - Windows packaging guidance is surfaced by the renderer code.
  - BrowserWindow security flags remain locked down.
- Packaged app smoke must confirm:
  - Start page renders readiness/install cards.
  - Settings page renders the Electron install instructions after navigation.

### 7. Wrong vs Correct

#### Wrong

- Update the backend install payload, but forget the Start page copy, the Settings page copy, or regression tests.

#### Correct

- Treat backend readiness JSON, renderer install cards, HTML fallback copy, and README text as one user-facing contract.
