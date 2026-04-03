import type { Chat } from "@/types/chat";

const STORAGE_KEY = "ai-chat-app:chats";

export function loadChats(): Chat[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Chat[];
  } catch {
    return [];
  }
}

export function saveChats(chats: Chat[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  } catch {
    /* quota exceeded — 조용히 실패 */
  }
}

export function deleteChat(chatId: string): Chat[] {
  const chats = loadChats().filter((c) => c.id !== chatId);
  saveChats(chats);
  return chats;
}
