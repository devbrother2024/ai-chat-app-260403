import type { Chat, Message } from "@/types/chat";
import { getSupabase } from "./supabase";

interface ChatRow {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
}

interface MessageRow {
  id: string;
  chat_id: string;
  role: string;
  content: string;
  created_at: number;
  tool_calls: unknown;
}

function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    role: row.role as "user" | "model",
    content: row.content,
    createdAt: row.created_at,
    toolCalls: (row.tool_calls as Message["toolCalls"]) ?? undefined,
  };
}

function toChat(row: ChatRow, messages: Message[]): Chat {
  return {
    id: row.id,
    title: row.title,
    messages,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadChats(): Promise<Chat[]> {
  const supabase = getSupabase();

  const { data: chatRows, error: chatErr } = await supabase
    .from("chats")
    .select("*")
    .order("updated_at", { ascending: false });

  if (chatErr || !chatRows || chatRows.length === 0) return [];

  const chatIds = (chatRows as ChatRow[]).map((c) => c.id);
  const { data: msgRows } = await supabase
    .from("messages")
    .select("*")
    .in("chat_id", chatIds)
    .order("created_at", { ascending: true });

  const msgMap = new Map<string, Message[]>();
  for (const row of (msgRows ?? []) as MessageRow[]) {
    const msgs = msgMap.get(row.chat_id) ?? [];
    msgs.push(toMessage(row));
    msgMap.set(row.chat_id, msgs);
  }

  return (chatRows as ChatRow[]).map((cr) =>
    toChat(cr, msgMap.get(cr.id) ?? []),
  );
}

export async function saveChat(chat: Chat): Promise<void> {
  const supabase = getSupabase();

  await supabase.from("chats").upsert({
    id: chat.id,
    title: chat.title,
    created_at: chat.createdAt,
    updated_at: chat.updatedAt,
  });

  if (chat.messages.length > 0) {
    const msgRows: MessageRow[] = chat.messages.map((m) => ({
      id: m.id,
      chat_id: chat.id,
      role: m.role,
      content: m.content,
      created_at: m.createdAt,
      tool_calls: m.toolCalls ?? null,
    }));
    await supabase.from("messages").upsert(msgRows);
  }
}

export async function deleteChatById(chatId: string): Promise<void> {
  const supabase = getSupabase();
  await supabase.from("chats").delete().eq("id", chatId);
}
