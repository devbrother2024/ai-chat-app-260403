import { type NextRequest, NextResponse } from "next/server";
import { mcpClientManager } from "@/lib/mcp/client-manager";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let serverIds: string[];

  try {
    const body = await request.json();
    serverIds = body.serverIds;

    if (!Array.isArray(serverIds)) {
      return NextResponse.json(
        { error: "serverIds 배열이 필요합니다." },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 },
    );
  }

  const statuses = mcpClientManager.getStatuses(serverIds);
  return NextResponse.json({ data: statuses });
}
