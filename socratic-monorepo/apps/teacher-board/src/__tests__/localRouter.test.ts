import {describe, it, expect} from 'vitest';
import {routeLocally, splitEquations, matchGraphEquations, matchSolidWord} from '../utils/localRouter';

describe('localRouter: định tuyến cục bộ', () => {
  it('tách nhiều phương trình theo dấu ; xuống dòng và "và"', () => {
    expect(splitEquations('y = x^2 - 3; y = A sin x + B')).toEqual(['y = x^2 - 3', 'y = A sin x + B']);
    expect(splitEquations('y = x^2 - 3\ny = 2x')).toHaveLength(2);
    expect(splitEquations('y = x^2 - 3, y = 2x + 1')).toHaveLength(2);
    expect(splitEquations('y = x² − 3 và y = A sin x + B')).toHaveLength(2);
  });

  it('hai hàm như video → MATH_GRAPH với biểu thức nguyên vẹn', () => {
    const bp = routeLocally('y = x² − 3; y = A sin x + B')!;
    expect(bp.templateId).toBe('MATH_GRAPH');
    expect(bp.engine).toBe('MATH');
    expect(bp.expressions).toEqual(['y = x² − 3', 'y = A sin x + B']);
    expect(bp.recognizedLatex).toContain('x^{2} - 3');
    expect(bp.socraticQuestion).toMatch(/giao/);
  });

  it('một hàm đơn KHÔNG bị cướp khỏi luồng cũ, trừ khi người dùng chọn "Vẽ đồ thị"', () => {
    expect(routeLocally('y = 2sin(3x)')).toBeNull();
    expect(routeLocally('y = 2sin(3x)', {explicitGraph: true})?.templateId).toBe('MATH_GRAPH');
    expect(routeLocally('vẽ đồ thị y = x^2')?.templateId).toBe('MATH_GRAPH');
  });

  it('đường tròn/ellipse (phương trình ẩn) → đồ thị', () => {
    const bp = routeLocally('x^2 + y^2 = 4')!;
    expect(bp.templateId).toBe('MATH_GRAPH');
    expect(bp.expressions).toEqual(['x^2 + y^2 = 4']);
  });

  it('công thức vật lý/hóa học không bị nhận nhầm', () => {
    expect(routeLocally('v_0 = 22 m/s, α = 45° (Ném xiên)')).toBeNull();
    expect(routeLocally('N2 + 3H2 -> 2NH3')).toBeNull();
    expect(routeLocally('Z = √(R² + (Z_L − Z_C)²) (Mạch RLC)')).toBeNull();
    expect(routeLocally('ADN: A = T, G ≡ X')).toBeNull();
    expect(matchGraphEquations('T = 2π√(l/g)')).toBeNull();
  });

  it('nhận tên khối hình học tiếng Việt', () => {
    expect(matchSolidWord('hình lập phương')).toBe('cube');
    expect(matchSolidWord('Hình hộp chữ nhật ABCD.A\'B\'C\'D\'')).toBe('box');
    expect(matchSolidWord('hình chóp tứ giác đều S.ABCD')).toBe('pyramid4');
    expect(matchSolidWord('tứ diện đều')).toBe('pyramid3');
    expect(matchSolidWord('lăng trụ tam giác')).toBe('prism3');
    const bp = routeLocally('hình lập phương')!;
    expect(bp.engine).toBe('GEOMETRY');
    expect(bp.templateId).toBe('GEO_SOLID');
    expect(bp.meta?.solid).toBe('cube');
  });
});

describe('localRouter: mô hình STEM từ cú pháp viết tay', () => {
  it('phép lai Menđen → Punnett', () => {
    const bp = routeLocally('P: AaBb x AaBb');
    expect(bp?.templateId).toBe('BIO_PUNNETT_SQUARE');
    expect(bp?.meta?.cross).toEqual({p1: 'AaBb', p2: 'AaBb'});
  });
  it('tần số kiểu gen → Hardy–Weinberg; q² đơn lẻ KHÔNG bị bắt nhầm', () => {
    expect(routeLocally('0,04AA + 0,32Aa + 0,64aa = 1')?.templateId).toBe('BIO_HARDY_WEINBERG');
    expect(routeLocally('quần thể có q^2 = 0,16')?.templateId).toBe('BIO_HARDY_WEINBERG');
    expect(routeLocally('q^2 = 0,16')?.templateId).not.toBe('BIO_HARDY_WEINBERG');
  });
  it('hệ bất phương trình + mục tiêu → quy hoạch tuyến tính; hàm số thường vẫn ra đồ thị', () => {
    expect(routeLocally('x + y <= 4; 2x + y <= 6; x >= 0; y >= 0; max F = 3x + 2y')?.templateId).toBe('MATH_LINEAR_PROGRAMMING');
    expect(routeLocally('y = x^2 - 3', {explicitGraph: true})?.templateId).toBe('MATH_GRAPH');
  });
  it('dãy số quy nạp → mạng nhện', () => {
    const bp = routeLocally('x_{n+1} = r x_n (1 - x_n)');
    expect(bp?.templateId).toBe('MATH_COBWEB_CHAOS');
    expect((bp?.meta?.recurrence as {params: string[]}).params).toEqual(['r']);
  });
});

describe('localRouter: Sinh học & thống kê mới', () => {
  it('từ khóa Sinh học → engine đúng', () => {
    expect(routeLocally('Khí khổng')?.templateId).toBe('BIO_STOMATA_GAS');
    expect(routeLocally('Co nguyên sinh, ưu trương 10% NaCl')?.meta).toEqual({cellType: 'plant', cOut: 10});
    expect(routeLocally('Operon Lac')?.templateId).toBe('BIO_OPERON_LAC');
  });
  it('boxplot từ năm số tóm tắt hoặc dãy số liệu', () => {
    expect(routeLocally('Q1 = 5, Q2 = 8, Q3 = 12, Min = 2, Max = 20')?.templateId).toBe('MATH_STAT_BOXPLOT');
    expect(routeLocally('Biểu đồ hộp của mẫu số liệu: 3, 5, 7, 8, 12, 15, 18, 21')?.templateId).toBe('MATH_STAT_BOXPLOT');
  });
  it('bảng biến thiên viết ba dòng → bảng biến thiên', () => {
    const bp = routeLocally("Bảng biến thiên\nx | -∞ -1 1 +∞\ny' | + 0 - 0 +\ny | -∞ ↗ 3 ↘ -1 ↗ +∞");
    expect(bp?.templateId).toBe('MATH_VARIATION_TABLE');
    expect((bp?.meta?.table as {points: unknown[]}).points).toHaveLength(2);
  });
  it('không bắt nhầm hàm số, hệ bất phương trình hay chữ thường', () => {
    expect(routeLocally('y = x^2 - 3', {explicitGraph: true})?.templateId).toBe('MATH_GRAPH');
    expect(routeLocally('x + y <= 4; x >= 0; y >= 0; max F = x + y')?.templateId).toBe('MATH_LINEAR_PROGRAMMING');
    expect(routeLocally('xin chào các em')).toBeNull();
    expect(routeLocally('dãy số 1 2 3 4 5 6')).toBeNull();
  });
});
