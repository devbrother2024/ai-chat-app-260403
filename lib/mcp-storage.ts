import type { McpServer } from "@/types/mcp";
import { getSupabase } from "./supabase";

interface McpServerRow {
  id: string;
  name: string;
  transport: unknown;
  enabled: boolean;
  created_at: number;
  updated_at: number;
}

function toMcpServer(row: McpServerRow): McpServer {
  return {
    id: row.id,
    name: row.name,
    transport: row.transport as McpServer["transport"],
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function loadMcpServers(): Promise<McpServer[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("mcp_servers")
    .select("*")
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return (data as McpServerRow[]).map(toMcpServer);
}

export async function saveMcpServer(server: McpServer): Promise<void> {
  const supabase = getSupabase();

  await supabase.from("mcp_servers").upsert({
    id: server.id,
    name: server.name,
    transport: server.transport,
    enabled: server.enabled,
    created_at: server.createdAt,
    updated_at: server.updatedAt,
  });
}

export async function deleteMcpServer(id: string): Promise<void> {
  const supabase = getSupabase();
  await supabase.from("mcp_servers").delete().eq("id", id);
}
