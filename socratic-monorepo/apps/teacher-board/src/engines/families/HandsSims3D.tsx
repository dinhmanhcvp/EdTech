'use client';

import React, {useMemo} from 'react';
import * as THREE from 'three';
import {condensateFraction, criticalT} from '../../utils/lab/hands/sims/bec';
import {RHO0, THRESHOLD, match, strain, TRUE} from '../../utils/lab/hands/sims/ligo';
import {fringe, orderWeight, visibility} from '../../utils/lab/hands/sims/matterwave';
import {SIM_BY_ID} from '../../utils/lab/hands/sims';
import {fmt, fromUnit, toUnit, type Values} from '../../utils/lab/hands/sims/types';
import {handPointers, handSliders, labRoom, type HandsInput} from './handsKit';
import {handOps, padBank} from './handsOps';
import {OPS} from '../../utils/lab/hands/sims/ops';
import {solid} from './handsModels';
import {dress, partOf, place, withSims2} from './labParts';
import {ADVANCED_SCENES} from './HandsSimsAdvanced3D';
import {MISHAPS, mishapOf} from '../../utils/lab/hands/mishap';
import {mishapFx, mishapSound} from './mishapFx';
import {CHEM_LABS} from './HandsChemOps3D';
import {collisionLab} from './HandsCollision3D';
import {ENG_LABS} from './HandsEngOps3D';
import {THPT_SCENES} from './HandsSimsThpt3D';
import {Stage3D, setLine, type Kit, type SceneDef} from './Stage3D';

/** Giá trị thanh trượt dùng chung giữa bảng điều khiển React và cảnh 3D. */
export interface SimLive {
  id: string;
  v: Values;
  set: (id: string, x: number) => void;
  /** bộ đếm số lần bấm từng nút riêng của bài (nút khai báo ở `ops.actions`); cảnh so với lần trước để biết vừa có thao tác */
  events: Record<string, number>;
  act: (id: string) => void;
  /**
   * Chỗ lắp NGAY TRÊN thiết bị cho từng nhóm bộ phận (khoá = id tham số): cảnh tạo và cập nhật vị trí mỗi khung hình
   * (ví dụ mặt trên của xe đang chạy); bộ thao tác thả vật vào đúng chỗ đó thay cho ổ lắp ở mép bàn.
   */
  anchors?: Record<string, THREE.Vector3>;
  /** do `makeDef` gán: cảnh gọi khi thao tác sai gây hậu quả (id trong `MISHAPS`); vẽ hiệu ứng ở `at`, phát âm thanh và báo thẻ sự cố */
  hazard?: (id: string, at?: THREE.Vector3) => void;
  /** do bảng điều khiển gán: nhận id sự cố để hiện thẻ giải thích */
  report?: (id: string) => void;
}
type Ctx = {k: Kit; live: SimLive};
/** mỗi bài dựng vật thể rồi trả hàm cập nhật mỗi khung hình (trả chú thích) */
export type Scene = (c: Ctx) => (now: number, dt: number) => string;

const rnd = () => Math.random();
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());

