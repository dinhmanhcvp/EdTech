# Lời giọng thật đã chép và sửa lỗi nhận dạng (đối chiếu với kịch bản của nhóm)

Dòng có dấu `[?]` là chỗ nhận dạng không chắc; nghe lại và báo nếu sai.


## Đoạn 1 (`2026-11-10T07_09_02`, 51 giây)

Hiện nay, tỷ lệ học sinh sử dụng AI để làm bài tập đang gia tăng nhanh chóng.

Tuy nhiên, theo các nghiên cứu thực nghiệm, việc dùng các chatbot phổ thông để lấy thẳng đáp án lại khiến điểm kiểm tra sụt giảm 17%.

Điều này đặc biệt rủi ro với định dạng đề thi tốt nghiệp từ năm 2025 vốn yêu cầu thí sinh phải hiểu sâu bản chất.

Khảo sát thực tế của nhóm trên hơn 400 học sinh và giáo viên cũng cho thấy 64,1% học sinh đang chép nguyên đáp án AI, trong khi 77,8% giáo viên mới chỉ dùng màn hình tương tác để trình chiếu thụ động.

Các công cụ hiện hành đều có điểm yếu và chưa giải quyết được trọn vẹn bài toán này.

Do đó, nhóm đề xuất hệ thống Socratic Vision Board với 3 mục tiêu cốt lõi, tự động biến nét viết của giáo viên thành mô phỏng kiểm chứng được ngay trên lớp, mang mô hình đó về thiết bị cá nhân của học sinh và kiên quyết không giải hộ khi các em xin đáp án.


## Đoạn 2 (`2026-11-10T07_14_45`, 65 giây)

Thưa ban giám khảo, để phát triển và đánh giá chính xác tính hiệu quả của dự án này, chúng em đã tiến hành phương pháp nghiên cứu theo 4 bước vô cùng chặt chẽ.

Bước 1, khảo sát và đặt vấn đề.

Chúng em bắt đầu bằng việc nghiên cứu tài liệu và khảo sát thực trạng sử dụng AI cũng như mức độ lãng phí màn hình tương tác tại các trường trung học phổ thông để xác định chính xác nỗi đau của người học và người dạy.

Bước 2, thiết kế và xây dựng.

Từ các tiêu chí đã đặt ra, nhóm tiến hành thiết kế hệ thống Socratic Vision Board, lập trình các phân hệ và tích hợp thuật toán nhận dạng nét vẽ cùng hệ thống kiểm chứng đại số SymPy.

Bước 3, kiểm thử tự động.

Trước khi đưa vào trường học, phần mềm phải vượt qua hàng ngàn phép thử tự động để đảm bảo mô phỏng chạy mượt mà không có độ trễ, và đặc biệt là hệ thống phải chặn được 100% các câu hỏi xin đáp án của học sinh.

Bước 4, thực nghiệm sư phạm và phân tích số liệu.

Chúng em đã mang hệ thống vào lớp học thực tế và triển khai thử nghiệm có nhóm đối chứng trong suốt 8 tuần.

Thử nghiệm được thực hiện trên quy mô lớn với 412 học sinh và 18 giáo viên tại 3 mô hình trường, trường chuyên, công lập thành phố và tuyến huyện.


## Đoạn 3 (`2026-11-10T07_16_25`, 50 giây)

Để giải quyết trọn vẹn những rào cản hiện nay, hệ thống của chúng em được thiết kế theo mô hình 3 phân hệ đồng bộ thời gian thực, cụ thể gồm có Đầu tiên là Teacher Board.

Đây là giao diện bảng viết dành riêng cho giáo viên trên lớp.

Phân hệ này giúp thầy cô tương tác trực tiếp, thao tác viết vẽ tự nhiên và điều khiển mô phỏng ngay trên màn hình lớn mà hoàn toàn không làm đứt đoạn mạch giảng bài.

Tiếp theo là AI Engine Hub.

Đóng vai trò như bộ não trung tâm của toàn hệ thống.

