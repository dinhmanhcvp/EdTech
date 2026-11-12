import * as THREE from 'three';
import {GEL_LEN, LANES, alkali, bleach, cross, migrate, no2, titrationPH} from '../../utils/lab/hands/sims/thptChemBio';
import {PID_HZ, balance, beam, closest, collide, differential, fallPos, fallTime, photoCurrent, scatterAngle, stopU, terminal} from '../../utils/lab/hands/sims/thptPhys';
import type {Scene, SimLive} from './HandsSims3D';
import {V, solid, xCyl} from './handsModels';
import {dress, loadModel, partOf, place, type Skin} from './labParts';
import {setLine, type Kit} from './Stage3D';

/** Cảnh 3D của 13 bài THPT (`sims/thptPhys.ts`, `sims/thptChemBio.ts`). Mặt bàn ở y = 0; vùng dựng cảnh x ∈ [−3,5; 3,5], z ∈ [−2,6; 0,4]. */
export const Z = -1.2;
const PHYS = '/models/phys-parts.glb';
/** thiết bị chính của các bài còn lại (kịch bản `tools/lab-models/sims_parts.py`); tải lỗi thì cảnh giữ hình khối */
export const SIMS = '/models/sims-parts.glb';
export const withSims = (use: (lib: THREE.Group) => void) => void loadModel(SIMS).then(use).catch(() => undefined);
export const sig = (live: SimLive) => Object.values(live.v).join('|');
export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
export const box = (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z);
export const yCyl = (r1: number, r2: number, h: number, open = false) => new THREE.CylinderGeometry(r1, r2, h, 32, 1, open);
export const board = (k: Kit, x: number, z: number, w: number, d: number, color = '#15171B') => solid(k.scene, box(w, 0.04, d), color, {rough: 0.7, x, y: 0.02, z});
export function glass(k: Kit, geo: THREE.BufferGeometry, color: string, opacity: number, x: number, y: number, z: number) {
  const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({color, transparent: true, opacity, roughness: 0.06, ior: 1.458, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.5, depthWrite: false, side: THREE.DoubleSide}));
  m.position.set(x, y, z);
  k.scene.add(m);
  return m;
}
export function glow(k: Kit, geo: THREE.BufferGeometry, color: string, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({color, transparent: true}));
  m.position.set(x, y, z);
  k.scene.add(m);
  return m;
}
export function cloud(k: Kit, n: number, color: string, size: number) {
  const pos = new Float32Array(n * 3);
  const attr = new THREE.BufferAttribute(pos, 3);
  const p = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', attr), new THREE.PointsMaterial({color, size, sizeAttenuation: false}));
  p.frustumCulled = false;
  k.scene.add(p);
  return {pos, mat: p.material, flush: (count = n) => ((attr.needsUpdate = true), p.geometry.setDrawRange(0, count))};
}
export function path(k: Kit, color: string, width: number, n: number) {
  const l = k.line(color, width, new Array(n * 3).fill(0));
  k.scene.add(l);
  return l;
}
export const rnd = (n: number) => Array.from({length: n}, () => Math.random());

