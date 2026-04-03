import { type NextRequest } from "next/server";
import { type Content } from "@google/genai";
import {
  streamChat,
  streamChatWithTools,
  mcpToolToFunctionDeclaration,
} from "@/lib/gemini";
import { mcpClientManager } from "@/lib/mcp/client-manager";
import type { McpToolInfo } from "@/types/mcp";

interface ToolMapping {
  serverId: string;
  originalName: string;
}

function buildToolMap(
  serverTools: { serverId: string; tools: McpToolInfo[] }[],
): { toolMap: Map<string, ToolMapping>; allTools: McpToolInfo[] } {
  const toolMap = new Map<string, ToolMapping>();
  const allTools: McpToolInfo[] = [];
  const nameCount = new Map<string, number>();

  for (const { tools } of serverTools) {
    for (const tool of tools) {
      nameCount.set(tool.name, (nameCount.get(tool.name) ?? 0) + 1);
    }
  }

  for (const { serverId, tools } of serverTools) {
    for (const tool of tools) {
      const needsPrefix = (nameCount.get(tool.name) ?? 0) > 1;
      const safeName = needsPrefix
        ? `${serverId.replace(/[^a-zA-Z0-9_]/g, "_")}__${tool.name}`
        : tool.name;

      toolMap.set(safeName, { serverId, originalName: tool.name });
      allTools.push({ ...tool, name: safeName });
    }
  }

  return { toolMap, allTools };
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  let history: Content[];
  let message: string;
  let mcpServerIds: string[] | undefined;

  try {
    const body = await request.json();
    history = body.history ?? [];
    message = body.message;
    mcpServerIds = body.mcpServerIds;

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "message 문자열이 필요합니다." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
  } catch {
    return new Response(
      JSON.stringify({ error: "잘못된 요청 형식입니다." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const hasMcpTools =
    Array.isArray(mcpServerIds) && mcpServerIds.length > 0;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
        );
      };

      try {
        if (!hasMcpTools) {
          for await (const text of streamChat(
            history,
            message,
            request.signal,
          )) {
            send({ type: "text", content: text });
          }
        } else {
          const serverTools =
            mcpClientManager.getToolsForServers(mcpServerIds!);
          const { toolMap, allTools } = buildToolMap(serverTools);
          const declarations = allTools.map(mcpToolToFunctionDeclaration);

          const onToolCall = async (
            name: string,
            args: Record<string, unknown>,
          ): Promise<Record<string, unknown>> => {
            const mapping = toolMap.get(name);
            if (!mapping) {
              return { error: `도구를 찾을 수 없습니다: ${name}` };
            }

            const result = await mcpClientManager.callTool(
              mapping.serverId,
              mapping.originalName,
              args,
            );

            const textParts = result.content
              .filter((c) => c.text)
              .map((c) => c.text)
              .join("\n");

            return {
              result: textParts || JSON.stringify(result.content),
              isError: result.isError ?? false,
            };
          };

          for await (const event of streamChatWithTools(
            history,
            message,
            declarations,
            onToolCall,
            request.signal,
          )) {
            if (event.type === "text") {
              send({ type: "text", content: event.content });
            } else if (event.type === "function_call") {
              const mapping = toolMap.get(event.name);
              send({
                type: "tool_call_start",
                toolCall: {
                  id: `tc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                  serverId: mapping?.serverId ?? "",
                  serverName: mapping?.serverId ?? "",
                  toolName: mapping?.originalName ?? event.name,
                  args: event.args,
                  status: "calling",
                  startedAt: Date.now(),
                },
              });
            } else if (event.type === "function_result") {
              const mapping = toolMap.get(event.name);
              const resultData = event.result as Record<string, unknown>;
              const isError = resultData.error !== undefined;
              send({
                type: "tool_call_result",
                toolCall: {
                  id: `tc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                  serverId: mapping?.serverId ?? "",
                  serverName: mapping?.serverId ?? "",
                  toolName: mapping?.originalName ?? event.name,
                  args: {},
                  status: isError ? "error" : "success",
                  result: isError
                    ? undefined
                    : {
                        content: [
                          { type: "text", text: String(resultData.result ?? "") },
                        ],
                        isError: false,
                      },
                  error: isError ? String(resultData.error) : undefined,
                  startedAt: Date.now(),
                  completedAt: Date.now(),
                },
              });
            }
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        const errMsg =
          err instanceof Error ? err.message : "스트리밍 중 오류 발생";
        send({ type: "error", error: errMsg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
