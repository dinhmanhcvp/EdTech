'use client';

import React, {useMemo} from 'react';
import * as THREE from 'three';
import {BENCH_ACTION, BENCH_MOVES, BENCH_SETUP, dragT, grabOf, isTimeUnit, type BenchMove} from '../../utils/lab/hands/benchMoves';
import {BENCH_FX, FX_PARTS} from './benchMotion';
import {BIO_FX, BIO_FX_PARTS} from './benchMotionBio';
import {handPointers, handSliders, labRoom, type HandsInput} from './handsKit';
import {solid} from './handsModels';
import {dress, glassify, loadModel, partOf} from './labParts';
import type {BenchLive} from './PhysBench';
import {Stage3D, type Kit, type SceneDef} from './Stage3D';

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
    grab: (nx: number, ny: number) => near(nx, ny, 0.09) !== null,
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
    grab: (nx: number, ny: number) => near(nx, ny, 0.07) >= 0,
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
    dist: 8.2,
    target: [-0.3, 0.45, 0.1],
    orbit: () => [0, 50],
    setup: (k) => {
      const e = live.e;
      labRoom(k, [8.4, 5.6, -0.3, 0.1]);
      solid(k.scene, new THREE.BoxGeometry(8.4, 0.12, 5.6), '#1C1F4A', {rough: 0.9, x: -0.3, y: -0.056, z: 0.1});
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
        })
        .catch(() => undefined);

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
      const sliders = handSliders(
        k,
        P,
        railed.map((p) => ({id: p.key, label: p.label, t: unit(p.key)})),
        [-3.9, 1.4],
        setParam,
        (key) => `${fmt(live.st.p[key], 3)}${slider(key).unit ? ` ${slider(key).unit}` : ''}`,
      );
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
      const nearMark = (nx: number, ny: number, reach: number) => {
        if (setupDone()) return false;
        root.updateMatrixWorld();
        return P.distAt(nx, ny, root.localToWorld(markWorld.set(...setup[stage].at))) < reach;
      };
      // mỗi lựa chọn của bài là một nút tròn: bấm = sang lựa chọn kế tiếp; nút cam lớn = một lần đo
      const buttons = pads(k, P, [
        ...(e.choices ?? []).map((c, i) => ({
          at: [1.1, 1.15 + i * 0.52] as [number, number],
          color: '#E3B341',
          r: 0.16,
          side: true,
          notch: (): [number, number] => [Math.max(0, c.options.findIndex((o) => o[0] === live.st.s[c.key])), c.options.length],
          text: () => `${c.label}: ${c.options.find((o) => o[0] === live.st.s[c.key])?.[1] ?? ''}`,
          press: () => {
            const at = c.options.findIndex((o) => o[0] === live.st.s[c.key]);
            live.dispatch({type: 'choose', key: c.key, value: c.options[(at + 1) % c.options.length][0]});
          },
        })),
        ...(e.columns.length ? [{at: [3.4, 2.45] as [number, number], color: '#D9481C', r: 0.28, text: () => (setupDone() ? `${action} (lần ${live.st.rows.length + 1})` : `Bước ${stage + 1}/${setup.length}: ${setup[stage].label}`), press: () => (setupDone() ? live.dispatch({type: 'measure'}) : void (stage++, (flash = 0.5)))}] : []),
      ]);
      // bộ phận chỉ có sau khi mô hình tải xong nên danh sách lấy theo từng khung hình
      const unitText = (key: string) => `${fmt(live.st.p[key], 3)}${slider(key).unit ? ` ${slider(key).unit}` : ''}`;
      // thông số thời gian: ĐỒNG HỒ HẸN GIỜ nằm trên bàn (Blender), chụm rồi kéo ngang để quay kim (một vòng 300° = cả thang)
      const timers = timed.map((p, j) => {
        const x = -3.3 + j * 0.85;
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
      const timerGrabs = partGrabs(k, P, () => timers.map((t) => t.grab), () => 1);
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
      const onMover = (nx: number, ny: number) => {
        pokeRay.setFromCamera(pokeV.set(nx, ny), k.camera);
        return targets().some((o) => pokeRay.intersectObject(o, true).length > 0);
      };
      const doTag = k.label('', '#1F7A4D');
      const doBox = new THREE.Box3();
      P.grabWhen((nx, ny) => sliders.grab(nx, ny) || buttons.grab(nx, ny) || grabs.grab(nx, ny) || timerGrabs.grab(nx, ny) || nearMark(nx, ny, 0.1) || (setupDone() && onMover(nx, ny)));

      // chuyển động của bài: dụng cụ chạy theo quy luật vật lí của bài (benchMotion.ts)
      const fx = (BENCH_FX[e.id] ?? BIO_FX[e.id])?.({
        e,
        root,
        part: (n) => byN.get(n)?.obj,
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
        for (const q of byN.values()) {
          if (!q.free) continue;
          q.obj.position.copy(q.base);
          q.obj.rotation.set(0, 0, 0);
          q.obj.scale.set(1, 1, 1);
        }
        P.ptrs.forEach((ptr) => {
          const {x, y} = ptr.ndc;
          if (ptr.pressed && ptr.active && nearMark(x, y, 0.1)) {
            stage++;
            flash = 0.5;
            return;
          }
          if (!ptr.pressed || !ptr.active || !setupDone() || grabs.grab(x, y) || timerGrabs.grab(x, y) || sliders.grab(x, y) || buttons.grab(x, y) || !onMover(x, y)) return;
          if (e.columns.length) live.dispatch({type: 'measure'});
          else pokes++;
        });
        fx?.(dt, {p: live.st.p, s: live.st.s, rows: live.st.rows.length + pokes * 1000}, elapsed);
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
        if (tg.length && e.columns.length && setupDone()) {
          const at = doBox.setFromObject(tg[0]).getCenter(new THREE.Vector3());
          doTag(at.setY(doBox.max.y + (tg[0] === setObj ? 0.35 : 0.5)), undefined, `Chạm để làm: ${action}`);
        } else doTag(null);
        const row = live.st.rows[live.st.rows.length - 1];
        k.caption(!setupDone() ? `${e.lesson}\nChuẩn bị ${stage + 1}/${setup.length}: ${setup[stage].label} · chạm vào vòng cam trên dụng cụ` : row ? `Lần đo ${live.st.rows.length}: ${e.columns.map((c) => `${c.label} = ${fmt(row[c.key], c.digits ?? 2)}${c.unit ? ` ${c.unit}` : ''}`).join(' · ')}
Đổi điều kiện rồi làm lại để có lần đo tiếp` : `${e.lesson}
Kéo bộ phận có vòng cam để chỉnh · vặn công tắc xoay để chọn${e.columns.length ? ` · chạm vào dụng cụ có nhãn xanh để ${action.toLowerCase()} và ghi số đo` : ''}`);
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
