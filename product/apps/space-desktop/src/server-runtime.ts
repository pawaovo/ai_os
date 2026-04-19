import type { ChatRole, ConversationMessage } from "@ai-os/conversation-core";
import { streamConversation } from "@ai-os/conversation-runtime";
import { ClaudeCodeProcessExecutor } from "@ai-os/executor-claude-code";
import { CodexProcessExecutor } from "@ai-os/executor-codex";
import type { CodeExecutor, ExecutorProcessRunner } from "@ai-os/executor-protocol";
import type {
  ArtifactId,
  ExecutorId,
  IsoDateTime,
  MessageId,
  ProviderId,
  RunId,
  ThreadId,
} from "@ai-os/kernel-objects";
import { AnthropicCompatibleProvider } from "@ai-os/provider-anthropic-compatible";
import { OpenAiCompatibleProvider } from "@ai-os/provider-openai-compatible";
import type {
  ModelProviderConfig,
  ProviderProtocol,
  ProviderRuntime,
  SecretRef,
} from "@ai-os/provider-protocol";
import { ProviderRegistry } from "@ai-os/provider-registry";

import {
  createFailedSpaceDemoState,
  runSpaceDemoGoal,
  runSpaceDemoGoalWithExecutor,
  type SpaceDemoExecutorChoice,
  type SpaceDemoState,
} from "./demo-runtime.js";

export interface SpaceDemoRunRequest {
  goal: string;
  executorChoice: SpaceDemoExecutorChoice;
}

export interface SpaceDemoServerRuntime {
  runner: ExecutorProcessRunner;
  codexCommand?: string;
  claudeCommand?: string;
}

export interface SpaceDemoRunResponse {
  state: SpaceDemoState;
}

export interface ServerExecutorFactoryIds {
  runId(): RunId;
  eventId(): string;
  artifactId(): ArtifactId;
}

export interface ServerExecutorFactoryClock {
  now(): IsoDateTime;
}

export interface StoredProviderConfig {
  id?: string;
  name: string;
  protocol: ProviderProtocol;
  baseUrl: string;
  apiKey: string;
  modelId: string;
}

export interface ProviderSettingsInput {
  id?: string;
  name: string;
  protocol: ProviderProtocol;
  baseUrl: string;
  apiKey?: string;
  modelId: string;
}

export interface ProviderSettingsResponse {
  configured: boolean;
  provider?: {
    id?: string;
    name: string;
    protocol: ProviderProtocol;
    baseUrl: string;
    apiKeyPreview: string;
    modelId: string;
  };
}

export interface ProviderListResponse {
  providers: Array<NonNullable<ProviderSettingsResponse["provider"]>>;
  activeProviderId?: string;
}

export interface ProviderDoctorResponse {
  available: boolean;
  message: string;
  models: string[];
}

export interface ChatThreadSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export interface ChatThreadListResponse {
  threads: ChatThreadSummary[];
  activeThreadId?: string;
}

export type ChatUiRole = Extract<ChatRole, "user" | "assistant" | "system">;

export interface ChatUiMessage {
  id?: string;
  role: ChatUiRole;
  content: string;
  createdAt?: string;
}

export interface ChatSendRequest {
  message: string;
  history: ChatUiMessage[];
  threadId?: string;
  providerId?: string;
}

export interface ChatSendResponse {
  threadId?: string;
  messages: ChatUiMessage[];
  assistantMessage: string;
}

const DEFAULT_CODEX_ARGS = ["exec", "--json", "--sandbox", "read-only", "--skip-git-repo-check"];
const ACTIVE_PROVIDER_ID = "provider-local-preview" as ProviderId;
const ACTIVE_THREAD_ID = "thread-product-preview" as ThreadId;
const ACTIVE_SECRET_REF = "secret:active-provider-api-key" as SecretRef;

export function parseSpaceDemoRunRequest(value: unknown): SpaceDemoRunRequest {
  if (!isRecord(value)) {
    throw new Error("Request body must be a JSON object.");
  }

  if (typeof value.goal !== "string") {
    throw new Error("Request body must include a string goal.");
  }

  return {
    goal: value.goal,
    executorChoice: parseExecutorChoice(value.executorChoice),
  };
}

export async function runSpaceDemoRequest(
  request: SpaceDemoRunRequest,
  runtime: SpaceDemoServerRuntime,
): Promise<SpaceDemoRunResponse> {
  try {
    if (request.executorChoice === "mock") {
      const result = await runSpaceDemoGoal({
        goal: request.goal,
        executorChoice: "mock",
      });
      return { state: result.state };
    }

    const executor = createCodeExecutorForChoice(request.executorChoice, runtime);
    const status = await executor.getRuntimeStatus();

    if (!status.available) {
      throw new Error(status.message ?? `${request.executorChoice} is not available.`);
    }

    const result = await runSpaceDemoGoalWithExecutor({
      goal: request.goal,
      executorChoice: request.executorChoice,
      executor,
    });

    return { state: result.state };
  } catch (error) {
    return {
      state: createFailedSpaceDemoState({
        goal: request.goal,
        executorChoice: request.executorChoice,
        error: error instanceof Error ? error.message : "Executor demo run failed.",
      }),
    };
  }
}

