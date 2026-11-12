import * as THREE from 'three';
import {STROKES, pistonHeight, strokeOf} from '../../utils/lab/hands/assembly';

/** Một chi tiết tháo lắp được trong cảnh 3D. */
export interface Built {
  obj: THREE.Group;
  home: THREE.Vector3;
  tray: THREE.Vector3;
  /** quay quanh trục động cơ khi chạy thử */
  spin?: boolean;
  /** khâu của tay máy mà chi tiết gắn vào: 0 đế, 1 sau khớp xoay, 2 sau khớp vai, 3 sau khớp khuỷu */
  stage?: number;
  /** khi máy đã lắp đủ: phép dời (toạ độ thế giới) áp lên chi tiết đang ở vị trí lắp, do `Model.run` cập nhật mỗi khung hình */
  pose?: THREE.Matrix4;
}
/** Một mô hình tháo lắp: các chi tiết và phần chuyển động khi đã lắp xong. */
export interface Model {
  parts: Record<string, Built>;
  /** khay hai hàng (có chi tiết dài) */
  wideTray?: boolean;
  /** có thì khi lắp xong người học kéo điểm này để điều khiển máy (drone) */
  tip?: THREE.Vector3;
  /** độ cao mặt phẳng mà con trỏ kéo `tip` */
  driveY?: number;
  /** gọi mỗi khung hình; `on` = đã đạt yêu cầu bài. Trả về chú thích khi máy đang chạy. */
  run?: (c: {dt: number; now: number; on: boolean; target: THREE.Vector3 | null}) => string | void;
}
type Opt = {metal?: number; rough?: number; x?: number; y?: number; z?: number; side?: THREE.Side};

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export function solid(parent: THREE.Object3D, geo: THREE.BufferGeometry, color: string, o: Opt = {}) {
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color, metalness: o.metal ?? 0.1, roughness: o.rough ?? 0.6, side: o.side ?? THREE.FrontSide}));
  m.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
/** trụ nằm dọc trục x; r1 = bán kính đầu −x, r2 = đầu +x */
export const xCyl = (r1: number, r2: number, len: number, seg = 40) => new THREE.CylinderGeometry(r1, r2, len, seg).rotateZ(Math.PI / 2);
export const xRing = (r: number, tube: number) => new THREE.TorusGeometry(r, tube, 12, 40).rotateY(Math.PI / 2);
const zCyl = (r: number, len: number, seg = 32) => new THREE.CylinderGeometry(r, r, len, seg).rotateX(Math.PI / 2);
const yCyl = (r: number, h: number, seg = 32) => new THREE.CylinderGeometry(r, r, h, seg);
const box = (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z);
export const part = (scene: THREE.Scene, home: THREE.Vector3, tray: THREE.Vector3, extra: Partial<Built> = {}): Built => {
  const obj = new THREE.Group();
  scene.add(obj);
  return {obj, home, tray, ...extra};
};
const tmp = new THREE.Matrix4();
/** nhân thêm vào `out` phép quay `rot` quanh điểm `pivot` */
export const about = (out: THREE.Matrix4, pivot: THREE.Vector3, rot: THREE.Matrix4) => out.multiply(tmp.makeTranslation(pivot.x, pivot.y, pivot.z)).multiply(rot).multiply(tmp.makeTranslation(-pivot.x, -pivot.y, -pivot.z));

const C = V(-0.3, 0, -1.0);
const at = (dx: number, dy: number, dz = 0) => V(C.x + dx, dy, C.z + dz);
const steel = {metal: 0.85, rough: 0.3};
const cast = {metal: 0.4, rough: 0.55};

// ------------------------------------------------------------------ động cơ xăng 4 kì một xi-lanh (mô hình cắt bổ)
const STROKE_NOTE = ['pít-tông đi xuống, xu-páp nạp mở: hút hỗn hợp xăng và không khí', 'hai xu-páp đóng kín, pít-tông đi lên nén hỗn hợp', 'bugi đánh lửa, khí cháy giãn nở đẩy pít-tông xuống sinh công', 'xu-páp xả mở, pít-tông đi lên đẩy khí thải ra ngoài'];

