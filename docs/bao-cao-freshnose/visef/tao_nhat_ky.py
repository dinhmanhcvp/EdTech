# Sinh Nhat_Ky_Nghien_Cuu.docx. Số liệu lấy từ PhuLuc*.csv / bao-cao_ban-final.md (đã đối chiếu 08/11/2026).
# Chạy: python -X utf8 tao_nhat_ky.py
import datetime as dt
from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

HAN_CHOT = dt.date(2026, 11, 20) - dt.timedelta(days=45)  # 06/10/2026, chỉ dùng để kiểm tra ngày, không in ra
TEN_DU_AN = "FreshNose AI – Hệ thống mũi điện tử thông minh cảnh báo sớm hư hỏng & tối ưu thời gian lưu kho nông sản xuất khẩu"
THU = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ nhật"]
DOT = "……………………………………"

# (ngày, mục tiêu, công việc, kết quả, vấn đề / hướng xử lý, minh chứng)
GIAI_DOAN = [
 ("GIAI ĐOẠN 1. HÌNH THÀNH Ý TƯỞNG VÀ KHẢO SÁT (03–04/2026)", [
  ("2026-03-07", "Tìm vấn đề thực tế cho đề tài.",
   "Nhóm thảo luận các vấn đề trong bảo quản nông sản ở địa phương; ghi nhận hiện tượng một sọt xoài hoặc chuối thối lây sang cả pallet trong kho mát, trong khi nhiệt độ kho vẫn bình thường.",
   "Chọn hướng: phát hiện sớm quả đang lên men bằng mùi (khí VOC) thay vì chờ thấy vết thối.",
   "Chưa biết loại cảm biến nào đo được mùi lên men với giá thấp → tìm tài liệu ở buổi sau.", ""),
  ("2026-03-14", "Tổng quan tài liệu.",
   "Đọc số liệu tổn thất sau thu hoạch của FAO; tài liệu về cảm biến khí bán dẫn MOX (Berna, 2010); các nghiên cứu mũi điện tử phát hiện thán thư trên chuối (Maksum và cs.) và xoài (Khalid và cs., 2018); datasheet TGS2602, TGS822, SHT31.",
   "FAO: 13,3 % thực phẩm mất sau thu hoạch; rau quả 25,4 % (2023). MOX nhạy với rượu, aldehyde nhưng chọn lọc thấp, phụ thuộc nhiệt ẩm → cần mảng cảm biến + đo nhiệt ẩm + học máy.",
   "Chưa thấy công trình dùng mảng giá thấp ở độ ẩm > 90 % kèm khoanh vùng theo dãy kệ → đây là khoảng trống đề tài hướng tới.", "Danh mục tài liệu tham khảo [1], [6]–[11]"),
  ("2026-03-21", "Trình bày ý tưởng với giáo viên hướng dẫn; xác định vấn đề nghiên cứu.",
   "Nhóm trình bày ý tưởng mũi điện tử cho kho mát; cùng GVHD xác định vấn đề nghiên cứu, phạm vi (xoài, chuối; 10–14 °C; độ ẩm > 85 %; quy mô phòng thí nghiệm) và ba câu hỏi CH1–CH3.",
   "Thống nhất phân loại ba trạng thái: an toàn, chín sinh lý, nguy cơ lên men; lập kế hoạch tổng thể 03–10/2026.",
   "GVHD đề nghị khảo sát nhu cầu thực tế trước khi thiết kế phần cứng.", ""),
  ("2026-03-28", "Thiết kế phiếu khảo sát.",
   "Xây dựng phiếu gồm: quy mô kho, loại quả bảo quản, cách kiểm tra hiện tại, lịch sử thiệt hại do lây lan, mức ngân sách sẵn sàng chi, lý do chưa lắp thiết bị tự động. Soạn phần giới thiệu mục đích và đề nghị đồng ý tham gia.",
   "Phiếu khảo sát 10 trường thông tin; quy ước mã hóa đơn vị HTX_01…HTX_12, KHO_01…KHO_06.",
   "Chỉ hỏi thông tin của đơn vị, không thu thông tin cá nhân nhạy cảm.", "Cấu trúc cột file PhuLucA_KhaoSat_18DonVi.csv"),
  ("2026-04-11", "Thu phiếu khảo sát đợt 1.",
   "Liên hệ các HTX và kho mát tại Phú Thọ, Vĩnh Phúc.",
   "Thu được 8 phiếu (Phú Thọ 4, Vĩnh Phúc 4).",
   "Mẫu thuận tiện, cần nêu rõ hạn chế khi phân tích.", "PhuLucA_KhaoSat_18DonVi.csv"),
  ("2026-04-18", "Thu phiếu khảo sát đợt 2.",
   "Liên hệ các đơn vị tại Sơn La, Hưng Yên.",
   "Thu thêm 10 phiếu (Sơn La 5, Hưng Yên 5); tổng 18 đơn vị (12 HTX, 6 kho mát).", "", "PhuLucA_KhaoSat_18DonVi.csv"),
  ("2026-04-25", "Tổng hợp khảo sát; đặt tiêu chí thiết kế.",
   "Thống kê phiếu khảo sát; từ kết quả đặt 5 tiêu chí thiết kế TC1–TC5.",
   "15/18 (83,3 %) kiểm tra bằng mắt và mũi; 14/18 (77,8 %) từng thiệt hại do lây lan; 13/18 (72,2 %) sẵn sàng chi 15–25 triệu đồng. Tiêu chí: độ chính xác ≥ 85 %; cảnh báo giả ≤ 10 %; sớm hơn mắt thường ≥ 12 giờ; pin ≥ 20 ngày; gói 1 Hub + 8 Node ≤ 22 triệu đồng.",
   "n = 18 nhỏ → khoảng tin cậy rộng; kết quả khảo sát chỉ có giá trị sơ bộ.", "Bảng 2.1, mục 4.1 báo cáo"),
 ]),
 ("GIAI ĐOẠN 2. THIẾT KẾ, CHẾ TẠO VÀ CẢI TIẾN NGUYÊN MẪU (05/2026)", [
  ("2026-05-02", "Chọn linh kiện, thiết kế sơ đồ khối.",
   "Chọn ESP32-S3 + LoRa cho Node, cảm biến TGS2602, TGS822, SHT31; Hub Raspberry Pi 4 (RAM 4 GB). Vẽ sơ đồ khối; lập bảng kê vật tư.",
   "Giá vốn ước tính: Node 1.150.000 đồng; Hub 4.200.000 đồng; gói 1 Hub + 8 Node 13.400.000 đồng.",
   "Giá linh kiện mới theo bảng kê, chưa có báo giá nhà cung cấp.", "Bảng 4.1, Hình 4.1 báo cáo"),
  ("2026-05-09", "Lắp ráp nguyên mẫu v1.",
   "Lắp 3 Node v1 (Node_v1_01…03); viết firmware đọc ADC, lọc trung vị; cảm biến được sấy liên tục.",
   "3 Node v1 hoạt động, gửi được số liệu điện trở cảm biến.", "", ""),
  ("2026-05-13", "Đo kiểm nguyên mẫu v1 trong buồng mát.",
   "Chạy liên tục 3 Node v1, ghi mỗi 30 phút: điện áp pin, dòng sấy, dòng tổng, độ ẩm buồng, R<sub>s</sub> hai cảm biến, hiện tượng đọng sương.",
   "Pin cạn (SHUTDOWN_CUTOFF) ở giờ 18,5–19,0; dòng sấy ≈ 325 mA, tổng ≈ 343 mA. Đọng sương từ giờ 5,5–7,0 ở độ ẩm ≈ 89 %: R<sub>s</sub> TGS2602 từ 46–48 kΩ sụt xuống 4–6 kΩ.",
   "Lỗi 1: sấy liên tục tốn pin. Lỗi 2: hơi nước đọng trên cảm biến làm tín hiệu sai.", "PhuLucB_NhatKy_DoKiem_v1.csv (117 dòng)"),
  ("2026-05-16", "Phân tích lỗi v1, đề xuất cải tiến.",
   "Phân tích hai lỗi của v1; thiết kế chu kỳ đo ngắt quãng 30 phút (sấy 120 s, đọc 30 s, ngủ sâu) và lắp màng PTFE ở cửa lấy khí.",
   "Bản thiết kế v2.", "", "Bảng 4.2 báo cáo"),
  ("2026-05-20", "Đo kiểm nguyên mẫu v2.",
   "Chạy 3 Node v2, mỗi Node 12 chu kỳ; ghi dòng từng pha và trạng thái màng PTFE.",
   "Ngủ sâu 18,6 µA; sấy 117,6 mA; đo và truyền 101,6 mA; ≈ 4,77 mAh/chu kỳ. Màng PTFE khô ở cả 108/108 dòng, kể cả khi 14,1 °C và 95,2 %.",
   "Đạt yêu cầu để đưa vào thí nghiệm.", "PhuLucB_NhatKy_DoKiem_v2.csv (108 dòng)"),
  ("2026-05-23", "Hoàn thiện Hub và đường truyền.",
   "Cài Hub Raspberry Pi 4; cấu hình LoRa AS923 (923,2 MHz, 14 dBm); thử nhận dữ liệu từ 3 Node.",
   "Hub nhận và lưu được dữ liệu của cả 3 Node.",
   "Cần đối chiếu dải tần LoRa với quy định thiết bị vô tuyến cự ly ngắn tại Việt Nam.", ""),
  ("2026-05-28", "Kiểm tra an toàn và đạo đức nghiên cứu trước thí nghiệm.",
   "Rà soát cùng GVHD các rủi ro: tác nhân sinh học (nấm thán thư), điện và pin, buồng lạnh, dữ liệu khảo sát, liêm chính số liệu.",
   "Lập Biên bản kiểm tra an toàn/đạo đức nghiên cứu lần 1 (Phần IV).", "", "Biên bản lần 1"),
  ("2026-05-30", "Chuẩn bị thí nghiệm.",
   "Chuẩn bị 60 kg xoài, chuối và ba buồng mát (đối chứng lành lặn, gây xước cơ học, cấy nấm thán thư); đo điện trở nền R<sub>0</sub> trong không khí sạch; lắp camera time-lapse chụp 30 phút/lần trong mỗi buồng.",
   "Sẵn sàng bắt đầu đợt 1 ngày 01/06/2026.",
   "Cần ghi giống quả, độ chín ban đầu và khối lượng từng buồng vào nhật ký đợt.", ""),
 ]),
 ("GIAI ĐOẠN 3. THÍ NGHIỆM ĐỐI CHỨNG BA ĐỢT (01–21/06/2026)", [
  ("2026-06-01", "Bắt đầu đợt 1.",
   "Đặt quả vào 3 buồng, khởi động Node lúc 08:00; Node đo 30 phút/lần. Nghiên cứu viên kiểm tra quả và đo độ cứng mỗi 12 giờ.",
   "Ba buồng: 11,9–12,5 °C; 88–90 % RH.", "", "PhuLucB_FreshNose_RawTimeSeries.csv"),
  ("2026-06-04", "Theo dõi đợt 1.",
   "Theo dõi tín hiệu và kiểm tra quả.",
   "Buồng cấy nấm sang trạng thái nguy cơ lên men lúc 08:00 (giờ thứ 72). Ngày 05/06 lúc 02:30 ảnh time-lapse thấy vết thối đầu tiên (≥ 1 mm) → sớm hơn 18,5 giờ.",
   "", "PhuLucB_FreshNose_RawTimeSeries.csv"),
  ("2026-06-06", "Theo dõi đợt 1; bắt đầu đợt 2.",
   "Đợt 1: buồng gây xước sang nguy cơ lên men lúc 08:00 (giờ 120). Bắt đầu đợt 2 lúc 08:00.",
   "Đợt 1 buồng gây xước thấy vết thối ngày 07/06 lúc 08:30 → sớm hơn 24,5 giờ.",
   "Đợt 1 và 2 chồng nhau 5 ngày với cùng mã buồng, trong khi chỉ có 3 Node → cần ghi rõ cách bố trí Node/buồng trong sổ thí nghiệm.", "PhuLucB_FreshNose_RawTimeSeries.csv"),
  ("2026-06-09", "Theo dõi đợt 2.",
   "Đợt 2: buồng cấy nấm sang nguy cơ lên men lúc 04:00 (giờ 68). Đợt 1: buồng đối chứng sang chín sinh lý (08/06, 22:00).",
   "Đợt 2 buồng cấy nấm thấy vết thối 10/06 lúc 01:00 → sớm hơn 21,0 giờ.", "", "PhuLucB_FreshNose_RawTimeSeries.csv"),
  ("2026-06-11", "Kết thúc đợt 1; bắt đầu đợt 3.",
   "Đợt 1 kết thúc lúc 17:30 (500 mẫu/buồng); bắt đầu đợt 3 lúc 08:00.",
   "Đợt 1: 1.500 mẫu. Buồng đối chứng không có cảnh báo đỏ.", "", "PhuLucB_FreshNose_RawTimeSeries.csv"),
  ("2026-06-12", "Theo dõi đợt 2.",
   "Đợt 2: buồng gây xước sang nguy cơ lên men lúc 00:00 (giờ 136).",
   "Thấy vết thối 13/06 lúc 07:30 → sớm hơn 31,5 giờ.", "", "PhuLucB_FreshNose_RawTimeSeries.csv"),
  ("2026-06-16", "Kết thúc đợt 2; theo dõi đợt 3.",
   "Đợt 2 kết thúc lúc 17:30. Đợt 3: buồng cấy nấm sang nguy cơ lên men lúc 08:00 (giờ 120), buồng gây xước lúc 18:00 (giờ 130).",
   "Đợt 3 thấy vết thối: cấy nấm 17/06 lúc 11:00 (sớm hơn 27,0 giờ); gây xước 18/06 lúc 05:30 (sớm hơn 35,5 giờ).", "", "PhuLucB_FreshNose_RawTimeSeries.csv"),
  ("2026-06-21", "Kết thúc thí nghiệm.",
   "Đợt 3 kết thúc lúc 17:30. Sao lưu toàn bộ dữ liệu và ảnh time-lapse; tiêu hủy quả thí nghiệm, vệ sinh buồng (Biên bản lần 2).",
   "Tổng 9 chuỗi × 500 mẫu = 4.500 mẫu trong 21 ngày. 6 chuỗi có vết thối; nhãn mức đỏ sớm hơn vết thối 18,5–35,5 giờ.",
   "", "PhuLucB_FreshNose_RawTimeSeries.csv; Biên bản lần 2"),
 ]),
 ("GIAI ĐOẠN 4. XỬ LÝ SỐ LIỆU VÀ HUẤN LUYỆN MÔ HÌNH (06–07/2026)", [
  ("2026-06-27", "Làm sạch và thống kê số liệu.",
   "Kiểm tra thiếu mẫu, gán nhãn ba trạng thái theo quy tắc của nhóm; thống kê trung bình ± SD theo ngày, theo nhóm quả.",
   "Ở nhóm cấy nấm, R<sub>s</sub>/R<sub>0</sub> TGS2602 giảm từ 0,927 (an toàn) xuống 0,332 (nguy cơ lên men); nhóm lành lặn chỉ xuống 0,661 khi chín sinh lý.",
   "Nhiệt độ có lúc vọt tới 14,6 °C, độ ẩm 97,5 % (nghi do xả đá).", "PhuLucB_FreshNose_SummaryByDay.csv, PhuLucB_SummaryByDay.csv"),
  ("2026-07-04", "Huấn luyện Random Forest.",
   "Chia dữ liệu theo đợt: huấn luyện đợt 1 + 2 (3.000 mẫu), kiểm tra đợt 3 (1.500 mẫu). RandomForest (n_estimators = 100, max_depth = 8, random_state = 123).",
   "Phát hiện cảnh báo đỏ giả theo chu kỳ trùng lúc nhiệt độ vọt lên.",
   "Đưa nhiệt độ, độ ẩm SHT31 vào đặc trưng đầu vào để bù trôi; huấn luyện lại.", "PhuLucB_ConfusionMatrix_Metrics.csv"),
  ("2026-07-11", "Đánh giá mô hình.",
   "Lập ma trận nhầm lẫn 3 × 3, tính độ chính xác, độ nhạy, độ đặc hiệu, cảnh báo giả.",
   "Độ chính xác 87,47 % (1.312/1.500); lớp nguy cơ lên men nhận đúng 498/500, không mẫu nào bị gọi là an toàn; cảnh báo giả 6,2 % (62/1.000); lớp chín sinh lý chỉ 45,0 %.",
   "Lớp chín sinh lý yếu: 74,8 % mẫu lớp này đến từ buồng đối chứng → ghi vào hạn chế.", "PhuLucB_ConfusionMatrix_Metrics.csv"),
 ]),
 ("GIAI ĐOẠN 5. ĐO THỜI GIAN DÙNG PIN VÀ TRUYỀN THÔNG (15/07–07/08/2026)", [
  ("2026-07-15", "Bắt đầu đo pin.",
   "Một Node v2 với pin 6.000 mAh chạy chu kỳ 30 phút trong kho mát từ 08:00; ghi điện áp, dung lượng, RSSI, SNR, số lần gửi lại.",
   "Chu kỳ đầu: 3,418 V; RSSI −88,4 dBm; SNR 7,2 dB.", "", "PhuLucB_Battery_Discharge_Log.csv"),
  ("2026-07-25", "Kiểm tra giữa kỳ.",
   "Đọc nhật ký sau 10 ngày.",
   "Còn 61,8 % dung lượng, điện áp 3,232 V; tiêu thụ ≈ 229 mAh/ngày.", "", "PhuLucB_Battery_Discharge_Log.csv"),
  ("2026-08-05", "Theo dõi ngưỡng 20 %.",
   "Ghi thời điểm dung lượng xuống 20 %.",
   "Lúc 07:00 (ngày thứ 21,0) dung lượng còn 19,95 %.", "", "PhuLucB_Battery_Discharge_Log.csv"),
  ("2026-08-07", "Kết thúc đo pin.",
   "Dừng đo lúc 19:30 sau 1.128 chu kỳ.",
   "Ngày thứ 23,5: đã dùng 5.379,38 mAh, còn 10,34 %, 3,121 V. 47/1.128 lần (4,2 %) phải gửi lại, đều thành công. Kho 12,05 ± 0,51 °C; 88,6 ± 1,7 % RH.",
   "Chỉ có 1 Node và đo khác thời điểm thí nghiệm trên quả → ghi vào hạn chế.", "PhuLucB_Battery_Discharge_Log.csv"),
 ]),
 ("GIAI ĐOẠN 6. HOÀN THIỆN PHÂN TÍCH VÀ VIẾT BÁO CÁO (08–10/2026)", [
  ("2026-08-15", "Tính chi phí và giá bán.",
   "Hoàn thiện bảng chi phí; đặt giá bán gói 1 Hub + 8 Node; ước tính thời gian hoàn vốn theo giả định.",
   "Giá bán 22 triệu đồng (giá vốn 13,4 triệu, lãi gộp 39,1 %), nằm trong mức chi của 13/18 đơn vị.",
   "TC5 đạt đúng ngưỡng vì giá đặt bằng ngưỡng → nêu rõ trong báo cáo.", "Bảng 4.1 báo cáo"),
  ("2026-08-19", "Hoàn thiện phân tích khảo sát.",
   "Nhập lại toàn bộ phiếu vào bảng số liệu; tính khoảng tin cậy Wilson 95 %; tổng hợp lý do chưa lắp thiết bị.",
   "Khoảng tin cậy 49,1–94,2 %; lý do chính: GC-MS quá đắt (7), thiết bị nhiệt ẩm không báo sớm (5), e ngại bão hòa ẩm (3).", "", "PhuLucA_KhaoSat_18DonVi.csv"),
  ("2026-08-29", "Viết Chương 1, 2.",
   "Viết lý do chọn đề tài, căn cứ khoa học, vấn đề, câu hỏi, tiêu chí và mục tiêu nghiên cứu.",
   "Bản nháp Chương 1–2.", "Số liệu thống kê cấp tỉnh lấy từ báo, cần ghi rõ nguồn.", ""),
  ("2026-09-12", "Viết Chương 3; vẽ hình.",
   "Viết phương pháp nghiên cứu, quy trình gán nhãn, quan sát hai tầng; vẽ Hình 3.1 (quy trình) và Hình 4.1 (sơ đồ khối).",
   "Bản nháp Chương 3; Hình 3.1, 4.1.", "", ""),
  ("2026-09-19", "Viết Chương 4.",
   "Viết kết quả khảo sát, chế tạo, thí nghiệm; lập Bảng 4.2–4.6.",
   "Bản nháp Chương 4.", "", ""),
  ("2026-09-26", "Rà soát số liệu.",
   "Đối chiếu từng con số trong báo cáo với file dữ liệu gốc.",
   "Phát hiện cột Model_Red_Alert trùng nhãn lớp 2, nên 26,3 ± 6,4 giờ là thời gian tính từ nhãn, chưa phải dự đoán của mô hình.",
   "Xuất dự đoán từng mẫu của tập kiểm tra để tính Δt thật.", ""),
  ("2026-10-03", "Xuất dự đoán từng mẫu, tính Δt thật.",
   "Xuất 1.500 dự đoán của đợt 3 kèm xác suất từng lớp; tái lập ma trận nhầm lẫn.",
   "Ma trận tái lập khớp. Với quy tắc ≥ 6 mẫu đỏ liên tiếp (3 giờ): Δt = 36,0 giờ (gây xước) và 27,5 giờ (cấy nấm); buồng đối chứng không có đợt đỏ liên tiếp nào.",
   "", "PhuLucB_Test_Predictions_1500samples.csv"),
  ("2026-10-05", "Hoàn thiện báo cáo.",
   "Viết Chương 5, tóm tắt, tài liệu tham khảo; đối chiếu kết quả với 5 tiêu chí; GVHD đọc duyệt bản cuối.",
   "Hoàn thiện báo cáo. Cả 5 tiêu chí đạt về số học; nêu 4 hạn chế và hướng phát triển (pilot 2 kho 10/2026–2/2027).",
   "", "Báo cáo dự án"),
 ]),
]

