import {describe, expect, it} from 'vitest';
import {inferCons, solveDrag, solveDragNatural, type P2} from '../utils/geoConstraints';

const d = (p: Record<string, P2>, a: string, b: string) => Math.hypot(p[a][0] - p[b][0], p[a][1] - p[b][1]);
const cosAt = (p: Record<string, P2>, a: string, v: string, c: string) =>
  ((p[a][0] - p[v][0]) * (p[c][0] - p[v][0]) + (p[a][1] - p[v][1]) * (p[c][1] - p[v][1])) / (d(p, a, v) * d(p, c, v));

describe('giữ tính chất khi kéo đỉnh', () => {
  it('tam giác vuông tại A: kéo B hay C, góc A vẫn vuông', () => {
    const p: Record<string, P2> = {A: [0, 0], B: [3, 0], C: [0, 4]};
    const e: [string, string][] = [['A', 'B'], ['B', 'C'], ['C', 'A']];
    const cons = inferCons(p, e);
    expect(cons).toEqual([{k: 'perp', a: 'B', v: 'A', c: 'C'}]);
    const q = solveDrag(p, cons, 'B', [4, 2], ['A', 'B', 'C'])!;
    expect(q.B).toEqual([4, 2]);
    expect(Math.abs(cosAt(q, 'B', 'A', 'C'))).toBeLessThan(1e-6);
    const r = solveDrag(q, cons, 'A', [1, -1], ['A', 'B', 'C'])!;
    expect(Math.abs(cosAt(r, 'B', 'A', 'C'))).toBeLessThan(1e-6);
  });

  it('hình vuông: kéo một đỉnh, bốn cạnh vẫn bằng nhau và các góc vuông', () => {
    const p: Record<string, P2> = {A: [0, 0], B: [1, 0], C: [1, 1], D: [0, 1]};
    const e: [string, string][] = [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A']];
    const q = solveDrag(p, inferCons(p, e), 'C', [2.2, 1.4], ['A', 'B', 'C', 'D'])!;
    expect(q).not.toBeNull();
    const s = d(q, 'A', 'B');
    for (const [a, b] of e) expect(d(q, a, b)).toBeCloseTo(s, 5);
    expect(Math.abs(cosAt(q, 'B', 'A', 'D'))).toBeLessThan(1e-5);
    expect(Math.abs(cosAt(q, 'B', 'C', 'D'))).toBeLessThan(1e-5);
  });

  it('hình bình hành: cạnh đối vẫn song song', () => {
    const p: Record<string, P2> = {A: [0, 0], B: [4, 0], C: [5, 2], D: [1, 2]};
    const e: [string, string][] = [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A']];
    const q = solveDrag(p, inferCons(p, e), 'D', [0, 3], ['A', 'B', 'C', 'D'])!;
    expect(q.C[0] - q.D[0]).toBeCloseTo(q.B[0] - q.A[0], 5);
    expect(q.C[1] - q.D[1]).toBeCloseTo(q.B[1] - q.A[1], 5);
  });

  it('kéo làm đa giác đảo chiều thì từ chối thay vì méo hình', () => {
    const p: Record<string, P2> = {A: [0, 0], B: [4, 0], C: [2, 3]};
    expect(solveDrag(p, [], 'C', [2, -3], ['A', 'B', 'C'])).toBeNull();
  });

  it('kéo tự nhiên: đỉnh xa nhất đứng yên, hình quay/co quanh nó (không trôi cả hình)', () => {
    const p: Record<string, P2> = {A: [0, 0], B: [1, 0], C: [1, 1], D: [0, 1]};
    const e: [string, string][] = [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A']];
    const cons = inferCons(p, e);
    let cur = p;
    for (let i = 1; i <= 10; i++) {
      const next = solveDragNatural(cur, cons, 'C', [1 + i * 0.1, 1 - i * 0.05], ['A', 'B', 'C', 'D'])!;
      expect(next).not.toBeNull();
      expect(next.A).toEqual([0, 0]); // neo đứng yên
      const s = d(next, 'A', 'B');
      for (const [a, b] of e) expect(d(next, a, b)).toBeCloseTo(s, 5);
      // bước nhỏ thì hình đổi nhỏ: không nhảy
      expect(d({X: cur.B, Y: next.B}, 'X', 'Y')).toBeLessThan(0.2);
      cur = next;
    }
  });

  it('không có tính chất thì kéo tự do, các điểm khác không nhúc nhích', () => {
    const p: Record<string, P2> = {A: [0, 0], B: [4, 0], C: [2, 3]};
    const q = solveDragNatural(p, [], 'C', [3, 4], ['A', 'B', 'C'])!;
    expect(q.A).toEqual([0, 0]);
    expect(q.B).toEqual([4, 0]);
    expect(q.C).toEqual([3, 4]);
  });
});
