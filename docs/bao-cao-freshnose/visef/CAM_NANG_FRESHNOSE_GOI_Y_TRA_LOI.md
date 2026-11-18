# Gợi ý trả lời – FreshNose AI

## Đọc trước khi luyện

Tệp này đi cùng **Bộ câu hỏi luyện tập** (cùng số câu). Cách luyện: che tệp này, đọc câu hỏi, nói thành tiếng 30–45 giây, rồi mới mở ra đối chiếu. Mỗi câu có tối đa bốn phần:

- **Hiểu nhanh**: kiến thức nền, giải thích thuật toán từng bước, có ví dụ tính tay. Đọc để hiểu, không đọc thuộc.
- **Nói**: câu trả lời mẫu. Nói bằng lời của em, giữ nguyên con số.
- **Ghi điểm**: một chi tiết nhỏ làm giám khảo thấy em hiểu sâu. Chỉ dùng khi có thời gian hoặc bị hỏi xoáy.
- **Đừng nói**: câu nghe hay nhưng sai hoặc quá đà, nói ra sẽ mất điểm.

**Công thức trả lời nổi bật: SỐ → CƠ CHẾ → GIỚI HẠN.** Mở bằng một con số đo được, giải thích vì sao có con số đó, chốt bằng giới hạn và việc sẽ làm. Giám khảo KHKT đánh giá cao học sinh tự nói ra điểm yếu trước khi bị hỏi.

**Ba nhãn trung thực**, luôn giữ khi nói:
- **Đã đo**: số có trong báo cáo và các file `PhuLuc*.csv`.
- **Tính lại**: số tính thêm từ CSV (khoảng tin cậy, kiểm định, chạy lại mô hình). Trước ngày thi, nhóm tự chạy lại một lần để chắc chắn mình làm ra được.
- **Kế hoạch**: pilot, khoanh vùng dãy kệ, đo ethanol. Chưa có kết quả, không được nói như đã làm.

Chỗ `[điền: …]` là sự thật chỉ nhóm biết. **Điền đúng sự thật, không điền cho đẹp.** Nếu chưa có, nói "chúng em chưa làm".

### Thẻ số phải thuộc

| Con số | Nghĩa | Nguồn |
|---|---|---|
| 26,3 ± 6,4 giờ (18,5–35,5) | mức đỏ sớm hơn lúc thấy vết thối, 6 chuỗi | Mục 4.2.4 |
| 36,0 và 27,5 giờ | Δt tính từ dự đoán thật của mô hình, đợt 3 | Mục 4.2.4 |
| 87,47 % (1.312/1.500) | độ chính xác ba lớp, đợt 3 | Bảng 4.4 |
| 498/500 (99,6 %) | mẫu lên men nhận đúng; 0 mẫu bị gọi "an toàn" | Bảng 4.4 |
| 6,2 % (62/1.000) | cảnh báo giả | Bảng 4.4 |
| 45,0 % (99/220) | độ nhạy lớp chín sinh lý (điểm yếu) | Bảng 4.4 |
| 79,7 % | F1 trung bình ba lớp | Mục 4.2.4 |
| 0,927 → 0,332 | Rs/R0 TGS2602, nhóm nhiễm nấm, an toàn → lên men | Bảng 4.3 |
| 4.500 = 3 đợt × 3 chuỗi × 500 mẫu | dữ liệu thí nghiệm | Mục 3.1 |
| 4,77 mAh/chu kỳ; 229,1 mAh/ngày | ngân sách năng lượng | Mục 4.2.4 |
| 21,0 ngày (còn 20 %); 23,5 ngày (còn 10,3 %) | thời gian dùng pin 6.000 mAh | Bảng 4.5 |
| 18–19 giờ | pin v1 (sấy liên tục 343 mA) | Bảng 4.2 |
| 47/1.128 (4,2 %) | lần truyền LoRa phải gửi lại, đều thành công | Mục 4.2.4 |
| 15/18, 14/18, 13/18 | kiểm tra bằng mắt, mũi; từng bị lây lan; sẵn sàng chi 15–25 triệu | Mục 4.1 |
| 13,4 / 22 triệu; 39,1 % | giá vốn ước tính / giá bán gói 1 Hub + 8 Node; lãi gộp | Bảng 4.1 |

## A. Tổng quan và tính mới

### Câu 1. Giới thiệu dự án trong 30 giây.
> **Nói:** "FreshNose AI là mũi điện tử giá thấp cho kho mát. Mỗi Node có hai cảm biến khí bán dẫn và một cảm biến nhiệt ẩm, gửi dữ liệu qua LoRa về Hub, Hub chạy Random Forest để báo ba mức xanh, vàng, đỏ. Trong phòng thí nghiệm, mức đỏ xuất hiện sớm hơn lúc mắt thấy vết thối trung bình 26,3 giờ, mô hình nhận đúng 498 trên 500 mẫu lên men, một Node chạy 23,5 ngày trên một viên pin. Chúng em chưa thử ngoài kho thật."
- **Ghi điểm:** câu cuối "chưa thử ngoài kho thật" là chỗ ăn điểm. Tự nói ra giới hạn ngay câu đầu làm mọi con số phía trước đáng tin hơn.
- **Đừng nói:** "chính xác 87,5 % nên rất hiệu quả" mà không kèm cỡ mẫu.

### Câu 2. Trình bày dự án trong 1 phút trước poster.
> **Nói (chỉ tay theo khối):** "Rau quả là nhóm thực phẩm mất nhiều nhất sau thu hoạch, 25,4 % trên toàn cầu theo FAO; 14 trên 18 HTX, kho mát chúng em hỏi từng bị một sọt thối lây cả pallet (①). Họ vẫn kiểm tra bằng mắt và mũi, tức là chỉ thấy khi quả đã hỏng; thiết bị đo khí thì đắt hoặc chỉ đo từng điểm (②). Câu hỏi của chúng em: cảm biến giá thấp phân loại đúng bao nhiêu và báo sớm được bao nhiêu giờ (③). Chúng em làm 3 đợt thí nghiệm, 4.500 mẫu, giữ riêng đợt 3 để kiểm tra (④⑤). Mỗi Node có hai cảm biến khí và cảm biến nhiệt ẩm, gửi LoRa về Hub chạy Random Forest (⑥⑦). Kết quả: mức đỏ sớm hơn mắt thường 26,3 ± 6,4 giờ, cảnh báo giả 6,2 % (⑧). Hạn chế: tập kiểm tra mới có 3 chuỗi và chưa thử ở kho thật (⑨)."
- **Ghi điểm:** dừng 1 giây sau con số 26,3 giờ, nhìn giám khảo. Con số chủ lực cần khoảng lặng.

### Câu 3. Vì sao gọi là "mũi điện tử"?
**Hiểu nhanh.** Mũi người có hàng trăm loại thụ thể, mỗi loại phản ứng yếu với nhiều mùi; não nhận ra mùi bằng cách nhìn cả tổ hợp. Mũi điện tử làm đúng như vậy: một mảng cảm biến không đặc hiệu (mỗi cái nhạy với nhiều khí) cộng một bộ nhận dạng mẫu (ở đây là Random Forest).
> **Nói:** "Vì nó không đo nồng độ từng khí như máy phân tích, mà giống mũi người: nhiều cảm biến cùng phản ứng, rồi học máy nhận ra 'mùi' của quả đang lên men từ tổ hợp tín hiệu. Mảng của chúng em nhỏ, chỉ hai cảm biến khí cộng nhiệt độ, độ ẩm."
- **Đừng nói:** "máy đo được nồng độ ethanol". Hệ thống không đo nồng độ.

### Câu 4. Tính mới của dự án là gì, khi đã có mũi điện tử phát hiện thán thư trên chuối và xoài?
> **Nói:** "Chúng em không phát minh ra mũi điện tử. Các nghiên cứu trước dùng mũi điện tử để phát hiện thán thư trên chuối [9] và xoài [10] trong phòng thí nghiệm. Điểm khác của chúng em là đưa nó vào điều kiện kho mát Việt Nam: 10–14 °C, độ ẩm gần 90 %, giá một Node khoảng 1,15 triệu, chạy bằng pin, truyền không dây; đưa nhiệt độ, độ ẩm làm đặc trưng để bù trôi; và đánh giá bằng một đợt tách riêng có đối chứng. Đo ngắt quãng, màng PTFE là kỹ thuật thông dụng chúng em áp dụng, không phải phát minh."
- **Ghi điểm:** tách rõ "cái em áp dụng" và "cái em đóng góp". Giám khảo rất thích sự rạch ròi này.
- **Đừng nói:** "chưa ai làm", "hoàn toàn mới". Báo cáo chỉ dám viết "trong các tài liệu đã duyệt chưa thấy".

### Câu 5. Tên dự án có "tối ưu thời gian lưu kho" và "xuất khẩu". Em chứng minh ở đâu?
> **Nói:** "Phần chúng em đã đo là cảnh báo sớm. 'Tối ưu thời gian lưu kho' là cách dùng cảnh báo đó: tách sọt hỏng sớm và xuất trước lô chín nhanh theo FEFO, hết hạn trước thì xuất trước. Chúng em chưa đo số ngày lưu kho kéo dài thêm, việc đó nằm trong pilot. 'Xuất khẩu' là thị trường hướng tới, thí nghiệm chưa gắn với một lô xuất khẩu cụ thể."
- **Đừng nói:** "đã kéo dài thời gian bảo quản".

### Câu 6. Vì sao dự án thuộc lĩnh vực Thống kê?
> **Nói:** "Câu hỏi khoa học chính của chúng em là câu hỏi thống kê: một tín hiệu giá thấp, nhiều nhiễu có tách được ba trạng thái hay không, và sớm hơn mắt thường bao lâu. Toàn bộ kết luận dựa trên thiết kế thí nghiệm có đối chứng, tách tập kiểm tra theo đợt để tránh rò rỉ dữ liệu, ma trận nhầm lẫn, độ nhạy, độ đặc hiệu, khoảng tin cậy và kiểm định so với ngưỡng 12 giờ. Phần cứng là công cụ thu dữ liệu."
- **Lưu ý:** nếu nhóm đổi lĩnh vực sang Kỹ thuật điện, điện tử và viễn thông, đảo trọng tâm: phần cốt lõi là hệ đo không dây (mạch đọc cảm biến, quản lý năng lượng, LoRa), học máy là bước xử lý tín hiệu. Bìa báo cáo và poster phải ghi cùng một lĩnh vực.

