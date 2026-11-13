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

### Nhãn đại lượng: Kí hiệu hay Chữ

Mỗi mô phỏng có nút **Kí hiệu / Chữ** ngay dưới bảng điều khiển (nhớ lựa chọn trên máy):

- **Kí hiệu** (mặc định): nhãn dài được rút gọn bằng kí hiệu SGK, ví dụ "Khối lượng riêng chất lỏng" → *ρ* chất lỏng, "Lực đẩy Archimedes…" → *Fₐ*, "Vận tốc ban đầu" → *v₀*. Dòng chú giải bên dưới ghi nghĩa từng kí hiệu (*ρ*: khối lượng riêng · *Fₐ*: lực đẩy Archimedes). Rê chuột lên nhãn luôn thấy tên đầy đủ.
- **Chữ**: hiện nguyên văn, không rút gọn.
- Kí hiệu theo **môn**: Vật lý và Hóa dùng kí hiệu SGK; Sinh chỉ đổi N, K, r của quần thể (vì "tần số" ở Sinh là tần số alen); Toán giữ chữ.
- **Phân biệt được kí hiệu giống nhau:** trong cùng một mô phỏng, hai đại lượng trùng kí hiệu (*P* trọng lượng và *P* công suất, *T* nhiệt độ và *T* chu kì…) tự giữ chữ; hai nhãn rút gọn ra cùng chuỗi cũng giữ nguyên văn.
- Muốn thêm kí hiệu cho môn mới: sửa bảng trong `utils/quantityLabel.ts`; nhãn dài đặc biệt có bản gọn viết tay ở `utils/quantityLabelOverrides.ts`.

## 2. Hình học: vẽ nháp, bảng thay bằng hình chuẩn tại chỗ

Không qua hologram: các nét tay thô được **nắn thẳng và nối lại tại đúng các đỉnh bạn vẽ**, ngay vị trí vẽ. Hình giữ nguyên dáng và tỉ lệ của bạn (hộp dẹt vẫn dẹt, tam giác lệch vẫn lệch); bảng **không** thay bằng một hình mẫu có sẵn.

- **Hình phẳng:** vẽ tam giác (thường, vuông, cân, đều), hình vuông, chữ nhật, bình hành bằng 1 đến 4 nét khép kín. Khoanh rồi bấm nút xanh **Tương tác tại chỗ**. Kéo từng đỉnh thì độ dài cạnh và số đo góc đổi theo; nút **Euler** hiện O, G, H.
- **Khối 3D:** vẽ lập phương, hộp chữ nhật, chóp tứ giác, tứ diện, lăng trụ tam giác, bát diện bằng từ 4 nét trở lên (mặt trước, mặt sau, các cạnh nối). Các nét được nắn thẳng và nối đỉnh theo đúng hình bạn vẽ. Bảng chỉ dùng khối mẫu để **đặt tên đỉnh** (A, B, C, D, A', B'…) và **đoán cạnh khuất để vẽ nét đứt**; nếu hình vẽ lệch quá xa phép chiếu của khối (hoặc thiếu nhiều nét) thì giữ toàn bộ nét liền và đặt tên theo thứ tự.
  - Kéo từng đỉnh để chỉnh lại hình; các cạnh đi theo. Muốn **xoay khối** hoặc khai triển thì bấm ⤢ để mở mô hình 3D đầy đủ.
  - Hình lập phương vẽ tay kiểu người thật (hai hình vuông lệch nhau, chiều sâu khoảng 0,4 đến 0,75 cạnh) được nhận đúng từ 95 đến 100% trên mẫu giả lập; chưa đo trên nét tay thật.
- **Tự động:** Dock → **Hình** → **Trực quan hình học**: vẽ xong chờ khoảng 1 giây, hình tự chuyển, khỏi khoanh.
- Trên mỗi hình: ⠿ di chuyển, ⤢ mở mô phỏng đầy đủ (khai triển, cắt thiết diện, mặt cầu, đường cao), ✕ xóa.
- Cũng có thể **gõ tên khối** (xem `GEO_SOLID` bên dưới).

### Vẽ hình từ đề dài (hình phẳng và đường tròn)

Dán hoặc gõ nguyên đề (kể cả đề chép từ PDF bị ngắt dòng giữa câu, có ký hiệu ⊥, góc, △), khoanh rồi **Trực quan hóa**. Bộ dựng đọc theo từng câu và dựng đủ điểm:

- **Đường tròn:** điểm trên cung ("lấy điểm M bất kì trên cung nhỏ AB", "C thuộc nửa đường tròn"), điểm chính giữa cung, dây, đường kính ("kẻ đường kính AK", "qua N kẻ đường kính CD"), dây vuông góc đường kính, cát tuyến, tiếp tuyến tại một điểm hoặc kẻ từ điểm ngoài, giao điểm thứ hai của đường thẳng với đường tròn, "tam giác ABC nội tiếp (O)" (đường tròn ngoại tiếp, O là tâm).
- **Đường phụ:** đường cao hàng loạt ("AD, BE, CF là ba đường cao"), chân vuông góc, trung điểm, phân giác cắt cạnh, đường qua một điểm song song hoặc vuông góc với đoạn khác, điểm đối xứng, điểm trên tia với AD = AB.
- **Chia phần a), b), c) hoặc 1., 2., 3. (cả `a/ b/ c/`):** nút từng phần ngay dưới hình. **Bấm một nút = vẽ hình tới phần đó**; bấm lại phần cuối đang hiện thì lùi một phần; giữ **Shift** khi bấm để bật/tắt riêng từng phần.
- **Kéo đỉnh vẫn giữ tính chất:** tứ giác nội tiếp, tam giác nội tiếp, hình có đường kính, vuông góc, song song; điểm dựng thêm (giao điểm, chân đường vuông góc, hình bình hành…) tự đi theo.
- **Chữ tên đỉnh:** tự nằm vào khe trống giữa các nét (không đè lên cạnh). Có thể **kéo chữ** dời đi, nhưng chỉ trong khoảng gần đỉnh (có nét chấm nối về đỉnh); bấm đúp để về chỗ cũ.
- **Gợi ý vẽ thêm để giải:** mở **Dụng cụ → Gợi ý**, chọn phần của đề; bộ gợi ý hỏi theo bước và đề xuất đường phụ (vẽ đường tròn qua ba điểm, nối hai điểm, trung điểm…). Đọc được các yêu cầu: vuông góc, song song, bằng nhau, tỉ số, tích hai đoạn (AH·AP = AI·AB), tứ giác nội tiếp, đồng dạng, trung điểm, tiếp tuyến, hình bình hành, tam giác cân hoặc vuông.
- **Giới hạn:** điều kiện số liệu ("AH = R√2", "AB < AC", "góc 60°") không ép lên hình; hình chỉ có đường tròn mà không có đường kính hoặc tam giác là hình tĩnh (điểm trên đó không kéo được). Đề có lỗi chính tả ("tiểp", "cẳt") có thể bị bỏ sót.

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

### MATH_UNIT_CIRCLE — Đường tròn lượng giác
- **Viết:** `đường tròn lượng giác` · `giá trị lượng giác của góc α` · `cung liên quan đặc biệt`
- **Chỉnh:** kéo thanh trượt Góc α; Giải sin x = m, m =; bật/tắt Cung liên quan (π−α, α+π, −α); Giải phương trình sin x = m.

### MATH_TRIANGLE_SOLVER — Giải tam giác (định lí sin, cos, trường hợp hai nghiệm)
- **Viết:** `giải tam giác` · `định lí cosin và định lí sin` · `công thức Heron tính diện tích`
- **Chỉnh:** chọn cho biết; kéo thanh trượt Cạnh a (chỉ khi cho a, b, A); Cạnh b; Cạnh c (chỉ khi cho b, c, A); Góc A.

### MATH_VECTOR_2D — Vectơ trong mặt phẳng: tổng, hiệu, tích vô hướng
- **Viết:** `tổng và hiệu hai vectơ` · `tích vô hướng của hai vectơ` · `tọa độ của vectơ`
- **Chỉnh:** kéo thanh trượt a: hoành độ; a: tung độ; b: hoành độ; b: tung độ; bật/tắt Tổng a + b; Hiệu a − b; Hình chiếu của b lên a.

### MATH_VECTOR_3D — Vectơ trong không gian Oxyz: tích có hướng
- **Viết:** `tích có hướng của hai vectơ` · `tích có hướng và diện tích hình bình hành`
- **Chỉnh:** kéo thanh trượt a: x; a: y; a: z; b: x; b: y; b: z; bật/tắt Tích có hướng [a, b].

### MATH_ANALYTIC_LINE_CIRCLE — Đường thẳng và đường tròn trong mặt phẳng Oxy
- **Viết:** `vị trí tương đối của đường thẳng và đường tròn` · `khoảng cách từ điểm đến đường thẳng` · `phương trình đường tròn`
- **Chỉnh:** kéo thanh trượt Đường thẳng Ax+By+C=0: A; B; C; Tâm I: hoành độ; Tâm I: tung độ; Bán kính R.

### MATH_CONIC_LAB — Ba đường conic: elip, hypebol, parabol
- **Viết:** `elip và tiêu điểm` · `hypebol` · `parabol tiêu điểm đường chuẩn` · `đường conic`
- **Chỉnh:** chọn đường conic; kéo thanh trượt a (nửa trục lớn / thực); b (nửa trục bé / ảo); p (tham số tiêu parabol); Vị trí điểm M.

### MATH_SET_LOGIC — Tập hợp, biểu đồ Venn, khoảng trên trục số và bảng chân trị
- **Viết:** `biểu đồ Venn` · `hợp và giao của hai tập hợp` · `bảng chân trị mệnh đề kéo theo` · `giao hai khoảng trên trục số`
- **Chỉnh:** chọn tô miền; kéo thanh trượt n(A); n(B); n(A ∩ B); A = [a₁; a₂]: a₁; a₂; B = (b₁; b₂): b₁; b₂.

### MATH_COUNTING_TREE — Quy tắc đếm, hoán vị, chỉnh hợp, tổ hợp và tam giác Pascal
- **Viết:** `quy tắc cộng quy tắc nhân` · `hoán vị chỉnh hợp tổ hợp` · `tam giác Pascal` · `nhị thức Newton`
- **Chỉnh:** chọn hình; kéo thanh trượt n; k; Số cách chọn bước 1 (cây); Số cách chọn bước 2 (cây).

### MATH_STAT_DESCRIPTIVE — Thống kê mô tả: số trung bình, trung vị, tứ phân vị, độ lệch chuẩn
- **Viết:** `thống kê mô tả` · `độ lệch chuẩn và phương sai` · `tứ phân vị của mẫu số liệu` · `mẫu số liệu ghép nhóm`
- **Chỉnh:** kéo thanh trượt Số nhóm của biểu đồ cột; nhập mẫu số liệu.

### MATH_APPROX_ERROR — Số gần đúng và sai số
- **Viết:** `số gần đúng và sai số` · `sai số tuyệt đối sai số tương đối` · `quy tròn số gần đúng`
- **Chỉnh:** chọn giá trị đúng; kéo thanh trượt Quy tròn đến chữ số thập phân thứ.

### MATH_SEQUENCE_LAB — Dãy số: cấp số cộng, cấp số nhân, giới hạn của dãy
- **Viết:** `cấp số cộng` · `cấp số nhân` · `giới hạn của dãy số` · `tổng cấp số nhân lùi vô hạn`
- **Chỉnh:** chọn dãy; kéo thanh trượt u₁; d hoặc q; Số số hạng vẽ; ε (dãy có giới hạn).

### MATH_LIMIT_CONTINUITY — Giới hạn hàm số theo ε–δ và tính liên tục
- **Viết:** `giới hạn hàm số` · `hàm số liên tục tại một điểm` · `tiệm cận đứng và tiệm cận ngang`
- **Chỉnh:** chọn hàm số; kéo thanh trượt ε.

### MATH_SPACE_RELATIONS — Quan hệ trong không gian: góc và khoảng cách trên hình lập phương
- **Viết:** `góc giữa đường thẳng và mặt phẳng` · `góc nhị diện` · `khoảng cách hai đường thẳng chéo nhau`
- **Chỉnh:** chọn bài toán; kéo thanh trượt Cạnh hình lập phương a.

### MATH_DERIVATIVE_LAB — Đạo hàm: từ cát tuyến đến tiếp tuyến
- **Viết:** `định nghĩa đạo hàm` · `ý nghĩa hình học của đạo hàm` · `từ cát tuyến đến tiếp tuyến`
- **Chỉnh:** chọn hàm số; kéo thanh trượt x₀; h (khoảng cách tới điểm thứ hai).

### MATH_FUNCTION_STUDY — Khảo sát và vẽ đồ thị hàm số theo từng bước
- **Viết:** `khảo sát hàm số` · `các bước khảo sát và vẽ đồ thị`
- **Chỉnh:** chọn hàm số; kéo thanh trượt Bước (1 TXĐ · 2 y′ · 3 BBT · 4 tiệm cận · 5 đồ thị).

### MATH_INTEGRAL_AREA — Tích phân và diện tích: tổng Riemann hội tụ về tích phân
- **Viết:** `diện tích dưới đường cong` · `tích phân xác định` · `hình thang và hình chữ nhật xấp xỉ diện tích`
- **Chỉnh:** chọn hàm số; điểm đại diện; kéo thanh trượt Số phần chia n.

