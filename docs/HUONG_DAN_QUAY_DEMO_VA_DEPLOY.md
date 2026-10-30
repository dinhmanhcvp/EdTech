# Quay video: phát cảnh dựng sẵn trên bảng · Deploy 3 đỉnh lên 3 link Vercel

Các cảnh dưới đây là **bản ghi thao tác thật trên phần mềm thật** (script tự vẽ nét tay, bấm nút như người dùng, ghi lại). Kết quả AI trong video là câu trả lời Gemini thật đã lưu từ lúc ghi; chỉ đoạn chờ AI đọc chữ bị cắt bớt (kịch bản cho phép, không thêm chữ "tức thì").

Khi quay: mở link của cảnh trên đúng thiết bị → màn hình đứng ở khung đầu (trông như phần mềm đang chờ) → diễn viên vào vị trí → người điều khiển bấm phím ẩn → cảnh chạy, diễn viên cầm bút/ngón tay diễn theo. **Mỗi link chỉ có một cảnh, không tự chạy sang cảnh khác.** Hết cảnh, màn giữ khung cuối; bấm phím lần nữa là quay lại shot từ đầu.

## 0. Ngày quay: chỉ cần mở link

Tất cả cảnh, **kể cả cảnh của trang quản lý (đỉnh 1) và app học sinh, phụ huynh (đỉnh 3)**, đều nằm trên link của bảng: mở `<BANG>/demo?scene=<mã>` trên đúng thiết bị là xong. Hai link Vercel còn lại chỉ cần khi muốn mở phần mềm thật, không cần để phát video.

| Thiết bị | Cảnh |
|---|---|
| Bảng | 06-07, 08, 10a, 10b, 10c, 10d, 11, 12b, 13, 13A, 13B |
| Laptop (trang quản lý) | 12a, B3 |
| Máy tính bảng (cầm ngang) | 14a, 14b |
| Điện thoại (cầm dọc) | 13-phone, 15, 16, 17, 18, 26 |

Việc cần làm trước giờ quay:

- [ ] Thiết bị có mạng (video tải từ Vercel). Mở từng link và phát thử một lần để máy tải sẵn, lúc quay không khựng.
- [ ] Bảng, laptop: bấm `F` để toàn màn hình (ẩn thanh địa chỉ). Điện thoại, máy tính bảng: chạm góc dưới trái một lần. Dùng Chrome Android; iPhone không vào toàn màn hình được.
- [ ] Độ sáng màn hình theo kịch bản (bảng 60–65%, điện thoại khoảng 55%).
- [ ] Mỗi cảnh trước khi hô diễn: màn đang đứng ở khung đầu; bấm phát đúng lúc đạo diễn ra hiệu. Quay lại shot: bấm phát lần nữa sau khi cảnh hết, hoặc `R` để về khung đầu và chờ.
- [ ] Cảnh 26 và B3 dùng **số liệu mẫu** (giao diện thật, số liệu dựng sẵn cho đẹp): xem mục 3.

## 1. Điều khiển (không có nút nào trên màn hình)

| Thao tác | Bàn phím / bút trình chiếu | Cảm ứng |
|---|---|---|
| Phát cảnh (đang ở khung đầu) | `Space`, `Enter`, `PageDown` (nút ▶ của bút trình chiếu), `→` | Chạm góc **dưới trái** (vùng 110 px, vô hình) |
| Quay lại shot (khi cảnh đã hết) | bấm phím phát lần nữa: chạy lại từ đầu | chạm góc dưới trái lần nữa |
| Về khung đầu và chờ | `R` | — |
| Màn đen / bật lại | `B` hoặc `.` (nút màn đen của bút trình chiếu) | — |
| Toàn màn hình | `F` | lần chạm đầu ở góc dưới trái tự bật |
| Xem tên cảnh đang nạp (chỉ người điều khiển) | `H` bật/tắt | — |

Bấm đúp phím phát khi cảnh đang chạy không làm nhảy cảnh. Con trỏ chuột bị ẩn trên trang này.

## 2. Link từng cảnh

`<BANG>` = địa chỉ Vercel của bảng (VD `https://socratic-board.vercel.app`; khi chạy máy cục bộ là `http://localhost:3001`). **Mọi thiết bị đều mở link trên trang bảng**, kể cả điện thoại, máy tính bảng, laptop.