## B. Vấn đề và khảo sát

### Câu 7. Vì sao chọn xoài và chuối?
**Hiểu nhanh.** Quả được chia làm hai loại. Quả **hô hấp đột biến** (xoài, chuối, bơ, đu đủ) tiếp tục chín sau khi hái: đến một thời điểm, cường độ hô hấp và lượng ethylene tăng vọt. Quả **không hô hấp đột biến** (cam, nho) gần như không chín thêm. Vì xoài, chuối vẫn "sống" và sinh khí trong kho, chúng thay đổi nhanh, dễ hỏng và cũng dễ đo bằng khí.
> **Nói:** "Xoài và chuối là quả hô hấp đột biến, vẫn chín và sinh ethylene sau thu hoạch, nên hỏng nhanh trong kho. Đây cũng là hai cây chủ lực ở vùng chúng em khảo sát: Phú Thọ có khoảng 6.500 ha chuối, huyện Yên Châu, Sơn La có hơn 3.200 ha xoài. Hai số này lấy từ báo, chúng em chưa đối chiếu niên giám."

### Câu 8. Một sọt thối lây sang cả pallet như thế nào? Sao nhiệt kế trong kho không phát hiện được?
> **Nói:** "Lây theo ba đường: tiếp xúc trực tiếp, bào tử nấm, và ethylene từ quả hỏng làm quả bên cạnh chín nhanh hơn. Quá trình này cục bộ, trong khi nhiệt độ của cả kho vẫn bình thường. Nhiệt kế đo môi trường, không đo được hóa chất quả thải ra. Vì vậy chúng em đo khí ngay tại dãy kệ."
- **Ghi điểm:** "Nhiệt kế trả lời câu 'kho có lạnh không', mũi điện tử trả lời câu 'quả có đang hỏng không'." Một câu so sánh ngắn dễ nhớ.

### Câu 9. Khảo sát 18 đơn vị được làm thế nào, em đọc số liệu ra sao?
> **Nói:** "Chúng em hỏi 18 đơn vị: 12 HTX ở Phú Thọ, Vĩnh Phúc, Sơn La, Hưng Yên và 6 kho mát trung chuyển. 15 đơn vị kiểm tra bằng mắt và mũi, 14 từng bị thối lây lan, 13 chọn mức chi 15–25 triệu. Đây là mẫu thuận tiện, chỉ 18 đơn vị, nên chúng em chỉ đọc như chiều hướng, không suy ra cả nước. 'Sẵn sàng chi' cũng chưa phải quyết định mua."
- **Ghi điểm:** kể thêm lý do chưa lắp thiết bị: 7 đơn vị chê thiết bị phân tích khí nhập ngoại quá đắt (trên 150 triệu), 5 đơn vị nói thiết bị nhiệt ẩm không báo được quả thối, 3 đơn vị sợ cảm biến hỏng ở độ ẩm trên 85 %. Ba lý do này chính là ba yêu cầu thiết kế: rẻ, đo khí, chịu ẩm.
- **Mang theo:** phiếu khảo sát `[điền: câu hỏi chính xác, hỏi trước hay sau khi giới thiệu sản phẩm]`.

### Câu 10. Khoảng tin cậy Wilson là gì? Tính thử cho 13/18.
**Hiểu nhanh.** Với tỉ lệ p = x/n, cách tính quen thuộc p ± 1,96·√(p(1−p)/n) chạy sai khi n nhỏ hoặc p gần 0, 1 (có thể vượt quá 100 %). Khoảng Wilson sửa lỗi này bằng cách "kéo" tâm về 50 % một chút:

```
tâm  = (p + z²/(2n)) / (1 + z²/n)
nửa  = z·√(p(1−p)/n + z²/(4n²)) / (1 + z²/n)        z = 1,96
```

Với 13/18: p = 0,722; z² = 3,84. Tâm = (0,722 + 0,107)/1,213 = 0,683. Nửa = 1,96 × √(0,01115 + 0,00296)/1,213 = 0,192. Khoảng tin cậy 95 %: **49,1 % đến 87,5 %**.
> **Nói:** "13 trên 18 là 72 %, nhưng khoảng tin cậy Wilson 95 % kéo dài từ 49 % đến 87,5 %. Nghĩa là trong thực tế con số có thể chỉ khoảng một nửa. Vì vậy chúng em chỉ dùng khảo sát để định hướng giá, không dùng làm bằng chứng nhu cầu."
- **Ghi điểm:** "Chúng em dùng Wilson thay cho công thức thường vì với n = 18 công thức thường cho khoảng lệch và có thể vượt 100 % khi tỉ lệ cao."

### Câu 11. Đã có giải pháp giám sát kho. Sao không dùng?
> **Nói:** "Có ba loại. Nhiệt kế, ẩm kế tự ghi rẻ nhưng không thấy thay đổi hóa học. Máy đo khí cầm tay đo được ethylene nhưng đo từng điểm bằng tay, không liên tục. Hệ IoT đo khí cho kho lớn thì thiết kế cho kho táo, lê công nghiệp và chưa có ở Việt Nam. Chưa có loại nào vừa liên tục, vừa đo khí, vừa vừa túi HTX 20–200 tấn. Chúng em nhắm vào đúng khoảng trống đó."
- **Đừng nói:** chê sản phẩm khác. Chỉ nêu nguyên lý và giới hạn.

## C. Cảm biến khí và nhiệt ẩm

### Câu 12. Cảm biến khí bán dẫn (MOX) hoạt động thế nào? Vì sao điện trở giảm khi có khí lên men?
**Hiểu nhanh, từng bước:**
1. Lớp cảm biến là oxit kim loại (thường SnO₂), bán dẫn loại n: dẫn điện nhờ electron tự do.
2. Một dây nung giữ lớp này ở vài trăm độ C. Ở nhiệt độ đó, oxy trong không khí bám lên bề mặt và "giật" electron, thành ion O⁻, O₂⁻. Electron bị giữ lại nên vật liệu dẫn điện kém, **điện trở cao**.
3. Khi có khí khử như ethanol, acetaldehyde, chúng phản ứng với ion oxy trên bề mặt, tạo CO₂ và H₂O, **trả electron lại** cho vật liệu.
4. Nhiều electron tự do hơn thì **điện trở giảm**. Khí càng nhiều, điện trở càng giảm.
> **Nói:** "Lớp oxit thiếc được nung nóng. Oxy bám trên bề mặt giữ electron nên điện trở cao. Khi quả lên men sinh ethanol và acetaldehyde, các khí này phản ứng với oxy bề mặt và trả electron lại, nên điện trở giảm. Vì vậy trong dữ liệu, Rs/R0 đi xuống khi quả hỏng: ở nhóm nhiễm nấm TGS2602 từ 0,927 xuống 0,332."
- **Ghi điểm:** "Nó phải nung nóng thì mới đo được, đó chính là lý do pin tốn điện, và là lý do chúng em phải đo ngắt quãng."

### Câu 13. Rs/R0 là gì? Sao không dùng thẳng điện trở Rs?
**Hiểu nhanh.** Rs là điện trở cảm biến trong khí mẫu, R0 là điện trở của chính cảm biến đó trong không khí sạch. Hai cảm biến cùng loại có thể lệch R0 vài lần do sai số sản xuất. Chia cho R0 thì mọi cảm biến cùng xuất phát quanh 1,0. Đây là **chuẩn hóa**, giống như so điểm theo phần trăm thay vì theo điểm thô.
> **Nói:** "R0 là điện trở của cảm biến trong không khí sạch, Rs là điện trở lúc đo. Mỗi cảm biến sản xuất ra có R0 khác nhau, nên nếu dùng Rs thô, mô hình học trên Node này sẽ sai trên Node khác. Tỉ số Rs/R0 đưa mọi cảm biến về cùng thang: bằng 1 là khí sạch, càng nhỏ là càng nhiều khí khử. Datasheet của Figaro cũng biểu diễn độ nhạy theo tỉ số này."
- **Ghi điểm:** "Với dữ liệu của chúng em, quả lành ở mức 0,87–0,93, quả lên men xuống 0,29–0,39, tức điện trở chỉ còn khoảng một phần ba."

### Câu 14. R0 đo thế nào? Nếu R0 trôi theo thời gian thì sao?
> **Nói:** "R0 đo khi cảm biến đã nung ổn định trong không khí sạch, `[điền: ở đâu, nung bao lâu, lấy trung bình bao nhiêu lần đo]`, mỗi cảm biến một R0 riêng. Cảm biến MOX có trôi dài hạn; chúng em chưa theo dõi nhiều tháng. Cách xử lý dự kiến là hiệu chuẩn lại R0 định kỳ, ví dụ mỗi lần kho được làm trống."
- **Đừng nói:** "cảm biến không bị trôi".

### Câu 15. Vì sao chọn TGS2602 và TGS822? Sao không dùng cảm biến ethylene?
> **Nói:** "Mục tiêu là phát hiện lên men chứ không phải đo độ chín. Khi quả bị dập hoặc nhiễm nấm, mô thiếu oxy và lên men, sinh acetaldehyde và ethanol. TGS822 theo datasheet nhạy với cồn và dung môi hữu cơ; TGS2602 nhạy với các hợp chất hữu cơ bay hơi nồng độ thấp. Hai cảm biến phản ứng khác nhau, tạo thành 'dấu vân tay' hai chiều. Ethylene thì có ở cả quả chín bình thường, nên đo ethylene khó tách chín với hỏng."
- **Ghi điểm:** chuỗi hóa sinh lên men: glucose → pyruvate → acetaldehyde → ethanol. Acetaldehyde và ethanol là hai khí khử mạnh, đúng loại MOX nhạy nhất.

### Câu 16. Bảng 4.3 cho thấy chín sinh lý và lên men khác nhau thế nào?
**Hiểu nhanh.** Đặt hai cảm biến lên hai trục, mỗi trạng thái là một đám điểm:

