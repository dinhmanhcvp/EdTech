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
    """Hình lập phương MỘT nét không nhấc bút (như video demo bảng AI): cả hình hơi nghiêng, các mặt không vuông đều.
    8 đỉnh đều bậc 3 nên phải đi lại 3 cạnh; mỗi lần đi lại lệch tay vài px như người vẽ nhanh."""
    rot = _rng.uniform(-0.05, 0.05)
    w, h = s * _rng.uniform(0.93, 1.05), s * _rng.uniform(0.93, 1.05)
    dx, dy = s * _rng.uniform(depth - 0.07, depth + 0.05), -s * _rng.uniform(depth - 0.09, depth + 0.03)
    cx, cy = x + w / 2, y + h / 2

    def P(px: float, py: float, j: float = 3.5) -> Point:
        px, py = px - cx + _rng.uniform(-j, j), py - cy + _rng.uniform(-j, j)
        return cx + px * math.cos(rot) - py * math.sin(rot), cy + px * math.sin(rot) + py * math.cos(rot)

    # mặt trước A B C D (trên trái, trên phải, dưới phải, dưới trái), mặt sau E F G H lệch lên phải
    A, B, C, D = P(x, y), P(x + w, y), P(x + w, y + h), P(x, y + h)
    E, F, G, H = P(x + dx, y + dy, 6), P(x + w + dx, y + dy, 6), P(x + w + dx, y + h + dy, 6), P(x + dx, y + h + dy, 6)
    return [hand_path([A, B, F, E, A, D, C, G, H, D, C, B, F, G, H, E], slop=1.8, wobble=1.4, bow=0.016, overshoot=4.0)]


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
        tiny = (max(p[1] for p in st) - min(p[1] for p in st)) < height * 0.35
        small = tiny and (min(p[1] for p in st) < y + height * 0.2 or min(p[1] for p in st) > y + height * 0.95)  # dấu, chấm ở trên; dấu nặng dưới
        return (w, small, min(p[0] for p in st))
    out: List[List[Point]] = []
    groups = {}
    spans = _letter_spans(s, x, f, k)
    for item in sorted(words, key=key):
        w, small, _ = key(item)
        a, b = spans[w] if w < len(spans) else (x, x)
        kind = 1 if small else 0 if a <= item[0] <= b else 2  # 2: dấu câu ( ) . , viết rời, không nối vào chữ
        groups.setdefault(w, ([], [], []))[kind].append(_orient(item[1]))
    for w in sorted(groups):
        body, small, punct = groups[w]
        word = s.split(" ")[w] if w < len(s.split(" ")) else ""
        joined = _join_touching(body)
        # chữ in hoa (RLC, SB, S.ABCD) người ta viết rời từng chữ; chữ thường viết liền cả từ
        letters = (_cursive(joined, height) if any(ch.islower() for ch in word) else joined) + _join_touching(small)
        # dấu câu đứng trước chữ thì viết trước, đứng sau thì viết sau
        before = [p for p in punct if p[0][0] < a_of(spans, w, x)]
        out += before + letters + [p for p in punct if p not in before]
    return [hand_like(st) for st in out]


def _cursive(strokes: List[List[Point]], height: float) -> List[List[Point]]:
    """Viết liền cả từ: cuối nét trước kéo một nét nối mềm (võng xuống như nét nối chữ) sang đầu nét sau, không nhấc bút.
    Chỉ nhấc bút khi nét sau ở quá xa hoặc lùi hẳn về trái."""
    out: List[List[Point]] = []
    for st in strokes:
        if out:
            a = out[-1][-1]
            if math.dist(a, st[-1]) < 0.6 * math.dist(a, st[0]):
                st = st[::-1]
            b = st[0]
            d = math.dist(a, b)
            if d <= 1.4 * height and b[0] - a[0] > -0.5 * height:
                c = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.2 * d)
                n = max(2, int(d / 3))
                link = [((1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1])
                        for t in (i / n for i in range(1, n))]
                out[-1] = out[-1] + link + list(st)
                continue
        out.append(list(st))
    return [_chaikin(st, 1) for st in out]


def _orient(st: List[Point]) -> List[Point]:
    """Tay viết bắt đầu nét từ đầu trên/trái (khung xương có thể dò ngược chiều): nét hở đảo chiều nếu đầu kia cao/trái hơn."""
    a, b = st[0], st[-1]
    if math.dist(a, b) > 3 and (b[1] + 0.35 * b[0]) < (a[1] + 0.35 * a[0]):
        return st[::-1]
    return st


def _join_touching(strokes: List[List[Point]], gap: float = 4.0) -> List[List[Point]]:
    """Nối các nét liền nhau (đầu nét sau chạm cuối nét trước) thành một nét: bớt các lần nhấc bút giữa chữ mà người không làm."""
    out: List[List[Point]] = []
    for st in strokes:
        if out and math.dist(out[-1][-1], st[0]) <= gap:
            out[-1] = out[-1] + st[1:]
        elif out and math.dist(out[-1][-1], st[-1]) <= gap:
            out[-1] = out[-1] + st[::-1][1:]
        else:
            out.append(list(st))
    return out


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


