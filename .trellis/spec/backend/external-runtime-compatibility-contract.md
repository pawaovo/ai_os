# External Runtime Compatibility Contract

> Executable contract for expressing current external runtime capability gaps before Agent Hub work begins.

## Scenario: External Runtime Compatibility

### 1. Scope / Trigger

- Trigger: changing `product/packages/executors/executor-protocol/src/index.ts`.
- Trigger: changing Codex or Claude executor runtime status behavior.
- Trigger: changing `/api/executors` product API output.
- Trigger: changing executor compatibility UI or tests.

### 2. Signatures

#### Shared Contract

```ts
interface ExternalRuntimeCompatibility {
  family: "executor";
  runtime: string;
  transport: "process-cli" | "embedded" | "app-server-jsonrpc" | "remote-bridge";
  sessionModel: "in-process" | "ephemeral-process" | "managed-session";
  capabilities: {
    approvalBridge: "none" | "product-pre-run" | "runtime-native";
    artifactCollection: "none" | "fallback-only" | "native";
    sessionContinuation: "none" | "product-pre-run" | "native";
    interrupt: boolean;
    cwd: boolean;
    timeout: boolean;
  };
  limitations?: string[];
}
```

#### Product API

`GET /api/executors` must expose additive compatibility data for each runtime.

### 3. Contracts

- Compatibility must be additive to current executor status, not a second runtime registry.
- The contract must describe real current behavior, not aspirational behavior.
- Product and UI must consume compatibility metadata instead of guessing support from executor names.
- Codex and Claude process adapters must declare:
  - `transport = process-cli`
  - runtime approval bridge is not yet native
  - artifact collection is currently fallback-only
  - session continuation is currently product-pre-run only
- Process-adapter runner failures should still normalize into terminal `run.failed` events when possible, so product-layer failed runs can preserve event history and fallback transcript artifacts instead of aborting the entire run pipeline.
- Mock executor may declare richer local support, but it must stay clearly identified as embedded.

### 4. Validation & Error Matrix

| Condition | Expected Behavior | Validation Point |
| --- | --- | --- |
| Mock executor listed | compatibility shows embedded/native artifact support | `space-desktop.test.mjs` |
| Codex listed | compatibility shows process-cli and fallback-only artifact collection | `space-desktop.test.mjs` |
| Claude listed | compatibility shows product-pre-run continuation semantics | `space-desktop.test.mjs` |
| Real process run fails after partial output | terminal `run.failed` event is still emitted and product fallback artifacts can persist | adapter tests + product smoke |

### 5. Good / Base / Bad Cases

#### Good

- Product can describe runtime capability gaps without adding Agent Hub first.
- Compatibility information reflects real adapter support.
- Failed real executor runs still stay observable through normal product history and transcript fallback paths.

#### Base

- Current runtimes remain mock, codex, and claude-code.

#### Bad

- Pretending runtime approval bridge or artifact collection is fully native when it is not.
- Making Agent Hub define runtime compatibility indirectly.

### 6. Tests Required

- `cd product && node --test tests/space-desktop.test.mjs`
  - assert compatibility shape on `/api/executors`
  - assert process adapter failures normalize into terminal failure events
- `cd product && npm test`

### 7. Wrong vs Correct

#### Wrong

- Keep runtime support implicit and name-based only.
- Claim support in product flows that the adapters do not really provide.

#### Correct

- Encode current compatibility gaps explicitly.
- Let later Agent Hub and remote bridge layers consume this contract.
