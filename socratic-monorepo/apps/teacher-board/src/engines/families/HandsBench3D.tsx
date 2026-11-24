'use client';

import React, {useMemo} from 'react';
import * as THREE from 'three';
import {BENCH_ACTION, BENCH_KNIFE, BENCH_MOVES, BENCH_PICK, BENCH_PULL, BENCH_SETUP, dragT, grabOf, isTimeUnit, type BenchMove} from '../../utils/lab/hands/benchMoves';
import {AUTO_FLAG, isToggle, pickProp, tintOf, trayLayout} from '../../utils/lab/hands/benchPick';
import {OVER_R, wirePath, dropped, newSqueeze, newStir, pourStep, pourTilt, squash, squeezeStep, stirProgress, stirStep} from '../../utils/lab/hands/benchActs';
import {BENCH_FX, FX_PARTS} from './benchMotion';
import {BIO_FX, BIO_FX_PARTS} from './benchMotionBio';
import {bioRoom, graniteTop, handPointers, handSliders, labRoom, type HandsInput} from './handsKit';
import {solid} from './handsModels';
import {dress, glassify, loadModel, partOf} from './labParts';
import type {BenchLive} from './PhysBench';
import {Stage3D, setLine, type Kit, type SceneDef} from './Stage3D';

/** Cầu nối của bài thực hành SGK trong /lab: trạng thái đo đạc (do bảng điều khiển giữ) + tệp mô hình chứa bộ dụng cụ. */
export type Bench3DLive = BenchLive & {file: 'phys' | 'bio'};

/**
 * Cầm trực tiếp dụng cụ: chụm (hoặc nhấn chuột) vào bộ phận động rồi kéo; bộ phận bám theo tay, tham số của bài đổi theo.
 * Kéo theo trục của bộ phận (đứng / ngang); bộ phận chỉ phóng to thì kéo ngang. Vòng con trỏ chuyển cam khi chạm đúng bộ phận.
 */
interface Grabbable {
  obj: THREE.Object3D;
  m: BenchMove;
  read: () => number;
  write: (t: number) => void;
  text: () => string;
}
/** khoảng cách giữa các núm / đồng hồ cùng hàng mép bàn (đơn vị cảnh): đủ xa để tay trên webcam không chụm nhầm núm bên cạnh */
const DIAL_GAP = 1.4;
/** vị trí (x, z) núm / đồng hồ thứ j ở hàng mép bàn phía trước */
export const dialAt = (j: number): [number, number] => [-3.3 + j * DIAL_GAP, 2.3];
/** vị trí (x, z) công tắc chọn thứ i: cột 3 công tắc, quá 3 thì sang cột bên cạnh (mặt bàn chỉ sâu tới z ≈ 2,9) */
export const choiceAt = (i: number): [number, number] => [1.1 + Math.floor(i / 3) * 0.8, 0.9 + (i % 3) * 0.8];
/** nút đo (cam lớn) */
export const MEASURE_AT: [number, number] = [3.4, 2.45];
function partGrabs(k: Kit, P: ReturnType<typeof handPointers>, parts: () => Grabbable[], scale: () => number) {
  const ray = new THREE.Raycaster();
  const v2 = new THREE.Vector2();
  const box = new THREE.Box3();
  const plane = new THREE.Plane();
  /** mỗi bộ phận cầm được có vòng cam bao quanh và nhãn luôn hiện: nhìn là biết chỗ nào kéo được */
  const marks = new Map<THREE.Object3D, {ring: THREE.Mesh; tag: ReturnType<Kit['label']>}>();
  const markOf = (o: THREE.Object3D) => {
    let mk = marks.get(o);
    if (!mk) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.07, 8, 40).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({color: '#FF8A3D', transparent: true, opacity: 0.85, depthTest: false}));
      ring.renderOrder = 4;
      k.scene.add(ring);
      mk = {ring, tag: k.label('', '#D9481C')};
      marks.set(o, mk);
    }
    return mk;
  };
  let clock = 0;
  const held: ({p: Grabbable; t0: number; at: THREE.Vector3} | null)[] = P.ptrs.map(() => null);
  const centre = (o: THREE.Object3D, out = new THREE.Vector3()) => box.setFromObject(o).getCenter(out);
  /** bộ phận dưới con trỏ: trúng thẳng lưới của dụng cụ thì chọn (cầm ở bất kì chỗ nào của nó), không thì lấy bộ phận có tâm gần nhất trong tầm với (ngón tay không cần chính xác) */
  const near = (nx: number, ny: number, reach: number) => {
    ray.setFromCamera(v2.set(nx, ny), k.camera);
    let best: Grabbable | null = null;
    let bd = reach;
    const c = new THREE.Vector3();
    for (const p of parts()) {
      if (ray.intersectObject(p.obj, true).length) return p;
      const d = P.distAt(nx, ny, centre(p.obj, c));
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  };
  /** điểm của tia nhìn trên mặt phẳng đi qua `ref`: đứng (hướng về máy quay theo z) khi kéo lên xuống, nằm ngang khi kéo ngang */
  const on = (nx: number, ny: number, ref: THREE.Vector3, vertical: boolean) => {
    ray.setFromCamera(v2.set(nx, ny), k.camera);
    plane.set(vertical ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0), vertical ? -ref.z : -ref.y);
    return ray.ray.intersectPlane(plane, new THREE.Vector3()) ?? ref.clone();
  };
  return {
    grab: (nx: number, ny: number, reach = 0.09) => near(nx, ny, reach) !== null,
    step() {
      let shown: Grabbable | null = null;
      P.ptrs.forEach((ptr, n) => {
        const hover = ptr.active && !held[n] ? near(ptr.ndc.x, ptr.ndc.y, ptr.reach) : null;
        if (ptr.pressed && hover) held[n] = {p: hover, t0: hover.read(), at: on(ptr.ndc.x, ptr.ndc.y, centre(hover.obj), hover.m.axis === 'y')};
        if (ptr.released || !ptr.active) held[n] = null;
        const h = held[n];
        if (h) {
          const to = on(ptr.ndc.x, ptr.ndc.y, h.at, h.p.m.axis === 'y');
          const axis = h.p.m.axis === 'y' ? 'y' : h.p.m.axis === 'z' ? 'z' : 'x';
          h.p.write(dragT(h.p.m, h.t0, (to[axis] - h.at[axis]) / scale()));
          shown = h.p;
        } else if (hover) shown = hover;
        ptr.hot = !!hover || !!h;
      });
      clock += 0.05;
      const size = new THREE.Vector3();
      for (const p of parts()) {
        const mk = markOf(p.obj);
        const at = box.setFromObject(p.obj).getCenter(new THREE.Vector3());
        box.getSize(size);
        const active = (shown as Grabbable | null)?.obj === p.obj;
        mk.ring.position.copy(at);
        mk.ring.scale.setScalar(Math.min(0.6, Math.max(0.2, Math.max(size.x, size.z) / 2 + 0.1)) * (active ? 1.15 : 1 + 0.06 * Math.sin(clock * 2)));
        (mk.ring.material as THREE.MeshBasicMaterial).opacity = active ? 1 : 0.55;
        // nhãn chỉ hiện khi trỏ tới / đang kéo (vòng cam luôn có để biết chỗ kéo được); hiện hết thì chữ che dụng cụ
        mk.tag(active ? at.setY(box.max.y + 0.22) : null, undefined, `Kéo: ${p.m.what} · ${p.text()}`);
      }
    },
  };
}

const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toLocaleString('vi-VN', {maximumFractionDigits: d}) : '—');

/** Nút bấm tròn trên mặt bàn: chụm (hoặc nhấn chuột) vào nút = một lần bấm. */
function pads(k: Kit, P: ReturnType<typeof handPointers>, defs: {at: [number, number]; color: string; r: number; side?: boolean; text: () => string; press: () => void; notch?: () => [number, number]}[]) {
  const v3 = new THREE.Vector3();
  const rigs = defs.map((d) => {
    const base = solid(k.scene, new THREE.CylinderGeometry(d.r + 0.05, d.r + 0.07, 0.06, 28), '#2A2E66', {x: d.at[0], y: 0.03, z: d.at[1]});
    const cap = solid(k.scene, new THREE.CylinderGeometry(d.r, d.r, 0.1, 28), d.color, {x: d.at[0], y: 0.1, z: d.at[1], rough: 0.4});
    return {d, base, cap, tag: k.label(d.text()), down: 0};
  });
  // lựa chọn (có `notch`) là CÔNG TẮC XOAY chọn nấc dựng bằng Blender: mỗi lần chụm, núm vặn sang nấc kế tiếp
  void loadModel('/models/lab-parts.glb')
    .then((lib) =>
      rigs.forEach((r) => {
        if (!r.d.notch) return;
        dress(r.base, partOf(lib, 'SelectorBase'));
        dress(r.cap, partOf(lib, 'SelectorKnob'));
      }),
    )
    .catch(() => undefined);
  const near = (nx: number, ny: number, reach: number) => {
    let best = -1;
    let bd = reach;
    rigs.forEach((r, i) => {
      const dist = P.distAt(nx, ny, v3.copy(r.cap.position));
      if (dist < bd) {
        bd = dist;
        best = i;
      }
    });
    return best;
  };
  return {
    grab: (nx: number, ny: number, reach = 0.07) => near(nx, ny, reach) >= 0,
    step(dt: number) {
      P.ptrs.forEach((ptr) => {
        const i = ptr.active ? near(ptr.ndc.x, ptr.ndc.y, ptr.reach) : -1;
        if (i < 0) return;
        ptr.hot = true;
        if (ptr.pressed) {
          rigs[i].down = 0.18;
          rigs[i].d.press();
        }
      });
      for (const r of rigs) {
        r.down = Math.max(0, r.down - dt);
        r.cap.position.y = r.down > 0 ? 0.06 : 0.1; // nút lún xuống một nhịp khi bấm
        if (r.d.notch) {
          const [i, n] = r.d.notch();
          r.cap.rotation.y += (-(i - (n - 1) / 2) * 0.3 - r.cap.rotation.y) * Math.min(1, dt * 12); // núm xoay êm tới nấc đang chọn
        }
        r.tag(r.d.side ? v3.set(r.d.at[0] + 1.25, 0.1, r.d.at[1]) : v3.set(r.d.at[0], 0.1, r.d.at[1] + r.d.r + 0.3), undefined, r.d.text());
      }
    },
  };
}

