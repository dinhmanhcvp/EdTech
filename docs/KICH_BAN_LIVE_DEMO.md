# Kịch bản trình diễn trực tiếp — Socratic Vision Board

Mọi câu bên dưới đã được kiểm chứng ngày 27/10/2026 theo hai lớp:

1. **Định tuyến:** `src/__tests__/liveDemoCases.test.ts` (39 mô phỏng, đạt).
2. **Trình duyệt thật:** chạy lần lượt cả 39 câu trên bản dev, mỗi câu mở đúng mô phỏng và không có lỗi trang.

Cách làm chung: viết (hoặc gõ vào ô công thức) → **khoanh vùng** bằng công cụ Chọn → **Trực quan**. Câu có chữ tiếng Việt nên **gõ vào ô công thức** trong thanh khoanh vùng: bộ nhận dạng chữ tay offline chỉ đọc ký hiệu toán; chữ tiếng Việt cần Gemini/OpenRouter có khóa và còn hạn mức.

## A. Hình học: nét vẽ biến thành hình ngay trên bảng

Không qua hologram. Nét tay được thay bằng hình sạch tại chính vị trí vẽ (giống chuyển chữ → công thức).

| Muốn show | Vẽ gì | Thao tác | Kết quả |
|---|---|---|---|
| Hình phẳng | 3 nét thẳng khép kín thành tam giác (hoặc vuông, chữ nhật, bình hành) | Chọn → khoanh → nút xanh **"… (Tương tác tại chỗ)"** | Tam giác sạch, nhãn đỉnh A B C, độ dài cạnh, số đo góc; **kéo từng đỉnh** thì số liệu đổi theo; nút **Euler** hiện O, G, H và đường thẳng Euler |
| Khối 3D | Hình lập phương/hộp/chóp/lăng trụ vẽ bằng ≥ 4 nét (mặt trước, mặt sau, các cạnh nối) | như trên | Khối sạch có **nét liền (cạnh thấy) và nét đứt (cạnh khuất)**, nhãn đỉnh A B C D A' B' C' D'; **vòng xoay ⟳ ở góc** để xoay khối, nét liền/đứt đổi theo góc nhìn |
| Tự động | Dock → **Hình** → bật **Trực quan hình học** | vẽ xong chờ khoảng 1 giây | Tự biến thành hình, không cần khoanh |

Trên mỗi hình có thanh nhỏ: ⠿ di chuyển, **⤢ mở mô phỏng đầy đủ** (hologram có khai triển, cắt thiết diện, mặt cầu, đường cao…), ✕ xóa. Có thể khoanh cả hình để dời, tẩy chạm vào để xóa, Hoàn tác khôi phục nét vẽ.

Gợi ý lời: "Em vẽ nháp, bảng nhận ra đó là hình lập phương và thay bằng hình chuẩn. Nét đứt là cạnh bị che. Em xoay thử."

## B. Toán (11)

| Mô phỏng | Viết/gõ | Điểm nhấn |
|---|---|---|
| Đồ thị nhiều hàm (`MATH_GRAPH`) | `y = x^2 ; y = 2x + 3` | Giao điểm, kéo đồ thị |
| Hàm lượng giác (`MATH_TRIG_WAVE`) | `y = 2sin(3x)` | Thanh trượt biên độ, ω, pha |
| Nguyên hàm (`MATH_FUNC_2D`) | `nguyên hàm của x^3` | Hệ số + hằng số C |
| Khối đa diện (`GEO_SOLID`) | `hình chóp S.ABCD` hoặc vẽ tay (mục A) | Khai triển, cắt thiết diện |
| Oxyz (`MATH_3D_OXYZ`) | `x^2 + y^2 + z^2 = 9` | Mặt cầu cắt mặt phẳng, xoay bằng kéo |
| Tròn xoay (`MATH_INTEGRAL_3D_REVOLVE`) | `y = sqrt(x); a = 0; b = 4 tròn xoay` | Thể tích Riemann |
| Hình học động (`MATH_DYNAMIC_GEOMETRY`) | `đường Euler tam giác` | Kéo đỉnh, O G H thẳng hàng |
| Quy hoạch tuyến tính | `x + y <= 6; x >= 0; y >= 0; max 3x+2y` | Miền nghiệm, đỉnh tối ưu, kéo đường mức |
| Mạng nhện | `x_{n+1} = 3.9 x_n (1 - x_n)` | Hỗn loạn khi r = 3,9 |
| Biểu đồ hộp | `Min=1, Q1=5, Q2=8, Q3=12, Max=20` | Ngoại lai, kéo giá trị lớn nhất |
| Bảng biến thiên | `x \| -∞ -1 1 +∞ ; y' \| + 0 - 0 + ; y \| -∞ ↗ 3 ↘ -1 ↗ +∞` | Dựng đồ thị qua cực trị, bác bảng sai |