| Trạng thái (quả lành) | TGS2602 | TGS822 |
|---|---|---|
| An toàn | 0,868 | 0,910 |
| Chín sinh lý | 0,661 (giảm rõ) | 0,826 (giảm ít) |
| Lên men (nhóm nấm) | 0,332 | 0,287 (cả hai sụt) |

> **Nói:** "Khi quả chín bình thường, chủ yếu TGS2602 giảm, TGS822 gần như đứng yên. Khi lên men, cả hai cùng sụt về quanh 0,3. Chính sự khác nhau về hướng này giúp mô hình tách được chín và hỏng, điều một cảm biến đơn lẻ khó làm. Việc TGS822 sụt mạnh khi lên men phù hợp với chuyện nó nhạy ethanol, nhưng đây là suy luận, chúng em chưa đo ethanol."
- **Ghi điểm:** "Nếu chỉ có một cảm biến thì chín và hỏng nằm trên cùng một đường thẳng, chỉ khác mức độ. Có hai cảm biến thì chúng tách ra hai hướng."

### Câu 17. Cảm biến MOX chọn lọc kém, sao em biết tín hiệu giảm là do ethanol chứ không phải thứ khác?
> **Nói:** "Chúng em không khẳng định được. Điều chúng em đo được là tín hiệu giảm rõ khi có vết thối, và không giảm như vậy ở quả lành. Còn khí nào gây ra thì là suy luận từ datasheet và tài liệu [6]. Để xác nhận, cần đo song song bằng sắc ký khí hoặc thử với ethanol chuẩn; đó là hướng phát triển. Chính vì chọn lọc kém nên chúng em dùng mảng cảm biến và học máy, thay vì cố đọc nồng độ từng khí."
- **Ghi điểm:** biến điểm yếu thành lý do thiết kế: "chọn lọc kém là lý do phải dùng mũi điện tử".
- **Đừng nói:** "chắc chắn là ethanol".

### Câu 18. Cảm biến SHT31 dùng để làm gì?
> **Nói:** "SHT31 đo nhiệt độ và độ ẩm, sai số khoảng ±0,2 °C và ±2 % theo nhà sản xuất. Nó có hai việc. Một là cảm biến MOX bị ảnh hưởng bởi nhiệt độ, độ ẩm, nên chúng em đưa hai số này vào mô hình để mô hình tự trừ phần ảnh hưởng đó. Hai là ghi lại điều kiện kho để phát hiện lúc xả đá."

## D. Mạch và phần mềm trên Node

### Câu 19. Node và Hub gồm những gì? Dữ liệu đi như thế nào?
> **Nói:** "Node gắn ở thành pallet hoặc họng hồi gió: vi điều khiển ESP32-S3 có LoRa, hai cảm biến khí TGS2602, TGS822, cảm biến SHT31 sau màng PTFE, pin LiFePO4 6.000 mAh có mạch bảo vệ, vỏ IP66, đế nam châm. Hub đặt gần cửa kho: Raspberry Pi 4, bộ thu LoRa, màn 7 inch, UPS. Mỗi 30 phút Node thức dậy, nung cảm biến, đọc, lọc, đóng gói, gửi LoRa rồi ngủ. Hub nhận gói, chạy Random Forest, hiện mức xanh, vàng, đỏ cho từng khu."
- **Ghi điểm:** "Node 'ngu' có chủ đích: chỉ đo và gửi. Toàn bộ trí tuệ đặt ở Hub, nên cập nhật mô hình chỉ cần sửa một máy, không phải trèo lên từng pallet."

### Câu 20. Vi điều khiển đọc điện trở cảm biến bằng cách nào?
**Hiểu nhanh.** Vi điều khiển chỉ đo được điện áp, không đo trực tiếp điện trở. Cảm biến (Rs) mắc nối tiếp một điện trở tải RL thành **mạch chia áp**; ADC đọc điện áp Vout trên RL:

```
Vout = Vc · RL / (Rs + RL)    ⇒    Rs = RL · (Vc − Vout) / Vout
```

Ví dụ minh họa (giá trị RL thật: `[điền]`): Vc = 5 V, RL = 10 kΩ. Đọc được Vout = 0,88 V thì Rs = 10 × (5 − 0,88)/0,88 ≈ 46,8 kΩ. Khi có khí, Rs giảm, nên Vout tăng.
> **Nói:** "Cảm biến mắc nối tiếp với một điện trở tải tạo mạch chia áp. ADC đọc điện áp trên điện trở tải, rồi tính ngược ra Rs theo công thức Rs = RL nhân (Vc trừ Vout) chia Vout. Có Rs thì chia cho R0."
- **Ghi điểm:** "ADC của ESP32-S3 chỉ đọc được tới khoảng 3 V, nên phải chọn RL hoặc thêm chia áp để Vout không vượt ngưỡng khi Rs xuống thấp `[điền: cách nhóm làm]`."

### Câu 21. Lọc trung vị là gì? Sao không lấy trung bình?
**Hiểu nhanh.** Trong mỗi lần đọc, Node lấy nhiều giá trị liên tiếp rồi chọn giá trị **ở giữa** sau khi xếp thứ tự. Ví dụ 5 lần đọc (kΩ): 46,9 – 47,1 – **12,0** – 47,0 – 46,8. Trung bình = 39,96, bị một gai nhiễu kéo lệch 15 %. Trung vị = 46,9, gần như không bị ảnh hưởng.
> **Nói:** "Gai nhiễu điện, ví dụ lúc LoRa phát hay lúc động cơ quạt kho khởi động, có thể làm một lần đọc lệch hẳn. Trung bình bị kéo theo gai, còn trung vị chỉ quan tâm giá trị ở giữa nên bỏ qua gai. Số lần đọc mỗi chu kỳ là `[điền]`."
- **Ghi điểm:** trung vị chịu được gần một nửa số giá trị hỏng mà không bị lệch, trung bình chỉ cần một giá trị hỏng là lệch.

### Câu 22. Vì sao nung 120 giây rồi đọc 30 giây?
> **Nói:** "Cảm biến MOX chỉ cho kết quả ổn định khi lớp oxit đạt đúng nhiệt độ làm việc và lớp oxy bề mặt cân bằng. Ngay sau khi bật, điện trở còn trôi mạnh. 120 giây là thời gian chúng em chọn để cân bằng giữa tín hiệu ổn định và pin; 30 giây sau đó để đọc nhiều lần và lọc trung vị. `[điền: đã vẽ đồ thị ổn định sau khi bật chưa]`. Nếu chưa, chúng em nói thật là 120 giây chưa được kiểm chứng riêng là tối ưu."

### Câu 23. "Ngủ sâu" là gì? Tiết kiệm được bao nhiêu?
> **Nói:** "Ngủ sâu là chế độ ESP32-S3 tắt gần hết mạch, chỉ giữ một bộ đếm thời gian để tự thức dậy. Nhật ký v2 đo được 18,6 µA khi ngủ, so với 117,6 mA khi nung cảm biến, tức nhỏ hơn hơn 6.000 lần. Trong 30 phút, Node chỉ thức 150 giây, tức 8,3 % thời gian."

### Câu 24. Vì sao chạy mô hình ở Hub mà không chạy ngay trên Node?
> **Nói:** "Ba lý do. Một, cập nhật mô hình chỉ cần sửa Hub. Hai, Hub nhìn thấy nhiều Node cùng lúc nên sau này có thể so khu này với khu kia để khoanh vùng. Ba, chạy 100 cây quyết định trên Node tốn thêm điện, dù không nhiều. Hub chạy cục bộ, không cần Internet."

## E. Năng lượng và pin

### Câu 25. Tính năng lượng của một chu kỳ đo.
**Hiểu nhanh.** Điện lượng (mAh) = dòng (mA) × thời gian (giờ). Một chu kỳ 30 phút = 1.800 giây:

| Pha | Dòng | Thời gian | Điện lượng |
|---|---|---|---|
| Nung cảm biến | 117,6 mA | 120 s | 117,6 × 120/3.600 = 3,92 mAh |
| Đọc, gửi | 101,6 mA | 30 s | 101,6 × 30/3.600 = 0,85 mAh |
| Ngủ sâu | 0,0186 mA | 1.650 s | ≈ 0,01 mAh |
| **Tổng** | | | **≈ 4,77 mAh** |

> **Nói:** "Một chu kỳ tốn khoảng 4,77 mAh, trong đó riêng nung cảm biến chiếm 3,92, tức 82 %; ngủ sâu chưa tới 0,2 %. Một ngày 48 chu kỳ là 229 mAh, khớp với nhật ký 1.128 chu kỳ đo được 229,1 mAh mỗi ngày."
- **Ghi điểm:** "Vì nung chiếm phần lớn, thay vi điều khiển tiết kiệm hơn gần như không giúp gì; muốn tăng tuổi pin phải giảm số lần nung."

### Câu 26. Từ 229,1 mAh/ngày, sao ra 21 ngày và 23,5 ngày?
> **Nói:** "Pin 6.000 mAh. Dùng đến khi còn 20 % là dùng 4.800 mAh, chia 229,1 được 21,0 ngày. Dùng đến khi còn 10,3 % thì được 23,5 ngày, đúng như nhật ký đo. Chúng em báo cả hai vì ngưỡng ngắt pin chưa chốt; tiêu chí 20 ngày đạt nếu ngắt ở 20 %, nhưng biên chỉ một ngày."
- **Ghi điểm:** nói câu "biên chỉ một ngày" trước khi giám khảo nói.

### Câu 27. Bản v1 cạn pin sau 18–19 giờ. Vì sao?
> **Nói:** "Bản v1 nung cảm biến liên tục, dòng nung 325 mA, tổng 343 mA. Tính nhanh 6.000 chia 343 khoảng 17,5 giờ, cùng cỡ với 18–19 giờ đo được ở 3 mạch. Chuyển sang đo ngắt quãng 30 phút thì dòng trung bình chỉ còn khoảng 9,5 mA, tức giảm khoảng 36 lần, nên pin kéo từ chưa đầy 1 ngày lên 23,5 ngày."
- **Hiểu nhanh:** dòng trung bình = 4,77 mAh / 0,5 giờ ≈ 9,5 mA. 343 / 9,5 ≈ 36.
- **Ghi điểm:** dòng nung ở v1 (325 mA) cao hơn v2 (117,6 mA) `[điền: vì sao: v1 nung cả hai cảm biến ở chế độ khác, hay đo khác cách]`. Nếu giám khảo hỏi, trả lời đúng sự thật của mạch.