function makeDef(input: HandsInput, live: Bench3DLive): SceneDef {
  return {
    floor: true,
    room: true,
    bright: live.file === 'bio',
    dist: 8.2,
    target: [-0.3, 0.45, 0.1],
    orbit: () => [0, 50],
    setup: (k) => {
      const e = live.e;
      // bài Sinh: phòng thí nghiệm sáng, mặt bàn đá đen lấm tấm; bài Lí giữ phòng tối
      if (live.file === 'bio') {
        bioRoom(k, [8.4, 5.6, -0.3, 0.1]);
        graniteTop(k, [8.4, 5.6, -0.3, 0.1]);
      } else {
        labRoom(k, [8.4, 5.6, -0.3, 0.1]);
        solid(k.scene, new THREE.BoxGeometry(8.4, 0.12, 5.6), '#1C1F4A', {rough: 0.9, x: -0.3, y: -0.056, z: 0.1});
      }
      const P = handPointers(k, input, 0.3);

      // bộ dụng cụ Blender của bài + các phần động theo thanh trượt
      const root = new THREE.Group();
      root.position.set(-0.3, 0, -0.8);
      root.scale.setScalar(1.4);
      let setObj: THREE.Object3D | null = null;
      k.scene.add(root);
      const movers: {obj: THREE.Object3D; base: THREE.Vector3; m: (typeof BENCH_MOVES)[string][number]}[] = [];
      /** mọi phần động theo số thứ tự (kể cả phần chạy tự do không gắn thanh trượt) để hiệu ứng chuyển động ghi đè */
      const byN = new Map<number, {obj: THREE.Object3D; base: THREE.Vector3; free: boolean}>();
      /** bộ dụng cụ (Set_ + Mov_) đã tải xong: trước đó bước cầm phần động phải CHỜ, không được coi là thiếu phần mà bỏ qua */
      let setLoaded = false;
      /** phần động chỉ dùng cho bước chuẩn bị (không thanh trượt, không hiệu ứng): mỗi khung hình về gốc rồi cộng độ lệch đang cầm / đang để ở mép bàn */
      const setupParts: {obj: THREE.Object3D; base: THREE.Vector3}[] = [];
      void loadModel(`/models/bench-${live.file}.glb`)
        .then((lib) => {
          const set = partOf(lib, `Set_${e.id}`);
          if (set) {
            glassify(set.obj);
            // mỗi bộ dụng cụ tự phóng vừa bàn theo kích thước thật: bộ thấp, gọn thì to; bộ cao (giá treo) hay dài (đường ray) thì nhỏ hơn để không bị cắt
            const bb = new THREE.Box3().setFromObject(set.obj);
            const sz = bb.getSize(new THREE.Vector3());
            const s = Math.min(1.7, Math.max(0.9, Math.min(7.4 / sz.x, 2.9 / sz.y, 3.0 / sz.z)));
            root.scale.setScalar(s);
            root.position.set(-0.3 - ((bb.min.x + bb.max.x) / 2) * s, 0, 0.75 - bb.max.z * s);
            root.add(set.obj);
            setObj = set.obj;
          }
          for (const m of BENCH_MOVES[e.id] ?? []) {
            const name = `Mov_${e.id}_${m.n}`;
            const src = lib.getObjectByName(name);
            const sk = partOf(lib, name);
            if (!src || !sk) continue;
            glassify(sk.obj);
            sk.obj.position.copy(src.position);
            root.add(sk.obj);
            movers.push({obj: sk.obj, base: src.position.clone(), m});
            byN.set(m.n, {obj: sk.obj, base: src.position.clone(), free: false});
          }
          for (const n of FX_PARTS[e.id] ?? BIO_FX_PARTS[e.id] ?? []) {
            if (byN.has(n)) continue;
            const name = `Mov_${e.id}_${n}`;
            const src = lib.getObjectByName(name);
            const sk = partOf(lib, name);
            if (!src || !sk) continue;
            glassify(sk.obj);
            sk.obj.position.copy(src.position);
            root.add(sk.obj);
            byN.set(n, {obj: sk.obj, base: src.position.clone(), free: true});
          }
          // phần động mà bước CHUẨN BỊ cầm đặt vào chỗ (thước, micro, lực kế, nhiệt kế…): nạp cả khi không gắn thanh trượt / hiệu ứng
          for (const s of setup) {
            const n = s.act?.part;
            if (n === undefined || byN.has(n)) continue;
            const name = `Mov_${e.id}_${n}`;
            const src = lib.getObjectByName(name);
            const sk = partOf(lib, name);
            if (!src || !sk) continue;
            glassify(sk.obj);
            sk.obj.position.copy(src.position);
            root.add(sk.obj);
            byN.set(n, {obj: sk.obj, base: src.position.clone(), free: false});
            setupParts.push({obj: sk.obj, base: src.position.clone()});
          }
          // chưa tới bước của nó thì vật nằm sẵn ở mép bàn (chưa lắp), không đứng sẵn đúng chỗ rồi mới "nhảy" ra mép bàn
          for (const [i, s] of setup.entries()) {
            const a = s.act;
            const q = a?.part !== undefined ? byN.get(a.part) : undefined;
            if (a && q && i >= stage && !partOffs.has(q.obj)) partOffs.set(q.obj, new THREE.Vector3(a.from[0] - q.base.x, 0.06 - q.base.y, a.from[2] - q.base.z));
          }
          setLoaded = true;
        })
        .catch(() => {
          setLoaded = true; // không tải được bộ dụng cụ: bước dùng phần động được bỏ qua thay vì kẹt
        });

      const slider = (key: string) => e.sliders.find((p) => p.key === key)!;
      const unit = (key: string) => {
        const p = slider(key);
        return (live.st.p[key] - p.min) / (p.max - p.min || 1);
      };
      // thanh trượt nào có bộ phận cầm được thì kéo thẳng dụng cụ, không cần ray ở mép bàn
      const timed = e.sliders.filter((p) => !grabOf(e.id, p.key) && isTimeUnit(p.unit));
      const railed = e.sliders.filter((p) => !grabOf(e.id, p.key) && !isTimeUnit(p.unit));
      const setParam = (key: string, t: number) => {
        const p = slider(key);
        const value = Math.min(p.max, Math.max(p.min, Math.round((p.min + (p.max - p.min) * t) / p.step) * p.step));
        if (value !== live.st.p[key]) live.dispatch({type: 'set', key, value});
      };
      // không còn thanh ray: mọi thông số không có bộ phận riêng đều là núm xoay hoặc đồng hồ hẹn giờ; `sliders` giữ cho các chỗ gọi bên dưới
      const sliders = handSliders(k, P, [], [-3.9, 1.4], setParam, () => '');
      const action = BENCH_ACTION[e.id] ?? 'Đo';
      // CHUẨN BỊ: chuỗi thao tác làm một lần trên dụng cụ (đặt, nối, treo, nhúng…); xong mới tới thao tác đo
      const setup = e.columns.length ? BENCH_SETUP[e.id] ?? [] : [];
      let stage = 0;
      let flash = 0;
      const setupDone = () => stage >= setup.length;
      const marks = setup.map((st) => {
        const g = new THREE.Group();
        g.position.set(...st.at);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.035, 10, 32).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({color: '#FF8A3D', transparent: true, opacity: 0.95, depthTest: false}));
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({color: '#FFE27A', depthTest: false}));
        ring.renderOrder = dot.renderOrder = 5;
        g.add(ring, dot);
        g.visible = false;
        root.add(g);
        return {g, ring, tag: k.label('', '#D9481C')};
      });
      const markWorld = new THREE.Vector3();
      // bước chuẩn bị = KÉO một vật (cục cam) từ mép bàn thả vào vòng cam trên dụng cụ: thao tác nắm–kéo–thả bằng tay, không bấm một nút
      const puck = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), new THREE.MeshStandardMaterial({color: '#FF8A3D', emissive: '#FF8A3D', emissiveIntensity: 0.6, roughness: 0.4}));
      puck.visible = false;
      root.add(puck);
      const puckTag = k.label('', '#D9481C');
      let puckFor = -1;
      let puckHeld = -1;
      const puckW = new THREE.Vector3();
      const puckAt = (nx: number, ny: number, reach: number) => {
        if (setupDone() || !puck.visible) return false;
        root.updateMatrixWorld();
        return P.distAt(nx, ny, root.localToWorld(puckW.copy(puck.position))) < reach;
      };
      const nearMark = puckAt;
      // ---- THAO TÁC THẬT (benchActs): vật thật từ `bench-props.glb` thay cho cục cam; đặt, rót, khuấy, bóp bóng bằng cử chỉ 2D
      let propLib: THREE.Object3D | null = null;
      void loadModel('/models/bench-props.glb')
        .then((l) => {
          propLib = l;
        })
        .catch(() => undefined);
      const A = {part: false, off: new THREE.Vector3(), home: new THREE.Vector3(), for: -1, obj: null as THREE.Object3D | null, held: -1, prog: 0, tilt: 0.12, sq: 0, stir: newStir(), pump: newSqueeze(), lipH: 0.4};
      // phần động có sẵn của bộ dụng cụ (`Mov_*`: xe, cổng quang, quả cân, bi, pit-tông…) làm vật để cầm: dịch ra mép bàn bằng một độ lệch `off` cộng lên sau mọi hiệu ứng
      const partOffs = new Map<THREE.Object3D, THREE.Vector3>();
      const partAnims: {off: THREE.Vector3; from: THREE.Vector3; to: THREE.Vector3; t: number}[] = [];
      const partTo = (off: THREE.Vector3, to: THREE.Vector3) => partAnims.push({off, from: off.clone(), to: to.clone(), t: 0});
      const localCenter = (o: THREE.Object3D) => root.worldToLocal(new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()));
      if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as {__bench?: unknown}).__bench = {A, partOffs, byN, stageOf: () => stage, setup, cam: k.camera, root};
      const anims: {obj: THREE.Object3D; from: THREE.Vector3; to: THREE.Vector3; ry: number; t: number}[] = [];
      const actTag = k.label('', '#D9481C');
      const streamMat = new THREE.MeshStandardMaterial({color: '#9CD0F0', transparent: true, opacity: 0.85, roughness: 0.1});
      const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1, 10), streamMat);
      stream.visible = false;
      root.add(stream);
      const pools = new Map<number, THREE.Mesh>();
      /** dây điện / ống mềm: ống tròn võng từ cực cố định (`anchor`) tới đuôi phích; chỉ dựng lại hình khi hai đầu đổi chỗ */
      const wires: {mesh: THREE.Mesh; obj: THREE.Object3D; anchor: [number, number, number]; h: number; r: number; key: string}[] = [];
      const cableMats = new Map<string, THREE.MeshStandardMaterial>();
      const cableMat = (c: {color: string; opacity?: number}) => {
        const k2 = `${c.color}|${c.opacity ?? 1}`;
        let m = cableMats.get(k2);
        if (!m) {
          m = new THREE.MeshStandardMaterial({color: c.color, roughness: 0.45, metalness: 0.05, transparent: (c.opacity ?? 1) < 1, opacity: c.opacity ?? 1});
          cableMats.set(k2, m);
        }
        return m;
      };
      const aw = new THREE.Vector3();
      const aq = new THREE.Vector3();
      const curAct = () => (setupDone() ? undefined : setup[stage].act);
      const localAt = (x: number, y: number, planeY: number) => {
        root.updateMatrixWorld();
        return root.worldToLocal(P.onPlane(x, y, root.localToWorld(aw.set(0, planeY, 0)).y, aq));
      };
      const worldPt = (v: THREE.Vector3) => {
        root.updateMatrixWorld();
        return root.localToWorld(aw.copy(v));
      };
      const goTo = (o: THREE.Object3D, to: THREE.Vector3, ry = 0) => {
        o.rotation.x = o.rotation.z = 0;
        anims.push({obj: o, from: o.position.clone(), to: to.clone(), ry, t: 0});
      };
      /** một bước thao tác xong: sang bước kế; vật cầm (lọ, chày) trả về chỗ cũ */
      const actFinish = (home?: THREE.Vector3) => {
        if (home && A.obj) goTo(A.obj, home);
        A.held = -1;
        stage++;
        flash = 0.5;
      };
      const ensureProp = () => {
        const a = curAct();
        if (!a || A.for === stage || !propLib) return;
        if (a.kind === 'press') {
          A.for = stage;
          A.obj = null;
          return;
        }
        if (a.kind === 'turn') {
          // ốc tai hồng trên ren ở đầu thanh: trục ren dọc theo thanh (x), học sinh vặn quanh trục đó
          const nut = new THREE.Group();
          const steel = new THREE.MeshStandardMaterial({color: '#C9CCD2', metalness: 0.85, roughness: 0.28});
          const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 12).rotateZ(Math.PI / 2), steel);
          const hex = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 6).rotateZ(Math.PI / 2), steel);
          const wing = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.035), steel);
          wing.position.x = 0.0;
          nut.add(rod, hex, wing);
          nut.position.set(...setup[stage].at);
          // ốc nằm TRÊN thanh: gắn vào chính phần động bị chỉnh để nghiêng / dao động cùng thanh
          const host = a.tilt ? byN.get(a.tilt.part)?.obj : undefined;
          if (host) {
            nut.position.sub(host.position);
            host.add(nut);
          } else root.add(nut);
          Object.assign(A, {part: false, for: stage, obj: nut, held: -1, prog: 0, tilt: 0.12, sq: 0, stir: newStir(), pump: newSqueeze(), lipH: 0});
          return;
        }
        if (a.part !== undefined) {
          if (!setLoaded) return;
          const q = byN.get(a.part);
          if (!q) {
            A.for = stage;
            A.obj = null;
            return actFinish(); // thiếu phần động: bỏ qua bước, không để học sinh kẹt
          }
          const off = new THREE.Vector3(a.from[0] - q.base.x, 0.06 - q.base.y, a.from[2] - q.base.z);
          partOffs.set(q.obj, off);
          Object.assign(A, {for: stage, obj: q.obj, part: true, off, home: off.clone(), held: -1, prog: 0, tilt: 0.12, sq: 0, lipH: 0.3});
          return;
        }
        const sk = partOf(propLib, `Prop_${a.prop}`);
        if (!sk) {
          A.for = stage;
          A.obj = null;
          return actFinish(); // thiếu mô hình: bỏ qua bước, không để học sinh kẹt
        }
        glassify(sk.obj, 0.18);
        // rót thuốc / hạt / cát: chất trong lọ lấy màu của thứ sắp rót
        if (a.kind === 'pour' && a.color) for (const m of sk.mats) if (m.name === 'tint') m.color.set(a.color);
        sk.obj.position.set(...(a.kind === 'squeeze' ? setup[stage].at : a.from));
        // phích chuối thật nhỏ hơn đồng hồ nhiều: thu lại để cắm vừa cực
        if (a.kind === 'connect' && a.prop === 'plug') sk.obj.scale.setScalar(0.55);
        // hộp bao đo TRƯỚC khi gắn vào bộ dụng cụ (bộ dụng cụ được phóng ×0,9–1,7): mọi kích thước dưới đây theo hệ của bộ dụng cụ
        const bb = new THREE.Box3().setFromObject(sk.obj);
        root.add(sk.obj);
        if (a.kind === 'connect') {
          // dây nối: một đầu cố định ở cực của thiết bị (`src`), đầu kia theo đuôi phích / đầu ống; cập nhật ở `frameAct`
          const c = a.cable ?? {color: '#C4261A', r: 0.014};
          const mesh = new THREE.Mesh(new THREE.BufferGeometry(), cableMat(c));
          mesh.castShadow = true;
          root.add(mesh);
          wires.push({mesh, obj: sk.obj, anchor: a.src ?? [a.from[0], 0.05, a.from[2] + 0.55], h: bb.max.y - sk.obj.position.y, r: c.r, key: ''});
        }
        Object.assign(A, {part: false, for: stage, obj: sk.obj, held: -1, prog: 0, tilt: 0.12, sq: 0, stir: newStir(), pump: newSqueeze(), lipH: Math.max(0.2, bb.max.y - sk.obj.position.y)});
      };
      /** nhận một con trỏ cho bước thao tác thật; true = con trỏ đang dùng cho vật này */
      const actInput = (ptr: (typeof P.ptrs)[number], n: number, dt: number): boolean => {
        ensureProp();
        const a = curAct();
        if (a?.kind === 'press') {
          // bấm công tắc: con trỏ ở vòng cam (đích đủ rộng cho tay) và chụm / nhấn một lần
          const [px, py, pz] = setup[stage].at;
          const onSwitch = ptr.active && P.distAt(ptr.ndc.x, ptr.ndc.y, worldPt(new THREE.Vector3(px, py, pz))) < Math.max(0.18, ptr.reach);
          ptr.hot = ptr.hot || onSwitch;
          if (ptr.pressed && onSwitch) {
            actFinish();
            return true;
          }
          return false;
        }
        const o = A.obj;
        if (!a || !o || A.for !== stage) return false;
        const {x, y} = ptr.ndc;
        const r = Math.max(0.14, ptr.reach);
        const [ax, ay, az] = setup[stage].at;
        const home = new THREE.Vector3(...a.from);
        // trong vòng lặp con trỏ các phần động vừa được đặt lại về vị trí gốc (độ lệch `off` được cộng ở cuối khung hình): tâm thật = tâm gốc + off
        const grab = A.part ? localCenter(o).add(A.off) : o.parent !== root ? nutAt.clone() : o.position.clone().add(new THREE.Vector3(0, A.lipH * 0.45, 0));
        const nearProp = ptr.active && P.distAt(x, y, worldPt(grab)) < r;
        if (A.held < 0 && ptr.pressed && nearProp) A.held = n;
        if (A.held !== n) return false;
        ptr.hot = true;
        const down = ptr.active && ptr.down;
        if (a.kind === 'turn') {
          // vặn: tay vẽ vòng quanh ốc (trên mặt phẳng ngang qua ốc); ốc quay theo góc đã quét, đủ số vòng thì xong
          if (!down) {
            A.held = -1;
            return true;
          }
          const h = localAt(x, y, ay);
          const c = o.parent !== root ? nutAt : new THREE.Vector3(ax, ay, az);
          A.stir = stirStep(A.stir, h.x, h.z, c.x, c.z, 0.03, 0.9);
          A.prog = stirProgress(A.stir, a.n ?? 2);
          o.rotation.x = A.stir.total;
          if (A.prog >= 1) actFinish();
          return true;
        }
        if (a.kind === 'squeeze') {
          A.pump = squeezeStep(A.pump, down, true);
          if (!down) A.held = -1;
          if (A.pump.pumps >= (a.n ?? 5)) actFinish();
          return true;
        }
        if (A.part) {
          // phần động của bộ dụng cụ: buông đúng vòng cam thì về chỗ của nó (độ lệch về 0), không thì về mép bàn
          if (!down) {
            if (dropped(P.distAt(x, y, worldPt(new THREE.Vector3(ax, ay, az))), Math.max(0.18, ptr.reach))) {
              partTo(A.off, new THREE.Vector3());
              actFinish();
            } else {
              A.held = -1;
              partTo(A.off, A.home);
            }
            return true;
          }
          const hp = localAt(x, y, ay);
          const c = localCenter(o).add(A.off);
          A.off.x += Math.max(-3.1, Math.min(3.1, hp.x)) - c.x;
          A.off.z += Math.max(-1.7, Math.min(2.6, hp.z)) - c.z;
          A.off.y += (ay + 0.25 - c.y) * 0.5;
          return true;
        }
        if (!down) {
          // buông: đặt vật nếu thả đúng chỗ, còn lại trả về chỗ cũ (tiến độ rót / khuấy vẫn giữ)
          if ((a.kind === 'place' || a.kind === 'connect') && dropped(P.distAt(x, y, worldPt(new THREE.Vector3(ax, ay, az))), Math.max(0.18, ptr.reach))) {
            goTo(o, new THREE.Vector3(...(a.rest ?? [ax, ay, az])), a.rot ?? 0);
            actFinish();
            return true;
          }
          goTo(o, home);
          A.held = -1;
          return true;
        }
        // vị trí tay tính trên CÙNG mặt phẳng với vòng cam: tay đặt đúng vòng cam trên màn hình thì vật ở đúng trên chỗ đó
        const h = localAt(x, y, ay);
        const planeY = ay + (a.kind === 'pour' ? 0.55 : a.kind === 'stir' ? 0.1 : 0.25);
        const hx = Math.max(-3.1, Math.min(3.1, h.x));
        const hz = Math.max(-1.7, Math.min(2.6, h.z));
        if (a.kind === 'place' || a.kind === 'connect') o.position.set(hx, ay + 0.2, hz);
        else if (a.kind === 'pour') {
          // vị trí tay = MIỆNG lọ; lọ nghiêng quanh miệng khi giữ trên dụng cụ đích
          const over = Math.hypot(hx - ax, hz - az) < OVER_R;
          A.tilt = pourTilt(A.tilt, over, true, dt);
          A.prog = pourStep(A.prog, dt, over && A.tilt > 0.8, true, a.n ?? 2.2);
          o.rotation.set(0, 0, A.tilt);
          o.position.set(hx + A.lipH * Math.sin(A.tilt), planeY - A.lipH * Math.cos(A.tilt), hz);
          if (A.prog >= 1) actFinish(home);
        } else if (a.kind === 'stir') {
          o.position.set(hx, ay + 0.02, hz);
          o.rotation.set((hz - az) * 0.5, 0, -(hx - ax) * 0.5);
          A.stir = stirStep(A.stir, hx, hz, ax, az, 0.05, 0.6);
          A.prog = stirProgress(A.stir, a.n ?? 3);
          if (A.prog >= 1) actFinish(home);
        }
        return true;
      };
      /** vật thật của bước hiện tại có đang dưới con trỏ không (để cảnh khoá xoay máy quay và nhận cú chụm / nhấn chuột) */
      const actNear = (nx: number, ny: number, reach: number) => {
        const pa = curAct();
        if (pa?.kind === 'press') return P.distAt(nx, ny, worldPt(new THREE.Vector3(...setup[stage].at))) < Math.max(0.18, reach);
        const o = A.obj;
        if (!curAct() || !o || A.for !== stage) return false;
        return A.held >= 0 || P.distAt(nx, ny, worldPt(A.part ? localCenter(o) : o.parent !== root ? nutAt.clone() : o.position.clone().add(new THREE.Vector3(0, A.lipH * 0.45, 0)))) < reach;
      };
      // chỉ khi phát triển: chỗ cầm của vật bước hiện tại (hệ bộ dụng cụ) cho máy dò trình duyệt kéo thử từng bước chuẩn bị
      if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined')
        Object.assign((window as unknown as {__bench: object}).__bench, {grabPt: () => (A.obj && A.for === stage ? (A.part ? localCenter(A.obj) : A.obj.parent !== root ? nutAt.clone() : A.obj.position.clone().add(new THREE.Vector3(0, A.lipH * 0.45, 0))) : null)});
      /** góc lệch còn lại của phần bị chỉnh bằng vặn ốc (thanh đòn chưa cân bằng) */
      let tiltNow = 0;
      /** chỗ ốc ĐANG HIỆN (hệ bộ dụng cụ), lấy sau khi thanh đã nghiêng xong khung trước: vòng con trỏ đầu khung đặt lại thanh về thẳng nên không đọc trực tiếp được */
      const nutAt = new THREE.Vector3();
      const tiltStep = setup.findIndex((st) => st.act?.kind === 'turn' && st.act.tilt);
      const frameAct = (dt: number, elapsed: number) => {
        ensureProp();
        if (tiltStep >= 0) {
          const tl = setup[tiltStep].act!.tilt!;
          if (stage < tiltStep) tiltNow = tl.angle;
          else if (stage > tiltStep) tiltNow = 0;
          const bar = byN.get(tl.part)?.obj;
          if (bar) bar.rotation.z += tiltNow;
          const nut = A.for === tiltStep ? A.obj : null;
          if (nut && nut.parent !== root) {
            nut.updateWorldMatrix(true, false);
            root.worldToLocal(nut.getWorldPosition(nutAt));
          }
        }
        for (let i = anims.length - 1; i >= 0; i--) {
          const m = anims[i];
          m.t = Math.min(1, m.t + dt / 0.3);
          const u = m.t * m.t * (3 - 2 * m.t);
          m.obj.position.lerpVectors(m.from, m.to, u);
          m.obj.rotation.y += (m.ry - m.obj.rotation.y) * u;
          if (m.t >= 1) anims.splice(i, 1);
        }
        for (const m of partAnims) {
          m.t = Math.min(1, m.t + dt / 0.35);
          m.off.lerpVectors(m.from, m.to, m.t * m.t * (3 - 2 * m.t));
        }
        for (let i = partAnims.length - 1; i >= 0; i--) if (partAnims[i].t >= 1) partAnims.splice(i, 1);
        for (const [po, off] of partOffs) po.position.add(off);
        // dây nối theo đuôi phích (cả phích đang cầm và phích đã nối xong)
        for (const w of wires) {
          const tail: [number, number, number] = [w.obj.position.x, w.obj.position.y + w.h * 0.92, w.obj.position.z];
          const key = tail.map((x) => x.toFixed(3)).join();
          if (key === w.key) continue;
          w.key = key;
          const curve = new THREE.CatmullRomCurve3(wirePath(w.anchor, tail, 16).map((q) => new THREE.Vector3(...q)));
          w.mesh.geometry.dispose();
          w.mesh.geometry = new THREE.TubeGeometry(curve, 40, w.r, 8, false);
        }
        const a = curAct();
        const o = A.obj;
        stream.visible = false;
        if (a?.kind === 'press') {
          const [px, py, pz] = setup[stage].at;
          return actTag(worldPt(aw.set(px, py + 0.95, pz)), undefined, `${a.verb}: chụm một lần vào vòng cam (công tắc) để bật`);
        }
        if (!a || !o || A.for !== stage) return actTag(null);
        const [ax, ay, az] = setup[stage].at;
        if (A.held < 0 && a.kind === 'pour') A.tilt += (0.12 - A.tilt) * (1 - Math.exp(-dt * 7));
        if (a.kind === 'squeeze') {
          A.sq = squash(A.pump.down, A.sq, dt);
          o.scale.set(1 + 0.14 * A.sq, 1 - 0.34 * A.sq, 1 + 0.14 * A.sq);
        }
        if (a.kind === 'pour') {
          let pool = pools.get(stage);
          if (!pool) {
            pool = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1, 24), new THREE.MeshStandardMaterial({color: a.color ?? '#9CD0F0', transparent: true, opacity: 0.75, roughness: 0.1}));
            root.add(pool);
            pools.set(stage, pool);
          }
          const ph = 0.02 + 0.2 * A.prog;
          pool.visible = A.prog > 0;
          pool.scale.set(1, ph, 1);
          pool.position.set(ax, ay - 0.28 + ph / 2, az);
          if (A.held >= 0 && A.tilt > 0.8 && A.prog < 1) {
            const lipY = o.position.y + A.lipH * Math.cos(A.tilt);
            const lipX = o.position.x - A.lipH * Math.sin(A.tilt);
            const low = ay - 0.28 + ph;
            streamMat.color.set(a.color ?? '#9CD0F0');
            stream.visible = true;
            stream.scale.set(1, Math.max(0.05, lipY - low), 1);
            stream.position.set(lipX, (lipY + low) / 2, o.position.z);
          }
        }
        if (a.kind === 'turn' && a.tilt) tiltNow = a.tilt.angle * (1 - A.prog);
        const pct = Math.round(A.prog * 100);
        const turns = Math.min(a.n ?? 3, Math.floor((A.stir.total / (2 * Math.PI)) * 10) / 10);
        const hint =
          a.kind === 'connect'
            ? a.prop === 'nozzle'
              ? `${a.verb} ống: chụm đầu ống, kéo tới núm (vòng cam) rồi buông`
              : `Nối dây: chụm phích, kéo tới vòng cam (chốt cần nối) rồi buông`
          : a.kind === 'turn'
            ? A.held >= 0 ? `Vẽ vòng tròn quanh ốc — ${turns}/${a.n ?? 2} vòng` : `${a.verb}: chụm vào ốc (vòng cam) rồi vẽ vòng tròn quanh ốc`
          : a.kind === 'place'
            ? `${a.verb}: chụm vật rồi kéo vào vòng cam và buông`
            : a.kind === 'pour'
              ? A.held >= 0 ? `Giữ yên miệng lọ trên vòng cam — đã rót ${pct} %` : `${a.verb}: chụm lọ, đưa miệng lọ tới vòng cam rồi giữ yên`
              : a.kind === 'stir'
                ? A.held >= 0 ? `Vẽ vòng tròn quanh vòng cam — ${turns}/${a.n ?? 3} vòng` : `${a.verb}: chụm chày (đũa), đưa vào vòng cam rồi vẽ vòng tròn`
                : `${a.verb}: chụm giữ để bóp, nhả để phồng — ${A.pump.pumps}/${a.n ?? 5} nhịp`;
        actTag(worldPt(aw.set(ax, ay + (a.kind === 'squeeze' ? 0.75 : 0.95) + 0.05 * Math.sin(elapsed * 4), az)), undefined, hint);
      };
      // mỗi lựa chọn của bài là một nút tròn: bấm = sang lựa chọn kế tiếp; nút cam lớn = một lần đo
      const cycle = (c: NonNullable<typeof e.choices>[number]) => {
        const at = c.options.findIndex((o) => o[0] === live.st.s[c.key]);
        live.dispatch({type: 'choose', key: c.key, value: c.options[(at + 1) % c.options.length][0]});
      };
      // ---- CHỌN phương án bằng VẬT THẬT (benchPick): mỗi phương án là một vật trên khay ở mép bàn; cầm một vật đặt vào vòng vàng ở dụng cụ để chọn
      const choices = e.choices ?? [];
      const targetOf = (c: (typeof choices)[number], i: number): [number, number, number] => BENCH_PICK[e.id]?.[c.key] ?? [-0.6 + i * 0.9, 0.2, 0.2];
      const TRAY_Z = 2.0;
      const toggles = choices.map((c) => isToggle(c.options.map((o) => o[1])));
      // cờ do bước chuẩn bị đặt (AUTO_FLAG): không có vật, không có vòng; cảnh tự đặt "Rồi" khi bước làm xong
      const autoStep = choices.map((c) => AUTO_FLAG[e.id]?.[c.key]);
      const groups = choices.map((c, i) => (autoStep[i] !== undefined ? 0 : toggles[i] ? 1 : c.options.length));
      const slotsX = trayLayout(groups);
      type PickItem = {ci: number; opt: number; obj: THREE.Object3D | null; slot: THREE.Vector3; tag: ReturnType<typeof k.label>; held: boolean; label: string};
      const pickItems: PickItem[] = choices.flatMap((c, ci) =>
        slotsX[ci].map((x, j) => {
          const opt = toggles[ci] ? 1 : j;
          return {ci, opt, obj: null, slot: new THREE.Vector3(x, 0, TRAY_Z), tag: k.label('', '#8A6A12'), held: false, label: toggles[ci] ? `${c.label}: ${c.options[1][1]}` : c.options[opt][1]} as PickItem;
        }),
      );
      const pickRings = choices.map((c, i) => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.028, 8, 32).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({color: '#E3B341', transparent: true, opacity: 0.95, depthTest: false}));
        ring.position.set(...targetOf(c, i));
        ring.renderOrder = 5;
        ring.visible = autoStep[i] === undefined;
        root.add(ring);
        return {ring, tag: k.label('', '#8A6A12')};
      });
      if (pickItems.length) {
        // khay: tấm lót sẫm dọc mép bàn phía người nhìn
        const mat = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.012, 0.46), new THREE.MeshStandardMaterial({color: '#4A4E6E', roughness: 0.9, transparent: true, opacity: 0.28}));
        mat.position.set(0, 0.01, TRAY_Z);
        root.add(mat);
      }
      let pickFail = false;
      const stateOn = (it: PickItem) => {
        const c = choices[it.ci];
        return live.st.s[c.key] === c.options[it.opt][0];
      };
      const choose = (it: PickItem, on: boolean) => {
        const c = choices[it.ci];
        const value = toggles[it.ci] ? c.options[on ? 1 : 0][0] : c.options[it.opt][0];
        if (live.st.s[c.key] !== value) live.dispatch({type: 'choose', key: c.key, value});
      };
      // vật chọn nằm trên MẶT dụng cụ dưới vòng vàng: bắn tia từ vòng vàng xuống bộ dụng cụ lấy độ cao (không lơ lửng); chưa tải xong thì hạ 0,1
      const surfRay = new THREE.Raycaster();
      const surfCache = new Map<string, number>();
      const surfaceAt = (tx: number, ty: number, tz: number): number => {
        const key = `${tx},${ty},${tz}`;
        if (surfCache.has(key)) return surfCache.get(key)!;
        if (!setObj) return Math.max(0, ty - 0.1);
        root.updateMatrixWorld(true);
        surfRay.set(root.localToWorld(new THREE.Vector3(tx, ty + 0.15, tz)), new THREE.Vector3(0, -1, 0));
        const h = surfRay.intersectObject(setObj, true)[0];
        const y = h ? Math.max(0, root.worldToLocal(h.point.clone()).y) : 0;
        surfCache.set(key, y);
        return y;
      };
      const pickRest = (it: PickItem) => {
        const [tx, ty, tz] = targetOf(choices[it.ci], it.ci);
        return new THREE.Vector3(tx, surfaceAt(tx, ty, tz), tz);
      };
      const buildPickItems = () => {
        if (!propLib || pickFail || pickItems.every((it) => it.obj)) return;
        for (const it of pickItems) {
          if (it.obj) continue;
          const c = choices[it.ci];
          const sk = partOf(propLib, `Prop_${pickProp(e.id, c.key, it.opt)}`);
          if (!sk) {
            pickFail = true; // thiếu mô hình: quay về cách chạm vòng vàng để đổi, không để học sinh kẹt
            continue;
          }
          glassify(sk.obj, 0.2);
          const col = new THREE.Color(tintOf(c.options[it.opt][1], it.opt));
          for (const m of sk.mats) if (m.name === 'tint') m.color.copy(col);
          sk.obj.position.copy(it.slot);
          root.add(sk.obj);
          it.obj = sk.obj;
        }
      };
      const pickWorld = new THREE.Vector3();
      const pickGrab = (it: PickItem) => new THREE.Vector3().copy(it.obj!.position).add(new THREE.Vector3(0, 0.15, 0));
      /** vật chọn dưới con trỏ (gần nhất trong tầm với) */
      const pickAt = (nx: number, ny: number, reach: number) => {
        root.updateMatrixWorld();
        let best: PickItem | undefined;
        let bd = reach;
        for (const it of pickItems) {
          if (!it.obj) continue;
          const d = P.distAt(nx, ny, root.localToWorld(pickWorld.copy(pickGrab(it))));
          if (d < bd) {
            bd = d;
            best = it;
          }
        }
        return best;
      };
      const pickRingAt = (nx: number, ny: number, reach: number) => {
        root.updateMatrixWorld();
        return pickFail ? pickRings.findIndex((q) => P.distAt(nx, ny, root.localToWorld(pickWorld.copy(q.ring.position))) < reach) : -1;
      };
      /** nhận một con trỏ cho việc chọn bằng vật; true = con trỏ đang cầm / vừa nhả một vật chọn */
      const pickInput = (ptr: (typeof P.ptrs)[number], n: number): boolean => {
        const {x, y} = ptr.ndc;
        const down = ptr.active && ptr.down;
        const held = pickItems.find((it) => it.held && pickHeldBy.get(it) === n);
        if (held) {
          ptr.hot = true;
          if (down) {
            const ci = held.ci;
            const [, ty] = targetOf(choices[ci], ci);
            const h = localAt(x, y, ty);
            pickPos.set(Math.max(-3.1, Math.min(3.1, h.x)), ty + 0.22, Math.max(-1.7, Math.min(2.6, h.z)));
            return true;
          }
          // buông: gần vòng vàng thì chọn phương án của vật này; không thì vật về chỗ (khay, hoặc vòng vàng nếu đang là phương án chọn)
          const ci = held.ci;
          const near = P.distAt(x, y, root.localToWorld(pickWorld.copy(pickRings[ci].ring.position))) < Math.max(0.2, ptr.reach);
          held.held = false;
          pickHeldBy.delete(held);
          if (near) choose(held, true);
          else if (toggles[ci]) choose(held, false);
          return true;
        }
        if (!ptr.pressed || !ptr.active) return false;
        const it = pickAt(x, y, Math.max(0.14, ptr.reach));
        if (!it) return false;
        it.held = true;
        pickHeldBy.set(it, n);
        pickPos.copy(it.obj!.position);
        return true;
      };
      const pickHeldBy = new Map<PickItem, number>();
      const pickPos = new THREE.Vector3();
      const framePick = (dt: number) => {
        buildPickItems();
        const f = 1 - Math.exp(-dt * 12);
        // cờ do bước chuẩn bị đặt: làm xong bước thì tự thành "Rồi"
        choices.forEach((c, i) => {
          const st = autoStep[i];
          if (st !== undefined && stage > st && live.st.s[c.key] !== c.options[1][0]) live.dispatch({type: 'choose', key: c.key, value: c.options[1][0]});
        });
        const hovered = new Set(P.ptrs.filter((q) => q.active).map((q) => pickAt(q.ndc.x, q.ndc.y, 0.16)).filter(Boolean));
        for (const it of pickItems) {
          if (!it.obj) continue;
          const on = stateOn(it);
          const goal = it.held ? pickPos : on ? pickRest(it) : it.slot;
          it.obj.position.lerp(goal, it.held ? 1 : f);
          it.obj.rotation.set(0, 0, 0);
          const c = choices[it.ci];
          root.updateMatrixWorld();
          // nhãn xen kẽ hai tầng và rút gọn cho khỏi chồng nhau; chỉ hiện đủ tên khi trỏ vào hoặc đang cầm
          const full = it.held || hovered.has(it);
          const short = it.label.length > 16 ? `${it.label.slice(0, 15)}…` : it.label;
          it.tag(root.localToWorld(pickWorld.copy(it.obj.position).add(new THREE.Vector3(0, full ? 0.95 : 0.5 + (pickItems.indexOf(it) % 2) * 0.32, 0))), undefined, `${on ? '✓ ' : ''}${full ? it.label : short}`);
          void c;
        }
        choices.forEach((c, i) => {
          const cur = c.options.find((o) => o[0] === live.st.s[c.key])?.[1] ?? '';
          const [tx, ty, tz] = targetOf(c, i);
          root.updateMatrixWorld();
          pickRings[i].ring.scale.setScalar(1 + 0.1 * Math.sin(performance.now() / 260 + i));
          if (autoStep[i] !== undefined) return pickRings[i].tag(null);
          pickRings[i].tag(root.localToWorld(pickWorld.set(tx, ty + 0.75, tz)), undefined, pickFail ? `${c.label}: ${cur} · chạm để đổi` : `Chọn "${c.label}": ${cur} — cầm một vật ở khay, đặt vào vòng vàng`);
        });
      };
      const buttons = pads(k, P, []);
      // bộ phận chỉ có sau khi mô hình tải xong nên danh sách lấy theo từng khung hình
      const unitText = (key: string) => `${fmt(live.st.p[key], 3)}${slider(key).unit ? ` ${slider(key).unit}` : ''}`;
      // thông số thời gian: ĐỒNG HỒ HẸN GIỜ nằm trên bàn (Blender), chụm rồi kéo ngang để quay kim (một vòng 300° = cả thang)
      const timers = timed.map((p, j) => {
        const [x] = dialAt(j);
        const body = solid(k.scene, new THREE.CylinderGeometry(0.3, 0.32, 0.08, 36), '#C9CED6', {x, y: 0.04, z: 2.3, metal: 0.6});
        const hand = solid(k.scene, new THREE.BoxGeometry(0.03, 0.02, 0.24).translate(0, 0, -0.12), '#C4261A', {x, y: 0.1, z: 2.3});
        const m: BenchMove = {n: 0, param: p.key, axis: 'rz', a: 0, b: 0, what: 'đồng hồ hẹn giờ'};
        return {p, body, hand, tag: k.label(p.label), grab: {obj: body, m, read: () => unit(p.key), write: (t: number) => setParam(p.key, t), text: () => unitText(p.key)}};
      });
      if (timers.length)
        void loadModel('/models/lab-parts.glb')
          .then((lib) =>
            timers.forEach((t) => {
              dress(t.body, partOf(lib, 'TimerBody'));
              dress(t.hand, partOf(lib, 'TimerHand'));
            }),
          )
          .catch(() => undefined);
      // thông số số học còn lại: NÚM XOAY chia độ (Blender `KnobDial` + `KnobCap`), chụm rồi kéo ngang để vặn (sang phải = tăng), cùng hàng với đồng hồ hẹn giờ
      const SWEEP = 1.5 * Math.PI;
      const dials = railed.map((p, j) => {
        const [x] = dialAt(timed.length + j);
        const base = solid(k.scene, new THREE.CylinderGeometry(0.27, 0.3, 0.08, 28), '#3A3E7A', {x, y: 0.04, z: 2.3});
        const cap = solid(k.scene, new THREE.CylinderGeometry(0.2, 0.22, 0.2, 28), '#E3B341', {x, y: 0.18, z: 2.3, metal: 0.4});
        solid(cap, new THREE.BoxGeometry(0.05, 0.05, 0.17), '#1D1B16', {y: 0.12, z: -0.09});
        const m: BenchMove = {n: 0, param: p.key, axis: 'rz', a: 0, b: 0, what: 'núm vặn'};
        return {p, x, base, cap, tag: k.label(p.label), grab: {obj: cap, m, read: () => unit(p.key), write: (t: number) => setParam(p.key, t), text: () => unitText(p.key)}};
      });
      if (dials.length)
        void loadModel('/models/lab-parts.glb')
          .then((lib) =>
            dials.forEach((d) => {
              d.base.visible = false;
              const dial = partOf(lib, 'KnobDial');
              if (dial) k.scene.add(dial.obj.translateX(d.x).translateZ(2.3));
              dress(d.cap, partOf(lib, 'KnobCap'));
            }),
          )
          .catch(() => undefined);
      const timerGrabs = partGrabs(k, P, () => [...timers, ...dials].map((t) => t.grab), () => 1);
      const timerAt = new THREE.Vector3();
      const grabs = partGrabs(
        k,
        P,
        () => movers.filter((mv) => mv.m.what && grabOf(e.id, mv.m.param)?.n === mv.m.n).map((mv) => ({obj: mv.obj, m: mv.m, read: () => unit(mv.m.param), write: (t: number) => setParam(mv.m.param, t), text: () => unitText(mv.m.param)})),
        () => root.scale.x,
      );
      // LÀM thí nghiệm: chạm (chụm / nhấn) vào chính dụng cụ = thực hiện thao tác của bài (thả xe, thả bi, gõ âm thoa…): thí nghiệm chạy lại từ đầu
      // và một dòng số đo được ghi. Dụng cụ để chạm: các vật chuyển động của bài (xe, bi, con lắc…), bài không có thì là cả bộ dụng cụ.
      const pokeRay = new THREE.Raycaster();
      const pokeV = new THREE.Vector2();
      let pokes = 0;
      const targets = (): THREE.Object3D[] => {
        const free = [...byN.values()].filter((q) => q.free).map((q) => q.obj);
        return free.length ? free : setObj ? [setObj] : [];
      };
      // `reach` > 0 (bàn tay): trúng nếu tia ở tâm HOẶC một trong 8 tia quanh đó trong tầm với chạm vật, vì ngón chụm trên webcam khó trúng đúng vật nhỏ (bi, quả lắc)
      const ringAt = Array.from({length: 8}, (_, i) => [Math.cos((i * Math.PI) / 4), Math.sin((i * Math.PI) / 4)]);
      const onMover = (nx: number, ny: number, reach = 0) => {
        const objs = targets();
        const hitAt = (x: number, y: number) => {
          pokeRay.setFromCamera(pokeV.set(x, y), k.camera);
          return objs.some((o) => pokeRay.intersectObject(o, true).length > 0);
        };
        return hitAt(nx, ny) || (reach > 0 && ringAt.some(([c, s]) => hitAt(nx + (c * reach * 0.8) / k.camera.aspect, ny + s * reach * 0.8)));
      };
      const doTag = k.label('', '#1F7A4D');
      // KÉO–THẢ vật chuyển động (BENCH_PULL): chụm vào vật, kéo lệch theo hướng của bài, thả ra thì thí nghiệm chạy
      const pull = BENCH_PULL[e.id];
      let pullHeld = -1;
      let pullD = 0;
      let pullFrom = 0;
      const pullStart = new THREE.Vector3();
      const pullPt = new THREE.Vector3();
      const pullPlane = new THREE.Plane();
      const pullDir = pull ? new THREE.Vector3(...pull.dir) : new THREE.Vector3();
      const pullObj = () => (pull ? byN.get(pull.n)?.obj : undefined);
      /** điểm của tia nhìn trên mặt phẳng đi qua `at`: nằm ngang khi kéo ngang, đứng (hướng về máy quay) khi kéo lên xuống */
      const pullOn = (nx: number, ny: number, at: THREE.Vector3, out: THREE.Vector3) => {
        pokeRay.setFromCamera(pokeV.set(nx, ny), k.camera);
        pullPlane.setFromNormalAndCoplanarPoint(Math.abs(pullDir.y) > 0.5 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0), at);
        return pokeRay.ray.intersectPlane(pullPlane, out) ?? out.copy(at);
      };
      const pullNear = (nx: number, ny: number, reach: number) => {
        const o = pullObj();
        if (!o || setupDone() === false) return false;
        pokeRay.setFromCamera(pokeV.set(nx, ny), k.camera);
        if (pokeRay.intersectObject(o, true).length) return true;
        return P.distAt(nx, ny, doBox.setFromObject(o).getCenter(pullPt)) < reach;
      };
      // THAO TÁC LÀM THÍ NGHIỆM cho bài không có vật để kéo: một KHÓA / CẦN GẠT thật đặt trước dụng cụ. Bài điện: khóa dao (lưỡi đồng quay từ mở sang đóng);
      // bài khác: cần trượt trên ray. Nắm tay cầm, gạt hết hành trình thì thí nghiệm chạy và ghi số đo; thả ra cần bật về vị trí mở.
      const knife = BENCH_KNIFE.has(e.id);
      const levOn = e.columns.length > 0 && !pull;
      const lev = new THREE.Group();
      const levBase = new THREE.MeshStandardMaterial({color: knife ? '#1A1A1C' : '#2A2E66', roughness: 0.5});
      const levMetal = new THREE.MeshStandardMaterial({color: '#C98A4A', metalness: 0.8, roughness: 0.3});
      const levHandle = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), new THREE.MeshStandardMaterial({color: '#FF8A3D', emissive: '#FF8A3D', emissiveIntensity: 0.5, roughness: 0.4}));
      const blade = new THREE.Group();
      if (knife) {
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.3), levBase);
        base.position.set(0.3, 0.03, 0);
        lev.add(base);
        for (const px of [0, 0.62]) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.12, 14), levMetal);
          post.position.set(px, 0.12, 0);
          lev.add(post);
        }
        const bl = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.025, 0.06), levMetal);
        bl.position.set(0.31, 0, 0);
        blade.add(bl);
        levHandle.position.set(0.66, 0, 0);
        blade.add(levHandle);
        blade.position.set(0, 0.18, 0);
        lev.add(blade);
      } else {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.16), levBase);
        rail.position.set(0.55, 0.025, 0);
        lev.add(rail);
        const groove = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.012, 0.04), new THREE.MeshStandardMaterial({color: '#0B0E2A'}));
        groove.position.set(0.55, 0.055, 0);
        lev.add(groove);
        const goal = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.015, 20), new THREE.MeshStandardMaterial({color: '#3CCB7F', emissive: '#3CCB7F', emissiveIntensity: 0.5}));
        goal.position.set(1.1, 0.06, 0);
        lev.add(goal);
        levHandle.position.set(0.05, 0.14, 0);
        lev.add(levHandle);
      }
      lev.visible = false;
      root.add(lev);
      const levTag = k.label('', '#D9481C');
      let levT = 0;
      let levHeld = -1;
      let levLock = false;
      let levPlaced = false;
      const levPos = new THREE.Vector3();
      const levW = new THREE.Vector3();
      const levPlane = new THREE.Plane();
      const levQ = new THREE.Vector3();
      const KNIFE_OPEN = 1.15;
      /** đặt khóa ở mép phía người nhìn của bộ dụng cụ, lệch sang trái để không đè nút chọn */
      const levPlace = () => {
        if (levPlaced || !setObj) return;
        const bb = new THREE.Box3().setFromObject(setObj);
        const a = root.worldToLocal(bb.min.clone());
        const b = root.worldToLocal(bb.max.clone());
        levPos.set(Math.max(-2.6, Math.min(1.6, (a.x + b.x) / 2 - 0.6)), 0.0, Math.min(1.9, Math.max(a.z, b.z) + 0.55));
        lev.position.copy(levPos);
        levPlaced = true;
      };
      const levHandleWorld = (out: THREE.Vector3) => levHandle.getWorldPosition(out);
      const levNear = (nx: number, ny: number, reach: number) => {
        if (!levOn || !levPlaced || !setupDone()) return false;
        root.updateMatrixWorld();
        return P.distAt(nx, ny, levHandleWorld(levW)) < reach;
      };
      /** tiến độ 0..1 của cần theo vị trí con trỏ: khóa dao = góc lưỡi, cần trượt = vị trí trên ray */
      const levFrom = (nx: number, ny: number) => {
        pokeRay.setFromCamera(pokeV.set(nx, ny), k.camera);
        root.updateMatrixWorld();
        const o = lev.localToWorld(levW.set(0, knife ? 0.18 : 0.14, 0));
        levPlane.setFromNormalAndCoplanarPoint(knife ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0), o);
        const q = pokeRay.ray.intersectPlane(levPlane, levQ);
        if (!q) return levT;
        lev.worldToLocal(q);
        if (knife) return 1 - Math.max(0, Math.min(KNIFE_OPEN, Math.atan2(q.y - 0.18, q.x))) / KNIFE_OPEN;
        return Math.max(0, Math.min(1, (q.x - 0.05) / 1.05));
      };
      const HOLD = 1.0;
      const holdT: number[] = P.ptrs.map(() => 0);
      const holdLock: boolean[] = P.ptrs.map(() => false);
      let holdShow = 0;
      const doBox = new THREE.Box3();
      P.grabWhen((nx, ny) => sliders.grab(nx, ny) || buttons.grab(nx, ny) || grabs.grab(nx, ny) || timerGrabs.grab(nx, ny) || nearMark(nx, ny, 0.1) || actNear(nx, ny, 0.12) || !!pickAt(nx, ny, 0.12) || pickRingAt(nx, ny, 0.1) >= 0 || levNear(nx, ny, 0.1) || (setupDone() && (pull ? pullNear(nx, ny, 0.09) : levOn ? false : onMover(nx, ny))));

      // chuyển động của bài: dụng cụ chạy theo quy luật vật lí của bài (benchMotion.ts)
      const fx = (BENCH_FX[e.id] ?? BIO_FX[e.id])?.({
        e,
        root,
        // phần còn chờ học sinh đặt vào chỗ (bước chuẩn bị chưa làm) đứng yên ở mép bàn: không cho hiệu ứng làm nó chạy / trượt khi đang cần cầm
        part: (n) => (setup.some((st, i) => i >= stage && st.act?.part === n) ? undefined : byN.get(n)?.obj),
        choiceNum: (key, dflt = 1) => {
          const label = e.choices?.find((c) => c.key === key)?.options.find((o) => o[0] === live.st.s[key])?.[1] ?? '';
          const m = /-?\d+(?:[.,]\d+)?/.exec(label);
          return m ? parseFloat(m[0].replace(',', '.')) : dflt;
        },
      });
      let elapsed = 0;
      let last = performance.now();
      return () => {
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        elapsed += dt;
        P.step(1 - Math.exp(-dt * 28));
        sliders.step(Object.fromEntries(e.sliders.map((p) => [p.key, unit(p.key)])));
        buttons.step(dt);
        grabs.step();
        timerGrabs.step();
        for (const t of timers) {
          t.hand.rotation.y = -unit(t.p.key) * 5.24;
          t.tag(timerAt.set(t.body.position.x, 0.1, 2.98), undefined, `${t.p.label}: ${unitText(t.p.key)}`);
        }
        for (const d of dials) {
          d.cap.rotation.y = -(-SWEEP / 2 + unit(d.p.key) * SWEEP);
          d.tag(timerAt.set(d.x, 0.1, 2.98), undefined, `${d.p.label}: ${unitText(d.p.key)}`);
        }
        // mỗi khung hình đặt lại phần động về trạng thái theo thanh trượt, rồi hiệu ứng chuyển động ghi đè lên đó
        for (const {obj, base, m} of movers) {
          const x = m.a + (m.b - m.a) * unit(m.param);
          obj.position.copy(base);
          obj.rotation.set(0, 0, 0);
          if (m.axis === 's') obj.scale.setScalar(x);
          else if (m.axis === 'sy') obj.scale.set(1, x, 1);
          else if (m.axis === 'rz') obj.rotation.z = x;
          else obj.position[m.axis] = base[m.axis] + x;
        }
        for (const q of setupParts) q.obj.position.copy(q.base);
        for (const q of byN.values()) {
          if (!q.free) continue;
          q.obj.position.copy(q.base);
          q.obj.rotation.set(0, 0, 0);
          q.obj.scale.set(1, 1, 1);
        }
        holdShow = 0;
        P.ptrs.forEach((ptr) => {
          const {x, y} = ptr.ndc;
          const r = Math.max(0.09, ptr.reach); // cùng tầm với của con trỏ: chụm gần núm / nút thì vặn núm, không làm thí nghiệm
          if (!setupDone() && setup[stage].act && actInput(ptr, P.ptrs.indexOf(ptr), dt)) return;
          if (!setupDone() && puck.visible) {
            const n = P.ptrs.indexOf(ptr);
            if (puckHeld < 0 && ptr.pressed && ptr.active && puckAt(x, y, Math.max(0.12, ptr.reach))) puckHeld = n;
            if (puckHeld === n) {
              if (ptr.active && ptr.down) {
                const q = P.onPlane(x, y, root.localToWorld(puckW.set(0, 0.12, 0)).y, puckW);
                root.worldToLocal(q);
                puck.position.set(Math.max(-3, Math.min(3, q.x)), 0.12, Math.max(-1.6, Math.min(2.4, q.z)));
                ptr.hot = true;
              } else {
                puckHeld = -1;
                // vòng cam nằm trên dụng cụ (cao hơn mặt bàn): thả "vào vòng" tính theo khoảng cách trên màn hình tới vòng, không theo mặt bàn
                root.updateMatrixWorld();
                if (P.distAt(x, y, root.localToWorld(markWorld.set(...setup[stage].at))) < Math.max(0.14, ptr.reach * 0.9)) {
                  stage++;
                  flash = 0.5;
                }
              }
              return;
            }
          }
          if (pickItems.length && pickInput(ptr, P.ptrs.indexOf(ptr))) return;
          // thiếu mô hình vật chọn: chạm vòng vàng để đổi phương án kế tiếp (dự phòng)
          const rk = ptr.pressed && ptr.active ? pickRingAt(x, y, Math.max(0.1, ptr.reach)) : -1;
          if (rk >= 0) {
            cycle(choices[rk]);
            return;
          }
          const n2 = P.ptrs.indexOf(ptr);
          if (levOn && setupDone()) {
            if (levHeld < 0 && ptr.pressed && ptr.active && !grabs.grab(x, y, r) && !timerGrabs.grab(x, y, r) && !sliders.grab(x, y) && !buttons.grab(x, y, r) && levNear(x, y, Math.max(0.12, ptr.reach))) levHeld = n2;
            if (levHeld === n2) {
              ptr.hot = true;
              if (ptr.active && ptr.down) {
                levT = levFrom(x, y);
                if (levT >= 0.95 && !levLock) {
                  levLock = true;
                  live.dispatch({type: 'measure'});
                }
              } else levHeld = -1;
            }
            holdT[n2] = 0;
            return;
          }
          if (pull && setupDone()) {
            const o = pullObj();
            if (o && pullHeld < 0 && ptr.pressed && ptr.active && !grabs.grab(x, y, r) && !timerGrabs.grab(x, y, r) && !sliders.grab(x, y) && !buttons.grab(x, y, r) && pullNear(x, y, Math.max(0.1, ptr.reach))) {
              pullHeld = n2;
              pullFrom = 0;
              root.updateMatrixWorld();
              const w0 = o.getWorldPosition(new THREE.Vector3());
              pullOn(x, y, w0, pullStart);
            }
            if (pullHeld === n2 && o) {
              ptr.hot = true;
              if (ptr.active && ptr.down) {
                const w0 = o.getWorldPosition(new THREE.Vector3());
                pullOn(x, y, w0, pullPt);
                const dl = pullPt.sub(pullStart).divideScalar(root.scale.x);
                pullD = Math.max(0, Math.min(pull.max, dl.dot(pullDir)));
              } else {
                pullHeld = -1;
                if (pullD >= 0.2) {
                  if (e.columns.length) live.dispatch({type: 'measure'});
                  else pokes++;
                }
                pullFrom = pullD;
                pullD = 0;
              }
            }
            holdT[n2] = 0;
            return;
          }
          const free = ptr.active && ptr.down && setupDone() && !grabs.grab(x, y, r) && !timerGrabs.grab(x, y, r) && !sliders.grab(x, y) && !buttons.grab(x, y, r) && onMover(x, y, ptr.hand ? ptr.reach : 0);
          if (!free) {
            holdT[n2] = 0;
            holdLock[n2] = false;
            return;
          }
          // làm thí nghiệm = GIỮ chụm trên dụng cụ ~1 s (vòng tiến độ), không phải bấm một lần: tay không bấm nhầm khi lướt qua
          ptr.hot = true;
          if (holdLock[n2]) return;
          holdT[n2] += dt;
          holdShow = Math.max(holdShow, holdT[n2] / HOLD);
          if (holdT[n2] >= HOLD) {
            holdLock[n2] = true;
            holdT[n2] = 0;
            if (e.columns.length) live.dispatch({type: 'measure'});
            else pokes++;
          }
        });
        fx?.(dt, {p: live.st.p, s: live.st.s, rows: live.st.rows.length + pokes * 1000, idle: !!pull && live.st.rows.length + pokes === 0}, elapsed);
        // vật đang được kéo: dịch theo tay; thả ra thì bật về nhanh (hiệu ứng của bài chạy từ đầu)
        if (pull) {
          const o = pullObj();
          if (pullHeld < 0 && pullFrom > 0) pullFrom = Math.max(0, pullFrom - dt * 3.5);
          const d = pullHeld >= 0 ? pullD : pullFrom;
          if (o && d > 0) o.position.addScaledVector(pullDir, d);
        }
        // cần gạt / khóa dao: chỉ hiện khi đã chuẩn bị xong; thả ra thì bật về vị trí mở
        if (levOn) {
          levPlace();
          lev.visible = levPlaced && setupDone();
          if (levHeld < 0) {
            levT = Math.max(0, levT - dt * 2.2);
            if (levT < 0.3) levLock = false;
          }
          if (knife) blade.rotation.z = (1 - levT) * KNIFE_OPEN;
          else levHandle.position.x = 0.05 + levT * 1.05;
          if (lev.visible) {
            root.updateMatrixWorld();
            levTag(lev.localToWorld(levW.set(0.45, 0.55, 0)), undefined, levHeld >= 0 ? `${Math.round(levT * 100)} % — ${knife ? 'đóng hẳn khóa' : 'gạt hết cần'} để: ${action.toLowerCase()}` : `${knife ? 'Nắm tay cầm, gạt khóa xuống để' : 'Nắm núm, gạt cần sang ô xanh để'}: ${action.toLowerCase()}`);
          } else levTag(null);
        }
        // cục cam của bước chuẩn bị hiện tại: đặt ở mép bàn (phía người nhìn), kéo vào vòng cam
        frameAct(dt, elapsed);
        if (!setupDone() && !setup[stage].act) {
          if (puckFor !== stage) {
            puckFor = stage;
            const [ax, , az] = setup[stage].at;
            puck.position.set(Math.max(-2.6, Math.min(2.6, ax + (ax < 0 ? 1.1 : -1.1))), 0.12, Math.min(1.7, Math.max(az + 0.9, 1.0)));
          }
          puck.visible = true;
          puck.scale.setScalar(1 + 0.08 * Math.sin(elapsed * 6));
          root.updateMatrixWorld();
          puckTag(root.localToWorld(puckW.copy(puck.position)).setY(puckW.y + 0.35), undefined, `Kéo vào vòng cam: ${setup[stage].label}`);
        } else {
          puck.visible = false;
          puckTag(null);
        }
        // nhãn vàng trên dụng cụ có lựa chọn: ghi lựa chọn hiện tại
        framePick(dt);
        // nhãn xanh trên dụng cụ cần chạm: nói rõ thao tác của bài
        flash = Math.max(0, flash - dt);
        marks.forEach((m, i) => {
          m.g.visible = i === stage;
          if (i !== stage) return m.tag(null);
          m.ring.scale.setScalar(1 + 0.14 * Math.sin(elapsed * 5) + flash);
          root.updateMatrixWorld();
          m.tag(root.localToWorld(markWorld.set(...setup[i].at)).setY(markWorld.y + 0.5), undefined, `Bước ${i + 1}/${setup.length}: ${setup[i].label}`);
        });
        const tg = targets();
        if (tg.length && e.columns.length && setupDone() && !levOn) {
          const at = doBox.setFromObject(tg[0]).getCenter(new THREE.Vector3());
          doTag(at.setY(doBox.max.y + (tg[0] === setObj ? 0.35 : 0.5)), undefined, pull ? (pullHeld >= 0 ? `Kéo ${Math.round((pullD / pull.max) * 100)} % — thả ra để: ${action.toLowerCase()}` : `Chụm vào ${pull.what}`) : holdShow > 0.02 ? `Đang ${action.toLowerCase()}… ${Math.round(Math.min(1, holdShow) * 100)} %` : `Giữ chụm để làm: ${action}`);
        } else doTag(null);
        const row = live.st.rows[live.st.rows.length - 1];
        k.caption(!setupDone() ? `${e.lesson}\nChuẩn bị ${stage + 1}/${setup.length}: ${setup[stage].label} · ${{place: 'chụm vật ở mép bàn, kéo vào vòng cam rồi buông', pour: 'chụm lọ, đưa miệng lọ tới vòng cam và giữ yên để rót', stir: 'chụm, đưa vào vòng cam rồi vẽ vòng tròn', squeeze: 'chụm giữ để bóp, nhả để phồng', connect: 'chụm phích / đầu ống, kéo tới chốt (núm) cần nối rồi buông', press: 'chụm một lần vào công tắc (vòng cam) để bật', turn: 'chụm vào ốc rồi vẽ vòng tròn quanh ốc để vặn'}[setup[stage].act?.kind ?? 'place'] ?? 'chụm cục cam rồi kéo thả vào vòng cam trên dụng cụ'}` : row ? `Lần đo ${live.st.rows.length}: ${e.columns.map((c) => `${c.label} = ${fmt(row[c.key], c.digits ?? 2)}${c.unit ? ` ${c.unit}` : ''}`).join(' · ')}
Đổi điều kiện rồi làm lại để có lần đo tiếp` : `${e.lesson}
Kéo bộ phận có vòng cam để chỉnh · cầm vật ở khay đặt vào vòng vàng để chọn${e.columns.length ? ` · ${pull ? `kéo ${pull.what.split(':')[0]} rồi thả` : levOn ? (knife ? 'gạt khóa dao xuống' : 'gạt cần trượt sang ô xanh') : 'giữ chụm trên dụng cụ'} để ${action.toLowerCase()} và ghi số đo` : ''}`);
      };
    },
  };
}

/** Cảnh 3D của một bài thực hành SGK (Vật lí / Sinh học): dụng cụ Blender trên bàn, con trượt và nút bấm điều khiển bằng tay. */
const HandsBench3D: React.FC<{input: HandsInput; live: Bench3DLive; onFail: () => void}> = ({input, live, onFail}) => {
  const def = useMemo(() => makeDef(input, live), [input, live]);
  return <Stage3D fill def={def} p={{}} t={0} s={{}} onFail={onFail} />;
};
export default HandsBench3D;
