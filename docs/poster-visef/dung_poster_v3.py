# -*- coding: utf-8 -*-
"""Poster ViSEF Socratic Vision Board, bản v3: chữ lớn, ít chữ, số liệu làm tâm điểm. Dựng từ đầu bằng python-pptx.
Khổ trang 134 x 89 cm = ba tấm ở tỉ lệ 1:2 (trái 30x60, giữa 60x75, phải 30x60), in phóng 200 %. Cỡ chữ ghi ở tỉ lệ 1:2.
Bố cục: tấm trái ①②③④ (trang 1) · tấm giữa dải tên, ⑤⑥⑦, số liệu sản phẩm · tấm phải ⑧⑨.
Chạy: python -X utf8 dung_poster_v3.py        (cần assets/ từ chup_anh.cjs + cat_anh.py; số liệu: báo cáo BAO_CAO_HOAN_CHINH.docx)
"""
import io, os, sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "slide-du-thi")))
import kit as _kit                                    # hàm vẽ dùng chung của bộ slide/poster dự thi (đơn vị inch)
from kit import rgb, WHITE
from PIL import Image
from pptx import Presentation
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE, XL_LABEL_POSITION, XL_LEGEND_POSITION
from pptx.enum.shapes import MSO_SHAPE
from pptx.util import Emu, Inches, Pt

# poster này vẽ theo cm ở tỉ lệ 1:2 → đổi sang inch cho kit
_I = 1 / 2.54
box = lambda sl, x, y, w, h, **k: _kit.box(sl, x * _I, y * _I, w * _I, h * _I, **k)
text = lambda sl, x, y, w, h, paras, **k: _kit.text(sl, x * _I, y * _I, w * _I, h * _I, paras, **k)
dot = lambda sl, x, y, d, color: _kit.dot(sl, x * _I, y * _I, d * _I, color)

HERE = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(HERE, "assets") + "/"
NAVY, BLUE, ORANGE, DORANGE, YEL = "0B2A5B", "1F5FBF", "F28C1B", "D9731A", "FFD23F"
INK, BODY, MUTED, HAIR, SKY, PEACH, PANEL, GREEN, RED = "111827", "374151", "6B7280", "D5DDEA", "E6EEFB", "FDEEDC", "F5F8FD", "12805C", "C2410C"
F, FB = "Segoe UI", "Segoe UI Black"

prs = Presentation()
prs.slide_width, prs.slide_height = Emu(int(134 * 360000)), Emu(int(89 * 360000))
s = prs.slides.add_slide(prs.slide_layouts[6])


def T(x, y, w, h, paras, size=16, color=INK, bold=False, align="l", anchor="t", font=F, ls=1.08):
    """Chữ: paras là chuỗi hoặc danh sách đoạn; đoạn là chuỗi hoặc danh sách (chữ, tùy chọn)."""
    if isinstance(paras, str):
        paras = [[(paras, {"bold": bold})]]
    paras = [[(r, {"bold": bold}) if isinstance(r, str) else r for r in (p if isinstance(p, list) else [p])] for p in paras]
    return text(s, x, y, w, h, paras, size=size, color=color, font=font, align=align, anchor=anchor, line_spacing=ls)


def grad(shp, c1, c2, angle=0):
    shp.fill.gradient(); shp.fill.gradient_angle = angle
    st = shp.fill.gradient_stops; st[0].color.rgb = rgb(c1); st[1].color.rgb = rgb(c2)


def img(path, x, y, w, h, fy=.5, line=None):
    """Ảnh phủ kín khung (cắt giữa theo tỉ lệ, fy = vị trí cắt dọc 0..1)."""
    im = Image.open(path).convert("RGB"); iw, ih = im.size; r = w / h
    if iw / ih > r:
        nw = round(ih * r); l = (iw - nw) // 2; im = im.crop((l, 0, l + nw, ih))
    else:
        nh = round(iw / r); t = round((ih - nh) * fy); im = im.crop((0, t, iw, t + nh))
    b = io.BytesIO(); im.save(b, "PNG"); b.seek(0)
    p = s.shapes.add_picture(b, Inches(x / 2.54), Inches(y / 2.54), Inches(w / 2.54), Inches(h / 2.54))
    if line:
        p.line.color.rgb = rgb(line); p.line.width = Pt(1)
    return p


def head(x, y, w, n, title):
    b = box(s, x, y, w, 2.4, fill=NAVY, radius=.5); grad(b, NAVY, BLUE)
    dot(s, x + .35, y + .35, 1.7, ORANGE)
    T(x + .35, y + .35, 1.7, 1.7, [[(str(n), {"bold": True})]], size=24, color=WHITE, align="c", anchor="m")
    T(x + 2.5, y, w - 3, 2.4, [[(title, {"bold": True})]], size=30, color=WHITE, anchor="m")


