import {describe, expect, it} from 'vitest';
import {derive, labReducer, newLab} from '../utils/lab/chem/engine';
import {propertiesOf} from '../utils/lab/chem/properties';
import {SUBSTANCES} from '../utils/lab/chem/species';
import type {Action} from '../utils/lab/chem/types';

const run = (adds: [string, number][], o: {water?: boolean; heat?: number; wait?: number} = {}) => {
  const acts: Action[] = [{type: 'goggles', on: true}];
  if (o.water !== false) acts.push({type: 'add', v: 0, sub: 'water', amount: 2});
  for (const [sub, amount] of adds) acts.push({type: 'add', v: 0, sub, amount});
  for (let i = 0; i < (o.heat ?? 0); i++) acts.push({type: 'heat', v: 0});
  acts.push({type: 'wait', seconds: o.wait ?? 120});
  const v = acts.reduce(labReducer, newLab()).vessels[0];
  return {v, d: derive(v)};
};
const mol = (r: ReturnType<typeof run>, sp: string) => r.v.moles[sp] ?? 0;

describe('acid hữu cơ và amine', () => {
  it('7 chất mới có hồ sơ và có phản ứng', () => {
    for (const id of ['hcooh', 'citric', 'benzoic', 'oleic', 'stearic', 'ch3nh2', 'glycine']) {
      expect(SUBSTANCES.find((s) => s.id === id), id).toBeTruthy();
      expect(propertiesOf(id)!.reactions.length, id).toBeGreaterThan(0);
    }
    expect(propertiesOf('aniline')!.reactions.map((r) => r.id)).toEqual(expect.arrayContaining(['aniline-h', 'aniline-br']));
  });
  it('formic acid: sủi bọt với Na₂CO₃, làm nhạt KMnO₄, tráng bạc (acetic acid không tráng bạc)', () => {
    expect(mol(run([['na2co3', 2], ['hcooh', 5]]), 'CO2')).toBeGreaterThan(0);
    expect(mol(run([['kmno4', 2], ['h2so4', 2], ['hcooh', 2]], {wait: 300}), 'MnO4-')).toBeLessThan(0.00004);
    const mirror = (sub: string) => run([['agno3', 1], ['nh3', 3], [sub, 2]], {water: false, heat: 4, wait: 300});
    expect(mol(mirror('hcooh'), 'Ag-mirror')).toBeGreaterThan(0);
    expect(mol(mirror('ch3cooh'), 'Ag-mirror')).toBe(0);
  });
  it('citric acid + NaHCO₃ sủi mạnh; citric + NaOH trung hòa tỏa nhiệt', () => {
    expect(mol(run([['nahco3', 0.5], ['citric', 2]]), 'CO2')).toBeGreaterThan(0);
    const n = run([['citric', 1], ['naoh', 5]]);
    expect(mol(n, 'Cit3-')).toBeGreaterThan(0);
  });
  it('acid benzoic: tan trong NaOH, thêm HCl thì kết tủa trắng trở lại; tan có sủi bọt trong NaHCO₃', () => {
    expect(mol(run([['benzoic', 0.1], ['naoh', 5]], {wait: 600}), 'C6H5COO-')).toBeGreaterThan(0);
    const back = run([['benzoic', 0.1], ['naoh', 5], ['hcl', 10]], {wait: 600});
    expect(mol(back, 'C6H5COOH(s)')).toBeGreaterThan(0);
    expect(mol(run([['benzoic', 0.1], ['nahco3', 0.3]], {wait: 600}), 'C6H5COO-')).toBeGreaterThan(0);
  });
  it('oleic làm mất màu nước brom, stearic thì không', () => {
    const br = (sub: string, amt: number) => run([['br2w', 2], [sub, amt]], {wait: 300});
    expect(mol(br('oleic', 0.5), 'oleic-Br2')).toBeGreaterThan(0);
    expect(mol(br('stearic', 0.1), 'oleic-Br2')).toBe(0);
    expect(mol(br('stearic', 0.1), 'Br2(aq)')).toBeGreaterThan(0);
  });
  it('methylamine: trung hòa bởi acid; kết tủa Fe(OH)₃; Cu(OH)₂ tan trong amine dư tạo phức xanh thẫm', () => {
    expect(mol(run([['ch3nh2', 2], ['hcl', 5]]), 'CH3NH3+')).toBeGreaterThan(0);
    expect(mol(run([['fecl3', 1], ['ch3nh2', 4]]), 'Fe(OH)3')).toBeGreaterThan(0);
    const ex = run([['cuso4', 1], ['ch3nh2', 3], ['ch3nh2', 5], ['ch3nh2', 5]]);
    expect(mol(ex, 'Cu(MeNH2)4 2+')).toBeGreaterThan(0);
    expect(run([['ch3nh2', 2]]).d.smell.join(' ')).toContain('tanh');
  });
  it('aniline tan trong acid thành muối rồi bị NaOH đẩy ra; glycine lưỡng tính; quỳ tím không đổi màu với glycine', () => {
    expect(mol(run([['aniline', 0.5], ['hcl', 5]]), 'C6H5NH3+')).toBeGreaterThan(0);
    const back = run([['aniline', 0.5], ['hcl', 5], ['naoh', 5]]);
    expect(mol(back, 'aniline')).toBeGreaterThan(0);
    expect(mol(run([['glycine', 2], ['hcl', 1]]), 'GlyH+')).toBeGreaterThan(0);
    expect(mol(run([['glycine', 2], ['naoh', 1]]), 'Gly-')).toBeGreaterThan(0);
    const lit = run([['glycine', 2], ['litmus', 0.1]]);
    expect(lit.d.ph).toBeGreaterThan(5);
    expect(lit.d.ph).toBeLessThan(8);
    expect(lit.d.color.toLowerCase()).toBe('#a78bfa');
  });
});