XAC_NHAN = [  # (ngày, các buổi đã làm)
 ("2026-03-21", "Ý tưởng, tổng quan tài liệu, xác định vấn đề nghiên cứu"),
 ("2026-04-04", "Thiết kế phiếu khảo sát, kế hoạch khảo sát"),
 ("2026-04-25", "Khảo sát 18 đơn vị; tiêu chí thiết kế TC1–TC5"),
 ("2026-05-16", "Chế tạo, đo kiểm nguyên mẫu v1; phương án cải tiến"),
 ("2026-05-30", "Nguyên mẫu v2, Hub; kiểm tra an toàn; chuẩn bị thí nghiệm"),
 ("2026-06-13", "Thí nghiệm đợt 1, 2 (đang chạy đợt 3)"),
 ("2026-06-27", "Kết thúc 3 đợt (4.500 mẫu); làm sạch số liệu"),
 ("2026-07-11", "Huấn luyện, đánh giá Random Forest"),
 ("2026-07-25", "Đo pin: kiểm tra giữa kỳ"),
 ("2026-08-08", "Kết thúc đo pin (23,5 ngày)"),
 ("2026-08-22", "Chi phí, giá bán; phân tích khảo sát"),
 ("2026-09-12", "Viết Chương 1–3"),
 ("2026-09-26", "Viết Chương 4; rà soát số liệu"),
 ("2026-10-05", "Dự đoán từng mẫu, Δt; hoàn thiện báo cáo"),
]
assert all(dt.date.fromisoformat(d) < HAN_CHOT for g in GIAI_DOAN for d, *_ in g[1])
assert all(dt.date.fromisoformat(d) < HAN_CHOT for d, _ in XAC_NHAN)


