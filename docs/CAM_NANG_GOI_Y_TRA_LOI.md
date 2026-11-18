# Gợi ý trả lời (đối chiếu với bộ câu hỏi)

Mỗi gợi ý là mẫu để hiểu ý, không phải bài học thuộc. Nói bằng lời của em, giữ đúng nhãn Đã đo / Chạy được / Mục tiêu. Câu so sánh dùng nhịp C - K - B (Công nhận, Khác biệt, Bằng chứng).


## A. Nhận dạng chữ và công thức


### Q1. Em có tự huấn luyện mạng nơ-ron không?
> **Nói:** "Dạ không. Bộ nhận dạng của em là so khớp mẫu và luật hình học. Chọn thế vì nhanh, giải thích được từng bước, không cần GPU, chạy ngoại tuyến. Chỗ khó như chữ tiếng Việt có dấu thì đã có AI đám mây dự phòng."
- Đừng nói: "em dùng deep learning". Sai và dễ bị hỏi sâu.

### Q2. Vì sao khoảng cách Chamfer phải hai chiều?
> **Nói:** "Chiều đi hỏi nét em có nằm trên mẫu không. Chiều về hỏi mẫu có bị em bỏ sót nét không. Nếu chỉ có chiều đi, một vạch thẳng khớp hoàn hảo với chữ L hay chữ B, vì mọi điểm của vạch đều nằm trên 'xương sống' của chữ đó." (Dùng ví dụ 0 và 0,6 ở trên.)

### Q3. Vì sao lấy đúng 32 điểm, vì sao lưới 6 × 6, vì sao giữ 160 mẫu?
> **Nói:** "Đây là các tham số em chọn bằng thử nghiệm để cân bằng tốc độ và độ đúng: 32 điểm đủ giữ hình dạng, lưới 6 × 6 lọc rất rẻ, giữ 160 mẫu để bước so kỹ không quá chậm. Em chưa chạy tìm kiếm tối ưu có hệ thống các tham số này."
- Trung thực: đừng bịa lý do toán học cho các hằng số.

### Q4. Nhận dạng đúng bao nhiêu phần trăm?
> **Nói:** "Top-1 khoảng 85 đến 89%, đây là ước tính nội bộ của nhóm, chưa có kiểm định độc lập. Vì vậy thiết kế của em dựa vào sửa nhanh: chip đổi một chạm, sửa trực tiếp LaTeX. Bước tiếp theo là thu tập mẫu của nhiều bạn để đo độc lập."
- Đừng nói: "đúng 100%", "đúng 95%". Cũng đừng nói "81,4% nhận đúng": con số đó là tỉ lệ xử lý không cần AI, không phải độ đúng.

### Q5. Nó đọc được chữ tiếng Việt viết tay không?
> **Nói:** "Bộ trên máy đọc ký hiệu toán. Chữ tiếng Việt có dấu và chữ viết nối đi qua AI đám mây, cần mạng và mất vài giây."
- Đừng nói: "đọc tiếng Việt ngoại tuyến", "ảnh gửi lên là WebP dưới 15 KB". Theo mã `isolatedExporter.ts`, ảnh xuất là PNG.

### Q6. Viết nghiêng, viết to nhỏ khác nhau thì sao?
> **Nói:** "Có ba lớp bất biến. Nghiêng: em ước lượng độ nghiêng rồi nắn lại bằng phép cắt hình. To nhỏ: mọi ngưỡng chia cho chiều cao chữ tham chiếu và đám điểm đưa về khung đơn vị. Nhanh chậm: lấy mẫu lại 32 điểm cách đều theo độ dài cung."

### Q7. Làm sao biết `2` ở trên là số mũ chứ không phải số 2 viết cao?
> **Nói:** "Em so đáy của ký hiệu với đường cơ sở của ký hiệu đứng trước. Nếu cao hơn rõ rệt và nhỏ hơn thì là số mũ; thấp hơn là chỉ số dưới. Đường cơ sở tính riêng cho từng dòng nên dòng viết hơi dốc vẫn đúng. Giới hạn: đường cơ sở em tính theo các ký tự không thò xuống, nên chữ như g, y, p được xử lý riêng bằng bảng tra."

### Q8. Chống tì tay như thế nào?
> **Nói:** "Khi bảng nhận tín hiệu bút, em đóng băng mọi chạm bằng da trong 1.500 mili-giây. Em đặt 1.500 mili-giây theo thử nghiệm của nhóm, chưa phải một hằng số khoa học."

