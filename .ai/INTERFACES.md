# Shared Interfaces and Contracts

Canonical source: `socratic-monorepo/packages/types/src/index.ts`, re-exported by the package barrel. Do not duplicate these definitions inside apps or services.

## Feature 1 Contracts (Bảng Tương Tác Thông Minh Trên Lớp)

- `SimulationBlueprint`, `SimParamConfig`, `EngineType`, `CurriculumLevel`, and `TemplateId` in `packages/types/src/simulation.ts` describe the interactive STEM simulation payload consumed by teacher-board engines and widgets.
- `SimulationBlueprintSchema` and `SimParamConfigSchema` in `packages/types/src/schemas.ts` validate the runtime payload.
- `UnifiedLassoResponse`, `OCRResult`, `SimulationBlueprintCore`, and `SocraticCue` in `packages/types/src/index.ts` describe the lasso-to-simulation and handwriting recognition response.
- `CanvasStrokePoint`, `CanvasStroke`, and `CanvasState` define the drawing and temporal scene chunking state used by teacher-board.
- `SandboxEvent` defines variable synchronization events over realtime channels.

## Feature 2 Contracts (Gia Sư AI Socratic & Nền Tảng Tự Học Sau Giờ Học)

- `SocraticStepEvaluation`, `StepStatus`, `VerificationSource`, `ErrorCategory`, and `VisualDebuggerConfig` define companion evaluation and visual debugger results (Chemical Balance, Force Polygon, Extrema Tangent, Osmosis Pressure).
- `User`, `ScaffoldingStep`, `SocraticSession`, and `KnowledgeHeatmapNode` define student session, BKT state, and teacher heatmap data.
- `SocraticStepEvaluationSchema` is the runtime validator for evaluation responses.

## Canvas and realtime

- `CanvasStrokePoint`, `CanvasStroke`, and `CanvasState` define the shared drawing state used by teacher-board and the realtime gateway.
- `SandboxEvent` defines variable synchronization events over Socket.IO.
- `StrokePointSchema`, `StrokeSchema`, and `CanvasStateSchema` validate serialized canvas state.

## Lesson notes (lời giảng cho vi bài giảng)
- `POST /api/v1/canvas/lesson-notes` (`services/ai-engine/routers/lesson_notes.py`): nhận `{title, subject_hint?, sections:[{title, moments:[{kind,label,detail,t}]}]}` (≤12 phần, ≤12 mục/phần), khóa AI qua tiêu đề `x-gemini-api-key` / `x-openrouter-api-key` như ask-board. Trả `{notes:{summary, narrations[i], key_points, review_questions}|null, source: gemini|openrouter|offline, model, note?}`. `notes = null` khi không có AI: KHÔNG sinh lời giảng cục bộ. Lời nhắc cấm thêm số liệu/kiến thức ngoài dàn bài; kết quả được lọc theo chỉ số phần và độ dài. Client: `utils/lessonNotes.ts`, dùng trong `MicroLessonPanel`.

## Board Q&A (hỏi đáp hiểu ngữ cảnh bảng)
- `POST /api/v1/canvas/ask-board` (`services/ai-engine/routers/board_qa.py`), bị giới hạn tần suất như `recognize-ink`.
- Vào: `{question ≤ 600, context: BoardContext, history ≤ 6 lượt {q,a}, subject_hint?}`; khóa AI qua tiêu đề `x-gemini-api-key` / `x-openrouter-api-key`.
- `BoardContext` (`apps/teacher-board/src/utils/boardContext.ts`): `items[]` (formula | plane | solid | ink; số đo hình theo TÊN: `sides_named`, `angles_named`), `selection.item_ids`, `simulation {templateId, params hiện tại, parameters, meta}`, `subject`.
- Ra: `{answer: {steps, headline, formula_latex, highlights, follow_ups, actions[{type:'visualize',label,text}], clarify, used}, source: gemini|openrouter|offline, model, note?}`.
  `actions` chỉ nhận `visualize` (chuyển cho bộ định tuyến cục bộ của bảng); `highlights`/`used` chỉ giữ tên và id có thật trong `context`.
- Chữ trên bảng là dữ liệu, không phải lệnh (lời nhắc dặn bỏ qua chỉ dẫn trong BẢNG_JSON). Không có khóa/mô hình lỗi → `source: offline`, chỉ đọc số đo có sẵn.

## Pilot data

- `PILOT` and `vn` are exported from `packages/types/src/pilot.ts`; source data is `pilot2026.json`.
- Pilot claims must remain sourced from this package and must not be redefined in presentation or app code.

## Transport owners