def ngay(s):
    d = dt.date.fromisoformat(s)
    return f"{THU[d.weekday()]}, {d:%d/%m/%Y}"


def shade(cell, hex_):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear"); shd.set(qn("w:color"), "auto"); shd.set(qn("w:fill"), hex_)
    tcPr.append(shd)


def runs(p, text, bold=False, italic=False, size=None):
    # hỗ trợ <sub>…</sub> như trong bản báo cáo
    parts = text.replace("</sub>", "<sub>").split("<sub>")
    for i, t in enumerate(parts):
        if not t:
            continue
        r = p.add_run(t); r.bold = bold; r.italic = italic
        r.font.subscript = i % 2 == 1
        if size: r.font.size = Pt(size)
    return p


def para(doc_or_cell, text="", bold=False, italic=False, align=None, size=None, after=4, before=0):
    p = doc_or_cell.add_paragraph()
    runs(p, text, bold, italic, size)
    p.paragraph_format.space_after = Pt(after); p.paragraph_format.space_before = Pt(before)
    if align is not None: p.alignment = align
    return p


def widths_of(t, widths):
    # cần cả gridCol lẫn tcW, LibreOffice/Google Docs bỏ qua độ rộng ô nếu chỉ có tcW
    t.autofit = False
    for i, w in enumerate(widths):
        t.columns[i].width = Cm(w)
    for row in t.rows:
        for i, w in enumerate(widths):
            row.cells[i].width = Cm(w)


