"""
Bộ phận thao tác dùng chung của các bài mô phỏng trong /lab (engines/families/handsOps.ts): núm xoay, mặt chia độ, ổ lắp,
quả cân, công tắc dao, cần kéo. Mỗi bộ phận là MỘT lưới mang tên cố định, gốc toạ độ đặt đúng chỗ mà handsOps đặt vật thay thế.

Chạy:
  blender --background --python tools/lab-models/ops_parts.py -- apps/teacher-board/public/models [ảnh xem thử.png]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F401,F403

INDIGO = mat('indigo', hexc('#2A2E66'), rough=0.5)
TINT = mat('tint', (0.92, 0.92, 0.92), metallic=0.55, rough=0.35)  # handsOps nhuộm màu theo từng lựa chọn


def part(name, objs, show):
    """gộp thành một lưới có gốc ở gốc toạ độ của bộ phận, rồi dời ra chỗ trưng bày cho ảnh xem thử"""
    o = join(name, objs)
    o.location = T(*show)
    return o


# ---- núm xoay: thân bakelite có khía, vạch trắng chỉ về phía sau bàn (−z của three.js)
cap = [lathe('cap', [(0, 0.1), (0.12, 0.1), (0.15, 0.085), (0.165, -0.02), (0.2, -0.035), (0.215, -0.1), (0, -0.1)], T(0, 0, 0), BAKELITE)]
for i in range(16):
    a = i / 16 * 2 * math.pi
    cap.append(cyl('flute', 0.016, 0.1, T(math.sin(a) * 0.158, 0.03, math.cos(a) * 0.158), BAKELITE, bevel=0, seg=10))
cap.append(box('line', (0.024, 0.11, 0.006), T(0, 0.102, -0.065), WHITE, bevel=0))
cap.append(lathe('capTop', [(0, 0.104), (0.07, 0.104), (0.08, 0.1)], T(0, 0, 0), CHROME))
part('KnobCap', cap, (-2.4, 0.18, 0))

# ---- mặt chia độ dưới núm
dial = [lathe('plate', [(0, 0.03), (0.44, 0.03), (0.47, 0.012), (0.47, 0)], T(0, 0, 0), INDIGO), lathe('ring', [(0.23, 0.03), (0.23, 0.045), (0.27, 0.045), (0.28, 0.03)], T(0, 0, 0), BRASS)]
for j in range(11):
    a = -0.75 * math.pi + j / 10 * 1.5 * math.pi
    dial.append(box('tick', (0.022 if j % 5 == 0 else 0.012, 0.075, 0.004), T(math.sin(a) * 0.37, 0.032, -math.cos(a) * 0.37), CREAM, bevel=0, rot=(0, 0, -a)))
part('KnobDial', dial, (-2.4, 0, 0))

# ---- ổ lắp: cốc đồng lót nỉ
sock = [
    lathe('wall', [(0.2, 0.0), (0.31, 0.0), (0.31, 0.045), (0.29, 0.07), (0.262, 0.07), (0.262, 0.032), (0.2, 0.032)], T(0, 0, 0), BRASS),
    lathe('felt', [(0, 0.034), (0.262, 0.034)], T(0, 0, 0), mat('felt', hexc('#14173F'), rough=0.95)),
]
for i in range(3):
    a = i / 3 * 2 * math.pi + 0.5
    sock.append(lathe('screw', [(0, 0.052), (0.02, 0.052), (0.026, 0.046)], T(math.sin(a) * 0.285, 0, math.cos(a) * 0.285), CHROME))
part('Socket', sock, (-1.2, 0, 0))

# ---- quả cân có núm cầm (một vật liệu để nhuộm màu)
part('Token', [lathe('mass', [(0, 0.1), (0.045, 0.1), (0.05, 0.09), (0.036, 0.075), (0.036, 0.058), (0.13, 0.055), (0.15, 0.04), (0.15, -0.085), (0.135, -0.1), (0, -0.1)], T(0, 0, 0), TINT)], (-0.4, 0.1, 0))

# ---- công tắc dao: đế, hai ngàm đồng, bản lề, cọc đấu dây
base = [box('slab', (1.15, 1.75, 0.08), T(0, 0.04, -0.35), BAKELITE, bevel=0.03)]
for s, m in ((-1, RED), (1, mat('green', hexc('#2E9B57'), rough=0.4))):
    for d in (-0.045, 0.045):
        base.append(box('jaw', (0.03, 0.14, 0.2), T(s * 0.5 + d, 0.18, -0.78), COPPER, bevel=0.006))
    base.append(box('jawFoot', (0.2, 0.2, 0.03), T(s * 0.5, 0.095, -0.78), COPPER, bevel=0.006))
    base.append(lathe('mark', [(0, 0.012), (0.05, 0.012), (0.055, 0)], T(s * 0.5, 0.08, -0.98), m))
    base.append(lathe('post', [(0, 0.13), (0.04, 0.13), (0.05, 0.1), (0.05, 0.05), (0.025, 0.045), (0.025, 0.0)], T(s * 0.42, 0.08, 0.38), BRASS))
for d in (-0.05, 0.05):
    base.append(box('hinge', (0.025, 0.14, 0.18), T(d, 0.17, 0), COPPER, bevel=0.006))
base.append(cyl('pin', 0.02, 0.16, T(0, 0.2, 0), CHROME, bevel=0, rot=(0, math.radians(90), 0)))
for sx in (-1, 1):
    for z in (-1.12, 0.42):
        base.append(lathe('screw', [(0, 0.012), (0.03, 0.012), (0.04, 0)], T(sx * 0.48, 0.08, z), BRASS))
part('SwitchBase', base, (1.0, 0, 0.3))

# ---- cần gạt: lưỡi đồng + tay cầm tiện bọc cách điện, quay quanh gốc
part('SwitchLever', [
    box('blade', (0.05, 0.78, 0.1), T(0, 0, -0.39), COPPER, bevel=0.008),
    lathe('grip', [(0, 0), (0.05, 0), (0.07, 0.03), (0.078, 0.17), (0.062, 0.21), (0, 0.22)], T(0, 0, -0.76), RED, rot=(math.radians(-90), 0, 0)),
    lathe('collar', [(0.052, 0), (0.085, 0), (0.085, 0.02), (0.052, 0.02)], T(0, 0, -0.75), CHROME, rot=(math.radians(-90), 0, 0)),
], (1.0, 0.2, 0.3))

# ---- cần kéo: ray thép có chặn hai đầu, tay kéo chữ T (nhuộm màu)
rail = [box('rail', (1.5, 0.12, 0.04), T(0, 0.02, 0), STEEL, bevel=0.008), box('slot', (1.3, 0.04, 0.012), T(0, 0.042, 0), INK, bevel=0)]
for sx in (-1, 1):
    rail.append(box('stop', (0.06, 0.2, 0.12), T(sx * 0.75, 0.06, 0), IRON, bevel=0.012))
part('PullRail', rail, (2.6, 0, -0.6))
part('PullHandle', [
    box('shoe', (0.18, 0.34, 0.07), T(0, -0.085, 0), TINT, bevel=0.015),
    cyl('stem', 0.035, 0.16, T(0, 0.02, 0), CHROME),
    lathe('knob', [(0, 0.1), (0.06, 0.095), (0.095, 0.05), (0.09, 0.0), (0.05, -0.03), (0, -0.03)], T(0, 0.06, 0), TINT),
], (2.6, 0.17, -0.6))

export_glb('lab-parts.glb')
preview((0.3, 2.6, 3.6), (0.1, 0.1, -0.1), lens=50)