// ------------------------------------------------------------------ va chạm trên đệm khí
const collision: Scene = ({k, live}) => {
  const plain: THREE.Object3D[] = [solid(k.scene, box(7.2, 0.12, 0.5), '#8A93A0', {metal: 0.7, rough: 0.3, y: 0.3, z: Z})];
  for (const x of [-3.4, 3.4]) plain.push(solid(k.scene, box(0.15, 0.3, 0.5), '#4A5666', {x, y: 0.15, z: Z}));
  k.label('Băng đệm khí (không ma sát)')(V(0, 0.2, Z - 0.6));
  const carts = ['#2F6FD0', '#D9481C'].map((c) => solid(k.scene, box(0.6, 0.3, 0.4), c, {y: 0.51, z: Z}));
  const tags = [k.label('Xe 1'), k.label('Xe 2')];
  // chỗ lắp ngay trên xe: quả cân đặt lên mặt xe, đệm gắn vào đầu xe 2 (phía xe 1 lao tới); vị trí cập nhật mỗi khung hình
  const anchors = {m1: V(-3, 0.5, Z), m2: V(0, 0.5, Z), e: V(-0.45, 0.42, Z)};
  live.anchors = anchors;
  // dụng cụ dựng bằng Blender: băng đệm khí, xe trượt có cờ chắn
  const real = [false, false];
  loadModel(PHYS)
    .then((lib) => {
      place(k.scene, lib, 'AirTrack', [0, 0, Z], plain);
      carts.forEach((cart, i) => {
        const sk = dress(cart, partOf(lib, 'Glider'));
        if (!sk) return;
        sk.mats.find((m) => m.name === 'tint')?.color.set(i ? '#D9481C' : '#2F6FD0');
        real[i] = true;
      });
    })
    .catch(() => undefined);
  let key = '';
  let t0 = 0;
  let run = false;
  let seen = {start: live.events.start ?? 0, stop: live.events.stop ?? 0};
  return (now) => {
    const {m1, m2, v1, e} = live.v;
    if (sig(live) !== key) {
      key = sig(live);
      run = false; // đổi quả cân, đệm hay vận tốc: xe về vạch xuất phát và chờ thả lại
    }
    if ((live.events.start ?? 0) !== seen.start) {
      run = true;
      t0 = now;
    }
    if ((live.events.stop ?? 0) !== seen.stop) run = false;
    seen = {start: live.events.start ?? 0, stop: live.events.stop ?? 0};
    const c = collide(m1, m2, v1, e);
    const S = 2.5; // đơn vị cảnh cho mỗi mét
    const hit = 2.1 / (v1 * S); // xe 1 chạm ĐỆM gắn ở đầu xe 2, nên dừng cách tâm xe 2 một khoảng 0,9
    // chạy MỘT lần rồi dừng ở cuối băng (không tự lặp); chưa thả thì đứng ở vạch xuất phát
    const dt = run ? Math.min((now - t0) / 1000, hit + 3) - hit : -hit;
    const xs = dt < 0 ? [-3 + v1 * S * (dt + hit), 0] : [-0.9 + c.u1 * S * dt, c.u2 * S * dt];
    carts.forEach((cart, i) => {
      // có mô hình thật thì xe giữ nguyên cỡ (khối lượng là quả cân đặt trên xe); chưa có thì kéo cao hình khối
      const h = real[i] ? 1 : 0.5 + 2.5 * (i ? m2 : m1);
      cart.scale.y = h;
      cart.position.set(clamp(xs[i], -3.05, i ? 3.05 : 2.1), 0.36 + 0.15 * h, Z);
      tags[i](V(cart.position.x, 0.6 + 0.3 * h, Z), undefined, `Xe ${i + 1}: ${(!run ? 0 : dt < 0 ? (i ? 0 : v1) : i ? c.u2 : c.u1).toFixed(2)} m/s`);
    });
    anchors.m1.set(carts[0].position.x, 0.505, Z);
    anchors.m2.set(carts[1].position.x + 0.05, 0.505, Z);
    anchors.e.set(carts[1].position.x - 0.46, 0.44, Z);
    if (!run) return 'Xe đang đứng ở vạch xuất phát\nNhấc quả cân ở khay đặt lên xe, gắn đệm vào đầu xe 2, rồi gạt công tắc sang phải để thả xe';
    return `${dt < 0 ? 'Trước va chạm' : 'Sau va chạm'} · e = ${e.toFixed(2)}\nĐộng lượng không đổi; động năng mất ${(c.lost * 100).toFixed(0)} %`;
  };
};

// ------------------------------------------------------------------ ống tia catot Thomson
const thomson: Scene = ({k, live}) => {
  const Y = 0.8;
  const plain: THREE.Object3D[] = [glass(k, xCyl(0.6, 0.6, 6), '#BFD8E8', 0.18, 0, Y, Z), solid(k.scene, xCyl(0.12, 0.12, 0.5), '#6B7380', {metal: 0.8, x: -3.1, y: Y, z: Z})];
  k.label('Súng electron')(V(-3.1, 1.6, Z));
  for (const s of [-1, 1]) plain.push(solid(k.scene, box(1.6, 0.03, 0.5), '#C9CED6', {metal: 0.8, x: -0.5, y: Y + s * 0.3, z: Z}));
  const coils = [-1, 1].map((s) => solid(k.scene, new THREE.TorusGeometry(0.9, 0.06, 12, 48), '#C77B4A', {metal: 0.6, x: -0.5, y: Y, z: Z + s * 0.75}));
  k.label('Cuộn Helmholtz')(V(-0.5, 1.9, Z - 0.75));
  plain.push(solid(k.scene, xCyl(0.58, 0.58, 0.04), '#0C1118', {x: 3, y: Y, z: Z}));
  // dụng cụ dựng bằng Blender: ống thủy tinh có súng electron, bản lệch, màn huỳnh quang; cuộn Helmholtz có cọc đấu dây
  const copper: THREE.MeshStandardMaterial[] = [];
  loadModel(PHYS)
    .then((lib) => {
      place(k.scene, lib, 'CrtTube', [0, Y, Z], plain);
      coils.forEach((c) => copper.push(...(dress(c, partOf(lib, 'Helmholtz'))?.mats.filter((m) => m.name === 'copper') ?? [])));
      key = ''; // vẽ lại để cuộn dây mới nhận độ sáng theo dòng
    })
    .catch(() => undefined);
  const spot = glow(k, new THREE.SphereGeometry(0.07, 12, 8), '#7FFFB0');
  const ray = path(k, '#7FFFB0', 3, 40);
  let key = '';
  let text = '';
  return () => {
    if (sig(live) === key) return text;
    key = sig(live);
    const b = beam(live.v.U, live.v.I, live.v.Ua);
    const end = clamp(b.y * 40, -0.27, 0.27); // độ lệch ở cuối bản, phóng đại 40 lần
    const pts: number[] = [];
    let y = 0;
    for (let i = 0; i < 40; i++) {
      const x = -2.9 + (i / 39) * 5.85;
      const u = (x + 1.3) / 1.6;
      y = clamp(u <= 0 ? 0 : u < 1 ? end * u * u : end * (2 * u - 1), -0.5, 0.5);
      pts.push(x, Y + y, Z);
    }
    setLine(ray, pts);
    spot.position.set(2.96, Y + y, Z);
    coils.forEach((c) => c.material.emissive.set('#FF7A3D').multiplyScalar(live.v.I / 4));
    copper.forEach((m) => m.emissive.set('#FF7A3D').multiplyScalar(live.v.I / 4));
    text = `Tia lệch ${(b.y * 1000).toFixed(1)} mm ở cuối bản (hình phóng đại 40 lần)\nLực điện kéo tia lên, lực từ kéo tia xuống: cân bằng khi v = E/B`;
    return text;
  };
};