- Socket.IO namespace and event wiring: `services/api-gateway/src/sockets/sandboxGateway.ts`.
- HTTP bootstrap and health/proxy routes: `services/api-gateway/src/index.ts`.
- Python AI routes and domain adapters: `services/ai-engine/routers`, `cache`, `llm`, and `symbolic`.

Any contract change must update its source type, runtime schema (when applicable), all consumers, and this document in the same change.

## Online tutor catalog v1
- Server owner: services/ai-engine/routers/online_tutor.py.
- POST /api/v1/student/tutor/{student_id}/attempts accepts problem_id, step (1-based), answer, request_id only.
- Returns status (VERIFIED_CORRECT / VERIFIED_INCORRECT / UNVERIFIED), points, mastery, completed_step, catalog_version, feedback.
- Reusing request_id with a changed body returns 409. Future steps return 409. Extra answer-key fields return 422.
- Currently consumed by Student App AfterSchoolTutor; legacy companion uses its existing evaluation contract.

- GET /api/v1/student/tutor/{student_id}/progress returns OnlineTutorProgress (packages/types/src/index.ts): catalog_version, total_points for catalog steps, problems with problem_id/kc_id/step_count/completed_step/mastery; no answer keys. Same student subject guard as attempts.

## Lesson from board v1 (Mode 2)
- Contract: `packages/types/src/lesson.ts` (`LessonPlan`, `LessonScene`, `LessonQuestion`, `LessonTurnRequest`, `LessonTurnResult`), re-exported through `onlineTutor.ts` so `index.ts` is untouched. Questions are `.strict()` and never carry an answer key.
- Server owner: `services/ai-engine/routers/lesson.py` (+ `lesson_builder.py`, `lesson_store.py`, `lesson_llm.py`).
- `GET /api/v1/student/lesson/{student_id}?class_id=` builds the lesson from the class snapshot (`context_snapshot`) and returns the public plan. A scene's `latex` is empty until its COMPUTE question is solved.
- `POST /api/v1/student/lesson/{student_id}/turn` takes `lesson_id, scene_id, question_id, kind (ANSWER|HINT|CHAT), message (<=400), request_id`; extra fields -> 422. Returns `text/event-stream`: `event: token` chunks then one `event: done` with `LessonTurnResult`. Same `request_id` + same body replays; changed body -> 409. Unknown lesson/question -> 404. Student role is bound to its own `student_id` (403).
- Grading is server-side (`online_tutor.verdict`): 20 points once per COMPUTE question; unparseable -> `UNVERIFIED`, 0 points. The LLM (Gemini via `llm.key_pool`) only words the reply; leaks are filtered and a canned reply covers every failure (`source: FALLBACK`).

## Classroom snapshot v1 (Mode 1 -> Mode 2)
- Contract: `ClassroomSnapshotSchema` / `ClassroomBoardSnapshotSchema` in `packages/types/src/lesson.ts` (re-exported through `onlineTutor.ts`). Producer: Teacher Board `utils/classroomSnapshot.ts` (`buildClassroomSnapshot`, `publishClassroomSnapshot`), triggered by the "Gửi cho học sinh" button of `MicroLessonPanel`. Consumer: `services/ai-engine/lesson_builder.py` (and the Student App workbench, which reads the same shape).
- `PUT /api/v1/student/snapshot` body `{class_id, snapshot}` (teacher/admin role; max 40 `boardSnapshots`, else 422). Teacher Board sends `Authorization: Bearer $NEXT_PUBLIC_TEACHER_CONTEXT_TOKEN` when that variable is set; with `STUDENT_CONTEXT_REQUIRE_AUTH=true` the token is required.
- Mapping: one micro-lesson section -> one `boardSnapshot` (`id` `sec-N`, `latex` = first formula of the section or empty, `note` = AI narration if the teacher pressed "AI viết lời giảng", else a plain list of the figures/simulations shown, `subject` inferred per section because the journal header only says `STEM`). `summary`, `keyPoints`, `reviewQuestions` are present only when the teacher generated AI notes.
- Mode 2 turns a section with a `latex` into a COMPUTE question (key kept server-side); each `reviewQuestions` entry becomes a free-form EXPLAIN_BACK question spread round-robin over the scenes. `sessionId` is `lesson-<yyyymmdd>-<hash of title>`, so republishing the same lesson the same day keeps the same lesson id (and its solved questions); a different title or day starts a new lesson.
- Student App reads class `12A1` (the `class_id` default); Teacher Board publishes to `12A1`. There is no class selection yet.

