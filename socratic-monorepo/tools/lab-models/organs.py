"""
Cơ quan người chi tiết dùng chung cho mẫu mổ (`dissect_parts.py`) và sơ đồ cơ quan trên bảng (`board_parts4.py`):
phổi (hai lá phổi có thùy, rãnh liên thùy thật cắt vào khối, khuyết tim ở phổi trái, đáy lõm úp lên cơ hoành, màu hồng ướt có lưới tiểu thùy
và đốm xám), khí quản có vòng sụn chữ C, phế quản gốc đi vào rốn phổi, và mạch vành nổi chạy trên mặt tim (chiếu xuống bề mặt lưới).
Dựng trong hệ đơn vị (phổi cao 1) rồi đặt bằng `at` + `s`; toạ độ three.js như `kit.py`.
"""
import math
import os

import bpy
from mathutils import Euler, Vector

from kit import T, box, cyl, tube
from organic import _tex, blend, blob, boolean, cells, colored, ell, fbm, half, paint, roughen, tint, tissue

WET = dict(rough=0.3, coat=0.65)


def lung_fn(p, n):
    """mặt phổi: hồng ướt loang, lưới tiểu thùy đa giác sẫm, đốm than xám tím, viền rãnh đậm"""
    c = blend('#D57F8B', '#E9A0A6', 0.5 + 0.5 * fbm(p, 4))
    k = 1 + 0.12 * fbm(p, 11)
    c = tuple(min(1.0, x * k) for x in c)
    d0, d1 = cells(p, 15)
    if d1 - d0 < 0.09:
        c = blend(c, '#8E3F55', 0.62 * (1 - (d1 - d0) / 0.09))
    e0, _ = cells(p, 5.5)
    if e0 < 0.1:
        c = blend(c, '#5E4A5E', 0.42 * (1 - e0 / 0.1))
    return blend(c, '#F2B9BC', max(0.0, (p[1] - 0.84) * 1.8))  # đỉnh phổi sáng hơn


def _slab(c, tilt, thick=0.03, depth=3.0):
    """dao cắt mỏng nằm ngang (rãnh liên thùy) qua `c`, chúc theo chiều trước–sau góc `tilt` (dương: phía sau cao hơn);
    `depth` < 3 thì chỉ cắt nửa trước (tâm hộp dời ra trước)"""
    o = box('fis', (3, depth, thick), T(c[0], c[1], c[2] + (1.5 - depth / 2 if depth < 3 else 0)), None, bevel=0)
    o.rotation_euler = Euler((tilt, 0, 0))
    return o


def lung(side, name='lung'):
    """một lá phổi cao 1, đáy ở y = 0, mặt trong (trung thất) ở x = 0, mặt ngoài phía `side` (+1 phải người xem… tức trái người)"""
    s = side
    el = [('E', (s * 0.3, 0.25, 0), (0.34, 0.26, 0.34)), ('E', (s * 0.27, 0.48, 0.0), (0.3, 0.3, 0.3)), ('E', (s * 0.23, 0.7, -0.02), (0.21, 0.24, 0.22)),
          ('E', (s * 0.19, 0.88, -0.03), (0.12, 0.13, 0.12)), ('E', (s * 0.17, 0.99, -0.03), (0.06, 0.06, 0.06)), ('E', (s * 0.34, 0.18, -0.08), (0.3, 0.17, 0.3))]
    o = blob(name, el, None, res=0.012)
    roughen(o, 0.006, 0.08)
    # mặt trung thất phẳng, đáy lõm úp lên vòm cơ hoành
    boolean(o, ell('med', (0, 0.36, 0.02), (0.13, 0.62, 0.48), None), 'DIFFERENCE')
    boolean(o, ell('dome', (s * 0.25, -0.34, 0), (0.55, 0.42, 0.5), None), 'DIFFERENCE')
    # rãnh chếch (cả hai phổi): từ sau–trên xuống trước–dưới
    boolean(o, _slab((s * 0.3, 0.46, 0), 0.6, 0.022), 'DIFFERENCE')
    if s < 0:
        # phổi phải (bên trái người xem) có thêm rãnh ngang → ba thùy
        boolean(o, _slab((s * 0.3, 0.62, 0.02), 0.0, 0.02, 1.4), 'DIFFERENCE')
    else:
        # phổi trái: khuyết tim ở bờ trước–trong
        boolean(o, ell('notch', (s * 0.06, 0.3, 0.27), (0.13, 0.16, 0.12), None), 'DIFFERENCE')
    return organify(name, [o], lung_fn, rel=0.006)


