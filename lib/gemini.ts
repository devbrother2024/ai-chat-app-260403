import {
  GoogleGenAI,
  type Content,
  type FunctionDeclaration,
  type Part,
  createPartFromFunctionResponse,
} from "@google/genai";
import type { McpToolInfo } from "@/types/mcp";

const MODEL = process.env.LLM_MODEL ?? "gemini-2.5-flash-lite";
const MAX_TOOL_ROUNDS = 10;

let _ai: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (_ai) return _ai;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY 환경변수가 설정되지 않았습니다.");
  }
  _ai = new GoogleGenAI({ apiKey });
  return _ai;
}

export async function* streamChat(
  history: Content[],
  message: string,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const ai = getClient();

  const chat = ai.chats.create({
    model: MODEL,
    history,
    config: {
      maxOutputTokens: 4096,
    },
  });

  const response = await chat.sendMessageStream({ message });

  for await (const chunk of response) {
    if (signal?.aborted) break;
    const text = chunk.text;
    if (text) {
      yield text;
    }
  }
}

export type ToolCallEvent =
  | { type: "text"; content: string }
  | { type: "function_call"; name: string; args: Record<string, unknown> }
  | { type: "function_result"; name: string; result: Record<string, unknown> };

export function mcpToolToFunctionDeclaration(
  tool: McpToolInfo,
): FunctionDeclaration {
  const schema = tool.inputSchema ?? {};
  return {
    name: tool.name,
    description: tool.description,
    parametersJsonSchema: schema,
  };
}

export async function* streamChatWithTools(
  history: Content[],
  message: string,
  tools: FunctionDeclaration[],
  onToolCall: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>,
  signal?: AbortSignal,
): AsyncGenerator<ToolCallEvent> {
  const ai = getClient();

  const chat = ai.chats.create({
    model: MODEL,
    history,
    config: {
      maxOutputTokens: 4096,
      tools: tools.length > 0 ? [{ functionDeclarations: tools }] : undefined,
    },
  });

  let currentMessage: string | Part[] = message;
  let rounds = 0;

  while (rounds < MAX_TOOL_ROUNDS) {
    if (signal?.aborted) break;
    rounds++;

    const response = await chat.sendMessageStream({
      message: currentMessage,
    });

    let hasFunctionCalls = false;
    const functionCalls: { name: string; args: Record<string, unknown> }[] = [];

    for await (const chunk of response) {
      if (signal?.aborted) break;

      const text = chunk.text;
      if (text) {
        yield { type: "text", content: text };
      }

      if (chunk.candidates?.[0]?.content?.parts) {
        for (const part of chunk.candidates[0].content.parts) {
          if (part.functionCall) {
            hasFunctionCalls = true;
            functionCalls.push({
              name: part.functionCall.name ?? "",
              args: (part.functionCall.args as Record<string, unknown>) ?? {},
            });
          }
        }
      }
    }

    if (!hasFunctionCalls || functionCalls.length === 0) break;

    const responseParts: Part[] = [];
    for (const fc of functionCalls) {
      yield { type: "function_call", name: fc.name, args: fc.args };

      let result: Record<string, unknown>;
      try {
        result = await onToolCall(fc.name, fc.args);
      } catch (err) {
        result = {
          error: err instanceof Error ? err.message : "도구 실행 실패",
        };
      }

      yield { type: "function_result", name: fc.name, result };
      responseParts.push(
        createPartFromFunctionResponse(fc.name, fc.name, result),
      );
    }

    currentMessage = responseParts;
  }
}
