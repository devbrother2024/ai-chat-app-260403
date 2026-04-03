import { type NextRequest, NextResponse } from "next/server";
import { mcpClientManager } from "@/lib/mcp/client-manager";
import type { McpTransportConfig } from "@/types/mcp";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let serverId: string;
  let transport: McpTransportConfig;

  try {
    const body = await request.json();
    serverId = body.serverId;
    transport = body.transport;

    if (!serverId || !transport?.type) {
      return NextResponse.json(
        { error: "serverId와 transport 설정이 필요합니다." },
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
    const status = await mcpClientManager.connect(serverId, transport);
    return NextResponse.json({ data: status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "연결 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
