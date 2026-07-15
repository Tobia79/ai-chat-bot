import { describe, expect, it } from "vitest";
import { parseSseChunk } from "@/lib/sse";

describe("parseSseChunk", () => {
  it("解析 delta / error / done", () => {
    const raw =
      'event: delta\ndata: {"content":"你好"}\n\n' +
      'event: error\ndata: {"message":"上游失败","code":"UPSTREAM"}\n\n' +
      'event: done\ndata: {"finishReason":"error"}\n\n';
    const { events, rest } = parseSseChunk(raw);
    expect(rest).toBe("");
    expect(events).toHaveLength(3);
    expect(events[0]).toEqual({
      event: "delta",
      data: { content: "你好" },
    });
    expect(events[1].event).toBe("error");
    expect(events[2]).toEqual({
      event: "done",
      data: { finishReason: "error" },
    });
  });

  it("不完整块留在 rest", () => {
    const { events, rest } = parseSseChunk(
      'event: delta\ndata: {"content":"a"'
    );
    expect(events).toHaveLength(0);
    expect(rest).toContain("event: delta");
  });
});
