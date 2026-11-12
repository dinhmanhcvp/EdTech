# Dựng docs/STARTUP_BUSINESS_REPORT_FINAL.md và .docx từ part1-3.md theo layout mẫu SV_STARTUP IX.
# Chạy: python -X utf8 build.py   (hai lượt: lượt 1 tính số trang, lượt 2 điền mục lục)
import os, re, sys, json, copy, subprocess, shutil
import docx
from docx.shared import Pt, Cm, RGBColor, Emu
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.dirname(HERE)
TPL = os.environ.get("SV_TEMPLATE", r"C:\Users\Admin\Downloads\1 HV. STARTUP IX- SOCRATIC VISION BOARD 2026.docx")
OUT_DOCX = os.path.join(DOCS, "STARTUP_BUSINESS_REPORT_FINAL.docx")
OUT_MD = os.path.join(DOCS, "STARTUP_BUSINESS_REPORT_FINAL.md")
PAGES_JSON = os.path.join(HERE, "_pages.json")
NAVY, MAROON, GREY = RGBColor(0x12, 0x2F, 0x53), RGBColor(0xA3, 0x2C, 0x34), RGBColor(0x6E, 0x78, 0x82)

WIDTHS = {'prod_01': 9.5, 'fig_s02': 12.0, 'fig_s03': 13.0, 'fig_s04': 12.0, 'fig_s05': 14.0, 'prod_05': 10.0, 'fig_s06': 15.5, 'fig_s09': 12.5, 'fig_s16': 15.5, 'fig_s07': 8.5, 'fig_s20': 16.2, 'fig_s21': 16.2, 'fig_s22': 16.2, 'fig_s23': 14.5, 'fig_s24': 16.2, 'fig_s25': 16.2, 'fig_s26': 16.2, 'fig_s27': 15.5, 'fig_s28': 16.2, 'fig_s29': 16.2, 'fig_s30': 15.5, 'fig_s31': 12.0}
# ---------------------------------------------------------------- nguồn
src = "\n".join(open(os.path.join(HERE, n), encoding="utf8").read() for n in ("part_a.md", "part2_verbatim.md", "part_b.md"))
lines = src.split("\n")

# đánh số hình/bảng, thu thập mục
fig_no, tab_no, fig_list, tab_list = {}, 0, [], []
nf = 0
for ln in lines:
    m = re.match(r"!\[(.*?)\]\((.*?)\)", ln)
    if m:
        nf += 1
        fig_no[os.path.splitext(os.path.basename(m.group(2)))[0]] = nf
        fig_list.append((nf, m.group(1)))
    m = re.match(r"\[\[T:(.*)\]\]", ln)
    if m:
        tab_no += 1
        tab_list.append((tab_no, m.group(1)))


def resolve_refs(t):
    return re.sub(r"\[\[ref:(\w+)\]\]", lambda m: str(fig_no[m.group(1)]), t)


def heading_level(txt):
    if re.match(r"^(TÓM TẮT|NỘI DUNG CHÍNH|KẾT LUẬN|PHỤ LỤC)", txt):
        return 1
    if re.match(r"^\d+\.\d", txt):
        return 3
    if re.match(r"^([A-B]|\d+)\.", txt):
        return 2
    return 4


# ---------------------------------------------------------------- toán học
SYM = [(r"\approx", "≈"), (r"\times", "×"), (r"\cdot", "·"), (r"\sum", "Σ"), (r"\le", "≤"), (r"\ge", "≥"),
       (r"\%", "%"), (r"\ ", " "), (r"\;", " "), (r"\quad", "  "), ("{,}", ","), (r"\dfrac", r"\frac")]


def math_plain(s):
    for a, b in SYM:
        s = s.replace(a, b)
    s = re.sub(r"\\text\{([^}]*)\}", r"\1", s)
    s = re.sub(r"\\bar\{(\w)\}", "\\1\u0304", s)
    for _ in range(3):
        s = re.sub(r"\\frac\{([^{}]*)\}\{([^{}]*)\}", r"(\1) / (\2)", s)
    s = s.replace("10^{9}", "10⁹").replace("10^6", "10⁶").replace("{", "").replace("}", "")
    return s.strip()


