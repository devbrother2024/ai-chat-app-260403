# UI Components — Agent Rules

## Module Context

shadcn/ui + Tailwind CSS 기반 UI 컴포넌트 레이어. 순수 프레젠테이션 컴포넌트와 최소한의 UI 상태만 가진다. 비즈니스 로직과 API 호출은 훅(`/hooks`)으로 위임한다.

**주요 컴포넌트 (계획)**
```
components/
  chat/
    ChatTimeline.tsx      — 메시지 목록 렌더링
    MessageBubble.tsx     — 유저/AI 버블
    McpResultCard.tsx     — MCP 도구 결과 카드
    StreamingIndicator.tsx — 스트리밍 중 로딩 표시
  input/
    ChatInput.tsx         — 텍스트 입력 + 전송 버튼
    PromptHint.tsx        — "/" 입력 시 프롬프트 힌트
  settings/
    ModelSelector.tsx     — 모델 선택
    McpServerPanel.tsx    — MCP 서버 관리 패널
  ui/                     — shadcn/ui 기본 컴포넌트 (자동 생성, 수정 최소화)
```

---

## Tech Stack & Constraints

- 베이스: `shadcn/ui` (Radix UI 기반)
- 스타일링: Tailwind CSS v4 유틸리티 클래스 — `@apply` 최소화
- 아이콘: `lucide-react` 전용 (타 아이콘 라이브러리 혼용 금지)
- 애니메이션: Tailwind `transition`, `animate-` 클래스 우선 사용
- 서버 컴포넌트: 가능한 경우 Server Component 사용, 상호작용 필요 시만 `'use client'`

---

## Implementation Patterns

**파일 네이밍**: PascalCase, 컴포넌트명과 동일 (`MessageBubble.tsx`)

**컴포넌트 구조 패턴**
```typescript
// 'use client' 는 상호작용이 필요한 경우에만
interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export function MessageBubble({ role, content, isStreaming }: MessageBubbleProps) {
  return (
    <div className={cn('rounded-lg px-4 py-2', role === 'user' ? 'bg-primary text-primary-foreground ml-auto' : 'bg-muted')}>
      {content}
      {isStreaming && <StreamingCursor />}
    </div>
  );
}
```

**레이아웃 원칙**
- 상단: 모델/MCP 서버 관리 진입점
- 본문: 채팅 타임라인 (스크롤 영역)
- 하단: 입력창 고정 (`sticky bottom-0`)

**shadcn/ui 컴포넌트 추가**
```bash
pnpm dlx shadcn@latest add button input scroll-area dialog
```

---

## Testing Strategy

- 컴포넌트 단위: 사용자 인터랙션 위주 (`@testing-library/react`)
- 스냅샷 테스트는 최소화 — UI 변경 비용 증가
- 접근성: `aria-label`, `role` 속성 추가 후 keyboard navigation 수동 검증

---

## Local Golden Rules

### Do's

- 모든 비동기 상태(로딩/에러/성공)를 명확히 UI로 표현
- 에러 상태: 친절한 문구 + 재시도 버튼 패턴
- `cn()` 유틸 (`clsx` + `tailwind-merge`)로 조건부 클래스 처리
- 긴 텍스트 스트리밍: 토큰 단위 append로 체감 속도 향상
- 접근성: 시맨틱 마크업(`<button>`, `<main>`, `<section>`) + `aria-*` 속성

### Don'ts

- 컴포넌트 내부에서 `fetch` 직접 호출 금지 — 훅을 통해 데이터 수신
- `style={{ }}` 인라인 스타일 남용 금지 — Tailwind 유틸 우선
- `shadcn/ui/` 하위 자동 생성 파일 직접 수정 최소화
- 하나의 컴포넌트 파일에 여러 독립 컴포넌트 정의 금지 (분리 원칙)