| Link | Thiết bị | Dài | Cảnh kịch bản | Nội dung |
|---|---|---|---|---|
| `<BANG>/demo?scene=06-07` | Bảng | 46 s | 06, 07 (UI-06/07) | Vẽ lập phương 6 nét → Chọn → khoanh → **Vẽ hình** → hình chuẩn có nhãn, nét đứt → Hiển thị → Xoay tự do → Khai triển → Cắt ngang (Lên/Xuống, diện tích, chu vi) |
| `<BANG>/demo?scene=08` | Bảng | 34 s | 08 (UI-08) | Viết "con lắc đơn" → khoanh → Trực quan → con lắc góc lớn → kéo θ₀ về 0,8 rad (≈ 45°), dao động + đồ thị pha |
| `<BANG>/demo?scene=10a` | Bảng | 27 s | 10 ô 1 (UI-10) | Viết tay x² + y² + z² = 9 → khoanh → Trực quan → mặt cầu cắt mặt phẳng trong Oxyz, kéo xoay |
| `<BANG>/demo?scene=10b` | Bảng | 25 s | 10 ô 2 | Viết tay 2NO₂ ⇌ N₂O₄ → khoanh → Trực quan → piston: Nén piston ×2, Đun nóng +40 °C |
| `<BANG>/demo?scene=10c` | Bảng | 89 s | 10 ô 3 | Viết tay đề "Cho hình chóp S.ABCD…" có a), b), c) → khoanh → Vẽ hình → hình dựng cạnh đề → bấm a), b), c) hiện từng phần M, N, P |
| `<BANG>/demo?scene=10d` | Bảng | 55 s | 10 ô 4 | Viết tay "mạch RLC cộng hưởng" → Trực quan → kéo tần số góc ω lên, giản đồ Fresnel và đường cộng hưởng đổi theo |
| `<BANG>/demo?scene=11` | Bảng | 24 s | 11 (UI-11) | Viết vội ∫₀¹ x² dx → khoanh → Chuyển LaTeX → Thay nét viết bằng công thức |
| `<BANG>/demo?scene=12a` | Laptop | 9 s | 12a (UI-12) | Trang quản lý: tiết mới → lớp 12A1 → bài soạn → Bắt đầu → mã ghép |
| `<BANG>/demo?scene=12b` | Bảng | 26 s | 12b (UI-12) | Ghép tiết, nhập mã → bảng nhận bài + "Thầy Kiệm" → Lớp học → QR phóng to → thu nhỏ: "4 học sinh đã vào" |
| `<BANG>/demo?scene=13` | Bảng | 57 s | 13 (UI-13) | Lớp học: 3 em vào → giao quyền → em kéo θ₀, bảng đổi theo → Thu bài vẽ tay → em nộp → "Bài 1" → Chiếu |
| `<BANG>/demo?scene=13-phone` | Điện thoại | 45 s | 13 (cận màn hình) | Điện thoại học sinh: nhập tên vào lớp → mô phỏng → kéo thanh trượt → vẽ 3 dòng → Nộp |
| `<BANG>/demo?scene=13A` | Bảng | 7 s | 13A (UI-13A) | Bài 1 vừa chiếu → Chấm bài → dòng 2 bôi đỏ "Sai ở bước", dòng 3 "Hệ quả", thẻ "Bước 2 sai · máy kiểm chứng" |
| `<BANG>/demo?scene=13B` | Bảng | 18 s | 13B (UI-13B) | Vi bài giảng → AI viết lời giảng (ý cần nhớ, câu hỏi ôn) → Gửi cho học sinh → "Đã gửi 2 phần" |
| `<BANG>/demo?scene=14a` | Máy tính bảng | 11 s | 14 (UI-14) | Mã học sinh → Vào lớp → Lớp của em → Tiết học: bài 7.5/10 |
| `<BANG>/demo?scene=14b` | Máy tính bảng | 8 s | 14 | Bài thầy gửi từ bảng → chạm sang Gia sư sau giờ học |
| `<BANG>/demo?scene=15` | Điện thoại | 10 s | 15 (UI-15) | Nhập bước sai → "Chưa hoàn toàn chuẩn xác…" + câu hỏi gợi mở |
| `<BANG>/demo?scene=16` | Điện thoại | 9 s | 16 (UI-16) | Gõ "cho đáp án" → Hàng rào Socratic → công cụ thị giác (cân đĩa) mở |
| `<BANG>/demo?scene=17` | Điện thoại | 10 s | 17 (UI-17) | Fe + O₂ → Fe₂O₃: bấm 4 Fe + 3 O₂ → 2 Fe₂O₃ → "SYMPY VERIFIED · Chuẩn xác 100%" |
| `<BANG>/demo?scene=18` | Điện thoại | 9 s | 18 (UI-18) | Chốt chặn bản chất → micro → chữ "Dạ, vì số Oxi hai bên phải bằng nhau." hiện dần |
| `<BANG>/demo?scene=19` | Bảng | 26 s | cảnh thêm (Hỏi đáp AI) | Viết "con lắc đơn" → Hỏi đáp AI → gõ "Vì sao dây càng dài thì chu kì càng lớn?" → AI đọc bảng, trả lời kèm công thức T = 2π√(l/g) → bấm "Mô phỏng con lắc đơn" mở mô phỏng ngay trên bảng |
| `<BANG>/demo?scene=26` | Điện thoại | 7 s | 26 | Trang phụ huynh: báo cáo tuần của Lan Anh (4 ngày, 95 phút, bài thầy giao 9/11, 3 gợi ý cho gia đình), vuốt xuống. **Số liệu mẫu** |
| `<BANG>/demo?scene=B3` | Laptop | 33 s | cắt chèn UI-B3 | Trang quản lý, tiết đang dạy: lưới 12 học sinh × 4 câu đầy dần, tỉ lệ đúng, đáp số sai hay gặp, "Cần hỗ trợ", Chiếu lên bảng, duyệt bài chờ. **Số liệu mẫu** |

