"""
Thiết bị chính của 10 bài mô phỏng /lab còn dùng hình khối three.js: sóng xung kích (hầm gió), robot bốn chân, robot phẫu thuật,
SLAM, sóng vật chất (lò, khe, màn), LIGO (khung màn hiện sóng), BEC (buồng chân không), căn chỉnh laser (laser, gương, đầu thu),
kẹp quang học (bàn kính, tháp laser), con lắc ngược (ray, xe). Mỗi thiết bị là MỘT lưới mang tên cố định (hợp đồng trong `labModels.test.ts`);
gốc toạ độ ghi ở từng mục, đơn vị và trục theo three.js.

Chạy:
  blender --background --python tools/lab-models/sims2_parts.py -- apps/teacher-board/public/models [ảnh xem thử.png]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F401,F403

YELLOW = mat('yellow', hexc('#E3B341'), rough=0.45)
GREEN = mat('green', hexc('#1F7A4D'), rough=0.5)
SILVER = mat('silver', (0.9, 0.9, 0.88), metallic=1, rough=0.25)
SCREEN = mat('screen', hexc('#0B0F14'), rough=0.15)
XAXIS = (0, math.radians(90), 0)  # trục z của lưới -> +x
ZAXIS = (math.radians(90), 0, 0)  # trục z của lưới -> +z của three.js (về phía người ngồi)
FRONT = (math.radians(90), 0, 0)


def part(name, objs, show):
    o = join(name, objs)
    o.location = T(*show)
    return o


def torus(name, major, minor, loc, material, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=48, minor_segments=12, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    return finish(o, material)


def frame(name, w, d, h, t, loc, material, bevel=0.01):
    """khung chữ nhật rỗng: w dọc x, d dọc z (three.js), cao h, dày t; loc là tâm đáy"""
    x, y, z = loc
    return [
        box(name, (w, t, h), (x, y - 0 + (d - t) / 2, z + h / 2), material, bevel=bevel),
        box(name, (w, t, h), (x, y - (d - t) / 2, z + h / 2), material, bevel=bevel),
        box(name, (t, d - 2 * t, h), (x + (w - t) / 2, y, z + h / 2), material, bevel=bevel),
        box(name, (t, d - 2 * t, h), (x - (w - t) / 2, y, z + h / 2), material, bevel=bevel),
    ]


# ================================================================== sóng xung kích: hầm gió
# WindTunnel: gốc ở mặt bàn, giữa buồng thử (đặt ở z = Z); buồng dài 6,5 (x từ −3,0 đến +3,5), rộng 2,92; cửa kính hai bên cao 0,55, miệng thu loe ở −x
tun = []
for sz in (-1, 1):
    tun.append(box('window', (6.5, 0.03, 0.55), T(0.25, 0.275, sz * 1.46), GLASS, bevel=0))
    tun.append(box('rail', (6.56, 0.05, 0.04), T(0.25, 0.57, sz * 1.46), ALU, bevel=0.008))
    tun.append(box('sill', (6.56, 0.07, 0.03), T(0.25, 0.015, sz * 1.46), ALU, bevel=0.008))
    for i in range(7):
        tun.append(box('post', (0.05, 0.07, 0.58), T(-3.0 + i * 1.083, 0.29, sz * 1.46), ALU, bevel=0.008))
    tun.append(box('flare', (0.62, 0.03, 0.55), T(-3.32, 0.275, sz * 1.62), CASE, bevel=0.004, rot=(0, 0, math.radians(-sz * 20))))
for i in range(5):
    tun.append(box('vane', (0.5, 0.01, 0.5), T(-3.32, 0.27, -0.9 + i * 0.45), CHROME, bevel=0))
tun.append(box('gaugeBox', (0.8, 0.22, 0.12), T(3.0, 0.07, 1.75), CASE, bevel=0.02))
for i in range(2):
    tun.append(cyl('gauge', 0.075, 0.03, T(2.8 + i * 0.4, 0.07, 1.82), INK, rot=ZAXIS))
    tun.append(cyl('gaugeRing', 0.085, 0.015, T(2.8 + i * 0.4, 0.07, 1.84), CHROME, rot=ZAXIS))
part('WindTunnel', tun, (-3.2, 0, 1.5))

# ================================================================== robot bốn chân
# QuadBody: gốc ở tâm thân (1,7 dọc x, rộng 0,8, dày 0,3); đầu cảm biến ở +x
body = [
    box('shell', (1.7, 0.8, 0.3), T(0, 0, 0), YELLOW, bevel=0.05),
    box('deck', (1.4, 0.6, 0.02), T(0, 0.16, 0), DARK, bevel=0.01),
    box('battery', (0.7, 0.3, 0.08), T(-0.2, 0.2, 0), ORANGE, bevel=0.02),
    box('imu', (0.18, 0.18, 0.05), T(0.35, 0.195, 0), INK, bevel=0.006),
    box('sensor', (0.12, 0.34, 0.12), T(0.88, 0.03, 0), INK, bevel=0.02),
    cyl('lens', 0.04, 0.02, T(0.95, 0.03, 0), BLUE, rot=XAXIS),
]
for sx in (-1, 1):
    for sz in (-1, 1):
        body.append(cyl('hip', 0.09, 0.2, T(sx * 0.7, -0.05, sz * 0.46), IRON, rot=ZAXIS))
        body.append(cyl('hipCap', 0.045, 0.03, T(sx * 0.7, -0.05, sz * 0.58), CHROME, rot=ZAXIS))
part('QuadBody', body, (-2.4, 0.9, 0.5))
# QuadLeg: gốc ở giữa chân dài 1 (dọc y): đùi trên, khớp gối, cẳng dưới, bàn chân cao su
leg = [
    cyl('thigh', 0.055, 0.5, T(0, 0.27, 0), ALU, bevel=0.004),
    ball('knee', 0.085, T(0, 0, 0), IRON),
    cyl('shin', 0.04, 0.42, T(0, -0.22, 0), ALU, bevel=0.004),
    ball('foot', 0.08, T(0, -0.43, 0), RUBBER),
    box('linkage', (0.03, 0.03, 0.34), T(0.075, 0.12, 0), STEEL, bevel=0.004),
]
part('QuadLeg', leg, (-1.4, 0.5, 0.5))

# ================================================================== robot phẫu thuật
# SurgeryJoystick: tay điều khiển của bác sĩ; gốc ở mặt bàn, giữa đế
js = [
    lathe('base', [(0, 0), (0.34, 0), (0.36, 0.03), (0.3, 0.1), (0.2, 0.12), (0, 0.12)], T(0, 0, 0), BAKELITE),
    lathe('boot', [(0.2, 0.12), (0.16, 0.2), (0.07, 0.3), (0.05, 0.3)], T(0, 0, 0), RUBBER),
    cyl('stick', 0.035, 0.45, T(0, 0.5, 0), CHROME, bevel=0),
    lathe('grip', [(0, 0), (0.08, 0.01), (0.1, 0.06), (0.09, 0.2), (0.06, 0.26), (0, 0.27)], T(0, 0.7, 0), BLUE),
    cyl('trigger', 0.02, 0.07, T(0.085, 0.82, 0), RED, rot=XAXIS),
]
for i in range(3):
    js.append(cyl('led', 0.016, 0.008, T(-0.22 + i * 0.06, 0.125, 0.28), [LED, YELLOW, RED][i]))
part('SurgeryJoystick', js, (-2.8, 0, 1.4))
# CatheterDrive: bộ đẩy ống thông ở đầu mạch máu; gốc ở mặt bàn, giữa hộp; cổng ống ở +x, trục ống cao 0,1
cd = [
    box('case', (0.6, 0.6, 0.38), T(0, 0.19, 0), CASE, bevel=0.03),
    box('face', (0.45, 0.012, 0.2), T(0, 0.24, 0.3), SCREEN, bevel=0),
    cyl('roller', 0.07, 0.34, T(0.1, 0.19, 0), RUBBER, rot=ZAXIS),
    cyl('roller2', 0.07, 0.34, T(0.1, 0.19 + 0.0, 0), STEEL, rot=ZAXIS),
    cyl('port', 0.045, 0.14, T(0.37, 0.1, 0), CHROME, rot=XAXIS),
    cyl('port2', 0.06, 0.04, T(0.3, 0.1, 0), STEEL, rot=XAXIS),
]
part('CatheterDrive', cd, (-3.5, 0, -0.25))

# ================================================================== SLAM
# LidarBot: xe thám hiểm có lidar quay; gốc ở tâm (khung 0,3 × 0,15 × 0,2); dây trục dọc x
lb = [
    box('chassis', (0.3, 0.2, 0.07), T(0, -0.03, 0), YELLOW, bevel=0.02),
    box('deck', (0.2, 0.15, 0.015), T(0, 0.015, 0), DARK, bevel=0.004),
    cyl('lidar', 0.055, 0.045, T(0, 0.075, 0), IRON),
    cyl('lidarCap', 0.04, 0.012, T(0, 0.1, 0), RED),
    box('window', (0.03, 0.05, 0.02), T(0.04, 0.075, 0), INK, bevel=0),
    cyl('antenna', 0.004, 0.09, T(-0.1, 0.055, 0.05), CHROME, bevel=0),
]
for sx in (-1, 1):
    for sz in (-1, 1):
        lb.append(cyl('wheel', 0.05, 0.04, T(sx * 0.1, -0.06, sz * 0.115), RUBBER, rot=ZAXIS))
part('LidarBot', lb, (-0.5, 0.3, 0.5))

# ================================================================== sóng vật chất
# Oven: lò bay hơi phân tử; gốc ở tâm, trục dọc x, dài 0,7, vòi ở +x
ov = [
    lathe('shell', [(0, -0.35), (0.3, -0.35), (0.4, -0.28), (0.4, 0.12), (0.34, 0.2), (0.12, 0.3), (0.06, 0.35), (0, 0.35)], T(0, 0, 0), ORANGE, rot=XAXIS),
    torus('coilA', 0.41, 0.025, T(-0.15, 0, 0), COPPER, rot=(0, math.radians(90), 0)),
    torus('coilB', 0.41, 0.025, T(0.0, 0, 0), COPPER, rot=(0, math.radians(90), 0)),
    torus('coilC', 0.41, 0.025, T(0.15, 0, 0), COPPER, rot=(0, math.radians(90), 0)),
    cyl('nozzle', 0.05, 0.1, T(0.4, 0, 0), STEEL, rot=XAXIS),
    cyl('cable', 0.025, 0.3, T(-0.45, 0.1, 0), RUBBER, rot=XAXIS),
]
part('Oven', ov, (-3.3, 0.5, -1.0))
# SlitPlate: tấm chắn hai khe; gốc ở tâm tấm (0,06 × 0,8 × 0,9), đế chạm mặt bàn ở −0,5
sp = [
    box('left', (0.06, 0.41, 0.8), T(0, 0, -0.245), IRON, bevel=0.008),
    box('right', (0.06, 0.41, 0.8), T(0, 0, 0.245), IRON, bevel=0.008),
    box('post', (0.05, 0.05, 0.12), T(0, -0.46, 0), STEEL, bevel=0.006),
    cyl('foot', 0.18, 0.04, T(0, -0.48, 0), IRON, rot=(0, 0, 0)),
]
part('SlitPlate', sp, (-2.3, 0.5, -1.0))
# GratingFrame: khung giữ cách tử ở x = −0,3; gốc ở mặt bàn, giữa khung; khe nằm giữa hai cột (rộng 0,92)
gf = [box('base', (0.16, 0.16, 0.03), T(0, 0.015, 0), IRON, bevel=0.006)]
for sz in (-1, 1):
    gf.append(box('postF', (0.05, 0.05, 0.44), T(0, 0.25, sz * 0.52), STEEL, bevel=0.006))
gf.append(box('railTop', (0.04, 0.04, 1.09), T(0, 0.46, 0), STEEL, bevel=0.005, rot=(0, 0, 0)))
gf.append(box('railBot', (0.04, 0.04, 1.09), T(0, 0.03, 0), STEEL, bevel=0.005))
part('GratingFrame', gf, (-0.3, 0, -1.0))
# DetScreen: màn đầu dò phẳng; gốc ở tâm màn (1,5 × 0,04 × 3,6), mặt trên ở +0,02
ds = [
    box('glass', (1.42, 3.52, 0.02), T(0, 0.005, 0), SCREEN, bevel=0),
    box('frameL', (1.5, 0.04, 0.04), T(0, 0, -1.78), ALU, bevel=0.008),
    box('frameR', (1.5, 0.04, 0.04), T(0, 0, 1.78), ALU, bevel=0.008),
    box('frameA', (0.04, 3.6, 0.04), T(-0.73, 0, 0), ALU, bevel=0.008),
    box('frameB', (0.04, 3.6, 0.04), T(0.73, 0, 0), ALU, bevel=0.008),
]
for i in range(-3, 4):
    ds.append(box('tick', (0.04, 0.008, 0.003), T(0.72, 0.022, i * 0.5), CREAM, bevel=0))
part('DetScreen', ds, (2.9, 0.1, -1.0))

# ================================================================== LIGO
# ScopeBezel: viền màn hiện sóng quanh tấm 6,9 × 0,9 của cảnh; gốc ở mặt bàn, tâm tấm
sb = frame('rim', 7.12, 1.12, 0.1, 0.1, T(0, 0, 0), CASE, bevel=0.02)
for sx in (-1, 1):
    sb.append(box('foot', (0.3, 0.5, 0.025), T(sx * 3.2, 0.012, 0.0), IRON, bevel=0.006))
sb.append(box('knob', (0.0001, 0.0001, 0.0001), T(0, 0, 0), CASE, bevel=0))
for i in range(3):
    sb.append(lathe('dial', [(0, 0.04), (0.04, 0.04), (0.05, 0.03), (0.05, 0), (0, 0)], T(-3.35 + i * 0.16, 0.06, 0.58), BAKELITE))
part('ScopeBezel', sb, (0, 0, 2.2))

# ================================================================== BEC
# BecChamber: buồng chân không có cửa sổ và hai cuộn từ; gốc ở mặt bàn, giữa buồng
bc = [
    box('block', (0.9, 0.9, 0.52), T(0, 0.27, 0), STEEL, bevel=0.04),
    torus('portTop', 0.28, 0.035, T(0, 0.54, 0), CHROME, rot=(math.radians(90), 0, 0)),
    cyl('window', 0.28, 0.012, T(0, 0.535, 0), GLASS, bevel=0),
    cyl('pumpPort', 0.12, 0.34, T(0.6, 0.27, 0), STEEL, rot=XAXIS),
    cyl('pumpFlange', 0.17, 0.04, T(0.78, 0.27, 0), CHROME, rot=XAXIS),
    cyl('ionPump', 0.2, 0.46, T(1.05, 0.27, 0), BLUE, rot=XAXIS),
]
for sz in (-1, 1):
    bc.append(torus('coil', 0.34, 0.07, T(0, 0.27, sz * 0.52), COPPER, rot=(math.radians(90), 0, 0)))
    bc.append(torus('coilCore', 0.34, 0.03, T(0, 0.27, sz * 0.52), IRON, rot=(math.radians(90), 0, 0)))
part('BecChamber', bc, (-3.6, 0, 1.8))
# ImageBezel: viền màn ảnh hấp thụ quanh tấm 5,2 × 2,6; gốc ở mặt bàn, tâm tấm
ib = frame('rim', 5.4, 2.8, 0.1, 0.1, T(0, 0, 0), CASE, bevel=0.02)
for sx in (-1, 1):
    ib.append(box('foot', (0.3, 0.6, 0.025), T(sx * 2.4, 0.012, 0), IRON, bevel=0.006))
part('ImageBezel', ib, (0.2, 0, 1.8))

# ================================================================== căn chỉnh laser
# LaserHead: đầu laser xanh lục 0,7 × 0,3 × 0,3; gốc ở tâm hộp; chùm ra ở +x
lh = [
    box('housing', (0.7, 0.3, 0.3), T(0, 0, 0), ALU, bevel=0.04),
    box('cap', (0.12, 0.3, 0.3), T(-0.31, 0, 0), IRON, bevel=0.03),
    cyl('aperture', 0.06, 0.04, T(0.37, 0, 0), BAKELITE, rot=XAXIS),
    cyl('lens', 0.035, 0.012, T(0.395, 0, 0), GLASS, bevel=0, rot=XAXIS),
    cyl('key', 0.03, 0.04, T(0.1, 0.17, 0), RED),
    box('led', (0.04, 0.04, 0.01), T(-0.15, 0.152, 0.0), LED, bevel=0),
    box('label', (0.26, 0.002, 0.14), T(0.0, 0.0, 0.151), CREAM, bevel=0, rot=(0, 0, 0)),
    text('labT', '532 nm', 0.04, T(0.0, 0.0, 0.154), INK, rot=FRONT),
]
part('LaserHead', lh, (-2.2, 0.3, 1.8))
# MirrorMount: gương phẳng dài 1 dọc x, cao 0,5 tâm ở y = 0,3, trên đế tròn và trụ; gốc ở mặt bàn dưới tâm gương
mm = [
    box('glass', (1.0, 0.03, 0.5), T(0, 0.3, 0), CHROME, bevel=0),
    box('back', (1.0, 0.025, 0.5), T(0, 0.3, 0.025), IRON, bevel=0.01),
    box('edgeT', (1.04, 0.04, 0.02), T(0, 0.3 + 0.255, 0.01), ALU, bevel=0.004),
    box('edgeB', (1.04, 0.04, 0.02), T(0, 0.3 - 0.255, 0.01), ALU, bevel=0.004),
    cyl('post', 0.025, 0.2, T(0, 0.15, 0.03), CHROME, bevel=0),
    lathe('base', [(0, 0), (0.14, 0), (0.14, 0.03), (0.06, 0.05), (0, 0.05)], T(0, 0, 0), IRON),
]
part('MirrorMount', mm, (-0.6, 0, 0.0))
# PhotoDetector: đầu thu 0,5 × 0,5 × 0,2; gốc ở tâm; cửa sổ cảm biến ở +z (cảnh xoay cho hướng về ống)
pd = [
    box('housing', (0.5, 0.2, 0.5), T(0, 0, 0), IRON, bevel=0.035),
    cyl('window', 0.15, 0.02, T(0, 0, 0.11), GLASS, bevel=0, rot=ZAXIS),
    torus('ring', 0.16, 0.015, T(0, 0, 0.115), CHROME),
    box('fins', (0.4, 0.04, 0.3), T(0, 0, -0.12), ALU, bevel=0.006),
    cyl('cable', 0.02, 0.2, T(0.18, 0, -0.2), RUBBER, rot=ZAXIS),
]
part('PhotoDetector', pd, (1.2, 0.3, 0.0))

# ================================================================== kẹp quang học
# TrapStage: bàn kính vi lưu quanh dải 8,6 × 1,3 của cảnh; gốc ở mặt bàn, tâm dải
ts = frame('rim', 8.9, 1.62, 0.05, 0.14, T(0, 0, 0), ALU, bevel=0.01)
for i in range(4):
    ts.append(box('clip', (0.3, 0.12, 0.03), T(-3.4 + i * 2.27, 0.8, 0.0), IRON, bevel=0.006, rot=(0, 0, 0)))
for sx in (-1, 1):
    ts.append(box('tab', (0.4, 0.3, 0.02), T(sx * 4.45, 0.0, 0.0), IRON, bevel=0.006))
part('TrapStage', ts, (0, 0, 2.6))
# LaserTower: tháp laser bẫy ở phía sau; gốc ở mặt bàn, giữa đế
lt = [
    box('base', (0.9, 0.9, 0.06), T(0, 0.03, 0), IRON, bevel=0.012),
    box('column', (0.22, 0.22, 2.3), T(0, 1.2, 0), ALU, bevel=0.02),
    box('head', (0.6, 0.38, 0.38), T(0.0, 2.45, 0.0), CASE, bevel=0.04),
    cyl('beamPort', 0.07, 0.06, T(0, 2.28, 0.0), RED, rot=(0, 0, 0)),
    box('brace', (0.08, 0.5, 0.5), T(0, 0.55, 0.0), IRON, bevel=0.01, rot=(0, 0, 0)),
]
part('LaserTower', lt, (3.8, 0, -1.9))

# ================================================================== con lắc ngược
# CartRail: thanh nhôm chữ T dài 1 dọc x; gốc ở mặt bàn, tâm thanh; mặt trên ở y = 0,18; cảnh co giãn theo x
cr = [box('profile', (1.0, 0.18, 0.06), T(0, 0.15, 0), ALU, bevel=0.012), box('slot', (1.0, 0.07, 0.01), T(0, 0.182, 0), INK, bevel=0)]
for sx in (-0.5, -0.17, 0.17, 0.5):
    cr.append(box('foot', (0.012, 0.3, 0.12), T(sx, 0.06, 0), IRON, bevel=0.003))
part('CartRail', cr, (0, 0, 3.0))
# CartBody: xe trượt; gốc ở giữa xe, mặt bàn (thân 0,9 × 0,25 × 0,5, tâm y 0,35; bánh r 0,11 ở x = ±0,3)
cb = [
    box('chassis', (0.9, 0.5, 0.25), T(0, 0.35, 0), BLUE, bevel=0.04),
    box('topPlate', (0.78, 0.4, 0.018), T(0, 0.479, 0), ALU, bevel=0.006),
    cyl('bearing', 0.1, 0.06, T(0, 0.52, 0), CHROME),
    cyl('bearingCap', 0.05, 0.03, T(0, 0.56, 0), IRON),
    box('motor', (0.26, 0.22, 0.18), T(-0.25, 0.58, 0.0), IRON, bevel=0.02),
    box('encoder', (0.1, 0.1, 0.1), T(0.28, 0.54, 0.0), DARK, bevel=0.01),
]
for sx in (-1, 1):
    cb.append(cyl('axle', 0.03, 0.62, T(sx * 0.3, 0.22, 0), CHROME, bevel=0, rot=ZAXIS))
    for sz in (-1, 1):
        cb.append(lathe('wheel', [(0, -0.05), (0.09, -0.05), (0.11, -0.03), (0.11, 0.03), (0.09, 0.05), (0, 0.05)], T(sx * 0.3, 0.22, sz * 0.28), RUBBER, rot=ZAXIS))
        cb.append(cyl('hub', 0.045, 0.06, T(sx * 0.3, 0.22, sz * 0.3), ALU, rot=ZAXIS))
part('CartBody', cb, (0, 0, 4.0))

export_glb('sims2-parts.glb')
preview((0.2, 9.0, 11.0), (0, 0.3, 1.2), lens=30)
