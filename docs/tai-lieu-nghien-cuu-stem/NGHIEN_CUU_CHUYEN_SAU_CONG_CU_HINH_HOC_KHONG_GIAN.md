# NGHIÊN CỨU CHUYÊN SÂU CÁC CÔNG CỤ VẼ HÌNH HỌC VÀ MÔ PHỎNG HÌNH HỌC KHÔNG GIAN HIỆN NAY
## PHÂN TÍCH TÍNH NĂNG, KIẾN TRÚC THUẬT TOÁN, SO SÁNH ĐỐI ĐẦU VÀ ĐỊNH HƯỚNG CÔNG NGHỆ CHO EDTECH THẾ HỆ MỚI

> **Mã tài liệu**: STEM-3D-GEOMETRY-RESEARCH-2026  
> **Chủ đề**: Khảo sát toàn diện hệ sinh thái công cụ vẽ hình học (Dynamic Geometry Systems, TeX/Publishing, WebGL/3D Engines, Math Animation & Smartboard AI Canvas)  
> **Trọng tâm đặc biệt**: **Hình học Không gian (Solid & Spatial Geometry)** — giải quyết triệt để các bài toán nét khuất/nét đứt, cắt thiết diện, trải hình, phối cảnh chiếu và trực quan hóa tương tác 60 FPS trên Web/Bảng thông minh.

---

## MỤC LỤC TỔNG QUAN

