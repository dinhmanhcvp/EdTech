# Cẩm nang kiến thức: trả lời hay để Socratic Vision Board nổi bật

Dành cho học sinh THPT trong nhóm tác giả · bám mã nguồn `socratic-monorepo` (đọc ngày 17/11/2026) · bộ số liệu poster v4

## Đọc cái này trước

Giám khảo không chấm xem em thuộc bao nhiêu thuật toán. Họ chấm xem em có hiểu mình làm gì, và có trung thực không. Cẩm nang này giúp em làm ba việc:

- Trả lời các câu so sánh với bảng AI khác (iFLYTEK AI Board và các dự án KHKT cùng loại) mà không đua số lượng, không chê ai, và vẫn khiến sản phẩm của mình nổi bật.
- Giải thích được từng thuật toán bằng lời của mình: từ nét viết thành chữ, từ nét vẽ thành hình, từ công thức thành hình trực quan.
- Biết chỗ nào mình mạnh thật, chỗ nào chưa đo, để không bao giờ bị bắt bẻ.

### Ba nhãn cho mọi tuyên bố

| Nhãn | Nghĩa | Cách nói |
|---|---|---|
| **Đã đo** | Có số, có cách tái lập | "Chúng em đã đo được..." |
| **Chạy được** | Có trong mã, dùng được, chưa đo kỹ | "Hệ thống làm được..." |
| **Mục tiêu** | Thiết kế hoặc kế hoạch | "Hướng tiếp theo của chúng em là..." |

### Quy tắc về tên đối thủ

Phần 2 của cẩm nang gọi tên các sản phẩm khác để **các em hiểu rõ họ mạnh gì, yếu gì**. Phần đó là tài liệu nội bộ. Khi nói trước giám khảo:

- Không nêu tên dự án khác, không đọc số liệu của họ. Dùng cụm "các hệ thống bảng AI khác".
- Riêng iFLYTEK thì được nhắc, vì có trên poster và giám khảo hay hỏi.
- Nếu giám khảo tự nêu tên một dự án, công nhận điểm mạnh của họ trước, rồi mới nói phần của mình.
- Vì sao: nêu tên làm giám khảo so sánh theo khung của họ (số công cụ, phần cứng). Mình muốn họ so sánh theo khung của mình (bằng chứng học tập).

### Công thức trả lời hay: C - K - B

Mọi câu so sánh đều trả lời theo ba nhịp, tổng 20 đến 40 giây:

1. **C = Công nhận.** Nói một điểm mạnh thật của đối phương. Giám khảo quý người công bằng.
2. **K = Khác biệt.** Một câu duy nhất: "Chỗ em chọn khác là..."
3. **B = Bằng chứng.** Một con số hoặc một việc làm được trước mắt họ.

Ví dụ: "Dạ, bảng của họ rất mạnh ở phần cứng và trình chiếu (C). Em chọn hướng ngược lại: AI không giải hộ học sinh (K). Em có nhóm đối chứng 412 học sinh, 8 tuần, nhóm dùng hệ thống hơn 0,92 điểm (B)."

### Bộ số liệu duy nhất (poster v4, 16/11/2026)

Cả nhóm chỉ dùng bộ số này. Các số cũ (N = 86, d = 0,88, +1,32 điểm, 81,4%) thuộc bản cũ hoặc bộ thử, không dùng nữa.

| Số | Nghĩa | Nhãn |
|---|---|---|
| 412 học sinh, 18 giáo viên, 12 lớp, 3 trường, 8 tuần | Quy mô thực nghiệm (07/09 đến 31/10) | Đã đo |
| 208 thực nghiệm / 204 đối chứng | Mỗi trường 2 lớp mỗi nhóm; đề cùng ma trận, thi giấy, rọc phách, chấm mù | Đã đo |
| **+0,92 điểm** (thang 10) | Nhóm dùng hệ thống hơn đối chứng sau 8 tuần, đã hiệu chỉnh điểm trước và lớp; KTC 95%: 0,62 đến 1,22; p < 0,001; d = 0,51; n = 406 | Đã đo |
| +0,83 điểm | Chênh lệch chưa hiệu chỉnh | Đã đo |
| 81,3% (12.837 / 15.798) | Lượt tự học **không** gọi mô hình AI | Đã đo |
| 98,0% (1.504 / 1.535) | Yêu cầu xin đáp án bị chặn | Đã đo |
| 64,1% | Học sinh chép đáp án AI mà không kiểm tra lại (khảo sát 412 học sinh) | Đã đo |
| 4.041 phép thử | vitest 3.461 + pytest 580 (đếm 15/11) | Đã đo |
| Khoảng 350 đồng một tiết | Ngân sách trần chi phí AI | Tính theo công thức |

## Phần 1. Một câu, một phút, ba phút

**Một câu (khẩu hiệu):** "AI biến nét phấn thành mô phỏng, nhưng không bao giờ giải hộ học sinh."

**Một phút (kể như nói chuyện):**
> "Em hỏi thầy cô một câu: nếu học sinh gõ đề vào AI và hai giây sau có lời giải, thì mình vừa dạy em điều gì? Khảo sát 412 bạn của chúng em cho thấy 64,1% chép đáp án AI mà không kiểm tra lại. Sản phẩm của em đi hướng ngược: thầy cô viết lên bảng, khoanh một vùng, mô phỏng hiện ngay, chạy ngay trên máy. Học sinh hỏi bài thì gia sư chỉ hỏi gợi mở, còn đúng sai do toán thật phán. Em đã thử 8 tuần với 412 bạn có nhóm đối chứng: nhóm dùng hệ thống hơn 0,92 điểm."

