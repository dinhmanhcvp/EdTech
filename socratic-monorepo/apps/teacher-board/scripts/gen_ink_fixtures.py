"""Sinh nét viết tay giả lập (phông nét đơn Hershey + 'người hóa') làm dữ liệu kiểm thử cho bộ nhận dạng cục bộ.

Nguồn nét ĐỘC LẬP với thư viện mẫu (inkGlyphs.json dựng từ phông TrueType viết tay) nên phép đo độ chính xác có ý nghĩa
hơn việc tự so với chính mẫu. Vẫn là nét giả lập - không thay thế được thử nghiệm với nét viết tay thật.

Chạy: python -I scripts/gen_ink_fixtures.py  (cần HersheyFonts, numpy; mượn hàm từ socratic-video/tools/handwriting.py)
Ra: src/__tests__/fixtures/ink-fixtures.json  {id: {src, expect, variants: [[[ [x,y], ... ]  (nét) ]]}}
"""
import json
import math
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
HW = os.path.normpath(os.path.join(HERE, "..", "..", "..", "..", "socratic-video", "tools", "handwriting.py"))
src = open(HW, encoding="utf-8-sig").read().rsplit("\nmain()", 1)[0]
ns = {"__file__": HW, "__name__": "hw"}
exec(compile(src, HW, "exec"), ns)
Layout, glyph, tokenize, humanize = ns["Layout"], ns["glyph"], ns["tokenize"], ns["humanize"]

# (id, nguồn viết, kết quả mong đợi dạng văn bản chuẩn hóa)
CASES = [
    ("lin1", "2x+3=7", "2x+3=7"),
    ("lin2", "3x-5=2x+1", "3x-5=2x+1"),
    ("par", "y=x^2-3", "y=x^2-3"),
    ("circ", "x^2+y^2=25", "x^2+y^2=25"),
    ("pyth", "a^2+b^2=c^2", "a^2+b^2=c^2"),
    ("sinf", "y=A sin x+B", "y=Asinx+B"),
    ("fx", "f(x)=2x^2-4x+1", "f(x)=2x^2-4x+1"),
    ("neg", "y=-x+4", "y=-x+4"),
    ("sum", "12+35=47", "12+35=47"),
    ("sub", "x_1+x_2=5", "x_1+x_2=5"),
    ("frac1", r"\frac{1}{2}+\frac{3}{4}", "1/2+3/4"),
    ("frac2", r"\frac{x+1}{x-1}=2", "(x+1)/(x-1)=2"),
    ("sqrt1", r"y=\sqrt{x+1}", "y=sqrt(x+1)"),
    ("cub", "y=x^3-3x", "y=x^3-3x"),
    ("two", "x+y=5|x-y=1", "x+y=5|x-y=1"),
]


def build_line(s, rng, y0=0.0):
    L = Layout(rng)
    toks = tokenize(s)

    def group(seq, k):
        if seq[k] == "{":
            d, j = 1, k + 1
            while d:
                d += {"{": 1, "}": -1}.get(seq[j], 0)
                j += 1
            return seq[k + 1 : j - 1], j
        return [seq[k]], k + 1

    def emit(seq, scale=1.0, dy=0.0):
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
                tick = [np.array([[0, 0.45], [0.12, 0.52], [0.3, -0.12], [0.55, 1.18]]) * scale]
                tick[0][:, 1] += dy
                L.put(tick, 0.5 * scale, 1.0)
                xs = L.x
                emit(g, scale, dy)
                bar = np.array([[xs - 0.05, 1.2 * scale + dy], [L.x + 0.05, 1.25 * scale + dy]])
                L.items.append([bar])
                k = k2
                continue
            elif t == r"\frac":
                n, k2 = group(seq, k + 1)
                d, k3 = group(seq, k2)
                x0 = L.x
                si = len(L.items)
                emit(n, scale * 0.78, dy + 0.72 * scale)
                nw = L.x - x0 - 0.1
                sj = len(L.items)
                L.x = x0
                emit(d, scale * 0.78, dy - 0.6 * scale)
                dw = L.x - x0 - 0.1
                W = max(nw, dw) + 0.2
                for items, off in ((L.items[si:sj], (W - nw) / 2), (L.items[sj:], (W - dw) / 2)):
                    for placed in items:
                        for q in placed:
                            q[:, 0] += off
                bar = np.array([[x0, 0.45 * scale + dy], [x0 + W, 0.47 * scale + dy]])
                L.items.append([bar])
                L.x = x0 + W + 0.14
                k = k3
                continue
            else:
                s_, w = glyph(t)
                if not s_:
                    L.space(0.3 * scale)
                else:
                    L.put(s_, w, scale, dy)
            k += 1

    emit(toks)
    return L.items


def main():
    out = {}
    for ci, (cid, srcs, expect) in enumerate(CASES):
        variants = []
        for seed in range(3):
            rng = np.random.default_rng(1000 + ci * 17 + seed)
            lines = srcs.split("|")
            allstrokes = []
            yoff = 0.0
            for li, ln in enumerate(lines):
                items = build_line(ln, rng)
                strokes, w, h = humanize(items, rng)
                for s in strokes:
                    allstrokes.append([[p[0], p[1] + yoff] for p in s])
                yoff += h + 1.3
            # lấy thưa (khoảng 0.045 chữ hoa) cho nhẹ file
            thin = []
            for s in allstrokes:
                a = np.array(s)
                keep = [0]
                for i in range(1, len(a) - 1):
                    if np.linalg.norm(a[i] - a[keep[-1]]) >= 0.045:
                        keep.append(i)
                keep.append(len(a) - 1)
                thin.append([[round(float(a[i][0]), 3), round(float(a[i][1]), 3)] for i in keep])
            variants.append(thin)
        out[cid] = {"src": srcs, "expect": expect, "variants": variants}
    path = os.path.join(HERE, "..", "src", "__tests__", "fixtures", "ink-fixtures.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print("ghi", os.path.abspath(path), round(os.path.getsize(path) / 1024), "KB,", len(out), "công thức x3 biến thể")


if __name__ == "__main__":
    sys.exit(main())
