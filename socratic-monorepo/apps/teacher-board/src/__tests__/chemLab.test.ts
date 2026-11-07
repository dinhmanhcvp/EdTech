import {describe, it, expect} from 'vitest';
import {CHEM_EXPERIMENTS} from '../utils/lab/chem/experiments';
import {derive, labReducer, newLab, runScript, stepsDone, pHOf} from '../utils/lab/chem/engine';
import {RULES} from '../utils/lab/chem/rules';
import {SPECIES, SUBSTANCES} from '../utils/lab/chem/species';

const add = (v: number, sub: string, amount: number) => ({type: 'add' as const, v, sub, amount});

describe('Phòng thí nghiệm Hóa: dữ liệu', () => {
  it('mọi loài trong chất và luật đều được khai báo', () => {
    const missing = new Set<string>();
    for (const s of SUBSTANCES) for (const k of Object.keys(s.species)) if (!SPECIES[k]) missing.add(`${s.id}:${k}`);
    for (const r of RULES) for (const k of [...Object.keys(r.reactants), ...Object.keys(r.products), ...(r.catalysts ?? []), ...(r.rateSpecies ?? [])]) if (!SPECIES[k]) missing.add(`${r.id}:${k}`);
    expect([...missing]).toEqual([]);
  });

  it('mã luật không trùng; luật tốc độ có k > 0', () => {
    const ids = RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of RULES) if (r.k !== undefined) expect(r.k, r.id).toBeGreaterThan(0);
  });

  it('mọi bài thí nghiệm có bước, câu hỏi, thao tác mẫu và câu hỏi có đáp án hợp lệ', () => {
    expect(new Set(CHEM_EXPERIMENTS.map((e) => e.id)).size).toBe(CHEM_EXPERIMENTS.length);
    for (const e of CHEM_EXPERIMENTS) {
      expect(e.steps.length, e.id).toBeGreaterThanOrEqual(2);
      expect(e.script.length, e.id).toBeGreaterThan(0);
      for (const q of e.questions) expect(q.answer >= 0 && q.answer < q.options.length, e.id).toBe(true);
    }
  });
});

describe('Phòng thí nghiệm Hóa: mọi bài làm theo thao tác mẫu đều hoàn thành mọi bước', () => {
  for (const e of CHEM_EXPERIMENTS) {
    it(e.id, () => {
      const done = stepsDone(e, runScript(e.script));
      const failed = e.steps.filter((_, i) => !done[i]).map((s) => s.text);
      expect(failed).toEqual([]);
    });
  }
  it('trước khi làm chưa bước nào xong', () => {
    for (const e of CHEM_EXPERIMENTS) expect(stepsDone(e, newLab()).some(Boolean), e.id).toBe(false);
  });
});

