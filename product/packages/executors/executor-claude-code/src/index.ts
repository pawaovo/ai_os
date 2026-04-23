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

export type ClaudeCodeNativeEvent =
  | { type: "session.started" }
  | { type: "assistant.delta"; text: string }
  | { type: "tool.approval"; approvalId: ApprovalId }
  | { type: "artifact.created"; artifactId: ArtifactId }
  | { type: "session.completed"; message?: string }
  | { type: "session.failed"; message: string }
  | { type: "session.interrupted"; message?: string };

export interface ClaudeCodeProcessExecutorIds {
  runId(): RunId;
  eventId(): string;
}

export interface ClaudeCodeProcessExecutorClock {
  now(): IsoDateTime;
}

export interface ClaudeCodeProcessExecutorOptions {
  id: ExecutorId;
  runner: ExecutorProcessRunner;
  ids: ClaudeCodeProcessExecutorIds;
  clock: ClaudeCodeProcessExecutorClock;
  command?: string;
  args?: string[];
}

export class ClaudeCodeProcessExecutor implements CodeExecutor {
  readonly kind = "claude-code" as const;
  private readonly command: string;
  private readonly args: string[];
  private readonly abortControllers = new Map<RunId, AbortController>();

  constructor(
    readonly id: ExecutorId,
    private readonly runner: ExecutorProcessRunner,
    private readonly ids: ClaudeCodeProcessExecutorIds,
    private readonly clock: ClaudeCodeProcessExecutorClock,
    command = "claude",
    args = [
      "-p",
      "--verbose",
      "--output-format",
      "stream-json",
      "--no-session-persistence",
    ],
  ) {
    this.command = command;
    this.args = args;
  }

  static create(options: ClaudeCodeProcessExecutorOptions): ClaudeCodeProcessExecutor {
    return new ClaudeCodeProcessExecutor(
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
          "Runtime approval bridge is not wired to the native Claude Code process protocol yet.",
          "Artifact collection currently falls back to transcript and workspace diff artifacts.",
        ],
      },
      ...(available ? {} : { message: `Claude Code command not found: ${this.command}` }),
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
    // Real approval bridging is implemented when Claude Code process protocol is wired.
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
        const native = parseClaudeCodeNativeEvent(line);
        if (!native) continue;
        const event = mapClaudeCodeEventToKernelEvent(native, {
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
            message: "Claude Code run interrupted.",
          };
        }
        return;
      }
      if (!terminalEventEmitted) {
        yield {
          id: this.ids.eventId(),
          type: "run.failed",
          occurredAt: this.clock.now(),
          spaceId: task.spaceId,
          runId: run.id,
          message: error instanceof Error ? error.message : "Claude Code run failed.",
        };
      }
      return;
    } finally {
      this.abortControllers.delete(run.id);
    }
  }
}

export function parseClaudeCodeNativeEvent(line: string): ClaudeCodeNativeEvent | undefined {
  try {
    const value = JSON.parse(line) as unknown;
    return toClaudeCodeNativeEvent(value);
  } catch {
    return undefined;
  }
}

function toClaudeCodeNativeEvent(value: unknown): ClaudeCodeNativeEvent | undefined {
  if (!isRecord(value) || typeof value.type !== "string") return undefined;

  switch (value.type) {
    case "system":
      return value.subtype === "init" ? { type: "session.started" } : undefined;
    case "session.started":
      return { type: "session.started" };
    case "assistant": {
      const text = extractClaudeAssistantText(value.message);
      return text ? { type: "assistant.delta", text } : undefined;
    }
    case "assistant.delta":
      return typeof value.text === "string"
        ? { type: "assistant.delta", text: value.text }
        : undefined;
    case "tool.approval":
      return typeof value.approvalId === "string"
        ? { type: "tool.approval", approvalId: value.approvalId as ApprovalId }
        : undefined;
    case "artifact.created":
      return typeof value.artifactId === "string"
        ? { type: "artifact.created", artifactId: value.artifactId as ArtifactId }
        : undefined;
    case "session.completed":
      return typeof value.message === "string" || value.message === undefined
        ? { type: "session.completed", ...(value.message !== undefined ? { message: value.message } : {}) }
        : undefined;
    case "session.failed":
      return typeof value.message === "string"
        ? { type: "session.failed", message: value.message }
        : undefined;
    case "session.interrupted":
      return typeof value.message === "string" || value.message === undefined
        ? { type: "session.interrupted", ...(value.message !== undefined ? { message: value.message } : {}) }
        : undefined;
    case "result":
      if (value.is_error === true || isErrorSubtype(value.subtype)) {
        return { type: "session.failed", message: extractClaudeResultError(value) };
      }

      return typeof value.result === "string"
        ? { type: "session.completed", message: value.result }
        : { type: "session.completed" };
    default:
      return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractClaudeAssistantText(message: unknown): string | undefined {
  if (!isRecord(message) || !Array.isArray(message.content)) return undefined;

  const text = message.content
    .flatMap((block) =>
      isRecord(block) && block.type === "text" && typeof block.text === "string"
        ? [block.text]
        : [],
    )
    .join("");

  return text.length > 0 ? text : undefined;
}

function isErrorSubtype(subtype: unknown): boolean {
  return typeof subtype === "string" && subtype.startsWith("error");
}

function extractClaudeResultError(value: Record<string, unknown>): string {
  if (Array.isArray(value.errors)) {
    const errors = value.errors.filter((error): error is string => typeof error === "string");
    if (errors.length > 0) return errors.join("; ");
  }

  return typeof value.subtype === "string" ? value.subtype : "Claude Code process failed";
}

function isAbortError(error: unknown): error is Error {
  return error instanceof Error && error.name === "AbortError";
}

function isTerminalKernelEvent(type: KernelEvent["type"]): boolean {
  return type === "run.completed" || type === "run.failed" || type === "run.interrupted";
}

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
