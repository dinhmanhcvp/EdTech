"""
Mẫu mổ và quan sát của môn Sinh cho phòng thực hành /lab (`HandsDissect3D.tsx`): khay mổ có lớp sáp, khay dụng cụ, năm dụng cụ
(dao mổ, kéo, kẹp, kim ghim, ống nhỏ giọt) và năm mẫu: ếch (FROG), tim lợn (PIG), cá (FISH), hoa (FLOWER), mô hình bán thân người (HUMAN).

Hợp đồng tên (cảnh đọc theo tên, `dissect.ts` khai báo bài):
  `<MẪU>_body*`        phần đứng yên của mẫu
  `<MẪU>_o_<cơ quan>`  một cơ quan / bộ phận chỉ vào được (gốc ở tâm hộp bao, để tim co bóp quanh tâm)
  `<MẪU>_f_<vạt>`      lớp mở được (vạt da, nắp mang, nửa tim, lồng ngực, cánh hoa...): gốc đặt tại bản lề; trục và góc mở ghi trong `dissect.ts`
  `TRAY`, `TOOLTRAY`, `TOOL_<dụng cụ>` (mũi dụng cụ ở gốc, thân nằm dọc +x).
Toạ độ three.js (x phải, y lên, z về phía người xem); mặt sáp của khay ở y = 0. Mọi mẫu đặt quanh gốc, xuất chồng lên nhau trong một GLB;
cảnh chỉ lấy các nút của mẫu đang làm.

Chạy:
  blender --background --python tools/lab-models/dissect_parts.py -- apps/teacher-board/public/models [ảnh xem thử.png FROG|PIG|FISH|FLOWER|HUMAN]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F401,F403
from organic import *  # noqa: E402,F401,F403

SHOW = argv[2] if len(argv) > 2 else 'FROG'
ALLOBJ = {}


def tag(prefix, *objs):
    ALLOBJ.setdefault(prefix, []).extend(objs)


# ================================================================== khay mổ + khay dụng cụ + dụng cụ
WAX = mat('wax', hexc('#1E2128'), rough=0.85)
TRAYM = mat('trayalu', (0.62, 0.64, 0.67), metallic=0.85, rough=0.38)
tray = [
    box('t0', (5.4, 4.2, 0.2), T(0, -0.1, 0), TRAYM, bevel=0.03),
    box('t1', (5.2, 4.0, 0.03), T(0, -0.012, 0), WAX, bevel=0),
]
for sx in (-1, 1):
    tray.append(box('tr', (0.1, 4.2, 0.16), T(sx * 2.65, 0.0, 0), TRAYM, bevel=0.02))
    tray.append(box('tr', (5.4, 0.1, 0.16), T(0, 0.0, sx * 2.05), TRAYM, bevel=0.02))
piece('TRAY', tray, (0, 0, 0))
# khay dụng cụ: khay inox lót khăn mổ xanh sẫm, dụng cụ thép nổi rõ trên nền vải
CLOTH = mat('cloth', hexc('#1E5A55'), rough=0.95)
tt = [box('d0', (1.5, 4.0, 0.06), T(3.62, -0.03, 0), TRAYM, bevel=0.02), box('cl', (1.38, 3.88, 0.012), T(3.62, 0.004, 0), CLOTH, bevel=0.004)]
for sx in (-1, 1):
    tt.append(box('dr', (0.06, 4.0, 0.1), T(3.62 + sx * 0.74, 0.0, 0), TRAYM, bevel=0.015))
    tt.append(box('dr', (1.5, 0.06, 0.1), T(3.62, 0.0, sx * 1.97), TRAYM, bevel=0.015))
for z in (-1.125, -0.375, 0.375, 1.125):
    tt.append(box('seam', (1.3, 0.012, 0.004), T(3.62, 0.012, z), mat('seam', hexc('#2C7A72'), rough=0.9), bevel=0))
piece('TOOLTRAY', tt, (0, 0, 0))

STEELT = mat('steelt', (0.62, 0.64, 0.68), metallic=1, rough=0.26)
EDGE = mat('edge', (0.9, 0.92, 0.95), metallic=1, rough=0.08)
DARKG = mat('darkgrip', hexc('#2B2F3A'), metallic=0.3, rough=0.5)
PINHEAD = mat('pinhead', hexc('#E0451A'), rough=0.3)
BULB = mat('bulb', hexc('#B3262A'), rough=0.5)
DGLASS = mat('glass', (0.85, 0.94, 1.0), rough=0.05, alpha=0.25)


def blade_poly(name, pts, material, thick=0.012):
    return polyfin(name, pts, material, thick)


# dao mổ: lưỡi cong số 22 có viền sắc sáng, cán số 4 dẹt có rãnh bám và vạch chia
sc = [blade_poly('b', [(0, 0.012, 0), (0.1, 0.012, -0.045), (0.36, 0.012, -0.06), (0.44, 0.012, -0.025), (0.44, 0.012, 0.025), (0.12, 0.012, 0.025)], STEELT, 0.014),
      tube('edge', [T(0.005, 0.014, 0), T(0.1, 0.014, -0.047), T(0.36, 0.014, -0.062)], 0.006, EDGE)]
sc.append(box('h', (0.85, 0.11, 0.045), T(0.88, 0.016, 0), STEELT, bevel=0.016))
for i in range(9):
    sc.append(box('g', (0.022, 0.115, 0.05), T(0.78 + i * 0.05, 0.018, 0), DARKG, bevel=0.004))
piece('TOOL_scalpel', sc, (0, 0, 0))
# kéo mổ: hai lưỡi cong khép lệch nhau, ốc chốt, hai khuyên ngón dày
ks = [blade_poly('k1', [(0, 0.012, -0.006), (0.3, 0.012, -0.045), (0.58, 0.012, -0.07), (0.58, 0.012, 0.0), (0.03, 0.012, 0.006)], STEELT, 0.016),
      blade_poly('k2', [(0.03, 0.03, -0.006), (0.58, 0.03, 0.0), (0.58, 0.03, 0.07), (0.3, 0.03, 0.045), (0, 0.03, 0.006)], STEELT, 0.016),
      cyl('pv', 0.045, 0.06, T(0.58, 0.022, 0), DARKG), cyl('pv2', 0.022, 0.065, T(0.58, 0.024, 0), EDGE)]
for sz in (-1, 1):
    ks.append(tube('sh', [T(0.58, 0.022, sz * 0.04), T(0.8, 0.022, sz * 0.1), T(0.98, 0.022, sz * 0.15)], 0.024, STEELT))
    bpy.ops.mesh.primitive_torus_add(major_radius=0.1, minor_radius=0.026, location=T(1.08, 0.022, sz * 0.16))
    ks.append(finish(bpy.context.object, STEELT))
piece('TOOL_scissors', ks, (0, 0, 0))
# kẹp phẫu tích: hai càng thép dẹt có rãnh bám, mũi có răng, nối ở đuôi
fs = []
for sz in (-1, 1):
    fs.append(tube('arm', [T(0.0, 0.02, sz * 0.01), T(0.35, 0.02, sz * 0.05), T(0.9, 0.02, sz * 0.085), T(1.14, 0.02, sz * 0.025)], 0.022, STEELT, smooth=True))
    for i in range(9):
        fs.append(box('gr', (0.014, 0.034, 0.03), T(0.48 + i * 0.05, 0.042, sz * 0.068), DARKG, bevel=0.003))
    for i in range(3):
        fs.append(box('tooth', (0.012, 0.02, 0.012), T(0.02 + i * 0.025, 0.02, sz * 0.002), EDGE, bevel=0.002))
fs.append(ball('end', 0.045, T(1.16, 0.02, 0), STEELT))
piece('TOOL_forceps', fs, (0, 0, 0))
# kim ghim: thân kim thép + đầu nhựa tròn to
piece('TOOL_pin', [cyl('n', 0.012, 0.5, T(0.25, 0.0, 0), EDGE, rot=(0, math.radians(90), 0), seg=12),
                   ball('hd', 0.065, T(0.54, 0.0, 0), PINHEAD)], (0, 0, 0))
# ống nhỏ giọt: ống thủy tinh thon có vạch chia + bóp cao su đỏ
piece('TOOL_dropper', [lathe('tube', [(0.004, -0.02), (0.02, 0.0), (0.05, 0.14), (0.055, 0.56), (0.0, 0.56)], T(0, 0.05, 0), DGLASS, rot=(0, math.radians(90), 0)),
                       cyl('liq', 0.04, 0.3, T(0.3, 0.05, 0), mat('drug', hexc('#F3E3A0'), rough=0.1, alpha=0.6), rot=(0, math.radians(90), 0)),
                       ell('bulb', (0.72, 0.05, 0), (0.2, 0.08, 0.08), BULB)] +
      [box('tick', (0.004, 0.06, 0.003), T(0.2 + i * 0.06, 0.106, 0), INK, bevel=0) for i in range(5)], (0, 0, 0))


# ================================================================== 1. ẾCH (nằm ngửa, đầu về −x), ghim 4 chân, mở bụng
SKINF = tissue('frogskin', '#FFFFFF', rough=0.42, coat=0.3, vcol=True)
CAV = tissue('cavity', '#8E3E3E', rough=0.55, coat=0.3)
MUSC = tissue('muscle', '#FFFFFF', rough=0.55, coat=0.2, vcol=True)


def muscle_fn(p, n):
    # thớ cơ: sọc mảnh dọc thân + loang nhẹ
    s = 0.5 + 0.5 * math.sin(p[0] * 70 + fbm(p, 6) * 4)
    return tint('#A9443E', 0.85 + 0.25 * s + 0.1 * fbm(p, 14))


fe = [('E', (0.15, 0.22, 0), (0.8, 0.22, 0.44)), ('E', (0.82, 0.19, 0), (0.33, 0.17, 0.33)), ('E', (-0.45, 0.2, 0), (0.45, 0.19, 0.42)),
      ('E', (-0.98, 0.15, 0), (0.34, 0.13, 0.4)), ('E', (-1.28, 0.11, 0), (0.17, 0.08, 0.2)), ('E', (-1.43, 0.09, 0), (0.08, 0.05, 0.1))]
web = []
for s in (-1, 1):
    fe += [('C', (-0.48, 0.14, s * 0.40), (-0.55, 0.09, s * 0.78), 0.08), ('C', (-0.55, 0.09, s * 0.78), (-0.88, 0.06, s * 0.98), 0.065),
           ('C', (0.85, 0.16, s * 0.36), (1.2, 0.12, s * 0.92), 0.15), ('C', (1.2, 0.12, s * 0.92), (1.72, 0.08, s * 0.66), 0.1),
           ('C', (1.72, 0.07, s * 0.66), (2.0, 0.05, s * 0.88), 0.055)]
    # bàn tay 4 ngón xòe, đầu ngón tròn
    for a in (-0.9, -0.35, 0.2, 0.75):
        d = (math.cos(math.pi + a * s * 0.6), math.sin(math.pi + a * s * 0.6))
        tip = (-0.92 + d[0] * 0.2, 0.035, s * 1.0 + s * abs(d[1]) * 0.25 + d[1] * 0.05)
        fe += [('C', (-0.92, 0.045, s * 1.0), tip, 0.022), ('E', tip, (0.03, 0.02, 0.03))]
    # bàn chân 5 ngón dài, có màng bơi giữa các ngón
    tips = []
    for i, (a, L) in enumerate(((-0.55, 0.26), (-0.2, 0.36), (0.15, 0.45), (0.5, 0.38), (0.85, 0.28))):
        ang = 0.35 + a
        tip = (2.0 + math.cos(ang) * L, 0.03, s * (0.88 + math.sin(ang) * L))
        tips.append(tip)
        fe += [('C', (2.0, 0.04, s * 0.88), tip, 0.02), ('E', tip, (0.028, 0.018, 0.028))]
    for t0, t1 in zip(tips, tips[1:]):
        m0 = (2.0 + (t0[0] - 2.0) * 0.75, 0.032, s * 0.88 + (t0[2] - s * 0.88) * 0.75)
        m1 = (2.0 + (t1[0] - 2.0) * 0.75, 0.032, s * 0.88 + (t1[2] - s * 0.88) * 0.75)
        web.append(polyfin('web', [(2.0, 0.035, s * 0.88), m0, m1], SKINF, thick=0.008))
frog = blob('FROG_body', fe, SKINF, res=0.022)
roughen(frog, 0.008, 0.08)
boolean(frog, half(y=0.0, above=False), 'DIFFERENCE')
cap = dup(frog, 'cap')
KF = ((0.05, 0.36, 0), (0.72, 0.26, 0.34))
boolean(frog, ell('k', *KF, None), 'DIFFERENCE', CAV)
boolean(cap, ell('k', *KF, None), 'INTERSECT', MUSC)
boolean(cap, half(y=0.30), 'INTERSECT', MUSC)
capR = dup(cap, 'capR')
boolean(cap, half(z=0.0, above=False), 'INTERSECT', MUSC)
boolean(capR, half(z=0.0), 'INTERSECT', MUSC)


def frog_skin(p, n):
    """bụng màu kem lấm tấm xám ở họng; sườn và chân xanh rêu–nâu có đốm sẫm, đùi có vằn ngang"""
    belly = blend('#E9E2BC', '#D8CE95', 0.5 + 0.5 * fbm(p, 4))
    d0, _ = cells(p, 34)
    if p[0] < -0.6 and d0 < 0.09:
        belly = blend(belly, '#8C8A78', 0.5)
    if p[0] < -0.75 and n.z > 0.5 and abs(math.hypot((p[0] + 0.9) / 0.6, p[2] / 0.42) - 1.0) < 0.03:
        belly = blend(belly, '#7A7A5A', 0.5)  # viền hàm dưới
    limb = abs(p[2]) > 0.5 or p[0] > 1.05 or p[0] < -1.42
    t = max(0.0, min(1.0, (abs(p[2]) - 0.4) / 0.14 + (0.42 - n.z) * 2.2 + (1.0 if limb else 0.0)))
    back = blend('#5F7A30', '#6B5A2C', 0.5 + 0.5 * fbm(p, 3))
    ds, _ = cells(p, 7)
    if ds < 0.22:
        back = blend(back, '#25301A', 1 - ds / 0.22)
    if limb and p[0] > 1.0 and math.sin(p[0] * 16 + p[2] * 4) > 0.55:
        back = blend(back, '#2A3318', 0.7)
    return blend(belly, back, t)


for o in (frog, cap, capR):
    paintm(o, {SKINF: frog_skin, MUSC: muscle_fn})
for w in web:
    paint(w, lambda p, n: blend('#7C8A4A', '#B9B98A', 0.5 + 0.5 * fbm(p, 9)))
origin(frog, (0, 0, 0))
piece('FROG_body_web', web, (0, 0, 0))
piece('FROG_f_left', [cap], (0.05, 0.30, -0.33))
piece('FROG_f_right', [capR], (0.05, 0.30, 0.33))
# thể mỡ: chùm ngón vàng ở cuối khoang bụng (không chỉ tên, chỉ để giống thật)
fat = []
for s in (-1, 1):
    for i in range(5):
        fat.append(('C', (0.5, 0.17, s * 0.2), (0.68 + 0.03 * math.sin(i * 2.1), 0.18 + 0.01 * i, s * (0.12 + 0.045 * i)), 0.022))
piece('FROG_body_fat', [colored(blob('fat', fat, SKINF), mottled('#E8C64A', 0.15, 18), rough=0.3, coat=0.5)])


def frog_heart(p, n):
    if p[0] < -0.62 and abs(p[2]) < 0.06:
        return tint('#D7A39E', 1 + 0.08 * fbm(p, 20))  # thân động mạch
    if p[0] < -0.53:
        return tint('#5E1220', 1 + 0.15 * fbm(p, 14))  # tâm nhĩ sẫm
    return tint('#A7222E', 1 + 0.14 * fbm(p, 12))


piece('FROG_o_heart', [colored(blob('h', [('E', (-0.45, 0.19, 0.0), (0.11, 0.075, 0.1)), ('E', (-0.36, 0.18, 0.02), (0.06, 0.05, 0.06)),
                                          ('E', (-0.58, 0.2, -0.07), (0.07, 0.06, 0.07)), ('E', (-0.58, 0.2, 0.08), (0.07, 0.06, 0.07)),
                                          ('C', (-0.52, 0.23, 0), (-0.66, 0.25, 0), 0.025), ('C', (-0.66, 0.25, 0), (-0.72, 0.25, -0.12), 0.018), ('C', (-0.66, 0.25, 0), (-0.72, 0.25, 0.12), 0.018)], CAV, res=0.012),
                               frog_heart, rough=0.3, coat=0.7)])


def spongy(hx, edge, s=40):
    def fn(p, n):
        d0, d1 = cells(p, s)
        return blend(tint(hx, 1 + 0.1 * fbm(p, 8)), edge, max(0.0, 1 - (d1 - d0) / 0.12) * 0.7)
    return fn


piece('FROG_o_lung', [colored(roughen(blob('l', [('E', (-0.42, 0.19, s * 0.2), (0.18, 0.05, 0.08))], CAV, res=0.015), 0.006, 0.05), spongy('#E8A2AC', '#B85C6C')) for s in (-1, 1)])


def gallbladder(base):
    def fn(p, n):
        if math.dist((p[0], p[2]), (-0.1, 0.04)) < 0.05:
            return tint('#3F7B3A', 1 + 0.1 * fbm(p, 20))
        return base(p, n)
    return fn


piece('FROG_o_liver', [colored(roughen(blob('lv', [('E', (-0.2, 0.22, -0.14), (0.2, 0.055, 0.15)), ('E', (-0.2, 0.22, 0.16), (0.22, 0.055, 0.16)), ('E', (-0.3, 0.21, 0), (0.11, 0.05, 0.09)),
                                                  ('E', (-0.1, 0.19, 0.04), (0.04, 0.035, 0.04))], CAV, res=0.015), 0.006, 0.1),
                               gallbladder(mottled('#6A271F', 0.12, 7)), rough=0.25, coat=0.8)])
piece('FROG_o_stomach', [colored(blob('st', [('C', (-0.1, 0.2, -0.25), (0.25, 0.2, -0.2), 0.06), ('E', (0.3, 0.2, -0.13), (0.08, 0.05, 0.07))], CAV, res=0.015),
                                 veined('#E1C1B2', '#A8404C', 6, 0.05), rough=0.35, coat=0.6)])
gut = tube('in', snake(0.28, 0.66, (-0.15, -0.05, 0.05, 0.15, 0.24), 0.2, 0.02), 0.035, CAV)
piece('FROG_o_intestine', [gut])
colored(bpy.data.objects['FROG_o_intestine'], veined('#E5B5A0', '#B04450', 9, 0.04), rough=0.35, coat=0.6)
tag('FROG', *[o for o in bpy.data.objects if o.name.startswith('FROG_')])


# ================================================================== 2. TIM LỢN (mặt trước hướng lên, đáy tim về −x, mỏm về +x)
Z0 = 0.4
MYO = tissue('myocard', '#FFFFFF', rough=0.32, coat=0.55, vcol=True)
CHAM = tissue('chamber', '#5E1A20', rough=0.5)
SECT = tissue('section', '#FFFFFF', rough=0.5, coat=0.2, vcol=True)
outer = blob('PIG_body', [('E', (-0.15, 0.5, Z0), (0.85, 0.48, 0.72)), ('E', (0.55, 0.42, Z0 - 0.05), (0.6, 0.38, 0.5)), ('E', (1.12, 0.3, Z0 - 0.1), (0.32, 0.2, 0.22)),
                          ('E', (-0.95, 0.52, Z0 + 0.42), (0.38, 0.38, 0.36)), ('E', (-1.0, 0.5, Z0 - 0.38), (0.35, 0.34, 0.34)),
                          # tiểu nhĩ: hai vạt dẹt mép lượn sóng úp lên đáy tim
                          ('E', (-0.62, 0.86, Z0 + 0.72), (0.3, 0.07, 0.17)), ('E', (-0.7, 0.82, Z0 - 0.3), (0.26, 0.07, 0.15))], MYO, res=0.022)
roughen(outer, 0.014, 0.12)
boolean(outer, half(y=0.02, above=False), 'DIFFERENCE')
CAVS = {'ra': ((-0.95, 0.52, Z0 + 0.45), (0.28, 0.28, 0.25)), 'la': ((-1.0, 0.5, Z0 - 0.4), (0.25, 0.25, 0.24)),
        'rv': ((-0.2, 0.52, Z0 + 0.38), (0.68, 0.26, 0.24)), 'lv': ((0.0, 0.52, Z0 - 0.2), (0.85, 0.24, 0.2))}
SECY = 0.52
LADZ = lambda x: Z0 + 0.12 - x * 0.05  # noqa: E731  rãnh liên thất trước
COR = [(x / 10, LADZ(x / 10)) for x in range(-8, 12)]
cor_pts = [T(x, surf(outer, x, z, 0.03), z) for x, z in COR]
vein_pts = [T(x, surf(outer, x, z + 0.07, 0.025), z + 0.07) for x, z in COR[:14]]
diag = [[T(x0 + t * 0.35, surf(outer, x0 + t * 0.35, LADZ(x0) - t * sg * 0.32, 0.02), LADZ(x0) - t * sg * 0.32) for t in (0, 0.5, 1.0)] for x0, sg in ((-0.3, 1), (0.15, 1), (0.5, 1), (-0.1, -1), (0.35, -1))]
circ = [T(-0.62, surf(outer, -0.62, z, 0.03), z) for z in [Z0 - 0.6 + i * 0.1 for i in range(14)]]


def heart_skin(p, n):
    """cơ tim đỏ sẫm loang; mỡ vàng dọc rãnh vành và rãnh liên thất"""
    c = tint('#74202A', 1 + 0.16 * fbm(p, 6))
    w = 0.06 + 0.03 * fbm(p, 5)
    groove = max(1 - abs(p[0] + 0.62 + 0.05 * math.sin(p[2] * 5)) / w, 1 - abs(p[2] - LADZ(p[0])) / (w + 0.02) if p[1] > 0.7 else 0.0)
    if groove > 0:
        c = blend(c, tint('#E6D49C', 1 + 0.12 * fbm(p, 18)), min(1.0, groove * 1.4) * (0.6 + 0.4 * fbm(p, 9)))
    return c


def section_fn(p, n):
    return tint('#9A3640', 0.9 + 0.15 * math.sin(p[0] * 60 + fbm(p, 5) * 5) + 0.08 * fbm(p, 20))


flapP = dup(outer, 'flapP')
for c, s in CAVS.values():
    boolean(outer, ell('k', c, s, None), 'DIFFERENCE', CHAM)
    boolean(flapP, ell('k', c, s, None), 'DIFFERENCE', CHAM)
boolean(outer, half(y=SECY), 'DIFFERENCE', SECT)
boolean(flapP, half(y=SECY), 'INTERSECT', SECT)
for o in (outer, flapP):
    paintm(o, {MYO: heart_skin, SECT: section_fn})
origin(outer, (0, 0, 0))
piece('PIG_f_front', [flapP], (0.0, SECY, Z0 - 0.78))
import random  # noqa: E402

rng = random.Random(4)
for k, (c, s) in CAVS.items():
    parts = [ell('PIG_o_' + k, c, (s[0] * 0.97, s[1] * 0.97, s[2] * 0.97), CHAM)]
    if k in ('rv', 'lv'):
        # bè cơ (trabeculae): các gờ cơ nổi trên đáy tâm thất
        for _ in range(16):
            a = rng.uniform(0, 2 * math.pi)
            u = rng.uniform(-0.8, 0.8)
            q = (c[0] + s[0] * 0.9 * u, c[1] - s[1] * 0.85 * math.sqrt(max(0.0, 1 - u * u)) * abs(math.sin(a)) - 0.01, c[2] + s[2] * 0.85 * math.cos(a) * math.sqrt(max(0.0, 1 - u * u)))
            parts.append(blob('tb', [('C', q, (q[0] + rng.uniform(-0.18, 0.18), q[1] + 0.01, q[2] + rng.uniform(-0.05, 0.05)), 0.022)], CHAM, res=0.012))
    o = join('PIG_o_' + k, parts)
    boolean(o, half(y=SECY - 0.012), 'DIFFERENCE')
    piece('PIG_o_' + k, [colored(o, mottled('#5C161E', 0.2, 10), rough=0.4, coat=0.6)])
piece('PIG_o_septum', [colored(ell('sp', (-0.05, SECY + 0.004, Z0 + 0.07), (0.62, 0.006, 0.055), CHAM), lambda p, n: tint('#B04E56', 1 + 0.12 * fbm(p, 14)))])
VALVE = tissue('valve', '#EADCC2', rough=0.5, coat=0.4)
PAP = tissue('pap', '#7A2228', rough=0.45, coat=0.5)


def cusp(c, ang, w=0.075, h=0.1):
    """lá van: phiến mỏng khum treo từ vòng van xuống tâm thất"""
    return leaf('cusp', c, ang, h, w, -1.2, 0.03, VALVE, nu=8, nv=6)


tri = [cusp((-0.76, 0.46, Z0 + 0.42 + dz), math.pi / 2 * 0 + 0.0) for dz in (-0.1, 0.0, 0.1)]
mit = [cusp((-0.84, 0.46, Z0 - 0.3 + dz), 0.0, 0.09) for dz in (-0.06, 0.06)]
for vs, x1, zc in ((tri, -0.35, Z0 + 0.42), (mit, -0.4, Z0 - 0.3)):
    for i, dz in enumerate((-0.1, -0.05, 0.0, 0.05, 0.1)):
        vs.append(tube('ch', [T(-0.68, 0.37, zc + dz), T(-0.52, 0.34, zc + dz * 0.6), T(x1, 0.33, zc + dz * 0.25)], 0.006, VALVE))
    vs.append(blob('pap', [('C', (x1 + 0.12, 0.3, zc), (x1 - 0.02, 0.33, zc), 0.045)], PAP, res=0.012))
    vs.append(ell('ring', (-0.74 if vs is tri else -0.82, 0.47, zc), (0.03, 0.02, 0.17), VALVE, seg=24))
piece('PIG_o_tricuspid', tri)
piece('PIG_o_mitral', mit)
VES = tissue('vessel', '#FFFFFF', rough=0.45, coat=0.4, vcol=True)
LUMEN = tissue('lumen', '#3A0E14', rough=0.6)


def vessel(name, pts, r, hx, branches=()):
    objs = [tube(name, [T(*q) for q in pts], r, VES)]
    for b, rb in branches:
        objs.append(tube(name + 'b', [T(*q) for q in b], rb, VES))
    # lòng mạch: đĩa sẫm ở đầu tự do (mạch rỗng như mẫu thật)
    end, prev = Vector(pts[-1]), Vector(pts[-2])
    d = (end - prev).normalized()
    disc = ell(name + 'L', tuple(end + d * 0.005), (r * 0.72, r * 0.72, r * 0.72), LUMEN, seg=20)
    objs.append(disc)
    o = join(name, objs)
    paintm(o, {VES: lambda p, n: tint(hx, 1 + 0.1 * fbm(p, 12))})
    return o


piece('PIG_o_aorta', [vessel('ao', [(-0.95, 0.62, Z0), (-1.4, 0.95, Z0 + 0.1), (-1.85, 0.98, Z0 + 0.4), (-2.05, 0.6, Z0 + 0.65), (-2.1, 0.25, Z0 + 0.7)], 0.13, '#E4CFBA',
                             [([(-1.6 - 0.12 * i, 1.0, Z0 + 0.15 + 0.1 * i), (-1.7 - 0.12 * i, 1.28, Z0 + 0.1 + 0.1 * i)], 0.04) for i in range(2)])])
piece('PIG_o_pa', [vessel('pa', [(-0.85, 0.78, Z0 + 0.55), (-1.3, 1.05, Z0 + 0.72), (-1.55, 1.05, Z0 + 0.95)], 0.11, '#DCC6B6',
                          [([(-1.5, 1.05, Z0 + 0.92), (-1.85, 0.95, Z0 + 1.2)], 0.075), ([(-1.5, 1.05, Z0 + 0.92), (-1.75, 1.1, Z0 + 0.7)], 0.07)])])
piece('PIG_o_vc', [vessel('vc', [(-1.15, 0.6, Z0 + 0.75), (-1.5, 0.58, Z0 + 1.0), (-1.9, 0.5, Z0 + 1.2)], 0.1, '#A493B4'),
                   vessel('ivc', [(-0.95, 0.35, Z0 + 0.8), (-1.0, 0.3, Z0 + 1.0), (-1.05, 0.25, Z0 + 1.2)], 0.09, '#A493B4')])
# tĩnh mạch phổi đổ vào tâm nhĩ trái (phía sau, chỉ để giống thật)
piece('PIG_body_pv', [vessel('pv%d' % i, [(-1.2, 0.45, Z0 - 0.45 + 0.18 * i), (-1.55, 0.35 + 0.05 * i, Z0 - 0.6 + 0.2 * i)], 0.05, '#C9A9A8') for i in range(3)], (0, 0, 0))
CORM = tissue('cor', '#6A1A22', rough=0.35, coat=0.6)
piece('PIG_o_coronary', [tube('cor', cor_pts, 0.026, CORM), tube('cv', vein_pts, 0.022, tissue('cvein', '#4A3A60', rough=0.4, coat=0.5)), tube('circ', circ, 0.022, CORM)] +
      [tube('dg', d, 0.014, CORM) for d in diag])
tag('PIG', *[o for o in bpy.data.objects if o.name.startswith('PIG_')])


# ================================================================== 3. CÁ CHÉP (nằm nghiêng, sườn phải hướng lên, đầu về −x, lưng về −z)
FISHM = tissue('fishskin', '#FFFFFF', rough=0.3, coat=0.4, vcol=True)
FINM = tissue('fin', '#FFFFFF', rough=0.45, coat=0.3, vcol=True)
fish = blob('FISH_body', [('E', (-0.2, 0.27, 0), (1.05, 0.27, 0.42)), ('E', (0.75, 0.24, 0), (0.6, 0.2, 0.3)), ('E', (1.35, 0.18, 0), (0.38, 0.1, 0.13)),
                          ('E', (-1.05, 0.26, 0.02), (0.45, 0.25, 0.38)), ('E', (-1.42, 0.21, 0.04), (0.16, 0.13, 0.17)), ('E', (-1.52, 0.18, 0.07), (0.07, 0.07, 0.07))], FISHM, res=0.014)
roughen(fish, 0.004, 0.06)
boolean(fish, half(y=0.02, above=False), 'DIFFERENCE')
gillcap = dup(fish, 'gill')
wall = dup(fish, 'wall')
KG = ((-0.82, 0.40, 0.02), (0.22, 0.24, 0.3))
KB = ((0.25, 0.42, 0.06), (0.72, 0.3, 0.3))
boolean(fish, ell('k', *KG, None), 'DIFFERENCE', CAV)
boolean(fish, ell('k', *KB, None), 'DIFFERENCE', CAV)
boolean(gillcap, ell('k', *KG, None), 'INTERSECT', MUSC)
boolean(gillcap, half(y=0.34), 'INTERSECT', MUSC)
boolean(wall, ell('k', *KB, None), 'INTERSECT', MUSC)
boolean(wall, half(y=0.30), 'INTERSECT', MUSC)
LAT = lambda x: 0.02 + 0.04 * math.sin((x + 0.6) * 1.6)  # noqa: E731  đường bên


def fish_skin(p, n):
    """lưng xanh rêu đồng, sườn vàng bạc, bụng trắng; vảy so le viền sẫm, mỗi vảy sáng tối khác nhau; đường bên chấm sẫm; đầu không vảy"""
    t = (p[2] + 0.32) / 0.62
    c = blend('#33401F', '#C29A3E', min(1.0, t * 1.6)) if t < 0.62 else blend('#C29A3E', '#E6DCBC', (t - 0.62) / 0.38)
    head = max(0.0, min(1.0, (-0.55 - p[0]) / 0.12))
    if p[0] < -1.5:
        return tint('#6B5A3A', 1)
    # vảy hình cung xếp chồng như ngói (mép cung lồi về phía đuôi), mỗi vảy sáng tối khác nhau, giữa vảy ánh bạc
    u, v = p[0] * 8, p[2] * 8 + (math.floor(p[0] * 8) % 2) * 0.5
    fu, fv = u - math.floor(u), v - math.floor(v)
    r = math.hypot(fu - 0.05, (fv - 0.5) * 1.15)
    lum = 1 + 0.08 * noise.noise(Vector((math.floor(u), math.floor(v), 0.5)) * 3.1)
    k = 0.8 + 0.2 * min(1.0, abs(r - 0.78) / 0.09) if abs(r - 0.78) < 0.09 else (1.03 - 0.12 * r)
    c = tuple(x * lum * k for x in c)
    c = blend(c, tint('#A8893F', 1 + 0.12 * fbm(p, 9)), head)
    if abs(p[2] - LAT(p[0])) < 0.014 and fu < 0.5:
        c = blend(c, '#2B2A20', 0.8)
    return c


def fin_fn(p, n):
    # tia vây: sọc mảnh tỏa ra, nền nâu cam trong mờ
    a = math.atan2(p[2], p[0] - 0.1)
    return blend('#9C6A3E', '#D9B48A', 0.5 + 0.5 * math.sin(a * 60)) if True else None


for o in (fish, gillcap, wall):
    paintm(o, {FISHM: fish_skin, MUSC: muscle_fn})
ey = surf(fish, -1.2, -0.08)
EYE = tissue('eyegold', '#C9A13A', rough=0.2, coat=1.0)
eye = [ell('eye', (-1.2, ey - 0.02, -0.08), (0.1, 0.06, 0.1), EYE, seg=32), ell('pupil', (-1.2, ey + 0.03, -0.08), (0.055, 0.03, 0.055), tissue('pupil', '#050506', rough=0.05, coat=1.0), seg=24),
       blob('lip', [('C', (-1.56, 0.19, 0.02), (-1.5, 0.2, 0.14), 0.025)], tissue('lip', '#5A3E2E', rough=0.5), res=0.012),
       ell('nost', (-1.4, surf(fish, -1.4, -0.04) - 0.005, -0.04), (0.02, 0.01, 0.015), tissue('nost', '#1A1410'), seg=12)]
# râu cá chép
eye += [tube('barb', [T(-1.5, 0.2, 0.12), T(-1.6, 0.2, 0.2), T(-1.66, 0.2, 0.26)], 0.008, tissue('barbel', '#8A6A48'))]
fins = [polyfin('cf', [(1.62, 0.2, 0.0), (2.08, 0.2, -0.46), (2.0, 0.2, -0.2), (1.9, 0.2, 0.0), (2.0, 0.2, 0.2), (2.08, 0.2, 0.46)], FINM, 0.012),
        polyfin('df', [(-0.25, 0.3, -0.38), (-0.12, 0.3, -0.66), (0.4, 0.3, -0.56), (0.8, 0.29, -0.42), (0.85, 0.28, -0.26)], FINM, 0.012),
        polyfin('af', [(0.55, 0.28, 0.27), (0.75, 0.28, 0.55), (0.95, 0.27, 0.48), (1.05, 0.26, 0.2)], FINM, 0.012),
        polyfin('pf', [(-0.15, 0.3, 0.38), (0.05, 0.3, 0.64), (0.22, 0.3, 0.6), (0.25, 0.3, 0.38)], FINM, 0.012)]
for f in fins:
    paint(f, lambda p, n: blend('#8E5A34', '#D5AE80', 0.5 + 0.5 * math.sin((p[0] * 3 + p[2] * 9) * 6 + fbm(p, 4))))
origin(fish, (0, 0, 0))
piece('FISH_body_fins', eye + fins, (0, 0, 0))
piece('FISH_f_gill', [gillcap], (-1.02, 0.34, 0.02))
piece('FISH_f_wall', [wall], (0.25, 0.30, -0.21))
GILLM = tissue('gillred', '#FFFFFF', rough=0.35, coat=0.7, vcol=True)
gl = []
for i in range(4):
    x = -0.97 + 0.075 * i
    gl.append(tube('arch', [T(x + 0.04, 0.26, -0.2), T(x - 0.03, 0.28, 0.02), T(x + 0.04, 0.26, 0.24)], 0.02, GILLM))
    for k in range(16):
        z = -0.17 + k * 0.026
        bow = 0.07 * (1 - ((z - 0.02) / 0.24) ** 2)
        for dy in (-0.006, 0.008):
            gl.append(tube('fil', [T(x - 0.02 + bow * 0.4, 0.29 + dy, z), T(x + 0.075 + bow * 0.4, 0.29 + dy, z + 0.004)], 0.006, GILLM))
gill = piece('FISH_o_gill', gl)
paint(gill, lambda p, n: tint('#C41E2C', 0.85 + 0.3 * abs(fbm(p, 30))))
piece('FISH_o_heart', [colored(blob('fh', [('E', (-0.32, 0.22, 0.22), (0.09, 0.06, 0.08)), ('E', (-0.24, 0.22, 0.16), (0.07, 0.05, 0.06)), ('C', (-0.38, 0.22, 0.2), (-0.5, 0.22, 0.18), 0.03)], CAV, res=0.012),
                               lambda p, n: tint('#E2B4B0') if p[0] < -0.4 else tint('#5E1422') if p[0] > -0.27 else tint('#9C1C28', 1 + 0.12 * fbm(p, 15)), rough=0.3, coat=0.7)])
piece('FISH_o_liver', [colored(roughen(blob('fl', [('E', (-0.18, 0.23, 0.06), (0.2, 0.06, 0.13)), ('E', (-0.02, 0.22, 0.19), (0.12, 0.05, 0.08))], CAV, res=0.015), 0.006, 0.08), mottled('#7A3526', 0.15, 8), rough=0.28, coat=0.75)])
fi = tube('fi', [T(-0.05, 0.22, 0.02), T(0.15, 0.22, 0.13), T(0.35, 0.21, 0.02), T(0.55, 0.21, 0.15), T(0.72, 0.2, 0.06), T(0.86, 0.2, 0.2)], 0.04, CAV)
colored(piece('FISH_o_intestine', [fi]), veined('#D9AE98', '#A84050', 8, 0.045), rough=0.35, coat=0.6)
piece('FISH_o_bladder', [colored(blob('fb', [('E', (0.05, 0.24, -0.08), (0.24, 0.06, 0.1)), ('E', (0.5, 0.24, -0.08), (0.26, 0.06, 0.11))], CAV, res=0.015), veined('#EEEBE3', '#C46A72', 7, 0.035, 0.05), rough=0.15, coat=0.95)])
piece('FISH_o_kidney', [colored(blob('fk', [('E', (0.25, 0.18, -0.18), (0.6, 0.04, 0.04))], CAV, res=0.012), mottled('#4E1418', 0.2, 12))])
piece('FISH_o_gonad', [colored(roughen(blob('fg', [('E', (0.45, 0.22, 0.2), (0.28, 0.05, 0.08))], CAV, res=0.012), 0.01, 0.03), mottled('#E8D49A', 0.12, 10, '#C9A85A', 60, 0.2), rough=0.4, coat=0.5)])
tag('FISH', *[o for o in bpy.data.objects if o.name.startswith('FISH_')])


# ================================================================== 4. HOA (đứng trên đế xốp, nhìn từ trên xuống): đài, tràng, nhị, nhụy
FOAM = mat('foam', hexc('#E9E4D8'), rough=0.95)
PLANT = tissue('plant', '#FFFFFF', rough=0.45, coat=0.25, vcol=True)
FY = 0.32
piece('FLOWER_body', [cyl('foam', 0.36, 0.16, T(0, 0.08, 0), FOAM, bevel=0.02), colored(cyl('stem', 0.06, 0.22, T(0, 0.2, 0), PLANT), mottled('#4F8236', 0.1, 20))], (0, 0, 0))
piece('FLOWER_o_receptacle', [colored(ell('rc', (0, FY, 0), (0.17, 0.08, 0.17), PLANT), mottled('#5E9440', 0.12, 16))])


def leaf_veins(base, vein, center=(0.0, 0.0), k=46, w=0.1):
    """gân tỏa từ gốc phiến: sọc mảnh theo góc quanh tâm hoa"""
    def fn(p, n):
        a = math.atan2(p[2] - center[1], p[0] - center[0])
        r = math.hypot(p[0] - center[0], p[2] - center[1])
        c = base(p, n) if callable(base) else tint(base, 1 + 0.08 * fbm(p, 10))
        return blend(c, vein, 0.45) if abs(math.sin(a * k + r * 6)) < w else c
    return fn


sep = [leaf('s', (math.cos(a) * 0.1, FY, math.sin(a) * 0.1), a, 0.55, 0.2, 0.32, 0.08, PLANT) for a in [i * 2 * math.pi / 5 + 0.63 for i in range(5)]]
for o in sep:
    roughen(o, 0.01, 0.15)
sepals = piece('FLOWER_f_sepals', sep, (0, FY, 0))
paint(sepals, leaf_veins('#4F8A35', '#3A6A28', k=30))
pets = [leaf('p', (math.cos(a) * 0.12, FY + 0.04, math.sin(a) * 0.12), a, 0.95, 0.42, 0.42, 0.12, PLANT, nu=22, nv=11, twist=0.03) for a in [i * 2 * math.pi / 5 for i in range(5)]]
for o in pets:
    roughen(o, 0.022, 0.18)  # mép cánh gợn sóng
petals = piece('FLOWER_f_petals', pets, (0, FY, 0))
paint(petals, leaf_veins(lambda p, n: blend('#B8245E', '#FBEFF3', min(1.0, (math.hypot(p[0], p[2]) - 0.12) / 0.4)), '#D97AA0', k=52, w=0.07))
fil, ant = [], []
for i in range(15):
    a = i * 2 * math.pi / 15 + 0.2
    r1, r2 = 0.09, 0.26 + 0.05 * (i % 2)
    h = 0.78 + 0.04 * (i % 3)
    fil.append(tube('fl', [T(math.cos(a) * r1, FY + 0.06, math.sin(a) * r1), T(math.cos(a) * (r1 + r2) * 0.55, 0.58, math.sin(a) * (r1 + r2) * 0.55), T(math.cos(a) * r2, h, math.sin(a) * r2)], 0.011, PLANT))
    tx, tz = -math.sin(a) * 0.022, math.cos(a) * 0.022
    ant.append(blob('an', [('E', (math.cos(a) * r2 + tx, h + 0.04, math.sin(a) * r2 + tz), (0.022, 0.05, 0.022)), ('E', (math.cos(a) * r2 - tx, h + 0.04, math.sin(a) * r2 - tz), (0.022, 0.05, 0.022))], PLANT, res=0.008))
paint(piece('FLOWER_o_filament', fil), lambda p, n: blend('#F6F2DC', '#E8D98A', (p[1] - 0.4) / 0.45))
paint(piece('FLOWER_o_anther', ant), mottled('#E2A91E', 0.12, 20, '#F6D35A', 90, 0.15))
OVC = ((0, 0.45, 0), (0.15, 0.15, 0.15))
LOC = tissue('locule', '#E8F0C8', rough=0.6)
ov = ell('ov', *OVC, PLANT)
for sx in (-1, 1):
    boolean(ov, ell('lc', (sx * 0.055, 0.45, 0), (0.04, 0.095, 0.1), None), 'DIFFERENCE', LOC)
sty = cyl('sty', 0.026, 0.42, T(0, 0.79, 0), PLANT, r2=0.02, bevel=0)
stg = roughen(blob('stg', [('E', (0, 1.02, 0), (0.06, 0.035, 0.06))] + [('E', (math.cos(a) * 0.05, 1.03, math.sin(a) * 0.05), (0.035, 0.025, 0.035)) for a in (0, 2.1, 4.2)], PLANT, res=0.008), 0.008, 0.02)
COLS = {'ovary': mottled('#8DBB5A', 0.1, 14, '#C8E08A', 50, 0.12), 'style': lambda p, n: tint('#C8DB8A', 1 + 0.06 * fbm(p, 20)), 'stigma': mottled('#E3D86A', 0.15, 30)}
front = []
for name, o in (('ovary', ov), ('style', sty), ('stigma', stg)):
    f = dup(o, name + 'F')
    boolean(o, half(z=0.0), 'DIFFERENCE', LOC if name == 'ovary' else None)
    boolean(f, half(z=0.0), 'INTERSECT', LOC if name == 'ovary' else None)
    paintm(o, {PLANT: COLS[name]})
    paintm(f, {PLANT: COLS[name]})
    front.append(f)
    piece('FLOWER_o_' + name, [o])
piece('FLOWER_f_pistil', front, (0, OVC[0][1] - 0.15, 0.0))
piece('FLOWER_o_ovule', [ball('ou', 0.022, T(sx * (0.035 + 0.025 * (k % 2)), 0.38 + 0.035 * k, -0.012), tissue('ovule', '#FFF6DA', rough=0.4, coat=0.5)) for sx in (-1, 1) for k in range(4)])
tag('FLOWER', *[o for o in bpy.data.objects if o.name.startswith('FLOWER_')])


# ================================================================== 5. MÔ HÌNH BÁN THÂN NGƯỜI (nằm ngửa, đầu về −x; bên phải người = +z)
SKINH = tissue('humanskin', '#FFFFFF', rough=0.5, coat=0.15, vcol=True)
BASEM = mat('modelbase', hexc('#CFC6B8'), rough=0.7)
BONE = tissue('bone', '#FFFFFF', rough=0.45, coat=0.25, vcol=True)
hum = blob('HUMAN_body', [('E', (-0.75, 0.36, 0), (0.8, 0.38, 0.95)), ('E', (0.45, 0.33, 0), (0.85, 0.33, 0.85)), ('E', (1.3, 0.32, 0), (0.45, 0.32, 0.9)),
                          ('E', (-0.85, 0.5, -0.42), (0.38, 0.2, 0.32)), ('E', (-0.85, 0.5, 0.42), (0.38, 0.2, 0.32)),  # cơ ngực
                          ('E', (-1.3, 0.33, -0.78), (0.32, 0.26, 0.36)), ('E', (-1.3, 0.33, 0.78), (0.32, 0.26, 0.36)), ('C', (-1.55, 0.33, 0), (-2.05, 0.33, 0), 0.22)], SKINH)
roughen(hum, 0.004, 0.2)
for cut in (half(y=0.02, above=False), half(x=-1.95, above=False), half(x=1.62), half(z=-1.05, above=False), half(z=1.05)):
    boolean(hum, cut, 'DIFFERENCE', BASEM)
capH = dup(hum, 'capH')
KH = ((-0.05, 0.55, 0), (1.25, 0.45, 0.62))
boolean(hum, ell('k', *KH, None), 'DIFFERENCE', CAV)
boolean(capH, ell('k', *KH, None), 'INTERSECT', MUSC)
boolean(capH, half(y=0.48), 'INTERSECT', MUSC)
capHR = dup(capH, 'capHR')
boolean(capH, half(z=0.0, above=False), 'INTERSECT', MUSC)
boolean(capHR, half(z=0.0), 'INTERSECT', MUSC)
_skin = mottled('#E2B898', 0.05, 3)


def skin_h(p, n):
    d = math.hypot(p[0] - 0.62, p[2])
    return blend(_skin(p, n), '#8A5A44', max(0.0, 1 - d / 0.035)) if d < 0.035 else _skin(p, n)  # rốn
for o in (hum, capH, capHR):
    paintm(o, {SKINH: skin_h, MUSC: muscle_fn})
origin(hum, (0, 0, 0))
piece('HUMAN_f_left', [capH], (-0.05, 0.48, -0.61))
piece('HUMAN_f_right', [capHR], (-0.05, 0.48, 0.61))
ribs = [box('st', (0.85, 0.15, 0.05), T(-0.72, 0.43, 0), BONE, bevel=0.015)]
for i in range(7):
    x = -1.12 + 0.15 * i
    for s in (-1, 1):
        ribs.append(tube('rib', [T(x, 0.42, s * 0.07), T(x + 0.05, 0.4, s * 0.32), T(x + 0.12, 0.3, s * 0.5), T(x + 0.16, 0.18, s * 0.58)], 0.028, BONE))
cage = piece('HUMAN_f_ribs', ribs, (-0.7, 0.4, 0))
# sụn sườn (gần xương ức) trắng xanh, xương sườn ngà
paint(cage, lambda p, n: tint('#D6E2E6', 1 + 0.05 * fbm(p, 20)) if abs(p[2]) < 0.28 and abs(p[2]) > 0.08 else tint('#EADFC6', 1 + 0.08 * fbm(p, 14)))


def lung_fn(p, n):
    c = spongy('#D9939C', '#A5606E', 30)(p, n)
    d0, _ = cells(p, 9)
    if d0 < 0.12:
        c = blend(c, '#7E6A70', 0.35)  # đốm xám
    # rãnh liên thùy
    if abs(p[0] - (-0.85 + 0.12 * p[2])) < 0.012 or (p[2] > 0 and abs(p[0] - (-0.62)) < 0.01):
        c = blend(c, '#5A2A34', 0.8)
    return c


# phổi thật (organs.py) đặt nằm ngửa: đỉnh phổi về phía đầu (−x), mặt trước lên trên (+y), phổi phải người ở +z; dẹt theo chiều trước–sau
from organs import lungs as real_lungs, remap  # noqa: E402
_hl = real_lungs(s=1.0, gap=0.26, rings=False)
remap(_hl, lambda x, y, z: (-0.47 - y * 0.62, 0.3 + z * 0.62 * 0.62, -x * 0.58))
piece('HUMAN_o_lung', _hl)


# tim thật (organs.py) đặt nằm ngửa giữa hai phổi, lệch về bên trái người (−z), đáy tim về phía đầu, mặt trước lên trên
from organs import heart_ext  # noqa: E402
_hh = heart_ext('hh')
remap(_hh, lambda x, y, z: (-0.64 - (y - 0.45) * 0.38, 0.38 + z * 0.38 * 0.6, -0.03 - x * 0.38))
piece('HUMAN_o_heart', remap(_hh, lambda x, y, z: (x, y, z)))
piece('HUMAN_o_diaphragm', [colored(ell('dp', (-0.33, 0.26, 0), (0.06, 0.16, 0.5), CAV), lambda p, n: tint('#A8474C', 0.85 + 0.25 * abs(math.sin(math.atan2(p[2], p[1] - 0.1) * 30))))])
piece('HUMAN_o_liver', [colored(roughen(blob('hv', [('E', (-0.05, 0.31, 0.22), (0.3, 0.12, 0.34)), ('E', (0.0, 0.3, -0.12), (0.18, 0.09, 0.18)), ('E', (0.18, 0.24, 0.2), (0.05, 0.04, 0.05))], CAV, res=0.018), 0.006, 0.12),
                                lambda p, n: tint('#3F7B3A') if math.dist((p[0], p[2]), (0.18, 0.2)) < 0.06 else mottled('#6E261E', 0.12, 6)(p, n), rough=0.22, coat=0.8)])
piece('HUMAN_o_stomach', [colored(blob('hs', [('C', (-0.12, 0.32, -0.36), (0.1, 0.32, -0.3), 0.1), ('C', (0.1, 0.32, -0.3), (0.24, 0.31, -0.14), 0.085), ('E', (0.24, 0.31, -0.06), (0.08, 0.07, 0.08))], CAV, res=0.016),
                                  veined('#D9978F', '#A0404C', 6, 0.05), rough=0.35, coat=0.6)])
# ruột già: khung có túi phình (haustra) và dải cơ dọc sáng màu
LI = [(0.98, 0.28, 0.42), (0.55, 0.3, 0.46), (0.38, 0.3, 0.32), (0.38, 0.3, -0.3), (0.55, 0.3, -0.44), (0.95, 0.28, -0.42), (1.02, 0.26, -0.12)]
li_el = []
for a, b in zip(LI, LI[1:]):
    n_ = max(2, int(math.dist(a, b) / 0.09))
    for i in range(n_):
        t = i / n_
        q = tuple(a[j] + (b[j] - a[j]) * t for j in range(3))
        li_el.append(('E', q, (0.075, 0.07, 0.075)))
largeint = blob('li', li_el, CAV, res=0.016)
piece('HUMAN_o_largeint', [colored(largeint, lambda p, n: blend(tint('#C8977A', 1 + 0.1 * fbm(p, 12)), '#E9D3BA', 0.6) if n.z > 0.93 else tint('#C8977A', 1 + 0.1 * fbm(p, 12)), rough=0.4, coat=0.5)])
si = tube('si', snake(0.5, 0.92, (-0.27, -0.16, -0.05, 0.06, 0.17, 0.28), 0.32, 0.03), 0.042, CAV)
colored(piece('HUMAN_o_smallint', [si]), veined('#E0A493', '#A84452', 10, 0.04), rough=0.35, coat=0.65)
# mọi cơ quan còn lại → khối liền ướt (Voxel Remesh + Displace + Clearcoat/Subsurface), giữ màu đã vẽ
from organs import refuse, zanat  # noqa: E402
_zm = zanat('ZM_')  # cơ quan giải phẫu thật (Z-Anatomy, CC BY-SA 4.0), đã đặt nằm ngửa; thiếu tệp thì giữ hình tự dựng
for _nm in ('HUMAN_o_lung', 'HUMAN_o_heart', 'HUMAN_o_diaphragm', 'HUMAN_o_liver', 'HUMAN_o_stomach', 'HUMAN_o_largeint', 'HUMAN_o_smallint'):
    _src = bpy.data.objects[_nm]
    _src.name = _nm + '_src'
    _real = _zm.get(_nm[len('HUMAN_o_'):])
    if _real is not None:
        bpy.data.objects.remove(_src, do_unlink=True)
        piece(_nm, [_real])
    elif _nm not in ('HUMAN_o_lung', 'HUMAN_o_heart'):
        piece(_nm, [refuse(_src)])
    else:
        _src.name = _nm
tag('HUMAN', *[o for o in bpy.data.objects if o.name.startswith('HUMAN_')])


# không xuất vật phụ còn sót (dao cắt, khối trung gian)
for o in list(bpy.data.objects):
    if not (o.name.startswith(('FROG_', 'PIG_', 'FISH_', 'FLOWER_', 'HUMAN_', 'TOOL_')) or o.name in ('TRAY', 'TOOLTRAY')):
        bpy.data.objects.remove(o, do_unlink=True)
print('NODES', sorted(o.name for o in bpy.data.objects))
export_glb('dissect-parts.glb')

if PREVIEW:
    for k, objs in ALLOBJ.items():
        for o in objs:
            o.hide_render = k != SHOW
    for name, z in (('TOOL_scalpel', -1.2), ('TOOL_scissors', -0.6), ('TOOL_forceps', 0.0), ('TOOL_pin', 0.6), ('TOOL_dropper', 1.2)):
        bpy.data.objects[name].location = T(2.95, 0.04, z)
    preview((0.6, 6.5, 5.2), (0.6, 0.2, 0.0), lens=36)
