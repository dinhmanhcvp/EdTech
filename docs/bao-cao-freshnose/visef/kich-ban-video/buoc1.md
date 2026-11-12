
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
