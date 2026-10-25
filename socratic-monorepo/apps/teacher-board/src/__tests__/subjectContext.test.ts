import {describe, it, expect} from 'vitest';
import {detectSubject, disambiguateSymbol} from '../utils/subjectContext';

describe('subjectContext: đoán môn từ vân tay đơn vị', () => {
  const cases: [string, 'MATH' | 'PHYSICS' | 'CHEMISTRY' | 'BIOLOGY'][] = [
    ['v_0 = 24 m/s, \\alpha = 45^\\circ', 'PHYSICS'],
    ['a = 9,8 m/s^2', 'PHYSICS'],
    ['Con lắc lò xo dao động', 'PHYSICS'],
    ['Chuẩn độ HCl + NaOH, pH = 7', 'CHEMISTRY'],
    ['Fe + O2 -> Fe2O3', 'CHEMISTRY'],
    ['nồng độ 0,1 mol/L', 'CHEMISTRY'],
    ['P: AaBb x AaBb', 'BIOLOGY'],
    ['Huyết áp 120/80 mmHg', 'BIOLOGY'],
    ['Tái bản ADN, Helicase', 'BIOLOGY'],
    ['y = x^2 - 3', 'MATH'],
    ['Khảo sát hàm số y = x^3 - 3x', 'MATH'],
    ['\\int_0^1 x^2 dx', 'MATH'],
  ];
  for (const [text, want] of cases) {
    it(`"${text}" → ${want}`, () => {
      const g = detectSubject(text);
      expect(g.subject).toBe(want);
      expect(g.evidence.length).toBeGreaterThan(0);
    });
  }

  it('không đủ dấu hiệu → null (không đoán bừa)', () => {
    expect(detectSubject('abc').subject).toBeNull();
    expect(detectSubject('').subject).toBeNull();
  });
});

describe('subjectContext: ký hiệu nhập nhằng T và k', () => {
  it('T: lực căng, chu kì, nhiệt độ', () => {
    expect(disambiguateSymbol('T', 'T = 20 N, dây treo')?.meaning).toMatch(/căng/);
    expect(disambiguateSymbol('T', 'T = 2\\pi\\sqrt{L/g} (s)')?.meaning).toMatch(/Chu kì/);
    expect(disambiguateSymbol('T', 'T = 300 K, pV = nRT')?.meaning).toMatch(/Nhiệt độ/);
    expect(disambiguateSymbol('T', 'T')).toBeNull();
  });
  it('k: hệ số góc, độ cứng lò xo, hằng số tốc độ', () => {
    expect(disambiguateSymbol('k', "k = f'(x_0)")?.templateId).toBe('MATH_FUNC_2D');
    expect(disambiguateSymbol('k', 'k = 100 N/m')?.templateId).toBe('PHYS_PENDULUM');
    expect(disambiguateSymbol('k', 'v = k[A]^2')?.templateId).toBe('CHEM_REACTION_LAB');
  });
});
