# Bộ câu hỏi phản biện của BGK – FreshNose AI (KHKT cấp tỉnh 2026–2027, lĩnh vực số 10: Kỹ thuật điện, điện tử và viễn thông)

Lưu ý: bìa báo cáo và poster đang ghi "Lĩnh vực: Thống kê" (lĩnh vực số 6); cần sửa thành "Kỹ thuật điện, điện tử và viễn thông" (Phụ lục 01 của kế hoạch). BGK lĩnh vực này sẽ hỏi nhiều ở Vòng 4 (mạch, nguồn, vô tuyến), nên Vòng 4 có thêm câu 4.9–4.17.

Căn cứ: báo cáo final (`BAO_CAO_FRESHNOSE_final.docx`), poster 3 tấm, các file `PhuLuc*.csv` (đã đối chiếu trực tiếp).
Cách dùng: tập theo thứ tự các vòng như một buổi bảo vệ thật. Mỗi câu có **Xoáy** (câu hỏi nối tiếp BGK hay hỏi ngay sau câu trả lời) và **Chốt** (điều phải trả lời được, dựa trên số liệu thật). Dấu ★ = rủi ro cao, nên tập trước. Dấu ⚠ = câu mà hiện tại báo cáo/dữ liệu chưa đủ để trả lời trơn tru, cần sửa hồ sơ hoặc có phương án nói thẳng.

Khung trả lời mọi câu khó (20–30 giây): **(1) Thừa nhận đúng điểm yếu → (2) nêu số liệu đang có → (3) nói việc sẽ làm để khắc phục.** Không né, không nói quá.

---

## Vòng 0. Mở màn trước poster (BGK vừa đi vừa hỏi, mỗi câu ~30 giây)

**0.1 ★** Em tóm tắt dự án trong một câu và cho biết kết quả quan trọng nhất là gì?
- Xoáy: Con số đó đo trên cái gì, bao nhiêu mẫu, đã kiểm chứng ngoài phòng thí nghiệm chưa?
- Chốt: mũi điện tử giá thấp báo xoài/chuối lên men sớm hơn mắt thường 26,3 ± 6,4 giờ (6 chuỗi), chính xác 87,5 %, cảnh báo giả 6,2 %, **trong phòng thí nghiệm**.

**0.2 ★ ⚠** Nguyên mẫu thật đâu? Poster chỉ có hình 3D.
- Xoáy: Hình 3D khác thật ở chỗ nào? Cắm điện cho hội đồng xem được không?
- Chốt: mang nguyên mẫu thật (Node, Hub) hoặc ảnh chụp thật; nếu không có, nói thẳng hình 3D là thiết kế.

**0.3 ★** Tên có "tối ưu thời gian lưu kho" và "xuất khẩu". Poster chứng minh ở đâu?
- Xoáy: Thời gian lưu kho kéo dài được bao nhiêu ngày? Kho nào của em phục vụ xuất khẩu?
- Chốt: dự án đo **cảnh báo sớm**, chưa đo kéo dài thời gian lưu kho; "tối ưu" là hướng ứng dụng (FEFO, tách sọt). Cần chuẩn bị lời giải thích hoặc đổi tên.

**0.4** Ô 6,2 % cảnh báo giả: với kho đo 30 phút/lần thì mỗi ngày có mấy báo động sai?
- Chốt: 62/1.000 mẫu không phải báo động liên tiếp; cảnh báo giả là các mẫu đơn lẻ, nên dùng quy tắc xác nhận 6 mẫu liên tiếp (3 giờ). Có thể nêu: không có đợt báo đỏ liên tiếp nào ở buồng đối chứng.

**0.5** Vì sao poster và báo cáo ghi "Đạt" cả 5 tiêu chí?
- Xoáy: Ai đặt ngưỡng, đặt lúc nào? Tiêu chí giá 22 triệu có phải em đặt bằng ngưỡng không?
- Chốt: nói thẳng TC5 đạt đúng ngưỡng do chọn giá bán; TC4 đạt nếu ngắt ở 20 % (21,0 ngày); TC1 và TC3 dựa trên tập kiểm tra nhỏ.

---

## Vòng 1. Vấn đề, tính mới, căn cứ

**1.1 ★** Tính mới thật sự của em là gì, khi đã có mũi điện tử MOS phát hiện thán thư trên chuối [9] và xoài [10]?
- Xoáy: Đo ngắt quãng, màng PTFE, bù nhiệt ẩm đều là kỹ thuật thông dụng với cảm biến MOX, đúng không?
- Chốt: tách rõ cái em áp dụng (kỹ thuật thông dụng) và cái em đóng góp (mảng giá thấp, dữ liệu 4.500 mẫu cho mát 10–14 °C/độ ẩm cao, đánh giá theo đợt, công khai hạn chế).

