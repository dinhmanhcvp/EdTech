# Hướng dẫn: viết gì để bảng mở đúng mô phỏng

Tài liệu này dành cho giáo viên và người thao tác bảng. Mỗi mục dưới đây có **câu viết mẫu** (trong dấu `...`) đã được kiểm tự động bằng `src/__tests__/guideExamples.test.ts`: câu nào ghi ở đây mà không mở đúng mô phỏng thì bài kiểm tra sẽ báo lỗi. Danh sách trình diễn ngắn gọn hơn nằm ở `docs/KICH_BAN_LIVE_DEMO.md`.

## 1. Cách dùng chung

1. Viết (bằng bút) hoặc gõ (công cụ **Chèn chữ**, hoặc ô công thức trong thanh khoanh vùng).
2. Dùng công cụ **Chọn** để **khoanh** vùng vừa viết.
3. Bấm **Trực quan hóa**. Muốn đổi chữ viết tay thành công thức chuẩn trước thì bấm **Chuyển công thức**.

Các điểm cần nhớ:

- **Chữ tiếng Việt** ("khí khổng", "con lắc kép"): bộ nhận dạng chữ tay offline chỉ đọc ký hiệu toán. Muốn viết tay tiếng Việt thì phải có khóa Gemini (hoặc OpenRouter) còn hạn mức. Nếu không, hãy **gõ** bằng Chèn chữ hoặc vào ô công thức.
- **Không cần đúng dấu.** Tên mô phỏng được so khớp gần đúng: "con lac kep", "thau kinh" vẫn mở đúng. Câu càng dài và càng cụ thể thì càng chắc.
- **Dạng toán** gõ kiểu thường (`x^2`) hoặc LaTeX (`x^{2}`) đều được, dấu chấm cuối câu hay `\text{...}` cũng được bỏ qua. Chữ viết tay được đọc ra LaTeX có ngoặc nhọn nên bảng chuẩn hóa trước khi tra.
- **Mặt cầu và đường tròn khác nhau:** `x^2 + y^2 + z^2 = 9` (có `z`) mở Oxyz; `x^2 + y^2 = 9` (không có `z`) mở đồ thị đường tròn 2D.
- **Khóa có hạn mức:** khi Gemini hết lượt, bảng chạy bằng bộ nhận dạng offline; công thức đơn giản vẫn đọc được, chữ tay tiếng Việt thì không.
- **Quay video:** thêm `?clean=1` vào địa chỉ trang (`http://localhost:3001/?clean=1`) để ẩn thanh chẩn đoán ở góc phải.

## 2. Hình học: vẽ nháp, bảng thay bằng hình chuẩn tại chỗ

Không qua hologram: nét tay được thay bằng hình sạch ngay vị trí vẽ.

- **Hình phẳng:** vẽ tam giác (thường, vuông, cân, đều), hình vuông, chữ nhật, bình hành bằng 1 đến 4 nét khép kín. Khoanh rồi bấm nút xanh **Tương tác tại chỗ**. Kéo từng đỉnh thì độ dài cạnh và số đo góc đổi theo; nút **Euler** hiện O, G, H.
- **Khối 3D:** vẽ lập phương, hộp chữ nhật, chóp tứ giác, tứ diện, lăng trụ tam giác, lăng trụ lục giác, bát diện bằng từ 4 nét trở lên (mặt trước, mặt sau, các cạnh nối). Nét liền là cạnh thấy, nét đứt là cạnh khuất; kéo vòng ⟳ ở góc để xoay.
  - Hình lập phương vẽ tay kiểu người thật (hai hình vuông lệch nhau, chiều sâu khoảng 0,4 đến 0,75 cạnh) được nhận đúng từ 95 đến 100% trên mẫu giả lập; chưa đo trên nét tay thật.
- **Tự động:** Dock → **Hình** → **Trực quan hình học**: vẽ xong chờ khoảng 1 giây, hình tự chuyển, khỏi khoanh.
- Trên mỗi hình: ⠿ di chuyển, ⤢ mở mô phỏng đầy đủ (khai triển, cắt thiết diện, mặt cầu, đường cao), ✕ xóa.
- Cũng có thể **gõ tên khối** (xem `GEO_SOLID` bên dưới).

## 3. Toán

### MATH_GRAPH — Đồ thị nhiều hàm, giao điểm
- **Viết:** `y = x^2 ; y = 2x + 3` · `y = x^2 - 3 ; y = A sin x + B` · `x^2 + y^2 = 25` · `y = x^3 - 3x`
- **Chỉnh:** kéo đồ thị, thanh trượt cho tham số viết bằng chữ hoa (A, B…), thêm hoặc bớt hàm trong danh sách, giao điểm tự tính.
- **Lưu ý:** ngăn các hàm bằng `;` hoặc xuống dòng. Phương trình ẩn (đường tròn, elip) vẽ được nếu **không có `z`**.

