# Câu hỏi Hội đồng có thể hỏi và hướng trả lời

Tiêu chí 5 (15%) yêu cầu giáo viên "trả lời các câu hỏi và thuyết phục ban giám khảo về giá trị của sản phẩm". Vòng chung kết dự kiến 05/12/2026 (TP. Hồ Chí Minh). Các trả lời dưới đây chỉ dùng số liệu đã có trong `pilot2026.json` và code; chỗ **[ĐIỀN]** là sự thật chỉ thầy biết. Hãy sửa bằng lời của thầy.

## A. Về bằng chứng tác động

**1. Kết quả có đáng tin không, khi chỉ 4 tuần và N = 86?**
Thừa nhận ngay: đây là thí điểm quy mô nhỏ, hai chủ đề. Điểm mạnh là có nhóm đối chứng, hai nhóm tương đương trước thí điểm (6,42 so với 6,48; p = 0,81), chênh lệch sau thí điểm 0,89 điểm (p = 0,0002, d = 0,88), và hiệu quả tập trung đúng ở nơi sản phẩm nhắm tới: Phần II Đúng/Sai +25,8 điểm phần trăm, Phần III nhiều bước +22,5, trong khi Phần I trắc nghiệm chỉ +2,8. Bước tiếp theo là mở rộng toàn khối 10–12 và nhờ đánh giá độc lập.

**2. Nhóm thực nghiệm và đối chứng được chia thế nào? Có thiên lệch không?**
**[ĐIỀN: chia theo lớp hay ngẫu nhiên; giáo viên dạy hai nhóm có khác nhau không]**. Nói rõ: nhóm thực nghiệm có 12 học sinh chuyên và 32 học sinh THPT; điểm đầu vào hai nhóm tương đương nên chênh lệch sau thí điểm không do đầu vào. Không khẳng định quan hệ nhân quả tuyệt đối.

**3. Đề kiểm tra ai ra? Có chấm khách quan không?**
**[ĐIỀN: người ra đề, người chấm, có chấm chéo không]**. Đề theo cấu trúc đề thi tốt nghiệp THPT từ 2025 (ba phần).

**4. Tại sao tăng mạnh ở Đúng/Sai và trả lời ngắn mà không tăng ở trắc nghiệm?**
Hai phần này đòi hỏi hiểu điều kiện biên, lập luận nhiều bước, nên khớp với thiết kế của sản phẩm: mô phỏng cho học sinh thấy hậu quả khi bỏ một điều kiện (ví dụ quên lực ma sát), gia sư buộc đi từng bước thay vì chép đáp án. Trắc nghiệm có thể đoán nên ít thay đổi.

## B. Về AI có trách nhiệm

**5. Học sinh có lách được bộ chặn để xin đáp án không?**
Có, và đã gặp: tuần 1 có 6 lượt lách bằng cách nhập vai gián tiếp. Đã thêm bước kiểm tra đầu ra (lọc mọi con số trùng đáp án trước khi gửi cho học sinh) và đo lại; tổng cộng chặn 312/318 lượt (98,1%) trong 4 tuần. Không khẳng định 100%. Kiểm thử trong code gồm bốn kiểu: chèn lệnh, xin đáp án, hỏi Đúng/Sai, ép gấp.

**6. AI đọc sai nét chữ thì sao?**
Giáo viên sửa bằng một chạm (Tap & Swap) chọn một trong các cách đọc thay thế, không cần bàn phím; có nút quay lại nét viết tay. Mô phỏng chạy theo công thức đã xác nhận, không theo "đoán" của AI.

**7. Dữ liệu học sinh có bị gửi lên AI không?**
Chỉ gửi ảnh nét chữ được khoanh (khoảng 8 KB, nền trắng); không gửi ảnh lớp học hay khuôn mặt. Dữ liệu học tập (điểm, lượt hỏi) lưu ở **[ĐIỀN: máy chủ nào, ai quản lý]**. Hướng phát triển: thử mô hình chạy tại trường để không cần ra ngoài mạng.

