# Kiến trúc tam giác: Portal giáo viên · Bảng lớp · Socratic app

Ngày: 2026-10-29 · Trạng thái: chờ duyệt spec · Phạm vi: `socratic-monorepo`

## 1. Mục tiêu và tiêu chí thành công

Biến hệ thống hai mảnh (bảng lớp, app học sinh) thành một vòng khép kín ba đỉnh:

```
soạn giáo án (1) → dạy trên bảng (2) → học sau giờ (3) → chỉ số → soạn giáo án tốt hơn (1)
                                                   └→ báo cáo tuần cho phụ huynh
```

Mục tiêu trước hết là **demo/thi đấu chạy trọn vòng ở quy mô nhỏ**: 1 trường, 1 giáo viên, 2 lớp, 8 học sinh mẫu, đăng nhập bằng PIN/mã, dữ liệu SQLite.

Thành công khi chạy được kịch bản này trên một máy (hoặc Vercel + Render) mà không sửa tay dữ liệu:

1. Giáo viên đăng nhập portal bằng PIN, soạn giáo án 2 phần, mỗi phần có KC, công thức, đề bài có đáp án, mô phỏng và poll.
2. Bảng hiện QR. Giáo viên quét bằng điện thoại, chọn lớp 12A1 và giáo án, bấm "Bắt đầu tiết". Bảng chuyển sang chế độ dạy trong vòng 3 giây.
3. Giáo viên thả nội dung giáo án lên bảng, chạy poll, rồi bấm "Kết thúc tiết".
4. Học sinh đăng nhập student-app bằng mã, thấy bài học của tiết vừa dạy, làm bài.
5. Trong lúc học sinh làm bài, dashboard portal đổi số liệu trong vòng 3 giây.
6. Giáo viên bấm "AI đề xuất" cho một phần, áp dụng một đề xuất, giáo án lên version mới.
7. Mở link phụ huynh của học sinh đó, thấy báo cáo tuần.

Không có khóa AI thì bước 1–5 và 7 vẫn chạy. Bước 6 báo "AI chưa sẵn sàng" và không bịa đề xuất.

## 2. Hiện trạng đã kiểm chứng (2026-10-29)

Kiểm trên `origin/main` (`3d5de11`). Checkout `D:\Project` đang ở `main` = `08dced4`, **chậm 12 commit** so với `origin/main`. Phải fast-forward trước khi triển khai, vì thiết kế này dựa trên các phần chỉ có ở `origin/main`.

| Thành phần | Có trên `origin/main` | Ghi chú cho thiết kế |
|---|---|---|
| `apps/teacher-board` (:3001) | Bảng, mô phỏng, phòng BYOD (`/api/v1/rooms`, `/ws/rooms/{id}`, `POLL_START`/`POLL_END`), `qrcode`, `utils/microLesson.ts` (`buildMicroLesson`), `MicroLessonPanel`, `vectorJournal` | Bảng **chưa** gửi gì sang học sinh. Không có nút "Gửi cho học sinh" nào trên nhánh nào. |
| `apps/student-app` (:3002) | 1 trang (`app/page.tsx`), `StudentBoardWorkbench` đọc `ClassroomSessionSnapshot` qua `GET /api/v1/student/context/{id}`, `bktEngine.ts`, `TeacherHeatmap`/`ParentPulse` với dữ liệu mẫu cứng | Chưa có trang bài học theo tiết, chưa có trang phụ huynh. |
| `services/ai-engine` | `student_context.py` (SQLite), `security.py` (token HMAC `v1.role.subject.exp.sig`, vai trò `student/teacher/admin`), `online_tutor.py` (BKT phía máy chủ, `verdict()` chấm biểu thức), `lesson_notes.py`, `board_qa.py` (`_llm_json`, `_extract_json`), `llm/model_router.py`, `tests/conftest.py` | Xem các điểm lệch bên dưới. |

Các điểm lệch so với thiết kế đã trao đổi, spec này đã sửa:

