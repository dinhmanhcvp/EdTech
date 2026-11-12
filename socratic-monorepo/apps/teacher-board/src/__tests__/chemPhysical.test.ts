import {describe, expect, it} from 'vitest';
import {substanceRows, vesselRows} from '../utils/lab/chem/cards';
import {alkaliRows, bzRows, chlorineRows, no2Rows, titrationRows} from '../utils/lab/chem/opsCards';
import {derive, labReducer, newLab} from '../utils/lab/chem/engine';
import {PHYSICAL} from '../utils/lab/chem/physical';
import {propertiesOf} from '../utils/lab/chem/properties';
import {RULES} from '../utils/lab/chem/rules';
import {SUBSTANCES} from '../utils/lab/chem/species';
import {CHEM_LABS} from '../engines/families/HandsChemOps3D';

describe('hồ sơ chất đầy đủ: tính chất vật lí, hóa học và hiện tượng', () => {
  it('mọi chất trên kệ đều có tính chất vật lí (bề ngoài, mùi, tính tan)', () => {
    for (const s of SUBSTANCES) {
      const p = PHYSICAL[s.id];
      expect(p, s.id).toBeTruthy();
      for (const k of ['look', 'smell', 'water'] as const) expect(p[k].length, `${s.id}.${k}`).toBeGreaterThan(0);
      expect(propertiesOf(s.id)!.physical, s.id).toBe(p);
    }
    expect(Object.keys(PHYSICAL).filter((id) => !SUBSTANCES.some((s) => s.id === id))).toEqual([]);
  });
  it('mọi phản ứng trong cơ sở dữ liệu đều mô tả hiện tượng quan sát được', () => {
    expect(RULES.filter((r) => !r.text).map((r) => r.id)).toEqual([]);
  });
  it('các bài hóa THPT có cảnh thao tác riêng thay thanh trượt', () => {
    expect(Object.keys(CHEM_LABS)).toEqual(expect.arrayContaining(['alkali', 'chlorine', 'no2', 'titration']));
  });
});


describe('thẻ thông tin hiện ngay trên chất và trên phản ứng', () => {
  it('chất nào cũng có thẻ: tiêu đề, bề ngoài, và phản ứng kèm hiện tượng (không để trong tab Hướng dẫn)', () => {
    for (const s of SUBSTANCES) {
      const rows = substanceRows(s.id);
      expect(rows[0].t, s.id).toBe('h');
      expect(rows.some((r) => r.t === 'kv' && r.a === 'Bề ngoài:'), s.id).toBe(true);
      expect(rows.some((r) => r.t === 'eq'), s.id).toBe(true);
    }
    expect(substanceRows('hno3_conc').some((r) => r.t === 'warn')).toBe(true);
  });

  it('thẻ ống nghiệm: rỗng khi chưa có gì; có phương trình và hiện tượng ngay khi phản ứng xảy ra', () => {
    let lab = newLab();
    expect(vesselRows(lab.vessels[0], derive(lab.vessels[0]))).toEqual([]);
    for (const a of [{type: 'goggles', on: true}, {type: 'add', v: 0, sub: 'agno3', amount: 2}, {type: 'add', v: 0, sub: 'nacl', amount: 2}] as const) lab = labReducer(lab, a);
    const rows = vesselRows(lab.vessels[0], derive(lab.vessels[0]));
    expect(rows[0].a).toContain(lab.vessels[0].id);
    expect(rows.some((r) => r.t === 'eq' && /AgCl/.test(r.a))).toBe(true);
    expect(rows.some((r) => r.t === 'kv' && r.a.startsWith('Kết tủa'))).toBe(true);
    expect(rows.some((r) => r.t === 'p' && r.a.startsWith('→'))).toBe(true);
  });
});


describe('thẻ phản ứng trên dụng cụ của năm bài hóa thao tác riêng', () => {
  it('mỗi thẻ có phương trình, số liệu theo trạng thái và đổi theo trạng thái', () => {
    const early = titrationRows(5, 0.1, 1.5);
    const late = titrationRows(30, 0.1, 11.8);
    for (const rows of [early, late, no2Rows(25, 1, 0.8), chlorineRows(true, 60, 0.4, 12, true), alkaliRows('Na', 3, 2, 13.5, true, 0.2), bzRows(1, 0.05, 4.8)]) {
      expect(rows[0].t).toBe('h');
      expect(rows.some((r) => r.t === 'eq')).toBe(true);
    }
    expect(early.find((r) => r.a === 'Phenolphtalein:')?.b).toContain('không màu');
    expect(late.find((r) => r.a === 'Phenolphtalein:')?.b).toContain('hồng');
    expect(titrationRows(5, 0.1, 1.5).some((r) => r.a === 'HCl:')).toBe(true); // tính chất vật lí của chất ngay trên thẻ
    expect(chlorineRows(true, 60, 0.4, 12, true)[1].a).toContain('HClO');
    expect(chlorineRows(false, 60, 0, 12, true)[1].a).not.toContain('HClO ');
    expect(alkaliRows('K', 4, 3, 14, true, 0).some((r) => r.t === 'warn')).toBe(true);
    expect(alkaliRows('Na', 3, 0, 7, false, 0).some((r) => r.a.includes('dầu hỏa'))).toBe(true);
  });
});
