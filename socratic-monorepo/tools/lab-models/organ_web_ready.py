"""
Chuẩn bị mô hình cơ quan CÓ SẴN (vd. lưới giải phẫu nhập từ một bộ giải phẫu mở có giấy phép, đã mở trong Blender) cho web 3D:
KHÔNG dựng hình mới, chỉ xử lý các lưới đang CHỌN và GIỮ MỖI BỘ PHẬN LÀ MỘT NÚT RIÊNG (tên nút giữ nguyên) để cảnh three.js
vẫn chạm chọn / tô sáng / gắn nhãn từng bộ phận như các mô hình hiện có.

  1. Gốc và cỡ: cả nhóm được dời về tâm (0, 0, 0) và phóng cho vừa hộp 2 m; từng bộ phận giữ vị trí tương đối.
  2. Giảm lưới: Decimate từng bộ phận theo tỉ lệ diện tích sao cho TỔNG < 40 000 tam giác; Shade Smooth.
  3. Shader mô ướt (Principled BSDF): màu nền loang bằng Noise + ColorRamp (màu theo cơ quan, chỉnh ở ORGAN_COLORS),
     Subsurface 0,28, Coat 0,85 / Coat Roughness 0,15, Roughness theo nhiễu 0,22–0,48, Bump hai tầng cho vi bề mặt.
  4. Nhịp sống: shape key `Pulse` (phồng tỏa tâm ±3 %) chạy vòng 60 khung (tim đập / phổi thở).
  5. Xuất `organ_web_ready.glb` (hoạt ảnh + modifier đã áp + nén Draco).

Chạy trong Blender (đã chọn các lưới):  blender tệp.blend --python tools/lab-models/organ_web_ready.py -- [thư mục xuất] [heart|lung|liver|...]
Lưu ý: texture thủ tục (Noise, Bump) chỉ hiện trong Blender; khi xuất glTF, màu loang cần nướng (bake) ra ảnh hoặc màu đỉnh —
đặt BAKE = True để nướng Base Color vào thuộc tính màu đỉnh `Col` (cảnh web đọc màu đỉnh như các mô hình hiện có).
"""
import math
import os
import sys

import bpy
from mathutils import Vector

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT_DIR = ARGS[0] if ARGS else os.path.dirname(bpy.data.filepath or os.getcwd())
ORGAN = ARGS[1] if len(ARGS) > 1 else 'heart'

MAX_TRIS = 40_000
BOX = 2.0
PULSE = 0.03
FRAMES = 60
BAKE = True
# màu (tối, sáng) theo cơ quan: hex sRGB
ORGAN_COLORS = {
    'heart': ('#6A1420', '#B23A46'),
    'lung': ('#B86A78', '#E9A6AE'),
    'liver': ('#4A1A12', '#7E3324'),
    'kidney': ('#5E1E1E', '#97423A'),
    'stomach': ('#A0444C', '#DE968C'),
    'brain': ('#B88C86', '#E8C7BE'),
}


def srgb(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c) + (1.0,)


def tris(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)


def wet_material(name, dark, light):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 6.0
    noise.inputs['Detail'].default_value = 8.0
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = srgb(dark)
    ramp.color_ramp.elements[1].color = srgb(light)
    nt.links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], b.inputs['Base Color'])
    rr = nt.nodes.new('ShaderNodeMapRange')
    rr.inputs['To Min'].default_value = 0.22
    rr.inputs['To Max'].default_value = 0.48
    nt.links.new(noise.outputs['Fac'], rr.inputs['Value'])
    nt.links.new(rr.outputs['Result'], b.inputs['Roughness'])
    b.inputs['Subsurface Weight'].default_value = 0.28
    b.inputs['Subsurface Radius'].default_value = (1.0, 0.25, 0.12)
    b.inputs['Coat Weight'].default_value = 0.85
    b.inputs['Coat Roughness'].default_value = 0.15
    # vi bề mặt hai tầng: thớ thô + lỗ chân lông mịn
    fine = nt.nodes.new('ShaderNodeTexNoise')
    fine.inputs['Scale'].default_value = 140.0
    coarse = nt.nodes.new('ShaderNodeTexNoise')
    coarse.inputs['Scale'].default_value = 22.0
    b1 = nt.nodes.new('ShaderNodeBump')
    b1.inputs['Strength'].default_value = 0.25
    b2 = nt.nodes.new('ShaderNodeBump')
    b2.inputs['Strength'].default_value = 0.12
    nt.links.new(coarse.outputs['Fac'], b1.inputs['Height'])
    nt.links.new(fine.outputs['Fac'], b2.inputs['Height'])
    nt.links.new(b1.outputs['Normal'], b2.inputs['Normal'])
    nt.links.new(b2.outputs['Normal'], b.inputs['Normal'])
    return m


