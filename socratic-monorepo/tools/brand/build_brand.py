"""Bộ nhận diện Socratic Vision Board (AXIOMA): sinh 3 concept logo dạng SVG thuần vector + trang showcase.

    python build_brand.py

Chữ trong lockup được chuyển thành đường vector (Space Grotesk, JetBrains Mono – giấy phép OFL) nên SVG
hiển thị giống nhau trên mọi máy và xuất PNG 4K bằng canvas không phụ thuộc font cài sẵn.
Font tải về thư mục .fonts/ cạnh script ở lần chạy đầu.
Ra: docs/brand/*.svg và docs/brand-logo-showcase.html
"""
from __future__ import annotations

import json
import math
import os
import urllib.request

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
OUT_DIR = os.path.join(ROOT, "docs", "brand")
SHOWCASE = os.path.join(ROOT, "docs", "brand-logo-showcase.html")

# ---------------------------------------------------------------- màu (token của báo cáo và video)
PAPER = "#FAF7F0"
INK = "#1B1F27"
CRIMSON = "#A32C34"
SLATE = "#4A525C"
STONE = "#D6D3CD"
COLOR = {"ink": INK, "accent": CRIMSON, "tech": SLATE, "bg": PAPER}
MONO = {"ink": "#000000", "accent": "#000000", "tech": "#000000", "bg": "#FFFFFF"}

# ---------------------------------------------------------------- font → đường vector
FONT_URLS = {
    "SpaceGrotesk.ttf": "https://github.com/google/fonts/raw/main/ofl/spacegrotesk/SpaceGrotesk%5Bwght%5D.ttf",
    "JetBrainsMono.ttf": "https://github.com/google/fonts/raw/main/ofl/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf",
}
_fonts: dict = {}


def font(name: str, weight: int) -> TTFont:
    key = (name, weight)
    if key not in _fonts:
        path = os.path.join(HERE, ".fonts", name)
        if not os.path.exists(path):
            os.makedirs(os.path.dirname(path), exist_ok=True)
            urllib.request.urlretrieve(FONT_URLS[name], path)
        _fonts[key] = instantiateVariableFont(TTFont(path), {"wght": weight})
    return _fonts[key]


