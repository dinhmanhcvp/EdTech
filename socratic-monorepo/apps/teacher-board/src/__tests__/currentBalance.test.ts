import {describe, expect, it} from 'vitest';
import {BAL, START, directionVerdict, field, fitB, force, measure, measureVerdict, range, reading, type BalState, type Sample} from '../utils/lab/hands/currentBalance';

const on = (p: Partial<BalState> = {}): BalState => ({...START, K: true, ...p});

describe('cân dòng điện: lực từ và lực kế', () => {
  it('F = N·B·I·L; K mở thì không có lực; 0,1 A đã làm cân lệch 0,03 N', () => {
    expect(force(START)).toBe(0);
    expect(force(on())).toBeCloseTo(200 * 0.02 * 0.1 * 0.08, 12);
    expect(force(on({I: 0.5, Im: 2}))).toBeCloseTo(0.32, 12);
    expect(reading(START)).toBeCloseTo(BAL.F0, 12);
    expect(reading(on())).toBeCloseTo(0.13, 12); // 0,132 làm tròn tới độ chia 0,005
  });
  it('đảo chiều I hoặc B thì lực đổi chiều; đảo cả hai thì giữ nguyên', () => {
    const f = force(on({I: 0.3}));
    expect(force(on({I: 0.3, revI: true}))).toBeCloseTo(-f, 12);
    expect(force(on({I: 0.3, revB: true}))).toBeCloseTo(-f, 12);
    expect(force(on({I: 0.3, revI: true, revB: true}))).toBeCloseTo(f, 12);
  });
  it('ngoài thang đo: quá 0,5 N thì kẹp ở 0,5; lực hướng lên quá lớn thì lực kế chùng về 0; số đo đó không ghi được', () => {
    const big = on({I: 1, Im: 2});
    expect(range(big)).toBe('over');
    expect(reading(big)).toBe(0.5);
    expect(measure(big)).toBeNull();
    const up = on({I: 1, Im: 2, revI: true});
    expect(range(up)).toBe('slack');
    expect(reading(up)).toBe(0);
    expect(measure(START)).toBeNull();
  });
});

describe('cân dòng điện: đo B và chấm', () => {
  const take = (Is: number[], Im = 1): Sample[] => Is.map((I) => measure(on({I, Im}))!);
  it('bốn số đo trải 0,6 A cho B đúng trong 5 %; lực hướng lên vẫn đo được độ lớn', () => {
    const s = take([0.2, 0.4, 0.6, 0.8]);
    expect(fitB(s)).toBeCloseTo(field(1), 3);
    expect(measureVerdict(s, 1).ok).toBe(true);
    expect(measure(on({I: 0.2, revI: true}))!.F).toBeCloseTo(measure(on({I: 0.2}))!.F, 2);
  });
  it('ít số đo, số đo trùng nhau, hoặc số đo của dòng nam châm khác thì chưa đạt', () => {
    expect(measureVerdict(take([0.2, 0.4, 0.6]), 1).ok).toBe(false);
    expect(measureVerdict(take([0.4, 0.4, 0.4, 0.4]), 1).ok).toBe(false);
    expect(measureVerdict(take([0.2, 0.3, 0.4, 0.45]), 1).ok).toBe(false); // trải chưa đủ 0,3 A
    expect(measureVerdict(take([0.2, 0.4, 0.6, 0.8], 1.5), 1).ok).toBe(false);
    expect(measureVerdict(take([0.2, 0.4, 0.6, 0.8], 1.5), 1.5).ok).toBe(true);
    expect(Number.isNaN(fitB([]))).toBe(true);
  });
  it('thí nghiệm chiều lực từ: phải thấy cả lực xuống và lực lên', () => {
    expect(directionVerdict({down: true, up: false}, on()).ok).toBe(false);
    expect(directionVerdict({down: true, up: true}, on()).ok).toBe(true);
    expect(directionVerdict({down: false, up: false}, START).head).toContain('K đang mở');
  });
});
