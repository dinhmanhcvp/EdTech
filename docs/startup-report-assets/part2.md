# 3. TÍNH NĂNG VÀ LỢI THẾ CẠNH TRANH CỦA SẢN PHẨM

## 3.1. Cấu trúc tính năng toàn diện của hệ thống

Hệ thống gồm ba phân hệ liên kết chặt chẽ, mỗi phân hệ gắn với một nhóm khách hàng chi trả riêng.

- **Phân hệ bảng tương tác trên bục giảng.** Bảng giữ nền đen tự nhiên, không có khung hộp đục che chữ phấn. Giáo viên khoanh chọn hình vẽ tay thô như khối chóp, hình trụ hay đồ thị; hệ thống thay nét vẽ bằng mô hình ba chiều có thể xoay 360 độ hoặc cắt mặt phẳng trực tiếp. Hệ thống tích hợp 10 động cơ thực nghiệm chuyên sâu: hệ tọa độ không gian, tích phân tròn xoay, mạng tinh thể, cơ chế hóa học lập thể, chuỗi hô hấp tế bào và các động cơ khác.
- **Phân hệ trợ lý tự học định hướng gợi mở.** Phản hồi tuân theo nguyên tắc không đưa lời giải hoàn chỉnh. Học sinh đi qua chuỗi câu hỏi gợi mở kết hợp bốn công cụ trực quan: cân đĩa bảo toàn khối lượng, đa giác tổng hợp lực, thước tiếp tuyến cực trị hàm số và mô hình thẩm thấu tế bào.
- **Phân hệ quản trị bài giảng và bản đồ năng lực.** Giáo viên theo dõi tiến bộ của cả lớp qua bản đồ nhiệt tự động phân thành ba nhóm: cần hỗ trợ kịp thời, đạt chuẩn và phát triển nâng cao.

![Trợ lý Socratic khóa từng bước, SymPy chấm, AI chỉ hỏi: không đưa đáp án](startup-report-assets/prod_03.jpg)

### Cấu trúc xử lý phân tầng: nền tảng của biên lợi nhuận

Đặc điểm kỹ thuật có ý nghĩa kinh tế lớn nhất là cách hệ thống định tuyến mỗi yêu cầu qua ba tầng theo thứ tự chi phí tăng dần (Hình [[ref:fig_s06_tiers]]).

- **Tầng 0, xử lý cục bộ.** Nhận diện nét vẽ, quy tắc nghiệp vụ và bộ nhớ đệm ngữ nghĩa chạy ngay trên máy giáo viên. Chi phí đám mây bằng không và độ trễ dưới 15 ms.
- **Tầng 1, đại số hình thức.** Thư viện SymPy kiểm chứng từng bước giải, cân bằng nguyên tử và biến đổi biểu thức một cách xác định. Tầng này vừa chính xác tuyệt đối vừa miễn phí. Về kinh tế, đây là lớp bảo vệ biên lợi nhuận gộp trước lạm phát token: khi giá hoặc mức tiêu thụ token của mô hình ngôn ngữ tăng, phần chi phí đó chỉ tác động lên 18,6% tác vụ còn lại, trong khi khối lượng phần lớn phục vụ học sinh vẫn có chi phí biên gần bằng không. Về sư phạm, việc để máy tính đại số quyết định đúng sai tránh được rủi ro mô hình ngôn ngữ "ảo giác" kết quả.
- **Tầng 2, mô hình ngôn ngữ lớn.** Chỉ gọi khi hai tầng trước không giải quyết được và chỉ để sinh câu hỏi gợi mở ngắn; đầu ra bị khóa cấu trúc nên không thể chứa lời giải hoàn chỉnh.

![Phân tầng xử lý và cơ chế zero-token: 81,4% tác vụ không tốn chi phí đám mây](startup-report-assets/fig_s06_tiers.png)

Kết quả là 81,4% tác vụ được giải quyết mà không phát sinh token, và chi phí tính toán bình quân chỉ khoảng 350 đồng cho mỗi tiết dạy, 3.800 đồng cho mỗi học sinh mỗi tháng.

