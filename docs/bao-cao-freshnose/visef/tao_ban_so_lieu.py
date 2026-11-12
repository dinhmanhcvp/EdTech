# Tạo bao-cao_ban-so-lieu.md từ bao-cao_ban-gon.md: thay các phần kết quả bằng số liệu kiểm chứng từ file CSV.
# Không sửa bao-cao_ban-gon.md. Chạy: python -X utf8 tao_ban_so_lieu.py
import os, re
HERE = os.path.dirname(os.path.abspath(__file__))
s = open(os.path.join(HERE, "bao-cao_ban-gon.md"), encoding="utf8").read()

def between(text, a, b, new, keep_b=True):
    i = text.index(a); j = text.index(b, i)
    return text[:i] + new + (text[j:] if keep_b else text[j + len(b):])

# 1. Tóm tắt
s = between(s, "Nhóm thí nghiệm 21 ngày", "Gói 1 Hub + 8 Node có giá bán",
"Nhóm thí nghiệm qua 3 đợt, mỗi đợt 3 chuỗi đo (lành lặn, gây xước, nhiễm nấm thán thư), tổng 4.500 mẫu chuỗi thời gian. Huấn luyện trên hai đợt và kiểm tra trên đợt còn lại (1.500 mẫu), mô hình đạt độ chính xác 87,5 % (1.312/1.500) và cảnh báo giả 6,2 % (62/1.000), nhưng chỉ nhận đúng 45,0 % số mẫu chín sinh lý. Nhãn mức đỏ xuất hiện sớm hơn lúc thấy vết thối 26,3 ± 6,4 giờ (18,5–35,5 giờ, 6 chuỗi). Một Node chạy 23,5 ngày liên tục trên pin 6.000 mAh, đạt mức 20 % dung lượng ở ngày 21,0. ")

# 2. Mục tiêu
s = s.replace("thu chuỗi thời gian từ thí nghiệm 21 ngày trên ba nhóm quả", "thu chuỗi thời gian từ 3 đợt thí nghiệm trên ba nhóm quả (4.500 mẫu)")
s = s.replace("Thí nghiệm 3 buồng, 21 ngày", "Thí nghiệm 3 đợt × 3 chuỗi")
s = s.replace("thí nghiệm 21 ngày trên 60 kg | 4.500 mẫu |", "thí nghiệm 3 đợt (1–21/6/2026) trên 60 kg; đo pin 15/7–7/8/2026 | 4.500 mẫu; 1.128 chu kỳ đo pin |")

# 3. Chương 3: thực nghiệm và học máy
s = between(s, "**Thực nghiệm đối chứng.**", "### 3.2.",
"""**Thực nghiệm đối chứng.** Mỗi đợt có ba chuỗi đo, mỗi chuỗi một điều kiện: lành lặn (đối chứng), gây xước cơ học, lây nhiễm nấm thán thư. Thí nghiệm gồm 3 đợt, bắt đầu ngày 1, 6 và 11/6/2026; mỗi chuỗi 500 mẫu cách nhau 30 phút (khoảng 10,4 ngày), tổng 9 chuỗi và 4.500 mẫu, toàn bộ kéo dài 21 ngày lịch. Nhóm dùng 60 kg xoài và chuối ở ba buồng mát. Biến độc lập là tình trạng quả và thời gian lưu; biến phụ thuộc là R<sub>s</sub>/R<sub>0</sub> của TGS2602 và TGS822, nhiệt độ, độ ẩm, nhãn trạng thái, thời điểm cảnh báo mức đỏ và thời điểm thấy vết thối. Nhiệt độ và độ ẩm đo bằng SHT31 là 12,15 ± 0,84 °C và 89,1 ± 2,2 % (lành lặn), 12,45 ± 0,81 °C và 88,3 ± 2,2 % (gây xước), 11,95 ± 0,84 °C và 89,9 ± 2,2 % (nhiễm nấm); các nhóm chênh nhau tới 0,5 °C và 1,6 % RH. Số lần lặp: 3 đợt. [CẦN XÁC NHẬN: giống xoài và chuối, độ chín ban đầu, khối lượng mỗi buồng, giá trị đặt của buồng; các đợt 1–2 và 2–3 chồng nhau 5 ngày với cùng mã buồng trong khi chỉ có 3 Node: cần ghi số buồng và số Node thực tế.]

Node đo mỗi 30 phút (gia nhiệt 120 giây, đọc 30 giây, rồi ngủ sâu), truyền qua LoRa AS923 (923,2 MHz, 14 dBm) [CẦN KIỂM: độ chính xác SHT31 theo datasheet].

**Học máy.** Mô hình Random Forest (n_estimators = 100, max_depth = 8, random_state = 123) phân loại ba trạng thái. [CẦN XÁC NHẬN: danh sách đặc trưng đầu vào và quy tắc gán nhãn "an toàn, chín sinh lý, nguy cơ lên men".] Dữ liệu kiểm tra tách khỏi huấn luyện theo đợt: huấn luyện trên đợt 1 và 2 (3.000 mẫu), kiểm tra trên đợt 3 (1.500 mẫu), để tránh các mẫu liền kề trong cùng một chuỗi rơi vào cả hai tập. Cách chia này chỉ có một tập kiểm tra gồm 3 chuỗi, và ba đợt dùng cùng mã buồng, nên chưa độc lập về thiết bị. Báo cáo gồm độ chính xác, độ nhạy, độ đặc hiệu, cảnh báo giả và ma trận nhầm lẫn. Thời gian cảnh báo sớm Δt là hiệu giữa thời điểm đầu tiên thấy vết thối và thời điểm đầu tiên cột Model_Red_Alert của dữ liệu thô bằng 1, tính trung bình ± SD trên các chuỗi có vết thối.

""")

# 4. Mục 4.1
s = between(s, "Trong 18 đơn vị, 15 (83,3 %)", "### 4.2.",
"""Trong 18 đơn vị, 15 (83,3 %) kiểm tra bằng mắt và mũi (10/12 HTX, 5/6 kho mát), 14 (77,8 %) từng thiệt hại do lây lan (10/12 HTX, 4/6 kho mát), 13 (72,2 %) chọn mức ngân sách 15–25 triệu đồng; 2 đơn vị chọn 25–35 triệu và 3 đơn vị chỉ 10–15 triệu, thấp hơn giá gói 22 triệu. Quy mô kho từ 50 đến 250 tấn (trung vị 102,5 tấn), trong đó 2 kho vượt 200 tấn; 12 đơn vị bảo quản cả xoài và chuối. Khoảng tin cậy Wilson 95 % của ba tỉ lệ là 60,8–94,2 %, 54,8–91,0 % và 49,1–87,5 %, nên chỉ đọc như chiều hướng.

Phương pháp phổ biến nhất cũng là phương pháp phát hiện muộn nhất: kiểm tra bằng mắt chỉ thấy quả khi vết thối đã lộ, khớp với việc 14 trong 18 đơn vị từng bị lây lan. Mỗi đơn vị nêu một lý do chưa lắp thiết bị tự động: 7 đơn vị cho rằng hệ thống phân tích khí nhập ngoại (GC-MS) quá đắt (trên 150 triệu đồng), 5 đơn vị nói thiết bị nhiệt ẩm hiện có không báo được quả thối sớm, 3 đơn vị e ngại cảm biến bão hòa ở độ ẩm trên 85 %, 2 đơn vị chưa biết công nghệ, 1 đơn vị nói vách panel cách nhiệt làm suy hao sóng không dây. Hai lý do cuối (4 đơn vị) đòi hỏi chứng minh Node chịu ẩm và truyền được qua vách kho, điều thí nghiệm chưa kiểm chứng. "Sẵn sàng chi" chưa phải quyết định mua, và mẫu thuận tiện có thể nghiêng về đơn vị quan tâm công nghệ. [CẦN SỐ LIỆU: thời gian, hình thức khảo sát; ẩn tên đơn vị, chỉ dùng mã HTX_01…KHO_06.]

""")

# 5. Bảng 4.2: không có dữ liệu lỗi v1, v2 trong các file đã cung cấp, giữ một dòng nhắc
s = between(s, "**Bảng 4.2. Các phiên bản nguyên mẫu**", "#### 4.2.4.",
"""**Bảng 4.2. Các phiên bản nguyên mẫu.** [CẦN DỮ LIỆU ĐO: lỗi, nguyên nhân, cách sửa và số đo trước, sau của v1, v2; chưa có file dữ liệu cho phần này. Trình bày thành bảng 5 cột khi có.]

""")

