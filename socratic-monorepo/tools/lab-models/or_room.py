"""
Phòng mổ quanh trường mổ của bài "Phẫu thuật tim" ở /lab (`HandsSurgery3D.tsx`). Cùng hệ toạ độ cảnh: tim ở gốc, 1 đơn vị ≈ 5,5 cm, đầu người bệnh về −z.
Mặt bàn mổ ngay dưới khăn (y ≈ 0), sàn ở y = −16, trần ở y = 34.

Nút:
  `OR_shell`      sàn, tường, trần, tấm đèn, cửa, tủ thép, hộp đọc phim
  `OR_table`      bàn mổ: chân trụ, đế, mặt bàn, thanh ray
  `OR_drape`      khăn phủ người bệnh (có lỗ ở trường mổ), khung che đầu
  `OR_lamps`      hai đèn mổ treo trần
  `OR_anesthesia` máy gây mê, bóng thở, bình bốc hơi, dây thở, khung monitor
  `OR_iv`         cột truyền, túi dịch, dây truyền
  `OR_carts`      bàn dụng cụ phụ, chân khay Mayo, máy đốt điện, bình hút

Chạy:
  blender --background --python tools/lab-models/or_room.py -- apps/teacher-board/public/models
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F401,F403

FLOOR_Y = -16.0
CEIL_Y = 34.0
XW = 46.0
ZB = -46.0
ZF = 60.0

WALL = mat('or_wall', hexc('#CFE0DA'), rough=0.55)
WAIN = mat('or_wain', hexc('#9DBDB4'), rough=0.4)
FLOORM = mat('or_floor', hexc('#8C9A98'), rough=0.28)
JOINT = mat('or_joint', hexc('#6F7D7B'), rough=0.6)
CEIL = mat('or_ceil', hexc('#E8ECEA'), rough=0.8)
PANEL_L = mat('or_light', hexc('#FFFFFF'), emit=2.2)
SS = mat('or_ss', (0.66, 0.68, 0.7), metallic=1, rough=0.3)
SSD = mat('or_ssd', (0.42, 0.44, 0.47), metallic=1, rough=0.4)
ENAMEL = mat('or_enamel', hexc('#E9ECEC'), rough=0.42)
GREY = mat('or_grey', hexc('#4A5158'), rough=0.5)
BLACK = mat('or_black', hexc('#14171A'), rough=0.45)
PAD = mat('or_pad', hexc('#1C2226'), rough=0.7)
DRAPE = mat('or_drape', hexc('#2F6F6A'), rough=0.95)
LENS = mat('or_lens', hexc('#FFF8EA'), emit=6.0)
HOSE = mat('or_hose', hexc('#6C9FC2'), rough=0.35)
BELLOW = mat('or_bellow', hexc('#CFD8DC'), rough=0.3, alpha=0.6)
SALINE = mat('or_saline', (0.85, 0.94, 1.0), rough=0.1, alpha=0.45)
BLOODC = mat('or_canister', hexc('#7A0F18'), rough=0.2, alpha=0.8)
AMBER = mat('or_amber', hexc('#E7A72E'), emit=1.2)
GREEN = mat('or_green', hexc('#39E27A'), emit=1.6)
VIEW = mat('or_viewer', hexc('#DDEBF2'), emit=1.4)
XRAY = mat('or_xray', hexc('#20272C'), rough=0.4)


def B(name, size, loc, material, bevel=0.05):
    """hộp theo trục three.js: rộng x, cao y, sâu z"""
    return box(name, (size[0], size[2], size[1]), T(*loc), material, bevel=bevel)


def V(name, r, y0, y1, x, z, material, r2=None):
    """trụ đứng từ y0 tới y1"""
    return cyl(name, r, y1 - y0, T(x, (y0 + y1) / 2, z), material, r2=r2, bevel=0)


# ================================================================== phòng
W = XW * 2
D = ZF - ZB
ZC = (ZF + ZB) / 2
H = CEIL_Y - FLOOR_Y
YC = (CEIL_Y + FLOOR_Y) / 2
shell = [B('floor', (W, 0.4, D), (0, FLOOR_Y - 0.2, ZC), FLOORM, 0), B('ceil', (W, 0.4, D), (0, CEIL_Y + 0.2, ZC), CEIL, 0)]
for sx in (-1, 1):
    shell += [B('wx', (0.4, H, D), (sx * (XW + 0.2), YC, ZC), WALL, 0), B('wnx', (0.25, 16, D), (sx * (XW - 0.12), FLOOR_Y + 8, ZC), WAIN, 0.02)]
for z, sz in ((ZB, -1), (ZF, 1)):
    shell += [B('wz', (W, H, 0.4), (0, YC, z + sz * 0.2), WALL, 0), B('wnz', (W, 16, 0.25), (0, FLOOR_Y + 8, z - sz * 0.12), WAIN, 0.02)]
# mạch sàn đúc liền
for i in range(-5, 6):
    shell.append(B('jx', (0.07, 0.02, D), (i * 8.5, FLOOR_Y + 0.01, ZC), JOINT, 0))
for i in range(-6, 7):
    shell.append(B('jz', (W, 0.02, 0.07), (0, FLOOR_Y + 0.01, ZC + i * 8.5), JOINT, 0))
# trần lọc khí laminar và tấm đèn
shell.append(B('laminar', (34, 0.5, 44), (0, CEIL_Y - 0.25, 4), ENAMEL, 0.04))
for sx in (-1, 1):
    for z in (-26, -2, 22, 40):
        shell.append(B('lp', (14, 0.14, 7), (sx * 28, CEIL_Y - 0.08, z), PANEL_L, 0))
    for z in (-12, 4, 20):
        shell.append(B('lp2', (5, 0.14, 12), (sx * 11, CEIL_Y - 0.56, z), PANEL_L, 0))
# cửa trượt có ô kính ở tường sau
shell += [B('door', (22, 30, 0.5), (24, FLOOR_Y + 15, ZB + 0.4), SSD, 0.08), B('dwin', (6, 7, 0.1), (24, FLOOR_Y + 21, ZB + 0.72), XRAY, 0), B('dbar', (0.5, 8, 0.5), (15.5, FLOOR_Y + 15, ZB + 1), SS, 0.08)]
# tủ thép âm tường
for i in range(5):
    x = -38 + i * 9.2
    shell += [B('cab', (9, 22, 2.4), (x, FLOOR_Y + 19, ZB + 1.3), SS, 0.06), B('cabh', (0.3, 3, 0.3), (x + 3.6, FLOOR_Y + 15, ZB + 2.65), SSD, 0.04)]
# hộp đọc phim ở tường trái
shell += [B('vb', (0.5, 12, 24), (-XW + 0.45, 12, 8), GREY, 0.06), B('vs', (0.1, 10.6, 22.6), (-XW + 0.75, 12, 8), VIEW, 0)]
for z in (0, 8, 16):
    shell.append(B('film', (0.05, 9, 6.4), (-XW + 0.84, 12, z), XRAY, 0))
join('OR_shell', shell)

# ================================================================== bàn mổ (chân đặt lệch về phía đầu)
tb = [B('base', (15, 1.3, 24), (0, FLOOR_Y + 0.65, 4), ENAMEL, 0.3), V('col', 3.0, FLOOR_Y + 1.2, -3.4, 0, 4, SS), V('collar', 3.5, -4.3, -3.3, 0, 4, GREY),
      # mặt đệm thấp hơn đáy khoang ngực (y = −1,05) để không xuyên vào trường mổ
      B('top', (11.5, 0.8, 38), (0, -2.95, 9), GREY, 0.12), B('mat', (11, 1.1, 37.4), (0, -2.05, 9), PAD, 0.3)]
for sx in (-1, 1):
    tb.append(B('rail', (0.22, 0.5, 36), (sx * 6.05, -3.1, 9), SS, 0.06))
join('OR_table', tb)


# ================================================================== khăn phủ: lưới cong theo thân người, rủ hai bên bàn, chừa lỗ trường mổ
def drape_y(x, z):
    ax = abs(x)
    flat = 0.2
    # thân và chân nhô dưới khăn
    body = 0.0
    if z > 4.6:
        k = min(1.0, (z - 4.6) / 4.0)
        body = 1.5 * k * max(0.0, 1 - (ax / 6.2) ** 2)
        if z > 16:
            body = 1.7 * k * max(0.0, 1 - ((ax - 2.3) / 2.6) ** 2) ** 0.7
    if ax <= 6.3:
        return flat + body
    # rủ xuống mép bàn, có nếp vải
    t = (ax - 6.3) / 2.2
    return flat - 10.5 * min(1.0, t) ** 1.3 + 0.16 * min(1.0, t) * math.sin(z * 1.35 + ax)


me = bpy.data.meshes.new('drape')
bm = bmesh.new()
NX, NZ = 88, 120
X0, X1, Z0, Z1 = -8.5, 8.5, -7.0, 28.5
grid = {}
for i in range(NX + 1):
    for j in range(NZ + 1):
        x = X0 + (X1 - X0) * i / NX
        z = Z0 + (Z1 - Z0) * j / NZ
        off = 0.32 * max(0.0, (abs(x) - 6.3) / 2.2) * math.sin(z * 1.35)
        grid[i, j] = bm.verts.new(T(x + (1 if x > 0 else -1) * off * 0.2, drape_y(x, z), z))
for i in range(NX):
    for j in range(NZ):
        cx = X0 + (X1 - X0) * (i + 0.5) / NX
        cz = Z0 + (Z1 - Z0) * (j + 0.5) / NZ
        if abs(cx) < 5.25 and abs(cz) < 4.25:
            continue
        bm.faces.new((grid[i, j], grid[i + 1, j], grid[i + 1, j + 1], grid[i, j + 1]))
for v in [v for v in bm.verts if not v.link_faces]:
    bm.verts.remove(v)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.to_mesh(me)
bm.free()
cloth = bpy.data.objects.new('cloth', me)
bpy.context.scene.collection.objects.link(cloth)
finish(cloth, DRAPE)
dp = [cloth]
# khung che đầu: thanh cong và tấm khăn dựng ngăn trường mổ với phía gây mê
pts = [T(-7.2, -2, -7.2), T(-6.6, 5, -7.2), T(-3, 8.3, -7.2), T(3, 8.3, -7.2), T(6.6, 5, -7.2), T(7.2, -2, -7.2)]
dp.append(tube('arch', pts, 0.14, SS))
sc = bpy.data.meshes.new('screen')
bm = bmesh.new()
rows = []
for j in range(13):
    row = []
    for i in range(41):
        u = i / 40
        x = -7.0 + 14 * u
        top = 8.1 - 3.1 * ((2 * u - 1) ** 4)
        y = 0.2 + (top - 0.2) * j / 12
        row.append(bm.verts.new(T(x, y, -7.15 + 0.1 * math.sin(u * 22) * (1 - j / 12))))
    rows.append(row)
for j in range(12):
    for i in range(40):
        bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]))
bm.to_mesh(sc)
bm.free()
sobj = bpy.data.objects.new('hs', sc)
bpy.context.scene.collection.objects.link(sobj)
finish(sobj, DRAPE)
dp.append(sobj)
join('OR_drape', dp)


# ================================================================== đèn mổ
def lamp(hx, hy, hz, mx, mz):
    o = [V('mount', 1.0, CEIL_Y - 2.4, CEIL_Y - 0.4, mx, mz, ENAMEL), tube('arm', [T(mx, CEIL_Y - 2.3, mz), T((mx + hx) / 2, CEIL_Y - 3.2, (mz + hz) / 2), T(hx, hy + 4.5, hz)], 0.42, ENAMEL),
         tube('yoke', [T(hx, hy + 4.5, hz), T(hx, hy + 2.0, hz)], 0.3, SS), lathe('dome', [(0.2, 2.0), (2.2, 1.85), (4.1, 1.05), (5.0, 0.15), (5.05, 0.0), (4.7, -0.08)], T(hx, hy, hz), ENAMEL, steps=48)]
    o.append(V('handle', 0.42, hy - 1.7, hy, hx, hz, GREY))
    for r, n in ((1.55, 6), (3.2, 12)):
        for i in range(n):
            a = 2 * math.pi * i / n + r
            o.append(cyl('led', 0.62, 0.08, T(hx + r * math.cos(a), hy - 0.1, hz + r * math.sin(a)), LENS, bevel=0, seg=18))
    return o


join('OR_lamps', lamp(-8.5, 17.5, 3.5, -3, -8) + lamp(10.5, 20, -3.5, 3, -8))

# ================================================================== máy gây mê phía đầu người bệnh, bên trái
AX, AZ = -15.5, -20.0
an = [B('abase', (11, 1.0, 10), (AX, FLOOR_Y + 1.5, AZ), GREY, 0.2), B('abody', (10, 14, 8.6), (AX, FLOOR_Y + 9, AZ), ENAMEL, 0.25), B('adesk', (11.4, 0.5, 10.2), (AX, FLOOR_Y + 16.2, AZ), SS, 0.1),
      B('atop', (10, 8, 6), (AX, FLOOR_Y + 20.5, AZ - 1.8), ENAMEL, 0.22), B('ashelf', (11, 0.4, 7), (AX, FLOOR_Y + 24.8, AZ - 1.6), SS, 0.08)]
for sx in (-1, 1):
    for sz in (-1, 1):
        an.append(V('wheel', 0.75, FLOOR_Y, FLOOR_Y + 1.1, AX + sx * 4.6, AZ + sz * 4.0, BLACK))
for i in range(3):
    x = AX - 3 + i * 3
    an += [B('drw', (2.6, 3.1, 0.2), (x, FLOOR_Y + 5 + 0, AZ + 4.35), SS, 0.05), B('drh', (1.2, 0.2, 0.3), (x, FLOOR_Y + 5.9, AZ + 4.5), SSD, 0.03)]
    an += [B('vap', (2.2, 4.2, 2.2), (x, FLOOR_Y + 19, AZ + 1.4), SS, 0.15), V('vapd', 0.75, FLOOR_Y + 21.1, FLOOR_Y + 21.7, x, AZ + 1.4, (GREEN if i == 0 else AMBER))]
# bóng thở trong ống kính
an += [V('bcase', 1.6, FLOOR_Y + 9.5, FLOOR_Y + 15.8, AX + 3.1, AZ + 4.9, BELLOW), V('bbel', 1.2, FLOOR_Y + 9.8, FLOOR_Y + 14.4, AX + 3.1, AZ + 4.9, HOSE)]
# khung monitor treo trên máy (màn hình do cảnh vẽ)
an += [V('mpole', 0.35, FLOOR_Y + 24.9, FLOOR_Y + 30, AX, AZ - 1.8, SSD), B('mframe', (14, 9.6, 0.8), (AX, FLOOR_Y + 33.6, AZ - 1.2), BLACK, 0.18)]
# dây thở chữ Y về phía đầu người bệnh
an += [tube('hin', [T(AX + 4, FLOOR_Y + 16.5, AZ + 3), T(AX + 8, FLOOR_Y + 13, AZ + 7), T(AX + 12, -2.5, AZ + 10), T(-1.5, 0.6, -9.4), T(0, 0.9, -8.2)], 0.42, HOSE),
       tube('hex', [T(AX + 4.6, FLOOR_Y + 16.5, AZ + 2.2), T(AX + 9, FLOOR_Y + 12, AZ + 6), T(AX + 13, -3, AZ + 9), T(-0.7, 0.4, -9.6), T(0, 0.9, -8.2)], 0.42, HOSE)]
join('OR_anesthesia', an)

# ================================================================== cột truyền
IX, IZ = -11.0, -6.0
iv = [V('ipole', 0.2, FLOOR_Y, 18, IX, IZ, SS), V('ibase', 2.6, FLOOR_Y + 0.1, FLOOR_Y + 0.5, IX, IZ, SSD, r2=0.5), tube('ihook', [T(IX - 1.8, 18.6, IZ), T(IX, 18, IZ), T(IX + 1.8, 18.6, IZ)], 0.12, SS)]
for sx, m in ((-1.8, SALINE), (1.8, SALINE)):
    iv.append(ball('bag', 1.0, T(IX + sx, 15.6, IZ), m))
    iv[-1].scale = (1.1, 0.35, 2.0)
    iv.append(V('drip', 0.22, 12.0, 13.6, IX + sx, IZ, SALINE))
iv.append(tube('line', [T(IX + 1.8, 12.0, IZ), T(IX + 3.5, 7, IZ + 0.5), T(-8.5, 1.5, -3.5), T(-7.2, 0.5, -1.0)], 0.07, SALINE))
join('OR_iv', iv)

# ================================================================== bàn dụng cụ phụ, chân khay Mayo, máy đốt, bình hút
ca = [V('mpost', 0.45, FLOOR_Y + 0.6, -0.1, 9.6, 0.2, SS), B('marm', (5.2, 0.28, 0.7), (7.2, 0.0, 0.2), SS, 0.06), B('mfoot', (5, 0.5, 6), (9.6, FLOOR_Y + 0.5, 0.2), SSD, 0.1)]
BX, BZ = 24.0, 8.0
ca += [B('btop', (11, 0.5, 22), (BX, -0.8, BZ), SS, 0.08), B('bcloth', (11.6, 0.1, 22.6), (BX, -0.48, BZ), DRAPE, 0.02), B('bshelf', (10, 0.3, 21), (BX, -10, BZ), SS, 0.05)]
for sx in (-1, 1):
    for sz in (-1, 1):
        ca += [V('bleg', 0.3, FLOOR_Y + 0.7, -1, BX + sx * 4.8, BZ + sz * 10, SS), V('bw', 0.55, FLOOR_Y, FLOOR_Y + 0.8, BX + sx * 4.8, BZ + sz * 10, BLACK)]
for i in range(6):
    z = BZ - 8 + i * 3.2
    ca += [B('wrap', (3.4, 0.7, 2.4), (BX - 2.8, 0.0, z), ENAMEL, 0.12), V('bowl', 0.9 + 0.1 * i, -0.42, 0.3, BX + 2.5, z, SS, r2=1.2 + 0.1 * i)]
EX, EZ = 22.0, -22.0
ca += [B('etop', (9, 0.4, 8), (EX, -1, EZ), SS, 0.06), B('eunit', (8, 4, 6.5), (EX, 1.2, EZ), ENAMEL, 0.2), B('eface', (6.6, 2.4, 0.1), (EX, 1.5, EZ + 3.28), BLACK, 0), B('eled', (1.7, 0.7, 0.05), (EX - 1.8, 2.0, EZ + 3.35), GREEN, 0), B('eled2', (1.7, 0.7, 0.05), (EX + 1.8, 2.0, EZ + 3.35), AMBER, 0)]
for sx in (-1, 1):
    for sz in (-1, 1):
        ca.append(V('eleg', 0.3, FLOOR_Y, -1, EX + sx * 3.8, EZ + sz * 3.3, SSD))
for i in range(2):
    x = 12.5 + i * 4.1
    ca += [V('can', 1.6, FLOOR_Y + 2, FLOOR_Y + 9, x, -14, SALINE), V('canb', 1.45, FLOOR_Y + 2.1, FLOOR_Y + 4.6 + i * 1.3, x, -14, BLOODC), V('cancap', 1.7, FLOOR_Y + 9, FLOOR_Y + 9.6, x, -14, GREY)]
ca += [B('cbase', (10, 0.5, 5), (14.5, FLOOR_Y + 1.7, -14), SSD, 0.08), tube('shose', [T(12.5, FLOOR_Y + 9.6, -14), T(11, -1, -9), T(8, 1.2, -4), T(5.2, 0.5, 1.9)], 0.13, SALINE)]
join('OR_carts', ca)

for o in list(bpy.data.objects):
    if not o.name.startswith('OR_'):
        bpy.data.objects.remove(o, do_unlink=True)
print('NODES', sorted(o.name for o in bpy.data.objects))
export_glb('or-room.glb')
