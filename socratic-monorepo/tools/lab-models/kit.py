"""
Bộ dựng hình dùng chung cho các kịch bản Blender của phòng thực hành /lab (vật liệu, khối bo cạnh, tiện tròn, chữ khắc, ống uốn).
Mỗi kịch bản: `from kit import *`, dựng hình theo toạ độ three.js (hàm T() đổi sang Blender), rồi gọi export_glb() và preview().
Nhập module này sẽ xoá cảnh Blender hiện tại.
"""
import math
import sys

import bmesh
import bpy
import numpy as np

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '.'
PREVIEW = argv[1] if len(argv) > 1 else None

bpy.ops.wm.read_factory_settings(use_empty=True)
FONT = bpy.data.fonts.load('C:/Windows/Fonts/arialbd.ttf')


def T(x, y, z):
    """toạ độ three.js -> Blender"""
    return (x, -z, y)


# ------------------------------------------------------------------ vật liệu
def wood_image():
    n = 512
    yy, xx = np.mgrid[0:n, 0:n] / n
    rng = np.random.default_rng(7)
    warp = sum(np.sin(xx * f * 6.283 + p) * a for f, p, a in [(1.3, 0.4, 0.05), (2.7, 1.9, 0.025), (5.1, 4.2, 0.012)])
    rings = 0.5 + 0.5 * np.sin((yy + warp) * 46.0 + np.sin(xx * 9.0) * 0.8)
    fibre = rng.random((n, 1)) * 0.10 + rng.random((n, n)) * 0.05
    v = np.clip(0.62 + 0.28 * rings - fibre, 0, 1)
    rgb = np.stack([v * 0.56 + 0.08, v * 0.33 + 0.04, v * 0.16 + 0.02, np.ones_like(v)], axis=-1)
    img = bpy.data.images.new('wood', n, n)
    img.pixels = rgb.astype(np.float32).ravel()
    img.file_format = 'PNG'
    img.pack()
    return img


def mat(name, color, metallic=0.0, rough=0.5, alpha=1.0, emit=0.0, image=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Metallic'].default_value = metallic
    b.inputs['Roughness'].default_value = rough
    if emit:
        b.inputs['Emission Color'].default_value = (*color, 1)
        b.inputs['Emission Strength'].default_value = emit
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
        m.blend_method = 'BLEND'
    if image:
        tex = m.node_tree.nodes.new('ShaderNodeTexImage')
        tex.image = image
        m.node_tree.links.new(tex.outputs['Color'], b.inputs['Base Color'])
    return m


def hexc(h):
    """mã màu sRGB -> tuyến tính"""
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c)


WOOD = mat('wood', (0.5, 0.3, 0.15), rough=0.55, image=wood_image())
PANEL = mat('panel', hexc('#3B2616'), rough=0.6)
BAKELITE = mat('bakelite', hexc('#17130F'), rough=0.35)
CREAM = mat('cream', hexc('#F4EEDD'), rough=0.7)
INK = mat('ink', hexc('#1D1B16'), rough=0.6)
RED = mat('red', hexc('#C4261A'), rough=0.4)
BLUE = mat('blue', hexc('#2459C9'), rough=0.4)
ORANGE = mat('orange', hexc('#D9481C'), rough=0.45)
CHROME = mat('chrome', (0.82, 0.83, 0.85), metallic=1, rough=0.18)
STEEL = mat('steel', (0.55, 0.57, 0.6), metallic=1, rough=0.35)
IRON = mat('iron', hexc('#22252B'), metallic=0.6, rough=0.55)
BRASS = mat('brass', (0.78, 0.57, 0.2), metallic=1, rough=0.25)
COPPER = mat('copper', (0.72, 0.36, 0.2), metallic=1, rough=0.32)
ALU = mat('alu', (0.8, 0.81, 0.83), metallic=1, rough=0.4)
CASE = mat('case', hexc('#D5D9DE'), metallic=0.2, rough=0.45)
DARK = mat('dark', hexc('#11143A'), rough=0.3)
GLASS = mat('glass', (0.85, 0.94, 1.0), rough=0.05, alpha=0.22)
PANE = mat('pane', (0.9, 0.96, 1.0), rough=0.03, alpha=0.07)  # kính mặt đồng hồ: gần như trong suốt để đọc được số
RUBBER = mat('rubber', hexc('#0E0E10'), rough=0.9)
PAPER = mat('paper', hexc('#FBF9F4'), rough=0.9)
LED = mat('led', hexc('#39FF6A'), emit=2.0)
LAMP = mat('lamp', hexc('#55524B'), rough=0.3)
WHITE = mat('white', (0.9, 0.9, 0.88), rough=0.5)


# ------------------------------------------------------------------ dựng hình
def finish(o, material, parent=None, bevel=0.0, smooth=True):
    if smooth and o.type == 'MESH':
        for p in o.data.polygons:
            p.use_smooth = True
    if bevel:
        b = o.modifiers.new('bevel', 'BEVEL')
        b.width = bevel
        b.segments = 3
        b.limit_method = 'ANGLE'
        b.angle_limit = math.radians(40)
        o.modifiers.new('wn', 'WEIGHTED_NORMAL').keep_sharp = True
    if material:
        o.data.materials.append(material)
    if parent:
        o.parent = parent
    return o


