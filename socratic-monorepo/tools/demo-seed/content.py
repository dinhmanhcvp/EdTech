"""Nội dung của tài khoản mẫu: lớp, học sinh, slide/đề (nội dung môn học đúng chương trình), giáo án, bài soạn.

Chỉ là dữ liệu; `seed_demo_account.py` mới gọi API. Số liệu trong các câu hỏi đã tính tay (g = 10 m/s²).
"""
from __future__ import annotations

TEACHER = {"username": "co_minhanh", "password": "Demo-2026-kesach", "display_name": "Cô Minh Anh (tài khoản mẫu)"}

CLASSES = [
    {"key": "ly", "name": "10A1", "grade": "10", "subject": "Vật lí", "size": 38, "notes": "Lớp khá, hay nhầm phương ngang và phương thẳng đứng khi ném. Vài em cần hỗ trợ phần vectơ.",
     "students": ["Nguyễn Hoàng Lan Anh", "Trần Minh Khôi", "Lê Bảo Châu", "Phạm Gia Hân", "Đỗ Quang Huy", "Vũ Thùy Linh", "Bùi Đức Anh", "Hoàng Ngọc Mai", "Đặng Tuấn Kiệt"]},
    {"key": "hoa", "name": "11B2", "grade": "11", "subject": "Hóa học", "size": 34, "notes": "Lớp đều, mạnh phần tính toán, yếu phần giải thích hiện tượng.",
     "students": ["Phan Thu Hà", "Ngô Minh Quân", "Dương Khánh Vy", "Lý Hải Đăng", "Trịnh Bảo Ngọc", "Mai Anh Tuấn", "Cao Phương Thảo", "Đinh Gia Bảo"]},
    {"key": "toan", "name": "12A3", "grade": "12", "subject": "Toán", "size": 40, "notes": "Lớp ôn thi tốt nghiệp, cần luyện đề theo thời gian.",
     "students": ["Võ Thanh Tùng", "Lâm Diệu Linh", "Tạ Minh Hiếu", "Hồ Thảo Nguyên", "Nguyễn Đình Phúc", "Chu Mỹ Anh", "Lương Hoàng Nam", "Kiều Bảo Trâm"]},
    {"key": "sinh", "name": "11A5", "grade": "11", "subject": "Sinh học", "size": 36, "notes": "Lớp thích thí nghiệm, nên mở mô phỏng thực hành khi dạy.",
     "students": ["Đoàn Khánh Linh", "Tăng Quốc Bảo", "Lại Ngọc Diệp", "Trương Minh Triết", "Thái Hà My", "Văn Phúc An", "Hà Gia Huy", "Ông Thanh Mai"]},
]

KC = {
    "nem": ("vat-ly-nem-ngang", "Chuyển động ném ngang"),
    "roi": ("vat-ly-roi-tu-do", "Rơi tự do"),
    "cb": ("hoa-can-bang", "Cân bằng hóa học"),
    "lc": ("hoa-le-chatelier", "Nguyên lí Le Chatelier"),
    "dh": ("toan-dao-ham", "Đạo hàm"),
    "tt": ("toan-cuc-tri", "Cực trị hàm số"),
    "qh": ("sinh-quang-hop", "Quang hợp"),
    "di": ("sinh-di-truyen", "Di truyền Mendel"),
}


def kcs(*keys):
    return [{"id": KC[k][0], "label": KC[k][1]} for k in keys]


def choice(i, text, options, answer, *k):
    return {"id": f"q{i}", "type": "choice", "label": f"Câu {i}", "text": text, "options": options, "answer": str(answer), "kcs": kcs(*k)}


def short(i, text, answer, *k):
    return {"id": f"q{i}", "type": "short", "label": f"Câu {i}", "text": text, "answer": answer, "kcs": kcs(*k)}


def opened(i, text, *k):
    return {"id": f"q{i}", "type": "open", "label": f"Câu {i}", "text": text, "kcs": kcs(*k)}


