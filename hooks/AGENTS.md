# Custom Hooks — Agent Rules

## Module Context

클라이언트 상태 관리 및 서버 통신 추상화 레이어. UI 컴포넌트와 API Route 사이를 연결한다. 모든 비동기 로직과 사이드이펙트는 이 레이어에서 캡슐화한다.

**주요 훅 (계획)**
```
hooks/
  useChat.ts            — 채팅 메시지 상태 + SSE 스트리밍 연결
  useMcpServers.ts      — MCP 서버 목록 CRUD (localStorage 연동)
  useStreamingText.ts   — SSE ReadableStream → 텍스트 청크 처리
  useAbortController.ts — 스트리밍 취소 관리
```

---

## Tech Stack & Constraints

- 상태 관리: React `useState`, `useReducer`, `useRef` — 전역 스토어 도입 전 검토 필수
- 영속성: `localStorage` (민감값 제외)
- 스트리밍: `EventSource` 또는 `fetch` + `ReadableStream.getReader()`
- 취소: `AbortController` — 컴포넌트 unmount 시 반드시 `abort()` 호출

---

## Implementation Patterns

### SSE 스트리밍 훅 패턴

```typescript
// hooks/useChat.ts
'use client';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    abortRef.current = new AbortController();
    setIsStreaming(true);

    const res = await fetch('/api/chat/stream', {
      method: 'POST',
      body: JSON.stringify({ messages: [...messages, { role: 'user', content }] }),
      signal: abortRef.current.signal,
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    let assistantMessage = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      // SSE 파싱 후 assistantMessage 누적
      assistantMessage += parseSSEChunk(chunk);
      setMessages(prev => updateLastAssistantMessage(prev, assistantMessage));
    }

    setIsStreaming(false);
  }, [messages]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return { messages, isStreaming, sendMessage, stopStreaming };
}
```

### localStorage 영속성 패턴

```typescript
// hooks/useMcpServers.ts
export function useMcpServers() {
  const [servers, setServers] = useState<McpServer[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('mcp-servers') ?? '[]');
    } catch {
      return [];
    }
  });

  const addServer = useCallback((server: McpServer) => {
    setServers(prev => {
      const next = [...prev, server];
      localStorage.setItem('mcp-servers', JSON.stringify(next));
      return next;
    });
  }, []);

  return { servers, addServer };
}
```

---

## Testing Strategy

```bash
# 훅 단위 테스트 (renderHook)
pnpm test hooks/

# MSW로 /api/chat/stream 모킹 후 스트리밍 흐름 검증
```

---

## Local Golden Rules

### Do's

- 훅 이름: `use` 접두사 필수, 동사+명사 형태 (`useChat`, `useMcpServers`)
- `useEffect` cleanup에서 반드시 `abortController.abort()` 호출
- `localStorage` 접근 시 `typeof window !== 'undefined'` 가드 + try/catch
- 반환값에 `isLoading`, `error`, `data` 패턴 일관성 유지

### Don'ts

- 훅 내부에서 `useRouter`, `useParams` 외의 Next.js 서버 전용 API 사용 금지
- `useState` 초기값으로 무거운 연산 직접 실행 금지 — 함수 형태(`() => compute()`) 사용
- 하나의 훅에 복수의 독립적 관심사 혼합 금지 — 분리 원칙 준수
- 전역 상태 라이브러리(Zustand 등) 도입은 useContext 한계 확인 후 결정
