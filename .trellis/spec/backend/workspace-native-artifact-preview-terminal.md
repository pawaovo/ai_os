# Workspace Native Artifact Preview Terminal

> Executable contract for workspace-native artifact preview and terminal summary surfaces.

## Scenario: Workspace Surface Projection

### 1. Scope / Trigger

- Trigger: changing `product/apps/space-desktop/scripts/dev-server.mjs` workspace runtime projection.
- Trigger: changing `product/apps/space-desktop/src/browser.ts` workspace surface rendering.
- Trigger: changing `product/apps/space-desktop/public/index.html` workspace surface DOM anchors.
- Trigger: changing tests for workspace-scoped artifact preview or terminal summary.

This scenario is cross-layer because artifact preview and terminal summary are derived from backend runtime projection and rendered into the workspace UI.

### 2. Signatures

#### Workspace Runtime Fields

```ts
interface WorkspaceRuntimeSummary {
  artifactPreview?: {
    artifactId: string;
    title: string;
    kind: string;
    source: string;
    updatedAt: string;
    contentPreview: string;
  };
  terminal?: {
    cwd: string;
    preview: string;
    gitAvailable: boolean;
    dirty: boolean;
    branch?: string;
  };
}
```

#### Required DOM Anchors

- `#workspace-surface-title`
- `#workspace-surface-help`
- `#workspace-artifact-surface-title`
- `#workspace-artifact-surface-meta`
- `#workspace-artifact-surface-preview`
- `#workspace-terminal-surface-title`
- `#workspace-terminal-surface-meta`
- `#workspace-terminal-surface-preview`

### 3. Contracts

- Artifact preview and terminal summary must stay workspace-scoped.
- First step must remain additive:
  - no PTY
  - no command execution
  - no new runtime persistence table
- `artifactPreview` must be derived from the latest artifact already visible to the workspace runtime.
- `contentPreview` must be bounded text suitable for immediate UI rendering.
- `terminal.preview` must be a read-only terminal-style summary.
- When git metadata is unavailable, terminal summary must still expose `cwd` and a clear fallback message instead of failing.
- Detailed artifact preview and terminal summary must only be returned for the active workspace in `/api/workspaces`; other workspace summaries may omit these detailed fields.

### 4. Validation & Error Matrix

| Condition | Expected Behavior | Validation Point |
| --- | --- | --- |
| Active workspace has no artifacts | artifact surface shows empty/default state | renderer workspace surface |
| Active workspace has artifacts | latest artifact preview is shown | `space-desktop.test.mjs` |
| Active workspace path is a git repo | terminal summary shows cwd, branch, git status preview | `space-desktop.test.mjs` |
| Active workspace path is not a git repo | terminal summary still shows cwd and fallback text | backend helper fallback |
| Another workspace exists | detailed preview/terminal fields do not leak into inactive workspace summaries | `space-desktop.test.mjs` |

### 5. Good / Base / Bad Cases

#### Good

- Active workspace shows a useful latest artifact preview without navigating to the artifact library.
- Active workspace shows a local terminal-style summary without pretending it is interactive.
- Inactive workspaces keep lightweight runtime summaries only.

#### Base

- First step uses current artifact storage and current local path/git inspection.
- Renderer stays read-only.

#### Bad

- Rebuilding artifact preview in the browser from a second artifact query path.
- Returning full terminal/process control when the product only supports summary mode.
- Leaking active workspace artifact or git details into other workspace summaries.

### 6. Tests Required

- `cd product && node --test tests/space-desktop.test.mjs`
  - assert workspace surface DOM anchors
  - assert artifact preview and terminal summary for active workspace
  - assert inactive workspace does not get detailed surface payload
- `cd product && npm test`
  - full regression

### 7. Wrong vs Correct

#### Wrong

- Add a fake terminal widget that suggests command execution support.
- Return full artifact content with no preview bounds.
- Project detailed preview and terminal summary for every workspace on every list fetch.

#### Correct

- Project a bounded latest artifact preview and a read-only terminal summary for the active workspace.
- Reuse current workspace runtime contract as the single source of truth.
- Keep the surface thin so later interactive terminal work can extend it without breaking the current contract.
