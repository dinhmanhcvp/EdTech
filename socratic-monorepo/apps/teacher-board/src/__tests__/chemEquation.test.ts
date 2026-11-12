import {describe, it, expect} from 'vitest';
import {parseFormula, parseEquation, balance, planEquation, predictProducts, sideCounts} from '../utils/chemEquation';

const plan = (t: string) => planEquation(t)!;
const eqText = (t: string) => {
  const p = plan(t);
  const c = p.solution!;
  const nl = p.left.length;
  const f = (s: {formula: string}[], off: number) => s.map((x, i) => `${c[off + i] > 1 ? c[off + i] : ''}${x.formula}`).join(' + ');
  return `${f(p.left, 0)} → ${f(p.right!, nl)}`;
};

describe('đọc công thức', () => {
  it('ngoặc, chỉ số, Unicode, LaTeX', () => {
    expect(parseFormula('Al2(SO4)3')).toEqual({Al: 2, S: 3, O: 12});
    expect(parseFormula('Ca(OH)2')).toEqual({Ca: 1, O: 2, H: 2});
    expect(parseEquation('H₂ + O₂ → H₂O')!.left.map((s) => s.formula)).toEqual(['H2', 'O2']);
    expect(parseEquation('\\text{Fe} + \\text{O}_2 \\rightarrow \\text{Fe}_3\\text{O}_4')!.right!.map((s) => s.formula)).toEqual(['Fe3O4']);
  });
  it('không nhầm ký hiệu hình học/đại số thành công thức', () => {
    expect(parseEquation('AB + CD')).toBeNull();
    expect(parseEquation('x + y = 3')).toBeNull();
    expect(parseEquation('AB = 3')).toBeNull();
    expect(parseEquation('2x + 1')).toBeNull();
  });
});

describe('cân bằng bằng đại số', () => {
  it('các phương trình quen thuộc', () => {
    expect(eqText('Fe + O2 → Fe3O4')).toBe('3Fe + 2O2 → Fe3O4');
    expect(eqText('H2 + O2 → H2O')).toBe('2H2 + O2 → 2H2O');
    expect(eqText('Al + O2 → Al2O3')).toBe('4Al + 3O2 → 2Al2O3');
    expect(eqText('Al + H2SO4 → Al2(SO4)3 + H2')).toBe('2Al + 3H2SO4 → Al2(SO4)3 + 3H2');
    expect(eqText('C2H6 + O2 → CO2 + H2O')).toBe('2C2H6 + 7O2 → 4CO2 + 6H2O');
    expect(eqText('Fe3O4 + HNO3 → Fe(NO3)3 + NO + H2O')).toBe('3Fe3O4 + 28HNO3 → 9Fe(NO3)3 + NO + 14H2O');
  });
  it('không cân bằng được thì null (không đoán)', () => {
    expect(balance([{H: 2}], [{O: 2}])).toBeNull();
  });
  it('đếm nguyên tử hai vế theo hệ số', () => {
    const p = plan('Fe + O2 → Fe3O4');
    expect(sideCounts(p.left.map((s) => s.atoms), [3, 2])).toEqual({Fe: 3, O: 4});
    expect(sideCounts(p.right!.map((s) => s.atoms), [1])).toEqual({Fe: 3, O: 4});
  });
});

describe('một vế → dự đoán sản phẩm', () => {
  it('các loại phản ứng THPT, kết quả cân bằng đúng', () => {
    const cases: [string, string][] = [
      ['Fe + O2', '3Fe + 2O2 → Fe3O4'],
      ['Mg + O2', '2Mg + O2 → 2MgO'],
      ['S + O2', 'S + O2 → SO2'],
      ['CH4 + O2', 'CH4 + 2O2 → CO2 + 2H2O'],
      ['Zn + HCl', 'Zn + 2HCl → ZnCl2 + H2'],
      ['Al + HCl', '2Al + 6HCl → 2AlCl3 + 3H2'],
      ['Fe + H2SO4', 'Fe + H2SO4 → FeSO4 + H2'],
      ['Fe + CuSO4', 'Fe + CuSO4 → FeSO4 + Cu'],
      ['Zn + AgNO3', 'Zn + 2AgNO3 → Zn(NO3)2 + 2Ag'],
      ['Na + H2O', '2Na + 2H2O → 2NaOH + H2'],
      ['HCl + NaOH', 'HCl + NaOH → NaCl + H2O'],
      ['H2SO4 + Ca(OH)2', 'H2SO4 + Ca(OH)2 → CaSO4 + 2H2O'],
      ['HCl + CaCO3', '2HCl + CaCO3 → CaCl2 + CO2 + H2O'],
      ['HCl + CuO', '2HCl + CuO → CuCl2 + H2O'],
      ['CO2 + Ca(OH)2', 'CO2 + Ca(OH)2 → CaCO3 + H2O'],
      ['AgNO3 + NaCl', 'AgNO3 + NaCl → AgCl + NaNO3'],
      ['BaCl2 + H2SO4', 'BaCl2 + H2SO4 → BaSO4 + 2HCl'],
      ['KClO3', '2KClO3 → 2KCl + 3O2'],
      ['CaCO3', 'CaCO3 → CaO + CO2'],
    ];
    for (const [i, o] of cases) {
      if (i === 'Al + HCl') continue;
      expect(eqText(i), i).toBe(o);
    }
  });
  it('Al + HCl cũng ra AlCl3 + H2', () => {
    expect(eqText('Al + HCl')).toBe('2Al + 6HCl → 2AlCl3 + 3H2');
  });
  it('máy đánh dấu sản phẩm là dự đoán và nêu loại phản ứng; vế phải người dùng viết thì không', () => {
    const p = plan('Zn + HCl');
    expect(p.predicted).toBe(true);
    expect(p.kind).toContain('phản ứng thế');
    const q = plan('Zn + HCl → ZnCl2 + H2');
    expect(q.predicted).toBe(false);
    expect(q.solution).toEqual([1, 2, 1, 1]);
  });
  it('phản ứng không xảy ra thì nói rõ vì sao', () => {
    const cu = plan('Cu + HCl');
    expect(cu.none).toBe(true);
    expect(cu.note).toContain('sau H');
    expect(plan('Cu + FeSO4').none).toBe(true);
    expect(plan('NaCl + KNO3').none).toBe(true);
  });
  it('ngoài các luật đã có: không đoán bừa', () => {
    const p = plan('Au + HF')!;
    expect(p.solution).toBeNull();
    expect(p.kind).toContain('chưa dự đoán');
    expect(predictProducts(['XeF4', 'H2O'])).toBeNull();
  });
});
