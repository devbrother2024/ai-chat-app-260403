"use client";

import { useState, useEffect } from "react";
import { Plus, Minus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  McpServer,
  McpTransportType,
  McpTransportConfig,
} from "@/types/mcp";

interface McpServerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingServer?: McpServer | null;
  onSave: (name: string, transport: McpTransportConfig) => void;
}

interface KeyValuePair {
  key: string;
  value: string;
}

function toKeyValuePairs(record?: Record<string, string>): KeyValuePair[] {
  if (!record) return [];
  return Object.entries(record).map(([key, value]) => ({ key, value }));
}

function toRecord(pairs: KeyValuePair[]): Record<string, string> | undefined {
  const filtered = pairs.filter((p) => p.key.trim());
  if (filtered.length === 0) return undefined;
  return Object.fromEntries(filtered.map((p) => [p.key.trim(), p.value]));
}

export function McpServerForm({
  open,
  onOpenChange,
  editingServer,
  onSave,
}: McpServerFormProps) {
  const [name, setName] = useState("");
  const [transportType, setTransportType] =
    useState<McpTransportType>("streamable-http");

  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState<KeyValuePair[]>([]);

  const [command, setCommand] = useState("");
  const [args, setArgs] = useState("");
  const [envVars, setEnvVars] = useState<KeyValuePair[]>([]);

  useEffect(() => {
    if (!open) return;

    if (editingServer) {
      setName(editingServer.name);
      setTransportType(editingServer.transport.type);
      if (editingServer.transport.type === "streamable-http") {
        setUrl(editingServer.transport.url);
        setHeaders(toKeyValuePairs(editingServer.transport.headers));
        setCommand("");
        setArgs("");
        setEnvVars([]);
      } else {
        setCommand(editingServer.transport.command);
        setArgs(editingServer.transport.args?.join(", ") ?? "");
        setEnvVars(toKeyValuePairs(editingServer.transport.env));
        setUrl("");
        setHeaders([]);
      }
    } else {
      setName("");
      setTransportType("streamable-http");
      setUrl("");
      setHeaders([]);
      setCommand("");
      setArgs("");
      setEnvVars([]);
    }
  }, [editingServer, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let transport: McpTransportConfig;
    if (transportType === "streamable-http") {
      transport = {
        type: "streamable-http",
        url,
        headers: toRecord(headers),
      };
    } else {
      const parsedArgs = args
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      transport = {
        type: "stdio",
        command,
        args: parsedArgs.length > 0 ? parsedArgs : undefined,
        env: toRecord(envVars),
      };
    }

    onSave(name, transport);
    onOpenChange(false);
  };

  const addPair = (
    setter: React.Dispatch<React.SetStateAction<KeyValuePair[]>>,
  ) => {
    setter((prev) => [...prev, { key: "", value: "" }]);
  };

  const updatePair = (
    setter: React.Dispatch<React.SetStateAction<KeyValuePair[]>>,
    index: number,
    field: "key" | "value",
    val: string,
  ) => {
    setter((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: val } : p)),
    );
  };

  const removePair = (
    setter: React.Dispatch<React.SetStateAction<KeyValuePair[]>>,
    index: number,
  ) => {
    setter((prev) => prev.filter((_, i) => i !== index));
  };

  const isValid =
    name.trim() &&
    (transportType === "streamable-http" ? url.trim() : command.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingServer ? "MCP 서버 수정" : "MCP 서버 추가"}
          </DialogTitle>
          <DialogDescription>
            MCP 서버 연결 정보를 입력하세요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="server-name">서버 이름</Label>
            <Input
              id="server-name"
              placeholder="My MCP Server"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>트랜스포트 타입</Label>
            <Select
              value={transportType}
              onValueChange={(val) =>
                setTransportType(val as McpTransportType)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="streamable-http">
                  Streamable HTTP
                </SelectItem>
                <SelectItem value="stdio">stdio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {transportType === "streamable-http" ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor="server-url">URL</Label>
                <Input
                  id="server-url"
                  placeholder="http://localhost:3001/mcp"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">
                  {"서버 환경변수: ${VAR_NAME} 형식 (예: ${MCP_SERVER_URL}/mcp)"}
                </p>
              </div>
              <KeyValueEditor
                label="Headers"
                pairs={headers}
                onAdd={() => addPair(setHeaders)}
                onUpdate={(i, f, v) => updatePair(setHeaders, i, f, v)}
                onRemove={(i) => removePair(setHeaders, i)}
                keyPlaceholder="Authorization"
                valuePlaceholder="Bearer ${API_KEY}"
                hint={"값에 ${VAR_NAME} 사용 시 서버 환경변수로 치환됩니다."}
              />
            </>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="server-command">Command</Label>
                <Input
                  id="server-command"
                  placeholder="npx"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="server-args">Arguments (콤마 구분)</Label>
                <Input
                  id="server-args"
                  placeholder="-y, @modelcontextprotocol/server-filesystem"
                  value={args}
                  onChange={(e) => setArgs(e.target.value)}
                />
              </div>
              <KeyValueEditor
                label="환경 변수"
                pairs={envVars}
                onAdd={() => addPair(setEnvVars)}
                onUpdate={(i, f, v) => updatePair(setEnvVars, i, f, v)}
                onRemove={(i) => removePair(setEnvVars, i)}
                keyPlaceholder="API_KEY"
                valuePlaceholder="value..."
              />
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button type="submit" disabled={!isValid}>
              {editingServer ? "수정" : "추가"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function KeyValueEditor({
  label,
  pairs,
  onAdd,
  onUpdate,
  onRemove,
  keyPlaceholder,
  valuePlaceholder,
  hint,
}: {
  label: string;
  pairs: KeyValuePair[];
  onAdd: () => void;
  onUpdate: (index: number, field: "key" | "value", value: string) => void;
  onRemove: (index: number) => void;
  keyPlaceholder: string;
  valuePlaceholder: string;
  hint?: string;
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <div>
          <Label>{label}</Label>
          {hint && (
            <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>
          )}
        </div>
        <Button type="button" variant="ghost" size="icon-xs" onClick={onAdd}>
          <Plus />
        </Button>
      </div>
      {pairs.length > 0 ? (
        <div className="space-y-2">
          {pairs.map((pair, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                placeholder={keyPlaceholder}
                value={pair.key}
                onChange={(e) => onUpdate(i, "key", e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder={valuePlaceholder}
                value={pair.value}
                onChange={(e) => onUpdate(i, "value", e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => onRemove(i)}
              >
                <Minus />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">없음</p>
      )}
    </div>
  );
}
