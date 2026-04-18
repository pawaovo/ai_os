import type {
  ApprovalDecision,
  CodeExecutor,
  ExecutorEventMappingContext,
  ExecutorProcessRunner,
  RunTask,
  StartRunResult,
} from "@ai-os/executor-protocol";
import type { KernelEvent } from "@ai-os/kernel-events";
import type {
  ApprovalId,
  Artifact,
  ArtifactId,
  ExecutorId,
  IsoDateTime,
  Run,
  RunId,
} from "@ai-os/kernel-objects";

export type CodexNativeEvent =
  | { type: "thread.started" }
  | { type: "item.agentMessage.delta"; delta: string }
  | { type: "item.commandExecution.requestApproval"; approvalId: ApprovalId }
  | { type: "item.fileChange.requestApproval"; approvalId: ApprovalId }
  | { type: "item.artifact.created"; artifactId: ArtifactId }
  | { type: "turn.completed"; message?: string }
  | { type: "turn.failed"; message: string }
  | { type: "turn.interrupted"; message?: string };

export interface CodexProcessExecutorIds {
  runId(): RunId;
  eventId(): string;
}

export interface CodexProcessExecutorClock {
  now(): IsoDateTime;
}

export interface CodexProcessExecutorOptions {
  id: ExecutorId;
  runner: ExecutorProcessRunner;
  ids: CodexProcessExecutorIds;
  clock: CodexProcessExecutorClock;
  command?: string;
}

export class CodexProcessExecutor implements CodeExecutor {
  readonly kind = "codex" as const;
  private readonly command: string;

  constructor(
    readonly id: ExecutorId,
    private readonly runner: ExecutorProcessRunner,
    private readonly ids: CodexProcessExecutorIds,
    private readonly clock: CodexProcessExecutorClock,
    command = "codex",
  ) {
    this.command = command;
  }

  static create(options: CodexProcessExecutorOptions): CodexProcessExecutor {
    return new CodexProcessExecutor(
      options.id,
      options.runner,
      options.ids,
      options.clock,
      options.command,
    );
  }

  async getRuntimeStatus() {
    const available = await this.runner.isAvailable(this.command);
    return {
      executorId: this.id,
      type: "code" as const,
      available,
      ...(available ? {} : { message: `Codex command not found: ${this.command}` }),
    };
  }

  async startRun(task: RunTask): Promise<StartRunResult> {
    const now = this.clock.now();
    const run: Run = {
      id: this.ids.runId(),
      createdAt: now,
      updatedAt: now,
      missionId: task.missionId,
      workspaceId: task.workspaceId,
      executorId: this.id,
      status: "running",
      artifactIds: [],
    };

    return {
      run,
      events: this.streamProcessEvents(run, task),
    };
  }

  async submitApproval(_runId: RunId, _decision: ApprovalDecision): Promise<void> {
    // Real approval bridging is implemented when Codex process protocol is wired.
  }

  async interruptRun(_runId: RunId): Promise<void> {
    // Real process interruption is implemented when managed process handles exist.
  }

  async collectArtifacts(_runId: RunId): Promise<Artifact[]> {
    return [];
  }

  private async *streamProcessEvents(run: Run, task: RunTask): AsyncIterable<KernelEvent> {
    const contextBase = {
      spaceId: task.spaceId,
      missionId: task.missionId,
      runId: run.id,
      executorId: this.id,
    };

    for await (const line of this.runner.run({
      command: this.command,
      args: ["exec", "--json", task.prompt],
      ...(task.context?.cwd ? { cwd: String(task.context.cwd) } : {}),
    })) {
      const native = parseCodexNativeEvent(line);
      if (!native) continue;
      yield mapCodexEventToKernelEvent(native, {
        ...contextBase,
        eventId: this.ids.eventId(),
        occurredAt: this.clock.now(),
      });
    }
  }
}

export function parseCodexNativeEvent(line: string): CodexNativeEvent | undefined {
  try {
    const value = JSON.parse(line) as unknown;
    return toCodexNativeEvent(value);
  } catch {
    return undefined;
  }
}

function toCodexNativeEvent(value: unknown): CodexNativeEvent | undefined {
  if (!isRecord(value) || typeof value.type !== "string") return undefined;

  switch (value.type) {
    case "thread.started":
      return { type: "thread.started" };
    case "item.completed": {
      const text = extractCodexAgentMessageText(value.item);
      return text ? { type: "item.agentMessage.delta", delta: text } : undefined;
    }
    case "item.agentMessage.delta":
      return typeof value.delta === "string"
        ? { type: "item.agentMessage.delta", delta: value.delta }
        : undefined;
    case "item.commandExecution.requestApproval":
    case "item.fileChange.requestApproval":
      return typeof value.approvalId === "string"
        ? { type: value.type, approvalId: value.approvalId as ApprovalId }
        : undefined;
    case "item.artifact.created":
      return typeof value.artifactId === "string"
        ? { type: "item.artifact.created", artifactId: value.artifactId as ArtifactId }
        : undefined;
    case "turn.completed":
      return typeof value.message === "string" || value.message === undefined
        ? { type: "turn.completed", ...(value.message !== undefined ? { message: value.message } : {}) }
        : undefined;
    case "turn.failed":
      return typeof value.message === "string"
        ? { type: "turn.failed", message: value.message }
        : undefined;
    case "turn.interrupted":
      return typeof value.message === "string" || value.message === undefined
        ? { type: "turn.interrupted", ...(value.message !== undefined ? { message: value.message } : {}) }
        : undefined;
    default:
      return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractCodexAgentMessageText(item: unknown): string | undefined {
  if (!isRecord(item) || item.type !== "agent_message" || typeof item.text !== "string") {
    return undefined;
  }

  return item.text.length > 0 ? item.text : undefined;
}

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
