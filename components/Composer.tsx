"use client";

import { useId, useState } from "react";

type Props = {
  disabled?: boolean;
  busyHint?: string | null;
  onSend: (text: string) => void;
};

export function Composer({ disabled, busyHint, onSend }: Props) {
  const [value, setValue] = useState("");
  const fieldId = useId();
  const helpId = useId();
  const hintId = useId();

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
  };

  return (
    <div className="composer">
      <label className="composer-label" htmlFor={fieldId}>
        消息
      </label>
      {busyHint ? (
        <p id={hintId} className="hint warn" role="status">
          {busyHint}
        </p>
      ) : null}
      <textarea
        id={fieldId}
        value={value}
        disabled={disabled}
        placeholder="写下你的问题…"
        rows={3}
        aria-describedby={`${helpId}${busyHint ? ` ${hintId}` : ""}`}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <p id={helpId} className="composer-help">
        Enter 发送，Shift + Enter 换行。生成中请用顶部「停止生成」。
      </p>
      <div className="composer-actions">
        <button
          type="button"
          className="btn primary"
          disabled={disabled || !value.trim()}
          onClick={submit}
        >
          发送
        </button>
      </div>
    </div>
  );
}
