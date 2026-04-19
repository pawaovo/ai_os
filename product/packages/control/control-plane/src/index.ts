import type { ApprovalDecision, CodeExecutor, RunTask } from "@ai-os/executor-protocol";
import type { KernelEvent } from "@ai-os/kernel-events";
import type {
  ApprovalId,
  Artifact,
  ArtifactId,
  IsoDateTime,
  Mission,
  MissionId,
  Run,
  RunId,
  SpaceId,
  ThreadId,
  WorkspaceId,
} from "@ai-os/kernel-objects";

export interface ControlPlaneIds {
  missionId(): MissionId;
}

export interface ControlPlaneClock {
  now(): IsoDateTime;
}

export interface StartMissionRunInput {
  spaceId: SpaceId;
  threadId: ThreadId;
  workspaceId: WorkspaceId;
  goal: string;
  executor: CodeExecutor;
  prompt?: string;
  context?: Record<string, unknown>;
}

export interface MissionRun {
  mission: Mission;
  run: Run;
  events: AsyncIterable<KernelEvent>;
}

export interface CompletedMissionRun {
  mission: Mission;
  run: Run;
  events: KernelEvent[];
  snapshot: ControlPlaneRunSnapshot;
  artifacts: Artifact[];
}

export type ControlPlaneRunStatus = "running" | "awaiting-approval" | "completed" | "failed" | "interrupted";
export type ControlPlaneApprovalStatus = "pending" | "granted" | "rejected";

export interface ControlPlaneApprovalState {
  approvalId: ApprovalId;
  status: ControlPlaneApprovalStatus;
}

export interface ControlPlaneRunSnapshot {
  runId: RunId;
  status: ControlPlaneRunStatus;
  stream: string[];
  artifactIds: ArtifactId[];
  approvals: ControlPlaneApprovalState[];
  error?: string;
}

export class ControlPlane {
  constructor(
    private readonly ids: ControlPlaneIds,
    private readonly clock: ControlPlaneClock,
  ) {}

  async startMissionRun(input: StartMissionRunInput): Promise<MissionRun> {
    const now = this.clock.now();
    const mission: Mission = {
      id: this.ids.missionId(),
      createdAt: now,
      updatedAt: now,
      spaceId: input.spaceId,
      threadId: input.threadId,
      goal: input.goal,
      status: "running",
      runIds: [],
    };

    const task: RunTask = {
      missionId: mission.id,
      spaceId: input.spaceId,
      workspaceId: input.workspaceId,
      prompt: input.prompt ?? input.goal,
      ...(input.context ? { context: input.context } : {}),
    };

    const result = await input.executor.startRun(task);
    return {
      mission: {
        ...mission,
        runIds: [result.run.id],
      },
      run: result.run,
      events: result.events,
    };
  }

  async runMissionToCompletion(input: StartMissionRunInput): Promise<CompletedMissionRun> {
    const started = await this.startMissionRun(input);
    const events: KernelEvent[] = [];
    let snapshot = createRunSnapshot(started.run);

    for await (const event of started.events) {
      events.push(event);
      snapshot = reduceRunSnapshot(snapshot, event);
    }

    const artifacts = await input.executor.collectArtifacts(started.run.id);

    return {
      mission: started.mission,
      run: {
        ...started.run,
        status: snapshotToRunStatus(snapshot.status),
        artifactIds: snapshot.artifactIds,
      },
      events,
      snapshot,
      artifacts,
    };
  }

  submitApproval(executor: CodeExecutor, runId: RunId, decision: ApprovalDecision): Promise<void> {
    return executor.submitApproval(runId, decision);
  }
}

export function createRunSnapshot(run: Run): ControlPlaneRunSnapshot {
  return {
    runId: run.id,
    status: run.status === "queued" ? "running" : normalizeRunStatus(run.status),
    stream: [],
    artifactIds: [...run.artifactIds],
    approvals: [],
  };
}

export function reduceRunSnapshot(
  snapshot: ControlPlaneRunSnapshot,
  event: KernelEvent,
): ControlPlaneRunSnapshot {
  switch (event.type) {
    case "run.started":
      return { ...snapshot, status: "running" };
    case "run.stream":
      return { ...snapshot, stream: [...snapshot.stream, event.chunk] };
    case "approval.requested":
      return {
        ...snapshot,
        status: "awaiting-approval",
        approvals: [...snapshot.approvals, { approvalId: event.approvalId, status: "pending" }],
      };
    case "approval.granted":
    case "approval.rejected":
      return {
        ...snapshot,
        status: event.type === "approval.granted" ? "running" : "failed",
        approvals: snapshot.approvals.map((approval) =>
          approval.approvalId === event.approvalId
            ? { ...approval, status: event.type === "approval.granted" ? "granted" : "rejected" }
            : approval,
        ),
      };
    case "artifact.created":
      return { ...snapshot, artifactIds: [...snapshot.artifactIds, event.artifactId] };
    case "run.completed":
      return { ...snapshot, status: "completed" };
    case "run.failed":
      return { ...snapshot, status: "failed", ...(event.message ? { error: event.message } : {}) };
    case "run.interrupted":
      return { ...snapshot, status: "interrupted" };
    case "mission.created":
    case "executor.status_changed":
      return snapshot;
  }
}

function normalizeRunStatus(status: Run["status"]): ControlPlaneRunStatus {
  switch (status) {
    case "awaiting-approval":
      return "awaiting-approval";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "interrupted":
      return "interrupted";
    case "queued":
    case "running":
      return "running";
  }
}

function snapshotToRunStatus(status: ControlPlaneRunStatus): Run["status"] {
  switch (status) {
    case "awaiting-approval":
      return "awaiting-approval";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "interrupted":
      return "interrupted";
    case "running":
      return "running";
  }
}
