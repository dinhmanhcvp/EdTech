import * as THREE from 'three';
import {C, f2, f3, gauss, seeded} from '../../utils/presets/sceneKit';
import {orbitPeriodH, orbitSpeed} from '../../utils/presets/lyScene1';
import {bounce, emfPeak, lorentzPeriod, lorentzRadius, wireForcePerLength} from '../../utils/presets/lyScene2';
import {MOLECULES} from '../../utils/presets/hoaScene1';
import {setLine, type Kit, type SceneDef} from './Stage3D';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const rad = (d: number) => (d * Math.PI) / 180;
export const mat = (color: string, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({color, roughness: 0.35, metalness: 0.05, ...o});
export const ball = (color: string, r: number, o: THREE.MeshStandardMaterialParameters = {}) => Object.assign(new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), mat(color, o)), {castShadow: true});
export const group = (k: Kit, ...kids: THREE.Object3D[]) => {
  const g = new THREE.Group();
  if (kids.length) g.add(...kids); // add() không đối số là lỗi của three
  k.scene.add(g);
  return g;
};
/** Đường gấp khúc (danh sách điểm 3 số) → các đoạn rời, để gộp nhiều đoạn vào một nét. */
export const segsOf = (pts: number[][]) => pts.slice(1).flatMap((q, i) => [...pts[i], ...q]);
export const zeros = (n: number) => Array.from({length: n}, () => 0);

const _o = new THREE.Object3D();
/** Bầy quả cầu nhỏ vẽ một lần (InstancedMesh): hạt khí, ion, phân tử nước, đầu phospholipid... */
export function swarm(n: number, r: number, color: string, o: THREE.MeshStandardMaterialParameters = {}) {
  const m = new THREE.InstancedMesh(new THREE.SphereGeometry(r, 20, 14), mat(color, o), n);
  m.frustumCulled = false;
  m.castShadow = true;
  return Object.assign(m, {
    at: (i: number, x: number, y: number, z: number, s = 1) => {
      _o.position.set(x, y, z);
      _o.scale.setScalar(s);
      _o.updateMatrix();
      m.setMatrixAt(i, _o.matrix);
    },
    flush: (count: number) => {
      m.count = count;
      m.instanceMatrix.needsUpdate = true;
    },
  });
}

/** Lớp kép phospholipid: đầu xanh hướng ra hai phía, đuôi cam hướng vào giữa. Tĩnh, dựng một lần. */
export function bilayer(k: Kit, nx: number, nz: number, dx: number, yh: number, yt: number) {
  const heads = swarm(2 * nx * nz, 0.11, '#3D7BE0', {roughness: 0.25});
  const tails: number[] = [];
  let n = 0;
  for (const side of [1, -1])
    for (let iz = 0; iz < nz; iz++)
      for (let ix = 0; ix < nx; ix++) {
        const x = (ix - (nx - 1) / 2) * dx + (iz % 2) * dx * 0.5;
        const z = (iz - (nz - 1) / 2) * dx * 0.9;
        heads.at(n++, x, side * yh, z);
        for (const d of [-0.035, 0.035]) tails.push(x + d, side * (yh - 0.1), z, x + d, side * yt, z);
      }
  heads.flush(n);
  const g = new THREE.Group().add(heads, k.line('#E8902B', 2.2, tails, true));
  return g;
}

