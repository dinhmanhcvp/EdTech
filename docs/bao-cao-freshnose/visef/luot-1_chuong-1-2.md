# LƯỢT 1 – CHƯƠNG 1 VÀ CHƯƠNG 2 (bản nháp)

Tên dự án (phương án 1): Mũi điện tử giá thấp dùng cảm biến khí bán dẫn và học máy cảnh báo sớm lên men trong kho mát xoài và chuối

Quy ước: `[CẦN SỐ LIỆU: …]` và `[CẦN KIỂM: …]` là chỗ chưa có nguồn đã mở kiểm tra. Không được nộp khi còn các dấu này.

---

## CHƯƠNG 1. LÝ DO CHỌN DỰ ÁN

### 1.1. Sự cần thiết của nghiên cứu

Theo ước tính của Tổ chức Lương thực và Nông nghiệp Liên hợp quốc (FAO), 13,3 % lượng thực phẩm toàn cầu bị mất đi sau thu hoạch, tính từ khâu trang trại, vận chuyển, bảo quản đến bán buôn và chế biến, và con số này gần như không đổi so với mức 13,0 % của năm 2015 [1]. Rau quả là nhóm hàng chịu tổn thất nặng nhất: tỉ lệ mất mát tăng từ 23,2 % năm 2015 lên 25,4 % năm 2023 [1]. FAO gắn mức cao này với tính dễ hư hỏng của sản phẩm tươi và yêu cầu xử lý khắt khe sau thu hoạch [1]. Nói cách khác, cứ bốn phần rau quả được thu hoạch thì xấp xỉ một phần không đến được khâu bán lẻ.

Việt Nam là nước có lợi ích trực tiếp trong vấn đề này. Kim ngạch xuất khẩu rau quả năm 2024 ước đạt 7,12 tỷ USD, tăng 27,1 % so với năm 2023 [2], và Hiệp hội Rau quả Việt Nam ước tính năm 2025 vượt 8,5 tỷ USD, tăng gần 20 % [3]. Riêng xoài đạt khoảng 370 triệu USD năm 2023, từ trên 87.000 ha và bán sang 40 quốc gia [4]; kim ngạch chuối năm 2024 là [CẦN SỐ LIỆU: kim ngạch xuất khẩu chuối tươi 2024 – Tổng cục Hải quan hoặc Hiệp hội Rau quả Việt Nam – từ khóa "xuất khẩu chuối 2024 Hải quan"]. Cùng lúc, một tổng quan của Trường Đại học Cần Thơ ước tính tổn thất trong thu hoạch và sau thu hoạch của trái cây còn khá lớn, vào khoảng 25 % về khối lượng, chưa kể tổn thất về chất lượng [5]. Với vải, nhãn và chôm chôm, Viện Cây ăn quả miền Nam nêu mức 25–30 %, có lúc đến 50 % [6]. Các nguồn này không tách riêng xoài và chuối, nên nhóm chỉ dùng chúng để cho thấy bậc độ lớn của tổn thất ở trái cây Việt Nam.

Ở cấp địa phương, nhóm tác giả khảo sát sơ bộ 18 đơn vị, gồm 12 hợp tác xã (HTX) nông sản tại Phú Thọ, Vĩnh Phúc, Sơn La, Hưng Yên và 6 kho mát trung chuyển. Có 83 % đơn vị kiểm tra chất lượng bằng mắt và mũi, 78 % từng bị thiệt hại vì một sọt quả thối lây ra cả pallet, và 72 % sẵn sàng chi 15–25 triệu đồng cho hệ thống cảnh báo tự động (n = 18). Cỡ mẫu nhỏ và cách chọn mẫu thuận tiện khiến kết quả này chỉ có giá trị sơ bộ. [CẦN SỐ LIỆU: sản lượng xoài, chuối và số kho mát tại Phú Thọ, Vĩnh Phúc – Niên giám thống kê tỉnh – từ khóa "niên giám thống kê Phú Thọ 2024 cây ăn quả"].