### Câu 28. Vì sao dùng pin LiFePO4? Kho lạnh có làm pin yếu không?
> **Nói:** "LiFePO4 an toàn hơn pin lithium thường, khó cháy nổ khi bị va đập hay sạc sai, và bền nhiều chu kỳ, hợp với thiết bị để lâu trong kho. Có mạch bảo vệ BMS chống sạc quá, xả quá. Đúng là pin giảm dung lượng ở nhiệt độ thấp; nhật ký pin của chúng em đo ở 12,05 ± 0,51 °C nên đã tính ảnh hưởng của kho mát, nhưng chưa thử pin cũ nhiều chu kỳ."

### Câu 29. Muốn Node chạy 45 ngày thì làm thế nào? Đánh đổi gì?
> **Nói:** "Đo mỗi 60 phút thay vì 30 thì tiêu thụ còn khoảng 115 mAh mỗi ngày, ước tính trên 45 ngày. Đánh đổi là cảnh báo có thể muộn thêm tới 30 phút và quy tắc xác nhận phải tính lại. Vì Δt hiện tại là hàng chục giờ nên 30 phút không đáng kể, nhưng chúng em chưa thử nên đây chỉ là ước tính."

## F. Truyền không dây LoRa

### Câu 30. Vì sao dùng LoRa, không dùng Wi-Fi hay Bluetooth?
> **Nói:** "Kho mát có vách panel cách nhiệt, nhiều kệ hàng và nước, sóng bị suy hao mạnh. LoRa đi xa và xuyên vật cản tốt với công suất thấp, còn Wi-Fi tốn điện và Bluetooth tầm ngắn. Mỗi gói của chúng em chỉ vài chục byte, nửa giờ một lần, nên tốc độ thấp của LoRa không phải vấn đề."
- **Ghi điểm:** "Chúng em chỉ cần gửi khoảng sáu con số mỗi nửa giờ. Dùng Wi-Fi cho việc này giống dùng xe tải chở một lá thư."

### Câu 31. LoRa hoạt động như thế nào?
**Hiểu nhanh.** LoRa mã hóa dữ liệu bằng **chirp**: tín hiệu quét tần số từ thấp lên cao (như tiếng chim hót "uýt"). Bên thu so khớp với dạng quét đã biết, nên vẫn nhận ra được tín hiệu yếu hơn cả nền nhiễu. Hệ số trải phổ (SF) càng lớn thì mỗi bit kéo dài hơn, đi xa hơn nhưng chậm hơn và tốn pin hơn.
> **Nói:** "LoRa dùng kỹ thuật trải phổ chirp: mỗi ký hiệu là một tín hiệu quét tần số. Vì máy thu biết trước dạng quét, nó nhận được tín hiệu rất yếu, đổi lại tốc độ thấp. Node của chúng em phát ở 923,2 MHz, công suất 14 dBm, tức khoảng 25 mW `[điền: SF, băng thông]`."

### Câu 32. 47/1.128 lần phải gửi lại nghĩa là gì?
> **Nói:** "Trong 1.128 chu kỳ của nhật ký pin, 47 lần, tức 4,2 %, Node không nhận được xác nhận ở lần gửi đầu nên gửi lại, và cả 47 lần đều thành công. Không mất gói nào. Nguyên nhân có thể là nhiễu hoặc va chạm sóng `[điền: số lần gửi lại tối đa, có ACK không]`. Đây là đo trong điều kiện thí nghiệm, chưa đo xuyên vách panel của kho thật."

### Câu 33. Tần số 923,2 MHz có hợp quy định không? Đã thử xuyên vách panel chưa?
> **Nói:** "Chúng em dùng kênh AS923 theo cấu hình mặc định của mô-đun `[điền: đã đối chiếu thông tư hiện hành về thiết bị vô tuyến cự ly ngắn chưa]`. Nếu kênh này nằm ngoài băng cho phép ở Việt Nam, chỉ cần đổi kênh trong firmware. Còn xuyên vách panel thì chưa đo; 1 trong 18 đơn vị khảo sát lo đúng điều này, nên đó là phép đo đầu tiên của pilot."
- **Làm trước ngày thi:** tự tra quy định băng tần hiện hành. **Đừng khẳng định hợp quy khi chưa kiểm.**

## G. Độ ẩm, màng PTFE, xả đá

### Câu 34. Đọng sương là gì? Vì sao kho mát dễ đọng sương?
**Hiểu nhanh.** Không khí ở một nhiệt độ chỉ chứa được tối đa một lượng hơi nước. **Điểm sương** là nhiệt độ mà nếu làm lạnh không khí xuống đó, hơi nước bắt đầu ngưng thành giọt. Công thức gần đúng Magnus:

```
γ  = ln(RH/100) + 17,62·T / (243,12 + T)
Td = 243,12·γ / (17,62 − γ)
```

Ở 12 °C, độ ẩm 90 %: γ = −0,105 + 0,829 = 0,723; Td = 243,12 × 0,723 / 16,897 ≈ **10,4 °C**.
> **Nói:** "Ở 12 °C, độ ẩm 90 %, điểm sương chỉ khoảng 10,4 °C, thấp hơn nhiệt độ kho chưa tới 2 độ. Bất kỳ bề mặt nào lạnh hơn một chút, ví dụ vỏ thiết bị gần dàn lạnh, hay khi xả đá làm độ ẩm vọt lên 97 %, là nước ngưng ngay. Ở v1, tín hiệu TGS2602 tụt từ 46–48 kΩ xuống 4–6 kΩ sau 5,5–7 giờ ở độ ẩm khoảng 88 %, tức cảm biến 'tưởng' có rất nhiều khí."
- **Ghi điểm:** tự tính điểm sương trước giám khảo bằng công thức Magnus là chi tiết rất ít đội làm.

### Câu 35. Màng PTFE hoạt động thế nào? Có bằng chứng gì?
> **Nói:** "PTFE, cùng chất với lớp chống dính của chảo, kỵ nước và có lỗ rất nhỏ: phân tử khí đi qua được, còn giọt nước thì không vì sức căng bề mặt giữ giọt lại. Đặt ở cửa lấy khí, nó chặn nước mà vẫn cho mùi đi qua. Nhật ký v2 có 36 chu kỳ × 3 mạch = 108 lần đo, màng khô cả 108 lần, kể cả lúc 14,1 °C, độ ẩm 95,2 %. Đây là bằng chứng ngắn hạn, chưa đủ cho nhiều tháng."
- **Ghi điểm:** "Áo mưa thể thao loại thoáng khí cũng dùng màng PTFE theo đúng nguyên lý này."

### Câu 36. Xả đá gây cảnh báo giả thế nào? "Bù nhiệt ẩm" của em làm gì?
> **Nói:** "Kho định kỳ xả đá dàn lạnh, nhiệt độ vọt tới 14,6 °C, độ ẩm 97,5 %; 520 trên 4.500 mẫu có nhiệt độ từ 13,8 °C trở lên. Nhiệt độ, độ ẩm tăng làm Rs/R0 sụt giả, ở v2 sinh cảnh báo đỏ theo chu kỳ. Chúng em đưa nhiệt độ, độ ẩm của SHT31 vào làm đặc trưng, để mô hình học được 'sụt vì xả đá' khác 'sụt vì lên men'. Sau khi bù, cảnh báo giả ở mẫu nóng là 8/120, tức 6,7 %, gần bằng mẫu bình thường 54/880, tức 6,1 %, nghĩa là xả đá không còn gây báo giả nhiều hơn."
- **Trung thực:** chúng em chưa có số đo trước khi bù nên không nói được bù giảm bao nhiêu.
- **Đừng nói:** "bù nhiệt ẩm bằng công thức vật lý". Ở đây "bù" là đưa vào mô hình làm đặc trưng.

## H. Thiết kế thí nghiệm

### Câu 37. Mô tả thiết kế thí nghiệm. Biến độc lập, phụ thuộc là gì?
> **Nói:** "Ba điều kiện, mỗi điều kiện một buồng mát: quả lành (đối chứng), gây xước cơ học, cấy nấm thán thư. Lặp 3 đợt, bắt đầu ngày 1, 6 và 11/6/2026. Mỗi chuỗi 500 lần đo cách nhau 30 phút. Tổng 9 chuỗi, 4.500 mẫu, 60 kg xoài và chuối. Biến độc lập là tình trạng quả và thời gian lưu kho. Biến phụ thuộc là Rs/R0 hai cảm biến, nhãn trạng thái, thời điểm báo đỏ, thời điểm thấy vết thối. Nhiệt độ, độ ẩm được đo và ghi lại như biến kiểm soát."
- **Ghi điểm:** "Có buồng đối chứng để trả lời câu: tín hiệu giảm do hỏng hay chỉ do quả để lâu? Buồng đối chứng cũng chín, nhưng không bao giờ lên mức đỏ."

### Câu 38. Vì sao 500 mẫu, 30 phút, 10,4 ngày, tổng 21 ngày?
> **Nói:** "500 mẫu × 0,5 giờ = 250 giờ, khoảng 10,4 ngày, đủ dài để quả bị xước hay nhiễm nấm hiện vết thối, quả lành chín. Ba đợt cách nhau 5 ngày, đợt cuối bắt đầu ngày 11 và kéo dài 10,4 ngày nên cả thí nghiệm hết khoảng 21 ngày lịch. 30 phút là chu kỳ đo của thiết bị thật, nên dữ liệu thí nghiệm giống hệt dữ liệu khi lắp ở kho."

