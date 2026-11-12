# TÓM TẮT DỰ ÁN

## 1. Ý tưởng chính của dự án

Socratic Vision Board là giải pháp công nghệ giáo dục nhắm vào một điểm nghẽn có thể đo đếm được của chuyển đổi số học đường: hơn 45.000 màn hình tương tác thông minh đã được đầu tư tại các trường phổ thông trên cả nước, nhưng phần lớn chỉ vận hành như màn chiếu tĩnh. Về mặt kinh tế, đó là một khoản tài sản cố định bị khai thác dưới công suất, với hiệu suất sử dụng ước tính 15%. Dự án không đề xuất thay thế thiết bị mà bổ sung lớp phần mềm khiến tài sản sẵn có sinh ra giá trị sư phạm.

Giáo viên viết hoặc phác họa tự nhiên trên mặt bảng; hệ thống nhận diện và chuyển nét vẽ tay thành mô hình thí nghiệm STEM hai chiều và ba chiều ngay tại vị trí vừa viết. Điểm khác biệt mang tính triết lý là trí tuệ nhân tạo không giải hộ bài tập. Trợ lý tự học vận hành theo phương pháp đàm thoại Socratic: từ chối cung cấp đáp án dựng sẵn, đặt câu hỏi gợi mở nhiều nấc và kích hoạt công cụ trực quan để học sinh tự lý giải bản chất và tự sửa sai. Lựa chọn này cũng là lựa chọn kinh tế: hệ thống chỉ sinh câu hỏi ngắn thay vì lời giải dài, nên chi phí suy luận trên mỗi lượt tương tác thấp hơn đáng kể so với các ứng dụng giải bài.

## 2. Mô tả sản phẩm

Hệ thống vận hành theo quy trình khép kín năm bước từ tiết học trên lớp đến tự học tại nhà (Hình [[ref:fig_s01_workflow]]).

![Quy trình năm bước của Socratic Vision Board, từ nét viết trên bảng đến bản đồ năng lực](startup-report-assets/fig_s01_workflow.png)

1. **Chuyển hóa nét vẽ tại chỗ.** Bộ nhận diện xử lý với độ trễ dưới 15 mili giây, thay nét vẽ thô bằng mô hình toán học hoặc hiện tượng khoa học chuẩn mực: hình học không gian, khảo sát hàm số, cơ chế phản ứng hóa học, chuỗi truyền năng lượng sinh học.
2. **Tương tác động học trực tiếp.** Người dạy và người học chạm trực tiếp để xoay mô hình, cắt mặt phẳng tiết diện hoặc đổi tham số vật lý, không phụ thuộc chuột hay thanh kéo.
3. **Đóng gói bài giảng theo thời gian thực.** Diễn biến nét viết và các mô hình động được nén thành chuỗi dữ liệu vector dưới 60 kilobyte, nhúng trong một mã phản hồi nhanh (mã QR).
4. **Trợ lý tự học đồng hành tại nhà.** Học sinh quét mã, mở lại tiến trình bài giảng trên thiết bị cá nhân; trợ lý dẫn dắt qua bốn bước giàn giáo sư phạm và mở công cụ trực quan để học sinh tự cân bằng phương trình, tự điều chỉnh hợp lực hay khảo sát tiếp tuyến.
5. **Bản đồ năng lực và báo cáo định tính.** Giáo viên nắm các lỗ hổng nhận thức chung của lớp trước bài mới; phụ huynh nhận báo cáo phản ánh mức kiên trì và thời gian nỗ lực tư duy thay vì chỉ điểm số.

## 3. Giá trị của dự án

