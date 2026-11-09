import {describe, expect, it} from 'vitest';
import {buildScene} from '../utils/geometryProblem';
import {addMidline, addMidpoint, freePoints, moveFreePoint, removePoint} from '../utils/geoTools';

const sceneOf = (t: string) => buildScene(t).scene!;
const dist = (s: ReturnType<typeof sceneOf>, a: string, b: string) => Math.hypot(s.pts[a][0] - s.pts[b][0], s.pts[a][1] - s.pts[b][1]);
const cosAt = (s: ReturnType<typeof sceneOf>, a: string, v: string, c: string) => {
  const [u, w] = [[s.pts[a][0] - s.pts[v][0], s.pts[a][1] - s.pts[v][1]], [s.pts[c][0] - s.pts[v][0], s.pts[c][1] - s.pts[v][1]]];
  return (u[0] * w[0] + u[1] * w[1]) / (dist(s, a, v) * dist(s, c, v));
};

describe('kéo mọi đỉnh mà vẫn giữ tính chất', () => {
  it('tam giác vuông tại A: mọi đỉnh kéo được, góc A vẫn 90°, trọng tâm và chân đường cao tự theo', () => {
    let s = sceneOf('Cho tam giác ABC vuông tại A, AB = 3, AC = 4. Gọi G là trọng tâm tam giác ABC. Kẻ đường cao AH.');
    expect(freePoints(s).sort()).toEqual(['A', 'B', 'C']);
    const g0 = s.pts.G;
    s = moveFreePoint(s, 'B', [5, 2, 0]);
    expect(s.pts.B.slice(0, 2)).toEqual([5, 2]);
    expect(Math.abs(cosAt(s, 'B', 'A', 'C'))).toBeLessThan(1e-5);
    expect(s.pts.G).not.toEqual(g0);
    for (const k of [0, 1]) expect(s.pts.G[k]).toBeCloseTo((s.pts.A[k] + s.pts.B[k] + s.pts.C[k]) / 3, 6);
    expect(s.pts.H).toBeDefined();
    expect(Math.abs((s.pts.A[0] - s.pts.H[0]) * (s.pts.C[0] - s.pts.B[0]) + (s.pts.A[1] - s.pts.H[1]) * (s.pts.C[1] - s.pts.B[1]))).toBeLessThan(1e-6);
    s = moveFreePoint(s, 'A', [-1, 1, 0]);
    expect(Math.abs(cosAt(s, 'B', 'A', 'C'))).toBeLessThan(1e-5);
  });

  it('hình vuông: kéo C thì bốn cạnh vẫn bằng nhau', () => {
    let s = sceneOf('Cho hình vuông ABCD cạnh a.');
    s = moveFreePoint(s, 'C', [2.5, 1.8, 0]);
    const e = dist(s, 'A', 'B');
    for (const [a, b] of [['B', 'C'], ['C', 'D'], ['D', 'A']]) expect(dist(s, a, b)).toBeCloseTo(e, 5);
    expect(Math.abs(cosAt(s, 'B', 'A', 'D'))).toBeLessThan(1e-5);
  });

  it('điểm trên cạnh vẫn nằm đúng tỉ lệ sau khi kéo đỉnh', () => {
    let s = sceneOf('Cho tam giác ABC.');
    s = addMidpoint(s, 'A', 'B', 0).scene;
    s = moveFreePoint(s, 'B', [6, 1, 0]);
    expect(s.pts.M[0]).toBeCloseTo((s.pts.A[0] + 6) / 2, 6);
  });
});

describe('xóa điểm', () => {
  it('xóa điểm thêm vào kéo theo đoạn nối và điểm phụ thuộc; đỉnh gốc thì giữ nguyên', () => {
    let s = sceneOf('Cho tam giác ABC.');
    const m = addMidpoint(s, 'A', 'B', 0);
    s = addMidpoint(m.scene, 'M', 'C', 0).scene;
    const before = s.order.length;
    const out = removePoint(s, 'M');
    expect(out.pts.M).toBeUndefined();
    expect(out.order.length).toBe(before - 2); // N phụ thuộc M nên đi cùng
    expect(removePoint(s, 'A')).toBe(s);
  });
});