### MATH_QUADRIC_SURFACES — Mặt bậc hai và dải Möbius
- **Viết:** `mặt bậc hai` · `elipxoit hypeboloit paraboloit` · `dải Möbius`
- **Chỉnh:** chọn mặt; kéo thanh trượt Xoay quanh trục z; Độ nghiêng nhìn; nút Chạy/Dừng và thanh thời gian.

### MATH_QUADRATIC — Hàm số bậc hai, parabol và dấu tam thức
- **Viết:** `hàm số bậc hai` · `dấu của tam thức bậc hai` · `bất phương trình bậc hai` · `đỉnh của parabol`
- **Chỉnh:** kéo thanh trượt a; b; c; kéo con trỏ trên trục hoành để đọc giá trị các đường.

### MATH_EXP_LOG — Hàm số mũ và hàm số lôgarit
- **Viết:** `hàm số mũ` · `hàm số lôgarit` · `đồ thị hàm mũ và lôgarit đối xứng`
- **Chỉnh:** kéo thanh trượt Cơ số a; Giải aˣ = b, b =; kéo con trỏ trên trục hoành để đọc giá trị các đường.

### MATH_OPTIMIZATION — Bài toán tối ưu: làm hộp có thể tích lớn nhất
- **Viết:** `bài toán tối ưu` · `làm hộp không nắp thể tích lớn nhất` · `cắt bốn góc tấm tôn`
- **Chỉnh:** kéo thanh trượt Cạnh tấm vuông a; kéo con trỏ trên trục hoành để đọc giá trị các đường.

### MATH_FINANCE_GROWTH — Lãi đơn, lãi kép và tăng trưởng
- **Viết:** `lãi kép` · `lãi đơn và lãi kép` · `gửi tiết kiệm lãi suất ngân hàng`
- **Chỉnh:** kéo thanh trượt Số tiền gửi ban đầu; Lãi suất mỗi năm; kéo con trỏ trên trục hoành để đọc giá trị các đường.

### MATH_PROBABILITY_LAB — Phòng thí nghiệm xác suất: tần suất, luật số lớn, Monty Hall, Bayes
- **Viết:** `xác suất` · `luật số lớn` · `tung đồng xu và xúc xắc` · `Monty Hall` · `công thức Bayes`
- **Chỉnh:** bấm +1, +10, +100, +1000 để thử nhiều lần, "Làm lại" để xóa; chạm một dòng kết quả để xem tần suất tích lũy của nó so với xác suất lí thuyết; chọn thí nghiệm; monty hall: chiến lược; kéo Đồng xu: P(sấp) · Túi: tỉ lệ bi đỏ; Tỉ lệ người mắc bệnh; Độ nhạy của xét nghiệm; Độ đặc hiệu.

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

### PHYS_RADIOACTIVE_DECAY — Phân rã phóng xạ, chu kì bán rã
- **Viết:** `chu kì bán rã` · `phân rã phóng xạ` · `định tuổi bằng carbon-14`
- **Chỉnh:** chu kì bán rã T (mặc định 5730 năm, C-14), tỉ lệ còn lại để định tuổi mẫu; con trỏ thời gian đọc N/N₀ tại mọi t.

### PHYS_KINEMATICS_1D — Chuyển động thẳng: đồ thị độ dịch chuyển–thời gian và vận tốc–thời gian
- **Viết:** `đồ thị độ dịch chuyển thời gian` · `chuyển động thẳng biến đổi đều` · `rơi tự do` · `ống Newton`
- **Chỉnh:** chọn chuyển động; kéo thanh trượt Vận tốc ban đầu; Gia tốc; Độ cao rơi; nút Chạy/Dừng và thanh thời gian.

### PHYS_RELATIVE_VELOCITY — Tổng hợp vận tốc: thuyền qua sông
- **Viết:** `tổng hợp vận tốc` · `công thức cộng vận tốc` · `vận tốc kéo theo`
- **Chỉnh:** kéo thanh trượt Vận tốc thuyền so với nước; Vận tốc dòng nước; Góc lái so với phương vuông góc bờ (+ xuôi dòng); Chiều rộng sông; nút Chạy/Dừng và thanh thời gian.

### PHYS_MEASUREMENT_ERROR — Sai số phép đo
- **Viết:** `sai số phép đo` · `sai số dụng cụ và sai số ngẫu nhiên` · `đo nhiều lần lấy giá trị trung bình`
- **Chỉnh:** kéo thanh trượt Số lần đo; Độ chia nhỏ nhất; Dao động ngẫu nhiên khi đo.

### PHYS_FORCE_COMPOSITION — Tổng hợp, phân tích lực và cân bằng của ba lực
- **Viết:** `tổng hợp lực` · `phân tích lực` · `cân bằng của vật chịu tác dụng của ba lực` · `hợp lực của hai lực`
- **Chỉnh:** chọn bài toán; kéo thanh trượt F₁ hoặc trọng lượng P; F₂ (khi tổng hợp); Góc giữa F₁, F₂ · hoặc góc dây trái so với phương thẳng đứng; Góc dây phải so với phương thẳng đứng (khi treo).

### PHYS_MOMENT_LEVER — Moment lực, đòn bẩy và điều kiện cân bằng
- **Viết:** `moment lực` · `đòn bẩy` · `điều kiện cân bằng của vật có trục quay` · `ngẫu lực`
- **Chỉnh:** kéo thanh trượt Vật trái m₁; Cách điểm tựa d₁; Vật phải m₂; Cách điểm tựa d₂.

### PHYS_NEWTON_LAWS — Định luật II Newton: xe có ma sát và máy Atwood
- **Viết:** `định luật II Newton` · `máy Atwood` · `lực ma sát trượt và gia tốc`
- **Chỉnh:** chọn hệ; kéo thanh trượt Lực kéo F (xe); Khối lượng xe m (hoặc m₁ ở máy Atwood); Hệ số ma sát μ; m₂ (máy Atwood); nút Chạy/Dừng và thanh thời gian.

### PHYS_SPRING_HOOKE — Lò xo, định luật Hooke và ghép lò xo
- **Viết:** `định luật Hooke` · `độ cứng của lò xo` · `ghép lò xo nối tiếp song song`
- **Chỉnh:** chọn cách ghép; kéo thanh trượt k₁; k₂; Khối lượng treo.

### PHYS_FLUID_PRESSURE — Áp suất chất lỏng và lực đẩy Archimedes
- **Viết:** `áp suất chất lỏng` · `lực đẩy Archimedes` · `vật nổi vật chìm`
- **Chỉnh:** kéo thanh trượt Khối lượng riêng chất lỏng; Khối lượng riêng vật; Độ sâu điểm xét.

### PHYS_WORK_ENERGY — Công, năng lượng và bảo toàn cơ năng khi trượt xuống dốc
- **Viết:** `bảo toàn cơ năng` · `động năng và thế năng` · `công của lực ma sát` · `hiệu suất của máy`
- **Chỉnh:** kéo thanh trượt Độ cao ban đầu; Góc nghiêng; Hệ số ma sát μ; Khối lượng; nút Chạy/Dừng và thanh thời gian.

### PHYS_COLLISION_1D — Va chạm một chiều: bảo toàn động lượng
- **Viết:** `va chạm một chiều` · `định luật bảo toàn động lượng` · `va chạm đàn hồi và va chạm mềm` · `con lắc Newton`
- **Chỉnh:** kéo thanh trượt m₁; m₂; v₁; v₂; Hệ số phục hồi e (0 mềm, 1 đàn hồi); nút Chạy/Dừng và thanh thời gian.

### PHYS_CIRCULAR_MOTION — Chuyển động tròn đều, lực hướng tâm và vệ tinh
- **Viết:** `chuyển động tròn đều` · `lực hướng tâm` · `gia tốc hướng tâm` · `vệ tinh nhân tạo`
- **Chỉnh:** chọn mô hình; kéo thanh trượt Bán kính quỹ đạo; Chu kì quay; Khối lượng vật; Độ cao vệ tinh; nút Chạy/Dừng và thanh thời gian.

### PHYS_EM_WAVE_3D — Sóng điện từ trong không gian: E vuông góc B vuông góc phương truyền
- **Viết:** `sự lan truyền của sóng điện từ` · `sóng điện từ 3D` · `vectơ E vuông góc B` · `điện trường và từ trường biến thiên`
- **Chỉnh:** kéo thanh trượt Bước sóng λ; Biên độ điện trường E₀; Xoay hình (ngang); Nhìn từ trên xuống; bật/tắt E, B và các mũi tên; nút Chạy/Dừng.

### PHYS_EARTH_SEASONS — Trái Đất nghiêng 23,5°: ngày – đêm và các mùa
- **Viết:** `Trái Đất nghiêng` · `ngày đêm và các mùa` · `độ dài ngày đêm` · `góc nghiêng của trục Trái Đất`
- **Chỉnh:** kéo thanh trượt Ngày trong năm; Vĩ độ quan sát; Độ nghiêng trục (thử 0° để thấy không còn mùa); Xoay quỹ đạo.

### PHYS_NEWTON_CRADLE — Con lắc Newton: bảo toàn động lượng và năng lượng
- **Viết:** `quả lắc Newton` · `Newton cradle` · `các quả cầu treo va chạm` · `bộ quả cầu treo của Newton`
- **Chỉnh:** kéo thanh trượt Số quả nâng lên; Góc nâng ban đầu; Chiều dài dây; Hao hụt năng lượng mỗi lần va chạm; Xoay hình; nút Chạy/Dừng.

### PHYS_SHM — Dao động điều hòa của con lắc lò xo
- **Viết:** `con lắc lò xo` · `dao động tắt dần` · `cơ năng của dao động` · `li độ và vận tốc`
- **Chỉnh:** kéo thanh trượt Biên độ A; Chu kì T; Pha ban đầu φ; Hệ số tắt dần; nút Chạy/Dừng và thanh thời gian.

### PHYS_WAVE_MECH — Sóng cơ: sóng ngang, sóng dọc và sóng dừng
- **Viết:** `sóng cơ` · `sóng ngang và sóng dọc` · `sóng dừng` · `bước sóng`
- **Chỉnh:** chọn loại sóng; kéo thanh trượt Bước sóng λ; Tần số f; Biên độ; nút Chạy/Dừng và thanh thời gian.

### PHYS_ELECTRIC_FIELD — Điện trường, đường sức và định luật Coulomb
- **Viết:** `định luật Coulomb` · `đường sức điện` · `cường độ điện trường` · `điện tích điểm`
- **Chỉnh:** kéo thanh trượt Điện tích q₁; Điện tích q₂; Khoảng cách.

### PHYS_DC_CIRCUIT — Mạch điện một chiều: định luật Ohm cho toàn mạch
- **Viết:** `định luật Ohm cho toàn mạch` · `suất điện động và điện trở trong` · `mạch nối tiếp và song song`
- **Chỉnh:** chọn mắc điện trở; kéo thanh trượt Suất điện động E; Điện trở trong r; R₁; R₂; nút Chạy/Dừng và thanh thời gian.

### PHYS_OSCILLOSCOPE — Dao động kí điện tử: đọc chu kì và biên độ
- **Viết:** `dao động kí` · `đọc chu kì trên màn hình dao động kí` · `thang thời gian ms/div`
- **Chỉnh:** kéo thanh trượt Tần số tín hiệu; Biên độ tín hiệu; Thang điện áp; Thang thời gian.

### PHYS_KINETIC_GAS_PARTICLES — Mô hình động học phân tử của chất khí
- **Viết:** `mô hình động học phân tử` · `chuyển động nhiệt của phân tử khí` · `phương trình Clapeyron` · `tốc độ căn quân phương`
- **Chỉnh:** kéo thanh trượt Nhiệt độ; Chiều rộng bình (thể tích); Số hạt; nút Chạy/Dừng và thanh thời gian.

### PHYS_STATES_OF_MATTER — Mô hình phân tử của chất rắn, lỏng, khí và sự chuyển thể
- **Viết:** `cấu tạo chất` · `mô hình phân tử của chất rắn lỏng khí` · `sự chuyển thể` · `nội năng của vật`
- **Chỉnh:** kéo thanh trượt Nhiệt độ của nước; nút Chạy/Dừng và thanh thời gian.

### PHYS_MAGNETIC_FIELD — Từ trường: lực Lorentz và từ trường của dòng điện thẳng
- **Viết:** `lực Lorentz` · `từ trường của dòng điện thẳng` · `quy tắc bàn tay phải` · `đường sức từ`
- **Chỉnh:** chọn hiện tượng; kéo thanh trượt Tốc độ electron; Cảm ứng từ B; Dòng I₁ (dây thẳng); Dòng I₂; Khoảng cách hai dây; bật/tắt Hạt mang điện dương; nút Chạy/Dừng và thanh thời gian.

### PHYS_EM_INDUCTION — Cảm ứng điện từ: từ thông và suất điện động của khung dây quay
- **Viết:** `cảm ứng điện từ` · `định luật Faraday` · `định luật Lenz` · `máy phát điện xoay chiều`
- **Chỉnh:** kéo thanh trượt Cảm ứng từ B; Số vòng dây N; Diện tích khung S; Tần số quay; nút Chạy/Dừng và thanh thời gian.

