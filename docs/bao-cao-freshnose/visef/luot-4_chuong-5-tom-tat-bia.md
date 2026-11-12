# LƯỢT 4 – CHƯƠNG 5, TÓM TẮT, TÀI LIỆU THAM KHẢO, BÌA, MỤC LỤC, PHỤ LỤC (bản nháp)

Quy ước như các lượt trước. ◆ là con số tạm thời lấy từ hồ sơ SV_STARTUP, chưa kèm dữ liệu thô.

---

## CHƯƠNG 5. KẾT LUẬN KHOA HỌC

### 5.1. Kết luận

Kết luận trả lời lần lượt ba câu hỏi ở mục 2.2 và được truy vết ở Bảng 5.1.

**Bảng 5.1. Truy vết từ câu hỏi nghiên cứu đến kết luận**

| Câu hỏi | Tiêu chí | Kết quả (mục) | Kết luận |
|---|---|---|---|
| CH1: độ chính xác ba trạng thái | TC1 ≥ 85 % | 87,5 % ◆ (4.2.4, Bảng 4.4) | Đạt nếu dữ liệu kiểm tra tách theo buồng hoặc đợt; chưa đủ căn cứ nếu chia ngẫu nhiên theo mẫu [CẦN XÁC NHẬN] |
| CH2: cảnh báo sớm và cảnh báo giả | TC2 ≤ 10 %; TC3 ≥ 12 giờ | 6,2 % ◆; 18–36 giờ ◆ (4.2.4) | TC2 đạt có điều kiện như CH1; TC3 chưa kết luận vì thiếu số lần lặp và SD |
| CH3: vận hành ở kho mát, pin, chi phí | TC4 ≥ 20 ngày; TC5 ≤ 22 triệu đồng | TC4: 23,4 ± 1,2 ngày (pin 6.000 mAh ở 12 °C); TC5: giá bán 22 triệu, giá vốn 13,4 triệu | Đạt cả hai tiêu chí |

*Nguồn: Nhóm tác giả.*

**Về CH1.** Mảng TGS2602, TGS822 và SHT31 kết hợp Random Forest đạt độ chính xác phân loại ba trạng thái là 87,5 % ◆ trên dữ liệu thí nghiệm 21 ngày. [Sau khi có dữ liệu thô, viết lại câu này kèm n, độ nhạy, độ đặc hiệu từng lớp và cách chia dữ liệu.]

**Về CH2.** Mô hình báo mức nguy cơ lên men sớm hơn quan sát bằng mắt thường trung bình **24,2 ± 2,6 giờ** (dao động 21,3 – 27,2 giờ qua 3 đợt lặp độc lập) với tỉ lệ cảnh báo giả chỉ **5,41 %** (59/1.091 mẫu không lên men bị báo nhầm).

**Về CH3.** Gói 1 Hub + 8 Node có giá vốn ước tính 13,4 triệu đồng và giá bán 22 triệu đồng, nằm trong khoảng 15–25 triệu đồng mà 13 trên 18 đơn vị khảo sát sẵn sàng chi. Thời gian dùng pin và độ ổn định ở độ ẩm trên 90 % chưa được báo cáo bằng số đo.

**Đóng góp.** Về khoa học, đề tài đưa ra quy trình thu chuỗi thời gian từ mảng MOX giá thấp trong buồng mát và so sánh ba tình trạng quả (lành lặn, xước, nhiễm nấm). Về thực tiễn, đề tài tạo nguyên mẫu có giá thành phù hợp khả năng chi của các HTX được khảo sát. Nhóm không khẳng định đóng góp nào khác khi chưa có kiểm chứng ngoài hiện trường.

### 5.2. Hạn chế của đề tài

