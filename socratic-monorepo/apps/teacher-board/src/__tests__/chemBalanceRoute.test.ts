import {describe, it, expect} from 'vitest';
import {matchStemModel} from '../utils/localRouter';
import {extractEquation, matchChemEquation} from '../utils/chemBalanceBlueprint';

describe('định tuyến phương trình hóa học', () => {
  it('tìm phương trình trong câu', () => {
    expect(extractEquation('Cân bằng Fe + O2 → Fe3O4 giúp em')).toBe('Fe + O2 → Fe3O4');
    expect(extractEquation('Cho Zn + HCl')).toBe('Zn + HCl');
    expect(extractEquation('Fe + O2 = Fe3O4')).toBe('Fe + O2 → Fe3O4');
    expect(extractEquation('Tính diện tích tam giác ABC')).toBeNull();
    expect(extractEquation('H2O')).toBeNull(); // một công thức: để mô hình phân tử 3D lo
  });
  it('một vế: ra bản thiết kế có sản phẩm dự đoán và thanh trượt cho TỪNG chất của phương trình', () => {
    const m = matchChemEquation('Zn + HCl')!;
    expect(m.meta.predicted).toBe(true);
    expect(m.meta.species.map((s) => `${s.side}:${s.formula}`)).toEqual(['L:Zn', 'L:HCl', 'R:ZnCl2', 'R:H2']);
    expect(m.parameters.map((p) => p.label)).toEqual(['Hệ số Zn', 'Hệ số HCl', 'Hệ số ZnCl₂', 'Hệ số H₂']); // nhãn đúng chất, cùng thứ tự với hình
    expect(m.meta.solution).toEqual([1, 2, 1, 1]);
    expect(m.parameters.every((p) => p.defaultValue === 1)).toBe(true); // không để sẵn đáp án
  });
  it('hai vế: dùng đúng vế phải người viết, giữ hệ số đã viết', () => {
    const m = matchChemEquation('2H2 + O2 → 2H2O')!;
    expect(m.meta.predicted).toBe(false);
    expect(m.parameters.map((p) => p.defaultValue)).toEqual([2, 1, 2]);
  });
  it('phản ứng không xảy ra: không có thanh trượt, nêu lý do', () => {
    const m = matchChemEquation('Cu + HCl')!;
    expect(m.meta.none).toBe(true);
    expect(m.parameters).toEqual([]);
    expect(m.meta.note).toContain('sau H');
  });
  it('router chung: phương trình hóa học vào CHEM_BALANCE_SCALE; hình học/đại số và phân tử đơn lẻ không bị cướp', () => {
    expect(matchStemModel('Fe + O2')?.templateId).toBe('CHEM_BALANCE_SCALE');
    expect(matchStemModel('Al + HCl →')?.templateId).toBe('CHEM_BALANCE_SCALE'); // mũi tên cuối = "cho biết sản phẩm"
    expect(matchStemModel('Zn + CuSO4')?.templateId).toBe('CHEM_BALANCE_SCALE');
    expect(matchStemModel('Al + HCl')?.templateId).toBe('CHEM_REACTION_LAB'); // một vế với axit mạnh: giữ mô phỏng tốc độ phản ứng như hướng dẫn cũ
    expect(matchStemModel('HCl + NaOH')?.templateId).not.toBe('CHEM_BALANCE_SCALE'); // chuẩn độ do bước định tuyến sau lo (guideExamples)
    expect(matchStemModel('AB + CD')?.templateId).not.toBe('CHEM_BALANCE_SCALE');
    expect(matchStemModel('H2O')?.templateId).toBe('CHEM_MOLECULE_3D');
  });
});

import {balanceState, coefsFromParams} from '../engines/chemEquationDraw';

describe('trạng thái cân bằng theo thanh trượt (hình và thanh trượt cùng nói về các chất của phương trình)', () => {
  const meta = matchChemEquation('Zn + HCl')!.meta;
  it('hệ số mặc định 1: lệch ở H và Cl; điều chỉnh đúng chất thì cân bằng', () => {
    const s0 = balanceState(meta, {});
    expect(s0.balanced).toBe(false);
    expect(s0.off.sort()).toEqual(['Cl', 'H']);
    // c1=Zn, c2=HCl, c3=ZnCl2, c4=H2
    const s1 = balanceState(meta, {c1: 1, c2: 2, c3: 1, c4: 1});
    expect(s1.balanced).toBe(true);
    expect(s1.minimal).toBe(true);
  });
  it('cân bằng nhưng chưa tối giản được nhận ra', () => {
    const s = balanceState(meta, {c1: 2, c2: 4, c3: 2, c4: 2});
    expect(s.balanced).toBe(true);
    expect(s.minimal).toBe(false);
  });
  it('mỗi thanh trượt ứng đúng một chất theo thứ tự', () => {
    expect(coefsFromParams(4, {c1: 3, c4: 5})).toEqual([3, 1, 1, 5]);
    expect(matchChemEquation('Fe + O2')!.parameters.map((p) => p.key)).toEqual(['c1', 'c2', 'c3']);
  });
});
