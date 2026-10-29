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