export async function getExecutorRuntimeStatus(
  executorChoice: SpaceDemoExecutorChoice,
  runtime: SpaceDemoServerRuntime,
) {
  if (executorChoice === "mock") {
    return {
      executorId: "executor-demo-mock" as ExecutorId,
      type: "code" as const,
      available: true,
      message: "Deterministic local demo executor.",
    };
  }

  return createCodeExecutorForChoice(executorChoice, runtime).getRuntimeStatus();
}

export function parseProviderSettingsInput(
  value: unknown,
  existing?: StoredProviderConfig,
): StoredProviderConfig {
  if (!isRecord(value)) {
    throw new Error("Provider settings body must be a JSON object.");
  }

  const name = readRequiredString(value.name, "name");
  const protocol = parseProviderProtocol(value.protocol);
  const baseUrl = readRequiredString(value.baseUrl, "baseUrl").replace(/\/+$/, "");
  const apiKey = readOptionalString(value.apiKey) || existing?.apiKey;
  const modelId = readRequiredString(value.modelId, "modelId");

  if (!apiKey) {
    throw new Error("Provider API key is required.");
  }

  return {
    ...readIdProperty(value.id),
    name,
    protocol,
    baseUrl,
    apiKey,
    modelId,
  };
}

export function createProviderSettingsResponse(
  provider: StoredProviderConfig | undefined,
): ProviderSettingsResponse {
  if (!provider) {
    return { configured: false };
  }

  return {
    configured: true,
    provider: {
      ...(provider.id ? { id: provider.id } : {}),
      name: provider.name,
      protocol: provider.protocol,
      baseUrl: provider.baseUrl,
      apiKeyPreview: maskSecret(provider.apiKey),
      modelId: provider.modelId,
    },
  };
}

export function parseChatSendRequest(value: unknown): ChatSendRequest {
  if (!isRecord(value)) {
    throw new Error("Chat request body must be a JSON object.");
  }

  const message = readRequiredString(value.message, "message");
  const history = Array.isArray(value.history)
    ? value.history.map(parseChatUiMessage)
    : [];

  return {
    message,
    history,
    ...readThreadIdProperty(value.threadId),
    ...readProviderIdProperty(value.providerId),
  };
}

export function createProviderListResponse(
  providers: StoredProviderConfig[],
  activeProviderId?: string,
): ProviderListResponse {
  return {
    providers: providers
      .map((provider) => createProviderSettingsResponse(provider).provider)
      .filter((provider): provider is NonNullable<ProviderSettingsResponse["provider"]> => Boolean(provider)),
    ...(activeProviderId ? { activeProviderId } : {}),
  };
}

export async function runProviderDoctor(input: {
  provider: StoredProviderConfig | undefined;
  fetch: typeof fetch;
}): Promise<ProviderDoctorResponse> {
  if (!input.provider) {
    return {
      available: false,
      message: "Configure a model provider first.",
      models: [],
    };
  }

  const registry = createProviderRegistry();
  const providerConfig = toModelProviderConfig(input.provider);
  const providerRuntime = createProviderRuntime(input.provider, input.fetch);

  try {
    const models = await registry.listModels(providerConfig, providerRuntime);
    return {
      available: true,
      message: "Provider connection succeeded.",
      models: models.map((model) => model.id),
    };
  } catch (error) {
    return {
      available: false,
      message: error instanceof Error ? error.message : "Provider connection failed.",
      models: [],
    };
  }
}

export async function runChatSendRequest(input: {
  request: ChatSendRequest;
  provider: StoredProviderConfig | undefined;
  fetch: typeof fetch;
}): Promise<ChatSendResponse> {
  if (!input.provider) {
    throw new Error("Configure a model provider before chatting.");
  }

  const provider = input.provider;
  const messages = [
    ...input.request.history,
    { role: "user" as const, content: input.request.message },
  ];
  const conversationMessages = messages.map(toConversationMessage);
  const registry = createProviderRegistry();
  const providerConfig = toModelProviderConfig(provider);
  const providerRuntime = createProviderRuntime(provider, input.fetch);
  let assistantMessage = "";

  for await (const event of streamConversation({
    registry,
    providerConfig,
    providerRuntime,
    chatRequest: {
      threadId: ACTIVE_THREAD_ID,
      providerId: ACTIVE_PROVIDER_ID,
      modelId: provider.modelId,
      messages: conversationMessages,
    },
  })) {
    switch (event.type) {
      case "text.delta":
        assistantMessage += event.delta;
        break;
      case "message.completed":
        assistantMessage += messageToText(event.message);
        break;
      case "error":
        throw new Error(event.message);
    }
  }

  if (assistantMessage.length === 0) {
    throw new Error("Provider returned an empty assistant response.");
  }

  return {
    ...(input.request.threadId ? { threadId: input.request.threadId } : {}),
    assistantMessage,
    messages: [
      ...messages,
      {
        role: "assistant",
        content: assistantMessage,
      },
    ],
  };
}

