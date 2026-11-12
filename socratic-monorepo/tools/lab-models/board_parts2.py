"""
Thiết bị Vật lí 2 cho bảng: đệm khí + xe, lò xo + giá, mặt phẳng nghiêng, máy Atwood, ống chân không, bảng mạch điện một chiều.
Mỗi bộ phận là MỘT lưới mang tên cố định (hợp đồng trong `scenes3dExtra.test.ts`), gốc toạ độ ghi ở từng mục; đơn vị và trục theo three.js.
Cảnh `Scenes3DBlender2.tsx` tải `board-parts2.glb`. Vật liệu mang tên `paint` để cảnh đổi màu khối nặng.

Chạy:
  blender --background --python tools/lab-models/board_parts2.py -- apps/teacher-board/public/models [ảnh xem thử.png track|spring|ramp|atwood|vac|circuit]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F401,F403

SHOW = argv[2] if len(argv) > 2 else 'track'
PAINT = mat('paint', hexc('#2459C9'), metallic=0.5, rough=0.38)
YELLOW = mat('yellow', hexc('#E3B341'), rough=0.45)
CERAMIC = mat('ceramic', hexc('#D9C9A3'), rough=0.6)
GREEN = mat('green', hexc('#2E7D32'), rough=0.5)
BROWN = mat('brown', hexc('#7A4A21'), rough=0.5)
ZAXIS = (math.radians(90), 0, 0)
XAXIS = (0, math.radians(90), 0)
FRONT = ZAXIS
AWAY = (0, 1000, 0)  # cất bộ phận không thuộc nhóm xem thử ra xa (cảnh three.js luôn đặt lại gốc)


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


# ================================================================== đệm khí + xe (động học, Newton, va chạm, dao động)
# Track: đệm khí dài 12,4 (x từ −6,2 đến 6,2), mặt ray ở y = 0, thước vạch 0,5 m ở mặt trước, hai chặn đầu; gốc ở giữa mặt ray
tr = [B('channel', 12.4, 0.28, 0.9, (0, -0.2, 0), ALU, bevel=0.02), B('rail0', 12.2, 0.05, 0.06, (0, -0.025, -0.25), CHROME, bevel=0.01), B('rail1', 12.2, 0.05, 0.06, (0, -0.025, 0.25), CHROME, bevel=0.01),
      B('strip', 12.0, 0.18, 0.004, (0, -0.2, 0.452), CREAM, bevel=0)]
for i in range(-12, 13):
    tr.append(B('tick', 0.02, 0.1 if i % 2 == 0 else 0.06, 0.004, (i * 0.5, -0.2, 0.455), INK, bevel=0))
for sx in (-1, 1):
    tr.append(B('stop', 0.16, 0.34, 0.9, (sx * 6.28, 0.01, 0), IRON, bevel=0.03))
    tr.append(B('bump', 0.06, 0.16, 0.4, (sx * 6.17, 0.08, 0), RUBBER, bevel=0.02))
TRACK = make('Track', tr, 'track', (0, 0.34, 0))
# Cart: xe dài 1 (vật liệu `paint`), bốn bánh, đệm cao su hai đầu, móc kéo ở +x; gốc ở mặt ray giữa xe
cart = [B('body', 0.96, 0.34, 0.62, (0, 0.27, 0), PAINT, bevel=0.04), B('top', 0.7, 0.04, 0.5, (0, 0.46, 0), CHROME, bevel=0.01),
        text('kg', 'kg', 0.16, T(0, 0.27, 0.315), WHITE, rot=FRONT, depth=0.004)]
for sx in (-0.32, 0.32):
    for sz in (-0.3, 0.3):
        cart.append(cyl('wheel', 0.09, 0.07, T(sx, 0.09, sz), CHROME, rot=ZAXIS))
for sx in (-1, 1):
    cart.append(B('buffer', 0.06, 0.18, 0.36, (sx * 0.51, 0.27, 0), RUBBER, bevel=0.015))
cart.append(tube('hook', [T(0.52, 0.27, 0), T(0.62, 0.27, 0), T(0.62, 0.34, 0)], 0.014, STEEL, smooth=False))
CART = make('Cart', cart, 'track')

# ================================================================== lò xo + giá treo
# Coil: lò xo xoắn 12 vòng bán kính 0,22, dài 1 hướng xuống từ gốc (y 0 → −1); cảnh co giãn theo trục y
pts = []
N = 12 * 24
for i in range(N + 1):
    f = i / N
    a = 2 * math.pi * 12 * f
    r = 0.22
    pts.append(T(r * math.cos(a), -f, r * math.sin(a)))
COIL = make('Coil', [tube('coil', pts, 0.028, STEEL, smooth=False), cyl('hookT', 0.05, 0.12, T(0, 0.06, 0), STEEL, bevel=0), cyl('hookB', 0.05, 0.12, T(0, -1.06, 0), STEEL, bevel=0)], 'spring', (0, 5, 0))
# SpringStand: giá treo cao 7,2: đế, thanh đứng ở x = −2,1, tay ngang ở y = 6,9 dài tới x = 2,2, thước dọc 0,5 m; gốc ở mặt bàn giữa đế
ss = [B('base', 4.8, 0.16, 1.5, (0, 0.08, 0), IRON, bevel=0.03), cyl('rod', 0.07, 7.0, T(-2.1, 3.6, 0), CHROME, bevel=0.01),
      B('arm', 4.4, 0.12, 0.14, (0.05, 6.9, 0), STEEL, bevel=0.015), B('clamp', 0.3, 0.3, 0.3, (-2.1, 6.9, 0), IRON, bevel=0.03),
      B('ruler', 0.34, 5.9, 0.02, (-1.7, 3.85, 0.1), CREAM, bevel=0)]
for i in range(0, 12):
    y = 6.8 - i * 0.5
    ss.append(B('mark', 0.18 if i % 2 == 0 else 0.1, 0.014, 0.004, (-1.78, y, 0.115), INK, bevel=0))
SPRING_STAND = make('SpringStand', ss, 'spring')
# Mass: quả nặng hình trụ treo bằng móc (vật liệu `paint`), nặng cao 0,6 bán kính 0,42; gốc ở đỉnh móc
MASS = make('Mass', [cyl('hook', 0.05, 0.14, T(0, 0.0, 0), STEEL, bevel=0), tube('ring', [T(0, 0.0, 0), T(0, -0.3, 0)], 0.02, STEEL, smooth=False),
                     cyl('body', 0.42, 0.6, T(0, -0.62, 0), PAINT, bevel=0.03), cyl('band', 0.435, 0.08, T(0, -0.62, 0), CHROME, bevel=0.01),
                     text('kg', 'kg', 0.14, T(0, -0.62, 0.44), WHITE, rot=FRONT, depth=0.004)], 'spring', (0, 4, 0))

# ================================================================== mặt phẳng nghiêng
# RampPlank: tấm gỗ dài 1 (cảnh co theo x), rộng 1,1, dày 0,12, hai thành bên; mặt trên ở y = 0 và mép trái ở x = 0, nằm về +x
rp = [B('plank', 1.0, 0.12, 1.1, (0.5, -0.06, 0), WOOD, bevel=0.01), B('sideL', 1.0, 0.1, 0.05, (0.5, 0.05, -0.575), IRON, bevel=0.01), B('sideR', 1.0, 0.1, 0.05, (0.5, 0.05, 0.575), IRON, bevel=0.01)]
RAMP = make('RampPlank', rp, 'ramp', (-3, 1.5, 0))
# Protractor: thước đo góc nửa trong suốt hình quạt 0–90° bán kính 1,7, tâm ở bản lề, quay mặt +z; gốc ở bản lề
pt = []
for i in range(0, 10):
    a = math.radians(i * 10)
    major = i % 3 == 0
    pt.append(B('tick', 0.22 if major else 0.1, 0.014, 0.006, (1.6 * math.cos(a) - (0.11 if major else 0.05) * math.cos(a), 1.6 * math.sin(a) - (0.11 if major else 0.05) * math.sin(a), 0.01), INK, bevel=0, rot=(0, -a, 0)))
pt.append(B('base', 1.7, 0.012, 0.01, (0.85, 0.0, 0.0), INK, bevel=0))
PROTRACTOR = make('Protractor', pt + [cyl('pivot', 0.1, 0.18, T(0, 0, 0), BRASS, rot=ZAXIS)], 'ramp', (-3, 1.5, 0))
# Block: khối trượt 0,6 × 0,5 × 0,5 vật liệu `paint` có tay cầm; gốc ở giữa mặt dưới
BLOCK = make('Block', [B('b', 0.6, 0.5, 0.5, (0, 0.25, 0), PAINT, bevel=0.04), B('handle', 0.25, 0.06, 0.1, (0, 0.55, 0), CHROME, bevel=0.015), text('kg', 'kg', 0.12, T(0, 0.25, 0.255), WHITE, rot=FRONT, depth=0.004)], 'ramp')
# RampBase: bàn đỡ dưới chân dốc (tấm dày, dùng làm sàn trượt tới)
RAMP_BASE = make('RampBase', [B('bench', 12, 0.3, 2.2, (0, -0.15, 0), CREAM, bevel=0.02), B('edge', 12, 0.06, 0.08, (0, 0.01, 1.1), INK, bevel=0)], 'ramp')

# ================================================================== máy Atwood
# AtwoodStand: đế + cột cao 6,6 + tay đỡ ròng rọc ở y = 6,2; gốc ở mặt bàn giữa đế. Thước dọc 0–5 m ở bên trái cột
st = [B('base', 3.4, 0.16, 1.6, (0, 0.08, 0), IRON, bevel=0.03), cyl('post', 0.09, 6.4, T(0, 3.3, -0.4), CHROME, bevel=0.01),
      B('arm', 0.2, 0.18, 1.0, (0, 6.3, 0.05), STEEL, bevel=0.015), cyl('axle', 0.05, 0.6, T(0, 6.2, 0.35), STEEL, rot=ZAXIS),
      B('ruler', 0.3, 5.5, 0.02, (-0.8, 3.3, -0.4), CREAM, bevel=0)]
for i in range(0, 12):
    st.append(B('mark', 0.16 if i % 2 == 0 else 0.09, 0.014, 0.004, (-0.88, 6.0 - i * 0.5, -0.385), INK, bevel=0))
ATWOOD = make('AtwoodStand', st, 'atwood')
# Pulley: ròng rọc bán kính 0,55 có rãnh và nan hoa, quay quanh trục z; gốc ở tâm
pl = [lathe('wheel', [(0.12, -0.1), (0.5, -0.1), (0.55, -0.05), (0.5, 0.0), (0.55, 0.05), (0.5, 0.1), (0.12, 0.1)], T(0, 0, 0), ALU, rot=ZAXIS), cyl('hub', 0.13, 0.26, T(0, 0, 0), BRASS, rot=ZAXIS)]
for i in range(0, 5):
    a = math.radians(i * 72)
    pl.append(B('spoke', 0.05, 0.4, 0.05, (0.3 * math.sin(a), 0.3 * math.cos(a), 0), ALU, bevel=0, rot=(0, -a, 0)))
PULLEY = make('Pulley', pl, 'atwood', (0, 6.2, 0.35))

# ================================================================== ống chân không (rơi tự do)
# VacuumTube: ống thủy tinh cao 6,4 bán kính 0,6 gốc ở đáy; VacuumCaps: nắp đáy và nắp trên có cổ hút khí
VAC = make('VacuumTube', [lathe('tube', [(0, 0.0), (0.58, 0.0), (0.6, 0.02), (0.6, 6.4), (0.58, 6.42), (0.55, 6.4), (0.55, 0.06), (0, 0.06)], T(0, 0, 0), GLASS, steps=48)], 'vac')
VCAPS = make('VacuumCaps', [cyl('capB', 0.78, 0.3, T(0, -0.15, 0), IRON, seg=48), cyl('capT', 0.72, 0.3, T(0, 6.55, 0), IRON, seg=48), cyl('neck', 0.12, 0.7, T(0, 7.15, 0), STEEL),
                            tube('hose', [T(0, 7.4, 0), T(0.0, 7.9, 0), T(1.1, 7.9, 0), T(1.1, 7.2, 0)], 0.05, RUBBER, smooth=False),
                            cyl('pump', 0.3, 0.7, T(1.1, 6.9, 0), PAINT), ball('knob', 0.12, T(0, 7.55, 0), RED)], 'vac')

# ================================================================== bảng mạch điện một chiều
# CircBoard: tấm gỗ 7,6 × 0,16 × 5,6, mặt trên ở y = 0,16, các cọc nối ở nút mạch; gốc ở mặt bàn giữa tấm
cb = [B('board', 7.6, 0.16, 5.6, (0, 0.08, 0), WOOD, bevel=0.03)]
for x, z in [(-2.6, -1.5), (-2.6, 1.5), (2.9, -1.5), (2.9, 1.5), (0.0, -1.5), (0.0, 0.5), (2.9, -0.5), (2.9, 0.5)]:
    cb.append(cyl('post', 0.07, 0.12, T(x, 0.22, z), BRASS, bevel=0.01))
CIRC_BOARD = make('CircBoard', cb, 'circuit')
# Battery: bộ nguồn hai pin trong đế (nằm dọc theo z), cực + ở z = −0,7, cực − ở z = +0,7; gốc ở mặt bảng giữa nguồn
bt = [B('holder', 0.9, 0.16, 1.9, (0, 0.24, 0), BAKELITE, bevel=0.03)]
for sx in (-0.2, 0.2):
    bt.append(cyl('cell', 0.17, 1.5, T(sx, 0.42, 0), ORANGE, rot=ZAXIS, bevel=0.02))
    bt.append(cyl('nub', 0.07, 0.1, T(sx, 0.42, -0.78), BRASS, rot=ZAXIS))
bt.append(text('plus', '+', 0.22, T(0, 0.325, -0.78), RED, depth=0.01, rot=(0, 0, 0)))
BATTERY = make('Battery', bt, 'circuit', (-2.6, 0.16, 0))
# ResistorA / ResistorB: điện trở sứ dài 1,2 nằm dọc x, bốn vạch màu (A xanh lam, B cam); gốc ở giữa, mặt dưới ở y = 0
for nm, band in (('ResistorA', '#2459C9'), ('ResistorB', '#D9481C')):
    rs = [cyl('body', 0.16, 0.9, T(0, 0.2, 0), CERAMIC, rot=XAXIS), tube('legL', [T(-0.45, 0.2, 0), T(-0.6, 0.2, 0)], 0.02, STEEL, smooth=False), tube('legR', [T(0.45, 0.2, 0), T(0.6, 0.2, 0)], 0.02, STEEL, smooth=False)]
    for i, x in enumerate((-0.28, -0.12, 0.04, 0.3)):
        rs.append(cyl('band', 0.168, 0.07, T(x, 0.2, 0), mat('band' + nm + str(i), hexc(band if i < 3 else '#E3B341')), rot=XAXIS, bevel=0))
    make(nm, rs, 'circuit', (0.4 if nm == 'ResistorA' else 1.9, 0.16, -1.5))
# MeterBody: đồng hồ đo đứng, mặt tròn bán kính 0,55 quay +z, vạch chia 270°; gốc ở tâm mặt (cảnh đặt trên bảng). MeterNeedle: kim quay quanh gốc
mb = [lathe('ring', [(0.5, 0.0), (0.58, 0.0), (0.6, 0.05), (0.6, 0.12), (0.54, 0.12), (0.5, 0.08)], T(0, 0, 0), CHROME, rot=ZAXIS), cyl('face', 0.52, 0.04, T(0, 0, 0), CREAM, rot=ZAXIS, bevel=0, seg=64),
      cyl('hub', 0.04, 0.06, T(0, 0, 0.04), INK, rot=ZAXIS), B('foot', 0.5, 0.1, 0.4, (0, -0.85, -0.05), IRON, bevel=0.02), B('neck', 0.12, 0.5, 0.12, (0, -0.55, -0.05), CHROME, bevel=0.02)]
for i in range(0, 21):
    th = math.radians(-135 + 270 * i / 20)
    ln_ = 0.1 if i % 5 == 0 else 0.05
    r = 0.44 - ln_ / 2
    mb.append(B('tick', 0.012, ln_, 0.004, (r * math.sin(th), r * math.cos(th), 0.026), RED if i == 20 else INK, bevel=0, rot=(0, -th, 0)))
METER = make('MeterBody', mb, 'circuit', (-1.0, 1.2, -2.3))
NEEDLE = make('MeterNeedle', [B('n', 0.026, 0.4, 0.006, (0, 0.13, 0.04), RED, bevel=0), B('t', 0.026, 0.1, 0.006, (0, -0.05, 0.04), RED, bevel=0)], 'circuit', (-1.0, 1.2, -2.3))
# Dây dẫn: WiresS (nối tiếp) và WiresP (song song) đi theo các điểm trong `WIRE_*` của Scenes3DBlender2.tsx (toạ độ x, z; độ cao y = 0,32)
WS = [(-2.6, -0.7), (-2.6, -1.5), (2.9, -1.5), (2.9, 1.5), (-2.6, 1.5), (-2.6, 0.7)]
WP = [[(-2.6, -0.7), (-2.6, -1.5), (0, -1.5), (0, 0.5)], [(0, -0.5), (2.9, -0.5), (2.9, 1.5), (-2.6, 1.5), (-2.6, 0.7)], [(0, 0.5), (2.9, 0.5)]]
make('WiresS', [tube('w', [T(x, 0.32, z) for x, z in WS], 0.04, COPPER, smooth=False)], 'circuit', (0, 0, 0))
make('WiresP', [tube('w', [T(x, 0.32, z) for x, z in path], 0.04, COPPER, smooth=False) for path in WP], 'circuit', (0, 0, 0))

export_glb('board-parts2.glb')
CAM = {'track': ((0, 2.2, 9), (0, 0.4, 0)), 'spring': ((0, 4.0, 13), (0, 3.6, 0)), 'ramp': ((0, 2.5, 8), (0, 0.8, 0)), 'atwood': ((0, 3.5, 12), (0, 3.3, 0)), 'vac': ((0, 4, 13), (0, 3.6, 0)), 'circuit': ((0, 7, 8), (0, 0.5, 0))}[SHOW]
preview(CAM[0], CAM[1], lens=30)
