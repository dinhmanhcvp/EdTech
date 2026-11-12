import * as THREE from 'three';
import {C, f1, f2, seeded} from '../../utils/presets/sceneKit';
import {surfaceToVolume} from '../../utils/presets/sinh2Scene';
import type {SceneDef} from './Stage3D';
import {V, ball, bilayer, group, mat, swarm} from './Scenes3DMore';

const rad = (d: number) => (d * Math.PI) / 180;
const BASE: Record<string, string> = {A: '#4F7FE0', T: '#F2B33D', G: '#2E9E6B', C: '#D9576B'};
/** Đường đứt giữa a và b: các đoạn ngắn rời nhau. */
const dashed = (a: THREE.Vector3, b: THREE.Vector3, n = 9) => {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(...a.clone().lerp(b, (i + 0.15) / n).toArray(), ...a.clone().lerp(b, (i + 0.65) / n).toArray());
  return out;
};

export const BIO_SCENES: Record<string, SceneDef> = {
  BIO_BIOMOLECULES: {
    dist: 9.5,
    target: [0, 0, 0],
    orbit: () => [25, 14],
    setup: (k) => {
      // --- nước: ba phân tử, liên kết hydrogen nối H (δ+) với O (δ−) của phân tử kế
      const P = [V(-1.1, 0.2, 0), V(1.0, 0.4, 0), V(0, -1.5, 0.3)];
      const water = group(k);
      const hb: number[] = [];
      P.forEach((o, i) => {
        const d = P[(i + 1) % 3].clone().sub(o).normalize();
        const ax = V(0, 0, 1);
        const h0 = o.clone().addScaledVector(d, 0.75);
        const h1 = o.clone().add(d.clone().multiplyScalar(0.75 * Math.cos(rad(104.5))).addScaledVector(ax.clone().cross(d), 0.75 * Math.sin(rad(104.5))));
        const O = ball('#E0453A', 0.26, {roughness: 0.25});
        O.position.copy(o);
        const H0 = ball('#F4F2EC', 0.15);
        H0.position.copy(h0);
        const H1 = ball('#F4F2EC', 0.15);
        H1.position.copy(h1);
        water.add(O, H0, H1, k.line('#3A3730', 6, [...o.toArray(), ...h0.toArray(), ...o.toArray(), ...h1.toArray()], true));
        hb.push(...dashed(h0, P[(i + 1) % 3].clone().addScaledVector(d, -0.3)));
      });
      water.add(k.line(C.blue, 2.2, hb, true));
      const tw = k.label('liên kết hydrogen', C.blue);
      // --- phospholipid: lớp kép
      const lipid = bilayer(k, 9, 7, 0.34, 0.95, 0.12);
      k.scene.add(lipid);
      const tOut = k.label('ngoài tế bào (nước)', C.blue, true);
      const tTail = k.label('đuôi acid béo kị nước', C.orange, true);
      const tIn = k.label('trong tế bào (nước)', C.blue, true);
      // --- protein: bốn bậc cấu trúc
      const colors = ['#E0453A', '#3D6FE0', '#F2B33D', '#2E9E6B'];
      const l1 = group(k, k.line('#A39E93', 2.4, Array.from({length: 14}, (_, i) => [-2.7 + i * 0.42, 0, 0]).flat()));
      colors.concat(colors, colors, colors).slice(0, 14).forEach((c, i) => {
        const b = ball(c, 0.17);
        b.position.set(-2.7 + i * 0.42, 0, 0);
        l1.add(b);
      });
      const l2 = group(k, k.line('#2459C9', 6, Array.from({length: 121}, (_, i) => [-2.6 + i * 0.044, 0.5 * Math.sin(i * 0.3), 0.5 * Math.cos(i * 0.3)]).flat()));
      const tre = (a: number): number[] => {
        const x = Math.sin(a) + 2 * Math.sin(2 * a);
        const y = Math.cos(a) - 2 * Math.cos(2 * a);
        const z = -Math.sin(3 * a);
        return [0.62 * x + 0.12 * Math.cos(13 * a), 0.62 * y + 0.12 * Math.sin(13 * a), 0.62 * z + 0.12 * Math.cos(13 * a + 1)];
      };
      const l3 = group(k, k.line('#6B4BC8', 5, Array.from({length: 301}, (_, i) => tre((2 * Math.PI * i) / 300)).flat()));
      const subs = [[-0.85, 0.6, 0.4, '#E88A9A', 'α'], [0.85, -0.6, 0.4, '#6C9BE8', 'β'], [0.85, 0.6, -0.4, '#E88A9A', 'α'], [-0.85, -0.6, -0.4, '#6C9BE8', 'β']] as const;
      const l4 = group(k, ...subs.map(([x, y, z, c]) => {
        const b = ball(c, 0.78, {roughness: 0.4});
        b.position.set(x, y, z);
        return b;
      }));
      const tSub = subs.map(([, , , , g]) => k.label(g, '#26231E', true));
      const caps = ['', 'BẬC 1: trình tự amino acid nối bằng liên kết peptide', 'BẬC 2: xoắn α, gấp nếp β (liên kết hydrogen)', 'BẬC 3: một chuỗi cuộn gấp trong không gian', 'BẬC 4: nhiều chuỗi polypeptide ghép lại'];
      // --- nucleic acid: xoắn kép, các cặp base bổ sung
      const N = 80;
      const helix = (s: number) => Array.from({length: N + 1}, (_, i) => [0.8 * Math.cos(i * 0.2 + s * Math.PI), -2.1 + i * 0.053, 0.8 * Math.sin(i * 0.2 + s * Math.PI)]);
      const h0 = helix(0);
      const h1 = helix(1);
      const dna = group(k, k.line('#8A857A', 6, h0.flat()), k.line('#8A857A', 6, h1.flat()));
      const pairs = [['A', 'T'], ['G', 'C'], ['T', 'A'], ['C', 'G'], ['A', 'T']];
      for (let j = 0; j < 10; j++) {
        const i = 4 + j * 8;
        const [x, y] = pairs[j % 5];
        const a = V(...(h0[i] as [number, number, number]));
        const b = V(...(h1[i] as [number, number, number]));
        const m = a.clone().lerp(b, 0.5);
        dna.add(k.line(BASE[x], 8, [...a.toArray(), ...m.toArray()], true), k.line(BASE[y], 8, [...m.toArray(), ...b.toArray()], true));
      }
      const tAT = k.label('A–T: 2 liên kết hydrogen', '#4F7FE0');
      const tGC = k.label('G≡C: 3 liên kết hydrogen', '#2E9E6B');
      const mid = (i: number) => V(...(h0[i] as [number, number, number])).lerp(V(...(h1[i] as [number, number, number])), 0.5);
      return ({p, t, s}) => {
        const m = s.m;
        const lvl = Math.round(p.lvl);
        water.visible = m === 'water';
        lipid.visible = m === 'lipid';
        l1.visible = m === 'protein' && lvl === 1;
        l2.visible = m === 'protein' && lvl === 2;
        l3.visible = m === 'protein' && lvl === 3;
        l4.visible = m === 'protein' && lvl === 4;
        dna.visible = m === 'nucleic';
        const wob = Math.sin(t * 1.5) * 0.06;
        water.rotation.set(wob, t * 0.35, wob);
        l3.rotation.y = t * 0.5;
        l4.rotation.y = t * 0.5;
        dna.rotation.y = t * 0.5;
        tw(m === 'water' ? V(0, -0.3, 0.3) : null);
        tOut(m === 'lipid' ? V(0, 1.6, 0) : null);
        tTail(m === 'lipid' ? V(0, 0, 1.6) : null);
        tIn(m === 'lipid' ? V(0, -1.6, 0) : null);
        subs.forEach(([x, y, z], i) => tSub[i](m === 'protein' && lvl === 4 ? V(x, y, z).applyAxisAngle(V(0, 1, 0), t * 0.5) : null));
        tAT(m === 'nucleic' ? mid(4).applyAxisAngle(V(0, 1, 0), t * 0.5) : null);
        tGC(m === 'nucleic' ? mid(12).applyAxisAngle(V(0, 1, 0), t * 0.5) : null);
        k.caption(
          m === 'water' ? 'Nước: phân tử phân cực, tạo liên kết hydrogen' : m === 'lipid' ? 'Lớp kép phospholipid: khung của màng sinh chất' : m === 'protein' ? caps[lvl] : 'Nucleic acid: A = T (2 liên kết H), G ≡ C (3 liên kết H)',
        );
      };
    },
  },

  BIO_MEMBRANE_TRANSPORT: {
    dist: 8,
    target: [0, 0, 0],
    orbit: () => [24, 14],
    setup: (k) => {
      k.scene.add(bilayer(k, 14, 6, 0.46, 0.2, 0.0));
      const rod = new THREE.CylinderGeometry(0.36, 0.36, 0.95, 28);
      const chan = Object.assign(new THREE.Mesh(rod, mat('#9BD442', {roughness: 0.4})), {castShadow: true});
      const pump = Object.assign(new THREE.Mesh(rod, mat('#E58FB8', {roughness: 0.4})), {castShadow: true});
      k.scene.add(chan, pump);
      const rng = seeded(8);
      const spots = Array.from({length: 40}, () => [rng(), rng(), rng(), rng() * 6.28]);
      const solute = swarm(40, 0.1, '#D9481C', {roughness: 0.3});
      const mover = swarm(6, 0.14, '#2E7D32', {roughness: 0.2, emissive: '#2E7D32', emissiveIntensity: 0.25});
      k.scene.add(solute, mover);
      k.label('NGOÀI', '#8A857A', true)(V(-3.2, 1.9, 0));
      k.label('TRONG', '#8A857A', true)(V(-3.2, -1.9, 0));
      const tAtp = k.label('ATP → ADP + Pi', '#C2751A');
      const tMem = k.label('', '#26231E', true);
      return ({p, t, s}) => {
        chan.visible = s.m === 'facil';
        pump.visible = s.m === 'active';
        const nOut = Math.round(p.out) * 2;
        const nIn = Math.round(p.in) * 2;
        for (let i = 0; i < nOut; i++) {
          const q = spots[i];
          solute.at(i, (q[0] - 0.5) * 6 + 0.2 * Math.sin(t * 2 + i), 0.55 + q[1] * 1.5 + 0.12 * Math.cos(t * 2.3 + i), (q[2] - 0.5) * 2.4 + 0.15 * Math.sin(t * 1.7 + q[3]));
        }
        for (let i = 0; i < nIn; i++) {
          const q = spots[20 + i];
          solute.at(nOut + i, (q[0] - 0.5) * 6 + 0.2 * Math.sin(t * 2 + i), -0.55 - q[1] * 1.5 + 0.12 * Math.cos(t * 2.3 + i), (q[2] - 0.5) * 2.4 + 0.15 * Math.sin(t * 1.7 + q[3]));
        }
        solute.flush(Math.min(40, nOut + nIn));
        const grad = p.out - p.in;
        const passiveDir = Math.sign(grad);
        const dir = s.m === 'active' ? (p.atp === 1 ? -passiveDir || 1 : 0) : passiveDir;
        const n = Math.min(6, Math.abs(Math.round(grad)));
        const cnt = dir === 0 ? 0 : n;
        for (let i = 0; i < cnt; i++) {
          const u = (((t / 3 + i / n) % 1) + 1) % 1;
          const y = dir > 0 ? lerpY(1.4, -1.4, u) : lerpY(-1.4, 1.4, u);
          const x = s.m === 'passive' ? (((i * 37) % 300) - 150) * 0.01 : 0;
          const z = s.m === 'passive' ? ((i * 53) % 100) * 0.014 - 0.7 : 0;
          mover.at(i, x, y, z);
        }
        mover.flush(cnt);
        tAtp(s.m === 'active' && p.atp === 1 ? V(0.9, 0.2, 0.5) : null);
        tMem(s.m === 'passive' ? null : V(0, 0.75, 0), undefined, s.m === 'facil' ? 'kênh' : 'bơm');
        k.caption(
          (dir === 0 ? 'Cân bằng động, không có dòng thực' : dir > 0 ? 'Chất đi từ ngoài vào trong' : 'Chất đi từ trong ra ngoài') + `\n${s.m === 'active' ? 'Vận chuyển chủ động: tiêu tốn ATP' : 'Vận chuyển thụ động: xuôi gradient, không tiêu tốn năng lượng'}`,
        );
      };
    },
  },

  BIO_SCALE_CELL_TYPES: {
    floor: true,
    dist: 9.5,
    target: [0, 1.0, 0],
    orbit: () => [-14, 18],
    setup: (k) => {
      const glass = (c: string, o = 0.28) => new THREE.MeshPhysicalMaterial({color: c, transparent: true, opacity: o, roughness: 0.1, depthWrite: false});
      // nhân sơ: tế bào hình que, vùng nhân, plasmid, ribosome, roi
      const rod = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.0, 12, 24), glass('#E8C45A', 0.6));
      rod.rotation.z = Math.PI / 2;
      const nucleoid = k.line('#6B4BC8', 3, Array.from({length: 200}, (_, i) => [0.5 * Math.sin(i * 0.19) * 1.3, 0.2 * Math.cos(i * 0.31), 0.2 * Math.sin(i * 0.47)]).flat());
      const plasmid = k.line('#3D6FE0', 3, Array.from({length: 33}, (_, i) => [0.62 + 0.1 * Math.cos((2 * Math.PI * i) / 32), -0.1 + 0.1 * Math.sin((2 * Math.PI * i) / 32), 0.1]).flat());
      const flagellum = k.line('#26231E', 2.4, Array.from({length: 40}, (_, i) => [-0.95 - i * 0.04, 0.1 * Math.sin(i * 0.5), 0.1 * Math.cos(i * 0.5)]).flat());
      const ribo = swarm(14, 0.04, '#2E9E6B');
      const rr = seeded(3);
      for (let i = 0; i < 14; i++) ribo.at(i, (rr() - 0.5) * 1.5, (rr() - 0.5) * 0.5, (rr() - 0.5) * 0.5);
      ribo.flush(14);
      const pro = group(k, rod, nucleoid, plasmid, flagellum, ribo);
      pro.position.set(-2.3, 0.6, 0);
      // nhân thực: màng, nhân, nhân con, ty thể, lưới nội chất
      const memb = new THREE.Mesh(new THREE.SphereGeometry(1.45, 48, 32), glass('#8FD3A8', 0.22));
      const nuc = ball('#B79BE8', 0.55, {transparent: true, opacity: 0.85, roughness: 0.5});
      nuc.position.set(-0.1, 0.15, 0);
      const nucleolus = ball('#6B4BC8', 0.2);
      nucleolus.position.set(-0.05, 0.2, 0.2);
      const mito = [[0.7, -0.7, 0.4], [0.9, 0.55, -0.3], [-0.85, -0.6, 0.5], [-0.7, 0.8, -0.5]].map(([x, y, z], i) => {
        const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.25, 8, 14), mat(i % 2 ? '#F28B82' : '#E0453A', {roughness: 0.4}));
        m.position.set(x, y, z);
        m.rotation.set(i, i * 1.7, 0);
        return m;
      });
      const euk = group(k, memb, nuc, nucleolus, ...mito);
      euk.position.set(1.5, 1.5, 0);
      const tPro = k.label('Nhân sơ: 1–5 µm', '#A16207');
      const tEuk = k.label('Nhân thực: 10–100 µm', '#15803D');
      const tNuc = k.label('nhân', '#6B4BC8', true);
      const tReg = k.label('vùng nhân', '#6B4BC8', true);
      const tMit = k.label('ty thể', '#C0392B', true);
      // tỉ lệ S/V: hai khối lập phương
      const cube = (c: string) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), glass(c, 0.4));
        m.castShadow = true;
        m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({color: '#26231E'})));
        return m;
      };
      const cA = cube('#6C9BE8');
      const cB = cube('#F2B33D');
      const svg = group(k, cA, cB);
      const tA = k.label('', '#26231E', true);
      const tB = k.label('', '#26231E', true);
      return ({p, t, s}) => {
        const types = s.mode === 'types';
        pro.visible = euk.visible = types;
        svg.visible = !types;
        pro.rotation.y = t * 0.4;
        euk.rotation.y = -t * 0.3;
        tPro(types ? V(-2.3, 1.55, 0) : null);
        tEuk(types ? V(1.4, 3.05, 0) : null);
        tNuc(types ? V(1.3, 1.65, 0) : null);
        tReg(types ? V(-2.3, 0.9, 0) : null);
        tMit(types ? V(2.1, 0.9, 0.4) : null);
        const a = Math.min(1.2, p.L * 0.12);
        cA.scale.setScalar(a);
        cA.position.set(-1.8, 0, 0);
        cB.scale.setScalar(2 * a);
        cB.position.set(1.2, 0, 0);
        tA(types ? null : V(-1.8, a + 0.2, 0), undefined, `L = ${f1(p.L)} µm · S/V = ${f2(surfaceToVolume(p.L))}`);
        tB(types ? null : V(1.2, 2 * a + 0.2, 0), undefined, `L = ${f1(2 * p.L)} µm · S/V = ${f2(surfaceToVolume(2 * p.L))}`);
        k.caption(types ? 'Nhân sơ: chưa có màng nhân, ít bào quan\nNhân thực: có màng nhân và nhiều bào quan có màng' : 'Tế bào lớn gấp đôi: diện tích tăng 4 lần, thể tích tăng 8 lần\nS/V giảm một nửa nên trao đổi chất chậm hơn');
      };
    },
  },
};
const lerpY = (a: number, b: number, u: number) => a + (b - a) * u;
