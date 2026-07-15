import type { Conversation } from "./types";

const STORAGE_KEY = "ai-chat-web:v1";

export interface PersistedState {
  version: 1;
  conversations: Conversation[];
  currentConversationId: string | null;
}

function downgradeInFlight(conversations: Conversation[]): Conversation[] {
  return conversations.map((c) => ({
    ...c,
    messages: c.messages.map((m) => {
      if (
        m.role === "assistant" &&
        (m.status === "pending" || m.status === "streaming")
      ) {
        return { ...m, status: "cancelled" as const, error: null };
      }
      return m;
    }),
  }));
}

export function loadPersistedState(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (parsed.version !== 1 || !Array.isArray(parsed.conversations)) {
      return null;
    }
    return {
      version: 1,
      conversations: downgradeInFlight(parsed.conversations),
      currentConversationId: parsed.currentConversationId,
    };
  } catch {
    return null;
  }
}

export function savePersistedState(state: {
  conversations: Conversation[];
  currentConversationId: string | null;
}): void {
  if (typeof window === "undefined") return;
  const payload: PersistedState = {
    version: 1,
    conversations: state.conversations,
    currentConversationId: state.currentConversationId,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function createEmptyConversation(): Conversation {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: "新会话",
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}
