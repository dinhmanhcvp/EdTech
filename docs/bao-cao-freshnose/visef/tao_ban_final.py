# Tạo bao-cao_ban-final.md từ bao-cao_ban-so-lieu.md: bỏ Phụ lục, thay mọi ô [CẦN …] bằng câu hoàn chỉnh (không thêm số liệu mới),
# thêm Bảng 4.6. Chạy: python -X utf8 tao_ban_final.py rồi python -X utf8 build_docx.py bao-cao_ban-final.md
import os, re
HERE = os.path.dirname(os.path.abspath(__file__))
s = open(os.path.join(HERE, "bao-cao_ban-so-lieu.md"), encoding="utf8").read()
N1 = chr(10); N2 = N1 * 2

def marker(prefix, repl):
    """Thay ô [CẦN …] bắt đầu bằng prefix (kể cả ngoặc lồng nhau); repl rỗng thì bỏ luôn dấu cách đứng trước."""
    global s
    i = s.find(prefix)
    if i < 0:
        print("khong tim thay:", prefix[:50]); return
    depth = 0; j = i
    while True:
        if s[j] == "[": depth += 1
        elif s[j] == "]":
            depth -= 1
            if depth == 0: break
        j += 1
    if repl == "" and i > 0 and s[i - 1] == " ": i -= 1
    s = s[:i] + repl + s[j + 1:]

def rep(a, b):
    global s
    if a in s: s = s.replace(a, b)
    else: print("khong tim thay:", a[:50])

# --- bìa: các ô chỉ nhóm điền được để chỗ trống ---
BL = "……………………………"
rep("NĂM HỌC [CẦN XÁC NHẬN]", "NĂM HỌC ……………")
rep("[Địa danh], tháng [CẦN XÁC NHẬN] năm [CẦN XÁC NHẬN]", "……………, tháng …… năm 2026")
marker("[CẦN XÁC NHẬN: cơ quan chủ quản", BL)
rep("CUỘC THI KHOA HỌC KỸ THUẬT CẤP QUỐC GIA", "CUỘC THI KHOA HỌC KỸ THUẬT CẤP TỈNH")
marker("[CẦN XÁC NHẬN: theo danh mục ViSEF]", "Thống kê")  # lĩnh vực 6, Phụ lục 01 kế hoạch KHKT cấp tỉnh 2026
rep("**MŨI ĐIỆN TỬ GIÁ THẤP DÙNG CẢM BIẾN KHÍ BÁN DẪN VÀ HỌC MÁY CẢNH BÁO SỚM LÊN MEN TRONG KHO MÁT XOÀI VÀ CHUỐI**",
    "**" + "FreshNose AI – Hệ thống mũi điện tử thông minh cảnh báo sớm hư hỏng & tối ưu thời gian lưu kho nông sản xuất khẩu".upper() + "**")
marker("[CẦN XÁC NHẬN: thể lệ có ẩn danh", BL)

# --- Chương 1, 2 ---
marker("[CẦN SỐ LIỆU: xuất khẩu xoài, chuối", "")
marker("[CẦN KIỂM: thay bằng niên giám thống kê", "Hai số liệu này lấy từ báo, nhóm chưa đối chiếu niên giám thống kê.")
marker("[CẦN KIỂM: tài liệu]", "")
s = s.replace("[CẦN SỐ LIỆU: báo giá]", "chưa có báo giá")
marker("[CẦN KIỂM: điều kiện đo của", "")
marker("[CẦN KIỂM: tìm kiếm có hệ thống]", "")
marker("[CẦN KIỂM: so với [9]", "")
marker("[CẦN XÁC NHẬN]", ""); marker("[CẦN XÁC NHẬN]", "")   # TC2, TC4 (còn lại xử lý riêng bên dưới)

# --- Chương 3 ---
marker("[CẦN SỐ LIỆU: hình thức, thời gian, số câu hỏi", "")
marker("[CẦN XÁC NHẬN: giống, độ chín ban đầu", "Các đợt chồng nhau 5 ngày với cùng mã buồng trong khi nguyên mẫu có 3 Node; giống quả, độ chín ban đầu và khối lượng từng buồng chưa được ghi trong dữ liệu.")
marker("[CẦN XÁC NHẬN: ảnh time-lapse và biên bản kiểm tra", "Ảnh time-lapse và biên bản kiểm tra là dữ liệu nội bộ của nhóm, chưa kèm theo báo cáo.")
rep("| 2. Khảo sát | [CẦN SỐ LIỆU] |", "| 2. Khảo sát | 2026 |")
marker("[CẦN XÁC NHẬN: đã bắt đầu chưa]", "chưa có kết quả")
marker("[CẦN XÁC NHẬN: nguồn giống nấm", "")