# 6. Kết quả thử nghiệm và đối chiếu tiêu chí
s = between(s, "#### 4.2.4. Kết quả thử nghiệm", "### 4.3.",
"""#### 4.2.4. Kết quả thử nghiệm

**Bảng 4.3. Tín hiệu cảm biến theo nhóm quả và trạng thái (trung bình ± SD, gộp 3 đợt)**

| Nhóm quả | Trạng thái | n | R<sub>s</sub>/R<sub>0</sub> TGS2602 | R<sub>s</sub>/R<sub>0</sub> TGS822 |
|---|---|---|---|---|
| Lành lặn | An toàn | 1.108 | 0,868 ± 0,092 | 0,910 ± 0,069 |
| Lành lặn | Chín sinh lý | 392 | 0,661 ± 0,061 | 0,826 ± 0,060 |
| Gây xước | An toàn | 734 | 0,918 ± 0,066 | 0,923 ± 0,069 |
| Gây xước | Chín sinh lý | 38 | 0,772 ± 0,064 | 0,745 ± 0,064 |
| Gây xước | Nguy cơ lên men | 728 | 0,386 ± 0,121 | 0,339 ± 0,117 |
| Nhiễm nấm | An toàn | 426 | 0,927 ± 0,073 | 0,928 ± 0,066 |
| Nhiễm nấm | Chín sinh lý | 94 | 0,842 ± 0,103 | 0,877 ± 0,100 |
| Nhiễm nấm | Nguy cơ lên men | 980 | 0,332 ± 0,114 | 0,287 ± 0,106 |

*Nguồn: Nhóm tác giả, 4.500 mẫu (PhuLucB_FreshNose_RawTimeSeries.csv).*

![Hình 4.3](figures/hinh_4_3_tin_hieu.png)

*Hình 4.3. R<sub>s</sub>/R<sub>0</sub> theo giờ kể từ đầu mỗi đợt (đường: trung bình 3 đợt; dải: ± SD). Nguồn: Nhóm tác giả.*

Ở nhóm nhiễm nấm, TGS2602 giảm từ 0,927 ± 0,073 (an toàn, n = 426) xuống 0,332 ± 0,114 (nguy cơ lên men, n = 980) và TGS822 từ 0,928 xuống 0,287; nhóm lành lặn chỉ xuống 0,661 và 0,826 khi chín sinh lý (n = 392). Hình 4.3 cho thấy nhóm nhiễm nấm bắt đầu giảm sau khoảng 70 giờ, nhóm gây xước sau khoảng 120 giờ; dải ± SD rộng quanh giờ 70–150 vì thời điểm khởi phát khác nhau giữa các đợt (nhãn mức đỏ ở nhóm nhiễm nấm từ giờ 68 đến 120), không phải do nhiễu đo. Khi chín sinh lý TGS2602 giảm nhiều hơn TGS822 (0,868 → 0,661 so với 0,910 → 0,826), còn khi lên men cả hai cùng xuống quanh 0,3; điều này phù hợp với việc TGS822 nhạy hơn với ethanol, nhưng là suy luận chưa đối chiếu bằng phép đo ethanol. Hai kênh nhờ vậy cho phép tách lên men khỏi chín bình thường. Tuy nhiên 392 trong 524 mẫu chín sinh lý (74,8 %) đến từ buồng đối chứng, nên lớp này khó tách khỏi đặc điểm buồng, nhất là khi nhiệt độ và độ ẩm giữa các buồng lệch nhau.

**Bảng 4.4. Ma trận nhầm lẫn trên đợt 3 (1.500 mẫu; hàng: thực tế, cột: dự đoán)**

| Thực tế | An toàn | Chín sinh lý | Nguy cơ lên men | Tổng | Độ nhạy (%) | Độ đặc hiệu (%) |
|---|---|---|---|---|---|---|
| An toàn | 715 | 42 | 23 | 780 | 91,7 | 88,6 |
| Chín sinh lý | 82 | 99 | 39 | 220 | 45,0 | 96,6 |
| Nguy cơ lên men | 0 | 2 | 498 | 500 | 99,6 | 93,8 |

*Nguồn: Nhóm tác giả (PhuLucB_ConfusionMatrix_Metrics.csv).*

Độ chính xác chung là 87,47 % (1.312/1.500; khoảng tin cậy Wilson 95 % là 85,7–89,0 % nếu coi các mẫu độc lập, thực tế rộng hơn vì tập kiểm tra chỉ có 3 chuỗi liên tục). Với lớp nguy cơ lên men, mô hình nhận đúng 498/500 mẫu, không bỏ sót mẫu nào sang "an toàn", và cảnh báo giả là 62/1.000 (6,2 %). Với lớp chín sinh lý, độ nhạy chỉ 45,0 % (99/220; 82 mẫu bị gọi là an toàn, 39 mẫu bị gọi là lên men), nên F1 trung bình ba lớp là 79,7 %, thấp hơn độ chính xác chung vì lớp an toàn chiếm 52 % tập kiểm tra. Các lỗi nằm ở vùng chuyển tiếp mềm giữa hai trạng thái. Việc phát hiện lên men, điều chủ kho cần nhất, đạt tốt; mức vàng kém tin cậy nên chỉ nên dùng như tín hiệu theo dõi. [CẦN XÁC NHẬN: mã huấn luyện và dự đoán từng mẫu; kiểm tra lại của chúng tôi bằng Random Forest cùng siêu tham số trên bốn đặc trưng cho khoảng 90,9 %, khác 87,5 %, nên đặc trưng nhóm dùng có thể khác.]

![Hình 4.4](figures/hinh_4_4_som.png)

*Hình 4.4. Từ thời điểm nhãn mức đỏ đến lúc thấy vết thối trong 6 chuỗi. Nguồn: Nhóm tác giả.*

Trong 6 chuỗi có vết thối (2 điều kiện × 3 đợt), nhãn mức đỏ sớm hơn lúc thấy vết thối 26,3 ± 6,4 giờ (18,5–35,5 giờ): nhóm nhiễm nấm 22,2 ± 4,4 giờ, nhóm gây xước 30,5 ± 5,6 giờ (mỗi nhóm n = 3), cả 6 chuỗi đều trên 12 giờ; nhóm lành lặn không có cảnh báo. Với n = 3 mỗi nhóm chưa đủ để khẳng định nấm và xước khác nhau. Cột Model_Red_Alert trong dữ liệu thô trùng từng mẫu với nhãn "nguy cơ lên men", nên Δt là thời gian từ lúc bắt đầu mức lên men đến lúc thấy vết thối. [CẦN XÁC NHẬN: nếu cột này là dự đoán thì cần nộp dự đoán từng mẫu; nếu là nhãn thì phải tính lại Δt từ dự đoán, vì mô hình có thể báo muộn hơn nhãn.]

**Pin và truyền thông.** Nhật ký 1.128 chu kỳ đo (30 phút) của một Node từ 15/7 đến 7/8/2026 cho thấy tiêu thụ 229,1 mAh mỗi ngày, điện áp giảm từ 3,418 V xuống 3,121 V; dung lượng còn 20 % ở ngày 21,0 và 10,3 % ở ngày 23,5. Có 47/1.128 lần truyền (4,2 %) phải gửi lại và đều thành công; RSSI từ −91,3 đến −83,3 dBm. [CẦN XÁC NHẬN: nhiệt độ khi đo pin (pin lithium sắt phot-phat mất dung lượng khi lạnh), khoảng cách và vật cản giữa Node và Hub; nhật ký chỉ có một Node, khác thời điểm thí nghiệm quả.]

#### 4.2.5. So sánh với giải pháp hiện có và đối chiếu tiêu chí

**Bảng 4.5. Đối chiếu kết quả với tiêu chí thiết kế**

| Mã | Ngưỡng | Kết quả | Kết luận |
|---|---|---|---|
| TC1 | ≥ 85 % | 87,47 % (1.312/1.500, đợt 3); F1 trung bình 79,7 % | Đạt về độ chính xác chung; lớp chín sinh lý chỉ 45,0 % |
| TC2 | ≤ 10 % | 6,2 % (62/1.000) | Đạt |
| TC3 | ≥ 12 giờ | 26,3 ± 6,4 giờ (18,5–35,5; 6 chuỗi) | Đạt nếu Model_Red_Alert là dự đoán của mô hình [CẦN XÁC NHẬN] |
| TC4 | ≥ 20 ngày | 21,0 ngày đến mức 20 % dung lượng; 23,5 ngày đến 10,3 % | Đạt nếu ngưỡng ngắt là 20 %; chưa rõ nhiệt độ đo |
| TC5 | ≤ 22 triệu | Giá bán 22 triệu; giá vốn ước tính 13,4 triệu | Đạt đúng ngưỡng; giá vốn chưa có báo giá |

*Nguồn: Nhóm tác giả.*

Cả năm tiêu chí đều đạt về số học, nhưng TC1 và TC3 dựa trên một tập kiểm tra 3 chuỗi và 6 sự kiện, TC3 chỉ đúng nếu Model_Red_Alert là dự đoán, và TC5 đạt vì nhóm đặt giá bán bằng ngưỡng. So với giải pháp hiện có, nguyên mẫu khác ở chi phí và việc giám sát liên tục kết hợp tín hiệu khí, nhưng mới thử trong phòng thí nghiệm và chưa kiểm chứng việc chỉ ra phân khu; nhóm chưa nên ghi "rẻ hơn 6–8 lần" khi chưa có báo giá thiết bị đối chiếu.

""")

# 7. Kết luận và hạn chế
s = between(s, "**CH1.** Mảng TGS2602, TGS822 và SHT31 kết hợp Random Forest đạt", "Về khoa học, đề tài trình bày",
"""**CH1.** Mảng TGS2602, TGS822 và SHT31 kết hợp Random Forest phân loại đúng 87,47 % (1.312/1.500) mẫu của đợt 3, rất tốt với lớp nguy cơ lên men (độ nhạy 99,6 %, không bỏ sót sang "an toàn") nhưng kém với lớp chín sinh lý (độ nhạy 45,0 %; F1 trung bình 79,7 %). **CH2.** Nhãn mức đỏ xuất hiện sớm hơn lúc thấy vết thối 26,3 ± 6,4 giờ (18,5–35,5 giờ, 6 chuỗi) với cảnh báo giả 6,2 % (62/1.000); kết luận này cần xác nhận cột Model_Red_Alert là dự đoán của mô hình. **CH3.** Một Node chạy 23,5 ngày trên pin 6.000 mAh (đạt mức 20 % dung lượng ở ngày 21,0); gói 1 Hub + 8 Node có giá vốn ước tính 13,4 triệu đồng và giá bán 22 triệu đồng. Độ ổn định ở độ ẩm trên 90 % chưa có số đo riêng, vì nhật ký pin không kèm nhiệt độ, độ ẩm.

""")
s = between(s, "### 5.2. Hạn chế của đề tài", "## TÀI LIỆU THAM KHẢO",
"""### 5.2. Hạn chế của đề tài

1. **Tập kiểm tra nhỏ.** Chỉ đợt 3 (3 chuỗi, 1.500 mẫu liên tục) làm tập kiểm tra, ba đợt dùng chung mã buồng và loại Node, và các đợt chồng nhau 5 ngày; số 87,47 % nên đọc như ước lượng thô, không phải khoảng tin cậy hẹp.
2. **Lớp chín sinh lý yếu và lẫn với buồng.** Độ nhạy 45,0 %, và 75 % mẫu của lớp này đến từ buồng đối chứng, trong khi nhiệt độ và độ ẩm giữa các buồng lệch tới 0,5 °C và 1,6 % RH, nên mô hình có thể học đặc điểm buồng.
3. **Δt dựa trên một cột chưa rõ nguồn.** Cột Model_Red_Alert trùng với nhãn mức lên men; cần dự đoán từng mẫu để tính thời điểm cảnh báo thật của mô hình.
4. **Chưa kiểm chứng khoanh vùng.** Mỗi chuỗi có một điểm đo nên chưa biết hệ thống chỉ đúng dãy kệ; khoanh vùng là thiết kế dự kiến.
5. **Quả hỏng gây nhân tạo** (xước, cấy nấm), trong khi hư hỏng ở kho còn do thối cuống, tổn thương lạnh, nhiễm khuẩn; cảm biến MOX chọn lọc thấp, phụ thuộc nhiệt ẩm, có trôi tín hiệu [7], và chưa đối chiếu sắc ký khí.
6. **Pin, khảo sát, chi phí.** Nhật ký pin chỉ một Node, khác thời điểm và chưa ghi nhiệt độ; khảo sát n = 18 mẫu thuận tiện; chi phí chưa có báo giá; chưa có kết quả thực địa.

### 5.3. Hướng phát triển

Chạy thêm đợt thí nghiệm bằng buồng và Node độc lập, đổi vị trí điều kiện giữa các buồng để tách ảnh hưởng của buồng (hạn chế 1, 2); lưu và công bố dự đoán từng mẫu để tính Δt thật, gộp hoặc tách lại lớp chín sinh lý bằng phép đo độ cứng, Brix (hạn chế 2, 3); đặt nhiều Node trong một buồng nhiều dãy kệ, cố ý đặt sọt hỏng ở từng vị trí (hạn chế 4); đối chiếu mẫu bằng đo ethylene hoặc sắc ký khí tại đơn vị chuyên môn (hạn chế 5); hoàn thành thử nghiệm tại 2 kho, đo pin kèm nhiệt độ và huấn luyện lại bằng dữ liệu kho (hạn chế 6).

""")