**1.2 ★ ⚠** "Chưa thấy công trình dùng mảng giá thấp ở độ ẩm trên 90 % theo hướng khoanh vùng." Em tìm ở đâu, từ khóa gì?
- Xoáy: Chính em nói khoanh vùng "chưa kiểm chứng". Vậy tính mới đang dựa vào thứ chưa kiểm chứng?
- Chốt: có sẵn danh sách cơ sở dữ liệu, từ khóa, ngày tìm; thừa nhận tính mới hiện nằm ở phần đã đo, khoanh vùng là hướng phát triển.

**1.3** Vì sao chọn TGS2602 và TGS822, không phải cảm biến ethylene?
- Xoáy: Xoài, chuối chín là do ethylene. Hai cảm biến này có nhạy ethylene không?
- Chốt: datasheet [7], [8]: TGS2602 cho chất gây ô nhiễm không khí (VOC), TGS822 cho cồn và dung môi hữu cơ; mục tiêu là ethanol/acetaldehyde của quá trình lên men, không phải ethylene chín.

**1.4 ⚠** Vì sao tin tín hiệu giảm là do ethanol/acetaldehyde, khi em chưa đo ethanol?
- Xoáy: Nếu thay quả bằng ethanol chuẩn, cảm biến phản ứng thế nào? Có thể là hơi nước, amoniac, hay VOC khác không?
- Chốt: báo cáo đã ghi "suy luận chưa có phép đo ethanol"; hướng làm tiếp là đối chiếu bằng sắc ký khí hoặc cảm biến ethanol chuẩn.

**1.5** Số liệu quy mô lớn (FAO 25,4 %, xuất khẩu 7,12 tỷ USD) liên quan gì đến kết quả của em?
- Chốt: chỉ là bối cảnh; nhu cầu dựa vào khảo sát 18 đơn vị (sơ bộ) và lý do kỹ thuật.

**1.6 ⚠** Tài liệu [4] ghi 2.800 ha chuối an toàn, văn bản em viết 6.500 ha, 162.000 tấn. Số nào đúng, nguồn nào?
- Xoáy: Số liệu nền của đề tài phải kiểm chứng được, sao không dùng niên giám thống kê?
- Chốt: đối chiếu lại số này với đúng bài báo (hoặc niên giám) trước ngày bảo vệ; nếu không kiểm được thì bỏ số hoặc ghi "chưa kiểm chứng".

---

## Vòng 2. Thiết kế thí nghiệm và thống kê (vòng nặng nhất)

**2.1 ★ ⚠** Dữ liệu cho thấy buồng 1 luôn là lành lặn, buồng 2 luôn gây xước, buồng 3 luôn cấy nấm, ở cả 3 đợt. Làm sao tách hiệu ứng bệnh khỏi hiệu ứng buồng?
- Xoáy: Em có đổi vị trí các điều kiện giữa các buồng không? Nhiệt độ và độ ẩm trung bình giữa các buồng lệch 0,5 °C và 1,6 % RH, đủ làm lệch MOX không?
- Chốt: **đây là hạn chế lớn nhất của thiết kế**; phải thừa nhận mỗi điều kiện chỉ một buồng cố định. Hướng: đợt mới có hoán đổi buồng và Node độc lập. Không được nói "3 lần lặp độc lập".

**2.2 ★ ⚠** "Lặp 3 đợt" thực chất là gì, khi cùng buồng, cùng Node, và các đợt chồng nhau 5 ngày mà chỉ có 3 Node?
- Xoáy: Một Node đo ba buồng cùng lúc bằng cách nào? Quả của các đợt có cùng lô, cùng nhà cung cấp không?
- Chốt: giải thích rõ số Node, số buồng, lịch đo thực tế. Bổ sung thông tin lô quả, độ chín ban đầu, khối lượng từng buồng (báo cáo thừa nhận chưa ghi).

**2.3 ★** Đơn vị thí nghiệm thật sự là bao nhiêu: 4.500 mẫu hay 9 chuỗi?
- Xoáy: Mẫu cách nhau 30 phút có tự tương quan rất mạnh; "n = 4.500" có đúng không?
- Chốt: đơn vị độc lập tối đa là chuỗi (9, trong đó chỉ 6 có vết thối). 4.500 là số lần đo, không phải 4.500 quan sát độc lập; khoảng tin cậy 85,7–89,0 % của độ chính xác là cận rất hẹp so với thực tế.

