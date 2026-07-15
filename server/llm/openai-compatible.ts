import OpenAI from "openai";
import type { LlmProvider, LlmStreamParams, StreamChunk } from "./types";

export function createOpenAiCompatibleProvider(opts: {
  apiKey: string;
  baseUrl: string;
  model: string;
}): LlmProvider {
  const client = new OpenAI({
    apiKey: opts.apiKey,
    baseURL: opts.baseUrl,
  });

  return {
    async *streamChat(params: LlmStreamParams): AsyncGenerator<StreamChunk> {
      try {
        const stream = await client.chat.completions.create(
          {
            model: opts.model,
            messages: params.messages,
            stream: true,
          },
          { signal: params.signal }
        );

        for await (const part of stream) {
          if (params.signal?.aborted) {
            yield { type: "done", finishReason: "abort" };
            return;
          }
          const text = part.choices[0]?.delta?.content;
          if (text) {
            yield { type: "delta", content: text };
          }
        }
        yield { type: "done", finishReason: "stop" };
      } catch (err) {
        if (params.signal?.aborted) {
          yield { type: "done", finishReason: "abort" };
          return;
        }
        const message =
          err instanceof Error ? err.message : "上游模型调用失败";
        yield {
          type: "error",
          message: `模型调用失败：${message}`,
          code: "UPSTREAM",
        };
        yield { type: "done", finishReason: "error" };
      }
    },
  };
}
