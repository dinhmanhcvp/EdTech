# Mode 2 — Bài học hội thoại từ bảng: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Học sinh mở một bài học dạng chat được dựng từ snapshot bảng; gia sư (Gemini, có dự phòng) giải thích và hỏi theo hồ sơ từng em, còn server chấm đúng/sai.

**Architecture:** `lesson_builder` dựng bài học thuần quy tắc và giữ đáp án ở server; `lesson_llm` chỉ viết lời (stream) và có bộ lọc chống lộ đáp án + mẫu câu dự phòng; route `lesson.py` ghép chấm bài (`online_tutor.verdict`) với LLM và trả SSE; `LessonChat.tsx` hiển thị.

**Tech Stack:** FastAPI, SQLite (`student_context` store), `google-generativeai` qua `llm.key_pool`, Zod (`@socratic/types`), Next.js 14/React 18, pytest, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-29-mode2-board-to-lesson-design.md`

## Global Constraints
- Server quyết định đúng/sai và điểm; LLM chỉ quyết định cách nói. Đáp án không bao giờ nằm trong payload gửi client.
- Không có LLM (không khóa, lỗi, timeout) thì vẫn chạy bằng mẫu câu; khóa API chỉ đọc từ `services/ai-engine/.env`/biến môi trường, không ghi vào code, test, log.
- Student App không import Teacher Board; hợp đồng chung chỉ qua `@socratic/types`.
- Tin nhắn học sinh là dữ liệu: chạy `socratic_guard.evaluate_student_message` trước khi đưa vào LLM; không gửi tên thật cho LLM.
- Điểm bài học: 20 mỗi câu `COMPUTE` đúng, tối đa một lần mỗi câu. Biểu thức không phân tích được → `UNVERIFIED`, 0 điểm.
- Test không gọi AI thật; LLM được thay bằng hàm giả.
- Theo CLAUDE.md: ghi phạm vi vào `.ai/HANDOFF.md` trước khi sửa code, cập nhật khi xong. Chỉ commit khi người dùng yêu cầu (các bước không có lệnh commit).
- **Cần người dùng đồng ý riêng:** thêm một dòng `export * from './lesson';` vào `packages/types/src/index.ts` (HANDOFF phần A đang cấm sửa file này; `onlineTutor` cũng đã được re-export ở đó).

**Lệch so với spec:** bỏ "mastery khái niệm" khỏi bối cảnh cá nhân hóa của MVP vì câu hỏi bài học chưa gắn với KC của catalog; vẫn dùng persona, scaffold_depth, pace, visual_first, lỗi cũ và vài lượt gần nhất.

## Review Focus
- Snapshot rỗng/thiếu `boardSnapshots` → bài học rỗng có thông báo, không lỗi 500.
- Tin nhắn rất dài, chỉ khoảng trắng, hoặc chứa chỉ thị kiểu "bỏ qua hướng dẫn" → bị chặn/cắt, không tới LLM.
- LLM trả lời lộ đáp án hoặc stream đứt giữa chừng → thay bằng mẫu câu dự phòng, kết quả cuối vẫn hợp lệ.
- Gửi lại cùng `request_id`: cùng nội dung → phát lại kết quả cũ không cộng điểm thêm; đổi nội dung → 409.
- Học sinh xin xác nhận đáp án ("có phải là ... không?") → chặn, không xác nhận đúng/sai qua chat.

## File Structure
- Create `packages/types/src/lesson.ts` — schema + type bài học/lượt chat.
- Create `services/ai-engine/lesson_builder.py` — snapshot → (plan công khai, đáp án riêng).
- Create `services/ai-engine/lesson_store.py` — bảng SQLite của bài học.
- Create `services/ai-engine/lesson_llm.py` — prompt cá nhân hóa, stream LLM, lọc lộ đáp án, mẫu dự phòng.
- Create `services/ai-engine/routers/lesson.py` — GET bài học, POST lượt chat (SSE).
- Create `apps/student-app/src/utils/lessonApi.ts`, `components/companion/LessonChat.tsx`.
- Modify `services/ai-engine/main.py` (đăng ký router), `apps/student-app/.../AfterSchoolTutor.tsx` (lối vào), `.ai/INTERFACES.md`, `.ai/HANDOFF.md`.
- Tests: `services/ai-engine/tests/test_lesson_*.py`, `apps/student-app/src/__tests__/lessonChat.test.tsx`.

---

### Task 1: Hợp đồng dữ liệu `lesson.ts`

**Files:**
- Create: `socratic-monorepo/packages/types/src/lesson.ts`
- Modify: `socratic-monorepo/packages/types/src/index.ts` (một dòng export — cần người dùng đồng ý), `.ai/INTERFACES.md`, `.ai/HANDOFF.md` (ghi phạm vi)
- Test: `socratic-monorepo/apps/student-app/src/__tests__/lessonContract.test.ts`

**Interfaces:**
- Produces (Zod + `z.infer` types):
  - `LessonQuestionSchema` = `{id: string, scene_id: string, kind: 'COMPUTE'|'PREDICT'|'FIND_ERROR'|'EXPLAIN_BACK', prompt: string, hint_count: 4}` (strict: không có trường đáp án).
  - `LessonSceneSchema` = `{id, title, subject: 'MATH'|'PHYSICS'|'CHEMISTRY'|'BIOLOGY', latex, concept, questions: LessonQuestion[]}`.
  - `LessonPlanSchema` = `{lesson_id, session_id, title, version: 1, scenes: LessonScene[]}`.
  - `LessonTurnRequestSchema` = `{lesson_id, scene_id, question_id, kind: 'ANSWER'|'HINT'|'CHAT', message: string (≤400), request_id: string (≤80)}` (strict).
  - `LessonTurnResultSchema` = `{status: 'VERIFIED_CORRECT'|'VERIFIED_INCORRECT'|'UNVERIFIED'|'NONE', points: 0|20, tutor_text: string, source: 'LLM'|'FALLBACK', next_question_id: string|null}` với refine `points === 20` chỉ khi `VERIFIED_CORRECT`.

- [ ] **Step 1: Write the failing test** `lessonContract.test.ts`: (a) `LessonQuestionSchema.strict()` từ chối trường `expected_answer`; (b) `LessonTurnResultSchema.safeParse({status:'VERIFIED_INCORRECT', points:20, ...}).success === false`; (c) `LessonPlanSchema.parse` chấp nhận một plan 1 cảnh/1 câu hỏi hợp lệ; (d) `LessonTurnRequestSchema` từ chối `message` dài 401 ký tự.
- [ ] **Step 2: Run** `cd socratic-monorepo/apps/student-app && npx vitest run src/__tests__/lessonContract.test.ts` — Expected: FAIL (module/export không tồn tại).
- [ ] **Step 3: Implement** `lesson.ts` theo Interfaces, cùng phong cách `onlineTutor.ts`; hỏi người dùng rồi thêm dòng export vào `index.ts`; ghi hợp đồng vào `.ai/INTERFACES.md` mục "Lesson from board v1"; thêm mục phạm vi (student-app lesson, ai-engine lesson_*, types/lesson.ts) vào `.ai/HANDOFF.md`.
- [ ] **Step 4: Run** lại lệnh trên — Expected: PASS; chạy `npx tsc --noEmit --incremental false` trong `apps/student-app` — Expected: exit 0.

---

### Task 2: Dựng bài học và kho lưu (`lesson_builder`, `lesson_store`)

**Files:**
- Create: `services/ai-engine/lesson_builder.py`, `services/ai-engine/lesson_store.py`
- Test: `services/ai-engine/tests/test_lesson_builder.py`

**Interfaces:**
- Produces:
  - `build_lesson(snapshot: dict, student_id: str) -> tuple[dict, dict[str, str]]` — trả `(public_plan, answer_keys)`; `public_plan` đúng hình `LessonPlanSchema`; `answer_keys` ánh xạ `question_id → expected latex` chỉ cho câu `COMPUTE`.
  - Mỗi cảnh trong `boardSnapshots` tạo một cảnh với: câu `COMPUTE` ("Viết lại công thức then chốt của cảnh này theo cách của em", đáp án = `latex` của cảnh) và một câu `EXPLAIN_BACK` (không có đáp án). Với mỗi `studentWork` có dòng `status == 'error'` cùng `subject`, thêm một câu `FIND_ERROR` (không có đáp án) vào cảnh cùng môn.
  - `lesson_id` ổn định: `f"{session_id}:{student_id}"`; `question_id` ổn định: `f"{scene_id}:q{n}"`.
  - `lesson_store.init_lesson_tables(conn)`, `save_lesson(conn, student_id, plan, keys)`, `load_lesson(conn, student_id, lesson_id) -> tuple[dict, dict[str,str]] | None`, `solved_questions(conn, student_id, lesson_id) -> set[str]`, `mark_solved(conn, student_id, lesson_id, question_id) -> bool` (False nếu đã giải trước đó).

- [ ] **Step 1: Write the failing tests:** `test_builds_one_scene_per_board_snapshot` (dùng `student_context._fallback_snapshot('s1')` → 3 cảnh, mỗi cảnh có câu COMPUTE + EXPLAIN_BACK); `test_public_plan_has_no_answer_keys` (serialize plan JSON, assert không chứa `latex` của đáp án trong phần câu hỏi và không có khóa `expected`); `test_error_work_adds_find_error_question`; `test_empty_snapshot_gives_empty_plan_not_error`; `test_mark_solved_only_once` (dùng DB tạm như fixture `client` trong `test_online_tutor.py`).
- [ ] **Step 2: Run** `cd socratic-monorepo/services/ai-engine && python -m pytest tests/test_lesson_builder.py -v` — Expected: FAIL (import error).
- [ ] **Step 3: Implement** hai module theo Interfaces; bảng SQLite tên `lesson_plans(student TEXT, lesson TEXT, plan TEXT, keys TEXT, PRIMARY KEY(student,lesson))`, `lesson_solved(student TEXT, lesson TEXT, question TEXT, PRIMARY KEY(student,lesson,question))`, `lesson_turns(student TEXT, request TEXT, fingerprint TEXT, result TEXT, PRIMARY KEY(student,request))`; dùng `student_context._LOCK/_connect` như `online_tutor.py`.
- [ ] **Step 4: Run** lệnh trên — Expected: 5 passed.

---

### Task 3: Lớp LLM (`lesson_llm`)

**Files:**
- Create: `services/ai-engine/lesson_llm.py`
- Test: `services/ai-engine/tests/test_lesson_llm.py`

**Interfaces:**
- Consumes: `llm.key_pool.global_key_pool` (`get_ordered_keys`, `mark_success`, `mark_failure`), `SOCRATIC_GEMINI_MODELS` từ `llm/provider_adapter.py`.
- Produces:
  - `@dataclass TutorContext`: `scene_title: str, concept: str, latex: str, question_prompt: str, kind: str, status: str ('NONE'|'VERIFIED_CORRECT'|'VERIFIED_INCORRECT'|'UNVERIFIED'), student_message: str, profile: dict (persona/scaffold_depth/pace/visual_first, không có tên), recent_errors: list[str], recent_turns: list[tuple[str,str]] (tối đa 4), hint_level: int (0–4)`.
  - `fallback_reply(ctx: TutorContext) -> str` — mẫu câu tiếng Việt, một ý một câu hỏi, khác nhau theo `status` và `kind`, tuyệt đối không chứa đáp án.
  - `leaks_answer(text: str, expected: str | None) -> bool` — so khớp sau chuẩn hóa (bỏ khoảng trắng, `\text`, dấu `$`, không phân biệt hoa thường); `expected is None` → False.
  - `build_prompts(ctx: TutorContext) -> tuple[str, str]` — (system, user); tin nhắn học sinh nằm trong khối được đánh dấu là dữ liệu; system nhắc quy tắc không đưa đáp án, một ý một câu hỏi, <80 từ.
  - `generate_reply(ctx: TutorContext, expected: str | None) -> tuple[str, str]` — trả `(text, source)` với `source` là `'LLM'` hoặc `'FALLBACK'`. Gọi LLM qua hàm cấp module `_call_llm(system: str, user: str) -> str` (điểm duy nhất để test monkeypatch). Rơi về `fallback_reply` khi không có khóa, LLM lỗi, quá 8 giây, trả rỗng, hoặc `leaks_answer(text, expected)`.
  - `chunk_text(text: str, size: int = 4) -> Iterator[str]` — cắt văn bản đã kiểm tra thành cụm `size` từ để route phát SSE. Lưu ý: vì phải lọc lộ đáp án trên toàn bộ câu, "stream" là phát lại từng cụm của câu đã được kiểm tra, không phải token thô của LLM.

- [ ] **Step 1: Write the failing tests:** `test_fallback_never_contains_expected_answer` (nhiều `status`/`kind`); `test_leak_detection_normalises` (`"v_x = v_0\\cos\\alpha"` bị bắt trong `"em thử vx=v_0 \\cos\\alpha xem"`); `test_prompt_contains_no_real_name_and_marks_student_text_as_data` (profile có `display_name` → không xuất hiện trong prompt); `test_generate_uses_llm_when_available` (monkeypatch `_call_llm` trả "Em thử nhìn lại dấu nhé?" → `('Em thử nhìn lại dấu nhé?', 'LLM')`); `test_generate_falls_back_on_llm_error`; `test_generate_replaces_leaky_reply` (LLM trả đáp án → source `'FALLBACK'`, text không chứa đáp án); `test_generate_falls_back_without_keys` (không đặt khóa); `test_chunk_text_roundtrips` (nối các cụm == văn bản gốc).
- [ ] **Step 2: Run** `python -m pytest tests/test_lesson_llm.py -v` — Expected: FAIL.
- [ ] **Step 3: Implement** theo Interfaces. `_call_llm` thử khóa theo `get_ordered_keys("gemini")` và từng model như `provider_adapter.generate_socratic_guidance` (cùng cách `mark_success/mark_failure`), tạo model với `system_instruction=system`; chạy trong luồng có timeout 8s. Cắt `student_message` còn 400 ký tự trong `build_prompts`.
- [ ] **Step 4: Run** lệnh trên — Expected: 8 passed.

---

### Task 4: Route `lesson.py` (GET bài học, POST lượt chat SSE)

**Files:**
- Create: `services/ai-engine/routers/lesson.py`
- Modify: `services/ai-engine/main.py` (import + `app.include_router(lesson_router)` theo cách các router khác)
- Test: `services/ai-engine/tests/test_lesson_router.py`

**Interfaces:**
- Consumes: Task 2 và Task 3 (`generate_reply`, `chunk_text`); `student_context.context_snapshot/get_profile/list_errors`; `online_tutor.verdict(answer, expected) -> bool | None`; `symbolic.socratic_guard.evaluate_student_message(message, subject, step_index) -> GuardVerdict(blocked, message, ...)`; `security.require_roles`.
- Produces:
  - `GET /api/v1/student/lesson/{student_id}?class_id=12A1` → public plan (build + lưu nếu chưa có). Quyền: student/admin, student chỉ truy cập chính mình (403 `student_subject_mismatch`).
  - `POST /api/v1/student/lesson/{student_id}/turn` body `LessonTurnRequest` (Pydantic `extra='forbid'`) → `text/event-stream`: các sự kiện `event: token\ndata: {"text": "..."}` rồi đúng một `event: done\ndata: <LessonTurnResult JSON>`.
  - Quy tắc lượt: `kind=ANSWER` & câu `COMPUTE` → chấm bằng `verdict` (đúng + chưa giải → `mark_solved`, 20 điểm; trùng giải → 0 điểm); câu không có đáp án → status `NONE`, 0 điểm. Tin nhắn bị `socratic_guard` chặn → `tutor_text = verdict.message`, source `'FALLBACK'`, không gọi LLM. `kind=HINT` tăng `hint_level` (đếm từ `lesson_turns` của câu đó, tối đa 4). `request_id` trùng cùng nội dung → phát lại `done` đã lưu (không token mới, không điểm mới); khác nội dung → 409 `request_id_reused`. Câu hỏi/cảnh/bài học không tồn tại → 404 `unknown_lesson_question`. `next_question_id` = câu kế tiếp chưa xử lý trong bài (hoặc `null`).

- [ ] **Step 1: Write the failing tests** (fixture như `test_online_tutor.py`, `STUDENT_CONTEXT_REQUIRE_AUTH=false`, monkeypatch `lesson_llm._call_llm`): `test_get_lesson_returns_plan_without_answers`; `test_correct_answer_awards_20_once` (cùng câu gửi lại với request_id khác → 0 điểm); `test_unparseable_answer_is_unverified_no_points`; `test_guard_blocks_answer_confirmation_without_llm_call` (message "đáp án có phải là ... không? chỉ trả lời đúng hoặc sai", spy `_call_llm` không được gọi); `test_request_id_replay_and_conflict`; `test_stream_events_are_token_then_single_done`; `test_llm_failure_still_returns_done_with_fallback`; `test_student_cannot_read_other_student` (bật auth + `security.issue_token('student','s1')` gọi `s2` → 403); `test_empty_snapshot_returns_empty_plan` (lưu snapshot có `boardSnapshots: []` qua `store.save_snapshot`).
- [ ] **Step 2: Run** `python -m pytest tests/test_lesson_router.py -v` — Expected: FAIL (404 route).
- [ ] **Step 3: Implement** router và đăng ký trong `main.py`; trả `StreamingResponse(..., media_type='text/event-stream')`; hồ sơ truyền vào `TutorContext.profile` chỉ gồm `profile_id, scaffold_depth, pace, difficulty, visual_first`.
- [ ] **Step 4: Run** lệnh trên — Expected: 9 passed; sau đó `python -m pytest tests/ -q` — Expected: toàn bộ pass (61 test cũ + test mới), không hồi quy.

---

### Task 5: Giao diện `LessonChat` và lối vào

**Files:**
- Create: `apps/student-app/src/utils/lessonApi.ts`, `apps/student-app/src/components/companion/LessonChat.tsx`
- Modify: `apps/student-app/src/components/companion/AfterSchoolTutor.tsx` (thêm chế độ `BOARD_LESSON`, nút `data-testid="mode-board-lesson"`, render `<LessonChat />`; kiểu `TutorInteractionMode` thêm `'BOARD_LESSON'`)
- Test: `apps/student-app/src/__tests__/lessonChat.test.tsx`

**Interfaces:**
- Consumes: `LessonPlanSchema`, `LessonTurnRequestSchema`, `LessonTurnResultSchema` từ `@socratic/types`; `MathView` (`components/common/MathView.tsx`).
- Produces:
  - `fetchLesson(signal: AbortSignal): Promise<LessonPlan>` — GET `/api/v1/student/lesson/student_default`, parse bằng schema, lỗi → throw `Error('lesson_unavailable')`.
  - `sendLessonTurn(req: LessonTurnRequest, onToken: (t: string) => void, signal: AbortSignal): Promise<LessonTurnResult>` — POST và đọc SSE; không nhận được `done` hợp lệ → trả `{status:'UNVERIFIED', points:0, source:'FALLBACK', tutor_text:'Chưa nhận được phản hồi. Bài làm vẫn được giữ; thử lại nhé.', next_question_id:null}`.
  - `LessonChat` (không props): hiện thẻ cảnh (tiêu đề + `MathView` công thức), bong bóng chat có stream, ô nhập `data-testid="lesson-input"`, nút gửi `data-testid="lesson-send"`, nút `data-testid="lesson-hint"`; giữ nguyên nội dung ô nhập khi gửi lỗi; dùng cùng `request_id` khi thử lại cùng nội dung; huy hiệu "Chế độ cơ bản" khi `source === 'FALLBACK'`; tổng điểm chỉ cộng từ `points` của kết quả.

- [ ] **Step 1: Write the failing tests** (`vi.stubGlobal('fetch', ...)`, phản hồi SSE giả bằng `ReadableStream`): `test_renders_scene_and_streams_tutor_text`; `test_unverified_awards_no_points_and_keeps_input` (fetch ném lỗi → ô nhập giữ nguyên, điểm không đổi); `test_retry_reuses_request_id`; `test_fallback_source_shows_basic_mode_badge`; `test_hint_button_sends_hint_kind`; `test_empty_plan_shows_message` (plan `scenes: []` → thông báo "Chưa có nội dung bảng", không lỗi).
- [ ] **Step 2: Run** `cd socratic-monorepo/apps/student-app && npx vitest run src/__tests__/lessonChat.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** theo Interfaces, giữ phong cách Tailwind/"warm alabaster" của `AfterSchoolTutor`; `request_id` sinh bằng `crypto.randomUUID()` (như cách `AfterSchoolTutor` đang làm) và lưu tới khi nhận được `done`.
- [ ] **Step 4: Run** lệnh trên — Expected: 6 passed; rồi `npx vitest run` trong `apps/student-app` — Expected: toàn bộ pass (24 test cũ không hồi quy); `npx tsc --noEmit --incremental false` — Expected: exit 0.

