'use client';

import React, {useMemo} from 'react';
import * as THREE from 'three';
import {TERMS, explain, netSources, wireKey, type Term, type Verdict, type Wire} from '../../utils/lab/hands/threePhase';
import {handPointers, labRoom, type HandsInput} from './handsKit';
import {Stage3D, type SceneDef} from './Stage3D';

/** Trạng thái bài đấu 3 pha dùng chung giữa bảng điều khiển React và cảnh 3D. */
export interface HandsLive {
  wires: Wire[];
  on: boolean;
  verdict: Verdict | null;
  /** thời điểm (performance.now) aptomat nhảy vì sự cố: cảnh nháy tia lửa */
  tripAt: number;
  connect: (a: Term, b: Term) => void;
  remove: (key: string) => void;
  toggle: () => void;
}

const POS: Record<Term, [number, number]> = {
  PE: [-1.55, -1.3],
  L1: [-1.55, -0.75],
  L2: [-1.55, -0.3],
  L3: [-1.55, 0.15],
  U1: [0.15, -0.2],
  V1: [0.7, -0.2],
  W1: [1.25, -0.2],
  W2: [0.15, 0.4],
  U2: [0.7, 0.4],
  V2: [1.25, 0.4],
  GND: [-0.2, -1.2],
};
const NAME: Partial<Record<Term, string>> = {GND: 'Vỏ máy', PE: 'PE (đất)'};
const TOP = 0.2;
const COLOR: Record<string, string> = {L1: '#D43D2A', L2: '#E3B341', L3: '#2F6FD0', PE: '#2E9B57', none: '#C8722A'};
const BREAKER = new THREE.Vector3(-2.5, 0.62, -0.3);
type Target = {term: Term} | {bead: string} | {breaker: true};

const at = (t: Term, y = TOP) => new THREE.Vector3(POS[t][0], y, POS[t][1]);
const arc = (a: THREE.Vector3, b: THREE.Vector3) => new THREE.QuadraticBezierCurve3(a, a.clone().lerp(b, 0.5).setY(TOP + 0.3 + 0.2 * a.distanceTo(b)), b);
const tube = (a: THREE.Vector3, b: THREE.Vector3) => new THREE.TubeGeometry(arc(a, b), 28, 0.035, 10);

