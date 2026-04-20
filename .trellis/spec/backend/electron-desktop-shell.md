# Electron Desktop Shell

> Executable contract for the AI OS Electron desktop runtime, packaging path, and local secret-storage behavior.

## Scenario: Electron Product Shell

### 1. Scope / Trigger

- Trigger: changing `product/package.json` Electron scripts or `main`.
- Trigger: changing `product/apps/space-desktop/electron-app/main.cjs`.
- Trigger: changing `product/electron-builder.config.cjs` resource layout.
- Trigger: changing `product/apps/space-desktop/scripts/dev-server.mjs` install/readiness payload or secret-store selection.
- Trigger: changing smoke-test expectations for the packaged app.

This scenario is cross-layer because one change fans out into package scripts, Electron lifecycle, runtime env selection, packaged resources, the `/api/app/readiness` payload, and app-smoke verification.

### 2. Signatures

#### Package Scripts

```json
{
  "main": "apps/space-desktop/electron-app/main.cjs",
  "scripts": {
    "desktop:dev": "npm run typecheck && electron ./apps/space-desktop/electron-app/main.cjs",
    "package:mac": "npm run package:electron:mac",
    "package:win": "npm run package:electron:win",
    "package:electron:mac": "npm run typecheck && electron-builder --config electron-builder.config.cjs --mac dir",
    "package:electron:win": "npm run validate:electron && npm run typecheck && electron-builder --config electron-builder.config.cjs --win",
    "validate:electron": "node ./apps/space-desktop/scripts/validate-electron-config.mjs"
  }
}
```

#### Runtime Entry Points

- Electron main: `product/apps/space-desktop/electron-app/main.cjs`
- Local server runtime: `product/apps/space-desktop/scripts/dev-server.mjs`
- Builder config: `product/electron-builder.config.cjs`
- After-pack hook: `product/apps/space-desktop/scripts/after-pack-electron.mjs`
- Static config validator: `product/apps/space-desktop/scripts/validate-electron-config.mjs`
- Smoke endpoint: `GET /api/app/readiness`

#### Required Environment Keys

| Key | Producer | Required Value / Shape | Notes |
| --- | --- | --- | --- |
| `PORT` | Electron main | numeric TCP port | `main.cjs` resolves an explicit or ephemeral local port before importing the server. |
| `AI_SPACE_APP_PORT` | smoke/dev launcher | optional numeric TCP port | Lets tests and packaged smoke runs pin a deterministic port. |
| `AI_SPACE_SKIP_BUILD` | Electron main | `"1"` | Packaged/dev Electron must not rebuild the product before boot. |
| `AI_SPACE_DESKTOP_SHELL` | Electron main | `"electron"` | Switches install/readiness messaging and Electron-specific secret storage. |
| `AI_SPACE_STORAGE_DIR` | launcher or Electron main | absolute directory path | Defaults to `app.getPath("userData")/profile` in Electron. |
| `AI_SPACE_SECRET_BACKEND` | tests/dev only | optional `"file"` | Overrides normal secret-store selection for isolated tests. |
| `x-ai-os-language` | browser request header | `en` or `zh-CN` | Lets the local server shape server-backed UI text to the selected language. |

### 3. Contracts

#### Electron Main Process Contract

- `main.cjs` must acquire a single-instance lock before showing UI.
- `main.cjs` must set `PORT`, `AI_SPACE_SKIP_BUILD`, and `AI_SPACE_DESKTOP_SHELL="electron"` before importing `dev-server.mjs`.
- `main.cjs` must wait for `GET /api/app/readiness` before calling `BrowserWindow.loadURL(...)`.
- `BrowserWindow` must keep:
  - `nodeIntegration: false`
  - `contextIsolation: true`
  - `sandbox: true`
  - `webSecurity: true`
- External navigation must be denied in-app and routed through `shell.openExternal(...)`.

#### Packaged Resource Contract

- `electron-builder.config.cjs` `directories.app` must be `apps/space-desktop/electron-app`.
- Packaged output root must remain `build/electron`.
- Extra resources must copy:
  - `product/package.json`
  - `product/apps/space-desktop/{package.json,README.md,dist,public,scripts/dev-server.mjs}`
  - built workspace package `dist/**` payloads under `product/packages/**`
  - built package payloads under `product/node_modules/@ai-os/*`
- `after-pack-electron.mjs` must ensure `Contents/Resources/app/package.json` exists in the packaged app so Electron can resolve packaged metadata consistently.

#### Secret-Store Selection Contract

- `AI_SPACE_SECRET_BACKEND=file` wins first and is test-only.
- On macOS, `dev-server.mjs` must use `KeychainSecretStore` even inside Electron, because local ad-hoc Electron rebuilds can block the main process while decrypting `safeStorage` secrets.
- When running inside Electron on non-macOS platforms, `dev-server.mjs` must use `ElectronSafeStorageSecretStore`.
- When running on Windows outside Electron, `dev-server.mjs` must use `WindowsProtectedFileSecretStore`.
- Otherwise the desktop dev server falls back to the existing macOS keychain-backed store.

#### Readiness / Install Payload Contract

`GET /api/app/readiness` must return an `install` object with at least:

```json
{
  "mode": "electron-cross-platform",
  "appName": "AI OS.app",
  "signed": false,
  "notarized": false,
  "nodeRequired": false,
  "buildCommand": "cd product && npm run package:mac",
  "openCommand": "open \"product/build/electron/mac-arm64/AI OS.app\"",
  "windowsCommand": "cd product && npm run package:win",
  "storageRoot": "/absolute/profile/path",
  "note": "This local V1.0 build uses Electron as the product desktop shell for macOS and Windows."
}
```

Contract details:

- On macOS hosts:
  - `buildCommand` must stay `cd product && npm run package:mac`
  - `openCommand` must use `product/build/electron/mac-arm64/AI OS.app` on Apple Silicon and `product/build/electron/mac/AI OS.app` on Intel
- On Windows hosts:
  - `buildCommand` must switch to `cd product && npm run package:win`
  - `openCommand` must point to `product\build\electron\win-unpacked\AI OS.exe`
- `windowsCommand` must remain present even on macOS because the UI surfaces it as cross-platform packaging guidance.
- `language` should be returned in readiness responses when the backend knows the persisted UI language, so the browser can stay in sync after reload.
- When running outside Electron, `nodeRequired` must flip back to `true`, but install guidance should still point to the primary Electron product path.
- `mode`, `nodeRequired`, `buildCommand`, `openCommand`, `windowsCommand`, `note`, and `language` are the contract points most likely to drift and must stay aligned with docs and renderer expectations.

#### Language Setting Contract

- `GET /api/settings/language` returns the persisted UI language.
- `PATCH /api/settings/language` persists the current UI language.
- The backend reads `x-ai-os-language` on requests and uses it for server-backed UI text where available, especially readiness and install guidance.

### 4. Validation & Error Matrix

| Condition | Expected Behavior | Validation Point |
| --- | --- | --- |
| Electron scripts missing or `main` points elsewhere | `validate-electron-config.mjs` fails | `npm run validate:electron` |
| Packaged app resources drift from builder config | package config regression test fails | `node --test tests/*.test.mjs` |
| Host-specific install path drifts from actual packaging output | readiness and docs show the wrong open path | `npm test` on the host plus manual packaging smoke |
| UI language changes but server text stays in the old language | mixed-language dashboard after reload or refresh | bilingual smoke with `PATCH /api/settings/language` then `GET /api/app/readiness` |
| Server never reaches readiness | Electron main exits with non-zero after wait loop | packaged smoke run stderr / exit code |
| macOS Electron provider secret read happens after app rebuild | Keychain path remains responsive and avoids `safeStorage` main-process hangs | packaged app restart smoke with saved provider |
| `safeStorage` is unavailable in non-macOS Electron session | provider secret read/write throws explicit error | manual provider save path |
| External URL navigation occurs | in-app navigation is denied, URL opens externally | manual smoke click path |
| `AI_SPACE_DESKTOP_SHELL` is not set | readiness install payload regresses to local-browser-server mode | `/api/app/readiness` smoke assertion |

### 5. Good / Base / Bad Cases

#### Good

- `npm test` passes.
- `npm run validate:electron` passes.
- `npm run package:mac` produces `product/build/electron/mac-arm64/AI OS.app`.
- On Intel macOS hosts, the open path switches to `product/build/electron/mac/AI OS.app`.
- Launching the packaged binary with `AI_SPACE_APP_PORT=<fixed>` responds on `/api/app/readiness`.
- The packaged app window renders the Start dashboard without a white screen.

#### Base

- Windows packaging is statically validated from macOS through `validate:electron`.
- App remains unsigned and unnotarized for local use.
- Legacy WebKit packaging remains available only as `npm run package:mac:webkit`.

#### Bad

- Changing `package:mac` without updating readiness/docs/tests.
- Changing resource output paths without updating `openCommand`.
- Enabling `nodeIntegration` or disabling `sandbox`.
- Moving runtime package copies out of `extraResources` without updating module resolution.

### 6. Tests Required

- `cd product && npm test`
  - Assert scripts, builder config, Electron entry, after-pack hook, and readiness copy stay in sync.
- `cd product && npm run validate:electron`
  - Assert `main`, Electron dependencies, app directory, appId, targets, and copied resources.
- `cd product && npm ci --ignore-scripts --dry-run`
  - Assert lockfile/install graph is consistent.
- `cd product && npm run package:mac`
  - Assert macOS dir packaging succeeds on the host.
- `cd product && npm run package:win` on Windows hosts
  - Assert installer and unpacked Windows outputs are created.
- Packaged smoke:
  - Launch `build/electron/mac-arm64/AI OS.app/Contents/MacOS/AI OS` with fixed `AI_SPACE_APP_PORT` and isolated `AI_SPACE_STORAGE_DIR`.
  - Assert `curl http://127.0.0.1:<port>/api/app/readiness` returns `install.mode = electron-cross-platform`.
  - Assert the window shows Start/Settings content instead of a blank renderer.

### 7. Wrong vs Correct

#### Wrong

- Make Electron the product shell in `package.json`, but leave `/api/app/readiness` and docs describing the legacy WebKit path.
- Change builder output to `build/desktop` or a different host path but keep UI, docs, and tests pointing at stale `build/electron/...` paths.
- Launch the server in Electron without waiting for readiness, causing intermittent white screens.

#### Correct

- Treat package scripts, builder config, readiness payload, docs, UI hints, and regression tests as one contract, including host-specific macOS and Windows install guidance.
- Gate window load on `/api/app/readiness`.
- Preserve secure BrowserWindow defaults and explicit external-navigation handling.