**Ba phút:** thêm ba ý, theo thứ tự này: (1) AI là *trình biên dịch*, không phải máy vẽ, nên hình luôn đúng phương trình; (2) bốn tầng gia sư, tầng nhẹ trước, AI sau cùng; (3) vì sao tin được: nhóm đối chứng, chấm mù, và giới hạn tự nói ra.

## Phần 2. Bản đồ đối thủ (nội bộ, không đọc trên sân khấu)

### 2.1 Họ là ai, mình biết về họ từ đâu

| | iFLYTEK AI Board | Dự án KHKT khung hồng ngoại (BC178.08, Phú Thọ) | Socratic Vision Board |
|---|---|---|---|
| Hướng | Sản phẩm thương mại, phần cứng + phần mềm đóng | Khung cảm ứng hồng ngoại gắn vào bảng phấn + web | Web chạy trên bảng thường, không cần phần cứng riêng |
| Nguồn em biết | 4 video demo, README các kho mã mở của hãng (chỉ đọc mô tả, chưa dùng thử) | Đọc báo cáo PDF 16 trang | Mã của chính mình |
| Mạnh thật | Nói - viết - chạm tự nhiên; nhận khối 3D, cắt thiết diện, "extend" tách thiết diện; giáo viên ảo; quan sát lớp bằng camera | Giữ được nét phấn thật; 374 công cụ, 12 nhóm môn; AI điều khiển được 18 công cụ; phòng kiểm tra QR có 12 loại cờ bất thường; **bảng đo 9 tác vụ**; **đo lỗi nhận dạng công thức 4,7% xuống 2,1% trên 1.260 mẫu** | Gia sư không giải hộ; có đối chứng 412 học sinh; nhận dạng chạy trên máy; nhớ từng kỹ năng bằng BKT |
| Dừng ở đâu | Phần cứng riêng, dữ liệu qua đám mây hãng; **chưa thấy** số đo hiệu quả học tập được công bố | Trợ giảng AI **giải** và đọc to lời giải; tự ghi chưa có nhóm đối chứng; tập kiểm thử chưa có ảnh bảng thật | Chưa có tài khoản, lưu trữ bền vững, kiểm thử tải; độ đúng nhận dạng mới là ước tính nội bộ |

**Cách nói đúng về nguồn:** "Đây là nhận định từ tài liệu công khai và video, không phải em đã dùng thử sản phẩm của họ."

### 2.2 So sánh theo thuật toán (để hiểu, không để khoe)

| Việc | Họ làm | Mình làm | Ai hơn ở đâu |
|---|---|---|---|
| Chữ viết tay thành công thức | Mô hình thị giác tinh chỉnh (8.400 cặp ảnh - LaTeX), chạy trên đám mây, khoảng 1,4 giây một lần; 89% công thức dùng được ngay | So khớp mẫu + ngữ pháp 2D, chạy trên trình duyệt, vài chục mili-giây, ngoại tuyến; top-1 ước tính nội bộ 85 đến 89% | Họ hơn ở chỗ **có số đo công khai trên 1.260 mẫu**. Mình hơn ở tốc độ, ngoại tuyến, giải thích được từng bước. Mình **thiếu** bộ kiểm thử độc lập |
| Nét vẽ thành hình | Đếm đỉnh, kiểm độ thẳng, so tỉ lệ cạnh, sai số so với đường tròn; đo 60 ms; kiểm thử 90 mẫu hình phẳng | Đơn giản hóa Douglas-Peucker, dựng đồ thị đỉnh - cạnh, đối chiếu cấu trúc với từng khối; ước lượng tỉ lệ cạnh từ nhóm cạnh song song | Hai bên cùng hướng. Mình nhận cả khối 3D từ nét vẽ tay một nét liền; họ có bảng đo ghi rõ |
| Công thức thành đồ thị | Nhập hàm, đồ thị hiện 45 ms | Trình phân tích riêng, lấy mẫu mỗi pixel, đường cong ẩn bằng marching squares, tìm nghiệm / cực trị / giao điểm, thanh trượt tham số tự sinh | Ngang nhau về hiệu quả; mình giải thích được cơ chế |
| Trợ giảng AI | Giải, giải thích, ra bài tương tự, đọc to; 2,4 giây | Bốn tầng, gia sư chỉ hỏi | **Khác triết lý**, không phải hơn kém |
| Phòng kiểm tra | QR, 12 loại cờ, đề đã lọc đáp án, chấm ở máy chủ | Có lọc đáp án phía máy chủ, phát hiện chuyển tab | Họ đầy đủ hơn |

### 2.3 Ba chỗ mình phải tự nhận là yếu hơn

Nói trước thì thành điểm cộng, bị hỏi mới nói thì thành điểm trừ.

1. **Bộ kiểm thử nhận dạng độc lập.** Họ công bố 1.260 mẫu kiểm thử và tỉ lệ lỗi. Mình mới có ước tính 85 đến 89%. Nói: "Đó là việc em sẽ làm tiếp: tập mẫu viết tay nhiều bạn, tách hẳn khỏi kho mẫu."
2. **Phần cứng giữ phấn thật.** Họ có khung hồng ngoại. Mình dùng bảng cảm ứng có sẵn. Nói: "Em chọn không đòi mua thêm phần cứng; nhà trường nào cũng bắt đầu được."
3. **Quy mô công cụ.** Họ 374 công cụ. Đừng đua. Nói: "Số công cụ đo khả năng hiển thị. Em đo số bước học sinh tự đi được."

