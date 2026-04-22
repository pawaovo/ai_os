import {
  createInitialSpaceDemoState,
  type SpaceDemoExecutorChoice,
  type SpaceDemoState,
} from "./demo-runtime.js";
import {
  DEFAULT_APP_LANGUAGE,
  normalizeAppLanguage,
  translateApp,
  translatedValuesForKey,
  type AppLanguage,
} from "./i18n.js";
import type { ChatUiMessage } from "./server-runtime.js";
import type { ApprovalRecord, WorkspaceTrustLevel } from "@ai-os/approval-core";
import type { CapabilityPermission, CapabilityRecord, CapabilityRunRecord, RecipeRecord, RecipeTestRecord } from "@ai-os/capability-contract";
import type { MemoryRecord, MemoryRetrievalTrace, MemoryScope, MemorySensitivity, RetrievedMemory } from "@ai-os/kernel-memory";

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
  itemId?: string;
}

interface RunTurnSummary {
  turnId: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  itemIds: string[];
  latestEventType: string;
}

interface RunItemSummary {
  itemId: string;
  kind: string;
  status: string;
  title: string;
  detail?: string;
  startedAt: string;
  completedAt?: string;
  eventIds: string[];
  approvalId?: string;
  artifactId?: string;
}

interface QueryLoopTransitionSummary {
  phase: string;
  at: string;
  reason: string;
}

interface QueryLoopInterceptionSummary {
  interceptionId: string;
  kind: string;
  stage: string;
  approvalId: string;
  status: string;
  reason: string;
  createdAt: string;
  resolvedAt?: string;
  decision?: string;
}

interface QueryLoopRetrySiteSummary {
  site: string;
  kind: string;
  retryable: boolean;
  status: string;
  attempts: number;
  lastAttemptAt?: string;
  lastResolvedAt?: string;
  lastError?: string;
}

interface QueryLoopFailureSummary {
  site: string;
  retryable: boolean;
  message: string;
  at: string;
}

interface QueryLoopStateSummary {
  mode: string;
  phase: string;
  toolBoundary: string;
  permissionBoundary: string;
  retryPolicy: string;
  lastTransitionAt: string;
  transitions: QueryLoopTransitionSummary[];
  interceptions: QueryLoopInterceptionSummary[];
  retrySites: QueryLoopRetrySiteSummary[];
  lastFailure?: QueryLoopFailureSummary;
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
  language?: AppLanguage;
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
    windowsCommand: string;
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
  sessionId?: string;
  runId: string;
  goal: string;
  executorChoice: SpaceDemoExecutorChoice;
  status: string;
  stream: string[];
  events: RunEventSummary[];
  currentTurn?: RunTurnSummary;
  queryLoop?: QueryLoopStateSummary;
  items?: RunItemSummary[];
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
  memoryTrace?: MemoryRetrievalTrace;
  completedAt?: string;
  timeoutMs?: number;
}

const state = {
  language: normalizeAppLanguage(globalThis.navigator.language, DEFAULT_APP_LANGUAGE),
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
  languageSelect: getElement("language-select", HTMLSelectElement),
};

elements.navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActivePage(button.dataset.pageTarget ?? "space");
  });
});