def _letter_spans(s: str, x: float, f, k: float):
    """Khoảng x (px bảng) từ chữ cái đầu tới chữ cái cuối của từng từ: phần ngoài khoảng này là dấu câu."""
    out, pos = [], 0
    for w in s.split(" "):
        idx = [i for i, ch in enumerate(w) if ch.isalnum()] or [0, max(0, len(w) - 1)]
        out.append((x + f.getlength(s[: pos + idx[0]]) * k - 3, x + f.getlength(s[: pos + idx[-1] + 1]) * k + 3))
        pos += len(w) + 1
    return out


def a_of(spans, w: int, x: float) -> float:
    return spans[w][0] if w < len(spans) else x


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


def integral(x: float, y: float, h: float, lower: str = "0", upper: str = "1", body: str = "x", power: str = "2", tail: str = "dx") -> List[List[Point]]:
    """Tích phân viết tay ∫_{lower}^{upper} body^{power} tail: dấu ∫ vẽ một nét cong, cận viết nhỏ, rồi biểu thức."""
    w = h * 0.3
    sign = [(x + w * 1.35, y + h * 0.1), (x + w * 1.2, y + h * 0.01), (x + w * 0.95, y + h * 0.02), (x + w * 0.78, y + h * 0.2),
            (x + w * 0.66, y + h * 0.5), (x + w * 0.55, y + h * 0.8), (x + w * 0.38, y + h * 0.98), (x + w * 0.12, y + h * 0.99), (x, y + h * 0.9)]
    strokes = [hand_like(_chaikin(_resample(sign, 6.0), 3), wobble=0.6)]
    small = h * 0.2
    strokes += text(upper, x + w * 1.55, y - small * 0.15, small)
    strokes += text(lower, x + w * 0.95, y + h * 0.86, small)
    bx = x + w * 2.3
    body_h = h * 0.36
    strokes += text(body, bx, y + h * 0.36, body_h)
    strokes += text(power, bx + body_h * 0.62, y + h * 0.2, small)
    strokes += text(tail, bx + body_h * 1.2, y + h * 0.36, body_h)
    return strokes


def formula(parts: Sequence[Tuple[str, str]], x: float, y: float, h: float) -> List[List[Point]]:
    """Công thức viết tay trái → phải: parts = [(chuỗi, "" | "sup" | "sub")]; số mũ, chỉ số viết nhỏ sát chữ trước;
    "<=>" vẽ thành mũi tên hai chiều ⇌ (phông không có)."""
    out: List[List[Point]] = []
    cx = x
    for s, kind in parts:
        cx += h * (0.04 if kind else 0.3)
        if s == "<=>":
            L, yy = h * 1.1, y + h * 0.45
            top = hand_path([(cx, yy - h * 0.1), (cx + L, yy - h * 0.1), (cx + L - h * 0.25, yy - h * 0.3)], wobble=0.6, slop=1, overshoot=0)
            bot = hand_path([(cx + L, yy + h * 0.1), (cx, yy + h * 0.1), (cx + h * 0.25, yy + h * 0.3)], wobble=0.6, slop=1, overshoot=0)
            strokes = [top, bot]
        elif s == "9":  # số 9 của phông giống chữ a: viết vòng tròn rồi kéo thân thẳng xuống
            r = h * 0.27
            loop = ellipse(cx + r * 1.1, y + r * 1.05, r, r * 0.95, start=-0.2, turns=1.0, n=40)
            stem = [loop[-1], (cx + r * 2.05, y + r * 1.6), (cx + r * 1.85, y + h * 0.98)]
            strokes = [hand_like(_chaikin(_resample(loop + stem[1:], 3.0), 2), wobble=0.5)]
        else:
            hh = h * 0.5 if kind else h
            yy = y - h * 0.08 if kind == "sup" else y + h * 0.62 if kind == "sub" else y
            strokes = text(s, cx, yy, hh)
        out += strokes
        cx = max(p[0] for st in strokes for p in st)
    return out


def _min_jerk(t: float) -> float:
    return 10 * t ** 3 - 15 * t ** 4 + 6 * t ** 5


def _point_at(s: Sequence[Point], cum: List[float], dist: float) -> Point:
    j = 0
    while j < len(cum) - 2 and cum[j + 1] < dist:
        j += 1
    seg = cum[j + 1] - cum[j] or 1
    f = min(1.0, max(0.0, (dist - cum[j]) / seg))
    a, b = s[j], s[j + 1]
    return a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f