## Phần 3. Từ nét viết thành chữ và công thức

Bộ nhận dạng nằm ở `apps/teacher-board/src/utils/inkRecognizer.ts`, kho mẫu `inkGlyphs.json` (1.047 mẫu ký tự, đếm từ tệp). Chạy trên trình duyệt, không gọi AI.

### 3.1 Bức tranh một lần nhìn

Giáo viên viết `y = x² − 3`. Máy đi qua 7 bước:

```
nét thô -> làm sạch -> gom nét thành ký hiệu -> chuẩn hóa ký hiệu
        -> lọc nhanh -> so kỹ -> dựng cây công thức -> LaTeX -> kiểm tra ý nghĩa
```

Hình dung như một bài thi tin học: dữ liệu vào là các điểm tọa độ, thuật toán là sơ đồ khối, đầu ra là một chuỗi LaTeX.

### 3.2 Từng bước, nói cho bạn cùng lớp hiểu

**Bước 1. Làm sạch.** Màn hình vẽ 60 lần một giây nhưng cảm ứng báo nhanh hơn, nên lấy cả các điểm "nằm giữa hai khung hình" (`getCoalescedEvents`) để nét không gãy góc. Khi vừa có nét bút, mọi chạm bằng da trong 1.500 mili-giây bị bỏ, đó là chống tì tay. Rồi lọc rung: một điểm mới chỉ nhận khi cách điểm trước một bước tối thiểu.

```
minStep = max( 0,012 × (độ dài nét / số khoảng), 0,15 )
```

Ý nghĩa: ngưỡng tỉ lệ theo độ dài trung bình mỗi bước, nên chữ to hay nhỏ đều lọc đúng.

**Bước 2. Gom nét: bạn nào chung nhóm?** Chữ `x` là hai nét, dấu `=` là hai nét. Nếu đọc từng nét, `=` thành hai dấu trừ. Mỗi nét là một đỉnh, hai nét thuộc cùng ký hiệu thì "hợp" lại bằng **Disjoint Set Union** (Union-Find, có nén đường đi). Đây chính là cấu trúc dữ liệu em gặp trong tin học thi đấu.

Luật gom dấu bằng: hai nét **dẹt** (cao dưới 0,28 bề rộng), chồng nhau theo chiều ngang hơn 60%, rộng tương đương (tỉ lệ dưới 1,8), cách nhau theo chiều dọc dưới 0,55 chiều cao chữ. Luật gom chữ x hay dấu +: hai nét **cắt nhau**, kiểm bằng tích có hướng, đúng bài "hai đoạn thẳng có cắt nhau không".

Mọi ngưỡng đều chia cho **chiều cao chữ tham chiếu** (lấy từ phân vị 0,7 của chiều cao các nét), nhờ vậy viết chữ to hay nhỏ thuật toán không đổi.

**Bước 3. Chuẩn hóa: đưa mọi chữ về cùng "khổ giấy".**

- **Nắn nghiêng.** Ước lượng độ nghiêng k từ các đoạn gần thẳng đứng, rồi áp phép biến đổi cắt (shear): `x' = x − k·(y − y_tâm)`. Ví dụ k = 0,2, một điểm cao hơn tâm 1 đơn vị lệch phải 0,2, sau nắn còn x' = x − 0,2. Nét ngang như gạch của chữ t không bị méo.
- **Lấy đúng 32 điểm cách đều theo độ dài cung.** Viết nhanh hay chậm đều ra cùng một đám điểm (viết chậm điểm dày, viết nhanh điểm thưa).
- **Về khung đơn vị.** Dời tâm về gốc, chia cho cạnh dài nhất (giữ tỉ lệ chữ hẹp, chữ rộng), đảo trục y cho đúng hệ trục toán học.

**Bước 4. Lọc nhanh.** So kỹ với 1.047 mẫu thì chậm. Nên trước hết chiếu đám điểm lên lưới 6 × 6 (ô nào có điểm thì bằng 1), đếm số ô khác với từng mẫu, cộng phạt nhỏ nếu tỉ lệ rộng/cao lệch nhiều. Chỉ giữ **160 mẫu** điểm thấp nhất.

**Bước 5. So kỹ bằng khoảng cách Chamfer hai chiều.**

```
D(Q,T) = trung bình[ khoảng cách từ mỗi điểm Q tới điểm gần nhất của T ]
       + trung bình[ khoảng cách từ mỗi điểm T tới điểm gần nhất của Q ]
```

Hình dung: đặt tờ giấy bóng kính (nét học sinh) lên mẫu chữ.

- Vế đầu hỏi: **nét em viết có nằm trên mẫu không?**
- Vế sau hỏi: **mẫu có bị em bỏ sót nét nào không?**

Tính thử, đây là bài tập 1 của em. Nét em viết là vạch đứng gồm 3 điểm (0,0), (0,1), (0,2). Mẫu là chữ L gồm 5 điểm (0,0), (0,1), (0,2), (1,0), (2,0). Vế đầu: cả 3 điểm đều nằm đúng trên mẫu nên bằng **0**. Nếu chỉ có vế đầu, vạch đứng "khớp hoàn hảo" với chữ L, sai! Vế sau: hai điểm (1,0), (2,0) của mẫu cách vạch lần lượt 1 và 2, nên trung bình (0+0+0+1+2)/5 = **0,6**. Có vế sau, hệ thống biết em thiếu nét ngang.

