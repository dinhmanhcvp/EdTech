import React from 'react';
import {describe, it, expect, afterEach} from 'vitest';
import {render, cleanup, fireEvent} from '@testing-library/react';
import {SimulationWidget} from '../components/canvas/SimulationWidget';
import {makePresetBlueprint, matchPresetId, PRESETS} from '../utils/presets';
import {BIO_EXPERIMENTS} from '../utils/lab/bio/experiments';
import {PHYS_BY_ID} from '../utils/lab/phys/experiments';
import {initialPhys, physCtx, physStepsDone, runPhys} from '../utils/lab/phys/engine';

afterEach(cleanup);
const get = (id: string) => BIO_EXPERIMENTS.find((e) => e.id === id)!;
const ctxOf = (id: string) => physCtx(get(id), runPhys(get(id), get(id).script));

describe('Phòng thực hành Sinh: dữ liệu bài', () => {
  it('mã bài không trùng (kể cả với phòng Lý), có bước, câu hỏi hợp lệ, thao tác mẫu', () => {
    expect(new Set(BIO_EXPERIMENTS.map((e) => e.id)).size).toBe(BIO_EXPERIMENTS.length);
    for (const e of BIO_EXPERIMENTS) {
      expect(PHYS_BY_ID[e.id], e.id).toBeUndefined();
      expect(e.steps.length, e.id).toBeGreaterThanOrEqual(2);
      expect(e.script.length, e.id).toBeGreaterThan(0);
      for (const q of e.questions) expect(q.answer >= 0 && q.answer < q.options.length, e.id).toBe(true);
      for (const sl of e.sliders) expect(sl.value >= sl.min && sl.value <= sl.max, `${e.id}/${sl.key}`).toBe(true);
    }
  });

  it('mỗi bài có preset BIO_LAB_ và câu mẫu mở đúng bài', () => {
    expect(PRESETS.BIO_LAB_BENCH).toBeTruthy();
    for (const e of BIO_EXPERIMENTS) {
      const id = `BIO_LAB_${e.id}`;
      expect(PRESETS[id], id).toBeTruthy();
      for (const x of PRESETS[id].examples) expect(matchPresetId(x), x).toBe(id);
    }
  });
});

describe('Phòng thực hành Sinh: làm theo thao tác mẫu', () => {
  for (const e of BIO_EXPERIMENTS) {
    it(`${e.id}: hoàn thành mọi bước và kết quả đạt`, () => {
      const st = runPhys(e, e.script);
      const done = physStepsDone(e, st);
      expect(e.steps.filter((_, i) => !done[i]).map((s) => s.text)).toEqual([]);
      const v = e.verdict(physCtx(e, st));
      expect(v.ok, v.text).toBe(true);
    });
    it(`${e.id}: chưa làm gì thì chưa đạt`, () => {
      expect(e.verdict(physCtx(e, initialPhys(e))).ok).toBe(false);
    });
  }
});

describe('Phòng thực hành Sinh: kết quả có ý nghĩa sinh học', () => {
  it('enzyme amylase: tối ưu quanh 37 °C, pH 7; CuSO₄ làm chậm', () => {
    const c = ctxOf('ENZYME');
    expect(c.results.Topt).toBe(37);
    expect(c.results.pHopt).toBe(7);
    expect(c.results.tInh).toBeGreaterThan(3 * c.results.tFree);
  });

  it('bỏ nhóm đối chứng hoặc bỏ bước chuẩn bị thì không đạt', () => {
    const leaf = get('LEAF_STARCH');
    // không để cây trong tối: phần bị che vẫn còn tinh bột cũ
    const noDark = runPhys(leaf, leaf.script.filter((a) => !(a.type === 'choose' && a.key === 'dark')));
    expect(leaf.verdict(physCtx(leaf, noDark)).ok).toBe(false);
    const dna = get('DNA_EXTRACT');
    const warm = runPhys(dna, dna.script.map((a) => (a.type === 'choose' && a.key === 'eth' ? {...a, value: 'warm'} : a)));
    expect(dna.verdict(physCtx(dna, warm)).ok).toBe(false);
  });

  it('chưa nhuộm thì không đếm được tế bào đang phân chia', () => {
    const e = get('MITOSIS_SLIDE');
    const st = runPhys(e, [{type: 'measure'}]);
    expect(Number.isNaN(st.rows[0].D)).toBe(true);
  });

  it('kiểu phân bố: đều < 1 < theo nhóm; đa dạng rừng > đồng cỏ > ruộng lúa', () => {
    const q = ctxOf('QUADRAT');
    expect(q.results.vA).toBeLessThan(1);
    expect(q.results.vC).toBeGreaterThan(q.results.vB);
    const m = ctxOf('COMMUNITY');
    expect(m.results.D_forest).toBeGreaterThan(m.results.D_rice);
  });
});

describe('Phòng thực hành Sinh (giao diện)', () => {
  for (const e of BIO_EXPERIMENTS) {
    it(`${e.id}: "Xem thao tác mẫu" hoàn thành mọi bước; kiểm tra kết quả đạt`, () => {
      const r = render(<SimulationWidget blueprint={makePresetBlueprint(`BIO_LAB_${e.id}`)} />);
      expect(r.getByTestId('phys-bench').getAttribute('data-experiment')).toBe(e.id);
      fireEvent.click(r.getByTestId('phys-sample'));
      for (let i = 0; i < e.steps.length; i++) expect(r.getByTestId(`phys-step-${i}`).getAttribute('data-done'), e.steps[i].text).toBe('1');
      fireEvent.click(r.getByTestId('phys-check'));
      expect(r.getByTestId('phys-verdict').getAttribute('data-ok')).toBe('1');
    });
  }

  it('danh sách bài chỉ gồm bài Sinh; đổi bài thì xóa số liệu', () => {
    const r = render(<SimulationWidget blueprint={makePresetBlueprint('BIO_LAB_BENCH')} />);
    const opts = Array.from((r.getByTestId('phys-experiment') as HTMLSelectElement).options).map((o) => o.value);
    expect(opts).toEqual(BIO_EXPERIMENTS.map((e) => e.id));
    fireEvent.click(r.getByTestId('phys-measure'));
    expect(r.getByTestId('phys-table').getAttribute('data-rows')).toBe('1');
    fireEvent.change(r.getByTestId('phys-experiment'), {target: {value: 'ENZYME'}});
    expect(r.getByTestId('phys-table').getAttribute('data-rows')).toBe('0');
  });
});