## 3.2. Ma trận so sánh lợi thế cạnh tranh với các giải pháp hiện hữu

[[T:So sánh Socratic Vision Board với bốn nhóm giải pháp hiện hữu]]

| Tiêu chí | Phần mềm bảng truyền thống | Công cụ mô phỏng rời rạc | Ứng dụng giải bài trực tuyến | Bot đàm thoại văn bản | Socratic Vision Board |
|---|---|---|---|---|---|
| **Trải nghiệm trên bục giảng** | Giao diện nặng, nhiều thanh công cụ che bảng. | Chuyển nhiều cửa sổ, phụ thuộc chuột và thanh trượt. | Không hỗ trợ màn hình tương tác. | Không tối ưu cho màn hình cảm ứng lớn. | Nền bảng trong suốt, biến hình học tại chỗ từ nét vẽ. |
| **Tương tác mô phỏng** | Hình tĩnh hai chiều, không thao tác được. | Mô phỏng tốt nhưng phụ thuộc thanh trượt. | Hoàn toàn không có mô phỏng động học. | Không có mô phỏng trực quan, chỉ giải thích bằng lời. | Chạm trực tiếp để xoay mô hình 3D, cắt thiết diện ở 60 khung hình/giây. |
| **Phòng chống sao chép lời giải** | Không có AI. | Không có AI. | Cung cấp toàn bộ lời giải, tạo thói quen sao chép. | Dễ bị khai thác câu lệnh để lấy kết quả. | Rào chắn sư phạm kiên quyết không cung cấp đáp án sẵn. |
| **Liền mạch lớp và nhà** | Không đồng bộ sau khi xóa bảng. | Tách rời tiến trình tiết dạy. | Không liên quan bài giảng cụ thể. | Học theo nội dung riêng của ứng dụng. | Đồng bộ bài giảng qua mã QR vector dưới 60 KB. |
| **Chi phí vận hành công nghệ** | Miễn phí nhưng không thông minh. | Miễn phí hoặc bản quyền cố định. | Chi phí gọi máy chủ từ xa rất cao. | Chi phí thuê bao dịch vụ hàng tháng cao. | 81,4% tác vụ xử lý cục bộ, không tốn tài nguyên đám mây. |
| **Tương thích đề thi mới** | Phụ thuộc giáo viên tự soạn. | Chỉ hình học cơ bản, không có dạng trắc nghiệm mới. | Chưa cập nhật cấu trúc Đúng/Sai bốn ý. | Chưa bám cấu trúc đề thi Việt Nam. | Thiết kế riêng cho Đúng/Sai bốn ý và trả lời ngắn. |

![Định vị cạnh tranh theo hai trục: tương tác thực nghiệm và bảo vệ tư duy người học](startup-report-assets/fig_s15_positioning.png)

## 3.3. Lợi thế cạnh tranh phòng thủ bền vững

1. **Lợi thế về biên lợi nhuận vận hành.** Các giải pháp AI thông thường phải chi 45% đến 60% doanh thu cho hạ tầng suy luận. Socratic Vision Board giải quyết 81,4% tác vụ bằng đại số hình thức và bộ nhớ đệm cục bộ, nên biên lợi nhuận gộp dự phóng duy trì ở mức 89,5% (ngưỡng thiết kế thận trọng 88%). Nếu chỉ xét chi phí hạ tầng, chênh lệch khoảng 35 đến 50 điểm phần trăm so với mặt bằng ngành là nguồn tái đầu tư vào học liệu và mở rộng thị trường, đồng thời cho phép dự án đặt giá thấp mà vẫn bền vững: đối thủ có cấu trúc chi phí cao không thể theo đuổi chiến lược giá này mà không chịu lỗ.
2. **Lợi thế về cơ sở dữ liệu nhận thức độc quyền.** Mỗi lượt tương tác trên lớp và mỗi bài tự học đóng góp vào kho dữ liệu về những nhầm lẫn phổ biến của học sinh phổ thông theo chương trình mới. Dữ liệu này tạo hiệu ứng mạng dữ liệu: càng nhiều người dùng, câu hỏi gợi mở càng trúng điểm nghẽn, sản phẩm càng tốt hơn, và đối thủ mới không thể sao chép trong thời gian ngắn.
3. **Chi phí chuyển đổi cao đối với người dùng.** Khi giáo viên đã xây kho bài giảng dạng vector và học sinh đã tích lũy hồ sơ tiến bộ liên tục, chuyển sang nền tảng khác làm gián đoạn toàn bộ tiến trình sư phạm. Chi phí chuyển đổi này làm tăng giá trị vòng đời khách hàng mà không cần ràng buộc hợp đồng.