const CPK: Record<string, [string, number]> = {H: ['#F4F2EC', 0.26], C: ['#5B5750', 0.42], N: ['#3D6FE0', 0.4], O: ['#E0453A', 0.38], F: ['#52B788', 0.34]};
// Toạ độ không gian của các phân tử theo mô hình VSEPR (góc, độ dài tỉ lệ), dựa vào `geom` của preset
const MOL3: Record<string, [string, number, number, number][]> = {
  H2: [['H', -0.4, 0, 0], ['H', 0.4, 0, 0]],
  O2: [['O', -0.6, 0, 0], ['O', 0.6, 0, 0]],
  N2: [['N', -0.55, 0, 0], ['N', 0.55, 0, 0]],
  HF: [['H', -0.45, 0, 0], ['F', 0.45, 0, 0]],
  H2O: [['O', 0, 0.3, 0], ['H', -0.79, -0.31, 0], ['H', 0.79, -0.31, 0]],
  CO2: [['O', -1.2, 0, 0], ['C', 0, 0, 0], ['O', 1.2, 0, 0]],
  NH3: [['N', 0, 0.4, 0], ...[0, 120, 240].map((a) => ['H', 0.95 * Math.cos(rad(a)), -0.3, 0.95 * Math.sin(rad(a))] as [string, number, number, number])],
};

const MORE_CAMERA_NOTE = 'khoảng cách không theo tỉ lệ thật';

