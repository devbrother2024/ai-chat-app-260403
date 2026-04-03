# API Routes — Agent Rules

## Module Context

Next.js Route Handler 전용 영역. 모든 외부 API 통신(Gemini, MCP 서버)은 이 레이어에서만 처리된다. 클라이언트는 이 핸들러를 통해서만 LLM 및 도구 결과에 접근할 수 있다.

**주요 엔드포인트 (계획)**
```
POST /api/chat/stream     — Gemini SSE 스트리밍 응답
POST /api/mcp/invoke      — MCP 도구 호출
GET  /api/mcp/servers     — 등록된 MCP 서버 목록
POST /api/mcp/servers     — MCP 서버 등록
DELETE /api/mcp/servers/[id] — MCP 서버 삭제
```

**파일 구조 패턴**
```
app/api/
  chat/
    stream/route.ts       — SSE 스트리밍 핸들러
  mcp/
    route.ts              — 서버 CRUD
    invoke/route.ts       — 도구 호출
```

---

## Tech Stack & Constraints

- LLM SDK: `@google/generative-ai` (Gemini) — 서버 사이드 전용
- MCP: `@modelcontextprotocol/sdk` — 서버 사이드 전용
- 스트리밍: Web Streams API (`ReadableStream`) + SSE 포맷
- 에러 처리: `NextResponse.json()` + 통일된 에러 타입 사용
- 환경변수: `process.env.GEMINI_API_KEY`, `process.env.LLM_MODEL`

---

## Implementation Patterns

### SSE 스트리밍 핸들러 보일러플레이트

```typescript
// app/api/chat/stream/route.ts
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const { messages, signal } = await req.json();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        // Gemini streaming call
        for await (const chunk of geminiStream) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (err) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: mapError(err) })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

### 에러 매핑 패턴

```typescript
// lib/errors.ts
export function mapLlmError(err: unknown): ApiError {
  if (err instanceof GoogleGenerativeAIError) {
    if (err.status === 429) return { code: 'RATE_LIMIT', message: '요청 한도를 초과했습니다.' };
    if (err.status === 401) return { code: 'AUTH', message: 'API 키가 유효하지 않습니다.' };
  }
  return { code: 'INTERNAL', message: '서버 오류가 발생했습니다.' };
}
```

---

## Testing Strategy

```bash
# 단위 테스트 (route handler mock)
pnpm test app/api

# 수동 SSE 테스트
curl -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "hello"}]}'
```

---

## Local Golden Rules

### Do's

- 모든 Route Handler는 `AbortController` / `signal` 전달로 취소 지원
- 응답 타입: `ApiResponse<T>` 공통 래퍼 사용 (`{ data?, error? }`)
- Gemini 모델명은 `process.env.LLM_MODEL ?? 'gemini-2.0-flash'`로 폴백
- MCP 도구 호출 결과는 JSON 직렬화 가능한 형태로 정규화 후 반환

### Don'ts

- `route.ts`에 비즈니스 로직 직접 작성 금지 — `lib/` 또는 `services/`로 분리
- `console.error` 외 민감 정보(API 키, 사용자 입력 전문) 로그 출력 금지
- 클라이언트에서 받은 값을 검증 없이 Gemini API에 그대로 전달 금지
- 동기 I/O 및 블로킹 연산 금지 (Edge Runtime 호환성 고려)
