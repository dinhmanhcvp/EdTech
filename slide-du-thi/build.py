# -*- coding: utf-8 -*-
"""Dựng slide dự thi Socratic Vision Board trên mẫu BTC (base.pptx = mẫu + 11 bản sao slide nội dung)."""
import sys, copy, re
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE, XL_LABEL_POSITION, XL_LEGEND_POSITION
from PIL import Image

W = sys.argv[1]
OUT = sys.argv[2]
IMG = W + "/img/"
# ảnh thẻ vuông do anh_the.py tạo từ ảnh chân dung của tác giả
PORTRAIT = W + "/../Ho-so-du-thi-2026/anh-the/anh-the-vuong.png"
VIDEO_URL = "https://youtu.be/L6QS6LOGydE"  # mã QR tương ứng: img/qr-video.png

from kit import *
TOTAL = 15
ST, SC, OPS = P["study"], P["scores"], P["ops"]
PART2 = P["parts"][1]


def content_frame(slide, n, kicker, title, assertion):
    """Giữ tiêu đề + chân trang của mẫu BTC; thêm dòng kicker và câu khẳng định."""
    title_tb = None
    for sh in list(slide.shapes):
        if sh.has_text_frame and sh.text_frame.text.strip():
            if title_tb is None and abs(sh.top / 914400 - 1.1) < 0.05:
                title_tb = sh
            else:
                remove(sh)
    tf = title_tb.text_frame
    p = tf.paragraphs[0]
    for extra in tf.paragraphs[1:]:
        extra._p.getparent().remove(extra._p)
    runs = p.runs
    runs[0].text = title
    for r in runs[1:]:
        r._r.getparent().remove(r._r)
    title_tb.width = Inches(14)
    text(slide, 0.97, 0.55, 12, 0.35,
         [[(f"{n:02d} / {TOTAL}", {"font": MONO, "bold": True, "color": BLUE}),
           ("   ·   " + kicker, {"font": MONO, "color": MUTED})]], size=14)
    text(slide, 0.97, 2.02, 18.1, 0.9, [assertion], size=27, color=INK, font=SERIF, line_spacing=1.05)


def A(*parts):
    """Câu khẳng định: phần chẵn chữ thường, phần lẻ nhấn mạnh (nghiêng, màu)."""
    out = []
    for i, t in enumerate(parts):
        if isinstance(t, tuple):
            out.append((t[0], {"italic": True, "color": t[1]}))
        else:
            out.append(t)
    return out


prs = Presentation(W + "/base.pptx")
sl = list(prs.slides)
keep = [sl[0], sl[1]] + sl[3:15] + [sl[19]]
# xóa các slide hướng dẫn còn thừa của mẫu
sldIdLst = prs.slides._sldIdLst
for sid in list(sldIdLst):
    rid = sid.rId
    if prs.part.related_part(rid) not in [s.part for s in keep]:
        sldIdLst.remove(sid)
        prs.part.drop_rel(rid)
S = keep

# ============ 01 TIÊU ĐỀ ============
s = S[0]
for sh in list(s.shapes):
    if sh.has_text_frame and sh.text_frame.text.startswith("TÊN"):
        tf = sh.text_frame; r = tf.paragraphs[0].runs
        r[0].text = "SOCRATIC VISION BOARD"
        for x in r[1:]:
            x._r.getparent().remove(x._r)
        sh.top = Inches(3.55)
    elif sh.has_text_frame and sh.text_frame.text.startswith("Đơn vị"):
        paras = sh.text_frame.paragraphs
        # giữ định dạng: đoạn 1 = nhãn, đoạn 2 = tên đơn vị, các đoạn sau xóa
        paras[1].runs[0].text = "Trường THPT Chuyên Vĩnh Phúc"
        for x in paras[1].runs[1:]:
            x._r.getparent().remove(x._r)
        for p_ in paras[2:]:
            p_._p.getparent().remove(p_._p)
        para = sh.text_frame.add_paragraph()
        r = para.add_run(); r.text = "Giáo viên môn Tin học"
        ref = paras[1].runs[0].font
        r.font.size = ref.size; r.font.color.rgb = rgb(WHITE); r.font.name = ref.name or SANS
    elif sh.has_text_frame and sh.text_frame.text.startswith("Email"):
        paras = sh.text_frame.paragraphs
        last = paras[-1]
        last.runs[0].text = "kiempv@cvp.vn"
        for x in last.runs[1:]:
            x._r.getparent().remove(x._r)
        last.runs[0].font.color.rgb = rgb(WHITE)
    elif sh.shape_type == 6 and sh.top > Inches(7):
        # nhóm "Giáo viên thực hiện": đổi tên, thay ảnh mẫu bằng ảnh thẻ của tác giả (cắt tròn)
        g = sh
        xfrm = g._element.grpSpPr.find('{http://schemas.openxmlformats.org/drawingml/2006/main}xfrm')
        A_ = '{http://schemas.openxmlformats.org/drawingml/2006/main}'
        off, ext = xfrm.find(A_ + 'off'), xfrm.find(A_ + 'ext')
        choff, chext = xfrm.find(A_ + 'chOff'), xfrm.find(A_ + 'chExt')
        sx = int(ext.get('cx')) / int(chext.get('cx')); sy = int(ext.get('cy')) / int(chext.get('cy'))
        for c in list(g.shapes):
            if c.has_text_frame and "Thanh" in c.text_frame.text:
                rr = c.text_frame.paragraphs[0].runs
                rr[0].text = "Phùng Văn Kiệm"
                for x in rr[1:]:
                    x._r.getparent().remove(x._r)
            if c.shape_type == 6:  # ảnh chân dung mẫu
                ax = (int(off.get('x')) + (c.left - int(choff.get('x'))) * sx) / 914400
                ay = (int(off.get('y')) + (c.top - int(choff.get('y'))) * sy) / 914400
                aw = c.width * sx / 914400; ah = c.height * sy / 914400
                remove(c)
                d = min(aw, ah)
                portrait = s.shapes.add_picture(PORTRAIT, Inches(ax + (aw - d) / 2), Inches(ay + (ah - d) / 2),
                                                Inches(d), Inches(d))
                portrait.auto_shape_type = MSO_SHAPE.OVAL
                portrait.line.color.rgb = rgb(WHITE); portrait.line.width = Pt(2)
                portrait.name = "Ảnh tác giả"
