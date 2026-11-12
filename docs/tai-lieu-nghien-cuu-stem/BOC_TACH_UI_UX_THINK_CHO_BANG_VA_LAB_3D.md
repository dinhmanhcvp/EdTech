# BÓC TÁCH TOÀN DIỆN THẨM MỸ THỊ GIÁC & CÔNG THÁI HỌC UI/UX TỪ NỀN TẢNG THINK (`think.pro.vn`)
## Áp Dụng Cho Cả Template Trực Quan Trên Bảng & Phòng Thí Nghiệm Ảo 3D

> **Bản quyền nghiên cứu & thiết kế kỹ thuật EdTech**: Dành cho Dự án Socratic Vision Board & Hệ sinh thái Học tập Đa môn `think`.  
> **Nguồn phân tích trực tiếp**: Hệ thống Web App & API thực tế tại `https://think.pro.vn` (Bao gồm Thư viện học liệu 458 bài, Bảng viết InkSurface, Lớp dụng cụ đo InstrumentsLayer, Xưởng mô phỏng BuilderWorkspace, và Trình phát mô phỏng 3D SimulationViewer).

---

## MỤC LỤC
1. [GIẢI PHẪU TỔNG THỂ HỆ SINH THÁI GIAO DIỆN THINK](#1-giải-phẫu-tổng-thể-hệ-sinh-thái-giao-diện-think)
2. [HỆ THỐNG VISUAL TOKENS & THẨM MỸ "PAPER & PRECISION"](#2-hệ-thống-visual-tokens--thẩm-mỹ-paper--precision)
3. [BÓC TÁCH LỚP DỤNG CỤ HÌNH HỌC TRÊN BẢNG (INSTRUMENTSLAYER)](#3-bóc-tách-lớp-dụng-cụ-hình-học-trên-bảng-instrumentslayer)
4. [BÓC TÁCH GIAO DIỆN KHUNG MÔ PHỎNG & LAB 3D (SIMULATIONVIEWER & BUILDER)](#4-bóc-tách-giao-diện-khung-mô-phỏng--lab-3d-simulationviewer--builder)
5. [BÓC TÁCH CẤU TRÚC THƯ VIỆN HỌC LIỆU & KỆ TRƯỢT (COMMUNITY LIBRARY)](#5-bóc-tách-cấu-trúc-thư-viện-học-liệu--kệ-trượt-community-library)
6. [BẢN ĐỒ ÁNH XẠ KỸ THUẬT VÀO HỆ THỐNG SOCRATIC MONOREPO](#6-bản-đồ-ánh-xạ-kỹ-thuật-vào-hệ-thống-socratic-monorepo)

---

## 1. GIẢI PHẪU TỔNG THỂ HỆ SINH THÁI GIAO DIỆN THINK

Qua khảo sát toàn bộ mã nguồn JavaScript bundle (`index-DL5skye1.js`), các gói CSS chuyên biệt và API hệ thống, nền tảng `think` vận hành trên một kiến trúc giao diện tương tác cực kỳ chặt chẽ với **4 phân hệ cốt lõi**:

```text
                                      HỆ SINH THÁI THINK (think.pro.vn)
                                                    │
        ┌───────────────────────────┬───────────────┴───────────────┬───────────────────────────┐
        ▼                           ▼                               ▼                           ▼
1. BẢNG VIẾT & VỞ HỌC        2. KHUNG MÔ PHỎNG 3D         3. XƯỞNG CHẾ TÁC LAB         4. THƯ VIỆN CỘNG ĐỒNG
   (InkSurface +               (SimulationViewerPage +       (BuilderWorkspace +          (CommunityLibraryPage +
   InstrumentsLayer)           simulationLook)               /studio/simulations)         458 học liệu phát hành)
   • Nền giấy ngà chống lóa    • Khung nhìn linh hoạt        • Hỗ trợ HTML (5MB)          • Kệ trượt carousel
   • Thước kẻ, Ê-ke, Thước đo  • Thanh tham số ẩn/hiện       • Hỗ trợ 3D GLB (50MB)       • Lọc 4 cấp tự động
   • Mực viết mềm mại          • Đề bài & Lời giải           • Revisioning & Draft        • Thẻ bài đa dữ kiện
```

### 1.1 Triết lý Thiết kế "Paper & Precision"
Khác với các phần mềm quản lý học tập (LMS) khô cứng hay các game 3D quá màu mè làm phân tán chú ý, `think` theo đuổi sự cân bằng hoàn hảo giữa:
- **Cảm giác quen thuộc của trang giấy vật lý (Paper Warmth)**: Sử dụng các gam màu ngà ấm áp (`#fffdf8`, `#fcf9f5`), font chữ có chân trang nhã kết hợp Sans-serif hiện đại, tạo cảm giác học tập an tĩnh, tập trung sâu.
- **Độ chính xác kỹ thuật cao của công cụ toán học (Digital Precision)**: Dụng cụ thước kẻ, ê-ke có vạch chia milimet sắc nét; mô phỏng 3D có thanh trượt tham số vi mô; thông số hiển thị dạng số học cố định (tabular nums).

---

## 2. HỆ THỐNG VISUAL TOKENS & THẨM MỸ "PAPER & PRECISION"

### 2.1 Bảng màu Nền & Bề mặt (Surface & Canvas Tokens)

| Tên Biến Token | Mã Màu Hex / Giá trị | Ý nghĩa Thị giác & Hiệu quả Giáo dục |
| :--- | :--- | :--- |
| `--nbe-paper` | `#fffdf8` | Nền giấy ngà chính; loại bỏ $100\%$ độ chói của màu trắng tinh `#ffffff`, bảo vệ mắt học sinh khi nhìn lâu. |
| `--nbe-app-bg` | `#f7f1ea` | Nền ứng dụng tầng ngoài, tạo độ tương phản nhẹ nhàng tôn vinh trang giấy trung tâm. |
| `--nbe-surface-soft` | `#fcf9f5` | Nền các thanh công cụ, bảng điều khiển phụ và dock trôi nổi. |
| `--nbe-control-bg` | `#fdfaf6` | Nền các nút bấm, ô nhập số liệu và thanh trượt tham số. |
| `--nbe-navy` (`--vl-ink`) | `#1b1815` | Màu mực đen ánh nâu cà phê; thay thế màu đen gắt `#000000`, tạo nét viết mềm mại, cao cấp. |
| `--nbe-text-2` | `#645d54` | Màu chữ phụ, chú thích, nhãn đơn vị và thời gian đăng. |
| `--nbe-border` | `rgba(27, 24, 21, 0.12)` | Đường viền thanh mảnh, tinh tế, chia ranh giới nhưng không gây cảm giác nặng nề. |

### 2.2 Phổ Màu Phân Loại Bộ Môn (Subject Color Spectrum)
Hệ thống sử dụng bảng màu nhận diện bộ môn cực kỳ tinh tế, có độ bão hòa vừa phải (không quá chói):

```text
Toán học   [#0F8F8F - Cyan Teal]     ──> Biểu trưng cho tư duy logic, cấu trúc đại số và hình học
Vật lý     [#1677E8 - Electric Azure] ──> Biểu trưng cho điện từ trường, năng lượng và không gian
Hóa học    [#2DA58F - Emerald Sea]    ──> Biểu trưng cho dung dịch, liên kết phân tử và phản ứng
Địa lý     [#147F9D - Deep Marine]    ──> Biểu trưng cho đại dương, khí quyển và bản đồ địa hình
Sinh học   [#2A805C - Forest Green]   ──> Biểu trưng cho di truyền học, tế bào và hệ sinh thái
Ngữ văn    [#62536C - Mauve Violet]   ──> Biểu trưng cho chiều sâu tâm hồn, văn chương và cảm xúc
```

### 2.3 Thang Bán Kính Viền & Bóng Đổ Khối (Radius & Elevation Hierarchy)
- **Hệ thống Bo góc (Border Radius)**:
  - Icon & Tag nhỏ: `--nbe-radius-icon: 8px`
  - Nút bấm (Buttons): `--nbe-radius-btn: 10px`
  - Thẻ bài học liệu (Cards): `--nbe-radius-card: 14px`
  - Bảng điều khiển (Panels): `--nbe-radius-panel: 20px`
  - Dock & Floating Menus: `--nbe-radius-float: 22px`
- **Hệ thống Bóng đổ (Elevation Shadows)**:
  - Nổi nhẹ: `--nbe-shadow-sm: 0 4px 14px rgba(27, 24, 21, 0.06)`
  - Trôi nổi: `--nbe-shadow-float: 0 10px 28px rgba(27, 24, 21, 0.09)`
  - Hiệu ứng gáy sách 3D: `--nbe-shadow-book: 0 22px 44px -8px rgba(27, 24, 21, 0.14), 0 2px 5px rgba(27, 24, 21, 0.05)` (tạo chiều sâu như đặt cuốn sách thật lên mặt bàn).

---

## 3. BÓC TÁCH LỚP DỤNG CỤ HÌNH HỌC TRÊN BẢNG (`INSTRUMENTSLAYER`)

Một trong những module thiết kế xuất sắc nhất của `think` chính là **Lớp dụng cụ đo lường trực quan** (`InstrumentsLayer`), cho phép giáo viên và học sinh thao tác dụng cụ thực tế trên nền bảng viết:

### 3.1 Giải phẫu 3 Dụng cụ Đo Hình học Cốt lõi
1. **Thước Thẳng Chia Milimet (`.uss-inst__ruler`)**:
   - Thân thước: `fill: #fff6dec7; stroke: #b49a6a; stroke-width: 1.2px` (Màu nhựa vàng ngà cao cấp, trong mờ nhẹ để nhìn xuyên qua các nét vẽ phía dưới).
   - Vạch chia: Khắc mảnh `1px`, vạch chính $1\text{cm}$, vạch phụ $5\text{mm}$ và $1\text{mm}$ màu mực `#3b332a`.
   - Con số: Font `Inter` 600, `font-variant-numeric: tabular-nums` chống xê dịch.
2. **Ê-ke Vuông Góc (`.uss-inst__setSquare`)**:
   - Thân thước: `fill: #d6e8fc9e; stroke: #7d9cc2` (Màu mica xanh dương trong mờ thanh thoát).
   - Có rãnh khoét tam giác bên trong giúp quan sát toàn cảnh hình học.
3. **Thước Đo Độ Bán Nguyệt (`.uss-inst__protractor`)**:
   - Thân thước: `fill: #fafbffa8; stroke: #8a9dba` (Màu thủy tinh trắng mờ chống lóa).
   - Hệ thang chia độ kép: Vòng ngoài ($0^\circ \to 180^\circ$) và vòng trong ($180^\circ \to 0^\circ$ màu `#8a7f72`) phục vụ đo góc thuận và nghịch chiều kim đồng hồ.

### 3.2 Cơ chế Tương tác Núm Xoay & Dải Kẻ Nét (Knob & Band Ergonomics)
- **Núm xoay (`.uss-inst__knob`)**: Được bố trí tại góc hoặc tâm quay của dụng cụ. Vòng tròn trắng viền đen mảnh, có icon mũi tên xoay tròn và bóng đổ nổi bật. Khi kéo núm xoay, góc quay của thước thay đổi trơn tru kèm số đo góc hiển thị thời gian thực.
- **Tâm ngắm chuẩn xác (`.uss-inst__center`)**: Điểm tâm hình tròn đỏ rực (`stroke: #d64545; stroke-width: 1.6px`) với tia chuẩn nét đứt (`stroke-dasharray: 5 4`) giúp học sinh dễ dàng căn đỉnh góc trùng khít với tâm thước.
- **Dải mép vẽ thông minh (`.uss-inst__band`)**: Mép thước có một vùng cảm ứng vô hình (hitbox). Khi rê bút hoặc chuột vào mép thước:
  - Con trỏ chuyển thành `crosshair` (chữ thập căn lề).
  - Mép thước sáng bừng quầng màu hổ phách nhẹ `#f2a43a1f` báo hiệu: *"Mọi nét vẽ tại đây sẽ tự động bắt dính (snap) thẳng tắp theo cạnh thước!"*.

---

## 4. BÓC TÁCH GIAO DIỆN KHUNG MÔ PHỎNG & LAB 3D (SIMULATIONVIEWER & BUILDER)

### 4.1 Bố cục Giao diện Trình phát Mô phỏng (`SimulationViewerPage`)
Khung trình phát mô phỏng của `think` giải quyết triệt để vấn đề "mô phỏng bị cô lập khỏi bài toán" bằng kiến trúc 3 thành phần tích hợp:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  MÔ PHỎNG 3D: DAO ĐỘNG CON LẮC ĐƠN                                [ Thu gọn ] [ Đặt lại ]│
├──────────────────────────────────────────────────────┬─────────────────────────────────┤
│                                                      │  📋 ĐỀ BÀI & LỜI GIẢI           │
│                                                      │  Khảo sát chu kỳ dao động T     │
│                 KHUNG NHÌN 3D / CANVAS                │  khi chiều dài dây l thay đổi.  │
│                                                      │                                 │
│                 (Three.js / WebGL / GLB)             ├─────────────────────────────────┤
│                                                      │  🎛️ THAM SỐ ĐIỀU KHIỂN          │
│               • Quỹ đạo con lắc                      │  Chiều dài l: [ 1.2 m ─────── ] │
│               • Vector vận tốc & gia tốc             │  Khối lượng m: [ 0.5 kg ───── ] │
│               • Đồ thị pha thời gian thực            │  Góc lệch α₀: [ 15° ───────── ] │
│                                                      │  Gia tốc g: [ 9.81 m/s² ──── ]  │
├──────────────────────────────────────────────────────┴─────────────────────────────────┤
│  ▶ Chạy  ⏸ Tạm dừng  ⏮ Từng bước    Tốc độ: [ 1.0x ▼ ]    Hiển thị: [x] Lực  [x] Năng lượng│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Khung nhìn Canvas chính (Viewport)**:
   - Hỗ trợ cả 2 nguồn: file HTML tương tác độc lập (tối đa 5MB) và mô hình 3D chuẩn GLB (tối đa 50MB).
   - Tự động thích ứng kích thước (Responsive Aspect Ratio), hỗ trợ nút phóng to toàn màn hình hoặc thu gọn.
2. **Bảng Tham số Động (Parameters Drawer)**:
   - Các thanh trượt điều chỉnh thông số vật lý/hóa học được nhóm theo danh mục rõ ràng.
   - Luôn có nút **"Đặt lại tham số" (Reset Parameters)** để đưa thí nghiệm về trạng thái chuẩn ban đầu chỉ với 1 cú click.
3. **Thẻ Đề bài & Lời giải Gắn liền ("Đề bài · Lời giải")**:
   - Cho phép học sinh đọc trực tiếp đề bài, câu hỏi gợi mở Socratic và các bước hướng dẫn giải mà không cần mở sang tab khác, giữ trọn vẹn luồng tư duy (Zero context switching).

### 4.2 Xưởng Chế Tác Mô Phỏng (`BuilderWorkspace` / Studio)
- Hệ thống hỗ trợ giáo viên tự đóng gói mô phỏng thông qua Studio:
  - Quản lý phiên bản (Revision History): Lưu nháp tự động (Auto-draft), cảnh báo xung đột phiên bản.
  - Huy hiệu trạng thái mô phỏng:
    - 🟢 **Sẵn sàng sử dụng** (`--ms-ready: #0d7a5f`, nền `#e3f6ef`)
    - 🟡 **Bản nháp đang sửa** (`--ms-draft: #8a5a00`, nền `#fdf1d8`)
    - 🔴 **Lỗi cấu hình** (`--ms-danger: #b42318`, nền `#fdecea`)
  - Dock đáy chứa thanh công cụ chỉnh sửa tham số, gán nhãn môn học, khối lớp và tạo bản sao.

---

## 5. BÓC TÁCH CẤU TRÚC THƯ VIỆN HỌC LIỆU & KỆ TRƯỢT (COMMUNITY LIBRARY)

### 5.1 Kệ Trượt Trực Quan Vô Tận (Infinite Carousel Shelves)
- Trên trang `think.pro.vn/community`, các bài học liệu được tổ chức thành các **Kệ sách trôi nổi (Shelves)**:
  - Tiêu đề kệ có chấm tròn màu môn học (`.cml-shelf__dot`), tổng số bài (`.cml-shelf__n`) và nút xem tất cả.
  - Điều hướng trượt ngang: Nút mũi tên trái/phải di chuyển mượt mà $90\%$ bề rộng màn hình (`scrollBy({ left: 0.9 * clientWidth, behavior: 'smooth' })`).
  - Nạp ngầm tự động (Auto load-more): Tích hợp `IntersectionObserver` với biên kích hoạt trước $800\text{px}$ (`rootMargin: "0px 0px 800px 0px"`), học sinh cuộn đến đâu bài nạp đến đó, không hề có độ trễ giật khung hình.

### 5.2 Bộ Lọc Phân Tầng 4 Cấp Tự Động (Cascading Filter Bar)
- Quy trình lọc bài trực quan và thông minh:
  $$\text{Môn học (Subject)} \xrightarrow{\text{kích hoạt}} \text{Khối lớp (Grade)} \xrightarrow{\text{kích hoạt}} \text{Chương học (Chapter)} \xrightarrow{\text{kích hoạt}} \text{Loại bài (Type)}$$
- Khi chọn Môn học và Khối lớp, hệ thống tự động gọi API `/public/subjects/{slug}/grades/{code}/chapters` để nạp danh sách chương tương ứng.
- Có nút Xóa nhanh bộ lọc (Clear All) khi muốn quay về trang tổng quan.

### 5.3 Giải Phẫu Thẻ Bài Học Liệu (`CommunityPostCard`)
Mỗi thẻ bài học liệu là một tác phẩm UI/UX hoàn thiện:
- **Ảnh bìa (Cover Image)**: Tỷ lệ 16:10, hiệu ứng chuyển màu ánh sáng tỏa tâm (`radial-gradient`), hoạt họa mờ dần khi nạp ảnh (`ms-fade-in 0.26s`). Nếu ảnh lỗi, tự động hiển thị nền fallback màu môn học kèm tên bài trang trọng.
- **Thanh đo lường xã hội (Social Metrics)**:
  - 📄 Số trang bài học (`pageCount` trang).
  - 👁️ Lượt xem định dạng số lớn (`1.2k`, `35k` lượt xem).
  - 🔖 Lượt lưu vào kho cá nhân.
  - ⭐ Đánh giá sao trung bình (Rating Average).
  - 🕒 Thời gian đăng tương đối bằng tiếng Việt ("vừa xong", "3 ngày trước", "2 tuần trước").

---

## 6. BẢN ĐỒ ÁNH XẠ KỸ THUẬT VÀO HỆ THỐNG SOCRATIC MONOREPO

Để nâng cấp toàn diện cả **Template trực quan trên bảng thông minh** lẫn **Phòng Lab 3D**, nhóm kỹ sư kiến trúc đề xuất áp dụng ngay các thành phần sau vào `socratic-monorepo`:

### 6.1 Áp dụng cho Template Trực quan trên Bảng (`teacher-board` / `SmartboardCanvas`)
1. **Tích hợp Lớp Dụng cụ Đo lường Hình học (`SmartboardInstrumentsLayer.tsx`)**:
   - Mang trực tiếp thiết kế Thước kẻ, Ê-ke, Thước đo độ từ `InstrumentsLayer` vào bảng thông minh của giáo viên.
   - Thêm cơ chế bắt dính nét vẽ (Snap-to-edge) khi bút vẽ di chuyển sát mép thước kẻ.
2. **Chuyển đổi Bảng màu sang Tone Giấy Ngà & Mực Cà phê (`Paper & Ink Mode`)**:
   - Cung cấp tùy chọn giao diện bảng: Nền đen truyền thống (Chalkboard Dark), Nền xanh phấn (Chalkboard Green) và **Nền Giấy Ngà think (`#fffdf8`)** chống mỏi mắt cho các tiết dạy hình học và văn học.

### 6.2 Áp dụng cho Phòng Lab 3D (`student-app` / `VirtualLabCanvas`)
1. **Thiết kế lại Khung SimulationWidget theo Bố cục 3 Khối của think**:
   - Tách biệt rõ: Khung 3D chính $\to$ Bảng tham số vi mô bên phải có nút Reset $\to$ Thẻ đề bài gợi mở Socratic ở góc trên.
2. **Hỗ trợ Tải Mô hình 3D Định dạng GLB**:
   - Chuẩn hóa module nạp file GLB ($\le 50\text{MB}$) cho phép giáo viên tải các mô hình 3D giải phẫu, động cơ, dụng cụ thí nghiệm trực tiếp vào phòng lab.
3. **Thẻ Bìa Mô phỏng Tinh tế (Simulation Look & Badges)**:
   - Áp dụng hiệu ứng gradient tỏa tâm và 3 trạng thái badge (Sẵn sàng `#0d7a5f`, Bản nháp `#8a5a00`, Nguy hiểm `#b42318`).

### 6.3 Mã Nguồn Mẫu: Component Dụng Cụ Thước Kẻ Tương Tác (`InteractiveRuler.tsx`)

```tsx
import React, { useState } from 'react';

interface RulerProps {
  initialX?: number;
  initialY?: number;
  lengthMm?: number; // Ví dụ 200mm = 20cm
  scale?: number;    // px per mm
  onSnapDraw?: (start: { x: number; y: number }, end: { x: number; y: number }) => void;
}

export const InteractiveRuler: React.FC<RulerProps> = ({
  initialX = 100,
  initialY = 100,
  lengthMm = 200,
  scale = 3, // 1mm = 3px
}) => {
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const [angle, setAngle] = useState(0);
  const [isHoverEdge, setIsHoverEdge] = useState(false);

  const rulerWidth = lengthMm * scale;
  const rulerHeight = 65; // px

  return (
    <div
      className="absolute select-none pointer-events-auto cursor-grab active:cursor-grabbing"
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px) rotate(${angle}deg)`,
        transformOrigin: '0 0',
      }}
    >
      <svg
        width={rulerWidth + 40}
        height={rulerHeight}
        className="overflow-visible drop-shadow-md"
      >
        {/* Thân thước màu vàng ngà trong mờ */}
        <rect
          x={0}
          y={0}
          width={rulerWidth}
          height={rulerHeight}
          rx={8}
          fill="#fff6dec7"
          stroke="#b49a6a"
          strokeWidth={1.2}
        />

        {/* Dải mép vẽ bắt dính thông minh */}
        <rect
          x={0}
          y={0}
          width={rulerWidth}
          height={16}
          fill={isHoverEdge ? 'rgba(242, 164, 58, 0.2)' : 'transparent'}
          className="cursor-crosshair transition-colors"
          onMouseEnter={() => setIsHoverEdge(true)}
          onMouseLeave={() => setIsHoverEdge(false)}
        />

        {/* Thang chia vạch milimet */}
        {Array.from({ length: lengthMm + 1 }).map((_, mm) => {
          const isCm = mm % 10 === 0;
          const isHalfCm = mm % 5 === 0 && !isCm;
          const tickH = isCm ? 18 : isHalfCm ? 12 : 7;

          return (
            <g key={mm} transform={`translate(${mm * scale}, 0)`}>
              <line
                x1={0}
                y1={0}
                x2={0}
                y2={tickH}
                stroke="#3b332a"
                strokeWidth={isCm ? 1.2 : 0.8}
              />
              {isCm && (
                <text
                  x={0}
                  y={28}
                  fill="#3b332a"
                  fontSize={11}
                  fontWeight={600}
                  textAnchor="middle"
                  fontFamily="Inter, system-ui, sans-serif"
                >
                  {mm / 10}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
```

---

## 7. BẢNG TỔNG HỢP SO SÁNH & LỢI ÍCH KHI TÍCH HỢP

| Thành phần Thiết kế | Hệ thống Hiện tại (Cũ) | Thừa hưởng từ `think.pro.vn` | Giá trị Đột phá cho Người dùng |
| :--- | :--- | :--- | :--- |
| **Thẩm mỹ Mặt bảng** | Nền tối đơn điệu hoặc trắng gắt | Hệ Paper & Ink (`#fffdf8`, `#1b1815`) | Học sinh học liên tục 4-5 tiết không mỏi mắt; cảm giác viết như trên giấy thật. |
| **Dụng cụ Hình học** | Vẽ hình tự do không có dụng cụ thực tế | Lớp `InstrumentsLayer` (Thước kẻ, Ê-ke, Thước đo độ xoay) | Giáo viên thực hiện thao tác giảng dạy chuẩn mực sư phạm trực tiếp trên bảng. |
| **Bố cục Khung Lab 3D** | Khung mô phỏng chiếm trọn màn hình, menu che khuất | Bố cục 3 khối phân rã: Viewport + Tham số + Đề bài/Lời giải | Học sinh vừa điều khiển thí nghiệm vừa đọc câu hỏi gợi ý Socratic mà không bị đứt mạch tư duy. |
| **Nạp dữ liệu 3D** | Chỉ hỗ trợ code WebGL tự sinh | Hỗ trợ file HTML ($\le 5\text{MB}$) & file 3D GLB ($\le 50\text{MB}$) | Tận dụng được kho mô hình 3D khổng lồ trên thế giới (Sketchfab, NASA, sinh học...). |
| **Tổ chức Học liệu** | Danh sách bài dạng bảng đơn giản | Kệ trượt Carousel vô tận + Bộ lọc 4 cấp | Trải nghiệm duyệt bài mượt mà như Netflix / Apple Books, kích thích tinh thần tự học. |

---
> **Kết luận**:  
> Việc kết hợp triết lý thẩm mỹ **Paper & Precision** của `think.pro.vn` với các công nghệ tương tác không gian (XR, MediaPipe) và động cơ mô phỏng vật lý/hóa học 3D sẽ đưa **Socratic Vision Board** trở thành nền tảng giáo dục số toàn diện, vượt trội hoàn toàn về cả mặt sư phạm lẫn trải nghiệm người dùng!
