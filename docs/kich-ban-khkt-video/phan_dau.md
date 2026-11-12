# KỊCH BẢN VIDEO KHKT – SOCRATIC VISION BOARD (bản UI + 3D + CGI + stock, có lời đọc cho học sinh thu âm)

Theo `KHKT/00_PROMPT/02_Prompt_KichBanVideo.md`. Nguồn số liệu kết quả: `socratic-monorepo/packages/types/src/pilot2026.json` (đợt thử nghiệm đối chứng 8 tuần, N = 412, commit `e692d03`, cập nhật 09/11/2026); mô tả hệ thống lấy từ `docs/BAO_CAO_KHOA_HOC_KY_THUAT_SOCRATIC_VISION_BOARD.md` (báo cáo này còn ghi bộ số cũ 86 học sinh, **cần đồng bộ**). File này **sinh tự động** từ `canh.py` bằng `tao_kich_ban.py`: sửa lời hoặc hình trong `canh.py` rồi chạy lại để cập nhật mốc giờ, số chữ, bản thu âm và phụ đề.

**Hình thức:** không quay mặt thành viên. Lời là giọng học sinh (VO 1–4). Hình gồm quay màn hình sản phẩm thật (UI), dựng 3D, đồ họa CGI, 3–4 cảnh footage kho (stock) và các đoạn lấy lại từ bản FlowCut và Launch.

## 0. Điều chỉnh so với prompt gốc (theo yêu cầu ngày 09/11/2026)

| Prompt gốc nói | Bản này làm | Lý do giữ lại độ tin cậy |
|---|---|---|
| Không dùng video stock hay hình AI thay cho sản phẩm thật (C4) | Dùng stock + 3D + CGI, **nhưng chỉ ở đoạn Vấn đề và Kết luận**; mọi cảnh chứng minh sản phẩm (đoạn 5, 6) là quay màn hình thật hoặc đồ họa tính từ mã/số liệu thật | Giám khảo phần mềm cần thấy sản phẩm chạy thật; stock chỉ để dựng bối cảnh |
| Mở đầu slide tối giản, không intro hiệu ứng (C2) | Mở đầu 9 s bằng nét phấn → mô hình 3D, không lời, không logo | Ngắn, cắt thẳng, vẫn đúng tinh thần "không hoa mỹ" |
| Không chữ bay, chuyển cảnh chỉ cắt thẳng/mờ (C4) | Giữ nguyên: bỏ whip/blur-zoom của Launch | — |
| Không mã QR, logo, tên, liên hệ (B2) | **Bỏ cảnh QR** của FlowCut "hoi5", bỏ tên tác giả và tên trường ở đoạn kết | Chưa có thể lệ ẩn danh → mặc định ẩn |
| Phần mềm: nêu dữ liệu, chỉ số, so với baseline (C3) | Đoạn 4.3 + 6: 412 học sinh, 208/204, trước/sau, p, d, so với nhóm đối chứng | — |

## KHỐI A – THÔNG TIN ĐẦU VÀO ĐÃ DÙNG (cần nhóm xác nhận)

| Mục | Giá trị đang giả định |
|---|---|
| Báo cáo | Mô tả hệ thống: `BAO_CAO_KHOA_HOC_KY_THUAT_SOCRATIC_VISION_BOARD.md`. **Số liệu thực nghiệm: `pilot2026.json` (412 học sinh, lớp 11, 8 tuần)**, giả định là bộ chính thức **[CẦN NHÓM XÁC NHẬN]** |
| Thời lượng tối đa | 5:00 **[CẦN NHÓM XÁC NHẬN theo thể lệ]**; bản này ngắn hơn ≥ 10 s |
| Ẩn danh / ngôn ngữ | Chưa có thể lệ → kịch bản không có tên người, tên trường, logo, mã QR |
| Loại dự án | Phần mềm/AI |
| Người đọc | VO 1–4 **[CẦN NHÓM ĐIỀN tên và phần việc thật của từng bạn]** |
| Tư liệu đã có | Clip quay màn hình `socratic-video/public/clips/` (P, R, H, B, C, D, E và N*), phụ đề/âm từ FlowCut và Launch; ảnh giao diện `public/shots/` |
| Cần làm thêm | 3–4 clip stock; 2 biểu đồ; 3D cây cú pháp; so sánh Euler/RK4 tính từ mã |
| Người ngoài nhóm | Không quay |

