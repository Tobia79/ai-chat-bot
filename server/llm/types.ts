export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface StreamChunk {
  type: "delta" | "error" | "done";
  content?: string;
  message?: string;
  code?: "CONFIG" | "UPSTREAM" | "ABORT" | "UNKNOWN";
  finishReason?: "stop" | "abort" | "error";
}

export interface LlmStreamParams {
  messages: ChatMessage[];
  signal?: AbortSignal;
}

export interface LlmProvider {
  streamChat(params: LlmStreamParams): AsyncGenerator<StreamChunk, void, unknown>;
}
