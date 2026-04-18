import type { ChatRequest, ChatStreamEvent, ConversationMessage } from "@ai-os/conversation-core";
import type {
  ModelInfo,
  ModelProvider,
  ModelProviderRequest,
  ProviderStatus,
} from "@ai-os/provider-protocol";
import type { ProviderId } from "@ai-os/kernel-objects";

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
    yield { type: "error", message: "Anthropic-compatible provider returned an empty stream body." };
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
        yield { type: "error", message: "Failed to parse Anthropic-compatible stream chunk." };
      }
    }
  }

  const data = parseSseDataLine(buffer);
  if (data) {
    try {
      const event = parseAnthropicEvent(data);
      if (event) yield event;
    } catch {
      yield { type: "error", message: "Failed to parse Anthropic-compatible stream chunk." };
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
      return {
        available: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async listModels({ config, runtime }: ModelProviderRequest): Promise<ModelInfo[]> {
    const apiKey = await runtime.resolveSecret(config.apiKeyRef);
    const response = await runtime.fetch(`${trimTrailingSlash(config.baseUrl)}/models`, {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
    });

    if (!response.ok) {
      throw new Error(`Anthropic-compatible models request failed with HTTP ${response.status}.`);
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
    const apiKey = await runtime.resolveSecret(config.apiKeyRef);
    const response = await runtime.fetch(`${trimTrailingSlash(config.baseUrl)}/messages`, {
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

    if (!response.ok) {
      yield {
        type: "error",
        message: `Anthropic-compatible chat request failed with HTTP ${response.status}.`,
      };
      return;
    }

    yield* readAnthropicStream(response);
  }
}
