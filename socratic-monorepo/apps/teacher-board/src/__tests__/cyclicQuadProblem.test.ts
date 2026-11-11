import {describe, expect, it} from 'vitest';
import {buildScene} from '../utils/geometryProblem';

// đề dán từ PDF: dấu mũ rời, chữ đỉnh bị tách ("P A", "P AQB")
const T = `Cho tứ giác ABCD nội tiếp đường tròn (O) với ̂ DCB < ̂ ADC < 90◦, giả sử có điểm P
nằm trong tứ giác ABCD sao cho P A ⊥ AD và P B ⊥ BC. Dựng hình bình hành P AQB.
Gọi K là hình chiếu vuông góc của Q lên AB.
1. Chứng minh rằng ̂ KQB = ̂ BCD.
2. Gọi H là hình chiếu vuông góc của P lên CD. Chứng minh rằng HD
HC = KB
KA .
3. Lấy điểm R sao cho DR song song AH và CR song song BH. Gọi giao điểm của hai
đường thẳng RH và AB là L. Chứng minh rằng các điểm D, C, K, L cùng nằm trên
một đường tròn.`;

const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1];
const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1]];
const cr = (a: number[], b: number[]) => a[0] * b[1] - a[1] * b[0];

describe('tứ giác nội tiếp + P, Q, K, H, R, L', () => {
  const sc = buildScene(T).scene!;
  const p = (n: string) => sc.pts[n];
  it('không báo lỗi/ghi chú sai (vd. "đường tròn nội tiếp chỉ vẽ được cho tam giác")', () => {
    expect(buildScene(T).ignored.filter((x) => !/^Chưa hiểu/.test(x))).toEqual([]);
  });
  it('vẽ được đủ các điểm', () => {
    expect(sc).toBeTruthy();
    for (const n of ['A', 'B', 'C', 'D', 'O', 'P', 'Q', 'K', 'H', 'R', 'L']) expect(sc.pts[n], n).toBeTruthy();
  });
  it('đúng các điều kiện của đề', () => {
    expect(dot(sub(p('P'), p('A')), sub(p('D'), p('A')))).toBeCloseTo(0, 6); // PA ⊥ AD
    expect(dot(sub(p('P'), p('B')), sub(p('C'), p('B')))).toBeCloseTo(0, 6); // PB ⊥ BC
    expect(p('P')[0] + p('Q')[0]).toBeCloseTo(p('A')[0] + p('B')[0], 6); // PAQB là hình bình hành
    expect(p('P')[1] + p('Q')[1]).toBeCloseTo(p('A')[1] + p('B')[1], 6);
    expect(dot(sub(p('Q'), p('K')), sub(p('B'), p('A')))).toBeCloseTo(0, 6); // QK ⊥ AB
    expect(dot(sub(p('P'), p('H')), sub(p('D'), p('C')))).toBeCloseTo(0, 6); // PH ⊥ CD
    expect(cr(sub(p('R'), p('D')), sub(p('H'), p('A')))).toBeCloseTo(0, 6); // DR // AH
    expect(cr(sub(p('R'), p('C')), sub(p('H'), p('B')))).toBeCloseTo(0, 6); // CR // BH
  });
  it('P nằm trong tứ giác ABCD (điều kiện của đề)', () => {
    const q = ['A', 'B', 'C', 'D'].map(p);
    const s = q.map((a, i) => cr(sub(q[(i + 1) % 4], a), sub(p('P'), a)));
    expect(s.every((x) => x > 0) || s.every((x) => x < 0)).toBe(true);
  });
  it('kết luận của đề đúng trên hình vẽ: HD/HC = KB/KA; D, C, K, L đồng viên', () => {
    const d = (a: string, b: string) => Math.hypot(p(a)[0] - p(b)[0], p(a)[1] - p(b)[1]);
    expect(d('H', 'D') / d('H', 'C')).toBeCloseTo(d('K', 'B') / d('K', 'A'), 4);
    const pts = ['D', 'C', 'K', 'L'].map((n) => [p(n)[0] ** 2 + p(n)[1] ** 2, p(n)[0], p(n)[1], 1]);
    const det = (m: number[][]): number => (m.length === 1 ? m[0][0] : m[0].reduce((s, v, j) => s + (j % 2 ? -1 : 1) * v * det(m.slice(1).map((r) => r.filter((_, k) => k !== j))), 0));
    expect(Math.abs(det(pts))).toBeLessThan(1e-6);
  });
});
