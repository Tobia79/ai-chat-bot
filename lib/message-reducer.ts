import type { Message, MessageStatus } from "./types";

export type MessageAction =
  | { type: "SET_STATUS"; status: MessageStatus }
  | { type: "APPEND_CONTENT"; chunk: string }
  | { type: "SET_CONTENT"; content: string }
  | { type: "FAIL"; error: string }
  | { type: "CANCEL" }
  | { type: "START_RETRY" };

export function messageReducer(message: Message, action: MessageAction): Message {
  switch (action.type) {
    case "SET_STATUS":
      return { ...message, status: action.status };
    case "APPEND_CONTENT":
      return {
        ...message,
        content: message.content + action.chunk,
        status: message.status === "pending" ? "streaming" : message.status,
      };
    case "SET_CONTENT":
      return { ...message, content: action.content };
    case "FAIL":
      return {
        ...message,
        status: "failed",
        error: action.error,
      };
    case "CANCEL":
      return {
        ...message,
        status: "cancelled",
        error: null,
      };
    case "START_RETRY":
      return {
        ...message,
        content: "",
        error: null,
        status: "pending",
      };
    default:
      return message;
  }
}

/** 构建发给模型的上下文（最近 N 条） */
export function buildContextMessages(
  messages: Message[],
  options?: { limit?: number; excludeMessageId?: string }
): { role: "user" | "assistant"; content: string }[] {
  const limit = options?.limit ?? 40;
  const filtered = messages.filter((m) => {
    if (options?.excludeMessageId && m.id === options.excludeMessageId) {
      return false;
    }
    if (!m.content.trim()) return false;
    if (m.role === "user") return true;
    return m.status === "completed" || m.status === "cancelled";
  });
  return filtered.slice(-limit).map((m) => ({
    role: m.role,
    content: m.content,
  }));
}