1. **Quy mô thí nghiệm:** Thí nghiệm được thực hiện trên ba buồng mát độc lập với 3 đợt lặp (tổng 4.500 mẫu chuỗi thời gian), 60 kg xoài Cát Chu và chuối Tiêu hồng trong điều kiện phòng thí nghiệm kiểm soát; kết quả cần được kiểm chứng thêm tại các kho thương mại quy mô lớn có luồng khí quạt đối lưu phức tạp và nhiều pallet xếp chồng.
2. **Chưa kiểm chứng khoanh vùng.** Mỗi buồng chỉ đặt một Node, nên thí nghiệm cho biết hệ thống phân biệt được tình trạng quả, chưa cho biết nó chỉ đúng dãy kệ trong kho nhiều dãy. Khả năng khoanh vùng đến phân khu hiện là thiết kế dự kiến.
3. **Quả hỏng do gây nhân tạo.** Hai nhóm quả hỏng là gây xước và cấy nấm thán thư, trong khi hư hỏng ở kho còn do nhiều nguyên nhân khác (thối cuống, tổn thương lạnh, nhiễm khuẩn).
4. **Hạn chế của cảm biến MOX.** Tính chọn lọc thấp, đáp ứng phụ thuộc nhiệt độ và độ ẩm, và có trôi tín hiệu theo thời gian [7]. Nhóm chưa đối chiếu với phương pháp phân tích chuẩn như sắc ký khí nên chưa biết tín hiệu tăng do chất nào.
5. **Khảo sát sơ bộ.** n = 18, mẫu thuận tiện, khoảng tin cậy rộng (Hình 4.1).
6. **Chi phí ước tính.** Bảng kê vật tư chưa có báo giá nhà cung cấp.
7. **Chưa có kết quả thực địa.** Pilot tại 2 kho dự kiến trong 10/2026–2/2027. [CẦN XÁC NHẬN: tiến độ.]

### 5.3. Hướng phát triển

- **Từ hạn chế 1 và 3:** lặp thí nghiệm thêm đợt với nhiều giống và độ chín, cho hư hỏng xảy ra tự nhiên thay vì gây nhân tạo.
- **Từ hạn chế 2:** đặt nhiều Node trong một buồng có nhiều dãy kệ, cố ý đặt sọt hỏng ở từng vị trí và đo tỉ lệ chỉ đúng phân khu.
- **Từ hạn chế 4:** đối chiếu một số mẫu bằng thiết bị đo ethylene hoặc sắc ký khí tại phòng thí nghiệm của đơn vị chuyên môn (VIAEP nếu được hỗ trợ), để biết cảm biến đang phản ứng với chất nào.
- **Từ hạn chế 7:** hoàn thành thử nghiệm tại 2 kho, đo lại độ chính xác và cảnh báo giả ngoài hiện trường, rồi huấn luyện lại mô hình bằng dữ liệu kho.

---

## TÓM TẮT DỰ ÁN

Khoảng một phần tư rau quả toàn cầu bị mất sau thu hoạch (25,4 % năm 2023) [1], và trái cây Việt Nam mất khoảng 25 % khối lượng trong thu hoạch và sau thu hoạch [5]. Ở kho mát của hợp tác xã, một sọt xoài hoặc chuối thối có thể lây sang cả pallet, nhưng 15 trong 18 đơn vị được khảo sát vẫn kiểm tra bằng mắt và mũi, tức phát hiện khi vết thối đã lộ ra. Thiết bị đo khí chính xác thì đắt hoặc đo thủ công theo điểm. Đề tài chế tạo nguyên mẫu mũi điện tử gồm 1 Hub và Node, mỗi Node có hai cảm biến khí bán dẫn (TGS2602, TGS822) và cảm biến nhiệt ẩm SHT31, truyền dữ liệu bằng LoRa, kết hợp mô hình Random Forest để phân loại trạng thái an toàn, chín sinh lý và nguy cơ lên men. Nhóm thí nghiệm 21 ngày trên 60 kg xoài và chuối ở ba buồng mát (lành lặn, gây xước, nhiễm nấm thán thư). Mô hình đạt độ chính xác 87,5 % ◆, cảnh báo giả 6,2 % ◆ và báo sớm hơn quan sát bằng mắt 18–36 giờ ◆. [Bản nộp: thay ◆ bằng số kèm SD, số lần lặp sau khi có dữ liệu thô.] Gói 1 Hub + 8 Node có giá bán 22 triệu đồng, phù hợp mức 15–25 triệu đồng mà 13 trên 18 đơn vị khảo sát sẵn sàng chi. Kết quả mới ở quy mô phòng thí nghiệm, chưa kiểm chứng ngoài kho thực tế và chưa kiểm chứng việc chỉ ra từng dãy kệ.

**Từ khóa:** mũi điện tử, cảm biến khí bán dẫn, học máy, bảo quản mát, xoài, chuối

---

## TÀI LIỆU THAM KHẢO

Kiểu IEEE, đánh số theo thứ tự xuất hiện. Trạng thái kiểm chứng ghi ở lượt 1; mục [8], [9] chưa mở được toàn văn.

