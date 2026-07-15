"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import type { Message } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";

type Props = {
  messages: Message[];
  onRetry?: (messageId: string) => void;
};

const STICK_THRESHOLD_PX = 96;

function isNearBottom(el: HTMLElement, threshold = STICK_THRESHOLD_PX): boolean {
  const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
  return distance <= threshold;
}

export function MessageList({ messages, onRetry }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const rafRef = useRef<number | null>(null);
  /** 程序化滚动时忽略 scroll 事件，避免贴底判定被打乱 */
  const ignoreScrollRef = useRef(false);

  const handleScroll = useCallback(() => {
    if (ignoreScrollRef.current) return;
    const el = listRef.current;
    if (!el) return;
    stickToBottomRef.current = isNearBottom(el);
  }, []);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el || !stickToBottomRef.current) return;

    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const node = listRef.current;
      if (!node || !stickToBottomRef.current) return;
      ignoreScrollRef.current = true;
      node.scrollTop = node.scrollHeight;
      // 下一帧再恢复，避免本次 scroll 事件误判为「离开底部」
      requestAnimationFrame(() => {
        ignoreScrollRef.current = false;
      });
    });

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [messages]);

  return (
    <div
      ref={listRef}
      className="message-list"
      aria-live="polite"
      onScroll={handleScroll}
    >
      {messages.length === 0 ? (
        <div className="empty-state">
          <h3>开始一段对话</h3>
          <p>
            在下方输入问题并发送。助手回复会以流式方式逐字出现，生成中可随时停止。
          </p>
        </div>
      ) : (
        messages.map((m) => (
          <MessageBubble key={m.id} message={m} onRetry={onRetry} />
        ))
      )}
      <div />
    </div>
  );
}
