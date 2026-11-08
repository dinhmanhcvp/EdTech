import {describe, it, expect} from 'vitest';
import {PHYS_EXPERIMENTS} from '../utils/lab/phys/experiments';
import {initialPhys, linearFit, mean, meanAbsDev, noisy, physCtx, physReducer, physStepsDone, roundTo, runPhys} from '../utils/lab/phys/engine';

describe('Phòng thực hành Vật lí: công cụ thống kê', () => {
  it('trung bình, sai số tuyệt đối trung bình, làm tròn theo độ chia', () => {
    expect(mean([1, 2, 3])).toBe(2);
    expect(meanAbsDev([9.9, 10.1, 10, 10.2, 9.8])).toBeCloseTo(0.12, 10);
    expect(roundTo(12.347, 0.1)).toBeCloseTo(12.3, 10);
    expect(roundTo(12.347, 0.002)).toBeCloseTo(12.348, 10);
  });

  it('hồi quy: đường thẳng chính xác cho R² = 1; thiếu điểm cho NaN', () => {
    const fit = linearFit([1, 2, 3, 4], [3, 5, 7, 9]);
    expect(fit.slope).toBeCloseTo(2, 10);
    expect(fit.intercept).toBeCloseTo(1, 10);
    expect(fit.r2).toBeCloseTo(1, 10);
    expect(Number.isNaN(linearFit([1], [1]).slope)).toBe(true);
    expect(Number.isNaN(linearFit([2, 2, 2], [1, 2, 3]).slope)).toBe(true);
  });

  it('nhiễu có hạt giống lặp lại được và thay đổi giữa các lần đo', () => {
    const e = PHYS_EXPERIMENTS.find((x) => x.id === 'FREE_FALL_G')!;
    const a = runPhys(e, [{type: 'measure'}, {type: 'measure'}, {type: 'measure'}]);
    const b = runPhys(e, [{type: 'measure'}, {type: 'measure'}, {type: 'measure'}]);
    expect(a.rows).toEqual(b.rows);
    expect(new Set(a.rows.map((r) => r.t)).size).toBeGreaterThan(1);
    expect(noisy(1, 0, 0.01, () => 0.5)).toBeCloseTo(1, 10);
  });
});

describe('Phòng thực hành Vật lí: dữ liệu bài', () => {
  it('mã bài không trùng, có bước, câu hỏi hợp lệ, thao tác mẫu', () => {
    expect(new Set(PHYS_EXPERIMENTS.map((e) => e.id)).size).toBe(PHYS_EXPERIMENTS.length);
    for (const e of PHYS_EXPERIMENTS) {
      expect(e.steps.length, e.id).toBeGreaterThanOrEqual(2);
      expect(e.script.length, e.id).toBeGreaterThan(0);
      for (const q of e.questions) expect(q.answer >= 0 && q.answer < q.options.length, e.id).toBe(true);
      for (const sl of e.sliders) expect(sl.value >= sl.min && sl.value <= sl.max, `${e.id}/${sl.key}`).toBe(true);
    }
  });
});

describe('Phòng thực hành Vật lí: làm theo thao tác mẫu', () => {
  for (const e of PHYS_EXPERIMENTS) {
    it(`${e.id}: hoàn thành mọi bước và kết quả đạt`, () => {
      const st = runPhys(e, e.script);
      const done = physStepsDone(e, st);
      expect(e.steps.filter((_, i) => !done[i]).map((s) => s.text)).toEqual([]);
      expect(e.verdict(physCtx(e, st)).ok, e.verdict(physCtx(e, st)).text).toBe(true);
    });
    it(`${e.id}: chưa đo thì chưa xong bước nào cần số liệu`, () => {
      const st = initialPhys(e);
      const done = physStepsDone(e, st);
      if (e.columns.length) expect(done.some(Boolean)).toBe(false);
    });
  }
});

describe('Phòng thực hành Vật lí: kết quả định lượng', () => {
  const get = (id: string) => PHYS_EXPERIMENTS.find((e) => e.id === id)!;
  it('đo g bằng rơi tự do và con lắc đơn cho ≈ 9,79', () => {
    const r1 = physCtx(get('FREE_FALL_G'), runPhys(get('FREE_FALL_G'), get('FREE_FALL_G').script));
    const r2 = physCtx(get('PENDULUM_G'), runPhys(get('PENDULUM_G'), get('PENDULUM_G').script));
    expect(r1.results.gfit).toBeGreaterThan(9.5);
    expect(r1.results.gfit).toBeLessThan(10.1);
    expect(r2.results.g).toBeGreaterThan(9.4);
    expect(r2.results.g).toBeLessThan(10.2);
  });

  it('pin: E ≈ 1,52 V, r ≈ 0,82 Ω; chỉ đo một điểm thì không có kết quả', () => {
    const e = get('EMF_INTERNAL_R');
    const c = physCtx(e, runPhys(e, e.script));
    expect(c.results.E).toBeCloseTo(1.52, 1);
    expect(c.results.r).toBeGreaterThan(0.6);
    expect(c.results.r).toBeLessThan(1.05);
    const one = physCtx(e, runPhys(e, [{type: 'measure'}]));
    expect(Number.isNaN(one.results.E)).toBe(true);
  });

  it('sai số phép đo: thước kẹp cho sai số tỉ đối nhỏ hơn thước thẳng; ghi kết quả chứa giá trị thật', () => {
    const e = get('ERROR_MEASURE');
    const ruler = physCtx(e, runPhys(e, [{type: 'choose', key: 'inst', value: 'ruler'}, ...Array(6).fill({type: 'measure'})]));
    const cal = physCtx(e, runPhys(e, [{type: 'choose', key: 'inst', value: 'caliper'}, ...Array(6).fill({type: 'measure'})]));
    expect(cal.results.rel).toBeLessThan(ruler.results.rel / 5);
    expect(Math.abs(cal.results.mean - 12.347)).toBeLessThanOrEqual(cal.results.dL);
  });

  it('chọn thang không phù hợp (một chu kì chiếm quá ít ô) cho kết quả kém chính xác', () => {
    const e = get('SOUND_FREQUENCY');
    const good = physCtx(e, runPhys(e, [{type: 'set', key: 'td', value: 0.5}, ...Array(6).fill({type: 'measure'})]));
    const bad = physCtx(e, runPhys(e, [{type: 'set', key: 'td', value: 2}, ...Array(6).fill({type: 'measure'})]));
    expect(Math.abs(bad.results.fmean - 440)).toBeGreaterThan(Math.abs(good.results.fmean - 440));
    expect(Math.abs(good.results.fmean - 440)).toBeLessThan(8);
  });

  it('va chạm: động lượng bảo toàn; mềm mất nhiều động năng hơn đàn hồi', () => {
    const e = get('COLLISION_MOMENTUM');
    const c = physCtx(e, runPhys(e, e.script));
    expect(c.results.dpmean).toBeLessThan(6);
    expect(c.results.lossEl).toBeLessThan(5);
    expect(c.results.lossSoft).toBeGreaterThan(20);
  });

  it('tối đa 40 lần đo; xóa dòng và xóa hết hoạt động', () => {
    const e = get('SPEED');
    let st = runPhys(e, Array(50).fill({type: 'measure'}));
    expect(st.rows.length).toBe(40);
    st = physReducer(e, st, {type: 'delete', i: 0});
    expect(st.rows.length).toBe(39);
    st = physReducer(e, st, {type: 'clear'});
    expect(st.rows).toEqual([]);
    expect(runPhys(get('SAFETY'), [{type: 'measure'}]).rows).toEqual([]);
  });
});
