import {describe, expect, it} from 'vitest';
import {DEAD_NDC, DEAD_WORLD, turnDelta} from '../engines/families/handsKit';

describe('vặn núm bằng cách đưa tay vòng quanh: góc không nhảy khi tay rung sát tâm', () => {
  it('turnDelta: hiệu góc qua mốc ±π đi đường ngắn nhất', () => {
    expect(turnDelta(0, 0.5)).toBeCloseTo(0.5);
    expect(turnDelta(Math.PI - 0.1, -Math.PI + 0.1)).toBeCloseTo(0.2);
    expect(turnDelta(-Math.PI + 0.1, Math.PI - 0.1)).toBeCloseTo(-0.2);
  });
  it('vùng chết (góc NaN): không đổi giá trị, và góc đầu tiên sau đó chỉ là mốc', () => {
    expect(turnDelta(NaN, 1.2)).toBe(0);
    expect(turnDelta(1.2, NaN)).toBe(0);
    // tay chụm sát tâm (NaN), rung, rồi vòng ra: tổng quay chỉ tính từ mốc ngoài vùng chết
    const track = [NaN, NaN, 2.9, 3.0, 3.1];
    let prev = track[0];
    let sum = 0;
    for (const a of track.slice(1)) {
      sum += turnDelta(prev, a);
      prev = a;
    }
    expect(sum).toBeCloseTo(0.2);
  });
  it('vùng chết đủ lớn hơn rung tay, đủ nhỏ so với núm', () => {
    expect(DEAD_WORLD).toBeGreaterThanOrEqual(0.1);
    expect(DEAD_WORLD).toBeLessThan(0.2); // núm bán kính 0,2
    expect(DEAD_NDC).toBeGreaterThan(0.04);
  });
});
