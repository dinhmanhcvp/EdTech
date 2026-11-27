import * as THREE from 'three';
import {SPECIES} from '../../utils/lab/chem/species';
import {SETTLE, isMetal, isPrecip, lookOf, type SolidLook} from '../../utils/lab/chem/looks';
import type {Derived} from '../../utils/lab/chem/types';

/**
 * Chất bên trong một ống nghiệm / cốc của bàn Hóa 3D, vẽ như thật:
 * - mẩu hóa chất rắn đúng hình (mẩu Na nổi chạy trên mặt nước, phoi Mg, hạt Zn, đinh Fe, lá Cu, viên NaOH, đống bột, tinh thể muối…), nhỏ dần khi phản ứng;
 * - kết tủa vừa sinh làm cả dung dịch đục theo màu kết tủa, hạt / bông kết tủa lơ lửng rồi lắng thành lớp đáy (keo bông dày xốp, vón cục, hạt mịn lắng chặt),
 *   keo lơ lửng (lưu huỳnh keo) không lắng;
 * - bọt khí là bong bóng tròn trong suốt, to dần khi nổi, sủi từ bề mặt mẩu kim loại / đá vôi đang phản ứng;
 * - khí có màu (NO₂, Cl₂…) lấp khoảng trống trên dung dịch và bốc khói mờ ra miệng ống; hơi nước nóng thành làn hơi trắng;
 * - lớp gương bạc bám thành ống khi tráng bạc; vạch khum (meniscus) ở mặt thoáng.
 */

let dotTex: THREE.Texture | null = null;
/** đốm mềm tròn (tâm đặc, mép mờ) cho khói / hơi: thay điểm vuông của PointsMaterial */
function softDot(): THREE.Texture | null {
  if (dotTex || typeof document === 'undefined') return dotTex;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const g = cv.getContext('2d');
  if (!g) return null;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.45, 'rgba(255,255,255,0.55)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  dotTex = new THREE.CanvasTexture(cv);
  return dotTex;
}

