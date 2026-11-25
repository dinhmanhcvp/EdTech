"""
Tim cho bài "Phẫu thuật tim" ở phòng thực hành /lab (`HandsSurgery3D.tsx`, logic ở `src/utils/lab/hands/surgery.ts`).
Cùng hình tim người với `heart_model.py` (đứng, đáy tim ở trên, mặt trước hướng +z, cao ≈ 2,2) nhưng mọi lớp là KHỐI KÍN để cảnh
cắt lớp bằng mặt phẳng và vẽ nắp lát cắt bằng stencil (chẵn lẻ số lần tia đi qua mặt: lưới hở sẽ làm nắp loang).

Nút (từ ngoài vào trong, đúng thứ tự bóc lớp):
  `SH_peri`        màng ngoài tim: túi kín mỏng (solidify) bọc cả tim và gốc mạch lớn
  `SH_cor`         mạch vành mặt trước (nhánh chéo, động mạch vành phải, tĩnh mạch tim) + `SH_lad` động mạch liên thất trước (vùng cấm của dao)
  `SH_wall_front`  thành tim nửa trước (z > CUT), `SH_wall_back` nửa sau: khối cơ kín đã khoét bốn buồng (lòng buồng phải tím sẫm, trái đỏ tươi)
  `SH_valve_tri`, `SH_valve_mit`, `SH_valve_ao`, `SH_valve_pa`  bốn van (gốc ở vòng van)
  `SH_aorta`, `SH_pa`, `SH_vc`, `SH_pv`  mạch lớn (ống, đầu cắt có lòng mạch sẫm)
  `SH_field`       trường mổ quanh tim (đã xoay sẵn theo cảnh: tim nằm ngửa, mặt trước hướng lên): khoang ngực, mép xương ức, khăn mổ, banh ngực, khay Mayo
  `TOOL_clamp`, `TOOL_suction`, `TOOL_needle`  kẹp cầm máu, ống hút, kìm kẹp kim có kim cong + chỉ (mũi ở gốc, thân dọc +x)
Toạ độ three.js. Cảnh đặt các nút tim vào một nhóm xoay −90° quanh trục x (mặt trước lên trời).

Chạy:
  blender --background --python tools/lab-models/surgery_heart.py -- apps/teacher-board/public/models [ảnh xem thử.png]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F401,F403
from organic import *  # noqa: E402,F401,F403

MYO = tissue('myo', '#FFFFFF', rough=0.32, coat=0.6, vcol=True)
SECT = tissue('sect', '#FFFFFF', rough=0.5, coat=0.25, vcol=True)
RCAV = tissue('rcav', '#6E4466', rough=0.45, coat=0.5)
LCAV = tissue('lcav', '#A2262F', rough=0.45, coat=0.5)
VALVE = tissue('valve', '#EDE0C6', rough=0.45, coat=0.4)
PAP = tissue('pap', '#8A2A30', rough=0.45, coat=0.5)
PERI = tissue('peri', '#FFFFFF', rough=0.2, coat=0.9, vcol=True)
CUT = 0.08


def myo_fn(p, n):
    c = tint('#8C2530', 1 + 0.15 * fbm(p, 4))
    groove = max(1 - abs(p[1] - 0.2 + 0.1 * p[0]) / 0.09, 1 - abs(p[0] - 0.08 + 0.25 * (p[1] + 0.4)) / 0.07 if p[2] > 0.3 else 0.0)
    if groove > 0:
        c = blend(c, tint('#E5CF92', 1 + 0.12 * fbm(p, 16)), min(1.0, groove * 1.3))
    return c


def sect_fn(p, n):
    return tint('#B4505A', 0.88 + 0.14 * math.sin(math.atan2(p[1] + 0.4, p[0] - 0.05) * 40 + fbm(p, 5) * 4) + 0.06 * fbm(p, 18))


HEART = [('E', (0.1, -0.4, 0), (0.95, 1.0, 0.72)), ('E', (0.45, -1.25, 0.05), (0.38, 0.35, 0.3)),
         ('E', (-0.78, 0.5, 0.05), (0.48, 0.5, 0.45)), ('E', (0.55, 0.62, -0.3), (0.45, 0.4, 0.4)),
         ('E', (-0.55, 0.85, 0.38), (0.25, 0.15, 0.1)), ('E', (0.78, 0.86, 0.15), (0.2, 0.13, 0.1))]
outer = blob('outer', HEART, MYO, res=0.03)  # mịn hơn + roughen làm phép cắt nửa (EXACT) xóa mất vỏ
roughen(outer, 0.012, 0.25)
probe = dup(outer, 'probe')  # mặt ngoài nguyên vẹn để chiếu mạch vành lên


def front(x, y, lift=0.0):
    """điểm trên mặt trước của tim tại (x, y) (tia bắn từ +z vào), nhấc `lift` theo pháp tuyến; toạ độ three.js"""
    hit, loc, nrm, _i = probe.ray_cast(Vector(T(x, y, 4)), Vector(T(0, 0, -1)))
    if not hit:
        return (x, y, 0.5)
    return (loc.x + nrm.x * lift, loc.z + nrm.z * lift, -loc.y - nrm.y * lift)


CAVS = [((-0.75, 0.5, 0.05), (0.34, 0.36, 0.32), RCAV), ((0.55, 0.58, -0.25), (0.3, 0.3, 0.28), LCAV),
        ((-0.38, -0.45, 0.1), (0.36, 0.72, 0.42), RCAV), ((0.42, -0.5, 0.0), (0.3, 0.82, 0.36), LCAV)]
for c, s, m in CAVS:
    boolean(outer, ell('k', c, s, None), 'DIFFERENCE', m)
back = dup(outer, 'back')
boolean(outer, half(z=CUT, above=False), 'DIFFERENCE', SECT)  # nửa trước: giữ z > CUT
boolean(back, half(z=CUT), 'DIFFERENCE', SECT)
for o in (outer, back):
    paintm(o, {MYO: myo_fn, SECT: sect_fn})
piece('SH_wall_front', [outer], (0.05, -0.2, CUT))
piece('SH_wall_back', [back], (0.05, -0.2, 0))

# màng ngoài tim: túi trong mờ bọc ngoài cả tim (cách mặt tim ~0,07) và gốc các mạch lớn
peri = blob('SH_peri', [(k, c, (s[0] * 1.07 + 0.04, s[1] * 1.05 + 0.04, s[2] * 1.07 + 0.04)) for k, c, s in HEART] +
            [('C', (0.12, 0.3, -0.05), (0.12, 1.05, 0.0), 0.24), ('C', (-0.1, 0.3, 0.3), (0.0, 1.0, 0.4), 0.22), ('C', (-0.8, 0.6, 0.05), (-0.82, 1.05, 0.05), 0.2)], PERI, res=0.03)
roughen(peri, 0.006, 0.3)
colored(peri, lambda p, n: blend(tint('#F1E9DE', 1 + 0.05 * fbm(p, 6)), tint('#E8CF8E'), max(0.0, fbm(p, 3) - 0.25) * 1.2), rough=0.18, coat=0.95)
dec = peri.modifiers.new('dec', 'DECIMATE')  # màng trong mờ, không cần lưới dày: bớt tam giác cho tia chọn mỗi khung hình
dec.ratio = 0.3
sol = peri.modifiers.new('sol', 'SOLIDIFY')
sol.thickness = 0.012
sol.offset = 0
piece('SH_peri', [peri], (0.05, -0.2, 0))

# mạch vành mặt trước, chiếu lên mặt tim
COR = tissue('cor', '#7A1A24', rough=0.32, coat=0.7)
CV = tissue('cv', '#4A3A64', rough=0.35, coat=0.6)
LAD = [(-0.02, 0.28), (0.0, 0.05), (0.05, -0.3), (0.12, -0.7), (0.24, -1.1), (0.38, -1.45), (0.48, -1.62)]
piece('SH_lad', [tube('lad', [T(*front(x, y, 0.03)) for x, y in LAD], 0.034, COR)], (0.1, -0.6, 0.6))
cor = []
for x0, y0, dx, dy in ((0.05, -0.3, 0.34, -0.12), (0.12, -0.7, 0.3, -0.16), (0.24, -1.1, 0.24, -0.12), (0.03, -0.1, -0.28, -0.2)):
    cor.append(tube('dg', [T(*front(x0 + dx * t, y0 + dy * t + 0.02 * math.sin(t * 6), 0.024)) for t in (0, 0.35, 0.7, 1.0)], 0.018, COR))
RCA = [(-0.12, 0.3), (-0.45, 0.26), (-0.8, 0.14), (-1.0, -0.05), (-1.08, -0.35)]
cor.append(tube('rca', [T(*front(x, y, 0.03)) for x, y in RCA], 0.03, COR))
cor.append(tube('gcv', [T(*front(x + 0.07, y + 0.01, 0.026)) for x, y in LAD[:6]], 0.022, CV))
piece('SH_cor', cor, (0, -0.4, 0.6))


def valve(name, ring_c, r, n_cusp, pap_c=None, up=False):
    """van nhĩ–thất (lá van + dây chằng + cơ nhú) hoặc van tổ chim (`up`: ba túi van khum hướng lên, không dây chằng)"""
    objs = []
    bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=0.026, location=T(*ring_c))
    objs.append(finish(bpy.context.object, VALVE))
    for i in range(n_cusp):
        a = 2 * math.pi * i / n_cusp
        base = (ring_c[0] + math.cos(a) * r * 0.6, ring_c[1], ring_c[2] + math.sin(a) * r * 0.6)
        objs.append(leaf('cusp', base, a + math.pi, r * (0.75 if up else 0.95), r * 0.7, 1.1 if up else -1.25, 0.05 if up else 0.04, VALVE, nu=8, nv=6))
        if pap_c:
            tipx, tipz = base[0] - math.cos(a) * r * 0.25, base[2] - math.sin(a) * r * 0.25
            for dz in (-0.04, 0.0, 0.04):
                objs.append(tube('ch', [T(tipx + dz, ring_c[1] - r * 0.85, tipz), T(pap_c[0] + dz * 0.3, pap_c[1] + 0.12, pap_c[2])], 0.006, VALVE))
    if pap_c:
        objs.append(blob('pap', [('C', (pap_c[0], pap_c[1] - 0.12, pap_c[2]), (pap_c[0], pap_c[1] + 0.1, pap_c[2]), 0.06)], PAP, res=0.015))
    return piece(name, objs, ring_c)


valve('SH_valve_tri', (-0.4, 0.22, 0.0), 0.2, 3, (-0.45, -0.65, -0.05))
valve('SH_valve_mit', (0.42, 0.3, -0.08), 0.17, 2, (0.5, -0.75, -0.08))
valve('SH_valve_ao', (0.14, 0.42, -0.04), 0.13, 3, up=True)
valve('SH_valve_pa', (-0.08, 0.45, 0.32), 0.12, 3, up=True)

VES = tissue('ves', '#FFFFFF', rough=0.35, coat=0.6, vcol=True)
LUMEN = tissue('lumen', '#3A0E14', rough=0.6)


def vessel(name, paths, hx):
    objs = []
    for pts, r in paths:
        objs.append(tube(name, [T(*q) for q in pts], r, VES))
        e, pr = Vector(pts[-1]), Vector(pts[-2])
        objs.append(ell('lum', tuple(e + (e - pr).normalized() * 0.004), (r * 0.72, r * 0.72, r * 0.72), LUMEN, seg=20))
    o = join(name, objs)
    paintm(o, {VES: lambda p, n: tint(hx, 1 + 0.1 * fbm(p, 9))})
    return piece(name, [o], (0, 0, 0))


vessel('SH_aorta', [([(0.15, 0.2, -0.05), (0.1, 0.9, 0.0), (0.25, 1.5, -0.1), (0.85, 1.7, -0.3), (1.3, 1.3, -0.45), (1.42, 0.7, -0.5)], 0.16)] +
       [([(0.3 + 0.27 * i, 1.62 + 0.04 * i, -0.15 - 0.07 * i), (0.32 + 0.3 * i, 2.0, -0.18 - 0.07 * i)], 0.06) for i in range(3)], '#E2B4A0')
vessel('SH_pa', [([(-0.1, 0.25, 0.3), (0.0, 0.9, 0.42), (0.05, 1.3, 0.35)], 0.15), ([(0.05, 1.3, 0.35), (-0.4, 1.5, 0.22), (-0.75, 1.7, 0.1)], 0.1),
                 ([(0.05, 1.3, 0.35), (0.5, 1.5, 0.25), (0.8, 1.7, 0.1)], 0.1)], '#D6A6A6')
vessel('SH_vc', [([(-0.8, 0.85, 0.05), (-0.85, 1.4, 0.05), (-0.88, 1.85, 0.05)], 0.14), ([(-0.8, 0.1, -0.05), (-0.85, -0.5, -0.35), (-0.88, -0.9, -0.42)], 0.15)], '#8E7FAE')
vessel('SH_pv', [([(0.45, 0.75, -0.45), (0.95, 0.9, -0.55), (1.3, 1.0, -0.55)], 0.07), ([(0.45, 0.55, -0.45), (0.95, 0.45, -0.55), (1.3, 0.4, -0.55)], 0.07),
                 ([(0.3, 0.8, -0.5), (0.0, 1.0, -0.7), (-0.3, 1.1, -0.75)], 0.065)], '#C98E8E')

def B3(name, size, loc, material, bevel=0.012):
    """hộp với kích thước theo trục three.js (rộng x, cao y, sâu z); `box` của kit nhận kích thước theo trục Blender"""
    return box(name, (size[0], size[2], size[1]), loc, material, bevel=bevel)


# ================================================================== trường mổ (toạ độ cảnh: tim nằm ngửa ở gốc, mặt trước lên, đáy tim về −z)
WET = tissue('cavity', '#FFFFFF', rough=0.3, coat=0.7, vcol=True)
bowl = lathe('bowl', [(0.0, -1.05), (1.0, -1.0), (1.8, -0.8), (2.3, -0.35), (2.45, 0.1), (2.5, 0.22)], T(0, 0, -0.2), WET, steps=64)
bowl.scale = (1.0, 1.25, 1.0)
field = [colored(bowl, lambda p, n: blend(tint('#B85A5A', 1 + 0.12 * fbm(p, 5)), tint('#E8C9A0'), max(0.0, fbm(p, 2) - 0.2)), rough=0.3, coat=0.7)]
BONE = tissue('sternum', '#E9E0CC', rough=0.55, coat=0.2)
FAT = tissue('fat', '#E8CF8A', rough=0.4, coat=0.5)
SKIN = tissue('skin', '#D9A487', rough=0.5, coat=0.2)
for sx in (-1, 1):
    field += [B3('st', (0.22, 0.2, 5.2), T(sx * 2.45, 0.12, -0.2), BONE, bevel=0.05), B3('ft', (0.3, 0.06, 5.4), T(sx * 2.7, 0.24, -0.2), FAT, bevel=0.03),
              B3('sk', (0.4, 0.05, 5.6), T(sx * 2.95, 0.27, -0.2), SKIN, bevel=0.02)]
DRAPE = mat('drape', hexc('#2F6F6A'), rough=0.95)
dr = B3('drape', (11.0, 0.04, 9.0), T(0, 0.3, 0), DRAPE, bevel=0)
boolean(dr, B3('hole', (6.4, 1.0, 5.8), T(0, 0.3, -0.2), DRAPE, bevel=0), 'DIFFERENCE')
field.append(dr)
STEEL = mat('steel', (0.66, 0.68, 0.72), metallic=1, rough=0.22)
DARK = mat('dark', hexc('#2B2F3A'), metallic=0.3, rough=0.5)
# banh ngực: hai lưỡi cong ôm mép xương ức, thanh răng ở phía đầu, tay quay
for sx in (-1, 1):
    field += [B3('blade', (0.08, 0.7, 1.4), T(sx * 2.62, 0.02, -0.8), STEEL, bevel=0.02), B3('arm', (0.5, 0.08, 0.16), T(sx * 2.8, 0.38, -2.35), STEEL, bevel=0.02),
              B3('up', (0.08, 0.5, 0.16), T(sx * 2.62, 0.2, -1.6), STEEL, bevel=0.02), B3('lnk', (0.08, 0.08, 0.9), T(sx * 2.62, 0.4, -1.95), STEEL, bevel=0.02)]
field.append(B3('rack', (6.6, 0.1, 0.22), T(0, 0.42, -2.45), STEEL, bevel=0.02))
for i in range(30):
    field.append(B3('tooth', (0.06, 0.06, 0.05), T(-3.0 + i * 0.2, 0.5, -2.36), STEEL, bevel=0.01))
field += [cyl('crank', 0.09, 0.3, T(2.95, 0.55, -2.45), STEEL), B3('handle', (0.08, 0.08, 0.45), T(2.95, 0.72, -2.25), DARK, bevel=0.02)]
# khay Mayo bên phải (dụng cụ nằm ở y = 0,36, z = −1,2 / −0,4 / 0,4 / 1,2)
CLOTH = mat('cloth', hexc('#1E5A55'), rough=0.95)
field += [B3('mayo', (1.5, 0.05, 3.6), T(3.9, 0.3, 0.2), STEEL, bevel=0.02), B3('mcl', (1.4, 0.012, 3.5), T(3.9, 0.33, 0.2), CLOTH, bevel=0.004)]
for sx in (-1, 1):
    field += [B3('mr', (0.05, 0.1, 3.6), T(3.9 + sx * 0.73, 0.34, 0.2), STEEL, bevel=0.015)]
# chỉ treo màng ngoài tim (stay sutures): mép màng ngoài tim đã mở được khâu treo lên khăn mổ, tạo "nôi" nâng tim lên trường mổ;
# chỉ prolene xanh, đầu ngoài kẹp bằng kẹp muỗi cán bọc cao su đặt trên khăn
PROLENE = mat('prolene', hexc('#2B5BB0'), rough=0.35)
for k, (ang, rr) in enumerate([(2.4, 2.3), (2.9, 2.3), (-2.6, 2.25), (0.75, 2.3), (0.25, 2.3), (-0.55, 2.25)]):  # ba mũi mỗi bên dọc mép màng
    cx, cz = math.cos(ang) * rr, -0.2 - math.sin(ang) * rr * 1.25
    ox, oz = math.cos(ang) * 3.08, -0.2 - math.sin(ang) * 3.3  # đầu ngoài nằm trên da / mép khăn, không lấn khay Mayo (x ≥ 3,15)
    field.append(tube('stay%d' % k, [T(cx, -0.05, cz), T((cx * 2 + ox) / 3, 0.34, (cz * 2 + oz) / 3), T(ox, 0.33, oz)], 0.008, PROLENE))
    field += [B3('mosq%d' % k, (0.36, 0.035, 0.05), T(ox + math.cos(ang) * 0.18, 0.34, oz - math.sin(ang) * 0.18), STEEL, bevel=0.01),
              cyl('ring%d' % k, 0.05, 0.02, T(ox + math.cos(ang) * 0.4, 0.34, oz - math.sin(ang) * 0.4), STEEL)]
piece('SH_field', field, (0, 0, 0))

# phổi THẬT (thùy, rãnh liên thùy, đốm than — dùng chung `organs.lungs` với bài mổ người), mỗi lá một nút `SHL_lung*` để cảnh cho thở theo máy:
# nằm ngửa (đỉnh phổi về phía đầu −z, mặt trước lên), nằm dưới mép xương ức; trường mổ chỉ thấy bờ trước–trong của phổi phồng lên mỗi nhịp thở.
# Gốc nút ở rốn phổi (bờ sau–trong) để cảnh phóng quanh đó: phổi nở ra phía trước và vào giữa như thật.
from organs import lungs as real_lungs  # noqa: E402
for lg, name, sx in zip(real_lungs(s=1.0, gap=0.2, rings=False), ('SHL_lungR', 'SHL_lungL'), (-1, 1)):
    bpy.context.view_layer.objects.active = lg
    bpy.ops.object.select_all(action='DESELECT')
    lg.select_set(True)
    # phổi dựng sẵn có góc xoay / tỉ lệ trên đối tượng: áp vào lưới trước (lưới đứng thẳng, đỉnh phổi lên trên) rồi mới đặt nằm ngửa
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
    lg.location = (0, 0, 0)
    lg.rotation_euler = (math.radians(-90), 0, 0)
    lg.scale = (2.0, 1.25, 2.8)  # theo trục CỤC BỘ trước khi xoay: x ngang, y dày trước–sau, z dài đỉnh–đáy
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    lg.location = T(sx * 2.72, -0.32, -0.35)
    d = lg.modifiers.new('dec', 'DECIMATE')
    d.ratio = 0.4  # 34 nghìn → ~13 nghìn đỉnh mỗi lá: giữ bờ cong mịn ở khoảng nhìn trường mổ
    piece(name, [lg], (sx * 2.72, -0.75, -0.35))

# ================================================================== dụng cụ (mũi ở gốc, thân dọc +x, nằm ngang)
EDGE = mat('edge', (0.9, 0.92, 0.95), metallic=1, rough=0.08)
GOLD = mat('gold', hexc('#C9A23A'), metallic=1, rough=0.3)


def scissor_frame(jaw_len, ring_x, gold=False):
    """khung kiểu kéo của kẹp cầm máu / kìm kẹp kim: hai hàm, khớp hộp, hai cán và khuyên ngón, khóa răng cưa giữa hai cán"""
    o = []
    for sz in (-1, 1):
        o.append(tube('jaw', [T(0.0, 0.03, sz * 0.006), T(jaw_len * 0.5, 0.03, sz * 0.012 + 0.01), T(jaw_len, 0.03, sz * 0.02)], 0.018, STEEL))
        o.append(tube('sh', [T(jaw_len, 0.03, sz * 0.02), T(ring_x * 0.6, 0.03, sz * 0.06), T(ring_x - 0.08, 0.03, sz * 0.12)], 0.02, STEEL))
        bpy.ops.mesh.primitive_torus_add(major_radius=0.085, minor_radius=0.022, location=T(ring_x, 0.03, sz * 0.15))
        o.append(finish(bpy.context.object, GOLD if gold else STEEL))
        o.append(B3('rat', (0.12, 0.03, 0.03), T(ring_x - 0.16, 0.03, sz * 0.09), STEEL, bevel=0.008))
    o.append(B3('lock', (0.08, 0.05, 0.07), T(jaw_len, 0.03, 0), STEEL, bevel=0.012))
    o.append(cyl('pin', 0.02, 0.07, T(jaw_len, 0.03, 0), EDGE))
    for i in range(6):
        o.append(B3('ser', (0.008, 0.02, 0.03), T(0.02 + i * jaw_len * 0.12, 0.05, 0), EDGE, bevel=0.002))
    return o


piece('TOOL_clamp', scissor_frame(0.38, 1.0), (0, 0, 0))
nh = scissor_frame(0.22, 0.95, gold=True)
# kim cong 3/8 vòng kẹp ở mũi kìm + sợi chỉ tím
arc = [T(0.0 + 0.09 * math.cos(a), 0.03, -0.09 * math.sin(a) - 0.0) for a in [math.pi * (0.1 + 0.1 * i) for i in range(9)]]
nh.append(tube('needle', arc, 0.008, EDGE))
nh.append(tube('thread', [arc[-1], T(-0.1, 0.03, 0.15), T(0.1, 0.03, 0.35), T(0.5, 0.03, 0.4)], 0.005, mat('suture', hexc('#5B3A9E'), rough=0.6)))
piece('TOOL_needle', nh, (0, 0, 0))
# ống hút Yankauer: đầu tù có lỗ, thân cong, tay cầm có gờ, ống nhựa trong nối ra
YK = mat('yank', (0.85, 0.92, 0.95), rough=0.08, alpha=0.55)
sk = [ball('tip', 0.04, T(0.0, 0.035, 0), YK), tube('stem', [T(0.02, 0.035, 0), T(0.25, 0.06, 0), T(0.5, 0.12, 0), T(0.75, 0.14, 0)], 0.024, YK),
      tube('grip', [T(0.75, 0.14, 0), T(1.05, 0.14, 0)], 0.04, YK)]
for i in range(6):
    bpy.ops.mesh.primitive_torus_add(major_radius=0.042, minor_radius=0.008, location=T(0.8 + i * 0.045, 0.14, 0), rotation=(0, math.radians(90), 0))
    sk.append(finish(bpy.context.object, YK))
sk.append(tube('hose', [T(1.05, 0.14, 0), T(1.3, 0.1, 0.05), T(1.6, 0.04, 0.2)], 0.03, mat('hose', (0.9, 0.95, 0.97), rough=0.15, alpha=0.4)))
piece('TOOL_suction', sk, (0, 0, 0))
# bút đốt điện: lưỡi dẹt thép ở mũi, thân nhựa vàng hai nút bấm (cắt / đốt), dây cáp xám
PEN = mat('pen', hexc('#E8C64A'), rough=0.45)
cp = [B3('blade', (0.16, 0.01, 0.03), T(0.08, 0.04, 0), EDGE, bevel=0.004), cyl('col', 0.018, 0.06, T(0.18, 0.04, 0), STEEL, rot=(0, math.radians(90), 0)),
      tube('body', [T(0.2, 0.04, 0), T(0.45, 0.06, 0), T(0.8, 0.08, 0)], 0.034, PEN),
      B3('btnY', (0.06, 0.02, 0.03), T(0.42, 0.1, 0), mat('btnY', hexc('#F2E04A'), rough=0.3), bevel=0.008),
      B3('btnB', (0.06, 0.02, 0.03), T(0.52, 0.105, 0), mat('btnB', hexc('#2F6FD0'), rough=0.3), bevel=0.008),
      tube('cable', [T(0.8, 0.08, 0), T(1.05, 0.06, 0.06), T(1.4, 0.03, 0.2)], 0.014, mat('cable', hexc('#8A8F98'), rough=0.6))]
piece('TOOL_cautery', cp, (0, 0, 0))
# banh tay (kiểu hai đầu): bản thép dẹt, đầu móc gập vuông xuống để móc mép vết mổ, cán có lỗ
rt = [B3('hook', (0.05, 0.16, 0.16), T(0.0, -0.06, 0), STEEL, bevel=0.01), B3('shaft', (0.9, 0.025, 0.14), T(0.45, 0.02, 0), STEEL, bevel=0.01),
      B3('hook2', (0.05, 0.12, 0.12), T(0.9, -0.04, 0), STEEL, bevel=0.01)]
for i in range(3):
    rt.append(cyl('hole', 0.025, 0.03, T(0.3 + i * 0.15, 0.03, 0), DARK))
piece('TOOL_retractor', rt, (0, 0, 0))

bpy.data.objects.remove(probe, do_unlink=True)
for o in list(bpy.data.objects):
    if not o.name.startswith(('SH_', 'SHL_', 'TOOL_')):
        bpy.data.objects.remove(o, do_unlink=True)
print('NODES', sorted(o.name for o in bpy.data.objects))
export_glb('surgery-heart.glb')
if PREVIEW:
    # ảnh thử: tim xoay nằm ngửa như trong cảnh, nâng lên trên mặt bàn xem thử
    pv = bpy.data.objects.new('pv', None)
    bpy.context.scene.collection.objects.link(pv)
    for o in bpy.data.objects:
        if o.name.startswith('SH_') and o.name not in ('SH_field', 'SH_peri'):
            o.parent = pv
        elif o.name == 'SH_peri':
            o.hide_render = True
    pv.rotation_euler.x = math.radians(-90)
    lift = bpy.data.objects.new('lift', None)
    bpy.context.scene.collection.objects.link(lift)
    for o in bpy.data.objects:
        if o.parent is None and o not in (lift,):
            o.parent = lift
    lift.location.z = 1.2
    for i, n in enumerate(('TOOL_clamp', 'TOOL_suction', 'TOOL_needle')):
        bpy.data.objects[n].location = T(3.5, 0.36, -0.8 + i * 0.8)
    preview((0.5, -6.5, 8.0), (0.3, 0.0, 1.0), lens=36)
