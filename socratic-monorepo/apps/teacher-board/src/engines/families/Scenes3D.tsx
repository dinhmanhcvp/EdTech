'use client';

import React from 'react';
import * as THREE from 'three';
import type {P, S} from '../../utils/presets/types';
import {C} from '../../utils/presets/sceneKit';
import {cradleAngles, cradleSpeed, emWave} from '../../utils/presets/lyScene3';
import {cross3, len3} from '../../utils/presets/toanScene1';
import {CUBE, CUBE_EDGES, CUBE_HIGHLIGHT, CUBE_QUESTIONS, SURFACES} from '../../utils/presets/toanScene2';
import {Stage3D, setLine, type Kit, type SceneDef} from './Stage3D';
import {MORE_SCENES} from './Scenes3DMore';
import {BIO_SCENES} from './Scenes3DBio';
import {EXTRA_SCENES} from './Scenes3DExtra';
import {BLENDER_SCENES} from './Scenes3DBlender';
import {BLENDER2_SCENES} from './Scenes3DBlender2';
import {BLENDER3_SCENES} from './Scenes3DBlender3';
import {BLENDER4_SCENES} from './Scenes3DBlender4';

const rad = (d: number) => (d * Math.PI) / 180;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const f2 = (v: number) => v.toLocaleString('vi-VN', {maximumFractionDigits: 2});
const NIGHT = {ink: '#E8E6F5', red: '#FF6B6B', blue: '#6C8CFF', grey: '#8F8CB0'};

/** Tấm phẳng trong suốt dựng từ các đỉnh (quạt tam giác): mặt phẳng tô sáng, hình bình hành. */
function sheet(color: string, opacity: number): THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> & {setPts(pts: number[][]): void} {
  const attr = new THREE.Float32BufferAttribute(12, 3);
  const m = new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', attr).setIndex([0, 1, 2, 0, 2, 3]), new THREE.MeshBasicMaterial({color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false}));
  m.frustumCulled = false;
  return Object.assign(m, {
    // 3 hoặc 4 đỉnh, ghi tại chỗ (tam giác thì lặp đỉnh cuối)
    setPts: (pts: number[][]) => {
      m.visible = pts.length > 2;
      if (!m.visible) return;
      (attr.array as Float32Array).set([...pts, pts[pts.length - 1]].slice(0, 4).flat());
      attr.needsUpdate = true;
    },
  });
}

/** Ba trục toạ độ có nhãn, đặt trong một nhóm z-hướng-lên. */
function axes(k: Kit, g: THREE.Group, len: number, r: number): () => void {
  const tips = [V(len, 0, 0), V(0, len, 0), V(0, 0, len)];
  const set = tips.map((tip, i) => {
    const a = k.arrow('#6B665B', r);
    a.set(V(), tip);
    g.add(a.obj);
    return k.label('xyz'[i], '#6B665B', true);
  });
  return () => set.forEach((put, i) => put(tips[i], g));
}