describe('Phòng thí nghiệm Hóa: định lượng', () => {
  it('trung hòa 10 mL HCl 0,5 M với 10 mL NaOH 0,5 M tăng khoảng 3,4 °C và pH ≈ 7', () => {
    const s = runScript([add(4, 'hcl', 10), add(4, 'naoh', 10)]);
    expect(derive(s.vessels[4]).temp - 25).toBeGreaterThan(3);
    expect(derive(s.vessels[4]).temp - 25).toBeLessThan(4);
    expect(pHOf(s.vessels[4])).toBeCloseTo(7, 0);
  });

  it('thừa NaOH: pH kiềm; thừa HCl: pH acid; dư nhiều hơn thì pH cực hơn', () => {
    const base = runScript([add(0, 'hcl', 1), add(0, 'naoh', 2)]);
    const acid = runScript([add(0, 'hcl', 2), add(0, 'naoh', 1)]);
    expect(pHOf(base.vessels[0])!).toBeGreaterThan(12);
    expect(pHOf(acid.vessels[0])!).toBeLessThan(2);
  });

  it('Al(OH)₃ kết tủa với ít kiềm và tan khi kiềm dư; Mg(OH)₂ không tan', () => {
    const few = runScript([add(0, 'alcl3', 2), add(0, 'naoh', 1)]);
    expect(derive(few.vessels[0]).precipitates.map((p) => p.species)).toContain('Al(OH)3');
    const many = labReducer(few, add(0, 'naoh', 5));
    expect(derive(many.vessels[0]).precipitates.map((p) => p.species)).not.toContain('Al(OH)3');
    const mg = runScript([add(0, 'mgcl2', 2), add(0, 'naoh', 5)]);
    expect(derive(mg.vessels[0]).precipitates.map((p) => p.species)).toContain('Mg(OH)2');
  });

  it('tỉ lệ mol đúng: 0,2 mmol Ag⁺ + 0,2 mmol Cl⁻ vừa hết; Ag⁺ dư thì không còn Cl⁻', () => {
    const s = runScript([add(0, 'nacl', 2), add(0, 'agno3', 4)]);
    expect(s.vessels[0].moles['Cl-'] ?? 0).toBeLessThan(1e-9);
    expect(s.vessels[0].moles['Ag+']).toBeCloseTo(0.0002, 6);
    expect(s.vessels[0].moles.AgCl).toBeCloseTo(0.0002, 6);
  });

  it('nồng độ càng lớn phản ứng càng nhanh; nhiệt độ cao nhanh hơn', () => {
    const t = (sub: string) => {
      const s = runScript([add(0, sub, 5), add(0, 'h2so4', 5), {type: 'wait', seconds: 300}]);
      return s.vessels[0].turbidAt as number;
    };
    expect(t('na2s2o3_030')).toBeLessThan(t('na2s2o3_010'));
    expect(t('na2s2o3_010')).toBeLessThan(t('na2s2o3_005'));
    const cold = runScript([add(0, 'water', 10), add(0, 'mg', 0.1), {type: 'wait', seconds: 30}]);
    const hot = runScript([add(0, 'water', 10), add(0, 'mg', 0.1), {type: 'heat', v: 0}, {type: 'heat', v: 0}, {type: 'heat', v: 0}, {type: 'wait', seconds: 30}]);
    expect((hot.vessels[0].moles['Mg(OH)2'] ?? 0)).toBeGreaterThan((cold.vessels[0].moles['Mg(OH)2'] ?? 0) * 5);
  });

  it('an toàn: không đeo kính, rót nước vào acid đặc, dùng quá nhiều natri đều bị ghi nhận', () => {
    const s = runScript([add(0, 'h2so4_conc', 2), add(0, 'water', 5), add(1, 'water', 10), add(1, 'na', 0.5)]);
    expect(s.violations.join(' | ')).toMatch(/kính bảo hộ/);
    expect(s.violations.join(' | ')).toMatch(/Rót nước vào acid đặc/);
    expect(s.violations.join(' | ')).toMatch(/natri/);
    const safe = runScript([{type: 'goggles', on: true}, add(0, 'water', 5), add(0, 'h2so4_conc', 1)]);
    expect(safe.violations).toEqual([]);
  });

  it('đổ ống bỏ hết chất; ống đầy thì tràn', () => {
    let s = runScript([add(0, 'hcl', 10), add(0, 'hcl', 10), add(0, 'hcl', 10)]);
    expect(s.vessels[0].liquidMl).toBeLessThanOrEqual(20);
    expect(s.log.some((l) => l.text.includes('đầy'))).toBe(true);
    s = labReducer(s, {type: 'discard', v: 0});
    expect(s.vessels[0].liquidMl).toBe(0);
    expect(Object.keys(s.vessels[0].moles)).toHaveLength(0);
  });

  it('khí được dẫn sang ống khác: CO₂ làm đục nước vôi; khí thoát dần khi để hở', () => {
    let s = runScript([add(0, 'na2co3', 1), add(0, 'hcl', 5), add(1, 'limewater', 5)]);
    expect(s.vessels[0].moles.CO2).toBeGreaterThan(0);
    s = labReducer(s, {type: 'transferGas', v: 0, to: 1});
    expect(s.vessels[1].moles.CaCO3).toBeGreaterThan(0);
    const gone = runScript([add(0, 'na2co3', 1), add(0, 'hcl', 5), {type: 'wait', seconds: 300}]);
    expect(gone.vessels[0].moles.CO2 ?? 0).toBeLessThan(1e-6);
  });
});
