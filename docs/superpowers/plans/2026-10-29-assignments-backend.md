# Bài tập trong tiết — Backend hub (bước 1/5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toàn bộ API của vòng bài tập trong hub: nối console, bài tập (tải PDF/ảnh, AI tách câu, tự khai, version, ngân hàng), lượt giao + QR, bài nộp 4 loại câu với OCR có xác nhận, quy tắc chắc chắn, duyệt của giáo viên, chiếu và chữa, bài về nhà, sự kiện học tập, chỉ số theo lượt giao, gói cho đỉnh 3, hợp đồng `assignments.ts`.

**Architecture:** Gói mới `services/ai-engine/hub/assignments/` (mỗi tệp một việc) dùng chung SQLite, bus sự kiện, `learning_events`/mastery của hub. Router mỏng `routers/hub_assignments.py` (giáo viên), `routers/hub_runs.py` (lượt giao, bài nộp cho giáo viên/bảng/học sinh), `routers/hub_files.py`. Hub nhận token phiên console và `X-Board-Token` của console, không sửa luồng cũ của `routers/console.py`.

**Tech Stack:** Python 3.9, FastAPI, SQLite, Pillow, `pypdfium2` (thêm vào `requirements.txt`), pytest; TypeScript + Zod cho hợp đồng.

**Spec:** `docs/superpowers/specs/2026-10-29-bai-tap-trong-tiet-design.md`

**Phạm vi so với spec mục 12:** plan này làm toàn bộ phần backend của bước 1 **và** phần backend của mục 7 (gói đỉnh 3, `?run_id=`, chỉ số theo lượt giao, dòng báo cáo phụ huynh), để các bước 2–4 chỉ còn giao diện. Bước 5 còn lại: e2e và tài liệu kiến trúc.

## Global Constraints

- Python 3.9: không `X | Y`, không `match`; model pydantic dùng `Optional`/`List`/`Dict`.
- Mọi id mới `[a-z0-9-]`; mã lượt giao 8 ký tự từ bảng `23456789ABCDEFGHJKMNPQRSTUVWXYZ`.
- Tiền tố route `/api/v1/hub`; lỗi `HTTPException(status, detail="<snake_case>")`; tài nguyên của giáo viên khác → 404.
- Thời gian qua `hub.clock.now()`; DB qua `hub.db.connect()`; tệp ảnh dưới `hub.db.db_path().parent / "assignments"` và `/ "submissions"` (tự cách ly trong test theo DB tạm).
- Loại câu: `choice` | `short` | `essay` | `open`. 1–40 câu mỗi bài; `choice` 2–6 phương án; nội dung câu ≤ 2000 ký tự.
- `answer`: bắt buộc với `choice` (chỉ số dạng `"0"`…), `short`, `essay`; cấm với `open`; `short`/`essay` phải `check_formula(a, a) is True`. Không bao giờ có trong phản hồi cho bảng/học sinh.
- Tải lên ≤ 15 MB; PDF ≤ 20 trang, mỗi trang render cạnh dài 1600 px JPEG q=82; ảnh vở sau nén ≤ 2 MB nhận ở máy chủ (app nén về ≤ 400 KB).
- AI tách câu ≤ 60 s, AI chấm từng bước ≤ 60 s (chạy nền); không AI → không bịa (tách câu trả `[]`, `source: "offline"`).
- Trạng thái bài nộp: `graded` | `pending_teacher` | `teacher_confirmed`; chỉ `graded`/`teacher_confirmed` ghi sự kiện + mastery. Điểm câu 0–1; `graded` = 1/0.
- Hạn bài về nhà mặc định = lúc đóng + 3 ngày (259200 s).
- Bảng không bao giờ nhận tên hay id học sinh; nhãn "Bài n" theo thứ tự lần nộp đầu tiên.
- Sự kiện học tập: `session_id` = id lượt giao, `section_id` = `asg:{assignmentId}`, `item_id` = `{runId}:{questionId}`.
- Test: không gọi mạng — monkeypatch `hub.assignments.vision.vision_json`, `hub.assignments.ocr.recognize_image`, `hub.assignments.grader.grade_lines`, và `hub.assignments.jobs.spawn` (chạy đồng bộ).
- Chạy test từ `socratic-monorepo/services/ai-engine`: `python -m pytest tests -q -p no:cacheprovider`.

