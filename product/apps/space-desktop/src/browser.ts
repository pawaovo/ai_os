import {
  createInitialSpaceDemoState,
  type SpaceDemoExecutorChoice,
  type SpaceDemoState,
} from "./demo-runtime.js";
import type { ChatUiMessage } from "./server-runtime.js";
import type { ApprovalRecord, WorkspaceTrustLevel } from "@ai-os/approval-core";
import type { CapabilityPermission, CapabilityRecord, CapabilityRunRecord, RecipeRecord, RecipeTestRecord } from "@ai-os/capability-contract";
import type { MemoryRecord, MemoryScope, MemorySensitivity, RetrievedMemory } from "@ai-os/kernel-memory";

type ProviderProtocol = "openai-compatible" | "anthropic-compatible";

interface ProviderSummary {
  id?: string;
  name: string;
  protocol: ProviderProtocol;
  baseUrl: string;
  apiKeyPreview: string;
  modelId: string;
}

interface WorkspaceSummary {
  id: string;
  name: string;
  path?: string;
  trustLevel: WorkspaceTrustLevel;
  createdAt: string;
  updatedAt: string;
}

interface ThreadSummary {
  id: string;
  title: string;
  messageCount: number;
  workspaceId?: string;
  lastMessagePreview?: string;
}

interface ArtifactSummary {
  id: string;
  title: string;
  kind: string;
  content: string;
  path?: string;
  workspaceId?: string;
  threadId?: string;
  runId?: string;
  source: "manual" | "chat" | "run" | string;
  createdAt: string;
  updatedAt: string;
}

interface RunSummary {
  id: string;
  goal: string;
  executorChoice: string;
  status: string;
  workspaceId?: string;
  threadId?: string;
  startedAt: string;
  completedAt?: string;
}

interface RunEventSummary {
  id: string;
  runId: string;
  type: string;
  message: string;
  createdAt: string;
  approvalId?: string;
}

interface ExecutorStatusSummary {
  choice: SpaceDemoExecutorChoice;
  available: boolean;
  message: string;
}

type ReadinessStatus = "ready" | "action" | "optional";

interface AppReadinessCheck {
  id: string;
  title: string;
  status: ReadinessStatus;
  detail: string;
  targetPage: string;
}

interface AppReadinessSummary {
  version: string;
  releaseName: string;
  layout: string;
  storageRoot: string;
  generatedAt: string;
  activeWorkspace?: {
    id: string;
    name: string;
    trustLevel: WorkspaceTrustLevel;
  };
  activeProvider?: {
    id?: string;
    name: string;
    protocol: ProviderProtocol;
    modelId: string;
    apiKeyPreview: string;
  };
  counts: {
    workspaces: number;
    providers: number;
    threads: number;
    messages: number;
    runs: number;
    completedRuns: number;
    artifacts: number;
    pendingApprovals: number;
    automations: number;
    automationRuns: number;
    memories: number;
    capabilities: number;
    enabledCapabilities: number;
    recipes: number;
    exportedRecipes: number;
    recipeTests: number;
  };
  executors: ExecutorStatusSummary[];
  checks: AppReadinessCheck[];
  nextActions: string[];
  install: {
    mode: string;
    appName: string;
    signed: boolean;
    notarized: boolean;
    nodeRequired: boolean;
    buildCommand: string;
    openCommand: string;
    storageRoot: string;
    note: string;
  };
}

interface AutomationSummary {
  id: string;
  title: string;
  kind: "one-off" | "scheduled" | "heartbeat";
  prompt: string;
  status: "active" | "paused";
  workspaceId?: string;
  intervalMs?: number;
  nextRunAt?: string;
  lastRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface AutomationRunSummary {
  id: string;
  automationId: string;
  workspaceId?: string;
  status: string;
  result?: string;
  artifactId?: string;
  startedAt: string;
  completedAt?: string;
}

interface MemorySummary extends MemoryRecord {}

interface CapabilitySummary extends CapabilityRecord {}
interface RecipeSummary extends RecipeRecord {}
interface RecipeTestSummary extends RecipeTestRecord {}

interface LiveRunState {
  runId: string;
  goal: string;
  executorChoice: SpaceDemoExecutorChoice;
  status: string;
  stream: string[];
  events: RunEventSummary[];
  artifacts: ArtifactSummary[];
  artifactContents: Record<string, string>;
  pendingApproval?: {
    approvalId: string;
    reason: string;
    category?: string;
    riskLevel?: string;
    requestedAction?: string;
    decision?: string;
    resolvedAt?: string;
  };
  memoryUsage?: RetrievedMemory[];
  completedAt?: string;
  timeoutMs?: number;
}

const state = {
  current: createInitialSpaceDemoState(),
  providers: [] as ProviderSummary[],
  workspaces: [] as WorkspaceSummary[],
  artifacts: [] as ArtifactSummary[],
  runs: [] as RunSummary[],
  runEvents: [] as RunEventSummary[],
  approvals: [] as ApprovalRecord[],
  automations: [] as AutomationSummary[],
  automationRuns: [] as AutomationRunSummary[],
  memories: [] as MemorySummary[],
  capabilities: [] as CapabilitySummary[],
  capabilityRuns: [] as CapabilityRunRecord[],
  recipes: [] as RecipeSummary[],
  recipeTests: [] as RecipeTestSummary[],
  memoryUsage: [] as RetrievedMemory[],
  executorStatuses: [] as ExecutorStatusSummary[],
  appReadiness: undefined as AppReadinessSummary | undefined,
  liveRun: undefined as LiveRunState | undefined,
  runPoller: undefined as number | undefined,
  activeThreadId: undefined as string | undefined,
  activeProviderId: undefined as string | undefined,
  activeWorkspaceId: undefined as string | undefined,
  activeArtifactId: undefined as string | undefined,
  activeArtifact: undefined as ArtifactSummary | undefined,
  activeRunId: undefined as string | undefined,
  activeCapabilityId: undefined as string | undefined,
  activeRecipeId: undefined as string | undefined,
  activePage: "start",
  chatMessages: [
    {
      role: "system",
      content: "Create or select a workspace, configure a provider, then send a real chat message.",
    },
  ] as ChatUiMessage[],
};

const elements = {
  navButtons: Array.from(document.querySelectorAll<HTMLButtonElement>("[data-page-target]")),
  pageSections: Array.from(document.querySelectorAll<HTMLElement>(".page-section")),
  activeWorkspaceLabel: getElement("active-workspace-label", HTMLElement),
  appReadinessStatus: getElement("app-readiness-status", HTMLElement),
  appReadinessList: getElement("app-readiness-list", HTMLElement),
  appReadinessHelp: getElement("app-readiness-help", HTMLElement),
  startActionList: getElement("start-action-list", HTMLElement),
  metricThreadCount: getElement("metric-thread-count", HTMLElement),
  metricRunCount: getElement("metric-run-count", HTMLElement),
  metricArtifactCount: getElement("metric-artifact-count", HTMLElement),
  metricCapabilityCount: getElement("metric-capability-count", HTMLElement),
  installStatusList: getElement("install-status-list", HTMLElement),
  installHelp: getElement("install-help", HTMLElement),
  workspaceForm: getElement("workspace-form", HTMLFormElement),
  workspaceSelect: getElement("workspace-select", HTMLSelectElement),
  workspaceName: getElement("workspace-name", HTMLInputElement),
  workspacePath: getElement("workspace-path", HTMLInputElement),
  workspaceTrustLevel: getElement("workspace-trust-level", HTMLSelectElement),
  workspaceSaveButton: getElement("workspace-save-button", HTMLButtonElement),
  workspaceUpdateButton: getElement("workspace-update-button", HTMLButtonElement),
  workspaceDeleteButton: getElement("workspace-delete-button", HTMLButtonElement),
  workspaceHelp: getElement("workspace-help", HTMLElement),
  providerForm: getElement("provider-form", HTMLFormElement),
  providerSelect: getElement("provider-select", HTMLSelectElement),
  providerName: getElement("provider-name", HTMLInputElement),
  providerProtocol: getElement("provider-protocol", HTMLSelectElement),
  providerBaseUrl: getElement("provider-base-url", HTMLInputElement),
  providerApiKey: getElement("provider-api-key", HTMLInputElement),
  providerModelSelect: getElement("provider-model-select", HTMLSelectElement),
  providerModel: getElement("provider-model", HTMLInputElement),
  providerSaveButton: getElement("provider-save-button", HTMLButtonElement),
  providerTestButton: getElement("provider-test-button", HTMLButtonElement),
  providerModelsButton: getElement("provider-models-button", HTMLButtonElement),
  providerDeleteButton: getElement("provider-delete-button", HTMLButtonElement),
  providerStatus: getElement("provider-status", HTMLElement),
  providerHelp: getElement("provider-help", HTMLElement),
  threadSelect: getElement("thread-select", HTMLSelectElement),
  threadNewButton: getElement("thread-new-button", HTMLButtonElement),
  threadRenameButton: getElement("thread-rename-button", HTMLButtonElement),
  threadDeleteButton: getElement("thread-delete-button", HTMLButtonElement),
  threadHelp: getElement("thread-help", HTMLElement),
  chatForm: getElement("chat-form", HTMLFormElement),
  chatInput: getElement("chat-input", HTMLTextAreaElement),
  chatSendButton: getElement("chat-send-button", HTMLButtonElement),
  chatMessages: getElement("chat-messages", HTMLElement),
  form: getElement("goal-form", HTMLFormElement),
  input: getElement("goal-input", HTMLTextAreaElement),
  executor: getElement("executor-select", HTMLSelectElement),
  executorTimeoutInput: getElement("executor-timeout-input", HTMLInputElement),
  runButton: getElement("run-button", HTMLButtonElement),
  runCancelButton: getElement("run-cancel-button", HTMLButtonElement),
  statusPill: getElement("status-pill", HTMLElement),
  transcript: getElement("transcript", HTMLElement),
  eventLog: getElement("event-log", HTMLElement),
  runArtifactList: getElement("run-artifact-list", HTMLElement),
  runArtifactPreview: getElement("run-artifact-preview", HTMLElement),
  runSummary: getElement("run-summary", HTMLElement),
  missionMeta: getElement("mission-meta", HTMLElement),
  approvalPanel: getElement("approval-panel", HTMLElement),
  approvalStatus: getElement("approval-status", HTMLElement),
  approvalCategory: getElement("approval-category", HTMLElement),
  approvalRiskLevel: getElement("approval-risk-level", HTMLElement),
  approvalRequestedAction: getElement("approval-requested-action", HTMLElement),
  approvalDecision: getElement("approval-decision", HTMLElement),
  approvalResolvedAt: getElement("approval-resolved-at", HTMLElement),
  approvalReason: getElement("approval-reason", HTMLElement),
  approvalGrantButton: getElement("approval-grant-button", HTMLButtonElement),
  approvalRejectButton: getElement("approval-reject-button", HTMLButtonElement),
  executorStatusList: getElement("executor-status-list", HTMLElement),
  executorStatusHelp: getElement("executor-status-help", HTMLElement),
  runHistoryList: getElement("run-history-list", HTMLElement),
  runHistoryHelp: getElement("run-history-help", HTMLElement),
  runEventHistory: getElement("run-event-history", HTMLElement),
  approvalHistoryList: getElement("approval-history-list", HTMLElement),
  approvalHistoryHelp: getElement("approval-history-help", HTMLElement),
  memoryForm: getElement("memory-form", HTMLFormElement),
  memoryTitleInput: getElement("memory-title-input", HTMLInputElement),
  memoryScope: getElement("memory-scope", HTMLSelectElement),
  memorySensitivity: getElement("memory-sensitivity", HTMLSelectElement),
  memoryContent: getElement("memory-content", HTMLTextAreaElement),
  memorySaveButton: getElement("memory-save-button", HTMLButtonElement),
  memoryList: getElement("memory-list", HTMLElement),
  memoryHelp: getElement("memory-help", HTMLElement),
  memoryUsageList: getElement("memory-usage-list", HTMLElement),
  memoryUsageHelp: getElement("memory-usage-help", HTMLElement),
  capabilityList: getElement("capability-list", HTMLElement),
  capabilityHelp: getElement("capability-help", HTMLElement),
  capabilityStatus: getElement("capability-status", HTMLElement),
  capabilityDescription: getElement("capability-description", HTMLElement),
  capabilityPermissionList: getElement("capability-permission-list", HTMLElement),
  capabilityToggleButton: getElement("capability-toggle-button", HTMLButtonElement),
  capabilityRunButton: getElement("capability-run-button", HTMLButtonElement),
  capabilityRunList: getElement("capability-run-list", HTMLElement),
  capabilityRunHelp: getElement("capability-run-help", HTMLElement),
  forgeRunSelect: getElement("forge-run-select", HTMLSelectElement),
  forgeCreateButton: getElement("forge-create-button", HTMLButtonElement),
  forgeHelp: getElement("forge-help", HTMLElement),
  recipeList: getElement("recipe-list", HTMLElement),
  recipeForm: getElement("recipe-form", HTMLFormElement),
  recipeStatus: getElement("recipe-status", HTMLElement),
  recipeTitleInput: getElement("recipe-title-input", HTMLInputElement),
  recipePromptInput: getElement("recipe-prompt-input", HTMLTextAreaElement),
  recipeInputSpec: getElement("recipe-input-spec", HTMLTextAreaElement),
  recipeOutputSpec: getElement("recipe-output-spec", HTMLTextAreaElement),
  recipeSaveButton: getElement("recipe-save-button", HTMLButtonElement),
  recipeTestButton: getElement("recipe-test-button", HTMLButtonElement),
  recipeExportButton: getElement("recipe-export-button", HTMLButtonElement),
  recipeTestPreview: getElement("recipe-test-preview", HTMLElement),
  recipeTestList: getElement("recipe-test-list", HTMLElement),
  recipeTestHelp: getElement("recipe-test-help", HTMLElement),
  automationForm: getElement("automation-form", HTMLFormElement),
  automationTitleInput: getElement("automation-title-input", HTMLInputElement),
  automationKind: getElement("automation-kind", HTMLSelectElement),
  automationIntervalInput: getElement("automation-interval-input", HTMLInputElement),
  automationPrompt: getElement("automation-prompt", HTMLTextAreaElement),
  automationSaveButton: getElement("automation-save-button", HTMLButtonElement),
  automationTickButton: getElement("automation-tick-button", HTMLButtonElement),
  automationList: getElement("automation-list", HTMLElement),
  automationHelp: getElement("automation-help", HTMLElement),
  automationRunList: getElement("automation-run-list", HTMLElement),
  automationRunHelp: getElement("automation-run-help", HTMLElement),
  artifactForm: getElement("artifact-form", HTMLFormElement),
  artifactSelect: getElement("artifact-select", HTMLSelectElement),
  artifactOpenButton: getElement("artifact-open-button", HTMLButtonElement),
  artifactDeleteButton: getElement("artifact-delete-button", HTMLButtonElement),
  artifactTitleInput: getElement("artifact-title-input", HTMLInputElement),
  artifactKind: getElement("artifact-kind", HTMLSelectElement),
  artifactContent: getElement("artifact-content", HTMLTextAreaElement),
  artifactSaveButton: getElement("artifact-save-button", HTMLButtonElement),
  artifactList: getElement("artifact-list", HTMLElement),
  artifactPreview: getElement("artifact-preview", HTMLElement),
  artifactHelp: getElement("artifact-help", HTMLElement),
};

elements.navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActivePage(button.dataset.pageTarget ?? "space");
  });
});

