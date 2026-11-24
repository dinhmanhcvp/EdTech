'use client';

import React, {useMemo} from 'react';
import * as THREE from 'three';
import {TOOLS, TOOL_NAME, beatRate, current, cutAdvance, pointAt, reachable, toolOf, type DAction, type DissectSpec, type DissectState, type Flap, type ToolId} from '../../utils/lab/hands/dissect';
import {bioRoom, graniteTop, handPointers, type HandsInput} from './handsKit';
import {solid} from './handsModels';
import {glassify, loadModel} from './labParts';
import {wetAll} from './tissueShader';
import {organAll, surgPost} from './surgLook';
import {Stage3D, setLine, type SceneDef} from './Stage3D';

/** Trạng thái bài mổ dùng chung giữa bảng điều khiển React và cảnh 3D (React ghi mỗi lần vẽ, cảnh đọc mỗi khung hình). */
export interface DissectLive {
  spec: DissectSpec;
  st: DissectState;
  dispatch: (a: DAction) => void;
}

/** chỗ để từng dụng cụ trên khay dụng cụ (z), khay nằm bên phải khay mổ */
const SLOT: Record<ToolId, number> = {scalpel: -1.5, scissors: -0.75, forceps: 0, pin: 0.75, dropper: 1.5};
const TRAY_X = 2.95;
/** dụng cụ đang cầm: nghiêng cán lên phía tay phải người làm; kim ghim và ống nhỏ giọt gần như dựng đứng */
const HOLD: Record<ToolId, THREE.Euler> = {
  scalpel: new THREE.Euler(0, -0.5, 0.6, 'YXZ'),
  scissors: new THREE.Euler(0, -0.5, 0.45, 'YXZ'),
  forceps: new THREE.Euler(0, -0.5, 0.55, 'YXZ'),
  pin: new THREE.Euler(0, -0.3, 1.35, 'YXZ'),
  dropper: new THREE.Euler(0, -0.3, 1.25, 'YXZ'),
};
const ORANGE = '#D9481C';
const N_CUT = 64;
const ease = (x: number) => x * x * (3 - 2 * x);

type Mats = THREE.MeshStandardMaterial[];
const matsOf = (o: THREE.Object3D): Mats => {
  const out: Mats = [];
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.isMesh) out.push(m.material as THREE.MeshStandardMaterial);
  });
  return out;
};
type Target = {kind: 'tool'; tool: ToolId} | {kind: 'pin'; i: number} | {kind: 'cut'} | {kind: 'flap'; id: string} | {kind: 'drop'} | {kind: 'organ'; id: string};

