# -*- coding: utf-8 -*-
"""Dựng poster dự thi Socratic Vision Board trên mẫu poster của BTC (khổ 33.1" x 46.8").

Chạy: python poster.py "<đường dẫn Mẫu Poster 2026.pptx>" <file ra .pptx>
"""
import os, sys
from pptx import Presentation
from kit import *
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE, XL_LABEL_POSITION, XL_LEGEND_POSITION

ST, SC, OPS = P["study"], P["scores"], P["ops"]

HERE = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(HERE, "img") + "/"
SRC, OUT = sys.argv[1], sys.argv[2]

X0, X1 = 1.96, 31.23          # khung nội dung của mẫu (đường kẻ đứt)
WID = X1 - X0
GAP = 0.55

prs = Presentation(SRC)
s = prs.slides[0]

# ---- đầu trang: tên sản phẩm, giáo viên, đơn vị; bỏ chữ hướng dẫn và đường kẻ đứt
for sh in list(s.shapes):
    if sh.shape_type == 6 or (sh.has_text_frame and sh.text_frame.text.startswith("Nội dung gợi ý")):
        remove(sh)
    elif sh.has_text_frame and sh.text_frame.text.startswith("[VUI LÒNG"):
        r = sh.text_frame.paragraphs[0].runs
        r[0].text = "SOCRATIC VISION BOARD"
        for x in r[1:]:
            x._r.getparent().remove(x._r)
    elif sh.has_text_frame and sh.text_frame.text.startswith("Giáo viên"):
        p1, p2 = sh.text_frame.paragraphs[:2]
        p1.runs[-1].text = "Phùng Văn Kiệm"
        for x in p1.runs[1:-1]:
            x._r.getparent().remove(x._r)
        p2.runs[-1].text = "Trường THPT Chuyên Vĩnh Phúc"
        for x in p2.runs[1:-1]:
            x._r.getparent().remove(x._r)


def section(y, n, title, x=X0, w=WID, color=BLUE):
    text(s, x, y, w, 0.9, [[(n + "  ", {"font": MONO, "bold": True, "color": color}),
                            (title, {"bold": True})]], size=40, color=NAVY)
    return y + 1.05


# ---- câu tuyên ngôn
y = 11.25
box(s, X0, y, WID, 3.45, fill=NAVY, radius=0.06)
text(s, X0 + 0.8, y + 0.45, 19.5, 2.6,
     [[("Bảng tương tác & gia sư Socratic cho Toán – Lý – Hóa – Sinh THPT. ", {}),
       ("AI biến nét phấn thành mô phỏng, nhưng không bao giờ giải hộ học sinh.", {"italic": True, "color": "FFEA00"})]],
     size=46, color=WHITE, font=SERIF, line_spacing=1.08, anchor="m")
for i, lab in enumerate(["BẢNG B · THPT", "LỚP HỌC SỐ TÍCH HỢP AI", "AI CÓ TRÁCH NHIỆM"]):
    chip(s, X1 - 8.2, y + 0.55 + i * 0.85, lab, fg=NAVY, bg=WHITE, size=22, w=7.4)

# ---- 01 BỐI CẢNH
y = section(15.15, "01", "BỐI CẢNH VÀ VẤN ĐỀ", color=RED)
cw = (WID - 2 * GAP) / 3
pains = [("GIÁO VIÊN", "Màn hình tương tác chủ yếu để chiếu slide; muốn có mô phỏng phải soạn trước ở nhà."),
         ("HỌC SINH", "Chatbot giải trọn bài trong vài giây; học sinh chép đáp án, bỏ qua lập luận."),
         ("NHÀ TRƯỜNG", "Sinh ảnh, video bằng AI phải chờ và tính phí từng lượt: khó dùng giữa tiết.")]
for i, (who, body) in enumerate(pains):
    x = X0 + i * (cw + GAP)
    box(s, x, y, cw, 3.0, fill=PAPER, line=HAIR, radius=0.05)
    text(s, x + 0.5, y + 0.35, 1.4, 0.9, [[(f"0{i+1}", {"font": MONO, "bold": True})]], size=44, color=RED)
    text(s, x + 1.9, y + 0.5, cw - 2.4, 0.6, [[(who, {"font": MONO, "bold": True})]], size=22, color=MUTED)
    text(s, x + 0.5, y + 1.3, cw - 1.0, 1.6, body, size=27, color=BODY, line_spacing=1.12)