# 8. Phụ lục
s = between(s, "## PHỤ LỤC", "\u0000" if False else "- **C.**",
"""## PHỤ LỤC

- **A.** Phiếu và kết quả khảo sát 18 đơn vị (PhuLucA_KhaoSat_18DonVi.csv; dùng mã HTX_01…KHO_06, không nêu tên; biểu đồ figures/hinh_4_1_khao_sat.png). [CẦN SỐ LIỆU: phiếu gốc]
- **B.** Số liệu: 4.500 mẫu thô, tóm tắt theo ngày, ma trận nhầm lẫn, nhật ký pin 1.128 chu kỳ (4 file PhuLucB_*.csv); mã phan_tich_so_lieu.py.
""")

# --- rút gọn Chương 1 và 3 cho đủ 15 trang ---
for a, b in [
 (" Cứ bốn phần rau quả thu hoạch thì xấp xỉ một phần không đến được bán lẻ.", ""),
 (" Các nguồn này không tách riêng xoài và chuối nên nhóm chỉ dùng để nêu bậc độ lớn.", " Các nguồn này không tách riêng xoài và chuối."),
 ("Thiệt hại vượt xa một sọt vì xoài và chuối là quả hô hấp đột biến, vẫn sinh ethylene sau thu hoạch [CẦN KIỂM: tài liệu về quả hô hấp đột biến]; sọt dập hoặc nhiễm nấm lên men cục bộ rồi lan sang sọt kế bên qua tiếp xúc, ethylene và bào tử, trong khi nhiệt độ cả kho vẫn có thể bình thường. Các giải pháp hiện có được tóm tắt ở Bảng 1.1.",
  "Xoài và chuối là quả hô hấp đột biến, vẫn sinh ethylene sau thu hoạch [CẦN KIỂM: tài liệu]; sọt dập hoặc nhiễm nấm lên men cục bộ rồi lan sang sọt kế bên qua tiếp xúc, ethylene và bào tử, trong khi nhiệt độ cả kho vẫn có thể bình thường (Bảng 1.1)."),
 (" Vì vậy nhóm dùng mảng nhiều cảm biến, lấy đáp ứng chồng lấn theo chuỗi thời gian, đo thêm nhiệt ẩm để bù trôi và phân loại bằng học máy thay vì tách từng khí.", " Vì vậy nhóm dùng mảng nhiều cảm biến, đo thêm nhiệt ẩm để bù trôi và phân loại bằng học máy thay vì tách từng khí."),
 (" Trong các tài liệu nhóm đã duyệt, chưa thấy công trình dùng mảng giá thấp ở độ ẩm trên 90 % trong kho mát với khoanh vùng theo dãy kệ; nhận định này cần tìm kiếm có hệ thống để xác nhận trước khi nộp.", " Trong các tài liệu đã duyệt chưa thấy công trình dùng mảng giá thấp ở độ ẩm trên 90 % với khoanh vùng theo dãy kệ [CẦN KIỂM: tìm kiếm có hệ thống]."),
 (" Cách chia này chỉ có một tập kiểm tra gồm 3 chuỗi, và ba đợt dùng cùng mã buồng, nên chưa độc lập về thiết bị.", " Tập kiểm tra chỉ gồm 3 chuỗi và ba đợt dùng cùng mã buồng nên chưa độc lập về thiết bị."),
]:
    assert a in s, a[:40]; s = s.replace(a, b)

for a, b in [
 ("Chạy thêm đợt thí nghiệm bằng buồng và Node độc lập, đổi vị trí điều kiện giữa các buồng để tách ảnh hưởng của buồng (hạn chế 1, 2); lưu và công bố dự đoán từng mẫu để tính Δt thật, gộp hoặc tách lại lớp chín sinh lý bằng phép đo độ cứng, Brix (hạn chế 2, 3); đặt nhiều Node trong một buồng nhiều dãy kệ, cố ý đặt sọt hỏng ở từng vị trí (hạn chế 4); đối chiếu mẫu bằng đo ethylene hoặc sắc ký khí tại đơn vị chuyên môn (hạn chế 5); hoàn thành thử nghiệm tại 2 kho, đo pin kèm nhiệt độ và huấn luyện lại bằng dữ liệu kho (hạn chế 6).",
  "Chạy thêm đợt với buồng và Node độc lập, đổi vị trí điều kiện giữa các buồng (hạn chế 1, 2); lưu dự đoán từng mẫu để tính Δt thật và gán nhãn chín sinh lý bằng độ cứng, Brix (hạn chế 2, 3); đặt nhiều Node trong một buồng nhiều dãy kệ (hạn chế 4); đối chiếu bằng đo ethylene hoặc sắc ký khí (hạn chế 5); thử tại 2 kho, đo pin kèm nhiệt độ, huấn luyện lại bằng dữ liệu kho (hạn chế 6)."),
 ("Theo giả định của nhóm, kho 50 tấn xoài giá 25.000 đồng/kg (1,25 tỷ đồng) hao hụt 8 % mỗi mẻ; nếu phát hiện sớm giảm thêm 1,5–2,0 % thì tiết kiệm 18,75–25 triệu đồng mỗi mẻ, gói 22 triệu thu hồi sau 1–2 mẻ. Các mức giảm và mức hao hụt 8 % đều là giả định chưa đo. [CẦN SỐ LIỆU: hao hụt thực tế mỗi mẻ.] Pilot tại 2 kho dự kiến trong 10/2026–2/2027; chưa có kết quả nên không viết như đã thực hiện. [CẦN XÁC NHẬN: tiến độ, văn bản xác nhận.]",
  "Theo giả định của nhóm (chưa đo), kho 50 tấn xoài giá 25.000 đồng/kg hao hụt 8 % mỗi mẻ; nếu phát hiện sớm giảm thêm 1,5–2,0 % thì tiết kiệm 18,75–25 triệu đồng mỗi mẻ, gói 22 triệu thu hồi sau 1–2 mẻ. [CẦN SỐ LIỆU: hao hụt thực tế.] Pilot tại 2 kho dự kiến 10/2026–2/2027, chưa có kết quả. [CẦN XÁC NHẬN: tiến độ, văn bản xác nhận.]"),
 ("Hub phân loại từng phân khu: mức 1 (xanh) ổn định; mức 2 (vàng) tín hiệu VOC và ethanol lệch khỏi đường chín sinh lý; mức 3 (đỏ) tăng cao kéo dài và báo vị trí. Hệ thống chỉ hỗ trợ cảnh báo; nhân viên kho vẫn kiểm tra sọt.",
  "Hub phân loại từng phân khu: mức 1 (xanh) ổn định; mức 2 (vàng) tín hiệu lệch khỏi đường chín sinh lý; mức 3 (đỏ) tăng cao kéo dài. Hệ thống chỉ hỗ trợ cảnh báo; nhân viên kho vẫn kiểm tra sọt."),
]:
    assert a in s, a[:40]; s = s.replace(a, b)

for a, b in [
 (" Hình 4.3 cho thấy nhóm nhiễm nấm bắt đầu giảm sau khoảng 70 giờ, nhóm gây xước sau khoảng 120 giờ; dải ± SD rộng quanh giờ 70–150 vì thời điểm khởi phát khác nhau giữa các đợt (nhãn mức đỏ ở nhóm nhiễm nấm từ giờ 68 đến 120), không phải do nhiễu đo.", " Hình 4.3 cho thấy nhóm nhiễm nấm giảm sau khoảng 70 giờ, nhóm gây xước sau khoảng 120 giờ; dải ± SD rộng quanh giờ 70–150 do thời điểm khởi phát khác nhau giữa các đợt, không phải nhiễu đo."),
 (" Hai kênh nhờ vậy cho phép tách lên men khỏi chín bình thường.", ""),
 (" Với n = 3 mỗi nhóm chưa đủ để khẳng định nấm và xước khác nhau.", ""),
 ("5. **Quả hỏng gây nhân tạo** (xước, cấy nấm), trong khi hư hỏng ở kho còn do thối cuống, tổn thương lạnh, nhiễm khuẩn; cảm biến MOX chọn lọc thấp, phụ thuộc nhiệt ẩm, có trôi tín hiệu [7], và chưa đối chiếu sắc ký khí.", "5. **Quả hỏng gây nhân tạo** (xước, cấy nấm), khác hư hỏng tự nhiên ở kho; cảm biến MOX chọn lọc thấp, phụ thuộc nhiệt ẩm, có trôi tín hiệu [7], chưa đối chiếu sắc ký khí."),
 ("6. **Pin, khảo sát, chi phí.** Nhật ký pin chỉ một Node, khác thời điểm và chưa ghi nhiệt độ; khảo sát n = 18 mẫu thuận tiện; chi phí chưa có báo giá; chưa có kết quả thực địa.", "6. **Pin, khảo sát, chi phí.** Nhật ký pin chỉ một Node và chưa ghi nhiệt độ; khảo sát n = 18 mẫu thuận tiện; chi phí chưa có báo giá; chưa có kết quả thực địa."),
 ("**An toàn và đạo đức.** Đề tài không thí nghiệm trên người hay động vật. Nấm thán thư là tác nhân gây bệnh thực vật, được cấy trong buồng riêng. [CẦN XÁC NHẬN: nguồn giống nấm, biện pháp bảo hộ, khử khuẩn, tiêu hủy, người giám sát có chuyên môn; sự đồng ý của các đơn vị khảo sát.]", "**An toàn và đạo đức.** Đề tài không thí nghiệm trên người hay động vật; nấm thán thư là tác nhân gây bệnh thực vật, được cấy trong buồng riêng. [CẦN XÁC NHẬN: nguồn giống nấm, bảo hộ, khử khuẩn, tiêu hủy, người giám sát; sự đồng ý của đơn vị khảo sát.]"),
 ("**Nghiên cứu tài liệu** xác định nguyên lý MOX, điều kiện bảo quản và các nghiên cứu mũi điện tử trên trái cây (nguồn ở Chương 1). ", ""),
]:
    s = s.replace(a, b)