# slide: (tiêu đề, [ý], hình minh họa)
SLIDES = {
    "Chuyển động ném ngang và ném xiên": ("PHYSICS", "ly", [
        ("Chuyển động ném ngang", ["Vật được ném theo phương ngang với vận tốc đầu v0", "Bỏ qua sức cản không khí, gia tốc g hướng xuống", "Quỹ đạo là một nhánh parabol"], "projectile"),
        ("Phân tích thành hai chuyển động", ["Phương ngang: chuyển động thẳng đều, x = v0·t", "Phương thẳng đứng: rơi tự do, y = ½·g·t²", "Hai chuyển động độc lập với nhau"], "axes"),
        ("Thời gian rơi và tầm xa", ["t = √(2h / g): chỉ phụ thuộc độ cao h", "L = v0·√(2h / g)", "Ví dụ: h = 20 m, v0 = 15 m/s cho t = 2 s và L = 30 m"], "projectile"),
        ("Ném xiên (mở rộng)", ["Phân tích v0 thành v0·cosα và v0·sinα", "Độ cao cực đại H = v0²·sin²α / (2g)", "Tầm xa lớn nhất khi α = 45°"], "axes"),
    ]),
    "Động lượng và va chạm": ("PHYSICS", "ly", [
        ("Động lượng", ["Động lượng p = m·v (đơn vị kg·m/s)", "Là đại lượng vectơ, cùng hướng với vận tốc"], "vectors"),
        ("Bảo toàn động lượng", ["Hệ kín: tổng động lượng trước = tổng động lượng sau", "m1·v1 + m2·v2 = m1·v1' + m2·v2'"], "vectors"),
        ("Va chạm mềm và va chạm đàn hồi", ["Va chạm mềm: hai vật dính nhau, động năng giảm", "Va chạm đàn hồi: động năng được bảo toàn"], "vectors"),
    ]),
    "Cân bằng hóa học": ("CHEMISTRY", "hoa", [
        ("Phản ứng thuận nghịch", ["Xảy ra theo cả hai chiều trong cùng điều kiện", "Cân bằng hóa học: tốc độ thuận bằng tốc độ nghịch", "Nồng độ các chất không đổi theo thời gian"], "equilibrium"),
        ("Hằng số cân bằng Kc", ["aA + bB ⇌ cC + dD", "Kc = [C]^c·[D]^d / ([A]^a·[B]^b)", "Chỉ phụ thuộc nhiệt độ, không phụ thuộc xúc tác"], "equilibrium"),
        ("Nguyên lí Le Chatelier", ["Tăng nồng độ chất nào, cân bằng chuyển dịch theo chiều làm giảm chất đó", "Tăng áp suất: chuyển dịch về phía có ít mol khí hơn", "Tăng nhiệt độ: chuyển dịch theo chiều thu nhiệt"], "equilibrium"),
        ("Ví dụ: tổng hợp amoniac", ["N2 + 3H2 ⇌ 2NH3, tỏa nhiệt", "Nhiệt độ thấp và áp suất cao thuận lợi cho NH3", "Thực tế dùng xúc tác sắt, khoảng 450 °C để đạt tốc độ hợp lí"], "equilibrium"),
    ]),
    "Khảo sát hàm số bậc ba": ("MATH", "toan", [
        ("Các bước khảo sát", ["Tập xác định, giới hạn ở vô cực", "Đạo hàm, lập bảng biến thiên", "Cực trị, điểm uốn, đồ thị"], "cubic"),
        ("Đạo hàm và cực trị", ["y' đổi dấu từ + sang − tại cực đại", "y' đổi dấu từ − sang + tại cực tiểu", "y' = 0 là điều kiện cần của cực trị"], "cubic"),
        ("Ví dụ: y = x³ − 3x", ["y' = 3x² − 3 = 0 cho x = −1 hoặc x = 1", "Cực đại tại x = −1 (y = 2), cực tiểu tại x = 1 (y = −2)", "Đồ thị đối xứng qua gốc tọa độ"], "cubic"),
        ("Tiếp tuyến", ["Hệ số góc tiếp tuyến tại x0 là y'(x0)", "Phương trình: y = y'(x0)·(x − x0) + y(x0)"], "cubic"),
    ]),
    "Quang hợp ở thực vật": ("BIOLOGY", "sinh", [
        ("Quang hợp là gì", ["Lá cây dùng năng lượng ánh sáng để tổng hợp chất hữu cơ", "6CO2 + 6H2O → C6H12O6 + 6O2", "Diễn ra ở lục lạp"], "leaf"),
        ("Pha sáng", ["Xảy ra ở màng thylakoid", "Quang phân li nước tạo O2, ATP và NADPH", "Cần ánh sáng trực tiếp"], "leaf"),
        ("Pha tối (chu trình Calvin)", ["Xảy ra ở chất nền (stroma)", "Dùng ATP và NADPH để cố định CO2 thành đường", "Không cần ánh sáng trực tiếp"], "leaf"),
        ("Yếu tố ảnh hưởng", ["Cường độ ánh sáng, nồng độ CO2, nhiệt độ, nước", "Điểm bù ánh sáng: quang hợp bằng hô hấp"], "leaf"),
    ]),
}

