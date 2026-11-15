# Cập nhật poster ViSEF Socratic Vision Board: TONG_THE_3_TAM.pptx (giữ nguyên) → TONG_THE_3_TAM_v2.pptx
#   ① thêm bối cảnh Việt Nam (Bộ GD&ĐT đặt hàng gia sư AI)   ② ảnh so sánh với bảng AI iFLYTEK + dòng iFLYTEK trong bảng
#   ⑧ ảnh phòng thực hành ảo 3D   ⑨ và ô "Kho mã hiện tại": số đếm lại từ mã nguồn
# Chạy: python -X utf8 sua_poster.py <số phép thử tự động đang qua>      (ảnh: chup_anh.cjs rồi cat_anh.py)
import copy, os, sys
from PIL import Image
from pptx import Presentation
from pptx.util import Emu

HERE = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(HERE, "assets")
TESTS = int(sys.argv[1])
PRESETS, LAB = 215, 117      # Object.keys(PRESETS).length; LESSONS trong labLessons.ts (15/11/2026)
CM = 360000

prs = Presentation(os.path.join(HERE, "TONG_THE_3_TAM.pptx"))
slide = prs.slides[0]
by = {s.shape_id: s for s in slide.shapes}
cm = lambda v: Emu(round(v * CM))


def say(i, *runs):
    """Đổi chữ từng run của đoạn đầu, giữ nguyên định dạng."""
    rs = by[i].text_frame.paragraphs[0].runs
    assert len(rs) == len(runs), (i, len(rs))
    for r, t in zip(rs, runs):
        if t is not None:
            r.text = t


def place(i, y, h=None):
    by[i].top = cm(y)
    if h is not None:
        by[i].height = cm(h)


def clone(i, x=None, y=None, text=None):
    el = copy.deepcopy(by[i]._element)
    by[i]._element.addnext(el)
    s = next(sh for sh in slide.shapes if sh._element is el)
    if x is not None: s.left = cm(x)
    if y is not None: s.top = cm(y)
    if text is not None: s.text_frame.paragraphs[0].runs[0].text = text
    return s


