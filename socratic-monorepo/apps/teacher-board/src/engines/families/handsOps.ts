import * as THREE from 'three';
import {OPS, knobParams, nearestOption, type ActionDef, type OpsDef} from '../../utils/lab/hands/sims/ops';
import {fmt, fromUnit, toUnit, type SimSpec} from '../../utils/lab/hands/sims/types';
import {padRate} from '../../utils/lab/hands/handTracker';
import {handPointers} from './handsKit';
import {dress, loadModel, partOf, type Skin} from './labParts';
import type {Kit} from './Stage3D';

const KNOB_Z = 1.0;
const SOCKET_Z = 1.95;
const TRAY_Z = 2.55;
const SWEEP = 1.5 * Math.PI; // núm xoay 270°
const LEVER = 0.7; // góc gạt công tắc (rad)
const mesh = (k: Kit, geo: THREE.BufferGeometry, color: string, x: number, y: number, z: number, parent?: THREE.Object3D) => {
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({color, metalness: 0.25, roughness: 0.45, emissive: '#000000'}));
  m.position.set(x, y, z);
  m.castShadow = true;
  (parent ?? k.scene).add(m);
  return m;
};

/**
 * Thao tác trực tiếp như trên bàn thí nghiệm thật (thay thanh trượt và nút bấm):
 * - bộ phận (quả cân, tấm catot, ống, lá kim loại…) là VẬT: cầm lên, đặt vào ổ lắp trên thiết bị; thả ra ngoài ổ thì vật về khay;
 * - đại lượng liên tục là NÚM XOAY (đưa tay vòng quanh núm; miết ngón cái chỉnh tinh);
 * - khởi động / tắt là CẦN GẠT của công tắc dao: cầm cần gạt sang bên kia;
 * - cú đẩy, cú đạp là KÉO CẦN rồi buông: kéo giãn dây cao su, buông tay thì cần bật về và tác động lên thiết bị.
 */
