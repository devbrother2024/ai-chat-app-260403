"use client";

import { useState, useRef, useEffect, memo } from "react";
import Link from "next/link";
import { Wrench, Settings, Check, Circle } from "lucide-react";
import type { ChatToolItem } from "@/hooks/useChatMcp";

interface McpToolToggleProps {
  availableTools: ChatToolItem[];
  enabledToolCount: number;
  onToggleTool: (serverId: string, toolName: string) => void;
  onToggleAll: (enabled: boolean) => void;
}

function McpToolToggleInner({
  availableTools,
  enabledToolCount,
  onToggleTool,
  onToggleAll,
}: McpToolToggleProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const serverGroups = availableTools.reduce<
    Record<string, ChatToolItem[]>
  >((acc, item) => {
    const key = `${item.serverId}::${item.serverName}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const allEnabled = enabledToolCount === availableTools.length;

  if (availableTools.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs hover:bg-foreground/10 transition-colors"
        aria-label="MCP 도구 관리"
        type="button"
      >
        <Wrench size={14} />
        <span className="hidden sm:inline">도구</span>
        {enabledToolCount > 0 && (
          <span className="rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 text-[10px] font-medium leading-none">
            {enabledToolCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-1 z-50 w-72 rounded-lg border border-foreground/10 bg-background shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-foreground/10 px-3 py-2">
            <span className="text-xs font-semibold">MCP 도구</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleAll(!allEnabled)}
                className="text-[10px] text-foreground/50 hover:text-foreground/80 transition-colors"
                type="button"
              >
                {allEnabled ? "전체 해제" : "전체 선택"}
              </button>
              <Link
                href="/settings/mcp"
                className="text-foreground/40 hover:text-foreground/70 transition-colors"
                onClick={() => setOpen(false)}
              >
                <Settings size={12} />
              </Link>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto p-1">
            {Object.entries(serverGroups).map(([key, tools]) => {
              const serverName = key.split("::")[1];
              return (
                <div key={key} className="mb-1 last:mb-0">
                  <div className="flex items-center gap-1.5 px-2 py-1">
                    <Circle
                      size={6}
                      className="fill-emerald-500 text-emerald-500"
                    />
                    <span className="text-[10px] font-medium text-foreground/50 uppercase tracking-wider">
                      {serverName}
                    </span>
                  </div>
                  {tools.map((item) => (
                    <button
                      key={`${item.serverId}-${item.tool.name}`}
                      onClick={() =>
                        onToggleTool(item.serverId, item.tool.name)
                      }
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-foreground/5 transition-colors"
                      type="button"
                    >
                      <div
                        className={`flex h-3.5 w-3.5 items-center justify-center rounded border flex-shrink-0 ${
                          item.enabled
                            ? "border-emerald-500 bg-emerald-500"
                            : "border-foreground/20"
                        }`}
                      >
                        {item.enabled && (
                          <Check size={9} className="text-white" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">
                          {item.tool.name}
                        </p>
                        {item.tool.description && (
                          <p className="text-[10px] text-foreground/40 truncate">
                            {item.tool.description}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export const McpToolToggle = memo(McpToolToggleInner);