---

# 4. KHÁCH HÀNG MỤC TIÊU

Dự án phục vụ ba nhóm khách hàng chi trả với cơ chế ra quyết định khác nhau. Việc tách người chi trả khỏi người sử dụng là điều kiện để thiết kế đúng thông điệp bán hàng: nhà trường mua tính khai thác thiết bị và kiểm định chất lượng, phụ huynh mua kết quả học tập của con, giáo viên mua thời gian và uy tín chuyên môn.

[[T:Ma trận người ra quyết định mua và người trực tiếp sử dụng]]

| Tiêu chí | Cơ sở giáo dục và trường học | Hộ gia đình và học sinh | Giáo viên chuyên môn |
|---|---|---|---|
| **Người ra quyết định chi trả** | Hiệu trưởng, hội đồng quản trị hoặc ban quản lý trang thiết bị. | Phụ huynh có con học THCS và THPT. | Giáo viên bộ môn dạy nâng cao hoặc giáo viên bồi dưỡng độc lập. |
| **Người trực tiếp sử dụng** | Giáo viên bộ môn và toàn thể học sinh ở các phòng học có thiết bị. | Học sinh tự học tại nhà để củng cố bài và chuẩn bị thi. | Giáo viên và học sinh các lớp bồi dưỡng chuyên đề riêng. |
| **Khó khăn và mong muốn chi trả** | Màn hình chưa được dùng hiệu quả; áp lực đổi mới phương pháp và đánh giá. | Con gặp khó khăn học tập; gia sư đắt; cần giải pháp đồng hành tin cậy. | Cần công cụ trực quan hóa chuyên nghiệp để tiết kiệm thời gian vẽ hình và nâng uy tín. |
| **Khả năng và nguồn ngân sách** | Chi thường xuyên hoặc kinh phí ứng dụng công nghệ thông tin: 12 đến 24 triệu đồng/năm. | Kinh phí học tập của con: khoảng 100.000 đến 150.000 đồng/tháng. | Thu nhập từ hoạt động chuyên môn: khoảng 300.000 đồng/tháng. |
| **Thời gian ra quyết định mua** | 1 đến 3 tháng với trường tư; 3 đến 6 tháng với trường công theo chu kỳ năm học. | 1 đến 3 ngày sau khi học sinh trải nghiệm bài giảng mẫu từ lớp về nhà. | 7 đến 14 ngày sau khi dùng thử trong tiết thao giảng thực tế. |

Chu kỳ ra quyết định phân hóa mạnh (từ 1 đến 3 ngày so với 3 đến 6 tháng) có hàm ý trực tiếp về dòng tiền: kênh hộ gia đình tạo doanh thu nhanh để tài trợ vòng quay vốn trong khi kênh trường công đang đi qua chu kỳ ngân sách. Mức giá 119.000 đồng/tháng nằm trong khoảng ngân sách 100.000 đến 150.000 đồng/tháng mà phụ huynh sẵn sàng dành cho học tập, tức không đòi hỏi họ tái phân bổ ngân sách.

---

# 5. MÔ HÌNH DOANH THU VÀ PHƯƠNG THỨC BÁN HÀNG

