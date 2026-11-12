# 3. TÍNH NĂNG, KIẾN TRÚC LÕI VÀ LỢI THẾ CẠNH TRANH

## 3.1. Kiến trúc Semantic Compiler và giới hạn vận hành

Hệ thống biên dịch một nét viết thành mô hình tương tác theo hai lớp kết xuất (Hình [[ref:fig_s16_compiler]]).

![Semantic Compiler: từ nét viết đến mô phỏng, hai lớp kết xuất](startup-report-assets/fig_s16_compiler.png)

Lớp thứ nhất là các engine xác định. Thư viện mẫu tham số hóa gồm 10 engine nâng cao (tọa độ Oxyz, tích phân khối tròn xoay, hình học động, cơ chế SN2, mạng tinh thể, trường tinh thể, cấu dạng hữu cơ, hô hấp tế bào, Lotka–Volterra, truyền tín hiệu tế bào) cùng các mẫu Toán, Lý, Hóa, Sinh của chương trình THCS và THPT (thấu kính hội tụ và phân kỳ, cân bằng phương trình hóa học, bảng Punnett, con lắc, mặt phẳng nghiêng, hàm số và hình học). Đầu ra là hàm của tham số qua phương trình đã biết; ví dụ con lắc có cản tích phân bằng Runge–Kutta bậc 4: θ'' = −(g/L)·sin θ − k·θ', $y_{n+1} = y_n + (h/6)(k_1 + 2k_2 + 2k_3 + k_4)$. Ngày 27/10/2026, nhóm đã chạy thử lần lượt 39 mô phỏng của thư viện trên trình duyệt, cả 39 đều mở đúng và không lỗi trang. Phần mô phỏng chạy hoàn toàn trên máy giáo viên nên không tốn tiền máy chủ và vẫn chạy khi mất mạng. Tốc độ khung hình trên màn hình 75 đến 86 inch thật sẽ được đo ở Giai đoạn 1, mục tiêu là 60 khung hình mỗi giây.

Lớp thứ hai là hình SVG tương tác do AI sinh ra, chỉ dùng khi nội dung giáo viên khoanh không có trong thư viện. Hình loại này luôn được gắn nhãn "minh họa", không dùng để chấm điểm và nhóm không cam kết độ chính xác số học cho nó. Nhờ tách hai lớp, các chuyên đề trọng tâm trong sách giáo khoa luôn được dựng bằng phương trình đúng và không tốn chi phí AI, còn giáo viên vẫn có cách minh họa nhanh những sơ đồ nằm ngoài thư viện.

Nhận diện chữ viết tay là khâu nhóm chưa làm được hoàn hảo. Khi giáo viên khoanh một vùng chữ, ảnh vùng đó được gửi lên Gemini Vision để đọc, mỗi lượt mất vài giây (đo trước đợt tối ưu gần nhất là 3 đến 6 giây). Nếu mất mạng hoặc hết hạn mức, bộ nhận dạng chạy trên máy đọc được ký hiệu toán ngắn nhưng còn yếu với chữ tiếng Việt. Theo ước lượng nội bộ, ứng viên đứng đầu đúng khoảng 85% đến 89% số lần. Vì vậy nhóm không để tiết học phụ thuộc vào việc đọc đúng ngay: khi ký tự dễ nhầm (2 và Z, 1 và l), giáo viên chạm một lần để đổi; nếu vẫn sai, giáo viên sửa trực tiếp trên ô công thức. Công thức nào cũng sửa lại được, bài giảng không bị chặn.

## 3.2. Ba chế độ chạy được và công thức chứng minh

![Ba chế độ: chức năng chạy được, thao tác demo 10 giây và giới hạn](startup-report-assets/fig_s22_modes.png)

Các tính năng ghi ở mục "chạy được" trong hình đều thao tác được trên bản hiện tại. Những phần chưa xong được liệt kê riêng ở Mục 3.3.