elements.languageSelect.addEventListener("change", () => {
  void saveLanguageSetting();
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
  applyStaticTranslations();
  await loadLanguageSetting();
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

function t(key: string, variables: Record<string, string | number> = {}): string {
  return translateApp(state.language, key, variables);
}

function translatedToken(value: string): string {
  const key = `status.${value}`;
  const translated = t(key);
  if (translated !== key) return translated;
  const sourceKey = `source.${value}`;
  const translatedSource = t(sourceKey);
  return translatedSource !== sourceKey ? translatedSource : value;
}

function translateKeyOrFallback(key: string, fallback: string): string {
  const translated = t(key);
  return translated === key ? fallback : translated;
}

function localizeExecutorChoice(value: string): string {
  switch (value) {
    case "mock":
      return t("run.executor.mock");
    case "codex":
      return t("run.executor.codex");
    case "claude-code":
      return t("run.executor.claude-code");
    default:
      return value;
  }
}

function localizeWorkspaceTrustLevel(value: string): string {
  return translateKeyOrFallback(`workspace.trust.${value}`, value);
}

function localizeAutomationKind(value: string): string {
  return translateKeyOrFallback(`automation.kind.${value}`, value);
}

function localizeArtifactKind(value: string): string {
  return translateKeyOrFallback(`artifact.form.kind.${value}`, value);
}

function localizeArtifactSource(value: string): string {
  return translateKeyOrFallback(`dynamic.artifact.source.${value}`, value);
}

function localizeCapabilityKind(value: string): string {
  return translateKeyOrFallback(`dynamic.capability.kind.${value}`, value);
}

function localizeCapabilityPermissionCategory(value: string): string {
  return translateKeyOrFallback(`dynamic.capability.permission.${value}`, value);
}

function localizeApprovalCategory(value: string): string {
  return translateKeyOrFallback(`dynamic.approval.category.${value}`, value);
}

function localizePageTarget(value: string): string {
  switch (value) {
    case "start":
    case "space":
    case "chat":
    case "runs":
    case "automations":
    case "artifacts":
    case "approvals":
    case "memory":
    case "capabilities":
    case "forge":
    case "providers":
    case "settings":
      return t(`nav.${value}`);
    default:
      return value;
  }
}

function applyStaticTranslations(): void {
  document.documentElement.lang = state.language;
  document.title = t("meta.title");
  elements.languageSelect.value = state.language;

  setText(".workbench-hero .eyebrow", t("hero.eyebrow"));
  setText("#app-title", t("hero.title"));
  setText(".workbench-hero .hero-copy", t("hero.copy"));
  setText(".app-nav .eyebrow", t("nav.eyebrow"));
  setNavText("start", t("nav.start"));
  setNavText("space", t("nav.space"));
  setNavText("chat", t("nav.chat"));
  setNavText("runs", t("nav.runs"));
  setNavText("automations", t("nav.automations"));
  setNavText("artifacts", t("nav.artifacts"));
  setNavText("approvals", t("nav.approvals"));
  setNavText("memory", t("nav.memory"));
  setNavText("capabilities", t("nav.capabilities"));
  setNavText("forge", t("nav.forge"));
  setNavText("providers", t("nav.providers"));
  setNavText("settings", t("nav.settings"));

  setText(".readiness-panel .eyebrow", t("readiness.eyebrow"));
  setText("#readiness-title", t("readiness.title"));
  if (!state.appReadiness) {
    elements.appReadinessHelp.textContent = t("readiness.help.default");
  }

  setText(".workspace-panel .eyebrow", t("workspace.eyebrow"));
  setText(".workspace-panel .mini-label", t("workspace.mini"));
  setText("#workspace-title", t("workspace.title"));
  setControlLabel(elements.workspaceSelect, t("workspace.saved"));
  setControlLabel(elements.workspaceName, t("workspace.name"));
  setControlLabel(elements.workspacePath, t("workspace.path"));
  setPlaceholder(elements.workspacePath, t("workspace.path.placeholder"));
  setControlLabel(elements.workspaceTrustLevel, t("workspace.trust"));
  setOptionText(elements.workspaceTrustLevel, "strict", t("workspace.trust.strict"));
  setOptionText(elements.workspaceTrustLevel, "trusted-local-writes", t("workspace.trust.trusted-local-writes"));
  elements.workspaceSaveButton.textContent = t("workspace.button.create");
  elements.workspaceUpdateButton.textContent = t("workspace.button.update");
  elements.workspaceDeleteButton.textContent = t("workspace.button.delete");

  setText(".threads-panel .eyebrow", t("threads.eyebrow"));
  setText(".threads-panel .mini-label", t("threads.mini"));
  setText("#threads-title", t("threads.title"));
  elements.threadNewButton.textContent = t("threads.button.new");
  elements.threadRenameButton.textContent = t("threads.button.rename");
  elements.threadDeleteButton.textContent = t("threads.button.delete");

  setText(".automation-panel .eyebrow", t("automation.eyebrow"));
  setText(".automation-panel .mini-label", t("automation.mini"));
  setText("#automation-title", t("automation.title"));
  setControlLabel(elements.automationTitleInput, t("automation.form.title"));
  setControlLabel(elements.automationKind, t("automation.form.kind"));
  setControlLabel(elements.automationIntervalInput, t("automation.form.interval"));
  setControlLabel(elements.automationPrompt, t("automation.form.prompt"));
  syncLocalizedInputValue(elements.automationTitleInput, "automation.title.default");
  syncLocalizedInputValue(elements.automationPrompt, "automation.prompt.default");
  setOptionText(elements.automationKind, "one-off", t("automation.kind.one-off"));
  setOptionText(elements.automationKind, "scheduled", t("automation.kind.scheduled"));
  setOptionText(elements.automationKind, "heartbeat", t("automation.kind.heartbeat"));
  elements.automationSaveButton.textContent = t("automation.button.create");
  elements.automationTickButton.textContent = t("automation.button.tick");
  if (!elements.automationHelp.dataset.dynamic) {
    elements.automationHelp.textContent = t("automation.help.default");
  }

  setText(".memory-panel .eyebrow", t("memory.eyebrow"));
  setText(".memory-panel .mini-label", t("memory.mini"));
  setText("#memory-title", t("memory.title"));
  setControlLabel(elements.memoryTitleInput, t("memory.form.title"));
  setControlLabel(elements.memoryScope, t("memory.form.scope"));
  setControlLabel(elements.memorySensitivity, t("memory.form.sensitivity"));
  setControlLabel(elements.memoryContent, t("memory.form.content"));
  syncLocalizedInputValue(elements.memoryTitleInput, "memory.title.default");
  syncLocalizedInputValue(elements.memoryContent, "memory.content.default");
  setOptionText(elements.memoryScope, "personal", t("memory.scope.personal"));
  setOptionText(elements.memoryScope, "workspace", t("memory.scope.workspace"));
  setOptionText(elements.memorySensitivity, "low", t("memory.sensitivity.low"));
  setOptionText(elements.memorySensitivity, "medium", t("memory.sensitivity.medium"));
  setOptionText(elements.memorySensitivity, "high", t("memory.sensitivity.high"));
  elements.memorySaveButton.textContent = t("memory.button.save");
  if (!elements.memoryHelp.dataset.dynamic) {
    elements.memoryHelp.textContent = t("memory.help.default");
  }

  setText(".capability-panel .eyebrow", t("capability.eyebrow"));
  setText(".capability-panel .mini-label", t("capability.mini"));
  setText("#capability-title", t("capability.title"));
  if (!elements.capabilityHelp.dataset.dynamic) {
    elements.capabilityHelp.textContent = t("capability.help.default");
  }

  setText(".forge-panel .eyebrow", t("forge.eyebrow"));
  setText(".forge-panel .mini-label", t("forge.mini"));
  setText("#forge-title", t("forge.title"));
  setControlLabel(elements.forgeRunSelect, t("forge.form.run"));
  elements.forgeCreateButton.textContent = t("forge.button.create");
  if (!elements.forgeHelp.dataset.dynamic) {
    elements.forgeHelp.textContent = t("forge.help.default");
  }

  setText(".start-panel .eyebrow", t("start.eyebrow"));
  setText(".start-panel .mini-label", t("start.mini"));
  setText("#start-title", t("start.title"));
  setText(".start-copy", t("start.copy"));
  setMetricLabel(0, t("start.metrics.threads"));
  setMetricLabel(1, t("start.metrics.runs"));
  setMetricLabel(2, t("start.metrics.artifacts"));
  setMetricLabel(3, t("start.metrics.capabilities"));
  setText(".start-panel h3", t("start.recommended"));

  setText(".chat-panel .eyebrow", t("chat.eyebrow"));
  setText(".chat-panel .mini-label", t("chat.mini"));
  setText("#chat-title", t("chat.title"));
  setText("label[for='chat-input']", t("chat.form.message"));
  syncLocalizedInputValue(elements.chatInput, "chat.input.default");
  elements.chatSendButton.textContent = t("chat.button.send");

  setText(".executor-panel .eyebrow", t("run.eyebrow"));
  setText("#executor-title", t("run.title"));
  setText("label[for='goal-input']", t("run.form.goal"));
  syncLocalizedInputValue(elements.input, "run.goal.default");
  setControlLabel(elements.executorTimeoutInput, t("run.form.timeout"));
  setText("label[for='executor-select']", t("run.form.executor"));
  setOptionText(elements.executor, "mock", t("run.executor.mock"));
  setOptionText(elements.executor, "codex", t("run.executor.codex"));
  setOptionText(elements.executor, "claude-code", t("run.executor.claude-code"));
  elements.runButton.textContent = t("run.button.run");
  elements.runCancelButton.textContent = t("run.button.cancel");

  setText(".approval-panel .eyebrow", t("approval.eyebrow"));
  setText("#approval-title", t("approval.title"));
  setApprovalGridLabel(0, t("approval.category"));
  setApprovalGridLabel(1, t("approval.risk"));
  setApprovalGridLabel(2, t("approval.action"));
  setApprovalGridLabel(3, t("approval.decision"));
  setApprovalGridLabel(4, t("approval.resolved"));
  elements.approvalGrantButton.textContent = t("approval.button.grant");
  elements.approvalRejectButton.textContent = t("approval.button.reject");
  if (!state.liveRun?.pendingApproval) {
    elements.approvalReason.textContent = t("approval.reason.default");
  }

  setText(".run-output-panel .eyebrow", t("run-output.eyebrow"));
  setText(".run-output-panel .mini-label", t("run-output.mini"));
  setText("#run-output-title", t("run-output.title"));
  setRunOutputHeading(0, t("run-output.transcript"));
  setRunOutputHeading(1, t("run-output.events"));
  setRunOutputHeading(2, t("run-output.artifacts"));

  setText(".settings-panel .eyebrow", t("settings.eyebrow"));
  setText(".settings-panel .mini-label", t("settings.mini"));
  setText("#settings-title", t("settings.title"));
  setControlLabel(elements.languageSelect, t("language.label"));
  setOptionText(elements.languageSelect, "en", t("language.en"));
  setOptionText(elements.languageSelect, "zh-CN", t("language.zh-CN"));
  renderSettingsList();

  setText(".capability-detail-panel .eyebrow", t("capability-detail.eyebrow"));
  setText("#capability-detail-title", t("capability-detail.title"));
  if (!state.activeCapabilityId) {
    elements.capabilityDescription.textContent = t("capability-detail.help.default");
  }
  elements.capabilityRunButton.textContent = t("capability-detail.button.run");

  setText(".recipe-editor-panel .eyebrow", t("recipe-editor.eyebrow"));
  setText("#recipe-editor-title", t("recipe-editor.title"));
  setControlLabel(elements.recipeTitleInput, t("recipe-editor.form.title"));
  setControlLabel(elements.recipePromptInput, t("recipe-editor.form.prompt"));
  setControlLabel(elements.recipeInputSpec, t("recipe-editor.form.inputSpec"));
  setControlLabel(elements.recipeOutputSpec, t("recipe-editor.form.outputSpec"));
  elements.recipeSaveButton.textContent = t("recipe-editor.button.save");
  elements.recipeTestButton.textContent = t("recipe-editor.button.test");

  setText(".install-panel .eyebrow", t("install.eyebrow"));
  setText("#install-title", t("install.title"));
  if (!state.appReadiness) {
    elements.installHelp.textContent = t("install.help.default");
  }

  setText(".memory-usage-panel .eyebrow", t("memory-usage.eyebrow"));
  setText(".memory-usage-panel .mini-label", t("memory-usage.mini"));
  setText("#memory-usage-title", t("memory-usage.title"));
  if (state.memoryUsage.length === 0) {
    elements.memoryUsageHelp.textContent = t("memory-usage.help.default");
  }

  setText(".capability-history-panel .eyebrow", t("capability-history.eyebrow"));
  setText(".capability-history-panel .mini-label", t("capability-history.mini"));
  setText("#capability-history-title", t("capability-history.title"));
  if (state.capabilityRuns.length === 0) {
    elements.capabilityRunHelp.textContent = t("capability-history.help.default");
  }

  setText(".recipe-test-history-panel .eyebrow", t("recipe-test-history.eyebrow"));
  setText(".recipe-test-history-panel .mini-label", t("recipe-test-history.mini"));
  setText("#recipe-test-history-title", t("recipe-test-history.title"));
  if (state.recipeTests.length === 0) {
    elements.recipeTestHelp.textContent = t("recipe-test-history.help.default");
  }

  setText(".executor-status-panel .eyebrow", t("executor-status.eyebrow"));
  setText(".executor-status-panel .mini-label", t("executor-status.mini"));
  setText("#executor-status-title", t("executor-status.title"));
  if (!elements.executorStatusHelp.dataset.dynamic) {
    elements.executorStatusHelp.textContent = t("executor-status.help.default");
  }

  setText(".provider-panel .eyebrow", t("provider.eyebrow"));
  setText("#provider-title", t("provider.title"));
  setControlLabel(elements.providerSelect, t("provider.form.saved"));
  setControlLabel(elements.providerName, t("provider.form.name"));
  setControlLabel(elements.providerProtocol, t("provider.form.protocol"));
  setControlLabel(elements.providerBaseUrl, t("provider.form.baseUrl"));
  setControlLabel(elements.providerModelSelect, t("provider.form.model"));
  setControlLabel(elements.providerModel, t("provider.form.manualModel"));
  setControlLabel(elements.providerApiKey, t("provider.form.apiKey"));
  setPlaceholder(elements.providerBaseUrl, t("provider.form.baseUrl.placeholder"));
  setPlaceholder(elements.providerModel, t("provider.form.manualModel.placeholder"));
  setPlaceholder(elements.providerApiKey, t("provider.form.apiKey.placeholder"));
  setOptionText(elements.providerProtocol, "openai-compatible", t("provider.protocol.openai-compatible"));
  setOptionText(elements.providerProtocol, "anthropic-compatible", t("provider.protocol.anthropic-compatible"));
  syncLocalizedInputValue(elements.providerName, "dynamic.provider.defaultName");
  elements.providerSaveButton.textContent = t("provider.button.save");
  elements.providerTestButton.textContent = t("provider.button.doctor");
  elements.providerModelsButton.textContent = t("provider.button.models");
  elements.providerDeleteButton.textContent = t("provider.button.delete");
  if (!state.activeProviderId && !elements.providerHelp.dataset.dynamic) {
    elements.providerHelp.textContent = t("provider.help.default");
  }

  setText(".run-history-panel .eyebrow", t("run-history.eyebrow"));
  setText(".run-history-panel .mini-label", t("run-history.mini"));
  setText("#run-history-title", t("run-history.title"));
  if (state.runs.length === 0) {
    elements.runHistoryHelp.textContent = t("run-history.help.default");
  }

  setText(".approval-history-panel .eyebrow", t("approval-history.eyebrow"));
  setText(".approval-history-panel .mini-label", t("approval-history.mini"));
  setText("#approval-history-title", t("approval-history.title"));
  if (state.approvals.length === 0) {
    elements.approvalHistoryHelp.textContent = t("approval-history.help.default");
  }

  setText(".automation-history-panel .eyebrow", t("automation-history.eyebrow"));
  setText(".automation-history-panel .mini-label", t("automation-history.mini"));
  setText("#automation-history-title", t("automation-history.title"));
  if (state.automationRuns.length === 0) {
    elements.automationRunHelp.textContent = t("automation-history.help.default");
  }

  setText(".artifact-panel .eyebrow", t("artifact.eyebrow"));
  setText(".artifact-panel .mini-label", t("artifact.mini"));
  setText("#artifact-title", t("artifact.title"));
  elements.artifactOpenButton.textContent = t("artifact.button.open");
  elements.artifactDeleteButton.textContent = t("artifact.button.delete");
  setControlLabel(elements.artifactTitleInput, t("artifact.form.title"));
  setPlaceholder(elements.artifactTitleInput, t("artifact.form.title.placeholder"));
  setControlLabel(elements.artifactKind, t("artifact.form.kind"));
  setOptionText(elements.artifactKind, "markdown", t("artifact.form.kind.markdown"));
  setOptionText(elements.artifactKind, "text", t("artifact.form.kind.text"));
  setOptionText(elements.artifactKind, "report", t("artifact.form.kind.report"));
  setControlLabel(elements.artifactContent, t("artifact.form.content"));
  setPlaceholder(elements.artifactContent, t("artifact.form.content.placeholder"));
  elements.artifactSaveButton.textContent = t("artifact.button.save");
  if (!state.activeArtifactId && state.artifacts.length === 0 && !elements.artifactHelp.dataset.dynamic) {
    elements.artifactHelp.textContent = t("artifact.help.default");
    elements.artifactPreview.textContent = t("artifact.preview.default");
  }
}

function setText(selector: string, text: string): void {
  const element = document.querySelector<HTMLElement>(selector);
  if (element) element.textContent = text;
}

function setNavText(pageTarget: string, text: string): void {
  const button = elements.navButtons.find((item) => item.dataset.pageTarget === pageTarget);
  if (button) button.textContent = text;
}

function setControlLabel(control: HTMLElement, text: string): void {
  const label = control.closest("label");
  if (!label) return;
  const textNode = Array.from(label.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
  if (textNode) {
    textNode.textContent = `${text}\n`;
  }
}

function setPlaceholder(control: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  control.placeholder = value;
}

function setOptionText(select: HTMLSelectElement, value: string, text: string): void {
  const option = Array.from(select.options).find((entry) => entry.value === value);
  if (option) option.textContent = text;
}

function setMetricLabel(index: number, text: string): void {
  const metric = document.querySelectorAll<HTMLElement>(".metric-grid div span")[index];
  if (metric) metric.textContent = text;
}

function setApprovalGridLabel(index: number, text: string): void {
  const label = document.querySelectorAll<HTMLElement>(".approval-detail-grid span")[index * 2];
  if (label) label.textContent = text;
}

function setRunOutputHeading(index: number, text: string): void {
  const heading = document.querySelectorAll<HTMLElement>(".run-output-panel h3")[index];
  if (heading) heading.textContent = text;
}

function renderSettingsList(): void {
  const list = document.querySelector<HTMLElement>(".settings-list");
  if (!list) return;
  const entries = [
    ["settings.item.start.title", "settings.item.start.detail"],
    ["settings.item.providers.title", "settings.item.providers.detail"],
    ["settings.item.executors.title", "settings.item.executors.detail"],
    ["settings.item.workspaceTrust.title", "settings.item.workspaceTrust.detail"],
    ["settings.item.automation.title", "settings.item.automation.detail"],
    ["settings.item.memory.title", "settings.item.memory.detail"],
    ["settings.item.capabilities.title", "settings.item.capabilities.detail"],
    ["settings.item.install.title", "settings.item.install.detail"],
  ] as const;

  list.replaceChildren(
    ...entries.map(([titleKey, detailKey]) => {
      const item = document.createElement("li");
      const strong = document.createElement("strong");
      const span = document.createElement("span");
      strong.textContent = t(titleKey);
      span.textContent = t(detailKey);
      item.append(strong, span);
      return item;
    }),
  );
}

function syncLocalizedInputValue(control: HTMLInputElement | HTMLTextAreaElement, key: string): void {
  const knownValues = translatedValuesForKey(key);
  if (control.value.trim().length === 0 || knownValues.includes(control.value)) {
    control.value = t(key);
  }
}

async function loadLanguageSetting(): Promise<void> {
  try {
    const payload = await apiJson<{ language?: string }>("/api/settings/language");
    state.language = normalizeAppLanguage(payload.language, state.language);
  } catch {
    state.language = normalizeAppLanguage(state.language);
  }
  applyStaticTranslations();
}

async function saveLanguageSetting(): Promise<void> {
  const nextLanguage = normalizeAppLanguage(elements.languageSelect.value, state.language);
  state.language = nextLanguage;
  applyStaticTranslations();
  await apiJson("/api/settings/language", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ language: nextLanguage }),
  });
  await refreshWorkspaceScopedData();
  await loadProviders();
  await loadExecutors();
  await loadThreads();
  await loadRuns();
  await loadApprovals();
  await loadAutomations();
  await loadAutomationRuns();
  await loadMemories();
  await loadCapabilities();
  await loadCapabilityRuns();
  await loadRecipes();
  await loadRecipeTests();
  await loadArtifacts();
  await loadAppReadiness();
  renderChatMessages();
  renderCurrentRunView();
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
    elements.executorStatusHelp.textContent = errorToMessage(error, t("dynamic.executor.loadFailed"));
    renderExecutorStatuses();
  }
}