export function buildEngine(scene: THREE.Scene): Model {
  const R = 0.16;
  const L = 0.55;
  const YC = 0.5;
  const PIN = YC + R + L;
  solid(scene, box(1.6, 0.08, 1.3), '#4A515A', {...cast, x: C.x, y: 0.04, z: C.z});
  for (const sz of [-1, 1]) solid(scene, box(0.5, YC, 0.1), '#5B636E', {...cast, x: C.x, y: YC / 2, z: C.z + sz * 0.3});
  for (const sx of [-1, 1]) solid(scene, box(0.07, 1.5, 0.07), '#5B636E', {...cast, x: C.x + sx * 0.4, y: 0.75, z: C.z - 0.3});

  const P: Record<string, Built> = {
    head_cover: part(scene, at(0, 2.0), V(0.7, 0.12, 0.55)),
    spark: part(scene, at(0.33, 1.84), V(-3.0, 0.18, 0.55)),
    camshaft: part(scene, at(0, 1.98), V(-1.6, 0.1, 0.55)),
    valves: part(scene, at(0, 1.72), V(-2.4, 0.22, 0.55)),
    head: part(scene, at(0, 1.66), V(1.8, 0.11, 0.55)),
    cylinder: part(scene, at(0, 1.2), V(-2.4, 0.35, 1.55)),
    piston: part(scene, at(0, PIN), V(-0.8, 0.12, 0.55)),
    conrod: part(scene, at(0, PIN), V(-0.1, 0.62, 0.55)),
    flywheel: part(scene, at(0, YC, -0.45), V(-1.2, 0.42, 1.55)),
    crank: part(scene, at(0, YC), V(0.3, 0.22, 1.55)),
  };
  Object.assign(solid(P.head_cover.obj, box(0.56, 0.22, 0.5), '#9FD3FF', {rough: 0.15}).material, {transparent: true, opacity: 0.3});
  solid(P.spark.obj, yCyl(0.035, 0.26, 16), '#F1EEE6', {rough: 0.4});
  solid(P.spark.obj, yCyl(0.02, 0.1, 12), '#B9BEC5', {...steel, y: 0.18});
  solid(P.camshaft.obj, xCyl(0.04, 0.04, 0.5, 16), '#B9BEC5', steel);
  solid(P.camshaft.obj, xCyl(0.07, 0.07, 0.07, 20), '#D9481C', {...steel, x: -0.14, y: -0.03});
  solid(P.camshaft.obj, xCyl(0.07, 0.07, 0.07, 20), '#2F6FD0', {...steel, x: 0.14, z: 0.03});
  const valve = [-1, 1].map((sx) => {
    const g = new THREE.Group();
    g.position.x = sx * 0.14;
    g.userData.keep = true; // van chuyển động do `run` điều khiển: không thay bằng mô hình tĩnh
    P.valves.obj.add(g);
    solid(g, yCyl(0.022, 0.36, 12), '#DADDE2', steel);
    solid(g, yCyl(0.09, 0.02, 24), '#DADDE2', {...steel, y: -0.19});
    solid(g, yCyl(0.05, 0.1, 16), sx < 0 ? '#D9481C' : '#2F6FD0', {rough: 0.5, y: 0.12});
    return g;
  });
  solid(P.head.obj, box(0.75, 0.22, 0.34), '#7E848C', {...cast, z: -0.18});
  solid(P.cylinder.obj, new THREE.CylinderGeometry(0.3, 0.3, 0.7, 40, 1, true, 0.3 * Math.PI, 1.4 * Math.PI), '#8A9099', {...cast, side: THREE.DoubleSide});
  for (let i = 0; i < 5; i++) solid(P.cylinder.obj, new THREE.TorusGeometry(0.33, 0.022, 8, 36, 1.4 * Math.PI).rotateX(Math.PI / 2).rotateY(-0.8 * Math.PI), '#8A9099', {...cast, y: -0.26 + i * 0.13});
  solid(P.piston.obj, yCyl(0.27, 0.26), '#C9CED6', {...steel, y: 0.03});
  for (const y of [0.07, 0.12]) solid(P.piston.obj, yCyl(0.274, 0.018), '#3A3F47', {y});
  solid(P.conrod.obj, box(0.08, L, 0.05), '#B08A3E', {...steel, y: -L / 2});
  solid(P.conrod.obj, zCyl(0.075, 0.06), '#B08A3E', {...steel, y: -L});
  solid(P.crank.obj, zCyl(0.05, 0.9, 20), '#B9BEC5', steel);
  for (const sz of [-1, 1]) solid(P.crank.obj, zCyl(0.21, 0.04), '#9AA0A8', {...steel, z: sz * 0.07});
  solid(P.crank.obj, zCyl(0.04, 0.14, 16), '#DADDE2', {...steel, y: R});
  solid(P.flywheel.obj, zCyl(0.42, 0.08, 48), '#3A3F47', {metal: 0.6, rough: 0.4});
  for (let i = 0; i < 3; i++) solid(P.flywheel.obj, box(0.1, 0.1, 0.09), '#D9481C', {x: 0.36 * Math.sin((i * 2 * Math.PI) / 3), y: 0.36 * Math.cos((i * 2 * Math.PI) / 3)});

  const flash = new THREE.PointLight('#FFB060', 0, 3);
  flash.position.copy(at(0, 1.5, 0.2));
  scene.add(flash);
  const [mPiston, mRod, mCrank, mCam, rot] = [0, 1, 2, 3, 4].map(() => new THREE.Matrix4());
  P.piston.pose = mPiston;
  P.conrod.pose = mRod;
  P.crank.pose = P.flywheel.pose = mCrank;
  P.camshaft.pose = mCam;
  let th = 0;
  let om = 0;
  return {
    parts: P,
    wideTray: true,
    run: ({dt, on}) => {
      om += ((on ? 4.5 : 0) - om) * Math.min(1, dt * 1.5);
      th += om * dt;
      const dy = pistonHeight(th, R, L) - R - L;
      mPiston.makeTranslation(0, dy, 0);
      about(mRod.makeTranslation(0, dy, 0), P.conrod.home, rot.makeRotationZ(Math.asin((R * Math.sin(th)) / L)));
      about(mCrank.identity(), P.crank.home, rot.makeRotationZ(-th));
      about(mCam.identity(), P.camshaft.home, rot.makeRotationX(th / 2));
      const ph = th % (4 * Math.PI);
      valve[0].position.y = ph < Math.PI ? -0.07 * Math.sin(ph) : 0;
      valve[1].position.y = ph > 3 * Math.PI ? 0.07 * Math.sin(ph) : 0;
      const since = ph - 2 * Math.PI;
      flash.intensity = on && since > 0 && since < 0.7 ? 10 * (1 - since / 0.7) : 0;
      const s = strokeOf(th);
      if (on) return `Kì ${STROKES[s].toLowerCase()}: ${STROKE_NOTE[s]}\nTrục khuỷu quay 2 vòng, trục cam quay 1 vòng cho một chu trình`;
    },
  };
}

