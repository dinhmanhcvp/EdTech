import {describe, expect, it} from 'vitest';
import {derive, labReducer, newLab} from '../utils/lab/chem/engine';
import {SUBSTANCES} from '../utils/lab/chem/species';
import {propertiesOf} from '../utils/lab/chem/properties';
import type {Action} from '../utils/lab/chem/types';

/** chạy một dãy thao tác trong ống 0 (đã đeo kính, có 2 mL nước nếu `water`) rồi chờ */
const run = (adds: [string, number][], o: {water?: boolean; heat?: number; wait?: number} = {}) => {
  const acts: Action[] = [{type: 'goggles', on: true}];
  if (o.water !== false) acts.push({type: 'add', v: 0, sub: 'water', amount: 2});
  for (const [sub, amount] of adds) acts.push({type: 'add', v: 0, sub, amount});
  for (let i = 0; i < (o.heat ?? 0); i++) acts.push({type: 'heat', v: 0});
  acts.push({type: 'wait', seconds: o.wait ?? 120});
  const s = acts.reduce(labReducer, newLab());
  return {v: s.vessels[0], d: derive(s.vessels[0]), s};
};
const mol = (r: ReturnType<typeof run>, sp: string) => r.v.moles[sp] ?? 0;

describe('chất mới: oxit, acid, muối, hữu cơ', () => {
  it('mọi chất mới có hồ sơ tính chất và có ít nhất một phản ứng', () => {
    for (const id of ['koh', 'naoh_s', 'hno3_conc', 'h3po4', 'oxalic', 'na3po4', 'k2cro4', 'ca', 'cuo', 'fe2o3', 'cao', 'phenol', 'benzene', 'ch3cooh_glacial']) {
      expect(SUBSTANCES.find((s) => s.id === id), id).toBeTruthy();
      expect(propertiesOf(id)!.reactions.length, id).toBeGreaterThan(0);
    }
  });
  it('CuO tan trong acid khi đun nhẹ cho dung dịch xanh lam; Fe₂O₃ cho dung dịch vàng nâu', () => {
    const a = run([['cuo', 0.2], ['hcl', 5]], {heat: 2, wait: 600});
    expect(mol(a, 'Cu2+')).toBeGreaterThan(0);
    expect(a.v.log.join(' ')).toContain('xanh lam');
    const b = run([['fe2o3', 0.2], ['hcl', 5]], {heat: 2, wait: 3000});
    expect(mol(b, 'Fe3+')).toBeGreaterThan(0);
  });
  it('HNO₃ đặc + Cu: thoát khí NO₂ nâu đỏ, dung dịch xanh; có khí màu thì derive báo bọt khí', () => {
    const r = run([['hno3_conc', 2], ['cu', 0.3]], {water: false, wait: 30});
    expect(mol(r, 'NO2')).toBeGreaterThan(0);
    expect(mol(r, 'Cu2+')).toBeGreaterThan(0);
    expect(r.v.log.join(' ')).toContain('NO₂');
    expect(mol(run([['hno3_conc', 2], ['cu', 0.3]], {water: false, wait: 30}), 'HNO3(conc)')).toBeLessThan(2 / 63 * 1.41 * 1000 / 1000);
  });
  it('chromate ⇌ dichromate: acid thì cam, base trở lại vàng; kết tủa với Ba²⁺, Pb²⁺, Ag⁺', () => {
    const acid = run([['k2cro4', 2], ['hcl', 2]]);
    expect(mol(acid, 'Cr2O7 2-')).toBeGreaterThan(0);
    expect(acid.d.color.toLowerCase()).not.toBe('#facc15');
    const back = run([['k2cro4', 2], ['hcl', 2], ['naoh', 3]]);
    expect(mol(back, 'CrO4 2-')).toBeGreaterThan(0);
    expect(mol(run([['k2cro4', 1], ['bacl2', 2]]), 'BaCrO4')).toBeGreaterThan(0);
    expect(mol(run([['k2cro4', 1], ['agno3', 2]]), 'Ag2CrO4')).toBeGreaterThan(0);
  });
  it('phosphate kết tủa với Ag⁺ (vàng), Ba²⁺, Ca²⁺', () => {
    expect(mol(run([['na3po4', 1], ['agno3', 2]]), 'Ag3PO4')).toBeGreaterThan(0);
    expect(mol(run([['na3po4', 1], ['bacl2', 2]]), 'Ba3(PO4)2')).toBeGreaterThan(0);
    expect(mol(run([['na3po4', 1], ['cacl2', 2]]), 'Ca3(PO4)2')).toBeGreaterThan(0);
  });
  it('phenol: kết tủa trắng với nước brom, màu tím với FeCl₃, tan trong NaOH', () => {
    expect(mol(run([['phenol', 1], ['br2w', 2]]), 'tribromophenol')).toBeGreaterThan(0);
    expect(mol(run([['phenol', 2], ['fecl3', 0.5]]), 'Fe-phenol')).toBeGreaterThan(0);
    expect(mol(run([['phenol', 1], ['naoh', 2]]), 'C6H5O-')).toBeGreaterThan(0);
  });
  it('benzene chỉ thế brom khi có bột sắt xúc tác; không có sắt thì không làm mất màu nước brom', () => {
    const none = run([['benzene', 1], ['br2w', 2]], {wait: 600});
    expect(mol(none, 'C6H5Br')).toBe(0);
    const withFe = run([['benzene', 1], ['br2w', 2], ['fe', 0.2]], {wait: 3000});
    expect(mol(withFe, 'C6H5Br')).toBeGreaterThan(0);
  });
  it('este hóa: acid băng + ethanol + H₂SO₄ đặc + đun nóng cho este thơm', () => {
    const r = run([['ch3cooh_glacial', 2], ['ethanol', 2], ['h2so4_conc', 1]], {water: false, heat: 8, wait: 1200});
    expect(mol(r, 'CH3COOC2H5')).toBeGreaterThan(0);
    expect(r.d.smell.join(' ')).toContain('este');
  });
  it('oxalic + KMnO₄ (acid): chậm lúc đầu rồi nhanh dần nhờ Mn²⁺ (tự xúc tác)', () => {
    const at = (t: number) => mol(run([['oxalic', 5], ['h2so4', 2], ['kmno4', 2]], {wait: t}), 'MnO4-');
    const m0 = at(1);
    const early = at(60);
    const late = at(1500);
    expect(early).toBeGreaterThan(0.9 * m0);
    expect(late).toBeLessThan(0.5 * m0);
  });
  it('CaO tỏa nhiệt khi gặp nước; Ca sinh H₂; NaOH rắn tan và nóng lên', () => {
    const cao = run([['cao', 0.5]]);
    expect(mol(cao, 'Ca(OH)2(aq)')).toBeGreaterThan(0);
    expect(cao.v.temp).toBeGreaterThan(25);
    expect(mol(run([['ca', 0.05]], {wait: 300}), 'Ca(OH)2(aq)')).toBeGreaterThan(0);
    const naoh = run([['naoh_s', 0.5]]);
    expect(mol(naoh, 'OH-')).toBeGreaterThan(0);
    expect(naoh.v.temp).toBeGreaterThan(25);
  });
});