Mỗi ký hiệu được thử thêm hai góc xoay ±0,12 rad (khoảng ±7°), lấy chi phí nhỏ nhất, để không bắt em cầm bút vuông tuyệt đối. Vòng tính **dừng sớm** khi chi phí đã vượt mẫu tốt nhất hiện có. Có thêm luật riêng cho các chữ dễ nhầm, ví dụ a, d, q phân biệt bằng vị trí thân đứng so với vòng tròn.

**Bước 6. Dựng cây công thức: toán học là cái cây, không phải chuỗi chữ.** Hàm `buildLevel` đi đệ quy từ ngoài vào trong:

- **Căn:** nhận nét hình chữ V có đuôi vút lên, lấy các ký hiệu nằm trong căn rồi gọi đệ quy.
- **Phân số:** thanh ngang dài nhất xử lý trước; phần trên là tử, phần dưới là mẫu. Thiếu tử hoặc mẫu thì thanh ngang chỉ là dấu trừ.
- **Số mũ, chỉ số dưới:** so đáy của ký hiệu với "đường cơ sở" của ký hiệu đứng trước. Cao hơn rõ rệt và nhỏ hơn: số mũ. Thấp hơn: chỉ số dưới.

Với `y = x² − 3`: chữ `2` cao hơn đường cơ sở của `x` và nhỏ hơn, nên thành số mũ. Dấu `−` không có gì phía trên hay dưới, nên vẫn là dấu trừ. Cây ra: `y`, `=`, `x` mũ `2`, `−`, `3`.

**Bước 7. Kiểm tra ý nghĩa.** Chọn ứng viên bằng chi phí cộng ngữ cảnh: biến hay gặp (x, y, z, a, b, c, n) được thưởng nhẹ, ký hiệu hiếm bị phạt nhẹ, hai toán tử liền nhau bị phạt nặng. Rồi sửa lỗi quen (`v0` thành `v₀`), và thử biên dịch biểu thức: nếu ra được thì cộng điểm tin cậy. Chỗ nào chưa chắc (Z hay 2, n hay π, l hay 1), hiện **chip đổi một chạm** ngay dưới công thức. Đây là triết lý "thiết kế không dựa vào luôn đúng, mà dựa vào sửa nhanh".

### 3.3 Hỏi - đáp nhanh về nhận dạng chữ
Các câu hỏi và gợi ý trả lời của mục này nằm ở hai tệp riêng: `CAM_NANG_CAU_HOI.md` và `CAM_NANG_GOI_Y_TRA_LOI.md`.

## Phần 4. Từ nét vẽ thành hình (phẳng và khối)

Mã: `apps/teacher-board/src/utils/sketchSolid.ts`. Không dùng AI; chỉ trả kết quả khi cấu trúc khớp rõ ràng, còn lại trả `null` để hệ thống quay về nhận dạng chữ.

### 4.1 Đường đi của một khối lập phương vẽ tay

```
các nét -> đơn giản hóa Douglas-Peucker -> đoạn thẳng
        -> gộp đầu mút gần nhau thành đỉnh (Union-Find, bán kính 0,088 D)
        -> đồ thị: V đỉnh, E cạnh
        -> đối chiếu cấu trúc với từng loại khối
        -> ước lượng tỉ lệ cạnh từ các nhóm cạnh song song
```

(D là đường chéo hộp bao của cả hình, nên mọi ngưỡng đều theo cỡ hình vẽ.)

**Douglas-Peucker.** Nét tay là hàng trăm điểm lộn xộn nhưng người vẽ chỉ định vẽ vài đoạn thẳng. Nối đầu - cuối, tìm điểm xa nhất đường nối; nếu xa hơn ngưỡng ε thì giữ điểm đó và chia đôi nét, lặp lại. Ngưỡng ε = 0,035 D. Hình dung: kéo căng một sợi dây giữa hai đầu nét, chỗ nào nét phồng ra xa dây thì đó là một góc.

**Nét cong thì dừng.** Nếu một nét còn quá nhiều đoạn ngắn sau đơn giản hóa (hơn 9 đoạn, mỗi đoạn dưới 0,1 D), nó là đường cong, không phải đa diện, hàm trả `null`.

**Gộp đỉnh.** Các đầu mút cách nhau dưới 0,088 D được coi là cùng một đỉnh. Có thêm bước nối chữ T (đầu nét chạm giữa một cạnh khác).

**Nhận khối bằng cách đếm.** Với đồ thị đã có V đỉnh, E cạnh, bậc từng đỉnh, và số đỉnh nằm trong bao lồi:

| Khối | Điều kiện cấu trúc (trong mã) |
|---|---|
| Hộp / lập phương | V = 8 và E từ 10 đến 14; hoặc V = 7 (chỉ vẽ 3 mặt nhìn thấy: 6 đỉnh bao lồi + 1 đỉnh trong nối 3 cạnh); hoặc V từ 7 đến 9 với cạnh song song |
| Chóp tứ giác S.ABCD | V = 5, E từ 6 đến 9, có đỉnh bậc 3 trở lên |
| Bát diện | V = 6, E từ 10 đến 13, đa số đỉnh bậc ≥ 3 |
| Lăng trụ tam giác | V = 6, E từ 7 đến 10 |
| Tứ diện | V = 4, E = 5 hoặc 6 |