### PHYS_ALPHA_SCATTERING — Thí nghiệm tán xạ hạt α của Rutherford
- **Viết:** `tán xạ hạt alpha` · `thí nghiệm Rutherford` · `mẫu hành tinh nguyên tử` · `cấu tạo hạt nhân`
- **Chỉnh:** kéo thanh trượt Số proton của bia (Z); Động năng hạt α; bật/tắt Mẫu Thomson (điện tích trải đều).

### PHYS_FISSION_REACTOR — Phân hạch dây chuyền và thanh điều khiển lò phản ứng
- **Viết:** `phân hạch` · `phản ứng dây chuyền` · `lò phản ứng hạt nhân` · `thanh điều khiển`
- **Chỉnh:** kéo thanh trượt Hệ số nhân khi chưa có thanh điều khiển; Thanh điều khiển cắm sâu; Số thế hệ.

### PHYS_YOUNG_INTERFERENCE — Giao thoa ánh sáng Young
- **Viết:** `giao thoa Young` · `khoảng vân` · `vân sáng vân tối` · `thí nghiệm Young`
- **Chỉnh:** kéo thanh trượt Bước sóng λ; Khoảng cách hai khe a; Khoảng cách tới màn D; kéo con trỏ trên trục hoành để đọc giá trị các đường.

### PHYS_CAPACITOR — Tụ điện: điện tích, năng lượng và ghép tụ
- **Viết:** `tụ điện` · `điện dung của tụ` · `năng lượng của tụ điện` · `ghép tụ điện`
- **Chỉnh:** kéo thanh trượt Điện dung C₁; Điện dung C₂ (để ghép); kéo con trỏ trên trục hoành để đọc giá trị các đường.

### PHYS_HEAT_CALORIMETRY — Đồ thị đun nóng nước đá: nhiệt dung riêng và nhiệt nóng chảy, hóa hơi
- **Viết:** `nhiệt dung riêng` · `nhiệt nóng chảy riêng` · `nhiệt lượng cân bằng nhiệt` · `đồ thị chuyển thể của nước đá`
- **Chỉnh:** kéo thanh trượt Khối lượng nước đá; kéo con trỏ trên trục hoành để đọc giá trị các đường.

### PHYS_THERMOMETER — Nhiệt độ và các thang đo: Celsius, Kelvin, Fahrenheit
- **Viết:** `thang nhiệt độ` · `nhiệt độ tuyệt đối` · `nhiệt kế` · `thang Celsius Kelvin Fahrenheit`
- **Chỉnh:** kéo thanh trượt Nhiệt độ cần đổi; kéo con trỏ trên trục hoành để đọc giá trị các đường.

### PHYS_TRANSFORMER_GRID — Máy biến áp và hao phí khi truyền tải điện
- **Viết:** `máy biến áp` · `hao phí khi truyền tải điện` · `truyền tải điện năng đi xa`
- **Chỉnh:** kéo thanh trượt Công suất truyền tải; Điện trở đường dây; Tỉ số vòng N₂/N₁ của máy biến áp; Điện áp cuộn sơ cấp; kéo con trỏ trên trục hoành để đọc giá trị các đường.

### PHYS_NUCLEAR_BINDING — Năng lượng liên kết riêng của hạt nhân
- **Viết:** `năng lượng liên kết riêng` · `độ hụt khối` · `phản ứng nhiệt hạch` · `độ bền vững của hạt nhân`
- **Chỉnh:** kéo thanh trượt ; kéo con trỏ trên trục hoành để đọc giá trị các đường.

### PHYS_EM_SPECTRUM — Thang sóng điện từ
- **Viết:** `thang sóng điện từ` · `phổ sóng điện từ` · `tia hồng ngoại và tử ngoại`
- **Chỉnh:** chạm một ô để xem chi tiết; tô màu theo nhóm hoặc theo bước sóng (thang log).

### PHYS_LAB_BENCH — Phòng thực hành Vật lí ảo: đo đạc, bảng số liệu, đồ thị và sai số
- **Viết:** `phòng thực hành vật lí ảo` · `tiết thực hành vật lí` · `thực hành vật lí`
- **Chỉnh:** chỉnh dụng cụ và đại lượng đặt (thanh trượt, ô chọn); bấm "Đo" nhiều lần, mỗi lần số khác nhau; xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### PHYS_LAB_SAFETY — Thực hành: Quy tắc an toàn trong phòng thực hành Vật lí
- **Viết:** `thực hành quy tắc an toàn trong phòng thực hành vật lí`
- **Chỉnh:** chỉnh dụng cụ và đại lượng đặt (thanh trượt, ô chọn); bấm "Đo" nhiều lần, mỗi lần số khác nhau; xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### PHYS_LAB_ERROR_MEASURE — Thực hành: Thực hành tính sai số trong phép đo, ghi kết quả đo
- **Viết:** `thực hành tính sai số trong phép đo` · `thực hành ghi kết quả đo thước kẹp`
- **Chỉnh:** chỉnh dụng cụ và đại lượng đặt (thanh trượt, ô chọn); bấm "Đo" nhiều lần, mỗi lần số khác nhau; xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### PHYS_LAB_SPEED — Thực hành: Thực hành đo tốc độ của vật chuyển động
- **Viết:** `thực hành đo tốc độ của vật chuyển động` · `thí nghiệm đo tốc độ xe bằng cổng quang điện`
- **Chỉnh:** chỉnh dụng cụ và đại lượng đặt (thanh trượt, ô chọn); bấm "Đo" nhiều lần, mỗi lần số khác nhau; xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### PHYS_LAB_FREE_FALL_G — Thực hành: Thực hành đo gia tốc rơi tự do
- **Viết:** `thực hành đo gia tốc rơi tự do` · `thí nghiệm đo g bằng cổng quang điện`
- **Chỉnh:** chỉnh dụng cụ và đại lượng đặt (thanh trượt, ô chọn); bấm "Đo" nhiều lần, mỗi lần số khác nhau; xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### PHYS_LAB_FORCE_COMPOSITION — Thực hành: Thực hành tổng hợp lực
- **Viết:** `thực hành tổng hợp lực` · `thí nghiệm tổng hợp hai lực đồng quy bằng lực kế`
- **Chỉnh:** chỉnh dụng cụ và đại lượng đặt (thanh trượt, ô chọn); bấm "Đo" nhiều lần, mỗi lần số khác nhau; xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### PHYS_LAB_COLLISION_MOMENTUM — Thực hành: Thực hành xác định động lượng của vật trước và sau va chạm
- **Viết:** `thực hành xác định động lượng của vật trước và sau va chạm` · `thí nghiệm bảo toàn động lượng bằng đệm khí`
- **Chỉnh:** chỉnh dụng cụ và đại lượng đặt (thanh trượt, ô chọn); bấm "Đo" nhiều lần, mỗi lần số khác nhau; xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### PHYS_LAB_SOUND_FREQUENCY — Thực hành: Thực hành đo tần số của sóng âm
- **Viết:** `thực hành đo tần số của sóng âm` · `thí nghiệm đo tần số âm thoa bằng dao động kí`
- **Chỉnh:** chỉnh dụng cụ và đại lượng đặt (thanh trượt, ô chọn); bấm "Đo" nhiều lần, mỗi lần số khác nhau; xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### PHYS_LAB_SOUND_SPEED — Thực hành: Thực hành đo tốc độ truyền âm
- **Viết:** `thực hành đo tốc độ truyền âm` · `thí nghiệm đo tốc độ âm bằng ống cộng hưởng`
- **Chỉnh:** chỉnh dụng cụ và đại lượng đặt (thanh trượt, ô chọn); bấm "Đo" nhiều lần, mỗi lần số khác nhau; xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### PHYS_LAB_EMF_INTERNAL_R — Thực hành: Thực hành đo suất điện động và điện trở trong của pin điện hóa
- **Viết:** `thực hành đo E và r của pin bằng biến trở` · `thí nghiệm xác định E và r của pin`
- **Chỉnh:** chỉnh dụng cụ và đại lượng đặt (thanh trượt, ô chọn); bấm "Đo" nhiều lần, mỗi lần số khác nhau; xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### PHYS_LAB_NEWTON2 — Thực hành: Thí nghiệm định luật II Newton: gia tốc theo lực
- **Viết:** `thí nghiệm định luật II Newton đo gia tốc theo lực` · `thí nghiệm kiểm chứng định luật 2 Newton bằng xe và cổng quang`
- **Chỉnh:** chỉnh dụng cụ và đại lượng đặt (thanh trượt, ô chọn); bấm "Đo" nhiều lần, mỗi lần số khác nhau; xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### PHYS_LAB_FRICTION — Thực hành: Thí nghiệm lực ma sát trượt: xác định hệ số ma sát
- **Viết:** `thí nghiệm lực ma sát trượt` · `thí nghiệm xác định hệ số ma sát bằng lực kế`
- **Chỉnh:** chỉnh dụng cụ và đại lượng đặt (thanh trượt, ô chọn); bấm "Đo" nhiều lần, mỗi lần số khác nhau; xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### PHYS_LAB_HOOKE — Thực hành: Thí nghiệm định luật Hooke: xác định độ cứng lò xo
- **Viết:** `thí nghiệm định luật Hooke` · `thí nghiệm xác định độ cứng lò xo bằng thí nghiệm`
- **Chỉnh:** chỉnh dụng cụ và đại lượng đặt (thanh trượt, ô chọn); bấm "Đo" nhiều lần, mỗi lần số khác nhau; xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### PHYS_LAB_PENDULUM_G — Thực hành: Thí nghiệm con lắc đơn: xác định gia tốc trọng trường
- **Viết:** `thí nghiệm con lắc đơn xác định gia tốc trọng trường` · `thí nghiệm đo g bằng con lắc đơn`
- **Chỉnh:** chỉnh dụng cụ và đại lượng đặt (thanh trượt, ô chọn); bấm "Đo" nhiều lần, mỗi lần số khác nhau; xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### PHYS_LAB_BOYLE — Thực hành: Thí nghiệm định luật Boyle
- **Viết:** `thí nghiệm định luật Boyle` · `thí nghiệm kiểm chứng định luật Boyle bằng xi lanh`
- **Chỉnh:** chỉnh dụng cụ và đại lượng đặt (thanh trượt, ô chọn); bấm "Đo" nhiều lần, mỗi lần số khác nhau; xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### PHYS_LAB_OHM_LAW — Thực hành: Thí nghiệm định luật Ohm: đặc tuyến vôn–ampe của điện trở
- **Viết:** `thí nghiệm định luật Ohm` · `thí nghiệm đặc tuyến vôn ampe của điện trở`
- **Chỉnh:** chỉnh dụng cụ và đại lượng đặt (thanh trượt, ô chọn); bấm "Đo" nhiều lần, mỗi lần số khác nhau; xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### PHYS_LAB_SPECIFIC_HEAT — Thực hành: Thí nghiệm xác định nhiệt dung riêng của nước
- **Viết:** `thí nghiệm xác định nhiệt dung riêng của nước` · `thí nghiệm đo nhiệt dung riêng bằng điện trở nhiệt`
- **Chỉnh:** chỉnh dụng cụ và đại lượng đặt (thanh trượt, ô chọn); bấm "Đo" nhiều lần, mỗi lần số khác nhau; xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### PHYS_LAB_CHARLES — Thực hành: Thí nghiệm định luật Charles: thể tích khí theo nhiệt độ
- **Viết:** `thí nghiệm định luật Charles` · `thí nghiệm kiểm chứng định luật Charles`
- **Chỉnh:** chỉnh dụng cụ và đại lượng đặt (thanh trượt, ô chọn); bấm "Đo" nhiều lần, mỗi lần số khác nhau; xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### PHYS_LAB_MAGNETIC_FORCE — Thực hành: Thí nghiệm lực từ tác dụng lên dây dẫn mang dòng điện
- **Viết:** `thí nghiệm lực từ tác dụng lên dây dẫn mang dòng điện` · `thí nghiệm đo cảm ứng từ bằng lực từ`
- **Chỉnh:** chỉnh dụng cụ và đại lượng đặt (thanh trượt, ô chọn); bấm "Đo" nhiều lần, mỗi lần số khác nhau; xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### PHYS_LAB_EM_INDUCTION — Thực hành: Thí nghiệm cảm ứng điện từ: suất điện động khi nam châm chuyển động
- **Viết:** `thí nghiệm cảm ứng điện từ` · `thí nghiệm nam châm đưa vào cuộn dây`
- **Chỉnh:** chỉnh dụng cụ và đại lượng đặt (thanh trượt, ô chọn); bấm "Đo" nhiều lần, mỗi lần số khác nhau; xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### PHYS_LAB_WAVE_INTERFERENCE — Thực hành: Thí nghiệm giao thoa sóng mặt nước
- **Viết:** `thí nghiệm giao thoa sóng mặt nước` · `thí nghiệm đo bước sóng bằng giao thoa sóng nước`
- **Chỉnh:** chỉnh dụng cụ và đại lượng đặt (thanh trượt, ô chọn); bấm "Đo" nhiều lần, mỗi lần số khác nhau; xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### PHYS_LAB_STANDING_WAVE — Thực hành: Thí nghiệm sóng dừng trên sợi dây
- **Viết:** `thí nghiệm sóng dừng trên sợi dây` · `thí nghiệm đo tốc độ sóng bằng sóng dừng`
- **Chỉnh:** chỉnh dụng cụ và đại lượng đặt (thanh trượt, ô chọn); bấm "Đo" nhiều lần, mỗi lần số khác nhau; xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### PHYS_LAB_CAPACITOR_RC — Thực hành: Thí nghiệm nạp tụ điện qua điện trở: hằng số thời gian RC
- **Viết:** `thí nghiệm nạp tụ điện qua điện trở` · `thí nghiệm hằng số thời gian RC của tụ điện`
- **Chỉnh:** chỉnh dụng cụ và đại lượng đặt (thanh trượt, ô chọn); bấm "Đo" nhiều lần, mỗi lần số khác nhau; xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### PHYS_LAB_LATENT_HEAT_FUSION — Thực hành: Thí nghiệm xác định nhiệt nóng chảy riêng của nước đá
- **Viết:** `thí nghiệm xác định nhiệt nóng chảy riêng của nước đá` · `thí nghiệm nước đá thả vào nước ấm cân bằng nhiệt`
- **Chỉnh:** chỉnh dụng cụ và đại lượng đặt (thanh trượt, ô chọn); bấm "Đo" nhiều lần, mỗi lần số khác nhau; xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### PHYS_LAB_LEVER_MOMENT — Thực hành: Thí nghiệm moment lực: điều kiện cân bằng của đòn bẩy
- **Viết:** `thí nghiệm moment lực` · `thí nghiệm điều kiện cân bằng của đòn bẩy`
- **Chỉnh:** chỉnh dụng cụ và đại lượng đặt (thanh trượt, ô chọn); bấm "Đo" nhiều lần, mỗi lần số khác nhau; xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### PHYS_LAB_PROJECTILE_HORIZONTAL — Thực hành: Thí nghiệm chuyển động ném ngang
- **Viết:** `thí nghiệm chuyển động ném ngang` · `thí nghiệm đo tầm xa của vật ném ngang`
- **Chỉnh:** chỉnh dụng cụ và đại lượng đặt (thanh trượt, ô chọn); bấm "Đo" nhiều lần, mỗi lần số khác nhau; xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### PHYS_LAB_TRANSFORMER — Thực hành: Thí nghiệm máy biến áp: tỉ số điện áp và số vòng dây
- **Viết:** `thí nghiệm máy biến áp` · `thí nghiệm tỉ số điện áp và số vòng dây của máy biến áp`
- **Chỉnh:** chỉnh dụng cụ và đại lượng đặt (thanh trượt, ô chọn); bấm "Đo" nhiều lần, mỗi lần số khác nhau; xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

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