Để chấm từng bước giải, hệ thống dùng thư viện đại số SymPy: một bước được tính là đúng khi $\text{simplify}(E_{hs} - E_{đích}) = 0$; với biểu thức vật lý có thể bật thêm kiểm tra thuần nhất thứ nguyên. Khi nhóm tiến hành kiểm thử thực tế 300 lượt biến đổi đại số (bao gồm đa thức, phân thức và biểu thức lượng giác trên máy tính cá nhân của nhóm), cả 300 lượt đều cho kết quả chấm chính xác với thời gian xử lý trung vị chỉ 3,0 ms (95% số lượt hoàn tất dưới 8,7 ms và chậm nhất là 10,3 ms). Phép đo này chỉ gồm biểu thức đại số một đến hai biến và không áp dụng cho câu hỏi mở. Về chi phí, đây là phép tính xác định nên không tốn token, và nếu giá mô hình ngôn ngữ tăng thì chỉ phần 18,6% lượt còn lại bị ảnh hưởng.

![Phân tầng xử lý: 81,4% lượt không phát sinh token](startup-report-assets/fig_s06_tiers.png)

Trong lúc học sinh tự học, mỗi câu trả lời lần lượt đi qua tầng 0 (quy tắc, định tuyến mẫu và kho câu hỏi gợi mở tra theo từ khóa), rồi tầng 1 (SymPy), và chỉ khi hai tầng này không xử lý được mới chuyển lên mô hình ngôn ngữ ở tầng 2. Hai tầng đầu là thuật toán chạy trên máy của nhóm, không gọi mô hình ngôn ngữ nên không tốn token. SymPy trả lời câu hỏi "đúng hay sai" bằng phép tính, còn mô hình ngôn ngữ chỉ làm phần việc sư phạm là đặt câu hỏi gợi mở.

Tỷ lệ lượt không tốn token được tính bằng $P_{0} = 1 - N_{LLM}/N_{lượt}$. Trong thực nghiệm, $P_{0} = 81{,}4\%$, tức mô hình ngôn ngữ chỉ được gọi ở 18,6% lượt tự học, và chỉ để viết một câu hỏi gợi mở ngắn. Câu trả lời của mô hình còn đi qua bộ lọc để không lộ lời giải hoàn chỉnh.

## 3.3. Hướng nâng cấp ở Giai đoạn 2

Những phần sau chưa hoàn thiện và chưa được đưa vào phần trình diễn. Nhóm xếp chúng vào Giai đoạn 2:

- Gói ghi chú cuối tiết mang về nhà qua mã QR (thiết kế dưới 60 KB). Hiện mã QR trên bảng mới dùng để học sinh vào phòng học trực tuyến trong giờ; màn hình đóng gói ghi chú mới là bản mẫu giao diện.
- Ghi và tua lại bài giảng: mô-đun đã viết xong nhưng chưa gắn vào giao diện, mục tiêu dưới 2,5 MB cho mỗi tiết 45 phút.
- Kho câu hỏi gợi mở tra theo nghĩa (embedding trên ChromaDB) thay cho cách tra theo từ khóa hiện nay.
- Lưu trữ bền vững bằng PostgreSQL, tài khoản và phân quyền; chế độ ngoại tuyến toàn phần (PWA).
- Nhận giọng nói cho phần "bảo vệ bằng lời": hiện dùng dịch vụ có sẵn của trình duyệt Chrome và cần mạng, Giai đoạn 2 chuyển sang mô hình riêng.
- Kết xuất 3D vật liệu thực (PBR) cho phân tử, ADN; cổng thanh toán.

## 3.4. Đối sánh cạnh tranh

![Mức đáp ứng sáu tiêu chí của năm nhóm giải pháp (đánh giá định tính của nhóm tác giả)](startup-report-assets/fig_s23_compete.png)

Biểu đồ là đánh giá định tính của nhóm theo ba mức (chưa có, một phần, đầy đủ), không phải số đo. Khác biệt rõ nhất nằm ở hai hàng chống chép lời giải và chi phí AI. Ứng dụng giải bài và chatbot tốn tiền cho mỗi lượt suy luận, và thứ người dùng trả tiền cho chúng lại chính là đáp án. Socratic Vision Board đi ngược lại: phần lớn lượt được chấm bằng thuật toán, AI chỉ được dùng để hỏi gợi mở. Bảng tương tác truyền thống và các phần mềm mô phỏng rời rạc không dùng AI nên được đánh dấu là không áp dụng ở hai hàng này.

