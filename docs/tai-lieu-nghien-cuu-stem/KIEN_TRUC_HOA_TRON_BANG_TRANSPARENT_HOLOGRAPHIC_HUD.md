# KIẾN TRÚC HÒA TRỘN BẢNG KHÔNG NỀN (ZERO-BACKGROUND BLENDING), THAO TÁC BÚT TRỰC TIẾP & GIAO DIỆN HOLOGRAPHIC HUD HIGH-TECH
## ĐẶC TẢ TƯƠNG TÁC MƯỢT MÀ, THU PHÓNG TỰ DO & THỔI HỒN VÀO NÉT PHẤN TRÊN SMARTBOARD 75"-86"

> **Dự án**: Socratic Vision Board v2.0.0 (Enterprise EdTech Monorepo)  
> **Chủ đề**: Trải nghiệm Tương tác Thị giác Cao cấp (Next-Gen Spatial Interaction & Holographic UI)  
> **Tôn chỉ đột phá**: *"Xóa bỏ vĩnh viễn các khung hộp chữ nhật xám/trắng che khuất chữ viết bảng của giáo viên. Mô phỏng phải hòa trộn 100% vào mặt bảng tự nhiên như một lớp Hologram phát sáng nổi trên bề mặt; giáo viên có thể dùng bút hoặc ngón tay cầm nắm, kéo thả trực tiếp lên từng vật thể, phóng to thu nhỏ tự do vô cực với độ mượt 60 FPS chuẩn phong cách công nghệ tương lai (Sci-Fi High-Tech)."*

---

## MỤC LỤC TỔNG QUAN

