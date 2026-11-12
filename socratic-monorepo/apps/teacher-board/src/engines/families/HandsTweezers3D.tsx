'use client';

import React, {useMemo} from 'react';
import * as THREE from 'three';
import {DNA, jitter, settle} from '../../utils/lab/hands/tweezers';
import {handPointers, labRoom, type HandsInput} from './handsKit';
import {solid} from './handsModels';
import {place, withSims2} from './labParts';
import {Stage3D, setLine, type SceneDef} from './Stage3D';

/** Trạng thái bài kẹp quang học dùng chung giữa bảng điều khiển React và cảnh 3D. */
export interface TweezersLive {
  /** vị trí tâm bẫy (nm) tính từ hạt cố định */
  trap: number;
  /** thêm dao động nhiệt (chuyển động Brown) cho hạt */
  noise: boolean;
  set: (nm: number) => void;
}
/** 1 đơn vị cảnh = 4 µm: hạt thật (1 µm) vẽ to hơn để nhìn thấy */
export const NM_PER_UNIT = 4000;
const Y = 0.35;
const ANCHOR = -3.7;
const PTS = 48;

function makeDef(input: HandsInput, live: TweezersLive): SceneDef {
  return {
    floor: true,
    room: true,
    dist: 8,
    target: [0, 0, -0.2],
    orbit: () => [0, 58],
    setup: (k) => {
      labRoom(k, [9, 4.2, 0, -0.2]);
      solid(k.scene, new THREE.BoxGeometry(9, 0.12, 4.2), '#1C1F4A', {rough: 0.9, y: -0.056, z: -0.2});
      // lam kính của buồng vi lưu: dải sáng mờ để thấy mặt phẳng làm việc
      Object.assign(solid(k.scene, new THREE.BoxGeometry(8.6, 0.04, 1.3), '#7FC8FF', {rough: 0.1, y: 0.03, z: -0.2}).material, {transparent: true, opacity: 0.25});
      withSims2((lib) => {
        place(k.scene, lib, 'TrapStage', [0, 0, -0.2]); // bàn kính vi lưu quanh dải làm việc
        place(k.scene, lib, 'LaserTower', [3.8, 0, -1.9]); // tháp laser tạo bẫy
      });
      const bead = (color: string) => solid(k.scene, new THREE.SphereGeometry(0.2, 32, 24), color, {metal: 0.1, rough: 0.2, y: Y, z: -0.2});
      const anchor = bead('#E3B341');
      anchor.position.x = ANCHOR;
      const moving = bead('#F2F2F2');
      k.label('Hạt giữ cố định')(new THREE.Vector3(ANCHOR, 0.8, -0.2));
      const label = k.label('Hạt trong bẫy');

      const dna = k.line('#FF7A3D', 3, new Array(PTS * 3).fill(0));
      k.scene.add(dna);
      // bẫy: vòng sáng trên mặt bàn + tia laser từ trên xuống
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.03, 10, 40).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({color: '#FF3B3B', depthTest: false, transparent: true}));
      ring.renderOrder = 3;
      const beam = new THREE.Mesh(new THREE.ConeGeometry(0.18, 2.6, 24, 1, true), new THREE.MeshBasicMaterial({color: '#FF3B3B', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide}));
      const glow = new THREE.PointLight('#FF3B3B', 1.2, 2.5);
      k.scene.add(ring, beam, glow);

      const P = handPointers(k, input, Y);
      const trapPos = new THREE.Vector3();
      const v3 = new THREE.Vector3();
      P.grabWhen((nx, ny) => P.distAt(nx, ny, trapPos) < 0.1);
      const held: boolean[] = P.ptrs.map(() => false);
      const rnd = (n: number) => {
        const a = Math.sin(n * 12.9898) * 43758.5453;
        return (a - Math.floor(a)) * 2 - 1;
      };
      let last = performance.now();
      let jx = 0;

      return () => {
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        P.step(1 - Math.exp(-dt * 28));
        P.ptrs.forEach((p, n) => {
          const hover = p.active && P.distAt(p.ndc.x, p.ndc.y, trapPos) < p.reach;
          if (p.pressed && hover) held[n] = true;
          if (p.released || !p.active) held[n] = false;
          if (held[n]) {
            const at = P.onPlane(p.ndc.x, p.ndc.y, Y, v3);
            live.set(Math.min(Math.max((at.x - ANCHOR) * NM_PER_UNIT, 0), 1.9 * DNA.L));
          }
          p.hot = held[n] || hover;
        });

        const s = settle(live.trap);
        // dao động nhiệt: bước ngẫu nhiên có hồi quy về 0 (biên độ ~ √(kT/κ) ≈ 9 nm, phóng to để nhìn thấy)
        jx += (-jx * 6 * dt) + (live.noise ? rnd(now) * 0.6 * Math.sqrt(dt) * (jitter() / NM_PER_UNIT) * 40 : 0);
        const xm = ANCHOR + s.x / NM_PER_UNIT + jx;
        moving.position.x = xm;
        trapPos.set(ANCHOR + live.trap / NM_PER_UNIT, Y, -0.2);
        ring.position.copy(trapPos);
        beam.position.set(trapPos.x, Y + 1.3, -0.2);
        beam.rotation.x = Math.PI;
        glow.position.set(trapPos.x, Y + 0.2, -0.2);
        ring.scale.setScalar(held.some(Boolean) ? 0.8 : 1);
        label(v3.set(xm, 0.8, -0.2));

        // sợi DNA: càng chùng càng cuộn; căng thẳng thì thẳng
        const flat: number[] = [];
        const len = xm - ANCHOR;
        const slack = Math.max(0, 1 - s.x / DNA.L);
        for (let i = 0; i < PTS; i++) {
          const u = i / (PTS - 1);
          const wave = Math.sin(u * Math.PI) * 0.5 * Math.pow(slack, 1.5);
          flat.push(ANCHOR + 0.2 + u * Math.max(len - 0.4, 0.01), Y + 0.1 * wave * Math.sin(u * 17 + 1), -0.2 + wave * Math.sin(u * 9 + now / 900) * 0.6);
        }
        setLine(dna, flat);
        k.caption(`Lực ${s.force.toFixed(2)} pN · độ giãn ${(s.x / 1000).toFixed(2)} µm (${((s.x / DNA.L) * 100).toFixed(0)} % chiều dài)\n${s.force >= DNA.overstretch - 0.5 ? 'Quá kéo giãn: DNA duỗi thêm ~70 % ở lực gần như không đổi' : 'Chụm vào vòng đỏ rồi kéo sang phải: bẫy dẫn hạt, hạt kéo sợi DNA'}`);
      };
    },
  };
}

const HandsTweezers3D: React.FC<{input: HandsInput; live: TweezersLive; onFail: () => void}> = ({input, live, onFail}) => {
  const def = useMemo(() => makeDef(input, live), [input, live]);
  return <Stage3D fill def={def} p={{}} t={0} s={{}} onFail={onFail} />;
};
export default HandsTweezers3D;
