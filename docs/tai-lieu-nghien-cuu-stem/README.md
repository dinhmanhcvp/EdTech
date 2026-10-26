# THƯ MỤC TÀI LIỆU KHẢO CỨU & THIẾT KẾ FEATURE TRỰC QUAN STEM
## Hệ thống Socratic Vision Board v2.0.0

Thư mục này chứa toàn bộ các nghiên cứu chuẩn mực về chương trình học và đặc tả kỹ thuật đầu ra trực quan cho 4 môn Toán - Lý - Hóa - Sinh, từ mức độ THPT Chuẩn (GDPT 2018) đến Hệ Chuyên và Học sinh giỏi Quốc gia (HSG QG: VMO, VPhO, VChO, VBO).

---

### Danh mục Tài liệu

1. **[NGHIEN_CUU_TOAN_DIEN_STEM_THPT_VA_CHUYEN_HSG_QUOC_GIA.md](./NGHIEN_CUU_TOAN_DIEN_STEM_THPT_VA_CHUYEN_HSG_QUOC_GIA.md)**:
   - **Phần 1**: Tổng quan triết lý *"AI as a Compiler, Client as a Render Engine"* (Chi phí API tạo video/ảnh = $0.00, render 60 FPS phía client).
   - **Phần 2**: Ma trận nhu cầu sư phạm giữa Giáo viên bục giảng Smartboard 75" (Zero-keyboard, Macro-sliders, Socratic Cues) và Học sinh tự học trên Mobile Companion (Intentional Cognitive Friction, Visual Debuggers).
   - **Phần 3**: Môn **Toán học** (Đại số & Giải tích, Hình học Oxyz, Hình học động Olympiad, Dãy số Cobweb, Đa thức Gauss-Lucas).
   - **Phần 4**: Môn **Vật lý** (Động học & Động lực học Newton, Dao động & Sóng, Cơ học phi tuyến Chaos, Lực Coriolis, Nhiễu xạ Fraunhofer đa khe).
   - **Phần 5**: Môn **Hóa học** (Mô hình VSEPR 3D, Cân bằng Le Chatelier, Chuẩn độ pH, Thuyết MO & Tách mức orbital d phức chất, Tinh thể học BCC/FCC, Cơ chế hữu cơ $S_N2$ & Vòng ghế Cyclohexane).
   - **Phần 6**: Môn **Sinh học** (Thẩm thấu màng & Khí khổng, Nhân đôi DNA 3D, Chu kỳ tim & ECG, Truyền tin GPCR & Apoptosis, Operon Lac & Epigenetics, Mô hình cạnh tranh Lotka-Volterra).
   - **Phần 7**: **Cơ chế nhận diện đầu vào trực quan chống nhầm lẫn & Thao tác bục giảng Zero-Keyboard** (Phễu 4 tầng, Ma trận phân giải ký hiệu nhập nhằng, **Đặc tả 5 phương thức viết/vẽ thực tế ngoài công thức thuần túy cho cả 4 môn Toán - Lý - Hóa - Sinh**, Magic Lasso tự nhiên, Menu bong bóng Tap & Swap).
   - **Phần 8**: Đặc tả chuẩn dữ liệu `SimulationBlueprintCore` JSON và 4 loại `VisualDebugger` widgets cho học sinh.
   - **Phần 9**: Lộ trình kỹ thuật 3 giai đoạn (Phase 1: THPT Cốt lõi $\to$ Phase 2: Không gian 3D & Chuyên $\to$ Phase 3: Olympiad & Toàn diện).