### Q9. Union-Find dùng ở đâu, độ phức tạp ra sao?
> **Nói:** "Em dùng hai nơi: gom nét thành ký hiệu, và gom các đầu mút gần nhau thành một đỉnh khi nhận hình. Có nén đường đi nên gần tuyến tính theo số phần tử."

### Q10. Sao không dùng AI đám mây cho tiện, đỡ phải viết thuật toán?
> **Nói:** "Có ba lý do em đo được hoặc tính được: mỗi lần gọi mất từ 1 đến 3 giây làm đứt mạch viết; tốn tiền mỗi lượt; và trường nào mất mạng thì mất luôn. Đo trên 15.798 lượt tự học, 81,3% không phải gọi mô hình AI. Chỗ nào cần AI thì em vẫn dùng."

## B. Nhận dạng hình


### Q11. Hình tròn, elip em nhận thế nào?
> **Nói:** "Có hai chỗ. Nét một đường tròn đơn có bộ phát hiện nhanh trong `shapeRecognizer.ts`: đầu cuối gần nhau thì là đường cong khép kín và được nắn thành tròn; đầu cuối xa nhưng đường đi gần thẳng thì là đoạn thẳng. Với hình đa diện, nét cong khiến bộ nhận khối trả về không nhận, tránh nhận nhầm."
- **Đừng nói:** "em dùng thuật toán $1 Unistroke". Dòng chú thích đầu tệp ghi thế, nhưng mã hiện chỉ làm tròn và đoạn thẳng. Nói đúng việc mã làm.

### Q12. Nó nhận lập phương và hộp chữ nhật khác nhau thế nào?
> **Nói:** "Cùng cấu trúc 8 đỉnh 12 cạnh. Khác nhau ở tỉ lệ ba nhóm cạnh song song, em có hiệu chỉnh độ rút ngắn chiều sâu trong hình chiếu xiên rồi so tỉ lệ cạnh dài nhất với ngắn nhất."
- Giới hạn tự nói: vẽ xoay tùy ý thì ba cạnh rút ngắn khác nhau, nên em chỉ coi là hộp khi chênh rất lớn.

### Q13. Vẽ ẩu, đường không khép kín thì sao?
> **Nói:** "Nét gần kín (đầu cuối cách nhau dưới 9% cỡ hình) được khép lại. Đầu mút cách nhau dưới 8,8% cỡ hình coi là một đỉnh. Nếu vẫn không khớp cấu trúc nào, hệ thống không đoán bừa mà trả về không nhận, rồi thử chữ viết hoặc hỏi lại."

### Q14. Có nhận ra hình mà hơi lệch, ví dụ tam giác gần vuông?
> **Nói:** "Có ngưỡng khoan dung: góc lệch 90° không quá 11° thì coi là vuông. Ngưỡng này em chọn tay, nhìn từ các hình giáo viên vẽ; chưa tối ưu trên tập lớn."

### Q15. Sau khi nhận ra, hình làm được gì?
> **Nói:** "Hình hiện thành đối tượng có đỉnh, cạnh, số đo, nên kéo một đỉnh thì các quan hệ như phân giác, trung trực chạy theo; khối thì có thể xoay, cắt thiết diện, khai triển (phần 5.3)."

## C. Từ công thức đến hình trực quan


### Q16. AI sai thì hình có sai không?
> **Nói:** "Hình không do AI vẽ. AI nếu có chỉ dịch nét thành công thức và tham số. Hình do mô hình toán em viết từ phương trình vẽ ra, nên với cùng công thức hình luôn như nhau. Nếu AI đọc sai công thức thì hình sai theo công thức đó, vì vậy công thức luôn hiện cạnh hình để thầy cô nhìn thấy và sửa."
- Đừng nói: "hình luôn đúng". Nói "hình luôn đúng với công thức đang hiển thị".

### Q17. Sao không dùng thư viện vẽ đồ thị có sẵn?
> **Nói:** "Em cần ba thứ thư viện thường không cho: nhận công thức viết kiểu học sinh Việt (`tg`, `2x`, `sin²x`), thanh trượt tự sinh từ tham số, và báo điểm đặc biệt có tên đỉnh. Phần phân tích cú pháp khoảng 550 dòng em tự viết."