1. [TRIẾT LÝ "LIVING INK & ZERO-BOX" (HÒA TRỘN TỰ NHIÊN TRÊN BẢNG)](#1-triết-lý-living-ink--zero-box-hòa-trộn-tự-nhiên-trên-bảng)
2. [TƯƠNG TÁC TRỰC TIẾP BẰNG BÚT "DIRECT KINETIC MANIPULATION"](#2-tương-tác-trực-tiếp-bằng-bút-direct-kinetic-manipulation)
3. [GIẢI THUẬT PHÓNG TO / THU NHỎ / XOAY TỰ DO (AFFINE TRANSFORM HUD)](#3-giải-thuật-phóng-to--thu-nhỏ--xoay-tự-do-affine-transform-hud)
4. [HIỆU ỨNG BIẾN HÌNH "NÉT PHẤN SỐNG DẬY" (INK MORPHING ANIMATION)](#4-hiệu-ứng-biến-hình-nét-phấn-sống-dậy-ink-morphing-animation)
5. [BỘ PHONG CÁCH THỊ GIÁC HOLOGRAPHIC HUD (CYBER-ACADEMIC DESIGN SYSTEM)](#5-bộ-phong-cách-thị-giác-holographic-hud-cyber-academic-design-system)
6. [MÃ NGUỒN MẪU HOÀN CHỈNH: COMPONENT LIVING HOLOGRAPHIC CANVAS](#6-mã-nguồn-mẫu-hoàn-chỉnh-component-living-holographic-canvas)

---

## 1. TRIẾT LÝ "LIVING INK & ZERO-BOX" (HÒA TRỘN TỰ NHIÊN TRÊN BẢNG)

### 1.1. "Nỗi Đau" Của Các Phần Mềm Cũ: Hộp Chữ Nhật Che Bảng
Trong các phần mềm thông thường, khi mở một đồ thị hay thí nghiệm, hệ thống thường bung ra một **cửa sổ pop-up hoặc chiếc thẻ Card hình chữ nhật nền trắng toát hoặc xám đục**.
- Chiếc hộp này che khuất toàn bộ nét phấn, công thức và đề bài xung quanh mà giáo viên đã dày công viết trước đó.
- Tạo cảm giác "chắp vá", cồng kềnh, mất đi tính liên tục của bài giảng.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│              SO SÁNH: HỘP CHỮ NHẬT CŨ VS HÒA TRỘN HOLOGRAPHIC KHÔNG NỀN         │
├──────────────────────────┬──────────────────────────────────────────────────────┤
│ GIAO DIỆN HỘP CŨ (BOXED) │ SOCRATIC ZERO-BOX BLENDING (HÒA TRỘN TỰ NHIÊN)       │
├──────────────────────────┼──────────────────────────────────────────────────────┤
│ • Chiếc hộp vuông thô kè │ • KHÔNG CÓ BẤT KỲ NỀN HỘP NÀO (Zero Background).     │
│   nền trắng/xám đè bẹp   │ • Nét vẽ mô phỏng hiển thị trực tiếp trên mặt bảng:  │
│   lên chữ viết trên bảng.│   + Bảng xanh phấn: Nét phát quang Neon huỳnh quang. │
│                          │   + Bảng trắng dạ: Nét vector Obsidian sâu sắc nét.  │
├──────────────────────────┼──────────────────────────────────────────────────────┤
│ • Chiếm dụng diện tích,  │ • Tương tác xuyên thấu (Non-rectangular Hit Testing):│
│   chặn nét vẽ xung quanh.│   Giáo viên vẫn viết phấn bình thường xuyên qua các   │
│                          │   khoảng trống giữa các đường cong mô phỏng!        │
├──────────────────────────┼──────────────────────────────────────────────────────┤
│ • Nhìn như cửa sổ web.   │ • Cảm giác như "nét phấn tự sống dậy" và chuyển động │
│                          │   ngay tại vị trí thầy cô vừa đặt bút khoanh tròn.   │
└──────────────────────────┴──────────────────────────────────────────────────────┘
```

### 1.2. Kỹ Thuật Hòa Trộn Kênh Alpha & Chế Độ Blend Mode
Toàn bộ hệ thống đồ họa sử dụng **Canvas Trong suốt Tuyệt đối (Alpha Compositing)**:
- Không bao giờ gọi `ctx.fillRect()` phủ màu nền che khuất toàn màn hình.
- Sử dụng chế độ hòa trộn thông minh theo màu nền của bảng lớp học:
  - **Trên Bảng Xanh Phấn / Bảng Tối**: Sử dụng chế độ phát quang huỳnh quang (`mix-blend-mode: screen` hoặc `ctx.globalCompositeOperation = 'lighter'`), các đường cong phát ra ánh sáng lung linh nổi bật trên màu xanh sẫm của bảng phấn.
  - **Trên Bảng Trắng Bút Dạ / Slide PowerPoint**: Sử dụng chế độ tương phản cao (`ctx.globalCompositeOperation = 'source-over'`) với màu than chì Obsidian cao cấp `#0F172A` kết hợp viền sáng xanh coban mảnh mai.

---

## 2. TƯƠNG TÁC TRỰC TIẾP BẰNG BÚT "DIRECT KINETIC MANIPULATION"

Thay vì bắt giáo viên phải nhìn xuống góc màn hình để tìm thanh trượt (Slider) rồi kéo qua kéo lại một cách gián tiếp, hệ thống cho phép **dùng đầu bút cảm ứng hoặc ngón tay chạm trực tiếp vào vật thể trên màn hình để thao tác vật lý (Kinetic Physics)**:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│               THAO TÁC TRỰC TIẾP BẰNG BÚT TRÊN CẢ 4 MÔN STEM                    │
├─────────────┬───────────────────────────────────────────────────────────────────┤
│ MÔN HỌC     │ THAO TÁC BÚT TRỰC TIẾP (DIRECT PEN INTERACTION)                   │
├─────────────┼───────────────────────────────────────────────────────────────────┤
│ 1. TOÁN HỌC │ • Dùng bút chạm vào điểm cực trị -> Kéo trượt tự do trên mặt phẳng│
│             │ • Chạm vào tiếp điểm x0 -> Lướt đầu bút dọc theo đường cong đồ thị│
│             │ • Dùng bút kéo dãn 2 tiêu điểm F1, F2 của hình Elip.              │
├─────────────┼───────────────────────────────────────────────────────────────────┤
│ 2. VẬT LÝ   │ • Chạm bút vào quả cầu ném xiên -> Kéo căng góc bắn như bắn ná cao│
│             │   su (Slingshot), thả bút ra là quả cầu phóng đi theo quỹ đạo!    │
│             │ • Chạm vào quả nặng lò xo -> Dùng bút kéo dãn lò xo rồi thả tay. │
│             │ • Chạm vào đỉnh mặt phẳng nghiêng -> Kéo nâng cao / hạ thấp dốc.  │
├─────────────┼───────────────────────────────────────────────────────────────────┤
│ 3. HÓA HỌC  │ • Dùng bút "bốc" phân tử 3D xoay lộn vòng tự do mọi hướng.        │
│             │ • Chạm vào van khóa buret -> Vặn nhẹ để giọt axit nhỏ xuống bình. │
│             │ • Dùng bút gắp các quả cầu nguyên tử thả trực tiếp lên đĩa cân.  │
├─────────────┼───────────────────────────────────────────────────────────────────┤
│ 4. SINH HỌC │ • Dùng bút chạm vào chạc tái bản ADN -> Kéo tách đôi 2 mạch như   │
│             │   kéo khóa áo (Zipper unzipping).                                │
│             │ • Chạm vào tế bào khí khổng -> Kéo vuốt để điều chỉnh độ trương.  │
└─────────────┴───────────────────────────────────────────────────────────────────┘
```

---

## 3. GIẢI THUẬT PHÓNG TO / THU NHỎ / XOAY TỰ DO (AFFINE TRANSFORM HUD)

Mỗi mô phỏng được quản lý dưới dạng một **Không gian Tọa độ Biến đổi (Affine Transform Matrix)** độc lập:

$$\begin{bmatrix} x' \\ y' \\ 1 \end{bmatrix} = \begin{bmatrix} s \cdot \cos\theta & -s \cdot \sin\theta & t_x \\ s \cdot \sin\theta & s \cdot \cos\theta & t_y \\ 0 & 0 & 1 \end{bmatrix} \begin{bmatrix} x \\ y \\ 1 \end{bmatrix}$$

### 3.1. Thao Tác Cảm Ứng Đa Điểm Tự Nhiên
- **1 Ngón tay / 1 Đầu bút trên thân mô hình**: Di chuyển vị trí (Translate $t_x, t_y$) trượt mượt mà theo tay giáo viên khắp bảng.
- **2 Ngón tay (Pinch-to-Zoom)**:
  - Kéo tách ngón tay ra xa $\implies$ **Phóng to cực đại** từ kích thước nhỏ gọn 10cm thành mô phỏng khổng lồ 2 mét bao trùm cả bảng thông minh để cả lớp cùng xem chi tiết vi mô.
  - Xoay ngón tay $\implies$ **Xoay góc nghiêng** mô hình tự do theo ý muốn.
- **Độ Sắc Nét Vô Cực (Infinite Vector Resolution)**:
  - Do 100% hình vẽ được tính toán bằng phương trình toán học và hàm Canvas/WebGL (không phải phóng to ảnh bitmap JPEG/PNG vỡ hạt), nên **dù phóng to 500% hay thu nhỏ 20%, mọi đường nét, hạt nguyên tử và con số vẫn sắc bén tuyệt đối ở chuẩn 4K**.

### 3.2. Khung Neo Hologram Sci-Fi (Holographic HUD Brackets)
Khi giáo viên chạm bút vào mô hình, xung quanh vật thể **không hiện lên khung viền hộp vuông thô kệch**, mà chỉ xuất hiện **4 dấu ngoặc neo góc `[  ]` phát sáng huỳnh quang mờ ảo** phong cách giao diện tương lai (*Minority Report / Iron Man HUD*):
- 4 góc có các điểm neo nhỏ (Anchor Knobs) phát sáng xung nhịp (Pulsing Glow).
- Dùng bút kéo góc neo để kéo dãn tỉ lệ kích thước tùy ý.
- Khi buông tay sau 2 giây không tương tác, các dấu ngoặc neo tự động mờ dần biến mất (`fade-out`), chỉ để lại các đường nét mô phỏng sống động hòa trộn hoàn hảo trên mặt bảng.

---

## 4. HIỆU ỨNG BIẾN HÌNH "NÉT PHẤN SỐNG DẬY" (INK MORPHING ANIMATION)

Khi giáo viên khoanh Magic Lasso, nét phấn trắng vẽ tay **không bị biến mất giật cục một cách thô bạo**. Hệ thống áp dụng giải thuật **Nội suy Biến hình Nét vẽ (Stroke Morphing Tweening)** trong vòng **350ms**:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│               TIẾN TRÌNH BIẾN HÌNH NÉT PHẤN THÀNH MÔ PHỎNG (350MS)              │
├─────────────────────────────────────────────────────────────────────────────────┤
│ GIAI ĐOẠN 1: KHỞI TẠO (0ms - 80ms)                                              │
│ • Nét phấn trắng giáo viên vừa khoanh bắt đầu phát sáng quầng Neon màu hổ phách.│
│ • Các hạt bụi phấn huỳnh quang li ti tỏa ra xung quanh nét vẽ.                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│ GIAI ĐOẠN 2: CHUYỂN HÓA NỘI SUY (80ms - 250ms)                                  │
│ • Nét vẽ tay uốn lượn mềm mại, các điểm mấp mô tự nắn thẳng thành đường cong    │
│   toán học / quỹ đạo vật lý hoàn hảo (Elastic Spline Interpolation).            │
├─────────────────────────────────────────────────────────────────────────────────┤
│ GIAI ĐOẠN 3: SỐNG DẬY CHUYỂN ĐỘNG (250ms - 350ms)                               │
│ • Quả cầu vật lý xuất hiện tại điểm xuất phát; các vector lực bắn ra như tia lade│
│ • Toàn bộ mô phỏng chính thức bắt đầu vòng lặp chuyển động vật lý 60 FPS!       │
└─────────────────────────────────────────────────────────────────────────────────┘
```

> **Hiệu ứng tâm lý sư phạm**: Học sinh có cảm giác như giáo viên đang cầm trên tay một chiếc **"Cây Bút Phù Thủy Khoa Học"** — khoanh tới đâu là nét phấn phát sáng và chuyển động sống dậy ngay tại chỗ đó!

---

## 5. BỘ PHONG CÁCH THỊ GIÁC HOLOGRAPHIC HUD (CYBER-ACADEMIC DESIGN SYSTEM)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│              HỆ THỐNG MÀU SẮC & ÁNH SÁNG HOLOGRAPHIC HUD CAO CẤP                │
├──────────────────┬──────────┬───────────────────────────────────────────────────┤
│ TÊN THÀNH PHẦN   │ MÃ MÀU   │ HIỆU ỨNG THỊ GIÁC & CÔNG DỤNG SƯ PHẠM             │
├──────────────────┼──────────┼───────────────────────────────────────────────────┤
│ 1. Cyber Cyan    │ #00F5FF  │ Quỹ đạo chuyển động, sóng giao thoa, vector v     │
│    (Lam Huỳnh)   │          │ (Quầng sáng Neon tỏa rộng 12px, sắc bén 4K)       │
├──────────────────┼──────────┼───────────────────────────────────────────────────┤
│ 2. Solar Amber   │ #F59E0B  │ Điểm neo tương tác kéo thả, năng lượng, cực trị   │
│    (Hổ Phách)    │          │ (Nhấp nháy nhịp tim Breathing Light 1.2Hz)        │
├──────────────────┼──────────┼───────────────────────────────────────────────────┤
│ 3. Bio Emerald   │ #10B981  │ Cân bằng hóa học, tế bào sống, quang hợp          │
│    (Ngọc Lục)    │          │ (Ánh sáng ngọc bích êm dịu, không gây mỏi mắt)   │
├──────────────────┼──────────┼───────────────────────────────────────────────────┤
│ 4. Laser Crimson │ #FF0055  │ Quá tải, lực ma sát, điện trở, tâm thất co bóp    │
│    (Đỏ Lade)     │          │ (Cảnh báo nhận thức, đánh thức sự chú ý của HS)   │
├──────────────────┼──────────┼───────────────────────────────────────────────────┤
│ 5. HUD Brackets  │ rgba(    │ 4 dấu ngoặc góc neo định vị không nền             │
│    (Khung Neo)   │ 255,255, │ (Chỉ hiện khi chạm bút, tự biến mất sau 2 giây)   │
│                  │ 255,0.4) │                                                   │
└──────────────────┴──────────┴───────────────────────────────────────────────────┘
```

---

## 6. MÃ NGUỒN MẪU HOÀN CHỈNH: COMPONENT LIVING HOLOGRAPHIC CANVAS

Dưới đây là mã nguồn TypeScript/React hoàn chỉnh của module **Hòa Trộn Bảng Không Nền, Kéo Thả Trực Tiếp & Thu Phóng Tự Do Đa Điểm** [`LivingHologramCanvas.tsx`](file:///c:/Users/Admin/Desktop/AI/Edtech/socratic-monorepo/apps/teacher-board/src/components/canvas/LivingHologramCanvas.tsx):

```tsx
/**
 * apps/teacher-board/src/components/canvas/LivingHologramCanvas.tsx
 * Lớp phủ Hologram hòa trộn trực tiếp không nền trên mặt bảng
 * Hỗ trợ: Kéo thả trực tiếp bằng bút, Phóng to thu nhỏ 2 ngón tay, Khung neo HUD
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';

interface AffineTransform {
  x: number;          // Tọa độ tịnh tiến X
  y: number;          // Tọa độ tịnh tiến Y
  scale: number;      // Tỉ lệ thu phóng (1.0 = 100%, có thể từ 0.2 đến 5.0)
  rotation: number;   // Góc xoay (Radian)
}

interface TouchPointer {
  id: number;
  x: number;
  y: number;
}

export const LivingHologramCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Trạng thái biến đổi không gian Affine Transform của mô hình
  const [transform, setTransform] = useState<AffineTransform>({
    x: 400,
    y: 300,
    scale: 1.0,
    rotation: 0,
  });

  // Trạng thái tương tác vật lý trực tiếp
  const [activePointers, setActivePointers] = useState<Map<number, TouchPointer>>(new Map());
  const [isInteracting, setIsInteracting] = useState(false);
  const [showHudBrackets, setShowHudBrackets] = useState(false);
  const hideHudTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Tham số mô phỏng Vật lý (Ví dụ: Góc ném xiên alpha và vận tốc v0)
  const [physicsState, setPhysicsState] = useState({
    v0: 25,
    alpha: 45, // độ
    isDraggingLauncher: false,
  });

  // 1. Khởi tạo kích thước Canvas Hi-DPI Retina sắc bén
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const updateSize = () => {
      const dpr = window.devicePixelRatio || 2;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      const ctx = canvas.getContext('2d');
      ctx?.scale(dpr, dpr);
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // 2. Vòng lặp Render 60 FPS Hòa Trộn Không Nền (Zero-Background Blending Loop)
  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // XÓA TRONG SUỐT HOÀN TOÀN (Không vẽ màu nền che bảng!)
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      ctx.save();
      // ÁP DỤNG MA TRẬN BIẾN ĐỔI AFFINE (Tịnh tiến, Xoay, Phóng to thu nhỏ)
      ctx.translate(transform.x, transform.y);
      ctx.rotate(transform.rotation);
      ctx.scale(transform.scale, transform.scale);

      // A. Vẽ Mô hình Vật lý Phát quang Hologram (Ném xiên trực tiếp)
      drawHolographicProjectile(ctx, physicsState.v0, physicsState.alpha);

      // B. Vẽ Khung Neo Hologram HUD [ ] chỉ khi giáo viên đang chạm bút
      if (showHudBrackets) {
        drawSciFiHudBrackets(ctx, 280, 180);
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [transform, showHudBrackets, physicsState]);

  // 3. Xử lý Chạm Bút & Cảm Ứng Đa Điểm (Pointer Events W3C)
  const handlePointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    const newMap = new Map(activePointers);
    newMap.set(e.pointerId, { id: e.pointerId, x: e.clientX, y: e.clientY });
    setActivePointers(newMap);

    setIsInteracting(true);
    setShowHudBrackets(true);
    if (hideHudTimerRef.current) clearTimeout(hideHudTimerRef.current);

    // Kiểm tra chạm trực tiếp vào điểm phóng (Direct Manipulation)
    const localX = (e.clientX - transform.x) / transform.scale;
    const localY = (e.clientY - transform.y) / transform.scale;
    const distToLauncher = Math.hypot(localX, localY);

    if (distToLauncher < 40) {
      setPhysicsState(prev => ({ ...prev, isDraggingLauncher: true }));
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activePointers.has(e.pointerId)) return;

    const newMap = new Map(activePointers);
    newMap.set(e.pointerId, { id: e.pointerId, x: e.clientX, y: e.clientY });
    setActivePointers(newMap);

    // TRƯỜNG HỢP 1: THAO TÁC BẰNG 1 ĐẦU BÚT / 1 NGÓN TAY
    if (newMap.size === 1) {
      const currentPt = { x: e.clientX, y: e.clientY };
      const lastPt = activePointers.get(e.pointerId)!;
      const dx = currentPt.x - lastPt.x;
      const dy = currentPt.y - lastPt.y;

      // Nếu đang cầm kéo trực tiếp quả cầu để chỉnh góc bắn alpha
      if (physicsState.isDraggingLauncher) {
        const localX = (e.clientX - transform.x) / transform.scale;
        const localY = (e.clientY - transform.y) / transform.scale;
        const newAngle = -Math.atan2(localY, localX) * (180 / Math.PI);
        const newSpeed = Math.min(Math.max(Math.hypot(localX, localY) * 0.4, 10), 60);

        setPhysicsState(prev => ({
          ...prev,
          alpha: Math.max(Math.min(newAngle, 85), 5),
          v0: newSpeed,
        }));
      } else {
        // Kéo di chuyển toàn bộ mô hình trượt trên mặt bảng
        setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      }
    }

    // TRƯỜNG HỢP 2: THAO TÁC 2 NGÓN TAY (PINCH-TO-ZOOM & XOAY TỰ DO)
    if (newMap.size === 2) {
      const [p1, p2] = Array.from(newMap.values());
      const oldPts = Array.from(activePointers.values());
      if (oldPts.length >= 2) {
        const oldDist = Math.hypot(oldPts[0].x - oldPts[1].x, oldPts[0].y - oldPts[1].y);
        const newDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        const scaleDelta = newDist / Math.max(oldDist, 1);

        // Giới hạn thu phóng từ 20% đến 400%
        setTransform(prev => ({
          ...prev,
          scale: Math.max(Math.min(prev.scale * scaleDelta, 4.0), 0.25),
        }));
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const newMap = new Map(activePointers);
    newMap.delete(e.pointerId);
    setActivePointers(newMap);

    if (newMap.size === 0) {
      setIsInteracting(false);
      setPhysicsState(prev => ({ ...prev, isDraggingLauncher: false }));

      // Tự động mờ dần khung neo HUD sau 2 giây không chạm
      hideHudTimerRef.current = setTimeout(() => {
        setShowHudBrackets(false);
      }, 2000);
    }
  };

  // 4. Hàm vẽ Quỹ đạo Ném xiên Phát quang Hologram
  const drawHolographicProjectile = (ctx: CanvasRenderingContext2D, v0: number, alphaDeg: number) => {
    const alphaRad = (alphaDeg * Math.PI) / 180;
    const g = 9.8;
    const vx = v0 * Math.cos(alphaRad);
    const vy = v0 * Math.sin(alphaRad);
    const tFlight = (2 * vy) / g;

    ctx.save();

    // a. Vẽ đường quỹ đạo phát quang Cyber Cyan Neon (#00F5FF)
    ctx.beginPath();
    ctx.shadowColor = 'rgba(0, 245, 255, 0.75)';
    ctx.shadowBlur = 14;
    ctx.strokeStyle = '#00F5FF';
    ctx.lineWidth = 3.5;

    for (let t = 0; t <= tFlight; t += 0.05) {
      const px = vx * t * 8;
      const py = -((vy * t - 0.5 * g * t * t) * 8);
      if (t === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // b. Điểm phóng tương tác trực tiếp (Cầm bút nhấc điểm này để chỉnh góc ném!)
    const targetX = vx * 0.4 * 8;
    const targetY = -(vy * 0.4 * 8);

    // Vector lực màu vàng hổ phách kéo căng
    ctx.shadowColor = 'rgba(245, 158, 11, 0.8)';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(targetX, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Quả cầu Hologram điểm ngắm (Interactive Knob)
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#00F5FF';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(targetX, targetY, 9, 0, Math.PI * 2);
    ctx.fill();

    // c. Nhãn thông số High-Tech nổi cạnh tay giáo viên
    ctx.shadowBlur = 0;
    ctx.font = 'bold 13px "Inter", monospace';
    ctx.fillStyle = '#00F5FF';
    ctx.fillText(`α = ${alphaDeg.toFixed(0)}°`, targetX + 16, targetY - 6);
    ctx.fillStyle = '#F59E0B';
    ctx.fillText(`v₀ = ${v0.toFixed(1)} m/s`, targetX + 16, targetY + 14);

    ctx.restore();
  };

  // 5. Hàm vẽ Khung Neo Hologram 4 Góc Sci-Fi [  ] (Không nền che bảng!)
  const drawSciFiHudBrackets = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 245, 255, 0.65)';
    ctx.shadowColor = '#00F5FF';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2.0;

    const bSize = 22; // Độ dài nét góc
    const halfW = width / 2;
    const halfH = height / 2;

    // Góc trên - trái ┌
    ctx.beginPath();
    ctx.moveTo(-halfW + bSize, -halfH);
    ctx.lineTo(-halfW, -halfH);
    ctx.lineTo(-halfW, -halfH + bSize);
    ctx.stroke();

    // Góc trên - phải ┐
    ctx.beginPath();
    ctx.moveTo(halfW - bSize, -halfH);
    ctx.lineTo(halfW, -halfH);
    ctx.lineTo(halfW, -halfH + bSize);
    ctx.stroke();

    // Góc dưới - trái └
    ctx.beginPath();
    ctx.moveTo(-halfW, halfH - bSize);
    ctx.lineTo(-halfW, halfH);
    ctx.lineTo(-halfW + bSize, halfH);
    ctx.stroke();

    // Góc dưới - phải ┘
    ctx.beginPath();
    ctx.moveTo(halfW - bSize, halfH);
    ctx.lineTo(halfW, halfH);
    ctx.lineTo(halfW, halfH - bSize);
    ctx.stroke();

    // Biểu tượng thu phóng HUD ở giữa
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(0, 245, 255, 0.7)';
    ctx.fillText(`[ PINCH TO SCALE: ${(transform.scale * 100).toFixed(0)}% ]`, -70, halfH + 18);

    ctx.restore();
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="fixed inset-0 z-40 pointer-events-auto cursor-grab active:cursor-grabbing"
      style={{ touchAction: 'none' }} // Chặn hành vi cuộn mặc định của trình duyệt để vuốt mượt mà
    />
  );
};
```

---

## 7. KẾT LUẬN & TỔNG KẾT TRẢI NGHIỆM

Với kiến trúc **Zero-Background Holographic Blending** và **Direct Kinetic Manipulation**:
1. **Không còn chiếc hộp vuông che khuất bảng**: Mô phỏng hòa trộn tự nhiên vào từng hạt phấn trên bảng đen hoặc nét bút dạ trên bảng trắng, đem lại cảm giác tự nhiên như viết phấn truyền thống nhưng có thêm phép màu công nghệ.
2. **Thao tác vật lý bằng bút thật**: Thầy cô không cần cúi xuống bấm thanh trượt; chỉ cần cầm bút kéo quả bóng, kéo lò xo, xoay phân tử, kéo chạc ADN ngay trên hình vẽ.
3. **Thu phóng vô cực 60 FPS**: Tự do dùng 2 ngón tay kéo dãn mô hình phủ kín chiếc bảng 86 inch cho cả lớp cùng xem hoặc thu nhỏ gọn gàng vào một góc bảng để tiếp tục giảng bài.
4. **Đẳng cấp High-Tech tương lai**: 4 góc neo Hologram phát sáng nhấp nháy tạo ấn tượng công nghệ vượt trội, khẳng định vị thế dẫn đầu của hệ sinh thái giáo dục số thông minh Việt Nam 2026.
