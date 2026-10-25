# NGHỆ THUẬT RENDER TRỰC QUAN ĐẲNG CẤP (PUBLICATION-GRADE VISUAL RENDERING)
## HƯỚNG DẪN THIẾT KẾ ĐỒ HỌA MÔ PHỎNG STEM 60 FPS ĐỘ PHÂN GIẢI 4K — LOẠI BỎ HOÀN TOÀN "NÉT VẼ PYTHON ĐƠN THUẦN"

> **Dự án**: Socratic Vision Board v2.0.0 (Enterprise EdTech Monorepo)  
> **Chủ đề**: Nâng cấp toàn diện bộ máy kết xuất đồ họa (Visual Rendering Engine Upgrade)  
> **Tôn chỉ thẩm mỹ**: *"Không tạo ra các đồ thị vô hồn như thư viện Matplotlib hay Python Tkinter. Mọi mô phỏng trên Socratic Vision Board phải đạt chuẩn mực hình ảnh của Apple Keynote, 3Blue1Brown (Manim), Brilliant.org và Kurzgesagt: Sắc nét 4K Retina, chiều sâu ánh sáng PBR, phát quang huỳnh quang, chuyển động đàn hồi vật lý và bố cục tạp chí khoa học cao cấp."*

---

## MỤC LỤC TỔNG QUAN