describe('đường trung bình', () => {
  it('nối trung điểm hai cạnh kề, song song cạnh còn lại, bằng nửa; vẫn đúng khi kéo đỉnh', () => {
    let s = sceneOf('Cho tam giác ABC.');
    const r = addMidline(s, 'A', 'B', 'C', 0);
    s = moveFreePoint(r.scene, 'C', [5, 4, 0]);
    const [m, n] = r.names;
    expect(dist(s, m, n)).toBeCloseTo(dist(s, 'B', 'C') / 2, 6);
    const cr = (s.pts[n][0] - s.pts[m][0]) * (s.pts.C[1] - s.pts.B[1]) - (s.pts[n][1] - s.pts[m][1]) * (s.pts.C[0] - s.pts.B[0]);
    expect(Math.abs(cr)).toBeLessThan(1e-6);
  });
});

describe('gõ ký hiệu chữ thường', () => {
  it.each(['tam giác abc ab vuông bc', 'Cho tam giác ABC, AB ⊥ BC', 'tam giac abc, ab vuong goc bc'])('"%s" → vuông tại B', (t) => {
    const s = sceneOf(t);
    expect(Object.keys(s.pts).sort()).toEqual(['A', 'B', 'C']);
    expect(Math.abs(cosAt(s, 'A', 'B', 'C'))).toBeLessThan(1e-6);
  });
});

import {addFreePoint, addSector, addSegmentLen, addSemicircle, toggleHidden, removePoint as rmPoint, addLineAB, addPolygon, addRegularPolygon, addTangentsFrom, addTransform, addVector, toggleLabel, addBisector, addCircleOf, addIntersection, addLineThrough, addPerpBisector, addReflection, addTangent, measurePolygon} from '../utils/geoTools';

describe('dựng hình kiểu GeoGebra', () => {
  const tri = () => sceneOf('Cho tam giác ABC có AB = 4, AC = 3, BC = 5.');
  const dot2 = (s: ReturnType<typeof sceneOf>, a: string, b: string, c: string, d: string) =>
    (s.pts[b][0] - s.pts[a][0]) * (s.pts[d][0] - s.pts[c][0]) + (s.pts[b][1] - s.pts[a][1]) * (s.pts[d][1] - s.pts[c][1]);

  it('trung trực: vuông góc AB tại trung điểm và vẫn đúng sau khi kéo đỉnh', () => {
    let s = addPerpBisector(tri(), 'A', 'B', 0)!;
    const [M, e1, e2] = s.order.slice(3);
    s = moveFreePoint(s, 'B', [6, 1, 0]);
    expect(s.pts[M][0]).toBeCloseTo((s.pts.A[0] + s.pts.B[0]) / 2, 6);
    expect(Math.abs(dot2(s, 'A', 'B', e1, e2))).toBeLessThan(1e-6);
  });

  it('song song và vuông góc qua một điểm', () => {
    const par = addLineThrough(tri(), 'par', 'C', 'A', 'B', 0)!;
    expect(Math.abs((par.scene.pts[par.ends[0]][1] - par.scene.pts[par.ends[1]][1]) * 1)).toBeLessThan(1e-6);
    const perp = addLineThrough(tri(), 'perp', 'C', 'A', 'B', 0)!;
    expect(Math.abs(dot2(perp.scene, 'A', 'B', perp.ends[0], perp.ends[1]))).toBeLessThan(1e-6);
  });

  it('phân giác chia BC theo tỉ lệ AB:AC; giao điểm hai đường; đối xứng', () => {
    const b = addBisector(tri(), 'B', 'A', 'C', 0)!; // phân giác góc A, chân trên BC
    const D = b.order[3];
    expect(dist(b, 'B', D) / dist(b, 'C', D)).toBeCloseTo(dist(b, 'A', 'B') / dist(b, 'A', 'C'), 6);
    const x = addIntersection(tri(), 'A', 'B', 'C', 'A', 0)!;
    expect(x.pts[x.order[3]][0]).toBeCloseTo(x.pts.A[0], 6);
    expect(addIntersection(addLineThrough(tri(), 'par', 'C', 'A', 'B', 0)!.scene, 'A', 'B', 'C', 'C', 0)).toBeNull();
    const r = addReflection(tri(), 'C', ['A', 'B'], 0)!;
    expect(r.pts[r.order[3]][1]).toBeCloseTo(-tri().pts.C[1], 6);
    const rp = addReflection(tri(), 'C', 'A', 0)!;
    expect(rp.pts[rp.order[3]][0]).toBeCloseTo(2 * tri().pts.A[0] - tri().pts.C[0], 6);
  });

  it('đường tròn theo điểm và tiếp tuyến; đường tròn tự theo khi kéo', () => {
    let s = addCircleOf(tri(), 'cp', ['A', 'B'], 0)!;
    expect(s.circles!.at(-1)!.r).toBeCloseTo(4, 6);
    s = moveFreePoint(s, 'B', [5, 2, 0]);
    expect(s.circles!.at(-1)!.r).toBeCloseTo(dist(s, 'A', 'B'), 6);
    const t = addTangent(tri(), 'A', 'B', 0)!;
    expect(Math.abs(dot2(t, 'A', 'B', t.order[3], t.order[4]))).toBeLessThan(1e-6);
    expect(addCircleOf(tri(), 'circum', ['A', 'B', 'C'], 0)!.circles!.at(-1)!.r).toBeCloseTo(2.5, 6);
  });

  it('diện tích và chu vi', () => {
    expect(measurePolygon(tri(), ['A', 'B', 'C'], 'area')).toBe('S(ABC) = 6a²');
    expect(measurePolygon(tri(), ['A', 'B', 'C'], 'perimeter')).toContain('12a');
  });
});

