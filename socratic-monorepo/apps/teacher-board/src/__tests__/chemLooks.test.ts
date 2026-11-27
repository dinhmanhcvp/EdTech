import {describe, expect, it} from 'vitest';
import {SPECIES, SUBSTANCES} from '../utils/lab/chem/species';
import {isPrecip, lookOf} from '../utils/lab/chem/looks';
import {derive, labReducer, newLab} from '../utils/lab/chem/engine';
import type {Action} from '../utils/lab/chem/types';

const run = (acts: Action[]) => acts.reduce(labReducer, labReducer(newLab(), {type: 'goggles', on: true}));

describe('chất trong ống nghiệm trông như thật', () => {
  it('hóa chất rắn trên kệ là mẩu / hạt / bột / tinh thể, không vẽ thành kết tủa', () => {
    for (const s of SUBSTANCES.filter((x) => x.kind === 'solid'))
      for (const sp of Object.keys(s.species)) if (SPECIES[sp]?.phase === 's') expect(isPrecip(lookOf(sp)), `${s.id}: ${sp}`).toBe(false);
    expect(lookOf('Na')).toBe('float-metal');
    expect(lookOf('Fe')).toBe('nail');
  });
  it('kết tủa có kiểu riêng: hydroxide keo bông, bạc halide vón cục, BaSO₄ hạt mịn, lưu huỳnh keo lơ lửng', () => {
    expect(lookOf('Cu(OH)2')).toBe('gel');
    expect(lookOf('Fe(OH)3')).toBe('gel');
    expect(lookOf('AgCl')).toBe('curd');
    expect(lookOf('BaSO4')).toBe('fine');
    expect(lookOf('S(coll)')).toBe('colloid');
  });
  it('độ đậm màu theo chất: KMnO₄ rất loãng vẫn đậm hơn CuSO₄ 0,1 M', () => {
    const cu = derive(run([{type: 'add', v: 0, sub: 'cuso4', amount: 3}]).vessels[0]);
    const mn = derive(run([{type: 'add', v: 0, sub: 'water', amount: 3}, {type: 'add', v: 0, sub: 'kmno4', amount: 0.3}]).vessels[0]);
    expect(mn.colorAlpha).toBeGreaterThan(cu.colorAlpha);
    expect(cu.colorAlpha).toBeLessThan(0.6); // CuSO₄ 0,1 M chỉ xanh lam nhạt
  });
  it('đồng trong HNO₃ đặc: dung dịch xanh lục (Cu²⁺ xanh lam + NO₂ tan vàng nâu)', () => {
    const d = derive(run([{type: 'add', v: 4, sub: 'hno3_conc', amount: 10}, {type: 'add', v: 4, sub: 'cu', amount: 1}, {type: 'wait', seconds: 30}]).vessels[4]);
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(d.color.slice(i, i + 2), 16));
    expect(g).toBeGreaterThan(r);
    expect(g).toBeGreaterThanOrEqual(b - 10);
  });
});
