import {describe, it, expect} from 'vitest';
import {matchInstantStemBlueprint} from '../components/canvas/SmartboardCanvas';
import {canonicalFormula} from '../utils/formulaNormalize';
import {LIVE_CASES} from './liveDemoCases.test';

const id = (s: string) => matchInstantStemBlueprint(s)?.templateId ?? null;

describe('từ khóa không được nuốt nhầm công thức hoặc chữ thường', () => {
  it('số 25 trong hàm số không mở Quang hợp', () => {
    expect(id('y = x^2 + 25')).toBe('MATH_GRAPH');
    expect(id('y = 25x - 3')).toBe('MATH_GRAPH');
  });

  it('chữ có "ph" (phương trình, phân tích) không mở Chuẩn độ', () => {
    expect(id('phương trình bậc hai')).not.toBe('CHEM_EQUILIBRIUM_TITRATION');
    expect(id('phân tích đa thức')).not.toBe('CHEM_EQUILIBRIUM_TITRATION');
  });

  it('"mu" trong từ khác không mở Mặt phẳng nghiêng', () => {
    expect(id('mutation')).not.toBe('PHYS_INCLINED');
    expect(id('muối ăn')).not.toBe('PHYS_INCLINED');
  });

  it('"int" trong từ khác không mở Nguyên hàm; "sin" trong "sinh" không mở sóng lượng giác', () => {
    expect(id('point')).not.toBe('MATH_FUNC_2D');
    expect(id('sinh học tế bào')).not.toBe('MATH_TRIG_WAVE');
  });

  it('"fe" trong từ khác không mở Cân bằng phản ứng', () => {
    expect(id('feedback')).not.toBe('CHEM_BALANCE_SCALE');
  });

  it('vẫn nhận đúng các từ khóa thật', () => {
    expect(id('y = 2sin(3x)')).toBe('MATH_TRIG_WAVE');
    expect(id('\\sin x')).toBe('MATH_TRIG_WAVE');
    expect(id('tích phân của x')).toBe('MATH_FUNC_2D');
    expect(id('\\int x^3 dx')).toBe('MATH_FUNC_2D');
    expect(id('Fe + O2 -> Fe2O3')).toBe('CHEM_BALANCE_SCALE');
    expect(id('quang hợp')).toBe('BIO_PHOTOSYNTHESIS');
    expect(id('chuẩn độ HCl bằng NaOH')).toBe('CHEM_EQUILIBRIUM_TITRATION');
    expect(id('mặt phẳng nghiêng có ma sát')).toBe('PHYS_INCLINED');
    expect(id('\\mu = 0.2')).toBe('PHYS_INCLINED');
  });
});

describe('công thức do nhận dạng chữ viết tay trả về (LaTeX có ngoặc nhọn)', () => {
  it('mặt cầu x²+y²+z² mở Oxyz, không bị đồ thị biến thành hình tròn', () => {
    for (const s of [
      'x^{2}+y^{2}+z^{2}=9',
      'x^{2}+y^{2}+z^{2}=9.',
      'x^{2}+y^{2}+z^{2}',
      'x^{2}+y^{2}+z^{2}=R^{2}',
      'x^{2}+y^{2}+2^{2}=9',
      'x^{2}+y^{2}+Z^{2}=9',
      '(x-1)^{2}+(y+2)^{2}+(z-3)^{2}=16',
      'x² + y² + z² = 9',
    ]) {
      expect(id(s), s).toBe('MATH_3D_OXYZ');
    }
  });

  it('đường tròn 2D vẫn là đồ thị', () => {
    expect(id('x^{2}+y^{2}=9')).toBe('MATH_GRAPH');
  });

  it('chuẩn hóa: ngoặc mũ, chỉ số hóa học, mũi tên, \\text, dấu chấm cuối', () => {
    expect(canonicalFormula('x^{2}+y^{2}=9.')).toBe('x^2+y^2=9');
    expect(canonicalFormula('2NO_{2} \\rightleftharpoons N_{2}O_{4}')).toBe('2NO2 ⇌ N2O4');
    expect(canonicalFormula('P: AaBb \\times AaBb')).toBe('P: AaBb × AaBb');
    expect(canonicalFormula('\\text{x_{n+1} = 3.9 x_n (1 - x_n)}')).toBe('x_{n+1} = 3.9 x_n (1 - x_n)');
  });

  it('mọi ca demo vẫn đúng khi được viết thành LaTeX kiểu nhận dạng', () => {
    const brace = (s: string) => s.replace(/\^(\w)/g, '^{$1}');
    const chem = (s: string) =>
      s.replace(/([A-Z][a-z]?|\))(\d+)/g, '$1_{$2}').replace(/->/g, ' \\rightarrow ').replace(/⇌/g, ' \\rightleftharpoons ').replace(/×/g, ' \\times ');
    const isMath = (s: string) => /[\^=+<>|]|->|⇌/.test(s);
    const bad: string[] = [];
    for (const c of LIVE_CASES) {
      const forms = [c.input + '.', ...(isMath(c.input) ? [brace(c.input), chem(c.input)] : []), ...(c.input.includes('\n') ? [] : [`\\text{${c.input}}`])];
      for (const f of forms) if (id(f) !== c.id) bad.push(`${c.id} <- ${JSON.stringify(f)} = ${id(f)}`);
    }
    expect(bad).toEqual([]);
  });
});