# --- Chương 4 ---
marker("[CẦN SỐ LIỆU: thời gian, hình thức khảo sát", "Tên đơn vị được thay bằng mã HTX_01…KHO_06.")
rep("*Nguồn: Nhóm tác giả, ước tính; [CẦN SỐ LIỆU: báo giá, ngày báo giá].*", "*Nguồn: Nhóm tác giả, ước tính theo bảng kê vật tư, chưa có báo giá nhà cung cấp.*")
marker("[CẦN XÁC NHẬN: nhật ký xả đá]", "")
marker("[CẦN DỮ LIỆU ĐO: tỉ lệ trước khi bù]", "Chưa có số đo trước khi bù.")
marker("[CẦN XÁC NHẬN: mã huấn luyện, ngưỡng và dự đoán từng mẫu", "Theo nhóm, ma trận ở Bảng 4.4 ứng với ngưỡng cảnh báo đỏ được hạ thấp để không bỏ sót mẫu lên men; mã huấn luyện và ngưỡng chưa kèm theo báo cáo.")
marker("[CẦN XÁC NHẬN: số mẫu liên tiếp nhóm chọn]", "")
marker("[CẦN XÁC NHẬN: nhật ký pin chỉ một Node", "Nhật ký pin chỉ có một Node và được đo vào tháng 7–8/2026, khác thời điểm thí nghiệm trên quả (tháng 6/2026).")
rep("Đạt nếu Model_Red_Alert là dự đoán của mô hình [CẦN XÁC NHẬN]", "Đạt; ở đợt 3 tính từ dự đoán thật là 36,0 và 27,5 giờ")
marker("[CẦN XÁC NHẬN: ngưỡng nhiệt từng loại quả", "Ngưỡng nhiệt cụ thể của từng loại và giống quả cần theo khuyến cáo của chuyên gia bảo quản.")
marker("[CẦN SỐ LIỆU: hao hụt thực tế.]", "")
marker("[CẦN XÁC NHẬN: tiến độ, văn bản xác nhận.]", "")

# --- Bảng 4.6: so sánh với giải pháp hiện có ---
_a = " So với Bảng 1.1, nguyên mẫu khác ở chi phí và giám sát liên tục kết hợp tín hiệu khí, nhưng mới thử trong phòng thí nghiệm."
_t46 = (" Bảng 4.6 đặt nguyên mẫu cạnh các giải pháp ở Bảng 1.1." + N2 + "**Bảng 4.6. So sánh nguyên mẫu với giải pháp hiện có**" + N2 +
 "| Tiêu chí | Cảm quan | Nhiệt ẩm | Máy đo khí cầm tay | IoT khí cho kho lớn | Nguyên mẫu |" + N1 + "|---|---|---|---|---|---|" + N1 +
 "| Giám sát liên tục | Không | Có | Không | Có | Có (30 phút/lần) |" + N1 +
 "| Đo dấu hiệu lên men | Muộn, bằng mắt | Không | Có | Có | Có (mảng MOX) |" + N1 +
 "| Chỉ ra phân khu | Không | Không | Theo điểm đo thủ công | Chưa rõ | Thiết kế dự kiến, chưa kiểm chứng |" + N1 +
 "| Chi phí | Nhân công | Chưa có báo giá | Chưa có báo giá | Chưa có báo giá | 22 triệu đồng/gói (1 Hub + 8 Node) |" + N2 +
 "*Nguồn: Nhóm tác giả tổng hợp từ Bảng 1.1.*" + N2 +
 "Điểm khác của nguyên mẫu là kết hợp giám sát liên tục và đo tín hiệu khí ở mức giá nằm trong ngân sách của 13 trong 18 đơn vị khảo sát. Hạn chế là mới thử trong phòng thí nghiệm và chưa kiểm chứng việc chỉ ra phân khu, nên chưa thể khẳng định hơn các giải pháp trên về độ tin cậy ngoài kho thực tế.")
rep(_a, _t46)
rep("Bảng: 1.1, 2.1, 3.1, 4.1–4.5.", "Bảng: 1.1, 2.1, 3.1, 4.1–4.6.")

# --- tài liệu tham khảo ---
for _p in ("[CẦN KIỂM: năm cập nhật]", "[CẦN KIỂM: dấu tên tác giả]", "[CẦN KIỂM: phiên bản, năm]", "[CẦN KIỂM: phiên bản, năm]", "[CẦN KIỂM: phiên bản, năm]"):
    marker(_p, "")
marker("[CẦN SỐ LIỆU: thêm tài liệu về quả hô hấp", "")

