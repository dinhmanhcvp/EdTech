# KỊCH BẢN VIDEO ViSEF – FRESHNOSE AI (bản ưu tiên giao diện và đồ họa)

Theo `KHKT/00_PROMPT/02_Prompt_KichBanVideo.md`. Nguồn duy nhất: `visef/bao-cao_ban-final.md` (bản FINAL 06/11/2026, số liệu từ CSV). File này **sinh tự động** từ `canh.py` bằng `tao_kich_ban.py`: sửa lời/hình trong `canh.py` rồi chạy lại để cập nhật mốc giờ, số chữ và phụ đề.

**Nguyên tắc riêng của bản này:** không quay mặt người. Lời thoại là giọng đọc của thành viên (VO 1–4). Hình chủ yếu là giao diện trạm (phát lại dữ liệu thật trong CSV), đồ họa và mô hình 3D. Chỉ còn 2 cảnh quay **tay và thiết bị** (5.6, 5.8) cùng 2 ảnh thật (4.3, 6.3) để chứng minh có nguyên mẫu và thí nghiệm thật.


## KHỐI A – THÔNG TIN ĐẦU VÀO ĐÃ DÙNG (cần nhóm xác nhận)

| Mục | Giá trị đang giả định |
|---|---|
| Báo cáo | `visef/bao-cao_ban-final.md` / `BAO_CAO_FRESHNOSE_final.docx` (15 trang, 06/11/2026) |
| Thời lượng tối đa | 5:00 (mặc định của prompt) **[CẦN NHÓM XÁC NHẬN theo thể lệ]** |
| Thể lệ khác | Chưa có: ẩn danh? số tác giả? **[CẦN NHÓM XÁC NHẬN]** → kịch bản không có tên trường, tên người, logo |
| Loại dự án | Kỹ thuật – chế tạo (có phần học máy) |
| Thành viên | Chưa có danh sách cho ViSEF → người dẫn ghi VO 1–4 **[CẦN NHÓM ĐIỀN tên và phần việc thật]** |
| Tư liệu đã có | Mô hình 3D Node, Trạm, kho (`src-media/video`, `anh-tinh`); số liệu CSV (`PhuLucA`, `PhuLucB_*`); hình 3.1, 4.1 trong báo cáo |
| Cần quay/chụp thêm | Ảnh 3 buồng thí nghiệm; ảnh time-lapse vết thối; tay gắn Node thật, màn hình Trạm thật, đặt màng PTFE |
| Người ngoài nhóm | Không có |
| Điểm muốn nhấn | Ít người đóng, ưu tiên giao diện và đồ họa (yêu cầu ngày 07/11) |

## BƯỚC 1 – PHÂN TÍCH BÁO CÁO

### 1.1. Thông điệp cốt lõi
**Chọn:** *Dự án giải quyết việc phát hiện muộn quả lên men trong kho mát cho hợp tác xã xoài, chuối bằng mũi điện tử giá thấp (2 cảm biến khí bán dẫn + cảm biến nhiệt ẩm + Random Forest), báo lên men sớm hơn mắt thường khoảng 26 giờ và phân loại đúng 87,5 % trên đợt kiểm tra.*

Dự phòng 1 (nhấn chi phí): *… với gói 22 triệu đồng, nằm trong mức chi của 13/18 đơn vị khảo sát.*
Dự phòng 2 (nhấn độ tin cậy cảnh báo): *… nhận đúng 498/500 mẫu lên men với cảnh báo giả 6,2 %.*

### 1.2. Sổ số liệu (8 con số nói trong lời thoại)

| # | Con số | Ý nghĩa | Vị trí trong báo cáo | Cách nói | Cách hiện trên màn hình |
|---|---|---|---|---|---|
| 1 | 25,4 % | Rau quả mất sau thu hoạch toàn cầu, 2023 | Mục 1.1, TLTK [1] FAO | "25,4 % rau quả" | 25,4 % + "Nguồn: FAO (2025)" |
| 2 | 15/18 | Đơn vị kiểm tra bằng mắt, mũi | Mục 4.1, PhuLucA | "mười lăm trên mười tám nơi" | 15/18 biểu tượng + "n = 18, mẫu thuận tiện" |
| 3 | 4.500 | Số mẫu, 3 đợt × 3 buồng | Mục 3.1 | "4.500 mẫu" | bộ đếm 4.500 |
| 4 | 87,47 % | Độ chính xác trên đợt 3 (1.312/1.500) | Bảng 4.4, 4.5 | "87,5 %" | 87,47 % (1.312/1.500) |
| 5 | 6,2 % | Cảnh báo giả (62/1.000) | Bảng 4.4, 4.5 | "6,2 %" | 6,2 % (62/1.000) |
| 6 | 26,3 ± 6,4 giờ | Mức đỏ sớm hơn lúc thấy vết thối (6 chuỗi) | Mục 4.2.4, Bảng 4.5 | "khoảng 26 giờ" | 26,3 ± 6,4 giờ + chú thích "tính từ nhãn; đợt 3 dự đoán thật 36,0 và 27,5 giờ" |
| 7 | 45,0 % | Độ nhạy lớp chín sinh lý (hạn chế) | Bảng 4.4, Mục 5.2 | "mới đúng 45 %" | 45,0 % (xám) |
| 8 | 22 triệu đồng | Giá gói 1 Trạm + 8 Node | Bảng 4.5 (TC5), Mục 4.2.2 | "22 triệu" | 22 triệu đồng/gói (giá vốn ước tính 13,4 triệu) |

