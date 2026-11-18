# -*- coding: utf-8 -*-
"""Tách TONG_THE_3_TAM_v4.pptx thành 3 tệp, mỗi tấm một trang đúng khổ thiết kế (tỉ lệ 1:2).
Tên tệp ghi khổ IN (phóng 200 %). Chạy: python -X utf8 tach_3_tam.py"""
import os
from pptx import Presentation
from pptx.util import Emu

HERE = os.path.dirname(os.path.abspath(__file__))
CM = 360000
# (tên, x, y, rộng, cao) theo cm trên trang 134x89; khổ in = gấp đôi
PANELS = [("tam-trai", 5, 22.5, 30, 60), ("tam-giua", 37, 7.5, 60, 75), ("tam-phai", 99, 22.5, 30, 60)]

for name, px, py, pw, ph in PANELS:
    prs = Presentation(os.path.join(HERE, "TONG_THE_3_TAM_v4.pptx"))
    sl = prs.slides[0]
    for sh in list(sl.shapes):
        cx, cy = (sh.left + sh.width / 2) / CM, (sh.top + sh.height / 2) / CM
        # bỏ nền trang, dải chân trang, dòng chú thích tổng thể và mọi thứ nằm ngoài tấm
        if sh.width >= 120 * CM or not (px <= cx <= px + pw and py <= cy <= py + ph):
            sh._element.getparent().remove(sh._element)
        else:
            sh.left, sh.top = Emu(sh.left - int(px * CM)), Emu(sh.top - int(py * CM))
    prs.slide_width, prs.slide_height = Emu(int(pw * CM)), Emu(int(ph * CM))
    out = os.path.join(HERE, f"poster_{name}_{pw * 2:g}x{ph * 2:g}cm.pptx")
    prs.save(out); print("saved", out)
