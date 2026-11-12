# KỊCH BẢN THU ÂM – VIDEO ViSEF FRESHNOSE AI

Dành cho 4 bạn đọc lời (VO 1–4). Video đã dựng xong hình; chỉ cần thu giọng theo từng đoạn dưới đây rồi gửi file, hình sẽ tự giãn theo giọng thật.

**Ghi tên người đọc:** VO 1: ………… · VO 2: ………… · VO 3: ………… · VO 4: ………… (mỗi bạn đọc phần đúng với việc mình đã làm).

## Cách thu

1. Phòng kín, tắt quạt/điều hòa; ngồi trong góc có rèm, chăn hoặc tủ quần áo mở để bớt vang.
2. Điện thoại cách miệng **khoảng 20 cm**, hơi chếch xuống, không cầm tay (đặt trên chồng sách). Dùng ứng dụng Ghi âm mặc định.
3. **Mỗi đoạn một file**, đặt tên đúng mã: `vo-2.1.m4a`, `vo-2.2.m4a`… (định dạng gì cũng được: m4a, mp3, wav).
4. Bấm ghi → im **1 giây** → đọc → im **1 giây** → dừng. Mỗi đoạn đọc **2 lần** trong cùng file; nhóm chọn lần tốt hơn hoặc để người dựng chọn.
5. Đọc như đang **kể cho bạn nghe**, không đọc như văn bản. Tốc độ vừa phải, rõ từng số. Không cần cố khớp giây.
6. Đọc **Node** là "nốt", **LoRa** là "lô-ra", **pallet** là "pa-lét". `/` = nghỉ ngắn (lấy hơi nhẹ) · `//` = nghỉ hết câu · **chữ đậm** = con số, đọc chậm và rõ hơn một chút.
7. Sai thì dừng một nhịp rồi đọc lại **cả câu** đó, không cần xóa.
8. Nghe lại một lần bằng tai nghe: không rè, không có tiếng xe/tiếng nói nền thì gửi.

Gửi cả thư mục file vào `socratic-video/public/fn/visef/` (hoặc gửi cho thầy), người dựng chạy lại `tao_giong_tam.py` → `tao_timeline.py` → `tao_nhac.py` rồi render.

## VO 1 – Vấn đề, khoảng trống, mục tiêu (6 đoạn)

| File | Đọc | Trên màn hình lúc đó | Độ dài gợi ý |
|---|---|---|---|
| `vo-2.1` | Theo ép-a-ô (FAO), / năm **hai nghìn không trăm hai mươi ba** thế giới mất **hai mươi lăm phẩy bốn** phần trăm rau quả sau thu hoạch. | 25,4 % rau quả mất sau thu hoạch (2023) | ~10 s |
| `vo-2.2` | Trong kho mát, / một sọt xoài dập có thể lên men rồi lây ra cả pa-lét, / dù nhiệt độ kho vẫn bình thường. | Nhiệt kế: 12 °C (không đổi) | ~9 s |
| `vo-2.3` | Nhóm em khảo sát mười tám đơn vị: / mười lăm nơi vẫn kiểm tra bằng mắt và mũi, / tức là chỉ thấy khi quả đã thối. | 15/18 đơn vị kiểm tra bằng mắt, mũi | ~10 s |
| `vo-3.1` | Nhìn và ngửi thì muộn, / đo nhiệt ẩm thì không thấy lên men, / máy đo khí cầm tay thì phải đo từng điểm. | Muộn · Không thấy lên men · Đo thủ công từng điểm | ~9 s |
| `vo-3.2` | Chưa có cách nào vừa đo liên tục, / vừa thấy lên men, / vừa hợp túi tiền hợp tác xã. | ĐỒ HỌA: 3 vòng tròn giao nhau (Liên tục · Đo lên men · Giá phù hợp), vùng giữa trống, có d | ~7 s |
| `vo-3.3` | Mục tiêu của nhóm em: / phân loại đúng từ **tám mươi lăm** phần trăm, / cảnh báo giả không quá **mười** phần trăm, / báo sớm hơn mắt ít nhất **mười hai** giờ. | Độ chính xác ≥ 85 % · Cảnh báo giả ≤ 10 % · Sớm hơn mắt ≥ 12 giờ | ~12 s |