### Câu 39. Nhãn an toàn, chín sinh lý, lên men được gán dựa vào đâu?
> **Nói:** "Mỗi chuỗi bắt đầu ở 'an toàn'. Nhãn chuyển lớp dựa trên quan sát của nghiên cứu viên: kiểm tra quả và đo độ cứng mỗi 12 giờ `[điền: tiêu chí cụ thể: độ cứng bao nhiêu, dấu hiệu gì, ai gán]`. Ở buồng xước, quả sang lên men từ giờ 120, 136, 130; buồng nấm từ giờ 72, 68, 120; buồng đối chứng chỉ chuyển sang chín từ giờ 182, 182, 190 và không bao giờ lên men. Mốc khác nhau theo chuỗi nên không phải một thời điểm cài sẵn."
- **Câu quyết định:** nếu nhãn được gán bằng chính tín hiệu khí thì mô hình chỉ học lại cái mình đã gán, gọi là **lập luận vòng tròn**. Nhóm phải nói rõ nhãn đến từ quan sát nào. Đây là câu ảnh hưởng tới độ tin cậy của cả bộ dữ liệu.

### Câu 40. Thời điểm "thấy vết thối" được xác định thế nào?
> **Nói:** "Quan sát hai tầng. Nghiên cứu viên kiểm tra quả mỗi 12 giờ; camera time-lapse trong mỗi buồng chụp mỗi 30 phút. Khi ca kiểm tra thấy vết thối, chúng em xem ngược ảnh 12 giờ trước để tìm khung hình đầu tiên có vết từ 1 mm. Nhờ vậy mốc thấy vết thối chính xác đến nửa giờ, không phải 12 giờ."
- **Ghi điểm:** "Nếu chỉ dùng ca kiểm tra 12 giờ, mốc thấy vết thối có thể muộn tới 12 giờ và Δt bị thổi phồng. Rà ngược ảnh làm Δt **nhỏ đi**, tức chúng em chọn cách tính bất lợi cho mình." Ca kiểm tra trực tiếp kế tiếp muộn hơn khung ảnh 0,5–11,5 giờ, nghĩa là nếu so với mắt người kiểm tra thật thì cảnh báo còn sớm hơn nữa.
- **Mang theo:** ảnh time-lapse của 6 chuỗi, biên bản kiểm tra `[điền: ai đánh giá ảnh, mấy người]`.

### Câu 41. Có 9 chuỗi mà chỉ có 3 Node, các đợt lại chồng nhau 5 ngày. Đo kiểu gì?
> **Nói:** `[điền sự thật: mỗi Node phục vụ buồng nào trong khoảng chồng nhau; thực tế có bao nhiêu Node, bao nhiêu buồng]`. "Chúng em ghi rõ trong báo cáo rằng các đợt chồng nhau 5 ngày với cùng mã buồng, và giống quả, độ chín ban đầu, khối lượng từng buồng chưa được ghi đủ."
- **Rất quan trọng:** đây là câu giám khảo đọc kỹ sẽ hỏi. Nếu thực tế có nhiều Node hơn, sửa báo cáo cho khớp trước ngày thi. Trả lời mơ hồ ở câu này làm hỏng cả bộ dữ liệu.

### Câu 42. Có 4.500 mẫu, vậy cỡ mẫu là 4.500?
**Hiểu nhanh.** Hai lần đo cách nhau 30 phút trên cùng một sọt quả gần như giống nhau. Mức giống nhau đo bằng **tự tương quan bậc 1** ρ (tương quan giữa mẫu thứ t và t+1). Với dữ liệu của nhóm, ρ của TGS2602 khoảng 0,85–0,98 (tính lại). Cỡ mẫu hiệu dụng ước lượng thô:

```
n_hiệu dụng ≈ n · (1 − ρ) / (1 + ρ)
ρ = 0,98, n = 500  ⇒  500 × 0,02/1,98 ≈ 5
```

> **Nói:** "Không. 4.500 là số lần đo, còn đơn vị độc lập là chuỗi: 9 chuỗi, 6 chuỗi có vết thối. Các lần đo liền nhau giống nhau tới mức tự tương quan khoảng 0,9, nên một chuỗi 500 mẫu chỉ mang lượng thông tin như vài chục mẫu độc lập. Vì vậy chúng em không tách tập kiểm tra ngẫu nhiên mà tách theo đợt, và coi mọi khoảng tin cậy tính theo mẫu là quá lạc quan."
- **Ghi điểm:** đây là câu phân biệt học sinh hiểu thống kê thật với học sinh chỉ báo số to.
- **Đừng nói:** "4.500 mẫu nên rất chắc chắn".

### Câu 43. Mỗi điều kiện chỉ có một buồng cố định. Sao biết mô hình học bệnh chứ không học buồng?
> **Nói:** "Đúng là hiệu ứng buồng chưa tách hẳn khỏi hiệu ứng bệnh, chúng em coi đây là hạn chế lớn nhất. Nhiệt độ trung bình giữa các buồng lệch tới 0,5 °C, độ ẩm 1,6 %. Có hai bằng chứng gián tiếp: lớp lên men xuất hiện ở cả hai buồng bệnh khác nhau, và buồng đối chứng không bao giờ lên mức đỏ ở cả 3 đợt. Nhưng lớp chín sinh lý thì có 392 trên 524 mẫu, tức 74,8 %, đến từ buồng đối chứng, nên lớp này rất có thể bị lẫn với đặc điểm buồng. Đợt sau chúng em sẽ hoán đổi điều kiện giữa các buồng và đổi Node."
- **Ghi điểm:** nói con số 74,8 % trước khi giám khảo tìm ra.

### Câu 44. Quả hỏng do em gây ra, đâu phải hỏng tự nhiên?
> **Nói:** "Đúng. Gây xước và cấy nấm giúp chúng em biết chắc quả nào hỏng, hỏng từ lúc nào, và có đối chứng; với quả hỏng tự nhiên thì không kiểm soát được. Đổi lại, kết quả chưa chắc giống hỏng tự nhiên trong kho. Pilot ở kho thật sẽ thu dữ liệu từ lô hỏng tự nhiên."

### Câu 45. Thí nghiệm có an toàn không? Nấm thán thư có lây ra ngoài không?
> **Nói:** "Nấm thán thư là tác nhân gây bệnh thực vật, không thí nghiệm trên người hay động vật. Chúng em cấy trong buồng riêng đóng kín, đeo găng tay, khẩu trang, không mang quả nhiễm ra ngoài; quả hỏng cho vào túi kín và tiêu hủy, khử trùng buồng và dụng cụ. Không ăn quả thí nghiệm. Có kiểm tra an toàn cùng giáo viên trước thí nghiệm (28/5/2026) và sau thí nghiệm (22/6/2026), ghi trong sổ nhật ký. Làm việc trong buồng lạnh thì mặc ấm, vào ngắn, kiểm tra ban đêm luôn có người thứ hai."
- **Mang theo:** sổ nhật ký có chữ ký; `[điền: nguồn chủng nấm, đã định danh loài chưa]`.

## I. Thuật toán Random Forest

### Câu 46. Cây quyết định là gì? Máy chọn câu hỏi chia nhánh thế nào?
**Hiểu nhanh.** Cây quyết định là chuỗi câu hỏi có/không, ví dụ: "TGS2602 < 0,56?" → có → "TGS822 < 0,6?" → … đến lá thì kết luận một lớp. Máy chọn câu hỏi bằng cách thử nhiều ngưỡng và chọn ngưỡng làm hai nhóm con **thuần nhất** nhất. Độ "lẫn lộn" đo bằng **chỉ số Gini**:

```
Gini = 1 − Σ pᵢ²        (pᵢ: tỉ lệ lớp i trong nút)
```

Ví dụ tính tay: một nút có 30 mẫu an toàn, 10 mẫu lên men → Gini = 1 − (0,75² + 0,25²) = 0,375.
Thử chia bằng "TGS2602 < 0,56":
- Nhánh có: 1 an toàn, 10 lên men → Gini = 1 − (0,091² + 0,909²) = 0,165.
- Nhánh không: 29 an toàn, 0 lên men → Gini = 0 (thuần hoàn toàn).
- Gini trung bình có trọng số = 11/40 × 0,165 + 29/40 × 0 = 0,045.

Độ lẫn lộn giảm từ 0,375 xuống 0,045 nên đây là câu hỏi tốt. Máy thử mọi ngưỡng và chọn ngưỡng giảm Gini nhiều nhất.
> **Nói:** "Cây quyết định hỏi liên tiếp các câu có/không về tín hiệu. Ở mỗi nút, máy thử nhiều ngưỡng và chọn ngưỡng làm hai nhóm con ít lẫn lộn nhất, đo bằng chỉ số Gini bằng 1 trừ tổng bình phương tỉ lệ các lớp. Nút thuần một lớp có Gini bằng 0."

### Câu 47. Random Forest là gì? Vì sao "rừng" tốt hơn một cây?
**Hiểu nhanh, ba ý:**
1. **Bootstrap (bốc có hoàn lại):** mỗi cây được học trên một bộ dữ liệu bốc ngẫu nhiên có hoàn lại từ tập huấn luyện, cùng kích thước. Xác suất một mẫu không được bốc lần nào là (1 − 1/n)ⁿ ≈ 1/e ≈ 36,8 %, nên mỗi cây chỉ thấy khoảng 63 % số mẫu khác nhau.
2. **Chọn ngẫu nhiên đặc trưng:** ở mỗi nút, cây chỉ được xét một phần đặc trưng. Mặc định của thư viện scikit-learn là √(số đặc trưng); với 4 đặc trưng là 2 `[điền: xác nhận trong mã gốc]`.
3. **Bỏ phiếu:** 100 cây cùng dự đoán, lấy trung bình xác suất từng lớp, lớp nào cao nhất thì chọn.

Một cây sâu dễ "học thuộc" nhiễu (quá khớp). Nhiều cây khác nhau thì sai theo các hướng khác nhau, trung bình lại sẽ triệt bớt sai.
> **Nói:** "Random Forest là 100 cây quyết định, mỗi cây học trên một phần dữ liệu bốc ngẫu nhiên và ở mỗi nút chỉ được xét ngẫu nhiên một số đặc trưng, nên các cây khác nhau. Khi dự đoán, 100 cây bỏ phiếu. Giống hỏi ý kiến 100 người độc lập thay vì tin một người: sai của từng người triệt tiêu nhau."
- **Ghi điểm:** "Hai nguồn ngẫu nhiên, bốc mẫu và bốc đặc trưng, là để các cây **không giống nhau**. 100 cây giống hệt nhau thì chẳng hơn gì một cây."

