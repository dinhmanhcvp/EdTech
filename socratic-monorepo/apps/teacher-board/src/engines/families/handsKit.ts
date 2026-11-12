import * as THREE from 'three';
import {TILT_START, glide, oneEuro, palmRoll, steadyRoll, wrapAngle, type Pt} from '../../utils/lab/hands/handTracker';
import {setLine, type Kit} from './Stage3D';

/** Đầu vào tay / chuột dùng chung cho mọi bài thực hành tay; React ghi, cảnh 3D đọc mỗi khung hình (không gây render lại). */
export interface HandsInput {
  /** hai bàn tay đã lọc, toạ độ 0–1 theo khung nhìn (x sang phải, y xuống dưới); pts rỗng = không thấy tay */
  hands: {pts: Pt[]; pinch: boolean; /** quãng ngón cái đã miết dọc ngón trỏ, cộng dồn (1 = hết chiều dài ngón) */ slide?: number}[];
  /** vẽ thêm khung xương 21 khớp; mặc định tắt vì lớp phủ đã hiện bàn tay thật từ camera */
  skeleton?: boolean;
  /** chuột / cảm ứng, toạ độ NDC (−1..1); nhấn/nhả xếp hàng, cảnh xử lí mỗi khung hình một sự kiện */
  mouse: {x: number; y: number; down: boolean; active: boolean; queue: {x: number; y: number; down: boolean}[]};
  /** cảnh gán: có vật cầm được dưới điểm này không (nếu có thì tạm khoá xoay máy quay) */
  grab: (nx: number, ny: number) => boolean;
}
export const newInput = (): HandsInput => ({hands: [{pts: [], pinch: false}, {pts: [], pinch: false}], mouse: {x: 0, y: 0, down: false, active: false, queue: []}, grab: () => false});

/** Một con trỏ: bàn tay (điểm giữa đầu ngón cái và ngón trỏ) hoặc chuột. `pressed`/`released` chỉ đúng trong một khung hình. */
export interface Ptr {
  ndc: THREE.Vector2;
  hand: boolean;
  active: boolean;
  down: boolean;
  pressed: boolean;
  released: boolean;
  /** cảnh đặt true khi con trỏ đang ở trên vật cầm được: vòng con trỏ đổi màu */
  hot: boolean;
  /** bán kính bắt vật trên màn hình (đơn vị NDC theo chiều cao); tay rộng hơn chuột */
  reach: number;
  /** quãng miết cộng dồn của tay này (chuột: luôn 0); cảnh lấy hiệu giữa hai khung hình */
  slide: number;
  /** góc xoay cổ tay (rad, xem `rollOf`); chuột: NaN */
  roll: number;
}

/**
 * Phòng thực hành bao quanh bàn (cảnh có `room: true`): sàn, tường, đèn tuýp, kệ và chân bàn.
 * `bench` = [rộng, sâu, tâm x, tâm z] của mặt bàn mà cảnh đã vẽ (mặt trên ở y = 0).
 */
export function labRoom(k: Kit, [w, d, cx, cz]: [number, number, number, number]) {
  const FLOOR = -2.6;
  const wall = cz - d / 2 - 4.5;
  const box = (sx: number, sy: number, sz: number, color: string, x: number, y: number, z: number, glow = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), new THREE.MeshStandardMaterial({color, roughness: 0.85, emissive: color, emissiveIntensity: glow}));
    m.position.set(x, y, z);
    m.receiveShadow = true;
    k.scene.add(m);
  };
  box(40, 0.1, 40, '#0D0F2C', 0, FLOOR - 0.05, 0);
  const tiles = new THREE.GridHelper(40, 40, '#2A2E66', '#1F2352');
  tiles.position.y = FLOOR + 0.01;
  k.scene.add(tiles);
  box(40, 14, 0.2, '#12143A', 0, FLOOR + 7, wall);
  for (const sx of [-1, 1]) box(0.2, 14, 40, '#0F1132', cx + sx * 11, FLOOR + 7, 0);
  // đèn tuýp và kệ dụng cụ trên tường sau
  for (const sx of [-1, 0, 1]) box(3.2, 0.12, 0.1, '#DCEBFF', cx + sx * 4.6, 5.2, wall + 0.15, 1.6);
  box(9, 0.1, 0.7, '#3A3E7A', cx, 2.2, wall + 0.4);
  ['#D9481C', '#E3B341', '#2F6FD0', '#2E9B57', '#C9CED6'].forEach((c, i) => box(0.7, 0.5 + (i % 2) * 0.3, 0.5, c, cx - 3.2 + i * 1.6, 2.5 + (i % 2) * 0.15, wall + 0.4));
  // khung và chân bàn
  box(w - 0.3, 0.3, d - 0.3, '#2A2D5C', cx, -0.27, cz);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.22, -FLOOR - 0.4, 0.22, '#2A2D5C', cx + sx * (w / 2 - 0.35), (FLOOR - 0.4) / 2, cz + sz * (d / 2 - 0.35));
}