// ------------------------------------------------------------------ giao thoa C60
const matterwave: Scene = ({k, live}) => {
  const Y = 0.5;
  const Z = -1.0;
  const FLOOR = 0.09; // phân tử bay sát mặt bàn để vân nhìn rõ từ trên xuống
  const oven = solid(k.scene, new THREE.CylinderGeometry(0.35, 0.4, 0.7, 24).rotateZ(Math.PI / 2), '#D9481C', {metal: 0.5, rough: 0.4, x: -3.3, y: Y, z: Z});
  k.label('Lò bay hơi')(new THREE.Vector3(-3.3, 1.1, Z));
  const slitPlate = solid(k.scene, new THREE.BoxGeometry(0.06, 0.8, 0.9), '#6B7380', {metal: 0.6, x: -2.3, y: Y, z: Z});
  // cách tử: nhiều khe song song
  for (let i = -6; i <= 6; i++) solid(k.scene, new THREE.BoxGeometry(0.04, 0.3, 0.045), '#C9CED6', {metal: 0.8, x: -0.3, y: FLOOR + 0.15, z: Z + i * 0.065});
  k.label('Cách tử 100 nm')(new THREE.Vector3(-0.3, 1.2, Z));
  const SCREEN_X = 2.9;
  const screen = solid(k.scene, new THREE.BoxGeometry(1.5, 0.04, 3.6), '#15171B', {rough: 0.6, x: SCREEN_X, y: 0.02, z: Z});
  withSims2((lib) => {
    dress(oven, partOf(lib, 'Oven'));
    dress(slitPlate, partOf(lib, 'SlitPlate'));
    dress(screen, partOf(lib, 'DetScreen'));
    place(k.scene, lib, 'GratingFrame', [-0.3, 0, Z]); // khung giữ cách tử; các khe vẫn là hình khối
  });
  k.label('Màn đầu dò (nhìn từ trên)')(new THREE.Vector3(SCREEN_X, 0.5, Z - 1.9));
  const N = 4000;
  const dots = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3)), new THREE.PointsMaterial({color: '#7FFFB0', size: 5, sizeAttenuation: false}));
  dots.frustumCulled = false;
  k.scene.add(dots);
  const mol = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({color: '#FFD27F'}));
  k.scene.add(mol);
  let count = 0;
  let key = '';
  let owed = 0;
  let flight = {t0: 0, y: Z};
  return (now, dt) => {
    const sig = `${live.v.T}|${live.v.m}|${live.v.p}`;
    if (sig !== key) {
      key = sig;
      count = 0; // đổi thông số thì xoá màn, thu lại
    }
    // mỗi khung hình thêm vài phân tử: chọn bậc nhiễu xạ (kết hợp) hoặc vệt rộng (đã mất kết hợp)
    const dy = Math.min(1.1, (fringe(live.v.T, live.v.m) / 31e-6) * 0.5);
    const vis = visibility(live.v.p);
    const a = dots.geometry.attributes.position as THREE.BufferAttribute;
    owed += dt * 300; // 300 phân tử mỗi giây
    for (; owed >= 1 && count < N; owed--) {
      let z: number;
      if (rnd() < vis) {
        let n = 0;
        let r = rnd() * 2.2;
        for (const c of [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5]) {
          r -= orderWeight(Math.abs(c));
          if (r <= 0) {
            n = c;
            break;
          }
        }
        z = Z + n * dy + gauss() * dy * 0.08;
      } else z = Z + gauss() * dy * 1.3;
      z = Math.max(Z - 1.7, Math.min(Z + 1.7, z));
      a.setXYZ(count++, SCREEN_X + (rnd() - 0.5) * 1.3, 0.06, z);
      flight = {t0: now, y: z};
    }
    a.needsUpdate = true;
    dots.geometry.setDrawRange(0, count);
    const u = ((now - flight.t0) / 400) % 1;
    mol.position.set(-3 + u * 6, FLOOR + 0.12, Z + (flight.y - Z) * Math.max(0, (u * 6 - 2.7) / 3.3));
    return `${count} phân tử đã rơi trên màn\nĐổi thông số thì xoá màn và thu lại; vân hiện dần khi có vài trăm phân tử`;
  };
};

// ------------------------------------------------------------------ LIGO: lọc khớp mẫu
const ligo: Scene = ({k, live}) => {
  const X0 = -3.3;
  const X1 = 3.3;
  const rows = [-2.25, -1.3, -0.35];
  const names = ['Dữ liệu cảm biến: nhiễu + tín hiệu chìm bên trong', 'Mẫu dạng sóng (m₁, m₂) của bạn', 'Đầu ra bộ lọc khớp mẫu'];
  rows.forEach((z, i) => {
    solid(k.scene, new THREE.BoxGeometry(X1 - X0 + 0.3, 0.04, 0.9), '#15171B', {rough: 0.7, x: (X0 + X1) / 2, y: 0.02, z});
    k.label(names[i])(new THREE.Vector3((X0 + X1) / 2, 0.1, z - 0.55));
  });
  withSims2((lib) => rows.forEach((z) => place(k.scene, lib, 'ScopeBezel', [0, 0, z]))); // viền màn hiện sóng
  const N = 700;
  const seed = (i: number) => {
    const a = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
    const b = Math.sin(i * 39.346 + 11.135) * 24634.6345;
    return Math.sqrt(-2 * Math.log(a - Math.floor(a) + 1e-6)) * Math.cos(2 * Math.PI * (b - Math.floor(b)));
  };
  const noise = Array.from({length: N}, (_, i) => seed(i));
  const out = Array.from({length: N}, (_, i) => seed(i + 5000));
  const mk = (color: string, w: number) => {
    const l = k.line(color, w, new Array(N * 3).fill(0));
    k.scene.add(l);
    return l;
  };
  const data = mk('#7FFFB0', 2);
  const tmpl = mk('#FF9A4D', 3);
  const peak = mk('#FFFFFF', 3);
  const thr = k.line('#FF3B3B', 2, [X0, 0.1, rows[2] - THRESHOLD * 0.025, X1, 0.1, rows[2] - THRESHOLD * 0.025]);
  k.scene.add(thr);
  k.label('ngưỡng ρ = 8')(new THREE.Vector3(X1 + 0.5, 0.1, rows[2] - THRESHOLD * 0.025));
  let key = '';
  return () => {
    const sig = `${live.v.m1}|${live.v.m2}|${live.v.n}`;
    if (sig === key) return rowText;
    key = sig;
    const {m1, m2, n} = live.v;
    const d: number[] = [];
    const t: number[] = [];
    const o: number[] = [];
    const rho = (RHO0 * match(m1, m2)) / n;
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      const x = X0 + u * (X1 - X0);
      const tau = 0.25 - u * 0.3; // từ 0,25 s trước sáp nhập tới 0,05 s sau
      d.push(x, 0.1, rows[0] + (noise[i] * 0.13 * n + strain(tau, TRUE.m1, TRUE.m2) * 0.1));
      t.push(x, 0.1, rows[1] + strain(tau, m1, m2) * 0.28);
      const bump = rho * 0.025 * Math.exp(-(((tau - 0) / 0.012) ** 2));
      o.push(x, 0.1, rows[2] - Math.max(0, bump) + out[i] * 0.012 * n);
    }
    setLine(data, d);
    setLine(tmpl, t);
    setLine(peak, o);
    rowText = `ρ = ${rho.toFixed(1)}  ${rho >= THRESHOLD ? '≥ ngưỡng 8: phát hiện sóng hấp dẫn' : '< ngưỡng 8: chưa thấy tín hiệu'}
Chỉnh khối lượng hai lỗ đen và mức nhiễu bằng các con trượt vàng`;
    return rowText;
  };
};
let rowText = '';