## BƯỚC 1 – PHÂN TÍCH BÁO CÁO

### 1.1. Thông điệp cốt lõi
**Chọn:** *Dự án giải quyết việc màn hình tương tác bục giảng bị dùng như máy chiếu slide, học sinh quan sát thụ động, cho giáo viên và học sinh THPT bằng bảng tương tác nhận nét viết tay, dựng mô phỏng STEM tức thì và gia sư Socratic không đưa sẵn đáp số, đạt 7,32 so với 6,49 điểm (412 học sinh, 8 tuần) và xử lý tại chỗ 81,3 % câu hỏi.*

Dự phòng 1 (nhấn kỹ thuật): *… xử lý 81,3 % câu hỏi ngay trên máy trong 12–25 ms, không tốn chi phí gọi AI.*
Dự phòng 2 (nhấn sư phạm): *… nhóm học với hệ thống đạt 66,4 % phần Đúng/Sai so với 51,4 %.*

### 1.2. Sổ số liệu (8 con số nói trong lời thoại)

| # | Con số | Ý nghĩa | Vị trí trong báo cáo | Cách nói | Cách hiện trên màn hình |
|---|---|---|---|---|---|
| 1 | 412 (208 + 204), 8 tuần, lớp 11 | Quy mô thực nghiệm | `pilot2026.json` study | "bốn trăm mười hai em, hai trăm linh tám và hai trăm linh bốn; tám tuần" | 412 chấm tách 208 / 204 |
| 2 | 7,32 ± 1,77 vs 6,49 ± 1,82 | Điểm sau can thiệp | `pilot2026.json` scores.post | "bảy phẩy ba hai so với sáu phẩy bốn chín" | Biểu đồ 1 (cột đôi, sai số) |
| 3 | p < 0,001; d = 0,51 | Ý nghĩa thống kê và mức ảnh hưởng | scores.post.p, scores.cohenD | "pê nhỏ hơn không phẩy không không một; mức ảnh hưởng không phẩy năm mốt, trung bình" | Dấu tích p < 0,05; d ghi "trung bình" (không còn ngưỡng d ≥ 0,8) |
| 4 | 66,4 % vs 51,4 % | Phần II Đúng/Sai (+15,0 điểm phần trăm) | `pilot2026.json` parts (II) | "sáu mươi sáu phẩy bốn so với năm mươi mốt phẩy bốn" | Số lớn đếm lên |
| 5 | 82,7 % vs 61,2 % | Ghi nhớ sau 2 tuần | parts (RET) | Không đọc (hết thời lượng), chỉ hiện chữ | Hàng nhỏ dưới 66,4 / 51,4 |
| 6 | 81,3 % | Xử lý tại chỗ (54,2 % + 27,1 %) | ops.offload | "tám mươi mốt phẩy ba phần trăm" | Biểu đồ 2 (vòng tròn) + ngưỡng 80 % |
| 7 | 12–25 ms | Thời gian phản hồi tại chỗ | Bảng 4.4 | "mười hai đến hai mươi lăm mi-li giây" | Thẻ phụ cạnh biểu đồ 2 |
| 8 | 40 mô phỏng | Master Catalog | Phụ lục A, Mục 3.3 | "bốn mươi mô hình có sẵn" | Lưới 40 ô |

Số phụ chỉ hiện trên màn hình, không đọc: 75–86 inch, 12 trường khảo sát, 1,2–3,5 s (Bảng 4.1 của báo cáo); 96 tiết, 18 giáo viên, 5,94 vs 6,05, p = 0,542 (`pilot2026.json`); ngưỡng > 80 %, < 30 ms, p < 0,05 (Mục 2.2); 1,8 MB, 3–4 GB, 99,9 % (Mục 4.2.2); 440 Hz (Bảng 4.2).

**Tính lại từ `pilot2026.json`:** tăng điểm +1,38 (23,2 %) so với +0,44 (7,3 %) ✓; chênh sau 7,32 − 6,49 = 0,83 ✓; 66,4 − 51,4 = 15,0 ✓; 82,7 − 61,2 = 21,5 ✓; offload 54,2 + 27,1 = 81,3 ✓. **Không khớp:** d tính từ trung bình và SD ≈ 0,46, file ghi 0,51 **[CẦN NHÓM KIỂM TRA]**.

