"""
Dụng cụ hóa học dùng chung của /lab (engines/families/HandsChem3D.tsx và các bài hóa): ống nghiệm, cốc thủy tinh, giá gỗ,
chai hóa chất, đèn cồn, thùng thải. Mỗi dụng cụ là MỘT lưới mang tên cố định, gốc toạ độ ở tâm đáy.
Vật liệu mang tên để cảnh đổi màu đúng chỗ: `glass` (thủy tinh), `liquid` (chất trong chai), `cap` (nút chai theo nhóm chất),
`alcohol` (cồn trong đèn).

Chạy:
  blender --background --python tools/lab-models/chem_parts.py -- apps/teacher-board/public/models [ảnh xem thử.png]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F401,F403

LIQUID = mat('liquid', (0.75, 0.86, 0.95), rough=0.25)
CAP = mat('cap', (0.9, 0.9, 0.9), rough=0.45)
ALCOHOL = mat('alcohol', hexc('#5FA8E8'), rough=0.1, alpha=0.55)
PLASTIC = mat('plastic', hexc('#3A3E7A'), rough=0.5)


def part(name, objs, show):
    o = join(name, objs)
    o.location = T(*show)
    return o


# ---- ống nghiệm (bán kính 0,17, cao 1): đáy bo, miệng loe
part('TestTube', [lathe('tube', [(0, 0), (0.12, 0.0), (0.158, 0.025), (0.17, 0.08), (0.17, 0.95), (0.178, 0.985), (0.195, 1.0)], T(0, 0, 0), GLASS)], (-2.6, 0, 0))

# ---- cốc thủy tinh (bán kính 0,55, cao 0,85) có vạch chia và mỏ rót
beaker = [lathe('wall', [(0, 0), (0.5, 0), (0.54, 0.025), (0.55, 0.08), (0.55, 0.8), (0.565, 0.835), (0.59, 0.85)], T(0, 0, 0), GLASS)]
for i, y in enumerate((0.2, 0.32, 0.44, 0.56, 0.68)):
    a = -0.5
    for j in range(5 if i % 2 == 0 else 3):  # vạch dài / vạch ngắn uốn theo thành cốc
        b = a + j * 0.045
        beaker.append(box('mark', (0.028, 0.004, 0.008), T(math.sin(b) * 0.553, y, math.cos(b) * 0.553), WHITE, bevel=0, rot=(0, 0, -b)))
beaker.append(text('unit', 'mL', 0.07, T(math.sin(-0.62) * 0.56, 0.74, math.cos(-0.62) * 0.56), WHITE, rot=(math.radians(90), 0, -0.62)))
part('Beaker', beaker, (-1.5, 0, 0))

# ---- giá ống nghiệm bằng gỗ (dài 3,4, sâu 0,7): mặt đế cao 0,1 để ống đứng lên
rack = [box('plank', (3.4, 0.7, 0.1), T(0, 0.05, 0), WOOD, bevel=0.02)]
for sx in (-1, 1):
    rack.append(box('post', (0.09, 0.62, 0.62), T(sx * 1.63, 0.4, 0), WOOD, bevel=0.015))
for sz in (-1, 1):
    rack.append(box('rail', (3.3, 0.05, 0.06), T(0, 0.66, sz * 0.27), WOOD, bevel=0.012))
for sx in (-1, 1):
    for sz in (-1, 1):
        rack.append(lathe('peg', [(0, 0.012), (0.025, 0.012), (0.03, 0)], T(sx * 1.63, 0.71, sz * 0.27), BRASS))
part('Rack', rack, (0.6, 0, -1.6))

# ---- chai hóa chất: thân thủy tinh, chất bên trong, nhãn giấy, nút mài
part('Bottle', [
    lathe('body', [(0, 0), (0.13, 0), (0.15, 0.02), (0.15, 0.34), (0.125, 0.42), (0.07, 0.46), (0.07, 0.54), (0.088, 0.56)], T(0, 0, 0), GLASS),
    lathe('content', [(0, 0.016), (0.134, 0.02), (0.134, 0.3), (0, 0.3)], T(0, 0, 0), LIQUID),
    lathe('label', [(0.1515, 0.1), (0.1515, 0.27)], T(0, 0, 0), CREAM),
    lathe('stopper', [(0, 0.67), (0.045, 0.67), (0.078, 0.63), (0.078, 0.585), (0.058, 0.575), (0.052, 0.5), (0, 0.5)], T(0, 0, 0), CAP),
], (-0.4, 0, 0))

# ---- đèn cồn: bầu thủy tinh, cồn, cổ đồng, bấc
part('Lamp', [
    lathe('font', [(0, 0), (0.2, 0), (0.28, 0.045), (0.3, 0.13), (0.25, 0.25), (0.11, 0.32), (0.085, 0.345)], T(0, 0, 0), GLASS),
    lathe('spirit', [(0, 0.02), (0.255, 0.055), (0.275, 0.13), (0.25, 0.2), (0, 0.2)], T(0, 0, 0), ALCOHOL),
    cyl('collar', 0.095, 0.07, T(0, 0.375, 0), BRASS),
    cyl('wick', 0.028, 0.1, T(0, 0.45, 0), CREAM, bevel=0),
], (0.5, 0, 0))

# ---- thùng thải
part('Bin', [lathe('bucket', [(0, 0), (0.36, 0), (0.4, 0.03), (0.46, 0.5), (0.49, 0.52), (0.49, 0.56), (0.44, 0.56), (0.4, 0.06), (0, 0.06)], T(0, 0, 0), PLASTIC)], (1.6, 0, 0))

# ================================================================== dụng cụ cho các bài hóa có thao tác (chuẩn độ, NO₂, clo, kim loại kiềm)
XAXIS = (0, math.radians(90), 0)
ZAXIS = (math.radians(90), 0, 0)
STEEL_C = mat('steelc', (0.55, 0.57, 0.6), metallic=1, rough=0.35)

# ---- bình tam giác: đáy r 0,5, cao 0,95
part('Erlenmeyer', [lathe('wall', [(0, 0), (0.46, 0), (0.5, 0.03), (0.5, 0.07), (0.17, 0.72), (0.15, 0.78), (0.15, 0.92), (0.175, 0.95)], T(0, 0, 0), GLASS)], (-2.6, 0, 1.4))

# ---- buret: gốc ở đầu vòi; thân chia vạch từ y = 0,5 tới 2,4; khóa ở y = 0,36
bur = [lathe('tip', [(0.012, 0), (0.02, 0), (0.035, 0.22), (0.035, 0.3)], T(0, 0, 0), GLASS), lathe('body', [(0.035, 0.42), (0.085, 0.5), (0.085, 2.4), (0.1, 2.45)], T(0, 0, 0), GLASS), cyl('cockBody', 0.055, 0.2, T(0, 0.36, 0), WHITE, rot=ZAXIS, bevel=0.004)]
for i in range(21):
    bur.append(box('mark', (0.07 if i % 5 == 0 else 0.04, 0.004, 0.006), T(0, 0.6 + i * 0.085, 0.086), INK, bevel=0))
part('Burette', bur, (-1.7, 0, 1.4))
# Stopcock: khóa buret (tay vặn), gốc trên trục khóa; cảnh quay quanh trục z để mở
part('Stopcock', [box('key', (0.05, 0.03, 0.22), T(0, 0, 0.14), BLUE, bevel=0.008), cyl('stem', 0.02, 0.1, T(0, 0, 0.08), BLUE, rot=ZAXIS, bevel=0)], (-1.3, 0.36, 1.4))

# ---- giá sắt có hai kẹp: gốc ở mặt bàn ngay dưới trục dụng cụ được kẹp; cọc ở x = −0,6
rs = [box('base', (1.2, 0.75, 0.06), T(-0.3, 0.03, 0), IRON, bevel=0.02), cyl('rod', 0.035, 3.4, T(-0.6, 1.73, 0), CHROME)]
for y in (1.3, 2.5):
    rs.append(box('boss', (0.14, 0.14, 0.14), T(-0.6, y, 0), IRON, bevel=0.02))
    rs.append(box('arm', (0.42, 0.045, 0.045), T(-0.36, y, 0), STEEL_C, bevel=0.008))
    for z in (-0.1, 0.1):
        rs.append(box('jaw', (0.24, 0.03, 0.045), T(-0.04, y, z), STEEL_C, bevel=0.006))
    rs.append(lathe('thumb', [(0, 0.1), (0.04, 0.1), (0.05, 0.07), (0.02, 0.06), (0.02, 0.0)], T(-0.6, y, 0.09), BRASS, rot=ZAXIS))
part('RetortStand', rs, (-0.7, 0, 1.4))

# ---- bình thu khí có tấm kính đậy: r 0,55, cao 1,8
part('GasJar', [lathe('wall', [(0, 0), (0.5, 0), (0.55, 0.04), (0.55, 1.7), (0.6, 1.74), (0.62, 1.78)], T(0, 0, 0), GLASS), cyl('lid', 0.72, 0.03, T(0, 1.8, 0), GLASS, bevel=0.004)], (0.4, 0, 1.4))

# ---- bình rửa khí: chất lỏng mang vật liệu `liquid`, hai ống thủy tinh (dài: khí vào, ngắn: khí ra)
part('WashBottle', [
    lathe('body', [(0, 0), (0.34, 0), (0.38, 0.04), (0.38, 0.6), (0.2, 0.78), (0.16, 0.82), (0.16, 0.95)], T(0, 0, 0), GLASS),
    lathe('content', [(0, 0.02), (0.35, 0.05), (0.35, 0.4), (0, 0.4)], T(0, 0, 0), LIQUID),
    cyl('stopper', 0.165, 0.12, T(0, 0.98, 0), mat('rubberc', hexc('#3A2A20'), rough=0.9), bevel=0.01),
    cyl('inTube', 0.022, 1.3, T(-0.07, 0.77, 0), GLASS, bevel=0),
    cyl('outTube', 0.022, 0.55, T(0.07, 1.14, 0), GLASS, bevel=0),
], (1.5, 0, 1.4))

# ---- chậu thủy tinh: r 1,4, cao 0,9
part('Trough', [lathe('wall', [(0, 0), (1.3, 0), (1.4, 0.05), (1.4, 0.85), (1.45, 0.9), (1.38, 0.9), (1.34, 0.08), (0, 0.06)], T(0, 0, 0), GLASS)], (3.4, 0, -1.4))

# ---- xi-lanh thủy tinh nằm ngang: gốc ở tâm đáy kín, thân dài 3,6 về +x, có vạch chia
syr = [lathe('barrel', [(0.06, -0.22), (0.06, -0.02), (0.2, 0.0), (0.5, 0.02), (0.52, 0.06), (0.52, 3.6), (0.66, 3.6), (0.66, 3.66), (0.5, 3.66)], T(0, 0, 0), GLASS, rot=XAXIS)]
for i in range(13):
    syr.append(box('mark', (0.008, 0.006, 0.16 if i % 3 == 0 else 0.09), T(0.3 + i * 0.25, 0.3, 0.432), INK, bevel=0))
part('SyringeBarrel', syr, (-3.4, 0.9, -1.6))
# SyringePlunger: gốc ở mặt pít-tông, cán về +x
part('SyringePlunger', [cyl('piston', 0.47, 0.14, T(0.07, 0, 0), mat('rubberp', hexc('#15171B'), rough=0.85), rot=XAXIS, bevel=0.01), cyl('rodp', 0.07, 3.4, T(1.84, 0, 0), STEEL_C, rot=XAXIS, bevel=0), cyl('thumb', 0.4, 0.06, T(3.57, 0, 0), WHITE, rot=XAXIS, bevel=0.012)], (-3.4, 0.9, -2.6))

# ---- bể nước hình hộp bằng kính: lòng 4 × 1,6, cao 0,55
tank = [box('floor', (4.1, 1.7, 0.04), T(0, 0.02, 0), GLASS, bevel=0)]
for z in (-0.83, 0.83):
    tank.append(box('wallL', (4.1, 0.04, 0.55), T(0, 0.295, z), GLASS, bevel=0))
for x in (-2.03, 2.03):
    tank.append(box('wallS', (0.04, 1.7, 0.55), T(x, 0.295, 0), GLASS, bevel=0))
part('Tank', tank, (0.4, 0, -2.4))

# ---- bình điều chế khí: bình tam giác + nút + phễu nhỏ giọt + ống dẫn ra
part('Generator', [
    lathe('flask', [(0, 0), (0.46, 0), (0.5, 0.03), (0.5, 0.07), (0.17, 0.72), (0.15, 0.78), (0.15, 0.92), (0.175, 0.95)], T(0, 0, 0), GLASS),
    cyl('plug', 0.15, 0.1, T(0, 0.97, 0), mat('rubberg', hexc('#3A2A20'), rough=0.9), bevel=0.01),
    lathe('funnel', [(0.02, 0.35), (0.02, 1.4), (0.2, 1.55), (0.22, 1.9), (0.2, 1.95)], T(-0.05, 0, 0), GLASS),
    box('funnelCock', (0.16, 0.03, 0.04), T(-0.05, 1.25, 0.03), BLUE, bevel=0.006),
    tube('outlet', [T(0.08, 0.9, 0), T(0.08, 1.3, 0), T(0.2, 1.42, 0), T(0.7, 1.42, 0)], 0.022, GLASS),
], (-3.4, 0, -0.2))

# ---- mảnh vải màu treo trên móc: gốc ở tâm mảnh vải; vải mang vật liệu `tint`
part('Cloth', [box('fabric', (0.8, 0.02, 1.0), T(0, 0, 0), mat('tint', (0.76, 0.1, 0.36), rough=0.95), bevel=0.004), tube('hook', [T(0, 0.5, 0), T(0, 0.75, 0), T(0.1, 0.85, 0), T(0.2, 0.78, 0)], 0.012, CHROME)], (2.4, 0.6, 1.4))

export_glb('chem-parts.glb')
preview((0.0, 4.6, 6.6), (0.0, 0.6, -0.4), lens=32)