- **Đối với giáo viên:** giảm thời gian chuẩn bị học liệu trực quan từ 38,5 phút xuống 4,2 phút mỗi tiết, tương ứng giảm 89,1%; tự động hóa khâu lưu trữ và chia sẻ bài giảng.
- **Đối với học sinh:** tỷ lệ học sinh trung bình kiên trì hoàn thành bài tập về nhà tăng từ 24,5% lên 71,2%; điểm kiểm tra sau can thiệp cao hơn nhóm đối chứng 0,85 điểm; tỷ lệ trả lời đúng câu hỏi Đúng/Sai nhiều ý đòi hỏi hiểu bản chất tăng 25,4%.
- **Đối với nhà trường:** hiệu suất sử dụng màn hình tương tác tăng từ 15% lên 92%, đồng thời hình thành kho dữ liệu số phục vụ kiểm định chất lượng.
- **Giá trị thương mại:** nhờ cấu trúc xử lý phân tầng, 81,4% tác vụ được giải quyết cục bộ bằng đại số hình thức và bộ nhớ đệm. Chi phí điện toán đám mây chỉ khoảng 350 đồng cho mỗi tiết dạy và 3.800 đồng cho mỗi học sinh mỗi tháng. Biên lợi nhuận gộp dự phóng đạt 89,5% trong ba năm đầu, trên ngưỡng thiết kế thận trọng khoảng 88%.

![Giao diện sản phẩm thực: khoanh một công thức, hệ thống dựng mô phỏng tại chỗ](startup-report-assets/prod_01.jpg)

---

# NỘI DUNG CHÍNH CỦA DỰ ÁN

## A. MÔ HÌNH KINH DOANH CANVAS (BUSINESS MODEL CANVAS)

Mô hình canvas dưới đây tổng hợp chín khối cấu thành của dự án. Các tỷ trọng chi phí và doanh thu được tính lại từ dự phóng năm thứ ba ở Mục 6 và Mục 8 để bảo đảm khớp số học.

[[T:Khối đối tác, hoạt động, giải pháp giá trị, quan hệ khách hàng và phân khúc khách hàng]]

| 1. ĐỐI TÁC CHÍNH | 2. HOẠT ĐỘNG CHÍNH | 3. GIẢI PHÁP GIÁ TRỊ | 4. QUAN HỆ KHÁCH HÀNG | 5. PHÂN KHÚC KHÁCH HÀNG |
|---|---|---|---|---|
| • Đơn vị sản xuất, phân phối màn hình tương tác<br>• Mạng lưới trường phổ thông công lập, chuyên và tư thục<br>• Tổ chuyên môn Toán, Vật lý, Hóa học, Sinh học<br>• Nhà cung cấp hạ tầng điện toán đám mây | • Nghiên cứu hoàn thiện công nghệ nhận diện nét vẽ và mô phỏng<br>• Chuẩn hóa 10 động cơ thực nghiệm STEM theo chương trình mới<br>• Phát triển rào chắn sư phạm chống mớm lời giải<br>• Dạy thử nghiệm, thu thập ý kiến, đào tạo | • Biến nét vẽ thô thành mô hình thí nghiệm tương tác tại chỗ, dưới 15 ms<br>• Bảng viết trong suốt, không che nét phấn<br>• Trợ lý Socratic dẫn dắt từng bước<br>• Chi phí vận hành chỉ khoảng 350 đồng/tiết | • Hỗ trợ kỹ thuật, tập huấn trực tiếp cho tổ chuyên môn<br>• Đồng hành cá nhân hóa qua báo cáo gửi phụ huynh<br>• Cập nhật mô phỏng theo góp ý trong 24 giờ | • Cơ sở giáo dục: trường THPT, THCS, trung tâm bồi dưỡng<br>• Học sinh và phụ huynh: ôn thi tốt nghiệp, phát triển năng lực<br>• Giáo viên bồi dưỡng độc lập có lớp dạy chuyên sâu |

[[T:Khối nguồn lực và kênh tiếp cận]]

| 6. NGUỒN LỰC CHÍNH | 7. KÊNH TIẾP CẬN |
|---|---|
| • Đội ngũ tác giả am hiểu nhu cầu học tập<br>• Hội đồng cố vấn sư phạm giàu kinh nghiệm<br>• Mạng lưới trường tham gia thử nghiệm<br>• Thư viện 10 mô phỏng STEM chuyên sâu<br>• Cơ sở dữ liệu câu hỏi bẫy nhận thức bám sát định hướng đánh giá hiện hành<br>• Quyền tác giả đối với phần mềm và giải pháp | • Mã liên kết bài học học sinh nhận trực tiếp tại lớp<br>• Cài đặt sẵn cùng các hãng thiết bị phần cứng<br>• Hội thảo chuyên đề và tiết thao giảng mẫu<br>• Giới thiệu trực tiếp giữa các đơn vị trong ngành giáo dục |

