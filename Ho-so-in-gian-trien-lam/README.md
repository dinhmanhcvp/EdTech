# Hồ sơ in ấn — gian triển lãm Socratic Vision Board (3 × 3 m)

Bộ file in tỷ lệ 1:1 để gửi đơn vị in ấn quảng cáo, kèm bảng kê hạng mục. Toàn bộ file được sinh từ `config.json`, nên chỉ cần điền thông tin thật rồi chạy lại là xong.

## Gửi nhà in những gì

Gửi nguyên thư mục `out/`:

| Thư mục | Nội dung |
|---|---|
| `00_BANG-KE-IN-AN.pdf` | Bảng kê: mã, kích thước, tràn lề, vật liệu, gia công, số lượng, vị trí, trạng thái file, mã màu CMYK |
| `01-kho-lon/` | In khổ lớn: phủ 3 vách (mỗi vách 3 tấm), bảng tên cửa gian, standee, ốp quầy, decal sàn, 5 tấm câu chuyện |
| `02-an-pham-nho/` | Tờ A5 hai mặt, sticker, 4 thẻ đeo (có dấu cắt) |
| `03-mica-laser/` | 5 tấm mica cho tháp 5 lớp: nét đỏ 0,01 mm là đường cắt, nét đen là phần khắc |
| `xem-truoc/` | Ảnh PNG xem nhanh từng hạng mục |

Tệp `*_DUONG-CAT.pdf` là đường bế (nét hồng), không in.

## Trước khi gửi in

1. **Đo vách thật tại gian.** File đang làm theo tấm nhìn thấy 950 × 2 350 mm, 3 tấm mỗi vách. Nếu khác, sửa mục `vach` trong `config.json`.
2. **Điền mọi ô `[ ... ]`** trong `config.json`: số gian, tên trường, tên thành viên, mốc thời gian, số liệu thử nghiệm, liên hệ.
3. **Logo và ảnh:** chép vào `assets/` rồi ghi tên tệp vào `logoBTC`, `logoTruong`, `thanhVien[].anh`, `cauChuyen[].anh`.
   - Logo Sở GD&ĐT Phú Thọ: chỉ dùng file chính thức do Ban tổ chức cấp.
   - Ảnh in khổ lớn: cạnh ngắn tối thiểu 1 500 px.
4. **Link QR:** điền `qrDungThu` (trang dùng thử) và `qrLienHe` (form liên hệ). Mã QR được tạo thật từ link.
5. **Chạy lại** (cần Node 18+ và Playwright có Chromium):
   ```bash
   cd Ho-so-in-gian-trien-lam
   npm install
   npm run build
   ```
   Cuối lệnh sẽ in ra các ô còn thiếu. Trong bảng kê, cột "Trạng thái file" phải ghi **Sẵn sàng** ở mọi dòng thì mới gửi in.
6. **Nhờ nhà in in thử màu** (proof) trên đúng vật liệu. File đang ở hệ màu RGB; mã CMYK tham khảo có trong bảng kê.

## Ghi chú kỹ thuật

- PDF vector, font đã nhúng: Plus Jakarta Sans, Newsreader, JetBrains Mono (giấy phép OFL, có trong `fonts/`).
- Nếu nhà in dùng CorelDRAW hoặc Illustrator mà font bị đổi: nhờ họ chuyển chữ thành đường nét (outline) ngay khi mở file.
- Khổ lớn: có tràn lề, không có dấu cắt. Ấn phẩm nhỏ: có dấu cắt cách mép tràn 1,5 mm, kèm dòng thông tin.
- Chromium bỏ mất chữ quá lớn (khoảng trên 1 000 px) khi in PDF. Hình cỡ lớn như dấu "?" ở ốp quầy vì vậy được vẽ bằng đường vector.