## 5.1. Cơ chế lan tỏa tự nhiên từ lớp học về nhà

Điểm độc đáo trong cách tiếp cận thị trường là dự án không dựa vào chiến dịch quảng cáo tốn kém. Chính bục giảng là kênh phân phối.

- Mỗi tiết học dùng phần mềm kết thúc bằng một mã liên kết bài học hiển thị trên bảng.
- Khoảng 70% đến 80% học sinh trong lớp chủ động quét mã để lưu bài giảng vector vào máy cá nhân, hoàn toàn miễn phí.
- Ở nhà, học sinh có phiên tự học cùng trợ lý gợi mở; phụ huynh nhận báo cáo phản ánh sự kiên trì thực chất của con.
- Sau thời gian trải nghiệm, 5% đến 8% học sinh chuyển sang gói nâng cao, với chi phí thu hút người dùng mới xấp xỉ bằng không.

![Vòng lan tỏa tự nhiên từ bảng ghi chú thông minh QR đến gói trả phí](startup-report-assets/fig_s07_flywheel.png)

**Vì sao mã QR đưa chi phí thu hút khách hàng B2C về gần bằng không.** Trong công nghệ giáo dục, chi phí thu hút khách hàng thường bị chi phối bởi quảng cáo trả tiền, chiết khấu đại lý và chi phí chuyển đổi người dùng từ nhận biết thương hiệu sang dùng thử. Mô hình QR loại bỏ ba khoản này bằng ba cơ chế. Một, dùng thử diễn ra ngay sau một trải nghiệm tích cực (chính tiết học vừa kết thúc), nên không cần chi phí gây chú ý. Hai, người phát tán là giáo viên, một nguồn có uy tín cao hơn mọi quảng cáo, và việc phát tán là sản phẩm phụ của công việc giảng dạy hằng ngày. Ba, mỗi tiết học trên lớp tạo ra tập khách hàng tiềm năng đã được sàng lọc (học sinh đã biết sản phẩm, phụ huynh nhận thấy tiến bộ) với chi phí biên là chi phí tính toán của một tiết dạy, tức 350 đồng. Vì vậy, chi phí thu hút một khách hàng trả phí chỉ khoảng 38.500 đồng (xem Mục 8.2), tương đương khoảng 2.100 đến 2.900 đồng cho mỗi học sinh dùng thử khi tính theo tỷ lệ chuyển đổi 5,5% đến 7,5%. Mức này thấp hơn nhiều lần so với mặt bằng của ngành.

## 5.2. Cơ cấu các nguồn thu chính

[[T:Cơ cấu nguồn thu và đơn giá niêm yết]]

| Nguồn doanh thu | Khách hàng chi trả | Gói sản phẩm và dịch vụ | Đơn giá niêm yết | Tỷ trọng năm 3 (tính lại) |
|---|---|---|---|---|
| **Thuê bao tự học cá nhân** | Học sinh, phụ huynh | Phiên đàm thoại gợi mở không giới hạn, toàn bộ công cụ trực quan, ngân hàng câu hỏi phân tích. | • Gói tháng: 119.000 đ/tháng<br>• Gói năm: 1.190.000 đ/năm<br>• Gói chuyên sâu: 169.000 đ/tháng | **72,3%** |
| **Bản quyền trường học thường niên** | Trường phổ thông, trung tâm giáo dục | Cài đặt trên toàn bộ màn hình tương tác của trường, bản đồ năng lực, hỗ trợ kỹ thuật. | • Cơ bản: 12.000.000 đ/năm<br>• Nâng cao: 24.000.000 đ/năm<br>• Tập huấn: 4.000.000 đ/đợt | **18,6%** |
| **Bản quyền giáo viên chuyên môn** | Giáo viên bồi dưỡng độc lập | Bộ công cụ chuẩn bị bài giảng, xuất dữ liệu đa định dạng, quản lý học sinh không giới hạn. | • Gói tháng: 299.000 đ/tháng<br>• Gói năm: 2.490.000 đ/năm | **4,8%** |
| **Hợp tác tích hợp thiết bị phần cứng** | Đơn vị phân phối màn hình tương tác | Cài đặt sẵn phần mềm trong dòng sản phẩm, chia sẻ doanh thu khi kích hoạt. | Chia sẻ 15% đến 20% giá trị bản quyền kích hoạt theo thiết bị. | **4,3%** |

