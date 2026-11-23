"""
Giải phẫu vùng gan mật và dụng cụ nội soi cho "Trạm tập nội soi" ở /lab (`HandsLaparo3D.tsx`). Toạ độ cảnh: mặt làm việc quanh y = 0, ống nằm dọc x ở z = 0.

Nút:
  `LA_liver`, `LA_gallbladder`, `LA_cbd`, `LA_artery`, `LA_fat`, `LA_colon`, `LA_duodenum`, `LA_omentum`, `LA_ligament`
  `LT_neck`            đầu thân dụng cụ (gốc ở khớp hàm, thân hướng +y)
  `LT_maryland_a|b`, `LT_clip_a|b`, `LT_scissors_a|b`, `LT_hook_a|b` (móc đốt chữ L; b là chốt nhỏ)  hai hàm của từng dụng cụ, gốc ở khớp, mũi hướng −y
  `LT_clipmark`        clip titan hình chữ U ôm ống (trục ống = x)

Chạy:
  blender --background --python tools/lab-models/lap_anatomy.py -- apps/teacher-board/public/models
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F401,F403
from organic import *  # noqa: E402,F401,F403

LIVER = tissue('la_liver', '#6B1C24', rough=0.26, coat=0.95)
GB = tissue('la_gallbladder', '#5E7F4E', rough=0.22, coat=1.0)
BILE = tissue('la_bile', '#CDBB72', rough=0.25, coat=0.9)
ART = tissue('la_artery', '#B63238', rough=0.26, coat=0.9)
FAT = tissue('la_fat', '#DCBB68', rough=0.3, coat=0.85)
COLON = tissue('la_bowel_colon', '#CC8D78', rough=0.26, coat=0.95)
DUO = tissue('la_bowel_duo', '#C97A70', rough=0.26, coat=0.95)
OMENT = tissue('la_fat_omentum', '#EBCB74', rough=0.3, coat=0.85)
LIG = tissue('la_perit_lig', '#D9A99A', rough=0.28, coat=0.8)


def lean(o, ratio):
    """bớt tam giác: chi tiết nhỏ của mô đã có trong vân shader, card tích hợp của lớp học cần lưới nhẹ"""
    o.modifiers.new('dec', 'DECIMATE').ratio = ratio
    return o


# gan: thùy phải lớn bên trái màn hình, thùy trái nhỏ, bờ dưới mỏng phủ qua vùng cấm
liver = blob('LA_liver', [
    ('E', (-2.3, 0.75, -3.5), (4.2, 1.1, 1.95)), ('E', (2.4, 0.62, -3.7), (2.9, 0.82, 1.55)), ('E', (-0.1, 0.42, -2.55), (2.3, 0.62, 0.95)),
    ('E', (-3.6, 0.5, -2.1), (1.9, 0.55, 0.85)), ('E', (3.7, 0.42, -2.65), (1.5, 0.44, 0.7)),
], LIVER, res=0.075)
roughen(liver, 0.035, 0.7)
piece('LA_liver', [lean(liver, 0.3)], (0, 0.5, -3))

# túi mật: đáy phình dưới bờ gan, cổ thu nhỏ về phía ống túi mật (x ≈ −2,4)
gb = blob('LA_gallbladder', [('C', (-5.0, 0.62, -0.72), (-3.9, 0.6, -0.38), 0.62), ('C', (-3.9, 0.6, -0.38), (-2.95, 0.5, -0.1), 0.42), ('C', (-2.95, 0.5, -0.1), (-2.38, 0.43, 0.0), 0.16)], GB, res=0.035)
roughen(gb, 0.012, 0.3)
piece('LA_gallbladder', [lean(gb, 0.3)], (-3.8, 0.55, -0.3))

cbd = tube('cbd', [T(2.62, 0.3, -2.1), T(2.52, 0.34, -1.0), T(2.44, 0.4, 0.0), T(2.55, 0.32, 1.1), T(2.8, 0.2, 2.2)], 0.125, BILE)
piece('LA_cbd', [cbd], (2.5, 0.3, 0))
art = [tube('ca', [T(3.3, 0.22, -1.2), T(2.1, 0.32, -0.62), T(0.6, 0.38, -0.5), T(-1.0, 0.4, -0.48), T(-2.3, 0.46, -0.42), T(-3.3, 0.62, -0.5)], 0.055, ART),
       tube('cb', [T(-1.0, 0.4, -0.48), T(-1.9, 0.48, -0.75), T(-2.9, 0.72, -0.95)], 0.026, ART),
       tube('hep', [T(3.25, 0.18, -2.1), T(3.3, 0.22, -1.2), T(3.45, 0.14, 0.1), T(3.6, 0.08, 1.4)], 0.095, ART)]
piece('LA_artery', art, (0, 0.4, -0.5))

# mỡ quanh tam giác gan mật: các tiểu thùy nhỏ
rng = np.random.default_rng(11)
items = []
for _ in range(105):
    x = float(rng.uniform(-3.0, 3.2))
    z = float(rng.choice([-1, 1]) * rng.uniform(0.72, 1.4))
    r = float(rng.uniform(0.08, 0.2))
    items.append(('E', (x, float(rng.uniform(-0.05, 0.1)), z - 0.15), (r * float(rng.uniform(1.0, 1.7)), r * 0.62, r)))
fat = blob('LA_fat', items, FAT, res=0.03)
piece('LA_fat', [lean(fat, 0.25)], (0, 0.1, 0))

# đại tràng ngang có túi phình và dải cơ dọc
colon = []
for i in range(17):
    x = -8.0 + i * 0.98
    z = 2.75 + 0.3 * math.sin(i * 0.8)
    colon.append(('E', (x, 0.28, z), (0.68, 0.72, 0.9)))
col = blob('LA_colon', colon, COLON, res=0.06)
roughen(col, 0.016, 0.3)
tenia = tube('tenia', [T(-8.0 + i * 1.6, 1.0, 2.75 + 0.3 * math.sin(i * 1.3)) for i in range(11)], 0.075, tissue('la_bowel_tenia', '#E6BE9A', rough=0.4, coat=0.5))
piece('LA_colon', [lean(col, 0.3), tenia], (0, 0.3, 2.8))
du = blob('LA_duodenum', [('C', (3.9, 0.15, -1.3), (4.5, 0.15, 0.3), 0.62), ('C', (4.5, 0.15, 0.3), (5.6, 0.1, 1.2), 0.68), ('C', (3.9, 0.15, -1.3), (5.8, 0.15, -1.7), 0.75)], DUO, res=0.05)
roughen(du, 0.014, 0.3)
piece('LA_duodenum', [lean(du, 0.3)], (4.6, 0.1, 0))

# mạc nối lớn: tấm mỡ gợn phủ phía trước
me = bpy.data.meshes.new('oment')
bm = bmesh.new()
NX, NZ = 76, 24
rows = []
for j in range(NZ + 1):
    row = []
    for i in range(NX + 1):
        x = -9.5 + 19 * i / NX
        z = 3.2 + 3.4 * j / NZ
        q = (x, 0.0, z)
        y = 0.4 + 0.2 * fbm(q, 1.8) + 0.14 * fbm(q, 5.0) + 0.05 * math.sin(x * 2.1 + z)
        row.append(bm.verts.new(T(x, y, z)))
    rows.append(row)
for j in range(NZ):
    for i in range(NX):
        bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]))
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.to_mesh(me)
bm.free()
om = bpy.data.objects.new('om', me)
bpy.context.scene.collection.objects.link(om)
finish(om, OMENT)
piece('LA_omentum', [om], (0, 0.4, 4.5))

# dây chằng liềm: dải mỏng từ gan lên thành bụng
lg = polyfin('lg', [(0.5, 0.95, -3.4), (1.0, 3.0, -4.3), (0.8, 5.2, -5.6), (0.1, 5.2, -5.7), (0.05, 2.8, -4.5), (-0.1, 1.1, -3.0)], LIG, thick=0.05)
piece('LA_ligament', [lg], (0.4, 2, -4.4))

# ================================================================== dụng cụ
ST = mat('lt_steel', (0.74, 0.76, 0.79), metallic=1, rough=0.2)
BR = mat('lt_brushed', (0.52, 0.54, 0.57), metallic=1, rough=0.34)
EDGE = mat('lt_edge', (0.93, 0.94, 0.96), metallic=1, rough=0.07)
INS = mat('lt_insulation', hexc('#111316'), rough=0.3)
TI = mat('lt_titanium', (0.72, 0.71, 0.68), metallic=1, rough=0.26)


def B3(name, size, loc, material, bevel=0.003):
    return box(name, (size[0], size[2], size[1]), T(*loc), material, bevel=bevel)


neck = [cyl('n1', 0.06, 0.2, T(0, 0.2, 0), INS, bevel=0.006), cyl('n2', 0.056, 0.05, T(0, 0.085, 0), BR, bevel=0.004),
        cyl('n3', 0.05, 0.05, T(0, 0.04, 0), ST, bevel=0.005), B3('clevis1', (0.018, 0.075, 0.09), T(0.034, 0.0, 0), ST), B3('clevis2', (0.018, 0.075, 0.09), T(-0.034, 0.0, 0), ST),
        cyl('pin', 0.016, 0.092, T(0, 0.006, 0), EDGE, rot=(0, math.radians(90), 0), bevel=0)]
piece('LT_neck', neck, (0, 0, 0))


def maryland(sx):
    c = [T(sx * 0.012, -0.002, 0), T(sx * 0.012, -0.08, 0.006), T(sx * 0.011, -0.155, 0.03), T(sx * 0.008, -0.215, 0.07)]
    t = tube('m', c, 0.021, BR)
    o = [t]
    for i in range(13):
        u = 0.018 + i * 0.016
        o.append(B3('ser', (0.008, 0.0055, 0.03), (sx * 0.0018, -u, 0.0012 * (i ** 1.7) * 0.42), EDGE, bevel=0.0007))
    return o


def clip_jaw(sx):
    o = [B3('c', (0.022, 0.205, 0.04), (sx * 0.024, -0.105, 0), BR, bevel=0.006), B3('g', (0.006, 0.17, 0.012), (sx * 0.0115, -0.115, 0), INS, bevel=0.001)]
    return o


def scissor(sx):
    pts = [(sx * 0.006, 0.008, -0.022), (sx * 0.006, -0.1, -0.012), (sx * 0.006, -0.185, 0.02), (sx * 0.006, -0.235, 0.062), (sx * 0.006, -0.17, 0.05), (sx * 0.006, -0.085, 0.03), (sx * 0.006, 0.008, 0.024)]
    return [polyfin('s', pts, EDGE, thick=0.012)]


def hook(sx):
    if sx < 0:
        return [cyl('hp', 0.012, 0.03, T(0, -0.015, 0), BR, bevel=0)]
    return [tube('hs', [T(0, 0.02, 0), T(0, -0.09, 0), T(0, -0.17, 0)], 0.015, BR), tube('hl', [T(0, -0.17, 0), T(0, -0.205, 0.012), T(0, -0.215, 0.05), T(0, -0.2, 0.078)], 0.01, EDGE)]


for nm, fn in (('maryland', maryland), ('clip', clip_jaw), ('scissors', scissor), ('hook', hook)):
    piece(f'LT_{nm}_a', fn(1), (0, 0, 0))
    piece(f'LT_{nm}_b', fn(-1), (0, 0, 0))
piece('LT_clipmark', [tube('u', [T(0, 0.135, 0.15), T(0, 0.155, 0.02), T(0, 0.105, -0.13), T(0, -0.105, -0.13), T(0, -0.155, 0.02), T(0, -0.135, 0.15)], 0.022, TI)], (0, 0, 0))

for o in list(bpy.data.objects):
    if not o.name.startswith(('LA_', 'LT_')):
        bpy.data.objects.remove(o, do_unlink=True)
print('NODES', sorted(o.name for o in bpy.data.objects))
export_glb('lap-anatomy.glb')
