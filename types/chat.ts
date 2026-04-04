export interface ToolCallInfo {
  id: string;
  serverId: string;
  serverName: string;
  toolName: string;
  args: Record<string, unknown>;
  status: "calling" | "success" | "error";
  result?: { content: { type: string; text?: string; data?: string; mimeType?: string }[]; isError?: boolean };
  error?: string;
  startedAt: number;
  completedAt?: number;
}

export interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  createdAt: number;
  toolCalls?: ToolCallInfo[];
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export type SSEChunkType =
  | "text"
  | "tool_call_start"
  | "tool_call_result"
  | "error";

export interface SSEChunk {
  type?: SSEChunkType;
  content?: string;
  toolCall?: ToolCallInfo;
  error?: string;
}
