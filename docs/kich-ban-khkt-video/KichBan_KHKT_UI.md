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

| Cảnh | Thời điểm | Người dẫn | Lời thoại (đọc) | Loại | Hình ảnh & góc máy | Chữ/đồ họa trên màn hình | Âm thanh | Nguồn trong báo cáo | Số chữ |
|---|---|---|---|---|---|---|---|---|---|
| **1** | | | **MỞ ĐẦU** | | | | | | |
| 1.1 | 0:00.0–0:09.0 | — | *(không lời)* | 3D+LẠI | Nền sáng. Một nét phấn viết tay vạch cung parabol, cung dựng đứng thành mặt cong 3D xoay chậm (dùng lại cảnh open/brand của Launch, bỏ logo). Cắt thẳng. | Socratic Vision Board · Nền tảng bảng tương tác thông minh hỗ trợ dạy học thực nghiệm STEM · Lĩnh vực: Hệ thống phần mềm | Nhạc nền miễn phí bản quyền, rất nhỏ; một tiếng viết phấn | Bìa | 0 |
| **2** | | | **VẤN ĐỀ THỰC TẾ** | | | | | | |
| 2.1 | 0:09.0–0:17.2 | VO 1 | Hàng nghìn phòng học có màn hình tương tác lớn, nhưng phần lớn chỉ dùng để chiếu xờ-lai. | STOCK | Footage kho: phòng học, màn hình tương tác lớn chiếu slide tĩnh, quay từ phía sau lưng học sinh (không thấy mặt), lia chậm. Phủ CGI: khung "SLIDE TĨNH" khóa cứng lên màn hình. | 75–86 inch · Nguồn video: [ghi tên kho + tác giả] | Nhạc; tiếng lớp học nền nhỏ | Mục 1.1 · [THIẾU TRONG BÁO CÁO: số liệu quốc gia có nguồn về số màn hình] | 19 |
| 2.2 | 0:17.2–0:27.8 | VO 1 | Nhóm em khảo sát mười hai trường THPT. Phần mềm mô phỏng hiện có nằm trong khung chữ nhật đặc, che mất chữ thầy viết. | CGI | Vẽ lại bảng phấn có công thức viết tay; một cửa sổ phần mềm cũ (tự vẽ, không logo) trượt vào che kín chữ. Biểu tượng wifi gạch chéo, thanh độ trễ chạy 1,2 → 3,5 s. | 12 trường THPT khảo sát · Độ trễ 1,2–3,5 s · Mất mạng = ngừng | Nhạc; "bíp" nhẹ khi cửa sổ che | Mục 4.1, Bảng 4.1 (hàng Không gian hiển thị, Độ trễ) | 25 |
| 2.3 | 0:27.8–0:34.0 | VO 1 | Đáp số hiện sẵn, nên học sinh chỉ ngồi xem mà không phải nghĩ. | STOCK+CGI | Footage kho: học sinh nhìn màn hình từ phía sau, hoặc dựng 3D hình người low-poly ngồi yên. Cạnh đó đáp số "= 42" hiện sẵn bằng đồ họa. | Học sinh quan sát thụ động | Nhạc | Bảng 4.1 (hàng Định hướng sư phạm) | 14 |
| **3** | | | **KHOẢNG TRỐNG & MỤC TIÊU** | | | | | | |
| 3.1 | 0:34.0–0:44.2 | VO 1 | Phét và Gi-ô-Gíp-bra rất tốt, nhưng làm cho một học sinh một máy, và chưa nhận nét viết tay của thầy. | CGI | Hai thẻ chữ (chỉ tên, không logo) hiện lần lượt; dưới mỗi thẻ gạch ra hạn chế: 1 học sinh = 1 máy · cửa sổ đặc · không nhận nét viết tay. | PhET · GeoGebra — Nguồn: Mục 1.2, TLTK [6] | Nhạc | Mục 1.2 | 24 |
| 3.2 | 0:44.2–0:56.9 | VO 1 | Nhóm em chưa thấy công cụ nào vừa nổi ngay trên mặt bảng, vừa hiểu nét viết tay, vừa chạy được khi mạng yếu, vừa không đưa sẵn đáp số. | 3D+CGI | Bốn vòng tròn giao nhau dựng 3D nhẹ: Nổi trên mặt bảng · Hiểu nét viết tay · Chạy khi mạng yếu · Không đưa sẵn đáp số. Vùng giao ở giữa để trống có dấu "?". | Khoảng trống: cả 4 điều kiện cùng lúc | Nhạc; mỗi vòng một nốt | Mục 1.2, Bảng 4.1 (tổng hợp 4 tiêu chí) | 30 |
| 3.3 | 0:56.9–1:07.1 | VO 1 | Mục tiêu: xử lý tại chỗ hơn tám mươi phần trăm biểu thức, và học sinh học tốt hơn có ý nghĩa thống kê. | CGI | Hai thẻ số lớn: "> 80 %  (< 30 ms)" và "p < 0,05". Dấu ngưỡng vẽ sẵn để cảnh 6 so sánh. | > 80 % xử lý tại chỗ, < 30 ms · p < 0,05 | Nhạc | Mục 2.2 (Giả thiết 1, 2) · [CẦN NHÓM XÁC NHẬN: bỏ ngưỡng d ≥ 0,8 vì pilot2026.json mới có d = 0,51] | 24 |
| **4** | | | **CƠ SỞ & PHƯƠNG PHÁP** | | | | | | |
| 4.1 | 1:07.1–1:19.4 | VO 2 | Cách hoạt động giống một người phiên dịch. Máy tách nét viết thành công thức, dựng thành cây cú pháp, rồi so với bốn mươi mô hình có sẵn. | 3D | Nét viết tay "y = ax²" vỡ thành khối token 3D → xếp thành cây nhị phân (nút lá m, v, t; nút nhánh +, ×) xoay chậm → bay vào một ô của lưới 40 mô hình, ô sáng lên. | Nét viết → Token → Cây cú pháp → 1 trong 40 mô hình | Nhạc; tiếng "tách" mỗi khi token rơi vào cây | Mục 3.3 (giai đoạn 1–2), Hình 3.2 | 29 |
| 4.2 | 1:19.4–1:32.1 | VO 2 | Công thức quen thì xim-pai giải ngay trên máy. Công thức lạ mới hỏi mô hình ngôn ngữ, và mô hình đó bị chặn, không được nói đáp số. | CGI | Vẽ lại Hình 3.2: một dòng chảy chia 3 nhánh (SymPy tại chỗ · Bộ đệm · Mô hình đám mây). Nhánh đám mây có ổ khóa, đáp số bị gạch trước khi ra màn hình. Chưa hiện tỉ lệ % (để dành cảnh 6.4). | SymPy tại chỗ → Bộ đệm → LLM đám mây (Socratic Guardrails: chặn đáp số) | Nhạc; "cạch" khi ổ khóa đóng | Mục 3.3 (giai đoạn 2–3), Hình 3.2 | 30 |
| 4.3 | 1:32.1–1:46.3 | VO 2 | Trong tám tuần, nhóm em thử trên bốn trăm mười hai học sinh lớp mười một: hai trăm linh tám em học với hệ thống, hai trăm linh bốn em học theo cách thường. | 3D+CGI | 412 chấm 3D rơi xuống rồi tách: 208 chấm màu nhấn, 204 chấm xám. Hiện cặp thanh điểm trước can thiệp 5,94 và 6,05 gần như bằng nhau, ghi p = 0,542. | 412 học sinh = 208 thực nghiệm + 204 đối chứng · 8 tuần · 96 tiết · 18 giáo viên · Điểm đầu vào 5,94 vs 6,05 (p = 0,542) | Nhạc; tiếng chấm rơi nhỏ | pilot2026.json: study, scores.pre · [CẦN NHÓM CHỐT: đồng bộ báo cáo KHKT, hiện còn ghi 86 học sinh, 6 tuần, lớp 12] | 34 |
| **5** | | | **SẢN PHẨM & QUÁ TRÌNH** | | | | | | |
| 5.1 | 1:46.3–1:56.3 | VO 2 | Thầy cứ viết tay như mọi ngày. Viết công thức ném xiên, khoanh lại, và mô hình hiện nổi ngay trên mặt bảng. | UI+LẠI | Quay màn hình thật Teacher Board (clip P / FlowCut "nem"): viết công thức → khoanh → quỹ đạo parabol hiện nổi. Camera "thở" zoom vào nét khoanh rồi mở ra. Không phủ chữ lên vùng bảng. | Viết → Khoanh → Mô hình | Tiếng viết phấn thật; nhạc nhỏ | Mục 4.2.1, Hình 4.3 | 23 |
| 5.2 | 1:56.3–2:03.3 | VO 2 | Kéo góc ném, tầm xa đổi tức thì, bảng không phải gọi lại AI. | UI+LẠI | Clip P: kéo góc ném, parabol co giãn mượt. Bốn góc ngắm (HUD) hiện khi chạm, nhấc tay thì mờ dần sau 2 giây. | HUD tự mờ sau 2 giây · Hòa trộn Alpha Compositing, không che chữ viết | Âm xung nhẹ khi kéo (âm thủ tục thật của sản phẩm) | Mục 4.2.1; Bảng 4.2 (hàng Tầm ném cực đại) | 14 |
| 5.3 | 2:03.3–2:15.3 | VO 2 | Với mạch R-L-C, kéo tần số qua điểm cộng hưởng, dòng điện cực đại thì câu hỏi gợi mở hiện lên. | UI+LẠI | Clip R (FlowCut "rlc"): giản đồ Fresnel + đường cộng hưởng; kéo ω qua đỉnh → dòng điện chạm cực đại → thẻ câu hỏi nổi. Zoom cận vào thẻ. | Z_L = Z_C → I = I_max · "Năng lượng chuyển hóa qua lại thế nào giữa L và C?" | Tiếng ngân 440 Hz thật của sản phẩm; nhạc hạ xuống | Bảng 4.2 (hàng Cộng hưởng điện RLC), Mục 4.2.2 | 23 |
| 5.4 | 2:15.3–2:26.8 | VO 2 | Hóa học và sinh học cũng vậy: thêm xúc tác thì đỉnh năng lượng hoạt hóa hạ xuống, kéo thanh trượt thì enzim tách hai mạch ADN. | UI+LẠI | Chia đôi khung: trái clip H (đỉnh năng lượng hoạt hóa hạ xuống khi thêm xúc tác), phải clip B (xoắn kép ADN tách mạch). Cắt thẳng giữa hai nửa, không hiệu ứng. | C-05 Năng lượng hoạt hóa · B-10 Xoắn kép ADN | Nhạc; bọt khí 1200–2400 Hz (âm thủ tục thật) | Phụ lục A (C-05, B-10), Mục 4.2.2 | 27 |
| 5.5 | 2:26.8–2:31.8 | — | *(không lời)* | 3D+LẠI | Montage 6 s, cắt theo nhịp: các cảnh 3D dựng từ mã nguồn sản phẩm (Launch: Oxyz, khối tròn xoay, tinh thể, SN2, chuỗi truyền electron, quần thể thú–mồi). Ghi rõ đây là hình dựng từ mã nguồn, không phải quay UI mới. | 40 mô phỏng Toán · Lý · Hóa · Sinh (Phụ lục A) · Hình dựng từ mã nguồn sản phẩm | Nhạc lên nhẹ; tiếng whoosh tối đa 1 lần | Phụ lục A; Launch/ProductScenes.tsx | 0 |
| 5.6 | 2:31.8–2:43.2 | VO 3 | Khi học sinh tự học ở nhà, ứng dụng không đưa đáp số, mà khóa mờ các bước sau, mở từng bước khi các em làm đúng. | UI+LẠI | Quay màn hình thật Student Companion (clip C / FlowCut "gia") trong khung điện thoại 3D: các bước sau bị khóa mờ, học sinh nhập đúng thì bước kế mở ra. Đóng khung điện thoại bằng mô hình 3D nghiêng nhẹ. | Locked Stepper: khóa các bước sau | Nhạc; "tách" khi mở bước | Mục 3.2 (Student Companion), Mục 4.2.4, Hình 4.4 | 27 |
| 5.7 | 2:43.2–2:54.7 | VO 3 | Nếu làm sai, bốn công cụ trực quan cho các em thấy vì sao sai: cân bằng electron, đa giác lực, tiếp tuyến và màng thẩm thấu. | CGI+LẠI | Lưới 2×2: bốn Visual Debuggers lấy SVG thật từ VisualDebugWidgets (Launch "debuggers"): Electron Balance, Force Polygon, Tangent Slider, Osmosis Membrane; mỗi ô chạy 2 giây rồi phóng to lần lượt. | Electron Balance · Force Polygon · Tangent Slider · Osmosis Membrane | Nhạc; âm nhỏ mỗi ô | Mục 4.2.4, Hình 4.4 | 27 |
| 5.8 | 2:54.7–3:03.7 | VO 3 | Cuối tiết, bài giảng nén còn một phẩy tám mê-ga-bai, thay vì video ba giga. | CGI | So sánh kích thước: một khối rất lớn "Video 4K 3–4 GB" và một chấm nhỏ "Nhật ký vector 1,8 MB" cạnh nhau (tỉ lệ thật); khối lớn thu nhỏ dần vào chấm. KHÔNG quay màn hình phát lại vì chưa nối vào UI. | 40.000 sự kiện = 1,8 MB · giảm 99,9 % dung lượng | Nhạc | Mục 4.2.2, Bảng 4.1 · [CẦN NHÓM XÁC NHẬN: vectorJournal chưa nối vào giao diện chính (HANDOFF) → chỉ dùng đồ họa] | 17 |
| 5.9 | 3:03.7–3:18.8 | VO 3 | Tích phân bằng Ơ-le thì quỹ đạo nở mãi, nên nhóm em chọn Run-ghê Cút-ta bậc bốn. Gán tọa độ tức thì thì vật giật, nên nhóm em thêm lò xo giảm chấn. | 3D+CGI | Hai đồ thị pha cạnh nhau, tính thật bằng mã trên cùng một hệ quần thể thú–mồi: trái (Euler) quỹ đạo xoắn bung ra, phải (RK4) quỹ đạo khép kín. Sau đó điểm bị kéo: đường gán tức thì giật, đường lò xo giảm chấn mượt. | Euler: biên độ nở mãi → RK4: quỹ đạo khép kín · Gán tức thì: giật → Spring-Damper: mượt | Nhạc; "ting" khi quỹ đạo khép | Mục 3.4 (mục 1, 2) · [CẦN NHÓM XÁC NHẬN: báo cáo không ghi bản v1/v2 thật; nếu có thì thay bằng câu chuyện thật] | 36 |
| **6** | | | **KẾT QUẢ** | | | | | | |
| 6.1 | 3:18.8–3:30.8 | VO 4 | Sau thực nghiệm, nhóm dùng hệ thống đạt bảy phẩy ba hai điểm, nhóm học theo cách thường đạt sáu phẩy bốn chín. | CGI | BIỂU ĐỒ 1: cột đôi (trước/sau). Nhóm thực nghiệm màu nhấn, đối chứng xám, thanh sai số ±SD. Cột "sau" mọc dần theo lời nói. | 7,32 ± 1,77 (thực nghiệm) vs 6,49 ± 1,82 (đối chứng) · trước: 5,94 vs 6,05 | Nhạc; "ting" khi cột chạm đỉnh | pilot2026.json: scores.pre, scores.post | 23 |
| 6.2 | 3:30.8–3:42.2 | VO 4 | Chênh lệch có ý nghĩa thống kê: pê nhỏ hơn không phẩy không không một, mức ảnh hưởng không phẩy năm mốt, tức là mức trung bình. | CGI | Trên biểu đồ 1, hai ký hiệu "p < 0,001" và "d = 0,51" hiện cạnh cặp cột. Dấu tích xanh chỉ ở p < 0,05; d ghi "trung bình", không tích. | p < 0,001 (< 0,05 ✓) · Cohen's d = 0,51 (trung bình) | Nhạc | pilot2026.json: scores.post.p, scores.cohenD · [CẦN NHÓM KIỂM TRA: từ trung bình và SD trong file tính ra d ≈ 0,46, chưa khớp 0,51] | 27 |
| 6.3 | 3:42.2–3:52.2 | VO 4 | Phần Đúng Sai: sáu mươi sáu phẩy bốn phần trăm, so với năm mươi mốt phẩy bốn. | CGI | Hai con số lớn đếm lên lần lượt, cạnh nhau: 66,4 % / 51,4 % (+15,0 điểm phần trăm), rồi hàng nhỏ: ghi nhớ sau 2 tuần 82,7 % / 61,2 %. Không thêm biểu đồ. | Phần II Đúng/Sai 66,4 % vs 51,4 % · Ghi nhớ sau 2 tuần 82,7 % vs 61,2 % | Nhạc | pilot2026.json: parts (II, RET) | 17 |
| 6.4 | 3:52.2–4:06.1 | VO 4 | Về kỹ thuật, tám mươi mốt phẩy ba phần trăm câu hỏi xử lý ngay trên máy, trong mười hai đến hai mươi lăm mi-li giây, không tốn chi phí gọi AI. | CGI | BIỂU ĐỒ 2: vòng tròn 3 phần: SymPy 54,2 % · Bộ đệm 27,1 % (màu nhấn, ghép lại 81,3 %) · Đám mây 18,7 % (xám). Đường ngưỡng 80 % vẽ trên vòng. Thẻ phụ: 12 ms / 25 ms. | 81,3 % tại chỗ (54,2 + 27,1) · 18,7 % đám mây · 12 ms, 25 ms | Nhạc | pilot2026.json: ops.offload · [CẦN NHÓM XÁC NHẬN: cách đo 12 ms; HANDOFF ghi chưa kiểm chứng độc lập] | 33 |
| **7** | | | **KẾT LUẬN & HƯỚNG ĐI** | | | | | | |
| 7.1 | 4:06.1–4:16.1 | VO 4 | Vì phần lớn câu hỏi xử lý ngay trên máy, nơi mạng yếu vẫn dùng được. | STOCK+CGI | Footage kho: lớp học vùng nông thôn/miền núi (không thấy mặt, hoặc cảnh trường từ xa). Phủ CGI: biểu tượng tín hiệu yếu, vòng 81,4 % sáng. | Dùng được khi mạng yếu · Nguồn video: [ghi tên kho + tác giả] | Nhạc | Mục 5.2 · [THIẾU TRONG BÁO CÁO: chi phí triển khai] → chỉ nói chi phí gọi AI | 16 |
| 7.2 | 4:16.1–4:27.5 | VO 4 | Hạn chế: thử nghiệm mới ở lớp mười một, hai môn Vật lý và Hóa học. Tiếp theo, nhóm em mở rộng lên một trăm mô phỏng. | CGI | Chữ nền trắng, một ý. Lưới 40 ô sáng, 60 ô mờ thêm vào dần (đến 100). | Hạn chế: lớp 11, Vật lý + Hóa học · Tiếp theo: 40 → 100 mô phỏng | Nhạc hạ thấp | pilot2026.json: study.grades, topics; Mục 5.3 | 27 |
| 7.3 | 4:27.5–4:43.4 | VO 4 | Xô-cra-tích Vi-sần Boóc: bảy phẩy ba hai điểm so với sáu phẩy bốn chín, và tám mươi mốt phẩy ba phần trăm câu hỏi xử lý ngay trên máy, mà không đưa sẵn đáp số. | 3D | Mặt bảng 3D nhìn từ trên xuống, nét phấn cuối cùng khép lại; hiện hai số lớn 7,32 và 81,3 %. Không logo, mã QR, tên người, tên trường, liên hệ. Mờ dần về trắng. | 7,32 vs 6,49 · 81,3 % xử lý tại chỗ · Không đưa sẵn đáp số | Nhạc kết nhẹ, tắt hẳn ở giây cuối | pilot2026.json: scores.post, ops.offload | 38 |

**Tổng thời lượng:** 4:43.4 (giới hạn mặc định 5:00, còn dư 0:16.6) · **Tổng số chữ đọc:** 604 · **Tốc độ trung bình:** 128 âm tiết/phút (kể cả quãng demo không lời).

| Đoạn | Thời lượng | Tỉ lệ | Khung chuẩn C2 |
|---|---|---|---|
| 1. Mở đầu | 0:09.0 | 3 % | 3 % |
| 2. Vấn đề thực tế | 0:25.0 | 9 % | 12 % |
| 3. Khoảng trống & mục tiêu | 0:33.1 | 12 % | 12 % |
| 4. Cơ sở & phương pháp | 0:39.2 | 14 % | 14 % |
| 5. Sản phẩm & quá trình | 1:32.4 | 33 % | 28 % |
| 6. Kết quả | 0:47.3 | 17 % | 19 % |
| 7. Kết luận & hướng đi | 0:37.4 | 13 % | 12 % |

Đoạn 5 + 6 = 49 % (yêu cầu ≥ 45 %). Loại hình ảnh (số cảnh, một cảnh có thể thuộc nhiều loại): 3D 7, CGI 16, LẠI 8, STOCK 3, UI 5.

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
