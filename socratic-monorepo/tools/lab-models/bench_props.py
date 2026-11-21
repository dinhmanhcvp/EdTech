"""
Vật THẬT mà học sinh cầm trong các bước chuẩn bị của bài thực hành SGK (`HandsBench3D.tsx` + `benchActs.ts`): lam kính, lamen, giá ống nghiệm, lọ thuốc thử,
cốc rót, chày, đũa thủy tinh, bóng bơm, bình tam giác, lát cắt thân cây, lá nhôm, hũ sữa chua. Mỗi vật là MỘT lưới `Prop_<tên>`, gốc toạ độ ở GIỮA ĐÁY
(riêng chày và đũa: gốc ở ĐẦU DƯỚI, cầm đầu trên), đứng thẳng theo +y, đơn vị như bộ dụng cụ `bench_parts.py` (cốc cao 0,42).
Vật liệu thủy tinh tên `glass` (cảnh làm trong); `liquid` là chất lỏng trong vật (cảnh có thể tô màu).

Chạy:
  blender --background --python tools/lab-models/bench_props.py -- apps/teacher-board/public/models [ảnh xem thử.png]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kit import *  # noqa: E402,F401,F403

R90 = math.radians(90)


def liq(name, h, a=0.75):
    return mat(name, hexc(h), rough=0.12, alpha=a)


LIQUID = liq('liquid', '#CFE6F5', 0.5)
MILK = mat('milk', hexc('#F6F1E4'), rough=0.4)
AMBER = mat('amber', hexc('#8A4A12'), rough=0.06, alpha=0.62)
LABEL = mat('label', hexc('#F3EEDF'), rough=0.85)
BAND = mat('band', hexc('#2459C9'), rough=0.6)
PORCE = mat('porcelain', hexc('#F4F1EA'), rough=0.25)
RUB = mat('rubber2', hexc('#15161A'), rough=0.55)
FOILM = mat('foil', (0.86, 0.86, 0.88), metallic=1, rough=0.28)
LIDRED = mat('lidred', hexc('#C4261A'), rough=0.45)
CORK = mat('cork', hexc('#C79B62'), rough=0.9)
BARK = mat('bark', hexc('#5A3A1E'), rough=0.95)
VIOLET = liq('violet', '#7A3FB0', 0.85)


def B(sx, sy, sz, x, y, z, m, bevel=0.008):
    return box('b', (sx, sz, sy), T(x, y, z), m, bevel=bevel)


def C(r, h, x, y, z, m, r2=None, seg=28, bevel=0.0):
    return cyl('c', r, h, T(x, y, z), m, bevel=bevel, r2=r2, seg=seg)


def ell(name, c, sc, m, seg=24):
    """ellipsoid bán trục sc = (sx, sy, sz) theo three.js"""
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=T(*c), segments=seg, ring_count=max(6, seg // 2))
    o = bpy.context.object
    o.scale = (sc[0], sc[2], sc[1])
    bpy.ops.object.transform_apply(scale=True)
    return finish(o, m)


def LA(profile, m, x=0, y=0, z=0):
    return lathe('l', profile, T(x, y, z), m, steps=40)


def prop(name, objs):
    o = join('Prop_' + name, objs)
    for p in o.data.polygons:
        p.use_smooth = True
    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    return o


TINT = mat('tint', hexc('#7A3FB0'), rough=0.3)
TINTL = liq('tint', '#E8A03A', 0.8)  # chất lỏng tô màu được (tên `tint`)

# lam kính: kính dày 1 mm có nhãn mờ ở một đầu, lát mẫu nhuộm tím ở giữa
prop('slide', [B(0.34, 0.012, 0.11, 0, 0.006, 0, GLASS, 0), B(0.07, 0.006, 0.07, 0.02, 0.014, 0, TINT, 0.002), B(0.07, 0.004, 0.1, -0.135, 0.014, 0, LABEL, 0)])
# lamen: lá kính vuông rất mỏng
prop('cover', [B(0.09, 0.006, 0.09, 0, 0.003, 0, GLASS, 0)])
# giá ống nghiệm gỗ + ba ống chứa dịch trắng đục (hồ tinh bột + enzyme)
rk = [B(0.8, 0.04, 0.3, 0, 0.02, 0, WOOD, 0.008), B(0.8, 0.03, 0.3, 0, 0.3, 0, WOOD, 0.008), B(0.04, 0.3, 0.3, -0.38, 0.16, 0, WOOD, 0.008), B(0.04, 0.3, 0.3, 0.38, 0.16, 0, WOOD, 0.008)]
for i in range(3):
    x = -0.25 + i * 0.25
    rk.append(LA([(0, 0), (0.045, 0.02), (0.06, 0.07), (0.06, 0.5), (0.068, 0.508), (0.052, 0.5), (0.052, 0.07), (0.04, 0.028), (0, 0.012)], GLASS, x, 0.05, 0))
    rk.append(C(0.048, 0.22, x, 0.17, 0, MILK, seg=16))
prop('rack', rk)
# lọ thuốc thử: thủy tinh nâu, nhãn giấy có dải màu, MIỆNG MỞ (nắp đã vặn ra) để rót; chất lỏng bên trong
r, h = 0.11, 0.34
prop('bottle', [LA([(0, 0), (r, 0), (r, h * 0.68), (r * 0.42, h * 0.86), (r * 0.42, h), (r * 0.5, h + 0.012), (r * 0.36, h), (r * 0.36, h * 0.86), (r * 0.9, h * 0.66), (0, 0.012)], AMBER),
                LA([(0, 0.012), (r * 0.9, 0.012), (r * 0.9, h * 0.55), (0, h * 0.55)], TINTL),
                C(r * 1.012, h * 0.34, 0, h * 0.3, 0, LABEL, seg=32), C(r * 1.016, h * 0.07, 0, h * 0.4, 0, BAND, seg=32)])
# cốc rót (cốc đong thủy tinh có mỏ, vạch chia, nước bên trong)
r, h = 0.17, 0.36
jug = [LA([(0, 0), (r, 0), (r, h), (r + 0.02, h + 0.012), (r - 0.012, h), (r - 0.012, 0.012), (0, 0.012)], GLASS), LA([(0, 0.012), (r - 0.016, 0.012), (r - 0.016, h * 0.7), (0, h * 0.7)], LIQUID)]
jug += [B(0.07 if i % 2 else 0.045, 0.006, 0.004, -r * 0.4, h * i / 6, r + 0.002, WHITE if 'WHITE' in globals() else LABEL, 0) for i in range(1, 6)]
prop('jug', jug)
# chày sứ (gốc ở ĐẦU CHÀY, cầm đầu trên): cán thon, đầu tròn
prop('pestle', [LA([(0, 0), (0.05, 0.02), (0.065, 0.07), (0.05, 0.16), (0.035, 0.3), (0.045, 0.52), (0.05, 0.6), (0, 0.6)], PORCE)])
# đũa thủy tinh: gốc ở đầu dưới
prop('rod', [C(0.016, 0.78, 0, 0.39, 0, GLASS, seg=14), C(0.012, 0.01, 0, 0.005, 0, GLASS, seg=14)])
# bóng bơm huyết áp: bóng cao su đen, van vặn và ống dẫn ngắn
bulb = [LA([(0, 0), (0.07, 0.01), (0.15, 0.1), (0.17, 0.2), (0.14, 0.31), (0.07, 0.38), (0.03, 0.4), (0, 0.4)], RUB), C(0.03, 0.09, 0.0, 0.44, 0.0, CHROME, bevel=0.004), C(0.045, 0.04, 0.0, 0.47, 0.0, KNURL if 'KNURL' in globals() else IRON, bevel=0.004)]
bulb.append(tube('hose', [T(0.0, 0.44, 0.0), T(0.12, 0.5, 0.05), T(0.3, 0.3, 0.12), T(0.42, 0.06, 0.1)], 0.022, RUB))
prop('bulb', bulb)
# bình tam giác 250 mL, nút cao su, nước bên trong
prop('flask', [LA([(0, 0), (0.2, 0), (0.22, 0.02), (0.12, 0.3), (0.07, 0.4), (0.07, 0.48), (0.085, 0.492), (0.062, 0.48), (0.062, 0.4), (0.108, 0.3), (0.2, 0.04), (0, 0.012)], GLASS),
               LA([(0, 0.012), (0.19, 0.012), (0.19, 0.03), (0.13, 0.18), (0, 0.18)], LIQUID), C(0.058, 0.07, 0, 0.5, 0, CORK, r2=0.07, seg=20)])
# lát cắt thân cây: vỏ sẫm, gỗ nâu có vòng năm đồng tâm
ds = [C(0.31, 0.06, 0, 0.03, 0, BARK, bevel=0.004, seg=48), C(0.285, 0.064, 0, 0.032, 0, WOOD, bevel=0.002, seg=48)]
for k, rr in enumerate([0.24, 0.2, 0.15, 0.115, 0.08, 0.045]):
    ds.append(LA([(rr - 0.004, 0.061), (rr + 0.004 + 0.004 * (k % 2), 0.0615), (rr + 0.004 + 0.004 * (k % 2), 0.0645), (rr - 0.004, 0.0645)], BARK))
prop('disc', ds)
# lá nhôm: tấm mỏng có nếp gấp
fl = [B(0.3, 0.008, 0.2, 0, 0.004, 0, FOILM, 0.002)] + [B(0.3, 0.012, 0.006, 0, 0.007, -0.06 + 0.04 * i, FOILM, 0.002) for i in range(4)]
prop('foil', fl)
# hũ sữa chua: hũ thủy tinh, sữa trắng, nắp đỏ vặn
prop('jar', [LA([(0, 0), (0.17, 0), (0.18, 0.02), (0.18, 0.26), (0.15, 0.3), (0.15, 0.32), (0.145, 0.32), (0.145, 0.3), (0.172, 0.26), (0.172, 0.028), (0, 0.014)], GLASS),
             LA([(0, 0.014), (0.168, 0.014), (0.168, 0.2), (0, 0.2)], MILK), C(0.16, 0.05, 0, 0.345, 0, LIDRED, bevel=0.006, seg=36)])

# phích cắm chuối: chân đồng ở ĐẦU DƯỚI (gốc), thân nhựa đỏ có gờ cầm, đuôi giữ dây; dây do cảnh vẽ nối từ nguồn tới đuôi phích
PLUGM = mat('plugred', hexc('#C4261A'), rough=0.4)
pl = [C(0.022, 0.16, 0, 0.08, 0, BRASS, seg=16), C(0.05, 0.2, 0, 0.26, 0, PLUGM, seg=24, bevel=0.01), C(0.036, 0.1, 0, 0.42, 0, PLUGM, seg=20)]
pl += [C(0.056, 0.012, 0, 0.2 + i * 0.05, 0, PLUGM, seg=24) for i in range(4)]
prop('plug', pl)

# ---- vật để CHỌN phương án (cầm từng cái lên, đặt vào chỗ dùng): vật liệu `tint` do cảnh tô màu theo phương án
STEELP = mat('steelp', (0.7, 0.72, 0.76), metallic=1, rough=0.3)
COPPERP = mat('copperp', (0.72, 0.36, 0.2), metallic=1, rough=0.3)
CERA = mat('ceramic', hexc('#E6D6B0'), rough=0.5)
WOODP = mat('woodp', hexc('#9A6B3A'), rough=0.6)
# điện trở than: thân gốm, dây ra hai đầu, 3 vạch màu (vạch đầu tô màu theo giá trị)
prop('resistor', [C(0.05, 0.3, 0, 0.12, 0, CERA, seg=20, bevel=0.01), C(0.012, 0.18, 0, 0.12 + 0.0, 0, STEELP, seg=8), C(0.052, 0.03, 0, 0.2, 0, TINT, seg=20), C(0.052, 0.03, 0, 0.14, 0, mat('b2', hexc('#2B2F3A'), rough=0.5), seg=20), C(0.052, 0.03, 0, 0.08, 0, mat('b3', hexc('#C4261A'), rough=0.5), seg=20), B(0.34, 0.03, 0.2, 0, 0.015, 0, WOODP, 0.006)])
# cuộn dây đồng quấn trên lõi nhựa, đế gỗ (số vòng: lớp dây tô màu theo phương án ở lớp ngoài)
coil = [B(0.4, 0.04, 0.3, 0, 0.02, 0, WOODP, 0.006), C(0.1, 0.34, 0, 0.21, 0, CERA, seg=24), C(0.15, 0.26, 0, 0.21, 0, COPPERP, seg=32, bevel=0.01), C(0.152, 0.05, 0, 0.21, 0, TINT, seg=32)]
prop('coil', coil)
# lò xo thép xoắn có hai móc, đế gỗ
sp = [B(0.34, 0.03, 0.2, 0, 0.015, 0, WOODP, 0.006)] + [C(0.06, 0.012, 0, 0.06 + i * 0.026, 0, STEELP, seg=24) for i in range(12)] + [C(0.012, 0.06, 0, 0.4, 0, TINT, seg=10), C(0.012, 0.06, 0, 0.04, 0, STEELP, seg=10)]
prop('spring', sp)
# tấm bề mặt (gỗ / kính / cao su): tấm dày 0,05, mặt trên tô màu theo phương án
prop('plate', [B(0.46, 0.06, 0.3, 0, 0.03, 0, TINT, 0.012), B(0.4, 0.01, 0.24, 0, 0.065, 0, mat('plateTop', hexc('#E7E2D4'), rough=0.9), 0.003)])
# thẻ đứng có chân gỗ, mặt thẻ tô màu theo phương án, dải trắng để ghi nhãn (nhãn chữ do cảnh vẽ phía trên)
prop('card', [B(0.34, 0.03, 0.14, 0, 0.015, 0, WOODP, 0.006), B(0.3, 0.26, 0.022, 0, 0.16, 0, TINT, 0.01), B(0.24, 0.06, 0.026, 0, 0.12, 0, mat('cardwhite', hexc('#F6F2E8'), rough=0.8), 0.003)])
# âm thoa thép trên hộp cộng hưởng gỗ
prop('fork', [B(0.32, 0.16, 0.12, 0, 0.08, 0, TINT, 0.01), C(0.016, 0.3, -0.05, 0.31, 0, STEELP, seg=12), C(0.016, 0.3, 0.05, 0.31, 0, STEELP, seg=12), C(0.016, 0.12, 0, 0.19, 0, STEELP, seg=12), B(0.12, 0.012, 0.03, 0, 0.17, 0, STEELP, 0.003)])

# ---- vật cụ thể thay cho thẻ chữ ở các lựa chọn còn lại
LEAFG = mat('leafg', hexc('#3E8E3A'), rough=0.55)
TERRA = mat('terracotta', hexc('#B5613A'), rough=0.8)
SOILM = mat('soilp', hexc('#3A2616'), rough=0.95)
PAPERM = mat('paperp', hexc('#F6F2E8'), rough=0.9)
INKP = mat('inkp', hexc('#2B2F3A'), rough=0.6)
# thước thẳng: thước nhựa trong có vạch chia
rl = [B(0.62, 0.012, 0.07, 0, 0.006, 0, PAPERM, 0.003)] + [B(0.004, 0.003, 0.03 if i % 5 else 0.05, -0.29 + i * 0.0145, 0.0135, 0.0, INKP, 0) for i in range(41)]
prop('ruler', rl)
# thước kẹp: sống thước thép có vạch, hàm cố định, hàm trượt, vít khoá
prop('caliper', [B(0.6, 0.012, 0.045, 0, 0.006, 0, STEELP, 0.002), B(0.018, 0.1, 0.045, -0.29, 0.056, 0, STEELP, 0.003), B(0.05, 0.03, 0.05, 0.02, 0.015, 0, STEELP, 0.004), B(0.018, 0.1, 0.045, 0.0, 0.056, 0, STEELP, 0.003), C(0.014, 0.02, 0.03, 0.035, 0, INKP, seg=14)] + [B(0.003, 0.003, 0.02, -0.28 + i * 0.0145, 0.0135, 0.0, INKP, 0) for i in range(38)])
# vật kính: ống kim loại đen, đầu chrome, vòng màu theo độ phóng đại (tô `tint`)
prop('objective', [C(0.06, 0.26, 0, 0.13, 0, INKP, seg=28, bevel=0.01), C(0.062, 0.05, 0, 0.17, 0, TINT, seg=28), C(0.035, 0.07, 0, 0.035, 0, CHROME, r2=0.02, seg=24)])
# phiếu / tờ giấy có dòng kẻ và dải tiêu đề tô màu (phiếu khảo sát, quy tắc, bản đồ khu vực)
prop('paper', [B(0.3, 0.012, 0.4, 0, 0.006, 0, PAPERM, 0.002), B(0.3, 0.014, 0.07, 0, 0.007, -0.16, TINT, 0.002)] + [B(0.22, 0.014, 0.008, 0, 0.007, -0.06 + i * 0.05, INKP, 0) for i in range(6)])
# chậu cây đất nung có cây non, vòng nhãn tô màu theo nhóm
pot = [LA([(0, 0), (0.1, 0), (0.15, 0.2), (0.16, 0.22), (0.14, 0.22), (0, 0.2)], TERRA), C(0.152, 0.03, 0, 0.215, 0, TINT, seg=28), C(0.135, 0.02, 0, 0.22, 0, SOILM, seg=24), C(0.012, 0.3, 0, 0.36, 0, LEAFG, seg=8)]
for a_ in range(5):
    ang = a_ * 1.256
    pot.append(ell('lf', (math.cos(ang) * 0.09, 0.45 + 0.03 * (a_ % 2), math.sin(ang) * 0.09), (0.09, 0.012, 0.045), LEAFG, seg=16))
prop('pot', pot)
# vật nuôi: ếch (thân xanh, chân gập), bướm (cánh màu tô `tint`), châu chấu (thân dài, chân sau lớn)
FROGG = mat('frogg', hexc('#5E8E3A'), rough=0.5)
fr = [ell('b', (0, 0.07, 0), (0.15, 0.07, 0.1), FROGG), ell('h', (0.14, 0.09, 0), (0.07, 0.055, 0.075), FROGG), ell('e1', (0.17, 0.15, 0.04), (0.02, 0.02, 0.02), PAPERM, seg=12), ell('e2', (0.17, 0.15, -0.04), (0.02, 0.02, 0.02), PAPERM, seg=12)]
for sz in (-1, 1):
    fr += [tube('leg', [T(-0.08, 0.05, sz * 0.09), T(-0.2, 0.04, sz * 0.18), T(-0.12, 0.01, sz * 0.2)], 0.022, FROGG), tube('arm', [T(0.1, 0.05, sz * 0.08), T(0.15, 0.01, sz * 0.12)], 0.015, FROGG)]
prop('frog', fr)
bf = [ell('bd', (0, 0.1, 0), (0.016, 0.016, 0.1), INKP, seg=12)]
for sz in (-1, 1):
    bf += [ell('w1', (0.03, 0.1, sz * 0.1), (0.07, 0.006, 0.1), TINT, seg=20), ell('w2', (-0.04, 0.1, sz * 0.08), (0.05, 0.006, 0.07), TINT, seg=20)]
bf = [o for o in bf]
prop('butterfly', bf + [C(0.004, 0.1, 0, 0.05, 0, INKP, seg=6)])
GRASSH = mat('grassh', hexc('#8CB43A'), rough=0.5)
gh = [ell('b', (0, 0.07, 0), (0.17, 0.035, 0.04), GRASSH, seg=18), ell('hd', (0.18, 0.08, 0), (0.045, 0.04, 0.035), GRASSH, seg=14)]
for sz in (-1, 1):
    gh += [tube('lg', [T(-0.06, 0.07, sz * 0.03), T(-0.14, 0.17, sz * 0.07), T(-0.22, 0.02, sz * 0.09)], 0.012, GRASSH), tube('lm', [T(0.04, 0.06, sz * 0.03), T(0.08, 0.02, sz * 0.08)], 0.008, GRASSH)]
prop('grasshopper', gh)

# xếp thẳng hàng để xem thử (không ảnh hưởng GLB: lưới đã xuất cùng gốc)
export_glb('bench-props.glb')
if PREVIEW:
    names = ['slide', 'cover', 'rack', 'bottle', 'jug', 'pestle', 'rod', 'bulb', 'flask', 'disc', 'foil', 'jar', 'plug', 'resistor', 'coil', 'spring', 'plate', 'card', 'fork']
    x = -3.5
    for n in names:
        o = bpy.data.objects['Prop_' + n]
        o.location = T(x, 0.0, 0.0)
        x += 0.55 if n in ('slide', 'cover', 'rod', 'pestle', 'foil') else 0.75
    preview((0.0, 2.6, 6.6), (0.0, 0.2, 0.0), lens=34)
