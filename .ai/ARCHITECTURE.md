# Architecture & Multi-Agent Boundaries

## Scope

This repository is a workspace containing several bounded contexts. The executable product is `socratic-monorepo`; the sibling directories are independent media, submission, and research artifacts. This document is the source of truth for agent work.

## Tech stack

- Frontends: Next.js 14, React 18, TypeScript, Tailwind/CSS.
- Shared TypeScript contracts: `packages/types` with Zod schemas.
- Shared UI: `packages/ui`.
- Realtime gateway: Node.js, Express, Socket.IO, Redis adapter.
- AI engine: Python/FastAPI-oriented service with OCR, symbolic, cache, LLM, and router modules.
- Video: Remotion/React/TypeScript in `socratic-video`.
- Tests: Vitest/React Testing Library and pytest.

## Stable tree and ownership

```text
.
├── .ai/                         # cross-agent context and handoff state
├── .antigravity/                # Antigravity rules
├── socratic-monorepo/           # executable product bounded context
│   ├── apps/
│   │   ├── teacher-board/       # teacher-facing composition and feature UI
│   │   ├── teacher-console/     # teacher management app (accounts, classes, lesson prep, live period control); port 3003
│   │   └── student-app/         # student-facing companion UI
│   ├── packages/
│   │   ├── types/               # canonical contracts, models, Zod schemas
│   │   └── ui/                  # reusable presentational UI
│   ├── services/
│   │   ├── api-gateway/         # HTTP and Socket.IO orchestration
│   │   └── ai-engine/           # Python AI/domain adapters
│   └── e2e/                     # cross-app tests
├── socratic-video/              # independent Remotion bounded context
├── slide-du-thi/                # independent slide generation scripts/assets
├── docs/                        # research and project documentation
└── AXIOMA-*, Ho-so-*, Goi-*/    # submission/media artifacts; no runtime imports
```

The source tree already has the required high-cohesion boundaries. Physical moves are intentionally deferred while the working tree contains uncommitted changes and generated assets; changing those paths would create avoidable broken imports and merge conflicts. Future moves must be performed with `git mv` and a green verification run.

## 2 Core Product Features Division

To ensure architectural clarity, the entire system is strictly partitioned into two primary features:

### Feature 1: Bảng tương tác thông minh trên lớp (Smartboard Interactive Canvas)
- **Primary host:** `socratic-monorepo/apps/teacher-board` (runs on 86" smartboards and podium PCs).
- **Core scope:**
  - Interactive digital chalkboard with zero-background Holographic HUD (`bg-transparent`, palm rejection, pointer capture).
  - Rapid handwriting & solid shape recognition (`detectSolidFromStrokes`, `recognizeSketch`, local routing in < 15ms).
  - 10 Advanced STEM Engines (3D Oxyz, Riemann Revolve, Euler Geometry, SN2 Mechanism, Crystal Lattice, CFT Complex, Cyclohexane, ETC/ATP, Lotka-Volterra, GPCR/Apoptosis).
  - OCR Handwriting Recognition with Confidence Logic: Low confidence (< 0.85 or ambiguous) triggers 1-tap candidate swap chips (`Z ⇄ 2`, `n ⇄ \pi`, `l ⇄ 1`, `5 ⇄ S`, etc.); normal confidence (>= 0.85) bypasses modal directly into simulation.
  - Temporal Scene Chunking (Pre-Clear Commit): Retains lecture context across all board erasures into a session journal history.
  - Classroom In-Session Interaction (ClassroomPanel, BYOD WebSocket sync, live predictive polling, delegation).

### Feature 2: Nền tảng Gia sư AI Socratic Đồng hành Sau Giờ học (After-School Socratic AI Tutor & Realtime Connected Platform)
- **Primary host:** `socratic-monorepo/apps/student-app` (responsive web/app for students, teachers, and parents after school hours).
- **Core scope (all Socratic companion modules reside here):**
  - **Socratic Companion Session:** Locked Stepper with 4-level scaffolding, ConceptCheckGate with reverse explanation and Eureka particles reward, MathNumpad with anti-cheat paste block.
  - **4 Visual Debugger Widgets:** ChemicalBalanceScale, VectorForcePolygon, FunctionExtremaTangent, CellOsmosisPressure.
  - **Bayesian Knowledge Tracing (BKT) Engine (`bktEngine.ts`):** Bayesian posterior updates $P(L_t \mid \text{Evidence})$, Spaced Repetition (SM-2 intervals), Productive Struggle Time (PST), Scaffolding Efficiency Ratio (SER).
  - **After-School Socratic Tutor (`AfterSchoolTutor.tsx`):**
    1. Socratic Homework Solver with Socratic Guardrails preventing direct answer leakage and dynamically unlocking Visual Debuggers.
    2. Home Living Sandbox & Free Sketch for what-if experimentation replaying classroom vector journals.
    3. Spaced Repetition & Exam Drill with curriculum toggle (THPT Standard vs Olympiad Advanced).
    4. ParentPulse & Teacher Dashboard Sync for qualitative effort reassurance and class-wide misconception heatmaps.
  - **Smart Notes & Classroom Recap:** Replaying teacher's lecture scenes, formulas, and lightweight vector journals (< 60 KB).
  - **Dashboards:** TeacherHeatmap (teacher class analytics) and ParentPulse (parental engagement).

### Tam giác 3 đỉnh (hub)
- **Đỉnh 1 — portal giáo viên** = `apps/teacher-console` (tài khoản, lớp, tiết, tài nguyên, lưới bài làm, duyệt, tổng kết tiết) + hub `services/ai-engine/hub/*` (học sinh/mã đăng nhập, gói kiến thức, chỉ số BKT, báo cáo phụ huynh). Hub nhận phiên console như giáo viên.
- **Đỉnh 2 — bảng lớp** = `apps/teacher-board`, ghép với tiết console (`X-Board-Token`): mở tài nguyên (slide/bài tập/đề) thu phóng + viết đè, giao bài bằng QR, chọn bài ẩn danh để chữa.
- **Đỉnh 3 — app học sinh** = `apps/student-app`: làm bài `/a/<mã>`, tab "Lớp của em" (gói cuối tiết, phần chữa, học lại Socratic), `/parent/<token>`.
- **Cạnh**: chỉ qua `ai-engine` (`/api/v1/hub/*`, `/api/v1/console/*`, `/api/v1/board/*`); bài nộp/điểm → `learning_events` → BKT → chỉ số đỉnh 1 và báo cáo phụ huynh. Hợp đồng: `.ai/INTERFACES.md` mục "Hub v1" và "Assignments v1".

## Dependency rules

1. `packages/types` is the only canonical location for cross-app contracts. Apps and services may import it through `@socratic/types`; types must not import from apps or services.
2. `packages/ui` may depend on React and stable contracts, but must not import app pages, engines, or service code.
3. `apps/teacher-board`, `apps/teacher-console` and `apps/student-app` may depend on `packages/types` and `packages/ui`, and on their own local feature modules. They must not import one another. `teacher-console` treats lessons as opaque JSON and talks to the board only through the ai-engine (pairing codes, `/api/v1/board/*`, WebSocket role `console`).
4. `services/api-gateway` may depend on `@socratic/types`; it owns transport wiring and must not import React UI code.
5. `services/ai-engine` is isolated Python code. Changes to its response shape require a corresponding contract update in `packages/types` and documentation in `INTERFACES.md`.
6. `socratic-video`, slide scripts, documents, and media are consumers/artifacts, not runtime dependencies of the monorepo.
7. Within an app, prefer feature-local imports. `components`, `engines`, `utils`, and `hooks` are app-private; shared promotion requires an explicit contract and review.
8. Avoid circular dependencies. Dependency direction is `app/service -> package contract -> primitives`; never reverse it.

## Naming and change ownership

- React components and classes: PascalCase; hooks: `useX`; utilities and modules: camelCase; Python modules: snake_case.
- Types use descriptive PascalCase; schemas end in `Schema`; constants use `SCREAMING_SNAKE_CASE`.
- One feature owns its UI, state, adapters, and tests where practical.
- Agents must claim a directory in `.ai/HANDOFF.md` before editing and avoid unrelated generated files.
- Files over roughly 300 lines should be reviewed for extraction into cohesive feature modules; extraction must preserve exports and behavior.

## Agent-safe workflow

Read `ARCHITECTURE.md`, `INTERFACES.md`, and `HANDOFF.md` first. Keep changes within one bounded context, update contracts before consumers, run the narrowest relevant checks, then update the handoff.