### Câu 48. Các tham số n_estimators = 100, max_depth = 8, random_state = 123 nghĩa là gì?
> **Nói:** "n_estimators = 100 là số cây. max_depth = 8 là mỗi cây hỏi tối đa 8 câu liên tiếp, tức tối đa 2⁸ = 256 lá; giới hạn này chặn cây học thuộc nhiễu. random_state = 123 là hạt giống của bộ sinh số ngẫu nhiên, để ai chạy lại cũng ra đúng kết quả đó, gọi là tái lập được. `[điền: tham số được chọn thế nào: thử vài giá trị trên dữ liệu huấn luyện, hay dùng mặc định]`."
- **Ghi điểm (tính lại):** khi chạy lại với 20 hạt giống khác nhau, độ chính xác chỉ dao động 90,6–91,0 %, nên kết quả không phụ thuộc vào con số 123 may mắn.
- **Đừng nói:** bịa lý do toán học cho con số 8 hay 100.

### Câu 49. Mô hình nhận đầu vào gì? Vì sao không đưa thời gian lưu kho vào?
> **Nói:** "Bốn đặc trưng: Rs/R0 của TGS2602, Rs/R0 của TGS822, nhiệt độ và độ ẩm `[điền: xác nhận đúng với mô hình đã báo cáo]`. Chúng em cố ý không đưa giờ lưu kho vào. Nếu có giờ, mô hình có thể học mẹo 'cứ quá giờ 120 là hỏng' mà không cần nhìn khí, điểm sẽ cao hơn nhưng vô dụng ở kho thật, nơi mỗi lô vào kho một lúc khác nhau và hỏng ở thời điểm khác nhau."
- **Ghi điểm (tính lại):** thêm giờ vào thì độ chính xác lên khoảng 92–98 %, nhưng chúng em không dùng vì con số đẹp đó là nhờ "đếm lịch" chứ không phải "ngửi".

### Câu 50. Mô hình riêng cho xoài và chuối hay dùng chung?
> **Nói:** `[điền sự thật: một mô hình chung hay hai mô hình; các buồng chứa xoài, chuối hay trộn]`. "Báo cáo viết 'huấn luyện riêng cho xoài và chuối' theo nghĩa dữ liệu được thu từ hai loại quả này ở điều kiện kho mát."
- **Lưu ý:** file dữ liệu không có cột loại quả. Nếu thực tế là một mô hình chung, nói thẳng "một mô hình chung cho cả hai", và chuẩn bị câu: "Tách riêng từng loại là bước tiếp theo khi có thêm dữ liệu."

### Câu 51. Đặc trưng nào quan trọng nhất?
**Hiểu nhanh.** Độ quan trọng (theo giảm Gini) = tổng lượng Gini giảm được ở mọi nút dùng đặc trưng đó, cộng trên 100 cây, chuẩn hóa về tổng bằng 1.
> **Nói (tính lại trên CSV):** "TGS2602 khoảng 0,49, TGS822 khoảng 0,47, độ ẩm 0,02, nhiệt độ 0,02. Hai cảm biến khí chiếm khoảng 96 %. Điều này cho thấy mô hình quyết định chủ yếu dựa vào khí, nhiệt ẩm chỉ để hiệu chỉnh, đúng như thiết kế, và cũng là bằng chứng gián tiếp mô hình không chỉ học nhiệt độ riêng của từng buồng."

### Câu 52. Sao không dùng mạng nơ-ron cho "xịn"? Và có cần học máy không, dùng một ngưỡng có được không?
> **Nói:** "Dữ liệu chỉ có 4 đặc trưng và vài nghìn mẫu tự tương quan; mạng nơ-ron cần nhiều dữ liệu hơn và khó giải thích. Random Forest chạy nhẹ trên Raspberry Pi và cho biết đặc trưng nào quan trọng. Chúng em cũng đã so với mô hình đơn giản (tính lại): chỉ một ngưỡng TGS2602 < 0,56 bắt được khoảng 91 % mẫu lên men; hồi quy logistic gần bằng Random Forest. Nghĩa là với lớp lên men, tín hiệu đủ mạnh để mô hình đơn giản cũng làm được. Random Forest có thêm phần phân biệt chín sinh lý và xử lý xả đá, nhưng lớp chín sinh lý vẫn chưa đạt."
- **Ghi điểm:** "Tín hiệu tốt thì mô hình đơn giản cũng thắng. Chúng em coi đó là tin tốt cho phần cứng, không phải tin xấu cho học máy."
- **Đừng nói:** "bắt buộc phải dùng AI", "Random Forest là tối ưu".

## J. Đánh giá mô hình

### Câu 53. Vì sao tách tập kiểm tra theo đợt mà không trộn ngẫu nhiên 70/30?
**Hiểu nhanh.** Nếu trộn ngẫu nhiên, mẫu lúc 10:00 vào tập huấn luyện, mẫu lúc 10:30 cùng sọt đó vào tập kiểm tra. Hai mẫu gần như giống nhau, nên mô hình "nhìn thấy đáp án" trước khi thi. Hiện tượng này gọi là **rò rỉ dữ liệu** và làm điểm số đẹp giả.
> **Nói:** "Các mẫu liền nhau giống nhau gần như đúc. Trộn ngẫu nhiên thì mô hình như học sinh được xem đề trước khi thi, điểm cao mà không biết làm bài mới. Chúng em huấn luyện trên đợt 1, 2 (3.000 mẫu) và kiểm tra trên đợt 3 (1.500 mẫu), nên đợt 3 là quả mới mô hình chưa từng thấy. Hạn chế là đợt 3 vẫn dùng chung buồng và Node với đợt 1, 2."
- **Ghi điểm:** "Cách chia này cho điểm thấp hơn trộn ngẫu nhiên, nhưng là con số trung thực."

### Câu 54. Đọc ma trận nhầm lẫn của em.
**Hiểu nhanh.** Hàng là thực tế, cột là dự đoán. Đường chéo là đoán đúng.

| Thực tế \ Dự đoán | An toàn | Chín sinh lý | Lên men | Tổng |
|---|---|---|---|---|
| An toàn | **715** | 42 | 23 | 780 |
| Chín sinh lý | 82 | **99** | 39 | 220 |
| Lên men | 0 | 2 | **498** | 500 |

Độ chính xác = (715 + 99 + 498)/1.500 = 1.312/1.500 = 87,47 %.
> **Nói:** "Đường chéo là đoán đúng, cộng lại 1.312 trên 1.500. Ô em quan tâm nhất là góc dưới trái: số mẫu lên men bị gọi là an toàn bằng 0. Nghĩa là trong đợt kiểm tra, không sọt hỏng nào bị bỏ qua. Ô yếu nhất là hàng chín sinh lý: chỉ 99 trên 220 đúng, 82 mẫu bị gọi là an toàn."
- **Ghi điểm:** chỉ tay vào ô 0 ở góc dưới trái. Đó là ô quan trọng nhất của cả dự án.

### Câu 55. Tính độ nhạy, độ đặc hiệu, độ chính xác dự đoán và F1 cho lớp lên men.
**Hiểu nhanh, với lớp "lên men":**
- **Độ nhạy (recall)**: trong số thật sự lên men, bắt được bao nhiêu = 498/500 = **99,6 %**.
- **Độ đặc hiệu**: trong số không lên men, bao nhiêu được để yên = (1.000 − 62)/1.000 = **93,8 %**. Ở đây 62 = 23 + 39 là mẫu không lên men bị gọi lên men.
- **Độ chính xác dự đoán (precision)**: trong số bị báo lên men, bao nhiêu đúng = 498/(498 + 62) = **88,9 %**.
- **F1** = 2 × P × R/(P + R) = 2 × 0,889 × 0,996/1,885 = **94,0 %**. F1 là trung bình điều hòa, bị kéo xuống mạnh nếu một trong hai chỉ số thấp.

Làm tương tự cho lớp chín sinh lý: nhạy 99/220 = 45,0 %, precision 99/143 = 69,2 %, F1 = 54,5 %. Lớp an toàn: F1 = 90,7 %. **F1 trung bình ba lớp = (90,7 + 54,5 + 94,0)/3 = 79,7 %.**
> **Nói:** "Với lớp lên men, độ nhạy 99,6 % nghĩa là bắt được gần hết sọt hỏng; độ chính xác dự đoán 88,9 % nghĩa là cứ 9 lần báo đỏ thì khoảng 8 lần đúng. F1 trung bình ba lớp chỉ 79,7 %, thấp hơn độ chính xác chung 87,5 %, vì lớp chín sinh lý kéo xuống."
- **Ghi điểm:** "Trong kho, bỏ sót một sọt hỏng có thể mất cả pallet, còn báo nhầm chỉ tốn công mở một sọt kiểm tra. Nên chúng em ưu tiên độ nhạy hơn độ chính xác dự đoán."

### Câu 56. Lớp chín sinh lý chỉ đúng 45 %. Vậy 87,5 % có phải "làm đẹp số" không?
> **Nói:** "Độ chính xác chung bị lớp đông nhất chi phối: lớp an toàn chiếm 52 % tập kiểm tra. Vì vậy chúng em báo thêm F1 trung bình 79,7 % và độ chính xác cân bằng, tức trung bình độ nhạy ba lớp, chỉ 78,8 %. Lớp chín sinh lý yếu thật, và 74,8 % mẫu của lớp này đến từ một buồng, nên chúng em chỉ dùng mức vàng như tín hiệu theo dõi, không dùng để ra quyết định. Kết quả chính của dự án là lớp lên men."
- **Ghi điểm:** tự đưa ra con số 78,8 % thấp hơn trước khi bị hỏi. Học sinh dám báo con số xấu là học sinh giám khảo tin.

### Câu 57. Cảnh báo giả 6,2 % tính thế nào? Ở kho thật một ngày báo sai mấy lần?
> **Nói:** "6,2 % là 62 trên 1.000 mẫu không lên men bị dự đoán là lên men, tính theo từng mẫu. Ở buồng đối chứng đợt 3 có 28 mẫu như vậy trong 10,4 ngày, khoảng 2,7 mẫu mỗi ngày, nhưng toàn là mẫu đơn lẻ, không có lần nào kéo dài 6 mẫu liên tiếp. Nếu chỉ báo đỏ khi 6 mẫu liên tiếp, tức 3 giờ, thì buồng đối chứng không bị báo sai lần nào."