### CHEM_ATOM_STRUCTURE — Cấu hình electron: Aufbau, Hund, Pauli
- **Viết:** `cấu hình electron` · `quy tắc Hund` · `nguyên lí Pauli` · `orbital nguyên tử`
- **Chỉnh:** kéo thanh trượt Số hiệu nguyên tử Z.

### CHEM_BONDING — Liên kết hóa học: cộng hóa trị và liên kết ion
- **Viết:** `liên kết hóa học` · `liên kết cộng hóa trị` · `liên kết ion` · `công thức Lewis` · `quy tắc octet`
- **Chỉnh:** chọn chất.

### CHEM_REDOX — Phản ứng oxi hóa – khử: số oxi hóa và chuyển electron
- **Viết:** `số oxi hóa` · `chất khử và chất oxi hóa` · `cân bằng electron` · `nhường electron`
- **Chỉnh:** chọn phản ứng; nút Chạy/Dừng và thanh thời gian.

### CHEM_HALOGEN_LAB — Ống nghiệm ảo: nhận biết halide và phản ứng đẩy halogen
- **Viết:** `nhận biết ion halide` · `phản ứng đẩy halogen` · `nước clo và muối bromide` · `kết tủa AgCl AgBr`
- **Chỉnh:** chọn muối natri; thuốc thử; bật/tắt Trộn hai ống.

### CHEM_VIRTUAL_TESTTUBE — Ống nghiệm ảo: nhận biết ion bằng kết tủa, màu và chất khí
- **Viết:** `ống nghiệm ảo` · `nhận biết các ion` · `phản ứng tạo kết tủa` · `nhận biết dung dịch`
- **Chỉnh:** chọn dung dịch cần thử; thuốc thử; bật/tắt Nhỏ thuốc thử vào; Cho dư thuốc thử; nút Chạy/Dừng và thanh thời gian.

### CHEM_SPECTRA — Phổ hồng ngoại (IR) và phổ khối lượng (MS)
- **Viết:** `phổ hồng ngoại` · `phổ khối lượng` · `phổ IR của ethanol` · `peak ion phân tử`
- **Chỉnh:** chọn hợp chất; loại phổ.

### CHEM_ALKALI_EARTH — Thử màu ngọn lửa của kim loại kiềm, kiềm thổ và đồng
- **Viết:** `màu ngọn lửa` · `thử màu ngọn lửa` · `kim loại kiềm` · `kim loại kiềm thổ`
- **Chỉnh:** chọn muối của kim loại; nút Chạy/Dừng và thanh thời gian.

### CHEM_ORGANIC_STRUCTURE — Công thức cấu tạo, nhóm chức và đồng phân hợp chất hữu cơ
- **Viết:** `nhóm chức` · `đồng phân cấu tạo` · `công thức cấu tạo thu gọn` · `công thức khung phân tử` · `hợp chất hữu cơ`
- **Chỉnh:** chọn hợp chất; bật/tắt Tô nhóm chức.

### CHEM_LIPID_SOAP — Chất béo, xà phòng và cơ chế tẩy rửa (micelle)
- **Viết:** `xà phòng` · `micelle` · `chất béo` · `xà phòng hóa chất béo` · `cơ chế tẩy rửa`
- **Chỉnh:** kéo thanh trượt Nồng độ xà phòng (100 = nồng độ micelle tới hạn); bật/tắt Nước cứng (có Ca²⁺).

### CHEM_CARBOHYDRATE — Glucose: dạng mạch hở và dạng mạch vòng α, β
- **Viết:** `glucose dạng mạch vòng` · `cấu tạo của glucose` · `carbohydrate` · `saccharose`
- **Chỉnh:** chọn dạng.

### CHEM_POLYMER — Polymer: trùng hợp và trùng ngưng
- **Viết:** `trùng hợp` · `trùng ngưng` · `polymer` · `mắt xích` · `nylon-6,6`
- **Chỉnh:** chọn polymer; kéo thanh trượt Số mắt xích n.

### CHEM_ELECTROLYSIS — Điện phân và định luật Faraday
- **Viết:** `điện phân` · `điện phân dung dịch NaCl` · `mạ điện` · `điều chế nhôm`
- **Chỉnh:** chọn hệ điện phân; kéo thanh trượt Cường độ dòng điện I; Thời gian điện phân; nút Chạy/Dừng và thanh thời gian.

### CHEM_ENERGETICS — Giản đồ năng lượng: enthalpy phản ứng và năng lượng hoạt hóa
- **Viết:** `giản đồ năng lượng` · `biến thiên enthalpy` · `phản ứng tỏa nhiệt và thu nhiệt` · `năng lượng hoạt hóa`
- **Chỉnh:** kéo thanh trượt Năng lượng hoạt hóa Ea; Biến thiên enthalpy ΔH; Chất xúc tác giảm Ea đi; kéo con trỏ trên trục hoành để đọc giá trị các đường.

### CHEM_KINETICS — Tốc độ phản ứng: nhiệt độ, xúc tác và phương trình Arrhenius
- **Viết:** `thuyết va chạm` · `hệ số nhiệt độ Van’t Hoff` · `hằng số tốc độ k` · `chu kì bán hủy của phản ứng`
- **Chỉnh:** kéo thanh trượt Nhiệt độ; Năng lượng hoạt hóa; Xúc tác giảm Ea; kéo con trỏ trên trục hoành để đọc giá trị các đường.

### CHEM_EQUILIBRIUM_GENERAL — Cân bằng hóa học tổng quát: thương số phản ứng Q so với hằng số K
- **Viết:** `hằng số cân bằng` · `thương số phản ứng Q` · `quá trình Haber tổng hợp ammonia`
- **Chỉnh:** kéo thanh trượt lg K của phản ứng; lg Q lúc đầu; kéo con trỏ trên trục hoành để đọc giá trị các đường.

### CHEM_ACID_BASE — pH của acid mạnh, acid yếu và dung dịch đệm
- **Viết:** `thang pH` · `acid yếu` · `dung dịch đệm` · `hằng số phân li acid pKa`
- **Chỉnh:** kéo thanh trượt pKa của acid yếu; Tỉ lệ [A⁻]/[HA] của dung dịch đệm; kéo con trỏ trên trục hoành để đọc giá trị các đường.

### CHEM_BOILING_POINTS — Nhiệt độ sôi của alkane, aldehyde, alcohol và acid carboxylic
- **Viết:** `nhiệt độ sôi của alcohol` · `so sánh nhiệt độ sôi` · `liên kết hydrogen giữa các phân tử`
- **Chỉnh:** kéo thanh trượt ; kéo con trỏ trên trục hoành để đọc giá trị các đường.

### CHEM_AMINO_PROTEIN — Amino acid: điện tích theo pH và điểm đẳng điện
- **Viết:** `amino acid` · `điểm đẳng điện` · `điện di amino acid` · `liên kết peptide` · `protein`
- **Chỉnh:** kéo thanh trượt pKa₁ (nhóm –COOH); pKa₂ (nhóm –NH₃⁺); pH để xét hướng điện di; kéo con trỏ trên trục hoành để đọc giá trị các đường.

### CHEM_PERIODIC_TABLE — Bảng tuần hoàn các nguyên tố và xu hướng biến đổi tuần hoàn
- **Viết:** `bảng tuần hoàn` · `xu hướng biến đổi tuần hoàn` · `độ âm điện của nguyên tố` · `năng lượng ion hóa` · `bán kính nguyên tử`
- **Chỉnh:** chạm một ô để xem chi tiết; tô màu theo nhóm hoặc theo nguyên tử khối; độ âm điện (pauling); bán kính nguyên tử; năng lượng ion hóa i₁.

### CHEM_ELECTROCHEM_SERIES — Dãy điện hóa của kim loại và thế điện cực chuẩn
- **Viết:** `dãy điện hóa` · `thế điện cực chuẩn` · `quy tắc alpha` · `tính khử của kim loại` · `pin nhiên liệu`
- **Chỉnh:** chạm một ô để xem chi tiết; tô màu theo nhóm hoặc theo thế điện cực chuẩn e°.

### CHEM_TRANSITION_COMPLEX — Cấu hình d, màu của ion kim loại chuyển tiếp và phức chất
- **Viết:** `ion kim loại chuyển tiếp` · `màu của ion` · `số phối trí`
- **Chỉnh:** chạm một ô để xem chi tiết; tô màu theo nhóm.

### CHEM_INDUSTRIAL_PROCESS — Sản xuất sulfuric acid theo phương pháp tiếp xúc
- **Viết:** `sản xuất sulfuric acid` · `phương pháp tiếp xúc` · `oleum` · `quy trình sản xuất acid`
- **Chỉnh:** .

### CHEM_ORGANIC_REACTIONS — Cộng HBr vào propene theo quy tắc Markovnikov
- **Viết:** `quy tắc Markovnikov` · `phản ứng cộng HBr vào anken` · `carbocation`
- **Chỉnh:** .

### CHEM_SCIENCE_PROCESS — Quy trình nghiên cứu khoa học trong hóa học
- **Viết:** `quy trình nghiên cứu khoa học` · `phương pháp nghiên cứu hóa học` · `giả thuyết khoa học` · `thiết kế thí nghiệm`
- **Chỉnh:** .

### CHEM_SEPARATION — Chưng cất phân đoạn dầu mỏ và các phương pháp tách chất
- **Viết:** `chưng cất phân đoạn dầu mỏ` · `tháp chưng cất` · `phương pháp tách chất` · `cracking`
- **Chỉnh:** .

### CHEM_METALLURGY — Lò cao luyện gang: các vùng phản ứng
- **Viết:** `lò cao luyện gang` · `sản xuất gang` · `luyện thép` · `ăn mòn điện hóa`
- **Chỉnh:** .

### CHEM_LAB_BENCH — Phòng thí nghiệm Hóa học ảo: giá ống nghiệm, kệ hóa chất và nhật kí hiện tượng
- **Viết:** `phòng thí nghiệm hóa học ảo` · `thực hành hóa học` · `tiết thực hành hóa`
- **Chỉnh:** chọn một bài thí nghiệm hoặc để tự do; lấy hóa chất từ kệ vào ống hoặc cốc, đun, chờ, ghi nhật kí hiện tượng.

### CHEM_LAB_NA_MG_WATER — Thực hành: So sánh tính kim loại của natri và magnesium (phản ứng với nước)
- **Viết:** `thí nghiệm so sánh tính kim loại của natri và magnesium` · `thí nghiệm natri và magnesium tác dụng với nước`
- **Chỉnh:** chọn ống hoặc cốc, lấy hóa chất từ kệ (chọn lượng), đun nóng, chiếu sáng, chờ, dẫn khí; làm theo các bước và trả lời câu hỏi; bấm "Xem thao tác mẫu" nếu cần.

### CHEM_LAB_RATE_TEMP — Thực hành: Ảnh hưởng của nhiệt độ đến tốc độ phản ứng (Mg + nước)
- **Viết:** `thí nghiệm Mg tác dụng với nước nóng và nước lạnh`
- **Chỉnh:** chọn ống hoặc cốc, lấy hóa chất từ kệ (chọn lượng), đun nóng, chiếu sáng, chờ, dẫn khí; làm theo các bước và trả lời câu hỏi; bấm "Xem thao tác mẫu" nếu cần.

