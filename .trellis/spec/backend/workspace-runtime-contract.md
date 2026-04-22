# Workspace Runtime Contract

> Executable contract for the AI OS workspace runtime summary exposed by the product layer.

## Scenario: Workspace Runtime Summary

### 1. Scope / Trigger

- Trigger: changing `product/apps/space-desktop/scripts/dev-server.mjs` workspace list or workspace summary payloads.
- Trigger: changing `product/apps/space-desktop/src/browser.ts` workspace runtime rendering.
- Trigger: changing `product/apps/space-desktop/public/index.html` workspace runtime DOM anchors.
- Trigger: changing tests that assert workspace-scoped runtime state.

This scenario is cross-layer because the workspace runtime summary is derived from persisted product objects, projected through HTTP JSON, and rendered into the workspace UI.

### 2. Signatures

#### Renderer Fetch

```ts
await apiJson<{
  activeWorkspaceId?: string;
  workspaces: WorkspaceSummary[];
}>("/api/workspaces");
```

#### Required Workspace Summary Shape

```ts
interface WorkspaceSummary {
  id: string;
  name: string;
  path?: string;
  trustLevel: "strict" | "trusted-local-writes";
  createdAt: string;
  updatedAt: string;
  runtime?: WorkspaceRuntimeSummary;
}

interface WorkspaceRuntimeSummary {
  counts: {
    threads: number;
    runs: number;
    activeRuns: number;
    artifacts: number;
    memories: number;
    automations: number;
  };
  latestActivityAt?: string;
  activeThread?: {
    id: string;
    title: string;
    messageCount: number;
    lastMessagePreview?: string;
  };
  currentRun?: {
    runId: string;
    sessionId: string;
    status: string;
    currentTurn: {
      turnId: string;
      status: string;
      latestEventType: string;
    };
    queryLoop: {
      phase: string;
      lastFailureSite?: string;
    };
    pendingApproval?: {
      approvalId: string;
      stage: string;
    };
  };
  latestRun?: {
    id: string;
    goal: string;
    status: string;
    startedAt: string;
    completedAt?: string;
  };
  latestArtifact?: {
    id: string;
    title: string;
    kind: string;
    updatedAt: string;
  };
  surfaces: {
    localPathBound: boolean;
    artifactPreviewReady: boolean;
    runHistoryReady: boolean;
    memoryReady: boolean;
    automationReady: boolean;
    terminalCandidate: boolean;
  };
}
```

#### Required DOM Anchors

- `#workspace-runtime-title`
- `#workspace-runtime-list`
- `#workspace-runtime-help`

### 3. Contracts

- `WorkspaceRuntimeSummary` must be derived from existing workspace-scoped product objects; it must not require a separate runtime table for the first P1 step.
- `/api/workspaces` must remain additive. Existing workspace selection flows must continue working if the renderer ignores `runtime`.
- `counts` must stay workspace-scoped:
  - `threads` from workspace threads
  - `runs` and `activeRuns` from workspace runs
  - `artifacts` from workspace artifacts
  - `memories` from workspace memories
  - `automations` from workspace automations
- `currentRun` must project the current live non-terminal run session for the workspace when one exists, reusing existing P0 run session fields instead of inventing a second live-run model.
- `latestRun` and `latestArtifact` must come from persisted workspace objects, not renderer-local heuristics.
- `surfaces` must describe whether key workspace-native runtime surfaces are currently available from the existing product state.
- The renderer must render workspace runtime summary from backend payloads, not by re-querying each object type just to rebuild the same contract client-side.

### 4. Validation & Error Matrix

| Condition | Expected Behavior | Validation Point |
| --- | --- | --- |
| No active workspace exists | workspace runtime list renders empty/default state | renderer `renderWorkspaceRuntime()` |
| Active workspace has persisted objects only | runtime shows counts and latest pointers without `currentRun` | `space-desktop.test.mjs` persistence path |
| Active workspace has a live non-terminal run | runtime includes `currentRun` with query-loop state | `space-desktop.test.mjs` approval path |
| Switching workspace | runtime summary changes to the selected workspace scope only | renderer workspace selection flow |
| Another workspace has objects | counts and pointers do not leak into the active workspace runtime card | `space-desktop.test.mjs` multi-workspace assertions |
| Renderer ignores `runtime` | workspace create/select/update flow remains functional | additive contract requirement |

### 5. Good / Base / Bad Cases

#### Good

- Workspace panel shows a stable runtime summary for the active workspace.
- Live non-terminal runs appear as `currentRun` in the workspace runtime summary.
- Restarted sessions can still show persisted `latestRun` and `latestArtifact` even without a live session.

#### Base

- Workspace runtime summary is additive and local-first.
- First step uses existing object tables and in-memory live sessions.

#### Bad

- Duplicating workspace runtime state into a second persistence model before continuation work begins.
- Making the renderer rebuild workspace runtime from many unrelated endpoints after the backend already provides it.
- Letting workspace-scoped counts or pointers leak across workspaces.

### 6. Tests Required

- `cd product && node --test tests/space-desktop.test.mjs`
  - Assert workspace runtime DOM anchors exist.
  - Assert workspace runtime summary appears in `/api/workspaces`.
  - Assert live approval path exposes `currentRun`.
  - Assert persisted multi-workspace counts stay scoped.
- `cd product && npm test`
  - Catch source and integration drift with the rest of the product shell.

### 7. Wrong vs Correct

#### Wrong

- Add workspace runtime UI by stitching together threads, runs, artifacts, memories, and automations in the browser only.
- Add a new runtime table before the existing workspace-scoped objects are projected consistently.
- Define a live run projection in workspace runtime that disagrees with the existing P0 session contract.

#### Correct

- Project a stable `WorkspaceRuntimeSummary` from existing persisted objects plus current live run session state.
- Keep the contract additive and renderer-consumable.
- Treat workspace runtime as the first P1 contract that later continuation, preview, Prompt App, and MCP work must follow.
