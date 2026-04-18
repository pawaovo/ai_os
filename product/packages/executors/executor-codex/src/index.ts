import type { ExecutorEventMappingContext } from "@ai-os/executor-protocol";
import type { KernelEvent } from "@ai-os/kernel-events";
import type { ApprovalId, ArtifactId } from "@ai-os/kernel-objects";

export type CodexNativeEvent =
  | { type: "thread.started" }
  | { type: "item.agentMessage.delta"; delta: string }
  | { type: "item.commandExecution.requestApproval"; approvalId: ApprovalId }
  | { type: "item.fileChange.requestApproval"; approvalId: ApprovalId }
  | { type: "item.artifact.created"; artifactId: ArtifactId }
  | { type: "turn.completed"; message?: string }
  | { type: "turn.failed"; message: string }
  | { type: "turn.interrupted"; message?: string };

export function mapCodexEventToKernelEvent(
  event: CodexNativeEvent,
  context: ExecutorEventMappingContext,
): KernelEvent {
  switch (event.type) {
    case "thread.started":
      return {
        id: context.eventId,
        type: "run.started",
        occurredAt: context.occurredAt,
        spaceId: context.spaceId,
        missionId: context.missionId,
        runId: context.runId,
        executorId: context.executorId,
      };
    case "item.agentMessage.delta":
      return {
        id: context.eventId,
        type: "run.stream",
        occurredAt: context.occurredAt,
        spaceId: context.spaceId,
        runId: context.runId,
        chunk: event.delta,
      };
    case "item.commandExecution.requestApproval":
    case "item.fileChange.requestApproval":
      return {
        id: context.eventId,
        type: "approval.requested",
        occurredAt: context.occurredAt,
        spaceId: context.spaceId,
        runId: context.runId,
        approvalId: event.approvalId,
      };
    case "item.artifact.created":
      return {
        id: context.eventId,
        type: "artifact.created",
        occurredAt: context.occurredAt,
        spaceId: context.spaceId,
        runId: context.runId,
        artifactId: event.artifactId,
      };
    case "turn.completed":
      return {
        id: context.eventId,
        type: "run.completed",
        occurredAt: context.occurredAt,
        spaceId: context.spaceId,
        runId: context.runId,
        ...(event.message ? { message: event.message } : {}),
      };
    case "turn.failed":
      return {
        id: context.eventId,
        type: "run.failed",
        occurredAt: context.occurredAt,
        spaceId: context.spaceId,
        runId: context.runId,
        message: event.message,
      };
    case "turn.interrupted":
      return {
        id: context.eventId,
        type: "run.interrupted",
        occurredAt: context.occurredAt,
        spaceId: context.spaceId,
        runId: context.runId,
        ...(event.message ? { message: event.message } : {}),
      };
  }
}

