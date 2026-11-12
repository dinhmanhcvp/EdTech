"""
Dụng cụ Vật lí của /lab (engines/families/HandsSimsThpt3D.ts): băng đệm khí và xe trượt, ống tia catot và cuộn Helmholtz,
giá kẹp ống và nam châm rơi, tế bào quang điện và hộp đèn. Mỗi dụng cụ là MỘT lưới mang tên cố định; gốc toạ độ ghi ở từng mục.
Vật liệu mang tên để cảnh đổi màu: `tint` (màu xe), `copper` (cuộn dây sáng theo dòng), `filter` (kính lọc sắc), `phosphor` (màn huỳnh quang).

Chạy:
  blender --background --python tools/lab-models/phys_parts.py -- apps/teacher-board/public/models [ảnh xem thử.png]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F401,F403

TINT = mat('tint', (0.9, 0.9, 0.9), metallic=0.3, rough=0.4)
FILTER = mat('filter', (1, 1, 1), rough=0.1, alpha=0.6)
PHOSPHOR = mat('phosphor', hexc('#143A2A'), rough=0.6)
SILVER = mat('silver', (0.9, 0.9, 0.88), metallic=1, rough=0.25)
FOAM = mat('foam', hexc('#2A2E66'), rough=0.95)
XAXIS = (0, math.radians(90), 0)  # tiện tròn dọc trục x


def part(name, objs, show):
    o = join(name, objs)
    o.location = T(*show)
    return o


def torus(name, major, minor, loc, material, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=64, minor_segments=14, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    return finish(o, material)


# ================================================================== va chạm trên đệm khí
# AirTrack: gốc ở mặt bàn, giữa băng; mặt trên băng ở y = 0,36
track = [box('beam', (7.2, 0.5, 0.12), T(0, 0.3, 0), ALU, bevel=0.015)]
for i in range(-34, 35):
    track.append(box('hole', (0.018, 0.018, 0.002), T(i * 0.1, 0.361, 0.12 if i % 2 else -0.12), INK, bevel=0))
    track.append(box('tick', (0.006, 0.002, 0.05 if i % 5 == 0 else 0.028), T(i * 0.1, 0.3, 0.251), INK, bevel=0))
for x in (-3.5, 3.5):
    track.append(box('stop', (0.14, 0.56, 0.34), T(x, 0.25, 0), IRON, bevel=0.02))
    track.append(tube('band', [T(x - math.copysign(0.09, x), 0.4, -0.2), T(x - math.copysign(0.2, x), 0.44, 0), T(x - math.copysign(0.09, x), 0.4, 0.2)], 0.012, ORANGE))
for x in (-2.6, 2.6):
    track.append(box('legBar', (0.12, 0.9, 0.05), T(x, 0.215, 0), IRON, bevel=0.01))
    for z in (-0.38, 0.38):
        track.append(lathe('foot', [(0, 0.2), (0.025, 0.2), (0.025, 0.04), (0.07, 0.03), (0.08, 0.0), (0, 0.0)], T(x, 0, z), CHROME))
track.append(tube('hose', [T(-3.57, 0.3, 0), T(-3.9, 0.28, 0.1), T(-4.1, 0.12, 0.5), T(-4.1, 0.05, 1.0)], 0.05, RUBBER))
part('AirTrack', track, (0, 0, -1.0))

# Glider: gốc ở tâm thân xe (cảnh đặt ở y ≈ 0,51); một vật liệu `tint` cho thân để nhuộm màu
part('Glider', [
    box('deck', (0.62, 0.56, 0.03), T(0, -0.12, 0), TINT, bevel=0.008),
    box('skirtA', (0.62, 0.03, 0.2), T(0, -0.21, 0.275), TINT, bevel=0.008),
    box('skirtB', (0.62, 0.03, 0.2), T(0, -0.21, -0.275), TINT, bevel=0.008),
    box('flag', (0.22, 0.012, 0.24), T(0, 0.02, 0.2), INK, bevel=0),
    cyl('pin', 0.018, 0.3, T(0, 0.04, 0), CHROME, bevel=0),
    tube('bumper', [T(0.31, -0.1, -0.1), T(0.42, -0.1, -0.06), T(0.45, -0.1, 0), T(0.42, -0.1, 0.06), T(0.31, -0.1, 0.1)], 0.01, CHROME),
], (-1.5, 0.51, 0.4))
# Weight: quả cân đĩa có rãnh, gốc ở tâm đáy; cảnh chồng lên chốt của xe
part('Disc', [lathe('disc', [(0.02, 0), (0.13, 0), (0.14, 0.01), (0.14, 0.05), (0.13, 0.06), (0.02, 0.06)], T(0, 0, 0), BRASS)], (-0.6, 0.0, 0.4))

# ================================================================== ống tia catot Thomson
# CrtTube: gốc ở tâm trục ống (cảnh đặt ở y = 0,8); trục dọc x từ −3,6 tới 3
crt = [
    lathe('envelope', [(0, -3.35), (0.2, -3.35), (0.25, -3.3), (0.25, -1.7), (0.45, -1.1), (0.62, -0.6), (0.62, 2.7), (0.58, 2.92), (0.3, 3.0), (0, 3.0)], T(0, 0, 0), GLASS, rot=XAXIS),
    lathe('screen', [(0, 2.94), (0.5, 2.92), (0.56, 2.88)], T(0, 0, 0), PHOSPHOR, rot=XAXIS),
    lathe('base', [(0, -3.62), (0.2, -3.62), (0.275, -3.56), (0.275, -3.3), (0, -3.3)], T(0, 0, 0), BAKELITE, rot=XAXIS),
    cyl('cathode', 0.09, 0.45, T(-2.95, 0, 0), STEEL, rot=XAXIS),
    lathe('anode', [(0.035, -2.42), (0.2, -2.42), (0.2, -2.38), (0.035, -2.38)], T(0, 0, 0), BRASS, rot=XAXIS),
    lathe('focus', [(0.12, -2.25), (0.15, -2.25), (0.15, -1.95), (0.12, -1.95)], T(0, 0, 0), BRASS, rot=XAXIS),
]
for s in (-1, 1):
    crt.append(box('plate', (1.6, 0.5, 0.02), T(-0.5, s * 0.3, 0), BRASS, bevel=0.004))
    crt.append(cyl('lead', 0.012, 0.34, T(-0.5, s * 0.47, 0), CHROME, bevel=0))
    crt.append(lathe('cap', [(0, 0.05), (0.035, 0.05), (0.045, 0.0), (0, 0.0)], T(-0.5, s * 0.64 - (0.05 if s > 0 else 0), 0), RED if s > 0 else INK, rot=(0 if s > 0 else math.radians(180), 0, 0)))
for a in range(4):
    crt.append(cyl('pinA', 0.014, 0.12, T(-3.66, 0.1 * math.sin(a * 1.571), 0.1 * math.cos(a * 1.571)), BRASS, bevel=0, rot=XAXIS))
for x, r in ((-2.5, 0.25), (1.9, 0.62)):  # hai giá gỗ đỡ ống
    crt.append(box('cradle', (0.16, 0.7, 0.8 - r - 0.02), T(x, -(0.8 + r + 0.02) / 2, 0), WOOD, bevel=0.015))
    crt.append(box('cradleFoot', (0.5, 0.9, 0.06), T(x, -0.77, 0), WOOD, bevel=0.015))
part('CrtTube', crt, (0, 0.8, -3.2))

# Helmholtz: gốc ở tâm vòng; trục vòng dọc z của three.js
coil = [torus('winding', 0.9, 0.06, T(0, 0, 0), mat('copper', (0.72, 0.36, 0.2), metallic=1, rough=0.32), rot=(math.radians(90), 0, 0))]
for dz in (-0.075, 0.075):
    coil.append(torus('former', 0.9, 0.028, T(0, 0, dz), BAKELITE, rot=(math.radians(90), 0, 0)))
coil.append(box('block', (0.3, 0.2, 0.1), T(0, 0.98, 0), BAKELITE, bevel=0.015))
for dx, m in ((-0.08, RED), (0.08, INK)):
    coil.append(lathe('post', [(0, 0.09), (0.03, 0.09), (0.038, 0.07), (0.038, 0.03), (0.02, 0.025), (0.02, 0.0)], T(dx, 1.03, 0), m))
part('Helmholtz', coil, (-3.2, 0.9, -1.2))

# ================================================================== hãm từ Foucault
# EddyStand: gốc ở mặt bàn ngay dưới trục ống; ống dài 3 đặt từ y = 0,1 tới 3,1
stand = [
    box('base', (1.0, 0.7, 0.08), T(-0.85, 0.04, 0), IRON, bevel=0.02),
    cyl('rod', 0.04, 3.5, T(-1.0, 1.79, 0), CHROME),
    lathe('tray', [(0, 0.02), (0.5, 0.02), (0.56, 0.085), (0.6, 0.085), (0.53, 0.0), (0, 0.0)], T(0, 0, 0), FOAM),
]
for y in (2.7, 0.75):
    stand.append(box('boss', (0.16, 0.16, 0.16), T(-1.0, y, 0), IRON, bevel=0.02))
    stand.append(box('arm', (0.58, 0.05, 0.05), T(-0.68, y, 0), STEEL, bevel=0.008))
    stand.append(torus('jaw', 0.385, 0.028, T(0, y, 0), STEEL))
    stand.append(lathe('thumb', [(0, 0.1), (0.04, 0.1), (0.05, 0.07), (0.02, 0.06), (0.02, 0.0)], T(-1.0, y, 0.09), BRASS, rot=(math.radians(90), 0, 0)))
part('EddyStand', stand, (2.2, 0, -1.2))
# Magnet: nam châm trụ hai cực, gốc ở tâm
part('Magnet', [
    cyl('north', 0.2, 0.15, T(0, 0.075, 0), RED, bevel=0.012),
    cyl('south', 0.2, 0.15, T(0, -0.075, 0), BLUE, bevel=0.012),
    lathe('band', [(0.202, -0.012), (0.206, 0), (0.202, 0.012)], T(0, 0, 0), CHROME),
    text('n', 'N', 0.16, T(0, 0.152, 0), WHITE),
], (3.4, 0.3, 0.2))

# ================================================================== quang điện
# PhotoCell: gốc ở tâm bóng thủy tinh (cảnh đặt ở y = 0,9); catot ở x = −1,54, anot ở x = +1,54
cell = [
    lathe('bulb', [(0, -1.9), (0.5, -1.85), (0.82, -1.55), (0.9, -1.1), (0.9, 1.1), (0.82, 1.55), (0.5, 1.85), (0, 1.9)], T(0, 0, 0), GLASS, rot=XAXIS),
    box('cathode', (0.05, 1.15, 1.15), T(-1.54, 0, 0), SILVER, bevel=0.01),
    torus('anode', 0.5, 0.03, T(1.54, 0, 0), CHROME, rot=(0, math.radians(90), 0)),
    lathe('socket', [(0, 0.0), (0.42, 0.0), (0.45, 0.03), (0.45, 0.12), (0.3, 0.16), (0.3, 0.3), (0, 0.3)], T(0, -0.9, 0), BAKELITE),
]
for x, m in ((-1.54, INK), (1.54, RED)):
    cell.append(cyl('lead', 0.014, 0.42, T(x, -0.7, 0), CHROME, bevel=0))
    cell.append(lathe('term', [(0, 0.12), (0.04, 0.12), (0.05, 0.09), (0.05, 0.04), (0.025, 0.035), (0.025, 0.0)], T(x, -0.9, 0.55), m))
part('PhotoCell', cell, (0.3, 0.9, 1.6))

# LampHouse: gốc ở tâm hộp đèn (cảnh đặt ở (−3; 1,9)), chĩa xuống 29° về phía catot; kính lọc mang vật liệu `filter`
TH = math.radians(29)
AX = (0, math.radians(90) + TH, 0)
along = lambda s: T(s * math.cos(TH), -s * math.sin(TH), 0)  # noqa: E731
part('LampHouse', [
    cyl('body', 0.28, 0.72, along(0), IRON, bevel=0.02, rot=AX),
    cyl('hood', 0.31, 0.12, along(0.38), BAKELITE, bevel=0.015, rot=AX),
    cyl('filter', 0.26, 0.02, along(0.46), FILTER, bevel=0, rot=AX),
    cyl('backCap', 0.2, 0.1, along(-0.4), BAKELITE, bevel=0.015, rot=AX),
    cyl('post', 0.04, 1.75, T(-0.1, -1.0, 0), CHROME),
    box('yoke', (0.12, 0.66, 0.1), T(-0.1, -0.2, 0), IRON, bevel=0.015),
    lathe('foot', [(0, 0.08), (0.12, 0.08), (0.36, 0.05), (0.4, 0.0), (0, 0.0)], T(-0.1, -1.9, 0), IRON),
], (-3.4, 1.9, 1.6))

# ================================================================== phụ kiện băng đệm khí (bài va chạm thao tác trực tiếp)
# Spring: lò xo bắn dài 1 dọc +x, gốc ở đầu tì vào chặn băng; cảnh co giãn theo trục x
N_TURN = 9
coil_pts = [T(i / 108, 0.085 * math.cos(i / 108 * 2 * math.pi * N_TURN), 0.085 * math.sin(i / 108 * 2 * math.pi * N_TURN)) for i in range(109)]
part('Spring', [tube('coil', coil_pts, 0.012, CHROME, smooth=False), cyl('pad', 0.11, 0.02, T(1.0, 0, 0), IRON, rot=XAXIS)], (-3.0, 0.9, 1.6))
# Bumper: đệm va chạm gắn vào đầu xe; gốc ở mặt tì vào xe, đệm nhô về +x; vật liệu `tint` nhuộm theo loại đệm
part('Bumper', [box('clip', (0.02, 0.3, 0.16), T(0.01, 0, 0), STEEL, bevel=0.004), box('pad', (0.07, 0.26, 0.14), T(0.055, 0, 0), TINT, bevel=0.02)], (-1.6, 0.4, 1.6))
# PhotoGate: cổng quang điện bắc ngang băng; gốc ở mặt bàn, giữa băng
gate = [box('base', (0.3, 1.2, 0.05), T(0, 0.025, 0), IRON, bevel=0.01), box('bar', (0.07, 0.95, 0.07), T(0, 0.99, 0), IRON, bevel=0.01), box('timer', (0.4, 0.2, 0.22), T(0, 1.13, 0), CASE, bevel=0.02), box('screen', (0.3, 0.006, 0.12), T(0, 1.13, 0.103), DARK, bevel=0)]
for z in (-0.44, 0.44):
    gate.append(box('post', (0.07, 0.07, 0.95), T(0, 0.5, z), IRON, bevel=0.01))
    gate.append(box('eye', (0.1, 0.07, 0.1), T(0, 0.62, z * 0.86), BAKELITE, bevel=0.01))
part('PhotoGate', gate, (0.0, 0, 1.9))
# WeightStand: giá cất quả cân đĩa, hai chốt; gốc ở mặt bàn giữa giá
stand_w = [box('plate', (1.0, 0.45, 0.04), T(0, 0.02, 0), WOOD, bevel=0.01)]
for x in (-0.25, 0.25):
    stand_w.append(cyl('peg', 0.016, 0.42, T(x, 0.25, 0), CHROME, bevel=0))
part('WeightStand', stand_w, (1.6, 0, 1.6))

export_glb('phys-parts.glb')
preview((0.2, 4.6, 8.2), (0, 0.9, -0.6), lens=34)