**2.4 ★** Với n = 6, "26,3 ± 6,4 giờ" có ý nghĩa gì? Khoảng tin cậy 95 % là bao nhiêu?
- Xoáy: Có kiểm định nào cho "lớn hơn 12 giờ"? Nhóm gây xước luôn muộn hơn nhóm nấm ở cả 3 đợt, có ý nghĩa không?
- Chốt: tính sẵn CI 95 % (phân phối t, 5 bậc tự do) và một kiểm định phi tham số đơn giản; nói rõ 6 sự kiện là rất ít.

**2.5 ★ ⚠** Nhãn lớp 0/1/2 được gán dựa vào cái gì: đo đạc hay mốc thời gian?
- Xoáy: Buồng đối chứng sang lớp 1 ở giờ 182, 182, 190, gần như cố định; lớp 2 ở giờ 120, 136, 130, 72, 68, 120. Đó là quan sát sinh học hay quy tắc?
- Chốt: nêu tiêu chí gán nhãn cụ thể (độ cứng, ảnh, thông số nào), người gán, có mù hay không. Nếu nhãn gán chủ yếu theo thời gian thì phải nói rõ mô hình có thể đang học đồng hồ.

**2.6 ★ ⚠** Cột Model_Red_Alert trùng nhãn lớp 2. Vậy 26,3 giờ có phải đo hiệu năng mô hình không?
- Xoáy: "Có: cảm biến báo sớm hơn mắt thường 26,3 giờ" in đậm ở poster, nhưng chú thích nhỏ ghi "lấy từ nhãn". Có công bằng không?
- Chốt: 26,3 giờ là từ lúc bắt đầu mức lên men (nhãn) đến lúc thấy vết thối; con số do mô hình dự đoán chỉ có ở đợt 3: 36,0 giờ (gây xước) và 27,5 giờ (nhiễm nấm) theo quy tắc 6 mẫu liên tiếp. Lưu ý: giờ 28,5 và 14,0 trong báo cáo là thời điểm mô hình dự đoán lớp 2 lần đầu (mẫu đơn lẻ, rất sớm so với mốc 120/130 giờ), tức là báo động giả chứ không phải Δt.

**2.7 ⚠** Mốc "thấy vết thối" ≥ 1 mm do ai đánh giá, bằng ảnh nào?
- Xoáy: Có hai người đánh giá độc lập không? Ảnh time-lapse đâu (chưa đính kèm)?
- Chốt: chuẩn bị ảnh và biên bản kiểm tra để mang theo; nêu người đánh giá; độ phân giải mốc 0,5 giờ.

**2.8** Quy trình gây bệnh: chủng nấm, nồng độ bào tử, nguồn gốc, ai xác định?
- Chốt: cần có thông tin chủng (nếu chưa định danh thì nói "dạng thán thư, chưa định danh loài") và cơ sở hỗ trợ.

**2.9** Có quả hỏng tự nhiên trong thí nghiệm không?
- Chốt: không; quả hỏng gây nhân tạo, hạn chế đã nêu ở 4.5. Kế hoạch: thu dữ liệu từ lô hỏng tự nhiên ở pilot.

**2.10** Em có kiểm định giả thuyết nào không (t-test, Mann–Whitney, ANOVA, hoán vị)? Bảng 4.3 chỉ có trung bình ± SD.
- Chốt: nếu chưa làm, nói rõ và chuẩn bị ít nhất một kiểm định cho khác biệt chính (nấm so với đối chứng); với dữ liệu chuỗi thời gian cần lưu ý tự tương quan.

**2.11** Em có kiểm tra tính dừng, xu hướng thời gian của chuỗi trước khi mô tả không?
- Chốt: các chuỗi có xu hướng giảm theo thời gian; trung bình ± SD gộp nhiều giờ chỉ là mô tả, không phải ước lượng một tham số cố định.

**2.12** Dữ liệu đều đặn (đủ 4.500 dòng, 500 mẫu mỗi chuỗi). Thiết bị thật có mất gói LoRa không?
- Xoáy: Dữ liệu thô lấy từ log gốc của Node hay xuất từ chương trình xử lý?
- Chốt: có log gốc từ thiết bị (kèm thời gian) để chứng minh nguồn dữ liệu; giải thích xử lý gói mất/gửi lại (47/1.128 lần phải gửi lại).

---

## Vòng 3. Mô hình học máy và kết quả