const BONES = [0, 1, 1, 2, 2, 3, 3, 4, 0, 5, 5, 6, 6, 7, 7, 8, 5, 9, 9, 10, 10, 11, 11, 12, 9, 13, 13, 14, 14, 15, 15, 16, 13, 17, 17, 18, 18, 19, 19, 20, 0, 17];

/** Hai bàn tay ảo (21 khớp) + vòng con trỏ, vẽ trên mặt phẳng cao `h`; trả ba con trỏ (tay 0, tay 1, chuột). */
export function handPointers(k: Kit, input: HandsInput, h: number) {
  const overlay = {depthTest: false, transparent: true};
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const v2 = new THREE.Vector2();
  const v3 = new THREE.Vector3();
  const m4 = new THREE.Matrix4();
  const onPlane = (nx: number, ny: number, y: number, out: THREE.Vector3) => {
    ray.setFromCamera(v2.set(nx, ny), k.camera);
    plane.constant = -y;
    return ray.ray.intersectPlane(plane, out) ?? out.set(0, y, 0);
  };
  const gfx = [0, 1, 2].map((i) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.018, 10, 32).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({color: '#FBF9F4', ...overlay}));
    ring.renderOrder = 5;
    ring.visible = false;
    k.scene.add(ring);
    if (i === 2) return {ring, joints: null, bones: null, pts: [] as THREE.Vector3[], seen: false, gl: [] as ReturnType<typeof glide>[], src: null as Pt[] | null, t: 0};
    const joints = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshBasicMaterial({color: '#E8E6F5', opacity: 0.9, ...overlay}), 21);
    const bones = k.line('#E8E6F5', 4, new Array(BONES.length * 3).fill(0), true);
    joints.renderOrder = bones.renderOrder = 4;
    joints.frustumCulled = false;
    Object.assign(bones.material, {depthTest: false, transparent: true, opacity: 0.6});
    joints.visible = bones.visible = false;
    k.scene.add(joints, bones);
    return {ring, joints, bones, pts: [] as THREE.Vector3[], seen: false, gl: Array.from({length: 42}, () => glide()), src: null as Pt[] | null, t: 0};
  });
  const ptrs: Ptr[] = [0, 1, 2].map((i) => ({ndc: new THREE.Vector2(), hand: i < 2, active: false, down: false, pressed: false, released: false, hot: false, reach: i < 2 ? 0.16 : 0.07, slide: 0, roll: NaN}));
  /** khoảng cách trên MÀN HÌNH từ điểm (nx, ny) tới một điểm 3D: đúng cho cả vật nằm cao */
  const distAt = (nx: number, ny: number, pos: THREE.Vector3) => {
    v3.copy(pos).project(k.camera);
    return Math.hypot((v3.x - nx) * k.camera.aspect, v3.y - ny);
  };

  // góc nghiêng cổ tay: mẫu thưa theo camera (30 Hz) được trải đều theo thời gian thực bằng `glide` (nội suy có ngoại suy vận tốc ngắn), trên góc đã gỡ nhảy ±π
  // góc nghiêng nhiễu hơn vị trí: lọc One Euro (đứng yên thì lọc mạnh, xoay nhanh thì nhẹ) trước khi nội suy; nội suy chỉ ngoại suy rất ngắn để không khuếch đại nhiễu
  const rollGl = [0, 1, 2].map(() => glide(0.015, 16));
  const rollEuro = [0, 1, 2].map(() => oneEuro(1.2, 6));
  const rollBase = [NaN, NaN, NaN]; // góc "đứng" thích nghi chậm: bỏ trôi tay từ từ, giữ nguyên khi đang nghiêng thật
  const rollRaw = [NaN, NaN, NaN];
  const rollUnw = [0, 0, 0];
  const rollSrc: (Pt[] | null)[] = [null, null, null];
  let stepAt = performance.now();
  return {
    ptrs,
    onPlane,
    distAt,
    grabWhen(test: (nx: number, ny: number) => boolean) {
      input.grab = (nx, ny) => {
        const hit = test(nx, ny);
        if (hit) k.controls.enabled = false;
        return hit;
      };
    },
    /** gọi đầu mỗi khung hình; `ease` = hệ số trượt về đích (camera 30 khung hình/giây, màn hình 60) */
    step(ease: number) {
      void ease; // tay tự trượt bằng `glide`; tham số giữ lại cho các cảnh đang gọi
      Object.assign(input.mouse, input.mouse.queue.shift());
      const nowMs = performance.now();
      const rollDt = Math.min((nowMs - stepAt) / 1000, 0.05);
      stepAt = nowMs;
      ptrs.forEach((p, i) => {
        const g = gfx[i];
        const hand = p.hand ? input.hands[i] : null;
        const active = hand ? hand.pts.length === 21 : input.mouse.active || input.mouse.down;
        const down = active && (hand ? hand.pinch : input.mouse.down);
        if (g.joints && g.bones) {
          g.joints.visible = g.bones.visible = active && !!input.skeleton;
          if (active && hand) {
            const flat: number[] = [];
            // camera cho mẫu 30 lần/giây, màn hình vẽ 60 lần/giây: mỗi khớp trượt theo vận tốc ước lượng giữa hai mẫu (xem `glide`)
            const now = performance.now() / 1000;
            const dt = Math.min(now - g.t, 0.05);
            g.t = now;
            const fresh = hand.pts !== g.src || !g.seen;
            g.src = hand.pts;
            if (!g.seen) g.gl.forEach((x) => x.reset());
            hand.pts.forEach((q, j) => {
              const gx = g.gl[j * 2];
              const gy = g.gl[j * 2 + 1];
              if (fresh) {
                gx.sample(q.x, now);
                gy.sample(q.y, now);
              }
              const goal = onPlane(gx.at(now, dt) * 2 - 1, 1 - gy.at(now, dt) * 2, h, v3);
              g.pts[j] = (g.pts[j] ?? new THREE.Vector3()).copy(goal);
              g.joints!.setMatrixAt(j, m4.makeTranslation(g.pts[j].x, g.pts[j].y, g.pts[j].z));
            });
            g.joints.instanceMatrix.needsUpdate = true;
            for (const b of BONES) flat.push(g.pts[b].x, g.pts[b].y, g.pts[b].z);
            setLine(g.bones, flat);
            v3.copy(g.pts[4]).lerp(g.pts[8], 0.5).project(k.camera);
            p.ndc.set(v3.x, v3.y);
          }
          g.seen = active;
        } else p.ndc.set(input.mouse.x, input.mouse.y);
        p.pressed = down && !p.down;
        p.released = !down && p.down;
        p.down = down;
        p.active = active;
        p.slide = hand?.slide ?? 0;
        // góc cổ tay mẫu thưa theo camera (30 Hz): lọc mũ theo thời gian thực, đi theo đường ngắn nhất qua mốc ±π
        if (hand && hand.pts.length === 21) {
          const nowS = performance.now() / 1000;
          if (hand.pts !== rollSrc[i]) {
            rollSrc[i] = hand.pts;
            const pr = palmRoll(hand.pts);
            const target = Number.isNaN(pr) ? steadyRoll(hand.pts) : pr;
            if (Number.isNaN(rollRaw[i])) {
              rollUnw[i] = target;
              rollGl[i].reset();
              rollEuro[i] = oneEuro(1.2, 6);
              rollBase[i] = target;
            } else rollUnw[i] += wrapAngle(target - rollRaw[i]);
            rollRaw[i] = target;
            rollGl[i].sample(rollEuro[i](rollUnw[i], nowS), nowS);
          }
          const abs = rollGl[i].at(nowS, rollDt);
          // góc so với tư thế đứng: trôi chậm (dưới ngưỡng nghiêng) được hấp thụ với hằng thời gian 3 s, đang nghiêng thì giữ nguyên
          if (Math.abs(abs - rollBase[i]) < TILT_START * 0.9) rollBase[i] += (abs - rollBase[i]) * (1 - Math.exp(-rollDt / 3));
          p.roll = abs - rollBase[i];
        } else {
          rollRaw[i] = NaN;
          rollSrc[i] = null;
          rollBase[i] = NaN;
          p.roll = NaN;
        }
        if (!p.hand && p.released) k.controls.enabled = true;
        g.ring.visible = active && p.hand;
        g.ring.position.copy(onPlane(p.ndc.x, p.ndc.y, h, v3));
        g.ring.scale.setScalar(down ? 0.6 : 1);
        g.ring.material.color.set(p.hot ? '#D9481C' : '#FBF9F4');
        p.hot = false;
      });
    },
  };
}