// ------------------------------------------------------------------ hãm từ Foucault
const eddy: Scene = ({k, live}) => {
  const tube = glass(k, yCyl(0.35, 0.35, 3, true), '#C77B4A', 0.45, 0, 1.6, Z);
  const slit = solid(k.scene, box(0.1, 3, 0.04), '#0C1118', {y: 1.6, z: Z + 0.35});
  const magnet = new THREE.Group();
  const halves = [solid(magnet, yCyl(0.2, 0.2, 0.15), '#D9481C', {metal: 0.6, y: 0.075}), solid(magnet, yCyl(0.2, 0.2, 0.15), '#2F6FD0', {metal: 0.6, y: -0.075})];
  k.scene.add(magnet);
  // dụng cụ dựng bằng Blender: giá kẹp ống có khay hứng, nam châm trụ hai cực
  loadModel(PHYS)
    .then((lib) => {
      place(k.scene, lib, 'EddyStand', [0, 0, Z]);
      place(magnet, lib, 'Magnet', [0, 0, 0], halves);
    })
    .catch(() => undefined);
  const rings = [0.28, -0.28].map((dy) => ({dy, m: glow(k, new THREE.TorusGeometry(0.37, 0.035, 10, 40).rotateX(Math.PI / 2), '#FFB35C')}));
  k.label('Ống kim loại dài 1 m')(V(0, 3.4, Z));
  const tag = k.label('Dòng Foucault');
  let key = '';
  let t0 = 0;
  return (now) => {
    if (sig(live) !== key) {
      key = sig(live);
      t0 = now;
    }
    const {sigma, w, slit: s} = live.v;
    const vt = terminal(sigma, w, s);
    const T = fallTime(vt);
    const t = ((now - t0) / 1000) % (T + 1);
    const y = 3 - 2.8 * Math.min(1, fallPos(vt, t));
    magnet.position.set(0, y, Z);
    const strength = Number.isFinite(vt) && t < T ? 1 - Math.exp((-t * 9.81) / vt) : 0;
    rings.forEach((r) => {
      r.m.position.set(0, y + r.dy, Z);
      r.m.material.opacity = strength;
    });
    tag(strength > 0.05 ? V(0.9, y, Z) : null);
    tube.material.color.set('#9AA3AE').lerp(new THREE.Color('#C77B4A'), sigma / 60);
    tube.scale.x = tube.scale.z = 1 + w / 25;
    slit.visible = s > 0.5;
    slit.scale.y = s / 100;
    return `Rơi 1 m mất ${T.toFixed(2)} s (rơi tự do: 0,45 s)\nNam châm rơi làm từ thông qua thành ống biến thiên: dòng Foucault sinh lực cản`;
  };
};

// ------------------------------------------------------------------ quang điện
const photo: Scene = ({k, live}) => {
  const XC = -1.2;
  const XA = 1.8;
  const Y = 0.9;
  const lampBox = solid(k.scene, box(0.6, 0.4, 0.5), '#3A3F47', {x: -3, y: 1.9, z: Z});
  k.label('Đèn + kính lọc sắc')(V(-3, 2.5, Z));
  const cellPlain: THREE.Object3D[] = [solid(k.scene, box(0.08, 1.2, 1.2), '#9AA3AE', {metal: 0.8, x: XC - 0.04, y: Y, z: Z})];
  k.label('Catot')(V(XC, 1.8, Z));
  cellPlain.push(solid(k.scene, box(0.08, 1.2, 1.2), '#6B7380', {metal: 0.8, x: XA + 0.04, y: Y, z: Z}));
  k.label('Anot')(V(XA, 1.8, Z));
  cellPlain.push(glass(k, xCyl(0.9, 0.9, XA - XC + 0.8), '#BFD8E8', 0.12, (XA + XC) / 2, Y, Z));
  // dụng cụ dựng bằng Blender: tế bào quang điện có đế và cọc đấu dây; hộp đèn trên chân, kính lọc đổi màu theo ánh sáng đang chiếu
  let filter: THREE.MeshStandardMaterial | undefined;
  loadModel(PHYS)
    .then((lib) => {
      place(k.scene, lib, 'PhotoCell', [(XA + XC) / 2, Y, Z], cellPlain);
      filter = place(k.scene, lib, 'LampHouse', [-3, 1.9, Z], [lampBox])?.mats.find((m) => m.name === 'filter');
    })
    .catch(() => undefined);
  const N = 60;
  const light = cloud(k, 30, '#FFFFFF', 5);
  const els = cloud(k, N, '#7FD4FF', 4);
  const u = rnd(N);
  const ph = rnd(N);
  const oy = rnd(N);
  const oz = rnd(N);
  return (now) => {
    const {f, A, U} = live.v;
    const K = stopU(f, A);
    light.mat.color.setHSL(clamp((f - 4) / 3.5, 0, 1) * 0.75, 1, f > 7.9 ? 0.85 : 0.6);
    filter?.color.copy(light.mat.color);
    for (let i = 0; i < 30; i++) {
      const p = (now / 700 + i / 30) % 1;
      light.pos.set([-2.8 + p * (XC + 2.8), 1.8 - p * (1.8 - Y) + (oy[i] - 0.5) * 0.5, Z + (oz[i] - 0.5) * 0.5], i * 3);
    }
    light.flush();
    for (let i = 0; i < N; i++) {
      const reach = U <= 0 ? 1 : Math.min(1, (u[i] * K) / U);
      const p = (now / 1600 + ph[i]) % 1;
      const s = reach >= 1 ? p : (p < 0.5 ? p * 2 : 2 - p * 2) * reach;
      els.pos.set([XC + s * (XA - XC), Y + (oy[i] - 0.5), Z + (oz[i] - 0.5)], i * 3);
    }
    els.flush(K > 0 ? N : 0);
    return `Dòng quang điện ${(photoCurrent(f, A, U) * 100).toFixed(0)} % · U_h cần = ${K.toFixed(2)} V\nElectron chậm bị điện áp hãm đẩy quay lại catot; nhanh nhất có động năng hf − A`;
  };
};