text(s, 1.6, 4.72, 16.8, 1.0,
     [[("Bảng tương tác thông minh & gia sư Socratic cho Toán – Lý – Hóa – Sinh THPT: ", {}),
       ("AI biến nét phấn thành mô phỏng, nhưng không bao giờ giải hộ học sinh", {"italic": True, "color": AMBER})]],
     size=26, color=NAVY, font=SERIF, align="c", line_spacing=1.1)
cx = 10 - (3 * 3.9 + 2 * 0.25) / 2
for i, lab in enumerate(["BẢNG B · THPT", "LỚP HỌC SỐ TÍCH HỢP AI", "AI CÓ TRÁCH NHIỆM"]):
    chip(s, cx + i * 4.15, 5.98, lab, fg=BLUE, bg=WHITE, size=14, w=3.9)

# ============ 02 DÀN Ý ============
s = S[1]
for sh in list(s.shapes):
    if sh.has_text_frame and sh.text_frame.text.startswith("[Thêm"):
        remove(sh)
    elif sh.has_text_frame and sh.text_frame.text.startswith("Liệt kê"):
        remove(sh)
    elif sh.shape_type == 6:
        for c in sh.shapes:
            if c.has_text_frame:
                c.text_frame.text = ""
pic(s, IMG + "lasso.png", 1.45, 1.45, 6.95, 2.2, border=None)
arrow_y = 3.85
d = s.shapes.add_shape(MSO_SHAPE.DOWN_ARROW, Inches(4.7), Inches(arrow_y), Inches(0.45), Inches(0.55))
d.fill.solid(); d.fill.fore_color.rgb = rgb(AMBER); d.line.fill.background()
pic(s, IMG + "phys.png", 1.45, 4.55, 6.95, 4.75, border=HAIR)
text(s, 1.45, 9.4, 6.95, 0.4, [[("Nét viết tay → khoanh vùng → mô phỏng ném xiên 60 FPS", {"italic": True})]],
     size=15, color=MUTED, align="c")
items = [("01", "Bối cảnh và vấn đề", "03"),
         ("02", "Ý tưởng, kiến trúc và công cụ AI", "04–06"),
         ("03", "Trên lớp và 4 môn KHTN", "07–08"),
         ("04", "Khi tự học: gia sư Socratic", "09–10"),
         ("05", "Triển khai thực tế", "11"),
         ("06", "Kết quả và tác động", "12"),
         ("07", "So sánh, nhân rộng, tài liệu", "13–15")]
y = 2.15
for idx, label, pages in items:
    text(s, 10.95, y, 0.8, 0.5, [[(idx, {"font": MONO, "bold": True})]], size=22, color=BLUE)
    text(s, 11.8, y - 0.02, 6.2, 0.5, label, size=22, color=NAVY)
    text(s, 18.0, y + 0.04, 1.2, 0.5, [[(pages, {"font": MONO})]], size=15, color=MUTED, align="r")
    ln = s.shapes.add_connector(1, Inches(10.95), Inches(y + 0.8), Inches(19.2), Inches(y + 0.8))
    ln.line.color.rgb = rgb(HAIR); ln.line.width = Pt(1)
    y += 1.08

# ============ 03 BỐI CẢNH ============
s = S[2]
content_frame(s, 3, "BỐI CẢNH", "BỐI CẢNH VÀ VẤN ĐỀ",
              A("Dạy KHTN ở THPT đang kẹt giữa ", ("bảng chiếu tĩnh trên lớp", RED), " và ",
                ("AI giải hộ khi về nhà", RED)))
cards = [("01", "GIÁO VIÊN · TRÊN BỤC GIẢNG",
          "Màn hình tương tác chủ yếu dùng để chiếu slide.",
          f"Soạn một mô phỏng động mất trung bình {vn(OPS['prepMin']['before'])} phút mỗi tiết; không thể ứng biến theo câu hỏi của lớp."),
         ("02", "HỌC SINH · KHI TỰ HỌC",
          "Chatbot phổ thông giải trọn bài trong vài giây.",
          f"Trước thí điểm, {vn(100 - OPS['persistence']['before'])}% học sinh bỏ cuộc hoặc chép đáp án ngay sau lần sai đầu."),
         ("03", "NHÀ TRƯỜNG · HẠ TẦNG",
          "Công cụ sinh ảnh, video bằng AI chậm và tốn phí.",
          "Mỗi lượt phải chờ nhiều giây, tính tiền theo lượt: khó dùng giữa tiết, khó nhân rộng cho cả trường.")]
cw, gap, x0, y0, ch = 5.85, 0.45, 0.97, 3.25, 4.15
for i, (n, who, head, body) in enumerate(cards):
    x = x0 + i * (cw + gap)
    box(s, x, y0, cw, ch, fill=PAPER, line=HAIR, radius=0.04)
    text(s, x + 0.4, y0 + 0.35, 1.5, 0.8, [[(n, {"font": MONO, "bold": True})]], size=40, color=RED)
    text(s, x + 0.4, y0 + 1.25, cw - 0.8, 0.4, [[(who, {"font": MONO, "bold": True})]], size=14, color=MUTED)
    text(s, x + 0.4, y0 + 1.7, cw - 0.8, 0.9, [[(head, {"bold": True})]], size=22, color=INK)
    text(s, x + 0.4, y0 + 2.6, cw - 0.8, 1.5, body, size=18, color=BODY, line_spacing=1.15)
# dải tương phản: hai lối mòn → điều cần
yb = 7.75; hb = 1.55
segs = [("BẢNG CHIẾU TĨNH", "Học sinh chỉ xem", ROSE_BG, RED, INK),
        ("AI GIẢI HỘ", "Học sinh chỉ chép", ROSE_BG, RED, INK),
        ("ĐIỀU CẦN", "AI dẫn đường, học sinh tự nghĩ", NAVY, "FFEA00", WHITE)]