### CHEM_LAB_CL2_I2_STARCH — Thực hành: So sánh tính phi kim của chlorine và iodine; nhận biết iodine bằng hồ tinh bột
- **Viết:** `thí nghiệm so sánh tính phi kim của chlorine và iodine` · `thí nghiệm nước chlorine tác dụng với muối iodide và hồ tinh bột`
- **Chỉnh:** chọn ống hoặc cốc, lấy hóa chất từ kệ (chọn lượng), đun nóng, chiếu sáng, chờ, dẫn khí; làm theo các bước và trả lời câu hỏi; bấm "Xem thao tác mẫu" nếu cần.

### CHEM_LAB_CARBONATE_ACID — Thực hành: Muối carbonate tác dụng với acid: nhận biết khí CO₂
- **Viết:** `thí nghiệm muối carbonate tác dụng với acid` · `thí nghiệm Na2CO3 tác dụng với HNO3 loãng`
- **Chỉnh:** chọn ống hoặc cốc, lấy hóa chất từ kệ (chọn lượng), đun nóng, chiếu sáng, chờ, dẫn khí; làm theo các bước và trả lời câu hỏi; bấm "Xem thao tác mẫu" nếu cần.

### CHEM_LAB_CONDUCTIVITY — Thực hành: Thử tính dẫn điện của hợp chất ion
- **Viết:** `thí nghiệm thử tính dẫn điện của hợp chất ion`
- **Chỉnh:** chọn ống hoặc cốc, lấy hóa chất từ kệ (chọn lượng), đun nóng, chiếu sáng, chờ, dẫn khí; làm theo các bước và trả lời câu hỏi; bấm "Xem thao tác mẫu" nếu cần.

### CHEM_LAB_REDOX_FE — Thực hành: Xác định chất oxi hóa, chất khử: sắt với CuSO₄ và H₂SO₄ loãng
- **Viết:** `thí nghiệm xác định chất oxi hóa chất khử` · `thí nghiệm đinh sắt tác dụng với dung dịch CuSO4`
- **Chỉnh:** chọn ống hoặc cốc, lấy hóa chất từ kệ (chọn lượng), đun nóng, chiếu sáng, chờ, dẫn khí; làm theo các bước và trả lời câu hỏi; bấm "Xem thao tác mẫu" nếu cần.

### CHEM_LAB_NEUTRAL_TEMP — Thực hành: Theo dõi sự thay đổi nhiệt độ của phản ứng trung hòa
- **Viết:** `thí nghiệm theo dõi sự thay đổi nhiệt độ của phản ứng trung hòa`
- **Chỉnh:** chọn ống hoặc cốc, lấy hóa chất từ kệ (chọn lượng), đun nóng, chiếu sáng, chờ, dẫn khí; làm theo các bước và trả lời câu hỏi; bấm "Xem thao tác mẫu" nếu cần.

### CHEM_LAB_RATE_CONC — Thực hành: Ảnh hưởng của nồng độ đến tốc độ phản ứng (Na₂S₂O₃ + H₂SO₄)
- **Viết:** `thí nghiệm Na2S2O3 tác dụng với H2SO4 đo thời gian đục`
- **Chỉnh:** chọn ống hoặc cốc, lấy hóa chất từ kệ (chọn lượng), đun nóng, chiếu sáng, chờ, dẫn khí; làm theo các bước và trả lời câu hỏi; bấm "Xem thao tác mẫu" nếu cần.

### CHEM_LAB_RATE_SURFACE — Thực hành: Ảnh hưởng của diện tích bề mặt đến tốc độ phản ứng (CaCO₃ + HCl)
- **Viết:** `thí nghiệm đá vôi viên và đá vôi nhỏ tác dụng với HCl`
- **Chỉnh:** chọn ống hoặc cốc, lấy hóa chất từ kệ (chọn lượng), đun nóng, chiếu sáng, chờ, dẫn khí; làm theo các bước và trả lời câu hỏi; bấm "Xem thao tác mẫu" nếu cần.

### CHEM_LAB_RATE_CAT — Thực hành: Ảnh hưởng của chất xúc tác đến tốc độ phản ứng (H₂O₂ + MnO₂)
- **Viết:** `thí nghiệm H2O2 và MnO2 xúc tác`
- **Chỉnh:** chọn ống hoặc cốc, lấy hóa chất từ kệ (chọn lượng), đun nóng, chiếu sáng, chờ, dẫn khí; làm theo các bước và trả lời câu hỏi; bấm "Xem thao tác mẫu" nếu cần.

### CHEM_LAB_HALIDE_DISPLACE — Thực hành: Phản ứng thế của muối halide với nước chlorine và nước bromine
- **Viết:** `thí nghiệm phản ứng thế của muối halide` · `thí nghiệm nước chlorine tác dụng với dung dịch NaBr và NaI`
- **Chỉnh:** chọn ống hoặc cốc, lấy hóa chất từ kệ (chọn lượng), đun nóng, chiếu sáng, chờ, dẫn khí; làm theo các bước và trả lời câu hỏi; bấm "Xem thao tác mẫu" nếu cần.

### CHEM_LAB_HCL_METALS — Thực hành: Dung dịch HCl tác dụng với kim loại (Zn, Cu)
- **Viết:** `thí nghiệm dung dịch HCl tác dụng với kim loại` · `thí nghiệm HCl loãng tác dụng với kẽm và đồng`
- **Chỉnh:** chọn ống hoặc cốc, lấy hóa chất từ kệ (chọn lượng), đun nóng, chiếu sáng, chờ, dẫn khí; làm theo các bước và trả lời câu hỏi; bấm "Xem thao tác mẫu" nếu cần.

### CHEM_LAB_HALIDE_ID — Thực hành: Nhận biết ion halide bằng dung dịch AgNO₃
- **Viết:** `thí nghiệm nhận biết ion halide` · `thí nghiệm AgNO3 với NaF, NaCl, NaBr, NaI`
- **Chỉnh:** chọn ống hoặc cốc, lấy hóa chất từ kệ (chọn lượng), đun nóng, chiếu sáng, chờ, dẫn khí; làm theo các bước và trả lời câu hỏi; bấm "Xem thao tác mẫu" nếu cần.

### CHEM_LAB_ACID_BASE_INDICATOR — Thực hành: Chất chỉ thị acid – base và pH của dung dịch muối
- **Viết:** `thí nghiệm chất chỉ thị acid base` · `thí nghiệm thủy phân CH3COONa với phenolphthalein`
- **Chỉnh:** chọn ống hoặc cốc, lấy hóa chất từ kệ (chọn lượng), đun nóng, chiếu sáng, chờ, dẫn khí; làm theo các bước và trả lời câu hỏi; bấm "Xem thao tác mẫu" nếu cần.

### CHEM_LAB_S_FE_HEAT — Thực hành: Sulfur tác dụng với sắt khi đun nóng
- **Viết:** `thí nghiệm sulfur tác dụng với sắt` · `thí nghiệm đun bột sắt và lưu huỳnh`
- **Chỉnh:** chọn ống hoặc cốc, lấy hóa chất từ kệ (chọn lượng), đun nóng, chiếu sáng, chờ, dẫn khí; làm theo các bước và trả lời câu hỏi; bấm "Xem thao tác mẫu" nếu cần.

### CHEM_LAB_CU_H2SO4_CONC — Thực hành: Đồng tác dụng với dung dịch sulfuric acid đặc, nóng
- **Viết:** `thí nghiệm đồng tác dụng với sulfuric acid đặc nóng`
- **Chỉnh:** chọn ống hoặc cốc, lấy hóa chất từ kệ (chọn lượng), đun nóng, chiếu sáng, chờ, dẫn khí; làm theo các bước và trả lời câu hỏi; bấm "Xem thao tác mẫu" nếu cần.

### CHEM_LAB_SULFATE_TEST — Thực hành: Nhận biết ion sulfate bằng ion Ba²⁺
- **Viết:** `thí nghiệm nhận biết ion sulfate bằng ion Ba2+`
- **Chỉnh:** chọn ống hoặc cốc, lấy hóa chất từ kệ (chọn lượng), đun nóng, chiếu sáng, chờ, dẫn khí; làm theo các bước và trả lời câu hỏi; bấm "Xem thao tác mẫu" nếu cần.

### CHEM_LAB_C2H2_PREP — Thực hành: Điều chế acetylene từ đất đèn và thử tính chất
- **Viết:** `thí nghiệm điều chế acetylene từ đất đèn`
- **Chỉnh:** chọn ống hoặc cốc, lấy hóa chất từ kệ (chọn lượng), đun nóng, chiếu sáng, chờ, dẫn khí; làm theo các bước và trả lời câu hỏi; bấm "Xem thao tác mẫu" nếu cần.

### CHEM_LAB_HEXANE_BR — Thực hành: Hexane: phản ứng bromine hóa và thử với KMnO₄
- **Viết:** `thí nghiệm bromine hóa hexane` · `thí nghiệm hexane tác dụng với KMnO4`
- **Chỉnh:** chọn ống hoặc cốc, lấy hóa chất từ kệ (chọn lượng), đun nóng, chiếu sáng, chờ, dẫn khí; làm theo các bước và trả lời câu hỏi; bấm "Xem thao tác mẫu" nếu cần.

### CHEM_LAB_CU_OH_GLYCEROL — Thực hành: Cu(OH)₂ tác dụng với alcohol đa chức (glycerol)
- **Viết:** `thí nghiệm Cu(OH)2 tác dụng với glycerol`
- **Chỉnh:** chọn ống hoặc cốc, lấy hóa chất từ kệ (chọn lượng), đun nóng, chiếu sáng, chờ, dẫn khí; làm theo các bước và trả lời câu hỏi; bấm "Xem thao tác mẫu" nếu cần.

### CHEM_LAB_TOLLENS — Thực hành: Phản ứng tráng bạc của aldehyde
- **Viết:** `thí nghiệm phản ứng tráng bạc của aldehyde` · `thí nghiệm aldehyde với thuốc thử Tollens`
- **Chỉnh:** chọn ống hoặc cốc, lấy hóa chất từ kệ (chọn lượng), đun nóng, chiếu sáng, chờ, dẫn khí; làm theo các bước và trả lời câu hỏi; bấm "Xem thao tác mẫu" nếu cần.

### CHEM_LAB_ACETIC_ACID — Thực hành: Tính acid của acetic acid
- **Viết:** `thí nghiệm tính acid của acetic acid`
- **Chỉnh:** chọn ống hoặc cốc, lấy hóa chất từ kệ (chọn lượng), đun nóng, chiếu sáng, chờ, dẫn khí; làm theo các bước và trả lời câu hỏi; bấm "Xem thao tác mẫu" nếu cần.

### CHEM_LAB_GLUCOSE_CU — Thực hành: Glucose tác dụng với Cu(OH)₂: tính polyalcohol và tính aldehyde
- **Viết:** `thí nghiệm glucose tác dụng với Cu(OH)2`
- **Chỉnh:** chọn ống hoặc cốc, lấy hóa chất từ kệ (chọn lượng), đun nóng, chiếu sáng, chờ, dẫn khí; làm theo các bước và trả lời câu hỏi; bấm "Xem thao tác mẫu" nếu cần.

### CHEM_LAB_STARCH_IODINE — Thực hành: Hồ tinh bột với iodine và thủy phân tinh bột
- **Viết:** `thí nghiệm hồ tinh bột với iodine` · `thí nghiệm thủy phân tinh bột`
- **Chỉnh:** chọn ống hoặc cốc, lấy hóa chất từ kệ (chọn lượng), đun nóng, chiếu sáng, chờ, dẫn khí; làm theo các bước và trả lời câu hỏi; bấm "Xem thao tác mẫu" nếu cần.

### CHEM_LAB_BIURET — Thực hành: Phản ứng màu biuret của peptide và protein
- **Viết:** `thí nghiệm phản ứng màu biuret của peptide` · `thí nghiệm protein với Cu(OH)2 màu tím`
- **Chỉnh:** chọn ống hoặc cốc, lấy hóa chất từ kệ (chọn lượng), đun nóng, chiếu sáng, chờ, dẫn khí; làm theo các bước và trả lời câu hỏi; bấm "Xem thao tác mẫu" nếu cần.

### CHEM_LAB_ANILINE_BR — Thực hành: Aniline tác dụng với nước bromine
- **Viết:** `thí nghiệm aniline tác dụng với nước bromine`
- **Chỉnh:** chọn ống hoặc cốc, lấy hóa chất từ kệ (chọn lượng), đun nóng, chiếu sáng, chờ, dẫn khí; làm theo các bước và trả lời câu hỏi; bấm "Xem thao tác mẫu" nếu cần.

### CHEM_LAB_METAL_SALT — Thực hành: Kim loại tác dụng với dung dịch muối
- **Viết:** `thí nghiệm kim loại tác dụng với dung dịch muối`
- **Chỉnh:** chọn ống hoặc cốc, lấy hóa chất từ kệ (chọn lượng), đun nóng, chiếu sáng, chờ, dẫn khí; làm theo các bước và trả lời câu hỏi; bấm "Xem thao tác mẫu" nếu cần.

