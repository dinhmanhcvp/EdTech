import {describe, it, expect} from 'vitest';
import {looksMathy, typedToLatex} from '../utils/typedMath';
import {matchInstantStemBlueprint} from '../components/canvas/SmartboardCanvas';

describe('chữ gõ trên bảng', () => {
  it('chữ thường không bị coi là công thức', () => {
    for (const t of ['con lắc đơn', 'Operon Lac', 'mạch RLC cộng hưởng', 'Định lý Pytago']) expect(looksMathy(t), t).toBe(false);
  });

  it('công thức được nhận ra', () => {
    for (const t of ['x^2 + y^2 + z^2 = 9', 'Fe + O2 -> Fe2O3', '2NO2 ⇌ N2O4', 'y = 2sin(3x)']) expect(looksMathy(t), t).toBe(true);
  });

  it('mũ và chỉ số thành LaTeX', () => {
    expect(typedToLatex('x^2 + y^2 + z^2 = 9')).toBe('x^{2} + y^{2} + z^{2} = 9');
    expect(typedToLatex('x_n+1')).toBe('x_{n}+1');
    expect(typedToLatex('e^(2x)')).toBe('e^{2x}');
  });

  it('phương trình phản ứng có chỉ số hóa học và mũi tên', () => {
    expect(typedToLatex('Fe + O2 -> Fe2O3')).toBe('Fe + O_{2} \\to Fe_{2}O_{3}');
    expect(typedToLatex('2NO2 ⇌ N2O4')).toBe('2NO_{2} \\rightleftharpoons N_{2}O_{4}');
  });

  it('chuỗi gõ nguyên bản vẫn định tuyến đúng tới mô phỏng (dùng làm gợi ý)', () => {
    expect(matchInstantStemBlueprint('x^2 + y^2 + z^2 = 9')?.templateId).toBe('MATH_3D_OXYZ');
    expect(matchInstantStemBlueprint('2NO2 ⇌ N2O4')?.templateId).toBe('CHEM_LE_CHATELIER_GAS');
  });
});
