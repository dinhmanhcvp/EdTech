import * as THREE from 'three';
import type {Kit} from './Stage3D';
import {V, swarm} from './Scenes3DMore';
import {loadModel} from './labParts';
import {wetAll} from './tissueShader';

/**
 * Tim người cắt bổ mặt trước dựng bằng Blender (`tools/lab-models/heart_model.py` → `public/models/heart.glb`) cho template `BIO_HEART_CIRCULATION`.
 * Bộ phận = nút `heart_<id>` (id của preset). Đường máu (`HEART_LOOPS`) đi qua đúng tâm các mạch và buồng tim của mô hình: đổi hình ở Blender phải đổi ở đây.
 */
export const HEART_PARTS = ['lung', 'body', 'vc', 'ra', 'valve-r', 'rv', 'pa', 'pv', 'la', 'valve-l', 'lv', 'aorta'] as const;

type P3 = [number, number, number];
const VENOUS: P3[] = [[-0.6, -2.62, -0.1], [-0.8, -2.3, -0.2], [-0.9, -1.7, -0.35], [-0.85, -0.8, -0.35], [-0.8, 0.1, -0.05], [-0.72, 0.5, 0.06], [-0.4, 0.2, 0.02], [-0.42, -0.5, 0.06], [-0.2, -0.1, 0.18], [-0.1, 0.3, 0.3], [0.0, 0.9, 0.42], [0.05, 1.3, 0.35]];
const ARTERIAL: P3[] = [[0.55, 0.6, -0.22], [0.42, 0.28, -0.06], [0.45, -0.5, 0.02], [0.3, -0.2, -0.02], [0.15, 0.2, -0.05], [0.1, 0.9, 0.0], [0.25, 1.55, -0.1], [0.85, 1.75, -0.3], [1.35, 1.3, -0.45], [1.45, 0.3, -0.5], [1.45, -1.5, -0.4], [1.2, -2.25, -0.2], [0.6, -2.66, -0.1], [0.0, -2.7, -0.1]];
/** hai vòng kín (qua phổi phải / phổi trái); `oxy` = khoảng tham số máu giàu O₂ (từ phổi tới giữa lưới mao mạch) */
export const HEART_LOOPS: {pts: P3[]; lung: P3; bed: P3}[] = [-1, 1].map((s) => {
  const lung: P3 = [s * 1.22, 2.5, -0.12];
  return {
    pts: [...VENOUS, [s * 0.55, 1.58, 0.22], [s * 1.05, 2.0, 0.0], lung, [s * 1.0, 1.9, -0.45], [s < 0 ? -0.3 : 0.8, s < 0 ? 1.1 : 1.2, -0.58], [s < 0 ? 0.35 : 0.65, 0.78, -0.5], ...ARTERIAL],
    lung,
    bed: [0.0, -2.7, -0.1],
  };
});
/** điểm trên bộ phận mà đường dẫn chỉ vào, và chỗ đặt nhãn: bộ phận bên phải cơ thể (bên trái hình) ở cột trái, bên trái cơ thể ở cột phải */
const POINT: Record<string, P3> = {
  lung: [-1.3, 2.7, 0.3], body: [-1.0, -2.68, 0.35], vc: [-0.86, 1.4, 0.15], ra: [-0.85, 0.55, 0.1], 'valve-r': [-0.4, 0.1, 0.12], rv: [-0.5, -0.7, 0.12],
  pa: [0.0, 0.95, 0.55], pv: [0.95, 1.85, -0.35], la: [0.62, 0.7, 0.1], 'valve-l': [0.42, 0.18, 0.1], lv: [0.55, -0.85, 0.12], aorta: [1.45, 0.5, -0.35],
};
const LABEL: Record<string, P3> = {
  lung: [-2.5, 2.9, 0.3], vc: [-2.5, 1.7, 0.3], ra: [-2.5, 0.8, 0.3], 'valve-r': [-2.5, 0.05, 0.3], rv: [-2.5, -0.8, 0.3], body: [-2.5, -2.45, 0.3],
  pa: [2.5, 2.8, 0.3], pv: [2.5, 2.0, 0.3], la: [2.5, 1.1, 0.3], 'valve-l': [2.5, 0.3, 0.3], lv: [2.5, -0.55, 0.3], aorta: [2.5, -1.4, 0.3],
};
/** tên ngắn trên hình (tên đầy đủ ở thẻ chú giải bên cạnh) */
const SHORT: Record<string, string> = {lung: 'Phổi', body: 'Các cơ quan', vc: 'TM chủ', ra: 'Nhĩ phải', 'valve-r': 'Van 3 lá', rv: 'Thất phải', pa: 'ĐM phổi', pv: 'TM phổi', la: 'Nhĩ trái', 'valve-l': 'Van 2 lá', lv: 'Thất trái', aorta: 'ĐM chủ'};
const ATRIA = new Set(['ra', 'la']);
const VENTRICLES = new Set(['rv', 'lv']);
const VALVES = new Set(['valve-r', 'valve-l']);