### Q18. Tại sao ngắt nét ở tiệm cận?
> **Nói:** "Nếu nối mọi mẫu, `tan x` sẽ có vạch dọc nối hai nhánh. Em phát hiện bằng điều kiện: hai mẫu kề nhau trái dấu và nhảy hơn 1,5 lần chiều cao khung thì ngắt nét."

### Q19. Nghiệm tìm bằng gì, có chắc đủ nghiệm?
> **Nói:** "Quét 600 mẫu tìm chỗ đổi dấu rồi chia đôi. Giới hạn: nếu hai nghiệm nằm gần nhau hơn một khoảng lấy mẫu, hoặc hàm chạm trục mà không đổi dấu như x², thì có thể sót. Đó là giới hạn của phương pháp đổi dấu."

### Q20. Marching squares là gì, sao không giải y theo x?
> **Nói:** "Đường tròn `x² + y² = 4` không phải hàm của x. Marching squares chia khung thành ô, xét dấu F ở bốn góc, chỗ nào đổi dấu thì đường cong đi qua. Cách này vẽ được mọi đường cong ẩn, kể cả conic."

### Q21. Vì sao có RK4, không dùng Euler cho đơn giản?
> **Nói:** "Euler cộng dồn sai số, con lắc tự 'tăng năng lượng'. RK4 sai số mỗi bước cỡ h⁵. Trong ví dụ y' = −y bước 0,5, Euler ra 0,5, RK4 ra 0,6068, đáp án đúng 0,6065. Bảng còn hiện sai số năng lượng để kiểm tra."
- Đừng nói: "mô phỏng chính xác như phần mềm chuyên ngành". Nói: "mô hình giáo dục có giả định đơn giản hóa."

### Q22. Thiết diện tính thế nào, có phải AI?
> **Nói:** "Không phải AI, là hình học giải tích. Với mỗi cạnh em xét hai đầu nằm hai phía mặt phẳng không, nếu có thì tính giao điểm bằng nội suy. Rồi sắp các giao điểm theo góc quanh trọng tâm để ra đa giác."

### Q23. Làm sao chuyển nét khoanh thành đúng loại mô phỏng?
> **Nói:** "Có một bộ định tuyến chạy trên máy. Nó kiểm theo thứ tự: mô hình STEM đã có (dao động, ném xiên...), tên khối hình học, rồi phương trình đồ thị; chỉ khi chắc chắn mới tự dựng. Câu không rõ thì hỏi thầy cô hoặc mới gọi AI."

### Q24. Chỉ 4 môn, mà có 215 mô phỏng, sao không khoe?
> **Nói:** "Em không đua số mô phỏng. Một cách làm chạy được cho nhiều môn mới là điều em muốn chứng minh. Điều em đo là học sinh nghĩ được nhiều hơn."

## D. Gia sư Socratic


### Q25. Gia sư không giải hộ, vậy khác chatbot thường chỗ nào?
> **Nói:** "Chatbot thường tối ưu để trả lời nhanh. Gia sư của em tối ưu để học sinh tự đi được bước tiếp theo. Đo bằng dữ liệu: 1.504 trên 1.535 yêu cầu xin đáp án bị chặn, và nhóm dùng hệ thống hơn đối chứng 0,92 điểm."

### Q26. AI không phán đúng sai thì ai phán?
> **Nói:** "SymPy, thư viện tính toán ký hiệu, như máy tính biết rút gọn biểu thức. Hai biểu thức bằng nhau khi hiệu rút gọn về 0. AI chỉ được hỏi gợi mở. Đã đo: 300 lượt thử, 300 kết luận đúng, trung vị 3 mili-giây; phạm vi đa thức, phân thức, lượng giác, một đến hai biến."
- Giới hạn: câu hỏi mở và giải thích bằng lời không do SymPy phán.
- Khi demo dùng biến `z`, `k` thay `x`, `t` vì bộ kiểm thứ nguyên có thể báo nhầm.

### Q27. Học sinh lách luật, viết không dấu thì sao?
> **Nói:** "Tầng 0 chuẩn hóa văn bản trước khi so: bỏ dấu tiếng Việt, đổi đ thành d, bỏ ký tự ngăn cách, đổi 4 thành a, 0 thành o. Rồi mới so với mẫu tấn công. Số đo: 1.504 trên 1.535 yêu cầu bị chặn, 98,0%."