### MATH_TRIG_WAVE — Hàm lượng giác, sóng điều hòa
- **Viết:** `y = 2sin(3x)` · `x = 5cos(2πt + π/2)` · `dao động điều hòa`
- **Chỉnh:** biên độ A, tần số góc ω, pha φ, độ lệch trục D; bật Taylor để so sánh khai triển.

### MATH_FUNC_2D — Nguyên hàm, tích phân
- **Viết:** `nguyên hàm của x^3` · `\int x^3 dx` · `tích phân`
- **Chỉnh:** các hệ số a, b, c của hàm và hằng số C; xem diện tích dưới đường cong.

### GEO_SOLID — Khối đa diện (khai triển, cắt thiết diện)
- **Viết:** `hình chóp S.ABCD` · `hình lập phương` · `tứ diện đều` · `lăng trụ tam giác` · `bát diện đều` · `hình hộp chữ nhật`
- **Chỉnh:** xoay khối, khai triển thành mạng phẳng, cắt thiết diện. Hoặc **vẽ tay** khối (mục 2).

### MATH_3D_OXYZ — Mặt cầu và mặt phẳng trong Oxyz
- **Viết:** `x^2 + y^2 + z^2 = 9` · `(x-1)^2 + (y+2)^2 + (z-3)^2 = 16` · `mặt cầu` · `Oxyz mặt cầu cắt mặt phẳng (P): x + y - 2 = 0`
- **Chỉnh:** bán kính R, tâm I (x, y, z), phương trình mặt phẳng (P) hoặc các hệ số A, B, C, D; xoay bằng kéo; nút **Cắt**, **Tiếp xúc**, **Không giao** đặt nhanh vị trí mặt phẳng.
- **Lưu ý:** đề cho tâm và bán kính (R² = số bên phải) thì bảng đặt sẵn thanh trượt đúng giá trị. Chữ `z` bị đọc nhầm thành `2` hay `Z` vẫn được nhận.

### MATH_INTEGRAL_3D_REVOLVE — Thể tích khối tròn xoay
- **Viết:** `y = sqrt(x); a = 0; b = 4 tròn xoay` · `thể tích khối tròn xoay` · `Riemann`
- **Chỉnh:** số lát cắt, cận a, b; so tổng Riemann với tích phân.
- **Lưu ý:** thiếu cận thì mặc định a = 0, b = 2; thiếu hàm thì dùng y = x.

### MATH_DYNAMIC_GEOMETRY — Hình học động, đường Euler
- **Viết:** `đường Euler tam giác` · `trực tâm trọng tâm` · `đường tròn ngoại tiếp`
- **Chỉnh:** kéo đỉnh tam giác; O, G, H luôn thẳng hàng.

### MATH_LINEAR_PROGRAMMING — Quy hoạch tuyến tính
- **Viết:** `x + y <= 6; x >= 0; y >= 0; max 3x+2y` · `x + y ≤ 6; x ≥ 0; y ≥ 0; min x + 2y`
- **Chỉnh:** miền nghiệm, đỉnh tối ưu, kéo đường mức.
- **Lưu ý:** cần ít nhất 2 bất phương trình, hoặc 1 bất phương trình kèm hàm mục tiêu (`max`/`min`/`lớn nhất`/`nhỏ nhất`).

### MATH_COBWEB_CHAOS — Dãy số quy nạp, mạng nhện
- **Viết:** `x_{n+1} = 3.9 x_n (1 - x_n)` · `u_{n+1} = 2.8 u_n (1 - u_n)`
- **Chỉnh:** tham số r, giá trị đầu; hội tụ, tuần hoàn, hỗn loạn.
- **Lưu ý:** vế phải phải chứa chính dãy `x_n` (hoặc `u_n`).

### MATH_STAT_BOXPLOT — Biểu đồ hộp
- **Viết:** `Min=1, Q1=5, Q2=8, Q3=12, Max=20` · `Biểu đồ hộp của mẫu số liệu: 3, 5, 7, 8, 12, 15, 18, 21, 24, 100`
- **Chỉnh:** kéo các giá trị; ngoại lai tự hiện.
- **Lưu ý:** kiểu số liệu cần từ khóa (hộp, râu, tứ phân vị, mẫu số liệu…) và ít nhất 5 số.

