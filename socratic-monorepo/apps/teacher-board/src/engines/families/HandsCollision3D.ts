import * as THREE from 'three';
import {GATES, S, TRACK, pullOf, settled, speedOf, startRun, step as stepRun, type Run} from '../../utils/lab/hands/sims/airtrack';
import type {SimLive} from './HandsSims3D';
import {handPointers} from './handsKit';
import {solid} from './handsModels';
import {dress, loadModel, partOf, place, type Skin} from './labParts';
import type {Kit} from './Stage3D';

/**
 * Bài va chạm trên đệm khí, thao tác như trên bàn thật (không thanh trượt, không ổ lắp ở mép bàn):
 * - nhấc quả cân đĩa 100 g ở giá, đặt LÊN XE đang nằm trên băng (chồng vào chốt của xe, tối đa 4 quả); nhấc ra để bớt;
 * - gắn đệm (đất sét / cao su / lò xo) vào đầu xe 2;
 * - cầm đuôi xe 1 kéo lùi để chọn độ nén lò xo, rồi bấm NÚT THẢ XE ở góc bàn (cầm xe để bắn thì dễ nhấc nhầm quả cân): hai cổng quang điện đo vận tốc trước và sau va chạm.
 * Động học chạy theo thời gian thực bằng `sims/airtrack.ts`; các tham số m₁, m₂, e, v₁ của bài được suy ra từ chính những gì đang đặt trên băng.
 */
const ZT = -0.9; // trục băng đệm khí
const CART_Y = 0.51;
const STAND: [number, number] = [-1.6, 1.25];
const BUMP_X = [0.9, 1.6, 2.3];
const BUMPERS = [
  {e: 0, name: 'Đất sét', color: '#B5835A'},
  {e: 0.5, name: 'Cao su', color: '#2459C9'},
  {e: 1, name: 'Lò xo thép', color: '#C9CED6'},
];
const WALL_FACE = -3.43;
const count = (m: number) => Math.min(4, Math.max(0, Math.round((m - 0.1) / 0.1)));