def card(x, y, w, h, fill=WHITE, line=HAIR, r=.05):
    return box(s, x, y, w, h, fill=fill, line=line, radius=r)


def src(x, y, w, t, size=11.5):
    T(x, y, w, .8, [[(t, {"italic": True})]], size=size, color=MUTED)


# ---------------------------------------------------------------- nền và ba tấm
box(s, 0, 0, 134, 89, fill="D9E0EC")
box(s, 0, 82.5, 134, 6.5, fill="B9C4D6")
L0, R0, LW = 6.2, 100.2, 27.6
for px, py, pw, ph in [(5, 22.5, 30, 60), (37, 7.5, 60, 75), (99, 22.5, 30, 60)]:
    box(s, px, py, pw, ph, fill=PANEL, line=HAIR)

# ---------------------------------------------------------------- dải tên (tấm giữa)
b = box(s, 37, 7.5, 60, 15, fill=NAVY); grad(b, "081F47", BLUE)
T(38.2, 8.3, 38, 1, [[("CUỘC THI KHOA HỌC KỸ THUẬT CẤP TỈNH DÀNH CHO HỌC SINH TRUNG HỌC · NĂM HỌC 2026–2027", {"bold": True})]], size=15, color="BBD0F5")
T(38.2, 9.3, 38.5, 3.8, [[("SOCRATIC VISION BOARD", {"bold": True})]], size=80, color=WHITE, font=FB)
T(38.2, 13.4, 38.6, 1.7, "Bảng tương tác thông minh & gia sư Socratic Toán – Lý – Hóa – Sinh THPT", size=26, color=WHITE)
box(s, 38.2, 15.3, 12.5, 1.6, fill=ORANGE, radius=.5)
T(38.2, 15.3, 12.5, 1.6, [[("Lĩnh vực: Máy tính", {"bold": True})]], size=16, color=WHITE, align="c", anchor="m")
for i, (num, lab) in enumerate([("+0,92", "điểm so với\nđối chứng"), ("81,3 %", "lượt học\nkhông gọi AI"), ("98,0 %", "yêu cầu xin\nđáp án bị chặn")]):
    x = 38.2 + i * 12.6
    box(s, x, 17.5, 12.2, 4.4, fill="12356F", line="3A63A8", radius=.12)
    T(x + .3, 17.5, 7.0, 4.4, [[(num, {"bold": True})]], size=34, color=YEL, anchor="m", font=FB)
    T(x + 6.6, 17.5, 5.5, 4.4, lab.split("\n"), size=15.5, color="DCE8FB", anchor="m")
