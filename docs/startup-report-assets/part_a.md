# TÓM TẮT DỰ ÁN

## 1. Ý tưởng khởi nguồn của dự án

Ý tưởng về Socratic Vision Board bắt đầu từ một quan sát rất quen thuộc ngay tại các phòng học của trường chúng em: nhà trường được trang bị những chiếc màn hình cảm ứng thông minh rất đắt tiền (60 đến hơn 100 triệu đồng mỗi chiếc), nhưng trong hầu hết các tiết Toán, Lý, Hóa, Sinh hay Khoa học tự nhiên, thầy cô vẫn chỉ dùng chúng như một chiếc tivi để chiếu slide PowerPoint tĩnh (hiệu suất khai thác thực tế chỉ đạt khoảng 15%). Nếu muốn có một hình mô phỏng con lắc dao động hay phản ứng hóa học có thể kéo thả được, thầy cô phải thức đêm gần 40 phút ở nhà để dựng trước trên máy tính. Trong khi đó, khi chúng em về nhà tự làm bài tập, các công cụ AI hiện nay lại giải hộ toàn bộ đáp số chỉ sau một bức ảnh chụp, vô tình làm mất đi thói quen tự suy nghĩ. Nhóm chúng em tự hỏi: Tại sao không tạo ra một lớp phần mềm cài thẳng lên những chiếc màn hình sẵn có ấy, để thầy cô viết phấn tới đâu thì mô hình thí nghiệm hiện ra tới đó, còn khi về nhà, AI sẽ đóng vai một người bạn đồng hành chỉ đặt câu hỏi gợi mở chứ quyết không giải hộ?

## 2. Mô tả sản phẩm

Socratic Vision Board là nền tảng phần mềm giáo dục tích hợp ba phân hệ hoạt động liền mạch trên trình duyệt web mà không cần mua thêm phần cứng mới:

- **Mode 01, bảng tương tác và phòng thí nghiệm ảo tại lớp:** giáo viên viết tay tự nhiên trên bảng; khi khoanh tròn một công thức hay một hình vẽ bằng tính năng Magic Lasso, hệ thống đọc nét chữ và dựng mô hình thí nghiệm tương tác ngay tại vị trí đó, thường chỉ sau vài giây. Hình vẽ tay như tam giác hay hình lập phương được thay bằng hình chuẩn gần như tức thì.
- **Mode 02, gia sư Socratic 1:1 tại nhà:** học sinh giải bài theo từng bậc thang tư duy được khóa mở tuần tự. Hệ thống dùng đại số hình thức (SymPy) để kiểm tra từng bước biến đổi, kết hợp các công cụ trực quan (như chiếc cân đĩa hóa học hay giản đồ lực) để học sinh tự nhìn ra lỗi sai của mình.
- **Mode 03, ghi chú thông minh (Smart Notes) và bản đồ nhiệt lớp học:** trong giờ học, học sinh quét mã QR trên bảng để vào phòng học trực tuyến và cùng kéo mô phỏng trên điện thoại. Những bước giải mà nhiều bạn bị vướng khi tự học buổi tối được gom lại thành bản đồ nhiệt, giúp thầy cô biết cần chữa gì vào sáng hôm sau. Gói ghi chú cuối tiết (thiết kế dưới 60 KB) để học sinh mang bài về nhà đang được nhóm hoàn thiện.

## 3. Giá trị của dự án

