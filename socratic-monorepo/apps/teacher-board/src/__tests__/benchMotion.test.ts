import {readFileSync} from 'fs';
import {join} from 'path';
import * as THREE from 'three';
import {describe, expect, it} from 'vitest';
import {BENCH_FX, FX_PARTS, type FxCtx} from '../engines/families/benchMotion';
import {LAB_ALIAS} from '../engines/families/labLessons';
import {BENCH_MOVES} from '../utils/lab/hands/benchMoves';
import {PHYS_EXPERIMENTS} from '../utils/lab/phys/experiments';
import {initialPhys} from '../utils/lab/phys/engine';

const nodes = (() => {
  const b = readFileSync(join(__dirname, '../../public/models/bench-phys.glb'));
  const json = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString('utf8')) as {nodes: {name: string}[]};
  return new Set(json.nodes.map((n) => n.name));
})();

describe('bài thực hành Vật lí không đứng yên: mỗi bài có chuyển động theo quy luật của bài', () => {
  it('mọi bài SGK Vật lí (trừ bài đã gộp sang bài tay) đều có hiệu ứng chuyển động; phần động tự do có trong tệp mô hình', () => {
    for (const e of PHYS_EXPERIMENTS) {
      if (LAB_ALIAS[`PHYS_LAB_${e.id}`]) continue;
      expect(BENCH_FX[e.id], `${e.id} chưa có chuyển động`).toBeTypeOf('function');
    }
    for (const [id, ns] of Object.entries(FX_PARTS)) for (const n of ns) expect(nodes.has(`Mov_${id}_${n}`), `Mov_${id}_${n}`).toBe(true);
  });

  for (const e of PHYS_EXPERIMENTS) {
    if (!BENCH_FX[e.id]) continue;
    it(`${e.id}: chạy 8 giây không lỗi, không ra số vô nghĩa, và có bộ phận thật sự dịch chuyển hoặc quay`, () => {
      const parts = new Map<number, THREE.Object3D>();
      const used = new Set<number>([...(FX_PARTS[e.id] ?? []), ...(BENCH_MOVES[e.id] ?? []).map((m) => m.n)]);
      for (const n of used) parts.set(n, new THREE.Group());
      const root = new THREE.Group();
      const st = initialPhys(e);
      const ctx: FxCtx = {e, root, part: (n) => parts.get(n), choiceNum: (key, d = 1) => Number(/-?\d+(?:[.,]\d+)?/.exec(e.choices?.find((c) => c.key === key)?.options.find((o) => o[0] === st.s[key])?.[1] ?? '')?.[0].replace(',', '.') ?? d)};
      const update = BENCH_FX[e.id](ctx);
      const moved = new Set<string>();
      const first = new Map<number, string>();
      for (let f = 0; f < 480; f++) {
        for (const o of parts.values()) {
          o.position.set(0, 0, 0);
          o.rotation.set(0, 0, 0);
          o.scale.set(1, 1, 1);
        }
        update(1 / 60, {p: st.p, s: st.s, rows: 0}, f / 60);
        parts.forEach((o, n) => {
          const sig = `${o.position.x.toFixed(3)},${o.position.y.toFixed(3)},${o.rotation.x.toFixed(3)},${o.rotation.y.toFixed(3)},${o.rotation.z.toFixed(3)},${o.scale.x.toFixed(3)},${o.scale.y.toFixed(3)}`;
          expect(sig, `${e.id} bộ phận ${n} ra số vô nghĩa`).not.toMatch(/NaN|Infinity/);
          if (!first.has(n)) first.set(n, sig);
          else if (first.get(n) !== sig) moved.add(String(n));
        });
      }
      // hiệu ứng chỉ gồm hạt/sóng/đèn (không có phần động Blender): chỉ cần chạy sạch
      const animatedParts = [...(FX_PARTS[e.id] ?? [])];
      if (animatedParts.length) expect(moved.size, `${e.id}: không bộ phận nào chuyển động`).toBeGreaterThan(0);
      // mọi vật vẽ thêm (hạt, vòng sóng, đèn) cũng không được có toạ độ vô nghĩa
      root.traverse((o) => {
        expect(Number.isFinite(o.position.x + o.position.y + o.position.z), `${e.id} có vật vẽ thêm lỗi toạ độ`).toBe(true);
      });
    });
  }
});