- **Snapshot v1 và "Gửi cho học sinh" không tồn tại** trên nhánh nào (phần chưa commit trước đây không còn). Spec định nghĩa gói tri thức từ đầu, dựng trên `buildMicroLesson`. Hub vẫn ghi thêm một `ClassroomSessionSnapshot` tương thích để `StudentBoardWorkbench` hiện tại tiếp tục chạy.
- **Không có `lesson_builder`.** Spec tạo mới `hub_lessons.py`.
- **Gọi LLM** đi qua `_llm_json` của `routers/board_qa.py` (đã dùng bể khóa và `model_router`), giống `lesson_notes.py`. Không gọi `model_router.plan` trực tiếp.
- **`conftest.py` chưa cách ly DB.** `student_context.DB_PATH` đọc biến môi trường lúc import, nên test hiện ghi vào DB thật. Hub đọc đường dẫn DB mỗi lần mở kết nối, và `conftest.py` thêm fixture đặt `STUDENT_CONTEXT_DB` vào thư mục tạm.
- **Chế độ local bỏ qua xác thực.** `require_context_auth` trả vai trò `local` khi `STUDENT_CONTEXT_REQUIRE_AUTH != true`. Hub cần biết ai là giáo viên, lớp nào, tiết nào, nên **endpoint hub luôn kiểm token**, kể cả khi chạy local. Endpoint cũ giữ nguyên hành vi.
- **Subject của token không được chứa dấu `.`** vì `verify_token` tách theo dấu chấm. Mọi id mới chỉ dùng `[a-z0-9-]`.

## 3. Kiến trúc

```
        ┌────────────── ĐỈNH 1: apps/teacher-portal (mới, :3003) ──────────────┐
        │ Lớp & học sinh · Soạn giáo án · Ghép bảng · Dashboard · AI đề xuất   │
        └──────▲─────────────────────┬───────────────────────────────▲─────────┘
   metric_delta│ (stream)            │ ghép QR, bắt đầu tiết, sửa giáo án │ link phụ huynh
               │                     ▼                               │
  ┌────────────┴───────── ai-engine: module hub (FastAPI + SQLite) ───┴─────────────┐
  │ hub/store.py · hub/auth.py · hub/lessons.py · hub/metrics.py · hub/events.py      │
  │ routers/hub_*.py  →  /api/v1/hub/...                                              │
  └─────▲──────────────────────────┬─────────────────────────▲───────────────────────┘
        │ gói tri thức cuối tiết   │ giáo án + context        │ lượt làm bài
  ┌─────┴── ĐỈNH 2: teacher-board ─▼──┐       ┌───────────────┴── ĐỈNH 3: student-app ──┐
  │ QR chờ ghép · ngăn Giáo án ·      │       │ Bài học từ các tiết · /parent/[token]   │
  │ SECTION_MARK · đóng gói           │       │                                         │
  └───────────────────────────────────┘       └─────────────────────────────────────────┘
```

Quy tắc ranh giới (bổ sung vào `.ai/ARCHITECTURE.md`):

- Ba app không import lẫn nhau. Mọi trao đổi đi qua HTTP tới hub.
- Hợp đồng dùng chung đặt trong `packages/types/src/hub.ts` (type + Zod schema), xuất qua barrel. `packages/types/src/index.ts` đang bị cấm sửa trong `HANDOFF.md`. Chỉ được thêm đúng một dòng `export * from './hub'` sau khi người dùng đồng ý; nếu không, các app import từ `@socratic/types/hub`.
- Module hub là thư mục `services/ai-engine/hub/` với các tệp nhỏ, mỗi tệp một việc. Router mỏng trong `routers/hub_*.py`.
- Hub chạy trong **một tiến trình** (Render free, 1 instance). Pub/sub realtime giữ trong bộ nhớ. Nhiều worker là ngoài phạm vi.

### 3.1 Các đơn vị trong hub