// ------------------------------------------------------------------ tán xạ Rutherford
const rutherford: Scene = ({k, live}) => {
  const CX = 0.5;
  board(k, 0, Z, 7, 2.9);
  solid(k.scene, new THREE.SphereGeometry(0.09, 16, 12), '#E3B341', {metal: 0.7, x: CX, y: 0.1, z: Z});
  k.label('Hạt nhân')(V(CX, 0.5, Z + 0.3));
  withSims((lib) => {
    place(k.scene, lib, 'AlphaSource', [-3.95, 0, Z]);
    place(k.scene, lib, 'ScintScreen', [3.62, 0, Z]);
  });
  k.label('Nguồn hạt α')(V(-3.95, 0.9, Z));
  k.label('Màn ZnS')(V(3.62, 1, Z));
  const N = 240;
  const main = path(k, '#FF9A4D', 4, N);
  const fan = [-3, -2, -1, 1, 2, 3].map(() => path(k, '#5E7A9A', 1.5, N));
  /** quỹ đạo trong lực đẩy Coulomb, đơn vị fm, vận tốc đầu 1: a = (d/2)·r̂/r² */
  const trace = (b: number, d: number, X: number, s: number) => {
    const out: number[] = [];
    let [x, y, vx, vy] = [-X, b, 1, 0];
    for (let i = 0; i < N; i++) {
      const r = Math.hypot(x, y);
      const h = 0.06 * Math.max(r, 0.02 * d);
      vx += ((d / 2) * x * h) / r ** 3;
      vy += ((d / 2) * y * h) / r ** 3;
      x += vx * h;
      y += vy * h;
      const px = CX + x * s;
      const pz = Z - y * s;
      // ra khỏi bảng thì dừng vẽ (lặp lại điểm cuối), không ép dọc theo mép
      if (i && (Math.abs(px) > 3.4 || Math.abs(pz - Z) > 1.4)) out.push(...out.slice(-3));
      else out.push(clamp(px, -3.4, 3.4), 0.08, clamp(pz, Z - 1.4, Z + 1.4));
    }
    return out;
  };
  let key = '';
  let text = '';
  return () => {
    if (sig(live) === key) return text;
    key = sig(live);
    const Zn = Math.round(live.v.Z);
    const d = closest(Zn, live.v.Ek);
    const m = Math.max(live.v.b, d);
    const s = 1.3 / (4 * m); // khung nhìn tự co giãn: nửa chiều cao = 4·max(b, d)
    setLine(main, trace(live.v.b, d, 3.6 / s, s));
    fan.forEach((l, i) => setLine(l, trace([-3, -2, -1, 1, 2, 3][i] * m * 1.2, d, 3.6 / s, s)));
    text = `Lệch ${scatterAngle(Zn, live.v.Ek, live.v.b).toFixed(1)}° · khung nhìn cao ${(8 * m).toFixed(0)} fm (nguyên tử rộng 100 000 fm)\nĐường cam là hạt của bạn; các đường xanh bay xa hạt nhân hơn nên gần như đi thẳng`;
    return text;
  };
};