def add_run(p, text, size=None, bold=None, italic=None, color=None, sub=False, font=None):
    r = p.add_run(text)
    if size: r.font.size = Pt(size)
    if bold is not None: r.bold = bold
    if italic is not None: r.italic = italic
    if color is not None: r.font.color.rgb = color
    if sub: r.font.subscript = True
    if font:
        r.font.name = font
        r._element.rPr.rFonts.set(qn("w:eastAsia"), font)
    return r


TOKEN = re.compile(r"(\*\*.+?\*\*|\$[^$]+\$|\*[^*\s][^*]*?\*)")


def add_inline(p, text, size=13, bold=False, italic=False, color=None):
    text = resolve_refs(text)
    for part in TOKEN.split(text):
        if not part:
            continue
        if part.startswith("**") and part.endswith("**"):
            add_inline(p, part[2:-2], size, True, italic, color)
        elif part.startswith("$") and part.endswith("$"):
            raw = part[1:-1]
            # chỉ số dưới dạng _{..} hoặc _x
            pieces = re.split(r"(_\{[^}]*\}|_\w)", raw)
            for pc in pieces:
                if re.match(r"_\{[^}]*\}|_\w$", pc or ""):
                    add_run(p, math_plain(pc[1:].strip("{}")), size, bold, italic, color, sub=True)
                elif pc:
                    add_run(p, math_plain(pc), size, bold, italic, color)
        elif part.startswith("*") and part.endswith("*") and len(part) > 2:
            add_inline(p, part[1:-1], size, bold, True, color)
        else:
            add_run(p, part.replace("<br>", "\n"), size, bold, italic, color)


# ---------------------------------------------------------------- tiện ích docx
def shade(cell, fill):
    tcPr = cell._tc.get_or_add_tcPr()
    for e in tcPr.findall(qn("w:shd")):
        tcPr.remove(e)
    shd = OxmlElement("w:shd"); shd.set(qn("w:val"), "clear"); shd.set(qn("w:color"), "auto"); shd.set(qn("w:fill"), fill)
    tcPr.append(shd)


def set_cell_margins(table, top=50, bottom=50, left=80, right=80):
    tblPr = table._tbl.tblPr
    m = OxmlElement("w:tblCellMar")
    for k, v in (("top", top), ("left", left), ("bottom", bottom), ("right", right)):
        e = OxmlElement(f"w:{k}"); e.set(qn("w:w"), str(v)); e.set(qn("w:type"), "dxa"); m.append(e)
    tblPr.append(m)


def set_borders(table, color="8A949E"):
    tblPr = table._tbl.tblPr
    b = OxmlElement("w:tblBorders")
    for k in ("top", "left", "bottom", "right", "insideH", "insideV"):
        e = OxmlElement(f"w:{k}"); e.set(qn("w:val"), "single"); e.set(qn("w:sz"), "4"); e.set(qn("w:space"), "0"); e.set(qn("w:color"), color); b.append(e)
    tblPr.append(b)


def fmt(p, align=None, before=0, after=6, line=None, keep_next=False, left=None, hang=None, keep_lines=False):
    pf = p.paragraph_format
    if align is not None: p.alignment = align
    pf.space_before, pf.space_after = Pt(before), Pt(after)
    if line: pf.line_spacing = line
    if keep_next: pf.keep_with_next = True
    if keep_lines: pf.keep_together = True
    if left is not None: pf.left_indent = Cm(left)
    if hang is not None: pf.first_line_indent = Cm(-hang)