| Tệp | Việc | Phụ thuộc |
|---|---|---|
| `hub/db.py` | Mở kết nối SQLite theo `STUDENT_CONTEXT_DB` đọc mỗi lần gọi, tạo bảng, nạp dữ liệu mẫu khi bảng `teachers` trống và `HUB_SEED != false` | sqlite3 |
| `hub/auth.py` | Băm/kiểm PIN (`pbkdf2_hmac` + muối), cấp token qua `security.issue_token`, dependency `require_hub(roles)` luôn kiểm token, kiểm quyền sở hữu lớp/tiết | `security.py`, `db.py` |
| `hub/store.py` | CRUD trường-lớp-học sinh, giáo án và version, tiết học, mã ghép, gói tri thức | `db.py` |
| `hub/lessons.py` | Dựng bài học cho học sinh từ gói tri thức + version giáo án; chấm câu trả lời | `store.py`, `online_tutor.verdict` |
| `hub/metrics.py` | BKT, ghi `learning_events`, tính chỉ số khi đọc | `db.py` |
| `hub/events.py` | Pub/sub trong bộ nhớ: kênh `teacher:{id}`, `board:{session_id}`, `pairing:{code}` | asyncio |
| `hub/suggest.py` | Gọi LLM đề xuất sửa giáo án, kiểm schema | `board_qa._llm_json` |
| `hub/reports.py` | Chốt báo cáo tuần (lazy), lời nhận xét AI hoặc mẫu câu | `metrics.py`, `board_qa._llm_json` |

`online_tutor.verdict` được tách thành hàm dùng chung tại chỗ (không đổi hành vi, test hiện có phải xanh).

## 4. Mô hình dữ liệu

Bảng mới trong cùng tệp SQLite (`.data/student_context.sqlite3`). Mọi `id` dạng `[a-z0-9-]`, thời gian là epoch giây (REAL).

| Bảng | Cột chính |
|---|---|
| `teachers` | `id`, `name`, `pin_hash`, `pin_salt` |
| `classes` | `id` (vd `12a1`), `name` ("12A1"), `subject`, `teacher_id` |
| `students` | `id` (`s-` + 8 ký tự), `class_id`, `name`, `login_code` (6 ký tự, duy nhất, không nhầm `0/O`, `1/l`) |
| `parent_links` | `token` (32 byte urlsafe), `student_id`, `revoked_at` |
| `lesson_plans` | `id`, `teacher_id`, `subject`, `title`, `current_version` |
| `lesson_plan_versions` | `plan_id`, `version`, `payload` (JSON `LessonPlanBody`), `created_at`, `reason` (`edit` / `suggestion:<id>`) |
| `class_sessions` | `id`, `class_id`, `plan_id`, `plan_version`, `board_id`, `status` (`live`/`closed`), `started_at`, `ended_at` |
| `board_pairings` | `code` (8 ký tự), `board_id`, `board_secret_hash`, `expires_at`, `session_id` (null đến khi ghép) |
| `knowledge_packages` | `id`, `session_id` (duy nhất), `request_id`, `payload` (JSON `KnowledgePackage`), `created_at` |
| `learning_events` | `id`, `student_id`, `session_id`, `section_id`, `kc_id`, `item_id`, `kind` (`correct`/`incorrect`/`hint`/`unverified`), `answer` (≤200 ký tự), `request_id`, `created_at`. Chỉ ghi thêm. Duy nhất theo (`student_id`, `request_id`). |
| `mastery` | `student_id`, `kc_id`, `p_known`, `updated_at`. Khóa (`student_id`, `kc_id`). |
| `parent_reports` | `student_id`, `week` (ISO, vd `2026-W44`), `payload` (JSON), `created_at`. Khóa (`student_id`, `week`). |

Dữ liệu mẫu: giáo viên `gv-demo` với PIN lấy từ biến `HUB_DEMO_PIN` (`.env.example` ghi `HUB_DEMO_PIN=2468`; ở production không có biến này thì không seed giáo viên), lớp `12a1` và `11a2`, 8 học sinh, 1 giáo án mẫu Vật lý 2 phần, link phụ huynh cho mọi học sinh.

