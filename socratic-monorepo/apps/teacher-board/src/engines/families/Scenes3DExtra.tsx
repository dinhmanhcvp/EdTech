import * as THREE from 'three';
import {C, f1, f2} from '../../utils/presets/sceneKit';
import {ELEMENTS, configString} from '../../utils/presets/hoaData';
import {ORGANICS} from '../../utils/presets/hoaScene2';
import {closestApproach, coulomb} from '../../utils/presets/lyScene2';
import {STRUCT} from '../../utils/presets/sinh2Scene';
import {ALPHA_K, SHELL_NAME, alphaTracks, chargeX, fieldLines3D, organic3D, outerOrbitals, shellCounts, turnDeg, type V3} from '../../utils/presets/scene3dExtra';
import {setLine, type Kit, type SceneDef} from './Stage3D';
import {V, ball, group, mat, segsOf, swarm} from './Scenes3DMore';

const rad = (d: number) => (d * Math.PI) / 180;
/** Cảnh tối tự đặt đèn (SceneDef.night không có đèn mặc định). */
function nightLights(k: Kit) {
  const sun = new THREE.DirectionalLight('#FFFFFF', 2.2);
  sun.position.set(3, 5, 4);
  k.scene.add(new THREE.AmbientLight('#B8BDF0', 1.1), sun);
}
const ring = (R: number, n = 72) => Array.from({length: n + 1}, (_, i) => [R * Math.cos((2 * Math.PI * i) / n), 0, R * Math.sin((2 * Math.PI * i) / n)]).flat();
const GLOW = (c: string, i = 0.7): THREE.MeshStandardMaterialParameters => ({emissive: c, emissiveIntensity: i, roughness: 0.3});

// ------------------------------------------------------------------ nguyên tử
const SHELL_R = [0.95, 1.75, 2.55, 3.35];
const SHELL_TILT: [number, number][] = [[0, 0], [62, 0], [0, -48], [-28, 38]];
const OUTER = '#FF8A4C';
const INNER = '#5FA8FF';
const atomScene: SceneDef = {
  night: true,
  dist: 9.5,
  orbit: () => [24, 20],
  setup: (k) => {
    nightLights(k);
    k.controls.autoRotate = true;
    k.controls.autoRotateSpeed = 0.9;
    const prot = swarm(90, 0.1, '#FF6B6B', GLOW('#FF3B3B', 0.5));
    const neut = swarm(90, 0.1, '#B9B6D3', GLOW('#8F8CB0', 0.25));
    k.scene.add(prot, neut);
    const shells = [0, 1, 2, 3].map((i) => {
      const g = group(k, k.line('#5B5F9E', 1.4, ring(SHELL_R[i])));
      g.rotation.set(rad(SHELL_TILT[i][0]), 0, rad(SHELL_TILT[i][1]));
      const els = Array.from({length: 18}, () => ball(INNER, 0.12, GLOW(INNER, 0.9)));
      g.add(...els);
      return {g, els, tag: k.label('', INNER)};
    });
    // orbital lớp ngoài cùng: s (cầu) và ba p (hai thùy trên mỗi trục), màu theo số electron
    const lobeMat = () => new THREE.MeshStandardMaterial({color: '#888', transparent: true, opacity: 0.4, roughness: 0.4, depthWrite: false});
    const orbS = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), lobeMat());
    const orbP = [0, 1, 2].map(() => {
      const m = lobeMat();
      const lobes = [1, -1].map((sg) => Object.assign(new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), m), {userData: {sg}}));
      return {m, lobes};
    });
    const orbG = group(k, orbS, ...orbP.flatMap((o) => o.lobes));
    const tOrb = [k.label('', OUTER), k.label('', OUTER)];
    let lastZ = -1;
    const AX: V3[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    return ({p, t}) => {
      const z = Math.round(p.z);
      const counts = shellCounts(z);
      const orbMode = p.orb === 1;
      const el = ELEMENTS.find((e) => e.z === z)!;
      const nMax = counts.reduce((a, c, i) => (c ? i + 1 : a), 1);
      if (z !== lastZ) {
        lastZ = z;
        const A = Math.round(el.mass);
        const R = 0.11 * Math.cbrt(A);
        let ip = 0;
        let inn = 0;
        for (let i = 0; i < A; i++) {
          const y = 1 - (2 * (i + 0.5)) / A;
          const rr = Math.sqrt(1 - y * y);
          const th = i * 2.399963;
          const [x, yy, zz] = [rr * Math.cos(th) * R, y * R, rr * Math.sin(th) * R];
          if (Math.floor(((i + 1) * z) / A) > Math.floor((i * z) / A)) prot.at(ip++, x, yy, zz);
          else neut.at(inn++, x, yy, zz);
        }
        prot.flush(ip);
        neut.flush(inn);
      }
      shells.forEach((sh, i) => {
        const n = counts[i];
        const hideOuter = orbMode && i === nMax - 1;
        sh.g.visible = n > 0 && !hideOuter;
        sh.els.forEach((m, j) => {
          m.visible = j < n;
          if (j >= n) return;
          const th = t * (1.5 / Math.pow(i + 1, 1.2)) + (2 * Math.PI * j) / n;
          m.position.set(SHELL_R[i] * Math.cos(th), 0, SHELL_R[i] * Math.sin(th));
          const c = i === nMax - 1 ? OUTER : INNER;
          const mm = m.material as THREE.MeshStandardMaterial;
          mm.color.set(c);
          mm.emissive.set(c);
        });
        sh.tag(sh.g.visible ? V(SHELL_R[i], 0, 0) : null, sh.g, `Lớp ${SHELL_NAME[i]} (n = ${i + 1}): ${n} e⁻`);
      });
      const o = outerOrbitals(z);
      orbG.visible = orbMode;
      if (orbMode) {
        const R = SHELL_R[o.n - 1];
        const paint = (m: THREE.MeshStandardMaterial, e: number) => {
          m.color.set(e === 2 ? '#35D0A8' : e === 1 ? OUTER : '#8F8CB0');
          m.opacity = e === 0 ? 0.08 : 0.42;
        };
        orbS.scale.setScalar(R * 0.62);
        paint(orbS.material as THREE.MeshStandardMaterial, o.s);
        orbP.forEach((q, i) => {
          paint(q.m, o.p[i]);
          q.lobes.forEach((l) => {
            l.scale.set(R * 0.3, R * 0.3, R * 0.3);
            l.position.set(...(AX[i].map((c) => c * R * 0.7 * l.userData.sg) as V3));
            l.visible = o.n >= 2;
          });
        });
        tOrb[0](V(0, R * 0.62, 0), orbG, `orbital s: ${o.s} e⁻`);
        tOrb[1](o.n >= 2 ? V(R * 1.0, 0, 0) : null, orbG, `ba orbital p: ${o.p.join(' · ')} e⁻`);
      } else {
        tOrb[0](null);
        tOrb[1](null);
      }
      k.caption(`${el.name} · Z = ${z}\n${configString(z)} · mỗi lớp: ${counts.filter(Boolean).join(' · ')} electron`);
    };
  },
};

