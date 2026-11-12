# SỔ TAY PHÒNG VỆ HỎI ĐÁP: 12 CÂU HỎI KHÓ NHẤT CỦA BAN GIÁM KHẢO

Tài liệu đi kèm `docs/STARTUP_BUSINESS_REPORT_FINAL.docx`. Mỗi câu có ba phần: **Trả lời 30 giây** (đọc to khoảng 70 đến 85 từ), **Số neo** (con số và công thức trong báo cáo) và **Không nói** (câu dễ bị bắt lỗi). Mọi con số lấy từ báo cáo hoặc từ phép đo đã chạy trong phiên rà soát; chỗ nào thuộc về bạn phải điền thì ghi **[CẦN ĐIỀN]**.

Nguyên tắc chung: nói rõ phần chạy được, phần đo được, phần mục tiêu. Ban giám khảo tha cho giới hạn đã khai báo và không tha cho giới hạn bị che giấu.

---

## Nhóm 1. Kiến trúc kỹ thuật và nhận diện

### Câu 1. Nhận diện chữ viết tay trên bảng lớn chỉ khoảng 85% đến 89% là quá thấp để dạy học, sao em bán sản phẩm?

**Trả lời 30 giây.** Đúng, top-1 chỉ khoảng 85% đến 89% vì nét nối và góc nhìn. Thiết kế của chúng em không dựa vào việc nhận diện luôn đúng. Nếu đáp án đúng nằm trong ba ứng viên, thầy cô chạm một lần để đổi, mục tiêu dưới 1,5 giây. Nếu không có, thầy cô sửa thẳng LaTeX trên thanh công thức. Nên về chức năng, công thức nào cũng khôi phục được, bài giảng không bị chặn.

**Số neo.** Top-1 85% đến 89% (ước lượng nội bộ); khôi phục một chạm khi đúng nằm trong top-3; sửa LaTeX thủ công khi không có.

**Không nói.** Không nói "100% đúng trong dưới 1,5 giây". Mục tiêu dưới 1,5 giây áp dụng cho trường hợp một chạm và sẽ đo trên màn hình thật ở Giai đoạn 1. Không nói 85% đến 89% là kết quả kiểm định độc lập.

### Câu 2. 81,4% không tốn token đo bằng cách nào và vì sao tin được?

**Trả lời 30 giây.** Chúng em đếm số lượt tương tác trong thực nghiệm và số lượt phải gọi mô hình ngôn ngữ: $P_0 = 1 - N_{LLM}/N_{lượt}$. Kết quả 81,4%, nghĩa là mô hình chỉ được gọi ở 18,6% lượt và chỉ để sinh câu hỏi gợi mở ngắn. Phần còn lại do nhận diện cục bộ, định tuyến mẫu, bộ nhớ đệm câu hỏi theo từ khóa và kiểm tra đại số bằng SymPy chạy ngay trên máy.

**Số neo.** 81,4% / 18,6%; giá vốn tiết 19 đồng khi có tầng cục bộ so với 102 đồng nếu cả 4,3 lượt qua đám mây (Flash).

**Không nói.** Không nói bộ nhớ đệm đang dùng embedding hoặc ChromaDB với ngưỡng cosine 0,92. Hiện luồng chạy dùng so khớp từ khóa; embedding là hạng mục R&D Giai đoạn 2.

### Câu 3. SymPy kiểm tra "đúng" tuyệt đối được không? Biểu thức nào thì nó bó tay?

**Trả lời 30 giây.** Với biểu thức đại số, chúng em dùng $\text{simplify}(E_{hs} - E_{đích}) = 0$. Chúng em đã chạy thử 300 lượt trên đa thức, phân thức và lượng giác: 300 trên 300 kết luận đúng, trung vị 3 mili giây, phân vị 95 là 8,7 mili giây, tối đa 10,3 mili giây. Nó không áp dụng cho câu hỏi mở hay giải thích bằng lời; phần đó thuộc 18,6% lượt dành cho mô hình, và đầu ra mô hình bị lọc để không chứa lời giải đầy đủ.