elements.appReadinessList.addEventListener("click", (event) => {
  navigateFromReadinessList(event);
});

elements.installStatusList.addEventListener("click", (event) => {
  navigateFromReadinessList(event);
});

elements.workspaceForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void createWorkspaceFromForm();
});

elements.workspaceSelect.addEventListener("change", () => {
  void selectWorkspaceFromList();
});

elements.workspaceUpdateButton.addEventListener("click", () => {
  void updateSelectedWorkspace();
});

elements.workspaceDeleteButton.addEventListener("click", () => {
  void deleteSelectedWorkspace();
});

elements.providerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void saveProviderFromForm();
});

elements.providerSelect.addEventListener("change", () => {
  void selectProviderFromList();
});

elements.providerTestButton.addEventListener("click", () => {
  void testProviderFromForm();
});

elements.providerModelsButton.addEventListener("click", () => {
  void loadModelsForSelectedProvider();
});

elements.providerDeleteButton.addEventListener("click", () => {
  void deleteSelectedProvider();
});

elements.providerModelSelect.addEventListener("change", () => {
  elements.providerModel.value = elements.providerModelSelect.value;
  void saveModelSelectionFromForm();
});

elements.threadSelect.addEventListener("change", () => {
  void loadThread(elements.threadSelect.value);
});

elements.threadNewButton.addEventListener("click", () => {
  void createThread();
});

elements.threadRenameButton.addEventListener("click", () => {
  void renameSelectedThread();
});

elements.threadDeleteButton.addEventListener("click", () => {
  void deleteSelectedThread();
});

elements.chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void sendChatFromForm();
});

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  void runDemoFromForm();
});

elements.executor.addEventListener("change", () => {
  renderExecutorStatuses();
});

elements.runCancelButton.addEventListener("click", () => {
  void cancelActiveRun();
});

elements.approvalGrantButton.addEventListener("click", () => {
  void resolveActiveApproval("grant");
});

elements.approvalRejectButton.addEventListener("click", () => {
  void resolveActiveApproval("reject");
});

elements.memoryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void createMemoryFromForm();
});

elements.memoryList.addEventListener("click", (event) => {
  const target = event.target instanceof HTMLElement
    ? event.target.closest<HTMLButtonElement>("button[data-memory-id]")
    : null;
  if (target?.dataset.memoryId) void deleteMemory(target.dataset.memoryId);
});

elements.capabilityList.addEventListener("click", (event) => {
  const target = event.target instanceof HTMLElement
    ? event.target.closest<HTMLButtonElement>("button[data-capability-id]")
    : null;
  if (target?.dataset.capabilityId) {
    state.activeCapabilityId = target.dataset.capabilityId;
    renderCapabilities();
  }
});

elements.capabilityToggleButton.addEventListener("click", () => {
  void toggleSelectedCapability();
});

elements.capabilityRunButton.addEventListener("click", () => {
  void runSelectedCapability();
});

elements.forgeCreateButton.addEventListener("click", () => {
  void createRecipeFromSelectedRun();
});

elements.recipeList.addEventListener("click", (event) => {
  const target = event.target instanceof HTMLElement
    ? event.target.closest<HTMLButtonElement>("button[data-recipe-id]")
    : null;
  if (target?.dataset.recipeId) {
    state.activeRecipeId = target.dataset.recipeId;
    renderRecipes();
  }
});

elements.recipeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void saveSelectedRecipe();
});

elements.recipeTestButton.addEventListener("click", () => {
  void testSelectedRecipe();
});

elements.recipeExportButton.addEventListener("click", () => {
  void exportSelectedRecipe();
});

elements.automationForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void createAutomationFromForm();
});

elements.automationTickButton.addEventListener("click", () => {
  void runAutomationTick();
});

elements.automationList.addEventListener("click", (event) => {
  const target = event.target instanceof HTMLElement
    ? event.target.closest<HTMLButtonElement>("button[data-automation-action]")
    : null;
  if (!target?.dataset.automationId || !target.dataset.automationAction) return;
  void handleAutomationAction(target.dataset.automationId, target.dataset.automationAction);
});

elements.runHistoryList.addEventListener("click", (event) => {
  const target = event.target instanceof HTMLElement ? event.target.closest<HTMLButtonElement>("button[data-run-id]") : null;
  if (target?.dataset.runId) void openRun(target.dataset.runId);
});

elements.artifactForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void saveArtifactFromForm();
});

elements.artifactSelect.addEventListener("change", () => {
  void openArtifact(elements.artifactSelect.value);
});

elements.artifactOpenButton.addEventListener("click", () => {
  void openArtifact(elements.artifactSelect.value);
});

elements.artifactDeleteButton.addEventListener("click", () => {
  void deleteSelectedArtifact();
});

elements.artifactList.addEventListener("click", (event) => {
  const target = event.target instanceof HTMLElement
    ? event.target.closest<HTMLButtonElement>("button[data-artifact-id]")
    : null;
  if (target?.dataset.artifactId) void openArtifact(target.dataset.artifactId);
});

void initializeAppState();
renderChatMessages();
renderCurrentRunView();
setActivePage(state.activePage);

async function initializeAppState(): Promise<void> {
  await loadWorkspaces();
  await loadExecutors();
  await loadProviders();
  await loadThreads();
  await loadArtifacts();
  await loadRuns();
  await loadApprovals();
  await loadAutomations();
  await loadAutomationRuns();
  await loadMemories();
  await loadCapabilities();
  await loadCapabilityRuns();
  await loadRecipes();
  await loadRecipeTests();
  await loadAppReadiness();
}