// ------------------------------------------------------------------ bộ vi sai
const diffScene: Scene = ({k, live}) => {
  const Y = 0.85;
  const wheel = (x: number) => {
    const g = new THREE.Group();
    g.position.set(x, Y, Z);
    solid(g, xCyl(0.7, 0.7, 0.35), '#1B1E23', {rough: 0.9});
    solid(g, box(0.37, 0.16, 1.2), '#E8E2D4', {});
    k.scene.add(g);
    return g;
  };
  const left = wheel(-2.4);
  const right = wheel(2.4);
  for (const s of [-1, 1]) solid(k.scene, xCyl(0.06, 0.06, 2), '#9AA3AE', {metal: 0.8, x: s * 1.3, y: Y, z: Z});
  const cage = new THREE.Group();
  cage.position.set(0, Y, Z);
  solid(cage, new THREE.TorusGeometry(0.55, 0.09, 12, 40).rotateY(Math.PI / 2), '#E3B341', {metal: 0.7, x: 0.3});
  solid(cage, box(0.5, 0.08, 0.9), '#6B7380', {metal: 0.6});
  const spider = solid(cage, yCyl(0.16, 0.16, 0.14), '#D9481C', {metal: 0.5, z: 0.3});
  spider.rotation.x = Math.PI / 2;
  solid(spider, box(0.34, 0.15, 0.05), '#FFFFFF', {});
  k.scene.add(cage);
  const mud = glass(k, box(1.6, 0.06, 1.6), '#6B4A2B', 0.9, -2.4, 0.04, Z);
  k.label('Vành chậu + vỏ vi sai')(V(0.3, 1.9, Z));
  k.label('Bánh răng hành tinh', '#D9481C')(V(0, 0.2, Z + 0.9));
  const tags = [k.label('Bánh trái'), k.label('Bánh phải')];
  const a = [0, 0, 0, 0];
  return (_now, dt) => {
    const d = differential(live.v.R, live.v.mu, live.v.lock);
    a[0] += d.wl * dt * 2.5;
    a[1] += d.wr * dt * 2.5;
    a[2] += dt * 2.5;
    a[3] += (d.wr - d.wl) * dt * 4;
    left.rotation.x = a[0];
    right.rotation.x = a[1];
    cage.rotation.x = a[2];
    spider.rotation.y = a[3];
    mud.material.opacity = 0.9 * (1 - live.v.mu);
    tags[0](V(-2.4, 1.9, Z), undefined, `Bánh trái ×${d.wl.toFixed(2)}`);
    tags[1](V(2.4, 1.9, Z), undefined, `Bánh phải ×${d.wr.toFixed(2)}`);
    return `${d.locked ? 'Vi sai KHOÁ' : 'Vi sai mở'} · ${d.stuck ? 'xe sa lầy' : 'xe chạy'}\nBánh răng hành tinh (đỏ) chỉ tự xoay khi hai bánh xe quay khác tốc độ`;
  };
};

// ------------------------------------------------------------------ xe tự cân bằng PID
const pid: Scene = ({k, live}) => {
  const wheel = solid(k.scene, yCyl(0.35, 0.35, 0.9).rotateX(Math.PI / 2), '#1B1E23', {rough: 0.9, y: 0.35, z: Z + 0.6});
  const body = new THREE.Group();
  solid(body, box(0.3, 1.5, 0.6), '#2F6FD0', {y: 0.75});
  solid(body, box(0.4, 0.25, 0.7), '#E3B341', {y: 1.5});
  k.scene.add(body);
  withSims((lib) => {
    place(body, lib, 'BotBody', [0, 0, 0], [...body.children]);
    dress(wheel, partOf(lib, 'BotWheel'));
  });
  board(k, 0, Z - 0.9, 6.4, 1.1);
  k.label('Góc nghiêng θ theo thời gian (5 s)')(V(0, 0.1, Z - 1.6));
  const N = 5 * PID_HZ;
  const plot = path(k, '#7FFFB0', 3, N);
  const zero = k.line('#5E7A9A', 1.5, [-3.1, 0.06, Z - 0.9, 3.1, 0.06, Z - 0.9]);
  k.scene.add(zero);
  const dot = glow(k, new THREE.SphereGeometry(0.07, 12, 8), '#FFFFFF');
  let key = '';
  let t0 = 0;
  let pushes = 0;
  let r = balance(0, 0, 0);
  return (now) => {
    // bấm "Đẩy xe": cú đẩy mới, mô phỏng chạy lại từ góc nghiêng ban đầu
    const pushed = (live.events.push ?? 0) !== pushes;
    pushes = live.events.push ?? 0;
    if (sig(live) !== key || pushed) {
      key = sig(live);
      t0 = now;
      r = balance(live.v.kp, live.v.ki, live.v.kd);
      const pts: number[] = [];
      for (let i = 0; i < N; i++) pts.push(-3.1 + (i / (N - 1)) * 6.2, 0.07, Z - 0.9 - clamp(r.th[i] * 3, -0.5, 0.5));
      setLine(plot, pts);
    }
    const i = Math.min(N - 1, Math.floor((((now - t0) / 1000) % 6) * PID_HZ));
    const th = r.th[i];
    const x = clamp(th * 2, -2.5, 2.5);
    wheel.position.x = x;
    wheel.rotation.z = -x / 0.35;
    body.position.set(x, 0.35, Z + 0.6);
    body.rotation.z = -th;
    dot.position.set(-3.1 + (i / (N - 1)) * 6.2, 0.1, Z - 0.9 - clamp(th * 3, -0.5, 0.5));
    return `θ = ${((th * 180) / Math.PI).toFixed(1)}° · ${r.fell ? 'xe ngã' : 'đang đứng'}\nMô phỏng lặp lại mỗi 6 giây với bộ hệ số hiện tại`;
  };
};

