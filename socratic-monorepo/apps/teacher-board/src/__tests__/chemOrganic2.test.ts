import {describe, expect, it} from 'vitest';
import {derive, labReducer, newLab} from '../utils/lab/chem/engine';
import {propertiesOf} from '../utils/lab/chem/properties';
import {SUBSTANCES} from '../utils/lab/chem/species';
import type {Action} from '../utils/lab/chem/types';

/** Chuỗi thao tác trên ống 0: [chất, lượng] = cho vào; 'heat' = đun một lần; số = chờ ngần ấy giây. */
type Step = [string, number] | 'heat' | number;
const run = (...steps: Step[]) => {
  const acts: Action[] = [{type: 'goggles', on: true}];
  for (const s of steps) acts.push(s === 'heat' ? {type: 'heat', v: 0} : typeof s === 'number' ? {type: 'wait', seconds: s} : {type: 'add', v: 0, sub: s[0], amount: s[1]});
  const v = acts.reduce(labReducer, newLab()).vessels[0];
  return {v, d: derive(v), mol: (sp: string) => v.moles[sp] ?? 0, fired: (id: string) => v.fired.includes(id)};
};
const HOT: Step[] = ['heat', 'heat', 'heat', 'heat'];

describe('bàn hóa học: este, amide, protein, amino acid, diazo, nitro hóa, polime, thụ động hóa', () => {
  it('18 chất mới đều có hồ sơ và có ít nhất một phản ứng', () => {
    for (const id of ['ethyl_acetate', 'fat', 'acetamide', 'urea', 'lysine', 'glutamic', 'alanine', 'nano2', 'ice', 'naphthol', 'hcho', 'hmda', 'adipoyl', 'pe', 'pvc', 'wool', 'cotton']) {
      expect(SUBSTANCES.find((s) => s.id === id), id).toBeTruthy();
      expect(propertiesOf(id)!.reactions.length, id).toBeGreaterThan(0);
    }
  });

  it('este: đun với NaOH thì thủy phân hết (một chiều); không đun thì còn nguyên; trong acid chỉ thủy phân một phần', () => {
    const base = run(['ethyl_acetate', 1], ['naoh10', 5], ...HOT, 300);
    expect(base.mol('CH3COOC2H5')).toBeLessThan(1e-4);
    expect(base.mol('CH3COO-')).toBeGreaterThan(0.009);
    expect(base.d.smell.join(' ')).not.toContain('este');
    const cold = run(['ethyl_acetate', 1], ['naoh10', 5], 300);
    expect(cold.mol('CH3COO-')).toBe(0);
    expect(cold.d.smell.join(' ')).toContain('este');
    const acid = run(['ethyl_acetate', 1], ['h2so4', 5], ...HOT, 300);
    expect(acid.mol('CH3COOH')).toBeGreaterThan(0);
    expect(acid.mol('CH3COOC2H5')).toBeGreaterThan(0.005);
  });

  it('xà phòng hóa chất béo: tạo xà phòng và glycerol; xà phòng kết tủa với nước cứng, bị acid đẩy ra; glycerol hòa tan Cu(OH)₂', () => {
    const soap: Step[] = [['fat', 0.5], ['naoh', 5], ...HOT, 300];
    const s = run(...soap);
    expect(s.mol('fat(s)')).toBeLessThan(1e-5);
    expect(s.mol('stearate')).toBeGreaterThan(0.0015);
    expect(s.mol('glycerol')).toBeGreaterThan(0.0005);
    expect(run(['fat', 0.5], ['naoh', 5], 300).mol('stearate')).toBe(0);
    expect(run(...soap, ['cacl2', 5]).mol('Ca-stearate')).toBeGreaterThan(0);
    expect(run(...soap, ['hcl', 5]).mol('stearic(s)')).toBeGreaterThan(0);
    expect(run(...soap, ['cuso4', 1]).mol('Cu-polyol')).toBeGreaterThan(0);
  });

  it('amide và urea: chỉ thủy phân khi đun; kiềm cho NH₃, acid cho NH₄⁺; urea + HNO₂ sủi bọt N₂', () => {
    const am = run(['acetamide', 2], ['naoh', 5], ...HOT, 30);
    expect(am.fired('amide-oh')).toBe(true);
    expect(am.mol('CH3COO-')).toBeGreaterThan(0);
    expect(am.fired('nh3-heat')).toBe(true);
    const cold = run(['acetamide', 2], ['naoh', 5], 300);
    expect(cold.fired('amide-oh')).toBe(false);
    expect(cold.mol('CH3CONH2')).toBeCloseTo(0.001, 6);
    expect(run(['acetamide', 2], ['hcl', 5], ...HOT, 30).mol('NH4+')).toBeGreaterThan(0);
    expect(run(['acetamide', 2]).d.ph).toBeCloseTo(7, 5);
    expect(run(['urea', 1], ['naoh10', 2], ...HOT, 30).mol('CO3 2-')).toBeGreaterThan(0);
    expect(run(['urea', 1], ['hcl', 5], ...HOT, 30).mol('NH4+')).toBeGreaterThan(0);
    const n2 = run(['urea', 1], ['nano2', 2], ['hcl', 5]);
    expect(n2.fired('urea-hno2')).toBe(true);
    expect(n2.mol('urea')).toBeLessThan(0.001);
  });

  it('protein: đông tụ khi đun, hóa vàng với HNO₃ đặc, thủy phân xong thì biuret âm tính', () => {
    expect(run(['protein', 2], 'heat', 'heat', 'heat').mol('protein(coag)')).toBeGreaterThan(0);
    expect(run(['protein', 2], 60).mol('protein(coag)')).toBe(0);
    expect(run(['protein', 2], ['hno3_conc', 1]).mol('xantho')).toBeGreaterThan(0);
    const hydro: Step[] = [['protein', 2], ['hcl', 2], ...HOT, 120];
    const h = run(...hydro);
    expect(h.mol('aa-mix')).toBeGreaterThan(0);
    expect(h.mol('protein(coag)')).toBeLessThan(1e-6);
    expect(run(...hydro, ['naoh10', 5], ['cuso4', 1]).mol('Cu-biuret')).toBe(0);
    expect(run(['protein', 2], ['naoh10', 5], ['cuso4', 1]).mol('Cu-biuret')).toBeGreaterThan(0);
  });

  it('amino acid: lysine làm quỳ xanh, glutamic làm quỳ đỏ và sủi CO₂ với NaHCO₃, alanine không đổi màu; đều lưỡng tính; HNO₂ giải phóng N₂', () => {
    expect(run(['lysine', 2], ['litmus', 0.1]).d.color.toLowerCase()).toBe('#3b82f6');
    expect(run(['glutamic', 5], ['litmus', 0.1]).d.color.toLowerCase()).toBe('#ef4444');
    expect(run(['alanine', 2], ['litmus', 0.1]).d.color.toLowerCase()).toBe('#a78bfa');
    expect(run(['lysine', 2], ['hcl', 5]).mol('LysH2 2+')).toBeGreaterThan(0);
    expect(run(['lysine', 2], ['naoh', 1]).mol('Lys-')).toBeGreaterThan(0);
    expect(run(['glutamic', 5], ['hcl', 1]).mol('GluH+')).toBeGreaterThan(0);
    expect(run(['glutamic', 5], ['naoh', 0.25]).mol('Glu-')).toBeGreaterThan(0);
    expect(run(['glutamic', 5], ['naoh', 5]).mol('Glu2-')).toBeGreaterThan(0);
    expect(run(['glutamic', 5], ['nahco3', 0.5]).fired('glu-hco3')).toBe(true);
    expect(run(['alanine', 2], ['nahco3', 0.5]).mol('CO2')).toBe(0);
    expect(run(['alanine', 2], ['hcl', 1]).mol('AlaH+')).toBeGreaterThan(0);
    expect(run(['alanine', 2], ['naoh', 1]).mol('Ala-')).toBeGreaterThan(0);
    expect(run(['glycine', 2], ['hcl', 5], ['nano2', 2]).mol('glycolic')).toBeGreaterThan(0);
    expect(run(['alanine', 2], ['hcl', 5], ['nano2', 2]).mol('lactic')).toBeGreaterThan(0);
  });

  it('diazo hóa aniline: giữ lạnh bằng nước đá thì còn muối diazonium và ghép đôi ra phẩm azo; để ấm thì phân hủy thành phenol; methylamine sủi N₂ ngay', () => {
    const coldMix: Step[] = [['aniline', 0.1], ['hcl', 5], ['ice', 2], ['nano2', 2]];
    const cold = run(...coldMix, 5);
    expect(cold.v.temp).toBeLessThan(10);
    expect(cold.mol('C6H5N2+')).toBeGreaterThan(0.0009);
    expect(cold.mol('C6H5OH')).toBe(0);
    const dye = run(...coldMix, ['naphthol', 5]);
    expect(dye.mol('azo-dye')).toBeGreaterThan(0.0004);
    expect(dye.d.precipitates.some((p) => p.species === 'azo-dye')).toBe(true);
    const warmed = run(...coldMix, 600);
    expect(warmed.mol('C6H5N2+')).toBeLessThan(1e-5);
    expect(warmed.mol('C6H5OH')).toBeGreaterThan(0.0009);
    const noIce = run(['aniline', 0.1], ['hcl', 5], ['nano2', 2], 120);
    expect(noIce.mol('C6H5N2+')).toBeLessThan(1e-4);
    expect(noIce.fired('diazo-decomp')).toBe(true);
    expect(run(['aniline', 0.1], ['hcl', 5], ['nano2', 2], 120, ['naphthol', 5]).mol('azo-dye')).toBeLessThan(1e-4);
    const amine = run(['ch3nh2', 2], ['hcl', 5], ['ice', 2], ['nano2', 2]);
    expect(amine.v.temp).toBeLessThan(10);
    expect(amine.mol('CH3OH')).toBeGreaterThan(0);
    expect(run(['ice', 2], ['ice', 2], ['water', 2]).v.temp).toBeGreaterThanOrEqual(0);
  });

  it('nitro hóa benzene: cần H₂SO₄ đặc và đun nóng', () => {
    const ok = run(['benzene', 1], ['hno3_conc', 1], ['h2so4_conc', 1], 'heat', 'heat', 120);
    expect(ok.mol('C6H5NO2')).toBeGreaterThan(0);
    expect(ok.d.smell.join(' ')).toContain('hạnh nhân');
    expect(run(['benzene', 1], ['hno3_conc', 1], 'heat', 'heat', 120).mol('C6H5NO2')).toBe(0);
    expect(run(['benzene', 1], ['hno3_conc', 1], ['h2so4_conc', 1], 120).mol('C6H5NO2')).toBe(0);
  });

  it('polime: PE chỉ nóng chảy; PVC đun với kiềm nhả Cl⁻ (AgCl), nung khô thoát HCl; len tan trong kiềm và cho biuret; bông không tan nhưng bị H₂SO₄ đặc than hóa', () => {
    expect(run(['pe', 0.5], 'heat', 'heat').mol('PE(melt)')).toBeGreaterThan(0);
    const peBase = run(['pe', 0.5], ['naoh', 5], ...HOT, 120, ['hno3', 10], ['agno3', 2]);
    expect(peBase.mol('PE(s)')).toBeGreaterThan(0);
    expect(peBase.mol('AgCl')).toBe(0);
    const pvc = run(['pvc', 0.5], ['naoh', 5], ...HOT, 120, ['hno3', 10], ['agno3', 2]);
    expect(pvc.mol('AgCl')).toBeGreaterThan(0);
    expect(run(['pvc', 0.5], 'heat', 'heat', 'heat').fired('pvc-heat')).toBe(true);
    expect(run(['pvc', 0.5], 'heat').fired('pvc-heat')).toBe(false);
    const wool: Step[] = [['wool', 0.5], ['naoh10', 5], ...HOT, 120];
    expect(run(...wool).mol('peptide')).toBeGreaterThan(0);
    expect(run(...wool, ['cuso4', 1]).mol('Cu-biuret')).toBeGreaterThan(0);
    const cotton = run(['cotton', 0.5], ['naoh10', 5], ...HOT, 120, ['cuso4', 1]);
    expect(cotton.mol('cotton(s)')).toBeCloseTo(0.5 / 162, 8);
    expect(cotton.mol('Cu-biuret')).toBe(0);
    expect(run(['cotton', 0.5], ['h2so4_conc', 2], 120).mol('C(char)')).toBeGreaterThan(0);
  });

  it('trùng ngưng: novolac cần acid và đun nóng; nilon-6,6 tạo màng ngay; formaldehyde tráng bạc', () => {
    expect(run(['phenol', 5], ['hcho', 2], ['hcl', 1], ...HOT, 120).mol('novolac(s)')).toBeGreaterThan(0);
    expect(run(['phenol', 5], ['hcho', 2], ...HOT, 120).mol('novolac(s)')).toBe(0);
    expect(run(['phenol', 5], ['hcho', 2], ['hcl', 1], 120).mol('novolac(s)')).toBe(0);
    expect(run(['hmda', 2], ['adipoyl', 0.25]).mol('nylon66(s)')).toBeGreaterThan(0);
    expect(run(['agno3', 1], ['nh3', 3], ['hcho', 1], ...HOT, 300).mol('Ag-mirror')).toBeGreaterThan(0);
  });

  it('thụ động hóa: Fe, Al không tan trong HNO₃ và H₂SO₄ đặc nguội, không đẩy được Cu²⁺; đun nóng với HNO₃ đặc thì tan ra NO₂; acid loãng thì không thụ động', () => {
    for (const [metal, sp, ion] of [['fe', 'Fe', 'Fe3+'], ['al', 'Al', 'Al3+']] as const) {
      const cold = run([metal, 0.5], ['hno3_conc', 2], 300);
      expect(cold.mol(`${sp}(passive)`), metal).toBeGreaterThan(0);
      expect(cold.mol(sp), metal).toBe(0);
      expect(cold.mol(ion), metal).toBe(0);
      expect(cold.fired(`${metal}-hno3-hot`), metal).toBe(false);
      const hot = run([metal, 0.5], ['hno3_conc', 2], 'heat', 'heat', 60);
      expect(hot.mol(ion), metal).toBeGreaterThan(0);
      expect(hot.fired(`${metal}-hno3-hot`), metal).toBe(true);
      expect(run([metal, 0.5], ['h2so4_conc', 2], 300).mol(`${sp}(passive)`), metal).toBeGreaterThan(0);
    }
    expect(run(['fe', 0.5], ['hno3_conc', 1], ['cuso4', 5], 300).mol('Cu')).toBe(0);
    expect(run(['fe', 0.5], ['cuso4', 5], 300).mol('Cu')).toBeGreaterThan(0);
    const dilute = run(['water', 5], ['fe', 0.5], ['hno3_conc', 1], 300);
    expect(dilute.mol('Fe(passive)')).toBe(0);
    expect(dilute.mol('Fe2+')).toBeGreaterThan(0);
  });
});