def make_table(doc, header, rows, widths_cm=None):
    ncol = len(header)
    t = doc.add_table(rows=1, cols=ncol)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    set_borders(t); set_cell_margins(t)
    size = 10 if ncol >= 5 else 11
    # độ rộng theo độ dài nội dung
    if widths_cm is None:
        lens = []
        for c in range(ncol):
            L = max([len(re.sub(r"[*$]|<br>", " ", header[c])) / 2.2] + [max(len(w) for w in re.sub(r"[*$]", "", r[c]).replace("<br>", " ").split() or [""]) * 1.1 for r in rows if c < len(r)] + [6])
            avg = sum(len(re.sub(r"[*$]|<br>", "", r[c])) for r in rows if c < len(r)) / max(1, len(rows))
            lens.append(max(L, min(avg, 120) ** 0.62 * 1.6))
        tot = sum(lens)
        widths_cm = [16.7 * l / tot for l in lens]
        # đảm bảo tối thiểu 1.6cm
        widths_cm = [max(w, 1.6) for w in widths_cm]
        s = sum(widths_cm); widths_cm = [w * 16.7 / s for w in widths_cm]
    hdr = t.rows[0]
    trPr = hdr._tr.get_or_add_trPr(); th = OxmlElement("w:tblHeader"); th.set(qn("w:val"), "true"); trPr.append(th)
    for i, h in enumerate(header):
        c = hdr.cells[i]; shade(c, "A32C34"); c.width = Cm(widths_cm[i])
        p = c.paragraphs[0]; fmt(p, WD_ALIGN_PARAGRAPH.CENTER, 0, 0, 1.0)
        add_inline(p, h, size, True, False, RGBColor(255, 255, 255))
    for ri, r in enumerate(rows):
        r = r + [""] * (ncol - len(r))
        row = t.add_row()
        trPr = row._tr.get_or_add_trPr(); cs = OxmlElement("w:cantSplit"); cs.set(qn("w:val"), "true"); trPr.append(cs)
        sect = all(not x.strip() for x in r[1:]) and r[0].strip()
        if sect:
            m = row.cells[0].merge(row.cells[-1]); shade(m, "D8E8EE")
            p = m.paragraphs[0]; fmt(p, WD_ALIGN_PARAGRAPH.LEFT, 0, 0, 1.0); add_inline(p, r[0], size, True)
            continue
        for i, v in enumerate(r):
            c = row.cells[i]; c.width = Cm(widths_cm[i])
            if ri % 2 == 1: shade(c, "F1F5F8")
            parts = v.split("<br>")
            for k, seg in enumerate(parts):
                p = c.paragraphs[0] if k == 0 else c.add_paragraph()
                numeric = re.fullmatch(r"[\d\.\,\s%đ*]+(trường|đợt|giáo viên| USD)?\**", v.strip()) is not None
                fmt(p, WD_ALIGN_PARAGRAPH.RIGHT if (numeric and i > 0) else WD_ALIGN_PARAGRAPH.LEFT, 0, 2 if k < len(parts) - 1 else 0, 1.0)
                add_inline(p, seg, size)
    tblPr = t._tbl.tblPr
    lay = OxmlElement("w:tblLayout"); lay.set(qn("w:type"), "fixed"); tblPr.append(lay)
    for i, wcm in enumerate(widths_cm):
        t.columns[i].width = Cm(wcm)
    return t


def parse_table(block):
    rows = []
    for ln in block:
        cells = [c.strip() for c in ln.strip().strip("|").split("|")]
        rows.append(cells)
    header = rows[0]
    body = [r for r in rows[2:]]
    return header, body


def add_picture(doc, path, width_cm, caption, source=None):
    p = doc.add_paragraph(); fmt(p, WD_ALIGN_PARAGRAPH.CENTER, 6, 3, 1.0, keep_next=True)
    with Image.open(path) as im:
        w, h = im.size
    wc = min(width_cm, 16.5)
    if h / w * wc > 20: wc = 20 * w / h
    p.add_run().add_picture(path, width=Cm(wc))
    return p


def caption(doc, label, n, text, after=10):
    p = doc.add_paragraph(); fmt(p, WD_ALIGN_PARAGRAPH.CENTER, 0, after, 1.0)
    add_run(p, f"{label} {n}. ", 12, True, True, NAVY)
    add_inline(p, text, 12, False, True)
    return p


# ---------------------------------------------------------------- tài liệu
def new_doc():
    d = docx.Document(TPL)
    body = d.element.body
    for el in list(body):
        if el.tag != qn("w:sectPr"):
            body.remove(el)
    for nm in ('Heading 2', 'Heading 3'):
        d.styles[nm].font.size = Pt(14)
    return d


def H(doc, text, level, page_break=False):
    style = {1: "Heading 1", 2: "Heading 2", 3: "Heading 3"}.get(level)
    if level == 4:
        p = doc.add_paragraph(); fmt(p, WD_ALIGN_PARAGRAPH.LEFT, 8, 4, 1.15, keep_next=True)
        add_run(p, text, 14, True, False, NAVY)
        return p
    p = doc.add_paragraph(style=style)
    if page_break: p.paragraph_format.page_break_before = True
    p.paragraph_format.keep_with_next = True
    if level == 1: p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    else: p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    r = p.add_run(text)
    if level == 2 and not text[:1].isdigit() is False: pass
    return p