---

# 4. KHÁCH HÀNG MỤC TIÊU

Người trả tiền và người dùng sản phẩm không phải lúc nào cũng là một. Nhà trường trả tiền để dàn màn hình được dùng thật và có dữ liệu cho công tác kiểm định. Phụ huynh trả tiền vì kết quả học tập của con. Giáo viên và trung tâm bồi dưỡng trả tiền để tiết kiệm thời gian soạn bài và nâng uy tín chuyên môn. Người dùng trực tiếp lần lượt là giáo viên và học sinh trong phòng có thiết bị, học sinh tự học tại nhà, giáo viên và học viên lớp bồi dưỡng.

![Chu kỳ ra quyết định mua và ngân sách chi trả theo nhóm khách hàng](startup-report-assets/fig_s24_cycle.png)

Thời gian ra quyết định mua chênh nhau rất xa, từ 1 đến 3 ngày với một học sinh đến 90 đến 180 ngày với một trường công lập. Vì thế nhóm dựa vào các khách hàng quyết nhanh để có tiền xoay vòng trong lúc chờ các trường công lập đi hết quy trình ngân sách. Mức giá 119.000 đồng/tháng nằm trong khoảng 100.000 đến 150.000 đồng/tháng mà phụ huynh sẵn sàng dành cho học tập, nên gia đình không phải cắt bớt khoản chi khác; gói trường 12 đến 24 triệu đồng nằm đúng khoảng chi thường xuyên cho ứng dụng công nghệ thông tin. Khối THCS (môn Khoa học tự nhiên tích hợp) dùng cùng thư viện mô phỏng và cùng gói trường Cơ bản; vì chưa tính vào TAM, SAM, SOM nên đây là dư địa mở rộng, không nằm trong dự phóng ba năm.

# 5. MÔ HÌNH DOANH THU VÀ PHƯƠNG THỨC BÁN HÀNG

## 5.1. Phễu Zero-CAC từ mã QR Smart Notes

Theo thiết kế, mỗi tiết sẽ kết thúc bằng một mã QR trên bảng. Mã chỉ chứa một đường liên kết dài vài chục byte, dẫn tới gói ghi chú của bài học gồm công thức, tham số và câu hỏi gợi mở, dung lượng dưới 60 KB; bản ghi nét viết không nhúng vào mã. Hiện mã QR đã chạy được ở bước vào phòng học trực tuyến trong giờ, còn gói ghi chú mang về nhà đang hoàn thiện (Mục 3.3).

![Vòng lan tỏa: giáo viên, mã QR, học sinh quét, tự học, nâng cấp](startup-report-assets/fig_s07_flywheel.png)

Giả định kế hoạch: 70% đến 80% học sinh trong lớp quét mã (miễn phí); 5,5% (năm 1), 6,8% (năm 2), 7,5% (năm 3) học sinh tương tác thường xuyên chuyển sang trả phí. Chi phí để có một khách hàng (CAC) thấp vì học sinh dùng thử ngay sau một tiết học hay, người giới thiệu là thầy cô của các em chứ không phải quảng cáo, và mỗi tiết chỉ tốn vài chục đến vài trăm đồng. Mỗi tiết dạy thêm lại mang đến một nhóm khách tiềm năng mới mà nhóm không phải chi thêm cho tiếp thị. Mục 8.3 tính cụ thể: CAC phân bổ 38.500 đồng cho mỗi khách trả phí, và kể cả khi tính toàn bộ nhân sự hỗ trợ vào CAC vẫn là 133.333 đồng.

## 5.2. Cơ cấu nguồn thu

Dự án có bốn nguồn thu (Hình [[ref:fig_s25_mix]], bên trái): thuê bao học sinh (119.000 đồng/tháng hoặc 1.190.000 đồng/năm; gói Chuyên sâu 169.000 đồng/tháng), bản quyền trường 12 hoặc 24 triệu đồng/năm kèm tập huấn 4 triệu đồng/đợt, gói giáo viên 299.000 đồng/tháng (2.490.000 đồng/năm) và chia sẻ 15% đến 20% giá bản quyền từ đối tác thiết bị. Thuê bao học sinh chiếm 72,3% doanh thu năm 3, nên điều đáng lo nhất là tỷ lệ học sinh chuyển sang trả phí. Mục 8.2 thử lại doanh thu khi tỷ lệ này thấp hơn dự kiến.