**3.1 ★** Vì sao 87,47 % là kết quả đáng tin, khi tập kiểm tra chỉ có 3 chuỗi và cùng mã buồng với tập huấn luyện?
- Xoáy: Em có thử luân phiên (huấn luyện đợt 1 và 3, kiểm tra đợt 2) không? Kết quả khi đợt khác làm tập kiểm tra?
- Chốt: có sẵn kết quả luân phiên 3 lần (leave-one-batch-out) hoặc nói thẳng chưa làm. Nhắc: báo cáo chạy lại ra khoảng 90,9 % chứ không phải 87,5 %, cần giải thích lý do khác biệt (ngưỡng, hạt giống).

**3.2 ★ ⚠** Ngưỡng cảnh báo đỏ "hạ thấp" chọn trên tập nào? Mã huấn luyện đâu?
- Xoáy: Nếu chọn trên đợt 3 thì kết quả đã bị tinh chỉnh theo đáp án.
- Chốt: nêu ngưỡng, tập dùng để chọn; mang mã huấn luyện. Nếu ngưỡng chọn sau khi xem đợt 3, thừa nhận và hướng sang tập xác nhận riêng.

**3.3 ★** Độ chính xác 87,5 % có công bằng khi lớp an toàn chiếm 52 % tập kiểm tra và một lớp chỉ đúng 45 %?
- Xoáy: Balanced accuracy và F1 từng lớp là bao nhiêu?
- Chốt: F1 trung bình 79,7 %; độ nhạy chín sinh lý 45,0 % (99/220; 82 mẫu bị gọi là an toàn); lên men 99,6 % (498/500). Tính sẵn balanced accuracy từ ma trận.

**3.4 ★** Lớp "chín sinh lý" có đáng tin không, khi 74,8 % mẫu đến từ buồng đối chứng?
- Xoáy: Mô hình có thể đang học "buồng 1 ở giờ muộn". Em có kiểm tra bằng phép hoán vị nhãn hay độ quan trọng đặc trưng không?
- Chốt: thừa nhận mức vàng chỉ nên là tín hiệu theo dõi; hướng giải quyết là thêm dữ liệu chín tự nhiên nhiều buồng.

**3.5 ⚠** Đặc trưng đầu vào gồm những gì? Có đặc trưng thời gian (giờ lưu kho) không?
- Xoáy: Nếu mô hình biết giờ thì "cảnh báo sớm" còn ý nghĩa gì?
- Chốt: liệt kê đặc trưng chính xác (Rs/R0 hai cảm biến, nhiệt độ, độ ẩm, có/không có giờ); nếu có đặc trưng giờ thì phải bỏ ra và chạy lại.

**3.6** Có so sánh với một ngưỡng đơn giản không (ví dụ Rs/R0 TGS2602 < 0,6 liên tiếp 6 mẫu)?
- Xoáy: Nếu ngưỡng đơn giản cho kết quả tương đương thì học máy có cần thiết không?
- Chốt: chạy sẵn một baseline ngưỡng và một mô hình khác (hồi quy logistic) để so với Random Forest.

**3.7** Vì sao dùng Random Forest, n_estimators = 100, max_depth = 8, random_state = 123?
- Xoáy: Tham số chọn thế nào? Seed 123 có phải thử nhiều seed rồi chọn cái đẹp không?
- Chốt: nêu cách chọn tham số (có/không có xác thực chéo); nếu chưa thử nhiều seed, nói rõ; nên có kết quả trung bình qua nhiều seed.

**3.8** Cảnh báo giả 6,2 % được tính thế nào?
- Chốt: 62/1.000 mẫu không phải lên men bị gọi lên men trong đợt 3; chưa tính theo "sự kiện báo động" mà theo mẫu; hướng: tính số báo động sai mỗi Node mỗi ngày.

**3.9** Xác suất đầu ra (Prob_Class) có được hiệu chuẩn không? Có đường ROC/precision-recall không?
- Chốt: có thể dùng file dự đoán để vẽ nhanh; không có thì nói chưa làm.

**3.10** Mô hình đã chạy trên Hub Raspberry Pi với dữ liệu truyền thật chưa, hay chỉ trên máy tính với CSV?
- Chốt: nêu rõ phạm vi đã chạy thật; thời gian suy luận trên Hub nếu đã đo.

**3.11** Cảm biến MOX trôi theo thời gian; sau vài tháng mô hình còn dùng được không?
- Chốt: chưa kiểm chứng; kế hoạch hiệu chuẩn lại R0 theo định kỳ.

