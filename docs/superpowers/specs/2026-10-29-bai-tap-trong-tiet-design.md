# Bài tập / đề trong tiết: giao bằng QR, nộp ảnh vở, chấm có kiểm soát OCR, chữa trên bảng

Ngày: 2026-10-29 · Trạng thái: chờ duyệt spec · Phạm vi: `socratic-monorepo` · Nhánh: `feat/in-class-assignments`
Xây trên: `docs/superpowers/specs/2026-10-29-tam-giac-he-thong-design.md` (hub) và teacher-console của teammate (`routers/console.py`, `store/console_db.py`).

## 1. Mục tiêu và tiêu chí thành công

Thêm vòng bài tập chạy trong tiết, nối cả ba đỉnh:

```
Đỉnh 1 soạn/duyệt bài tập, đề (trước hoặc trong tiết)
  → Đỉnh 2 mở lên bảng (thu phóng) → "Giao bài" → QR
  → Đỉnh 3 học sinh quét, làm: chọn / gõ / chụp vở → xác nhận dòng máy đọc → nộp
  → chấm (máy chắc → tính ngay; không chắc → chờ giáo viên)
  → giáo viên duyệt, chọn bài chiếu lên bảng, chữa ngay trong tiết
  → hết tiết: câu chưa xong thành bài về nhà; mọi thứ lưu theo học sinh → gói đỉnh 3, chỉ số đỉnh 1, báo cáo phụ huynh
```

Mục tiêu trước hết là demo trọn vòng (cùng mức "thật" với spec tam giác). Thành công khi chạy được kịch bản sau không sửa tay dữ liệu:

1. Giáo viên đăng nhập console, tải một file PDF đề 4 câu (1 trắc nghiệm, 1 gõ đáp số, 1 tự luận có đáp số, 1 tự luận không đáp án). AI đề xuất danh sách câu; giáo viên sửa một đáp án rồi lưu.
2. Giáo viên bắt đầu tiết trên console, ghép bảng. Trên bảng mở đề, thu phóng tới câu 3, bấm "Giao bài": QR hiện lên.
3. Hai học sinh (đăng nhập bằng mã) quét QR, làm cả 4 câu; câu 3 chụp ảnh vở, sửa một ký tự máy đọc không chắc rồi nộp.
4. Console hiện lưới học sinh × câu cập nhật trong ≤ 3 giây; câu 4 nằm trong hàng "chờ giáo viên"; giáo viên chấm nó.
5. Trên bảng, giáo viên chọn "Bài 2" (ẩn danh) của câu 3: ảnh hiện lên, dòng sai tô đỏ; giáo viên viết chữa và lưu.
6. Kết thúc tiết trên console. Học sinh thấy câu còn sai thành bài về nhà (hạn 3 ngày) và thấy phần chữa của mình.
7. Console thấy chỉ số theo câu; báo cáo phụ huynh có dòng bài tập.

Không có khóa AI: bước 1 dùng ô tự khai, bước 3 học sinh tự gõ dòng hoặc chỉ nộp ảnh (vào hàng chờ giáo viên), mọi bước khác vẫn chạy.

## 2. Hiện trạng dựa vào (đã kiểm trên `main` 5d3eb46)

| Thành phần | Có sẵn | Dùng thế nào |
|---|---|---|
| `routers/recognize_ink.py` | Đọc ảnh → `lines[{text, latex, confidence, y0, y1}]`, `uncertain[{line, token, alternatives, x, y}]`; Vision qua OpenRouter (mặc định) | Đọc ảnh vở học sinh; đọc trang đề để tách câu |
| `routers/grade_steps.py` | Chấm từng bước từ các dòng: máy kiểm (SymPy, cân bằng hóa học) + AI chỉ bước sai đầu tiên | Chấm câu tự luận |
| `formula_check.check_formula` | So tương đương hai biểu thức; không đọc được → `None` | Đáp số cuối, câu gõ đáp số |
| `routers/similar_problems.py` | Sinh đề tương tự, đáp án đã được máy kiểm | Nguồn "AI tạo trong tiết" |
| `store/console_db.py` | Giáo viên (phiên `session_teacher`), lớp (chỉ sĩ số), tiết (`period_by_board`, trạng thái `live/ended`) | Nguồn danh tính giáo viên, lớp, tiết, bảng |
| hub (`services/ai-engine/hub`) | Học sinh có mã đăng nhập, token, sự kiện học tập, mastery, chỉ số, luồng sự kiện, báo cáo phụ huynh | Lõi của tính năng này |
| `pypdfium2` | Có trong máy, chưa có trong `requirements.txt` | Đổi trang PDF thành ảnh (thêm vào `requirements.txt`; không dùng PyMuPDF vì AGPL) |

