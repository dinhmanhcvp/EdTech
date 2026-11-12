# Roadmap 3 tháng (26/10/2026 – 31/01/2027): nhóm IT-Hust

Đây là kế hoạch **dự kiến**, dùng cho mục 10 của thuyết minh và để trả lời câu hỏi "bước tiếp theo" ở chung kết. Mỗi việc bám một giới hạn đã nêu thật trong hồ sơ. Không ghi việc nào là đã làm xong.

**Phân công theo vai trò:** Đạt (kiến trúc, SymPy, bộ chặn, điều phối, thiết kế đo lường) · Giang (bộ máy mô phỏng, chủ đề mới) · Vũ (bảng viết, nhận dạng nét, giao diện) · Tuyên (kho gợi mở, dữ liệu, QR, bản đồ nhiệt, triển khai). Người hướng dẫn: thầy Phùng Văn Kiệm (kết nối trường, lớp thí điểm).

## Các mốc cố định của cuộc thi (theo Thể lệ Điều 7)
| Mốc | Thời gian |
|---|---|
| Chọn hồ sơ vào chung kết | dự kiến trước 05/11/2026 |
| Kết nối, tư vấn, hoàn thiện sản phẩm với chuyên gia | dự kiến 06/11 – 20/11/2026 |
| Chung kết (10 phút trình bày, video ≤ 3 phút, 10 phút hỏi đáp) | dự kiến tháng 11/2026 |

## Tháng 11/2026: củng cố nền tảng
| Tuần | Việc | Người | Đầu ra | Chỉ số |
|---|---|---|---|---|
| 26/10 – 01/11 | Lưu bằng chứng gốc đợt thí điểm 86 học sinh (bảng điểm đã mã hóa, đề, phản hồi); chuẩn bị bộ câu hỏi hỏi đáp | Đạt, người hướng dẫn | Thư mục minh chứng | Đủ 9 mục trong danh mục bằng chứng |
| 26/10 – 01/11 | Đối chiếu README, báo cáo kiểm thử với thực tế (bỏ dòng "Giải thưởng", không dẫn 100%) | Đạt | README, `TEST_REPORT.md` đã sửa | Số kiểm thử khớp lần chạy mới nhất |
| 02/11 – 08/11 | Nếu vào chung kết: bản cắt video 3 phút, luyện trình bày 10 phút, mỗi em nắm phần mình | Cả nhóm | Video 3 phút; kịch bản | Diễn tập đủ giờ, ≥ 2 lượt |
| 02/11 – 15/11 | Thay phương án dự phòng so khớp từ khóa của kho gợi mở bằng so khớp vector ChromaDB; đo lại tỷ lệ phiên không tốn token | Tuyên | Mã và báo cáo đo | Tỷ lệ phiên không tốn token đo lại (đợt 1: 81,4%) |
| 09/11 – 22/11 | Đóng gói Docker cho máy chủ và hai ứng dụng; hướng dẫn cài đặt một trang | Tuyên | `Dockerfile`, hướng dẫn | Cài trên một máy sạch thành công, ghi thời gian |
| 16/11 – 30/11 | Hoàn thiện theo góp ý chuyên gia (nếu được kết nối) | Cả nhóm | Danh sách việc đã sửa | Mỗi góp ý có kết quả: làm, hoãn (có lý do) |

## Tháng 12/2026: mở rộng nội dung, thử ở nơi mới
| Tuần | Việc | Người | Đầu ra | Chỉ số |
|---|---|---|---|---|
| 01/12 – 14/12 | Bổ sung chủ đề Toán 12 và Sinh 12 còn thiếu theo GDPT 2018; kiểm tra mô phỏng với giáo viên bộ môn | Giang | Chủ đề mới, biên bản kiểm tra | Số chủ đề thêm; số lỗi giáo viên phát hiện và đã sửa |
| 01/12 – 21/12 | Thu mẫu nét viết tay thật của giáo viên; đo tỷ lệ nhận nhầm ký tự; cải thiện cơ chế chạm để đổi; thử trên màn hình tương tác thật | Vũ, Đạt | Bộ mẫu ẩn danh; bảng đo | Tỷ lệ nhận nhầm trước và sau |
| 08/12 – 28/12 | Thử sản phẩm tại ít nhất một trường THPT khác (ưu tiên Hà Nội); hỗ trợ giáo viên chạy một số tiết | Cả nhóm, người hướng dẫn kết nối | Biên bản thử, ảnh | ≥ 1 trường mới; số tiết đã chạy |
| 08/12 – 28/12 | Bộ khảo sát giáo viên và học sinh có cấu trúc; đưa kết quả lên bản đồ nhiệt | Tuyên | Biểu mẫu, dữ liệu | Số phiếu thu được |

## Tháng 01/2027: đánh giá và chuẩn bị phát triển
| Tuần | Việc | Người | Đầu ra | Chỉ số |
|---|---|---|---|---|
| 04/01 – 17/01 | Thiết kế đợt thí điểm 2 có nhóm đối chứng, cùng thang đo với đợt 1; xin đồng ý của phụ huynh | Đạt, người hướng dẫn | Kế hoạch và mẫu đồng ý | Có nhóm đối chứng; có kiểm tra đầu vào tương đương |
| 11/01 – 31/01 | Chạy đợt 2 (nếu lịch trường cho phép) hoặc chạy phần có thể; ghi nhận bằng chứng | Người hướng dẫn, Đạt | Số liệu đợt 2 | Cỡ mẫu; chênh lệch điểm; so với đợt 1 |
| 11/01 – 24/01 | Nhờ giảng viên hoặc chuyên gia đánh giá độc lập chất lượng mô phỏng và câu hỏi gợi mở | Cả nhóm | Phiếu đánh giá | Có ≥ 1 đánh giá bằng văn bản từ người ngoài nhóm |
| 11/01 – 31/01 | Tài liệu và video hướng dẫn cho giáo viên | Giang, Vũ | Tài liệu, video | Một giáo viên chưa dùng làm theo được trong 30 phút |
| 18/01 – 31/01 | Rà soát quyền riêng tư dữ liệu học sinh; ước tính chi phí vận hành; chốt phương án cấp phép (chưa thu phí) | Tuyên, Đạt | Bản rà soát; bảng chi phí | Chi phí máy chủ và AI mỗi tháng ở các kịch bản |

## Rủi ro và cách xử lý
| Rủi ro | Xử lý |
|---|---|
| Lịch của trường thí điểm, kỳ thi cuối kỳ của sinh viên | Ưu tiên việc tháng 11 (không phụ thuộc trường); đợt 2 có thể lùi sang tháng 02 |
| Giá hoặc hạn mức Gemini thay đổi | 81,4% phiên gia sư không tốn token; theo dõi chi phí hằng tuần |
| Kho gợi mở vector chưa cải thiện như kỳ vọng | Giữ phương án so khớp từ khóa, báo cáo số đo thật |
| Chưa có trường nào ở Hà Nội đồng ý thử | Thử với trường mà người hướng dẫn kết nối; nêu đúng trong báo cáo |

## Điều cần tránh khi trình bày roadmap
- Không nói Docker, kho gợi mở vector, đợt thí điểm 2 hay đánh giá độc lập là **đã có**; hiện chưa có trong mã hoặc chưa thực hiện.
- Số mục tiêu (≥ 1 trường mới, ≥ 1 đánh giá độc lập) là mục tiêu tối thiểu có thể đạt, không phải kết quả đã đạt.