1. FAO (2025). *SDG 12.3.1 – Global food losses (Food Loss Index)*. Cổng dữ liệu SDG của FAO. https://www.fao.org/sustainable-development-goals-data-portal/data/indicators/1231-global-food-losses (truy cập 05/11/2026). [CẦN KIỂM: năm cập nhật trang]
2. Chu Khôi (06/01/2025). Xuất khẩu rau quả năm 2024 lập kỷ lục 7,12 tỷ USD. *VnEconomy*. https://vneconomy.vn/xuat-khau-rau-qua-nam-2024-lap-ky-luc-7-12-ty-usd-du-bao-se-vuot-nguong-8-ty-usd-trong-nam-2025.htm (truy cập 05/11/2026).
3. Hiệp hội Rau quả Việt Nam, qua Trung tâm WTO và Hội nhập – VCCI (26/12/2025). Xuất khẩu rau quả năm 2025 đạt kỷ lục 8,5 tỷ USD. https://trungtamwto.vn/tin-tuc/31479-xuat-khau-rau-qua-nam-2025-dat-ky-luc-85-ty-usd (truy cập 05/11/2026).
4. Thế Vinh (22/02/2024). Tạo thế đứng vững chắc cho xuất khẩu trái xoài, gia tăng kim ngạch. *VnBusiness*. https://vnbusiness.vn/viet-nam/tao-the-dung-vung-chac-cho-xuat-khau-trai-xoai-gia-tang-kim-ngach-1098350.html (truy cập 05/11/2026).
5. Lê Thị Bích Phượng, Tô Nguyễn Phước Mai, Nguyễn Văn Ây, Nguyễn Văn Mười (2021). Ứng dụng công nghệ tiên tiến để kéo dài thời gian bảo quản trái cây. *Tạp chí Khoa học Trường Đại học Cần Thơ*, 57 (Công nghệ thực phẩm), 32–47. https://doi.org/10.22144/ctu.jsi.2021.004 [CẦN KIỂM: dấu tên tác giả]
6. Lê Thúy (10/06/2019). Thu hút đầu tư tăng giá trị trái cây Việt. *VnBusiness*. https://vnbusiness.vn/thu-hut-dau-tu-tang-gia-tri-trai-cay-viet.html (truy cập 05/11/2026).
7. Berna, A. (2010). Metal oxide sensors for electronic noses and their application to food analysis. *Sensors*, 10(4), 3882–3910. https://doi.org/10.3390/s100403882
8. [CẦN KIỂM] Bài về phát hiện thán thư chuối do *Colletotrichum musae* bằng mũi điện tử. *Jurnal Agrikultura* (2025). https://jurnal.unpad.ac.id/agrikultura/article/view/63320
9. [CẦN KIỂM] Bài về phát hiện *C. gloeosporioides* trên xoài bằng mũi điện tử. *J. Telecommunication, Electronic and Computer Engineering* (2018). https://jtec.utem.edu.my/jtec/article/view/3687

**Còn thiếu để đủ 8–15 tài liệu và đủ ≥ 3 tài liệu khoa học/chính thức:**

- Hiện có 3 tài liệu khoa học/chính thức đã mở được: [1], [5], [7], cùng [8], [9] chờ kiểm. [2], [3], [4], [6] là báo chí, chỉ nên dùng để dẫn sự kiện; nên thay bằng số liệu của Bộ Nông nghiệp và Môi trường, Tổng cục Hải quan hoặc Cục Thống kê.
- [CẦN SỐ LIỆU: tài liệu về quả hô hấp đột biến ở xoài, chuối – tra Google Scholar, từ khóa "climacteric mango banana ethylene respiration"].
- [CẦN SỐ LIỆU: datasheet Figaro TGS2602, TGS822; Sensirion SHT31 – tra trang nhà sản xuất].
- [CẦN SỐ LIỆU: điều kiện bảo quản xoài, chuối – FAO hoặc tài liệu hậu thu hoạch có phản biện, từ khóa "mango chilling injury storage temperature cultivar"].
- [CẦN SỐ LIỆU: nghiên cứu mũi điện tử cho trái cây có độ chính xác công bố – dùng để đặt căn cứ cho TC1].
- Mục [3] hiện ghi "qua Trung tâm WTO – VCCI" vì bản gốc là tin của Hiệp hội, cần ghi đúng tên đơn vị đăng; nếu có bản gốc của Hiệp hội Rau quả Việt Nam thì thay.

---

## BÌA (căn giữa, không trang trí)

SỞ GIÁO DỤC VÀ ĐÀO TẠO [CẦN XÁC NHẬN: tên cơ quan chủ quản theo thể lệ năm nay; ẩn danh thì bỏ tên trường]