Cơ chế lây lan giải thích vì sao thiệt hại vượt xa một sọt. Xoài và chuối là quả hô hấp đột biến, vẫn sống và sinh khí ethylene sau thu hoạch [CẦN KIỂM: tài liệu về quả hô hấp đột biến ở xoài, chuối]. Khi một sọt bị dập hoặc nhiễm nấm, quá trình lên men bắt đầu cục bộ rồi lan sang sọt kế bên qua tiếp xúc, ethylene và bào tử. Lúc nhìn thấy vết thối, quả đã chảy nước, trong khi nhiệt độ cả kho vẫn có thể bình thường. Theo giả định của nhóm cho một kho 50 tấn xoài giá 25.000 đồng/kg (tổng giá trị 1,25 tỷ đồng) và hao hụt 8 % mỗi mẻ, thiệt hại khoảng 100 triệu đồng mỗi mẻ; đây là giả định tính toán chứ chưa phải số đo.

Các giải pháp hiện có được tóm tắt ở Bảng 1.1.

**Bảng 1.1. So sánh các giải pháp hiện có**

| Giải pháp | Nguyên lý | Ưu điểm | Hạn chế | Chi phí ước tính | Nguồn |
|---|---|---|---|---|---|
| Kiểm tra cảm quan | Nhìn, ngửi, sờ | Không tốn thiết bị | Phát hiện muộn, không liên tục | Nhân công | Khảo sát nhóm (83 %) |
| Giám sát nhiệt độ, độ ẩm | Cảm biến nhiệt ẩm, ghi dữ liệu | Theo dõi điều kiện kho | Không thấy thay đổi sinh hóa trong sọt khi nhiệt độ bình thường | [CẦN SỐ LIỆU: báo giá Elitech, Testo] | [CẦN SỐ LIỆU: báo giá] |
| Máy đo khí cầm tay (Felix F-900/F-950) | Đo ethylene, khí chuyên dụng | Chính xác | Đo từng điểm bằng tay, không giám sát 24/7 | [CẦN SỐ LIỆU: báo giá nhà phân phối] | [CẦN SỐ LIỆU: trang nhà sản xuất] |
| IoT khí cho kho lớn (Strella) | Cảm biến khí gắn kho, phân tích đám mây | Giám sát tự động | Thiết kế cho kho táo, lê quy mô công nghiệp; chưa có tại Việt Nam | [CẦN SỐ LIỆU: báo giá] | [CẦN SỐ LIỆU: trang nhà sản xuất] |

*Nguồn: Nhóm tác giả tổng hợp; các ô [CẦN SỐ LIỆU] chưa có nguồn kiểm chứng.*

Nhìn vào bảng, nhóm thấy một hạn chế chung: giải pháp rẻ không đo được dấu hiệu sinh hóa, còn giải pháp đo được thì đắt hoặc không chạy liên tục. Chưa giải pháp nào vừa giám sát liên tục, vừa chỉ ra vùng cần kiểm tra trong kho, vừa có giá phù hợp với HTX 20–200 tấn. Từ khoảng trống đó, nhóm đề xuất một mũi điện tử gồm mảng cảm biến khí bán dẫn, nhiệt ẩm và truyền thông LoRa, kết hợp mô hình học máy để phân loại trạng thái từng phân khu thành an toàn, chín sinh lý và nguy cơ lên men. Điểm khác là giá thấp, huấn luyện riêng cho xoài và chuối, và khoanh vùng đến dãy kệ thay vì cả kho.

### 1.2. Căn cứ khoa học của vấn đề

Cảm biến khí bán dẫn oxit kim loại (MOX) đổi điện trở khi khí bị hấp phụ trên bề mặt oxit. Theo tổng quan của Berna (2010), nhóm cảm biến này nhạy hơn với aldehyde, rượu và keton, nên phù hợp để theo dõi ethanol và acetaldehyde sinh ra khi quả lên men [7]. Cũng tổng quan đó chỉ ra hạn chế chính là tính chọn lọc thấp giữa các cảm biến, đồng thời độ ẩm và nhiệt độ làm thay đổi đáp ứng; việc thay đổi nhiệt độ làm việc của cảm biến có thể tạo thêm tính chọn lọc [7]. Hai hạn chế này giải thích thiết kế của nhóm: dùng mảng nhiều cảm biến để lấy mẫu đáp ứng chồng lấn theo chuỗi thời gian, rồi phân loại bằng học máy, đồng thời đo thêm nhiệt độ, độ ẩm để bù trôi thay vì cố tách từng khí.