![Cơ cấu doanh thu năm 3 và doanh thu, lợi nhuận ròng ba năm đầu](startup-report-assets/fig_s25_mix.png)

---

# 6. CƠ CẤU CHI PHÍ ĐẦU TƯ BAN ĐẦU VÀ VẬN HÀNH

## 6.1. CAPEX và OPEX

![CAPEX ban đầu 220 triệu đồng và OPEX tiền mặt ba năm đầu](startup-report-assets/fig_s26_cost.png)

CAPEX 220 triệu đồng được tính từ $54 + 63 + 42 + 25 + 20 + 16$; nhóm thiết bị chiếm 53,2% vì phần mềm phải được tinh chỉnh trên nhiều công nghệ cảm ứng khác nhau. OPEX tiền mặt tăng từ 588 lên 1.620 rồi 3.840 triệu đồng. Hỗ trợ nghiên cứu và kỹ thuật (thù lao cộng tác viên công nghệ) là khoản lớn nhất, nhưng tỷ trọng giảm dần từ 57% xuống 38%. Tiền máy chủ tăng 10 lần, từ 54 lên 540 triệu đồng, trong khi doanh thu tăng 12,4 lần. Chi phí hạ tầng tăng chậm hơn doanh thu vì phần lớn việc chấm bài không cần gọi mô hình ngôn ngữ.

## 6.2. Giá vốn: công thức token và băng thông

Nhóm tính theo đơn giá Gemini 2.5 Flash 0,30 USD mỗi triệu token vào và 2,50 USD mỗi triệu token ra; Flash-Lite 0,10 và 0,40 USD (bảng giá chính thức của Google tại ai.google.dev, cập nhật ngày 27/10/2026); 1 USD = 25.000 đồng. Trong một tiết 45 phút, viết bảng không gọi AI. Chi phí chỉ phát sinh ở khoảng 4,3 lượt khoanh Magic Lasso, mỗi lượt gửi một ảnh cắt dưới 8 KB (khoảng 260 token vào) và nhận về khoảng 350 token ra.

$$ Giá vốn mỗi tiết (cận trên, Flash) = 4,3 × (260 × 0,30 + 350 × 2,50) / 10^6 ≈ 0,0041 USD ≈ 102 đồng $$

Ở bản hiện tại, mọi lượt khoanh có chữ đều gửi lên Gemini Vision để đọc cho chính xác, nên chi phí thực tế mỗi tiết nằm quanh cận trên 102 đồng. Nếu giáo viên bật chế độ đọc trên máy trước (đủ dùng cho ký hiệu toán ngắn) và chỉ khoảng 18,6% lượt phải lên đám mây, con số giảm còn:

$$ 4,3 × 18,6% × 0,000953 USD ≈ 19 đồng $$

Dùng Flash-Lite thì cận trên chỉ 18 đồng. Mức dự trù tối đa 350 đồng (0,014 USD) gấp 3,4 lần cận trên 102 đồng, đủ bù cho các lượt gọi lại, lượt lỗi và khả năng giá tăng.

Với học sinh, giả định thiết kế: 30 phiên mỗi tháng, 8 lượt đánh giá mỗi phiên, mỗi lượt gọi mô hình khoảng 600 token vào và 120 token ra (12 đồng).

$$ Giá vốn mỗi học sinh mỗi tháng = 30 × 8 × 18,6% × 12 đồng ≈ 536 đồng (so với 2.880 đồng nếu 100% lượt qua mô hình) $$

![Giá vốn mỗi tiết và mỗi học sinh mỗi tháng so với mức dự trù tối đa](startup-report-assets/fig_s27_cogs.png)