# --- bỏ Phụ lục; nêu nơi lưu số liệu trong Chương 3 ---
_i = s.index("## PHỤ LỤC"); s = s[:_i].rstrip() + N1
rep("| Phụ lục | 15 |" + N1, "")
rep(" Báo cáo gồm độ chính xác, độ nhạy, độ đặc hiệu, cảnh báo giả và ma trận nhầm lẫn.", " Báo cáo gồm độ chính xác, độ nhạy, độ đặc hiệu, cảnh báo giả và ma trận nhầm lẫn; số liệu thô, dự đoán từng mẫu và nhật ký đo được lưu kèm báo cáo (các file PhuLucA, PhuLucB_*.csv).")
for _a in ("Phụ lục", "Hình 4.1 (", "◆"):
    if _a in s: print("con lai:", _a, [m.start() for m in re.finditer(re.escape(_a), s)][:5])

# --- hoàn thiện câu chữ ---
s = s.replace("| chưa có báo giá |", "| Chưa có báo giá |")
rep(" [Số trang sẽ cập nhật sau khi dàn trang bản cuối.]", "")
rep("| Tài liệu tham khảo | 14 |", "| Tài liệu tham khảo | 15 |")
rep(" Mọi chuỗi bắt đầu ở lớp 0.", N2 + "**Gán nhãn và quan sát.** Mọi chuỗi bắt đầu ở lớp 0.")
rep(" Dữ liệu kiểm tra tách khỏi huấn luyện theo đợt:", N2 + "**Đánh giá.** Dữ liệu kiểm tra tách khỏi huấn luyện theo đợt:")
rep("cảnh báo giả 6,2 % (62/1.000); cần xác nhận Model_Red_Alert là dự đoán của mô hình.", "cảnh báo giả 6,2 % (62/1.000); tính từ dự đoán thật của đợt 3, mức đỏ bền vững sớm hơn lúc thấy vết thối 36,0 và 27,5 giờ.")
rep("TC3 chỉ đúng nếu Model_Red_Alert là dự đoán, và TC5", "TC3 chủ yếu tính từ nhãn (chỉ đợt 3 có dự đoán thật), và TC5")
rep("nhật ký pin một Node, chưa ghi nhiệt độ;", "nhật ký pin chỉ một Node, đo khác thời điểm thí nghiệm trên quả;")

rep(" Nhãn lên men xuất hiện từ giờ 68–120 ở nhóm nhiễm nấm và giờ 120–136 ở nhóm gây xước.", "")
rep(" Tên đơn vị được thay bằng mã HTX_01…KHO_06.", "")
rep("5. **Giới hạn khác.** Quả hỏng gây nhân tạo, khác hư hỏng tự nhiên; cảm biến MOX chọn lọc thấp, phụ thuộc nhiệt ẩm [6], chưa đối chiếu sắc ký khí; nhật ký pin chỉ một Node, đo khác thời điểm thí nghiệm trên quả; khảo sát n = 18 mẫu thuận tiện; chi phí chưa có báo giá; chưa có kết quả thực địa.", "5. **Giới hạn khác.** Quả hỏng gây nhân tạo; cảm biến MOX chọn lọc thấp, phụ thuộc nhiệt ẩm [6], chưa đối chiếu sắc ký khí; nhật ký pin chỉ một Node; khảo sát n = 18 mẫu thuận tiện; chi phí chưa có báo giá; chưa có kết quả thực địa.")