const CORE: Record<string, SceneDef> = {
  PHYS_NEWTON_CRADLE: {
    floor: true,
    dist: 5.6,
    orbit: ({p}) => [p.az, 14],
    setup: (k) => {
      const R = 0.17; // bán kính quả cầu (đơn vị thế giới, trùng bản SVG)
      const XS = [-2, -1, 0, 1, 2].map((i) => i * 2 * R);
      const W = 0.42; // nửa khoảng cách hai thanh ngang
      const HALF = 0.95; // nửa bề rộng khung
      const steel = new THREE.MeshStandardMaterial({color: '#D5D9DF', metalness: 1, roughness: 0.16});
      const hot = new THREE.MeshStandardMaterial({color: '#E8762B', metalness: 0.75, roughness: 0.22});
      const dark = new THREE.MeshStandardMaterial({color: '#26231E', metalness: 0.6, roughness: 0.35});
      const glass = new THREE.MeshPhysicalMaterial({color: '#DCEBFA', roughness: 0.05, transmission: 0.9, thickness: 0.4, ior: 1.45, transparent: true, opacity: 0.9});
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.1, 2), glass);
      plinth.position.y = 0.05;
      plinth.receiveShadow = true;
      const base = new THREE.Mesh(new THREE.BoxGeometry(2 * HALF + 0.4, 0.07, 2 * W + 0.4), dark);
      base.position.y = 0.135;
      base.castShadow = base.receiveShadow = true;
      const rod = new THREE.CylinderGeometry(0.028, 0.028, 1, 20);
      const posts = [-HALF, HALF].flatMap((x) => [-W, W].map((z) => Object.assign(new THREE.Mesh(rod, dark), {castShadow: true, userData: {x, z}})));
      const rails = [-W, W].map((z) => {
        const m = new THREE.Mesh(rod, dark);
        m.rotation.z = Math.PI / 2;
        m.scale.y = 2 * HALF + 0.06;
        m.userData.z = z;
        m.castShadow = true;
        return m;
      });
      const ballGeo = new THREE.SphereGeometry(R, 48, 32);
      const balls = XS.map(() => Object.assign(new THREE.Mesh(ballGeo, steel), {castShadow: true}));
      const strings = XS.map(() => k.line('#8C877B', 1.4, [0, 0, 0, 0, 0, 0, 0, 0, 0]));
      k.scene.add(plinth, base, ...posts, ...rails, ...balls, ...strings);
      const tag = k.label('Quả đang chuyển động', '#D9481C');
      let lastL = NaN;
      return ({p, t}) => {
        const L = p.L / 40;
        const top = L + 0.35 + 0.12; // độ cao thanh ngang so với sàn
        if (L !== lastL) {
          lastL = L;
          posts.forEach((m) => {
            m.scale.y = top - 0.1;
            m.position.set(m.userData.x, (top + 0.1) / 2, m.userData.z);
          });
          rails.forEach((m) => m.position.set(0, top, m.userData.z));
          k.controls.target.set(0, top * 0.55, 0);
        }
        const T = 2 * Math.PI * Math.sqrt(p.L / 100 / 9.8) * 1.6; // cùng hệ số làm chậm với bản SVG
        const ang = cradleAngles(Math.round(p.n), p.th0, T, t, p.loss);
        let moving = -1;
        XS.forEach((x0, i) => {
          const th = rad(ang[i]);
          const bx = x0 + L * Math.sin(th);
          const by = top - L * Math.cos(th);
          const on = Math.abs(ang[i]) > 0.3;
          if (on && moving < 0) moving = i;
          balls[i].position.set(bx, by, 0);
          balls[i].material = on ? hot : steel;
          setLine(strings[i], [x0, top, -W, bx, by, 0, x0, top, W]);
        });
        tag(moving < 0 ? null : balls[moving].position);
        k.caption(`Vận tốc ngay trước va chạm v = ${f2(cradleSpeed(p.L / 100, p.th0))} m/s\nĐộng lượng truyền đi: ${Math.round(p.n)} quả × v`);
      };
    },
  },

  PHYS_EM_WAVE_3D: {
    night: true,
    dist: 10.5,
    orbit: ({p}) => [p.az, p.el],
    setup: (k) => {
      const L = 7;
      const x0 = -3.5;
      const N = 56;
      const axis = k.arrow(NIGHT.ink, 0.022);
      axis.set(V(x0, 0, 0), V(x0 + L + 0.5, 0, 0));
      const plane = (color: string) => new THREE.Mesh(new THREE.PlaneGeometry(L, 1), new THREE.MeshBasicMaterial({color, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false}));
      const pe = plane(NIGHT.red); // mặt phẳng dao động của E (đứng)
      const pb = plane(NIGHT.blue); // mặt phẳng dao động của B (ngang)
      pb.rotation.x = Math.PI / 2;
      const zeros = (n: number) => Array.from({length: n}, () => 0);
      const field = (color: string) => {
        const heads = new THREE.InstancedMesh(new THREE.ConeGeometry(0.05, 0.16, 10), new THREE.MeshBasicMaterial({color}), N / 2 + 1);
        heads.frustumCulled = false;
        return {curve: k.line(color, 4, zeros((N + 1) * 3)), stems: k.line(color, 1.4, zeros((N / 2 + 1) * 6), true), heads};
      };
      const E = field(NIGHT.red);
      const B = field(NIGHT.blue);
      k.scene.add(axis.obj, pe, pb, E.curve, E.stems, E.heads, B.curve, B.stems, B.heads);
      const tagE = k.label('Điện trường E: dao động theo phương đứng', NIGHT.red);
      const tagB = k.label('Từ trường B: dao động theo phương ngang, vuông góc E', NIGHT.blue);
      k.label('v = c', NIGHT.ink, true)(V(x0 + L + 0.7, 0, 0));
      const dummy = new THREE.Object3D();
      return ({p, t}) => {
        const amp = 1.5 * (p.E0 / 100) + 0.35;
        pe.scale.y = pb.scale.y = 2 * (amp + 0.3);
        const ce: number[] = [];
        const cb: number[] = [];
        const se: number[] = [];
        const sb: number[] = [];
        for (let i = 0; i <= N; i++) {
          const x = x0 + (L * i) / N;
          const e = (emWave(p.E0, p.lam, x, t).E / p.E0) * amp;
          ce.push(x, e, 0);
          cb.push(x, 0, e);
          if (i % 2) continue;
          se.push(x, 0, 0, x, e, 0);
          sb.push(x, 0, 0, x, 0, e);
          // đầu mũi tên: chóp nón mặc định hướng +y; trường quá nhỏ thì ẩn
          const big = Math.abs(e) > 0.15 ? 1 : 0;
          dummy.scale.setScalar(big);
          dummy.position.set(x, e, 0);
          dummy.rotation.set(0, 0, e < 0 ? Math.PI : 0);
          dummy.updateMatrix();
          E.heads.setMatrixAt(i / 2, dummy.matrix);
          dummy.position.set(x, 0, e);
          dummy.rotation.set(e < 0 ? -Math.PI / 2 : Math.PI / 2, 0, 0);
          dummy.updateMatrix();
          B.heads.setMatrixAt(i / 2, dummy.matrix);
        }
        setLine(E.curve, ce);
        setLine(B.curve, cb);
        setLine(E.stems, se);
        setLine(B.stems, sb);
        E.heads.instanceMatrix.needsUpdate = B.heads.instanceMatrix.needsUpdate = true;
        E.curve.visible = pe.visible = !!p.showE;
        B.curve.visible = pb.visible = !!p.showB;
        E.stems.visible = E.heads.visible = !!p.showE && !!p.stems;
        B.stems.visible = B.heads.visible = !!p.showB && !!p.stems;
        tagE(p.showE ? V(x0 + 1.2, amp, 0) : null);
        tagB(p.showB ? V(x0 + 2.4, 0, amp) : null);
      };
    },
  },

  PHYS_EARTH_SEASONS: {
    night: true,
    dist: 10,
    orbit: ({p}) => [p.az, 26],
    setup: (k) => {
      const R = 3.2; // bán kính quỹ đạo; kích thước Trái Đất, Mặt Trời phóng đại cho dễ nhìn
      const r = 0.6;
      const sun = new THREE.Mesh(new THREE.SphereGeometry(0.55, 40, 24), new THREE.MeshBasicMaterial({color: '#FFD84A'}));
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.85, 32, 20), new THREE.MeshBasicMaterial({color: '#FACC15', transparent: true, opacity: 0.16, depthWrite: false}));
      const orbit = k.line(NIGHT.grey, 1.2, Array.from({length: 97}, (_, i) => [R * Math.cos((2 * Math.PI * i) / 96), 0, R * Math.sin((2 * Math.PI * i) / 96)]).flat());
      // Mặt Trời là nguồn sáng duy nhất: nửa ngày – nửa đêm hiện ra tự nhiên
      k.scene.add(sun, halo, orbit, new THREE.PointLight('#FFF4D6', 3.2, 0, 0), new THREE.AmbientLight('#8F9BFF', 0.14));
      const earth = new THREE.Group();
      const globe = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 40), new THREE.MeshStandardMaterial({color: '#3D7BE0', roughness: 0.7}));
      const ring = (lat: number, rr = r * 1.004) => Array.from({length: 91}, (_, i) => [rr * Math.cos(rad(lat)) * Math.cos((2 * Math.PI * i) / 90), rr * Math.sin(rad(lat)), rr * Math.cos(rad(lat)) * Math.sin((2 * Math.PI * i) / 90)]).flat();
      const grat: number[] = [];
      for (const lat of [-60, -30, 30, 60]) for (let c = ring(lat), i = 0; i + 5 < c.length; i += 3) grat.push(...c.slice(i, i + 6));
      for (let m = 0; m < 12; m++) for (let j = 0; j < 36; j++) for (const a of [j * 5 - 90, j * 5 - 85]) grat.push(r * 1.004 * Math.cos(rad(a)) * Math.cos(rad(m * 30)), r * 1.004 * Math.sin(rad(a)), r * 1.004 * Math.cos(rad(a)) * Math.sin(rad(m * 30)));
      const lines = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(grat, 3)), new THREE.LineBasicMaterial({color: '#DCE8FF', transparent: true, opacity: 0.28}));
      const equator = k.line('#E8E6F5', 1.6, ring(0));
      const latLine = k.line(NIGHT.red, 2.6, ring(21));
      const axis = k.line(NIGHT.red, 3, [0, -r * 1.45, 0, 0, r * 1.45, 0]);
      earth.add(globe, lines, equator, latLine, axis);
      const spot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), new THREE.MeshBasicMaterial({color: '#FACC15'}));
      k.scene.add(earth, spot);
      const north = k.label('B', NIGHT.red, true);
      const south = k.label('N', NIGHT.red, true);
      const here = k.label('Nơi quan sát', NIGHT.red);
      k.label('Mặt Trời', '#FFD84A', true)(V(0, 0.75, 0));
      for (const [n, text] of [[172, '21/6'], [264, '23/9'], [355, '22/12'], [80, '21/3']] as [number, string][]) {
        const al = (2 * Math.PI * (n - 172)) / 365;
        k.label(text, NIGHT.grey, true)(V(-R * 1.2 * Math.cos(al), 0, -R * 1.2 * Math.sin(al)));
      }
      const pos = V();
      const a = V();
      const s = V();
      const e = V();
      const d = V();
      let lastLat = 21;
      return ({p}) => {
        const alpha = (2 * Math.PI * (p.day - 172)) / 365;
        pos.set(-R * Math.cos(alpha), 0, -R * Math.sin(alpha));
        a.set(Math.sin(rad(p.tilt)), Math.cos(rad(p.tilt)), 0); // trục quay giữ nguyên hướng suốt năm
        earth.position.copy(pos);
        earth.quaternion.setFromUnitVectors(V(0, 1, 0), a);
        if (p.lat !== lastLat) setLine(latLine, ring((lastLat = p.lat)));
        // điểm quan sát nằm trên kinh tuyến vuông góc với tia nắng (như bản SVG): mùa hè ở phía sáng, mùa đông ở phía tối
        s.copy(pos).negate().normalize();
        e.crossVectors(a, s).normalize();
        d.copy(e).multiplyScalar(Math.cos(rad(p.lat))).addScaledVector(a, Math.sin(rad(p.lat)));
        const lit = d.dot(s) > 0;
        spot.position.copy(pos).addScaledVector(d, r * 1.02);
        spot.material.color.set(lit ? '#FACC15' : '#E2E8F0');
        here(spot.position);
        north(V(0, r * 1.6, 0), earth);
        south(V(0, -r * 1.6, 0), earth);
        // máy quay bám theo Trái Đất
        d.subVectors(pos, k.controls.target);
        k.camera.position.add(d);
        k.controls.target.copy(pos);
        k.caption(lit ? 'Nơi quan sát đang là ban ngày' : 'Nơi quan sát đang là ban đêm');
      };
    },
  },

  MATH_VECTOR_3D: {
    dist: 7.5,
    target: [0, 0.6, 0],
    orbit: () => [35, 22],
    setup: (k) => {
      const g = k.zUp();
      g.scale.setScalar(0.4);
      const putAxes = axes(k, g, 5, 0.05);
      const va = k.arrow(C.blue, 0.07);
      const vb = k.arrow(C.red, 0.07);
      const vc = k.arrow(C.green, 0.09);
      const par = sheet(C.purple, 0.2);
      const edge = k.line(C.purple, 1.6, Array.from({length: 15}, () => 0));
      g.add(va.obj, vb.obj, vc.obj, par, edge);
      const la = k.label('a', C.blue, true);
      const lb = k.label('b', C.red, true);
      const lc = k.label('[a, b]', C.green, true);
      const O = V();
      return ({p}) => {
        const a = [p.ax, p.ay, p.az];
        const b = [p.bx, p.by, p.bz];
        const c = cross3(a, b);
        const A = V(...a);
        const B = V(...b);
        const Cc = V(...c);
        va.set(O, A);
        vb.set(O, B);
        const sum = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
        par.setPts([[0, 0, 0], a, sum, b]);
        setLine(edge, [0, 0, 0, ...a, ...sum, ...b, 0, 0, 0]);
        const show = p.cross === 1 && len3(c) > 0;
        vc.set(O, show ? Cc : O);
        putAxes();
        la(A, g);
        lb(B, g);
        lc(show ? Cc : null, g);
      };
    },
  },

  MATH_SPACE_RELATIONS: {
    floor: true,
    dist: 8.5,
    target: [0, 1, 0],
    orbit: () => [-28, 20],
    setup: (k) => {
      const g = k.zUp();
      g.scale.setScalar(2);
      g.position.set(-1, 0, 1); // tâm đáy về gốc, đáy ABCD nằm trên sàn
      const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).translate(0.5, 0.5, 0.5), new THREE.MeshPhysicalMaterial({color: '#DCEBFA', roughness: 0.08, transparent: true, opacity: 0.22, depthWrite: false}));
      const shadow = new THREE.Mesh(body.geometry, new THREE.MeshBasicMaterial({colorWrite: false, depthWrite: false})); // khối trong suốt vẫn cần bóng đổ để thấy nó đứng trên sàn
      shadow.castShadow = true;
      const edges = k.line('#1D1B16', 2.4, CUBE_EDGES.flatMap(([a, b]) => [...CUBE[a], ...CUBE[b]]), true);
      const plane = sheet(C.blue, 0.3);
      const hot = k.line(C.blue, 5, [0, 0, 0, 0, 0, 0], true);
      g.add(body, shadow, edges, plane, hot);
      const names = Object.entries(CUBE).map(([n, v]) => [k.label(n.replace('1', '′'), '#1D1B16', true), V(...v)] as const);
      let last = '';
      return ({s}) => {
        names.forEach(([put, v]) => put(v, g));
        if (s.q === last) return;
        last = s.q;
        const hl = CUBE_HIGHLIGHT[s.q];
        plane.material.color.set(hl.col);
        plane.setPts(hl.planePts.map((n) => CUBE[n]));
        hot.material.color.set(hl.col);
        setLine(hot, hl.lines.flatMap(([a, b]) => [...CUBE[a], ...CUBE[b]]));
        k.caption(`${CUBE_QUESTIONS[s.q].label}\n${CUBE_QUESTIONS[s.q].text}`);
      };
    },
  },

  MATH_QUADRIC_SURFACES: {
    dist: 9.5,
    orbit: ({p, t}) => [p.az + t * 30, p.el],
    setup: (k) => {
      const g = k.zUp();
      g.scale.setScalar(0.8);
      const putAxes = axes(k, g, 3.2, 0.03);
      const mesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshPhysicalMaterial({color: '#4F7FE0', roughness: 0.3, metalness: 0.1, clearcoat: 0.6, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1}));
      mesh.castShadow = true;
      const iso = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({color: '#FFFFFF', transparent: true, opacity: 0.55}));
      g.add(mesh, iso);
      let last = '';
      return ({s}) => {
        putAxes();
        if (s.s === last) return;
        last = s.s;
        const S0 = SURFACES[s.s];
        const at = (i: number, j: number, nu: number, nv: number) => S0.fn(S0.u[0] + ((S0.u[1] - S0.u[0]) * i) / nu, S0.v[0] + ((S0.v[1] - S0.v[0]) * j) / nv);
        const NU = 40;
        const NV = 80;
        const pos: number[] = [];
        const idx: number[] = [];
        for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) pos.push(...at(i, j, NU, NV));
        for (let i = 0; i < NU; i++)
          for (let j = 0; j < NV; j++) {
            const a = i * (NV + 1) + j;
            idx.push(a, a + NV + 1, a + 1, a + 1, a + NV + 1, a + NV + 2);
          }
        mesh.geometry.dispose();
        mesh.geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)).setIndex(idx);
        mesh.geometry.computeVertexNormals();
        // hai họ đường tham số u, v vẽ trên mặt
        const seg: number[] = [];
        for (let i = 0; i <= 14; i++) for (let j = 0; j < NV; j++) seg.push(...at(i, j, 14, NV), ...at(i, j + 1, 14, NV), ...at(j, i, NV, 14), ...at(j + 1, i, NV, 14));
        iso.geometry.dispose();
        iso.geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(seg, 3));
        k.caption(`${S0.label}\n${S0.eq}`);
      };
    },
  },
};

export const SCENES: Record<string, SceneDef> = {...CORE, ...MORE_SCENES, ...BIO_SCENES, ...EXTRA_SCENES, ...BLENDER_SCENES, ...BLENDER2_SCENES, ...BLENDER3_SCENES, ...BLENDER4_SCENES};

const Scene3D: React.FC<{id: string; p: P; t: number; s: S; onFail: () => void; onSet?: (key: string, value: number | string) => void}> = ({id, ...rest}) => <Stage3D def={SCENES[id]} {...rest} />;
export default Scene3D;
