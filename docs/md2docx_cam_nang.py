"""Chuyển ba tệp cẩm nang .md trong docs/ thành Word (A4, một màu xanh, bìa gọn, bảng viền mảnh)."""
import re, sys
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

INK = RGBColor(0x22, 0x2B, 0x38); ACC = RGBColor(0x1F, 0x4E, 0x79); MUTE = RGBColor(0x6B, 0x75, 0x82)
FONT = 'Calibri'

def shade(el, fill):
    pr = el.get_or_add_pPr() if hasattr(el, 'get_or_add_pPr') else el
    s = OxmlElement('w:shd'); s.set(qn('w:val'), 'clear'); s.set(qn('w:color'), 'auto'); s.set(qn('w:fill'), fill); pr.append(s)

def border(p, side, color, sz=18, space=8):
    pPr = p._p.get_or_add_pPr(); b = pPr.find(qn('w:pBdr'))
    if b is None: b = OxmlElement('w:pBdr'); pPr.append(b)
    e = OxmlElement(f'w:{side}'); e.set(qn('w:val'), 'single'); e.set(qn('w:sz'), str(sz)); e.set(qn('w:space'), str(space)); e.set(qn('w:color'), color); b.append(e)

def runs(p, text, size=None, color=None, bold=False):
    for part in re.split(r'(\*\*.+?\*\*|`.+?`)', text):
        if not part: continue
        if part.startswith('**'): r = p.add_run(part[2:-2]); r.bold = True
        elif part.startswith('`'): r = p.add_run(part[1:-1]); r.font.name = 'Consolas'; r._element.rPr.rFonts.set(qn('w:eastAsia'), 'Consolas'); r.font.size = Pt((size or 10.5) - 1)
        else: r = p.add_run(part); r.bold = bold
        if size and not part.startswith('`'): r.font.size = Pt(size)
        if color is not None: r.font.color.rgb = color