### 4.1 Hợp đồng giáo án (`packages/types/src/hub.ts`)

```ts
type PlanItem =
  | {id: string; type: 'formula'; latex: string; caption?: string}
  | {id: string; type: 'problem'; text: string; latex?: string; answer?: string; figure?: boolean}
  | {id: string; type: 'sim'; templateId: TemplateId; params: Record<string, number>}
  | {id: string; type: 'poll'; question: string; options: string[]; correct?: number};

interface PlanSection {id: string; title: string; objective: string; kcs: {id: string; label: string}[]; items: PlanItem[]}
interface LessonPlanBody {title: string; subject: Subject; boardContext: string; sections: PlanSection[]}
```

- Giới hạn: tối đa 12 phần, 12 mục mỗi phần, `boardContext` ≤ 1000 ký tự, poll 2–6 lựa chọn.
- `section.id` và `item.id` sinh một lần và **giữ nguyên qua các version**, nên chỉ số của một phần nối được qua nhiều lần sửa.
- `kc.id` = `subject` + slug của nhãn (vd `physics-cong-vector-rlc`). Portal gợi ý KC đã dùng trong cùng môn.
- `answer` (đáp án đề bài) và `poll.correct` **chỉ nằm ở máy chủ**. Hub cắt hai trường này khỏi mọi phản hồi gửi cho bảng và học sinh.
- `figure: true` nghĩa là bảng vẽ hình từ `text` bằng `parseGeometryProblem`.

### 4.2 Hợp đồng gói tri thức

```ts
interface KnowledgePackage {
  schema: 'kp/2'; sessionId: string; planId: string; planVersion: number;
  title: string; subject: Subject; startedAt: number; endedAt: number;
  sections: {planSectionId: string | null; title: string; kcIds: string[]; moments: LessonMoment[]; narration?: string}[];
  polls: {itemId: string | null; question: string; options: string[]; counts: number[]; total: number}[];
  usedItemIds: string[];
  notes?: {summary: string; keyPoints: string[]; reviewQuestions: string[]};
}
```

`LessonMoment` chuyển từ `apps/teacher-board/src/utils/microLesson.ts` sang `hub.ts`, bảng import lại từ đó. Giới hạn gói: 256 KB.

## 5. Các luồng

### ① Trước giờ học (portal)

- Đăng nhập: `POST /hub/auth/teacher {teacherId, pin}` → token `teacher` (8 giờ). Có giới hạn tần suất bằng `RateLimit` của `deploy_guard.py`.
- Lớp và học sinh: xem danh sách, thêm một học sinh, hoặc dán danh sách tên (mỗi dòng một tên). Mỗi học sinh tự có mã đăng nhập và link phụ huynh. Giáo viên có thể in phiếu mã và thu hồi/cấp lại link phụ huynh.
- Soạn giáo án: trình soạn theo phần. Mỗi lần lưu tạo version mới (`reason: edit`). Lưu khi không đổi gì thì không tăng version.
- `boardContext`: ghi chú sư phạm (lỗi hay gặp, trình độ lớp). Bảng nối nó vào `context` của Hỏi đáp AI (`boardQa.ts`) và vào yêu cầu Lời giảng AI (`lesson-notes`, trường mới tùy chọn `teacher_context`).

### ② Vào tiết: ghép bằng QR (2 ↔ 1)

