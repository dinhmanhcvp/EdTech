'use client';

import React, {useMemo} from 'react';
import * as THREE from 'three';
import {BENCH, MIRROR_LEN, clampMirror, trace, type Mirror} from '../../utils/lab/hands/optics';
import {handPointers, labRoom, type HandsInput} from './handsKit';
import {solid} from './handsModels';
import {dress, partOf, withSims2} from './labParts';
import {Stage3D, setLine, type SceneDef} from './Stage3D';

/** Trạng thái bài căn chỉnh laser dùng chung giữa bảng điều khiển React và cảnh 3D. */
export interface OpticsLive {
  mirrors: Mirror[];
  set: (i: number, m: Mirror) => void;
}

const Y = 0.3;
const MAX_PTS = 14;

function makeDef(input: HandsInput, live: OpticsLive): SceneDef {
  return {
    floor: true,
    room: true,
    dist: 9.5,
    target: [-0.3, 0, -0.3],
    orbit: () => [0, 55],
    setup: (k) => {
      labRoom(k, [8.4, 5.6, -0.3, -0.5]);
      solid(k.scene, new THREE.BoxGeometry(8.4, 0.12, 5.6), '#1C1F4A', {rough: 0.9, x: -0.3, y: -0.056, z: -0.5});
      const {laser, wall, detector: det} = BENCH;
      const laserBox = solid(k.scene, new THREE.BoxGeometry(0.7, 0.3, 0.3), '#C9CED6', {metal: 0.8, rough: 0.3, x: laser.x - 0.4, y: Y, z: laser.z});
      solid(k.scene, new THREE.BoxGeometry(0.16, Y, 0.16), '#3A3F47', {x: laser.x - 0.4, y: Y / 2, z: laser.z});
      k.label('Laser 532 nm', '#39FF6A')(new THREE.Vector3(laser.x - 0.4, 0.55, laser.z));
      solid(k.scene, new THREE.BoxGeometry(0.08, 0.8, wall[1][1] - wall[0][1]), '#15171B', {rough: 0.9, x: wall[0][0], y: 0.4, z: (wall[0][1] + wall[1][1]) / 2});
      const tubeAngle = Math.atan2(det.face[0], det.face[1]);
      const tube = solid(k.scene, new THREE.CylinderGeometry(det.r, det.r, 0.5, 24, 1, true).rotateX(Math.PI / 2), '#3A3F47', {metal: 0.6, rough: 0.4, side: THREE.DoubleSide, x: det.x - det.face[0] * 0.25, y: Y, z: det.z - det.face[1] * 0.25});
      tube.rotation.y = tubeAngle;
      const sensor = solid(k.scene, new THREE.BoxGeometry(0.5, 0.5, 0.2), '#23272E', {x: det.x - det.face[0] * 0.6, y: Y, z: det.z - det.face[1] * 0.6});
      sensor.rotation.y = tubeAngle;
      withSims2((lib) => {
        dress(laserBox, partOf(lib, 'LaserHead'));
        dress(sensor, partOf(lib, 'PhotoDetector'));
      });
      const lamp = solid(k.scene, new THREE.SphereGeometry(0.08, 16, 12), '#55524B', {x: sensor.position.x, y: Y + 0.33, z: sensor.position.z});
      k.label('Đầu thu')(new THREE.Vector3(sensor.position.x, 0.8, sensor.position.z));

      const beam = k.line('#39FF6A', 4, new Array(MAX_PTS * 3).fill(0));
      const halo = k.line('#39FF6A', 12, new Array(MAX_PTS * 3).fill(0));
      Object.assign(halo.material, {transparent: true, opacity: 0.22, depthWrite: false});
      k.scene.add(halo, beam);
      const glow = new THREE.PointLight('#39FF6A', 0, 2.5);
      k.scene.add(glow);

      const rigs = live.mirrors.map((_, i) => {
        const g = new THREE.Group();
        k.scene.add(g);
        const mirrorPlain = [solid(g, new THREE.BoxGeometry(MIRROR_LEN, 0.5, 0.03), '#DDF1FF', {metal: 1, rough: 0.05, y: Y}), solid(g, new THREE.CylinderGeometry(0.12, 0.14, 0.05, 24), '#3A3F47', {y: 0.025})];
        withSims2((lib) => {
          const sk = partOf(lib, 'MirrorMount'); // mô hình dài 1: co lại cho vừa chiều dài gương của bài
          if (!sk) return;
          sk.obj.scale.x = MIRROR_LEN;
          g.add(sk.obj);
          mirrorPlain.forEach((m) => (m.visible = false));
        });
        const knob = solid(g, new THREE.SphereGeometry(0.07, 16, 12), '#E3B341', {rough: 0.4, x: MIRROR_LEN / 2, y: Y + 0.3});
        return {g, knob, label: k.label(`Gương ${i + 1}`)};
      });

      const P = handPointers(k, input, Y);
      const v3 = new THREE.Vector3();
      const centre = (m: Mirror) => new THREE.Vector3(m.x, Y, m.z);
      const knobAt = (m: Mirror) => new THREE.Vector3(m.x + (Math.cos(m.a) * MIRROR_LEN) / 2, Y + 0.3, m.z + (Math.sin(m.a) * MIRROR_LEN) / 2);
      /** vật gần con trỏ nhất: thân gương (dời) hoặc núm vàng ở đầu gương (xoay) */
      const pick = (nx: number, ny: number, reach: number) => {
        let best: {i: number; turn: boolean} | null = null;
        let bd = reach;
        live.mirrors.forEach((m, i) => {
          for (const turn of [false, true]) {
            const d = P.distAt(nx, ny, turn ? knobAt(m) : centre(m));
            if (d < bd) {
              bd = d;
              best = {i, turn};
            }
          }
        });
        return best as {i: number; turn: boolean} | null;
      };
      P.grabWhen((nx, ny) => !!pick(nx, ny, 0.07));
      const held: ({i: number; turn: boolean} | null)[] = P.ptrs.map(() => null);
      let last = performance.now();

      return () => {
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        P.step(1 - Math.exp(-dt * 28));
        const lit = new Set<number>();
        P.ptrs.forEach((p, n) => {
          const hover = p.active && !held[n] ? pick(p.ndc.x, p.ndc.y, p.reach) : null;
          if (p.pressed && hover) held[n] = hover;
          if (p.released || !p.active) held[n] = null;
          const h = held[n];
          if (h) {
            const m = live.mirrors[h.i];
            const at = P.onPlane(p.ndc.x, p.ndc.y, h.turn ? Y + 0.3 : Y, v3);
            live.set(h.i, h.turn ? {...m, a: Math.atan2(at.z - m.z, at.x - m.x)} : clampMirror({...m, x: at.x, z: at.z}));
          }
          const on = h ?? hover;
          p.hot = !!on;
          if (on) lit.add(on.i);
        });

        const tr = trace(live.mirrors);
        const flat: number[] = [];
        for (let i = 0; i < MAX_PTS; i++) {
          const q = tr.path[Math.min(i, tr.path.length - 1)];
          flat.push(q[0], Y, q[1]);
        }
        setLine(beam, flat);
        setLine(halo, flat);
        const end = tr.path[tr.path.length - 1];
        glow.position.set(end[0], Y, end[1]);
        glow.intensity = 1.5 + 0.3 * Math.sin(now / 60);
        lamp.material.color.set(tr.aligned ? '#35C46A' : tr.hit ? '#E3B341' : '#55524B');
        lamp.material.emissive.set(tr.aligned ? '#1E9E4D' : tr.hit ? '#B8860B' : '#000000');
        live.mirrors.forEach((m, i) => {
          const r = rigs[i];
          r.g.position.set(m.x, 0, m.z);
          r.g.rotation.y = -m.a;
          r.knob.scale.setScalar(lit.has(i) ? 1.4 : 1);
          const b = tr.bounces.find((x) => x.mirror === i);
          r.label(v3.set(m.x, Y + 0.45, m.z), undefined, b ? `Gương ${i + 1}: i = i′ = ${b.deg.toFixed(1)}°` : `Gương ${i + 1}`);
        });
        k.caption(tr.aligned ? 'Đầu thu nhận đủ tín hiệu\nTia đi đúng trục ống' : tr.hit ? `Tia chạm miệng ống nhưng lệch trục ${tr.off.toFixed(1)}°\nXoay gương cuối thật chậm bằng núm vàng` : 'Tia chưa tới đầu thu\nChụm vào thân gương để dời, vào núm vàng để xoay');
      };
    },
  };
}

const HandsOptics3D: React.FC<{input: HandsInput; live: OpticsLive; onFail: () => void}> = ({input, live, onFail}) => {
  const def = useMemo(() => makeDef(input, live), [input, live]);
  return <Stage3D fill def={def} p={{}} t={0} s={{}} onFail={onFail} />;
};
export default HandsOptics3D;