Phân hệ này sẽ xử lý phân tích nét vẽ, tính toán các mô phỏng vật lý, đồng thời vận hành hàng rào sư phạm Socratic để đưa ra các gợi mở kịp thời.

Và cuối cùng là Student Companion, một ứng dụng đồng hành trên thiết bị cá nhân của học sinh.

Ứng dụng này giúp các em giải bài theo từng bước, tương tác trực tiếp với mô phỏng, và đặc biệt là tự sửa sai trực quan qua bộ công cụ Visual Debuggers.


## Đoạn 4 (`2026-11-10T07_17_35`, 48 giây)

Điểm mấu chốt là ba phân hệ này hoàn toàn không hoạt động rời rạc mà được liên kết chặt chẽ với nhau thông qua cơ chế đồng bộ thời gian thực để tạo thành một luồng vận hành khép kín.

Nói một cách dễ hiểu, mọi thao tác viết vẽ tự nhiên của giáo viên trên Teacher Board sẽ lập tức được truyền tải đến AI Engine Hub.

Tại đây, bộ não trung tâm sẽ đảm nhiệm việc phân tích nét vẽ, tính toán mô phỏng và lập tức phản hồi kết quả lên màn hình lớn của giáo viên.

Đồng thời, AI Engine Hub cũng đóng vai trò là chiếc cầu nối, đem đồng bộ toàn bộ nội dung bài giảng và mô phỏng này xuống thiết bị cá nhân của học sinh.

Nhờ vậy, khi các em tương tác tự giải bài ở nhà, mọi dữ liệu học tập lại được đẩy ngược về trung tâm giám sát.

Từ đó, hệ thống có thể vận hành hàng rào Socratic và kích hoạt kịp thời các công cụ gỡ lỗi trực quan, giúp học sinh tự nhận ra cái sai của mình.


## Đoạn 5 (`2026-11-10T07_18_29`, 74 giây)

Chính sự kết hợp nhịp nhàng này đã mang đến cho dự án 4 tính năng đột phá, giúp giải quyết triệt để bài toán dạy và học.

Tính năng thứ nhất, nhận dạng nét viết và khởi tạo mô phỏng tức thời.

Ngay trên lớp, AI sẽ nhận diện tức thời nét chữ, công thức của thầy cô và tự động chuyển hóa thành mô phỏng động ngay trên màn hình.

Nhờ đó, giáo viên không cần phải thoát khỏi bài giảng để đi tìm các video có sẵn nữa.

Tính năng thứ hai, hàng rào Socratic nói không với giải hộ.

Khi bài giảng đã được đồng bộ về nhà, nếu học sinh làm bài mà lại lười biếng yêu cầu xin đáp án, hệ thống sẽ lập tức kích hoạt hàng rào Socratic, tuyệt đối từ chối giải hộ để rèn luyện tính tự lập cho các em.

Tính năng thứ ba, hỗ trợ gỡ lỗi trực quan, visual debuggers.

Vậy nếu không đưa đáp án thì AI sẽ làm gì?

Hệ thống sẽ cung cấp các công cụ trực quan như đa giác lực hay cân bằng electron, để chính học sinh phải tự tương tác, tự quan sát và tự nhận ra lỗ hổng kiến thức của mình.

Và tính năng thứ tư, kiểm chứng vạn năng và định tuyến tại chỗ.

Để đảm bảo AI không bao giờ tính sai hay ảo giác, chúng em sử dụng hệ thống đại số SymPy để kiểm chứng mọi bước dài.

Thêm vào đó, hệ thống có thể tự xử lý tại chỗ hơn 80% tác vụ, mang lại tốc độ phản hồi siêu tốc và tiết kiệm tối đa chi phí nền tảng đám mây.


## Đoạn 6 (`2026-11-10T07_19_33`, 67 giây)

Và để vận hành trơn tru tất cả những tính năng vừa rồi, luồng dữ liệu của Socratic Vision Board sẽ được luân chuyển theo một chu trình khép kín gồm 4 bước rất chặt chẽ.