1. Bảng chưa ghép gọi `POST /hub/pairings` → `{code, boardId, boardSecret, expiresAt}`. `boardId` lưu ở localStorage để giữ nguyên qua các lần mở.
2. Bảng hiện QR trỏ tới `{PORTAL_URL}/pair/{code}` và mở luồng chờ `GET /hub/stream/pairing/{code}` với header `Authorization: Board-Secret {boardSecret}`. Mã hết hạn sau 2 phút; bảng tự lấy mã mới khi còn 15 giây.
3. Điện thoại mở `/pair/{code}` trên portal, đăng nhập nếu chưa. Portal gợi ý lớp có tiết gần nhất (lớp mở tiết gần đây nhất của giáo viên), giáo viên chọn lớp và giáo án, bấm "Bắt đầu tiết".
4. `POST /hub/pairings/{code}/claim {classId, planId}` (token giáo viên): tạo `class_session` trạng thái `live`, cấp token `board` (subject = `session_id`, hạn 12 giờ), đẩy vào luồng chờ `{type: 'paired', boardToken, session, class, plan}` (plan đã cắt đáp án).
5. Bảng chuyển sang chế độ dạy: thanh trên cùng hiện tên lớp, tên giáo án, đồng hồ tiết.

Ghép là tùy chọn. Bảng chưa ghép vẫn dạy được như hiện nay. Nút "Ghép với lớp" mở QR.

Luồng (stream) dùng `fetch` đọc `text/event-stream` để gửi được header `Authorization`. Không dùng `EventSource` với token trên query string.

### ③ Trong tiết (bảng)

- **Ngăn "Giáo án"** cạnh bảng liệt kê phần và mục. Chạm một mục là thả lên bảng:
  - `formula` → đối tượng chữ/công thức như khi chuyển nét viết sang LaTeX.
  - `problem` → khung đề bài; nếu `figure` thì chạy `parseGeometryProblem` rồi đặt hình như luồng Vẽ hình.
  - `sim` → `SPAWN_SIM` với blueprint dựng bằng hàm mới `blueprintFromTemplate(templateId, params)` trong `teacher-board/src/utils/`.
  - `poll` → `POLL_START` của phòng BYOD (tự tạo phòng nếu chưa có). Khi `POLL_END`, bảng giữ kết quả cuối kèm `itemId`.
  - Mỗi lần thả ghi `itemId` vào `usedItemIds`.
- **Chọn một phần** ghi sự kiện nhật ký mới `SECTION_MARK {sectionId}` (thêm vào union `BoardJournalEvent`). `buildMicroLesson` mở phần mới tại mốc này và gắn `planSectionId`. Có ít nhất một `SECTION_MARK` thì chỉ chia phần theo mốc; nội dung trước mốc đầu tiên thành một phần mở đầu với `planSectionId: null`. Không có mốc thì chia như cũ (khoảng lặng 90 giây, mô phỏng mới, xóa bảng).
- **Sửa giáo án giữa tiết:** portal lưu version mới → hub đẩy `{type: 'plan_updated', version}` vào `GET /hub/stream/board` (token board) → bảng tải `GET /hub/sessions/{id}/plan` và cập nhật ngăn Giáo án; nội dung đã thả lên bảng giữ nguyên. `class_sessions.plan_version` ghi version bảng đang dùng.

### ④ Hết tiết: đóng gói tri thức (2 → 3)

1. Bấm "Kết thúc tiết". Bảng chạy `buildMicroLesson`, gọi `lesson-notes` nếu có khóa AI (tối đa 30 giây, như hiện nay).
2. `POST /hub/sessions/{id}/package {requestId, package}` (token board). Hub kiểm schema và kích thước, lưu gói, đóng tiết, thu hồi token board.
3. Hub ghi thêm một `ClassroomSessionSnapshot` tương thích qua `save_snapshot(class_id, …)` (mỗi phần thành một `boardSnapshots`), để `StudentBoardWorkbench` hiện tại vẫn hiện nội dung tiết mới.
4. Bảng về trạng thái chưa ghép, hiện xác nhận "Đã gửi bài cho lớp 12A1".

### ⑤ Sau giờ (student-app)

