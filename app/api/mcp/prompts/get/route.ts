import { type NextRequest, NextResponse } from "next/server";
import { mcpClientManager } from "@/lib/mcp/client-manager";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let serverId: string;
  let promptName: string;
  let args: Record<string, string> | undefined;

  try {
    const body = await request.json();
    serverId = body.serverId;
    promptName = body.promptName;
    args = body.arguments;

    if (!serverId || !promptName) {
      return NextResponse.json(
        { error: "serverId와 promptName이 필요합니다." },
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
    const result = await mcpClientManager.getPrompt(serverId, promptName, args);
    return NextResponse.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Prompt 조회 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