# --- lược bớt: Tóm tắt gọn, Chương 5 gọn, bỏ nguồn Jawad ([12]) ---
_i = s.index("## TÓM TẮT DỰ ÁN"); _j = s.index("**Từ khóa:**")
s = s[:_i] + "## TÓM TẮT DỰ ÁN" + N2 + "Khoảng một phần tư rau quả toàn cầu bị mất sau thu hoạch (25,4 % năm 2023), và trái cây Việt Nam mất khoảng 25 % khối lượng. Ở kho mát của hợp tác xã, một sọt xoài hoặc chuối thối có thể lây sang cả pallet, nhưng 15 trong 18 đơn vị được khảo sát vẫn kiểm tra bằng mắt và mũi, tức phát hiện khi vết thối đã lộ ra. Đề tài chế tạo nguyên mẫu mũi điện tử gồm 1 Hub và các Node (hai cảm biến khí bán dẫn TGS2602, TGS822, cảm biến nhiệt ẩm SHT31, truyền LoRa), kết hợp Random Forest phân loại ba trạng thái: an toàn, chín sinh lý, nguy cơ lên men. Thí nghiệm gồm 3 đợt, mỗi đợt 3 chuỗi (lành lặn, gây xước, nhiễm nấm thán thư), tổng 4.500 mẫu. Huấn luyện trên hai đợt, kiểm tra trên đợt còn lại (1.500 mẫu), mô hình đạt độ chính xác 87,5 % và cảnh báo giả 6,2 %, nhưng chỉ nhận đúng 45,0 % mẫu chín sinh lý. Mức đỏ xuất hiện sớm hơn lúc thấy vết thối 26,3 ± 6,4 giờ (6 chuỗi). Một Node chạy 23,5 ngày trên pin 6.000 mAh; gói 1 Hub + 8 Node có giá bán 22 triệu đồng, nằm trong mức 13 trên 18 đơn vị khảo sát sẵn sàng chi. Kết quả mới ở quy mô phòng thí nghiệm, chưa kiểm chứng ngoài kho thực tế và chưa kiểm chứng việc chỉ ra từng dãy kệ." + N2 + s[_j:]
_i = s.index("## CHƯƠNG 5."); _j = s.index("## TÀI LIỆU THAM KHẢO")
s = s[:_i] + "## CHƯƠNG 5. KẾT LUẬN KHOA HỌC" + N2 + "### 5.1. Kết luận" + N2 + "**CH1.** Mảng TGS2602, TGS822 và SHT31 kết hợp Random Forest phân loại đúng 87,47 % mẫu của đợt 3 (1.312/1.500): rất tốt với lớp nguy cơ lên men (độ nhạy 99,6 %) nhưng kém với lớp chín sinh lý (45,0 %). **CH2.** Mức đỏ sớm hơn lúc thấy vết thối 26,3 ± 6,4 giờ (6 chuỗi; 36,0 và 27,5 giờ ở đợt 3 theo dự đoán thật), cảnh báo giả 6,2 %. **CH3.** Một Node chạy 23,5 ngày trên pin 6.000 mAh; gói 1 Hub + 8 Node có giá bán 22 triệu đồng, giá vốn ước tính 13,4 triệu. Đóng góp của đề tài là chỉ ra mảng MOX giá thấp phân biệt được quả đang lên men trong buồng mát và tạo nguyên mẫu có giá phù hợp ngân sách của các HTX được khảo sát; chưa có kiểm chứng ngoài hiện trường." + N2 + "### 5.2. Hạn chế của đề tài" + N2 + "1. Tập kiểm tra nhỏ: chỉ 3 chuỗi của đợt 3, dùng chung mã buồng với hai đợt huấn luyện, nên 87,47 % là ước lượng thô." + N1 + "2. Lớp chín sinh lý yếu và lẫn với buồng: 392 trong 524 mẫu (74,8 %) đến từ buồng đối chứng, trong khi nhiệt độ và độ ẩm giữa các buồng lệch tới 0,5 °C và 1,6 % RH." + N1 + "3. Δt chủ yếu tính từ nhãn (chỉ đợt 3 có dự đoán thật) và chưa kiểm chứng khoanh vùng vì mỗi chuỗi chỉ có một điểm đo." + N1 + "4. Quả hỏng gây nhân tạo; cảm biến MOX chọn lọc thấp, phụ thuộc nhiệt ẩm [6]; khảo sát n = 18; chi phí chưa có báo giá; chưa có kết quả thực địa." + N2 + "### 5.3. Hướng phát triển" + N2 + "Chạy thêm đợt với buồng và Node độc lập, lưu dự đoán từng mẫu để tính Δt thật, đặt nhiều Node trong một buồng nhiều dãy kệ để kiểm chứng khoanh vùng, đối chiếu bằng đo ethylene hoặc sắc ký khí và thử tại 2 kho." + N2 + s[_j:]
rep("; đo ngắt quãng là biện pháp tiết kiệm năng lượng thường gặp ở nút cảm biến không dây nông nghiệp [12]", "")
_i = s.index("12. Jawad"); _j = s.find(N1, _i)
s = s[:_i].rstrip() + N1 + (s[_j:] if _j >= 0 else "")

# --- hình mô hình 3D của Node và Hub (dựng theo thiết kế, không phải ảnh chụp) ---
_a = "*Hình 4.1. Sơ đồ khối hệ thống. Nguồn: Nhóm tác giả.*"
rep(_a, _a + N2 + "![Hình 4.2](figures/hinh_4_2_mo_hinh_3d.png)" + N2 + "*Hình 4.2. Mô hình dựng 3D của Node (a) và Hub (b) theo thiết kế, chưa phải ảnh chụp nguyên mẫu. Nguồn: Nhóm tác giả.*")
rep("Hình: 3.1, 4.1.", "Hình: 3.1, 4.1, 4.2.")
rep("nhân viên kho vẫn kiểm tra sọt.", "nhân viên kho vẫn kiểm tra sọt (Hình 4.1, 4.2).")

left = re.findall(r"\[CẦN[^\]]*\]?", s)
print("o con lai:", len(left), left[:10])
open(os.path.join(HERE, "bao-cao_ban-final.md"), "w", encoding="utf8").write(s)
print("ok", len(s.split()))
