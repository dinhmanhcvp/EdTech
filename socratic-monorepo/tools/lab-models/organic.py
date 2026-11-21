"""
Hàm dựng hình hữu cơ dùng chung (khối metaball trơn, boolean, phiến lá, vây, vẽ màu đỉnh) cho mẫu mổ (`dissect_parts.py`) và tim của bảng (`heart_model.py`).
Toạ độ three.js như `kit.py`; nhập module này sẽ xoá cảnh Blender hiện tại (qua kit).
"""
import math

import bmesh
import bpy
from mathutils import Vector

from kit import T, box, finish, hexc, join, mat

K = 1 / 0.574  # metaball: bán trục bề mặt = 0,574 · radius · size (đã đo trên Blender 4.5, ngưỡng 0,6)
_n = [0]


def tissue(name, hx, rough=0.42, coat=0.45, vcol=False):
    """mô ướt: lớp phủ bóng nhẹ (xuất thành clearcoat); `vcol`: màu lấy từ màu đỉnh `Col` (vẽ bằng `paint`)"""
    m = mat(name, hexc(hx), rough=rough)
    b = m.node_tree.nodes['Principled BSDF']
    if 'Coat Weight' in b.inputs:
        b.inputs['Coat Weight'].default_value = coat
        b.inputs['Coat Roughness'].default_value = 0.25
    if vcol:
        n = m.node_tree.nodes.new('ShaderNodeVertexColor')
        n.layer_name = 'Col'
        m.node_tree.links.new(n.outputs['Color'], b.inputs['Base Color'])
    return m


def blob(name, elems, material, res=0.025):
    """khối hữu cơ trơn từ các metaball: ('E', tâm, bán trục) elip; ('C', a, b, bán kính) con nhộng nối a–b. Toạ độ three.js."""
    _n[0] += 1
    fam = 'mb%03d' % _n[0]  # metaball cùng họ tên thì dính nhau: mỗi khối một họ riêng
    mb = bpy.data.metaballs.new(fam)
    mb.resolution = res
    mb.render_resolution = res
    mb.threshold = 0.6
    o = bpy.data.objects.new(fam, mb)
    bpy.context.scene.collection.objects.link(o)
    for e in elems:
        el = mb.elements.new()
        if e[0] == 'E':
            _, c, s = e
            el.type = 'ELLIPSOID'
            el.co = T(*c)
            el.radius = K
            el.size_x, el.size_y, el.size_z = s[0], s[2], s[1]
        else:
            _, a, b, r = e
            a, b = Vector(T(*a)), Vector(T(*b))
            el.type = 'CAPSULE'
            el.co = (a + b) / 2
            el.radius = r * K
            el.size_x = max((b - a).length / 2, 1e-3)
            el.rotation = Vector((1, 0, 0)).rotation_difference((b - a).normalized())
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.convert(target='MESH')
    m = bpy.context.object
    m.name = name
    m.data.name = name
    return finish(m, material)


def ell(name, c, s, material, seg=48):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=T(*c), segments=seg, ring_count=seg // 2)
    o = bpy.context.object
    o.name = name
    o.scale = (s[0], s[2], s[1])
    bpy.ops.object.transform_apply(scale=True)
    return finish(o, material)


def half(y=None, x=None, z=None, above=True, big=20):
    """khối hộp rất lớn chiếm nửa không gian (dùng làm dao cắt boolean) phía trên / dưới mặt phẳng y, x hoặc z cho trước"""
    s = 1 if above else -1
    if y is not None:
        return box('cut', (big, big, big), T(0, y + s * big / 2, 0), None, bevel=0)
    if x is not None:
        return box('cut', (big, big, big), T(x + s * big / 2, 0, 0), None, bevel=0)
    return box('cut', (big, big, big), T(0, 0, z + s * big / 2), None, bevel=0)


