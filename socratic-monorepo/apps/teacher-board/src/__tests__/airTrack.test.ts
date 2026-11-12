import {describe, expect, it} from 'vitest';
import {GATES, S, pullOf, settled, speedOf, startRun, step} from '../utils/lab/hands/sims/airtrack';

const run = (m1: number, m2: number, v1: number, e: number) => {
  const r = startRun(m1, m2, v1, e);
  for (let i = 0; i < 6000 && !settled(r); i++) step(r, 1 / 240);
  return r;
};

describe('băng đệm khí (động học thời gian thực)', () => {
  it('lực bắn ↔ vận tốc: hai chiều khớp nhau', () => {
    expect(speedOf(pullOf(0.6))).toBeCloseTo(0.6, 10);
    expect(speedOf(pullOf(0.2))).toBeCloseTo(0.2, 10);
  });
  it('cổng quang điện trước va chạm đo đúng vận tốc bắn; xe 1 rời lò xo ở vận tốc đã đặt', () => {
    const r = run(0.2, 0.2, 0.6, 1);
    expect(r.gates[0]!.cart).toBe(1);
    expect(r.gates[0]!.v).toBeCloseTo(0.6, 2);
    expect(GATES[0]).toBeLessThan(GATES[1]);
  });
  it('m₁ = m₂, e = 1: xe 1 dừng, xe 2 đi với v₁; cổng 2 đo được; động lượng bảo toàn', () => {
    const r = run(0.2, 0.2, 0.6, 1);
    expect(r.after!.u1).toBeCloseTo(0, 6);
    expect(r.after!.u2).toBeCloseTo(0.6, 6);
    expect(r.gates[1]!.cart).toBe(2);
    expect(r.gates[1]!.v).toBeCloseTo(0.6, 2);
    expect(0.2 * r.after!.u1 + 0.2 * r.after!.u2).toBeCloseTo(0.2 * 0.6, 6);
  });
  it('e = 0: hai xe cùng vận tốc sau va chạm, động năng mất một nửa khi m₁ = m₂', () => {
    const r = run(0.2, 0.2, 0.6, 0);
    expect(r.after!.u1).toBeCloseTo(r.after!.u2, 6);
    const lost = 1 - (0.2 * r.after!.u1 ** 2 + 0.2 * r.after!.u2 ** 2) / (0.2 * 0.6 ** 2);
    expect(lost).toBeCloseTo(0.5, 6);
  });
  it('xe nhẹ đâm xe nặng thì bật ngược; xe dừng ở đầu băng; thí nghiệm kết thúc', () => {
    const r = run(0.1, 0.5, 0.8, 1);
    expect(r.after!.u1).toBeLessThan(0);
    expect(r.x1).toBeCloseTo(-3.3 + 0.3, 6);
    expect(settled(r)).toBe(true);
    expect(S).toBe(2.5);
  });
  it('xe nặng đâm xe nhẹ rồi đi tiếp: xe 1 dừng sát sau xe 2 ở cuối băng, không trôi khỏi băng', () => {
    for (const e of [0, 0.5, 1]) {
      const r = run(0.5, 0.1, 1, e);
      expect(settled(r), `e=${e}`).toBe(true);
      expect(r.x2, `e=${e}`).toBeCloseTo(3.3 - 0.3, 6);
      expect(r.x1, `e=${e}`).toBeLessThanOrEqual(r.x2 - 0.68 + 1e-9);
    }
  });
});
