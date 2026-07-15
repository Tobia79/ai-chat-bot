"use client";

import type { Message } from "@/lib/types";
import { MarkdownView } from "@/lib/markdown";

const STATUS_LABEL: Record<string, string> = {
  pending: "等待中",
  streaming: "生成中",
  completed: "完成",
  failed: "失败",
  cancelled: "已取消",
};

type Props = {
  message: Message;
  onRetry?: (messageId: string) => void;
};

export function MessageBubble({ message, onRetry }: Props) {
  const isUser = message.role === "user";
  const streaming = message.status === "streaming";
  const pending = message.status === "pending";

  return (
    <article
      className={[
        "bubble",
        isUser ? "user" : "assistant",
        streaming || pending ? "is-streaming" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={isUser ? "你的消息" : `助手消息，${STATUS_LABEL[message.status]}`}
    >
      <div className="bubble-meta">
        <span className="role-badge">{isUser ? "你" : "助手"}</span>
        {!isUser ? (
          <span className={`status status-${message.status}`}>
            {STATUS_LABEL[message.status] ?? message.status}
          </span>
        ) : null}
      </div>
      <div className={`bubble-body${streaming ? " streaming-caret" : ""}`}>
        {isUser ? (
          <pre className="plain">{message.content}</pre>
        ) : message.content ? (
          <MarkdownView content={message.content} />
        ) : (
          <span className="muted">
            {pending ? "正在等待回复…" : "（无内容）"}
          </span>
        )}
      </div>
      {message.status === "failed" ? (
        <div className="bubble-error" role="alert">
          <p>{message.error ?? "请求失败，可点击重试"}</p>
          {onRetry ? (
            <button
              type="button"
              className="btn"
              onClick={() => onRetry(message.id)}
            >
              重试
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