def trachea(top=1.45, bottom=0.98, r=0.06):
    """khí quản: ống niêm mạc hồng + vòng sụn chữ C trắng ngà, chạc ba ở dưới chia hai phế quản gốc vào rốn phổi"""
    mucosa = tissue('trach', '#D9A3A0', rough=0.4, coat=0.5)
    carti = tissue('carti', '#EEE3D0', rough=0.45, coat=0.35)
    o = [tube('tr', [T(0, top, -0.04), T(0, bottom, -0.04)], r * 0.92, mucosa)]
    n = int((top - bottom) / (r * 0.75))
    for i in range(n):
        o.append(cyl('ring', r, r * 0.42, T(0, bottom + 0.03 + i * (top - bottom - 0.04) / n, -0.04), carti, bevel=0.006, seg=24))
    for sx in (-1, 1):
        o.append(tube('bro', [T(0, bottom + 0.01, -0.04), T(sx * 0.1, bottom - 0.1, -0.05), T(sx * 0.26, bottom - 0.3, -0.06), T(sx * 0.34, bottom - 0.36, -0.06)], r * 0.7, mucosa))
    return o


def lungs(at=(0, 0, 0), s=1.0, gap=0.2, rings=True):
    """hai lá phổi + khí quản; `at` = giữa đáy hai phổi; trả về [phổi phải người (bên trái hình), phổi trái người, các mảnh khí quản]"""
    R = lung(-1, 'lungR')
    L = lung(1, 'lungL')
    pieces = [R, L] + (trachea() if rings else [])
    R.location.x -= gap
    L.location.x += gap
    for o in pieces:
        o.scale = (s, s, s)
        o.location = (o.location.x * s + T(*at)[0], o.location.y * s + T(*at)[1], o.location.z * s + T(*at)[2])
    return pieces


def onto(o, pts, lift, front=True):
    """chiếu các điểm (x, y) lên mặt trước (z lớn nhất, front) hoặc sau của lưới `o`; trả điểm three.js nằm ngay trên bề mặt"""
    dg = bpy.context.evaluated_depsgraph_get()
    oe = o.evaluated_get(dg)
    inv = o.matrix_world.inverted()
    out = []
    for x, y in pts:
        zs = 5 if front else -5
        origin = inv @ Vector(T(x, y, zs))
        d = (inv.to_3x3() @ Vector((0, 1 if front else -1, 0))).normalized()
        hit, loc, nor, _ = oe.ray_cast(origin, d)
        if not hit:
            continue
        w = o.matrix_world @ (loc + nor.normalized() * lift)
        out.append((w.x, w.z, -w.y))
    return out


def _dense(path, n=6, wob=0.012, seed=0.0):
    """chèn điểm giữa các điểm của đường và lượn nhẹ theo nhiễu: mạch máu uốn mềm như thật"""
    out = []
    for (x0, y0), (x1, y1) in zip(path, path[1:]):
        for i in range(n):
            t = i / n
            x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            out.append((x + wob * fbm((x * 9, y * 9, seed), 1.0, 2), y + wob * fbm((y * 9, seed, x * 9), 1.0, 2)))
    out.append(path[-1])
    return out