async function loadAppReadiness(): Promise<void> {
  try {
    state.appReadiness = await apiJson<AppReadinessSummary>("/api/app/readiness");
    if (state.appReadiness.language) {
      state.language = normalizeAppLanguage(state.appReadiness.language, state.language);
      applyStaticTranslations();
    }
    renderAppReadiness();
  } catch (error) {
    elements.appReadinessStatus.textContent = translatedToken("failed");
    elements.appReadinessList.replaceChildren(createListItem(errorToMessage(error, t("dynamic.readiness.loadFailed"))));
    elements.startActionList.replaceChildren(createListItem(t("dynamic.readiness.openSettings")));
    elements.installHelp.textContent = t("dynamic.readiness.endpointFailed");
  }
}

function renderAppReadiness(): void {
  const readiness = state.appReadiness;
  if (!readiness) {
    elements.appReadinessStatus.textContent = t("dynamic.readiness.checking");
    return;
  }

  const actionCount = readiness.checks.filter((check) => check.status === "action").length;
  const readyCount = readiness.checks.filter((check) => check.status === "ready").length;
  elements.appReadinessStatus.textContent = actionCount > 0
    ? t("dynamic.readiness.actionCount", { count: actionCount })
    : translatedToken("ready");
  elements.appReadinessList.replaceChildren(
    ...readiness.checks.map((check) => createReadinessListItem(check)),
  );
  elements.appReadinessHelp.textContent = t("dynamic.readiness.summary", {
    releaseName: localizeKnownText(readiness.releaseName),
    version: readiness.version,
    readyCount,
    totalCount: readiness.checks.length,
    storageRoot: readiness.storageRoot,
  });
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
      title: t("dynamic.install.build"),
      status: "ready",
      detail: readiness.install.buildCommand,
      targetPage: "settings",
    }),
    createReadinessListItem({
      id: "install-open",
      title: t("dynamic.install.open"),
      status: "ready",
      detail: readiness.install.openCommand,
      targetPage: "settings",
    }),
    createReadinessListItem({
      id: "install-windows",
      title: t("dynamic.install.windows"),
      status: "optional",
      detail: readiness.install.windowsCommand,
      targetPage: "settings",
    }),
    createReadinessListItem({
      id: "install-signing",
      title: t("dynamic.install.signing"),
      status: readiness.install.signed && readiness.install.notarized ? "ready" : "optional",
      detail: readiness.install.signed && readiness.install.notarized
        ? t("dynamic.install.signed")
        : t("dynamic.install.unsigned"),
      targetPage: "settings",
    }),
    createReadinessListItem({
      id: "install-node",
      title: t("dynamic.install.node"),
      status: readiness.install.nodeRequired ? "optional" : "ready",
      detail: readiness.install.nodeRequired
        ? t("dynamic.install.nodeRequired")
        : t("dynamic.install.nodeBundled"),
      targetPage: "settings",
    }),
  );
  elements.installHelp.textContent = readiness.install.note;
}