[[T:Khối cơ cấu chi phí và dòng doanh thu (tỷ trọng tính theo năm thứ ba)]]

| 8. CƠ CẤU CHI PHÍ (năm thứ ba, tổng 3.840 triệu đồng) | 9. DÒNG DOANH THU (năm thứ ba, tổng 23.238 triệu đồng) |
|---|---|
| • Nghiên cứu, hoàn thiện tính năng và học liệu: 37,5%<br>• Máy chủ, lưu trữ và dịch vụ trí tuệ nhân tạo: 14,1%<br>• Bán hàng, tiếp thị, triển khai và hỗ trợ thực địa: 35,9%<br>• Quản trị, văn phòng, pháp lý và dự phòng: 12,5%<br>• Chi phí biến đổi mỗi người học: 3.800 đồng/tháng<br>• Biên lợi nhuận gộp dự phóng: 89,46% (ngưỡng thiết kế thận trọng: 88%) | • Thuê bao tự học cá nhân (119.000 đồng/tháng): 72,3%<br>• Bản quyền trường học (Cơ bản 12 triệu/năm, Nâng cao 24 triệu/năm) và tập huấn (4 triệu/đợt): 18,6%<br>• Gói công cụ giáo viên (299.000 đồng/tháng): 4,8%<br>• Chia sẻ doanh thu từ đối tác thiết bị phần cứng: 4,3% |

Bố cục này nhất quán với logic kinh tế của dự án. Nhóm khách hàng chi trả (nhà trường, phụ huynh, giáo viên) tách khỏi nhóm người dùng đầu cuối, trong khi kênh phân phối là chính bục giảng. Vì kênh tiếp cận trùng với hoạt động tạo giá trị, chi phí bán hàng không tăng tuyến tính theo số người dùng.

---

## B. MÔ TẢ THÊM VỀ SẢN PHẨM, DỊCH VỤ

# 1. ĐẶT VẤN ĐỀ: GIÁ TRỊ, TẦM NHÌN, SỨ MỆNH

## 1.1. Bối cảnh thực tiễn và tính cấp thiết của đề tài

Giáo dục phổ thông Việt Nam đang ở giai đoạn then chốt của đổi mới căn bản và toàn diện. Ba áp lực dưới đây cùng hội tụ và tạo ra một khoảng trống thị trường rõ ràng.

**Thứ nhất, tài sản cố định bị khai thác dưới công suất.** Cả nước có hơn 45.000 màn hình tương tác được đầu tư với tổng kinh phí hàng nghìn tỷ đồng. Do thiếu phần mềm chuyên dụng bám sát chương trình, phần lớn thiết bị chỉ đóng vai trò thiết bị chiếu thụ động. Dưới góc nhìn kinh tế giáo dục, đây là chi phí chìm lớn nhưng suất sinh lợi sư phạm thấp: chi phí cận biên để kích hoạt thêm giá trị từ một thiết bị đã mua là rất nhỏ so với chi phí mua mới, và đó là cơ sở để mức giá phần mềm 12 đến 24 triệu đồng mỗi trường mỗi năm chỉ chiếm 1% đến 2% giá trị thiết bị.

**Thứ hai, chuyển dịch phương pháp theo Chương trình Giáo dục phổ thông 2018.** Cấu trúc đề thi tốt nghiệp từ năm 2025 nhấn mạnh trắc nghiệm Đúng/Sai bốn ý phân tích dữ liệu, bảng biểu, đồ thị và dạng tự luận trả lời ngắn yêu cầu diễn giải hiện tượng. Cách dạy đọc chép, ghi nhớ công thức máy móc hay mẹo chọn đáp án ngẫu nhiên mất hiệu lực; học sinh buộc phải hiểu bản chất và vận dụng.

