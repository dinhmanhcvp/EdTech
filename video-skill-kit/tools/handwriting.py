"""Sinh nét viết tay tự nhiên cho công thức (thay cho nét mẫu toàn đoạn thẳng của app).

Nguồn nét: phông nét đơn Hershey (rowmans + greeks), rồi "người hóa":
  - mỗi ký tự lệch cỡ, xoay, nghiêng, dòng chữ trôi nhẹ; khoảng cách chữ không đều
  - đường nét được làm dày điểm, bo góc (Chaikin) và rung tay tần số thấp
  - tốc độ bút: nhanh giữa nét, chậm ở đầu/cuối và chỗ gấp; nhấc bút mất 70-160 ms
Cú pháp: _x hoặc _{..} chỉ số dưới, ^x / ^{..} chỉ số trên, \\sqrt{..} căn, \\eq (⇌), \\deg (°), \\equiv (≡).
Ra: tools/hand-ink.json  {id: {strokes: [[[x, y, ms], ...]], w, h}}  (đơn vị: chiều cao chữ hoa = 1)
Dùng: python -I tools/handwriting.py [ảnh xem trước.png]
"""
import json
import math
import os
import sys

import numpy as np
from HersheyFonts import HersheyFonts

FORMULAS = {
    "P": r"v_0 = 24 m/s,  \alpha = 45\deg",
    "R": r"Z = \sqrt{R^2 + (Z_L - Z_C)^2}",
    "H": r"N_2 + 3H_2 \eq 2NH_3",
    "B": r"ADN:  A = T,  G \equiv X",
    # Launch v3: các tính năng mới (chữ viết trên bảng; gợi ý gõ kèm nằm ở tools/clips4.mjs)
    "conv": r"x^2 - 5x + 6 = 0",
    "graph": r"y = sin x ;  y = x^2/4",
    "oxyz": r"x^2 + y^2 + z^2 = 9",
    "revolve": r"V = \pi \int f(x)^2 dx",
    "lattice": r"FCC",
    "sn2": r"OH^- + CH_3Cl",
    "cyclo": r"C_6H_{12}",
    "etc": r"ADP + P \eq ATP",
    "lotka": r"dx/dt = ax - bxy",
    "pendulum": r"m_1 , L_1 ;  m_2 , L_2",
}

roman = HersheyFonts()
roman.load_default_font("rowmans")
greek = HersheyFonts()
greek.load_default_font("greeks")
GREEK = {r"\alpha": "a", r"\omega": "w", r"\Delta": "D", r"\pi": "p"}
# Hershey dùng y hướng xuống: lấy chân và đỉnh chữ "H" làm đường chân chữ / chiều cao chữ hoa
_H = np.vstack([np.array(s, float) for s in roman.strokes_for_text("H")])
BASE, CAP = _H[:, 1].max(), _H[:, 1].max() - _H[:, 1].min()


def glyph(ch, font=roman):
    """Các nét của một ký tự (đơn vị: chữ hoa = 1, gốc trái-dưới, y hướng lên) + độ rộng."""
    strokes = [np.c_[np.array(s, float)[:, 0], BASE - np.array(s, float)[:, 1]] / CAP for s in font.strokes_for_text(ch)]
    xs = [p[0] for s in strokes for p in s] or [0.0]
    lo, hi = min(xs), max(xs)
    for s in strokes:
        s[:, 0] -= lo
    width = (hi - lo) if strokes else 0.45
    return strokes, width


def tokenize(src):
    out, i = [], 0
    while i < len(src):
        if src[i] == "\\":
            j = i + 1
            while j < len(src) and src[j].isalpha():
                j += 1
            out.append(src[i:j])
            i = j
        elif src[i] in "_^{}":
            out.append(src[i])
            i += 1
        else:
            out.append(src[i])
            i += 1
    return out


