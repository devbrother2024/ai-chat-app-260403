"use client";

import { useState, useCallback, useEffect } from "react";
import type { McpServer, McpTransportConfig } from "@/types/mcp";
import {
  loadMcpServers,
  saveMcpServer,
  deleteMcpServer as deleteMcpServerFromDb,
} from "@/lib/mcp-storage";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useMcpServers() {
  const [servers, setServers] = useState<McpServer[]>([]);

  useEffect(() => {
    loadMcpServers().then(setServers);
  }, []);

  const addServer = useCallback(
    (name: string, transport: McpTransportConfig) => {
      const now = Date.now();
      const server: McpServer = {
        id: generateId(),
        name,
        transport,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      };
      setServers((prev) => [...prev, server]);
      saveMcpServer(server);
    },
    [],
  );

  const updateServer = useCallback(
    (id: string, name: string, transport: McpTransportConfig) => {
      setServers((prev) => {
        const next = prev.map((s) =>
          s.id === id ? { ...s, name, transport, updatedAt: Date.now() } : s,
        );
        const updated = next.find((s) => s.id === id);
        if (updated) saveMcpServer(updated);
        return next;
      });
    },
    [],
  );

  const deleteServer = useCallback((id: string) => {
    setServers((prev) => prev.filter((s) => s.id !== id));
    deleteMcpServerFromDb(id);
  }, []);

  const toggleServer = useCallback((id: string) => {
    setServers((prev) => {
      const next = prev.map((s) =>
        s.id === id
          ? { ...s, enabled: !s.enabled, updatedAt: Date.now() }
          : s,
      );
      const toggled = next.find((s) => s.id === id);
      if (toggled) saveMcpServer(toggled);
      return next;
    });
  }, []);

  return { servers, addServer, updateServer, deleteServer, toggleServer };
}
