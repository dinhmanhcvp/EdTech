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