# bài tập / đề: tên -> (môn, loại, lớp, [câu hỏi]); câu hỏi được in lên trang PDF
QUESTION_SETS = {
    "Bài tập: Chuyển động ném": ("PHYSICS", "exercise", "ly", [
        choice(1, "Vật ném ngang từ độ cao h. Thời gian rơi phụ thuộc vào", ["Vận tốc ném", "Độ cao h", "Khối lượng vật", "Cả vận tốc và khối lượng"], 1, "nem"),
        short(2, "Ném ngang từ độ cao 20 m, g = 10 m/s². Thời gian vật chạm đất là bao nhiêu giây?", "2", "nem", "roi"),
        short(3, "Cùng bài trên, vận tốc ném v0 = 15 m/s. Tầm xa là bao nhiêu mét?", "30", "nem"),
        choice(4, "Quỹ đạo của vật ném ngang là", ["Đường thẳng", "Một nhánh parabol", "Đường tròn", "Đường elip"], 1, "nem"),
        opened(5, "Giải thích vì sao viên bi ném ngang và viên bi thả rơi từ cùng độ cao chạm đất cùng lúc.", "nem", "roi"),
    ]),
    "Đề 15 phút: Chuyển động ném": ("PHYSICS", "exam", "ly", [
        choice(1, "Chuyển động theo phương ngang của vật ném ngang là", ["Thẳng đều", "Nhanh dần đều", "Chậm dần đều", "Tròn đều"], 0, "nem"),
        short(2, "Ném ngang từ độ cao 45 m (g = 10 m/s²). Thời gian rơi là bao nhiêu giây?", "3", "nem", "roi"),
        short(3, "Cùng bài trên, v0 = 10 m/s. Tầm xa là bao nhiêu mét?", "30", "nem"),
        choice(4, "Tại lúc chạm đất (t = 3 s), thành phần vận tốc theo phương thẳng đứng bằng (g = 10 m/s²)", ["10 m/s", "20 m/s", "30 m/s", "45 m/s"], 2, "nem", "roi"),
        short(5, "Vật ném ngang từ độ cao 80 m, g = 10 m/s². Thời gian rơi là bao nhiêu giây?", "4", "roi"),
    ]),
    "Bài tập: Hằng số cân bằng": ("CHEMISTRY", "exercise", "hoa", [
        choice(1, "Phản ứng N2 + 3H2 ⇌ 2NH3 tỏa nhiệt. Tăng nhiệt độ thì cân bằng chuyển dịch theo chiều", ["Thuận", "Nghịch", "Không đổi", "Không xác định"], 1, "lc"),
        choice(2, "Tăng áp suất chung của hệ N2 + 3H2 ⇌ 2NH3 thì cân bằng", ["Chuyển dịch theo chiều thuận", "Chuyển dịch theo chiều nghịch", "Không chuyển dịch", "Bị phá vỡ"], 0, "lc"),
        short(3, "2NO2 ⇌ N2O4 ở cân bằng: [N2O4] = 0,2 M và [NO2] = 0,1 M. Tính Kc.", "20", "cb"),
        choice(4, "Chất xúc tác trong phản ứng thuận nghịch có tác dụng", ["Làm tăng Kc", "Làm cân bằng dịch chuyển theo chiều thuận", "Giúp đạt trạng thái cân bằng nhanh hơn", "Làm giảm Kc"], 2, "cb"),
        opened(5, "Vì sao nhà máy tổng hợp NH3 không dùng nhiệt độ thấp nhất có thể dù cân bằng thuận lợi hơn?", "lc", "cb"),
    ]),
    "Đề kiểm tra 45 phút: Cân bằng hóa học": ("CHEMISTRY", "exam", "hoa", [
        choice(1, "Ở trạng thái cân bằng hóa học", ["Phản ứng dừng lại", "Tốc độ phản ứng thuận bằng tốc độ phản ứng nghịch", "Nồng độ các chất bằng nhau", "Chỉ có chất sản phẩm"], 1, "cb"),
        short(2, "H2 + I2 ⇌ 2HI có [H2] = [I2] = 0,5 M và [HI] = 1 M ở cân bằng. Tính Kc.", "4", "cb"),
        choice(3, "Cân bằng nào dưới đây không bị ảnh hưởng bởi áp suất? (số mol khí hai vế bằng nhau)", ["N2 + 3H2 ⇌ 2NH3", "H2 + I2 ⇌ 2HI", "2SO2 + O2 ⇌ 2SO3", "N2O4 ⇌ 2NO2"], 1, "lc"),
        choice(4, "Thêm chất xúc tác vào hệ đang cân bằng thì", ["Kc tăng", "Kc giảm", "Kc không đổi", "Cân bằng chuyển theo chiều thuận"], 2, "cb"),
    ]),
    "Bài tập: Đạo hàm": ("MATH", "exercise", "toan", [
        choice(1, "Đạo hàm của hàm số y = x³ là", ["x²", "3x²", "3x", "x⁴/4"], 1, "dh"),
        short(2, "Cho f(x) = x² − 4x + 3. Tính f'(1).", "-2", "dh"),
        short(3, "Tìm hệ số góc của tiếp tuyến của đồ thị y = x² tại điểm có hoành độ x = 3.", "6", "dh"),
        {"id": "q4", "type": "essay", "label": "Câu 4", "text": "Giải phương trình f'(x) = 0 với f(x) = x² − 6x.", "answer": "x = 3", "kcs": kcs("dh", "tt")},
        opened(5, "Nêu ý nghĩa hình học của đạo hàm và minh họa bằng một ví dụ.", "dh"),
    ]),
    "Đề 15 phút: Cực trị hàm số": ("MATH", "exam", "toan", [
        choice(1, "Điểm cực tiểu của hàm số y = x² − 4x là", ["x = −2", "x = 2", "x = 4", "x = 0"], 1, "tt"),
        short(2, "Giá trị nhỏ nhất của hàm số y = x² − 4x là", "-4", "tt"),
        short(3, "Hàm số y = x³ − 3x có bao nhiêu điểm cực trị?", "2", "tt"),
        choice(4, "Hàm số y = x³ đạt cực trị tại", ["x = 0", "x = 1", "Không có cực trị", "x = −1"], 2, "tt", "dh"),
    ]),
    "Bài tập: Quang hợp": ("BIOLOGY", "exercise", "sinh", [
        choice(1, "Pha sáng của quang hợp xảy ra ở", ["Chất nền lục lạp", "Màng thylakoid", "Ti thể", "Nhân tế bào"], 1, "qh"),
        choice(2, "O2 giải phóng trong quang hợp có nguồn gốc từ", ["CO2", "H2O", "Glucose", "ATP"], 1, "qh"),
        short(3, "Cần bao nhiêu phân tử CO2 để tạo ra một phân tử glucose?", "6", "qh"),
        choice(4, "Chu trình Calvin cần sản phẩm nào của pha sáng?", ["ATP và NADPH", "O2", "Ánh sáng trực tiếp", "DNA"], 0, "qh"),
        opened(5, "Vì sao khi cường độ ánh sáng quá cao cường độ quang hợp không tăng nữa?", "qh"),
    ]),
    "Đề: Di truyền Mendel": ("BIOLOGY", "exam", "sinh", [
        choice(1, "Phép lai Aa × Aa cho tỉ lệ kiểu hình trội : lặn là", ["1 : 1", "3 : 1", "1 : 2 : 1", "9 : 3 : 3 : 1"], 1, "di"),
        short(2, "Phép lai Aa × Aa: xác suất sinh con có kiểu gen aa là bao nhiêu phần trăm?", "25", "di"),
        short(3, "Phép lai AaBb × AaBb (phân li độc lập): kiểu hình A-B- chiếm bao nhiêu phần trong 16?", "9", "di"),
        choice(4, "Phép lai phân tích dùng để", ["Tạo giống mới", "Xác định kiểu gen của cơ thể mang tính trạng trội", "Tạo đột biến", "Tăng tỉ lệ dị hợp"], 1, "di"),
    ]),
}
UNREVIEWED = ("Đề thi thử (chưa duyệt câu)", "MATH", "exam", "toan", ["Bài 1. Giải phương trình x² − 5x + 6 = 0.", "Bài 2. Tìm giá trị lớn nhất của y = −x² + 4x.", "Bài 3. Tính đạo hàm của y = x³ − 2x + 1."])

