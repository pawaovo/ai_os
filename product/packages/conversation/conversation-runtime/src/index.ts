import type { ChatRequest, ChatStreamEvent } from "@ai-os/conversation-core";
import type { ModelProviderConfig, ProviderRuntime } from "@ai-os/provider-protocol";

export interface ConversationProviderRouter {
  streamChat(
    config: ModelProviderConfig,
    runtime: ProviderRuntime,
    chat: ChatRequest,
  ): AsyncIterable<ChatStreamEvent>;
}

export interface StreamConversationInput {
  registry: ConversationProviderRouter;
  providerConfig: ModelProviderConfig;
  providerRuntime: ProviderRuntime;
  chatRequest: ChatRequest;
}

export function streamConversation(input: StreamConversationInput): AsyncIterable<ChatStreamEvent> {
  return input.registry.streamChat(input.providerConfig, input.providerRuntime, input.chatRequest);
}