describe('dựng hình kiểu GeoGebra (phần 2)', () => {
  const tri = () => sceneOf('Cho tam giác ABC có AB = 4, AC = 3, BC = 5.');

  it('đa giác đều dựng trên cạnh AB: các cạnh bằng nhau và vẫn đều khi kéo', () => {
    let s = addRegularPolygon(tri(), 'A', 'B', 5, 0)!;
    const ring = ['A', 'B', ...s.order.slice(3)];
    expect(ring).toHaveLength(5);
    s = moveFreePoint(s, 'B', [7, 2, 0]);
    const e = dist(s, 'A', 'B');
    ring.forEach((n, i) => expect(dist(s, n, ring[(i + 1) % 5])).toBeCloseTo(e, 5));
  });

  it('hình vuông trên cạnh AB có góc vuông', () => {
    const s = addRegularPolygon(tri(), 'A', 'B', 4, 0)!;
    const [C, D] = s.order.slice(3);
    expect(Math.abs(cosAt(s, 'A', 'B', C))).toBeLessThan(1e-6);
    expect(dist(s, C, D)).toBeCloseTo(4, 6);
  });

  it('đường thẳng, tia, véctơ, đa giác', () => {
    const line = addLineAB(tri(), 'A', 'B', 'line', 0)!;
    expect(line.aux.at(-1)).toBeDefined();
    const ray = addLineAB(tri(), 'A', 'B', 'ray', 0)!;
    expect(ray.aux.at(-1)![0]).toBe('A');
    const v = addVector(tri(), 'A', 'B', 0)!;
    expect(v.aux.length).toBe(tri().aux.length + 3);
    expect(addPolygon(tri(), ['A', 'B'], 0)).toBeNull();
    expect(addPolygon(tri(), ['A', 'B', 'C'], 0)).not.toBeNull();
  });

  it('tịnh tiến, quay 90°, vị tự, và theo khi kéo', () => {
    let s = addTransform(tri(), 'C', {k: 'trans', a: 'A', b: 'B'}, 0)!;
    const T = s.order.at(-1)!;
    expect(s.pts[T][0]).toBeCloseTo(s.pts.C[0] + 4, 6);
    s = moveFreePoint(s, 'B', [6, 1, 0]);
    expect(s.pts[T][0]).toBeCloseTo(s.pts.C[0] + (s.pts.B[0] - s.pts.A[0]), 6);
    const r = addTransform(tri(), 'B', {k: 'rot', o: 'A', deg: 90}, 0)!;
    const R = r.order.at(-1)!;
    expect(Math.abs(cosAt(r, 'B', 'A', R))).toBeLessThan(1e-6);
    const d = addTransform(tri(), 'B', {k: 'dil', o: 'A', f: 2}, 0)!;
    expect(d.pts[d.order.at(-1)!][0]).toBeCloseTo(8, 6);
  });

  it('tiếp tuyến từ điểm ngoài: tiếp điểm nằm trên đường tròn và OT vuông PT; trong đường tròn thì từ chối', () => {
    const s = addTangentsFrom(tri(), 'B', 'A', 'C', 0)!; // tâm A bán kính AC = 3, B cách A 4 (ngoài)
    expect(s).not.toBeNull();
    const [T1] = s.order.slice(3);
    expect(dist(s, 'A', T1)).toBeCloseTo(3, 6);
    expect(Math.abs((s.pts[T1][0] - s.pts.A[0]) * (s.pts[T1][0] - s.pts.B[0]) + (s.pts[T1][1] - s.pts.A[1]) * (s.pts[T1][1] - s.pts.B[1]))).toBeLessThan(1e-6);
    expect(addTangentsFrom(tri(), 'C', 'A', 'B', 0)).toBeNull(); // C cách A 3 < 4
  });

  it('compa: đường tròn tâm C bán kính AB; ẩn/hiện tên', () => {
    const s = addCircleOf(tri(), 'comp', ['C', 'A', 'B'], 0)!;
    expect(s.circles!.at(-1)!.r).toBeCloseTo(4, 6);
    expect(toggleLabel(tri(), 'A').hiddenLabels).toEqual(['A']);
    expect(toggleLabel(toggleLabel(tri(), 'A'), 'A').hiddenLabels).toEqual([]);
  });
});

