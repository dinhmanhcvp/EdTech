# Hướng dẫn trả lời BGK – FreshNose AI

Đi kèm `BO_CAU_HOI_PHAN_BIEN_BGK.md` (cùng số thứ tự câu). Mỗi câu có: **Trả lời mẫu** (nói 30–45 giây), **Mang theo** (bằng chứng chỉ tay), **Nếu bị xoáy**, **Đừng nói**.

Quy tắc dùng:
- Chỗ có `[điền: …]` là sự thật chỉ nhóm biết (chủng nấm, tiêu chí gán nhãn, ai làm gì…). **Điền đúng sự thật, không điền cho đẹp.** Nếu chưa có thì nói "chúng em chưa có", đừng bịa.
- Số liệu ở mục A là **tái lập bằng mã mới trên CSV** (10/11/2026), mô hình RF 100 cây, độ sâu 8, seed 123, **4 đặc trưng: Rs/R0 hai cảm biến, nhiệt độ, độ ẩm (không có giờ)**. Đây là tái lập của tôi, không chắc trùng đúng mô hình nhóm đã dùng cho Bảng 4.4; nếu mã gốc khác thì dùng số của mã gốc.
- Khung chung: **thừa nhận → số liệu → việc sẽ làm**. Đừng tranh cãi với BGK về điểm họ đúng.

---

## A. Số liệu tái lập để dùng khi trả lời

**A1. Δt (6 chuỗi có vết thối, tính từ nhãn lớp 2 đến vết thối ≥ 1 mm)**
- Gây xước: 24,5; 31,5; 35,5 giờ (đợt 1, 2, 3), trung bình 30,5. Nhiễm nấm: 18,5; 21,0; 27,0, trung bình 22,2.
- Chung: 26,33 ± 6,39 giờ. Khoảng tin cậy 95 % (phân phối t, 5 bậc tự do): **19,6–33,0 giờ**. So với 12 giờ: t = 5,49, p = 0,0027; Wilcoxon một phía chính xác p = 0,0156 (đây là giá trị nhỏ nhất có thể khi n = 6).
- Cả 3 đợt, nhóm gây xước đều muộn hơn nhóm nấm; với n = 3 mỗi nhóm, kiểm định Mann–Whitney chính xác nhỏ nhất chỉ đạt p = 0,10 (hai phía), nên **không thể khẳng định** khác biệt giữa hai nhóm.
- Từ dự đoán thật của mô hình (đợt 3): mức đỏ bền (≥ 6 mẫu liên tiếp) bắt đầu giờ 129,5 (xước, vết thối 165,5 → Δt 36,0) và 119,5 (nấm, vết thối 147,0 → Δt 27,5). **Giờ 28,5 và 14,0 trong báo cáo là lần đầu mô hình dự đoán lớp 2 ở mẫu đơn lẻ, rất sớm so với mốc 120/130 giờ: đó là báo động giả, không phải Δt.**

**A2. Ma trận đợt 3 (1.500 mẫu)**
- Độ chính xác 87,47 %; độ chính xác cân bằng (balanced accuracy) **78,76 %**; F1 từng lớp 90,7 % / **54,5 %** / 94,0 %; F1 trung bình 79,7 %.
- Khoảng tin cậy 95 % cho độ chính xác bằng bootstrap **theo chuỗi** (chỉ 3 chuỗi, ước lượng thô): **81,4–93,0 %**; bootstrap theo khối 1 ngày: 82,0–93,0 %. Cận dưới thấp hơn ngưỡng TC1 (85 %); khoảng 85,7–89,0 % trong báo cáo coi các mẫu độc lập nên quá hẹp.
- Cảnh báo giả 62/1.000: buồng đối chứng 28/500, gây xước 14/260, nấm 20/240 (các mẫu bị gọi lớp 2 trong khi nhãn chưa phải lớp 2). Ở buồng đối chứng: 28 mẫu đơn lẻ trong 10,4 ngày ≈ **2,7 mẫu/ngày**, không có đoạn nào ≥ 6 mẫu liên tiếp.

**A3. Tái lập mô hình (4 đặc trưng, không giờ)**
- Huấn luyện đợt 1+2, kiểm tra đợt 3: độ chính xác **90,87 %** (20 seed khác nhau: 90,6–91,0 %); độ chính xác cân bằng 84,05 %; nhạy lớp 2 98,4 %, cảnh báo giả lớp 2 **0,2 %**; nhạy lớp chín sinh lý trung bình ~58 %.
- Luân phiên theo đợt (mỗi đợt làm tập kiểm tra, huấn luyện hai đợt còn lại): **95,1 % (đợt 1), 95,7 % (đợt 2), 90,9 % (đợt 3)**. Đợt 3 là đợt khó nhất.
- Luân phiên theo buồng (bỏ cả một buồng/điều kiện khi huấn luyện): buồng 1 lành lặn 87,5 %; buồng 2 gây xước 96,8 %; buồng 3 nấm 93,4 %.
- Độ quan trọng đặc trưng: TGS2602 0,494; TGS822 0,466; nhiệt độ 0,017; độ ẩm 0,023.
- Nếu thêm đặc trưng giờ: 97,5 / 98,1 / 92,3 % (cao hơn nhưng **không nên dùng**, vì làm mất ý nghĩa cảnh báo sớm).
- **Điều cần lưu ý:** mô hình tái lập mặc định cho kết quả **tốt hơn** Bảng 4.4 (90,9 % so với 87,5 %; cảnh báo giả lớp 2 0,2 % so với 6,2 %). Báo cáo nói ma trận 4.4 ứng với ngưỡng đỏ "hạ thấp"; nhạy lớp 2 tăng từ 98,4 % lên 99,6 % nhưng cảnh báo giả tăng từ 0,2 % lên 6,2 %. Nhóm cần quyết định công bố cấu hình nào và nói rõ lý do, nếu không BGK sẽ hỏi vì sao chọn cấu hình kém hơn.

**A4. Mô hình đơn giản làm mốc so sánh (huấn luyện đợt 1+2, kiểm tra đợt 3)**
- Ngưỡng một cảm biến: TGS2602 < 0,56 → lớp 2: nhạy 90,8 %, cảnh báo giả 0,4 %. Thêm điều kiện TGS822 < 0,6: nhạy 90,2 %, cảnh báo giả 0 %.
- Hồi quy logistic: độ chính xác 90,87 %, cân bằng 82,0 %, nhạy lớp 2 98,6 %, cảnh báo giả 0,1 %.
- Kết luận trung thực: **hồi quy logistic đạt gần bằng Random Forest**; chưa chứng minh được Random Forest là cần thiết.

**A5. Tự tương quan và độ lệch giữa buồng**
- Tự tương quan bước 1 của TGS2602: 0,85–0,88 (đối chứng), 0,975–0,98 (gây xước, nấm). Cỡ mẫu hiệu dụng gần đúng n(1−ρ)/(1+ρ): khoảng 35 (đối chứng) và khoảng 6 (xước, nấm) trên mỗi chuỗi 500 mẫu (ước thô).
- Nhiệt độ/độ ẩm trung bình theo buồng gần như không đổi giữa 3 đợt: buồng 1 12,14–12,16 °C, 89,0 %; buồng 2 12,43–12,46 °C, 88,3 %; buồng 3 11,94–11,96 °C, 89,9 %.
- Rs/R0 TGS2602 của lớp 0 theo điều kiện: lành lặn 0,868; xước 0,918; nấm 0,927 (Kruskal p ≈ 3·10⁻⁴⁵). Nền khác nhau theo buồng, nhưng lẫn với thời gian (chuỗi lành lặn có lớp 0 kéo dài hơn).

