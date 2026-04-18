import type {
  ApprovalId,
  ArtifactId,
  ExecutorId,
  IsoDateTime,
  MissionId,
  RunId,
  SpaceId,
} from "@ai-os/kernel-objects";

export type KernelEventType =
  | "mission.created"
  | "run.started"
  | "run.stream"
  | "approval.requested"
  | "approval.granted"
  | "approval.rejected"
  | "artifact.created"
  | "run.completed"
  | "run.failed"
  | "run.interrupted"
  | "executor.status_changed";

export interface KernelEventBase<TType extends KernelEventType> {
  id: string;
  type: TType;
  occurredAt: IsoDateTime;
  spaceId: SpaceId;
}

export interface MissionCreatedEvent extends KernelEventBase<"mission.created"> {
  missionId: MissionId;
}

export interface RunStartedEvent extends KernelEventBase<"run.started"> {
  missionId: MissionId;
  runId: RunId;
  executorId: ExecutorId;
}

export interface RunStreamEvent extends KernelEventBase<"run.stream"> {
  runId: RunId;
  chunk: string;
}

export interface ApprovalRequestedEvent extends KernelEventBase<"approval.requested"> {
  runId: RunId;
  approvalId: ApprovalId;
}

export interface ApprovalResolvedEvent extends KernelEventBase<"approval.granted" | "approval.rejected"> {
  runId: RunId;
  approvalId: ApprovalId;
}

export interface ArtifactCreatedEvent extends KernelEventBase<"artifact.created"> {
  runId: RunId;
  artifactId: ArtifactId;
}

export interface RunTerminalEvent extends KernelEventBase<"run.completed" | "run.failed" | "run.interrupted"> {
  runId: RunId;
  message?: string;
}

export interface ExecutorStatusChangedEvent extends KernelEventBase<"executor.status_changed"> {
  executorId: ExecutorId;
  available: boolean;
  message?: string;
}

export type KernelEvent =
  | MissionCreatedEvent
  | RunStartedEvent
  | RunStreamEvent
  | ApprovalRequestedEvent
  | ApprovalResolvedEvent
  | ArtifactCreatedEvent
  | RunTerminalEvent
  | ExecutorStatusChangedEvent;

