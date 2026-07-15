"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import type { Message } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";

type Props = {
  messages: Message[];
  onRetry?: (messageId: string) => void;
};

/** 距底部小于该值视为「贴底」，才自动跟随新内容 */
const STICK_THRESHOLD_PX = 96;

function isNearBottom(el: HTMLElement, threshold = STICK_THRESHOLD_PX): boolean {
  const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
  return distance <= threshold;
}

export function MessageList({ messages, onRetry }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  /** 用户是否处于贴底跟随模式；上翻查看历史时为 false */
  const stickToBottomRef = useRef(true);

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    stickToBottomRef.current = isNearBottom(el);
  }, []);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el || !stickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
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
      <div ref={endRef} />
    </div>
  );
}
