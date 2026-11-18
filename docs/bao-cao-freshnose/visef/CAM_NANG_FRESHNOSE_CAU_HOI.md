# Bộ câu hỏi luyện tập – FreshNose AI

## Cách luyện

76 câu, chia 13 nhóm theo đúng đường đi của một buổi chấm: từ ý tưởng, cảm biến, mạch, pin, sóng, thí nghiệm, thuật toán, đánh giá, đến kinh tế và liêm chính. Gợi ý trả lời nằm ở tệp **Gợi ý trả lời** (cùng số câu).

- Một bạn đóng giám khảo, đọc câu hỏi. Bạn kia trả lời thành tiếng 30–45 giây, không nhìn tài liệu.
- Sau khi trả lời, "giám khảo" đọc thêm dòng **Xoáy** để hỏi tiếp. Câu hỏi xoáy mới là nơi phân loại đội.
- Dấu ★ là câu giám khảo gần như chắc chắn hỏi hoặc dễ mất điểm: luyện trước.
- Dấu ✎ là câu cần tính tay: chuẩn bị giấy, bút, máy tính bỏ túi, tính trước mặt giám khảo.
- Đạt yêu cầu khi: mở bằng con số, nói được cơ chế, tự nêu giới hạn. Công thức: **SỐ → CƠ CHẾ → GIỚI HẠN**.

Lịch luyện gợi ý: ngày 1 nhóm A–D, ngày 2 nhóm E–H, ngày 3 nhóm I–K, ngày 4 nhóm L–M và toàn bộ câu ★, ngày 5 hỏi ngẫu nhiên.

## A. Tổng quan và tính mới

1. ★ Giới thiệu dự án trong 30 giây.
   - Xoáy: Con số đó đo trên bao nhiêu mẫu? Đã thử ngoài phòng thí nghiệm chưa?
2. ★ Trình bày dự án trong 1 phút trước poster (chỉ tay theo khối ①–⑨).
3. Vì sao gọi là "mũi điện tử"? Nó giống mũi người ở điểm nào?
4. ★ Tính mới của dự án là gì, khi đã có mũi điện tử phát hiện thán thư trên chuối và xoài?
   - Xoáy: Đo ngắt quãng, màng PTFE đều là kỹ thuật thông dụng, vậy em đóng góp gì?
5. ★ Tên dự án có "tối ưu thời gian lưu kho" và "xuất khẩu". Em chứng minh ở đâu?
   - Xoáy: Thời gian lưu kho kéo dài thêm bao nhiêu ngày?
6. Vì sao dự án thuộc lĩnh vực Thống kê?

## B. Vấn đề và khảo sát

7. Vì sao chọn xoài và chuối mà không chọn cam, bưởi?
8. Một sọt thối lây sang cả pallet như thế nào? Sao nhiệt kế trong kho không phát hiện được?
9. ★ Khảo sát 18 đơn vị được làm thế nào? Em đọc số liệu ra sao?
   - Xoáy: Mẫu thuận tiện có thiên lệch không? "Sẵn sàng chi" có phải là sẽ mua?
10. ✎ Khoảng tin cậy Wilson là gì? Tính thử cho 13/18.
11. Đã có thiết bị giám sát kho trên thị trường. Sao HTX không dùng?

## C. Cảm biến khí và nhiệt ẩm

12. ★ Cảm biến khí bán dẫn (MOX) hoạt động thế nào? Vì sao điện trở giảm khi quả lên men?
    - Xoáy: Vì sao cảm biến phải được nung nóng?
13. ★ Rs/R0 là gì? Sao không dùng thẳng điện trở Rs?
14. R0 đo thế nào? Nếu R0 trôi sau vài tháng thì sao?
15. Vì sao chọn TGS2602 và TGS822? Sao không dùng cảm biến ethylene?
16. Bảng 4.3 cho thấy chín sinh lý và lên men khác nhau thế nào?
    - Xoáy: Nếu chỉ có một cảm biến thì có tách được không?
17. ★ Cảm biến MOX chọn lọc kém. Sao em biết tín hiệu giảm là do ethanol?
18. Cảm biến SHT31 dùng để làm gì?

## D. Mạch và phần mềm trên Node