def boolean(o, cutter, op, material=None, keep=False):
    """o ← o (op) cutter; mặt mới sinh ra lấy vật liệu `material` của dao cắt (mặt cắt: lòng khoang, thớ cơ)"""
    if material is not None:
        cutter.data.materials.clear()
        cutter.data.materials.append(material)
    md = o.modifiers.new('b', 'BOOLEAN')
    md.operation = op
    md.object = cutter
    md.solver = 'EXACT'
    md.material_mode = 'TRANSFER'
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier=md.name)
    if not keep:
        bpy.data.objects.remove(cutter, do_unlink=True)
    return o


def dup(o, name):
    c = o.copy()
    c.data = o.data.copy()
    c.name = name
    bpy.context.scene.collection.objects.link(c)
    return c


def origin(o, at=None):
    """gốc của lưới: điểm `at` (toạ độ three.js) hoặc tâm hộp bao"""
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    if at is None:
        bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
    else:
        bpy.context.scene.cursor.location = T(*at)
        bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    return o


def piece(name, objs, at=None):
    o = join(name, objs) if len(objs) > 1 or objs[0].type != 'MESH' else objs[0]
    o.name = name
    o.data.name = name
    # join giữ góc xoay / tỉ lệ của vật đầu tiên trên nút: áp vào lưới để nút GLB không mang góc xoay (cảnh tự đặt hướng dụng cụ)
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return origin(o, at)


def surf(o, x, z, lift=0.0):
    """độ cao mặt trên của lưới o tại (x, z), tia bắn từ trên xuống"""
    hit, loc, _n2, _i = o.ray_cast(Vector(T(x, 5, z)), Vector((0, 0, -1)))
    return (loc.z if hit else 0.0) + lift


def paint(o, fn, only=None):
    """màu đỉnh `Col` theo vị trí (three.js) và pháp tuyến; mặt có vật liệu khác `only` để trắng (vật liệu đó không dùng màu đỉnh)"""
    me = o.data
    attr = me.color_attributes.get('Col') or me.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    for poly in me.polygons:
        use = only is None or (poly.material_index < len(me.materials) and me.materials[poly.material_index] == only)
        for li in poly.loop_indices:
            if not use:
                attr.data[li].color = (1, 1, 1, 1)
                continue
            v = me.vertices[me.loops[li].vertex_index].co
            c = fn((v.x, v.z, -v.y), poly.normal)
            attr.data[li].color = (*c, 1)