/** Thanh trượt 3D kéo bằng tay: mỗi tham số là một ray có con trượt; trả `grab` (cho input.grab) và `step` (gọi mỗi khung hình). */
export function handSliders(
  k: Kit,
  P: ReturnType<typeof handPointers>,
  params: {id: string; label: string; t: number}[],
  origin: [number, number],
  write: (id: string, t: number) => void,
  text: (id: string) => string,
) {
  const LEN = 2.6;
  const rigs = params.map((p, i) => {
    const z = origin[1] + i * 0.5;
    const rail = solid3(k, new THREE.BoxGeometry(LEN + 0.3, 0.05, 0.1), '#3A3E7A', origin[0] + LEN / 2, 0.06, z);
    const handle = solid3(k, new THREE.CylinderGeometry(0.11, 0.11, 0.14, 24), '#E3B341', origin[0], 0.13, z);
    const tag = k.label(p.label);
    return {id: p.id, z, rail, handle, tag};
  });
  const pos = new THREE.Vector3();
  const held: (string | null)[] = P.ptrs.map(() => null);
  const slid = P.ptrs.map((p) => p.slide);
  let sel: string | undefined = params[0]?.id;
  const near = (nx: number, ny: number, reach: number) => {
    let best: string | null = null;
    let bd = reach;
    for (const r of rigs) {
      const d = P.distAt(nx, ny, pos.copy(r.handle.position));
      if (d < bd) {
        bd = d;
        best = r.id;
      }
    }
    return best;
  };
  const v3 = new THREE.Vector3();
  return {
    grab: (nx: number, ny: number) => near(nx, ny, 0.07) !== null,
    step(t: Record<string, number>) {
      P.ptrs.forEach((ptr, n) => {
        const hover = ptr.active && !held[n] ? near(ptr.ndc.x, ptr.ndc.y, ptr.reach) : null;
        if (ptr.pressed && hover) held[n] = hover;
        if (ptr.released || !ptr.active) held[n] = null;
        const id = held[n];
        // vi cử chỉ: ngón cái miết dọc ngón trỏ chỉnh tinh thanh trượt vừa cầm gần nhất (con trượt cam), tay không phải rời chỗ
        const d = ptr.slide - slid[n];
        slid[n] = ptr.slide;
        if (id) {
          sel = id;
          write(id, Math.min(1, Math.max(0, (P.onPlane(ptr.ndc.x, ptr.ndc.y, 0.13, v3).x - origin[0]) / LEN)));
        } else if (d && sel) write(sel, Math.min(1, Math.max(0, (t[sel] ?? 0) + d)));
        ptr.hot = !!(id ?? hover) || d !== 0;
      });
      for (const r of rigs) {
        r.handle.material.color.set(r.id === sel ? '#D9481C' : '#E3B341');
        r.handle.position.x = origin[0] + (t[r.id] ?? 0) * LEN;
        r.tag(v3.set(origin[0] + LEN + 1.1, 0.1, r.z + 0.12), undefined, `${params.find((p) => p.id === r.id)!.label}: ${text(r.id)}`);
      }
    },
  };
}
function solid3(k: Kit, geo: THREE.BufferGeometry, color: string, x: number, y: number, z: number) {
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color, metalness: 0.2, roughness: 0.5}));
  m.position.set(x, y, z);
  m.castShadow = true;
  k.scene.add(m);
  return m;
}