function setActivePage(page: string): void {
  state.activePage = page;

  elements.navButtons.forEach((button) => {
    const active = button.dataset.pageTarget === page;
    button.setAttribute("aria-current", active ? "page" : "false");
  });

  elements.pageSections.forEach((section) => {
    const pages = (section.dataset.pages ?? "").split(/\s+/).filter(Boolean);
    section.hidden = !pages.includes(page);
  });
}

function navigateFromReadinessList(event: Event): void {
  const target = event.target instanceof HTMLElement
    ? event.target.closest<HTMLButtonElement>("button[data-readiness-target]")
    : null;
  if (target?.dataset.readinessTarget) {
    setActivePage(target.dataset.readinessTarget);
  }
}

async function loadExecutors(): Promise<void> {
  try {
    const payload = await apiJson<{ executors: ExecutorStatusSummary[] }>("/api/executors");
    state.executorStatuses = payload.executors;
    renderExecutorStatuses();
  } catch (error) {
    elements.executorStatusHelp.textContent = errorToMessage(error, "Failed to load executor status.");
    renderExecutorStatuses();
  }
}

async function loadAppReadiness(): Promise<void> {
  try {
    state.appReadiness = await apiJson<AppReadinessSummary>("/api/app/readiness");
    renderAppReadiness();
  } catch (error) {
    elements.appReadinessStatus.textContent = "failed";
    elements.appReadinessList.replaceChildren(createListItem(errorToMessage(error, "Failed to load readiness.")));
    elements.startActionList.replaceChildren(createListItem("Open Settings and verify the local server is running."));
    elements.installHelp.textContent = "Readiness endpoint did not respond.";
  }
}

function renderAppReadiness(): void {
  const readiness = state.appReadiness;
  if (!readiness) {
    elements.appReadinessStatus.textContent = "checking";
    return;
  }

  const actionCount = readiness.checks.filter((check) => check.status === "action").length;
  const readyCount = readiness.checks.filter((check) => check.status === "ready").length;
  elements.appReadinessStatus.textContent = actionCount > 0 ? `${actionCount} action${actionCount === 1 ? "" : "s"}` : "ready";
  elements.appReadinessList.replaceChildren(
    ...readiness.checks.map((check) => createReadinessListItem(check)),
  );
  elements.appReadinessHelp.textContent =
    `${readiness.releaseName} ${readiness.version}: ${readyCount}/${readiness.checks.length} systems ready. Data root: ${readiness.storageRoot}`;
  elements.metricThreadCount.textContent = String(readiness.counts.threads);
  elements.metricRunCount.textContent = String(readiness.counts.runs);
  elements.metricArtifactCount.textContent = String(readiness.counts.artifacts);
  elements.metricCapabilityCount.textContent = `${readiness.counts.enabledCapabilities}/${readiness.counts.capabilities}`;
  elements.startActionList.replaceChildren(
    ...readiness.nextActions.map((action) => createListItem(action)),
  );
  elements.installStatusList.replaceChildren(
    createReadinessListItem({
      id: "install-build",
      title: "Build Command",
      status: "ready",
      detail: readiness.install.buildCommand,
      targetPage: "settings",
    }),
    createReadinessListItem({
      id: "install-open",
      title: "Open Command",
      status: "ready",
      detail: readiness.install.openCommand,
      targetPage: "settings",
    }),
    createReadinessListItem({
      id: "install-signing",
      title: "Signing",
      status: readiness.install.signed && readiness.install.notarized ? "ready" : "optional",
      detail: readiness.install.signed && readiness.install.notarized
        ? "Signed and notarized."
        : "Unsigned local build. Use documented local install path for V1.0.",
      targetPage: "settings",
    }),
    createReadinessListItem({
      id: "install-node",
      title: "Node Runtime",
      status: readiness.install.nodeRequired ? "optional" : "ready",
      detail: readiness.install.nodeRequired
        ? "Node must be available on PATH because the WebKit app starts the local server with node."
        : "Node is bundled.",
      targetPage: "settings",
    }),
  );
  elements.installHelp.textContent = readiness.install.note;
}

function renderExecutorStatuses(): void {
  if (state.executorStatuses.length === 0) {
    elements.executorStatusList.replaceChildren(createListItem("Executor doctor has not run yet."));
    return;
  }

  elements.executorStatusList.replaceChildren(
    ...state.executorStatuses.map((status) => createActionListItem({
      id: status.choice,
      idName: "runId",
      title: status.choice,
      meta: status.message,
      pressed: status.choice === elements.executor.value,
      source: status.available ? "completed" : "failed",
    })),
  );
}

async function loadWorkspaces(): Promise<void> {
  try {
    const payload = await apiJson<{
      activeWorkspaceId?: string;
      workspaces: WorkspaceSummary[];
    }>("/api/workspaces");

    state.workspaces = payload.workspaces;
    state.activeWorkspaceId = payload.activeWorkspaceId;
    renderWorkspaces();
  } catch (error) {
    elements.workspaceHelp.textContent = errorToMessage(error, "Failed to load workspaces.");
    state.activeWorkspaceId = undefined;
    renderWorkspaces();
  }
}

async function createWorkspaceFromForm(): Promise<void> {
  const name = elements.workspaceName.value.trim();
  if (!name) {
    elements.workspaceHelp.textContent = "Workspace name is required.";
    return;
  }

  elements.workspaceSaveButton.disabled = true;
  try {
    const payload = await apiJson<{ workspace: WorkspaceSummary }>("/api/workspaces", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        path: optionalFormValue(elements.workspacePath.value),
        trustLevel: elements.workspaceTrustLevel.value,
      }),
    });
    state.activeWorkspaceId = payload.workspace.id;
    state.activeThreadId = undefined;
    elements.workspaceHelp.textContent = `Workspace created: ${payload.workspace.name}`;
    await refreshWorkspaceScopedData();
  } catch (error) {
    elements.workspaceHelp.textContent = errorToMessage(error, "Failed to create workspace.");
  } finally {
    elements.workspaceSaveButton.disabled = false;
  }
}

async function selectWorkspaceFromList(): Promise<void> {
  const workspaceId = elements.workspaceSelect.value;
  if (!workspaceId) return;

  const workspace = state.workspaces.find((item) => item.id === workspaceId);
  if (workspace) fillWorkspaceForm(workspace);

  try {
    await apiJson<{ activeWorkspaceId: string }>("/api/settings/workspace-selection", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId }),
    });
    state.activeWorkspaceId = workspaceId;
    state.activeThreadId = undefined;
    await refreshWorkspaceScopedData();
  } catch (error) {
    elements.workspaceHelp.textContent = errorToMessage(error, "Failed to select workspace.");
  }
}