// ------------------------------------------------------------------ BEC: ảnh sau khi thả bẫy
const bec: Scene = ({k, live}) => {
  const CZ = -1.3;
  const CX = 0;
  solid(k.scene, new THREE.BoxGeometry(5.2, 0.04, 2.6), '#0C1118', {rough: 0.6, x: CX, y: 0.02, z: CZ});
  withSims2((lib) => {
    place(k.scene, lib, 'ImageBezel', [CX, 0, CZ]);
    const chamber = place(k.scene, lib, 'BecChamber', [-3.5, 0, CZ]); // buồng chân không có hai cuộn từ giữ đám nguyên tử, đặt bên trái màn ảnh
    if (chamber) chamber.obj.rotation.y = Math.PI / 2; // bơm ion quay ra phía sau
  });
  k.label('Buồng chân không + cuộn từ')(new THREE.Vector3(-3.5, 1.0, CZ));
  k.label('Ảnh hấp thụ sau khi thả bẫy 20 ms (nhìn từ trên)')(new THREE.Vector3(CX, 0.1, CZ - 1.5));
  const N = 2500;
  const pos = new Float32Array(N * 3);
  const pts = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)), new THREE.PointsMaterial({color: '#FFB35C', size: 3, sizeAttenuation: false, transparent: true, opacity: 0.85}));
  pts.frustumCulled = false;
  k.scene.add(pts);
  const kind = new Float32Array(N);
  const prof = k.line('#7FFFB0', 3, new Array(80 * 3).fill(0));
  k.scene.add(prof);
  const g = () => Math.sqrt(-2 * Math.log(Math.random() + 1e-9)) * Math.cos(2 * Math.PI * Math.random());
  let key = '';
  let text = '';
  return () => {
    const sig = `${live.v.T}|${live.v.N}|${live.v.f}`;
    if (sig === key) return text;
    key = sig;
    const Tc = criticalT(live.v.N, live.v.f);
    const f0 = condensateFraction(live.v.T, Tc);
    const sTh = 0.75 * Math.sqrt(live.v.T / 300);
    // đám ngưng tụ: nhỏ và đặc (Thomas–Fermi), nở theo số nguyên tử ngưng tụ và độ cứng của bẫy
    const sBec = 0.16 * Math.pow((f0 * live.v.N) / 1e5 + 0.05, 0.2) * Math.sqrt(100 / live.v.f) + 0.05;
    for (let i = 0; i < N; i++) {
      const c = i / N < f0;
      kind[i] = c ? 1 : 0;
      const s = c ? sBec : sTh;
      pos[i * 3] = CX + Math.max(-2.5, Math.min(2.5, g() * s));
      pos[i * 3 + 1] = 0.06;
      pos[i * 3 + 2] = CZ + Math.max(-1.2, Math.min(1.2, g() * s * 0.8));
    }
    (pts.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    // mật độ dọc trục x: nền nhiệt rộng + đỉnh hẹp của đám ngưng tụ
    const line: number[] = [];
    for (let i = 0; i < 80; i++) {
      const x = -2.5 + (i / 79) * 5;
      const th = (1 - f0) * Math.exp(-(x * x) / (2 * sTh * sTh)) * 0.5;
      const cd = f0 > 0 ? f0 * Math.max(0, 1 - (x / (2.2 * sBec)) ** 2) ** 1.5 * 1.1 : 0;
      line.push(CX + x, 0.1, CZ + 1.45 - (th + cd));
    }
    setLine(prof, line);
    text = `T/T_c = ${(live.v.T / Tc).toFixed(2)} · ${(f0 * 100).toFixed(0)} % ngưng tụ\nGiảm nhiệt độ: đỉnh hẹp của đám ngưng tụ mọc lên trên nền nhiệt rộng`;
    return text;
  };
};