**3.12 ★** Nếu tôi đưa một Node và một kho mới, em dự đoán độ chính xác giảm xuống còn bao nhiêu?
- Chốt: không hứa số; nói rõ ước lượng hiện tại là "mức trần" do chưa độc lập về thiết bị, mô hình cần hiệu chuẩn lại khi đổi Node/kho.

---

## Vòng 4. Phần cứng, pin, truyền thông

**4.1 ★** Cải tiến từ v1 sang v2 gồm hai thay đổi cùng lúc (đo ngắt quãng và màng PTFE). Làm sao biết từng thay đổi giúp bao nhiêu?
- Xoáy: Pin chết nhanh do sấy liên tục, đọng sương do hơi nước; đây là hai hiện tượng. Có đo riêng không?
- Chốt: pin: sấy liên tục (dòng 325 mA, cạn ở giờ 18–19) đổi sang đo ngắt quãng (23,5 ngày); đọng sương: Rs TGS2602 tụt từ 46–48 kΩ xuống 4–6 kΩ ở độ ẩm khoảng 88 % trước khi có PTFE. Hai biện pháp tác động hai vấn đề khác nhau nên có thể phân tích riêng.

**4.2 ★** Nhật ký pin 1.128 chu kỳ chỉ có một Node, đo tháng 7–8, không phải lúc thí nghiệm quả (tháng 6). Có đại diện không?
- Chốt: nêu rõ phạm vi (một Node, 12,05 ± 0,51 °C, tối đa 14,5 °C; 229,1 mAh/ngày; còn 20 % ở ngày 21,0; 10,3 % ở ngày 23,5); nếu chưa đo thêm Node thì nói chưa.

**4.3** TC4 chỉ hơn ngưỡng 1 ngày. Pin LiFePO4 ở nhiệt độ thấp hơn, hoặc đã lão hóa thì sao?
- Chốt: biên mỏng; hướng: đo ở 8–10 °C và với pin dùng nhiều chu kỳ; có thể giảm tần suất đo.

**4.4** Gia nhiệt 120 giây rồi đọc 30 giây đã đủ ổn định tín hiệu MOX chưa?
- Chốt: cần có đồ thị ổn định sau gia nhiệt hoặc nêu rằng 120 giây được chọn để tiết kiệm pin, mức ổn định chưa đo kỹ.

**4.5** 108 dòng "màng PTFE khô" có đủ chứng minh không đọng sương ở độ ẩm khoảng 90 %?
- Chốt: 36 chu kỳ × 3 mạch, nhiệt độ lên 14,1 °C, độ ẩm 95,2 %; đây là bằng chứng ngắn hạn; cần thử dài hơn (vài tuần) và khi xả đá.

**4.6** LoRa qua vách panel cách nhiệt: đã thử chưa?
- Xoáy: Khảo sát có 1 đơn vị lo ngại vấn đề này; em có đo cường độ tín hiệu (RSSI) qua vách không?
- Chốt: nêu thẳng đã thử hay chưa, khoảng cách đã đo; tỉ lệ gửi lại 4,2 % đo ở điều kiện nào.

**4.7** Cảnh báo giả do xả đá (nhiệt độ vọt tới 14,6 °C, độ ẩm tới 97,5 %): kết quả "trước và sau khi bù" đâu?
- Chốt: báo cáo thừa nhận chưa có số đo trước khi bù; sau bù cảnh báo giả không tập trung ở mẫu nóng (8/120 so với 54/880). Cần nói đây là bằng chứng gián tiếp.

**4.8** Độ bền Hub (thẻ SD, Raspberry Pi) và Node (cửa lấy khí, màng PTFE) khi chạy nhiều tháng trong kho lạnh ẩm?
- Chốt: chưa kiểm chứng; kế hoạch thay thế bằng bộ nhớ công nghiệp, vệ sinh/đổi màng định kỳ.

**Câu bổ sung theo lĩnh vực Kỹ thuật điện, điện tử và viễn thông**

**4.9 ★** Mạch đọc cảm biến: Rs của TGS biến thiên từ vài kΩ đến hàng chục kΩ (4–48 kΩ trong dữ liệu). Em đọc bằng mạch phân áp với điện trở tải bao nhiêu, ADC nào, độ phân giải và sai số bao nhiêu?
- Xoáy: ADC của ESP32 nổi tiếng phi tuyến và nhiễu; em hiệu chuẩn thế nào? Rs/R0 chênh 0,01 tương ứng bao nhiêu LSB?