## Review Focus

1. **Token console và token hub cùng lúc**: một chuỗi token console tình cờ có dấu `.` không được làm hub trả 401 sai. Test: `test_console_session_token_with_dots_still_accepted` (Task 1).
2. **Học sinh đã vào bài rồi giáo viên sửa đề**: bài nộp phải ghi đúng version học sinh đang thấy và chấm theo đáp án của version đó. Test: `test_submission_grades_against_its_version` (Task 6).
3. **Tiết console kết thúc khi lượt giao còn mở**: học sinh quét QR ngay sau đó phải vào chế độ bài về nhà, không bị 410. Test: `test_period_end_turns_run_into_homework` (Task 5).
4. **Ảnh xoay/EXIF của điện thoại**: ảnh chụp dọc lưu đúng chiều (Pillow `ImageOps.exif_transpose`) để vị trí dòng đỏ khớp ảnh. Test: `test_photo_respects_exif_orientation` (Task 7).
5. **Nộp xác nhận mà vẫn còn ô không chắc**: 422 `uncertain_unresolved`, không lưu. Test: `test_confirm_rejects_unresolved_uncertain` (Task 7).

---

## File Structure

```
services/ai-engine/
  requirements.txt                       # + pypdfium2
  routers/grade_steps.py                 # + grade_lines() (route giữ nguyên hành vi)
  hub/auth.py                            # claims_from_header nhận phiên console cho vai trò teacher
  hub/db.py                              # + bảng mới trong SCHEMA
  hub/assignments/
    __init__.py
    bridge.py      # console ↔ hub: giáo viên, lớp, tiết, require_teacher_any / require_board
    schema.py      # Question, AssignmentBody, public_body(), quick_key()
    pages.py       # PDF/ảnh → trang JPEG
    vision.py      # vision_json(prompt, jpeg) — một chỗ gọi Vision
    extract.py     # AI tách câu từ trang
    store.py       # bài tập, version, trang, ngân hàng
    runs.py        # lượt giao, mã, phase, đóng, hạn, quyền
    ocr.py         # recognize_image(jpeg) → lines/uncertain
    grader.py      # chấm từng loại câu + grade_lines (gọi grade_steps)
    jobs.py        # spawn(fn) — chạy nền (thread), test thay bằng đồng bộ
    submissions.py # nộp, xác nhận, duyệt, chữa, sự kiện, nhãn ẩn danh
    files.py       # lưu/đọc tệp, kiểm quyền
    metrics.py     # chỉ số theo lượt giao, gói học sinh
  routers/hub_assignments.py  routers/hub_runs.py  routers/hub_files.py
  routers/lesson.py           # + ?run_id=
  hub/reports.py              # + dòng bài tập
  hub/metrics.py              # total cộng câu của lượt giao
  tests/test_asg_*.py
packages/types/src/assignments.ts + __tests__/assignments.test.ts
```

---

### Task 1: Nối console ↔ hub (danh tính giáo viên, lớp, tiết, bảng)

**Files:** Create `hub/assignments/__init__.py`, `hub/assignments/bridge.py`; Modify `hub/auth.py`, `hub/db.py` (bảng `console_links`, `class_links`); Test `tests/test_asg_bridge.py`.

**Interfaces — Produces:**
- `bridge.hub_teacher_for_console(console_teacher: dict) -> str` — tạo nếu chưa có: hub teacher id `ct-{console_id[:24]}` (chuẩn hóa về `[a-z0-9-]`), `name` = `display_name`, `pin_hash=""`, `pin_salt=""` (không đăng nhập PIN được).
- `bridge.link_class(hub_teacher_id: str, console_class: dict) -> str` — hub class id `cc-{console_class_id[:24]}`, tên/môn lấy từ lớp console; idempotent.
- `bridge.board_context(board_token: str) -> dict` → `{period, consoleTeacherId, hubTeacherId, hubClassId}` (`hubClassId` None nếu tiết chưa có lớp); không có tiết live → `KeyError`.
- `bridge.period_status(console_teacher_id, period_id) -> Optional[dict]` (`status`, `ended_at`).
- `hub.auth.claims_from_header`: với vai trò `teacher`, Bearer không phải token hub (không bắt đầu `v1.` hoặc `verify_token` lỗi) → thử `console_db.db().session_teacher(token)` → `{"role": "teacher", "subject": hub_teacher_id, "console": console_id}`.
- Dependency `bridge.require_board()` → `board_context` từ header `X-Board-Token` (401 `board_not_paired` khi không có tiết live).
- Route `POST /api/v1/hub/console/classes/{consoleClassId}/link` (giáo viên console) → `{hubClassId}`; lớp không của giáo viên → 404.