**Số neo.** 300/300; p50 3,0 ms; p95 8,7 ms; max 10,3 ms; phạm vi: biểu thức một đến hai biến, máy phát triển.

**Không nói.** Không nói "100% chính xác cho mọi môn" và không nói "dưới 12 ms" như một bảo đảm; đó là kết quả đo trong phạm vi hẹp.

**Cảnh báo nội bộ (xem Phần cuối).** Bộ kiểm tra thứ nguyên hiện đang báo sai cho một số biểu thức Toán thuần.

### Câu 4. Hình nào ngoài thư viện thì sao? AI sinh SVG có đáng tin không?

**Trả lời 30 giây.** Chúng em tách hai lớp. Lớp A là engine xác định: các mẫu như con lắc Runge–Kutta, RLC, hình học, tích phân khối tròn xoay; đúng theo phương trình và chạy miễn phí trên máy. Lớp B chỉ chạy khi hình không có trong thư viện, do AI sinh SVG tương tác, thời gian ước tính 0,45 đến 1,2 giây. Lớp B được gắn nhãn minh họa, không dùng để chấm điểm và không cam kết chính xác số học.

**Số neo.** 10 engine nâng cao; ước tính lớp B 0,45 đến 1,2 giây (ngưỡng thiết kế); chi phí lớp A bằng 0.

**Không nói.** Không nói mọi mô phỏng đạt 60 khung hình/giây; đó là mục tiêu cần đo ở Giai đoạn 1. Không nói có kết xuất PBR, Three.js: hạng mục đó nằm ở Giai đoạn 2.

---

## Nhóm 2. Thực nghiệm

### Câu 5. Thiết kế thực nghiệm của em là gì? Có kiểm soát thiên lệch không?

**Trả lời 30 giây.** Tám tuần, 412 học sinh và 18 giáo viên ở ba loại trường: chuyên, công lập chuẩn quốc gia, tư thục chất lượng cao. Mỗi trường có nhóm thực nghiệm và nhóm đối chứng, đồng nhất ở đầu vào: 6,43 và 6,46. Đầu ra 7,65 so với 6,80, chênh lệch 0,85 điểm, p dưới 0,0001. Chúng em cũng đo giữ kiến thức sau hai tuần: 81,9% so với 60,5%. **[CẦN ĐIỀN: cách chia nhóm (ngẫu nhiên theo lớp hay theo học sinh), cùng giáo viên hay khác giáo viên, đề kiểm tra do ai ra.]**

**Số neo.** 212 thực nghiệm, 200 đối chứng; 58/54, 94/90, 60/56; đầu vào 6,43 ± 1,28 và 6,46 ± 1,26; đầu ra 7,65 ± 1,08 và 6,80 ± 1,21.

**Không nói.** Không dùng chữ "thử nghiệm ngẫu nhiên có đối chứng" nếu việc chia nhóm không ngẫu nhiên. Nên nói thẳng hạn chế: thời gian 8 tuần, ba trường được chọn, kết quả chưa khái quát cho toàn quốc.

### Câu 6. Hệ số Cohen's d gộp 0,73 và mức tăng 0,85 điểm có thật sự là hiệu ứng lớn?

**Trả lời 30 giây.** Nhóm thực nghiệm cao hơn nhóm đối chứng 0,85 điểm trên thang 10, và mức chênh khá đều ở ba loại trường: 0,82, 0,84 và 0,88 điểm. Cohen's d gộp là 0,73, nằm giữa ngưỡng trung bình 0,5 và ngưỡng lớn 0,8; riêng khối chuyên đạt 1,03 vì độ phân tán điểm ở đó nhỏ. Nhóm đầu vào thấp nhất, công lập, tăng 1,22 điểm so với 0,33 của đối chứng. Chúng em coi đây là tín hiệu tích cực đáng nhân rộng chứ chưa phải bằng chứng cuối cùng.

**Số neo.** +0,82 / +0,84 / +0,88 / +0,85; d = 1,03 / 0,75 / 0,88 / 0,73 (tính bằng độ lệch chuẩn gộp từ Bảng 2); p < 0,0001.