Gói năm 1.190.000 đồng tương ứng mức giá hiệu dụng 99.167 đồng/tháng, tức chiết khấu 16,7% so với gói tháng (tương đương mua 10 tháng được 12 tháng). Cấu trúc này thúc đẩy cam kết dài hơn và kéo dài thời gian sử dụng bình quân (8,5 tháng) trước kỳ ôn thi. Tỷ trọng các nguồn thu được tính lại từ doanh thu năm thứ ba ở Mục 8.1 và là kết quả của phép chia từng khoản doanh thu cho tổng 23.238 triệu đồng.

---

# 6. CƠ CẤU CHI PHÍ ĐẦU TƯ BAN ĐẦU VÀ VẬN HÀNH

## 6.1. Dự toán ngân sách đầu tư ban đầu

[[T:Dự toán đầu tư ban đầu phục vụ nghiên cứu và thử nghiệm]]

| Nhóm hạng mục | Nội dung công việc và trang thiết bị | Thành tiền (đồng) | Mục đích và kết quả bàn giao |
|---|---|---|---|
| **Thiết bị thử nghiệm cảm ứng** | Khung cảm ứng hồng ngoại 86 inch và màn hình cảm ứng thử nghiệm | 54.000.000 | Tinh chỉnh thuật toán nhận diện chữ viết và xử lý tì tay trên nhiều công nghệ màn hình. |
| **Thiết bị xử lý và máy tính bảng** | Máy tính mini chạy bảng tương tác và máy tính bảng học sinh | 63.000.000 | Đo hiệu năng hiển thị 60 khung hình/giây và tương thích thiết bị học tập. |
| **Hạ tầng máy chủ và lưu trữ** | Thuê máy chủ đám mây và cơ sở dữ liệu thử nghiệm 12 tháng | 42.000.000 | Duy trì truyền dữ liệu thời gian thực và lưu bài giảng vector thử nghiệm. |
| **Dịch vụ AI phục vụ kiểm thử** | Gọi dịch vụ mô hình ngôn ngữ lớn kiểm thử giai đoạn đầu | 25.000.000 | Tinh chỉnh bộ câu hỏi gợi mở sư phạm, thử độ chính xác bước giải. |
| **Bản quyền và pháp lý** | Đăng ký quyền tác giả phần mềm và thủ tục sở hữu trí tuệ | 20.000.000 | Xác lập quyền tác giả mã nguồn và nhãn hiệu. |
| **Tổ chức thực nghiệm thực địa** | Đi lại, tài liệu in, hỗ trợ kỹ thuật tại các trường tham gia | 16.000.000 | Thu thập và xử lý số liệu 412 học sinh, 18 giáo viên. |
| **TỔNG ĐẦU TƯ BAN ĐẦU** | n/a | **220.000.000** | Tối ưu chi phí nhờ sự bảo trợ của nhà trường và cố vấn. |

Kiểm tra tổng: $54 + 63 + 42 + 25 + 20 + 16 = 220$ triệu đồng. Nhóm thiết bị chiếm $(54+63)/220 = 53{,}2\%$, phù hợp tính chất phần mềm gắn với phần cứng cảm ứng. Với khoản đầu tư 220 triệu đồng, dự án đã tạo ra bộ số liệu thực nghiệm 412 học sinh, một tài sản bằng chứng có giá trị cao hơn nhiều lần chi phí bỏ ra.

## 6.2. Phân tích chi phí vận hành đơn vị

Hệ thống kiểm soát chi phí thông qua phân luồng xử lý (Hình [[ref:fig_s06_tiers]]).