i = s.index("[CẦN SỐ LIỆU: bổ sung tài liệu về quả hô hấp đột biến;"); j = s.index("## PHỤ LỤC", i)
s = s[:i] + "[CẦN SỐ LIỆU: thêm tài liệu về quả hô hấp đột biến, datasheet Figaro và SHT31, điều kiện bảo quản, mũi điện tử trái cây; thay [2], [3], [4], [6] bằng số chính thức.]\n\n" + s[j:]
for a, b in [
 ("Về khoa học, đề tài trình bày quy trình thu chuỗi thời gian từ mảng MOX giá thấp trong buồng mát và so sánh ba tình trạng quả. Về thực tiễn, đề tài tạo nguyên mẫu có giá phù hợp khả năng chi của các HTX được khảo sát. Nhóm không khẳng định đóng góp nào khác khi chưa có kiểm chứng ngoài hiện trường.",
  "Về khoa học, đề tài trình bày quy trình thu chuỗi thời gian từ mảng MOX giá thấp trong buồng mát và so sánh ba tình trạng quả; về thực tiễn, đề tài tạo nguyên mẫu có giá phù hợp khả năng chi của các HTX được khảo sát. Chưa có kiểm chứng ngoài hiện trường nên nhóm không khẳng định đóng góp nào khác."),
 ("**CH2.** Nhãn mức đỏ xuất hiện sớm hơn lúc thấy vết thối 26,3 ± 6,4 giờ (18,5–35,5 giờ, 6 chuỗi) với cảnh báo giả 6,2 % (62/1.000); kết luận này cần xác nhận cột Model_Red_Alert là dự đoán của mô hình.", "**CH2.** Nhãn mức đỏ sớm hơn lúc thấy vết thối 26,3 ± 6,4 giờ (18,5–35,5 giờ, 6 chuỗi), cảnh báo giả 6,2 % (62/1.000); cần xác nhận Model_Red_Alert là dự đoán của mô hình."),
 (" Độ ổn định ở độ ẩm trên 90 % chưa có số đo riêng, vì nhật ký pin không kèm nhiệt độ, độ ẩm.", " Độ ổn định ở độ ẩm trên 90 % chưa có số đo riêng."),
]:
    assert a in s, a[:40]; s = s.replace(a, b)

# --- bỏ Hình 4.1 (biểu đồ khảo sát, số liệu đã có trong văn bản) để đủ 15 trang, rồi đánh số lại ---
i = s.index("![Hình 4.1]"); j = s.index("Trong 18 đơn vị, 15 (83,3 %)")
s = s[:i] + s[j:]
s = s.replace("| 18 đơn vị | Hình 4.1 |", "| 18 đơn vị | Mục 4.1 |")
for a, b in (("Hình 4.2", "Hình 4.1"), ("Hình 4.3", "Hình 4.2"), ("Hình 4.4", "Hình 4.3")):
    s = s.replace(a, b)
s = s.replace("figures/hinh_4_3_tin_hieu.png", "figures/hinh_4_3_tin_hieu.png")

s = s.replace("[HÌNH 4.2 –", "[HÌNH 4.1 –")
s = s.replace("- **C.** Ảnh nguyên mẫu và buồng thí nghiệm có chú thích. [CẦN DỮ LIỆU ĐO]\n- **D.** Giấy xác nhận dùng thử tại kho, nếu có. [CẦN XÁC NHẬN]", "- **C, D.** Ảnh nguyên mẫu và buồng thí nghiệm có chú thích [CẦN DỮ LIỆU ĐO]; giấy xác nhận dùng thử tại kho, nếu có [CẦN XÁC NHẬN].")
s = s.replace(" Quy mô kho từ 50 đến 250 tấn (trung vị 102,5 tấn), trong đó 2 kho vượt 200 tấn; 12 đơn vị bảo quản cả xoài và chuối.", " Quy mô kho 50–250 tấn (trung vị 102,5 tấn).")

s = s.replace("Gói bán 22 triệu đồng, lãi gộp 8,6 triệu (39,1 %), thấp hơn mua lẻ (7,5 triệu cho Hub và 8 × 1,95 triệu cho Node = 23,1 triệu) khoảng 4,8 %.", "Gói bán 22 triệu đồng (lãi gộp 8,6 triệu, 39,1 %), thấp hơn mua lẻ 23,1 triệu khoảng 4,8 %.")

import re as _re
NL = chr(10) * 2
s = _re.sub(r"\*\[HÌNH 3\.1 – CẦN VẼ:.*?\]\*", "![Hình 3.1](figures/hinh_3_1_quy_trinh.png)" + NL + "*Hình 3.1. Sơ đồ quy trình nghiên cứu. Nguồn: Nhóm tác giả.*", s)
s = _re.sub(r"\*\[HÌNH 4\.1 – CẦN VẼ:.*?\]\*", "![Hình 4.1](figures/hinh_4_1_so_do_khoi.png)" + NL + "*Hình 4.1. Sơ đồ khối hệ thống. Nguồn: Nhóm tác giả.*", s)
s = s.replace(" (4.1 chưa vẽ)", "")

for a, b in [
 (" Khoảng tin cậy Wilson 95 % của ba tỉ lệ là 60,8–94,2 %, 54,8–91,0 % và 49,1–87,5 %, nên chỉ đọc như chiều hướng.", " Khoảng tin cậy Wilson 95 % rất rộng (từ 49,1 % đến 94,2 %), nên chỉ đọc như chiều hướng."),
 ("; nhóm chưa nên ghi \"rẻ hơn 6–8 lần\" khi chưa có báo giá thiết bị đối chiếu.", "."),
 (" [CẦN XÁC NHẬN: nhiệt độ khi đo pin (pin lithium sắt phot-phat mất dung lượng khi lạnh), khoảng cách và vật cản giữa Node và Hub; nhật ký chỉ có một Node, khác thời điểm thí nghiệm quả.]", " [CẦN XÁC NHẬN: nhiệt độ khi đo pin, khoảng cách Node–Hub; nhật ký chỉ có một Node, khác thời điểm thí nghiệm quả.]"),
]:
    assert a in s, a[:30]; s = s.replace(a, b)

s = s.replace(" (PhuLucA_KhaoSat_18DonVi.csv; dùng mã HTX_01…KHO_06, không nêu tên; biểu đồ figures/hinh_4_1_khao_sat.png)", " (mã HTX_01…KHO_06, không nêu tên; PhuLucA_KhaoSat_18DonVi.csv)")
s = s.replace(" Hai lý do cuối (4 đơn vị) đòi hỏi chứng minh Node chịu ẩm và truyền được qua vách kho, điều thí nghiệm chưa kiểm chứng.", " Hai lý do cuối (4 đơn vị) đòi hỏi chứng minh Node chịu ẩm và truyền qua vách kho, chưa được kiểm chứng.")

_i = s.index("Ba cơ chế xử lý kho mát:"); _j = s.index("Hub phân loại từng phân khu:", _i)
s = s[:_i] + "Màng PTFE chống đọng sương, bù trôi nhiệt ẩm và chu kỳ đo 30 phút xử lý điều kiện kho mát. " + s[_j:]
_i = s.index(" [CẦN XÁC NHẬN: ngưỡng từng loại quả theo cố vấn VIAEP;"); _j = s.index("]", _i)
s = s[:_i] + " [CẦN XÁC NHẬN: ngưỡng nhiệt từng loại quả với cố vấn VIAEP.]" + s[_j + 1:]

s = s.replace("Gói bán 22 triệu đồng (lãi gộp 8,6 triệu, 39,1 %), thấp hơn mua lẻ 23,1 triệu khoảng 4,8 %.", "Giá bán gói là 22 triệu đồng (lãi gộp 39,1 %).")
s = s.replace(" Các lỗi nằm ở vùng chuyển tiếp mềm giữa hai trạng thái.", "")

for a, b in [
 (" [CẦN XÁC NHẬN: giống xoài và chuối, độ chín ban đầu, khối lượng mỗi buồng, giá trị đặt của buồng; các đợt 1–2 và 2–3 chồng nhau 5 ngày với cùng mã buồng trong khi chỉ có 3 Node: cần ghi số buồng và số Node thực tế.]", " [CẦN XÁC NHẬN: giống, độ chín ban đầu, khối lượng mỗi buồng; các đợt chồng nhau 5 ngày với cùng mã buồng trong khi chỉ có 3 Node: ghi số buồng, số Node thực tế.]"),
 (", để tránh các mẫu liền kề trong cùng một chuỗi rơi vào cả hai tập. Tập kiểm tra chỉ gồm 3 chuỗi và ba đợt dùng cùng mã buồng nên chưa độc lập về thiết bị.", ", để các mẫu liền kề trong một chuỗi không rơi vào cả hai tập; tập kiểm tra chỉ có 3 chuỗi và dùng chung mã buồng với hai đợt kia nên chưa độc lập về thiết bị."),
 ("Nhiệt độ và độ ẩm đo bằng SHT31 là 12,15 ± 0,84 °C và 89,1 ± 2,2 % (lành lặn), 12,45 ± 0,81 °C và 88,3 ± 2,2 % (gây xước), 11,95 ± 0,84 °C và 89,9 ± 2,2 % (nhiễm nấm); các nhóm chênh nhau tới 0,5 °C và 1,6 % RH.", "Nhiệt độ, độ ẩm đo bằng SHT31: 12,15 ± 0,84 °C, 89,1 ± 2,2 % (lành lặn); 12,45 ± 0,81 °C, 88,3 ± 2,2 % (gây xước); 11,95 ± 0,84 °C, 89,9 ± 2,2 % (nhiễm nấm), chênh nhau tới 0,5 °C và 1,6 % RH."),
]:
    assert a in s, a[:30]; s = s.replace(a, b)

