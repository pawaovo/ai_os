import {
  createInitialSpaceDemoState,
  createRunningSpaceDemoState,
  runSpaceDemoGoal,
  type SpaceDemoExecutorChoice,
  type SpaceDemoState,
} from "./demo-runtime.js";

const state = {
  current: createInitialSpaceDemoState(),
};

const elements = {
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

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  void runDemoFromForm();
});

render(state.current);

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
    const result = await runSpaceDemoGoal({ goal, executorChoice });
    state.current = result.state;
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

function render(nextState: SpaceDemoState): void {
  renderStatus(nextState);
  renderTranscript(nextState);
  renderEvents(nextState);
  renderArtifacts(nextState);
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
