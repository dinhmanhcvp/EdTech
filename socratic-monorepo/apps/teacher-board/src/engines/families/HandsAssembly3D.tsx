'use client';

import React, {useMemo} from 'react';
import * as THREE from 'three';
import {armIK, blockersToRemove, type AssemblyKind, type AssemblySpec} from '../../utils/lab/hands/assembly';
import {handPointers, labRoom, type HandsInput} from './handsKit';
import {V, about, buildDrone, buildEngine, buildPC, part, solid, xCyl, xRing, type Built, type Model} from './handsModels';
import {Stage3D, type SceneDef} from './Stage3D';

/** Trạng thái bài tháo lắp dùng chung giữa bảng điều khiển React và cảnh 3D. */
export interface AssemblyLive {
  kind: AssemblyKind;
  spec: AssemblySpec;
  /** các chi tiết đang nằm trên khay (đã tháo / chưa lắp) */
  off: ReadonlySet<string>;
  /** hiện tên mọi chi tiết */
  names: boolean;
  /** đã đạt yêu cầu bài: động cơ chạy thử */
  run: boolean;
  /** tháo hoặc lắp một chi tiết theo luật thứ tự; false = bị cản (bảng điều khiển đã báo lí do) */
  attempt: (id: string) => boolean;
  /** chi tiết đang cầm hoặc đang trỏ vào, để bảng điều khiển hiện vai trò của nó */
  focus: (id: string | null) => void;
}

const HOLD = 0.6;
const deg = (r: number) => `${Math.round((r * 180) / Math.PI)}°`;

