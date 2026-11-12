"""
Dựng bộ dụng cụ "cân dòng điện" bằng Blender rồi xuất GLB cho phòng thực hành /lab.

Chạy:
  blender --background --python tools/lab-models/current_balance.py -- <thư mục xuất> [ảnh xem thử.png]

Toạ độ viết theo cảnh three.js (x sang phải, y lên trên, z về phía người xem); hàm T() đổi sang hệ Blender (z lên).
Bộ phận chuyển động là các nút rỗng đặt đúng trục quay, mang tên cố định để cảnh 3D tìm:
Beam, Frame, NeedleM, NeedleI, KnobM, KnobI, SwK, SwI, SwB, Marker, Spring, PoleA, PoleB, LampK, Arrow0..2, Edge, Book.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F401,F403

# ------------------------------------------------------------------ bàn điều khiển
PY = 0.5  # mặt trên bàn điều khiển (three y)
FRONT = 1.42
box('ConsoleBody', (3.9, 1.3, PY), T(0.6, PY / 2, 1.1), WOOD, bevel=0.03)
box('ConsolePanel', (3.72, 1.12, 0.03), T(0.6, PY + 0.012, 1.1), PANEL, bevel=0.008)
for sx in (-1, 1):
    for sz in (-1, 1):
        cyl('Foot', 0.09, 0.05, T(0.6 + sx * 1.7, -0.02, 1.1 + sz * 0.5), RUBBER)
        lathe('Screw', [(0, 0.012), (0.035, 0.012), (0.045, 0.0), (0.045, -0.004)], T(0.6 + sx * 1.78, PY + 0.03, 1.1 + sz * 0.5), BRASS)


def meter(name, x, maxv, title):
    g = empty(name + 'Body', T(x, PY + 0.03, 0.8), rot=(math.radians(90) - 0.6, 0, 0))
    box(name + 'Case', (0.96, 0.74, 0.2), (0, 0.36, -0.1), BAKELITE, g, bevel=0.05)
    box(name + 'Face', (0.8, 0.56, 0.01), (0, 0.38, 0.004), CREAM, g, bevel=0)
    for i in range(21):
        a = -0.9 + i / 20 * 1.8
        major = i % 5 == 0
        ln = 0.06 if major else 0.032
        r = 0.4 - ln / 2
        box(name + 'Tick', (0.014 if major else 0.007, ln, 0.002), (math.sin(a) * r, 0.14 + math.cos(a) * r, 0.011), INK, g, bevel=0, rot=(0, 0, -a))
        if major:
            v = i / 20 * maxv
            text(name + 'Num', ('%g' % v).replace('.', ','), 0.068, (math.sin(a) * 0.285, 0.14 + math.cos(a) * 0.29, 0.011), INK, g)
    text(name + 'Unit', 'A', 0.17, (0, 0.34, 0.011), ORANGE, g)
    text(name + 'Title', title, 0.042, (0, 0.135, 0.011), INK, g)
    box(name + 'Glass', (0.8, 0.56, 0.008), (0, 0.38, 0.05), PANE, g, bevel=0)
    for sx in (-1, 1):
        lathe(name + 'Post', [(0, 0.03), (0.03, 0.03), (0.036, 0.0)], (sx * 0.34, 0.07, 0.0), BRASS, g)
    n = empty(name, (0, 0.14, 0.03), g)
    box(name + 'Hand', (0.016, 0.36, 0.004), (0, 0.18, 0), RED, n, bevel=0)
    cyl(name + 'Hub', 0.03, 0.012, (0, 0, 0.002), BAKELITE, n)
    return n


meter('NeedleM', -0.3, 2, 'NAM CHÂM ĐIỆN')
meter('NeedleI', 1.5, 1, 'KHUNG DÂY')


def knob(name, x, label):
    k = empty(name, T(x, PY + 0.03, FRONT))
    lathe(name + 'Cap', [(0, 0.2), (0.11, 0.2), (0.135, 0.185), (0.15, 0.06), (0.2, 0.045), (0.215, 0.0), (0, 0.0)], (0, 0, 0), BAKELITE, k)
    box(name + 'Line', (0.022, 0.13, 0.006), (0, 0.075, 0.2), WHITE, k, bevel=0)  # vạch chỉ hướng về phía sau bàn
    for j in range(11):
        a = -0.75 * math.pi + j / 10 * 1.5 * math.pi
        box(name + 'Mark', (0.012, 0.05, 0.003), T(x + math.sin(a) * 0.3, PY + 0.03, FRONT - math.cos(a) * 0.3), CREAM, bevel=0, rot=(0, 0, -a))
    text(name + 'Label', label, 0.065, T(x, PY + 0.03, FRONT - 0.44), CREAM)


knob('KnobM', -0.3, 'BIẾN TRỞ')
knob('KnobI', 1.5, 'BIẾN TRỞ')


def toggle(name, x, label, tip):
    box(name + 'Plate', (0.3, 0.42, 0.02), T(x, PY + 0.035, FRONT), BRASS, bevel=0.006)
    cyl(name + 'Nut', 0.075, 0.04, T(x, PY + 0.06, FRONT), CHROME, seg=6)
    s = empty(name, T(x, PY + 0.07, FRONT))
    lathe(name + 'Bat', [(0, 0.3), (0.035, 0.29), (0.045, 0.24), (0.03, 0.06), (0.03, 0.0), (0, 0.0)], (0, 0, 0), tip, s)
    text(name + 'Label', label, 0.065, T(x, PY + 0.03, FRONT - 0.36), CREAM)
    return s


toggle('SwB', -1.05, 'ĐẢO CHIỀU', CHROME)
toggle('SwK', 0.6, 'K', CHROME)
toggle('SwI', 2.25, 'ĐẢO CHIỀU', CHROME)
lamp = ball('LampK', 0.055, T(0.6, PY + 0.07, 1.0), LAMP)
cyl('LampBezel', 0.075, 0.03, T(0.6, PY + 0.04, 1.0), CHROME)
for x, m in ((-1.2, RED), (-1.05, INK), (2.25, RED), (2.4, INK)):  # cọc đấu dây ở mép sau
    lathe('Post', [(0, 0.13), (0.04, 0.13), (0.05, 0.1), (0.05, 0.05), (0.025, 0.045), (0.025, 0.0)], T(x, PY + 0.03, 0.62), m)

# ------------------------------------------------------------------ nguồn một chiều
SX, SZ = -2.9, 0.9
box('SupplyCase', (1.3, 0.9, 0.75), T(SX, 0.4, SZ), CASE, bevel=0.03)
box('SupplyFront', (1.2, 0.02, 0.62), T(SX, 0.4, SZ + 0.455), mat('front', hexc('#2A2D5C'), rough=0.5), bevel=0.01)
box('SupplyDisplay', (0.46, 0.012, 0.2), T(SX - 0.25, 0.52, SZ + 0.468), DARK, bevel=0)
text('SupplyVolt', '12,0', 0.13, T(SX - 0.25, 0.52, SZ + 0.476), mat('seg', hexc('#FF4A2B'), emit=2.5), rot=(math.radians(90), 0, 0))
text('SupplyName', 'NGUỒN ĐIỆN MỘT CHIỀU', 0.05, T(SX, 0.71, SZ + 0.468), CREAM, rot=(math.radians(90), 0, 0))
lathe('SupplyKnob', [(0, 0.09), (0.08, 0.09), (0.1, 0.07), (0.11, 0.0), (0, 0.0)], T(SX + 0.3, 0.52, SZ + 0.46), BAKELITE, rot=(math.radians(-90), 0, 0))
ball('SupplyLed', 0.035, T(SX + 0.5, 0.66, SZ + 0.465), LED)
for dx, m in ((-0.15, RED), (0.15, INK)):
    lathe('SupplyPost', [(0, 0.12), (0.045, 0.12), (0.055, 0.09), (0.055, 0.04), (0.028, 0.035), (0.028, 0.0)], T(SX + dx, 0.775, SZ), m)
for i in range(5):
    box('Vent', (0.5, 0.03, 0.012), T(SX + 0.3, 0.776, SZ - 0.3 + i * 0.07), INK, bevel=0)
for sx in (-1, 1):
    for sz in (-1, 1):
        cyl('SupplyFoot', 0.07, 0.05, T(SX + sx * 0.5, 0.0, SZ + sz * 0.33), RUBBER)

# ------------------------------------------------------------------ giá đỡ và đòn cân
PX, PYV, PZ = 0.1, 2.75, -0.7
lathe('StandBase', [(0, 0.1), (0.2, 0.1), (0.42, 0.06), (0.46, 0.0), (0, 0.0)], T(PX, 0, PZ), IRON)
cyl('StandRod', 0.045, PYV - 0.05, T(PX, PYV / 2, PZ), CHROME)
box('StandBoss', (0.2, 0.2, 0.2), T(PX, PYV - 0.12, PZ), IRON, bevel=0.03)
box('ScalePlate', (0.52, 0.02, 0.36), T(PX, PYV - 0.66, PZ + 0.07), CREAM, bevel=0.008)
for i in range(-5, 6):
    box('ScaleTick', (0.006, 0.004, 0.09 if i % 5 == 0 else 0.05), T(PX + i * 0.04, PYV - 0.56, PZ + 0.082), INK, bevel=0)
beam = empty('Beam', T(PX, PYV, PZ))
box('BeamBar', (3.4, 0.1, 0.06), (0.2, 0, 0), ALU, beam, bevel=0.01)
for i in range(-14, 19):
    box('BeamTick', (0.006, 0.004, 0.03 if i % 5 else 0.05), (i * 0.1, -0.052, 0.012), INK, beam, bevel=0)
box('BeamKnife', (0.08, 0.14, 0.09), (0, 0, -0.06), STEEL, beam, bevel=0.01)
box('BeamPointer', (0.02, 0.016, 0.5), (0, -0.06, -0.3), RED, beam, bevel=0.004)
lathe('Weight', [(0, 0.12), (0.11, 0.12), (0.13, 0.1), (0.13, 0.03), (0.15, 0.02), (0.15, -0.02), (0.13, -0.03), (0.13, -0.1), (0.11, -0.12), (0, -0.12)], (-1.62, 0, 0), BRASS, beam, rot=(0, math.radians(90), 0))
for x in (-1.2, 1.7):
    box('BeamHook', (0.03, 0.03, 0.14), (x, 0, -0.08), STEEL, beam, bevel=0.005)

# ------------------------------------------------------------------ lực kế
FX = PX - 1.2
cyl('MeterTube', 0.1, 1.1, T(FX, 1.75, PZ), GLASS, bevel=0)
for y in (2.31, 1.19):
    cyl('MeterCap', 0.11, 0.04, T(FX, y, PZ), RED)
box('MeterScale', (0.1, 0.008, 0.86), T(FX, 1.8, PZ - 0.07), CREAM, bevel=0)
for i in range(11):
    box('MeterTick', (0.08 if i % 5 == 0 else 0.05, 0.004, 0.006), T(FX, 2.2 - i * 0.08, PZ - 0.064), INK, bevel=0)
    if i % 5 == 0:
        text('MeterNum', ('%g' % (i * 0.05)).replace('.', ','), 0.045, T(FX + 0.19, 2.2 - i * 0.08, PZ), CREAM, rot=(math.radians(90), 0, 0))
mk = empty('Marker', T(FX, 2.2, PZ))
cyl('MarkerDisc', 0.088, 0.035, (0, 0, 0), RED, mk)
sp = empty('Spring', T(FX, PYV, PZ))  # gốc ở đầu trên, dài 1 đơn vị xuống dưới: cảnh 3D co giãn theo trục đứng
tube('SpringCoil', [(0.045 * math.cos(t), 0.045 * math.sin(t), -t / (2 * math.pi * 14)) for t in np.linspace(0, 2 * math.pi * 14, 14 * 18)], 0.008, CHROME, sp, smooth=False)
cyl('MeterRod', 0.012, 1.15, T(FX, 0.62, PZ), CHROME)
lathe('MeterBase', [(0, 0.08), (0.1, 0.08), (0.2, 0.05), (0.22, 0.0), (0, 0.0)], T(FX, 0, PZ), IRON)

# ------------------------------------------------------------------ khung dây
GX, GY, GZ = 1.8, 1.0, -0.7
fr = empty('Frame', T(GX, PYV, GZ))
cyl('FrameWire', 0.01, 0.34, (0, 0, -0.17), CHROME, fr)
box('FrameBobbinTop', (0.72, 0.1, 0.07), (0, 0, -0.34), mat('bobbin', hexc('#5A1F12'), rough=0.6), fr, bevel=0.01)
W, H0, H1 = 0.3, -0.36, -1.72  # nửa bề rộng, mép trên, mép dưới của cuộn dây
loop = [(-W, 0, H0), (W, 0, H0), (W, 0, H1), (-W, 0, H1), (-W, 0, H0)]
for dy in (-0.024, -0.008, 0.008, 0.024):  # bốn lớp dây đồng quấn sát nhau
    tube('FrameCoil', [(x, dy, z) for x, _, z in loop], 0.012, COPPER, fr, smooth=False)
ed = empty('Edge', (0, 0, H1), fr)
box('EdgeBar', (0.62, 0.075, 0.05), (0, 0, 0), ORANGE, ed, bevel=0.012)

# ------------------------------------------------------------------ nam châm điện
box('MagnetBase', (0.8, 1.6, 0.14), T(GX, 0.07, GZ), IRON, bevel=0.02)
box('MagnetYoke', (0.36, 1.38, 0.16), T(GX, 0.22, GZ), STEEL, bevel=0.015)
for s, nm, m in ((-1, 'PoleA', RED), (1, 'PoleB', BLUE)):
    z = GZ + s * 0.52
    box('MagnetLeg', (0.34, 0.3, 1.1), T(GX, 0.7, z), STEEL, bevel=0.015)
    for i in range(9):  # lá thép ghép
        box('Lam', (0.345, 0.004, 1.08), T(GX, 0.7, z - 0.13 + i * 0.0325), IRON, bevel=0)
    cyl('Coil', 0.27, 0.46, T(GX, 0.55, z), COPPER, bevel=0.02)
    for y in (0.3, 0.8):
        cyl('CoilFlange', 0.3, 0.03, T(GX, y, z), BAKELITE)
    p = empty(nm, T(GX, GY, GZ + s * 0.31))
    o = box(nm + 'Face', (0.5, 0.12, 0.42), (0, 0, 0), None, p, bevel=0.015)
    o.data.materials.append(m.copy())  # cảnh 3D đổi màu khi đảo chiều từ trường
box('LampBox', (0.5, 0.9, 0.2), T(GX + 0.85, 0.1, GZ), BAKELITE, bevel=0.03)
for i in (-1, 0, 1):
    a = empty('Arrow%d' % (i + 1), T(GX + 0.85, 0.215, GZ + i * 0.26))
    o = cyl('ArrowHead', 0.07, 0.16, (0, 0, 0), None, a, bevel=0, rot=(math.radians(90), 0, 0), r2=0.0, seg=3)
    o.data.materials.append(LED.copy())

# ------------------------------------------------------------------ sổ ghi và bút chì
bk = empty('Book', T(-2.7, 0.0, 2.1), rot=(0, 0, 0.12))
o = box('BookPage', (1.0, 0.7, 0.05), (0, 0, 0.03), None, bk, bevel=0.012)
o.data.materials.append(PAPER.copy())
box('BookSpine', (0.05, 0.7, 0.055), (-0.5, 0, 0.03), ORANGE, bk, bevel=0.01)
for i in range(6):
    box('BookRule', (0.78, 0.006, 0.002), (0.03, -0.24 + i * 0.09, 0.056), mat('rule%d' % i, hexc('#8B91B8')), bk, bevel=0)
cyl('Pencil', 0.018, 0.6, (0.2, 0.42, 0.075), mat('pencil', hexc('#E3B341'), rough=0.5), bk, bevel=0, rot=(0, math.radians(90), 0.25), seg=6)

# ------------------------------------------------------------------ dây nối có phích cắm
def cable(name, m, pts):
    tube(name, [T(*p) for p in pts], 0.026, m)
    for p in (pts[0], pts[-1]):
        cyl(name + 'Plug', 0.04, 0.12, T(p[0], p[1] + 0.02, p[2]), m, bevel=0.01)


cable('CableA', RED, [(SX - 0.15, 0.9, SZ), (SX + 0.1, 1.25, SZ + 0.05), (-2.0, 1.0, 0.8), (-1.5, 0.8, 0.68), (-1.2, 0.72, 0.62)])
cable('CableB', INK, [(SX + 0.15, 0.9, SZ), (SX + 0.5, 1.15, SZ - 0.1), (-1.9, 0.85, 0.6), (-1.35, 0.78, 0.6), (-1.05, 0.72, 0.62)])
cable('CableC', RED, [(2.25, 0.72, 0.62), (2.5, 0.9, 0.3), (GX + 0.3, 0.6, GZ + 0.95), (GX + 0.1, 0.45, GZ + 0.8)])
cable('CableD', INK, [(2.4, 0.72, 0.62), (2.85, 1.3, 0.2), (2.6, 2.3, -0.5), (GX + 0.2, PYV - 0.3, GZ)])

export_glb('current-balance.glb')
preview((1.2, 3.4, 8.4), (0.2, 1.1, 0.2))