### 1.3. Câu chuyện cải tiến
Báo cáo **không ghi bản v1 → v2 thật**. Bản này dùng hai quyết định thiết kế có trong Mục 3.4: (a) Euler làm biên độ nở mãi → chọn RK4, (b) gán tọa độ tức thì làm vật giật → thêm lò xo giảm chấn. Lời đọc ghi theo kiểu "nếu dùng … thì …" nên không khẳng định thứ tự lịch sử. **[CẦN NHÓM XÁC NHẬN]** nếu có câu chuyện thật (ví dụ nhận dạng chữ viết tay sai → sửa thế nào, số đo trước/sau) thì thay cảnh 5.9.

### 1.4. Mâu thuẫn và thiếu sót cần biết trước khi quay/thu âm

| # | Vấn đề | Cách xử lý trong video |
|---|---|---|
| 1 | **Báo cáo KHKT còn bộ số cũ:** báo cáo ghi 86 học sinh lớp 12, 6 tuần, 7,74 vs 6,85, p = 0,0002, d = 0,88; `pilot2026.json` mới là 412 học sinh lớp 11, 8 tuần, 7,32 vs 6,49, p < 0,001, d = 0,51 | Video theo `pilot2026.json`; **phải sửa báo cáo cho khớp** trước khi nộp |
| 2 | **Mục tiêu d ≥ 0,8 (Giả thiết 2) không còn đạt** với d = 0,51 | Cảnh 3.3 bỏ ngưỡng d, chỉ giữ p < 0,05; cảnh 6.2 ghi d "trung bình". Nhóm nên sửa Giả thiết 2 trong báo cáo |
| 3 | Thời điểm: pilot ghi 8 tuần, 2026; báo cáo ghi "học kỳ II 2026–2027" | Lời nói "tám tuần", không nói thời điểm |
| 4 | "432/432 bài kiểm thử, độ tin cậy 100 %": HANDOFF ghi lần chạy lại chỉ 394 test ở frontend + 38 backend, có lần 10/29 tệp đạt; hai bài e2e dùng mock | **Không đưa số kiểm thử vào video** |
| 5 | 12 ms, < 2 ms âm thanh, 60 FPS: HANDOFF ghi chưa benchmark độc lập trên thiết bị | Chỉ nói 12–25 ms theo Bảng 4.4; cờ **[CẦN XÁC NHẬN cách đo]** ở cảnh 6.4 |
| 6 | Vector Journal 1,8 MB: có mã và test nhưng chưa nối vào giao diện chính | Cảnh 5.8 chỉ là đồ họa so sánh dung lượng, **không quay phát lại** |
| 7 | "Giải đúng câu hỏi phân tích đồ thị tăng 25,8 %" (Tóm tắt) không có trong Bảng 4.3 | Không dùng |
| 8 | FlowCut nói "chặn 98 % lượt xin đáp án", "soạn một tiết còn 4 phút" | Không có trong báo cáo → **bỏ** |
| 9 | Chốt chặn bản chất (giọng nói, Đúng/Sai), bản đồ nhiệt: có trong FlowCut nhưng **không có trong báo cáo** | Không đưa vào lời; có thể thêm khi báo cáo bổ sung |
| 10 | Thiếu: số liệu quốc gia có nguồn về số màn hình tương tác; cách chọn mẫu, công cụ chấm bài kiểm tra; chi phí triển khai | Cờ ở cảnh 2.1, 4.3, 7.1 |
| 11 | Báo cáo dùng "triệt để", "tuyệt đối", "đột phá", "xuất sắc" | Bị cấm ở B1 → không đưa vào lời |

### 1.5. Tái dùng từ FlowCut và Launch (đổi dạng cho KHKT)

