import * as THREE from 'three';
import type {PhysExperiment} from '../../utils/lab/phys/types';

/**
 * Chuyển động của các bài thực hành SGK (Vật lí) trong /lab: dụng cụ không đứng yên mà CHẠY theo đúng quy luật vật lí của bài —
 * xe lăn qua cổng quang, bi rơi, con lắc đung đưa, lò xo nảy, hạt khí va vào pit-tông, dòng điện chạy trong mạch, sóng lan ra và sóng dừng,
 * kim đồng hồ đo lệch theo số đo… Số liệu lấy từ chính thanh trượt và lựa chọn của bài (cùng `live.st` với bảng điều khiển), nên kéo thanh trượt
 * hay cầm dụng cụ là thấy chuyển động đổi theo. Toạ độ theo hệ của bộ dụng cụ Blender (`tools/lab-models/bench_parts.py`).
 * Bấm ĐO (một dòng mới vào bảng số liệu) cho chạy lại thí nghiệm từ đầu.
 */
export interface FxLive {
  p: Record<string, number>;
  s: Record<string, string>;
  rows: number;
}
export interface FxCtx {
  e: PhysExperiment;
  root: THREE.Group;
  /** phần động `Mov_<MÃ>_<n>` (nếu đã tải): đã đặt theo thanh trượt trong khung hình này, mã có thể ghi đè */
  part: (n: number) => THREE.Object3D | undefined;
  /** số đầu tiên trong nhãn của lựa chọn đang chọn (vd. "10 Ω" → 10) */
  choiceNum: (key: string, dflt?: number) => number;
}
export type FxUpdate = (dt: number, L: FxLive, T: number) => void;
export type FxBuild = (c: FxCtx) => FxUpdate;

/** các phần động chạy tự do (không gắn thanh trượt) cần tải thêm */
export const FX_PARTS: Record<string, number[]> = {
  SPEED: [2],
  FREE_FALL_G: [2],
  NEWTON2: [2],
  FRICTION: [2, 3],
  LEVER_MOMENT: [2, 3],
  PROJECTILE_HORIZONTAL: [2],
  ERROR_MEASURE: [1],
  SOUND_FREQUENCY: [1, 2],
  EMF_INTERNAL_R: [2, 3],
  OHM_LAW: [1, 2],
  EM_INDUCTION: [2],
  CAPACITOR_RC: [1, 2],
  TRANSFORMER: [1, 2],
  PENDULUM_G: [3],
  SPECIFIC_HEAT: [1],
};

// ------------------------------------------------------------------ dụng cụ vẽ nhỏ
const mat = (color: string, o: {emissive?: number; opacity?: number; metal?: number} = {}) =>
  new THREE.MeshStandardMaterial({color, emissive: color, emissiveIntensity: o.emissive ?? 0.25, transparent: o.opacity !== undefined, opacity: o.opacity ?? 1, metalness: o.metal ?? 0.1, roughness: 0.4});