### Câu 58. Khoảng tin cậy 85,7–89,0 % trong báo cáo, sao em lại nói "thực tế rộng hơn"?
> **Nói:** "Khoảng đó tính như thể 1.500 mẫu độc lập. Thực ra chúng đến từ chỉ 3 chuỗi và các mẫu liền nhau rất giống nhau, nên lượng thông tin thật ít hơn nhiều. Khi tính lại theo chuỗi bằng bootstrap, khoảng tin cậy rộng ra khoảng 81–93 %, cận dưới thấp hơn ngưỡng 85 %. Vì vậy chúng em gọi 87,47 % là ước lượng thô."
- **Hiểu nhanh về bootstrap:** bốc lại có hoàn lại các chuỗi kiểm tra rất nhiều lần, mỗi lần tính lại độ chính xác, rồi lấy khoảng chứa 95 % kết quả ở giữa. Với chỉ 3 chuỗi, chính bootstrap cũng chỉ là ước lượng thô.

### Câu 59. "Ngưỡng cảnh báo đỏ được hạ thấp" là gì?
**Hiểu nhanh.** Random Forest cho xác suất từng lớp, ví dụ an toàn 0,55, chín 0,10, lên men 0,35. Bình thường chọn lớp xác suất cao nhất (an toàn). Nếu quy định "xác suất lên men từ 0,3 là báo đỏ", mẫu này sẽ bị báo đỏ. Hạ ngưỡng thì bắt được nhiều mẫu lên men hơn (nhạy tăng) nhưng báo nhầm nhiều hơn. Đây là đánh đổi cơ bản của mọi hệ cảnh báo, giống còi báo cháy chỉnh quá nhạy thì kêu cả khi nấu cơm.
> **Nói:** "Chúng em hạ ngưỡng xác suất để báo đỏ, chấp nhận báo nhầm nhiều hơn để không bỏ sót sọt hỏng. Kết quả là không mẫu lên men nào bị gọi là an toàn. `[điền: ngưỡng cụ thể, chọn trên tập nào, lúc nào]`."
- **Trung thực bắt buộc:** nếu ngưỡng được chọn sau khi nhìn kết quả đợt 3, thì đợt 3 không còn là tập kiểm tra sạch. Phải nói ra. Cách đúng là chọn ngưỡng trên một tập xác nhận riêng.

### Câu 60. Chạy lại mô hình ra khoảng 90,9 %, khác 87,5 % trong báo cáo. Vì sao?
> **Nói (tính lại):** "Với ngưỡng mặc định, chạy lại cho khoảng 90,9 %, cảnh báo giả lớp lên men chỉ khoảng 0,2 %, độ nhạy lớp lên men khoảng 98,4 %. Bảng 4.4 dùng ngưỡng đỏ hạ thấp nên nhạy tăng lên 99,6 % nhưng cảnh báo giả tăng lên 6,2 % và độ chính xác chung giảm. Chúng em chọn báo cấu hình ngưỡng thấp vì trong kho bỏ sót nguy hiểm hơn báo nhầm `[điền: nhóm chốt công bố cấu hình nào và lý do]`."
- **Ghi điểm (tính lại):** luân phiên từng đợt làm tập kiểm tra cho 95,1 %, 95,7 % và 90,9 %; đợt 3 là đợt khó nhất, tức con số báo cáo là trường hợp xấu nhất, không phải chọn đợt đẹp.
- **Quyết định nhóm phải chốt trước ngày thi.** Đừng để giám khảo là người phát hiện hai con số khác nhau.

## K. Cảnh báo ba mức và thời gian cảnh báo sớm Δt

### Câu 61. Ba mức xanh, vàng, đỏ được quyết định thế nào?
> **Nói:** "Hub phân loại từng khu: xanh khi tín hiệu ổn định; vàng khi tín hiệu lệch khỏi đường chín bình thường; đỏ khi tín hiệu lên men xuất hiện và kéo dài. Vì lớp chín sinh lý chỉ đúng 45 %, mức vàng chỉ để nhân viên theo dõi. Mức đỏ mới là lệnh hành động. Hệ thống chỉ hỗ trợ, nhân viên vẫn mở sọt kiểm tra."

### Câu 62. Quy tắc "6 mẫu liên tiếp" là gì? Vì sao 6?
**Hiểu nhanh.** Báo đỏ chỉ khi mô hình đoán "lên men" ở 6 lần đo liền nhau (3 giờ). Nếu báo giả xảy ra độc lập với xác suất 6,2 %, xác suất 6 lần giả liên tiếp là 0,062⁶ ≈ 0,00000006. Thực tế các mẫu liền nhau không độc lập nên con số thật cao hơn, nhưng dữ liệu đợt 3 cho thấy buồng đối chứng không có đoạn đỏ nào dài 6 mẫu.
> **Nói:** "Báo giả của mô hình là các mẫu lẻ tẻ, còn lên men thật thì kéo dài. Quy tắc 6 mẫu liên tiếp lọc được mẫu lẻ: ở đợt 3, buồng đối chứng không báo sai lần nào, còn hai buồng hỏng có đỏ bền từ giờ 129,5 (xước) và 119,5 (nấm). Đổi lại, cảnh báo xác nhận muộn thêm 2,5 giờ, vì phải chờ đến mẫu thứ 6. Con số 6 `[điền: chọn trước hay sau khi xem dữ liệu đợt 3]`."
- **Ghi điểm:** "Tính cả 2,5 giờ chờ xác nhận thì Δt của đợt 3 còn 33,5 và 25,0 giờ, vẫn gấp đôi ngưỡng 12 giờ." Một câu cho thấy em đã tự kiểm tra kỹ hơn cả báo cáo.

### Câu 63. Δt = 26,3 ± 6,4 giờ được tính thế nào?
**Hiểu nhanh.** Với mỗi chuỗi có vết thối: Δt = giờ thấy vết thối − giờ bắt đầu mức đỏ. Sáu giá trị: nấm 18,5; 21,0; 27,0 và xước 24,5; 31,5; 35,5 giờ.

```
Trung bình  = 158,0 / 6 = 26,33 giờ
Độ lệch chuẩn: bình phương độ lệch cộng lại = 204,3; chia (6 − 1) = 40,87; căn = 6,39 giờ
Khoảng tin cậy 95 % = 26,33 ± 2,571 × 6,39/√6 = 26,33 ± 6,71  ⇒  19,6 đến 33,0 giờ
```

(2,571 là giá trị t với 5 bậc tự do. Chia cho 6 − 1 chứ không chia 6 vì đây là độ lệch chuẩn mẫu.)
> **Nói:** "Lấy giờ thấy vết thối trừ giờ bắt đầu mức đỏ cho 6 chuỗi, ra từ 18,5 đến 35,5 giờ, trung bình 26,3, độ lệch chuẩn 6,4. Khoảng tin cậy 95 % là 19,6 đến 33 giờ, cận dưới vẫn hơn ngưỡng 12 giờ. Cả 6 chuỗi đều trên 12 giờ; buồng lành không có cảnh báo."
- **Ghi điểm:** "26 giờ nghĩa là nếu sáng thứ Hai máy báo đỏ, thì phải đến khoảng trưa thứ Ba mắt mới thấy vết thối. Đủ cho hai ca làm việc tách sọt."

### Câu 64. Δt tính từ dự đoán của mô hình hay từ nhãn?
> **Nói:** "Chúng em nói thẳng: 26,3 giờ tính từ lúc **nhãn** chuyển sang lên men, vì cột cảnh báo đỏ trong dữ liệu thô trùng với nhãn. Con số tính từ **dự đoán thật** của mô hình chỉ có ở đợt 3, đợt kiểm tra: 36,0 giờ với chuỗi xước và 27,5 giờ với chuỗi nấm, đều lớn hơn 12 giờ. Đợt 1, 2 là dữ liệu huấn luyện nên dùng dự đoán ở đó sẽ không công bằng. Từ đợt sau, chúng em lưu dự đoán từng mẫu của mọi chuỗi để tính Δt thật."
- **Đừng nói:** "26,3 giờ là hiệu năng của mô hình".
- **Bẫy cần tránh:** báo cáo có nhắc giờ 28,5 và 14,0 là lần đầu mô hình đoán lên men ở một mẫu đơn lẻ. Đó là báo giả lẻ tẻ, không phải Δt. Đừng đọc nhầm thành "báo sớm 100 giờ".

### Câu 65. Có kiểm định thống kê nào không?
**Hiểu nhanh, kiểm định t một mẫu:** giả thuyết H₀ "Δt trung bình chỉ bằng 12 giờ".

```
t = (26,33 − 12) / (6,39/√6) = 14,33 / 2,61 ≈ 5,49      (5 bậc tự do)
p ≈ 0,003 (hai phía)
```

Kiểm định Wilcoxon (không cần giả định phân phối chuẩn): cả 6 giá trị đều lớn hơn 12, p một phía = 1/2⁶ = 0,016, là giá trị nhỏ nhất có thể với n = 6.
> **Nói (tính lại):** "Có. So với ngưỡng 12 giờ, kiểm định t một mẫu cho t ≈ 5,5, p ≈ 0,003; vì chỉ có 6 giá trị nên chúng em làm thêm Wilcoxon không cần giả định phân phối chuẩn, p = 0,016. Cả hai đều bác bỏ giả thuyết Δt chỉ bằng 12 giờ. Nhưng 6 sự kiện vẫn ít, và 4 trong 6 tính từ nhãn."
- **Ghi điểm:** "p = 1/64 là nhỏ nhất có thể khi n = 6, vì có 2⁶ = 64 cách gán dấu cho 6 giá trị và chỉ một cách là cả 6 cùng dương."

### Câu 66. Chuỗi xước báo sớm hơn chuỗi nấm ở cả 3 đợt. Khác biệt này có ý nghĩa không?
> **Nói:** "Trung bình xước 30,5 giờ, nấm 22,2 giờ. Nhưng mỗi nhóm chỉ 3 giá trị; kiểm định Mann–Whitney với 3 và 3 thì p nhỏ nhất có thể là 0,10, không bao giờ dưới 0,05. Chúng em không kết luận có khác biệt. Một giả thuyết để kiểm tra sau: quả bị xước lên men sớm từ vết thương trước khi vết thâm lộ ra ngoài."
- **Đừng nói:** "khác biệt có ý nghĩa thống kê".