2. **[NGHIEN_CUU_TICH_HOP_BANG_THONG_MINH_HIEN_DAI.md](./NGHIEN_CUU_TICH_HOP_BANG_THONG_MINH_HIEN_DAI.md)**:
   - **Phần 1**: Toàn cảnh thị trường bảng thông minh (ViewSonic, Promethean, SMART Board, Samsung, BenQ, LG, MAXHUB, Hikvision...).
   - **Phần 2**: Bộ tính năng chuẩn mực của bảng thông minh hiện đại (Cảm ứng vật thể, cọ xóa lòng bàn tay, thước đo ảo, trình chiếu chia 4/9 màn hình, xuất QR Code).
   - **Phần 3**: Kiến trúc tích hợp toàn cầu (Universal Integration) - Độc lập phần cứng, chuẩn hóa W3C Pointer Events API (Touch/Pen/Palm), tương thích 100% Android & Windows OPS.
   - **Phần 4**: **Tính năng đột phá: Floating Transparent Screen Overlay** - Cho phép giáo viên khoanh Magic Lasso ngay trên slide PowerPoint, file PDF hay video đang giảng dạy để bung mô phỏng nổi tức thì mà không cần thoát PowerPoint.
   - **Phần 5**: Cơ chế kết nối không dây & BYOD (Học sinh quét mã QR tham gia phiên học, đồng bộ 2 chiều thời gian thực giữa bảng và điện thoại học sinh).
   - **Phần 6**: Ma trận tương thích phần cứng & hệ điều hành (100% các dòng bảng tại Việt Nam).
   - **Phần 7**: Lộ trình 3 bước triển khai thực tế tại các trường học.

3. **[THIET_KE_KIEN_TRUC_KY_THUAT_VA_MASTER_CATALOG.md](./THIET_KE_KIEN_TRUC_KY_THUAT_VA_MASTER_CATALOG.md)**:
   - **Phần 1**: **Master Template Catalog 40+ Mô phỏng STEM** - Bảng tra cứu toàn diện 40 Template ID (10 Toán, 10 Lý, 10 Hóa, 10 Sinh) cho THPT Chuẩn & Chuyên/HSG Quốc gia.
   - **Phần 2**: **Thuật toán nhận diện phác thảo hình học offline < 2ms** (Mã nguồn TypeScript $1 Unistroke Geometry Recognizer cho lò xo, chạc Y, hạt đậu, mạch điện, parabol).
   - **Phần 3**: **Prompt Engineering & JSON Schema cho Gemini Flash Vision** (System prompt chuẩn ràng buộc 40 template IDs, ngân sách trễ 1.1s).
   - **Phần 4**: **Mã nguồn mẫu Component Floating Screen Overlay** (React/TypeScript component tạo lớp phủ màn hình trong suốt đè lên PowerPoint/PDF và kích hoạt Magic Lasso).
   - **Phần 5**: **Giao thức đồng bộ hai chiều phòng học BYOD** (Socket.io/WebRTC protocol đồng bộ slider, giao quyền điều khiển và thăm dò Socratic).

4. **[NGHE_THUAT_RENDER_TRUC_QUAN_DANG_CAP_PRO.md](./NGHE_THUAT_RENDER_TRUC_QUAN_DANG_CAP_PRO.md)**:
   - **Phần 1**: Phân tích nguyên nhân "nét vẽ Python đơn thuần" và cách khắc phục triệt để.
   - **Phần 2**: Bộ 6 trụ cột thiết kế thị giác đẳng cấp (Retina 4K, PBR Depth, Glow huỳnh quang, Chuyển động lò xo, Glassmorphism, Bảng màu tạp chí khoa học).
   - **Phần 3**: Kỹ thuật render sắc nét 4K Retina chống vỡ hạt trên Smartboard 75"-86" (Hi-DPI Sub-pixel Canvas Buffer).
   - **Phần 4**: Kỹ xảo ánh sáng PBR (Physically Based Rendering) cho quả cầu 3D, bóng đổ tiếp xúc mặt đất và Shader quầng sáng huỳnh quang Neon Bloom.
   - **Phần 5**: Động lực học chuyển động hữu cơ (Bộ lọc lò xo giảm chấn bậc 2 SpringDamper, Vệt sáng sao băng huỳnh quang Phosphor Trail Fade).
   - **Phần 6**: Đặc tả chi tiết nâng cấp hình ảnh cho 4 Engine STEM (Đồ thị Gradient vũ trụ, Lò xo thép kim loại 3D, Bể sóng Caustic, Thủy tinh khúc xạ & Phân tử men gốm 3D, Quả tim co bóp sinh học, ADN Cyberpunk).
   - **Phần 7**: Mã nguồn module `StemProRenderer.ts` dùng ngay trong monorepo.