export function createCodeExecutorForChoice(
  executorChoice: Exclude<SpaceDemoExecutorChoice, "mock">,
  runtime: SpaceDemoServerRuntime,
  options: {
    ids?: ServerExecutorFactoryIds;
    clock?: ServerExecutorFactoryClock;
  } = {},
): CodeExecutor {
  const ids = options.ids ?? createServerDemoIds();
  const clock = options.clock ?? createServerDemoClock();

  if (executorChoice === "codex") {
    return CodexProcessExecutor.create({
      id: "executor-demo-codex" as ExecutorId,
      runner: runtime.runner,
      ids,
      clock,
      args: DEFAULT_CODEX_ARGS,
      ...(runtime.codexCommand !== undefined ? { command: runtime.codexCommand } : {}),
    });
  }

  return ClaudeCodeProcessExecutor.create({
    id: "executor-demo-claude-code" as ExecutorId,
    runner: runtime.runner,
    ids,
    clock,
    ...(runtime.claudeCommand !== undefined ? { command: runtime.claudeCommand } : {}),
  });
}

function createProviderRegistry(): ProviderRegistry {
  const registry = new ProviderRegistry();
  registry.register(new OpenAiCompatibleProvider("provider-openai-compatible-preview" as ProviderId));
  registry.register(new AnthropicCompatibleProvider("provider-anthropic-compatible-preview" as ProviderId));
  return registry;
}

function createProviderRuntime(provider: StoredProviderConfig, runtimeFetch: typeof fetch): ProviderRuntime {
  return {
    fetch: runtimeFetch,
    async resolveSecret(ref) {
      if (ref !== ACTIVE_SECRET_REF) {
        throw new Error(`Unknown secret ref: ${ref}`);
      }

      return provider.apiKey;
    },
  };
}

function toModelProviderConfig(provider: StoredProviderConfig): ModelProviderConfig {
  return {
    id: ACTIVE_PROVIDER_ID,
    name: provider.name,
    protocol: provider.protocol,
    baseUrl: provider.baseUrl,
    apiKeyRef: ACTIVE_SECRET_REF,
    defaultModelId: provider.modelId,
  };
}

function parseProviderProtocol(value: unknown): ProviderProtocol {
  switch (value) {
    case "openai-compatible":
    case "anthropic-compatible":
      return value;
    default:
      throw new Error("Unsupported provider protocol.");
  }
}

export function parseExecutorChoice(value: unknown): SpaceDemoExecutorChoice {
  switch (value) {
    case "codex":
    case "claude-code":
    case "mock":
    case undefined:
      return value ?? "mock";
    default:
      throw new Error("Unsupported executor choice.");
  }
}

function parseChatUiMessage(value: unknown): ChatUiMessage {
  if (!isRecord(value)) {
    throw new Error("Chat history entries must be JSON objects.");
  }

  const role = parseChatUiRole(value.role);
  const content = readRequiredString(value.content, "content");

  return { role, content };
}

function parseChatUiRole(value: unknown): ChatUiRole {
  switch (value) {
    case "user":
    case "assistant":
    case "system":
      return value;
    default:
      throw new Error("Unsupported chat role.");
  }
}

function readRequiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Provider settings field is required: ${field}`);
  }

  return value.trim();
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readIdProperty(value: unknown): { id?: string } {
  const id = readOptionalString(value);
  return id ? { id } : {};
}

function readThreadIdProperty(value: unknown): { threadId?: string } {
  const threadId = readOptionalString(value);
  return threadId ? { threadId } : {};
}

function readProviderIdProperty(value: unknown): { providerId?: string } {
  const providerId = readOptionalString(value);
  return providerId ? { providerId } : {};
}

function toConversationMessage(message: ChatUiMessage, index: number): ConversationMessage {
  return {
    id: `message-preview-${index + 1}` as MessageId,
    role: message.role,
    parts: [
      {
        type: "text",
        text: message.content,
      },
    ],
  };
}

function messageToText(message: ConversationMessage): string {
  return message.parts
    .map((part) => part.text ?? part.ref ?? "")
    .filter(Boolean)
    .join("\n");
}

function maskSecret(secret: string): string {
  if (secret.length <= 8) {
    return "****";
  }

  return `${secret.slice(0, 3)}...${secret.slice(-4)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function createServerDemoIds() {
  let run = 0;
  let event = 0;
  let artifact = 0;

  return {
    runId: () => `run-server-${Date.now()}-${++run}` as RunId,
    eventId: () => `event-server-${Date.now()}-${++event}`,
    artifactId: () => `artifact-server-${Date.now()}-${++artifact}` as ArtifactId,
  };
}

function createServerDemoClock() {
  return {
    now: () => new Date().toISOString() as IsoDateTime,
  };
}