## L. Kinh tế và vận hành

### Câu 67. Giá vốn 13,4 triệu, giá bán 22 triệu tính thế nào? Lãi gộp 39,1 % là gì?
> **Nói:** "Một Node khoảng 1,15 triệu, trong đó đắt nhất là vi điều khiển có LoRa 300 nghìn và hai cảm biến khí 400 nghìn. Hub 4,2 triệu. Gói 1 Hub + 8 Node = 4,2 + 8 × 1,15 = 13,4 triệu. Bán 22 triệu thì lãi gộp = (22 − 13,4)/22 = 39,1 %. Lãi gộp chưa trừ lắp đặt, bảo hành, vận chuyển, nên chưa phải lợi nhuận. Bảng giá là ước tính từ bảng kê vật tư, chưa có báo giá nhà cung cấp."
- **Thẳng thắn:** tiêu chí giá ≤ 22 triệu "đạt" vì nhóm đặt giá bán đúng bằng ngưỡng. Tự nói trước.

### Câu 68. Thu hồi vốn sau 1–2 mẻ có thực tế không?
**Hiểu nhanh.** Kho 50 tấn × 25.000 đ/kg = 1,25 tỷ đồng mỗi mẻ. Mỗi 1 % hao hụt giảm được = 12,5 triệu.

| Giảm hao hụt | Tiết kiệm/mẻ | Thu hồi gói 22 triệu sau |
|---|---|---|
| 0,5 % | 6,25 triệu | ≈ 3,5 mẻ |
| 1,0 % | 12,5 triệu | ≈ 1,8 mẻ |
| 1,5 % | 18,75 triệu | ≈ 1,2 mẻ |
| 2,0 % | 25 triệu | ≈ 0,9 mẻ |

> **Nói:** "Đó là giả định, chưa đo: giảm thêm 1,5–2 % hao hụt thì thu hồi sau 1–2 mẻ. Chúng em đã thử kịch bản xấu hơn: chỉ giảm 0,5 % thì cần khoảng 3,5 mẻ. Con số thật phải chờ pilot."
- **Ghi điểm:** chủ động đưa bảng độ nhạy giả định. Giám khảo thấy em không "bán giấc mơ".

### Câu 69. Máy báo đỏ thì nhân viên kho làm gì? Sao không hạ nhiệt độ kho cho chắc?
> **Nói:** "Ba việc: tách sọt dập hoặc nhiễm nấm để chặn lây; tăng thông gió cục bộ để giảm ethylene; xuất trước lô chín nhanh theo FEFO. Hệ thống không khuyên hạ nhiệt độ, vì xoài, chuối là quả nhiệt đới, xuống quá lạnh sẽ bị tổn thương lạnh: vỏ thâm đen, chín không đều, hỏng còn nhanh hơn. Ngưỡng nhiệt cụ thể theo khuyến cáo của chuyên gia bảo quản. Hiệu quả của các can thiệp này chúng em chưa đo."
- **Ghi điểm:** biết "tổn thương lạnh" là chi tiết cho thấy em hiểu sinh học sau thu hoạch, không chỉ hiểu điện tử.

### Câu 70. Vì sao gói 8 Node? Đặt Node ở đâu?
> **Nói:** "8 Node là giả định một Node cho mỗi dãy kệ của kho cỡ vừa `[điền: số dãy kệ giả định]`. Node gắn bằng nam châm ở thành pallet hoặc họng hồi gió, nơi không khí từ các sọt đi qua. Chúng em chưa thí nghiệm mật độ lắp và chưa kiểm chứng khả năng chỉ đúng dãy kệ, vì mỗi buồng thí nghiệm chỉ có một Node. Đây là việc của pilot."

### Câu 71. Pilot ở kho thật đã có kết quả chưa?
> **Nói:** `[điền sự thật]`. Nếu chưa: "Chưa. Pilot ở 2 kho mát tại Phú Thọ, Vĩnh Phúc dự kiến từ 10/2026 đến 2/2027, chưa có số liệu. Bốn thứ chúng em sẽ đo đầu tiên: sóng LoRa xuyên vách panel, số báo giả mỗi tuần, Node có chỉ đúng dãy kệ có sọt hỏng không, và hao hụt trước, sau khi lắp."
- **Đừng nói:** "pilot cho kết quả tốt" khi chưa có số.

## M. Hạn chế, liêm chính và câu chốt

### Câu 72. Ba điểm yếu lớn nhất của dự án?
> **Nói:** "Một: tập kiểm tra chỉ có 3 chuỗi, dùng chung buồng và Node với tập huấn luyện, mỗi điều kiện chỉ một buồng cố định, nên 87,5 % là ước lượng thô. Hai: lớp chín sinh lý chỉ nhạy 45 % và lẫn với buồng đối chứng, nên mức vàng chỉ để theo dõi. Ba: Δt chủ yếu tính từ nhãn, chưa đo ethanol để xác nhận nguồn tín hiệu, và chưa thử ở kho thật. Cách khắc phục là đợt mới hoán đổi buồng, nhiều Node trong một buồng, lưu dự đoán từng mẫu, đối chiếu sắc ký khí, rồi pilot."
- **Ghi điểm:** trả lời không do dự, đủ ba ý, mỗi ý có hướng sửa. Đây thường là câu giám khảo dùng để quyết định điểm "tư duy khoa học".

### Câu 73. Dữ liệu là đo thật hay mô phỏng? Cho xem bằng chứng.
> **Nói:** `[điền sự thật]`. "Chúng em mang theo log gốc từ Node có dấu thời gian, ảnh time-lapse, sổ nhật ký nghiên cứu có chữ ký giáo viên ngày 28/5 và 22/6/2026, hóa đơn mua quả, vật tư. `[điền: dữ liệu có qua làm sạch, lọc, nội suy gì không]`."
- **Nguyên tắc sống còn:** nếu bất kỳ phần nào của dữ liệu được làm sạch, nội suy hay sinh thêm, phải nói thẳng. Giám khảo phát hiện nói dối là mất toàn bộ điểm, kể cả những phần làm thật.

### Câu 74. Em trực tiếp làm phần nào?
> **Nói:** `[điền đúng từng người: mạch, firmware, thí nghiệm, gán nhãn, mô hình, báo cáo; người lớn hỗ trợ phần nào]`.
- **Chuẩn bị:** mỗi thành viên phải tự giải thích được ít nhất: Rs/R0 và mạch chia áp (câu 13, 20), ngân sách năng lượng (câu 25), vì sao tách theo đợt (câu 53), đọc ma trận nhầm lẫn (câu 54) và cách tính Δt (câu 63).
- **Đừng nói:** nhận phần mình không hiểu. Giám khảo sẽ hỏi xoáy đúng phần đó.

### Câu 75. Nếu có thêm 6 tháng, em làm gì đầu tiên?
> **Nói:** "Theo thứ tự ưu tiên: một, đợt thí nghiệm mới có hoán đổi buồng, nhiều Node độc lập, ghi giống quả, độ chín ban đầu, khối lượng; hai, lưu dự đoán từng mẫu để tính Δt thật cho mọi chuỗi; ba, đo ethanol bằng sắc ký khí để xác nhận nguồn tín hiệu; bốn, pilot ở kho thật và đo hao hụt trước, sau."

### Câu 76. Câu chốt: vì sao hội đồng nên tin dự án này?
> **Nói:** "Vì mọi con số của chúng em đều có dữ liệu thô đi kèm và đều có giới hạn đi kèm. Con số chúng em tự hào nhất: 498 trên 500 mẫu lên men được nhận đúng, không mẫu nào bị gọi là an toàn, và cả 6 chuỗi đều báo sớm hơn mắt thường trên 12 giờ. Con số chúng em chưa hài lòng: lớp chín sinh lý 45 %. Một thiết bị 1,15 triệu một Node, chạy 3 tuần một lần sạc, có thể giúp HTX biết sọt nào sắp hỏng trước khi nó kéo cả pallet theo."

## Từ điển nhanh

| Thuật ngữ | Giải thích một dòng |
|---|---|
| MOX | cảm biến khí bán dẫn oxit kim loại, điện trở giảm khi có khí khử |
| Rs/R0 | điện trở lúc đo chia điện trở trong khí sạch; bằng 1 là sạch, nhỏ hơn là có khí |
| Hô hấp đột biến | quả tiếp tục chín, tăng vọt hô hấp và ethylene sau khi hái |
| Lên men | mô thiếu oxy chuyển đường thành acetaldehyde, ethanol |
| Điểm sương | nhiệt độ làm hơi nước trong không khí ngưng thành giọt |
| PTFE | màng kỵ nước có lỗ nhỏ, cho khí qua, chặn giọt nước |
| LoRa | sóng tầm xa công suất thấp, mã hóa bằng tín hiệu quét tần số |
| Ngủ sâu | vi điều khiển tắt gần hết, chỉ chờ hẹn giờ thức dậy |
| Gini | 1 − Σp²; đo độ lẫn lộn các lớp trong một nút cây |
| Bootstrap | bốc mẫu có hoàn lại, cùng kích thước tập gốc |
| Rò rỉ dữ liệu | thông tin của tập kiểm tra lọt vào lúc huấn luyện, làm điểm đẹp giả |
| Độ nhạy | trong số thật sự dương, bắt được bao nhiêu |
| Độ đặc hiệu | trong số thật sự âm, để yên được bao nhiêu |
| F1 | trung bình điều hòa của độ chính xác dự đoán và độ nhạy |
| Độ chính xác cân bằng | trung bình độ nhạy của các lớp |
| Tự tương quan | mức giống nhau giữa hai lần đo liền nhau |
| Khoảng tin cậy 95 % | khoảng chứa giá trị thật với độ tin cậy 95 % nếu lặp lại thí nghiệm nhiều lần |
| FEFO | hết hạn trước, xuất trước |
| Tổn thương lạnh | quả nhiệt đới bị hỏng khi bảo quản quá lạnh |
