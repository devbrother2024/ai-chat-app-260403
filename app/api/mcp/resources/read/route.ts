import { type NextRequest, NextResponse } from "next/server";
import { mcpClientManager } from "@/lib/mcp/client-manager";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let serverId: string;
  let uri: string;

  try {
    const body = await request.json();
    serverId = body.serverId;
    uri = body.uri;

    if (!serverId || !uri) {
      return NextResponse.json(
        { error: "serverId와 uri가 필요합니다." },
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
    const result = await mcpClientManager.readResource(serverId, uri);
    return NextResponse.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Resource 읽기 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
