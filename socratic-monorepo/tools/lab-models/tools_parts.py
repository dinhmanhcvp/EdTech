"""
Dụng cụ tháo lắp cầm tay của /lab (engines/families/HandsAssemblyTools.ts): tua vít, chìa lục giác, tuýp + cần tự động, cờ lê lực, cờ lê vòng miệng,
cảo ba chấu, kìm mở phe, cùng ốc vít, bu-lông, khay từ đựng vít và giá dụng cụ. Mỗi dụng cụ là MỘT lưới mang tên cố định.

Quy ước toạ độ (hệ three.js, +y lên): gốc của dụng cụ là ĐẦU LÀM VIỆC (mũi vít, miệng tuýp...), thân dụng cụ vươn lên +y.
Cần gạt của tuýp và chìa lục giác nằm ngang theo +x. Cờ lê vòng miệng nằm phẳng trong mặt xz, cán vươn theo +z. Cảo: gốc ở mũi trục vít cái,
các chấu thò xuống dưới gốc.
Vật liệu mang tên để cảnh đổi màu: `tint` (tay cầm cho dụng cụ cần nhấn mạnh khi đúng / sai cỡ).

Chạy:
  blender --background --python tools/lab-models/tools_parts.py -- apps/teacher-board/public/models [ảnh xem thử.png]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F401,F403

TINT = mat('tint', (0.9, 0.9, 0.9), metallic=0.1, rough=0.45)
H_RED = mat('hred', hexc('#C4261A'), rough=0.4)
H_YEL = mat('hyel', hexc('#E3B341'), rough=0.4)
H_BLU = mat('hblu', hexc('#2459C9'), rough=0.4)
H_GRN = mat('hgrn', hexc('#1F7A4D'), rough=0.4)
H_ORG = mat('horg', hexc('#D9481C'), rough=0.4)
BLACK = mat('blackoxide', hexc('#1B1D22'), metallic=0.6, rough=0.45)
XAX = (0, math.radians(90), 0)  # trục z của lưới tròn xoay → trục x của cảnh
D = math.radians


def part(name, objs, show):
    o = join(name, objs)
    o.location = T(*show)
    return o


def driver(name, handle_mat, shaft_r, shaft_len, handle_r, handle_len, tip, show):
    """tua vít: mũi ở gốc, thân thép, cổ kim loại, tay cầm có gân"""
    h0 = shaft_len
    prof = [(0, h0 - 0.02), (handle_r * 0.8, h0 - 0.02), (handle_r, h0 + 0.08), (handle_r * 1.08, h0 + handle_len * 0.5), (handle_r, h0 + handle_len * 0.9), (handle_r * 0.5, h0 + handle_len), (0, h0 + handle_len)]
    objs = [cyl('shaft', shaft_r, shaft_len, T(0, shaft_len / 2, 0), CHROME, bevel=0), lathe('grip', prof, T(0, 0, 0), handle_mat),
            cyl('ferrule', handle_r * 0.75, 0.12, T(0, h0 + 0.02, 0), STEEL, bevel=0.004)]
    for i in range(8):  # gân tay cầm
        a = 2 * math.pi * i / 8
        objs.append(cyl('rib', 0.012, handle_len * 0.55, T(handle_r * 1.07 * math.cos(a), h0 + handle_len * 0.5, handle_r * 1.07 * math.sin(a)), BLACK, bevel=0, seg=8))
    objs.append(tip)
    return part(name, objs, show)


def tip_ph(r, y0):
    """đầu vít chữ thập: hai cánh vuông góc ở mũi"""
    return [box('cross1', (r * 2.2, 0.012, 0.09), T(0, y0 + 0.045, 0), STEEL, bevel=0), box('cross2', (0.012, r * 2.2, 0.09), T(0, y0 + 0.045, 0), STEEL, bevel=0)]


# ---- tua vít: chữ thập PH2 (đỏ), PH1 (vàng, nhỏ), dẹt (xanh dương)
driver('DriverPH2', H_RED, 0.02, 0.85, 0.075, 0.62, tip_ph(0.022, 0)[0], (-3.0, 0, 3.0))
driver('DriverPH1', H_YEL, 0.014, 0.8, 0.06, 0.5, tip_ph(0.016, 0)[0], (-2.4, 0, 3.0))
driver('DriverFlat', H_BLU, 0.02, 0.85, 0.07, 0.6, box('blade', (0.07, 0.012, 0.1), T(0, 0.05, 0), STEEL, bevel=0), (-1.8, 0, 3.0))


def hexkey(name, r, short, long_, show):
    """chìa lục giác chữ L: cánh ngắn đứng (vào đầu vít), cánh dài nằm ngang theo +x làm cần"""
    pts = [T(0, 0, 0), T(0, short, 0), T(0.04, short + 0.02, 0), T(0.12, short + 0.02, 0)]
    pts2 = [T(0.12, short + 0.02, 0), T(long_, short + 0.02, 0)]
    return part(name, [tube('arm1', pts, r, STEEL, smooth=False), tube('arm2', pts2, r, STEEL, smooth=False), cyl('grip', r * 2.2, long_ * 0.35, T(long_ * 0.78, short + 0.02, 0), H_ORG, rot=XAX, bevel=0.004)], show)


hexkey('HexKey25', 0.012, 0.2, 0.9, (-1.2, 0, 3.0))
hexkey('HexKey4', 0.02, 0.26, 1.1, (-0.6, 0, 3.0))


def socket(name, sock_r, sock_h, lever, grip_mat, show, long_handle=False):
    """tuýp trên cần tự động: tuýp ở gốc, đầu cần ở trên, cần vươn ngang +x"""
    objs = [lathe('sock', [(sock_r * 0.7, 0), (sock_r, 0), (sock_r, sock_h), (sock_r * 0.8, sock_h)], T(0, 0, 0), BLACK),
            cyl('head', 0.11, 0.1, T(0, sock_h + 0.05, 0), CHROME, bevel=0.01),
            box('lever', (lever, 0.07, 0.05), T(lever / 2, sock_h + 0.05, 0), CHROME, bevel=0.01),
            cyl('grip', 0.045, lever * 0.4, T(lever * 0.78, sock_h + 0.05, 0), grip_mat, rot=XAX, bevel=0.006),
            cyl('dir', 0.025, 0.12, T(0, sock_h + 0.13, 0), STEEL, bevel=0)]
    if long_handle:
        objs.append(box('scale', (lever * 0.3, 0.075, 0.03), T(lever * 0.45, sock_h + 0.05, 0.03), H_YEL, bevel=0))
    return part(name, objs, show)


socket('Socket10', 0.055, 0.14, 1.1, H_BLU, (0.0, 0, 3.0))
socket('Socket13', 0.07, 0.16, 1.2, H_RED, (0.6, 0, 3.0))
socket('TorqueWrench', 0.07, 0.16, 1.9, H_GRN, (1.2, 0, 3.0), long_handle=True)
# tuýp bugi: tuýp dài + tay quay chữ T
part('SparkSocket', [lathe('sock', [(0.065, 0), (0.1, 0), (0.1, 0.55), (0.07, 0.6)], T(0, 0, 0), BLACK), cyl('bar', 0.03, 0.9, T(0, 0.58, 0), CHROME, rot=XAX, bevel=0), cyl('knob1', 0.05, 0.12, T(0.42, 0.58, 0), H_ORG, rot=XAX, bevel=0.005), cyl('knob2', 0.05, 0.12, T(-0.42, 0.58, 0), H_ORG, rot=XAX, bevel=0.005)], (1.8, 0, 3.0))

# ---- cờ lê vòng miệng: nằm phẳng trong mặt xz, đầu miệng ở gốc, cán dọc +z
part('Spanner', [box('jawL', (0.07, 0.34, 0.03), T(-0.12, 0, 0.12), CHROME, bevel=0.006), box('jawR', (0.07, 0.34, 0.03), T(0.12, 0, 0.12), CHROME, bevel=0.006),
                 box('neck', (0.32, 0.18, 0.03), T(0, 0, 0.3), CHROME, bevel=0.01), box('shank', (0.14, 1.3, 0.03), T(0, 0, 1.0), CHROME, bevel=0.01),
                 cyl('ring', 0.17, 0.03, T(0, 0, 1.7), CHROME, bevel=0.008)], (2.5, 0, 3.0))

# ---- cảo ba chấu: gốc ở mũi trục vít cái; yoke ở y = 0,45, chấu thò xuống tới y = −0,3, tay vặn chữ T ở trên cùng
puller = [cyl('screw', 0.04, 1.0, T(0, 0.5, 0), STEEL, bevel=0), cyl('screwhead', 0.07, 0.12, T(0, 1.02, 0), BLACK, bevel=0.01, seg=6),
          cyl('tbar', 0.03, 0.62, T(0, 1.14, 0), H_ORG, rot=XAX, bevel=0.005), cyl('yoke', 0.11, 0.1, T(0, 0.45, 0), IRON, bevel=0.01)]
for i in range(3):
    a = D(90 + 120 * i)
    cx, cz = 0.34 * math.cos(a), 0.34 * math.sin(a)
    puller.append(box('arm', (0.26, 0.07, 0.07), T(cx / 2, 0.45, cz / 2), IRON, bevel=0.01, rot=(0, 0, -a)))
    puller.append(box('jaw', (0.06, 0.06, 0.8), T(cx, 0.08, cz), IRON, bevel=0.01))
    puller.append(box('hook', (0.14, 0.05, 0.06), T(cx * 0.8, -0.3, cz * 0.8), IRON, bevel=0.006, rot=(0, 0, -a)))
part('Puller', puller, (-3.0, 0, 4.4))

# ---- kìm mở phe: mũi kìm ở gốc, hai cán tách ra phía trên, bọc nhựa
def handle(sign):
    pts = [T(sign * 0.01, 0, 0), T(sign * 0.03, 0.3, 0), T(sign * 0.10, 0.9, 0), T(sign * 0.2, 1.3, 0)]
    return tube('h', pts, 0.022, STEEL, smooth=False)


pl = [handle(1), handle(-1), cyl('pivot', 0.04, 0.06, T(0, 0.32, 0), CHROME, rot=(math.radians(90), 0, 0), bevel=0.004)]
for s in (-1, 1):
    pl.append(tube('grip', [T(s * 0.12, 0.9, 0), T(s * 0.2, 1.3, 0)], 0.04, H_YEL, smooth=False))
    pl.append(cyl('tip', 0.012, 0.12, T(s * 0.012, 0.05, 0), BLACK, bevel=0, seg=8))
part('Pliers', pl, (-2.2, 0, 4.4))

# ---- ốc vít chữ thập và bu-lông lục giác (gốc ở mặt tiếp xúc; thân ngắn thò xuống dưới)
part('ScrewPh', [cyl('head', 0.055, 0.04, T(0, 0.02, 0), STEEL, r2=0.05, bevel=0.005), box('slot1', (0.07, 0.012, 0.012), T(0, 0.042, 0), BLACK, bevel=0), box('slot2', (0.012, 0.07, 0.012), T(0, 0.042, 0), BLACK, bevel=0), cyl('shank', 0.022, 0.14, T(0, -0.07, 0), STEEL, bevel=0)], (-1.4, 0, 4.4))
part('BoltHex', [cyl('head', 0.07, 0.06, T(0, 0.03, 0), STEEL, bevel=0.005, seg=6), cyl('shank', 0.03, 0.16, T(0, -0.08, 0), STEEL, bevel=0)], (-0.9, 0, 4.4))
# ---- khay từ đựng vít (gốc ở mặt bàn, tâm khay) và giá dụng cụ bằng gỗ (7,4 × 1,5)
part('MagDish', [lathe('bowl', [(0, 0), (0.42, 0), (0.52, 0.05), (0.56, 0.16), (0.5, 0.16), (0.43, 0.08), (0, 0.08)], T(0, 0, 0), STEEL), cyl('magnet', 0.2, 0.03, T(0, 0.08, 0), H_RED, bevel=0.004)], (-0.2, 0, 4.4))
rack = [box('plank', (7.4, 1.5, 0.08), T(0, 0.04, 0), WOOD, bevel=0.02), box('lip', (7.4, 0.08, 0.12), T(0, 0.1, 0.72), WOOD, bevel=0.015)]
for i in range(9):
    rack.append(box('cleat', (0.05, 0.05, 0.05), T(-3.3 + i * 0.82, 0.1, -0.7), IRON, bevel=0.005))
part('ToolRack', rack, (1.6, 0, 4.4))

export_glb('tools-parts.glb')
preview((0.2, 7.2, 10.0), (0, 0.4, 3.6), lens=30)