**Không nói.** Không dùng lại các số cũ 0,91 và 0,76: báo cáo đã sửa theo phép tính từ Bảng 2. Nếu bảng điểm gốc **[CẦN ĐIỀN]** tính ra khác (ví dụ dùng ANCOVA), sửa cả báo cáo, video và câu trả lời này cùng lúc.

---

## Nhóm 3. Kinh tế đơn vị

### Câu 7. CAC 38.500 đồng nghe không thật. Tính thế nào?

**Trả lời 30 giây.** CAC là 38,1 triệu đồng chi truyền thông phân bổ cho kênh học sinh năm 1 chia cho 990 học sinh trả phí, được 38.500 đồng. Chúng em cũng tính kịch bản xấu: gộp cả nhân sự hỗ trợ, 60 cộng 72 triệu đồng chia 990, được 133.333 đồng. Ngay cả vậy LTV trên CAC vẫn là 6,4 lần, thu hồi trong 39,7 ngày.

**Số neo.** LTV = 856.000 đồng (ARPU hiệu dụng 100.700 × 8,5 tháng); LTV/CAC 22,2; 21,4 theo lợi nhuận đóng góp; 6,4 ở kịch bản xấu; thu hồi 11,5 và 39,7 ngày.

**Không nói.** Không nói "CAC bằng 0". Nói: chi phí thu hút học sinh qua mã QR gần như không có quảng cáo trả tiền, và CAC vẫn được tính ở mức cao hơn thực tế trong kịch bản xấu.

### Câu 8. 350 đồng mỗi tiết tính ra sao? Có phải con số đẹp để trình bày?

**Trả lời 30 giây.** Chúng em tính cận trên khắt khe nhất: cả 4,3 lượt Magic Lasso của một tiết đều qua đám mây, mỗi lượt 260 token vào và 350 token ra, giá Gemini Flash 0,30 và 2,50 USD mỗi triệu token. Ra 0,0041 USD, khoảng 102 đồng. Với tầng cục bộ chỉ 18,6% lên đám mây, còn khoảng 19 đồng. Con số 350 đồng là ngân sách trần gấp 3,4 lần cận trên, để bao thử lại và tăng giá.

**Số neo.** $4{,}3 \times (260 \times 0{,}30 + 350 \times 2{,}50) / 10^6 \approx 0{,}0041$ USD; 102 đồng; 19 đồng; trần 350 đồng (0,014 USD); học sinh: $30 \times 8 \times 18{,}6\% \times 12 = 536$ đồng mỗi tháng, trần 3.800 đồng.

**Không nói.** Không nói chi phí thực là 350 đồng; nói 350 là trần, thực tế 19 đến 102 đồng theo công thức. Đơn giá lấy từ bảng giá công khai do bên thứ ba tổng hợp, cần đối chiếu trang giá chính thức của Google **[CẦN ĐIỀN: ngày đối chiếu]**.

### Câu 9. Doanh thu năm 1 là 1,88 tỷ đồng, trong khi trường công mua chậm. Con số này đến từ đâu?

**Trả lời 30 giây.** Năm 1 không dựa vào trường công. Doanh thu đến từ 990 học sinh trả phí, 1.300 triệu đồng, tức 69% tổng; 15 trường với 360 triệu đồng gồm tập huấn; 40 giáo viên 99,6 triệu đồng; và đối tác thiết bị 119,8 triệu đồng. Chúng em đi làn dòng tiền nhanh trước: giáo viên luyện thi, trung tâm, trường tư, học sinh, với chu kỳ mua từ 1 ngày đến 3 tháng. Trường công vào từ năm 2.

**Số neo.** $18.000 \times 5{,}5\% = 990$; $990 \times 1{,}313 = 1.300$ triệu đồng; tổng 1.879,4 triệu đồng. Độ nhạy năm 3: chuyển đổi 5,5% thay vì 7,5% giảm doanh thu 19,3% (còn khoảng 18.760 triệu đồng, vẫn gấp 2,5 lần năm 2).

**Không nói.** Không nói mọi trường đều mua trong 1 đến 3 tháng. Trường công 3 đến 6 tháng cộng chu kỳ ngân sách.

### Câu 10. Học sinh có ChatGPT miễn phí, sao trả 119.000 đồng mỗi tháng?