19. Node và Hub gồm những gì? Dữ liệu đi từ quả đến màn hình như thế nào?
20. ✎ Vi điều khiển đọc điện trở cảm biến bằng cách nào? Viết công thức.
    - Xoáy: ADC của ESP32-S3 đọc được tối đa bao nhiêu vôn? Mạch xử lý thế nào?
21. ✎ Lọc trung vị là gì? Sao không lấy trung bình? Cho ví dụ số.
22. Vì sao nung cảm biến 120 giây rồi mới đọc 30 giây?
    - Xoáy: Em đã đo đồ thị ổn định sau khi bật chưa?
23. "Ngủ sâu" là gì? Tiết kiệm được bao nhiêu?
24. Vì sao chạy mô hình ở Hub mà không chạy ngay trên Node?

## E. Năng lượng và pin

25. ★ ✎ Tính năng lượng tiêu thụ của một chu kỳ đo 30 phút.
    - Xoáy: Phần nào tốn điện nhất? Muốn tiết kiệm thì sửa chỗ nào?
26. ✎ Từ 229,1 mAh/ngày, sao ra 21,0 ngày và 23,5 ngày?
27. ✎ Bản v1 cạn pin sau 18–19 giờ. Vì sao? Bản v2 tiết kiệm gấp bao nhiêu lần?
28. Vì sao dùng pin LiFePO4? Kho lạnh có làm pin yếu không?
29. ✎ Muốn Node chạy 45 ngày thì làm thế nào? Phải đánh đổi gì?

## F. Truyền không dây LoRa

30. Vì sao dùng LoRa, không dùng Wi-Fi hay Bluetooth?
31. LoRa hoạt động như thế nào?
32. 47/1.128 lần phải gửi lại nghĩa là gì? Có mất dữ liệu không?
33. ★ Tần số 923,2 MHz có hợp quy định không? Đã thử sóng xuyên vách panel kho chưa?

## G. Độ ẩm, màng PTFE, xả đá

34. ✎ Đọng sương là gì? Tính điểm sương ở 12 °C, độ ẩm 90 %.
35. Màng PTFE hoạt động thế nào? Em có bằng chứng gì nó chống được nước?
    - Xoáy: 108 lần đo có đủ để nói dùng được nhiều tháng không?
36. Xả đá gây cảnh báo giả thế nào? "Bù nhiệt ẩm" của em làm gì?
    - Xoáy: Có số đo trước khi bù không?

## H. Thiết kế thí nghiệm

37. ★ Mô tả thiết kế thí nghiệm. Biến độc lập, biến phụ thuộc là gì? Đối chứng để làm gì?
38. ✎ Vì sao 500 mẫu, 30 phút, 10,4 ngày, tổng 21 ngày?
39. ★ Nhãn an toàn, chín sinh lý, lên men được gán dựa vào đâu?
    - Xoáy: Nếu nhãn gán bằng chính tín hiệu khí thì sao? (lập luận vòng tròn)
40. Thời điểm "thấy vết thối" được xác định thế nào?
    - Xoáy: Ai đánh giá ảnh? Có hai người đánh giá độc lập không?
41. ★ Có 9 chuỗi mà chỉ có 3 Node, các đợt lại chồng nhau 5 ngày. Đo kiểu gì?
42. ★ ✎ Có 4.500 mẫu, vậy cỡ mẫu là 4.500 phải không?
43. ★ Mỗi điều kiện chỉ có một buồng cố định. Sao biết mô hình học bệnh chứ không học buồng?
44. Quả hỏng do em gây ra, đâu phải hỏng tự nhiên trong kho?
45. Thí nghiệm có an toàn không? Nấm thán thư có lây ra ngoài không?

## I. Thuật toán Random Forest

46. ★ ✎ Cây quyết định là gì? Máy chọn câu hỏi chia nhánh thế nào? Tính chỉ số Gini cho một ví dụ.
47. ★ Random Forest là gì? Vì sao "rừng" tốt hơn một cây?
    - Xoáy: Vì sao mỗi cây phải học trên dữ liệu khác nhau?
48. Các tham số n_estimators = 100, max_depth = 8, random_state = 123 nghĩa là gì?
    - Xoáy: Đổi random_state thì kết quả có đổi không?