// ------------------------------------------------------------------ hợp chất hữu cơ
const CPK3: Record<string, [string, number]> = {C: ['#5B5750', 0.34], O: ['#E0453A', 0.32], H: ['#F4F2EC', 0.2]};
const organicScene: SceneDef = {
  dist: 7.5,
  noGrid: true,
  orbit: () => [20, 14],
  setup: (k) => {
    k.controls.autoRotate = true;
    k.controls.autoRotateSpeed = 1.4;
    const hlMat = new THREE.MeshStandardMaterial({color: '#EA580C', transparent: true, opacity: 0.22, depthWrite: false, roughness: 0.4});
    const mols = Object.entries(ORGANICS).map(([key, m]) => {
      const {atoms, bonds} = organic3D(m);
      const heavy = atoms.filter((a) => a.el !== 'H');
      const c = V(...([0, 1, 2].map((i) => heavy.reduce((s, a) => s + a.pos[i], 0) / heavy.length) as V3));
      const g = new THREE.Group();
      g.position.copy(c).negate();
      g.visible = false;
      k.scene.add(g);
      const P = atoms.map((a) => V(...a.pos));
      atoms.forEach((a, i) => {
        const b = ball(CPK3[a.el][0], CPK3[a.el][1], {roughness: 0.25});
        b.position.copy(P[i]);
        g.add(b);
      });
      const single: number[] = [];
      const multi: number[] = [];
      const hyd: number[] = [];
      for (const [a, b, n] of bonds) {
        const seg = (off: THREE.Vector3) => [...P[a].clone().add(off).toArray(), ...P[b].clone().add(off).toArray()];
        if (atoms[b].el === 'H' || atoms[a].el === 'H') hyd.push(...seg(V()));
        else if (n === 1) single.push(...seg(V()));
        else {
          const d = P[b].clone().sub(P[a]).normalize();
          const perp = V(-d.y, d.x, 0).normalize().multiplyScalar(0.1);
          for (let i = 0; i < n; i++) multi.push(...seg(perp.clone().multiplyScalar(i - (n - 1) / 2)));
        }
      }
      for (const [pts, w] of [[single, 7], [multi, 5], [hyd, 4]] as [number[], number][]) if (pts.length) g.add(k.line('#3A3730', w, pts, true));
      const hl = new THREE.Group();
      m.hl.forEach((i) => {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.62, 24, 16), hlMat);
        s.position.copy(P[i]);
        hl.add(s);
      });
      g.add(hl);
      const tags = heavy.map((a, i) => ({put: k.label(a.el, a.el === 'O' ? '#C0392B' : '#26231E', true), pos: P[i].clone().add(V(0, CPK3[a.el][1] + 0.22, 0))}));
      return {key, m, g, hl, tags};
    });
    return ({p, s}) => {
      for (const o of mols) {
        const on = o.key === s.m;
        o.g.visible = on;
        o.hl.visible = p.hl === 1;
        o.tags.forEach((tg) => tg.put(on ? tg.pos : null, o.g));
        if (on) k.caption(`${o.m.name} · ${o.m.formula}\n${o.m.cls} · ${o.m.group}`);
      }
    };
  },
};