5. **[KIEN_TRUC_HOA_TRON_BANG_TRANSPARENT_HOLOGRAPHIC_HUD.md](./KIEN_TRUC_HOA_TRON_BANG_TRANSPARENT_HOLOGRAPHIC_HUD.md)**:
   - **Phần 1**: **Triết lý "Living Ink & Zero-Box"** - Xóa bỏ 100% nền hộp chữ nhật che khuất bảng; mô phỏng hòa trộn tự nhiên trực tiếp vào mặt bảng đen/xanh phấn hoặc bảng trắng bút dạ.
   - **Phần 2**: **Tương tác trực tiếp bằng bút (Direct Kinetic Manipulation)** - Cầm bút chạm trực tiếp vào vật thể: kéo quả bóng ném xiên như bắn ná, kéo nén lò xo, xoay lộn phân tử 3D, kéo tách chạc ADN như mở khóa áo mà không cần dùng thanh trượt gián tiếp.
   - **Phần 3**: **Giải thuật phóng to / thu nhỏ / xoay tự do đa điểm** - Ma trận Affine Transform kết hợp cử chỉ 2 ngón tay Pinch-to-Zoom; độ sắc nét vô cực (Infinite Vector Sharpness) từ 20% đến 400%; khung neo định vị Hologram HUD Sci-Fi `[  ]`.
   - **Phần 4**: **Hiệu ứng biến hình "Nét phấn sống dậy" (Ink Morphing Animation)** - Chuyển hóa nét phấn vẽ tay thành mô phỏng chuyển động trong 350ms.
   - **Phần 5**: Hệ thống màu sắc Cyber-Academic (Cyber Cyan, Solar Amber, Bio Emerald, Laser Crimson).
   - **Phần 6**: Mã nguồn module `LivingHologramCanvas.tsx` hoàn chỉnh dùng ngay trong monorepo.

6. **[NGHIEN_CUU_HOAN_THIEN_TOAN_DIEN_HE_THONG_STEM_HOLOGRAPHIC.md](./NGHIEN_CUU_HOAN_THIEN_TOAN_DIEN_HE_THONG_STEM_HOLOGRAPHIC.md)**:
   - **Phần 1**: Tổng quan giải quyết triệt để 5 "căn bệnh cố hữu" của phần mềm mô phỏng (hộp che chữ, nô lệ thanh trượt, đồ thị thô ráp, tê liệt ngoại tuyến, đơn con trỏ).
   - **Phần 2**: Kiến trúc tương tác bút & đa điểm đa người dùng đồng thời (Multi-User Multi-Pen Kinematics), ảo hóa phiên Pointer ID, tương tác hai tay (Bimanual).
   - **Phần 3**: Công nghệ hòa trộn trực quan không nền (Sub-pixel Alpha Compositing, Blend modes `screen`/`multiply`, Khung định vị HUD biến mất sau 1.5s).
   - **Phần 4**: Giải thuật phóng to/thu nhỏ Affine bất biến trọng tâm (Focal-invariant Pinch Zoom) và Đa cấp chi tiết động học (LOD).
   - **Phần 5**: Hệ thống âm thanh phản hồi xúc giác thủ tục Web Audio API (Zero-asset, trễ < 2ms, Haptic Snap, RLC Hum, Pink Noise Bubbles).
   - **Phần 6**: Tối ưu hóa phần cứng ngoại tuyến trường học (Android/Windows OPS, Dynamic Resolution Scaling, Dirty Region Redraw, 100% Offline-First).
   - **Phần 7**: Giao thức ghi & tua lại bài giảng vector siêu nhẹ (Vector Event Journaling < 2.5MB / tiết học 45 phút, Live Interactive Replay).
   - **Phần 8**: Tầng gợi mở Socratic tự thích ứng theo thời gian thực (Real-time Adaptive Socratic Prompting).
   - **Phần 9**: Đặc tả kỹ thuật & phương trình 6 template STEM chuyên sâu cuối cùng (Hoàn tất 40/40 Master Catalog: Oxyz 3D, Tích phân tròn xoay, Khung xương hữu cơ, Cơ chế $S_N2$, Bơm Proton & ATP Synthase ti thể, Động thái quần thể Lotka-Volterra).
   - **Phần 10**: Mã nguồn module TypeScript `HolographicStemCore.ts` hoàn chỉnh.