for i, (ph, tag) in enumerate([("tile_toan.png", "Toán"), ("tile_li.png", "Lí"), ("lab_hoa.png", "Phòng thực hành 3D"), ("lab_can.png", "Phòng thực hành 3D")]):
    x, y = 77.2 + (i % 2) * 9.3, 8.0 + (i // 2) * 6.6
    img(A + ph, x, y, 9.0, 6.3, fy=.45, line=WHITE)
    box(s, x + .25, y + .25, 1.9 if i < 2 else 7.2, .95, fill=NAVY, radius=.4)
    T(x + .25, y + .25, 1.9 if i < 2 else 7.2, .95, [[(tag, {"bold": True})]], size=13, color=WHITE, align="c", anchor="m")
T(77.2, 21.0, 18.6, .8, [[("Ảnh chụp màn hình hệ thống đang chạy. Ảnh: nhóm tác giả.", {"italic": True})]], size=11, color="BBD0F5")

# ================================================================ TẤM TRÁI (trang 1): ① ② ③ ④
y = 23.3
# ---- ① Lý do chọn đề tài
head(L0, y, LW, 1, "LÝ DO CHỌN ĐỀ TÀI"); y += 2.6
box(s, L0, y, LW, 1.5, fill=PEACH, radius=.3)
T(L0 + .5, y, LW - 1, 1.5, [[("Dùng AI nhiều hơn chưa chắc học tốt hơn.", {"bold": True})]], size=26, color=NAVY, anchor="m"); y += 1.8
for i, (num, lab, sub, col) in enumerate([
        ("−17 %", "điểm kiểm tra độc lập của nhóm dùng GPT-4 không rào chắn", "dù điểm luyện tập tăng 48 % (Bastani và cs., 2025)", DORANGE),
        ("64,1 %", "học sinh chép đáp án AI mà không kiểm tra lại", "Khảo sát 412 học sinh, Vĩnh Phúc – Phú Thọ", BLUE)]):
    x = L0 + i * 14.2
    card(x, y, 13.4, 7.3)
    box(s, x, y, 13.4, .5, fill=col)
    T(x + .4, y + .55, 12.6, 3.0, [[(num, {"bold": True})]], size=70, color=col, font=FB, anchor="m")
    T(x + .5, y + 3.6, 12.4, 2.0, lab, size=19, bold=True, ls=1.02)
    T(x + .5, y + 5.6, 12.4, 1.6, sub, size=14.5, color=MUTED, ls=1.02)
y += 7.6
box(s, L0, y, LW, 2.1, fill=NAVY, radius=.15)
T(L0 + .5, y, LW - 1, 2.1, [[("11/2026: Bộ GD&ĐT đặt hàng gia sư AI tiếng Việt cho phổ thông", {"bold": True, "color": WHITE})],
                           [("VietnamPlus, 06/11/2026", {"size": 12, "color": "BBD0F5"})]], size=17.5, anchor="m", ls=1.0); y += 2.5

# ---- ② Thực trạng và khoảng trống
head(L0, y, LW, 2, "THỰC TRẠNG VÀ KHOẢNG TRỐNG"); y += 2.7
for i, (num, lab) in enumerate([("88,6 %", "học sinh muốn nét vẽ thành mô phỏng"), ("85,4 %", "học sinh khó ở câu Đúng/Sai"), ("77,8 %", "giáo viên chỉ dùng màn hình lớn để trình chiếu")]):
    x = L0 + i * 9.4
    card(x, y, 8.8, 4.4)
    T(x + .3, y + .05, 8.2, 2.1, [[(num, {"bold": True})]], size=40, color=BLUE, font=FB, anchor="m")
    T(x + .35, y + 2.1, 8.2, 2.2, lab, size=15.5, color=BODY, ls=1.02)
y += 4.7
img(A + "iflytek_hd.png", L0 + 1.7, y, 9.4, 4.2, line=HAIR)
img(A + "bang_rlc_gon.png", L0 + 11.6, y, 10.0, 4.2, line=HAIR); y += 4.25
src(L0, y, LW, "Trái: bảng AI iFLYTEK (cắt từ video của hãng). Phải: Socratic Vision Board. Ảnh: nhóm tác giả."); y += 1.0
ty = y
card(L0, ty, LW, 5.8, r=.03)
b = box(s, L0, ty, LW, 1.5, fill=NAVY, radius=.2); grad(b, NAVY, BLUE)
for cx, lab in [(L0 + .4, "Giải pháp"), (L0 + 10.6, "Dựng mô hình\ntừ nét viết"), (L0 + 15.8, "Không đưa\nthẳng đáp án"), (L0 + 21.4, "Kiểm chứng\nbằng công cụ")]:
    T(cx, ty, 5.6 if cx > L0 + 1 else 10, 1.5, [[(t, {"bold": True})] for t in lab.split("\n")], size=13.5, color=WHITE, anchor="m", align="l" if cx < L0 + 1 else "c", ls=1.0)
for k, (nm, ms) in enumerate([("Chatbot AI", "✕✕✕"), ("Gia sư AI gợi mở", "✕✓✕"), ("Bảng AI iFLYTEK", "✓??"), ("Socratic Vision Board", "✓✓✓")]):
    ry = ty + 1.5 + k * 1.05
    mine = k == 3
    if mine:
        box(s, L0 + .1, ry, LW - .2, 1.05, fill=PEACH, radius=.2)
    T(L0 + .4, ry, 10.2, 1.05, [[(nm, {"bold": mine})]], size=16.5, color=NAVY if mine else INK, anchor="m")
    for j, m in enumerate(ms):
        T(L0 + 10.6 + j * 5.4 + (0 if j == 0 else .2), ry, 5.6, 1.05,
          [[(m, {"bold": True, "color": {"✓": GREEN, "✕": RED, "?": MUTED}[m]})]], size=24, align="c", anchor="m", font="Segoe UI Symbol")
y = ty + 5.7
src(L0, y, LW, "✓ có · ✕ không · ? chưa thấy công bố. Tổng hợp: nhóm tác giả (Bastani 2025, Kestin 2025, iFLYTEK)."); y += 1.1
box(s, L0, y, LW, 2.2, fill=PEACH, radius=.1); box(s, L0, y, .35, 2.2, fill=DORANGE)
T(L0 + .8, y, LW - 1.2, 2.2, [[("Khoảng trống: ", {"bold": True, "color": DORANGE}), ("chưa thấy hệ thống nào vừa dựng mô phỏng từ nét viết, vừa kèm gia sư không giải hộ và có đo đối chứng.", {"bold": True})]], size=17, anchor="m", ls=1.02); y += 2.6

# ---- ③ Câu hỏi nghiên cứu
head(L0, y, LW, 3, "CÂU HỎI NGHIÊN CỨU"); y += 2.6
box(s, L0, y, LW, 1.9, fill=ORANGE, radius=.2)
T(L0 + .5, y, 22.2, 1.9, [[("Có AI bên cạnh, học sinh vẫn tự nghĩ được không?", {"bold": True})]], size=21, color=WHITE, anchor="m")
T(L0 + 22.4, y, 4.9, 1.9, [[("trả lời ở ⑧", {"bold": True})]], size=13.5, color=NAVY, anchor="m", align="r"); y += 2.2
for i, (ch, ti, sub) in enumerate([
        ("CH1", "Hơn bao nhiêu điểm?", "Sau 8 tuần, nhóm dùng hệ thống hơn nhóm đối chứng bao nhiêu điểm?"),
        ("CH2", "Trường nào cũng tiến bộ?", "Trường chuyên, thành phố, tuyến huyện có cùng tiến bộ không?"),
        ("CH3", "Lượt nào không cần AI?", "Bao nhiêu % lượt tự học xử lý được mà không gọi mô hình AI?"),
        ("CH4", "Chặn được bao nhiêu?", "Bao nhiêu % yêu cầu xin đáp án bị gia sư chặn?")]):
    x, yy = L0 + (i % 2) * 14.2, y + (i // 2) * 3.8
    card(x, yy, 13.4, 3.5, r=.08)
    box(s, x + .35, yy + .3, 2.3, 1.0, fill=NAVY, radius=.4)
    T(x + .35, yy + .3, 2.3, 1.0, [[(ch, {"bold": True})]], size=15, color=WHITE, align="c", anchor="m")
    T(x + 2.9, yy + .25, 10.4, 1.1, [[(ti, {"bold": True})]], size=18.5, color=NAVY, anchor="m")
    T(x + .4, yy + 1.45, 12.6, 2.0, sub, size=15.5, color=BODY, ls=1.0)
y += 7.6

# ---- ④ Phương pháp nghiên cứu
head(L0, y, LW, 4, "PHƯƠNG PHÁP NGHIÊN CỨU"); y += 2.6
for i, (num, lab) in enumerate([("412", "học sinh"), ("18", "giáo viên"), ("12", "lớp, 3 trường"), ("8", "tuần")]):
    x = L0 + i * 6.95
    card(x, y, 6.6, 2.8, r=.1)
    T(x, y + .05, 6.6, 1.7, [[(num, {"bold": True})]], size=36, color=BLUE, align="c", anchor="m", font=FB)
    T(x, y + 1.75, 6.6, .9, lab, size=14, color=BODY, align="c")
y += 3.0
for k, t in enumerate(["208 thực nghiệm, 204 đối chứng; mỗi trường 2 lớp mỗi nhóm", "Đề cùng ma trận, thi giấy, rọc phách, chấm mù",
                       "Mô hình đa mức theo lớp; nhật ký 96 tiết, 15.798 lượt tự học"]):
    T(L0, y + k * 1.05, LW, 1.0, [[("▪ ", {"color": ORANGE, "bold": True}), (t, {})]], size=16.5, color=INK, anchor="m")
T(L0, y + 3.2, LW, .9, [[("Nghiên cứu thăm dò: chọn lớp theo phòng có màn hình, không ngẫu nhiên.", {"italic": True})]], size=13, color=MUTED, anchor="m")

# ================================================================ TẤM GIỮA: ⑤ ⑥ ⑦ + số liệu sản phẩm
C0, CWF = 38.2, 57.6
IMG = os.path.join(HERE, "..", "..", "slide-du-thi", "img") + "/"


def badge(x, y, d, n, col=BLUE, size=16):
    dot(s, x, y, d, col)
    T(x, y, d, d, [[(str(n), {"bold": True})]], size=size, color=WHITE, align="c", anchor="m")


def contain(path, x, y, w, h, bg=SKY):
    """Ảnh nguyên khung (không cắt), đặt giữa nền màu: dùng cho ảnh điện thoại dọc."""
    box(s, x, y, w, h, fill=bg, line=HAIR, radius=.03)
    iw, ih = Image.open(path).size; k = min(w / iw, h / ih)
    s.shapes.add_picture(path, Inches((x + (w - iw * k) / 2) / 2.54), Inches((y + (h - ih * k) / 2) / 2.54), Inches(iw * k / 2.54), Inches(ih * k / 2.54))


# ảnh chuẩn bị sẵn: bỏ viền đen của khung quay dọc; cắt vùng có mã QR; cắt phần chữ viết tay của ảnh chấm bài
_g = Image.open(A + "hs_dienthoai.png").convert("L").point(lambda v: 255 if v > 40 else 0).getbbox()
Image.open(A + "hs_dienthoai.png").convert("RGB").crop((_g[0], 0, _g[2], Image.open(A + "hs_dienthoai.png").size[1] // 2)).save(A + "_hs_dt.png")   # nửa trên: các bước làm bài
Image.open(A + "gv_console.png").convert("RGB").crop((60, 80, 1640, 830)).save(A + "_gv.png")
Image.open(A + "bang_buoc.png").convert("RGB").crop((0, 0, 1000, 694)).save(A + "_buoc.png")


def head2(x, y, w, n, title, note):
    """Đầu mục nổi bật (cam) cho hai khối chính ⑥ ⑦."""
    b = box(s, x, y, w, 2.6, fill=ORANGE, radius=.5); grad(b, "F5A524", "D9531A")
    badge(x + .4, y + .45, 1.7, n, NAVY, 24)
    T(x + 2.6, y, 22, 2.6, [[(title, {"bold": True})]], size=34, color=WHITE, anchor="m")
    T(x + w - 29, y, 28.4, 2.6, note, size=13, color="FFF1DC", anchor="m", align="r")


# ---- ⑤ Quy trình nghiên cứu: dải ngang
head(C0, 23.4, CWF, 5, "QUY TRÌNH NGHIÊN CỨU")
box(s, C0 + 1.0, 27.0, CWF - 2.4, .16, fill=HAIR)
for i, (t, d) in enumerate([("Khảo sát", "412 học sinh, 18 giáo viên · 01–06/09"), ("Thiết kế hệ thống", "Ba ứng dụng web và máy chủ AI có SymPy"),
                            ("Thử nghiệm đối chứng", "8 tuần · 07/09–31/10 · 12 lớp"), ("Phân tích số liệu", "Mô hình đa mức, khoảng tin cậy 95 %"),
                            ("Hoàn thiện", "Tái cấu trúc mã, 153 lần cập nhật từ 18/10")]):
    x = C0 + i * 11.52
    badge(x + .2, 26.2, 1.6, i + 1, ORANGE if i == 2 else BLUE, 20)
    T(x + .2, 28.0, 11.0, 1.0, [[(t, {"bold": True})]], size=19, color=NAVY, anchor="m")
    T(x + .2, 29.0, 10.9, 2.2, d, size=15, color=BODY, ls=1.02)

# ---- ⑥ Sơ đồ cấu tạo (toàn chiều ngang, hai khối chính của poster)
box(s, 37.7, 32.0, 58.6, 20.9, fill=WHITE, line=ORANGE, radius=.02, lw=3)
head2(C0, 32.4, CWF, 6, "SƠ ĐỒ CẤU TẠO", "Ảnh chụp màn hình: nhóm tác giả · số trong vòng xanh dùng chung với ⑦")
apps = [("1", "Trang soạn bài", "giáo viên: soạn bài, ghép tiết, giao bài, xem lớp", "gv_console.png", .5),
        ("2", "Bảng tương tác", "viết tay, khoanh vùng, dựng mô phỏng ngay trên bảng", "bang_conlac.png", .5),
        ("3", "Phòng thực hành ảo 3D", "117 bài: cầm dụng cụ bằng tay qua webcam, đo, ghi số liệu", "lab_can.png", .5),
        ("4", "Gia sư Socratic", "điện thoại học sinh: quét QR, gợi ý từng bước", "hs_dienthoai.png", .22)]
for i, (n, nm, ds, ph, fy) in enumerate(apps):
    x, y0 = C0 + i * 14.6, 35.3
    card(x, y0, 13.8, 10.3, r=.05)
    if ph == "hs_dienthoai.png":
        contain(A + "_hs_dt.png", x + .2, y0 + .2, 13.4, 6.4)
    else:
        img(A + ("_gv.png" if ph == "gv_console.png" else ph), x + .2, y0 + .2, 13.4, 6.4, fy=fy, line=HAIR)
    badge(x + .35, y0 + 7.0, 1.5, n, BLUE, 18)
    T(x + 2.1, y0 + 6.85, 11.5, 1.8, [[(nm, {"bold": True})]], size=21, color=NAVY, anchor="m")
    T(x + .4, y0 + 8.6, 13.0, 1.6, ds, size=15.5, color=BODY, ls=1.0)
    ar = s.shapes.add_shape(MSO_SHAPE.UP_DOWN_ARROW, Inches((x + 6.2) / 2.54), Inches(45.75 / 2.54), Inches(1.4 / 2.54), Inches(1.65 / 2.54))
    ar.fill.solid(); ar.fill.fore_color.rgb = rgb(ORANGE); ar.line.fill.background()
sy = 47.55
box(s, C0, sy, CWF, 5.0, fill=SKY, line=BLUE, radius=.05, lw=1.5)
badge(C0 + .4, sy + .45, 1.7, 5, NAVY, 20)
T(C0 + 2.5, sy + .4, 8.2, 1.8, [[("MÁY CHỦ AI", {"bold": True})]], size=22, color=NAVY, anchor="m")
T(C0 + .5, sy + 2.5, 9.7, 2.3, ["FastAPI · SymPy", "một máy chủ phục vụ cả bốn ứng dụng"], size=13.5, color=BODY, ls=1.0)
for i, t in enumerate(["Đọc chữ viết tay (mô hình thị giác)", "Định tuyến mô phỏng tại chỗ", "Kiểm chứng đáp án bằng SymPy", "Chặn xin đáp án, gợi ý thay lời giải"]):
    x = C0 + 10.4 + i * 11.8
    box(s, x, sy + .65, 11.4, 3.7, fill=WHITE, line=HAIR, radius=.12)
    T(x + .4, sy + .65, 10.6, 3.7, t, size=16.5, color=INK, bold=True, anchor="m", ls=1.0)

# ---- ⑦ Nguyên lý hoạt động (toàn chiều ngang)
box(s, 37.7, 53.4, 58.6, 20.2, fill=WHITE, line=ORANGE, radius=.02, lw=3)
head2(C0, 53.7, CWF, 7, "NGUYÊN LÝ HOẠT ĐỘNG", "Đọc theo số bước 1 → 7 · số trong vòng xanh là bộ phận ở ⑥")
box(s, C0, 56.4, CWF, 1.7, fill=PEACH, radius=.2); box(s, C0, 56.4, .4, 1.7, fill=DORANGE)
T(C0 + .9, 56.4, CWF - 1.2, 1.7, [[("AI chỉ đọc chữ; mọi con số trên mô phỏng do công thức tính ra.", {"bold": True})]], size=20, color=INK, anchor="m")


def chip(x, y, w, t):
    box(s, x, y, w, .9, fill=NAVY, radius=.4)
    T(x, y, w, .9, [[(t, {"bold": True})]], size=14, color=WHITE, align="c", anchor="m")


chip(C0, 58.3, 4.8, "TRÊN LỚP")
rowA = [("Viết hoặc vẽ, khoanh vùng cần dựng", "lasso.png", "2"), ("Máy chủ đọc nét viết thành chữ và công thức", None, "5"),
        ("Dựng mô phỏng tại chỗ bằng công thức: RK4, VSEPR, Qp–Kp, mạch RLC", "tile_li.png", "2"),
        ("Mở phòng thực hành ảo 3D: cầm dụng cụ, đo số liệu bằng tay qua webcam", "lab_chuando.png", "3")]
for i, (t, ph, comp) in enumerate(rowA):
    x, y0 = C0 + i * 14.6, 59.3
    card(x, y0, 13.8, 6.3, r=.05)
    if ph:
        img((IMG if ph == "lasso.png" else A) + ph, x + .2, y0 + .2, 13.4, 3.7, fy=.5, line=HAIR)
    else:
        box(s, x + .2, y0 + .2, 13.4, 3.7, fill=SKY, radius=.06)
        T(x + .2, y0 + .25, 13.4, 1.1, "máy chủ đọc được:", size=13.5, color=MUTED, align="c", anchor="m")
        T(x + .2, y0 + 1.3, 13.4, 2.4, [[("v₀ = 24 m/s", {"bold": True})], [("α = 45°", {"bold": True})]], size=24, color=NAVY, align="c", anchor="m", font="Cambria Math", ls=1.0)
    badge(x + .4, y0 + .4, 1.5, i + 1, ORANGE, 18)
    badge(x + 13.8 - 1.9, y0 + .4, 1.5, comp, BLUE, 16)
    T(x + .4, y0 + 4.0, 13.0, 2.2, t, size=16.5, color=INK, anchor="m", ls=1.0)
chip(C0, 65.7, 4.8, "Ở NHÀ")
rowB = [("Quét QR, học lại: mỗi bước một gợi ý, không có đáp án", "_hs_dt.png", "4"),
        ("Xin đáp án: bị chặn, quay về gợi ý. Làm sai: mở công cụ trực quan", "hs_giasu.png", "5"),
        ("SymPy kiểm chứng; học sinh tự giải thích bằng lời, kết quả về giáo viên", "_buoc.png", "5")]
for i, (t, ph, comp) in enumerate(rowB):
    x, y0 = C0 + i * 19.6, 66.7
    card(x, y0, 18.4, 6.3, r=.05)
    if ph == "_hs_dt.png":
        contain(A + ph, x + .2, y0 + .2, 8.2, 5.9)
    else:
        img(A + ph, x + .2, y0 + .2, 8.2, 5.9, fy=.2, line=HAIR)
    badge(x + 8.8, y0 + .4, 1.5, i + 5, ORANGE, 18)                  # huy hiệu bước + bộ phận nằm cạnh ảnh, không che ảnh
    badge(x + 10.5, y0 + .4, 1.5, comp, BLUE, 16)
    T(x + 8.8, y0 + 2.1, 9.4, 4.1, t, size=17, color=INK, anchor="t", ls=1.02)

# ---- dải số liệu sản phẩm (đáy tấm giữa)
b = box(s, 37, 74.6, 60, 7.9, fill=NAVY); grad(b, "081F47", BLUE)
T(38.2, 74.8, 57, 1.2, [[("HỆ THỐNG ĐÃ ĐƯỢC ĐO TRONG LỚP HỌC THẬT · 412 học sinh, 8 tuần", {"bold": True})]], size=16, color="BBD0F5", anchor="m")
for i, (num, lab) in enumerate([("15.798", "lượt tự học ghi nhật ký trong 96 tiết"), ("1.504/1.535", "yêu cầu xin đáp án bị gia sư chặn"), ("4.041", "phép thử tự động, đều qua (15/11/2026)")]):
    x = 38.2 + i * 19.3
    T(x, 76.1, 18.6, 3.4, [[(num, {"bold": True})]], size=54, color=YEL, font=FB, anchor="m")
    T(x, 79.5, 18.6, 2.8, lab, size=18, color=WHITE, ls=1.0)

# ================================================================ TẤM PHẢI: ⑧ ⑨
head(R0, 23.3, LW, 8, "KẾT QUẢ THỰC NGHIỆM")
b = box(s, R0, 26.0, LW, 7.8, fill=NAVY, radius=.06); grad(b, "081F47", BLUE)
T(R0 + .5, 26.0, 14.8, 7.8, [[("+0,92", {"bold": True})]], size=90, color=YEL, font=FB, anchor="m")
T(R0 + 15.0, 26.4, 12.3, 4.3, [[("điểm (thang 10): nhóm thực nghiệm cao hơn đối chứng sau 8 tuần", {"bold": True})]], size=20, color=WHITE, anchor="m")
T(R0 + 15.0, 30.6, 12.3, 3.0, ["Đã tính đến điểm trước và lớp học", "p < 0,001 · d = 0,51", "KTC 95 %: 0,62–1,22 (n = 406)"], size=14.5, color="DCE8FB", anchor="t", ls=1.0)
card(R0, 34.2, LW, 8.2, r=.04)
T(R0 + .5, 34.3, LW - 1, 1.4, [[("Xuất phát ngang nhau; sau 8 tuần hơn 0,83 điểm (chưa hiệu chỉnh)", {"bold": True})]], size=15, color=NAVY, anchor="m")
cd = CategoryChartData(); cd.categories = ["Trước thử nghiệm", "Sau thử nghiệm"]
cd.add_series("Đối chứng (n = 201)", [6.05, 6.49]); cd.add_series("Thực nghiệm (n = 205)", [5.94, 7.32])
ch = s.shapes.add_chart(XL_CHART_TYPE.COLUMN_CLUSTERED, Inches((R0 + .3) / 2.54), Inches(35.7 / 2.54), Inches((LW - .6) / 2.54), Inches(6.0 / 2.54), cd).chart
ch.has_legend = True; ch.legend.position = XL_LEGEND_POSITION.BOTTOM; ch.legend.include_in_layout = False
ch.legend.font.size = Pt(14); ch.legend.font.color.rgb = rgb(BODY)
pl = ch.plots[0]; pl.gap_width = 60; pl.overlap = -5; pl.has_data_labels = True
dl = pl.data_labels; dl.number_format = "0.00"; dl.number_format_is_linked = False; dl.position = XL_LABEL_POSITION.OUTSIDE_END
dl.font.size = Pt(18); dl.font.bold = True; dl.font.color.rgb = rgb(INK)
for ser, col in zip(pl.series, ["9AA5B8", ORANGE]):
    ser.format.fill.solid(); ser.format.fill.fore_color.rgb = rgb(col)
for ser, vals in zip(pl.series, [("6,05", "6,49"), ("5,94", "7,32")]):      # nhãn số viết dấu phẩy, không phụ thuộc máy mở file
    for i, v in enumerate(vals):
        d = ser.points[i].data_label
        d.position = XL_LABEL_POSITION.OUTSIDE_END
        d.text_frame.text = v
        r = d.text_frame.paragraphs[0].runs[0]; r.font.size = Pt(18); r.font.bold = True; r.font.color.rgb = rgb(INK)
ch.value_axis.visible = False; ch.value_axis.has_major_gridlines = False; ch.value_axis.minimum_scale = 0; ch.value_axis.maximum_scale = 8.6
ch.category_axis.tick_labels.font.size = Pt(16); ch.category_axis.tick_labels.font.bold = True
ch.category_axis.format.line.color.rgb = rgb(HAIR)
src(R0 + .5, 41.5, LW - 1, "Biểu đồ: nhóm tác giả, 406 học sinh có đủ hai bài.", 11)
for i, (num, lab, col) in enumerate([("81,3 %", "lượt tự học không gọi mô hình AI (12.837/15.798)", BLUE), ("98,0 %", "yêu cầu xin đáp án bị chặn (1.504/1.535)", DORANGE)]):
    x = R0 + i * 14.2
    card(x, 42.8, 13.4, 5.6); box(s, x, 42.8, .45, 5.6, fill=col)
    T(x + .9, 43.0, 12.2, 2.6, [[(num, {"bold": True})]], size=54, color=col, font=FB, anchor="m")
    T(x + .9, 45.6, 12.2, 2.7, lab, size=16, color=BODY, ls=1.0)
T(R0, 48.8, LW, 1.2, [[("Cả ba mô hình trường đều tiến bộ (điểm hiệu chỉnh)", {"bold": True})]], size=16, color=NAVY, anchor="m")
for i, (num, lab) in enumerate([("+0,58", "Chuyên"), ("+1,09", "Công lập TP"), ("+1,08", "Tuyến huyện")]):
    x = R0 + i * 9.4
    card(x, 50.2, 8.8, 3.6, r=.1)
    T(x, 50.2, 8.8, 2.2, [[(num, {"bold": True})]], size=40, color=BLUE, align="c", anchor="m", font=FB)
    T(x, 52.3, 8.8, 1.3, lab, size=15, color=BODY, align="c")
box(s, R0, 54.2, LW, 2.5, fill=SKY, radius=.12)
T(R0 + .5, 54.2, LW - 1, 2.5, [[("Đúng/Sai tăng nhiều nhất: +15,0 % ", {"bold": True, "color": DORANGE}), ("thang phần (Trả lời ngắn +6,3 %, Trắc nghiệm +5,5 %)", {})]], size=16.5, color=INK, anchor="m")
box(s, R0, 57.1, LW, 5.0, fill=WHITE, line=NAVY, radius=.06); box(s, R0, 57.1, .5, 5.0, fill=DORANGE)
T(R0 + 1.0, 57.1, LW - 1.4, 5.0, [[("Có: ", {"bold": True, "color": DORANGE}), ("sau 8 tuần, nhóm thực nghiệm cao hơn đối chứng 0,92 điểm (p < 0,001) ở cả ba mô hình trường; 81,3 % lượt tự học không gọi AI; 98,0 % yêu cầu xin đáp án bị chặn.", {"bold": True})]], size=19.5, color=NAVY, anchor="m", ls=1.02)

head(R0, 62.6, LW, 9, "HẠN CHẾ VÀ HƯỚNG PHÁT TRIỂN")
for i, (lim, plan) in enumerate([("Chọn lớp theo phòng có màn hình, không ngẫu nhiên; chỉ 12 lớp", "Lặp lại với chia nhóm ngẫu nhiên, kéo dài một học kỳ"),
                                 ("Đọc chữ phụ thuộc mạng và hạn mức Gemini (1,5–9 s mỗi lượt)", "Đọc chữ viết tay ngay trên máy, mất mạng vẫn dùng được"),
                                 ("117 bài thực hành 3D điều khiển bằng tay: chưa đo hiệu quả, chưa thử webcam trong lớp", "Thử trong tiết dạy, đo thêm tỉ lệ đọc đúng và kết quả học")]):
    yy = 65.3 + i * 4.1
    box(s, R0, yy, 12.4, 3.8, fill="ECEFF4", radius=.1)
    T(R0 + .4, yy, 11.6, 3.8, lim, size=15.5, color=INK, anchor="m", ls=1.0)
    ar = s.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, Inches((R0 + 12.55) / 2.54), Inches((yy + 1.2) / 2.54), Inches(1.0 / 2.54), Inches(1.4 / 2.54))
    ar.fill.solid(); ar.fill.fore_color.rgb = rgb(ORANGE); ar.line.fill.background()
    box(s, R0 + 13.7, yy, 13.9, 3.8, fill=WHITE, line=HAIR, radius=.1); box(s, R0 + 13.7, yy, .4, 3.8, fill=BLUE)
    T(R0 + 14.4, yy, 13.0, 3.8, [[(plan, {"bold": True})]], size=15.5, color=NAVY, anchor="m", ls=1.0)
b = box(s, 99, 79.6, 30, 2.9, fill=NAVY); grad(b, NAVY, BLUE)
T(R0, 79.6, LW, 1.9, [[("Hiểu bản chất, không chép đáp án.", {"bold": True})]], size=26, color=WHITE, anchor="m")
T(R0, 81.4, LW, 1.0, "Mọi số liệu lấy từ báo cáo dự án. Ảnh, biểu đồ, sơ đồ: nhóm tác giả.", size=11, color="BBD0F5")

T(5, 83.6, 124, 1.2, "Bản xem tổng thể: tấm trái 60×120 · tấm giữa 120×150 · tấm phải 60×120 cm (thiết kế tỉ lệ 1:2)", size=12, color=BODY, align="c")
out = os.path.join(HERE, "TONG_THE_3_TAM_v3.pptx")
prs.save(out); print("saved", out)