for a, b in [
 (" Thiết bị đo khí chính xác thì đắt hoặc đo thủ công theo điểm.", ""),
 ("Kho mát 20–200 tấn của HTX chỉ phát hiện sọt hỏng khi mắt và mũi nhận ra, tức sau khi lên men đã lan sang sọt kế cận, còn thiết bị nhiệt ẩm không phản ánh thay đổi này. Vấn đề nghiên cứu là:", "Vấn đề nghiên cứu là:"),
 ("[CẦN DỮ LIỆU ĐO: lỗi, nguyên nhân, cách sửa và số đo trước, sau của v1, v2; chưa có file dữ liệu cho phần này. Trình bày thành bảng 5 cột khi có.]", "[CẦN DỮ LIỆU ĐO: lỗi, nguyên nhân, cách sửa, số đo trước và sau của v1, v2.]"),
 (" So với giải pháp hiện có, nguyên mẫu khác ở chi phí và việc giám sát liên tục kết hợp tín hiệu khí, nhưng mới thử trong phòng thí nghiệm và chưa kiểm chứng việc chỉ ra phân khu.", " So với Bảng 1.1, nguyên mẫu khác ở chi phí và giám sát liên tục kết hợp tín hiệu khí, nhưng mới thử trong phòng thí nghiệm."),
]:
    if a in s or a in open("bao-cao_ban-gon.md",encoding="utf8").read(): pass
for a, b in [
 (" Thiết bị đo khí chính xác thì đắt hoặc đo thủ công theo điểm.", ""),
 ("Kho mát 20–200 tấn của HTX chỉ phát hiện sọt hỏng khi mắt và mũi nhận ra, tức sau khi lên men đã lan sang sọt kế cận, còn thiết bị nhiệt ẩm không phản ánh thay đổi này. Vấn đề nghiên cứu là:", "Vấn đề nghiên cứu là:"),
 ("[CẦN DỮ LIỆU ĐO: lỗi, nguyên nhân, cách sửa và số đo trước, sau của v1, v2; chưa có file dữ liệu cho phần này. Trình bày thành bảng 5 cột khi có.]", "[CẦN DỮ LIỆU ĐO: lỗi, nguyên nhân, cách sửa, số đo trước và sau của v1, v2.]"),
 (" So với giải pháp hiện có, nguyên mẫu khác ở chi phí và việc giám sát liên tục kết hợp tín hiệu khí, nhưng mới thử trong phòng thí nghiệm và chưa kiểm chứng việc chỉ ra phân khu.", " So với Bảng 1.1, nguyên mẫu khác ở chi phí và giám sát liên tục kết hợp tín hiệu khí, nhưng mới thử trong phòng thí nghiệm."),
]:
    s = s.replace(a, b)

_i = s.index("8. [CẦN KIỂM] Phát hiện thán thư chuối"); _j = s.index("[CẦN SỐ LIỆU: thêm tài liệu", _i)
s = s[:_i] + "8. Maksum, M., Putra, Y. K., Chairuddin, C., Gunawan, H. (2025). Volatile compound detection of banana anthracnose caused by *Colletotrichum musae* using electronic nose. *Jurnal Agrikultura*, 36(3), 479–486. https://doi.org/10.24198/agrikultura.v36i3.63320" + NL + "9. Khalid, N. S., Abdullah, A. H., và cộng sự (2018). Detection of *Colletotrichum gloeosporioides* fungus isolates development/spread for mango (*Mangifera indica* L.) cultivar from electronic nose using multivariate-statistical analysis. *J. Telecommunication, Electronic and Computer Engineering*, 10(1–6), 171–175. https://jtec.utem.edu.my/jtec/article/view/3687" + NL + NL + s[_j:]
s = s.replace("[CẦN KIỂM: mở toàn văn [8], [9] để ghi tác giả, DOI, điều kiện thí nghiệm.]", "[CẦN KIỂM: điều kiện đo (nhiệt độ, độ ẩm) của [8], [9].]")
_t = "**Bảng 4.2. Các phiên bản nguyên mẫu.** [CẦN DỮ LIỆU ĐO: lỗi, nguyên nhân, cách sửa, số đo trước và sau của v1, v2.]"
NL1 = chr(10)
_new = ("**Bảng 4.2. Các phiên bản nguyên mẫu**" + NL1 + NL1 +
 "| Bản | Lỗi | Nguyên nhân | Cách sửa | Số đo trước → sau |" + NL1 + "|---|---|---|---|---|" + NL1 +
 "| v1 | Pin cạn trong chưa đầy 1 ngày; tín hiệu trôi, chập chờn khi độ ẩm trên 90 % | Sấy cảm biến liên tục; hơi nước đọng trên bề mặt cảm biến | Đo ngắt quãng 30 phút (sấy 120 s, đọc 30 s, ngủ sâu); màng PTFE ở cửa lấy khí | Sau sửa: pin 23,5 ngày (Bảng 4.5). [CẦN DỮ LIỆU ĐO: số đo v1 (nhóm ghi 16,6 giờ, 325 mA) và độ ổn định tín hiệu] |" + NL1 +
 "| v2 | Cảnh báo đỏ giả theo chu kỳ | Chu kỳ xả đá làm nhiệt độ, độ ẩm buồng tăng đột ngột, TGS822 sụt giả [CẦN XÁC NHẬN] | Đưa nhiệt độ, độ ẩm của SHT31 vào đặc trưng đầu vào | [CẦN DỮ LIỆU ĐO: cảnh báo giả trước và sau (nhóm ghi 18,4 % → 6,2 %)] |" + NL1 + NL1 + "*Nguồn: Nhóm tác giả.*")
assert _t in s; s = s.replace(_t, _new)

for a, b in [
 (" Khi chín sinh lý TGS2602 giảm nhiều hơn TGS822 (0,868 → 0,661 so với 0,910 → 0,826), còn khi lên men cả hai cùng xuống quanh 0,3; điều này phù hợp với việc TGS822 nhạy hơn với ethanol, nhưng là suy luận chưa đối chiếu bằng phép đo ethanol.", " Khi chín sinh lý chủ yếu TGS2602 giảm (0,868 → 0,661), còn khi lên men cả hai cùng xuống quanh 0,3; điều này phù hợp với việc TGS822 nhạy hơn với ethanol, nhưng là suy luận chưa có phép đo ethanol."),
 (" Có 47/1.128 lần truyền (4,2 %) phải gửi lại và đều thành công; RSSI từ −91,3 đến −83,3 dBm.", " Có 47/1.128 lần truyền (4,2 %) phải gửi lại và đều thành công."),
 ("5. **Quả hỏng gây nhân tạo** (xước, cấy nấm), khác hư hỏng tự nhiên ở kho; cảm biến MOX chọn lọc thấp, phụ thuộc nhiệt ẩm, có trôi tín hiệu [7], chưa đối chiếu sắc ký khí." + chr(10) + "6. **Pin, khảo sát, chi phí.** Nhật ký pin chỉ một Node và chưa ghi nhiệt độ; khảo sát n = 18 mẫu thuận tiện; chi phí chưa có báo giá; chưa có kết quả thực địa.", "5. **Giới hạn khác.** Quả hỏng gây nhân tạo, khác hư hỏng tự nhiên; cảm biến MOX chọn lọc thấp, phụ thuộc nhiệt ẩm [7], chưa đối chiếu sắc ký khí; nhật ký pin một Node, chưa ghi nhiệt độ; khảo sát n = 18 mẫu thuận tiện; chi phí chưa có báo giá; chưa có kết quả thực địa."),
 (" (hạn chế 6).", " (hạn chế 5)."),
 (" Quy mô kho 50–250 tấn (trung vị 102,5 tấn).", ""),
 ("14 (77,8 %) từng thiệt hại do lây lan (10/12 HTX, 4/6 kho mát)", "14 (77,8 %) từng thiệt hại do lây lan"),
]:
    s = s.replace(a, b.replace("\n", chr(10)) if False else b)

_i = s.index("![Hình 4.3](figures/hinh_4_4_som.png)"); _j = s.index("Trong 6 chuỗi có vết thối")
s = s[:_i] + s[_j:]
s = s.replace("(18,5–35,5 giờ): nhóm nhiễm nấm 22,2 ± 4,4 giờ, nhóm gây xước 30,5 ± 5,6 giờ (mỗi nhóm n = 3)", "(18,5–35,5 giờ; từng chuỗi: nhiễm nấm 18,5, 21,0, 27,0 giờ; gây xước 24,5, 31,5, 35,5 giờ cho đợt 1, 2, 3)")
s = s.replace("Hình: 3.1, 4.1–4.3.", "Hình: 3.1, 4.1–4.2.")

for a, b in [("| Chương 5. Kết luận khoa học | 12 |", "| Chương 5. Kết luận khoa học | 13 |"), ("| Tài liệu tham khảo | 13 |", "| Tài liệu tham khảo | 15 |"), ("| Phụ lục | 14 |", "| Phụ lục | 15 |")]:
    assert a in s, a; s = s.replace(a, b)

# --- tích hợp khối bổ sung: bỏ nguồn báo chí, thêm tài liệu đã kiểm, sửa các số lệch dữ liệu ---
N1 = chr(10); N2 = N1 * 2
_i = s.index("Ở Việt Nam, kim ngạch xuất khẩu rau quả"); _j = s.index("Ở cấp địa phương", _i)
s = s[:_i] + "Ở Việt Nam, tổn thất trong thu hoạch và sau thu hoạch của trái cây ước khoảng 25 % khối lượng, chưa kể tổn thất về chất lượng [5]. [CẦN SỐ LIỆU: kim ngạch xuất khẩu rau quả, xoài, chuối năm 2024–2025 – Tổng cục Thống kê, Tổng cục Hải quan hoặc Bộ Nông nghiệp và Môi trường; các nguồn báo chí đã bỏ.]" + N2 + s[_j:]
# đánh số lại trích dẫn theo thứ tự xuất hiện: 5->2, 7->3, 8->6, 9->7 (4, 5 là datasheet Figaro, 8 Sensirion, 9 Jawad thêm sau)
_k = s.index("## TÀI LIỆU THAM KHẢO"); _body, _tail = s[:_k], s[_k:]
for _a, _b in (("[5]", "[§2]"), ("[7]", "[§3]"), ("[8]", "[§6]"), ("[9]", "[§7]")):
    _body = _body.replace(_a, _b)
