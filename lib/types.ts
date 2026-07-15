export type MessageRole = "user" | "assistant";

export type MessageStatus =
  | "pending"
  | "streaming"
  | "completed"
  | "failed"
  | "cancelled";

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  error: string | null;
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
}

export interface Generation {
  conversationId: string;
  messageId: string;
  abortController: AbortController;
  startedAt: number;
}

export interface AppState {
  conversations: Conversation[];
  currentConversationId: string | null;
  generation: Generation | null;
}

export type RuntimeMode = "mock" | "live" | "unconfigured";
