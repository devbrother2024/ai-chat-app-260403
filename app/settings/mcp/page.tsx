"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMcpServers } from "@/hooks/useMcpServers";
import { useMcpConnection } from "@/hooks/useMcpConnection";
import { McpServerList } from "@/components/mcp/McpServerList";
import { McpServerForm } from "@/components/mcp/McpServerForm";
import { McpInspectorDialog } from "@/components/mcp/McpInspectorDialog";
import type { McpServer, McpTransportConfig } from "@/types/mcp";

export default function McpSettingsPage() {
  const { servers, addServer, updateServer, deleteServer, toggleServer } =
    useMcpServers();
  const [formOpen, setFormOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServer | null>(null);
  const [inspectingServer, setInspectingServer] = useState<McpServer | null>(
    null,
  );

  const serverIds = useMemo(() => servers.map((s) => s.id), [servers]);
  const { getStatus, connect, disconnect } = useMcpConnection(serverIds);

  const handleEdit = (server: McpServer) => {
    setEditingServer(server);
    setFormOpen(true);
  };

  const handleSave = (name: string, transport: McpTransportConfig) => {
    if (editingServer) {
      updateServer(editingServer.id, name, transport);
    } else {
      addServer(name, transport);
    }
    setEditingServer(null);
  };

  const handleOpenChange = (open: boolean) => {
    setFormOpen(open);
    if (!open) setEditingServer(null);
  };

  const handleConnect = (server: McpServer) => {
    connect(server.id, server.transport);
  };

  const handleDisconnect = (serverId: string) => {
    disconnect(serverId);
  };

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Link href="/">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft />
          </Button>
        </Link>
        <Settings size={18} className="text-muted-foreground" />
        <h1 className="text-sm font-semibold">MCP 서버 관리</h1>
        <div className="ml-auto">
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus />
            서버 추가
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
            Headers 및 환경 변수에 민감한 정보(API 키 등)가 포함될 수 있습니다.
            공용 PC에서는 주의하세요.
          </div>

          <McpServerList
            servers={servers}
            getConnectionStatus={getStatus}
            onToggle={toggleServer}
            onEdit={handleEdit}
            onDelete={deleteServer}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onInspect={setInspectingServer}
          />
        </div>
      </main>

      <McpServerForm
        open={formOpen}
        onOpenChange={handleOpenChange}
        editingServer={editingServer}
        onSave={handleSave}
      />

      {inspectingServer && (
        <McpInspectorDialog
          open={!!inspectingServer}
          onOpenChange={(open) => {
            if (!open) setInspectingServer(null);
          }}
          serverName={inspectingServer.name}
          serverId={inspectingServer.id}
          capabilities={
            getStatus(inspectingServer.id).capabilities ?? {
              tools: [],
              prompts: [],
              resources: [],
            }
          }
        />
      )}
    </div>
  );
}