Số phụ chỉ hiện trên màn hình (không đọc): ngưỡng TC1–TC3 (85 %, 10 %, 12 giờ — Bảng 2.1); 498/500 (Bảng 4.4); 0,3 / 0,87 / 0,66 (Bảng 4.3); 23,5 ngày (Mục 4.2.4); 13/18 (Mục 4.1); số đo v1/v2 (Bảng 4.2).

### 1.3. Câu chuyện cải tiến (Bảng 4.2)
- **v1:** sấy cảm biến liên tục → pin cạn ở giờ 18–19; hơi nước đọng khi độ ẩm khoảng 88 % → điện trở TGS2602 tụt từ 46–48 kΩ xuống 4–6 kΩ. **Sửa:** chu kỳ 30 phút (sấy 120 s, đọc 30 s, ngủ sâu) + màng PTFE. **Kết quả:** pin 23,5 ngày; màng khô ở 108/108 lần đo.
- **v2:** báo đỏ giả theo chu kỳ, nhiệt độ vọt tới 14,6 °C, độ ẩm 97,5 % (nghi do xả đá). **Sửa:** đưa nhiệt độ, độ ẩm SHT31 vào đầu vào mô hình. **Kết quả:** cảnh báo giả 6,2 %, không tập trung ở mẫu nóng (8/120 so với 54/880). Báo cáo ghi rõ **chưa có số đo trước khi bù** → video không nói "giảm từ … xuống …".

### 1.4. Mâu thuẫn và thiếu sót cần biết trước khi quay
1. **Giá bán khác phim SV_STARTUP:** phim khởi nghiệp nói "8 triệu đồng một bộ, chi phí ban đầu 3 triệu"; báo cáo ViSEF ghi gói 1 Trạm + 8 Node **22 triệu**, giá vốn ước tính **13,4 triệu**. Video ViSEF theo báo cáo; **không dùng lại cảnh giá của phim SV**. Nhóm nên chốt một cách nói nếu giám khảo xem cả hai.
2. **Δt 26,3 giờ tính từ nhãn**, không từ dự đoán của mô hình (cột Model_Red_Alert trùng nhãn lớp 2); chỉ đợt 3 có dự đoán thật (36,0 và 27,5 giờ). Lời nói "khoảng 26 giờ", màn hình có chú thích.
3. **Chưa có ảnh nguyên mẫu:** Hình 4.2 là mô hình 3D theo thiết kế. Cảnh 3D phải ghi "mô hình theo thiết kế"; cần ít nhất cảnh 5.8 (tay + thiết bị thật) để chứng minh có nguyên mẫu.
4. **Khoanh vùng theo dãy kệ chưa kiểm chứng** (mỗi chuỗi chỉ một điểm đo) → cảnh 5.3 có chú thích; không nói "chỉ ra đúng sọt hỏng".
5. **Ba đợt chồng nhau 5 ngày, dùng chung mã buồng với 3 Node**, tập kiểm tra chưa độc lập về thiết bị → không nói "độc lập hoàn toàn"; 4.4 chỉ nói "đợt ba chưa từng thấy".
6. **Pin đo tháng 7–8/2026, một Node**, khác thời điểm thí nghiệm quả (tháng 6) → màn hình ghi "đo ở 12 °C".
7. Lớp **chín sinh lý** 74,8 % mẫu đến từ buồng đối chứng → nằm trong hạn chế 7.1.