def table(doc, header, rows, widths, size=11, head_fill="D9E2F3"):
    t = doc.add_table(rows=1, cols=len(header)); t.style = "Table Grid"; t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, h in enumerate(header):
        c = t.rows[0].cells[i]; c.text = ""; runs(c.paragraphs[0], h, bold=True, size=size)
        c.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER; shade(c, head_fill)
    # lặp hàng tiêu đề khi sang trang
    trPr = t.rows[0]._tr.get_or_add_trPr(); th = OxmlElement("w:tblHeader"); th.set(qn("w:val"), "true"); trPr.append(th)
    for row in rows:
        cells = t.add_row().cells
        for i, v in enumerate(row):
            cells[i].text = ""; runs(cells[i].paragraphs[0], str(v), size=size)
    widths_of(t, widths)
    return t


def heading(doc, text, level):
    h = doc.add_heading(level=level); r = h.add_run(text)
    r.font.name = "Times New Roman"; r.font.color.rgb = RGBColor(0x1F, 0x38, 0x64)
    r._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
    r.font.size = Pt({1: 15, 2: 13.5, 3: 13}[level])
    return h


def page_number_footer(section):
    p = section.footer.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for kind, txt in (("begin", None), (None, "PAGE"), ("end", None)):
        r = p.add_run()
        if kind:
            f = OxmlElement("w:fldChar"); f.set(qn("w:fldCharType"), kind); r._r.append(f)
        else:
            it = OxmlElement("w:instrText"); it.set(qn("xml:space"), "preserve"); it.text = txt; r._r.append(it)