def empty(name, loc, parent=None, rot=(0, 0, 0)):
    e = bpy.data.objects.new(name, None)
    e.location = loc
    e.rotation_euler = rot
    bpy.context.scene.collection.objects.link(e)
    if parent:
        e.parent = parent
    return e


def box(name, size, loc, material, parent=None, bevel=0.012, rot=(0, 0, 0)):
    """size và loc theo hệ Blender (x, y sâu, z cao)"""
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    return finish(o, material, parent, bevel, smooth=bevel > 0)


def cyl(name, r, h, loc, material, parent=None, bevel=0.006, rot=(0, 0, 0), r2=None, seg=40):
    bpy.ops.mesh.primitive_cone_add(vertices=seg, radius1=r, radius2=r if r2 is None else r2, depth=h, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    return finish(o, material, parent, bevel)


def ball(name, r, loc, material, parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=24, ring_count=14)
    o = bpy.context.object
    o.name = name
    return finish(o, material, parent)


def lathe(name, profile, loc, material, parent=None, rot=(0, 0, 0), steps=48):
    """tiện tròn quanh trục z từ biên dạng [(bán kính, cao)]"""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    vs = [bm.verts.new((r, 0, z)) for r, z in profile]
    es = [bm.edges.new((vs[i], vs[i + 1])) for i in range(len(vs) - 1)]
    bmesh.ops.spin(bm, geom=vs + es, angle=2 * math.pi, steps=steps, axis=(0, 0, 1), cent=(0, 0, 0))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    o.location = loc
    o.rotation_euler = rot
    bpy.context.scene.collection.objects.link(o)
    return finish(o, material, parent)


def text(name, body, size, loc, material, parent=None, rot=(0, 0, 0), depth=0.002):
    bpy.ops.object.text_add(location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    d = o.data
    d.body = body
    d.font = FONT
    d.size = size
    d.align_x = 'CENTER'
    d.align_y = 'CENTER'
    d.extrude = depth
    bpy.ops.object.convert(target='MESH')
    o = bpy.context.object
    return finish(o, material, parent, smooth=False)


def tube(name, pts, radius, material, parent=None, smooth=True):
    cu = bpy.data.curves.new(name, 'CURVE')
    cu.dimensions = '3D'
    cu.bevel_depth = radius
    cu.bevel_resolution = 4
    cu.use_fill_caps = True
    sp = cu.splines.new('NURBS' if smooth else 'POLY')
    sp.points.add(len(pts) - 1)
    for p, q in zip(sp.points, pts):
        p.co = (*q, 1)
    if smooth:
        sp.use_endpoint_u = True
        sp.order_u = min(4, len(pts))
        sp.resolution_u = 12
    o = bpy.data.objects.new(name, cu)
    bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(material)
    if parent:
        o.parent = parent
    return o




def join(name, objs):
    """gộp nhiều vật thành một lưới (giữ vật liệu): cảnh three.js nhận một nút duy nhất, gốc toạ độ ở gốc thế giới"""
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        if o.type != 'MESH':
            bpy.context.view_layer.objects.active = o
            o.select_set(True)
            bpy.ops.object.convert(target='MESH')
            o.select_set(False)
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    for o in objs:
        for m in list(o.modifiers):
            bpy.context.view_layer.objects.active = o
            bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.object
    o.name = name
    o.data.name = name
    return o


def export_glb(filename):
    path = OUT.rstrip('/').rstrip(chr(92)) + '/' + filename
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_apply=True, export_yup=True)
    print('GLB', path)


def preview(cam_at, look_at, lens=42):
    """ảnh xem thử bằng Cycles (không nằm trong GLB): gọi SAU export_glb"""
    if not PREVIEW:
        return
    sc = bpy.context.scene
    box('Table', (12, 8, 0.12), T(0, -0.085, 0.3), mat('table', hexc('#1C1F4A'), rough=0.8), bevel=0.02)
    cam = bpy.data.objects.new('Cam', bpy.data.cameras.new('Cam'))
    sc.collection.objects.link(cam)
    cam.location = T(*cam_at)
    look = empty('Look', T(*look_at))
    cam.constraints.new('TRACK_TO').target = look
    cam.data.lens = lens
    sc.camera = cam
    for loc, e, size in ((T(-4, 7, 5), 900, 5), (T(5, 5, 4), 500, 4), (T(0, 4, -6), 300, 6)):
        l = bpy.data.objects.new('L', bpy.data.lights.new('L', 'AREA'))
        l.data.energy = e
        l.data.size = size
        l.location = loc
        sc.collection.objects.link(l)
        l.constraints.new('TRACK_TO').target = look
    w = bpy.data.worlds.new('W')
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs[0].default_value = (*hexc('#0E1030'), 1)
    sc.world = w
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 40
    sc.cycles.use_denoising = True
    sc.render.resolution_x = 1280
    sc.render.resolution_y = 720
    sc.render.filepath = PREVIEW
    bpy.ops.render.render(write_still=True)
    print('PREVIEW', PREVIEW)