### 1.5. Đối chiếu tư liệu
| Cảnh | Đã có | Phải làm thêm | Không khả thi → thay bằng |
|---|---|---|---|
| 1.1, 7.3 | Logo (src-media/logo) | Bỏ logo/tên nếu thể lệ ẩn danh | — |
| 2.2, 5.1 | Cảnh kho 3D (video 04) | Bản nhìn từ trên, nền sáng | Kho thật: không có quyền quay → 3D "minh họa" |
| 4.3 | — | **Ảnh 3 buồng thí nghiệm** | Nếu không có: chỉ đồ họa lưới 3 × 3 |
| 5.2 | Bóc tách Node 3D (video 02) | Cắt 10 s, thêm chú thích "theo thiết kế" | — |
| 5.3, 5.4 | Dữ liệu CSV đợt 3 | **Dựng giao diện Trạm phát lại CSV** | Nếu có Trạm thật: quay màn hình Trạm chạy cùng dữ liệu |
| 5.5–5.7 | Nhật ký v1, v2, dữ liệu thô | Dựng đồ thị từ CSV | — |
| 5.6, 5.8 | — | **Quay tay + Node, Trạm thật** (không mặt) | Không có nguyên mẫu → báo giám khảo bằng ảnh mạch thật |
| 6.3 | — | **Ảnh time-lapse vết thối đầu tiên** (dữ liệu nội bộ của nhóm) | Không có: chỉ biểu đồ 2 |


## BƯỚC 2 – KỊCH BẢN CHI TIẾT