- [ ] **Step 1: Test thất bại** (`tests/test_asg_bridge.py`; helper `console_teacher(client)` đăng ký + đăng nhập qua `/api/v1/console/register|login`):
  - `test_console_session_reaches_hub_teacher_routes`: Bearer phiên console gọi `/api/v1/hub/me/teacher` → 200, `teacher.id` bắt đầu `ct-`.
  - `test_console_session_token_with_dots_still_accepted`: monkeypatch `secrets.token_urlsafe` trong `store.console_db` trả chuỗi có dấu `.` → vẫn 200.
  - `test_link_class_creates_hub_class_once`: link hai lần → cùng `hubClassId`; `GET /api/v1/hub/classes/{hubClassId}/students` với phiên console → 200, `[]`.
  - `test_link_other_teachers_class_404`.
  - `test_board_context_from_board_token`: console tạo lớp + tiết, `/start`, bảng `POST /api/v1/board/pair` → `X-Board-Token`; `bridge.board_context(token)` có `hubTeacherId` và `hubClassId`; tiết `/end` → `KeyError`.
  - `test_hub_pin_login_impossible_for_console_teacher`: `login_teacher("ct-…", "")` → None.
- [ ] **Step 2: Chạy, xác nhận fail.** `python -m pytest tests/test_asg_bridge.py -q -p no:cacheprovider`
- [ ] **Step 3: Cài đặt** theo Interfaces; đăng ký router link trong `main.py`.
- [ ] **Step 4: Chạy lại + toàn bộ suite** — pass.
- [ ] **Step 5: Commit** `feat(hub): bridge console teachers, classes and boards into the hub`

---

### Task 2: Hợp đồng bài tập, ô tự khai, lưu version

**Files:** Create `hub/assignments/schema.py`, `hub/assignments/store.py`, `routers/hub_assignments.py`; Modify `hub/db.py` (bảng `assignments`, `assignment_versions`, `assignment_pages`), `main.py`; Test `tests/test_asg_store.py`.

**Interfaces — Produces:**
- `schema.Question` (pydantic, `extra="forbid"`): `id`, `type`, `label` (1–40), `text` (≤2000), `page: Optional[int]`, `box: Optional[List[float]]` (4 số 0–1), `options: Optional[List[str]]`, `answer: Optional[str]`, `kcs: List[KC]` (dùng `hub.schemas.KC`), `points: float = 1` (0 < points ≤ 100). Validator theo Global Constraints.
- `schema.AssignmentBody`: `title` (1–160), `subject` (`hub.schemas.Subject`), `kind` (`exercise`/`exam`), `questions` (1–40, id duy nhất).
- `schema.public_body(body: dict) -> dict` — bỏ `answer`.
- `schema.quick_key(text: str) -> List[dict]` — cú pháp: các mục ngăn bởi khoảng trắng/xuống dòng/dấu phẩy; `<n><A-F>` → `choice` (options `["A".."<chữ lớn nhất trong toàn bộ khóa, tối thiểu D>"]`, answer chỉ số); `<n>: tự luận` hoặc `<n>: ?` → `open`; `<n>: <biểu thức>` → `essay`; `<n>= <biểu thức>` → `short`. Id `q{n}`, label `Câu {n}`, text `Câu {n}`.
- `store.create_draft(teacher_id, title, subject, kind, source) -> dict` (`{id, version: 0}`), `store.save(teacher_id, aid, body, base_version) -> dict` (như `hub.plans.save_plan`: không đổi → giữ version; sai base → `VersionConflict`), `store.get(aid, version=None) -> dict` (`{id, teacherId, version, body, pages: [{page, width, height}], source}`), `store.owned(teacher_id, aid, version=None)`, `store.list(teacher_id, subject=None, q=None) -> List[dict]`, `store.add_question(aid, question: dict) -> dict` (version mới, id câu sinh mới `q-xxxxxx`).
- Ngân hàng đề = `list` + `get` (giáo viên nhận cả đáp án của bài mình); "chép câu từ bài khác" làm ở client (sinh id mới) rồi `PUT`. Không có endpoint riêng.
- Routes (giáo viên, `require_hub("teacher")`): `GET /assignments?subject=&q=`, `GET /assignments/{id}`, `PUT /assignments/{id} {body, baseVersion}` (422 schema, 409 `version_conflict`), `POST /assignments/quick-key {text}` → `{questions}`.

