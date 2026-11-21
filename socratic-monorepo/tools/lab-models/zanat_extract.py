"""
Bước 1 — trích cơ quan người từ bản giải phẫu mở Z-Anatomy (`Startup.blend`, CC BY-SA 4.0; mô hình gốc BodyParts3D, CC BY-SA 2.1 JP).
Chỉ lấy các nhóm dùng cho /lab và bảng: tim + mạch lớn + mạch vành, phổi + khí quản + phế quản, ống tiêu hóa + tuyến tiêu hóa, cơ hoành.
KHÔNG lấy phần có giấy phép cấm thương mại (NC): thận ("Kidney – Lissie Cowley, CC-BY-NC") và tai trong ("Inner Ear – Dundee, CC-BY-NC-SA").
Đường cong (mạch, phế quản, ruột) được đổi thành lưới; modifier được áp. Xuất GLB thô (giữ tên bộ phận, toạ độ gốc) cho bước 2 (`zanat_build.py`).

Chạy (tắt tự chạy script trong tệp .blend tải về):
  blender -b --disable-autoexec <thư mục>/Startup.blend --python tools/lab-models/zanat_extract.py -- <tệp ra .glb>
"""
import re
import sys

import bpy

OUT = sys.argv[sys.argv.index('--') + 1]
NC = re.compile(r'kidney|renal|cochlea|labyrinth|vestibul|semicircular|utricle|saccule', re.I)
WANT = {
    # tim
    'Right atrium': 'heart', 'Left atrium': 'heart', 'Right ventricle': 'heart', 'Left ventricle': 'heart',
    'Ascending aorta': 'heart', 'Aortic arch': 'heart', 'Brachiocephalic trunk': 'heart', 'Left common carotid artery': 'heart', 'Left subclavian artery': 'heart',
    'Pulmonary trunk': 'heart', 'Bifurcation of pulmonary trunk': 'heart', 'Left pulmonary artery': 'heart', 'Right pulmonary artery': 'heart',
    'Superior vena cava': 'heart', 'Inferior vena cava (thoracic part)': 'heart',
    'Left superior pulmonary vein': 'heart', 'Left inferior pulmonary vein': 'heart', 'Right superior pulmonary vein': 'heart', 'Right inferior pulmonary vein': 'heart',
    # phổi
    'Superior lobe of left lung': 'lung', 'Inferior lobe of left lung': 'lung', 'Superior lobe of right lung': 'lung', 'Middle lobe of right lung': 'lung', 'Inferior lobe of right lung': 'lung',
    'Trachea': 'lung', 'Left main bronchus': 'lung', 'Right main bronchus': 'lung', 'Intermediate bronchus.r': 'lung',
    'Left superior lobar bronchus': 'lung', 'Left inferior lobar bronchus': 'lung', 'Right superior lobar bronchus': 'lung', 'Middle lobar bronchus.r': 'lung', 'Right inferior lobar bronchus': 'lung',
    # tiêu hóa
    'Oesophagus': 'dig', 'Stomach': 'dig', 'Liver': 'dig', 'Gallbladder': 'dig', 'Pancreas': 'dig', 'Duodenum': 'dig', 'Jejunum': 'dig', 'Ileum': 'dig',
    'Caecum': 'dig', 'Vermiform appendix': 'dig', 'Ascending colon': 'dig', 'Transverse colon': 'dig', 'Descending colon': 'dig', 'Sigmoid colon': 'dig', 'Rectum': 'dig',
    # cơ hoành
    'Diaphragm': 'diaph',
    # mắt phải (bổ đôi trên bảng)
    'Cornea.r': 'eye', 'Sclera.r': 'eye', 'Iris.r': 'eye', 'Lens.r': 'eye', 'Retina.r': 'eye', 'Posterior segment of eyeball.r': 'eye',
    'Anterior chamber of eyeball.r': 'eye', 'Optic nerve (II).r': 'eye',
    # tai phải: vành tai + ba xương con (KHÔNG lấy ốc tai / tiền đình: giấy phép NC)
    'Helix.r': 'ear', 'Antihelix.r': 'ear', 'Crura of antihelix.r': 'ear', 'Concha of auricle.r': 'ear', 'Lobule of auricle.r': 'ear',
    'Malleus.r': 'ear', 'Incus.r': 'ear', 'Stapes.r': 'ear',
}
# mạch vành và tĩnh mạch tim: lấy theo nhóm (nhiều nhánh nhỏ)
COR = re.compile(r'coronary artery|interventricular branch|circumflex branch|marginal branch|diagonal branch|cardiac vein|coronary sinus', re.I)

dg = bpy.context.evaluated_depsgraph_get()
picked = []
for o in list(bpy.data.objects):
    if o.type not in ('MESH', 'CURVE') or NC.search(o.name):
        continue
    grp = WANT.get(o.name) or ('heartcor' if COR.search(o.name) and o.type in ('MESH', 'CURVE') else None)
    if not grp:
        continue
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg), depsgraph=dg)
    if not me or not len(me.polygons):
        continue
    me.transform(o.matrix_world)
    n = bpy.data.objects.new('%s|%s' % (grp, o.name), me)
    picked.append(n)
print('MISSING', sorted(set(WANT) - {p.name.split('|', 1)[1] for p in picked}))
scene = bpy.data.scenes.new('Export')
for n in picked:
    scene.collection.objects.link(n)
bpy.context.window.scene = scene if bpy.context.window else scene
for o in bpy.context.view_layer.objects:
    o.select_set(False)
bpy.context.window.scene = scene
for n in picked:
    n.select_set(True)
print('PICKED', len(picked), sum(len(p.data.polygons) for p in picked))
bpy.ops.export_scene.gltf(filepath=OUT, use_selection=True, export_apply=False, export_materials='NONE', export_animations=False)
