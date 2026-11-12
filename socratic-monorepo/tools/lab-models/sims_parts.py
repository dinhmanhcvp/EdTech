"""
Thiết bị chính của các bài /lab trước đây còn là hình khối three.js: đấu động cơ 3 pha, xe hai bánh tự cân bằng (pid),
động cơ PMSM (foc), Harmonic Drive, kẹp mẫu thử mỏi, máy khuấy từ (bz), bể điện di, khay và ống nuôi ruồi giấm, nguồn alpha và màn ZnS.
Mỗi thiết bị là MỘT lưới mang tên cố định (hợp đồng trong `labModels.test.ts`); gốc toạ độ ghi ở từng mục, đơn vị và trục theo three.js.
Vật liệu mang tên để cảnh đổi màu: `paint` (sơn vỏ động cơ: cảnh làm đỏ dần khi quá nhiệt).

Chạy:
  blender --background --python tools/lab-models/sims_parts.py -- apps/teacher-board/public/models [ảnh xem thử.png]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F401,F403

PAINT = mat('paint', hexc('#2C5E8C'), metallic=0.35, rough=0.42)
PCB = mat('pcb', hexc('#1F7A4D'), rough=0.5)
YELLOW = mat('yellow', hexc('#E3B341'), rough=0.45)
LEAD = mat('lead', hexc('#5A5F66'), metallic=0.5, rough=0.6)
ZNS = mat('zns', hexc('#B8E0A0'), rough=0.8)
FOOD = mat('food', hexc('#C9A66B'), rough=0.9)
XAXIS = (0, math.radians(90), 0)  # trục z của lưới -> +x
ZAXIS = (math.radians(90), 0, 0)  # trục z của lưới -> +z của three.js (về phía người ngồi)
FRONT = (math.radians(90), 0, 0)  # chữ dựng đứng, quay mặt về phía người ngồi


def part(name, objs, show):
    o = join(name, objs)
    o.location = T(*show)
    return o


def around(x, r, a):
    """điểm trên vòng tròn bán kính r quanh trục x của three.js (a = 0 ở đỉnh), kèm phép quay đưa trục z của lưới ra hướng kính"""
    return (x, -r * math.sin(a), r * math.cos(a)), (a, 0, 0)


def scaled(o, s):
    o.scale = s
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.transform_apply(scale=True)
    o.select_set(False)
    return o


# ================================================================== đấu động cơ 3 pha (HandsThreePhase3D)
# Motor3: gốc ở mặt bàn dưới tâm động cơ, trục dọc x, tâm trục cao 0,58; đầu trục ở +x, quạt ở −x
motor = [
    box('base', (2.1, 1.25, 0.08), T(0, 0.04, 0), IRON, bevel=0.015),
    lathe('body', [(0, -0.65), (0.42, -0.65), (0.42, 0.65), (0, 0.65)], T(0, 0.58, 0), PAINT, rot=XAXIS),
    lathe('front', [(0.42, 0.64), (0.44, 0.66), (0.44, 0.72), (0.37, 0.79), (0.13, 0.8), (0.13, 0.86), (0, 0.86)], T(0, 0.58, 0), PAINT, rot=XAXIS),
    lathe('rear', [(0.42, -0.64), (0.44, -0.66), (0.44, -0.74)], T(0, 0.58, 0), PAINT, rot=XAXIS),
    lathe('cowl', [(0.43, -0.74), (0.46, -0.76), (0.46, -1.05), (0.4, -1.1), (0.3, -1.1), (0.3, -1.08), (0.2, -1.08), (0.2, -1.1), (0.1, -1.1), (0.1, -1.08), (0, -1.08)], T(0, 0.58, 0), BAKELITE, rot=XAXIS),
    box('tbox', (0.42, 0.38, 0.2), T(0, 1.06, 0), PAINT, bevel=0.02),
    box('tlid', (0.45, 0.41, 0.03), T(0, 1.175, 0), IRON, bevel=0.01),
    box('plate', (0.4, 0.008, 0.2), T(0.1, 0.5, 0.468), CREAM, bevel=0),
    text('plateT', '3~  380 V  Y', 0.045, T(0.1, 0.5, 0.474), INK, rot=FRONT),
]
for i in range(30):  # cánh tản nhiệt chạy dọc thân, chừa chỗ hộp đấu dây và chân đế
    a = 2 * math.pi * i / 30
    if abs(math.cos(a)) > 0.9:
        continue
    loc, rot = around(0, 0.445, a)
    motor.append(box('fin', (1.22, 0.022, 0.07), (loc[0], loc[1], loc[2] + 0.58), PAINT, bevel=0.004, rot=rot))
for sx in (-1, 1):
    motor.append(box('foot', (0.22, 1.05, 0.2), T(sx * 0.42, 0.16, 0), PAINT, bevel=0.02))
    for sz in (-1, 1):
        motor.append(cyl('bolt', 0.035, 0.03, T(sx * 0.42, 0.275, sz * 0.44), CHROME, seg=6))
        motor.append(cyl('lidScrew', 0.014, 0.012, T(sx * 0.19, 1.195, sz * 0.17), CHROME, seg=12))
part('Motor3', motor, (-3.2, 0, -1.2))

# Motor3Rotor: gốc trên trục, ở tâm động cơ; phần lộ ra ngoài gồm đầu trục, then, puli rãnh chữ V và ba vấu màu
rotor = [
    lathe('shaft', [(0, 0.8), (0.07, 0.8), (0.07, 1.31), (0.06, 1.33), (0, 1.33)], T(0, 0, 0), CHROME, rot=XAXIS),
    lathe('pulley', [(0.07, 1.13), (0.27, 1.13), (0.27, 1.16), (0.19, 1.215), (0.27, 1.27), (0.27, 1.3), (0.07, 1.3)], T(0, 0, 0), STEEL, rot=XAXIS),
    box('key', (0.16, 0.03, 0.03), T(1.25, 0.075, 0), IRON, bevel=0),
]
for i in range(3):
    loc, rot = around(1.215, 0.27, 2 * math.pi * i / 3)
    rotor.append(box('lug', (0.15, 0.12, 0.05), loc, ORANGE, bevel=0.01, rot=rot))
part('Motor3Rotor', rotor, (-3.2, 0.58, -1.2))

# Breaker3: aptomat 3 cực; gốc ở mặt bàn giữa thân (thân 0,8 × 0,5 × 1,3); cần gạt là bộ phận riêng
brk = [
    box('rail', (0.92, 1.46, 0.03), T(0, 0.015, 0), STEEL, bevel=0.005),
    box('body', (0.8, 1.3, 0.44), T(0, 0.25, 0), CASE, bevel=0.03),
    box('well', (0.36, 1.02, 0.012), T(0, 0.472, 0), INK, bevel=0),
    text('on', 'I', 0.09, T(0.29, 0.474, 0), INK),
    text('off', 'O', 0.09, T(-0.29, 0.474, 0), INK),
]
for i, z in enumerate((-0.433, 0, 0.433)):
    brk.append(text('rate', 'C16', 0.06, T(0, 0.31, z), INK, rot=XAXIS))
    for sx in (-1, 1):
        brk.append(cyl('screw', 0.045, 0.02, T(sx * 0.33, 0.475, z * 0.72), CHROME, seg=16))
        brk.append(box('slot', (0.07, 0.012, 0.004), T(sx * 0.33, 0.486, z * 0.72), INK, bevel=0))
for z in (-0.217, 0.217):
    brk.append(box('gap', (0.81, 0.012, 0.45), T(0, 0.25, z), INK, bevel=0))
part('Breaker3', brk, (-3.2, 0, 0.6))
# BreakerHandle: gốc ở tâm cần gạt (cảnh trượt và nghiêng nó)
hd = [box('bar', (0.3, 0.9, 0.1), T(0, 0, 0), BLUE, bevel=0.03)]
for i in range(-3, 4):
    hd.append(box('rib', (0.26, 0.03, 0.012), T(0, 0.052, i * 0.11), BLUE, bevel=0.004))
part('BreakerHandle', hd, (-3.2, 0.75, 0.6))

# TermBoard: bảng cọc đấu dây 1,75 × 1,2; gốc ở mặt bàn giữa bảng; cọc ở x = −0,55 / 0 / 0,55, z = −0,3 / +0,3
tb = [box('plate', (1.75, 1.2, 0.06), T(0, 0.03, 0), BAKELITE, bevel=0.02)]
for x in (-0.275, 0.275):
    tb.append(box('rib', (0.03, 1.0, 0.05), T(x, 0.08, 0), BAKELITE, bevel=0.008))
for i, (a, b) in enumerate((('U1', 'W2'), ('V1', 'U2'), ('W1', 'V2'))):
    tb.append(text('ta', a, 0.085, T(-0.55 + i * 0.55, 0.062, -0.5), CREAM))
    tb.append(text('tb', b, 0.085, T(-0.55 + i * 0.55, 0.062, 0.52), CREAM))
for sx in (-1, 1):
    for sz in (-1, 1):
        tb.append(cyl('screw', 0.03, 0.02, T(sx * 0.8, 0.065, sz * 0.52), CHROME, seg=12))
part('TermBoard', tb, (-1.2, 0, 0.6))

# ================================================================== xe hai bánh tự cân bằng (pid)
# BotBody: gốc trên trục bánh; ba tầng mica, trụ đồng, pin, bo mạch, đầu cảm biến; cao 1,62
bot = [box('head', (0.4, 0.7, 0.2), T(0, 1.5, 0), YELLOW, bevel=0.03), box('battery', (0.2, 0.42, 0.26), T(0, 0.32, 0), ORANGE, bevel=0.02), box('pcb', (0.03, 0.5, 0.42), T(0.06, 0.98, 0), PCB, bevel=0), box('imu', (0.02, 0.14, 0.14), T(0.085, 1.0, 0), INK, bevel=0.004)]
for y in (0.14, 0.72, 1.36):
    bot.append(box('deck', (0.36, 0.64, 0.03), T(0, y, 0), CASE, bevel=0.008))
for sx in (-1, 1):
    for sz in (-1, 1):
        bot.append(cyl('standoff', 0.02, 1.22, T(sx * 0.14, 0.75, sz * 0.27), BRASS, bevel=0))
    bot.append(cyl('gearmotor', 0.11, 0.3, T(0, 0, sx * 0.17), IRON, rot=ZAXIS))
part('BotBody', bot, (0.2, 0.35, 0.6))
# BotWheel: gốc ở tâm trục, trục dọc z; hai bánh ở z = ±0,37
wh = [cyl('axle', 0.04, 0.9, T(0, 0, 0), CHROME, bevel=0, rot=ZAXIS)]
for sz in (-1, 1):
    wh.append(lathe('tire', [(0.22, -0.08), (0.33, -0.08), (0.35, -0.05), (0.35, 0.05), (0.33, 0.08), (0.22, 0.08), (0.22, -0.08)], T(0, 0, sz * 0.37), RUBBER, rot=ZAXIS))
    wh.append(lathe('hub', [(0, -0.06), (0.22, -0.06), (0.22, 0.06), (0, 0.06)], T(0, 0, sz * 0.37), ALU, rot=ZAXIS))
    for i in range(5):  # nan hoa: thấy bánh đang lăn
        a = 2 * math.pi * i / 5
        wh.append(box('spoke', (0.3, 0.03, 0.04), (0.11 * math.cos(a), -sz * 0.45, 0.11 * math.sin(a)), INK, bevel=0, rot=(0, -a, 0)))
part('BotWheel', wh, (1.2, 0.35, 0.6))

# ================================================================== động cơ PMSM (foc)
# PmsmStator: gốc ở mặt bàn, tâm rô-to; vành nhôm, 12 răng quấn dây đồng, đế, ba đầu dây pha
st = [lathe('base', [(0, 0), (1.36, 0), (1.36, 0.05), (0, 0.05)], T(0, 0, 0), IRON), lathe('yoke', [(1.1, 0.05), (1.32, 0.05), (1.32, 0.42), (1.1, 0.42), (1.1, 0.05)], T(0, 0, 0), ALU)]
for i in range(12):
    a = 2 * math.pi * i / 12
    st.append(box('tooth', (0.36, 0.17, 0.3), (0.93 * math.cos(a), 0.93 * math.sin(a), 0.235), STEEL, bevel=0.01, rot=(0, 0, a)))
    st.append(box('coil', (0.22, 0.3, 0.34), (0.96 * math.cos(a), 0.96 * math.sin(a), 0.235), COPPER, bevel=0.05, rot=(0, 0, a)))
for i, m in enumerate((RED, YELLOW, BLUE)):
    st.append(lathe('term', [(0, 0.16), (0.05, 0.16), (0.06, 0.12), (0.06, 0.05), (0.03, 0.045), (0.03, 0.0)], T(-0.25 + i * 0.25, 0.42, 1.21), m))
part('PmsmStator', st, (-0.6, 0, -1.6))
# PmsmRotor: gốc ở tâm rô-to (cảnh đặt cao 0,2); cực N (đỏ) ở −x, cực S (xanh) ở +x
ro = [cyl('core', 0.5, 0.3, T(0, 0, 0), STEEL), cyl('shaft', 0.08, 0.7, T(0, 0.15, 0), CHROME), text('n', 'N', 0.2, T(-0.25, 0.152, 0), CREAM), text('s', 'S', 0.2, T(0.25, 0.152, 0), CREAM)]
for i in range(8):
    a = math.radians(22.5 + 45 * i)
    ro.append(box('magnet', (0.09, 0.4, 0.3), (0.55 * math.cos(a), 0.55 * math.sin(a), 0), RED if math.cos(a) < 0 else BLUE, bevel=0.015, rot=(0, 0, a)))
part('PmsmRotor', ro, (-0.6, 0.6, 0.4))

# ================================================================== Harmonic Drive
# HarmonicRing: vành cứng răng trong, bích bắt bu lông; gốc ở mặt bàn, tâm vành; lòng trong bán kính 1,17
hr = [lathe('ring', [(1.2, 0.02), (1.52, 0.02), (1.52, 0.1), (1.4, 0.1), (1.4, 0.27), (1.2, 0.27), (1.2, 0.02)], T(0, 0, 0), STEEL)]
for i in range(96):
    a = 2 * math.pi * i / 96
    hr.append(box('tooth', (0.06, 0.04, 0.22), (1.185 * math.cos(a), 1.185 * math.sin(a), 0.15), CHROME, bevel=0, rot=(0, 0, a)))
for i in range(8):
    a = 2 * math.pi * (i + 0.5) / 8
    hr.append(cyl('bolt', 0.05, 0.04, (1.46 * math.cos(a), 1.46 * math.sin(a), 0.12), INK, seg=6))
part('HarmonicRing', hr, (2.6, 0, -1.4))
# WaveGen: bộ tạo sóng hình elip (bán trục 0,93 × 0,78), moay-ơ có rãnh then; gốc ở tâm, cao 0,1 (cảnh quay quanh trục đứng)
wg = [scaled(cyl('plug', 1, 0.1, T(0, 0, 0), BRASS, bevel=0.01, seg=72), (0.93, 0.78, 1)), cyl('hub', 0.22, 0.2, T(0, 0.02, 0), IRON), box('keyway', (0.1, 0.05, 0.21), T(0.2, 0.02, 0), INK, bevel=0)]
for sx in (-1, 1):
    wg.append(cyl('lobe', 0.07, 0.11, T(sx * 0.78, 0.005, 0), CHROME))
part('WaveGen', wg, (2.6, 0.6, 0.6))

# ================================================================== thử mỏi
# Clevis: ngàm kẹp mẫu tấm (mẫu dày 0,12 nằm ở y = 0,04…0,16), kéo về +z; gốc ở mặt bàn giữa ngàm
cl = [box('lower', (3.4, 0.5, 0.04), T(0, 0.02, 0), IRON, bevel=0.01), box('upper', (3.4, 0.5, 0.1), T(0, 0.21, 0), IRON, bevel=0.02), cyl('rod', 0.09, 0.3, T(0, 0.12, 0.4), CHROME, rot=ZAXIS), box('yoke', (0.5, 0.12, 0.26), T(0, 0.13, 0.27), IRON, bevel=0.02)]
for i in range(6):
    cl.append(cyl('bolt', 0.06, 0.05, T(-1.4 + i * 0.56, 0.28, 0), CHROME, seg=6))
part('Clevis', cl, (0, 0, 1.9))

# ================================================================== phản ứng dao động BZ
# Stirrer: máy khuấy từ dưới cốc (cốc bán kính 1), bảng điều khiển phía trước, trụ đỡ và điện cực đo; gốc ở mặt bàn, tâm cốc
sr = [
    box('pad', (2.4, 2.4, 0.026), T(0, 0.013, 0), CASE, bevel=0.01),
    box('panel', (2.4, 0.5, 0.22), T(0, 0.11, 1.42), CASE, bevel=0.03),
    lathe('knob', [(0, 0.1), (0.1, 0.1), (0.13, 0.07), (0.13, 0.0), (0, 0.0)], T(0.6, 0.22, 1.42), BAKELITE),
    box('led', (0.08, 0.08, 0.01), T(-0.7, 0.222, 1.42), LED, bevel=0),
    text('rpm', 'RPM', 0.07, T(0.1, 0.222, 1.42), INK),
    cyl('rod', 0.035, 2.4, T(-1.05, 1.2, -1.05), CHROME, bevel=0),
    lathe('foot', [(0, 0.06), (0.1, 0.06), (0.22, 0.03), (0.24, 0.0), (0, 0.0)], T(-1.05, 0.026, -1.05), IRON),
    box('arm', (0.78, 0.05, 0.05), T(-0.8, 2.0, -0.8), IRON, bevel=0.008, rot=(0, 0, math.radians(-45))),
    cyl('probe', 0.045, 1.2, T(-0.55, 1.42, -0.55), WHITE, bevel=0.01),
    cyl('probeCap', 0.06, 0.16, T(-0.55, 2.06, -0.55), INK, bevel=0.01),
]
part('Stirrer', sr, (-2.6, 0, 2.6))

# ================================================================== điện di trên gel
# GelTank: bể mica quanh bản gel 4,4 × 3,1 (gel cao tới 0,24), hai điện cực bạch kim và hai cọc; gốc ở mặt bàn, tâm gel; cực âm ở −z
gt = [box('base', (4.94, 3.58, 0.03), T(0, 0.015, 0), CASE, bevel=0.008)]
for sz in (-1, 1):
    gt.append(box('wallL', (4.94, 0.04, 0.5), T(0, 0.27, sz * 1.77), GLASS, bevel=0))
    gt.append(cyl('wire', 0.014, 4.7, T(0, 0.1, sz * 1.66), CHROME, bevel=0, rot=XAXIS))
    gt.append(lathe('post', [(0, 0.24), (0.07, 0.24), (0.09, 0.18), (0.09, 0.08), (0.045, 0.07), (0.045, 0.0)], T(2.3, 0.52, sz * 1.66), RED if sz > 0 else INK))
    gt.append(cyl('riser', 0.014, 0.44, T(2.3, 0.31, sz * 1.66), CHROME, bevel=0))
for sx in (-1, 1):
    gt.append(box('wallS', (0.04, 3.5, 0.5), T(sx * 2.45, 0.27, 0), GLASS, bevel=0))
part('GelTank', gt, (-2.4, 0, -3.6))
# GelPSU: nguồn điện di; gốc ở mặt bàn giữa hộp; mặt trước quay về +z
psu = [
    box('case', (0.9, 0.7, 0.5), T(0, 0.25, 0), CASE, bevel=0.03),
    box('screen', (0.52, 0.012, 0.17), T(0, 0.34, 0.352), INK, bevel=0),
    text('volt', '100 V', 0.1, T(0, 0.34, 0.36), LED, rot=FRONT),
    lathe('knobA', [(0, 0.07), (0.06, 0.07), (0.08, 0.05), (0.08, 0.0), (0, 0.0)], T(-0.22, 0.13, 0.35), BAKELITE, rot=ZAXIS),
    lathe('knobB', [(0, 0.07), (0.06, 0.07), (0.08, 0.05), (0.08, 0.0), (0, 0.0)], T(0.02, 0.13, 0.35), BAKELITE, rot=ZAXIS),
    cyl('jackR', 0.035, 0.05, T(0.24, 0.13, 0.36), RED, rot=ZAXIS),
    cyl('jackB', 0.035, 0.05, T(0.36, 0.13, 0.36), INK, rot=ZAXIS),
]
part('GelPSU', psu, (1.2, 0, -3.6))

# ================================================================== ruồi giấm của Morgan
# FlyTray: khay đếm ruồi 1,6 × 2,2 có gờ; gốc ở mặt bàn giữa khay (chấm ruồi của cảnh nằm ở y = 0,07)
ft = [box('floor', (1.6, 2.2, 0.03), T(0, 0.015, 0), PAPER, bevel=0.006)]
for sz in (-1, 1):
    ft.append(box('rimL', (1.66, 0.04, 0.13), T(0, 0.065, sz * 1.11), CASE, bevel=0.012))
for sx in (-1, 1):
    ft.append(box('rimS', (0.04, 2.2, 0.13), T(sx * 0.81, 0.065, 0), CASE, bevel=0.012))
part('FlyTray', ft, (-2.6, 0, 1.2))
# FlyVial: ống nuôi ruồi có lớp thức ăn và nút bông; gốc ở mặt bàn
part('FlyVial', [
    lathe('vial', [(0, 0.0), (0.16, 0.0), (0.17, 0.02), (0.17, 0.5), (0.155, 0.52), (0.155, 0.56), (0.145, 0.56), (0.145, 0.03), (0, 0.03)], T(0, 0, 0), GLASS),
    cyl('food', 0.142, 0.1, T(0, 0.08, 0), FOOD, bevel=0),
    cyl('plug', 0.15, 0.16, T(0, 0.55, 0), WHITE, bevel=0.03),
], (-1.2, 0, 1.2))

# ================================================================== tán xạ Rutherford
# AlphaSource: hộp chì chứa nguồn, ống chuẩn trực chĩa về +x; gốc ở mặt bàn giữa hộp
part('AlphaSource', [
    box('block', (0.7, 0.9, 0.5), T(0, 0.25, 0), LEAD, bevel=0.03),
    cyl('collimator', 0.06, 0.34, T(0.5, 0.1, 0), BRASS, rot=XAXIS),
    cyl('bore', 0.025, 0.02, T(0.672, 0.1, 0), INK, bevel=0, rot=XAXIS),
    box('tag', (0.5, 0.5, 0.006), T(0, 0.503, 0), YELLOW, bevel=0),
    text('tagT', 'Po-210', 0.1, T(0, 0.508, -0.06), INK),
    text('tagA', 'α', 0.16, T(0, 0.508, 0.12), INK),
], (0.2, 0, -3.6))
# ScintScreen: màn kẽm sunfua trong khung, quay mặt về −x; gốc ở mặt bàn giữa khung
part('ScintScreen', [
    box('screen', (0.03, 2.7, 0.5), T(0, 0.3, 0), ZNS, bevel=0),
    box('top', (0.08, 2.8, 0.05), T(0.01, 0.575, 0), IRON, bevel=0.01),
    box('sill', (0.2, 2.8, 0.05), T(0.03, 0.025, 0), IRON, bevel=0.01),
    box('postA', (0.08, 0.06, 0.6), T(0.01, 0.3, -1.38), IRON, bevel=0.01),
    box('postB', (0.08, 0.06, 0.6), T(0.01, 0.3, 1.38), IRON, bevel=0.01),
], (2.2, 0, -3.6))

export_glb('sims-parts.glb')
preview((0.2, 7.5, 7.5), (0, 0.3, -0.6), lens=30)