## 3. Kiến trúc

Hub là lõi: bài tập, lượt giao, bài nộp, OCR, chấm, sự kiện. Console (đỉnh 1), bảng (đỉnh 2) và student-app (đỉnh 3) chỉ gọi API hub. Không app nào import app khác.

- Module mới `services/ai-engine/hub/assignments/` (các tệp nhỏ một việc) + router `routers/hub_assignments.py`, tiền tố `/api/v1/hub`.
- Hợp đồng TS: `packages/types/src/assignments.ts` (type + Zod).
- **Nối với console, không sửa luồng cũ của teammate:**
  - Token giáo viên console (`Authorization: Bearer <phiên console>`) được hub chấp nhận qua `console_db.db().session_teacher`. Lần đầu hub tạo một giáo viên hub liên kết (`console_links`), không có PIN.
  - Token bảng console (`X-Board-Token`) được hub chấp nhận qua `console_db.db().period_by_board` → tiết console (giáo viên, lớp).
  - Lớp console ↔ lớp hub qua `class_links`. Lớp hub tạo khi giáo viên mở mục "Học sinh" của lớp trên console lần đầu; danh sách học sinh, mã đăng nhập, link phụ huynh dùng API hub hiện có.
  - Hết tiết: hub đọc trạng thái tiết console khi xử lý một lượt giao (lazy). Tiết `ended` → phần trong tiết của lượt giao đóng lại. Không thêm móc vào `routers/console.py`.
- Luồng sự kiện: dùng bus hub hiện có. Kênh mới `cboard:{periodId}` cho bảng console; kênh `teacher:{hubTeacherId}` sẵn có cho console.
- Tệp ảnh: `services/ai-engine/.data/assignments/` (trang đề) và `.data/submissions/` (ảnh vở), JPEG; SQLite chỉ lưu đường dẫn. Trên Render free ổ đĩa mất khi khởi động lại (như SQLite) — chấp nhận cho demo.

## 4. Mô hình dữ liệu (SQLite của hub)

| Bảng | Cột chính |
|---|---|
| `console_links` | `console_teacher_id` (PK), `hub_teacher_id` |
| `class_links` | `console_class_id` (PK), `hub_class_id` |
| `assignments` | `id`, `teacher_id` (hub), `title`, `subject`, `kind` (`exercise`/`exam`), `source` (`file`/`photos`/`bank`/`ai`), `current_version`, `created_at`, `updated_at` |
| `assignment_versions` | `assignment_id`, `version`, `payload` (JSON `AssignmentBody`), `created_at` |
| `assignment_pages` | `assignment_id`, `page` (0-based), `path`, `width`, `height` |
| `assignment_runs` | `id`, `code` (8 ký tự, duy nhất), `assignment_id`, `version`, `teacher_id`, `class_id` (hub), `period_id` (console, có thể rỗng), `opened_at`, `closed_at`, `due_at`, `status` (`open`/`closed`) |
| `submissions` | `id`, `run_id`, `student_id`, `question_id`, `attempt`, `request_id` (duy nhất theo học sinh), `mode` (`choice`/`typed`/`photo`), `photo_path`, `ocr` (JSON máy đọc), `confirmed` (JSON dòng học sinh xác nhận), `grade` (JSON kết quả chấm), `status`, `score` (0–1, null khi chờ), `phase` (`in_class`/`homework`), `correction` (JSON nét chữa của giáo viên), `created_at`, `reviewed_at` |

### 4.1 Hợp đồng bài tập

