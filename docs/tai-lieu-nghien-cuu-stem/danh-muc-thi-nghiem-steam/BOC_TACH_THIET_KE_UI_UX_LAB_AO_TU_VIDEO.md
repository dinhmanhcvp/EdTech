# TÀI LIỆU BÓC TÁCH CHUYÊN SÂU THIẾT KẾ UI/UX, THẨM MỸ THỊ GIÁC & CƠ CHẾ TƯƠNG TÁC TỪ 2 VIDEO PHÒNG THÍ NGHIỆM ẢO CAO CẤP

> **Bản quyền nghiên cứu & thiết kế kỹ thuật EdTech**: Dành cho Dự án Socratic Vision Board & Hệ thống Phòng thí nghiệm STEM Ảo tương tác.  
> **Nguồn video bóc tách**:  
> 1. `1794458425502_205699435259876645_7980584562468037439.mp4` (*Kênh Chem with Julia - Web/Desktop 3D Virtual Chemistry Lab*).  
> 2. `1794458425514_205699435259876645_7980584562468037439.mp4` (*Kênh tigger9071 - NOBOOK Chemistry Virtual Lab trên Màn hình Tương tác ClassIn*).

---

## MỤC LỤC
1. [TỔNG QUAN NGUỒN GỐC & BỐI CẢNH THỬ NGHIỆM THỰC TẾ](#1-tổng-quan-nguồn-gốc--bối-cảnh-thử-nghiệm-thực-tế)
2. [DESIGN SYSTEM & VISUAL TOKENS (BẢNG MÀU, ÁNH SÁNG & TYPOGRAPHY)](#2-design-system--visual-tokens-bảng-màu-ánh-sáng--typography)
3. [BÓC TÁCH KIẾN TRÚC UI & COMPONENT ANATOMY](#3-bóc-tách-kiến-trúc-ui--component-anatomy)
4. [CƠ CHẾ CHUYỂN ĐỘNG & HOẠT HỌA VẬT LÝ (MOTION & PARTICLE DYNAMICS)](#4-cơ-chế-chuyển-động--hoạt-họa-vật-lý-motion--particle-dynamics)
5. [CÔNG THÁI HỌC CẢM ỨNG LỚP HỌC (TOUCH & BOARD ERGONOMICS)](#5-công-thái-học-cảm-ứng-lớp-học-touch--board-ergonomics)
6. [BẢN ĐỒ ÁNH XẠ KỸ THUẬT VÀO HỆ THỐNG EDTECH / SOCRATIC VISION BOARD](#6-bản-đồ-ánh-xạ-kỹ-thuật-vào-hệ-thống-edtech--socratic-vision-board)

---

## 1. TỔNG QUAN NGUỒN GỐC & BỐI CẢNH THỬ NGHIỆM THỰC TẾ

### 1.1 Video 1: Web/Desktop 3D Virtual Lab (Kênh Chem with Julia)
- **Tên file video**: `1794458425502_205699435259876645_7980584562468037439.mp4`
- **Độ phân giải & Thời lượng**: 876 x 576 px, tỷ lệ xấp xỉ 16:10, thời lượng 53.7 giây, 54 khung hình bóc tách chi tiết.
- **Thí nghiệm thực hiện**: Nhiệt phân muối Đồng(II) Nitrat Trihydrate:
  $$\text{Cu(NO}_3)_2 \cdot 3\text{H}_2\text{O} \xrightarrow{t^\circ} \text{CuO} + 2\text{NO}_2\uparrow + \frac{1}{2}\text{O}_2\uparrow + 3\text{H}_2\text{O}\uparrow$$
  *(Phương trình hiển thị trực tiếp trên HUD: $2\text{Cu(NO}_3)_2 = 2\text{CuO} + 4\text{NO}_2 + \text{O}_2$)*
- **Bối cảnh trải nghiệm**: Phần mềm chạy trên nền WebGL/WebGPU trên trình duyệt máy tính cá nhân (1:1 screen ratio). Giao diện mang đậm phong cách **Cinematic Dark Mode** cao cấp, hướng tới trải nghiệm mô phỏng độ chính xác cao (high-precision chemical simulation) với đồ họa thủy tinh chân thực, thông số vi sai mol/khối lượng/nhiệt độ thời gian thực.

### 1.2 Video 2: NOBOOK Chemistry Virtual Lab (NB化学实验) trên Màn hình Cảm ứng ClassIn
- **Tên file video**: `1794458425514_205699435259876645_7980584562468037439.mp4`
- **Độ phân giải & Thời lượng**: 576 x 1024 px (quay dọc lớp học), thời lượng 39.3 giây, 39 khung hình bóc tách chi tiết.
- **URL nhận diện trên thanh địa chỉ**: `https://chemistry-en.nobook.com/chemical/4d815e813149becf40b666cc0519aa89?moduleId=9...`
- **Thí nghiệm thực hiện**: Khử sắt(III) oxit bằng khí carbon monoxide ở nhiệt độ cao trong hệ kín:
  $$\text{Fe}_2\text{O}_3 + 3\text{CO} \xrightarrow{t^\circ} 2\text{Fe} + 3\text{CO}_2\uparrow$$
  Kèm theo hệ thống hấp thụ khí $\text{CO}_2$ vào bình chứa nước vôi trong $\text{Ca(OH)}_2$ và đốt cháy khí $\text{CO}$ dư ở đầu ống dẫn khí.
- **Bối cảnh trải nghiệm**: Lớp học thực tế sử dụng Màn hình Tương tác Cỡ lớn (Interactive Flat Panel 75-86 inch) thương hiệu ClassIn. Giao diện được tối ưu hóa cho **công thái học ngón tay (Finger-friendly Touch Ergonomics)**, các nút bấm cỡ lớn, thanh slider điều chỉnh khối lượng thìa hóa chất, cơ chế hít nam châm ống dẫn khí (magnetic snap-to-dock) và cửa sổ phóng đại vi mô hạt phân tử 3D (Microscopic View).

---

## 2. DESIGN SYSTEM & VISUAL TOKENS (BẢNG MÀU, ÁNH SÁNG & TYPOGRAPHY)

### 2.1 Bảng màu chính xác (Hex Color Codes) & Triết lý Thị giác

| Hạng mục Token | Video 1 (Dark Plum / Aubergine) | Video 2 (Slate Cyan / NOBOOK) | Ý nghĩa Thiết kế & Hiệu quả Giáo dục |
| :--- | :--- | :--- | :--- |
| **Nền Canvas chính** | Gradient: `#251d32` $\to$ `#35233b` $\to$ `#422841` | Phẳng tối: `#1a2436` $\to$ `#243048` | Loại bỏ 100% ánh sáng trắng gây mỏi mắt học sinh; làm nổi bật ngọn lửa, tia phản ứng và màu dung dịch |
| **Bề mặt Kính Thủy tinh** | Border: `#ffffff26` (15%), Fill: `#ffffff0d` (5%) | Stroke: `#ffffff40`, Refraction Blue tint | Tạo cảm giác thủy tinh Borosilicate trong suốt, khúc xạ viền mép |
| **Màu Tương tác Chính (Primary Accent)** | Indigo Neon: `#6366f1` / Violet: `#8b5cf6` | Cyan Electric: `#00e5ff` / Deep Blue: `#2979ff` | Thu hút sự chú ý vào công cụ đang chọn và điểm snap-to-dock |
| **Màu Cảnh báo & Trạng thái Nóng** | Flame Orange: `#f59e0b` / Red: `#ff4d4f` | Amber: `#ff9800` / Alert Red: `#f44336` | Biểu thị nhiệt độ cao, nguy hiểm cháy nổ, ngọn lửa đèn cồn |
| **Màu Cảm biến / Trạng thái Lạnh** | Ice Cyan: `#22d3ee` / Green: `#10b981` | Neon Green: `#00e676` | Biểu thị trạng thái an toàn, dung dịch trung tính, nút vi mô |
| **Typography Tiêu đề & Công thức** | Pure White `#ffffff` (Font Serif / KaTeX) | White `#f8fafc` (Clean Sans-serif) | Tối đa hóa tỷ lệ tương phản (Contrast Ratio > 12:1) chuẩn WCAG AAA |
| **Typography Dữ liệu Thời gian thực** | Yellow Gold `#fbbf24` / Monospace White | Monospace Cyan `#00e5ff` | Dễ đọc nhanh các số đo biến thiên liên tục (mol, g, °C) |

### 2.2 Kỹ thuật Render Thủy tinh Chân thực (Realistic Glass PBR)
Trong cả 2 video, điểm mấu chốt tạo nên vẻ "đắt tiền" và mượt mà chính là **vật liệu thủy tinh của ống nghiệm và bình cầu**:
1. **Index of Refraction (IOR)**: Đặt ở mức $1.45$ đến $1.47$ (chỉ số khúc xạ của thủy tinh Borosilicate Pyrex tiêu chuẩn phòng thí nghiệm).
2. **Fresnel Effect**: Hiệu ứng phản xạ ánh sáng mạnh dần khi góc nhìn tiến dần về tiếp tuyến mép ống nghiệm. Mép viền phát sáng nhẹ (`#ffffff40`), trong khi thân ống hoàn toàn trong suốt cho phép quan sát rõ hóa chất bên trong.
3. **Screen-space Refraction / Transmission**: Thay vì ray-tracing nặng nề, Three.js sử dụng `MeshPhysicalMaterial` với thuộc tính `transmission = 0.95`, `roughness = 0.05`, `thickness = 1.2`, tạo độ méo nền nhẹ nhàng phía sau ống nghiệm mà vẫn giữ vững tốc độ khung hình 60 FPS.

### 2.3 Hệ thống Typography & Hiển thị Công thức Toán/Hóa
- **Live Equation HUD**: Đặt tại trung tâm phía trên màn hình. Sử dụng định dạng LaTeX chuẩn quốc tế với kích thước $20 - 24\text{px}$.
- **Hạn chế Rung giật Layout (Zero Layout Shift)**: Mọi nhãn số liệu nhiệt độ ($283.212 ^\circ\text{C}$), khối lượng ($7.7\text{ g} \to 3.5\text{ g}$) đều sử dụng font **Monospaced (độ rộng ký tự cố định)**. Khi số thập phân nhảy liên tục hàng chục lần mỗi giây, chiều rộng của khung nhãn không bị co giãn giật cục.

---

## 3. BÓC TÁCH KIẾN TRÚC UI & COMPONENT ANATOMY

### 3.1 Kệ Hóa Chất Nổi Đỉnh Màn Hình (Floating Reagent Shelf)
- **Vị trí & Cấu trúc**: Thanh trượt ngang nằm ở mép trên màn hình, nền kính mờ (glassmorphism backdrop blur 16px).
- **Phân loại dạng Pill Tabs**:
  - `Organic` (Hóa hữu cơ)
  - `Solid` (Chất rắn)
  - `Liquid` (Chất lỏng)
  - `Gas` (Chất khí)
  - `★ Favorites` (Hóa chất yêu thích)
  - Ô tìm kiếm nhanh với icon kính lúp.
- **Thẻ Lọ Hóa Chất (Reagent Card)**:
  - Hiển thị hình ảnh 2.5D/3D của lọ thủy tinh có nắp vặn màu đen.
  - Bên trong lọ chứa mô hình chất rắn/lỏng với màu sắc thực tế: $\text{Cu(NO}_3)_2$ có màu xanh dương thẫm lấp lánh, $\text{Fe}_2\text{O}_3$ màu nâu đỏ, $\text{KMnO}_4$ tím đen.
  - Phía dưới là tên gọi và công thức hóa học rõ nét.

### 3.2 Card Kiểm Tra Lý Tính Hóa Chất (Chemical Inspector Popover)
Khi học sinh rê chuột (Hover) hoặc chạm nhẹ vào lọ hóa chất trên kệ, một popover bo tròn hiện đại bật ra ngay bên dưới lọ:
- **Tên hóa chất**: In đậm, kèm khối lượng mol ($M = 187.56\text{ g/mol}$).
- **Thông số lý tính**:
  - Khối lượng riêng (Density): $2.32\text{ g/cm}^3$
  - Độ tan trong nước (Solubility): $137.8\text{ g/100mL}$
  - Nhiệt độ nóng chảy (Melting point): $256^\circ\text{C}$
  - Nhiệt độ phân hủy (Decomposition point): $170^\circ\text{C}$
- **Nút tương tác nhanh**:
  - `Reactions: 15`: Khi bấm vào, mở ra danh sách 15 phản ứng tiêu biểu mà hóa chất này có thể tham gia.
  - Nút ngôi sao `Favorites` để lưu nhanh vào danh mục thường dùng.

### 3.3 Thìa Lấy Hóa Chất Kèm Slider Vi Lượng (Spatula & Weight Slider Popover)
Trong Video 2 (NOBOOK), một giải pháp UX cực kỳ thông minh giải quyết triệt để vấn đề "học sinh không biết lấy bao nhiêu gam hóa chất":
- Khi kéo thìa hóa chất (Spatula) lại gần miệng ống nghiệm, một cửa sổ popover nhỏ nổi lên ngay trên đầu thìa.
- Có thanh trượt ngang **Slider**: `Chemicals weight: 3g` (thang đo từ 0.5g đến 20g, bước nhảy 0.5g).
- Nút xác nhận `Pour` hoặc thao tác nhả tay sẽ tự động xúc đúng 3g bột $\text{Fe}_2\text{O}_3$ cho vào đáy ống nghiệm.

### 3.4 Thanh Công Cụ Đo Lường & Cảm Biến Cắm Thả Nổi (Toolbox & Floating Sensor Probes)
- Nằm gọn gàng bên lề trái màn hình, gồm các biểu tượng công cụ đo:
  - 🌡️ **Thermometer (Nhiệt kế điện tử / thủy ngân)**
  - 🧪 **pH Meter (Bút đo pH)**
  - 🥢 **Glass Stirring Rod (Đũa khuấy thủy tinh)**
  - ⚡ **Platinum Wire (Dây bạch kim thử màu ngọn lửa)**
  - 💧 **Dropper Pipette (Ống nhỏ giọt)**
- **Trải nghiệm cắm cảm biến**: Kéo nhiệt kế thả vào ống nghiệm. Nhiệt kế tự động nghiêng theo góc ống nghiệm và cắm sâu vào khối hóa chất. Trên đầu nhiệt kế nổi lên một nhãn hình viên thuốc (pill tag):
  $$\mathbf{283.212 \ ^\circ\text{C}}$$
  với giá trị nhảy số liên tục theo công thức động học nhiệt.

### 3.5 Bảng Theo Dõi Khối Lượng Phản Ứng Động (Real-time Stoichiometry Reaction HUD)
- Đặt ở đỉnh trung tâm màn hình, ngay phía trên hệ thống ống nghiệm.
- Khi phản ứng bắt đầu xảy ra:
  - Xuất hiện phương trình phản ứng cân bằng tự động:
    $$2\text{Cu(NO}_3)_2 = 2\text{CuO} + 4\text{NO}_2 + \text{O}_2$$
  - Phía trên ống nghiệm nung nóng: Hiện nhãn khối lượng động:
    $$\text{H}_2\text{O}: 7.7\text{ g} \to 0.0\text{ g} \quad | \quad \text{Cu(NO}_3)_2: 7.0\text{ g} \to 3.5\text{ g} \quad | \quad \text{CuO}: 0.0\text{ g} \to 1.5\text{ g}$$
  - Phía trên bình tam giác thu khí: Hiện nhãn khí thu được:
    $$\text{NO}_2: 0.0\text{ g} \to 0.4\text{ g} \quad | \quad \text{O}_2: < 0.1\text{ g}$$

---

## 4. CƠ CHẾ CHUYỂN ĐỘNG & HOẠT HỌA VẬT LÝ (MOTION & PARTICLE DYNAMICS)

### 4.1 Dòng Hạt Rơi Tự Nhiên (Powder Pouring GPU Particle Stream)
- Khi nghiêng ống chứa hóa chất: Góc nghiêng điều biến trực tiếp tốc độ rơi (emission rate).
- Các hạt bột tinh thể không rơi thành một khối dính liền mà phân tách thành hàng trăm hạt siêu nhỏ chịu tác động của gia tốc trọng trường $g = 9.8\text{ m/s}^2$ và lực cản không khí nhẹ.
- Dưới đáy ống nhận: Hạt va chạm với đáy ống và tự động vun lại thành khối có hình chóp nón tự nhiên (gọi là góc nghỉ tự nhiên - Angle of Repose $30^\circ - 35^\circ$), tạo cảm giác vật lý chân thực 100%.

### 4.2 Khí Màu Bốc Lên & Khuếch Tán Thể Tích (Volumetric Gas Simulation)
- Trong phản ứng nhiệt phân $\text{Cu(NO}_3)_2$, khí $\text{NO}_2$ sinh ra có màu nâu đỏ rất đặc trưng.
- Khi nhiệt độ đạt ngưỡng $170^\circ\text{C}$, các luồng khói màu nâu bắt đầu sinh ra từ bề mặt chất rắn màu xanh, xoáy nhẹ và dâng lên miệng ống nghiệm.
- Khi ống nghiệm được bịt nút cao su có ống dẫn khí sang bình tam giác: Luồng khí nâu di chuyển dọc theo lòng ống thủy tinh uốn cong, sục vào nước hoặc đáy bình thu khí, dần dần làm toàn bộ bình chuyển sang màu nâu trong suốt.
- Kỹ thuật thực thi: Sử dụng **Simplex Noise 3D kết hợp Raymarching trên Fragment Shader**, tiêu tốn cực ít bộ nhớ GPU nhưng đạt độ bồng bềnh như khói thật.

### 4.3 Ngọn Lửa Đèn Cồn Đa Tầng (Multi-layer Flame Shader)
- Không dùng hình ảnh sprite 2D đơn điệu, ngọn lửa đèn cồn được chia thành 3 tầng nhiệt động lực học:
  1. **Lớp trong cùng (Tâm ngọn lửa)**: Tối, nhiệt độ thấp nhất ($300 - 500^\circ\text{C}$), nơi hơi cồn chưa tiếp xúc đủ oxy.
  2. **Lớp giữa (Vùng sáng vàng cam)**: Tỏa sáng mạnh, nhiệt độ $600 - 800^\circ\text{C}$.
  3. **Lớp vỏ ngoài cùng (Vùng viền xanh lam mờ)**: Nhiệt độ cao nhất ($> 1000^\circ\text{C}$), nơi oxy dồi dào và phản ứng cháy hoàn toàn.
- **Hoạt họa mồi lửa**: Kéo que diêm lại gần bao diêm $\to$ quẹt phát ra tia lửa $\to$ que diêm cháy $\to$ đưa que diêm chạm vào bấc đèn cồn $\to$ đèn cồn bùng cháy mượt mà $\to$ que diêm tự động biến mất sau 3 giây.

### 4.4 Chế Độ Xem Vi Mô Phân Tử 3D (Microscopic View Overlay)
- Trong Video 2 (NOBOOK), một nút bấm tròn màu vàng hổ phách `View microscopic` nổi bật ở góc phải.
- Khi bấm vào nút này: Màn hình mở ra một cửa sổ lồng (Picture-in-Picture) hiển thị mô hình hạt nguyên tử 3D dạng quả cầu và thanh nối (Ball-and-Stick):
  - Mạng tinh thể oxit sắt $\text{Fe}_2\text{O}_3$: Các quả cầu sắt màu xám bạc đan xen các quả cầu oxy màu đỏ.
  - Các phân tử khí $\text{CO}$: Chuyển động nhiệt hỗn loạn (chuyển động Brown), liên tục va chạm vào bề mặt mạng tinh thể.
  - Khi va chạm ở nhiệt độ cao: Phân tử $\text{CO}$ "cướp" nguyên tử oxy từ $\text{Fe}_2\text{O}_3$ để tạo thành phân tử $\text{CO}_2$ (gồm 1 cầu đen ở giữa và 2 cầu đỏ hai bên) bay ra ngoài, để lại các nguyên tử Fe kết tụ thành kim loại nguyên chất.
- Đây chính là đỉnh cao của EdTech: **Biến khái niệm hóa học trừu tượng vô hình thành mô hình trực quan có thể nhìn thấy tận mắt!**

---

## 5. CÔNG THÁI HỌC CẢM ỨNG LỚP HỌC (TOUCH & BOARD ERGONOMICS)

### 5.1 Tiêu Chuẩn Kích Thước Chạm (Finger-friendly Touch Targets)
- Trên màn hình tương tác 65 - 86 inch, khoảng cách đứng của giáo viên và học sinh cách màn hình từ 30cm đến 60cm.
- Kích thước các nút bấm trong NOBOOK tuân thủ nghiêm ngặt:
  - Kích thước chạm tối thiểu: **$56 \times 56\text{px}$** (trên độ phân giải 1080p) hoặc **$80 \times 80\text{px}$** (trên màn hình 4K).
  - Khoảng cách an toàn giữa các nút tương tác: Tối thiểu $16\text{px}$ để tránh hiện tượng chạm nhầm ngón tay (Fat-finger problem).

### 5.2 Cơ Chế Nam Châm Từ Tính Snap-to-Dock
- Trong thế giới ảo, việc dùng ngón tay căn chỉnh chính xác từng milimet ống thủy tinh lồng vào nút cao su là vô cùng ức chế nếu không có cơ chế hỗ trợ.
- NOBOOK xử lý xuất sắc bằng **Magnetic Snap Radius ($40 - 60\text{px}$)**:
  - Khi người dùng kéo ống dẫn khí lại gần miệng ống nghiệm:
    1. Một vòng tròn sáng màu xanh lơ (Cyan Glow Ring) hiện ra chỉ báo "điểm bắt dính khả dụng".
    2. Khi thả tay ra trong phạm vi $50\text{px}$: Ống thủy tinh tự động hút vào đúng khớp nối, nút cao su tự động siết chặt vào cổ ống nghiệm.
    3. Phát ra âm thanh click cơ học nhẹ nhàng ("snap click") xác nhận kết nối thành công.

### 5.3 Menu Ngữ Cảnh Chạm 3 Chấm (Contextual Radial/Popover Menu)
- Khi chạm vào bất kỳ thiết bị nào trên bàn thí nghiệm (ống nghiệm, giá đỡ, đèn cồn), một vòng tròn lệnh nhanh xuất hiện ngay cạnh ngón tay:
  - 🔄 **Rotate**: Xoay góc nghiêng ống nghiệm để rót chất.
  - 🔒 **Fix/Clamp**: Khóa chặt thiết bị vào giá đỡ thí nghiệm.
  - 🧼 **Clean/Wash**: Rửa sạch hóa chất tồn dư.
  - 🗑️ **Delete**: Thu hồi thiết bị về kho dụng cụ.
- Tránh việc phải kéo thiết bị ngược lại thanh công cụ để xóa.

### 5.4 Vùng Công Thái Học Tránh Mỏi Tay (Ergonomic Reach Zones)
- Bàn thí nghiệm ảo được bố trí ở dải độ cao từ **35% đến 75%** tính từ đáy màn hình.
- Học sinh tiểu học, THCS hay giáo viên cao lớn đều có thể thao tác thoải mái mà không cần kiễng chân hay cúi gập lưng.
- Thanh công cụ phụ trợ đặt ở lề hai bên hoặc đỉnh mép, không chắn tầm nhìn chính giữa.

---

## 6. BẢN ĐỒ ÁNH XẠ KỸ THUẬT VÀO HỆ THỐNG EDTECH / SOCRATIC VISION BOARD

### 6.1 Kiến Trúc Component Frontend (React + TypeScript + Three.js)

```text
src/components/virtual-lab/
├── VirtualLabCanvas.tsx             # Three.js Canvas chính với Camera Orbit & Post-processing
├── hud/
│   ├── ReagentShelf.tsx             # Kệ hóa chất trượt ngang đỉnh màn hình
│   ├── ChemicalInspectorCard.tsx    # Card thông số hóa học kính mờ khi hover
│   ├── LiveStoichiometryHUD.tsx     # Thanh phương trình hóa học và số liệu mol/g/°C
│   ├── SpatulaDispenserModal.tsx    # Popup thìa đong hóa chất kèm thanh trượt gam
│   └── InstrumentToolbar.tsx        # Cột dụng cụ cảm biến (nhiệt kế, pH, que đóm)
├── overlays/
│   └── MicroscopicViewport.tsx      # Khung nhìn PIP mô phỏng mạng tinh thể phân tử 3D
├── materials/
│   ├── GlassPBRMaterial.ts          # Shader thủy tinh Borosilicate Pyrex cao cấp
│   ├── VolumetricGasMaterial.ts     # Shader khói màu NO2/SO2/Cl2 bốc lên
│   └── FlameMaterial.ts             # Shader ngọn lửa đèn cồn 3 tầng nhiệt
└── physics/
    ├── ParticlePouringEngine.ts     # Hệ thống hạt GPU đổ bột tinh thể rơi
    └── ReactionKineticsEngine.ts    # Bộ giải phương trình vi phân tốc độ phản ứng hóa học
```

### 6.2 Three.js Glass Shader Material Mẫu (Borosilicate Glass)

```typescript
import * as THREE from 'three';

export function createBorosilicateGlassMaterial(envMap: THREE.Texture): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0xffffff),
    transmission: 0.96,       // Độ xuyên thấu quang học 96%
    opacity: 1.0,
    transparent: true,
    roughness: 0.04,          // Bề mặt siêu nhẵn bóng
    metalness: 0.0,
    ior: 1.458,               // Chiết suất thủy tinh Borosilicate chuẩn
    thickness: 1.2,           // Chiều dày thành ống nghiệm giả lập
    specularIntensity: 1.0,
    specularColor: new THREE.Color(0xffffff),
    envMap: envMap,
    envMapIntensity: 1.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    attenuationColor: new THREE.Color(0xe0f2fe), // Ám xanh lơ nhẹ của thủy tinh tinh khiết
    attenuationDistance: 0.8
  });
}
```

### 6.3 Code Mẫu Live Stoichiometry HUD Component (React + Tailwind CSS)

```tsx
import React from 'react';

interface StoichiometryState {
  equation: string;
  reactants: { name: string; currentMass: number; initialMass: number; unit: string }[];
  products: { name: string; currentMass: number; unit: string }[];
  temperature: number;
  isReacting: boolean;
}

export const LiveStoichiometryHUD: React.FC<StoichiometryState> = ({
  equation,
  reactants,
  products,
  temperature,
  isReacting
}) => {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center pointer-events-none">
      {/* Khung phương trình trung tâm */}
      <div className="bg-[#1e1b2e]/85 backdrop-blur-xl border border-white/15 px-6 py-2 rounded-2xl shadow-2xl flex items-center space-x-4">
        <span className="text-xs uppercase tracking-widest text-indigo-400 font-semibold">Reaction HUD</span>
        <div className="h-4 w-px bg-white/20" />
        <span className="font-serif text-lg text-white font-medium tracking-wide">
          {equation}
        </span>
        {isReacting && (
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
        )}
      </div>

      {/* Dải thông số vi sai thời gian thực */}
      <div className="mt-2 flex space-x-3 pointer-events-auto">
        {/* Nhiệt độ */}
        <div className="bg-black/60 backdrop-blur-md border border-amber-500/30 px-3 py-1 rounded-full flex items-center space-x-2">
          <span className="text-amber-400 text-xs">🌡️ T:</span>
          <span className="font-mono text-xs text-amber-200 font-bold">{temperature.toFixed(2)} °C</span>
        </div>

        {/* Khối lượng chất phản ứng */}
        {reactants.map((r, i) => (
          <div key={i} className="bg-black/60 backdrop-blur-md border border-indigo-500/30 px-3 py-1 rounded-full flex items-center space-x-2">
            <span className="text-indigo-300 text-xs">{r.name}:</span>
            <span className="font-mono text-xs text-white font-medium">
              {r.currentMass.toFixed(2)}{r.unit}
            </span>
            <span className="text-[10px] text-gray-400 font-mono">
              ({((r.currentMass / r.initialMass) * 100).toFixed(0)}%)
            </span>
          </div>
        ))}

        {/* Khối lượng sản phẩm sinh ra */}
        {products.map((p, i) => (
          <div key={i} className="bg-black/60 backdrop-blur-md border border-emerald-500/30 px-3 py-1 rounded-full flex items-center space-x-2">
            <span className="text-emerald-300 text-xs">+{p.name}:</span>
            <span className="font-mono text-xs text-emerald-200 font-semibold">
              {p.currentMass.toFixed(2)}{p.unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 6.4 Động Cơ Hóa Học Thời Gian Thực (Reaction Kinetics Engine)
- Áp dụng phương trình kinh điển **Arrhenius** để xác định hằng số tốc độ phản ứng phụ thuộc nhiệt độ:
  $$k(T) = A \cdot \exp\left(-\frac{E_a}{R \cdot T}\right)$$
- Khi nhiệt kế hoặc ngọn lửa tăng nhiệt độ ống nghiệm từ $25^\circ\text{C}$ (298K) lên $280^\circ\text{C}$ (553K), hằng số $k(T)$ tăng theo hàm mũ.
- Tốc độ tiêu hao chất phản ứng $\frac{dm}{dt} = -k(T) \cdot m^n$ được tích phân theo bước thời gian Euler / Runge-Kutta 4 (RK4) mỗi khung hình (frame step $\Delta t = 1/60\text{s}$), đảm bảo độ trơn mượt tuyệt đối khi cập nhật số liệu lên giao diện.

---

## 7. BẢNG TỔNG HỢP SO SÁNH & ĐỀ XUẤT ÁP DỤNG TRỰC TIẾP

| Thành phần UI/UX | Video 1 (Chem with Julia) | Video 2 (NOBOOK Lab) | Đề xuất Áp dụng vào Socratic Vision Board |
| :--- | :--- | :--- | :--- |
| **Chủ đề màu (Theme)** | Dark Plum Violet Gradient (`#251d32`) | Slate Dark Cyan (`#1a2436`) | Chọn Dark Plum Gradient làm Default Theme (cho trải nghiệm cao cấp, sang trọng) |
| **Kệ hóa chất** | Kệ ngang đỉnh màn hình với Pill tabs | Menu dạng khay kéo bên cạnh | Kệ ngang đỉnh màn hình có thanh tìm kiếm và bộ lọc Pill Tabs |
| **Đong hóa chất** | Đổ trực tiếp bằng cách nghiêng ống | Popup thìa đong có Slider gam ($3\text{g}$) | **Bắt buộc áp dụng Slider vi lượng** để học sinh chủ động kiểm soát thí nghiệm |
| **Hiển thị thông số** | Live HUD phương trình và khối lượng vi sai | Tab thông số dạng thẻ (Temperature, AoS...) | Kết hợp cả 2: HUD phương trình đỉnh màn hình + Pill đo nhiệt cắm trực tiếp |
| **Minh họa vi mô** | Không có (chỉ có vĩ mô) | Có nút `View microscopic` mạng phân tử | **Tính năng sát thủ (Killer Feature)**: Bổ sung cửa sổ PIP xem phản ứng cấp phân tử |
| **Thao tác lắp ráp** | Kéo thả tự do | Snap-to-dock có chỉ thị nam châm từ tính | **Bắt buộc áp dụng Snap-to-dock ($40\text{px}$)** để trải nghiệm bảng tương tác mượt mà |

---
> **Kết luận**:  
> Việc kết hợp tính thẩm mỹ điện ảnh (Cinematic Look & Feel) của Video 1 và cơ chế công thái học cảm ứng thông minh (Touch & Particle Ergonomics) của Video 2 sẽ mang lại cho **Socratic Vision Board** một sản phẩm phòng thí nghiệm ảo vượt xa mọi đối thủ hiện có trên thị trường EdTech Việt Nam và khu vực!
