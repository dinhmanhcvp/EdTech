import * as THREE from 'three';
import {DWELL, FASTENERS, KITS, TOOLS, canTurn, driveRev, nextMode, orderMistake, toolFor, toolMistake, type Dir, type Fastener, type ToolId} from '../../utils/lab/hands/fasteners';
import {wrapAngle} from '../../utils/lab/hands/handTracker';
import type {AssemblyLive} from './HandsAssembly3D';
import {handPointers} from './handsKit';
import {V, solid} from './handsModels';
import {loadModel, partOf} from './labParts';
import type {Kit} from './Stage3D';

/**
 * Bộ dụng cụ tháo lắp trong cảnh 3D: hộp dụng cụ (mô hình Blender `tools-parts.glb`), ốc vít / bu-lông trên từng chi tiết, khay từ đựng vít.
 * Cầm dụng cụ (chụm), đưa mũi tới đầu vít: đúng dụng cụ thì mũi tự khớp vào đầu vít. Vặn KHÔNG cần xoay cổ tay (webcam thường không có
 * độ sâu): giữ mũi trên đầu vít ~0,25 s thì tự vặn theo chiều đúng (nới / siết do trạng thái con vít); vẽ vòng tròn quanh đầu vít (ngược chiều kim
 * đồng hồ để nới, thuận để siết) thì vặn nhanh hơn. Chuột: giữ nút trên đầu vít.
 * Luật (đúng dụng cụ, thứ tự đường chéo, đủ vít mới nhấc được chi tiết) nằm ở `utils/lab/hands/fasteners.ts`.
 */
const PLUCK = 0.12; // khoảng cách trên màn hình (tới cả thân dụng cụ, không chỉ tay cầm) để chụm được dụng cụ
const SNAP = 0.085; // khoảng cách trên màn hình để mũi dụng cụ nhận một đầu vít
/** Camera thường không có độ sâu nên KHÔNG vặn bằng xoay cổ tay: giữ mũi trên đầu vít một lúc thì tự vặn, vẽ vòng tròn quanh đầu vít thì vặn nhanh hơn (`driveRev`). */
const CIRC_MIN = 0.02; // bán kính tối thiểu (màn hình) để góc quanh đầu vít còn đáng tin
const TOOL_Y = 0.55;
const TILT = 0.45;
const LIFT = 0.09; // vít nhô lên bao nhiêu khi đã nới hết
const RACK = {x0: -3.0, step: 0.62, z: 2.55, y: 0.1};
const RACK_X0 = -4.3; // mép trái / phải vùng xếp dụng cụ trên giá
const RACK_X1 = 3.6;
const RACK_GAP = 0.16; // khe giữa hai dụng cụ kề nhau
const SCALE: Record<ToolId, number> = {ph1: 0.8, ph2: 1, flat: 1, hex25: 0.75, hex4: 0.95, sock10: 1.1, sock13: 1.35, sparksock: 1.8, spanner: 1.5, puller: 1.6, pliers: 0.9, torque: 1.35};
const HEAD: Record<ToolId, 'ScrewPh' | 'BoltHex'> = {ph1: 'ScrewPh', ph2: 'ScrewPh', flat: 'ScrewPh', hex25: 'ScrewPh', hex4: 'ScrewPh', pliers: 'ScrewPh', sock10: 'BoltHex', sock13: 'BoltHex', sparksock: 'BoltHex', spanner: 'BoltHex', puller: 'BoltHex', torque: 'BoltHex'};
const LIB = '/models/tools-parts.glb';

interface ScrewRt {
  part: string;
  idx: number;
  fa: Fastener;
  anchor: THREE.Vector3; // toạ độ trong hệ chi tiết
  g: THREE.Group;
  hole: THREE.Mesh;
  prog: number;
}
interface ToolRt {
  id: ToolId;
  obj: THREE.Group;
  home: THREE.Vector3;
  homeRot: THREE.Euler;
  /** điểm nắm trong hệ dụng cụ (giữa tay cầm) */
  grip: THREE.Vector3;
  by: number;
  spin: number;
}

