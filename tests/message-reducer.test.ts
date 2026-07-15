import { describe, expect, it } from "vitest";
import { messageReducer, buildContextMessages } from "@/lib/message-reducer";
import type { Message } from "@/lib/types";

function assistant(partial?: Partial<Message>): Message {
  return {
    id: "a1",
    conversationId: "c1",
    role: "assistant",
    content: "",
    status: "pending",
    error: null,
    createdAt: 1,
    ...partial,
  };
}

describe("messageReducer", () => {
  it("pending 追加内容后进入 streaming", () => {
    const m = messageReducer(assistant(), {
      type: "APPEND_CONTENT",
      chunk: "你",
    });
    expect(m.content).toBe("你");
    expect(m.status).toBe("streaming");
  });

  it("CANCEL 保留已有内容", () => {
    const m = messageReducer(assistant({ content: "半段", status: "streaming" }), {
      type: "CANCEL",
    });
    expect(m.status).toBe("cancelled");
    expect(m.content).toBe("半段");
  });

  it("START_RETRY 清空并回到 pending", () => {
    const m = messageReducer(
      assistant({ content: "旧", status: "failed", error: "失败了" }),
      { type: "START_RETRY" }
    );
    expect(m.status).toBe("pending");
    expect(m.content).toBe("");
    expect(m.error).toBeNull();
  });

  it("FAIL 写入错误信息", () => {
    const m = messageReducer(assistant({ status: "streaming" }), {
      type: "FAIL",
      error: "网络异常",
    });
    expect(m.status).toBe("failed");
    expect(m.error).toBe("网络异常");
  });
});

describe("buildContextMessages", () => {
  it("排除 failed/pending 并保留 cancelled", () => {
    const messages: Message[] = [
      {
        id: "u1",
        conversationId: "c1",
        role: "user",
        content: "你好",
        status: "completed",
        error: null,
        createdAt: 1,
      },
      {
        id: "a1",
        conversationId: "c1",
        role: "assistant",
        content: "嗨",
        status: "cancelled",
        error: null,
        createdAt: 2,
      },
      {
        id: "a2",
        conversationId: "c1",
        role: "assistant",
        content: "",
        status: "failed",
        error: "x",
        createdAt: 3,
      },
    ];
    const ctx = buildContextMessages(messages);
    expect(ctx).toEqual([
      { role: "user", content: "你好" },
      { role: "assistant", content: "嗨" },
    ]);
  });
});
