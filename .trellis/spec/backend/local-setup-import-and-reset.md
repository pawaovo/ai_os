# Local Setup Import And Reset

> Executable contract for backend-owned local setup discovery, provider import from Codex config, and safe local data reset.

## Scenario: Local Discovery And Cleanup

### 1. Scope / Trigger

- Trigger: changing `/api/local-setup`.
- Trigger: changing `/api/local-setup/import`.
- Trigger: changing `/api/local-data/reset`.
- Trigger: changing local Codex discovery logic or reset semantics in `product/apps/space-desktop/scripts/dev-server.mjs`.

### 2. Signatures

#### Product APIs

```ts
GET /api/local-setup
POST /api/local-setup/import
POST /api/local-data/reset
```

#### Discovery Shape

```ts
interface LocalSetupDiscoverySummary {
  executors: {
    codex: LocalSetupCommandSummary;
    "claude-code": LocalSetupCommandSummary;
  };
  providerImport: {
    source: "codex-provider";
    available: boolean;
    detail: string;
    name?: string;
    protocol?: "openai-compatible" | "anthropic-compatible";
    baseUrl?: string;
    modelId?: string;
    apiKeyPreview?: string;
  };
  localData: {
    counts: {
      workspaces: number;
      providers: number;
      threads: number;
      runs: number;
      artifacts: number;
      approvals: number;
      automations: number;
      automationRuns: number;
      memories: number;
      recipes: number;
      recipeTests: number;
      capabilityRuns: number;
      orchestrations: number;
      remoteSessions: number;
      mailboxItems: number;
    };
    generatedCount: number;
    profileCount: number;
  };
}
```

#### Reset Input

```ts
interface LocalDataResetInput {
  mode: "generated-data" | "profile";
  confirmText: "delete-local-data";
}
```

### 3. Contracts

- Local setup discovery must remain backend-owned.
- The renderer must not read `~/.codex` directly.
- Discovery may use:
  - local CLI command lookup
  - local Codex config file
  - local Codex auth file
- Discovery must support `AI_OS_LOCAL_CODEX_HOME` override for deterministic automated tests.
- Provider import must read the raw key only on the backend and persist it through the existing secret-store path.
- Provider import should reuse an existing provider record when the discovered protocol/base URL/model match.
- `generated-data` reset must clear generated operational records only:
  - threads/messages
  - runs/events/approvals
  - artifacts
  - automations and automation runs
  - memories
  - recipes and recipe tests
  - capability runs
  - agent orchestrations
  - remote bridge sessions/events
  - mailbox items
- `profile` reset may additionally clear:
  - providers
  - workspaces
  - active selections
  - global MCP config setting
- Both reset modes must preserve:
  - current UI language
  - built-in capability definitions
- Reset actions must require explicit confirmation text in the API input.

### 4. Validation & Error Matrix

| Condition | Expected Behavior | Validation Point |
| --- | --- | --- |
| Test override Codex home contains importable config | discovery returns import-ready provider metadata | `space-desktop.test.mjs` |
| Local setup import is triggered | provider is saved and API key preview is returned, not raw key | `space-desktop.test.mjs` |
| Generated-data reset is triggered | generated records clear while providers/workspaces remain | `space-desktop.test.mjs` |
| Profile reset is triggered | providers/workspaces clear and counts return to zero | `space-desktop.test.mjs` |
| Confirmation text is missing or wrong | reset request fails | endpoint validation |

### 5. Good / Base / Bad Cases

#### Good

- The backend can detect local Codex-compatible provider metadata without leaking secrets.
- The product can clean up local test/demo data safely.

#### Base

- Discovery is intentionally narrow and focused on Codex-compatible local config first.

#### Bad

- Reading local config in the renderer.
- Returning raw API keys from discovery or import.
- Letting reset behavior silently wipe user data without explicit confirmation.

### 6. Tests Required

- `cd product && npm test`
  - assert static references to local setup/reset APIs
  - assert Codex config import flow with overridden local Codex home
  - assert generated-data reset behavior
  - assert profile reset behavior
- Packaged smoke:
  - assert packaged app can still discover local CLI availability
  - assert reset flow leaves packaged profile in a consistent state

### 7. Wrong vs Correct

#### Wrong

- Add a local import button that expects the browser to read `~/.codex/config.toml`.
- Implement one destructive reset path with no distinction between generated data and full profile reset.

#### Correct

- Keep discovery/import/reset as explicit backend operations.
- Distinguish safe generated-data cleanup from full profile reset.