for i, (k, v, bg, kc, vc) in enumerate(segs):
    x = x0 + i * (cw + gap)
    box(s, x, yb, cw, hb, fill=bg, radius=0.08)
    text(s, x + 0.4, yb + 0.25, cw - 0.8, 0.4, [[(k, {"font": MONO, "bold": True})]], size=14, color=kc)
    text(s, x + 0.4, yb + 0.7, cw - 0.8, 0.7, [[(v, {"bold": True})]], size=22, color=vc)
    if i < 2:
        arrow(s, x + cw + 0.08, yb + hb / 2 - 0.15, 0.3, 0.3, color=MUTED)

# ============ 04 Ý TƯỞNG ============
s = S[3]
content_frame(s, 4, "Ý TƯỞNG VÀ GIẢI PHÁP", "Ý TƯỞNG VÀ GIẢI PHÁP",
              A("Hai nguyên lý: AI chỉ chạy ", ("khi thầy khoanh vùng", BLUE), ", và ",
                ("không bao giờ nói đáp án", AMBER)))
pw_, ph_ = 8.35, 6.3
for i, (tag, ttl, col, bg, img, pts) in enumerate([
    ("TRÊN LỚP", "Magic Lasso: AI theo yêu cầu", BLUE, WHITE, "lasso.png",
     ["Viết bảng như phấn thường: không gọi AI, nét hiện tức thì.",
      "Khoanh một công thức → 1 lần gọi AI → mô phỏng tương tác kèm câu hỏi gợi mở."]),
    ("KHI TỰ HỌC", "Ma sát nhận thức có chủ đích", AMBER, WHITE, "steps_w.png",
     ["Bước sau bị khóa tới khi bước trước đúng; không dán được đáp án.",
      "Sai thì thấy lỗi bằng hình; cuối bài phải tự giải thích bản chất."])]):
    x = 0.97 + i * (pw_ + 1.4)
    box(s, x, 3.2, pw_, ph_, fill=PAPER, line=HAIR, radius=0.03)
    chip(s, x + 0.4, 3.5, tag, fg=col, bg=WHITE, size=14, w=2.0)
    text(s, x + 0.4, 4.05, pw_ - 0.8, 0.6, [[(ttl, {"bold": True})]], size=24, color=INK)
    pic(s, IMG + img, x + 0.4, 4.8, pw_ - 0.8, 2.4, border=HAIR)
    yy = 7.4
    for j, ptxt in enumerate(pts):
        dot(s, x + 0.45, yy + 0.13, 0.13, col)
        text(s, x + 0.75, yy, pw_ - 1.15, 0.9, ptxt, size=18, color=BODY)
        yy += 0.95
# cầu nối ở giữa
bx = 0.97 + pw_ + 0.12
box(s, bx, 5.3, 1.16, 2.1, fill=NAVY, radius=0.15)
text(s, bx, 5.3, 1.16, 2.1, [[("JSON", {"font": MONO, "bold": True, "size": 16, "color": "FFEA00"})],
                             [("< 5 KB", {"font": MONO, "size": 13, "color": WHITE})]],
     size=14, align="c", anchor="m")

# ============ 05 KIẾN TRÚC ============
s = S[4]
content_frame(s, 5, "Ý TƯỞNG VÀ GIẢI PHÁP · KIẾN TRÚC", "AI LÀ TRÌNH BIÊN DỊCH, KHÔNG PHẢI MÁY VẼ",
              A("AI chỉ ", ("dịch nét chữ thành dữ liệu", BLUE), "; trình duyệt tự dựng mô phỏng ",
                ("60 khung hình/giây", BLUE)))
stages = [("01", "Tách nét khoanh vùng", "Thuật toán điểm-trong-đa-giác lọc đúng nét được khoanh, vẽ lại trên nền trắng.", f"ảnh < {OPS['api']['cropKB']} KB", "TẠI MÁY"),
          ("02", "Một lần gọi Gemini Flash", "Trả về trọn gói: công thức, 2 cách đọc thay thế, tham số thanh trượt, câu hỏi Socratic.", "1 lệnh gọi", "AI"),
          ("03", "4 bộ máy mô phỏng", "Toán, Lý, Hóa, Sinh dựng bằng Canvas ngay trên trình duyệt; kéo thanh trượt không cần mạng.", "60 FPS · 0 API", "TẠI MÁY"),
          ("04", "Sơ đồ SVG dự phòng", "Chủ đề ngoài thư viện mẫu: AI sinh sơ đồ SVG có tham số để vẫn minh họa được.", "mở rộng", "AI")]
nw, ng = 4.05, 0.62
for i, (n, ttl, desc, met, where) in enumerate(stages):
    x = 0.97 + i * (nw + ng)
    ai = where == "AI"
    box(s, x, 3.2, nw, 4.0, fill=AMBER_BG if ai else PAPER, line=HAIR, radius=0.04)
    text(s, x + 0.35, 3.45, 1.2, 0.5, [[(n, {"font": MONO, "bold": True})]], size=26, color=AMBER if ai else BLUE)
    chip(s, x + nw - 1.55, 3.5, where, fg=AMBER if ai else BLUE, bg=WHITE, size=12, w=1.2)
    text(s, x + 0.35, 4.15, nw - 0.7, 0.9, [[(ttl, {"bold": True})]], size=21, color=INK)
    text(s, x + 0.35, 5.0, nw - 0.7, 1.6, desc, size=17, color=BODY, line_spacing=1.12)
    chip(s, x + 0.35, 6.55, met, fg=GREEN, bg=GREEN_BG, size=14, w=nw - 0.7)
    if i < 3:
        arrow(s, x + nw + 0.12, 5.05, 0.38, 0.32, color=MUTED)
# thẻ số liệu nổi bật
box(s, 0.97, 7.55, 18.06, 1.95, fill=NAVY, radius=0.06)
stats = [("0", f"lệnh gọi AI khi viết bảng (< {OPS['api']['inkMs']} ms/nét) và khi kéo thanh trượt"),
         (vn(OPS["api"]["callsPerLesson"]), "lần khoanh gọi AI trung bình mỗi tiết 45 phút"),
         (f"${vn(OPS['api']['costUsd'], 3)}", f"chi phí AI mỗi tiết (≈ {OPS['api']['costVnd']} đ), thấp hơn {vn(OPS['api']['reductionPct'])}%")]
for i, (v, l) in enumerate(stats):
    x = 1.5 + i * 6.0
    text(s, x, 7.78, 5.6, 0.85, [[(v, {"font": MONO, "bold": True})]], size=40, color="FFEA00")
    text(s, x, 8.68, 5.4, 0.7, l, size=16, color=WHITE)