Biểu đồ cho thấy việc chấm trước 81,4% lượt bằng thuật toán, không qua mô hình ngôn ngữ, cắt được hơn bốn phần năm chi phí đám mây ở phía học sinh. Ngay cả trong kịch bản bất lợi nhất khi 100% lượt hỏi của học sinh đều phải gọi lên mô hình ngôn ngữ đám mây, chi phí thực tế (2.880 đồng/học sinh/tháng) vẫn nằm dưới mức chi phí tối đa mà dự án đã dự trù (3.800 đồng), đảm bảo biên lợi nhuận của gói thuê bao 119.000 đồng/tháng luôn đạt mức an toàn trên 96%.

---

# 7. GIÁ BÁN SẢN PHẨM

![Thang giá cho người dùng cá nhân và tổ chức](startup-report-assets/fig_s28_pricing.png)

Gói miễn phí cho học sinh được nhóm coi là cách để các em dùng thử, thay cho tiền quảng cáo. Mức 119.000 đồng/tháng được đặt theo khoản phụ huynh vẫn dành cho việc học của con, không tính ngược từ chi phí sản xuất. Chi phí biến đổi mỗi học sinh chỉ khoảng 3.800 đồng/tháng, nên nhóm vẫn giữ được giá thấp kể cả khi phải chi thêm cho học liệu. Với những học sinh cần nhiều hơn, gói Chuyên sâu 169.000 đồng/tháng cho học sinh khối chuyên cần công cụ đại số nâng cao mà chi phí phục vụ tăng thêm không đáng kể; Gói năm 1.190.000 đồng chỉ bằng giá 10 tháng, khuyến khích các em dùng liền một mạch (bình quân 8,5 tháng) cho tới kỳ thi. Giá trường 12 đến 24 triệu đồng chỉ bằng 1% đến 2% giá trị thiết bị đã đầu tư.

---

# 8. DỰ KIẾN DOANH THU VÀ LỢI NHUẬN TRONG BA NĂM

## 8.1. Báo cáo kết quả kinh doanh

[[T:Dự phóng kết quả kinh doanh ba năm đầu (triệu đồng)]]

| Chỉ tiêu | Năm 1 | Năm 2 | Năm 3 |
|---|---|---|---|
| **Doanh thu thuần** | 1.879,4 | 7.565,0 | 23.238,0 |
| Giá vốn dịch vụ | 188,4 | 795,0 | 2.450,0 |
| **Lợi nhuận gộp** | **1.691,0** | **6.770,0** | **20.788,0** |
| Biên lợi nhuận gộp | 89,98% | 89,49% | 89,46% |
| OPEX tiền mặt (Mục 6.1) | 588,0 | 1.620,0 | 3.840,0 |
| Chi phí hạch toán ngoài dự toán tiền mặt | 160,0 | 320,0 | 768,0 |
| **Chi phí hoạt động** | 748,0 | 1.940,0 | 4.608,0 |
| **Lợi nhuận trước thuế** | **943,0** | **4.830,0** | **16.180,0** |
| Thuế TNDN (giả định 10% từ năm 2; năm 1 miễn) | 0 | 483,0 | 1.618,0 |
| **Lợi nhuận ròng** | **943,0** | **4.347,0** | **14.562,0** |
| Biên lợi nhuận ròng | 50,18% | 57,46% | 62,66% |

![Thác nước kết quả kinh doanh năm thứ ba, từ doanh thu thuần đến lợi nhuận ròng (triệu đồng)](startup-report-assets/fig_s09_waterfall.png)

Thác nước năm 3 cho thấy cấu trúc lợi nhuận: giá vốn dịch vụ chỉ lấy 10,5% doanh thu (2.450 trên 23.238), chi phí hoạt động lấy 19,8% (4.608), thuế lấy 7,0% (1.618), và 62,7% còn lại là lợi nhuận ròng 14.562 triệu đồng. Khoản chi lớn nhất là chi phí hoạt động, nên điều cần theo dõi sát nhất là tốc độ tăng chi phí nhân sự, không phải tiền máy chủ.

Giá vốn dịch vụ được dự trù ở mức khoảng 10% doanh thu, cao hơn nhiều so với tiền token tính ở Mục 6.2. Đây là giả định thận trọng của nhóm, vì giá vốn còn phải gánh phần sử dụng của số đông học sinh dùng gói miễn phí và các lượt gọi lại khi lỗi.

