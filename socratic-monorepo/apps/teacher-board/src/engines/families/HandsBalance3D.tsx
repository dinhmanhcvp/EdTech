'use client';

import React, {useMemo} from 'react';
import * as THREE from 'three';
import {BAL, force, range, reading, type BalState} from '../../utils/lab/hands/currentBalance';
import {padRate} from '../../utils/lab/hands/handTracker';
import {mishapFx, mishapSound} from './mishapFx';
import {handPointers, labRoom, type HandsInput} from './handsKit';
import {V, solid} from './handsModels';
import {assetUrl, gltfLoader} from './labParts';
import {Stage3D, type Kit, type SceneDef} from './Stage3D';

/** Trạng thái bài cân dòng điện dùng chung giữa bảng điều khiển React và cảnh 3D. */
export interface BalanceLive {
  s: BalState;
  set: (patch: Partial<BalState>) => void;
  /** ghi số đo hiện tại vào sổ */
  record: () => void;
  /** nhận id sự cố để hiện thẻ giải thích */
  report?: (id: string) => void;
  /** cảnh báo vị trí khe nam châm trên màn hình (px) để kính lúp vẽ nét nối tới đúng chỗ */
  anchor?: (x: number, y: number) => void;
}

const PANEL = 0.5; // mặt trên bàn điều khiển
const FRONT = 1.42; // hàng núm và công tắc
const SWEEP = 1.5 * Math.PI;
const PIVOT = V(0.1, 2.75, -0.7);
const GAP = V(1.8, 1.0, -0.7); // cạnh đáy khung dây trong khe nam châm
const lit = (k: Kit, geo: THREE.BufferGeometry, color: string, at: THREE.Vector3) => {
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({color, transparent: true}));
  m.position.copy(at);
  k.scene.add(m);
  return m;
};
function makeDef(input: HandsInput, live: BalanceLive): SceneDef {
  return {
    floor: true,
    room: true,
    dist: 6.4,
    target: [0.2, 1.25, 0.2],
    orbit: () => [8, 13],
    setup: (k) => {
      k.controls.minDistance = 2.5;
      // đèn bàn ấm chiếu từ trước–trên: gỗ, đồng và crôm mới lên màu (phòng lab của hệ thống vốn tối)
      const key = new THREE.SpotLight('#FFE7C4', 260, 30, 0.6, 0.6);
      key.position.set(-2.5, 7, 6.5);
      key.target.position.set(0.4, 0.8, 0);
      key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048);
      key.shadow.bias = -0.0004;
      const rim = new THREE.PointLight('#9FB4FF', 40, 20);
      rim.position.set(4, 4, -3);
      k.scene.add(key, key.target, rim);
      labRoom(k, [9.4, 4.6, 0, 0.3]);
      solid(k.scene, new THREE.BoxGeometry(9.4, 0.12, 4.6), '#1C1F4A', {rough: 0.9, y: -0.056, z: 0.3});
      // ---- dụng cụ dựng bằng Blender (tools/lab-models/current_balance.py); bộ phận chuyển động là nút mang tên cố định
      type Mat = THREE.MeshStandardMaterial;
      type Rig = Record<'beam' | 'frame' | 'needleM' | 'needleI' | 'knobM' | 'knobI' | 'swK' | 'swI' | 'swB' | 'marker' | 'spring', THREE.Object3D> & {poles: Mat[]; lamp: Mat; edge: Mat; page: Mat; arrows: {o: THREE.Object3D; m: Mat}[]};
      let rig: Rig | null = null;
      gltfLoader().load(assetUrl('/models/current-balance.glb'), (g) => {
        g.scene.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          m.castShadow = !(m.material as Mat).transparent;
          m.receiveShadow = true;
        });
        k.scene.add(g.scene);
        const node = (n: string) => g.scene.getObjectByName(n)!;
        /** vật liệu riêng cho nút này (bản sao), để đổi màu lúc chạy mà không lan sang vật khác dùng chung */
        const own = (o: THREE.Object3D) => {
          let out = new THREE.MeshStandardMaterial();
          o.traverse((c) => {
            const m = c as THREE.Mesh;
            if (m.isMesh) m.material = out = (m.material as Mat).clone();
          });
          return out;
        };
        rig = {
          beam: node('Beam'),
          frame: node('Frame'),
          needleM: node('NeedleM'),
          needleI: node('NeedleI'),
          knobM: node('KnobM'),
          knobI: node('KnobI'),
          swK: node('SwK'),
          swI: node('SwI'),
          swB: node('SwB'),
          marker: node('Marker'),
          spring: node('Spring'),
          poles: [own(node('PoleA')), own(node('PoleB'))],
          lamp: own(node('LampK')),
          edge: own(node('Edge')),
          page: own(node('BookPage')),
          arrows: ['Arrow0', 'Arrow1', 'Arrow2'].map((n) => ({o: node(n), m: own(node(n))})),
        };
      });
      const knobs = [
        {id: 'Im' as const, x: -0.3, max: BAL.ImMax},
        {id: 'I' as const, x: 1.5, max: BAL.Imax},
      ];
      // nút bấm "−" / "+" hai bên mỗi núm: giữ ngón tay trên nút (không cần chụm) để đổi dòng mượt theo thời gian giữ
      const pads = knobs.flatMap((kn, i) =>
        [-1, 1].map((dir) => {
          const at = V(kn.x + dir * 0.36, PANEL + 0.08, FRONT + 0.02);
          const m = solid(k.scene, new THREE.CylinderGeometry(0.075, 0.085, 0.07, 20), dir > 0 ? '#2E9B57' : '#C4261A', {metal: 0.3, rough: 0.4, x: at.x, y: PANEL + 0.055, z: at.z});
          k.label(dir > 0 ? '+' : '−', '#FBF9F4', true)(V(at.x, PANEL + 0.12, at.z));
          return {i, dir, m, at, held: 0};
        }),
      );
      const FX = PIVOT.x - 1.2;
      const dots = [0, 1, 2, 3].map(() => lit(k, new THREE.SphereGeometry(0.035, 10, 8), '#FFD27F', GAP));

      // ---- nhãn viên thuốc cho từng dụng cụ (tắt được)
      const fixed: [(at: THREE.Vector3 | null, parent?: THREE.Object3D, text?: string) => void, THREE.Vector3][] = [
        [k.label('Đòn cân'), V(PIVOT.x + 0.9, PIVOT.y + 0.12, PIVOT.z)],
        [k.label('Lực kế 0,5 N'), V(FX - 0.55, 1.75, PIVOT.z)],
        [k.label('Khung dây 200 vòng'), V(GAP.x + 0.75, 1.9, GAP.z)],
        [k.label('Nam châm điện'), V(GAP.x + 0.9, 0.95, GAP.z)],
        [k.label('Nguồn một chiều 12 V'), V(-2.9, 1.0, 0.9)],
        [k.label('Sổ ghi: chụm để ghi số đo'), V(-2.7, 0.2, 2.1)],
      ];
      const tagKnob = [k.label('Biến trở nam châm'), k.label('Biến trở khung')];
      const tagK = [k.label('Công tắc K: mở'), k.label('Công tắc K: đóng', '#35C46A')];
      const tagRead = k.label('I = 0 A', '#D9481C');

      // ---- thao tác: xoay núm, gạt công tắc, chụm sổ để ghi
      const P = handPointers(k, input, PANEL + 0.2);
      type Hit = {kind: 'knob'; i: number} | {kind: 'K' | 'revI' | 'revB' | 'book'};
      const spots: [THREE.Vector3, Hit][] = [
        ...knobs.map((kn, i): [THREE.Vector3, Hit] => [V(kn.x, PANEL + 0.2, FRONT), {kind: 'knob', i}]),
        [V(0.6, PANEL + 0.3, FRONT), {kind: 'K'}],
        [V(2.25, PANEL + 0.3, FRONT), {kind: 'revI'}],
        [V(-1.05, PANEL + 0.3, FRONT), {kind: 'revB'}],
        [V(-2.7, 0.1, 2.1), {kind: 'book'}],
      ];
      const hit = (nx: number, ny: number, reach: number): Hit | null => {
        let best: Hit | null = null;
        let bd = reach;
        for (const [p, h] of spots) {
          const d = P.distAt(nx, ny, p);
          if (d < bd) {
            bd = d;
            best = h;
          }
        }
        return best;
      };
      P.grabWhen((nx, ny) => hit(nx, ny, 0.07) !== null || pads.some((pd) => P.distAt(nx, ny, pd.at) < 0.08));
      const held: ({i: number; a: number} | null)[] = P.ptrs.map(() => null);
      const slid = P.ptrs.map((p) => p.slide);
      let sel = 1;
      const v3 = new THREE.Vector3();
      const turn = (i: number, dt: number) => {
        const kn = knobs[i];
        live.set({[kn.id]: Math.min(kn.max, Math.max(0, live.s[kn.id] + dt * kn.max))});
      };

      // ---- trạng thái hiển thị (kim và đòn cân có quán tính)
      let showI = 0;
      let showIm = live.s.Im;
      let tilt = 0;
      let tiltV = 0;
      let last = performance.now();
      let flash = 0;
      const fx = mishapFx(k);
      let heat = 0; // 0 → 1 trong ~5 s khi dòng qua khung ≥ 0,9 A; nguội dần khi giảm dòng hay mở công tắc
      let burned = false;

      return () => {
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        P.step(1 - Math.exp(-dt * 28));
        const s = live.s;
        heat = Math.min(1, Math.max(0, heat + ((s.K && s.I >= 0.9 ? 1 / 5 : -1 / 3) * dt)));
        if (heat >= 1 && !burned) {
          burned = true;
          fx.go('burn', V(GAP.x, GAP.y + 0.3, GAP.z));
          mishapSound('burn');
          live.report?.('coil-burn');
        }
        if (heat < 0.2) burned = false;
        fx.update(dt);
        P.ptrs.forEach((ptr, n) => {
          const h = ptr.active && !held[n] ? hit(ptr.ndc.x, ptr.ndc.y, ptr.reach) : null;
          if (ptr.pressed && h) {
            if (h.kind === 'knob') {
              const at = P.onPlane(ptr.ndc.x, ptr.ndc.y, PANEL + 0.2, v3);
              held[n] = {i: h.i, a: Math.atan2(at.z - FRONT, at.x - knobs[h.i].x)};
              sel = h.i;
            } else if (h.kind === 'K') live.set({K: !s.K});
            else if (h.kind === 'revI') live.set({revI: !s.revI});
            else if (h.kind === 'revB') live.set({revB: !s.revB});
            else {
              live.record();
              flash = 1;
            }
          }
          if (ptr.released || !ptr.active) held[n] = null;
          const cur = held[n];
          const d = ptr.slide - slid[n];
          slid[n] = ptr.slide;
          if (cur) {
            // đưa tay vòng quanh núm: góc quay của tay là góc quay của núm
            const at = P.onPlane(ptr.ndc.x, ptr.ndc.y, PANEL + 0.2, v3);
            const a = Math.atan2(at.z - FRONT, at.x - knobs[cur.i].x);
            let da = a - cur.a;
            da -= Math.round(da / (2 * Math.PI)) * 2 * Math.PI;
            cur.a = a;
            turn(cur.i, da / SWEEP);
          } else if (d) turn(sel, d); // miết ngón cái dọc ngón trỏ: chỉnh tinh núm vừa cầm
          ptr.hot = !!(cur ?? h) || d !== 0;
        });

        for (const pd of pads) {
          const on = P.ptrs.some((ptr, n) => ptr.active && !held[n] && (ptr.hand || ptr.down) && P.distAt(ptr.ndc.x, ptr.ndc.y, pd.at) < (ptr.hand ? 0.09 : 0.05));
          pd.held = on ? pd.held + dt : 0;
          const rate = padRate(pd.held);
          if (rate) {
            turn(pd.i, pd.dir * rate * dt);
            sel = pd.i;
          }
          pd.m.position.y = PANEL + (on ? 0.035 : 0.055);
          pd.m.material.emissive.set(on ? (pd.dir > 0 ? '#1E9E4D' : '#8A1A12') : '#000000');
        }

        // ---- kim, công tắc, đèn
        const ease = 1 - Math.exp(-dt * 7);
        showI += ((s.K ? s.I : 0) - showI) * ease;
        showIm += (s.Im - showIm) * ease;
        const F = force(s);
        const goal = Math.max(-1, Math.min(1, F / 0.4)) * 0.13;
        // đòn cân: lò xo–giảm chấn quanh vị trí cân bằng mới, nên cân dao động vài nhịp rồi dừng
        tiltV += (120 * (goal - tilt) - 9 * tiltV) * dt;
        tilt += tiltV * dt;
        const hangY = PIVOT.y - 1.7 * Math.sin(tilt);
        const edgeY = hangY - 1.72;
        const shown = reading(s);
        flash *= 0.9;
        if (rig) {
          const R = rig;
          R.needleM.rotation.y = 0.9 - (showIm / BAL.ImMax) * 1.8;
          R.needleI.rotation.y = 0.9 - (showI / BAL.Imax) * 1.8;
          R.knobM.rotation.y = -(-SWEEP / 2 + (s.Im / BAL.ImMax) * SWEEP);
          R.knobI.rotation.y = -(-SWEEP / 2 + (s.I / BAL.Imax) * SWEEP);
          R.swK.rotation.x += ((s.K ? 0.5 : -0.5) - R.swK.rotation.x) * 0.3;
          R.swI.rotation.x += ((s.revI ? 0.5 : -0.5) - R.swI.rotation.x) * 0.3;
          R.swB.rotation.x += ((s.revB ? 0.5 : -0.5) - R.swB.rotation.x) * 0.3;
          R.lamp.color.set(s.K ? '#35C46A' : '#55524B');
          R.lamp.emissive.set(s.K ? '#1E9E4D' : '#000000');
          R.poles[0].color.set(s.revB ? '#2459C9' : '#C4261A');
          R.poles[1].color.set(s.revB ? '#C4261A' : '#2459C9');
          R.arrows.forEach((a, i) => {
            a.o.rotation.y = s.revB ? Math.PI : 0;
            a.m.emissiveIntensity = s.Im > 0.02 ? ((Math.floor(now / 250) + (s.revB ? -i : i) + 30) % 3 === 0 ? 3 : 0.6) : 0.05;
          });
          R.beam.rotation.z = -tilt;
          R.frame.position.set(PIVOT.x + 1.7 * Math.cos(tilt), hangY, PIVOT.z);
          R.edge.emissive.set('#D9481C');
          R.edge.emissiveIntensity = s.K ? 0.25 + 0.6 * s.I : 0;
          const y = 2.2 - (shown / BAL.max) * 0.8 + (tilt - goal) * 1.2; // con chạy rung theo đòn cân
          R.marker.position.y = y;
          const top = PIVOT.y + 1.2 * Math.sin(tilt) - 0.1;
          R.spring.position.y = top;
          R.spring.scale.y = Math.max(0.05, top - y);
          R.page.emissive.set('#D9481C');
          R.page.emissiveIntensity = flash * 0.6;
        }
        const dir = s.revI ? -1 : 1;
        dots.forEach((d, i) => {
          const u = (now / 900 + i / 4) % 1;
          d.visible = s.K && s.I > 0.01;
          d.position.set(GAP.x + dir * (u - 0.5) * 0.6, edgeY, GAP.z + 0.06);
        });

        // ---- nhãn
        fixed.forEach(([tag, at]) => tag(at));
        knobs.forEach((kn, i) => tagKnob[i](v3.set(kn.x, 0.12, FRONT + 0.75), undefined, `${i ? 'Biến trở khung' : 'Biến trở nam châm'}: ${s[kn.id].toFixed(2).replace('.', ',')} A`));
        tagK[0](!s.K ? v3.set(0.6, 0.95, FRONT) : null);
        tagK[1](s.K ? v3.set(0.6, 0.95, FRONT) : null);
        const r = range(s);
        tagRead(v3.set(0.6, 0.02, 1.95), undefined, !s.K ? `K mở · lực kế chỉ ${BAL.F0.toFixed(3).replace('.', ',')} N` : r !== 'ok' ? (r === 'over' ? 'Lực kế VƯỢT THANG 0,5 N: giảm dòng' : 'Lực kế chùng: lực hướng lên quá lớn') : `I = ${s.I.toFixed(2).replace('.', ',')} A · F = ${Math.abs(shown - BAL.F0).toFixed(3).replace('.', ',')} N ${F > 0 ? '↓' : F < 0 ? '↑' : ''}`);

        if (live.anchor) {
          v3.set(GAP.x, edgeY, GAP.z).project(k.camera);
          live.anchor(((v3.x + 1) / 2) * window.innerWidth, ((1 - v3.y) / 2) * window.innerHeight);
        }
      };
    },
  };
}

const HandsBalance3D: React.FC<{input: HandsInput; live: BalanceLive; onFail: () => void}> = ({input, live, onFail}) => {
  const def = useMemo(() => makeDef(input, live), [input, live]);
  return <Stage3D fill def={def} p={{}} t={0} s={{}} onFail={onFail} />;
};
export default HandsBalance3D;