def _corners(s: Sequence[Point], cum: List[float], reach: float = 7.0, min_turn: float = 0.9) -> List[int]:
    """Chỉ số các góc gấp của nét (đổi hướng > ~50°): tay người chậm lại và dừng một nhịp ở đó."""
    out: List[int] = []
    for i in range(1, len(s) - 1):
        j = i
        while j > 0 and cum[i] - cum[j] < reach:
            j -= 1
        k = i
        while k < len(s) - 1 and cum[k] - cum[i] < reach:
            k += 1
        if j == i or k == i:
            continue
        a1 = math.atan2(s[i][1] - s[j][1], s[i][0] - s[j][0])
        a2 = math.atan2(s[k][1] - s[i][1], s[k][0] - s[i][0])
        turn = abs((a2 - a1 + math.pi) % (2 * math.pi) - math.pi)
        if turn > min_turn:
            if out and cum[i] - cum[out[-1]] < reach * 1.5:
                continue  # cùng một góc
            out.append(i)
    return out


def _pen_motion(s: Sequence[Point], speed: float):
    """Chuyển động bút của một nét: mỗi đoạn giữa hai góc tăng tốc rồi giảm tốc (min-jerk), dừng 25–70 ms ở góc.
    Trả về (vị trí theo thời gian, tổng thời gian)."""
    cum = [0.0]
    for a, b in zip(s, s[1:]):
        cum.append(cum[-1] + math.dist(a, b))
    v = speed * _rng.uniform(0.8, 1.2)
    marks = [0] + _corners(s, cum) + [len(s) - 1]
    plan = []  # (thời điểm bắt đầu, thời lượng, quãng đầu, quãng cuối)
    t = 0.0
    for i0, i1 in zip(marks, marks[1:]):
        L = cum[i1] - cum[i0]
        dur = max(0.06, L / v)
        plan.append((t, dur, cum[i0], cum[i1]))
        t += dur
        if i1 != marks[-1]:
            t += _rng.uniform(0.025, 0.07)  # dừng ở góc, không nhấc bút

    def pos(tt: float) -> Point:
        for start, dur, d0, d1 in reversed(plan):
            if tt >= start:
                f = min(1.0, (tt - start) / dur)
                return _point_at(s, cum, d0 + (d1 - d0) * _min_jerk(f))
        return s[0]

    return pos, t


def draw(page, strokes: Sequence[Sequence[Point]], speed: float = 900.0, pause: float = 0.22, dt_ms: int = 12, rec=None, fps: int = 30) -> None:
    """Vẽ từng nét như tay: tốc độ trung bình `speed` px/giây (±20% mỗi nét), chậm lại và dừng một nhịp ở góc,
    nghỉ không đều giữa các nét. Có `rec` đang ghi: vẽ theo thời gian video, chụp một khung sau mỗi 1/fps giây của bút."""
    if rec is not None and rec.started:
        _draw_framed(page, strokes, speed, pause, rec, fps)
        return
    for s in strokes:
        pos, T = _pen_motion(s, speed)
        page.mouse.move(*s[0])
        page.wait_for_timeout(_rng.randint(40, 110))  # đặt bút
        page.mouse.down()
        steps = max(2, int(T * 1000 / dt_ms))
        for k in range(1, steps + 1):
            page.mouse.move(*pos(T * k / steps))
            page.wait_for_timeout(dt_ms)
        page.mouse.up()
        page.wait_for_timeout(int(pause * 1000 * _rng.uniform(0.6, 1.6)))


def _draw_framed(page, strokes, speed: float, pause: float, rec, fps: int, sub: int = 4) -> None:
    rec.begin_manual()
    rec.add_frame(1 / fps)
    for s in strokes:
        pos, T = _pen_motion(s, speed)
        page.mouse.move(*s[0])
        rec.extend_last(_rng.uniform(0.04, 0.11))  # đặt bút
        page.mouse.down()
        n = max(2, math.ceil(T * fps))
        for k in range(1, n + 1):
            for q in range(1, sub + 1):  # vài điểm trong mỗi khung để góc và đường cong không bị cắt thẳng
                page.mouse.move(*pos(T * (k - 1 + q / sub) / n))
            rec.add_frame(1 / fps)
        page.mouse.up()
        rec.extend_last(pause * _rng.uniform(0.6, 1.6))
    rec.add_frame(1 / fps)
    rec.end_manual()


def _self_check():
    sq = hand_path([(0, 0), (0, 100), (100, 100), (100, 0), (0, 0)], wobble=0.5, slop=0, overshoot=0)
    cum = [0.0]
    for a, b in zip(sq, sq[1:]):
        cum.append(cum[-1] + math.dist(a, b))
    assert len(_corners(sq, cum)) == 3, _corners(sq, cum)  # 3 góc trong (góc cuối là điểm khép)
    el = ellipse(0, 0, 100, 60)
    ecum = [0.0]
    for a, b in zip(el, el[1:]):
        ecum.append(ecum[-1] + math.dist(a, b))
    assert _corners(el, ecum) == []  # vòng khoanh tròn đều, không có góc
    pos, T = _pen_motion(sq, 400)
    assert math.dist(pos(T), sq[-1]) < 1e-6 and 0.9 < T < 1.6


if __name__ == "__main__":
    _self_check()
    print("ok")