Độ tin cậy cao nhất (0,94) khi đúng V = 8, E = 12 (lập phương đủ nét khuất). Nếu ít hơn 4 nét thì chỉ nhận khi độ tin cậy ≥ 0,9, để chữ viết liền không bị tưởng là khối.

**Cube hay hộp? Số đo lấy từ đâu?** Gom các cạnh theo góc (modulo π, sai số 13°) thành ba nhóm song song. Nếu hai nhóm gần như nằm ngang và thẳng đứng, nhóm còn lại xiên, đó là hình chiếu xiên kiểu "cabinet", mã chia độ dài chiều sâu cho 0,6 để bù độ rút ngắn. Tỉ lệ cạnh dài nhất / ngắn nhất dưới 1,55 (hình chiếu xiên) hoặc dưới 2,4 (xoay tùy ý) thì là lập phương; không thì là hộp, kích thước chuẩn hóa để cạnh dài nhất bằng 3 và giới hạn trong khoảng 1 đến 5.

### 4.2 Hình phẳng: tam giác, tứ giác, đa giác

Hàm `detectPlaneShapeFromStrokes` (1 đến 4 nét): dùng cùng đồ thị, yêu cầu **mọi đỉnh bậc đúng 2** (chu trình khép kín), sắp xếp đỉnh theo góc quanh trọng tâm, tính cạnh và góc trong bằng tích vô hướng. Tam giác phân loại: đều nếu ba cạnh chênh dưới 14% và mọi góc sai 60° không quá 12°; vuông nếu có góc lệch 90° không quá 11°; cân nếu hai cạnh chênh dưới 13%. Hình quá dẹt (có góc dưới 18° hoặc trên 162°) bị loại.

### 4.3 Hỏi - đáp về nhận dạng hình
Các câu hỏi và gợi ý trả lời của mục này nằm ở hai tệp riêng: `CAM_NANG_CAU_HOI.md` và `CAM_NANG_GOI_Y_TRA_LOI.md`.

## Phần 5. Từ công thức thành hình trực quan

Đây là phần "AI là trình biên dịch": chữ viết thành LaTeX, LaTeX thành cây biểu thức, cây biểu thức thành hàm số chạy được, hàm số thành hình. Không bước nào để AI vẽ.

### 5.1 Từ LaTeX thành hàm chạy được (`mathExpr.ts`)

```
"y = A sin(ωx)"
   -> chuẩn hóa (LaTeX, chữ Hy Lạp, mũ ², dấu ngoặc)
   -> tách từ (số, tên biến, hàm, toán tử)
   -> phân tích cú pháp đệ quy (recursive descent) -> cây biểu thức (AST)
   -> biên dịch cây thành một hàm JavaScript
```

Trình phân tích cú pháp xử lý theo bậc ưu tiên: cộng trừ thấp nhất (`expr`), nhân chia (`term`), dấu âm (`unary`), lũy thừa (`power`), nguyên tử (số, biến, hàm, ngoặc). Mỗi bậc là một hàm gọi bậc cao hơn, đúng kiểu "hạ thấp ưu tiên" trong giáo trình biên dịch. Điều làm cho nó dùng được với học sinh: nhân ngầm (`2x`, `3(x+1)`, `(x+1)(x−1)`), `sin²x` hiểu là `(sin x)²`, `|x|` là trị tuyệt đối, `tg`, `cotg` kiểu Việt Nam.

**Phương trình thành loại hình nào?** `parseEquation` chia theo dấu `=`:

- Vế trái là `y`, `f(x)`... và vế phải không chứa `y` → **hàm hiện** `y = f(x)`: vẽ bằng lấy mẫu.
- Còn lại → **đường cong ẩn** `F(x,y) = G(x,y)`, đưa về `F − G = 0`: vẽ bằng marching squares. Ví dụ `x² + y² = 4` là đường tròn.
- Không có dấu `=` → biểu thức; dùng để tính hoặc vẽ như hàm.

### 5.2 Từ hàm thành đồ thị (`graphModel.ts`)

**Lấy mẫu hàm hiện.** Lấy khoảng một mẫu mỗi pixel theo chiều ngang (tối thiểu 120 mẫu). Nối các mẫu liền kề. Hai trường hợp đặc biệt:

- Giá trị không xác định (ví dụ căn của số âm): ngắt nét.
- Hai mẫu liền kề **nhảy rất xa và trái dấu** (lớn hơn 1,5 lần chiều cao khung): đó là tiệm cận đứng như `tan x`, `1/x`, nên ngắt nét, không nối vạch dọc xấu xí.

**Đường cong ẩn bằng marching squares.** Chia khung thành ô lưới 6 pixel, tính F tại bốn góc mỗi ô. Nếu hai góc kề nhau trái dấu thì đường cong cắt cạnh đó; điểm cắt lấy bằng nội suy tuyến tính. Ví dụ F ở hai đầu cạnh dài 1 là −1 và +3: điểm cắt cách đầu trái `1 × 1/(1+3) = 0,25`. Nối các điểm cắt trong mỗi ô thành đoạn thẳng, ghép các ô lại thành đường cong. Bài tập: với đường tròn x² + y² = 4, vì sao các ô nằm hẳn trong hay hẳn ngoài đường tròn không sinh đoạn nào? (Bốn góc cùng dấu.)

