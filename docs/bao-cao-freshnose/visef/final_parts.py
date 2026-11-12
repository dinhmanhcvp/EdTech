# Bìa và mục lục cho bản final (dùng bởi build_docx.py). Mục lục có đường chấm và số trang đọc từ toc_pages.json.
import json, os, re
from docx.shared import Pt, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT, WD_TAB_LEADER

C, LF, RT = WD_ALIGN_PARAGRAPH.CENTER, WD_ALIGN_PARAGRAPH.LEFT, WD_ALIGN_PARAGRAPH.JUSTIFY


def para(doc, text, size=14, bold=False, before=0, after=0, align=C, spacing=1.15):
    p = doc.add_paragraph()
    r = p.add_run(text); r.bold = bold; r.font.size = Pt(size)
    pf = p.paragraph_format
    pf.space_before, pf.space_after, pf.line_spacing = Pt(before), Pt(after), spacing
    p.alignment = align
    return p


def cover(doc, md):
    L = [l.strip() for l in md.splitlines() if l.strip() and not l.startswith("## ")]
    org = next(l for l in L if l.startswith("SỞ GIÁO DỤC"))
    contest = next(l for l in L if l.startswith("CUỘC THI"))
    year = next(l for l in L if l.startswith("NĂM HỌC"))
    title = next(l for l in L if l.startswith("**FRESHNOSE")).strip("*")
    content = next((l for l in L if l.startswith("Nội dung:")), None)
    # bìa theo hướng dẫn 2026–2027: lĩnh vực, tên và nội dung cơ bản, người thực hiện, bảo trợ, hướng dẫn, thời gian, địa điểm; không ghi tên đơn vị
    info = [l for l in L if l.split(":")[0] in ("Lĩnh vực", "Người thực hiện", "Người bảo trợ", "Người hướng dẫn", "Thời gian thực hiện", "Địa điểm thực hiện")]
    place = next(l for l in L if l.startswith("…") and "năm 20" in l)
    para(doc, org, 14, True)
    c1, c2 = contest.split(" DÀNH CHO ", 1)
    para(doc, c1, 14, True, before=20)
    para(doc, "DÀNH CHO " + c2, 14, True, before=2)
    para(doc, year, 14, True, before=2)
    para(doc, "BÁO CÁO DỰ ÁN", 18, True, before=70)
    para(doc, title.upper(), 17, True, before=14, spacing=1.2)
    if content:
        p = para(doc, content.split(":", 1)[1].strip(), 13, before=14, align=RT, spacing=1.1)
        p.runs[0].italic = True
    for k, line in enumerate(info):
        key, val = line.split(":", 1)
        p = para(doc, "", 14, before=40 if k == 0 else 6, align=LF)
        r = p.add_run(key + ":"); r.bold = True; r.font.size = Pt(14)
        r = p.add_run(val); r.font.size = Pt(14)
        p.paragraph_format.left_indent = Cm(1.5)
    para(doc, place, 14, before=60)


def toc(doc, here, toc_md, body):
    names = [l.split("|")[1].strip() for l in toc_md.splitlines()
             if l.startswith("|") and (l.startswith("| Chương") or l.startswith("| Tóm tắt") or l.startswith("| Tài liệu"))]
    heads = [(len(m.group(1)), m.group(2)) for m in re.finditer(r"^(##|###) (.+)$", body, flags=re.M)]
    pf = os.path.join(here, "toc_pages.json")
    pages = json.load(open(pf, encoding="utf8")) if os.path.exists(pf) else {}
    entries, k = [], 0
    for lv, txt in heads:
        if lv == 2:
            entries.append({"name": names[k], "key": txt.upper(), "level": 1}); k += 1
        else:
            entries.append({"name": txt, "key": txt, "level": 2})
    json.dump(entries, open(os.path.join(here, "toc_entries.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)
    para(doc, "MỤC LỤC", 16, True, after=14)
    for e in entries:
        size = 14 if e["level"] == 1 else 14
        p = para(doc, "", size, align=LF, before=7 if e["level"] == 1 else 0, after=2)
        r = p.add_run(e["name"]); r.bold = e["level"] == 1; r.font.size = Pt(size)
        r2 = p.add_run("\t" + str(pages.get(e["name"], "…"))); r2.bold = e["level"] == 1; r2.font.size = Pt(size)
        p.paragraph_format.tab_stops.add_tab_stop(Cm(16), WD_TAB_ALIGNMENT.RIGHT, WD_TAB_LEADER.DOTS)
        if e["level"] == 2:
            p.paragraph_format.left_indent = Cm(1)
    extra = next(l for l in toc_md.splitlines() if l.startswith("Bảng:"))
    tb, rest = extra.split(" Hình: ", 1)
    hf, ab = rest.split(" Viết tắt: ", 1)
    para(doc, "Danh mục bảng: " + tb.replace("Bảng: ", "").rstrip(".") + ".", 12, align=LF, before=16)
    para(doc, "Danh mục hình: " + hf.rstrip(".") + ".", 12, align=LF, before=2)
    para(doc, "Từ viết tắt: " + ab, 12, align=RT, before=2)
