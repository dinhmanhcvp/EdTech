import {describe, expect, it} from 'vitest';
import type {GeoScene} from '../utils/geometryProblem';
import {
  addArc,
  addBisector,
  addCircleOf,
  addFreePoint,
  addIntersection,
  addLineCircle,
  addMidpoint,
  addPerpBisector,
  addPointOnCircle,
  addPolygon,
  addReflection,
  addRegularPolygon,
  addTangent,
  addTransform,
  blankConstruction,
  freePoints,
  measureAngle,
  measureDistance,
  measurePolygon,
  moveFreePoint,
} from '../utils/geoTools';

/**
 * Dựng hình tự do (nút Hình → "Dựng hình tự do"): bắt đầu từ trang trắng, dựng bằng các dụng cụ; kéo điểm gốc thì MỌI đối tượng
 * phụ thuộc vẫn giữ tính chất (trung điểm, trung trực, phân giác, giao điểm, đối xứng, quay, vị tự, tịnh tiến, điểm trên đường tròn, giao đường–tròn).
 */
type V = number[];
const fresh = (before: GeoScene, after: GeoScene) => after.order.filter((n) => !before.order.includes(n));
const d = (a: V, b: V) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const cross = (o: V, a: V, b: V) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
const dot = (o: V, a: V, p: V, b: V) => (a[0] - o[0]) * (b[0] - p[0]) + (a[1] - o[1]) * (b[1] - p[1]);
const ang = (a: V, v: V, c: V) => Math.acos(dot(v, a, v, c) / (d(v, a) * d(v, c)));

/** Dựng một hình đủ loại đối tượng từ trang trắng; trả tên các điểm để kiểm tra. */
function construct() {
  let s = blankConstruction();
  const C = addFreePoint(s, [1.2, 2.6, 0], 0)!;
  s = addPolygon(C.scene, ['A', 'B', C.name], 0)!;
  const c = C.name;
  const step = (t: GeoScene | null | undefined) => {
    expect(t).toBeTruthy();
    const out = fresh(s, t!);
    s = t!;
    return out;
  };
  const [M] = step(addMidpoint(s, 'A', 'B', 0).scene);
  const pb = step(addPerpBisector(s, 'A', 'B', 0));
  const bis = step(addBisector(s, 'B', 'A', c, 0));
  const [H] = step(addIntersection(s, 'A', 'B', c, M, 0)); // giao của AB với CM
  const [R] = step(addReflection(s, c, ['A', 'B'], 0));
  const [Pc] = step(addReflection(s, c, M, 0));
  const [Q] = step(addTransform(s, c, {k: 'rot', o: 'A', deg: 50}, 0));
  const [Dl] = step(addTransform(s, c, {k: 'dil', o: 'A', f: 1.5}, 0));
  const [T] = step(addTransform(s, c, {k: 'trans', a: 'A', b: 'B'}, 0));
  step(addCircleOf(s, 'cp', [M, 'A'], 0));
  const [K] = step(addPointOnCircle(s, M, 'A', 0)!.scene);
  const lc = step(addLineCircle(s, c, 'A', M, 'B', 0)!.scene);
  step(addTangent(s, M, K, 0));
  step(addArc(s, 'A', 'B', c, 0));
  step(addRegularPolygon(s, 'A', 'B', 5, 0));
  return {s, c, M, pb, bis, H, R, Pc, Q, Dl, T, K, lc};
}