| Cảnh | Thời điểm | Người dẫn | Lời thoại | Hình ảnh & góc máy | Chữ/đồ họa trên màn hình | Âm thanh | Nguồn trong báo cáo | Số chữ |
|---|---|---|---|---|---|---|---|---|
| **1** | | | **MỞ ĐẦU** | | | | | |
| 1.1 | 0:00.0–0:08.0 | — | *(không lời)* | ĐỒ HỌA: nền trắng, đường tín hiệu xanh lá vẽ dần thành hình chiếc lá, chấm hổ phách sáng ở đỉnh. | Tên dự án: "FreshNose AI – Hệ thống mũi điện tử thông minh cảnh báo sớm hư hỏng & tối ưu thời gian lưu kho nông sản xuất khẩu". Lĩnh vực: Thống kê | Nhạc nền miễn phí bản quyền, nhỏ | Bìa | 0 |
| **2** | | | **VẤN ĐỀ THỰC TẾ** | | | | | |
| 2.1 | 0:08.0–0:18.2 | VO 1 | Theo FAO, năm 2023 thế giới mất 25,4 % rau quả sau thu hoạch. | ĐỒ HỌA: con số lớn đếm lên 25,4 %; phía sau một lưới quả mờ dần 1/4 số quả. | 25,4 % rau quả mất sau thu hoạch (2023). Nguồn: FAO (2025), SDG 12.3.1 | Nhạc | Mục 1.1, TLTK [1] | 24 |
| 2.2 | 0:18.2–0:28.1 | VO 1 | Trong kho mát, một sọt xoài dập có thể lên men rồi lây ra cả pallet, dù nhiệt độ kho vẫn bình thường. | ĐỒ HỌA 3D (cảnh kho đã dựng, nhìn từ trên): một sọt chuyển hổ phách rồi lan sang các sọt kế bên; nhiệt kế góc màn hình đứng yên 12 °C. | Nhiệt kế: 12 °C (không đổi) | Tiếng "tích" nhỏ mỗi lần sọt đổi màu | Mục 1.1, Bảng 1.1 | 23 |
| 2.3 | 0:28.1–0:39.1 | VO 1 | Nhóm em khảo sát mười tám đơn vị: mười lăm nơi vẫn kiểm tra bằng mắt và mũi, tức là chỉ thấy khi quả đã thối. | ĐỒ HỌA: 18 biểu tượng nhà kho xếp 3 hàng; 15 biểu tượng sáng lên kèm hình con mắt. | 15/18 đơn vị kiểm tra bằng mắt, mũi. Nguồn: khảo sát của nhóm, n = 18, mẫu thuận tiện | Nhạc | Mục 4.1 (PhuLucA) | 26 |
| **3** | | | **KHOẢNG TRỐNG & MỤC TIÊU** | | | | | |
| 3.1 | 0:39.1–0:48.9 | VO 1 | Nhìn và ngửi thì muộn, đo nhiệt ẩm thì không thấy lên men, máy đo khí cầm tay thì phải đo từng điểm. | ĐỒ HỌA: 3 thẻ biểu tượng (con mắt, nhiệt kế, máy đo cầm tay), mỗi thẻ hiện một dòng hạn chế khi được nhắc tới. Không dùng logo hãng. | Muộn · Không thấy lên men · Đo thủ công từng điểm | Nhạc | Bảng 1.1 | 23 |
| 3.2 | 0:48.9–0:57.1 | VO 1 | Chưa có cách nào vừa đo liên tục, vừa thấy lên men, vừa hợp túi tiền hợp tác xã. | ĐỒ HỌA: 3 vòng tròn giao nhau (Liên tục · Đo lên men · Giá phù hợp), vùng giữa trống, có dấu hỏi. |  | Nhạc | Mục 1.1 | 19 |
| 3.3 | 0:57.1–1:11.4 | VO 1 | Mục tiêu của nhóm em: phân loại đúng từ 85 %, cảnh báo giả không quá 10 %, báo sớm hơn mắt ít nhất 12 giờ. | ĐỒ HỌA: 3 thẻ mục tiêu hiện lần lượt theo lời. | Độ chính xác ≥ 85 % · Cảnh báo giả ≤ 10 % · Sớm hơn mắt ≥ 12 giờ | Nhạc | Bảng 2.1 (TC1–TC3) | 34 |
| **4** | | | **CƠ SỞ KHOA HỌC & PHƯƠNG PHÁP** | | | | | |
| 4.1 | 1:11.4–1:22.0 | VO 2 | Quả lên men tỏa ra hơi cồn. Cảm biến khí bán dẫn giống một chiếc mũi: gặp hơi cồn, điện trở của nó giảm xuống. | ĐỒ HỌA: phân tử ethanol, acetaldehyde (mô hình bi–que) bay vào một cảm biến; chỉ số Rs/R0 trên đồng hồ tụt dần. | Rs/R0 = điện trở trong khí mẫu / điện trở trong không khí sạch | Nhạc | Mục 1.2, TLTK [6]–[8] | 25 |
| 4.2 | 1:22.0–1:33.9 | VO 2 | Một cảm biến dễ nhầm, nên nhóm em ghép hai cảm biến khí với cảm biến nhiệt ẩm, rồi để Random Forest nhận dạng cả mẫu tín hiệu. | ĐỒ HỌA: 3 ô tín hiệu (TGS2602, TGS822, SHT31) gộp thành một "dấu vân tay mùi" → biểu tượng rừng cây quyết định → 3 nhãn màu. | TGS2602 · TGS822 · SHT31 → Random Forest → An toàn / Chín sinh lý / Nguy cơ lên men | Nhạc | Mục 1.2, Mục 3.1 | 28 |
| 4.3 | 1:33.9–1:47.4 | VO 2 | Thí nghiệm có ba đợt, mỗi đợt ba buồng: quả lành, quả bị xước và quả nhiễm nấm, đo ba mươi phút một lần, được 4.500 mẫu. | ẢNH THẬT của nhóm: ba buồng mát có quả [CẦN ẢNH THẬT]; đồ họa lưới 3 × 3 (đợt × buồng), bộ đếm chạy tới 4.500. | 3 đợt × 3 buồng · 30 phút/lần · 4.500 mẫu | Nhạc | Mục 3.1 | 32 |
| 4.4 | 1:47.4–1:55.2 | VO 2 | Mô hình học trên hai đợt đầu, rồi kiểm tra trên đợt ba mà nó chưa từng thấy. | ĐỒ HỌA: dòng thời gian 3 đợt; đợt 1–2 tô xanh "Học", đợt 3 tô hổ phách "Kiểm tra". | Học: 3.000 mẫu (đợt 1, 2) · Kiểm tra: 1.500 mẫu (đợt 3) | Nhạc | Mục 3.1 (Đánh giá) | 18 |
| **5** | | | **SẢN PHẨM & QUÁ TRÌNH** | | | | | |
| 5.1 | 1:55.2–2:04.2 | VO 3 | Các Node gắn nam châm trên thành pallet, gửi dữ liệu qua sóng LoRa về một trạm đặt gần cửa kho. | ĐỒ HỌA 3D: camera bay qua kho mát, các Node trên thanh ray kệ sáng lần lượt, trạm trên tường. | Mô hình minh họa | Nhạc | Mục 4.2.1, Mục 4.3 | 21 |
| 5.2 | 2:04.2–2:15.6 | VO 3 | Mỗi Node có hai cảm biến khí, cảm biến nhiệt ẩm, vi điều khiển ESP32 và pin. Màng chống nước giữ cảm biến luôn khô. | ĐỒ HỌA 3D bóc tách Node (phong cách anatomy, đã dựng): các lớp tách theo trục, nhãn tiếng Việt có đường dẫn. | Nhãn: TGS2602, TGS822, SHT31, ESP32-S3, LoRa, màng PTFE, pin LiFePO4. Góc dưới: "Mô hình 3D theo thiết kế, chưa phải ảnh nguyên mẫu" | Nhạc | Mục 4.2.1, Bảng 4.1, Hình 4.2 | 27 |
| 5.3 | 2:15.6–2:24.2 | VO 3 | Trạm tô màu từng phân khu: xanh là ổn định, vàng cần theo dõi, đỏ là nguy cơ lên men. | GIAO DIỆN TRẠM: sơ đồ phân khu kho, gói tin LoRa bay về; 3 mức màu hiện chú thích. | Mức 1 xanh · Mức 2 vàng · Mức 3 đỏ. Chú thích nhỏ: chỉ ra phân khu là thiết kế dự kiến, chưa kiểm chứng | Tiếng "bíp" nhẹ khi gói tin tới | Mục 4.2.1 | 20 |
| 5.4 | 2:24.2–2:38.2 | VO 3 | Đây là dữ liệu thật của đợt ba phát lại trên trạm: buồng nhiễm nấm và buồng xước lần lượt chuyển đỏ, buồng đối chứng vẫn xanh. | GIAO DIỆN TRẠM phát lại dữ liệu thật (PhuLucB_Test_Predictions_1500samples.csv): 3 ô buồng đổi màu theo dự đoán từng mẫu, thanh thời gian chạy nhanh; đồ thị Rs/R0 chạy theo. | Góc trên: "Phát lại dữ liệu thật – đợt 3". Đồng hồ giờ thí nghiệm chạy | Tiếng "tích" mỗi lần đổi mức | Mục 4.2.4, PhuLucB_Test_Predictions | 27 |
| 5.5 | 2:38.2–2:50.1 | VO 4 | Bản đầu sấy cảm biến liên tục nên pin cạn chưa tới một ngày. Nhóm em chuyển sang ba mươi phút đo một lần rồi cho ngủ sâu. | GIAO DIỆN NHẬT KÝ ĐO v1: đồ thị điện áp pin rơi về 0 ở giờ 18–19; chuyển sang sơ đồ chu kỳ v2 (sấy 120 s · đọc 30 s · ngủ sâu). | v1: pin cạn ở giờ 18–19 → v2: chu kỳ 30 phút | Nhạc | Bảng 4.2 (v1), PhuLucB_NhatKy_DoKiem_v1.csv | 28 |
| 5.6 | 2:50.1–2:59.9 | VO 4 | Hơi nước còn đọng lên cảm biến làm tín hiệu tụt giả, nên nhóm em thêm màng chống nước ở cửa lấy khí. | GIAO DIỆN NHẬT KÝ ĐO: điện trở TGS2602 tụt từ 46–48 kΩ xuống 4–6 kΩ (v1) so với đường phẳng (v2). CẬN TAY: đặt màng PTFE vào cửa lấy khí của Node thật [CẦN QUAY – chỉ tay, không mặt]. | v1: 46–48 kΩ → 4–6 kΩ khi đọng sương · v2: màng PTFE khô ở 108/108 lần đo | Nhạc | Bảng 4.2, Mục 4.2.4, PhuLucB_NhatKy_DoKiem_v2.csv | 23 |
| 5.7 | 2:59.9–3:10.9 | VO 4 | Bản hai còn báo đỏ giả theo chu kỳ, nghi do kho xả đá, nên nhóm em đưa nhiệt độ và độ ẩm vào mô hình. | GIAO DIỆN: đồ thị nhiệt độ có các đỉnh tới 14,6 °C, chấm đỏ giả trùng đỉnh; sau khi bù, chấm đỏ giả không còn tập trung ở đỉnh nóng. | Đỉnh 14,6 °C · 97,5 % · "Sau bù: cảnh báo giả không tập trung ở mẫu nóng" | Nhạc | Bảng 4.2 (v2) | 26 |
| 5.8 | 3:10.9–3:17.1 | VO 4 | Nguyên mẫu hiện có một trạm và ba Node do nhóm em tự lắp. | CẬN TAY: Node thật được gắn nam châm lên thanh kệ; màn hình trạm thật bật lên [CẦN QUAY – chỉ tay và thiết bị]. | 1 trạm + 3 Node | Tiếng "cạch" nam châm | Mục 2.4, Bảng 3.1 | 14 |
| **6** | | | **KẾT QUẢ** | | | | | |
| 6.1 | 3:17.1–3:34.2 | VO 2 | Trên đợt kiểm tra, mô hình phân loại đúng 87,5 %, nhận ra 498 trên 500 mẫu đang lên men, và cảnh báo giả 6,2 %. | ĐỒ HỌA: 3 con số lớn hiện lần lượt; ma trận nhầm lẫn mờ phía sau, ô "Nguy cơ lên men – đúng 498" sáng lên. | 87,47 % (1.312/1.500) · 498/500 mẫu lên men · Cảnh báo giả 6,2 % (62/1.000) | Tiếng "ting" nhẹ ở mỗi số | Bảng 4.4, Bảng 4.5 | 41 |
| 6.2 | 3:34.2–3:45.7 | VO 2 | Khi quả lên men, tín hiệu của cả hai cảm biến cùng tụt xuống khoảng 0,3, còn quả lành chỉ giảm nhẹ khi chín. | BIỂU ĐỒ 1: cột Rs/R0 của TGS2602 và TGS822 theo 3 trạng thái (lành–an toàn, lành–chín, nhiễm nấm–lên men); cột dự án màu xanh lá/hổ phách, đối chứng màu xám; cột mọc theo lời. | An toàn 0,87 · Chín 0,66 · Lên men 0,33 (TGS2602). Nguồn: Bảng 4.3 | Nhạc | Bảng 4.3 | 27 |
| 6.3 | 3:45.7–3:57.9 | VO 2 | Ở cả sáu chuỗi quả hỏng, mức đỏ xuất hiện trước khi thấy vết thối trung bình khoảng 26 giờ, đủ để tách sọt trong một ca. | BIỂU ĐỒ 2: 6 thanh ngang (18,5–35,5 giờ) với đường ngưỡng 12 giờ. ẢNH TIME-LAPSE THẬT của nhóm: khung đầu tiên có vết thối 1 mm [CẦN ẢNH THẬT]. | 26,3 ± 6,4 giờ (6 chuỗi). Chú thích nhỏ: tính từ nhãn; đợt 3 theo dự đoán thật: 36,0 và 27,5 giờ | Nhạc | Mục 4.2.4, Bảng 4.5 (TC3) | 29 |
| 6.4 | 3:57.9–4:04.5 | VO 2 | Một Node chạy hơn ba tuần mới phải sạc, đủ một chu kỳ lưu kho. | GIAO DIỆN NHẬT KÝ PIN: đường dung lượng giảm dần qua 1.128 chu kỳ đo, đánh dấu ngày 21,0 (20 %) và 23,5 (10,3 %). | 23,5 ngày · pin 6.000 mAh · đo ở 12 °C | Nhạc | Mục 4.2.4, Bảng 4.5 (TC4) | 15 |
| **7** | | | **KẾT LUẬN & HƯỚNG ĐI** | | | | | |
| 7.1 | 4:04.5–4:18.4 | VO 3 | Hạn chế lớn nhất: lớp chín sinh lý mới nhận đúng 45 %, và mới thử trong phòng thí nghiệm. Tiếp theo nhóm em sẽ thử tại hai kho mát. | ĐỒ HỌA: thẻ "Hạn chế" nền xám nhạt, số 45,0 % màu xám; dòng thời gian Pilot 10/2026–2/2027. | Lớp chín sinh lý: 45,0 % · Pilot 2 kho: 10/2026 – 2/2027 (chưa có kết quả) | Nhạc | Mục 5.2, 5.3, Bảng 3.1 | 33 |
| 7.2 | 4:18.4–4:29.4 | VO 3 | Gói một trạm, tám Node giá 22 triệu đồng, trong mức chi của 13 trên 18 đơn vị khảo sát. | ĐỒ HỌA: gói 1 trạm + 8 Node (biểu tượng); con số giá; 13/18 biểu tượng sáng. | 22 triệu đồng/gói (giá vốn ước tính 13,4 triệu) | Nhạc | Bảng 4.1, Bảng 4.5 (TC5), Mục 4.1 | 26 |
| 7.3 | 4:29.4–4:46.6 | VO 3 | Mũi điện tử giá thấp của nhóm em báo lên men sớm hơn mắt thường khoảng 26 giờ và phân loại đúng 87,5 %, giúp kho tách sọt hỏng trước khi lây cả pallet. | ĐỒ HỌA: quay lại hình chiếc lá – đường tín hiệu của Mở đầu; hai con số chốt. | ≈ 26 giờ sớm hơn · 87,5 % | Nhạc lên rồi tắt | Tóm tắt, Mục 5.1 | 41 |

