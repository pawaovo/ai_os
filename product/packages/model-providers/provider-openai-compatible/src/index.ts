import type { ChatRequest, ChatStreamEvent, ConversationMessage } from "@ai-os/conversation-core";
import type {
  ModelInfo,
  ModelProvider,
  ModelProviderRequest,
  ProviderStatus,
} from "@ai-os/provider-protocol";
import type { ProviderId } from "@ai-os/kernel-objects";

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
    yield { type: "error", message: "OpenAI-compatible provider returned an empty stream body." };
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
        yield { type: "error", message: "Failed to parse OpenAI-compatible stream chunk." };
      }
    }
  }

  const data = parseSseDataLine(buffer);
  if (data) {
    try {
      const event = parseOpenAiChunk(data);
      if (event) yield event;
    } catch {
      yield { type: "error", message: "Failed to parse OpenAI-compatible stream chunk." };
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
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`OpenAI-compatible models request failed with HTTP ${response.status}.`);
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
    const apiKey = await runtime.resolveSecret(config.apiKeyRef);
    const response = await runtime.fetch(`${trimTrailingSlash(config.baseUrl)}/chat/completions`, {
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

    if (!response.ok) {
      yield {
        type: "error",
        message: `OpenAI-compatible chat request failed with HTTP ${response.status}.`,
      };
      return;
    }

    yield* readOpenAiStream(response);
  }
}