```ts
type QuestionType = 'choice' | 'short' | 'essay' | 'open';
interface Question {
  id: string;                         // [a-z0-9-], giữ nguyên qua các version
  type: QuestionType;
  label: string;                      // "Câu 1", "Bài 2a"
  text: string;                       // nội dung chữ/LaTeX ($...$), ≤ 2000
  page?: number; box?: [number, number, number, number]; // vị trí trên trang, tỉ lệ 0–1 (x, y, w, h)
  options?: string[];                 // choice: 2–6
  answer?: string;                    // chỉ máy chủ: choice → chỉ số dạng "1"; short/essay → biểu thức đáp số
  kcs: {id: string; label: string}[]; // như giáo án hub
  points?: number;                    // trọng số trong đề, mặc định 1
}
interface AssignmentBody { title: string; subject: Subject; kind: 'exercise' | 'exam'; questions: Question[] } // 1–40 câu
```

- `answer` bắt buộc với `choice`, `short`, `essay`; không có với `open`. Đáp án `short`/`essay` phải qua `check_formula(a, a) is True` (như giáo án hub).
- Bản công khai (bảng, học sinh) bỏ `answer`.

### 4.2 Trạng thái bài nộp

| Trạng thái | Khi nào | Tính điểm, mastery |
|---|---|---|
| `graded` | máy chắc chắn | có |
| `pending_teacher` | máy không chắc, hoặc câu `open` | không, cho tới khi giáo viên duyệt |
| `teacher_confirmed` | giáo viên đã chấm/xác nhận (kể cả sửa điểm bài `graded`) | có, theo điểm giáo viên |

## 5. Các luồng

### ① Soạn trên đỉnh 1 (console → hub)

- `POST /hub/assignments/upload` (multipart, ≤ 15 MB): PDF (tối đa 20 trang, mỗi trang render ~1600 px JPEG) hoặc 1–20 ảnh. Tạo bài tập nháp với trang, chưa có câu.
- `POST /hub/assignments/{id}/extract`: AI đọc các trang (đường Vision hiện có) và trả danh sách câu đề xuất (loại, nội dung, trang, khung, đáp án nếu file có lời giải, phương án trắc nghiệm). Hạn 60 giây; hỏng hoặc quá hạn → `{questions: [], source: "offline"}`. Không bịa đáp án: AI chỉ điền đáp án khi file có lời giải/đáp án.
- `POST /hub/assignments/quick-key {text}`: phân tích ô tự khai, ví dụ `1B 2C 3: x=2 4: tự luận` → danh sách câu (không có AI).
- `PUT /hub/assignments/{id} {body, baseVersion}`: lưu, tăng version (giống giáo án hub: không đổi thì giữ version, sai base → 409). Lượt giao đang mở dùng version mới cho học sinh vào sau.
- Ngân hàng đề: `GET /hub/assignments` (lọc theo môn, từ khóa); trên màn soạn có nút "Thêm câu từ bài khác" (chép câu, sinh id mới).
- Trong tiết: trên bảng, nút "Thêm câu tương tự" gọi bộ sinh đề sẵn có rồi `POST /hub/board/assignments/{id}/questions` (bảng của đúng tiết) → version mới.

### ② Mở trên bảng (đỉnh 2)

- Bảng đã ghép tiết console (`X-Board-Token`). Ngăn mới **"Bài tập"**: `GET /hub/board/assignments` (bài của giáo viên đang dạy).
- Trình xem: các trang ảnh, chụm/cuộn để thu phóng, kéo để di chuyển; danh sách câu bên cạnh, chạm câu → phóng tới `box`. Câu không có trang (AI tạo) hiện dạng thẻ chữ/LaTeX.
- Giáo viên vẫn viết bút lên trên trang; nét này là lớp ghi chú của trình xem, không đổi đề.

### ③ Giao bài bằng QR

- Nút **"Giao bài"** → `POST /hub/board/runs {assignmentId}` → `{runId, code, url}` với `url = {STUDENT_APP_URL}/a/{code}`. Lượt giao gắn với lớp hub của lớp console và tiết console hiện tại.
- Bảng hiện QR lớn (thư viện `qrcode` đã có), ẩn/hiện được. Nút "Đóng nhận bài" → `POST /hub/board/runs/{id}/close`.
- Giáo viên cũng giao/đóng từ console (`/hub/runs` với token giáo viên).

### ④ Học sinh làm bài (đỉnh 3, `student-app/a/[code]`)