Một số nghiên cứu đã dùng mũi điện tử MOS để phát hiện bệnh thán thư trên quả. Với chuối, một nghiên cứu năm 2025 trên *Jurnal Agrikultura* dùng mảng cảm biến MQ trên chuối cấy *Colletotrichum musae* và thấy MQ-4, MQ-5, MQ-8 khác biệt có ý nghĩa giữa quả bệnh và quả đối chứng [8]. Với xoài, một nghiên cứu năm 2018 trên *Journal of Telecommunication, Electronic and Computer Engineering* báo cáo khả năng phát hiện *C. gloeosporioides* qua hợp chất bay hơi [9]. [CẦN KIỂM: mở toàn văn [8], [9] để ghi đúng tác giả, trang, DOI và điều kiện thí nghiệm (đo từng quả hay trong buồng, độ ẩm) trước khi so sánh.] Trong phạm vi các tài liệu nhóm đã duyệt, chưa thấy công trình nào đặt mảng cảm biến giá thấp ở độ ẩm trên 90 % trong kho mát và khoanh vùng sự cố theo dãy kệ; nhận định này cần được kiểm lại bằng tìm kiếm có hệ thống trước khi nộp.

Về công thức, đáp ứng của cảm biến MOX thường được biểu diễn bằng tỉ số điện trở R<sub>s</sub>/R<sub>0</sub> (R<sub>s</sub>: điện trở trong khí mẫu, R<sub>0</sub>: điện trở nền trong không khí sạch), và R<sub>s</sub>/R<sub>0</sub> giảm khi nồng độ khí khử tăng [CẦN KIỂM: datasheet Figaro TGS2602, TGS822]. Đại lượng R<sub>s</sub>/R<sub>0</sub> là đặc trưng đầu vào của mô hình học máy ở Chương 3.

---

## CHƯƠNG 2. ĐẶT VẤN ĐỀ NGHIÊN CỨU

### 2.1. Vấn đề nghiên cứu

Kho mát của HTX và cơ sở đóng gói quy mô 20–200 tấn hiện chỉ phát hiện sọt hỏng khi mắt và mũi nhận ra, tức là sau khi quá trình lên men đã lan sang sọt kế cận, còn thiết bị đo nhiệt ẩm không phản ánh được thay đổi này. Giải pháp đo khí chính xác thì đắt hoặc đo thủ công theo điểm. Vấn đề nghiên cứu của đề tài là: có thể dùng một mảng cảm biến khí bán dẫn giá thấp, kết hợp đo nhiệt ẩm và học máy, để phát hiện sớm điểm nóng lên men của xoài và chuối trong điều kiện bảo quản mát hay không, và sớm hơn quan sát bằng mắt bao lâu. Phạm vi gồm xoài và chuối tiêu, nhiệt độ bảo quản 10–14 °C, độ ẩm trên 85 %, thử nghiệm trong phòng thí nghiệm năm 2026.

### 2.2. Câu hỏi nghiên cứu

- **CH1.** Mảng cảm biến TGS2602, TGS822 và SHT31 kết hợp Random Forest phân loại đúng ba trạng thái an toàn, chín sinh lý và nguy cơ lên men với độ chính xác bao nhiêu?
- **CH2.** Hệ thống phát hiện dấu hiệu lên men sớm hơn quan sát bằng mắt bao nhiêu giờ, và tỉ lệ cảnh báo giả là bao nhiêu?
- **CH3.** Nguyên mẫu có vận hành ổn định trong điều kiện độ ẩm cao và nhiệt độ thấp của kho mát, với thời gian dùng pin và chi phí phù hợp khả năng chi trả của HTX hay không?

### 2.3. Tiêu chí thiết kế

Đề tài thuộc loại kỹ thuật, nên mỗi câu hỏi tương ứng một tiêu chí có ngưỡng định lượng (Bảng 2.1).

**Bảng 2.1. Tiêu chí thiết kế và ngưỡng yêu cầu**