- Đăng nhập: `POST /hub/auth/student {loginCode}` → token `student` (subject = `student_id`, 8 giờ). Token lưu ở localStorage.
- Tab mới **"Bài học từ các tiết"**: `GET /hub/me/lessons` liệt kê gói của lớp mình, mới nhất trước, kèm tiến độ.
- `GET /hub/me/lessons/{sessionId}` trả bài học do `hub/lessons.py` dựng, mỗi phần một cảnh:
  - **Ôn lại:** các mốc trên bảng, lời giảng (nếu có), ý cần nhớ.
  - **Luyện tập** (mỗi câu mang `sectionId`, `kcIds`, `itemId`):
    - `problem` có `answer` → câu tự chấm bằng `verdict()`.
    - `poll` có `correct` → câu trắc nghiệm tự chấm.
    - `reviewQuestions` của lời giảng AI và `problem` không có đáp án → câu tự luận, ghi `unverified`, tính vào mức độ hoạt động nhưng không tính đúng/sai.
- `POST /hub/me/attempts {requestId, sessionId, itemId, answer | hint: true}` → hub chấm, ghi `learning_event`, cập nhật mastery, phát `metric_delta`. Gửi lại cùng `requestId` và cùng nội dung trả lại kết quả cũ; khác nội dung thì 409.
- BKT dùng đúng hệ số của `online_tutor.py` (likelihood 0,92/0,08; guess 0,12/0,88; learn 0,2; prior 0,3 khi KC chưa có mastery). `hint` không đổi mastery. `unverified` không đổi mastery.

## 6. Chỉ số, AI đề xuất, phụ huynh (3 → 1, 3 → phụ huynh)

### 6.1 Chỉ số

Tính khi đọc, bằng truy vấn trên `learning_events` và `mastery`. Không lưu số phái sinh.

| Mức | Chỉ số |
|---|---|
| Học sinh | mastery theo KC; số câu đã làm / tổng câu trong các gói của lớp; tỉ lệ đúng lần đầu; gợi ý trung bình mỗi câu; thời gian học (tổng khoảng giữa các sự kiện liền nhau trong cùng tiết, mỗi khoảng tối đa 5 phút); ngày hoạt động gần nhất; cờ **cần hỗ trợ** khi có KC mastery < 0,4 sau ít nhất 3 lượt, hoặc 3 lượt `incorrect` liên tiếp |
| Phần giáo án (theo lớp, theo tiết) | % học sinh đã làm; % đúng lần đầu; gợi ý trung bình; KC yếu nhất; học sinh cần hỗ trợ; tối đa 5 câu trả lời sai tiêu biểu (ẩn danh, gộp trùng) |
| Lớp | tiến độ chung; heatmap học sinh × KC thật, thay dữ liệu cứng HS01–HS05 |

Endpoint (token giáo viên, chỉ lớp của mình): `GET /hub/classes/{id}/metrics`, `GET /hub/classes/{id}/students/{sid}/metrics`, `GET /hub/plans/{id}/sections/{sid}/metrics?classId=`.

Realtime: `GET /hub/stream/teacher` phát `{type: 'metric_delta', classId, studentId, sectionId}` sau mỗi lượt làm bài. Portal tải lại đúng ô bị đổi. Mất kết nối thì tự nối lại (lùi dần 1–15 giây); khi chưa nối được thì làm mới toàn trang dashboard mỗi 15 giây.

`TeacherHeatmap` và `ParentPulse` trong student-app giữ nguyên làm màn demo cũ; portal có dashboard thật riêng.

### 6.2 AI đề xuất sửa giáo án