# ============ 06 CÔNG CỤ AI & TRÁCH NHIỆM ============
s = S[5]
content_frame(s, 6, "Ý TƯỞNG VÀ GIẢI PHÁP · CÔNG CỤ AI", "CÔNG CỤ AI VÀ AI CÓ TRÁCH NHIỆM",
              A("AI được ", ("đặt trong khuôn", AMBER), ": kiểm chứng bằng toán học, chặn xin đáp án, chỉ gửi đi nét chữ"))
tools = [("Gemini Flash", "AI · Google", "Đọc chữ viết tay, sinh dữ liệu mô phỏng và câu hỏi gợi mở"),
         ("SymPy", "Đại số ký hiệu", "Kiểm tra từng bước giải và thứ nguyên — chính xác, không đoán"),
         ("$1 Unistroke", "Ngoại tuyến", "Nhận dạng nét vẽ (mũi tên, đường tròn…) ngay tại máy"),
         ("Nhận giọng nói", "Trình duyệt", "Nghe học sinh tự giải thích bản chất ở chốt chặn cuối bài")]
text(s, 0.97, 3.15, 8.6, 0.4, [[("CÔNG CỤ ĐANG DÙNG", {"font": MONO, "bold": True})]], size=14, color=MUTED)
y = 3.65
for nm, kind, role in tools:
    box(s, 0.97, y, 8.6, 1.32, fill=PAPER, line=HAIR, radius=0.06)
    text(s, 1.3, y + 0.2, 3.0, 0.5, [[(nm, {"bold": True})]], size=21, color=INK)
    text(s, 1.3, y + 0.72, 3.0, 0.4, [[(kind, {"font": MONO})]], size=13, color=BLUE)
    text(s, 4.35, y + 0.2, 4.95, 1.0, role, size=17, color=BODY, anchor="m")
    y += 1.47
text(s, 10.4, 3.15, 8.6, 0.4, [[("NGUYÊN TẮC TRÁCH NHIỆM", {"font": MONO, "bold": True})]], size=14, color=MUTED)
rules = [("Không bao giờ nói đáp án",
          f"Chặn {OPS['guard']['blocked']}/{OPS['guard']['total']} lượt ({vn(OPS['guard']['pct'])}%) xin đáp án trong thí điểm; {OPS['guard']['bypassesWeek1']} lượt lách tuần 1 đã vá bằng kiểm tra đầu ra."),
         ("Chính xác trước, AI sau", "Bước giải do SymPy chấm; LLM chỉ được đặt câu hỏi gợi mở."),
         ("Riêng tư", f"Chỉ gửi ảnh nét chữ đã cắt (< {OPS['api']['cropKB']} KB); không gửi ảnh lớp học hay khuôn mặt."),
         ("Giáo viên làm chủ", "AI chỉ chạy khi thầy khoanh vùng; đọc sai thì sửa bằng 1 chạm.")]
y = 3.65
for i, (h, b) in enumerate(rules):
    text(s, 10.4, y, 0.7, 0.5, [[(f"0{i+1}", {"font": MONO, "bold": True})]], size=20, color=AMBER)
    text(s, 11.15, y, 7.9, 0.5, [[(h, {"bold": True})]], size=21, color=INK)
    text(s, 11.15, y + 0.5, 7.9, 0.95, b, size=17, color=BODY)
    y += 1.47

# ============ 07 TRÊN LỚP ============
s = S[6]
content_frame(s, 7, "GIẢI PHÁP · TRÊN LỚP", "BỤC GIẢNG KHÔNG BÀN PHÍM",
              A("Mọi thao tác trên màn hình lớn được thiết kế để ", ("không làm đứt mạch giảng", BLUE)))
ux = [("Chạm để sửa (Tap & Swap)", "AI đọc nhầm một ký tự? Chạm vào nó, chọn phương án đúng. Không bật bàn phím ảo."),
      ("Thanh trượt lớn đặt dưới mô phỏng", "Bàn tay không che đồ thị; đổi tham số là hình thay đổi ngay."),
      ("Gợi ý Socratic chờ sẵn", "Câu hỏi gợi mở chỉ hiện khi thầy chủ động chạm, không chen ngang bài giảng.")]
y = 3.25
for i, (h, b) in enumerate(ux):
    text(s, 0.97, y, 0.9, 0.6, [[(f"0{i+1}", {"font": MONO, "bold": True})]], size=30, color=BLUE)
    text(s, 1.95, y + 0.02, 5.7, 0.55, [[(h, {"bold": True})]], size=21, color=INK)
    text(s, 1.95, y + 0.6, 5.7, 1.1, b, size=17, color=BODY)
    y += 1.75
box(s, 0.97, 8.5, 6.7, 1.0, fill=NAVY, radius=0.1)
text(s, 1.3, 8.5, 6.2, 1.0, [[(f"{vn(OPS['prepMin']['before'])} → {vn(OPS['prepMin']['after'])}", {"font": MONO, "bold": True, "color": "FFEA00", "size": 24}),
                             (f"  phút soạn mô phỏng/tiết ({vn(OPS['prepMin']['pct'])}%)", {"color": WHITE})]], size=16, anchor="m")
box(s, 8.25, 3.2, 10.8, 6.3, fill=WELL, line=HAIR, radius=0.03)
pic(s, IMG + "lasso.png", 8.6, 3.5, 4.6, 1.5, border=HAIR)
text(s, 8.6, 5.15, 4.6, 0.5, [[("1  Khoanh vùng công thức", {"font": MONO, "bold": True})]], size=14, color=BLUE)
arrow(s, 13.35, 6.1, 0.55, 0.4, color=AMBER)
pic(s, IMG + "phys.png", 14.05, 3.45, 4.7, 5.8, border=HAIR)
text(s, 8.6, 5.75, 4.6, 3.4, [[("2  Mô phỏng hiện bên phải", {"font": MONO, "bold": True, "color": BLUE})],
                              [("Quỹ đạo, vận tốc, độ cao cực đại tính bằng công thức; thanh trượt góc ném, vận tốc đầu, gia tốc g nằm ngay dưới hình.", {})]],
     size=16, color=BODY, space_after=6)

