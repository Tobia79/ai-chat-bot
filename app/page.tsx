"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ConversationList } from "@/components/ConversationList";
import { Composer } from "@/components/Composer";
import { MessageList } from "@/components/MessageList";
import { StatusBar } from "@/components/StatusBar";
import {
  createEmptyConversation,
  loadPersistedState,
  savePersistedState,
} from "@/lib/conversation-store";
import { generationController } from "@/lib/generation-controller";
import { buildContextMessages, messageReducer } from "@/lib/message-reducer";
import { consumeChatSse } from "@/lib/sse";
import type { Conversation, Message, MessageStatus } from "@/lib/types";

function updateMessage(
  conversations: Conversation[],
  conversationId: string,
  messageId: string,
  updater: (m: Message) => Message
): Conversation[] {
  return conversations.map((c) => {
    if (c.id !== conversationId) return c;
    return {
      ...c,
      updatedAt: Date.now(),
      messages: c.messages.map((m) => (m.id === messageId ? updater(m) : m)),
    };
  });
}

export default function HomePage() {
  const [hydrated, setHydrated] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [busyHint, setBusyHint] = useState<string | null>(null);
  const [modeLabel, setModeLabel] = useState<string>("…");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const saved = loadPersistedState();
    if (saved && saved.conversations.length > 0) {
      setConversations(saved.conversations);
      setCurrentId(
        saved.currentConversationId &&
          saved.conversations.some((c) => c.id === saved.currentConversationId)
          ? saved.currentConversationId
          : saved.conversations[0].id
      );
    } else {
      const first = createEmptyConversation();
      setConversations([first]);
      setCurrentId(first.id);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    savePersistedState({ conversations, currentConversationId: currentId });
  }, [conversations, currentId, hydrated]);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data: { mode?: string }) => {
        const map: Record<string, string> = {
          mock: "Mock",
          live: "真实模型",
          unconfigured: "未配置",
        };
        setModeLabel(map[data.mode ?? ""] ?? data.mode ?? "未知");
      })
      .catch(() => setModeLabel("不可达"));
  }, []);

  const current = useMemo(
    () => conversations.find((c) => c.id === currentId) ?? null,
    [conversations, currentId]
  );

  const uiStatus: MessageStatus | "idle" = useMemo(() => {
    if (!current) return "idle";
    const lastAssistant = [...current.messages]
      .reverse()
      .find((m) => m.role === "assistant");
    if (!lastAssistant) return "idle";
    if (
      lastAssistant.status === "pending" ||
      lastAssistant.status === "streaming"
    ) {
      return lastAssistant.status;
    }
    return lastAssistant.status === "completed" ? "idle" : lastAssistant.status;
  }, [current]);

  const runGeneration = useCallback(
    async (
      conversationId: string,
      assistantId: string,
      contextMessages: { role: "user" | "assistant"; content: string }[]
    ) => {
      const block = generationController.tryStart(conversationId, assistantId);
      if (block) {
        setBusyHint(block);
        return;
      }
      setBusyHint(null);
      setGenerating(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            conversationId,
            messageId: assistantId,
            messages: contextMessages,
          }),
          signal: generationController.getSignal(),
        });

        if (!res.ok) {
          const errBody = (await res.json().catch(() => null)) as {
            message?: string;
          } | null;
          const msg =
            errBody?.message ?? `请求失败（HTTP ${res.status}）`;
          setConversations((prev) =>
            updateMessage(prev, conversationId, assistantId, (m) =>
              messageReducer(m, { type: "FAIL", error: msg })
            )
          );
          return;
        }

        let sawError = false;
        await consumeChatSse(
          res,
          {
            onDelta: (chunk) => {
              setConversations((prev) =>
                updateMessage(prev, conversationId, assistantId, (m) =>
                  messageReducer(m, { type: "APPEND_CONTENT", chunk })
                )
              );
            },
            onError: ({ message }) => {
              sawError = true;
              setConversations((prev) =>
                updateMessage(prev, conversationId, assistantId, (m) =>
                  messageReducer(m, { type: "FAIL", error: message })
                )
              );
            },
            onDone: ({ finishReason }) => {
              if (finishReason === "abort") {
                setConversations((prev) =>
                  updateMessage(prev, conversationId, assistantId, (m) =>
                    messageReducer(m, { type: "CANCEL" })
                  )
                );
              } else if (finishReason === "stop" && !sawError) {
                setConversations((prev) =>
                  updateMessage(prev, conversationId, assistantId, (m) =>
                    messageReducer(m, { type: "SET_STATUS", status: "completed" })
                  )
                );
              }
            },
          },
          generationController.getSignal()
        );

        // 用户 abort 时 connect 可能直接断，确保 cancelled
        if (generationController.getSignal()?.aborted) {
          setConversations((prev) =>
            updateMessage(prev, conversationId, assistantId, (m) =>
              m.status === "cancelled"
                ? m
                : messageReducer(m, { type: "CANCEL" })
            )
          );
        }
      } catch (err) {
        if (generationController.getSignal()?.aborted) {
          setConversations((prev) =>
            updateMessage(prev, conversationId, assistantId, (m) =>
              messageReducer(m, { type: "CANCEL" })
            )
          );
        } else {
          const msg =
            err instanceof Error ? err.message : "网络异常，请稍后重试";
          setConversations((prev) =>
            updateMessage(prev, conversationId, assistantId, (m) =>
              messageReducer(m, { type: "FAIL", error: msg })
            )
          );
        }
      } finally {
        generationController.clearIfMatch(conversationId, assistantId);
        setGenerating(false);
      }
    },
    []
  );

  const handleSend = useCallback(
    (text: string) => {
      if (!currentId || !current) return;
      if (generationController.isBusy()) {
        setBusyHint(
          "当前已有生成任务进行中，请等待结束或先点击停止后再发送"
        );
        return;
      }

      const now = Date.now();
      const userMsg: Message = {
        id: crypto.randomUUID(),
        conversationId: currentId,
        role: "user",
        content: text,
        status: "completed",
        error: null,
        createdAt: now,
      };
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        conversationId: currentId,
        role: "assistant",
        content: "",
        status: "pending",
        error: null,
        createdAt: now + 1,
      };

      const title =
        current.messages.length === 0
          ? text.slice(0, 24) || "新会话"
          : current.title;

      const nextConvs = conversations.map((c) => {
        if (c.id !== currentId) return c;
        return {
          ...c,
          title,
          updatedAt: now,
          messages: [...c.messages, userMsg, assistantMsg],
        };
      });
      setConversations(nextConvs);

      const ctx = buildContextMessages(
        [...current.messages, userMsg],
        { limit: 40 }
      );
      void runGeneration(currentId, assistantMsg.id, ctx);
    },
    [current, currentId, conversations, runGeneration]
  );

  const handleStop = useCallback(() => {
    generationController.abort();
  }, []);

  const handleRetry = useCallback(
    (assistantId: string) => {
      if (!currentId || !current) return;
      if (generationController.isBusy()) {
        setBusyHint(
          "当前已有生成任务进行中，请等待结束或先点击停止后再发送"
        );
        return;
      }

      const assistant = current.messages.find((m) => m.id === assistantId);
      if (!assistant || assistant.role !== "assistant") return;

      setConversations((prev) =>
        updateMessage(prev, currentId, assistantId, (m) =>
          messageReducer(m, { type: "START_RETRY" })
        )
      );

      const ctx = buildContextMessages(current.messages, {
        limit: 40,
        excludeMessageId: assistantId,
      });
      void runGeneration(currentId, assistantId, ctx);
    },
    [current, currentId, runGeneration]
  );

  const handleCreate = () => {
    const c = createEmptyConversation();
    setConversations((prev) => [c, ...prev]);
    setCurrentId(c.id);
    setBusyHint(null);
  };

  const handleDelete = (id: string) => {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (next.length === 0) {
        const empty = createEmptyConversation();
        setCurrentId(empty.id);
        return [empty];
      }
      if (currentId === id) {
        setCurrentId(next[0].id);
      }
      return next;
    });
  };

  if (!hydrated) {
    return (
      <main className="loading-shell" aria-busy="true" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        <p className="muted">正在加载会话…</p>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <h1>AI Chat Web</h1>
          <p className="muted">流式对话工作台 · 本地会话持久化</p>
        </div>
      </header>
      <div className="workspace">
        <ConversationList
          conversations={conversations}
          currentId={currentId}
          onSelect={(id) => {
            setCurrentId(id);
            setBusyHint(null);
          }}
          onCreate={handleCreate}
          onDelete={handleDelete}
        />
        <section className="chat-panel" aria-label="当前对话">
          <StatusBar
            status={
              generating
                ? uiStatus === "idle"
                  ? "streaming"
                  : uiStatus
                : uiStatus
            }
            modeLabel={modeLabel}
            hint={busyHint}
            canStop={generating}
            onStop={handleStop}
          />
          <MessageList
            key={currentId ?? "empty"}
            messages={current?.messages ?? []}
            onRetry={handleRetry}
          />
          <Composer
            disabled={false}
            busyHint={busyHint}
            onSend={handleSend}
          />
        </section>
      </div>
    </main>
  );
}