def main():
    objs = [o for o in bpy.context.selected_objects if o.type == 'MESH']
    if not objs:
        raise SystemExit('Chọn ít nhất một lưới cơ quan trước khi chạy.')
    # áp mọi biến đổi để đo hộp bao thật
    for o in objs:
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.select_all(action='DESELECT')
        o.select_set(True)
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    pts = [o.matrix_world @ v.co for o in objs for v in o.data.vertices]
    lo = Vector([min(p[i] for p in pts) for i in range(3)])
    hi = Vector([max(p[i] for p in pts) for i in range(3)])
    centre = (lo + hi) / 2
    k = BOX / max(hi - lo)
    total = sum(tris(o) for o in objs)
    ratio = min(1.0, MAX_TRIS / max(total, 1))
    dark, light = ORGAN_COLORS.get(ORGAN, ORGAN_COLORS['heart'])
    for o in objs:
        # mỗi bộ phận: dời + phóng quanh tâm nhóm, gốc riêng ở tâm hình học của nó (cảnh chọn / co bóp quanh đó)
        for v in o.data.vertices:
            v.co = (v.co - centre) * k
        o.data.update()
        bpy.ops.object.select_all(action='DESELECT')
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
        if ratio < 1:
            d = o.modifiers.new('dec', 'DECIMATE')
            d.ratio = ratio
            bpy.ops.object.modifier_apply(modifier=d.name)
        for p in o.data.polygons:
            p.use_smooth = True
        o.data.materials.clear()
        o.data.materials.append(wet_material(o.name + '_wet', dark, light))
        # nhịp sống: phồng tỏa từ tâm nhóm ±3 %, vòng 60 khung
        o.shape_key_add(name='Basis')
        sk = o.shape_key_add(name='Pulse')
        for i, v in enumerate(o.data.vertices):
            w = (o.matrix_world @ v.co)
            sk.data[i].co = v.co + (o.matrix_world.inverted().to_3x3() @ w.normalized()) * w.length * PULSE
        for f, val in ((1, 0.0), (FRAMES // 4, 1.0), (FRAMES // 2, 0.0), (FRAMES, 0.0)):
            sk.value = val
            sk.keyframe_insert('value', frame=f)
        if BAKE:
            bake_base_color(o, dark, light)
    bpy.context.scene.frame_start, bpy.context.scene.frame_end = 1, FRAMES
    print('TRIS', sum(tris(o) for o in objs), 'PARTS', [o.name for o in objs])
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT_DIR, 'organ_web_ready.glb'), use_selection=True, export_animations=True, export_apply=True,
                              export_morph=True, export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6)


def bake_base_color(o, dark, light):
    """màu loang (cùng nhiễu với shader) ghi vào màu đỉnh `Col`: glTF / three.js không chạy node thủ tục"""
    from mathutils import noise
    a, b = srgb(dark), srgb(light)
    attr = o.data.color_attributes.get('Col') or o.data.color_attributes.new('Col', 'BYTE_COLOR', 'CORNER')
    for loop in o.data.loops:
        co = o.matrix_world @ o.data.vertices[loop.vertex_index].co
        t = max(0.0, min(1.0, 0.5 + 0.6 * noise.noise(co * 3.0)))
        attr.data[loop.index].color = tuple(a[i] + (b[i] - a[i]) * t for i in range(3)) + (1.0,)
    nt = o.data.materials[0].node_tree
    vc = nt.nodes.new('ShaderNodeVertexColor')
    vc.layer_name = 'Col'
    nt.links.new(vc.outputs['Color'], nt.nodes['Principled BSDF'].inputs['Base Color'])


if __name__ == '__main__':
    main()
