# -*- coding: utf-8 -*-
"""Chuyển ảnh chân dung thường thành ảnh thẻ 3x4: tách nền, căn đầu - vai, nền trơn.

Chạy: python anh_the.py <ảnh gốc> <thư mục ra>
Ra: anh-the-3x4-nen-trang.jpg, anh-the-3x4-nen-xanh.jpg, anh-the-vuong.png (cho khung tròn ở slide 1)
"""
import os, sys
import numpy as np
from PIL import Image, ImageFilter
from rembg import remove, new_session

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)

im = Image.open(SRC).convert("RGB")
# phóng to trước khi tách nền để viền tóc mịn hơn (ảnh gốc chỉ ~450 px)
im = im.resize((im.width * 3, im.height * 3), Image.LANCZOS)
cut = remove(im, session=new_session("u2net_human_seg"), alpha_matting=True,
             alpha_matting_foreground_threshold=240, alpha_matting_background_threshold=15)
a = np.array(cut.split()[-1])

# khung người: hàng đầu tiên có tóc → đỉnh đầu
rows = np.where(a.max(axis=1) > 128)[0]
cols = np.where(a.max(axis=0) > 128)[0]
top = rows[0]
# vùng đầu: từ đỉnh tóc xuống ~40% chiều cao ảnh (trước vai); bề rộng lớn nhất ở đó ≈ bề rộng đầu
head = a[top: top + int(0.40 * a.shape[0])]
spans = [np.where(r > 128)[0][[0, -1]] for r in head if r.max() > 128]
left, right = max(spans, key=lambda s: s[1] - s[0])
cx = (left + right) / 2
head_w = right - left


def card(bg, w, h, head_ratio):
    """Ảnh thẻ: đầu (đỉnh tóc → cằm) chiếm head_ratio chiều cao, chừa ~9% phía trên đỉnh đầu."""
    head_h = head_w * 1.3                     # đỉnh đầu → cằm ≈ 1,3 lần bề rộng đầu
    scale = (h * head_ratio) / head_h
    # ảnh gốc chỉ tới ngực: phóng thêm nếu cần để thân người chạm mép dưới, không hở nền ở đáy
    scale = max(scale, h * 0.91 / (rows[-1] - top))
    W, H = int(cut.width * scale), int(cut.height * scale)
    person = cut.resize((W, H), Image.LANCZOS)
    canvas = Image.new("RGBA", (w, h), bg + (255,))
    ox = int(w / 2 - cx * scale)
    oy = int(h * 0.09 - top * scale)
    canvas.alpha_composite(person, (ox, oy))
    return canvas.convert("RGB")


W3, H4 = 900, 1200  # 3x4 ở 300 dpi
card((255, 255, 255), W3, H4, 0.52).save(os.path.join(OUT, "anh-the-3x4-nen-trang.jpg"), quality=95, dpi=(300, 300))
card((0x3A, 0x7B, 0xD5), W3, H4, 0.52).save(os.path.join(OUT, "anh-the-3x4-nen-xanh.jpg"), quality=95, dpi=(300, 300))
card((0xE8, 0xEE, 0xF8), 900, 900, 0.74).save(os.path.join(OUT, "anh-the-vuong.png"))
print("ok")
