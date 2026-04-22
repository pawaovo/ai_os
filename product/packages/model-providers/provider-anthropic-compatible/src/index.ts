import type { ChatRequest, ChatStreamEvent, ConversationMessage } from "@ai-os/conversation-core";
import type {
  ModelInfo,
  ModelProvider,
  ModelProviderRequest,
  ProviderStatus,
} from "@ai-os/provider-protocol";
import type { ProviderId } from "@ai-os/kernel-objects";
import { ModelProviderError as ProviderError } from "@ai-os/provider-protocol";

type AnthropicMessage = {
  role: "user" | "assistant";
  content: string;
};

type AnthropicModelListResponse = {
  data?: Array<{ id?: string; display_name?: string }>;
};

type AnthropicStreamEvent = {
  type?: string;
  delta?: {
    text?: string;
  };
};

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function collectSystem(messages: ConversationMessage[]): string | undefined {
  const content = messages
    .filter((message) => message.role === "system")
    .map(messageToText)
    .filter(Boolean)
    .join("\n\n");
  return content || undefined;
}

function messageToText(message: ConversationMessage): string {
  return message.parts
    .map((part) => part.text ?? part.ref ?? "")
    .filter(Boolean)
    .join("\n");
}

function messageToAnthropic(message: ConversationMessage): AnthropicMessage | undefined {
  if (message.role !== "user" && message.role !== "assistant") return undefined;
  return {
    role: message.role,
    content: messageToText(message),
  };
}

function parseSseDataLine(line: string): string | undefined {
  if (!line.startsWith("data:")) return undefined;
  const value = line.slice("data:".length).trim();
  return value || undefined;
}

function parseAnthropicEvent(data: string): ChatStreamEvent | undefined {
  const event = JSON.parse(data) as AnthropicStreamEvent;
  const delta = event.delta?.text;
  return event.type === "content_block_delta" && delta ? { type: "text.delta", delta } : undefined;
}

async function* readAnthropicStream(response: Response): AsyncIterable<ChatStreamEvent> {
  if (!response.body) {
    yield {
      type: "error",
      message: new ProviderError(
        "Anthropic-compatible provider returned an empty stream body.",
        "empty-response-body",
        { protocol: "anthropic-compatible" },
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
        const event = parseAnthropicEvent(data);
        if (event) yield event;
      } catch {
        yield {
          type: "error",
          message: new ProviderError(
            "Failed to parse Anthropic-compatible stream chunk.",
            "stream-parse-failed",
            { protocol: "anthropic-compatible" },
          ).message,
        };
      }
    }
  }

  const data = parseSseDataLine(buffer);
  if (data) {
    try {
      const event = parseAnthropicEvent(data);
      if (event) yield event;
    } catch {
      yield {
        type: "error",
        message: new ProviderError(
          "Failed to parse Anthropic-compatible stream chunk.",
          "stream-parse-failed",
          { protocol: "anthropic-compatible" },
        ).message,
      };
    }
  }
}

export class AnthropicCompatibleProvider implements ModelProvider {
  readonly protocol = "anthropic-compatible" as const;

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
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
      });
    } catch (error) {
      throw new ProviderError(
        error instanceof Error ? error.message : "Anthropic-compatible models request failed.",
        "network-error",
        { protocol: this.protocol },
      );
    }

    if (!response.ok) {
      throw new ProviderError(
        `Anthropic-compatible models request failed with HTTP ${response.status}.`,
        response.status === 401 || response.status === 403
          ? "authentication-failed"
          : response.status === 404
            ? "protocol-mismatch"
            : "models-request-failed",
        { protocol: this.protocol, statusCode: response.status },
      );
    }

    const payload = (await response.json()) as AnthropicModelListResponse;
    return (payload.data ?? []).flatMap((model) => {
      if (!model.id) return [];
      return [
        {
          id: model.id,
          ...(model.display_name ? { displayName: model.display_name } : {}),
          supportsTools: true,
          supportsVision: false,
          supportsReasoning: true,
        },
      ];
    });
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
      response = await runtime.fetch(`${trimTrailingSlash(config.baseUrl)}/messages`, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: chat.modelId,
          system: collectSystem(chat.messages),
          messages: chat.messages.map(messageToAnthropic).filter((message): message is AnthropicMessage => Boolean(message)),
          max_tokens: 4096,
          stream: true,
        }),
      });
    } catch (error) {
      yield {
        type: "error",
        message: new ProviderError(
          error instanceof Error ? error.message : "Anthropic-compatible chat request failed.",
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
          `Anthropic-compatible chat request failed with HTTP ${response.status}.`,
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

    yield* readAnthropicStream(response);
  }
}