// ------------------------------------------------------------------ động cơ không đồng bộ 3 pha (mô hình cắt bổ)
function buildMotor(scene: THREE.Scene): Record<string, Built> {
  const C = V(-0.3, 0.58, -1.0);
  const at = (dx: number, dy = 0) => V(C.x + dx, C.y + dy, C.z);
  const paint = {metal: 0.35, rough: 0.42};
  const steel = {metal: 0.9, rough: 0.28};
  const body = new THREE.Group();
  body.position.copy(C);
  scene.add(body);
  // vỏ và stato cắt một phần tư phía trước-trên để nhìn thấy bên trong từ góc camera
  const cut = (r: number, len: number, open: boolean) => new THREE.CylinderGeometry(r, r, len, 48, 1, open, 0.4 * Math.PI, 1.55 * Math.PI).rotateZ(Math.PI / 2);
  solid(body, new THREE.BoxGeometry(2.0, 0.08, 1.25), '#4A515A', {...paint, y: -0.54});
  for (const sx of [-1, 1]) solid(body, new THREE.BoxGeometry(0.22, 0.2, 1.05), '#27527A', {...paint, x: sx * 0.42, y: -0.42});
  solid(body, cut(0.42, 1.3, true), '#2C5E8C', {...paint, side: THREE.DoubleSide});
  for (let i = 0; i < 13; i++) solid(body, cut(0.465, 0.035, false), '#2C5E8C', {...paint, x: -0.54 + i * 0.09});
  solid(body, cut(0.37, 1.0, true), '#7E848C', {metal: 0.6, rough: 0.5, side: THREE.DoubleSide});
  for (const sx of [-1, 1]) solid(body, xRing(0.33, 0.05), '#C8722A', {metal: 0.5, rough: 0.45, x: sx * 0.55});
  solid(body, new THREE.BoxGeometry(0.42, 0.16, 0.38), '#27527A', {...paint, y: 0.49});

  const P: Record<string, Built> = {
    cowl: part(scene, at(-0.95), V(-3.0, 0.45, 0.55)),
    fan: part(scene, at(-0.9), V(-2.25, 0.36, 0.55), {spin: true}),
    rear_shield: part(scene, at(-0.72), V(-1.55, 0.43, 0.55)),
    rear_bearing: part(scene, at(-0.58), V(-0.95, 0.14, 0.55)),
    front_bearing: part(scene, at(0.58), V(-0.45, 0.14, 0.55)),
    front_shield: part(scene, at(0.72), V(0.15, 0.43, 0.55)),
    pulley: part(scene, at(1.22), V(0.9, 0.27, 0.55), {spin: true}),
    box_cover: part(scene, at(0, 0.6), V(1.6, 0.03, 0.55)),
    rotor: part(scene, at(0), V(-0.6, 0.3, 1.55), {spin: true}),
  };
  solid(P.cowl.obj, new THREE.CylinderGeometry(0.45, 0.45, 0.22, 40, 1, true).rotateZ(Math.PI / 2), '#1F2A36', {...paint, side: THREE.DoubleSide});
  solid(P.cowl.obj, xCyl(0.45, 0.45, 0.02), '#1F2A36', {...paint, x: -0.11});
  solid(P.fan.obj, xCyl(0.09, 0.09, 0.1, 20), '#E9E4D8', {rough: 0.5});
  for (let i = 0; i < 7; i++) {
    const a = (i * 2 * Math.PI) / 7;
    solid(P.fan.obj, new THREE.BoxGeometry(0.02, 0.26, 0.11), '#E9E4D8', {rough: 0.5, y: 0.21 * Math.cos(a), z: 0.21 * Math.sin(a)}).rotation.x = a;
  }
  solid(P.rear_shield.obj, xCyl(0.36, 0.43, 0.14), '#27527A', paint);
  solid(P.front_shield.obj, xCyl(0.43, 0.36, 0.14), '#27527A', paint);
  for (const b of [P.rear_bearing, P.front_bearing]) {
    solid(b.obj, xRing(0.105, 0.035), '#D5D9DE', steel);
    solid(b.obj, xRing(0.07, 0.012), '#3A3F47', {rough: 0.6});
  }
  solid(P.pulley.obj, xCyl(0.27, 0.27, 0.12), '#B9BEC5', steel);
  // vấu màu trên vành puli: nhìn từ trên xuống vẫn thấy rõ đang quay
  for (let i = 0; i < 3; i++) {
    const a = (i * 2 * Math.PI) / 3;
    solid(P.pulley.obj, new THREE.BoxGeometry(0.13, 0.05, 0.12), '#D9481C', {y: 0.27 * Math.cos(a), z: 0.27 * Math.sin(a)}).rotation.x = a;
  }
  solid(P.box_cover.obj, new THREE.BoxGeometry(0.44, 0.05, 0.4), '#1F2A36', paint);
  solid(P.rotor.obj, xCyl(0.07, 0.07, 2.3, 20), '#B9BEC5', {...steel, x: 0.17});
  solid(P.rotor.obj, xCyl(0.29, 0.29, 0.9), '#A9AEB6', {metal: 0.75, rough: 0.4});
  for (const sx of [-1, 1]) solid(P.rotor.obj, xCyl(0.3, 0.3, 0.06), '#DADDE2', {...steel, x: sx * 0.48});
  // thanh dẫn của lồng sóc
  for (let i = 0; i < 18; i++) {
    const a = (i * 2 * Math.PI) / 18;
    solid(P.rotor.obj, new THREE.BoxGeometry(0.9, 0.012, 0.03), '#5F6770', {metal: 0.6, y: 0.292 * Math.cos(a), z: 0.292 * Math.sin(a)}).rotation.x = a;
  }
  return P;
}

// ------------------------------------------------------------------ cánh tay robot 3 bậc tự do
const ARM = {base: V(-0.3, 0, -1.0), shoulderY: 0.62, elbowY: 1.22, l1: 0.6, l2: 1.0};