| Mã | Tiêu chí | Ngưỡng yêu cầu | Câu hỏi | Căn cứ đặt ngưỡng |
|---|---|---|---|---|
| TC1 | Độ chính xác phân loại ba trạng thái | ≥ 85 % | CH1 | Nhóm đề xuất; [CẦN KIỂM: so với các nghiên cứu mũi điện tử ở [8], [9]] |
| TC2 | Tỉ lệ cảnh báo giả | ≤ 10 % | CH2 | Nhóm đề xuất, để nhân viên không bỏ qua cảnh báo; [CẦN XÁC NHẬN] |
| TC3 | Thời gian cảnh báo sớm hơn quan sát bằng mắt | ≥ 12 giờ | CH2 | Nhóm đề xuất; cần đủ thời gian để tách sọt trong một ca làm việc |
| TC4 | Thời gian dùng pin một lần sạc | ≥ 20 ngày | CH3 | Một chu kỳ lưu kho [CẦN XÁC NHẬN: chu kỳ lưu kho xoài, chuối thực tế] |
| TC5 | Chi phí gói 1 Hub + 8 Node | ≤ 22 triệu đồng | CH3 | Khảo sát nhóm: 72 % sẵn sàng chi 15–25 triệu đồng (n = 18) |

*Nguồn: Nhóm tác giả.*

### 2.4. Mục tiêu nghiên cứu

**Mục tiêu tổng quát:** chế tạo và đánh giá nguyên mẫu mũi điện tử giá thấp cảnh báo sớm điểm nóng lên men của xoài và chuối trong kho mát.

**Mục tiêu cụ thể:**
1. Thiết kế nguyên mẫu gồm 1 Hub và 3 Node, đạt TC4 và TC5, trong tháng 5–9/2026.
2. Thu bộ dữ liệu chuỗi thời gian từ thí nghiệm đối chứng 21 ngày trên ba nhóm: lành lặn, gây xước, lây nhiễm nấm thán thư.
3. Huấn luyện và đánh giá mô hình Random Forest, đạt TC1 và TC2 trên dữ liệu kiểm tra tách theo buồng hoặc theo đợt.
4. Xác định thời gian cảnh báo sớm so với quan sát bằng mắt, đạt TC3.

---

## Tài liệu tham khảo đã dùng trong lượt 1 (trạng thái kiểm chứng)

| [n] | Tài liệu | Trạng thái |
|---|---|---|
| [1] | FAO (2025). *SDG 12.3.1 – Global food losses (Food Loss Index)*. Cổng dữ liệu SDG của FAO. https://www.fao.org/sustainable-development-goals-data-portal/data/indicators/1231-global-food-losses (truy cập 05/11/2026) | Đã mở trang; số 13,3 % (2023), 13,0 % (2015), rau quả 23,2 % → 25,4 %. [CẦN KIỂM: năm cập nhật trang] |
| [2] | Chu Khôi (06/01/2025). Xuất khẩu rau quả năm 2024 lập kỷ lục 7,12 tỷ USD. *VnEconomy*. https://vneconomy.vn/xuat-khau-rau-qua-nam-2024-lap-ky-luc-7-12-ty-usd-du-bao-se-vuot-nguong-8-ty-usd-trong-nam-2025.htm | Đã mở; số do Thứ trưởng Bộ NN&PTNT công bố (số ước tính). Nên thay bằng số chính thức của Bộ/Hải quan nếu có |
| [3] | Hiệp hội Rau quả Việt Nam, qua Trung tâm WTO và Hội nhập – VCCI (26/12/2025). Xuất khẩu rau quả năm 2025 đạt kỷ lục 8,5 tỷ USD. https://trungtamwto.vn/tin-tuc/31479-xuat-khau-rau-qua-nam-2025-dat-ky-luc-85-ty-usd | Đã mở; số ước tính tháng 12/2025. [CẦN KIỂM: số chính thức cả năm] |
| [4] | Thế Vinh (22/02/2024). Tạo thế đứng vững chắc cho xuất khẩu trái xoài, gia tăng kim ngạch. *VnBusiness*. https://vnbusiness.vn/viet-nam/tao-the-dung-vung-chac-cho-xuat-khau-trai-xoai-gia-tang-kim-ngach-1098350.html | Đã mở; bài báo không nêu cơ quan nguồn của số 370 triệu USD và 87.000 ha. Nguồn yếu, nên thay bằng số Hải quan, Cục Trồng trọt |
| [5] | Lê Thị Bích Phượng, Tô Nguyễn Phước Mai, Nguyễn Văn Ây, Nguyễn Văn Mười (2021). Ứng dụng công nghệ tiên tiến để kéo dài thời gian bảo quản trái cây. *Tạp chí Khoa học Trường Đại học Cần Thơ*, 57 (số chuyên đề Công nghệ thực phẩm), 32–47. DOI 10.22144/ctu.jsi.2021.004 | Đã đọc đoạn nêu 25 %; [CẦN KIỂM: dấu tiếng Việt của tên tác giả vì văn bản trích xuất bị lỗi font] |
| [6] | Lê Thúy (10/06/2019). Thu hút đầu tư tăng giá trị trái cây Việt. *VnBusiness*. https://vnbusiness.vn/thu-hut-dau-tu-tang-gia-tri-trai-cay-viet.html (phát biểu của ông Nguyễn Văn Phong, Viện Cây ăn quả miền Nam) | Đã mở; là vải, nhãn, chôm chôm |
| [7] | Berna, A. (2010). Metal oxide sensors for electronic noses and their application to food analysis. *Sensors*, 10(4), 3882–3910. https://doi.org/10.3390/s100403882 | Đã mở toàn bộ phần đầu (100.000/143.953 ký tự) |
| [8] | Bài về phát hiện thán thư chuối do *C. musae* bằng mũi điện tử, *Jurnal Agrikultura* (2025). https://jurnal.unpad.ac.id/agrikultura/article/view/63320 | **Chưa mở được** (lỗi 403); chỉ có tóm tắt từ kết quả tìm kiếm. [CẦN KIỂM] |
| [9] | Bài về phát hiện *C. gloeosporioides* trên xoài bằng mũi điện tử, *J. Telecommunication, Electronic and Computer Engineering* (2018). https://jtec.utem.edu.my/jtec/article/view/3687 | **Chưa mở được**; chỉ có tóm tắt từ kết quả tìm kiếm. [CẦN KIỂM] |

