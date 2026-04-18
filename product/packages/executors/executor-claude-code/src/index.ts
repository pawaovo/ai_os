import type { ExecutorEventMappingContext } from "@ai-os/executor-protocol";
import type { KernelEvent } from "@ai-os/kernel-events";
import type { ApprovalId, ArtifactId } from "@ai-os/kernel-objects";

export type ClaudeCodeNativeEvent =
  | { type: "session.started" }
  | { type: "assistant.delta"; text: string }
  | { type: "tool.approval"; approvalId: ApprovalId }
  | { type: "artifact.created"; artifactId: ArtifactId }
  | { type: "session.completed"; message?: string }
  | { type: "session.failed"; message: string }
  | { type: "session.interrupted"; message?: string };

export function mapClaudeCodeEventToKernelEvent(
  event: ClaudeCodeNativeEvent,
  context: ExecutorEventMappingContext,
): KernelEvent {
  switch (event.type) {
    case "session.started":
      return {
        id: context.eventId,
        type: "run.started",
        occurredAt: context.occurredAt,
        spaceId: context.spaceId,
        missionId: context.missionId,
        runId: context.runId,
        executorId: context.executorId,
      };
    case "assistant.delta":
      return {
        id: context.eventId,
        type: "run.stream",
        occurredAt: context.occurredAt,
        spaceId: context.spaceId,
        runId: context.runId,
        chunk: event.text,
      };
    case "tool.approval":
      return {
        id: context.eventId,
        type: "approval.requested",
        occurredAt: context.occurredAt,
        spaceId: context.spaceId,
        runId: context.runId,
        approvalId: event.approvalId,
      };
    case "artifact.created":
      return {
        id: context.eventId,
        type: "artifact.created",
        occurredAt: context.occurredAt,
        spaceId: context.spaceId,
        runId: context.runId,
        artifactId: event.artifactId,
      };
    case "session.completed":
      return {
        id: context.eventId,
        type: "run.completed",
        occurredAt: context.occurredAt,
        spaceId: context.spaceId,
        runId: context.runId,
        ...(event.message ? { message: event.message } : {}),
      };
    case "session.failed":
      return {
        id: context.eventId,
        type: "run.failed",
        occurredAt: context.occurredAt,
        spaceId: context.spaceId,
        runId: context.runId,
        message: event.message,
      };
    case "session.interrupted":
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