1. [BẢN ĐỒ PHÂN LOẠI CÁC NHÓM CÔNG CỤ HIỆN NAY](#1-bản-đồ-phân-loại-các-nhóm-công-cụ-hiện-nay)
2. [BÓC TÁCH CHI TIẾT TỪNG CÔNG CỤ TIÊU BIỂU](#2-bóc-tách-chi-tiết-từng-công-cụ-tiêu-biểu)
   - 2.1. Nhóm DGS Sư phạm: GeoGebra 3D, Cabri 3D, Desmos 3D, CalcPlot3D
   - 2.2. Nhóm Soạn thảo Văn bản & Xuất bản Khoa học: TikZ-3dplot, Asymptote, PSTricks
   - 2.3. Nhóm Hoạt họa Sư phạm (Math Animation): Manim (3Blue1Brown) & ManimGL
   - 2.4. Nhóm Framework Đồ họa Lập trình Web: Three.js / R3F, Babylon.js, MathBox
   - 2.5. Nhóm CAD & Dựng hình Công nghiệp: Blender, SketchUp, FreeCAD
   - 2.6. Nhóm Bảng tương tác & Nhận diện Nét vẽ (Sketch-to-3D Canvas)
3. [CÁC THÁCH THỨC KỸ THUẬT ĐẶC THÙ CỦA HÌNH HỌC KHÔNG GIAN](#3-các-thách-thức-kỹ-thuật-đặc-thù-của-hình-học-không-gian)
   - 3.1. Bài toán Nét đứt / Nét khuất (Hidden Line Rendering vs. Hidden Line Removal)
   - 3.2. Bài toán Cắt thiết diện khối đa diện (Cross-Section & Slicing Planes)
   - 3.3. Bài toán Phép chiếu & Phối cảnh (Orthographic, Axonometric vs. Perspective)
   - 3.4. Bài toán Trải phẳng khối đa diện (Polyhedral Net Unfolding)
   - 3.5. Thao tác 3D trên màn hình 2D (Raycasting, Depth Snapping & Working Planes)
4. [BẢNG MA TRẬN SO SÁNH ĐỐI ĐẦU TOÀN DIỆN (BENCHMARK MATRIX)](#4-bảng-ma-trận-so-sánh-đối-đầu-toàn-diện-benchmark-matrix)
5. [ĐỀ XUẤT KIẾN TRÚC KỸ THUẬT CHO EDTECH & SMARTBOARD (SOCRATIC VISION BOARD)](#5-đề-xuất-kiến-trúc-kỹ-thuật-cho-edtech--smartboard-socratic-vision-board)

---

## 1. BẢN ĐỒ PHÂN LOẠI CÁC NHÓM CÔNG CỤ HIỆN NAY

Trong kỷ nguyên số, các công cụ vẽ hình học toán học được phân hóa rõ nét thành 5 nhóm sinh thái phục vụ các mục đích khác nhau:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                       HỆ SINH THÁI CÁC CÔNG CỤ VẼ HÌNH HỌC HIỆN NAY                         │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
                                                │
         ┌───────────────────────┬──────────────┴──────────────┬────────────────────────┐
         ▼                       ▼                             ▼                        ▼
┌──────────────────┐   ┌──────────────────┐          ┌──────────────────┐     ┌──────────────────┐
│  1. DGS SƯ PHẠM  │   │  2. XUẤT BẢN TEX │          │  3. HOẠT HỌA AI  │     │ 4. WEBGL ENGINE  │
│ (Dynamic Geom)   │   │ (Scientific Pub) │          │ (Math Animation) │     │ (EdTech In-App)  │
├──────────────────┤   ├──────────────────┤          ├──────────────────┤     ├──────────────────┤
│ • GeoGebra 3D    │   │ • TikZ / 3dplot  │          │ • Manim (3B1B)   │     │ • Three.js / R3F │
│ • Cabri 3D       │   │ • Asymptote      │          │ • ManimGL        │     │ • Babylon.js     │
│ • Desmos 3D      │   │ • PSTricks       │          │ • Blender Nodes  │     │ • MathBox        │
│ • CalcPlot3D     │   │                  │          │                  │     │ • CSG Manifold   │
└──────────────────┘   └──────────────────┘          └──────────────────┘     └──────────────────┘
```

Mỗi nhóm giải quyết một khía cạnh trọng tâm:
1. **DGS (Dynamic Geometry Systems)**: Tập trung vào tính tương tác trực quan thời gian thực (kéo rê chuột/chạm tay, giữ nguyên các ràng buộc hình học như song song, vuông góc, thuộc mặt phẳng).
2. **TeX & Scientific Publishing**: Tập trung vào độ chính xác tuyệt đối ở cấp độ in ấn (publication-quality), chuẩn hóa quy chuẩn giáo dục (nét đứt, ký hiệu góc, nhãn công thức LaTeX).
3. **Math Animation**: Tập trung vào kể chuyện toán học bằng hình ảnh chuyển động mượt mà (chuyển động của camera, biến đổi hình thái từ 2D sang 3D).
4. **WebGL / Canvas Engines**: Cung cấp nền tảng mã nguồn mở để các lập trình viên EdTech nhúng trực tiếp không gian 3D tương tác vào ứng dụng Web, Tablet và Bảng thông minh.

---

## 2. BÓC TÁCH CHI TIẾT TỪNG CÔNG CỤ TIÊU BIỂU

### 2.1. Nhóm DGS Sư phạm (Interactive Dynamic Geometry)

#### A. GeoGebra 3D (Tiêu chuẩn vàng trong giáo dục phổ thông toàn cầu)
GeoGebra 3D (trong bộ GeoGebra Suite / Classic 5 & 6) là phần mềm hình học động phổ biến nhất thế giới hiện nay, kết hợp giữa Đại số, Hình học và Giải tích.

*   **Kiến trúc tính toán cốt lõi**:
    - **Engine đồ họa**: Sử dụng JOGL (trên bản Java Desktop Classic 5) và WebGL/Three.js tùy biến (trên bản Web & App Classic 6).
    - **Hệ thống giải ràng buộc hình học (Constraint Dependency Graph)**: Khi một điểm di chuyển, GeoGebra cập nhật lại toàn bộ cây phụ thuộc (Directed Acyclic Graph - DAG) của các mặt phẳng, giao tuyến và thể tích liên quan trong chu kỳ khung hình (requestAnimationFrame).
*   **Các tính năng nổi trội về Hình học không gian**:
    - **Thư viện khối đa diện và khối tròn xoay hoàn chỉnh**: Dựng nhanh hình chóp (`Pyramid`), hình lăng trụ (`Prism`), tứ diện đều, khối lập phương, hình nón (`Cone`), hình trụ (`Cylinder`), mặt cầu (`Sphere`).
    - **Công cụ cắt thiết diện tự động**: Lệnh `IntersectPath(Plane, Polyhedron)` tự động tính toán giao đa giác của một mặt phẳng bất kỳ với khối đa diện.
    - **Công cụ Trải phẳng khối đa diện (Polyhedral Net)**: Lệnh `Net(Polyhedron, number)` mở bung các mặt của khối đa diện ra mặt phẳng 2D theo thanh trượt slider từ 0 đến 1. Đây là công cụ giảng dạy trực quan hàng đầu giúp học sinh THCS/THPT hiểu diện tích xung quanh và cấu trúc mặt đáy.
    - **Tạo mặt tròn xoay (Surfaces of Revolution)**: Cho phép xoay một đường cong tham số 2D quanh một trục bất kỳ trong không gian (`Surface(curve, angle, line)`).
    - **Chế độ xem đa dạng**: Hỗ trợ xem Phối cảnh (Perspective), Chiếu song song trực giao (Orthographic), Kính 3D đỏ-xanh (Anaglyph 3D) và đặc biệt là **Thực tế tăng cường (AR Mode)** trên iOS/Android (chiếu khối chóp hay lăng trụ trực tiếp lên mặt bàn học sinh thông qua camera).
*   **Hạn chế & Nhược điểm**:
    - **Xử lý nét đứt (Hidden dashed line) chưa tự động theo chuẩn SGK Việt Nam**: Khi xoay khối đa diện tự do trong không gian, GeoGebra chỉ làm mờ cạnh (Opacity) hoặc hiển thị wireframe đồng nhất; nó **không** tự động biến đổi nét vẽ từ liền sang đứt (`---`) khi cạnh rơi vào vùng bị che khuất bởi mặt trước. Để tạo hình chuẩn nét đứt cho đề thi, giáo viên buộc phải dựng thủ công hai phiên bản của cạnh và viết mã điều kiện ẩn/hiện phức tạp.
    - **Hiệu năng WebGL khi tải nhiều đối tượng phức tạp**: Giảm khung hình rõ rệt khi hiển thị đồng thời nhiều mặt cong lưới mật độ cao hoặc xử lý tích phân bội.
    - **Khó tùy biến nhúng sâu vào ứng dụng riêng**: GeoGebra API mang tính đóng gói cao, khó tích hợp giao diện tối giản kiểu HUD cho bảng thông minh trường học.

#### B. Cabri 3D (Tượng đài hình học không gian cổ điển)
Được phát triển bởi Cabrilog (Pháp), Cabri 3D là phần mềm tiên phong đặt nền móng cho mô phỏng hình học không gian 3D tương tác.

*   **Điểm mạnh vượt trội về tư duy hình học**:
    - **Cơ chế Mặt phẳng làm việc tương tác (Dynamic Working Planes)**: Khắc phục triệt để sự mơ hồ về tọa độ khi rê chuột trong không gian 3D. Người dùng click vào bất kỳ mặt nào của khối đa diện, Cabri sẽ kích hoạt mặt phẳng đó làm mặt làm việc 2D tức thì.
    - **Khả năng cắt lát thiết diện (Slicing)**: Kéo một mặt phẳng xuyên qua khối lập phương và quan sát diện tích thiết diện biến đổi theo thời gian thực vô cùng mượt mà.
    - **Gấp/mở mô hình theo bản lề (Hinges)**: Cho phép học sinh dùng chuột "kéo" từng mặt đa diện gập lại thành khối 3D như xếp giấy Origami.
*   **Hạn chế hiện tại**:
    - Công nghệ Desktop thời kỳ cũ (không có bản Web hiện đại đủ mạnh), giao diện mang phong cách thập niên 2000, không có cộng đồng chia sẻ mở như GeoGebra và chi phí bản quyền đắt đỏ.

#### C. Desmos 3D (Thế hệ mới — Tối giản & Mượt mà trên Web)
Ra mắt chính thức vào giai đoạn 2023–2024, Desmos 3D mở rộng nền tảng đồ thị nổi tiếng của Desmos lên không gian ba chiều.

*   **Tính năng cốt lõi**:
    - **Tốc độ kết xuất WebGL đỉnh cao**: Sử dụng engine đồ họa tùy biến của Desmos, render cực mượt đồ thị hàm số hai biến $z = f(x, y)$, mặt cong tham số $r(u, v) = (x(u,v), y(u,v), z(u,v))$, mặt ẩn $f(x, y, z) = 0$.
    - **Trường vector và đường cong không gian**: Rất mạnh cho Giải tích đa biến (Calculus III), vật lý điện từ trường.
    - **UI/UX cực kỳ tinh gọn**: Hỗ trợ bàn phím toán học và công thức LaTeX mượt bậc nhất trên trình duyệt.
*   **Hạn chế lớn về Hình học không gian thuần túy**:
    - Desmos 3D thiên về **Giải tích hàm số** hơn là **Hình học tổng hợp (Synthetic Geometry)**. Chưa có sẵn các công cụ dựng hình học Euclide như: dựng đường vuông góc từ điểm đến mặt phẳng, tìm giao tuyến hai mặt phẳng bằng click chuột, dựng mặt cầu nội tiếp/ngoại tiếp tự động. Muốn vẽ hình chóp, người dùng phải tự nhập tọa độ các đoạn thẳng bằng công thức tham số.

#### D. CalcPlot3D
Một công cụ mã nguồn mở dựa trên WebGL (được phát triển bởi GS. Paul Seeburger - Monroe Community College).
*   **Thế mạnh**: Chuyên trị giải tích vector, tích phân đường, tích phân mặt, đường mức (contour plots), vẽ mặt bậc hai (Quadric Surfaces: Ellipsoid, Hyperboloid, Paraboloid).
*   **Hạn chế**: Giao diện học thuật cổ điển, không thân thiện với học sinh phổ thông.

---

### 2.2. Nhóm Soạn thảo Văn bản & Xuất bản Khoa học (TeX / LaTeX)

Tại Việt Nam và các hội đồng khảo thí quốc tế, hình vẽ trong các đề thi THPT Quốc gia, đề thi học sinh giỏi (VMO) và giáo trình đại học hầu hết **không** chụp màn hình từ GeoGebra mà được biên dịch trực tiếp bằng code LaTeX để đạt chất lượng in ấn vector 1200 DPI không răng cưa.

#### A. TikZ & Gói `tikz-3dplot`
*   **Cơ chế hoạt động**:
    - `tikz-3dplot` cho phép thiết lập hệ trục tọa độ cầu/Euler thông qua lệnh `\tdplotsetmaincoords{\theta}{\phi}`.
    - Người dùng khai báo tọa độ 3D $(x, y, z)$, gói lệnh sẽ thực hiện phép chiếu song song (Axonometric Projection) để biến đổi thành tọa độ phẳng $(x', y')$ trên trang giấy.
*   **Ưu điểm**:
    - Tính thẩm mỹ đỉnh cao: Nét vẽ chuẩn mực, font chữ đồng nhất tuyệt đối với công thức tài liệu, căn chỉnh nhãn điểm bằng anchor (`above right`, `below left`).
    - Hỗ trợ hoàn hảo quy chuẩn SGK Việt Nam: Phân định rõ ràng nét đứt `[dashed]` và nét liền `[solid]`.
*   **Nhược điểm chí mạng**:
    - **Không tự động tính toán nét khuất**: Người soạn đề phải tự hình dung góc nhìn $(\theta, \phi)$ để biết cạnh nào nằm sau và gắn cờ `[dashed]` thủ công. Nếu đổi góc nhìn, phải viết lại toàn bộ mã.

#### B. Asymptote (Asy) — Bộ Engine Đồ họa Vector 3D Đích Thực cho TeX
Asymptote là ngôn ngữ lập trình đồ họa vector bậc cao (do John Bowman và Andy Hammerlindl phát triển), được đánh giá là công cụ vẽ 3D mạnh mẽ nhất trong thế giới TeX.

*   **Tính năng đặc sắc**:
    - **Có giải thuật loại bỏ mặt khuất (Hidden Surface Removal - HSR) tự động**: Tự động tính toán các tam giác che khuất dựa trên thuật toán BSP-Tree hoặc Z-Buffer khi kết xuất sang 2D vector.
    - **Chiếu sáng bề mặt (Phong Shading & Raytracing)**: Đổ bóng và chuyển sắc độ bề mặt như một phần mềm 3D thực thụ nhưng xuất ra file vector EPS/PDF.
    - **Xuất PDF 3D tương tác (PRC / U3D format)**: Khi nhúng vào tệp PDF mở bằng Adobe Acrobat Reader, người đọc có thể click chuột vào trang giấy để **xoay mô hình 3D trực tiếp** ngay trong bài báo/đề thi!

```latex
// Ví dụ mã nguồn Asymptote dựng hình chóp S.ABCD
import three;
size(200);
currentprojection=perspective(5,2,3);
triple S=(0,0,3), A=(-1,-1,0), B=(1,-1,0), C=(1,1,0), D=(-1,1,0);
draw(A--B--C, black);
draw(A--D--C, dashed); // Tùy chọn nét đứt cho cạnh đáy sau
draw(S--A^^S--B^^S--C^^S--D, black);
```

---

### 2.3. Nhóm Hoạt họa Sư phạm (Math Animation Engine)

#### Manim (Mathematical Animation Engine — Grant Sanderson / 3Blue1Brown)
Manim đã thay đổi hoàn toàn cách thế giới giảng dạy toán học trực quan trên YouTube.

*   **Kiến trúc 3D của Manim**:
    - Kế thừa lớp `ThreeDScene`, quản lý các đối tượng `Mobject3D` (`Cube`, `Sphere`, `Cone`, `Prism`, `Surface`).
    - Điều khiển camera mượt mà: `self.move_camera(phi=75*DEGREES, theta=-45*DEGREES, run_time=3)`.
    - Biến đổi hình thái liên tục (Continuous Morphing): Trực quan hóa quá trình mở bung một hình nón thành hình quạt tròn, hoặc chuyển một khối chóp thành các khối vi phân.
*   **Hai nhánh phát triển**:
    - `Manim Community (ManimCE)`: Bản cộng đồng ổn định, xuất video qua FFmpeg, tối ưu cho sản xuất bài giảng.
    - `ManimGL`: Bản do Grant Sanderson phát triển riêng bằng ModernGL/OpenGL, cho phép tương tác cửa sổ thời gian thực bằng chuột khi code đang chạy.
*   **Ứng dụng cho EdTech**: Rất thích hợp để render các clip minh họa hoạt ảnh mẫu nhúng vào các bài giảng lý thuyết ngắn (Micro-learning) hoặc video tổng kết.

---

### 2.4. Nhóm Framework Đồ họa Lập trình Web (Cho Nhà phát triển EdTech)

Để tự xây dựng một ứng dụng vẽ hình học không gian tương tác chạy trên Web, iPad hoặc Bảng thông minh mà không phụ thuộc vào iframe của bên thứ ba, các đội ngũ EdTech sử dụng các thư viện WebGL/WebGPU:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                       TECH STACK CHO MODULE HÌNH HỌC KHÔNG GIAN IN-APP                      │
├──────────────────────────┬──────────────────────────────────────────────────────────────────┤
│ THÀNH PHẦN               │ THƯ VIỆN & CÔNG NGHỆ KHUYÊN DÙNG                                 │
├──────────────────────────┼──────────────────────────────────────────────────────────────────┤
│ 1. Core WebGL Engine     │ Three.js hoặc Babylon.js (Hiệu năng cao, tài nguyên dồi dào)     │
│ 2. React Integration     │ @react-three/fiber (R3F) + @react-three/drei                     │
│ 3. CSG Cắt Thiết Diện    │ three-bvh-csg hoặc Manifold 3D (Cắt đa diện thời gian thực)      │
│ 4. Hidden Line Shader    │ Custom GLSL Shader (Dual-depth pass để render nét đứt tự động)   │
│ 5. Bắt Điểm & Tương Tác  │ Three.js Raycaster + Sphere-projected Gizmos                     │
│ 6. Xuất Dữ Liệu          │ glTF/GLB (Mô hình 3D), SVG (Vector in ấn), TikZ Code Exporter    │
└──────────────────────────┴──────────────────────────────────────────────────────────────────┘
```

#### A. Three.js / React Three Fiber (R3F)
- **Ưu thế**: Hệ sinh thái khổng lồ, hỗ trợ Declarative UI qua JSX (`<mesh>`, `<coneGeometry>`, `<lineDashedMaterial>`).
- **Khả năng giải bài toán hình học**: Rất linh hoạt trong việc tùy biến shader, cho phép lập trình viên viết Custom Post-Processing hoặc Material riêng để phân biệt cạnh khuất và cạnh thấy.

#### B. Babylon.js
- **Ưu thế**: Động cơ toán học và xử lý va chạm cực kỳ mạnh, có sẵn hệ thống CSG (Constructive Solid Geometry) tích hợp sẵn trong core. Rất thích hợp cho các ứng dụng đo lường kỹ thuật, hiển thị kích thước và bóc tách khối 3D.

#### C. MathBox.js
- Được xây dựng trên Three.js bởi Steven Wittens (Acko.net).
- Chuyên biệt hóa cho việc biểu diễn các cấu trúc toán học phức tạp: lưới tọa độ cong, trường vector, biến đổi không gian Riemann.

---

### 2.5. Nhóm CAD & Dựng hình Công nghiệp

*   **Blender**: Mã nguồn mở, cực mạnh với `Geometry Nodes` (dựng hình tham số dựa trên node toán học) và `Grease Pencil` (vẽ tay 2D trực tiếp trong không gian 3D). Thích hợp cho việc sản xuất học liệu chất lượng cao, hình ảnh minh họa sách giáo khoa 3D.
*   **SketchUp / Fusion 360 / FreeCAD**: Dành cho kỹ thuật cơ khí và kiến trúc, có độ chính xác kích thước cao, tự động xuất bản vẽ 2D từ mô hình 3D (với đầy đủ nét đứt theo tiêu chuẩn kỹ thuật ISO/TCVN). Tuy nhiên, các công cụ này quá nặng nề và phức tạp đối với chương trình học Toán THPT.

---

### 2.6. Nhóm Bảng Tương Tác & Nhận Diện Nét Vẽ (Sketch-to-3D AI Canvas)

Đây là xu hướng công nghệ nóng nhất hiện nay tại các triển lãm giáo dục (BETT Show, EdTech Asia):
*   **Apple Freeform / Goodnotes / Notability**: Hỗ trợ nhận diện nét vẽ 2D (Stroke to shape: vẽ tròn méo thành tròn đều, vẽ tam giác méo thành tam giác chuẩn). Tuy nhiên, **chưa hỗ trợ nhận diện mô hình 3D**.
*   **Hệ thống Bảng tương tác AI thế hệ mới**:
    - Giáo viên dùng bút stylus vẽ phác một hình chóp $S.ABCD$ với 3 nét liền và 1 nét đứt.
    - Hệ thống AI (Vision Transformer + Shape Grammar Parser) nhận diện ngay cấu trúc Topology (1 đỉnh $S$, 4 đỉnh đáy $A, B, C, D$) trong vòng < 15ms.
    - Tự động thay thế nét vẽ tay bằng một khối đa diện 3D trực quan có thể dùng tay xoay góc nhìn, đo góc và kéo mặt phẳng cắt thiết diện ngay trên màn hình cảm ứng 86".

---

## 3. CÁC THÁCH THỨC KỸ THUẬT ĐẶC THÙ CỦA HÌNH HỌC KHÔNG GIAN

Dưới góc độ kỹ thuật phần mềm và đồ họa máy tính, việc xây dựng một công cụ vẽ hình học không gian phục vụ giáo dục khó hơn gấp nhiều lần so với hình học phẳng 2D hoặc game 3D thông thường. Dưới đây là 5 bài toán hóc búa nhất:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                   5 THÁCH THỨC KỸ THUẬT CỐT LÕI TRONG HÌNH HỌC KHÔNG GIAN                    │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
  1. NÉT KHUẤT / NÉT ĐỨT       2. CẮT THIẾT DIỆN           3. TRẢI PHẲNG (NETS)
  ┌──────────────────┐         ┌──────────────────┐        ┌──────────────────┐
  │ Solid:  ──────   │         │ Plane (P) ∩ Solid│        │ 3D Polyhedron    │
  │ Hidden: - - - -  │         │   => Polygon     │        │   => 2D Pattern  │
  └──────────────────┘         └──────────────────┘        └──────────────────┘
            │                            │                           │
            └────────────────────────────┼───────────────────────────┘
                                         ▼
                 ┌─────────────────────────────────────────────────┐
                 │ 4. THAO TÁC 3D TRÊN MÀN HÌNH 2D (RAYCASTING)    │
                 │ 5. QUY CHUẨN PHÉP CHIẾU SGK (AXONOMETRIC PROJ)  │
                 └─────────────────────────────────────────────────┘
```

---

### 3.1. Bài toán Nét đứt / Nét khuất (The Hidden Line Dilemma)

Trong đồ họa game và 3D công nghiệp (Three.js, Unity, Unreal):
- Khối vật thể được tô đặc bề mặt (Solid Fill) bằng cách dùng **Z-Buffer** (Depth Buffer). Bề mặt nào ở gần camera thì đè lên bề mặt ở xa.
- Hoặc nếu ở chế độ khung dây (Wireframe), toàn bộ các cạnh đều hiển thị bằng nét liền.

Tuy nhiên, trong **Quy chuẩn Sư phạm Toán học Việt Nam (và quốc tế)**:
- Cạnh bị che khuất bởi các mặt phẳng khác **bắt buộc phải vẽ bằng nét đứt (`- - - -`)**.
- Cạnh nhìn thấy được **bắt buộc vẽ bằng nét liền (`──────`)**.

#### Các phương pháp giải quyết kỹ thuật:

```
CÁCH 1: DUAL-DEPTH PASS SHADER (WebGl / GPU - Thời gian thực 60 FPS)
Pass 1: Render Wireframe với Material Nét Đứt
        • glDepthFunc(GL_GREATER) hoặc depthTest: false
        • Kết quả: Vẽ tất cả các cạnh bị che khuất bằng nét đứt mờ.
Pass 2: Render Bề mặt Solid đè lên với Z-buffer chuẩn.
Pass 3: Render Wireframe với Material Nét Liền
        • glDepthFunc(GL_LEQUAL) với depthTest: true
        • Kết quả: Chỉ những đoạn cạnh nằm phía trước mặt chắn mới được vẽ nét liền.
```

```
CÁCH 2: GIẢI THUẬT TOPOLOGY B-REP & RAY TRACING (Độ chính xác Vector tuyệt đối)
• Biểu diễn khối đa diện dưới dạng B-Rep (Đỉnh V, Cạnh E, Mặt F).
• Với mỗi cạnh e = (A, B) và vị trí Camera C:
  - Chia cạnh e thành nhiều mẫu con (hoặc tìm giao điểm màn hình với các cạnh của mặt chắn).
  - Bắn tia ray r từ Camera C tới điểm kiểm tra P trên cạnh e.
  - Nếu tia ray cắt qua một tam giác mặt phẳng F của khối trước khi tới P:
    => Điểm P bị che khuất => Vẽ nét đứt.
  - Ngược lại => Điểm P nhìn thấy => Vẽ nét liền.
```

---

### 3.2. Bài toán Cắt thiết diện khối đa diện (Cross-Section & Slicing Planes)

Cắt khối chóp hoặc lăng trụ bởi một mặt phẳng $(P)$ để tìm thiết diện là một trong những dạng toán trọng tâm và khó nhất của chương trình Hình học 11 và 12.

*   **Bản chất toán học**: Cho đa diện $\mathcal{P} = \{F_1, F_2, ..., F_m\}$ và mặt phẳng $(P): Ax + By + Cz + D = 0$. Cần tìm giao đa giác $\mathcal{S} = (P) \cap \mathcal{P}$.
*   **Giải thuật triển khai trong phần mềm**:
    1. **Kiểm tra cắt từng cạnh**: Với mỗi đoạn thẳng $e = [V_1, V_2]$ của đa diện, tính giá trị thế tọa độ vào phương trình mặt phẳng:
       $$d_1 = A x_1 + B y_1 + C z_1 + D, \quad d_2 = A x_2 + B y_2 + C z_2 + D$$
    2. Nếu $d_1 \cdot d_2 < 0$, mặt phẳng $(P)$ cắt cạnh tại điểm $M$:
       $$M = V_1 + t (V_2 - V_1), \quad \text{với } t = \frac{-d_1}{d_2 - d_1}$$
    3. **Sắp xếp thứ tự đỉnh**: Thu thập tất cả các điểm giao $M_i$, sau đó tính góc cực trên mặt phẳng $(P)$ xoay quanh trọng tâm để nối thành một chu trình đa giác lồi/lõm khép kín.
    4. **Hiển thị trực quan**: Tô màu bán trong suốt (alpha 0.35) kèm hiệu ứng phát quang đường viền huỳnh quang để làm nổi bật thiết diện.

---

### 3.3. Bài toán Phép chiếu & Phối cảnh (Projections)

*   **Phối cảnh điểm tụ (Perspective Projection)**:
    - Vật ở xa nhỏ hơn vật ở gần (giống mắt người nhìn thực tế).
    - Phù hợp khi xoay tự do trong không gian 3D tương tác.
    - Nhược điểm: Hai đường thẳng song song trong không gian sẽ hội tụ về điểm tụ, làm sai lệch cảm giác tỉ lệ hình học của học sinh.
*   **Phép chiếu song song / Trục đo (Axonometric / Orthographic / Cavalier Projection)**:
    - **Quy chuẩn sách giáo khoa Toán**: Hai đường thẳng song song trong không gian **bắt buộc phải biểu diễn bằng hai đường thẳng song song trên hình vẽ**.
    - Hệ số biến dạng trên các trục $Ox, Oy, Oz$ được quy ước nghiêm ngặt (ví dụ: trục nằm ngang tỉ lệ 1:1, trục nghiêng $45^\circ$ thu ngắn một nửa $1:0.5$).
    - Do đó, một công cụ vẽ hình học không gian hoàn thiện phải cho phép chuyển đổi 1-tap giữa chế độ **Xoay phối cảnh tự do (Free Orbit)** và **Khóa góc chiếu chuẩn SGK (Standard Textbook Axonometric View)**.

---

### 3.4. Bài toán Trải phẳng khối đa diện (Polyhedral Net Unfolding)

*   Giúp học sinh quan sát sự liên kết giữa các mặt 2D và thể tích 3D.
*   **Thuật toán đồ họa**:
    1. Xây dựng đồ thị liên thuộc của đa diện $G = (V_{faces}, E_{adj})$.
    2. Tìm **Cây khung (Spanning Tree)** của đồ thị các mặt phẳng.
    3. Chọn 1 mặt làm gốc (Base Face).
    4. Xoay các mặt nhánh quanh các cạnh chung (Hinges) với góc quay $\theta(t) = \theta_{initial} \cdot (1 - t)$ (với $t \in [0, 1]$ từ slider) cho đến khi góc nhị diện giữa các mặt phẳng bằng $180^\circ$ (nằm phẳng trên mặt đáy).

---

### 3.5. Thao tác 3D trên màn hình phẳng 2D (Depth Snapping & Raycasting)

Khi giáo viên chạm ngón tay hoặc bút vẽ lên màn hình cảm ứng 2D tại tọa độ $(x_{screen}, y_{screen})$, điểm đó tương ứng với cả một **tia chiếu (Ray)** đi từ mắt người nhìn xuyên qua không gian vô tận.
- **Vấn đề**: Làm sao biết người dùng muốn đặt điểm ở độ sâu $z$ nào?
- **Giải pháp UX thông minh**:
  1. **Snap to Active Face**: Bắt dính ngay vào mặt phẳng của khối hình gần nhất mà tia ray xuyên qua.
  2. **Snap to Geometry Elements**: Ưu tiên bắt dính vào Trung điểm đoạn thẳng, Đỉnh khối đa diện, Trọng tâm tam giác, Tâm mặt cầu.
  3. **Mặt phẳng làm việc 3 chiều (3D Coordinate Plane Widget)**: Hiển thị một đĩa lưới mini cho phép người dùng kéo thả nâng hạ trục $Z$.

---

## 4. BẢNG MA TRẬN SO SÁNH ĐỐI ĐẦU TOÀN DIỆN (BENCHMARK MATRIX)

Bảng đối chiếu 8 công cụ đại diện theo 12 tiêu chí sư phạm và công nghệ khắt khe:

| Tiêu chí Đánh giá | GeoGebra 3D | Cabri 3D | Desmos 3D | TikZ / 3dplot | Asymptote | Manim (3B1B) | Three.js / R3F | Smartboard Canvas (Socratic) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1. Tương tác trực quan kéo thả (GUI/Touch)** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ❌ (Code) | ❌ (Code) | ❌ (Python) | ⭐⭐⭐⭐ (Cần code) | ⭐⭐⭐⭐⭐ (Tối ưu cảm ứng) |
| **2. Dựng hình Euclide tổng hợp (Giao tuyến, vuông góc)** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **3. Dựng hình Giải tích Oxyz (Mặt phẳng, mặt cầu)** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **4. Xử lý Nét đứt chuẩn SGK Việt Nam** | ⭐⭐ (Thủ công) | ⭐⭐⭐ | ❌ | ⭐⭐⭐⭐⭐ (Tự code) | ⭐⭐⭐⭐⭐ (Tự động HSR) | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ (Custom Shader) | ⭐⭐⭐⭐⭐ (Engine tự động) |
| **5. Cắt thiết diện động (Cross-section)** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ❌ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ (CSG) | ⭐⭐⭐⭐⭐ (1-tap Slider) |
| **6. Trải hình phẳng (Net Unfolding)** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ❌ | ⭐ (Cực khó) | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **7. Đồ họa PBR, Phát quang, Thẩm mỹ 4K** | ⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ (Đẹp in ấn) | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ (Chuẩn Keynote) |
| **8. Tốc độ khung hình (FPS) trên Web/Tablet** | 45-60 FPS | App Desktop | 60 FPS | N/A (Tĩnh) | N/A (Tĩnh) | Render Offline | 60-120 FPS | 60 FPS Khóa cứng |
| **9. Xuất file vector in ấn (SVG / PDF / TeX)** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **10. Nhúng sâu vào nền tảng Web EdTech riêng** | Khó (Iframe nặng)| Không thể | Không thể | Không (Chỉ PDF) | Không | Khó (Video tĩnh) | Dễ dàng (Native WebGL)| Bản quyền nội bộ |
| **11. Thực tế tăng cường (AR) / In 3D (STL)** | Có (AR App/STL) | Xuất STL | Không | Không | Xuất PRC 3D | Không | WebXR / OBJ / STL | WebXR Tích hợp |
| **12. Nhận diện Nét vẽ tay phác thảo (Sketch-to-3D)**| Không | Không | Không | Không | Không | Không | Tùy biến | ⭐⭐⭐⭐⭐ (AI Stroke Router) |

---

## 5. ĐỀ XUẤT KIẾN TRÚC KỸ THUẬT CHO EDTECH & SMARTBOARD (SOCRATIC VISION BOARD)

Để giải quyết triệt để bài toán vẽ hình học không gian trong dự án EdTech (đặc biệt là Bảng thông minh tương tác trên lớp và Ứng dụng gia sư AI đồng hành sau giờ học), kiến trúc khuyến nghị được thiết kế như sau:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                 KIẾN TRÚC MODULE HÌNH HỌC KHÔNG GIAN THẾ HỆ MỚI (SOCRATIC 3D)                │
└─────────────────────────────────────────────────────────────────────────────────────────────┘

 [INPUT: Bút Stylus / Cảm ứng]           [INPUT: Đề bài OCR / Lời nhắc AI]
             │                                         │
             ▼                                         ▼
   ┌──────────────────┐                     ┌───────────────────────┐
   │ 1. STROKE PARSER │                     │ 2. SYMBOLIC PARSER    │
   │ Nhận diện nét phác│                     │ Phân tích câu: "Cho   │
   │ chóp, lăng trụ... │                     │ chóp S.ABC đáy đều..."│
   └─────────┬────────┘                     └───────────┬───────────┘
             │                                          │
             └───────────────────┬──────────────────────┘
                                 ▼
                 ┌────────────────────────────────┐
                 │ 3. TOPOLOGY & CONSTRAINT GRAPH │
                 │ • Quản lý Đỉnh, Cạnh, Mặt      │
                 │ • Ràng buộc: Song song,        │
                 │   Vuông góc, Tỉ số chia        │
                 └───────────────┬────────────────┘
                                 ▼
                 ┌────────────────────────────────┐
                 │ 4. CORE COMPUTATIONAL ENGINE   │
                 │ • three-bvh-csg (Cắt thiết diện│
                 │ • Net Unfolder (Trải phẳng)    │
                 │ • Distance / Angle Measurer    │
                 └───────────────┬────────────────┘
                                 ▼
                 ┌────────────────────────────────┐
                 │ 5. ADVANCED 3D RENDER PIPELINE │
                 │ • Dual-pass Dashed Line Shader │
                 │ • PBR Lighting + Bloom HUD     │
                 │ • 1-Tap Toggle: SGK vs Orbit   │
                 └────────────────────────────────┘
```

### Chi tiết các tầng tính năng:

#### 1. Bộ nhận diện nét vẽ phác thảo (Sketch-to-3D Solid Pipeline)
- Giáo viên chỉ cần vẽ 4 đường thẳng tạo đáy tứ giác và 4 đường xiên lên đỉnh chóp (với độ trễ < 15ms).
- Hệ thống tự động khớp vào mẫu hình chóp chóp tứ giác đều (`RegularPyramid`) hoặc chóp có cạnh bên vuông góc đáy (`PerpendicularSpinePyramid`), dựng ngay mô hình 3D hoàn chỉnh.

#### 2. Shader Nét đứt Động (Dynamic Occlusion Dashed Shader)
- Triển khai Dual-pass render trong React Three Fiber:
  - Khi xoay mô hình, cạnh nào bị che khuất sau các mặt phẳng tự động chuyển thành nét gạch rời (`dashSize: 0.15, gapSize: 0.1`), cạnh nhìn thấy chuyển thành nét phát quang huỳnh quang rực rỡ.
  - Loại bỏ hoàn toàn sự ức chế của giáo viên khi phải xóa đi vẽ lại nét đứt trên bảng truyền thống.

#### 3. Thanh trượt Cắt thiết diện thời gian thực (Interactive Slicing Plane Slider)
- Cho phép giáo viên chọn 3 điểm $M, N, P$ trên các cạnh của khối đa diện.
- Mặt phẳng đi qua 3 điểm lập tức mở rộng, lát cắt đi xuyên qua khối hình hiển thị diện tích thiết diện và chu vi theo thời gian thực nhờ thuật toán CSG đa giác.

#### 4. Chế độ Trải hình tương tác (Interactive Unfolding / Net Animation)
- Cung cấp nút gạt "Mở khối đa diện": Khối hình từ từ bung các mặt ra nằm phẳng trên mặt đáy với hiệu ứng lò xo vật lý (Spring dynamics), giúp học sinh hiểu sâu bản chất công thức diện tích toàn phần $S_{tp} = S_{xq} + 2S_đ$.

---

## TỔNG KẾT & KẾT LUẬN

Hệ sinh thái công cụ vẽ hình học không gian hiện nay đã phát triển rất đa dạng nhưng đang bị **phân mảnh mạnh mẽ**:
- **GeoGebra & Cabri** rất mạnh về tư duy sư phạm nhưng thiếu tính hiện đại về mặt thẩm mỹ hiển thị và gặp khó khăn với quy chuẩn nét đứt tự động.
- **TikZ & Asymptote** đạt đỉnh cao về chất lượng in ấn tài liệu nhưng lại thiếu khả năng tương tác trực quan thời gian thực.
- **Desmos 3D** mượt mà nhưng thiên về giải tích hàm số hơn là hình học không gian cổ điển.
- **Three.js & WebGL/WebGPU** đang là nền tảng tối thượng để các sản phẩm EdTech thế hệ mới hội tụ tất cả các tinh hoa trên: kết hợp sự chuẩn mực toán học của Geogebra, chất lượng nét vẽ của TikZ và thẩm mỹ điện ảnh 60 FPS mượt mà trên màn hình cảm ứng tương tác.

