export type SseEventName = "meta" | "delta" | "error" | "done";

export interface SseEvent {
  event: SseEventName | string;
  data: unknown;
}

/** 解析单个 SSE 文本块（可累积缓冲） */
export function parseSseChunk(
  buffer: string
): { events: SseEvent[]; rest: string } {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  const events: SseEvent[] = [];

  for (const block of parts) {
    if (!block.trim()) continue;
    let eventName = "message";
    const dataLines: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim());
      }
    }
    const raw = dataLines.join("\n");
    let data: unknown = raw;
    try {
      data = JSON.parse(raw);
    } catch {
      // 保留原文
    }
    events.push({ event: eventName, data });
  }

  return { events, rest };
}

export type ChatStreamHandlers = {
  onMeta?: (data: {
    conversationId: string;
    messageId: string;
    mode: string;
  }) => void;
  onDelta?: (content: string) => void;
  onError?: (data: { message: string; code?: string }) => void;
  onDone?: (data: { finishReason: string }) => void;
};

export async function consumeChatSse(
  response: Response,
  handlers: ChatStreamHandlers,
  signal?: AbortSignal
): Promise<void> {
  if (!response.body) {
    handlers.onError?.({ message: "响应缺少正文", code: "UNKNOWN" });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const { events, rest } = parseSseChunk(buffer);
      buffer = rest;
      for (const ev of events) {
        const data = ev.data as Record<string, unknown>;
        if (ev.event === "meta") {
          handlers.onMeta?.(data as {
            conversationId: string;
            messageId: string;
            mode: string;
          });
        } else if (ev.event === "delta") {
          const content = typeof data.content === "string" ? data.content : "";
          if (content) handlers.onDelta?.(content);
        } else if (ev.event === "error") {
          handlers.onError?.({
            message: String(data.message ?? "未知错误"),
            code: data.code ? String(data.code) : undefined,
          });
        } else if (ev.event === "done") {
          handlers.onDone?.({
            finishReason: String(data.finishReason ?? "stop"),
          });
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