- Chưa có token hub → nhập mã học sinh (dùng `POST /hub/auth/student`), lưu token trên máy.
- `GET /hub/runs/by-code/{code}` (token học sinh): đề công khai (trang, câu không có đáp án), trạng thái từng câu của em, `phase` hiện tại, hạn nộp. Không thuộc lớp → 403 `not_in_class`; hết hạn hoàn toàn → 410 `run_closed`.
- Trang đề xem được (thu phóng). Theo loại câu:
  - `choice`: chọn → `POST /hub/runs/{id}/answers {questionId, choice, requestId}` → kết quả ngay.
  - `short`: gõ → cùng endpoint với `{text}` → `check_formula`.
  - `essay`/`open`: chụp vở (`<input type=file accept="image/*" capture="environment">`), app nén còn cạnh dài 1600 px, JPEG ≤ 400 KB → `POST /hub/runs/{id}/photos {questionId, requestId}` (multipart) → máy đọc → trả `{photoId, lines, uncertain}`.
- **Màn xác nhận:** các dòng máy đọc (hiển thị KaTeX); mỗi chỗ `uncertain` là ô chọn (token gốc + phương án thay thế); học sinh sửa được cả dòng bằng ô gõ; nút "Chụp lại". Phải chọn xong mọi ô không chắc mới bấm được **"Đúng rồi, nộp"** → `POST /hub/runs/{id}/photos/{photoId}/confirm {lines}`.
- Không có AI / máy không đọc được: màn xác nhận trống để học sinh tự gõ dòng, hoặc nút "Chỉ nộp ảnh" → `pending_teacher`.
- Nộp lại một câu được nhiều lần (`attempt` tăng). Lần đầu dùng cho "đúng lần đầu"; lần gần nhất là kết quả hiện tại. Cùng `requestId` → trả kết quả cũ; khác nội dung cùng `requestId` → 409.

### ⑤ Chấm và quy tắc "chắc chắn"

| Loại | Chấm | Trạng thái |
|---|---|---|
| `choice` | so chỉ số đáp án | `graded` |
| `short` | `check_formula(text, answer)`; `None` → `pending_teacher` | `graded` / `pending_teacher` |
| `essay` | dòng cuối đã xác nhận vs `answer` bằng `check_formula`; `grade-steps` (máy kiểm + AI) chỉ bước sai đầu tiên và giải thích | `graded` khi `check_formula` trả `True`/`False` **và** học sinh đã chọn hết ô không chắc; ngược lại `pending_teacher` |
| `open` | `grade-steps` nhận xét | luôn `pending_teacher` |

- Điểm câu: `graded` → 1 (đúng) / 0 (sai); giáo viên đặt bất kỳ 0–1. Điểm đề = Σ(điểm × `points`) / Σ`points` × 10 (chỉ tính câu đã có điểm; câu chờ hiện "đang chấm").
- `grade-steps` gọi trong luồng nền với hạn 60 giây; quá hạn thì giữ phần máy đã kiểm, trạng thái theo bảng trên.
- Mỗi bài `graded` / `teacher_confirmed` ghi `learning_events` (hub): `session_id` = id lượt giao, `section_id` = `asg:{assignmentId}`, `item_id` = `{runId}:{questionId}`, `kc_id` theo từng KC, `kind` `correct`/`incorrect`, kèm `phase`. Cập nhật mastery như hub (nộp lại câu đã đúng không cộng thêm bằng chứng). Phát `metric_delta` và `submission_update`.

## 6. Theo dõi, duyệt, chữa bài trong tiết

**Console (có tên học sinh)** — tab mới "Bài tập" trong màn tiết đang dạy:
- Lưới học sinh × câu (màu: chưa làm / đúng / sai / chờ), sĩ số đã nộp; cập nhật qua `GET /hub/stream/teacher` (`submission_update {runId, studentId, questionId, status}`).
- Hàng "chờ giáo viên": mở bài → ảnh gốc, dòng đã xác nhận cạnh dòng máy đọc, bước sai đầu tiên + nhận xét AI → **Đúng / Sai / điểm 0–1 / sửa dòng** → `POST /hub/submissions/{id}/review {score, lines?}` → `teacher_confirmed`. Bài `graded` cũng sửa điểm được.
- Nút "Chiếu lên bảng" → `POST /hub/runs/{runId}/show {submissionId}` → bảng nhận `show_submission`.