**A6. Kinh tế (kho 50 tấn × 25.000 đ/kg = 1,25 tỷ đồng/mẻ)**
| Giảm hao hụt thêm | Tiết kiệm/mẻ | Gói 22 triệu hoàn vốn sau |
|---|---|---|
| 0,3 % | 3,75 triệu | ≈ 5,9 mẻ |
| 0,5 % | 6,25 triệu | ≈ 3,5 mẻ |
| 1,0 % | 12,5 triệu | ≈ 1,8 mẻ |
| 1,5 % | 18,75 triệu | ≈ 1,2 mẻ |
| 2,0 % | 25 triệu | ≈ 0,9 mẻ |

**A7. Khảo sát (Wilson 95 %)**: 13/18 (72,2 %): 49,1–87,5 %; 15/18 (83,3 %): 60,8–94,2 %. Khoảng "49,1–94,2 %" trong báo cáo là phạm vi gộp ba tỉ lệ.

---

## Vòng 0. Mở màn trước poster

**0.1** *Tóm tắt một câu, kết quả quan trọng nhất?*
- **Trả lời mẫu:** "Chúng em chế tạo mũi điện tử giá thấp gồm cảm biến khí, nhiệt ẩm và học máy để báo xoài, chuối lên men sớm hơn mắt thường. Trong phòng thí nghiệm, mức đỏ xuất hiện sớm hơn lúc thấy vết thối trung bình 26,3 giờ, khoảng tin cậy 95 % từ 19,6 đến 33 giờ, trên 6 chuỗi. Mô hình nhận đúng 498 trong 500 mẫu lên men của đợt kiểm tra. Kết quả chưa kiểm chứng ngoài kho thực tế."
- **Mang theo:** Bảng 4.4 và biểu đồ ⑧.
- **Nếu bị xoáy** (kiểm chứng chưa?): "Chưa. Pilot ở 2 kho dự kiến 10/2026–2/2027, [điền: tình trạng hiện tại]."
- **Đừng nói:** "đã chứng minh hiệu quả", "chính xác 87,5 %" mà không nói cỡ mẫu.

**0.2** *Nguyên mẫu thật đâu?*
- **Trả lời mẫu:** "Đây là nguyên mẫu Node và Hub chúng em chế tạo [điền: đưa ra cho BGK xem]. Hình trên poster là mô hình 3D theo thiết kế, đã ghi chú trên poster; ảnh chụp thật chúng em có ở [điền: ảnh/video]."
- **Mang theo:** Node, Hub thật (hoặc ảnh/video đang đo trong buồng); nguồn cấp.
- **Xoáy:** hình 3D khác thật ở chỗ nào → liệt kê khác biệt thật (nếu có) trước khi BGK hỏi.
- **Đừng nói:** để BGK tự phát hiện hình 3D không phải ảnh thật. Nếu không có nguyên mẫu mang theo, nói thẳng lý do.

**0.3** *"Tối ưu thời gian lưu kho" và "xuất khẩu" chứng minh ở đâu?*
- **Trả lời mẫu:** "Chúng em đã đo phần cảnh báo sớm. Phần tối ưu thời gian lưu kho là ứng dụng của cảnh báo: tách sọt hỏng, xuất trước lô chín nhanh theo FEFO. Chúng em chưa đo số ngày lưu kho kéo dài thêm và sẽ đo ở pilot. 'Xuất khẩu' là đối tượng nông sản hướng tới; thí nghiệm chưa gắn với một lô xuất khẩu cụ thể."
- **Mang theo:** mục 4.3 và hướng pilot.
- **Nếu bị xoáy:** "Nếu hội đồng cho rằng tên quá rộng so với bằng chứng, chúng em đồng ý rút gọn tên về phần đã chứng minh (cảnh báo sớm)."
- **Đừng nói:** khẳng định đã kéo dài thời gian lưu kho.

**0.4** *6,2 % cảnh báo giả thì mỗi ngày báo sai mấy lần?*
- **Trả lời mẫu:** "62 trên 1.000 mẫu. Ở buồng đối chứng có 28 mẫu bị gọi là lên men trong 10,4 ngày, khoảng 2,7 mẫu mỗi ngày, nhưng đều là mẫu đơn lẻ, không có đoạn nào kéo dài 6 mẫu liên tiếp. Nếu dùng quy tắc chỉ báo đỏ khi 6 mẫu liên tiếp (3 giờ), buồng đối chứng không báo sai lần nào, và báo đỏ ở hai chuỗi bệnh của đợt 3 bắt đầu ở giờ 129,5 và 119,5."
- **Mang theo:** file dự đoán 1.500 mẫu, đồ thị dự đoán theo thời gian.
- **Xoáy:** quy tắc 6 mẫu chọn trước hay sau khi xem? → trả lời thật (xem 3.2).
- **Đừng nói:** "cảnh báo giả chỉ 6,2 % nên không đáng lo".

**0.5** *Vì sao "Đạt" cả 5 tiêu chí?*
- **Trả lời mẫu:** "Về số học cả 5 đạt, nhưng chúng em ghi rõ điều kiện kèm theo ở Bảng 4.5: TC1 đạt về độ chính xác chung nhưng lớp chín sinh lý chỉ 45 %; TC3 chủ yếu tính từ nhãn; TC4 đạt nếu ngắt pin ở 20 %, hơn ngưỡng 1 ngày; TC5 đạt đúng ngưỡng vì chúng em chọn giá bán 22 triệu. Ngưỡng do nhóm đề xuất [điền: đặt vào tháng nào, có ghi trong nhật ký nghiên cứu không]."
- **Mang theo:** Bảng 2.1, Bảng 4.5, nhật ký có ngày đặt ngưỡng.
- **Đừng nói:** "đạt hết nên dự án thành công".

---

## Vòng 1. Vấn đề, tính mới, căn cứ

**1.1** *Tính mới là gì khi đã có mũi điện tử cho thán thư [9], [10]?*
- **Trả lời mẫu:** "Các công trình [9], [10] phát hiện bệnh bằng mũi điện tử trong phòng thí nghiệm. Đóng góp của chúng em là: dùng mảng hai cảm biến giá thấp cùng nhiệt ẩm cho kho mát 10–14 °C, độ ẩm cao; có bộ 4.500 mẫu với đối chứng; đánh giá theo đợt tách khỏi huấn luyện; và nêu rõ hạn chế. Đo ngắt quãng, màng PTFE, bù nhiệt ẩm là kỹ thuật chúng em áp dụng chứ không tự phát minh."
- **Mang theo:** [9], [10] đã đọc (tóm tắt 3 dòng mỗi bài: loại cảm biến, mẫu, kết quả).
- **Xoáy:** "Khác biệt cụ thể so với [9]?" → nêu cảm biến, môi trường, quy mô khác.
- **Đừng nói:** "chưa ai làm", "hoàn toàn mới".

**1.2** *Em tìm tài liệu ở đâu để nói "chưa thấy"?*
- **Trả lời mẫu:** "Chúng em tìm trên [điền: Google Scholar/Scopus/ScienceDirect…], từ khóa [điền: electronic nose, MOX, mango/banana, cold storage, humidity…], ngày [điền]. 'Chưa thấy' nghĩa là chưa thấy trong các tài liệu đã duyệt, không khẳng định chưa có. Phần khoanh vùng theo dãy kệ là hướng phát triển chứ chưa kiểm chứng, nên tính mới chính của chúng em nằm ở phần đã đo."
- **Mang theo:** danh sách từ khóa, ngày tìm.
- **Đừng nói:** "không có công trình nào".

