"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  McpTransportConfig,
  McpServerStatus,
  McpConnectionStatus,
} from "@/types/mcp";

const POLL_INTERVAL = 5_000;

export function useMcpConnection(serverIds: string[]) {
  const [statuses, setStatuses] = useState<Map<string, McpServerStatus>>(
    new Map(),
  );
  const activeIdsRef = useRef<string[]>([]);

  useEffect(() => {
    activeIdsRef.current = serverIds;
  }, [serverIds]);

  useEffect(() => {
    if (serverIds.length === 0) return;

    const syncInitialStatuses = async () => {
      try {
        const res = await fetch("/api/mcp/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serverIds }),
        });
        const json = await res.json();
        if (json.data) {
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
      }
    };

    syncInitialStatuses();
  }, [serverIds]);

  const getStatus = useCallback(
    (serverId: string): McpServerStatus =>
      statuses.get(serverId) ?? { serverId, status: "disconnected" },
    [statuses],
  );

  const updateStatus = useCallback(
    (serverId: string, partial: Partial<McpServerStatus>) => {
      setStatuses((prev) => {
        const next = new Map(prev);
        const current = prev.get(serverId) ?? {
          serverId,
          status: "disconnected" as McpConnectionStatus,
        };
        next.set(serverId, { ...current, ...partial });
        return next;
      });
    },
    [],
  );

  const connect = useCallback(
    async (serverId: string, transport: McpTransportConfig) => {
      updateStatus(serverId, { status: "connecting", error: undefined });

      try {
        const res = await fetch("/api/mcp/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serverId, transport }),
        });

        const json = await res.json();
        if (json.error) {
          updateStatus(serverId, { status: "error", error: json.error });
          return;
        }
        const serverStatus = json.data as McpServerStatus;
        setStatuses((prev) => {
          const next = new Map(prev);
          next.set(serverId, serverStatus);
          return next;
        });
      } catch (err) {
        updateStatus(serverId, {
          status: "error",
          error: err instanceof Error ? err.message : "연결 실패",
        });
      }
    },
    [updateStatus],
  );

  const disconnect = useCallback(
    async (serverId: string) => {
      updateStatus(serverId, { status: "disconnected", capabilities: undefined });

      try {
        await fetch("/api/mcp/disconnect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serverId }),
        });
      } catch {
        /* best-effort */
      }
    },
    [updateStatus],
  );

  useEffect(() => {
    const poll = async () => {
      const connectedIds = activeIdsRef.current.filter((id) => {
        const s = statuses.get(id);
        return s?.status === "connected" || s?.status === "error";
      });
      if (connectedIds.length === 0) return;

      try {
        const res = await fetch("/api/mcp/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serverIds: connectedIds }),
        });
        const json = await res.json();
        if (json.data) {
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
  }, [statuses]);

  return { statuses, getStatus, connect, disconnect };
}