function renderExecutorStatuses(): void {
  if (state.executorStatuses.length === 0) {
    elements.executorStatusList.replaceChildren(createListItem(t("dynamic.executor.noDoctor")));
    return;
  }

  elements.executorStatusList.replaceChildren(
    ...state.executorStatuses.map((status) => createActionListItem({
      id: status.choice,
      idName: "runId",
      title: localizeExecutorChoice(status.choice),
      meta: localizeKnownText(status.message),
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
    elements.workspaceHelp.textContent = errorToMessage(error, t("dynamic.workspace.loadFailed"));
    state.activeWorkspaceId = undefined;
    renderWorkspaces();
  }
}

async function createWorkspaceFromForm(): Promise<void> {
  const name = elements.workspaceName.value.trim();
  if (!name) {
    elements.workspaceHelp.textContent = t("dynamic.workspace.nameRequired");
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
    elements.workspaceHelp.textContent = t("dynamic.workspace.created", { name: payload.workspace.name });
    await refreshWorkspaceScopedData();
  } catch (error) {
    elements.workspaceHelp.textContent = errorToMessage(error, t("dynamic.workspace.createFailed"));
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
    elements.workspaceHelp.textContent = errorToMessage(error, t("dynamic.workspace.selectFailed"));
  }
}

async function updateSelectedWorkspace(): Promise<void> {
  if (!state.activeWorkspaceId) {
    elements.workspaceHelp.textContent = t("dynamic.workspace.selectBeforeUpdate");
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
    elements.workspaceHelp.textContent = t("dynamic.workspace.updated", { name: payload.workspace.name });
    await refreshWorkspaceScopedData();
  } catch (error) {
    elements.workspaceHelp.textContent = errorToMessage(error, t("dynamic.workspace.updateFailed"));
  } finally {
    elements.workspaceUpdateButton.disabled = false;
  }
}

async function deleteSelectedWorkspace(): Promise<void> {
  if (!state.activeWorkspaceId) {
    elements.workspaceHelp.textContent = t("dynamic.workspace.selectBeforeDelete");
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
    elements.workspaceHelp.textContent = t("dynamic.workspace.deleted");
    await refreshWorkspaceScopedData();
  } catch (error) {
    elements.workspaceHelp.textContent = errorToMessage(error, t("dynamic.workspace.deleteFailed"));
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
    createOption("", state.workspaces.length > 0 ? t("dynamic.workspace.selectOption") : t("dynamic.workspace.noneSaved")),
    ...state.workspaces.map((workspace) => createOption(workspace.id, workspace.name)),
  ];

  elements.workspaceSelect.replaceChildren(...options);
  elements.workspaceSelect.value = activeWorkspace?.id ?? "";

  if (activeWorkspace) {
    fillWorkspaceForm(activeWorkspace);
    elements.activeWorkspaceLabel.textContent = activeWorkspace.name;
    elements.activeWorkspaceLabel.dataset.phase = "completed";
    elements.workspaceHelp.textContent = t("dynamic.workspace.active", {
      name: activeWorkspace.name,
      path: activeWorkspace.path ? ` / ${activeWorkspace.path}` : "",
      trustLabel: localizeWorkspaceTrustLevel(activeWorkspace.trustLevel),
    });
    return;
  }

  elements.activeWorkspaceLabel.textContent = t("dynamic.workspace.noneActive");
  elements.activeWorkspaceLabel.dataset.phase = "idle";
  if (state.workspaces.length === 0) {
    elements.workspaceHelp.textContent = t("dynamic.workspace.createToScope");
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
      createOption("", payload.providers.length > 0 ? t("dynamic.provider.selectOption") : t("dynamic.provider.noneSaved")),
      ...payload.providers.map((provider) => createOption(provider.id ?? "", `${provider.name} / ${provider.modelId}`)),
    );
    elements.providerSelect.value = activeProvider?.id ?? "";

    if (activeProvider) {
      fillProviderForm(activeProvider);
      elements.providerStatus.textContent = translatedToken("configured");
      elements.providerStatus.dataset.phase = "completed";
      elements.providerHelp.textContent = t("dynamic.provider.loaded", { preview: activeProvider.apiKeyPreview });
      elements.providerHelp.dataset.dynamic = "true";
      setModelOptions([activeProvider.modelId], activeProvider.modelId);
    } else {
      elements.providerStatus.textContent = translatedToken("not-configured");
      elements.providerStatus.dataset.phase = "idle";
      elements.providerHelp.textContent = t("dynamic.provider.saveBeforeChat");
      elements.providerHelp.dataset.dynamic = "true";
      setModelOptions([], "");
    }
  } catch (error) {
    renderProviderError(errorToMessage(error, t("dynamic.provider.loadFailed")));
  }
}

async function selectProviderFromList(): Promise<void> {
  const providerId = elements.providerSelect.value;
  const provider = state.providers.find((item) => item.id === providerId);
  if (!provider?.id) return;

  state.activeProviderId = provider.id;
  fillProviderForm(provider);
  await saveModelSelection(provider.id, provider.modelId);
  elements.providerStatus.textContent = translatedToken("configured");
  elements.providerStatus.dataset.phase = "completed";
  elements.providerHelp.textContent = t("dynamic.provider.active", { name: provider.name });
  elements.providerHelp.dataset.dynamic = "true";
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
  elements.providerStatus.textContent = translatedToken("saving");
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
    elements.providerStatus.textContent = translatedToken("configured");
    elements.providerStatus.dataset.phase = "completed";
    elements.providerHelp.textContent = t("dynamic.provider.saved", {
      preview: payload.provider?.apiKeyPreview ?? t("dynamic.provider.previewSaved"),
    });
    elements.providerHelp.dataset.dynamic = "true";
    await loadProviders();
    await loadAppReadiness();
  } catch (error) {
    renderProviderError(errorToMessage(error, t("dynamic.provider.saveFailed")));
  } finally {
    elements.providerSaveButton.disabled = false;
  }
}

async function deleteSelectedProvider(): Promise<void> {
  if (!state.activeProviderId) {
    renderProviderError(t("dynamic.provider.selectBeforeDelete"));
    return;
  }

  elements.providerDeleteButton.disabled = true;
  try {
    await apiJson(`/api/providers/${encodeURIComponent(state.activeProviderId)}`, {
      method: "DELETE",
    });
    state.activeProviderId = undefined;
    elements.providerApiKey.value = "";
    elements.providerName.value = t("dynamic.provider.defaultName");
    elements.providerBaseUrl.value = "";
    elements.providerModel.value = "";
    await loadProviders();
    await loadAppReadiness();
  } catch (error) {
    renderProviderError(errorToMessage(error, t("dynamic.provider.deleteFailed")));
  } finally {
    elements.providerDeleteButton.disabled = false;
  }
}

async function testProviderFromForm(): Promise<void> {
  elements.providerTestButton.disabled = true;
  elements.providerStatus.textContent = translatedToken("testing");
  elements.providerStatus.dataset.phase = "running";

  try {
    const payload = await apiJson<{ available: boolean; message: string; models: string[] }>("/api/providers/doctor", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(providerDraftFromForm()),
    });

    elements.providerStatus.textContent = payload.available ? translatedToken("healthy") : translatedToken("failed");
    elements.providerStatus.dataset.phase = payload.available ? "completed" : "failed";
    elements.providerHelp.textContent = `${payload.message}${payload.models.length ? ` ${t("dynamic.provider.modelsLabel")} ${payload.models.slice(0, 5).join(", ")}` : ""}`;
    elements.providerHelp.dataset.dynamic = "true";
    setModelOptions(payload.models, elements.providerModel.value);
  } catch (error) {
    renderProviderError(errorToMessage(error, t("dynamic.provider.doctorFailed")));
  } finally {
    elements.providerTestButton.disabled = false;
  }
}

