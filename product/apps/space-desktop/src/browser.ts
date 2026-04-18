import {
  createInitialSpaceDemoState,
  createRunningSpaceDemoState,
  type SpaceDemoExecutorChoice,
  type SpaceDemoState,
} from "./demo-runtime.js";
import type { ChatUiMessage } from "./server-runtime.js";

const state = {
  current: createInitialSpaceDemoState(),
  activeThreadId: undefined as string | undefined,
  activeProviderId: undefined as string | undefined,
  chatMessages: [
    {
      role: "system",
      content: "Configure a provider, then send a real chat message.",
    },
  ] as ChatUiMessage[],
};

const elements = {
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
  runButton: getElement("run-button", HTMLButtonElement),
  statusPill: getElement("status-pill", HTMLElement),
  transcript: getElement("transcript", HTMLElement),
  eventLog: getElement("event-log", HTMLElement),
  artifactList: getElement("artifact-list", HTMLElement),
  artifactPreview: getElement("artifact-preview", HTMLElement),
  runSummary: getElement("run-summary", HTMLElement),
  missionMeta: getElement("mission-meta", HTMLElement),
};

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

void initializeAppState();
renderChatMessages();
render(state.current);

async function initializeAppState(): Promise<void> {
  await loadProviders();
  await loadThreads();
}

async function loadProviders(): Promise<void> {
  try {
    const response = await fetch("/api/providers");
    const payload = (await response.json()) as {
      activeProviderId?: string;
      providers: Array<{
        id?: string;
        name: string;
        protocol: string;
        baseUrl: string;
        apiKeyPreview: string;
        modelId: string;
      }>;
    };

    elements.providerSelect.replaceChildren(
      ...payload.providers.map((provider) => {
        const option = document.createElement("option");
        option.value = provider.id ?? "";
        option.textContent = `${provider.name} / ${provider.modelId}`;
        return option;
      }),
    );

    const activeProvider = payload.providers.find((provider) => provider.id === payload.activeProviderId)
      ?? payload.providers[0];
    state.activeProviderId = activeProvider?.id;

    if (activeProvider) {
      elements.providerSelect.value = activeProvider.id ?? "";
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
    renderProviderError(error instanceof Error ? error.message : "Failed to load provider settings.");
  }
}

async function selectProviderFromList(): Promise<void> {
  state.activeProviderId = elements.providerSelect.value || undefined;
  await loadProviders();
}

function fillProviderForm(provider: {
  name: string;
  protocol: string;
  baseUrl: string;
  modelId: string;
}): void {
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
    const response = await fetch("/api/provider", {
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
    const payload = (await response.json()) as {
      error?: string;
      provider?: { apiKeyPreview: string };
    };

    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to save provider settings.");
    }

    elements.providerApiKey.value = "";
    elements.providerStatus.textContent = "configured";
    elements.providerStatus.dataset.phase = "completed";
    elements.providerHelp.textContent = `Provider saved locally. API key: ${payload.provider?.apiKeyPreview ?? "saved"}`;
    await loadProviders();
  } catch (error) {
    renderProviderError(error instanceof Error ? error.message : "Failed to save provider settings.");
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
    await fetch(`/api/providers/${encodeURIComponent(state.activeProviderId)}`, {
      method: "DELETE",
    });
    state.activeProviderId = undefined;
    elements.providerApiKey.value = "";
    elements.providerName.value = "Local OpenAI-Compatible";
    elements.providerBaseUrl.value = "";
    elements.providerModel.value = "";
    await loadProviders();
  } catch (error) {
    renderProviderError(error instanceof Error ? error.message : "Failed to delete provider.");
  } finally {
    elements.providerDeleteButton.disabled = false;
  }
}

async function testProviderFromForm(): Promise<void> {
  elements.providerTestButton.disabled = true;
  elements.providerStatus.textContent = "testing";
  elements.providerStatus.dataset.phase = "running";

  try {
    const response = await fetch("/api/providers/doctor", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(providerDraftFromForm()),
    });
    const payload = (await response.json()) as { available: boolean; message: string; models: string[] };

    elements.providerStatus.textContent = payload.available ? "healthy" : "failed";
    elements.providerStatus.dataset.phase = payload.available ? "completed" : "failed";
    elements.providerHelp.textContent = `${payload.message}${payload.models.length ? ` Models: ${payload.models.slice(0, 5).join(", ")}` : ""}`;
    setModelOptions(payload.models, elements.providerModel.value);
  } catch (error) {
    renderProviderError(error instanceof Error ? error.message : "Provider Doctor failed.");
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
    const response = await fetch(`/api/providers/${encodeURIComponent(state.activeProviderId)}/models`);
    const payload = (await response.json()) as { available: boolean; message: string; models: string[] };

    if (!payload.available) {
      throw new Error(payload.message);
    }

    elements.providerHelp.textContent = `Loaded models: ${payload.models.slice(0, 8).join(", ")}`;
    setModelOptions(payload.models, elements.providerModel.value);
    if (payload.models.length > 0) {
      elements.providerModel.value = payload.models[0] ?? elements.providerModel.value;
      elements.providerModelSelect.value = elements.providerModel.value;
    }
  } catch (error) {
    renderProviderError(error instanceof Error ? error.message : "Failed to load models.");
  } finally {
    elements.providerModelsButton.disabled = false;
  }
}