# ============ 08 BỐN MÔN ============
s = S[7]
content_frame(s, 8, "GIẢI PHÁP · 4 MÔN KHTN", "MỘT NÉT KHOANH, BỐN MÔN KHOA HỌC",
              A("Mô phỏng ", ("tính theo đúng định luật", BLUE), ", tham số kéo được ngay trên lớp"))
subj = [("VẬT LÝ", "phys_t.png", "v₀ = 24 m/s, α = 45°", "Ném xiên, đổi góc và vận tốc"),
        ("ĐIỆN XOAY CHIỀU", "rlc_t.png", "Z = √(R² + (Z_L − Z_C)²)", "Giản đồ Fresnel, cộng hưởng"),
        ("HÓA HỌC", "chem_t.png", "N₂ + 3H₂ ⇌ 2NH₃", "Năng lượng hoạt hóa, xúc tác"),
        ("SINH HỌC", "bio_t.png", "ADN: A = T, G ≡ X", "Tháo xoắn ADN, helicase")]
qw, qg = 4.2, 0.42
for i, (tag, img, f, cap) in enumerate(subj):
    x = 0.97 + i * (qw + qg)
    box(s, x, 3.15, qw, 5.55, fill=PAPER, line=HAIR, radius=0.03)
    pic(s, IMG + img, x + 0.2, 3.35, qw - 0.4, 3.75, border=None)
    chip(s, x + 0.25, 7.2, tag, fg=BLUE, bg=WHITE, size=12, w=qw - 0.5)
    fr = [[(t, {"font": SERIF, "italic": True, "sub": True}) if t in ("L", "C") and f.startswith("Z") else (t, {"font": SERIF, "italic": True})
           for t in re.split(r"(?<=Z_)(L|C)|_", f) if t]]
    text(s, x + 0.25, 7.7, qw - 0.5, 0.45, fr, size=17, color=INK, align="c")
    text(s, x + 0.25, 8.17, qw - 0.5, 0.45, cap, size=15, color=BODY, align="c")
box(s, 0.97, 8.9, 18.06, 0.62, fill=WELL, line=HAIR, radius=0.2)
text(s, 1.3, 8.9, 17.5, 0.62, [[("TOÁN  ", {"font": MONO, "bold": True, "color": BLUE}),
                               ("Đồ thị hàm số, tiếp tuyến động, tổng Riemann, chuỗi Taylor, biện luận nghiệm f(x) = m", {})]],
     size=17, color=BODY, anchor="m")

# ============ 09 GIA SƯ 3 TẦNG ============
s = S[8]
content_frame(s, 9, "GIẢI PHÁP · KHI TỰ HỌC", "GIA SƯ SOCRATIC KIỂM CHỨNG 3 TẦNG",
              A(f"{vn(OPS['offload']['zeroToken'])}% trong {vn(ST['tutorSessions'], 0)} phiên được chấm ", ("bằng toán học, không cần LLM", GREEN)))
tiers = [("TẦNG 0", "Bộ chặn xin đáp án", f"chặn {vn(OPS['guard']['pct'])}%", ROSE_BG, RED, 8.9),
         ("TẦNG 1", "SymPy: tương đương đại số + thứ nguyên", f"{vn(OPS['offload']['sympy'])}% · < {OPS['offload']['sympyMs']} ms", GREEN_BG, GREEN, 8.3),
         ("TẦNG 2", "Kho câu hỏi gợi mở theo dạng bài", f"{vn(OPS['offload']['cache'])}% · < {OPS['offload']['cacheMs']} ms", PAPER, BLUE, 7.7),
         ("TẦNG 3", "LLM có rào chắn: chỉ hỏi, không trả lời", f"{vn(OPS['offload']['llm'])}% phiên", AMBER_BG, AMBER, 7.1)]
y = 3.2
for k, h, m, bg, col, w in tiers:
    x = 0.97 + (8.9 - w) / 2
    box(s, x, y, w, 1.12, fill=bg, line=HAIR, radius=0.12)
    text(s, x + 0.3, y + 0.14, 1.3, 0.4, [[(k, {"font": MONO, "bold": True})]], size=13, color=col)
    text(s, x + 0.3, y + 0.5, w - 0.6, 0.5, [[(h, {"bold": True})]], size=17, color=INK)
    text(s, x + w - 2.75, y + 0.14, 2.45, 0.4, [[(m, {"font": MONO})]], size=13, color=col, align="r")
    y += 1.27
box(s, 0.97, 8.3, 8.9, 1.2, fill=NAVY, radius=0.08)
text(s, 1.3, 8.3, 8.3, 1.2, [[("Sai 3 lần?  ", {"bold": True, "color": "FFEA00"}),
                             (f"Bước được chia nhỏ dần. Kiên trì sau lần sai đầu: {vn(OPS['persistence']['before'])}% → {vn(OPS['persistence']['after'])}%.", {"color": WHITE})]],
     size=17, anchor="m")
pic(s, IMG + "tutor.png", 10.4, 3.2, 8.63, 6.3, border=HAIR)

# ============ 10 GỠ LỖI & CHỐT CHẶN ============
s = S[9]
content_frame(s, 10, "GIẢI PHÁP · KHI TỰ HỌC", "GỠ LỖI BẰNG HÌNH VÀ CHỐT CHẶN BẢN CHẤT",
              A("Học sinh ", ("nhìn thấy lỗi sai", RED), " của mình và phải ", ("tự giải thích bản chất", AMBER), " mới hoàn thành bài"))
for i, (tag, col, img, h, b) in enumerate([
    ("GỠ LỖI BẰNG HÌNH", RED, "debug.png", "Lỗi sai hiện ngay trên hình vẽ",
     f"Quên lực ma sát → cảnh báo ΣF ≠ ma; cân bằng sai → đĩa cân nghiêng. Phần III (nhiều bước): {vn(P['parts'][2]['exp'])}% so với {vn(P['parts'][2]['control'])}%."),
    ("CHỐT CHẶN BẢN CHẤT", AMBER, "trap.png", "Hiểu rồi mới được qua",
     f"Giọng nói, chuỗi nhân quả, săn bẫy Đúng/Sai. Phần II: {vn(PART2['exp'])}% so với {vn(PART2['control'])}%; ghi nhớ sau 2 tuần: {vn(P['parts'][3]['exp'])}%.")]):
    x = 0.97 + i * 9.28
    box(s, x, 3.2, 8.78, 6.3, fill=PAPER, line=HAIR, radius=0.03)
    chip(s, x + 0.4, 3.5, tag, fg=col, bg=WHITE, size=13, w=3.3)
    pic(s, IMG + img, x + 0.4, 4.1, 8.0, 3.35, border=HAIR)
    text(s, x + 0.4, 7.65, 8.0, 0.5, [[(h, {"bold": True})]], size=21, color=INK)
    text(s, x + 0.4, 8.2, 8.0, 1.2, b, size=17, color=BODY)

