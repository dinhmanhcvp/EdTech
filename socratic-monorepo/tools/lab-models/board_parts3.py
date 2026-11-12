"""
Thiết bị Hóa – Sinh cho bảng: giá ống nghiệm, ống nghiệm, lọ nhỏ giọt, đèn cồn/đèn Bunsen + que thử màu ngọn lửa + đĩa muối,
pin điện hóa (cốc, cầu muối, điện cực, đồng hồ, phích cắm), ribosome + tRNA.
Mỗi bộ phận là MỘT lưới mang tên cố định (hợp đồng trong `scenes3dExtra.test.ts`), gốc ghi ở từng mục; trục theo three.js.
Vật liệu mang tên để cảnh tô màu: `salt` (muối trên đĩa), `plate` (tấm kim loại), `subL`/`subS` (hai tiểu đơn vị ribosome), `aa` (amino acid), `glass` (thủy tinh của cảnh).

Chạy:
  blender --background --python tools/lab-models/board_parts3.py -- apps/teacher-board/public/models [ảnh xem thử.png tube|flame|cell|ribo]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F401,F403

SHOW = argv[2] if len(argv) > 2 else 'tube'
AMBER = mat('amber', hexc('#8A4B12'), rough=0.2, alpha=0.75)
SALT = mat('salt', hexc('#F4F2EC'), rough=0.9)
PLATE = mat('plate', hexc('#B9BCC2'), metallic=1, rough=0.3)
SUBL = mat('subL', hexc('#E8902B'), rough=0.45)
SUBS = mat('subS', hexc('#4F7FE0'), rough=0.45)
AAM = mat('aa', hexc('#F2B33D'), rough=0.35)
TRNA = mat('trna', hexc('#2E9E6B'), rough=0.4)
CERAMIC = mat('ceramic', hexc('#E7E0D0'), rough=0.6)
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


def squash(o, sc):
    """co giãn rồi áp vào lưới (join giữ tỉ lệ của vật đứng đầu nên phải áp trước khi gộp)"""
    o.scale = sc
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(scale=True)


# ================================================================== ống nghiệm
# TubeRack: giá gỗ dài 7 có bốn lỗ ở x = −2,4; −0,8; 0,8; 2,4 (độ cao mặt giá y = 0,9); gốc ở mặt bàn giữa giá
rk = [B('top', 7.0, 0.14, 1.3, (0, 0.83, 0), WOOD, bevel=0.02), B('shelf', 7.0, 0.12, 1.3, (0, 0.28, 0), WOOD, bevel=0.02)]
for sx in (-3.35, 3.35):
    rk.append(B('leg', 0.2, 0.9, 1.3, (sx, 0.45, 0), WOOD, bevel=0.02))
for x in (-2.4, -0.8, 0.8, 2.4):
    rk.append(cyl('ring', 0.4, 0.05, T(x, 0.91, 0), BRASS, bevel=0))
RACK = make('TubeRack', rk, 'tube', (0, 0, 0))
# TestTube: ống nghiệm thủy tinh cao 2,6 bán kính 0,32 đáy tròn, miệng loe; gốc ở đáy (cảnh đặt ở y = 0,25 khi cắm giá)
TUBE = make('TestTube', [lathe('tube', [(0, 0.0), (0.12, 0.01), (0.22, 0.06), (0.3, 0.16), (0.32, 0.3), (0.32, 2.5), (0.36, 2.58), (0.36, 2.62), (0.3, 2.56), (0.28, 0.3), (0.2, 0.12), (0, 0.06)], T(0, 0, 0), GLASS, steps=40)], 'tube', (-0.8, 0.25, 0))
# DropperBottle: lọ thuốc thử nâu có nhãn kem và ống nhỏ giọt cao su; gốc ở đáy lọ. Nhãn dán đặt tại z = +0,43
DB = make('DropperBottle', [
    lathe('bottle', [(0, 0.0), (0.38, 0.0), (0.44, 0.08), (0.44, 1.2), (0.36, 1.6), (0.18, 1.75), (0.18, 1.9), (0, 1.9)], T(0, 0, 0), AMBER, steps=40),
    cyl('cap', 0.2, 0.14, T(0, 1.95, 0), BAKELITE, bevel=0.01),
    lathe('bulb', [(0, 0.0), (0.12, 0.0), (0.2, 0.2), (0.22, 0.6), (0.12, 0.95), (0, 1.0)], T(0, 2.02, 0), RUBBER, steps=28),
    B('label', 0.5, 0.65, 0.01, (0, 0.65, 0.44), CREAM, bevel=0),
], 'tube', (2.4, 0.0, 0))

# ================================================================== màu ngọn lửa
# Bunsen: đèn Bunsen đế tròn, thân kim loại cao 2,6, vòng chỉnh gió, ống dẫn khí; gốc ở mặt bàn giữa đế; miệng đèn ở y = 2,7
bn = [cyl('base', 0.9, 0.18, T(0, 0.09, 0), IRON, seg=48), cyl('stem', 0.28, 0.4, T(0, 0.38, 0), STEEL), cyl('barrel', 0.2, 2.1, T(0, 1.6, 0), CHROME, bevel=0.01),
      lathe('collar', [(0.2, 0.0), (0.32, 0.0), (0.32, 0.3), (0.2, 0.3)], T(0, 0.6, 0), BRASS), cyl('lip', 0.24, 0.1, T(0, 2.68, 0), CHROME, bevel=0.01),
      tube('hose', [T(0.2, 0.4, 0), T(1.1, 0.4, 0), T(1.7, 0.2, 0.4), T(2.6, 0.2, 0.4)], 0.07, RUBBER, smooth=True)]
BUN = make('Bunsen', bn, 'flame', (0, 0, 0))
# WireLoop: que thử bằng dây nicrom: vòng dây ở đầu dưới, cán sứ dài 3,4 hướng lên; gốc ở tâm vòng dây (cảnh đặt vào ngọn lửa)
loop = [tube('wire', [T(0.0, 0.5 * math.sin(a), 0.0) if False else T(0.16 * math.cos(a), 0.16 + 0.16 * math.sin(a), 0) for a in [i * math.pi / 8 for i in range(17)]], 0.012, STEEL, smooth=False),
        tube('stem', [T(0, 0.32, 0), T(0, 0.9, 0)], 0.02, STEEL, smooth=False), cyl('handle', 0.07, 2.6, T(0, 2.2, 0), CERAMIC, bevel=0.01)]
LOOP = make('WireLoop', loop, 'flame', (1.0, 3.0, 0))
# Dish: đĩa đồng hồ đựng muối, đống muối trắng (vật liệu `salt`); gốc ở đáy đĩa
DISH = make('Dish', [lathe('dish', [(0, 0.0), (0.4, 0.02), (0.55, 0.1), (0.6, 0.14), (0.55, 0.14), (0.4, 0.07), (0, 0.04)], T(0, 0, 0), GLASS, steps=32), lathe('salt', [(0, 0.3), (0.12, 0.26), (0.3, 0.1), (0.34, 0.06), (0, 0.05)], T(0, 0, 0), SALT, steps=24)], 'flame', (-1.0, 0, 1.0))

# ================================================================== pin điện hóa
# GBeaker: cốc thủy tinh cao 1,8 bán kính 1,05; gốc ở đáy
GB = make('GBeaker', [lathe('beaker', [(0, 0.0), (1.0, 0.0), (1.05, 0.06), (1.05, 1.75), (1.1, 1.8), (1.05, 1.8), (1.0, 1.7), (1.0, 0.08), (0, 0.08)], T(0, 0, 0), GLASS, steps=48)], 'cell', (-1.7, 0, 0))
# SaltBridge: cầu muối chữ U úp, hai chân cắm vào hai cốc cách nhau 3,4: chân tại x = ±1,7, đỉnh ở y = 2,5, chân chạm tới y = 0,9; gốc ở giữa hai cốc
SB = make('SaltBridge', [tube('u', [T(-1.7, 0.9, 0), T(-1.7, 2.3, 0), T(-1.4, 2.6, 0), T(1.4, 2.6, 0), T(1.7, 2.3, 0), T(1.7, 0.9, 0)], 0.1, GLASS, smooth=False)], 'cell', (0, 0, 0))
# Plate: tấm kim loại 0,5 × 2,0 × 0,06 (vật liệu `plate`) có kẹp đồng và đầu nối ở đỉnh; gốc ở đáy tấm (cảnh đặt ở y = 0,25)
PL = make('Plate', [B('plate', 0.5, 2.0, 0.06, (0, 1.0, 0), PLATE, bevel=0.01), cyl('clip', 0.1, 0.2, T(0, 2.0, 0), BRASS, bevel=0.01), cyl('post', 0.05, 0.25, T(0, 2.2, 0), COPPER, bevel=0.005), ball('top', 0.08, T(0, 2.34, 0), BRASS)], 'cell', (-1.7, 0.25, 0))
# GalvMeter + GalvNeedle: vôn kế chia vạch 0 ở giữa (kim lệch hai phía), mặt tròn bán kính 0,55 quay +z, đứng trên chân; gốc ở tâm mặt
gm = [lathe('ring', [(0.5, 0.0), (0.58, 0.0), (0.6, 0.05), (0.6, 0.12), (0.54, 0.12), (0.5, 0.08)], T(0, 0, 0), CHROME, rot=ZAXIS), cyl('face', 0.52, 0.04, T(0, 0, 0), CREAM, rot=ZAXIS, bevel=0, seg=64),
      cyl('hub', 0.04, 0.06, T(0, 0, 0.04), INK, rot=ZAXIS), B('foot', 0.6, 0.1, 0.5, (0, -0.85, -0.05), IRON, bevel=0.02), B('neck', 0.12, 0.5, 0.12, (0, -0.55, -0.05), CHROME, bevel=0.02),
      text('v', 'V', 0.18, T(0, -0.2, 0.03), INK, rot=FRONT, depth=0.001)]
for i in range(0, 21):
    th = math.radians(-60 + 120 * i / 20)
    ln_ = 0.1 if i % 5 == 0 else 0.05
    r = 0.44 - ln_ / 2
    gm.append(B('tick', 0.012, ln_, 0.004, (r * math.sin(th), r * math.cos(th), 0.026), RED if i == 10 else INK, bevel=0, rot=(0, -th, 0)))
GM = make('GalvMeter', gm, 'cell', (0, 2.2, -1.6))
GN = make('GalvNeedle', [B('n', 0.026, 0.4, 0.006, (0, 0.13, 0.04), RED, bevel=0), B('t', 0.026, 0.1, 0.006, (0, -0.05, 0.04), RED, bevel=0)], 'cell', (0, 2.2, -1.6))
# Plug: phích cắm chuối (đầu đồng + tay cầm đỏ); gốc ở đầu cắm, cán hướng +y
PLUG = make('Plug', [cyl('pin', 0.045, 0.28, T(0, 0.14, 0), BRASS, bevel=0.005), cyl('grip', 0.11, 0.5, T(0, 0.53, 0), RED, bevel=0.02)], 'cell', (1.7, 2.6, 0))

# ================================================================== ribosome và tRNA
# Ribosome: tiểu đơn vị lớn (cam, `subL`) ở trên, nhỏ (xanh, `subS`) ở dưới, giữa là khe cho mRNA đi qua ở y = 0; rộng 2,6 (x); gốc ở tâm khe
rb = []
big = ball('large', 1.0, T(0, 1.05, 0), SUBL)
squash(big, (1.3, 0.95, 0.9))
small = ball('small', 1.0, T(0, -0.78, 0), SUBS)
squash(small, (1.05, 0.62, 0.8))
RIBO = make('Ribosome', [big, small], 'ribo', (0, 0, 0))
# TRNA: tRNA hình chữ L: thân nhận amino acid hướng lên (quả cầu `aa` ở đỉnh), nhánh T và D, vòng đối mã ở đáy với ba hạt; gốc ở tâm vòng đối mã
pts = [T(0, 0.15, 0), T(0, 1.2, 0)]
tr = [tube('stem', pts, 0.05, TRNA, smooth=False), tube('arm', [T(0, 0.8, 0), T(0.35, 0.95, 0), T(0.5, 1.15, 0)], 0.045, TRNA, smooth=False), tube('arm2', [T(0, 0.8, 0), T(-0.35, 0.95, 0), T(-0.5, 1.15, 0)], 0.045, TRNA, smooth=False),
      ball('aa', 0.2, T(0, 1.4, 0), AAM)]
for i in (-1, 0, 1):
    tr.append(ball('base', 0.075, T(i * 0.18, 0.0, 0.0), TRNA))
tr.append(tube('loop', [T(-0.18, 0.0, 0), T(-0.1, 0.1, 0), T(0, 0.15, 0), T(0.1, 0.1, 0), T(0.18, 0.0, 0)], 0.03, TRNA, smooth=False))
TR = make('TRNA', tr, 'ribo', (0, -1.5, 0))

export_glb('board-parts3.glb')
CAM = {'tube': ((0, 2.8, 10), (0, 1.3, 0)), 'flame': ((0, 3, 10), (0, 2, 0)), 'cell': ((0, 3, 9), (0, 1.6, 0)), 'ribo': ((0, 0.5, 8), (0, 0.0, 0))}[SHOW]
preview(CAM[0], CAM[1], lens=30)