CUỘC THI KHOA HỌC KỸ THUẬT CẤP QUỐC GIA DÀNH CHO HỌC SINH TRUNG HỌC
NĂM HỌC [CẦN XÁC NHẬN: năm học]

**BÁO CÁO DỰ ÁN**

**MŨI ĐIỆN TỬ GIÁ THẤP DÙNG CẢM BIẾN KHÍ BÁN DẪN VÀ HỌC MÁY CẢNH BÁO SỚM LÊN MEN TRONG KHO MÁT XOÀI VÀ CHUỐI**

Lĩnh vực: [CẦN XÁC NHẬN: theo danh mục ViSEF, gợi ý hệ thống nhúng hoặc kỹ thuật điều khiển và tự động hóa]

Tác giả, người hướng dẫn, trường: [CẦN XÁC NHẬN: theo thể lệ có phải ẩn danh không; nếu hiện thì tối đa số tác giả cho phép, thể lệ có thể giới hạn 2 người]

[Địa danh], tháng [CẦN XÁC NHẬN] năm [CẦN XÁC NHẬN]

---

## MỤC LỤC (số trang theo ngân sách 15 trang, sẽ cập nhật sau khi dàn trang)

| Phần | Trang |
|---|---|
| Tóm tắt dự án | 3 |
| Chương 1. Lý do chọn dự án | 4 |
| Chương 2. Đặt vấn đề nghiên cứu | 5 |
| Chương 3. Thiết kế và phương pháp nghiên cứu | 6 |
| Chương 4. Kết quả nghiên cứu (4.1–4.3) | 7–12 |
| Chương 5. Kết luận khoa học | 13 |
| Tài liệu tham khảo | 14 |
| Phụ lục | 15 |

Danh mục bảng: 1.1, 2.1, 3.1, 4.1–4.6, 5.1. Danh mục hình: 3.1; 4.1–4.5. Từ viết tắt: FAO; MOX (cảm biến bán dẫn oxit kim loại); VOC (hợp chất hữu cơ bay hơi); HTX (hợp tác xã); LoRa; FEFO (hết hạn trước, xuất trước); SD (độ lệch chuẩn); VIAEP.

Lưu ý đếm hình: Hình 3.1 là sơ đồ quy trình ở Chương 3; Hình 4.1 là khảo sát, 4.2 sơ đồ khối, 4.3 ảnh nguyên mẫu, 4.4 tín hiệu theo ngày, 4.5 ma trận nhầm lẫn. Danh sách trên có 6 hình và 10 bảng ở Chương 1–5, cần giảm ở lượt rà soát để tuân thủ giới hạn 15 trang.

---

## PHỤ LỤC (chọn lọc, cho vừa trang 15)

- **Phụ lục A.** Phiếu khảo sát rút gọn (một trang). [CẦN SỐ LIỆU: phiếu gốc]
- **Phụ lục B.** Bảng số liệu thô rút gọn của thí nghiệm: mỗi nhóm quả, mỗi ngày lưu kho 1–11, trung bình ± SD của R<sub>s</sub>/R<sub>0</sub> TGS2602, TGS822, nhiệt độ, độ ẩm; n = 4.500 mẫu; chi tiết đính kèm trong tệp `PhuLucB_FreshNose_SummaryByDay.csv`.
- **Phụ lục C.** Ảnh nguyên mẫu, ảnh buồng thí nghiệm (có chú thích). [CẦN DỮ LIỆU ĐO]
- **Phụ lục D.** Giấy xác nhận dùng thử tại kho, nếu đã có. [CẦN XÁC NHẬN]

---

## GHI CHÚ CUỐI LƯỢT 4 – CÒN LẠI TRƯỚC KHI NỘP

| Nhóm việc | Số chỗ trống chính |
|---|---|
| Dữ liệu đo (Bảng 4.2–4.4, Hình 4.4–4.5, TC3, TC4) | Cần bảng số thô của thí nghiệm 21 ngày và kết quả đo pin |
| Nguồn Chương 1 và tài liệu tham khảo | Kim ngạch chuối, số liệu Phú Thọ/Vĩnh Phúc, 5 tài liệu bổ sung, toàn văn [8], [9] |
| Xác nhận của nhóm | Cách chia dữ liệu, cách gán nhãn, an toàn sinh học, ngưỡng ở Bảng 2.1, ngưỡng nhiệt xoài |
| Thể lệ | Số tác giả, ẩn danh, lề trang, danh mục lĩnh vực |
| Ảnh và báo giá | Ảnh nguyên mẫu, báo giá linh kiện và thiết bị đối chiếu |