function buildRobot(scene: THREE.Scene): Record<string, Built> {
  const B = ARM.base;
  const at = (dx: number, dy: number, dz = 0) => V(B.x + dx, B.y + dy, B.z + dz);
  const servo = '#1E2A4A';
  const alu = {metal: 0.7, rough: 0.35};
  solid(scene, new THREE.BoxGeometry(1.7, 0.08, 1.2), '#2B2F36', {rough: 0.5, x: B.x, y: 0.04, z: B.z});
  const P: Record<string, Built> = {
    base_servo: part(scene, at(0, 0.22), V(-3.0, 0.14, 0.7), {stage: 0}),
    turntable: part(scene, at(0, 0.4), V(-2.35, 0.03, 0.7), {stage: 1}),
    shoulder_servo: part(scene, at(0, 0.57), V(-1.75, 0.14, 0.7), {stage: 1}),
    lower_arm: part(scene, at(0, 0.92), V(-1.2, 0.37, 0.7), {stage: 2}),
    elbow_servo: part(scene, at(0, ARM.elbowY), V(-0.65, 0.12, 0.7), {stage: 2}),
    forearm: part(scene, at(0.36, ARM.elbowY), V(0.05, 0.05, 0.7), {stage: 3}),
    gripper: part(scene, at(0.74, ARM.elbowY), V(0.85, 0.07, 0.7), {stage: 3}),
    board: part(scene, at(0.52, 0.1, 0.33), V(1.6, 0.02, 0.7), {stage: 0}),
    battery: part(scene, at(-0.52, 0.15, 0.33), V(2.35, 0.07, 0.7), {stage: 0}),
  };
  solid(P.base_servo.obj, new THREE.BoxGeometry(0.3, 0.28, 0.3), servo, {rough: 0.4});
  solid(P.base_servo.obj, new THREE.CylinderGeometry(0.05, 0.05, 0.06, 16), '#E9E4D8', {y: 0.16});
  solid(P.turntable.obj, new THREE.CylinderGeometry(0.32, 0.32, 0.06, 40), '#C9CED6', alu);
  solid(P.shoulder_servo.obj, new THREE.BoxGeometry(0.3, 0.28, 0.24), servo, {rough: 0.4});
  for (const sz of [-1, 1]) {
    solid(P.lower_arm.obj, new THREE.BoxGeometry(0.1, 0.74, 0.03), '#E08A2B', {...alu, z: sz * 0.15});
    solid(P.forearm.obj, new THREE.BoxGeometry(0.62, 0.09, 0.03), '#E08A2B', {...alu, z: sz * 0.14});
    solid(P.gripper.obj, new THREE.BoxGeometry(0.2, 0.03, 0.03), '#C9CED6', {...alu, x: 0.16, z: sz * 0.07});
  }
  solid(P.lower_arm.obj, new THREE.BoxGeometry(0.08, 0.06, 0.3), '#E08A2B', alu);
  solid(P.elbow_servo.obj, new THREE.BoxGeometry(0.26, 0.24, 0.22), servo, {rough: 0.4});
  solid(P.gripper.obj, new THREE.BoxGeometry(0.16, 0.14, 0.2), servo, {rough: 0.4});
  solid(P.board.obj, new THREE.BoxGeometry(0.5, 0.03, 0.36), '#1F7A4D', {rough: 0.5});
  solid(P.board.obj, new THREE.BoxGeometry(0.14, 0.04, 0.14), '#1D1B16', {y: 0.03, x: -0.05});
  solid(P.board.obj, new THREE.BoxGeometry(0.06, 0.07, 0.24), '#1D1B16', {y: 0.04, x: 0.19});
  solid(P.battery.obj, new THREE.BoxGeometry(0.42, 0.14, 0.24), '#3A3F47', {rough: 0.5});
  solid(P.battery.obj, new THREE.BoxGeometry(0.14, 0.145, 0.245), '#E3B341', {rough: 0.5, x: -0.08});
  return P;
}

const BUILD: Record<AssemblyKind, (s: THREE.Scene) => Model> = {motor: (s) => ({parts: buildMotor(s), wideTray: true}), robot: (s) => ({parts: buildRobot(s)}), engine: buildEngine, drone: buildDrone, pc: buildPC};

