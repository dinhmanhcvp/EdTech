# TRẠNG THÁI TÍCH HỢP TÀI LIỆU NGHIÊN CỨU VÀO MÃ NGUỒN

Cập nhật sau đợt tích hợp thứ hai. Đường dẫn tính từ `socratic-monorepo/`; "web" = `apps/teacher-board/src`.
Cột **Kiểm chứng** ghi đúng điều đã chạy được, không ghi điều chưa thử.

## 1. Đã tích hợp

| Mục trong tài liệu | Đã làm | Mã | Kiểm chứng |
|---|---|---|---|
| Thiết kế §1 – `BIO_PUNNETT_SQUARE`, nghiên cứu 7.5 (cú pháp di truyền `P: AaBb × AaBb`) | Bảng Punnett 16 ô, kiểu gen/kiểu hình, tỉ lệ (9:3:3:1…), chạm để gộp ô đồng kiểu hình, thanh trượt **hoán vị gen f** | web `utils/stemModels.ts`, `engines/StemModelEngines.tsx` | test đơn vị (kể cả f = 0,2 → 40:40:10:10); chạy thật trên trình duyệt |
| `BIO_HARDY_WEINBERG`, 7.5 (viết `0,04AA + 0,32Aa + 0,64aa = 1`) | Đọc tần số kiểu gen (dấu phẩy, %, số đếm, hoặc chỉ q²), tính p, q, so với p², 2pq, q², báo cân bằng/không | như trên | test đơn vị; trình duyệt |
| `MATH_LINEAR_PROGRAMMING`, 7.6 (miền nghiệm) | Hệ bất phương trình bậc nhất 2 ẩn + hàm mục tiêu → đa giác miền nghiệm, đỉnh, tối ưu, đường mức kéo được; xử lý vô nghiệm / miền không bị chặn | như trên | test đơn vị; trình duyệt (max 3x+2y → (2;2), F=10) |
| `MATH_COBWEB_CHAOS` | Dãy `x_{n+1} = f(x_n)` → đồ thị mạng nhện, điểm bất động ổn định/không, hội tụ / chu kỳ / hỗn loạn, thanh trượt tham số và x₀ | như trên | test (logistic r = 2,8; 3,2; 3,9; Newton √2); trình duyệt |
| Nghiên cứu 7.2 Tầng 2 (vân tay đơn vị) & 7.3 (ma trận nhập nhằng T, k) | `detectSubject` (đơn vị + từ khóa → môn + lý do), `disambiguateSymbol('T'/'k')`; hộp thoại Chữ → Công thức hiện "Nhận ra môn … vì …" | web `utils/subjectContext.ts` | 15 test |
| 7.4 – Bộ chọn phân môn nhanh | Dải **Tự động / Toán / Lí / Hóa / Sinh** (đúng 4 màu của tài liệu) trong thanh Lasso; gửi `subject_lock` lên backend | web `SmartboardCanvas.tsx` | trình duyệt (hiển thị); phía Gemini chưa gọi thật |
| Thiết kế §3 – Prompt Gemini | Prompt tách thành `build_vision_prompt()`; thêm quy tắc phân giải nhập nhằng + môn đã khóa. **Chỉ liệt kê template có trong Registry** (xem mục 3) | `services/ai-engine/routers/visualize.py` | 2 test pytest (kể cả "mọi ID trong prompt ∈ Registry") |
| Thiết kế §2 – nhận phác thảo hình học offline | Viết lại thành `sketchGestures.ts` (lò xo, sóng sin, parabol, elip, khung mạch điện, chạc Y, hai hạt đậu "( )"), điểm tin cậy + phương án thay thế **Tap & Swap** (chip "Hình giống: …"); nối vào "Trực quan hóa" | web `utils/sketchGestures.ts`, `sketchActions.ts` | 8 test (có ca KHÔNG được nhận nhầm: chữ viết tay, đường thẳng…); trình duyệt với sóng, parabol, elip |
| 7.6 mục 2 – hình học không gian nét liền/nét đứt | Nhận lập phương/hộp/chóp/lăng trụ từ nét vẽ → dựng khối 3D khai triển được (đợt trước) | web `utils/sketchSolid.ts`, `engines/GeometryEngine.tsx` | test + trình duyệt |
| Thiết kế §5 – **Đồng bộ lớp học BYOD** | Giáo viên tạo phòng (mã 6 ký tự + QR + mã quản trị), học sinh vào `/join/<mã>`; đồng bộ mô phỏng và thanh trượt giáo viên → học sinh; **giao/thu hồi quyền điều khiển** cho một học sinh; **bình chọn dự đoán** có kết quả sống ở bảng và công bố cho cả lớp; tự nối lại khi đứt mạng; giới hạn 120 học sinh/phòng | `services/ai-engine/routers/classroom_ws.py` (WebSocket FastAPI, thay Socket.io), web `hooks/useClassroom.ts`, `utils/classroomState.ts`, `components/canvas/ClassroomPanel.tsx`, `app/join/[roomId]/page.tsx` | 14 test backend (lõi + WebSocket thật); 8 test reducer; chạy thật với **hai trình duyệt** (tạo phòng, vào, kéo slider hai chiều, giao quyền, bình chọn, kết thúc) |
| 7.4 – Giao diện bục giảng tối giản | Một **thanh tác vụ** kiểu bảng thông minh (Chọn, Bút, Dạ quang, Hình, Tẩy, Hoàn tác/Làm lại, Nền, Xóa, Lớp học, Thêm) + **một nút AI nổi** bung ra Giọng nói / Khoanh vùng AI / Trực quan hóa / Chữ → Công thức; bỏ thanh công cụ dày và thanh Director | web `components/canvas/SmartboardDock.tsx`, `app/page.tsx` | 9 test; chụp màn hình và chạy lại toàn bộ kịch bản trình duyệt |
| Smartboard §3.1 – Pointer Events, từ chối lòng bàn tay | Pointer capture, sự kiện trung gian, áp lực bút, chống chạm lòng bàn tay (dựa trên `pointerType` + thời gian sau bút), tẩy từng đoạn, đầu tẩy của bút (nút 32), kéo vùng chọn (đợt trước) | `SmartboardCanvas.tsx` | trình duyệt (chuột/`PointerEvent` giả lập; **chưa thử bút/bảng thật**) |
| Zero-keyboard 7.4 | Chữ viết tay → công thức chuẩn (đợt trước) | `InkConvertPanel.tsx` | xem báo cáo trước |