// ------------------------------------------------------------------ drone 4 cánh
export function buildDrone(scene: THREE.Scene): Model {
  const A = 0.32;
  solid(scene, yCyl(0.95, 0.02, 48), '#2B2F36', {rough: 0.7, x: C.x, y: 0.01, z: C.z});
  solid(scene, new THREE.TorusGeometry(0.8, 0.02, 8, 48).rotateX(Math.PI / 2), '#E3B341', {x: C.x, y: 0.025, z: C.z});
  const P: Record<string, Built> = {
    frame: part(scene, at(0, 0.22), V(2.3, 0.22, -1.0)),
    motors_a: part(scene, at(0, 0.29), V(-3.0, 0.05, 0.7)),
    props_a: part(scene, at(0, 0.36), V(-2.25, 0.02, 0.7)),
    motors_b: part(scene, at(0, 0.29), V(-1.5, 0.05, 0.7)),
    props_b: part(scene, at(0, 0.36), V(-0.75, 0.02, 0.7)),
    esc: part(scene, at(0, 0.255), V(0, 0.02, 0.7)),
    fc: part(scene, at(0, 0.3), V(0.75, 0.02, 0.7)),
    rx: part(scene, at(0, 0.335), V(1.5, 0.02, 0.7)),
    battery: part(scene, at(0, 0.14), V(2.25, 0.05, 0.7)),
  };
  const carbon = {metal: 0.3, rough: 0.45};
  for (const s of [-1, 1]) solid(P.frame.obj, box(0.96, 0.03, 0.08), '#1F2329', carbon).rotation.y = (s * Math.PI) / 4;
  solid(P.frame.obj, box(0.34, 0.035, 0.34), '#1F2329', carbon);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) solid(P.frame.obj, yCyl(0.015, 0.2, 8), '#C9CED6', {...steel, x: sx * 0.2, y: -0.11, z: sz * 0.2});
  const spinners: {g: THREE.Group; dir: number}[] = [];
  for (const [key, dir, sign] of [['a', 1, 1], ['b', -1, -1]] as const)
    for (const s of [-1, 1]) {
      const x = s * A;
      const z = s * sign * A;
      solid(P[`motors_${key}`].obj, yCyl(0.07, 0.1, 20), dir > 0 ? '#D9481C' : '#2F6FD0', {...steel, x, z});
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.userData.keep = true;
      g.userData.prop = dir; // cánh quay: mô hình thật được đặt vào chính nhóm này (HandsMachines)
      P[`props_${key}`].obj.add(g);
      solid(g, box(0.5, 0.008, 0.05), dir > 0 ? '#F2B49F' : '#A9C6F2', {rough: 0.4});
      solid(g, yCyl(0.03, 0.03, 12), '#E9E4D8');
      spinners.push({g, dir});
    }
  solid(P.esc.obj, box(0.26, 0.025, 0.26), '#1F7A4D', {rough: 0.5});
  solid(P.fc.obj, box(0.2, 0.025, 0.2), '#1E2A4A', {rough: 0.5});
  solid(P.fc.obj, box(0.07, 0.03, 0.07), '#15171B', {y: 0.01});
  solid(P.rx.obj, box(0.08, 0.03, 0.12), '#15171B');
  solid(P.rx.obj, yCyl(0.006, 0.2, 6), '#E9E4D8', {y: 0.1, z: -0.05});
  solid(P.battery.obj, box(0.42, 0.1, 0.18), '#3A3F47', {rough: 0.5});
  solid(P.battery.obj, box(0.12, 0.102, 0.182), '#E3B341', {rough: 0.5});

  const M = new THREE.Matrix4();
  const rot = new THREE.Matrix4();
  for (const p of Object.values(P)) p.pose = M;
  const c0 = at(0, 0.25);
  const tip = c0.clone();
  const [pos, vel, acc] = [V(), V(), V()];
  let w = 0;
  let spin = 0;
  return {
    parts: P,
    tip,
    driveY: 1.25,
    run: ({dt, now, on, target}) => {
      w += ((on ? 55 : 0) - w) * Math.min(1, dt * 2);
      spin += w * dt;
      for (const s of spinners) s.g.rotation.y = s.dir * spin;
      // bám điểm đích bằng lò xo – giảm chấn; thân nghiêng theo gia tốc ngang như drone thật: a = g·tanθ
      if (on) acc.set(target ? target.x - C.x : 0, 1 + 0.04 * Math.sin(now / 400), target ? target.z - C.z : 0);
      else acc.set(0, 0, 0);
      acc.sub(pos).multiplyScalar(8).addScaledVector(vel, -5).clampLength(0, 8);
      pos.addScaledVector(vel.addScaledVector(acc, dt), dt);
      tip.copy(c0).add(pos);
      M.makeTranslation(tip.x, tip.y, tip.z).multiply(rot.makeRotationX(Math.atan2(acc.z, 9.8))).multiply(rot.makeRotationZ(-Math.atan2(acc.x, 9.8))).multiply(tmp.makeTranslation(-c0.x, -c0.y, -c0.z));
      const ah = Math.hypot(acc.x, acc.z);
      if (on) return `Độ cao ${pos.y.toFixed(2)} m · nghiêng ${Math.round((Math.atan2(ah, 9.8) * 180) / Math.PI)}° · gia tốc ngang ${ah.toFixed(1)} m/s²\nNghiêng góc θ thì gia tốc ngang a = g·tanθ. Chụm tay rồi kéo để dẫn drone`;
    },
  };
}