# ============ 11 TRIỂN KHAI ============
s = S[10]
content_frame(s, 11, "TRIỂN KHAI THỰC TẾ", "TRIỂN KHAI THỰC TẾ",
              A("Một vòng khép kín: ", ("trên lớp → về nhà → sáng hôm sau", BLUE)))
flow = [("01 · CUỐI GIỜ", "QR Smart Notes", "qr.png", "Học sinh quét mã, mở lại mô phỏng và tự kéo thanh trượt ở nhà."),
        ("02 · Ở NHÀ", "Gia sư Socratic", "steps.png", "Làm bài theo từng bậc; được gợi mở, không được cho đáp án."),
        ("03 · SÁNG HÔM SAU", "Bản đồ nhiệt lớp học", "heat.png", "Thấy bước cả lớp đang kẹt; 1 chạm đẩy bài khắc phục lên bảng.")]
fw, fg_ = 5.85, 0.45
for i, (k, h, img, b) in enumerate(flow):
    x = 0.97 + i * (fw + fg_)
    box(s, x, 3.15, fw, 4.9, fill=PAPER, line=HAIR, radius=0.03)
    text(s, x + 0.35, 3.35, fw - 0.7, 0.4, [[(k, {"font": MONO, "bold": True})]], size=13, color=BLUE)
    text(s, x + 0.35, 3.75, fw - 0.7, 0.5, [[(h, {"bold": True})]], size=21, color=INK)
    pic(s, IMG + img, x + 0.35, 4.3, fw - 0.7, 2.7, border=HAIR)
    text(s, x + 0.35, 7.12, fw - 0.7, 0.85, b, size=16, color=BODY)
    if i < 2:
        arrow(s, x + fw + 0.07, 5.3, 0.3, 0.3, color=MUTED)
box(s, 0.97, 8.2, 18.06, 1.3, fill=AMBER_BG, line="F5D9A8", radius=0.08)
text(s, 1.3, 8.3, 17.4, 0.4, [[(f"THÍ ĐIỂM {ST['weeks']} TUẦN · BÁN THỰC NGHIỆM CÓ NHÓM ĐỐI CHỨNG", {"font": MONO, "bold": True})]], size=13, color=AMBER)
text(s, 1.3, 8.72, 17.4, 0.7, [[(f"{ST['lessons']} tiết · {vn(ST['tutorSessions'], 0)} phiên gia sư · ", {}), M("N"), (f" = {ST['N']} HS lớp {ST['grades']} (thực nghiệm ", {}),
                               M("n"), (f" = {ST['n1']}: {ST['n1Core']} THPT + {ST['n1Gifted']} chuyên; đối chứng ", {}), M("n"), (f" = {ST['n2']}) · {ST['teachers']} GV · Lý 12, Hóa 11–12", {})]],
     size=17, color=INK)

# ============ 12 KẾT QUẢ ============
s = S[11]
content_frame(s, 12, "KẾT QUẢ VÀ TÁC ĐỘNG", "KẾT QUẢ VÀ TÁC ĐỘNG",
              A("Nhóm thực nghiệm làm đúng câu Đúng/Sai ", (f"nhiều hơn {vn(PART2['delta'])} điểm %", BLUE), "; hiệu ứng lớn ", (f"d = {vn(SC['cohenD'], 2)}", BLUE)))
text(s, 0.97, 3.12, 10.3, 0.4, [[("ĐỘ CHÍNH XÁC THEO PHẦN ĐỀ THI THPT TỪ 2025 (%)", {"font": MONO, "bold": True})]], size=13, color=MUTED)
cd = CategoryChartData()
parts = list(reversed(P["parts"]))
cd.categories = [x["short"] for x in parts]
cd.add_series(f"Đối chứng (n = {ST['n2']})", [x["control"] for x in parts])
cd.add_series(f"Thực nghiệm (n = {ST['n1']})", [x["exp"] for x in parts])
gf = s.shapes.add_chart(XL_CHART_TYPE.BAR_CLUSTERED, Inches(0.97), Inches(3.45), Inches(10.3), Inches(4.05), cd)
gf.name = "Biểu đồ kết quả theo phần"
ch = gf.chart
ch.has_legend = True
ch.legend.include_in_layout = False
ch.legend.position = XL_LEGEND_POSITION.BOTTOM
ch.legend.font.size = Pt(14); ch.legend.font.color.rgb = rgb(BODY)
plot = ch.plots[0]
plot.gap_width = 55; plot.overlap = -8
plot.has_data_labels = True
dl = plot.data_labels
dl.number_format = "0.0"; dl.number_format_is_linked = False
dl.position = XL_LABEL_POSITION.OUTSIDE_END
dl.font.size = Pt(14); dl.font.bold = True; dl.font.color.rgb = rgb(INK)
for ser, col in zip(plot.series, ["C9C4BA", NAVY]):
    ser.format.fill.solid(); ser.format.fill.fore_color.rgb = rgb(col)