const check = (x: ReturnType<typeof construct>, s: GeoScene) => {
  const p = (n: string) => s.pts[n] as V;
  const [A, B, Cp, M] = [p('A'), p('B'), p(x.c), p(x.M)];
  expect(d(M, [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2])).toBeLessThan(1e-9);
  // trung trực: các điểm vẽ cách đều A, B
  for (const n of x.pb) expect(Math.abs(d(p(n), A) - d(p(n), B))).toBeLessThan(1e-9);
  // phân giác góc BAC: điểm trên phân giác tạo hai góc bằng nhau
  for (const n of x.bis.filter((q) => d(p(q), A) > 1e-6)) expect(Math.abs(ang(B, A, p(n)) - ang(p(n), A, Cp))).toBeLessThan(1e-7);
  expect(Math.abs(cross(A, B, p(x.H))) + Math.abs(cross(Cp, M, p(x.H)))).toBeLessThan(1e-9);
  // đối xứng trục AB: AB là trung trực của C R
  expect(Math.abs(d(p(x.R), A) - d(Cp, A)) + Math.abs(d(p(x.R), B) - d(Cp, B))).toBeLessThan(1e-9);
  expect(d(M, [(Cp[0] + p(x.Pc)[0]) / 2, (Cp[1] + p(x.Pc)[1]) / 2])).toBeLessThan(1e-9);
  expect(Math.abs(d(p(x.Q), A) - d(Cp, A))).toBeLessThan(1e-9);
  expect(Math.abs((ang(Cp, A, p(x.Q)) * 180) / Math.PI - 50)).toBeLessThan(1e-6);
  expect(Math.abs(d(p(x.Dl), A) - 1.5 * d(Cp, A)) + Math.abs(cross(A, Cp, p(x.Dl)))).toBeLessThan(1e-9);
  expect(d(p(x.T), [Cp[0] + B[0] - A[0], Cp[1] + B[1] - A[1]])).toBeLessThan(1e-9);
  // điểm trên đường tròn tâm M qua A; giao đường CA với đường tròn đó
  expect(Math.abs(d(p(x.K), M) - d(A, M))).toBeLessThan(1e-9);
  expect(x.lc.length).toBeGreaterThanOrEqual(2);
  for (const n of x.lc.filter((q) => s.defs?.[q]?.k === 'lcint')) {
    expect(Math.abs(d(p(n), M) - d(A, M))).toBeLessThan(1e-9);
    expect(Math.abs(cross(Cp, A, p(n))) / d(Cp, A)).toBeLessThan(1e-9);
  }
};

describe('dựng hình tự do', () => {
  it('trang trắng có hai điểm tự do A, B kéo đi đâu cũng được', () => {
    const s = blankConstruction();
    expect(s.dim).toBe(2);
    expect(freePoints(s).sort()).toEqual(['A', 'B']);
    const t = moveFreePoint(s, 'B', [5, 1.5, 0]);
    expect(t.pts.B).toEqual([5, 1.5, 0]);
  });

  it('dựng đủ loại đối tượng; đo độ dài, góc, diện tích', () => {
    const x = construct();
    check(x, x.s);
    expect(measureDistance(x.s, 'A', 'B')).toMatch(/4/);
    expect(measureAngle(x.s, 'B', 'A', x.c)).toMatch(/°/);
    expect(measurePolygon(x.s, ['A', 'B', x.c], 'area')).toMatch(/\d/);
  });

  it('kéo A, B, C (nhiều hướng, nhiều lần): mọi đối tượng phụ thuộc vẫn đúng tính chất', () => {
    const x = construct();
    let s = x.s;
    expect(freePoints(s)).toEqual(expect.arrayContaining(['A', 'B', x.c, x.K]));
    const moves: [string, number, number][] = [['A', -0.6, 0.4], ['B', 0.9, -0.5], [x.c, -1.1, 0.8], ['A', 0.3, -0.9], [x.c, 2, 0.3]];
    for (const [n, dx, dy] of moves) {
      s = moveFreePoint(s, n, [s.pts[n][0] + dx, s.pts[n][1] + dy, 0]);
      for (const q of Object.values(s.pts)) expect(q.every(Number.isFinite)).toBe(true);
      check(x, s);
    }
  });

  it('điểm trên đường tròn kéo được trượt TRÊN đường tròn (không rời ra)', () => {
    const x = construct();
    const s = moveFreePoint(x.s, x.K, [9, 9, 0]);
    const p = (n: string) => s.pts[n] as V;
    expect(Math.abs(d(p(x.K), p(x.M)) - d(p('A'), p(x.M)))).toBeLessThan(1e-9);
    expect(Math.atan2(p(x.K)[1] - p(x.M)[1], p(x.K)[0] - p(x.M)[0])).toBeCloseTo(Math.atan2(9 - p(x.M)[1], 9 - p(x.M)[0]), 9);
    check(x, s);
  });
});
