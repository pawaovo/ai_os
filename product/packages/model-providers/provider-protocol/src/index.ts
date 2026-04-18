import type { ChatRequest, ChatStreamEvent } from "@ai-os/conversation-core";
import type { ProviderId } from "@ai-os/kernel-objects";

export type ProviderProtocol = "openai-compatible" | "anthropic-compatible";
export type SecretRef = `secret:${string}`;

export interface ModelInfo {
  id: string;
  displayName?: string;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsReasoning: boolean;
  contextWindow?: number;
}

export interface ModelProviderConfig {
  id: ProviderId;
  name: string;
  protocol: ProviderProtocol;
  baseUrl: string;
  apiKeyRef: SecretRef;
  defaultModelId?: string;
}

export interface ProviderStatus {
  available: boolean;
  message?: string;
}

export interface ProviderRuntime {
  resolveSecret(ref: SecretRef): Promise<string>;
  fetch: typeof fetch;
}

export interface ModelProviderRequest {
  config: ModelProviderConfig;
  runtime: ProviderRuntime;
}

export interface ModelProvider {
  readonly id: ProviderId;
  readonly protocol: ProviderProtocol;
  testConnection(request: ModelProviderRequest): Promise<ProviderStatus>;
  listModels(request: ModelProviderRequest): Promise<ModelInfo[]>;
  streamChat(request: ModelProviderRequest, chat: ChatRequest): AsyncIterable<ChatStreamEvent>;
}