49. ★ Mô hình nhận đầu vào gì? Vì sao không đưa thời gian lưu kho vào?
50. Mô hình riêng cho xoài và chuối hay dùng chung?
51. Đặc trưng nào quan trọng nhất? Độ quan trọng tính thế nào?
52. ★ Sao không dùng mạng nơ-ron? Và có cần học máy không, dùng một ngưỡng đơn giản có được không?

## J. Đánh giá mô hình

53. ★ Vì sao tách tập kiểm tra theo đợt mà không trộn ngẫu nhiên 70/30?
54. ★ Đọc ma trận nhầm lẫn của em. Ô nào quan trọng nhất?
55. ✎ Tính độ nhạy, độ đặc hiệu, độ chính xác dự đoán và F1 cho lớp lên men.
56. ★ Lớp chín sinh lý chỉ đúng 45 %. Vậy 87,5 % có phải "làm đẹp số" không?
57. Cảnh báo giả 6,2 % tính thế nào? Ở kho thật một ngày báo sai mấy lần?
58. Khoảng tin cậy 85,7–89,0 % trong báo cáo, sao lại nói "thực tế rộng hơn"?
59. ★ "Ngưỡng cảnh báo đỏ được hạ thấp" nghĩa là gì? Chọn ngưỡng trên tập nào?
60. ★ Chạy lại mô hình ra khoảng 90,9 %, khác 87,5 % trong báo cáo. Vì sao?

## K. Cảnh báo ba mức và thời gian cảnh báo sớm Δt

61. Ba mức xanh, vàng, đỏ được quyết định thế nào? Mức vàng có đáng tin không?
62. ✎ Quy tắc "6 mẫu liên tiếp" là gì? Vì sao 6? Nó làm cảnh báo muộn thêm bao lâu?
63. ★ ✎ Δt = 26,3 ± 6,4 giờ được tính thế nào? Tính khoảng tin cậy 95 %.
64. ★ Δt tính từ dự đoán của mô hình hay từ nhãn?
    - Xoáy: Báo cáo ghi giờ 28,5 và 14,0, vậy là báo sớm hơn 100 giờ?
65. ✎ Có kiểm định thống kê nào không?
66. Chuỗi xước báo sớm hơn chuỗi nấm ở cả 3 đợt. Khác biệt này có ý nghĩa không?

## L. Kinh tế và vận hành

67. ✎ Giá vốn 13,4 triệu, giá bán 22 triệu tính thế nào? Lãi gộp 39,1 % là gì?
    - Xoáy: Tiêu chí giá ≤ 22 triệu "đạt" có phải vì em đặt giá bằng ngưỡng?
68. ✎ Thu hồi vốn sau 1–2 mẻ có thực tế không?
69. Máy báo đỏ thì nhân viên kho làm gì? Sao không hạ nhiệt độ kho cho chắc?
70. Vì sao gói 8 Node? Đặt Node ở đâu? Có chỉ đúng dãy kệ hỏng không?
71. Pilot ở kho thật đã có kết quả chưa?

## M. Hạn chế, liêm chính và câu chốt

72. ★ Ba điểm yếu lớn nhất của dự án?
73. ★ Dữ liệu là đo thật hay mô phỏng? Cho xem bằng chứng.
74. ★ Em trực tiếp làm phần nào?
    - Xoáy: Giải thích lại công thức Rs/R0 và cách chia tập kiểm tra bằng lời của em.
75. Nếu có thêm 6 tháng, em làm gì đầu tiên?
76. ★ Câu chốt: vì sao hội đồng nên tin dự án này?

## Phiếu tự chấm sau mỗi buổi

| Tiêu chí | Đạt khi | Tự chấm |
|---|---|---|
| Mở bằng con số | câu đầu có số đo và cỡ mẫu | ☐ |
| Nói được cơ chế | giải thích "vì sao" bằng lời của mình | ☐ |
| Tự nêu giới hạn | nói điểm yếu trước khi bị hỏi | ☐ |
| Đúng nhãn | phân biệt Đã đo / Tính lại / Kế hoạch | ☐ |
| Đúng thời gian | 30–45 giây, không đọc thuộc | ☐ |
| Không nói quá | không "hoàn toàn mới", "chắc chắn", "đã chứng minh" | ☐ |