async function loadModelsForSelectedProvider(): Promise<void> {
  if (!state.activeProviderId) {
    renderProviderError(t("dynamic.provider.saveBeforeModels"));
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

    elements.providerHelp.textContent = `${t("dynamic.provider.loadedModels")} ${payload.models.slice(0, 8).join(", ")}`;
    elements.providerHelp.dataset.dynamic = "true";
    setModelOptions(payload.models, elements.providerModel.value);
  } catch (error) {
    renderProviderError(errorToMessage(error, t("dynamic.provider.modelsFailed")));
  } finally {
    elements.providerModelsButton.disabled = false;
  }
}

async function saveModelSelectionFromForm(): Promise<void> {
  if (!state.activeProviderId || !elements.providerModel.value) return;
  try {
    await saveModelSelection(state.activeProviderId, elements.providerModel.value);
  } catch (error) {
    renderProviderError(errorToMessage(error, t("dynamic.provider.modelSelectionFailed")));
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
    createOption("", t("dynamic.provider.modelSelectPlaceholder")),
    ...uniqueModels.map((model) => createOption(model, model)),
  );

  if (uniqueModels.length === 0) {
    return;
  }

  elements.providerModelSelect.value = uniqueModels.includes(selectedModel) ? selectedModel : "";
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
      createOption("", payload.threads.length > 0 ? t("dynamic.thread.selectOption") : t("dynamic.thread.noneSaved")),
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
        ? t("dynamic.thread.noneInWorkspace")
        : t("dynamic.thread.createWorkspaceFirst"),
    }];
    elements.threadHelp.textContent = state.activeWorkspaceId
      ? t("dynamic.thread.noneActiveWorkspace")
      : t("dynamic.thread.createWorkspaceBeforeChat");
    renderChatMessages();
  } catch (error) {
    elements.threadHelp.textContent = errorToMessage(error, t("dynamic.thread.loadFailed"));
  }
}

async function createThread(): Promise<void> {
  const payload = await apiJson<{ thread: { id: string } }>("/api/threads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: t("threads.button.new"),
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
    elements.threadHelp.textContent = t("dynamic.thread.selectBeforeRename");
    return;
  }

  const selected = elements.threadSelect.selectedOptions[0]?.textContent?.replace(/\s+\(\d+\)$/, "") ?? t("dynamic.thread.defaultName");
  const title = globalThis.prompt(t("dynamic.thread.promptName"), selected)?.trim();
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
    elements.threadHelp.textContent = t("dynamic.thread.selectBeforeDelete");
    return;
  }

  await apiJson(`/api/threads/${encodeURIComponent(state.activeThreadId)}`, {
    method: "DELETE",
  });
  state.activeThreadId = undefined;
  state.chatMessages = [{ role: "system", content: t("dynamic.thread.deleted") }];
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
    : [{ role: "system", content: t("dynamic.thread.empty") }];
  elements.threadHelp.textContent = t("dynamic.thread.active", { title: payload.thread.title });
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
      throw new Error(payload.error ?? t("dynamic.chat.failed"));
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
        content: errorToMessage(error, t("dynamic.chat.failed")),
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
    elements.runSummary.textContent = t("dynamic.run.enterGoal");
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
    elements.runSummary.textContent = errorToMessage(error, t("dynamic.run.startFailed"));
    elements.statusPill.textContent = translatedToken("failed");
    elements.statusPill.dataset.phase = "failed";
  } finally {
    elements.runButton.disabled = false;
  }
}

async function cancelActiveRun(): Promise<void> {
  if (!state.activeRunId) {
    elements.runSummary.textContent = t("dynamic.run.noActive");
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
    elements.runSummary.textContent = errorToMessage(error, t("dynamic.run.cancelFailed"));
  }
}

async function resolveActiveApproval(decision: "grant" | "reject"): Promise<void> {
  if (!state.activeRunId || !state.liveRun?.pendingApproval) {
    elements.approvalReason.textContent = t("dynamic.approval.nonePending");
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
    elements.approvalReason.textContent = errorToMessage(error, t("dynamic.approval.resolveFailed"));
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
    elements.artifactHelp.textContent = errorToMessage(error, t("dynamic.artifact.loadFailed"));
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
    elements.artifactHelp.textContent = errorToMessage(error, t("dynamic.artifact.openFailed"));
  }
}

async function saveArtifactFromForm(): Promise<void> {
  const title = elements.artifactTitleInput.value.trim();
  if (!title) {
    elements.artifactHelp.textContent = t("dynamic.artifact.titleRequired");
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
    elements.artifactHelp.textContent = t("dynamic.artifact.saved", { title: payload.artifact.title });
    await loadArtifacts();
    await loadAppReadiness();
  } catch (error) {
    elements.artifactHelp.textContent = errorToMessage(error, t("dynamic.artifact.saveFailed"));
  } finally {
    elements.artifactSaveButton.disabled = false;
  }
}

async function deleteSelectedArtifact(): Promise<void> {
  if (!state.activeArtifactId) {
    elements.artifactHelp.textContent = t("dynamic.artifact.selectBeforeDelete");
    return;
  }

  elements.artifactDeleteButton.disabled = true;
  try {
    await apiJson(`/api/artifacts/${encodeURIComponent(state.activeArtifactId)}`, {
      method: "DELETE",
    });
    state.activeArtifactId = undefined;
    state.activeArtifact = undefined;
    elements.artifactHelp.textContent = t("dynamic.artifact.deleted");
    await loadArtifacts();
    await loadAppReadiness();
  } catch (error) {
    elements.artifactHelp.textContent = errorToMessage(error, t("dynamic.artifact.deleteFailed"));
  } finally {
    elements.artifactDeleteButton.disabled = false;
  }
}

function renderArtifactLibrary(): void {
  elements.artifactSelect.replaceChildren(
    createOption("", state.artifacts.length > 0 ? t("dynamic.artifact.selectOption") : t("dynamic.artifact.noneSaved")),
    ...state.artifacts.map((artifact) => createOption(artifact.id, `${artifact.title} / ${localizeArtifactSource(artifact.source)}`)),
  );
  elements.artifactSelect.value = state.activeArtifactId ?? "";

  if (state.artifacts.length === 0) {
    elements.artifactList.replaceChildren(createListItem(t("dynamic.artifact.noneInWorkspace")));
    elements.artifactPreview.textContent = t("artifact.preview.default");
    elements.artifactHelp.textContent = t("dynamic.artifact.saveNoteOrRun");
    return;
  }

  elements.artifactList.replaceChildren(
    ...state.artifacts.map((artifact) => createActionListItem({
      id: artifact.id,
      idName: "artifactId",
      title: artifact.title,
      meta: `${localizeArtifactKind(artifact.kind)} / ${formatDate(artifact.updatedAt)}`,
      pressed: artifact.id === state.activeArtifactId,
      source: artifact.source,
    })),
  );

  const activeArtifact = state.activeArtifact;
  if (!activeArtifact) {
    elements.artifactPreview.textContent = t("dynamic.artifact.selectToPreview");
    return;
  }

  elements.artifactHelp.textContent =
    t("dynamic.artifact.opened", { source: localizeArtifactSource(activeArtifact.source) }) + (activeArtifact.runId ? ` / ${truncate(activeArtifact.runId, 24)}` : "");
  elements.artifactPreview.textContent = activeArtifact.content || t("dynamic.artifact.noPreview");
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
    elements.runHistoryHelp.textContent = errorToMessage(error, t("dynamic.runHistory.loadFailed"));
    renderRunHistory();
  }
}

function renderForgeRunOptions(): void {
  const completedRuns = state.runs.filter((run) => run.status === "completed");
  elements.forgeRunSelect.replaceChildren(
    createOption("", completedRuns.length > 0 ? t("dynamic.forge.selectCompleted") : t("dynamic.forge.noneCompleted")),
    ...completedRuns.map((run) => createOption(run.id, `${run.goal} / ${formatDate(run.startedAt)}`)),
  );
}

async function loadApprovals(): Promise<void> {
  try {
    const payload = await apiJson<{ approvals: ApprovalRecord[] }>("/api/approvals");
    state.approvals = payload.approvals;
    renderApprovalHistory();
  } catch (error) {
    elements.approvalHistoryHelp.textContent = errorToMessage(error, t("dynamic.approvalHistory.loadFailed"));
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
    elements.memoryHelp.textContent = errorToMessage(error, t("dynamic.memory.loadFailed"));
    renderMemories();
  }
}

async function createMemoryFromForm(): Promise<void> {
  const title = elements.memoryTitleInput.value.trim();
  const content = elements.memoryContent.value.trim();
  if (!title || !content) {
    elements.memoryHelp.textContent = t("dynamic.memory.required");
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
    elements.memoryHelp.textContent = t("dynamic.memory.saved");
    await loadMemories();
    await loadAppReadiness();
  } catch (error) {
    elements.memoryHelp.textContent = errorToMessage(error, t("dynamic.memory.saveFailed"));
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
    elements.memoryHelp.textContent = errorToMessage(error, t("dynamic.memory.deleteFailed"));
  }
}