**1.3** *Vì sao TGS2602 và TGS822, không phải cảm biến ethylene?*
- **Trả lời mẫu:** "Mục tiêu là phát hiện lên men, tức ethanol và acetaldehyde, không phải ethylene của quá trình chín. TGS822 theo datasheet nhạy cồn và dung môi hữu cơ, TGS2602 nhạy các chất gây ô nhiễm không khí (VOC). Cả hai đều không đặc hiệu cho một khí nên chúng em dùng mảng và học máy thay vì tách từng khí."
- **Mang theo:** datasheet [7], [8] (bản lưu có phiên bản).
- **Xoáy:** có nhạy ethylene không → "TGS2602/TGS822 không thiết kế cho ethylene; chúng em không dùng chúng để đo ethylene."

**1.4** *Vì sao tin tín hiệu giảm là do ethanol, khi chưa đo ethanol?*
- **Trả lời mẫu:** "Chúng em chưa đo ethanol độc lập; đó là suy luận từ datasheet và tài liệu [6], đã ghi trong báo cáo. Điều chúng em đo được là tín hiệu Rs/R0 giảm rõ khi quả có vết thối, ví dụ nhóm nấm TGS2602 từ 0,927 xuống 0,332. Để xác nhận nguồn khí, chúng em dự kiến đối chiếu bằng sắc ký khí hoặc thử với ethanol chuẩn."
- **Đừng nói:** "chắc chắn do ethanol".

**1.5** *Số FAO, xuất khẩu liên quan gì kết quả?*
- **Trả lời mẫu:** "Đó chỉ là bối cảnh về quy mô tổn thất. Nhu cầu địa phương dựa vào khảo sát sơ bộ 18 đơn vị, còn khả năng kỹ thuật dựa vào thí nghiệm."

**1.6** *Số chuối Phú Thọ: 2.800 ha hay 6.500 ha?*
- **Trả lời mẫu:** "Tiêu đề bài báo [4] nói 2.800 ha chuối sản xuất theo tiêu chuẩn an toàn, còn số 6.500 ha và 162.000 tấn là [điền: nằm ở đâu trong bài, năm nào]. Chúng em ghi rõ không có năm và lấy từ báo, chưa đối chiếu niên giám."
- **Làm trước ngày bảo vệ:** mở lại bài báo, xác nhận hai số; nếu không kiểm chứng được thì bỏ số hoặc ghi "chưa kiểm chứng". Số này không ảnh hưởng kết quả khoa học.

---

## Vòng 2. Thiết kế thí nghiệm và thống kê

**2.1** *Buồng 1, 2, 3 luôn là lành lặn, xước, nấm. Tách hiệu ứng buồng khỏi hiệu ứng bệnh thế nào?*
- **Trả lời mẫu:** "Đúng, mỗi điều kiện chỉ có một buồng cố định, nên hiệu ứng buồng chưa tách hoàn toàn khỏi hiệu ứng bệnh; chúng em coi đây là hạn chế lớn nhất của thiết kế. Có ba bằng chứng gián tiếp: (1) nhiệt độ, độ ẩm trung bình mỗi buồng gần như giống nhau giữa 3 đợt, và độ quan trọng của nhiệt độ, độ ẩm trong mô hình chỉ 1,7 % và 2,3 %, còn hai cảm biến khí chiếm 96 %; (2) khi bỏ hẳn một buồng khi huấn luyện, độ chính xác trên buồng đó vẫn 87,5 %, 96,8 % và 93,4 %; (3) lớp lên men chỉ xảy ra ở buồng bệnh và cùng xuất hiện ở hai buồng bệnh khác nhau. Nhưng đây chưa phải thí nghiệm hoán đổi. Chúng em sẽ làm đợt mới đổi vị trí điều kiện giữa các buồng, đổi Node."
- **Mang theo:** phân tích độ quan trọng, luân phiên buồng (A3, A5), bảng nhiệt ẩm.
- **Nếu bị xoáy** (buồng chưa bao giờ hoán đổi?) → "Chưa."
- **Đừng nói:** "ba lần lặp độc lập", "buồng không ảnh hưởng".

**2.2** *"Lặp 3 đợt" thực chất là gì? Cùng buồng, cùng Node, chồng nhau 5 ngày với 3 Node?*
- **Trả lời mẫu:** "Ba đợt là ba lần thí nghiệm liên tiếp với quả mới trên cùng bộ buồng, cùng 3 Node, nên về thiết bị chúng chưa độc lập. [điền: mô tả đúng cách một Node phục vụ buồng nào trong khoảng chồng 5 ngày; số Node thực tế; lô quả, giống, độ chín ban đầu, khối lượng từng buồng nếu đã ghi]. Chúng em chưa ghi đủ giống, độ chín ban đầu, khối lượng từng buồng, đã nêu trong báo cáo, và sẽ ghi từ đợt sau."
- **Đừng nói:** mơ hồ về Node. Nếu thực tế là mỗi buồng có Node riêng thì sửa báo cáo cho khớp thay vì để mâu thuẫn "3 Node, 9 chuỗi".

**2.3** *Đơn vị thí nghiệm là 4.500 mẫu hay 9 chuỗi?*
- **Trả lời mẫu:** "Đơn vị độc lập tối đa là chuỗi: 9 chuỗi, trong đó 6 có vết thối. Mẫu cách nhau 30 phút có tự tương quan rất cao, 0,85–0,98, nên 4.500 là số lần đo chứ không phải 4.500 quan sát độc lập; cỡ mẫu hiệu dụng mỗi chuỗi chỉ cỡ vài chục, thấp nhất khoảng 6 ở chuỗi bệnh. Vì vậy chúng em chỉ coi khoảng tin cậy 85,7–89,0 % là rất lạc quan. Tính theo chuỗi (bootstrap 3 chuỗi) khoảng tin cậy là 81,4–93,0 %."
- **Mang theo:** A2, A5.
- **Đừng nói:** "4.500 mẫu nên rất chắc chắn".

**2.4** *n = 6 thì 26,3 ± 6,4 giờ có ý nghĩa gì?*
- **Trả lời mẫu:** "Trung bình 26,3 giờ, độ lệch chuẩn 6,4, khoảng tin cậy 95 % từ 19,6 đến 33,0 giờ. So với ngưỡng 12 giờ, kiểm định t một mẫu cho p = 0,003 và kiểm định Wilcoxon một phía cho p = 0,016 (giá trị nhỏ nhất có thể với n = 6). Cả 6 chuỗi đều trên 12 giờ. Nhưng 6 sự kiện vẫn rất ít, và 4 trong 6 tính từ nhãn."
- **Xoáy** (xước muộn hơn nấm ở cả 3 đợt?): "Xước trung bình 30,5 giờ, nấm 22,2 giờ, nhưng mỗi nhóm n = 3 nên kiểm định chính xác không thể cho p dưới 0,10. Chúng em không kết luận có khác biệt thật."
- **Đừng nói:** "có ý nghĩa thống kê" cho sự khác biệt xước/nấm.

**2.5** *Nhãn 0/1/2 gán dựa vào đâu? Có phải mốc thời gian?*
- **Trả lời mẫu:** "[điền: tiêu chí gán nhãn thật sự: độ cứng bao nhiêu, ảnh có dấu hiệu gì, ai gán, ngày nào]. Các mốc chuyển lớp của từng chuỗi (giờ 72–136) khác nhau theo chuỗi nên không phải một thời điểm cố định. Chúng em thừa nhận nhãn gán dựa trên quan sát chứ không phải đo bằng phép đo khí, và buồng đối chứng chuyển lớp 1 ở giờ 182, 182, 190 gần như cố định, điều mà chúng em chưa giải thích sinh học đầy đủ."
- **Mang theo:** biên bản ca kiểm tra 12 giờ, bảng độ cứng, sổ nhật ký.
- **Nếu bị xoáy** (có vòng tròn lập luận không?): "Nhãn không dùng tín hiệu khí nên không vòng tròn về nguyên tắc. Nếu thực tế nhãn có dùng tín hiệu khí thì đó là vòng tròn, và chúng em sẽ nói rõ."
- **Làm trước:** phải biết chính xác nhãn từ đâu; đây là câu quyết định độ tin cậy cả bộ dữ liệu.