// ------------------------------------------------------------------ clo khô và clo ẩm
const chlorine: Scene = ({k, live}) => {
  glass(k, yCyl(0.5, 0.5, 0.9), '#BFD8E8', 0.25, -2.7, 0.5, Z);
  solid(k.scene, yCyl(0.45, 0.45, 0.4), '#6B2A7A', {x: -2.7, y: 0.25, z: Z});
  k.label('KMnO₄ + HCl đặc → Cl₂')(V(-2.7, 1.4, Z));
  glass(k, yCyl(0.4, 0.4, 1), '#BFD8E8', 0.25, -1.1, 0.55, Z);
  const acid = solid(k.scene, yCyl(0.36, 0.36, 0.45), '#B58A4A', {x: -1.1, y: 0.27, z: Z});
  const dryTag = k.label('H₂SO₄ đặc làm khô khí');
  const pipe = k.line('#C9CED6', 4, [-2.7, 1, Z, -2.7, 1.3, Z, -1.1, 1.3, Z, -1.1, 0.4, Z, -1.1, 1.2, Z, 1.2, 1.2, Z, 1.2, 0.6, Z]);
  k.scene.add(pipe);
  const jar = glass(k, yCyl(0.95, 0.95, 1.9), '#C8D94A', 0.3, 1.2, 1, Z);
  const cloth = solid(k.scene, box(0.9, 1.1, 0.04), '#C2185B', {x: 1.2, y: 0.8, z: Z});
  k.label('Vải màu')(V(1.2, 2.3, Z));
  const drops = cloud(k, 80, '#DFF3FF', 3);
  const p = rnd(240);
  for (let i = 0; i < 80; i++) {
    const a = p[i * 3] * 6.283;
    const r = Math.sqrt(p[i * 3 + 1]) * 0.85;
    drops.pos.set([1.2 + Math.cos(a) * r, 0.15 + p[i * 3 + 2] * 1.7, Z + Math.sin(a) * r], i * 3);
  }
  return () => {
    const {humid, cl, t} = live.v;
    const b = bleach(humid, cl, t);
    jar.material.opacity = 0.08 + 0.4 * (cl / 100);
    cloth.material.color.set('#C2185B').lerp(new THREE.Color('#F4F1EA'), b);
    drops.flush(Math.round((humid / 100) * 80));
    acid.visible = humid < 1;
    dryTag(V(-1.1, 1.7, Z), undefined, humid < 1 ? 'H₂SO₄ đặc làm khô khí' : 'Bỏ bình làm khô: khí ẩm');
    return `Vải mất ${(b * 100).toFixed(0)} % màu sau ${t.toFixed(0)} s\n${humid < 1 ? 'Clo khô: không có HClO nên không tẩy màu' : 'Clo ẩm: Cl₂ + H₂O ⇌ HCl + HClO, HClO tẩy màu'}`;
  };
};

// ------------------------------------------------------------------ kim loại kiềm với nước
const alkaliScene: Scene = ({k, live}) => {
  glass(k, yCyl(1.4, 1.4, 1.5, true), '#BFD8E8', 0.22, 0, 0.78, Z);
  const water = glass(k, yCyl(1.35, 1.35, 0.95), '#BFE3F5', 0.75, 0, 0.5, Z);
  const metal = solid(k.scene, new THREE.SphereGeometry(1, 20, 14), '#C9CED6', {metal: 0.9, rough: 0.25});
  const flame = glow(k, new THREE.ConeGeometry(0.16, 0.5, 16), '#FFC53D');
  const burst = cloud(k, 90, '#FFE3A3', 4);
  const dir = rnd(180);
  const tag = k.label('Na');
  let ang = 0;
  return (now, dt) => {
    const a = alkali(live.v.metal, live.v.d);
    const r = 0.05 + live.v.d / 45;
    ang += dt * [0.3, 2.5, 4, 7][a.level];
    const x = Math.cos(ang) * 0.8;
    const z = Z + Math.sin(ang) * 0.8;
    metal.scale.setScalar(r);
    metal.position.set(x, 0.98 + r * 0.4, z);
    water.material.color.set('#BFE3F5').lerp(new THREE.Color('#E84F9A'), clamp((a.pH - 8.2) / 3, 0, 1));
    flame.visible = a.level >= 2;
    flame.position.set(x, 1.25 + r, z);
    flame.material.color.set(a.m.flame);
    flame.scale.setScalar(1 + r * 3 + 0.2 * Math.sin(now / 60));
    const u = (now / 700) % 1;
    for (let i = 0; i < 90; i++) {
      const th = dir[i * 2] * 6.283;
      const sp = 0.6 + dir[i * 2 + 1] * 2;
      burst.pos.set([x + Math.cos(th) * sp * u, 1 + sp * u * 1.6 - 3 * u * u, z + Math.sin(th) * sp * u], i * 3);
    }
    burst.flush(a.level === 3 ? 90 : 0);
    tag(V(x, 1.7 + r, z), undefined, `${a.m.sym} ${live.v.d.toFixed(1)} mm`);
    return `pH ≈ ${a.pH.toFixed(1)}: phenolphtalein ${a.pH > 8.2 ? 'chuyển hồng' : 'chưa đổi màu'}\n${a.level === 3 ? 'NỔ: ngoài đời đây là tai nạn bỏng kiềm' : a.level === 2 ? `H₂ bốc cháy, ngọn lửa mang màu của ${a.m.sym}` : 'Kim loại nhẹ hơn nước nên nổi và chạy trên mặt nước'}`;
  };
};