async function updateSelectedWorkspace(): Promise<void> {
  if (!state.activeWorkspaceId) {
    elements.workspaceHelp.textContent = "Select a workspace before updating it.";
    return;
  }

  elements.workspaceUpdateButton.disabled = true;
  try {
    const payload = await apiJson<{ workspace: WorkspaceSummary }>(
      `/api/workspaces/${encodeURIComponent(state.activeWorkspaceId)}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: optionalFormValue(elements.workspaceName.value),
          path: optionalFormValue(elements.workspacePath.value),
          trustLevel: elements.workspaceTrustLevel.value,
        }),
      },
    );
    elements.workspaceHelp.textContent = `Workspace updated: ${payload.workspace.name}`;
    await refreshWorkspaceScopedData();
  } catch (error) {
    elements.workspaceHelp.textContent = errorToMessage(error, "Failed to update workspace.");
  } finally {
    elements.workspaceUpdateButton.disabled = false;
  }
}

async function deleteSelectedWorkspace(): Promise<void> {
  if (!state.activeWorkspaceId) {
    elements.workspaceHelp.textContent = "Select a workspace before deleting it.";
    return;
  }

  elements.workspaceDeleteButton.disabled = true;
  try {
    await apiJson<{ workspaces: WorkspaceSummary[] }>(
      `/api/workspaces/${encodeURIComponent(state.activeWorkspaceId)}`,
      { method: "DELETE" },
    );
    state.activeWorkspaceId = undefined;
    state.activeThreadId = undefined;
    state.activeArtifactId = undefined;
    state.activeRunId = undefined;
    elements.workspaceHelp.textContent = "Workspace deleted. Select or create another workspace.";
    await refreshWorkspaceScopedData();
  } catch (error) {
    elements.workspaceHelp.textContent = errorToMessage(error, "Failed to delete workspace.");
  } finally {
    elements.workspaceDeleteButton.disabled = false;
  }
}

async function refreshWorkspaceScopedData(): Promise<void> {
  await loadWorkspaces();
  await loadThreads();
  await loadArtifacts();
  await loadRuns();
  await loadApprovals();
  await loadAutomations();
  await loadAutomationRuns();
  await loadMemories();
  await loadCapabilities();
  await loadRecipes();
  await loadRecipeTests();
  await loadAppReadiness();
}

function renderWorkspaces(): void {
  const activeWorkspace = getActiveWorkspace();
  const options = [
    createOption("", state.workspaces.length > 0 ? "Select a workspace" : "No workspaces saved"),
    ...state.workspaces.map((workspace) => createOption(workspace.id, workspace.name)),
  ];

  elements.workspaceSelect.replaceChildren(...options);
  elements.workspaceSelect.value = activeWorkspace?.id ?? "";

  if (activeWorkspace) {
    fillWorkspaceForm(activeWorkspace);
    elements.activeWorkspaceLabel.textContent = activeWorkspace.name;
    elements.activeWorkspaceLabel.dataset.phase = "completed";
    elements.workspaceHelp.textContent =
      `${activeWorkspace.name}${activeWorkspace.path ? ` at ${activeWorkspace.path}` : ""} / trust: ${activeWorkspace.trustLevel}`;
    return;
  }

  elements.activeWorkspaceLabel.textContent = "no workspace";
  elements.activeWorkspaceLabel.dataset.phase = "idle";
  if (state.workspaces.length === 0) {
    elements.workspaceHelp.textContent = "Create a workspace to scope threads, runs, and artifacts.";
  }
}

function fillWorkspaceForm(workspace: WorkspaceSummary): void {
  elements.workspaceName.value = workspace.name;
  elements.workspacePath.value = workspace.path ?? "";
  elements.workspaceTrustLevel.value = workspace.trustLevel;
}

function getActiveWorkspace(): WorkspaceSummary | undefined {
  return state.workspaces.find((workspace) => workspace.id === state.activeWorkspaceId);
}

async function loadProviders(): Promise<void> {
  try {
    const payload = await apiJson<{
      activeProviderId?: string;
      providers: ProviderSummary[];
    }>("/api/providers");

    state.providers = payload.providers;
    const activeProvider = payload.providers.find((provider) => provider.id === payload.activeProviderId)
      ?? payload.providers[0];
    state.activeProviderId = activeProvider?.id;

    elements.providerSelect.replaceChildren(
      createOption("", payload.providers.length > 0 ? "Select a provider" : "No providers saved"),
      ...payload.providers.map((provider) => createOption(provider.id ?? "", `${provider.name} / ${provider.modelId}`)),
    );
    elements.providerSelect.value = activeProvider?.id ?? "";

    if (activeProvider) {
      fillProviderForm(activeProvider);
      elements.providerStatus.textContent = "configured";
      elements.providerStatus.dataset.phase = "completed";
      elements.providerHelp.textContent = `Saved provider loaded. API key: ${activeProvider.apiKeyPreview}`;
      setModelOptions([activeProvider.modelId], activeProvider.modelId);
    } else {
      elements.providerStatus.textContent = "not configured";
      elements.providerStatus.dataset.phase = "idle";
      elements.providerHelp.textContent = "Save a provider before chatting.";
      setModelOptions([], "");
    }
  } catch (error) {
    renderProviderError(errorToMessage(error, "Failed to load provider settings."));
  }
}

async function selectProviderFromList(): Promise<void> {
  const providerId = elements.providerSelect.value;
  const provider = state.providers.find((item) => item.id === providerId);
  if (!provider?.id) return;

  state.activeProviderId = provider.id;
  fillProviderForm(provider);
  await saveModelSelection(provider.id, provider.modelId);
  elements.providerStatus.textContent = "configured";
  elements.providerStatus.dataset.phase = "completed";
  elements.providerHelp.textContent = `Active provider: ${provider.name}`;
  await loadProviders();
}

function fillProviderForm(provider: ProviderSummary): void {
  elements.providerName.value = provider.name;
  elements.providerProtocol.value = provider.protocol;
  elements.providerBaseUrl.value = provider.baseUrl;
  elements.providerModel.value = provider.modelId;
  setModelOptions([provider.modelId], provider.modelId);
}

async function saveProviderFromForm(): Promise<void> {
  elements.providerSaveButton.disabled = true;
  elements.providerStatus.textContent = "saving";
  elements.providerStatus.dataset.phase = "running";

  try {
    const payload = await apiJson<{
      provider?: { id?: string; apiKeyPreview: string };
    }>("/api/providers", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        id: state.activeProviderId,
        name: elements.providerName.value,
        protocol: elements.providerProtocol.value,
        baseUrl: elements.providerBaseUrl.value,
        apiKey: elements.providerApiKey.value,
        modelId: elements.providerModel.value,
      }),
    });

    state.activeProviderId = payload.provider?.id ?? state.activeProviderId;
    elements.providerApiKey.value = "";
    elements.providerStatus.textContent = "configured";
    elements.providerStatus.dataset.phase = "completed";
    elements.providerHelp.textContent = `Provider saved locally. API key: ${payload.provider?.apiKeyPreview ?? "saved"}`;
    await loadProviders();
    await loadAppReadiness();
  } catch (error) {
    renderProviderError(errorToMessage(error, "Failed to save provider settings."));
  } finally {
    elements.providerSaveButton.disabled = false;
  }
}

async function deleteSelectedProvider(): Promise<void> {
  if (!state.activeProviderId) {
    renderProviderError("Select a provider before deleting.");
    return;
  }

  elements.providerDeleteButton.disabled = true;
  try {
    await apiJson(`/api/providers/${encodeURIComponent(state.activeProviderId)}`, {
      method: "DELETE",
    });
    state.activeProviderId = undefined;
    elements.providerApiKey.value = "";
    elements.providerName.value = "Local OpenAI-Compatible";
    elements.providerBaseUrl.value = "";
    elements.providerModel.value = "";
    await loadProviders();
    await loadAppReadiness();
  } catch (error) {
    renderProviderError(errorToMessage(error, "Failed to delete provider."));
  } finally {
    elements.providerDeleteButton.disabled = false;
  }
}

async function testProviderFromForm(): Promise<void> {
  elements.providerTestButton.disabled = true;
  elements.providerStatus.textContent = "testing";
  elements.providerStatus.dataset.phase = "running";

  try {
    const payload = await apiJson<{ available: boolean; message: string; models: string[] }>("/api/providers/doctor", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(providerDraftFromForm()),
    });

    elements.providerStatus.textContent = payload.available ? "healthy" : "failed";
    elements.providerStatus.dataset.phase = payload.available ? "completed" : "failed";
    elements.providerHelp.textContent = `${payload.message}${payload.models.length ? ` Models: ${payload.models.slice(0, 5).join(", ")}` : ""}`;
    setModelOptions(payload.models, elements.providerModel.value);
  } catch (error) {
    renderProviderError(errorToMessage(error, "Provider Doctor failed."));
  } finally {
    elements.providerTestButton.disabled = false;
  }
}

async function loadModelsForSelectedProvider(): Promise<void> {
  if (!state.activeProviderId) {
    renderProviderError("Save or select a provider before loading models.");
    return;
  }

  elements.providerModelsButton.disabled = true;
  try {
    const payload = await apiJson<{ available: boolean; message: string; models: string[] }>(
      `/api/providers/${encodeURIComponent(state.activeProviderId)}/models`,
    );

    if (!payload.available) {
      throw new Error(payload.message);
    }

    elements.providerHelp.textContent = `Loaded models: ${payload.models.slice(0, 8).join(", ")}`;
    setModelOptions(payload.models, elements.providerModel.value);
    if (payload.models.length > 0) {
      elements.providerModel.value = payload.models[0] ?? elements.providerModel.value;
      elements.providerModelSelect.value = elements.providerModel.value;
      await saveModelSelectionFromForm();
    }
  } catch (error) {
    renderProviderError(errorToMessage(error, "Failed to load models."));
  } finally {
    elements.providerModelsButton.disabled = false;
  }
}

async function saveModelSelectionFromForm(): Promise<void> {
  if (!state.activeProviderId || !elements.providerModel.value) return;
  try {
    await saveModelSelection(state.activeProviderId, elements.providerModel.value);
  } catch (error) {
    renderProviderError(errorToMessage(error, "Failed to save model selection."));
  }
}

async function saveModelSelection(providerId: string, modelId: string): Promise<void> {
  await apiJson("/api/settings/model-selection", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ providerId, modelId }),
  });
}

function setModelOptions(models: string[], selectedModel: string): void {
  const uniqueModels = [...new Set(models.filter(Boolean))];

  elements.providerModelSelect.replaceChildren(
    ...uniqueModels.map((model) => createOption(model, model)),
  );

  if (uniqueModels.length === 0) {
    elements.providerModelSelect.append(createOption("", "Load models or type manually"));
    return;
  }

  elements.providerModelSelect.value = uniqueModels.includes(selectedModel) ? selectedModel : uniqueModels[0] ?? "";
}

function providerDraftFromForm() {
  return {
    id: state.activeProviderId,
    name: elements.providerName.value,
    protocol: elements.providerProtocol.value,
    baseUrl: elements.providerBaseUrl.value,
    apiKey: elements.providerApiKey.value,
    modelId: elements.providerModel.value,
  };
}

async function loadThreads(): Promise<void> {
  try {
    const payload = await apiJson<{
      activeThreadId?: string;
      threads: ThreadSummary[];
    }>("/api/threads");

    elements.threadSelect.replaceChildren(
      createOption("", payload.threads.length > 0 ? "Select a thread" : "No threads in workspace"),
      ...payload.threads.map((thread) => createOption(thread.id, `${thread.title} (${thread.messageCount})`)),
    );

    const activeThread = payload.threads.find((thread) => thread.id === payload.activeThreadId) ?? payload.threads[0];
    state.activeThreadId = activeThread?.id;

    if (activeThread) {
      elements.threadSelect.value = activeThread.id;
      await loadThread(activeThread.id);
      return;
    }

    state.chatMessages = [{
      role: "system",
      content: state.activeWorkspaceId
        ? "No thread in this workspace yet. Create a thread or send a chat message."
        : "Create or select a workspace to scope new threads.",
    }];
    elements.threadHelp.textContent = state.activeWorkspaceId
      ? "No threads in the active workspace."
      : "Create/select a workspace before starting persistent chat.";
    renderChatMessages();
  } catch (error) {
    elements.threadHelp.textContent = errorToMessage(error, "Failed to load threads.");
  }
}

async function createThread(): Promise<void> {
  const payload = await apiJson<{ thread: { id: string } }>("/api/threads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: "New Thread",
      providerId: state.activeProviderId,
      modelId: elements.providerModel.value,
      workspaceId: state.activeWorkspaceId,
    }),
  });
  state.activeThreadId = payload.thread.id;
  await loadThreads();
  await loadAppReadiness();
}

async function renameSelectedThread(): Promise<void> {
  if (!state.activeThreadId) {
    elements.threadHelp.textContent = "Create or select a thread before renaming.";
    return;
  }

  const selected = elements.threadSelect.selectedOptions[0]?.textContent?.replace(/\s+\(\d+\)$/, "") ?? "Thread";
  const title = globalThis.prompt("Thread name", selected)?.trim();
  if (!title) return;

  await apiJson(`/api/threads/${encodeURIComponent(state.activeThreadId)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title, workspaceId: state.activeWorkspaceId }),
  });
  await loadThreads();
  await loadAppReadiness();
}

async function deleteSelectedThread(): Promise<void> {
  if (!state.activeThreadId) {
    elements.threadHelp.textContent = "Create or select a thread before deleting.";
    return;
  }

  await apiJson(`/api/threads/${encodeURIComponent(state.activeThreadId)}`, {
    method: "DELETE",
  });
  state.activeThreadId = undefined;
  state.chatMessages = [{ role: "system", content: "Thread deleted. Create a new thread to continue." }];
  renderChatMessages();
  await loadThreads();
  await loadAppReadiness();
}

async function loadThread(threadId: string): Promise<void> {
  if (!threadId) return;

  const payload = await apiJson<{
    thread: { id: string; title: string; workspaceId?: string };
    messages: ChatUiMessage[];
  }>(`/api/threads/${encodeURIComponent(threadId)}/messages`);

  state.activeThreadId = payload.thread.id;
  state.chatMessages = payload.messages.length > 0
    ? payload.messages
    : [{ role: "system", content: "This workspace thread has no messages yet." }];
  elements.threadHelp.textContent = `Active thread: ${payload.thread.title}`;
  renderChatMessages();
}