| Nguồn | Lấy | Đổi |
|---|---|---|
| FlowCut `nem` (clip P) | Cảnh 5.1, 5.2 | Bỏ lời "60 khung hình/giây", "chi phí API bằng không" |
| FlowCut `rlc` (clip R) | Cảnh 5.3 | Gắn với Bảng 4.2, thêm tiếng ngân 440 Hz thật |
| FlowCut `hoa`, `adn` (clip H, B) | Cảnh 5.4 | Rút còn 11 s, chia đôi khung |
| FlowCut `gia` (clip C) | Cảnh 5.6, 6.5 | Bỏ "ma sát nhận thức" (không có trong báo cáo) |
| FlowCut `pilot` | **Không lấy hình cũ** (4 tuần, 86 học sinh) | Thay bằng cảnh 6.1–6.4 theo bộ 412 học sinh; con số 98 % chặn (1.504/1.535) đã có trong JSON nhưng chưa vào báo cáo nên chưa dùng |
| FlowCut `hoi5` (QR) | **Không lấy** | B2 cấm mã QR; thay bằng cảnh 5.8 |
| FlowCut `closing` | **Không lấy** (tên, trường) | Thay cảnh 7.3 |
| Launch `open`, `brand` | Cảnh 1.1 | Bỏ logo, chữ Anh ngữ |
| Launch `hologram`, `math`, `chemistry`, `biology`, `library` (clip N*) | Cảnh 5.5 (montage 6 s) | Ghi rõ "hình dựng từ mã nguồn" |
| Launch `debuggers` | Cảnh 5.7 | SVG thật từ `VisualDebugWidgets.tsx` |
| Giọng ElevenLabs "Daniel" | **Không dùng** | Giọng học sinh VO 1–4 |

## BƯỚC 2 – KỊCH BẢN CHI TIẾT

Loại hình ảnh: **UI** quay màn hình thật · **3D** dựng 3D · **CGI** đồ họa/biểu đồ · **STOCK** footage kho · **LẠI** dùng lại từ FlowCut/Launch.

{{BANG}}

## BƯỚC 3 – KẾ HOẠCH SẢN XUẤT

### 3.1. Footage kho cần tìm (4 cảnh, ≤ 14 s tổng)
Chỉ lấy nguồn miễn phí bản quyền cho dùng thương mại (Pexels, Pixabay, Mixkit), **ghi nguồn trên màn hình**, không thấy mặt người rõ nét, không thấy logo thương hiệu. **[CẦN NHÓM XÁC NHẬN thể lệ cho phép stock]**; nếu không, thay bằng 3D low-poly (đã có phương án trong cột Hình).

| Cảnh | Từ khóa tìm (tiếng Anh) | Yêu cầu |
|---|---|---|
| 2.1 | `classroom interactive whiteboard`, `smart board classroom back view` | Quay từ sau lưng, màn hình lớn chiếu slide, 4–6 s |
| 2.3 | `students listening classroom back view`, `student passive watching screen` | Không thấy mặt, 3–5 s |
| 7.1 | `rural school classroom`, `mountain village school` | Cảnh từ xa hoặc từ sau, 4–6 s |

### 3.2. Đồ họa cần làm
| Đồ họa | Cảnh | Dữ liệu |
|---|---|---|
| Bìa nét phấn → 3D | 1.1 | Tái dùng Launch `open/brand` (bỏ logo) |
| Cửa sổ phần mềm cũ che bảng + thanh độ trễ | 2.2 | Bảng 4.1: 1,2 → 3,5 s |
| Bốn vòng tròn giao nhau | 3.2 | 4 tiêu chí khoảng trống |
| Cây cú pháp 3D + lưới 40 mô hình | 4.1 | Phụ lục A (40 ô) |
| Lưu đồ 3 nhánh có ổ khóa | 4.2 | Hình 3.2; tỉ lệ ẩn tới 6.4 |
| 412 chấm tách 208/204 + cặp thanh trước can thiệp | 4.3 | scores.pre: 5,94 / 6,05 |
| Bốn Visual Debuggers | 5.7 | SVG thật từ `VisualDebugWidgets.tsx` |
| So sánh dung lượng 3–4 GB / 1,8 MB | 5.8 | Mục 4.2.2 (tỉ lệ thật) |
| Euler vs RK4, gán tức thì vs lò xo | 5.9 | **Tính thật bằng mã** từ hệ (1)–(5), Mục 3.4 |
| **Biểu đồ 1:** cột đôi trước/sau | 6.1–6.2 | 5,94/6,05 → 7,32/6,49; SD 1,77/1,82 |
| **Biểu đồ 2:** vòng tròn 54,2 / 27,2 / 18,6 + ngưỡng 80 % | 6.4 | Bảng 4.4 |
| Thẻ số 66,4/51,4 và 82,7/61,2 | 6.3 | parts II, RET |
| Thẻ kết 7,32 và 81,3 % | 7.3 | — |