// ------------------------------------------------------------------ điện trường
const fieldScene: SceneDef = {
  night: true,
  dist: 11,
  orbit: () => [22, 18],
  setup: (k) => {
    nightLights(k);
    const lines = k.line('#7FA3FF', 1.5, [0, 0, 0, 0, 0, 0], true);
    k.scene.add(lines);
    const dots = swarm(64, 0.055, '#FFFFFF', GLOW('#FFFFFF', 1));
    k.scene.add(dots);
    const qs = [ball('#888', 0.3, GLOW('#888', 0.6)), ball('#888', 0.3, GLOW('#888', 0.6))];
    k.scene.add(...qs);
    // kéo từng điện tích dọc trục để đổi khoảng cách d
    qs.forEach((q) => k.drag(q, {onMove: (pt) => k.set('d', (Math.abs(pt.x) * 80 - 25) / 220)}));
    const F = [k.arrow('#FFB454', 0.035), k.arrow('#FFB454', 0.035)];
    k.scene.add(F[0].obj, F[1].obj);
    const tags = [k.label('', '#FF6B6B'), k.label('', '#6C8CFF')];
    let key = '';
    let tracks: V3[][] = [];
    return ({p, t}) => {
      const kk = `${p.q1}|${p.q2}|${p.d}`;
      if (kk !== key) {
        key = kk;
        tracks = fieldLines3D(p.q1, p.q2, p.d);
        const flat: number[] = [];
        for (const tr of tracks) flat.push(...segsOf(tr));
        setLine(lines, flat.length ? flat : [0, 0, 0, 0, 0, 0]);
      }
      const x = chargeX(p.d);
      const q = [p.q1, p.q2];
      const reverse = q.every((v) => v <= 0);
      const step = Math.max(1, Math.floor(tracks.length / 64));
      let n = 0;
      for (let i = 0; i < tracks.length && n < 64; i += step) {
        const tr = tracks[i];
        const f = (t * 0.16 + i * 0.137) % 1;
        const pt = tr[Math.min(tr.length - 1, Math.floor((reverse ? 1 - f : f) * (tr.length - 1)))];
        dots.at(n++, pt[0], pt[1], pt[2]);
      }
      dots.flush(n);
      q.forEach((v, i) => {
        const c = v > 0 ? '#FF6B6B' : v < 0 ? '#6C8CFF' : '#888888';
        const m = qs[i].material as THREE.MeshStandardMaterial;
        m.color.set(c);
        m.emissive.set(c);
        qs[i].position.set(i ? x : -x, 0, 0);
        qs[i].scale.setScalar(0.7 + Math.abs(v) * 0.1);
        tags[i](qs[i].position, undefined, `${i ? 'q₂' : 'q₁'} = ${v > 0 ? '+' : ''}${v} µC`);
      });
      const Fn = Math.abs(coulomb(p.q1, p.q2, p.d));
      const L = Fn > 0 ? Math.min(1.7, 0.45 + 0.3 * Math.log10(1 + Fn)) : 0;
      const attract = p.q1 * p.q2 < 0;
      // lực lên q₁ và q₂: hút thì hướng vào nhau, đẩy thì hướng ra xa
      [-1, 1].forEach((side, i) => {
        const dir = (attract ? -side : side) * 1;
        const from = V(side * x + dir * 0.32, 0, 0);
        F[i].set(from, from.clone().add(V(dir * L, 0, 0)));
      });
      k.caption(`Lực Coulomb F = ${f2(Fn)} N · ${p.q1 * p.q2 > 0 ? 'đẩy nhau' : p.q1 * p.q2 < 0 ? 'hút nhau' : 'không tương tác'}\nChấm sáng chạy theo chiều đường sức`);
    };
  },
};

