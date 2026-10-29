"""Nét vẽ tay giả lập cho kịch bản, cố cho giống tay người trên bảng:
- hình dạng: cạnh hơi cong, run nhẹ tần số thấp, đỉnh lệch vài px, cạnh vẽ quá đà một chút, góc hơi bo;
- nhịp: mỗi nét tăng tốc rồi giảm tốc (hồ sơ min-jerk), tốc độ và khoảng nghỉ giữa các nét không đều.
"""
from __future__ import annotations

import math
import random
from typing import List, Sequence, Tuple

Point = Tuple[float, float]
_rng = random.Random(7)


def _smooth_noise(n: int, amp: float) -> List[float]:
    """Run tần số thấp: tổng vài sóng sin pha ngẫu nhiên (không lắc răng cưa như nhiễu trắng)."""
    waves = [(_rng.uniform(0.6, 1.6), _rng.uniform(0, 2 * math.pi), _rng.uniform(0.4, 1.0)) for _ in range(3)]
    total = sum(w[2] for w in waves)
    return [amp * sum(a * math.sin(f * 2 * math.pi * i / max(1, n - 1) + ph) for f, ph, a in waves) / total for i in range(n)]


def _resample(pts: Sequence[Point], step: float) -> List[Point]:
    out = [pts[0]]
    for a, b in zip(pts, pts[1:]):
        n = max(1, int(math.dist(a, b) / step))
        out.extend((a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n) for i in range(1, n + 1))
    return out


def _chaikin(pts: List[Point], rounds: int = 1, closed: bool = False) -> List[Point]:
    for _ in range(rounds):
        q = [pts[0]] if not closed else []
        for a, b in zip(pts, pts[1:]):
            q += [(0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]), (0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1])]
        pts = q + ([pts[-1]] if not closed else [q[0]])
    return pts


def hand_path(vertices: Sequence[Point], wobble: float = 1.6, bow: float = 0.012, slop: float = 2.5, overshoot: float = 5.0) -> List[Point]:
    """Đường gấp khúc qua các đỉnh, vẽ như tay người."""
    v = [(x + _rng.uniform(-slop, slop), y + _rng.uniform(-slop, slop)) for x, y in vertices]
    closed = math.dist(vertices[0], vertices[-1]) < 1
    if closed:
        v[-1] = (v[0][0] + _rng.uniform(-4, 4), v[0][1] + _rng.uniform(-4, 4))  # nét khép không trùng khít
    pts: List[Point] = []
    for a, b in zip(v, v[1:]):
        L = math.dist(a, b)
        nx, ny = (-(b[1] - a[1]) / L, (b[0] - a[0]) / L) if L else (0, 0)
        k = _rng.uniform(-1, 1) * bow * L
        seg = _resample([a, b], 4.0)
        bowed = [(x + nx * k * math.sin(math.pi * i / max(1, len(seg) - 1)), y + ny * k * math.sin(math.pi * i / max(1, len(seg) - 1))) for i, (x, y) in enumerate(seg)]
        pts.extend(bowed if not pts else bowed[1:])
    # quá đà ở cuối nét
    if len(pts) > 2 and overshoot > 0:
        (x0, y0), (x1, y1) = pts[-2], pts[-1]
        d = math.dist((x0, y0), (x1, y1)) or 1
        o = _rng.uniform(0.3, 1.0) * overshoot
        pts.append((x1 + (x1 - x0) / d * o, y1 + (y1 - y0) / d * o))
    noise = _smooth_noise(len(pts), wobble)
    out = []
    for i, (x, y) in enumerate(pts):
        a, b = pts[max(0, i - 1)], pts[min(len(pts) - 1, i + 1)]
        L = math.dist(a, b) or 1
        out.append((x - (b[1] - a[1]) / L * noise[i], y + (b[0] - a[0]) / L * noise[i]))
    return _chaikin(out, 1)


def ellipse(cx: float, cy: float, rx: float, ry: float, start: float = -2.2, turns: float = 1.1, n: int = 72) -> List[Point]:
    """Vòng khoanh: méo nhẹ, hơi quá một vòng như tay người."""
    ex = _smooth_noise(n + 1, 0.05)
    return [(cx + rx * (1 + ex[i]) * math.cos(start + 2 * math.pi * turns * i / n),
             cy + ry * (1 - ex[i]) * math.sin(start + 2 * math.pi * turns * i / n)) for i in range(n + 1)]


def cube(x: float, y: float, s: float, depth: float = 0.45) -> List[List[Point]]:
    """Hình lập phương 6 nét: mặt trước, mặt sau, bốn cạnh nối."""
    d = s * depth
    A, B, C, D = (x, y + s), (x + s, y + s), (x + s, y), (x, y)
    A2, B2, C2, D2 = [(px + d, py - d) for px, py in (A, B, C, D)]
    strokes = [hand_path([A, B, C, D, A]), hand_path([A2, B2, C2, D2, A2])]
    strokes += [hand_path([p, q], wobble=1.0, overshoot=4) for p, q in ((A, A2), (B, B2), (C, C2), (D, D2))]
    return strokes