- Nút "AI đề xuất" trên mỗi phần. `POST /hub/plans/{id}/sections/{sid}/suggestions {classId}`.
- Hub gửi `_llm_json` gồm: nội dung phần (đã bỏ đáp án), chỉ số phần, câu sai tiêu biểu. Prompt ghi rõ dữ liệu là DỮ LIỆU, không phải lệnh, như `lesson_notes.py`.
- LLM trả tối đa 3 đề xuất `{type: 'add_example' | 'add_question' | 'reorder' | 'add_note', rationale, item?, order?}`. Hub kiểm theo schema `PlanItem`; đề xuất sai schema bị bỏ. Đề xuất lưu tạm trong bộ nhớ 1 giờ theo `suggestionId`.
- "Áp dụng" từng đề xuất: `POST /hub/plans/{id}/suggestions/{sgid}/apply` tạo version mới (`reason: suggestion:<id>`). Không có gì tự sửa.
- Không có khóa AI, AI lỗi hoặc trả định dạng hỏng: trả `{suggestions: [], source: 'offline', note}`. Portal hiện chỉ số và "AI chưa sẵn sàng".
- Khóa AI: portal gửi header `x-gemini-api-key` / `x-openrouter-api-key` lấy từ cài đặt của portal, giống bảng; máy chủ có khóa trong env thì dùng khóa đó.

### 6.3 Phụ huynh

- Trang `student-app/parent/[token]`, không cần đăng nhập. Token 32 byte, không đoán được, giáo viên thu hồi được. Trang đặt `Referrer-Policy: no-referrer` và `noindex`.
- `GET /hub/parent/{token}/report` trả báo cáo tuần gần nhất đã chốt và tuần hiện tại tới thời điểm xem.
- Nội dung bằng lời dễ hiểu: con đã học bài nào, chăm chỉ đến đâu (số ngày học, thời gian), phần tiến bộ, phần cần giúp, 1–3 gợi ý phụ huynh có thể làm. Chỉ so con với chính con tuần trước; không có điểm so với bạn.
- Chốt định kỳ kiểu lazy: khi trang được mở và tuần trước chưa có `parent_reports`, hub chốt tuần trước ngay lúc đó. Không cần cron.
- Portal có nút "Tạo báo cáo ngay" (chốt tuần hiện tại) để demo.
- Lời nhận xét do AI viết khi có khóa, chỉ từ số liệu đã tính. Không có khóa thì dùng mẫu câu dựng từ số liệu. Báo cáo ghi rõ nguồn (`ai` hoặc `template`).

## 7. Phân quyền

| Vai trò | Token | Được làm |
|---|---|---|
| `teacher` | HMAC, subject = `teacher_id`, 8 giờ | Lớp, học sinh, giáo án, tiết, chỉ số, đề xuất của chính mình |
| `board` | HMAC, subject = `session_id`, hạn 12 giờ hoặc khi đóng tiết | Đọc giáo án của tiết đó (đã bỏ đáp án), nhận stream của tiết đó, gửi đúng một gói |
| `student` | HMAC, subject = `student_id`, 8 giờ | Bài học của lớp mình, lượt làm bài và chỉ số của chính mình |
| parent | token ngẫu nhiên trong `parent_links` | Đọc báo cáo của đúng một học sinh |

- `security.verify_token` thêm `board` vào tập vai trò hợp lệ. Token board còn bị kiểm với `class_sessions.status = live`, nên hết hiệu lực ngay khi đóng tiết.
- Giáo viên truy cập lớp, giáo án, tiết của giáo viên khác → 404 (không lộ là có tồn tại).

## 8. Xử lý lỗi

| Tình huống | Cách xử lý |
|---|---|
| Mã ghép hết hạn hoặc đã dùng | 410. Bảng tự lấy mã mới. Điện thoại báo "QR đã hết hạn, quét lại". |
| Sai `boardSecret` khi mở luồng chờ | 401 |
| Bảng mất mạng giữa tiết | Nhật ký vẫn ghi cục bộ. "Kết thúc tiết" xếp gói vào hàng đợi localStorage, gửi lại mỗi 10 giây và khi có sự kiện `online`. Cùng `requestId` không tạo gói thứ hai. |
| Gửi gói cho tiết đã đóng bằng `requestId` khác | 409 |
| Gói sai schema hoặc > 256 KB | 422 / 413 |
| Token board hết hạn trước khi gửi gói (> 12 giờ) | 401. Hub coi tiết `live` quá 12 giờ là đã đóng. Bảng bỏ gói khỏi hàng đợi, báo "Tiết đã quá hạn, bài chưa gửi được"; vi bài giảng vẫn xuất Markdown được từ `MicroLessonPanel` như hiện nay. |
| Luồng stream đứt | Client nối lại với lùi dần; hub không giữ hàng đợi sự kiện, client tải lại trạng thái sau khi nối lại. |
| Không có AI | Mọi luồng vẫn chạy. Lời giảng, đề xuất, nhận xét phụ huynh rơi về chế độ không AI và không bịa nội dung. |