// ------------------------------------------------------------------ máy tính để bàn (thùng máy đặt nằm, mở nắp hông)
export function buildPC(scene: THREE.Scene): Model {
  const shell = {metal: 0.5, rough: 0.5};
  solid(scene, box(2.0, 0.04, 1.6), '#1E2228', {...shell, x: C.x, y: 0.02, z: C.z});
  for (const s of [-1, 1]) {
    solid(scene, box(2.0, 0.4, 0.04), '#1E2228', {...shell, x: C.x, y: 0.2, z: C.z + s * 0.8});
    solid(scene, box(0.04, 0.4, 1.6), '#1E2228', {...shell, x: C.x + s * 1.0, y: 0.2, z: C.z});
  }
  const P: Record<string, Built> = {
    mainboard: part(scene, at(0.35, 0.06), V(2.5, 0.03, -1.0)),
    cpu: part(scene, at(0.35, 0.095, -0.3), V(-0.5, 0.02, 0.7)),
    cooler: part(scene, at(0.35, 0.25, -0.3), V(-1.2, 0.15, 0.7)),
    ram: part(scene, at(0.72, 0.15, -0.3), V(0.1, 0.08, 0.7)),
    ssd: part(scene, at(0.25, 0.085, 0.3), V(0.7, 0.02, 0.7)),
    gpu: part(scene, at(0.25, 0.2, 0.3), V(-2.1, 0.08, 0.7)),
    psu: part(scene, at(-0.68, 0.19, 0.4), V(-3.1, 0.16, 0.7)),
    cable: part(scene, at(-0.3, 0.3, 0.1), V(1.6, 0.12, 0.7)),
    panel: part(scene, at(0, 0.42), V(-3.4, 0.02, -1.3)),
  };
  const leds: THREE.MeshStandardMaterial[] = [];
  const fans: THREE.Group[] = [];
  const fan = (parent: THREE.Object3D, r: number, x: number, y: number) => {
    const g = new THREE.Group();
    g.position.set(x, y, 0);
    g.userData.keep = true;
    g.userData.fanR = r;
    parent.add(g);
    solid(g, yCyl(r, 0.02, 24), '#15171B', {rough: 0.5});
    for (let i = 0; i < 3; i++) solid(g, box(r * 1.8, 0.012, r * 0.3), '#E9E4D8', {y: 0.012}).rotation.y = (i * Math.PI) / 3;
    fans.push(g);
  };
  const led = (parent: THREE.Object3D, geo: THREE.BufferGeometry, x: number, y: number, z = 0) => {
    const m = solid(parent, geo, '#3A3F47', {x, y, z});
    m.userData.keep = true; // dải LED đổi màu theo thời gian: giữ lại khi chi tiết có mô hình thật
    leds.push(m.material);
  };
  solid(P.mainboard.obj, box(1.2, 0.03, 1.3), '#1B3A2B', {rough: 0.6});
  solid(P.mainboard.obj, box(0.26, 0.02, 0.26), '#9AA0A8', {...steel, y: 0.02, z: -0.3});
  for (const x of [0.335, 0.405]) solid(P.mainboard.obj, box(0.03, 0.03, 0.52), '#15171B', {x, y: 0.02, z: -0.3});
  solid(P.mainboard.obj, box(0.8, 0.03, 0.04), '#15171B', {x: -0.1, y: 0.02, z: 0.3});
  solid(P.mainboard.obj, box(0.1, 0.14, 0.5), '#9AA0A8', {...steel, x: -0.55, y: 0.07, z: -0.3});
  solid(P.cpu.obj, box(0.2, 0.02, 0.2), '#C9CED6', steel);
  solid(P.cooler.obj, box(0.3, 0.26, 0.3), '#AEB4BC', {metal: 0.7, rough: 0.35});
  fan(P.cooler.obj, 0.13, 0, 0.14);
  for (const x of [-0.035, 0.035]) {
    solid(P.ram.obj, box(0.025, 0.14, 0.5), '#23272E', {x});
    led(P.ram.obj, box(0.027, 0.02, 0.5), x, 0.08);
  }
  solid(P.ssd.obj, box(0.32, 0.012, 0.09), '#23272E');
  solid(P.ssd.obj, box(0.2, 0.014, 0.07), '#E9E4D8', {x: -0.03});
  solid(P.gpu.obj, box(0.9, 0.14, 0.34), '#2B2F36', {rough: 0.45});
  for (const x of [-0.22, 0.22]) fan(P.gpu.obj, 0.12, x, 0.075);
  led(P.gpu.obj, box(0.9, 0.03, 0.02), 0, 0.03, 0.175);
  solid(P.psu.obj, box(0.5, 0.3, 0.7), '#15171B', {rough: 0.5});
  fan(P.psu.obj, 0.16, 0, 0.155);
  solid(P.cable.obj, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-0.25, -0.02, 0.3), V(-0.05, 0.06, 0.25), V(0.2, 0.05, 0.1), V(0.4, -0.12, 0.05)]), 20, 0.03, 8), '#D9481C', {rough: 0.6});
  Object.assign(solid(P.panel.obj, box(2.0, 0.02, 1.6), '#9FD3FF', {rough: 0.1}).material, {transparent: true, opacity: 0.16});

  let w = 0;
  return {
    parts: P,
    run: ({dt, now, on}) => {
      w += ((on ? 14 : 0) - w) * Math.min(1, dt * 1.5);
      for (const f of fans) f.rotation.y += w * dt;
      for (const m of leds) {
        m.emissive.setHSL((now / 4000) % 1, 1, 0.5);
        m.emissiveIntensity = on ? 1.2 : 0;
      }
      if (on) return 'Máy đã khởi động: tự kiểm tra (POST) đạt\nQuạt CPU, card đồ hoạ và nguồn đang quay; đậy nắp để gió đi đúng hướng';
    },
  };
}