**Thứ ba, nguy cơ thụ động hóa tư duy do lạm dụng trí tuệ nhân tạo.** Các ứng dụng giải bài bằng cách chụp ảnh đưa ra lời giải hoàn chỉnh tạo thói quen học vẹt và ảo tưởng năng lực. Học sinh sao chép đáp án để đối phó nhưng không rèn được tư duy giải quyết vấn đề trước tình huống mới. Đây là dạng thất bại thị trường quen thuộc: lợi ích tức thời của người dùng (có đáp án ngay) mâu thuẫn với lợi ích dài hạn của chính họ (năng lực tự học).

Socratic Vision Board giải quyết đồng thời ba áp lực: biến màn hình cảm ứng thành phòng thí nghiệm ngay trong giờ học, đồng thời chuyển tiến trình tự học ở nhà thành chuỗi đàm thoại gợi mở có kiểm soát, với chi phí vận hành khoảng 350 đồng cho mỗi tiết giảng.

## 1.2. Tầm nhìn và sứ mệnh phát triển

- **Tầm nhìn.** Trở thành giải pháp nền tảng tiêu chuẩn trong trực quan hóa giảng dạy thực nghiệm STEM cho các trường phổ thông Việt Nam, từng bước mở rộng sang các quốc gia trong khu vực có điều kiện giáo dục tương đồng.
- **Sứ mệnh.** Không để trí tuệ nhân tạo suy nghĩ thay người học; biến mỗi nét viết trên bảng thành cơ hội khám phá chủ động; bình đẳng hóa cơ hội tiếp cận môi trường học thực nghiệm chất lượng cao.

![Bốn mô phỏng mở bằng một nét khoanh: vật lý, hóa học, sinh học, toán học](startup-report-assets/prod_02.jpg)

## 1.3. Ma trận giá trị định lượng cho các bên liên quan

Mỗi nhóm thụ hưởng có một cơ chế tạo giá trị riêng và một chỉ số đo lường riêng. Bảng sau liên kết khó khăn hiện tại với kết quả đã đo được trong đợt thực nghiệm.

[[T:Ma trận giá trị định lượng theo nhóm thụ hưởng]]

| Nhóm thụ hưởng | Khó khăn cốt lõi hiện nay | Giải pháp từ Socratic Vision Board | Hiệu quả định lượng đo được |
|---|---|---|---|
| **Giáo viên trực tiếp giảng dạy** | Mất 30 đến 60 phút tìm kiếm, chuẩn bị hình minh họa; chuyển đổi giữa các ứng dụng làm đứt mạch bài giảng. | Thao tác tự nhiên trên bảng, biến hình học tại chỗ dưới 15 ms; tự động lưu và gửi tiến trình cho học sinh. | • Chuẩn bị học liệu giảm từ 38,5 xuống 4,2 phút mỗi tiết (giảm 89,1%).<br>• Tiết kiệm trung bình 45 giờ chuẩn bị bài mỗi tháng. |
| **Học sinh phổ thông** | Khó hình dung khái niệm không gian trừu tượng; bế tắc khi tự học, phụ thuộc bài giải sẵn trên mạng. | Trợ lý không đưa đáp án mà định hướng qua bốn bước gợi mở; bốn công cụ trực quan để tự sửa lỗi. | • Điểm sau can thiệp cao hơn đối chứng 0,85 điểm.<br>• Kiên trì làm bài tập về nhà: 24,5% lên 71,2%.<br>• Đúng câu hỏi bản chất: tăng thêm 25,4%. |
| **Phụ huynh học sinh** | Thiếu thông tin về tiến bộ thực chất; gia sư 1,5 đến 3 triệu đồng/tháng; lo con ỷ lại công nghệ. | Báo cáo định tính minh bạch về thời gian nỗ lực tư duy độc lập và chỉ số kiên trì. | • Tiết kiệm hơn 90% chi phí so với gia sư kèm riêng.<br>• 84,6% phụ huynh chủ động xem báo cáo. |
| **Cơ sở giáo dục và quản lý** | Thiết bị chưa khai thác hết giá trị đầu tư; thiếu công cụ tổng hợp dữ liệu chuyển đổi số. | Khai thác toàn bộ thiết bị sẵn có; bản đồ lỗ hổng kiến thức cho từng khối lớp. | • Hiệu suất khai thác thiết bị: 15% lên 92%.<br>• Dữ liệu phục vụ báo cáo kiểm định chất lượng. |

