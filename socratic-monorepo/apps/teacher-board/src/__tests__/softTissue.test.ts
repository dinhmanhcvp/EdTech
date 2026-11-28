import {describe, expect, it} from 'vitest';
import {Thread, Tissue, type TissueSpec} from '../utils/lab/hands/xpbd';
import {Fluid} from '../utils/lab/hands/pbf';

const SMALL: TissueSpec = {
  nx: 10,
  nz: 6,
  rows: [
    {h: 0.15, layer: 0},
    {h: 0.13, layer: 1},
    {h: 0.08, layer: 2},
  ],
  sx: 1.25,
  sz: 0.75,
};
const run = (t: Tissue, frames: number) => {
  for (let f = 0; f < frames; f++) t.step(1 / 60);
};
const p = (t: Tissue, v: number): [number, number, number] => [t.pos[v * 3], t.pos[v * 3 + 1], t.pos[v * 3 + 2]];

describe('mô tứ diện XPBD', () => {
  it('mô đứng yên thì NGỦ (bỏ qua bước giải), cầm vào là thức dậy và đi theo tay', () => {
    const t = new Tissue(SMALL);
    for (let i = 0; i < 400 && !t.asleep; i++) t.step(1 / 60, 4);
    expect(t.asleep).toBe(true);
    const before = Float32Array.from(t.pos);
    t.step(1 / 60, 4);
    expect(Array.from(t.pos)).toEqual(Array.from(before)); // ngủ: không đổi gì
    const v = t.vid(2, SMALL.rows.length, 2);
    t.attaches.push({v, target: [t.pos[v * 3], t.pos[v * 3 + 1] + 0.3, t.pos[v * 3 + 2]], compliance: 1e-4});
    for (let i = 0; i < 20; i++) t.step(1 / 60, 4);
    expect(t.asleep).toBe(false);
    expect(Math.abs(t.pos[v * 3 + 1] - before[v * 3 + 1])).toBeGreaterThan(0.01); // giải lại: đỉnh bị cầm đã dịch
  });
  it('lưới đúng số phần tử, thể tích bằng khối, mặt ngoài kín và hướng ra ngoài', () => {
    const t = new Tissue(SMALL);
    expect(t.alive.length).toBe(10 * 6 * 3 * 6);
    expect(Math.abs(t.volume())).toBeCloseTo(1.25 * 0.75 * 0.36, 3);
    const b = t.boundary();
    expect(b.tri.length / 3).toBe(2 * (2 * 10 * 6 + 2 * 10 * 3 + 2 * 6 * 3));
    // mọi mặt nằm trên đỉnh khối có pháp tuyến hướng lên
    let up = 0;
    for (let f = 0; f < b.tri.length / 3; f++) {
      const [a, c, d] = [0, 1, 2].map((n) => p(t, b.tri[f * 3 + n]));
      if (Math.min(a[1], c[1], d[1]) < 0.359) continue;
      const ny = (c[2] - a[2]) * (d[0] - a[0]) - (c[0] - a[0]) * (d[2] - a[2]);
      expect(ny).toBeGreaterThan(0);
      up++;
    }
    expect(up).toBe(2 * 10 * 6);
  });
  it('dưới trọng lực mô gần như không nén (thể tích lệch < 3 %)', () => {
    const t = new Tissue(SMALL);
    const v0 = Math.abs(t.volume());
    run(t, 60);
    expect(Math.abs(Math.abs(t.volume()) - v0) / v0).toBeLessThan(0.03);
  });
  it('rạch: xoá phần tử thật, rạch lại cùng chỗ thì sâu thêm; da căng làm mép banh ra', () => {
    const t = new Tissue(SMALL);
    run(t, 30);
    const L = t.vid(4, 3, 3);
    const R = t.vid(6, 3, 3);
    const d0 = Math.hypot(t.pos[L * 3] - t.pos[R * 3], t.pos[L * 3 + 2] - t.pos[R * 3 + 2]);
    for (let k = 1; k < 5; k++) expect(t.cut(5, k)).toBe(2);
    expect(t.topRow(5, 3)).toBe(1);
    expect(t.cut(5, 3)).toBe(1); // nhát thứ hai vào mỡ
    expect(t.topRow(5, 3)).toBe(0);
    run(t, 90);
    const d1 = Math.hypot(t.pos[L * 3] - t.pos[R * 3], t.pos[L * 3 + 2] - t.pos[R * 3 + 2]);
    expect(d1).toBeGreaterThan(d0 * 1.03);
    expect(t.boundary().tri.length).toBeGreaterThan(new Tissue(SMALL).boundary().tri.length);
  });
  it('rạch lại vào rãnh đã sâu: chạm vách rãnh thì nhát dao vẫn thuộc cột rãnh (sâu thêm), không rơi sang cột bên', () => {
    const t = new Tissue(SMALL);
    for (let k = 1; k < 5; k++) t.cut(5, k);
    const b = t.boundary();
    expect(b.tet.length).toBe(b.tri.length / 3);
    const {nx, rows} = SMALL;
    const NX = nx + 1;
    const NY = rows.length + 1;
    const grid = (v: number) => [v % NX, Math.floor(v / NX) % NY, Math.floor(v / (NX * NY))];
    let walls = 0;
    let floors = 0;
    for (let f = 0; f < b.tet.length; f++) {
      const vs = [0, 1, 2].map((n) => grid(b.tri[f * 3 + n]));
      const c = t.tetCell[b.tet[f]];
      const [ci, ck] = [c % nx, Math.floor(c / (nx * rows.length))];
      const col = t.faceColumn(b.tri[f * 3], b.tri[f * 3 + 1], b.tri[f * 3 + 2], b.tet[f]);
      // vách rãnh: mặt đứng chung một chỉ số i (x = 5 hoặc 6) của ô cột 4 hoặc 6, ở hàng da, trong đoạn đã rạch
      const wallX = vs.every((g) => g[0] === vs[0][0]) && (vs[0][0] === 5 || vs[0][0] === 6) && (ci === 4 || ci === 6) && ck >= 1 && ck < 5;
      if (wallX && vs.every((g) => g[1] >= 2)) {
        expect(col).toEqual([5, ck]);
        walls++;
      }
      // đáy rãnh (mặt trên của hàng mỡ ở cột 5) và mặt da còn nguyên: cột của chính ô đó
      if (vs.every((g) => g[1] === vs[0][1])) {
        expect(col).toEqual([ci, ck]);
        if (ci === 5 && vs[0][1] === 2) floors++;
      }
    }
    expect(walls).toBe(2 * 4 * 2); // hai vách × 4 ô × 2 tam giác
    expect(floors).toBe(4 * 2);
    // vách ngoài cùng của khối (không có cột bên kia): giữ cột của ô
    const edge = new Tissue(SMALL).boundary();
    for (let f = 0; f < edge.tet.length; f++) {
      const c = t.tetCell[edge.tet[f]];
      const col = t.faceColumn(edge.tri[f * 3], edge.tri[f * 3 + 1], edge.tri[f * 3 + 2], edge.tet[f]);
      expect(col).toEqual([c % nx, Math.floor(c / (nx * rows.length))]);
    }
  });
  it('kéo quá ngưỡng thì mô rách', () => {
    const t = new Tissue(SMALL);
    const v = t.vid(5, 3, 3);
    t.attaches.push({v, target: [p(t, v)[0], 1.6, p(t, v)[2]], compliance: 0});
    let torn = 0;
    for (let f = 0; f < 60; f++) {
      t.step(1 / 60);
      torn += t.tear();
    }
    expect(torn).toBeGreaterThan(0);
  });
  it('dao đốt: nhiệt lan sang đỉnh lân cận và để lại vết cháy', () => {
    const t = new Tissue(SMALL);
    const v = t.vid(5, 3, 3);
    t.cauterize(p(t, v), 0.05, 3);
    const nb = t.nbr[v][0];
    for (let f = 0; f < 10; f++) t.diffuseHeat(1 / 60);
    expect(t.heat[nb]).toBeGreaterThan(0);
    expect(t.burned[v]).toBeGreaterThan(1);
  });
  it('mũi khâu kéo hai mép khép lại', () => {
    const t = new Tissue(SMALL);
    for (let k = 1; k < 5; k++) t.cut(5, k);
    run(t, 60);
    const a = t.vid(5, 3, 3);
    const b = t.vid(6, 3, 3);
    const before = t.dist(a, b);
    t.stitches.push({a, b, rest: before, goal: 0.02});
    let torn = 0;
    for (let f = 0; f < 120; f++) {
      t.step(1 / 60);
      torn += t.tear();
    }
    expect(t.dist(a, b)).toBeLessThan(before * 0.6);
    // thắt vừa tay: không xé mép mô quanh mũi khâu
    expect(torn).toBe(0);
  });
});