function makeDef(input: HandsInput, live: HandsLive): SceneDef {
  return {
    floor: true,
    room: true,
    dist: 7.5,
    target: [-0.55, 0.2, -0.6],
    orbit: () => [0, 48],
    setup: (k) => {
      const solid = (geo: THREE.BufferGeometry, color: string, o: {metal?: number; rough?: number; x?: number; y?: number; z?: number; parent?: THREE.Object3D} = {}) => {
        const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color, metalness: o.metal ?? 0.1, roughness: o.rough ?? 0.6}));
        m.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0);
        m.castShadow = m.receiveShadow = true;
        (o.parent ?? k.scene).add(m);
        return m;
      };
      const xCyl = (r1: number, r2: number, len: number, seg = 40) => new THREE.CylinderGeometry(r1, r2, len, seg).rotateZ(Math.PI / 2);

      // ---- mặt bàn, tủ điện
      labRoom(k, [7.4, 4.8, -0.4, -0.4]);
      solid(new THREE.BoxGeometry(7.4, 0.12, 4.8), '#D9C6A5', {rough: 0.85, x: -0.4, y: -0.056, z: -0.4});
      solid(new THREE.BoxGeometry(0.8, 0.5, 1.3), '#ECE8DF', {rough: 0.4, x: -2.5, y: 0.25, z: -0.3});
      solid(xCyl(0.07, 0.07, 1.1, 16), '#1D1B16', {x: -3.4, y: 0.12, z: -0.3});
      const handle = solid(new THREE.BoxGeometry(0.34, 0.14, 0.95), '#2459C9', {rough: 0.35, x: -2.5, y: 0.56, z: -0.3});
      const led = solid(new THREE.SphereGeometry(0.05, 16, 12), '#333333', {x: -2.5, y: 0.52, z: 0.25});
      for (const t of ['L1', 'L2', 'L3', 'PE'] as const) solid(new THREE.BoxGeometry(t === 'PE' ? 2.4 : 0.6, 0.04, 0.08), COLOR[t], {x: t === 'PE' ? -2.75 : -1.85, y: 0.025, z: POS[t][1]});

      // ---- bảng cọc đấu dây của động cơ (hộp đấu dây vẽ phóng to), nét đồng = ba cuộn dây bên trong
      solid(new THREE.BoxGeometry(1.75, 0.06, 1.2), '#23272E', {rough: 0.5, x: 0.7, y: 0.03, z: 0.1});
      k.scene.add(k.line('#C99A52', 2.5, (['U1', 'U2', 'V1', 'V2', 'W1', 'W2'] as const).flatMap((t) => at(t, 0.065).toArray()), true));
      solid(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.7, 0.06, -0.5), new THREE.Vector3(0.7, 0.5, -0.95), new THREE.Vector3(0.7, 1.05, -1.25), new THREE.Vector3(0.7, 1.08, -1.6)]), 24, 0.06, 10), '#3A3F47', {rough: 0.7});

      // ---- động cơ
      const motor = new THREE.Group();
      motor.position.set(0.7, 0, -1.7);
      k.scene.add(motor);
      const paint = {metal: 0.35, rough: 0.42, parent: motor};
      solid(new THREE.BoxGeometry(2.1, 0.08, 1.25), '#4A515A', {...paint, y: 0.04});
      const body = solid(xCyl(0.42, 0.42, 1.3), '#2C5E8C', {...paint, y: 0.58});
      for (let i = 0; i < 13; i++) solid(xCyl(0.465, 0.465, 0.035), '#2C5E8C', {...paint, x: -0.54 + i * 0.09, y: 0.58});
      for (const sx of [-1, 1]) {
        solid(xCyl(sx > 0 ? 0.36 : 0.43, sx > 0 ? 0.43 : 0.36, 0.14), '#27527A', {...paint, x: sx * 0.72, y: 0.58});
        solid(new THREE.BoxGeometry(0.22, 0.2, 1.05), '#27527A', {...paint, x: sx * 0.42, y: 0.16});
      }
      solid(xCyl(0.45, 0.45, 0.3), '#1F2A36', {...paint, x: -0.93, y: 0.58});
      solid(new THREE.BoxGeometry(0.42, 0.2, 0.38), '#27527A', {...paint, y: 1.06});
      const rotor = new THREE.Group();
      rotor.position.set(0, 0.58, 0);
      motor.add(rotor);
      const steel = {metal: 0.9, rough: 0.28, parent: rotor};
      solid(xCyl(0.07, 0.07, 0.5, 20), '#B9BEC5', {...steel, x: 1.0});
      solid(xCyl(0.27, 0.27, 0.12), '#B9BEC5', {...steel, x: 1.22});
      // vấu màu trên vành puli: nhìn từ trên xuống vẫn thấy rõ đang quay và quay chiều nào
      for (let i = 0; i < 3; i++) solid(new THREE.BoxGeometry(0.13, 0.05, 0.12), '#D9481C', {parent: rotor, x: 1.22, y: 0.27 * Math.cos((i * 2 * Math.PI) / 3), z: 0.27 * Math.sin((i * 2 * Math.PI) / 3)}).rotation.x = (i * 2 * Math.PI) / 3;
      k.label('Động cơ không đồng bộ 3 pha')(new THREE.Vector3(0.7, 1.35, -1.7));
      const smoke = Array.from({length: 6}, () => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), new THREE.MeshBasicMaterial({color: '#5B5852', transparent: true, opacity: 0, depthWrite: false}));
        k.scene.add(m);
        return m;
      });
      const flash = new THREE.PointLight('#CFE6FF', 0, 8);
      flash.position.set(-1.9, 0.5, -0.3);
      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshBasicMaterial({color: '#FFFFFF', transparent: true, opacity: 0}));
      spark.position.copy(flash.position);
      k.scene.add(flash, spark);

      // ---- cọc đấu dây
      const studs = {} as Record<Term, THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>>;
      for (const t of TERMS) {
        solid(new THREE.CylinderGeometry(0.11, 0.13, 0.07, 24), '#15171B', {x: POS[t][0], y: t === 'GND' ? 0.115 : 0.095, z: POS[t][1]});
        studs[t] = solid(new THREE.CylinderGeometry(0.065, 0.065, 0.14, 6), '#C9A24B', {metal: 0.9, rough: 0.3, x: POS[t][0], y: TOP - 0.07, z: POS[t][1]});
        k.label(NAME[t] ?? t, COLOR[t])(at(t, TOP + 0.02));
      }

      // ---- dây đã đấu, dây đang kéo
      const mat = (color: string) => new THREE.MeshStandardMaterial({color, roughness: 0.45, emissive: color, emissiveIntensity: 0});
      const wireGroup = new THREE.Group();
      k.scene.add(wireGroup);
      let shown: Wire[] | null = null;
      let beads: {key: string; pos: THREE.Vector3; live: boolean; mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>; bead: THREE.Mesh}[] = [];
      const rebuild = () => {
        shown = live.wires;
        for (const o of [...wireGroup.children] as THREE.Mesh[]) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
        wireGroup.clear();
        const src = netSources(shown);
        beads = shown.map(([a, b]) => {
          const s = src[a];
          const mesh = new THREE.Mesh(tube(at(a), at(b)), mat(COLOR[s ?? 'none']));
          mesh.castShadow = true;
          const pos = arc(at(a), at(b)).getPoint(0.5);
          const bead = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshStandardMaterial({color: '#FBF9F4', roughness: 0.3}));
          bead.position.copy(pos);
          wireGroup.add(mesh, bead);
          return {key: wireKey(a, b), pos, live: !!s && s !== 'PE', mesh, bead};
        });
      };

      // ---- con trỏ: hai bàn tay + chuột
      const P = handPointers(k, input, TOP + 0.06);
      const drags = P.ptrs.map(() => {
        const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat(COLOR.none));
        mesh.visible = false;
        k.scene.add(mesh);
        return {from: null as Term | null, mesh};
      });
      const v3 = new THREE.Vector3();
      /** vật gần con trỏ nhất tính trên màn hình */
      const pick = (nx: number, ny: number, reach: number): Target | null => {
        let best: Target | null = null;
        let bd = reach;
        const tryAt = (pos: THREE.Vector3, tg: Target) => {
          const d = P.distAt(nx, ny, pos);
          if (d < bd) {
            bd = d;
            best = tg;
          }
        };
        for (const t of TERMS) tryAt(studs[t].position, {term: t});
        for (const b of beads) tryAt(b.pos, {bead: b.key});
        tryAt(BREAKER, {breaker: true});
        return best;
      };
      P.grabWhen((nx, ny) => !!pick(nx, ny, 0.07));

      let last = performance.now();
      let omega = 0;
      let angle = 0;
      let heat = 0;
      let handleX = -0.14;

      return () => {
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        const ease = 1 - Math.exp(-dt * 28);
        if (shown !== live.wires) rebuild();
        const v = live.verdict;
        const hot = new Set<Term>();

        P.step(ease);
        P.ptrs.forEach((p, i) => {
          const d = drags[i];
          const hover = p.active ? pick(p.ndc.x, p.ndc.y, p.reach) : null;
          if (p.pressed && hover) {
            if ('term' in hover) d.from = hover.term;
            else if ('bead' in hover) live.remove(hover.bead);
            else live.toggle();
          }
          if (p.released) {
            if (d.from && hover && 'term' in hover && hover.term !== d.from) live.connect(d.from, hover.term);
            d.from = null;
          }
          if (!p.active) d.from = null;
          p.hot = !!hover;
          if (hover && 'term' in hover) hot.add(hover.term);
          d.mesh.visible = !!d.from;
          if (d.from) {
            hot.add(d.from);
            d.mesh.geometry.dispose();
            d.mesh.geometry = tube(at(d.from), hover && 'term' in hover && hover.term !== d.from ? at(hover.term) : P.onPlane(p.ndc.x, p.ndc.y, TOP + 0.12, new THREE.Vector3()));
          }
        });

        for (const t of TERMS) {
          const s = studs[t];
          const on = hot.has(t);
          s.scale.lerp(v3.setScalar(on ? 1.45 : 1), ease);
          s.material.emissive.set(on ? '#D9481C' : '#000000');
        }
        for (const b of beads) {
          b.mesh.material.emissiveIntensity = live.on && b.live ? 0.3 + 0.2 * Math.sin(now / 90) : 0;
          b.bead.visible = !live.on;
        }

        // ---- aptomat, tia lửa
        handleX += ((live.on ? 0.14 : -0.14) - handleX) * ease;
        handle.position.x = -2.5 + handleX;
        handle.rotation.z = -handleX * 2.2;
        const tripped = !live.on && !!v && (v.kind === 'short' || v.kind === 'live_frame' || (v.kind === 'run' && v.load === 'over'));
        (led.material as THREE.MeshStandardMaterial).color.set(live.on ? '#35C46A' : tripped ? '#E5392B' : '#55524B');
        (led.material as THREE.MeshStandardMaterial).emissive.set(live.on ? '#1E9E4D' : tripped ? '#C4261A' : '#000000');
        const since = (now - live.tripAt) / 1000;
        const burst = since < 0.5 ? (1 - since / 0.5) * (0.6 + 0.4 * Math.sin(now / 12)) : 0;
        flash.intensity = burst * 60;
        spark.material.opacity = burst;
        spark.scale.setScalar(0.4 + since * 3);

        // ---- động cơ
        const run = live.on && v?.kind === 'run' ? v : null;
        const bad = live.on && (v?.kind === 'unbalanced' || run?.load === 'over');
        omega += ((run ? run.dir * (run.load === 'under' ? 5 : 15) : 0) - omega) * Math.min(1, dt * 1.3);
        angle += omega * dt;
        rotor.rotation.x = angle;
        heat += ((bad ? 1 : 0) - heat) * Math.min(1, dt * (bad ? 0.5 : 0.8));
        (body.material as THREE.MeshStandardMaterial).emissive.setRGB(heat * 0.55, heat * 0.06, 0);
        const shake = live.on && v?.kind === 'unbalanced' ? 0.012 : 0;
        motor.position.set(0.7 + shake * Math.sin(now / 9), 0, -1.7 + shake * Math.cos(now / 7));
        smoke.forEach((s, i) => {
          const u = (now / 1600 + i / smoke.length) % 1;
          s.position.set(0.7 + 0.25 * Math.sin(i * 2.1 + u * 3), 1.2 + u * 1.3, -1.7 + 0.2 * Math.cos(i * 1.7));
          s.scale.setScalar(0.6 + u * 1.6);
          s.material.opacity = heat * 0.5 * (1 - u);
        });

        k.caption(live.on || v ? `${explain(v ?? {kind: 'dead', earthed: false}).head}\n${live.on ? 'Mạch đang có điện: không chạm vào dây' : 'Aptomat đã cắt'}` : 'Aptomat đang cắt: an toàn để đấu dây\nChụm vào một cọc, kéo tới cọc khác rồi nhả');
      };
    },
  };
}

const HandsThreePhase3D: React.FC<{input: HandsInput; live: HandsLive; onFail: () => void}> = ({input, live, onFail}) => {
  const def = useMemo(() => makeDef(input, live), [input, live]);
  return <Stage3D fill def={def} p={{}} t={0} s={{}} onFail={onFail} />;
};
export default HandsThreePhase3D;
