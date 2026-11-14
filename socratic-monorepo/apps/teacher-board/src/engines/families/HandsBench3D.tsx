'use client';

import React, {useMemo} from 'react';
import * as THREE from 'three';
import {BENCH_MOVES, dragT, grabOf, type BenchMove} from '../../utils/lab/hands/benchMoves';
import {handPointers, handSliders, labRoom, type HandsInput} from './handsKit';
import {solid} from './handsModels';
import {glassify, loadModel, partOf} from './labParts';
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
function partGrabs(k: Kit, P: ReturnType<typeof handPointers>, parts: () => Grabbable[], scale: number) {
  const ray = new THREE.Raycaster();
  const v2 = new THREE.Vector2();
  const box = new THREE.Box3();
  const plane = new THREE.Plane();
  const tag = k.label('');
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
          h.p.write(dragT(h.p.m, h.t0, (to[axis] - h.at[axis]) / scale));
          shown = h.p;
        } else if (hover) shown = hover;
        ptr.hot = !!hover || !!h;
      });
      if (shown) {
        const s: Grabbable = shown;
        const at = centre(s.obj);
        tag(at.setY(at.y + 0.55), undefined, `${s.m.what}: ${s.text()}`);
      } else tag(null);
    },
  };
}

const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toLocaleString('vi-VN', {maximumFractionDigits: d}) : '—');

/** Nút bấm tròn trên mặt bàn: chụm (hoặc nhấn chuột) vào nút = một lần bấm. */
function pads(k: Kit, P: ReturnType<typeof handPointers>, defs: {at: [number, number]; color: string; r: number; text: () => string; press: () => void}[]) {
  const v3 = new THREE.Vector3();
  const rigs = defs.map((d) => {
    solid(k.scene, new THREE.CylinderGeometry(d.r + 0.05, d.r + 0.07, 0.06, 28), '#2A2E66', {x: d.at[0], y: 0.03, z: d.at[1]});
    const cap = solid(k.scene, new THREE.CylinderGeometry(d.r, d.r, 0.1, 28), d.color, {x: d.at[0], y: 0.1, z: d.at[1], rough: 0.4});
    return {d, cap, tag: k.label(d.text()), down: 0};
  });
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
        r.tag(v3.set(r.d.at[0], 0.1, r.d.at[1] + r.d.r + 0.3), undefined, r.d.text());
      }
    },
  };
}