### CHEM_LAB_CATION_NAOH — Thực hành: Nhận biết các cation kim loại bằng dung dịch NaOH
- **Viết:** `thí nghiệm nhận biết các cation kim loại bằng NaOH`
- **Chỉnh:** chọn ống hoặc cốc, lấy hóa chất từ kệ (chọn lượng), đun nóng, chiếu sáng, chờ, dẫn khí; làm theo các bước và trả lời câu hỏi; bấm "Xem thao tác mẫu" nếu cần.

### CHEM_LAB_CU_NH3_COMPLEX — Thực hành: Sự tạo thành phức chất của Cu²⁺ với NH₃
- **Viết:** `thí nghiệm Cu2+ tác dụng với NH3 dư tạo dung dịch xanh thẫm`
- **Chỉnh:** chọn ống hoặc cốc, lấy hóa chất từ kệ (chọn lượng), đun nóng, chiếu sáng, chờ, dẫn khí; làm theo các bước và trả lời câu hỏi; bấm "Xem thao tác mẫu" nếu cần.

### CHEM_LAB_KMNO4_FE2 — Thực hành: Chuẩn độ muối Fe(II) bằng dung dịch thuốc tím
- **Viết:** `thí nghiệm chuẩn độ muối Fe(II) bằng thuốc tím`
- **Chỉnh:** chọn ống hoặc cốc, lấy hóa chất từ kệ (chọn lượng), đun nóng, chiếu sáng, chờ, dẫn khí; làm theo các bước và trả lời câu hỏi; bấm "Xem thao tác mẫu" nếu cần.

### CHEM_LAB_NH4_NAOH — Thực hành: Nhận biết ion ammonium bằng dung dịch kiềm
- **Viết:** `thí nghiệm nhận biết ion ammonium bằng NaOH`
- **Chỉnh:** chọn ống hoặc cốc, lấy hóa chất từ kệ (chọn lượng), đun nóng, chiếu sáng, chờ, dẫn khí; làm theo các bước và trả lời câu hỏi; bấm "Xem thao tác mẫu" nếu cần.

### CHEM_LAB_CARBONATE_BARIUM — Thực hành: Phân biệt SO₄²⁻ và CO₃²⁻ bằng BaCl₂ rồi acid
- **Viết:** `thí nghiệm phân biệt ion sulfate và carbonate bằng BaCl2`
- **Chỉnh:** chọn ống hoặc cốc, lấy hóa chất từ kệ (chọn lượng), đun nóng, chiếu sáng, chờ, dẫn khí; làm theo các bước và trả lời câu hỏi; bấm "Xem thao tác mẫu" nếu cần.

### CHEM_LAB_FE3_SCN — Thực hành: Nhận biết ion Fe³⁺ bằng KSCN
- **Viết:** `thí nghiệm nhận biết ion Fe3+ bằng KSCN`
- **Chỉnh:** chọn ống hoặc cốc, lấy hóa chất từ kệ (chọn lượng), đun nóng, chiếu sáng, chờ, dẫn khí; làm theo các bước và trả lời câu hỏi; bấm "Xem thao tác mẫu" nếu cần.

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

### BIO_ECOLOGICAL_LIMITS — Giới hạn sinh thái
- **Viết:** `giới hạn sinh thái` · `khoảng thuận lợi và điểm gây chết` · `giới hạn sinh thái của nhiệt độ`
- **Chỉnh:** hai điểm gây chết và điểm cực thuận của loài A; so với loài B có giới hạn hẹp; bảng đọc khoảng thuận lợi (≥ 50 %) và độ rộng giới hạn.

### BIO_DIGESTIVE_SYSTEM — Hệ tiêu hóa ở người
- **Viết:** `hệ tiêu hóa` · `ống tiêu hóa ở người` · `tiêu hóa ở người`
- **Chỉnh:** chạm bộ phận để xem enzyme và sản phẩm (miệng, thực quản, dạ dày, gan, túi mật, tụy, ruột non, ruột già, hậu môn); nút "Đi theo thức ăn" lần lượt qua từng bộ phận; hạt chuyển động dọc đường đi của thức ăn.

### BIO_GENE_ENGINEERING — DNA tái tổ hợp, chuyển gene
- **Viết:** `DNA tái tổ hợp` · `plasmid và enzyme giới hạn` · `công nghệ gene`
- **Chỉnh:** 5 bước (tách, cắt bằng enzyme giới hạn, nối bằng ligase, biến nạp vào E. coli, nhân dòng và biểu hiện); bước tiếp, bước trước, tự chạy, chạm bước để nhảy.

### BIO_FEEDBACK_LOOP — Điều hòa glucose máu (liên hệ ngược)
- **Viết:** `insulin glucagon` · `điều hòa glucose máu` · `cân bằng nội môi` · `liên hệ ngược`
- **Chỉnh:** lượng đường ăn vào, độ nhạy insulin, bật/tắt điều hòa ngược (mô phỏng tuyến tụy hỏng), chạy bộ; con trỏ thời gian đổi pha và sơ đồ tiếp nhận → điều khiển → thực hiện → kết quả.

### BIO_ENZYME_ACTIVITY — Hoạt tính enzyme theo nhiệt độ
- **Viết:** `hoạt tính enzyme` · `enzyme và nhiệt độ` · `nhiệt độ tối ưu của enzyme`
- **Chỉnh:** nhiệt độ tối ưu và nhiệt độ biến tính của enzyme A; so với enzyme vi khuẩn chịu nhiệt.

### BIO_LIGHT_COMPENSATION — Điểm bù, điểm bão hòa ánh sáng (C₃, C₄)
- **Viết:** `điểm bù ánh sáng` · `điểm bão hòa ánh sáng` · `thực vật C3 và C4`
- **Chỉnh:** khả năng quang hợp tối đa, cường độ hô hấp; bảng đọc điểm bù của C₃ và C₄. (Câu có chữ "quang hợp" trần mở mô phỏng quang hợp cũ.)

### BIO_IMMUNE_RESPONSE — Đáp ứng miễn dịch nguyên phát, thứ phát
- **Viết:** `đáp ứng miễn dịch thứ phát` · `tiêm nhắc lại vaccine` · `miễn dịch nguyên phát`
- **Chỉnh:** ngày tiêm lần 2, độ mạnh đáp ứng thứ phát; so với chỉ tiêm một lần.

### BIO_ACTION_POTENTIAL — Điện thế hoạt động của neuron
- **Viết:** `điện thế hoạt động` · `điện thế nghỉ` · `xung thần kinh`
- **Chỉnh:** cường độ kích thích (dưới ngưỡng: không có xung), sợi có hoặc không có bao myelin (tốc độ lan truyền).

### BIO_POPULATION_GROWTH — Tăng trưởng quần thể (J và S)
- **Viết:** `tăng trưởng quần thể` · `đường cong chữ S` · `sức chứa của môi trường`
- **Chỉnh:** r, K, N₀; bảng đọc điểm uốn và tốc độ tăng cực đại.

### BIO_EUKARYOTE_CELL — Tế bào nhân thực và các bào quan
- **Viết:** `tế bào nhân thực` · `các bào quan` · `cấu trúc tế bào`
- **Chỉnh:** chạm từng bào quan (màng, nhân, ribosome, lưới nội chất, Golgi, ti thể, lysosome); nút "Đi theo" lần lượt.

### BIO_HEART_CIRCULATION — Cấu tạo tim và vòng tuần hoàn máu
- **Viết:** `tuần hoàn máu` · `cấu tạo tim` · `van tim và bốn ngăn tim`
- **Chỉnh:** chạm ngăn tim, van, mạch; "Đi theo máu" qua vòng phổi và vòng hệ thống; hạt chạy dọc đường đi của máu. (Nhịp tim và điện tâm đồ vẫn ở BIO_HEART_CYCLE.)

### BIO_NEPHRON — Nephron và sự tạo thành nước tiểu
- **Viết:** `nephron` · `sự tạo thành nước tiểu` · `cầu thận và nang Bowman`
- **Chỉnh:** chạm cầu thận, nang Bowman, ống thận, ống góp… xem giai đoạn lọc, tái hấp thu, tiết; "Đi theo dịch lọc".

### BIO_FLOWER_STRUCTURE — Cấu tạo hoa và thụ tinh kép
- **Viết:** `cấu tạo hoa` · `túi phôi và thụ tinh kép` · `hoa lưỡng tính`
- **Chỉnh:** chạm đài, cánh, chỉ nhị, bao phấn, núm, vòi, bầu, noãn; chú giải hạt phấn, túi phôi, thụ tinh kép.

### BIO_MITOSIS — Nguyên phân
- **Viết:** `nguyên phân` · `các kì của nguyên phân` · `kì giữa kì sau`
- **Chỉnh:** 6 bước từ trước nhân đôi đến hai tế bào con; bước tiếp, bước trước, tự chạy.

### BIO_VIRUS_CYCLE — Chu kì nhân lên của virus (sinh tan)
- **Viết:** `chu kì sinh tan của virus` · `chu kì nhân lên của virus` · `thực khuẩn thể`
- **Chỉnh:** 5 bước hấp phụ, xâm nhập, sinh tổng hợp, lắp ráp, phóng thích.

### BIO_DNA_FORK — Chạc sao chép DNA, đoạn Okazaki
- **Viết:** `đoạn Okazaki` · `chạc sao chép` · `nguyên tắc bán bảo toàn`
- **Chỉnh:** 7 bước: tháo xoắn, đoạn mồi, mạch liên tục, đoạn Okazaki, enzyme nối, kết quả bán bảo toàn. (Câu có "nhân đôi ADN", "tái bản ADN" mở BIO_DNA_HELIX cũ.)

### BIO_OSMOREGULATION_ADH — Điều hòa áp suất thẩm thấu máu (ADH)
- **Viết:** `hormone ADH` · `ADH và thận tái hấp thu nước`
- **Chỉnh:** mất nước hay uống quá nhiều nước, bật/tắt điều hòa ngược, uống rượu bia (ức chế ADH). (Câu có "áp suất thẩm thấu" trần mở BIO_OSMOSIS_CELL cũ.)

### BIO_BLOOD_PRESSURE_REFLEX — Điều hòa huyết áp bằng phản xạ
- **Viết:** `điều hòa huyết áp` · `phản xạ điều hòa tim mạch` · `thụ thể áp lực xoang động mạch cảnh`
- **Chỉnh:** biến động đột ngột (mất máu hay căng thẳng), bật/tắt phản xạ, đáp ứng yếu.

### BIO_SCALE_CELL_TYPES — Tế bào nhân sơ, nhân thực và tỉ lệ diện tích trên thể tích
- **Viết:** `tế bào nhân sơ` · `tỉ lệ diện tích trên thể tích` · `cấp độ tổ chức của thế giới sống`
- **Chỉnh:** chọn nội dung; kéo thanh trượt Cạnh tế bào (hình lập phương).

### BIO_BIOMOLECULES — Các phân tử sinh học: nước, phospholipid, protein, nucleic acid
- **Viết:** `phân tử sinh học` · `cấu trúc của nước` · `phospholipid` · `cấu trúc bậc 4 của protein` · `nucleotide`
- **Chỉnh:** chọn phân tử; kéo thanh trượt Bậc cấu trúc protein.

### BIO_MEMBRANE_TRANSPORT — Vận chuyển các chất qua màng sinh chất
- **Viết:** `vận chuyển các chất qua màng` · `khuếch tán tăng cường` · `vận chuyển chủ động` · `bơm natri kali`
- **Chỉnh:** chọn cách vận chuyển; kéo thanh trượt Nồng độ ngoài tế bào; Nồng độ trong tế bào; bật/tắt Có ATP; nút Chạy/Dừng và thanh thời gian.

### BIO_PLANT_TROPISM — Hướng động ở thực vật và vai trò của auxin
- **Viết:** `hướng động` · `hướng sáng` · `hướng trọng lực`
- **Chỉnh:** chọn kích thích; kéo thanh trượt Hướng ánh sáng (so với phương thẳng đứng); bật/tắt Còn đỉnh sinh trưởng (nơi tạo auxin); nút Chạy/Dừng và thanh thời gian.

### BIO_TRANSCRIPTION_TRANSLATION — Phiên mã, dịch mã và đột biến gene
- **Viết:** `phiên mã` · `dịch mã` · `mã di truyền` · `đột biến gene` · `bộ ba mã hóa`
- **Chỉnh:** chọn đột biến; nucleotide thay/thêm; kéo thanh trượt Vị trí đột biến (tính từ 3′); nhập mạch gốc 3′→5′.

### BIO_CHROMOSOME — Đột biến cấu trúc và số lượng nhiễm sắc thể
- **Viết:** `đột biến cấu trúc nhiễm sắc thể` · `mất đoạn lặp đoạn đảo đoạn chuyển đoạn` · `thể lệch bội` · `đa bội` · `hội chứng Down`
- **Chỉnh:** chọn dạng đột biến.

### BIO_PEDIGREE — Phả hệ và xác suất con mắc bệnh di truyền
- **Viết:** `phả hệ` · `xác suất sinh con bị bệnh` · `di truyền liên kết giới tính` · `bệnh máu khó đông`
- **Chỉnh:** chọn kiểu di truyền bệnh; phép lai.