**Nghiệm, giao điểm, cực trị, tích phân** (`mathExpr.ts`), đều là số học, không đại số ký hiệu:

- **Nghiệm:** quét 600 mẫu, nơi nào đổi dấu thì **chia đôi** 60 lần trong đoạn đó. Loại nghiệm giả ở chỗ gián đoạn (tại đó |f| vẫn lớn).
- **Giao điểm hai đồ thị:** tìm nghiệm của f − g.
- **Cực trị:** nghiệm của đạo hàm (đạo hàm số bằng hiệu hai phía), rồi xét dấu đạo hàm bậc hai để biết cực đại hay cực tiểu.
- **Tích phân:** quy tắc Simpson.

**Thanh trượt tham số tự sinh.** Mọi tên biến trong hàm mà không phải `x`, `y`, `π`, `e` là **tham số tự do**. Ví dụ `y = A sin x` có tham số `A`, `y = sin(ωx + φ)` có `ω` và `φ`. Hệ thống tự tạo thanh trượt, giá trị mặc định và khoảng theo vai trò (tần số góc 0,2 đến 6, các góc −3,14 đến 3,14, hệ số a, k từ −5 đến 5). Kéo thanh trượt thì chỉ tính lại hàm, không gọi mạng.

### 5.3 Hình học không gian: từ khối thành thiết diện và khai triển (`solids.ts`, `netUnfold.ts`)

**Thiết diện.** Mặt phẳng cắt có phương trình `n·r = d`. Với mỗi cạnh nối hai đỉnh A, B của khối, tính `dA = n·A − d` và `dB = n·B − d`. Hai đỉnh nằm hai phía mặt phẳng (dA và dB trái dấu) thì cạnh bị cắt tại điểm có `t = dA/(dA − dB)` tính từ A. Gom các giao điểm của mọi cạnh, bỏ điểm trùng, sắp xếp theo góc quanh trọng tâm, ta có đa giác thiết diện, rồi tính cạnh, góc, diện tích. Ví dụ kiểm tra tại nhà: cắt hình lập phương cạnh 1 bằng mặt phẳng `x + y + z = 1,5` cho lục giác đều cạnh √2/2, diện tích 3√3/2 × 1/2 ≈ 1,299.

**Khai triển lưới.** Các mặt của khối tạo thành một cây (mặt đáy là gốc, hai mặt kề nhau là cha - con theo cạnh chung). Tham số t từ 0 (khối) đến 1 (lưới phẳng): mỗi mặt quay quanh cạnh chung với mặt cha một góc t·θ. Vì phép quay lồng nhau theo cây nên hình luôn liền khối, và độ dài cạnh được bảo toàn khi gấp mở.

### 5.4 Vật lí: ba loại mô hình

| Loại | Ví dụ | Cách tính |
|---|---|---|
| Có công thức đóng | Ném xiên, giao thoa sóng, giản đồ Fresnel | Thay tham số vào công thức SGK |
| Không có công thức đẹp | Con lắc kép, hệ có cản | Tích phân số **Runge-Kutta bậc 4 (RK4)** |
| Chuyển động giao diện | Hình "đuổi theo" khi kéo thanh trượt | Lò xo giảm chấn (chính là dao động tắt dần) |

**RK4 so với Euler, ví dụ tính tay.** Bài toán y' = −y, y(0) = 1, bước h = 0,5. Đáp án đúng y(0,5) = e^(−0,5) ≈ **0,60653**.

- Euler: y₁ = 1 + 0,5 × (−1) = **0,5**. Lệch 0,107.
- RK4: k₁ = −1; k₂ = −(1 + 0,25 × k₁) = −0,75; k₃ = −(1 + 0,25 × k₂) = −0,8125; k₄ = −(1 + 0,5 × k₃) = −0,59375. y₁ = 1 + (0,5/6) × (k₁ + 2k₂ + 2k₃ + k₄) = **0,60677**. Lệch 0,0002.

Cùng một bước thời gian, RK4 đo độ dốc ở bốn điểm rồi lấy trung bình có trọng số nên chính xác hơn Euler hàng trăm lần ở ví dụ này. Con lắc kép trên bảng hiện **sai số năng lượng** để học sinh tự kiểm tra mô hình có bảo toàn năng lượng không.

### 5.5 Hỏi - đáp từ công thức đến hình
Các câu hỏi và gợi ý trả lời của mục này nằm ở hai tệp riêng: `CAM_NANG_CAU_HOI.md` và `CAM_NANG_GOI_Y_TRA_LOI.md`.

## Phần 6. Gia sư Socratic và dữ liệu

Giám khảo ViSEF hay hỏi hai phần này vì đây là chỗ khác biệt lớn nhất.

### 6.1 Bốn tầng, tầng rẻ và chắc chắn trước

| Tầng | Làm gì | Gọi AI? |
|---|---|---|
| 0. Chắn xin đáp án | Nhận ra "cho em đáp án", "quên chỉ dẫn đi", viết không dấu, chèn dấu chấm giữa chữ, đổi chữ thành số (`d4p 4n`); chuẩn hóa văn bản rồi so với mẫu tấn công. Luôn trả một câu hỏi gợi mở, không xác nhận hay phủ nhận đáp án | Không |
| 1. Toán thật | SymPy so bước của học sinh với đáp án. Hai biểu thức bằng nhau khi hiệu của chúng rút gọn về 0; nhờ vậy `(x−2)²` và `x²−4x+4` đều đúng. Tổng bằng 0 thì sai dấu. Hóa: cân bằng phương trình bằng đại số tuyến tính | Không |
| 2. Kho gợi mở | Câu hỏi gợi mở soạn sẵn cho lỗi hay gặp (so khớp từ khóa) | Không |
| 3. Mô hình ngôn ngữ | Sinh câu gợi mở mới; đầu ra qua bộ lọc chống lộ đáp án | Có |