class Layout:
    def __init__(self, rng):
        self.rng = rng
        self.x = 0.0
        self.items = []  # (strokes list[np.array]) đã đặt vị trí, theo thứ tự viết

    def put(self, strokes, width, scale=1.0, dy=0.0):
        r = self.rng
        sc = scale * r.uniform(0.92, 1.07)
        rot = math.radians(r.normal(0, 2.2))
        slant = 0.16 + r.normal(0, 0.03)
        base = dy + 0.035 * math.sin(self.x * 0.55) + r.normal(0, 0.018)
        placed = []
        for s in strokes:
            p = s.copy() * sc
            p[:, 0] += p[:, 1] * slant
            c, si = math.cos(rot), math.sin(rot)
            p = p @ np.array([[c, si], [-si, c]])
            p[:, 0] += self.x
            p[:, 1] += base
            placed.append(p)
        self.items.append(placed)
        self.x += width * sc + r.uniform(0.07, 0.16) * scale

    def space(self, w=0.38):
        self.x += w * self.rng.uniform(0.8, 1.2)


def build(src, rng):
    L = Layout(rng)
    toks = tokenize(src)
    i = 0

    def group(seq, k):
        """Đọc một nhóm {..} hoặc một ký tự sau _ / ^."""
        if seq[k] == "{":
            d, j = 1, k + 1
            while d:
                d += {"{": 1, "}": -1}.get(seq[j], 0)
                j += 1
            return seq[k + 1 : j - 1], j
        return [seq[k]], k + 1

    def emit(seq, scale=1.0, dy=0.0):
        nonlocal L
        k = 0
        while k < len(seq):
            t = seq[k]
            if t == " ":
                L.space(0.32 * scale)
            elif t in ("_", "^"):
                g, k2 = group(seq, k + 1)
                emit(g, scale * 0.62, dy + (-0.28 if t == "_" else 0.52) * scale)
                k = k2
                continue
            elif t == r"\sqrt":
                g, k2 = group(seq, k + 1)
                x0 = L.x
                tick = [np.array([[0, 0.45], [0.12, 0.52], [0.3, -0.12], [0.55, 1.18]]) * scale]
                tick[0][:, 1] += dy
                L.put(tick, 0.5 * scale, 1.0)
                xs = L.x
                emit(g, scale, dy)
                # gạch ngang của căn viết sau cùng, hơi dốc lên như tay người
                bar = np.array([[xs - 0.05, 1.2 * scale + dy], [L.x + 0.05, 1.25 * scale + dy]])
                L.items.append([bar])
                _ = x0
                k = k2
                continue
            elif t in GREEK:
                s, w = glyph(GREEK[t], greek)
                L.put(s, w, scale, dy)
            elif t == r"\deg":
                th = np.linspace(0, 2 * math.pi, 14)
                L.put([np.c_[0.14 + 0.13 * np.cos(th), 0.95 + 0.13 * np.sin(th)] * scale], 0.3 * scale, 1.0, dy)
            elif t == r"\eq":
                up = np.array([[0, 0.62], [0.9, 0.62], [0.72, 0.8]])
                dn = np.array([[0.9, 0.32], [0, 0.32], [0.18, 0.14]])
                L.put([up * scale, dn * scale], 0.95 * scale, 1.0, dy)
            elif t == r"\int":
                # dấu tích phân: nét S cao, viết một hơi
                L.put([np.array([[0.46, 1.36], [0.36, 1.46], [0.27, 1.3], [0.21, 0.5], [0.15, -0.2], [0.06, -0.38], [-0.04, -0.28]]) * scale], 0.5 * scale, 1.0, dy)
            elif t == r"\equiv":
                L.put([np.array([[0, y], [0.6, y]]) * scale for y in (0.25, 0.5, 0.75)], 0.6 * scale, 1.0, dy)
            else:
                s, w = glyph(t)
                if not s:
                    L.space(0.3 * scale)
                else:
                    L.put(s, w, scale, dy)
            k += 1

    emit(toks)
    return L.items


def chaikin(p, n=2):
    for _ in range(n):
        if len(p) < 3:
            return p
        q = [p[0]]
        for a, b in zip(p[:-1], p[1:]):
            q += [0.75 * a + 0.25 * b, 0.25 * a + 0.75 * b]
        q.append(p[-1])
        p = np.array(q)
    return p