// ------------------------------------------------------------------ cân bằng NO2 – N2O4
const no2Scene: Scene = ({k, live}) => {
  const X0 = -2.6;
  const Y = 0.9;
  glass(k, xCyl(0.52, 0.52, 3.6), '#BFD8E8', 0.2, X0 + 1.8, Y, Z);
  const gas = glass(k, xCyl(0.48, 0.48, 1), '#8B3A1E', 0.3, 0, Y, Z);
  const piston = solid(k.scene, xCyl(0.5, 0.5, 0.12), '#6B7380', {metal: 0.7, y: Y, z: Z});
  const rod = solid(k.scene, xCyl(0.07, 0.07, 3.6), '#9AA3AE', {metal: 0.8, y: Y, z: Z});
  const bath = glass(k, box(4, 0.5, 1.6), '#2F6FD0', 0.45, X0 + 1.8, 0.27, Z);
  const bathTag = k.label('Bể nước');
  const brown = cloud(k, 120, '#C2562A', 5);
  const white = cloud(k, 120, '#F4F1EA', 5);
  const p = rnd(360);
  let key = '';
  let text = '';
  return () => {
    if (sig(live) === key) return text;
    key = sig(live);
    const q = no2(live.v.T, live.v.P);
    const len = 1.7 / live.v.P;
    gas.scale.x = len;
    gas.position.x = X0 + len / 2;
    gas.material.opacity = 0.05 + 0.85 * q.x;
    piston.position.x = X0 + len + 0.06;
    rod.position.x = X0 + len + 1.9;
    bath.material.color.set('#2F6FD0').lerp(new THREE.Color('#D9481C'), live.v.T / 100);
    bathTag(V(X0 + 1.8, 0.1, Z + 1), undefined, `Bể nước ${live.v.T.toFixed(0)} °C`);
    const nb = Math.round(120 * q.x);
    for (let i = 0; i < 120; i++) {
      const a = p[i * 3 + 1] * 6.283;
      const r = Math.sqrt(p[i * 3 + 2]) * 0.4;
      (i < nb ? brown : white).pos.set([X0 + p[i * 3] * len, Y + Math.cos(a) * r, Z + Math.sin(a) * r], (i < nb ? i : i - nb) * 3);
    }
    brown.flush(nb);
    white.flush(120 - nb);
    text = `NO₂ (nâu) ${(q.x * 100).toFixed(0)} % · N₂O₄ (trắng) ${(100 - q.x * 100).toFixed(0)} % số phân tử\nĐộ đậm của ống vẽ theo phần mol NO₂; nén thật thì lúc đầu màu đậm lên rồi mới nhạt đi`;
    return text;
  };
};

// ------------------------------------------------------------------ chuẩn độ
const titration: Scene = ({k, live}) => {
  const X = -2.2;
  solid(k.scene, box(0.08, 3.3, 0.08), '#6B7380', {metal: 0.7, x: X - 0.5, y: 1.65, z: Z});
  glass(k, yCyl(0.09, 0.09, 2), '#BFD8E8', 0.3, X, 2.3, Z);
  const naoh = solid(k.scene, yCyl(0.07, 0.07, 2), '#DFF3FF', {x: X, y: 2.3, z: Z});
  glass(k, yCyl(0.25, 0.75, 1, true), '#BFD8E8', 0.25, X, 0.52, Z);
  const sol = glass(k, yCyl(0.52, 0.72, 0.5), '#F2F6F8', 0.8, X, 0.27, Z);
  const drop = solid(k.scene, new THREE.SphereGeometry(0.04, 10, 8), '#DFF3FF', {});
  k.label('Buret NaOH')(V(X, 3.6, Z));
  board(k, 1.3, Z, 4, 2.6);
  k.label('Đường cong pH theo thể tích NaOH (0–40 mL)')(V(1.3, 0.1, Z - 1.45));
  const at = (V_: number, pH: number) => [-0.5 + (V_ / 40) * 3.6, 0.07, Z + 1.15 - (pH / 14) * 2.3];
  const curve = path(k, '#7FFFB0', 3, 400);
  const seven = k.line('#5E7A9A', 1.5, [...at(0, 7), ...at(40, 7)]);
  k.scene.add(seven);
  const dot = glow(k, new THREE.SphereGeometry(0.08, 12, 8), '#FF9A4D');
  let key = NaN;
  return (now) => {
    const {V: vol, cb} = live.v;
    if (cb !== key) {
      key = cb;
      setLine(curve, Array.from({length: 400}, (_, i) => at((i / 399) * 40, titrationPH((i / 399) * 40, cb))).flat());
    }
    const pH = titrationPH(vol, cb);
    const [x, y, z] = at(vol, pH);
    dot.position.set(x, y + 0.03, z);
    naoh.scale.y = Math.max(0.01, 1 - vol / 40);
    naoh.position.y = 1.3 + naoh.scale.y;
    sol.material.color.set('#F2F6F8').lerp(new THREE.Color('#E84F9A'), clamp((pH - 8.2) / 1.8, 0, 1));
    drop.position.set(X, 1.25 - ((now / 500) % 1) * 0.7, Z);
    return `pH = ${pH.toFixed(2)} sau ${vol.toFixed(2)} mL NaOH\nDung dịch ${pH > 8.2 ? 'đã chuyển hồng' : 'còn không màu'} (phenolphtalein đổi màu ở pH 8,2)`;
  };
};