/** pha chu kì tim ~75 nhịp/phút: nhĩ co (0–0,12), thất co (0,12–0,45), giãn chung; trả độ co 0–1 của nhĩ và thất */
export function cardiacPhase(t: number, period = 0.8): {atria: number; ventricles: number} {
  const f = (t / period) % 1;
  return {atria: f < 0.12 ? Math.sin((Math.PI * f) / 0.12) : 0, ventricles: f >= 0.12 && f < 0.45 ? Math.sin((Math.PI * (f - 0.12)) / 0.33) : 0};
}

/**
 * Dựng tim Blender vào cảnh: bộ phận chạm chọn qua `add` (hệ `parts()` của Scenes3DOrgans), trả hàm vẽ mỗi khung hình nhận `s` của template
 * (`sel`, `flow`, `L:<id>`, `T:<id>`). `onFail` khi không tải được mô hình (cảnh dùng bản hình khối cũ).
 */
export function blenderHeart(k: Kit, add: (id: string, obj: THREE.Object3D) => void, onFail: () => void) {
  /** `cut`: bộ phận tim bổ dọc; `ext`: cùng bộ phận ở tim nhìn ngoài (`heart_ext_<id>`, khối liền ướt có mạch vành), bật theo `s.view` */
  const nodes = new Map<string, {obj: THREE.Object3D; s0: THREE.Vector3; cut: THREE.Object3D; ext: THREE.Object3D | null}>();
  let ready = false;
  k.caption('Đang tải mô hình tim…');
  loadModel('/models/heart.glb')
    .then((lib) => {
      for (const id of HEART_PARTS) {
        const src = lib.getObjectByName(`heart_${id}`);
        if (!src) continue;
        const o = src.clone(true);
        const exSrc = lib.getObjectByName(`heart_ext_${id}`);
        // vỏ chung đặt ở chốt co bóp của bộ phận: cả hai bản (bổ dọc / mặt ngoài) cùng đập, cùng được chạm chọn dưới một id
        const g = new THREE.Group();
        g.position.copy(o.position);
        o.position.set(0, 0, 0);
        g.add(o);
        let ex: THREE.Object3D | null = null;
        if (exSrc) {
          ex = exSrc.clone(true);
          ex.position.copy(exSrc.position).sub(g.position);
          ex.visible = false;
          g.add(ex);
          // mạch vành + tĩnh mạch tim (một nút riêng) đi cùng tâm thất trái ở mặt ngoài
          const cor = id === 'lv' ? lib.getObjectByName('heart_ext_cor') : null;
          if (cor) {
            const c = cor.clone(true);
            c.position.copy(cor.position).sub(g.position);
            ex.add(c);
            c.position.sub(ex.position);
          }
        }
        g.traverse((c) => {
          const m = c as THREE.Mesh;
          if (m.isMesh) m.castShadow = m.receiveShadow = true;
        });
        add(id, g);
        // add() đã nhân bản vật liệu: gắn vi bề mặt mô ướt lên bản riêng
        wetAll(o, id === 'lung' ? 14 : id === 'body' ? 6 : 9, id === 'lung' ? 0.0025 : 0.0015, 0.3); // chỉ bản bổ dọc: bản mặt ngoài đã có thớ sần từ Blender
        if (ex)
          ex.traverse((c) => {
            const m = (c as THREE.Mesh).material as THREE.MeshPhysicalMaterial | undefined;
            if (m && 'clearcoat' in m) Object.assign(m, {clearcoat: 0.85, clearcoatRoughness: 0.15, sheen: 0.35, sheenColor: new THREE.Color('#FF6A5A'), sheenRoughness: 0.5});
          });
        nodes.set(id, {obj: g, s0: g.scale.clone(), cut: o, ext: ex});
      }
      ready = nodes.size > 0;
      if (!ready) onFail();
    })
    .catch(onFail);

  const curves = HEART_LOOPS.map((l) => {
    const c = new THREE.CatmullRomCurve3(l.pts.map(([x, y, z]) => V(x, y, z)), true, 'centripetal');
    const near = (q: P3) => {
      let best = 0;
      let bd = Infinity;
      for (let i = 0; i < 400; i++) {
        const d = c.getPointAt(i / 400).distanceTo(V(...q));
        if (d < bd) {
          bd = d;
          best = i / 400;
        }
      }
      return best;
    };
    return {c, from: near(l.lung), to: near(l.bed)};
  });
  const N = 14;
  const blue = swarm(N * 2, 0.09, '#2F5BD3', {roughness: 0.25, emissive: '#2F5BD3', emissiveIntensity: 0.45});
  const red = swarm(N * 2, 0.09, '#FF3B2F', {roughness: 0.25, emissive: '#FF3B2F', emissiveIntensity: 0.45});
  // hạt máu chạy bên trong ống mạch đục: vẽ đè (như soi xuyên thành mạch) để luôn thấy chiều chảy
  for (const m of [blue, red]) {
    Object.assign(m.material as THREE.Material, {depthTest: false, transparent: true, opacity: 0.92});
    m.renderOrder = 3;
  }
  k.scene.add(blue, red);
  // ánh sáng điện ảnh khi xem mặt ngoài: đèn chính ấm, đèn phụ lạnh dịu, đèn viền sau mạnh làm sáng mép ướt và mạch nhỏ
  const rig = new THREE.Group();
  const key = new THREE.DirectionalLight('#FFD2A8', 2.2);
  key.position.set(-3, 3.5, 4);
  const fill = new THREE.DirectionalLight('#9FB8FF', 0.7);
  fill.position.set(4, 0.5, 3);
  const rim = new THREE.DirectionalLight('#FFF1E6', 3.2);
  rim.position.set(1.5, 3, -4.5);
  rim.target.position.set(0, 0, 0);
  rig.add(key, fill, rim, rim.target);
  rig.visible = false;
  k.scene.add(rig);
  // chữ nhỏ (10 px) và tên ngắn: khung tim trên bảng chỉ rộng ~400 px, nhãn to sẽ đè lên tim; tên đầy đủ hiện ở thẻ chú giải khi chọn bộ phận
  const tags = new Map(HEART_PARTS.map((id) => [id, k.label('', '#2B2823', true, 10)]));
  // đường dẫn mảnh từ nhãn tới đúng chỗ trên bộ phận
  const leaders = k.line('#4B473D', 1.2, HEART_PARTS.flatMap((id) => [...LABEL[id], ...POINT[id]]), true);
  Object.assign(leaders.material, {transparent: true, opacity: 0.55});
  k.scene.add(leaders);
  const pt = V();
  const at = V();
  let u = 0;
  let last = performance.now();

  return (s: Record<string, string>) => {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!ready) return;
    const ext = s.view === 'ext';
    rig.visible = ext;
    leaders.visible = !ext;
    // mặt ngoài: phóng máy quay vào tim (zoom ống kính, người dùng vẫn xoay / lăn được)
    const cam = k.camera as THREE.PerspectiveCamera;
    const z = ext ? 1.35 : 1;
    if (Math.abs(cam.zoom - z) > 0.002) {
      cam.zoom += (z - cam.zoom) * Math.min(1, dt * 6);
      cam.updateProjectionMatrix();
    }
    for (const n of nodes.values()) {
      n.cut.visible = !ext;
      if (n.ext) n.ext.visible = ext;
    }
    const {atria, ventricles} = cardiacPhase(now / 1000);
    for (const [id, n] of nodes) {
      if (ATRIA.has(id)) n.obj.scale.copy(n.s0).multiplyScalar(1 - 0.07 * atria);
      else if (VENTRICLES.has(id)) n.obj.scale.set(n.s0.x * (1 - 0.08 * ventricles), n.s0.y * (1 - 0.05 * ventricles), n.s0.z * (1 - 0.08 * ventricles));
      // van nhĩ–thất: mở (lá van buông xuống thất) khi thất giãn, đóng (lá van áp lên vòng van) khi thất co
      else if (VALVES.has(id)) n.obj.scale.set(n.s0.x, n.s0.y * (1 - 0.65 * Math.min(1, ventricles * 2.5)), n.s0.z);
    }
    // máu chảy theo nhịp: dồn nhanh khi thất co tống máu, chậm khi giãn
    u = (u + dt * 0.045 * (0.45 + 2.0 * ventricles)) % 1;
    let a = 0;
    let b = 0;
    if (s.flow !== '0' && !ext)
      curves.forEach((cv, li) => {
        for (let i = 0; i < N; i++) {
          const v = (u + i / N + li * 0.5 / N) % 1;
          cv.c.getPointAt(v, pt);
          const oxy = cv.from < cv.to ? v > cv.from && v < cv.to : v > cv.from || v < cv.to;
          if (oxy) red.at(b++, pt.x, pt.y, pt.z);
          else blue.at(a++, pt.x, pt.y, pt.z);
        }
      });
    blue.flush(a);
    red.flush(b);
    for (const [id, tag] of tags) {
      tag(id === s.sel || ext ? null : at.set(...LABEL[id]), undefined, SHORT[id]);
    }
  };
}