**Tổng thời lượng dự kiến:** 4:46.6 (tốc độ 148 âm tiết/phút, nghỉ 0,5 s mỗi cảnh) · **Tổng số chữ lời thoại:** 650 âm tiết

| Đoạn | Thời lượng thực | Khung chuẩn (5:00) | Tỉ lệ thực | Tỉ lệ chuẩn |
|---|---|---|---|---|
| 1. Mở đầu | 8.0 s | 10 s | 3 % | 3 % |
| 2. Vấn đề thực tế | 31.1 s | 35 s | 11 % | 12 % |
| 3. Khoảng trống & mục tiêu | 32.3 s | 35 s | 11 % | 12 % |
| 4. Cơ sở khoa học & phương pháp | 43.8 s | 40 s | 15 % | 13 % |
| 5. Sản phẩm & quá trình | 82.0 s | 80 s | 29 % | 27 % |
| 6. Kết quả | 47.4 s | 55 s | 17 % | 18 % |
| 7. Kết luận & hướng đi | 42.0 s | 35 s | 15 % | 12 % |

Đoạn 5 + 6: 45 % thời lượng (yêu cầu ≥ 45 %).


## BƯỚC 3 – KẾ HOẠCH QUAY VÀ DỰNG

### 3.1. Cảnh quay thật (gom theo địa điểm) – chỉ tay và thiết bị, không mặt người

