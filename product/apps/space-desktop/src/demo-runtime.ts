import { CompanionCore, type CompanionRunStatusSummary } from "@ai-os/companion-core";
import { ControlPlane } from "@ai-os/control-plane";
import type { CodeExecutor, ApprovalDecision, RunTask, StartRunResult } from "@ai-os/executor-protocol";
import type { KernelEvent } from "@ai-os/kernel-events";
import type {
  Artifact,
  ArtifactId,
  ExecutorId,
  IsoDateTime,
  MissionId,
  Run,
  RunId,
  SpaceId,
  ThreadId,
  WorkspaceId,
} from "@ai-os/kernel-objects";

import {
  createSpaceDesktopShellModel,
  type SpaceDesktopArtifactListItem,
  type SpaceDesktopShellModel,
} from "./index.js";

export type SpaceDemoExecutorChoice = "mock" | "codex" | "claude-code";
export type SpaceDemoPhase = "idle" | "running" | "completed" | "failed";

export interface SpaceDemoEventLogEntry {
  type: string;
  message: string;
}

export interface SpaceDemoState {
  phase: SpaceDemoPhase;
  executorChoice: SpaceDemoExecutorChoice;
  goal: string;
  shell: SpaceDesktopShellModel;
  stream: string[];
  artifacts: SpaceDesktopArtifactListItem[];
  artifactContents: Record<string, string>;
  events: SpaceDemoEventLogEntry[];
  summary?: CompanionRunStatusSummary;
  error?: string;
}

export interface CreateSpaceDemoStateInput {
  goal?: string;
  executorChoice?: SpaceDemoExecutorChoice;
}

export interface RunSpaceDemoGoalInput {
  goal: string;
  executorChoice?: SpaceDemoExecutorChoice;
  eventDelayMs?: number;
}

export interface SpaceDemoRunResult {
  state: SpaceDemoState;
  summary: CompanionRunStatusSummary;
}

const DEMO_SPACE_ID = "space-demo" as SpaceId;
const DEMO_THREAD_ID = "thread-demo" as ThreadId;
const DEMO_WORKSPACE_ID = "workspace-demo" as WorkspaceId;
const DEMO_EXECUTOR_ID = "executor-demo-mock" as ExecutorId;
const DEFAULT_EVENT_DELAY_MS = 140;

export function createInitialSpaceDemoState(
  input: CreateSpaceDemoStateInput = {},
): SpaceDemoState {
  const executorChoice = input.executorChoice ?? "mock";
  const goal = input.goal ?? "";

  return {
    phase: "idle",
    executorChoice,
    goal,
    shell: createSpaceDesktopShellModel({
      title: "AI Space Demo",
      threadId: DEMO_THREAD_ID,
      transcriptPreview: ["System: V0.1 local Space loop is ready."],
      runStatus: "queued",
      runStatusSummary: "Enter a goal to start the local demo run.",
    }),
    stream: [],
    artifacts: [],
    artifactContents: {},
    events: [
      {
        type: "space.ready",
        message: "Local demo surface is ready.",
      },
    ],
  };
}

export function createRunningSpaceDemoState(input: CreateSpaceDemoStateInput): SpaceDemoState {
  const executorChoice = input.executorChoice ?? "mock";
  const goal = normalizeGoal(input.goal ?? "");

  return {
    phase: "running",
    executorChoice,
    goal,
    shell: createSpaceDesktopShellModel({
      title: "AI Space Demo",
      threadId: DEMO_THREAD_ID,
      transcriptPreview: [`User: ${goal}`, "Assistant: starting the local run..."],
      runStatus: "running",
      runStatusSummary: "Companion is routing the goal through Control Plane.",
    }),
    stream: ["Companion received the goal."],
    artifacts: [],
    artifactContents: {},
    events: [
      {
        type: "mission.pending",
        message: "Mission creation requested.",
      },
    ],
  };
}

