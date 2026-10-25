import {describe, it, expect} from 'vitest';
import {stomata, osmosis, osmoticPressure, operonLac, matchBioKeywords} from '../utils/bioModels';
import {quartiles, boxStatsFromData, boxStatsFromSummary, parseBoxplot, parseVariationTable, functionFromTable, signsOf, kindsOf, validateTable, type VariationTable} from '../utils/mathModels';

const near = (a: number, b: number, d = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(d);

describe('Khí khổng', () => {
  it('đủ sáng, đủ nước, nhiệt độ vừa phải → mở rộng', () => {
    const r = stomata(80, 80, 25);
    expect(r.state).toBe('open');
    expect(r.aperture).toBeGreaterThan(0.7);
    expect(r.co2Uptake).toBeCloseTo(r.aperture);
  });
  it('tối → đóng; hạn → đóng; trên 45 °C → đóng kín', () => {
    expect(stomata(0, 80, 25).state).toBe('closed');
    expect(stomata(80, 5, 25).state).toBe('closed');
    expect(stomata(80, 80, 46).aperture).toBe(0);
    expect(stomata(80, 80, 46).reason).toMatch(/nhiệt độ/);
  });
  it('độ mở giảm đơn điệu theo nhiệt độ từ 32 đến 45 °C và tăng theo ánh sáng', () => {
    let prev = Infinity;
    for (let t = 30; t <= 46; t++) {
      const a = stomata(70, 70, t).aperture;
      expect(a).toBeLessThanOrEqual(prev + 1e-12);
      prev = a;
    }
    let p = -1;
    for (let l = 0; l <= 100; l += 10) {
      const a = stomata(l, 70, 25).aperture;
      expect(a).toBeGreaterThanOrEqual(p - 1e-12);
      p = a;
    }
  });
  it('thoát hơi nước nhiều hơn khi nóng ở cùng độ mở', () => {
    expect(stomata(80, 80, 30).waterLoss).toBeGreaterThan(stomata(80, 80, 12).waterLoss);
  });
});

describe('Thẩm thấu', () => {
  it('áp suất thẩm thấu NaCl 0,9 % ≈ 7,3 atm (huyết tương ≈ 7,6)', () => {
    near(osmoticPressure(0.9), 7.3, 0.4);
  });
  it('hồng cầu: nhược trương → trương/vỡ, ưu trương → teo, đẳng trương → không đổi', () => {
    expect(osmosis('rbc', 0.9).state).toBe('equilibrium');
    expect(osmosis('rbc', 0.9).volume).toBeCloseTo(1);
    expect(osmosis('rbc', 0.7).state).toBe('swollen');
    expect(osmosis('rbc', 0.45).state).toBe('burst'); // ~0,45 % NaCl: ngưỡng tan huyết 50 %
    expect(osmosis('rbc', 0.1).state).toBe('burst');
    expect(osmosis('rbc', 0).state).toBe('burst');
    expect(osmosis('rbc', 3).state).toBe('crenated');
    expect(osmosis('rbc', 3).volume).toBeLessThan(0.6);
  });
  it('tế bào thực vật: nhược trương chỉ trương căng (không vỡ), ưu trương → co nguyên sinh', () => {
    const lo = osmosis('plant', 0.1);
    expect(lo.state).toBe('turgid');
    expect(lo.volume).toBeLessThan(1.15);
    expect(lo.turgor).toBeGreaterThan(5);
    expect(lo.waterFlow).toBe('in');
    const hi = osmosis('plant', 3);
    expect(hi.state).toBe('plasmolysis');
    expect(hi.plasmolysis).toBeGreaterThan(0.5);
    expect(hi.waterFlow).toBe('out');
    expect(osmosis('plant', 0.9).state).toBe('equilibrium');
  });
  it('co nguyên sinh tăng đơn điệu theo nồng độ ngoài', () => {
    let p = -1;
    for (let c = 1; c <= 8; c += 0.5) {
      const v = osmosis('plant', c).plasmolysis;
      expect(v).toBeGreaterThanOrEqual(p);
      p = v;
    }
  });
});

describe('Operon Lac', () => {
  it('bảng chân trị bình thường', () => {
    expect(operonLac(false, false).expression).toBeLessThan(0.02); // không lactose → tắt
    expect(operonLac(true, false).repressorBound).toBe(true);
    expect(operonLac(false, true).expression).toBe(1); // có lactose, không glucose → tối đa
    expect(operonLac(false, true).rnaPol).toBe('transcribing');
    const both = operonLac(true, true);
    expect(both.expression).toBeCloseTo(0.1); // ức chế dị hóa
    expect(both.rnaPol).toBe('weak');
    expect(both.capActive).toBe(false);
  });
  it('đột biến: lacI⁻ và lacOc biểu hiện không cần lactose; CAP⁻ chỉ tối đa 10 %', () => {
    expect(operonLac(false, false, 'lacI-').expression).toBe(1);
    expect(operonLac(false, false, 'lacOc').rnaPol).toBe('transcribing');
    expect(operonLac(true, false, 'lacI-').expression).toBeCloseTo(0.1);
    expect(operonLac(false, true, 'cap-').expression).toBeCloseTo(0.1);
  });
  it('lactose tiêu hóa chỉ khi có lactose', () => {
    expect(operonLac(false, false, 'lacI-').lactoseBreakdown).toBe(0);
    expect(operonLac(false, true).lactoseBreakdown).toBe(1);
  });
});

describe('nhận từ khóa Sinh học', () => {
  it('khí khổng, thẩm thấu, operon', () => {
    expect(matchBioKeywords('Khí khổng')?.templateId).toBe('BIO_STOMATA_GAS');
    expect(matchBioKeywords('tế bào hạt đậu')?.templateId).toBe('BIO_STOMATA_GAS');
    expect(matchBioKeywords('Operon Lac')?.templateId).toBe('BIO_OPERON_LAC');
    const o = matchBioKeywords('Co nguyên sinh, ưu trương 10% NaCl')!;
    expect(o.templateId).toBe('BIO_OSMOSIS_CELL');
    expect(o.meta).toEqual({cellType: 'plant', cOut: 10});
    expect(matchBioKeywords('hồng cầu trong dung dịch nhược trương')?.meta).toEqual({cellType: 'rbc', cOut: 0.2});
    expect(matchBioKeywords('y = x^2')).toBeNull();
  });
});

describe('Boxplot', () => {
  it('tứ phân vị theo SGK: n chẵn và n lẻ (không đưa trung vị vào hai nửa)', () => {
    expect(quartiles([1, 2, 3, 4, 5, 6, 7, 8])).toEqual({q1: 2.5, q2: 4.5, q3: 6.5});
    expect(quartiles([1, 2, 3, 4, 5, 6, 7, 8, 9])).toEqual({q1: 2.5, q2: 5, q3: 7.5});
  });
  it('ngoại lai theo quy tắc 1,5·ΔQ và râu dừng ở giá trị trong rào', () => {
    const s = boxStatsFromData([2, 4, 5, 6, 7, 8, 9, 10, 11, 60])!;
    expect(s.q1).toBe(5);
    expect(s.q3).toBe(10);
    expect(s.iqr).toBe(5);
    expect(s.highFence).toBe(17.5);
    expect(s.outliers).toEqual([60]);
    expect(s.whiskerHigh).toBe(11);
    expect(s.whiskerLow).toBe(2);
    near(s.mean!, 12.2);
  });
  it('không có ngoại lai khi dữ liệu đều', () => {
    expect(boxStatsFromData([1, 2, 3, 4, 5, 6])!.outliers).toEqual([]);
    expect(boxStatsFromData([5])).toBeNull();
  });
  it('đọc năm số tóm tắt hoặc dãy số liệu', () => {
    expect(parseBoxplot('Min = 2, Q1 = 5, Trung vị = 8, Q3 = 12, Max = 20')).toEqual({kind: 'summary', min: 2, q1: 5, q2: 8, q3: 12, max: 20});
    const d = parseBoxplot('Biểu đồ hộp của mẫu số liệu: 3, 5, 7, 8, 12, 15, 18, 21, 24, 100')!;
    expect(d.kind).toBe('data');
    expect(d.kind === 'data' && d.data).toHaveLength(10);
    expect(parseBoxplot('1 2 3 4 5 6')).toBeNull(); // thiếu từ khóa → không đoán bừa
    expect(parseBoxplot('Min=9, Q1=5, Q2=8, Q3=12, Max=20')).toBeNull(); // vô lý về thứ tự
  });
  it('tóm tắt năm số: ngoại lai phát hiện từ max/min', () => {
    const s = boxStatsFromSummary(1, 10, 12, 14, 60);
    expect(s.outliers).toEqual([1, 60]); // Q1 − 1,5ΔQ = 4 > 1
    expect(s.whiskerHigh).toBe(20);
  });
});

describe('Bảng biến thiên → đồ thị', () => {
  const cubic: VariationTable = {points: [{x: -1, y: 3}, {x: 1, y: -1}], leftDir: 'up'};

  it('dấu y\' và loại cực trị suy từ giá trị', () => {
    expect(signsOf(cubic)).toEqual(['+', '-', '+']);
    expect(kindsOf(cubic)).toEqual(['max', 'min']);
    expect(kindsOf({points: [{x: 0, y: 0}, {x: 2, y: 5}], leftDir: 'down'})).toEqual(['min', 'max']);
  });

  it('hàm dựng được đi qua mọi điểm tới hạn, đạo hàm bằng 0 ở cực trị, đơn điệu giữa chúng', () => {
    const f = functionFromTable(cubic);
    near(f(-1), 3);
    near(f(1), -1);
    const h = 1e-5;
    near((f(-1 + h) - f(-1 - h)) / (2 * h), 0, 1e-3);
    near((f(1 + h) - f(1 - h)) / (2 * h), 0, 1e-3);
    let prev = f(-1);
    for (let x = -1; x <= 1; x += 0.05) {
      const y = f(x);
      expect(y).toBeLessThanOrEqual(prev + 1e-9); // giảm trên (−1; 1)
      prev = y;
    }
  });

  it('hai nhánh ngoài đi đúng hướng: bậc ba đồng biến ở hai đầu', () => {
    const f = functionFromTable(cubic);
    expect(f(-3)).toBeLessThan(3);
    expect(f(-5)).toBeLessThan(f(-3));
    expect(f(3)).toBeGreaterThan(-1);
    expect(f(5)).toBeGreaterThan(f(3));
  });

  it('đọc bảng viết bằng chữ: x | -∞ -1 1 +∞ ; y\' | + 0 - 0 + ; y | ↗ 3 ↘ -1 ↗', () => {
    const t = parseVariationTable("x | -∞ -1 1 +∞\ny' | + 0 - 0 +\ny | -∞ ↗ 3 ↘ -1 ↗ +∞")!;
    expect(t.points).toEqual([{x: -1, y: 3}, {x: 1, y: -1}]);
    expect(t.leftDir).toBe('up');
    const t2 = parseVariationTable('x: -2 0 2; y: 0 4 0')!; // không có dòng y'
    expect(t2.points).toHaveLength(3);
    expect(kindsOf(t2)).toEqual(['min', 'max', 'min']);
  });

  it('bác bỏ bảng mâu thuẫn hoặc thiếu', () => {
    expect(parseVariationTable("x | -1 1\ny' | - 0 + 0 -\ny | 3 -1")).toBeNull(); // dấu y' không khớp thứ tự giá trị
    expect(parseVariationTable('x | -1 1')).toBeNull();
    expect(parseVariationTable('x | 1 -1\ny | 3 4')).toBeNull(); // x không tăng
    expect(validateTable({points: [{x: 0, y: 1}, {x: 1, y: 1}], leftDir: 'up'})).toMatch(/khác nhau/);
  });

  it('một cực trị duy nhất cho parabol', () => {
    const f = functionFromTable({points: [{x: 2, y: -3}], leftDir: 'down'});
    near(f(2), -3);
    expect(f(0)).toBeGreaterThan(-3);
    expect(f(4)).toBeGreaterThan(-3);
    near(f(0), f(4), 1e-9);
  });
});