**Bảng (không bao giờ có tên)**:
- Thanh tiến độ từng câu: số đã nộp, % đúng (`GET /hub/board/runs/{id}/progress`).
- "Chọn bài để chữa": ảnh thu nhỏ ẩn danh ("Bài 1…n", thứ tự cố định theo lúc nộp), lọc theo câu và trạng thái (`GET /hub/board/runs/{id}/submissions?questionId=&status=`).
- Chiếu bài: ảnh vở trong trình xem (thu phóng); dòng chứa bước sai đầu tiên tô đỏ theo `y0/y1` của dòng đó; thẻ giải thích. Giáo viên viết chữa; "Lưu phần chữa" → `PUT /hub/board/submissions/{id}/correction {strokes}` (nét trong hệ tọa độ ảnh, ≤ 200 nét).

**Đóng và hết tiết**:
- Đóng nhận bài (bảng hoặc console) → `closed_at` = bây giờ, `due_at` = bây giờ + 3 ngày (giáo viên sửa được: `PUT /hub/runs/{id} {dueAt}`).
- Tiết console `ended` mà lượt giao còn mở → coi như đóng lúc `ended_at` (lazy, khi lượt giao được đọc).
- Sau khi đóng và trước `due_at`: `phase = homework`; học sinh nộp cùng luồng ④. Sau `due_at`: chỉ xem.

## 7. Đóng gói sang đỉnh 3 và ngược về đỉnh 1

- `GET /hub/me/assignments` (học sinh): các lượt giao của lớp, mỗi lượt có điểm của em, trạng thái từng câu, hạn bài về nhà, phần chữa của em (ảnh + nét chữa + dòng đỏ), và các bài chữa mẫu ẩn danh của lớp (giáo viên đã lưu phần chữa).
- Student-app: mục "Bài tập" (bài đang mở, bài về nhà, đã xong) và trang chi tiết xem phần chữa.
- Câu có đáp án mà em làm sai hoặc chưa làm được thêm vào **bài học Socratic** như câu hỏi giáo án: route Mode 2 `GET /api/v1/student/lesson/{student_id}?run_id=<runId>` (token hub học sinh) dựng bài học một cảnh mỗi câu, `COMPUTE`/`PREDICT` với key ở máy chủ; lượt chấm ghi sự kiện qua đường của mục ⑤.
- Đỉnh 1: `GET /hub/runs/{id}/metrics` — theo câu: % đã nộp, % đúng, % đúng lần đầu, đáp số sai hay gặp (ẩn danh, gộp như chỉ số hub), số bài chờ; theo học sinh: điểm, số câu chờ. Chỉ số lớp/học sinh hiện có của hub tự gồm sự kiện bài tập (vì cùng `learning_events`). `total` của học sinh cộng thêm số câu của các lượt giao của lớp.
- Báo cáo phụ huynh thêm: "Bài tập: x/y câu đúng; nộp đúng hạn z/w lượt".

## 8. Phân quyền và riêng tư

| Ai | Bằng gì | Được |
|---|---|---|
| Giáo viên | phiên console (Bearer) hoặc token hub `teacher` | bài tập, lượt giao, bài nộp, duyệt của chính mình; khác → 404 |
| Bảng | `X-Board-Token` của tiết console đang `live` | bài tập của giáo viên tiết đó; lượt giao của tiết đó; dữ liệu bài nộp **không có tên, không có id học sinh** (chỉ nhãn "Bài n") |
| Học sinh | token hub `student` | lượt giao của lớp mình; chỉ bài nộp và phần chữa của mình; bài chữa mẫu ẩn danh |

- Ảnh (trang đề, ảnh vở) tải qua `GET /hub/files/{id}` có kiểm quyền như trên; client dùng `fetch` có header rồi tạo object URL (không có đường dẫn công khai).
- Ảnh vở có thể có tên học sinh viết trên vở: bảng chỉ hiện khi giáo viên chủ động chọn bài đó.

## 9. Xử lý lỗi