**2.6** *Cột Model_Red_Alert trùng nhãn lớp 2. Vậy 26,3 giờ có đo mô hình không?*
- **Trả lời mẫu:** "Không hoàn toàn. 26,3 giờ là từ lúc bắt đầu mức lên men theo nhãn đến lúc thấy vết thối. Con số đo từ dự đoán thật của mô hình chỉ có ở đợt 3: 36,0 giờ (gây xước) và 27,5 giờ (nhiễm nấm) với quy tắc 6 mẫu liên tiếp. Chúng em thừa nhận cột Model_Red_Alert trong dữ liệu thô trùng với nhãn và sẽ lưu dự đoán từng mẫu của mọi đợt để tính Δt thật."
- **Mang theo:** file dự đoán 1.500 mẫu; A1.
- **Đừng nói:** "26,3 giờ là hiệu năng của mô hình".

**2.7** *Mốc vết thối ≥ 1 mm do ai đánh giá, bằng ảnh nào?*
- **Trả lời mẫu:** "[điền: ai đánh giá, bao nhiêu người, có độc lập không]. Quy trình: kiểm tra mỗi 12 giờ, khi thấy vết thối thì xem lại ảnh time-lapse 12 giờ trước để lấy khung hình đầu tiên có vết ≥ 1 mm; ảnh chụp mỗi 30 phút. Chúng em chưa tính độ đồng thuận giữa hai người đánh giá."
- **Mang theo:** ảnh time-lapse cho cả 6 chuỗi, biên bản.
- **Đừng nói:** nói có hai người đánh giá nếu thực tế chỉ có một.

**2.8** *Chủng nấm và quy trình gây bệnh?*
- **Trả lời mẫu:** "[điền: nguồn chủng, có định danh loài không, nồng độ bào tử, cách cấy]. Nếu chưa định danh, nói: 'nấm gây thán thư lấy từ quả bệnh [điền], chưa định danh đến loài.' Cấy trong buồng riêng đóng kín, đeo găng, khẩu trang; tiêu hủy theo biên bản 22/6/2026."

**2.9** *Có quả hỏng tự nhiên không?*
- **Trả lời mẫu:** "Không, quả hỏng là do chúng em gây xước hoặc cấy nấm; đó là hạn chế đã ghi ở mục 4.5. Pilot ở kho thật sẽ thu dữ liệu từ lô hỏng tự nhiên."

**2.10** *Có kiểm định giả thuyết nào không?*
- **Trả lời mẫu:** "Với Δt: có (mục A1: t-test và Wilcoxon so với 12 giờ). Với khác biệt Rs/R0 giữa các nhóm, Bảng 4.3 chỉ mô tả trung bình ± SD; vì các mẫu tự tương quan mạnh nên kiểm định thông thường trên mẫu thô sẽ cho p quá nhỏ. Chúng em dùng so sánh ở cấp chuỗi."
- **Làm trước:** nếu chưa tính, tính trước ít nhất kiểm định ở cấp chuỗi cho Rs/R0 cuối chuỗi giữa các nhóm.

**2.11** *Có kiểm tra tính dừng, xu hướng không?*
- **Trả lời mẫu:** "Chuỗi có xu hướng giảm theo thời gian khi quả lên men, nên không dừng; trung bình ± SD ở Bảng 4.3 chỉ là mô tả gộp theo trạng thái, không phải ước lượng một tham số cố định."

**2.12** *Dữ liệu thô từ đâu? Có mất gói LoRa không?*
- **Trả lời mẫu:** "Dữ liệu thô là [điền: log trực tiếp từ Hub/Node, tệp gốc ở đâu]. Có 47 trên 1.128 lần truyền phải gửi lại và đều thành công trong nhật ký pin; [điền: có mất gói nào trong thí nghiệm quả không, xử lý ra sao]."
- **Mang theo:** log gốc có dấu thời gian, ảnh/video đang đo.
- **Lưu ý trung thực:** nếu bất kỳ phần nào của bộ số liệu được **nội suy, làm sạch, sinh thêm hoặc chỉnh sửa**, phải nói thẳng. BGK có thể phát hiện, và nói dối sẽ mất toàn bộ độ tin cậy. Nhớ rằng trước đây từng có bản báo cáo chèn số không có trong dữ liệu; chỉ dùng số trong CSV.

---

## Vòng 3. Mô hình và kết quả

**3.1** *Vì sao 87,47 % đáng tin khi tập kiểm tra 3 chuỗi, cùng buồng với huấn luyện?*
- **Trả lời mẫu:** "Chưa hoàn toàn đáng tin, và chúng em đã ghi 87,47 % là ước lượng thô. Khi chúng em luân phiên cho từng đợt làm tập kiểm tra, độ chính xác là 95,1 %, 95,7 % và 90,9 %; đợt 3 là đợt khó nhất. Tính theo chuỗi, khoảng tin cậy rộng, khoảng 81–93 %. Chúng em chưa có đợt kiểm tra độc lập về thiết bị."
- **Mang theo:** A2, A3.
- **Xoáy:** vì sao báo cáo dùng 87,5 % mà tái lập ra 90,9 % → xem 3.2.
- **Đừng nói:** chọn ra đợt đẹp nhất.

**3.2** *Ngưỡng cảnh báo đỏ "hạ thấp" chọn trên tập nào? Mã huấn luyện?*
- **Trả lời mẫu:** "[điền: ngưỡng cụ thể, được chọn trên tập nào, lúc nào]. Nếu ngưỡng chọn sau khi xem đợt 3, thì Bảng 4.4 là kết quả đã tinh chỉnh trên tập kiểm tra và chúng em xin nói rõ. Khi chạy lại với ngưỡng mặc định, độ chính xác đợt 3 là khoảng 90,9 % và cảnh báo giả lớp 2 chỉ 0,2 %; ngưỡng hạ thấp giúp nhạy lớp 2 từ 98,4 % lên 99,6 % nhưng làm cảnh báo giả tăng đáng kể. Chúng em cần chọn ngưỡng trên một tập xác nhận riêng."
- **Quyết định nhóm cần chốt trước ngày bảo vệ:** công bố cấu hình mặc định (tốt hơn) hay cấu hình ngưỡng hạ thấp (số đang in), và giải thích. Đừng để BGK là người phát hiện.
- **Mang theo:** mã huấn luyện, biên bản chọn ngưỡng.

**3.3** *Độ chính xác có công bằng khi một lớp chỉ đúng 45 %?*
- **Trả lời mẫu:** "Không hoàn toàn. Độ chính xác cân bằng là 78,8 %, F1 từng lớp 90,7 %, 54,5 %, 94,0 %. Lớp lên men đạt 99,6 % nhạy (498/500), còn lớp chín sinh lý chỉ 45,0 % (99/220). Vì vậy chúng em chỉ coi mức vàng là tín hiệu theo dõi, và báo cáo kết quả chính là lớp lên men."

**3.4** *Lớp chín sinh lý có đáng tin khi 74,8 % mẫu từ buồng đối chứng?*
- **Trả lời mẫu:** "Chưa đáng tin. 392 trên 524 mẫu lớp này đến từ buồng đối chứng, nên mô hình có thể học đặc điểm buồng, và nhạy chỉ 45 %. Chúng em không dùng lớp này để ra quyết định, chỉ để theo dõi. Hướng cải thiện: thêm dữ liệu chín tự nhiên ở nhiều buồng, và kiểm tra bằng hoán vị nhãn."
- **Mang theo:** A3 (nhạy lớp 1 ~58 % khi tái lập, vẫn thấp).
- **Xoáy:** có phép thử hoán vị không → "Chưa làm", nếu đúng thế.

