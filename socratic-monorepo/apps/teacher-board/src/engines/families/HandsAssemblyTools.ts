import * as THREE from 'three';
import {FASTENERS, KITS, TOOLS, orderMistake, toolFor, toolMistake, type Dir, type Fastener, type ToolId} from '../../utils/lab/hands/fasteners';
import {wrapAngle} from '../../utils/lab/hands/handTracker';
import type {AssemblyLive} from './HandsAssembly3D';
import {handPointers} from './handsKit';
import {V, solid} from './handsModels';
import {loadModel, partOf} from './labParts';
import type {Kit} from './Stage3D';

/**
 * Bộ dụng cụ tháo lắp trong cảnh 3D: hộp dụng cụ (mô hình Blender `tools-parts.glb`), ốc vít / bu-lông trên từng chi tiết, khay từ đựng vít.
 * Cầm dụng cụ (chụm), đưa mũi tới đầu vít: đúng dụng cụ thì mũi tự khớp vào đầu vít. Vặn bằng CỔ TAY: xoay ngược chiều kim đồng hồ để nới,
 * thuận chiều để siết; xoay qua lại như vặn cần tự động (chỉ chiều đúng mới tính, chiều ngược là đổi thế cầm). Chuột: giữ nút trên đầu vít.
 * Luật (đúng dụng cụ, thứ tự đường chéo, đủ vít mới nhấc được chi tiết) nằm ở `utils/lab/hands/fasteners.ts`.
 */
const PLUCK = 0.095; // khoảng cách trên màn hình để chụm được tay cầm dụng cụ
const SNAP = 0.085; // khoảng cách trên màn hình để mũi dụng cụ nhận một đầu vít
const GAIN = 4; // xoay cổ tay 90° tương ứng một vòng vặn
const DEAD = 0.003; // rad mỗi khung: nhỏ hơn thế là rung tay, không tính
const TOOL_Y = 0.55;
const TILT = 0.45;
const LIFT = 0.09; // vít nhô lên bao nhiêu khi đã nới hết
const RACK = {x0: -3.0, step: 0.62, z: 2.55, y: 0.1};
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

export function toolKit({k, P, live, parts, ik}: {k: Kit; P: ReturnType<typeof handPointers>; live: AssemblyLive; parts: {id: string; obj: THREE.Group}[]; ik: () => boolean}) {
  const fa = FASTENERS[live.kind];
  const v3 = V();
  const v4 = V();

  // ---- giá dụng cụ và khay từ
  solid(k.scene, new THREE.BoxGeometry(6.8, 0.1, 0.6), '#8A5B35', {rough: 0.6, x: -0.2, y: 0.05, z: RACK.z});
  k.label('Hộp dụng cụ: chụm để cầm, chọn đúng cỡ')(V(-3.1, 0.2, RACK.z + 0.5));
  const dish = V(3.2, 0.02, RACK.z);
  const dishPlain = solid(k.scene, new THREE.CylinderGeometry(0.5, 0.42, 0.14, 28), '#B9BEC5', {metal: 0.8, rough: 0.35, x: dish.x, y: 0.07, z: dish.z});
  k.label('Khay từ đựng vít')(V(dish.x, 0.5, dish.z));
  const looseTag = k.label('');
  const bowl = Array.from({length: 24}, (_, i) => {
    const a = i * 2.4;
    const r = 0.06 + ((i * 37) % 10) * 0.035;
    const m = solid(k.scene, new THREE.CylinderGeometry(0.035, 0.035, 0.05, 8), '#C9CED6', {metal: 0.9, rough: 0.3, x: dish.x + Math.cos(a) * r, y: 0.17, z: dish.z + Math.sin(a) * r});
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
      for (const sc of screws) {
        const sk = partOf(lib, HEAD[sc.fa.tool]);
        if (!sk) continue;
        sc.g.clear();
        sc.g.add(sk.obj);
      }
      const rack = partOf(lib, 'MagDish');
      if (rack) {
        rack.obj.position.set(dish.x, 0, dish.z);
        k.scene.add(rack.obj);
        dishPlain.visible = false;
      }
    })
    .catch(() => undefined);

  const eng = P.ptrs.map(() => ({lastRoll: NaN, spin: 0, target: null as ScrewRt | null, lock: null as ScrewRt | null, warn: '', warnAt: -1e9}));
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
  const nearestTool = (nx: number, ny: number, reach: number): ToolRt | null => {
    let best: ToolRt | null = null;
    let bd = reach;
    const g = V();
    for (const t of tools) {
      if (t.by >= 0) continue;
      gripWorld(t, g);
      v3.copy(g).project(k.camera);
      const d = Math.hypot((v3.x - nx) * k.camera.aspect, v3.y - ny);
      if (d < bd) {
        bd = d;
        best = t;
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
      looseTag(total ? V(dish.x, 0.8, dish.z) : null, undefined, `${loose}/${total} vít ngoài khay`);

      P.ptrs.forEach((p, i) => {
        const e = eng[i];
        const held = tools.find((t) => t.by === i) ?? null;
        if (!held) {
          if (active && p.active && p.pressed) {
            const t = nearestTool(p.ndc.x, p.ndc.y, p.reach);
            if (t) {
              t.by = i;
              e.lastRoll = p.roll;
              e.spin = 0;
              e.target = null;
              live.tool({name: TOOLS[t.id].name, use: TOOLS[t.id].use, hint: 'Đưa mũi tới một đầu vít cần tháo.'});
            }
          }
          return;
        }
        // ---- đang cầm dụng cụ
        if (!p.active || p.released || !active) {
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
          const d = scr(goal, anchorWorld(sc, aw));
          if (d < bd) {
            bd = d;
            best = sc;
          }
        }
        let hint = `Đang cầm ${TOOLS[held.id].name}. Đưa mũi tới một đầu vít cần tháo (hoặc ô xanh cần siết).`;
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
          e.lastRoll = p.roll;
        }
        if (engaged) {
          const need = toolFor(engaged.fa, dir);
          void need;
          let rev = 0;
          if (Number.isNaN(p.roll)) rev = p.down ? dt / 0.45 : 0;
          else {
            const d = wrapAngle(p.roll - e.lastRoll);
            if (Math.abs(d) > DEAD) rev = ((dir === 'loosen' ? -d : d) > 0 ? Math.abs(d) : 0) * (GAIN / (2 * Math.PI));
          }
          e.lastRoll = p.roll;
          engaged.prog += rev / engaged.fa.turns;
          e.spin += (dir === 'loosen' ? -1 : 1) * rev * 2 * Math.PI;
          const left = (live.screws[engaged.part] ?? []).filter(Boolean).length;
          hint = `${dir === 'loosen' ? 'Đang nới' : 'Đang siết'} ${engaged.fa.what} (${Math.round(Math.min(1, engaged.prog) * 100)} %; còn ${dir === 'loosen' ? left : engaged.fa.count - left} con). ${Number.isNaN(p.roll) ? 'Giữ nút chuột trên đầu vít.' : `Xoay cổ tay ${dir === 'loosen' ? 'ngược' : 'thuận'} chiều kim đồng hồ, nhấc về rồi xoay tiếp như vặn cần tự động.`}`;
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
        sc.hole.visible = on && anyHeld && !inState;
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