def leaf(name, base, ang, L, W, tilt, cup, material, nu=14, nv=7, twist=0.0):
    """phiến mỏng hình lá / cánh hoa: gốc `base`, hướng ngang góc `ang`, nghiêng lên `tilt`, khum `cup`; dày 0,012"""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    d = Vector((math.cos(ang), 0, math.sin(ang)))
    side = Vector((-math.sin(ang), 0, math.cos(ang)))
    grid = []
    for i in range(nu + 1):
        u = i / nu
        row = []
        w = W * (math.sin(math.pi * min(u * 1.08, 1.0)) ** 0.7) * (0.35 + 0.65 * u ** 0.4)
        for j in range(nv + 1):
            v = j / nv * 2 - 1
            r = u * L
            p = Vector(base) + d * (r * math.cos(tilt)) + side * (v * w)
            p.y += r * math.sin(tilt) + cup * (v * v) * w + twist * v * u
            row.append(bm.verts.new(T(p.x, p.y, p.z)))
        grid.append(row)
    for i in range(nu):
        for j in range(nv):
            bm.faces.new((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    s = o.modifiers.new('s', 'SOLIDIFY')
    s.thickness = 0.012
    finish(o, material)
    return o


def polyfin(name, pts, material, thick=0.014):
    """vây mỏng: đa giác phẳng qua các điểm (three.js), làm dày bằng solidify"""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    vs = [bm.verts.new(T(*p)) for p in pts]
    bm.faces.new(vs)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=3, use_grid_fill=True)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    o.modifiers.new('s', 'SOLIDIFY').thickness = thick
    return finish(o, material)


def snake(x0, x1, zs, y, wob=0.03):
    """đường uốn khúc qua lại theo các hàng z (ruột cuộn)"""
    pts = []
    for i, z in enumerate(zs):
        xs = (x0, x1) if i % 2 == 0 else (x1, x0)
        for k in range(5):
            t = k / 4
            pts.append(T(xs[0] + (xs[1] - xs[0]) * t, y + wob * math.sin(k * 1.7 + i), z + wob * math.sin(k * 2.3 + i * 0.7)))
    return pts


def mix(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


# ------------------------------------------------------------------ chi tiết bề mặt: sần, loang màu, đốm, gân
from mathutils import noise  # noqa: E402

_tex = [0]


def roughen(o, amt=0.01, size=0.15, depth=2):
    """bề mặt sần tự nhiên: dịch chuyển đỉnh theo nhiễu mây (gọi trước boolean để mặt cắt vẫn phẳng)"""
    _tex[0] += 1
    tex = bpy.data.textures.new('rough%d' % _tex[0], 'CLOUDS')
    tex.noise_scale = size
    tex.noise_depth = depth
    md = o.modifiers.new('d', 'DISPLACE')
    md.texture = tex
    md.strength = amt
    md.mid_level = 0.5
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier=md.name)
    return o


def fbm(p, s, octaves=3):
    """nhiễu nhiều tầng, xấp xỉ trong [-1, 1]"""
    v, a, f = 0.0, 0.55, s
    for _ in range(octaves):
        v += a * noise.noise(Vector(p) * f)
        a *= 0.5
        f *= 2.0
    return v


def cells(p, s):
    """khoảng cách tới hai tâm ô Voronoi gần nhất (vảy, phế nang, đốm)"""
    d, _pts = noise.voronoi(Vector(p) * s, distance_metric='DISTANCE')
    return d[0], d[1]


def tint(hx, k=1.0):
    return tuple(min(1.0, x * k) for x in hexc(hx))


def blend(a, b, t):
    """trộn hai màu hex (hoặc bộ ba tuyến tính) theo t"""
    a = hexc(a) if isinstance(a, str) else a
    b = hexc(b) if isinstance(b, str) else b
    return mix(a, b, t)


def paintm(o, table):
    """màu đỉnh theo vật liệu: `table` = {vật liệu: hàm(p, n) -> màu tuyến tính}; mặt có vật liệu khác để trắng"""
    me = o.data
    attr = me.color_attributes.get('Col') or me.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    for poly in me.polygons:
        m = me.materials[poly.material_index] if poly.material_index < len(me.materials) else None
        fn = table.get(m)
        for li in poly.loop_indices:
            if fn is None:
                attr.data[li].color = (1, 1, 1, 1)
                continue
            v = me.vertices[me.loops[li].vertex_index].co
            attr.data[li].color = (*fn((v.x, v.z, -v.y), poly.normal), 1)


def colored(o, fn, rough=0.45, coat=0.25, name=None):
    """một vật liệu màu đỉnh cho cả lưới, tô bằng fn(p, n)"""
    m = tissue(name or (o.name + '_m'), '#FFFFFF', rough=rough, coat=coat, vcol=True)
    o.data.materials.clear()
    o.data.materials.append(m)
    for poly in o.data.polygons:
        poly.material_index = 0
    paint(o, fn)
    return o


def mottled(hx, var=0.14, scale=9.0, dark=None, dscale=26.0, dthr=0.12):
    """màu nền loang theo nhiễu; `dark` = màu đốm nhỏ (Voronoi) nếu có"""
    def fn(p, n):
        c = tint(hx, 1 + var * fbm(p, scale))
        if dark:
            d0, _ = cells(p, dscale)
            if d0 < dthr:
                c = blend(c, dark, 1 - d0 / dthr)
        return c
    return fn


def veined(hx, vein, scale=7.0, width=0.05, var=0.1):
    """mô có mạch máu nhỏ chạy ngoằn ngoèo trên bề mặt (dạ dày, ruột, bóng hơi)"""
    def fn(p, n):
        c = tint(hx, 1 + var * fbm(p, 11))
        r = abs(fbm(p, scale, 2))
        return blend(c, vein, max(0.0, 1 - r / width) * 0.8) if r < width else c
    return fn