describe('dựng hình kiểu GeoGebra (phần 3)', () => {
  const tri = () => sceneOf('Cho tam giác ABC có AB = 4, AC = 3, BC = 5.');

  it('điểm mới đặt tự do kéo được ở mọi nơi và xóa được', () => {
    let s = addFreePoint(tri(), [2, 5, 0], 0)!.scene;
    const P = s.order.at(-1)!;
    expect(freePoints(s)).toContain(P);
    s = moveFreePoint(s, P, [6, 7, 0]);
    expect(s.pts[P].slice(0, 2)).toEqual([6, 7]);
    expect(rmPoint(s, P).pts[P]).toBeUndefined();
  });

  it('đoạn dài cố định theo trục ngang', () => {
    const s = addSegmentLen(tri(), 'A', 2.5, 0)!;
    const B2 = s.order.at(-1)!;
    expect(s.pts[B2][0]).toBeCloseTo(s.pts.A[0] + 2.5, 6);
    expect(addSegmentLen(tri(), 'A', -1, 0)).toBeNull();
  });

  it('nửa đường tròn và hình quạt chỉ vẽ cung, theo khi kéo', () => {
    let s = addSemicircle(tri(), 'A', 'B', 0)!;
    let c = s.circles!.at(-1)!;
    expect(c.arc!.span).toBeCloseTo(Math.PI, 6);
    expect(c.r).toBeCloseTo(2, 6);
    s = moveFreePoint(s, 'B', [6, 2, 0]);
    c = s.circles!.at(-1)!;
    expect(c.r).toBeCloseTo(dist(s, 'A', 'B') / 2, 6);
    const q = addSector(tri(), 'A', 'B', 'C', 0)!;
    const cq = q.circles!.at(-1)!;
    expect(cq.arc!.span).toBeGreaterThan(0);
    expect(cq.arc!.span).toBeLessThanOrEqual(2 * Math.PI);
  });

  it('đường tròn tâm–bán kính, quay và vị tự với tham số tùy ý', () => {
    const c = addCircleOf(tri(), 'cr', ['A'], 0, 2.5)!;
    expect(c.circles!.at(-1)!.r).toBeCloseTo(2.5, 6);
    const r = addTransform(tri(), 'B', {k: 'rot', o: 'A', deg: 37}, 0)!;
    expect(dist(r, 'A', r.order.at(-1)!)).toBeCloseTo(4, 6);
    const d = addTransform(tri(), 'B', {k: 'dil', o: 'A', f: -1.5}, 0)!;
    expect(d.pts[d.order.at(-1)!][0]).toBeCloseTo(-6, 6);
  });

  it('ẩn điểm dựng thêm: không còn trong danh sách điểm hiển thị, đỉnh gốc không ẩn được', () => {
    const m = addMidpoint(tri(), 'A', 'B', 0);
    const h = toggleHidden(m.scene, m.name);
    expect(h.hiddenPts).toEqual([m.name]);
    expect(toggleHidden(tri(), 'A').hiddenPts).toBeUndefined();
  });
});
