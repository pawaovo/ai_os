import type { ChatRequest, ChatStreamEvent, ConversationMessage } from "@ai-os/conversation-core";
import type {
  ModelInfo,
  ModelProvider,
  ModelProviderRequest,
  ProviderStatus,
} from "@ai-os/provider-protocol";
import type { ProviderId } from "@ai-os/kernel-objects";
import { ModelProviderError as ProviderError } from "@ai-os/provider-protocol";

type OpenAiChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
};

type OpenAiModelListResponse = {
  data?: Array<{ id?: string }>;
};

type OpenAiStreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string;
    };
    finish_reason?: string | null;
  }>;
};

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function messageToOpenAi(message: ConversationMessage): OpenAiChatMessage {
  return {
    role: message.role,
    content: message.parts
      .map((part) => part.text ?? part.ref ?? "")
      .filter(Boolean)
      .join("\n"),
  };
}

function parseSseDataLine(line: string): string | undefined {
  if (!line.startsWith("data:")) return undefined;
  const value = line.slice("data:".length).trim();
  if (!value || value === "[DONE]") return undefined;
  return value;
}

function parseOpenAiChunk(data: string): ChatStreamEvent | undefined {
  const chunk = JSON.parse(data) as OpenAiStreamChunk;
  const delta = chunk.choices?.[0]?.delta?.content;
  return delta ? { type: "text.delta", delta } : undefined;
}

async function* readOpenAiStream(response: Response): AsyncIterable<ChatStreamEvent> {
  if (!response.body) {
    yield {
      type: "error",
      message: new ProviderError(
        "OpenAI-compatible provider returned an empty stream body.",
        "empty-response-body",
        { protocol: "openai-compatible" },
      ).message,
    };
    return;
  }

  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const data = parseSseDataLine(line);
      if (!data) continue;
      try {
        const event = parseOpenAiChunk(data);
        if (event) yield event;
      } catch {
        yield {
          type: "error",
          message: new ProviderError(
            "Failed to parse OpenAI-compatible stream chunk.",
            "stream-parse-failed",
            { protocol: "openai-compatible" },
          ).message,
        };
      }
    }
  }

  const data = parseSseDataLine(buffer);
  if (data) {
    try {
      const event = parseOpenAiChunk(data);
      if (event) yield event;
    } catch {
      yield {
        type: "error",
        message: new ProviderError(
          "Failed to parse OpenAI-compatible stream chunk.",
          "stream-parse-failed",
          { protocol: "openai-compatible" },
        ).message,
      };
    }
  }
}

export class OpenAiCompatibleProvider implements ModelProvider {
  readonly protocol = "openai-compatible" as const;

  constructor(readonly id: ProviderId) {}

  async testConnection(request: ModelProviderRequest): Promise<ProviderStatus> {
    try {
      await this.listModels(request);
      return { available: true };
    } catch (error) {
      const providerError = error instanceof ProviderError ? error : undefined;
      return {
        available: false,
        message: error instanceof Error ? error.message : String(error),
        ...(providerError ? { errorCode: providerError.code } : {}),
      };
    }
  }

  async listModels({ config, runtime }: ModelProviderRequest): Promise<ModelInfo[]> {
    let apiKey: string;
    try {
      apiKey = await runtime.resolveSecret(config.apiKeyRef);
    } catch (error) {
      throw new ProviderError(
        error instanceof Error ? error.message : "Failed to resolve provider API key.",
        "secret-resolution-failed",
        { protocol: this.protocol },
      );
    }

    let response: Response;
    try {
      response = await runtime.fetch(`${trimTrailingSlash(config.baseUrl)}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
    } catch (error) {
      throw new ProviderError(
        error instanceof Error ? error.message : "OpenAI-compatible models request failed.",
        "network-error",
        { protocol: this.protocol },
      );
    }

    if (!response.ok) {
      throw new ProviderError(
        `OpenAI-compatible models request failed with HTTP ${response.status}.`,
        response.status === 401 || response.status === 403
          ? "authentication-failed"
          : response.status === 404
            ? "protocol-mismatch"
            : "models-request-failed",
        { protocol: this.protocol, statusCode: response.status },
      );
    }

    const payload = (await response.json()) as OpenAiModelListResponse;
    return (payload.data ?? [])
      .map((model) => model.id)
      .filter((id): id is string => Boolean(id))
      .map((id) => ({
        id,
        supportsTools: true,
        supportsVision: false,
        supportsReasoning: false,
      }));
  }

  async *streamChat(
    { config, runtime }: ModelProviderRequest,
    chat: ChatRequest,
  ): AsyncIterable<ChatStreamEvent> {
    let apiKey: string;
    try {
      apiKey = await runtime.resolveSecret(config.apiKeyRef);
    } catch (error) {
      yield {
        type: "error",
        message: new ProviderError(
          error instanceof Error ? error.message : "Failed to resolve provider API key.",
          "secret-resolution-failed",
          { protocol: this.protocol },
        ).message,
      };
      return;
    }

    let response: Response;
    try {
      response = await runtime.fetch(`${trimTrailingSlash(config.baseUrl)}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: chat.modelId,
          messages: chat.messages.map(messageToOpenAi),
          stream: true,
        }),
      });
    } catch (error) {
      yield {
        type: "error",
        message: new ProviderError(
          error instanceof Error ? error.message : "OpenAI-compatible chat request failed.",
          "network-error",
          { protocol: this.protocol },
        ).message,
      };
      return;
    }

    if (!response.ok) {
      yield {
        type: "error",
        message: new ProviderError(
          `OpenAI-compatible chat request failed with HTTP ${response.status}.`,
          response.status === 401 || response.status === 403
            ? "authentication-failed"
            : response.status === 404
              ? "protocol-mismatch"
              : "chat-request-failed",
          { protocol: this.protocol, statusCode: response.status },
        ).message,
      };
      return;
    }

    yield* readOpenAiStream(response);
  }
}
