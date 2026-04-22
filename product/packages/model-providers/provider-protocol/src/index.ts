import type { ChatRequest, ChatStreamEvent } from "@ai-os/conversation-core";
import type { ProviderId } from "@ai-os/kernel-objects";

export type ProviderProtocol = "openai-compatible" | "anthropic-compatible";
export type SecretRef = `secret:${string}`;
export type ProviderAuthScheme = "bearer" | "x-api-key";
export type ProviderErrorCode =
  | "unknown-protocol"
  | "invalid-base-url"
  | "secret-resolution-failed"
  | "authentication-failed"
  | "protocol-mismatch"
  | "models-request-failed"
  | "chat-request-failed"
  | "empty-response-body"
  | "stream-parse-failed"
  | "network-error"
  | "unknown-provider-error";
export type ProviderCheckId = "protocol" | "base-url" | "auth" | "models";
export type ProviderCheckStatus = "pass" | "warn" | "fail";

export interface ProviderCatalogEntry {
  protocol: ProviderProtocol;
  displayName: string;
  description: string;
  authScheme: ProviderAuthScheme;
  modelListPath: string;
  chatPath: string;
  supportsCustomBaseUrl: boolean;
}

export interface ProviderCheck {
  id: ProviderCheckId;
  status: ProviderCheckStatus;
  message: string;
}

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
  errorCode?: ProviderErrorCode;
  checks?: ProviderCheck[];
  hints?: string[];
  detectedProtocol?: ProviderProtocol;
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

export const PROVIDER_PROTOCOLS = [
  "openai-compatible",
  "anthropic-compatible",
] as const satisfies readonly ProviderProtocol[];

const PROVIDER_CATALOG: Record<ProviderProtocol, ProviderCatalogEntry> = {
  "openai-compatible": {
    protocol: "openai-compatible",
    displayName: "OpenAI-Compatible",
    description: "OpenAI-compatible HTTP API with Bearer authentication and /chat/completions streaming.",
    authScheme: "bearer",
    modelListPath: "/models",
    chatPath: "/chat/completions",
    supportsCustomBaseUrl: true,
  },
  "anthropic-compatible": {
    protocol: "anthropic-compatible",
    displayName: "Anthropic-Compatible",
    description: "Anthropic-compatible HTTP API with x-api-key authentication and /messages streaming.",
    authScheme: "x-api-key",
    modelListPath: "/models",
    chatPath: "/messages",
    supportsCustomBaseUrl: true,
  },
};

export class ModelProviderError extends Error {
  constructor(
    message: string,
    readonly code: ProviderErrorCode,
    readonly details: {
      protocol?: ProviderProtocol;
      statusCode?: number;
    } = {},
  ) {
    super(message);
    this.name = "ModelProviderError";
  }
}

export function listProviderCatalog(): ProviderCatalogEntry[] {
  return PROVIDER_PROTOCOLS.map((protocol) => PROVIDER_CATALOG[protocol]);
}

export function getProviderCatalogEntry(protocol: ProviderProtocol): ProviderCatalogEntry {
  return PROVIDER_CATALOG[protocol];
}

export function normalizeProviderBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export function detectProviderProtocol(baseUrl: string): ProviderProtocol | undefined {
  const normalized = normalizeProviderBaseUrl(baseUrl).toLowerCase();

  if (
    normalized.includes("anthropic")
    || normalized.includes("/anthropic")
    || normalized.endsWith("/messages")
  ) {
    return "anthropic-compatible";
  }

  if (
    normalized.includes("openai")
    || normalized.includes("/openai")
    || normalized.endsWith("/v1")
    || normalized.endsWith("/chat/completions")
  ) {
    return "openai-compatible";
  }

  return undefined;
}
