import type { Generation } from "./types";

export class GenerationController {
  private current: Generation | null = null;

  get active(): Generation | null {
    return this.current;
  }

  isBusy(): boolean {
    return this.current !== null;
  }

  /** 若已有活动生成则返回错误文案；否则注册新生成 */
  tryStart(conversationId: string, messageId: string): string | null {
    if (this.current) {
      return "当前已有生成任务进行中，请等待结束或先点击停止后再发送";
    }
    this.current = {
      conversationId,
      messageId,
      abortController: new AbortController(),
      startedAt: Date.now(),
    };
    return null;
  }

  abort(): void {
    if (!this.current) return;
    this.current.abortController.abort();
  }

  clearIfMatch(conversationId: string, messageId: string): void {
    if (
      this.current &&
      this.current.conversationId === conversationId &&
      this.current.messageId === messageId
    ) {
      this.current = null;
    }
  }

  clear(): void {
    this.current = null;
  }

  getSignal(): AbortSignal | undefined {
    return this.current?.abortController.signal;
  }
}

export const generationController = new GenerationController();
