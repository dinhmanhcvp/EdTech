# Gộp bốn file nháp thành một .docx (Times New Roman 14, lề 2/2/3/2 cm, giãn dòng 1,3). Chạy: python -X utf8 build_docx.py
import re, os
from docx import Document
from docx.shared import Pt, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

HERE = os.path.dirname(os.path.abspath(__file__))
rd = lambda f: open(os.path.join(HERE, f), encoding="utf8").read()
L1, L2, L3, L4 = (rd(f) for f in ("luot-1_chuong-1-2.md", "luot-2_chuong-3-4.1.md", "luot-3_muc-4.2-4.3.md", "luot-4_chuong-5-tom-tat-bia.md"))

def cut(t, a, b=None):
    i = t.index(a); j = t.index(b, i) if b else len(t)
    return t[i:j]

import sys
SRC_NAME = sys.argv[1] if len(sys.argv) > 1 else "bao-cao_ban-gon.md"
SRC = rd(SRC_NAME)
i1, i2 = SRC.index("## MỤC LỤC"), SRC.index("## TÓM TẮT DỰ ÁN")
FINAL = "final" in SRC_NAME
if FINAL:
    COVER_MD, TOC_MD, BODY = SRC[:i1], SRC[i1:i2], SRC[i2:]
    order = [BODY]
else:
    order = [SRC[:i1].replace("## BÌA", ""), SRC[i1:i2], SRC[i2:]]

doc = Document()
s = doc.sections[0]
s.page_height, s.page_width = Cm(29.7), Cm(21)
s.top_margin, s.bottom_margin, s.left_margin, s.right_margin = Cm(2), Cm(2), Cm(3), Cm(2)
st = doc.styles["Normal"]; st.font.name = "Times New Roman"; st.font.size = Pt(14)
st.element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
for n in ("Heading 1", "Heading 2", "Heading 3"):
    h = doc.styles[n]; h.font.name = "Times New Roman"; h.font.color.rgb = None; h.font.size = Pt(14); h.font.bold = True
    rf = h.element.rPr.rFonts
    # thuộc tính *Theme (Calibri Light của theme) được ưu tiên hơn w:ascii, phải xoá thì đầu mục mới ra Times New Roman
    for a in ("asciiTheme", "hAnsiTheme", "eastAsiaTheme", "cstheme"):
        rf.attrib.pop(qn("w:" + a), None)
    for a in ("ascii", "hAnsi", "eastAsia", "cs"):
        rf.set(qn("w:" + a), "Times New Roman")
doc.styles["Heading 3"].font.italic = True

TOK = re.compile(r"(\*\*.+?\*\*|\*.+?\*|<sub>.+?</sub>|`.+?`)")
def runs(p, text, size=None, bold=False, italic=False):
    for part in TOK.split(text):
        if not part: continue
        b, i, sub, mono = bold, italic, False, False
        if part.startswith("**"): part, b = part[2:-2], True
        elif part.startswith("<sub>"): part, sub = part[5:-6], True
        elif part.startswith("*") and part.endswith("*") and len(part) > 2: part, i = part[1:-1], True
        elif part.startswith("`"): part = part[1:-1]
        r = p.add_run(part); r.bold, r.italic = b, i
        r.font.subscript = sub
        if size: r.font.size = Pt(size)

def fmt(p, indent=True, align=WD_ALIGN_PARAGRAPH.JUSTIFY):
    # hướng dẫn KHKT 2026–2027: cách dòng đơn, TNR 14, lề 3/2/2/2
    pf = p.paragraph_format; pf.line_spacing = 1.0; pf.space_before = pf.space_after = Pt(2)
    p.alignment = align
    if indent: pf.first_line_indent = Cm(1)

def border(cell, **kw):
    tcPr = cell._tc.get_or_add_tcPr(); b = tcPr.find(qn("w:tcBorders"))
    if b is None: b = OxmlElement("w:tcBorders"); tcPr.append(b)
    for side, val in kw.items():
        e = OxmlElement(f"w:{side}"); e.set(qn("w:val"), "single" if val else "nil"); e.set(qn("w:sz"), "8"); b.append(e)

def table(rows):
    rows = [[c.strip() for c in r.strip().strip("|").split("|")] for r in rows if not re.match(r"^\|[\s\-:|]+\|$", r.strip())]
    n = max(len(r) for r in rows); t = doc.add_table(rows=len(rows), cols=n)
    t.autofit = False
    lens = [min(max(len(r[j]) if j < len(r) else 0 for r in rows), 70) ** 0.7 + 3 for j in range(n)]
    widths = [Cm(16 * l / sum(lens)) for l in lens]
    for i, r in enumerate(rows):
        for j in range(n):
            c = t.cell(i, j); c.width = widths[j]; c.text = ""; p = c.paragraphs[0]
            runs(p, r[j] if j < len(r) else "", size=14, bold=(i == 0))
            p.paragraph_format.space_after = Pt(0); p.paragraph_format.space_before = Pt(0)
            border(c, top=(i == 0), bottom=(i == 0 or i == len(rows) - 1), left=False, right=False)
    sp = doc.add_paragraph(); sp.paragraph_format.space_after = Pt(0); sp.add_run().font.size = Pt(4)

