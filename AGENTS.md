# AI Chat App — Root Agent Rules

## Project Context & Operations

**목표**: Gemini API 기반 AI 채팅 앱. MCP(Model Context Protocol) Host & Client 역할을 겸하며, 서버 사이드 스트리밍과 도구 호출을 지원하는 MVP를 구현한다.

**Tech Stack**
- Framework: Next.js 16 (App Router, `/app`)
- Runtime: React 19 + TypeScript 5
- Styling: Tailwind CSS v4 + shadcn/ui
- Icons: Lucide React
- LLM: Gemini API (서버 사이드 전용)
- Storage: localStorage (MVP)
- Package Manager: pnpm

**Operational Commands**
```
pnpm install          # 의존성 설치
pnpm dev              # 개발 서버 (http://localhost:3000)
pnpm build            # 프로덕션 빌드
pnpm typecheck        # 타입 검사
pnpm lint             # ESLint
pnpm format           # Prettier (설정 시)
pnpm test             # 테스트
```

**Environment Variables** (`.env.local` — 절대 커밋 금지)
```
GEMINI_API_KEY=...
LLM_MODEL=gemini-2.0-flash
```

---

## Golden Rules

### Immutable (타협 불가)

- 클라이언트에서 Gemini API / MCP 서버 **직접 호출 금지** — 반드시 서버 사이드 Route Handler 경유
- API 키 및 민감값은 **`.env.local`에만 저장** — 클라이언트 번들에 절대 노출 금지
- 모든 파일은 **500 LOC 미만** — 단일 책임 원칙 준수
- `localhost` 또는 외부 API를 클라이언트 컴포넌트에서 `fetch`하는 코드 작성 금지

### Do's

- 서버 로직은 `/app/api/**` Route Handler에만 작성
- 스트리밍은 SSE(Server-Sent Events) 방식 사용 (`/api/chat/stream`)
- 취소 지원: 모든 LLM 호출에 `AbortController` 연결
- UI 상태는 React state + 커스텀 훅으로 관리 (전역 스토어는 신중히 도입)
- `shadcn/ui` 컴포넌트를 베이스로 사용, Tailwind로 커스터마이징
- 에러 응답: 401/403/429/5xx → 통일된 에러 코드/메시지로 변환 후 클라이언트 전달
- `localStorage` 저장 시 민감값 제외 권고 배너 표시

### Don'ts

- `useEffect`로 외부 API 직접 호출 금지
- `any` 타입 남용 금지 — 명시적 타입 정의 우선
- `console.log` 프로덕션 코드에 잔존 금지 (로깅은 서버 사이드에서 구조화된 방식으로)
- 하드코딩된 URL, 키, 모델명 금지 — 환경변수 또는 상수 파일 사용
- DB/ORM 도입 금지 (MVP 범위 외)

---

## Standards & References

**코딩 컨벤션**
- 컴포넌트: PascalCase, 파일명과 동일하게
- 훅: `use` 접두사 (예: `useChat`, `useMcpServers`)
- API Route: `app/api/[resource]/route.ts` 패턴
- 타입 정의: `types/` 또는 각 모듈 내 `types.ts`로 분리
- 서버 전용 유틸: `lib/` 디렉토리

**Git 전략**
- 브랜치: `feat/`, `fix/`, `chore/` 접두사
- 커밋 메시지: 한국어, 명령형 (예: "채팅 스트리밍 API 구현")
- PR 단위: 기능 단위로 작게 분리

**Maintenance Policy**
규칙과 실제 코드 사이에 괴리가 발생하면 즉시 AGENTS.md 업데이트를 제안한다. 구현 결정이 이 문서의 Golden Rules와 충돌하면 반드시 사용자에게 알린다.

---

## Context Map

작업 영역에 따라 아래 하위 AGENTS.md를 참조한다.

- **[API Routes (LLM/MCP/SSE)](./app/api/AGENTS.md)** — Route Handler 작성, Gemini 스트리밍, MCP 도구 호출 구현 시.
- **[UI Components (shadcn/Tailwind)](./components/AGENTS.md)** — 채팅 버블, 입력창, 설정 패널 등 UI 컴포넌트 작업 시.
- **[Custom Hooks (상태 관리)](./hooks/AGENTS.md)** — 채팅 상태, MCP 서버 관리, 스트리밍 훅 작성 시.
