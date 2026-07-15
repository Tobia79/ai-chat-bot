import type { LlmProvider, LlmStreamParams, StreamChunk } from "./types";

const MOCK_REPLY =
  "这是 **Mock** 模式的流式回复。\n\n```ts\nconsole.log('hello');\n```\n\n你可以点击停止，或继续提问以验收多轮对话。";

export function createMockProvider(): LlmProvider {
  return {
    async *streamChat(params: LlmStreamParams): AsyncGenerator<StreamChunk> {
      const chars = [...MOCK_REPLY];
      for (const ch of chars) {
        if (params.signal?.aborted) {
          yield { type: "done", finishReason: "abort" };
          return;
        }
        yield { type: "delta", content: ch };
        await new Promise((r) => setTimeout(r, 12));
      }
      yield { type: "done", finishReason: "stop" };
    },
  };
}