describe('sợi chỉ và máu', () => {
  it('sợi chỉ không giãn khi kéo', () => {
    const th = new Thread(20, 0.05, [0, 0.5, 0]);
    for (let f = 0; f < 60; f++) th.step(1 / 60, [0, 0.5, 0], [0.6, 0.9, 0.2]);
    expect(th.length()).toBeLessThan(19 * 0.05 * 1.08);
    expect(th.length()).toBeGreaterThan(0.6);
  });
  it('máu đọng trong hốc (thấp hơn mép) và ống hút xoá hạt', () => {
    const f = new Fluid(400, 0.07, [-1, 1, -1, 1]);
    // hốc rộng 0,4 sâu 0,3 giữa mặt phẳng cao 0,3
    const floor = (x: number) => (Math.abs(x) < 0.2 ? 0 : 0.3);
    for (let i = 0; i < 120; i++) f.add((i % 6) * 0.03 - 0.08, 0.5 + Math.floor(i / 36) * 0.03, (Math.floor(i / 6) % 6) * 0.03 - 0.08, 0, 0, 0);
    for (let s = 0; s < 120; s++) f.step(1 / 60, floor);
    let inside = 0;
    for (let i = 0; i < f.n; i++) if (Math.abs(f.pos[i * 3]) < 0.22 && f.pos[i * 3 + 1] < 0.32) inside++;
    expect(inside / f.n).toBeGreaterThan(0.8);
    const n0 = f.n;
    expect(f.suck(0, 0.1, 0, 0.25)).toBeGreaterThan(0);
    expect(f.n).toBeLessThan(n0);
  });
});