def build(md, out, title, sub):
    d = Document()
    s = d.sections[0]; s.page_width, s.page_height = Cm(21), Cm(29.7)
    s.left_margin = s.right_margin = Cm(2.3); s.top_margin = Cm(2.2); s.bottom_margin = Cm(2.2)
    st = d.styles['Normal']; st.font.name = FONT; st.font.size = Pt(10.5); st.font.color.rgb = INK
    st.element.rPr.rFonts.set(qn('w:eastAsia'), FONT)
    st.paragraph_format.space_after = Pt(5); st.paragraph_format.line_spacing = 1.25
    for n, sz, before, after in (('Heading 1', 20, 0, 8), ('Heading 2', 15, 22, 6), ('Heading 3', 12, 14, 3)):
        h = d.styles[n]; h.font.name = FONT; h.font.size = Pt(sz); h.font.bold = True; h.font.color.rgb = ACC
        h.element.rPr.rFonts.set(qn('w:eastAsia'), FONT); h.element.rPr.rFonts.set(qn('w:ascii'), FONT); h.element.rPr.rFonts.set(qn('w:hAnsi'), FONT)
        h.paragraph_format.space_before = Pt(before); h.paragraph_format.space_after = Pt(after); h.paragraph_format.keep_with_next = True
    # footer page number
    fp = s.footer.paragraphs[0]; fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = fp.add_run(); r.font.size = Pt(9); r.font.color.rgb = MUTE
    for t, txt in (('begin', None), (None, 'PAGE'), ('end', None)):
        if t: e = OxmlElement('w:fldChar'); e.set(qn('w:fldCharType'), t)
        else: e = OxmlElement('w:instrText'); e.text = txt
        r._r.append(e)
    # cover block
    p = d.add_paragraph(); p.paragraph_format.space_before = Pt(60); runs(p, 'SOCRATIC VISION BOARD', 10, ACC, True)
    p = d.add_paragraph(); p.paragraph_format.space_after = Pt(4); r = p.add_run(title); r.font.size = Pt(30); r.bold = True; r.font.color.rgb = INK
    p = d.add_paragraph(); runs(p, sub, 12, MUTE); border(p, 'bottom', '1F4E79', 12, 12); p.paragraph_format.space_after = Pt(14)

    lines = md.split('\n'); i = 0; first_h1 = True
    while i < len(lines):
        ln = lines[i]
        if ln.startswith('# '):
            i += 1
            if first_h1: first_h1 = False; continue  # title already on cover
            d.add_heading(ln[2:], 1); continue
        m = re.match(r'^(#{2,3}) (.*)', ln)
        if m:
            h = d.add_heading(m.group(2).replace('`',''), len(m.group(1)))
            if len(m.group(1)) == 2 and not ln.startswith('## Đọc'): h.paragraph_format.page_break_before = False
            i += 1; continue
        if ln.startswith('```'):
            code = []; i += 1
            while not lines[i].startswith('```'): code.append(lines[i]); i += 1
            i += 1
            p = d.add_paragraph(); p.paragraph_format.line_spacing = 1.1; p.paragraph_format.left_indent = Cm(.3)
            shade(p._p, 'F3F5F8')
            for k, c in enumerate(code):
                r = p.add_run(c); r.font.name = 'Consolas'; r._element.rPr.rFonts.set(qn('w:eastAsia'), 'Consolas'); r.font.size = Pt(9.5)
                if k < len(code) - 1: r.add_break()
            continue
        if ln.startswith('|'):
            rows = []
            while i < len(lines) and lines[i].startswith('|'):
                if not re.match(r'^\|[\s:|-]+\|$', lines[i]): rows.append([c.strip() for c in lines[i].strip().strip('|').split('|')])
                i += 1
            n = len(rows[0]); t = d.add_table(rows=len(rows), cols=n); t.alignment = WD_TABLE_ALIGNMENT.CENTER; t.autofit = True
            tblPr = t._tbl.tblPr; b = OxmlElement('w:tblBorders')
            for side in ('top', 'bottom', 'insideH'):
                e = OxmlElement(f'w:{side}'); e.set(qn('w:val'), 'single'); e.set(qn('w:sz'), '4'); e.set(qn('w:color'), 'D5DAE1'); b.append(e)
            tblPr.append(b)
            for ri, row in enumerate(rows):
                for ci in range(n):
                    c = t.cell(ri, ci); c.text = ''; p = c.paragraphs[0]; p.paragraph_format.space_after = Pt(2); p.paragraph_format.line_spacing = 1.1
                    runs(p, row[ci] if ci < len(row) else '', 9.5, ACC if ri == 0 else None, ri == 0)
                    tcPr = c._tc.get_or_add_tcPr()
                    if ri == 0:
                        sh = OxmlElement('w:shd'); sh.set(qn('w:val'), 'clear'); sh.set(qn('w:fill'), 'EAF0F7'); tcPr.append(sh)
                    mar = OxmlElement('w:tcMar')
                    for side, w in (('top', 60), ('bottom', 60), ('left', 90), ('right', 90)):
                        e = OxmlElement(f'w:{side}'); e.set(qn('w:w'), str(w)); e.set(qn('w:type'), 'dxa'); mar.append(e)
                    tcPr.append(mar)
            d.add_paragraph().paragraph_format.space_after = Pt(2); continue
        if ln.startswith('>'):
            p = d.add_paragraph(); p.paragraph_format.left_indent = Cm(.5); p.paragraph_format.space_after = Pt(3)
            shade(p._p, 'F3F7FB'); border(p, 'left', '1F4E79', 18, 8)
            runs(p, re.sub(r'^>\s?', '', ln)); i += 1; continue
        m = re.match(r'^(- \[ \] |- |(\d+)\. )(.*)', ln)
        if m:
            p = d.add_paragraph(); p.paragraph_format.left_indent = Cm(.9); p.paragraph_format.first_line_indent = Cm(-.5); p.paragraph_format.space_after = Pt(3)
            mark = '☐  ' if m.group(1) == '- [ ] ' else (m.group(2) + '.  ' if m.group(2) else '•  ')
            r = p.add_run(mark); r.font.color.rgb = ACC; r.bold = True
            runs(p, m.group(3)); i += 1; continue
        if ln.strip():
            p = d.add_paragraph(); runs(p, ln)
        i += 1
    d.core_properties.title = title; d.core_properties.author = 'Nhóm Socratic Vision Board'
    d.save(out)

# chạy: python docs/md2docx_cam_nang.py  (sửa nội dung ở .md rồi chạy lại; tệp Word ra đúng tên đang dùng)
import os
base = os.path.dirname(os.path.abspath(__file__)) + '/'
for f, out, title, sub in (
    ('CAM_NANG_HOI_DAP_NOI_BAT_THPT', 'CAM_NANG_HOI_DAP_NOI_BAT_THPT', 'Cẩm nang kiến thức', 'Thuật toán, so sánh và cách trả lời · dành cho học sinh THPT'),
    ('CAM_NANG_CAU_HOI', 'Socratic', 'Bộ câu hỏi luyện tập', '45 câu · che phần gợi ý và trả lời thành tiếng'),
    ('CAM_NANG_GOI_Y_TRA_LOI', 'Socratic-GoiY', 'Gợi ý trả lời', 'Đối chiếu theo số câu · nói bằng lời của em')):
    build(open(base + f + '.md', encoding='utf-8').read(), base + out + '.docx', title, sub)
print('ok')
