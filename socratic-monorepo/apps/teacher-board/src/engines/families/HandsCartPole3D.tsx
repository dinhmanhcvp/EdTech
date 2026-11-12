'use client';

import React, {useMemo} from 'react';
import * as THREE from 'three';
import {CART, control, fallen, step, type CartState, type Gains} from '../../utils/lab/hands/cartpole';
import {handPointers, labRoom, type HandsInput} from './handsKit';
import {solid} from './handsModels';
import {Stage3D, type SceneDef} from './Stage3D';

/** Trạng thái bài con lắc ngược dùng chung giữa bảng điều khiển React và cảnh 3D (cảnh tích phân, bảng chỉ đọc). */
export interface CartLive {
  state: CartState;
  /** bộ điều khiển phản hồi bật hay tắt (tắt = tay người điều khiển) */
  auto: boolean;
  gains: Gains;
  /** vị trí đặt mong muốn của xe (m): kéo bằng tay khi bộ điều khiển bật */
  xref: number;
  /** thời gian đã đứng liên tục (s) */
  held: number;
  fell: boolean;
  /** xung lực ngang (N·s) đặt vào đỉnh cột ở khung hình kế tiếp */
  kick: number;
  reset: () => void;
}
const SCALE = 2.2; // 1 m = 2,2 đơn vị cảnh
const Y = 0.4;

function makeDef(input: HandsInput, live: CartLive): SceneDef {
  return {
    floor: true,
    room: true,
    dist: 8.4,
    target: [0, 0.9, -0.2],
    orbit: () => [0, 24],
    setup: (k) => {
      labRoom(k, [9, 3.6, 0, -0.2]);
      solid(k.scene, new THREE.BoxGeometry(9, 0.12, 3.6), '#1C1F4A', {rough: 0.9, y: -0.056, z: -0.2});
      solid(k.scene, new THREE.BoxGeometry(CART.rail * 2 * SCALE, 0.06, 0.18), '#C9CED6', {metal: 0.8, rough: 0.3, y: 0.15, z: -0.2});
      for (const s of [-1, 1]) solid(k.scene, new THREE.BoxGeometry(0.15, 0.5, 0.4), '#D9481C', {y: 0.25, x: s * (CART.rail * SCALE + 0.1), z: -0.2});
      const cart = new THREE.Group();
      k.scene.add(cart);
      solid(cart, new THREE.BoxGeometry(0.9, 0.25, 0.5), '#2F6FD0', {metal: 0.4, rough: 0.4, y: 0.35});
      for (const sx of [-1, 1]) solid(cart, new THREE.CylinderGeometry(0.11, 0.11, 0.55, 20).rotateX(Math.PI / 2), '#15171B', {x: sx * 0.3, y: 0.22});
      const pivot = new THREE.Group();
      pivot.position.y = Y + 0.15;
      cart.add(pivot);
      const L = CART.l * 2 * SCALE; // chiều dài cột = 2l
      solid(pivot, new THREE.CylinderGeometry(0.035, 0.035, L, 16), '#E9E4D8', {y: L / 2, metal: 0.3});
      const bob = solid(pivot, new THREE.SphereGeometry(0.17, 24, 16), '#D9481C', {y: L, metal: 0.2, rough: 0.35});
      const refMark = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 10, 32).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({color: '#39FF6A', depthTest: false, transparent: true}));
      refMark.position.set(0, 0.08, -0.2);
      refMark.renderOrder = 3;
      k.scene.add(refMark);
      const tag = k.label('Xe và cột (kéo vòng xanh để đặt vị trí)');

      const P = handPointers(k, input, 0.3);
      const v3 = new THREE.Vector3();
      const refPos = new THREE.Vector3();
      const cartPos = new THREE.Vector3();
      const bobPos = new THREE.Vector3();
      // bộ điều khiển bật: kéo vòng xanh; tắt: kéo xe (lò xo kéo xe về phía con trỏ, như người đẩy xe bằng tay)
      P.grabWhen((nx, ny) => P.distAt(nx, ny, live.auto ? refPos : cartPos) < 0.12);
      const held: boolean[] = P.ptrs.map(() => false);
      let last = performance.now();
      let acc = 0;
      let target = 0;

      return () => {
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        P.step(1 - Math.exp(-dt * 28));
        P.ptrs.forEach((p, n) => {
          const hover = p.active && P.distAt(p.ndc.x, p.ndc.y, live.auto ? refPos : cartPos) < p.reach;
          if (p.pressed && hover) held[n] = true;
          if (p.released || !p.active) held[n] = false;
          if (held[n]) target = P.onPlane(p.ndc.x, p.ndc.y, 0.3, v3).x / SCALE;
          p.hot = held[n] || hover;
        });
        const hand = held.some(Boolean);
        if (hand && live.auto) live.xref = Math.max(-CART.rail + 0.2, Math.min(CART.rail - 0.2, target));

        acc += dt;
        while (acc >= 0.005 && !live.fell) {
          acc -= 0.005;
          let u = live.auto ? control(live.state, live.xref, live.gains) : 0;
          if (!live.auto && hand) u = 60 * (target - live.state.x) - 14 * live.state.v;
          if (live.kick) {
            live.state = {...live.state, w: live.state.w + live.kick / (CART.m * CART.l * 2)};
            live.kick = 0;
          }
          live.state = step(live.state, Math.max(-60, Math.min(60, u)), 0.005);
          if (fallen(live.state)) live.fell = true;
          else live.held += 0.005;
        }
        if (live.fell) acc = 0;
        const s = live.state;
        cart.position.set(s.x * SCALE, 0, -0.2);
        pivot.rotation.z = -s.th;
        refMark.position.x = live.xref * SCALE;
        refMark.visible = live.auto;
        refPos.copy(refMark.position);
        cartPos.set(s.x * SCALE, 0.4, -0.2);
        bobPos.set(s.x * SCALE + Math.sin(s.th) * (CART.l * 2 * SCALE), Y + 0.15 + Math.cos(s.th) * (CART.l * 2 * SCALE), -0.2);
        bob.material.color.set(live.fell ? '#7A7A7A' : Math.abs(s.th) > 0.5 ? '#E5392B' : '#D9481C');
        tag(v3.set(bobPos.x, bobPos.y + 0.4, -0.2), undefined, live.fell ? 'Đã ngã' : `θ = ${((s.th * 180) / Math.PI).toFixed(1)}°`);
        k.caption(live.fell ? 'Cột đã ngã\nBấm "Làm lại" rồi thử lại với hệ số khác' : live.auto ? `Bộ điều khiển phản hồi đang giữ cột · đứng ${live.held.toFixed(1)} s\nKéo vòng xanh để dời xe mà cột không ngã` : `Tự điều khiển: kéo xe sang phía cột đang nghiêng · đứng ${live.held.toFixed(1)} s\nChụm vào xe rồi kéo`);
      };
    },
  };
}

const HandsCartPole3D: React.FC<{input: HandsInput; live: CartLive; onFail: () => void}> = ({input, live, onFail}) => {
  const def = useMemo(() => makeDef(input, live), [input, live]);
  return <Stage3D fill def={def} p={{}} t={0} s={{}} onFail={onFail} />;
};
export default HandsCartPole3D;