export function handOps(k: Kit, P: ReturnType<typeof handPointers>, spec: SimSpec, ops: OpsDef, write: (id: string, x: number) => void, act: (id: string) => void = () => undefined, anchors: Record<string, THREE.Vector3> = {}) {
  /** hình khối tĩnh sẽ ẩn đi khi mô hình Blender tải xong */
  const plain: THREE.Object3D[] = [];
  const knobs = knobParams(spec, ops).map((p, i) => {
    const x = -3.7 + i * 1.3;
    plain.push(mesh(k, new THREE.CylinderGeometry(0.27, 0.3, 0.08, 28), '#3A3E7A', x, 0.04, KNOB_Z));
    const cap = mesh(k, new THREE.CylinderGeometry(0.2, 0.22, 0.2, 28), '#E3B341', x, 0.18, KNOB_Z);
    mesh(k, new THREE.BoxGeometry(0.05, 0.05, 0.17), '#1D1B16', 0, 0.12, -0.09, cap);
    for (let j = 0; j <= 10; j++) {
      const a = -SWEEP / 2 + (j / 10) * SWEEP;
      const tick = mesh(k, new THREE.BoxGeometry(0.025, 0.02, 0.07), '#8B91B8', x + Math.sin(a) * 0.38, 0.09, KNOB_Z - Math.cos(a) * 0.38);
      tick.rotation.y = a;
      plain.push(tick);
    }
    return {p, x, cap, tag: k.label(p.label), skin: null as Skin | null};
  });

  // ---- nút bấm "−" / "+" trước mỗi núm: giữ ngón tay trên nút (không cần chụm) để đổi giá trị mượt theo thời gian giữ
  const pads = knobs.flatMap((kn, i) =>
    [-1, 1].map((dir) => {
      const at = new THREE.Vector3(kn.x + dir * 0.2, 0.09, KNOB_Z + 0.62);
      const m = mesh(k, new THREE.CylinderGeometry(0.11, 0.125, 0.09, 24), dir > 0 ? '#2E9B57' : '#C4261A', at.x, 0.045, at.z);
      k.label(dir > 0 ? '+' : '−', '#FBF9F4', true)(new THREE.Vector3(at.x, 0.14, at.z));
      return {i, dir, m, at, held: 0};
    }),
  );
  let padClock = performance.now();

  // ---- vật cần lắp và ổ lắp tương ứng
  type Token = {m: THREE.Mesh; home: THREE.Vector3; i: number; color: string; skin: Skin | null};
  // nhóm có chỗ lắp trên thiết bị (`anchors`) dùng chính vectơ đó làm ổ lắp: thiết bị dời đi thì vật đã lắp đi theo
  const picks = ops.picks.map((def) => ({def, tokens: [] as Token[], socket: anchors[def.id] ?? new THREE.Vector3(), onDevice: def.id in anchors}));
  let cursor = -3.9;
  for (const g of picks) {
    const width = (g.def.options.length - 1) * 0.42;
    const xc = cursor + width / 2;
    if (g.onDevice) k.label(`Khay: ${g.def.title}`)(new THREE.Vector3(xc, 0.12, TRAY_Z - 0.5));
    else {
      g.socket.set(xc, 0.14, SOCKET_Z);
      plain.push(mesh(k, new THREE.TorusGeometry(0.27, 0.025, 10, 32).rotateX(Math.PI / 2), '#E3B341', xc, 0.05, SOCKET_Z));
      plain.push(mesh(k, new THREE.CylinderGeometry(0.26, 0.26, 0.03, 32), '#2A2E66', xc, 0.02, SOCKET_Z));
      k.label(`Ổ lắp: ${g.def.title}`)(new THREE.Vector3(xc, 0.12, SOCKET_Z - 0.5));
    }
    g.def.options.forEach((o, i) => {
      const home = new THREE.Vector3(cursor + i * 0.42, 0.1, TRAY_Z);
      const m = mesh(k, new THREE.CylinderGeometry(0.15, 0.15, 0.2, 20), o.color, home.x, home.y, home.z);
      m.userData.fresh = true;
      k.label(o.label)(new THREE.Vector3(home.x, 0.5, home.z + 0.3));
      g.tokens.push({m, home, i, color: o.color, skin: null});
    });
    cursor += g.def.options.length * 0.42 + 0.5;
  }

  // ---- công tắc dao (cặp start/stop) và cần kéo (hành động đơn)
  const acts = ops.actions ?? [];
  const startAct = acts.find((a) => a.id === 'start');
  const stopAct = acts.find((a) => a.id === 'stop');
  const hasSwitch = !!(startAct && stopAct);
  const singles: ActionDef[] = hasSwitch ? acts.filter((a) => a !== startAct && a !== stopAct) : acts;
  const SW = new THREE.Vector3(3.2, 0.2, 1.05);
  const lever = new THREE.Group();
  lever.position.copy(SW);
  let on = false;
  let leverAngle = -LEVER;
  const lamp = mesh(k, new THREE.SphereGeometry(0.09, 16, 12), '#55524B', SW.x + 0.5, 0.12, SW.z + 0.4);
  const tip = mesh(k, new THREE.SphereGeometry(0.13, 16, 12), '#D9481C', 0, 0, -0.85, lever);
  let blade: THREE.Mesh | null = null;
  if (hasSwitch) {
    plain.push(mesh(k, new THREE.BoxGeometry(1.1, 0.08, 1.7), '#2A2E66', SW.x, 0.04, SW.z - 0.35));
    plain.push(mesh(k, new THREE.CylinderGeometry(0.1, 0.1, 0.16, 16), '#B9BEC5', SW.x, 0.14, SW.z));
    blade = mesh(k, new THREE.BoxGeometry(0.07, 0.07, 0.85), '#B9BEC5', 0, 0, -0.42, lever);
    k.scene.add(lever);
    for (const s of [-1, 1]) plain.push(mesh(k, new THREE.BoxGeometry(0.18, 0.1, 0.18), s > 0 ? '#2E9B57' : '#C4261A', SW.x + s * 0.5, 0.13, SW.z - 0.78));
    k.label('Công tắc dao: gạt sang phải = đóng')(new THREE.Vector3(SW.x, 0.6, SW.z + 0.75));
  }
  const pulls = singles.map((a, i) => {
    const z = 0.2 + i * 0.9;
    const rest = new THREE.Vector3(3.6, 0.17, z);
    plain.push(mesh(k, new THREE.BoxGeometry(1.5, 0.05, 0.12), '#3A3E7A', 3.0, 0.05, z));
    const handle = mesh(k, new THREE.BoxGeometry(0.2, 0.24, 0.4), a.color, rest.x, rest.y, rest.z);
    const band = mesh(k, new THREE.BoxGeometry(1, 0.04, 0.04), '#C8722A', 3.75, 0.2, z);
    k.label(`${a.label}: kéo cần về bên trái rồi buông`)(new THREE.Vector3(3.0, 0.5, z + 0.45));
    return {a, rest, handle, band, pull: 0, z};
  });

  // ---- mặc mô hình dựng bằng Blender (tools/lab-models/ops_parts.py) lên các vật thay thế; tải lỗi thì giữ hình khối
  loadModel('/models/lab-parts.glb')
    .then((lib) => {
      const put = (name: string, x: number, y: number, z: number) => {
        const sk = partOf(lib, name);
        if (sk) k.scene.add(sk.obj.translateX(x).translateY(y).translateZ(z));
        return !!sk;
      };
      let ok = true;
      knobs.forEach((kn) => {
        kn.skin = dress(kn.cap, partOf(lib, 'KnobCap'));
        ok = put('KnobDial', kn.x, 0, KNOB_Z) && ok;
      });
      picks.forEach((g) => {
        if (!g.onDevice) ok = put('Socket', g.socket.x, 0, SOCKET_Z) && ok;
        g.tokens.forEach((tk) => {
          tk.skin = dress(tk.m, partOf(lib, 'Token'));
          tk.skin?.mats.forEach((m) => m.color.set(tk.color));
        });
      });
      if (hasSwitch && blade) {
        ok = put('SwitchBase', SW.x, 0, SW.z) && ok;
        (tip.material as THREE.Material).visible = false;
        (blade.material as THREE.Material).visible = false;
        const lv = partOf(lib, 'SwitchLever');
        if (lv) lever.add(lv.obj);
      }
      pulls.forEach((pl) => {
        ok = put('PullRail', 3.0, 0, pl.z) && ok;
        dress(pl.handle, partOf(lib, 'PullHandle'))?.mats.forEach((m) => m.color.set(pl.a.color));
      });
      if (ok) plain.forEach((o) => (o.visible = false));
    })
    .catch(() => undefined);

  const pos = new THREE.Vector3();
  const v3 = new THREE.Vector3();
  type Hit = {kind: 'knob'; i: number} | {kind: 'tok'; g: number; i: number} | {kind: 'lever'} | {kind: 'pull'; i: number};
  const hit = (nx: number, ny: number, reach: number): Hit | null => {
    let best: Hit | null = null;
    let bd = reach;
    const tryAt = (p: THREE.Vector3, h: Hit) => {
      const d = P.distAt(nx, ny, p);
      if (d < bd) {
        bd = d;
        best = h;
      }
    };
    knobs.forEach((kn, i) => tryAt(pos.set(kn.x, 0.2, KNOB_Z), {kind: 'knob', i}));
    if (hasSwitch) tryAt(tip.getWorldPosition(pos), {kind: 'lever'});
    pulls.forEach((pl, i) => tryAt(pos.copy(pl.handle.position), {kind: 'pull', i}));
    picks.forEach((g, gi) => g.tokens.forEach((tk) => tryAt(pos.copy(tk.m.position), {kind: 'tok', g: gi, i: tk.i})));
    return best;
  };

  type Held = {kind: 'knob'; i: number; a: number} | {kind: 'tok'; g: number; i: number; x: number; y: number; moved: boolean} | {kind: 'lever'} | {kind: 'pull'; i: number};
  const held: (Held | null)[] = P.ptrs.map(() => null);
  const slid = P.ptrs.map((p) => p.slide);
  let sel = 0;
  const holding = (f: (h: Held) => boolean) => held.some((h) => h && f(h));
  return {
    grab: (nx: number, ny: number) => hit(nx, ny, 0.07) !== null || pads.some((pd) => P.distAt(nx, ny, pd.at) < 0.1),
    step(v: Record<string, number>) {
      const padNow = performance.now();
      const padDt = Math.min((padNow - padClock) / 1000, 0.05);
      padClock = padNow;
      for (const pd of pads) {
        // tay: chỉ cần đưa điểm chụm tới trên nút; chuột: nhấn giữ
        const on = P.ptrs.some((ptr, n) => ptr.active && !held[n] && (ptr.hand || ptr.down) && P.distAt(ptr.ndc.x, ptr.ndc.y, pd.at) < (ptr.hand ? 0.11 : 0.06));
        pd.held = on ? pd.held + padDt : 0;
        const rate = padRate(pd.held);
        if (rate) {
          const p = knobs[pd.i].p;
          write(p.id, fromUnit(p, Math.min(1, Math.max(0, toUnit(p, v[p.id]) + pd.dir * rate * padDt))));
          sel = pd.i;
        }
        pd.m.position.y = on ? 0.02 : 0.045;
        (pd.m.material as THREE.MeshStandardMaterial).emissive.set(on ? (pd.dir > 0 ? '#1E9E4D' : '#8A1A12') : '#000000');
      }
      P.ptrs.forEach((ptr, n) => {
        const h = ptr.active && !held[n] ? hit(ptr.ndc.x, ptr.ndc.y, ptr.reach) : null;
        if (ptr.pressed && h) {
          if (h.kind === 'knob') {
            const at = P.onPlane(ptr.ndc.x, ptr.ndc.y, 0.2, v3);
            held[n] = {kind: 'knob', i: h.i, a: Math.atan2(at.z - KNOB_Z, at.x - knobs[h.i].x)};
            sel = h.i;
          } else if (h.kind === 'tok') held[n] = {kind: 'tok', g: h.g, i: h.i, x: ptr.ndc.x, y: ptr.ndc.y, moved: false};
          else held[n] = h.kind === 'lever' ? {kind: 'lever'} : {kind: 'pull', i: h.i};
        }
        const cur = held[n];
        if (cur && (ptr.released || !ptr.active)) {
          if (cur.kind === 'tok') {
            const g = picks[cur.g];
            // đặt vào ổ lắp thì chọn bộ phận này; nhấp nhanh (không kéo) cũng chọn, để dùng được bằng chuột
            if (!cur.moved || P.distAt(ptr.ndc.x, ptr.ndc.y, g.socket) < 0.2) write(g.def.id, g.def.options[cur.i].value);
          } else if (cur.kind === 'lever') {
            const next = leverAngle > 0;
            if (next !== on) {
              on = next;
              act(on ? 'start' : 'stop');
            }
          } else if (cur.kind === 'pull') {
            const pl = pulls[cur.i];
            if (pl.pull > 0.35) act(pl.a.id);
          }
          held[n] = null;
        }
        const now = held[n];
        const d = ptr.slide - slid[n];
        slid[n] = ptr.slide;
        const adjust = (i: number, dt: number) => {
          const p = knobs[i].p;
          write(p.id, fromUnit(p, Math.min(1, Math.max(0, toUnit(p, v[p.id]) + dt))));
        };
        if (now?.kind === 'knob') {
          const at = P.onPlane(ptr.ndc.x, ptr.ndc.y, 0.2, v3);
          const a = Math.atan2(at.z - KNOB_Z, at.x - knobs[now.i].x);
          let da = a - now.a;
          da -= Math.round(da / (2 * Math.PI)) * 2 * Math.PI;
          now.a = a;
          adjust(now.i, da / SWEEP);
        } else if (now?.kind === 'tok') {
          if (Math.hypot(ptr.ndc.x - now.x, ptr.ndc.y - now.y) > 0.03) now.moved = true;
        } else if (now?.kind === 'lever') {
          const at = P.onPlane(ptr.ndc.x, ptr.ndc.y, 0.2, v3);
          leverAngle = Math.max(-LEVER, Math.min(LEVER, Math.atan2(-(at.x - SW.x), -(at.z - SW.z))));
        } else if (now?.kind === 'pull') {
          const pl = pulls[now.i];
          const at = P.onPlane(ptr.ndc.x, ptr.ndc.y, 0.2, v3);
          pl.pull = Math.max(0, Math.min(1, (pl.rest.x - at.x) / 1.1));
        } else if (d && knobs[sel]) adjust(sel, d);
        ptr.hot = !!(now ?? h) || d !== 0 || pads.some((pd) => pd.held > 0 && P.distAt(ptr.ndc.x, ptr.ndc.y, pd.at) < 0.11);
      });

      // ---- vẽ
      if (hasSwitch) {
        if (!holding((h) => h.kind === 'lever')) leverAngle += ((on ? LEVER : -LEVER) - leverAngle) * 0.3;
        lever.rotation.y = leverAngle;
        (lamp.material as THREE.MeshStandardMaterial).color.set(on ? '#35C46A' : '#55524B');
        (lamp.material as THREE.MeshStandardMaterial).emissive.set(on ? '#1E9E4D' : '#000000');
      }
      pulls.forEach((pl, i) => {
        if (!holding((h) => h.kind === 'pull' && h.i === i)) pl.pull *= 0.55; // buông tay: cần bật về
        pl.handle.position.x = pl.rest.x - pl.pull * 1.1;
        const len = Math.max(0.05, 3.75 - pl.handle.position.x - 0.1);
        pl.band.scale.x = len;
        pl.band.position.x = 3.75 - len / 2;
      });
      knobs.forEach((kn, i) => {
        const t = toUnit(kn.p, v[kn.p.id]);
        kn.cap.rotation.y = -(-SWEEP / 2 + t * SWEEP);
        (kn.cap.material as THREE.MeshStandardMaterial).color.set(i === sel ? '#D9481C' : '#E3B341');
        kn.skin?.mats.forEach((m) => m.emissive.set(i === sel ? '#7A2A0C' : '#000000'));
        kn.tag(pos.set(kn.x, 0.55, KNOB_Z + 0.55), undefined, `${kn.p.label}: ${fmt(kn.p, v[kn.p.id])}`);
      });
      picks.forEach((g, gi) => {
        const on2 = nearestOption(g.def, v[g.def.id]);
        g.tokens.forEach((tk) => {
          const m = tk.m;
          if (m.userData.fresh) {
            m.userData.fresh = false;
            m.position.copy(tk.i === on2 ? g.socket : tk.home);
          }
          const grabbed = held.find((h) => h?.kind === 'tok' && h.g === gi && h.i === tk.i);
          const ptr = grabbed ? P.ptrs[held.indexOf(grabbed)] : null;
          const goal = ptr ? P.onPlane(ptr.ndc.x, ptr.ndc.y, 0.5, v3).clone() : tk.i === on2 ? g.socket : tk.home;
          m.position.lerp(goal, ptr ? 0.5 : g.onDevice && tk.i === on2 ? 0.7 : 0.22); // vật đã lắp trên thiết bị phải bám kịp khi thiết bị chạy
          (m.material as THREE.MeshStandardMaterial).emissive.set(tk.i === on2 ? '#5A2408' : '#000000');
          tk.skin?.mats.forEach((sm) => sm.emissive.set(tk.i === on2 ? '#5A2408' : '#000000'));
        });
      });
    },
  };
}

