# Số liệu thí điểm và danh mục bằng chứng gốc

Nguồn duy nhất: `socratic-monorepo/packages/types/src/pilot2026.json` (thầy xác nhận là số thật ngày 24/10/2026). Slide, poster, video và Mode 03 của ứng dụng đều đọc file này. Tài liệu này chỉ chép lại để tiện đối chiếu; nếu sửa số, sửa ở file JSON rồi dựng lại.

## 1. Thiết kế

| Mục | Giá trị |
|---|---|
| Thời gian | 4 tuần, 64 tiết, 1.420 phiên gia sư |
| Giáo viên | 7 |
| Học sinh | N = 86, lớp 11–12 |
| Nhóm thực nghiệm | n = 44 (32 học sinh THPT + 12 học sinh chuyên) |
| Nhóm đối chứng | n = 42 |
| Chủ đề | Vật lý 12: điện xoay chiều RLC, dao động cơ. Hóa học 11/12: cân bằng hóa học, oxi hóa – khử, chuẩn độ |
| Đo lường | Bài kiểm tra thang 10 trước và sau, theo cấu trúc đề thi tốt nghiệp THPT từ 2025 (GDPT 2018) |
| Cách chia nhóm, lớp, trường, thời điểm | **[ĐIỀN: chưa có trong dữ liệu]** |

## 2. Điểm số

| | Đối chứng | Thực nghiệm | Chênh |
|---|---|---|---|
| Trước (TB ± SD) | 6,48 ± 1,15 | 6,42 ± 1,18 | −0,06 (p = 0,81, tương đương) |
| Sau (TB ± SD) | 6,85 ± 1,12 | 7,74 ± 0,89 | +0,89 (p = 0,0002) |
| Tăng so với trước | +0,37 điểm (+5,7%) | +1,32 điểm (+20,6%) | |

Cohen's d = 0,88.

## 3. Tỷ lệ đúng theo phần đề (%)

| Phần | Đối chứng | Thực nghiệm | Chênh |
|---|---|---|---|
| I · Trắc nghiệm 4 lựa chọn | 81,4 | 84,2 | +2,8 |
| II · Đúng/Sai 4 mệnh đề | 52,6 | 78,4 | +25,8 |
| III · Trả lời ngắn nhiều bước | 44,0 | 66,5 | +22,5 |
| Ghi nhớ sau 2 tuần | 61,2 | 82,7 | +21,5 |

## 4. Chỉ số vận hành

| Chỉ số | Giá trị |
|---|---|
| Thời gian soạn mô phỏng mỗi tiết | 38,5 phút → 4,2 phút (−89,1%) |
| Kiên trì sau lần sai đầu | 28,4% → 74,6% (gấp 2,6 lần) |
| Bộ chặn xin đáp án | chặn 312/318 lượt (98,1%); 6 lượt lách ở tuần 1, đã vá |
| Phiên gia sư không tốn token | 81,4% (SymPy 54,2% < 12 ms; kho gợi mở 27,2% < 25 ms; LLM 18,6%) |
| Nhận dạng nét | ≈ 16 ms mỗi nét, 0 lần gọi AI khi viết |
| Gọi AI mỗi tiết | 4,3 lần; ảnh khoanh ≈ 8 KB; chi phí ≈ 0,014 USD (≈ 350 đồng), thấp hơn 94,6% so với phương án sinh ảnh/video theo lượt |

## 5. Phản hồi đã dùng trong hồ sơ (ẩn danh)

- Giáo viên Vật lý, 14 năm dạy THPT và bồi dưỡng HSG: "Giản đồ Fresnel cho mạch RLC giúp tôi bớt gần 40 phút soạn bài mỗi tiết…"
- Học sinh lớp 12, khối A00: "…quên trừ lực ma sát là mô hình hiện ngay vật trượt quá dốc và báo lệch thứ nguyên."
- Học sinh đội tuyển Hóa, lớp 12 chuyên Hóa: "Đĩa cân bảo toàn electron cho Fe₃O₄ + HNO₃ … rất trực quan."

## 6. Danh mục bằng chứng gốc nên đưa vào thư mục Drive "Minh chứng"

Thầy tự chuẩn bị. Đánh dấu khi đã có.

| # | Bằng chứng | Phục vụ | Có chưa |
|---|---|---|---|
| 1 | Bảng điểm trước/sau của 86 học sinh (đã ẩn tên, dùng mã số) và bảng tính p, d | Tác động 25% | ☐ |
| 2 | Đề kiểm tra trước và sau, đáp án, ma trận theo ba phần | Tác động | ☐ |
| 3 | Kế hoạch dạy học 64 tiết hoặc ảnh chụp lịch thí điểm | Thực tiễn 25% | ☐ |
| 4 | Giấy xác nhận triển khai của nhà trường (mẫu: `Mau_xac_nhan_trien_khai_cua_truong.docx`) | Thực tiễn | ☐ |
| 5 | Ảnh chụp màn hình bảng thống kê trong ứng dụng (Mode 03: chặn 312/318, 1.420 phiên, 81,4% không token) | Tác động | ☐ |
| 6 | Phản hồi gốc của giáo viên và học sinh (phiếu khảo sát, tin nhắn, ảnh chụp) và sự đồng ý trích dẫn | Tác động | ☐ |
| 7 | Ảnh lớp học đang dùng bảng (che mặt học sinh hoặc có đồng ý) | Thực tiễn | ☐ |
| 8 | Video (cùng bản nộp) | Trình bày 15% | ☐ |
| 9 | Hướng dẫn cài đặt/sử dụng ngắn cho giáo viên khác | Nhân rộng 15% | ☐ |

Không đưa dữ liệu mô phỏng hay số liệu chưa có thật vào thư mục này.

## 7. Giới hạn cần nói thẳng khi được hỏi

- Một đợt thí điểm 4 tuần, hai chủ đề (Vật lý 12, Hóa học 11/12), chưa có đánh giá độc lập.
- Nhóm thực nghiệm có 12 học sinh chuyên, nhóm đối chứng không nêu cơ cấu: cần nói rõ cách chia nhóm để tránh bị hỏi về thiên lệch.
- Điểm được kiểm tra bằng đề do nhóm thí điểm xây dựng theo cấu trúc đề thi tốt nghiệp, chưa phải đề chuẩn hóa độc lập.