function makeDef(input: HandsInput, live: DissectLive): SceneDef {
  return {
    floor: true,
    room: true,
    bright: true,
    post: surgPost('open'),
    // mỗi mẫu một khung nhìn: gần hơn với mẫu nhỏ (tim, hoa) để thấy chi tiết, khay dụng cụ vẫn còn trong khung
    dist: {FROG: 6.2, PIG: 5.8, FISH: 5.4, FLOWER: 5.0, HUMAN: 7.2}[live.spec.model],
    target: {FROG: [0.9, 0, 0.2], PIG: [0.5, 0, 0.2], FISH: [0.9, 0, 0.15], FLOWER: [0.9, 0, 0.1], HUMAN: [0.8, 0, 0.2]}[live.spec.model] as [number, number, number],
    orbit: () => [0, 56],
    setup: (k) => {
      // phòng thí nghiệm Sinh sáng, bàn đá đen như bài thực hành Sinh (trước: phòng tối, bàn xanh đậm nên mẫu mổ như lơ lửng trong khoảng trống)
      bioRoom(k, [10.6, 5.6, 0.7, 0]);
      graniteTop(k, [10.6, 5.6, 0.7, 0], -0.27);
      const P = handPointers(k, input, 0.5);
      const spec = live.spec;
      const ray = new THREE.Raycaster();
      const v2 = new THREE.Vector2();
      const v3 = new THREE.Vector3();
      const w3 = new THREE.Vector3();
      const qt = new THREE.Quaternion();
      const box = new THREE.Box3();
      const DOWN = new THREE.Vector3(0, -1, 0);

      let ready = false;
      const surfaceObjs: THREE.Object3D[] = [];
      const tools = new Map<ToolId, THREE.Object3D>();
      const toolMats = new Map<ToolId, Mats>();
      const organs = new Map<string, {obj: THREE.Object3D; mats: Mats; tag: ReturnType<typeof k.label>; scale0: THREE.Vector3}>();
      const flaps = new Map<string, {obj: THREE.Object3D; f: Flap; pos0: THREE.Vector3; q0: THREE.Quaternion; mats: Mats; shown: number; grip: THREE.Vector3; dir: THREE.Vector2; len: number}>();
      let pinProto: THREE.Object3D | null = null;
      const placed = new Set<string>();
      const card = k.card(ORANGE);
      k.caption('Đang tải mẫu mổ…');

      const applyFlap = (fl: NonNullable<ReturnType<typeof flaps.get>>, a: number) => {
        const {obj, f} = fl;
        obj.position.copy(fl.pos0);
        if (f.move) obj.position.add(v3.fromArray(f.move).multiplyScalar(a));
        obj.quaternion.copy(fl.q0);
        if (f.axis) obj.quaternion.premultiply(qt.setFromAxisAngle(v3.fromArray(f.axis), (f.angle ?? 0) * a));
        obj.scale.setScalar(1 + ((f.scale ?? 1) - 1) * a);
        if (f.fade) {
          const o = 1 - ease(Math.min(1, a));
          fl.mats.forEach((m) => {
            m.transparent = o < 1;
            m.opacity = o;
          });
          obj.visible = a < 0.99;
        }
      };
      /** điểm cầm của lớp (đỉnh hộp bao khi đóng), theo toạ độ của chính lớp: lớp quay/dời thì điểm cầm đi theo */
      const gripWorld = (fl: NonNullable<ReturnType<typeof flaps.get>>, out: THREE.Vector3) => fl.obj.localToWorld(out.copy(fl.grip));

      void loadModel('/models/dissect-parts.glb')
        .then((lib) => {
          const take = (name: string) => {
            const src = lib.getObjectByName(name);
            if (!src) return null;
            const o = src.clone(true);
            o.traverse((c) => {
              const m = c as THREE.Mesh;
              if (!m.isMesh) return;
              m.material = (m.material as THREE.Material).clone();
              m.castShadow = m.receiveShadow = true;
            });
            k.scene.add(o);
            return o;
          };
          const tray = take('TRAY');
          if (tray) surfaceObjs.push(tray);
          take('TOOLTRAY');
          for (const t of TOOLS) {
            const o = take(`TOOL_${t}`);
            if (!o) continue;
            if (t === 'dropper') glassify(o, 0.25);
            o.position.set(TRAY_X, 0.04, SLOT[t]);
            // tên dụng cụ ngay trên khăn, cạnh chỗ để
            k.label(TOOL_NAME[t], '#F3EFE6', true, 12)(new THREE.Vector3(TRAY_X + 0.62, 0.03, SLOT[t] + 0.34));
            tools.set(t, o);
            toolMats.set(t, matsOf(o));
          }
          const pin = lib.getObjectByName('TOOL_pin');
          pinProto = pin ? pin.clone(true) : null;
          const M = spec.model;
          // lớp mở được: nút `<MẪU>_f_<id>` (gốc ở bản lề), không có thì là nhóm rỗng ở gốc toạ độ để gắn cơ quan đi theo (chùm nhị)
          for (const [id, f] of Object.entries(spec.flaps)) {
            let obj = take(`${M}_f_${id}`);
            if (!obj) {
              obj = new THREE.Group();
              k.scene.add(obj);
            }
            flaps.set(id, {obj, f, pos0: obj.position.clone(), q0: obj.quaternion.clone(), mats: [], shown: 0, grip: new THREE.Vector3(), dir: new THREE.Vector2(0, -1), len: 0.8});
          }
          for (const node of lib.children) if (node.name.startsWith(`${M}_body`)) {
            const o = take(node.name);
            if (o) surfaceObjs.push(o);
          }
          for (const [id, og] of Object.entries(spec.organs)) {
            const mesh = og.mesh ? `${M}_${og.mesh}` : `${M}_o_${id}`;
            const flapId = og.mesh?.startsWith('f_') ? og.mesh.slice(2) : null;
            const obj = flapId ? flaps.get(flapId)?.obj ?? null : take(mesh);
            if (!obj) continue;
            obj.userData.organ = id;
            if (og.on) flaps.get(og.on)?.obj.attach(obj);
            organs.set(id, {obj, mats: matsOf(obj), tag: k.label(`✓ ${og.name}`, '#1F7A4D'), scale0: obj.scale.clone()});
          }
          k.scene.updateMatrixWorld(true);
          for (const fl of flaps.values()) {
            fl.mats = matsOf(fl.obj);
            surfaceObjs.push(fl.obj);
            box.setFromObject(fl.obj);
            const top = box.getCenter(new THREE.Vector3());
            top.y = box.max.y;
            fl.grip.copy(fl.obj.worldToLocal(top.clone()));
            // hướng kéo để mở = hướng điểm cầm đi khi lớp mở hẳn (chiếu xuống mặt khay)
            applyFlap(fl, 1);
            fl.obj.updateMatrixWorld(true);
            const end = gripWorld(fl, new THREE.Vector3());
            applyFlap(fl, 0);
            fl.obj.updateMatrixWorld(true);
            const d = new THREE.Vector2(end.x - top.x, end.z - top.z);
            if (d.length() > 0.2) {
              fl.len = Math.min(d.length(), 0.9);
              fl.dir.copy(d.normalize());
            }
          }
          for (const o of organs.values()) surfaceObjs.push(o.obj);
          // mô sống: gợn và độ bóng loang trong shader; gợn mịn hơn với mẫu nhỏ (hoa, ếch, cá)
          const [fine, depth] = {FROG: [22, 0.0022], PIG: [12, 0.0018], FISH: [14, 0.0012], FLOWER: [30, 0.0015], HUMAN: [8, 0.0004]}[M];
          // hoa là mô thực vật nên không có vi mạch; các mẫu động vật dùng mô sống chung
          for (const o of [...surfaceObjs.slice(1), ...[...organs.values()].map((x) => x.obj)]) M === 'FLOWER' ? wetAll(o, fine, depth, 0.35) : organAll(o, 'muscle', 0.8);
          ready = true;
        })
        .catch(() => k.caption('Không tải được mẫu mổ (models/dissect-parts.glb). Tải lại trang để thử lại.'));

      const shown = () => surfaceObjs.filter((o) => {
        for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
        return true;
      });
      const surfaceY = (x: number, z: number) => {
        ray.set(v3.set(x, 6, z), DOWN);
        return ray.intersectObjects(shown(), true)[0]?.point.y ?? 0;
      };
      /** điểm trên mặt mẫu dưới con trỏ (tia từ máy quay); trượt khỏi mẫu thì lấy mặt phẳng ngang cao `y` */
      const hitAt = (nx: number, ny: number, y: number, out: THREE.Vector3) => {
        ray.setFromCamera(v2.set(nx, ny), k.camera);
        const h = ray.intersectObjects(shown(), true)[0];
        return h ? out.copy(h.point) : P.onPlane(nx, ny, y, out);
      };

      // vạch chấm (phần chưa cắt) và đường cắt đỏ (phần đã cắt) của từng bước cắt; điểm 3D dán lên mặt mẫu, tính lại khi lớp vừa chuyển động xong
      const cutSteps = spec.steps.map((s, i) => (s.kind === 'cut' ? i : -1)).filter((i) => i >= 0);
      const lines = new Map(cutSteps.map((i) => [i, {dash: k.line('#FBF9F4', 3, new Array(N_CUT * 6).fill(0), true), red: k.line('#C4261A', 5, new Array(N_CUT * 3).fill(0)), pts: [] as THREE.Vector3[], prog: -1, at: 0}]));
      for (const l of lines.values()) {
        Object.assign(l.dash.material, {depthTest: false, transparent: true, opacity: 0.9});
        l.dash.renderOrder = l.red.renderOrder = 4;
        k.scene.add(l.dash, l.red);
      }
      const layCut = (i: number) => {
        const s = spec.steps[i];
        if (s.kind !== 'cut') return;
        const l = lines.get(i)!;
        l.pts = Array.from({length: N_CUT}, (_, j) => {
          const [x, z] = pointAt(s.path, j / (N_CUT - 1));
          return new THREE.Vector3(x, surfaceY(x, z) + 0.015, z);
        });
        l.prog = -1;
      };
      const at = (l: {pts: THREE.Vector3[]}, u: number, out: THREE.Vector3) => {
        const f = Math.max(0, Math.min(1, u)) * (N_CUT - 1);
        const j = Math.min(Math.floor(f), N_CUT - 2);
        return out.copy(l.pts[j]).lerp(l.pts[j + 1], f - j);
      };
      const drawCut = (i: number, prog: number, visible: boolean) => {
        const l = lines.get(i)!;
        l.dash.visible = visible && prog < 1;
        l.red.visible = visible && prog > 0;
        if (!visible || !l.pts.length || Math.abs(prog - l.prog) < 1e-4) return;
        l.prog = prog;
        const red: number[] = [];
        const dash: number[] = [];
        for (let j = 0; j < N_CUT; j++) {
          at(l, Math.min(j / (N_CUT - 1), prog), v3);
          red.push(v3.x, v3.y, v3.z);
          // gạch rời: mỗi đoạn nửa khoảng cách mẫu, chỉ ở phần chưa cắt
          const u0 = Math.max(j / N_CUT, prog);
          const u1 = Math.max((j + 0.5) / N_CUT, prog);
          at(l, u0, v3);
          dash.push(v3.x, v3.y, v3.z);
          at(l, u1, v3);
          dash.push(v3.x, v3.y, v3.z);
        }
        setLine(l.red, red);
        setLine(l.dash, dash);
      };

      const leaders = k.line('#1F7A4D', 1.4, [0, 0, 0, 0, 0, 0], true);
      Object.assign(leaders.material, {depthTest: false, transparent: true, opacity: 0.7});
      leaders.renderOrder = 4;
      leaders.visible = false;
      k.scene.add(leaders);
      // vòng cam: đích ghim, điểm cầm của lớp, đầu đường cắt, chỗ nhỏ thuốc
      const rings = Array.from({length: 6}, () => {
        const r = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.022, 10, 36).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({color: ORANGE, depthTest: false, transparent: true}));
        r.renderOrder = 5;
        r.visible = false;
        k.scene.add(r);
        return r;
      });
      const drop = solid(k.scene, new THREE.SphereGeometry(0.045, 16, 12), '#E8F4FF', {rough: 0.05});
      drop.visible = false;
      let dropT = -1;
      const dropFrom = new THREE.Vector3();
      const dropTo = new THREE.Vector3();

      const drag: ({kind: 'cut'; prog: number; sent: number} | {kind: 'flap'; id: string; start: THREE.Vector3; a0: number; a: number} | null)[] = P.ptrs.map(() => null);
      const dwell = P.ptrs.map(() => ({id: '', t: 0}));
      let laidFor = -2;
      let laidAt = 0;
      let lastTool: THREE.Vector3 | null = null;
      let hoverOrgan: string | null = null;
      let last = performance.now();

      const center = (o: THREE.Object3D, out: THREE.Vector3) => box.setFromObject(o).getCenter(out);
      const organHit = (nx: number, ny: number, reach: number, st: DissectState): string | null => {
        const ok = [...organs.entries()].filter(([id, o]) => reachable(spec, st, id) && o.obj.visible && (spec.organs[id].mesh ? (flaps.get(spec.organs[id].mesh!.slice(2))?.shown ?? 0) < 0.5 : true));
        if (!ok.length) return null;
        ray.setFromCamera(v2.set(nx, ny), k.camera);
        const h = ray.intersectObjects(shown(), true)[0];
        for (let p: THREE.Object3D | null = h?.object ?? null; p; p = p.parent) if (p.userData.organ && ok.some(([id]) => id === p!.userData.organ)) return p.userData.organ as string;
        // tay qua webcam: không trúng thẳng thì lấy cơ quan có tâm gần nhất trong tầm với
        let best: string | null = null;
        let bd = reach * 0.6;
        for (const [id, o] of ok) {
          const d = P.distAt(nx, ny, center(o.obj, w3));
          if (d < bd) {
            bd = d;
            best = id;
          }
        }
        return best;
      };
      const targetAt = (nx: number, ny: number, reach: number): Target | null => {
        if (!ready) return null;
        const st = live.st;
        // khay dụng cụ chia thành năm băng ngang, mỗi băng một dụng cụ: chụm vào đâu trong băng cũng lấy được (đích to cho tay qua webcam)
        const q = P.onPlane(nx, ny, 0.05, v3);
        if (q.x > TRAY_X - 0.2 && q.x < TRAY_X + 1.45 && Math.abs(q.z) < 1.95) return {kind: 'tool', tool: TOOLS.reduce((a, t) => (Math.abs(q.z - SLOT[t]) < Math.abs(q.z - SLOT[a]) ? t : a))};
        const cur = current(spec, st);
        const s = spec.steps[cur];
        if (s?.kind === 'pin') {
          let best = -1;
          let bd = reach;
          s.targets.forEach(([x, z], i) => {
            if (st.pins[cur]?.includes(i)) return;
            const d = P.distAt(nx, ny, v3.set(x, surfaceY(x, z), z));
            if (d < bd) {
              bd = d;
              best = i;
            }
          });
          if (best >= 0) return {kind: 'pin', i: best};
        } else if (s?.kind === 'cut') {
          const p = hitAt(nx, ny, 0.3, v3);
          const r = cutAdvance(s.path, st.cut[cur] ?? 0, p.x, p.z, 0.45, 0.6);
          if (r.d < 0.45) return {kind: 'cut'};
        } else if (s?.kind === 'open') {
          let best: string | null = null;
          let bd = reach;
          for (const id of s.flaps) {
            const fl = flaps.get(id);
            if (!fl || (st.open[id] ?? 0) >= 1) continue;
            const d = P.distAt(nx, ny, gripWorld(fl, v3));
            if (d < bd) {
              bd = d;
              best = id;
            }
          }
          if (best) return {kind: 'flap', id: best};
        } else if (s?.kind === 'drop') {
          const o = organs.get(s.organ);
          if (o && P.distAt(nx, ny, center(o.obj, v3)) < reach * 1.3) return {kind: 'drop'};
        }
        const og = organHit(nx, ny, reach, st);
        return og ? {kind: 'organ', id: og} : null;
      };
      P.grabWhen((nx, ny) => targetAt(nx, ny, input.mouse.touch ? 0.16 : 0.07) !== null);

      const act = (tg: Target, n: number, ndc: THREE.Vector2) => {
        const st = live.st;
        const cur = current(spec, st);
        const need = spec.steps[cur] ? toolOf(spec.steps[cur]) : null;
        switch (tg.kind) {
          case 'tool':
            return live.dispatch({t: 'tool', tool: st.tool === tg.tool ? null : tg.tool});
          case 'organ':
            return live.dispatch({t: 'name', organ: tg.id});
          case 'pin':
            return live.dispatch(st.tool === 'pin' ? {t: 'pin', i: tg.i} : {t: 'wrong'});
          case 'drop':
            if (st.tool !== 'dropper') return live.dispatch({t: 'wrong'});
            live.dispatch({t: 'drop'});
            dropT = 0;
            dropFrom.copy(lastTool ?? v3.set(0, 1, 0));
            center(organs.get((spec.steps[cur] as {organ: string}).organ)!.obj, dropTo);
            return;
          case 'cut':
            if (st.tool !== need) return live.dispatch({t: 'wrong'});
            drag[n] = {kind: 'cut', prog: st.cut[cur] ?? 0, sent: st.cut[cur] ?? 0};
            return;
          case 'flap': {
            if (st.tool !== 'forceps') return live.dispatch({t: 'wrong'});
            const fl = flaps.get(tg.id)!;
            drag[n] = {kind: 'flap', id: tg.id, start: P.onPlane(ndc.x, ndc.y, gripWorld(fl, w3).y, new THREE.Vector3()), a0: fl.shown, a: fl.shown};
          }
        }
      };

      return () => {
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        P.step(1 - Math.exp(-dt * 28));
        if (!ready) return;
        const st = live.st;
        const cur = current(spec, st);
        const step = spec.steps[cur];

        // ---- con trỏ: kéo đang dở, rồi tìm đích dưới con trỏ
        let lead: THREE.Vector3 | null = null;
        let leadDown = false;
        let blade: THREE.Vector3 | null = null;
        hoverOrgan = null;
        for (const [n, p] of P.ptrs.entries()) {
          const dg = drag[n];
          if (!p.active) {
            drag[n] = null;
            continue;
          }
          if (dg) {
            p.hot = true;
            if (dg.kind === 'cut' && step?.kind === 'cut') {
              const h = hitAt(p.ndc.x, p.ndc.y, 0.3, v3);
              const r = cutAdvance(step.path, dg.prog, h.x, h.z, 0.45, 0.6);
              dg.prog = r.s;
              blade = new THREE.Vector3(r.at[0], surfaceY(r.at[0], r.at[1]), r.at[1]);
              if (r.s - dg.sent >= 0.04 || (r.s >= 0.97 && dg.sent < 1) || (!p.down && r.s > dg.sent)) {
                dg.sent = r.s >= 0.97 ? 1 : r.s;
                live.dispatch({t: 'cut', s: dg.sent});
              }
            } else if (dg.kind === 'flap') {
              const fl = flaps.get(dg.id)!;
              const q = P.onPlane(p.ndc.x, p.ndc.y, dg.start.y, w3);
              dg.a = Math.max(0, Math.min(1, dg.a0 + ((q.x - dg.start.x) * fl.dir.x + (q.z - dg.start.z) * fl.dir.y) / fl.len));
              fl.shown = dg.a;
              if (!p.down || dg.a >= 1) live.dispatch({t: 'open', flap: dg.id, v: dg.a >= 0.5 ? 1 : 0});
            }
            if (!p.down || (dg.kind === 'flap' && dg.a >= 1)) drag[n] = null;
          } else {
            const tg = targetAt(p.ndc.x, p.ndc.y, p.reach);
            p.hot = !!tg;
            if (tg?.kind === 'organ') {
              hoverOrgan = tg.id;
              // giữ yên tay trên cơ quan ~0,9 s cũng là gọi tên: không cần chụm (dễ với webcam)
              const dw = dwell[n];
              if (dw.id !== tg.id) Object.assign(dw, {id: tg.id, t: 0});
              dw.t += dt;
              if (dw.t > 0.9 && !st.named.includes(tg.id)) live.dispatch({t: 'name', organ: tg.id});
            } else dwell[n].id = '';
            if (p.pressed && tg) act(tg, n, p.ndc);
          }
          if (!lead || p.hand) {
            lead = hitAt(p.ndc.x, p.ndc.y, 0.3, new THREE.Vector3());
            leadDown = p.down;
          }
        }

        // ---- dụng cụ: đang cầm thì mũi theo con trỏ (khi cắt thì bám đúng đường cắt), còn lại nằm trên khay
        for (const [t, o] of tools) {
          const held = st.tool === t;
          const mats = toolMats.get(t)!;
          if (held) {
            const tip = blade ?? lead ?? lastTool;
            if (tip) {
              lastTool = (lastTool ?? new THREE.Vector3()).copy(tip);
              o.position.set(tip.x, tip.y + (blade || leadDown ? 0.02 : 0.22), tip.z);
            }
            o.quaternion.setFromEuler(HOLD[t]);
          } else {
            o.position.set(TRAY_X, 0.04, SLOT[t]);
            o.quaternion.identity();
          }
          mats.forEach((m) => m.emissive?.set(held ? '#5A2A10' : '#000000'));
        }

        // ---- lớp mở: kéo tay thì theo tay, thả ra thì trượt về trạng thái đã chốt
        let moving = false;
        for (const [id, fl] of flaps) {
          const dragging = drag.some((d) => d?.kind === 'flap' && d.id === id);
          if (!dragging) {
            const goal = st.open[id] ?? 0;
            const nxt = fl.shown + (goal - fl.shown) * (1 - Math.exp(-dt * 7));
            fl.shown = Math.abs(goal - nxt) < 0.002 ? goal : nxt;
          }
          if (Math.abs((st.open[id] ?? 0) - fl.shown) > 0.002) moving = true;
          applyFlap(fl, fl.shown);
        }
        // đường cắt dán lên mặt mẫu: tính khi tới bước cắt và một lần nữa khi các lớp vừa đứng yên
        if (laidFor !== cur || (!moving && laidAt > 0 && now - laidAt > 600)) {
          if (laidFor !== cur) laidAt = now;
          else laidAt = 0;
          laidFor = cur;
          for (const i of cutSteps) layCut(i);
        }
        for (const i of cutSteps) {
          const s = spec.steps[i];
          const nextOpen = spec.steps[i + 1];
          const opened = nextOpen?.kind === 'open' && nextOpen.flaps.some((f) => (flaps.get(f)?.shown ?? 0) > 0.05);
          const prog = i === cur ? Math.max(st.cut[i] ?? 0, drag.reduce((m, d) => (d?.kind === 'cut' ? Math.max(m, d.prog) : m), 0)) : st.cut[i] ?? 0;
          drawCut(i, prog, s.kind === 'cut' && i <= cur && !opened);
        }

        // ---- vòng cam chỉ chỗ làm của bước hiện tại
        const pulse = 1 + 0.12 * Math.sin(now / 180);
        const spots: THREE.Vector3[] = [];
        if (step?.kind === 'pin') step.targets.forEach(([x, z], i) => !st.pins[cur]?.includes(i) && spots.push(new THREE.Vector3(x, surfaceY(x, z) + 0.03, z)));
        else if (step?.kind === 'cut' && lines.get(cur)?.pts.length && !drag.some(Boolean)) spots.push(at(lines.get(cur)!, st.cut[cur] ?? 0, new THREE.Vector3()));
        else if (step?.kind === 'open') step.flaps.forEach((f) => (st.open[f] ?? 0) < 1 && flaps.get(f) && spots.push(gripWorld(flaps.get(f)!, new THREE.Vector3())));
        else if (step?.kind === 'drop' && organs.get(step.organ)) spots.push(center(organs.get(step.organ)!.obj, new THREE.Vector3()).add(v3.set(0, 0.15, 0)));
        rings.forEach((r, i) => {
          r.visible = i < spots.length;
          if (r.visible) {
            r.position.copy(spots[i]);
            r.scale.setScalar(pulse);
          }
        });

        // ---- kim đã cắm
        spec.steps.forEach((s, i) => {
          if (s.kind !== 'pin' || !pinProto) return;
          for (const j of st.pins[i] ?? []) {
            const key = `${i}:${j}`;
            if (placed.has(key)) continue;
            placed.add(key);
            const [x, z] = s.targets[j];
            const o = pinProto.clone(true);
            // kim cắm chếch ra phía ngoài mẫu như khi ghim thật; to hơn kim trên khay để nhìn rõ thân kim
            o.rotation.set(0, Math.atan2(-z, x - 0.3), Math.PI / 2 - 0.4, 'YXZ');
            o.scale.set(1, 2.4, 2.4);
            o.position.set(x, surfaceY(x, z) - 0.08, z);
            k.scene.add(o);
          }
        });

        // ---- cơ quan: tô sáng chỗ đang chỉ, thẻ tên + chức năng ngay trên cơ quan, nhãn ✓ cho cơ quan đã gọi tên; tim ếch đập
        const rate = reachable(spec, st, 'heart') ? beatRate(spec, st) : 0;
        const shownIds: string[] = [];
        for (const [id, o] of organs) {
          const on = id === hoverOrgan;
          o.mats.forEach((m) => {
            m.emissive?.set(on ? ORANGE : '#000000');
            if (m.emissive) m.emissiveIntensity = on ? 0.35 : 0;
          });
          if (rate && id === 'heart') {
            const ph = ((now / 1000) * rate) / 60;
            const beat = Math.pow(Math.max(0, Math.sin((ph % 1) * Math.PI * 2)), 3);
            o.obj.scale.copy(o.scale0).multiplyScalar(1 + 0.09 * beat);
          }
          const show = st.named.includes(id) && !on && o.obj.visible && reachable(spec, st, id) && (!spec.organs[id].mesh || (flaps.get(spec.organs[id].mesh!.slice(2))?.shown ?? 0) < 0.5);
          if (show) shownIds.push(id);
          else o.tag(null);
        }
        // nhãn ✓ xếp hàng dọc mép sau của khay (hai tầng so le, cách nhau ≥ 0,85) có đường chỉ tới đúng cơ quan: không chồng lên nhau, không che mẫu
        const cx = new Map(shownIds.map((id) => [id, center(organs.get(id)!.obj, new THREE.Vector3())] as const));
        shownIds.sort((a, b) => cx.get(a)!.x - cx.get(b)!.x);
        const mid = shownIds.length ? shownIds.reduce((a, id) => a + cx.get(id)!.x, 0) / shownIds.length : 0;
        const seg: number[] = [];
        shownIds.forEach((id, i) => {
          const c = cx.get(id)!;
          const lx = Math.max(-2.2, Math.min(2.4, mid - ((shownIds.length - 1) * 0.85) / 2 + i * 0.85));
          const lz = i % 2 ? -1.45 : -1.8;
          organs.get(id)!.tag(w3.set(lx, 0.12, lz));
          seg.push(lx, 0.12, lz + 0.05, c.x, c.y, c.z);
        });
        if (seg.length) setLine(leaders, seg);
        leaders.visible = seg.length > 0;
        if (hoverOrgan) {
          const og = spec.organs[hoverOrgan];
          card(center(organs.get(hoverOrgan)!.obj, v3).add(w3.set(0, 0.25, 0)), [{t: 'h', a: og.name}, {t: 'p', a: og.fn}, ...(rate && hoverOrgan === 'heart' ? [{t: 'kv' as const, a: 'Nhịp tim', b: `≈ ${rate} lần/phút`}] : [])]);
        } else card(null);

        // ---- giọt thuốc rơi từ ống nhỏ giọt xuống tim
        if (dropT >= 0) {
          dropT += dt / 0.45;
          drop.visible = dropT < 1;
          drop.position.lerpVectors(dropFrom, dropTo, ease(Math.min(1, dropT)));
          if (dropT >= 1) dropT = -1;
        }

        // ---- chú thích: việc cần làm + cách làm bằng tay
        const need = step ? toolOf(step) : null;
        const how = !step
          ? 'Hoàn thành tất cả các bước. Đưa tay lên từng cơ quan để xem lại tên và chức năng.'
          : need && st.tool !== need
            ? `Lấy ${TOOL_NAME[need].toLowerCase()} ở khay dụng cụ bên phải: đưa tay tới dụng cụ rồi chụm một lần (không cần giữ).`
            : step.kind === 'pin'
              ? 'Đưa kim tới vòng cam rồi chụm một lần để cắm kim.'
              : step.kind === 'cut'
                ? 'Chụm ở vòng cam (đầu vạch chấm) rồi kéo tay dọc vạch: lưỡi tự bám đường, lệch nhẹ vẫn cắt đúng.'
                : step.kind === 'open'
                  ? 'Chụm vào vòng cam ở mép lớp rồi kéo ra quá nửa đường: lớp tự lật hẳn.'
                  : step.kind === 'drop'
                    ? `Đưa ống nhỏ giọt tới vòng cam trên ${spec.organs[step.organ].name.toLowerCase()} rồi chụm một lần để nhỏ ${step.drug}.`
                    : 'Đưa tay tới từng cơ quan: thẻ tên hiện ngay trên cơ quan; giữ yên tay chừng 1 giây (hoặc chụm) để gọi tên.';
        k.caption(`${step ? `Bước ${cur + 1}/${spec.steps.length}: ${step.do}` : spec.name}${rate ? ` · tim ≈ ${rate} lần/phút` : ''}\n${st.warn || how}`);
      };
    },
  };
}

const HandsDissect3D: React.FC<{input: HandsInput; live: DissectLive; onFail: () => void}> = ({input, live, onFail}) => {
  const def = useMemo(() => makeDef(input, live), [input, live]);
  return <Stage3D fill def={def} p={{}} t={0} s={{}} onFail={onFail} />;
};
export default HandsDissect3D;
