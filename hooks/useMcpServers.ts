"use client";

import { useState, useCallback, useEffect } from "react";
import type { McpServer, McpTransportConfig } from "@/types/mcp";
import { loadMcpServers, saveMcpServers } from "@/lib/mcp-storage";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useMcpServers() {
  const [servers, setServers] = useState<McpServer[]>([]);

  useEffect(() => {
    setServers(loadMcpServers());
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
      setServers((prev) => {
        const next = [...prev, server];
        saveMcpServers(next);
        return next;
      });
    },
    [],
  );

  const updateServer = useCallback(
    (id: string, name: string, transport: McpTransportConfig) => {
      setServers((prev) => {
        const next = prev.map((s) =>
          s.id === id ? { ...s, name, transport, updatedAt: Date.now() } : s,
        );
        saveMcpServers(next);
        return next;
      });
    },
    [],
  );

  const deleteServer = useCallback((id: string) => {
    setServers((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveMcpServers(next);
      return next;
    });
  }, []);

  const toggleServer = useCallback((id: string) => {
    setServers((prev) => {
      const next = prev.map((s) =>
        s.id === id
          ? { ...s, enabled: !s.enabled, updatedAt: Date.now() }
          : s,
      );
      saveMcpServers(next);
      return next;
    });
  }, []);

  return { servers, addServer, updateServer, deleteServer, toggleServer };
}