function makeDef(input: HandsInput, live: AssemblyLive): SceneDef {
  return {
    floor: true,
    room: true,
    dist: 7.6,
    target: [-0.5, 0.4, -0.2],
    orbit: () => [0, 48],
    setup: (k) => {
      labRoom(k, [8.4, 5.6, -0.4, 0.1]);
      const model = BUILD[live.kind](k.scene);
      const robot = live.kind === 'robot';
      solid(k.scene, new THREE.BoxGeometry(8.4, 0.12, 5.6), '#D9C6A5', {rough: 0.85, x: -0.4, y: -0.056, z: 0.1});
      // khay đặt chi tiết
      solid(k.scene, new THREE.BoxGeometry(6.6, 0.02, model.wideTray ? 2.2 : 0.9), '#CDB892', {rough: 0.9, x: -0.4, y: 0.012, z: model.wideTray ? 1.05 : 0.7});
      const built = model.parts;
      const parts = live.spec.parts.map((s) => {
        const b = built[s.id];
        const mats: THREE.MeshStandardMaterial[] = [];
        b.obj.traverse((o) => {
          const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
          if (m) mats.push(m);
        });
        b.obj.position.copy(live.off.has(s.id) ? b.tray : b.home);
        return {...b, id: s.id, mats, label: k.label(s.name), lit: false};
      });
      type PartRt = (typeof parts)[number];
      const goal = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.02, 10, 40), new THREE.MeshBasicMaterial({color: '#D9481C', depthTest: false, transparent: true}));
      goal.renderOrder = 3;
      goal.visible = false;
      k.scene.add(goal);

      const P = handPointers(k, input, HOLD);
      const held: (PartRt | null)[] = P.ptrs.map(() => null);
      const built0 = () => live.off.size === 0;
      const ikMode = () => (robot || !!model.tip) && built0();
      const tip = model.tip ?? V();
      /** chi tiết gần con trỏ nhất; ưu tiên chi tiết tháo được ngay (các chi tiết lắp chồng nhau nằm sát nhau trên màn hình) */
      const pick = (nx: number, ny: number, reach: number): PartRt | null => {
        let best: PartRt | null = null;
        let bd = Infinity;
        for (const p of parts) {
          const d = P.distAt(nx, ny, p.obj.position);
          if (d > reach) continue;
          const score = d + (!live.off.has(p.id) && blockersToRemove(live.spec, live.off, p.id).length ? 1 : 0);
          if (score < bd) {
            bd = score;
            best = p;
          }
        }
        return best;
      };
      P.grabWhen((nx, ny) => (ikMode() ? P.distAt(nx, ny, tip) < 0.12 : !!pick(nx, ny, 0.07)));

      let last = performance.now();
      let omega = 0;
      let angle = 0;
      let focus: string | null = null;
      const ang = {yaw: 0, a1: Math.PI / 2, a2: 0};
      const m1 = new THREE.Matrix4();
      const m2 = new THREE.Matrix4();
      const m3 = new THREE.Matrix4();
      const tmp = new THREE.Matrix4();
      const v3 = V();
      const shoulder = V(ARM.base.x, ARM.shoulderY, ARM.base.z);
      const elbow = V(ARM.base.x, ARM.elbowY, ARM.base.z);

      return () => {
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        const ease = 1 - Math.exp(-dt * 28);
        P.step(ease);
        const ik = ikMode();
        let nowFocus: string | null = null;
        let reach: THREE.Vector3 | null = null;
        goal.visible = false;

        P.ptrs.forEach((p, i) => {
          if (ik) {
            held[i] = null;
            if (p.down) reach = P.onPlane(p.ndc.x, p.ndc.y, model.driveY ?? 0.25, V());
            p.hot = p.down || P.distAt(p.ndc.x, p.ndc.y, tip) < p.reach;
            return;
          }
          const hover = p.active && !held[i] ? pick(p.ndc.x, p.ndc.y, p.reach) : null;
          if (p.pressed && hover) {
            // chi tiết còn bị che: báo lí do ngay, không cho nhấc
            if (!live.off.has(hover.id) && blockersToRemove(live.spec, live.off, hover.id).length) live.attempt(hover.id);
            else held[i] = hover;
          }
          const h = held[i];
          if (h) {
            const near = P.distAt(p.ndc.x, p.ndc.y, h.home) < 0.16;
            if (p.released || !p.active) {
              if (p.active && near === live.off.has(h.id)) live.attempt(h.id);
              held[i] = null;
            } else {
              h.obj.position.lerp(P.onPlane(p.ndc.x, p.ndc.y, HOLD, v3), ease);
              if (live.off.has(h.id)) {
                goal.visible = true;
                goal.position.copy(h.home);
                goal.quaternion.copy(k.camera.quaternion);
                goal.scale.setScalar(near ? 1.5 : 1 + 0.15 * Math.sin(now / 150));
              }
            }
          }
          p.hot = !!(hover ?? h);
          nowFocus ??= (h ?? hover)?.id ?? null;
        });
        if (nowFocus !== focus) live.focus((focus = nowFocus));

        // ---- chạy thử động cơ khi đã lắp đủ
        omega += ((live.kind === 'motor' && live.run ? 12 : 0) - omega) * Math.min(1, dt * 1.2);
        angle += omega * dt;

        // ---- tay máy: tay kẹp đi theo điểm chụm; không ai điều khiển thì tự quét một cung
        const text = model.run?.({dt, now, on: live.run, target: reach});
        if (ik && robot) {
          const t = now / 1000;
          const tg: THREE.Vector3 = reach ?? V(ARM.base.x + (1.05 + 0.25 * Math.sin(t * 0.9)) * Math.cos(Math.sin(t * 0.5)), 0.35, ARM.base.z + (1.05 + 0.25 * Math.sin(t * 0.9)) * Math.sin(Math.sin(t * 0.5)) + 0.2);
          const dx = tg.x - ARM.base.x;
          const dz = tg.z - ARM.base.z;
          const sol = armIK(Math.hypot(dx, dz), tg.y - ARM.shoulderY, ARM.l1, ARM.l2);
          const f = 1 - Math.exp(-dt * 10);
          ang.yaw += (Math.atan2(-dz, dx) - ang.yaw) * f;
          ang.a1 += (sol.a1 - ang.a1) * f;
          ang.a2 += (sol.a2 - ang.a2) * f;
          about(m1.identity(), ARM.base, new THREE.Matrix4().makeRotationY(ang.yaw));
          about(m2.copy(m1), shoulder, new THREE.Matrix4().makeRotationZ(ang.a1 - Math.PI / 2));
          about(m3.copy(m2), elbow, new THREE.Matrix4().makeRotationZ(ang.a2 - ang.a1 + Math.PI / 2));
          tip.set(ARM.base.x + ARM.l2, ARM.elbowY, ARM.base.z).applyMatrix4(m3);
          k.caption(`Xoay đế θ₀ = ${deg(ang.yaw)} · vai θ₁ = ${deg(ang.a1)} · khuỷu θ₂ = ${deg(ang.a1 - ang.a2)}\nChụm tay rồi kéo trên mặt bàn (hoặc kéo tay kẹp bằng chuột)`);
        } else k.caption(text || (built0() ? `${live.spec.title}\nĐã lắp hoàn chỉnh` : `${live.spec.title}\nChụm vào chi tiết để nhấc, kéo ra khay hoặc về đúng vị trí rồi nhả`));

        for (const p of parts) {
          const isHeld = held.includes(p);
          const stage = ik && robot ? [null, m1, m2, m3][p.stage ?? 0] : (built0() && p.pose) || null;
          p.obj.matrixAutoUpdate = !stage;
          if (stage) {
            p.obj.matrix.copy(stage).multiply(tmp.makeTranslation(p.home.x, p.home.y, p.home.z));
            p.obj.matrixWorldNeedsUpdate = true;
          } else if (!isHeld) p.obj.position.lerp(live.off.has(p.id) ? p.tray : p.home, 1 - Math.exp(-dt * 10));
          if (p.spin) p.obj.rotation.x = angle;
          const lit = isHeld || p.id === focus;
          if (lit !== p.lit) {
            p.lit = lit;
            for (const m of p.mats) m.emissive.set(lit ? '#5A2408' : '#000000');
          }
          if (stage) v3.setFromMatrixPosition(p.obj.matrix);
          else v3.copy(p.obj.position);
          p.label(live.names || lit ? v3.setY(v3.y + 0.3) : null);
        }
      };
    },
  };
}

const HandsAssembly3D: React.FC<{input: HandsInput; live: AssemblyLive; onFail: () => void}> = ({input, live, onFail}) => {
  const def = useMemo(() => makeDef(input, live), [input, live]);
  return <Stage3D fill def={def} p={{}} t={0} s={{}} onFail={onFail} />;
};
export default HandsAssembly3D;
