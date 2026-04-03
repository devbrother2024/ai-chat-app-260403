export interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  createdAt: number;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface SSEChunk {
  content?: string;
  error?: string;
}
