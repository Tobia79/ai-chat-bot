import { z } from "zod";
import { getServerConfig } from "@/server/config";
import { createMockProvider } from "@/server/llm/mock";
import { createOpenAiCompatibleProvider } from "@/server/llm/openai-compatible";

export const runtime = "nodejs";

const bodySchema = z.object({
  conversationId: z.string().min(1),
  messageId: z.string().min(1),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
      })
    )
    .min(1),
});

function sseEncode(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: Request) {
  const config = getServerConfig();

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json(
      { message: "请求体不是合法 JSON", code: "UNKNOWN" },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { message: "请求参数无效：请检查 conversationId、messageId 与 messages", code: "UNKNOWN" },
      { status: 400 }
    );
  }

  const { conversationId, messageId, messages } = parsed.data;
  const last = messages[messages.length - 1];
  if (last.role !== "user") {
    return Response.json(
      { message: "messages 最后一条必须是 user", code: "UNKNOWN" },
      { status: 400 }
    );
  }

  if (config.mode === "unconfigured") {
    return Response.json(
      {
        message: "未配置模型密钥，请设置 LLM_API_KEY 或将 MOCK_LLM=true",
        code: "CONFIG",
      },
      { status: 503 }
    );
  }

  const provider =
    config.mode === "mock"
      ? createMockProvider()
      : createOpenAiCompatibleProvider({
          apiKey: config.apiKey!,
          baseUrl: config.baseUrl,
          model: config.model,
        });

  const encoder = new TextEncoder();
  const signal = req.signal;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(sseEncode(event, data)));
      };

      try {
        send("meta", {
          conversationId,
          messageId,
          mode: config.mode,
        });

        for await (const chunk of provider.streamChat({
          messages,
          signal,
        })) {
          if (signal.aborted) {
            send("done", { finishReason: "abort" });
            break;
          }
          if (chunk.type === "delta" && chunk.content) {
            send("delta", { content: chunk.content });
          } else if (chunk.type === "error") {
            send("error", {
              message: chunk.message ?? "未知错误",
              code: chunk.code ?? "UNKNOWN",
            });
          } else if (chunk.type === "done") {
            send("done", {
              finishReason: chunk.finishReason ?? "stop",
            });
          }
        }
      } catch (err) {
        if (!signal.aborted) {
          const message =
            err instanceof Error ? err.message : "服务端处理失败";
          send("error", { message, code: "UNKNOWN" });
          send("done", { finishReason: "error" });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
