# Triển khai bản web: Vercel (hai giao diện) + Render (máy chủ AI)

```
Trình duyệt ─┬─► Vercel  socratic-board    (bảng giáo viên, Next.js, tệp tĩnh qua CDN)
             ├─► Vercel  socratic-student  (ứng dụng học sinh, Next.js)
             └─► Render  socratic-ai-engine (FastAPI)  ◄── trình duyệt gọi THẲNG (REST + WebSocket Lớp học)
```

## 0. Vì sao bản web vẫn mượt như chạy cục bộ

| Việc | Chạy ở đâu | Ghi chú |
|---|---|---|
| Viết/vẽ, nhận dạng chữ viết tay (bộ cục bộ), định tuyến 42 mô phỏng, mô phỏng, hình học, vẽ hình từ đề, tua lại bài giảng | **Trong trình duyệt** | Không phụ thuộc mạng; giống hệt local |
| Đồ thị (matplotlib), Vision đọc chữ, chấm bài, Lớp học realtime | Render | Một chặng từ trình duyệt tới Render; Singapore gần Việt Nam |

Những thay đổi đã làm để bản web không chậm hơn local:

- **Trình duyệt gọi thẳng Render** (biến `NEXT_PUBLIC_BACKEND_URL` tự lấy từ `BACKEND_URL`): bỏ một chặng proxy của Vercel và giới hạn 30 giây của rewrite. Rewrite còn lại chỉ là đường dự phòng.
- **Hết mọi lời gọi tới `127.0.0.1`** trong mã giao diện (trước đây còn 14 chỗ). Trên web công khai Chrome sẽ hỏi quyền "truy cập thiết bị trong mạng nội bộ" nếu trang gọi `127.0.0.1`; nay mọi địa chỉ đi qua `apiBase()` (`src/utils/apiBase.ts`).
- **Khởi động nóng + nén gzip** trên Render: lời gọi đầu tiên không bị giật vì nạp thư viện nặng; JSON/SVG lớn nén nhỏ hơn nhiều.
- **WebSocket Lớp học chạy được**: `requirements.txt` trước đây chỉ có `uvicorn` trơn nên WebSocket trả 404 trên Render; nay dùng `uvicorn[standard]`.
- **Region Singapore** cho cả Render (`render.yaml`) lẫn hàm của Vercel (`vercel.json`).

Đã kiểm chứng trong môi trường Python **sạch chỉ cài `requirements.txt`** (giả lập Render, chạy `APP_ENV=production`, không có tệp `.env`): khởi động tới `/health` trong 1,7 giây; đồ thị lần đầu 0,22 giây; gzip hoạt động; CORS cho `*.vercel.app` và chặn tên miền lạ; ghi khóa AI qua API bị tắt; giới hạn tần suất trả 429 đúng; tạo phòng và nối WebSocket giáo viên thành công. Đây là giả lập trên máy bạn, **chưa phải bản chạy thật trên Render/Vercel**: hãy làm bước 4 (kiểm tra) sau khi deploy.

---

## 1. Chuẩn bị (một lần)