export async function runSpaceDemoGoal(input: RunSpaceDemoGoalInput): Promise<SpaceDemoRunResult> {
  const goal = normalizeGoal(input.goal);
  const executorChoice = input.executorChoice ?? "mock";

  if (goal.length === 0) {
    throw new Error("Goal is required.");
  }

  if (executorChoice !== "mock") {
    throw new Error("Only the deterministic mock executor is enabled in this demo build.");
  }

  const ids = createDemoIds();
  const clock = createDemoClock();
  const executor = new MockSpaceDemoExecutor({
    ids,
    clock,
    eventDelayMs: input.eventDelayMs ?? DEFAULT_EVENT_DELAY_MS,
  });
  const controlPlane = new ControlPlane(
    { missionId: ids.missionId },
    clock,
  );

  let completed = undefined as Awaited<ReturnType<ControlPlane["runMissionToCompletion"]>> | undefined;
  const companion = new CompanionCore({
    async runGoal(goalInput) {
      completed = await controlPlane.runMissionToCompletion({
        ...goalInput,
        executor,
      });

      return {
        mission: completed.mission,
        run: completed.run,
        snapshot: completed.snapshot,
      };
    },
  });

  const summary = await companion.receiveGoal({
    spaceId: DEMO_SPACE_ID,
    threadId: DEMO_THREAD_ID,
    workspaceId: DEMO_WORKSPACE_ID,
    goal,
  });

  if (!completed) {
    throw new Error("Demo run completed without Control Plane output.");
  }

  return {
    summary,
    state: createCompletedSpaceDemoState({
      goal,
      executorChoice,
      completed,
      summary,
    }),
  };
}

function createCompletedSpaceDemoState(input: {
  goal: string;
  executorChoice: SpaceDemoExecutorChoice;
  completed: Awaited<ReturnType<ControlPlane["runMissionToCompletion"]>>;
  summary: CompanionRunStatusSummary;
}): SpaceDemoState {
  const artifacts = input.completed.artifacts.map(toArtifactListItem);
  const artifactContents = Object.fromEntries(
    input.completed.artifacts.map((artifact) => [artifact.id, artifact.content ?? ""]),
  );
  const latestOutput = input.summary.latestOutput ?? "Run completed.";

  return {
    phase: input.completed.run.status === "completed" ? "completed" : "failed",
    executorChoice: input.executorChoice,
    goal: input.goal,
    shell: createSpaceDesktopShellModel({
      title: "AI Space Demo",
      threadId: DEMO_THREAD_ID,
      transcriptPreview: [`User: ${input.goal}`, `Assistant: ${latestOutput}`],
      runStatus: input.completed.run.status,
      runStatusSummary: latestOutput,
      artifacts,
    }),
    stream: input.completed.snapshot.stream,
    artifacts,
    artifactContents,
    events: input.completed.events.map(toEventLogEntry),
    summary: input.summary,
    ...(input.summary.error ? { error: input.summary.error } : {}),
  };
}

interface MockSpaceDemoExecutorOptions {
  ids: DemoIds;
  clock: DemoClock;
  eventDelayMs: number;
}

class MockSpaceDemoExecutor implements CodeExecutor {
  readonly id = DEMO_EXECUTOR_ID;
  readonly kind = "codex" as const;

  private readonly artifactsByRun = new Map<RunId, Artifact[]>();

  constructor(private readonly options: MockSpaceDemoExecutorOptions) {}

  async getRuntimeStatus() {
    return {
      executorId: this.id,
      type: "code" as const,
      available: true,
      message: "Deterministic local demo executor.",
    };
  }

  async startRun(task: RunTask): Promise<StartRunResult> {
    const now = this.options.clock.now();
    const run: Run = {
      id: this.options.ids.runId(),
      createdAt: now,
      updatedAt: now,
      missionId: task.missionId,
      workspaceId: task.workspaceId,
      executorId: this.id,
      status: "running",
      artifactIds: [],
    };
    const artifact = createDemoArtifact({
      artifactId: this.options.ids.artifactId(),
      runId: run.id,
      spaceId: task.spaceId,
      goal: task.prompt,
      now,
    });

    this.artifactsByRun.set(run.id, [artifact]);

    return {
      run,
      events: delayedEvents(
        [
          {
            id: this.options.ids.eventId(),
            type: "run.started",
            occurredAt: now,
            spaceId: task.spaceId,
            missionId: task.missionId,
            runId: run.id,
            executorId: this.id,
          },
          {
            id: this.options.ids.eventId(),
            type: "run.stream",
            occurredAt: this.options.clock.now(),
            spaceId: task.spaceId,
            runId: run.id,
            chunk: "Companion handed the goal to Control Plane.",
          },
          {
            id: this.options.ids.eventId(),
            type: "run.stream",
            occurredAt: this.options.clock.now(),
            spaceId: task.spaceId,
            runId: run.id,
            chunk: "Mock executor generated a local artifact.",
          },
          {
            id: this.options.ids.eventId(),
            type: "artifact.created",
            occurredAt: this.options.clock.now(),
            spaceId: task.spaceId,
            runId: run.id,
            artifactId: artifact.id,
          },
          {
            id: this.options.ids.eventId(),
            type: "run.completed",
            occurredAt: this.options.clock.now(),
            spaceId: task.spaceId,
            runId: run.id,
            message: "Demo run completed.",
          },
        ],
        this.options.eventDelayMs,
      ),
    };
  }