def text_path(s: str, f: TTFont, size: float, x: float, y: float, tracking: float = 0.0, anchor: str = "start"):
    """Chuỗi → (d của <path>, bề rộng). y là đường chân chữ; tracking tính theo em (0.1 = 10% cỡ chữ)."""
    gs, cmap, hmtx = f.getGlyphSet(), f.getBestCmap(), f["hmtx"]
    k = size / f["head"].unitsPerEm
    names = [cmap.get(ord(ch), ".notdef") for ch in s]
    adv = [hmtx[n][0] * k + tracking * size for n in names]
    width = sum(adv) - (tracking * size if s else 0)
    x0 = x - width / 2 if anchor == "middle" else x - width if anchor == "end" else x
    pen = SVGPathPen(gs, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
    cx = x0
    for n, a in zip(names, adv):
        gs[n].draw(TransformPen(pen, (k, 0, 0, -k, cx, y)))
        cx += a
    return pen.getCommands(), width


def T(s, weight_font, size, x, y, fill, tracking=0.0, anchor="start"):
    d, w = text_path(s, weight_font, size, x, y, tracking, anchor)
    return f'<path d="{d}" fill="{fill}"/>', w


# ---------------------------------------------------------------- hình học tiện dụng
def fmt(v: float) -> str:
    return f"{v:.2f}".rstrip("0").rstrip(".")


def poly(pts) -> str:
    return "M" + " L".join(f"{fmt(x)} {fmt(y)}" for x, y in pts)


def line(a, b, color, w, extra=""):
    return f'<path d="{poly([a, b])}" stroke="{color}" stroke-width="{fmt(w)}" stroke-linecap="round" fill="none"{extra}/>'


# ---------------------------------------------------------------- 3 concept (khung 120 × 120)
def mark_lasso_cube(c) -> str:
    """01 – Lasso & Cube: lập phương Oxyz (cạnh khuất nét đứt) bị vòng lasso đỏ luồn qua: trước khối ở nửa dưới, sau khối ở nửa trên;
    vòng hở, kết thúc bằng nút tiêu điểm – nét tay vừa khoanh đã biên dịch thành hình học xác định."""
    A, B, C, D = (31, 49), (71, 49), (71, 89), (31, 89)  # mặt trước
    o = (18, -16)
    E, F, G, H = [(p[0] + o[0], p[1] + o[1]) for p in (A, B, C, D)]  # mặt sau
    w = 5.2
    cube_visible = f'<path d="{poly([A, B, C, D, A])} {poly([A, E, F, B])} {poly([F, G, C])}" stroke="{c["ink"]}" stroke-width="{w}" stroke-linejoin="round" stroke-linecap="round" fill="none"/>'
    hidden = f'<path d="{poly([E, H, G])} {poly([H, D])}" stroke="{c["tech"]}" stroke-width="2.4" stroke-dasharray="0.1 5.2" stroke-linecap="round" fill="none"/>'
    # vòng lasso: elip nghiêng dốc quanh tâm khối, cắt chéo các cạnh (không chạy dọc cạnh nào), mở một khoảng ở trái
    cx, cy, rx, ry, rot = 60, 61, 55, 17, math.radians(-24)

    def P(t):
        x, y = rx * math.cos(t), ry * math.sin(t)
        return cx + x * math.cos(rot) - y * math.sin(rot), cy + x * math.sin(rot) + y * math.cos(rot)

    t0, t1 = math.radians(196), math.radians(196 + 322)
    ts = [t0 + (t1 - t0) * i / 160 for i in range(161)]
    back = [t for t in ts if math.sin(t) < 0]
    front = [t for t in ts if math.sin(t) >= 0]

    def runs(sel):
        out, cur = [], []
        for t in ts:
            if t in sel:
                cur.append(P(t))
            elif cur:
                out.append(cur)
                cur = []
        if cur:
            out.append(cur)
        return out

    lw = 5.2
    back_d = " ".join(poly(r) for r in runs(set(back)))
    front_d = " ".join(poly(r) for r in runs(set(front)))
    end = P(t1)
    lasso_back = f'<path d="{back_d}" stroke="{c["accent"]}" stroke-width="{lw}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
    knock = f'<path d="{front_d}" stroke="{c["bg"]}" stroke-width="{lw + 6}" stroke-linecap="round" fill="none"/>'
    lasso_front = f'<path d="{front_d}" stroke="{c["accent"]}" stroke-width="{lw}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
    node = f'<circle cx="{fmt(end[0])}" cy="{fmt(end[1])}" r="7.4" fill="{c["bg"]}"/><circle cx="{fmt(end[0])}" cy="{fmt(end[1])}" r="5.6" fill="{c["accent"]}"/>'
    return hidden + lasso_back + cube_visible + knock + lasso_front + node


def mark_fulcrum_wave(c) -> str:
    """02 – Fulcrum & Phase Wave: điểm tựa tam giác (3 đỉnh = Console → Bảng → App học sinh, cũng là cân đĩa)
    và sóng điều hòa đỏ đi qua gốc tọa độ đặt đúng đỉnh tam giác."""
    apex, bl, br = (60, 44), (27, 96), (93, 96)
    axis = line((10, 44), (110, 44), c["tech"], 2.2, ' stroke-dasharray="0.1 5"')
    tri = f'<path d="{poly([apex, bl, br])} Z" stroke="{c["ink"]}" stroke-width="5.2" stroke-linejoin="round" fill="none"/>'
    A, Pd = 16, 62
    pts = [(x, 44 - A * math.sin(2 * math.pi * (x - 60) / Pd)) for x in [12 + i * 0.75 for i in range(129)]]
    wave = f'<path d="{poly(pts)}" stroke="{c["accent"]}" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
    knock = f'<path d="{poly([p for p in pts if 44 < p[0] < 76])}" stroke="{c["bg"]}" stroke-width="11" stroke-linecap="round" fill="none"/>'
    nodes = "".join(f'<circle cx="{x}" cy="{y}" r="5" fill="{c["ink"]}"/>' for x, y in (bl, br))
    spark = f'<circle cx="60" cy="44" r="8.4" fill="{c["bg"]}"/><circle cx="60" cy="44" r="6.2" fill="{c["accent"]}"/>'
    return axis + tri + knock + wave + nodes + spark


def mark_nabla(c) -> str:
    """03 – AXIOMA Prism: ba nét trên lưới 24 × 24 (×5): hai nét mực tạo chữ V / Δ ngược, nét đỏ cong là vector bắc cầu
    có đầu mũi tên – đọc được là ∇ (gradient), V (Vision) và S (Socratic) ở cỡ 16 px."""
    u = 5.0
    p = lambda x, y: (x * u, y * u)
    w = 2.4 * u
    left = line(p(5.4, 9.2), p(10.5, 19.0), c["ink"], w)
    right = line(p(13.5, 19.0), p(18.6, 9.2), c["ink"], w)
    # vector bắc cầu: cung mảnh từ trái sang phải phía trên, đầu mũi tên mở theo tiếp tuyến, đáp xuống nét phải
    a, ctl, b = (4.2, 6.0), (11.4, 0.6), (19.4, 5.4)
    arc = f'<path d="M{fmt(a[0] * u)} {fmt(a[1] * u)} Q{fmt(ctl[0] * u)} {fmt(ctl[1] * u)} {fmt(b[0] * u)} {fmt(b[1] * u)}" stroke="{c["accent"]}" stroke-width="{fmt(w * 0.72)}" stroke-linecap="round" fill="none"/>'
    tx, ty = b[0] - ctl[0], b[1] - ctl[1]
    L = math.hypot(tx, ty)
    tx, ty = tx / L, ty / L
    wing = []
    for s in (1, -1):  # hai cánh ±38° quanh hướng ngược tiếp tuyến, dài 3 ô
        ang = math.radians(180 + s * 38)
        wx, wy = tx * math.cos(ang) - ty * math.sin(ang), tx * math.sin(ang) + ty * math.cos(ang)
        wing.append(p(b[0] + 2.5 * wx, b[1] + 2.5 * wy))
    head = f'<path d="{poly([wing[0], p(*b), wing[1]])}" stroke="{c["accent"]}" stroke-width="{fmt(w * 0.72)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
    return left + right + arc + head


CONCEPTS = [
    {"id": "c01", "slug": "lasso-cube", "name": "01 · The Lasso & The Cube", "draw": mark_lasso_cube,
     "idea": "Vòng lasso đỏ luồn qua lập phương Oxyz: nét tay giáo viên vừa khoanh đã biên dịch thành hình học 3D xác định. Đây đúng là thao tác cốt lõi của sản phẩm (khoanh → Trực quan). Ở 32 px trở xuống (favicon), dùng monogram của concept 03."},
    {"id": "c02", "slug": "fulcrum-wave", "name": "02 · The Socratic Fulcrum & Phase Wave", "draw": mark_fulcrum_wave,
     "idea": "Điểm tựa tam giác: ba đỉnh là Console 3003 → Bảng 3001 → App học sinh 3002, đồng thời là cân đĩa của Lý / Hóa. Sóng điều hòa đỏ đi qua gốc tọa độ ở đỉnh tam giác: vật lý xác định, chạy 60 khung/giây."},
    {"id": "c03", "slug": "axioma-nabla", "name": "03 · The AXIOMA Prism / Monogram", "draw": mark_nabla,
     "idea": "Ba nét trên lưới 24 × 24: hai nét mực tạo V / Δ ngược, nét đỏ cong là vector bắc cầu có mũi tên. Đọc được thành ∇ (gradient), V (Vision), S (Socratic). Rõ nhất ở 16 px."},
]
WINNER = "c01"  # logo chính
FAVICON = "c03"  # lập phương + lasso không đọc được ở 16–32 px; favicon và icon nhỏ dùng monogram


# ---------------------------------------------------------------- bố cục
def svg(w, h, body, bg=None, title="") -> str:
    bgrect = f'<rect data-bg="1" width="{w}" height="{h}" fill="{bg}"/>' if bg else ""
    t = f"<title>{title}</title>" if title else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{t}{bgrect}{body}</svg>'


def place(mark_body, x, y, size):
    return f'<g transform="translate({fmt(x)} {fmt(y)}) scale({fmt(size / 120)})">{mark_body}</g>'


def lockup(c, colors, bg=None):
    """Logo + SOCRATIC VISION BOARD + phụ đề kỹ thuật, một dòng ngang."""
    sg7, jb5 = font("SpaceGrotesk.ttf", 700), font("JetBrainsMono.ttf", 500)
    H = 120
    title, tw = T("SOCRATIC VISION BOARD", sg7, 46, 150, 66, colors["ink"], tracking=0.04)
    sub, sw = T("THỰC NGHIỆM STEM & GIA SƯ SOCRATIC", jb5, 15.5, 152, 94, colors["tech"], tracking=0.14)
    W = 150 + max(tw, sw) + 24
    return svg(round(W), H, place(c["draw"](colors), 0, 0, H) + title + sub, bg)


def outro(c, colors):
    """Shot 28: thẻ kết 16:9 trên giấy alabaster."""
    W, Hh = 1920, 1080
    sg7, sg5, jb5 = font("SpaceGrotesk.ttf", 700), font("SpaceGrotesk.ttf", 500), font("JetBrainsMono.ttf", 500)
    body = place(c["draw"](colors), W / 2 - 150, 150, 300)
    t, _ = T("SOCRATIC VISION BOARD", sg7, 84, W / 2, 548, colors["ink"], tracking=0.05, anchor="middle")
    s, _ = T("THỰC NGHIỆM STEM & GIA SƯ SOCRATIC", jb5, 22, W / 2, 598, colors["tech"], tracking=0.22, anchor="middle")
    rule = f'<rect x="{W / 2 - 40}" y="642" width="80" height="4" fill="{colors["accent"]}"/>'
    tag, _ = T("Tự học bản chất, làm chủ tương lai.", sg5, 46, W / 2, 728, colors["ink"], anchor="middle")
    hair = f'<rect x="{W / 2 - 520}" y="884" width="1040" height="1.5" fill="{STONE if colors is COLOR else colors["ink"]}"/>'
    f1, _ = T("Trường THCS Hùng Vương (Phú Thọ) · Trường THPT Chuyên Vĩnh Phúc", jb5, 21, W / 2, 938, colors["tech"], tracking=0.02, anchor="middle")
    f2, _ = T("CUỘC THI SV_STARTUP LẦN THỨ IX, 2026", jb5, 19, W / 2, 978, colors["accent"], tracking=0.24, anchor="middle")
    return svg(W, Hh, body + t + s + rule + tag + hair + f1 + f2, colors["bg"])


def icon(c, colors=COLOR, size=512):
    """App icon / favicon: logo trong squircle sứ rx = 22%, viền 1 px."""
    r = size * 0.22
    sq = f'<rect x="1" y="1" width="{size - 2}" height="{size - 2}" rx="{fmt(r)}" fill="{colors["bg"]}" stroke="{STONE if colors is COLOR else colors["ink"]}" stroke-width="2"/>'
    m = size * 0.74
    return svg(size, size, sq + place(c["draw"](colors), (size - m) / 2, (size - m) / 2, m))


def mark_svg(c, colors, bg=None):
    return svg(120, 120, c["draw"](colors), bg)


# ---------------------------------------------------------------- xuất
def build():
    os.makedirs(OUT_DIR, exist_ok=True)
    assets = []
    for c in CONCEPTS:
        items = [
            ("mark", "Logo (mark)", mark_svg(c, COLOR)),
            ("mark-mono", "Logo đơn sắc", mark_svg(c, MONO, "#FFFFFF")),
            ("lockup", "Lockup ngang", lockup(c, COLOR)),
            ("lockup-mono", "Lockup đơn sắc", lockup(c, MONO, "#FFFFFF")),
            ("icon-512", "App icon / favicon", icon(c)),
            ("outro-1920x1080", "Shot 28 · thẻ kết video", outro(c, COLOR)),
            ("outro-mono-1920x1080", "Thẻ kết đơn sắc (in)", outro(c, MONO)),
        ]
        for kind, label, s in items:
            fn = f"{c['id']}-{c['slug']}-{kind}.svg"
            with open(os.path.join(OUT_DIR, fn), "w", encoding="utf-8") as f:
                f.write(s)
            assets.append({"concept": c["id"], "kind": kind, "label": label, "file": "brand/" + fn, "svg": s})
    # favicon của concept được chọn
    with open(os.path.join(OUT_DIR, "favicon.svg"), "w", encoding="utf-8") as f:
        f.write(icon(next(c for c in CONCEPTS if c["id"] == FAVICON)))
    tpl = open(os.path.join(HERE, "showcase_template.html"), encoding="utf-8").read()
    data = {"winner": WINNER, "concepts": [{k: c[k] for k in ("id", "name", "idea")} for c in CONCEPTS], "assets": assets,
            "palette": [["Warm Alabaster", PAPER], ["Deep Charcoal Ink", INK], ["Academic Crimson", CRIMSON], ["Slate Graphite", SLATE], ["Hairline Stone", STONE]]}
    with open(SHOWCASE, "w", encoding="utf-8") as f:
        f.write(tpl.replace("/*__DATA__*/null", json.dumps(data, ensure_ascii=False)))
    print(len(assets), "SVG ->", OUT_DIR)
    print("showcase ->", SHOWCASE)


def _self_check():
    d, w = text_path("Ợ", font("SpaceGrotesk.ttf", 700), 40, 0, 40)
    assert d and w > 10, "chữ tiếng Việt phải ra đường vector"
    _, w2 = text_path("AB", font("SpaceGrotesk.ttf", 700), 40, 0, 40, anchor="middle")
    assert w2 > 0
    for c in CONCEPTS:
        assert "<path" in c["draw"](COLOR) and "#A32C34" in c["draw"](COLOR) and "#A32C34" not in c["draw"](MONO)


if __name__ == "__main__":
    _self_check()
    build()