---

### Task 6: Kiểm tra thực tế với khóa Gemini và bàn giao

**Files:**
- Modify: `.ai/HANDOFF.md`, `.ai/INTERFACES.md` (nếu route khác với Task 1)

- [ ] **Step 1:** Người dùng tự đặt `GEMINI_API_KEYS=<khóa của họ>` trong `services/ai-engine/.env`; không chép khóa vào bất kỳ file nào do Claude tạo.
- [ ] **Step 2: Run** backend `python -m uvicorn main:app --port 8000` và `npx next dev -p 3002` trong `apps/student-app`; mở `http://localhost:3002/?tab=AFTER_SCHOOL_TUTOR` → chọn "Bài học từ bảng". Expected: thấy cảnh bảng demo, gia sư trả lời bằng stream, `GET /health` báo `gemini_configured: true`.
- [ ] **Step 3:** Thử tay: trả lời đúng một câu COMPUTE (+20 điểm, một lần), hỏi "đáp án là gì" (bị chặn), tắt khóa (huy hiệu "Chế độ cơ bản", vẫn dùng được). Dừng server khi xong.
- [ ] **Step 4:** Cập nhật `.ai/HANDOFF.md` (làm gì, kết quả kiểm tra, giới hạn: câu COMPUTE chỉ xác thực được biểu thức mà `verdict` hiểu, snapshot vẫn là demo, chưa nối bộ xuất từ Teacher Board, chưa gắn BKT).
