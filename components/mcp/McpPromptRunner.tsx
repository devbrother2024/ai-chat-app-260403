"use client";

import { useState } from "react";
import { Play, Loader2, AlertCircle, User, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { McpPromptInfo, McpPromptResult } from "@/types/mcp";

interface McpPromptRunnerProps {
  serverId: string;
  prompts: McpPromptInfo[];
}

export function McpPromptRunner({ serverId, prompts }: McpPromptRunnerProps) {
  const [selectedPrompt, setSelectedPrompt] = useState<McpPromptInfo | null>(
    null,
  );
  const [args, setArgs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<McpPromptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelect = (prompt: McpPromptInfo) => {
    setSelectedPrompt(prompt);
    setResult(null);
    setError(null);
    const defaults: Record<string, string> = {};
    for (const arg of prompt.arguments ?? []) {
      defaults[arg.name] = "";
    }
    setArgs(defaults);
  };

  const handleExecute = async () => {
    if (!selectedPrompt) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const filteredArgs: Record<string, string> = {};
      for (const [k, v] of Object.entries(args)) {
        if (v.trim()) filteredArgs[k] = v;
      }

      const res = await fetch("/api/mcp/prompts/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverId,
          promptName: selectedPrompt.name,
          arguments: Object.keys(filteredArgs).length > 0 ? filteredArgs : undefined,
        }),
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setResult(json.data as McpPromptResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "실행 실패");
    } finally {
      setLoading(false);
    }
  };

  if (prompts.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        사용 가능한 prompt가 없습니다.
      </p>
    );
  }

  return (
    <div className="flex h-full gap-3">
      <div className="w-48 shrink-0 space-y-1 overflow-y-auto border-r border-border pr-3">
        {prompts.map((prompt) => (
          <button
            key={prompt.name}
            onClick={() => handleSelect(prompt)}
            className={`w-full rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
              selectedPrompt?.name === prompt.name
                ? "bg-accent text-accent-foreground"
                : "hover:bg-muted"
            }`}
          >
            <span className="block font-mono font-medium truncate">
              {prompt.name}
            </span>
            {prompt.description && (
              <span className="block truncate text-muted-foreground mt-0.5">
                {prompt.description}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
        {selectedPrompt ? (
          <>
            <div>
              <h3 className="font-mono text-sm font-semibold">
                {selectedPrompt.name}
              </h3>
              {selectedPrompt.description && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {selectedPrompt.description}
                </p>
              )}
            </div>

            {selectedPrompt.arguments && selectedPrompt.arguments.length > 0 && (
              <div className="space-y-2">
                {selectedPrompt.arguments.map((arg) => (
                  <div key={arg.name} className="space-y-1">
                    <Label className="text-xs">
                      {arg.name}
                      {arg.required && (
                        <span className="ml-0.5 text-destructive">*</span>
                      )}
                    </Label>
                    {arg.description && (
                      <p className="text-[10px] text-muted-foreground">
                        {arg.description}
                      </p>
                    )}
                    <Input
                      value={args[arg.name] ?? ""}
                      onChange={(e) =>
                        setArgs((prev) => ({
                          ...prev,
                          [arg.name]: e.target.value,
                        }))
                      }
                      placeholder={arg.name}
                      className="text-xs"
                    />
                  </div>
                ))}
              </div>
            )}

            <Button
              size="sm"
              onClick={handleExecute}
              disabled={loading}
              className="w-fit"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Play className="size-3.5" />
              )}
              실행
            </Button>

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                <pre className="whitespace-pre-wrap text-xs text-destructive">
                  {error}
                </pre>
              </div>
            )}

            {result && (
              <div className="space-y-2">
                <span className="text-xs font-medium">Messages</span>
                {result.messages.map((msg, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3"
                  >
                    <div className="mt-0.5 shrink-0">
                      {msg.role === "user" ? (
                        <User className="size-3.5 text-muted-foreground" />
                      ) : (
                        <Bot className="size-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Badge variant="outline" className="mb-1 text-[10px]">
                        {msg.role}
                      </Badge>
                      <pre className="whitespace-pre-wrap font-mono text-xs">
                        {msg.content.text ?? JSON.stringify(msg.content)}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            좌측에서 prompt를 선택하세요.
          </p>
        )}
      </div>
    </div>
  );
}