### Q28. BKT là gì? Tính thử?
> **Nói:** "Xác suất em đã nắm một kỹ năng. Em bắt đầu 0,30, làm đúng thì tăng lên khoảng 0,78." (Giải thích ngắn như ở 6.2.)

### Q29. Tầng 2 có dùng vector embedding ChromaDB không?
> **Nói:** "Mặc định chưa. Hiện là so khớp từ khóa với mẫu soạn sẵn; embedding là hướng phát triển."

### Q30. Mất mạng thì sao?
> **Nói:** "Nhận dạng công thức, hình, mô phỏng và toán SymPy phía bảng vẫn chạy. Đọc chữ tiếng Việt và tầng 3 cần mạng."

### Q31. Dữ liệu học sinh bảo vệ thế nào?
> **Nói:** "Hiện phòng học nằm trong bộ nhớ tạm của máy chủ, không có tài khoản. Nên em chưa đề xuất đưa vào trường công trước khi có phân quyền và lưu trữ bền vững. Đây là hạng mục giai đoạn sau."

### Q32. Phòng học QR hoạt động thế nào, giả làm giáo viên được không?
> **Nói:** "Giáo viên tạo phòng, nhận mã 6 ký tự và một khóa riêng. Học sinh quét QR, nhập tên, không cần tài khoản. Máy chủ kiểm khóa giáo viên nên học sinh không thể giả. Giới hạn: phòng mất khi khởi động lại máy chủ; chưa kiểm thử tải."

## E. Thống kê và thí nghiệm


### Q33. Thiết kế thí nghiệm thế nào, sao tin được?
> **Nói:** "412 học sinh, 12 lớp ở 3 trường, mỗi trường hai lớp mỗi nhóm. Đề cùng ma trận, thi giấy, rọc phách, chấm mù, nên người chấm không biết em thuộc nhóm nào. Phân tích bằng mô hình đa mức theo lớp, tính cả điểm trước thử nghiệm."

### Q34. +0,92 điểm là lớn hay nhỏ? d = 0,51 nghĩa là gì?
> **Nói:** "Trên thang 10, 0,92 điểm là khoảng nửa độ lệch chuẩn của điểm thi. d = 0,51 là mức trung bình theo quy ước (0,2 nhỏ, 0,5 trung bình, 0,8 lớn). Em nói đây là tác động có ý nghĩa nhưng không phải 'rất lớn'. KTC 95% từ 0,62 đến 1,22 không chứa 0 nên khó là do may rủi."
- Đừng nói: "hiệu quả rất lớn". Số này dùng để chứng minh kết quả khiêm tốn mà chắc, đó là điểm mạnh.

### Q35. p < 0,001 có phải là em chứng minh hệ thống gây ra khác biệt?
> **Nói:** "p nói nếu thật ra hai nhóm như nhau thì rất hiếm gặp chênh lệch cỡ này. Còn nguyên nhân thì cần thiết kế: em có đối chứng, chấm mù, hiệu chỉnh điểm trước. Nhưng phân nhóm theo lớp chứ chưa phải ngẫu nhiên từng học sinh, nên em nói 'bằng chứng mạnh' chứ chưa nói 'chứng minh chắc chắn'."
- Phải hỏi thầy hướng dẫn trước ngày thi: chia nhóm lớp có ngẫu nhiên không. Nếu không, đừng dùng chữ "thử nghiệm ngẫu nhiên có đối chứng".

### Q36. 8 tuần, 3 trường có đủ kết luận cho cả nước không?
> **Nói:** "Chưa. Đây là bằng chứng ở ba trường Vĩnh Phúc và Phú Thọ trong 8 tuần. Bước tiếp theo là nhiều tỉnh, thời gian dài hơn, và đo ghi nhớ sau vài tháng."

### Q37. 81,3% không gọi AI nghĩa là gì, sao khác 81,4% trong tài liệu cũ?
> **Nói:** "81,3% là 12.837 trong 15.798 lượt tự học trong nhật ký thực nghiệm. Tài liệu cũ ghi 81,4% đo trên bộ thử 100 câu chọn theo tỉ lệ; số thật trong lớp là 81,3%. Em dùng số của nhật ký."