def resample(p, step=0.02):
    d = np.r_[0, np.cumsum(np.linalg.norm(np.diff(p, axis=0), axis=1))]
    if d[-1] < 1e-6:
        return p[:1].repeat(2, axis=0)
    s = np.linspace(0, d[-1], max(2, int(d[-1] / step) + 1))
    return np.c_[np.interp(s, d, p[:, 0]), np.interp(s, d, p[:, 1])]


def humanize(items, rng):
    out = []
    t = 0.0
    for placed in items:
        for s in placed:
            p = resample(chaikin(s), 0.018)
            # rung tay tần số thấp vuông góc với hướng nét
            n = len(p)
            tang = np.gradient(p, axis=0)
            tang /= np.linalg.norm(tang, axis=1, keepdims=True) + 1e-9
            nor = np.c_[-tang[:, 1], tang[:, 0]]
            u = np.linspace(0, 1, n)
            amp = 0.012
            wob = amp * (np.sin(u * rng.uniform(3, 6) + rng.uniform(0, 6)) + 0.5 * np.sin(u * rng.uniform(9, 14) + rng.uniform(0, 6)))
            p = p + nor * wob[:, None]
            # tốc độ: chuông theo chiều dài nét, giảm ở chỗ gấp
            seg = np.linalg.norm(np.diff(p, axis=0), axis=1)
            turn = np.r_[0, np.abs(np.diff(np.arctan2(np.diff(p[:, 1]), np.diff(p[:, 0]))))]
            turn = np.minimum(turn, math.pi)
            uu = (np.arange(len(seg)) + 0.5) / max(1, len(seg))
            speed = 4.2 * (0.35 + 0.65 * np.sin(math.pi * uu)) / (1 + 2.5 * turn)  # chữ hoa / giây
            dt = seg / np.maximum(speed, 0.4) * 1000
            times = t + np.r_[0, np.cumsum(dt)]
            out.append(np.c_[p, times])
            t = times[-1] + rng.uniform(70, 160)
    # chuẩn hóa: gốc trái-trên, y hướng xuống
    allp = np.vstack(out)
    x0, y1 = allp[:, 0].min(), allp[:, 1].max()
    res = []
    for s in out:
        q = s.copy()
        q[:, 0] -= x0
        q[:, 1] = y1 - q[:, 1]
        res.append([[round(a, 4), round(b, 4), round(c, 1)] for a, b, c in q])
    w = float(allp[:, 0].max() - x0)
    h = float(y1 - allp[:, 1].min())
    return res, w, h


def main():
    data = {}
    for k, src in FORMULAS.items():
        rng = np.random.default_rng(sum(map(ord, k)) * 7 + 3)
        strokes, w, h = humanize(build(src, rng), rng)
        data[k] = {"src": src, "strokes": strokes, "w": round(w, 3), "h": round(h, 3), "ms": strokes[-1][-1][2]}
        print(k, src, f"{len(strokes)} nét, {data[k]['ms'] / 1000:.1f}s, {w:.1f}x{h:.1f}")
    with open(os.path.join(os.path.dirname(__file__), "hand-ink.json"), "w", encoding="utf-8") as f:
        json.dump(data, f)
    if len(sys.argv) > 1:
        import cv2

        rows = []
        for k, d in data.items():
            S = 90
            img = np.full((int((d["h"] + 0.8) * S), int((d["w"] + 0.8) * S), 3), (238, 243, 246), np.uint8)
            for s in d["strokes"]:
                pts = (np.array(s)[:, :2] * S + 0.4 * S).astype(np.int32)
                cv2.polylines(img, [pts], False, (235, 99, 37), 6, cv2.LINE_AA)
            rows.append(cv2.copyMakeBorder(img, 6, 6, 6, 1600 - img.shape[1] if img.shape[1] < 1600 else 6, cv2.BORDER_CONSTANT, value=(255, 255, 255)))
        wmax = max(r.shape[1] for r in rows)
        rows = [cv2.copyMakeBorder(r, 0, 0, 0, wmax - r.shape[1], cv2.BORDER_CONSTANT, value=(255, 255, 255)) for r in rows]
        cv2.imwrite(sys.argv[1], np.vstack(rows))


main()