/** `partAt(nx, ny)`: khoảng cách màn hình tới chi tiết gần nhất (0 = ngay dưới con trỏ); chi tiết gần hơn dụng cụ thì chụm vào là cầm chi tiết, không cầm dụng cụ */
export function toolKit({k, P, live, parts, ik, partAt}: {k: Kit; P: ReturnType<typeof handPointers>; live: AssemblyLive; parts: {id: string; obj: THREE.Group}[]; ik: () => boolean; partAt?: (nx: number, ny: number) => number}) {
  const fa = FASTENERS[live.kind];
  const v3 = V();
  const v4 = V();

  // ---- giá dụng cụ và khay từ
  // giá dài gần hết mặt bàn (bàn x ∈ [−4,6; 3,8]); dụng cụ xếp theo bề rộng thật (`layoutRack`)
  solid(k.scene, new THREE.BoxGeometry(RACK_X1 - RACK_X0 + 0.3, 0.1, 0.6), '#8A5B35', {rough: 0.6, x: (RACK_X0 + RACK_X1) / 2, y: 0.05, z: RACK.z});
  // nhãn ở mép trước bàn, dưới giá: không che dụng cụ
  k.label('Hộp dụng cụ: chụm để cầm, chọn đúng cỡ')(V(RACK_X0 + 1.2, -0.75, RACK.z + 0.45));
  // khay từ nằm TRONG mặt bàn (bàn x ≤ 3,8; z ≤ 2,9), sau đầu phải giá dụng cụ (giá z ≥ 2,25): trước đây ở (3,2; RACK.z) chìa ra ngoài mép bàn và đè lên giá
  const DISH_S = 0.8;
  const dish = V(3.3, 0.02, 1.35); // lùi xa giá để dụng cụ dựng đứng ở cuối giá không che khay
  const dishPlain = solid(k.scene, new THREE.CylinderGeometry(0.5 * DISH_S, 0.42 * DISH_S, 0.14 * DISH_S, 28), '#B9BEC5', {metal: 0.8, rough: 0.35, x: dish.x, y: 0.07 * DISH_S, z: dish.z});
  const looseTag = k.label('');
  const bowl = Array.from({length: 24}, (_, i) => {
    const a = i * 2.4;
    const r = (0.06 + ((i * 37) % 10) * 0.035) * DISH_S;
    const m = solid(k.scene, new THREE.CylinderGeometry(0.035, 0.035, 0.05, 8), '#C9CED6', {metal: 0.9, rough: 0.3, x: dish.x + Math.cos(a) * r, y: 0.15, z: dish.z + Math.sin(a) * r});
    m.rotation.set(Math.random(), 0, Math.random());
    m.visible = false;
    return m;
  });

  // ---- dụng cụ
  const kit = KITS[live.kind];
  let xCursor = RACK.x0;
  const tools: ToolRt[] = kit.map((id) => {
    const spec = TOOLS[id];
    const obj = new THREE.Group();
    const flat = spec.shape === 'flat';
    const home = V(xCursor + (flat ? 0.2 : 0), RACK.y, flat ? RACK.z - 0.1 : RACK.z);
    xCursor += flat ? 2.0 : RACK.step;
    const homeRot = new THREE.Euler(0, flat ? Math.PI / 2 : 0, 0);
    obj.position.copy(home);
    obj.rotation.copy(homeRot);
    k.scene.add(obj);
    const ph = solid(obj, new THREE.CylinderGeometry(0.05, 0.05, flat ? 0.05 : 1.2, 10), '#8B91B8', {y: flat ? 0.03 : 0.6});
    if (flat) ph.rotation.x = Math.PI / 2;
    return {id, obj, home, homeRot, grip: flat ? V(0, 0.03, 1.0) : id === 'puller' ? V(0, 0.7, 0) : id === 'pliers' ? V(0, 0.95, 0) : V(0, 0.95, 0), by: -1, spin: 0};
  });
  const labelOf = new Map<ToolId, ReturnType<typeof k.label>>(tools.map((t) => [t.id, k.label(TOOLS[t.id].name)]));
  /**
   * Xếp dụng cụ trên giá theo hộp bao THẬT của từng mô hình (cờ lê, cần tự động, cờ lê lực dài gấp mấy lần tua vít): trước đây cách đều 0,62
   * nên các dụng cụ nằm ngang đè lên nhau. Không đủ chỗ thì thu nhỏ đều cả bộ. Chạy lại khi mô hình Blender về.
   */
  const layoutRack = () => {
    if (tools.some((t) => t.by >= 0)) return; // đang cầm: không xếp lại dưới tay người dùng
    const box = new THREE.Box3();
    const ext = tools.map((t) => {
      t.obj.position.set(0, RACK.y, 0);
      t.obj.rotation.copy(t.homeRot);
      t.obj.scale.setScalar(1);
      t.obj.updateMatrixWorld(true);
      box.setFromObject(t.obj);
      // tua vít dựng đứng chỉ rộng bằng cán trên trục x nhưng nhìn nghiêng thì chiếm chỗ hơn: tối thiểu 0,34
      const w = box.max.x - box.min.x;
      return {w: Math.max(0.34, w), minX: box.min.x - Math.max(0, 0.34 - w) / 2, cz: (box.min.z + box.max.z) / 2};
    });
    const total = ext.reduce((a, e) => a + e.w, 0) + RACK_GAP * (tools.length - 1);
    const s = Math.min(1, (RACK_X1 - RACK_X0) / total);
    let x = RACK_X0 + ((RACK_X1 - RACK_X0) - total * s) / 2;
    tools.forEach((t, i) => {
      const e = ext[i];
      t.home.set(x - e.minX * s, RACK.y, RACK.z - e.cz * s);
      t.obj.scale.setScalar(s);
      t.obj.position.copy(t.home);
      x += (e.w + RACK_GAP) * s;
    });
  };
  layoutRack();

  // ---- ốc vít trên từng chi tiết (đặt trên mặt trên của hộp bao chi tiết, theo vòng quanh để thứ tự đường chéo có nghĩa)
  const screws: ScrewRt[] = [];
  /** vị trí các con vít của một nhóm trên mặt trên của hộp bao `root` (toạ độ hệ chi tiết), xếp vòng quanh để thứ tự đường chéo có nghĩa */
  const anchorsOf = (p: {obj: THREE.Group}, f: Fastener, root: THREE.Object3D): THREE.Vector3[] => {
    p.obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    box.applyMatrix4(new THREE.Matrix4().copy(p.obj.matrixWorld).invert());
    const c = box.getCenter(V());
    const s = box.getSize(V());
    const ring: [number, number][] = f.count === 1 ? [[0, 0]] : f.count === 2 ? [[-1, 0], [1, 0]] : f.count === 4 ? [[-1, -1], [1, -1], [1, 1], [-1, 1]] : [[-1, -1], [0, -1], [1, -1], [1, 1], [0, 1], [-1, 1]];
    return Array.from({length: f.count}, (_, i) => {
      const [ux, uz] = ring[i % ring.length];
      return V(c.x + ux * Math.min(0.42, Math.max(0.06, s.x * 0.28)), box.max.y + 0.01, c.z + uz * Math.min(0.32, Math.max(0.06, s.z * 0.28)));
    });
  };
  for (const p of parts) {
    const f = fa[p.id];
    if (!f) continue;
    anchorsOf(p, f, p.obj).forEach((anchor, i) => {
      const g = new THREE.Group();
      g.position.copy(anchor);
      g.scale.setScalar(SCALE[f.tool]);
      g.userData.keep = true; // không bị ẩn khi chi tiết được mặc mô hình thật (HandsMachines)
      p.obj.add(g);
      solid(g, new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12), '#C9CED6', {metal: 0.9, rough: 0.3, y: 0.02});
      const hole = new THREE.Mesh(new THREE.TorusGeometry(0.06 * SCALE[f.tool], 0.012, 8, 20).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({color: '#7FD4FF', transparent: true, opacity: 0.9, depthTest: false}));
      hole.position.copy(anchor);
      hole.renderOrder = 4;
      hole.visible = false;
      hole.userData.keep = true;
      p.obj.add(hole);
      screws.push({part: p.id, idx: i, fa: f, anchor, g, hole, prog: 0});
    });
  }

  // ---- mô hình Blender khi về: thay các hình khối giữ chỗ
  loadModel(LIB)
    .then((lib) => {
      for (const t of tools) {
        const sk = partOf(lib, TOOLS[t.id].model);
        if (!sk) continue;
        t.obj.clear();
        t.obj.add(sk.obj);
      }
      layoutRack();
      for (const sc of screws) {
        const sk = partOf(lib, HEAD[sc.fa.tool]);
        if (!sk) continue;
        sc.g.clear();
        sc.g.add(sk.obj);
      }
      const rack = partOf(lib, 'MagDish');
      if (rack) {
        rack.obj.position.set(dish.x, 0, dish.z);
        rack.obj.scale.setScalar(DISH_S);
        k.scene.add(rack.obj);
        dishPlain.visible = false;
      }
    })
    .catch(() => undefined);

  const eng = P.ptrs.map(() => ({lastRoll: NaN, ang: NaN, dwell: 0, spin: 0, target: null as ScrewRt | null, lock: null as ScrewRt | null, warn: '', warnAt: -1e9, sticky: false, pickAt: 0}));
  /**
   * Chiều vặn của từng chi tiết: chi tiết đang lắp sẵn chỉ được NỚI (đưa dụng cụ lướt qua con vừa nới không siết lại); chi tiết vừa đặt vào chỗ
   * chỉ được SIẾT cho tới khi siết đủ thì lại chỉ được nới. Muốn siết lại chi tiết đã nới dở: nhấc chi tiết ra rồi đặt lại.
   */
  const mode = new Map<string, Dir>();
  const wasOn = new Map<string, boolean>();
  for (const p of parts) {
    if (!fa[p.id]) continue;
    const st = live.screws[p.id] ?? [];
    mode.set(p.id, st.length && st.every(Boolean) ? 'loosen' : 'tighten');
    wasOn.set(p.id, !live.off.has(p.id));
  }
  const scr = (a: THREE.Vector3, b: THREE.Vector3) => {
    v3.copy(a).project(k.camera);
    v4.copy(b).project(k.camera);
    return Math.hypot((v3.x - v4.x) * k.camera.aspect, v3.y - v4.y);
  };
  const gripWorld = (t: ToolRt, out: THREE.Vector3) => out.copy(t.grip).multiplyScalar(t.obj.scale.x).applyEuler(t.obj.rotation).add(t.obj.position);
  const anchorWorld = (sc: ScrewRt, out: THREE.Vector3) => {
    const o = parts.find((p) => p.id === sc.part)!.obj;
    o.updateWorldMatrix(true, false);
    return out.copy(sc.anchor).applyMatrix4(o.matrixWorld);
  };
  let toolDist = Infinity; // khoảng cách tới dụng cụ `nearestTool` vừa trả về
  const nearestTool = (nx: number, ny: number, reach: number): ToolRt | null => {
    let best: ToolRt | null = null;
    let bd = reach;
    toolDist = Infinity;
    const g = V();
    for (const t of tools) {
      if (t.by >= 0) continue;
      // khoảng cách tới cả đoạn thân dụng cụ (từ chân tới tay cầm) trên màn hình: chạm vào đâu trên dụng cụ cũng cầm được
      gripWorld(t, g);
      v3.copy(g).project(k.camera);
      v4.copy(t.obj.position).project(k.camera);
      const ax = (v4.x - v3.x) * k.camera.aspect;
      const ay = v4.y - v3.y;
      const u = Math.max(0, Math.min(1, (((nx - v3.x) * k.camera.aspect) * ax + (ny - v3.y) * ay) / (ax * ax + ay * ay || 1)));
      const d = Math.hypot((v3.x - nx) * k.camera.aspect + ax * u, v3.y - ny + ay * u);
      if (d < bd) {
        bd = d;
        best = t;
        toolDist = d;
      }
    }
    return best;
  };
  const said = (e: (typeof eng)[number], text: string, now: number) => {
    if (e.warn === text && now - e.warnAt < 2500) return;
    e.warn = text;
    e.warnAt = now;
    live.warn(text, true);
  };

  return {
    /** chi tiết vừa có mô hình thật: đặt lại các con vít lên mặt trên của mô hình */
    reanchor(id: string, root: THREE.Object3D) {
      const p = parts.find((q) => q.id === id);
      const mine = screws.filter((sc) => sc.part === id);
      if (!p || !mine.length) return;
      anchorsOf(p, mine[0].fa, root).forEach((a, i) => {
        const sc = mine[i];
        if (!sc) return;
        sc.anchor.copy(a);
        sc.g.position.copy(a);
        sc.hole.position.copy(a);
      });
    },
    grab: (nx: number, ny: number) => !ik() && (tools.some((t) => t.by >= 0) || !!nearestTool(nx, ny, PLUCK)),
    owns: (i: number) => tools.some((t) => t.by === i),
    step(now: number, dt: number): string | null {
      const active = !ik();
      let caption: string | null = null;
      // ---- khay từ: số vít đang nằm ngoài
      let loose = 0;
      let total = 0;
      for (const sc of screws) {
        total++;
        if (!(live.screws[sc.part]?.[sc.idx] ?? false)) loose++;
      }
      bowl.forEach((m, i) => (m.visible = i < Math.min(24, Math.ceil((loose / Math.max(1, total)) * 24))));
      // chi tiết vừa được đặt lại vào chỗ: chuyển sang siết; siết đủ: chuyển về nới
      for (const [id, prev] of wasOn) {
        const on = !live.off.has(id);
        mode.set(id, nextMode(mode.get(id) ?? 'loosen', prev, on, live.screws[id] ?? []));
        wasOn.set(id, on);
      }
      // vít đã tháo (chưa siết) nằm TRONG khay từ; một nhãn duy nhất (trước đây hai nhãn chồng nhau và ghi nhầm "ngoài khay")
      looseTag(V(dish.x, 0.5, dish.z), undefined, total ? `Khay từ: ${loose}/${total} vít đã tháo` : 'Khay từ đựng vít');

      P.ptrs.forEach((p, i) => {
        const e = eng[i];
        const held = tools.find((t) => t.by === i) ?? null;
        if (!held) {
          if (active && p.active && p.pressed) {
            const t = nearestTool(p.ndc.x, p.ndc.y, Math.max(p.reach, PLUCK));
            if (t && !(partAt && partAt(p.ndc.x, p.ndc.y) < toolDist)) {
              t.by = i;
              // chuột: bấm một lần là cầm, dụng cụ đi theo chuột (không phải giữ nút); bấm chỗ trống để trả. Tay: chụm để cầm, buông là trả
              e.sticky = !p.hand && !p.touch; // ngón tay trên màn hình: giữ–kéo như tay, không "dính" (không có di chuột để dụng cụ đi theo)
              e.pickAt = now;
              e.lastRoll = p.roll;
              e.spin = 0;
              e.target = null;
              live.tool({name: TOOLS[t.id].name, use: TOOLS[t.id].use, hint: 'Đưa mũi tới một đầu vít cần tháo.'});
            }
          }
          return;
        }
        // ---- đang cầm dụng cụ
        if (e.sticky && !p.active && active) return; // chuột rời khung: giữ nguyên dụng cụ
        const dropMouse = e.sticky && p.pressed && now - e.pickAt > 200 && !e.target;
        if (!active || dropMouse || (!e.sticky && (!p.active || p.released))) {
          e.sticky = false;
          held.by = -1;
          e.target = null;
          e.lock = null;
          live.tool(null);
          return;
        }
        p.hot = true;
        const goal = P.onPlane(p.ndc.x, p.ndc.y, TOOL_Y, V());
        // chọn đầu vít gần mũi nhất trên màn hình (chỉ chi tiết đang lắp)
        let best: ScrewRt | null = null;
        let bd = SNAP;
        const aw = V();
        // con vừa vặn xong bị khoá cho tới khi mũi dụng cụ rời khỏi nó (không thì giữ chuột sẽ siết lại ngay)
        if (e.lock && scr(goal, anchorWorld(e.lock, aw)) > SNAP * 1.4) e.lock = null;
        for (const sc of screws) {
          if (live.off.has(sc.part) || sc === e.lock) continue;
          // chỉ nhận con vít đúng chiều đang làm của chi tiết: lướt qua con vừa nới thì không siết lại
          if (!canTurn(mode.get(sc.part) ?? 'loosen', live.screws[sc.part]?.[sc.idx] ?? false)) continue;
          const d = scr(goal, anchorWorld(sc, aw));
          if (d < bd) {
            bd = d;
            best = sc;
          }
        }
        let hint = `Đang cầm ${TOOLS[held.id].name}. Đưa mũi tới một đầu vít cần tháo (hoặc ô xanh cần siết).${e.sticky ? ' Bấm chỗ trống để trả dụng cụ về hộp.' : ''}`;
        let engaged: ScrewRt | null = null;
        let dir: Dir = 'loosen';
        if (best) {
          const state = live.screws[best.part] ?? [];
          dir = state[best.idx] ? 'loosen' : 'tighten';
          const bad = toolMistake(best.fa, dir, held.id) ?? orderMistake(best.fa, state, best.idx, dir);
          if (bad) {
            said(e, bad, now);
            hint = bad;
          } else {
            engaged = best;
            anchorWorld(best, goal).y += 0.05;
          }
        }
        if (engaged !== e.target) {
          e.target = engaged;
          e.dwell = 0;
          e.ang = NaN;
        }
        if (engaged) {
          const need = toolFor(engaged.fa, dir);
          void need;
          e.dwell += dt;
          // góc điểm chụm quanh đầu vít trên màn hình (chỉ cần x, y): nới = ngược chiều kim đồng hồ, siết = thuận chiều
          v3.copy(anchorWorld(engaged, aw)).project(k.camera);
          const ox = (p.ndc.x - v3.x) * k.camera.aspect;
          const oy = p.ndc.y - v3.y;
          let dAng = 0;
          if (Math.hypot(ox, oy) >= CIRC_MIN) {
            const a = Math.atan2(oy, ox);
            if (!Number.isNaN(e.ang)) dAng = wrapAngle(a - e.ang);
            e.ang = a;
          } else e.ang = NaN;
          const rev = driveRev(e.dwell, dt, dAng, dir);
          engaged.prog += rev / engaged.fa.turns;
          e.spin += (dir === 'loosen' ? -1 : 1) * rev * 2 * Math.PI;
          const left = (live.screws[engaged.part] ?? []).filter(Boolean).length;
          hint = `${dir === 'loosen' ? 'Đang nới' : 'Đang siết'} ${engaged.fa.what} (${Math.round(Math.min(1, engaged.prog) * 100)} %; còn ${dir === 'loosen' ? left : engaged.fa.count - left} con). ${e.dwell < DWELL ? 'Giữ yên mũi trên đầu vít…' : `Giữ mũi trên đầu vít để vặn; vẽ vòng tròn ${dir === 'loosen' ? 'ngược' : 'thuận'} chiều kim đồng hồ quanh đầu vít để vặn nhanh hơn.`}`;
          if (engaged.prog >= 1) {
            engaged.prog = 0;
            e.lock = engaged;
            live.setScrew(engaged.part, engaged.idx, dir === 'tighten');
            if (dir === 'tighten' && toolFor(engaged.fa, 'tighten') === 'torque') live.warn('Cạch! Cờ lê lực kêu: đủ lực siết, không siết thêm.', false);
          }
        }
        // ---- vẽ dụng cụ
        held.obj.position.lerp(goal, 1 - Math.exp(-dt * (engaged ? 24 : 30)));
        const flat = TOOLS[held.id].shape === 'flat';
        const tilt = engaged ? 0.12 : flat ? -0.3 : TILT;
        held.obj.rotation.set(held.obj.rotation.x + (tilt - held.obj.rotation.x) * 0.3, engaged ? e.spin : held.obj.rotation.y * 0.9, 0);
        if (!engaged) e.spin = 0;
        live.tool({name: TOOLS[held.id].name, use: TOOLS[held.id].use, hint});
        caption = hint;
      });

      // ---- trả dụng cụ không ai cầm về giá
      for (const t of tools) {
        if (t.by < 0) {
          t.obj.position.lerp(t.home, 1 - Math.exp(-dt * 12));
          t.obj.rotation.x += (t.homeRot.x - t.obj.rotation.x) * 0.25;
          t.obj.rotation.y += (t.homeRot.y - t.obj.rotation.y) * 0.25;
        }
      }
      // tên dụng cụ chỉ hiện khi con trỏ đang ở trên nó (giá dụng cụ chật, hiện hết thì chữ đè nhau)
      const hov = active ? P.ptrs.map((p) => (p.active ? nearestTool(p.ndc.x, p.ndc.y, PLUCK) : null)).find(Boolean) ?? null : null;
      for (const t of tools) labelOf.get(t.id)!(t === hov ? v4.copy(t.home).add(v3.set(0, 1.5, 0)) : null);

      // ---- ốc vít: hình theo trạng thái; ô xanh đánh dấu chỗ cần siết khi đang cầm dụng cụ
      const anyHeld = tools.some((t) => t.by >= 0);
      for (const sc of screws) {
        const inState = live.screws[sc.part]?.[sc.idx] ?? false;
        const on = !live.off.has(sc.part);
        const turning = sc.prog > 0.001;
        sc.g.visible = on && (inState || turning);
        sc.hole.visible = on && anyHeld && !inState && mode.get(sc.part) === 'tighten';
        if (turning) {
          const t = Math.min(1, sc.prog);
          const lift = inState ? t : 1 - t; // đang nới: nhô dần lên; đang siết: hạ dần xuống
          sc.g.position.y = sc.anchor.y + lift * LIFT;
          sc.g.rotation.y = t * sc.fa.turns * 2 * Math.PI * (inState ? -1 : 1);
        } else {
          sc.g.position.y = sc.anchor.y;
          sc.g.rotation.y = 0;
        }
      }
      return caption;
    },
  };
}