va = ch.value_axis
va.maximum_scale = 100; va.minimum_scale = 0
va.has_major_gridlines = True
va.major_gridlines.format.line.color.rgb = rgb(HAIR)
va.tick_labels.font.size = Pt(12); va.tick_labels.font.color.rgb = rgb(MUTED)
va.format.line.fill.background()
ca = ch.category_axis
ca.tick_labels.font.size = Pt(15); ca.tick_labels.font.color.rgb = rgb(INK)
ca.format.line.color.rgb = rgb(HAIR)
# thẻ thống kê
box(s, 11.6, 3.15, 7.43, 2.45, fill=NAVY, radius=0.05)
text(s, 11.95, 3.32, 6.8, 0.4, [[("ĐIỂM BÀI SAU · THANG 10", {"font": MONO, "bold": True})]], size=13, color="FFEA00")
text(s, 11.95, 3.72, 6.8, 0.9, [[(f"{vn(SC['post']['exp']['mean'], 2)}", {"font": MONO, "bold": True, "size": 40, "color": WHITE}),
                                (f" ± {vn(SC['post']['exp']['sd'], 2)}", {"font": MONO, "size": 22, "color": WHITE}),
                                (f"   đối chứng {vn(SC['post']['control']['mean'], 2)}", {"size": 16, "color": "C9C4BA"})]], size=16, anchor="m")
text(s, 11.95, 4.7, 6.8, 0.8, [[(f"+{vn(SC['growth']['exp']['pts'], 2)} điểm (+{vn(SC['growth']['exp']['pct'])}%) so với đầu kỳ · ", {"color": WHITE}),
                               M("d", color="FFEA00"), (f" = {vn(SC['cohenD'], 2)}, ", {"color": "FFEA00"}),
                               M("p", color="FFEA00"), (f" = {SC['post']['p'].replace('.', ',')}", {"color": "FFEA00"})]], size=16)
rows_ = [("", f"Đối chứng (n = {ST['n2']})", f"Thực nghiệm (n = {ST['n1']})"),
         ("Trước", f"{vn(SC['pre']['control']['mean'], 2)} ± {vn(SC['pre']['control']['sd'], 2)}", f"{vn(SC['pre']['exp']['mean'], 2)} ± {vn(SC['pre']['exp']['sd'], 2)}"),
         ("Sau", f"{vn(SC['post']['control']['mean'], 2)} ± {vn(SC['post']['control']['sd'], 2)}", f"{vn(SC['post']['exp']['mean'], 2)} ± {vn(SC['post']['exp']['sd'], 2)}")]
tb2 = s.shapes.add_table(3, 3, Inches(11.6), Inches(5.78), Inches(7.43), Inches(1.32)).table
for j, w_ in enumerate([1.5, 2.9, 3.03]):
    tb2.columns[j].width = Inches(w_)
for i, row in enumerate(rows_):
    tb2.rows[i].height = Inches(0.44)
    for j, t in enumerate(row):
        c = tb2.cell(i, j)
        c.text = ""
        r = c.text_frame.paragraphs[0].add_run(); r.text = t
        r.font.size = Pt(14); r.font.name = MONO if (i and j) else SANS
        r.font.bold = i == 0 or j == 0 or (i == 2 and j == 2)
        r.font.color.rgb = rgb(NAVY if (i == 2 and j == 2) else INK)
        c.margin_left = c.margin_right = Inches(0.12); c.margin_top = c.margin_bottom = Inches(0.03)
        c.vertical_anchor = MSO_ANCHOR.MIDDLE
        c.fill.solid(); c.fill.fore_color.rgb = rgb(WELL if i == 0 else WHITE)
text(s, 11.6, 7.15, 7.43, 0.4, [[("Trước: ", {}), M("p"), (f" = {SC['pre']['p'].replace('.', ',')} (hai nhóm tương đương) · ", {}), M("X̄"), (" ± ", {}), M("SD")]],
     size=13, color=MUTED)
# phản hồi người dùng
for i, f in enumerate(P["feedback"][:2]):
    x = 0.97 + i * 9.28
    box(s, x, 7.75, 8.78, 1.75, fill=PAPER, line=HAIR, radius=0.06)
    text(s, x + 0.35, 7.88, 8.1, 1.05, [[(f"“{f['short']}”", {"italic": True})]], size=17, color=INK, font=SERIF, line_spacing=1.08)
    text(s, x + 0.35, 9.0, 8.1, 0.4, [[(f["who"], {"bold": True}), (f" · {f['meta']}", {})]], size=13, color=MUTED)

# ============ 13 SO SÁNH ============
s = S[12]
content_frame(s, 13, "THẢO LUẬN · SO SÁNH", "SO SÁNH VỚI GIẢI PHÁP HIỆN CÓ",
              A("Khác biệt cốt lõi: AI ", ("hiểu đề bài", BLUE), ", còn ", ("toán học", GREEN), " dựng hình và chấm bài"))
cols = ["Tiêu chí", "Bảng tương tác truyền thống", "Ứng dụng gọi AI sinh ảnh/video", "Socratic Vision Board"]
rows = [("Minh họa từ chữ viết tay", "Không có, phải soạn trước", "Chờ nhiều giây; hình có thể sai định luật", "Khoanh vùng → mô phỏng tính bằng công thức"),
        ("Đổi tham số", "Tĩnh", "Video không kéo được", "Thanh trượt tức thì, không tốn API"),
        ("Hỗ trợ tự học", "Không có", "Giải hộ toàn bộ, dễ chép", f"Bậc thang khóa, SymPy chấm; {vn(OPS['offload']['zeroToken'])}% phiên không tốn token"),
        ("Chi phí AI mỗi tiết", "0 (không có AI)", "Tính tiền theo từng lượt sinh", f"${vn(OPS['api']['costUsd'], 3)} (≈ {OPS['api']['costVnd']} đ), {vn(OPS['api']['callsPerLesson'])} lần gọi; thấp hơn {vn(OPS['api']['reductionPct'])}%")]
tbl = s.shapes.add_table(len(rows) + 1, 4, Inches(0.97), Inches(3.2), Inches(18.06), Inches(6.2)).table
widths = [3.6, 4.3, 4.66, 5.5]
for j, w in enumerate(widths):
    tbl.columns[j].width = Inches(w)
tbl.rows[0].height = Inches(0.95)
for i in range(1, len(rows) + 1):
    tbl.rows[i].height = Inches(1.3)


def cell(c, t, size, color, bold=False, fill=None, font=SANS):
    c.text = ""
    p = c.text_frame.paragraphs[0]
    r = p.add_run(); r.text = t
    r.font.size = Pt(size); r.font.color.rgb = rgb(color); r.font.bold = bold; r.font.name = font
    c.text_frame.word_wrap = True
    c.margin_left = c.margin_right = Inches(0.25); c.margin_top = c.margin_bottom = Inches(0.1)
    c.vertical_anchor = MSO_ANCHOR.MIDDLE
    c.fill.solid(); c.fill.fore_color.rgb = rgb(fill or WHITE)