FONT = "C:/Windows/Fonts/Inkfree.ttf"


def _trace_skeleton(sk) -> List[List[Point]]:
    """Dò ảnh xương (1 px) thành các nét: đi từ đầu mút, ở chỗ rẽ nhánh chọn hướng ít đổi nhất (nét dài, liền như tay viết)."""
    import numpy as np

    ys, xs = np.nonzero(sk)
    pix = set(zip(xs.tolist(), ys.tolist()))
    nb = lambda p: [(p[0] + dx, p[1] + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if (dx or dy) and (p[0] + dx, p[1] + dy) in pix]
    used = set()
    edge = lambda a, b: (a, b) if a < b else (b, a)

    def walk(start):
        path, cur, prev = [start], start, None
        while True:
            cand = [q for q in nb(cur) if edge(cur, q) not in used]
            if not cand:
                return path
            if prev is not None:
                d0 = (cur[0] - prev[0], cur[1] - prev[1])
                cand.sort(key=lambda q: -((q[0] - cur[0]) * d0[0] + (q[1] - cur[1]) * d0[1]) / (math.hypot(q[0] - cur[0], q[1] - cur[1]) * math.hypot(*d0) or 1))
            nxt = cand[0]
            for q in nb(cur):  # bỏ các cạnh chéo thừa quanh điểm vừa đi
                if q != nxt and q in nb(nxt):
                    used.add(edge(cur, q))
            used.add(edge(cur, nxt))
            prev, cur = cur, nxt
            path.append(cur)

    strokes = []
    ends = sorted([p for p in pix if len(nb(p)) == 1], key=lambda p: (p[0], p[1]))
    for e in ends:
        if any(edge(e, q) not in used for q in nb(e)):
            strokes.append(walk(e))
    for p in sorted(pix):  # vòng kín (o, a, đ…): bắt đầu từ điểm trên cùng bên trái
        if any(edge(p, q) not in used for q in nb(p)):
            strokes.append(walk(p))
    return [s for s in strokes if len(s) >= 4]


def _rdp(pts: List[Point], eps: float) -> List[Point]:
    if len(pts) < 3:
        return pts
    a, b = pts[0], pts[-1]
    L = math.dist(a, b) or 1
    dmax, idx = 0.0, 0
    for i in range(1, len(pts) - 1):
        d = abs((b[0] - a[0]) * (a[1] - pts[i][1]) - (a[0] - pts[i][0]) * (b[1] - a[1])) / L
        if d > dmax:
            dmax, idx = d, i
    if dmax <= eps:
        return [a, b]
    return _rdp(pts[: idx + 1], eps)[:-1] + _rdp(pts[idx:], eps)


def text(s: str, x: float, y: float, height: float, font: str = FONT, slant: float = 0.08) -> List[List[Point]]:
    """Chữ viết tay: `height` là chiều cao chữ hoa (px trên bảng), (x, y) góc trên trái. Dấu thanh viết sau phần thân chữ của từng từ."""
    import numpy as np
    from PIL import Image, ImageDraw, ImageFont
    from skimage.morphology import skeletonize

    size = 160
    f = ImageFont.truetype(font, size)
    s, marks = _font_safe(s, font)
    l, t, r, b = f.getbbox(s)
    img = Image.new("L", (r - l + 40, b - t + 40), 0)
    ImageDraw.Draw(img).text((20 - l, 20 - t), s, font=f, fill=255)
    sk = skeletonize(np.array(img) > 110)
    k = height / (f.getbbox("H")[3] - f.getbbox("H")[1])
    to_board = lambda px, py: (x + (px - 20) * k - (py - 20) * k * slant, y + (py - 20) * k)
    raw = _trace_skeleton(sk)
    strokes = []
    for st in raw:
        pts = _rdp([(float(px), float(py)) for px, py in st], 0.8)
        pts = [to_board(px, py) for px, py in pts]
        strokes.append(_chaikin(_resample(pts, 3.0), 1))
    # dấu thanh phông không có: vẽ tay phía trên (hoặc dưới với dấu nặng) chữ gốc
    for i, mark in marks:
        x0, x1 = 20 - l + f.getlength(s[:i]), 20 - l + f.getlength(s[: i + 1])
        top = 20 - t + f.getbbox(s[i])[1]
        base = 20 - t + f.getbbox("x")[3]
        u = size * 0.22
        cx = (x0 + x1) / 2 + u * 0.35
        cy = base + u * 0.9 if mark == "̣" else top - u * 0.75
        for st in _mark_strokes(mark, cx, cy, u):
            strokes.append(_chaikin(_resample([to_board(px, py) for px, py in st], 3.0), 1))
    # thứ tự viết: từng từ trái → phải; trong từ, nét thân trước, nét nhỏ ở trên (dấu, chấm) sau
    words = []
    for st in strokes:
        cx = sum(p[0] for p in st) / len(st)
        words.append((cx, st))
    gaps = _word_bounds(s, x, height, f, k)
    def key(item):
        cx, st = item
        w = next((i for i, (a, b) in enumerate(gaps) if a <= cx <= b), 0)
        small = (max(p[1] for p in st) - min(p[1] for p in st)) < height * 0.35 and min(p[1] for p in st) < y + height * 0.2
        return (w, small, min(p[0] for p in st))
    ordered = [st for _, st in sorted(words, key=key)]
    return [hand_like(st) for st in ordered]


TONE_MARKS = "̣̀́̃̉"


def _font_safe(s: str, font: str):
    """Chữ phông không có (VD 'ắ'): bỏ dần dấu thanh tới khi phông có chữ gốc ('ă'); trả (chuỗi thay thế, [(vị trí, dấu)])."""
    import unicodedata

    from fontTools.ttLib import TTFont

    cmap = TTFont(font).getBestCmap()
    out, marks = [], []
    for ch in s:
        if ord(ch) in cmap or ch == " ":
            out.append(ch)
            continue
        parts = unicodedata.normalize("NFD", ch)
        tone = [c for c in parts if c in TONE_MARKS]
        base = unicodedata.normalize("NFC", "".join(c for c in parts if c not in TONE_MARKS))
        if ord(base[0]) not in cmap:
            base = parts[0]
        out.append(base[0])
        marks += [(len(out) - 1, m) for m in tone]
    return "".join(out), marks


def _mark_strokes(mark: str, cx: float, cy: float, u: float) -> List[List[Point]]:
    if mark == "́":  # sắc
        return [[(cx - 0.25 * u, cy + 0.4 * u), (cx + 0.3 * u, cy - 0.45 * u)]]
    if mark == "̀":  # huyền
        return [[(cx - 0.3 * u, cy - 0.45 * u), (cx + 0.25 * u, cy + 0.4 * u)]]
    if mark == "̃":  # ngã
        return [[(cx - 0.5 * u + i * u / 8, cy + 0.18 * u * math.sin(i / 8 * 2 * math.pi + math.pi)) for i in range(9)]]
    if mark == "̉":  # hỏi
        return [[(cx - 0.25 * u, cy - 0.3 * u), (cx, cy - 0.5 * u), (cx + 0.25 * u, cy - 0.3 * u), (cx, cy - 0.05 * u), (cx, cy + 0.25 * u)]]
    return [[(cx, cy), (cx + 0.08 * u, cy + 0.06 * u)]]  # nặng


def _word_bounds(s: str, x: float, height: float, f, k: float):
    out, pos = [], 0
    for w in s.split(" "):
        a = f.getlength(s[:pos]) * k
        b = f.getlength(s[: pos + len(w)]) * k
        out.append((x + a - 4, x + b + 4))
        pos += len(w) + 1
    return out


def hand_like(pts: List[Point], wobble: float = 0.7) -> List[Point]:
    """Run nhẹ tần số thấp cho nét lấy từ phông."""
    noise = _smooth_noise(len(pts), wobble)
    out = []
    for i, (px, py) in enumerate(pts):
        a, b = pts[max(0, i - 1)], pts[min(len(pts) - 1, i + 1)]
        L = math.dist(a, b) or 1
        out.append((px - (b[1] - a[1]) / L * noise[i], py + (b[0] - a[0]) / L * noise[i]))
    return out


def _min_jerk(t: float) -> float:
    return 10 * t ** 3 - 15 * t ** 4 + 6 * t ** 5


def draw(page, strokes: Sequence[Sequence[Point]], speed: float = 900.0, pause: float = 0.22, dt_ms: int = 12) -> None:
    """Vẽ từng nét: tốc độ trung bình `speed` px/giây (±20% mỗi nét), tăng tốc rồi giảm tốc, nghỉ không đều giữa các nét."""
    for s in strokes:
        cum = [0.0]
        for a, b in zip(s, s[1:]):
            cum.append(cum[-1] + math.dist(a, b))
        total = cum[-1]
        T = max(0.12, total / (speed * _rng.uniform(0.8, 1.2)))
        page.mouse.move(*s[0])
        page.wait_for_timeout(_rng.randint(40, 110))  # đặt bút
        page.mouse.down()
        steps = max(2, int(T * 1000 / dt_ms))
        j = 0
        for k in range(1, steps + 1):
            target = _min_jerk(k / steps) * total
            while j < len(cum) - 2 and cum[j + 1] < target:
                j += 1
            seg = cum[j + 1] - cum[j] or 1
            f = min(1.0, max(0.0, (target - cum[j]) / seg))
            a, b = s[j], s[j + 1]
            page.mouse.move(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f)
            page.wait_for_timeout(dt_ms)
        page.mouse.up()
        page.wait_for_timeout(int(pause * 1000 * _rng.uniform(0.6, 1.6)))
