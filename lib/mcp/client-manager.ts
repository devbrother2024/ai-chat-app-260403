import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio";
import type {
  McpTransportConfig,
  McpConnectionStatus,
  McpServerCapabilities,
  McpServerStatus,
  McpToolInfo,
  McpPromptInfo,
  McpResourceInfo,
  McpContentPart,
  McpToolResult,
  McpPromptResult,
  McpResourceResult,
} from "@/types/mcp";

interface ManagedConnection {
  client: Client;
  status: McpConnectionStatus;
  error?: string;
  capabilities?: McpServerCapabilities;
}

class McpClientManager {
  private connections = new Map<string, ManagedConnection>();

  getConnectionsMap(): Map<string, ManagedConnection> {
    return this.connections;
  }

  restoreConnections(saved?: Map<string, ManagedConnection>) {
    if (saved) {
      this.connections = saved;
    }
  }

  async connect(
    serverId: string,
    transport: McpTransportConfig,
  ): Promise<McpServerStatus> {
    const existing = this.connections.get(serverId);
    if (existing) {
      await this.disconnectQuietly(serverId);
    }

    this.connections.set(serverId, {
      client: new Client({ name: "ai-chat-app", version: "0.1.0" }),
      status: "connecting",
    });

    const conn = this.connections.get(serverId)!;

    try {
      const mcpTransport = this.createTransport(transport);

      conn.client.onerror = (err: Error) => {
        const managed = this.connections.get(serverId);
        if (managed) {
          managed.status = "error";
          managed.error = err.message;
        }
      };

      conn.client.onclose = () => {
        const managed = this.connections.get(serverId);
        if (managed) {
          managed.status = "disconnected";
        }
      };

      await conn.client.connect(mcpTransport);

      const capabilities = await this.fetchCapabilities(conn.client);
      conn.status = "connected";
      conn.capabilities = capabilities;
      conn.error = undefined;

      return this.toStatus(serverId);
    } catch (err) {
      conn.status = "error";
      conn.error = err instanceof Error ? err.message : "연결 실패";
      return this.toStatus(serverId);
    }
  }

  async disconnect(serverId: string): Promise<McpServerStatus> {
    await this.disconnectQuietly(serverId);
    return {
      serverId,
      status: "disconnected",
    };
  }

  getStatus(serverId: string): McpServerStatus {
    return this.toStatus(serverId);
  }

  getStatuses(serverIds: string[]): McpServerStatus[] {
    return serverIds.map((id) => this.toStatus(id));
  }

  getToolsForServers(
    serverIds: string[],
  ): { serverId: string; tools: McpToolInfo[] }[] {
    const result: { serverId: string; tools: McpToolInfo[] }[] = [];
    for (const id of serverIds) {
      const conn = this.connections.get(id);
      if (conn?.status === "connected" && conn.capabilities?.tools) {
        result.push({ serverId: id, tools: conn.capabilities.tools });
      }
    }
    return result;
  }

  async callTool(
    serverId: string,
    toolName: string,
    args?: Record<string, unknown>,
  ): Promise<McpToolResult> {
    const client = this.getConnectedClient(serverId);
    const result = await client.callTool({ name: toolName, arguments: args });
    return {
      content: (result.content as McpContentPart[]) ?? [],
      isError: result.isError as boolean | undefined,
    };
  }

  async getPrompt(
    serverId: string,
    promptName: string,
    args?: Record<string, string>,
  ): Promise<McpPromptResult> {
    const client = this.getConnectedClient(serverId);
    const result = await client.getPrompt({ name: promptName, arguments: args });
    return {
      messages: (result.messages as McpPromptResult["messages"]) ?? [],
    };
  }

  async readResource(
    serverId: string,
    uri: string,
  ): Promise<McpResourceResult> {
    const client = this.getConnectedClient(serverId);
    const result = await client.readResource({ uri });
    return {
      contents: (result.contents as McpResourceResult["contents"]) ?? [],
    };
  }

  private getConnectedClient(serverId: string): Client {
    const conn = this.connections.get(serverId);
    if (!conn || conn.status !== "connected") {
      throw new Error("서버가 연결되어 있지 않습니다.");
    }
    return conn.client;
  }

  private async disconnectQuietly(serverId: string): Promise<void> {
    const conn = this.connections.get(serverId);
    if (!conn) return;
    try {
      await conn.client.close();
    } catch {
      /* ignore close errors */
    }
    this.connections.delete(serverId);
  }

  private createTransport(
    config: McpTransportConfig,
  ): StreamableHTTPClientTransport | StdioClientTransport {
    if (config.type === "streamable-http") {
      return new StreamableHTTPClientTransport(new URL(config.url), {
        requestInit: config.headers
          ? { headers: config.headers }
          : undefined,
      });
    }

    return new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: config.env
        ? { ...process.env, ...config.env } as Record<string, string>
        : undefined,
      stderr: "pipe",
    });
  }

  private async fetchCapabilities(
    client: Client,
  ): Promise<McpServerCapabilities> {
    const [toolsResult, promptsResult, resourcesResult] =
      await Promise.allSettled([
        client.listTools(),
        client.listPrompts(),
        client.listResources(),
      ]);

    const tools: McpToolInfo[] =
      toolsResult.status === "fulfilled"
        ? toolsResult.value.tools.map(
            (t: { name: string; description?: string; inputSchema: object }) => ({
              name: t.name,
              description: t.description,
              inputSchema: t.inputSchema as Record<string, unknown>,
            }),
          )
        : [];

    const prompts: McpPromptInfo[] =
      promptsResult.status === "fulfilled"
        ? promptsResult.value.prompts.map(
            (p: {
              name: string;
              description?: string;
              arguments?: { name: string; description?: string; required?: boolean }[];
            }) => ({
              name: p.name,
              description: p.description,
              arguments: p.arguments,
            }),
          )
        : [];

    const resources: McpResourceInfo[] =
      resourcesResult.status === "fulfilled"
        ? resourcesResult.value.resources.map(
            (r: { uri: string; name: string; description?: string; mimeType?: string }) => ({
              uri: r.uri,
              name: r.name,
              description: r.description,
              mimeType: r.mimeType,
            }),
          )
        : [];

    return { tools, prompts, resources };
  }

  private toStatus(serverId: string): McpServerStatus {
    const conn = this.connections.get(serverId);
    if (!conn) {
      return { serverId, status: "disconnected" };
    }
    return {
      serverId,
      status: conn.status,
      error: conn.error,
      capabilities: conn.capabilities,
    };
  }
}

const globalForMcp = globalThis as typeof globalThis & {
  mcpClientManager?: McpClientManager;
  mcpConnections?: Map<string, ManagedConnection>;
};

function getOrCreateManager(): McpClientManager {
  if (process.env.NODE_ENV !== "production" && globalForMcp.mcpClientManager) {
    const existing = globalForMcp.mcpClientManager;
    if (typeof existing.callTool !== "function") {
      globalForMcp.mcpConnections = existing.getConnectionsMap();
      const fresh = new McpClientManager();
      fresh.restoreConnections(globalForMcp.mcpConnections);
      globalForMcp.mcpClientManager = fresh;
      return fresh;
    }
    return existing;
  }

  const manager = new McpClientManager();
  if (process.env.NODE_ENV !== "production") {
    globalForMcp.mcpClientManager = manager;
  }
  return manager;
}

export const mcpClientManager = getOrCreateManager();
