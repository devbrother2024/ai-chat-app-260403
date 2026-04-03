"use client";

import { useState } from "react";
import {
  Pencil,
  Trash2,
  Globe,
  Terminal,
  Plug,
  Unplug,
  Loader2,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { McpCapabilities } from "./McpCapabilities";
import type { McpServer, McpServerStatus } from "@/types/mcp";

interface McpServerCardProps {
  server: McpServer;
  connectionStatus: McpServerStatus;
  onToggle: (id: string) => void;
  onEdit: (server: McpServer) => void;
  onDelete: (id: string) => void;
  onConnect: (server: McpServer) => void;
  onDisconnect: (serverId: string) => void;
  onInspect: (server: McpServer) => void;
}

const STATUS_DOT: Record<string, string> = {
  connected: "bg-green-500",
  connecting: "bg-yellow-500 animate-pulse",
  error: "bg-red-500",
  disconnected: "bg-muted-foreground/30",
};

export function McpServerCard({
  server,
  connectionStatus,
  onToggle,
  onEdit,
  onDelete,
  onConnect,
  onDisconnect,
  onInspect,
}: McpServerCardProps) {
  const isHttp = server.transport.type === "streamable-http";
  const { status, capabilities, error } = connectionStatus;
  const [expanded, setExpanded] = useState(false);
  const isConnected = status === "connected";
  const isConnecting = status === "connecting";

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block size-2 shrink-0 rounded-full ${STATUS_DOT[status] ?? STATUS_DOT.disconnected}`}
          />
          <CardTitle>{server.name}</CardTitle>
          <Badge variant={isHttp ? "secondary" : "outline"}>
            {isHttp ? (
              <Globe className="size-3" />
            ) : (
              <Terminal className="size-3" />
            )}
            {isHttp ? "HTTP" : "stdio"}
          </Badge>
        </div>
        <CardAction>
          <div className="flex items-center gap-1">
            {isConnected && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onInspect(server)}
                title="Inspector"
              >
                <Search />
              </Button>
            )}
            {isConnecting ? (
              <Button variant="ghost" size="icon-xs" disabled>
                <Loader2 className="animate-spin" />
              </Button>
            ) : isConnected ? (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onDisconnect(server.id)}
              >
                <Unplug />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onConnect(server)}
                disabled={!server.enabled}
              >
                <Plug />
              </Button>
            )}
            <Switch
              checked={server.enabled}
              onCheckedChange={() => onToggle(server.id)}
              size="sm"
            />
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onEdit(server)}
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onDelete(server.id)}
            >
              <Trash2 />
            </Button>
          </div>
        </CardAction>
      </CardHeader>

      <CardContent>
        <p className="truncate font-mono text-xs text-muted-foreground">
          {server.transport.type === "streamable-http"
            ? server.transport.url
            : `${server.transport.command} ${server.transport.args?.join(" ") ?? ""}`}
        </p>

        {status === "error" && error && (
          <p className="mt-1.5 text-xs text-destructive">{error}</p>
        )}

        {isConnected && capabilities && (
          <div className="mt-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? (
                <ChevronUp className="size-3" />
              ) : (
                <ChevronDown className="size-3" />
              )}
              <span>
                {capabilities.tools.length} tools,{" "}
                {capabilities.prompts.length} prompts,{" "}
                {capabilities.resources.length} resources
              </span>
            </button>
            {expanded && (
              <div className="mt-2 border-t border-border pt-2">
                <McpCapabilities capabilities={capabilities} />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