**4.10 ★** Cảm biến TGS cần nguồn sấy khoảng 5 V, pin LiFePO4 chỉ 3,1–3,4 V (nhật ký 3,418 → 3,121 V). Nguồn sấy được tạo ra thế nào?
- Xoáy: Hiệu suất bộ tăng áp bao nhiêu? Khi pin xuống 3,1 V điện áp sấy còn ổn định không, vì nhiệt độ sấy quyết định độ nhạy?

**4.11 ★** Ngân sách năng lượng: chu kỳ 4,77 mAh, dòng sấy 117,6 mA (120 s), đo 101,6 mA (30 s), ngủ sâu 18,6 µA, tổng 229,1 mAh/ngày. Vậy gần như toàn bộ điện năng là sấy cảm biến, đúng không?
- Xoáy: Sao chọn chu kỳ 30 phút? Nếu đo mỗi 60 phút thì pin kéo dài bao lâu, và có ảnh hưởng gì tới cảnh báo sớm hàng chục giờ?

**4.12 ★** LoRa AS923 ở 923,2 MHz, 14 dBm: em có tính ngân sách đường truyền (link budget), hệ số trải phổ (SF), băng thông, độ nhạy thu, suy hao qua vách panel không?
- Xoáy: Băng tần và công suất này có hợp quy theo quy định vô tuyến cự ly ngắn ở Việt Nam không? Em đã đối chiếu với thông tư hiện hành của Bộ Thông tin và Truyền thông chưa?

**4.13** Giao thức: LoRa thô hay LoRaWAN? Khuôn dạng gói tin, kiểm tra lỗi (CRC), xác nhận (ACK), gửi lại, thời gian phát (airtime), chu kỳ làm việc, mã hóa dữ liệu?
- Xoáy: 47/1.128 lần gửi lại (4,2 %): nguyên nhân là nhiễu, va chạm gói, hay công suất thấp?

**4.14** Cảm biến nhiệt ẩm SHT31 có sai số ±0,2 °C, ±2 % RH theo nhà sản xuất. Khi độ ẩm trên 90 % thì sai số thế nào, có đọng sương trên chính SHT31 không? R0 của từng cảm biến xác định ra sao (không khí sạch ở đâu, sau bao lâu ổn định)?
- Xoáy: Hai cảm biến TGS khác Node có R0 khác nhau; em chuẩn hóa thế nào để mô hình dùng chung cho nhiều Node?

**4.15** An toàn điện và độ tin cậy phần cứng: pin LiFePO4 và BMS, vỏ IP66 nhưng có cửa lấy khí, chống tĩnh điện, chống sét lan truyền, nối đất trong kho lạnh ẩm; có đo hay chứng nhận gì không?

**4.16** Vì sao chọn LoRa mà không phải Zigbee, BLE, Wi-Fi, NB-IoT? Vì sao ESP32-S3 mà không phải vi điều khiển công suất thấp hơn (như STM32L, nRF)? Dòng ngủ 18,6 µA là của cả mạch hay chỉ chip?

**4.17** Hub: Raspberry Pi 4 tiêu thụ bao nhiêu điện, nếu mất điện hay mất mạng thì sao? Cảnh báo gửi đến chủ kho bằng cách nào (còi, tin nhắn, ứng dụng)? Có Internet vạn vật hay chỉ cục bộ?

---

## Vòng 5. Thực tiễn, khảo sát, kinh tế

**5.1 ★** Khảo sát 18 đơn vị, chọn thuận tiện: có dùng để định giá 22 triệu được không?
- Xoáy: Khoảng tin cậy 95 % là 49,1–94,2 %. Cận dưới 49 % nghĩa là có thể chưa đến một nửa sẵn sàng mua.
- Chốt: khảo sát chỉ là chiều hướng; 3 đơn vị chọn 10–15 triệu (thấp hơn 22 triệu), 2 đơn vị chọn 25–35 triệu. "Sẵn sàng chi" không phải quyết định mua.

**5.2** Câu hỏi khảo sát có dẫn dắt không? Khảo sát trước hay sau khi giới thiệu sản phẩm? Ai trả lời (chủ kho, kế toán)?
- Chốt: mang theo phiếu khảo sát mẫu và cách thức thu thập; nêu thiên lệch chọn mẫu.

**5.3 ★** Giá vốn 13,4 triệu có báo giá hay hóa đơn không?
- Xoáy: Chưa tính công lắp ráp, bảo hành, vận chuyển, cài đặt, hỗ trợ. Lãi gộp 39,1 % có đủ duy trì không?
- Chốt: bảng 4.1 là ước tính theo bảng kê vật tư; chuẩn bị ít nhất vài báo giá/ảnh chụp đơn hàng thật cho cảm biến TGS, Raspberry Pi, module LoRa.