## C. Vật lí (9)

| Mô phỏng | Viết/gõ | Điểm nhấn |
|---|---|---|
| Ném xiên | `ném xiên v0 = 22 m/s` | 45° cho tầm xa nhất; đổi g sang Mặt Trăng |
| Con lắc đơn | `con lắc đơn` | Góc lớn thì chu kì lệch công thức gần đúng |
| Mặt phẳng nghiêng | `mặt phẳng nghiêng có ma sát` | tan α > μ thì vật trượt |
| Giao thoa sóng | `giao thoa sóng hai nguồn` | Cực đại khi d₂ − d₁ = kλ |
| Mạch RLC | `mạch RLC cộng hưởng` | Giản đồ Fresnel, ω₀ = 1/√(LC) |
| Khí p–V | `chu trình Carnot` (hoặc Otto, "chu trình tam giác") | η = 50% khi Th = 600 K, Tc = 300 K; đổi chiều tam giác thì công đổi dấu |
| Con lắc kép | `con lắc kép` | Mặc định 150°/120°: hai con lắc lệch 0,001 rad tách nhau sau khoảng 5 giây |
| Coriolis | `lực Coriolis` | Chuyển hệ quay / hệ quán tính; đảo dấu ω là Nam bán cầu |
| Nhiễu xạ N khe | `nhiễu xạ 5 khe` (đổi số khe bằng thanh trượt) | N − 2 cực đại phụ; d = 2b mất bậc 2 |

## D. Hóa học (9)

| Mô phỏng | Viết/gõ | Điểm nhấn |
|---|---|---|
| Cân bằng phương trình | `Fe + O2 -> Fe2O3` | Cân thăng bằng hệ số |
| Chuẩn độ | `chuẩn độ HCl bằng NaOH` | Bước nhảy pH ở điểm tương đương |
| VSEPR 3D | `SF6` (thử `NH3`, `H2O`, `XeF4`, `ClF3`) | Xoay 3D, cặp e riêng, độ phân cực |
| Le Chatelier | `2NO2 ⇌ N2O4` | Nén piston: màu đậm ngay rồi nhạt dần |
| Pin Daniell | `Pin Daniell` (thử `Pin Mg - Cu`) | Nernst, cầu muối, phóng điện |
| SN2 | `SN2` | Nghịch đảo Walden |
| Trường tinh thể | `CFT d6` | Tách mức t₂g / e_g |
| Mạng tinh thể | `FCC` (hoặc `BCC`) | Ô mạng, mặt Miller |
| Cyclohexane | `cyclohexane ghế` (hoặc `thuyền`) | Chuyển cấu dạng |

## E. Sinh học (10)

| Mô phỏng | Viết/gõ | Điểm nhấn |
|---|---|---|
| Quang hợp | `quang hợp` | Nhiệt độ > 45 °C thì tốc độ giảm dốc |
| ADN | `ADN` | Tháo xoắn helicase |
| Bảng Punnett | `P: AaBb × AaBb` | 9:3:3:1; kéo hoán vị gen f |
| Hardy–Weinberg | `0,04AA + 0,32Aa + 0,64aa = 1` | Báo cân bằng hay không |
| Khí khổng | `khí khổng` | Nhiệt độ, độ ẩm đất, ánh sáng |
| Thẩm thấu | `thẩm thấu` | Tế bào thực vật so với hồng cầu |
| Operon Lac | `Operon Lac` | Glucose × lactose, đột biến lacI⁻ |
| Hô hấp tế bào | `chuỗi truyền electron ATP synthase` | Cyanide chặn chuỗi |
| Lotka–Volterra | `Lotka-Volterra` | Trễ pha con mồi/thú săn |
| Truyền tin tế bào | `GPCR apoptosis` | cAMP, caspase |

