import { type NextRequest, NextResponse } from "next/server";
import { mcpClientManager } from "@/lib/mcp/client-manager";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let serverId: string;
  let toolName: string;
  let args: Record<string, unknown> | undefined;

  try {
    const body = await request.json();
    serverId = body.serverId;
    toolName = body.toolName;
    args = body.arguments;

    if (!serverId || !toolName) {
      return NextResponse.json(
        { error: "serverId와 toolName이 필요합니다." },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 },
    );
  }

  try {
    const result = await mcpClientManager.callTool(serverId, toolName, args);
    return NextResponse.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tool 실행 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