async function sendChatFromForm(): Promise<void> {
  const message = elements.chatInput.value.trim();

  if (!message) return;

  state.chatMessages = [
    ...state.chatMessages.filter((entry) => entry.role !== "system"),
    { role: "user", content: message },
  ];
  elements.chatInput.value = "";
  elements.chatSendButton.disabled = true;
  renderChatMessages();

  try {
    const threadId = state.activeThreadId;
    const payload = await apiJson<{
      error?: string;
      messages?: ChatUiMessage[];
      threadId?: string;
      memoryUsage?: RetrievedMemory[];
    }>(
      threadId ? `/api/threads/${encodeURIComponent(threadId)}/messages` : "/api/chat/send",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          message,
          threadId,
          providerId: state.activeProviderId,
        }),
      },
    );

    if (!payload.messages) {
      throw new Error(payload.error ?? "Chat request failed.");
    }

    state.chatMessages = payload.messages;
    state.activeThreadId = payload.threadId ?? state.activeThreadId;
    state.memoryUsage = payload.memoryUsage ?? [];
    renderMemoryUsage();
    await loadThreads();
    await loadArtifacts();
    await loadAppReadiness();
  } catch (error) {
    state.chatMessages = [
      ...state.chatMessages,
      {
        role: "system",
        content: errorToMessage(error, "Chat request failed."),
      },
    ];
    if (state.activeThreadId) {
      await loadThread(state.activeThreadId).catch(() => undefined);
    }
  } finally {
    elements.chatSendButton.disabled = false;
    renderChatMessages();
  }
}

async function runDemoFromForm(): Promise<void> {
  const goal = elements.input.value.trim();
  const executorChoice = toExecutorChoice(elements.executor.value);
  const timeoutMs = readTimeoutMs();

  if (!goal) {
    elements.runSummary.textContent = "Enter a goal before starting the run.";
    return;
  }

  elements.runButton.disabled = true;
  elements.runCancelButton.disabled = false;

  try {
    const payload = await apiJson<{ live: LiveRunState; run: RunSummary }>("/api/runs/start", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        goal,
        executorChoice,
        ...(timeoutMs !== undefined ? { timeoutMs } : {}),
      }),
    });
    state.activeRunId = payload.run.id;
    state.liveRun = payload.live;
    state.memoryUsage = payload.live.memoryUsage ?? [];
    renderCurrentRunView();
    await loadRuns();
    await loadApprovals();
    await loadAppReadiness();
    startRunPolling(payload.run.id);
  } catch (error) {
    elements.runSummary.textContent = errorToMessage(error, "Failed to start executor run.");
    elements.statusPill.textContent = "failed";
    elements.statusPill.dataset.phase = "failed";
  } finally {
    elements.runButton.disabled = false;
  }
}

async function cancelActiveRun(): Promise<void> {
  if (!state.activeRunId) {
    elements.runSummary.textContent = "No active run to cancel.";
    return;
  }

  elements.runCancelButton.disabled = true;
  try {
    const payload = await apiJson<{ live: LiveRunState }>(
      `/api/runs/${encodeURIComponent(state.activeRunId)}/cancel`,
      { method: "POST" },
    );
    state.liveRun = payload.live;
    state.memoryUsage = payload.live.memoryUsage ?? [];
    renderCurrentRunView();
    await loadRuns();
    await loadApprovals();
    await loadAppReadiness();
  } catch (error) {
    elements.runSummary.textContent = errorToMessage(error, "Failed to cancel run.");
  }
}

async function resolveActiveApproval(decision: "grant" | "reject"): Promise<void> {
  if (!state.activeRunId || !state.liveRun?.pendingApproval) {
    elements.approvalReason.textContent = "No pending approval request.";
    return;
  }

  elements.approvalGrantButton.disabled = true;
  elements.approvalRejectButton.disabled = true;
  try {
    const payload = await apiJson<{ live: LiveRunState }>(
      `/api/runs/${encodeURIComponent(state.activeRunId)}/approval`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
      },
    );
    state.liveRun = payload.live;
    state.memoryUsage = payload.live.memoryUsage ?? [];
    renderCurrentRunView();
    if (!isTerminalStatus(payload.live.status)) {
      startRunPolling(payload.live.runId);
    }
    await loadRuns();
    await loadApprovals();
    await loadAppReadiness();
  } catch (error) {
    elements.approvalReason.textContent = errorToMessage(error, "Failed to resolve approval.");
  } finally {
    elements.approvalGrantButton.disabled = false;
    elements.approvalRejectButton.disabled = false;
  }
}

function startRunPolling(runId: string): void {
  stopRunPolling();
  state.runPoller = window.setInterval(() => {
    void pollLiveRun(runId);
  }, 500);
  void pollLiveRun(runId);
}

function stopRunPolling(): void {
  if (state.runPoller === undefined) return;
  window.clearInterval(state.runPoller);
  state.runPoller = undefined;
}

async function pollLiveRun(runId: string): Promise<void> {
  try {
    const payload = await apiJson<{ live: LiveRunState }>(`/api/runs/${encodeURIComponent(runId)}/live`);
    state.liveRun = payload.live;
    state.activeRunId = payload.live.runId;
    state.memoryUsage = payload.live.memoryUsage ?? [];
    renderCurrentRunView();

    if (isTerminalStatus(payload.live.status)) {
      stopRunPolling();
      await loadRuns();
      await loadArtifacts();
      await loadApprovals();
      await loadAppReadiness();
      state.liveRun = createPersistedRunView(payload.live.runId) ?? payload.live;
      renderCurrentRunView();
    }
  } catch {
    stopRunPolling();
  }
}

async function loadArtifacts(): Promise<void> {
  try {
    const payload = await apiJson<{ artifacts: ArtifactSummary[] }>("/api/artifacts");
    state.artifacts = payload.artifacts;
    const selected = state.artifacts.find((artifact) => artifact.id === state.activeArtifactId) ?? state.artifacts[0];
    state.activeArtifactId = selected?.id;

    if (selected) {
      await openArtifact(selected.id);
      return;
    }

    state.activeArtifact = undefined;
    renderArtifactLibrary();
  } catch (error) {
    elements.artifactHelp.textContent = errorToMessage(error, "Failed to load artifacts.");
    renderArtifactLibrary();
  }
}

async function openArtifact(artifactId: string): Promise<void> {
  if (!artifactId) return;

  try {
    const payload = await apiJson<{ artifact?: ArtifactSummary }>(`/api/artifacts/${encodeURIComponent(artifactId)}`);
    state.activeArtifact = payload.artifact;
    state.activeArtifactId = payload.artifact?.id ?? artifactId;
    renderArtifactLibrary();
  } catch (error) {
    elements.artifactHelp.textContent = errorToMessage(error, "Failed to open artifact.");
  }
}

async function saveArtifactFromForm(): Promise<void> {
  const title = elements.artifactTitleInput.value.trim();
  if (!title) {
    elements.artifactHelp.textContent = "Artifact title is required.";
    return;
  }

  elements.artifactSaveButton.disabled = true;
  try {
    const payload = await apiJson<{ artifact: ArtifactSummary }>("/api/artifacts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        kind: elements.artifactKind.value,
        content: elements.artifactContent.value,
        workspaceId: state.activeWorkspaceId,
        threadId: state.activeThreadId,
        source: "manual",
      }),
    });
    state.activeArtifactId = payload.artifact.id;
    elements.artifactTitleInput.value = "";
    elements.artifactContent.value = "";
    elements.artifactHelp.textContent = `Saved artifact: ${payload.artifact.title}`;
    await loadArtifacts();
    await loadAppReadiness();
  } catch (error) {
    elements.artifactHelp.textContent = errorToMessage(error, "Failed to save artifact.");
  } finally {
    elements.artifactSaveButton.disabled = false;
  }
}

async function deleteSelectedArtifact(): Promise<void> {
  if (!state.activeArtifactId) {
    elements.artifactHelp.textContent = "Select an artifact before deleting.";
    return;
  }

  elements.artifactDeleteButton.disabled = true;
  try {
    await apiJson(`/api/artifacts/${encodeURIComponent(state.activeArtifactId)}`, {
      method: "DELETE",
    });
    state.activeArtifactId = undefined;
    state.activeArtifact = undefined;
    elements.artifactHelp.textContent = "Artifact deleted.";
    await loadArtifacts();
    await loadAppReadiness();
  } catch (error) {
    elements.artifactHelp.textContent = errorToMessage(error, "Failed to delete artifact.");
  } finally {
    elements.artifactDeleteButton.disabled = false;
  }
}

function renderArtifactLibrary(): void {
  elements.artifactSelect.replaceChildren(
    createOption("", state.artifacts.length > 0 ? "Select an artifact" : "No artifacts saved"),
    ...state.artifacts.map((artifact) => createOption(artifact.id, `${artifact.title} / ${artifact.source}`)),
  );
  elements.artifactSelect.value = state.activeArtifactId ?? "";

  if (state.artifacts.length === 0) {
    elements.artifactList.replaceChildren(createListItem("No saved artifacts in this workspace yet."));
    elements.artifactPreview.textContent = "Saved artifact content will render here.";
    elements.artifactHelp.textContent = "Save a note artifact, send a chat, or run a task.";
    return;
  }

  elements.artifactList.replaceChildren(
    ...state.artifacts.map((artifact) => createActionListItem({
      id: artifact.id,
      idName: "artifactId",
      title: artifact.title,
      meta: `${artifact.kind} / ${formatDate(artifact.updatedAt)}`,
      pressed: artifact.id === state.activeArtifactId,
      source: artifact.source,
    })),
  );

  const activeArtifact = state.activeArtifact;
  if (!activeArtifact) {
    elements.artifactPreview.textContent = "Select an artifact to preview it.";
    return;
  }

  elements.artifactHelp.textContent =
    `Opened ${activeArtifact.source} artifact${activeArtifact.runId ? ` from run ${truncate(activeArtifact.runId, 24)}` : ""}.`;
  elements.artifactPreview.textContent = activeArtifact.content || "Artifact has no preview content.";
}

async function loadRuns(): Promise<void> {
  try {
    const payload = await apiJson<{ runs: RunSummary[] }>("/api/runs");
    state.runs = payload.runs;
    renderForgeRunOptions();
    const selected = state.runs.find((run) => run.id === state.activeRunId) ?? state.runs[0];
    state.activeRunId = selected?.id;

    if (selected) {
      await openRun(selected.id);
      return;
    }

    state.runEvents = [];
    renderRunHistory();
  } catch (error) {
    elements.runHistoryHelp.textContent = errorToMessage(error, "Failed to load run history.");
    renderRunHistory();
  }
}

