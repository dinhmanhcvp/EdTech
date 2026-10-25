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

---

### Hướng dẫn Ánh xạ Mã nguồn vào Hệ thống

- **Hợp đồng dữ liệu**: [`packages/types/src/index.ts`](../../socratic-monorepo/packages/types/src/index.ts)
- **AI Compiler (FastAPI)**: [`services/ai-engine/routers/visualize.py`](../../socratic-monorepo/services/ai-engine/routers/visualize.py)
- **Bộ máy kết xuất Toán**: [`apps/teacher-board/src/engines/MathPlotEngine.tsx`](../../socratic-monorepo/apps/teacher-board/src/engines/MathPlotEngine.tsx)
- **Bộ máy kết xuất Vật lý**: [`apps/teacher-board/src/engines/PhysicsSandboxEngine.tsx`](../../socratic-monorepo/apps/teacher-board/src/engines/PhysicsSandboxEngine.tsx)
- **Bộ máy kết xuất Hóa học**: [`apps/teacher-board/src/engines/ChemistryLabEngine.tsx`](../../socratic-monorepo/apps/teacher-board/src/engines/ChemistryLabEngine.tsx)
- **Bộ máy kết xuất Sinh học**: [`apps/teacher-board/src/engines/BioSystemEngine.tsx`](../../socratic-monorepo/apps/teacher-board/src/engines/BioSystemEngine.tsx)
- **Widget Sửa lỗi Học sinh**: [`apps/student-app/src/components/companion/`](../../socratic-monorepo/apps/student-app/src/components/companion/)
