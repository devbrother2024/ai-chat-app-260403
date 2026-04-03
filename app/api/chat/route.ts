import { type NextRequest } from "next/server";
import { type Content } from "@google/genai";
import { streamChat } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  let history: Content[];
  let message: string;
  try {
    const body = await request.json();
    history = body.history ?? [];
    message = body.message;
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

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const text of streamChat(
          history,
          message,
          request.signal,
        )) {
          const event = `data: ${JSON.stringify({ content: text })}\n\n`;
          controller.enqueue(encoder.encode(event));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        const errMsg =
          err instanceof Error ? err.message : "스트리밍 중 오류 발생";
        const event = `data: ${JSON.stringify({ error: errMsg })}\n\n`;
        controller.enqueue(encoder.encode(event));
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