## VO 2 – Nguyên lý, phương pháp, kết quả (8 đoạn)

| File | Đọc | Trên màn hình lúc đó | Độ dài gợi ý |
|---|---|---|---|
| `vo-4.1` | Quả lên men tỏa ra hơi cồn. // Cảm biến khí bán dẫn giống một chiếc mũi: / gặp hơi cồn, / điện trở của nó giảm xuống. | Rs/R0 = điện trở trong khí mẫu / điện trở trong không khí sạch | ~10 s |
| `vo-4.2` | Một cảm biến dễ nhầm, / nên nhóm em ghép hai cảm biến khí với cảm biến nhiệt ẩm, / rồi để Ren-đơm Pho-rét (Random Forest) nhận dạng cả mẫu tín hiệu. | TGS2602 · TGS822 · SHT31 → Random Forest → An toàn / Chín sinh lý / Nguy cơ lên men | ~12 s |
| `vo-4.3` | Thí nghiệm có ba đợt, / mỗi đợt ba buồng: / quả lành, / quả bị xước và quả nhiễm nấm, / đo ba mươi phút một lần, / được **bốn nghìn năm trăm** mẫu. | 3 đợt × 3 buồng · 30 phút/lần · 4.500 mẫu | ~12 s |
| `vo-4.4` | Mô hình học trên hai đợt đầu, / rồi kiểm tra trên đợt ba mà nó chưa từng thấy. | Học: 3.000 mẫu (đợt 1, 2) · Kiểm tra: 1.500 mẫu (đợt 3) | ~7 s |
| `vo-6.1` | Trên đợt kiểm tra, / mô hình phân loại đúng **tám mươi bảy phẩy năm** phần trăm, / nhận ra **bốn trăm chín mươi tám** trên **năm trăm** mẫu đang lên men, / và cảnh báo giả **sáu phẩy hai** phần trăm. | 87,47 % (1.312/1.500) · 498/500 mẫu lên men · Cảnh báo giả 6,2 % (62/1.000) | ~15 s |
| `vo-6.2` | Khi quả lên men, / tín hiệu của cả hai cảm biến cùng tụt xuống khoảng **không phẩy ba**, / còn quả lành chỉ giảm nhẹ khi chín. | An toàn 0,87 · Chín 0,66 · Lên men 0,33 (TGS2602) | ~10 s |
| `vo-6.3` | Ở cả sáu chuỗi quả hỏng, / mức đỏ xuất hiện trước khi thấy vết thối trung bình khoảng **hai mươi sáu** giờ, / đủ để tách sọt trong một ca. | 26,3 ± 6,4 giờ (6 chuỗi) | ~11 s |
| `vo-6.4` | Một Node chạy hơn ba tuần mới phải sạc, / đủ một chu kỳ lưu kho. | 23,5 ngày · pin 6.000 mAh · đo ở 12 °C | ~6 s |

## VO 3 – Sản phẩm, giao diện trạm, kết luận (7 đoạn)