_body = _body.replace("[§", "[")
_body = _body.replace("[CẦN KIỂM: datasheet Figaro]", "[4], [5]")
_body = _body.replace(" [CẦN KIỂM: độ chính xác SHT31 theo datasheet]", "; thông số SHT31 theo nhà sản xuất [8]")
_body = _body.replace("xử lý điều kiện kho mát. ", "xử lý điều kiện kho mát; đo ngắt quãng là biện pháp tiết kiệm năng lượng thường gặp ở nút cảm biến không dây nông nghiệp [9]. ")
_i = _tail.index("1. FAO"); _j = _tail.index("## PHỤ LỤC")
_refs = [
 "1. FAO (2025). *SDG 12.3.1 – Global food losses (Food Loss Index)*. https://www.fao.org/sustainable-development-goals-data-portal/data/indicators/1231-global-food-losses (truy cập 05/11/2026). [CẦN KIỂM: năm cập nhật]",
 "2. Lê Thị Bích Phượng, Tô Nguyễn Phước Mai, Nguyễn Văn Ây, Nguyễn Văn Mười (2021). Ứng dụng công nghệ tiên tiến để kéo dài thời gian bảo quản trái cây. *Tạp chí Khoa học Trường Đại học Cần Thơ*, 57 (Công nghệ thực phẩm), 32–47. https://doi.org/10.22144/ctu.jsi.2021.004 [CẦN KIỂM: dấu tên tác giả]",
 "3. Berna, A. (2010). Metal oxide sensors for electronic noses and their application to food analysis. *Sensors*, 10(4), 3882–3910. https://doi.org/10.3390/s100403882",
 "4. Figaro Engineering Inc. *TGS2602 – Gas sensor for air contaminants* (datasheet). [CẦN KIỂM: phiên bản, năm, URL]",
 "5. Figaro Engineering Inc. *TGS822 – Gas sensor for alcohol and organic solvents* (datasheet). [CẦN KIỂM: phiên bản, năm, URL]",
 "6. Maksum, M., Putra, Y. K., Chairuddin, C., Gunawan, H. (2026). Volatile compound detection of banana anthracnose caused by *Colletotrichum musae* using electronic nose. *Agrikultura*, 36(3), 479–486. https://doi.org/10.24198/agrikultura.v36i3.63320",
 "7. Khalid, N. S., Abdullah, A. H., và cộng sự (2018). Detection of *Colletotrichum gloeosporioides* fungus isolates development/spread for mango (*Mangifera indica* L.) cultivar from electronic nose using multivariate-statistical analysis. *J. Telecommunication, Electronic and Computer Engineering*, 10(1–6), 171–175. https://jtec.utem.edu.my/jtec/article/view/3687",
 "8. Sensirion AG. *SHT3x-DIS – Digital humidity and temperature sensor* (datasheet). [CẦN KIỂM: phiên bản, năm, URL]",
 "9. Jawad, H. M., và cộng sự (2017). Energy-efficient wireless sensor networks for precision agriculture: a review. *Sensors*, 17(8), 1781. https://doi.org/10.3390/s17081781",
]
_tail = _tail[:_i] + N1.join(_refs) + N2 + "[CẦN SỐ LIỆU: thêm tài liệu về quả hô hấp đột biến, điều kiện bảo quản xoài, chuối và số liệu chính thức về xuất khẩu rau quả.]" + N2 + _tail[_j:]
s = _body + _tail
# Bảng 4.2: bỏ các số không có trong dữ liệu, ghi số suy ra từ dữ liệu thô
for _a, _b in (
 ("[CẦN DỮ LIỆU ĐO: số đo v1 (nhóm ghi 16,6 giờ, 325 mA) và độ ổn định tín hiệu]", "[CẦN DỮ LIỆU ĐO: số đo v1 và độ ổn định tín hiệu; tính theo thiết kế 6.000 mAh / 325 mA ≈ 18,5 giờ]"),
 ("[CẦN DỮ LIỆU ĐO: cảnh báo giả trước và sau (nhóm ghi 18,4 % → 6,2 %)]", "[CẦN DỮ LIỆU ĐO: cảnh báo giả trước và sau khi bù nhiệt ẩm]"),
 ("Chu kỳ xả đá làm nhiệt độ, độ ẩm buồng tăng đột ngột, TGS822 sụt giả [CẦN XÁC NHẬN]", "Nhiệt độ vọt lên tới 14,6 °C, độ ẩm tới 97,5 % (520/4.500 mẫu có nhiệt độ ≥ 13,8 °C), nghi do xả đá, làm R<sub>s</sub>/R<sub>0</sub> sụt giả [CẦN XÁC NHẬN: nhật ký xả đá]")):
    assert _a in s, _a[:30]; s = s.replace(_a, _b)
# quy tắc gán nhãn của nhóm, kèm chỗ chưa khớp dữ liệu
_i = s.index("[CẦN XÁC NHẬN: danh sách đặc trưng đầu vào"); _j = s.index("]", _i)
s = s[:_i] + "Nhãn gán theo điều kiện thí nghiệm và diễn biến quan sát: lớp 0 (an toàn) là quả nguyên vẹn, còn xanh; lớp 1 (chín sinh lý) là quả chín tự nhiên ở buồng đối chứng; lớp 2 (nguy cơ lên men) là quả ở buồng gây xước hoặc cấy nấm từ khi mô bắt đầu hoại tử yếm khí đến khi vết thối lộ rõ. [CẦN XÁC NHẬN: quy tắc này chưa khớp dữ liệu, vì buồng gây xước và nhiễm nấm có 1.160 mẫu lớp 0 và 132 mẫu lớp 1 (giai đoạn đầu); cần ghi mốc thời gian gán nhãn và đặc trưng đầu vào." + s[_j:]
_i = s.index("[CẦN XÁC NHẬN: mã huấn luyện và dự đoán từng mẫu;"); _j = s.index("]", _i)
s = s[:_i] + "[CẦN XÁC NHẬN: mã huấn luyện, ngưỡng và dự đoán từng mẫu. Chạy lại cùng siêu tham số trên bốn đặc trưng cho 90,9 % ở ngưỡng mặc định (4 mẫu lên men bị gọi là an toàn, cảnh báo giả 0,2 %); hạ ngưỡng cảnh báo đỏ xuống 0,05 vẫn chưa tái lập ma trận trên (4 mẫu lên men không vào mức đỏ, cảnh báo giả 2,3 %)." + s[_j:]

# rút gọn cho đủ 15 trang
for _a, _b in (
 ("[CẦN SỐ LIỆU: kim ngạch xuất khẩu rau quả, xoài, chuối năm 2024–2025 – Tổng cục Thống kê, Tổng cục Hải quan hoặc Bộ Nông nghiệp và Môi trường; các nguồn báo chí đã bỏ.]", "[CẦN SỐ LIỆU: kim ngạch xuất khẩu rau quả, xoài, chuối 2024–2025 – Tổng cục Thống kê, Hải quan hoặc Bộ NN&MT.]"),
 ("[CẦN KIỂM: điều kiện đo (nhiệt độ, độ ẩm) của [6], [7].]", "[CẦN KIỂM: điều kiện đo của [6], [7].]"),
 (" Nhãn gán theo điều kiện thí nghiệm và diễn biến quan sát: lớp 0 (an toàn) là quả nguyên vẹn, còn xanh; lớp 1 (chín sinh lý) là quả chín tự nhiên ở buồng đối chứng; lớp 2 (nguy cơ lên men) là quả ở buồng gây xước hoặc cấy nấm từ khi mô bắt đầu hoại tử yếm khí đến khi vết thối lộ rõ.", " Nhãn: lớp 0 (an toàn) là quả nguyên vẹn, còn xanh; lớp 1 (chín sinh lý) là quả chín tự nhiên ở buồng đối chứng; lớp 2 (nguy cơ lên men) là quả ở buồng gây xước hoặc cấy nấm từ khi mô bắt đầu hoại tử yếm khí đến khi vết thối lộ rõ."),
 ("[CẦN XÁC NHẬN: quy tắc này chưa khớp dữ liệu, vì buồng gây xước và nhiễm nấm có 1.160 mẫu lớp 0 và 132 mẫu lớp 1 (giai đoạn đầu); cần ghi mốc thời gian gán nhãn và đặc trưng đầu vào.", "[CẦN XÁC NHẬN: quy tắc chưa khớp dữ liệu (buồng gây xước, nhiễm nấm có 1.160 mẫu lớp 0 và 132 mẫu lớp 1 ở giai đoạn đầu); ghi mốc gán nhãn và đặc trưng đầu vào."),
 ("*Nguồn: Nhóm tác giả tổng hợp; chưa có nguồn kiểm chứng cho các ô [CẦN SỐ LIỆU].*", "*Nguồn: Nhóm tác giả tổng hợp.*"),
):
    if _a in s: s = s.replace(_a, _b)
    else: print("khong tim thay:", _a[:40])

for _a, _b in (
 (" Tuy nhiên 392 trong 524 mẫu chín sinh lý (74,8 %) đến từ chính buồng đối chứng, nên lớp này khó tách khỏi đặc điểm buồng, nhất là khi nhiệt độ và độ ẩm giữa các buồng lệch nhau.", ""),
 ("(1.312/1.500; khoảng tin cậy Wilson 95 % là 85,7–89,0 % nếu coi các mẫu độc lập, thực tế rộng hơn vì tập kiểm tra chỉ có 3 chuỗi liên tục)", "(1.312/1.500; khoảng tin cậy 95 % là 85,7–89,0 % nếu coi mẫu độc lập, thực tế rộng hơn)"),
 ("2. **Lớp chín sinh lý yếu và lẫn với buồng.** Độ nhạy 45,0 %, và 75 % mẫu của lớp này đến từ buồng đối chứng,", "2. **Lớp chín sinh lý yếu và lẫn với buồng.** Độ nhạy 45,0 %; 392 trong 524 mẫu lớp này (74,8 %) đến từ buồng đối chứng,"),
 (" [CẦN SỐ LIỆU: thời gian, hình thức khảo sát; ẩn tên đơn vị, chỉ dùng mã HTX_01…KHO_06.]", " [CẦN SỐ LIỆU: thời gian, hình thức khảo sát; ẩn tên đơn vị, dùng mã HTX_01…KHO_06.]"),
):
    if _a in s: s = s.replace(_a, _b)
    else: print("khong tim thay:", _a[:40])

s = s.replace("[CẦN KIỂM: phiên bản, năm, URL]", "[CẦN KIỂM: phiên bản, năm]")
s = s.replace("[CẦN SỐ LIỆU: thêm tài liệu về quả hô hấp đột biến, điều kiện bảo quản xoài, chuối và số liệu chính thức về xuất khẩu rau quả.]", "[CẦN SỐ LIỆU: thêm tài liệu về quả hô hấp đột biến, bảo quản xoài, chuối.]")

# --- tích hợp số liệu mới: dự đoán từng mẫu, nhật ký pin có nhiệt ẩm, số đo v1 v2, nguồn chính thức (đã đối chiếu CSV và trang gốc) ---
# (a) thêm nguồn chính thức [2] (Bộ Công Thương), dồn các số sau lên 1; bỏ trích dẫn trong Tóm tắt
_k = s.index("## TÀI LIỆU THAM KHẢO"); _body, _tail = s[:_k], s[_k:]
for _n in range(9, 1, -1):
    _body = _body.replace("[%d]" % _n, "[§%d]" % (_n + 1))
