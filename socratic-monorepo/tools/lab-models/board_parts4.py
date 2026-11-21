"""
Sinh học cho bảng #4: bốn sơ đồ cơ quan (tiêu hóa, hô hấp, tai, nephron) mỗi bộ phận một lưới mang đúng tên `dig_*`, `res_*`, `ear_*`, `neph_*`
(= id bộ phận của preset ANATOMY_FLOW), cùng sinh vật và thiết bị: chậu cây + đèn + lá, hình người (phả hệ), cỏ/châu chấu/ếch/rắn/đại bàng (chuỗi thức ăn),
lưới bắt cá thể, sân thả, bọ cánh cứng, máy quang phổ. Toạ độ three.js (x phải, y lên, z về phía người xem); gốc ghi ở từng mục.
Đường đi (thức ăn, không khí, sóng âm, dịch lọc) của các cơ quan được cảnh `Scenes3DBlender4.tsx` lặp lại theo `FLOW_*` trong file đó: đổi hình ở đây phải đổi ở đó.
Vật liệu mang tên để cảnh tô màu: `body` (hình người), `shell` (bọ), `bulb` (bóng đèn), `skinleaf`.

Chạy:
  blender --background --python tools/lab-models/board_parts4.py -- apps/teacher-board/public/models [ảnh xem thử.png dig|res|ear|neph|bio]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F401,F403

SHOW = argv[2] if len(argv) > 2 else 'dig'
ZAXIS = (math.radians(90), 0, 0)
XAXIS = (0, math.radians(90), 0)
FRONT = ZAXIS


def B(name, sx, sy, sz, loc, m, bevel=0.01, rot=(0, 0, 0)):
    return box(name, (sx, sz, sy), T(*loc), m, bevel=bevel, rot=rot)


def make(name, objs, group, at=(0, 0, 0)):
    o = join(name, objs)
    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    o.location = T(*(at if group == SHOW else (0, 500, 0)))
    return o


def ell(name, c, s, m):
    """ellipsoid bán trục s = (sx, sy, sz) theo three.js tâm c"""
    o = ball(name, 1.0, T(*c), m)
    o.scale = (s[0], s[2], s[1])
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(scale=True)
    return o


def P(*pts):
    return [T(*p) for p in pts]


from organs import flesh_from, organify  # noqa: E402
from organic import blob, mottled, veined  # noqa: E402


from organs import zanat  # noqa: E402
ZA = {**{'res_' + k: v for k, v in zanat('ZR_').items()}, **{'dig_' + k: v for k, v in zanat('ZD_').items()}, **{'ear_' + k: v for k, v in zanat('ZT_').items()},
      **{'eye_' + k: v for k, v in zanat('ZE_').items()}}


def organ(prefix, name, objs, group, fn=None, rel=0.008):
    """mỗi bộ phận cơ thể người → khối liền ướt (Voxel Remesh + Displace + màu loang + Clearcoat/Subsurface);
    bộ phận trong suốt (màng nhĩ, bao Bowman, phổi trong mờ) giữ nguyên để thấy bên trong"""
    real = ZA.get(prefix + name)
    if real is not None:
        # cơ quan giải phẫu thật (Z-Anatomy, CC BY-SA 4.0) đã xử lý sẵn: bỏ hình tự dựng
        for o in objs:
            bpy.data.objects.remove(o, do_unlink=True) if hasattr(o, 'name') and o.name in bpy.data.objects else None
        if name in ('lungs',):
            from organs import ghost
            ghost(real, 0.62)
        return make(prefix + name, [real], group)
    clear = any(m and m.blend_method == 'BLEND' for o in objs if hasattr(o.data, 'materials') for m in o.data.materials)
    if group in ('dig', 'res', 'ear', 'neph') and not clear and not name.endswith('_done'):
        objs = [organify(prefix + name + '_w', objs, fn or flesh_from(objs), rel=rel)]
    return make(prefix + name, objs, group)


FLESH = mat('flesh', hexc('#E58B84'), rough=0.5)
PINK = mat('pink', hexc('#E9A8A0'), rough=0.5)
SALMON = mat('salmon', hexc('#E8827A'), rough=0.45)
LIVER = mat('liver', hexc('#8C3B2A'), rough=0.5)
GALL = mat('gall', hexc('#5E8F3E'), rough=0.45)
YEL = mat('yel', hexc('#E8C06A'), rough=0.5)
COLON = mat('colon', hexc('#B97A5C'), rough=0.5)
SKIN = mat('skin', hexc('#E8B49A'), rough=0.55)
IVORY = mat('ivory', hexc('#EFE6D2'), rough=0.4)
LUNG = mat('lung', hexc('#F0A5B8'), rough=0.5, alpha=0.5)
ALV = mat('alv', hexc('#D85C6E'), rough=0.4)
DIAPH = mat('diaph', hexc('#C76B5A'), rough=0.55)
TRACH = mat('trach', hexc('#D9C7BE'), rough=0.45)
DRUM = mat('drum', hexc('#E7D9C0'), rough=0.4, alpha=0.85)
NERVE = mat('nerve', hexc('#E8C06A'), rough=0.4)
CANALS = mat('canals', hexc('#C79BDB'), rough=0.4)
ARTERY = mat('artery', hexc('#D94A3A'), rough=0.4)
VEIN = mat('vein', hexc('#3D6FE0'), rough=0.4)
CAP = mat('capsule', hexc('#F0E3A8'), rough=0.3, alpha=0.5)
TUBU = mat('tubu', hexc('#E8C06A'), rough=0.45)
COLL = mat('coll', hexc('#E8B27A'), rough=0.45)
PELV = mat('pelv', hexc('#F0D9A8'), rough=0.5)

# ================================================================== tiêu hóa (nhìn thẳng; miệng ở y = 6,6, hậu môn ở y = 0,2)
organ('dig_', 'mouth', [ell('m', (0, 6.6, 0.3), (0.55, 0.32, 0.4), FLESH), ell('t', (0, 6.55, 0.38), (0.35, 0.12, 0.3), SALMON)], 'dig')
organ('dig_', 'esophagus', [tube('e', P((0, 6.3, 0.2), (0, 5.4, 0), (0.0, 4.6, 0.05)), 0.14, PINK)], 'dig')
organ('dig_', 'stomach', [blob('s', [('C', (0.0, 4.55, 0.1), (0.45, 4.45, 0.1), 0.32), ('C', (0.45, 4.45, 0.1), (0.85, 3.95, 0.1), 0.55), ('C', (0.85, 3.95, 0.1), (0.6, 3.4, 0.1), 0.48), ('C', (0.6, 3.4, 0.1), (0.1, 3.35, 0.1), 0.3)], SALMON, res=0.04)], 'dig', veined('#D98478', '#9A3442', 4, 0.04))
organ('dig_', 'liver', [blob('l', [('E', (-1.1, 4.15, 0.1), (0.95, 0.62, 0.6)), ('E', (-0.4, 4.35, 0.12), (0.7, 0.42, 0.45)), ('E', (0.2, 4.45, 0.12), (0.45, 0.22, 0.3))], LIVER, res=0.04)], 'dig', mottled('#6E2A1E', 0.14, 3, '#4A1A12', 9, 0.05))
organ('dig_', 'gallbladder', [blob('g', [('E', (-0.55, 3.45, 0.5), (0.2, 0.26, 0.2)), ('C', (-0.55, 3.6, 0.5), (-0.5, 3.85, 0.45), 0.09)], GALL, res=0.02)], 'dig', mottled('#4F8A3A', 0.12, 5))
organ('dig_', 'pancreas', [blob('p', [('E', (-0.6 + i * 0.2, 3.1 + 0.03 * math.sin(i * 2.1), -0.1), (0.14 - 0.008 * i, 0.15 - 0.007 * i, 0.15)) for i in range(10)], YEL, res=0.025)], 'dig', mottled('#E2B07A', 0.12, 9, '#C98A5A', 22, 0.08))
SMALL = [(0.6, 3.0, 0.1), (0.65, 2.7, 0.1), (-0.6, 2.5, 0.1), (0.6, 2.2, 0.1), (-0.6, 1.9, 0.1), (0.6, 1.6, 0.1), (-0.5, 1.3, 0.1)]
organ('dig_', 'small', [tube('si', P(*SMALL), 0.13, PINK)], 'dig', veined('#E4A090', '#A84452', 6, 0.04))
LARGE = [(-1.15, 1.2, 0), (-1.15, 3.0, 0), (1.15, 3.0, 0), (1.15, 1.0, 0), (0.7, 0.55, 0), (0.0, 0.45, 0)]
_li = []
for _a, _b in zip(LARGE, LARGE[1:]):
    _n = max(2, int(math.dist(_a, _b) / 0.26))
    for _i in range(_n):
        _t = _i / _n
        _li.append(('E', tuple(_a[j] + (_b[j] - _a[j]) * _t for j in range(3)), (0.25, 0.25, 0.25)))
organ('dig_', 'large', [blob('li', _li, COLON, res=0.03)], 'dig', veined('#C08468', '#8E4A3A', 5, 0.04))
organ('dig_', 'anus', [lathe('a', [(0.1, 0.0), (0.26, 0.0), (0.3, 0.1), (0.26, 0.2), (0.1, 0.2)], T(0, 0.0, 0), FLESH, rot=(math.radians(90), 0, 0))], 'dig')

# ================================================================== hô hấp (mũi ở y = 6,5, cơ hoành ở y = 0,9)
organ('res_', 'nose', [ell('n', (0, 6.5, 0.4), (0.35, 0.5, 0.35), SKIN), ell('l', (-0.2, 6.2, 0.6), (0.14, 0.1, 0.1), FLESH), ell('r', (0.2, 6.2, 0.6), (0.14, 0.1, 0.1), FLESH)], 'res')
organ('res_', 'trachea', [tube('t', P((0, 6.0, 0.2), (0, 5.2, 0.1), (0, 4.3, 0)), 0.22, TRACH)] + [cyl('ring', 0.26, 0.05, T(0, 5.9 - i * 0.28, 0.1 if i < 3 else 0.05), IVORY, bevel=0) for i in range(6)], 'res')
BRL = [(0, 4.3, 0), (-0.7, 3.7, 0), (-1.3, 3.1, 0), (-1.55, 2.4, 0)]
BRR = [(0, 4.3, 0), (0.7, 3.7, 0), (1.3, 3.1, 0), (1.55, 2.4, 0)]
organ('res_', 'bronchi', [tube('bl', P(*BRL), 0.14, TRACH), tube('br', P(*BRR), 0.14, TRACH)] + [tube('bs', P((sx * 0.7, 3.7, 0), (sx * 1.2, 3.9, 0), (sx * 1.7, 3.8, 0)), 0.07, TRACH) for sx in (-1, 1)] + [tube('bs2', P((sx * 1.3, 3.1, 0), (sx * 1.8, 3.0, 0.1), (sx * 2.0, 2.6, 0)), 0.07, TRACH) for sx in (-1, 1)], 'res')
# phổi thật (organs.py): thùy, rãnh liên thùy, lưới tiểu thùy; trong mờ để thấy phế quản và dòng khí bên trong
from organs import ghost, lungs as real_lungs  # noqa: E402
organ('res_', 'lungs', [ghost(o, 0.62) for o in real_lungs(at=(0, 1.15, 0), s=3.5, gap=0.16, rings=False)], 'res')
alv = []
import random
rnd = random.Random(3)
for sx in (-1, 1):
    for i in range(14):
        alv.append(ball('al', 0.1 + rnd.random() * 0.04, T(sx * (1.5 + rnd.random() * 0.5), 1.75 + rnd.random() * 0.45, (rnd.random() - 0.5) * 0.5), ALV))
organ('res_', 'alveoli', alv, 'res')
organ('res_', 'diaphragm', [ell('d', (0, 0.9, 0), (2.9, 0.5, 1.0), DIAPH)], 'res')

# ================================================================== tai (ngoài ở x = −4,2, trong ở x = +4; nhìn cắt dọc)
organ('ear_', 'pinna', [ell('p', (-4.2, 0, 0), (0.28, 1.1, 0.8), SKIN), tube('rim', P((-4.0, 1.0, 0.2), (-4.3, 0.5, 0.5), (-4.3, -0.5, 0.5), (-4.0, -1.0, 0.2)), 0.1, SKIN)], 'ear')
organ('ear_', 'canal', [tube('c', P((-3.9, 0, 0), (-2.7, 0, 0), (-1.6, 0, 0)), 0.3, SKIN)], 'ear')
organ('ear_', 'drum', [cyl('d', 0.55, 0.04, T(-1.5, 0, 0), DRUM, rot=XAXIS, bevel=0)], 'ear')
organ('ear_', 'ossicles', [ball('mal', 0.15, T(-1.1, 0.15, 0), IVORY), tube('mh', P((-1.35, 0.0, 0), (-1.1, 0.15, 0), (-0.9, 0.4, 0)), 0.045, IVORY), ball('inc', 0.17, T(-0.7, 0.4, 0), IVORY), tube('ih', P((-0.7, 0.4, 0), (-0.5, 0.2, 0), (-0.4, 0.0, 0)), 0.04, IVORY),
                           tube('st', P((-0.45, 0.05, 0), (-0.3, 0.25, 0), (-0.15, 0.05, 0), (-0.3, -0.12, 0), (-0.45, 0.05, 0)), 0.03, IVORY)], 'ear')
SPIRAL = [(1.6 + (0.85 - 0.28 * t / 22) * math.cos(t * 0.35), -0.5 + (0.85 - 0.28 * t / 22) * math.sin(t * 0.35), 0.0) for t in range(0, 41)]
organ('ear_', 'cochlea', [tube('co', P(*SPIRAL), 0.17, PINK)], 'ear')
organ('ear_', 'nerve', [tube('n', P((1.6, -0.5, 0), (2.6, 0.1, 0), (3.5, 0.5, 0), (4.3, 0.9, 0)), 0.12, NERVE)], 'ear')
organ('ear_', 'canals', [tube('c%d' % i, [T(1.0 + 0.5 * math.cos(a) * (1 if i != 1 else 0.2), 1.2 + 0.5 * math.sin(a), 0.5 * math.cos(a) * (0.2 if i != 1 else 1)) for a in [j * math.pi / 8 for j in range(-1, 14)]], 0.07, CANALS) for i in range(3)], 'ear')

# ================================================================== nephron (nang Bowman ở (−1,5, 4,6), ống góp bên phải, bể thận ở dưới)
organ('neph_', 'arteriole', [tube('a', P((-3.3, 5.5, 0), (-2.3, 5.4, 0), (-1.7, 5.1, 0)), 0.14, ARTERY), tube('e', P((-1.3, 5.1, 0), (-0.8, 5.5, 0), (-0.2, 5.5, 0)), 0.1, ARTERY)], 'neph')
organ('neph_', 'capsule', [ell('c', (-1.5, 4.6, 0), (0.85, 0.85, 0.85), CAP)], 'neph')
gl = [(-1.5 + 0.35 * math.cos(t * 0.9) * (1 - t / 40), 4.6 + 0.35 * math.sin(t * 1.3) * (1 - t / 40), 0.25 * math.sin(t * 0.7)) for t in range(0, 30)]
organ('neph_', 'glomerulus', [tube('g', P(*gl), 0.07, ARTERY), ball('gb', 0.28, T(-1.5, 4.6, 0), ARTERY)], 'neph')
TUB = [(-0.9, 4.1, 0), (-0.2, 3.9, 0), (0.4, 3.5, 0), (-0.2, 3.1, 0), (0.5, 2.7, 0), (-0.1, 2.3, 0), (0.3, 1.5, 0), (0.0, 0.9, 0), (0.7, 0.9, 0), (1.0, 2.0, 0), (1.4, 3.2, 0), (1.8, 3.8, 0), (2.3, 4.2, 0)]
organ('neph_', 'tubule', [tube('t', P(*TUB), 0.14, TUBU)], 'neph')
organ('neph_', 'capillary', [tube('cp', P(*[(x + 0.22, y + 0.12, 0.15) for x, y, _ in TUB[1:12]]), 0.06, VEIN)], 'neph')
COLLP = [(2.3, 5.6, 0), (2.3, 4.2, 0), (2.3, 1.2, 0), (1.9, 0.5, 0)]
organ('neph_', 'collecting', [tube('co', P(*COLLP), 0.2, COLL)], 'neph')
organ('neph_', 'pelvis', [ell('p', (1.4, 0.15, 0), (0.85, 0.45, 0.5), PELV), tube('u', P((1.2, -0.2, 0), (0.6, -0.7, 0), (0.2, -1.4, 0)), 0.13, PELV)], 'neph')

# ================================================================== mắt bổ đôi (giải phẫu thật Z-Anatomy, CC BY-SA 4.0): trục nhìn theo +x, giác mạc ở x ≈ −1,6, dây thần kinh thị giác về +x
for _id in ('cornea', 'iris', 'lens', 'vitreous', 'retina', 'fovea', 'nerve', 'sclera'):
    if 'eye_' + _id in ZA:
        organ('eye_', _id, [], 'eye')

# ================================================================== sinh vật và thiết bị
LEAFG = mat('leafg', hexc('#3E9B4F'), rough=0.5)
SOIL = mat('soil', hexc('#4B3320'), rough=0.9)
POT = mat('pot', hexc('#C4673A'), rough=0.7)
BULB = mat('bulb', hexc('#FFE9A8'), rough=0.2, emit=3.0)
BODY = mat('body', hexc('#F4EFE4'), rough=0.5)
SHELL = mat('shell', hexc('#7A4A21'), rough=0.35)
GRASS = mat('grass', hexc('#5FAE3E'), rough=0.6)
FROGM = mat('frog', hexc('#4C9A3A'), rough=0.5)
HOP = mat('hop', hexc('#8DBB3A'), rough=0.5)
SNAKE = mat('snake', hexc('#8A8F3A'), rough=0.45)
EAGLE = mat('eagle', hexc('#6B4A2A'), rough=0.55)
BEAK = mat('beak', hexc('#E3B341'), rough=0.4)
WHITEF = mat('whitef', hexc('#F4F2EC'), rough=0.6)
TRAY = mat('tray', hexc('#7FA35A'), rough=0.8)

make('PlantPot', [lathe('pot', [(0, -0.9), (0.55, -0.9), (0.8, 0.0), (0.88, 0.0), (0.88, 0.1), (0.78, 0.1), (0.78, -0.02), (0, -0.02)], T(0, 0, 0), POT), cyl('soil', 0.77, 0.06, T(0, 0.0, 0), SOIL, bevel=0)], 'bio')
make('Lamp', [lathe('shade', [(0.12, 0.35), (0.2, 0.3), (0.55, -0.1), (0.52, -0.14), (0.18, 0.22), (0.1, 0.28)], T(0, 0, 0), IRON, steps=32), ball('bulb', 0.17, T(0, 0.02, 0), BULB), cyl('neck', 0.05, 0.5, T(0, 0.55, 0), STEEL), B('arm', 0.9, 0.06, 0.06, (0.4, 0.8, 0), STEEL)], 'bio', (3, 3, 0))
make('Leaf', [ell('lf', (0.4, 0, 0), (0.42, 0.06, 0.2), LEAFG)], 'bio')
make('TipCap', [ball('tc', 0.1, T(0, 0, 0), LEAFG), cyl('c', 0.03, 0.16, T(0, 0.1, 0), mat('tip', hexc('#C4261A'), rough=0.4))], 'bio')
make('PersonM', [B('torso', 0.4, 0.7, 0.26, (0, 0.65, 0), BODY, bevel=0.06), ball('head', 0.19, T(0, 1.18, 0), BODY), B('legL', 0.14, 0.4, 0.14, (-0.1, 0.2, 0), BODY, bevel=0.03), B('legR', 0.14, 0.4, 0.14, (0.1, 0.2, 0), BODY, bevel=0.03)], 'bio')
make('PersonF', [cyl('dress', 0.28, 0.75, T(0, 0.45, 0), BODY, r2=0.12, bevel=0.01), ball('head', 0.19, T(0, 1.12, 0), BODY), cyl('legs', 0.1, 0.2, T(0, 0.1, 0), BODY, bevel=0)], 'bio')
make('Grass', [cyl('b%d' % i, 0.05, 0.9 + 0.2 * (i % 3), T(0.12 * math.cos(i * 1.3), 0.5 + 0.1 * (i % 3), 0.12 * math.sin(i * 1.3)), GRASS, r2=0.0, rot=(0.15 * math.sin(i), 0, 0.2 * math.cos(i)), bevel=0, seg=6) for i in range(9)], 'bio')
make('Grasshopper', [ell('b', (0, 0.35, 0), (0.45, 0.14, 0.15), HOP), ball('h', 0.14, T(0.5, 0.42, 0), HOP), tube('l1', P((-0.1, 0.35, 0.1), (-0.3, 0.6, 0.25), (-0.5, 0.05, 0.25)), 0.03, HOP, smooth=False), tube('l2', P((-0.1, 0.35, -0.1), (-0.3, 0.6, -0.25), (-0.5, 0.05, -0.25)), 0.03, HOP, smooth=False),
                      tube('an', P((0.55, 0.5, 0.05), (0.8, 0.8, 0.1)), 0.015, HOP, smooth=False)], 'bio')
make('Frog', [ell('b', (0, 0.35, 0), (0.45, 0.3, 0.32), FROGM), ell('h', (0.42, 0.45, 0), (0.25, 0.2, 0.27), FROGM), ball('e1', 0.08, T(0.5, 0.65, 0.14), WHITEF), ball('e2', 0.08, T(0.5, 0.65, -0.14), WHITEF), tube('l1', P((-0.25, 0.3, 0.2), (-0.5, 0.35, 0.4), (-0.3, 0.05, 0.45)), 0.07, FROGM, smooth=False), tube('l2', P((-0.25, 0.3, -0.2), (-0.5, 0.35, -0.4), (-0.3, 0.05, -0.45)), 0.07, FROGM, smooth=False)], 'bio')
make('Snake', [tube('s', P((-0.6, 0.12, 0.3), (-0.2, 0.12, 0.45), (0.3, 0.12, 0.2), (0.0, 0.12, -0.1), (-0.5, 0.12, -0.3), (0.0, 0.12, -0.5), (0.5, 0.12, -0.45)), 0.11, SNAKE), ell('h', (0.6, 0.15, -0.45), (0.2, 0.1, 0.12), SNAKE), ball('e', 0.03, T(0.7, 0.22, -0.4), INK)], 'bio')
make('Eagle', [ell('b', (0, 0.6, 0), (0.55, 0.3, 0.25), EAGLE), ell('w1', (0, 0.7, 0.55), (0.35, 0.05, 0.6), EAGLE), ell('w2', (0, 0.7, -0.55), (0.35, 0.05, 0.6), EAGLE), ball('h', 0.2, T(0.6, 0.78, 0), WHITEF), cyl('beak', 0.06, 0.25, T(0.85, 0.74, 0), BEAK, r2=0.0, rot=XAXIS, bevel=0), ell('tail', (-0.65, 0.55, 0), (0.25, 0.05, 0.2), WHITEF)], 'bio')
make('Net', [lathe('ring', [(0.85, -0.04), (0.92, -0.04), (0.92, 0.04), (0.85, 0.04)], T(0, 0, 0), STEEL, steps=40), tube('h', P((0.9, 0, 0), (2.2, 0.5, 0), (3.0, 0.9, 0)), 0.04, WOOD, smooth=False)] + [tube('m%d' % i, P((-0.8 + i * 0.4, 0.0, -0.8), (-0.8 + i * 0.4, 0.0, 0.8)), 0.01, INK, smooth=False) for i in range(5)], 'bio')
make('Arena', [B('tray', 7.0, 0.1, 5.0, (0, -0.05, 0), TRAY, bevel=0.02)] + [B('rim', 7.2, 0.25, 0.1, (0, 0.05, sz * 2.55), IRON, bevel=0.02) for sz in (-1, 1)] + [B('rim2', 0.1, 0.25, 5.0, (sx * 3.55, 0.05, 0), IRON, bevel=0.02) for sx in (-1, 1)], 'bio')
make('Beetle', [ell('b', (0, 0.1, 0), (0.18, 0.1, 0.12), SHELL), ball('h', 0.07, T(0.2, 0.1, 0), INK), tube('l1', P((0, 0.05, 0.1), (0.05, 0.0, 0.2)), 0.012, INK, smooth=False), tube('l2', P((0, 0.05, -0.1), (0.05, 0.0, -0.2)), 0.012, INK, smooth=False)], 'bio')
make('Spectrometer', [B('case', 2.6, 0.9, 1.6, (0, 0.45, 0), CASE, bevel=0.05), B('lid', 1.2, 0.1, 0.9, (-0.4, 0.95, 0), IRON, bevel=0.02), B('screen', 1.0, 0.45, 0.02, (0.7, 0.6, 0.82), INK, bevel=0), text('hz', 'IR / MS', 0.14, T(0.7, 0.6, 0.835), LED, rot=FRONT, depth=0.003),
                       lathe('knob', [(0, 0.07), (0.06, 0.07), (0.08, 0.05), (0.08, 0.0), (0, 0.0)], T(-0.8, 0.25, 0.82), BAKELITE, rot=ZAXIS)], 'bio')

export_glb('board-parts4.glb')
CAM = {'dig': ((0, 3.5, 13), (0, 3.4, 0)), 'res': ((0, 3.5, 13), (0, 3.4, 0)), 'ear': ((0, 1, 12), (0, 0, 0)), 'neph': ((0, 3, 12), (0, 2.8, 0)), 'bio': ((0, 2.2, 8), (0, 0.6, 0))}[SHOW]
preview(CAM[0], CAM[1], lens=30)