### BIO_POPULATION_EVOLUTION — Các nhân tố tiến hóa: phiêu bạt di truyền, chọn lọc, di nhập
- **Viết:** `nhân tố tiến hóa` · `phiêu bạt di truyền` · `chọn lọc tự nhiên` · `dòng gene` · `tần số allele của quần thể`
- **Chỉnh:** kéo thanh trượt Kích thước quần thể N; Tần số allele A ban đầu; Hệ số chọn lọc ưu thế cho A (s); Tỉ lệ di nhập m (nguồn có tần số 0,5).

### BIO_FOOD_WEB_ENERGY — Dòng năng lượng qua các bậc dinh dưỡng và phóng đại sinh học
- **Viết:** `tháp sinh thái` · `hiệu suất sinh thái` · `bậc dinh dưỡng` · `chuỗi thức ăn` · `phóng đại sinh học`
- **Chỉnh:** kéo thanh trượt Năng lượng của sinh vật sản xuất; Hiệu suất chuyển hóa giữa hai bậc; bật/tắt Hiện nồng độ DDT (phóng đại ×10 mỗi bậc).

### BIO_PLANT_GROWTH — Hormone thực vật: tác dụng của auxin phụ thuộc nồng độ và cơ quan
- **Viết:** `hormone thực vật` · `nồng độ auxin` · `cytokinin` · `ưu thế ngọn` · `quang chu kì`
- **Chỉnh:** kéo thanh trượt ; kéo con trỏ trên trục hoành để đọc giá trị các đường.

### BIO_HUMAN_REPRODUCTION — Chu kì kinh nguyệt và điều hòa bằng hormone
- **Viết:** `chu kì kinh nguyệt` · `rụng trứng` · `hormone FSH LH` · `estrogen và progesterone` · `sinh tinh sinh trứng`
- **Chỉnh:** kéo thanh trượt Độ dài chu kì; kéo con trỏ trên trục hoành để đọc giá trị các đường.

### BIO_MICROBE_LAB — Sinh trưởng của quần thể vi khuẩn: bốn pha
- **Viết:** `sinh trưởng của vi khuẩn` · `pha tiềm phát pha lũy thừa` · `nuôi cấy vi sinh vật` · `thời gian thế hệ`
- **Chỉnh:** kéo thanh trượt Thời gian tiềm phát; Thời gian thế hệ; Sức chứa tối đa (lg); Bắt đầu suy vong; kéo con trỏ trên trục hoành để đọc giá trị các đường.

### BIO_MINERAL_NUTRITION — Dinh dưỡng khoáng: thiếu, đủ và thừa phân bón
- **Viết:** `dinh dưỡng khoáng` · `liều lượng phân bón` · `triệu chứng thiếu khoáng` · `nguyên tố đại lượng và vi lượng`
- **Chỉnh:** kéo thanh trượt Nhu cầu: liều cho nửa năng suất; Ngưỡng gây độc; kéo con trỏ trên trục hoành để đọc giá trị các đường.

### BIO_PLANT_RESPIRATION — Hô hấp ở thực vật và các yếu tố ảnh hưởng
- **Viết:** `hô hấp ở thực vật` · `cường độ hô hấp` · `bảo quản nông sản` · `hạt nảy mầm`
- **Chỉnh:** kéo thanh trượt Hệ số nhiệt độ Q₁₀; Độ ẩm của hạt (tỉ lệ); kéo con trỏ trên trục hoành để đọc giá trị các đường.

### BIO_ANIMAL_BEHAVIOR — Học tập ở động vật: phản xạ có điều kiện của Pavlov
- **Viết:** `phản xạ có điều kiện` · `thí nghiệm Pavlov` · `tập tính của động vật` · `học tập ở động vật` · `pheromone`
- **Chỉnh:** kéo thanh trượt Tốc độ học; Ngừng củng cố từ lần thứ; kéo con trỏ trên trục hoành để đọc giá trị các đường.

### BIO_REACTION_NORM — Mức phản ứng của kiểu gene với nhiệt độ
- **Viết:** `mức phản ứng` · `thỏ Himalaya` · `thường biến` · `kiểu hình và môi trường`
- **Chỉnh:** kéo thanh trượt Nhiệt độ chuyển màu lông (thỏ Himalaya); kéo con trỏ trên trục hoành để đọc giá trị các đường.

### BIO_RESPIRATORY_SYSTEM — Hệ hô hấp ở người và trao đổi khí ở phế nang
- **Viết:** `hệ hô hấp` · `phế nang` · `trao đổi khí ở phổi` · `cơ hoành`
- **Chỉnh:** .

### BIO_WATER_TRANSPORT_PLANT — Vận chuyển nước và chất hữu cơ ở thực vật
- **Viết:** `mạch gỗ và mạch rây` · `hút nước ở rễ` · `lông hút` · `đai Caspary`
- **Chỉnh:** .

### BIO_SENSE_ORGANS — Cấu tạo mắt và sự tạo ảnh
- **Viết:** `cấu tạo của mắt` · `võng mạc` · `thể thủy tinh` · `cận thị viễn thị` · `cơ quan thị giác`
- **Chỉnh:** .

### BIO_METABOLISM_PATHWAYS — Đường phân và lên men
- **Viết:** `đường phân` · `lên men` · `lên men lactic` · `lên men rượu` · `pyruvate`
- **Chỉnh:** .

### BIO_ANIMAL_DEVELOPMENT — Biến thái hoàn toàn và không hoàn toàn ở côn trùng
- **Viết:** `biến thái` · `biến thái hoàn toàn` · `lột xác` · `sinh trưởng và phát triển ở động vật`
- **Chỉnh:** .

### BIO_ORIGIN_OF_LIFE — Nguồn gốc sự sống: Miller–Urey, tế bào nguyên thủy và nội cộng sinh
- **Viết:** `nguồn gốc sự sống` · `thí nghiệm Miller` · `tiến hóa hóa học` · `thuyết nội cộng sinh` · `niên biểu địa chất`
- **Chỉnh:** .

### BIO_SUCCESSION_CYCLES — Chu trình nitrogen và diễn thế sinh thái
- **Viết:** `chu trình nitrogen` · `cố định đạm` · `nitrate hóa` · `diễn thế sinh thái` · `phú dưỡng`
- **Chỉnh:** .

### BIO_MENDEL_EXTENDED — Các quy luật di truyền mở rộng: trội không hoàn toàn, đồng trội, liên kết và hoán vị gene
- **Viết:** `trội không hoàn toàn` · `đồng trội` · `liên kết gene và hoán vị gene` · `phân li độc lập` · `nhóm máu ABO`
- **Chỉnh:** bấm +1, +10, +100, +1000 để thử nhiều lần, "Làm lại" để xóa; chạm một dòng kết quả để xem tần suất tích lũy của nó so với xác suất lí thuyết; chọn phép lai; kéo Tần số hoán vị gene f (phép lai liên kết).

### BIO_CYTOPLASMIC_INHERITANCE — Di truyền tế bào chất (thí nghiệm của Correns)
- **Viết:** `di truyền tế bào chất` · `thí nghiệm của Correns` · `di truyền theo mẹ` · `gene ngoài nhân` · `lai thuận nghịch`
- **Chỉnh:** bấm +1, +10, +100, +1000 để thử nhiều lần, "Làm lại" để xóa; chạm một dòng kết quả để xem tần suất tích lũy của nó so với xác suất lí thuyết; chọn cây làm mẹ (cho trứng).

### BIO_GENETIC_CODE_TABLE — Bảng mã di truyền (64 codon)
- **Viết:** `bảng mã di truyền` · `tính thoái hóa của mã di truyền` · `codon mở đầu` · `mã kết thúc`
- **Chỉnh:** chạm một ô để xem chi tiết; tô màu theo nhóm.

### BIO_EVIDENCE_PHYLOGENY — Bằng chứng phân tử: cytochrome C và quan hệ họ hàng
- **Viết:** `cytochrome C` · `bằng chứng phân tử` · `quan hệ họ hàng giữa các loài` · `cây phát sinh chủng loại` · `cơ quan thoái hóa`
- **Chỉnh:** chạm một ô để xem chi tiết; tô màu theo nhóm hoặc theo số amino acid khác người.

### BIO_MEIOSIS — Giảm phân và trao đổi chéo
- **Viết:** `giảm phân` · `trao đổi chéo` · `tiếp hợp nhiễm sắc thể` · `hình thành giao tử`
- **Chỉnh:** .

### BIO_REFLEX_ARC — Cung phản xạ và dẫn truyền qua synapse
- **Viết:** `cung phản xạ` · `synapse` · `chất trung gian hóa học`
- **Chỉnh:** .

### BIO_EAR_HEARING — Cấu tạo tai và cơ chế nghe
- **Viết:** `cấu tạo của tai` · `ốc tai` · `màng nhĩ` · `cơ chế nghe` · `chuỗi xương con`
- **Chỉnh:** .

### BIO_POPULATION_ECOLOGY — Tháp tuổi và ước lượng kích thước quần thể (đánh dấu – bắt lại)
- **Viết:** `tháp tuổi` · `nhóm tuổi của quần thể` · `phương pháp đánh dấu bắt lại` · `ước lượng kích thước quần thể`
- **Chỉnh:** chọn nội dung; dạng tháp tuổi; kéo thanh trượt Số cá thể thực của quần thể; Số cá thể đánh dấu lần 1; Số cá thể bắt lần 2.

