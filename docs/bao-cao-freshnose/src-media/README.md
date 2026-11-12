# Tư liệu hình ảnh FreshNose AI (src-media)

Tạo ngày 04/11/2026. Mọi số liệu và tên linh kiện lấy từ `../FRESHNOSE_AI_ho_so_viet_lai.md` (mục 3.1–3.7 và bảng giá vốn).

## logo/
- `freshnose-mark.svg` / `-1024.png`: biểu tượng. Chiếc lá (trái cây tươi), gân lá là đường tín hiệu của mũi điện tử: phẳng (tươi) rồi bẻ lên (lên men). Chấm hổ phách ở đỉnh là cảnh báo sớm, hai cung xanh dương là mùi lan ra và sóng LoRa.
- `freshnose-lockup-ngang.svg/.png`: biểu tượng + chữ ngang; `-tren-nen-toi`: bản dùng trên nền tối; `-mono-den`: bản đơn sắc; `freshnose-lockup-doc`: bản xếp dọc.
- `freshnose-mark-mono-den/-trang`: biểu tượng một màu. `freshnose-favicon.svg` + PNG 512/192/64/32: favicon (bản lược gọn, không có cung sóng).
- `freshnose-bang-nhan-dien.png`: bảng tổng hợp mọi biến thể để duyệt.
- Màu: xanh lá đậm `#0E6B47`, chữ đậm `#0B2A20`, xanh dương AI `#1D6FD8`, hổ phách `#F2A31B`. Chữ: Montserrat Bold/SemiBold (giấy phép OFL), đã chuyển thành path nên SVG không cần cài font.

## video/ (MP4 H.264, 1920×1080, 30 fps)
| File | Dài | Nội dung |
|---|---|---|
| `01-intro-freshnose.mp4` | 12 s | Bóng tối và hạt mùi → "Trái cây không biết nói. / Nhưng nó có mùi." → node 3D hút mùi → "sớm 18–36 giờ" → logo. Có SFX tự tổng hợp, không nhạc. |
| `02-bo-tach-node-cam-bien.mp4` | 18 s | Node cảm biến tách 9 lớp theo trục đứng, 12 nhãn, ghép lại cuối clip (lặp được). |
| `03-bo-tach-tram-trung-tam.mp4` | 18 s | Trạm trung tâm đặt nằm, tách 8 lớp, 9 nhãn, màn hình hiện dashboard. |
| `04-quet-kho-lanh-luong-mui-lora.mp4` | 24 s | Camera bay quét kho mát, nhãn 8 node, sọt dập ở A4 bốc hơi VOC vào node, gói LoRa về Trạm, cảnh báo mức 3 kèm 3 khuyến nghị. |

## anh-tinh/
Ảnh PNG 1920×1080 lấy từ các khung chính của 4 video.

## Mã nguồn để sửa hoặc render lại
- `socratic-video/src/freshnose/` (entry riêng `index.ts`, các composition: FN-Intro, FN-Node, FN-Hub, FN-Warehouse).
- `socratic-video/tools/freshnose/logo.mjs` (sinh bộ logo), `wordmark.py` (chuyển chữ thành path).
- Render lại: `cd socratic-video && npx remotion render src/freshnose/index.ts FN-Node out.mp4 --gl=angle --crf=18 --port=3124`.