- [ ] **Step 1: Test thất bại**: `test_quick_key_parses_all_types` (`"1B 2C 3: x=2 4: tự luận 5= 12"` → types `[choice, choice, essay, open, short]`, `q1.answer == "1"`, options đủ A–D), `test_answer_rules` (choice thiếu answer → 422; open có answer → 422; essay `"x = 2; y = 3"` → 422), `test_save_versions_and_conflict`, `test_public_body_has_no_answers`, `test_list_filters_by_subject_and_text`, `test_other_teacher_404`.
- [ ] **Step 2–4:** fail → cài đặt → pass (+ suite).
- [ ] **Step 5: Commit** `feat(hub): assignment contract, quick answer key and versioned storage`

---

### Task 3: Tải file → trang, AI tách câu

**Files:** Create `hub/assignments/pages.py`, `hub/assignments/vision.py`, `hub/assignments/extract.py`, `hub/assignments/files.py`; Modify `requirements.txt` (+`pypdfium2`), `routers/hub_assignments.py`; Test `tests/test_asg_upload.py`.

**Interfaces — Produces:**
- `pages.render(data: bytes, content_type: str) -> List[bytes]` — PDF (`pypdfium2`, scale để cạnh dài 1600 px) hoặc ảnh (Pillow, `exif_transpose`, RGB, cạnh dài ≤ 1600); JPEG q=82. > 20 trang → `ValueError("too_many_pages")`; không đọc được → `ValueError("unreadable_file")`.
- `files.save_page(aid, n, jpeg) -> (path, w, h)`, `files.read(path) -> bytes`; thư mục theo Global Constraints.
- `vision.vision_json(prompt: str, jpeg: bytes, timeout: float) -> Optional[str]` — `call_openrouter_vision` (pool toàn cục), rồi Gemini qua `gemini_rest.generate_image` khi `gemini_vision_enabled()`; mọi lỗi → None.
- `extract.extract_questions(pages: List[bytes]) -> dict` → `{questions: List[dict], source: "ai"|"offline"}`; prompt tiếng Việt yêu cầu JSON `{"questions":[{"label","type","text","options"?, "answer"?, "box":[x,y,w,h]}]}` mỗi trang, ghi rõ "chỉ điền answer khi trang có đáp án/lời giải; không tự giải"; câu sai schema bị bỏ, `page` = chỉ số trang, id `q{k}` theo thứ tự; tổng hạn 60 s (dừng trang tiếp theo khi quá hạn).
- Routes: `POST /assignments/upload` (multipart `file` + form `title`, `subject`, `kind`; ≤ 15 MB → 413; sai loại → 415; `ValueError` → 422 với detail) → `{id, pages}` (nguồn `file` cho PDF, `photos` cho ảnh; có thể nhiều tệp ảnh: field `files`); `POST /assignments/{id}/extract` → kết quả `extract_questions` (không lưu; giáo viên lưu bằng `PUT`).

- [ ] **Step 1: Test thất bại**: `test_pdf_renders_pages` (PDF 2 trang tạo bằng Pillow `save(..., "PDF", save_all=True)` → 2 trang, cạnh dài 1600), `test_pdf_over_20_pages_422`, `test_upload_too_large_413`, `test_upload_images_respects_exif` (ảnh có EXIF Orientation=6 → trang dọc), `test_extract_keeps_valid_drops_invalid` (vision giả lập trả 3 câu, 1 sai loại → 2 câu, `page` đúng), `test_extract_offline` (vision None → `{questions: [], source: "offline"}`), `test_extract_never_invents_answer_field_for_open`.
- [ ] **Step 2–4.**
- [ ] **Step 5: Commit** `feat(hub): upload PDF or photos as assignment pages and extract questions with AI`

---

