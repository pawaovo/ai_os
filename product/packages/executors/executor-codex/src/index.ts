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
  args?: string[];
}

export class CodexProcessExecutor implements CodeExecutor {
  readonly kind = "codex" as const;
  private readonly command: string;
  private readonly args: string[];
  private readonly abortControllers = new Map<RunId, AbortController>();

  constructor(
    readonly id: ExecutorId,
    private readonly runner: ExecutorProcessRunner,
    private readonly ids: CodexProcessExecutorIds,
    private readonly clock: CodexProcessExecutorClock,
    command = "codex",
    args = ["exec", "--json"],
  ) {
    this.command = command;
    this.args = args;
  }

  static create(options: CodexProcessExecutorOptions): CodexProcessExecutor {
    return new CodexProcessExecutor(
      options.id,
      options.runner,
      options.ids,
      options.clock,
      options.command,
      options.args,
    );
  }

  async getRuntimeStatus() {
    const available = await this.runner.isAvailable(this.command);
    return {
      executorId: this.id,
      type: "code" as const,
      available,
      compatibility: {
        family: "executor" as const,
        runtime: this.kind,
        transport: "process-cli" as const,
        sessionModel: "ephemeral-process" as const,
        capabilities: {
          approvalBridge: "product-pre-run" as const,
          artifactCollection: "fallback-only" as const,
          sessionContinuation: "product-pre-run" as const,
          interrupt: true,
          cwd: true,
          timeout: true,
        },
        limitations: [
          "Runtime approval bridge is not wired to the native Codex process protocol yet.",
          "Artifact collection currently falls back to transcript and workspace diff artifacts.",
        ],
      },
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

  async interruptRun(runId: RunId): Promise<void> {
    this.abortControllers.get(runId)?.abort();
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
    const controller = new AbortController();
    let terminalEventEmitted = false;
    const timeoutMs = typeof task.context?.timeoutMs === "number" ? task.context.timeoutMs : undefined;

    this.abortControllers.set(run.id, controller);

    try {
      for await (const line of this.runner.run({
        command: this.command,
        args: [...this.args, task.prompt],
        ...(task.context?.cwd ? { cwd: String(task.context.cwd) } : {}),
        ...(timeoutMs !== undefined ? { timeoutMs } : {}),
        signal: controller.signal,
      })) {
        const native = parseCodexNativeEvent(line);
        if (!native) continue;
        const event = mapCodexEventToKernelEvent(native, {
          ...contextBase,
          eventId: this.ids.eventId(),
          occurredAt: this.clock.now(),
        });
        terminalEventEmitted = isTerminalKernelEvent(event.type);
        yield event;
      }
    } catch (error) {
      if (isAbortError(error)) {
        if (!terminalEventEmitted) {
          yield {
            id: this.ids.eventId(),
            type: "run.interrupted",
            occurredAt: this.clock.now(),
            spaceId: task.spaceId,
            runId: run.id,
            message: "Codex run interrupted.",
          };
        }
        return;
      }
      throw error;
    } finally {
      this.abortControllers.delete(run.id);
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

function isAbortError(error: unknown): error is Error {
  return error instanceof Error && error.name === "AbortError";
}

function isTerminalKernelEvent(type: KernelEvent["type"]): boolean {
  return type === "run.completed" || type === "run.failed" || type === "run.interrupted";
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
