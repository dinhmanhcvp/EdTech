import {describe, expect, it} from 'vitest';
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
  it('bốn bài hóa THPT có cảnh thao tác riêng thay thanh trượt', () => {
    expect(Object.keys(CHEM_LABS).sort()).toEqual(['alkali', 'chlorine', 'no2', 'titration']);
  });
});
