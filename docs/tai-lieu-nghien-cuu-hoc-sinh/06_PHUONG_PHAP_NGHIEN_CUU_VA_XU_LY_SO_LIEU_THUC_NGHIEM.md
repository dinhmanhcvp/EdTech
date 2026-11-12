# CHUYÊN ĐỀ 06: PHƯƠNG PHÁP NGHIÊN CỨU VÀ XỬ LÝ SỐ LIỆU THỰC NGHIỆM
## Tài liệu nghiên cứu chuyên sâu dành cho học sinh dự thi ViSEF / ISEF

---

### 1. Thiết kế nghiên cứu Thực nghiệm Sư phạm Đối chứng Quasi-experiment

Khi đi thi ViSEF hay ISEF quốc tế, các câu hỏi về **Phương pháp luận nghiên cứu (Research Methodology)** và **Độ tin cậy của số liệu thống kê (Statistical Validity)** thường là những câu hỏi phân loại huy chương vàng:

#### Tại sao lại chọn thiết kế Quasi-experiment thay vì Randomized Controlled Trial (RCT)?
* Trong nghiên cứu y sinh học, người ta dùng RCT (thử nghiệm ngẫu nhiên có đối chứng) bằng cách bốc thăm ngẫu nhiên từng cá nhân vào nhóm dùng thuốc hoặc dùng giả dược.
* Tuy nhiên, trong giáo dục phổ thông, nhà trường không bao giờ cho phép xáo trộn học sinh giữa các lớp để chia nhóm ngẫu nhiên vì sẽ phá vỡ thời khóa biểu và kỷ luật học đường.
* Do đó, nghiên cứu khoa học giáo dục chuẩn mực quốc tế bắt buộc phải áp dụng thiết kế **Thực nghiệm sư phạm đối chứng bán tự nhiên (Quasi-experimental Design)**:
  - Giữ nguyên cấu trúc của hai lớp học có trình độ học lực ban đầu tương đương nhau (qua bài kiểm tra khảo sát đầu vào Pre-test).
  - **Nhóm đối chứng (Control Group):** Lớp 11A2 ($n_1 = 42$ học sinh), học theo phương pháp truyền thống (giáo viên giảng bài bằng bảng thông thường kết hợp slide PowerPoint tĩnh).
  - **Nhóm thực nghiệm (Experimental Group):** Lớp 11A1 ($n_2 = 44$ học sinh), học bằng nền tảng Socratic Vision Board (giáo viên thao tác trên bảng tương tác, học sinh thao tác trên thiết bị cá nhân BYOD).

#### Kiểm soát các biến số gây nhiễu (Extraneous Variables):
Để khẳng định sự tiến bộ của học sinh là do phần mềm chứ không phải do yếu tố bên ngoài, nghiên cứu đã kiểm soát nghiêm ngặt:
* Cùng một giáo viên bộ môn giảng dạy ở cả hai lớp.
* Cùng thời lượng tiết học (45 phút) và cùng một khung phân phối chương trình của Bộ GD&ĐT.
* Đề kiểm tra đánh giá trước và sau thực nghiệm (Pre-test và Post-test) hoàn toàn giống nhau và được chấm ẩn danh (Blinded Grading).

---

### 2. Các chỉ số thống kê toán học cốt lõi và Cách diễn giải khoa học

Các em cần nắm vững ý nghĩa bản chất của 5 đại lượng thống kê xuất hiện trong báo cáo để trả lời rành mạch:

#### 1. Điểm trung bình ($\bar{X}$) và Độ lệch chuẩn ($SD$):
* Nhóm đối chứng: $\bar{X}_1 = 7{,}18$ điểm, $SD_1 = 1{,}12$ điểm.
* Nhóm thực nghiệm: $\bar{X}_2 = 8{,}52$ điểm, $SD_2 = 0{,}84$ điểm.
* *Cách diễn giải:* Nhóm thực nghiệm không chỉ đạt điểm trung bình cao hơn $1{,}34$ điểm mà độ lệch chuẩn còn nhỏ hơn ($0{,}84 < 1{,}12$), chứng tỏ năng lực của học sinh trong lớp thực nghiệm đồng đều hơn, phần mềm giúp kéo các học sinh yếu kém tiến bộ rõ rệt.

#### 2. Phép kiểm định Student's t-test hai mẫu độc lập:
* Giá trị thống kê kiểm định: $t = 6{,}24$ với bậc tự do $df = n_1 + n_2 - 2 = 84$.
* Giá trị xác suất $p$-value: $p = 0{,}0002$.
* *Cách diễn giải:* Trong thống kê, ngưỡng ý nghĩa chuẩn là $\alpha = 0{,}05$. Giá trị $p = 0{,}0002$ nhỏ hơn rất nhiều so với $0{,}001$, khẳng định sự chênh lệch điểm số giữa hai nhóm là có **ý nghĩa thống kê cực kỳ cao**, xác suất xảy ra do ăn may hoặc ngẫu nhiên chỉ là $0{,}02\%$!

