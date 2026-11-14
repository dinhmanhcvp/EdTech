"""
Bộ dụng cụ của các bài THỰC HÀNH theo sách giáo khoa trong /lab (engines/families/HandsBench3D.tsx): mỗi bài Vật lí / Sinh học
(utils/lab/phys/experiments.ts, utils/lab/bio/experiments.ts) có MỘT lưới `Set_<MÃ BÀI>` đã bày sẵn trên bàn (gốc ở giữa bàn, mặt bàn y = 0,
x từ −3 tới 3, z từ −1 tới 1) và có thể có các phần động `Mov_<MÃ BÀI>_<n>` (gốc đặt tại chốt quay / điểm treo) do cảnh dịch, co giãn theo thanh trượt.
Bảng phần động nằm ở `utils/lab/hands/benchMoves.ts`; test `handsBench.test.tsx` ép mọi bài đều có bộ dụng cụ trong tệp GLB.

Chạy (hai tệp, mỗi môn một tệp):
  blender --background --python tools/lab-models/bench_parts.py -- apps/teacher-board/public/models [thư mục ảnh xem thử] phys
  blender --background --python tools/lab-models/bench_parts.py -- apps/teacher-board/public/models [thư mục ảnh xem thử] bio
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F401,F403

WHICH = argv[2] if len(argv) > 2 else 'phys'
R90 = math.radians(90)


def liq(name, h, a=0.75):
    return mat(name, hexc(h), rough=0.15, alpha=a)


WATER = liq('water', '#7FB8E8', 0.45)
L_BLUE = liq('lblue', '#2459C9')
L_VIOLET = liq('lviolet', '#7A3FB0')
L_RED = liq('lred', '#C4261A')
L_BRICK = liq('lbrick', '#B5532A')
L_BROWN = liq('lbrown', '#6B3A12', 0.9)
L_YELLOW = liq('lyellow', '#E3B341')
L_MILK = mat('milk', hexc('#F6F1E4'), rough=0.4)
L_GREEN = liq('lgreen', '#3F8F3A', 0.85)
LEAF = mat('leaf', hexc('#2E8B3A'), rough=0.6)
LEAF2 = mat('leaf2', hexc('#7DB341'), rough=0.6)
SOIL = mat('soil', hexc('#3A2616'), rough=0.95)
TERRA = mat('terra', hexc('#B5613A'), rough=0.8)
SKIN = mat('skin', hexc('#E3B091'), rough=0.6)
GREENM = mat('greenm', hexc('#1F7A4D'), rough=0.5)
YELLOW = mat('yellow', hexc('#E3B341'), rough=0.5)
PURPLE = mat('purple', hexc('#7A2E6B'), rough=0.5)
FOAM = mat('foam', hexc('#E8E6F5'), rough=0.95)
SCREEN = mat('screen', hexc('#0B2A1C'), rough=0.3)
TRACE = mat('trace', hexc('#39FF6A'), emit=1.5)
SAND = mat('sand', hexc('#D9C49A'), rough=0.95)
GRASS = mat('grass', hexc('#4E9A3B'), rough=0.9)
FOIL = mat('foil', (0.85, 0.85, 0.86), metallic=1, rough=0.3)
PINK = mat('pink', hexc('#E889A8'), rough=0.5)


# ------------------------------------------------------------------ hình cơ bản theo toạ độ three.js (y lên, z về phía người nhìn)
def B(sx, sy, sz, x, y, z, m, bevel=0.01, ry=0.0, rz=0.0):
    """hộp tâm (x, y, z); ry quay quanh trục đứng, rz nghiêng trong mặt phẳng đứng xy"""
    return box('b', (sx, sz, sy), T(x, y, z), m, bevel=bevel, rot=(0, -rz, ry))


def C(r, h, x, y, z, m, axis='y', r2=None, bevel=0.0, seg=20):
    rot = {'y': (0, 0, 0), 'x': (0, R90, 0), 'z': (R90, 0, 0)}[axis]
    return cyl('c', r, h, T(x, y, z), m, bevel=bevel, rot=rot, r2=r2, seg=seg)


def S(r, x, y, z, m):
    return ball('s', r, T(x, y, z), m)


def LA(profile, x, y, z, m):
    return lathe('l', profile, T(x, y, z), m, steps=28)


def TB(pts, r, m, smooth=True):
    return tube('t', [T(*p) for p in pts], r, m, smooth=smooth)


def TX(body, size, x, y, z, m=INK):
    """chữ dựng đứng, quay mặt về phía người nhìn"""
    return text('tx', body, size, T(x, y, z), m, rot=(R90, 0, 0))


def part(name, objs, pivot=(0, 0, 0)):
    """gộp thành một lưới, gốc toạ độ đặt tại `pivot` (toạ độ three.js)"""
    o = join(name, objs)
    bpy.context.scene.cursor.location = T(*pivot)
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    return o


def up(objs, dy):
    """nâng một nhóm vật lên dy (đặt lên cân, lên bếp…)"""
    for q in objs:
        q.location.z += dy
    return objs


# ------------------------------------------------------------------ dụng cụ dùng chung
def stand(x, z, h=2.0, arm=0.5):
    """giá thí nghiệm: cọc ở x, tay ngang vươn sang +x dài `arm` ở độ cao h"""
    o = [B(0.7, 0.06, 0.5, x + 0.15, 0.03, z, IRON, 0.015), C(0.03, h, x, h / 2 + 0.06, z, CHROME)]
    if arm:
        o += [C(0.02, abs(arm), x + arm / 2, h, z, CHROME, 'x'), B(0.09, 0.09, 0.09, x, h, z, IRON)]
    return o


def needle(x, z, tint=RED):
    """kim của đồng hồ đo (phần động, gốc ở chân kim: quay quanh z)"""
    return [B(0.012, 0.22, 0.006, x, 0.31, z + 0.13, tint, 0)]


def swhand(x, z):
    """kim đồng hồ bấm giây (phần động, quay quanh y)"""
    return [B(0.012, 0.005, 0.11, x, 0.066, z - 0.04, INK, 0)]


def meter(x, z, sym='V', tint=RED, lean=0.0):
    return [
        B(0.62, 0.5, 0.24, x, 0.25, z, BAKELITE, 0.02),
        B(0.52, 0.3, 0.012, x, 0.3, z + 0.121, CREAM, 0),
        TX(sym, 0.11, x, 0.19, z + 0.13),
        C(0.03, 0.07, x - 0.2, 0.53, z, RED), C(0.03, 0.07, x + 0.2, 0.53, z, INK),
    ]


def digital(x, z, txt='0.000', w=0.8, pan=False, live=True):
    """đồng hồ / cân hiện số (live: không in chữ, mã vẽ số đo thật lên mặt hiển thị)"""
    o = [B(w, 0.22, 0.5, x, 0.11, z, CASE, 0.02), B(w * 0.7, 0.13, 0.012, x, 0.12, z + 0.251, DARK, 0)]
    if not live:
        o.append(TX(txt, 0.09, x, 0.12, z + 0.26, LED))
    if pan:
        o += [C(w * 0.42, 0.03, x, 0.245, z, STEEL)]
    return o


def stopwatch(x, z, hand=True):
    o = [C(0.16, 0.05, x, 0.03, z, CHROME), C(0.135, 0.01, x, 0.058, z, CREAM), C(0.03, 0.06, x, 0.03, z - 0.19, CHROME, 'z')]
    return o + swhand(x, z) if hand else o


def battery(x, z):
    return [C(0.11, 0.42, x, 0.21, z, INK), C(0.112, 0.2, x, 0.3, z, ORANGE), C(0.035, 0.05, x, 0.44, z, BRASS)]


def psu(x, z, txt='6.0 V'):
    return [
        B(0.9, 0.5, 0.6, x, 0.25, z, CASE, 0.02), B(0.5, 0.16, 0.012, x - 0.1, 0.34, z + 0.301, DARK, 0),
        C(0.06, 0.05, x + 0.3, 0.34, z + 0.32, BAKELITE, 'z'), C(0.03, 0.06, x - 0.2, 0.12, z + 0.32, RED, 'z'), C(0.03, 0.06, x + 0.1, 0.12, z + 0.32, INK, 'z'),
    ]


def resistor(x, z, m=CREAM):
    return [B(0.5, 0.04, 0.3, x, 0.02, z, PANEL, 0.008), C(0.05, 0.26, x, 0.1, z, m, 'x'), C(0.052, 0.03, x - 0.06, 0.1, z, RED, 'x'), C(0.052, 0.03, x + 0.02, 0.1, z, INK, 'x'),
            C(0.025, 0.1, x - 0.2, 0.09, z, BRASS), C(0.025, 0.1, x + 0.2, 0.09, z, BRASS)]


def switch(x, z):
    return [B(0.36, 0.04, 0.22, x, 0.02, z, PANEL, 0.008), C(0.022, 0.08, x - 0.12, 0.08, z, BRASS), C(0.022, 0.08, x + 0.12, 0.08, z, BRASS), B(0.3, 0.015, 0.03, x + 0.01, 0.17, z, COPPER, 0, rz=0.5)]


def wire(a, b, m=RED, sag=0.25):
    mid = ((a[0] + b[0]) / 2, min(a[1], b[1]) * 0.3 + 0.03, (a[2] + b[2]) / 2 + sag)
    return TB([a, (a[0], a[1] * 0.5, a[2] + sag * 0.5), mid, (b[0], b[1] * 0.5, b[2] + sag * 0.5), b], 0.012, m)


def track(x0, x1, z, y=0.3):
    o = [B(x1 - x0, 0.08, 0.3, (x0 + x1) / 2, y, z, ALU, 0.01)]
    for x in (x0 + 0.3, x1 - 0.3):
        o += [B(0.1, y - 0.04, 0.5, x, (y - 0.04) / 2, z, IRON, 0.01)]
    for i in range(int((x1 - x0) * 5) + 1):
        o.append(B(0.006, 0.002, 0.05 if i % 5 == 0 else 0.03, x0 + i * 0.2, y + 0.041, z + 0.12, INK, 0))
    return o


def cart(x, z, y=0.34, m=BLUE):
    o = [B(0.5, 0.12, 0.26, x, y + 0.12, z, m, 0.015), B(0.16, 0.2, 0.012, x, y + 0.28, z, INK, 0)]
    for dx in (-0.16, 0.16):
        for dz in (-0.14, 0.14):
            o.append(C(0.05, 0.03, x + dx, y + 0.05, z + dz, RUBBER, 'z'))
    return o


def gate(x, z, y=0.34):
    """cổng quang điện chữ U úp trên đường ray"""
    return [B(0.08, 0.5, 0.06, x, y + 0.25, z - 0.26, INK, 0.008), B(0.08, 0.5, 0.06, x, y + 0.25, z + 0.26, INK, 0.008), B(0.08, 0.06, 0.58, x, y + 0.5, z, INK, 0.008), S(0.02, x, y + 0.3, z + 0.225, LED)]


def weight(x, y, z, r=0.1, h=0.12, m=BRASS):
    """quả cân, y là đáy"""
    return [LA([(0, 0), (r * 0.9, 0), (r, 0.012), (r, h - 0.012), (r * 0.9, h), (0, h)], x, y, z, m), C(0.012, 0.06, x, y + h + 0.03, z, CHROME)]


def spring(x, y0, y1, z, r=0.07, turns=9, m=STEEL):
    pts = [(x + r * math.cos(t * 6.283), y0 + (y1 - y0) * t / turns, z + r * math.sin(t * 6.283)) for t in [i / 10 for i in range(turns * 10 + 1)]]
    return [TB(pts, 0.008, m)]


def ruler(x0, x1, z, y=0.012, vertical=False, at=0.0):
    """thước; vertical: dựng đứng tại x = x0, từ y = at lên cao x1 − x0"""
    n = int(abs(x1 - x0) * 10) + 1
    if vertical:
        h = x1 - x0
        return [B(0.1, h, 0.012, x0, at + h / 2, z, YELLOW, 0)] + [B(0.05 if i % 5 == 0 else 0.03, 0.004, 0.002, x0 + 0.02, at + i * 0.1, z + 0.007, INK, 0) for i in range(n)]
    return [B(x1 - x0, 0.012, 0.1, (x0 + x1) / 2, y, z, YELLOW, 0)] + [B(0.004, 0.002, 0.05 if i % 5 == 0 else 0.03, x0 + i * 0.1, y + 0.007, z - 0.02, INK, 0) for i in range(n)]


def beaker(x, z, r=0.22, h=0.42, fill=0.55, lm=WATER):
    o = [LA([(0, 0), (r, 0), (r, h), (r + 0.015, h + 0.01), (r - 0.012, h), (r - 0.012, 0.012), (0, 0.012)], x, 0, z, GLASS)]
    if fill and lm:
        o.append(C(r - 0.02, h * fill, x, 0.014 + h * fill / 2, z, lm, seg=24))
    return o


def ttube(x, y, z, lm=None, h=0.5, fill=0.45):
    """ống nghiệm, y là đáy"""
    o = [LA([(0, 0), (0.045, 0.02), (0.06, 0.07), (0.06, h), (0.068, h + 0.008), (0.052, h), (0.052, 0.07), (0.04, 0.028), (0, 0.012)], x, y, z, GLASS)]
    if lm:
        o.append(C(0.048, h * fill, x, y + 0.05 + h * fill / 2, z, lm, seg=14))
    return o


def rack(x, z, liquids):
    """giá gỗ cùng các ống nghiệm (liquids: vật liệu chất lỏng từng ống, None = ống rỗng)"""
    n = len(liquids)
    w = 0.22 * n + 0.14
    o = [B(w, 0.04, 0.3, x, 0.02, z, WOOD, 0.008), B(w, 0.03, 0.3, x, 0.3, z, WOOD, 0.008), B(0.04, 0.3, 0.3, x - w / 2 + 0.02, 0.16, z, WOOD, 0.008), B(0.04, 0.3, 0.3, x + w / 2 - 0.02, 0.16, z, WOOD, 0.008)]
    for i, lm in enumerate(liquids):
        o += ttube(x - (n - 1) * 0.11 + i * 0.22, 0.05, z, lm)
    return o


def bottle(x, z, m=L_BROWN, cap=INK, r=0.1, h=0.3):
    return [LA([(0, 0), (r, 0), (r, h * 0.7), (r * 0.4, h * 0.9), (r * 0.4, h), (0, h)], x, 0, z, m), C(r * 0.48, 0.07, x, h + 0.03, z, cap)]


def burner(x, z):
    """đèn cồn"""
    return [LA([(0, 0), (0.16, 0), (0.18, 0.06), (0.12, 0.16), (0.05, 0.2), (0.05, 0.24), (0, 0.24)], x, 0, z, GLASS), C(0.1, 0.05, x, 0.07, z, L_VIOLET), C(0.02, 0.06, x, 0.27, z, WHITE),
            LA([(0, 0), (0.03, 0.02), (0.035, 0.08), (0, 0.2)], x, 0.29, z, mat('flame', hexc('#FFB35C'), emit=2.0, alpha=0.8))]


def thermometer(x, y, z, h=0.9, lean=0.0):
    return [C(0.018, h, x + lean * h / 2, y + h / 2, z, GLASS, seg=10), C(0.008, h * 0.55, x + lean * h * 0.28, y + h * 0.28, z, RED, seg=8), S(0.03, x, y, z, RED)]


def microscope(x, z):
    return [
        B(0.6, 0.07, 0.7, x, 0.035, z, IRON, 0.02), B(0.12, 0.9, 0.14, x, 0.5, z - 0.25, IRON, 0.02), B(0.12, 0.14, 0.4, x, 0.95, z - 0.1, IRON, 0.02),
        C(0.06, 0.5, x, 1.05, z + 0.08, CHROME, 'y'), C(0.075, 0.1, x, 1.33, z + 0.08, BAKELITE), C(0.1, 0.06, x, 0.76, z + 0.08, STEEL),
        C(0.03, 0.14, x - 0.05, 0.67, z + 0.06, BRASS), C(0.03, 0.18, x + 0.05, 0.65, z + 0.1, BRASS),
        C(0.07, 0.05, x + 0.09, 0.4, z - 0.25, BAKELITE, 'x'), C(0.07, 0.05, x - 0.09, 0.4, z - 0.25, BAKELITE, 'x'),
        C(0.09, 0.04, x, 0.12, z + 0.08, LAMP), S(0.04, x, 0.15, z + 0.08, mat('bulb', hexc('#FFF3C4'), emit=1.5)),
    ]


def stage(x, z, y=0.5):
    """bàn kính của kính hiển vi kèm một lam kính"""
    return [B(0.46, 0.03, 0.46, x, y, z + 0.08, INK, 0.008), B(0.3, 0.008, 0.1, x, y + 0.02, z + 0.08, GLASS, 0), B(0.08, 0.004, 0.08, x, y + 0.026, z + 0.08, L_VIOLET, 0)]


def slide(x, z, m=L_VIOLET):
    return [B(0.3, 0.008, 0.1, x, 0.006, z, GLASS, 0), B(0.08, 0.004, 0.08, x, 0.012, z, m, 0)]


def petri(x, z, m=None):
    o = [LA([(0, 0), (0.2, 0), (0.2, 0.05), (0.19, 0.05), (0.19, 0.01), (0, 0.01)], x, 0, z, GLASS)]
    if m:
        o.append(C(0.18, 0.015, x, 0.018, z, m, seg=24))
    return o


def plant(x, z, h=0.7, n=6, pot=True, leaf=LEAF, r=0.2):
    o = []
    y0 = 0
    if pot:
        o += [LA([(0, 0), (r * 0.7, 0), (r, r * 1.4), (r * 1.08, r * 1.4), (r * 1.08, r * 1.6), (0, r * 1.6)], x, 0, z, TERRA), C(r * 0.95, 0.02, x, r * 1.6, z, SOIL)]
        y0 = r * 1.6
    o.append(C(0.018, h, x, y0 + h / 2, z, LEAF2, seg=8))
    for i in range(n):
        a = i * 2.4
        y = y0 + h * (0.3 + 0.7 * (i + 1) / n)
        o.append(B(0.26, 0.012, 0.13, x + 0.14 * math.cos(a), y, z - 0.14 * math.sin(a), leaf, 0.004, ry=a))
    return o


def lamp(x, z, h=1.5, to=1):
    """đèn bàn chiếu sang phía `to` (+1 phải, −1 trái)"""
    return [C(0.2, 0.05, x, 0.025, z, IRON), C(0.022, h, x, h / 2, z, CHROME), C(0.02, 0.5, x + to * 0.22, h, z, CHROME, 'x'),
            LA([(0, 0.2), (0.07, 0.2), (0.2, 0), (0.18, 0), (0.06, 0.17), (0, 0.17)], x + to * 0.5, h - 0.2, z, ORANGE), S(0.07, x + to * 0.5, h - 0.15, z, mat('bulb2', hexc('#FFF3C4'), emit=2.5))]


def clipboard(x, z, ry=0.0):
    return [B(0.6, 0.02, 0.8, x, 0.01, z, PANEL, 0.008, ry=ry), B(0.52, 0.006, 0.7, x, 0.024, z + 0.02, PAPER, 0, ry=ry), B(0.2, 0.03, 0.06, x, 0.04, z - 0.36, CHROME, 0.005, ry=ry)] + \
        [B(0.4, 0.002, 0.012, x, 0.028, z - 0.2 + i * 0.09, INK, 0, ry=ry) for i in range(6)]


def magnifier(x, z):
    return [LA([(0.15, 0), (0.18, 0), (0.18, 0.03), (0.15, 0.03)], x, 0.02, z, CHROME), C(0.15, 0.012, x, 0.035, z, GLASS, seg=24), C(0.025, 0.36, x + 0.3, 0.035, z + 0.18, BAKELITE, 'x')]


def mortar(x, z, lm=L_GREEN):
    return [LA([(0, 0), (0.14, 0), (0.24, 0.2), (0.22, 0.2), (0.13, 0.03), (0, 0.03)], x, 0, z, WHITE), C(0.14, 0.03, x, 0.06, z, lm, seg=20), C(0.03, 0.4, x + 0.08, 0.26, z, WHITE, 'y', r2=0.05)]


def calorimeter(x, z):
    return [LA([(0, 0), (0.3, 0), (0.3, 0.55), (0.26, 0.55), (0.26, 0.04), (0, 0.04)], x, 0, z, FOAM), C(0.31, 0.05, x, 0.575, z, BAKELITE), LA([(0, 0), (0.22, 0), (0.22, 0.45), (0.21, 0.45), (0.21, 0.01), (0, 0.01)], x, 0.05, z, ALU),
            C(0.01, 0.6, x - 0.1, 0.7, z, CHROME), C(0.03, 0.03, x - 0.1, 1.0, z, BAKELITE)] + thermometer(x + 0.1, 0.3, z, 0.85)


def tank(x, z, w=1.6, h=0.7, d=0.8, fill=0.7, lm=WATER, y=0.0):
    """bể kính hộp, có nước"""
    o = [B(w, 0.03, d, x, y + 0.015, z, GLASS, 0)]
    for dx in (-w / 2, w / 2):
        o.append(B(0.02, h, d, x + dx, y + h / 2, z, GLASS, 0))
    for dz in (-d / 2, d / 2):
        o.append(B(w, h, 0.02, x, y + h / 2, z + dz, GLASS, 0))
    if fill:
        o.append(B(w - 0.05, h * fill, d - 0.05, x, y + 0.03 + h * fill / 2, z, lm, 0))
    return o


def patch(x, z, w, d, seed=1, kinds=1):
    """thảm cỏ thực địa: bụi cỏ và hoa rải ngẫu nhiên (kinds = số kiểu cây khác nhau)"""
    rng = np.random.default_rng(seed)
    o = [B(w, 0.04, d, x, 0.02, z, GRASS, 0.01)]
    mats = [LEAF, YELLOW, PINK, PURPLE, LEAF2][:kinds]
    for i in range(int(w * d * 9)):
        px, pz = x + (rng.random() - 0.5) * (w - 0.2), z + (rng.random() - 0.5) * (d - 0.2)
        k = int(rng.integers(0, kinds))
        if k == 0:
            o.append(C(0.03, 0.12, px, 0.1, pz, LEAF, r2=0.0, seg=6))
        else:
            o += [C(0.008, 0.16, px, 0.12, pz, LEAF2, seg=6), S(0.035 + 0.01 * k, px, 0.21, pz, mats[k])]
    return o


def quadrat(x, z, s=1.0, y=0.06):
    o = [B(s, 0.03, 0.03, x, y, z - s / 2, WHITE, 0.004), B(s, 0.03, 0.03, x, y, z + s / 2, WHITE, 0.004), B(0.03, 0.03, s, x - s / 2, y, z, WHITE, 0.004), B(0.03, 0.03, s, x + s / 2, y, z, WHITE, 0.004)]
    for i in (1, 2, 3):
        o += [B(s, 0.006, 0.006, x, y, z - s / 2 + i * s / 4, ORANGE, 0), B(0.006, 0.006, s, x - s / 2 + i * s / 4, y, z, ORANGE, 0)]
    return o


def fish(x, y, z, m=ORANGE, s=1.0):
    return [LA([(0, -0.1 * s), (0.04 * s, -0.04 * s), (0.05 * s, 0.02 * s), (0.02 * s, 0.09 * s), (0, 0.1 * s)], x, y, z, m), B(0.01, 0.08 * s, 0.07 * s, x, y + 0.14 * s, z, m, 0)]


# ================================================================== VẬT LÍ
def phys():
    # SAFETY: biển báo, kính bảo hộ, bình chữa cháy, tủ sơ cứu
    o = []
    for i, (m, sym) in enumerate(((YELLOW, '!'), (RED, 'X'), (BLUE, 'i'))):
        x = -2 + i * 1.1
        o += [C(0.02, 0.9, x, 0.45, -0.3, CHROME), C(0.2, 0.04, x, 0.02, -0.3, IRON), C(0.32, 0.03, x, 1.05, -0.3, m, 'z', seg=3 if i == 0 else 28), TX(sym, 0.26, x, 1.03, -0.27, INK if i == 0 else WHITE)]
    o += [LA([(0, 0), (0.16, 0), (0.16, 0.7), (0.08, 0.82), (0.05, 0.9), (0, 0.9)], 1.7, 0, -0.3, RED), C(0.05, 0.1, 1.7, 0.95, -0.3, INK), TB([(1.7, 0.95, -0.3), (1.95, 0.9, -0.25), (2.0, 0.5, -0.2)], 0.02, RUBBER)]
    o += [B(0.7, 0.5, 0.25, 2.6, 0.25, -0.3, WHITE, 0.02), B(0.3, 0.08, 0.01, 2.6, 0.27, -0.17, RED, 0), B(0.08, 0.3, 0.01, 2.6, 0.27, -0.17, RED, 0)]
    o += [C(0.11, 0.03, -0.8, 0.12, 0.5, GLASS, 'z'), C(0.11, 0.03, -0.5, 0.12, 0.5, GLASS, 'z'), TB([(-0.92, 0.12, 0.5), (-0.95, 0.12, 0.2), (-0.35, 0.12, 0.2), (-0.38, 0.12, 0.5)], 0.012, INK), B(0.5, 0.12, 0.3, 0.5, 0.06, 0.5, BLUE, 0.02)]
    part('Set_SAFETY', o)

    # ERROR_MEASURE: thanh kim loại, thước thẳng, thước kẹp
    o = [B(1.6, 0.12, 0.12, 0, 0.06, -0.3, STEEL, 0.01)] + ruler(-1.2, 1.2, 0.05)
    o += [B(1.8, 0.03, 0.12, 0, 0.015, 0.55, CHROME, 0.004), B(0.06, 0.03, 0.4, -0.87, 0.015, 0.41, CHROME, 0.004), ]
    o += [B(0.004, 0.002, 0.04, -0.8 + i * 0.1, 0.032, 0.52, INK, 0) for i in range(16)]
    part('Set_ERROR_MEASURE', o)
    part('Mov_ERROR_MEASURE_1', [B(0.06, 0.03, 0.4, -0.2, 0.015, 0.41, CHROME, 0.004), B(0.3, 0.05, 0.16, -0.08, 0.025, 0.55, STEEL, 0.006)], pivot=(-0.2, 0.015, 0.41))

    # SPEED: đường ray, xe, hai cổng quang (cổng 2 động), đồng hồ hiện số
    o = track(-2.6, 2.6, 0) + gate(-1.2, 0) + digital(1.8, 0.75, '0.482')
    o += [wire((-1.2, 0.84, -0.26), (1.5, 0.2, 0.75), INK, -0.3)]
    part('Set_SPEED', o)
    part('Mov_SPEED_1', gate(0, 0), pivot=(0, 0, 0))
    part('Mov_SPEED_2', cart(-2.0, 0), pivot=(-2.0, 0.34, 0))

    # FREE_FALL_G: giá, nam châm điện, trụ thép, cổng quang (động theo h), đồng hồ, thước đứng
    o = stand(-0.6, -0.2, 2.3, 0.6) + [C(0.1, 0.16, 0, 2.2, -0.2, COPPER), C(0.06, 0.06, 0, 2.1, -0.2, IRON), C(0.015, 0.06, 0, 2.03, -0.2, IRON)] + ruler(0.35, 2.55, -0.25, vertical=True, at=0.05)
    o += digital(1.6, 0.4, '0.319') + [B(0.5, 0.1, 0.5, 0, 0.05, -0.2, FOAM, 0.02)]
    part('Set_FREE_FALL_G', o)
    part('Mov_FREE_FALL_G_2', [S(0.05, 0, 1.95, -0.2, STEEL)], pivot=(0, 1.95, -0.2))
    part('Mov_FREE_FALL_G_1', [B(0.5, 0.06, 0.06, 0, 0, -0.2, INK, 0.008), B(0.06, 0.06, 0.3, -0.22, 0, -0.08, INK, 0.008), B(0.06, 0.06, 0.3, 0.22, 0, -0.08, INK, 0.008), S(0.02, 0.19, 0, 0.05, LED), C(0.02, 0.5, -0.4, 0, -0.2, CHROME, 'x')], pivot=(0, 0, 0))

    # FORCE_COMPOSITION: bảng từ, ba lực kế, vòng nhẫn, thước đo góc
    o = [B(2.6, 1.8, 0.06, 0, 1.0, -0.4, WHITE, 0.01), B(0.1, 0.1, 0.6, -1.1, 0.05, -0.3, IRON, 0.01), B(0.1, 0.1, 0.6, 1.1, 0.05, -0.3, IRON, 0.01), LA([(0.05, 0), (0.07, 0), (0.07, 0.02), (0.05, 0.02)], 0, 1.0, -0.34, CHROME)]
    o[-1].rotation_euler = (R90, 0, 0)
    for a, m in ((2.5, RED), (0.7, BLUE), (-1.57, GREENM)):
        cx, cy = 0.55 * math.cos(a), 1.0 + 0.55 * math.sin(a)
        o += [B(0.5, 0.09, 0.04, cx, cy, -0.34, m, 0.01, rz=a), TB([(0.07 * math.cos(a), 1.0 + 0.07 * math.sin(a), -0.34), (0.3 * math.cos(a), 1.0 + 0.3 * math.sin(a), -0.34)], 0.006, INK, False), C(0.05, 0.05, 0.85 * math.cos(a), 1.0 + 0.85 * math.sin(a), -0.35, IRON, 'z')]
    o += [C(0.4, 0.008, 0, 1.0, -0.365, mat('prot', hexc('#E3B341'), rough=0.3, alpha=0.5), 'z', seg=40)]
    part('Set_FORCE_COMPOSITION', o)

    # SOUND_FREQUENCY: âm thoa trên hộp cộng hưởng, micro, dao động kí
    o = [B(0.9, 0.3, 0.4, -1.8, 0.15, 0, WOOD, 0.01), C(0.02, 0.25, -1.8, 0.42, 0, CHROME), B(0.17, 0.04, 0.04, -1.8, 0.55, 0, CHROME, 0.006)]
    o += [C(0.14, 0.03, -0.6, 0.015, 0, IRON), C(0.015, 0.6, -0.6, 0.3, 0, CHROME), C(0.05, 0.22, -0.72, 0.62, 0, BAKELITE, 'x'), S(0.07, -0.85, 0.62, 0, STEEL)]
    o += [B(1.4, 0.9, 0.7, 1.4, 0.45, -0.2, CASE, 0.03), B(0.8, 0.6, 0.012, 1.15, 0.5, 0.151, SCREEN, 0)]
    o += [C(0.05, 0.04, 1.85, 0.7 - i * 0.2, 0.16, BAKELITE, 'z') for i in range(3)] + [wire((-0.6, 0.05, 0), (1.0, 0.1, 0.16), INK, 0.4)]
    part('Set_SOUND_FREQUENCY', o)
    part('Mov_SOUND_FREQUENCY_1', [B(0.03, 0.6, 0.04, -1.87, 0.85, 0, CHROME, 0.006)], pivot=(-1.87, 0.55, 0))
    part('Mov_SOUND_FREQUENCY_2', [B(0.03, 0.6, 0.04, -1.73, 0.85, 0, CHROME, 0.006)], pivot=(-1.73, 0.55, 0))

    # SOUND_SPEED: ống cộng hưởng có pit-tông, loa, thước, nhiệt kế
    o = [C(0.2, 3.2, 0.2, 0.45, 0, GLASS, 'x', seg=28), C(0.19, 0.12, 0.9, 0.45, 0, RUBBER, 'x'), C(0.02, 1.4, 1.6, 0.45, 0, CHROME, 'x'), C(0.08, 0.04, 2.3, 0.45, 0, BAKELITE, 'x')]
    for x in (-1.0, 1.4):
        o += [B(0.1, 0.25, 0.5, x, 0.125, 0, WOOD, 0.01)]
    o += [B(0.5, 0.6, 0.5, -1.9, 0.3, 0, BAKELITE, 0.02), LA([(0, 0), (0.18, 0.06), (0.2, 0.08), (0, 0.08)], -1.64, 0.45, 0, IRON)]
    o[-1].rotation_euler = (0, R90, 0)
    o += ruler(-1.4, 1.8, 0.45) + thermometer(2.6, 0.1, 0.5, 0.8) + [C(0.1, 0.05, 2.6, 0.025, 0.5, IRON)]
    part('Set_SOUND_SPEED', o)

    # EMF_INTERNAL_R: pin, biến trở (con chạy động), ampe kế, vôn kế, khóa K, dây
    o = battery(-2.3, 0.2) + meter(-0.9, -0.5, 'A', RED, 0.3) + meter(0.2, -0.5, 'V', BLUE, -0.2) + switch(-2.2, -0.6)
    o += [B(1.6, 0.06, 0.3, 1.7, 0.03, 0.3, PANEL, 0.01), C(0.1, 1.3, 1.7, 0.2, 0.3, CREAM, 'x'), C(0.012, 1.5, 1.7, 0.42, 0.3, CHROME, 'x'), B(0.06, 0.4, 0.2, 0.95, 0.23, 0.3, IRON, 0.01), B(0.06, 0.4, 0.2, 2.45, 0.23, 0.3, IRON, 0.01)]
    o += [C(0.102, 0.012, 1.1 + i * 0.05, 0.2, 0.3, COPPER, 'x') for i in range(25)]
    o += [wire((-2.3, 0.46, 0.2), (-2.08, 0.1, -0.6)), wire((-2.32, 0.1, -0.6), (-1.1, 0.56, -0.5)), wire((-0.7, 0.56, -0.5), (0.95, 0.4, 0.3), INK), wire((0, 0.56, -0.5), (2.45, 0.4, 0.3), BLUE, -0.2)]
    part('Set_EMF_INTERNAL_R', o)
    part('Mov_EMF_INTERNAL_R_2', needle(-0.9, -0.5, RED), pivot=(-0.9, 0.2, -0.37))
    part('Mov_EMF_INTERNAL_R_3', needle(0.2, -0.5, BLUE), pivot=(0.2, 0.2, -0.37))
    part('Mov_EMF_INTERNAL_R_1', [B(0.12, 0.14, 0.16, 0, 0.42, 0.3, RED, 0.01), B(0.03, 0.14, 0.03, 0, 0.3, 0.3, COPPER, 0)], pivot=(0, 0, 0))

    # NEWTON2: đường ray, xe, ròng rọc, quả cân treo (động), cổng quang
    o = track(-2.6, 2.2, 0, 0.9) + gate(0.4, 0, 0.94) + [C(0.14, 0.04, 2.3, 1.1, 0, ALU, 'z'), B(0.2, 0.06, 0.06, 2.25, 1.0, -0.05, IRON, 0.008), TB([(-1.35, 1.1, 0), (2.3, 1.24, 0)], 0.005, INK, False), TB([(2.44, 1.1, 0), (2.44, 0.55, 0)], 0.005, INK, False)]
    o += [B(0.5, 0.9, 0.6, -2.3, 0.45, 0, WOOD, 0.01), B(0.5, 0.9, 0.6, 1.9, 0.45, 0, WOOD, 0.01)] + digital(0.4, 0.8, '1.25')
    part('Set_NEWTON2', o)
    part('Mov_NEWTON2_2', cart(-1.6, 0, 0.94), pivot=(-1.6, 0.94, 0))
    part('Mov_NEWTON2_1', weight(2.44, 0.3, 0, 0.1, 0.25), pivot=(2.44, 0.55, 0))

    # FRICTION: tấm bề mặt, khối gỗ, quả cân (động), lực kế kéo ngang
    o = [B(3.6, 0.06, 0.9, 0, 0.03, 0, WOOD, 0.01), B(1.1, 0.012, 0.8, -1.9, 0.07, 0.95, GLASS, 0), B(1.1, 0.03, 0.8, -0.6, 0.02, 0.95, RUBBER, 0.004), ]
    o += [C(0.06, 0.7, 0.65, 0.21, 0, mat('sbody', hexc('#F4EEDD'), rough=0.4), 'x'), C(0.02, 0.3, 1.1, 0.21, 0, CHROME, 'x'), LA([(0.03, 0), (0.045, 0), (0.045, 0.012), (0.03, 0.012)], 1.3, 0.21, 0, CHROME)]
    o += [B(0.004, 0.125, 0.004, 0.4 + i * 0.05, 0.21, 0.0, INK, 0) for i in range(11)]
    part('Set_FRICTION', o)
    part('Mov_FRICTION_2', [B(0.7, 0.3, 0.45, -0.8, 0.21, 0, WOOD, 0.015), C(0.02, 0.04, -0.44, 0.21, 0, CHROME, 'x')], pivot=(-0.8, 0.21, 0))
    part('Mov_FRICTION_3', [TB([(-0.42, 0.21, 0), (0.3, 0.21, 0)], 0.005, INK, False)], pivot=(0.3, 0.21, 0))
    part('Mov_FRICTION_1', weight(-0.9, 0.36, 0, 0.12, 0.1) + weight(-0.65, 0.36, 0, 0.12, 0.1), pivot=(-0.8, 0.36, 0))

    # HOOKE: giá treo, lò xo (co giãn), quả cân (động), thước milimét
    o = stand(-0.6, -0.2, 2.2, 0.6) + ruler(0.35, 2.35, -0.25, vertical=True, at=0.06) + [C(0.012, 0.08, 0, 2.16, -0.2, CHROME)]
    o += weight(1.4, 0, 0.4, 0.1, 0.1) + weight(1.7, 0, 0.4, 0.1, 0.1) + weight(1.55, 0, 0.7, 0.1, 0.1)
    part('Set_HOOKE', o)
    part('Mov_HOOKE_1', spring(0, 1.4, 2.12, -0.2), pivot=(0, 2.12, -0.2))
    part('Mov_HOOKE_2', [C(0.008, 0.14, 0, 1.33, -0.2, CHROME), B(0.1, 0.006, 0.006, 0.05, 1.3, -0.2, RED, 0)] + weight(0, 1.14, -0.2, 0.1, 0.12), pivot=(0, 1.4, -0.2))

    # PENDULUM_G: giá treo, dây (co giãn), quả nặng (động), đồng hồ bấm giây, thước
    o = stand(-0.7, -0.2, 2.4, 0.7) + [B(0.1, 0.06, 0.1, 0, 2.4, -0.2, IRON, 0.008)] + stopwatch(1.5, 0.5, False) + ruler(-0.9, 0.9, 0.75)
    o += [C(0.5, 0.006, 0, 1.2, -0.45, mat('arc', hexc('#F4EEDD'), rough=0.8, alpha=0.5), 'z', seg=40)]
    part('Set_PENDULUM_G', o)
    part('Mov_PENDULUM_G_3', swhand(1.5, 0.5), pivot=(1.5, 0.066, 0.5))
    part('Mov_PENDULUM_G_1', [C(0.005, 1.0, 0, 1.87, -0.2, INK, seg=6)], pivot=(0, 2.37, -0.2))
    part('Mov_PENDULUM_G_2', [S(0.11, 0, 1.3, -0.2, BRASS), C(0.012, 0.06, 0, 1.42, -0.2, CHROME)], pivot=(0, 1.37, -0.2))

    # BOYLE: xi lanh thủy tinh đứng, pit-tông (động), áp kế, thước chia
    o = [B(0.9, 0.08, 0.7, 0, 0.04, 0, IRON, 0.02), C(0.26, 1.5, 0, 0.83, 0, GLASS, seg=32), C(0.28, 0.06, 0, 0.11, 0, CHROME), C(0.28, 0.04, 0, 1.6, 0, CHROME)]
    o += [B(0.006, 0.004, 0.006, 0.262, 0.25 + i * 0.06, 0.0, INK, 0) for i in range(22)] + [B(0.05, 0.004, 0.006, 0.27, 0.25 + i * 0.3, 0.0, INK, 0) for i in range(5)]
    o += [TB([(0.26, 0.2, 0), (0.7, 0.2, 0), (1.2, 0.5, 0)], 0.025, RUBBER), C(0.34, 0.12, 1.2, 0.75, 0, CHROME, 'z', seg=36), C(0.3, 0.012, 1.2, 0.75, 0.061, CREAM, 'z', seg=36), B(0.012, 0.24, 0.006, 1.27, 0.82, 0.07, RED, 0, rz=-0.6), TX('kPa', 0.07, 1.2, 0.6, 0.07)]
    part('Set_BOYLE', o)
    part('Mov_BOYLE_1', [C(0.245, 0.1, 0, 0, 0, RUBBER, seg=32), C(0.03, 1.2, 0, 0.6, 0, CHROME), C(0.2, 0.04, 0, 1.22, 0, BAKELITE)], pivot=(0, 0, 0))

    # OHM_LAW: nguồn chỉnh được, điện trở, ampe kế, vôn kế
    o = psu(-2.2, -0.2, '5.0 V') + resistor(-0.4, 0.5) + resistor(-0.4, 0.95, BLUE) + meter(0.7, -0.4, 'A', RED, 0.2) + meter(1.9, -0.4, 'V', BLUE, 0.4)
    o += [wire((-2.4, 0.12, 0.14), (-0.6, 0.14, 0.5)), wire((-0.2, 0.14, 0.5), (0.5, 0.56, -0.4), RED, 0.15), wire((0.9, 0.56, -0.4), (-2.1, 0.12, 0.14), INK, 0.5), wire((-0.6, 0.14, 0.5), (1.7, 0.56, -0.4), BLUE, -0.5), wire((-0.2, 0.14, 0.5), (2.1, 0.56, -0.4), BLUE, 0.6)]
    part('Set_OHM_LAW', o)
    part('Mov_OHM_LAW_1', needle(0.7, -0.4, RED), pivot=(0.7, 0.2, -0.27))
    part('Mov_OHM_LAW_2', needle(1.9, -0.4, BLUE), pivot=(1.9, 0.2, -0.27))

    # SPECIFIC_HEAT: nhiệt lượng kế, nguồn nung, nhiệt kế, đồng hồ, cân
    o = calorimeter(-0.4, 0) + psu(-2.1, -0.2, '40 W') + stopwatch(1.0, 0.6, False) + digital(2.1, -0.1, '200.0 g', 0.9, True) + up(beaker(2.1, -0.1, 0.2, 0.3), 0.26)
    o += [wire((-2.3, 0.12, 0.14), (-0.5, 0.62, 0), RED, 0.3), wire((-2.0, 0.12, 0.14), (-0.3, 0.62, 0.05), INK, 0.45)]
    part('Set_SPECIFIC_HEAT', o)
    part('Mov_SPECIFIC_HEAT_1', swhand(1.0, 0.6), pivot=(1.0, 0.066, 0.6))

    # CHARLES: bình khí trong cốc nước nóng trên bếp, xi lanh ngang (pit-tông động), nhiệt kế
    o = [B(0.9, 0.16, 0.8, -1.4, 0.08, 0, CASE, 0.02), C(0.3, 0.02, -1.4, 0.17, 0, IRON)] + up(beaker(-1.4, 0, 0.36, 0.6, 0.7, liq('hot', '#E8A07F', 0.4)), 0.18)
    o += [LA([(0, 0), (0.2, 0), (0.24, 0.16), (0.2, 0.32), (0.06, 0.42), (0.06, 0.6), (0, 0.6)], -1.4, 0.24, 0, GLASS), C(0.065, 0.06, -1.4, 0.86, 0, RUBBER)]
    o += [TB([(-1.4, 0.88, 0), (-1.4, 1.2, 0), (-0.6, 1.2, 0), (-0.2, 0.9, 0), (0.1, 0.9, 0)], 0.02, RUBBER), C(0.16, 1.6, 0.9, 0.9, 0, GLASS, 'x', seg=24)] + stand(0.9, -0.3, 0.9, 0.0) + [B(0.1, 0.1, 0.4, 0.9, 0.9, -0.15, IRON, 0.01)]
    o += [B(0.004, 0.006, 0.006, 0.2 + i * 0.1, 1.062, 0, INK, 0) for i in range(15)] + thermometer(-1.6, 0.4, 0.1, 0.9, 0.15)
    part('Set_CHARLES', o)
    part('Mov_CHARLES_1', [C(0.15, 0.08, 0, 0.9, 0, RUBBER, 'x', seg=24), C(0.02, 0.9, 0.45, 0.9, 0, CHROME, 'x')], pivot=(0, 0, 0))

    # EM_INDUCTION: cuộn dây, nam châm thẳng (động), milivôn kế
    o = [B(1.0, 0.06, 0.8, -0.6, 0.03, 0, PANEL, 0.01), C(0.36, 0.7, -0.6, 0.5, 0, COPPER, 'x', seg=36), C(0.4, 0.04, -0.97, 0.5, 0, BAKELITE, 'x', seg=36), C(0.4, 0.04, -0.23, 0.5, 0, BAKELITE, 'x', seg=36), B(0.3, 0.14, 0.5, -0.6, 0.1, 0, WOOD, 0.01)]
    o += meter(1.9, -0.4, 'mV', BLUE, 0.3) + [wire((-0.9, 0.2, 0.3), (1.7, 0.56, -0.4), RED, 0.5), wire((-0.3, 0.2, 0.3), (2.1, 0.56, -0.4), INK, 0.3)]
    part('Set_EM_INDUCTION', o)
    part('Mov_EM_INDUCTION_2', needle(1.9, -0.4, BLUE), pivot=(1.9, 0.2, -0.27))
    part('Mov_EM_INDUCTION_1', [B(0.45, 0.14, 0.14, -0.225, 0.5, 0, RED, 0.01), B(0.45, 0.14, 0.14, 0.225, 0.5, 0, BLUE, 0.01), TX('N', 0.1, -0.22, 0.5, 0.075, WHITE), TX('S', 0.1, 0.22, 0.5, 0.075, WHITE)], pivot=(0, 0, 0))

    # WAVE_INTERFERENCE: khay nước, cần rung hai mũi nhọn, đèn hoạt nghiệm, thước
    o = tank(0, 0, 2.6, 0.16, 1.6, 0.6, WATER, 0.5)
    for dx in (-1.2, 1.2):
        for dz in (-0.7, 0.7):
            o.append(C(0.03, 0.5, dx, 0.25, dz, CHROME))
    for sx in (-0.3, 0.3):
        o += [C(0.012, 0.3, sx, 0.75, -0.3, CHROME, seg=8)]
    o += [B(0.9, 0.06, 0.06, 0, 0.9, -0.3, IRON, 0.008), B(0.3, 0.2, 0.2, -0.7, 0.9, -0.3, BAKELITE, 0.02)] + stand(-1.9, -0.3, 0.9, 1.1) + lamp(2.0, -0.6, 1.9, -1) + ruler(-1.0, 1.0, 1.0)
    o += [B(2.4, 0.01, 1.4, 0, 0.012, 0, PAPER, 0)]
    part('Set_WAVE_INTERFERENCE', o)

    # STANDING_WAVE: máy phát dao động, sợi dây có sóng dừng, ròng rọc, quả cân, thước
    o = [B(0.7, 0.5, 0.5, -2.3, 0.25, 0, CASE, 0.02), C(0.05, 0.04, -2.5, 0.35, 0.26, BAKELITE, 'z'), B(0.3, 0.1, 0.012, -2.2, 0.35, 0.255, DARK, 0), C(0.03, 0.3, -1.9, 0.62, 0, CHROME), B(0.2, 0.06, 0.1, -1.9, 0.52, 0, IRON, 0.008)]
    o += stand(2.1, -0.3, 0.78, 0.0) + [C(0.12, 0.04, 2.0, 0.66, 0, ALU, 'z'), TB([(2.12, 0.66, 0), (2.12, 0.3, 0)], 0.005, INK, False)] + weight(2.12, 0.08, 0, 0.1, 0.2) + ruler(-1.9, 1.9, 0.6)
    part('Set_STANDING_WAVE', o)

    # CAPACITOR_RC: bảng mạch có tụ và điện trở, nguồn 6 V, vôn kế, đồng hồ bấm giây, khóa
    o = [B(1.4, 0.05, 0.9, -0.5, 0.025, 0.1, GREENM, 0.01), C(0.14, 0.4, -0.8, 0.25, 0, BLUE), C(0.142, 0.05, -0.8, 0.4, 0, CHROME), TX('100 µF', 0.07, -0.8, 0.22, 0.145, WHITE)] + resistor(-0.2, 0.3) + switch(-0.5, -0.25)
    o += psu(-2.3, -0.2, '6.0 V') + meter(1.2, -0.4, 'V', BLUE, 0.1) + stopwatch(2.3, 0.5, False) + [wire((-2.5, 0.12, 0.14), (-0.62, 0.1, -0.25)), wire((-0.38, 0.1, -0.25), (-0.4, 0.14, 0.3), RED, 0.1), wire((-0.8, 0.46, 0), (1.0, 0.56, -0.4), BLUE, 0.5), wire((-2.2, 0.12, 0.14), (1.4, 0.56, -0.4), INK, 0.9)]
    part('Set_CAPACITOR_RC', o)
    part('Mov_CAPACITOR_RC_1', needle(1.2, -0.4, BLUE), pivot=(1.2, 0.2, -0.27))
    part('Mov_CAPACITOR_RC_2', swhand(2.3, 0.5), pivot=(2.3, 0.066, 0.5))

    # LATENT_HEAT_FUSION: nhiệt lượng kế, đĩa nước đá, cốc nước ấm, cân
    o = calorimeter(-1.0, 0) + petri(0.4, 0.5) + [B(0.1, 0.1, 0.1, 0.33 + i * 0.12, 0.07, 0.45 + (i % 2) * 0.12, mat('ice%d' % i, (0.85, 0.94, 1.0), rough=0.1, alpha=0.6), 0.015) for i in range(3)]
    o += beaker(0.4, -0.4, 0.24, 0.45, 0.6, liq('warm', '#E8B49A', 0.4)) + digital(2.0, 0, '52.4 g', 0.9, True) + [B(0.1, 0.1, 0.1, 1.95 + i * 0.12, 0.31, 0, mat('icb%d' % i, (0.85, 0.94, 1.0), rough=0.1, alpha=0.6), 0.015) for i in range(2)]
    part('Set_LATENT_HEAT_FUSION', o)

    # LEVER_MOMENT: thanh có trục quay, quả cân trái (động theo d₁), quả cân phải, thước
    o = stand(0, -0.35, 1.5, 0.0) + [C(0.03, 0.4, 0, 1.5, -0.15, CHROME, 'z')]
    o += ruler(-1.8, 1.8, 0.6) + weight(2.4, 0, 0.5) + weight(2.65, 0, 0.5)
    part('Set_LEVER_MOMENT', o)
    part('Mov_LEVER_MOMENT_2', [B(3.6, 0.08, 0.05, 0, 1.5, 0, ALU, 0.01)] + [C(0.02, 0.06, -1.6 + i * 0.4, 1.5, 0, INK, 'z') for i in range(9)], pivot=(0, 1.5, 0))
    part('Mov_LEVER_MOMENT_3', [TB([(1.2, 1.46, 0), (1.2, 1.2, 0)], 0.005, INK, False)] + weight(1.2, 0.95, 0, 0.11, 0.25), pivot=(1.2, 1.5, 0))
    part('Mov_LEVER_MOMENT_1', [TB([(0, 1.46, 0), (0, 1.2, 0)], 0.005, INK, False)] + weight(0, 0.95, 0, 0.11, 0.25), pivot=(0, 0, 0))

    # PROJECTILE_HORIZONTAL: máng ném trên bệ (động theo h), bi thép, giấy than, thước
    o = [B(2.2, 0.01, 0.9, 1.3, 0.006, 0, PAPER, 0), B(2.0, 0.006, 0.8, 1.3, 0.014, 0, mat('carbon', hexc('#2A2E33'), rough=0.8), 0)] + ruler(0.2, 2.6, 0.6)
    o += [S(0.035, 0.3 + 0.35 * i, 1.4 - 0.2 * i * i * 0.55, 0, mat('trail%d' % i, (0.6, 0.62, 0.65), metallic=1, rough=0.3, alpha=0.35 + 0.1 * i)) for i in range(1, 5)] + [C(0.03, 1.6, -0.9, 0.8, -0.4, CHROME), B(0.6, 0.06, 0.5, -1.0, 0.03, -0.3, IRON, 0.015)]
    part('Set_PROJECTILE_HORIZONTAL', o)
    part('Mov_PROJECTILE_HORIZONTAL_1', [B(1.2, 0.06, 0.4, -0.8, -0.05, 0, WOOD, 0.01), B(1.0, 0.04, 0.12, -1.0, 0.22, 0, ALU, 0.006, rz=0.45), B(0.5, 0.04, 0.12, -0.35, 0.0, 0, ALU, 0.006), B(0.1, 0.1, 0.1, -0.9, -0.05, -0.4, IRON, 0.01)], pivot=(0, 0, 0))
    part('Mov_PROJECTILE_HORIZONTAL_2', [S(0.05, -0.2, 0.07, 0, STEEL)], pivot=(-0.2, 0.07, 0))

    # TRANSFORMER: lõi sắt chữ U, hai cuộn dây, nguồn xoay chiều, hai vôn kế
    o = [B(0.3, 0.9, 0.3, -0.5, 0.6, 0, IRON, 0.01), B(0.3, 0.9, 0.3, 0.5, 0.6, 0, IRON, 0.01), B(1.3, 0.3, 0.3, 0, 0.15, 0, IRON, 0.01), B(1.3, 0.25, 0.3, 0, 1.17, 0, IRON, 0.01)]
    o += [B(0.31, 0.004, 0.31, sx, 0.2 + i * 0.1, 0, STEEL, 0) for sx in (-0.5, 0.5) for i in range(9)]
    o += [C(0.3, 0.5, -0.5, 0.6, 0, COPPER, seg=32), C(0.34, 0.03, -0.5, 0.86, 0, BAKELITE, seg=32), C(0.34, 0.03, -0.5, 0.34, 0, BAKELITE, seg=32), C(0.3, 0.5, 0.5, 0.6, 0, BLUE, seg=32), C(0.34, 0.03, 0.5, 0.86, 0, BAKELITE, seg=32), C(0.34, 0.03, 0.5, 0.34, 0, BAKELITE, seg=32)]
    o += psu(-2.3, -0.1, '6 V ~') + meter(-1.3, 0.7, 'V~', RED, 0.1) + meter(1.9, -0.1, 'V~', BLUE, 0.5) + [wire((-2.5, 0.12, 0.24), (-0.8, 0.5, 0.2)), wire((-2.2, 0.12, 0.24), (-0.8, 0.7, 0.2), INK, 0.4), wire((0.8, 0.5, 0.2), (1.7, 0.56, -0.1), BLUE), wire((0.8, 0.7, 0.2), (2.1, 0.56, -0.1), BLUE, 0.4)]
    part('Set_TRANSFORMER', o)
    part('Mov_TRANSFORMER_1', needle(-1.3, 0.7, RED), pivot=(-1.3, 0.2, 0.83))
    part('Mov_TRANSFORMER_2', needle(1.9, -0.1, BLUE), pivot=(1.9, 0.2, 0.03))


# ================================================================== SINH HỌC
def bio():
    # BIOMOLECULES: giá 5 ống mẫu, 4 lọ thuốc thử, đèn cồn, cốc cách thủy
    o = rack(-1.5, 0, [liq('starch', '#EDE6CF', 0.8), L_YELLOW, liq('egg', '#F3EFD8', 0.7), liq('oil', '#E8C84A', 0.8), WATER])
    for i, (m, c) in enumerate(((L_BROWN, INK), (L_BLUE, BLUE), (L_VIOLET, PURPLE), (L_RED, RED))):
        o += bottle(0.1 + i * 0.35, 0.5, m, c)
    o += burner(0.4, -0.4) + up(beaker(1.9, -0.1, 0.32, 0.5, 0.6) + ttube(1.85, 0.06, -0.1, L_BRICK), 0.14) + [B(0.9, 0.14, 0.8, 1.9, 0.07, -0.1, CASE, 0.02)]
    part('Set_BIOMOLECULES', o)

    # CELL_OBSERVE: kính hiển vi (bàn kính động theo núm chỉnh nét), lam kính, củ hành, xanh methylene
    o = microscope(-0.6, 0) + slide(0.6, 0.5) + slide(1.0, 0.6, L_BLUE) + [S(0.2, 1.6, 0.2, -0.3, PURPLE), C(0.03, 0.1, 1.6, 0.43, -0.3, LEAF2), B(0.5, 0.3, 0.3, 2.3, 0.15, 0.4, WOOD, 0.01)] + bottle(0.5, -0.5, L_BLUE, BLUE) + [C(0.012, 0.4, 1.3, 0.012, 0.75, CHROME, 'x', seg=6)]
    part('Set_CELL_OBSERVE', o)
    part('Mov_CELL_OBSERVE_1', stage(-0.6, 0, 0), pivot=(0, 0, 0))

    # PLASMOLYSIS: kính hiển vi, lam kính, NaCl 8%, nước cất, giấy thấm, củ hành tím
    o = microscope(-0.8, 0) + stage(-0.8, 0) + slide(0.4, 0.5, PURPLE) + bottle(1.2, -0.3, liq('nacl', '#DDE7EE', 0.5), BLUE, 0.13, 0.4) + bottle(1.7, -0.3, WATER, WHITE, 0.13, 0.4)
    o += [B(0.4, 0.02, 0.3, 1.3, 0.01, 0.55, PAPER, 0), S(0.22, 2.4, 0.2, 0.2, PURPLE), C(0.03, 0.1, 2.4, 0.44, 0.2, LEAF2)] + [C(0.01, 0.3, 0.9, 0.2, 0.2, GLASS, seg=6), S(0.03, 0.9, 0.37, 0.2, RUBBER)]
    part('Set_PLASMOLYSIS', o)

    # ENZYME: bể ổn nhiệt có giá ống, nhiệt kế, đồng hồ, iodine, dung dịch đệm
    o = tank(-0.9, 0, 1.6, 0.5, 0.8, 0.75, WATER, 0.12) + [B(1.7, 0.12, 0.9, -0.9, 0.06, 0, CASE, 0.02), B(0.3, 0.1, 0.012, -1.4, 0.06, 0.451, DARK, 0), TX('37 °C', 0.06, -1.4, 0.06, 0.46, LED)]
    for i in range(5):
        o += ttube(-1.4 + i * 0.25, 0.2, 0, [liq('e%d' % i, h, 0.8) for h in ('#2A2E66', '#4A3A7A', '#8A6A5A', '#C9A66A', '#E3D9A0')][i])
    o += thermometer(-0.3, 0.3, 0.2, 0.8, 0.1) + stopwatch(0.6, 0.6) + bottle(0.9, -0.3) + [q for i in range(3) for q in bottle(1.5 + i * 0.35, -0.3, [L_RED, L_YELLOW, L_BLUE][i], WHITE)] + [TX('pH', 0.1, 1.85, 0.5, -0.3)]
    part('Set_ENZYME', o)

    # MITOSIS_SLIDE: kính hiển vi, hành mọc rễ trên cốc, đĩa đầu rễ, thuốc nhuộm, HCl, đèn cồn
    o = microscope(-1.4, 0) + stage(-1.4, 0) + beaker(0.2, -0.3, 0.2, 0.4, 0.8) + [S(0.22, 0.2, 0.55, -0.3, CREAM)] + [C(0.008, 0.25, 0.2 + dx, 0.3, -0.3 + dz, WHITE, seg=6) for dx, dz in ((0.05, 0), (-0.06, 0.04), (0, -0.07), (0.03, 0.06))]
    o += petri(0.3, 0.55, L_RED) + bottle(1.0, -0.3, L_RED, RED) + bottle(1.4, -0.3, WATER, YELLOW) + burner(2.1, 0.1) + slide(1.2, 0.6, L_RED)
    part('Set_MITOSIS_SLIDE', o)

    # YOGURT: thùng ủ ấm có 4 hũ, nhiệt kế, bút đo pH, hộp sữa
    o = [LA([(0, 0), (0.75, 0), (0.75, 0.6), (0.65, 0.6), (0.65, 0.08), (0, 0.08)], -1.0, 0, 0, FOAM), B(1.3, 0.1, 1.3, 0.9, 0.05, -0.2, FOAM, 0.03)]
    for dx, dz in ((-0.28, -0.28), (0.28, -0.28), (-0.28, 0.28), (0.28, 0.28)):
        o += [LA([(0, 0), (0.2, 0), (0.2, 0.36), (0.19, 0.36), (0.19, 0.01), (0, 0.01)], -1.0 + dx, 0.09, dz, GLASS), C(0.185, 0.28, -1.0 + dx, 0.24, dz, L_MILK), C(0.21, 0.03, -1.0 + dx, 0.47, dz, RED)]
    o += thermometer(-1.0, 0.2, 0, 0.9) + [B(0.3, 0.6, 0.2, 2.0, 0.3, 0.3, WHITE, 0.01), B(0.3, 0.2, 0.2, 2.0, 0.5, 0.301, BLUE, 0.01), B(0.16, 0.5, 0.06, 1.2, 0.03, 0.7, YELLOW, 0.01, rz=0), C(0.02, 0.2, 1.2, 0.03, 0.36, GLASS, 'z'), B(0.1, 0.1, 0.012, 1.2, 0.062, 0.8, DARK, 0)]
    part('Set_YOGURT', o)

    # VIRUS_SURVEY: phiếu khảo sát, bút, máy tính bảng có biểu đồ, áp phích tuyên truyền
    o = clipboard(-1.6, 0.3) + clipboard(-0.8, 0.4, 0.2) + [C(0.02, 0.5, -1.1, 0.05, 0.9, BLUE, 'x', seg=8)]
    o += [B(1.4, 0.03, 1.0, 0.7, 0.015, 0.2, DARK, 0.02)] + [B(0.14, 0.012, h * 2.4, 0.25 + i * 0.22, 0.036, 0.6 - h * 1.2, [RED, ORANGE, BLUE, GREENM, YELLOW][i], 0) for i, h in enumerate((0.25, 0.14, 0.3, 0.1, 0.2))]
    o += [C(0.02, 1.6, 2.4, 0.8, -0.5, CHROME), C(0.2, 0.04, 2.4, 0.02, -0.5, IRON), B(1.0, 1.3, 0.03, 2.4, 1.2, -0.48, PAPER, 0.004), B(0.8, 0.2, 0.01, 2.4, 1.6, -0.46, RED, 0), S(0.18, 2.4, 1.15, -0.44, GREENM)] + [C(0.02, 0.12, 2.4 + 0.22 * math.cos(a), 1.15 + 0.22 * math.sin(a), -0.44, GREENM, 'z', seg=6) for a in [i * 0.785 for i in range(8)]]
    part('Set_VIRUS_SURVEY', o)

    # TRANSPIRATION: chậu cây bọc túi trên cân, đèn (động), lọ vaseline
    o = digital(-0.6, 0, '352.18 g', 1.0, True, False) + up(plant(-0.6, 0, 0.8, 8, r=0.24), 0.26) + bottle(1.9, 0.5, mat('vas', hexc('#F1E7B5'), rough=0.5), BLUE, 0.14, 0.18)
    o += [LA([(0.27, 0), (0.3, 0.2), (0.27, 0.38), (0.26, 0.38), (0.29, 0.2), (0.26, 0)], -0.6, 0.27, 0, mat('bag', (0.95, 0.97, 1), rough=0.1, alpha=0.3))]
    part('Set_TRANSPIRATION', o)
    part('Mov_TRANSPIRATION_1', lamp(0, -0.2, 1.7, -1), pivot=(0, 0, 0))

    # PIGMENT: cối chày, lá, ống đong có giấy sắc kí với các vạch sắc tố, acetone, thước
    o = mortar(-1.7, 0.2) + [B(0.4, 0.012, 0.2, -1.0, 0.01, 0.6, LEAF, 0.004, ry=0.5), B(0.35, 0.012, 0.18, -0.7, 0.01, 0.35, LEAF, 0.004, ry=-0.3)] + bottle(-0.6, -0.4, WATER, RED, 0.13, 0.4)
    o += [LA([(0, 0), (0.22, 0), (0.24, 0.03), (0.16, 0.05), (0.16, 1.2), (0.15, 1.2), (0.15, 0.06), (0, 0.06)], 0.8, 0, 0, GLASS), C(0.145, 0.12, 0.8, 0.12, 0, liq('solv', '#E8E0B0', 0.5), seg=20), C(0.17, 0.04, 0.8, 1.22, 0, RUBBER), B(0.2, 1.05, 0.006, 0.8, 0.65, 0, PAPER, 0)]
    for y, m in ((1.0, mat('car', hexc('#E8922A'))), (0.8, YELLOW), (0.55, mat('chla', hexc('#2E7D5B'))), (0.42, LEAF2)):
        o.append(B(0.19, 0.035, 0.008, 0.8, y, 0.002, m, 0))
    o += ruler(1.3, 2.5, 0, vertical=True, at=0.0) + [B(0.3, 0.04, 0.3, 1.3, 0.02, 0, IRON, 0.01)] + ttube(-0.1, 0, 0.3, L_GREEN) + [B(0.2, 0.06, 0.2, -0.1, 0.03, 0.3, WOOD, 0.01)]
    part('Set_PIGMENT', o)

    # LEAF_STARCH: chậu cây có lá bọc giấy bạc, đèn, cốc cồn cách thủy, đĩa petri thử iodine
    o = plant(-1.9, 0, 0.8, 7, r=0.24) + [B(0.3, 0.02, 0.16, -1.62, 0.95, 0.05, FOIL, 0.004, ry=0.4)] + lamp(-0.9, -0.5, 1.7, -1)
    o += [B(0.9, 0.14, 0.8, 0.5, 0.07, 0, CASE, 0.02)] + up(beaker(0.5, 0, 0.34, 0.5, 0.6) + beaker(0.5, 0, 0.18, 0.5, 0.5, L_GREEN), 0.14)
    o += petri(1.7, 0.4, L_BROWN) + [B(0.26, 0.012, 0.14, 1.7, 0.03, 0.4, mat('blk', hexc('#1B1D3A')), 0.004)] + bottle(2.3, -0.2) + petri(1.7, -0.3) + [B(0.26, 0.012, 0.14, 1.7, 0.03, -0.3, mat('pale', hexc('#E8E3C2')), 0.004)]
    part('Set_LEAF_STARCH', o)

    # SEED_RESPIRATION: hai bình kín (hạt sống / hạt luộc) nối ống sang nước vôi trong, bể ổn nhiệt, cảm biến CO₂
    o = tank(-1.0, 0, 2.0, 0.45, 0.9, 0.7, WATER, 0.12) + [B(2.1, 0.12, 1.0, -1.0, 0.06, 0, CASE, 0.02)]
    for i, (sx, m) in enumerate(((-1.5, LEAF2), (-0.5, mat('boiled', hexc('#B59A6A'))))):
        o += [LA([(0, 0), (0.28, 0), (0.3, 0.3), (0.12, 0.5), (0.12, 0.62), (0, 0.62)], sx, 0.16, 0, GLASS), C(0.13, 0.06, sx, 0.8, 0, RUBBER)] + [S(0.05, sx + 0.12 * math.cos(k * 1.1), 0.22 + 0.04 * (k % 3), 0.12 * math.sin(k * 1.1), m) for k in range(12)]
        o += [TB([(sx, 0.82, 0), (sx, 1.1, 0), (sx + 0.3, 1.2, 0.3), (1.0 + i * 0.5, 1.0, 0.3), (1.0 + i * 0.5, 0.3, 0.3)], 0.015, GLASS)] + ttube(1.0 + i * 0.5, 0.05, 0.3, liq('lime%d' % i, '#F4F4F0' if i == 0 else '#CFE3F0', 0.8 if i == 0 else 0.4), 0.6)
    o += [B(0.9, 0.06, 0.4, 1.25, 0.03, 0.3, WOOD, 0.01), B(0.7, 0.4, 0.3, 2.3, 0.2, -0.3, CASE, 0.02), B(0.4, 0.14, 0.012, 2.3, 0.24, -0.149, DARK, 0), TX('CO2', 0.08, 2.3, 0.24, -0.14, LED)]
    part('Set_SEED_RESPIRATION', o)

    # CIRCULATION: cánh tay mô hình trên gối, vòng bít, máy đo huyết áp, đồng hồ bấm giây
    o = [B(1.8, 0.14, 0.7, -0.9, 0.07, 0, BLUE, 0.05), C(0.16, 1.7, -0.9, 0.3, 0, SKIN, 'x', r2=0.12, seg=24), S(0.17, 0.05, 0.3, 0, SKIN), C(0.19, 0.5, -1.3, 0.3, 0, INK, 'x', seg=24)]
    o += [TB([(-1.3, 0.3, 0.19), (-0.8, 0.1, 0.7), (0.8, 0.1, 0.7), (1.4, 0.2, 0.2)], 0.02, RUBBER), B(0.9, 0.5, 0.6, 1.7, 0.25, 0, WHITE, 0.04), B(0.6, 0.3, 0.012, 1.7, 0.3, 0.301, DARK, 0), TX('118/76', 0.1, 1.7, 0.34, 0.31, LED), TX('72', 0.08, 1.7, 0.22, 0.31, LED)] + stopwatch(0.6, 0.75)
    part('Set_CIRCULATION', o)

    # TROPISM: hộp có khe sáng với cây mầm bên trong, clinostat, khay mùn cưa ẩm, thước đo góc, đèn
    o = [B(1.0, 0.03, 0.8, -1.9, 0.015, 0, INK, 0), B(1.0, 0.9, 0.03, -1.9, 0.45, -0.4, INK, 0), B(0.03, 0.9, 0.8, -2.4, 0.45, 0, INK, 0), B(1.0, 0.03, 0.8, -1.9, 0.9, 0, INK, 0), B(0.03, 0.35, 0.8, -1.4, 0.2, 0, INK, 0), B(0.03, 0.35, 0.8, -1.4, 0.72, 0, INK, 0)]
    o += [TB([(-2.1 + i * 0.25, 0.05, 0), (-2.1 + i * 0.25, 0.35, 0), (-1.95 + i * 0.25, 0.6, 0)], 0.012, LEAF2) for i in range(3)] + lamp(-0.5, -0.4, 0.9, -1)
    o += [B(0.5, 0.4, 0.4, 0.7, 0.2, -0.3, CASE, 0.02), C(0.03, 0.2, 0.7, 0.4, -0.05, CHROME, 'z'), C(0.35, 0.04, 0.7, 0.4, 0.08, WOOD, 'z', seg=28)] + [TB([(0.7 + 0.2 * math.cos(a), 0.4 + 0.2 * math.sin(a), 0.1), (0.7 + 0.2 * math.cos(a), 0.4 + 0.2 * math.sin(a), 0.3)], 0.012, LEAF2, False) for a in (0, 2.1, 4.2)]
    o += [B(1.0, 0.1, 0.6, 2.2, 0.05, 0.3, mat('tray', hexc('#7A5C3A'), rough=0.95), 0.02)] + [TB([(1.9 + i * 0.2, 0.1, 0.3), (1.9 + i * 0.2, 0.3, 0.3)], 0.01, LEAF2, False) for i in range(4)] + [C(0.3, 0.008, 0.9, 0.006, 0.8, mat('prot2', hexc('#E3B341'), rough=0.3, alpha=0.6), seg=32)]
    part('Set_TROPISM', o)

    # APICAL_DOMINANCE: hai chậu cây (để nguyên ngọn / đã bấm ngọn mọc cành bên), kéo, thước
    o = plant(-1.3, 0, 1.3, 6, r=0.26) + plant(0.7, 0, 0.7, 4, r=0.26)
    o += [TB([(0.7, 0.8, 0), (0.7 + sx * 0.3, 1.0, 0.05), (0.7 + sx * 0.45, 1.25, 0.05)], 0.014, LEAF2) for sx in (-1, 1)] + [B(0.24, 0.012, 0.12, 0.7 + sx * 0.5, 1.28, 0.05, LEAF, 0.004, ry=0.5 * sx) for sx in (-1, 1)] + [B(0.2, 0.012, 0.1, 0.7 + sx * 0.3, 1.05, 0.12, LEAF, 0.004) for sx in (-1, 1)]
    o += ruler(-0.2, 1.4, -0.3, vertical=True, at=0.0) + [B(0.3, 0.04, 0.3, -0.2, 0.02, -0.3, IRON, 0.01), B(0.5, 0.012, 0.04, 1.9, 0.01, 0.55, CHROME, 0.002, ry=0.2), B(0.5, 0.012, 0.04, 1.9, 0.016, 0.55, CHROME, 0.002, ry=-0.2), LA([(0.05, 0), (0.07, 0), (0.07, 0.012), (0.05, 0.012)], 2.2, 0, 0.47, ORANGE), LA([(0.05, 0), (0.07, 0), (0.07, 0.012), (0.05, 0.012)], 2.2, 0, 0.63, ORANGE)]
    part('Set_APICAL_DOMINANCE', o)

    # TREE_AGE: lát cắt thân cây có vòng gỗ (lớn nhỏ theo đường kính), kính lúp, thước
    def slice_(x, z, r):
        q = [C(r, 0.12, x, 0.06, z, mat('bark', hexc('#4A3220'), rough=0.9), seg=36), C(r * 0.94, 0.006, x, 0.123, z, mat('sap', hexc('#E3C28F'), rough=0.7), seg=36)]
        return q + [LA([(r * k, 0), (r * k + 0.008, 0), (r * k + 0.008, 0.004), (r * k, 0.004)], x, 0.124, z, mat('ringw', hexc('#8A5A2E'), rough=0.8)) for k in (0.15, 0.3, 0.42, 0.55, 0.66, 0.76, 0.85)]
    o = slice_(1.6, 0.2, 0.35) + slice_(2.3, -0.4, 0.25) + magnifier(-1.6, 0.5) + ruler(-0.9, 0.9, 0.85)
    part('Set_TREE_AGE', o)
    part('Mov_TREE_AGE_1', slice_(0, 0, 0.5), pivot=(0, 0, 0))

    # METAMORPHOSIS: bể nuôi nòng nọc, hộp nuôi sâu, kính lúp, thước
    o = tank(-1.4, 0, 1.6, 0.6, 0.8, 0.6, WATER) + [B(1.5, 0.04, 0.7, -1.4, 0.05, 0, SAND, 0)]
    for i, (dx, dz) in enumerate(((-0.5, 0.1), (-0.1, -0.2), (0.3, 0.15))):
        o += [S(0.05 + 0.01 * i, -1.4 + dx, 0.2, dz, INK), TB([(-1.4 + dx, 0.2, dz), (-1.4 + dx - 0.12, 0.2, dz + 0.03), (-1.4 + dx - 0.22, 0.2, dz)], 0.012, INK)]
    o += [S(0.09, -0.85, 0.42, 0.2, GREENM), S(0.04, -0.8, 0.5, 0.24, GREENM), B(0.3, 0.03, 0.3, -0.85, 0.34, 0.2, mat('rock', hexc('#7A7468'), rough=0.9), 0.02)]
    o += [B(1.0, 0.03, 0.7, 0.7, 0.015, 0, WOOD, 0.01)] + [C(0.012, 0.7, 0.7 + dx, 0.38, dz, WOOD, seg=6) for dx in (-0.48, 0.48) for dz in (-0.33, 0.33)] + [B(1.0, 0.7, 0.008, 0.7, 0.38, sz * 0.34, mat('mesh', (0.9, 0.9, 0.9), alpha=0.18), 0) for sz in (-1, 1)] + [B(1.0, 0.03, 0.7, 0.7, 0.74, 0, WOOD, 0.01)]
    o += [TB([(0.4, 0.03, 0), (0.45, 0.4, 0.05), (0.6, 0.55, 0)], 0.015, mat('twig', hexc('#5A3A1E'))), B(0.3, 0.012, 0.16, 0.7, 0.55, 0, LEAF, 0.004), TB([(0.6, 0.57, 0), (0.7, 0.6, 0), (0.8, 0.57, 0)], 0.025, LEAF2), LA([(0, 0), (0.04, 0.03), (0.045, 0.12), (0, 0.2)], 0.95, 0.3, 0.1, mat('pupa', hexc('#8A9A3A')))]
    o += magnifier(2.0, 0.5) + ruler(1.5, 2.7, -0.4)
    part('Set_METAMORPHOSIS', o)

    # PROPAGATION: chậu giâm cành, cành chiết bọc bầu, dao ghép, dây buộc, auxin, bút lông, hoa bao túi
    o = []
    for i in range(3):
        o += plant(-2.3 + i * 0.5, 0.3, 0.35, 2, r=0.16)
    o += [TB([(-0.9, 0.05, -0.2), (-0.6, 0.6, -0.2), (-0.2, 1.1, -0.2)], 0.03, mat('branch', hexc('#6B4A2A'), rough=0.9)), S(0.14, -0.6, 0.6, -0.2, mat('wrap', hexc('#2A2E33'), rough=0.6)), B(0.3, 0.012, 0.15, -0.1, 1.15, -0.2, LEAF, 0.004), C(0.3, 0.3, -0.9, 0.15, -0.2, TERRA, r2=0.36, seg=24)]
    o += [B(0.5, 0.02, 0.05, 0.5, 0.01, 0.6, CHROME, 0.002), B(0.3, 0.04, 0.06, 0.1, 0.02, 0.6, WOOD, 0.01), LA([(0.06, 0), (0.12, 0), (0.12, 0.06), (0.06, 0.06)], 0.7, 0, 0.2, WHITE)] + bottle(1.2, -0.3, L_YELLOW, YELLOW, 0.09, 0.26) + [C(0.012, 0.5, 1.1, 0.015, 0.6, WOOD, 'x', seg=6), C(0.02, 0.08, 1.38, 0.015, 0.6, INK, 'x', r2=0.004, seg=8)]
    o += plant(2.2, 0, 0.9, 5, r=0.22) + [S(0.1, 2.2, 1.35, 0, PINK), LA([(0.14, 0), (0.17, 0.15), (0.12, 0.34), (0.11, 0.34), (0.16, 0.15), (0.13, 0)], 2.2, 1.18, 0, mat('bag2', (0.97, 0.97, 0.95), rough=0.4, alpha=0.4))]
    part('Set_PROPAGATION', o)

    # DNA_EXTRACT: cối chày, cốc dịch nghiền, phễu lọc trên giá, cồn lạnh trong xô đá, ống có sợi DNA + que thủy tinh, muối, nước rửa chén
    o = mortar(-2.2, 0.2, mat('liver', hexc('#7A3A2A'), rough=0.5)) + beaker(-1.4, -0.3, 0.2, 0.36, 0.5, liq('mash', '#9A5A3A', 0.9)) + stand(-0.9, -0.3, 1.0, 0.45) + [LA([(0.02, 0), (0.03, 0), (0.03, 0.2), (0.22, 0.42), (0.21, 0.42), (0.02, 0.2)], -0.45, 0.62, -0.3, GLASS), LA([(0.02, 0), (0.19, 0.2), (0.185, 0.2), (0.02, 0.01)], -0.45, 0.83, -0.3, PAPER)]
    o += beaker(-0.45, -0.3, 0.2, 0.36, 0.3, liq('filt', '#C9A07A', 0.6)) + [LA([(0, 0), (0.3, 0), (0.36, 0.4), (0.34, 0.4), (0.28, 0.03), (0, 0.03)], 0.7, 0, 0.2, BLUE)] + [B(0.09, 0.09, 0.09, 0.55 + (i % 3) * 0.14, 0.3, 0.1 + (i // 3) * 0.16, mat('icd%d' % i, (0.85, 0.94, 1.0), rough=0.1, alpha=0.6), 0.015) for i in range(6)] + bottle(0.7, 0.2, WATER, BLUE, 0.1, 0.5)
    o += rack(1.9, 0, [liq('dnaliq', '#D9C7A8', 0.5), None]) + [TB([(1.79, 0.38, 0), (1.77, 0.46, 0.01), (1.81, 0.52, -0.01), (1.79, 0.58, 0)], 0.01, WHITE), C(0.008, 0.6, 1.79, 0.6, 0, GLASS, seg=6)] + [C(0.08, 0.2, 2.6, 0.1, 0.5, WHITE), C(0.085, 0.03, 2.6, 0.21, 0.5, BLUE)] + bottle(2.6, -0.3, L_GREEN, WHITE, 0.11, 0.4)
    part('Set_DNA_EXTRACT', o)

    # CHROMOSOME_MUTATION: kính hiển vi, khay 4 tiêu bản, màn hình hiển thị bộ nhiễm sắc thể
    o = microscope(-1.6, 0) + stage(-1.6, 0) + [B(1.1, 0.04, 0.5, -0.2, 0.02, 0.5, WOOD, 0.01)] + [q for i in range(4) for q in slide(-0.2, 0.33 + i * 0.11, [L_VIOLET, L_RED, L_BLUE, PURPLE][i])]
    o += [B(1.5, 1.0, 0.06, 1.6, 0.75, -0.3, BAKELITE, 0.02), B(1.36, 0.86, 0.01, 1.6, 0.75, -0.268, mat('scr2', hexc('#F4EEDD'), rough=0.4), 0), B(0.3, 0.2, 0.3, 1.6, 0.1, -0.3, BAKELITE, 0.02), B(0.6, 0.04, 0.4, 1.6, 0.02, -0.3, BAKELITE, 0.02)]
    rng = np.random.default_rng(3)
    o += [B(0.035, 0.1 + rng.random() * 0.08, 0.008, 1.1 + (i % 8) * 0.14, 0.95 - (i // 8) * 0.22, -0.26, PURPLE, 0.006, rz=(rng.random() - 0.5) * 1.2) for i in range(24)]
    o += [wire((-1.6, 1.38, 0.08), (1.6, 0.1, -0.2), INK, 0.6)]
    part('Set_CHROMOSOME_MUTATION', o)

    # MODIFICATION: hai hàng chậu (giống A, giống B) cao dần theo lượng đạm, bao phân, cân
    o = []
    for row, (z, lf) in enumerate(((-0.35, LEAF), (0.45, LEAF2))):
        for i in range(4):
            o += plant(-2.3 + i * 0.6, z, 0.3 + i * (0.22 if row == 0 else 0.1), 3 + i, r=0.17, leaf=lf)
    o += [TX('A', 0.2, -2.75, 0.2, -0.35, WHITE), TX('B', 0.2, -2.75, 0.2, 0.45, WHITE), LA([(0, 0), (0.3, 0), (0.34, 0.25), (0.3, 0.6), (0.12, 0.72), (0, 0.72)], 0.9, 0, -0.2, WHITE), TX('N', 0.25, 0.9, 0.35, 0.14, BLUE)] + digital(2.2, 0.1, '48.6 g', 0.9, True) + [C(0.03, 0.2, 2.1, 0.03, 0.75, CHROME, 'x', r2=0.05, seg=8)]
    part('Set_MODIFICATION', o)

    # QUADRAT: thảm cỏ, khung ô 1 m × 1 m, cọc, thước dây, phiếu ghi
    o = patch(-0.6, 0, 3.4, 1.9, 5, 2) + quadrat(-0.8, 0, 1.2) + [C(0.02, 0.4, -0.8 + sx * 1.5, 0.2, sz * 0.85, ORANGE, seg=8) for sx in (-1, 1) for sz in (-1, 1)]
    o += clipboard(2.2, 0.3, -0.2) + [C(0.16, 0.08, 2.1, 0.04, -0.6, YELLOW, seg=24), B(0.5, 0.004, 0.06, 2.45, 0.02, -0.6, WHITE, 0)]
    part('Set_QUADRAT', o)

    # COMMUNITY: thảm thực vật nhiều loài, khung ô, khóa định loại, phiếu ghi
    o = patch(-0.6, 0, 3.6, 1.9, 9, 5) + quadrat(-0.6, 0, 1.4) + [C(0.03, 0.5, -1.9, 0.3, -0.6, mat('trunk', hexc('#5A3A1E'), rough=0.9), seg=8), S(0.28, -1.9, 0.7, -0.6, LEAF), C(0.03, 0.4, 0.9, 0.25, 0.6, mat('trunk2', hexc('#5A3A1E'), rough=0.9), seg=8), S(0.22, 0.9, 0.55, 0.6, LEAF2)]
    o += clipboard(2.3, 0.4, -0.2) + [B(0.5, 0.05, 0.7, 2.2, 0.025, -0.5, GREENM, 0.01), B(0.46, 0.006, 0.66, 2.2, 0.052, -0.5, PAPER, 0)]
    part('Set_COMMUNITY', o)

    # MINI_ECOSYSTEM: bể kính có cát, cây thủy sinh (động theo số cây), cá, ốc, đèn, máy đo oxygen hòa tan
    o = tank(-0.5, 0, 2.4, 0.9, 1.0, 0.8, WATER) + [B(2.3, 0.08, 0.9, -0.5, 0.07, 0, SAND, 0)] + fish(-1.0, 0.45, 0.1, ORANGE) + fish(-0.3, 0.55, -0.15, RED, 0.8) + fish(0.2, 0.35, 0.2, YELLOW, 0.7)
    for q in o[-6:]:
        q.rotation_euler = (0, R90, 0)
    o += [S(0.06, 0.4, 0.15, 0.3, mat('snail', hexc('#7A5C3A'))), C(0.02, 1.0, -0.5, 1.2, -0.55, CHROME, 'x'), B(1.6, 0.06, 0.2, -0.5, 1.15, -0.2, BAKELITE, 0.02), B(1.5, 0.01, 0.16, -0.5, 1.115, -0.2, mat('glow', hexc('#FFF3C4'), emit=2.0), 0)] + [C(0.015, 0.25, -0.5 + sx * 0.75, 1.03, -0.5, CHROME) for sx in (-1, 1)]
    o += [B(0.5, 0.26, 0.2, 1.7, 0.13, 0.4, CASE, 0.02), B(0.3, 0.12, 0.012, 1.7, 0.15, 0.501, DARK, 0), TX('6.8', 0.08, 1.7, 0.15, 0.51, LED), TB([(1.5, 0.2, 0.4), (1.2, 1.0, 0.3), (0.5, 1.0, 0.2), (0.45, 0.5, 0.2)], 0.012, INK), C(0.03, 0.2, 0.45, 0.45, 0.2, STEEL)]
    part('Set_MINI_ECOSYSTEM', o)
    weeds = []
    for i, (dx, dz) in enumerate(((-1.3, -0.2), (-0.8, 0.25), (-0.2, -0.3), (0.3, 0.1), (-1.1, 0.3))):
        weeds += [TB([(-0.5 + dx, 0.1, dz), (-0.5 + dx + 0.05 * math.sin(i + k), 0.25 + k * 0.12, dz + 0.03 * math.cos(i + k)), (-0.5 + dx, 0.45 + k * 0.1, dz)], 0.014, LEAF if i % 2 else LEAF2) for k in range(3)]
    part('Mov_MINI_ECOSYSTEM_1', weeds, pivot=(-0.5, 0.1, 0))


(phys if WHICH == 'phys' else bio)()
export_glb('bench-%s.glb' % WHICH)

# ------------------------------------------------------------------ ảnh xem thử: xếp các bộ thành lưới 3 × 2, mỗi tờ 6 bài
if PREVIEW:
    sets = sorted([o for o in bpy.data.objects if o.name.startswith('Set_')], key=lambda o: o.name)
    movs = [o for o in bpy.data.objects if o.name.startswith('Mov_')]
    sc = bpy.context.scene
    box('Table', (60, 60, 0.12), T(0, -0.07, 0), mat('table', hexc('#1C1F4A'), rough=0.8), bevel=0)
    cam = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam'))
    sc.collection.objects.link(cam)
    look = empty('Look', T(0, 0.6, 0))
    cam.location = T(0, 13, 14)
    cam.constraints.new('TRACK_TO').target = look
    cam.data.lens = 31
    sc.camera = cam
    for loc, e, size in ((T(-6, 10, 8), 3000, 8), (T(8, 8, 6), 1800, 6), (T(0, 6, -9), 900, 8)):
        l = bpy.data.objects.new('L', bpy.data.lights.new('L', 'AREA'))
        l.data.energy = e
        l.data.size = size
        l.location = loc
        sc.collection.objects.link(l)
        l.constraints.new('TRACK_TO').target = look
    w = bpy.data.worlds.new('W')
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs[0].default_value = (*hexc('#0E1030'), 1)
    sc.world = w
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 24
    sc.cycles.use_denoising = True
    sc.render.resolution_x = 1600
    sc.render.resolution_y = 1000
    for sheet in range(0, len(sets), 6):
        chosen = sets[sheet:sheet + 6]
        for o in sets + movs:
            o.hide_render = True
        for i, o in enumerate(chosen):
            off = ((i % 3 - 1) * 6.6, 0, (i // 3) * 4.6 - 2.3)
            sid = o.name[4:]
            for q in [o] + [m for m in movs if m.name.startswith('Mov_' + sid + '_')]:
                q.hide_render = False
                base = q.get('base')
                if base is None:
                    q['base'] = list(q.location)
                    base = q['base']
                d = T(*off)
                q.location = (base[0] + d[0], base[1] + d[1], base[2] + d[2])
        sc.render.filepath = os.path.join(PREVIEW, '%s-%d.png' % (WHICH, sheet // 6))
        bpy.ops.render.render(write_still=True)
        print('PREVIEW', sc.render.filepath, [o.name for o in chosen])