---

## Ghi chú cuối lượt 1

- **Số chữ:** Chương 1 khoảng 1.350 chữ và Chương 2 khoảng 600 chữ (đếm cả bảng và ký hiệu markdown, nên số chữ văn xuôi thấp hơn một chút). Gợi ý là 450–550 và 350–450 chữ, nên cả hai chương đang vượt khoảng gấp rưỡi đến gấp đôi và sẽ vượt ngân sách 2 trang. Cần cắt Chương 1 còn khoảng 800 chữ và Chương 2 còn khoảng 450 chữ ở lượt rà soát.
- **Số liệu định lượng có nguồn ở Chương 1:** 13,3 %, 25,4 %, 7,12 tỷ USD, 8,5 tỷ USD, 370 triệu USD, 25 % (CTU), 25–30 % (vải, nhãn, chôm chôm), cộng khảo sát nhóm (83 %, 78 %, 72 %). Đạt ≥ 6, gồm 4 số Việt Nam và 1 số cấp địa phương (khảo sát nhóm). Số cấp tỉnh chính thức vẫn thiếu.
- **Chỗ còn trống:** kim ngạch chuối 2024; số liệu Phú Thọ, Vĩnh Phúc; báo giá 3 thiết bị đối thủ ở Bảng 1.1; tài liệu về quả hô hấp đột biến; datasheet Figaro; toàn văn [8], [9]; tên tác giả [5].
- **Hai điểm cần bạn quyết:** (1) ngưỡng ở Bảng 2.1 là đề xuất của tôi, nhóm chốt lại; (2) mục tiêu 3 yêu cầu chia dữ liệu kiểm tra theo buồng hoặc đợt, nếu thí nghiệm gốc chia ngẫu nhiên thì phải chạy lại.
- **Không dùng** kết quả 87,5 %, 6,2 %, 18–36 giờ ở Chương 1–2 vì đó là kết quả, chưa có dữ liệu thô để kiểm chứng.
- **Sai lệch cần xử lý ở Chương 3:** hồ sơ ghi ngưỡng tổn thương lạnh của xoài là dưới 10 °C. Kết quả tìm kiếm cho thấy các tổng quan nêu ngưỡng quan trọng khoảng 13 °C và thay đổi theo giống. Cần hỏi cố vấn VIAEP và kiểm giống Cát Chu, Hòa Lộc trước khi viết điều kiện bảo quản.
