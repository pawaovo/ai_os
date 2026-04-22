# Multi Agent Product Surface

> Executable contract for the first additive Agents product surface in the local-first desktop app.

## Scenario: Agents Governance Overview MVP

### 1. Scope / Trigger

- Trigger: changing `product/apps/space-desktop/public/index.html` Agents sections.
- Trigger: changing `product/apps/space-desktop/src/browser.ts` orchestration page logic.
- Trigger: changing `product/apps/space-desktop/src/i18n.ts` orchestration page copy.
- Trigger: changing orchestration surface tests in `product/tests/space-desktop.test.mjs`.

### 2. Signatures

#### Navigation

- new page target: `agents`

#### Required DOM ids

- `multi-agent-governance-title`
- `multi-agent-governance-summary`
- `multi-agent-governance-counts`
- `multi-agent-governance-attention-title`
- `multi-agent-governance-attention`
- `multi-agent-governance-attention-help`
- `multi-agent-governance-activity-title`
- `multi-agent-governance-activity`
- `multi-agent-governance-activity-help`
- `agent-orchestration-form-title`
- `agent-orchestration-form`
- `agent-orchestration-goal-input`
- `agent-orchestration-start-button`
- `agent-orchestration-form-help`
- `agent-orchestration-status`
- `agent-orchestration-detail-title`
- `agent-orchestration-current-goal`
- `agent-orchestration-current-summary`
- `agent-orchestration-meta-list`
- `agent-task-title`
- `agent-task-list`
- `agent-task-help`
- `agent-orchestration-list-title`
- `agent-orchestration-list`
- `agent-orchestration-list-help`

#### Frontend API Calls

```ts
GET /api/multi-agent-governance
GET /api/agent-orchestrations
POST /api/agent-orchestrations/start
GET /api/agent-orchestrations/:id
```

### 3. Contracts

- Agents surface must remain additive to current navigation.
- First surface stays local-first:
  - no canvas
  - no mailbox editor
  - no remote control center
- Frontend must render backend governance summary as-is for the top-level overview.
- Frontend must not rebuild governance counts, attention, or recent activity by scanning other frontend state.
- Current orchestration detail, orchestration history, mailbox timeline, and Settings-side remote bridge detail may remain separate read-only detail surfaces.
- Task child runs must reuse existing Runs page instead of duplicating run detail UI.
- Starting an orchestration only needs a single goal field in MVP.
- When an orchestration is active and non-terminal, frontend may poll `GET /api/agent-orchestrations/:id`.
- Translation keys for Agents must exist in both English and Chinese.
- Governance surface must keep working when the active workspace changes or when the UI language changes.

### 4. Validation & Error Matrix

| Condition | Expected Behavior | Validation Point |
| --- | --- | --- |
| No governance data exists yet | overview shows zero-count and empty-state copy instead of blank panel | `space-desktop.test.mjs` + manual UI smoke |
| Governance summary request fails | overview shows failure help text but current orchestration / mailbox detail can still render independently | browser runtime behavior |
| No orchestration exists | list and detail areas show empty-state copy | `space-desktop.test.mjs` + manual UI smoke |
| Start orchestration succeeds | Agents page opens, active orchestration detail renders, polling begins | manual UI smoke |
| Active orchestration has child run ids | task items expose open-run buttons that reuse existing run detail flow | manual UI smoke |
| Workspace changes | governance overview, orchestration history, and mailbox reflect the newly selected workspace | `space-desktop.test.mjs` |
| Language changes | overview labels and server-backed summary text re-render in the selected language | renderer smoke with `/api/settings/language` |

### 5. Good / Base / Bad Cases

#### Good

- User sees one top-level governance overview before drilling into orchestration detail.
- User can start a local orchestration from one goal.
- User can see current status, key counts, attention items, recent activity, task list, runtime assignment, and child run linkage.
- User can jump straight into the existing Runs view for a child run.

#### Base

- First page is intentionally compact, summary-driven, and read-only at the governance layer.

#### Bad

- Building a second run-detail panel under Agents.
- Reconstructing governance state in frontend code from orchestration, mailbox, remote bridge, and approval endpoints.
- Reconstructing orchestration state by scanning all runs in frontend code.
- Introducing remote/team UI before local orchestration is stable.

### 6. Tests Required

- `cd product && npm test`
  - assert governance overview DOM ids
  - assert browser source consumes `/api/multi-agent-governance`
  - assert bilingual governance translation keys exist
  - assert static Agents page ids
  - assert governance and orchestration APIs integrate with page assumptions
- Packaged smoke:
  - assert packaged `/` includes Agents nav, governance overview ids, and core orchestration ids

### 7. Wrong vs Correct

#### Wrong

- Add an Agents nav item but leave no working governance overview or task detail surface.
- Duplicate live run transcript and event log inside the Agents page.

#### Correct

- Add one compact Agents page that starts orchestrations, shows a backend-owned governance overview first, and deep-links child runs into the existing Runs experience.