## 9. Kiểm thử

- **pytest** (`services/ai-engine/tests/`), DB tạm qua fixture mới trong `conftest.py`, LLM giả lập bằng monkeypatch `_llm_json`:
  - store và seed; PIN sai/đúng; giới hạn tần suất đăng nhập;
  - ghép QR: hết hạn, dùng lại, sai secret, claim tạo tiết và token board;
  - vòng đời tiết: gói đúng, gửi lại cùng `requestId`, `requestId` khác sau khi đóng, sai schema, quá cỡ, token board sau khi đóng;
  - gói → bài học: đáp án không lộ ra phản hồi; cảnh mang `sectionId`/`kcIds`;
  - lượt làm bài → event → mastery → chỉ số học sinh, phần, lớp; cờ cần hỗ trợ;
  - phân quyền từng vai trò, gồm giáo viên khác lớp → 404;
  - AI đề xuất: hợp lệ, sai schema bị bỏ, offline; áp dụng tạo version mới;
  - báo cáo tuần lazy và "Tạo báo cáo ngay"; link thu hồi → 404;
  - test cũ của `online_tutor` và `student_context` vẫn xanh.
- **Vitest:**
  - portal: soạn giáo án (thêm phần, mục, KC, lưu tăng version), trang ghép, dashboard với stream giả;
  - bảng: QR chờ và tự làm mới mã, ngăn Giáo án thả từng loại mục, `SECTION_MARK` → `planSectionId`, hàng đợi gói;
  - student-app: đăng nhập mã, danh sách bài theo tiết, làm bài, trang phụ huynh.
- **e2e** (`socratic-monorepo/e2e/`): một test trọn vòng gọi API thật của hub qua `TestClient`/HTTP: ghép → thả mục → kết thúc tiết → học sinh làm bài → chỉ số giáo viên đổi → báo cáo phụ huynh có dữ liệu.
- Kiểm tay trên trình duyệt đúng kịch bản ở mục 1 trước khi báo xong.

## 10. Ngoài phạm vi đợt này

Nhiều trường; OIDC/SSO; Postgres; nhiều worker hoặc Redis pub/sub cho hub; email/Zalo cho phụ huynh; thời khóa biểu; dashboard phụ huynh nhiều con; xuất giáo án ra Word; nhiều bảng cùng một tiết; sửa nội dung đã thả lên bảng khi giáo án đổi; dịch chuyển dữ liệu `student_default` cũ sang học sinh thật.

## 11. Thứ tự làm

Mỗi mốc có test xanh và chạy được trước khi sang mốc sau.

0. Fast-forward `main` lên `origin/main`; chạy lại toàn bộ test để có mốc xanh.
1. `hub.ts` + `hub/db.py`, `auth.py`, `store.py`, fixture DB tạm, seed, đăng nhập 3 vai trò.
2. `apps/teacher-portal`: đăng nhập, lớp, học sinh, soạn giáo án.
3. Ghép QR + ngăn Giáo án trên bảng + `SECTION_MARK` + giáo án realtime 1→2.
4. Gói tri thức → bài học ở student-app + `learning_events`/mastery.
5. Dashboard chỉ số realtime + AI đề xuất.
6. Trang phụ huynh + báo cáo tuần.
7. e2e trọn vòng; cập nhật `ARCHITECTURE.md`, `INTERFACES.md`, `HANDOFF.md`, `DEPLOY.md` (thêm portal trên Vercel, `PORTAL_URL`).