**3.5** *Đặc trưng đầu vào gồm gì? Có giờ không?*
- **Trả lời mẫu:** "[điền: danh sách đặc trưng đúng của mô hình công bố]. Khi tái lập, chúng em chỉ dùng Rs/R0 của hai cảm biến, nhiệt độ và độ ẩm; không dùng giờ lưu kho. Thêm giờ làm điểm số tăng nhưng làm mất ý nghĩa cảnh báo sớm nên chúng em không dùng."
- **Làm trước:** xác nhận mô hình trong Bảng 4.4 không có đặc trưng giờ hoặc chỉ số mẫu (Sample_Index, Hour, Day). Nếu có, phải chạy lại.

**3.6** *So với ngưỡng đơn giản thì sao? Học máy có cần không?*
- **Trả lời mẫu:** "Chúng em đã so sánh: ngưỡng TGS2602 < 0,56 cho nhạy lớp 2 90,8 % và cảnh báo giả 0,4 %; hồi quy logistic gần bằng Random Forest (độ chính xác 90,9 %, nhạy lớp 2 98,6 %). Nghĩa là với lớp lên men, một mô hình rất đơn giản đã đủ; chúng em chưa chứng minh Random Forest tốt hơn. Lợi ích của học máy nằm ở phân loại thêm lớp chín sinh lý và bù nhiệt ẩm, nhưng với lớp chín sinh lý chưa đạt."
- **Đừng nói:** "Random Forest là bắt buộc". Cân nhắc đổi cách viết: "học máy đơn giản (RF, logistic)" thay vì "RF".

**3.7** *Vì sao Random Forest, tham số, seed 123?*
- **Trả lời mẫu:** "[điền: lý do chọn RF, cách chọn tham số]. Chúng em chạy lại 20 seed khác nhau, độ chính xác dao động chỉ 90,6–91,0 %, nên kết quả không phụ thuộc seed 123."

**3.8** *Cảnh báo giả 6,2 % tính thế nào?*
- **Trả lời mẫu:** "Là 62 mẫu không thuộc lớp lên men bị dự đoán là lên men trên 1.000 mẫu đợt 3, tính theo mẫu chứ chưa tính theo sự kiện. Theo sự kiện (6 mẫu liên tiếp), buồng đối chứng không có báo động sai."

**3.9** *Có ROC, hiệu chuẩn xác suất không?*
- **Trả lời mẫu:** "Chúng em có xác suất từng lớp trong file dự đoán nhưng chưa vẽ ROC, precision–recall hay đường hiệu chuẩn; đây là phần chúng em sẽ bổ sung."

**3.10** *Chạy thật trên Hub chưa?*
- **Trả lời mẫu:** "[điền: mô hình đã chạy trên Raspberry Pi với dữ liệu truyền thật qua LoRa chưa; thời gian suy luận]. Dữ liệu đánh giá trong báo cáo là từ file CSV, không phải chạy thời gian thực."

**3.11** *Trôi cảm biến sau vài tháng?*
- **Trả lời mẫu:** "Chúng em chưa kiểm chứng trôi dài hạn. Dự kiến hiệu chuẩn lại R0 trong không khí sạch theo định kỳ; tuổi thọ cảm biến theo datasheet [điền]."

**3.12** *Kho mới, Node mới thì độ chính xác còn bao nhiêu?*
- **Trả lời mẫu:** "Chúng em không dám hứa số. Kết quả hiện tại là mức tối đa vì tập kiểm tra chưa độc lập về thiết bị; khi đổi Node hoặc kho, cần hiệu chuẩn lại và chạy lại. Bài kiểm tra bỏ một buồng cho thấy mô hình giữ 87,5–96,8 %, nhưng vẫn cùng Node và cùng lô nên chưa phải kết quả cho thiết bị mới."

---

## Vòng 4. Phần cứng, pin, truyền thông

**4.1** *Hai biện pháp cùng lúc, làm sao biết từng cái giúp bao nhiêu?*
- **Trả lời mẫu:** "Hai biện pháp xử lý hai vấn đề khác nhau. Pin: v1 sấy liên tục dòng 325 mA nên cạn ở giờ 18–19; chuyển sang đo ngắt quãng (sấy 120 giây, ngủ sâu) cho 23,5 ngày. Đọng sương: ở độ ẩm khoảng 88 %, Rs TGS2602 tụt từ 46–48 kΩ xuống 4–6 kΩ trong v1; v2 có màng PTFE không bị. Chúng em không có thí nghiệm riêng từng biện pháp trong cùng điều kiện nên không định lượng đóng góp riêng của từng biện pháp lên mỗi vấn đề."
- **Mang theo:** nhật ký v1, v2 (CSV).

**4.2** *Nhật ký pin chỉ 1 Node, tháng 7–8, có đại diện không?*
- **Trả lời mẫu:** "Không đại diện hoàn toàn: một Node, đo 15/7–7/8/2026 ở 12,05 ± 0,51 °C, tiêu thụ 229,1 mAh/ngày, còn 20 % ở ngày 21,0 và 10,3 % ở ngày 23,5. Chúng em chưa đo thêm Node khác hay pin đã dùng nhiều chu kỳ."

**4.3** *TC4 chỉ hơn ngưỡng 1 ngày, lạnh/lão hóa thì sao?*
- **Trả lời mẫu:** "Biên mỏng. Pin LiFePO4 giảm dung lượng ở nhiệt độ thấp và khi lão hóa. Chúng em có thể kéo dài tuổi pin bằng giảm tần suất đo hoặc thêm dung lượng, nhưng chưa thử."

**4.4** *120 giây gia nhiệt có đủ ổn định chưa?*
- **Trả lời mẫu:** "[điền: đã có đồ thị ổn định hay chưa]. Nếu chưa: 120 giây được chọn để cân bằng pin và tín hiệu, mức ổn định chưa kiểm chứng riêng, nên tín hiệu có thể còn trôi trong vài chục giây cuối."

**4.5** *108 dòng khô có đủ chứng minh không đọng sương?*
- **Trả lời mẫu:** "Đó là bằng chứng ngắn hạn: 36 chu kỳ × 3 mạch, nhiệt độ lên 14,1 °C, độ ẩm 95,2 %, màng khô cả 108 dòng. Chưa đủ để kết luận dài hạn hay khi xả đá nhiều lần; chúng em sẽ theo dõi nhiều tuần."

**4.6** *LoRa qua vách panel đã thử chưa?*
- **Trả lời mẫu:** "[điền: có đo RSSI qua vách panel không, khoảng cách]. Nếu chưa: chưa; tỉ lệ gửi lại 4,2 % (47/1.128) đo trong điều kiện [điền], không phải qua vách panel kho thật."

**4.7** *Xả đá: số đo trước/sau khi bù nhiệt ẩm đâu?*
- **Trả lời mẫu:** "Chúng em chưa có số đo trước khi bù nhiệt ẩm, đã ghi trong báo cáo. Bằng chứng gián tiếp là sau khi bù, cảnh báo giả không tập trung ở mẫu nóng (8/120 so với 54/880); độ quan trọng của nhiệt độ, độ ẩm trong mô hình nhỏ (1,7 % và 2,3 %), nghĩa là mô hình chủ yếu dùng tín hiệu khí."
- **Lưu ý:** "bù nhiệt ẩm" ở đây là đưa nhiệt độ, độ ẩm làm đặc trưng, không phải hiệu chỉnh vật lý.

**4.8** *Độ bền thẻ SD, màng PTFE khi chạy nhiều tháng?*
- **Trả lời mẫu:** "Chưa kiểm chứng. Hướng giải quyết: dùng bộ nhớ công nghiệp hoặc ghi vào ổ ngoài, UPS, watchdog, và thay/vệ sinh màng định kỳ."

