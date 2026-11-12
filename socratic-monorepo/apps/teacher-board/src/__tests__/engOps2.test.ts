import {beforeEach, describe, expect, it, vi} from 'vitest';
import * as THREE from 'three';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';
import {LineSegments2} from 'three/examples/jsm/lines/LineSegments2.js';
import {LineSegmentsGeometry} from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import {ENG2_LABS} from '../engines/families/HandsEngOps2';
import type {SimLive} from '../engines/families/HandsSims3D';
import {handPointers, newInput} from '../engines/families/handsKit';
import {setLine, type Kit} from '../engines/families/Stage3D';
import {SIM_BY_ID} from '../utils/lab/hands/sims';
import {initial} from '../utils/lab/hands/sims/types';

/** Bộ dụng cụ giả (không WebGL): đủ để dựng cảnh, chạy thao tác và đọc vị trí con trỏ. */
function fakeKit(): Kit {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1.6, 0.1, 100);
  camera.position.set(0, 10, 8);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  const arrow = () => Object.assign({obj: new THREE.Group()}, {set: () => undefined});
  return {
    scene,
    camera,
    controls: {target: new THREE.Vector3(), enabled: true} as unknown as Kit['controls'],
    night: false,
    zUp: () => new THREE.Group(),
    line: (color, width, pts, segments = false) => {
      const o = new LineSegments2(new LineSegmentsGeometry(), new LineMaterial({color, linewidth: width})) as ReturnType<Kit['line']>;
      o.userData.poly = !segments;
      if (pts) setLine(o, pts);
      return o;
    },
    arrow,
    label: () => () => undefined,
    caption: () => undefined,
    card: () => () => undefined,
    pick: () => undefined,
    drag: () => () => undefined,
    set: () => undefined,
  };
}

/** Một bài đã dựng, kèm hàm mô phỏng thao tác bằng chuột (con trỏ số 2 của `handPointers`). */
function rig(id: string) {
  const k = fakeKit();
  const input = newInput();
  const P = handPointers(k, input, 0.3);
  const sets: [string, number][] = [];
  const acts: string[] = [];
  const live = {
    id,
    v: initial(SIM_BY_ID[id]),
    events: {} as Record<string, number>,
    set(key: string, x: number) {
      live.v[key] = x;
      sets.push([key, x]);
    },
    act(a: string) {
      acts.push(a);
      live.events[a] = (live.events[a] ?? 0) + 1;
    },
  } as unknown as SimLive;
  const lab = ENG2_LABS[id]({k, P, live});
  const ptr = P.ptrs[2];
  let now = 1000;
  const frame = () => {
    now += 16;
    k.scene.updateMatrixWorld(true);
    return lab.step(now, 0.016);
  };
  const at = (w: THREE.Vector3) => ptr.ndc.copy(w.clone().project(k.camera));
  const press = (w: THREE.Vector3) => {
    at(w);
    Object.assign(ptr, {active: true, down: true, pressed: true, released: false});
    frame();
    ptr.pressed = false;
  };
  const move = (...ws: THREE.Vector3[]) =>
    ws.forEach((w) => {
      at(w);
      frame();
    });
  const release = () => {
    Object.assign(ptr, {down: false, released: true});
    frame();
    Object.assign(ptr, {released: false, active: false});
    frame();
  };
  const drag = (from: THREE.Vector3, ...path: THREE.Vector3[]) => {
    press(from);
    move(...path);
    release();
  };
  for (let i = 0; i < 5; i++) frame();
  return {live, sets, acts, frame, press, move, release, drag, tap: (w: THREE.Vector3) => drag(w, w), lab};
}
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const Z = -1.2;

