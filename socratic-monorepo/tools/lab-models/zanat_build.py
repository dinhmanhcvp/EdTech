"""
Bước 2 — biến cơ quan Z-Anatomy đã trích (`zanat_extract.py`) thành bộ phận cho web, đặt sẵn đúng chỗ cho từng nơi dùng:
  ZH_<id>  tim nhìn ngoài trên bảng (id = ra, la, rv, lv, aorta, pa, vc, pv, cor) — `heart_model.py` lấy thay cho tim tự dựng
  ZR_<id>  hệ hô hấp trên bảng (lungs, trachea, bronchi, diaphragm) — `board_parts4.py`
  ZD_<id>  hệ tiêu hóa trên bảng (esophagus, stomach, liver, gallbladder, pancreas, small, large) — `board_parts4.py`
  ZM_<cơ quan>  mẫu mổ người nằm ngửa trong /lab (lung, heart, diaphragm, liver, stomach, largeint, smallint) — `dissect_parts.py`
Mỗi bộ phận một lưới riêng (để chạm chọn), cắt bớt mạch dài, Displace mịn theo cỡ, giảm lưới theo ngân sách, màu đỉnh loang
(cùng hàm màu của organs.py) và shader mô ướt (Coat 0,85 / 0,15, Subsurface 0,25).

Nguồn: Z-Anatomy (CC BY-SA 4.0) dựa trên BodyParts3D (DBCLS, CC BY-SA 2.1 JP). Sản phẩm dẫn xuất (`assets/zanat-organs.glb`) cùng giấy phép CC BY-SA 4.0,
xem `assets/ZANATOMY-LICENSE.md`. Không chứa phần NC (thận, tai trong).

Chạy:  blender -b --python tools/lab-models/zanat_build.py -- <zanat_raw.glb> tools/lab-models/assets/zanat-organs.glb
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
ARGV = sys.argv[sys.argv.index('--') + 1:]
RAW, OUT = ARGV[0], ARGV[1]
sys.argv = [sys.argv[0], '--', os.path.dirname(OUT)]  # kit đọc thư mục xuất từ argv
from kit import T  # noqa: E402  (xoá cảnh mặc định)
import bmesh  # noqa: E402
import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402
from organic import _tex, blend, fbm, mottled, paint, veined  # noqa: E402
from organs import _auricle, _myo, _vessel_fn, lung_fn, wet  # noqa: E402

bpy.ops.import_scene.gltf(filepath=RAW)
SRC = {}
for o in list(bpy.data.objects):
    if o.type == 'MESH' and '|' in o.name:
        g, n = o.name.split('|', 1)
        SRC.setdefault(g, {})[n] = o


def three(v):
    return (v.x, v.z, -v.y)


def copy(names, grp):
    """bản sao các lưới nguồn theo tên (một nhóm)"""
    out = []
    for n in names:
        o = SRC.get(grp, {}).get(n)
        if o is None:
            continue
        c = o.copy()
        c.data = o.data.copy()
        bpy.context.scene.collection.objects.link(c)
        bpy.ops.object.select_all(action='DESELECT')
        c.select_set(True)
        bpy.context.view_layer.objects.active = c
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        out.append(c)
    return out


def bbox(objs):
    pts = [three(v.co) for o in objs for v in o.data.vertices]
    lo = [min(p[i] for p in pts) for i in range(3)]
    hi = [max(p[i] for p in pts) for i in range(3)]
    return lo, hi


def join(objs, name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    o = bpy.context.object
    o.name = name
    o.data.name = name
    return o


def mapv(objs, fn):
    """biến đổi đỉnh theo fn(x, y, z three.js) -> (x, y, z)"""
    for o in objs:
        for v in o.data.vertices:
            v.co = T(*fn(*three(v.co)))
        o.data.update()


def clip(o, ymin=None, ymax=None, axis=1):
    """cắt bỏ phần lưới ngoài khoảng [ymin, ymax] theo trục three.js `axis` (0 = x, 1 = y, 2 = z): cắt mạch quá dài"""
    nrm = {0: Vector((1, 0, 0)), 1: Vector((0, 0, 1)), 2: Vector((0, -1, 0))}[axis]
    bm = bmesh.new()
    bm.from_mesh(o.data)
    for lim, below in ((ymin, True), (ymax, False)):
        if lim is None:
            continue
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=nrm * lim, plane_no=nrm, clear_inner=below, clear_outer=not below)
    bm.to_mesh(o.data)
    bm.free()
    o.data.update()
    return o


def finish(o, fn, size, tris=None):
    """Displace mịn theo cỡ, giảm lưới, mượt, màu đỉnh, shader ướt"""
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    if tris:
        n = sum(len(p.vertices) - 2 for p in o.data.polygons)
        if n > tris:
            d = o.modifiers.new('dec', 'DECIMATE')
            d.ratio = tris / n
            bpy.ops.object.modifier_apply(modifier=d.name)
    _tex[0] += 1
    t = bpy.data.textures.new('zc%d' % _tex[0], 'CLOUDS')
    t.noise_scale = size * 0.03
    d = o.modifiers.new('Displace', 'DISPLACE')
    d.texture = t
    d.strength = size * 0.0025
    bpy.ops.object.modifier_apply(modifier=d.name)
    for p in o.data.polygons:
        p.use_smooth = True
    o.data.materials.clear()
    o.data.materials.append(wet(o.name + '_wet'))
    for p in o.data.polygons:
        p.material_index = 0
    paint(o, fn)
    return o


def scaled(fn, k):
    """hàm màu viết cho cỡ tim ≈ 1: đổi toạ độ theo tỉ lệ để hạt nhiễu / vân giữ cỡ thật"""
    return lambda p, n: fn((p[0] / k, p[1] / k, p[2] / k), n)


# ------------------------------------------------------------------ nhóm theo id
HEART_IDS = {
    'ra': ['Right atrium'], 'la': ['Left atrium'], 'rv': ['Right ventricle'], 'lv': ['Left ventricle'],
    'aorta': ['Ascending aorta', 'Aortic arch', 'Brachiocephalic trunk', 'Left common carotid artery', 'Left subclavian artery'],
    'pa': ['Pulmonary trunk', 'Bifurcation of pulmonary trunk', 'Left pulmonary artery', 'Right pulmonary artery'],
    'vc': ['Superior vena cava', 'Inferior vena cava (thoracic part)'],
    'pv': ['Left superior pulmonary vein', 'Left inferior pulmonary vein', 'Right superior pulmonary vein', 'Right inferior pulmonary vein'],
}
LUNGS = ['Superior lobe of left lung', 'Inferior lobe of left lung', 'Superior lobe of right lung', 'Middle lobe of right lung', 'Inferior lobe of right lung']
BRONCHI = ['Left main bronchus', 'Right main bronchus', 'Intermediate bronchus.r', 'Left superior lobar bronchus', 'Left inferior lobar bronchus', 'Right superior lobar bronchus', 'Middle lobar bronchus.r', 'Right inferior lobar bronchus']
DIG_IDS = {'esophagus': ['Oesophagus'], 'stomach': ['Stomach'], 'liver': ['Liver'], 'gallbladder': ['Gallbladder'], 'pancreas': ['Pancreas'],
           'small': ['Duodenum', 'Jejunum'], 'large': ['Ascending colon', 'Transverse colon', 'Descending colon', 'Sigmoid colon', 'Vermiform appendix']}
red = _vessel_fn('#8A1824', '#B8323C')
blue = _vessel_fn('#3A2F6A', '#5A4888')
art = _vessel_fn('#7E1A26', '#A8323C')
ven = _vessel_fn('#2E2458', '#4A3A7A')
ATRIUM = lambda p, n: blend(_myo(p, n), _auricle(p, n), 0.35)  # noqa: E731
HEART_FN = {'ra': ATRIUM, 'la': ATRIUM, 'rv': _myo, 'lv': _myo, 'aorta': red, 'pa': blue, 'vc': blue, 'pv': red}
LIVER = mottled('#5A1E16', 0.16, 3, '#3A120C', 9, 0.05)
DIG_FN = {'esophagus': veined('#D08A84', '#9A3A46', 5, 0.04), 'stomach': veined('#D98478', '#9A3442', 4, 0.04), 'liver': LIVER, 'gallbladder': mottled('#3F7A32', 0.14, 5),
          'pancreas': mottled('#E2B07A', 0.12, 9, '#C98A5A', 22, 0.08), 'small': veined('#E4A090', '#A84452', 6, 0.04), 'large': veined('#C08468', '#8E4A3A', 5, 0.04)}
TRACH = mottled('#E6D6C2', 0.08, 8)
DIAPH = lambda p, n: tint3('#9A3A40', 0.85 + 0.25 * abs(math.sin(math.atan2(p[2], p[0]) * 40 + 3 * fbm(p, 4))))  # noqa: E731


def tint3(hx, k):
    from kit import hexc
    return tuple(min(1.0, x * k) for x in hexc(hx))


made = []


# ------------------------------------------------------------------ 1. tim trên bảng (ZH_*): cỡ như tim tự dựng (đáy thất y ≈ −1,2 tới gốc mạch ≈ 1,0)
def heart_parts(prefix, fit, tris_total, fn_scale):
    parts = {i: copy(ns, 'heart') for i, ns in HEART_IDS.items()}
    parts['cor'] = copy(sorted(SRC.get('heartcor', {})), 'heartcor')
    core = parts['ra'] + parts['la'] + parts['rv'] + parts['lv']
    lo, hi = bbox(core)
    out = {}
    for i, objs in parts.items():
        if not objs:
            continue
        o = join(objs, '%s%s' % (prefix, i))
        mapv([o], lambda x, y, z: fit(x, y, z, lo, hi))
        out[i] = o
    c_lo, c_hi = bbox([out[i] for i in ('ra', 'la', 'rv', 'lv')])
    h = c_hi[1] - c_lo[1]
    for i in ('aorta', 'pa', 'vc', 'pv'):
        if i in out:
            clip(out[i], ymin=c_lo[1] - 0.12 * h, ymax=c_hi[1] + 0.55 * h)
            if i in ('pa', 'pv'):
                w = c_hi[0] - c_lo[0]
                clip(out[i], ymin=c_lo[0] - 0.25 * w, ymax=c_hi[0] + 0.25 * w, axis=0)
    total = sum(len(p.data.polygons) for p in out.values())
    for i, o in out.items():
        fn = HEART_FN.get(i) or (lambda p, n: art(p, n))
        if i == 'cor':
            # động mạch vành đỏ sẫm, tĩnh mạch tim tím: chọn theo tên nguồn không còn sau khi gộp → theo màu đỏ thẫm chung, vân thớ
            fn = _vessel_fn('#4A2050', '#7A2E4A')
        finish(o, scaled(fn, fn_scale), h, tris=max(1500, int(tris_total * len(o.data.polygons) / total)))
        made.append(o)
    return out, h


def fit_board_heart(x, y, z, lo, hi):
    k = 2.3 / (hi[1] - lo[1])
    cx, cy, cz = [(lo[i] + hi[i]) / 2 for i in range(3)]
    return ((x - cx) * k, (y - cy) * k - 0.1, (z - cz) * k)


heart_parts('ZH_', fit_board_heart, 38000, 2.0)


# ------------------------------------------------------------------ 2. hô hấp trên bảng (ZR_*): phổi trong khung cũ x ∈ [−2,65; 2,65], y ∈ [1,15; 4,65]
lobes = copy(LUNGS, 'lung')
trach = copy(['Trachea'], 'lung')
bron = copy(BRONCHI, 'lung')
diaph = copy(['Diaphragm'], 'diaph')
lo, hi = bbox(lobes)
k = 3.5 / (hi[1] - lo[1])
cx, cz = (lo[0] + hi[0]) / 2, (lo[2] + hi[2]) / 2


def fit_res(x, y, z):
    return ((x - cx) * k, (y - lo[1]) * k + 1.15, (z - cz) * k)


L = join(lobes, 'ZR_lungs')
mapv([L], fit_res)
finish(L, scaled(lung_fn, 3.5), 3.5, tris=22000)
TR = join(trach, 'ZR_trachea')
mapv([TR], fit_res)
clip(TR, ymax=6.0)
finish(TR, TRACH, 3.5, tris=5000)
BR = join(bron, 'ZR_bronchi')
mapv([BR], fit_res)
finish(BR, TRACH, 3.5, tris=6000)
DP = join(diaph, 'ZR_diaphragm')
mapv([DP], fit_res)
finish(DP, DIAPH, 3.5, tris=6000)
made += [L, TR, BR, DP]


# ------------------------------------------------------------------ 3. tiêu hóa trên bảng (ZD_*): các tạng bụng trong khung x ∈ [−2,1; 1,6], y ∈ [0,45; 4,75]
dig = {i: copy(ns, 'dig') for i, ns in DIG_IDS.items()}
belly = [o for i, objs in dig.items() if i != 'esophagus' for o in objs]
lo, hi = bbox(belly)
k = 4.3 / (hi[1] - lo[1])
cx, cz = (lo[0] + hi[0]) / 2, (lo[2] + hi[2]) / 2
for i, objs in dig.items():
    if not objs:
        continue
    o = join(objs, 'ZD_' + i)
    mapv([o], lambda x, y, z: ((x - cx) * k - 0.25, (y - lo[1]) * k + 0.45, (z - cz) * k))
    if i == 'esophagus':
        clip(o, ymax=6.3)
    finish(o, scaled(DIG_FN[i], 3.0), 4.3, tris={'liver': 9000, 'small': 9000, 'large': 9000}.get(i, 5000))
    made.append(o)


# ------------------------------------------------------------------ 4. mẫu mổ người nằm ngửa (ZM_*): đầu về −x, mặt trước lên +y, bên phải người ở +z
groups = {
    'lung': copy(LUNGS, 'lung'), 'diaphragm': copy(['Diaphragm'], 'diaph'), 'liver': copy(['Liver', 'Gallbladder'], 'dig'), 'stomach': copy(['Stomach'], 'dig'),
    'largeint': copy(DIG_IDS['large'], 'dig'), 'smallint': copy(DIG_IDS['small'], 'dig'),
}
hparts = {i: copy(ns, 'heart') for i, ns in HEART_IDS.items()}
hparts['cor'] = copy(sorted(SRC.get('heartcor', {})), 'heartcor')
allo = [o for v in groups.values() for o in v] + [o for v in hparts.values() for o in v]
lo, hi = bbox([o for v in groups.values() for o in v])
k = 2.2 / (hi[1] - lo[1])
cx, cy, cz = [(lo[i] + hi[i]) / 2 for i in range(3)]


def supine(x, y, z):
    # trục dọc người (y Z-Anatomy) → −x; trước (z) → +y (dẹt bớt cho vừa khoang); trái người (+x Z-Anatomy) → −z
    return (-(y - cy) * k - 0.05, 0.3 + (z - cz) * k * 0.38, -(x - cx) * k * 0.9)


lung_box = None
for nm, objs in groups.items():
    if not objs:
        continue
    o = join(objs, 'ZM_' + nm)
    mapv([o], supine)
    if nm == 'lung':
        lung_box = bbox([o])
    fn = {'lung': scaled(lung_fn, 0.6), 'diaphragm': DIAPH, 'liver': scaled(LIVER, 0.6), 'stomach': scaled(DIG_FN['stomach'], 0.6),
          'largeint': scaled(DIG_FN['large'], 0.6), 'smallint': scaled(DIG_FN['small'], 0.6)}[nm]
    finish(o, fn, 0.6, tris={'lung': 14000}.get(nm, 6000))
    made.append(o)
hc = [o for v in hparts.values() for o in v]
h = join(hc, 'ZM_heart')
mapv([h], supine)
if lung_box:
    span = lung_box[1][0] - lung_box[0][0]
    clip(h, ymin=lung_box[0][0] + 0.2 * span, ymax=lung_box[1][0], axis=0)
finish(h, scaled(_myo, 0.4), 0.5, tris=12000)
made.append(h)


# ------------------------------------------------------------------ 5. mắt bổ đôi trên bảng (ZE_*): trục nhìn theo +x (giác mạc bên trái), đường kính 3,2, nửa gần người xem bỏ đi
def halve(o):
    """bỏ nửa z > 0 và vá mặt cắt (chỉ vá vòng nằm trên mặt cắt, giữ nguyên lỗ đồng tử / lỗ giác mạc)"""
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=Vector((0, 0, 0)), plane_no=Vector((0, -1, 0)), clear_outer=True)
    edges = [e for e in bm.edges if e.is_boundary and all(abs(v.co.y) < 1e-4 for v in e.verts)]
    if edges:
        bmesh.ops.holes_fill(bm, edges=edges, sides=0)
    bm.to_mesh(o.data)
    bm.free()
    o.data.update()
    return o


def ghost_mat(o, a):
    for m in o.data.materials:
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Alpha'].default_value = a
        m.blend_method = 'BLEND'


def iris_fn(p, n):
    a = math.atan2(p[2], p[1])
    r = 0.5 + 0.5 * math.sin(a * 60 + 6 * fbm(p, 6))
    return blend(blend('#2F5E8E', '#6A8FB2', r), '#7A5A2A', max(0.0, 0.6 - 2.5 * math.hypot(p[1], p[2]) / 1.6))


EYE = {'cornea': ['Cornea.r'], 'iris': ['Iris.r'], 'lens': ['Lens.r'], 'vitreous': ['Posterior segment of eyeball.r', 'Anterior chamber of eyeball.r'], 'retina': ['Retina.r'],
       'sclera': ['Sclera.r'], 'nerve': ['Optic nerve (II).r']}
EYE_FN = {'cornea': mottled('#DDEEF5', 0.04, 4), 'iris': iris_fn, 'lens': mottled('#F4E7B8', 0.05, 5), 'vitreous': mottled('#E6EEF0', 0.04, 3),
          'retina': veined('#D8806A', '#8E2228', 5, 0.03), 'sclera': veined('#F2EEE6', '#D27A7A', 7, 0.015), 'nerve': mottled('#F0E2B0', 0.08, 6)}
eye = {i: copy(ns, 'eye') for i, ns in EYE.items()}
if eye['sclera']:
    lo, hi = bbox(eye['sclera'])
    k = 3.2 / (hi[2] - lo[2])
    cx, cy, cz = [(lo[i] + hi[i]) / 2 for i in range(3)]
    for i, objs in eye.items():
        if not objs:
            continue
        o = join(objs, 'ZE_' + i)
        mapv([o], lambda x, y, z: (-(z - cz) * k, (y - cy) * k, (x - cx) * k))
        if i == 'nerve':
            clip(o, ymin=1.42, ymax=3.6, axis=0)
        if i != 'nerve':  # dây thần kinh đi vào phía trong (nửa bị bỏ): giữ nguyên cả ống
            halve(o)
        finish(o, EYE_FN[i], 3.2, tris=6000)
        if i in ('cornea', 'vitreous'):
            ghost_mat(o, 0.3)
        elif i == 'lens':
            ghost_mat(o, 0.8)
        made.append(o)
    # điểm vàng: vệt vàng nhỏ trên võng mạc ở cực sau, ngay trục nhìn
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=T(1.5, 0.0, -0.05), segments=24, ring_count=12)
    fv = bpy.context.object
    fv.scale = (0.05, 0.2, 0.2)
    bpy.ops.object.transform_apply(scale=True)
    fv.name = fv.data.name = 'ZE_fovea'
    finish(fv, mottled('#E8C14A', 0.1, 9), 0.5)
    made.append(fv)


# ------------------------------------------------------------------ 6. tai trên bảng (ZT_*): vành tai thật ở chỗ vành tai cũ (x = −4,2), ba xương con trong khung cũ (x −1,35…−0,4)
PINNA = ['Helix.r', 'Antihelix.r', 'Crura of antihelix.r', 'Concha of auricle.r', 'Lobule of auricle.r']
OSS = ['Malleus.r', 'Incus.r', 'Stapes.r']
# vành tai của Z-Anatomy là các mảng bề mặt rời (vùng da), không thành khối: giữ vành tai tự dựng, chỉ thay ba xương con
for nm, names, size, at, fn in (('ossicles', OSS, 1.0, (-0.85, 0.22, 0.0), mottled('#EADFC6', 0.1, 9)),):
    objs = copy(names, 'ear')
    if not objs:
        continue
    lo, hi = bbox(objs)
    k = size / max(hi[i] - lo[i] for i in range(3))
    c = [(lo[i] + hi[i]) / 2 for i in range(3)]
    o = join(objs, 'ZT_' + nm)
    mapv([o], lambda x, y, z: ((x - c[0]) * k + at[0], (y - c[1]) * k + at[1], (z - c[2]) * k + at[2]))
    finish(o, fn, size, tris=8000)
    made.append(o)

# chỉ xuất bộ phận đã làm
for o in list(bpy.data.objects):
    if o not in made:
        bpy.data.objects.remove(o, do_unlink=True)
for o in made:
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
print('ZANAT', sorted(o.name for o in made), sum(len(o.data.polygons) for o in made))
os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUT, export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6, export_apply=True)