### Task 4: Ảnh và quyền tải tệp

**Files:** Create `routers/hub_files.py`; Modify `hub/assignments/files.py`; Test `tests/test_asg_files.py`.

**Interfaces — Produces:**
- `GET /api/v1/hub/files/page/{assignmentId}/{n}` — giáo viên chủ bài; bảng của tiết có giáo viên đó; học sinh có lượt giao đang mở hoặc còn hạn của bài này cho lớp mình. Khác → 404.
- Header phản hồi: `Cache-Control: private, max-age=3600`, `Content-Type: image/jpeg`.
- Dependency chung `bridge.viewer(authorization, x_board_token) -> dict` (`{kind: teacher|board|student, ...}`); Task 7 dùng lại cho ảnh vở.

- [ ] **Step 1: Test thất bại**: `test_page_visible_to_owner_board_and_class_student`, `test_page_hidden_from_other_class_student_404`, `test_page_hidden_after_run_fully_closed_for_student`.
- [ ] **Step 2–4.**
- [ ] **Step 5: Commit** `feat(hub): authorised image download for assignment pages and submissions`

---

### Task 5: Lượt giao, mã QR, phase, đóng, bài về nhà

**Files:** Create `hub/assignments/runs.py`; Create `routers/hub_runs.py`; Modify `hub/db.py` (bảng `assignment_runs`), `main.py`; Test `tests/test_asg_runs.py`.

**Interfaces — Produces:**
- `runs.open_run(teacher_id, assignment_id, class_id, period_id=None) -> dict` → `{runId, code, url}`; `url = os.getenv("STUDENT_APP_URL", "http://localhost:3002") + "/a/" + code`.
- `runs.get(run_id) -> dict` → `{id, code, assignmentId, version, teacherId, classId, periodId, openedAt, closedAt, dueAt, phase}`; trước khi trả: nếu `status=open` và tiết console `ended` → đóng với `closed_at = ended_at`, `due_at = ended_at + 259200`.
- `runs.phase(run) -> "in_class" | "homework" | "closed"` (`in_class`: chưa đóng; `homework`: đã đóng và `now < due_at`; `closed`: còn lại).
- `runs.close(run_id)`, `runs.set_due(run_id, due_at)`, `runs.by_code(code) -> dict` (KeyError nếu không có).
- `runs.check_student(run, student_id)` → `PermissionError("not_in_class")`.
- Routes:
  - Bảng: `POST /board/runs {assignmentId}` (409 `period_has_no_class`; bài không của giáo viên tiết → 404) → `{runId, code, url, classHasStudents}`; `POST /board/runs/{id}/close`; `GET /board/assignments` → danh sách bài của giáo viên tiết (công khai, không đáp án); `GET /board/assignments/{id}` → `{version, body: public_body, pages}`; `POST /board/assignments/{id}/questions {question}` → version mới.
  - Giáo viên: `POST /runs {assignmentId, classId}`, `GET /runs?classId=`, `PUT /runs/{id} {dueAt}`, `POST /runs/{id}/close`.
  - Học sinh: `GET /runs/by-code/{code}` → `{runId, phase, dueAt, version, body (công khai), pages, mine: {questionId: {status, score, attempt}}}`; 403 `not_in_class`; `phase == closed` → 410 `run_closed`.

- [ ] **Step 1: Test thất bại**: `test_board_opens_run_with_qr_url`, `test_board_run_without_class_409`, `test_student_by_code_public_only` (không có `answer`), `test_other_class_student_403`, `test_close_then_homework_then_closed` (đồng hồ: đóng → `homework`; +259201 s → 410), `test_period_end_turns_run_into_homework` (console `/end` → `by-code` vẫn 200, `phase == "homework"`), `test_board_adds_question_bumps_version`.
- [ ] **Step 2–4.**
- [ ] **Step 5: Commit** `feat(hub): assignment runs with QR codes, in-class and homework phases`

---

### Task 6: Nộp trắc nghiệm và đáp số gõ; sự kiện học tập

**Files:** Create `hub/assignments/submissions.py`, `hub/assignments/grader.py`, `hub/assignments/jobs.py`; Modify `hub/db.py` (bảng `submissions`), `routers/hub_runs.py`; Test `tests/test_asg_submit.py`.