function setModelOptions(models: string[], selectedModel: string): void {
  const uniqueModels = [...new Set(models.filter(Boolean))];

  elements.providerModelSelect.replaceChildren(
    ...uniqueModels.map((model) => {
      const option = document.createElement("option");
      option.value = model;
      option.textContent = model;
      return option;
    }),
  );

  if (uniqueModels.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Load models or type manually";
    elements.providerModelSelect.append(option);
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
  const response = await fetch("/api/threads");
  const payload = (await response.json()) as {
    activeThreadId?: string;
    threads: Array<{ id: string; title: string; messageCount: number }>;
  };

  elements.threadSelect.replaceChildren(
    ...payload.threads.map((thread) => {
      const option = document.createElement("option");
      option.value = thread.id;
      option.textContent = `${thread.title} (${thread.messageCount})`;
      return option;
    }),
  );

  const activeThread = payload.threads.find((thread) => thread.id === payload.activeThreadId) ?? payload.threads[0];
  state.activeThreadId = activeThread?.id;

  if (activeThread) {
    elements.threadSelect.value = activeThread.id;
    await loadThread(activeThread.id);
  } else {
    elements.threadHelp.textContent = "Create a thread to start persistent chat.";
  }
}

async function createThread(): Promise<void> {
  const response = await fetch("/api/threads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: "New Thread",
      providerId: state.activeProviderId,
      modelId: elements.providerModel.value,
    }),
  });
  const payload = (await response.json()) as { thread: { id: string } };
  state.activeThreadId = payload.thread.id;
  await loadThreads();
}