Biên gộp dự phóng 89,5% cao hơn ngưỡng thiết kế thận trọng 88% khoảng 1,5 điểm phần trăm. Khoản chi phí hạch toán ngoài OPEX tiền mặt gồm phí cổng thanh toán, hoa hồng giới thiệu cho giáo viên cốt cán và đại lý, và khấu hao thiết bị. Với giả định phí cổng thanh toán 2,5% doanh thu thuê bao ($1.300 \times 2{,}5\% = 32{,}5$; 135,0; 420,0 triệu đồng), phần còn lại dành cho hoa hồng và khấu hao là 127,5; 185,0 và 348,0 triệu đồng. Khoản này giảm từ 8,5% xuống 3,3% doanh thu, tức tăng chậm hơn doanh thu. Thuế suất ưu đãi cần đối chiếu quy định hiện hành khi thực hiện.

## 8.2. Dựng doanh thu từ dưới lên

Doanh thu là tổng bốn dòng, mỗi dòng bằng số đơn vị nhân đơn giá:

$$ Học sinh trả phí = MAU × tỷ lệ chuyển đổi: 18.000 × 5,5% = 990; 75.000 × 6,8% = 5.100; 220.000 × 7,5% = 16.500 $$

$$ Thuê bao học sinh (triệu đồng) = số trả phí × ARPU năm: 990 × 1,313 = 1.300,0; 5.100 × 1,059 = 5.400,0; 16.500 × 1,018 = 16.800,0 $$

$$ Bản quyền trường = số trường × giá trung bình + số đợt × 4: 15 × 21,33 + 10 × 4 = 360,0; 60 × 21,67 + 35 × 4 = 1.440,0; 180 × 22,00 + 90 × 4 = 4.320,0 $$

$$ Giáo viên = số giáo viên × 2,49: 40 × 2,49 = 99,6; 150 × 2,49 = 373,5; 450 × 2,49 = 1.120,5 $$

Đối tác thiết bị tương đương khoảng 57, 167 và 475 thiết bị kích hoạt mỗi năm, với giả định 12 triệu đồng mỗi thiết bị và tỷ lệ chia sẻ 17,5% ($475 × 12 × 17{,}5\% = 997{,}5$ triệu đồng). Tổng: 1.879,4; 7.565,0; 23.238,0 triệu đồng. ARPU năm của học sinh trả phí (1,02 đến 1,31 triệu đồng) thấp hơn giá gói năm 1,19 triệu đồng ở hai năm sau vì giả định chiết khấu và đăng ký giữa năm; giá trung bình mỗi trường nằm giữa hai mức niêm yết, và năm 3 khớp đúng với 30 trường Cơ bản cộng 150 trường Nâng cao ($30 \times 12 + 150 \times 24 = 3.960$ triệu đồng). Vì 72,3% doanh thu năm 3 đến từ thuê bao, nếu tỷ lệ chuyển đổi chỉ bằng 5,5% thay vì 7,5% thì số học sinh trả phí giảm còn 12.100 và doanh thu thuê bao còn khoảng 12.320 triệu đồng, tổng doanh thu khoảng 18.760 triệu đồng, giảm 19,3% nhưng vẫn gấp 2,5 lần năm 2.

## 8.3. Kinh tế đơn vị và điểm hòa vốn

![Chỉ số kinh tế đơn vị và điểm hòa vốn tiền mặt](startup-report-assets/fig_s29_unit.png)

Chi phí có được một khách hàng (CAC) ở kênh học sinh được tính từ 38,1 triệu đồng (63,5% của 60 triệu đồng truyền thông năm 1) chia cho 990 học sinh, được 38.500 đồng. Nếu tính cả nhân sự hỗ trợ vào chi phí này, con số lên $(60 + 72) / 990 = 133.333$ đồng.