def cover(doc):
    def c(text, size, bold=True, before=0, after=4, color=None, italic=False):
        p = doc.add_paragraph(); fmt(p, WD_ALIGN_PARAGRAPH.CENTER, before, after, 1.15)
        add_run(p, text, size, bold, italic, color); return p
    c("BỘ GIÁO DỤC VÀ ĐÀO TẠO", 14, True, 0, 2)
    c("CUỘC THI", 14, True, 6, 2)
    c("“HỌC SINH, SINH VIÊN VỚI Ý TƯỞNG KHỞI NGHIỆP”", 14)
    c("LẦN THỨ IX (SV_STARTUP LẦN THỨ IX)", 14, True, 0, 18)
    c("BÁO CÁO DỰ ÁN KHỞI NGHIỆP CÔNG NGHỆ GIÁO DỤC", 14, True, 0, 10)
    c("DỰ ÁN: SOCRATIC VISION BOARD", 20, True, 0, 8, MAROON)
    c("BẢNG TƯƠNG TÁC THÔNG MINH SOCRATIC VISION BOARD", 14)
    c("HỖ TRỢ DẠY HỌC THỰC NGHIỆM STEM TRONG GIÁO DỤC PHỔ THÔNG", 14, True, 0, 12)
    c("Lĩnh vực: Công nghiệp, Chế tạo, Trí tuệ nhân tạo, Công nghệ Giáo dục STEM", 14, False, 0, 16)
    p = doc.add_paragraph(); fmt(p, WD_ALIGN_PARAGRAPH.CENTER, 0, 8)
    pic = os.path.join(HERE, "prod_01.jpg")
    p.add_run().add_picture(pic, width=Cm(13.5))
    c("NHÓM THỰC HIỆN:", 14, True, 8, 4)
    for t in ["1. Hà Thái Sơn – 10A13 – Trường THPT Chuyên Vĩnh Phúc",
              "2. Lê Tiến Đức – 9A2 – Trường THCS Hùng Vương (trưởng nhóm)",
              "3. Đỗ Ngọc Hà – 8A5 – Trường THCS Hùng Vương",
              "4. Hoàng Lan Anh – 9A2 – Trường THCS Hùng Vương",
              "5. Nguyễn Hiếu Phong – 9A3 – Trường THCS Hùng Vương"]:
        p = doc.add_paragraph(); fmt(p, WD_ALIGN_PARAGRAPH.LEFT, 0, 3, 1.1, left=2.2); add_run(p, t, 14)
    p = doc.add_paragraph(); fmt(p, WD_ALIGN_PARAGRAPH.LEFT, 10, 4, 1.1)
    add_run(p, "Đơn vị: Trường THCS Hùng Vương – Sở Giáo dục và Đào tạo tỉnh Phú Thọ", 14, True)
    p = doc.add_paragraph(); fmt(p, WD_ALIGN_PARAGRAPH.LEFT, 0, 4, 1.1)
    add_run(p, "Đơn vị phối hợp khảo sát và thử nghiệm: Trường THPT Chuyên Vĩnh Phúc, tỉnh Phú Thọ", 14, False)
    c("Phú Thọ, tháng 10 năm 2026", 14, True, 14, 0, None, True)