**Interfaces — Produces:**
- `jobs.spawn(fn: Callable[[], None]) -> None` — `threading.Thread(daemon=True).start()`.
- `grader.grade_choice(index: int, answer: str) -> bool`; `grader.grade_short(text, answer) -> Optional[bool]` (`check_formula`).
- `submissions.answer(run, student_id, question_id, request_id, choice=None, text=None) -> dict` → `{submissionId, status, score, attempt}`; câu sai loại → `ValueError("wrong_mode")`; `phase == closed` → `PermissionError("run_closed")`; cùng `request_id` cùng nội dung → kết quả cũ, khác → `RequestConflict`.
- `submissions.record_event(sub: dict) -> None` — ghi `learning_events` theo Global Constraints, mastery như `hub.learning.record_turn` (không cộng bằng chứng khi câu đã đúng trước đó), phát `metric_delta` + `submission_update {runId, studentId, questionId, status}` lên `teacher:{teacherId}` và `{type: "progress", runId}` lên `cboard:{periodId}`.
- Bài nộp lưu `version` của lượt giao tại lúc học sinh tải đề (client gửi `version`; máy chủ chấm theo đáp án của version đó).
- Route `POST /runs/{id}/answers {questionId, version, requestId, choice?, text?}` (học sinh).

- [ ] **Step 1: Test thất bại**: `test_choice_correct_and_wrong`, `test_short_unparseable_is_pending_teacher`, `test_events_and_mastery_only_for_certain` (pending → 0 sự kiện), `test_request_id_idempotent_and_conflict`, `test_submission_grades_against_its_version` (giáo viên đổi đáp án sang version 2; học sinh gửi `version: 1` → chấm theo đáp án cũ), `test_teacher_and_board_notified` (bus nhận `submission_update` và `progress`; payload `progress` không có id học sinh), `test_homework_phase_marked`.
- [ ] **Step 2–4.**
- [ ] **Step 5: Commit** `feat(hub): choice and typed-answer submissions with learning events`

---

### Task 7: Ảnh vở, OCR, màn xác nhận, chấm tự luận

**Files:** Create `hub/assignments/ocr.py`; Modify `hub/assignments/submissions.py`, `hub/assignments/grader.py`, `routers/grade_steps.py` (tách `grade_lines`), `routers/hub_runs.py`; Test `tests/test_asg_photo.py`.

**Interfaces — Produces:**
- `routers.grade_steps.grade_lines(req: GradeStepsRequest, gemini_key: str = "", openrouter_key: str = "") -> dict` — đồng bộ: `machine_check_guarded` + `_llm_json(..., 3500, 40.0, "grade")` + `merge`; route `/grade-steps` gọi hàm này qua threadpool, kết quả giữ nguyên (test `test_grade_steps.py` cũ phải xanh).
- `ocr.recognize_image(jpeg: bytes) -> Optional[dict]` → `{lines: [{text, latex, confidence, y0, y1}], uncertain: [{line, token, alternatives, x, y}]}`; dùng `recognize_with_openrouter` rồi `recognize_with_gemini` (khi `gemini_vision_enabled()`), hint `"bài làm viết tay trong vở học sinh"`; lỗi → None.
- `submissions.upload_photo(run, student_id, question_id, version, request_id, data: bytes) -> dict` → `{photoId, lines, uncertain}`; ảnh: `exif_transpose`, RGB, cạnh dài ≤ 1600, JPEG; > 2 MB thô → `ValueError("too_large")` (413); câu không phải `essay`/`open` → `wrong_mode`. Tạo submission trạng thái nháp (`status = "draft"`, chưa tính).
- `submissions.confirm(photo_id, student_id, lines: List[str], resolved: List[int], photo_only: bool = False) -> dict` — `resolved` là chỉ số các mục `uncertain` học sinh đã xử lý; thiếu mục nào → `ValueError("uncertain_unresolved")` (422) trừ khi `photo_only`. Quy tắc trạng thái theo spec mục ⑤: `essay` → `check_formula(dòng cuối, answer)`: True/False → `graded` (1/0), None → `pending_teacher`; `open` hoặc `photo_only` → `pending_teacher`. Sau đó `jobs.spawn` chạy `grader.grade_lines` (môn, đề câu, `expected_answer`) và lưu vào `grade` + phát `submission_update`.
- Routes: `POST /runs/{id}/photos` (multipart `photo`, form `questionId`, `version`, `requestId`), `POST /runs/{id}/photos/{photoId}/confirm {lines, resolved, photoOnly}`.
- `GET /api/v1/hub/files/submission/{submissionId}` (trong `routers/hub_files.py`, dùng `bridge.viewer`): giáo viên chủ lượt giao; bảng của tiết của lượt giao; học sinh chủ bài. Khác → 404.