PLANS = {
    "Bài 12. Chuyển động ném": {"subject": "PHYSICS", "boardContext": "Lớp 10A1 đã học rơi tự do. Nhấn mạnh hai chuyển động thành phần độc lập.", "sections": [
        {"id": "khoi-dong", "title": "Khởi động", "objective": "Gợi trực giác về hai chuyển động độc lập", "kcs": kcs("roi"), "items": [
            {"id": "poll-bi", "type": "poll", "question": "Một viên bi ném ngang, một viên thả rơi cùng lúc từ cùng độ cao. Viên nào chạm đất trước?", "options": ["Cùng lúc", "Viên thả rơi", "Viên ném ngang"], "correct": 0}]},
        {"id": "phan-tich", "title": "Phân tích chuyển động", "objective": "Viết được phương trình hai thành phần", "kcs": kcs("nem"), "items": [
            {"id": "ct-x", "type": "formula", "latex": "x = v_0 t", "caption": "phương ngang: thẳng đều"},
            {"id": "ct-y", "type": "formula", "latex": "y = \\frac{1}{2} g t^2", "caption": "phương thẳng đứng: rơi tự do"},
            {"id": "sim-nem", "type": "sim", "templateId": "PHYS_LAB_PROJECTILE_HORIZONTAL", "params": {}}]},
        {"id": "van-dung", "title": "Bài tập vận dụng", "objective": "Tính thời gian rơi và tầm xa", "kcs": kcs("nem", "roi"), "items": [
            {"id": "bt-1", "type": "problem", "text": "Ném ngang từ độ cao 20 m, g = 10 m/s². Tính thời gian chạm đất (s).", "answer": "2"},
            {"id": "bt-2", "type": "problem", "text": "Cùng bài trên với v0 = 15 m/s. Tính tầm xa (m).", "answer": "30"}]},
    ]},
    "Cân bằng hóa học và chuyển dịch": {"subject": "CHEMISTRY", "boardContext": "Lớp 11B2 mạnh tính toán. Cho học sinh tự dự đoán chiều chuyển dịch trước khi mở mô phỏng.", "sections": [
        {"id": "khai-niem", "title": "Trạng thái cân bằng", "objective": "Phân biệt tốc độ bằng nhau với nồng độ bằng nhau", "kcs": kcs("cb"), "items": [
            {"id": "ct-kc", "type": "formula", "latex": "K_c = \\frac{[C]^c [D]^d}{[A]^a [B]^b}", "caption": "hằng số cân bằng"},
            {"id": "sim-cb", "type": "sim", "templateId": "CHEM_EQUILIBRIUM_GENERAL", "params": {}}]},
        {"id": "le-chatelier", "title": "Nguyên lí Le Chatelier", "objective": "Dự đoán chiều chuyển dịch khi đổi nhiệt độ, áp suất, nồng độ", "kcs": kcs("lc"), "items": [
            {"id": "poll-nh3", "type": "poll", "question": "Tổng hợp NH3 tỏa nhiệt. Tăng áp suất thì cân bằng chuyển dịch về phía nào?", "options": ["Tạo NH3", "Tạo N2 và H2", "Không đổi"], "correct": 0},
            {"id": "bt-kc", "type": "problem", "text": "2NO2 ⇌ N2O4 có [N2O4] = 0,2 M, [NO2] = 0,1 M. Tính Kc.", "answer": "20"}]},
    ]},
    "Đạo hàm và ứng dụng": {"subject": "MATH", "boardContext": "Lớp ôn thi: ưu tiên bài tập trắc nghiệm nhanh.", "sections": [
        {"id": "dinh-nghia", "title": "Đạo hàm và hệ số góc", "objective": "Tính đạo hàm của đa thức", "kcs": kcs("dh"), "items": [
            {"id": "ct-dh", "type": "formula", "latex": "(x^n)' = n x^{n-1}"},
            {"id": "sim-dh", "type": "sim", "templateId": "MATH_DERIVATIVE_LAB", "params": {}},
            {"id": "bt-dh", "type": "problem", "text": "Cho f(x) = x² − 4x + 3. Tính f'(1).", "answer": "-2"}]},
        {"id": "cuc-tri", "title": "Cực trị", "objective": "Tìm cực trị bằng đạo hàm", "kcs": kcs("tt"), "items": [
            {"id": "bt-ct", "type": "problem", "text": "Giá trị nhỏ nhất của y = x² − 4x là bao nhiêu?", "answer": "-4"}]},
    ]},
    "Quang hợp ở thực vật": {"subject": "BIOLOGY", "boardContext": "Lớp 11A5 thích thực hành: mở phòng thực hành sắc tố lá sau phần pha sáng.", "sections": [
        {"id": "pha-sang", "title": "Pha sáng", "objective": "Nêu vị trí, nguyên liệu và sản phẩm", "kcs": kcs("qh"), "items": [
            {"id": "poll-o2", "type": "poll", "question": "O2 trong quang hợp có nguồn gốc từ chất nào?", "options": ["CO2", "H2O", "Glucose"], "correct": 1},
            {"id": "sim-sac-to", "type": "sim", "templateId": "BIO_LAB_PIGMENT", "params": {}}]},
        {"id": "pha-toi", "title": "Pha tối", "objective": "Hiểu chu trình Calvin dùng ATP và NADPH", "kcs": kcs("qh"), "items": [
            {"id": "bt-co2", "type": "problem", "text": "Cần bao nhiêu phân tử CO2 để tạo một phân tử glucose?", "answer": "6"}]},
    ]},
}