// ------------------------------------------------------------------ tán xạ Rutherford
const alphaScene: SceneDef = {
  night: true,
  dist: 14,
  orbit: () => [28, 20],
  setup: (k) => {
    nightLights(k);
    const near = k.line('#6C8CFF', 1.3, [0, 0, 0, 0, 0, 0], true);
    const back = k.line('#FF8A4C', 2, [0, 0, 0, 0, 0, 0], true);
    const foil = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.8, 3.8), new THREE.MeshStandardMaterial({color: '#E8B84A', transparent: true, opacity: 0.1, depthWrite: false}));
    const nucleus = ball('#FF6B6B', 0.1, GLOW('#FF3B3B', 0.9));
    const cloud = new THREE.Mesh(new THREE.SphereGeometry(1.17, 32, 20), new THREE.MeshStandardMaterial({color: '#FF6B6B', transparent: true, opacity: 0.14, depthWrite: false}));
    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.7, 20).rotateZ(-Math.PI / 2), mat('#8F8CB0', {metalness: 0.5}));
    gun.position.set(-ALPHA_K * 158, 0, 0);
    const dots = swarm(48, 0.07, '#FFFFFF', GLOW('#9FB8FF', 1));
    k.scene.add(near, back, foil, nucleus, cloud, gun, dots);
    const tNuc = k.label('', '#FF6B6B');
    const tGun = k.label('nguồn hạt α', '#B9B6D3', true);
    const tFoil = k.label('lá vàng mỏng', '#E8B84A', true);
    let key = '';
    let tracks: V3[][] = [];
    let nBack = 0;
    return ({p, t}) => {
      const th = p.thomson === 1;
      const kk = `${p.Z}|${p.E}|${th}`;
      const d0 = th ? 0.04 : closestApproach(p.Z, p.E);
      if (kk !== key) {
        key = kk;
        tracks = alphaTracks(d0);
        const flagged = tracks.map((tr) => turnDeg(tr) > 90);
        nBack = flagged.filter(Boolean).length;
        const seg = (want: boolean) => tracks.filter((_, i) => flagged[i] === want).flatMap((tr) => segsOf(tr));
        for (const [ln, pts] of [[near, seg(false)], [back, seg(true)]] as const) setLine(ln, pts.length ? pts : [0, 0, 0, 0, 0, 0]);
      }
      tracks.forEach((tr, i) => {
        const f = (t * 0.16 + i * 0.0731) % 1;
        const pt = tr[Math.min(tr.length - 1, Math.floor(f * (tr.length - 1)))];
        dots.at(i, pt[0], pt[1], pt[2]);
      });
      dots.flush(Math.min(48, tracks.length));
      cloud.visible = th;
      nucleus.visible = !th;
      tNuc(th ? V(0, 1.2, 0) : V(0, 0.2, 0), undefined, th ? 'điện tích dương trải đều (Thomson)' : `hạt nhân Z = ${Math.round(p.Z)}`);
      tGun(V(-ALPHA_K * 158, 0.4, 0));
      tFoil(V(0, 2.1, 0));
      k.caption(`${th ? 'Mẫu Thomson: hạt α hầu như đi thẳng' : `d₀ = ${f1(d0)} fm`} · ${nBack} / ${tracks.length} hạt bật ngược (cam)\nb chọn đều để dễ xem; thực tế đa số hạt đi thẳng`);
    };
  },
};