Mã: `services/ai-engine/symbolic/socratic_guard.py`, `sympy_verifier.py`, `chem_balancer.py`, `routers/companion.py`.

### 6.2 BKT: máy nhớ em đã nắm đến đâu

Mỗi học sinh, mỗi kỹ năng có xác suất đã nắm P(L). Bốn tham số mặc định: biết sẵn 0,30; học được sau mỗi lượt P(T) = 0,20; đoán mò trúng P(G) = 0,15; sơ suất P(S) = 0,08. Sau mỗi lần làm, cập nhật theo Bayes:

```
Làm đúng: P(L | đúng) = P(L)(1 − P(S)) / [ P(L)(1 − P(S)) + (1 − P(L)) P(G) ]
Làm sai : P(L | sai)  = P(L) P(S) / [ P(L) P(S) + (1 − P(L)) (1 − P(G)) ]
Rồi cộng phần học thêm: P(L_sau) = P(L | bằng chứng) + (1 − P(L | bằng chứng)) × P(T)
```

Tính tay: P(L) = 0,30, làm đúng. Tử số 0,30 × 0,92 = 0,276; mẫu số 0,276 + 0,70 × 0,15 = 0,381; P(L | đúng) ≈ 0,724. Cộng học thêm: 0,724 + 0,276 × 0,20 ≈ **0,78**. Từ 0,85 trở lên coi là đã nắm.

### 6.3 Hỏi - đáp
Các câu hỏi và gợi ý trả lời của mục này nằm ở hai tệp riêng: `CAM_NANG_CAU_HOI.md` và `CAM_NANG_GOI_Y_TRA_LOI.md`.

## Phần 7. Thống kê và thiết kế thí nghiệm

Các câu hỏi và gợi ý trả lời của mục này nằm ở hai tệp riêng: `CAM_NANG_CAU_HOI.md` và `CAM_NANG_GOI_Y_TRA_LOI.md`.

## Phần 8. Câu hỏi so sánh: bộ trả lời mẫu (dùng C - K - B)

Các câu hỏi và gợi ý trả lời của mục này nằm ở hai tệp riêng: `CAM_NANG_CAU_HOI.md` và `CAM_NANG_GOI_Y_TRA_LOI.md`.

## Phần 9. Bài tập tự kiểm (làm giấy, không máy tính)

Làm được cả 6 bài là đủ vững để trả lời mọi câu hỏi thuật toán.

1. **Chamfer.** Nét học sinh có 3 điểm (0,0), (1,0), (2,0). Mẫu là chữ T gồm 5 điểm (0,0), (1,0), (2,0), (1,1), (1,2). Tính hai vế. (Đáp án: vế đầu 0; vế sau (0+0+0+1+2)/5 = 0,6. Vì sao vế sau bắt được thiếu thanh đứng?)
2. **Nắn nghiêng.** Hệ số nghiêng k = 0,25, điểm cách tâm theo trục đứng 2 đơn vị và x = 3. Tính x'. (Đáp án: 3 − 0,25 × 2 = 2,5.)
3. **Marching squares.** F tại bốn góc ô vuông cạnh 1 là F(0,0) = −2, F(1,0) = 2, F(1,1) = 2, F(0,1) = −2. Tìm hai điểm cắt. (Đáp án: cạnh dưới tại x = 0,5; cạnh trên tại x = 0,5; đường cong là đoạn thẳng đứng x = 0,5.)
4. **Thiết diện.** Mặt phẳng z = 1 cắt cạnh từ A(0,0,0) đến B(0,0,3). Tính t và giao điểm. (Đáp án: dA = −1, dB = 2; t = −1/(−1−2) = 1/3; giao điểm (0,0,1).)
5. **RK4.** Làm lại ví dụ y' = −y nhưng h = 1. Euler cho bao nhiêu, RK4 cho bao nhiêu, đáp án đúng e⁻¹ = 0,3679? (Đáp án: Euler 0; RK4: k₁ = −1, k₂ = −0,5, k₃ = −0,75, k₄ = −0,25; y₁ = 1 + (1/6)(−1 − 1 − 1,5 − 0,25) = 0,375.)
6. **BKT.** P(L) = 0,50, học sinh làm sai. Dùng P(S) = 0,08, P(G) = 0,15, P(T) = 0,20. Tính P(L | sai) và P(L sau). (Đáp án: P(L | sai) = 0,5 × 0,08 / (0,5 × 0,08 + 0,5 × 0,85) = 0,04/0,465 ≈ 0,086; sau cộng học thêm 0,086 + 0,914 × 0,2 ≈ 0,269.)

## Phần 10. Những điều tuyệt đối đừng nói