| Địa điểm | Cảnh | Nội dung | Ai có mặt | Đạo cụ | Lưu ý |
|---|---|---|---|---|---|
| Phòng thí nghiệm / nơi đặt buồng mát | 4.3 | Ảnh 3 buồng có quả (lành, xước, nhiễm nấm) | 1 người chụp | Buồng, quả, nhãn buồng | Không để logo, tên trường; **[BẢO HỘ: găng tay khi chạm quả nhiễm nấm]** |
| Bàn làm việc nền trắng | 5.6 | Cận tay đặt màng PTFE vào cửa lấy khí Node | 1 tay | Node mở nắp, màng PTFE | Đèn mềm, máy cố định, quay 4K để phóng |
| Thanh kệ kim loại / giá sắt | 5.8 | Tay gắn Node bằng nam châm lên thanh kệ; bật màn hình Trạm | 1 tay | Node, Trạm, giá sắt | Thu tiếng "cạch" nam châm |
| (Có sẵn) | 6.3 | Ảnh time-lapse khung đầu tiên có vết thối 1 mm | — | Ảnh nội bộ của nhóm | Ghi "Ảnh time-lapse của nhóm" góc dưới |

Giọng đọc VO 1–4: thu riêng trong phòng yên, điện thoại để cách miệng 20 cm, đọc theo bảng ở Bước 2.

