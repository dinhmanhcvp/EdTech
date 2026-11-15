import {readFileSync} from 'fs';
import {join} from 'path';
import * as THREE from 'three';
import {describe, expect, it} from 'vitest';
import {BENCH_FX, type FxCtx} from '../engines/families/benchMotion';
import {BIO_FX, BIO_FX_PARTS} from '../engines/families/benchMotionBio';
import {LAB_ALIAS} from '../engines/families/labLessons';
import {BENCH_MOVES} from '../utils/lab/hands/benchMoves';
import {BIO_EXPERIMENTS} from '../utils/lab/bio/experiments';
import {initialPhys} from '../utils/lab/phys/engine';

const nodes = (() => {
  const b = readFileSync(join(__dirname, '../../public/models/bench-bio.glb'));
  const json = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString('utf8')) as {nodes: {name: string}[]};
  return new Set(json.nodes.map((n) => n.name));
})();

/** chạy hiệu ứng của một bài `frames` khung hình ở trạng thái `s`/`p` cho trước; trả chữ kí vị trí của mọi phần động và mọi vật vẽ thêm */
function run(id: string, patch: {p?: Record<string, number>; s?: Record<string, string>} = {}, frames = 480) {
  const e = BIO_EXPERIMENTS.find((x) => x.id === id)!;
  const parts = new Map<number, THREE.Object3D>();
  for (const n of new Set([...(BIO_FX_PARTS[id] ?? []), ...(BENCH_MOVES[id] ?? []).map((m) => m.n)])) parts.set(n, new THREE.Group());
  const root = new THREE.Group();
  const st = initialPhys(e);
  const L = {p: {...st.p, ...patch.p}, s: {...st.s, ...patch.s}, rows: 0};
  const ctx: FxCtx = {e, root, part: (n) => parts.get(n), choiceNum: () => 1};
  const update = BIO_FX[id](ctx);
  const seen = new Set<string>();
  const sig = () => {
    const out: string[] = [];
    parts.forEach((o) => out.push([o.position.x, o.position.y, o.position.z, o.rotation.z, o.scale.x, o.scale.y, o.visible ? 1 : 0].map((v) => Number(v).toFixed(3)).join(',')));
    root.traverse((o) => {
      const m = o as THREE.InstancedMesh;
      out.push([o.position.x, o.position.y, o.position.z, o.rotation.z, o.scale.y, o.visible ? 1 : 0].map((v) => Number(v).toFixed(3)).join(','));
      if (m.isInstancedMesh) out.push(Array.from(m.instanceMatrix.array).map((v) => v.toFixed(2)).join(','));
      const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (mat?.color) out.push(mat.color.getHexString() + (mat.opacity ?? 1).toFixed(2));
    });
    return out.join('|');
  };
  for (let f = 0; f < frames; f++) {
    for (const o of parts.values()) {
      o.position.set(0, 0, 0);
      o.rotation.set(0, 0, 0);
      o.scale.set(1, 1, 1);
    }
    update(1 / 60, L, f / 60);
    const s = sig();
    expect(s, `${id} ra số vô nghĩa ở khung ${f}`).not.toMatch(/NaN|Infinity/);
    seen.add(s);
  }
  return {distinct: seen.size, last: sig()};
}

describe('bài thực hành Sinh học không đứng yên: mỗi bài có chuyển động và phản ứng theo lựa chọn của bài', () => {
  it('mọi bài SGK Sinh (trừ bài đã gộp) đều có hiệu ứng; không trùng mã với bài Lí; phần động có trong tệp mô hình', () => {
    for (const e of BIO_EXPERIMENTS) {
      if (LAB_ALIAS[`BIO_LAB_${e.id}`]) continue;
      expect(BIO_FX[e.id], `${e.id} chưa có chuyển động`).toBeTypeOf('function');
      expect(BENCH_FX[e.id], `${e.id} trùng mã bài Lí`).toBeUndefined();
    }
    for (const [id, ns] of Object.entries(BIO_FX_PARTS)) for (const n of ns) expect(nodes.has(`Mov_${id}_${n}`), `Mov_${id}_${n}`).toBe(true);
    for (const id of ['ENZYME', 'YOGURT', 'SEED_RESPIRATION']) expect(nodes.has(`Mov_${id}_1`), `cần gạt ${id}`).toBe(true);
  });

  for (const e of BIO_EXPERIMENTS) {
    it(`${e.id}: chạy 8 giây không lỗi và hình thật sự thay đổi theo thời gian`, () => {
      // bài chỉ vẽ lên canvas (thị trường kính, màn hình) không có canvas trong môi trường test: chỉ cần chạy sạch
      const canvasOnly = ['CELL_OBSERVE', 'CHROMOSOME_MUTATION'].includes(e.id);
      const r = run(e.id);
      if (!canvasOnly) expect(r.distinct, `${e.id}: không có gì chuyển động`).toBeGreaterThan(5);
    });
  }

  it('hình phản ứng theo lựa chọn / thanh trượt: đổi điều kiện thì trạng thái cuối khác đi', () => {
    const differ = (id: string, a: Parameters<typeof run>[1], b: Parameters<typeof run>[1]) => expect(run(id, a, 600).last, `${id} không phản ứng`).not.toBe(run(id, b, 600).last);
    differ('BIOMOLECULES', {s: {sample: 'starch', reagent: 'iodine'}}, {s: {sample: 'water', reagent: 'iodine'}}); // dương tính ↔ âm tính
    differ('ENZYME', {p: {T: 37}}, {p: {T: 90}}); // enzyme biến tính: không mất màu
    differ('YOGURT', {p: {t: 0}}, {p: {t: 12}});
    differ('LEAF_STARCH', {p: {h: 0}, s: {dark: 'yes'}}, {p: {h: 8}, s: {dark: 'yes'}});
    differ('SEED_RESPIRATION', {s: {g: 'live'}}, {s: {g: 'boiled'}});
    differ('TROPISM', {p: {d: 5}, s: {grp: 'exp'}}, {p: {d: 5}, s: {grp: 'ctrl'}});
    differ('APICAL_DOMINANCE', {p: {d: 28}, s: {cut: 'yes'}}, {p: {d: 28}, s: {cut: 'no'}});
    differ('MODIFICATION', {p: {N: 0}}, {p: {N: 200}});
    differ('QUADRAT', {s: {site: 'A'}}, {s: {site: 'C'}});
    differ('COMMUNITY', {s: {site: 'forest'}}, {s: {site: 'rice'}});
    differ('MINI_ECOSYSTEM', {p: {fi: 1}}, {p: {fi: 10}});
    differ('DNA_EXTRACT', {s: {grind: 'no'}}, {s: {grind: 'yes'}});
    differ('PIGMENT', {p: {ds: 4}}, {p: {ds: 10}});
    differ('METAMORPHOSIS', {p: {d: 0}}, {p: {d: 60}});
  });
});