function makeDef(input: HandsInput, live: Bench3DLive): SceneDef {
  return {
    floor: true,
    room: true,
    dist: 9,
    target: [-0.2, 0.2, -0.2],
    orbit: () => [0, 50],
    setup: (k) => {
      const e = live.e;
      labRoom(k, [8.4, 5.6, -0.3, 0.1]);
      solid(k.scene, new THREE.BoxGeometry(8.4, 0.12, 5.6), '#1C1F4A', {rough: 0.9, x: -0.3, y: -0.056, z: 0.1});
      const P = handPointers(k, input, 0.3);

      // bộ dụng cụ Blender của bài + các phần động theo thanh trượt
      const root = new THREE.Group();
      root.position.set(-0.2, 0, -1.2);
      root.scale.setScalar(1.25); // bộ dụng cụ dựng theo bàn rộng 6: phóng cho vừa bàn 8,4 và dễ nhìn từ máy quay
      k.scene.add(root);
      const movers: {obj: THREE.Object3D; base: THREE.Vector3; m: (typeof BENCH_MOVES)[string][number]}[] = [];
      void loadModel(`/models/bench-${live.file}.glb`)
        .then((lib) => {
          const set = partOf(lib, `Set_${e.id}`);
          if (set) {
            glassify(set.obj);
            root.add(set.obj);
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
          }
        })
        .catch(() => undefined);
      k.label(e.title)(new THREE.Vector3(0, 2.6, -2.4));

      const slider = (key: string) => e.sliders.find((p) => p.key === key)!;
      const unit = (key: string) => {
        const p = slider(key);
        return (live.st.p[key] - p.min) / (p.max - p.min || 1);
      };
      // thanh trượt nào có bộ phận cầm được thì kéo thẳng dụng cụ, không cần ray ở mép bàn
      const railed = e.sliders.filter((p) => !grabOf(e.id, p.key));
      const setParam = (key: string, t: number) => {
        const p = slider(key);
        const value = Math.min(p.max, Math.max(p.min, Math.round((p.min + (p.max - p.min) * t) / p.step) * p.step));
        if (value !== live.st.p[key]) live.dispatch({type: 'set', key, value});
      };
      const sliders = handSliders(
        k,
        P,
        railed.map((p) => ({id: p.key, label: p.label, t: unit(p.key)})),
        [-3.9, 0.9],
        setParam,
        (key) => `${fmt(live.st.p[key], 3)}${slider(key).unit ? ` ${slider(key).unit}` : ''}`,
      );
      // mỗi lựa chọn của bài là một nút tròn: bấm = sang lựa chọn kế tiếp; nút cam lớn = một lần đo
      const buttons = pads(k, P, [
        ...(e.choices ?? []).map((c, i) => ({
          at: [1.2 + (i % 2) * 1.5, 0.9 + Math.floor(i / 2) * 0.95] as [number, number],
          color: '#E3B341',
          r: 0.16,
          text: () => `${c.label}: ${c.options.find((o) => o[0] === live.st.s[c.key])?.[1] ?? ''}`,
          press: () => {
            const at = c.options.findIndex((o) => o[0] === live.st.s[c.key]);
            live.dispatch({type: 'choose', key: c.key, value: c.options[(at + 1) % c.options.length][0]});
          },
        })),
        ...(e.columns.length ? [{at: [1.2, 2.55] as [number, number], color: '#D9481C', r: 0.24, text: () => `ĐO (lần ${live.st.rows.length + 1})`, press: () => live.dispatch({type: 'measure'})}] : []),
      ]);
      // bộ phận chỉ có sau khi mô hình tải xong nên danh sách lấy theo từng khung hình
      const unitText = (key: string) => `${fmt(live.st.p[key], 3)}${slider(key).unit ? ` ${slider(key).unit}` : ''}`;
      const grabs = partGrabs(
        k,
        P,
        () => movers.filter((mv) => mv.m.what && grabOf(e.id, mv.m.param)?.n === mv.m.n).map((mv) => ({obj: mv.obj, m: mv.m, read: () => unit(mv.m.param), write: (t: number) => setParam(mv.m.param, t), text: () => unitText(mv.m.param)})),
        root.scale.x,
      );
      P.grabWhen((nx, ny) => sliders.grab(nx, ny) || buttons.grab(nx, ny) || grabs.grab(nx, ny));

      let last = performance.now();
      return () => {
        const now = performance.now();
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        P.step(1 - Math.exp(-dt * 28));
        sliders.step(Object.fromEntries(e.sliders.map((p) => [p.key, unit(p.key)])));
        buttons.step(dt);
        grabs.step();
        for (const {obj, base, m} of movers) {
          const x = m.a + (m.b - m.a) * unit(m.param);
          if (m.axis === 's') obj.scale.setScalar(x);
          else if (m.axis === 'sy') obj.scale.y = x;
          else obj.position[m.axis] = base[m.axis] + x;
        }
        const row = live.st.rows[live.st.rows.length - 1];
        k.caption(row ? `Lần đo ${live.st.rows.length}: ${e.columns.map((c) => `${c.label} = ${fmt(row[c.key], c.digits ?? 2)}${c.unit ? ` ${c.unit}` : ''}`).join(' · ')}
Đổi điều kiện rồi đo tiếp` : `${e.lesson}
Cầm dụng cụ rồi kéo · con trượt vàng cho thông số còn lại · bấm nút tròn để chọn${e.columns.length ? ' · bấm nút ĐO cam để ghi số đo' : ''}`);
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