Không có `?scene` (`<BANG>/demo`) thì chạy lần lượt mọi cảnh, chỉ dùng để xem lại.

**Điện thoại / máy tính bảng:** dùng Chrome Android, mở link, chạm góc dưới trái một lần để vào toàn màn hình (ẩn thanh địa chỉ). iPhone (Safari) không cho trang web vào toàn màn hình: dùng máy Android, hoặc thêm trang vào Màn hình chính rồi mở từ đó.

## 3. Những chỗ khác kịch bản (do phần mềm hiện tại)

- Cảnh 06: nút "Tương tác tại chỗ" không còn; thao tác thật là khoanh → **Vẽ hình** trên đĩa AI. Diễn tay theo video.
- Cảnh 08: mô phỏng ra là "con lắc góc lớn (RK4)", thanh "Góc lệch lớn θ₀" tính bằng rad, mặc định 1,2 rad (≈ 69°); video kéo **xuống** 0,8 rad (≈ 45°). Khi ghi đã sửa lỗi con lắc đứng yên (θ₀ bị đọc nhầm là độ).
- Cảnh 15: dùng bài **ném xiên (Vật lý)**, vì máy chấm chỉ bác được bước sai của bài này; bài Hóa có nhiều đại lượng nên máy chỉ báo "chưa phân tích được". Cảnh 16, 17, 18 vẫn là bài Hóa.
- Cảnh 18: video dừng khi lời nói hiện đủ. Với đúng câu thoại này, chốt chặn thật trả lời "đúng một phần, còn thiếu từ khóa" (cần nói có "bảo toàn khối lượng", "số nguyên tử").
- **Số liệu mẫu (theo yêu cầu, dùng tạm cho video):** cảnh 26 (báo cáo phụ huynh) và B3 (lưới bài làm) hiển thị trên giao diện thật nhưng số liệu do `tools/demo-video/sample_data.py` dựng sẵn, không phải số đo thật của lớp. Kịch bản (mục 1) quy định "mọi con số trên hình giữ đúng như kịch bản, không thêm số mới": duyệt lại các số này trước khi dựng. Phần mềm thật vẫn tính số liệu từ dữ liệu thật.
- Cảnh 10: cả 4 ô viết tay (chữ viết liền từng từ như người viết); đoạn chờ AI đọc chữ bị cắt khỏi video. Cảnh 06: lập phương vẽ một nét liền không nhấc bút.

