"""
Thiết bị 3D cho các template bên BẢNG (không phải /lab): đòn bẩy, bể chất lỏng + áp kế, bình điện phân, lò phản ứng hạt nhân.
Mỗi bộ phận là MỘT lưới mang tên cố định, gốc toạ độ (điểm xoay hoặc đáy) ghi ở từng mục, đơn vị và trục theo three.js (x phải, y lên, z về phía người xem).
Cảnh `Scenes3DBlender.tsx` tải `board-parts.glb`, đặt và làm chuyển động từng bộ phận. Vật liệu mang tên để cảnh đổi màu / cho phát sáng:
`paint` (khối nặng), `water` (chất lỏng), `fuel` (thanh nhiên liệu, phát sáng theo công suất), `absorber` (thanh điều khiển), `glass` (thủy tinh vật lí của cảnh).

Chạy:
  blender --background --python tools/lab-models/board_parts.py -- apps/teacher-board/public/models [ảnh xem thử.png lever|tank|cell|reactor]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F401,F403

SHOW = argv[2] if len(argv) > 2 else 'lever'
PAINT = mat('paint', hexc('#2459C9'), metallic=0.5, rough=0.38)
WATER = mat('water', hexc('#4C9BE8'), rough=0.05, alpha=0.4)
FUEL = mat('fuel', hexc('#B8641E'), metallic=0.3, rough=0.45)
ABSORBER = mat('absorber', hexc('#1B1C22'), metallic=0.5, rough=0.4)
CONCRETE = mat('concrete', hexc('#8D8A82'), rough=0.9)
BLUEPIPE = mat('bluepipe', hexc('#2459C9'), metallic=0.4, rough=0.4)
REDPIPE = mat('redpipe', hexc('#C4261A'), metallic=0.4, rough=0.4)
YELLOW = mat('yellow', hexc('#E3B341'), rough=0.45)
GRAPHITE = mat('graphite', hexc('#2A2B2E'), metallic=0.2, rough=0.55)
FRONT = (math.radians(90), 0, 0)
ZAXIS = (math.radians(90), 0, 0)
XAXIS = (0, math.radians(90), 0)


def B(name, sx, sy, sz, loc, m, bevel=0.01, rot=(0, 0, 0)):
    """hộp theo kích thước ba trục three.js"""
    return box(name, (sx, sz, sy), T(*loc), m, bevel=bevel, rot=rot)


def make(name, objs, at=(0, 0, 0)):
    o = join(name, objs)
    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    o.location = T(*at)
    return o


def ring_pts(cx, cy, z, r, a0, a1, n):
    return [T(cx + r * math.sin(a0 + (a1 - a0) * i / n), cy + r * math.cos(a0 + (a1 - a0) * i / n), z) for i in range(n + 1)]


# ================================================================== đòn bẩy (PHYS_MOMENT_LEVER)
# LeverBar: thanh gỗ dài 8,9 có thước chia vạch 1 m; gốc ở điểm tựa (giữa thanh)
bar = [
    B('bar', 8.9, 0.16, 0.36, (0, 0, 0), WOOD, bevel=0.02),
    B('strip', 8.6, 0.1, 0.004, (0, 0, 0.181), CREAM, bevel=0),
    cyl('pin', 0.07, 0.62, T(0, 0, 0), CHROME, rot=ZAXIS),
]
for sx in (-1, 1):
    bar.append(B('cap', 0.08, 0.2, 0.4, (sx * 4.46, 0, 0), IRON, bevel=0.02))
for n in range(-4, 5):
    if n == 0:
        continue
    bar.append(B('tick', 0.025, 0.07, 0.004, (n, 0.03, 0.183), INK, bevel=0))
    bar.append(text('num', str(abs(n)), 0.065, T(n, -0.035, 0.183), INK, rot=FRONT, depth=0.001))
bar.append(B('tick0', 0.03, 0.09, 0.004, (0, 0.025, 0.183), RED, bevel=0))
LEVER_BAR = make('LeverBar', bar, at=(0, 2.6, 0) if SHOW == 'lever' else (0, -50, 0))

# LeverFrame: chân đỡ chữ A hai bên thanh; gốc ở mặt sàn giữa đế, điểm tựa ở y = 2,6
fr = [B('base', 3.6, 0.14, 1.3, (0, 0.07, 0), IRON, bevel=0.02)]
for sz in (-0.31, 0.31):
    for sx in (-1.1, 1.1):
        fr.append(tube('leg', [T(sx, 0.14, sz), T(0, 2.55, sz)], 0.06, STEEL, smooth=False))
    fr.append(tube('brace', [T(-0.62, 1.1, sz), T(0.62, 1.1, sz)], 0.04, STEEL, smooth=False))
    fr.append(B('plate', 0.55, 0.5, 0.05, (0, 2.6, sz), IRON, bevel=0.015))
    fr.append(cyl('nut', 0.1, 0.05, T(0, 2.6, sz * 1.25), CHROME, rot=ZAXIS))
LEVER_FRAME = make('LeverFrame', fr, at=(0, 0, 0) if SHOW == 'lever' else (0, -50, 0))

# Weight: quả cân treo bằng quai ôm thanh; gốc ở mặt dưới thanh (nơi quai bám), quả nặng 0,5 × 0,5 × 0,35 treo thấp hơn 0,7
w = [
    B('strapT', 0.04, 0.03, 0.46, (0, 0.105, 0), STEEL, bevel=0.005),
    B('strapL', 0.04, 0.24, 0.03, (0, 0, 0.215), STEEL, bevel=0.005),
    B('strapR', 0.04, 0.24, 0.03, (0, 0, -0.215), STEEL, bevel=0.005),
    B('strapB', 0.04, 0.03, 0.46, (0, -0.105, 0), STEEL, bevel=0.005),
    tube('rope', [T(0, -0.12, 0), T(0, -0.62, 0)], 0.014, STEEL, smooth=False),
    B('block', 0.5, 0.5, 0.36, (0, -0.95, 0), PAINT, bevel=0.03),
    B('top', 0.3, 0.1, 0.2, (0, -0.66, 0), IRON, bevel=0.015),
    B('band', 0.52, 0.06, 0.38, (0, -0.8, 0), CHROME, bevel=0.01),
    text('kg', 'kg', 0.13, T(0, -0.97, 0.19), WHITE, rot=FRONT, depth=0.004),
]
WEIGHT = make('Weight', w, at=(-2, 2.52, 0) if SHOW == 'lever' else (0, -50, 0))

# ================================================================== bể chất lỏng (PHYS_FLUID_PRESSURE)
# TankGlass: bốn thành kính 4,0 × 3,2 × 2,2, hở trên; gốc ở giữa đáy (đáy kính dày 0,1)
T_W, T_D, T_H = 4.0, 2.2, 3.2
tg = [B('floor', T_W, 0.1, T_D, (0, 0.05, 0), GLASS, bevel=0)]
for sz in (-1, 1):
    tg.append(B('wallF', T_W, T_H, 0.06, (0, T_H / 2, sz * (T_D / 2 - 0.03)), GLASS, bevel=0))
for sx in (-1, 1):
    tg.append(B('wallS', 0.06, T_H, T_D, (sx * (T_W / 2 - 0.03), T_H / 2, 0), GLASS, bevel=0))
TANK_GLASS = make('TankGlass', tg, at=(0, 0, 0) if SHOW == 'tank' else (0, -50, 0))
# TankFrame: đế, bốn cột góc, viền trên và thước độ sâu 0–10 m (mặt nước ở y = 2,7; 1 m = 0,26)
tf = [B('base', T_W + 0.5, 0.12, T_D + 0.5, (0, -0.06, 0), IRON, bevel=0.02)]
for sx in (-1, 1):
    for sz in (-1, 1):
        tf.append(B('post', 0.1, T_H, 0.1, (sx * (T_W / 2 + 0.02), T_H / 2, sz * (T_D / 2 + 0.02)), STEEL, bevel=0.015))
for sz in (-1, 1):
    tf.append(B('rimF', T_W + 0.2, 0.07, 0.1, (0, T_H, sz * (T_D / 2 + 0.02)), STEEL, bevel=0.015))
for sx in (-1, 1):
    tf.append(B('rimS', 0.1, 0.07, T_D + 0.2, (sx * (T_W / 2 + 0.02), T_H, 0), STEEL, bevel=0.015))
tf.append(B('ruler', 0.3, 2.9, 0.02, (-T_W / 2 - 0.3, 1.45 + 0.1, T_D / 2 + 0.02), CREAM, bevel=0))
for h in range(0, 11):
    y = 2.7 - h * 0.26
    tf.append(B('mark', 0.16 if h % 2 == 0 else 0.09, 0.012, 0.004, (-T_W / 2 - 0.37 + (0.04 if h % 2 else 0), y, T_D / 2 + 0.034), INK, bevel=0))
    if h % 2 == 0:
        tf.append(text('m', str(h), 0.085, T(-T_W / 2 - 0.19, y, T_D / 2 + 0.034), INK, rot=FRONT, depth=0.001))
tf.append(text('unit', 'm', 0.1, T(-T_W / 2 - 0.3, 2.95, T_D / 2 + 0.034), RED, rot=FRONT, depth=0.001))
TANK_FRAME = make('TankFrame', tf, at=(0, 0, 0) if SHOW == 'tank' else (0, -50, 0))
# TankWater: khối chất lỏng cao 2,6 (từ y = 0,1 đến 2,7), vật liệu `water` để cảnh đổi màu theo khối lượng riêng
TANK_LIQ = make('TankWater', [B('water', T_W - 0.14, 2.6, T_D - 0.14, (0, 1.4, 0), WATER, bevel=0)], at=(0, 0, 0) if SHOW == 'tank' else (0, -50, 0))
# FloatCube: khối lập phương cạnh 1 có vân gỗ, gốc ở tâm
CUBE = make('FloatCube', [B('cube', 1, 1, 1, (0, 0, 0), PAINT, bevel=0.06), B('stripe', 1.01, 0.12, 1.01, (0, 0.3, 0), WHITE, bevel=0.01)], at=(-0.8, 2.2, 0) if SHOW == 'tank' else (0, -50, 0))
# PressureProbe: đầu dò áp suất (viên đạn thép + màng vàng quay về −x); gốc ở tâm màng
PROBE = make('PressureProbe', [
    cyl('body', 0.13, 0.34, T(0.2, 0, 0), STEEL, rot=XAXIS),
    cyl('diaphragm', 0.11, 0.02, T(0.015, 0, 0), YELLOW, rot=XAXIS, bevel=0),
    ball('nose', 0.13, T(0.42, 0, 0), STEEL),
], at=(1.4, 1.4, 0) if SHOW == 'tank' else (0, -50, 0))
# GaugeBody: đồng hồ áp suất mặt tròn bán kính 0,62 quay về +z, thang 0–1500 kPa quét 270°; gốc ở tâm mặt
gb = [
    lathe('ring', [(0.58, 0.0), (0.66, 0.0), (0.68, 0.05), (0.68, 0.12), (0.62, 0.12), (0.58, 0.08)], T(0, 0, 0), CHROME, rot=ZAXIS),
    cyl('face', 0.6, 0.04, T(0, 0, -0.0), CREAM, rot=ZAXIS, bevel=0, seg=64),
    cyl('hub', 0.045, 0.06, T(0, 0, 0.04), INK, rot=ZAXIS),
    B('neck', 0.16, 0.5, 0.16, (0, -0.9, -0.1), CHROME, bevel=0.02),
]
for i in range(0, 26):
    th = math.radians(-135 + 270 * i / 25)  # theo chiều kim đồng hồ kể từ hướng 12 giờ
    major = i % 5 == 0
    ln = 0.11 if major else 0.055
    r = 0.5 - ln / 2
    gb.append(B('tick', 0.012, ln, 0.004, (r * math.sin(th), r * math.cos(th), 0.026), RED if i == 25 else INK, bevel=0, rot=(0, -th, 0)))
for i in range(0, 6):
    th = math.radians(-135 + 270 * i / 5)
    gb.append(text('n', str(i * 300), 0.07, T(0.33 * math.sin(th), 0.33 * math.cos(th), 0.03), INK, rot=FRONT, depth=0.001))
gb.append(text('u', 'kPa', 0.075, T(0, -0.22, 0.03), INK, rot=FRONT, depth=0.001))
GAUGE = make('GaugeBody', gb, at=(0, 3.9, 0) if SHOW == 'tank' else (0, -50, 0))
# GaugeNeedle: kim đồng hồ chỉ lên (hướng 12 giờ khi p = 750 kPa), gốc ở tâm trục
NEEDLE = make('GaugeNeedle', [B('needle', 0.03, 0.44, 0.006, (0, 0.15, 0.04), RED, bevel=0), B('tail', 0.03, 0.12, 0.006, (0, -0.06, 0.04), RED, bevel=0)], at=(0, 3.9, 0) if SHOW == 'tank' else (0, -50, 0))

# ================================================================== bình điện phân (CHEM_ELECTROLYSIS)
# CellBeaker: cốc thủy tinh cao 2,2 bán kính 1,4; gốc ở giữa đáy
BEAKER = make('CellBeaker', [lathe('beaker', [(0, 0.0), (1.32, 0.0), (1.4, 0.08), (1.4, 2.15), (1.46, 2.2), (1.4, 2.2), (1.33, 2.1), (1.33, 0.1), (0, 0.1)], T(0, 0, 0), GLASS, steps=64)], at=(0, 0, 0) if SHOW == 'cell' else (0, -50, 0))
# CellStatic: nắp cách điện, hai kẹp, dây đỏ (+) và đen (−), nguồn một chiều; gốc ở mặt bàn giữa cốc. Đường dây xem WIRES trong Scenes3DBlender.tsx
cs = [cyl('lid', 1.5, 0.09, T(0, 2.27, 0), BAKELITE, bevel=0.01, seg=64)]
for sx in (-0.62, 0.62):
    cs.append(cyl('collar', 0.15, 0.1, T(sx, 2.34, 0), BRASS, bevel=0.01))
WIRE_BLACK = [T(-0.62, 2.75, -0.12), T(-0.62, 3.35, -0.12), T(3.55, 3.35, -0.12), T(3.55, 0.82, -0.12)]
WIRE_RED = [T(0.62, 2.75, 0.12), T(0.62, 3.0, 0.12), T(3.0, 3.0, 0.12), T(3.0, 0.82, 0.12)]
cs.append(tube('wireK', WIRE_BLACK, 0.035, INK, smooth=False))
cs.append(tube('wireR', WIRE_RED, 0.035, RED, smooth=False))
cs += [
    B('psu', 1.5, 0.75, 0.9, (3.3, 0.375, 0), CASE, bevel=0.04),
    B('screen', 0.8, 0.2, 0.012, (3.3, 0.5, 0.456), INK, bevel=0),
    text('v', '12.0 V', 0.13, T(3.3, 0.5, 0.465), LED, rot=FRONT, depth=0.003),
    cyl('postR', 0.05, 0.1, T(3.0, 0.78, 0.12), RED, bevel=0.005),
    cyl('postK', 0.05, 0.1, T(3.55, 0.78, -0.12), INK, bevel=0.005),
    text('plus', '+', 0.16, T(3.0, 0.62, 0.456), RED, rot=FRONT, depth=0.004),
    text('minus', '−', 0.16, T(3.55, 0.62, 0.456), INK, rot=FRONT, depth=0.004),
    lathe('knob', [(0, 0.07), (0.06, 0.07), (0.08, 0.05), (0.08, 0.0), (0, 0.0)], T(3.3, 0.2, 0.455), BAKELITE, rot=ZAXIS),
]
CELL_STATIC = make('CellStatic', cs, at=(0, 0, 0) if SHOW == 'cell' else (0, -50, 0))
# Electrode: thanh than chì dài 2,4 có kẹp đồng ở đầu; gốc ở đầu dưới (cảnh đặt ở y = 0,35)
ELECTRODE = make('Electrode', [
    cyl('rod', 0.1, 2.4, T(0, 1.2, 0), GRAPHITE, bevel=0.01),
    cyl('clip', 0.14, 0.22, T(0, 2.3, 0), BRASS, bevel=0.015),
    cyl('screw', 0.04, 0.1, T(0, 2.46, 0), CHROME, bevel=0),
], at=(-0.62, 0.35, 0) if SHOW == 'cell' else (0, -50, 0))
# Deposit: lớp kim loại bám quanh thanh, cao 1 (cảnh co theo khối lượng); gốc ở đáy
DEPOSIT = make('Deposit', [cyl('dep', 0.125, 1.0, T(0, 0.5, 0), COPPER, bevel=0.01)], at=(-0.62, 0.45, 0) if SHOW == 'cell' else (0, -50, 0))

# ================================================================== lò phản ứng hạt nhân (PHYS_FISSION_REACTOR)
# ReactorVessel: bình áp lực bằng "kính" cho thấy vùng hoạt; đáy elip từ y = 0,3, thành trụ bán kính 2,4 tới y = 4,6; gốc ở sàn
prof = [(0, 0.3)] + [(2.4 * math.sin(math.radians(a)), 1.0 - 0.7 * math.cos(math.radians(a))) for a in range(10, 91, 10)] + [(2.4, 4.6), (2.34, 4.6)]
prof += [(2.34 * math.sin(math.radians(a)), 1.0 - 0.64 * math.cos(math.radians(a))) for a in range(90, 9, -10)] + [(0, 0.36)]
VESSEL = make('ReactorVessel', [lathe('vessel', prof, T(0, 0, 0), GLASS, steps=64)], at=(0, 0, 0) if SHOW == 'reactor' else (0, -50, 0))
# ReactorBase: bệ bê tông, mặt bích, nắp bình, bốn ống dẫn động thanh điều khiển cao tới y = 8,7, ống nước lạnh (xanh) và nóng (đỏ)
rb = [
    cyl('plinth', 3.6, 0.3, T(0, 0.15, 0), CONCRETE, seg=64),
    cyl('step', 3.0, 0.1, T(0, 0.33, 0), STEEL, seg=64),
    lathe('flangeB', [(2.4, 0.0), (2.62, 0.0), (2.62, 0.2), (2.4, 0.2)], T(0, 0.9, 0), STEEL, steps=64),
    lathe('flangeT', [(2.4, 0.0), (2.62, 0.0), (2.62, 0.22), (2.4, 0.22)], T(0, 4.45, 0), STEEL, steps=64),
    cyl('head', 2.6, 0.18, T(0, 4.74, 0), IRON, seg=64),
]
for sx in (-1.2, -0.4, 0.4, 1.2):
    rb.append(cyl('crdm', 0.26, 4.0, T(sx, 6.82, 0), STEEL, bevel=0.01))
    rb.append(cyl('crdmCap', 0.3, 0.14, T(sx, 8.84, 0), IRON, bevel=0.02))
    rb.append(cyl('crdmRing', 0.3, 0.1, T(sx, 5.0, 0), CHROME, bevel=0.01))
for sz, pm, hot in ((-1.0, BLUEPIPE, False), (1.0, REDPIPE, True)):
    rb.append(cyl('nozzle', 0.3, 1.5, T(2.9 if hot else -2.9, 3.6, sz * 0.5), pm, rot=XAXIS))
    xs = 3.65 if hot else -3.65
    rb.append(tube('pipe', [T(xs - (0.7 if hot else -0.7), 3.6, sz * 0.5), T(xs, 3.6, sz * 0.5), T(xs, 0.5, sz * 0.5)], 0.26, pm, smooth=False))
for a in (45, 135, 225, 315):
    rb.append(B('leg', 0.3, 0.7, 0.3, (2.9 * math.cos(math.radians(a)), 0.65, 2.9 * math.sin(math.radians(a))), IRON, bevel=0.02))
REACTOR_BASE = make('ReactorBase', rb, at=(0, 0, 0) if SHOW == 'reactor' else (0, -50, 0))
# FuelRod: thanh nhiên liệu cao 2,8 (vật liệu `fuel` phát sáng theo công suất) có vòng đệm; gốc ở đầu dưới (cảnh đặt ở y = 1,0)
fu = [cyl('rod', 0.16, 2.8, T(0, 1.4, 0), FUEL, bevel=0.01), cyl('capB', 0.17, 0.08, T(0, 0.0, 0), STEEL, bevel=0), cyl('capT', 0.17, 0.08, T(0, 2.8, 0), STEEL, bevel=0)]
for y in (0.7, 1.4, 2.1):
    fu.append(cyl('spacer', 0.185, 0.05, T(0, y, 0), STEEL, bevel=0))
FUEL_ROD = make('FuelRod', fu, at=(-1.6, 1.0, 0.8) if SHOW == 'reactor' else (0, -50, 0))
# ControlRod: thanh hấp thụ neutron cao 2,8 (vật liệu `absorber`) kèm trục dài 2,0 phía trên; gốc ở đầu dưới
cr = [cyl('abs', 0.14, 2.8, T(0, 1.4, 0), ABSORBER, bevel=0.01), cyl('shaft', 0.05, 2.0, T(0, 3.8, 0), STEEL, bevel=0)]
for y in (0.3, 1.4, 2.5):
    cr.append(cyl('band', 0.15, 0.1, T(0, y, 0), mat('hazard', hexc('#E3B341'), rough=0.5), bevel=0))
CONTROL_ROD = make('ControlRod', cr, at=(-1.2, 1.0, 0) if SHOW == 'reactor' else (0, -50, 0))

# (các bộ phận không thuộc nhóm xem thử đã dời xuống y = −50; cảnh three.js đặt lại về 0 khi dùng)
export_glb('board-parts.glb')
CAM = {'lever': ((0, 3.2, 9.5), (0, 2.2, 0)), 'tank': ((0, 3.4, 10), (0, 1.8, 0)), 'cell': ((1.4, 3.0, 9), (1.4, 1.6, 0)), 'reactor': ((0, 5.0, 17), (0, 4.0, 0))}[SHOW]
preview(CAM[0], CAM[1], lens=30)
