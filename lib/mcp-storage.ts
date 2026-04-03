import type { McpServer } from "@/types/mcp";

const STORAGE_KEY = "ai-chat-app:mcp-servers";

export function loadMcpServers(): McpServer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as McpServer[];
  } catch {
    return [];
  }
}

export function saveMcpServers(servers: McpServer[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(servers));
  } catch {
    /* quota exceeded */
  }
}
