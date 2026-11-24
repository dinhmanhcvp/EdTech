# Hồ sơ in ấn — gian lều 3 × 3 m, STEM Carnival · AIROC 2026 International

Nhà thi đấu thể thao Phú Thọ · lắp 13h30–16h30 ngày 28/11/2026 · trưng bày 6h30–17h00 ngày 29/11/2026 · đơn vị trưng bày: UBND phường Phúc Yên.

Bộ file in tỷ lệ 1:1 để gửi đơn vị in ấn quảng cáo, kèm bảng kê hạng mục. Toàn bộ file được sinh từ `config.json`, nên chỉ cần điền thông tin thật rồi chạy lại là xong.

## Gửi nhà in những gì

Gửi nguyên thư mục `out/`:

| Thư mục | Nội dung |
|---|---|
| `00_BANG-KE-IN-AN.pdf` | Bảng kê: mã, kích thước, tràn lề, vật liệu, gia công, số lượng, vị trí, trạng thái file, mã màu CMYK |
| `01-khung-va-bat/` | Backdrop BD (bạt căng khung, biên 50), khung cổng K-DAU + K-CHAN (fomex CNC, có đường cắt), 2 cánh mặt trong + mặt ngoài, totem 3 mặt TT-A/B/C, quầy Q-TRUOC/Q-HONG, cờ buồm CO, huy hiệu HH, decal sàn D01 |
| `02-an-pham-nho/` | Tờ A5 song ngữ (mặt Việt, mặt Anh), sticker, 4 thẻ đeo (có dấu cắt) |
| `03-mica-laser/` | 5 tấm mica cho tháp 5 lớp: nét đỏ 0,01 mm là đường cắt, nét đen là phần khắc |
| `xem-truoc/` | Ảnh PNG xem nhanh từng hạng mục |

Bản vẽ khung (kích thước, vật liệu, đối trọng, trình tự lắp 3 giờ) nằm ở bảng 11 trên canvas thiết kế.

Tệp `*_DUONG-CAT.pdf` là đường bế (nét hồng), không in.

## Trước khi gửi in

1. **Hỏi BTC loại lều và đo:** chiều cao mép mái (đang giả định 2 500) và bề rộng trong cột (2 920). Khác thì sửa mục `leu` trong `config.json`: cổng, backdrop và cánh tự đổi kích thước.
2. **Điền mọi ô `[ ... ]`** trong `config.json`: số gian, tên trường, tên thành viên, mốc thời gian, số liệu thử nghiệm, liên hệ.
3. **Logo và ảnh:** chép vào `assets/` rồi ghi tên tệp vào `logoBTC` (Sở GD&ĐT), `logoDonVi` (UBND phường Phúc Yên), `thanhVien[].anh`.
   - Logo Sở GD&ĐT Phú Thọ và UBND phường Phúc Yên: chỉ dùng file chính thức.
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

## Vận hành trạm Lab 3D qua webcam (mặt tiền phải)

- **Thiết bị:** màn 50" nằm ngang (đáy cách sàn 1 000), webcam 1080p góc rộng khoảng 78° đặt giữa mép trên màn, chúc xuống khoảng 15°, đèn LED 4000K dài 560 mm ngay trên webcam chiếu vào tay khách. Laptop có GPU tốt vì nhận diện tay chạy trên GPU.
- **Chạy:** trên laptop của trạm, trong `socratic-monorepo` chạy `npm run dev`, mở Chrome tại `http://localhost:3001/lab?bai=heart-surgery` (camera chỉ bật được trên localhost hoặc https), bấm F11 toàn màn hình.
- **Mạng:** lần bật camera đầu tiên phải tải mô hình nhận diện tay từ jsDelivr và Google Storage. Mở thử ít nhất một lần khi có mạng vào sáng 29/11, hoặc chép hai tệp này vào `public/` theo ghi chú đầu `apps/teacher-board/src/utils/lab/hands/handTracker.ts`.
- **Chỗ đứng:** khách đứng ở vòng "Giơ tay" cách mặt tiền khoảng 1,1 m. Lab nhận tối đa 2 bàn tay: chỉnh góc chúc của camera để khung hình chỉ lấy người đang chơi, không lấy người đứng sau. Kiểm tra bằng khung hình camera trong Lab trước giờ mở cửa.
- **Bài gợi ý cho khách thử nhanh (1–2 phút):** `heart-surgery`, `soft-tissue`, `chem`, `robot`, `drone`. Thử từng bài trên đúng máy của trạm trước ngày triển lãm.
