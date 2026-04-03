"use client";

import { useState } from "react";
import { Loader2, AlertCircle, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { McpResourceInfo, McpResourceResult } from "@/types/mcp";

interface McpResourceReaderProps {
  serverId: string;
  resources: McpResourceInfo[];
}

export function McpResourceReader({
  serverId,
  resources,
}: McpResourceReaderProps) {
  const [selectedResource, setSelectedResource] =
    useState<McpResourceInfo | null>(null);
  const [result, setResult] = useState<McpResourceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelect = async (resource: McpResourceInfo) => {
    setSelectedResource(resource);
    setResult(null);
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/mcp/resources/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverId, uri: resource.uri }),
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
      } else {
        setResult(json.data as McpResourceResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "읽기 실패");
    } finally {
      setLoading(false);
    }
  };

  if (resources.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        사용 가능한 resource가 없습니다.
      </p>
    );
  }

  return (
    <div className="flex h-full gap-3">
      <div className="w-48 shrink-0 space-y-1 overflow-y-auto border-r border-border pr-3">
        {resources.map((resource) => (
          <button
            key={resource.uri}
            onClick={() => handleSelect(resource)}
            className={`w-full rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
              selectedResource?.uri === resource.uri
                ? "bg-accent text-accent-foreground"
                : "hover:bg-muted"
            }`}
          >
            <span className="block font-mono font-medium truncate">
              {resource.name}
            </span>
            <span className="block truncate text-muted-foreground mt-0.5">
              {resource.uri}
            </span>
            {resource.mimeType && (
              <Badge variant="outline" className="mt-0.5 text-[10px]">
                {resource.mimeType}
              </Badge>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
        {selectedResource ? (
          <>
            <div>
              <h3 className="font-mono text-sm font-semibold">
                {selectedResource.name}
              </h3>
              <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                {selectedResource.uri}
              </p>
              {selectedResource.description && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {selectedResource.description}
                </p>
              )}
            </div>

            {loading && (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                읽는 중...
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                <pre className="whitespace-pre-wrap text-xs text-destructive">
                  {error}
                </pre>
              </div>
            )}

            {result &&
              result.contents.map((content, i) => (
                <div
                  key={i}
                  className="rounded-md border border-border bg-muted/30 p-3"
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <Download className="size-3 text-muted-foreground" />
                    <span className="truncate font-mono text-[10px] text-muted-foreground">
                      {content.uri}
                    </span>
                    {content.mimeType && (
                      <Badge variant="outline" className="text-[10px]">
                        {content.mimeType}
                      </Badge>
                    )}
                  </div>
                  {content.text ? (
                    <pre className="max-h-[400px] overflow-auto whitespace-pre-wrap font-mono text-xs">
                      {content.text}
                    </pre>
                  ) : content.blob ? (
                    <p className="text-xs text-muted-foreground italic">
                      Binary data ({content.blob.length} chars, base64)
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      컨텐츠 없음
                    </p>
                  )}
                </div>
              ))}
          </>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            좌측에서 resource를 선택하세요.
          </p>
        )}
      </div>
    </div>
  );
}