# ---- 02 GIẢI PHÁP
y = section(19.6, "02", "GIẢI PHÁP: AI LÀ TRÌNH BIÊN DỊCH, KHÔNG PHẢI MÁY VẼ")
lw = 11.6
box(s, X0, y, lw, 7.45, fill=WELL, line=HAIR, radius=0.04)
pic(s, IMG + "lasso.png", X0 + 0.45, y + 0.4, lw - 0.9, 2.2, border=HAIR)
d = s.shapes.add_shape(MSO_SHAPE.DOWN_ARROW, Inches(X0 + lw / 2 - 0.3), Inches(y + 2.75), Inches(0.6), Inches(0.6))
d.fill.solid(); d.fill.fore_color.rgb = rgb(AMBER); d.line.fill.background()
pic(s, IMG + "phys_t.png", X0 + 0.45, y + 3.5, lw - 0.9, 3.65, border=HAIR)
rx = X0 + lw + GAP; rw = X1 - rx
stages = [("01", "Khoanh vùng", f"Lọc đúng nét được khoanh, vẽ lại trên nền trắng: ảnh < {OPS['api']['cropKB']} KB.", BLUE),
          ("02", "1 lần gọi Gemini Flash", "Trả về công thức, tham số thanh trượt và câu hỏi gợi mở Socratic.", AMBER),
          ("03", "Mô phỏng tại máy", "4 bộ máy Toán – Lý – Hóa – Sinh chạy 60 FPS; kéo thanh trượt không cần mạng.", BLUE)]
yy = y
for n, h, b, col in stages:
    box(s, rx, yy, rw, 1.75, fill=AMBER_BG if col == AMBER else PAPER, line=HAIR, radius=0.08)
    text(s, rx + 0.45, yy + 0.3, 1.3, 1.2, [[(n, {"font": MONO, "bold": True})]], size=44, color=col, anchor="m")
    text(s, rx + 1.9, yy + 0.22, rw - 2.3, 0.6, [[(h, {"bold": True})]], size=30, color=INK)
    text(s, rx + 1.9, yy + 0.82, rw - 2.3, 0.9, b, size=25, color=BODY)
    yy += 1.95
box(s, rx, yy, rw, 1.6, fill=NAVY, radius=0.08)
stats = [("0", f"gọi AI khi viết (< {OPS['api']['inkMs']} ms)"), (vn(OPS["api"]["callsPerLesson"]), "lần gọi AI / tiết"),
         (f"${vn(OPS['api']['costUsd'], 3)}", f"/ tiết (≈ {OPS['api']['costVnd']} đ)")]
sw = (rw - 0.6) / 3
for i, (v, l) in enumerate(stats):
    text(s, rx + 0.4 + i * sw, yy + 0.15, sw - 0.2, 0.8, [[(v, {"font": MONO, "bold": True})]], size=40, color="FFEA00")
    text(s, rx + 0.4 + i * sw, yy + 0.95, sw - 0.2, 0.6, l, size=21, color=WHITE)

# ---- 03 BỐN MÔN
y = section(28.5, "03", "MỘT NÉT KHOANH, BỐN MÔN KHOA HỌC")
qw = (WID - 3 * 0.45) / 4
subj = [("VẬT LÝ", "phys_t.png", "Ném xiên"), ("ĐIỆN XOAY CHIỀU", "rlc_t.png", "Giản đồ Fresnel"),
        ("HÓA HỌC", "chem_t.png", "Năng lượng hoạt hóa"), ("SINH HỌC", "bio_t.png", "Tháo xoắn ADN")]
for i, (tag, img, cap) in enumerate(subj):
    x = X0 + i * (qw + 0.45)
    box(s, x, y, qw, 4.6, fill=PAPER, line=HAIR, radius=0.04)
    pic(s, IMG + img, x + 0.25, y + 0.2, qw - 0.5, 3.4, border=None)
    text(s, x + 0.25, y + 3.7, qw - 0.5, 0.45, [[(tag, {"font": MONO, "bold": True})]], size=20, color=BLUE, align="c")
    text(s, x + 0.25, y + 4.1, qw - 0.5, 0.45, cap, size=22, color=BODY, align="c")