Mức tiết kiệm hơn 90% so với gia sư được kiểm tra như sau: gói Nâng cao 119.000 đồng/tháng so với gia sư 1.500.000 đồng/tháng cho mức chi phí tương ứng là $119.000 / 1.500.000 \approx 7{,}9\%$, tức tiết kiệm khoảng 92,1%; so với 3.000.000 đồng/tháng, mức tiết kiệm đạt khoảng 96,0%.

---

# 2. NGHIÊN CỨU VÀ KHẢO SÁT THỊ TRƯỜNG

## 2.1. Phân tích quy mô thị trường từ dưới lên

Quy mô thị trường được dựng theo phương pháp từ dưới lên (bottom-up): đếm đơn vị khách hàng thực, nhân với đơn giá niêm yết, thay vì lấy tỷ lệ phần trăm của một thị trường tổng thể. Cách làm này tránh sai lệch phóng đại thường gặp ở các ước tính từ trên xuống. Cơ sở dữ liệu đầu vào thuộc năm học 2024-2025:

- Khoảng 2.900 trường THPT và khoảng 4.200 trường THCS có trang bị phòng học tương tác.
- Khoảng 2,9 triệu học sinh THPT và 5,8 triệu học sinh THCS.
- Khoảng 65.000 giáo viên giảng dạy các môn khoa học tự nhiên và STEM.
- Tỷ giá quy ước: 1 USD = 25.000 đồng.

Công thức xác lập: $\text{TAM} = \sum_i N_i \times P_i$, trong đó $N_i$ là số đơn vị khách hàng nhóm $i$ và $P_i$ là đơn giá năm của nhóm đó.

[[T:Quy mô thị trường phân tầng (TAM, SAM, SOM)]]

| Cấp độ thị trường | Công thức xác lập | Giá trị (đồng) | Quy đổi (USD) | Luận cứ và giả định |
|---|---|---|---|---|
| **Toàn diện, nhà trường** | 2.900 trường × 24.000.000 đ/năm | 69,60 tỷ | 2,78 triệu | Toàn bộ trường THPT trang bị gói bảng tương tác. |
| **Toàn diện, trung tâm bồi dưỡng** | 3.500 trung tâm × 15.000.000 đ/năm | 52,50 tỷ | 2,10 triệu | Cơ sở bồi dưỡng ngoài công lập trang bị bản quyền. |
| **Toàn diện, học sinh** | 2.900.000 học sinh × 1.190.000 đ/năm | 3.451,00 tỷ | 138,04 triệu | Toàn bộ học sinh THPT đăng ký tài khoản cả năm. |
| **Toàn diện, giáo viên** | 65.000 giáo viên × 2.990.000 đ/năm | 194,35 tỷ | 7,77 triệu | Giáo viên bộ môn đăng ký gói công cụ nâng cao. |
| **TAM** | Tổng bốn nhóm | **3.767,45 tỷ** | **150,70 triệu** | Dung lượng lý thuyết của thị trường. |
| **SAM** | 1.200 trường + 1.050.000 học sinh + 2.500 giáo viên | **1.285,78 tỷ** | **51,43 triệu** | Trường đã có màn hình tương tác ở đô thị; học sinh có điều kiện tiếp cận công nghệ. |
| **SOM (sau 3 năm)** | 150 trường + 50.000 học sinh + 370 giáo viên | **64,21 tỷ** | **2,57 triệu** | Khoảng 5,0% SAM, đạt qua kênh đối tác thiết bị và hiệu ứng lan tỏa. |