export function collisionLab({k, P, live}: {k: Kit; P: ReturnType<typeof handPointers>; live: SimLive}) {
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const plain: THREE.Object3D[] = [solid(k.scene, new THREE.BoxGeometry(7.2, 0.12, 0.5), '#8A93A0', {metal: 0.7, rough: 0.3, y: 0.3, z: ZT})];
  const carts = ['#2F6FD0', '#D9481C'].map((c) => solid(k.scene, new THREE.BoxGeometry(0.6, 0.3, 0.4), c, {y: CART_Y, z: ZT}));
  const discs = Array.from({length: 8}, () => solid(k.scene, new THREE.CylinderGeometry(0.14, 0.14, 0.06, 24), '#C9A24B', {metal: 0.9, rough: 0.3}));
  const bumps = BUMPERS.map((b) => solid(k.scene, new THREE.BoxGeometry(0.09, 0.14, 0.28), b.color, {rough: 0.6}));
  const spring = solid(k.scene, new THREE.CylinderGeometry(0.08, 0.08, 1, 12).rotateZ(Math.PI / 2).translate(0.5, 0, 0), '#B9BEC5', {metal: 0.8, x: WALL_FACE, y: CART_Y - 0.08, z: ZT});
  plain.push(solid(k.scene, new THREE.BoxGeometry(1.0, 0.04, 0.45), '#7A5C3A', {x: STAND[0], y: 0.02, z: STAND[1]}));
  k.label('Quả cân 100 g: nhấc lên, đặt vào xe')(V(STAND[0], 0.12, STAND[1] + 0.5));
  k.label('Đệm va chạm: gắn vào đầu xe 2')(V(BUMP_X[1], 0.12, STAND[1] + 0.5));
  BUMPERS.forEach((b, i) => k.label(b.name)(V(BUMP_X[i], 0.45, STAND[1] + 0.05)));
  k.label('Lò xo bắn: kéo đuôi xe 1 lùi để nén')(V(-3.0, 1.15, ZT - 0.55));
  // nút thả xe đặt xa băng: cầm xe thì dễ nhấc nhầm quả cân đang nằm trên nó
  const BTN = V(-3.3, 0.1, 1.25);
  solid(k.scene, new THREE.CylinderGeometry(0.3, 0.34, 0.08, 28), '#2A2E66', {x: BTN.x, y: 0.04, z: BTN.z});
  const btn = solid(k.scene, new THREE.CylinderGeometry(0.2, 0.2, 0.1, 28), '#2E9B57', {x: BTN.x, y: 0.12, z: BTN.z});
  const btnTag = k.label('Nút thả xe');
  const gateTags = GATES.map((x, i) => {
    plain.push(solid(k.scene, new THREE.BoxGeometry(0.07, 0.95, 0.07), '#22252B', {x, y: 0.5, z: ZT - 0.44}));
    plain.push(solid(k.scene, new THREE.BoxGeometry(0.07, 0.95, 0.07), '#22252B', {x, y: 0.5, z: ZT + 0.44}));
    return k.label(`Cổng quang ${i + 1}`);
  });
  const tags = [k.label('Xe 1'), k.label('Xe 2')];

  let springSkin: Skin | null = null;
  loadModel('/models/phys-parts.glb')
    .then((lib) => {
      place(k.scene, lib, 'AirTrack', [0, 0, ZT], [plain[0]]);
      carts.forEach((c, i) => dress(c, partOf(lib, 'Glider'))?.mats.find((m) => m.name === 'tint')?.color.set(i ? '#D9481C' : '#2F6FD0'));
      discs.forEach((d) => {
        const sk = dress(d, partOf(lib, 'Disc'));
        if (sk) sk.obj.position.y = -0.03; // mô hình có gốc ở đáy, vật thay thế có gốc ở tâm
      });
      bumps.forEach((b, i) => dress(b, partOf(lib, 'Bumper'))?.mats.find((m) => m.name === 'tint')?.color.set(BUMPERS[i].color));
      springSkin = dress(spring, partOf(lib, 'Spring'));
      GATES.forEach((x, i) => place(k.scene, lib, 'PhotoGate', [x, 0, ZT], [plain[2 + i * 2], plain[3 + i * 2]]));
      place(k.scene, lib, 'WeightStand', [STAND[0], 0, STAND[1]], [plain[1]]);
    })
    .catch(() => undefined);

  type Mode = 'idle' | 'run' | 'done';
  let mode: Mode = 'idle';
  let run: Run | null = null;
  let seen = {start: live.events.start ?? 0, stop: live.events.stop ?? 0};
  let pullX: number | null = null; // xe 1 đang được cầm kéo tới vị trí này
  type Held = {kind: 'disc'; j: number} | {kind: 'bump'; i: number} | {kind: 'cart'} | {kind: 'btn'};
  const held: (Held | null)[] = P.ptrs.map(() => null);
  const pos = V();
  const v3 = V();
  const cartX = (): [number, number] => (run && mode !== 'idle' ? [run.x1, run.x2] : [pullX ?? TRACK.rest - pullOf(live.v.v1), TRACK.x2]);
  const bumpOn = () => BUMPERS.reduce((best, b, i) => (Math.abs(b.e - live.v.e) < Math.abs(BUMPERS[best].e - live.v.e) ? i : best), 0);
  /** quả cân thứ j đang ở đâu: 0 / 1 = trên xe (kèm tầng), −1 = trên giá */
  const discAt = (j: number): {cart: number; slot: number} => {
    const n1 = count(live.v.m1);
    const n2 = count(live.v.m2);
    return j < n1 ? {cart: 0, slot: j} : j < n1 + n2 ? {cart: 1, slot: j - n1} : {cart: -1, slot: j - n1 - n2};
  };
  const discHome = (j: number, xs: [number, number]) => {
    const a = discAt(j);
    if (a.cart >= 0) return pos.set(xs[a.cart], CART_Y - 0.105 + a.slot * 0.06 + 0.03, ZT);
    return pos.set(STAND[0] + (a.slot % 2 ? 0.25 : -0.25), 0.07 + Math.floor(a.slot / 2) * 0.06, STAND[1]);
  };
  /** xe nào nằm dưới con trỏ (theo hình trên màn hình, rộng rãi để tay dễ thả) */
  const cartUnder = (nx: number, ny: number, xs: [number, number]): number => {
    let best = -1;
    let bd = 0.24;
    xs.forEach((x, i) => {
      const d = P.distAt(nx, ny, v3.set(x, CART_Y + 0.15, ZT));
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    return best;
  };
  const launch = () => {
    run = startRun(live.v.m1, live.v.m2, live.v.v1, live.v.e);
    mode = 'run';
  };
  const reset = () => {
    run = null;
    mode = 'idle';
  };
  const hit = (nx: number, ny: number, reach: number): Held | null => {
    if (P.distAt(nx, ny, BTN) < reach) return {kind: 'btn'};
    if (mode === 'run') return null;
    const xs = cartX();
    let best: Held | null = null;
    let bd = reach;
    const tryAt = (p: THREE.Vector3, h: Held) => {
      const d = P.distAt(nx, ny, p);
      if (d < bd) {
        bd = d;
        best = h;
      }
    };
    discs.forEach((d, j) => tryAt(d.position, {kind: 'disc', j}));
    bumps.forEach((b, i) => tryAt(b.position, {kind: 'bump', i}));
    tryAt(v3.set(xs[0] - 0.3, CART_Y - 0.12, ZT), {kind: 'cart'}); // cầm ở đuôi xe, phía lò xo: không trùng chỗ quả cân
    return best;
  };

  return {
    grab: (nx: number, ny: number) => hit(nx, ny, 0.07) !== null,
    step(now: number, dt: number): string {
      // nút dự phòng ở bảng điều khiển: thả xe / đưa xe về vạch
      if ((live.events.start ?? 0) !== seen.start && mode !== 'run') launch();
      if ((live.events.stop ?? 0) !== seen.stop) reset();
      seen = {start: live.events.start ?? 0, stop: live.events.stop ?? 0};
      if (run && mode === 'run') {
        for (let i = 0; i < 4; i++) stepRun(run, dt / 4);
        if (settled(run)) mode = 'done';
      }
      const xs = cartX();
      let hint = '';

      P.ptrs.forEach((ptr, n) => {
        const h = ptr.active && !held[n] ? hit(ptr.ndc.x, ptr.ndc.y, ptr.reach) : null;
        if (ptr.pressed && h) {
          held[n] = h;
          if (h.kind === 'btn') {
            if (mode === 'done') reset();
            else if (mode === 'idle') launch();
          }
          if (h.kind === 'cart') {
            if (mode === 'done') reset();
            pullX = cartX()[0];
          }
        }
        const cur = held[n];
        if (cur && (ptr.released || !ptr.active)) {
          if (cur.kind === 'disc') {
            const from = discAt(cur.j).cart;
            const to = ptr.active ? cartUnder(ptr.ndc.x, ptr.ndc.y, xs) : -1;
            const key = (c: number) => (c === 0 ? 'm1' : 'm2');
            if (to !== from) {
              const room = to < 0 || count(live.v[key(to)]) < 4;
              if (room) {
                if (from >= 0) live.set(key(from), Math.max(0.1, live.v[key(from)] - 0.1));
                if (to >= 0) live.set(key(to), Math.min(0.5, live.v[key(to)] + 0.1));
              }
            }
          } else if (cur.kind === 'btn') {
            /* bấm đã xử lí lúc nhấn */
          } else if (cur.kind === 'bump') {
            if (ptr.active && cartUnder(ptr.ndc.x, ptr.ndc.y, xs) >= 0) live.set('e', BUMPERS[cur.i].e);
          } else {
            pullX = null; // xe được chốt giữ ở độ nén vừa chọn; bấm nút mới thả
          }
          held[n] = null;
        }
        const nowHeld = held[n];
        if (nowHeld?.kind === 'cart') {
          const at = P.onPlane(ptr.ndc.x, ptr.ndc.y, CART_Y, v3);
          pullX = Math.min(TRACK.rest - 0.02, Math.max(TRACK.rest - TRACK.maxPull, at.x));
          live.set('v1', Math.round(speedOf(TRACK.rest - pullX) * 100) / 100);
          hint = `Đang nén lò xo: v₁ ≈ ${live.v.v1.toFixed(2)} m/s. Buông tay, xe được chốt giữ; bấm nút xanh để thả`;
        } else if (nowHeld?.kind === 'disc') {
          const to = cartUnder(ptr.ndc.x, ptr.ndc.y, xs);
          hint = to >= 0 ? `Thả tay để đặt quả cân lên xe ${to + 1}` : 'Đưa quả cân tới trên một chiếc xe rồi thả tay (thả chỗ khác thì quả cân về giá)';
        } else if (nowHeld?.kind === 'bump') hint = cartUnder(ptr.ndc.x, ptr.ndc.y, xs) >= 0 ? `Thả tay để gắn đệm ${BUMPERS[nowHeld.i].name.toLowerCase()} vào đầu xe 2` : 'Đưa đệm tới xe rồi thả tay';
        ptr.hot = !!(nowHeld ?? h);
      });

      // ---- vẽ
      btn.position.y = held.some((h) => h?.kind === 'btn') ? 0.08 : 0.12;
      btn.material.color.set(mode === 'done' ? '#C4261A' : '#2E9B57');
      btnTag(pos.set(BTN.x, 0.6, BTN.z), undefined, mode === 'done' ? 'Bấm: đưa xe về vạch' : mode === 'run' ? 'Xe đang chạy' : 'Bấm: thả xe');
      carts.forEach((c, i) => c.position.set(xs[i], CART_Y, ZT));
      const len = Math.min(xs[0], TRACK.rest) - 0.31 - WALL_FACE;
      spring.scale.x = Math.max(0.05, len);
      void springSkin;
      const on = bumpOn();
      discs.forEach((d, j) => {
        const g = held.findIndex((h) => h?.kind === 'disc' && h.j === j);
        if (g >= 0) d.position.lerp(P.onPlane(P.ptrs[g].ndc.x, P.ptrs[g].ndc.y, 0.95, v3), 0.5);
        else d.position.lerp(discHome(j, xs), discAt(j).cart >= 0 ? 0.75 : 0.25);
      });
      bumps.forEach((b, i) => {
        const g = held.findIndex((h) => h?.kind === 'bump' && h.i === i);
        if (g >= 0) {
          b.position.lerp(P.onPlane(P.ptrs[g].ndc.x, P.ptrs[g].ndc.y, 0.9, v3), 0.5);
          b.rotation.y = 0;
        } else if (i === on) {
          b.position.lerp(pos.set(xs[1] - 0.31, CART_Y - 0.1, ZT), 0.75);
          b.rotation.y = Math.PI; // mặt đệm quay về phía xe 1 lao tới
        } else {
          b.position.lerp(pos.set(BUMP_X[i], 0.09, STAND[1]), 0.25);
          b.rotation.y = 0;
        }
      });
      const vel = run && mode !== 'idle' ? [run.v1 / S, run.v2 / S] : [0, 0];
      carts.forEach((c, i) => tags[i](pos.set(c.position.x, CART_Y + 0.75, ZT), undefined, `Xe ${i + 1}: ${(i ? live.v.m2 : live.v.m1).toFixed(1)} kg · ${vel[i].toFixed(2)} m/s`));
      GATES.forEach((x, i) => {
        const g = run?.gates[i];
        gateTags[i](pos.set(x, 1.45, ZT), undefined, g ? `Cổng ${i + 1}: xe ${g.cart} ${g.dir > 0 ? '→' : '←'} ${g.v.toFixed(2)} m/s` : `Cổng quang ${i + 1}`);
      });
      if (hint) return `${hint}\nThao tác trực tiếp trên băng đệm khí`;
      if (mode === 'idle') return `Xe 1 ${live.v.m1.toFixed(1)} kg, xe 2 ${live.v.m2.toFixed(1)} kg, đệm ${BUMPERS[on].name.toLowerCase()} (e = ${BUMPERS[on].e})\nĐặt quả cân lên xe, gắn đệm, rồi bấm nút xanh để thả xe (kéo đuôi xe 1 lùi để đổi độ nén lò xo)`;
      const a = run?.after;
      if (!a) return `Xe 1 đang lao tới với v₁ = ${live.v.v1.toFixed(2)} m/s\nCổng quang 1 đo vận tốc trước va chạm`;
      const p0 = live.v.m1 * live.v.v1;
      const p1 = live.v.m1 * a.u1 + live.v.m2 * a.u2;
      const lost = 1 - (live.v.m1 * a.u1 ** 2 + live.v.m2 * a.u2 ** 2) / (live.v.m1 * live.v.v1 ** 2);
      return `Sau va chạm: v₁′ = ${a.u1.toFixed(2)} m/s, v₂′ = ${a.u2.toFixed(2)} m/s · động năng mất ${(lost * 100).toFixed(0)} %\nĐộng lượng trước ${p0.toFixed(3)} = sau ${p1.toFixed(3)} kg·m/s${mode === 'done' ? ' · bấm nút đỏ để đưa xe về vạch' : ''}`;
    },
  };
}