## Hub v1 (tam giác: portal giáo viên · bảng lớp · Socratic app)
- Spec: `docs/superpowers/specs/2026-10-29-tam-giac-he-thong-design.md`. Server: `services/ai-engine/hub/*` + `routers/hub_*.py`, tiền tố `/api/v1/hub`. Hợp đồng TS: `packages/types/src/hub.ts` (import `@socratic/types/src/hub` cho tới khi barrel `index.ts` được phép thêm dòng export). Bản Python: `hub/schemas.py`.
- Token: HMAC `security.issue_token`, vai trò `teacher` (8 giờ), `student` (8 giờ), `board` (subject = id tiết, 12 giờ, hết hiệu lực khi tiết đóng). Hub LUÔN kiểm `Authorization: Bearer`, kể cả khi `STUDENT_CONTEXT_REQUIRE_AUTH=false`; production với secret mặc định/ngắn → 503 `hub_secret_not_configured`. Phụ huynh dùng token ngẫu nhiên trong URL. Tài nguyên của giáo viên khác → 404.
- Đăng nhập: `POST /auth/teacher {teacherId, pin}` (5 lần sai/60 s → 429), `POST /auth/student {loginCode}`.
- Đỉnh 1 (teacher): `GET /me/teacher`, `GET|POST /classes/{cid}/students {names[]}`, `POST /students/{sid}/parent-link`, `GET|POST /plans {body}`, `GET /plans/{pid}`, `PUT /plans/{pid} {body, baseVersion}` (409 `version_conflict`; body không đổi → giữ version; đáp án đề bài máy không chấm được → 422 `answer_not_gradable`).
- Cạnh 1↔2: `POST /pairings {boardId?}` → `{code, boardId, boardSecret, expiresAt}` (120 s); bảng mở `GET /stream/pairing/{code}` với `Authorization: Board-Secret <secret>` (401/410); điện thoại `POST /pairings/{code}/claim {classId, planId}` (teacher; 410 khi hết hạn/đã dùng) → luồng chờ nhận `paired` (có `boardToken`, giáo án đã bỏ đáp án). Bảng: `GET /stream/board` (`plan_updated`, `session_closed`), `GET /sessions/{sid}/plan`. Lời giảng AI: `POST /api/v1/canvas/lesson-notes` nhận thêm `teacher_context` (= `boardContext` của giáo án).
- Cạnh 2→3: `POST /sessions/{sid}/package {requestId, package: KnowledgePackage kp/2}` (board; bọc `ClassroomSnapshot` v1 + `sections[{boardSnapshotId, planSectionId, kcIds}]`, `polls`, `usedItemIds`); cùng `requestId` → kết quả cũ; khác sau khi đóng → 409; > 256 KB → 413; `planId`/`planVersion`/phần/KC không khớp giáo án của tiết → 422. Hub đóng tiết và ghi snapshot cho lớp, giữ `sessionId` của bảng (luồng Mode 2 cũ vẫn chạy không cần token hub).
- Đỉnh 3: `GET /me/lessons` (student) liệt kê tiết đã có gói; bài học dùng route Mode 2 `GET /api/v1/student/lesson/{student_id}?session_id=<sid>` (bắt buộc token student của hub; `lesson_id` dạng `hub:<sid>:<student>`, không đụng bài học cũ của lớp) và `POST .../turn`. Câu hỏi từ giáo án: đề bài có đáp án → COMPUTE, poll có đáp án đúng → PREDICT (đáp án chỉ ở máy chủ). Mỗi lượt ANSWER/HINT của tiết hub → `learning_events` + BKT `mastery` + `metric_delta`.
- Cạnh 3→1: `GET /classes/{cid}/metrics`, `GET /classes/{cid}/students/{sid}/metrics`, `GET /plans/{pid}/sections/{secid}/metrics?classId=`, `GET /stream/teacher` (`metric_delta`). AI đề xuất: `POST /plans/{pid}/sections/{secid}/suggestions {classId}` (tối đa 3, đã kiểm schema; không có AI → `[]`, `source: offline`), `POST /plans/{pid}/suggestions/{sgid}/apply` → version mới (`reason: suggestion:<id>`).
- Cạnh 3→phụ huynh: `GET /parent/{token}/report` (không đăng nhập; chốt tuần trước kiểu lazy; `Referrer-Policy: no-referrer`), `POST /students/{sid}/reports` (teacher, chốt tuần hiện tại). Tuần ISO giờ VN.
- Luồng sự kiện: `text/event-stream`, mỗi sự kiện `data: <json>`, nhịp `: ping` 15 s; client đọc bằng `fetch` để gửi header (không dùng EventSource với token trên URL). Một tiến trình, bus trong bộ nhớ.