Với giá trị vòng đời khách hàng (LTV), doanh thu bình quân mỗi học sinh trả phí khoảng 100.700 đồng/tháng (trung bình gia quyền giữa 99.167 của gói năm và 119.000 của gói tháng, khoảng 92% gói năm), nhân 8,5 tháng ôn thi được 856.000 đồng; tính theo lợi nhuận đóng góp $(100.700 - 3.800) \times 8{,}5 = 823.700$ đồng. LTV/CAC là 22,2 lần theo doanh thu, 21,4 lần theo lợi nhuận đóng góp và 6,4 lần ở kịch bản xấu, vẫn gấp 2,1 lần ngưỡng 3 lần thường dùng. Thu hồi CAC: $38.500 / (100.700 / 30) = 11{,}5$ ngày; kịch bản xấu 39,7 ngày.

Về hòa vốn tiền mặt, doanh thu cần đạt mỗi tháng bằng OPEX tiền mặt tháng chia biên gộp: $(588 / 12) / 0{,}8998 = 54{,}46$ triệu đồng/tháng, tương đương $54{,}46 / 0{,}119 = 458$ học sinh trả phí, hay 15 trường cộng 234 học sinh (15 trường tạo 26,67 triệu đồng/tháng). Ngưỡng 458 bằng 46% số học sinh trả phí bình quân năm 1 (990); mốc tháng 7 là giả định về đường tăng người dùng. Hòa vốn này tính trên OPEX tiền mặt ở Mục 6.1, chưa gồm khoản hạch toán bổ sung.

---

# 9. CHIẾN LƯỢC BÁN HÀNG VÀ LỘ TRÌNH TRIỂN KHAI

## 9.1. Land-and-Expand và thứ tự thương mại hóa

Quy trình bốn bước: (1) thao giảng tại tổ chuyên môn, tặng gói dùng thử ba tháng cho phòng học mẫu; (2) sau một tháng, báo cáo ban giám hiệu về mức tập trung và tỷ lệ hoàn thành bài tập; (3) ký bản quyền cấp trường cho toàn bộ phòng có thiết bị; (4) học sinh nhận mã QR mỗi ngày, mở luồng tự học trả phí tại nhà.

Nhóm sắp xếp thứ tự bán hàng theo thời gian ra quyết định của từng loại khách (Hình [[ref:fig_s24_cycle]]). Năm đầu tiên tập trung vào những khách quyết nhanh, trong khoảng một ngày đến ba tháng: giáo viên luyện thi, câu lạc bộ chuyên đề, trung tâm bồi dưỡng, trường tư thục, trường công lập tự chủ và học sinh đến qua mã QR. Các khách này dùng thử ngay trong tiết dạy rồi đăng ký theo tháng, không cần quảng cáo trả tiền, và mang lại cả doanh thu lẫn bằng chứng sử dụng. Từ năm thứ hai, nhóm mở rộng sang trường công lập thường, nơi một quyết định mua mất từ ba đến sáu tháng cộng thêm chu kỳ ngân sách. Ở đây nhóm bán giấy phép cấp tổ bộ môn cài trên màn hình sẵn có, và bán kèm thiết bị của đối tác với mức chia sẻ 15% đến 20%, nhờ đó bớt phụ thuộc vào bán lẻ.

## 9.2. Lộ trình bốn giai đoạn

![Lộ trình bốn giai đoạn theo quý, năm vận hành thứ nhất bắt đầu từ Quý 2/2027](startup-report-assets/fig_s30_roadmap.png)

Năm vận hành thứ nhất tính từ khi bắt đầu thương mại hóa (Quý 2/2027); các chỉ tiêu doanh thu ở Mục 8 ứng với năm vận hành tương ứng: 1.879,4 triệu đồng (năm 1), 7.565,0 triệu đồng (năm 2) và 23.238,0 triệu đồng (năm 3). Giai đoạn 1 đo độ trễ nhận diện (mục tiêu dưới 15 ms) và 60 khung hình/giây trên màn hình thật; Giai đoạn 3 là lúc đưa các hạng mục R&D ở Mục 3.3 vào bản bán.

# 10. CHIẾN LƯỢC TIẾP THỊ VÀ PHÁT TRIỂN CỘNG ĐỒNG