| Đừng nói | Vì sao | Nói thế nào |
|---|---|---|
| "Nhận dạng đúng 100%" hoặc "đúng 95%" | Mới có ước tính nội bộ 85 đến 89% | "Khoảng 85 đến 89% theo ước tính nội bộ; thiết kế dựa vào sửa nhanh" |
| "Đọc được tiếng Việt ngoại tuyến" | Chữ tiếng Việt đi qua AI đám mây | "Ký hiệu toán đọc trên máy; tiếng Việt cần mạng" |
| "Em dùng thuật toán $1 Unistroke" | Chú thích trong mã ghi thế nhưng mã chỉ làm tròn và đoạn thẳng | "Hình đơn giản em nhận bằng luật hình học; khối bằng đồ thị đỉnh - cạnh" |
| "Ảnh gửi lên là WebP dưới 15 KB" | Mã hiện xuất PNG | Chỉ nói "ảnh nét được cắt khít, nền sạch" |
| "Em tự huấn luyện mạng nơ-ron" | Không đúng | "So khớp mẫu và luật, giải thích được" |
| "Mô phỏng chính xác như phần mềm chuyên ngành" | Là mô hình giáo dục đơn giản hóa | "Mô hình giáo dục; có hiện sai số năng lượng" |
| "Chịu được 300 lớp cùng lúc" | Mới là số cấu hình, chưa kiểm thử tải | "Đã chạy thử trong lớp; chưa kiểm thử tải" |
| "SymPy đúng 100%" | Phạm vi hẹp | "300/300 trên bộ thử đa thức, phân thức, lượng giác" |
| "Hơn họ vì nhiều tính năng hơn" | Mình thua ở số lượng | "Khác bài toán: học sinh có tự nghĩ ra không" |
| Chê đối thủ | Mất điểm | Công nhận điểm mạnh trước |

## Phụ lục A. Bản đồ mã nguồn để nói "em tự làm"

| Việc | Tệp (trong `socratic-monorepo`) |
|---|---|
| Thu nét, chống tì tay | `apps/teacher-board/src/components/canvas/SmartboardCanvas.tsx` |
| Nhận dạng chữ, công thức (gom nét, Chamfer, cây 2D) | `apps/teacher-board/src/utils/inkRecognizer.ts`, `inkGlyphs.json` |
| Chip đổi một chạm | `utils/ocrConfusions.ts` |
| Nét thành khối, hình phẳng | `utils/sketchSolid.ts` |
| Hình đơn giản (đoạn, tròn) | `utils/shapeRecognizer.ts` |
| Phân tích biểu thức, nghiệm, tích phân | `utils/mathExpr.ts` |
| Đồ thị, lấy mẫu, marching squares | `utils/graphModel.ts`, `engines/GraphEngine.tsx` |
| Định tuyến nét khoanh thành mô phỏng | `utils/localRouter.ts`, `utils/lassoIntent.ts` |
| Thiết diện, khai triển | `utils/solids.ts`, `utils/netUnfold.ts` |
| RK4, mô hình vật lí | `utils/physicsModels.ts`, `engines/PhysEngines.tsx` |
| Gia sư bốn tầng | `services/ai-engine/routers/companion.py`, `symbolic/` |
| BKT | `apps/student-app/src/utils/bktEngine.ts` |
| Phòng học, QR | `services/ai-engine/routers/classroom_ws.py` |
| Cử chỉ tay phòng thực hành | `utils/lab/hands/handTracker.ts` |

## Phụ lục B. Việc cần làm trước ngày thi

- [ ] Xác nhận với thầy: cách chia nhóm thực nghiệm (ngẫu nhiên theo lớp hay không) và ai ra đề.
- [ ] Xác nhận nguồn gốc các số 12.837/15.798 và 1.504/1.535 (bảng nhật ký nào).
- [ ] Quyết định sửa chú thích `$1 Unistroke` trong `shapeRecognizer.ts` (hiện không khớp mã); sửa hay gỡ phần quảng cáo trong tài liệu.
- [ ] Làm bộ kiểm thử độc lập cho nhận dạng chữ: ít nhất 300 mẫu từ các bạn không có mặt trong kho 1.047 mẫu, báo tỉ lệ lỗi ký tự. Đây là cách đáp lại bảng số đo của các đối thủ.
- [ ] Mỗi bạn tập nói câu 44 (đóng góp riêng) và ba câu thuật toán mình phụ trách.
- [ ] Demo bằng biến `z`, `k`, có video quay sẵn.
- [ ] Thử phòng thực hành tay trên đúng camera thi, nếu không thì chỉ nhắc là nguyên mẫu.

## Phụ lục C. Bảng thuật ngữ

| Từ | Một câu |
|---|---|
| AST | Cây biểu thức: phép cộng có hai nhánh là hai vế |
| BKT | Xác suất đã nắm kỹ năng, cập nhật bằng công thức Bayes |
| Chamfer | Độ lệch trung bình giữa hai đám điểm, đo cả hai chiều |
| Douglas-Peucker | Giữ lại vài điểm "góc" của một nét, bỏ điểm thừa |
| DSU / Union-Find | Gom phần tử vào nhóm, gần như tuyến tính |
| Marching squares | Vẽ đường F(x,y) = 0 bằng cách xét dấu ở bốn góc mỗi ô lưới |
| Recursive descent | Cách viết trình phân tích cú pháp, mỗi mức ưu tiên là một hàm |
| RK4 | Runge-Kutta bậc 4: đo độ dốc 4 lần mỗi bước để tích phân số |
| Shear | Phép biến đổi làm nghiêng hình theo một phương |
| KTC 95% | Khoảng mà giá trị thật nằm trong đó với độ tin cậy 95% |
| Cohen's d | Chênh lệch hai nhóm chia cho độ lệch chuẩn gộp |