# ---- 04 GIA SƯ | 05 TRIỂN KHAI
y0 = 34.5
hw = (WID - GAP) / 2
y = section(y0, "04", "GIA SƯ SOCRATIC: KIỂM BẰNG TOÁN HỌC TRƯỚC", w=hw, color=GREEN)
tiers = [("TẦNG 0", f"Chặn {OPS['guard']['blocked']}/{OPS['guard']['total']} lượt xin đáp án", ROSE_BG, RED),
         ("TẦNG 1", f"SymPy · {vn(OPS['offload']['sympy'])}% phiên · < {OPS['offload']['sympyMs']} ms", GREEN_BG, GREEN),
         ("TẦNG 2", f"Kho gợi mở · {vn(OPS['offload']['cache'])}% · < {OPS['offload']['cacheMs']} ms", PAPER, BLUE),
         ("TẦNG 3", f"LLM chỉ hỏi · {vn(OPS['offload']['llm'])}% phiên", AMBER_BG, AMBER)]
for i, (k, h, bg, col) in enumerate(tiers):
    ty = y + i * 1.0
    inset = i * 0.5
    box(s, X0 + inset, ty, hw - 2 * inset, 0.88, fill=bg, line=HAIR, radius=0.15)
    text(s, X0 + inset + 0.4, ty, 2.0, 0.88, [[(k, {"font": MONO, "bold": True})]], size=20, color=col, anchor="m")
    text(s, X0 + inset + 2.5, ty, hw - 2 * inset - 2.8, 0.88, [[(h, {"bold": True})]], size=25, color=INK, anchor="m")
text(s, X0, y + 4.1, hw, 0.9, [[("Kiên trì sau lần sai đầu: ", {"bold": True, "color": RED}),
                                 (f"{vn(OPS['persistence']['before'])}% → {vn(OPS['persistence']['after'])}% (×{vn(OPS['persistence']['times'])})", {"bold": True})]],
     size=24, color=BODY)
rx = X0 + hw + GAP
y = section(y0, "05", "TRIỂN KHAI: VÒNG KHÉP KÍN", x=rx, w=hw)
loop = [("CUỐI GIỜ", "qr.png", "Quét QR, mở lại mô phỏng"),
        ("Ở NHÀ", "steps_w.png", "Làm bài theo bậc"),
        ("SÁNG HÔM SAU", "heat.png", "Bản đồ nhiệt lớp học")]
lw3 = (hw - 2 * 0.3) / 3
for i, (k, img, c) in enumerate(loop):
    x = rx + i * (lw3 + 0.3)
    box(s, x, y, lw3, 3.4, fill=PAPER, line=HAIR, radius=0.05)
    text(s, x + 0.25, y + 0.2, lw3 - 0.5, 0.45, [[(k, {"font": MONO, "bold": True})]], size=18, color=BLUE)
    pic(s, IMG + img, x + 0.25, y + 0.75, lw3 - 0.5, 1.85, border=HAIR)
    text(s, x + 0.25, y + 2.7, lw3 - 0.5, 0.65, c, size=21, color=BODY)
box(s, rx, y + 3.6, hw, 1.3, fill=AMBER_BG, line="F5D9A8", radius=0.08)
text(s, rx + 0.4, y + 3.6, hw - 0.8, 1.3,
     [[(f"Thí điểm {ST['weeks']} tuần: ", {"bold": True, "color": AMBER}),
       (f"{ST['lessons']} tiết · {vn(ST['tutorSessions'], 0)} phiên gia sư · ", {}), M("N"), (f" = {ST['N']} HS lớp {ST['grades']} · {ST['teachers']} GV", {})]],
     size=23, color=INK, anchor="m")