### Q38. 350 đồng một tiết tính thế nào?
> **Nói:** "Khoảng 4,3 lượt gọi AI mỗi tiết, mỗi lượt khoảng 260 token vào, 350 token ra; theo giá niêm yết ra cỡ 100 đồng. 350 đồng là ngân sách trần gấp hơn ba lần để bù gọi lại và tăng giá."
- Cần đối chiếu lại bảng giá trước ngày thi.

## F. So sánh (iFLYTEK và các bảng AI khác)


### Q39. Sản phẩm của em hơn bảng iFLYTEK ở điểm nào?
> **C:** "Dạ, iFLYTEK là sản phẩm thương mại rất mạnh, nói - viết - chạm tự nhiên, nhận khối 3D và cắt thiết diện rất đẹp."
> **K:** "Chỗ em chọn khác là bài toán: họ trả lời câu hỏi 'bảng hiển thị được gì', em trả lời câu hỏi 'học sinh có tự nghĩ ra không'. Của em chạy trên trình duyệt và bảng thường, không cần mua bảng mới."
> **B:** "Em có nhóm đối chứng 412 học sinh, 8 tuần, nhóm dùng hệ thống hơn 0,92 điểm. Với bảng của họ em chưa thấy số đo hiệu quả học tập công bố, nên em không dám kết luận."

### Q40. Còn các hệ thống bảng AI khác có hàng trăm công cụ?
> **C:** "Làm được hàng trăm công cụ trong một cửa sổ là việc rất đáng khâm phục."
> **K:** "Nhưng số công cụ đo khả năng hiển thị. Em đo số bước học sinh tự đi được. Thêm môn là việc kỹ thuật; cách dạy mới là phần khó."
> **B:** "Em chỉ làm bốn môn để chứng minh một cách làm. 98,0% yêu cầu xin đáp án bị chặn, và nhóm dùng hệ thống hơn đối chứng 0,92 điểm."

### Q41. Họ cũng có SymPy / thư viện toán, vậy có gì riêng?
> **Nói:** "Dạ đúng, em không nói đây là điểm riêng. Điểm riêng là chính sách: toán kiểm xong rồi **không nói đáp án**, mà hỏi ngược lại. Trợ giảng của nhiều hệ thống khác sau khi kiểm sẽ giải và đọc to lời giải."

### Q42. Nhận dạng chữ của em thua họ vì họ có mô hình tinh chỉnh?
> **Nói:** "Em thừa nhận, mô hình thị giác tinh chỉnh trên hàng nghìn mẫu có thể chính xác hơn ở chữ khó, và họ có công bố số đo. Đổi lại, của em chạy trên máy, vài chục mili-giây, ngoại tuyến, giải thích được từng bước, và chỗ chưa chắc có chip đổi một chạm. Việc em sẽ làm tiếp là thu tập mẫu của nhiều bạn để đo độc lập."

### Q43. Vì sao tin điểm số tăng là do hệ thống mà không phải do cô giáo dạy giỏi?
> **Nói:** "Có nhóm đối chứng ở cùng trường, cùng giáo viên cấp lớp, đề cùng ma trận, chấm mù, mô hình tính cả lớp học và điểm trước. Nhưng em vẫn nói đúng giới hạn: chia theo lớp chứ chưa ngẫu nhiên từng học sinh."

### Q44. Đóng góp riêng của em là gì? (giám khảo ViSEF gần như chắc chắn hỏi)
> **Nói:** Mỗi bạn chuẩn bị sẵn một câu cụ thể: "Em làm phần X, gặp lỗi Y, sửa bằng Z." Ví dụ: "Em viết luật gom nét cho dấu bằng, ban đầu thấy `=` bị tách thành hai dấu trừ, em thêm điều kiện chồng nhau theo chiều ngang trên 60% và cách nhau dưới 0,55 chiều cao chữ." Chi tiết nhỏ chỉ người làm thật mới biết.

### Q45. Hạn chế lớn nhất của sản phẩm?
> **Nói:** "Có ba. Một, độ đúng nhận dạng mới là ước tính nội bộ 85 đến 89%, chưa kiểm định độc lập. Hai, chưa có tài khoản, lưu trữ bền vững, kiểm thử tải nên chưa đưa vào trường công. Ba, thực nghiệm ở ba trường trong 8 tuần chưa khái quát cả nước. Phòng thực hành tay bằng webcam là nguyên mẫu, chưa thử trong lớp thật."