### 3.2. Đồ họa và giao diện cần dựng (kèm dữ liệu)

Phong cách theo Khối C4: nền trắng/giấy sáng, một màu nhấn xanh lá (#0E6B47), hổ phách (#F2A31B) chỉ cho cảnh báo, xám cho đối chứng; font Montserrat (giống logo); chỉ cắt thẳng hoặc mờ dần.

| Mã | Cảnh | Nội dung | Dữ liệu | Có sẵn để tái dùng |
|---|---|---|---|---|
| G1 | 1.1, 7.3 | Đường tín hiệu vẽ thành chiếc lá + tên dự án | — | `src-media/logo`, `Mark` trong `src/freshnose/ui.tsx` |
| G2 | 2.1 | Số 25,4 % đếm lên + lưới quả mờ 1/4 | FAO [1] | — |
| G3 | 2.2, 5.1 | Kho 3D nhìn từ trên, sọt lan màu; Node sáng lần lượt | — | `Warehouse.tsx` |
| G4 | 2.3, 7.2 | 18 biểu tượng kho, 15 (rồi 13) sáng | PhuLucA_KhaoSat_18DonVi.csv | `StatsScene` (đổi sang biểu tượng) |
| G5 | 3.1–3.3 | 3 thẻ giải pháp + vòng Venn + 3 thẻ mục tiêu | Bảng 1.1, 2.1 | — |
| G6 | 4.1–4.2 | Phân tử bi–que bay vào cảm biến; Rs/R0 tụt; 3 tín hiệu → rừng cây → 3 nhãn | — | `Molecule`, `ChemInsert`, `AiInsert` |
| G7 | 4.3–4.4 | Lưới 3 đợt × 3 buồng, bộ đếm 4.500; dòng thời gian Học/Kiểm tra | Mục 3.1 | — |
| G8 | 5.2 | Bóc tách Node 10 s có nhãn | Bảng 4.1 | `NodeExploded.tsx` (video 02) |
| **G9** | **5.3–5.4** | **Giao diện Trạm phát lại dữ liệu thật đợt 3**: 3 ô buồng đổi màu theo cột dự đoán từng mẫu, đồ thị Rs/R0 chạy theo giờ | **PhuLucB_Test_Predictions_1500samples.csv** + PhuLucB_FreshNose_RawTimeSeries.csv (đợt 3) | **ĐÃ DỰNG** (07/11): `src-media/video/06-giao-dien-tram-phat-lai-dot3.mp4` (21 s, composition `FN-HubReplay`, dữ liệu `xuat_du_lieu_tram.py` có tự kiểm khớp báo cáo) |
| G10 | 5.5–5.7 | Đồ thị nhật ký v1 (pin rơi ở giờ 18–19; Rs 46–48 → 4–6 kΩ), sơ đồ chu kỳ 30 phút, đỉnh nhiệt độ 14,6 °C | PhuLucB_NhatKy_DoKiem_v1.csv, v2.csv, RawTimeSeries | — |
| G11 | 6.1 | 3 số lớn + ma trận nhầm lẫn mờ | Bảng 4.4 | `Counter` trong `scenes.tsx` |
| **G12 – Biểu đồ 1** | 6.2 | Cột Rs/R0 TGS2602, TGS822 theo 3 trạng thái | Bảng 4.3 | — |
| **G13 – Biểu đồ 2** | 6.3 | 6 thanh Δt (18,5; 21,0; 27,0; 24,5; 31,5; 35,5 giờ) + đường 12 giờ | Mục 4.2.4 | — |
| G14 | 6.4 | Đường dung lượng pin qua 1.128 chu kỳ | PhuLucB_Battery_Discharge_Log.csv | — |
| G15 | 7.1 | Thẻ hạn chế xám + dòng thời gian Pilot | Mục 5.2, Bảng 3.1 | `Roadmap` (rút gọn) |

Đúng giới hạn Khối C4: **2 biểu đồ** (G12, G13); các đồ thị trong G9, G10, G14 nằm trong giao diện Trạm/nhật ký đo, đóng vai cảnh "quay màn hình" thay cho người đóng.

### 3.3. Lịch đề xuất **[CẦN NHÓM ĐIỀN hạn nộp]**
1. Ngày 1: nhóm chốt Khối A (thời lượng, ẩn danh, người đọc VO), xác nhận mục 1.4.
2. Ngày 2: chụp/quay 4 cảnh thật (mục 3.1, khoảng 1 giờ); thu giọng 4 VO.
3. Ngày 3–4: dựng G9 (giao diện phát lại CSV) và G10–G14 từ CSV; ghép G3, G8 từ video có sẵn.
4. Ngày 5: dựng thô theo giọng thật, bấm giờ, sửa; cho người ngoài nhóm xem và hỏi 3 câu ở Bước 5.

### 3.4. Mẹo riêng cho dự án này
- **Giao diện "phát lại dữ liệu thật" là bằng chứng mạnh nhất** khi không có cảnh thí nghiệm quay video: luôn để dòng "Phát lại dữ liệu thật – đợt 3" và đồng hồ giờ thí nghiệm trên màn hình.
- Mỗi cảnh 3D để chữ nhỏ "mô hình theo thiết kế" như chú thích Hình 4.2, tránh bị coi là dùng hình dựng thay sản phẩm thật.
- Quay cảnh tay ở 4K, nền trắng, để khi dựng phóng cận vẫn nét và cùng tông nền với đồ họa.
- Thu giọng sau khi đã có hình thô, đọc theo nhịp hình (cảnh 5.4 cần ngắt đúng lúc ô buồng đổi màu).

## BƯỚC 4 – PHỤ ĐỀ
File `PhuDe_ViSEF_UI.srt` (cùng thư mục) sinh cùng kịch bản: mỗi dòng ≤ 42 ký tự, tối đa 2 dòng mỗi khung, mốc theo thời lượng dự kiến. **Sau khi thu giọng thật cần căn lại mốc** (hoặc chạy chép lời có mốc từng từ như phim SV).

## BƯỚC 5 – TỰ RÀ SOÁT

| Tiêu chí | Đạt/Chưa | Cần sửa ở cảnh nào |
|---|---|---|
| Tổng thời lượng dưới mức tối đa ít nhất 10 giây | Đạt (4:46,6 < 4:50) – ước tính theo 148 âm tiết/phút | Bấm giờ khi thu giọng thật; dư thì rút 5.4 |
| Đoạn 5 + 6 ≥ 45 % | Đạt (≈ 45 %) | Sát ngưỡng: nếu phải cắt, cắt ở đoạn 2–4 trước |
| Mọi con số khớp sổ số liệu và báo cáo | Đạt | — |
| Mỗi thành viên dẫn ít nhất một khối | Chưa xác nhận | VO 1–4 chờ nhóm gán tên theo phần việc thật |
| Có câu chuyện cải tiến, đối chứng, một hạn chế nói thẳng | Đạt | 5.5–5.7; 4.3, 5.4; 7.1 |
| Không còn cụm từ cấm ở Khối D | Đạt | — |
| Đánh dấu cảnh cần giấy đồng ý, bảo hộ | Đạt | Không có người ngoài; bảo hộ ở 4.3 |
| Không logo, QR, thông tin liên hệ; đúng ẩn danh | Chưa xác nhận | 1.1, 7.3 nếu thể lệ cấm logo dự án |
| Người ngoài nhóm trả lời được: vấn đề gì, làm thế nào, kết quả bao nhiêu | Cần thử | Cho 1 người xem bản dựng thô |
| Số cảnh có người đóng | **0 cảnh lộ mặt**; 2 cảnh chỉ tay (5.6, 5.8) | — |