def info_page(doc):
    p = H(doc, "THÔNG TIN VẮN TẮT VỀ CÁC THÀNH VIÊN THAM GIA DỰ ÁN", 1, page_break=True)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    for t in ["1. Họ và tên trưởng nhóm: Lê Tiến Đức", "2. Trường/lớp: Trường THCS Hùng Vương – lớp 9A2",
              "3. Số điện thoại liên hệ: 0988117166", "4. Email: phuonganhhv75@gmail.com"]:
        p = doc.add_paragraph(); fmt(p, WD_ALIGN_PARAGRAPH.LEFT, 0, 4, 1.15); add_run(p, t, 14)
    H(doc, "5. Danh sách thành viên trong nhóm", 2)
    make_table(doc, ["STT", "Họ và tên", "Lớp – Trường", "Vai trò trong nhóm"], [
        ["1", "**Lê Tiến Đức**", "9A2 – THCS Hùng Vương, tỉnh Phú Thọ", "Trưởng nhóm; điều phối chung và thiết kế trải nghiệm người dùng"],
        ["2", "**Đỗ Ngọc Hà**", "8A5 – THCS Hùng Vương", "Khảo sát thực địa, tổng hợp ý kiến đóng góp của học sinh"],
        ["3", "**Hoàng Lan Anh**", "9A2 – THCS Hùng Vương", "Kiểm thử bài học mô phỏng và học liệu Hóa học, Sinh học"],
        ["4", "**Nguyễn Hiếu Phong**", "9A3 – THCS Hùng Vương", "Kiểm thử kỹ thuật và hỗ trợ triển khai thiết bị trên lớp"],
        ["5", "**Hà Thái Sơn**", "10A13 – THPT Chuyên Vĩnh Phúc", "Thử nghiệm chuyên đề Toán, Vật lý nâng cao và ôn luyện học sinh giỏi"]],
        [1.1, 3.9, 5.2, 6.5])
    H(doc, "6. Danh sách người hướng dẫn", 2)
    make_table(doc, ["STT", "Họ và tên", "Đơn vị", "Trách nhiệm hướng dẫn"], [
        ["1", "**Thầy Phùng Văn Kiệm**", "Giáo viên Trường THPT Chuyên Vĩnh Phúc", "Cố vấn công nghệ và thẩm định sư phạm STEM; kiểm chứng tính chính xác của mô hình toán học và hiện tượng khoa học; định hướng phương pháp dạy học thực nghiệm."],
        ["2", "**Cô Vũ Thị Phương Anh**", "Hiệu trưởng Trường THCS Hùng Vương", "Cố vấn chiến lược khởi nghiệp; kết nối mạng lưới trường thử nghiệm; định hướng quản trị tài chính; rà soát tính khả thi và hoàn thiện hồ sơ."]],
        [1.1, 3.9, 4.6, 7.1])


def toc(doc, heads, pages):
    p = H(doc, "MỤC LỤC", 1, page_break=True); p.alignment = WD_ALIGN_PARAGRAPH.CENTER

    def entry(text, level, key):
        p = doc.add_paragraph()
        fmt(p, WD_ALIGN_PARAGRAPH.LEFT, 2 if level == 1 else 0, 1.5, 1.1, left=[0, 0.7, 1.5][level - 1] if level <= 3 else 1.5)
        pPr = p._p.get_or_add_pPr(); tabs = OxmlElement("w:tabs"); tab = OxmlElement("w:tab")
        tab.set(qn("w:val"), "right"); tab.set(qn("w:leader"), "dot"); tab.set(qn("w:pos"), "9460"); tabs.append(tab); pPr.append(tabs)
        add_run(p, text, 14, level == 1)
        add_run(p, "\t" + str(pages.get(key, "")), 11, level == 1)
    for text, level in heads:
        if level <= 2:
            entry(text, level, text)
    return


def lists_page(doc, pages):
    for title, items, label in (("DANH MỤC BẢNG", tab_list, "Bảng"), ("DANH MỤC HÌNH VẼ, BIỂU ĐỒ VÀ SƠ ĐỒ", fig_list, "Hình")):
        p = H(doc, title, 1, page_break=True); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for n, t in items:
            p = doc.add_paragraph(); fmt(p, WD_ALIGN_PARAGRAPH.LEFT, 0, 1.5, 1.05, left=1.9, hang=1.9)
            pPr = p._p.get_or_add_pPr(); tabs = OxmlElement("w:tabs")
            t1 = OxmlElement("w:tab"); t1.set(qn("w:val"), "left"); t1.set(qn("w:pos"), "1080"); tabs.append(t1)
            tab = OxmlElement("w:tab"); tab.set(qn("w:val"), "right"); tab.set(qn("w:leader"), "dot"); tab.set(qn("w:pos"), "9460"); tabs.append(tab); pPr.append(tabs)
            add_run(p, f"{label} {n}.\t", 11, True)
            short = re.sub(r"\$[^$]*\$", "", resolve_refs(t))
            add_run(p, short + "\t" + str(pages.get(f"{label} {n}.", "")), 11)