**Câu bổ sung theo lĩnh vực Kỹ thuật điện, điện tử và viễn thông (4.9–4.17)**

Các số trong phần này lấy từ báo cáo và nhật ký pin; những chi tiết mạch (điện trở tải, ADC, bộ tăng áp, SF, băng thông) tôi **không có trong báo cáo**, nên để `[điền]`. Phải điền từ sơ đồ mạch và mã firmware thật của nhóm.

**4.9** *Mạch đọc Rs, ADC, sai số?*
- **Trả lời mẫu:** "Cảm biến mắc nối tiếp với điện trở tải RL [điền: giá trị], đọc điện áp trên RL bằng ADC [điền: ADC trong ESP32-S3 hay ADC ngoài, độ phân giải bao nhiêu bit]. Rs = RL·(Vc − Vout)/Vout [điền: đúng với sơ đồ của nhóm]. Firmware lọc trung vị [điền: bao nhiêu mẫu] để giảm nhiễu rồi chia cho R0. Sai số ADC [điền: có hiệu chuẩn không, bằng cách nào]. Với tín hiệu chính giảm từ 0,93 xuống 0,3 thì thay đổi lớn hơn nhiều so với sai số đo, nhưng chênh nhỏ giữa lớp an toàn và chín sinh lý (ví dụ TGS822 0,910 so với 0,826) thì sát với nhiễu."
- **Mang theo:** sơ đồ nguyên lý, ảnh PCB, đồ thị nhiễu ADC khi cảm biến ổn định.
- **Đừng nói:** bỏ qua hiệu chuẩn ADC nếu chưa làm; nói "chưa hiệu chuẩn riêng, chúng em dùng chuẩn hóa theo R0 để triệt sai số hệ thống".

**4.10** *Nguồn sấy 5 V từ pin 3,1–3,4 V?*
- **Trả lời mẫu:** "Theo datasheet, TGS2602 và TGS822 cần điện áp sấy khoảng 5 V [điền: xác nhận lại trong datasheet bản đang dùng]. Nhóm tạo 5 V từ pin LiFePO4 bằng [điền: bộ tăng áp nào, hiệu suất bao nhiêu], và chỉ bật trong 150 giây mỗi chu kỳ (sấy 120 s rồi đọc 30 s), sau đó tắt hẳn nên ngủ sâu 18,6 µA. Điện áp pin trong nhật ký giảm từ 3,418 xuống 3,121 V qua 23,5 ngày. [điền: điện áp sấy thực đo khi pin 3,1 V có còn trong dung sai không]."
- **Xoáy:** nếu chưa đo điện áp sấy khi pin yếu → "Chưa; đây là điều cần kiểm tra vì nhiệt độ sấy ảnh hưởng độ nhạy."
- **Mang theo:** sơ đồ nguồn; đo điện áp sấy bằng đồng hồ khi pin đầy và gần cạn.

**4.11** *Ngân sách năng lượng, chu kỳ 30 phút?*
- **Trả lời mẫu:** "Đúng, gần như toàn bộ điện năng là sấy và đo cảm biến. Chu kỳ gồm sấy 120 s ở 117,6 mA (≈ 3,92 mAh), đo 30 s ở 101,6 mA (≈ 0,85 mAh), ngủ sâu 18,6 µA trong phần còn lại (≈ 0,01 mAh): tổng khoảng 4,77 mAh, 48 chu kỳ mỗi ngày cho 229,1 mAh/ngày. Cảm biến chiếm hơn 99 % năng lượng. Pin 6.000 mAh dùng đến 10,3 % còn lại tương ứng 23,5 ngày. Chu kỳ 30 phút được chọn vì cảnh báo cần sớm hơn mắt hàng chục giờ nên 30 phút là đủ thô; nếu đo mỗi 60 phút thì mức tiêu thụ khoảng 115 mAh/ngày và pin kéo dài ước tính trên 45 ngày. Chúng em chưa đánh giá ảnh hưởng của chu kỳ 60 phút lên Δt và độ chính xác."
- **Mang theo:** nhật ký v2 (36 chu kỳ, 3 mạch), tính ngược 229,1 mAh/ngày.
- **Xoáy:** có thể giảm thời gian sấy không → "Chưa thử; sấy 120 s được chọn theo khuyến cáo cho cảm biến ổn định, giảm sẽ giảm độ ổn định; cần thí nghiệm riêng."

**4.12** *Link budget và hợp quy băng tần?*
- **Trả lời mẫu:** "Node dùng LoRa AS923, tần số 923,2 MHz, công suất 14 dBm [điền: SF, băng thông, hệ số mã hóa, độ nhạy thu, ước tính link budget]. Khoảng cách và suy hao qua vách panel [điền: đã đo RSSI chưa]. Về quy định tần số: băng 920–923 MHz thường được nêu cho thiết bị vô tuyến cự ly ngắn ở Việt Nam, còn 923,2 MHz có thể nằm ngoài băng này; nhóm [điền: đã đối chiếu thông tư hiện hành chưa, và có chuyển kênh về trong băng được phép không]."
- **Làm trước (quan trọng):** tra thông tư hiện hành về thiết bị vô tuyến cự ly ngắn băng 920–923 MHz; **tôi không chắc về giá trị chính xác**, cần tự xác nhận. Nếu 923,2 MHz nằm ngoài băng thì đổi kênh trong firmware và sửa báo cáo, hoặc nêu rõ đây là thí nghiệm trong phòng kín. Đây là điểm BGK viễn thông dễ hỏi.
- **Đừng nói:** khẳng định hợp quy khi chưa kiểm.

**4.13** *Giao thức, gói tin, độ tin cậy?*
- **Trả lời mẫu:** "[điền: LoRa thô hay LoRaWAN; khuôn dạng gói: Node ID, thời gian, Rs/R0 hai cảm biến, nhiệt độ, độ ẩm, điện áp pin, CRC; có ACK và gửi lại tối đa bao nhiêu lần]. Trong nhật ký pin 1.128 chu kỳ có 47 lần (4,2 %) phải gửi lại và đều thành công [điền: nguyên nhân dự kiến: nhiễu, va chạm hay công suất]. [điền: dữ liệu có mã hóa không]."
- **Mang theo:** tài liệu mô tả gói tin, ảnh chụp log gói.
- **Đừng nói:** "an toàn thông tin ổn" nếu chưa mã hóa.

**4.14** *SHT31 ở độ ẩm cao, R0 từng cảm biến?*
- **Trả lời mẫu:** "SHT31 sai số ±0,2 °C và ±2 % RH theo nhà sản xuất [11], ở độ ẩm cao có thể lệch thêm và có thể đọng sương nếu không có màng bảo vệ; trong thí nghiệm [điền: SHT31 đặt thế nào, có màng PTFE không]. R0 là điện trở trong không khí sạch, [điền: đo ở đâu, sau bao lâu ổn định, mỗi cảm biến một R0]. Chúng em chuẩn hóa bằng Rs/R0 theo từng cảm biến; khi đổi Node cần đo lại R0 và nên kiểm tra lại mô hình."
- **Mang theo:** datasheet SHT31 [11], ghi chép đo R0.

**4.15** *An toàn điện, bền, IP66?*
- **Trả lời mẫu:** "Pin LiFePO4 có mạch bảo vệ BMS, sạc có người giám sát; mạch đặt trong vỏ IP66; cửa lấy khí có màng PTFE để chống nước nhưng cho khí đi qua [điền: có thử xịt nước hay ngâm không]. Chúng em [điền: đã/chưa] kiểm tra chống tĩnh điện, nối đất, và chưa có chứng nhận. Đây là nguyên mẫu nghiên cứu, chưa phải sản phẩm thương mại."