- **Chi phí cho mỗi tiết dạy trên lớp.** Bình quân mỗi tiết có 4,3 lần nhận diện nét vẽ. Với 81,4% tác vụ xử lý cục bộ, chỉ 18,6% tác vụ phức tạp cần gửi lên đám mây. Tổng chi phí tính toán cho mỗi tiết khoảng 350 đồng.
- **Chi phí cho mỗi học sinh tự học hằng tháng.** Một học sinh tích cực thực hiện bình quân 30 phiên học mỗi tháng. Nhờ xử lý biểu thức và kiểm tra bước giải bằng đại số hình thức, chi phí AI và lưu trữ tiến trình chỉ khoảng 3.800 đồng mỗi tháng. So với phí thuê bao 119.000 đồng, đóng góp biên trên mỗi học sinh là $119.000 - 3.800 = 115.200$ đồng, tức 96,8%.

![Kinh tế đơn vị: CAC, LTV và chi phí biến đổi trên mỗi học sinh](startup-report-assets/fig_s14_unit.png)

Biên đóng góp 96,8% ở cấp học sinh cao hơn biên lợi nhuận gộp toàn công ty (89,5%) vì biên gộp còn gồm chi phí hạ tầng phân bổ, phí cổng thanh toán, chi phí hỗ trợ giao hàng cho hợp đồng trường và phần chia sẻ doanh thu đối tác. Ngưỡng thiết kế thận trọng 88% thấp hơn mức dự phóng khoảng 1,5 điểm phần trăm để dự phòng sai số giả định.

## 6.3. Dự toán chi phí vận hành thường xuyên trong ba năm đầu

[[T:Dự toán chi phí hoạt động thường xuyên (đồng)]]

| Khoản mục | Năm thứ nhất | Năm thứ hai | Năm thứ ba | Cơ chế kiểm soát và tối ưu |
|---|---|---|---|---|
| **Hỗ trợ nghiên cứu và kỹ thuật** | 336.000.000 | 720.000.000 | 1.440.000.000 | Thù lao hỗ trợ nghiên cứu cho nhóm kỹ thuật và cộng tác viên công nghệ. |
| **Nhân sự triển khai và hỗ trợ** | 72.000.000 | 300.000.000 | 780.000.000 | Nhân sự tập huấn thực địa và chăm sóc khách hàng. |
| **Thuê máy chủ và băng thông** | 54.000.000 | 180.000.000 | 540.000.000 | Điều chỉnh quy mô hạ tầng linh hoạt theo số người dùng. |
| **Truyền thông và sự kiện** | 60.000.000 | 240.000.000 | 600.000.000 | Cuộc thi học thuật trực tuyến, hội thảo chuyên môn. |
| **Văn phòng và hành chính** | 42.000.000 | 120.000.000 | 300.000.000 | Tận dụng không gian hỗ trợ khởi nghiệp tại đơn vị giáo dục đối tác. |
| **Pháp lý và dự phòng phát sinh** | 24.000.000 | 60.000.000 | 180.000.000 | Dự phòng kiểm định chất lượng và hỗ trợ kỹ thuật phát sinh. |
| **TỔNG CHI PHÍ HOẠT ĐỘNG MỖI NĂM** | **588.000.000** | **1.620.000.000** | **3.840.000.000** | Bảo đảm chủ động và cân đối dòng tiền theo giai đoạn. |

![Cơ cấu chi phí hoạt động thường xuyên theo khoản mục, ba năm đầu](startup-report-assets/fig_s10_opex.png)

Chi phí máy chủ tăng từ 54 lên 540 triệu đồng (gấp 10 lần) trong khi doanh thu tăng 12,4 lần ($23.238 / 1.879{,}4$), nghĩa là chi phí hạ tầng tăng chậm hơn doanh thu. Đó là bằng chứng số học của hiệu ứng đòn bẩy vận hành do kiến trúc xử lý cục bộ.