1. [PHÂN TÍCH NGUYÊN NHÂN "NÉT VẼ PYTHON ĐƠN THUẦN" VÀ CÁCH KHẮC PHỤC](#1-phân-tích-nguyên-nhân-nét-vẽ-python-đơn-thuần-và-cách-khắc-phục)
2. [BỘ QUY TẮC THIẾT KẾ THỊ GIÁC ĐẲNG CẤP (THE 6 VISUAL PILLARS)](#2-bộ-quy-tắc-thiết-kế-thị-giác-đẳng-cấp-the-6-visual-pillars)
3. [KỸ THUẬT RENDER SẮC NÉT 4K RETINA TRÊN SMARTBOARD 75"-86"](#3-kỹ-thuật-render-sắc-nét-4k-retina-trên-smartboard-75-86)
4. [ÁNH SÁNG PBR, GLOW PHÁT QUANG & SHADOW TRÊN CANVAS 2D/WEBGL](#4-ánh-sáng-pbr-glow-phát-quang--shadow-trên-canvas-2dwebgl)
5. [ĐỘNG LỰC HỌC CHUYỂN ĐỘNG HỮU CƠ (SPRING DYNAMICS & PARTICLE SYSTEMS)](#5-động-lực-học-chuyển-động-hữu-cơ-spring-dynamics--particle-systems)
6. [ĐẶC TẢ CHI TIẾT NÂNG CẤP HÌNH ẢNH CHO 4 ENGINE STEM](#6-đặc-tả-chi-tiết-nâng-cấp-hình-ảnh-cho-4-engine-stem)
   - 6.1. [Toán học: Đồ thị Gradient Vũ trụ & Con trỏ Beacons](#61-toán-học-đồ-thị-gradient-vũ-trụ--con-trỏ-beacons)
   - 6.2. [Vật lý: Lò xo Thép Kim loại 3D & Sóng Nước Caustic](#62-vật-lý-lò-xo-thép-kim-loại-3d--sóng-nước-caustic)
   - 6.3. [Hóa học: Thủy tinh Khúc xạ & Phân tử Men Gốm VSEPR 3D](#63-hóa-học-thủy-tinh-khúc-xạ--phân-tử-men-gốm-vsepr-3d)
   - 6.4. [Sinh học: Cơ Tim Sinh học Đàn hồi & ADN Huỳnh quang Neon](#64-sinh-học-cơ-tim-sinh-học-đàn-hồi--adn-huỳnh-quang-neon)
7. [MÃ NGUỒN MẪU: THƯ VIỆN ĐỒ HỌA STEM PRO RENDERER](#7-mã-nguồn-mẫu-thư-viện-đồ-họa-stem-pro-renderer)

---

## 1. PHÂN TÍCH NGUYÊN NHÂN "NÉT VẼ PYTHON ĐƠN THUẦN" VÀ CÁCH KHẮC PHỤC

Các dự án giáo dục AI truyền thống thường bị chê là "xấu", "khô khan", "nhìn như đồ án sinh viên" vì lạm dụng các thư viện vẽ kỹ thuật cũ kỹ của Python (Matplotlib, Turtle, Pygame, Tkinter).

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│               SO SÁNH: "NÉT VẼ PYTHON ĐƠN THUẦN" VS "SOCRATIC PRO RENDER"       │
├──────────────────────────┬──────────────────────────────────────────────────────┤
│ NÉT VẼ PYTHON ĐƠN THUẦN  │ CHUẨN MỰC SOCRATIC PRO RENDER (APPLE / 3BLUE1BROWN)  │
├──────────────────────────┼──────────────────────────────────────────────────────┤
│ • Nét vẽ mảnh 1px, răng  │ • Nét vẽ Vector chống răng cưa sub-pixel, độ dày     │
│   cưa (aliasing), nhợt   │   2.5px - 4px, sắc bén tuyệt đối trên màn 4K 86".    │
│   nhạt trên màn hình 4K. │ • Chế độ Retina Scaling (buffer pixel = CSS * DPR).  │
├──────────────────────────┼──────────────────────────────────────────────────────┤
│ • Màu sắc mặc định chói: │ • Bảng màu HSL tuyển chọn (Curated Academic Palette): │
│   Đỏ cờ #FF0000, Xanh lá │   Xanh Coban điện tích, Hổ phách hoàng kim, Lục bảo  │
│   #00FF00, Nền trắng toát│   ngọc bích, Hồng ngọc; Nền Slate tối hoặc Ivory ấm. │
├──────────────────────────┼──────────────────────────────────────────────────────┤
│ • Không có chiều sâu:    │ • Chiều sâu thị giác PBR (Physically Based Rendering)│
│   Hình 2D phẳng lì, như  │   với bóng tiếp xúc mềm (Ambient Contact Shadow),    │
│   cắt dán từ giấy vẽ.    │   ánh sáng phản xạ Specular Glint và viền Fresnel Rim│
├──────────────────────────┼──────────────────────────────────────────────────────┤
│ • Chuyển động giật cục:  │ • Chuyển động hữu cơ (Organic Motion) với giải thuật │
│   Kéo thanh trượt thì    │   Lò xo giảm chấn bậc 2 (Second-Order Spring Damping)│
│   đồ thị nhảy giật tức thì│  Vệt sáng huỳnh quang (Phosphor Trail) mờ dần mượt mà│
├──────────────────────────┼──────────────────────────────────────────────────────┤
│ • Chữ viết Monospace/    │ • Typography toán học mỹ thuật: KaTeX / Aptos /      │
│   Arial chèn đè lên hình │   Inter; Nhãn chỉ số dạng Floating Pill Badges có    │
│   vẽ, không đọc được xa. │   hiệu ứng kính mờ Glassmorphism và viền phát sáng.  │
└──────────────────────────┴──────────────────────────────────────────────────────┘
```

---

## 2. BỘ QUY TẮC THIẾT KẾ THỊ GIÁC ĐẲNG CẤP (THE 6 VISUAL PILLARS)

Để tạo hiệu ứng "WOW" ngay từ giây đầu tiên khi giáo viên khoanh Magic Lasso, toàn bộ bộ máy đồ họa client tuân thủ 6 trụ cột thị giác:

```
                                  6 TRỤ CỘT THỊ GIÁC ĐẲNG CẤP
                                               │
         ┌──────────────────┬──────────────────┼──────────────────┬──────────────────┐
         ▼                  ▼                  ▼                  ▼                  ▼
    1. RETINA 4K       2. PBR DEPTH       3. GLOW/BLOOM      4. CHUYỂN ĐỘNG      5. GLASSMORPHISM
    SUB-PIXEL SHARP     SHADOW & LIGHT     HUỲNH QUANG        LÒ XO ĐÀN HỒI       FLOATING PILLS
```

1. **Hi-DPI Sub-pixel Anti-Aliasing**: Tự động nhân đôi/nhân ba độ phân giải thực của Canvas theo `devicePixelRatio` của màn hình Smartboard để mọi đường cong mượt như in trên tạp chí.
2. **PBR Depth & Shadow (Chiều sâu Ánh sáng Vật lý)**: Mọi vật thể (quả cầu, quả nặng con lắc, nguyên tử, hạt khí) đều có 3 lớp ánh sáng:
   - Ánh sáng môi trường (Ambient Light).
   - Đốm sáng phản chiếu trực tiếp (Specular Glint trắng sắc nét).
   - Bóng đổ tiếp xúc xuống mặt đất (Contact Shadow dạng hình elip mờ dần).
3. **Glow & Bloom (Hiệu ứng Phát quang Huỳnh quang)**:
   - Các đại lượng mang tính năng lượng (dòng electron chạy, liên kết hydro ADN, đường cong cộng hưởng, tiếp tuyến cực trị) đều phát ra quầng sáng huỳnh quang neon nhẹ tỏa ra xung quanh (`shadowBlur = 12px`).
4. **Spring Physics Smoothing (Động lực học Lò xo Mượt mà)**:
   - Khi giáo viên kéo thanh trượt từ $x = 10 \to 50$, đồ thị không nhảy "bụp" một cái mà lướt tới vị trí mới theo quán tính vật lý (Spring Easing), tạo cảm giác sống động như một cỗ máy cơ khí cao cấp.
5. **Glassmorphism Floating Badges**:
   - Toàn bộ thông số đo đạc ($v = 22\text{ m/s}, T = 1.42\text{s}, pH = 7.0$) được đặt trong các thẻ bo tròn viền mỏng (`rounded-full`), nền kính mờ mờ (`backdrop-filter: blur(12px)`), chữ số hiển thị to bản, học sinh ngồi góc lớp xa 8m vẫn đọc rõ ràng.
6. **Curated Color Grading (Phối màu Tạp chí Khoa học)**:
   - Nền Dark Slate Academic: `#0F172A` kết hợp lưới tọa độ chấm bi chấm mờ `#1E293B`.
   - Nền Ivory ấm áp ban ngày: `#FCFBF9` kết hợp lưới viền mảnh `#E2E8F0`.

---

## 3. KỸ THUẬT RENDER SẮC NÉT 4K RETINA TRÊN SMARTBOARD 75"-86"

Màn hình bảng thông minh 75" đến 86" thường có độ phân giải **4K UHD ($3840 \times 2160$)**. Nếu tạo Canvas kích thước theo CSS thông thường (`width: 800px`), hình vẽ sẽ bị vỡ hạt và mờ nhạt nghiêm trọng.

### Thuật toán Chuẩn hóa Hi-DPI Retina Buffer:

```typescript
export function setupCrispCanvas(
  canvas: HTMLCanvasElement,
  cssWidth: number,
  cssHeight: number
): CanvasRenderingContext2D {
  // Lấy tỉ lệ mật độ điểm ảnh thực tế của bảng (thường là 2.0 hoặc 3.0 trên màn hình 4K)
  const dpr = window.devicePixelRatio || 2;
  
  // Thiết lập kích thước buffer vật lý bên trong gấp 2-3 lần
  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);

  // Khóa kích thước hiển thị CSS đúng bằng kích thước mong muốn
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  const ctx = canvas.getContext('2d', { alpha: true })!;
  
  // Scale toàn bộ tọa độ vẽ theo tỉ lệ DPR
  ctx.scale(dpr, dpr);

  // Bật chế độ làm mịn ảnh chất lượng cao
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  return ctx;
}
```

---

## 4. ÁNH SÁNG PBR, GLOW PHÁT QUANG & SHADOW TRÊN CANVAS 2D/WEBGL

### 4.1. Hàm Render Quả Cầu 3D PBR (PBR Sphere Shader)
Thay vì vẽ hình tròn phẳng `ctx.arc()` với 1 màu đơn điệu như Python, hàm sau tạo ra quả cầu 3D bóng láng như viên bi kim loại hoặc quả cầu men gốm:

```typescript
export function drawPbrSphere(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  baseColor: string = '#2563EB',
  highlightColor: string = '#FFFFFF'
) {
  ctx.save();

  // 1. Bóng đổ tiếp xúc xuống mặt đất (Contact Shadow)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
  ctx.beginPath();
  ctx.ellipse(x, y + radius * 0.92, radius * 0.88, radius * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Gradient Cầu 3D Đa tầng (Ambient + Diffuse + Rim Light)
  const grad = ctx.createRadialGradient(
    x - radius * 0.38,
    y - radius * 0.38,
    radius * 0.05,
    x,
    y,
    radius
  );
  grad.addColorStop(0.0, highlightColor);      // Đốm sáng đỉnh cao
  grad.addColorStop(0.2, baseColor);           // Màu nguyên bản rực rỡ
  grad.addColorStop(0.85, darkenColor(baseColor, 0.4)); // Vùng tối chuyển tiếp
  grad.addColorStop(1.0, '#0F172A');           // Vùng khuất sáng sâu

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // 3. Đốm sáng sắc nét (Specular Glint)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.beginPath();
  ctx.arc(x - radius * 0.36, y - radius * 0.36, radius * 0.16, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
```

### 4.2. Hiệu ứng Quầng Sáng Huỳnh Quang (Neon Bloom Shader)
Dành cho các vector lực, tiếp tuyến cực trị, sóng điện từ hoặc chạc sao chép ADN:

```typescript
export function drawGlowingLine(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  strokeColor: string = '#38BDF8',
  glowColor: string = 'rgba(56, 189, 248, 0.45)',
  lineWidth: number = 3.5
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }

  // Lớp 1: Quầng sáng huỳnh quang tỏa rộng (Bloom)
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 14;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Lớp 2: Lõi sáng trắng sắc bén ở giữa (Core Glint)
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = lineWidth * 0.35;
  ctx.stroke();

  ctx.restore();
}
```

---

## 5. ĐỘNG LỰC HỌC CHUYỂN ĐỘNG HỮU CƠ (SPRING DYNAMICS & PARTICLE SYSTEMS)

### 5.1. Bộ Lọc Lò Xo Giảm Chấn (Second-Order Spring Smoothing)
Khi giáo viên kéo thanh trượt trên bảng, giá trị tham số được làm mượt qua giải thuật vật lý lò xo, triệt tiêu hoàn toàn cảm giác giật khựng:

```typescript
export class SpringDamper {
  private current: number;
  private target: number;
  private velocity: number = 0;
  private tension: number;  // Độ căng lò xo
  private friction: number; // Hệ số ma sát giảm chấn

  constructor(initialValue: number, tension: number = 180, friction: number = 14) {
    this.current = initialValue;
    this.target = initialValue;
    this.tension = tension;
    this.friction = friction;
  }

  public setTarget(newTarget: number) {
    this.target = newTarget;
  }

  public update(dt: number = 1 / 60): number {
    const springForce = -this.tension * (this.current - this.target);
    const dampingForce = -this.friction * this.velocity;
    const acceleration = springForce + dampingForce;

    this.velocity += acceleration * dt;
    this.current += this.velocity * dt;
    return this.current;
  }
}
```

### 5.2. Vệt Sáng Huỳnh Quang Lưu Ảnh (Phosphor Trail Fade)
Khi quả cầu bay trong chuyển động ném xiên hoặc con lắc dao động, vệt quỹ đạo không vẽ chết một đường cứng nhắc, mà mờ dần mượt mà theo thời gian:

```typescript
// Thay vì dùng ctx.clearRect() xóa trắng toàn bộ, phủ một lớp bán trong suốt
ctx.fillStyle = 'rgba(15, 23, 42, 0.12)'; // Tối mờ dần để lưu vệt
ctx.fillRect(0, 0, width, height);
```

---

## 6. ĐẶC TẢ CHI TIẾT NÂNG CẤP HÌNH ẢNH CHO 4 ENGINE STEM

---

### 6.1. Toán Học: Đồ Thị Gradient Vũ Trụ & Con Trỏ Beacons

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      NÂNG CẤP ĐỒ HỌA TOÁN HỌC (MATH ENGINE PRO)                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│ • DẢI GRADIENT DIỆN TÍCH TÍCH PHÂN (COSMIC SHADED AREA):                        │
│   Vùng diện tích dưới đường cong ∫ f(x)dx được tô bằng LinearGradient chuyển   │
│   màu từ Lam ngọc (#38BDF8, alpha 0.4) ở trên xuống Tím thẫm (#7C3AED, 0.05)   │
│   ở trục hoành, với các lát cắt Riemann vi phân phát sáng thanh nhã.            │
│ • CON TRỎ THEO DÕI HÀO QUANG (BEACON CURSOR):                                   │
│   Điểm khảo sát x0 di chuyển trên đồ thị có vòng hào quang nhấp nháy (pulsing   │
│   beacon ring); tiếp tuyến xoay mượt mà như chiếc kim la bàn cơ khí tinh xảo.   │
│ • VÒNG TRÒN LƯỢNG GIÁC KỸ THUẬT SỐ:                                             │
│   Vòng tròn kính mờ, các góc đặc biệt (π/6, π/4, π/3) có các chấm phát sáng     │
│   tự động "hút" (magnetic snap) ngón tay giáo viên khi kéo đến gần.             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### 6.2. Vật Lý: Lò Xo Thép Kim Loại 3D & Sóng Nước Caustic

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     NÂNG CẤP ĐỒ HỌA VẬT LÝ (PHYSICS ENGINE PRO)                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│ • LÒ XO THÉP KIM LOẠI 3D (METALLIC BEZIER SPRING):                              │
│   Không vẽ đường ziczac gãy khúc nhọn hoắt. Lò xo được vẽ bằng chuỗi đường cong │
│   Bézier uốn lượn liên tục; mỗi vòng xoắn có gradient kim loại ánh bạc (#E2E8F0 │
│   -> #94A3B8 -> #475569) tạo ảo giác chiều sâu 3D cuộn tròn trong không gian.  │
│ • BỂ SÓNG GIAO THOA QUANG SAI (WATER CAUSTICS RIPPLE TANK):                     │
│   Mặt nước 2 nguồn sóng sử dụng Palette màu nước biển sâu (Deep Ocean Gradient):│
│   Gợn cực đại phát sáng rực rỡ màu lam ngọc (#00F5FF), gợn cực tiểu tối thẫm   │
│   (#020617); các đường Hypebol giao thoa nổi rõ như ảnh chụp thí nghiệm laser.  │
│ • MẠCH ĐIỆN VỚI HẠT ELECTRON PHÁT SÁNG CHUYỂN ĐỘNG:                             │
│   Dây dẫn điện màu xám than sang trọng; các hạt electron màu vàng hổ phách sáng │
│   chói chạy nối đuôi nhau; tốc độ dòng hạt tỉ lệ chính xác với cường độ I.     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### 6.3. Hóa Học: Thủy Tinh Khúc Xạ & Phân Tử Men Gốm VSEPR 3D

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    NÂNG CẤP ĐỒ HỌA HÓA HỌC (CHEMISTRY ENGINE PRO)               │
├─────────────────────────────────────────────────────────────────────────────────┤
│ • ỐNG NGHIỆM VÀ BÌNH TAM GIÁC THỦY TINH KHÚC XẠ:                                │
│   Vỏ ống nghiệm có viền kép phản quang màu xanh băng tuyết (Ice Blue Reflection)│
│   mô phỏng độ dày của thủy tinh borosilicate; mặt khum dung dịch (Meniscus) cong│
│   tự nhiên; bọt khí bay lên có dao động ziczac vật lý và vỡ hạt trên mặt thoáng.│
│ • PHÂN TỬ 3D VSEPR MEN GỐM BÓNG LƯỢNG (GLOSSY CERAMIC BALLS):                   │
│   Nguyên tử Carbon (Đen than bóng #1E293B), Oxi (Đỏ ruby #E11D48), Hydro       │
│   (Trắng ngọc trai #F8FAFC), Nitơ (Lam hoàng gia #1D4ED8). Thanh que nối hình   │
│   trụ có đổ bóng tự thân tạo cảm giác chân thực như mô hình lắp ráp phòng lab. │
│ • PIN ĐIỆN HÓA CÓ DÒNG KHÍ VI MÔ & ĂN MÒN ĐIỆN CỰC:                             │
│   Thanh kim loại Kẽm sần sùi mòn dần theo phản ứng; thanh Đồng đỏ ửng dày lên;  │
│   cầu muối có các ion K+ và NO3- lấp lánh khuếch tán qua hai nhánh.            │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### 6.4. Sinh Học: Cơ Tim Sinh Học Đàn Hồi & ADN Huỳnh Quang Neon

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    NÂNG CẤP ĐỒ HỌA SINH HỌC (BIOLOGY ENGINE PRO)                │
├─────────────────────────────────────────────────────────────────────────────────┤
│ • QUẢ TIM CO BÓP SINH HỌC ĐÀN HỒI (BIO-ELASTIC HEART DEFORMATION):              │
│   Không phải ảnh vẽ hoạt hình trẻ con; quả tim 3D giải phẫu có các ngăn cơ co bóp│
│   theo nhịp sinh lý thực (Tâm nhĩ bóp trước 0.1s -> Tâm thất co mạnh 0.3s tống │
│   máu đỏ tươi vào động mạch chủ -> Dãn chung 0.4s).                             │
│ • CHUỖI XOẮN KÉP ADN HUỲNH QUANG CYBERPUNK:                                     │
│   Khung xương đường - photphat xoắn ốc uốn lượn 3D; 4 loại bazơ nitơ phát màu   │
│   neon phân biệt: Adenine (#F59E0B), Thymine (#38BDF8), Guanine (#10B981),      │
│   Cytosine (#F43F5E); liên kết hydro hiển thị dạng vạch đứt phát sáng lung linh.│
│ • TẾ BÀO HẠT ĐẬU KHÍ KHỔNG ĐÓNG MỞ NHƯ CÁNH HOA:                                │
│   Thành tế bào phía trong dày dặn màu xanh sẫm, thành ngoài mỏng manh màu xanh non;│
│   khi nước thẩm thấu vào, hai tế bào trương căng uốn cong hình vầng trăng mở toang│
│   khe khí khổng, hơi nước bốc lên thành làn mây khói mờ ảo tuyệt đẹp.            │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. MÃ NGUỒN MẪU: THƯ VIỆN ĐỒ HỌA STEM PRO RENDERER

Dưới đây là module mã nguồn TypeScript tiện ích hoàn chỉnh [`StemProRenderer.ts`](file:///c:/Users/Admin/Desktop/AI/Edtech/socratic-monorepo/packages/ui/src/StemProRenderer.ts) tích hợp vào các engine của monorepo:

```typescript
/**
 * packages/ui/src/StemProRenderer.ts
 * Bộ công cụ vẽ đồ họa STEM Chuyên nghiệp 4K Retina, PBR & Glow Effects
 */

export class StemProRenderer {
  /**
   * 1. Vẽ đồ thị hàm số với dải màu Gradient vũ trụ và quầng sáng
   */
  public static drawCosmicFunctionCurve(
    ctx: CanvasRenderingContext2D,
    points: { x: number; y: number }[],
    baselineY: number,
    theme: 'DARK_SLATE' | 'WARM_IVORY' = 'DARK_SLATE'
  ) {
    if (points.length < 2) return;
    ctx.save();

    // a. Tô vùng diện tích dưới đường cong dạng Gradient vũ trụ
    const minX = points[0].x;
    const maxX = points[points.length - 1].x;
    const minY = Math.min(...points.map(p => p.y));

    const areaGrad = ctx.createLinearGradient(0, minY, 0, baselineY);
    if (theme === 'DARK_SLATE') {
      areaGrad.addColorStop(0.0, 'rgba(56, 189, 248, 0.38)'); // Xanh lam ngọc sáng
      areaGrad.addColorStop(0.6, 'rgba(124, 58, 237, 0.15)'); // Tím thẫm chuyển tiếp
      areaGrad.addColorStop(1.0, 'rgba(15, 23, 42, 0.00)');  // Trong suốt tại đáy
    } else {
      areaGrad.addColorStop(0.0, 'rgba(37, 99, 235, 0.28)');
      areaGrad.addColorStop(1.0, 'rgba(37, 99, 235, 0.02)');
    }

    ctx.fillStyle = areaGrad;
    ctx.beginPath();
    ctx.moveTo(minX, baselineY);
    for (const p of points) ctx.lineTo(p.x, p.y);
    ctx.lineTo(maxX, baselineY);
    ctx.closePath();
    ctx.fill();

    // b. Vẽ đường cong chính phát quang huỳnh quang (Glow Stroke)
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.shadowColor = 'rgba(56, 189, 248, 0.65)';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.stroke();

    // c. Lõi sáng trắng mảnh bên trong đường nét
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 2. Vẽ Lò xo xoắn kim loại 3D bằng đường cong Bézier (Thay thế ziczac Python)
   */
  public static drawMetallicSpring3D(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    coils: number = 10,
    radius: number = 14
  ) {
    ctx.save();
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    ctx.translate(x1, y1);
    ctx.rotate(angle);

    const step = dist / coils;
    ctx.lineWidth = 3.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Vẽ từng cuộn xoắn có đổ bóng kim loại đa tầng
    for (let i = 0; i < coils; i++) {
      const cx = i * step + step / 2;
      
      // Cuộn sau (vùng khuất ánh sáng - màu xám đậm)
      ctx.strokeStyle = '#475569';
      ctx.beginPath();
      ctx.bezierCurveTo(i * step, -radius * 0.8, cx, -radius, cx, 0);
      ctx.stroke();

      // Cuộn trước (hướng ra ngoài - ánh thép sáng bóng)
      const metallicGrad = ctx.createLinearGradient(cx, 0, (i + 1) * step, radius);
      metallicGrad.addColorStop(0.0, '#CBD5E1');
      metallicGrad.addColorStop(0.5, '#FFFFFF'); // Điểm phản xạ ánh sáng
      metallicGrad.addColorStop(1.0, '#64748B');

      ctx.strokeStyle = metallicGrad;
      ctx.beginPath();
      ctx.bezierCurveTo(cx, 0, cx, radius, (i + 1) * step, radius * 0.8);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * 3. Vẽ Huy hiệu Thông số Kính mờ (Glassmorphism Pill Badge)
   */
  public static drawGlassBadge(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    accentColor: string = '#D97706'
  ) {
    ctx.save();
    ctx.font = 'bold 12px "Inter", "Aptos", sans-serif';
    const textMetrics = ctx.measureText(text);
    const paddingX = 14;
    const height = 28;
    const width = textMetrics.width + paddingX * 2 + 12;

    // Nền kính mờ bán trong suốt
    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.9)';
    ctx.lineWidth = 1.2;
    ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    ctx.beginPath();
    ctx.roundRect(x, y - height / 2, width, height, height / 2);
    ctx.fill();
    ctx.stroke();

    // Chấm đèn tín hiệu phát quang
    ctx.shadowBlur = 6;
    ctx.shadowColor = accentColor;
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(x + 12, y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Chữ số hiển thị sắc nét
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0F172A';
    ctx.fillText(text, x + 24, y + 4);

    ctx.restore();
  }
}
```

---

## 8. KẾT LUẬN

Sự khác biệt giữa một sản phẩm **"học sinh/sinh viên làm thử nghiệm"** và một **"Hệ thống EdTech Đẳng cấp Quốc gia được vinh danh tại Ngày hội Nhà giáo Sáng tạo 2026"** nằm chính ở **Đẳng cấp hoàn thiện hình ảnh (Visual Fidelity)**:
- Không vẽ những đường kẻ 1px răng cưa khô khan của Python.
- Biến mọi chiếc bảng thông minh thành một **Phòng Thí nghiệm Khoa học Nghệ thuật Đương đại**: Dải màu vũ trụ lung linh, ánh sáng phản chiếu chân thực, lò xo kim loại uốn lượn, phân tử men gốm 3D lấp lánh và vệt sao băng chuyển động mượt mà ở 60 FPS.
- Đây chính là vũ khí tối thượng **thu hút trọn vẹn ánh nhìn của học sinh**, biến những tiết học khô khan nhất thành trải nghiệm khám phá khoa học say mê và đáng nhớ!