def coronary(o, paths, r, hx, front=True):
    """mạch vành nổi trên mặt tim: mỗi đường là các điểm (x, y) chiếu lên bề mặt, uốn lượn và nhỏ dần về ngọn (3 đoạn)"""
    m = tissue('cor_' + hx, hx, rough=0.28, coat=0.75)
    out = []
    for k, (path, rr) in enumerate(paths):
        q = onto(o, _dense(path, seed=k * 1.7), r * rr * 0.35, front)
        if len(q) < 4:
            continue
        n = len(q)
        cuts = [0, n // 3, 2 * n // 3, n - 1]
        for j in range(3):
            seg = q[cuts[j]:cuts[j + 1] + 1]
            if len(seg) >= 2:
                out.append(tube('cor', [T(*p) for p in seg], r * rr * (1 - 0.28 * j), m))
    return out


def ghost(o, alpha):
    """vật liệu màu đỉnh trong mờ (sơ đồ trên bảng: thấy phế quản và dòng khí bên trong)"""
    for m in o.data.materials:
        if not m:
            continue
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Alpha'].default_value = alpha
        m.blend_method = 'BLEND'
    return o


def remap(objs, fn):
    """biến đổi từng đỉnh theo hàm fn(x, y, z) -> (x, y, z) trong toạ độ three.js (đặt nằm, xoay, kéo dẹt cơ quan)"""
    objs = [_mesh(o) for o in objs]
    for o in objs:
        bpy.ops.object.select_all(action='DESELECT')
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        for v in o.data.vertices:
            x, y, z = fn(v.co.x, v.co.z, -v.co.y)
            v.co = T(x, y, z)
        o.data.update()
    return objs


# ------------------------------------------------------------------ tim nhìn ngoài (mặt trước), cao ≈ 1,2, mỏm tim ở dưới–phải hình
def _myo(p, n):
    """cơ tim đỏ hồng loang, thớ cơ chạy xiên rất mờ, mỡ vàng kem trong rãnh vành (giữa nhĩ và thất)"""
    c = blend('#6A1420', '#A8333F', 0.5 + 0.6 * fbm(p, 3.5))
    k = 1 + 0.07 * math.sin((p[0] * 0.7 + p[1]) * 70 + 3 * fbm(p, 6)) + 0.08 * fbm(p, 14)
    c = tuple(min(1.0, x * k) for x in c)
    c = blend(c, '#6E1622', max(0.0, fbm(p, 9) - 0.25) * 0.9)
    av = 0.6 - 0.18 * p[0]  # rãnh nhĩ–thất chạy chéo
    w = 0.035 * (0.6 + 0.8 * max(0.0, fbm(p, 7)))
    if abs(p[1] - av) < w:
        c = blend(c, '#E3B877', 0.7 * (1 - abs(p[1] - av) / w))
    return c


def _auricle(p, n):
    return blend('#B0503E', '#DC8A66', 0.5 + 0.6 * fbm(p, 9))


def _mesh(o):
    """ống (đường cong) → lưới để vẽ màu đỉnh"""
    if o.type == 'MESH':
        return o
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.convert(target='MESH')
    return bpy.context.object


def wet(name, sss=0.25, coat=0.85, coat_rough=0.15, rough=0.42):
    """mô sống ướt: màu đỉnh `Col`, tán xạ dưới bề mặt (xuyên sáng đỏ ở mép mỏng), lớp phủ bóng ướt"""
    m = tissue(name, '#FFFFFF', rough=rough, coat=coat, vcol=True)
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Coat Roughness'].default_value = coat_rough
    if 'Subsurface Weight' in b.inputs:
        b.inputs['Subsurface Weight'].default_value = sss
        b.inputs['Subsurface Radius'].default_value = (1.0, 0.25, 0.12)
        b.inputs['Subsurface Scale'].default_value = 0.02
    return m


def fuse(name, pairs, voxel=0.009, disp=0.0045, keep=0.3, rel=None, parts=None):
    """gộp mọi khối (cơ tim, tiểu nhĩ, mạch lớn, mạch vành…) thành MỘT lưới liền bằng Voxel Remesh: chỗ mạch bám vào tim tự có
    gờ nối mềm như mô thật. Rồi làm mượt nhẹ, Displace hai lớp (Clouds thô + Musgrave mịn) cho thớ sần, giảm lưới cho web,
    và tô màu đỉnh theo khối gốc gần nhất (mỗi khối một hàm màu). `pairs` = [(vật, hàm màu)]"""
    from mathutils.bvhtree import BVHTree
    dg = bpy.context.evaluated_depsgraph_get()
    objs = [_mesh(o) for o, _ in pairs]
    trees = []
    parts = parts or [None] * len(pairs)
    for o, (_, fn), pf in zip(objs, pairs, parts):
        bpy.ops.object.select_all(action='DESELECT')
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        trees.append((BVHTree.FromObject(o, dg), fn, pf))
    if rel:
        pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
        size = max(max(p[i] for p in pts) - min(p[i] for p in pts) for i in range(3))
        voxel, disp = size * rel, size * rel * 0.5
    copies = []
    for o in objs:
        c = o.copy()
        c.data = o.data.copy()
        bpy.context.scene.collection.objects.link(c)
        copies.append(c)
    bpy.ops.object.select_all(action='DESELECT')
    for c in copies:
        c.select_set(True)
    bpy.context.view_layer.objects.active = copies[0]
    bpy.ops.object.join()
    f = bpy.context.object
    f.name = name
    f.data.name = name

    def apply(md):
        bpy.ops.object.select_all(action='DESELECT')
        f.select_set(True)
        bpy.context.view_layer.objects.active = f
        bpy.ops.object.modifier_apply(modifier=md.name)

    r = f.modifiers.new('remesh', 'REMESH')
    r.mode = 'VOXEL'
    r.voxel_size = voxel
    r.adaptivity = 0.0
    apply(r)
    sm = f.modifiers.new('smooth', 'CORRECTIVE_SMOOTH')
    sm.iterations = 4
    sm.factor = 0.5
    apply(sm)
    for tname, kind, size, amt in (('cl', 'CLOUDS', 0.06, disp), ('mg', 'MUSGRAVE', 0.012, disp * 0.45)):
        _tex[0] += 1
        t = bpy.data.textures.new('%s%d' % (tname, _tex[0]), kind)
        t.noise_scale = size
        d = f.modifiers.new('Displace', 'DISPLACE')
        d.texture = t
        d.strength = amt
        d.mid_level = 0.5
        apply(d)
    dc = f.modifiers.new('dec', 'DECIMATE')
    dc.ratio = keep
    apply(dc)
    for p in f.data.polygons:
        p.use_smooth = True
    f.data.materials.clear()
    f.data.materials.append(wet(name + '_wet'))
    for p in f.data.polygons:
        p.material_index = 0
    me = f.data
    attr = me.color_attributes.get('Col') or me.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    cache = {}
    label = {}
    for li, loop in enumerate(me.loops):
        vi = loop.vertex_index
        if vi not in cache:
            co = me.vertices[vi].co
            best, bd, bp = None, 1e9, None
            for tr, fn, pf in trees:
                hit = tr.find_nearest(co)
                if hit[0] is not None and hit[3] < bd:
                    bd, best, bp = hit[3], fn, pf
            p3 = (co.x, co.z, -co.y)
            cache[vi] = (*best(p3, me.vertices[vi].normal), 1)
            label[vi] = bp(p3) if bp else None
        attr.data[li].color = cache[vi]
    for o in objs:
        bpy.data.objects.remove(o, do_unlink=True)
    if not any(pf for pf in parts):
        return f
    names = sorted({x for x in label.values() if x})
    mats = [wet('%s_%s_wet' % (name, n)) for n in names]
    me.materials.clear()
    for m in mats:
        me.materials.append(m)
    for poly in me.polygons:
        votes = {}
        for vi in poly.vertices:
            votes[label[vi]] = votes.get(label[vi], 0) + 1
        poly.material_index = names.index(max(votes, key=votes.get))
    bpy.ops.object.select_all(action='DESELECT')
    f.select_set(True)
    bpy.context.view_layer.objects.active = f
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.separate(type='MATERIAL')
    bpy.ops.object.mode_set(mode='OBJECT')
    out = []
    for o in [x for x in bpy.data.objects if x.name == f.name or x.name.startswith(f.name + '.')]:
        if not o.data.polygons:
            continue
        mn = o.data.materials[o.data.polygons[0].material_index].name  # '<name>_<bộ phận>_wet'
        n = next(x for x in names if mn.startswith('%s_%s_wet' % (name, x)))
        o.name = '%s_%s' % (name, n)
        o.data.name = o.name
        out.append(o)
    return out


def _vessel_fn(hx, hx2):
    """thành mạch: loang hai tông + vân thớ vòng mảnh + sợi dọc mờ (không trơn như nhựa)"""
    def fn(p, n):
        c = blend(hx, hx2, 0.5 + 0.6 * fbm(p, 5))
        band = 0.5 + 0.5 * math.sin((p[0] + p[1] * 1.3 + p[2]) * 120 + 4 * fbm(p, 9))
        k = 0.9 + 0.12 * band + 0.06 * fbm(p, 30)
        return tuple(min(1.0, x * k) for x in c)
    return fn


def heart_ext(name='heartx'):
    """tim người nhìn ngoài: hai tâm thất (cơ tim bóng ướt), hai tâm nhĩ + tiểu nhĩ vàng cam, cung động mạch chủ đỏ với ba nhánh,
    thân động mạch phổi tím xanh chia hai nhánh, tĩnh mạch chủ trên, tĩnh mạch phổi, mạch vành tím sẫm phân nhánh nổi trên mặt tim"""
    v = blob(name + '_v', [('E', (0.02, 0.42, 0.0), (0.36, 0.3, 0.3)), ('E', (0.08, 0.22, 0.02), (0.3, 0.26, 0.26)), ('E', (0.16, 0.06, 0.03), (0.15, 0.13, 0.14)), ('E', (0.23, -0.04, 0.04), (0.07, 0.07, 0.07)),
                           ('E', (-0.12, 0.4, 0.08), (0.26, 0.24, 0.22)), ('E', (0.2, 0.36, -0.06), (0.24, 0.26, 0.22)),
                           ('E', (-0.28, 0.66, 0.0), (0.18, 0.16, 0.18)), ('E', (0.26, 0.68, -0.1), (0.16, 0.12, 0.16))], None, res=0.01)
    roughen(v, 0.011, 0.06)
    roughen(v, 0.004, 0.02)
    colored(v, _myo, rough=0.3, coat=0.7)
    au = [blob(name + '_au', [('E', (-0.33, 0.62, 0.15), (0.12, 0.09, 0.08)), ('E', (-0.22, 0.6, 0.2), (0.07, 0.05, 0.05))], None, res=0.01),
          blob(name + '_al', [('E', (0.33, 0.66, 0.1), (0.11, 0.07, 0.07)), ('E', (0.4, 0.62, 0.12), (0.06, 0.05, 0.05))], None, res=0.01)]
    for o in au:
        roughen(o, 0.008, 0.05)
        colored(o, _auricle, rough=0.3, coat=0.6)
    red = _vessel_fn('#8A1824', '#B8323C')
    blue = _vessel_fn('#3A2F6A', '#5A4888')
    AO = tissue('aorta_x', '#FFFFFF', rough=0.28, coat=0.7, vcol=True)
    PAm = tissue('pa_x', '#FFFFFF', rough=0.28, coat=0.7, vcol=True)
    aorta = [tube('ao', [T(0.0, 0.62, -0.02), T(-0.02, 0.86, 0.0), T(0.06, 1.04, -0.02), T(0.24, 1.08, -0.1), T(0.36, 0.98, -0.18), T(0.38, 0.7, -0.24)], 0.085, AO)]
    for x0, h in ((0.02, 1.27), (0.13, 1.28), (0.24, 1.25)):
        aorta.append(tube('br', [T(x0, 1.05, -0.06), T(x0 - 0.01, h, -0.07)], 0.032, AO))
    pa = [tube('pa', [T(-0.06, 0.56, 0.18), T(-0.02, 0.76, 0.16), T(0.06, 0.86, 0.06)], 0.08, PAm),
          tube('rpa', [T(0.06, 0.86, 0.06), T(0.3, 0.88, 0.02), T(0.5, 0.86, -0.02)], 0.05, PAm),
          tube('lpa', [T(0.02, 0.84, 0.02), T(-0.2, 0.9, -0.08), T(-0.4, 0.86, -0.1)], 0.045, PAm)]
    svc = [tube('svc', [T(-0.3, 0.66, -0.04), T(-0.3, 0.9, -0.04), T(-0.28, 1.12, -0.04)], 0.06, PAm), tube('ivc', [T(-0.28, 0.48, -0.08), T(-0.3, 0.3, -0.1)], 0.055, PAm)]
    pv = [tube('pv', [T(0.3, 0.7, -0.14 + dz), T(0.52, 0.72 + dz * 0.4, -0.16 + dz)], 0.032, AO) for dz in (-0.05, 0.05)]
    # mạch vành chiếu lên mặt trước tâm thất: động mạch liên thất trước + các nhánh chéo, tĩnh mạch tim lớn đi kèm, nhánh mũ theo rãnh nhĩ–thất
    LAD = [(-0.05, 0.58), (-0.03, 0.46), (0.02, 0.34), (0.08, 0.22), (0.13, 0.11), (0.16, 0.04)]
    paths = [(LAD, 1.0)]

    def twigs(path, rr, depth, seed):
        """nhánh mọc dọc một mạch: chĩa hai bên luân phiên, ngắn và nhỏ dần, phân tiếp `depth` tầng"""
        if depth == 0:
            return
        n = len(path)
        for i in range(1, n - 1):
            (x0, y0), (x1, y1) = path[i - 1], path[i]
            ang = math.atan2(y1 - y0, x1 - x0) + (0.75 if (i + seed) % 2 else -0.75)
            ln = 0.06 + 0.05 * depth
            sub = [(x1, y1)]
            for k in range(1, 4):
                a = ang + 0.25 * math.sin(k + seed + i)
                sub.append((sub[-1][0] + ln / 3 * math.cos(a), sub[-1][1] + ln / 3 * math.sin(a)))
            paths.append((sub, rr * 0.55))
            twigs(sub, rr * 0.55, depth - 1, seed + i)

    twigs(LAD, 1.0, 2, 0)
    for main in ([(-0.4, 0.62), (-0.25, 0.6), (-0.1, 0.58), (0.1, 0.55), (0.3, 0.5), (0.42, 0.44)], [(0.3, 0.5), (0.32, 0.38), (0.3, 0.25), (0.26, 0.14)], [(-0.3, 0.6), (-0.32, 0.47), (-0.28, 0.32), (-0.2, 0.18)]):
        paths.append((main, 0.8))
        twigs(main, 0.7, 1, len(paths))
    cor = coronary(v, paths, 0.022, '#3E2350')
    VEIN_LAD = [(x + 0.035, y + 0.01) for x, y in LAD]
    vein = coronary(v, [(VEIN_LAD, 0.7)], 0.016, '#6A2E3E')
    art = _vessel_fn('#24123A', '#43275A')
    ven = _vessel_fn('#5A1E30', '#7E2E44')
    pairs = [(v, _myo)] + [(o, _auricle) for o in au] + [(o, red) for o in aorta + pv] + [(o, blue) for o in pa + svc] + [(o, art) for o in cor] + [(o, ven) for o in vein]

    def wall(p):
        """mặt tim: trên rãnh nhĩ–thất là tâm nhĩ, dưới là tâm thất; trái / phải theo rãnh liên thất trước"""
        if p[1] > 0.6 - 0.18 * p[0] + 0.02:
            return 'ra' if p[0] < 0.02 else 'la'
        return 'rv' if p[0] < -0.05 + (0.58 - p[1]) * 0.39 else 'lv'
    tags = [wall] + [(lambda p: 'ra' if p[0] < 0 else 'la')] * len(au) + [(lambda p: 'aorta')] * len(aorta) + [(lambda p: 'pv')] * len(pv) +         [(lambda p: 'pa')] * len(pa) + [(lambda p: 'vc')] * len(svc) + [wall] * (len(cor) + len(vein))
    return fuse(name, pairs, parts=tags)



def organify(name, objs, fn, rel=0.008, keep=0.35):
    """một cơ quan (một hay nhiều khối, một hàm màu) → khối liền ướt: remesh voxel theo cỡ, mượt, Displace, màu đỉnh, shader ướt"""
    return fuse(name, [(o, fn) for o in objs], rel=rel, keep=keep)


def flesh_from(objs, var=0.16):
    """hàm màu loang lấy từ màu nền vật liệu đầu tiên (cho cơ quan sơ đồ trên bảng): loang hai tầng + lưới mao mạch sẫm mảnh"""
    m = next((m for o in objs for m in o.data.materials if m), None) if objs and hasattr(objs[0].data, 'materials') else None
    base = tuple(m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value[:3]) if m else (0.7, 0.3, 0.3)
    dark = tuple(x * 0.55 for x in base)

    def fn(p, n):
        k = 1 + var * fbm(p, 3) + 0.07 * fbm(p, 16)
        c = tuple(min(1.0, x * k) for x in base)
        r = abs(fbm(p, 5, 2))
        return blend(c, dark, (1 - r / 0.04) * 0.5) if r < 0.04 else c
    return fn


def refuse(o, rel=0.008, keep=0.4):
    """cơ quan đã tô màu đỉnh sẵn → khối liền ướt giữ nguyên màu cũ: màu mỗi đỉnh mới lấy từ mặt gần nhất của lưới gốc"""
    from mathutils.bvhtree import BVHTree
    o = _mesh(o)
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    me = o.data
    tree = BVHTree.FromObject(o, bpy.context.evaluated_depsgraph_get())
    col = me.color_attributes.get('Col')
    face = {}
    for poly in me.polygons:
        if col:
            cs = [col.data[li].color for li in poly.loop_indices]
            face[poly.index] = tuple(sum(c[i] for c in cs) / len(cs) for i in range(3))
        else:
            m = me.materials[poly.material_index] if poly.material_index < len(me.materials) else None
            face[poly.index] = tuple(m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value[:3]) if m else (0.7, 0.4, 0.4)

    def fn(p, n):
        hit = tree.find_nearest(Vector((p[0], -p[2], p[1])))
        c = face.get(hit[2], (0.7, 0.4, 0.4)) if hit[0] is not None else (0.7, 0.4, 0.4)
        k = 1 + 0.06 * fbm(p, 18)
        return tuple(min(1.0, x * k) for x in c)
    return fuse(o.name + '_w', [(o, fn)], rel=rel, keep=keep)


_ZA = {}


def zanat(prefix):
    """bộ phận cơ quan từ bản giải phẫu mở Z-Anatomy đã xử lý (`assets/zanat-organs.glb`, xem `zanat_build.py`; CC BY-SA 4.0):
    {tên sau tiền tố: vật}; rỗng nếu chưa có tệp (khi đó các script dùng hình tự dựng)"""
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets', 'zanat-organs.glb')
    if not os.path.exists(path):
        return {}
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    out = {}
    for o in set(bpy.data.objects) - before:
        if o.type == 'MESH' and o.name.startswith(prefix):
            out[o.name[len(prefix):]] = o
        else:
            bpy.data.objects.remove(o, do_unlink=True)  # bộ phận của nơi dùng khác: không để lọt vào tệp xuất
    return out