const SCENES: Record<string, Scene> = {...THPT_SCENES, ...ADVANCED_SCENES, matterwave, ligo, bec};

/** nơi hiệu ứng sự cố xuất hiện cho các bài phát sự cố theo tham số (toạ độ cảnh) */
const ANCHOR: Record<string, [number, number, number]> = {thomson: [-0.5, 1.1, -1.2], harmonic: [0, 0.6, -1.2], fatigue: [0, 0.4, -1.2]};

function makeDef(input: HandsInput, live: SimLive): SceneDef {
  const spec = SIM_BY_ID[live.id];
  return {
    floor: true,
    room: true,
    dist: 9,
    target: [-0.2, 0.2, -0.2],
    orbit: () => [0, 50],
    setup: (k) => {
      labRoom(k, [8.4, 5.6, -0.3, 0.1]);
      solid(k.scene, new THREE.BoxGeometry(8.4, 0.12, 5.6), '#1C1F4A', {rough: 0.9, x: -0.3, y: -0.056, z: 0.1});
      const P = handPointers(k, input, 0.3);
      // hậu quả thao tác sai: hiệu ứng 3D + âm thanh + thẻ sự cố; sự cố do tham số (quá nhiệt, quá dòng…) phát hiện theo giá trị hiện tại, mỗi lần chuyển từ an toàn sang nguy hiểm
      const fx = mishapFx(k);
      let current: string | null = null;
      live.hazard = (id, at) => {
        const mh = MISHAPS[id];
        if (!mh) return;
        const a = ANCHOR[live.id];
        fx.go(mh.kind, at ?? (a ? new THREE.Vector3(...a) : new THREE.Vector3(0, 0.7, -1.2)));
        mishapSound(mh.kind);
        live.report?.(id);
      };
      const watch = (dt: number) => {
        const id = mishapOf(live.id, live.v);
        if (id !== current) {
          current = id;
          if (id) live.hazard!(id);
        }
        fx.update(dt);
      };
      const custom = live.id === 'collision' ? collisionLab : CHEM_LABS[live.id] ?? ENG_LABS[live.id];
      if (custom) {
        // bài thao tác trực tiếp trên dụng cụ (va chạm, bốn bài hóa, ba bài kĩ thuật): không qua núm hay ổ lắp
        const lab = custom({k, P, live});
        // dải nút − / + ở mép trước bàn cho mọi tham số liên tục (va chạm đã có thao tác riêng cho khối lượng và đệm)
        const bank = padBank(k, P, spec, () => live.v, (id, x) => live.set(id, x), live.id === 'collision' ? ['m1', 'm2', 'e'] : []);
        P.grabWhen((nx, ny) => lab.grab(nx, ny) || bank.grab(nx, ny));
        let t0 = performance.now();
        return () => {
          const now = performance.now();
          const dt = Math.min((now - t0) / 1000, 0.05);
          t0 = now;
          P.step(1 - Math.exp(-dt * 28));
          bank.step();
          watch(dt);
          k.caption(lab.step(now, dt));
        };
      }
      const run = SCENES[live.id]({k, live});
      // nhóm Vật lí: thao tác trực tiếp (núm xoay, chọn bộ phận); các nhóm khác tạm còn thanh trượt
      const ops = OPS[live.id];
      const sliders = ops
        ? handOps(k, P, spec, ops, (id, x) => live.set(id, x), live.act, live.anchors)
        : handSliders(
            k,
            P,
            spec.params.map((p) => ({id: p.id, label: p.label, t: toUnit(p, live.v[p.id])})),
            [-3.9, 0.9],
            (id, t) => live.set(id, fromUnit(spec.params.find((p) => p.id === id)!, t)),
            (id) => fmt(spec.params.find((p) => p.id === id)!, live.v[id]),
          );
      P.grabWhen((nx, ny) => sliders.grab(nx, ny));
      let last = performance.now();
      return () => {
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        P.step(1 - Math.exp(-dt * 28));
        sliders.step(ops ? live.v : Object.fromEntries(spec.params.map((p) => [p.id, toUnit(p, live.v[p.id])])));
        watch(dt);
        k.caption(run(now, dt));
      };
    },
  };
}

const HandsSims3D: React.FC<{input: HandsInput; live: SimLive; onFail: () => void}> = ({input, live, onFail}) => {
  const def = useMemo(() => makeDef(input, live), [input, live]);
  return <Stage3D fill def={def} p={{}} t={0} s={{}} onFail={onFail} />;
};
export default HandsSims3D;
