"use client";

import { useState } from "react";
import { Play, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { McpToolInfo, McpToolResult } from "@/types/mcp";

interface McpToolRunnerProps {
  serverId: string;
  tools: McpToolInfo[];
}

export function McpToolRunner({ serverId, tools }: McpToolRunnerProps) {
  const [selectedTool, setSelectedTool] = useState<McpToolInfo | null>(null);
  const [argsJson, setArgsJson] = useState("{}");
  const [result, setResult] = useState<McpToolResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelect = (tool: McpToolInfo) => {
    setSelectedTool(tool);
    setResult(null);
    setError(null);
    if (tool.inputSchema?.properties) {
      const defaults: Record<string, string> = {};
      for (const key of Object.keys(
        tool.inputSchema.properties as Record<string, unknown>,
      )) {
        defaults[key] = "";
      }
      setArgsJson(JSON.stringify(defaults, null, 2));
    } else {
      setArgsJson("{}");
    }
  };

  const handleExecute = async () => {
    if (!selectedTool) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const parsed = JSON.parse(argsJson);
      const res = await fetch("/api/mcp/tools/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serverId,
          toolName: selectedTool.name,
          arguments: parsed,
        }),
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setResult(json.data as McpToolResult);
      }
    } catch (err) {
      setError(
        err instanceof SyntaxError
          ? "JSON 형식이 올바르지 않습니다."
          : (err instanceof Error ? err.message : "실행 실패"),
      );
    } finally {
      setLoading(false);
    }
  };

  if (tools.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        사용 가능한 tool이 없습니다.
      </p>
    );
  }

  return (
    <div className="flex h-full gap-3">
      <div className="w-48 shrink-0 space-y-1 overflow-y-auto border-r border-border pr-3">
        {tools.map((tool) => (
          <button
            key={tool.name}
            onClick={() => handleSelect(tool)}
            className={`w-full rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
              selectedTool?.name === tool.name
                ? "bg-accent text-accent-foreground"
                : "hover:bg-muted"
            }`}
          >
            <span className="block font-mono font-medium truncate">
              {tool.name}
            </span>
            {tool.description && (
              <span className="block truncate text-muted-foreground mt-0.5">
                {tool.description}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
        {selectedTool ? (
          <>
            <div>
              <h3 className="font-mono text-sm font-semibold">
                {selectedTool.name}
              </h3>
              {selectedTool.description && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {selectedTool.description}
                </p>
              )}
              {selectedTool.inputSchema && (
                <Badge variant="outline" className="mt-1 text-[10px]">
                  {Object.keys(
                    (selectedTool.inputSchema.properties as Record<string, unknown>) ?? {},
                  ).length}{" "}
                  params
                </Badge>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Arguments (JSON)</label>
              <Textarea
                value={argsJson}
                onChange={(e) => setArgsJson(e.target.value)}
                className="font-mono text-xs min-h-[120px] resize-y"
                placeholder="{}"
              />
            </div>

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
              <div
                className={`rounded-md border p-3 ${
                  result.isError
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-border bg-muted/30"
                }`}
              >
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className="text-xs font-medium">Result</span>
                  {result.isError && (
                    <Badge variant="destructive" className="text-[10px]">
                      Error
                    </Badge>
                  )}
                </div>
                {result.content
                  .filter((c) => c.type === "image" && c.data)
                  .map((c, i) => (
                    <img
                      key={i}
                      src={`data:${c.mimeType ?? "image/png"};base64,${c.data}`}
                      alt="도구 결과 이미지"
                      className="rounded-md max-w-full max-h-80 my-1.5"
                    />
                  ))}
                {result.content.some((c) => c.type !== "image") && (
                  <pre className="whitespace-pre-wrap font-mono text-xs">
                    {result.content
                      .filter((c) => c.type !== "image")
                      .map((c) => c.text ?? JSON.stringify(c))
                      .join("\n")}
                  </pre>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            좌측에서 tool을 선택하세요.
          </p>
        )}
      </div>
    </div>
  );
}