/** đàn hạt nhỏ (InstancedMesh): `put(i, x, y, z)` đặt từng hạt */
function dots(root: THREE.Object3D, n: number, r: number, color: string, glow = 0.5) {
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(r, 10, 8), mat(color, {emissive: glow}), n);
  mesh.frustumCulled = false;
  root.add(mesh);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3(1, 1, 1);
  const pos = new THREE.Vector3();
  return {
    mesh,
    put(i: number, x: number, y: number, z: number, s = 1) {
      m.compose(pos.set(x, y, z), q, sc.set(s, s, s));
      mesh.setMatrixAt(i, m);
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
const glow = (root: THREE.Object3D, x: number, y: number, z: number, r: number, color: string) => {
  const g = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat(color, {emissive: 1, opacity: 0.0}));
  g.position.set(x, y, z);
  root.add(g);
  const set = (a: number) => {
    (g.material as THREE.MeshStandardMaterial).opacity = Math.max(0, Math.min(1, a));
    g.visible = a > 0.01;
  };
  set.mesh = g;
  return set;
};
/** mặt hiển thị số: bản vẽ chữ lên canvas rồi dán lên mặt đồng hồ/cân/nguồn của dụng cụ */
function display(root: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, color = '#7CFFB2') {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = Math.max(32, Math.round((256 * h) / w));
  const ctx = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({map: tex, transparent: true}));
  plane.position.set(x, y, z);
  root.add(plane);
  let last = '';
  return (text: string) => {
    if (text === last || !ctx) return;
    last = text;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = color;
    ctx.font = `700 ${Math.round(cv.height * 0.72)}px ui-monospace, Consolas, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cv.width / 2, cv.height / 2 + 2);
    tex.needsUpdate = true;
  };
}
/** dòng hạt chạy dọc đường dây khép kín: tốc độ theo cường độ dòng */
function flow(root: THREE.Object3D, path: [number, number, number][], n: number, color = '#FFD166') {
  const d = dots(root, n, 0.028, color, 0.9);
  const pts = path.map((q) => new THREE.Vector3(...q));
  const seg = pts.map((a, i) => a.distanceTo(pts[(i + 1) % pts.length]));
  const total = seg.reduce((a, b) => a + b, 0);
  let ph = 0;
  const at = (u: number, out: THREE.Vector3) => {
    let d0 = (((u % 1) + 1) % 1) * total;
    for (let i = 0; i < pts.length; i++) {
      if (d0 <= seg[i]) return out.lerpVectors(pts[i], pts[(i + 1) % pts.length], d0 / (seg[i] || 1));
      d0 -= seg[i];
    }
    return out.copy(pts[0]);
  };
  const v = new THREE.Vector3();
  return (dt: number, speed: number) => {
    ph += dt * speed;
    for (let i = 0; i < n; i++) {
      at(i / n + ph, v);
      d.put(i, v.x, v.y, v.z);
    }
  };
}
/** vòng sóng phẳng nằm trên mặt nước, lớn dần rồi mờ đi */
function rippleRing(root: THREE.Object3D, color: string) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 72).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({color, transparent: true, opacity: 0, side: THREE.DoubleSide}));
  root.add(m);
  return (x: number, y: number, z: number, r: number, a: number) => {
    m.position.set(x, y, z);
    m.scale.setScalar(Math.max(r, 1e-3));
    (m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, a);
  };
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** kim đồng hồ đo: lệch dần tới số đo (có quán tính) và run nhẹ như kim thật */
const needle = (o: THREE.Object3D | undefined, frac: number) => {
  if (!o) return;
  const u = o.userData as {v?: number; k?: number};
  u.v = (u.v ?? 0) + (clamp(frac, -1.1, 1.15) - (u.v ?? 0)) * 0.08;
  u.k = (u.k ?? 0) + 1;
  o.rotation.z = -(u.v + 0.006 * Math.sin(u.k * 0.7)) * 0.9;
};
const fix = (v: number, d: number) => v.toFixed(d).replace('.', ',');
/** chu kì lặp: trả về pha 0..1 trong chu kì dài `T` giây */
const cyc = (t: number, T: number) => (t % T) / T;
/** khi bấm ĐO (thêm dòng vào bảng số liệu) thì chạy lại từ đầu */
const restart = () => {
  let rows = -1;
  let t0 = 0;
  return (L: FxLive, T: number) => {
    if (L.rows !== rows) {
      if (rows >= 0) t0 = T;
      rows = L.rows;
    }
    return T - t0;
  };
};

// ------------------------------------------------------------------ từng bài
export const BENCH_FX: Record<string, FxBuild> = {
  // xe chạy qua hai cổng quang; đồng hồ hiện số hiện thời gian giữa hai cổng
  SPEED: (c) => {
    const lamp1 = glow(c.root, -1.2, 0.64, 0.225, 0.07, '#7CFFB2');
    const lamp2 = glow(c.root, 0, 0.64, 0.225, 0.07, '#7CFFB2');
    const show = display(c.root, 1.8, 0.12, 1.0075, 0.56, 0.13);
    const v = 1.3;
    const r = restart();
    return (_dt, L, T) => {
      const cart = c.part(2);
      const gate = c.part(1);
      const t = cyc(r(L, T), 5) * 5;
      const x = -2 + v * Math.max(0, t - 0.6);
      if (cart) cart.position.x = x;
      const x2 = gate ? gate.position.x : 0.5;
      lamp1(Math.abs(x - -1.2) < 0.3 ? 1 : 0);
      lamp2.mesh.position.x = x2;
      lamp2(Math.abs(x - x2) < 0.3 ? 1 : 0);
      show(x > x2 ? fix((x2 + 1.2) / v / 2.2, 3) : x > -1.2 ? fix((x + 1.2) / v / 2.2, 3) : '0,000');
    };
  },

  // bi thép rơi khỏi nam châm điện, chạm cổng quang rồi xuống đệm xốp
  FREE_FALL_G: (c) => {
    const mag = glow(c.root, 0, 2.1, -0.2, 0.12, '#FF6B6B');
    const lamp = glow(c.root, 0.19, 0, 0.05, 0.07, '#7CFFB2');
    const show = display(c.root, 1.6, 0.12, 0.6575, 0.56, 0.13);
    const r = restart();
    const g = 3.6;
    return (_dt, L, T) => {
      const ball = c.part(2);
      const gate = c.part(1);
      const t = cyc(r(L, T), 4.2) * 4.2;
      const fall = Math.max(0, t - 1);
      const y = Math.max(0.15, 1.95 - 0.5 * g * fall * fall);
      if (ball) ball.position.y = y;
      mag(t < 1 ? 0.5 + 0.4 * Math.sin(T * 8) : 0);
      const gy = gate ? gate.position.y : 1;
      const tg = Math.sqrt((2 * (1.95 - gy)) / g);
      lamp.mesh.position.y = gy + 0.3;
      lamp(Math.abs(y - gy) < 0.12 ? 1 : 0);
      show(fall > tg ? fix(tg / 2.7, 3) : fall > 0 ? fix(fall / 2.7, 3) : '0,000');
    };
  },

  // ba lực đồng quy: mũi tên F₁, F₂ và hợp lực theo quy tắc hình bình hành
  FORCE_COMPOSITION: (c) => {
    const grp = new THREE.Group();
    grp.position.set(0, 1.0, -0.375);
    c.root.add(grp);
    const mk = (color: string) => {
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1, 10).translate(0, 0.5, 0), mat(color, {emissive: 0.6}));
      const hd = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 12), mat(color, {emissive: 0.6}));
      const g = new THREE.Group();
      g.add(sh, hd);
      grp.add(g);
      return (vx: number, vy: number) => {
        const len = Math.hypot(vx, vy) * 0.18;
        g.rotation.z = Math.atan2(vy, vx) - Math.PI / 2;
        sh.scale.y = Math.max(0.01, len - 0.1);
        hd.position.y = len - 0.05;
      };
    };
    const a1 = mk('#FF6B6B');
    const a2 = mk('#4DA3FF');
    const aR = mk('#7CFFB2');
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 24), mat('#E3B341', {emissive: 0.8}));
    grp.add(ring);
    const par = dots(grp, 24, 0.012, '#FFFFFF', 0.5);
    return (_dt, L, T) => {
      const a = (L.p.a * Math.PI) / 180;
      const t1 = Math.PI / 2 + a / 2;
      const t2 = Math.PI / 2 - a / 2;
      const f1: [number, number] = [L.p.F1 * Math.cos(t1), L.p.F1 * Math.sin(t1)];
      const f2: [number, number] = [L.p.F2 * Math.cos(t2), L.p.F2 * Math.sin(t2)];
      a1(...f1);
      a2(...f2);
      aR(f1[0] + f2[0], f1[1] + f2[1]);
      ring.position.set(0.012 * Math.sin(T * 40), 0.012 * Math.cos(T * 33), 0);
      // hai cạnh còn lại của hình bình hành (chấm trắng)
      for (let i = 0; i < 24; i++) {
        const u = (i % 12) / 11;
        const [a, b] = i < 12 ? [f1, f2] : [f2, f1];
        par.put(i, (a[0] + b[0] * u) * 0.18, (a[1] + b[1] * u) * 0.18, 0.01);
      }
    };
  },

  // âm thoa rung, sóng âm lan ra, màn dao động kí vẽ đường hình sin theo tần số âm thoa
  SOUND_FREQUENCY: (c) => {
    const rings = [0, 1, 2].map(() => rippleRing(c.root, '#9AD1FF'));
    const trace = dots(c.root, 64, 0.012, '#7CFFB2', 1);
    return (_dt, L, T) => {
      const f = c.choiceNum('fork', 440);
      const w = 2 * Math.PI * (f / 440) * 9;
      const amp = 0.035 * Math.sin(T * w);
      const l = c.part(1);
      const rr = c.part(2);
      if (l) l.rotation.z = -amp;
      if (rr) rr.rotation.z = amp;
      rings.forEach((r, i) => {
        const k = (T * 0.8 + i / 3) % 1;
        r(-1.8, 0.75, 0, 0.1 + k * 0.9, 0.5 * (1 - k));
      });
      const cycles = (f * L.p.td * 8) / 1000;
      for (let i = 0; i < 64; i++) {
        const u = i / 63;
        trace.put(i, 0.78 + 0.74 * u, 0.5 + 0.22 * Math.sin(2 * Math.PI * (cycles * u - T * 0.6)), 0.17);
      }
    };
  },

  // cột không khí trong ống cộng hưởng: hạt khí dao động thành sóng dừng, nút ở pit-tông
  SOUND_SPEED: (c) => {
    const N = 44;
    const gas = dots(c.root, N, 0.03, '#9AD1FF', 0.7);
    const cone = glow(c.root, -1.64, 0.45, 0, 0.16, '#FFD166');
    return (_dt, L, T) => {
      const f = c.choiceNum('f', 512);
      const v = 331 + 0.6 * L.p.T;
      const lam = (v / f) * 3.4;
      const k = (2 * Math.PI) / lam;
      for (let i = 0; i < N; i++) {
        const x0 = -1.3 + (2.2 * i) / (N - 1);
        const disp = 0.09 * Math.sin(k * (0.9 - x0)) * Math.cos(T * 11);
        gas.put(i, x0 + disp, 0.45 + 0.1 * Math.sin(i * 2.3), 0.09 * Math.cos(i * 1.7));
      }
      cone(0.35 + 0.3 * Math.sin(T * 11));
    };
  },

  // dòng điện chạy trong mạch; kim ampe kế, vôn kế lệch theo I và U = E − Ir
  EMF_INTERNAL_R: (c) => {
    const go = flow(c.root, [[-2.3, 0.46, 0.2], [-2.08, 0.1, -0.6], [-1.1, 0.56, -0.5], [-0.7, 0.56, -0.5], [0.95, 0.4, 0.3], [2.45, 0.4, 0.3], [2.45, 0.1, 0.85], [-2.3, 0.1, 0.85]], 26);
    return (dt, L) => {
      const I = 1.52 / (L.p.R + 0.82);
      go(dt, I * 0.55);
      needle(c.part(2), I / 1.6);
      needle(c.part(3), (1.52 - I * 0.82) / 1.7);
    };
  },

  // xe được quả cân kéo: chuyển động nhanh dần đều a = F/m, quả cân hạ theo
  NEWTON2: (c) => {
    const show = display(c.root, 0.4, 0.12, 1.0575, 0.56, 0.13);
    const r = restart();
    return (_dt, L, T) => {
      const cart = c.part(2);
      const wt = c.part(1);
      const a = 2.6 * (L.p.F / L.p.m);
      const t = cyc(r(L, T), 6) * 6;
      const d = Math.min(3.1, 0.5 * a * Math.max(0, t - 0.5) ** 2);
      if (cart) cart.position.x = -1.6 + d;
      if (wt) wt.position.y -= Math.min(0.42, d * 0.18);
      const tg = Math.sqrt((2 * 2.0) / a);
      show(fix(Math.min(Math.max(0, t - 0.5), tg) / 2, 2));
    };
  },

  // khối gỗ được kéo trượt trên mặt phẳng: dây căng, giật nhẹ theo hệ số ma sát
  FRICTION: (c) => {
    const r = restart();
    return (_dt, L, T) => {
      const blk = c.part(2);
      const str = c.part(3);
      const w = c.part(1);
      const mu = L.s.surf === 'glass' ? 0.2 : L.s.surf === 'rubber' ? 0.7 : 0.4;
      const t = cyc(r(L, T), 4) * 4;
      const dx = Math.min(0.75, Math.max(0, t - 0.4) * 0.5) + (t > 0.4 && t < 2.2 ? 0.012 * mu * Math.sin(T * 40) : 0);
      if (blk) blk.position.x = -0.8 + dx;
      if (w) w.position.x += dx;
      if (str) str.scale.x = Math.max(0.05, (0.72 - dx) / 0.72);
    };
  },

  // lò xo nảy tắt dần mỗi khi đổi quả cân; dao động nhỏ liên tục
  HOOKE: (c) => {
    let last = NaN;
    let t0 = -10;
    return (_dt, L, T) => {
      if (L.p.m !== last) {
        if (!Number.isNaN(last)) t0 = T;
        last = L.p.m;
      }
      const t = T - t0;
      const w = 2 * Math.PI * (1.3 / Math.sqrt(L.p.m * 6));
      const b = 0.1 * Math.exp(-1.4 * t) * Math.sin(w * t) + 0.006 * Math.sin(T * 2.2);
      const sp = c.part(1);
      const wt = c.part(2);
      if (sp) sp.scale.y *= 1 + b / (0.72 * sp.scale.y);
      if (wt) wt.position.y -= b;
    };
  },

  // con lắc đơn đung đưa theo T = 2π√(l/g); kim đồng hồ bấm giây quay
  PENDULUM_G: (c) => {
    const hinge = new THREE.Vector3(0, 2.37, -0.2);
    const r = restart();
    return (_dt, L, T) => {
      const t = r(L, T);
      const Tp = 2 * Math.PI * Math.sqrt(L.p.l / 9.81);
      const th = 0.38 * Math.cos((2 * Math.PI * t) / Tp) * Math.exp(-0.012 * t);
      for (const n of [1, 2]) {
        const o = c.part(n);
        if (!o) continue;
        const rel = o.position.clone().sub(hinge);
        o.position.copy(hinge).add(rel.applyAxisAngle(new THREE.Vector3(0, 0, 1), th));
        o.rotation.z = th;
      }
      const h = c.part(3);
      if (h) h.rotation.y = -t * 0.6;
    };
  },

  // hạt khí va chạm thành bình và pit-tông: thể tích nhỏ thì hạt dày hơn, va chạm dồn dập hơn
  BOYLE: (c) => {
    const N = 42;
    const d = dots(c.root, N, 0.025, '#FFD166', 0.8);
    const st = Array.from({length: N}, (_, i) => ({x: Math.sin(i * 12.9) * 0.2, y: 0.3 + (i % 7) * 0.1, z: Math.cos(i * 7.1) * 0.2, vx: Math.cos(i * 3.1), vy: Math.sin(i * 5.3), vz: Math.cos(i * 1.7)}));
    return (dt, _L) => {
      const top = (c.part(1)?.position.y ?? 0.9) - 0.06;
      for (let i = 0; i < N; i++) {
        const q = st[i];
        q.x += q.vx * dt * 0.7;
        q.y += q.vy * dt * 0.7;
        q.z += q.vz * dt * 0.7;
        if (Math.abs(q.x) > 0.21) q.vx *= -1;
        if (Math.abs(q.z) > 0.21) q.vz *= -1;
        if (q.y < 0.17) q.vy = Math.abs(q.vy);
        if (q.y > top) q.vy = -Math.abs(q.vy);
        q.x = clamp(q.x, -0.21, 0.21);
        q.z = clamp(q.z, -0.21, 0.21);
        q.y = clamp(q.y, 0.17, Math.max(0.2, top));
        d.put(i, q.x, q.y, q.z);
      }
    };
  },

  // khí nóng lên nở đẩy pit-tông; bọt nước sôi lăn tăn trong cốc, nhanh dần khi nóng
  CHARLES: (c) => {
    const N = 34;
    const gas = dots(c.root, N, 0.022, '#FFB36B', 0.8);
    const bub = dots(c.root, 14, 0.03, '#FFFFFF', 0.4);
    const st = Array.from({length: N}, (_, i) => ({x: 0.2 + (i % 9) * 0.07, y: 0.9 + Math.sin(i * 2.9) * 0.1, z: Math.cos(i * 1.3) * 0.1, vx: Math.cos(i * 3.1), vy: Math.sin(i * 5.3), vz: Math.cos(i * 1.7)}));
    const heat = glow(c.root, -1.4, 0.2, 0, 0.34, '#FF8A3D');
    return (dt, L, T) => {
      const px = (c.part(1)?.position.x ?? 0.9) - 0.06;
      const sp = 0.45 + (L.p.T - 20) / 60;
      for (let i = 0; i < N; i++) {
        const q = st[i];
        q.x += q.vx * dt * sp;
        q.y += q.vy * dt * sp * 0.4;
        q.z += q.vz * dt * sp * 0.4;
        if (Math.abs(q.y - 0.9) > 0.11) q.vy *= -1;
        if (Math.abs(q.z) > 0.11) q.vz *= -1;
        if (q.x < 0.14) q.vx = Math.abs(q.vx);
        if (q.x > px) q.vx = -Math.abs(q.vx);
        q.x = clamp(q.x, 0.14, Math.max(0.2, px));
        q.y = clamp(q.y, 0.79, 1.01);
        q.z = clamp(q.z, -0.11, 0.11);
        gas.put(i, q.x, q.y, q.z);
      }
      for (let i = 0; i < 14; i++) {
        const k = (T * (0.25 + (L.p.T - 20) / 90) + i / 14) % 1;
        bub.put(i, -1.4 + 0.26 * Math.sin(i * 5.3 + k * 4), 0.35 + 0.5 * k, 0.2 * Math.cos(i * 3.7), 1 - 0.5 * k);
      }
      heat(0.15 + (L.p.T - 20) / 120 + 0.05 * Math.sin(T * 6));
    };
  },

  // nam châm lên xuống trong lòng cuộn dây: kim mV lệch qua lại, đèn báo sáng theo suất điện động cảm ứng
  EM_INDUCTION: (c) => {
    const lamp = glow(c.root, -0.6, 0.95, 0, 0.1, '#7CFFB2');
    return (_dt, L, T) => {
      const n = c.choiceNum('N', 100);
      const w = 1.1 + L.p.v * 0.55;
      const m = c.part(1);
      if (m) m.position.x = -0.6 + 0.62 * Math.sin(T * w);
      const emf = 0.62 * w * Math.cos(T * w) * (n / 200) * 0.9;
      const nd = c.part(2);
      needle(nd, emf / 1.2);
      lamp(Math.abs(emf) * 0.8);
    };
  },

  // đòn bẩy nghiêng về bên nặng hơn (mômen lớn hơn), dao động tắt dần quanh vị trí cân bằng
  LEVER_MOMENT: (c) => {
    let th = 0;
    let om = 0;
    const hinge = new THREE.Vector3(0, 1.5, 0);
    return (dt, L) => {
      const M1 = L.p.m1 * L.p.d1;
      const M2 = 0.2 * 20;
      const target = clamp((M1 - M2) / 30, -0.25, 0.25) * -1;
      for (let k = 0; k < 4; k++) {
        const a = -14 * (th - target) - 2.4 * om;
        om += (a * dt) / 4;
        th += (om * dt) / 4;
      }
      const beam = c.part(2);
      if (beam) beam.rotation.z = th;
      const attach = (x: number) => new THREE.Vector3(hinge.x + x * Math.cos(th), hinge.y + x * Math.sin(th), 0);
      const left = c.part(1);
      if (left) {
        const x0 = left.position.x;
        const a = attach(x0);
        left.position.x = a.x;
        left.position.y += a.y - hinge.y;
      }
      const right = c.part(3);
      if (right) {
        const a = attach(1.2);
        right.position.set(a.x, 1.5 + (a.y - hinge.y), 0);
      }
    };
  },

  // bi lăn khỏi máng rồi bay theo quỹ đạo parabol, rơi xuống giấy than; để lại vệt
  PROJECTILE_HORIZONTAL: (c) => {
    const trail = dots(c.root, 18, 0.02, '#FFD166', 0.7);
    const r = restart();
    return (_dt, L, T) => {
      const ball = c.part(2);
      const ramp = c.part(1);
      if (!ball) return;
      const yOff = ramp ? ramp.position.y : 0.5;
      const t = cyc(r(L, T), 5) * 5;
      const y0 = 0.07 + yOff;
      const v = L.p.v0 * 0.9;
      const g = 3.2;
      const tf = Math.sqrt((2 * (y0 - 0.04)) / g);
      const fly = clamp(t - 1, 0, tf);
      if (t < 1) ball.position.set(-0.45 + 0.25 * t, y0, 0);
      else ball.position.set(-0.2 + v * fly, y0 - 0.5 * g * fly * fly, 0);
      for (let i = 0; i < 18; i++) {
        const ti = (tf * (i + 1)) / 18;
        trail.put(i, -0.2 + v * ti, y0 - 0.5 * g * ti * ti, 0, t - 1 > ti ? 1 : 0.0001);
      }
    };
  },

  // ampe kế và vôn kế lệch theo I = U/R và U; dòng điện chạy; điện trở nóng sáng theo công suất
  OHM_LAW: (c) => {
    const go = flow(c.root, [[-2.4, 0.12, 0.14], [-0.6, 0.14, 0.5], [-0.2, 0.14, 0.5], [0.5, 0.56, -0.4], [0.9, 0.56, -0.4], [-2.1, 0.12, 0.14]], 22);
    const show = display(c.root, -2.3, 0.34, 0.1065, 0.46, 0.14);
    const hot = glow(c.root, -0.4, 0.2, 0.5, 0.2, '#FF8A3D');
    return (dt, L, T) => {
      const R = c.choiceNum('res', 10);
      const I = L.p.U / R;
      go(dt, I * 0.9);
      needle(c.part(1), I / 1.2);
      needle(c.part(2), L.p.U / 11);
      show(`${fix(L.p.U, 1)} V`);
      hot(Math.min(0.3, (L.p.U * I) / 30) + 0.05 * Math.sin(T * 5) * (I > 0.3 ? 1 : 0));
    };
  },

  // đun nước: dây nung sáng, bọt và hơi bốc lên nhiều dần, kim bấm giây quay, số cân hiện khối lượng
  SPECIFIC_HEAT: (c) => {
    const steam = dots(c.root, 20, 0.03, '#FFFFFF', 0.4);
    const heater = glow(c.root, -0.4, 0.35, 0, 0.26, '#FF6B3D');
    const show = display(c.root, -2.2, 0.34, 0.1065, 0.46, 0.14, '#FFB36B');
    const bal = display(c.root, 2.1, 0.12, 0.1575, 0.6, 0.13);
    const merc = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1, 8).translate(0, 0.5, 0), mat('#FF3B3B', {emissive: 0.9}));
    merc.position.set(-0.3, 0.3, 0);
    c.root.add(merc);
    const r = restart();
    return (_dt, L, T) => {
      const t = r(L, T);
      const frac = Math.min(1, (cyc(t, 7) * 7) / 5);
      const sim = frac * L.p.t;
      show('40 W');
      bal('200,0 g');
      heater(0.1 + 0.55 * frac + 0.06 * Math.sin(T * 7));
      merc.scale.y = 0.2 + 0.42 * frac;
      const h = c.part(1);
      if (h) h.rotation.y = -(sim / 60) * 2 * Math.PI;
      for (let i = 0; i < 20; i++) {
        const k = (T * (0.2 + frac * 0.5) + i / 20) % 1;
        steam.put(i, -0.4 + 0.18 * Math.sin(i * 4.1 + k * 3), 0.6 + 0.55 * k, 0.18 * Math.cos(i * 2.7), frac > 0.25 ? 1 - k * 0.7 : 0.0001);
      }
    };
  },

  // viên đá rơi vào nhiệt lượng kế rồi tan dần: số cân (khối lượng nước đá đã tan) tăng
  LATENT_HEAT_FUSION: (c) => {
    const ice = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), mat('#CFEFFF', {emissive: 0.5, opacity: 0.8}));
    c.root.add(ice);
    const bal = display(c.root, 2.0, 0.12, 0.2575, 0.6, 0.13);
    const cool = glow(c.root, -1.0, 0.3, 0, 0.3, '#7FD3FF');
    const r = restart();
    return (_dt, L, T) => {
      const t = cyc(r(L, T), 7) * 7;
      const m = L.p.mi;
      if (t < 1.2) {
        const u = t / 1.2;
        ice.position.set(0.4 + (-1.0 - 0.4) * u, 0.1 + 0.8 * Math.sin(u * Math.PI), 0.5 * (1 - u));
        ice.rotation.set(u * 6, u * 4, 0);
        ice.scale.setScalar(1);
      } else {
        const k = clamp((t - 1.2) / 4.8, 0, 1);
        ice.position.set(-1.0, 0.42 - 0.06 * k, 0);
        ice.scale.setScalar(Math.max(0.05, 1 - k));
        cool(0.1 + 0.3 * (1 - k));
      }
      bal(`${fix(m * clamp((t - 1.2) / 4.8, 0, 1) * 0.55 + 20, 1)} g`);
    };
  },

  // vòng sóng từ hai nguồn lan ra, chồng lên nhau tạo cực đại, cực tiểu giao thoa
  WAVE_INTERFERENCE: (c) => {
    const rs = [0, 1].map(() => [0, 1, 2, 3, 4].map(() => rippleRing(c.root, '#DDF3FF')));
    return (_dt, L, T) => {
      const lam = 0.62 * (30 / L.p.f);
      [-0.3, 0.3].forEach((sx, s) =>
        rs[s].forEach((ring, i) => {
          const k = (T * 0.55 + i / 5) % 1;
          ring(sx, 0.62, -0.3, 0.05 + k * lam * 5, 0.8 * (1 - k));
        }),
      );
    };
  },

  // sợi dây rung thành sóng dừng: nút đứng yên, bụng dao động mạnh; số bụng tăng theo tần số
  STANDING_WAVE: (c) => {
    const N = 78;
    const wire = dots(c.root, N, 0.014, '#FF8A3D', 0.9);
    const env = dots(c.root, N, 0.007, '#FFB380', 0.6);
    return (_dt, L, T) => {
      const n = clamp(Math.round(L.p.L * 5), 2, 5);
      for (let i = 0; i < N; i++) {
        const x = -1.9 + (3.8 * i) / (N - 1);
        const s = Math.sin((n * Math.PI * (x + 1.9)) / 3.8);
        wire.put(i, x, 0.78 + 0.17 * s * Math.cos(T * (6 + n * 2.2)), 0);
        env.put(i, x, 0.78 + 0.17 * s, 0.0, 0.7);
      }
    };
  },

  // tụ nạp điện: điện áp tiến dần tới U theo hằng số thời gian RC; dòng giảm dần, kim vôn kế và kim bấm giây quay
  CAPACITOR_RC: (c) => {
    const go = flow(c.root, [[-2.5, 0.12, 0.14], [-0.62, 0.1, -0.25], [-0.38, 0.1, -0.25], [-0.4, 0.14, 0.3], [-0.8, 0.46, 0], [1.0, 0.56, -0.4], [-2.2, 0.12, 0.14]], 20);
    const cap = glow(c.root, -0.8, 0.25, 0, 0.2, '#4DA3FF');
    const show = display(c.root, -2.4, 0.34, 0.1065, 0.46, 0.14);
    const r = restart();
    return (dt, L, T) => {
      const t = r(L, T);
      const R = c.choiceNum('R', 10);
      const tau = (R * 100e-6) * 1000 * 0.6 + 0.1;
      const sim = Math.min(L.p.t, (cyc(t, 8) * 8) / 5 * L.p.t);
      const V = 6 * (1 - Math.exp(-sim / tau));
      const I = (6 - V) / Math.max(1, R);
      go(dt, I * 0.35);
      needle(c.part(1), V / 7);
      const h = c.part(2);
      if (h) h.rotation.y = -sim * 0.9;
      cap(0.08 + 0.45 * (V / 6) + 0.05 * Math.sin(T * 5));
      show('6,0 V');
    };
  },

  // dòng xoay chiều trong cuộn sơ cấp tạo từ thông biến thiên chạy trong lõi sắt, cảm ứng ra cuộn thứ cấp
  TRANSFORMER: (c) => {
    const flux = dots(c.root, 30, 0.03, '#7CE8FF', 0.9);
    const g1 = glow(c.root, -0.5, 0.6, 0, 0.36, '#FFB36B');
    const g2 = glow(c.root, 0.5, 0.6, 0, 0.36, '#6BB6FF');
    const show = display(c.root, -2.4, 0.34, 0.2065, 0.46, 0.14);
    const ring: [number, number][] = [[-0.5, 0.15], [0.5, 0.15], [0.5, 1.17], [-0.5, 1.17]];
    return (_dt, L, T) => {
      const k = c.choiceNum('ratio', 2);
      const ratio = k >= 1 ? k : 1 / (1 / k);
      const U2 = L.p.U1 * ratio;
      show(`${fix(L.p.U1, 1)} V~`);
      needle(c.part(1), L.p.U1 / 13);
      needle(c.part(2), U2 / 26);
      const s = Math.sin(T * 7);
      g1(0.12 + 0.35 * Math.abs(s));
      g2(0.06 + 0.3 * Math.abs(s) * Math.min(1.2, ratio / 2));
      for (let i = 0; i < 30; i++) {
        const u = ((i / 30 + T * 0.35 * s) % 1 + 1) % 1;
        const per = u * 4;
        const sgm = Math.floor(per) % 4;
        const f = per - Math.floor(per);
        const a = ring[sgm];
        const b = ring[(sgm + 1) % 4];
        flux.put(i, a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, 0.0, 1);
      }
    };
  },

  // biển báo sáng lần lượt, đèn cảnh báo nhấp nháy: gợi ý các điều cần chú ý trước khi làm
  SAFETY: (c) => {
    const signs = [-2, -0.9, 0.2].map((x, i) => glow(c.root, x, 1.05, -0.27, 0.26, ['#FFD166', '#FF6B6B', '#4DA3FF'][i]));
    const beacon = glow(c.root, 2.6, 0.62, -0.3, 0.14, '#FF3B3B');
    const ext = dots(c.root, 16, 0.03, '#FFFFFF', 0.5);
    return (_dt, _L, T) => {
      signs.forEach((g, i) => g(Math.max(0, 0.55 - Math.abs(((T * 0.5) % 3) - i) * 0.5)));
      beacon(0.2 + 0.7 * Math.max(0, Math.sin(T * 5)));
      for (let i = 0; i < 16; i++) {
        const k = (T * 0.6 + i / 16) % 1;
        ext.put(i, 2.0 + 0.25 * k + 0.05 * Math.sin(i * 3.3), 0.5 - 0.25 * k + 0.1 * Math.sin(i * 1.7) * k, -0.2 + 0.1 * Math.cos(i * 2.9) * k, Math.sin(T * 0.4) > 0.6 ? 1 - k : 0.0001);
      }
    };
  },

  // thước kẹp: hàm kẹp trượt khép lại và mở ra quanh vật cần đo
  ERROR_MEASURE: (c) => {
    return (_dt, _L, T) => {
      const j = c.part(1);
      if (j) j.position.x = -0.2 - 0.6 * (0.5 + 0.5 * Math.sin(T * 0.9));
    };
  },
};