- [ ] **Step 1: Test thất bại**: `test_submission_photo_only_owner_teacher_board` (học sinh khác 404), `test_photo_ocr_returns_lines_and_uncertain`, `test_confirm_rejects_unresolved_uncertain`, `test_essay_correct_final_line_graded`, `test_essay_unreadable_final_pending_teacher`, `test_open_always_pending`, `test_photo_only_pending`, `test_photo_respects_exif_orientation`, `test_steps_filled_by_background_grade` (`jobs.spawn` đồng bộ; `grade.first_error` có mặt sau confirm), `test_no_ai_ocr_returns_empty_lines` (recognize None → `lines == []`, vẫn confirm được với dòng tự gõ).
- [ ] **Step 2–4** (gồm `tests/test_grade_steps.py` cũ).
- [ ] **Step 5: Commit** `feat(hub): notebook photo submissions with confirmed OCR and step grading`

---

### Task 8: Giáo viên duyệt, chọn bài chiếu, phần chữa

**Files:** Modify `hub/assignments/submissions.py`, `routers/hub_runs.py`; Test `tests/test_asg_review.py`.

**Interfaces — Produces:**
- `submissions.review(teacher_id, submission_id, score: float, lines: Optional[List[str]]) -> dict` → `teacher_confirmed`, `reviewed_at`. Sự kiện: xóa các dòng `learning_events` cũ của bài này (theo `request_id` của nó), ghi lại với `kind = correct` nếu `score >= 0.5` ngược lại `incorrect`, rồi tính lại mastery của học sinh cho các KC của câu bằng `hub.metrics.mastery_at(student, kc, now)` và ghi đè vào bảng `mastery`.
- `submissions.anonymous_list(run_id, question_id=None, status=None) -> List[dict]` → `[{submissionId, label: "Bài n", questionId, status, firstError}]` (không id/tên học sinh; `n` theo thứ tự lần nộp đầu của mỗi học sinh trong lượt giao).
- `submissions.show(run_id, submission_id)` → publish `{type: "show_submission", submissionId, label}` lên `cboard:{periodId}`.
- `submissions.save_correction(submission_id, strokes)` — ≤ 200 nét, mỗi nét `{p: [[x,y]..] (0–1 theo ảnh), c, w}`.
- Routes: giáo viên `GET /runs/{id}/submissions` (có tên, lưới), `POST /submissions/{id}/review {score, lines?}`, `POST /runs/{id}/show {submissionId}`; bảng `GET /board/runs/{id}/progress` (`{questions: [{questionId, submitted, correctRate}]}`), `GET /board/runs/{id}/submissions?questionId=&status=`, `GET /board/submissions/{id}` (ảnh qua Task 4, `confirmed`, `grade`, không tên), `PUT /board/submissions/{id}/correction {strokes}`, `GET /board/stream` (kênh `cboard:{periodId}`).

- [ ] **Step 1: Test thất bại**: `test_review_confirms_and_counts`, `test_review_overrides_graded_score`, `test_board_list_is_anonymous` (JSON không chứa `s-` id học sinh hay tên), `test_show_publishes_to_board_channel`, `test_correction_saved_and_visible_to_owner_only`, `test_board_stream_requires_live_board`.
- [ ] **Step 2–4.**
- [ ] **Step 5: Commit** `feat(hub): teacher review, anonymous board picking and saved corrections`

---

### Task 9: Gói đỉnh 3, chỉ số lượt giao, Socratic `?run_id=`, báo cáo phụ huynh

**Files:** Create `hub/assignments/metrics.py`; Modify `routers/hub_runs.py`, `routers/lesson.py`, `lesson_builder.py`, `hub/metrics.py`, `hub/reports.py`; Test `tests/test_asg_package.py`.

