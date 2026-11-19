import {describe, expect, it} from 'vitest';
import {buildScene} from '../utils/geometryProblem';

type V = number[];
const d = (a: V, b: V) => Math.hypot(a[0] - b[0], a[1] - b[1], (a[2] ?? 0) - (b[2] ?? 0));
const dot = (o: V, a: V, b: V) => (a[0] - o[0]) * (b[0] - o[0]) + (a[1] - o[1]) * (b[1] - o[1]);

// người dùng báo: đề "vuông cân" chỉ vẽ ra tam giác vuông (hai cạnh góc vuông lệch nhau)
describe('tam giác vuông cân: vuông và hai cạnh góc vuông bằng nhau', () => {
  it.each([
    ['Cho tam giác ABC vuông cân tại A.', 'A'],
    ['Cho tam giác ABC vuông cân tại B, AB = 3.', 'B'],
    ['Cho tam giác vuông cân ABC tại C', 'C'],
    ['Cho tam giác ABC vuông cân ở A, BC = 4', 'A'],
    ['cho tam giac ABC vuong can tai A', 'A'],
  ])('%s', (de, at) => {
    const p = buildScene(de).scene!.pts as Record<string, V>;
    const [u, v] = ['A', 'B', 'C'].filter((x) => x !== at);
    expect(Math.abs(dot(p[at], p[u], p[v]))).toBeLessThan(1e-6);
    expect(d(p[at], p[u])).toBeCloseTo(d(p[at], p[v]), 6);
  });

  it('chỉ "vuông" thì vẫn là tam giác vuông thường (hai cạnh lệch nhau)', () => {
    const p = buildScene('Cho tam giác ABC vuông tại A.').scene!.pts as Record<string, V>;
    expect(Math.abs(d(p.A, p.B) - d(p.A, p.C))).toBeGreaterThan(0.1);
  });

  it('cạnh huyền cho trước: cạnh góc vuông = BC/√2', () => {
    const p = buildScene('Cho tam giác ABC vuông cân tại A, BC = 4').scene!.pts as Record<string, V>;
    expect(d(p.B, p.C) / d(p.A, p.B)).toBeCloseTo(Math.SQRT2, 6);
  });
});
