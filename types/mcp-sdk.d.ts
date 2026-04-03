declare module "@modelcontextprotocol/sdk/client" {
  export { Client } from "@modelcontextprotocol/sdk";
}

declare module "@modelcontextprotocol/sdk/client/streamableHttp" {
  import type { Transport } from "@modelcontextprotocol/sdk";

  export interface StreamableHTTPClientTransportOptions {
    requestInit?: RequestInit;
  }

  export class StreamableHTTPClientTransport implements Transport {
    constructor(url: URL, options?: StreamableHTTPClientTransportOptions);
    start(): Promise<void>;
    send(message: unknown): Promise<void>;
    close(): Promise<void>;
    onclose?: () => void;
    onerror?: (error: Error) => void;
    onmessage?: (message: unknown) => void;
  }
}

declare module "@modelcontextprotocol/sdk/client/stdio" {
  import type { Transport } from "@modelcontextprotocol/sdk";

  export interface StdioServerParameters {
    command: string;
    args?: string[];
    env?: Record<string, string>;
    stderr?: "pipe" | "inherit" | "ignore";
  }

  export class StdioClientTransport implements Transport {
    constructor(params: StdioServerParameters);
    start(): Promise<void>;
    send(message: unknown): Promise<void>;
    close(): Promise<void>;
    onclose?: () => void;
    onerror?: (error: Error) => void;
    onmessage?: (message: unknown) => void;
  }
}
