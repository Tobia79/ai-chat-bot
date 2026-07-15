"use client";

import type { Conversation } from "@/lib/types";

type Props = {
  conversations: Conversation[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
};

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 3h6m-8 4h10m-1 0-.8 12.1a2 2 0 0 1-2 1.9H8.8a2 2 0 0 1-2-1.9L6 7m3.5 3.5.5 7m4-7-.5 7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ConversationList({
  conversations,
  currentId,
  onSelect,
  onCreate,
  onDelete,
}: Props) {
  return (
    <aside className="sidebar" aria-label="会话列表">
      <div className="sidebar-header">
        <h2 id="conv-heading">会话</h2>
        <button type="button" className="btn" onClick={onCreate}>
          新建会话
        </button>
      </div>
      <ul className="conv-list" aria-labelledby="conv-heading">
        {conversations.map((c) => {
          const active = c.id === currentId;
          return (
            <li
              key={c.id}
              className={active ? "conv-item active" : "conv-item"}
            >
              <button
                type="button"
                className="conv-title"
                onClick={() => onSelect(c.id)}
                aria-current={active ? "true" : undefined}
              >
                {c.title}
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={`删除会话 ${c.title}`}
                title="删除会话"
                onClick={() => {
                  const ok = window.confirm(`确定删除「${c.title}」吗？此操作不可撤销。`);
                  if (ok) onDelete(c.id);
                }}
              >
                <TrashIcon />
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