# ---- 06 KẾT QUẢ THÍ ĐIỂM | 07 XEM VÀ CHẠY THỬ
y0 = 40.8
y = section(y0, "06", f"KẾT QUẢ THÍ ĐIỂM (N = {ST['N']})", w=hw, color=GREEN)
cd = CategoryChartData()
parts = list(reversed(P["parts"]))
cd.categories = [x["short"] for x in parts]
cd.add_series(f"Đối chứng (n = {ST['n2']})", [x["control"] for x in parts])
cd.add_series(f"Thực nghiệm (n = {ST['n1']})", [x["exp"] for x in parts])
cwid = 8.9
gf = s.shapes.add_chart(XL_CHART_TYPE.BAR_CLUSTERED, Inches(X0), Inches(y - 0.05), Inches(cwid), Inches(4.2), cd)
gf.name = "Biểu đồ kết quả theo phần"
ch = gf.chart
ch.has_legend = True; ch.legend.include_in_layout = False
ch.legend.position = XL_LEGEND_POSITION.BOTTOM
ch.legend.font.size = Pt(16); ch.legend.font.color.rgb = rgb(BODY)
plot = ch.plots[0]
plot.gap_width = 50; plot.overlap = -8
plot.has_data_labels = True
dl = plot.data_labels
dl.number_format = "0.0"; dl.number_format_is_linked = False
dl.position = XL_LABEL_POSITION.OUTSIDE_END
dl.font.size = Pt(16); dl.font.bold = True; dl.font.color.rgb = rgb(INK)
for ser, col in zip(plot.series, ["C9C4BA", NAVY]):
    ser.format.fill.solid(); ser.format.fill.fore_color.rgb = rgb(col)
va = ch.value_axis
va.maximum_scale = 100; va.minimum_scale = 0
va.major_gridlines.format.line.color.rgb = rgb(HAIR)
va.tick_labels.font.size = Pt(13); va.tick_labels.font.color.rgb = rgb(MUTED)
va.format.line.fill.background()
ch.category_axis.tick_labels.font.size = Pt(17)
ch.category_axis.tick_labels.font.color.rgb = rgb(INK)
ch.category_axis.format.line.color.rgb = rgb(HAIR)
sx = X0 + cwid + 0.25; sw2 = hw - cwid - 0.25
box(s, sx, y, sw2, 4.1, fill=NAVY, radius=0.06)
text(s, sx + 0.35, y + 0.25, sw2 - 0.7, 0.5, [[("ĐIỂM BÀI SAU · THANG 10", {"font": MONO, "bold": True})]], size=17, color="FFEA00")
text(s, sx + 0.35, y + 0.75, sw2 - 0.7, 0.9, [[(vn(SC["post"]["exp"]["mean"], 2), {"font": MONO, "bold": True})],],
     size=50, color=WHITE)
text(s, sx + 0.35, y + 1.65, sw2 - 0.7, 0.5, [[(f"± {vn(SC['post']['exp']['sd'], 2)} · đối chứng {vn(SC['post']['control']['mean'], 2)}", {})]], size=19, color="C9C4BA")
text(s, sx + 0.35, y + 2.25, sw2 - 0.7, 0.5, [[(f"+{vn(SC['growth']['exp']['pts'], 2)} điểm (+{vn(SC['growth']['exp']['pct'])}%)", {"bold": True})]], size=22, color=WHITE)
text(s, sx + 0.35, y + 2.9, sw2 - 0.7, 1.0, [[M("d", color="FFEA00"), (f" = {vn(SC['cohenD'], 2)}", {"color": "FFEA00"})],
                                           [M("p", color="FFEA00"), (f" = {SC['post']['p'].replace('.', ',')}", {"color": "FFEA00"})]],
     size=24, color="FFEA00")
y = section(y0, "07", "XEM VÀ CHẠY THỬ", x=rx, w=hw)
qr = 2.75
box(s, rx, y, qr, qr, fill=WHITE, line=HAIR, radius=0.04)
s.shapes.add_picture(IMG + "qr-video.png", Inches(rx + 0.2), Inches(y + 0.1), Inches(qr - 0.4), Inches(qr - 0.4))
text(s, rx, y + qr - 0.32, qr, 0.3, [[("Quét xem video", {"font": MONO, "bold": True})]], size=15, color=NAVY, align="c")
text(s, rx + qr + 0.4, y, hw - qr - 0.4, qr,
     [[("Không để AI suy nghĩ thay học sinh. ", {}),
       ("Dùng AI để đánh thức nhà khoa học bên trong mỗi em.", {"italic": True, "color": AMBER})]],
     size=31, color=NAVY, font=SERIF, line_spacing=1.08, anchor="m")
fb = P["feedback"][1]
box(s, rx, y + 3.0, hw, 1.1, fill=PAPER, line=HAIR, radius=0.08)
text(s, rx + 0.35, y + 3.0, hw - 0.7, 1.1, [[(f"“{fb['short']}” ", {"italic": True, "font": SERIF}),
                                              (f"— {fb['who']}", {"size": 17, "color": MUTED})]],
     size=21, color=INK, anchor="m")

prs.save(OUT)
print("saved", OUT)