**8. Nếu Gemini đổi giá hoặc ngừng dịch vụ?**
Gọi AI chỉ khoảng 4,3 lần mỗi tiết và 81,4% phiên gia sư không tốn token; mô phỏng chạy ở trình duyệt nên sản phẩm vẫn dùng được phần lớn. **[Xác nhận trong code trước khi nói: lớp gọi Gemini nằm ở `services/ai-engine` (ví dụ `routers/visualize.py`) và có tách riêng để đổi nhà cung cấp được hay không]**; nếu chưa tách, nói thẳng đó là việc cần làm.

## C. Về sáng tạo và so sánh

**9. Khác gì GeoGebra, Desmos, PhET hay ChatGPT?**
Các công cụ mô phỏng có sẵn cần giáo viên tìm và dựng trước; ChatGPT giải trọn bài hoặc sinh ảnh/video theo lượt, chậm và tính tiền. Socratic Vision Board dựng mô phỏng từ chính nét viết của giáo viên giữa tiết, kéo thanh trượt tức thì không tốn API, và phía tự học thì chủ động không giải hộ. Điểm mới là sự kết hợp hai nửa này trong một vòng khép kín (QR cuối giờ, gia sư ở nhà, bản đồ nhiệt sáng hôm sau).

**10. Có thật là "AI không sinh ảnh" không? Mô phỏng có đúng khoa học không?**
Mô phỏng do bốn bộ máy tính theo định luật chạy tại trình duyệt; AI chỉ trả dữ liệu (công thức, tham số). Khi AI không nhận ra, có sơ đồ SVG dự phòng chỉ dùng ngoài thư viện mẫu. SymPy kiểm tra thứ nguyên và tương đương đại số.

## D. Về nhân rộng và bền vững

**11. Trường khác muốn dùng thì cần gì? Tốn bao nhiêu?**
Màn hình tương tác sẵn có, trình duyệt, một máy chủ Python và khóa dịch vụ Gemini. Chi phí AI đo trong thí điểm khoảng 0,014 USD (≈ 350 đồng) mỗi tiết. **[ĐIỀN: đã có trường/giáo viên nào ngoài nhóm thí điểm thử chưa; có hướng dẫn cài đặt chưa]**

**12. Có chịu được cả trường dùng cùng lúc không?**
**[ĐIỀN số đồng thời đã đo, nếu có]**. Nếu chưa đo, nói thật: thí điểm 7 giáo viên và 86 học sinh; lớp mô phỏng chạy tại máy khách nên tải máy chủ chủ yếu ở phần gia sư.

## E. Về chất lượng kỹ thuật (nếu được hỏi sâu)

**13. Kiểm thử thế nào?**
Bộ kiểm thử tự động chạy ngày 25/10/2026: máy chủ (pytest) 22/22 bài đạt; giao diện (Vitest) 101/101 bài đạt trên 12 tệp. Đây là kiểm thử chức năng và hợp đồng dữ liệu, chưa thay thế đánh giá độc lập. Không nêu "100% đạt" từ `TEST_REPORT.md`; chạy lại ngay trước chung kết và nói số thật lúc đó.

**14. Sản phẩm này có do thầy tự làm không, khi dùng cả Claude Code?**
Trả lời thẳng như phần kê khai: công cụ AI hỗ trợ viết mã và làm hồ sơ; ý tưởng, thiết kế, tổ chức thí điểm, phân tích số liệu và quyết định do thầy làm và chịu trách nhiệm. **[Chuẩn bị ví dụ cụ thể về một quyết định thiết kế của thầy, ví dụ vì sao khóa bước sau, vì sao chặn xin đáp án]**

## F. Hai câu mở đầu luyện nói (30 giây)

"Chatbot trả lời giúp học sinh trong vài giây, nhưng bài toán là học sinh học được gì. Socratic Vision Board giữ lại phần khó nhất của việc học: học sinh phải tự nghĩ, còn AI chỉ đặt câu hỏi và biến nét phấn của thầy thành mô phỏng ngay giữa tiết."