![Tháp thị trường TAM, SAM, SOM theo giá niêm yết](startup-report-assets/fig_s02_market.png)

Có ba nhận xét kinh tế. Thứ nhất, học sinh chiếm 91,6% TAM ($3.451,00 / 3.767,45$), nên giá trị của dự án quyết định bởi sức bật của kênh học sinh chứ không phải hợp đồng trường; hợp đồng trường vì vậy đóng vai trò cánh cửa phân phối và bảo chứng uy tín hơn là nguồn doanh thu chủ đạo. Thứ hai, SOM chỉ bằng 5,0% SAM và 1,7% TAM, một mức thâm nhập khiêm tốn, không đòi hỏi dự án giành thị phần từ đối thủ mà chỉ cần chuyển hóa một phần tài sản đang bỏ không. Thứ ba, SOM tính theo giá niêm yết đầy đủ; doanh thu thuần năm thứ ba 23,238 tỷ đồng bằng 36,2% giá trị SOM, phần chênh lệch là biên an toàn cho chiết khấu, gói năm và thời gian kích hoạt giữa năm.

## 2.2. Dữ liệu thực nghiệm khoa học khép kín: 412 học sinh, 18 giáo viên

Nghiên cứu can thiệp có đối chứng được thực hiện liên tục 8 tuần, từ đầu tháng 9 đến cuối tháng 10 năm 2026, tại ba trường đại diện cho ba môi trường học tập: Trường THPT Chuyên Vĩnh Phúc (khối chuyên mũi nhọn), một trường THPT công lập chuẩn quốc gia quy mô lớn (khối đại trà, 42 học sinh mỗi lớp) và một trường tư thục chất lượng cao. Việc lấy mẫu qua ba phân khúc cho phép kiểm tra tính nhất quán của hiệu ứng, thay vì chỉ trình bày kết quả tại một môi trường thuận lợi.

Quy ước đo lường: **chênh lệch ròng** là hiệu giữa điểm đầu ra trung bình của nhóm thực nghiệm và nhóm đối chứng; do hai nhóm đồng nhất ở đầu vào (chênh lệch ban đầu không đáng kể), chỉ số này phản ánh trực tiếp tác động của can thiệp. Hệ số Cohen's d tính theo độ lệch chuẩn gộp: $d = (\bar{X}_{TN} - \bar{X}_{DC}) / s_{p}$.

[[T:Đối sánh dữ liệu thực nghiệm theo phân khúc trường (điểm thang 10, trung bình ± SD)]]

| Phân khúc | Quy mô mẫu | Đầu vào | Đầu ra | Chênh lệch ròng và kiểm định | Điểm nhấn vận hành |
|---|---|---|---|---|---|
| **Khối chuyên mũi nhọn** | 112 học sinh: thực nghiệm 58, đối chứng 54; 5 giáo viên | TN: 7,38 ± 0,92<br>ĐC: 7,41 ± 0,89 | TN: 8,54 ± 0,74<br>ĐC: 7,72 ± 0,85<br>Tăng 1,16 so với 0,31 | **+0,82 điểm**<br>p < 0,0001<br>d = 0,91 | Đúng câu vận dụng cao tăng 26,4%; dùng nhiều tính năng biến đổi đại số chuyên sâu và khảo sát giới hạn. |
| **Công lập chuẩn quốc gia** | 184 học sinh: thực nghiệm 94, đối chứng 90; 8 giáo viên | TN: 5,86 ± 1,24<br>ĐC: 5,91 ± 1,21 | TN: 7,08 ± 1,05<br>ĐC: 6,24 ± 1,18<br>Tăng 1,22 so với 0,33 | **+0,84 điểm**<br>p < 0,0001<br>d = 0,75 | Đúng/Sai bốn ý tăng từ 48,2% lên 73,6%; hoàn thành bài tập về nhà tăng từ 24,5% lên 71,2%. |
| **Tư thục chất lượng cao** | 116 học sinh: thực nghiệm 60, đối chứng 56; 5 giáo viên | TN: 6,45 ± 1,12<br>ĐC: 6,42 ± 1,15 | TN: 7,69 ± 0,91<br>ĐC: 6,81 ± 1,08<br>Tăng 1,24 so với 0,39 | **+0,88 điểm**<br>p < 0,0001<br>d = 0,88 | Chuẩn bị hình vẽ giảm từ 38,5 xuống 4,2 phút/tiết; 84,6% phụ huynh mở báo cáo. |
| **TỔNG HỢP** | **412 học sinh**: TN 212, ĐC 200; **18 giáo viên** | TN: 6,43 ± 1,28<br>ĐC: 6,46 ± 1,26 | TN: 7,65 ± 1,08<br>ĐC: 6,80 ± 1,21<br>Tăng 1,22 so với 0,34 | **+0,85 điểm**<br>p < 0,0001<br>**d gộp = 0,76** | 240 tiết giảng trên lớp, 6.840 phiên tự học ở nhà; ngăn chặn chép đáp án 98,4%. |

