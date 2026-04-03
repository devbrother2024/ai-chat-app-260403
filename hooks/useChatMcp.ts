"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type {
  McpServer,
  McpServerStatus,
  McpToolInfo,
} from "@/types/mcp";
import { loadMcpServers } from "@/lib/mcp-storage";

const POLL_INTERVAL = 5_000;
const DISABLED_TOOLS_KEY = "ai-chat-app:disabled-tools";

export interface ChatToolItem {
  serverId: string;
  serverName: string;
  tool: McpToolInfo;
  enabled: boolean;
}

function loadDisabledTools(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DISABLED_TOOLS_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function saveDisabledTools(disabled: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DISABLED_TOOLS_KEY, JSON.stringify([...disabled]));
  } catch {
    /* quota exceeded */
  }
}

function toolKey(serverId: string, toolName: string): string {
  return `${serverId}::${toolName}`;
}

export function useChatMcp() {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [statuses, setStatuses] = useState<Map<string, McpServerStatus>>(
    new Map(),
  );
  const [disabledTools, setDisabledTools] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);
  const autoConnectingRef = useRef(new Set<string>());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    loadMcpServers().then((loaded) => {
      setServers(loaded);
    });
    setDisabledTools(loadDisabledTools());
  }, []);

  const enabledServers = useMemo(
    () => servers.filter((s) => s.enabled),
    [servers],
  );

  const enabledServerIds = useMemo(
    () => enabledServers.map((s) => s.id),
    [enabledServers],
  );

  useEffect(() => {
    if (enabledServerIds.length === 0) {
      setIsLoading(false);
      return;
    }

    const syncStatuses = async () => {
      try {
        const res = await fetch("/api/mcp/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serverIds: enabledServerIds }),
        });
        const json = await res.json();
        if (json.data && mountedRef.current) {
          setStatuses((prev) => {
            const next = new Map(prev);
            for (const s of json.data as McpServerStatus[]) {
              next.set(s.serverId, s);
            }
            return next;
          });
        }
      } catch {
        /* non-critical */
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    };

    syncStatuses();
  }, [enabledServerIds]);

  useEffect(() => {
    if (isLoading) return;

    const toConnect = enabledServers.filter((s) => {
      const status = statuses.get(s.id);
      return (
        (!status || status.status === "disconnected") &&
        !autoConnectingRef.current.has(s.id)
      );
    });

    if (toConnect.length === 0) return;

    const connectServer = async (server: McpServer) => {
      autoConnectingRef.current.add(server.id);
      try {
        const res = await fetch("/api/mcp/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serverId: server.id,
            transport: server.transport,
          }),
        });
        const json = await res.json();
        if (json.data && mountedRef.current) {
          setStatuses((prev) => {
            const next = new Map(prev);
            next.set(server.id, json.data as McpServerStatus);
            return next;
          });
        }
      } catch {
        /* auto-connect failure is non-critical */
      } finally {
        autoConnectingRef.current.delete(server.id);
      }
    };

    for (const server of toConnect) {
      connectServer(server);
    }
  }, [isLoading, enabledServers, statuses]);

  useEffect(() => {
    if (enabledServerIds.length === 0) return;

    const poll = async () => {
      const idsToCheck = enabledServerIds.filter((id) => {
        const s = statuses.get(id);
        return s?.status === "connected" || s?.status === "connecting";
      });
      if (idsToCheck.length === 0) return;

      try {
        const res = await fetch("/api/mcp/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serverIds: idsToCheck }),
        });
        const json = await res.json();
        if (json.data && mountedRef.current) {
          setStatuses((prev) => {
            const next = new Map(prev);
            for (const s of json.data as McpServerStatus[]) {
              next.set(s.serverId, s);
            }
            return next;
          });
        }
      } catch {
        /* polling failure is non-critical */
      }
    };

    const timer = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [enabledServerIds, statuses]);

  const connectedServers = useMemo(
    () =>
      enabledServers.filter(
        (s) => statuses.get(s.id)?.status === "connected",
      ),
    [enabledServers, statuses],
  );

  const availableTools: ChatToolItem[] = useMemo(() => {
    const items: ChatToolItem[] = [];
    for (const server of connectedServers) {
      const status = statuses.get(server.id);
      const tools = status?.capabilities?.tools ?? [];
      for (const tool of tools) {
        items.push({
          serverId: server.id,
          serverName: server.name,
          tool,
          enabled: !disabledTools.has(toolKey(server.id, tool.name)),
        });
      }
    }
    return items;
  }, [connectedServers, statuses, disabledTools]);

  const mcpServerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of availableTools) {
      if (item.enabled) {
        ids.add(item.serverId);
      }
    }
    return [...ids];
  }, [availableTools]);

  const toggleTool = useCallback(
    (serverId: string, toolName: string) => {
      setDisabledTools((prev) => {
        const next = new Set(prev);
        const key = toolKey(serverId, toolName);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        saveDisabledTools(next);
        return next;
      });
    },
    [],
  );

  const toggleAllTools = useCallback(
    (enabled: boolean) => {
      setDisabledTools(() => {
        if (enabled) {
          saveDisabledTools(new Set());
          return new Set();
        }
        const allKeys = new Set(
          availableTools.map((t) => toolKey(t.serverId, t.tool.name)),
        );
        saveDisabledTools(allKeys);
        return allKeys;
      });
    },
    [availableTools],
  );

  const enabledToolCount = useMemo(
    () => availableTools.filter((t) => t.enabled).length,
    [availableTools],
  );

  return {
    connectedServers,
    availableTools,
    enabledToolCount,
    toggleTool,
    toggleAllTools,
    isLoading,
    mcpServerIds,
    statuses,
  };
}