function renderForgeRunOptions(): void {
  const completedRuns = state.runs.filter((run) => run.status === "completed");
  elements.forgeRunSelect.replaceChildren(
    createOption("", completedRuns.length > 0 ? "Select a completed run" : "No completed runs"),
    ...completedRuns.map((run) => createOption(run.id, `${run.goal} / ${formatDate(run.startedAt)}`)),
  );
}

async function loadApprovals(): Promise<void> {
  try {
    const payload = await apiJson<{ approvals: ApprovalRecord[] }>("/api/approvals");
    state.approvals = payload.approvals;
    renderApprovalHistory();
  } catch (error) {
    elements.approvalHistoryHelp.textContent = errorToMessage(error, "Failed to load approval history.");
    renderApprovalHistory();
  }
}

async function loadMemories(): Promise<void> {
  try {
    const payload = await apiJson<{ memories: MemorySummary[] }>("/api/memories");
    state.memories = payload.memories;
    renderMemories();
    renderMemoryUsage();
  } catch (error) {
    elements.memoryHelp.textContent = errorToMessage(error, "Failed to load memories.");
    renderMemories();
  }
}

async function createMemoryFromForm(): Promise<void> {
  const title = elements.memoryTitleInput.value.trim();
  const content = elements.memoryContent.value.trim();
  if (!title || !content) {
    elements.memoryHelp.textContent = "Memory title and content are required.";
    return;
  }

  elements.memorySaveButton.disabled = true;
  try {
    await apiJson<{ memory: MemorySummary }>("/api/memories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        content,
        scope: elements.memoryScope.value as MemoryScope,
        sensitivity: elements.memorySensitivity.value as MemorySensitivity,
      }),
    });
    elements.memoryHelp.textContent = "Memory saved locally.";
    await loadMemories();
    await loadAppReadiness();
  } catch (error) {
    elements.memoryHelp.textContent = errorToMessage(error, "Failed to save memory.");
  } finally {
    elements.memorySaveButton.disabled = false;
  }
}

async function deleteMemory(memoryId: string): Promise<void> {
  try {
    await apiJson(`/api/memories/${encodeURIComponent(memoryId)}`, { method: "DELETE" });
    if (state.memoryUsage.some((memory) => memory.memoryId === memoryId)) {
      state.memoryUsage = state.memoryUsage.filter((memory) => memory.memoryId !== memoryId);
      renderMemoryUsage();
    }
    await loadMemories();
    await loadAppReadiness();
  } catch (error) {
    elements.memoryHelp.textContent = errorToMessage(error, "Failed to delete memory.");
  }
}

function renderMemories(): void {
  if (state.memories.length === 0) {
    elements.memoryList.replaceChildren(createListItem("No local memories saved yet."));
    return;
  }

  elements.memoryList.replaceChildren(
    ...state.memories.map((memory) => {
      const item = document.createElement("li");
      const content = document.createElement("div");
      const button = document.createElement("button");

      content.className = "list-button";
      content.textContent = `${memory.title} / ${memory.scope} / ${memory.sensitivity}${memory.lastUsedAt ? ` / used ${formatDate(memory.lastUsedAt)}` : ""}`;
      button.type = "button";
      button.className = "secondary-button";
      button.dataset.memoryId = memory.id;
      button.textContent = "Delete";
      item.append(content, button);
      return item;
    }),
  );
}

function renderMemoryUsage(): void {
  if (state.memoryUsage.length === 0) {
    elements.memoryUsageList.replaceChildren(createListItem("No memory used in the current chat or run."));
    elements.memoryUsageHelp.textContent = "When memory is injected into chat or runs, it appears here.";
    return;
  }

  elements.memoryUsageList.replaceChildren(
    ...state.memoryUsage.map((memory) => createActionListItem({
      id: memory.memoryId,
      idName: "memoryId",
      title: `${memory.title} / ${memory.scope}`,
      meta: `${memory.sensitivity} / score ${memory.score.toFixed(1)} / ${memory.content}`,
      pressed: false,
      source: memory.sensitivity,
    })),
  );
  elements.memoryUsageHelp.textContent = `${state.memoryUsage.length} memory item${state.memoryUsage.length === 1 ? "" : "s"} injected into the current context.`;
}

async function loadCapabilities(): Promise<void> {
  try {
    const payload = await apiJson<{ capabilities: CapabilitySummary[] }>("/api/capabilities");
    state.capabilities = payload.capabilities;
    if (!state.activeCapabilityId && payload.capabilities.length > 0) {
      state.activeCapabilityId = payload.capabilities[0]?.id;
    }
    renderCapabilities();
  } catch (error) {
    elements.capabilityHelp.textContent = errorToMessage(error, "Failed to load capabilities.");
    renderCapabilities();
  }
}

async function loadCapabilityRuns(): Promise<void> {
  try {
    const payload = await apiJson<{ runs: CapabilityRunRecord[] }>("/api/capability-runs");
    state.capabilityRuns = payload.runs;
    renderCapabilityRuns();
  } catch (error) {
    elements.capabilityRunHelp.textContent = errorToMessage(error, "Failed to load capability history.");
    renderCapabilityRuns();
  }
}

async function toggleSelectedCapability(): Promise<void> {
  const capability = state.capabilities.find((item) => item.id === state.activeCapabilityId);
  if (!capability) return;

  const payload = await apiJson<{ capability: CapabilitySummary }>(`/api/capabilities/${encodeURIComponent(capability.id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ enabled: !capability.enabled }),
  });
  state.capabilities = state.capabilities.map((item) => item.id === capability.id ? payload.capability : item);
  renderCapabilities();
  await loadAppReadiness();
}

async function runSelectedCapability(): Promise<void> {
  const capability = state.capabilities.find((item) => item.id === state.activeCapabilityId);
  if (!capability) return;

  await apiJson(`/api/capabilities/${encodeURIComponent(capability.id)}/run`, { method: "POST" });
  await loadCapabilityRuns();
  await loadArtifacts();
  await loadAppReadiness();
}

function renderCapabilities(): void {
  if (state.capabilities.length === 0) {
    elements.capabilityList.replaceChildren(createListItem("No local capabilities installed."));
    elements.capabilityStatus.textContent = "not selected";
    elements.capabilityDescription.textContent = "Select a capability to inspect its purpose and permissions.";
    elements.capabilityPermissionList.replaceChildren();
    return;
  }

  const activeCapability = state.capabilities.find((item) => item.id === state.activeCapabilityId) ?? state.capabilities[0];
  state.activeCapabilityId = activeCapability?.id;
  elements.capabilityList.replaceChildren(
    ...state.capabilities.map((capability) => createActionListItem({
      id: capability.id,
      idName: "capabilityId",
      title: capability.title,
      meta: `${capability.kind} / ${capability.enabled ? "enabled" : "disabled"} / ${capability.permissions.length} permission${capability.permissions.length === 1 ? "" : "s"}`,
      pressed: capability.id === activeCapability?.id,
      source: capability.enabled ? "completed" : "paused",
    })),
  );

  if (!activeCapability) return;
  elements.capabilityStatus.textContent = activeCapability.enabled ? "enabled" : "disabled";
  elements.capabilityDescription.textContent = activeCapability.description;
  elements.capabilityPermissionList.replaceChildren(
    ...activeCapability.permissions.map((permission) => createActionListItem({
      id: `${activeCapability.id}-${permission.category}`,
      idName: "capabilityId",
      title: permission.category,
      meta: permission.description,
      pressed: false,
      source: "low",
    })),
  );
  elements.capabilityToggleButton.textContent = activeCapability.enabled ? "Disable" : "Enable";
  elements.capabilityRunButton.disabled = !activeCapability.enabled;
}

function renderCapabilityRuns(): void {
  if (state.capabilityRuns.length === 0) {
    elements.capabilityRunList.replaceChildren(createListItem("No capability runs yet."));
    elements.capabilityRunHelp.textContent = "Run a capability to create local execution history.";
    return;
  }

  elements.capabilityRunList.replaceChildren(
    ...state.capabilityRuns.map((run) => createActionListItem({
      id: run.id,
      idName: "runId",
      title: run.capabilityId,
      meta: `${run.status} / ${formatDate(run.startedAt)}${run.result ? ` / ${run.result}` : ""}`,
      pressed: false,
      source: run.status,
    })),
  );
  elements.capabilityRunHelp.textContent = `${state.capabilityRuns.length} capability run${state.capabilityRuns.length === 1 ? "" : "s"} recorded.`;
}

async function loadRecipes(): Promise<void> {
  try {
    const payload = await apiJson<{ recipes: RecipeSummary[] }>("/api/recipes");
    state.recipes = payload.recipes;
    if (!state.activeRecipeId && payload.recipes.length > 0) {
      state.activeRecipeId = payload.recipes[0]?.id;
    }
    renderRecipes();
  } catch (error) {
    elements.forgeHelp.textContent = errorToMessage(error, "Failed to load recipes.");
    renderRecipes();
  }
}

async function loadRecipeTests(): Promise<void> {
  try {
    const payload = await apiJson<{ tests: RecipeTestSummary[] }>("/api/recipe-tests");
    state.recipeTests = payload.tests;
    renderRecipeTests();
  } catch (error) {
    elements.recipeTestHelp.textContent = errorToMessage(error, "Failed to load recipe tests.");
    renderRecipeTests();
  }
}

async function createRecipeFromSelectedRun(): Promise<void> {
  const runId = elements.forgeRunSelect.value;
  if (!runId) {
    elements.forgeHelp.textContent = "Select a completed run first.";
    return;
  }

  const payload = await apiJson<{ recipe: RecipeSummary }>("/api/recipes/from-run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ runId }),
  });
  state.activeRecipeId = payload.recipe.id;
  await loadRecipes();
  await loadAppReadiness();
}

async function saveSelectedRecipe(): Promise<void> {
  const recipe = getActiveRecipe();
  if (!recipe) return;

  const payload = await apiJson<{ recipe: RecipeSummary }>(`/api/recipes/${encodeURIComponent(recipe.id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: elements.recipeTitleInput.value,
      prompt: elements.recipePromptInput.value,
      inputSpec: elements.recipeInputSpec.value,
      outputSpec: elements.recipeOutputSpec.value,
    }),
  });
  state.recipes = state.recipes.map((item) => item.id === recipe.id ? payload.recipe : item);
  renderRecipes();
  await loadAppReadiness();
}

async function testSelectedRecipe(): Promise<void> {
  const recipe = getActiveRecipe();
  if (!recipe) return;

  const payload = await apiJson<{ test: RecipeTestSummary }>(`/api/recipes/${encodeURIComponent(recipe.id)}/test`, {
    method: "POST",
  });
  elements.recipeTestPreview.textContent = payload.test.result ?? "Recipe test completed.";
  await loadRecipes();
  await loadRecipeTests();
  await loadAppReadiness();
}