**Trả lời 30 giây.** Phụ huynh trả tiền cho kết quả và bằng chứng nỗ lực, không trả cho đáp án. Thực nghiệm cho thấy bài tập về nhà tăng từ 24,5% lên 71,2% và học sinh giữ kiến thức sau hai tuần 81,9% so với 60,5%. Mức giá bằng 7,9% gia sư thấp nhất 1,5 triệu đồng mỗi tháng và nằm trong ngân sách 100.000 đến 150.000 đồng mà phụ huynh dành cho học tập. Chuyển đổi chúng em giả định 5,5% đến 7,5%, không phải 100%.

**Số neo.** $119.000 / 1.500.000 = 7{,}9\%$; chuyển đổi 5,5% / 6,8% / 7,5%; biên đóng góp 96,8%.

**Không nói.** Không so sánh trực tiếp chất lượng với ChatGPT; so sánh theo mục tiêu thiết kế: ChatGPT tối ưu cho đáp án, sản phẩm tối ưu cho tự tìm ra đáp án.

---

## Nhóm 4. Vận hành, bảo mật, quy mô

### Câu 11. Mã QR có chứa được bài giảng dưới 60 KB không? Mất mạng thì sao?

**Trả lời 30 giây.** Hiện mã QR trên bảng dùng để học sinh vào phòng học trực tuyến trong giờ, và phần này đã chạy. Gói ghi chú mang về nhà đang hoàn thiện. Theo thiết kế, mã chỉ chứa một liên kết vài chục byte, vì một mã QR chứa tối đa khoảng 3 kilobyte; liên kết dẫn tới gói ghi chú dưới 60 kilobyte. Khi mất mạng, mô phỏng và nhận dạng hình vẽ vẫn chạy trên máy giáo viên, còn phòng học trực tuyến và việc đọc chữ tiếng Việt bằng AI phải chờ có mạng.

**Số neo.** QR là liên kết; ghi chú dưới 60 KB (ngưỡng thiết kế); engine xác định chạy cục bộ.

**Không nói.** Không nói "nhúng 60 KB vào mã QR" như video hoặc slide đang viết. Không nói "ngoại tuyến 100%".

### Câu 12. Dữ liệu học sinh được lưu và bảo vệ thế nào? Hệ thống chịu được bao nhiêu lớp?

**Trả lời 30 giây.** Hiện phòng học và ghi chú chỉ nằm trong bộ nhớ tạm của máy chủ, chưa có tài khoản và phân quyền, nên chúng em chưa bán bản này cho trường công. Giới hạn cấu hình là 120 học sinh mỗi phòng và 300 phòng, nhưng chưa có kiểm thử tải. Lưu trữ bền vững PostgreSQL, tài khoản và phân quyền là hạng mục R&D Giai đoạn 2, phải xong trước khi ký với trường công. Chúng em cũng tối thiểu hóa dữ liệu cá nhân trong ghi chú.

**Số neo.** 120 học sinh/phòng; 300 phòng; TTL không hoạt động 6 giờ; tối đa 50 ghi chú trong bộ nhớ; chưa kiểm thử tải.

**Không nói.** Không nói "đã sẵn sàng triển khai quy mô trường". Không nói đã có xác thực người dùng.

---

## Phần cuối. Việc phải xử lý trước ngày bảo vệ

Đây là các điểm rà soát phát hiện; không nên để giám khảo tự tìm ra.

