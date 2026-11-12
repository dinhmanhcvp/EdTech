# Vá _body.txt / _head.txt / ve_bieu_do.py: phóng chữ ×1,2, cắt bớt chữ. Chạy một lần: python -X utf8 patch_poster.py
import re

def edit(path, pairs):
    s = open(path, encoding="utf8").read()
    for a, b in pairs:
        if a not in s:
            print("KHÔNG THẤY:", path, a[:70])
        s = s.replace(a, b)
    open(path, "w", encoding="utf8").write(s)

# 1) biểu đồ: phóng chữ ×1,2 bằng cách thu nhỏ khung vẽ (kích thước in và số điểm ảnh giữ nguyên)
edit("ve_bieu_do.py", [
    ('CM = 1 / 2.54', 'CM = 1 / 2.54\nK = 1.2   # hệ số phóng chữ so với khổ tham chiếu 100×150 cm'),
    ('fig, ax = plt.subplots(figsize=(w_cm * CM, h_cm * CM), dpi=200)', 'fig, ax = plt.subplots(figsize=(w_cm * CM / K, h_cm * CM / K), dpi=200 * K)'),
])

# 2) nội dung gọn hơn
edit("_body.txt", [
    ("""          + f'<li style="margin-bottom:.35cm">• Đối chứng: quả lành lặn, gây xước, nhiễm nấm thán thư; đo mỗi 30 phút ({RS} của TGS2602, TGS822; nhiệt, ẩm bằng SHT31).</li>'
          + '<li style="margin-bottom:.7cm">• Random Forest; mốc thấy vết thối từ ảnh time-lapse.</li></ul>'""",
     """          + '<li style="margin-bottom:.7cm">• Đối chứng ba nhóm quả, đo mỗi 30 phút; phân loại bằng Random Forest.</li></ul>'"""),
    ("v1 sấy liên tục: pin cạn sau 18–19 giờ, cảm biến đọng sương sau 5,5–7 giờ. v2 đo ngắt quãng, có màng PTFE: Node chạy 23,5 ngày.", "v1 sấy liên tục: pin cạn sau 18–19 giờ. v2 đo ngắt quãng, có màng PTFE: Node chạy 23,5 ngày."),
    ("Số liệu: nhóm tác giả, 2026. Nguồn khác ghi cạnh số liệu; danh mục đầy đủ trong báo cáo đặt tại gian.", "Số liệu: nhóm tác giả, 2026. Nguồn khác ghi cạnh số liệu; danh mục đầy đủ trong báo cáo."),
    ("Tập kiểm tra chỉ có 3 chuỗi (đợt 3), dùng chung mã buồng với dữ liệu huấn luyện.", "Tập kiểm tra chỉ 3 chuỗi (đợt 3), chung mã buồng với dữ liệu huấn luyện."),
    ("Chạy thêm đợt với buồng, Node độc lập; lưu dự đoán từng mẫu.", "Thêm đợt với buồng, Node độc lập; lưu dự đoán từng mẫu."),
    ("Lớp chín sinh lý chỉ nhận đúng 45,0 %; mỗi chuỗi một điểm đo nên chưa kiểm chứng việc chỉ ra từng dãy kệ.", "Lớp chín sinh lý chỉ đúng 45,0 %; chưa kiểm chứng chỉ ra từng dãy kệ."),
    ("Đặt nhiều Node trong buồng nhiều dãy kệ; đối chiếu bằng đo ethylene hoặc sắc ký khí; thử tại 2 kho.", "Nhiều Node trong buồng nhiều dãy kệ; đối chiếu bằng đo ethylene; thử tại 2 kho."),
    ("ngủ sâu.</div>' + ARROW", "ngủ sâu.</div>' + ARROW"),
    ("ESP32-S3 đọc ADC, lọc trung vị, bù nhiệt ẩm.", "ESP32-S3 lọc nhiễu, bù nhiệt ẩm."),
])

# 3) dựng: phóng mọi cỡ chữ ×1,2 khi xuất HTML, banner cao hơn một chút
edit("_body.txt", [
    ("""def page(W, H, body, title):
    return f'<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>{title}</title><style>{CSS % {"W": W, "H": H}}</style></head><body>{body}{MEASURE}</body></html>'""",
     """K = 1.2   # hệ số phóng chữ so với khổ tham chiếu 100×150 cm của prompt


def page(W, H, body, title):
    html = f'<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>{title}</title><style>{CSS % {"W": W, "H": H}}</style></head><body>{body}{MEASURE}</body></html>'
    html = re.sub(r"font-size:([\\d.]+)pt", lambda m: f"font-size:{float(m.group(1)) * K:.1f}pt", html)
    return html.replace("height:4.6cm;background:#1F3A5F", "height:5.2cm;background:#1F3A5F").replace(".num{width:2.9cm;height:2.9cm", ".num{width:3.3cm;height:3.3cm")"""),
])
print("xong")