async function exportSelectedRecipe(): Promise<void> {
  const recipe = getActiveRecipe();
  if (!recipe) return;

  const payload = await apiJson<{ recipe: RecipeSummary; capability: CapabilitySummary }>(
    `/api/recipes/${encodeURIComponent(recipe.id)}/export`,
    { method: "POST" },
  );
  state.activeRecipeId = payload.recipe.id;
  state.activeCapabilityId = payload.capability.id;
  await loadRecipes();
  await loadCapabilities();
  await loadAppReadiness();
}

function renderRecipes(): void {
  if (state.recipes.length === 0) {
    elements.recipeList.replaceChildren(createListItem("No recipes yet. Create one from a completed run."));
    elements.recipeStatus.textContent = "not selected";
    elements.recipeTitleInput.value = "";
    elements.recipePromptInput.value = "";
    elements.recipeInputSpec.value = "";
    elements.recipeOutputSpec.value = "";
    elements.recipeSaveButton.disabled = true;
    elements.recipeTestButton.disabled = true;
    elements.recipeExportButton.disabled = true;
    elements.recipeExportButton.textContent = "Save As Capability";
    return;
  }

  const activeRecipe = getActiveRecipe() ?? state.recipes[0];
  state.activeRecipeId = activeRecipe?.id;
  elements.recipeList.replaceChildren(
    ...state.recipes.map((recipe) => createActionListItem({
      id: recipe.id,
      idName: "recipeId",
      title: recipe.title,
      meta: `${recipe.capabilityId ? "exported" : "draft"} / ${recipe.lastTestedAt ? `tested ${formatDate(recipe.lastTestedAt)}` : "not tested"}`,
      pressed: recipe.id === activeRecipe?.id,
      source: recipe.capabilityId ? "completed" : "running",
    })),
  );

  if (!activeRecipe) return;
  elements.recipeStatus.textContent = activeRecipe.capabilityId ? "exported" : "draft";
  elements.recipeTitleInput.value = activeRecipe.title;
  elements.recipePromptInput.value = activeRecipe.prompt;
  elements.recipeInputSpec.value = activeRecipe.inputSpec;
  elements.recipeOutputSpec.value = activeRecipe.outputSpec;
  elements.recipeSaveButton.disabled = false;
  elements.recipeTestButton.disabled = false;
  elements.recipeExportButton.disabled = false;
  elements.recipeExportButton.textContent = activeRecipe.capabilityId ? "Update Capability" : "Save As Capability";
}

function renderRecipeTests(): void {
  if (state.recipeTests.length === 0) {
    elements.recipeTestList.replaceChildren(createListItem("No recipe validation runs yet."));
    elements.recipeTestHelp.textContent = "Test a recipe to validate it locally.";
    return;
  }

  elements.recipeTestList.replaceChildren(
    ...state.recipeTests.map((test) => createActionListItem({
      id: test.id,
      idName: "recipeTestId",
      title: test.status,
      meta: `${test.result ?? "No result"} / ${formatDate(test.startedAt)}`,
      pressed: false,
      source: test.status,
    })),
  );
  elements.recipeTestHelp.textContent = `${state.recipeTests.length} recipe test${state.recipeTests.length === 1 ? "" : "s"} recorded.`;
}

function getActiveRecipe(): RecipeSummary | undefined {
  return state.recipes.find((recipe) => recipe.id === state.activeRecipeId);
}

function renderApprovalHistory(): void {
  if (state.approvals.length === 0) {
    elements.approvalHistoryList.replaceChildren(createListItem("No approval decisions in this workspace yet."));
    elements.approvalHistoryHelp.textContent = "Risk decisions will appear after executor tasks request approval.";
    return;
  }

  elements.approvalHistoryList.replaceChildren(
    ...state.approvals.map((approval) => createActionListItem({
      id: approval.approvalId,
      idName: "approvalId",
      title: `${approval.category} / ${approval.riskLevel}`,
      meta: `${approval.status}${approval.decision ? `:${approval.decision}` : ""} / ${approval.resolvedAt ? formatDate(approval.resolvedAt) : "pending"} / ${approval.requestedAction}`,
      pressed: state.liveRun?.pendingApproval?.approvalId === approval.approvalId,
      source: approval.status,
    })),
  );

  elements.approvalHistoryHelp.textContent = `${state.approvals.length} approval record${state.approvals.length === 1 ? "" : "s"} in this workspace.`;
}

async function loadAutomations(): Promise<void> {
  try {
    const payload = await apiJson<{ automations: AutomationSummary[] }>("/api/automations");
    state.automations = payload.automations;
    renderAutomations();
  } catch (error) {
    elements.automationHelp.textContent = errorToMessage(error, "Failed to load automations.");
    renderAutomations();
  }
}

async function loadAutomationRuns(): Promise<void> {
  try {
    const payload = await apiJson<{ runs: AutomationRunSummary[] }>("/api/automation-runs");
    state.automationRuns = payload.runs;
    renderAutomationRuns();
  } catch (error) {
    elements.automationRunHelp.textContent = errorToMessage(error, "Failed to load automation runs.");
    renderAutomationRuns();
  }
}

async function createAutomationFromForm(): Promise<void> {
  const title = elements.automationTitleInput.value.trim();
  const prompt = elements.automationPrompt.value.trim();
  if (!title || !prompt) {
    elements.automationHelp.textContent = "Automation title and prompt are required.";
    return;
  }

  elements.automationSaveButton.disabled = true;
  try {
    await apiJson<{ automation: AutomationSummary }>("/api/automations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        prompt,
        kind: elements.automationKind.value,
        intervalMs: readAutomationIntervalMs(),
      }),
    });
    elements.automationHelp.textContent = "Automation created. It will run locally when due.";
    await loadAutomations();
    await loadAppReadiness();
  } catch (error) {
    elements.automationHelp.textContent = errorToMessage(error, "Failed to create automation.");
  } finally {
    elements.automationSaveButton.disabled = false;
  }
}

async function runAutomationTick(): Promise<void> {
  elements.automationTickButton.disabled = true;
  try {
    const payload = await apiJson<{ runs: AutomationRunSummary[] }>("/api/automations/tick", { method: "POST" });
    elements.automationHelp.textContent = `Ran ${payload.runs.length} due automation${payload.runs.length === 1 ? "" : "s"}.`;
    await loadAutomations();
    await loadAutomationRuns();
    await loadApprovals();
    await loadArtifacts();
    await loadAppReadiness();
  } catch (error) {
    elements.automationHelp.textContent = errorToMessage(error, "Failed to run due automations.");
  } finally {
    elements.automationTickButton.disabled = false;
  }
}