Bắt đầu ở bước 1, thu thập dữ liệu đầu vào tại lớp học.

Khi giáo viên thao tác trên bục giảng, dữ liệu thô từ nét viết tay đến hình vẽ sẽ được ghi nhận tức thời và gửi thẳng về trung tâm điều phối.

Ngay sau đó sang bước 2, phân tích và khởi tạo mô phỏng.

Bộ não AI Engine Hub tiếp nhận nét chữ, bóc tách ý nghĩa và tự động biên dịch thành mã mô phỏng, rồi lập tức đẩy kết quả hiển thị ngược lại lên bảng của giáo viên.

Tiếp đến là bước 3, đồng bộ hóa.

Ngay khi tiết học kết thúc, toàn bộ gói dữ liệu bài giảng và mô phỏng sẽ được AI Engine Hub đóng gói và đồng bộ trực tiếp xuống ứng dụng trên điện thoại của học sinh.

Và cuối cùng là bước 4, tương tác và đánh giá vấp ngã tại nhà.

Khi học sinh ngồi giải bài, dữ liệu câu trả lời sẽ được đẩy lại về AI Engine Hub và được kiểm chứng độc lập bởi SymPy.

Nếu phát hiện học sinh làm sai hoặc đang cố tình xin giải hộ, hệ thống sẽ lập tức chặn luồng đáp án, thay vào đó kích hoạt hàng rào Socratic và trả về các công cụ gỡ lỗi trực quan để các em tự khắc phục.


## Đoạn 7 (`2026-11-10T07_25_58`, 52 giây)

Để chứng minh giải pháp này thực sự hiệu quả, chúng em không chỉ dừng ở lý thuyết.

Nhóm đã tiến hành một thử nghiệm đối chứng nghiêm ngặt trong suốt 8 tuần với 412 học sinh và 18 giáo viên tại 3 mô hình trường trung học phổ thông, trường chuyên, trường công lập thành phố và trường huyện.

Về năng lực học tập, nhóm học sinh sử dụng Socratic Vision Board có điểm số tăng vượt trội, cao hơn nhóm đối chứng gần 1 điểm, 0,92 điểm, trên thang điểm 10.

Mức chênh lệch này rất có ý nghĩa thống kê.

Và đặc biệt, phần thi Đúng/Sai, đòi hỏi hiểu bản chất lại là phần học sinh tiến bộ nhanh nhất.

Về mặt công nghệ, hệ thống đã chặn thành công 98% các yêu cầu xin thẳng đáp án của học sinh, ép các em phải động não suy nghĩ.

Và một điểm đột phá về chi phí.

Nhờ cơ chế thông minh, 81,3% lượng truy cập tự học đã được xử lý ngay tại chỗ mà không cần phải gọi API lên đám mây, giúp tiết kiệm chi phí vận hành rất lớn.


## Đoạn 8 (`2026-11-10T07_26_58`, 34 giây)

Tuy nhiên, nghiên cứu của chúng em còn một số hạn chế minh bạch.

Việc chia nhóm thực hiện theo lớp có sẵn, quy mô 12 lớp mang tính mô tả và hệ thống kiểm chứng vẫn cần kết nối máy chủ.

Hướng phát triển tiếp theo của đề tài là đưa bộ đọc chữ viết tay xử lý trực tiếp trên thiết bị để hoạt động ngoại tuyến, đồng thời mở rộng thử nghiệm ngẫu nhiên kéo dài trọn một học kỳ.

Kính thưa ban giám khảo, dự án đã chứng minh giải pháp chuyển đổi nét viết trên bảng thành mô hình tương tác kết hợp gia sư không giải hộ, giúp học sinh nâng cao rõ rệt kết quả học tập và hiểu sâu bản chất môn học.

Em xin chân thành cảm ơn và sẵn sàng nhận câu hỏi từ ban giám khảo.