export const hasOps = (id: string): boolean => id in OPS;

/**
 * Dải nút − / + ở mép trước bàn cho các bài thao tác tùy biến (bàn hóa, kĩ thuật, va chạm): mỗi tham số liên tục một hàng gồm
 * nhãn giá trị và hai nút tròn. Giữ ngón tay trên nút (không cần chụm, chuột thì nhấn giữ) để đổi giá trị mượt theo thời gian giữ (`padRate`),
 * dùng khi thao tác trực tiếp trên dụng cụ khó chính xác. `skip` = tham số đã có thao tác riêng không cần dải nút.
 */
export function padBank(k: Kit, P: ReturnType<typeof handPointers>, spec: SimSpec, read: () => Record<string, number>, write: (id: string, x: number) => void, skip: string[] = []) {
  const ps = spec.params.filter((p) => !skip.includes(p.id));
  const Z0 = 2.7;
  const rows = ps.map((p, i) => {
    const x = -0.3 + (i - (ps.length - 1) / 2) * 1.7;
    const mk = (dir: number) => {
      const at = new THREE.Vector3(x + dir * 0.5, 0.09, Z0);
      const m = mesh(k, new THREE.CylinderGeometry(0.15, 0.17, 0.09, 24), dir > 0 ? '#2E9B57' : '#C4261A', at.x, 0.045, at.z);
      k.label(dir > 0 ? '+' : '−', '#FBF9F4', true)(new THREE.Vector3(at.x, 0.14, at.z));
      return {dir, m, at, held: 0};
    };
    return {p, tag: k.label(p.label), x, pads: [mk(-1), mk(1)]};
  });
  let clock = performance.now();
  return {
    grab: (nx: number, ny: number) => rows.some((r) => r.pads.some((pd) => P.distAt(nx, ny, pd.at) < 0.1)),
    step() {
      const now = performance.now();
      const dt = Math.min((now - clock) / 1000, 0.05);
      clock = now;
      const v = read();
      for (const r of rows) {
        for (const pd of r.pads) {
          const on = P.ptrs.some((ptr) => ptr.active && (ptr.hand || ptr.down) && P.distAt(ptr.ndc.x, ptr.ndc.y, pd.at) < (ptr.hand ? 0.11 : 0.1));
          pd.held = on ? pd.held + dt : 0;
          const rate = padRate(pd.held);
          if (rate) write(r.p.id, fromUnit(r.p, Math.min(1, Math.max(0, toUnit(r.p, v[r.p.id]) + pd.dir * rate * dt))));
          pd.m.position.y = on ? 0.02 : 0.045;
          (pd.m.material as THREE.MeshStandardMaterial).emissive.set(on ? (pd.dir > 0 ? '#1E9E4D' : '#8A1A12') : '#000000');
        }
        r.tag(new THREE.Vector3(r.x, 0.45, Z0 + 0.1), undefined, `${r.p.label}: ${fmt(r.p, v[r.p.id])}`);
      }
    },
  };
}
