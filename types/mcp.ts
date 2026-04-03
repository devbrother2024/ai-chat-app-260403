export type McpTransportType = "streamable-http" | "stdio";

export interface StreamableHttpTransport {
  type: "streamable-http";
  url: string;
  headers?: Record<string, string>;
  env?: Record<string, string>;
}

export interface StdioTransport {
  type: "stdio";
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export type McpTransportConfig = StreamableHttpTransport | StdioTransport;

export interface McpServer {
  id: string;
  name: string;
  transport: McpTransportConfig;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export type McpConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface McpToolInfo {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface McpPromptInfo {
  name: string;
  description?: string;
  arguments?: { name: string; description?: string; required?: boolean }[];
}

export interface McpResourceInfo {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface McpServerCapabilities {
  tools: McpToolInfo[];
  prompts: McpPromptInfo[];
  resources: McpResourceInfo[];
}

export interface McpServerStatus {
  serverId: string;
  status: McpConnectionStatus;
  error?: string;
  capabilities?: McpServerCapabilities;
}

export interface McpContentPart {
  type: string;
  text?: string;
}

export interface McpToolResult {
  content: McpContentPart[];
  isError?: boolean;
}

export interface McpPromptMessage {
  role: string;
  content: McpContentPart;
}

export interface McpPromptResult {
  messages: McpPromptMessage[];
}

export interface McpResourceContent {
  uri: string;
  text?: string;
  blob?: string;
  mimeType?: string;
}

export interface McpResourceResult {
  contents: McpResourceContent[];
}