## 4. Deploy 1 repo thành 3 link Vercel (phần giao diện của 3 đỉnh)

Repo: `github.com/dinhmanhcvp/EdTech`, nhánh `main`. Mỗi đỉnh là **một dự án Vercel riêng trỏ vào cùng repo**, khác nhau ở *Root Directory*. Máy chủ AI (FastAPI) vẫn ở Render như `socratic-monorepo/DEPLOY.md` (mục 2). **Chỉ để phát video quay thì không cần máy chủ AI**, nhưng bản build vẫn đòi biến `BACKEND_URL`.

### Tạo 3 dự án (làm 3 lần, mỗi lần một đỉnh)

Vercel → **Add New… → Project** → *Import* repo `EdTech` → trước khi bấm Deploy, sửa:

| Mục | Đỉnh 2: Bảng lớp | Đỉnh 3: App học sinh | Đỉnh 1: Trang quản lý |
|---|---|---|---|
| Project Name | `socratic-board` | `socratic-student` | `socratic-console` |
| Framework Preset | Next.js | Next.js | Next.js |
| Root Directory (bấm *Edit*) | `socratic-monorepo/apps/teacher-board` | `socratic-monorepo/apps/student-app` | `socratic-monorepo/apps/teacher-console` |
| Include source files outside of the Root Directory (Settings → General) | **Bật** | **Bật** | **Bật** |
| Build / Install Command | để mặc định (đã có trong `vercel.json` của từng app: cài ở gốc monorepo, `next build`) | như trái | như trái |
| Biến môi trường | `BACKEND_URL` = địa chỉ Render (VD `https://socratic-ai-engine.onrender.com`) | `BACKEND_URL` = như trái | `NEXT_PUBLIC_BACKEND_URL` = địa chỉ Render; `NEXT_PUBLIC_BOARD_URL` = link bảng (học sinh vào `/join/…` ở đó) |

Chưa có máy chủ Render mà chỉ cần phát video: đặt `BACKEND_URL=https://example.com` cho bảng và app học sinh để build qua; trang `/demo` không gọi máy chủ.

Không đặt khóa AI vào biến `NEXT_PUBLIC_*` (build sẽ dừng có chủ đích). Khóa Gemini chỉ đặt trên Render.

### Sau khi có đủ 3 link

1. Render → *Environment* → `CORS_ORIGINS` = `https://socratic-board.vercel.app,https://socratic-student.vercel.app,https://socratic-console.vercel.app` (đúng link thật, không có `/` cuối).
2. Mỗi lần `git push origin main`, cả 3 dự án tự build lại. Đổi biến môi trường thì phải *Deployments → ⋯ → Redeploy*.
3. Kiểm tra: mở `https://socratic-board.vercel.app/demo?scene=08` → đứng ở khung đầu, không có nút; bấm `Space` → chạy.

Bị lỗi khi build: xem mục 9 của `socratic-monorepo/DEPLOY.md` (thiếu `BACKEND_URL`, `Module not found: @socratic/types` = chưa bật "Include source files outside of the Root Directory").

## 5. Ghi lại một cảnh (khi phần mềm đổi)

Chạy 4 tiến trình trên DB demo riêng (không đụng DB thật): trong Claude Code dùng cấu hình `.claude/launch.json` (`ai-engine-demo`, `teacher-board`, `student-app`, `teacher-console`), hoặc tự chạy với `STUDENT_CONTEXT_DB` và `SOCRATIC_DB_PATH` trỏ vào `services/ai-engine/.data/demo/`. Sau đó:

```bash
cd socratic-monorepo/tools/demo-video && python record.py 08
```

- Video ra `apps/teacher-board/public/demo/<cảnh>.mp4` + `scenes.json`; commit và push là link Vercel có bản mới.
- Câu trả lời AI lưu ở `tools/demo-video/ai-cache/<cảnh>/` (không đưa lên git). Xóa thư mục đó để lấy câu trả lời AI mới.
- Cần `pip install playwright imageio-ffmpeg` và `python -m playwright install chromium`.