## 2. Làm một phần

| Mục | Hiện có | Còn thiếu |
|---|---|---|
| Master Catalog 40 template | Backend Registry 16 + client: `MATH_GRAPH`, `GEO_SOLID`, 4 mô hình ở mục 1 → **22** mô phỏng chạy được | 18 template còn lại (xem mục 3) |
| Tap & Swap (7.4) | Chip phương án khi nhận phác thảo; nút Swap sẵn có của widget | Top-3 kèm % cho mọi kết quả AI (cần backend trả điểm các ứng viên) |
| Tầng 1 – ngữ cảnh tiết học | Khóa môn thủ công | Đọc thời khóa biểu / giáo án điện tử |
| 7.7 mạch điện | Nhận khung chữ nhật kín → mạch RLC | Nhận linh kiện (điện trở, tụ, cuộn cảm, nguồn) và nối tiếp/song song |

## 3. Chưa làm — và lý do

| Mục | Lý do / ghi chú |
|---|---|
| **Floating Screen Overlay trên PowerPoint/PDF** (nghiên cứu mục 4, thiết kế §4) | Trang web **không thể** vẽ đè lên cửa sổ ứng dụng khác. Mã mẫu trong tài liệu chỉ phủ canvas lên chính trang web. Muốn thật sự đè lên PowerPoint cần ứng dụng cửa sổ trong suốt (Electron/Tauri) hoặc chia sẻ màn hình + lớp phủ; nên là một dự án riêng. |
| *(đã làm)* BYOD đồng bộ hai chiều | Xem mục 1. Chưa có: đăng nhập học sinh, lưu lịch sử phòng (bộ nhớ tiến trình), Redis khi chạy nhiều máy chủ, đồng bộ trạng thái bên trong các engine tự điều khiển (đồ thị, 3D, di truyền: học sinh xem cùng mô phỏng nhưng tự thao tác). |
| 18 template còn thiếu | Toán: BBT, Oxyz, tích phân tròn xoay, hình học động, boxplot. Lý: lò xo RK4 riêng, khí p-V, con lắc kép, Coriolis, Fraunhofer. Hóa: VSEPR 3D, Le Chatelier, khung xương hữu cơ, SN2, Daniell, tinh thể, CFT. Sinh: khí khổng, hô hấp tế bào, Operon Lac, thẩm thấu, truyền tin, Lotka–Volterra. Mỗi cái là một engine riêng. |
| Prompt Gemini với **40 template ID** của tài liệu | Backend chỉ chấp nhận ID có trong `OFFLINE_TEMPLATE_REGISTRY`; nếu bắt mô hình trả ID chưa có engine, kết quả bị loại. Thêm ID vào prompt chỉ khi engine tương ứng có thật. |
| Bảng biến thiên → đồ thị; miền nghiệm gạch sọc vẽ tay; sơ đồ phả hệ; ô lượng tử orbital | Cần nhận dạng bảng/hình có cấu trúc; chưa có bộ nhận dạng. |
| 4 Visual Debugger Widgets (học sinh) | Ở `apps/student-app`, chưa động tới. |
| Cử chỉ hai ngón vuốt để toàn màn hình | Chưa. |

## 4. Lưu ý về mã mẫu trong tài liệu (đã không dùng nguyên văn)

- `UnistrokeSTEMClassifier.matchesDoubleBean` luôn trả `true` khi nét ≥ 32 điểm và `matchesYFork` chỉ đếm điểm phía trên điểm đầu → sẽ nhận nhầm hầu hết nét vẽ. Đã thay bằng các phép đo hình học riêng trong `sketchGestures.ts`, có test chống nhận nhầm.
- `FloatingScreenOverlay.tsx` vẽ bằng `setState` mỗi điểm và dùng `e.width > 35` để đoán lòng bàn tay (không đáng tin trên nhiều bảng hồng ngoại); phần pointer của app đã làm theo cách khác (xem mục 1).