1. Tài khoản GitHub (repo `github.com/dinhmanhcvp/EdTech`), [Render](https://render.com), [Vercel](https://vercel.com); đăng nhập bằng GitHub.
2. Đẩy mã lên GitHub (chỉ phần đã **commit** mới được triển khai):
   ```bash
   git status
   git push origin main
   ```
   Đừng `git add` video/slide (`*.mp4`, `*.mov`, `*.pptx`): GitHub từ chối tệp > 100 MB. Khóa AI thật nằm trong `services/ai-engine/.env` và `apps/teacher-board/.env.local`; hai tệp này đã được `.gitignore` bỏ qua và **không** được triển khai. Khóa phải nhập lại trên Render (bước 2).

## 2. Render: máy chủ AI

1. Render Dashboard → **New +** → **Blueprint** → chọn repo → Render đọc `render.yaml` và tạo dịch vụ **socratic-ai-engine** (region Singapore).
2. Điền các biến hỏi khi tạo (có thể sửa sau trong *Environment*):

   | Biến | Giá trị | Ghi chú |
   |---|---|---|
   | `OPENROUTER_API_KEYS` | `sk-or-v1-…` | **Bắt buộc cho AI Vision**. Nhiều khóa ngăn bằng dấu phẩy để tự xoay vòng |
   | `VISION_PROVIDER` | `auto` (đã đặt sẵn) | Gemini trước, OpenRouter dự phòng; `openrouter` hoặc `gemini` để chỉ dùng một bên |
   | `GEMINI_API_KEYS` | `AQ.…1,AQ.…2` | Nhiều khóa, mỗi khóa một dự án Google; `GEMINI_RPM_PER_KEY` (mặc định 8) giữ mỗi khóa dưới hạn mức |
   | `OPENROUTER_VISION_MODELS` | để trống | Tùy chọn. Mặc định thử lần lượt `google/gemini-2.5-flash`, `google/gemini-2.5-flash-lite`, `qwen/qwen3-vl-30b-a3b-instruct`, `openai/gpt-4o-mini`, rồi `google/gemma-4-31b-it:free` |
   | `CORS_ORIGINS` | để trống lúc đầu | Điền sau bước 4 (hai địa chỉ Vercel) |
   | `ADMIN_TOKEN` | Render tự sinh | Chỉ cần khi muốn ghi khóa AI qua API (xem mục 6) |

   Đã đặt sẵn trong `render.yaml`: `APP_ENV=production`, `CORS_ORIGIN_REGEX` (cho mọi `*.vercel.app`), `RATE_LIMIT_PER_MIN=90`, `PYTHON_VERSION=3.12.8`.
3. Chờ build (vài phút) tới **Live**. Mở `https://<tên>.onrender.com/health` phải thấy `"status":"healthy"` và `"gemini_configured":true` nếu đã nhập khóa. **Ghi lại địa chỉ này** (không có `/` cuối).

## 3. Vercel: hai dự án giao diện

Làm **hai lần**, mỗi lần một dự án (cùng repo, khác thư mục gốc): **Add New… → Project → Import** repo `EdTech`.

| | Dự án 1: bảng giáo viên | Dự án 2: ứng dụng học sinh |
|---|---|---|
| Tên gợi ý | `socratic-board` | `socratic-student` |
| Root Directory | `socratic-monorepo/apps/teacher-board` | `socratic-monorepo/apps/student-app` |
| Include source files outside of the Root Directory | **Bật** (bắt buộc: dùng `packages/types`, `packages/ui`) | **Bật** |
| `BACKEND_URL` | địa chỉ Render (bước 2) | địa chỉ Render |
| Biến liên kết chéo | `NEXT_PUBLIC_STUDENT_URL` = địa chỉ dự án 2 | `NEXT_PUBLIC_TEACHER_URL` = địa chỉ dự án 1 |

Lệnh cài đặt/build đã nằm trong `vercel.json`, không cần sửa. Hai biến liên kết chéo chỉ dùng cho nút mở ứng dụng kia: có thể điền sau khi cả hai dự án đã có địa chỉ rồi bấm **Redeploy**.

> Build sẽ **dừng ngay với thông báo rõ** nếu thiếu `BACKEND_URL` hoặc nếu có biến `NEXT_PUBLIC_GEMINI_API_KEY` (biến `NEXT_PUBLIC_*` bị nhúng vào mã gửi cho mọi người truy cập nên lộ khóa). Khóa AI chỉ đặt trên Render.

## 4. Nối hai bên rồi kiểm tra

1. Quay lại Render → *Environment* → `CORS_ORIGINS` = `https://socratic-board.vercel.app,https://socratic-student.vercel.app` (địa chỉ thật của bạn) → lưu. (Trước bước này, mọi `*.vercel.app` vẫn gọi được nhờ `CORS_ORIGIN_REGEX`; dùng tên miền riêng thì bắt buộc đặt biến này.)
2. Kiểm tra theo thứ tự:
   - [ ] `…onrender.com/health` → `healthy`.
   - [ ] Mở `socratic-board.vercel.app`; góc trên phải **không** hiện lỗi đỏ; thanh trạng thái (nếu bật) báo sẵn sàng.
   - [ ] Viết `y = x^2 - 3` → khoanh → **Trực quan hóa** → đồ thị hiện. (Lần đầu có thể chờ vài giây nếu Render đang ngủ.)
   - [ ] **AI → Vẽ hình → Từ đề bài**: dán Đề 1 trong `docs/HUONG_DAN_VIET_DE_TRUC_QUAN.md` → vẽ được.
   - [ ] Viết tay một câu tiếng Việt (ví dụ "con lắc đơn") → khoanh → **Trực quan hóa** (cần khóa OpenRouter trên Render).
   - [ ] **Lớp học → Tạo lớp học**: mở `/join/<mã>` trên điện thoại → thấy mô phỏng của bảng, kéo thanh trượt đồng bộ.
   - [ ] Mở `socratic-student.vercel.app` → tab Gia sư AI; thử nhập "cho đáp án" → hàng rào Socratic.
   - [ ] Nhấn F12 → Console/Network: **không** có lời gọi tới `127.0.0.1`, không có lỗi CORS.

## 5. Giữ máy chủ luôn thức (quan trọng để "mượt")

Render gói Free **ngủ sau 15 phút không có truy cập**; lần gọi đầu sau khi ngủ chờ khoảng 30 đến 60 giây (khởi động lại, nạp thư viện). Chọn một cách:

| Cách | Làm thế nào | Đánh đổi |
|---|---|---|
| **A. Gói trả phí của Render** (khuyên dùng khi trình chiếu/thi) | Render → dịch vụ → *Settings → Instance Type* → chọn gói starter trở lên | Có phí; không ngủ; nhiều RAM hơn (xem mục OCR bên dưới). Xem giá hiện hành ở trang giá của Render |
| **B. Gọi `/health` định kỳ** (miễn phí) | Đã có `.github/workflows/keepalive.yml`: đặt biến kho `RENDER_URL` (GitHub → Settings → Secrets and variables → Actions → **Variables**) | GitHub có thể trễ vài phút và tự tắt lịch chạy nếu kho không hoạt động 60 ngày. Hoặc dùng dịch vụ giám sát ngoài (UptimeRobot, cron-job.org) gọi `/health` mỗi 5 đến 10 phút |
| **C. Đánh thức thủ công** | Trước buổi trình chiếu 5 phút, mở `…onrender.com/health` | Dễ quên |

Ngoài ra: giao diện tự gọi `/health` ngay khi mở trang (thanh trạng thái), nên mở bảng trước vài phút cũng đánh thức máy chủ.

**OCR thần kinh (RapidOCR/ONNX) và ChromaDB** không cài mặc định vì nặng (gói Free chỉ 512 MB RAM). Hệ quả: nhận dạng ảnh không có khóa OpenRouter kém hơn máy của bạn (máy bạn đang có RapidOCR). Việc chính (chữ → công thức, vẽ tay → khối, định tuyến mô phỏng, hình học, đề viết tay qua OpenRouter) chạy trong trình duyệt hoặc qua Gemini nên không bị ảnh hưởng. Nếu cần OCR đầy đủ, dùng gói Render ≥ 2 GB RAM và đổi lệnh build thành `pip install -r requirements-edge.txt`.

**AI (Vision, hỏi đáp, gia sư): bể khóa Gemini trước, OpenRouter dự phòng.** Đặt `GEMINI_API_KEYS` (nhiều khóa ngăn bằng dấu phẩy, **mỗi khóa từ một dự án Google khác nhau** vì hạn mức tính theo dự án) và `OPENROUTER_API_KEYS` làm dự phòng. Mỗi khóa Gemini bị giữ dưới `GEMINI_RPM_PER_KEY` lượt mỗi phút (mặc định 8, hạ xuống nếu hay gặp 429), hết lượt thì chuyển khóa khác rồi OpenRouter nên lúc quay video không bị ngắt. **Điều phối theo RPD (`llm/model_router.py`)**: model RPD lớn được dành cho Vision, hỏi đáp và gia sư; model RPD nhỏ chỉ đỡ khi model lớn đã dùng 90% lượt trong ngày (bộ đếm riêng cho từng cặp khóa + model, đặt lại lúc nửa đêm giờ Thái Bình Dương). Trong cùng model, khóa dùng ít nhất trong ngày được chọn trước để chia đều. Hạn mức thật từng model đặt bằng `GEMINI_MODEL_LIMITS=model:rpm:rpd,...` lấy từ trang Rate limit của AI Studio; chưa đặt thì dùng số giả định (2.5-flash 10/20 theo xác nhận của chủ dự án, 2.5-flash-lite 15/1000, còn lại 10/250) và tự học `quotaValue` từ lỗi 429. Xem trạng thái ở `/health` → `runtime.model_quota`. Hết hạn mức theo ngày (Google báo "PerDay") thì cặp khóa + model đó nghỉ tới nửa đêm Thái Bình Dương. Model mặc định đã đo thật ngày 2026-10-29: Vision `gemini-3-flash-preview` (1,5 đến 4,5 s, tắt suy nghĩ), hỏi đáp `gemini-3.5-flash` (~2,7 s); đổi bằng `GEMINI_VISION_MODELS` và `GEMINI_QA_MODELS`. Mã model OpenRouter đã đối chiếu với danh mục công khai ngày 2026-10-28, giá và độ trễ có thể đổi. Người dùng cũng có thể tự nhập khóa riêng trong hộp thoại *Kết nối AI* (chỉ lưu trong trình duyệt của họ, không bị tính vào giới hạn tần suất của máy chủ).

## 6. Bảo mật bản công khai

- **Khóa AI chỉ đặt trên Render.** Điểm cuối ghi khóa AI vào máy chủ (`/api/v1/canvas/settings/keys`) bị **tắt** ở `APP_ENV=production` (trả `status: disabled`); ai cũng gọi được web công khai nên không thể để họ ghi đè khóa dùng chung. Muốn ghi qua API: gửi tiêu đề `X-Admin-Token: <ADMIN_TOKEN>`.
- **Giới hạn tần suất**: `POST …/recognize-ink` và `POST …/compile-lasso` tối đa `RATE_LIMIT_PER_MIN` (mặc định 90) lần mỗi phút mỗi IP, vượt thì trả 429 kèm `Retry-After`. Các lớp học đông dùng chung một IP (mạng trường) vẫn thoải mái vì các điểm cuối của học sinh không bị giới hạn.
- **CORS**: đặt `CORS_ORIGINS` chính xác khi dùng tên miền riêng; `CORS_ORIGIN_REGEX` mặc định cho mọi `*.vercel.app` (siết lại thành tiền tố dự án của bạn nếu muốn).
- **Dữ liệu lớp học** (phòng, ghi chú, heatmap) nằm trong bộ nhớ máy chủ: mất khi Render khởi động lại. Đây là hành vi thiết kế hiện tại.
- Khóa từng được dán vào chat hoặc tệp tạm thì nên **tạo khóa mới** và thu hồi khóa cũ.

## 7. Giới hạn cần biết

| Vấn đề | Chi tiết |
|---|---|
| Vercel Hobby | Chỉ cho dự án **phi thương mại** |
| Lưu nét viết mẫu | Điểm cuối `user-ink` của Next ghi vào đĩa; Vercel chỉ đọc nên lưu lên máy chủ không được. Ứng dụng vẫn lưu trong trình duyệt (localStorage) |
| Tải trang đầu | Trang bảng giáo viên khoảng 630 kB mã (đã nén còn khoảng 1/3), tải một lần rồi được cache vĩnh viễn theo phiên bản. Muốn nhẹ hơn nữa có thể tách các engine mô phỏng bằng `next/dynamic` (việc về sau, có thể cần sửa test) |
| Font | Tải từ Google Fonts; cần có mạng khi mở lần đầu |
| WebSocket qua Vercel | Không chuyển tiếp được; Lớp học luôn nối thẳng Render (đã xử lý) |

## 8. Cập nhật, quay lui

- `git push origin main`: Render chỉ build lại khi mã máy chủ đổi (`buildFilter`), Vercel build lại giao diện.
- Đổi `BACKEND_URL` hoặc biến `NEXT_PUBLIC_*`: *Vercel → Deployments → ⋯ → Redeploy* (biến được nhúng lúc build).
- Quay lui: Vercel → Deployments → chọn bản cũ → **Promote to Production**; Render → *Events/Deploys* → **Rollback**.

## 9. Xử lý sự cố

| Triệu chứng | Nguyên nhân thường gặp | Cách sửa |
|---|---|---|
| Vercel build dừng: "Thiếu biến BACKEND_URL" | Chưa đặt biến trước khi build | Thêm `BACKEND_URL`, Redeploy |
| Vercel build dừng: "Không đặt khóa AI bằng NEXT_PUBLIC_*" | Có biến `NEXT_PUBLIC_GEMINI_API_KEY` | Xóa biến; đặt khóa trên Render |
| Vercel: `Module not found: @socratic/types` | Chưa bật "Include source files outside of the Root Directory" hoặc sai Root Directory | Settings → General sửa lại, Redeploy |
| Trang mở được nhưng tính năng AI báo lỗi mạng | Render đang ngủ; hoặc lỗi CORS | Mở `/health` của Render chờ ~1 phút; kiểm tra `CORS_ORIGINS`/Console |
| Console: "blocked by CORS policy" | Địa chỉ Vercel chưa nằm trong `CORS_ORIGINS` và không khớp regex | Thêm đúng địa chỉ (có `https://`, không có `/` cuối) |
| Lớp học: "Không nối được" | Thiếu `uvicorn[standard]` (đã sửa), hoặc `BACKEND_URL` sai/đổi mà chưa Redeploy | Kiểm tra `…/health`; Redeploy Vercel |
| Gọi AI trả 429 | Vượt `RATE_LIMIT_PER_MIN` từ một IP | Chờ theo `Retry-After`, hoặc tăng biến; hoặc nhập khóa riêng trong hộp thoại Kết nối AI |
| "AI Vision chưa dùng được" | Thiếu/sai khóa, hết hạn mức, hoặc Render đang ngủ | Kiểm tra `OPENROUTER_API_KEYS` (và số dư credit) trong Render → Environment; xem Logs |
| Nút "Mở ứng dụng học sinh" dẫn tới `#` | Chưa đặt `NEXT_PUBLIC_STUDENT_URL` | Đặt biến, Redeploy |
| Render: "No open ports detected" | Start Command không dùng `$PORT` | Dùng đúng lệnh trong `render.yaml` |
| Render build: không tìm thấy phiên bản Python | `PYTHON_VERSION` không có | Đặt `3.12.8` hoặc xóa biến |

## 10. Thử cục bộ giống hệt môi trường thật

```bash
# Terminal 1: máy chủ AI ở chế độ production (không đọc .env của bạn nếu đã đổi tên nó)
cd socratic-monorepo/services/ai-engine
pip install -r requirements.txt
APP_ENV=production CORS_ORIGINS=http://localhost:3001 uvicorn main:app --port 8000

# Terminal 2: giao diện đã build
cd socratic-monorepo/apps/teacher-board
BACKEND_URL=http://127.0.0.1:8000 npm run build && npm run start      # http://localhost:3001
```
Lưu ý: tệp `.env` cục bộ chỉ điền những biến chưa có (biến môi trường thật luôn thắng), nên `APP_ENV=production` ở dòng lệnh có hiệu lực kể cả khi `.env` ghi `APP_ENV=local`.