- **Giáo viên:** thời gian chuẩn bị mô phỏng thí nghiệm cho các chuyển động giảm từ 38,5 xuống 4,2 phút mỗi tiết (giảm 89,1%).
- **Học sinh:** điểm đầu ra cao hơn nhóm đối chứng 0,85 điểm (p < 0,0001, Cohen's d gộp = 0,73); kiên trì làm bài tập về nhà 24,5% lên 71,2%.
- **Nhà trường:** hiệu suất khai thác thiết bị 15% lên 92%.
- **Thương mại:** 81,4% lượt tương tác không gọi mô hình ngôn ngữ; mức dự trù tối đa cho đám mây 350 đồng mỗi tiết (chi phí thô theo công thức 19 đến 102 đồng); biên lợi nhuận gộp dự phóng 89,5%.

![Giao diện sản phẩm: khoanh một công thức, hệ thống dựng mô phỏng tại chỗ](startup-report-assets/prod_01.jpg)

---

# NỘI DUNG CHÍNH CỦA DỰ ÁN

## A. MÔ HÌNH KINH DOANH CANVAS (BUSINESS MODEL CANVAS)

![Mô hình kinh doanh canvas của Socratic Vision Board (tỷ trọng chi phí và doanh thu tính từ năm thứ ba)](startup-report-assets/fig_s20_canvas.png)

Nhìn vào sơ đồ Canvas trên, điểm khác biệt lớn nhất giúp dự án của chúng em tối ưu được nguồn lực nằm ở sự gắn kết giữa Giải pháp giá trị (ô số 3) và Kênh tiếp cận (ô số 7). Mã QR trên bảng vừa giúp học sinh theo bài ngay trong tiết, vừa là đường dẫn tự nhiên đưa sản phẩm từ bục giảng về tới từng gia đình mà không phải chạy quảng cáo. Ở phía vận hành, nhóm ưu tiên chấm bài bằng thuật toán xác định thay vì gọi mô hình ngôn ngữ, nên chi phí thuê máy chủ đám mây ở năm thứ ba chỉ chiếm khoảng 14,1% tổng chi phí hoạt động (OPEX), cho phép nhóm tập trung 37,5% nguồn lực vào việc nâng cấp học liệu và thuật toán kỹ thuật.

---

# 1. ĐẶT VẤN ĐỀ: GIÁ TRỊ CỐT LÕI, TẦM NHÌN, SỨ MỆNH

## 1.1. Hai bài toán thực tế từ lớp học phổ thông

- **Bài toán thứ nhất, đánh thức những màn hình tương tác đang "ngủ quên":** qua khảo sát thực tế của nhóm tại nhiều trường THCS và THPT ở Phú Thọ và Vĩnh Phúc, phần lớn các phòng học hiện đại đã có sẵn màn hình cảm ứng lớn. Tuy nhiên, do thiếu một phần mềm bám sát chương trình Giáo dục phổ thông 2018 và thuận tiện cho thao tác đứng lớp, thầy cô rất ngại dùng các phần mềm mô phỏng phức tạp vì sợ tốn thời gian gõ bàn phím ảo trên bảng lớn. Thay vì đề nghị nhà trường mua thiết bị mới tốn kém, một gói phần mềm từ 12 đến 24 triệu đồng/năm (chỉ tương đương 1% đến 2% giá trị dàn máy sẵn có) sẽ biến ngay những chiếc màn hình tĩnh đó thành phòng thí nghiệm sống động.
- **Bài toán thứ hai, thay đổi cách tự học trước cấu trúc đề thi mới:** từ năm 2025, kỳ thi tốt nghiệp THPT và các bài kiểm tra định kỳ đã chuyển mạnh sang dạng thức trắc nghiệm Đúng/Sai bốn mệnh đề (Phần II) và trả lời ngắn (Phần III). Học sinh không còn có thể khoanh bừa theo mẹo hay học thuộc lòng công thức mẫu, mà buộc phải hiểu bản chất hiện tượng và biết đọc đồ thị khi các tham số thay đổi. Thế nhưng, các ứng dụng giải bài tập bằng AI hiện nay lại đi ngược lại yêu cầu đó khi cung cấp ngay lời giải chi tiết từ đầu đến cuối. Khoảng trống này chính là lý do nhóm phát triển một trợ lý AI "biết từ chối đưa đáp án", kiên trì dẫn dắt để học sinh tự mình vượt qua từng bước biến đổi.

## 1.2. Tầm nhìn và sứ mệnh

- **Tầm nhìn:** trở thành lớp phần mềm tiêu chuẩn cho dạy học thực nghiệm STEM trên màn hình tương tác tại trường phổ thông Việt Nam, từng bước mở rộng sang khu vực.
- **Sứ mệnh:** không để trí tuệ nhân tạo suy nghĩ thay người học; biến mỗi nét viết thành cơ hội khám phá; bình đẳng hóa tiếp cận môi trường thực nghiệm.

## 1.3. Giá trị cho bốn bên liên quan

![Kết quả đo được theo bốn nhóm thụ hưởng](startup-report-assets/fig_s21_stakeholders.png)

Thay vì chỉ đưa ra những lời hứa hẹn định tính, hiệu quả của sản phẩm được nhóm đo đạc cụ thể trên cả bốn nhóm người dùng trong đợt thử nghiệm thực tế. Với thầy cô giáo, thời gian phải ngồi vẽ hình và chuẩn bị mô phỏng trước mỗi tiết dạy giảm tới 89,1% (từ trung bình 38,5 phút xuống chỉ còn khoảng 4,2 phút thao tác trực tiếp trên bảng). Với học sinh, việc được tận tay kéo thanh trượt quan sát hiện tượng và tự gỡ lỗi từng bước giúp điểm kiểm tra đầu ra cao hơn nhóm đối chứng 0,85 điểm, đồng thời tỷ lệ các bạn kiên trì hoàn thành hết bài tập khó ở nhà tăng vọt từ 24,5% lên 71,2%. Về phía phụ huynh, mức phí 119.000 đồng/tháng chỉ bằng khoảng 7,9% chi phí thuê gia sư kèm riêng thấp nhất hiện nay, nhưng bố mẹ lại nhận được báo cáo chi tiết về sự nỗ lực tự học của con hàng tuần (84,6% phụ huynh trong nhóm thử nghiệm chủ động mở xem báo cáo này). Cuối cùng, nhà trường nâng được hiệu suất sử dụng dàn màn hình tương tác từ 15% lên 92% mà không phải xin thêm ngân sách đầu tư thiết bị phần cứng.

## 1.4. Vì sao một nhóm học sinh THCS và THPT cùng làm được sản phẩm này

Nhóm tác giả là một nhóm liên cấp, mỗi người giữ một phần việc phù hợp với sức mình. Các em học sinh THCS Hùng Vương là những người trực tiếp học môn Khoa học tự nhiên tích hợp của chương trình mới nên hiểu rõ nỗi khó của người học: Đức thiết kế trải nghiệm người dùng, Hà khảo sát thực địa và tổng hợp ý kiến học sinh, Lan Anh và Phong kiểm thử bài học, học liệu và thiết bị trên lớp. Các engine nâng cao cho chuyên đề THPT (tích phân khối tròn xoay, phương trình vi phân, mạch xoay chiều) do thành viên học sinh THPT Chuyên Vĩnh Phúc cùng thầy Phùng Văn Kiệm cố vấn về mô hình toán học và đội ngũ cộng tác viên kỹ thuật (khoản "Hỗ trợ nghiên cứu và kỹ thuật" ở Mục 6) đảm nhiệm. Thư viện mô phỏng vì thế có hai tầng: các mẫu của chương trình Khoa học tự nhiên THCS (thấu kính hội tụ và phân kỳ, cân bằng phương trình hóa học, bảng Punnett di truyền Mendel, con lắc, mặt phẳng nghiêng) và các chuyên đề THPT, THPT Chuyên.


---