Nhóm để chính sản phẩm kéo người dùng mới đến. Mã QR trên bảng mở thẳng bằng trình duyệt, học sinh không phải cài ứng dụng nên dùng thử rất dễ. Phiếu nỗ lực học tập gửi phụ huynh ghi lại thời gian con tự suy nghĩ và số bài con tự giải, giúp bố mẹ có căn cứ khi quyết định trả phí. Kết quả thực nghiệm (cao hơn đối chứng 0,85 điểm, giữ kiến thức sau hai tuần 81,9% so với 60,5%) sẽ được trình bày tại các hội thảo giáo dục để tạo uy tín học thuật. Nhóm cũng xây dựng cộng đồng giáo viên cốt cán qua các buổi tọa đàm và cuộc thi giải câu hỏi phân tích số liệu. Truyền thông năm 1 là 60 triệu đồng, không quảng cáo trả tiền theo lượt, vì người dẫn khách là giáo viên và bằng chứng là số liệu thực nghiệm.

# 11. QUẢN TRỊ RỦI RO VÀ PHÁT TRIỂN BỀN VỮNG

![Bản đồ rủi ro: vị trí trước và sau cơ chế phòng vệ](startup-report-assets/fig_s31_risk.png)

- **R1. Đọc sai chữ viết tay** (khả năng cao). Giáo viên chạm một lần để đổi ký tự dễ nhầm hoặc sửa thẳng trên ô công thức, nên ảnh hưởng còn lại thấp.
- **R2. Hạn mức hoặc giá của nhà cung cấp mô hình** (trung bình; nhóm đã từng gặp lỗi hết hạn mức). Việc đọc chữ khi khoanh đang phụ thuộc Gemini Vision, nên hệ thống có nhiều khóa và nhiều mô hình dự phòng, cùng bộ nhận dạng chạy trên máy khi mất mạng. Phía học sinh, 81,4% lượt không gọi mô hình ngôn ngữ. Mức dự trù 350 đồng mỗi tiết gấp 3,4 lần chi phí tính theo công thức.
- **R3. Học sinh tìm cách lấy đáp án** (cao). Hệ thống lọc câu xin đáp án, khóa từng bước giải, chặn dán ở bàn phím số và lọc câu trả lời của AI; trong thực nghiệm chặn được 98,4% lượt.
- **R4. Mua sắm công kéo dài** (cao, ảnh hưởng dòng tiền). Nhóm bán trước cho các khách hàng quyết nhanh, bán giấy phép cấp tổ bộ môn và đi kèm thiết bị của đối tác; ảnh hưởng còn lại ở mức trung bình.
- **R5. Quy mô, lưu trữ và bảo mật dữ liệu** (trung bình). Phòng học hiện chỉ nằm trong bộ nhớ tạm của máy chủ và chưa có tài khoản. Lưu trữ bền vững và phân quyền phải xong trước khi bán cho trường công, đồng thời ghi chú chỉ giữ tối thiểu dữ liệu cá nhân.

Hai rủi ro còn ở mức trung bình (R4, R5) liên quan tới thời gian và hạ tầng, không làm thay đổi các giả định kinh tế chính.

Về phát triển bền vững, số hóa thí nghiệm giúp giảm hóa chất, dụng cụ tiêu hao và giấy in. Học sinh ở vùng khó khăn cũng được tiếp cận thí nghiệm trực quan với chi phí thấp. Hệ thống được thiết kế để giữ thói quen tự suy nghĩ của học sinh, và dữ liệu chỉ được dùng cho mục đích học tập.

---

# KẾT LUẬN VÀ KIẾN NGHỊ

Sau tám tuần thử nghiệm, nhóm tin rằng dự án khả thi. Sản phẩm giúp nhà trường dùng được dàn màn hình đã mua mà không phải đầu tư thêm. Trên 412 học sinh, điểm đầu ra của nhóm dùng sản phẩm cao hơn nhóm đối chứng 0,85 điểm. Mô hình tài chính có công thức rõ ràng để kiểm tra lại, với biên gộp 89,5%, tỷ lệ LTV/CAC 22,2 lần (6,4 lần trong kịch bản xấu) và dự kiến hòa vốn tiền mặt từ tháng thứ 7. Nhóm tác giả kính đề nghị Ban Giám khảo SV_STARTUP lần thứ IX xem xét và hỗ trợ dự án hoàn thiện và nhân rộng.
