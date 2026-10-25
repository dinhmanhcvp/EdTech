# Triển khai bản web: Render (máy chủ AI) + Vercel (giao diện)

```
Trình duyệt ──► Vercel (Next.js, giao diện)  ──/api/v1/*──►  Render (FastAPI, máy chủ AI)
```

Giao diện gọi `/api/v1/...` cùng tên miền; Vercel **chuyển tiếp (rewrite)** sang Render nên trình duyệt không gặp lỗi CORS.
Làm theo thứ tự: **0 → 1 (Render) → 2 (Vercel) → 3 (kiểm tra)**. Cần Render trước vì Vercel phải biết địa chỉ của nó.

---

## 0. Chuẩn bị (một lần)

1. Tài khoản GitHub (repo hiện tại: `github.com/dinhmanhcvp/EdTech`), tài khoản [Render](https://render.com) và [Vercel](https://vercel.com) — đăng nhập bằng GitHub cho tiện.
2. **Đẩy mã lên GitHub.** Mở terminal tại thư mục `Edtech`:
   ```bash
   git status
   git push origin main
   ```
   Lưu ý:
   - Chỉ những gì đã **commit** mới được triển khai. Các thay đổi chưa commit (trang `/pitch`, `analytics/`, `public/`, `page.tsx`…) sẽ **không** có trên web.
   - **Đừng `git add` các tệp video/slide** (`*.mp4`, `*.mov`, `*.pptx`…): GitHub từ chối tệp > 100 MB. Thêm chúng vào `.gitignore` nếu cần.
3. Tệp cấu hình đã có sẵn trong repo: `render.yaml` (gốc repo), `socratic-monorepo/apps/teacher-board/vercel.json`, `next.config.js` (đọc `BACKEND_URL`), `requirements.txt` (đã thêm `pillow`, `google-generativeai`).

---

## 1. Render — máy chủ AI (FastAPI)

### Cách A: Blueprint (nhanh nhất)
1. Render Dashboard → **New +** → **Blueprint**.
2. **Connect** repo `EdTech` → Render đọc `render.yaml` và hiện dịch vụ **socratic-ai-engine** (Free).
3. Mục `GEMINI_API_KEY`: dán khóa Gemini nếu có (để trống cũng được, xem mục 4) → **Apply**.
4. Chờ build 3–6 phút tới khi trạng thái **Live**.

### Cách B: tạo tay (nếu Blueprint báo lỗi)
New + → **Web Service** → chọn repo → điền:

| Ô | Giá trị |
|---|---|
| Name | `socratic-ai-engine` |
| Root Directory | `socratic-monorepo/services/ai-engine` |
| Runtime | Python 3 |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Instance Type | Free |
| Health Check Path (Advanced) | `/health` |
| Environment | `PYTHON_VERSION` = `3.12.8` (tùy chọn `GEMINI_API_KEY`) |

### Lấy địa chỉ và kiểm tra
Đầu trang dịch vụ có địa chỉ dạng `https://socratic-ai-engine-xxxx.onrender.com`. Mở:

- `https://…onrender.com/health` → phải thấy `{"status":"healthy", …}`.
- `https://…onrender.com/docs` → trang Swagger liệt kê các API.

**Ghi lại địa chỉ này** (không có dấu `/` ở cuối) cho bước 2.

---

## 2. Vercel — giao diện (Next.js)

1. Vercel Dashboard → **Add New… → Project** → **Import** repo `EdTech`.
2. Ở màn hình *Configure Project*:
   - **Root Directory**: bấm *Edit* → chọn `socratic-monorepo/apps/teacher-board`.
   - Bật **Include source files outside of the Root Directory in the Build Step** (bắt buộc: giao diện dùng `packages/types`, `packages/ui` nằm ngoài thư mục này; thường đã bật sẵn).
   - **Framework Preset**: Next.js (tự nhận). Install/Build Command đã nằm trong `vercel.json`, không cần sửa.
3. Mở **Environment Variables**, thêm:

   | Name | Value |
   |---|---|
   | `BACKEND_URL` | `https://socratic-ai-engine-xxxx.onrender.com` (địa chỉ Render ở bước 1, **không** có `/` cuối) |

   > Biến này được dùng lúc **build** để tạo rewrite, đồng thời là địa chỉ mà trình duyệt nối thẳng WebSocket của **Lớp học (BYOD)** — Vercel không chuyển tiếp WebSocket qua rewrite. Nếu đổi sau này phải **Redeploy**.
4. Bấm **Deploy**. Sau 1–3 phút nhận địa chỉ `https://ten-du-an.vercel.app`.

---

## 3. Kiểm tra bản đã triển khai

1. Mở `https://ten-du-an.vercel.app/api/v1/plot?equation=sin(x)&format=json` → thấy JSON có `svg` ⇒ **Vercel → Render thông**.
   (Lần đầu có thể chờ ~30–60 giây vì Render gói Free đang "ngủ".)
2. Mở trang chủ, viết `y = x^2 - 3` lên bảng → bấm **Chữ → Công thức** → hộp thoại hiện công thức → **Vẽ đồ thị**.
3. Vẽ tay một hình hộp, khoanh vùng → **Trực quan hóa** → khối 3D.
4. **Lớp học:** bấm *Lớp học → Tạo lớp học* trên bảng, mở đường dẫn `/join/<mã>` trên điện thoại, nhập tên → học sinh thấy mô phỏng của bảng. (Render Free cho phép WebSocket nhưng sẽ "ngủ" nếu không có kết nối 15 phút; phòng học nằm trong bộ nhớ nên mất khi máy chủ khởi động lại.)
5. Nếu có khóa Gemini: trong hộp thoại Chữ → Công thức, nút **AI Vision** phải sáng lên (không còn dòng "AI Vision chưa dùng được").

Nếu bước 1 lỗi, xem bảng xử lý sự cố bên dưới.

---

## 4. Khóa Gemini (tùy chọn) — cách an toàn

- Không có khóa: mọi thứ vẫn chạy; nhận dạng chữ viết tay dùng bộ **cục bộ** (nhanh nhưng kém với chữ viết thật, không đọc tiếng Việt có dấu).
- Có khóa: đặt ở **Render → Environment → `GEMINI_API_KEY`** (đừng dán vào ô Cài đặt trên web công khai).
  Lý do: máy chủ lưu khóa nhập từ trình duyệt vào biến môi trường **dùng chung cho mọi người** và điểm cuối `/api/v1/canvas/settings/gemini-key` không có xác thực. Với web công khai, ai truy cập cũng có thể dùng/ghi đè khóa của bạn và tiêu tốn hạn mức. Nếu chỉ trình chiếu/thi, hãy đặt khóa trên Render rồi **không công bố** địa chỉ rộng rãi, hoặc cần thì nhờ tôi thêm xác thực.

---

## 5. Giới hạn cần biết (gói Free)

| Vấn đề | Chi tiết |
|---|---|
| Render "ngủ" | Không có truy cập 15 phút thì dịch vụ ngủ; lần gọi đầu mất ~30–60 giây. **Trước buổi thi/trình chiếu hãy mở `/health` để đánh thức**. |
| Ổ đĩa tạm | Dữ liệu ghi vào đĩa Render mất khi khởi động lại (bộ nhớ đệm, heatmap lớp học dùng bộ nhớ tiến trình). |
| Lưu nét viết mẫu | Điểm cuối `user-ink` của Next ghi vào đĩa, mà Vercel chỉ đọc → lưu lên đĩa không được; app vẫn lưu trong trình duyệt (localStorage) nên chỉ mất khi đổi máy. |
| OCR ảnh | `rapidocr`/`opencv` **không** cài (nặng, sát giới hạn 512 MB RAM gói Free). Ảnh hưởng nhỏ: chỉ mất khả năng "đoán" nội dung từ ảnh khi **không gõ gợi ý và không có khóa Gemini**. Các tính năng mới (Chữ → Công thức cục bộ, vẽ tay → khối 3D, đồ thị) chạy trong trình duyệt nên không phụ thuộc OCR. Máy phát triển của bạn cũng chưa cài `rapidocr`, nên hành vi giống hệt bản triển khai. |
| Giới hạn Vercel | Gói Hobby chỉ cho dự án **phi thương mại**; rewrite tới Render có thời hạn ~30 giây/lần gọi. |

---

## 6. Cập nhật sau này

`git push` lên nhánh `main` ⇒ Render và Vercel tự build lại. Đổi `BACKEND_URL` ⇒ *Vercel → Deployments → ⋯ → Redeploy*.

## 7. Xử lý sự cố

| Triệu chứng | Nguyên nhân thường gặp | Cách sửa |
|---|---|---|
| Vercel: `Module not found: @socratic/types` | Chưa bật "Include source files outside of the Root Directory", hoặc sai Root Directory | Settings → General: Root Directory = `socratic-monorepo/apps/teacher-board`, bật tùy chọn trên, Redeploy |
| Vercel build lỗi ở bước install | Lệnh install không chạy từ thư mục gốc workspace | Kiểm tra `vercel.json` có `installCommand: "cd ../.. && npm install"` |
| Trang mở được nhưng `/api/v1/...` trả 404/500 hoặc "ECONNREFUSED 127.0.0.1" | Chưa đặt `BACKEND_URL` **trước khi build** | Thêm biến, Redeploy |
| `/api/v1/...` chờ lâu rồi lỗi 504/502 | Render đang thức dậy | Mở `/health` của Render, chờ ~1 phút, thử lại |
| Render: "No open ports detected" | Start Command không dùng `$PORT` | Dùng đúng `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Render build: `Could not find a version…` | Phiên bản Python không có trên Render | Xóa biến `PYTHON_VERSION` hoặc đặt `3.11.9` |
| AI Vision luôn "chưa dùng được" | Thiếu/sai `GEMINI_API_KEY`, hoặc Render đang ngủ | Kiểm tra khóa trong Render → Environment; xem Logs có dòng `[recognize-ink]` |

## 8. Thử cục bộ giống hệt môi trường thật

```bash
# Terminal 1 — máy chủ AI
cd socratic-monorepo/services/ai-engine
pip install -r requirements.txt
uvicorn main:app --port 8000

# Terminal 2 — giao diện (BACKEND_URL mặc định là http://127.0.0.1:8000)
cd socratic-monorepo/apps/teacher-board
npm run build && npm run start      # http://localhost:3001
```