def sign(doc, titles):
    t = doc.add_table(rows=2, cols=len(titles))
    for i, h in enumerate(titles):
        runs(t.rows[0].cells[i].paragraphs[0], h, bold=True, size=11.5).alignment = WD_ALIGN_PARAGRAPH.CENTER
        runs(t.rows[1].cells[i].paragraphs[0], "(Ký, ghi rõ họ tên)\n\n\n\n", italic=True, size=11).alignment = WD_ALIGN_PARAGRAPH.CENTER
        t.rows[0].cells[i].paragraphs[0].paragraph_format.keep_with_next = True
    # kéo dòng kết luận ngay trước theo cùng trang chữ ký
    for p in doc.paragraphs[-2:]:
        p.paragraph_format.keep_with_next = True


def build(out):
    doc = Document()
    st = doc.styles["Normal"]; st.font.name = "Times New Roman"; st.font.size = Pt(13)
    st.element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
    st.paragraph_format.line_spacing = 1.15
    for n in ("Heading 1", "Heading 2", "Heading 3"):   # bỏ font theme (Calibri Light) của style đầu mục
        rf = doc.styles[n].element.rPr.rFonts
        for a in ("asciiTheme", "hAnsiTheme", "eastAsiaTheme", "cstheme"):
            rf.attrib.pop(qn("w:" + a), None)
        for a in ("ascii", "hAnsi", "eastAsia", "cs"):
            rf.set(qn("w:" + a), "Times New Roman")
    s = doc.sections[0]
    s.page_width, s.page_height = Cm(21), Cm(29.7)
    s.top_margin = s.bottom_margin = Cm(2); s.left_margin = Cm(3); s.right_margin = Cm(2)
    page_number_footer(s)

    # ---------- BÌA ----------
    C = WD_ALIGN_PARAGRAPH.CENTER
    para(doc, "SỞ GIÁO DỤC VÀ ĐÀO TẠO " + DOT, bold=True, align=C, after=0)
    para(doc, "TRƯỜNG " + DOT, bold=True, align=C, after=60)
    para(doc, "NHẬT KÝ NGHIÊN CỨU", bold=True, align=C, size=26, after=6)
    para(doc, "(Sổ ghi chép quá trình thực hiện dự án khoa học kỹ thuật)", italic=True, align=C, after=36)
    para(doc, "Tên dự án:", bold=True, align=C, after=2)
    para(doc, TEN_DU_AN.upper(), bold=True, align=C, size=15, after=36)
    info = doc.add_table(rows=0, cols=2); info.alignment = WD_TABLE_ALIGNMENT.CENTER
    for k, v in [("Lĩnh vực", "Thống kê"), ("Học sinh thực hiện 1", DOT), ("Học sinh thực hiện 2", DOT),
                 ("Giáo viên hướng dẫn", DOT), ("Thời gian thực hiện", "07/03/2026 – 05/10/2026")]:
        c = info.add_row().cells; runs(c[0].paragraphs[0], k + ":", bold=True); runs(c[1].paragraphs[0], v)
    widths_of(info, [5.5, 10])
    para(doc, "", after=90)
    para(doc, DOT + ", tháng 10 năm 2026", italic=True, align=C)
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

    # ---------- I. THÔNG TIN CHUNG ----------
    heading(doc, "I. THÔNG TIN CHUNG VÀ QUY ƯỚC GHI CHÉP", 1)
    para(doc, "Mục tiêu dự án: chế tạo và đánh giá nguyên mẫu mũi điện tử giá thấp (1 Hub, 3 Node; cảm biến TGS2602, TGS822, SHT31; truyền LoRa) kết hợp Random Forest phân loại ba trạng thái an toàn, chín sinh lý, nguy cơ lên men, để cảnh báo sớm điểm nóng lên men của xoài và chuối trong kho mát.")
    para(doc, "Quy ước: mỗi buổi làm việc ghi ngày, mục tiêu, công việc, kết quả hoặc số liệu, vấn đề phát sinh và hướng xử lý, kèm minh chứng (tên file dữ liệu gốc). Số liệu ghi trong nhật ký là số đo gốc, không làm tròn lại khi chép vào báo cáo. Giáo viên hướng dẫn xác nhận định kỳ 2 lần/tháng tại Phần III.")
    para(doc, "Bảng 1. Tiến độ tổng thể", bold=True, align=C, before=6)
    tong = [(g[0].split(". ", 1)[1].rsplit(" (", 1)[0].capitalize(), g[0].rsplit("(", 1)[1].rstrip(")"),
             f"{sum(len(x[1]) for x in GIAI_DOAN[:i]) + 1}–{sum(len(x[1]) for x in GIAI_DOAN[:i + 1])}")
            for i, g in enumerate(GIAI_DOAN)]
    table(doc, ["Giai đoạn", "Thời gian", "Buổi số"], [(f"{i+1}. {a}", b, c) for i, (a, b, c) in enumerate(tong)], [10, 3.8, 2.2])
    para(doc, "", after=2)
    para(doc, "Bảng 2. Danh mục dữ liệu gốc lưu kèm nhật ký", bold=True, align=C, before=6)
    table(doc, ["File", "Nội dung", "Số dòng"], [
        ("PhuLucA_KhaoSat_18DonVi.csv", "Phiếu khảo sát 18 đơn vị", "18"),
        ("PhuLucB_NhatKy_DoKiem_v1.csv", "Đo kiểm nguyên mẫu v1 (3 Node)", "117"),
        ("PhuLucB_NhatKy_DoKiem_v2.csv", "Đo kiểm nguyên mẫu v2 (3 Node × 12 chu kỳ)", "108"),
        ("PhuLucB_FreshNose_RawTimeSeries.csv", "Chuỗi thời gian 3 đợt × 3 buồng", "4.500"),
        ("PhuLucB_Test_Predictions_1500samples.csv", "Dự đoán từng mẫu của đợt 3", "1.500"),
        ("PhuLucB_ConfusionMatrix_Metrics.csv", "Ma trận nhầm lẫn, chỉ số mô hình", "–"),
        ("PhuLucB_Battery_Discharge_Log.csv", "Nhật ký pin và LoRa", "1.128"),
    ], [7.6, 6.6, 1.8], size=10.5)

    # ---------- II. NHẬT KÝ ----------
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)
    heading(doc, "II. NHẬT KÝ CÁC BUỔI LÀM VIỆC", 1)
    n = 0
    for ten, buoi in GIAI_DOAN:
        heading(doc, ten, 2)
        for d, muc, viec, kq, vd, mc in buoi:
            n += 1
            t = doc.add_table(rows=1, cols=2); t.style = "Table Grid"; t.alignment = WD_TABLE_ALIGNMENT.CENTER
            top = t.rows[0].cells; top[0].merge(top[1]); shade(top[0], "E2EFDA")
            runs(top[0].paragraphs[0], f"Buổi {n} · {ngay(d)}", bold=True, size=12)
            rows = [("Mục tiêu", muc), ("Công việc", viec), ("Kết quả, số liệu", kq)]
            if vd: rows.append(("Vấn đề, hướng xử lý", vd))
            if mc: rows.append(("Minh chứng", mc))
            for k, v in rows:
                c = t.add_row().cells; runs(c[0].paragraphs[0], k, bold=True, size=11.5); runs(c[1].paragraphs[0], v, size=11.5)
            widths_of(t, [3.6, 12.4])
            for row in t.rows:
                # không ngắt một buổi qua hai trang
                trPr = row._tr.get_or_add_trPr(); cs = OxmlElement("w:cantSplit"); cs.set(qn("w:val"), "true"); trPr.append(cs)
                for c in row.cells:
                    for p in c.paragraphs: p.paragraph_format.keep_with_next = True; p.paragraph_format.space_after = Pt(1)
            para(doc, "", after=2, size=6)

    # ---------- III. XÁC NHẬN GVHD ----------
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)
    heading(doc, "III. XÁC NHẬN ĐỊNH KỲ CỦA GIÁO VIÊN HƯỚNG DẪN", 1)
    para(doc, "Giáo viên hướng dẫn kiểm tra nhật ký và sản phẩm 2 lần/tháng, ghi nhận xét và ký xác nhận trực tiếp.", italic=True)
    rows = [(i + 1, f"{dt.date.fromisoformat(d):%d/%m/%Y}", nd, "\n\n", "") for i, (d, nd) in enumerate(XAC_NHAN)]
    t = table(doc, ["Lần", "Ngày", "Nội dung đã thực hiện", "Nhận xét, yêu cầu của GVHD", "Ký, ghi rõ họ tên"],
              rows, [1.2, 2.2, 5.0, 4.8, 2.8], size=11)
    for row in t.rows[1:]:
        row.height = Cm(1.1)
        trPr = row._tr.get_or_add_trPr(); cs = OxmlElement("w:cantSplit"); cs.set(qn("w:val"), "true"); trPr.append(cs)
    para(doc, "Số lần xác nhận theo tháng: 03 (1), 04 (2), 05 (2), 06 (2), 07 (2), 08 (2), 09 (2), 10 (1).", italic=True, size=11, before=4)

    # ---------- IV. BIÊN BẢN AN TOÀN / ĐẠO ĐỨC ----------
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)
    heading(doc, "IV. BIÊN BẢN KIỂM TRA AN TOÀN VÀ ĐẠO ĐỨC NGHIÊN CỨU", 1)
    para(doc, "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", bold=True, align=C, after=0)
    para(doc, "Độc lập – Tự do – Hạnh phúc", bold=True, align=C, after=10)
    para(doc, "BIÊN BẢN KIỂM TRA AN TOÀN VÀ ĐẠO ĐỨC NGHIÊN CỨU – LẦN 1 (TRƯỚC THÍ NGHIỆM)", bold=True, align=C, size=13.5, after=8)
    para(doc, "Thời gian: 14 giờ 00, " + ngay("2026-05-28") + ".    Địa điểm: " + DOT)
    para(doc, "Dự án: " + TEN_DU_AN + ".")
    para(doc, "Thành phần: Giáo viên hướng dẫn: " + DOT + "; Đại diện nhà trường / người phụ trách phòng thí nghiệm: " + DOT + "; Học sinh thực hiện: " + DOT + ".")
    para(doc, "Nội dung kiểm tra:", bold=True, before=4)
    ck = [
        ("1. Đối tượng nghiên cứu", "Không thí nghiệm trên người, động vật có xương sống; đối tượng là quả xoài, chuối và cảm biến.", ""),
        ("2. Khảo sát 18 đơn vị", "Phiếu nêu rõ mục đích, tự nguyện tham gia; chỉ hỏi thông tin của đơn vị; mã hóa HTX_01…, KHO_01…; báo cáo chỉ công bố số tổng hợp, tên đơn vị lưu nội bộ.", ""),
        ("3. Tác nhân sinh học: nấm thán thư (Colletotrichum spp.)", "Là tác nhân gây bệnh thực vật; cấy trong buồng riêng, đóng kín; đeo găng tay, khẩu trang khi thao tác; rửa tay sau thao tác; không mang quả nhiễm ra ngoài khu thí nghiệm. Nguồn chủng: " + DOT, ""),
        ("4. Xử lý mẫu sau thí nghiệm", "Quả thí nghiệm không dùng làm thực phẩm; quả nhiễm nấm cho vào túi kín, tiêu hủy theo hướng dẫn của phòng thí nghiệm; khử trùng buồng và dụng cụ.", ""),
        ("5. An toàn điện, pin", "Pin LiFePO4 có mạch bảo vệ BMS; sạc có người giám sát; cảm biến MOX gia nhiệt đặt trong vỏ IP66; không để dây hở trong buồng ẩm.", ""),
        ("6. Làm việc trong buồng mát 10–14 °C, độ ẩm cao", "Mặc áo ấm; thời gian mỗi lần vào buồng ngắn; có người thứ hai khi kiểm tra ban đêm.", ""),
        ("7. Thiết bị vô tuyến", "LoRa công suất 14 dBm (≈ 25 mW), tần số 923,2 MHz; đối chiếu dải tần cho phép trước khi thử ngoài trường.", ""),
        ("8. Liêm chính dữ liệu", "Lưu nguyên dữ liệu thô, ảnh time-lapse và nhật ký; không sửa số đo; nêu rõ hạn chế; trích dẫn đầy đủ nguồn tài liệu.", ""),
    ]
    table(doc, ["Nội dung", "Biện pháp của nhóm", "Đạt / Chưa đạt"], ck, [4.2, 9.4, 2.4], size=11)
    para(doc, "Kết luận: ☐ Đủ điều kiện tiến hành thí nghiệm   ☐ Cần bổ sung: " + DOT, before=6)
    para(doc, "Biên bản lập lúc ……… giờ cùng ngày, các thành viên đã đọc và thống nhất.", after=10)
    sign(doc, ["ĐẠI DIỆN NHÀ TRƯỜNG", "GIÁO VIÊN HƯỚNG DẪN", "HỌC SINH THỰC HIỆN"])

    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)
    para(doc, "BIÊN BẢN KIỂM TRA AN TOÀN – LẦN 2 (SAU THÍ NGHIỆM)", bold=True, align=C, size=13.5, after=8)
    para(doc, "Thời gian: " + ngay("2026-06-22") + ".    Địa điểm: " + DOT)
    para(doc, "Thành phần: Giáo viên hướng dẫn: " + DOT + "; Học sinh thực hiện: " + DOT + ".")
    table(doc, ["Nội dung", "Tình trạng thực tế", "Đạt / Chưa đạt"], [
        ("Tiêu hủy quả thí nghiệm (60 kg)", "", ""),
        ("Khử trùng 3 buồng mát, dụng cụ cấy nấm", "", ""),
        ("Sự cố an toàn trong 21 ngày thí nghiệm (điện, pin, buồng lạnh)", "", ""),
        ("Sao lưu dữ liệu: 4.500 mẫu, ảnh time-lapse, biên bản kiểm tra 12 giờ", "", ""),
        ("Thu hồi, cất giữ Node, Hub; pin được sạc/xả về mức lưu kho", "", ""),
    ], [7, 6.6, 2.4], size=11)
    para(doc, "Kết luận: " + DOT + DOT, before=6, after=10)
    sign(doc, ["GIÁO VIÊN HƯỚNG DẪN", "HỌC SINH THỰC HIỆN"])

    # ---------- V. TỔNG KẾT ----------
    para(doc, "", after=6)
    heading(doc, "V. TỔNG KẾT KẾT QUẢ SO VỚI TIÊU CHÍ", 1)
    table(doc, ["Mã", "Tiêu chí", "Kết quả", "Kết luận"], [
        ("TC1", "Độ chính xác ≥ 85 %", "87,47 % (1.312/1.500, đợt 3)", "Đạt; lớp chín sinh lý 45,0 %"),
        ("TC2", "Cảnh báo giả ≤ 10 %", "6,2 % (62/1.000)", "Đạt"),
        ("TC3", "Sớm hơn mắt thường ≥ 12 giờ", "26,3 ± 6,4 giờ (6 chuỗi); đợt 3 theo dự đoán: 36,0 và 27,5 giờ", "Đạt"),
        ("TC4", "Pin ≥ 20 ngày", "21,0 ngày đến 20 %; 23,5 ngày đến 10,3 %", "Đạt"),
        ("TC5", "Gói ≤ 22 triệu đồng", "Giá bán 22 triệu; giá vốn 13,4 triệu", "Đạt đúng ngưỡng"),
    ], [1.3, 4.2, 6.5, 4.0], size=11)
    para(doc, "Xác nhận hoàn thành nhật ký ngày …… /10/2026.", before=10, after=4)
    sign(doc, ["GIÁO VIÊN HƯỚNG DẪN", "NHÓM HỌC SINH"])

    doc.save(out)
    print("buổi:", n, "| xác nhận:", len(XAC_NHAN), "| hạn:", HAN_CHOT)


if __name__ == "__main__":
    build("Nhat_Ky_Nghien_Cuu.docx")
