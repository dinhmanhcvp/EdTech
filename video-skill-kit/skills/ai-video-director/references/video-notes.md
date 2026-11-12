# Ghi chú bóc tách skill_video.mov

- Nguồn: `skill_video.mov` (1024x576, 29.97fps, 55:31). Tiếng Trung, phụ đề cứng tiếng Việt, kênh TikTok @hancontam.
- Phương pháp bóc tách: tách khung hình mỗi 15-30 giây ở các đoạn quan trọng, đọc phụ đề + slide + prompt hiện trên màn hình. Phiên âm tự động (faster-whisper small) kém, không dùng làm nguồn chính.

## Mốc thời gian (xấp xỉ)

| Phút | Nội dung |
|---|---|
| 00:00-05:00 | Giới thiệu; "phân cảnh là gì", "vận kính là gì"; AI làm đúng nghĩa đen; ví dụ so sánh prompt thường và prompt đạo diễn |
| 05:00-12:00 | Cỡ cảnh (viễn/toàn/trung/cận), vị trí máy (độ cao máy), chuyển động máy; ví dụ cảnh nam chính khóc ở bồn rửa mặt, cảnh quán rượu |
| 12:00-19:00 | Viết prompt như họa sĩ; hành động đồng thời; âm thanh sinh cùng video; ví dụ shot nối shot với thời lượng |
| 19:30-23:45 | **Công thức 7 yếu tố**: tiền cảnh/vị trí tiền cảnh/hậu cảnh/chủ thể/vị trí máy/cỡ cảnh/hành động; vì sao model cần "mã hóa" khác con người |
| 24:00-33:00 | Prompt mẫu dài kèm [NEGATIVE]; skill giúp lên 5-6/10 điểm; vì sao viết thành văn thay vì liệt kê |
| 33:00-38:00 | Phần thực hành: agent riêng, canvas, tạo ảnh cảnh Gothic-cyberpunk |
| 38:00-46:00 | Nhân vật 4 ô, đạo cụ 3 góc, kịch bản, 5 shot cho cảnh cửa hàng tiện lợi, agent "Q" mở rộng |
| 46:30-50:00 | Sinh video Seedance 2.5 (21:9, 720p, 30s), STYLE LOCK + neo ảnh, kiểm tra kết quả |
| 50:00-54:30 | Dựng trong 剪映: 24fps, cắt, tách âm, ghép |
| 54:30-55:30 | Tổng kết 5 bước |

## Phần còn thiếu / không chắc

- Giọng nói gốc không đọc lại được hoàn chỉnh; một số lời giải thích miệng (không hiện trên màn hình) có thể chưa được ghi.
- Phần phút 12-19 và 24-33 xem ở mức mẫu (30s/khung), có thể sót ví dụ nhỏ.
- Muốn bổ sung: dùng lại video, trích khung ở phút cụ thể và cập nhật SKILL.md.
