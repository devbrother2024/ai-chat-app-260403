import { type NextRequest, NextResponse } from "next/server";
import { mcpClientManager } from "@/lib/mcp/client-manager";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let serverId: string;

  try {
    const body = await request.json();
    serverId = body.serverId;

    if (!serverId) {
      return NextResponse.json(
        { error: "serverId가 필요합니다." },
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
    const status = await mcpClientManager.disconnect(serverId);
    return NextResponse.json({ data: status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "연결 해제 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