// ------------------------------------------------------------------ điện di gel
const gel: Scene = ({k, live}) => {
  const WELL = Z - 1.3;
  const RUN = 2.6;
  glass(k, box(4.4, 0.2, RUN + 0.5), '#3E6FB0', 0.35, 0, 0.14, WELL + RUN / 2);
  withSims((lib) => {
    place(k.scene, lib, 'GelTank', [0, 0, WELL + RUN / 2]);
    place(k.scene, lib, 'GelPSU', [3.35, 0, Z + 0.9]);
  });
  k.label('Cực âm (−): giếng tra mẫu')(V(-3.3, 0.1, WELL));
  k.label('Cực dương (+)')(V(-3.1, 0.1, WELL + RUN));
  const lanes = LANES.map(([name, bps], i) => {
    const x = -1.5 + i;
    solid(k.scene, box(0.7, 0.05, 0.08), '#0C1118', {x, y: 0.26, z: WELL});
    k.label(name)(V(x, i % 2 ? 1.25 : 0.7, WELL - 0.35)); // so le hai tầng để nhãn không đè nhau
    return bps.map((bp) => ({bp, x, m: glow(k, box(0.7, 0.07, 0.07), i ? '#FF9A4D' : '#7FFFB0', x, 0.2, WELL), tag: i ? null : k.label(`${bp}`, '#7FFFB0', true)}));
  }).flat();
  return () => {
    const {volt, min, agar} = live.v;
    for (const b of lanes) {
      const d = migrate(b.bp, volt, min, agar);
      const z = WELL + (d / GEL_LEN) * RUN;
      b.m.visible = d <= GEL_LEN;
      b.m.position.z = z;
      b.tag?.(b.m.visible && min > 0 ? V(b.x - 0.75, 0.25, z) : null);
    }
    return `${volt.toFixed(0)} V · ${min.toFixed(0)} phút · gel ${agar.toFixed(1)} %\nSố bên thang chuẩn là độ dài đoạn DNA (cặp base); so vạch của hiện trường với hai nghi phạm`;
  };
};

// ------------------------------------------------------------------ ruồi giấm của Morgan
const morgan: Scene = ({k, live}) => {
  const KINDS: [string, string][] = [
    ['Xám, dài', '#B8955A'],
    ['Đen, cụt', '#2A2A2A'],
    ['Xám, cụt ✱', '#E0661C'],
    ['Đen, dài ✱', '#6B4BC8'],
  ];
  const MAX = 400;
  const trays = KINDS.map(([name, color], i) => {
    const x = -2.7 + i * 1.8;
    const plain = board(k, x, Z, 1.6, 2.2, '#E8E2D4');
    withSims((lib) => {
      place(k.scene, lib, 'FlyTray', [x, 0, Z], [plain]);
      place(k.scene, lib, 'FlyVial', [x + 0.55, 0, Z + 1.35]);
    });
    const c = cloud(k, MAX, color, 4);
    const p = rnd(MAX * 2);
    for (let j = 0; j < MAX; j++) c.pos.set([x + (p[j * 2] - 0.5) * 1.45, 0.07, Z + (p[j * 2 + 1] - 0.5) * 2.05], j * 3);
    return {c, tag: k.label(name, color === '#2A2A2A' ? undefined : color), x, name};
  });
  let key = '';
  let text = '';
  return () => {
    if (sig(live) === key) return text;
    key = sig(live);
    const r = cross(live.v.n, live.v.d);
    const per = Math.max(1, r.N / 800); // quần thể lớn: mỗi chấm thay cho vài con
    trays.forEach((t, i) => {
      t.c.flush(Math.min(MAX, Math.round(r.counts[i] / per)));
      t.tag(V(t.x, 0.5, Z - 1.35), undefined, `${t.name}: ${r.counts[i]}`);
    });
    text = `f = ${(r.est * 100).toFixed(1)} % ± ${(r.se * 100).toFixed(1)} % từ ${r.N} con${per > 1 ? ` (mỗi chấm ≈ ${per.toFixed(1)} con)` : ''}\nHai khay ✱ bên phải là ruồi tái tổ hợp: tỉ lệ của chúng chính là tần số hoán vị gen`;
    return text;
  };
};

export const THPT_SCENES: Record<string, Scene> = {collision, thomson, eddy, photo, rutherford, differential: diffScene, pid, chlorine, alkali: alkaliScene, no2: no2Scene, titration, gel, morgan};
