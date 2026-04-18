import type { KernelEvent } from "@ai-os/kernel-events";
import type {
  Approval,
  Artifact,
  ExecutorId,
  IsoDateTime,
  MissionId,
  Run,
  RunId,
  SpaceId,
  WorkspaceId,
} from "@ai-os/kernel-objects";

export type ExecutorType = "code" | "browser" | "cli" | "shell" | "hybrid";
export type CodeExecutorKind = "codex" | "claude-code";

export interface ExecutorStatus {
  executorId: ExecutorId;
  type: ExecutorType;
  available: boolean;
  message?: string;
}

export interface RunTask {
  missionId: MissionId;
  workspaceId: WorkspaceId;
  prompt: string;
  context?: Record<string, unknown>;
}

export interface StartRunResult {
  run: Run;
  events: AsyncIterable<KernelEvent>;
}

export interface ApprovalDecision {
  approvalId: Approval["id"];
  decision: "grant" | "reject";
  message?: string;
}

export interface CodeExecutor {
  readonly id: ExecutorId;
  readonly kind: CodeExecutorKind;
  getRuntimeStatus(): Promise<ExecutorStatus>;
  startRun(task: RunTask): Promise<StartRunResult>;
  submitApproval(runId: RunId, decision: ApprovalDecision): Promise<void>;
  interruptRun(runId: RunId): Promise<void>;
  collectArtifacts(runId: RunId): Promise<Artifact[]>;
}

export interface ExecutorEventMappingContext {
  eventId: string;
  occurredAt: IsoDateTime;
  spaceId: SpaceId;
  missionId: MissionId;
  runId: RunId;
  executorId: ExecutorId;
}