// ------------------------------------------------------------------ nhiễm sắc thể
const GENE_COLORS = ['#F2776B', '#F29A4C', '#F2CF4C', '#9BCB3A', '#4FAEDC', '#8E78D6', '#E872B0', '#3DBFA3'];
const geneColor = (g: string) => GENE_COLORS[(g.charCodeAt(0) - 65) % GENE_COLORS.length];
const TYPE_COLORS = ['#F2776B', '#F2CF4C', '#4FAEDC'];
const chromosomeScene: SceneDef = {
  dist: 14,
  noGrid: true,
  target: [0, 0, 0],
  orbit: () => [18, 10],
  setup: (k) => {
    const MAXG = 9;
    const mk = (x: number) => {
      const g = group(k);
      g.position.x = x;
      const genes = Array.from({length: MAXG}, () => {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.57, 28), mat('#999', {roughness: 0.3}));
        m.castShadow = true;
        g.add(m);
        return {m, tag: k.label('', undefined, true)};
      });
      const caps = [1, -1].map(() => {
        const c = new THREE.Mesh(new THREE.SphereGeometry(0.27, 28, 16), mat('#999', {roughness: 0.3}));
        c.castShadow = true;
        g.add(c);
        return c;
      });
      return {g, genes, caps};
    };
    const cols = [-4.6, -3.3, 2.1, 3.4].map(mk);
    const arrow = k.arrow(C.red, 0.05);
    k.scene.add(arrow.obj);
    arrow.set(V(-1.7, 0, 0), V(1.0, 0, 0));
    const tBefore = k.label('Trước đột biến', C.blue);
    const tAfter = k.label('Sau đột biến', C.red);
    // số lượng: tối đa 4 NST mỗi cặp, ba cặp
    const H = [2.3, 1.7, 1.2];
    const chroms = [0, 1, 2].flatMap((type) => Array.from({length: 4}, () => {
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, H[type], 8, 20), mat(TYPE_COLORS[type], {roughness: 0.3}));
      const band = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), mat('#3A3730'));
      band.scale.set(1.15, 0.3, 1.15);
      m.add(band);
      m.castShadow = true;
      k.scene.add(m);
      return {m, type};
    }));
    const tType = [0, 1, 2].map((i) => k.label('', TYPE_COLORS[i]));
    return ({s}) => {
      const structural = !!STRUCT[s.k];
      const info = STRUCT[s.k];
      const seqs = structural ? [...info.before, ...info.after] : [];
      const xs = structural ? [info.before.length === 2 ? [-4.6, -3.3] : [-3.9], info.after.length === 2 ? [2.1, 3.4] : [2.7]].flat() : [];
      cols.forEach((c, ci) => {
        const seq = structural && ci < seqs.length ? seqs[ci] : '';
        if (structural && seq) c.g.position.x = xs[ci];
        c.g.visible = !!seq;
        c.caps.forEach((cap, j) => {
          cap.visible = !!seq;
          if (!seq) return;
          (cap.material as THREE.MeshStandardMaterial).color.set(geneColor(seq[j ? seq.length - 1 : 0]));
          cap.position.y = (j ? -1 : 1) * (((seq.length - 1) / 2) * 0.58 + 0.285);
        });
        c.genes.forEach((gn, i) => {
          const on = i < seq.length;
          gn.m.visible = on;
          if (!on) return gn.tag(null);
          (gn.m.material as THREE.MeshStandardMaterial).color.set(geneColor(seq[i]));
          gn.m.position.y = ((seq.length - 1) / 2 - i) * 0.58;
          gn.tag(V(0.55, gn.m.position.y, 0), c.g, seq[i]);
        });
      });
      arrow.obj.visible = structural;
      tBefore(structural ? V(info.before.length === 2 ? -3.95 : -3.9, -3.3, 0) : null);
      tAfter(structural ? V(info.after.length === 2 ? 2.75 : 2.7, -3.3, 0) : null);
      const copies = ({tri: [2, 2, 3], mono: [2, 2, 1], tri3: [3, 3, 3], tetra: [4, 4, 4]} as Record<string, number[]>)[s.k] ?? [2, 2, 2];
      chroms.forEach((c, i) => {
        const j = i % 4;
        const n = copies[c.type];
        c.m.visible = !structural && j < n;
        c.m.position.set((c.type - 1) * 3.2 + (j - (n - 1) / 2) * 0.7, H[c.type] / 2 - 1.2 + 0.2, 0);
      });
      [0, 1, 2].forEach((ty) => tType[ty](structural ? null : V((ty - 1) * 3.2, -1.9, 0), undefined, `cặp ${ty + 1}: ${copies[ty]} chiếc`));
      k.caption(structural ? `Đột biến cấu trúc NST: ${({del: 'mất đoạn', dup: 'lặp đoạn', inv: 'đảo đoạn', trans: 'chuyển đoạn tương hỗ'} as Record<string, string>)[s.k]}\nMỗi khối màu là một gene (A, B, C…); so hàng trước và sau` : `${copies.reduce((a, b) => a + b, 0)} nhiễm sắc thể (bình thường 2n = 6)\nMỗi màu là một cặp NST tương đồng; vạch tối là tâm động`);
    };
  },
};

export const EXTRA_SCENES: Record<string, SceneDef> = {
  CHEM_ATOM_STRUCTURE: atomScene,
  CHEM_ORGANIC_STRUCTURE: organicScene,
  PHYS_ELECTRIC_FIELD: fieldScene,
  PHYS_ALPHA_SCATTERING: alphaScene,
  BIO_CHROMOSOME: chromosomeScene,
};
