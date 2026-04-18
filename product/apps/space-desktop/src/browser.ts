import {
  createInitialSpaceDemoState,
  createRunningSpaceDemoState,
  type SpaceDemoExecutorChoice,
  type SpaceDemoState,
} from "./demo-runtime.js";
import type { ChatUiMessage } from "./server-runtime.js";

const state = {
  current: createInitialSpaceDemoState(),
  chatMessages: [
    {
      role: "system",
      content: "Configure a provider, then send a real chat message.",
    },
  ] as ChatUiMessage[],
};

const elements = {
  providerForm: getElement("provider-form", HTMLFormElement),
  providerName: getElement("provider-name", HTMLInputElement),
  providerProtocol: getElement("provider-protocol", HTMLSelectElement),
  providerBaseUrl: getElement("provider-base-url", HTMLInputElement),
  providerApiKey: getElement("provider-api-key", HTMLInputElement),
  providerModel: getElement("provider-model", HTMLInputElement),
  providerSaveButton: getElement("provider-save-button", HTMLButtonElement),
  providerStatus: getElement("provider-status", HTMLElement),
  providerHelp: getElement("provider-help", HTMLElement),
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

elements.chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void sendChatFromForm();
});

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  void runDemoFromForm();
});

void loadProviderSettings();
renderChatMessages();
render(state.current);

async function loadProviderSettings(): Promise<void> {
  try {
    const response = await fetch("/api/provider");
    const payload = (await response.json()) as {
      configured: boolean;
      provider?: {
        name: string;
        protocol: string;
        baseUrl: string;
        apiKeyPreview: string;
        modelId: string;
      };
    };

    if (payload.configured && payload.provider) {
      elements.providerName.value = payload.provider.name;
      elements.providerProtocol.value = payload.provider.protocol;
      elements.providerBaseUrl.value = payload.provider.baseUrl;
      elements.providerModel.value = payload.provider.modelId;
      elements.providerStatus.textContent = "configured";
      elements.providerStatus.dataset.phase = "completed";
      elements.providerHelp.textContent = `Saved provider loaded. API key: ${payload.provider.apiKeyPreview}`;
    }
  } catch (error) {
    renderProviderError(error instanceof Error ? error.message : "Failed to load provider settings.");
  }
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
  } catch (error) {
    renderProviderError(error instanceof Error ? error.message : "Failed to save provider settings.");
  } finally {
    elements.providerSaveButton.disabled = false;
  }
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
    const response = await fetch("/api/chat/send", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message,
        history: state.chatMessages.slice(0, -1),
      }),
    });
    const payload = (await response.json()) as {
      error?: string;
      messages?: ChatUiMessage[];
    };

    if (!response.ok || !payload.messages) {
      throw new Error(payload.error ?? "Chat request failed.");
    }

    state.chatMessages = payload.messages;
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