## F. Thứ tự gợi ý cho một buổi 6–8 phút

1. **Hình học tại chỗ** (mục A): vẽ lập phương → xoay → nét đứt; vẽ tam giác → kéo đỉnh → Euler. Mở màn mạnh nhất.
2. **Một cảnh mỗi môn:** Toán `x^2 + y^2 + z^2 = 9`; Lí `con lắc kép`; Hóa `2NO2 ⇌ N2O4`; Sinh `Operon Lac`.
3. **Câu Socratic:** đọc câu hỏi trong mô phỏng rồi kéo thanh trượt để trả lời.
4. **Lớp học BYOD** (Dock → Lớp học): học sinh quét QR, kéo thanh trượt đồng bộ. Cần backend chạy; học sinh vào trước khi bắt đầu.

## G. Điều cần biết trước khi lên sân khấu

- Danh sách trên được kiểm bằng **gõ vào ô công thức**. Viết tay thật chỉ nên dùng cho ký hiệu toán ngắn (`y = x²`, `x² + y² + z² = 9`); chưa thử trên bút/bảng thật.
- Gemini miễn phí chỉ vài chục lượt/ngày; hết thì đường chữ tiếng Việt viết tay không dùng được. Các câu ở bảng trên không cần AI.
- Hologram cao hơn bảng sẽ **tự thu nhỏ vừa khung** sau khoảng 0,7 giây khi mở.
- Phòng BYOD nằm trong RAM; khởi động lại backend là mất phòng.
- Chưa có nút ghi/tua lại bài giảng trên giao diện (module `vectorJournal` chưa nối).
- Nút "Tải ảnh" hiện vẽ cả hình tại chỗ; chưa kiểm tra trực quan ảnh xuất.

## H. Thao tác bảng như bảng trắng trực tuyến

| Việc | Cách làm |
|---|---|
| Thu phóng | Nút − / + / % ở góc trên trái; **Ctrl + cuộn**; chụm hai ngón; phím **Ctrl + / − / 0** (0 = vừa khung). Phóng tối đa 500%, nét vẫn sắc vì bộ đệm canvas tăng độ phân giải theo mức phóng |
| Di chuyển bảng | Công cụ **Tay** trong dock; hoặc giữ **Space** rồi kéo; hoặc chuột giữa; hoặc hai ngón; khi đã phóng to thì cuộn chuột cũng dịch bảng |
| Diện tích viết lớn nhất | Nút **toàn màn hình** (góc trên trái). Bảng tự giãn theo chiều cao màn hình. Phóng to rồi viết chữ nhỏ cho nhiều nội dung hơn, thêm **trang** khi hết chỗ |
| Nhiều trang | `‹ 1/3 ›`, thêm trang trắng, xóa trang. Mỗi trang giữ nét riêng; đổi trang xóa lịch sử hoàn tác |
| Chèn chữ | Công cụ **Chữ**: chạm vào bảng, gõ, Enter. Chữ là đối tượng kéo được, sửa được |
| Nhân đôi | Khoanh vùng → **Nhân đôi** (hoặc Ctrl + D) |
| Phím tắt | Ctrl + Z / Ctrl + Y hoàn tác / làm lại; Delete xóa vùng chọn |

Chưa có: chèn ảnh, ghi chú dán, con trỏ laser, lưu/đọc lại bảng (các trang chỉ nằm trong bộ nhớ trang web đang mở), đồng bộ thu phóng sang máy học sinh. Hologram không bị thu phóng theo bảng, nó nổi trên bảng và có thanh trượt thu phóng riêng.
