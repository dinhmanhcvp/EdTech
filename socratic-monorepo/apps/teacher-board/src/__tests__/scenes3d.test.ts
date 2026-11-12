import {describe, expect, it, vi} from 'vitest';
import * as THREE from 'three';
import {HAS_3D} from '../engines/families/SceneLab';
import {SCENES} from '../engines/families/Scenes3D';
import {ALL_ORGAN_SCENES as ORGAN_SCENES} from '../engines/families/Scenes3DOrgans2';
import {ANATOMY_3D} from '../engines/families/AnatomyFlow';
import {PROCESS_3D} from '../engines/families/ProcessSteps';
import {initialP, initialS} from '../engines/families/Controls';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';
import {LineSegments2} from 'three/examples/jsm/lines/LineSegments2.js';
import {LineSegmentsGeometry} from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import {setLine, type Kit} from '../engines/families/Stage3D';
import {PRESETS} from '../utils/presets';

/** Bộ dụng cụ giả (không WebGL): đủ để chạy `setup` và hàm cập nhật của từng cảnh, bắt lỗi dựng đối tượng hoặc ngoại lệ lúc chạy. */
function fakeKit(): Kit {
  const scene = new THREE.Scene();
  const arrow = () => Object.assign({obj: new THREE.Group()}, {set: () => undefined});
  return {
    scene,
    camera: new THREE.PerspectiveCamera(),
    controls: {target: new THREE.Vector3(), autoRotate: false, autoRotateSpeed: 0} as unknown as Kit['controls'],
    night: false,
    zUp: () => {
      const g = new THREE.Group();
      scene.add(g);
      return g;
    },
    line: (color, width, pts, segments = false) => {
      const o = new LineSegments2(new LineSegmentsGeometry(), new LineMaterial({color, linewidth: width})) as ReturnType<Kit['line']>;
      o.userData.poly = !segments;
      if (pts) setLine(o, pts);
      return o;
    },
    arrow,
    label: () => () => undefined,
    caption: () => undefined,
    pick: () => undefined,
    drag: () => () => undefined,
    card: () => () => undefined,
    set: () => undefined,
  };
}

describe('bản 3D của SCENE_LAB', () => {
  it('danh sách HAS_3D khớp với các cảnh đã dựng và đều là preset SCENE_LAB', () => {
    expect([...HAS_3D].sort()).toEqual(Object.keys(SCENES).sort());
    for (const id of HAS_3D) expect(PRESETS[id]?.family).toBe('SCENE_LAB');
  });

  it.each(Object.keys(SCENES))('%s: dựng và cập nhật nhiều thời điểm không lỗi', (id) => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const data = PRESETS[id].data as Parameters<typeof initialP>[0];
    const p = initialP(data);
    const s = initialS(data);
    const update = SCENES[id].setup(fakeKit());
    for (const t of [0, 0.7, 3.1, 9]) update({p, t, s});
    // đổi mọi lựa chọn sang phương án khác để chạy hết các nhánh (chế độ, bậc cấu trúc...)
    for (const c of (data as {choices?: {key: string; options: [string, string][]}[]}).choices ?? [])
      for (const [v] of c.options) update({p, t: 1.3, s: {...s, [c.key]: v}});
    for (const lvl of [1, 2, 3, 4]) update({p: {...p, lvl}, t: 2, s});
    expect(err).not.toHaveBeenCalled();
    err.mockRestore();
  });

  it('các sơ đồ 3D khớp danh sách của engine và chạy được với mọi bộ phận / bước', () => {
    expect([...ANATOMY_3D, ...PROCESS_3D].sort()).toEqual(Object.keys(ORGAN_SCENES).sort());
    for (const id of Object.keys(ORGAN_SCENES)) {
      const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const data = PRESETS[id].data as unknown as {parts?: {id: string; label: string}[]; steps?: unknown[]};
      const update = ORGAN_SCENES[id].setup(fakeKit());
      const labels = Object.fromEntries((data.parts ?? []).map((x) => [`L:${x.id}`, x.label]));
      for (const sel of ['', ...(data.parts ?? []).map((x) => x.id)]) update({p: {}, t: 0, s: {sel, flow: '1', ...labels}});
      for (let step = 0; step < (data.steps?.length ?? 0); step++) for (let i = 0; i < 40; i++) update({p: {step}, t: 0, s: {}});
      expect(err).not.toHaveBeenCalled();
      err.mockRestore();
    }
  });
});
