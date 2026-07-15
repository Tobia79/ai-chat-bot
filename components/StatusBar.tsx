"use client";

import type { MessageStatus } from "@/lib/types";

const LABELS: Record<MessageStatus | "idle", string> = {
  idle: "就绪",
  pending: "等待中",
  streaming: "生成中",
  completed: "完成",
  failed: "失败",
  cancelled: "已取消",
};

type Props = {
  status: MessageStatus | "idle";
  modeLabel?: string;
  hint?: string | null;
  canStop?: boolean;
  onStop?: () => void;
};

export function StatusBar({
  status,
  modeLabel,
  hint,
  canStop,
  onStop,
}: Props) {
  const busy = status === "pending" || status === "streaming";
  const pillClass = [
    "status-pill",
    busy ? "is-busy" : "",
    status === "failed" ? "is-failed" : "",
    status === "cancelled" ? "is-cancelled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="status-bar" role="status" aria-live="polite">
      <span className={pillClass}>
        <span className="dot" aria-hidden="true" />
        {LABELS[status]}
      </span>
      {modeLabel ? <span className="mode-chip">模式 · {modeLabel}</span> : null}
      {hint ? <span className="status-hint">{hint}</span> : null}
      {canStop ? (
        <div className="status-bar-actions">
          <button
            type="button"
            className="btn-danger"
            onClick={onStop}
            aria-label="停止当前生成"
          >
            停止生成
          </button>
        </div>
      ) : null}
    </div>
  );
}
