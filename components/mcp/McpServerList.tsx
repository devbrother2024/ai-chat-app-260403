"use client";

import { Server } from "lucide-react";
import type { McpServer, McpServerStatus } from "@/types/mcp";
import { McpServerCard } from "./McpServerCard";

interface McpServerListProps {
  servers: McpServer[];
  getConnectionStatus: (serverId: string) => McpServerStatus;
  onToggle: (id: string) => void;
  onEdit: (server: McpServer) => void;
  onDelete: (id: string) => void;
  onConnect: (server: McpServer) => void;
  onDisconnect: (serverId: string) => void;
  onInspect: (server: McpServer) => void;
}

export function McpServerList({
  servers,
  getConnectionStatus,
  onToggle,
  onEdit,
  onDelete,
  onConnect,
  onDisconnect,
  onInspect,
}: McpServerListProps) {
  if (servers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Server size={48} strokeWidth={1.5} />
        <p className="mt-3 text-lg font-medium">등록된 MCP 서버가 없습니다</p>
        <p className="text-sm">서버를 추가하여 도구를 사용해보세요</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {servers.map((server) => (
        <McpServerCard
          key={server.id}
          server={server}
          connectionStatus={getConnectionStatus(server.id)}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
          onInspect={onInspect}
        />
      ))}
    </div>
  );
}