function renderMemories(): void {
  if (state.memories.length === 0) {
    elements.memoryList.replaceChildren(createListItem(t("dynamic.memory.noneSaved")));
    return;
  }

  elements.memoryList.replaceChildren(
    ...state.memories.map((memory) => {
      const item = document.createElement("li");
      const content = document.createElement("div");
      const button = document.createElement("button");

      content.className = "list-button";
      content.textContent =
        `${memory.title} / ${translateKeyOrFallback(`memory.scope.${memory.scope}`, memory.scope)} / ${translatedToken(memory.sensitivity)}${memory.lastUsedAt ? ` / ${t("dynamic.memory.usedAt", { date: formatDate(memory.lastUsedAt) })}` : ""}`;
      button.type = "button";
      button.className = "secondary-button";
      button.dataset.memoryId = memory.id;
      button.textContent = t("workspace.button.delete");
      item.append(content, button);
      return item;
    }),
  );
}

function renderMemoryUsage(): void {
  if (state.memoryUsage.length === 0) {
    elements.memoryUsageList.replaceChildren(createListItem(t("dynamic.memoryUsage.none")));
    elements.memoryUsageHelp.textContent = t("memory-usage.help.default");
    return;
  }

  elements.memoryUsageList.replaceChildren(
    ...state.memoryUsage.map((memory) => createActionListItem({
      id: memory.memoryId,
      idName: "memoryId",
      title: `${memory.title} / ${translateKeyOrFallback(`memory.scope.${memory.scope}`, memory.scope)}`,
      meta: `${translatedToken(memory.sensitivity)} / ${t("dynamic.memoryUsage.score", { score: memory.score.toFixed(1) })} / ${memory.content}`,
      pressed: false,
      source: memory.sensitivity,
    })),
  );
  elements.memoryUsageHelp.textContent = t("dynamic.memoryUsage.injectedCount", { count: state.memoryUsage.length });
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
    elements.capabilityHelp.textContent = errorToMessage(error, t("dynamic.capability.loadFailed"));
    renderCapabilities();
  }
}

async function loadCapabilityRuns(): Promise<void> {
  try {
    const payload = await apiJson<{ runs: CapabilityRunRecord[] }>("/api/capability-runs");
    state.capabilityRuns = payload.runs;
    renderCapabilityRuns();
  } catch (error) {
    elements.capabilityRunHelp.textContent = errorToMessage(error, t("dynamic.capabilityHistory.loadFailed"));
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
    elements.capabilityList.replaceChildren(createListItem(t("dynamic.capability.noneInstalled")));
    elements.capabilityStatus.textContent = t("dynamic.capability.notSelected");
    elements.capabilityDescription.textContent = t("capability-detail.help.default");
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
      meta: `${localizeCapabilityKind(capability.kind)} / ${translatedToken(capability.enabled ? "enabled" : "disabled")} / ${t("dynamic.capability.permissionCount", { count: capability.permissions.length })}`,
      pressed: capability.id === activeCapability?.id,
      source: capability.enabled ? "completed" : "paused",
    })),
  );

  if (!activeCapability) return;
  elements.capabilityStatus.textContent = activeCapability.enabled ? translatedToken("enabled") : translatedToken("disabled");
  elements.capabilityDescription.textContent = localizeKnownText(activeCapability.description);
  elements.capabilityPermissionList.replaceChildren(
    ...activeCapability.permissions.map((permission) => createActionListItem({
      id: `${activeCapability.id}-${permission.category}`,
      idName: "capabilityId",
      title: localizeCapabilityPermissionCategory(permission.category),
      meta: localizeKnownText(permission.description),
      pressed: false,
      source: "low",
    })),
  );
  elements.capabilityToggleButton.textContent = activeCapability.enabled ? t("capability-detail.button.disable") : t("capability-detail.button.enable");
  elements.capabilityRunButton.disabled = !activeCapability.enabled;
}

function renderCapabilityRuns(): void {
  if (state.capabilityRuns.length === 0) {
    elements.capabilityRunList.replaceChildren(createListItem(t("dynamic.capabilityHistory.none")));
    elements.capabilityRunHelp.textContent = t("dynamic.capabilityHistory.runToCreate");
    return;
  }

  elements.capabilityRunList.replaceChildren(
    ...state.capabilityRuns.map((run) => createActionListItem({
      id: run.id,
      idName: "runId",
      title: run.capabilityId,
      meta: `${translatedToken(run.status)} / ${formatDate(run.startedAt)}${run.result ? ` / ${localizeKnownText(run.result)}` : ""}`,
      pressed: false,
      source: run.status,
    })),
  );
  elements.capabilityRunHelp.textContent = t("dynamic.capabilityHistory.count", { count: state.capabilityRuns.length });
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
    elements.forgeHelp.textContent = errorToMessage(error, t("dynamic.recipe.loadFailed"));
    renderRecipes();
  }
}

async function loadRecipeTests(): Promise<void> {
  try {
    const payload = await apiJson<{ tests: RecipeTestSummary[] }>("/api/recipe-tests");
    state.recipeTests = payload.tests;
    renderRecipeTests();
  } catch (error) {
    elements.recipeTestHelp.textContent = errorToMessage(error, t("dynamic.recipeTests.loadFailed"));
    renderRecipeTests();
  }
}

async function createRecipeFromSelectedRun(): Promise<void> {
  const runId = elements.forgeRunSelect.value;
  if (!runId) {
    elements.forgeHelp.textContent = t("dynamic.forge.selectRunFirst");
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
  elements.recipeTestPreview.textContent = payload.test.result ?? t("dynamic.recipeTests.completed");
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
    elements.recipeList.replaceChildren(createListItem(t("dynamic.recipe.none")));
    elements.recipeStatus.textContent = t("dynamic.recipe.notSelected");
    elements.recipeTitleInput.value = "";
    elements.recipePromptInput.value = "";
    elements.recipeInputSpec.value = "";
    elements.recipeOutputSpec.value = "";
    elements.recipeSaveButton.disabled = true;
    elements.recipeTestButton.disabled = true;
    elements.recipeExportButton.disabled = true;
    elements.recipeExportButton.textContent = t("recipe-editor.button.export");
    return;
  }

  const activeRecipe = getActiveRecipe() ?? state.recipes[0];
  state.activeRecipeId = activeRecipe?.id;
  elements.recipeList.replaceChildren(
    ...state.recipes.map((recipe) => createActionListItem({
      id: recipe.id,
      idName: "recipeId",
      title: recipe.title,
      meta: `${recipe.capabilityId ? translatedToken("exported") : translatedToken("draft")} / ${recipe.lastTestedAt ? `${t("dynamic.recipe.tested")} ${formatDate(recipe.lastTestedAt)}` : t("dynamic.recipe.notTested")}`,
      pressed: recipe.id === activeRecipe?.id,
      source: recipe.capabilityId ? "completed" : "running",
    })),
  );

  if (!activeRecipe) return;
  elements.recipeStatus.textContent = activeRecipe.capabilityId ? translatedToken("exported") : translatedToken("draft");
  elements.recipeTitleInput.value = activeRecipe.title;
  elements.recipePromptInput.value = activeRecipe.prompt;
  elements.recipeInputSpec.value = activeRecipe.inputSpec;
  elements.recipeOutputSpec.value = activeRecipe.outputSpec;
  elements.recipeSaveButton.disabled = false;
  elements.recipeTestButton.disabled = false;
  elements.recipeExportButton.disabled = false;
  elements.recipeExportButton.textContent = activeRecipe.capabilityId ? t("recipe-editor.button.exportUpdate") : t("recipe-editor.button.export");
}

function renderRecipeTests(): void {
  if (state.recipeTests.length === 0) {
    elements.recipeTestList.replaceChildren(createListItem(t("dynamic.recipeTests.none")));
    elements.recipeTestHelp.textContent = t("dynamic.recipeTests.testToValidate");
    return;
  }

  elements.recipeTestList.replaceChildren(
    ...state.recipeTests.map((test) => createActionListItem({
      id: test.id,
      idName: "recipeTestId",
      title: translatedToken(test.status),
      meta: `${test.result ? localizeKnownText(test.result) : t("dynamic.recipeTests.noResult")} / ${formatDate(test.startedAt)}`,
      pressed: false,
      source: test.status,
    })),
  );
  elements.recipeTestHelp.textContent = t("dynamic.recipeTests.count", { count: state.recipeTests.length });
}

function getActiveRecipe(): RecipeSummary | undefined {
  return state.recipes.find((recipe) => recipe.id === state.activeRecipeId);
}

function renderApprovalHistory(): void {
  if (state.approvals.length === 0) {
    elements.approvalHistoryList.replaceChildren(createListItem(t("dynamic.approvalHistory.none")));
    elements.approvalHistoryHelp.textContent = t("dynamic.approvalHistory.help");
    return;
  }

  elements.approvalHistoryList.replaceChildren(
    ...state.approvals.map((approval) => createActionListItem({
      id: approval.approvalId,
      idName: "approvalId",
      title: `${localizeApprovalCategory(approval.category)} / ${translatedToken(approval.riskLevel)}`,
      meta: `${translatedToken(approval.status)}${approval.decision ? `:${translatedToken(approval.decision)}` : ""} / ${approval.resolvedAt ? formatDate(approval.resolvedAt) : translatedToken("pending")} / ${approval.requestedAction}`,
      pressed: state.liveRun?.pendingApproval?.approvalId === approval.approvalId,
      source: approval.status,
    })),
  );

  elements.approvalHistoryHelp.textContent = t("dynamic.approvalHistory.count", { count: state.approvals.length });
}