def build(pages):
    doc = new_doc()
    cover(doc); info_page(doc)
    heads = [(m.group(2).strip(), heading_level(m.group(2).strip())) for ln in lines if (m := re.match(r"^(#{1,3}) (.*)$", ln))]
    heads_toc = [h for h in heads if h[1] <= 3]
    toc(doc, heads_toc, pages)
    i = 0; first_body = True; md_out = []
    cur_h = None
    while i < len(lines):
        ln = lines[i]
        if not ln.strip() or ln.strip() == "---":
            i += 1; continue
        m = re.match(r"^(#{1,4}) (.*)$", ln)
        if m:
            txt = m.group(2).strip(); lvl = heading_level(txt) if len(m.group(1)) < 4 else 4
            if len(m.group(1)) == 3: lvl = 4 if not re.match(r"^\d", txt) else 3
            pb = txt.startswith("TÓM TẮT")
            H(doc, txt, lvl, page_break=pb)
            md_out.append("#" * {1: 1, 2: 2, 3: 3, 4: 4}[lvl] + " " + txt + "\n")
            i += 1; continue
        m = re.match(r"^!\[(.*?)\]\((.*?)\)", ln)
        if m:
            cap, path = m.group(1), os.path.join(DOCS, m.group(2))
            key = os.path.splitext(os.path.basename(path))[0]
            n = fig_no[key]
            w = next((v for k, v in WIDTHS.items() if key.startswith(k)), 12.0)
            add_picture(doc, path, w, cap)
            src_note = " (Nguồn: ảnh chụp màn hình sản phẩm)" if key.startswith("prod") else ""
            caption(doc, "Hình", n, cap + src_note)
            md_out.append(f"![Hình {n}. {cap}]({m.group(2)})\n\n*Hình {n}. {cap}{src_note}*\n")
            i += 1; continue
        m = re.match(r"^\[\[T:(.*)\]\]$", ln)
        if m:
            tn = [n for n, t in tab_list if t == m.group(1)][0]
            p = caption(doc, "Bảng", tn, m.group(1), after=4); p.paragraph_format.keep_with_next = True
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            md_out.append(f"**Bảng {tn}.** {m.group(1)}\n")
            i += 1
            while not lines[i].strip().startswith("|"): i += 1
            blk = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                blk.append(lines[i]); i += 1
            h, body = parse_table(blk)
            make_table(doc, h, body)
            sp = doc.add_paragraph(); fmt(sp, None, 0, 4, 1.0)
            md_out.append("\n".join(blk) + "\n")
            continue
        if ln.startswith("$$"):
            f = ln.strip().strip("$").strip()
            p = doc.add_paragraph(); fmt(p, WD_ALIGN_PARAGRAPH.CENTER, 2, 6, 1.2)
            add_run(p, math_plain(f), 13, False, True, None, font="Cambria Math")
            md_out.append(f"$$ {f} $$\n"); i += 1; continue
        if ln.startswith("|"):
            blk = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                blk.append(lines[i]); i += 1
            h, body = parse_table(blk); make_table(doc, h, body)
            md_out.append("\n".join(blk) + "\n"); continue
        m = re.match(r"^(- |\d+\. )(.*)$", ln)
        if m:
            marker = "•" if m.group(1) == "- " else m.group(1).strip()
            p = doc.add_paragraph(); fmt(p, WD_ALIGN_PARAGRAPH.JUSTIFY, 0, 2, 1.15, left=0.9, hang=0.6)
            add_run(p, marker + "\t", 11)
            pPr = p._p.get_or_add_pPr(); tabs = OxmlElement("w:tabs"); tb = OxmlElement("w:tab"); tb.set(qn("w:val"), "left"); tb.set(qn("w:pos"), str(int(0.9 * 567))); tabs.append(tb); pPr.append(tabs)
            add_inline(p, m.group(2), 14)
            md_out.append(resolve_refs(ln)); i += 1; continue
        # đoạn văn
        p = doc.add_paragraph(); fmt(p, WD_ALIGN_PARAGRAPH.JUSTIFY, 0, 4, 1.15)
        add_inline(p, ln, 14)
        md_out.append(resolve_refs(ln) + "\n"); i += 1
    return doc, md_out


