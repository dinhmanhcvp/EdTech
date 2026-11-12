# -*- coding: utf-8 -*-
"""Bảng màu và hàm vẽ dùng chung cho slide và poster dự thi."""
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from PIL import Image

# ---- màu: navy/đỏ của BTC + bảng màu "Editorial Daylight" của sản phẩm
NAVY = "000054"; RED = "E61E2A"
INK = "141413"; BODY = "44403C"; MUTED = "8A847D"
PAPER = "F8F7F4"; WELL = "F2F0EA"; HAIR = "E6E4DD"
BLUE = "2563EB"; AMBER = "D97706"; AMBER_BG = "FFFBEB"; GREEN = "059669"; GREEN_BG = "ECFDF5"
ROSE_BG = "FFF1F2"; WHITE = "FFFFFF"
SANS = "Aptos"; SERIF = "Cambria"; MONO = "Consolas"


def rgb(h):
    return RGBColor.from_string(h)


def box(slide, x, y, w, h, fill=None, line=None, radius=None, lw=0.75, name=None):
    shp = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE,
                                 Inches(x), Inches(y), Inches(w), Inches(h))
    if radius:
        shp.adjustments[0] = radius
    if fill:
        shp.fill.solid(); shp.fill.fore_color.rgb = rgb(fill)
    else:
        shp.fill.background()
    if line:
        shp.line.color.rgb = rgb(line); shp.line.width = Pt(lw)
    else:
        shp.line.fill.background()
    shp.shadow.inherit = False
    if name:
        shp.name = name
    return shp


def text(slide, x, y, w, h, paras, size=20, color=BODY, font=SANS, align="l", anchor="t",
         line_spacing=1.12, space_after=0, name=None):
    """paras: str | list[para]; para: str | list[run]; run: str | (str, dict)."""
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    if name:
        tb.name = name
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = {"t": MSO_ANCHOR.TOP, "m": MSO_ANCHOR.MIDDLE, "b": MSO_ANCHOR.BOTTOM}[anchor]
    if isinstance(paras, str):
        paras = [paras]
    for i, para in enumerate(paras):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = {"l": PP_ALIGN.LEFT, "c": PP_ALIGN.CENTER, "r": PP_ALIGN.RIGHT}[align]
        p.line_spacing = line_spacing
        if space_after:
            p.space_after = Pt(space_after)
        runs = [para] if isinstance(para, (str, tuple)) else para
        for r in runs:
            t, o = (r, {}) if isinstance(r, str) else r
            run = p.add_run(); run.text = t
            f = run.font
            f.name = o.get("font", font); f.size = Pt(o.get("size", size))
            f.bold = o.get("bold", False); f.italic = o.get("italic", False)
            f.color.rgb = rgb(o.get("color", color))
            if o.get("sub"):
                run._r.get_or_add_rPr().set("baseline", "-25000")
    return tb


def pic(slide, path, x, y, w, h, border=HAIR, align="c"):
    """Ảnh vừa khít trong khung (giữ tỉ lệ) + viền mảnh."""
    iw, ih = Image.open(path).size
    s = min(w / iw, h / ih)
    pw, ph = iw * s, ih * s
    px = x + (w - pw) / 2 if align == "c" else x
    py = y + (h - ph) / 2
    p = slide.shapes.add_picture(path, Inches(px), Inches(py), Inches(pw), Inches(ph))
    if border:
        p.line.color.rgb = rgb(border); p.line.width = Pt(1)
    return p


def chip(slide, x, y, label, fg=NAVY, bg=WELL, size=14, w=None):
    w = w or (0.14 * len(label) * size / 14 + 0.4)
    box(slide, x, y, w, 0.42 * size / 14, fill=bg, line=HAIR, radius=0.25)
    text(slide, x, y, w, 0.42 * size / 14, [[(label, {"font": MONO, "bold": True})]], size=size, color=fg,
         align="c", anchor="m")
    return w


def dot(slide, x, y, d, color):
    s = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x), Inches(y), Inches(d), Inches(d))
    s.fill.solid(); s.fill.fore_color.rgb = rgb(color); s.line.fill.background(); s.shadow.inherit = False
    return s


def arrow(slide, x, y, w, h, color=MUTED):
    s = slide.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, Inches(x), Inches(y), Inches(w), Inches(h))
    s.fill.solid(); s.fill.fore_color.rgb = rgb(color); s.line.fill.background(); s.shadow.inherit = False
    return s


def remove(shape):
    shape._element.getparent().remove(shape._element)




# ---- số liệu thí điểm: đọc chung một file với app và video
import json as _json
import os as _os

PILOT_JSON = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "..", "socratic-monorepo",
                           "packages", "types", "src", "pilot2026.json")
P = _json.load(open(PILOT_JSON, encoding="utf-8"))


def vn(x, d=1):
    """Số kiểu Việt Nam: 7.74 → '7,74', 1420 → '1.420'."""
    return f"{x:,.{d}f}".replace(",", "X").replace(".", ",").replace("X", ".")


def M(t, **o):
    """Ký hiệu toán (N, n, p, d, X̄, SD) in nghiêng chữ có chân."""
    return (t, {"font": SERIF, "italic": True, **o})
