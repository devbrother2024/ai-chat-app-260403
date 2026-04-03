"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import {
  Send,
  Square,
  Plus,
  MessageSquare,
  Trash2,
  Bot,
  User,
  Sun,
  Moon,
} from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { useTheme } from "@/hooks/useTheme";
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";

export default function Home() {
  const {
    chats,
    activeChatId,
    messages,
    isStreaming,
    error,
    setActiveChatId,
    createChat,
    deleteChat,
    sendMessage,
    stopStreaming,
  } = useChat();

  const { theme, toggleTheme } = useTheme();
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isStreaming && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isStreaming]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } flex-shrink-0 border-r border-foreground/10 bg-foreground/[0.02] transition-all duration-200 overflow-hidden`}
      >
        <div className="flex h-full w-64 flex-col">
          <div className="flex items-center justify-between p-3 border-b border-foreground/10">
            <h2 className="text-sm font-semibold tracking-tight">채팅 목록</h2>
            <button
              onClick={createChat}
              className="rounded-lg p-1.5 hover:bg-foreground/10 transition-colors"
              aria-label="새 채팅"
            >
              <Plus size={18} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            {chats.length === 0 && (
              <p className="text-xs text-foreground/40 text-center mt-8">
                채팅이 없습니다
              </p>
            )}
            {chats.map((chat) => (
              <div
                key={chat.id}
                className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                  chat.id === activeChatId
                    ? "bg-foreground/10 font-medium"
                    : "hover:bg-foreground/5"
                }`}
                onClick={() => setActiveChatId(chat.id)}
              >
                <MessageSquare size={14} className="flex-shrink-0 opacity-50" />
                <span className="truncate flex-1">{chat.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(chat.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 rounded p-0.5 hover:bg-foreground/10 transition-opacity"
                  aria-label="채팅 삭제"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-foreground/10 px-4 py-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-1.5 hover:bg-foreground/10 transition-colors"
            aria-label="사이드바 토글"
          >
            <MessageSquare size={18} />
          </button>
          <h1 className="text-sm font-semibold">AI Chat</h1>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-foreground/40">
              gemini-2.5-flash-lite
            </span>
            <button
              onClick={toggleTheme}
              className="rounded-lg p-1.5 hover:bg-foreground/10 transition-colors"
              aria-label="테마 전환"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-foreground/30">
              <Bot size={48} strokeWidth={1.5} />
              <p className="text-lg font-medium">무엇을 도와드릴까요?</p>
              <p className="text-sm">메시지를 입력해 대화를 시작하세요</p>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className="flex gap-3">
                  <div
                    className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-foreground/10"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <User size={14} />
                    ) : (
                      <Bot size={14} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground/50 mb-1">
                      {msg.role === "user" ? "나" : "AI"}
                    </p>
                    {msg.role === "user" ? (
                      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {msg.content}
                      </div>
                    ) : (
                      <div className="break-words">
                        <MarkdownRenderer content={msg.content} />
                        {isStreaming &&
                          msg.id === messages[messages.length - 1]?.id && (
                            <span className="inline-block w-1.5 h-4 bg-foreground/60 animate-pulse ml-0.5 align-text-bottom" />
                          )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-auto max-w-3xl w-full px-4">
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-foreground/10 p-4">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-end gap-2 rounded-xl border border-foreground/15 bg-foreground/[0.02] px-4 py-3 focus-within:border-foreground/30 transition-colors">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder="메시지를 입력하세요..."
                rows={1}
                disabled={isStreaming}
                className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-foreground/30 disabled:opacity-50 max-h-[200px]"
              />
              {isStreaming ? (
                <button
                  onClick={stopStreaming}
                  className="flex-shrink-0 rounded-lg bg-foreground/10 p-2 hover:bg-foreground/20 transition-colors"
                  aria-label="생성 중지"
                >
                  <Square size={16} />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="flex-shrink-0 rounded-lg bg-foreground text-background p-2 hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="메시지 전송"
                >
                  <Send size={16} />
                </button>
              )}
            </div>
            <p className="text-[11px] text-foreground/30 text-center mt-2">
              AI는 부정확한 정보를 생성할 수 있습니다. 중요한 정보는 직접
              확인하세요.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
