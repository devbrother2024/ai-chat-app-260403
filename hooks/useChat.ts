"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { Message, Chat, SSEChunk, ToolCallInfo } from "@/types/chat";
import { loadChats, saveChats } from "@/lib/storage";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function extractTitle(content: string): string {
  const trimmed = content.trim().slice(0, 30);
  return trimmed.length < content.trim().length ? `${trimmed}...` : trimmed;
}

export function useChat() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const saved = loadChats();
    setChats(saved);
    if (saved.length > 0) {
      setActiveChatId(saved[0].id);
    }
  }, []);

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;
  const messages = activeChat?.messages ?? [];

  const persistChats = useCallback((next: Chat[]) => {
    setChats(next);
    saveChats(next);
  }, []);

  const createChat = useCallback(() => {
    const newChat: Chat = {
      id: generateId(),
      title: "새 채팅",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const next = [newChat, ...chats];
    persistChats(next);
    setActiveChatId(newChat.id);
    setError(null);
    return newChat.id;
  }, [chats, persistChats]);

  const deleteChat = useCallback(
    (chatId: string) => {
      const next = chats.filter((c) => c.id !== chatId);
      persistChats(next);
      if (activeChatId === chatId) {
        setActiveChatId(next.length > 0 ? next[0].id : null);
      }
    },
    [chats, activeChatId, persistChats],
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(
    async (content: string, mcpServerIds?: string[]) => {
      if (!content.trim() || isStreaming) return;

      setError(null);

      let chatId = activeChatId;
      let currentChats = chats;

      if (!chatId) {
        const newChat: Chat = {
          id: generateId(),
          title: extractTitle(content),
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        chatId = newChat.id;
        currentChats = [newChat, ...currentChats];
        setActiveChatId(chatId);
      }

      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content: content.trim(),
        createdAt: Date.now(),
      };

      const assistantMessage: Message = {
        id: generateId(),
        role: "model",
        content: "",
        createdAt: Date.now(),
      };

      const updateChat = (
        list: Chat[],
        id: string,
        msgs: Message[],
      ): Chat[] =>
        list.map((c) =>
          c.id === id
            ? {
                ...c,
                messages: msgs,
                title:
                  c.messages.length === 0 ? extractTitle(content) : c.title,
                updatedAt: Date.now(),
              }
            : c,
        );

      const withUser = updateChat(currentChats, chatId, [
        ...(currentChats.find((c) => c.id === chatId)?.messages ?? []),
        userMessage,
      ]);
      persistChats(withUser);

      const allMessages = withUser
        .find((c) => c.id === chatId)!
        .messages.map((m) => ({
          role: m.role as "user" | "model",
          parts: [{ text: m.content }],
        }));

      const history = allMessages.slice(0, -1);
      const message = allMessages.at(-1)!.parts[0].text;

      setIsStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const body: Record<string, unknown> = { history, message };
        if (mcpServerIds && mcpServerIds.length > 0) {
          body.mcpServerIds = mcpServerIds;
        }

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => null);
          throw new Error(
            errBody?.error ?? `서버 오류 (${response.status})`,
          );
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("응답 스트림을 읽을 수 없습니다.");

        const decoder = new TextDecoder();
        let accumulated = "";
        let buffer = "";
        const toolCalls: ToolCallInfo[] = [];
        let pendingToolCallName: string | null = null;

        const currentMessages = withUser.find(
          (c) => c.id === chatId,
        )!.messages;

        const updateAssistant = () => {
          const updatedAssistant: Message = {
            ...assistantMessage,
            content: accumulated,
            toolCalls: toolCalls.length > 0 ? [...toolCalls] : undefined,
          };
          const next = updateChat(currentChats, chatId!, [
            ...currentMessages,
            updatedAssistant,
          ]);
          setChats(next);
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;

            const data = trimmed.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed: SSEChunk = JSON.parse(data);

              if (parsed.type === "error" || parsed.error) {
                throw new Error(parsed.error ?? "알 수 없는 오류");
              }

              if (parsed.type === "tool_call_start" && parsed.toolCall) {
                pendingToolCallName = parsed.toolCall.toolName;
                toolCalls.push({ ...parsed.toolCall });
                updateAssistant();
              } else if (
                parsed.type === "tool_call_result" &&
                parsed.toolCall
              ) {
                const idx = toolCalls.findIndex(
                  (tc) =>
                    tc.toolName === (pendingToolCallName ?? parsed.toolCall!.toolName) &&
                    tc.status === "calling",
                );
                if (idx !== -1) {
                  toolCalls[idx] = {
                    ...toolCalls[idx],
                    status: parsed.toolCall.status,
                    result: parsed.toolCall.result,
                    error: parsed.toolCall.error,
                    completedAt: parsed.toolCall.completedAt ?? Date.now(),
                  };
                } else {
                  toolCalls.push({ ...parsed.toolCall });
                }
                pendingToolCallName = null;
                updateAssistant();
              } else if (
                parsed.type === "text" ||
                (!parsed.type && parsed.content)
              ) {
                if (parsed.content) {
                  accumulated += parsed.content;
                  updateAssistant();
                }
              }
            } catch (e) {
              if (e instanceof Error && e.message !== data) throw e;
            }
          }
        }

        const finalMessages: Message[] = [
          ...currentMessages,
          {
            ...assistantMessage,
            content: accumulated,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          },
        ];
        const finalChats = updateChat(currentChats, chatId!, finalMessages);
        persistChats(finalChats);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        const msg =
          err instanceof Error
            ? err.message
            : "알 수 없는 오류가 발생했습니다.";
        setError(msg);
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [activeChatId, chats, isStreaming, persistChats],
  );

  return {
    chats,
    activeChat,
    activeChatId,
    messages,
    isStreaming,
    error,
    setActiveChatId,
    createChat,
    deleteChat,
    sendMessage,
    stopStreaming,
  };
}