**5.4 ★** Phép tính 50 tấn × 25.000 đồng/kg, hao hụt 8 %, giảm thêm 1,5–2,0 %, hoàn vốn 1–2 mẻ, dựa vào đâu?
- Xoáy: Nếu mức giảm thực chỉ 0,3 % thì hoàn vốn bao lâu? 8 Node đủ cho kho 50 tấn không?
- Chốt: đó là giả định chưa đo (đã ghi trong 4.3); chuẩn bị bảng độ nhạy (0,3 %, 0,5 %, 1 %, 1,5 %) và giải thích vì sao 8 Node (số dãy kệ giả định).

**5.5** Khi Hub báo đỏ, nhân viên làm gì và có bằng chứng việc đó giảm hư hỏng không?
- Chốt: quy trình tách sọt, thông gió, FEFO là đề xuất; chưa thí nghiệm hiệu quả can thiệp; pilot sẽ đo. Lưu ý: tăng thông gió trong kho mát có thể làm tăng tải lạnh và làm khô quả; ngưỡng nhiệt cần theo chuyên gia bảo quản.

**5.6** Thiệt hại khi cảnh báo giả vs bỏ sót: em đã so sánh chưa?
- Chốt: lớp lên men gần như không bỏ sót (498/500, không sang "an toàn"); cảnh báo giả 6,2 % dẫn tới kiểm tra thủ công một sọt, chi phí thấp hơn mất cả pallet; nhưng chưa tính bằng tiền.

**5.7** Nếu nhân viên tin hoàn toàn vào máy và bỏ kiểm tra thủ công thì rủi ro an toàn thực phẩm là gì?
- Chốt: hệ thống chỉ hỗ trợ cảnh báo, không thay thế kiểm tra; hướng dẫn sử dụng nêu rõ.

**5.8 ⚠** Pilot thực địa 10/2026–2/2027 (hiện đã 11/2026): đã lắp ở kho nào, có số liệu sơ bộ chưa?
- Xoáy: Bìa ghi thời gian thực hiện 3–10/2026, pilot nằm ngoài khoảng này.
- Chốt: nếu chưa lắp thì sửa hồ sơ ghi "dự kiến"; nếu đã lắp thì mang số liệu thật, kể cả kết quả không đẹp.

**5.9** Nếu pilot cho kết quả xấu, em có công bố không?
- Chốt: có; kết quả xấu là dữ liệu để cải thiện mô hình và đánh giá giới hạn.

---

## Vòng 6. Liêm chính, đạo đức, đóng góp cá nhân

**6.1 ★** Phần nào học sinh trực tiếp làm, phần nào có sự giúp đỡ?
- Xoáy: Ai viết firmware? Ai huấn luyện mô hình? Giải thích cho tôi dòng mã tính Rs/R0 hoặc cách chia tập huấn luyện/kiểm tra.
- Chốt: mỗi tác giả giải thích được toàn bộ pipeline ở mức cơ bản; chuẩn bị giải thích từng bước của `phan_tich_so_lieu.py` và mã huấn luyện.

**6.2 ★** Dữ liệu này đo thật hay mô phỏng?
- Xoáy: Tại sao dữ liệu sạch và đều? Cho tôi xem log gốc, ảnh chụp buồng, sổ nhật ký, ảnh thiết bị đang đo.
- Chốt: mang sổ nhật ký nghiên cứu, ảnh/video thí nghiệm, log từ Node, hóa đơn mua quả và vật tư. Đây là câu liêm chính; phải có bằng chứng thực địa, không chỉ CSV.

**6.3** Dự án đã nộp hoặc dự thi cuộc nào khác chưa? Phần nào mới?
- Chốt: theo thông tin hiện có, chưa nộp cuộc thi nào khác; nếu thể lệ yêu cầu khai báo, nêu rõ.

**6.4** An toàn: nấm thán thư lấy từ đâu, tiêu hủy thế nào, ai chứng kiến?
- Chốt: có biên bản trước thí nghiệm (28/5/2026) và sau thí nghiệm (22/6/2026); quả hỏng không dùng làm thực phẩm; cấy ở buồng riêng đóng kín.

**6.5** Khảo sát: đơn vị được mã hóa? Có xin đồng ý? Tên HTX có xuất hiện ở đâu không?
- Chốt: báo cáo chỉ công bố số tổng hợp; chuẩn bị lời đồng ý (văn bản hoặc ghi nhận).

