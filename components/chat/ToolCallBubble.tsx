"use client";

import { useState, memo } from "react";
import {
  Wrench,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { ToolCallInfo } from "@/types/chat";

interface ToolCallBubbleProps {
  toolCall: ToolCallInfo;
}

function ToolCallBubbleInner({ toolCall }: ToolCallBubbleProps) {
  const [expanded, setExpanded] = useState(false);

  const statusConfig = {
    calling: {
      icon: <Loader2 size={14} className="animate-spin text-blue-500" />,
      border: "border-blue-500/20",
      bg: "bg-blue-500/5",
      label: "실행 중...",
    },
    success: {
      icon: <CheckCircle2 size={14} className="text-emerald-500" />,
      border: "border-emerald-500/20",
      bg: "bg-emerald-500/5",
      label: "완료",
    },
    error: {
      icon: <XCircle size={14} className="text-red-500" />,
      border: "border-red-500/20",
      bg: "bg-red-500/5",
      label: "오류",
    },
  };

  const config = statusConfig[toolCall.status];
  const duration =
    toolCall.completedAt && toolCall.startedAt
      ? ((toolCall.completedAt - toolCall.startedAt) / 1000).toFixed(1)
      : null;

  const hasDetails =
    Object.keys(toolCall.args).length > 0 ||
    toolCall.result ||
    toolCall.error;

  return (
    <div
      className={`my-2 rounded-lg border ${config.border} ${config.bg} text-xs`}
    >
      <button
        onClick={() => hasDetails && setExpanded(!expanded)}
        className={`flex w-full items-center gap-2 px-3 py-2 text-left ${
          hasDetails ? "cursor-pointer" : "cursor-default"
        }`}
        disabled={!hasDetails}
        type="button"
      >
        <Wrench size={13} className="text-foreground/50 flex-shrink-0" />
        <span className="font-medium truncate">{toolCall.toolName}</span>
        <span className="text-foreground/40 truncate">
          {toolCall.serverName}
        </span>
        <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
          {duration && (
            <span className="text-foreground/30">{duration}s</span>
          )}
          {config.icon}
          {hasDetails &&
            (expanded ? (
              <ChevronDown size={12} className="text-foreground/30" />
            ) : (
              <ChevronRight size={12} className="text-foreground/30" />
            ))}
        </div>
      </button>

      {expanded && hasDetails && (
        <div className="border-t border-foreground/5 px-3 py-2 space-y-2">
          {Object.keys(toolCall.args).length > 0 && (
            <div>
              <p className="text-foreground/40 mb-1">인자</p>
              <pre className="rounded bg-foreground/[0.03] p-2 overflow-x-auto text-[11px] leading-relaxed">
                {JSON.stringify(toolCall.args, null, 2)}
              </pre>
            </div>
          )}
          {toolCall.error && (
            <div>
              <p className="text-red-500/80 mb-1">오류</p>
              <pre className="rounded bg-red-500/5 border border-red-500/10 p-2 overflow-x-auto text-[11px] text-red-600 dark:text-red-400">
                {toolCall.error}
              </pre>
            </div>
          )}
          {toolCall.result && (
            <div>
              <p className="text-foreground/40 mb-1">결과</p>
              <pre className="rounded bg-foreground/[0.03] p-2 overflow-x-auto text-[11px] leading-relaxed max-h-48">
                {toolCall.result.content
                  .map((c) => c.text ?? "")
                  .filter(Boolean)
                  .join("\n") ||
                  JSON.stringify(toolCall.result.content, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const ToolCallBubble = memo(ToolCallBubbleInner);