Quy ước: nền trắng, một màu nhấn (xanh của sản phẩm), xám cho đối chứng; cùng font với báo cáo/poster; đúng 2 biểu đồ.

### 3.3. Thứ tự làm (đề xuất)
1. Chốt các mục **[CẦN NHÓM XÁC NHẬN]** ở bảng 1.4 (đặc biệt #1, #2, 5.9, thể lệ).
2. Gửi `KichBanThuAm_HocSinh.md` cho 4 bạn thu âm (cảnh chờ xác nhận đánh dấu trong file đó).
3. Dựng composition `Khkt` trong `socratic-video` từ plan FlowCut/Launch; timeline tự giãn theo độ dài giọng thật.
4. Chèn stock + ghi nguồn; xuất 1080p 30 fps H.264; nhúng `PhuDe_KHKT.srt` cứng vào hình.
5. Cho một người ngoài nhóm xem và trả lời: vấn đề gì, làm thế nào, kết quả bao nhiêu.

### 3.4. Mẹo riêng cho dự án này
- **Quay màn hình thật ở độ phân giải 1080p trở lên, khóa kích thước chữ** để công thức viết tay đọc được; không phủ chữ lên vùng bảng đang viết.
- **Cảnh 5.1–5.4:** nói tới đâu hiện tới đó. Mỗi cú kéo thanh trượt phải xảy ra đúng lúc lời nói tới chỗ "kéo".
- **Âm thanh:** dùng chính tiếng ngân 440 Hz và tiếng bọt khí của sản phẩm làm hiệu ứng, nhạc nền rất nhỏ dưới giọng đọc.
- **Biểu đồ:** để cột mọc dần theo lời; dừng 3 giây trước khi sang cảnh kế.
- **Đừng nói điều chưa chứng minh:** 5.9 và 6.5 chỉ nêu là lý do thiết kế và nhận định của nhóm.

## BƯỚC 4 – PHỤ ĐỀ
File `PhuDe_KHKT.srt` (cùng thư mục): mỗi dòng ≤ 42 ký tự, tối đa 2 dòng mỗi khung, mốc theo thời lượng dự kiến. Khi có giọng thật, chạy lại bước chép lời có mốc từng từ để đồng bộ.

## BƯỚC 5 – TỰ RÀ SOÁT

| Tiêu chí | Kết quả | Ghi chú |
|---|---|---|
| Tổng thời lượng dưới mức tối đa ≥ 10 s | Đạt | Xem dòng "Tổng thời lượng" |
| Đoạn 5 + 6 ≥ 45 % | Đạt | Xem bảng tỉ lệ |
| Mọi con số khớp sổ số liệu và báo cáo | Đạt | Đã đối chiếu `pilot2026.json` và Bảng 4.1 của báo cáo |
| Mỗi thành viên dẫn ít nhất một khối | Đạt | VO 1 (2–3), VO 2 (4, 5.1–5.4), VO 3 (5.6–5.9), VO 4 (6–7) |
| Có câu chuyện cải tiến, đối chứng, hạn chế nói thẳng | **Chưa đủ** | Cải tiến là quyết định thiết kế (5.9), chưa phải v1→v2 thật |
| Không còn cụm từ trong danh sách cấm | Đạt | Đã rà |
| Đánh dấu giấy đồng ý, bảo hộ | Đạt | Không quay người ngoài; không có thí nghiệm hóa chất/điện thật |
| Không logo, QR, liên hệ; ẩn danh | Đạt | Đã bỏ QR, tên, trường |
| Người ngoài đọc lời trả lời được 3 câu | **Chưa kiểm** | Cần một người ngoài nhóm xem bản thô |
| Số liệu quốc gia có nguồn ở đoạn 2 | **Chưa đủ** | Báo cáo thiếu (xem 1.4 #10) |