**6.6** Nguồn tài liệu: em đã đọc toàn văn [9] Maksum (2026) và [10] chưa? Datasheet [7], [8], [11] không ghi năm; bản nào?
- Chốt: có bản lưu, ngày tải, phiên bản; đọc được ít nhất phần phương pháp của [9] và [10].

**6.7** Bìa còn chỗ chấm (tác giả, đơn vị, địa điểm). Thể lệ có yêu cầu ẩn danh không?
- Chốt: đối chiếu thể lệ cuộc thi cấp tỉnh/thành phố 2026–2027 trước khi in; điền địa điểm thực hiện thí nghiệm thật.

---

## Vòng 7. Câu chốt (BGK thường hỏi cuối)

**7.1 ★** Nếu chỉ giữ một con số để bảo vệ, em chọn số nào, và điểm yếu lớn nhất của nó là gì?
- Gợi ý: 498/500 mẫu lên men nhận đúng, không bỏ sót; điểm yếu: tập kiểm tra 3 chuỗi, cùng buồng với tập huấn luyện.

**7.2 ★** Ba điểm yếu lớn nhất của đề tài, theo em, là gì?
- Gợi ý (tự nói trước hội đồng sẽ tạo thiện cảm): (1) mỗi điều kiện chỉ có một buồng cố định, tập kiểm tra nhỏ; (2) lớp chín sinh lý chỉ 45 % và lẫn với buồng đối chứng; (3) chưa kiểm chứng ngoài phòng thí nghiệm, chưa có đối chứng ethanol/ethylene.

**7.3 ★** Vì sao đề tài xếp vào lĩnh vực Kỹ thuật điện, điện tử và viễn thông, mà không phải Khoa học máy tính hay Thống kê? Phần thiết kế điện tử và viễn thông do chính em làm là gì, còn phần học máy chiếm bao nhiêu?
- Chốt: thiết kế thí nghiệm đối chứng, đánh giá theo đợt để tránh rò rỉ dữ liệu, ma trận nhầm lẫn và độ nhạy/đặc hiệu từng lớp, khoảng tin cậy Wilson, phát hiện và nêu các thiên lệch (nhãn trùng cột cảnh báo, buồng trùng điều kiện, tự tương quan). Cần bổ sung ít nhất một kiểm định và khoảng tin cậy cho Δt.

**7.4** Ngày mai có thêm điều kiện, em làm gì đầu tiên?
- Chốt: (1) đợt mới có hoán đổi buồng và Node độc lập, ghi lô quả; (2) lưu dự đoán từng mẫu và tính Δt thật; (3) đo ethanol/ethylene để đối chiếu; (4) pilot kho thật.

**7.5** Em có thể bỏ học máy và dùng ngưỡng đơn giản không?
- Chốt: nêu kết quả so sánh baseline ở câu 3.6; nếu ngưỡng đơn giản gần bằng Random Forest cho lớp lên men, nói thẳng; lợi thế của học máy nằm ở lớp chín sinh lý và bù nhiệt ẩm (nếu có chứng minh).

---

## Phụ lục. Việc nên làm trước khi bảo vệ (theo thứ tự)

1. **Sửa hồ sơ cho khớp thực tế** (không cần thí nghiệm mới): bỏ hoặc sửa câu "huấn luyện riêng cho xoài và chuối"; nói rõ mỗi điều kiện chỉ có một buồng cố định; sửa số liệu chuối Phú Thọ [4]; đổi bìa/pilot cho khớp ngày.
2. **Chạy lại vài phân tích rẻ** trên CSV có sẵn: luân phiên 3 đợt (huấn luyện 2, kiểm tra 1), balanced accuracy, khoảng tin cậy 95 % cho Δt (n = 6), baseline ngưỡng đơn giản, hồi quy logistic, nhiều seed, độ quan trọng đặc trưng, đặc trưng thời gian (nếu có thì bỏ).
3. **Chuẩn bị bằng chứng thực địa**: nguyên mẫu thật, ảnh/video thí nghiệm, sổ nhật ký, log gốc từ Node, ảnh time-lapse, phiếu khảo sát, hóa đơn/báo giá linh kiện, datasheet bản lưu.
4. **Chuẩn bị bảng độ nhạy kinh tế** (hao hụt giảm 0,3–2,0 %; số Node 4/8/12) và quy tắc giải thích 8 Node cho kho 50 tấn.
5. **Tập trả lời** các câu ★ ⚠ với khung 3 bước, tối đa 30 giây mỗi câu, có người đóng vai BGK hỏi xoáy.
