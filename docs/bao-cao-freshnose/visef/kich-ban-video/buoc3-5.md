
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