def md_front():
    return """# BỘ GIÁO DỤC VÀ ĐÀO TẠO

**CUỘC THI “HỌC SINH, SINH VIÊN VỚI Ý TƯỞNG KHỞI NGHIỆP” LẦN THỨ IX (SV_STARTUP IX)**

## BÁO CÁO DỰ ÁN KHỞI NGHIỆP CÔNG NGHỆ GIÁO DỤC

# DỰ ÁN: SOCRATIC VISION BOARD

**Bảng tương tác thông minh Socratic Vision Board hỗ trợ dạy học thực nghiệm STEM trong giáo dục phổ thông**

Lĩnh vực: Công nghiệp, Chế tạo, Trí tuệ nhân tạo, Công nghệ Giáo dục STEM. Phú Thọ, tháng 10 năm 2026.

**Nhóm thực hiện:**

1. Hà Thái Sơn, 10A13, Trường THPT Chuyên Vĩnh Phúc
2. Lê Tiến Đức, 9A2, Trường THCS Hùng Vương (trưởng nhóm), điện thoại 0988117166, phuonganhhv75@gmail.com
3. Đỗ Ngọc Hà, 8A5, Trường THCS Hùng Vương
4. Hoàng Lan Anh, 9A2, Trường THCS Hùng Vương
5. Nguyễn Hiếu Phong, 9A3, Trường THCS Hùng Vương

**Đơn vị:** Trường THCS Hùng Vương, Sở Giáo dục và Đào tạo tỉnh Phú Thọ. **Đơn vị phối hợp:** Trường THPT Chuyên Vĩnh Phúc.

**Người hướng dẫn:** Thầy Phùng Văn Kiệm (Giáo viên Trường THPT Chuyên Vĩnh Phúc, cố vấn công nghệ và thẩm định sư phạm STEM); Cô Vũ Thị Phương Anh (Hiệu trưởng Trường THCS Hùng Vương, cố vấn chiến lược khởi nghiệp).

---

"""


def render_pages():
    """Chuyển docx sang PDF, trả về {khóa: số trang} cho mục lục và danh mục."""
    import pymupdf
    soffice = os.environ.get("SOFFICE", r"C:\Program Files\LibreOffice\program\soffice.exe")
    tmp = os.path.join(HERE, "_pdf"); os.makedirs(tmp, exist_ok=True)
    subprocess.run([soffice, "--headless", "--convert-to", "pdf", "--outdir", tmp, OUT_DOCX], check=True, capture_output=True)
    pdf = pymupdf.open(os.path.join(tmp, "STARTUP_BUSINESS_REPORT_FINAL.pdf"))
    pages = {}
    texts = [pg.get_text() for pg in pdf]
    # bỏ qua các trang bìa, thông tin, mục lục, danh mục
    start = next(i for i, t in enumerate(texts) if "TÓM TẮT DỰ ÁN" in t and "Ý tưởng khởi nguồn" in t and "MỤC LỤC" not in t)
    keys = [m.group(2).strip() for ln in lines if (m := re.match(r"^(#{1,3}) (.*)$", ln))]
    for k in keys:
        for i in range(start, len(texts)):
            if any(l.strip() == k or l.strip().startswith(k[:38]) and len(k) > 38 for l in texts[i].split("\n")):
                pages[k] = i + 1; break
    for n, _ in fig_list:
        for i in range(start, len(texts)):
            if any(l.startswith(f"Hình {n}. ") for l in texts[i].split("\n")):
                pages[f"Hình {n}."] = i + 1; break
    for n, _ in tab_list:
        for i in range(start, len(texts)):
            if any(l.startswith(f"Bảng {n}. ") for l in texts[i].split("\n")):
                pages[f"Bảng {n}."] = i + 1; break
    return pages, len(pdf)


if __name__ == "__main__":
    pages = {}
    for rnd in (1, 2, 3):
        doc, md_out = build(pages)
        doc.core_properties.title = "Báo cáo dự án khởi nghiệp Socratic Vision Board - SV_STARTUP IX"
        doc.core_properties.author = "Nhóm tác giả Socratic Vision Board"
        doc.save(OUT_DOCX)
        new_pages, n = render_pages()
        print("round", rnd, "pages", n, "keys", len(new_pages))
        if new_pages == pages: break
        pages = new_pages
    open(OUT_MD, "w", encoding="utf8").write(md_front() + "\n".join(md_out))
    print("OK", OUT_DOCX)