async function loadAutomations(): Promise<void> {
  try {
    const payload = await apiJson<{ automations: AutomationSummary[] }>("/api/automations");
    state.automations = payload.automations;
    renderAutomations();
  } catch (error) {
    elements.automationHelp.textContent = errorToMessage(error, t("dynamic.automation.loadFailed"));
    renderAutomations();
  }
}

async function loadAutomationRuns(): Promise<void> {
  try {
    const payload = await apiJson<{ runs: AutomationRunSummary[] }>("/api/automation-runs");
    state.automationRuns = payload.runs;
    renderAutomationRuns();
  } catch (error) {
    elements.automationRunHelp.textContent = errorToMessage(error, t("dynamic.automationHistory.loadFailed"));
    renderAutomationRuns();
  }
}

async function createAutomationFromForm(): Promise<void> {
  const title = elements.automationTitleInput.value.trim();
  const prompt = elements.automationPrompt.value.trim();
  if (!title || !prompt) {
    elements.automationHelp.textContent = t("dynamic.automation.required");
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
    elements.automationHelp.textContent = t("dynamic.automation.created");
    await loadAutomations();
    await loadAppReadiness();
  } catch (error) {
    elements.automationHelp.textContent = errorToMessage(error, t("dynamic.automation.createFailed"));
  } finally {
    elements.automationSaveButton.disabled = false;
  }
}

async function runAutomationTick(): Promise<void> {
  elements.automationTickButton.disabled = true;
  try {
    const payload = await apiJson<{ runs: AutomationRunSummary[] }>("/api/automations/tick", { method: "POST" });
    elements.automationHelp.textContent = t("dynamic.automation.ranDue", { count: payload.runs.length });
    await loadAutomations();
    await loadAutomationRuns();
    await loadApprovals();
    await loadArtifacts();
    await loadAppReadiness();
  } catch (error) {
    elements.automationHelp.textContent = errorToMessage(error, t("dynamic.automation.tickFailed"));
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
    elements.automationHelp.textContent = errorToMessage(error, t("dynamic.automation.updateFailed"));
  }
}

function renderAutomations(): void {
  if (state.automations.length === 0) {
    elements.automationList.replaceChildren(createListItem(t("dynamic.automation.none")));
    return;
  }

  elements.automationList.replaceChildren(
    ...state.automations.map((automation) => {
      const item = document.createElement("li");
      const title = document.createElement("div");
      const pauseButton = document.createElement("button");
      const deleteButton = document.createElement("button");

      title.className = "list-button";
      title.textContent =
        `${automation.title} / ${localizeAutomationKind(automation.kind)} / ${translatedToken(automation.status)} / ${t("dynamic.automation.next")} ${automation.nextRunAt ? formatDate(automation.nextRunAt) : t("dynamic.none")}`;
      pauseButton.type = "button";
      pauseButton.className = "secondary-button";
      pauseButton.dataset.automationId = automation.id;
      pauseButton.dataset.automationAction = automation.status === "active" ? "pause" : "resume";
      pauseButton.textContent = automation.status === "active" ? t("dynamic.automation.pause") : t("dynamic.automation.resume");
      deleteButton.type = "button";
      deleteButton.className = "secondary-button";
      deleteButton.dataset.automationId = automation.id;
      deleteButton.dataset.automationAction = "delete";
      deleteButton.textContent = t("workspace.button.delete");
      item.append(title, pauseButton, deleteButton);
      return item;
    }),
  );
}

function renderAutomationRuns(): void {
  if (state.automationRuns.length === 0) {
    elements.automationRunList.replaceChildren(createListItem(t("dynamic.automationHistory.none")));
    elements.automationRunHelp.textContent = t("dynamic.automationHistory.runToCreate");
    return;
  }

  elements.automationRunList.replaceChildren(
    ...state.automationRuns.map((run) => createActionListItem({
      id: run.id,
      idName: "runId",
      title: translatedToken(run.status),
      meta: `${run.result ? localizeKnownText(run.result) : t("dynamic.automationHistory.noResult")} / ${formatDate(run.startedAt)}`,
      pressed: false,
      source: run.status,
    })),
  );
  elements.automationRunHelp.textContent = t("dynamic.automationHistory.count", { count: state.automationRuns.length });
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

    const payload = await apiJson<{
      events: RunEventSummary[];
      memoryUsage?: RetrievedMemory[];
      memoryTrace?: MemoryRetrievalTrace;
    }>(`/api/runs/${encodeURIComponent(runId)}/events`);
    state.activeRunId = runId;
    state.runEvents = payload.events;
    state.memoryUsage = payload.memoryUsage ?? deriveMemoryUsageFromEvents(payload.events);
    state.liveRun = createPersistedRunView(runId, payload.memoryUsage, payload.memoryTrace);
    renderRunHistory();
    renderCurrentRunView();
  } catch (error) {
    elements.runHistoryHelp.textContent = errorToMessage(error, t("dynamic.runHistory.eventsFailed"));
  }
}

function renderRunHistory(): void {
  if (state.runs.length === 0) {
    elements.runHistoryList.replaceChildren(createListItem(t("dynamic.runHistory.none")));
    elements.runEventHistory.replaceChildren();
    elements.runHistoryHelp.textContent = t("dynamic.runHistory.runMock");
    return;
  }

  elements.runHistoryList.replaceChildren(
    ...state.runs.map((run) => createActionListItem({
      id: run.id,
      idName: "runId",
      title: run.goal,
      meta: `${localizeExecutorChoice(run.executorChoice)} / ${translatedToken(run.status)} / ${formatDate(run.startedAt)}`,
      pressed: run.id === state.activeRunId,
      source: run.status,
    })),
  );

  const activeRun = state.runs.find((run) => run.id === state.activeRunId);
  elements.runHistoryHelp.textContent = activeRun
    ? t("dynamic.runHistory.opened", { id: truncate(activeRun.id, 24), count: state.runEvents.length })
    : t("dynamic.runHistory.selectRun");
  elements.runEventHistory.replaceChildren(
    ...state.runEvents.map((event) => createEventListItem(event.type, event.message)),
  );
}

function createPersistedRunView(
  runId: string,
  memoryUsage?: RetrievedMemory[],
  memoryTrace?: MemoryRetrievalTrace,
): LiveRunState | undefined {
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
    memoryUsage: memoryUsage ?? deriveMemoryUsageFromEvents(state.runEvents),
    ...(memoryTrace ? { memoryTrace } : {}),
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
  elements.statusPill.textContent = translatedToken(phase);
  elements.statusPill.dataset.phase = phase;
  elements.runSummary.textContent = localizeKnownText(
    liveRun.pendingApproval?.reason
      ?? latestEvent?.message
      ?? t("dynamic.run.statusSummary", { executor: liveRun.executorChoice, status: translatedToken(liveRun.status) }),
  );
  elements.missionMeta.textContent =
    t("dynamic.run.meta", {
      id: truncate(liveRun.runId, 28),
      executor: localizeExecutorChoice(liveRun.executorChoice),
      timeout: liveRun.timeoutMs ? ` / ${t("run.form.timeout")} ${liveRun.timeoutMs}ms` : "",
    });
  elements.transcript.replaceChildren(
    ...(liveRun.stream.length > 0
      ? liveRun.stream.map((line) => createListItem(localizeKnownText(line)))
      : [createListItem(t("dynamic.run.noStream"))]),
  );
  elements.eventLog.replaceChildren(
    ...liveRun.events.map((event) => createEventListItem(event.type, event.message)),
  );
  elements.runArtifactList.replaceChildren(
    ...(liveRun.artifacts.length > 0
      ? liveRun.artifacts.map((artifact) => createListItem(`${artifact.title} (${localizeArtifactKind(artifact.kind)})`))
      : [createListItem(t("dynamic.run.artifactsPending"))]),
  );
  elements.runArtifactPreview.textContent = liveRun.artifacts.length > 0
    ? liveRun.artifactContents[liveRun.artifacts[0]?.id ?? ""] ?? t("dynamic.artifact.noPreview")
    : t("run-output.preview.default");
  renderApprovalPanel(liveRun.pendingApproval);
  state.memoryUsage = liveRun.memoryUsage ?? [];
  renderMemoryUsage();
  elements.runCancelButton.disabled = isTerminalStatus(liveRun.status);
  elements.runButton.disabled = !isTerminalStatus(liveRun.status) && liveRun.status !== "failed";
}