/** số giả ngẫu nhiên cố định: mẩu và bọt nằm ở chỗ ổn định giữa các khung hình */
const rnd = (i: number) => {
  const a = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return a - Math.floor(a);
};
/** xô lệch đỉnh của hình khối cho mẩu đá / hạt kim loại sần sùi, không tròn trịa */
function rough(geo: THREE.BufferGeometry, amt: number, seed: number): THREE.BufferGeometry {
  const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const k = 1 + (rnd(seed + Math.round(p.getX(i) * 97 + p.getY(i) * 61 + p.getZ(i) * 37)) - 0.5) * amt;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
  }
  geo.computeVertexNormals();
  return geo;
}
const geoCache = new Map<string, THREE.BufferGeometry>();
/** hình một mẩu theo kiểu, kích thước ~1 (đặt tỉ lệ theo cỡ ống) */
function pieceGeo(look: SolidLook, i: number): THREE.BufferGeometry {
  const key = `${look}${i % 3}`;
  let g = geoCache.get(key);
  if (g) return g;
  switch (look) {
    case 'float-metal':
      g = rough(new THREE.SphereGeometry(0.5, 12, 8).scale(1.2, 0.7, 1), 0.25, i);
      break;
    case 'turnings': {
      // phoi bào: dải kim loại mỏng cuộn xoắn
      const pts = Array.from({length: 24}, (_, t) => new THREE.Vector3(Math.cos(t * 0.7) * 0.35, (t / 23 - 0.5) * 0.9, Math.sin(t * 0.7) * 0.35));
      g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.05, 4, false).scale(1, 1, 1);
      break;
    }
    case 'granule':
      g = rough(new THREE.DodecahedronGeometry(0.5, 0), 0.45, i + 3);
      break;
    case 'nail': {
      const shaft = new THREE.CylinderGeometry(0.06, 0.06, 1.6, 8);
      const head = new THREE.CylinderGeometry(0.16, 0.16, 0.05, 12).translate(0, 0.82, 0);
      const tip = new THREE.ConeGeometry(0.06, 0.16, 8).rotateX(Math.PI).translate(0, -0.88, 0);
      g = mergeAll([shaft, head, tip]);
      break;
    }
    case 'foil':
      g = new THREE.BoxGeometry(0.9, 1.3, 0.02).rotateY(0.3);
      break;
    case 'pellet':
      g = new THREE.SphereGeometry(0.5, 12, 8).scale(1, 0.45, 1);
      break;
    case 'powder':
      // đống bột: nón thấp, mặt lổn nhổn
      g = rough(new THREE.ConeGeometry(1, 0.5, 18, 3), 0.18, i + 7);
      break;
    case 'crystal':
      g = new THREE.BoxGeometry(0.5, 0.5, 0.5).rotateY(i).rotateX(i * 0.7);
      break;
    case 'ice':
      g = new THREE.BoxGeometry(1, 0.8, 1);
      break;
    case 'chunk':
    default:
      g = rough(new THREE.BoxGeometry(1, 0.6, 0.8, 2, 2, 2), 0.3, i + 11);
  }
  geoCache.set(key, g);
  return g;
}
function mergeAll(gs: THREE.BufferGeometry[]): THREE.BufferGeometry {
  // ghép vài hình không chỉ số thành một (đủ cho đinh: thân + mũ + mũi)
  const parts = gs.map((x) => (x.index ? x.toNonIndexed() : x));
  const n = parts.reduce((s, x) => s + x.attributes.position.count, 0);
  const pos = new Float32Array(n * 3);
  let o = 0;
  for (const x of parts) {
    pos.set(x.attributes.position.array as Float32Array, o);
    o += x.attributes.position.count * 3;
  }
  const g = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
/** số mẩu một lần cho vào theo kiểu (đống bột, đinh, lá: một; hạt, tinh thể: nhiều) */
const PIECES: Partial<Record<SolidLook, number>> = {'float-metal': 1, turnings: 3, granule: 4, nail: 1, foil: 1, pellet: 4, powder: 1, crystal: 9, chunk: 2, ice: 2};
/** cỡ mẩu so với bán kính ống */
const SIZE: Partial<Record<SolidLook, number>> = {'float-metal': 0.42, turnings: 0.42, granule: 0.3, nail: 0.32, foil: 0.5, pellet: 0.22, powder: 0.6, crystal: 0.12, chunk: 0.32, ice: 0.5};

const NB = 48; // bọt khí tối đa
const NF = 40; // bông / hạt kết tủa lơ lửng tối đa
const NW = 30; // làn khí / hơi

export interface VesselFx {
  /** gọi mỗi khung hình: `lh` = chiều cao cột chất lỏng, `liquidMat` = vật liệu dung dịch để làm đục theo kết tủa */
  update(moles: Record<string, number>, d: Derived, lh: number, now: number, dt: number, liquidMat: THREE.MeshStandardMaterial): void;
}

export function vesselFx(g: THREE.Group, r: number, h: number): VesselFx {
  const tube = r < 0.3;
  const dot = softDot();
  // ---- lớp kết tủa ở đáy: thân trụ + mặt trên là vòm lổn nhổn (keo bông thì xốp, cao; hạt mịn thì phẳng, chặt)
  const layerMat = new THREE.MeshStandardMaterial({color: '#E5E7EB', roughness: 1, transparent: true, opacity: 0.95});
  const layer = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.93, r * 0.93, 1, 32), layerMat);
  const cap = new THREE.Mesh(rough(new THREE.SphereGeometry(r * 0.93, 28, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0.08, 5), layerMat);
  // ---- bông / hạt kết tủa lơ lửng
  const flocMat = new THREE.MeshStandardMaterial({color: '#E5E7EB', roughness: 1, transparent: true, opacity: 0.85, depthWrite: false});
  const flocs = new THREE.InstancedMesh(rough(new THREE.IcosahedronGeometry(1, 0), 0.5, 13), flocMat, NF);
  flocs.frustumCulled = false;
  // ---- bọt khí: quả cầu trong suốt có ánh phản chiếu
  const bubMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.5, depthWrite: false});
  const bubs = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), bubMat, NB);
  bubs.frustumCulled = false;
  const bub = Array.from({length: NB}, (_, i) => ({y: -1, x: 0, z: 0, v: 0, s: 0, t: rnd(i) * 2}));
  // ---- khí có màu trong khoảng trống trên dung dịch + làn khí / hơi ở miệng ống
  // khí nặng đọng sát mặt chất lỏng rồi loãng dần lên miệng (đậm ở đáy cột khí, trong suốt ở miệng): độ trong theo đỉnh
  const headMat = new THREE.MeshBasicMaterial({color: '#B45309', transparent: true, opacity: 0, depthWrite: false, vertexColors: true});
  const headGeo = new THREE.CylinderGeometry(r * 0.95, r * 0.95, 1, 24, 4);
  {
    const p = headGeo.attributes.position as THREE.BufferAttribute;
    const c = new Float32Array(p.count * 4);
    for (let i = 0; i < p.count; i++) c.set([1, 1, 1, Math.pow(Math.max(0, 0.5 - p.getY(i)), 2) * 1.4], i * 4);
    headGeo.setAttribute('color', new THREE.BufferAttribute(c, 4));
  }
  const head = new THREE.Mesh(headGeo, headMat);
  const wispMat = new THREE.PointsMaterial({color: '#FFFFFF', size: tube ? 0.3 : 0.7, sizeAttenuation: true, map: dot, transparent: true, opacity: 0, depthWrite: false});
  const wisp = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(NW * 3), 3)), wispMat);
  wisp.frustumCulled = false;
  // ---- lớp gương bạc bám thành ống (tráng bạc)
  const coatMat = new THREE.MeshStandardMaterial({color: '#E9ECEF', metalness: 1, roughness: 0.12, transparent: true, opacity: 0, side: THREE.DoubleSide});
  const coat = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.985, r * 0.985, 1, 36, 1, true), coatMat);
  // ---- vạch khum ở mặt thoáng: viền đậm hơn dung dịch chạy quanh thành ống
  const menMat = new THREE.MeshBasicMaterial({color: '#FFFFFF', transparent: true, opacity: 0.35, depthWrite: false});
  const meniscus = new THREE.Mesh(new THREE.TorusGeometry(r * 0.92, tube ? 0.008 : 0.014, 6, 36).rotateX(Math.PI / 2), menMat);
  // ---- mẩu hóa chất rắn
  const pieces = new THREE.Group();
  g.add(layer, cap, flocs, bubs, head, wisp, coat, meniscus, pieces);

  type Piece = {mesh: THREE.Mesh; sp: string; look: SolidLook; base: THREE.Vector3; size: number; spin: number};
  let piecesKey = '';
  let piecesList: Piece[] = [];
  const peak = new Map<string, number>();
  const mats = new Map<string, THREE.MeshStandardMaterial>();
  const matOf = (sp: string, look: SolidLook) => {
    let m = mats.get(sp);
    if (!m) {
      const metal = isMetal(look);
      // kim loại: ánh kim vừa phải (độ bóng cao trong phòng sáng làm mẩu kẽm, sắt trắng loá như bạc)
      m = new THREE.MeshStandardMaterial({color: new THREE.Color(SPECIES[sp]?.color ?? '#D8D2C4').multiplyScalar(metal ? 0.7 : 1), metalness: metal ? 0.65 : 0, roughness: metal ? 0.42 : look === 'ice' || look === 'crystal' ? 0.15 : 0.85, transparent: look === 'ice' || look === 'crystal', opacity: look === 'ice' ? 0.6 : look === 'crystal' ? 0.85 : 1});
      mats.set(sp, m);
    }
    return m;
  };
  const rebuild = (solids: string[]) => {
    pieces.clear();
    piecesList = [];
    solids.forEach((sp, si) => {
      const look = lookOf(sp);
      const n = PIECES[look] ?? 2;
      for (let i = 0; i < n; i++) {
        const size = r * (SIZE[look] ?? 0.3) * (0.8 + 0.4 * rnd(si * 17 + i));
        const mesh = new THREE.Mesh(pieceGeo(look, i), matOf(sp, look));
        mesh.castShadow = false;
        // rải trên đáy, mỗi chất một góc; đống bột ở giữa
        const a = (si * 2.4 + i * (Math.PI * 2) / n) % (Math.PI * 2);
        const rr = look === 'powder' || n === 1 ? 0 : r * 0.45 * (0.5 + 0.5 * rnd(i + si * 5));
        const base = new THREE.Vector3(Math.cos(a) * rr, 0, Math.sin(a) * rr);
        mesh.rotation.set(look === 'nail' ? 0.35 : rnd(i + 3) * 3, rnd(i + 5) * 6, look === 'nail' ? 0.25 : rnd(i + 9) * 3);
        pieces.add(mesh);
        piecesList.push({mesh, sp, look, base, size, spin: rnd(i + si) * 6});
      }
    });
  };
  const col = new THREE.Color();
  const tmp = new THREE.Color();
  const M = new THREE.Matrix4();
  const Q = new THREE.Quaternion();
  const S = new THREE.Vector3();
  const P = new THREE.Vector3();
  const E = new THREE.Euler();
  let shown = 0; // chiều cao lớp lắng đang hiện
  let cloudy = 0; // độ đục do kết tủa chưa lắng (0–1)
  let lastPrecip = 0;

  return {
    update(moles, d, lh, now, dt, liquidMat) {
      const t = now / 1000;
      // ---- kết tủa: kiểu của chất nhiều nhất quyết định cách lắng; màu trộn theo lượng
      let pm = 0;
      let main: SolidLook = 'fine';
      let mainMol = 0;
      col.setRGB(0, 0, 0);
      for (const p of d.precipitates) {
        const look = lookOf(p.species);
        if (!isPrecip(look)) continue;
        pm += p.mol;
        col.add(tmp.set(p.color).multiplyScalar(p.mol));
        if (p.mol > mainMol) {
          mainMol = p.mol;
          main = look;
        }
      }
      if (pm > 0) col.multiplyScalar(1 / pm);
      const st = SETTLE[main as keyof typeof SETTLE] ?? SETTLE.fine;
      const target = pm > 0 ? Math.min(lh > 0 ? lh * 0.7 : 0.3, (0.02 + Math.log10(1 + pm * 4e4) * 0.05) * st.bulk * (tube ? 1 : 0.6)) : 0;
      // kết tủa mới sinh: cả dung dịch đục màu kết tủa, rồi trong dần khi lắng (keo lơ lửng thì đục mãi)
      if (pm > lastPrecip * 1.02 + 1e-9) cloudy = Math.min(1, cloudy + 0.8);
      lastPrecip = pm;
      if (main === 'colloid') cloudy = pm > 0 ? 1 : 0;
      else cloudy = Math.max(0, cloudy - dt * 0.12 * st.speed);
      shown += ((main === 'colloid' ? 0 : target) * (1 - cloudy * 0.8) - shown) * (1 - Math.exp(-dt * 0.8 * st.speed));
      layer.visible = cap.visible = shown > 0.003;
      if (layer.visible) {
        layerMat.color.copy(col);
        layerMat.opacity = main === 'gel' ? 0.82 : 0.97;
        layer.scale.y = shown;
        layer.position.y = 0.02 + shown / 2;
        cap.position.y = 0.02 + shown;
        cap.scale.set(1, main === 'gel' ? Math.min(1, shown / (r * 0.6)) * 0.5 : main === 'curd' ? 0.25 : 0.06, 1);
      }
      if (pm > 0 && lh > 0.01) {
        liquidMat.color.lerp(col, cloudy * 0.75);
        liquidMat.opacity = Math.max(liquidMat.opacity, Math.min(0.95, 0.35 + cloudy * 0.6));
      }
      // bông / hạt lơ lửng: rơi chậm dần về lớp đáy; keo bông to và mờ, vón cục trắng đục, hạt mịn li ti, keo lơ lửng rung tại chỗ
      const nf = pm > 0 && lh > 0.02 ? Math.round(NF * Math.max(main === 'colloid' ? 1 : 0, cloudy)) : 0;
      flocMat.color.copy(col);
      flocMat.opacity = main === 'gel' ? 0.5 : 0.85; // bông keo hydroxide trong mờ, vón cục bạc halide đục
      const fs = r * (main === 'gel' ? 0.11 : main === 'curd' ? 0.09 : 0.03);
      for (let i = 0; i < NF; i++) {
        if (i >= nf) {
          S.setScalar(0);
          M.compose(P.set(0, -5, 0), Q, S);
        } else {
          const u = main === 'colloid' ? rnd(i * 3) : (t * 0.12 * st.speed + rnd(i)) % 1;
          const y = 0.02 + shown + (1 - u) * Math.max(0, lh - shown - 0.02);
          const jit = main === 'colloid' ? 0.01 * Math.sin(t * 3 + i) : 0;
          P.set(Math.sin(i * 5.3 + t * 0.3) * r * 0.7 + jit, y, Math.cos(i * 2.9 + t * 0.2) * r * 0.7);
          Q.setFromEuler(E.set(i, t * 0.4 + i, 0));
          S.setScalar(fs * (0.6 + 0.8 * rnd(i + 7)));
          M.compose(P, Q, S);
        }
        flocs.setMatrixAt(i, M);
      }
      flocs.instanceMatrix.needsUpdate = true;

      // ---- mẩu hóa chất rắn: đổi danh sách khi có chất rắn mới / tan hết; nhỏ dần theo lượng còn lại
      const solids = Object.keys(moles)
        .filter((sp) => SPECIES[sp]?.phase === 's' && moles[sp] > 1e-7 && !isPrecip(lookOf(sp)) && lookOf(sp) !== 'mirror')
        .sort();
      const key = solids.join('|');
      if (key !== piecesKey) {
        piecesKey = key;
        rebuild(solids);
      }
      const surface = 0.02 + Math.max(lh, 0);
      const floor = 0.02 + shown;
      for (const pc of piecesList) {
        const mol = moles[pc.sp] ?? 0;
        const pk = Math.max(peak.get(pc.sp) ?? 0, mol);
        peak.set(pc.sp, pk);
        const k = pk > 0 ? Math.cbrt(mol / pk) : 0;
        pc.mesh.visible = k > 0.05;
        const sz = pc.size * Math.max(0.05, k);
        pc.mesh.scale.setScalar(pc.look === 'powder' ? sz : sz);
        if (pc.look === 'powder') pc.mesh.scale.set(sz, sz * 0.6, sz);
        if (pc.look === 'float-metal' && lh > 0.02) {
          // natri nổi, chạy vòng trên mặt nước khi đang phản ứng, nhỏ dần thành giọt tròn
          const run = d.bubbles > 0.05 ? t * 2.6 : 0;
          pc.mesh.position.set(Math.cos(run + pc.spin) * r * 0.45, surface - sz * 0.25, Math.sin(run + pc.spin) * r * 0.45);
          pc.mesh.rotation.y = run * 2;
        } else if (pc.look === 'ice' && lh > 0.02) {
          pc.mesh.position.set(pc.base.x, surface - sz * 0.35 + 0.006 * Math.sin(t + pc.spin), pc.base.z);
        } else if (pc.look === 'nail' || pc.look === 'foil') {
          pc.mesh.position.set(pc.base.x, floor + sz * 0.7, pc.base.z);
        } else {
          pc.mesh.position.set(pc.base.x, floor + sz * (pc.look === 'powder' ? 0.15 : 0.35), pc.base.z);
        }
      }

      // ---- bọt khí: sủi từ mặt mẩu chất rắn đang phản ứng (nếu có), không thì từ đáy; to dần và lắc lư khi nổi, vỡ ở mặt thoáng
      const nb = lh > 0.02 ? Math.round(d.bubbles * NB) : 0;
      const srcs = piecesList.filter((pc) => pc.mesh.visible);
      const bs = r * (tube ? 0.07 : 0.045);
      for (let i = 0; i < NB; i++) {
        const b = bub[i];
        if (i < nb) {
          if (b.y < 0 || b.y > lh) {
            // sinh bọt mới (lệch pha để không nổi đồng loạt)
            b.t -= dt;
            if (b.t <= 0) {
              const src = srcs.length ? srcs[i % srcs.length].mesh.position : null;
              b.x = (src ? src.x : Math.sin(i * 7.1) * r * 0.55) + (rnd(i + t) - 0.5) * r * 0.25;
              b.z = (src ? src.z : Math.cos(i * 3.3) * r * 0.55) + (rnd(i * 2 + t) - 0.5) * r * 0.25;
              b.y = src ? Math.min(lh - 0.01, src.y) : floor;
              b.v = 0.25 + rnd(i + 1) * 0.3;
              b.s = 0.5 + rnd(i + 2) * 0.7;
              b.t = rnd(i + t) * 0.6 / Math.max(0.2, d.bubbles);
            }
          } else {
            b.y += b.v * dt;
            b.v += dt * 0.25; // nổi nhanh dần
          }
        } else b.y = -1;
        const on = b.y >= 0 && b.y <= lh;
        const grow = on ? 1 + (b.y / Math.max(0.05, lh)) * 0.5 : 0;
        M.compose(P.set(b.x + Math.sin(t * 9 + i) * r * 0.03, on ? 0.02 + b.y : -5, b.z), Q.identity(), S.setScalar(on ? bs * b.s * grow : 0));
        bubs.setMatrixAt(i, M);
      }
      bubs.instanceMatrix.needsUpdate = true;

      // ---- khí có màu: lấp khoảng trống phía trên dung dịch, khói mờ màu đó thoát ra miệng ống
      let gasColor: string | null = null;
      let gasMol = 0;
      for (const [sp, mol] of Object.entries(moles)) {
        const si = SPECIES[sp];
        if (si?.phase === 'g' && si.color && mol > gasMol) {
          gasColor = si.color;
          gasMol = mol;
        }
      }
      const top = 0.02 + Math.max(0, lh);
      head.visible = !!gasColor && gasMol > 1e-7 && h - top > 0.02;
      if (head.visible) {
        headMat.color.set(gasColor!);
        headMat.opacity = Math.min(0.32, 0.08 + gasMol * 2000);
        head.scale.y = h - top;
        head.position.y = top + (h - top) / 2;
      }
      const hot = d.temp >= 85;
      const want = d.bubbles > 0.12 || hot || gasMol > 1e-7;
      const wp = wisp.geometry.attributes.position as THREE.BufferAttribute;
      for (let q = 0; q < NW; q++) {
        const u = (t / 2.4 + q / NW) % 1;
        // làn khói bay lên, loe rộng và trôi nhẹ theo gió phòng
        wp.setXYZ(q, Math.sin(q * 3.7 + t * 0.7) * r * (0.4 + 1.4 * u) + u * 0.15, want ? h - 0.02 + u * (tube ? 0.8 : 1.3) : -5, Math.cos(q * 2.1 + t * 0.5) * r * (0.4 + 1.4 * u));
      }
      wp.needsUpdate = true;
      wispMat.color.set(gasColor ?? '#FFFFFF');
      wispMat.opacity = gasColor ? Math.min(0.22, 0.06 + gasMol * 1500) : hot ? 0.16 : 0.08 * d.bubbles;

      // ---- gương bạc: bám thành trong ống tới mức chất lỏng đã chạm
      const ag = moles['Ag-mirror'] ?? 0;
      coat.visible = ag > 1e-8;
      if (coat.visible) {
        coatMat.opacity = Math.min(0.95, ag / 3e-5);
        const ch = Math.max(0.12, lh);
        coat.scale.y = ch;
        coat.position.y = 0.02 + ch / 2;
      }
      // ---- vạch khum ở mặt thoáng
      meniscus.visible = lh > 0.02;
      meniscus.position.y = 0.02 + lh;
      menMat.color.copy(liquidMat.color).lerp(tmp.set('#FFFFFF'), 0.35);
      menMat.opacity = 0.25 + liquidMat.opacity * 0.4;
    },
  };
}