async function handleAutomationAction(automationId: string, action: string): Promise<void> {
  try {
    if (action === "delete") {
      await apiJson(`/api/automations/${encodeURIComponent(automationId)}`, { method: "DELETE" });
    } else {
      await apiJson(`/api/automations/${encodeURIComponent(automationId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: action === "pause" ? "paused" : "active" }),
      });
    }
    await loadAutomations();
    await loadAppReadiness();
  } catch (error) {
    elements.automationHelp.textContent = errorToMessage(error, "Failed to update automation.");
  }
}

function renderAutomations(): void {
  if (state.automations.length === 0) {
    elements.automationList.replaceChildren(createListItem("No automations in this workspace yet."));
    return;
  }

  elements.automationList.replaceChildren(
    ...state.automations.map((automation) => {
      const item = document.createElement("li");
      const title = document.createElement("div");
      const pauseButton = document.createElement("button");
      const deleteButton = document.createElement("button");

      title.className = "list-button";
      title.textContent = `${automation.title} / ${automation.kind} / ${automation.status} / next ${automation.nextRunAt ? formatDate(automation.nextRunAt) : "none"}`;
      pauseButton.type = "button";
      pauseButton.className = "secondary-button";
      pauseButton.dataset.automationId = automation.id;
      pauseButton.dataset.automationAction = automation.status === "active" ? "pause" : "resume";
      pauseButton.textContent = automation.status === "active" ? "Pause" : "Resume";
      deleteButton.type = "button";
      deleteButton.className = "secondary-button";
      deleteButton.dataset.automationId = automation.id;
      deleteButton.dataset.automationAction = "delete";
      deleteButton.textContent = "Delete";
      item.append(title, pauseButton, deleteButton);
      return item;
    }),
  );
}

function renderAutomationRuns(): void {
  if (state.automationRuns.length === 0) {
    elements.automationRunList.replaceChildren(createListItem("No automation runs yet."));
    elements.automationRunHelp.textContent = "Run due automations to create local proactive results.";
    return;
  }

  elements.automationRunList.replaceChildren(
    ...state.automationRuns.map((run) => createActionListItem({
      id: run.id,
      idName: "runId",
      title: run.status,
      meta: `${run.result ?? "No result yet"} / ${formatDate(run.startedAt)}`,
      pressed: false,
      source: run.status,
    })),
  );
  elements.automationRunHelp.textContent = `${state.automationRuns.length} automation run${state.automationRuns.length === 1 ? "" : "s"} recorded.`;
}

async function openRun(runId: string): Promise<void> {
  if (!runId) return;

  try {
    const live = await apiJson<{ live: LiveRunState }>(`/api/runs/${encodeURIComponent(runId)}/live`)
      .catch(() => undefined);
    if (live?.live) {
      state.activeRunId = runId;
      state.liveRun = live.live;
      state.runEvents = live.live.events;
      renderRunHistory();
      renderCurrentRunView();
      if (!isTerminalStatus(live.live.status)) {
        startRunPolling(runId);
      }
      return;
    }

    const payload = await apiJson<{ events: RunEventSummary[] }>(`/api/runs/${encodeURIComponent(runId)}/events`);
    state.activeRunId = runId;
    state.runEvents = payload.events;
    state.memoryUsage = deriveMemoryUsageFromEvents(payload.events);
    state.liveRun = createPersistedRunView(runId);
    renderRunHistory();
    renderCurrentRunView();
  } catch (error) {
    elements.runHistoryHelp.textContent = errorToMessage(error, "Failed to load run events.");
  }
}

function renderRunHistory(): void {
  if (state.runs.length === 0) {
    elements.runHistoryList.replaceChildren(createListItem("No persisted runs in this workspace yet."));
    elements.runEventHistory.replaceChildren();
    elements.runHistoryHelp.textContent = "Run the mock executor to create persisted run history.";
    return;
  }

  elements.runHistoryList.replaceChildren(
    ...state.runs.map((run) => createActionListItem({
      id: run.id,
      idName: "runId",
      title: run.goal,
      meta: `${run.executorChoice} / ${run.status} / ${formatDate(run.startedAt)}`,
      pressed: run.id === state.activeRunId,
      source: run.status,
    })),
  );

  const activeRun = state.runs.find((run) => run.id === state.activeRunId);
  elements.runHistoryHelp.textContent = activeRun
    ? `Opened run ${truncate(activeRun.id, 24)}. Events: ${state.runEvents.length}.`
    : "Select a run to inspect persisted events.";
  elements.runEventHistory.replaceChildren(
    ...state.runEvents.map((event) => createEventListItem(event.type, event.message)),
  );
}

function createPersistedRunView(runId: string): LiveRunState | undefined {
  const run = state.runs.find((item) => item.id === runId);
  if (!run) return undefined;

  const artifacts = state.artifacts.filter((artifact) => artifact.runId === runId);
  return {
    runId,
    goal: run.goal,
    executorChoice: toExecutorChoice(run.executorChoice),
    status: run.status,
    stream: state.runEvents.filter((event) => event.type === "run.stream").map((event) => event.message),
    events: [...state.runEvents],
    artifacts,
    artifactContents: Object.fromEntries(artifacts.map((artifact) => [artifact.id, artifact.content ?? ""])),
    memoryUsage: deriveMemoryUsageFromEvents(state.runEvents),
    ...(run.completedAt ? { completedAt: run.completedAt } : {}),
  };
}

function deriveMemoryUsageFromEvents(events: RunEventSummary[]): RetrievedMemory[] {
  const memoryEvent = [...events].reverse().find((event) => event.type === "memory.used");
  if (!memoryEvent) return [];
  const titles = memoryEvent.message.replace(/^Memory used:\s*/, "").split(",").map((title) => title.trim()).filter(Boolean);
  return state.memories
    .filter((memory) => titles.includes(memory.title))
    .map((memory) => ({
      memoryId: memory.id,
      title: memory.title,
      content: memory.content,
      sensitivity: memory.sensitivity,
      scope: memory.scope,
      ...(memory.workspaceId ? { workspaceId: memory.workspaceId } : {}),
      score: 1,
    }));
}

function renderCurrentRunView(): void {
  const liveRun = state.liveRun;
  if (!liveRun) {
    render(state.current);
    renderApprovalPanel(undefined);
    elements.runCancelButton.disabled = true;
    renderMemoryUsage();
    return;
  }

  const latestEvent = liveRun.events.at(-1);
  const phase = liveRun.status;
  elements.statusPill.textContent = phase;
  elements.statusPill.dataset.phase = phase;
  elements.runSummary.textContent = liveRun.pendingApproval?.reason
    ?? latestEvent?.message
    ?? `${liveRun.executorChoice} run is ${liveRun.status}.`;
  elements.missionMeta.textContent =
    `Run ${truncate(liveRun.runId, 28)} / Executor ${liveRun.executorChoice}${liveRun.timeoutMs ? ` / Timeout ${liveRun.timeoutMs}ms` : ""}`;
  elements.transcript.replaceChildren(
    ...(liveRun.stream.length > 0
      ? liveRun.stream.map((line) => createListItem(line))
      : [createListItem("No stream output yet.")]),
  );
  elements.eventLog.replaceChildren(
    ...liveRun.events.map((event) => createEventListItem(event.type, event.message)),
  );
  elements.runArtifactList.replaceChildren(
    ...(liveRun.artifacts.length > 0
      ? liveRun.artifacts.map((artifact) => createListItem(`${artifact.title} (${artifact.kind})`))
      : [createListItem("Artifacts will appear when this run produces them.")]),
  );
  elements.runArtifactPreview.textContent = liveRun.artifacts.length > 0
    ? liveRun.artifactContents[liveRun.artifacts[0]?.id ?? ""] ?? "Artifact has no preview content."
    : "Run artifacts will render here after a task completes.";
  renderApprovalPanel(liveRun.pendingApproval);
  state.memoryUsage = liveRun.memoryUsage ?? [];
  renderMemoryUsage();
  elements.runCancelButton.disabled = isTerminalStatus(liveRun.status);
  elements.runButton.disabled = !isTerminalStatus(liveRun.status) && liveRun.status !== "failed";
}

function renderApprovalPanel(approval: LiveRunState["pendingApproval"]): void {
  elements.approvalPanel.dataset.active = approval ? "true" : "false";
  elements.approvalStatus.textContent = approval ? "pending" : "no request";
  elements.approvalCategory.textContent = approval?.category ?? "none";
  elements.approvalRiskLevel.textContent = approval?.riskLevel ?? "none";
  elements.approvalRiskLevel.dataset.riskLevel = approval?.riskLevel ?? "";
  elements.approvalRequestedAction.textContent = approval?.requestedAction ?? "none";
  elements.approvalDecision.textContent = approval?.decision ?? (approval ? "pending" : "none");
  elements.approvalResolvedAt.textContent = approval?.resolvedAt ? formatDate(approval.resolvedAt) : "not resolved";
  elements.approvalReason.textContent = approval?.reason ?? "Runs that require approval will pause here.";
  elements.approvalGrantButton.disabled = !approval;
  elements.approvalRejectButton.disabled = !approval;
}

function render(nextState: SpaceDemoState): void {
  renderStatus(nextState);
  renderTranscript(nextState);
  renderEvents(nextState);
  renderRunOutput(nextState);
}

function renderChatMessages(): void {
  elements.chatMessages.replaceChildren(
    ...state.chatMessages.map((message) => {
      const item = createListItem(message.content);
      item.dataset.role = message.role;
      return item;
    }),
  );
}

function renderStatus(nextState: SpaceDemoState): void {
  const runSection = nextState.shell.sections[1];
  const statusLabel = nextState.error ?? runSection.summary;

  elements.statusPill.textContent = nextState.phase;
  elements.statusPill.dataset.phase = nextState.phase;
  elements.runSummary.textContent = statusLabel;
  elements.missionMeta.textContent = nextState.summary
    ? `Mission ${nextState.summary.missionId} / Run ${nextState.summary.runId} / Executor ${nextState.executorChoice}`
    : `Executor ${nextState.executorChoice} / waiting for a goal`;
}

function renderTranscript(nextState: SpaceDemoState): void {
  const chatSection = nextState.shell.sections[0];
  elements.transcript.replaceChildren(
    ...chatSection.transcriptPreview.map((line) => createListItem(line)),
  );
}

function renderEvents(nextState: SpaceDemoState): void {
  elements.eventLog.replaceChildren(
    ...nextState.events.map((event) => createEventListItem(event.type, event.message)),
  );
}

function renderRunOutput(nextState: SpaceDemoState): void {
  if (nextState.artifacts.length === 0) {
    elements.runArtifactList.replaceChildren(createListItem(nextState.shell.sections[2].emptyState));
    elements.runArtifactPreview.textContent = "Run artifacts will render here after a task completes.";
    return;
  }

  elements.runArtifactList.replaceChildren(
    ...nextState.artifacts.map((artifact) => createListItem(`${artifact.title} (${artifact.kind})`)),
  );
  elements.runArtifactPreview.textContent =
    nextState.artifactContents[nextState.artifacts[0]?.id ?? ""] ?? "Artifact has no preview content.";
}

function createEventListItem(typeText: string, messageText: string): HTMLLIElement {
  const item = document.createElement("li");
  const type = document.createElement("span");
  const message = document.createElement("span");

  type.className = "event-type";
  type.textContent = typeText;
  message.textContent = messageText;
  item.append(type, message);
  return item;
}

function createReadinessListItem(input: AppReadinessCheck): HTMLLIElement {
  const item = document.createElement("li");
  const button = document.createElement("button");
  const title = document.createElement("span");
  const meta = document.createElement("span");
  const badge = document.createElement("span");

  button.type = "button";
  button.className = "list-button readiness-list-item";
  button.dataset.readinessTarget = input.targetPage;
  button.setAttribute("aria-label", `Open ${input.targetPage} for ${input.title}`);
  title.className = "item-title";
  title.textContent = input.title;
  meta.className = "item-meta";
  meta.textContent = input.detail;
  badge.className = "source-badge";
  badge.dataset.source = input.status;
  badge.textContent = input.status;

  button.append(title, meta, badge);
  item.append(button);
  return item;
}

function createActionListItem(input: {
  id: string;
  idName: "artifactId" | "runId" | "approvalId" | "memoryId" | "capabilityId" | "recipeId" | "recipeTestId";
  title: string;
  meta: string;
  pressed: boolean;
  source: string;
}): HTMLLIElement {
  const item = document.createElement("li");
  const button = document.createElement("button");
  const title = document.createElement("span");
  const meta = document.createElement("span");
  const badge = document.createElement("span");

  button.type = "button";
  button.className = "list-button";
  button.dataset[input.idName] = input.id;
  button.setAttribute("aria-pressed", input.pressed ? "true" : "false");
  title.className = "item-title";
  title.textContent = input.title;
  meta.className = "item-meta";
  meta.textContent = input.meta;
  badge.className = "source-badge";
  badge.dataset.source = input.source;
  badge.textContent = input.source;

  button.append(title, meta, badge);
  item.append(button);
  return item;
}

function createListItem(text: string): HTMLLIElement {
  const item = document.createElement("li");
  item.textContent = text;
  return item;
}

function createOption(value: string, text: string): HTMLOptionElement {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = text;
  return option;
}

function getElement<T extends HTMLElement>(
  id: string,
  constructor: { new (): T },
): T {
  const element = document.getElementById(id);

  if (!(element instanceof constructor)) {
    throw new Error(`Missing element: ${id}`);
  }

  return element;
}

function toExecutorChoice(value: string): SpaceDemoExecutorChoice {
  switch (value) {
    case "codex":
    case "claude-code":
    case "mock":
      return value;
    default:
      return "mock";
  }
}

function readTimeoutMs(): number | undefined {
  const value = Number.parseInt(elements.executorTimeoutInput.value, 10);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function readAutomationIntervalMs(): number | undefined {
  const value = Number.parseInt(elements.automationIntervalInput.value, 10);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function isTerminalStatus(status: string): boolean {
  return status === "completed" || status === "failed" || status === "interrupted";
}

function renderProviderError(message: string): void {
  elements.providerStatus.textContent = "failed";
  elements.providerStatus.dataset.phase = "failed";
  elements.providerHelp.textContent = message;
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({})) as { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed with HTTP ${response.status}.`);
  }

  return payload as T;
}

function optionalFormValue(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function errorToMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}