![Điểm trung bình đầu vào và đầu ra của nhóm thực nghiệm và đối chứng theo từng phân khúc](startup-report-assets/fig_s03_pilot_scores.png)

![Chênh lệch điểm đầu ra và hệ số Cohen's d theo phân khúc](startup-report-assets/fig_s04_effect.png)

Kết quả có ba đặc điểm đáng chú ý đối với người đánh giá. Hiệu ứng nhất quán: chênh lệch ròng nằm trong khoảng hẹp 0,82 đến 0,88 điểm tại cả ba môi trường, bất kể mặt bằng đầu vào chênh nhau hơn 1,5 điểm (5,86 so với 7,38). Điều này cho thấy lợi ích không phải sản phẩm của riêng nhóm học sinh giỏi. Nhóm thực nghiệm khối công lập, vốn có đầu vào thấp nhất, tăng 1,22 điểm trong khi đối chứng chỉ tăng 0,33; đây là nhóm có biên cải thiện lớn nhất theo số tuyệt đối. Cuối cùng, hệ số tác động gộp d = 0,76 thuộc mức trung bình đến lớn theo quy ước thông dụng trong nghiên cứu giáo dục (từ 0,5 trở lên là trung bình, từ 0,8 trở lên là lớn), và là mức khó đạt được đối với một can thiệp công nghệ chỉ kéo dài 8 tuần.

![Ba chỉ số hiệu quả chính: bài tập về nhà, giữ kiến thức sau hai tuần, thời gian chuẩn bị học liệu](startup-report-assets/fig_s05_outcomes.png)

### Độ bền kiến thức và ba bài học từ thực tiễn

1. **Kiểm tra ghi nhớ sau hai tuần.** Bài kiểm tra bất ngờ sau hai tuần kết thúc đợt học cho thấy nhóm thực nghiệm giữ được 81,9% lượng kiến thức so với cuối khóa, trong khi nhóm đối chứng chỉ còn 60,5%, chênh lệch 21,4 điểm phần trăm. Đây là bằng chứng quan trọng nhất cho luận điểm Socratic: học sinh tự tìm ra bản chất thì nhớ lâu hơn học sinh nhận đáp án.
2. **Hiệu chuẩn trên màn hình cảm ứng hồng ngoại.** Tại các trường công lập, khung hồng ngoại tần số lấy mẫu 60 Hz ban đầu gây nhận nhầm cổ tay tì lên mặt bảng. Nhóm nghiên cứu cập nhật thuật toán làm mịn đường cong và đặt độ trễ giữ nhấc bút 550 mili giây; sự cố được khắc phục hoàn toàn.
3. **Vận hành không phụ thuộc Internet.** Khi trường mất kết nối, thuật toán nhận diện và toàn bộ mô phỏng vẫn chạy trên máy giáo viên nhờ thiết kế ưu tiên xử lý cục bộ; dữ liệu tự đồng bộ khi mạng trở lại.

![Bản đồ nhiệt lớp học: điểm nghẽn nhận thức hiện ra cho buổi dạy hôm sau](startup-report-assets/prod_05.jpg)
