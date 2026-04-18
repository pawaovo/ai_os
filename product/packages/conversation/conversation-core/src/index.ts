import type { MessageId, ProviderId, ThreadId } from "@ai-os/kernel-objects";

export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessagePart {
  type: "text" | "file-ref" | "image-ref";
  text?: string;
  ref?: string;
}

export interface ConversationMessage {
  id: MessageId;
  role: ChatRole;
  parts: ChatMessagePart[];
}

export interface ConversationThread {
  id: ThreadId;
  title: string;
  messages: ConversationMessage[];
  providerId?: ProviderId;
  modelId?: string;
}

export interface ChatRequest {
  threadId: ThreadId;
  providerId: ProviderId;
  modelId: string;
  messages: ConversationMessage[];
}

export type ChatStreamEvent =
  | { type: "text.delta"; delta: string }
  | { type: "message.completed"; message: ConversationMessage }
  | { type: "error"; message: string };