export const MORE_SCENES: Record<string, SceneDef> = {
  PHYS_MAGNETIC_FIELD: {
    dist: 7.5,
    target: [0, 0, 0],
    orbit: () => [28, 26],
    setup: (k) => {
      // electron trong từ trường đều B hướng xuống: quỹ đạo tròn nằm ngang
      const field = group(k);
      const lines: number[] = [];
      const cones = swarm(25, 0.05, '#9C968A');
      let n = 0;
      for (let i = -2; i <= 2; i++)
        for (let j = -2; j <= 2; j++) {
          lines.push(i * 0.95, 1.7, j * 0.95, i * 0.95, -1.7, j * 0.95);
          cones.at(n++, i * 0.95, -1.7, j * 0.95);
        }
      cones.flush(n);
      field.add(k.line('#A8A29E', 1.2, lines, true), cones);
      const e = ball('#2459C9', 0.12, {emissive: '#2459C9', emissiveIntensity: 0.3});
      const trail = k.line('#2459C9', 3, zeros(61 * 3));
      const orbit = k.line('#9DB4E8', 1.2, zeros(97 * 3));
      field.add(e, trail, orbit);
      const tag = k.label('B hướng xuống (vào mặt phẳng quỹ đạo)', '#8A857A');
      tag(V(0, 1.7, 0), field);
      // hai dây thẳng song song
      const rod = new THREE.CylinderGeometry(0.06, 0.06, 3.4, 20);
      const wires = [C.blue, C.red].map((col) => {
        const w = new THREE.Mesh(rod, mat('#3A3730', {metalness: 0.6}));
        w.castShadow = true;
        const g = new THREE.Group().add(w);
        for (const r of [0.45, 0.85, 1.25]) for (const y of [-1.2, 0, 1.2]) g.add(Object.assign(k.line(col, 1.4, Array.from({length: 49}, (_, i) => [r * Math.cos((2 * Math.PI * i) / 48), y, r * Math.sin((2 * Math.PI * i) / 48)]).flat()), {}));
        return g;
      });
      const cur = [C.blue, C.red].map((c) => k.arrow(c, 0.05));
      const force = [k.arrow(C.green, 0.07), k.arrow(C.green, 0.07)];
      const wire = group(k, ...wires, ...cur.map((a) => a.obj), ...force.map((a) => a.obj));
      const tI = k.label('I₁', C.blue, true);
      const tJ = k.label('I₂', C.red, true);
      const O = V();
      return ({p, t, s}) => {
        const lor = s.mode === 'lorentz';
        field.visible = lor;
        wire.visible = !lor;
        if (lor) {
          const r = lorentzRadius(p.v * 1e6, p.B * 1e-3);
          const R = Math.max(0.15, Math.min(2.4, r / 5.69e-3));
          const dir = p.pos === 1 ? 1 : -1;
          const w = 1.1 / R;
          const at = (u: number) => [R * Math.cos(-dir * w * u), 0, R * Math.sin(-dir * w * u)];
          e.position.set(...(at(t) as [number, number, number]));
          (e.material as THREE.MeshStandardMaterial).color.set(p.pos === 1 ? C.red : C.blue);
          setLine(trail, Array.from({length: 61}, (_, i) => at(t - i * 0.04)).flat());
          setLine(orbit, Array.from({length: 97}, (_, i) => [R * Math.cos((2 * Math.PI * i) / 96), 0, R * Math.sin((2 * Math.PI * i) / 96)]).flat());
          k.caption(`Lực Lorentz luôn vuông góc v nên chỉ đổi hướng\nr = ${f2(r * 1000)} mm · T = ${f2(lorentzPeriod(p.B * 1e-3) * 1e9)} ns · hạt ${p.pos === 1 ? 'dương' : 'âm (electron)'}`);
        } else {
          const x = p.d * 0.12;
          wires[0].position.x = -x;
          wires[1].position.x = x;
          [p.I1, p.I2].forEach((I, i) => {
            const X = i ? x : -x;
            cur[i].set(V(X, I > 0 ? -1.5 : 1.5, 0), I === 0 ? V(X, I > 0 ? -1.5 : 1.5, 0) : V(X, I > 0 ? 1.5 : -1.5, 0));
          });
          const F = wireForcePerLength(p.I1, p.I2, p.d / 100);
          const len = Math.min(1.6, Math.abs(F) * 6.7e2);
          const sg = F > 0 ? 1 : -1;
          force[0].set(V(-x, 0, 0), F === 0 ? V(-x, 0, 0) : V(-x + sg * len, 0, 0));
          force[1].set(V(x, 0, 0), F === 0 ? V(x, 0, 0) : V(x - sg * len, 0, 0));
          tI(V(-x, 1.9, 0));
          tJ(V(x, 1.9, 0));
          k.caption(F === 0 ? 'Một dây không có dòng điện nên không có lực từ' : `Hai dòng ${F > 0 ? 'cùng chiều hút nhau' : 'ngược chiều đẩy nhau'}\nLực trên 1 m dây: ${f2(Math.abs(F) * 1000)} mN`);
        }
      };
    },
  },

  PHYS_EM_INDUCTION: {
    floor: true,
    dist: 7.5,
    target: [0, 0.9, 0],
    orbit: () => [32, 20],
    setup: (k) => {
      const mag = (x: number, col: string) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.8, 1.8), mat(col, {roughness: 0.4, metalness: 0.3}));
        m.position.set(x, 0.9, 0);
        m.castShadow = true;
        return m;
      };
      const lines: number[] = [];
      for (const y of [0.4, 0.9, 1.4]) for (const z of [-0.5, 0, 0.5]) lines.push(-1.4, y, z, 1.4, y, z);
      const cones = swarm(9, 0.05, '#8A857A');
      let n = 0;
      for (const y of [0.4, 0.9, 1.4]) for (const z of [-0.5, 0, 0.5]) {
        _o.position.set(0.1, y, z);
        _o.rotation.set(0, 0, -Math.PI / 2);
        _o.scale.setScalar(1);
        _o.updateMatrix();
        cones.setMatrixAt(n++, _o.matrix);
      }
      _o.rotation.set(0, 0, 0);
      cones.flush(n);
      k.scene.add(mag(-1.75, '#D9481C'), mag(1.75, '#2459C9'), k.line('#8A857A', 1.4, lines, true), cones);
      // khung dây (3 vòng) quay quanh trục đứng
      const loops = [-0.06, 0, 0.06].map((z) => k.line('#C2751A', 3.2, [-0.65, 0.1, z, 0.65, 0.1, z, 0.65, 1.7, z, -0.65, 1.7, z, -0.65, 0.1, z]));
      const coil = group(k, ...loops);
      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2, 16), mat('#3A3730', {metalness: 0.6}));
      axle.position.y = 0.9;
      k.scene.add(axle);
      k.label('N', '#D9481C', true)(V(-1.75, 2, 0));
      k.label('S', '#2459C9', true)(V(1.75, 2, 0));
      const cold = new THREE.Color('#C2751A');
      const hot = new THREE.Color('#FF2D1A');
      return ({p, t}) => {
        const w = 2 * Math.PI * p.f;
        const th = w * t;
        coil.rotation.y = Math.PI / 2 - th;
        const E0 = emfPeak(p.N, p.B, p.S, p.f);
        const e = E0 * Math.sin(th);
        const phi = p.N * p.B * p.S * 1e-4 * Math.cos(th);
        for (const l of loops) l.material.color.copy(cold).lerp(hot, Math.min(1, Math.abs(e) / E0));
        k.caption(`Φ = ${f3(phi)} Wb · e = ${f2(e)} V\nKhung song song với B thì Φ = 0 và e cực đại; vuông góc thì Φ cực đại và e = 0`);
      };
    },
  },

  PHYS_CIRCULAR_MOTION: {
    dist: 7.5,
    target: [0, 0, 0],
    orbit: () => [25, 38],
    setup: (k) => {
      // vật buộc dây
      const bob = ball('#2459C9', 0.14);
      const string = k.line('#6B665B', 2, [0, 0, 0, 1, 0, 0]);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 16).translate(0, 0.25, 0), mat('#3A3730'));
      const path = k.line('#CFC8B8', 1.4, zeros(97 * 3));
      const av = k.arrow(C.green, 0.035);
      const aa = k.arrow(C.red, 0.035);
      const lv = k.label('v', C.green, true);
      const la = k.label('a (hướng tâm)', C.red, true);
      const circle = group(k, bob, string, post, path, av.obj, aa.obj);
      // vệ tinh
      const earth = ball('#3D7BE0', 1, {roughness: 0.6});
      const grat: number[] = [];
      for (const lat of [-60, -30, 0, 30, 60]) {
        const c = Array.from({length: 49}, (_, i) => [1.005 * Math.cos(rad(lat)) * Math.cos((2 * Math.PI * i) / 48), 1.005 * Math.sin(rad(lat)), 1.005 * Math.cos(rad(lat)) * Math.sin((2 * Math.PI * i) / 48)]);
        grat.push(...segsOf(c).flat());
      }
      const sat = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.08), mat('#F2B33D', {metalness: 0.7}));
      sat.castShadow = true;
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.34), mat('#2C4DAA', {metalness: 0.5}));
      sat.add(panel);
      const ring = k.line('#9C968A', 1.4, zeros(97 * 3));
      const trail = k.line('#F2B33D', 2.4, zeros(41 * 3));
      const sky = group(k, earth, k.line('#DCE8FF', 1, grat, true), sat, ring, trail);
      const ls = k.label('Vệ tinh', '#B26A1A');
      const o = V();
      return ({p, t, s}) => {
        const isC = s.mode === 'circle';
        circle.visible = isC;
        sky.visible = !isC;
        if (isC) {
          const R = 1.2 * p.r;
          const w = (2 * Math.PI) / p.T;
          const ang = w * t;
          const v = w * p.r;
          const a = w * w * p.r;
          const at = (u: number) => V(R * Math.cos(u), 0.0, -R * Math.sin(u));
          const B = at(ang);
          bob.position.copy(B);
          setLine(string, [0, 0.5, 0, B.x, B.y, B.z]);
          setLine(path, Array.from({length: 97}, (_, i) => [R * Math.cos((2 * Math.PI * i) / 96), 0, -R * Math.sin((2 * Math.PI * i) / 96)]).flat());
          const tan = V(-Math.sin(ang), 0, -Math.cos(ang));
          const lenV = Math.min(1.0, v * 0.14);
          av.set(B, B.clone().addScaledVector(tan, lenV));
          aa.set(B, B.clone().multiplyScalar(1 - Math.min(0.6, ((v * v) / p.r) * 0.05)));
          lv(B.clone().addScaledVector(tan, lenV + 0.15));
          la(B.clone().multiplyScalar(0.55));
          ls(null);
          k.caption(`v = ${f2(v)} m/s · a = ${f2(a)} m/s² · F = ${f2(p.m * a)} N\nLực hướng tâm luôn vuông góc v nên chỉ đổi hướng`);
        } else {
          lv(null);
          la(null);
          // bán kính hiển thị nén (căn bậc hai) để cả quỹ đạo thấp lẫn địa tĩnh đều nằm trong khung
          const Rr = (6371 + p.hk) / 6371;
          const R = 1 + Math.sqrt(Rr - 1);
          const ang = ((2 * Math.PI) / 12) * t * (1.5 / orbitPeriodH(p.hk));
          const at = (u: number) => [R * Math.cos(u), 0, -R * Math.sin(u)];
          sat.position.set(...(at(ang) as [number, number, number]));
          sat.lookAt(0, 0, 0);
          setLine(ring, Array.from({length: 97}, (_, i) => at((2 * Math.PI * i) / 96)).flat());
          setLine(trail, Array.from({length: 41}, (_, i) => at(ang - i * 0.03)).flat());
          ls(sat.position.clone().add(o.set(0, 0.25, 0)));
          k.caption(`Độ cao ${p.hk} km: v = ${f2(orbitSpeed(p.hk) / 1000)} km/s · T = ${f2(orbitPeriodH(p.hk))} giờ\nTrái Đất bán kính 6371 km; ${MORE_CAMERA_NOTE}`);
        }
      };
    },
  },

  PHYS_KINETIC_GAS_PARTICLES: {
    floor: true,
    dist: 8,
    target: [0, 1.2, 0],
    orbit: () => [-30, 18],
    setup: (k) => {
      const U = 0.011; // px của bản SVG → đơn vị thế giới
      const rng = seeded(11);
      const pts = Array.from({length: 80}, () => {
        const f = [rng(), rng(), rng()];
        const th = rng() * 2 * Math.PI;
        const ph = Math.acos(2 * rng() - 1);
        return {f, d: [Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)], g: 0.4 + 1.2 * Math.abs(gauss(rng)) * 0.6};
      });
      const gas = swarm(80, 0.075, '#2459C9', {roughness: 0.25});
      const edges = k.line('#26231E', 2, zeros(24 * 3), true);
      const piston = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat('#A8A29E', {metalness: 0.5}));
      piston.castShadow = true;
      k.scene.add(gas, edges, piston);
      const Ly = 220 * U;
      const Lz = 2;
      return ({p, t}) => {
        const Lx = p.V * U;
        const sp = 24 * Math.sqrt(p.T / 300) * U;
        const x0 = -Lx / 2;
        const E = [[0, 0, 0], [Lx, 0, 0], [Lx, Ly, 0], [0, Ly, 0], [0, 0, Lz], [Lx, 0, Lz], [Lx, Ly, Lz], [0, Ly, Lz]].map(([x, y, z]) => [x + x0, y, z - Lz / 2]);
        const idx = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
        setLine(edges, idx.flatMap(([a, b]) => [...E[a], ...E[b]]));
        piston.scale.set(0.14, Ly, Lz);
        piston.position.set(x0 + Lx + 0.07, Ly / 2, 0);
        (gas.material as THREE.MeshStandardMaterial).color.set(p.T > 400 ? C.red : C.blue);
        const N = Math.round(p.N);
        for (let i = 0; i < N; i++) {
          const q = pts[i];
          const m = sp * q.g;
          gas.at(i, x0 + bounce(q.f[0] * Lx + m * q.d[0] * t, Lx), bounce(q.f[1] * Ly + m * q.d[1] * t, Ly), bounce(q.f[2] * Lz + m * q.d[2] * t, Lz) - Lz / 2);
        }
        gas.flush(N);
        k.caption(`${N} hạt chuyển động hỗn loạn ở ${Math.round(p.T)} K\nNhiệt độ cao hơn thì hạt nhanh hơn, va vào thành bình mạnh và nhiều hơn`);
      };
    },
  },

  PHYS_STATES_OF_MATTER: {
    floor: true,
    dist: 8,
    target: [0, 1.2, 0],
    orbit: () => [-28, 20],
    setup: (k) => {
      const rng = seeded(5);
      const mol = Array.from({length: 120}, () => ({a: rng() * 6.28, b: rng() * 6.28, r: [rng(), rng(), rng()]}));
      const swarmM = swarm(120, 0.14, '#2459C9', {roughness: 0.25});
      const W = 4.4;
      const H = 2.4;
      const D = 1.8;
      const E = [[0, 0, 0], [W, 0, 0], [W, H, 0], [0, H, 0], [0, 0, D], [W, 0, D], [W, H, D], [0, H, D]].map(([x, y, z]) => [x - W / 2, y, z - D / 2]);
      const idx = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
      k.scene.add(swarmM, k.line('#26231E', 2, idx.flatMap(([a, b]) => [...E[a], ...E[b]]), true));
      const state = k.label('', '#26231E', true);
      return ({p, t}) => {
        const st = p.T < 273 ? 0 : p.T < 373 ? 1 : 2;
        (swarmM.material as THREE.MeshStandardMaterial).color.set(['#2459C9', '#0E7C66', '#D9481C'][st]);
        mol.forEach((m, i) => {
          const c = i % 8;
          const r = Math.floor(i / 8) % 5;
          const l = Math.floor(i / 40);
          let x: number, y: number, z: number;
          if (st === 0) {
            const j = 0.05 * (p.T / 273);
            x = (c - 3.5) * 0.46 + j * Math.sin(3 * t + m.a);
            y = 0.5 + r * 0.42 + j * Math.cos(3 * t + m.b);
            z = (l - 1) * 0.5 + j * Math.sin(3 * t + m.a + m.b);
          } else if (st === 1) {
            x = (c - 3.5) * 0.46 + 0.17 * Math.sin(0.9 * t + m.a) + 0.11 * Math.sin(2 * t + m.b);
            y = 0.35 + r * 0.33 + 0.18 * Math.cos(0.7 * t + m.b);
            z = (l - 1) * 0.5 + 0.16 * Math.sin(1.1 * t + m.b);
          } else {
            const v = 0.66 * (p.T / 373);
            x = bounce(m.r[0] * (W - 0.4) + v * Math.cos(m.a) * t, W - 0.4) - (W - 0.4) / 2;
            y = 0.15 + bounce(m.r[1] * (H - 0.3) + v * Math.sin(m.b) * t, H - 0.3);
            z = bounce(m.r[2] * (D - 0.3) + v * Math.sin(m.a + m.b) * t, D - 0.3) - (D - 0.3) / 2;
          }
          swarmM.at(i, x, y, z);
        });
        swarmM.flush(120);
        state(V(W / 2 - 0.3, H + 0.2, 0), undefined, ['RẮN', 'LỎNG', 'KHÍ'][st]);
        k.caption(['Rắn: phân tử sắp xếp trật tự, chỉ dao động quanh vị trí cân bằng', 'Lỏng: phân tử sát nhau, trượt qua nhau', 'Khí: phân tử xa nhau, chuyển động hỗn loạn tự do'][st] + `\nNhiệt độ ${Math.round(p.T)} K`);
      };
    },
  },

  CHEM_BONDING: {
    floor: true,
    dist: 6,
    target: [0, 0.5, 0],
    orbit: () => [20, 16],
    setup: (k) => {
      k.controls.autoRotate = true;
      k.controls.autoRotateSpeed = 1.6;
      const bondMat = '#3A3730';
      const lobeMat = new THREE.MeshStandardMaterial({color: '#3D6FE0', transparent: true, opacity: 0.35, roughness: 0.3});
      const mols = Object.entries(MOL3).map(([key, atoms]) => {
        const g = new THREE.Group();
        g.position.y = 0.9;
        const pos = atoms.map(([, x, y, z]) => V(x, y, z));
        atoms.forEach(([sym], i) => {
          const [col, r] = CPK[sym];
          const b = ball(col, r, {roughness: 0.25});
          b.position.copy(pos[i]);
          g.add(b);
        });
        const mol = MOLECULES[key];
        const nb: THREE.Vector3[][] = atoms.map(() => []);
        for (const [a, b, n] of mol.bonds) {
          const d = pos[b].clone().sub(pos[a]).normalize();
          nb[a].push(d.clone());
          nb[b].push(d.clone().negate());
          const perp = Math.abs(d.z) < 0.9 ? d.clone().cross(V(0, 0, 1)).normalize() : d.clone().cross(V(0, 1, 0)).normalize();
          for (let i = 0; i < n; i++) {
            const off = perp.clone().multiplyScalar((i - (n - 1) / 2) * 0.13);
            g.add(k.line(bondMat, n > 1 ? 4.5 : 7, [...pos[a].clone().add(off).toArray(), ...pos[b].clone().add(off).toArray()], true));
          }
        }
        // cặp electron chưa liên kết: thùy mờ hướng ra xa các liên kết
        atoms.forEach(([sym], i) => {
          const L = mol.atoms[i].lone;
          if (!L || !nb[i].length) return;
          const S = nb[i].reduce((s, d) => s.add(d), V());
          const base = S.length() > 0.25 ? S.clone().negate().normalize() : nb[i][0].clone().negate();
          const ref = nb[i].length > 1 ? nb[i][0].clone().cross(nb[i][1]).normalize() : Math.abs(base.y) < 0.9 ? base.clone().cross(V(0, 1, 0)).normalize() : base.clone().cross(V(1, 0, 0)).normalize();
          const side = base.clone().cross(ref);
          for (let j = 0; j < L; j++) {
            const th = L === 1 ? 0 : rad(55);
            const az = (2 * Math.PI * j) / L;
            const dir = base.clone().multiplyScalar(Math.cos(th)).addScaledVector(ref, Math.cos(az) * Math.sin(th)).addScaledVector(side, Math.sin(az) * Math.sin(th)).normalize();
            const lobe = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), lobeMat);
            lobe.scale.set(0.13, 0.13, 0.27);
            lobe.quaternion.setFromUnitVectors(V(0, 0, 1), dir);
            lobe.position.copy(pos[i]).addScaledVector(dir, CPK[sym][1] + 0.18);
            g.add(lobe);
          }
        });
        k.scene.add(g);
        const tags = atoms.map(([sym], i) => ({put: k.label(sym, undefined, true), pos: pos[i].clone().add(V(0, CPK[sym][1] + 0.2, 0))}));
        return {key, g, tags};
      });
      // NaCl: mảnh mạng tinh thể lập phương tâm mặt (3×3×3)
      const na = swarm(14, 0.42, '#7D5BD6', {roughness: 0.2});
      const cl = swarm(13, 0.55, '#3DAA6B', {roughness: 0.2});
      let a = 0;
      let b = 0;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let l = 0; l < 3; l++) {
        const P: [number, number, number] = [(i - 1) * 1.15, (j - 1) * 1.15, (l - 1) * 1.15];
        if ((i + j + l) % 2 === 0) na.at(a++, ...P);
        else cl.at(b++, ...P);
      }
      na.flush(a);
      cl.flush(b);
      const lattice = group(k, na, cl);
      lattice.position.y = 1.3;
      const tNa = k.label('Na⁺', '#7D5BD6', true);
      const tCl = k.label('Cl⁻', '#2E8A57', true);
      return ({s}) => {
        const ionic = !!MOLECULES[s.m]?.ionic;
        lattice.visible = ionic;
        for (const m of mols) {
          const on = !ionic && m.key === s.m;
          m.g.visible = on;
          m.tags.forEach((tg) => tg.put(on ? tg.pos : null, m.g));
        }
        tNa(ionic ? V(-1.15, 1.3 - 1.15, -1.15 + 0.7) : null);
        tCl(ionic ? V(0, 1.3 - 1.15, -1.15 + 0.7) : null);
        const m = MOLECULES[s.m];
        k.caption(`${m.label} · ${m.geom}\n${m.energy}`);
      };
    },
  },

  CHEM_LIPID_SOAP: {
    dist: 6.5,
    target: [0, 0, 0],
    orbit: () => [20, 18],
    setup: (k) => {
      const oil = ball('#B45309', 0.9, {transparent: true, opacity: 0.88, roughness: 0.5});
      const heads = swarm(24, 0.14, '#3D7BE0', {roughness: 0.25});
      const free = swarm(18, 0.1, '#3D7BE0', {roughness: 0.25});
      const ca = swarm(6, 0.14, '#9CA3AF', {metalness: 0.3});
      const tails = k.line('#26231E', 2.6, zeros(24 * 6), true);
      const tailsF = k.line('#26231E', 2.2, zeros(18 * 6), true);
      group(k, oil, heads, free, ca, tails, tailsF);
      k.label('dầu mỡ', '#B45309', true)(V(0, 0, 0));
      const rng = seeded(4);
      const spots = Array.from({length: 18}, () => {
        const th = rng() * 2 * Math.PI;
        const ph = Math.acos(2 * rng() - 1);
        const R = 2.4 + rng() * 1.1;
        return {x: R * Math.sin(ph) * Math.cos(th), y: R * Math.cos(ph), z: R * Math.sin(ph) * Math.sin(th), a: rng() * 6.28, b: rng() * 6.28};
      });
      const unit = (i: number, n: number) => {
        // điểm phân bố đều trên mặt cầu (xoắn ốc Fibonacci)
        const y = 1 - (2 * (i + 0.5)) / n;
        const r = Math.sqrt(1 - y * y);
        const th = i * 2.399963;
        return V(r * Math.cos(th), y, r * Math.sin(th));
      };
      return ({p, t}) => {
        const eff = p.hard === 1 ? p.c * 0.45 : p.c;
        const ringN = Math.round(24 * Math.min(1, eff / 100));
        const tl: number[] = [];
        for (let i = 0; i < ringN; i++) {
          const u = unit(i, 24);
          const h = u.clone().multiplyScalar(1.85);
          heads.at(i, h.x, h.y, h.z);
          tl.push(...u.clone().multiplyScalar(0.95).toArray(), ...u.clone().multiplyScalar(1.75).toArray());
        }
        heads.flush(ringN);
        setLine(tails, [...tl, ...zeros(24 * 6 - tl.length)]);
        const nf = Math.min(18, Math.round(eff / 8));
        const fl: number[] = [];
        for (let i = 0; i < 18; i++) {
          const s = spots[i];
          const x = s.x + 0.15 * Math.sin(t * 1.3 + s.a);
          const y = s.y + 0.15 * Math.cos(t * 1.1 + s.b);
          const z = s.z + 0.15 * Math.sin(t * 0.9 + s.b);
          free.at(i, x, y, z);
          const d = V(Math.cos(t * 0.7 + s.a), Math.sin(t * 0.6 + s.b), Math.cos(t * 0.5 + s.b + s.a)).normalize().multiplyScalar(0.32);
          fl.push(x, y, z, x + d.x, y + d.y, z + d.z);
        }
        free.flush(nf);
        setLine(tailsF, i0(fl, nf));
        if (p.hard === 1) {
          for (let i = 0; i < 6; i++) ca.at(i, -2.7 + i * 1.08, -2.3 + (i % 2) * 0.5, 1.2 - (i % 3) * 0.9);
          ca.flush(6);
        } else ca.flush(0);
        k.caption(ringN >= 24 ? 'Đã tạo micelle: đuôi kị nước hướng vào dầu, đầu ưa nước hướng ra nước' : `Chưa đủ xà phòng: ${ringN}/24 phân tử bám quanh giọt dầu`);
      };
    },
  },
};
/** Giữ n đoạn đầu, phần còn lại dồn về gốc (độ dài mảng cố định để cập nhật tại chỗ). */
function i0(seg: number[], n: number): number[] {
  return seg.map((v, i) => (i < n * 6 ? v : 0));
}