  async submitApproval(_runId: RunId, _decision: ApprovalDecision): Promise<void> {
    // Approval UI is intentionally out of scope for the first visible demo.
  }

  async interruptRun(_runId: RunId): Promise<void> {
    // Managed process interruption is out of scope for the deterministic demo.
  }

  async collectArtifacts(runId: RunId): Promise<Artifact[]> {
    return this.artifactsByRun.get(runId) ?? [];
  }
}

function createDemoArtifact(input: {
  artifactId: ArtifactId;
  runId: RunId;
  spaceId: SpaceId;
  goal: string;
  now: IsoDateTime;
}): Artifact {
  return {
    id: input.artifactId,
    createdAt: input.now,
    updatedAt: input.now,
    spaceId: input.spaceId,
    runId: input.runId,
    kind: "markdown",
    title: "Demo Mission Report",
    content: [
      "# Demo Mission Report",
      "",
      `Goal: ${input.goal}`,
      "",
      "Result:",
      "- Companion accepted the goal.",
      "- Control Plane created a Mission and Run.",
      "- Executor emitted normalized KernelEvents.",
      "- Artifact returned to the Space shell.",
    ].join("\n"),
  };
}

async function* delayedEvents(
  events: KernelEvent[],
  delayMs: number,
): AsyncIterable<KernelEvent> {
  for (const event of events) {
    if (delayMs > 0) {
      await delay(delayMs);
    }

    yield event;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

function toArtifactListItem(artifact: Artifact): SpaceDesktopArtifactListItem {
  return {
    id: artifact.id,
    kind: artifact.kind,
    title: artifact.title,
    ...(artifact.path ? { path: artifact.path } : {}),
  };
}

function toEventLogEntry(event: KernelEvent): SpaceDemoEventLogEntry {
  switch (event.type) {
    case "run.started":
      return { type: event.type, message: `Run ${event.runId} started.` };
    case "run.stream":
      return { type: event.type, message: event.chunk };
    case "artifact.created":
      return { type: event.type, message: `Artifact ${event.artifactId} created.` };
    case "run.completed":
      return { type: event.type, message: event.message ?? "Run completed." };
    case "run.failed":
    case "run.interrupted":
      return { type: event.type, message: event.message ?? event.type };
    case "approval.requested":
    case "approval.granted":
    case "approval.rejected":
      return { type: event.type, message: `Approval ${event.approvalId}.` };
    case "mission.created":
      return { type: event.type, message: `Mission ${event.missionId} created.` };
    case "executor.status_changed":
      return { type: event.type, message: event.message ?? `Executor available: ${event.available}` };
  }
}

function normalizeGoal(goal: string): string {
  return goal.trim();
}

interface DemoIds {
  missionId(): MissionId;
  runId(): RunId;
  artifactId(): ArtifactId;
  eventId(): string;
}

function createDemoIds(): DemoIds {
  let mission = 0;
  let run = 0;
  let artifact = 0;
  let event = 0;

  return {
    missionId: () => `mission-demo-${++mission}` as MissionId,
    runId: () => `run-demo-${++run}` as RunId,
    artifactId: () => `artifact-demo-${++artifact}` as ArtifactId,
    eventId: () => `event-demo-${++event}`,
  };
}

interface DemoClock {
  now(): IsoDateTime;
}

function createDemoClock(): DemoClock {
  return {
    now: () => new Date().toISOString() as IsoDateTime,
  };
}
