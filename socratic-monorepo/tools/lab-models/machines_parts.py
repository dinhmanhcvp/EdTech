"""
Chi tiết của năm máy trong bài tháo lắp của /lab (engines/families/HandsMachines.ts): động cơ điện ba pha (cắt bổ), động cơ xăng 4 kì một xi-lanh,
cánh tay robot 3 bậc, drone 4 cánh, máy tính để bàn. Mỗi chi tiết là MỘT lưới mang tên cố định; GỐC toạ độ trùng điểm đặt ("home") của chi tiết trong
cảnh, kích thước bám đúng hình khối thay thế cũ nên đổi qua lại không lệch. Phần đứng yên của máy (khung, đế, thùng máy) là một lưới riêng.
Vật liệu `tint` để cảnh nhuộm (cánh drone thuận / ngược). Vít không nằm trong mô hình: cảnh đặt vít thật lên mặt trên của từng chi tiết.

Quy ước dụng cụ dựng: trục động cơ điện dọc x; động cơ xăng đứng theo y, trục khuỷu dọc z; robot đứng theo y; drone và máy tính nằm trong mặt xz.

Chạy (tuỳ chọn CAM="x,y,z,tx,ty,tz" để chọn góc ảnh xem thử):
  blender --background --python tools/lab-models/machines_parts.py -- apps/teacher-board/public/models [ảnh xem thử.png]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F401,F403

D = math.radians
XAXIS = (0, D(90), 0)
ZAXIS = (D(90), 0, 0)
TINT = mat('tint', (0.9, 0.9, 0.9), metallic=0.1, rough=0.45)
MBLUE = mat('motorblue', hexc('#27527A'), metallic=0.3, rough=0.45)
MBLUE2 = mat('motorblue2', hexc('#2C5E8C'), metallic=0.3, rough=0.42)
GRAYC = mat('graycast', hexc('#8A9099'), metallic=0.45, rough=0.55)
DGRAY = mat('dgray', hexc('#3A3F47'), metallic=0.5, rough=0.45)
LGRAY = mat('lgray', hexc('#C9CED6'), metallic=0.85, rough=0.3)
PCBG = mat('pcbgreen', hexc('#1B3A2B'), rough=0.55)
BLACKP = mat('blackplastic', hexc('#15171B'), rough=0.5)
GOLD = mat('goldpin', hexc('#D6A93A'), metallic=1, rough=0.3)
CARBON = mat('carbon', hexc('#1F2329'), metallic=0.3, rough=0.45)
SERVO = mat('servoblue', hexc('#1E2A4A'), rough=0.4)
ALUO = mat('aluorange', hexc('#E08A2B'), metallic=0.7, rough=0.35)
OLED = mat('orangep', hexc('#D9481C'), rough=0.5)
ACRYL = mat('acrylic', (0.62, 0.83, 1.0), rough=0.12, alpha=0.3)
YEL = mat('yellowband', hexc('#E3B341'), rough=0.5)
GREEN = mat('boardgreen', hexc('#1F7A4D'), rough=0.5)
CASEC = mat('casedark', hexc('#1E2228'), metallic=0.5, rough=0.5)
CABLEO = mat('cableorange', hexc('#D9481C'), rough=0.6)
EXPORT_ALL = True


def X(name, r, L, x, material, y=0, z=0, bevel=0.003, r2=None, seg=40):
    return cyl(name, r, L, T(x, y, z), material, rot=XAXIS, bevel=bevel, r2=r2, seg=seg)


def Y(name, r, h, x, y, z, material, bevel=0.003, r2=None, seg=40):
    return cyl(name, r, h, T(x, y, z), material, bevel=bevel, r2=r2, seg=seg)


def Z(name, r, L, x, y, z, material, bevel=0.003, seg=40):
    return cyl(name, r, L, T(x, y, z), material, rot=ZAXIS, bevel=bevel, seg=seg)


def B(name, sx, sy, sz, x, y, z, material, bevel=0.006, rot=(0, 0, 0)):
    return box(name, (sx, sz, sy), T(x, y, z), material, bevel=bevel, rot=rot)


def shell(name, profile, loc, material, rot=(0, 0, 0), angle=math.pi, steps=40, start=0.0, thick=0.03):
    """vỏ tiện tròn cắt bổ (một phần góc), dày `thick`; profile = [(bán kính, vị trí dọc trục)]"""
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
    o.modifiers.new('thick', 'SOLIDIFY').thickness = thick
    return finish(o, material)


CURSOR = {}


def part(name, objs, row, gap=0.35):
    """đặt chi tiết vào lưới xem thử theo hàng (không ảnh hưởng GLB: cảnh đặt lại gốc về 0)"""
    o = join(name, objs)
    x = CURSOR.get(row, -4.5)
    o.location = T(x + 0.5, 0.0, row)
    CURSOR[row] = x + 1.4 + gap
    return o


def ringpts(n, r):
    return [(r * math.cos(2 * math.pi * i / n), r * math.sin(2 * math.pi * i / n)) for i in range(n)]


# ================================================================== 1. ĐỘNG CƠ ĐIỆN BA PHA (trục dọc x)
R_M = -7.0
OPEN = D(265)  # góc bắt đầu phần vỏ còn lại: miệng cắt bổ (80°) hướng lên trên và về phía người xem
fins = [(0.42, -0.65)]
for i in range(13):
    x0 = -0.54 + i * 0.09
    fins += [(0.42, x0 - 0.0), (0.47, x0), (0.47, x0 + 0.035), (0.42, x0 + 0.035)]
fins.append((0.42, 0.65))
stator = [B('base', 2.0, 0.08, 1.25, 0, -0.54, 0, IRON, bevel=0.012), B('footL', 0.22, 0.2, 1.05, -0.42, -0.42, 0, MBLUE), B('footR', 0.22, 0.2, 1.05, 0.42, -0.42, 0, MBLUE),
          shell('housing', fins, T(0, 0, 0), MBLUE2, rot=XAXIS, angle=D(280), start=OPEN),
          shell('core', [(0.37, -0.5), (0.37, 0.5)], T(0, 0, 0), GRAYC, rot=XAXIS, angle=D(280), start=OPEN, thick=0.04),
          B('terminal', 0.42, 0.16, 0.38, 0, 0.49, 0, MBLUE), Y('gland', 0.05, 0.1, 0.12, 0.62, 0.05, BLACKP),
          B('plate', 0.3, 0.12, 0.012, -0.2, 0.2, 0.5, CREAM, bevel=0.002)]
for sx in (-1, 1):
    stator.append(cyl('wind', 0.05, 0.3, T(sx * 0.56, 0, 0), COPPER, rot=XAXIS, bevel=0.003, r2=0.055))
    for k in range(18):
        a = 2 * math.pi * k / 18
        stator.append(B('coil', 0.05, 0.03, 0.045, sx * 0.56, 0.35 * math.cos(a), 0.35 * math.sin(a), COPPER, bevel=0.003, rot=(-a, 0, 0)))
part('MotorStator', stator, R_M)

cowl = [shell('wall', [(0.45, -0.11), (0.45, 0.11)], T(0, 0, 0), DGRAY, rot=XAXIS, angle=D(360), start=0)]
cowl.append(X('face', 0.45, 0.012, -0.11, DGRAY))
for r in (0.12, 0.22, 0.32, 0.4):
    cowl.append(cyl('ring', r, 0.02, T(-0.125, 0, 0), BLACKP, rot=XAXIS, bevel=0.002))
for k in range(12):
    a = 2 * math.pi * k / 12
    cowl.append(B('slot', 0.014, 0.02, 0.36, -0.125, 0.26 * math.cos(a), 0.26 * math.sin(a), BLACKP, bevel=0.002, rot=(-a, 0, 0)))
for k in range(4):
    a = D(45 + 90 * k)
    cowl.append(B('lug', 0.05, 0.06, 0.04, 0.09, 0.43 * math.cos(a), 0.43 * math.sin(a), DGRAY, bevel=0.004, rot=(-a, 0, 0)))
part('MotorCowl', cowl, R_M)

fanm = [X('hub', 0.09, 0.1, 0, WHITE), X('boss', 0.045, 0.14, 0, STEEL)]
for k in range(7):
    a = 2 * math.pi * k / 7
    fanm.append(B('blade', 0.025, 0.28, 0.12, 0, 0.21 * math.cos(a), 0.21 * math.sin(a), WHITE, bevel=0.004, rot=(-a, D(20), 0)))
part('MotorFan', fanm, R_M)


def endshield(sign):
    prof = [(0.07, -0.07 * sign), (0.43, -0.07 * sign), (0.43, 0.07 * sign), (0.36, 0.07 * sign), (0.12, 0.03 * sign), (0.07, 0.03 * sign)] if sign > 0 else [(0.07, 0.07), (0.43, 0.07), (0.43, -0.07), (0.36, -0.07), (0.12, -0.03), (0.07, -0.03)]
    objs = [lathe('cap', prof, T(0, 0, 0), MBLUE, rot=XAXIS)]
    for k in range(4):
        a = D(45 + 90 * k)
        objs.append(B('ear', 0.1, 0.1, 0.07, 0, 0.45 * math.cos(a), 0.45 * math.sin(a), MBLUE, bevel=0.01, rot=(-a, 0, 0)))
        objs.append(cyl('bolthole', 0.022, 0.012, T(0.052 * sign, 0.46 * math.cos(a), 0.46 * math.sin(a)), BLACKP, rot=XAXIS, bevel=0, seg=16))
    for k in range(8):  # gân tăng cứng
        a = 2 * math.pi * k / 8
        objs.append(B('rib', 0.03, 0.2, 0.025, 0.04 * sign, 0.26 * math.cos(a), 0.26 * math.sin(a), MBLUE, bevel=0.004, rot=(-a, 0, 0)))
    return objs


part('MotorRearShield', endshield(-1), R_M)
part('MotorFrontShield', endshield(1), R_M)
brg = [lathe('outer', [(0.1, -0.03), (0.14, -0.03), (0.14, 0.03), (0.1, 0.03)], T(0, 0, 0), LGRAY, rot=XAXIS), lathe('inner', [(0.07, -0.03), (0.1, -0.03), (0.1, 0.03), (0.07, 0.03)], T(0, 0, 0), STEEL, rot=XAXIS)]
for k in range(9):
    a = 2 * math.pi * k / 9
    brg.append(ball('ball', 0.02, T(0, 0.12 * math.cos(a), 0.12 * math.sin(a)), CHROME))
part('MotorBearing', brg, R_M)

pul = [lathe('sheave', [(0.09, -0.06), (0.27, -0.06), (0.27, -0.03), (0.2, 0), (0.27, 0.03), (0.27, 0.06), (0.09, 0.06)], T(0, 0, 0), LGRAY, rot=XAXIS), X('bore', 0.05, 0.14, 0, STEEL)]
for k in range(3):
    a = 2 * math.pi * k / 3
    pul.append(B('tab', 0.13, 0.05, 0.12, 0, 0.27 * math.cos(a), 0.27 * math.sin(a), OLED, bevel=0.005, rot=(-a, 0, 0)))
pul.append(B('key', 0.05, 0.02, 0.02, 0, 0.05, 0, DGRAY, bevel=0.002))
part('MotorPulley', pul, R_M)

bc = [B('lid', 0.44, 0.05, 0.4, 0, 0, 0, MBLUE, bevel=0.01), B('gasket', 0.46, 0.012, 0.42, 0, -0.03, 0, BLACKP, bevel=0.002), B('label', 0.18, 0.004, 0.08, 0, 0.027, 0, CREAM, bevel=0.001)]
for sx in (-1, 1):
    for sz in (-1, 1):
        bc.append(Y('boss', 0.03, 0.018, sx * 0.17, 0.03, sz * 0.15, DGRAY, seg=16))
part('MotorBoxCover', bc, R_M)

rot_ = [X('shaft', 0.07, 2.3, 0.17, CHROME, bevel=0.004), X('core', 0.29, 0.9, 0, LGRAY, bevel=0.004)]
for sx in (-1, 1):
    rot_.append(X('endring', 0.3, 0.06, sx * 0.48, LGRAY, bevel=0.006))
for k in range(18):
    a = 2 * math.pi * k / 18
    rot_.append(B('bar', 0.9, 0.012, 0.03, 0, 0.292 * math.cos(a), 0.292 * math.sin(a), DGRAY, bevel=0.002, rot=(-a, 0, 0)))
for k in range(6):  # cánh quạt đầu rôto
    a = 2 * math.pi * k / 6
    rot_.append(B('vane', 0.05, 0.1, 0.03, 0.53, 0.25 * math.cos(a), 0.25 * math.sin(a), LGRAY, bevel=0.003, rot=(-a, 0, 0)))
part('MotorRotor', rot_, R_M)

# ================================================================== 2. ĐỘNG CƠ XĂNG 4 KÌ (đứng theo y, trục khuỷu dọc z)
R_E = -3.5
ef = [B('plate', 1.6, 0.08, 1.3, 0, 0.04, 0, DGRAY, bevel=0.012)]
for sz in (-1, 1):
    ef.append(B('side', 0.5, 0.5, 0.1, 0, 0.25 + 0.04, sz * 0.3, GRAYC, bevel=0.012))
    ef.append(Z('bearingbossF', 0.15, 0.1, 0, 0.5, sz * 0.3, GRAYC, bevel=0.006))
for sx in (-1, 1):
    ef.append(B('post', 0.07, 1.5, 0.07, sx * 0.4, 0.75, -0.3, GRAYC, bevel=0.006))
    ef.append(B('postfoot', 0.14, 0.05, 0.14, sx * 0.4, 0.1, -0.3, DGRAY, bevel=0.006))
part('EngineFrame', ef, R_E)
part('EngineHeadCover', [B('cover', 0.56, 0.22, 0.5, 0, 0, 0, ACRYL, bevel=0.012), B('rim', 0.58, 0.02, 0.52, 0, -0.1, 0, LGRAY, bevel=0.004)] + [Y('bolthead', 0.025, 0.014, sx * 0.24, 0.115, sz * 0.21, STEEL, seg=6) for sx in (-1, 1) for sz in (-1, 1)] + [B('cap', 0.1, 0.03, 0.1, 0, 0.12, 0, ORANGE, bevel=0.006)], R_E)
spk = [Y('ceramic', 0.035, 0.26, 0, 0, 0, WHITE), Y('nut', 0.05, 0.05, 0, -0.06, 0, STEEL, seg=6), Y('terminal', 0.02, 0.1, 0, 0.18, 0, CHROME), Y('rib', 0.045, 0.012, 0, 0.06, 0, WHITE), Y('rib2', 0.045, 0.012, 0, 0.09, 0, WHITE)]
part('EngineSparkPlug', spk, R_E)
cam = [X('shaft', 0.04, 0.5, 0, CHROME), X('camA', 0.07, 0.07, -0.14, ORANGE, y=-0.03), X('camB', 0.07, 0.07, 0.14, BLUE, z=0.03), X('journal1', 0.05, 0.04, -0.24, STEEL), X('journal2', 0.05, 0.04, 0.24, STEEL), B('sprocket', 0.02, 0.2, 0.2, 0.27, 0, 0, STEEL, bevel=0.004)]
part('EngineCamshaft', cam, R_E)
head = [B('block', 0.75, 0.22, 0.34, 0, 0, -0.18, GRAYC, bevel=0.012)]
for i in range(6):
    head.append(B('fin', 0.72, 0.014, 0.1, 0, -0.1 + i * 0.035, 0.02, GRAYC, bevel=0.003))
for sx in (-1, 1):
    for sz in (-1, 1):
        head.append(Y('boss', 0.045, 0.04, sx * 0.3, 0.12, -0.18 + sz * 0.1, GRAYC, seg=20))
head.append(B('port', 0.2, 0.12, 0.05, 0, 0, -0.36, DGRAY, bevel=0.01))
part('EngineHead', head, R_E)
cylp = [shell('barrel', [(0.3, -0.35), (0.3, 0.35)], T(0, 0, 0), GRAYC, rot=(0, 0, 0), angle=D(252), start=D(324), thick=0.04)]
for i in range(5):
    cylp.append(shell('fin', [(0.3, -0.26 + i * 0.13), (0.34, -0.26 + i * 0.13), (0.34, -0.24 + i * 0.13), (0.3, -0.24 + i * 0.13)], T(0, 0, 0), GRAYC, angle=D(252), start=D(324), thick=0.02))
for sx in (-1, 1):
    cylp.append(B('flangeb', 0.1, 0.05, 0.1, sx * 0.28, -0.33, 0.24, GRAYC, bevel=0.006))
part('EngineCylinder', cylp, R_E)
pis = [Y('crown', 0.27, 0.26, 0, 0.03, 0, LGRAY, bevel=0.004), Z('pin', 0.045, 0.34, 0, -0.04, 0, CHROME)]
for y in (0.07, 0.12):
    pis.append(Y('ring', 0.274, 0.018, 0, y, 0, DGRAY, bevel=0.002))
pis.append(Y('skirtcut', 0.2, 0.02, 0, 0.1, 0, DGRAY))
part('EnginePiston', pis, R_E)
L_ = 0.55
rod = [B('beam', 0.08, L_ - 0.12, 0.05, 0, -L_ / 2, 0, BRASS, bevel=0.006), Z('small', 0.07, 0.07, 0, 0, 0, BRASS, bevel=0.004), Z('big', 0.1, 0.07, 0, -L_, 0, BRASS, bevel=0.004), Z('capb', 0.075, 0.09, 0, -L_ - 0.07, 0, STEEL, bevel=0.004)]
for sx in (-1, 1):
    rod.append(Y('rodbolt', 0.018, 0.1, sx * 0.07, -L_ - 0.05, 0.045, STEEL, seg=6))
part('EngineConRod', rod, R_E)
fw = [Z('disc', 0.42, 0.08, 0, 0, 0, DGRAY, bevel=0.006, seg=64), Z('hub', 0.1, 0.12, 0, 0, 0, STEEL), Z('rim', 0.43, 0.06, 0, 0, 0, DGRAY, bevel=0.01, seg=64)]
for i in range(3):
    a = 2 * math.pi * i / 3
    fw.append(B('mark', 0.1, 0.1, 0.09, 0.36 * math.sin(a), 0.36 * math.cos(a), 0, ORANGE, bevel=0.004))
for i in range(6):
    a = 2 * math.pi * i / 6 + D(30)
    fw.append(Z('relief', 0.07, 0.086, 0.22 * math.sin(a), 0.22 * math.cos(a), 0, BLACKP, seg=20))
part('EngineFlywheel', fw, R_E)
crk = [Z('shaft', 0.05, 0.9, 0, 0, 0, CHROME), Z('pin', 0.04, 0.14, 0, 0.16, 0, LGRAY)]
for sz in (-1, 1):
    crk.append(Z('web', 0.21, 0.04, 0, 0, sz * 0.07, GRAYC, bevel=0.004))
    crk.append(B('counterweight', 0.18, 0.12, 0.04, 0, -0.17, sz * 0.07, DGRAY, bevel=0.006))
part('EngineCrankshaft', crk, R_E)

# ================================================================== 3. CÁNH TAY ROBOT (đứng theo y)
R_R = 0.5
part('RobotBase', [B('plate', 1.7, 0.08, 1.2, 0, 0.04, 0, DGRAY, bevel=0.012)] + [Y('foot', 0.05, 0.03, sx * 0.75, 0.0, sz * 0.5, RUBBER) for sx in (-1, 1) for sz in (-1, 1)], R_R)
bs = [B('body', 0.3, 0.28, 0.3, 0, 0, 0, SERVO, bevel=0.012), Y('horn', 0.05, 0.06, 0, 0.16, 0, WHITE), B('flange', 0.38, 0.03, 0.14, 0, -0.1, 0, SERVO, bevel=0.006), B('cable', 0.04, 0.03, 0.06, 0.17, -0.1, 0, BLACKP, bevel=0.003)]
part('RobotBaseServo', bs, R_R)
tt = [Y('disc', 0.32, 0.06, 0, 0, 0, ALU, bevel=0.006, seg=60), Y('hub', 0.08, 0.04, 0, 0.04, 0, STEEL)] + [Y('holes', 0.02, 0.07, 0.24 * math.cos(a), 0, 0.24 * math.sin(a), BLACKP, seg=12) for a in [i * math.pi / 2 + D(45) for i in range(4)]]
part('RobotTurntable', tt, R_R)
ss = [B('body', 0.3, 0.28, 0.24, 0, 0, 0, SERVO, bevel=0.012), Z('horn', 0.05, 0.05, 0, 0, 0.14, WHITE), B('flange', 0.38, 0.03, 0.1, 0, -0.1, 0, SERVO, bevel=0.006)]
part('RobotShoulderServo', ss, R_R)
la = [B('plateL', 0.1, 0.74, 0.03, 0, 0, 0.15, ALUO, bevel=0.004), B('plateR', 0.1, 0.74, 0.03, 0, 0, -0.15, ALUO, bevel=0.004), B('cross', 0.08, 0.06, 0.3, 0, 0.34, 0, ALUO, bevel=0.004), B('cross2', 0.08, 0.06, 0.3, 0, -0.34, 0, ALUO, bevel=0.004)]
for y in (0.3, -0.3):
    for sz in (-1, 1):
        la.append(Z('rivet', 0.016, 0.04, 0, y, sz * 0.15, STEEL, seg=12))
part('RobotLowerArm', la, R_R)
part('RobotElbowServo', [B('body', 0.26, 0.24, 0.22, 0, 0, 0, SERVO, bevel=0.012), Z('horn', 0.045, 0.05, 0, 0, 0.12, WHITE), B('cable', 0.04, 0.04, 0.05, 0.14, -0.1, 0, BLACKP, bevel=0.003)], R_R)
fa = [B('plateL', 0.62, 0.09, 0.03, 0, 0, 0.14, ALUO, bevel=0.004), B('plateR', 0.62, 0.09, 0.03, 0, 0, -0.14, ALUO, bevel=0.004), B('cross', 0.06, 0.07, 0.28, 0.27, 0, 0, ALUO, bevel=0.004), B('cross2', 0.06, 0.07, 0.28, -0.27, 0, 0, ALUO, bevel=0.004)]
part('RobotForearm', fa, R_R)
gp = [B('body', 0.16, 0.14, 0.2, 0, 0, 0, SERVO, bevel=0.01), B('fingerL', 0.2, 0.03, 0.03, 0.16, 0, 0.07, LGRAY, bevel=0.004), B('fingerR', 0.2, 0.03, 0.03, 0.16, 0, -0.07, LGRAY, bevel=0.004), B('padL', 0.04, 0.05, 0.02, 0.27, 0, 0.055, RUBBER, bevel=0.003), B('padR', 0.04, 0.05, 0.02, 0.27, 0, -0.055, RUBBER, bevel=0.003), Y('gear', 0.04, 0.05, 0.08, 0.0, 0, STEEL)]
part('RobotGripper', gp, R_R)
rb = [B('pcb', 0.5, 0.03, 0.36, 0, 0, 0, GREEN, bevel=0.003), B('mcu', 0.14, 0.04, 0.14, -0.05, 0.03, 0, BLACKP, bevel=0.003), B('header', 0.06, 0.07, 0.24, 0.19, 0.04, 0, BLACKP, bevel=0.003), B('usb', 0.08, 0.04, 0.07, -0.23, 0.035, -0.1, LGRAY, bevel=0.003)]
for i in range(8):
    rb.append(Y('pin', 0.008, 0.04, 0.12 + 0.012 * (i % 2), 0.035, -0.1 + 0.03 * i, GOLD, seg=8))
part('RobotBoard', rb, R_R)
part('RobotBattery', [B('cell', 0.42, 0.14, 0.24, 0, 0, 0, DGRAY, bevel=0.012), B('band', 0.14, 0.145, 0.245, -0.08, 0, 0, YEL, bevel=0.006), B('plug', 0.06, 0.05, 0.1, 0.25, 0, 0, WHITE, bevel=0.004)], R_R)

# ================================================================== 4. DRONE 4 CÁNH (nằm trong mặt xz)
R_D = 4.2
A_ = 0.32
part('DronePad', [Y('pad', 0.95, 0.02, 0, 0.01, 0, DGRAY, seg=64), lathe('ring', [(0.78, 0.02), (0.82, 0.02), (0.82, 0.035), (0.78, 0.035)], T(0, 0, 0), YEL, steps=64)], R_D)
fr = [B('plate', 0.34, 0.035, 0.34, 0, 0, 0, CARBON, bevel=0.006), B('plate2', 0.3, 0.02, 0.3, 0, -0.05, 0, CARBON, bevel=0.006)]
for s in (-1, 1):
    fr.append(B('arm', 0.96, 0.03, 0.08, 0, 0, 0, CARBON, bevel=0.005, rot=(0, 0, s * D(45))))
for sx in (-1, 1):
    for sz in (-1, 1):
        fr.append(Y('standoff', 0.015, 0.2, sx * 0.2, -0.11, sz * 0.2, LGRAY, seg=12))
        fr.append(Y('foot', 0.03, 0.02, sx * 0.2, -0.22, sz * 0.2, RUBBER, seg=12))
part('DroneFrame', fr, R_D)


def motors(positions, color):
    objs = []
    for (mx, mz) in positions:
        objs += [Y('bell', 0.07, 0.1, mx, 0, mz, color, bevel=0.005, seg=32), Y('base', 0.05, 0.03, mx, -0.06, mz, LGRAY, seg=24), Y('shaft', 0.012, 0.06, mx, 0.08, mz, STEEL, seg=12)]
        for k in range(6):
            a = 2 * math.pi * k / 6
            objs.append(Y('magnet', 0.012, 0.09, mx + 0.062 * math.cos(a), 0, mz + 0.062 * math.sin(a), DGRAY, seg=8))
    return objs


part('DroneMotorsCW', motors([(A_, A_), (-A_, -A_)], OLED), R_D)
part('DroneMotorsCCW', motors([(A_, -A_), (-A_, A_)], BLUE), R_D)
prop = [B('blade1', 0.25, 0.008, 0.05, 0.125, 0, 0, TINT, bevel=0.002, rot=(D(12), 0, 0)), B('blade2', 0.25, 0.008, 0.05, -0.125, 0, 0, TINT, bevel=0.002, rot=(D(-12), 0, 0)), Y('hub', 0.03, 0.03, 0, 0, 0, WHITE, seg=24), Y('nut', 0.02, 0.02, 0, 0.02, 0, STEEL, seg=6)]
part('DroneProp', prop, R_D)
part('DroneEsc', [B('pcb', 0.26, 0.025, 0.26, 0, 0, 0, GREEN, bevel=0.003)] + [B('fet', 0.04, 0.02, 0.04, -0.08 + 0.055 * i, 0.02, -0.08 + 0.055 * j, BLACKP, bevel=0.002) for i in range(4) for j in range(2)] + [Y('cap', 0.03, 0.05, 0.09, 0.035, 0.09, DGRAY, seg=16)], R_D)
part('DroneFlightController', [B('pcb', 0.2, 0.025, 0.2, 0, 0, 0, SERVO, bevel=0.003), B('imu', 0.07, 0.03, 0.07, 0, 0.01, 0, BLACKP, bevel=0.003), B('usb', 0.05, 0.03, 0.04, 0.1, 0.01, 0, LGRAY, bevel=0.003)] + [Y('hole', 0.012, 0.03, sx * 0.09, 0, sz * 0.09, GOLD, seg=12) for sx in (-1, 1) for sz in (-1, 1)], R_D)
part('DroneReceiver', [B('body', 0.08, 0.03, 0.12, 0, 0, 0, BLACKP, bevel=0.004), Y('antenna', 0.006, 0.2, 0, 0.1, -0.05, WHITE, seg=8), B('led', 0.012, 0.004, 0.012, 0.02, 0.016, 0.03, GREEN, bevel=0)], R_D)
part('DroneLiPo', [B('cell', 0.42, 0.1, 0.18, 0, 0, 0, DGRAY, bevel=0.01), B('band', 0.12, 0.102, 0.182, 0, 0, 0, YEL, bevel=0.004), B('plug', 0.06, 0.06, 0.1, 0.25, 0, 0, YEL, bevel=0.004)], R_D)

# ================================================================== 5. MÁY TÍNH ĐỂ BÀN
R_P = 8.4
pcc = [B('floor', 2.0, 0.04, 1.6, 0, 0.02, 0, CASEC, bevel=0.008)]
for s in (-1, 1):
    pcc.append(B('wallz', 2.0, 0.4, 0.04, 0, 0.2, s * 0.8, CASEC, bevel=0.006))
    pcc.append(B('wallx', 0.04, 0.4, 1.6, s * 1.0, 0.2, 0, CASEC, bevel=0.006))
for sx in (-1, 1):
    for sz in (-1, 1):
        pcc.append(Y('standoff', 0.025, 0.03, 0.35 + sx * 0.5, 0.055, -0.3 + sz * 0.55, BRASS, seg=6))
for i in range(5):
    pcc.append(B('vent', 0.04, 0.2, 0.02, 1.0, 0.2, -0.5 + i * 0.25, BLACKP, bevel=0.002))
part('PcCase', pcc, R_P)
mb = [B('pcb', 1.2, 0.03, 1.3, 0, 0, 0, PCBG, bevel=0.004), B('socket', 0.26, 0.02, 0.26, 0, 0.02, -0.3, LGRAY, bevel=0.004), B('slotram1', 0.03, 0.03, 0.52, -0.015, 0.02, -0.3, BLACKP, bevel=0.003), B('slotram2', 0.03, 0.03, 0.52, 0.055, 0.02, -0.3, BLACKP, bevel=0.003),
      B('pcie', 0.8, 0.03, 0.04, -0.1, 0.02, 0.3, BLACKP, bevel=0.003), B('m2', 0.34, 0.015, 0.1, -0.1, 0.018, 0.1, GOLD, bevel=0.002), B('vrm', 0.1, 0.14, 0.5, -0.55, 0.07, -0.3, LGRAY, bevel=0.006),
      B('chipset', 0.16, 0.05, 0.16, 0.38, 0.04, 0.36, DGRAY, bevel=0.006), B('atx24', 0.05, 0.1, 0.3, 0.56, 0.06, 0.0, WHITE, bevel=0.004)]
for i in range(6):
    mb.append(B('vrmfin', 0.1, 0.12, 0.02, -0.55, 0.07, -0.5 + i * 0.075, LGRAY, bevel=0.002))
for sx in (-1, 1):
    for sz in (-1, 1):
        mb.append(Y('mount', 0.03, 0.012, sx * 0.55, 0.02, sz * 0.6, GOLD, seg=16))
part('PcMainboard', mb, R_P)
part('PcCpu', [B('ihs', 0.2, 0.02, 0.2, 0, 0, 0, LGRAY, bevel=0.004), B('mark', 0.06, 0.004, 0.012, 0, 0.012, 0.06, BLACKP, bevel=0.001), B('tri', 0.02, 0.004, 0.02, -0.08, 0.012, 0.08, GOLD, bevel=0.001)], R_P)
cl = [B('base', 0.3, 0.02, 0.3, 0, -0.12, 0, COPPER, bevel=0.003)]
for i in range(12):
    cl.append(B('fin', 0.3, 0.2, 0.012, 0, 0.0, -0.14 + i * 0.026, ALU, bevel=0.002))
for k in range(3):
    cl.append(Y('pipe', 0.018, 0.22, -0.1 + k * 0.1, 0.0, 0, COPPER, seg=12))
cl.append(B('shroud', 0.3, 0.02, 0.3, 0, 0.13, 0, DGRAY, bevel=0.004))
part('PcCooler', cl, R_P)
ramp = []
for x in (-0.035, 0.035):
    ramp += [B('pcb', 0.025, 0.14, 0.5, x, 0, 0, BLACKP, bevel=0.002), B('spreader', 0.03, 0.1, 0.46, x + (0.004 if x > 0 else -0.004), 0.01, 0, LGRAY, bevel=0.003)] + [B('chip', 0.028, 0.03, 0.04, x, -0.03, -0.18 + 0.12 * i, DGRAY, bevel=0.002) for i in range(4)]
    ramp.append(B('gold', 0.026, 0.014, 0.46, x, -0.075, 0, GOLD, bevel=0.001))
part('PcRam', ramp, R_P)
part('PcSsd', [B('pcb', 0.32, 0.012, 0.09, 0, 0, 0, DGRAY, bevel=0.002), B('label', 0.2, 0.014, 0.07, -0.03, 0, 0, WHITE, bevel=0.002), B('gold', 0.04, 0.012, 0.09, 0.17, 0, 0, GOLD, bevel=0.001)] + [B('chip', 0.05, 0.016, 0.06, -0.12 + 0.1 * i, 0.002, 0, BLACKP, bevel=0.002) for i in range(2)], R_P)
gp_ = [B('body', 0.9, 0.14, 0.34, 0, 0, 0, DGRAY, bevel=0.012), B('shroud', 0.9, 0.04, 0.34, 0, 0.09, 0, BLACKP, bevel=0.006), B('bracket', 0.02, 0.2, 0.06, -0.46, 0.03, 0.14, LGRAY, bevel=0.002), B('fin', 0.9, 0.02, 0.34, 0, -0.08, 0, ALU, bevel=0.002), B('pcie', 0.5, 0.02, 0.04, 0.0, -0.1, 0.2, GOLD, bevel=0.001), B('power', 0.12, 0.05, 0.05, 0.38, 0.1, -0.1, BLACKP, bevel=0.004)]
part('PcGpu', gp_, R_P)
psu = [B('box', 0.5, 0.3, 0.7, 0, 0, 0, BLACKP, bevel=0.012), B('grill', 0.34, 0.02, 0.34, 0, 0.155, 0, DGRAY, bevel=0.002), B('label', 0.26, 0.004, 0.2, 0, -0.151, 0, WHITE, bevel=0.002)]
for i in range(6):
    psu.append(B('conn', 0.04, 0.06, 0.04, -0.2 + 0.08 * i, -0.0, 0.36, GOLD, bevel=0.003))
part('PcPsu', psu, R_P)
part('PcPowerCable', [tube('c1', [T(-0.25, -0.02, 0.3), T(-0.05, 0.06, 0.25), T(0.2, 0.05, 0.1), T(0.4, -0.12, 0.05)], 0.03, CABLEO), tube('c2', [T(-0.2, -0.02, 0.28), T(0.0, 0.03, 0.2), T(0.18, 0.02, 0.08), T(0.36, -0.1, 0.0)], 0.02, BLACKP)], R_P)
part('PcSidePanel', [B('glass', 2.0, 0.02, 1.6, 0, 0, 0, mat('panelglass', (0.62, 0.83, 1.0), rough=0.1, alpha=0.16), bevel=0.004), B('frame', 2.04, 0.026, 0.04, 0, 0.001, 0.8, DGRAY, bevel=0.002), B('frame2', 2.04, 0.026, 0.04, 0, 0.001, -0.8, DGRAY, bevel=0.002)] + [Y('thumb', 0.04, 0.02, sx * 0.94, 0.02, sz * 0.74, DGRAY, seg=20) for sx in (-1, 1) for sz in (-1, 1)], R_P)
# quạt dùng chung (tản nhiệt CPU, card đồ họa, nguồn): bán kính 1, cảnh co theo bán kính từng quạt
fan = [Y('frame', 1.0, 0.1, 0, 0, 0, BLACKP, bevel=0.01, r2=1.0), Y('hub', 0.32, 0.14, 0, 0.0, 0, DGRAY, seg=24)]
for k in range(9):
    a = 2 * math.pi * k / 9
    fan.append(B('blade', 0.28, 0.08, 0.7, 0.62 * math.cos(a), 0.0, 0.62 * math.sin(a), WHITE, bevel=0.01, rot=(0, D(18), -a + D(90))))
part('PcFan', fan, R_P)

export_glb('machines-parts.glb')
cam = os.environ.get('CAM')
c = [float(v) for v in cam.split(',')] if cam else [0.0, 14.0, 5.0, 0.0, 0.0, -0.8]
preview(tuple(c[:3]), tuple(c[3:]), lens=float(os.environ.get('LENS', '32')))