LESSONS = [
    ("Chuyển động ném ngang", "Vật lí 10", ["Chuyển động ném ngang", "x = v0 t", "y = g t^2 / 2"]),
    ("Động lượng và va chạm", "Vật lí 10", ["Dong luong p = m v", "m1v1 + m2v2 = const"]),
    ("Cân bằng hóa học", "Hóa 11", ["Can bang hoa hoc", "Kc = [C][D] / [A][B]"]),
    ("Đạo hàm và tiếp tuyến", "Toán 12", ["Dao ham", "y' = 3x^2 - 3"]),
    ("Khảo sát hàm số bậc ba", "Toán 12", ["Khao sat ham so", "y = x^3 - 3x"]),
    ("Quang hợp", "Sinh 11", ["Quang hop", "6CO2 + 6H2O -> C6H12O6"]),
]

# tiết sắp dạy (chưa bắt đầu): đủ lớp, bài soạn, tài nguyên, mô phỏng, giáo án
PLANNED = [
    {"title": "Tiết 25 – Chuyển động ném ngang", "class": "ly", "lesson": "Chuyển động ném ngang", "plan": "Bài 12. Chuyển động ném",
     "resources": ["Chuyển động ném ngang và ném xiên", "Bài tập: Chuyển động ném", "Đề 15 phút: Chuyển động ném"], "sims": ["PHYS_LAB_PROJECTILE_HORIZONTAL", "PHYS_LAB_FREE_FALL_G"],
     "goals": "Học sinh viết được hai phương trình thành phần và tính được thời gian rơi, tầm xa của vật ném ngang.",
     "notes": "Mở đầu bằng câu hỏi nhanh hai viên bi. Cuối tiết giao Bài tập: Chuyển động ném bằng mã QR, thu 5 phút.",
     "prompts": ["Vẽ quỹ đạo vật ném ngang và ghi hai phương trình thành phần.", "Ném ngang từ 20 m, v0 = 15 m/s. Tính tầm xa."]},
    {"title": "Tiết 18 – Cân bằng hóa học", "class": "hoa", "lesson": "Cân bằng hóa học", "plan": "Cân bằng hóa học và chuyển dịch",
     "resources": ["Cân bằng hóa học", "Bài tập: Hằng số cân bằng"], "sims": ["CHEM_EQUILIBRIUM_GENERAL"],
     "goals": "Dự đoán được chiều chuyển dịch cân bằng khi đổi nhiệt độ, áp suất, nồng độ.",
     "notes": "Cho cả lớp bình chọn dự đoán trước khi mở mô phỏng. Nhắc: xúc tác không đổi Kc.",
     "prompts": ["Viết biểu thức Kc cho N2 + 3H2 ⇌ 2NH3."]},
    {"title": "Tiết 12 – Đạo hàm và tiếp tuyến", "class": "toan", "lesson": "Đạo hàm và tiếp tuyến", "plan": "Đạo hàm và ứng dụng",
     "resources": ["Khảo sát hàm số bậc ba", "Bài tập: Đạo hàm", "Đề 15 phút: Cực trị hàm số"], "sims": ["MATH_DERIVATIVE_LAB"],
     "goals": "Tính nhanh đạo hàm của đa thức và viết được phương trình tiếp tuyến.",
     "notes": "Làm đề 15 phút theo thời gian thật ở cuối tiết.", "prompts": ["Tính đạo hàm của y = x³ − 3x và tìm cực trị."]},
    {"title": "Tiết 9 – Quang hợp ở thực vật", "class": "sinh", "lesson": "Quang hợp", "plan": "Quang hợp ở thực vật",
     "resources": ["Quang hợp ở thực vật", "Bài tập: Quang hợp", "Đề: Di truyền Mendel"], "sims": ["BIO_LAB_PIGMENT", "BIO_LAB_LEAF_STARCH"],
     "goals": "Nêu được vị trí, nguyên liệu, sản phẩm của hai pha quang hợp.",
     "notes": "Mở phòng thực hành sắc tố lá sau phần pha sáng. Đề Mendel để dành cho tiết sau.", "prompts": []},
]

# tiết đã dạy: có bài tập, học sinh đã làm, nên có chỉ số lớp, báo cáo phụ huynh, tab "Lớp của em"
TAUGHT = [
    {"title": "Tiết 24 – Rơi tự do và ném ngang (đã dạy)", "class": "ly", "lesson": "Chuyển động ném ngang", "resource": "Bài tập: Chuyển động ném", "close_run": True},
    {"title": "Tiết 17 – Nguyên lí Le Chatelier (đã dạy)", "class": "hoa", "lesson": "Cân bằng hóa học", "resource": "Bài tập: Hằng số cân bằng", "close_run": False},
    {"title": "Tiết 11 – Cực trị hàm số (đã dạy)", "class": "toan", "lesson": "Khảo sát hàm số bậc ba", "resource": "Bài tập: Đạo hàm", "close_run": False},
]