function renderApprovalPanel(approval: LiveRunState["pendingApproval"]): void {
  elements.approvalPanel.dataset.active = approval ? "true" : "false";
  elements.approvalStatus.textContent = approval ? translatedToken("pending") : translatedToken("no-request");
  elements.approvalCategory.textContent = approval?.category ? localizeApprovalCategory(approval.category) : t("dynamic.none");
  elements.approvalRiskLevel.textContent = approval?.riskLevel ? translatedToken(approval.riskLevel) : t("dynamic.none");
  elements.approvalRiskLevel.dataset.riskLevel = approval?.riskLevel ?? "";
  elements.approvalRequestedAction.textContent = approval?.requestedAction ?? t("dynamic.none");
  elements.approvalDecision.textContent = approval?.decision ? translatedToken(approval.decision) : (approval ? translatedToken("pending") : t("dynamic.none"));
  elements.approvalResolvedAt.textContent = approval?.resolvedAt ? formatDate(approval.resolvedAt) : t("dynamic.approval.notResolved");
  elements.approvalReason.textContent = approval?.reason ?? t("approval.reason.default");
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
      const content = message.role === "system" ? localizeKnownText(message.content) : message.content;
      const item = createListItem(content);
      item.dataset.role = message.role;
      return item;
    }),
  );
}

function renderStatus(nextState: SpaceDemoState): void {
  const runSection = nextState.shell.sections[1];
  const statusLabel = localizeKnownText(nextState.error ?? runSection.summary);

  elements.statusPill.textContent = translatedToken(nextState.phase);
  elements.statusPill.dataset.phase = nextState.phase;
  elements.runSummary.textContent = statusLabel;
  elements.missionMeta.textContent = nextState.summary
    ? t("dynamic.run.missionMeta", {
      missionId: nextState.summary.missionId,
      runId: nextState.summary.runId,
      executor: localizeExecutorChoice(nextState.executorChoice),
    })
    : t("dynamic.run.waitingForGoal", { executor: localizeExecutorChoice(nextState.executorChoice) });
}

function renderTranscript(nextState: SpaceDemoState): void {
  const chatSection = nextState.shell.sections[0];
  elements.transcript.replaceChildren(
    ...chatSection.transcriptPreview.map((line) => createListItem(localizeKnownText(line))),
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
    elements.runArtifactPreview.textContent = t("run-output.preview.default");
    return;
  }

  elements.runArtifactList.replaceChildren(
    ...nextState.artifacts.map((artifact) => createListItem(`${artifact.title} (${localizeArtifactKind(artifact.kind)})`)),
  );
  elements.runArtifactPreview.textContent =
    nextState.artifactContents[nextState.artifacts[0]?.id ?? ""] ?? t("dynamic.artifact.noPreview");
}

function createEventListItem(typeText: string, messageText: string): HTMLLIElement {
  const item = document.createElement("li");
  const type = document.createElement("span");
  const message = document.createElement("span");

  type.className = "event-type";
  type.textContent = typeText;
  message.textContent = localizeKnownText(messageText);
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
  button.setAttribute("aria-label", `${t("artifact.button.open")} ${localizePageTarget(input.targetPage)} / ${input.title}`);
  title.className = "item-title";
  title.textContent = input.title;
  meta.className = "item-meta";
  meta.textContent = input.detail;
  badge.className = "source-badge";
  badge.dataset.source = input.status;
  badge.textContent = translatedToken(input.status);

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
  badge.textContent = translatedToken(input.source);

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
  elements.providerStatus.textContent = translatedToken("failed");
  elements.providerStatus.dataset.phase = "failed";
  elements.providerHelp.textContent = message;
  elements.providerHelp.dataset.dynamic = "true";
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  headers.set("x-ai-os-language", state.language);
  const response = await fetch(url, { ...init, headers });
  const payload = await response.json().catch(() => ({})) as { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? t("dynamic.http.failed", { status: response.status }));
  }

  return payload as T;
}

function optionalFormValue(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function errorToMessage(error: unknown, fallback: string): string {
  return localizeKnownText(error instanceof Error ? error.message : fallback);
}

function localizeKnownText(text: string): string {
  if (translatedValuesForKey("dynamic.chat.initialPrompt").includes(text)) return t("dynamic.chat.initialPrompt");
  if (text === "Personal AI OS") return t("hero.title");
  if (text === "Provider connection succeeded.") return t("dynamic.provider.connectionSucceeded");
  if (text.startsWith("Provider connection succeeded. Models:")) {
    return `${t("dynamic.provider.connectionSucceeded")} ${t("dynamic.provider.modelsLabel")} ${text.replace("Provider connection succeeded. Models:", "").trim()}`;
  }
  if (text === "Ready.") return t("dynamic.executor.ready");
  if (text === "Unavailable.") return t("dynamic.executor.unavailable");
  if (text === "Deterministic local demo executor.") {
    return t("dynamic.executor.mockDemo");
  }
  if (text.startsWith("Loaded models:")) {
    return `${t("dynamic.provider.loadedModels")} ${text.replace("Loaded models:", "").trim()}`;
  }
  if (text.startsWith("Codex command not found: ")) {
    return t("dynamic.executor.commandMissing.codex", {
      command: text.replace("Codex command not found: ", "").trim(),
    });
  }
  if (text.startsWith("Claude Code command not found: ")) {
    return t("dynamic.executor.commandMissing.claude-code", {
      command: text.replace("Claude Code command not found: ", "").trim(),
    });
  }
  if (text === "Deterministic workflow mock executor.") {
    return t("dynamic.executor.mockReady");
  }
  if (text.startsWith("Executor available: ")) {
    return t("dynamic.executor.available", {
      available: text.endsWith("true") ? translatedToken("ready") : translatedToken("failed"),
    });
  }
  if (text === "Selected workspace path does not exist or is not a directory.") {
    return t("dynamic.run.workspacePathMissing");
  }
  if (text === "Configure a model provider before chatting.") {
    return t("dynamic.provider.saveBeforeChat");
  }
  if (text === "Executor demo run failed.") {
    return t("dynamic.run.error.executorFailed");
  }
  if (text === "Codex run interrupted.") {
    return t("dynamic.run.interrupted.codex");
  }
  if (text === "Claude Code run interrupted.") {
    return t("dynamic.run.interrupted.claude-code");
  }
  if (text === "Mock executor prepared artifact previews.") {
    return t("dynamic.mock.preparedArtifacts");
  }
  if (text.startsWith("Mock executor attached to ")) {
    return `${t("dynamic.mock.attached")} ${text.replace("Mock executor attached to ", "")}`;
  }
  if (text === "Approval granted. Continuing mock workflow.") {
    return t("dynamic.mock.approvalGranted");
  }
  if (text === "Mock workflow completed.") {
    return t("dynamic.mock.completed");
  }
  if (text === "Executor requested approval during the run.") {
    return t("dynamic.approval.reason.executorRequested");
  }
  if (text === "Create a concise summary of the current workspace, threads, artifacts, and trust state.") {
    return t("dynamic.capability.description.workspaceSummary");
  }
  if (text === "Summarize saved memories for the current workspace and personal context.") {
    return t("dynamic.capability.description.memorySummary");
  }
  if (text === "Create a status brief of local automations and their recent runs.") {
    return t("dynamic.capability.description.automationBrief");
  }
  if (text === "Read the selected workspace metadata and path.") {
    return t("dynamic.capability.permissionDescription.workspaceReadSelected");
  }
  if (text === "Read the active workspace while replaying the recipe.") {
    return t("dynamic.capability.permissionDescription.workspaceReadReplay");
  }
  if (text === "Read artifact titles in the active workspace.") {
    return t("dynamic.capability.permissionDescription.artifactReadActive");
  }
  if (text === "Read artifacts created by the source workflow.") {
    return t("dynamic.capability.permissionDescription.artifactReadSource");
  }
  if (text === "Read saved personal and workspace memory objects.") {
    return t("dynamic.capability.permissionDescription.memoryReadSaved");
  }
  if (text === "Read local automation definitions and recent automation runs.") {
    return t("dynamic.capability.permissionDescription.automationReadLocal");
  }
  if (text.startsWith("Network or external-send action requested from ")) {
    return t("dynamic.approval.reason.network", {
      workspace: text.replace("Network or external-send action requested from ", "").replace(/\.$/, ""),
    });
  }
  if (text.startsWith("Shell or install command requested in ")) {
    return t("dynamic.approval.reason.shell-command", {
      workspace: text.replace("Shell or install command requested in ", "").replace(/\.$/, ""),
    });
  }
  if (text.startsWith("File mutation requested in ")) {
    return t("dynamic.approval.reason.file-write", {
      workspace: text.replace("File mutation requested in ", "").replace(/\.$/, ""),
    });
  }
  const executorMatch = /^(codex|claude-code) will run against (.+)\.$/.exec(text);
  if (executorMatch) {
    const [, executor = "", workspace = ""] = executorMatch;
    return t("dynamic.approval.reason.code-executor", {
      executor: localizeExecutorChoice(executor),
      workspace,
    });
  }
  return text;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(state.language);
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}
