"""
Cấu tạo máy của nhóm Kĩ thuật – Công nghệ ở /lab (engines/families/HandsEngOps3D.ts): bộ vi sai ô tô, động cơ phản lực micro
cắt bổ, động cơ Stirling kiểu alpha, cùng các cơ cấu điều khiển bằng tay (vô lăng, cần khóa, cần ga, van, bơm tay, bình khí).
Mỗi bộ phận là MỘT lưới mang tên cố định; gốc toạ độ ghi ở từng mục. Trục quay của chi tiết quay luôn đi qua gốc.
Vật liệu `tint` để cảnh nhuộm màu; `liner` (ống lửa) để cảnh làm sáng theo nhiệt độ.

Chạy:
  blender --background --python tools/lab-models/eng_parts.py -- apps/teacher-board/public/models [ảnh xem thử.png]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F401,F403

TINT = mat('tint', (0.9, 0.9, 0.9), metallic=0.3, rough=0.4)
LINER = mat('liner', hexc('#6B5A4A'), metallic=0.7, rough=0.5)
GEARM = mat('gear', (0.72, 0.6, 0.3), metallic=1, rough=0.3)
XAXIS = (0, math.radians(90), 0)  # trục z của lưới → trục x của cảnh
ZAXIS = (math.radians(90), 0, 0)  # trục z của lưới → trục z của cảnh (hướng về người xem)
D = math.radians


def part(name, objs, show):
    o = join(name, objs)
    o.location = T(*show)
    return o


def gear(name, r, teeth, width, loc, material, rot=(0, 0, 0), taper=1.0):
    """bánh răng quanh trục z của lưới; taper < 1 thì thành bánh răng côn (mặt +z nhỏ lại)"""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    n = teeth * 4
    depth = r * 0.17

    def ring(z, s):
        return [bm.verts.new(((r if i % 4 in (0, 1) else r - depth) * s * math.cos(2 * math.pi * i / n), (r if i % 4 in (0, 1) else r - depth) * s * math.sin(2 * math.pi * i / n), z)) for i in range(n)]

    a = ring(-width / 2, 1.0)
    b = ring(width / 2, taper)
    for i in range(n):
        bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    bm.faces.new(list(reversed(a)))
    bm.faces.new(b)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    o.location = loc
    o.rotation_euler = rot
    bpy.context.scene.collection.objects.link(o)
    return finish(o, material, None, 0, smooth=False)


def shell(name, profile, loc, material, rot=(0, 0, 0), angle=math.pi, steps=32, start=0.0):
    """nửa vỏ tiện tròn (cắt bổ) quanh trục z của lưới, hai mặt"""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    vs = [bm.verts.new((r * math.cos(start), r * math.sin(start), z)) for r, z in profile]
    es = [bm.edges.new((vs[i], vs[i + 1])) for i in range(len(vs) - 1)]
    bmesh.ops.spin(bm, geom=vs + es, angle=angle, steps=steps, axis=(0, 0, 1), cent=(0, 0, 0))
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    o.location = loc
    o.rotation_euler = rot
    bpy.context.scene.collection.objects.link(o)
    o.modifiers.new('thick', 'SOLIDIFY').thickness = 0.03
    return finish(o, material)


def torus(name, major, minor, loc, material, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=48, minor_segments=12, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    return finish(o, material)


# ================================================================== bộ vi sai ô tô (trục cầu dọc x, tâm vi sai ở gốc)
# Wheel: bánh xe, gốc ở tâm, trục x; bán kính 0,7, rộng 0,36
wheel = [
    lathe('tire', [(0.42, -0.18), (0.62, -0.18), (0.7, -0.1), (0.7, 0.1), (0.62, 0.18), (0.42, 0.18)], T(0, 0, 0), RUBBER, rot=XAXIS),
    lathe('rim', [(0.0, 0.05), (0.2, 0.06), (0.4, 0.12), (0.43, 0.185), (0.4, 0.19), (0.2, 0.1), (0.0, 0.09)], T(0, 0, 0), ALU, rot=XAXIS),
    lathe('rimIn', [(0.0, -0.05), (0.4, -0.1), (0.43, -0.185)], T(0, 0, 0), ALU, rot=XAXIS),
]
for i in range(5):
    a = 2 * math.pi * i / 5
    wheel.append(cyl('lug', 0.03, 0.05, T(0.11, 0.12 * math.cos(a), 0.12 * math.sin(a)), CHROME, rot=XAXIS, bevel=0.004))
    wheel.append(box('spoke', (0.03, 0.07, 0.24), T(0.105, 0.27 * math.cos(a), 0.27 * math.sin(a)), INK, bevel=0.005, rot=(-a + D(90), 0, 0)))
for i in range(18):  # vân lốp để thấy bánh đang quay
    a = 2 * math.pi * i / 18
    wheel.append(box('tread', (0.3, 0.05, 0.03), T(0, 0.7 * math.cos(a), 0.7 * math.sin(a)), IRON, bevel=0, rot=(-a + D(90), 0, 0)))
part('Wheel', wheel, (-3.6, 0.7, 2.2))

# HalfShaft: bán trục dài 1,9 về +x kèm bánh răng bán trục (côn) ở đầu trong; gốc ở tâm vi sai. Bên trái dùng bản quay 180° quanh y
part('HalfShaft', [
    cyl('shaft', 0.06, 1.75, T(1.07, 0, 0), STEEL, rot=XAXIS, bevel=0.004),
    gear('side', 0.3, 16, 0.14, T(0.23, 0, 0), GEARM, rot=(0, D(-90), 0), taper=0.62),
    cyl('flange', 0.16, 0.05, T(1.93, 0, 0), IRON, rot=XAXIS, bevel=0.006),
], (-2.2, 0.5, 2.2))

# DiffCage: vỏ vi sai (khung quay) + bánh răng vành chậu; gốc ở tâm vi sai, quay quanh x
cage = [gear('crown', 0.78, 40, 0.12, T(0.5, 0, 0), STEEL, rot=(0, D(-90), 0), taper=0.9), cyl('pin', 0.035, 0.84, T(0, 0, 0), CHROME, rot=ZAXIS, bevel=0), lathe('hubR', [(0.1, 0.36), (0.2, 0.36), (0.2, 0.56), (0.1, 0.56)], T(0, 0, 0), ORANGE, rot=XAXIS), lathe('hubL', [(0.1, -0.5), (0.2, -0.5), (0.2, -0.36), (0.1, -0.36)], T(0, 0, 0), ORANGE, rot=XAXIS)]
for z in (-0.44, 0.44):
    cage.append(box('bar', (0.9, 0.07, 0.34), T(0.02, 0, z), ORANGE, bevel=0.02))
part('DiffCage', cage, (0.0, 0.85, 2.2))

# Spider: bánh răng hành tinh (côn), gốc ở tâm, trục z, mặt nhỏ quay về −z (về phía tâm vi sai khi đặt ở z = +0,3)
part('Spider', [gear('planet', 0.21, 11, 0.13, T(0, 0, 0), mat('spider', hexc('#C4261A'), metallic=0.7, rough=0.35), rot=(D(-90), 0, 0), taper=0.62), box('markS', (0.3, 0.012, 0.04), T(0, 0, 0.066), WHITE, bevel=0)], (1.3, 0.3, 2.2))

# DrivePinion: bánh răng quả dứa + trục các-đăng dài 1,5 về −z; gốc ở tâm bánh răng, trục z
part('DrivePinion', [gear('pinion', 0.2, 10, 0.2, T(0, 0, 0), GEARM, rot=(D(-90), 0, 0), taper=0.7), cyl('prop', 0.055, 1.5, T(0, 0, -0.85), STEEL, rot=ZAXIS, bevel=0.004), cyl('yoke', 0.11, 0.12, T(0, 0, -1.6), IRON, rot=ZAXIS, bevel=0.008)], (2.2, 0.4, 2.6))

# AxleStand: hai giá đỡ bán trục (tâm trục cao 0,85); gốc ở mặt bàn dưới tâm vi sai
stand = [box('rail', (3.6, 0.5, 0.05), T(0, 0.025, 0), IRON, bevel=0.01)]
for x in (-1.45, 1.45):
    stand.append(box('post', (0.14, 0.3, 0.72), T(x, 0.39, 0), IRON, bevel=0.015))
    stand.append(lathe('bearing', [(0.07, -0.09), (0.13, -0.09), (0.13, 0.09), (0.07, 0.09), (0.07, -0.09)], T(x, 0.85, 0), BRASS, rot=XAXIS))
part('AxleStand', stand, (0.0, 0, 3.6))

# SteeringWheel: vô lăng, gốc ở tâm, mặt vô lăng vuông góc trục z (quay về người xem); vạch đỏ ở đỉnh để thấy góc lái
sw = [torus('rimS', 0.46, 0.045, T(0, 0, 0), BAKELITE, rot=ZAXIS), cyl('hubS', 0.11, 0.08, T(0, 0, 0), IRON, rot=ZAXIS, bevel=0.01), box('top', (0.07, 0.1, 0.1), T(0, 0.46, 0), RED, bevel=0.02)]
for a in (D(90), D(210), D(330)):
    sw.append(box('spk', (0.05, 0.04, 0.38), T(0.25 * math.cos(a), -0.25 * math.sin(a), 0), IRON, bevel=0.008, rot=(0, a + D(90), 0)))
part('SteeringWheel', sw, (-3.6, 0.6, 3.6))
# SteeringColumn: trụ lái, gốc ở tâm vô lăng, kéo về −z
part('SteeringColumn', [cyl('col', 0.05, 0.9, T(0, 0, -0.47), STEEL, rot=ZAXIS, bevel=0), box('foot', (0.5, 0.2, 0.4), T(0, -0.1, -0.9), IRON, bevel=0.02)], (-2.6, 0.6, 3.6))

# LockLever: cần khóa vi sai, gốc ở chốt xoay, cần dựng lên +y dài 0,7; LockBase: đế có rãnh, gốc ở chốt
part('LockLever', [cyl('armL', 0.03, 0.7, T(0, 0.35, 0), CHROME, bevel=0), ball('knobL', 0.09, T(0, 0.74, 0), RED)], (2.4, 0.2, 3.6))
part('LockBase', [box('plateL', (0.8, 0.34, 0.08), T(0, -0.06, 0), IRON, bevel=0.015), cyl('pivotL', 0.06, 0.2, T(0, 0, 0), BRASS, rot=ZAXIS, bevel=0.006)], (3.3, 0.2, 3.6))

# ================================================================== động cơ phản lực micro cắt bổ (trục x, gốc ở tâm trục giữa máy)
# JetCasing: nửa vỏ dưới–sau (cắt bổ để nhìn thấy bên trong), dài từ x = −1,7 tới 1,7
part('JetCasing', [shell('skin', [(0.72, -1.7), (0.6, -1.5), (0.62, -1.0), (0.66, -0.6), (0.66, 0.55), (0.5, 0.95), (0.36, 1.7)], T(0, 0, 0), ALU, rot=XAXIS, start=D(-45)), box('foot1', (0.12, 0.9, 0.5), T(-0.9, -0.85, 0), IRON, bevel=0.015), box('foot2', (0.12, 0.9, 0.5), T(0.6, -0.85, 0), IRON, bevel=0.015), box('skid', (2.4, 1.0, 0.06), T(-0.15, -1.07, 0), IRON, bevel=0.015)], (-2.6, 1.1, -0.2))
# Impeller: bánh công tác máy nén li tâm; gốc ở tâm, trục x, mặt hút quay về −x
imp = [lathe('hubI', [(0.0, -0.32), (0.1, -0.3), (0.16, -0.12), (0.34, 0.02), (0.56, 0.08), (0.56, 0.12), (0.0, 0.12)], T(0, 0, 0), ALU, rot=XAXIS)]
for i in range(12):
    a = 2 * math.pi * i / 12
    imp.append(box('blade', (0.36, 0.014, 0.4), T(-0.1, 0.34 * math.cos(a), 0.34 * math.sin(a)), CHROME, bevel=0, rot=(-a + D(90) + 0.5, 0, 0.35)))
part('Impeller', imp, (-0.6, 0.7, -0.2))
# TurbineWheel: đĩa tuabin một tầng; gốc ở tâm, trục x
tw = [cyl('disc', 0.34, 0.12, T(0, 0, 0), STEEL, rot=XAXIS, bevel=0.01), lathe('coneT', [(0.0, 0.3), (0.12, 0.06), (0.2, 0.06)], T(0, 0, 0), STEEL, rot=XAXIS)]
for i in range(22):
    a = 2 * math.pi * i / 22
    tw.append(box('vane', (0.11, 0.02, 0.2), T(0, 0.43 * math.cos(a), 0.43 * math.sin(a)), COPPER, bevel=0, rot=(-a + D(90), 0, 0.6)))
part('TurbineWheel', tw, (0.7, 0.6, -0.2))
# JetShaft: trục nối máy nén với tuabin, dài 1,9, gốc ở giữa
part('JetShaft', [cyl('shaftJ', 0.06, 1.9, T(0, 0, 0), CHROME, rot=XAXIS, bevel=0)], (1.9, 0.2, -0.2))
# Combustor: ống lửa hình vành khăn, gốc ở tâm, dài 1,0 dọc x; vật liệu `liner` sáng lên theo nhiệt độ
comb = [lathe('flame', [(0.5, -0.5), (0.56, -0.42), (0.56, 0.42), (0.46, 0.5), (0.3, 0.5), (0.2, 0.42), (0.2, -0.42), (0.26, -0.5), (0.5, -0.5)], T(0, 0, 0), LINER, rot=XAXIS)]
for i in range(8):
    a = 2 * math.pi * i / 8
    comb.append(cyl('inj', 0.025, 0.2, T(-0.58, 0.38 * math.cos(a), 0.38 * math.sin(a)), BRASS, rot=XAXIS, bevel=0))
part('Combustor', comb, (2.9, 0.7, -0.2))

# ThrottleBase: máng cần ga, gốc ở chốt xoay; ThrottleLever: cần ga dựng +y dài 0,75, tay nắm `tint`
part('ThrottleBase', [box('quad', (0.3, 1.1, 0.14), T(0, -0.05, 0), IRON, bevel=0.02), cyl('pivT', 0.05, 0.36, T(0, 0, 0), BRASS, rot=XAXIS, bevel=0.006)], (-3.6, 0.2, -1.8))
part('ThrottleLever', [box('armT', (0.05, 0.05, 0.75), T(0, 0.37, 0), CHROME, bevel=0.01), box('gripT', (0.3, 0.14, 0.14), T(0, 0.8, 0), TINT, bevel=0.04)], (-2.9, 0.2, -1.8))
# FuelValve: thân van trên ống nhiên liệu, gốc ở mặt bàn dưới trục van; ValveWheel: tay van, gốc ở tâm, trục y
part('FuelValve', [cyl('pipeF', 0.05, 1.2, T(0, 0.25, 0), COPPER, rot=XAXIS, bevel=0), lathe('bodyF', [(0.0, 0.1), (0.14, 0.12), (0.16, 0.25), (0.14, 0.38), (0.06, 0.42), (0.04, 0.62), (0.0, 0.62)], T(0, 0, 0), BRASS), box('footF', (0.5, 0.3, 0.1), T(0, 0.05, 0), IRON, bevel=0.015)], (-1.8, 0, -1.8))
vw = [torus('rimV', 0.22, 0.03, T(0, 0, 0), RED), cyl('hubV', 0.05, 0.06, T(0, 0, 0), IRON, bevel=0.006), ball('mark', 0.045, T(0.22, 0.02, 0), WHITE)]
for a in (0, D(120), D(240)):
    vw.append(box('spkV', (0.2, 0.03, 0.02), T(0.11 * math.cos(a), 0, 0.11 * math.sin(a)), RED, bevel=0.004, rot=(0, 0, -a)))
part('ValveWheel', vw, (-0.9, 0.66, -1.8))

# ================================================================== động cơ Stirling kiểu alpha
# StirCyl: xi-lanh thủy tinh dài 1,6 về +x, gốc ở tâm đáy kín (đầu −x); StirHotCap: chụp đồng nhận nhiệt; StirFins: cánh tản nhiệt bọc xi-lanh lạnh
part('StirCyl', [lathe('wallC', [(0.0, 0.0), (0.42, 0.0), (0.45, 0.03), (0.45, 1.56), (0.52, 1.56), (0.52, 1.6), (0.41, 1.6), (0.41, 0.04), (0.0, 0.04)], T(0, 0, 0), GLASS, rot=XAXIS)], (-0.2, 0.5, -1.8))
part('StirHotCap', [lathe('capH', [(0.0, -0.06), (0.4, -0.06), (0.49, 0.0), (0.49, 0.5), (0.46, 0.5), (0.46, 0.0), (0.0, 0.0)], T(0, 0, 0), COPPER, rot=XAXIS)], (1.9, 0.5, -1.8))
fins = []
for i in range(7):
    fins.append(lathe('fin', [(0.46, 0.0), (0.72, 0.0), (0.72, 0.025), (0.46, 0.025)], T(0.06 + i * 0.1, 0, 0), ALU, rot=XAXIS))
part('StirFins', fins, (2.9, 0.75, -1.8))
# StirPiston: pít-tông, gốc ở tâm, trục x, chốt về +x
part('StirPiston', [cyl('pist', 0.4, 0.36, T(0, 0, 0), ALU, rot=XAXIS, bevel=0.012), cyl('ring1', 0.405, 0.03, T(-0.1, 0, 0), IRON, rot=XAXIS, bevel=0), cyl('wrist', 0.05, 0.3, T(0.24, 0, 0), CHROME, rot=ZAXIS, bevel=0)], (-3.6, 0.45, -3.2))
# Flywheel: bánh đà bán kính 0,7 có nan và quả đối trọng, gốc ở tâm, trục z
fw = [lathe('rimF', [(0.58, -0.07), (0.7, -0.07), (0.7, 0.07), (0.58, 0.07), (0.58, -0.07)], T(0, 0, 0), IRON, rot=ZAXIS), cyl('hubF', 0.12, 0.2, T(0, 0, 0), BRASS, rot=ZAXIS, bevel=0.008), box('weight', (0.3, 0.1, 0.16), T(0, -0.46, 0), BRASS, bevel=0.02)]
for i in range(6):
    a = 2 * math.pi * i / 6
    fw.append(box('nan', (0.06, 0.05, 0.5), T(0.34 * math.cos(a), 0.34 * math.sin(a), 0), ORANGE if i == 0 else IRON, bevel=0.008, rot=(0, -a + D(90), 0)))
part('Flywheel', fw, (-2.4, 0.7, -3.2))
# StirFrame: đế gỗ + hai gối đỡ trục khuỷu (trục khuỷu dọc z, cao 0,7, tại x = 0); gốc ở mặt bàn dưới trục khuỷu
frame = [box('baseS', (4.6, 2.6, 0.08), T(-1.3, 0.04, 0), WOOD, bevel=0.02), cyl('crankS', 0.045, 2.5, T(0, 0.7, 0), CHROME, rot=ZAXIS, bevel=0)]
for z in (-1.05, 1.05):
    frame.append(box('gối', (0.16, 0.14, 0.72), T(0, 0.4, z), IRON, bevel=0.015))
for z in (-0.6, 0.6):  # gối kê xi-lanh
    frame.append(box('cradle', (0.2, 0.9, 0.2), T(-2.9, 0.17, z), IRON, bevel=0.02))
    frame.append(box('cradle2', (0.2, 0.9, 0.2), T(-1.7, 0.17, z), IRON, bevel=0.02))
part('StirFrame', frame, (0.6, 0, -3.4))
# CrankDisc: đĩa khuỷu bán kính 0,25 có chốt lệch tâm 0,2; gốc ở tâm, trục z
part('CrankDisc', [cyl('cdisc', 0.26, 0.06, T(0, 0, 0), STEEL, rot=ZAXIS, bevel=0.008), cyl('cpin', 0.04, 0.16, T(0.2, 0, 0.08), CHROME, rot=ZAXIS, bevel=0)], (2.4, 0.3, -3.2))
# HandPump: thân bơm tay đứng, gốc ở mặt bàn; PumpHandle: cán chữ T, gốc ở đầu ti bơm (đi lên xuống theo y)
part('HandPump', [cyl('barrelP', 0.11, 1.0, T(0, 0.55, 0), mat('pumpred', hexc('#C4261A'), metallic=0.4, rough=0.4), bevel=0.01), box('footP', (0.6, 0.3, 0.05), T(0, 0.025, 0), IRON, bevel=0.01), tube('hoseP', [T(0.1, 0.1, 0), T(0.5, 0.06, 0), T(0.9, 0.06, 0.2), T(1.3, 0.3, 0.3)], 0.025, RUBBER)], (3.4, 0, -3.2))
part('PumpHandle', [cyl('rodP', 0.02, 0.7, T(0, -0.3, 0), CHROME, bevel=0), cyl('gripP', 0.04, 0.5, T(0, 0.06, 0), BAKELITE, rot=XAXIS, bevel=0.01)], (3.4, 1.6, -2.4))
# GasBottle: bình khí nhỏ cao 1,0, gốc ở tâm đáy; thân mang `tint`
part('GasBottle', [lathe('bodyG', [(0.0, 0.0), (0.2, 0.0), (0.22, 0.03), (0.22, 0.7), (0.16, 0.84), (0.07, 0.88), (0.07, 0.94)], T(0, 0, 0), TINT), cyl('valveG', 0.05, 0.1, T(0, 0.98, 0), BRASS, bevel=0.006), box('tapG', (0.2, 0.04, 0.04), T(0, 1.04, 0), BRASS, bevel=0.008)], (3.6, 0, 2.4))
# Gauge: đồng hồ áp suất, gốc ở tâm mặt số (mặt quay về +z); GaugeNeedle: kim, gốc ở tâm, trục z, chỉ lên +y
ga = [cyl('caseG', 0.3, 0.1, T(0, 0, -0.05), BRASS, rot=ZAXIS, bevel=0.01), cyl('faceG', 0.27, 0.004, T(0, 0, 0.001), PAPER, rot=ZAXIS, bevel=0), cyl('stemG', 0.04, 0.3, T(0, -0.42, -0.05), BRASS, bevel=0)]
for i in range(11):
    a = D(225 - i * 27)
    ga.append(box('tickG', (0.012, 0.004, 0.05 if i % 5 == 0 else 0.03), T(0.22 * math.cos(a), 0.22 * math.sin(a), 0.004), INK, bevel=0, rot=(0, -a + D(90), 0)))
part('Gauge', ga, (2.6, 0.8, 2.4))
part('GaugeNeedle', [box('needleG', (0.014, 0.004, 0.22), T(0, 0.09, 0.008), RED, bevel=0), cyl('capN', 0.025, 0.012, T(0, 0, 0.01), INK, rot=ZAXIS, bevel=0)], (1.9, 0.8, 2.4))

export_glb('eng-parts.glb')
preview((0.2, 6.2, 9.4), (0, 0.5, 0.2), lens=30)