_body = _body.replace("[§", "[")
_i = _body.index("## TÓM TẮT DỰ ÁN"); _j = _body.index("**Từ khóa:**", _i)
_body = _body[:_i] + _body[_i:_j].replace(" [1]", "").replace(" [3]", "") + _body[_j:]
_i = _body.index("Ở Việt Nam, tổn thất trong thu hoạch"); _j = _body.index("Ở cấp địa phương", _i)
_body = _body[:_i] + "Ở Việt Nam, kim ngạch xuất khẩu rau quả năm 2024 ước đạt khoảng 7,12 tỷ USD, tăng 27,1 % so với năm 2023 [2], trong khi tổn thất trong thu hoạch và sau thu hoạch của trái cây ước khoảng 25 % khối lượng, chưa kể tổn thất về chất lượng [3]. [CẦN SỐ LIỆU: xuất khẩu và sản lượng riêng của xoài, chuối – Tổng cục Thống kê, Hải quan.]" + N2 + _body[_j:]
_i = _tail.index("1. FAO"); _j = _tail.index("[CẦN SỐ LIỆU: thêm tài liệu", _i)
_old = _tail[_i:_j].split(N1)
_new = [_old[0],
 "2. Cục Xuất nhập khẩu, Bộ Công Thương (30/12/2024). *Bản tin Thị trường nông, lâm, thủy sản – số tổng kết quý IV/2024*. https://moit.gov.vn/upload/2005517/fck/files/B___n_tin_Th____tr_____ng_NLTS_T___ng_h___p_qu___VI_ra_ng__y_30_12_2024_9b5fe.pdf (truy cập 06/11/2026)."]
for _l in _old[1:]:
    if _l.strip():
        _m = _l.split(". ", 1); _new.append(str(int(_m[0]) + 1) + ". " + _m[1])
_tail = _tail[:_i] + N1.join(_new) + N2 + _tail[_j:]
s = _body + _tail
# (b) quy tắc gán nhãn và mốc thời gian (đã đối chiếu dữ liệu thô)
_i = s.index(" Nhãn: lớp 0 (an toàn)"); _j = s.index("]", s.index("[CẦN XÁC NHẬN: quy tắc chưa khớp", _i))
s = s[:_i] + " Mọi chuỗi bắt đầu ở lớp 0. Ở buồng gây xước và cấy nấm, quả còn nguyên trong giai đoạn ủ bệnh nên vẫn lớp 0 (1.160 mẫu) rồi lớp 1 (132 mẫu), sang lớp 2 từ giờ 120, 136, 130 (gây xước) và 72, 68, 120 (nhiễm nấm) của đợt 1, 2, 3; buồng đối chứng sang lớp 1 từ giờ 182, 182, 190 và không có lớp 2. Lớp 1 chiếm 14,7 % đợt 3 so với 10,1 % hai đợt huấn luyện. [CẦN XÁC NHẬN: tiêu chí quan sát đặt các mốc này; đặc trưng đầu vào." + s[_j:]
# (c) Δt: có dự đoán từng mẫu của đợt 3
_i = s.index("Cột Model_Red_Alert trong dữ liệu thô"); _j = s.index("]", s.index("[CẦN XÁC NHẬN: nếu cột này", _i))
s = s[:_i] + "Cột Model_Red_Alert trong dữ liệu thô trùng từng mẫu với nhãn lớp 2, nên 26,3 ± 6,4 giờ là thời gian từ lúc bắt đầu mức lên men đến lúc thấy vết thối. Với đợt 3, tập kiểm tra có dự đoán từng mẫu (PhuLucB_Test_Predictions_1500samples.csv), mức đỏ của mô hình duy trì từ 6 mẫu liên tiếp (3 giờ) trở lên bắt đầu ở giờ 129,5 (gây xước) và 119,5 (nhiễm nấm), tức Δt = 36,0 và 27,5 giờ; đợt 1 và 2 là dữ liệu huấn luyện nên chỉ có nhãn. Nếu lấy lần đầu mô hình dự đoán lớp 2 thì cảnh báo hiện từ giờ 28,5 và 14,0, vì cảnh báo giả là các mẫu đơn lẻ (62 mẫu, không có đợt báo đỏ liên tiếp nào ở buồng đối chứng), nên cần quy tắc xác nhận liên tiếp. [CẦN XÁC NHẬN: số mẫu liên tiếp nhóm chọn" + s[_j:]
# (d) pin: nhiệt độ, độ ẩm môi trường và dòng từng pha
s = s.replace(" Có 47/1.128 lần truyền (4,2 %) phải gửi lại và đều thành công. [CẦN XÁC NHẬN: nhiệt độ khi đo pin, khoảng cách Node–Hub; nhật ký chỉ có một Node, khác thời điểm thí nghiệm quả.]", " Nhiệt độ và độ ẩm kho trong nhật ký là 12,05 ± 0,51 °C (tối đa 14,5 °C) và 88,6 ± 1,7 % (tối đa 97,0 %). Có 47/1.128 lần truyền (4,2 %) phải gửi lại và đều thành công. Dòng đo từng pha do nhóm ghi (ngủ sâu 18,4 µA, sấy 117,2 mA, đo và truyền 101,5 mA) cho 4,76 mAh mỗi chu kỳ, khớp 4,77 mAh của nhật ký. [CẦN XÁC NHẬN: file đo dòng; nhật ký chỉ có một Node, khác thời điểm thí nghiệm quả.]")
s = s.replace("Đạt nếu ngưỡng ngắt là 20 %; chưa rõ nhiệt độ đo |", "Đạt nếu ngưỡng ngắt là 20 %; đo ở 12,05 ± 0,51 °C |")
# (e) Bảng 4.2: số đo v1, v2 do nhóm cung cấp
_i = s.index("Sau sửa: pin 23,5 ngày (Bảng 4.5)."); _j = s.index("|", _i)
s = s[:_i] + "Pin 18,4 ± 0,2 giờ (3 mạch, 325 ± 8 mA) → 23,5 ngày (Bảng 4.5); đọng sương sau 4,2–4,8 giờ, R<sub>0</sub> từ khoảng 45 kΩ xuống dưới 6 kΩ. [CẦN XÁC NHẬN: file nhật ký v1]" + s[_j - 1:]
_i = s.index("[CẦN DỮ LIỆU ĐO: cảnh báo giả trước và sau khi bù nhiệt ẩm]"); _j = _i + len("[CẦN DỮ LIỆU ĐO: cảnh báo giả trước và sau khi bù nhiệt ẩm]")
s = s[:_i] + "Sau bù: cảnh báo giả 6,2 %, không tập trung ở mẫu nóng (8/120 so với 54/880). [CẦN DỮ LIỆU ĐO: tỉ lệ trước khi bù]" + s[_j:]
# (f) hạn chế 3 và phụ lục
_i = s.index("3. **Δt dựa trên một cột"); _j = s.index(N1, _i)
s = s[:_i] + "3. **Δt chủ yếu từ nhãn.** Cột Model_Red_Alert trùng nhãn lớp 2; chỉ đợt 3 có dự đoán thật (2 chuỗi), và đợt 3 có nhiều mẫu lớp 1 hơn hai đợt huấn luyện (14,7 % so với 10,1 %)." + s[_j:]
s = s.replace("ma trận nhầm lẫn, nhật ký pin", "ma trận nhầm lẫn, dự đoán 1.500 mẫu đợt 3, nhật ký pin")

for _a, _b in (
 (" Lớp 1 chiếm 14,7 % đợt 3 so với 10,1 % hai đợt huấn luyện.", ""),
 ("Nhiệt độ, độ ẩm đo bằng SHT31: 12,15 ± 0,84 °C, 89,1 ± 2,2 % (lành lặn); 12,45 ± 0,81 °C, 88,3 ± 2,2 % (gây xước); 11,95 ± 0,84 °C, 89,9 ± 2,2 % (nhiễm nấm), chênh nhau tới 0,5 °C và 1,6 % RH.", "Nhiệt độ và độ ẩm (SHT31) trung bình theo nhóm từ 11,95 đến 12,45 °C và từ 88,3 đến 89,9 %, chênh nhau tới 0,5 °C và 1,6 % RH."),
):
    if _a in s: s = s.replace(_a, _b)
    else: print("khong tim thay:", _a[:40])

# số đo v1, v2 lấy từ PhuLucB_NhatKy_DoKiem_v1.csv, _v2.csv (đã tính lại từ file; các số trong khối dán lệch nhẹ nên dùng số file)
for _a, _b in (
 ("tín hiệu trôi, chập chờn khi độ ẩm trên 90 %", "tín hiệu giảm đột ngột khi độ ẩm khoảng 88 %"),
 ("Pin 18,4 ± 0,2 giờ (3 mạch, 325 ± 8 mA) → 23,5 ngày (Bảng 4.5); đọng sương sau 4,2–4,8 giờ, R<sub>0</sub> từ khoảng 45 kΩ xuống dưới 6 kΩ. [CẦN XÁC NHẬN: file nhật ký v1]", "Pin cạn ở giờ 18,0–19,0 (3 mạch; dòng sấy 325 mA, tổng 343 mA) → 23,5 ngày (Bảng 4.5); đọng sương từ giờ 5,5–7,0: R<sub>s</sub> TGS2602 từ 46–48 kΩ xuống 4–6 kΩ"),
 ("Dòng đo từng pha do nhóm ghi (ngủ sâu 18,4 µA, sấy 117,2 mA, đo và truyền 101,5 mA) cho 4,76 mAh mỗi chu kỳ, khớp 4,77 mAh của nhật ký. [CẦN XÁC NHẬN: file đo dòng; nhật ký chỉ có một Node, khác thời điểm thí nghiệm quả.]", "Nhật ký v2 (36 chu kỳ, 3 mạch) cho dòng 18,6 µA khi ngủ sâu, 117,6 mA khi sấy, 101,6 mA khi đo, tổng 4,77 mAh mỗi chu kỳ, khớp nhật ký 1.128 chu kỳ; màng PTFE khô ở cả 108 dòng, kể cả khi nhiệt độ lên 14,1 °C và độ ẩm 95,2 %. [CẦN XÁC NHẬN: nhật ký pin chỉ một Node, khác thời điểm thí nghiệm quả.]"),
 ("[CẦN XÁC NHẬN: tiêu chí quan sát đặt các mốc này; đặc trưng đầu vào", "Tiêu chí hình thái nhóm ghi: độ chín theo thang màu và độ cứng quả, vết úng nước, đốm thán thư từ 5 mm làm mốc thấy vết thối. [CẦN XÁC NHẬN: biên bản quan sát (nhóm nói ghi mỗi 12 giờ, nhưng mốc trong dữ liệu có độ phân giải 0,5 giờ, ví dụ giờ 182 và 190); đặc trưng đầu vào"),
 (" (4 file PhuLucB_*.csv)", ", nhật ký đo v1, v2 (các file PhuLucB_*.csv)"),
):
    if _a in s: s = s.replace(_a, _b)
    else: print("khong tim thay:", _a[:50])

