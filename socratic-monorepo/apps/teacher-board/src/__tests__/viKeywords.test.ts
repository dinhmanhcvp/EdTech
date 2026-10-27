import {describe, it, expect} from 'vitest';
import {normalizeVi, looksLikeWords, matchViName} from '../utils/viKeywords';
import {matchInstantStemBlueprint} from '../components/canvas/SmartboardCanvas';

describe('chữ tiếng Việt → mô phỏng', () => {
  it('chuẩn hóa bỏ dấu', () => {
    expect(normalizeVi('Con lắc kép!')).toBe('conlackep');
    expect(normalizeVi('\\text{Điện xoay chiều}')).toBe('dienxoaychieu');
  });

  it('nhận ra chữ, không nhận công thức', () => {
    expect(looksLikeWords('khikhcng')).toBe(true);
    expect(looksLikeWords('\\text{con lốc kép}')).toBe(true);
    expect(looksLikeWords('y=x^2-3')).toBe(false);
    expect(looksLikeWords('y=Asinx+B')).toBe(false);
    expect(looksLikeWords('x^2+y^2=25')).toBe(false);
    expect(looksLikeWords('f(x)=2x^2-4x+1')).toBe(false);
    expect(looksLikeWords('\\frac{1}{2}+\\frac{3}{4}')).toBe(false);
  });

  // chuỗi thật mà bộ nhận dạng cục bộ / Vision đã trả cho chữ viết tay tiếng Việt
  const NOISY: [string, string][] = [
    ['con lốc kép', 'PHYS_DOUBLE_PENDULUM'],
    ['canbckep', 'PHYS_DOUBLE_PENDULUM'],
    ['khí kh?ng', 'BIO_STOMATA_GAS'],
    ['khikhcng', 'BIO_STOMATA_GAS'],
    ['nhi?u xa 5 khe', 'PHYS_FRAUNHOFER_DIFF'],
    ['nhieuxa5khe', 'PHYS_FRAUNHOFER_DIFF'],
    ['chutr11nhcarnct', 'PHYS_GAS_STATE_PV'],
    ['chutrinhcarnat', 'PHYS_GAS_STATE_PV'],
    ['quanghap', 'BIO_PHOTOSYNTHESIS'],
    ['nnatphangnghieng', 'PHYS_INCLINED'],
    ['Thẩm thấu', 'BIO_OSMOSIS_CELL'],
    ['lực Co riolis', 'PHYS_CORIOLIS_FORCE'],
    ['Lotka Volterra', 'BIO_LOTKA_VOLTERRA'],
    ['operon lac', 'BIO_OPERON_LAC'],
    ['mạch điện xoay chiều', 'PHYS_RLC_PHASOR'],
    ['cân bằng Hardy Weinberg', 'BIO_HARDY_WEINBERG'],
    ['mạng tinh thể', 'CHEM_CRYSTAL_LATTICE'],
    ['hô hấp tế bào', 'BIO_CELL_RESPIRATION'],
  ];
  for (const [text, id] of NOISY) {
    it(`"${text}" → ${id}`, () => {
      expect(matchInstantStemBlueprint(text)?.templateId).toBe(id);
    });
  }

  it('con lắc kép thắng con lắc đơn; con lắc đơn vẫn đúng', () => {
    expect(matchInstantStemBlueprint('con lac kep')?.templateId).toBe('PHYS_DOUBLE_PENDULUM');
    expect(matchInstantStemBlueprint('con lắc đơn')?.templateId).toBe('PHYS_PENDULUM');
  });

  it('không mở nhầm với chữ bất kỳ', () => {
    expect(matchViName('hôm nay trời đẹp lắm')).toBeNull();
    expect(matchViName('bài tập về nhà')).toBeNull();
    expect(matchViName('ab')).toBeNull();
  });
});