**Interfaces — Produces:**
- `GET /me/assignments` (học sinh) → `[{runId, title, kind, phase, dueAt, score10, questions: [{questionId, label, status, score}], corrections: [{submissionId, questionId}], classExamples: [{submissionId, questionId, label}]}]`.
- `GET /me/submissions/{id}` (học sinh chủ bài) → `{confirmed, grade, correction, photo: url tương đối}`; `GET /me/examples/{id}` → bài chữa mẫu ẩn danh của lớp.
- `metrics.run_metrics(run_id) -> dict` → `{questions: [{questionId, submittedRate, correctRate, firstTryRate, wrongAnswers: [{answer, count}], pending}], students: [{studentId, name, score10, pending}]}`; route `GET /runs/{id}/metrics` (giáo viên).
- `lesson_builder.add_run_questions(plan, keys, run_body, wrong_or_missing: List[str]) -> None` và `GET /api/v1/student/lesson/{student_id}?run_id=` (token hub học sinh, lesson id `hub:run:{runId}:{student}`): một cảnh mỗi câu sai/chưa làm có đáp án; `choice` → `PREDICT` (`choice_key`), `short`/`essay` → `COMPUTE`. Lượt chấm của gia sư ghi sự kiện bằng `submissions.record_tutor_turn(student_id, run_id, question_id, kind, status, message, request_id)`: cùng ánh xạ với `hub.learning.record_turn` (`HINT` → `hint`, đúng/sai → `correct`/`incorrect`, `CHAT` bỏ qua), `session_id` = run id, `section_id` = `asg:{assignmentId}`, `item_id` = `{runId}:{questionId}`; không tạo dòng `submissions`. `routers/lesson.py` gọi hàm này khi `lesson_id` bắt đầu `hub:run:`.
- `hub.metrics._class_total`: cộng số câu của các lượt giao của lớp.
- `hub.reports.build_report`: thêm `assignments: {correct, total, onTime, runs}` và một câu trong nhận xét mẫu.

- [ ] **Step 1: Test thất bại**: `test_me_assignments_lists_runs_with_my_status`, `test_corrections_visible_and_class_examples_anonymous`, `test_run_metrics_rates_and_wrong_answers`, `test_run_lesson_has_wrong_questions_without_keys`, `test_student_total_includes_run_questions`, `test_parent_report_has_assignment_line`.
- [ ] **Step 2–4.**
- [ ] **Step 5: Commit** `feat(hub): package assignment results for students, teachers and parents`

---

### Task 10: Hợp đồng TS, tài liệu, kiểm toàn bộ

**Files:** Create `packages/types/src/assignments.ts`, `packages/types/src/__tests__/assignments.test.ts`; Modify `.ai/INTERFACES.md` (mục "Assignments v1"), `.ai/HANDOFF.md`, `services/ai-engine/.env.example` (`STUDENT_APP_URL`).

**Interfaces — Produces (Zod + type):** `QuestionTypeSchema`, `QuestionSchema`, `QuestionPublicSchema` (strict, không `answer`), `AssignmentBodySchema`, `AssignmentBodyPublicSchema`, `RunSchema`, `RunForStudentSchema`, `OcrResultSchema`, `SubmissionStatusSchema`, `SubmissionResultSchema`, `BoardSubmissionSchema` (strict, không `studentId`/`name`), `RunMetricsSchema`, `MyAssignmentSchema`, `AssignmentStreamEventSchema` (`submission_update` | `progress` | `show_submission`), `ASSIGNMENT_LIMITS = {questions: 40, options: [2, 6], pages: 20, uploadBytes: 15728640, photoBytes: 2097152, homeworkSeconds: 259200}`.

- [ ] **Step 1: Test thất bại**: parse đề mẫu 4 loại; `QuestionPublicSchema` từ chối `answer`; `BoardSubmissionSchema` từ chối có `studentId`; parse 3 loại sự kiện.
- [ ] **Step 2–4**: `npx.cmd vitest run packages/types` pass; `npx.cmd tsc --noEmit --incremental false -p packages/types` 0 lỗi; `python -m pytest tests -q -p no:cacheprovider` toàn bộ pass; chạy uvicorn thật, `curl` tải một PDF 2 trang → `GET /files/page/{id}/0` trả JPEG.
- [ ] **Step 5: Commit** `feat(types): assignments v1 contract; document hub assignment endpoints`