### MATH_VARIATION_TABLE — Bảng biến thiên → đồ thị
- **Viết:** `x | -∞ -1 1 +∞ ; y' | + 0 - 0 + ; y | -∞ ↗ 3 ↘ -1 ↗ +∞` (ba dòng, có thể xuống dòng thay cho dấu chấm phẩy)
- **Chỉnh:** dựng đồ thị qua các điểm cực trị; bảng sai (dấu y' không khớp thứ tự y) bị bác.
- **Lưu ý:** dùng dấu `|` hoặc `:` sau tên dòng; cần dòng `x` và dòng `y`.

## 4. Vật lí

### PHYS_PROJECTILE — Ném xiên
- **Viết:** `ném xiên v0 = 22 m/s` · `v_0 = 22, \alpha = 45^\circ` · `chuyển động ném`
- **Chỉnh:** v₀, góc ném α, g (thử gia tốc Mặt Trăng); 45° cho tầm xa nhất.

### PHYS_PENDULUM — Con lắc đơn
- **Viết:** `con lắc đơn` · `T = 2\pi\sqrt{l/g}` · `\ddot{\theta} + \frac{g}{L}\sin\theta = 0`
- **Chỉnh:** chiều dài dây L, góc lệch θ₀, g, lực cản b; góc lớn thì chu kì lệch công thức gần đúng.

### PHYS_INCLINED — Mặt phẳng nghiêng, ma sát
- **Viết:** `mặt phẳng nghiêng có ma sát` · `\mu = 0.2` · `F_{ms} = \mu N`
- **Chỉnh:** góc α, hệ số ma sát μ, khối lượng, g; tan α > μ thì vật trượt.

### PHYS_RIPPLE_TANK — Giao thoa sóng hai nguồn
- **Viết:** `giao thoa sóng hai nguồn` · `d_2 - d_1 = k\lambda` · `sóng nước`
- **Chỉnh:** bước sóng λ, tần số, khoảng cách hai nguồn, độ lệch pha.

### PHYS_RLC_PHASOR — Mạch RLC, giản đồ Fresnel
- **Viết:** `mạch RLC cộng hưởng` · `giản đồ Fresnel` · `Z = \sqrt{R^2 + (Z_L - Z_C)^2}`
- **Chỉnh:** R, L, C, ω, U; ω₀ = 1/√(LC) là điểm cộng hưởng.

### PHYS_GAS_STATE_PV — Khí lí tưởng, đồ thị p–V
- **Viết:** `chu trình Carnot` · `chu trình Otto` · `đồ thị p-V chu trình tam giác` · `khí lí tưởng`
- **Chỉnh:** nhiệt độ nóng/lạnh, thể tích; hiệu suất, công, nhiệt.

### PHYS_DOUBLE_PENDULUM — Con lắc kép (hỗn loạn tất định)
- **Viết:** `con lắc kép` · `double pendulum`
- **Chỉnh:** góc ban đầu hai con lắc; hai con lắc lệch 0,001 rad tách nhau sau vài giây.

### PHYS_CORIOLIS_FORCE — Lực Coriolis
- **Viết:** `lực Coriolis` · `hệ quy chiếu quay`
- **Chỉnh:** chuyển hệ quay và hệ quán tính; đảo dấu ω là Nam bán cầu.

### PHYS_FRAUNHOFER_DIFF — Nhiễu xạ N khe
- **Viết:** `nhiễu xạ 5 khe` · `cách tử` · `Fraunhofer`
- **Chỉnh:** số khe N (câu có "5 khe" thì lấy N = 5), khoảng cách khe, độ rộng khe.

### PHYS_OPTICS_LENS — Thấu kính mỏng
- **Viết:** `thấu kính hội tụ f = 100` · `1/f = 1/d + 1/d'` · `tiêu cự` · `thấu kính f = 120 d = 300`
- **Chỉnh:** tiêu cự f (40 đến 180), khoảng cách vật d (50 đến 350), chiều cao vật h; d < f cho ảnh ảo.
- **Lưu ý:** số `f =`, `d =` trong câu được đọc và kẹp trong khoảng cho phép (đơn vị quy ước của mô phỏng, không phải cm).

## 5. Hóa học

### CHEM_BALANCE_SCALE — Cân bằng phương trình bằng cân đĩa
- **Viết:** `Fe + O2 -> Fe2O3` · `Fe + O_{2} \rightarrow Fe_{2}O_{3}` · `cân bằng phương trình`
- **Chỉnh:** hệ số mỗi chất; cân nghiêng theo số nguyên tử Oxi hai vế; 4Fe + 3O₂ → 2Fe₂O₃ thì thăng bằng.

### CHEM_EQUILIBRIUM_TITRATION — Chuẩn độ axit – bazơ
- **Viết:** `chuẩn độ HCl bằng NaOH` · `HCl + NaOH` · `titration`
- **Chỉnh:** thể tích NaOH, nồng độ HCl và NaOH; bước nhảy pH ở điểm tương đương.

### CHEM_MOLECULE_3D — Hình học phân tử VSEPR
- **Viết:** `SF6` · `NH3` · `H2O` · `XeF4` · `ClF3` · `CH4` · `AX3E1`
- **Chỉnh:** xoay 3D, cặp e riêng, góc liên kết, độ phân cực.
- **Có sẵn:** H₂O, NH₃, CH₄, CO₂, SO₂, SO₃, BF₃, BeCl₂, H₂S, PCl₃, CCl₄, CH₂O, HCN, O₃, PCl₅, SF₄, ClF₃, XeF₂, SF₆, BrF₅, XeF₄, hoặc dạng `AXnEm`.

### CHEM_LE_CHATELIER_GAS — Chuyển dịch cân bằng NO₂ ⇌ N₂O₄
- **Viết:** `2NO2 ⇌ N2O4` · `2NO_{2} \rightleftharpoons N_{2}O_{4}` · `Le Chatelier` · `chuyển dịch cân bằng`
- **Chỉnh:** nén piston, đổi nhiệt độ; màu nâu đỏ đậm ngay rồi nhạt dần.

### CHEM_GALVANIC_DANIELL — Pin điện hóa, phương trình Nernst
- **Viết:** `Pin Daniell` · `Pin Mg - Cu` · `Pin Zn - Cu` · `phương trình Nernst`
- **Chỉnh:** nồng độ ion, cầu muối, phóng điện; cặp kim loại tùy chọn trong Mg, Zn, Fe, Ni, Pb, Cu.

### CHEM_REACTION_LAB — Tốc độ phản ứng, bọt khí
- **Viết:** `Mg + HCl` · `Zn + H2SO4 60°C 2M` · `tốc độ phản ứng` · `bọt khí`
- **Chỉnh:** nhiệt độ T (10 đến 80 °C), nồng độ axit (0,2 đến 5 M), diện tích hạt; tốc độ tăng theo hàm mũ khi tăng T.
- **Lưu ý:** cần kim loại cộng với axit (Mg, Zn, Al, Fe với HCl hoặc H₂SO₄) hoặc từ "tốc độ phản ứng", "bọt khí". `HCl + NaOH` là chuẩn độ, không phải mô phỏng này.

### CHEM_SN2_MECHANISM — Cơ chế SN2
- **Viết:** `SN2` · `nghịch đảo Walden`
- **Chỉnh:** tiến trình phản ứng; nhóm tấn công đến từ phía đối diện nhóm rời đi.

### CHEM_CFT_COMPLEX_3D — Thuyết trường tinh thể
- **Viết:** `CFT d6` · `CFT d4` · `trường tinh thể`
- **Chỉnh:** số electron d, Δ; tách mức t₂g và e_g.

### CHEM_CRYSTAL_LATTICE — Mạng tinh thể
- **Viết:** `FCC` · `BCC` · `mạng tinh thể` · `ô mạng tâm diện`
- **Chỉnh:** xoay ô mạng, mặt Miller.

### CHEM_ORGANIC_SKELETAL — Cyclohexane, cấu dạng
- **Viết:** `cyclohexane ghế` · `cyclohexane thuyền`
- **Chỉnh:** chuyển cấu dạng ghế, thuyền, xoắn.

## 6. Sinh học

### BIO_PHOTOSYNTHESIS — Quang hợp
- **Viết:** `quang hợp` · `photosynthesis`
- **Chỉnh:** nhiệt độ, cường độ sáng; trên 45 °C tốc độ giảm dốc.

### BIO_DNA_HELIX — Nhân đôi ADN
- **Viết:** `ADN` · `DNA` · `helicase`
- **Chỉnh:** mức tháo xoắn của helicase, số vòng xoắn.

### BIO_HEART_CYCLE — Nhịp tim và điện tâm đồ
- **Viết:** `nhịp tim 120 BPM` · `điện tâm đồ` · `ECG` · `BPM = 90`
- **Chỉnh:** nhịp tim 40 đến 180 BPM; chu kì T = 60/BPM, sóng ECG đổi theo.
- **Lưu ý:** số trong câu (`120 BPM`, `BPM = 90`, `nhịp tim 100`) được đọc và kẹp trong 40 đến 180.

### BIO_PUNNETT_SQUARE — Bảng Punnett, lai Menđen
- **Viết:** `P: AaBb × AaBb` · `Aa x aa` · `AaBb x aabb`
- **Chỉnh:** hoán vị gen f; tỉ lệ 9:3:3:1 khi phân li độc lập.
- **Lưu ý:** hai kiểu gen cùng số cặp gen, cùng chữ cái.

### BIO_HARDY_WEINBERG — Cân bằng di truyền quần thể
- **Viết:** `0,04AA + 0,32Aa + 0,64aa = 1` · `4% AA, 32% Aa, 64% aa`
- **Chỉnh:** tần số alen p, q; báo cân bằng hay không.
- **Lưu ý:** nhập hai trong ba tần số thì kiểu gen còn lại tự bù; nhập số cá thể thì chuẩn hóa.

### BIO_STOMATA_GAS — Đóng mở khí khổng
- **Viết:** `khí khổng` · `stomata` · `tế bào bảo vệ`
- **Chỉnh:** nhiệt độ, độ ẩm đất, ánh sáng; trên khoảng 45 °C khí khổng đóng kín.

### BIO_OSMOSIS_CELL — Thẩm thấu, co nguyên sinh
- **Viết:** `thẩm thấu` · `co nguyên sinh ưu trương 3% NaCl` · `hồng cầu nhược trương` · `plasmolysis`
- **Chỉnh:** nồng độ bên ngoài, đổi giữa tế bào thực vật và hồng cầu; hồng cầu trong dung dịch nhược trương thì vỡ.

### BIO_OPERON_LAC — Điều hòa gen: Operon Lac
- **Viết:** `Operon Lac` · `lactose glucose` · `lacZ`
- **Chỉnh:** bật tắt glucose và lactose, chọn đột biến (ví dụ lacI⁻).

### BIO_CELL_RESPIRATION — Hô hấp tế bào, chuỗi truyền electron
- **Viết:** `chuỗi truyền electron ATP synthase` · `ti thể` · `hô hấp tế bào` · `cyanide`
- **Chỉnh:** bật cyanide để chặn chuỗi; quan sát gradient proton và ATP.

### BIO_LOTKA_VOLTERRA — Con mồi và thú săn
- **Viết:** `Lotka-Volterra` · `con mồi săn mồi` · `thỏ và sói`
- **Chỉnh:** tham số tăng trưởng và săn bắt; mặt phẳng pha, trễ pha giữa hai quần thể.

### BIO_CELL_SIGNALING — Truyền tin tế bào, GPCR, apoptosis
- **Viết:** `GPCR apoptosis` · `caspase` · `cAMP`
- **Chỉnh:** gắn phối tử vào thụ thể, theo dõi G-protein, cAMP và chuỗi caspase.

## 7. Mã mô phỏng có trong hệ thống nhưng không có mục riêng

Các mã dưới đây có trong kiểu dữ liệu (`packages/types`) hoặc backend, nhưng không có đường mở riêng từ chữ viết:

- **MATH_CONIC_2D**, **MATH_POLYNOMIAL**: dùng **MATH_GRAPH**. Đường tròn, elip, parabol, đa thức đều viết thành phương trình (ví dụ `x^2/9 + y^2/4 = 1`).
- **MATH_SYMBOLS**: nhãn nội bộ của bộ gõ ký hiệu, không phải mô phỏng.
- **CHEM_MOLECULE_2D3D**: bản cũ của hình học phân tử; dùng **CHEM_MOLECULE_3D** (VSEPR).
- **PHYS_OWN** không phải mã mô phỏng: chỉ là danh sách nội bộ các mô phỏng tự vẽ thanh điều khiển.
- Công thức hoàn toàn lạ: khi có khóa Gemini, backend có thể sinh một hình tương tác riêng theo mô tả (hình SVG tương tác); chất lượng phụ thuộc vào mô tả và không được kiểm tự động.

## 8. Khi bảng mở sai

- Kiểm tra xem chữ có chứa `z` hay không (mặt cầu và đường tròn khác nhau).
- Viết rõ ký hiệu: `z` dễ lẫn `2`, `l` lẫn `1`, `O` lẫn `0`. Bảng có hiện danh sách ký tự nghi ngờ để chạm đổi.
- Thử **gõ** câu thay vì viết tay, nhất là chữ tiếng Việt.
- Nhớ thêm từ khóa tên mô phỏng vào câu: "thấu kính f = 100" tốt hơn "f = 100".
- Câu gồm nhiều ý khác nhau thì tách thành từng lần khoanh.