7. **[NGHIEN_CUU_AI_TUTOR_GIA_SU_SAU_GIO_HOC.md](./NGHIEN_CUU_AI_TUTOR_GIA_SU_SAU_GIO_HOC.md)**:
   - **Phần 1**: Bối cảnh thực tiễn & Điểm gãy nhận thức trong tự học sau giờ học (Bẫy giải hộ đáp án của ChatGPT/Photomath, Bức tường 9 giờ tối, Đứt gãy thông tin giữa lớp học và ở nhà).
   - **Phần 2**: Khung lý thuyết sư phạm & Nguyên tắc Ma sát nhận thức có chủ đích (Intentional Cognitive Friction, Hàng rào Socratic Guardrails chống sụp đổ giàn giáo, Ma trận gợi mở 4 cấp độ).
   - **Phần 3**: Mô hình toán học Truy vết Tri thức (Bayesian Knowledge Tracing - BKT ước lượng xác suất thành thạo từng kỹ năng con, Deep Knowledge Tracing - DKT nắm bắt liên môn Toán - Lý - Hóa).
   - **Phần 4**: Cầu nối Bục giảng - Về nhà qua Vector Journaling Replay (Học sinh can thiệp trực tiếp vào mô phỏng động lực học mà giáo viên đã vẽ trên lớp).
   - **Phần 5**: Đặc tả 4 Chế độ tương tác của AI Tutor (Socratic Homework Solver, Home Sandbox, Spaced Repetition Drill, ParentPulse & Teacher Dashboard).
   - **Phần 6**: Kiến trúc Kỹ thuật Web & Tối ưu hóa Offline-First với IndexedDB.
   - **Phần 7**: Bộ chỉ số thực nghiệm đo lường hiệu quả (Productive Struggle Time, Scaffolding Efficiency Ratio, Knowledge Retention Rate).
   - **Phần 8**: 4 Câu hỏi nghiên cứu mở rộng dành cho học sinh.

---

### Hướng dẫn Ánh xạ Mã nguồn vào Hệ thống

- **Hợp đồng dữ liệu**: [`packages/types/src/index.ts`](../../socratic-monorepo/packages/types/src/index.ts)
- **AI Compiler (FastAPI)**: [`services/ai-engine/routers/visualize.py`](../../socratic-monorepo/services/ai-engine/routers/visualize.py)
- **Bộ máy kết xuất Toán**: [`apps/teacher-board/src/engines/MathPlotEngine.tsx`](../../socratic-monorepo/apps/teacher-board/src/engines/MathPlotEngine.tsx)
- **Bộ máy kết xuất Vật lý**: [`apps/teacher-board/src/engines/PhysicsSandboxEngine.tsx`](../../socratic-monorepo/apps/teacher-board/src/engines/PhysicsSandboxEngine.tsx)
- **Bộ máy kết xuất Hóa học**: [`apps/teacher-board/src/engines/ChemistryLabEngine.tsx`](../../socratic-monorepo/apps/teacher-board/src/engines/ChemistryLabEngine.tsx)
- **Bộ máy kết xuất Sinh học**: [`apps/teacher-board/src/engines/BioSystemEngine.tsx`](../../socratic-monorepo/apps/teacher-board/src/engines/BioSystemEngine.tsx)
- **Bộ module Hologram lõi**: [`apps/teacher-board/src/components/canvas/LivingHologramCanvas.tsx`](../../socratic-monorepo/apps/teacher-board/src/components/canvas/LivingHologramCanvas.tsx)
- **Widget Sửa lỗi Học sinh**: [`apps/student-app/src/components/companion/`](../../socratic-monorepo/apps/student-app/src/components/companion/)
