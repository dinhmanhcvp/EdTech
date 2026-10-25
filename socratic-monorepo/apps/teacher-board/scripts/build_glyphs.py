"""Sinh thư viện mẫu ký tự cho bộ nhận dạng chữ viết tay cục bộ (src/utils/inkGlyphs.json).

Mỗi ký tự được vẽ bằng nhiều phông chữ viết tay có sẵn trên Windows, rút "xương" (skeleton) rồi lấy ~N điểm
phân bố đều → đám điểm (point cloud) chuẩn hóa trong hộp đơn vị, GIỮ nguyên tỉ lệ khung (cạnh dài nhất = 1).
Bộ nhận dạng so khớp bằng khoảng cách chamfer hai chiều nên không cần thứ tự/chiều nét.

Chạy: python -I scripts/build_glyphs.py
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from skimage.morphology import skeletonize

FONTS = [
    ("C:/Windows/Fonts/Inkfree.ttf", 0),
    ("C:/Windows/Fonts/segoepr.ttf", 0),   # Segoe Print
    ("C:/Windows/Fonts/comic.ttf", 0),     # Comic Sans
    ("C:/Windows/Fonts/LHANDW.TTF", 0),    # Lucida Handwriting
    ("C:/Windows/Fonts/segoesc.ttf", 0),   # Segoe Script
    # chữ in tay (người viết bảng thường viết nét in): phông không chân
    ("C:/Windows/Fonts/arial.ttf", 0),
    ("C:/Windows/Fonts/calibri.ttf", 0),
    ("C:/Windows/Fonts/verdana.ttf", 0),
    ("C:/Windows/Fonts/tahoma.ttf", 0),
]
# Phông có đủ ký hiệu toán/Hy Lạp (chữ in, dùng cho ký hiệu mà phông viết tay thiếu)
SYMBOL_FONTS = [("C:/Windows/Fonts/cambria.ttc", 1), ("C:/Windows/Fonts/seguisym.ttf", 0), ("C:/Windows/Fonts/times.ttf", 0)]

DIGITS = "0123456789"
LOWER = "abcdefghijklmnopqrstuvwxyz"
UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
OPS = "+-=()/.,<>[]|:!"
MATH = "×÷≤≥≠°√∫π∞αβγδθλμρσφωΔΣ"
N = 40
SIZE = 220


def load(path, idx):
    try:
        return ImageFont.truetype(path, SIZE, index=idx)
    except Exception:
        return None


def missing_mask(font):
    """Ảnh của ký tự không tồn tại (dùng để phát hiện phông thiếu ký tự)."""
    m = font.getmask("\uE0FF")
    return (m.size, bytes(m)) if m.size[0] else None


def render(font, ch, miss):
    mask = font.getmask(ch)
    if not mask.size[0] or not mask.size[1]:
        return None
    if miss is not None and (mask.size, bytes(mask)) == miss:
        return None
    img = Image.new("L", (SIZE * 2, SIZE * 2), 0)
    d = ImageDraw.Draw(img)
    d.text((SIZE // 2, SIZE // 4), ch, font=font, fill=255)
    arr = np.array(img) > 110
    ys, xs = np.nonzero(arr)
    if len(xs) < 20:
        return None
    return arr[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]


def skeleton_points(arr, n=N):
    # làm dày nhẹ để xương liền mạch rồi rút xương
    sk = skeletonize(arr)
    ys, xs = np.nonzero(sk)
    if len(xs) < 3:
        ys, xs = np.nonzero(arr)
    pts = np.c_[xs, -ys].astype(float)  # y hướng lên
    # lấy mẫu điểm xa nhất (farthest point sampling) → phân bố đều theo không gian
    sel = [0]
    dist = np.linalg.norm(pts - pts[0], axis=1)
    for _ in range(min(n, len(pts)) - 1):
        j = int(np.argmax(dist))
        sel.append(j)
        dist = np.minimum(dist, np.linalg.norm(pts - pts[j], axis=1))
    out = pts[sel]
    if len(out) < n:  # ký tự rất nhỏ: nhân bản điểm để đủ N
        out = np.vstack([out, out[np.random.default_rng(0).integers(0, len(out), n - len(out))]])
    mn = out.min(axis=0)
    mx = out.max(axis=0)
    span = max(mx[0] - mn[0], mx[1] - mn[1], 1e-6)
    out = (out - (mn + mx) / 2) / span  # tâm tại 0, cạnh dài nhất = 1
    return out, (mx[0] - mn[0]) / span, (mx[1] - mn[1]) / span


def poly_cloud(strokes, n=N):
    """Đám điểm từ các nét vẽ tay bằng hình học (không qua phông): lấy mẫu đều theo cung rồi xa-nhất như skeleton_points."""
    pts = []
    for st in strokes:
        st = np.array(st, float)
        seg = np.linalg.norm(np.diff(st, axis=0), axis=1)
        d = np.r_[0, np.cumsum(seg)]
        k = max(4, int(d[-1] / 0.02))
        u = np.linspace(0, d[-1], k)
        pts.append(np.c_[np.interp(u, d, st[:, 0]), np.interp(u, d, st[:, 1])])
    pts = np.vstack(pts)
    sel = [0]
    dist = np.linalg.norm(pts - pts[0], axis=1)
    for _ in range(min(n, len(pts)) - 1):
        j = int(np.argmax(dist))
        sel.append(j)
        dist = np.minimum(dist, np.linalg.norm(pts - pts[j], axis=1))
    out = pts[sel]
    mn, mx = out.min(axis=0), out.max(axis=0)
    span = max(mx[0] - mn[0], mx[1] - mn[1], 1e-6)
    out = (out - (mn + mx) / 2) / span
    return out, (mx[0] - mn[0]) / span, (mx[1] - mn[1]) / span


def circle(cx, cy, r, a0=0.0, a1=2 * np.pi, k=48):
    t = np.linspace(a0, a1, k)
    return np.c_[cx + r * np.cos(t), cy + r * np.sin(t)]


# Dạng viết tay một tầng của a, d, q, g và vài biến thể số thường bị phông bỏ sót (y hướng lên)
EXTRAS = {
    "a": [[circle(0.3, 0.3, 0.3), [[0.6, 0.6], [0.6, 0.0]]],
          [circle(0.3, 0.3, 0.3, 0.6, 2 * np.pi + 0.3), [[0.6, 0.6], [0.6, 0.0]]]],
    "d": [[circle(0.3, 0.3, 0.3), [[0.6, 1.0], [0.6, 0.0]]]],
    "q": [[circle(0.3, 0.3, 0.3), [[0.6, 0.6], [0.6, -0.4]]]],
    "g": [[circle(0.3, 0.3, 0.3), np.vstack([[[0.6, 0.6], [0.6, -0.2]], circle(0.3, -0.2, 0.3, 0.0, -np.pi * 0.85)[1:]])]],
    "4": [[[[0.5, 1.0], [0.0, 0.3], [0.7, 0.3]], [[0.5, 1.0], [0.5, 0.0]]],
          [[[0.0, 1.0], [0.0, 0.4], [0.6, 0.4]], [[0.6, 1.0], [0.6, 0.0]]]],
    "7": [[[[0.0, 1.0], [0.6, 1.0], [0.2, 0.0]]],
          [[[0.0, 1.0], [0.6, 1.0], [0.2, 0.0]], [[0.12, 0.5], [0.5, 0.5]]]],
    "1": [[[[0.0, 0.8], [0.2, 1.0], [0.2, 0.0]]], [[[0.2, 1.0], [0.2, 0.0]]]],
}


def main():
    chars = DIGITS + LOWER + UPPER + OPS + MATH
    fonts = [(p, i, load(p, i)) for p, i in FONTS]
    fonts = [f for f in fonts if f[2] is not None]
    symfonts = [(p, i, load(p, i)) for p, i in SYMBOL_FONTS]
    symfonts = [f for f in symfonts if f[2] is not None]
    print("phông viết tay:", [os.path.basename(f[0]) for f in fonts], "| phông ký hiệu:", [os.path.basename(f[0]) for f in symfonts])
    templates = []
    per_char = {}
    for ch in chars:
        pool = fonts + (symfonts if ch in MATH or ch in "|[]" else [])
        used = 0
        for fi, (path, idx, font) in enumerate(pool):
            arr = render(font, ch, missing_mask(font))
            if arr is None:
                continue
            pts, w, h = skeleton_points(arr)
            templates.append({"c": ch, "f": fi, "w": round(float(w), 3), "h": round(float(h), 3), "p": [[round(float(x), 3), round(float(y), 3)] for x, y in pts]})
            used += 1
        per_char[ch] = used
    for ch, variants in EXTRAS.items():
        for vi, strokes in enumerate(variants):
            pts, w, h = poly_cloud([np.array(x) for x in strokes])
            templates.append({"c": ch, "f": 100 + vi, "w": round(float(w), 3), "h": round(float(h), 3), "p": [[round(float(x), 3), round(float(y), 3)] for x, y in pts]})
    missing = [c for c, n in per_char.items() if n == 0]
    print("ký tự:", len(chars), "| mẫu:", len(templates), "| ký tự không có mẫu:", "".join(missing) or "không")
    out = os.path.join(os.path.dirname(__file__), "..", "src", "utils", "inkGlyphs.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump({"n": N, "templates": templates}, f, ensure_ascii=False, separators=(",", ":"))
    print("ghi", os.path.abspath(out), round(os.path.getsize(out) / 1024), "KB")


if __name__ == "__main__":
    sys.exit(main())