describe('bảy bài kĩ thuật thao tác trực tiếp trên thiết bị', () => {
  beforeEach(() => void vi.spyOn(console, 'error').mockImplementation(() => undefined));

  it.each(Object.keys(ENG2_LABS))('%s: dựng và chạy nhiều khung hình không lỗi, có chú thích', (id) => {
    const r = rig(id);
    for (let i = 0; i < 40; i++) expect(typeof r.frame()).toBe('string');
    expect(r.sets).toEqual([]);
  });

  it('pid: xoay núm K_p theo chiều kim đồng hồ tăng K_p; kéo cần rồi buông thì đẩy xe', () => {
    const r = rig('pid');
    const kp0 = r.live.v.kp;
    r.drag(V(-2.9, 0.2, 1.0), V(-3.2, 0.2, 1.3)); // núm K_p ở (−3,2; 1,0): từ hướng +x quay 90° sang +z
    expect(r.live.v.kp).toBeGreaterThan(kp0 + 25);
    expect(r.acts).toEqual([]);
    r.drag(V(3.6, 0.17, 0.9), V(2.8, 0.2, 0.9)); // tay nắm cần ở x = 3,6
    expect(r.acts).toEqual(['push']);
  });

  it('foc: kéo mũi tên dòng đổi i_d và i_q; gạt contactor sang trái thì đóng điện', () => {
    const r = rig('foc');
    const tip = V(1.3, 0.09, Z); // i_d = 0, i_q = 0: gốc đồ thị d–q
    r.drag(tip, V(1.3 - 0.8 * 1.15, 0.09, Z - 0.4 * 1.15));
    expect(r.live.v.id).toBe(-80);
    expect(r.live.v.iq).toBe(40);
    r.drag(V(3.0 + 0.85 * Math.sin(0.7), 0.2, 1.0 - 0.85 * Math.cos(0.7)), V(2.4, 0.2, 0.4));
    expect(r.acts).toEqual(['start']);
    r.drag(V(3.0 - 0.85 * Math.sin(0.7), 0.2, 1.0 - 0.85 * Math.cos(0.7)), V(3.6, 0.2, 0.4));
    expect(r.acts).toEqual(['start', 'stop']);
  });

  it('harmonic: chạm bánh 320 răng để chọn; núm tốc độ động cơ xoay được', () => {
    const r = rig('harmonic');
    r.tap(V(-3.3 + 5 * 0.55, 0.1, 1.7));
    expect(r.live.v.zf).toBe(320);
    const rpm0 = r.live.v.rpm;
    r.drag(V(1.7, 0.2, 1.0), V(1.4, 0.2, 1.3));
    expect(r.live.v.rpm).toBeGreaterThan(rpm0);
  });

  it('fatigue: chọn vật liệu và vết cắt bằng cách chạm hoặc thả vào mẫu; núm Δσ', () => {
    const r = rig('fatigue');
    r.tap(V(-3.4 + 2 * 0.5, 0.1, 1.0));
    expect(r.live.v.alloy).toBe(3);
    r.drag(V(-1.4 + 4 * 0.5, 0.1, 1.0), V(-1.4, 0.45, Z)); // thả vật "5 mm" vào mép trái mẫu
    expect(r.live.v.a0).toBe(5);
    const ds0 = r.live.v.ds;
    r.drag(V(2.7, 0.2, 0.7), V(3.0, 0.2, 1.0)); // từ phía trên núm sang bên phải = cùng chiều kim đồng hồ
    expect(r.live.v.ds).toBeGreaterThan(ds0);
    r.drag(V(3.0, 0.2, 1.0), V(2.7, 0.2, 0.7)); // quay ngược lại thì giảm
    expect(r.live.v.ds).toBeLessThan(ds0 + 90);
  });

  it('quadruped: chọn tấm sàn; kéo búa tới cuối thì lực đạp gần 200 N rồi đạp', () => {
    const r = rig('quadruped');
    r.tap(V(-3.4 + 2 * 0.55, 0.1, 1.0));
    expect(r.live.v.mu).toBe(0.5);
    r.drag(V(3.6, 0.17, 0.9), V(2.4, 0.2, 0.9));
    expect(r.live.v.F).toBeGreaterThan(190);
    expect(r.acts).toEqual(['kick']);
  });

  it('surgery: cắm cáp vệ tinh chọn độ trễ 200 ms; hai núm đổi tỉ lệ và bộ lọc', () => {
    const r = rig('surgery');
    r.drag(V(-0.4 + 3 * 0.6, 0.1, 1.8), V(-3.38, 0.12, Z + 0.75)); // thả vào cổng bộ đẩy ống thông
    expect(r.live.v.delay).toBe(200);
    const K0 = r.live.v.K;
    r.drag(V(-2.7, 0.2, 1.0), V(-3.0, 0.2, 1.3));
    expect(r.live.v.K).toBeGreaterThan(K0);
    const f0 = r.live.v.filt;
    r.drag(V(-1.4, 0.2, 1.0), V(-1.7, 0.2, 1.3));
    expect(r.live.v.filt).toBeGreaterThan(f0);
  });

  it('slam: gạt công tắc đóng vòng lặp, chọn encoder rất kém, núm chiều dài vòng', () => {
    const r = rig('slam');
    expect(r.live.v.closure).toBe(0);
    r.drag(V(3.0 + 0.85 * Math.sin(0.7), 0.2, 1.0 - 0.85 * Math.cos(0.7)), V(2.4, 0.2, 0.4));
    expect(r.live.v.closure).toBe(1);
    r.tap(V(-3.3 + 3 * 0.5, 0.1, 1.8));
    expect(r.live.v.drift).toBe(5);
    const L0 = r.live.v.L;
    r.drag(V(-1.4, 0.2, 1.0), V(-1.7, 0.2, 1.3));
    expect(r.live.v.L).toBeGreaterThan(L0);
  });
});