REF = False
def render(md):
    global REF
    lines = md.split("\n"); i = 0
    while i < len(lines):
        ln = lines[i]; s_ = ln.strip()
        if s_.startswith("```"):
            lang = s_[3:]; j = i + 1; blk = []
            while not lines[j].strip().startswith("```"): blk.append(lines[j]); j += 1
            i = j + 1
            if lang == "python": continue
            for b in blk:
                p = doc.add_paragraph(); runs(p, b, size=14, italic=True); fmt(p, False, WD_ALIGN_PARAGRAPH.LEFT)
                p.paragraph_format.left_indent = Cm(0.5); p.paragraph_format.space_after = Pt(0)
            continue
        if s_.startswith("|"):
            blk = []
            while i < len(lines) and lines[i].strip().startswith("|"): blk.append(lines[i]); i += 1
            table(blk); continue
        m = re.match(r"^!\[.*?\]\((.+?)\)", s_)
        if m:
            doc.add_picture(os.path.join(HERE, m.group(1)), width=Cm(8 if "mo_hinh_3d" in m.group(1) else (8.5 if ("hinh_3_1" in m.group(1) or "so_do" in m.group(1)) else 8))); doc.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER; i += 1; continue
        if re.match(r"^-{3,}$", s_) or not s_ or s_.startswith("Quy ước") or s_.startswith("# "):
            i += 1; continue
        m = re.match(r"^(#{2,4}) (.*)", s_)
        if m:
            lvl = len(m.group(1)) - 1; txt = m.group(2); REF = txt.startswith("TÀI LIỆU THAM KHẢO")
            h = doc.add_heading(level=min(lvl, 3)); runs(h, txt.upper() if lvl == 1 else txt, bold=True, italic=(lvl >= 3))
            if lvl == 1: h.alignment = WD_ALIGN_PARAGRAPH.CENTER
            h.paragraph_format.keep_with_next = True; i += 1; continue
        if s_.startswith("**Bảng") or s_.startswith("*Hình") or s_.startswith("*Nguồn"):
            p = doc.add_paragraph(); runs(p, s_, size=14 if s_.startswith("*") else None); fmt(p, False, WD_ALIGN_PARAGRAPH.CENTER if s_.startswith("**Bảng") or s_.startswith("*Hình") else WD_ALIGN_PARAGRAPH.LEFT)
            i += 1; continue
        bm = re.match(r"^(?:[-*] |\d+\. )(.*)", s_)
        # danh sách đánh số giữ số (TLTK được trích [n] trong thân bài); gạch đầu dòng thì bỏ dấu
        p = doc.add_paragraph(); runs(p, bm.group(1) if bm and s_[0] in "-*" else s_, size=14 if REF else None)
        fmt(p, indent=not bm, align=WD_ALIGN_PARAGRAPH.LEFT if REF else WD_ALIGN_PARAGRAPH.JUSTIFY)
        if REF: p.paragraph_format.line_spacing = 1.0; p.paragraph_format.space_after = Pt(1)
        if bm: p.paragraph_format.left_indent = Cm(1)
        i += 1

import final_parts

if FINAL:
    final_parts.cover(doc, COVER_MD); doc.add_page_break()
    # tóm tắt là trang đầu tiên sau bìa, rồi mới đến mục lục
    k = BODY.index("## CHƯƠNG 1")
    render(BODY[:k]); doc.add_page_break()
    final_parts.toc(doc, HERE, TOC_MD, BODY); doc.add_page_break()
    render(BODY[k:])
else:
    for k, part in enumerate(order):
        render(part)
        if k == 0: doc.add_page_break()

# số trang giữa chân trang, trang bìa không hiện số
s.different_first_page_header_footer = True
fp = s.footer.paragraphs[0]; fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = fp.add_run()
for t, txt in (("begin", None), (None, "PAGE"), ("end", None)):
    if t: e = OxmlElement("w:fldChar"); e.set(qn("w:fldCharType"), t)
    else: e = OxmlElement("w:instrText"); e.text = txt
    r._r.append(e)
out = os.path.join(HERE, "BAO_CAO_FRESHNOSE_final.docx" if "final" in SRC_NAME else ("BAO_CAO_FRESHNOSE_ban-so-lieu.docx" if "so-lieu" in SRC_NAME else "BAO_CAO_FRESHNOSE_ban-nhap.docx"))
doc.save(out); print("saved", out)
