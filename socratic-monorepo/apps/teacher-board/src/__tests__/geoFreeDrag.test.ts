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