async function renameSelectedThread(): Promise<void> {
  if (!state.activeThreadId) {
    elements.threadHelp.textContent = "Create or select a thread before renaming.";
    return;
  }

  const selected = elements.threadSelect.selectedOptions[0]?.textContent?.replace(/\s+\(\d+\)$/, "") ?? "Thread";
  const title = globalThis.prompt("Thread name", selected)?.trim();
  if (!title) return;

  await fetch(`/api/threads/${encodeURIComponent(state.activeThreadId)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title }),
  });
  await loadThreads();
}

async function deleteSelectedThread(): Promise<void> {
  if (!state.activeThreadId) {
    elements.threadHelp.textContent = "Create or select a thread before deleting.";
    return;
  }

  await fetch(`/api/threads/${encodeURIComponent(state.activeThreadId)}`, {
    method: "DELETE",
  });
  state.activeThreadId = undefined;
  state.chatMessages = [{ role: "system", content: "Thread deleted. Create a new thread to continue." }];
  renderChatMessages();
  await loadThreads();
}

async function loadThread(threadId: string): Promise<void> {
  if (!threadId) return;

  const response = await fetch(`/api/threads/${encodeURIComponent(threadId)}/messages`);
  const payload = (await response.json()) as {
    thread: { id: string; title: string };
    messages: ChatUiMessage[];
  };

  state.activeThreadId = payload.thread.id;
  state.chatMessages = payload.messages.length > 0
    ? payload.messages
    : [{ role: "system", content: "This thread has no messages yet." }];
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
    const response = await fetch(
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
    const payload = (await response.json()) as {
      error?: string;
      messages?: ChatUiMessage[];
      threadId?: string;
    };

    if (!response.ok || !payload.messages) {
      throw new Error(payload.error ?? "Chat request failed.");
    }

    state.chatMessages = payload.messages;
    state.activeThreadId = payload.threadId ?? state.activeThreadId;
    await loadThreads();
  } catch (error) {
    state.chatMessages = [
      ...state.chatMessages,
      {
        role: "system",
        content: error instanceof Error ? error.message : "Chat request failed.",
      },
    ];
  } finally {
    elements.chatSendButton.disabled = false;
    renderChatMessages();
  }
}

async function runDemoFromForm(): Promise<void> {
  const goal = elements.input.value.trim();
  const executorChoice = toExecutorChoice(elements.executor.value);

  if (!goal) {
    render({
      ...state.current,
      phase: "failed",
      error: "Enter a goal before starting the demo run.",
    });
    return;
  }

  state.current = createRunningSpaceDemoState({ goal, executorChoice });
  render(state.current);

  elements.runButton.disabled = true;

  try {
    state.current = await runDemoOnServer({ goal, executorChoice });
  } catch (error) {
    state.current = {
      ...state.current,
      phase: "failed",
      error: error instanceof Error ? error.message : "Demo run failed.",
    };
  } finally {
    elements.runButton.disabled = false;
    render(state.current);
  }
}

async function runDemoOnServer(input: {
  goal: string;
  executorChoice: SpaceDemoExecutorChoice;
}): Promise<SpaceDemoState> {
  const response = await fetch("/api/demo/run", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload = (await response.json()) as { state?: SpaceDemoState; error?: string };

  if (!response.ok || !payload.state) {
    throw new Error(payload.error ?? "Local demo server failed.");
  }

  return payload.state;
}

function render(nextState: SpaceDemoState): void {
  renderStatus(nextState);
  renderTranscript(nextState);
  renderEvents(nextState);
  renderArtifacts(nextState);
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
    ...nextState.events.map((event) => {
      const item = document.createElement("li");
      const type = document.createElement("span");
      const message = document.createElement("span");

      type.className = "event-type";
      type.textContent = event.type;
      message.textContent = event.message;
      item.append(type, message);
      return item;
    }),
  );
}

function renderArtifacts(nextState: SpaceDemoState): void {
  if (nextState.artifacts.length === 0) {
    elements.artifactList.replaceChildren(createListItem(nextState.shell.sections[2].emptyState));
    elements.artifactPreview.textContent = "Artifacts will render here after a run completes.";
    return;
  }

  elements.artifactList.replaceChildren(
    ...nextState.artifacts.map((artifact) => createListItem(`${artifact.title} (${artifact.kind})`)),
  );
  elements.artifactPreview.textContent =
    nextState.artifactContents[nextState.artifacts[0]?.id ?? ""] ?? "Artifact has no preview content.";
}

function createListItem(text: string): HTMLLIElement {
  const item = document.createElement("li");
  item.textContent = text;
  return item;
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

function renderProviderError(message: string): void {
  elements.providerStatus.textContent = "failed";
  elements.providerStatus.dataset.phase = "failed";
  elements.providerHelp.textContent = message;
}
