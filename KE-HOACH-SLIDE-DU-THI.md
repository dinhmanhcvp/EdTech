# Kế hoạch slide dự thi (theo mẫu BTC "Mẫu Slide 2026.pptx")

## Mẫu BTC
- 9 slide, khổ 20" x 11.25", tối đa 15 slide (kể cả slide tiêu đề).
- Nền là ảnh toàn trang (image6/7/8, có sẵn dải chân trang), màu chủ đạo navy `000054`, đỏ `E61E2A`, vàng `FFEA00`, font Aptos.
- Cách làm: nhân bản slide mẫu bằng `add_slide.py`, xóa chữ hướng dẫn, thêm nội dung bằng python-pptx. Giữ nền/logo BTC, thêm chất riêng: thẻ nền ấm `F8F7F4`, viền mảnh `E6E4DD`, số thứ tự 01/02 kiểu mono, màu nhấn hổ phách `D97706` / xanh lục `059669` / xanh coban `2563EB`, công thức viết bằng Unicode (Fe₃O₄).
- Ảnh chụp app thật: `socratic-video/public/flow/tiles/*.jpg` (P/R/H/B = 4 môn, C/D/E = gia sư, chốt chặn, telemetry).

## Dàn 15 slide
1. Tiêu đề: Socratic Vision Board, Phùng Văn Kiệm, THPT Chuyên Vĩnh Phúc (thầy thay ảnh, email, địa chỉ)
2. Dàn ý (bố cục ảnh trái + danh sách phải)
3. Bối cảnh và vấn đề: 3 nỗi đau (giáo viên / học sinh tự học / hạ tầng nhà trường)
4. Ý tưởng: Magic Lasso trên lớp + ma sát nhận thức khi tự học, nối bằng SimulationBlueprint JSON
5. Kiến trúc "AI là trình biên dịch": 4 chặng
6. Công cụ AI và AI có trách nhiệm: Gemini Flash, SymPy, bộ chặn 4 kiểu tấn công
7. Bục giảng không bàn phím: Tap & Swap, thanh trượt lớn, gợi ý Socratic
8. 4 môn Toán, Lý, Hóa, Sinh (lưới 2x2 ảnh chụp)
9. Gia sư Socratic 3 tầng
10. Gỡ lỗi bằng hình ảnh + chốt chặn bản chất
11. Triển khai thực tế (CẦN THẦY ĐIỀN: lớp, sĩ số, thời gian)
12. Kết quả và tác động: số đo kỹ thuật + ô số liệu tại lớp (CẦN THẦY ĐIỀN)
13. Bảng so sánh với các giải pháp hiện có
14. Bền vững, nhân rộng, định hướng
15. Tài liệu đính kèm (link video, mã nguồn) + lời kết

## Số liệu đã kiểm chứng trong code (chỉ dùng những số này)
- Gemini Flash vision được gọi thật (`routers/visualize.py`); viết bảng thường không gọi API nào.
- SymPy kiểm thứ nguyên và tương đương đại số, khoảng 18 ms (báo cáo kiểm thử).
- Bộ chặn Socratic: 4 kiểu tấn công (chèn lệnh, xin đáp án, hỏi Đúng/Sai, ép gấp), 4/4 bị chặn trong kiểm thử.
- Pytest backend: 13/13 đạt. Vitest frontend: 10/29 đạt (19 lỗi do xung đột phiên bản React); KHÔNG ghi "100% pass".

## Số liệu trong spec KHÔNG có trong code (bỏ, hoặc ghi rõ "ước tính")
- 94% / 92% giảm chi phí, $1.50–4.00 mỗi tiết, ~$0.01 mỗi tiết, giảm 85% tải LLM.
- Ảnh WebP: thực tế xuất PNG. Ngưỡng lasso là 25% số điểm (không phải 70%).
- Three.js PBR: không có, 3D tự dựng bằng Canvas.
- ChromaDB: hiện có phương án dự phòng so khớp từ khóa. Docker: thiếu Dockerfile.