| File | Đọc | Trên màn hình lúc đó | Độ dài gợi ý |
|---|---|---|---|
| `vo-5.1` | Các Node gắn nam châm trên thành pa-lét, / gửi dữ liệu qua sóng Lô-Ra về một trạm đặt gần cửa kho. | Mô hình minh họa | ~8 s |
| `vo-5.2` | Mỗi Node có hai cảm biến khí, / cảm biến nhiệt ẩm, / vi điều khiển ê-ét-pê ba hai (ESP32) và pin. // Màng chống nước giữ cảm biến luôn khô. | Nhãn: TGS2602, TGS822, SHT31, ESP32-S3, LoRa, màng PTFE, pin LiFePO4 | ~11 s |
| `vo-5.3` | Trạm tô màu từng phân khu: / xanh là ổn định, / vàng cần theo dõi, / đỏ là nguy cơ lên men. | Mức 1 xanh · Mức 2 vàng · Mức 3 đỏ | ~8 s |
| `vo-5.4` | Đây là dữ liệu thật của đợt ba phát lại trên trạm: / buồng nhiễm nấm và buồng xước lần lượt chuyển đỏ, / buồng đối chứng vẫn xanh. | Góc trên: "Phát lại dữ liệu thật – đợt 3" | ~10 s |
| `vo-7.1` | Hạn chế lớn nhất: / lớp chín sinh lý mới nhận đúng **bốn mươi lăm** phần trăm, / và mới thử trong phòng thí nghiệm. // Tiếp theo nhóm em sẽ thử tại hai kho mát. | Lớp chín sinh lý: 45,0 % · Pilot 2 kho: 10/2026 – 2/2027 (chưa có kết quả) | ~13 s |
| `vo-7.2` | Gói một trạm, / tám Node giá **hai mươi hai** triệu đồng, / trong mức chi của **mười ba** trên **mười tám** đơn vị khảo sát. | 22 triệu đồng/gói (giá vốn ước tính 13,4 triệu) | ~9 s |
| `vo-7.3` | Mũi điện tử giá thấp của nhóm em báo lên men sớm hơn mắt thường khoảng **hai mươi sáu** giờ và phân loại đúng **tám mươi bảy phẩy năm** phần trăm, / giúp kho tách sọt hỏng trước khi lây cả pa-lét. | ≈ 26 giờ sớm hơn · 87,5 % | ~16 s |

## VO 4 – Quá trình cải tiến v1 → v2 (4 đoạn)

| File | Đọc | Trên màn hình lúc đó | Độ dài gợi ý |
|---|---|---|---|
| `vo-5.5` | Bản đầu sấy cảm biến liên tục nên pin cạn chưa tới một ngày. // Nhóm em chuyển sang ba mươi phút đo một lần rồi cho ngủ sâu. | v1: pin cạn ở giờ 18–19 → v2: chu kỳ 30 phút | ~11 s |
| `vo-5.6` | Hơi nước còn đọng lên cảm biến làm tín hiệu tụt giả, / nên nhóm em thêm màng chống nước ở cửa lấy khí. | v1: 46–48 kΩ → 4–6 kΩ khi đọng sương · v2: màng PTFE khô ở 108/108 lần đo | ~9 s |
| `vo-5.7` | Bản hai còn báo đỏ giả theo chu kỳ, / nghi do kho xả đá, / nên nhóm em đưa nhiệt độ và độ ẩm vào mô hình. | Đỉnh 14,6 °C · 97,5 % · "Sau bù: cảnh báo giả không tập trung ở mẫu nóng" | ~10 s |
| `vo-5.8` | Nguyên mẫu hiện có một trạm và ba Node do nhóm em tự lắp. | 1 trạm + 3 Node | ~5 s |

**Tổng lời đọc mục tiêu:** khoảng 4 phút 10 giây, **không quá 4 phút 10 giây** cộng tất cả các đoạn (nếu dài hơn, phim sẽ vượt 4:50). Giọng máy tạm hiện đọc 2 phút 54 giây. Mỗi đoạn lệch ± 2 giây so với gợi ý là bình thường.

## Kiểm tra trước khi gửi

- [ ] Đủ 25 file, tên đúng mã (`vo-5.3` và `vo-5.4` là hai file riêng).
- [ ] Các con số đọc đúng như chữ đậm (87 phẩy 5 phần trăm, 498 trên 500, 6 phẩy 2 phần trăm, khoảng 26 giờ, 22 triệu đồng).
- [ ] Không đọc tên trường, tên riêng nếu thể lệ yêu cầu ẩn danh.
- [ ] Mỗi file có 1 giây im lặng ở đầu và cuối.