_a = " Nhiệt độ và độ ẩm (SHT31) trung bình theo nhóm từ 11,95 đến 12,45 °C và từ 88,3 đến 89,9 %, chênh nhau tới 0,5 °C và 1,6 % RH."
if _a in s: s = s.replace(_a, _a + " Nhiễu đo giữa các buồng không tương quan (hệ số tương quan của sai phân liên tiếp từ −0,08 đến 0,08).")
else: print("khong tim thay: nhiet do")

# số liệu địa phương đã mở trang gốc: chuối Phú Thọ (Sở NN&MT qua Báo Phú Thọ), xoài Yên Châu (TTXVN/VietnamPlus); thêm làm [4], [5]
_k = s.index("## TÀI LIỆU THAM KHẢO"); _body, _tail = s[:_k], s[_k:]
for _n in range(10, 3, -1):
    _body = _body.replace("[%d]" % _n, "[§%d]" % (_n + 2))
_body = _body.replace("[§", "[")
_a = "[CẦN SỐ LIỆU: sản lượng xoài, chuối và số kho mát tại Phú Thọ, Vĩnh Phúc – Niên giám thống kê tỉnh.]"
if _a in _body:
    _body = _body.replace(_a, "Theo Sở Nông nghiệp và Môi trường Phú Thọ, toàn tỉnh có 6.500 ha chuối, sản lượng 162.000 tấn (năm số liệu không nêu) [4]; ở Sơn La, huyện Yên Châu có hơn 3.200 ha xoài, sản lượng năm 2024 ước gần 15.000 tấn [5]. [CẦN KIỂM: thay bằng niên giám thống kê; số liệu Yên Châu khác nhau giữa các bài báo.]")
else: print("khong tim thay: so lieu dia phuong")
_i = _tail.index("4. "); _j = _tail.index("[CẦN SỐ LIỆU: thêm tài liệu", _i)
_old = [_l for _l in _tail[_i:_j].split(N1) if _l.strip()]
_new = ["4. Bùi Minh. Phú Thọ có 2.800ha chuối sản xuất theo tiêu chuẩn an toàn (số liệu của Sở Nông nghiệp và Môi trường Phú Thọ). *Báo Phú Thọ*. https://baophutho.vn/phu-tho-co-2-800ha-chuoi-san-xuat-theo-tieu-chuan-an-toan-258789.htm (truy cập 06/11/2026). [CẦN KIỂM: ngày đăng]",
 "5. Quang Quyết (08/06/2024). Sơn La: Quảng bá thương hiệu xoài Yên Châu với nhiều hoạt động hấp dẫn. *VietnamPlus (TTXVN)*. https://www.vietnamplus.vn/son-la-quang-ba-thuong-hieu-xoai-yen-chau-voi-nhieu-hoat-dong-hap-dan-post958098.vnp (truy cập 06/11/2026)."]
for _l in _old:
    _m = _l.split(". ", 1); _new.append(str(int(_m[0]) + 2) + ". " + _m[1])
_tail = _tail[:_i] + N1.join(_new) + N2 + _tail[_j:]
s = _body + _tail
# quy trình quan sát hai tầng (nhóm mô tả; ảnh time-lapse chưa có file)
_i = s.index("Tiêu chí hình thái nhóm ghi:"); _j = s.index("]", s.index("[CẦN XÁC NHẬN: biên bản quan sát", _i))
s = s[:_i] + "Quan sát hai tầng: nghiên cứu viên kiểm tra quả và đo độ cứng mỗi 12 giờ (8:00 và 20:00); camera time-lapse trong mỗi buồng chụp mỗi 30 phút, đồng bộ với Node. Khi ca kiểm tra thấy vết thối, nhóm rà lại ảnh 12 giờ trước để lấy khung hình đầu tiên có vết từ 1 mm làm mốc Visual_Rot_Status = 1, nên mốc có độ phân giải 0,5 giờ. [CẦN XÁC NHẬN: ảnh time-lapse và biên bản kiểm tra; đặc trưng đầu vào" + s[_j:]
_a = "Cột Model_Red_Alert trong dữ liệu thô trùng"
if _a in s: s = s.replace(_a, "Mốc thấy vết thối là khung ảnh time-lapse đầu tiên có vết từ 1 mm; ca kiểm tra trực tiếp kế tiếp muộn hơn 0,5–11,5 giờ (suy ra từ giờ ghi nhận). " + _a, 1)
else: print("khong tim thay: Model_Red_Alert")

for _a, _b in (
 (" [CẦN KIỂM: thay bằng niên giám thống kê; số liệu Yên Châu khác nhau giữa các bài báo.]", " [CẦN KIỂM: thay bằng niên giám thống kê.]"),
 (" mỗi 12 giờ (8:00 và 20:00); camera time-lapse trong mỗi buồng chụp mỗi 30 phút, đồng bộ với Node.", " mỗi 12 giờ; camera time-lapse trong mỗi buồng chụp mỗi 30 phút."),
 (" (số liệu của Sở Nông nghiệp và Môi trường Phú Thọ). *Báo Phú Thọ*.", ". *Báo Phú Thọ*."),
 (" [CẦN KIỂM: ngày đăng]", ""),
):
    if _a in s: s = s.replace(_a, _b)
    else: print("khong tim thay:", _a[:40])

_i = s.index("### 5.3. Hướng phát triển"); _j = s.index("## TÀI LIỆU THAM KHẢO")
s = s[:_i] + "### 5.3. Hướng phát triển" + N2 + "Chạy thêm đợt với buồng và Node độc lập, đổi vị trí điều kiện giữa các buồng (hạn chế 1, 2); lưu dự đoán từng mẫu để tính Δt thật (hạn chế 2, 3); đặt nhiều Node trong một buồng nhiều dãy kệ (hạn chế 4); đối chiếu bằng đo ethylene hoặc sắc ký khí và thử tại 2 kho, đo pin kèm nhiệt độ (hạn chế 5)." + N2 + s[_j:]

for _a, _b in (
 (" [CẦN SỐ LIỆU: xuất khẩu và sản lượng riêng của xoài, chuối – Tổng cục Thống kê, Hải quan.]", " [CẦN SỐ LIỆU: xuất khẩu xoài, chuối – Hải quan.]"),
 ("- **C, D.** Ảnh nguyên mẫu và buồng thí nghiệm có chú thích [CẦN DỮ LIỆU ĐO]; giấy xác nhận dùng thử tại kho, nếu có [CẦN XÁC NHẬN].", "- **C, D.** Ảnh nguyên mẫu, buồng thí nghiệm, ảnh time-lapse [CẦN DỮ LIỆU ĐO]; giấy xác nhận dùng thử [CẦN XÁC NHẬN]."),
):
    if _a in s: s = s.replace(_a, _b)
    else: print("khong tim thay:", _a[:40])

for _a, _b in (
 ("- **C, D.** Ảnh nguyên mẫu, buồng thí nghiệm, ảnh time-lapse [CẦN DỮ LIỆU ĐO]; giấy xác nhận dùng thử [CẦN XÁC NHẬN].", "- **C, D.** Ảnh nguyên mẫu, time-lapse [CẦN DỮ LIỆU ĐO]; giấy xác nhận [CẦN XÁC NHẬN]."),
 ("A.** Phiếu và kết quả khảo sát 18 đơn vị (mã HTX_01…KHO_06, không nêu tên; PhuLucA_KhaoSat_18DonVi.csv)", "A.** Khảo sát 18 đơn vị (mã HTX_01…KHO_06; PhuLucA_KhaoSat_18DonVi.csv)"),
):
    if _a in s: s = s.replace(_a, _b)
    else: print("khong tim thay:", _a[:40])

_i = s.index("- **B.** Số liệu:"); _j = s.index(N1, _i)
s = s[:_i] + "- **B.** Số liệu thô, dự đoán đợt 3, nhật ký pin, nhật ký đo v1, v2 (các file PhuLucB_*.csv); mã phan_tich_so_lieu.py." + s[_j:]
s = s.replace("- **C, D.** Ảnh nguyên mẫu, time-lapse [CẦN DỮ LIỆU ĐO]; giấy xác nhận [CẦN XÁC NHẬN].", "- **C, D.** Ảnh nguyên mẫu, time-lapse, giấy xác nhận [CẦN DỮ LIỆU ĐO].")

# bỏ Hình 4.2 (đường tín hiệu) khỏi thân bài theo yêu cầu; tệp figures/hinh_4_3_tin_hieu.png vẫn giữ
_i = s.index("![Hình 4.2](figures/hinh_4_3_tin_hieu.png)"); _j = s.index("Ở nhóm nhiễm nấm, TGS2602 giảm")
s = s[:_i] + s[_j:]
s = s.replace("Hình 4.2 cho thấy nhóm nhiễm nấm giảm sau khoảng 70 giờ, nhóm gây xước sau khoảng 120 giờ; dải ± SD rộng quanh giờ 70–150 do thời điểm khởi phát khác nhau giữa các đợt, không phải nhiễu đo.", "Nhãn lên men xuất hiện từ giờ 68–120 ở nhóm nhiễm nấm và giờ 120–136 ở nhóm gây xước.")

# số trang trong mục lục theo bản dựng LibreOffice (Tóm tắt nằm cùng trang với mục lục)
for _name, _pg in (("Tóm tắt dự án", 2), ("Chương 1. Lý do chọn dự án", 3), ("Chương 2. Đặt vấn đề nghiên cứu", 4), ("Chương 3. Thiết kế và phương pháp nghiên cứu", 6), ("Chương 4. Kết quả nghiên cứu", 8), ("Chương 5. Kết luận khoa học", 13), ("Tài liệu tham khảo", 14), ("Phụ lục", 15)):
    s = _re.sub(r"(\| " + _re.escape(_name) + r" \| )\d+( \|)", lambda m, p=_pg: m.group(1) + str(p) + m.group(2), s, count=1)

# 9. Mục lục: danh mục hình
s = s.replace("Hình: 3.1, 4.1–4.4.", "Hình: 3.1, 4.1–4.2.").replace("Hình: 3.1, 4.1–4.2.", "Hình: 3.1, 4.1.")
open(os.path.join(HERE, "bao-cao_ban-so-lieu.md"), "w", encoding="utf8").write(s)
print("ok", len(s.split()))