| Tình huống | Cách xử lý |
|---|---|
| Quét QR khi đã đóng | còn hạn → chế độ bài về nhà; quá hạn → "Đã hết hạn nhận bài" (410) |
| Không thuộc lớp | 403 `not_in_class`, app báo "Bài này không dành cho lớp của em" |
| Ảnh > 2 MB sau nén / sai định dạng | 413 / 415; app luôn nén trước khi gửi |
| AI đọc ảnh lỗi/quá hạn | trả `lines: []`, học sinh tự gõ hoặc "Chỉ nộp ảnh" → `pending_teacher` |
| AI tách câu lỗi/quá hạn | ô tự khai; file vẫn lưu và hiển thị |
| PDF hỏng / > 20 trang / > 15 MB | 422 / 413 kèm thông báo |
| Nộp trùng `requestId` | trả kết quả cũ; khác nội dung → 409 |
| Bảng chưa ghép tiết | ngăn "Bài tập" báo "Ghép bảng với tiết để mở bài tập" |
| Tiết console chưa chọn lớp | "Giao bài" trả 409 `period_has_no_class`; bảng báo "Chọn lớp cho tiết trên trang quản lý" (vẫn mở và xem đề được) |
| Lớp chưa có danh sách học sinh | "Giao bài" vẫn tạo lượt giao nhưng bảng cảnh báo "Lớp chưa có học sinh: thêm ở mục Học sinh trên trang quản lý"; học sinh thêm sau vẫn vào được |
| Giáo viên sửa đề khi đang giao | học sinh đã vào giữ version cũ cho tới khi tải lại; bài nộp ghi version |

## 10. Kiểm thử

- **pytest**: PDF → trang (PDF mẫu tạo trong test bằng Pillow), giới hạn trang/kích thước; tách câu với LLM giả lập (hợp lệ, sai schema bị bỏ, offline); ô tự khai; lưu version; lượt giao/QR (đóng, hết hạn, sai lớp, tiết console `ended` → bài về nhà); 4 loại câu; quy tắc chắc chắn; xác nhận OCR (Vision giả lập, ô không chắc chưa chọn → 422); duyệt/sửa điểm; sự kiện + mastery; bảng không nhận tên/id học sinh; quyền tải ảnh; `requestId`; token console được hub chấp nhận; bài học Socratic `?run_id=`.
- **Vitest**: student-app (nhập mã, `/a/[code]`, màn xác nhận, bài về nhà, phần chữa); console (soạn/duyệt, lưới, hàng chờ); bảng (trình xem thu phóng, QR, chọn bài, chiếu và lưu phần chữa).
- **e2e**: tải đề → giao → nộp ảnh + xác nhận → duyệt → chiếu → hết tiết → bài về nhà → chỉ số.

## 11. Ngoài phạm vi đợt này

Trình mở slide (PDF bài giảng) — spec riêng sau, dùng lại trình xem trang của mục ②; file Word/PowerPoint (giáo viên xuất PDF); nhận dạng nhiều câu trong một ảnh; chấm điểm từng phần theo thang chi tiết; chống gian lận khi làm ở nhà; lưu ảnh lên dịch vụ bên ngoài (S3…); thông báo đẩy về điện thoại.

## 12. Phân công và thứ tự làm

Bên này làm cả năm bước; với console và bảng của teammate **chỉ thêm** màn/ngăn mới và một mục menu, không sửa luồng cũ; ghi phạm vi đang sửa vào `.ai/HANDOFF.md` trước khi làm.

1. Backend hub: liên kết console, bài tập + trang + tách câu + ô tự khai, lượt giao, bài nộp + OCR + chấm, sự kiện, hợp đồng `assignments.ts`.
2. Student-app: nhập mã, `/a/[code]`, màn xác nhận, mục "Bài tập", phần chữa, bài học Socratic `?run_id=`.
3. Console: màn "Bài tập" (tải, duyệt câu, ngân hàng), mục "Học sinh" của lớp, tab "Bài tập" trong tiết (lưới, hàng chờ, chiếu).
4. Bảng: ngăn "Bài tập" (trình xem thu phóng, giao/QR, tiến độ, chọn bài, chiếu và chữa).
5. Chỉ số, báo cáo phụ huynh, e2e, cập nhật `INTERFACES.md`, `ARCHITECTURE.md`, `HANDOFF.md`.

Mỗi bước có test xanh và chạy được trước khi sang bước sau; mỗi bước một plan riêng.