### BIO_LAB_BENCH — Phòng thực hành Sinh học ảo: kính hiển vi, nhóm đối chứng, số liệu
- **Viết:** `phòng thực hành sinh học ảo` · `tiết thực hành sinh học` · `thực hành sinh học`
- **Chỉnh:** chọn mẫu, nhóm thí nghiệm hoặc đối chứng và biến số (ô chọn, thanh trượt); bấm "Đo" để ghi từng lần quan sát (mỗi mẫu cho số hơi khác); xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### BIO_LAB_BIOMOLECULES — Thực hành: Thực hành nhận biết một số phân tử sinh học
- **Viết:** `thực hành nhận biết một số phân tử sinh học` · `thực hành thuốc thử Benedict và biuret`
- **Chỉnh:** chọn mẫu, nhóm thí nghiệm hoặc đối chứng và biến số (ô chọn, thanh trượt); bấm "Đo" để ghi từng lần quan sát (mỗi mẫu cho số hơi khác); xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### BIO_LAB_CELL_OBSERVE — Thực hành: Thực hành quan sát tế bào dưới kính hiển vi
- **Viết:** `thực hành quan sát tế bào dưới kính hiển vi` · `thực hành quan sát tế bào niêm mạc miệng`
- **Chỉnh:** chọn mẫu, nhóm thí nghiệm hoặc đối chứng và biến số (ô chọn, thanh trượt); bấm "Đo" để ghi từng lần quan sát (mỗi mẫu cho số hơi khác); xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### BIO_LAB_PLASMOLYSIS — Thực hành: Thực hành thí nghiệm co và phản co nguyên sinh
- **Viết:** `thực hành tế bào biểu bì hành tím trong dung dịch muối` · `thí nghiệm tế bào hành tím ngâm nước muối` (câu có "co nguyên sinh" mở mô phỏng khái niệm BIO_OSMOSIS_CELL; chọn bài trong danh sách của phòng thực hành Sinh)
- **Chỉnh:** chọn mẫu, nhóm thí nghiệm hoặc đối chứng và biến số (ô chọn, thanh trượt); bấm "Đo" để ghi từng lần quan sát (mỗi mẫu cho số hơi khác); xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### BIO_LAB_ENZYME — Thực hành: Thực hành ảnh hưởng của nhiệt độ, pH, chất ức chế đến hoạt tính enzyme amylase
- **Viết:** `thực hành kiểm tra hoạt tính amylase` · `thực hành ảnh hưởng của nhiệt độ, pH đến hoạt tính enzyme`
- **Chỉnh:** chọn mẫu, nhóm thí nghiệm hoặc đối chứng và biến số (ô chọn, thanh trượt); bấm "Đo" để ghi từng lần quan sát (mỗi mẫu cho số hơi khác); xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### BIO_LAB_MITOSIS_SLIDE — Thực hành: Thực hành làm và quan sát tiêu bản quá trình nguyên phân và giảm phân
- **Viết:** `thực hành làm và quan sát tiêu bản quá trình nguyên phân` · `thực hành tiêu bản giảm phân`
- **Chỉnh:** chọn mẫu, nhóm thí nghiệm hoặc đối chứng và biến số (ô chọn, thanh trượt); bấm "Đo" để ghi từng lần quan sát (mỗi mẫu cho số hơi khác); xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### BIO_LAB_YOGURT — Thực hành: Thực hành làm sữa chua và theo dõi quá trình lên men
- **Viết:** `thực hành làm sữa chua` · `thực hành làm dưa chua và quan sát sản phẩm lên men`
- **Chỉnh:** chọn mẫu, nhóm thí nghiệm hoặc đối chứng và biến số (ô chọn, thanh trượt); bấm "Đo" để ghi từng lần quan sát (mỗi mẫu cho số hơi khác); xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### BIO_LAB_VIRUS_SURVEY — Thực hành: Thực hành điều tra một số bệnh do virus và tuyên truyền phòng chống
- **Viết:** `thực hành điều tra một số bệnh do virus` · `thực hành tuyên truyền phòng chống bệnh do virus`
- **Chỉnh:** chọn mẫu, nhóm thí nghiệm hoặc đối chứng và biến số (ô chọn, thanh trượt); bấm "Đo" để ghi từng lần quan sát (mỗi mẫu cho số hơi khác); xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### BIO_LAB_TRANSPIRATION — Thực hành: Thực hành thí nghiệm thoát hơi nước ở lá
- **Viết:** `thực hành thí nghiệm thoát hơi nước ở lá` · `thực hành trao đổi nước và khoáng ở thực vật`
- **Chỉnh:** chọn mẫu, nhóm thí nghiệm hoặc đối chứng và biến số (ô chọn, thanh trượt); bấm "Đo" để ghi từng lần quan sát (mỗi mẫu cho số hơi khác); xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### BIO_LAB_PIGMENT — Thực hành: Thực hành tách chiết sắc tố quang hợp bằng sắc kí giấy
- **Viết:** `thực hành tách chiết sắc tố quang hợp` · `thực hành sắc kí giấy sắc tố lá`
- **Chỉnh:** chọn mẫu, nhóm thí nghiệm hoặc đối chứng và biến số (ô chọn, thanh trượt); bấm "Đo" để ghi từng lần quan sát (mỗi mẫu cho số hơi khác); xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### BIO_LAB_LEAF_STARCH — Thực hành: Thực hành thử tinh bột ở lá (vai trò của ánh sáng trong quang hợp)
- **Viết:** `thực hành thử tinh bột ở lá` · `thí nghiệm bọc giấy bạc một phần lá`
- **Chỉnh:** chọn mẫu, nhóm thí nghiệm hoặc đối chứng và biến số (ô chọn, thanh trượt); bấm "Đo" để ghi từng lần quan sát (mỗi mẫu cho số hơi khác); xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### BIO_LAB_SEED_RESPIRATION — Thực hành: Thực hành hô hấp ở hạt nảy mầm
- **Viết:** `thực hành hô hấp ở thực vật` · `thí nghiệm hạt nảy mầm thải CO2`
- **Chỉnh:** chọn mẫu, nhóm thí nghiệm hoặc đối chứng và biến số (ô chọn, thanh trượt); bấm "Đo" để ghi từng lần quan sát (mỗi mẫu cho số hơi khác); xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### BIO_LAB_CIRCULATION — Thực hành: Thực hành đo mạch và huyết áp trước và sau vận động
- **Viết:** `thực hành đo mạch và huyết áp` · `thực hành một số thí nghiệm về hệ tuần hoàn`
- **Chỉnh:** chọn mẫu, nhóm thí nghiệm hoặc đối chứng và biến số (ô chọn, thanh trượt); bấm "Đo" để ghi từng lần quan sát (mỗi mẫu cho số hơi khác); xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### BIO_LAB_TROPISM — Thực hành: Thực hành cảm ứng ở thực vật: hướng sáng, hướng trọng lực, hướng nước
- **Viết:** `thực hành cảm ứng ở thực vật` · `thực hành hướng sáng, hướng trọng lực, hướng nước`
- **Chỉnh:** chọn mẫu, nhóm thí nghiệm hoặc đối chứng và biến số (ô chọn, thanh trượt); bấm "Đo" để ghi từng lần quan sát (mỗi mẫu cho số hơi khác); xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### BIO_LAB_APICAL_DOMINANCE — Thực hành: Thực hành bấm ngọn, tỉa cành (ưu thế ngọn)
- **Viết:** `thực hành bấm ngọn, tỉa cành` · `thí nghiệm ưu thế ngọn`
- **Chỉnh:** chọn mẫu, nhóm thí nghiệm hoặc đối chứng và biến số (ô chọn, thanh trượt); bấm "Đo" để ghi từng lần quan sát (mỗi mẫu cho số hơi khác); xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### BIO_LAB_TREE_AGE — Thực hành: Thực hành tính tuổi cây qua vòng gỗ
- **Viết:** `thực hành tính tuổi cây` · `thực hành đếm vòng gỗ`
- **Chỉnh:** chọn mẫu, nhóm thí nghiệm hoặc đối chứng và biến số (ô chọn, thanh trượt); bấm "Đo" để ghi từng lần quan sát (mỗi mẫu cho số hơi khác); xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### BIO_LAB_METAMORPHOSIS — Thực hành: Thực hành quan sát quá trình biến thái ở động vật
- **Viết:** `thực hành quan sát quá trình biến thái ở động vật` · `thực hành biến thái hoàn toàn và không hoàn toàn`
- **Chỉnh:** chọn mẫu, nhóm thí nghiệm hoặc đối chứng và biến số (ô chọn, thanh trượt); bấm "Đo" để ghi từng lần quan sát (mỗi mẫu cho số hơi khác); xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### BIO_LAB_PROPAGATION — Thực hành: Thực hành nhân giống vô tính và thụ phấn cho cây
- **Viết:** `thực hành nhân giống vô tính và thụ phấn cho cây` · `thực hành giâm, chiết, ghép cành`
- **Chỉnh:** chọn mẫu, nhóm thí nghiệm hoặc đối chứng và biến số (ô chọn, thanh trượt); bấm "Đo" để ghi từng lần quan sát (mỗi mẫu cho số hơi khác); xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### BIO_LAB_DNA_EXTRACT — Thực hành: Thực hành tách chiết DNA
- **Viết:** `thực hành tách chiết DNA` · `thực hành tách chiết ADN từ gan gà`
- **Chỉnh:** chọn mẫu, nhóm thí nghiệm hoặc đối chứng và biến số (ô chọn, thanh trượt); bấm "Đo" để ghi từng lần quan sát (mỗi mẫu cho số hơi khác); xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### BIO_LAB_CHROMOSOME_MUTATION — Thực hành: Thực hành quan sát đột biến số lượng nhiễm sắc thể trên tiêu bản
- **Viết:** `thực hành quan sát một số dạng đột biến nhiễm sắc thể` · `thực hành tiêu bản cố định đột biến NST`
- **Chỉnh:** chọn mẫu, nhóm thí nghiệm hoặc đối chứng và biến số (ô chọn, thanh trượt); bấm "Đo" để ghi từng lần quan sát (mỗi mẫu cho số hơi khác); xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### BIO_LAB_MODIFICATION — Thực hành: Thực hành thí nghiệm về thường biến ở cây trồng
- **Viết:** `thực hành thí nghiệm về thường biến ở cây trồng`
- **Chỉnh:** chọn mẫu, nhóm thí nghiệm hoặc đối chứng và biến số (ô chọn, thanh trượt); bấm "Đo" để ghi từng lần quan sát (mỗi mẫu cho số hơi khác); xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### BIO_LAB_QUADRAT — Thực hành: Thực hành xác định kiểu phân bố và ước tính mật độ, kích thước quần thể
- **Viết:** `thực hành xác định kiểu phân bố cá thể` · `thực hành ước tính mật độ cá thể quần thể`
- **Chỉnh:** chọn mẫu, nhóm thí nghiệm hoặc đối chứng và biến số (ô chọn, thanh trượt); bấm "Đo" để ghi từng lần quan sát (mỗi mẫu cho số hơi khác); xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### BIO_LAB_COMMUNITY — Thực hành: Thực hành tìm hiểu một số đặc trưng cơ bản của quần xã
- **Viết:** `thực hành tìm hiểu một số đặc trưng cơ bản của quần xã`
- **Chỉnh:** chọn mẫu, nhóm thí nghiệm hoặc đối chứng và biến số (ô chọn, thanh trượt); bấm "Đo" để ghi từng lần quan sát (mỗi mẫu cho số hơi khác); xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

### BIO_LAB_MINI_ECOSYSTEM — Thực hành: Thực hành thiết kế một hệ sinh thái nhân tạo (bể cá)
- **Viết:** `thực hành thiết kế một hệ sinh thái nhân tạo` · `thực hành bể cá cân bằng`
- **Chỉnh:** chọn mẫu, nhóm thí nghiệm hoặc đối chứng và biến số (ô chọn, thanh trượt); bấm "Đo" để ghi từng lần quan sát (mỗi mẫu cho số hơi khác); xem bảng, đồ thị, kết quả; bấm "Kiểm tra kết quả của em" và trả lời câu hỏi.

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

## 9. Vẽ hình từ đề bài hình học

Mở bằng nút **AI → Vẽ hình** (tầng 1 của AI hub). Bấm vào thì các ô xung quanh nút AI **đổi thành các chức năng tầng 2**, và mỗi tầng có một ô **Quay lại** ở trên cùng; không mở bảng hay màn hình khác. Bấm **Trực quan hóa** trên một đoạn đề cũng dựng hình nếu đề có điều kiện cụ thể (tên hình trần như `hình chóp S.ABCD` vẫn mở mô hình 3D có sẵn).

Cây chức năng của AI hub khi vẽ hình:

- **Tầng 1:** Trực quan · Chuyển LaTeX · Chấm bài · Chọn vùng · Môn · Giọng nói · Hỏi đáp AI · **Vẽ hình**
- **Tầng 2 (Vẽ hình):** Quay lại · **Từ đề bài** (mở ô dán đề) · và khi đã có hình: **Dụng cụ** · **Phần đề** · **Yêu cầu** (thêm bằng lời) · Hoàn tác · Làm lại · Xóa hình
- **Tầng 3 Dụng cụ:** Quay lại · Đoạn nối · Trung điểm · Điểm trên cạnh · Chân vuông góc · Thiết diện
- **Tầng 3 Phần đề:** Quay lại · Ẩn phần cuối · Vẽ phần tiếp

Chọn một dụng cụ thì đĩa đóng lại để bạn chạm lên hình; nút AI hiện tên dụng cụ đang dùng. Chạm nút AI lần nữa sẽ mở lại đúng tầng đang dùng. Esc hoặc chạm ra ngoài đưa đĩa về tầng 1. Nút **✎ Dụng cụ** trên hình mở thẳng tầng Vẽ hình.

**Đề viết tay cũng được:** viết đề lên bảng (nhiều dòng cũng được), kéo khung chọn quanh đề rồi bấm **Trực quan hóa**. Bảng dùng kết quả đọc chữ của Vision (cần khóa Gemini/OpenRouter còn hạn mức; bộ đọc offline chỉ đọc ký hiệu toán nên không đọc được đề tiếng Việt). Kết quả đọc có LaTeX (`\text{}`, `\perp`, `\cap`, `A^{\prime}`, `\widehat{ABC}`), dòng ngăn bằng `\\` hoặc đỉnh bị tách cách (`S . A B C D`) đều được làm sạch trước khi hiểu. Viết rõ chữ cái đỉnh viết hoa và dấu phẩy ' để đọc đúng.

**Đề viết đầy đủ hoặc tóm tắt đều được.** Ví dụ:

- `Cho hình chóp S.ABCD có đáy ABCD là hình vuông cạnh a, SA ⊥ (ABCD), SA = a√2. Gọi M là trung điểm SB.`
- `GT: S.ABCD, ABCD là hình chữ nhật, AB = 2a, AD = a, SA ⊥ (ABCD), SA = 3a` / `KL: tính góc giữa SC và đáy`
- `Cho △ABC vuông tại A, AB = 3, AC = 4. Kẻ AH ⊥ BC (H ∈ BC).`

**Ký hiệu hiểu được:** ⊥ vuông góc, ∥ song song, ∩ giao, ≡ trùng, ∈ thuộc, ∠ góc, △ tam giác; độ dài `a√2`, `2a`, `a/2`, số thập phân.

**Hình hỗ trợ:** tam giác (thường, vuông, cân, đều), hình vuông, chữ nhật, bình hành, thoi, thang; hình chóp, tứ diện (kể cả đôi một vuông góc), lăng trụ, hình hộp, lập phương.

**Điểm và đường phụ:** trung điểm, điểm thuộc cạnh, trọng tâm, tâm đáy, hình chiếu (chân đường vuông góc, đường cao), giao của hai đường (`O = AC ∩ BD`), giao của đường với mặt phẳng, giao tuyến hai mặt phẳng (`d = (SAB) ∩ (SCD)`), thiết diện (`thiết diện cắt bởi (MNP)`), điểm trùng nhau (`I ≡ O`), đoạn nối hai điểm.

**Vẽ từng phần:** đề có các phần `a)`, `b)`, `c)` (hoặc `KL:`) được tách riêng. Mặc định chỉ vẽ **hình gốc**; trong AI → Vẽ hình → Phần đề bấm **Vẽ phần tiếp** để hiện thêm từng phần, hoặc **Ẩn phần cuối** để bớt đi. Hình gốc không dịch chuyển hay đổi tỉ lệ khi thêm phần. Tích **Vẽ đủ mọi phần ngay** nếu muốn vẽ hết một lần.

**Vẽ thêm trực tiếp trên hình (AI → Vẽ hình → Dụng cụ):** Đoạn nối (chạm 2 điểm), Trung điểm (2 điểm), Điểm trên cạnh (chạm vào cạnh), Chân vuông góc (điểm rồi 2 điểm của đường thẳng), Thiết diện (3 điểm); **Yêu cầu** để thêm bằng lời (ví dụ `Gọi N là trung điểm SC`); Hoàn tác / Làm lại.

**Giới hạn:** chỉ chiếu xiên kiểu sách giáo khoa (chưa xoay 3D tự do); không có đường tròn, mặt cầu, mặt nón, mặt trụ; đề nhiều bước tính toán chỉ được dựng phần hình, không giải bài; câu không hiểu được hiện trong danh sách ⚠ ở ô xem trước (khi nhập đề) thay vì bị bỏ qua lặng lẽ.
