"""
Tim người cắt bổ mặt trước cho template bảng `BIO_HEART_CIRCULATION` (`Scenes3DOrgans.tsx`): bốn buồng tim (thành tim bổ đôi thấy lòng buồng,
thất trái dày nhất), van ba lá và van hai lá (lá van + dây chằng + cơ nhú), động mạch chủ (cung + ba nhánh), thân và hai nhánh động mạch phổi,
tĩnh mạch chủ trên và dưới, bốn tĩnh mạch phổi, hai phổi có khí quản, và "các cơ quan" là một lưới mao mạch.
Tên nút `heart_<id bộ phận>` trùng id bộ phận của preset (lung, body, vc, ra, rv, pa, pv, la, valve-r, valve-l, lv, aorta).
Gốc lưới: buồng tim ở chốt co bóp (tâm nhĩ quanh (0; 0,55; −0,1), tâm thất quanh (0,05; −0,4; 0)), van ở vòng van, còn lại ở gốc toạ độ.
Đường máu chảy trong cảnh (`HEART_LOOPS` ở `Scenes3DOrgans.tsx`) đi theo đúng các toạ độ ghi ở đây: đổi hình ở đây phải đổi ở đó.

Chạy:
  blender --background --python tools/lab-models/heart_model.py -- apps/teacher-board/public/models [ảnh xem thử.png]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F401,F403
from organic import *  # noqa: E402,F401,F403

MYO = tissue('myo', '#FFFFFF', rough=0.32, coat=0.55, vcol=True)
SECT = tissue('sect', '#FFFFFF', rough=0.5, coat=0.25, vcol=True)
RCAV = tissue('rcav', '#6E4466', rough=0.45, coat=0.5)  # lòng buồng tim phải: ánh máu đỏ thẫm–tím
LCAV = tissue('lcav', '#A2262F', rough=0.45, coat=0.5)  # lòng buồng tim trái: đỏ tươi
VALVE = tissue('valve', '#EDE0C6', rough=0.45, coat=0.4)
PAP = tissue('pap', '#8A2A30', rough=0.45, coat=0.5)
CUT = 0.08  # mặt bổ: bỏ phần z > CUT


def myo_fn(p, n):
    c = tint('#8C2530', 1 + 0.15 * fbm(p, 4))
    # mỡ vàng trong rãnh vành (giữa nhĩ và thất) và rãnh liên thất sau
    groove = max(1 - abs(p[1] - 0.2 + 0.1 * p[0]) / 0.09, 1 - abs(p[0] - 0.08 + 0.25 * (p[1] + 0.4)) / 0.07 if p[2] < -0.3 else 0.0)
    if groove > 0:
        c = blend(c, tint('#E5CF92', 1 + 0.12 * fbm(p, 16)), min(1.0, groove * 1.3))
    return c


def sect_fn(p, n):
    return tint('#B4505A', 0.88 + 0.14 * math.sin(math.atan2(p[1] + 0.4, p[0] - 0.05) * 40 + fbm(p, 5) * 4) + 0.06 * fbm(p, 18))


outer = blob('outer', [('E', (0.1, -0.4, 0), (0.95, 1.0, 0.72)), ('E', (0.45, -1.25, 0.05), (0.38, 0.35, 0.3)),
                       ('E', (-0.78, 0.5, 0.05), (0.48, 0.5, 0.45)), ('E', (0.55, 0.62, -0.3), (0.45, 0.4, 0.4)),
                       ('E', (-0.55, 0.85, 0.38), (0.25, 0.15, 0.1)), ('E', (0.78, 0.86, 0.15), (0.2, 0.13, 0.1))], MYO, res=0.03)
roughen(outer, 0.012, 0.25)
# động mạch vành và tĩnh mạch tim nổi trên mặt sau (mặt trước đã bổ)
cor = [tube('c1', [T(x, y, surf_z) for x, y, surf_z in ((0.12, 0.15, -0.66), (0.15, -0.4, -0.72), (0.3, -1.0, -0.6), (0.45, -1.5, -0.3))], 0.035, tissue('cor', '#7A1A24', rough=0.35, coat=0.6)),
       tube('c2', [T(-0.9, 0.2, -0.3), T(-0.4, 0.22, -0.62), T(0.1, 0.2, -0.7), T(0.7, 0.22, -0.62), T(1.05, 0.15, -0.3)], 0.03, tissue('cv', '#4A3A64', rough=0.35, coat=0.5))]
CAVS = [((-0.75, 0.5, 0.05), (0.34, 0.36, 0.32), RCAV), ((0.55, 0.58, -0.25), (0.3, 0.3, 0.28), LCAV),
        ((-0.38, -0.45, 0.1), (0.36, 0.72, 0.42), RCAV), ((0.42, -0.5, 0.0), (0.3, 0.82, 0.36), LCAV)]
for c, s, m in CAVS:
    boolean(outer, ell('k', c, s, None), 'DIFFERENCE', m)
boolean(outer, half(z=CUT), 'DIFFERENCE', SECT)
paintm(outer, {MYO: myo_fn, SECT: sect_fn})
REG = {'ra': (False, True), 'la': (True, True), 'rv': (False, False), 'lv': (True, False)}
PIVOT = {'ra': (0, 0.55, -0.1), 'la': (0, 0.55, -0.1), 'rv': (0.05, -0.4, 0), 'lv': (0.05, -0.4, 0)}
for k, (left, top) in REG.items():
    o = dup(outer, 'heart_' + k)
    boolean(o, half(x=0.05, above=left), 'INTERSECT', SECT)
    boolean(o, half(y=0.22, above=top), 'INTERSECT', SECT)
    paintm(o, {MYO: myo_fn, SECT: sect_fn})
    piece('heart_' + k, [o] + ([cor[0]] if k == 'lv' else [cor[1]] if k == 'rv' else []), PIVOT[k])
bpy.data.objects.remove(outer, do_unlink=True)


def valve(name, ring_c, r, n_cusp, pap_c, tilt=0.0):
    objs = []
    bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=0.03, location=T(*ring_c), rotation=(tilt, 0, 0))
    objs.append(finish(bpy.context.object, VALVE))
    for i in range(n_cusp):
        a = 2 * math.pi * i / n_cusp
        base = (ring_c[0] + math.cos(a) * r * 0.6, ring_c[1], ring_c[2] + math.sin(a) * r * 0.6)
        objs.append(leaf('cusp', base, a + math.pi, r * 0.95, r * 0.7, -1.25, 0.04, VALVE, nu=8, nv=6))
        tipx, tipz = base[0] - math.cos(a) * r * 0.25, base[2] - math.sin(a) * r * 0.25
        for dz in (-0.04, 0.0, 0.04):
            objs.append(tube('ch', [T(tipx + dz, ring_c[1] - r * 0.85, tipz), T(pap_c[0] + dz * 0.3, pap_c[1] + 0.12, pap_c[2])], 0.006, VALVE))
    objs.append(blob('pap', [('C', (pap_c[0], pap_c[1] - 0.12, pap_c[2]), (pap_c[0], pap_c[1] + 0.1, pap_c[2]), 0.06)], PAP, res=0.015))
    return piece(name, objs, ring_c)


valve('heart_valve-r', (-0.4, 0.22, 0.0), 0.2, 3, (-0.45, -0.65, -0.05))
valve('heart_valve-l', (0.42, 0.3, -0.08), 0.17, 2, (0.5, -0.75, -0.08))

VES = tissue('ves', '#FFFFFF', rough=0.4, coat=0.45, vcol=True)
LUMEN = tissue('lumen', '#3A0E14', rough=0.6)


def vessel(name, paths, hx, open_ends=True):
    objs = []
    for pts, r in paths:
        objs.append(tube(name, [T(*q) for q in pts], r, VES))
        if open_ends:
            e, pr = Vector(pts[-1]), Vector(pts[-2])
            objs.append(ell('lum', tuple(e + (e - pr).normalized() * 0.004), (r * 0.7, r * 0.7, r * 0.7), LUMEN, seg=20))
    o = join(name, objs)
    paintm(o, {VES: lambda p, n: tint(hx, 1 + 0.1 * fbm(p, 9))})
    return piece(name, [o], (0, 0, 0))


AORTA = [(0.15, 0.2, -0.05), (0.1, 0.9, 0.0), (0.25, 1.55, -0.1), (0.85, 1.75, -0.3), (1.35, 1.3, -0.45), (1.45, 0.3, -0.5), (1.45, -1.5, -0.4), (1.2, -2.25, -0.2)]
vessel('heart_aorta', [(AORTA, 0.16)] + [([(0.3 + 0.27 * i, 1.65 + 0.05 * i, -0.15 - 0.07 * i), (0.32 + 0.3 * i, 2.15, -0.18 - 0.07 * i)], 0.06) for i in range(3)], '#D9564E', open_ends=False)
PA = [(-0.1, 0.25, 0.3), (0.0, 0.9, 0.42), (0.05, 1.3, 0.35)]
vessel('heart_pa', [(PA, 0.15), ([(0.05, 1.3, 0.35), (-0.5, 1.55, 0.2), (-1.05, 2.0, 0.0)], 0.1), ([(0.05, 1.3, 0.35), (0.6, 1.6, 0.25), (1.05, 2.0, 0.05)], 0.1)], '#5A73C8', open_ends=False)
vessel('heart_pv', [([(-1.0, 1.9, -0.45), (-0.3, 1.1, -0.6), (0.35, 0.75, -0.5)], 0.075), ([(-1.05, 2.1, -0.2), (-0.4, 1.3, -0.45), (0.3, 0.85, -0.4)], 0.07),
                    ([(1.0, 1.9, -0.45), (0.8, 1.2, -0.55), (0.65, 0.8, -0.5)], 0.075), ([(1.05, 2.1, -0.2), (0.9, 1.3, -0.4), (0.75, 0.85, -0.42)], 0.07)], '#D8565A', open_ends=False)
vessel('heart_vc', [([(-0.8, 0.85, 0.05), (-0.85, 1.5, 0.05), (-1.3, 1.75, 0.1), (-2.0, 1.75, 0.1)], 0.14), ([(-0.8, 0.1, -0.05), (-0.85, -0.8, -0.35), (-0.9, -1.7, -0.35), (-0.8, -2.3, -0.2)], 0.15)], '#4E63B4')


def lung_fn(p, n):
    d0, d1 = cells(p, 18)
    c = blend(tint('#E3A0AE', 1 + 0.1 * fbm(p, 6)), '#B86A7C', max(0.0, 1 - (d1 - d0) / 0.1) * 0.6)
    # rãnh liên thùy: phổi phải 3 thùy, phổi trái 2 thùy
    if abs(p[1] - 2.55 + 0.45 * (abs(p[0]) - 1.2)) < 0.025 or (p[0] < 0 and abs(p[1] - 2.3) < 0.02 and p[0] < -1.0):
        c = blend(c, '#6A2A3A', 0.8)
    return c


lungs = [roughen(blob('lg', [('E', (s * 1.2, 2.55, -0.1), (0.68 if s < 0 else 0.6, 0.62, 0.42)), ('E', (s * 1.25, 2.1, -0.15), (0.5, 0.3, 0.38))], MYO, res=0.03), 0.015, 0.2) for s in (-1, 1)]
for o in lungs:
    colored(o, lung_fn, rough=0.5, coat=0.3)
RING = tissue('cartilage', '#E9E2D2', rough=0.5, coat=0.3)
tr = [tube('trachea', [T(0, 3.45, -0.2), T(0, 2.75, -0.2)], 0.11, RING), tube('br', [T(0, 2.78, -0.2), T(-0.5, 2.55, -0.18), T(-0.9, 2.5, -0.15)], 0.075, RING),
      tube('br', [T(0, 2.78, -0.2), T(0.5, 2.55, -0.18), T(0.9, 2.5, -0.15)], 0.075, RING)]
for i in range(8):
    bpy.ops.mesh.primitive_torus_add(major_radius=0.115, minor_radius=0.018, location=T(0, 2.85 + i * 0.08, -0.2))
    tr.append(finish(bpy.context.object, RING))
piece('heart_lung', lungs + tr, (0, 0, 0))


def bed_fn(p, n):
    # lưới mao mạch: phía động mạch (phải) đỏ, phía tĩnh mạch (trái) xanh; nền mô cơ
    c = tint('#C9917F', 1 + 0.1 * fbm(p, 5))
    r = abs(fbm(p, 6, 2))
    if r < 0.06:
        c = blend(c, blend('#3F55B0', '#D23A3A', (p[0] + 1.5) / 3.0), 0.9)
    return c


bed = colored(roughen(blob('bed', [('E', (0.2, -2.7, -0.1), (1.9, 0.3, 0.55)), ('E', (-0.9, -2.75, -0.1), (0.6, 0.28, 0.45)), ('E', (1.2, -2.75, -0.1), (0.6, 0.28, 0.45))], MYO, res=0.03), 0.03, 0.4), bed_fn, rough=0.5, coat=0.2)
piece('heart_body', [bed], (0, 0, 0))

for o in list(bpy.data.objects):
    if not o.name.startswith('heart_'):
        bpy.data.objects.remove(o, do_unlink=True)
print('NODES', sorted(o.name for o in bpy.data.objects))
export_glb('heart.glb')
if PREVIEW:
    # ảnh thử: nâng cả mô hình lên trên mặt bàn xem thử của kit (không ảnh hưởng GLB đã xuất); góc nhìn chếch để thấy lòng buồng tim
    for o in bpy.data.objects:
        o.location.z += 3.2
    preview((3.2, 4.2, 8.2), (0.1, 3.0, -0.2), lens=36)