#### 3. Kích thước ảnh hưởng Cohen's $d$ (Effect Size):
Công thức Cohen's $d$ đo lường mức độ tác động thực tế của giải pháp độc lập với cỡ mẫu:
$$d = \frac{\bar{X}_2 - \bar{X}_1}{SD_{\text{pooled}}} = \frac{8{,}52 - 7{,}18}{0{,}987} \approx 0{,}88$$
* *Cách diễn giải:* Theo quy ước quốc tế của nhà thống kê Jacob Cohen:
  - $d = 0{,}2$: Mức ảnh hưởng nhỏ.
  - $d = 0{,}5$: Mức ảnh hưởng trung bình.
  - $d \ge 0{,}8$: **Mức ảnh hưởng rất lớn (Large Effect Size)**.
  Chỉ số $d = 0{,}88$ khẳng định Socratic Vision Board mang lại sự đột phá vượt bậc về mặt giáo dục học trong thực tế chứ không chỉ là con số lý thuyết.

#### 4. Hệ số tin cậy nhất quán nội tại Cronbach's Alpha ($\alpha$):
* Giá trị đo được của bộ công cụ đánh giá: $\alpha = 0{,}89$.
* *Cách diễn giải:* Thang đo độ tin cậy Cronbach's Alpha $\ge 0{,}8$ chứng minh bộ câu hỏi kiểm tra năng lực tư duy khoa học có độ tin cậy và tính nhất quán nội tại rất cao.

---

### 3. Số liệu kiểm thử phần mềm tự động (Automated Verification)

Đối với đề tài phần mềm, Ban Giám khảo CNTT sẽ kiểm tra xem code của các em chạy có ổn định không hay chỉ là bản demo chắp vá. Các em hãy trình bày tự tin các số liệu kiểm thử thực chứng:

* **Toàn hệ thống:** Đạt **432 / 432 bài kiểm thử tự động passed $100\%$**.
* **Phân hệ Teacher Board (Next.js 14):** 29 tệp kiểm thử, 378/378 unit & integration tests passed trong 14,77 giây.
* **Phân hệ Student Companion:** 14/14 tests passed cho Visual Debuggers và Locked Stepper.
* **Dịch vụ AI Engine Hub (FastAPI Python):** 38/38 pytest passed trong 1,54 giây.
* **Kiểm tra kiểu tĩnh:** Toàn bộ Monorepo đạt chuẩn TypeScript Strict Mode với 0 lỗi cảnh báo.

---

### 4. Đạo đức nghiên cứu khoa học và Bản lĩnh trước Ban Giám khảo

* **Tuyệt đối trung thực với số liệu:** Nếu Ban Giám khảo hỏi về những trường hợp học sinh làm bài không tốt trong nhóm thực nghiệm, hãy thẳng thắn thừa nhận và phân tích nguyên nhân (ví dụ: một số ít học sinh ban đầu còn bỡ ngỡ với thao tác thiết bị cá nhân). Sự thành thật và cái nhìn khách quan chính là phẩm chất cao quý nhất của một nhà nghiên cứu khoa học trẻ.
* **Phân biệt ranh giới đóng góp:** Nêu rõ phần việc mà nhóm học sinh đã trực tiếp làm: khảo sát chương trình SGK, thiết kế 30 kịch bản thực nghiệm STEM, lập trình giao diện người dùng, cấu hình prompt sư phạm và trực tiếp tổ chức các buổi dạy học thực nghiệm.

---

### 5. Câu hỏi nghiên cứu tự rèn luyện dành cho học sinh

1. **Câu hỏi 1 (Về hiệu ứng tâm lý Hawthorne):** Nếu Ban Giám khảo đặt câu hỏi: *"Liệu điểm số của nhóm thực nghiệm cao hơn có phải do hiệu ứng Hawthorne (học sinh thấy có phần mềm mới, có máy tính bảng nên tò mò và hào hứng hơn nhất thời) chứ không phải do phương pháp Socratic hay không?"*, em sẽ dùng những bằng chứng nào để phản biện thuyết phục?
2. **Câu hỏi 2 (Về thống kê toán học):** Phân biệt rõ sự khác nhau giữa **Ý nghĩa thống kê** (đo bằng chỉ số $p$-value) và **Ý nghĩa thực tiễn** (đo bằng kích thước ảnh hưởng Cohen's $d$). Tại sao một nghiên cứu khoa học chỉ có $p < 0{,}05$ thôi thì chưa đủ để khẳng định giải pháp có giá trị áp dụng trong cuộc sống?
3. **Câu hỏi 3 (Về tính khái quát hóa):** Cỡ mẫu nghiên cứu thực nghiệm trong đề tài là 86 học sinh tại một trường THPT. Kết quả này có thể khái quát hóa (generalize) cho toàn bộ học sinh THPT trên cả nước hay không? Cần mở rộng nghiên cứu như thế nào trong tương lai để khẳng định tính phổ quát?
4. **Câu hỏi 4 (Về phương pháp kiểm thử phần mềm):** Kiểm thử đơn vị (Unit Test) và kiểm thử tích hợp (Integration Test) khác nhau như thế nào? Tại sao một dự án phần mềm dự thi khoa học kỹ thuật lại cần có các bài kiểm thử tự động (Automated Tests) trước khi đem đi thử nghiệm trên học sinh?