1. **Kiểm tra thứ nguyên đang báo sai cho Toán thuần.** Trong `services/ai-engine/symbolic/sympy_verifier.py`, từ điển thứ nguyên coi `x`, `y`, `t`, `a`, `m`... là đại lượng vật lý và hàm này được gọi cho mọi môn từ `routers/companion.py`. Kết quả thử: `x**2 + 3*x` so với `x*(x+3)` và `x**3 - 1` so với `(x-1)*(x**2+x+1)` đều bị báo lỗi thứ nguyên dù đúng đại số. Cách sửa gợi ý: chỉ bật kiểm tra thứ nguyên khi ngữ cảnh môn học là Vật lý. Tôi chưa sửa mã vì ngoài phạm vi phiên này; chỉ nên demo SymPy bằng biến không trùng từ điển (ví dụ `z`, `k`) cho tới khi sửa.
2. **Con số chưa khớp giữa các sản phẩm truyền thông.** Kịch bản video đã sửa (bản 2, ngày 28/10/2026). Slide và poster của các cuộc thi khác vẫn có thể còn câu "nhúng 60 KB vào mã QR" và tỷ lệ tách 54,2% / 27,2%; không mang các tài liệu đó vào phòng bảo vệ SV_STARTUP khi chưa sửa.
3. **"25,4%" ở câu Đúng/Sai.** Số này trùng khối công lập (48,2% lên 73,6%), tức 25,4 điểm phần trăm; nói đúng đơn vị nếu bị hỏi.
4. **Cohen's d.** Báo cáo đã sửa thành 1,03 (khối chuyên) và 0,73 (gộp). Vẫn cần đối chiếu với bảng điểm gốc (Câu 6).
5. **Đội ngũ.** Mọi tài liệu chỉ nêu nhóm tác giả học sinh THCS Hùng Vương và THPT Chuyên Vĩnh Phúc cùng hai thầy cô cố vấn; chuẩn bị sẵn câu trả lời rõ về phần việc của từng em trong xây dựng, kiểm thử và thực nghiệm.
6. **Đơn giá mô hình ngôn ngữ.** Đối chiếu trang giá chính thức của Google và ghi ngày đối chiếu.
7. **Khoản chi phí hạch toán bổ sung** 160 / 320 / 768 triệu đồng ở báo cáo kết quả kinh doanh: thay phần mô tả chung bằng cấu phần thực tế (khấu hao, hoa hồng kênh, dự phòng).
8. **Mã QR “QR Notes” chưa phải mã thật.** Nút QR Notes trong menu “Thêm” đang hiện một hình QR vẽ tay và đường dẫn mẫu `socratic.edu.vn/recap/12A1-09`; quét không được. Khi trình diễn chỉ dùng mã ở nút “Lớp học”.
9. **Đọc chữ khi khoanh đang đi qua Gemini Vision trước.** Mỗi lượt mất vài giây và cần khóa thật, còn hạn mức. Không nói “nhận diện dưới 15 ms” cho phần đọc chữ; con số đó chỉ đúng với nhận dạng nét hình vẽ trên máy.
10. **Doanh thu năm 3 vượt SOM ở hai dòng.** SOM ghi 150 trường và 370 giáo viên sau 3 năm, nhưng dự phóng năm 3 tính 180 trường và 450 giáo viên. Nên nâng SOM hoặc hạ dự phóng cho khớp.
11. **Giá gói giáo viên lệch giữa hai mục.** Mục 2.1 (TAM, SAM, SOM) dùng 2.990.000 đồng/năm, Mục 5.2 và 8.2 dùng 2.490.000 đồng/năm. Chọn một con số rồi tính lại bảng thị trường hoặc doanh thu.
12. **Doanh thu bình quân học sinh năm 1.** Mục 8.2 dùng 1,313 triệu đồng mỗi học sinh trả phí trong năm 1, cao hơn giá gói năm 1,19 triệu đồng, trong khi Mục 8.3 tính giá trị vòng đời chỉ 856.000 đồng. Cần giải thích (ví dụ tỷ lệ gói Chuyên sâu) hoặc hạ con số.
13. **Thời gian thực nghiệm.** Báo cáo ghi 8 tuần từ đầu tháng 9 đến cuối tháng 10/2026 và có bài kiểm tra sau hai tuần; báo cáo lại đề tháng 10/2026. Chuẩn bị ngày bắt đầu, ngày kết thúc và ngày làm bài kiểm tra lại để trả lời khi được hỏi.
14. **Hồ sơ cuộc thi khác dùng bộ số khác.** Hồ sơ “Nhà giáo sáng tạo 2026” đã nộp ghi đợt thí điểm 86 học sinh, 4 tuần. Nếu giám khảo hỏi, cần nói rõ quan hệ giữa hai đợt (ví dụ đợt 86 học sinh là một phần hay là đợt riêng).