def picture(path, x, y, w, h, before):
    """Chèn ảnh đúng khung (cắt giữa cho khớp tỉ lệ), đặt ngay dưới shape `before` trong thứ tự lớp."""
    im = Image.open(path)
    r = w / h
    iw, ih = im.size
    if iw / ih > r: nw = round(ih * r); im = im.crop(((iw - nw) // 2, 0, (iw - nw) // 2 + nw, ih))
    else: nh = round(iw / r); im = im.crop((0, (ih - nh) // 2, iw, (ih - nh) // 2 + nh))
    tmp = os.path.join(A, "_" + os.path.basename(path)); im.save(tmp)
    p = slide.shapes.add_picture(tmp, cm(x), cm(y), cm(w), cm(h))
    before._element.addprevious(p._element)
    return p


# ---- tên dự án ghi đúng như trang bìa báo cáo
say(368, "Bảng tương tác thông minh & gia sư Socratic Toán – Lý – Hóa – Sinh THPT")

# ---- ① bối cảnh trong nước thay ô số liệu thiếu niên Mỹ
say(44, "≥ 95 %")
say(45, "tỉ lệ phản hồi đúng Bộ GD&ĐT yêu cầu khi đặt hàng gia sư AI tiếng Việt cho phổ thông")
say(46, "(VietnamPlus, 6/11/2026)")

# ---- ② ảnh đối chiếu thay biểu đồ khảo sát (hai số của biểu đồ đã có ở ①, hai số còn lại ở dòng tiêu đề)
say(102, "85,4 % học sinh khó ở câu Đúng/Sai, 88,6 % muốn nét vẽ thành mô phỏng; 77,8 % giáo viên chỉ dùng màn hình lớn để trình chiếu")
chart = by[104]
H = 5.0
ifly = Image.open(f"{A}/chup/ifly-435.png").crop((0, 470, 1080, 1070)); ifly.save(f"{A}/iflytek_hd.png")
Image.open(f"{A}/chup/demo-10d-90.png").convert("RGB").crop((232, 70, 1712, 690)).save(f"{A}/bang_rlc_gon.png")
w1, w2 = H * 1080 / 600, H * 1480 / 620
x0 = 6.2 + (27.5 - w1 - w2 - 0.6) / 2
picture(f"{A}/iflytek_hd.png", x0, 42.85, w1, H, chart)
ours = picture(f"{A}/bang_rlc_gon.png", x0 + w1 + 0.6, 42.85, w2, H, chart)
ours.line.color.rgb = by[119].fill.fore_color.rgb; ours.line.width = Emu(9525)
chart._element.getparent().remove(chart._element)
by[103].height = cm(5.75)
place(105, 47.9)
say(105, "Trái: bảng AI iFLYTEK, viết công thức ra đồ thị (ảnh cắt từ video giới thiệu của hãng). Phải: Socratic Vision Board (ảnh: nhóm tác giả).")

T0, RH = 48.55, 0.95                       # bảng so sánh: thêm dòng iFLYTEK, dòng thấp hơn để vừa khối
place(106, T0, 6.05); place(107, T0, 1.3)
for i in (108, 109, 110, 111): place(i, T0, 1.3)
row = lambda k: T0 + 1.3 + k * RH
def mid(i, k):
    place(i, row(k) + (RH - by[i].height / CM) / 2)
    ring = by.get(i - 1)                    # vòng tròn nền của biểu tượng là shape ngay trước nó
    if ring is not None and ring.name.startswith("Oval"):
        place(i - 1, row(k) + (RH - ring.height / CM) / 2)
for k, (txt, cells, line) in enumerate([(112, (114, 116, 118), 119), (120, (122, 124, 126), 127), (128, (130, 131, 132), None)]):
    place(txt, row(k), RH)
    for c in cells: mid(c, k)
    if line: place(line, row(k) + RH - 0.015)
sep = clone(127, y=row(2) + RH - 0.015)
clone(128, y=row(3), text="Bảng AI iFLYTEK")
dx = (by[135].left - by[123].left) / CM          # cột 2 → cột 1
for src in (123, 124):                            # vòng xanh + dấu tích của dòng "Gia sư AI gợi mở"
    t = clone(src, x=by[src].left / CM + dx)
    t.top = cm(row(3) + (RH - t.height / CM) / 2)
for src in (131, 132):
    q = clone(src, text="?"); q.top = cm(row(3) + (RH - q.height / CM) / 2)
clone(127, y=row(3) + RH - 0.015)
place(133, row(4) - 0.03, 1.0); place(134, row(4), RH)
for c in (136, 138, 140): mid(c, 4)
place(141, row(5) + 0.02)
say(141, "Tổng hợp: nhóm tác giả từ Bastani và cs. (2025), Kestin và cs. (2025), video giới thiệu của iFLYTEK. — : không áp dụng; ? : chưa thấy công bố.")
for i in (142, 143, 144): place(i, row(5) + 0.65, 1.5)
say(144, None, "chưa có hệ thống dựng mô hình từ chính nét viết của giáo viên, chạy trên màn hình sẵn có của trường và kèm gia sư không giải hộ.")

# ---- ô "Kho mã hiện tại": đếm lại ngày 15/11/2026
vn = lambda n: f"{n:,}".replace(",", ".")
say(711, "Kho mã hiện tại (quét ngày 15/11/2026)")
say(714, vn(PRESETS)); say(715, "mô phỏng mẫu theo sách giáo khoa"); by[715].left = cm(47.5)   # số ngắn hơn bản cũ, kéo nhãn lại gần
say(718, vn(TESTS))
say(722, vn(LAB)); say(723, "bài thực hành ảo 3D theo SGK")

# ---- ⑧ ảnh thứ hai: phòng thực hành ảo 3D (tính năng bổ sung sau thử nghiệm)
old = by[858]
picture(f"{A}/lab_can.png", old.left / CM, old.top / CM, old.width / CM, old.height / CM, old)
old._element.getparent().remove(old._element)
say(859, "Phòng thực hành ảo 3D (bổ sung sau thử nghiệm)")
say(860, "Ảnh chụp màn hình hệ thống đang chạy: bảng lớp và phòng thực hành ảo. Ảnh: nhóm tác giả.")

# ---- ⑨ hạn chế 3 nêu rõ quy mô phần chưa đo
say(907, f"{vn(LAB)} bài thực hành ảo 3D bổ sung sau thử nghiệm chưa đo trên học sinh; điều khiển bằng bàn tay qua webcam chưa thử trong lớp")
say(911, "Thử nghiệm bằng kho mã hiện tại, thử webcam trong tiết dạy, đo thêm tỉ lệ đọc đúng")

out = os.path.join(HERE, "TONG_THE_3_TAM_v2.pptx")
prs.save(out)
print("saved", out)