**4.16** *Vì sao LoRa, vì sao ESP32-S3, 18,6 µA?*
- **Trả lời mẫu:** "LoRa có tầm xa, công suất thấp, phù hợp kho lạnh có vách panel; Wi-Fi tốn điện, BLE tầm ngắn. [điền: lý do chọn ESP32-S3: có sẵn, giá, Wi-Fi/BLE dự phòng]. Dòng 18,6 µA [điền: đo ở đâu: cả mạch trong nhật ký v2 hay chỉ chip]. Vì năng lượng chủ yếu dành cho sấy cảm biến nên chọn vi điều khiển tiết kiệm hơn chỉ cải thiện rất nhỏ tuổi pin."
- **Đừng nói:** so sánh số liệu NB-IoT, Zigbee mà không có nguồn.

**4.17** *Hub, mất điện, mất mạng, kênh cảnh báo?*
- **Trả lời mẫu:** "Hub là Raspberry Pi 4 [điền: tiêu thụ điện bao nhiêu], có UPS. Hub chạy mô hình cục bộ nên không phụ thuộc Internet; cảnh báo hiển thị trên màn 7 inch tại kho [điền: có còi, tin nhắn hoặc ứng dụng điện thoại không]. [điền: khi mất điện, dữ liệu được lưu ở đâu, khởi động lại thế nào]."
- **Đừng nói:** "có Internet vạn vật" nếu chưa có kết nối ra ngoài.

---

## Vòng 5. Thực tiễn, khảo sát, kinh tế

**5.1** *Khảo sát 18 đơn vị có dùng để định giá không?*
- **Trả lời mẫu:** "Chỉ như chiều hướng. 13 trên 18 (72,2 %) chọn mức 15–25 triệu, khoảng tin cậy Wilson 95 % là 49,1–87,5 %, nên có thể chưa đến một nửa. Ba đơn vị chỉ chọn 10–15 triệu, thấp hơn 22 triệu. 'Sẵn sàng chi' chưa phải quyết định mua. Giá 22 triệu là giá nằm trong khoảng nhiều đơn vị chọn, không phải kết quả chứng minh nhu cầu."

**5.2** *Câu hỏi khảo sát, thiên lệch?*
- **Trả lời mẫu:** "[điền: câu hỏi chính xác, ai trả lời, hỏi trước hay sau khi giới thiệu sản phẩm]. Mẫu thuận tiện, có thể nghiêng về đơn vị quan tâm công nghệ; chúng em ghi rõ không đại diện tổng thể."
- **Mang theo:** phiếu khảo sát.

**5.3** *Giá vốn 13,4 triệu có báo giá không? Lãi gộp 39,1 % đủ không?*
- **Trả lời mẫu:** "Bảng 4.1 là ước tính theo bảng kê vật tư, chưa có báo giá nhà cung cấp. Chưa tính công lắp đặt, bảo hành, vận chuyển, hỗ trợ sau bán. Lãi gộp 39,1 % chưa phải lợi nhuận; chúng em chưa lập mô hình kinh doanh đầy đủ."
- **Mang theo:** [điền: đơn mua thật hoặc ảnh chụp giá linh kiện].

**5.4** *Phép tính hoàn vốn dựa vào đâu?*
- **Trả lời mẫu:** "Đó là giả định chưa đo: kho 50 tấn, 25.000 đồng/kg, hao hụt 8 % mỗi mẻ, giảm thêm 1,5–2,0 %. Nếu chỉ giảm 0,3 % thì tiết kiệm 3,75 triệu mỗi mẻ, hoàn vốn khoảng 6 mẻ; 0,5 % thì khoảng 3,5 mẻ; 1 % thì khoảng 1,8 mẻ (xem A6). Chúng em chưa có số đo hiệu quả can thiệp, pilot sẽ cho số thật. Số 8 Node dựa trên giả định [điền: số dãy kệ giả định], chưa có thí nghiệm mật độ lắp."
- **Đừng nói:** "chắc chắn hoàn vốn 1–2 mẻ".

**5.5** *Báo đỏ rồi làm gì, có bằng chứng giảm hư hỏng không?*
- **Trả lời mẫu:** "Quy trình tách sọt, tăng thông gió cục bộ, FEFO là đề xuất, chưa thí nghiệm hiệu quả can thiệp. Tăng thông gió trong kho mát có thể làm tăng tải lạnh hoặc làm khô quả, nên ngưỡng nhiệt và thông gió cần theo chuyên gia bảo quản, như báo cáo đã nêu. Pilot sẽ đo."

**5.6** *Chi phí cảnh báo giả và bỏ sót?*
- **Trả lời mẫu:** "Bỏ sót nguy hiểm hơn: một sọt thối có thể lây cả pallet. Lớp lên men nhận đúng 498/500, không có mẫu nào bị gọi là 'an toàn'. Cảnh báo giả chỉ dẫn tới kiểm tra thêm một sọt. Chúng em chưa quy ra tiền."

**5.7** *Nhân viên tin hoàn toàn vào máy thì sao?*
- **Trả lời mẫu:** "Hệ thống chỉ hỗ trợ cảnh báo, không thay thế kiểm tra; hướng dẫn sử dụng ghi rõ nhân viên vẫn kiểm tra sọt được báo, và mức vàng chỉ nên dùng để theo dõi."

**5.8** *Pilot đã lắp chưa, đã có số liệu chưa?*
- **Trả lời mẫu:** "[điền sự thật: đã lắp ở kho nào/chưa; có số liệu gì]. Nếu chưa lắp: sửa báo cáo và poster thành 'dự kiến'. Bìa ghi thời gian thực hiện 3–10/2026, pilot ngoài khoảng này nên ghi là giai đoạn tiếp theo."

**5.9** *Nếu pilot cho kết quả xấu có công bố không?*
- **Trả lời mẫu:** "Có. Kết quả xấu cho biết giới hạn và hướng cải thiện mô hình, chúng em sẽ cập nhật báo cáo."

---

## Vòng 6. Liêm chính, đạo đức, đóng góp cá nhân

**6.1** *Phần nào học sinh trực tiếp làm?*
- **Trả lời mẫu:** "[điền đúng từng người: ai làm mạch, firmware, thí nghiệm, thu số liệu, mô hình, báo cáo; ai giúp phần nào]. Mỗi bạn giải thích được cách tính Rs/R0, cách chia tập huấn luyện và kiểm tra, và đọc được ma trận nhầm lẫn."
- **Chuẩn bị:** mỗi tác giả tự giải thích được `phan_tich_so_lieu.py` và mã huấn luyện ở mức cơ bản; trả lời bằng lời của mình.
- **Đừng nói:** nhận phần mình không hiểu.

**6.2** *Dữ liệu đo thật hay mô phỏng? Cho xem bằng chứng.*
- **Trả lời mẫu:** "Dữ liệu đo thật từ nguyên mẫu [điền: nếu đúng], trong buồng mát 21 ngày từ 1/6/2026, với [điền: log gốc, ảnh, nhật ký]. Chúng em mang theo log từ Node, sổ nhật ký, ảnh time-lapse, hóa đơn mua quả. Trong dữ liệu có [điền: có hay không xử lý/nội suy/lọc gì]."
- **Mang theo:** log gốc có dấu thời gian; ảnh/video thí nghiệm; sổ nhật ký có chữ ký người hướng dẫn kiểm tra 28/5 và 22/6; hóa đơn quả, vật tư; ảnh time-lapse.
- **Đừng nói:** khẳng định mà không có bằng chứng đi kèm. Đây là câu BGK có thể quyết định đánh giá toàn bộ.