for j, h in enumerate(cols):
    cell(tbl.cell(0, j), h, 17, WHITE if j < 3 else "FFEA00", bold=True, fill=NAVY)
for i, row in enumerate(rows, start=1):
    for j, t in enumerate(row):
        if j == 0:
            cell(tbl.cell(i, j), t, 17, INK, bold=True, fill=WELL)
        elif j == 3:
            cell(tbl.cell(i, j), t, 17, NAVY, bold=True, fill=GREEN_BG)
        else:
            cell(tbl.cell(i, j), t, 16, BODY, fill=WHITE)

# ============ 14 BỀN VỮNG ============
s = S[13]
content_frame(s, 14, "THẢO LUẬN · NHÂN RỘNG", "TÍNH BỀN VỮNG VÀ ĐỊNH HƯỚNG",
              A("Chạy trên ", ("thiết bị trường đã có", GREEN), ", chi phí AI gần bằng không, mở rộng theo môn và theo trường"))
pillars = [("KHẢ THI", "Màn hình tương tác sẵn có + trình duyệt + 1 máy chủ Python. Mất mạng vẫn viết bảng và nhận dạng hình."),
           ("CHI PHÍ", f"Đo trong thí điểm: {vn(OPS['api']['callsPerLesson'])} lần gọi Gemini Flash, ${vn(OPS['api']['costUsd'], 3)} (≈ {OPS['api']['costVnd']} đ) mỗi tiết."),
           ("NHÂN RỘNG", "4 bộ máy mô phỏng dùng chung; thêm một chủ đề mới chỉ là thêm một mẫu dữ liệu.")]
y = 3.2
for h, b in pillars:
    box(s, 0.97, y, 9.0, 1.95, fill=PAPER, line=HAIR, radius=0.06)
    text(s, 1.35, y + 0.25, 3, 0.4, [[(h, {"font": MONO, "bold": True})]], size=14, color=GREEN)
    text(s, 1.35, y + 0.7, 8.3, 1.2, b, size=18, color=BODY)
    y += 2.12
text(s, 10.6, 3.2, 8.4, 0.4, [[("ĐỊNH HƯỚNG PHÁT TRIỂN", {"font": MONO, "bold": True})]], size=14, color=BLUE)
road = [("01", "Mở rộng thí điểm", f"Từ {ST['N']} học sinh, {ST['teachers']} giáo viên sang toàn khối 10–12."),
        ("02", "Mở rộng thư viện chủ đề", "Phủ các chủ đề KHTN theo Chương trình GDPT 2018."),
        ("03", "Chia sẻ cho các trường", "Bộ cài đặt và tài liệu hướng dẫn cho giáo viên THPT."),
        ("04", "Chạy AI nội bộ", "Thử mô hình chạy tại trường để không phụ thuộc mạng.")]
y = 3.75
ln = s.shapes.add_connector(1, Inches(10.88), Inches(3.95), Inches(10.88), Inches(9.0))
ln.line.color.rgb = rgb(HAIR); ln.line.width = Pt(2)
for n, h, b in road:
    dot(s, 10.7, y + 0.08, 0.36, BLUE if n == "01" else WHITE).line.color.rgb = rgb(BLUE)
    text(s, 11.35, y, 7.7, 0.5, [[(n + "  ", {"font": MONO, "bold": True, "color": BLUE}), (h, {"bold": True})]], size=20, color=INK)
    text(s, 11.35, y + 0.55, 7.7, 0.7, b, size=17, color=BODY)
    y += 1.42

# ============ 15 TÀI LIỆU + LỜI KẾT ============
s = S[14]
content_frame(s, 15, "TÀI LIỆU ĐÍNH KÈM", "TÀI LIỆU/THÔNG TIN ĐÍNH KÈM",
              A("Toàn bộ sản phẩm có thể ", ("xem, chạy thử và kiểm chứng", BLUE)))
links = [("Video thuyết trình (≤ 5 phút)", VIDEO_URL),
         ("Bản chạy thử / mã nguồn", "[ link ]"),
         ("Thư mục minh chứng (Drive)", "[ link Google Drive ]")]
y = 3.25
for h, l in links:
    box(s, 0.97, y, 8.6, 1.3, fill=PAPER, line=HAIR, radius=0.08)
    text(s, 1.35, y + 0.18, 6.4, 0.45, [[(h, {"bold": True})]], size=19, color=INK)
    tb = text(s, 1.35, y + 0.68, 6.4, 0.45, [[(l, {"font": MONO})]], size=16,
              color=BLUE if l.startswith("http") else AMBER)
    if l.startswith("http"):
        tb.text_frame.paragraphs[0].runs[0].hyperlink.address = l
        s.shapes.add_picture(IMG + "qr-video.png", Inches(0.97 + 8.6 - 1.18), Inches(y + 0.12), Inches(1.06), Inches(1.06))
    y += 1.48
fb = P["feedback"][2]
text(s, 0.97, 7.8, 8.6, 1.0, [[(f"“{fb['short']}”", {"italic": True})]], size=18, color=INK, font=SERIF)
text(s, 0.97, 8.85, 8.6, 0.4, [[(fb["who"], {"bold": True}), (f" · {fb['meta']}", {})]], size=13, color=MUTED)
box(s, 10.2, 3.25, 8.83, 6.25, fill=NAVY, radius=0.04)
text(s, 10.75, 3.75, 7.8, 3.6,
     [[("Không để AI suy nghĩ thay học sinh. ", {}),
       ("Dùng AI để đánh thức nhà khoa học bên trong mỗi em.", {"italic": True, "color": "FFEA00"})]],
     size=32, color=WHITE, font=SERIF, line_spacing=1.12)
for i, t in enumerate(["Bảng không bàn phím", "Mô phỏng đúng định luật", "Ma sát nhận thức"]):
    text(s, 10.75, 7.45 + i * 0.6, 7.8, 0.5,
         [[(f"0{i+1}  ", {"font": MONO, "bold": True, "color": "FFEA00"}), (t, {})]], size=18, color=WHITE)

prs.save(OUT)
print("saved", OUT)