**6.3** *Đã nộp cuộc thi nào khác chưa?*
- **Trả lời mẫu:** "Theo thông tin của nhóm, chưa nộp cuộc thi nào khác [điền xác nhận]. Hồ sơ khởi nghiệp trong thư mục chưa nộp."

**6.4** *An toàn nấm thán thư?*
- **Trả lời mẫu:** "Cấy trong buồng riêng đóng kín, đeo găng tay, khẩu trang; quả nhiễm cho vào túi kín và tiêu hủy, khử trùng buồng và dụng cụ. Có kiểm tra an toàn trước thí nghiệm (28/5/2026) và sau (22/6/2026) ghi trong nhật ký [điền: ai chứng kiến]."

**6.5** *Khảo sát: ẩn danh, đồng ý?*
- **Trả lời mẫu:** "Đơn vị tham gia tự nguyện, được mã hóa; báo cáo chỉ công bố số tổng hợp. [điền: có ghi nhận đồng ý bằng văn bản/lời không]."

**6.6** *Đã đọc toàn văn [9], [10] chưa? Datasheet nào?*
- **Trả lời mẫu:** "[điền: đã đọc mục nào của [9], [10]]. Datasheet [7], [8], [11] không ghi năm vì tải từ trang nhà sản xuất; chúng em có bản lưu ngày [điền]."
- **Làm trước:** đọc ít nhất phương pháp và kết quả của [9], [10]; lưu PDF datasheet.

**6.7** *Bìa còn chỗ chấm, ẩn danh?*
- **Trả lời mẫu:** "Chúng em điền theo thể lệ [điền: có yêu cầu ẩn danh không] trước khi nộp."
- **Làm trước:** kiểm tra thể lệ cuộc thi cấp tỉnh/thành phố 2026–2027, điền địa điểm thực hiện, và xác nhận tên lĩnh vực trên bìa, poster (xem ghi chú ở cuối).

---

## Vòng 7. Câu chốt

**7.1** *Một con số để bảo vệ?*
- **Trả lời mẫu:** "498 trên 500 mẫu lên men được nhận đúng, không mẫu nào bị gọi là 'an toàn'. Điểm yếu mạnh nhất: chỉ có 3 chuỗi kiểm tra, cùng buồng và cùng Node với tập huấn luyện, nên con số này chưa chứng minh được với thiết bị hoặc kho khác."

**7.2** *Ba điểm yếu lớn nhất?*
- **Trả lời mẫu:** "Một, mỗi điều kiện chỉ có một buồng cố định và tập kiểm tra chỉ 3 chuỗi nên chưa tách được hiệu ứng buồng. Hai, lớp chín sinh lý chỉ nhạy 45 % và lẫn với buồng đối chứng, nên chỉ dùng để theo dõi. Ba, chưa kiểm chứng ngoài phòng thí nghiệm, chưa đo ethanol để xác nhận nguồn tín hiệu, và Δt chủ yếu tính từ nhãn. Chúng em sẽ làm đợt mới có hoán đổi buồng, lưu dự đoán từng mẫu, và pilot."

**7.3** *Vì sao đề tài thuộc lĩnh vực Kỹ thuật điện, điện tử và viễn thông, phần thiết kế do em làm là gì, học máy chiếm bao nhiêu?*
- **Trả lời mẫu:** "Phần cốt lõi là một hệ thống đo điện tử không dây: mạch đọc cảm biến khí bán dẫn và nhiệt ẩm, quản lý nguồn và năng lượng (đo ngắt quãng, ngủ sâu, 23,5 ngày trên pin 6.000 mAh), truyền dữ liệu LoRa về Hub, và hiển thị cảnh báo; theo mô tả lĩnh vực là mạch điện, điện tử, viễn thông và Internet vạn vật. Học máy là bước xử lý tín hiệu ở Hub để biến Rs/R0 thành trạng thái, không phải mục tiêu chính. Phần em tự thiết kế là [điền: mạch, firmware, giao thức, vỏ, thí nghiệm pin]. Khi đánh giá, chúng em còn dùng phương pháp thống kê: tách tập kiểm tra theo đợt, báo độ nhạy, độ đặc hiệu từng lớp, khoảng tin cậy ở cấp chuỗi."
- **Xoáy:** phần chiếm nhiều trang nhất trong báo cáo lại là phân tích dữ liệu và học máy; mạch và truyền thông chỉ có một đoạn ngắn. Thừa nhận, và chuẩn bị sơ đồ mạch, bảng thông số, ảnh PCB để trả lời ở Vòng 4. Nếu còn dung lượng, bổ sung vào báo cáo: sơ đồ nguyên lý, ngân sách năng lượng, thông số LoRa.
- **Đừng nói:** "học máy là phần quan trọng nhất" trước BGK điện, điện tử.

**7.4** *Có thêm điều kiện thì làm gì đầu tiên?*
- **Trả lời mẫu:** "Một, đợt mới có hoán đổi buồng, Node độc lập, ghi lô quả và độ chín ban đầu. Hai, lưu dự đoán từng mẫu và tính Δt thật cho mọi chuỗi. Ba, đo ethanol hoặc ethylene để đối chiếu. Bốn, pilot ở kho thật và đánh giá hiệu quả can thiệp."

**7.5** *Bỏ học máy, dùng ngưỡng đơn giản được không?*
- **Trả lời mẫu:** "Với lớp lên men thì gần được: ngưỡng TGS2602 < 0,56 cho nhạy 90,8 % và cảnh báo giả 0,4 %, hồi quy logistic gần bằng Random Forest. Chúng em chưa chứng minh Random Forest cần thiết. Ngưỡng đơn giản kém hơn ở độ nhạy (90,8 % so với 98–99 %), và học máy cho phép bù nhiệt ẩm và phân loại nhiều lớp, nhưng lớp chín sinh lý vẫn chưa đạt."

---

## Ghi chú cuối

**Lĩnh vực.** Theo Phụ lục 01 của kế hoạch (ảnh bạn gửi), lĩnh vực số 10 là **Kỹ thuật điện, điện tử và viễn thông** (mạch điện, điện tử, viễn thông, Internet vạn vật). Bìa `bao-cao_final-mau-2026.md`, các file `.docx`/`.pdf`, và dải tên dự án trên poster đang ghi "Lĩnh vực: Thống kê" (lĩnh vực số 6); cần sửa. Trong bảng chia nhóm ở trang 8 của ảnh, lĩnh vực số 10 **không xuất hiện** ở nhóm A1–A4 (nhóm A4 chứa Thống kê, Máy tính, Công nghệ thông tin; A2 chứa Cơ khí và Vật lý kỹ thuật). Cần kiểm tra bản kế hoạch đầy đủ để biết mã nhóm và màu bìa báo cáo của lĩnh vực này, vì bảng đó quy định màu bìa và việc đặt tên báo cáo; nếu bìa phải theo màu nhóm thì phải đổi.

**Quyết định cần chốt trước khi bảo vệ:**
1. Công bố cấu hình mô hình nào (mặc định 90,9 % hay ngưỡng hạ thấp 87,5 %) và lý do.
2. Sửa hồ sơ cho khớp thực tế: "huấn luyện riêng cho xoài và chuối" (dữ liệu không có cột loại quả), mỗi điều kiện một buồng cố định, tình trạng pilot, ghi chú giờ 28,5 và 14,0 trong mục 4.2.4 (đó là báo động giả đơn lẻ, không phải Δt).
3. Chuẩn bị bằng chứng thực địa (câu 0.2, 6.2).

**Giới hạn của bản hướng dẫn:** chỉ dựa trên báo cáo, poster và CSV. Những chỗ `[điền: …]` là thông tin chỉ nhóm biết; tôi không có thể lệ, ảnh time-lapse, nhật ký nghiên cứu, mã huấn luyện gốc hay log gốc từ Node để kiểm.
