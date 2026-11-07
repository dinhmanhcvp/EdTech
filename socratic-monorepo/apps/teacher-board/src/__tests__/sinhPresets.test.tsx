import React from 'react';
import {describe, it, expect, afterEach} from 'vitest';
import {render, cleanup, fireEvent} from '@testing-library/react';
import {SimulationWidget} from '../components/canvas/SimulationWidget';
import {PRESETS, makePresetBlueprint} from '../utils/presets';
import {antibody, bump, membranePotential, REST_MV, THRESHOLD_MV} from '../utils/presets/sinhCurve';
import {simulateOsmolality, simulatePressure} from '../utils/presets/sinhFeedback';
import {toleranceCurve} from '../utils/presets/curve';
import {frameAt} from '../engines/families/ProcessSteps';

afterEach(cleanup);

const byFamily = (f: string) => Object.entries(PRESETS).filter(([, s]) => s.family === f);

describe('preset giải phẫu (mọi preset)', () => {
  for (const [id, s] of byFamily('ANATOMY_FLOW')) {
    it(`${id}: id bộ phận duy nhất, lộ trình hợp lệ, nhãn nằm trong khung hình, có chú giải`, () => {
      if (s.family !== 'ANATOMY_FLOW') throw new Error();
      const d = s.data;
      const ids = d.parts.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect((d.tour ?? []).filter((t) => !ids.includes(t))).toEqual([]);
      for (const p of d.parts) {
        expect(p.labelAt[0] >= 0 && p.labelAt[0] <= d.viewBox[0] && p.labelAt[1] >= 0 && p.labelAt[1] <= d.viewBox[1], `${id}/${p.id} labelAt`).toBe(true);
        expect(p.title.length, `${id}/${p.id}`).toBeGreaterThan(2);
        expect(p.body.length, `${id}/${p.id}`).toBeGreaterThan(20);
        expect(p.d.length).toBeGreaterThan(5);
      }
      if (d.tour) expect(new Set(d.tour).size).toBe(d.tour.length);
    });
  }

  it('lộ trình của tim đi đúng thứ tự máu chảy: tĩnh mạch chủ → nhĩ phải → thất phải → phổi → nhĩ trái → thất trái → động mạch chủ', () => {
    const s = PRESETS.BIO_HEART_CIRCULATION;
    if (s.family !== 'ANATOMY_FLOW') throw new Error();
    expect(s.data.tour!.filter((t) => !t.startsWith('valve'))).toEqual(['vc', 'ra', 'rv', 'pa', 'lung', 'pv', 'la', 'lv', 'aorta', 'body']);
  });

  it('chạm bộ phận hiện đúng nội dung chính', () => {
    const cases: [string, string, string][] = [
      ['BIO_EUKARYOTE_CELL', 'mito', 'ATP'],
      ['BIO_HEART_CIRCULATION', 'lv', 'động mạch chủ'],
      ['BIO_NEPHRON', 'tubule', 'glucose'],
      ['BIO_FLOWER_STRUCTURE', 'ovule', 'thụ tinh kép'.replace('thụ tinh kép', 'nội nhũ')],
    ];
    for (const [id, part, word] of cases) {
      const {getByTestId, unmount} = render(<SimulationWidget blueprint={makePresetBlueprint(id)} />);
      fireEvent.click(getByTestId(`anatomy-part-${part}`));
      expect(getByTestId('anatomy-info').textContent, `${id}/${part}`).toContain(word);
      unmount();
    }
  });
});

describe('preset quy trình (mọi preset)', () => {
  for (const [id, s] of byFamily('PROCESS_STEPS')) {
    it(`${id}: vật có id duy nhất, mọi khung nằm trong viewBox, mỗi bước có nội dung, vật hiện đúng lúc`, () => {
      if (s.family !== 'PROCESS_STEPS') throw new Error();
      const d = s.data;
      const ids = d.items.map((i) => i.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const it of d.items) {
        const ats = it.frames.map((f) => f.at);
        expect([...ats].sort((a, b) => a - b), `${id}/${it.id} khung theo thứ tự bước`).toEqual(ats);
        for (const f of it.frames) {
          expect(f.at >= 0 && f.at < d.steps.length, `${id}/${it.id}@${f.at} bước hợp lệ`).toBe(true);
          expect(f.x >= 0 && f.x <= d.viewBox[0] && f.y >= 0 && f.y <= d.viewBox[1], `${id}/${it.id}@${f.at} trong khung`).toBe(true);
        }
      }
      d.steps.forEach((st, i) => {
        expect(st.body.length).toBeGreaterThan(20);
        expect(d.items.some((it) => frameAt(it, i)?.o), `bước ${i} có vật hiển thị`).toBe(true);
      });
    });
  }

  it('nguyên phân: bước 0 mỗi NST là 1 chromatid, từ bước 1 thành 2; kì sau tách về hai cực; kì cuối hai tế bào con', () => {
    const s = PRESETS.BIO_MITOSIS;
    if (s.family !== 'PROCESS_STEPS') throw new Error();
    const visible = (step: number, pat: RegExp) => s.data.items.filter((i) => pat.test(i.id) && frameAt(i, step)?.o).length;
    expect(visible(0, /^c\d[ab]$/)).toBe(2);
    expect(visible(1, /^c\d[ab]$/)).toBe(4);
    const x = (id: string, step: number) => frameAt(s.data.items.find((i) => i.id === id)!, step)!.x;
    expect(Math.abs(x('c1a', 3) - x('c1b', 3))).toBeLessThan(20); // kì giữa: cạnh nhau
    expect(x('c1a', 4)).toBeLessThan(x('c1b', 4) - 150); // kì sau: về hai cực
    expect(visible(5, /^cell[LR]$/)).toBe(2);
    expect(visible(5, /^cell$/)).toBe(0);
  });

  it('chạc sao chép: đoạn Okazaki xuất hiện rồi được nối liền; kết quả có hai DNA con', () => {
    const s = PRESETS.BIO_DNA_FORK;
    if (s.family !== 'PROCESS_STEPS') throw new Error();
    const on = (id: string, step: number) => !!frameAt(s.data.items.find((i) => i.id === id)!, step)?.o;
    expect([on('o1', 3), on('o2', 3), on('o3', 3)]).toEqual([true, false, false]);
    expect([on('o1', 4), on('o2', 4), on('o3', 4)]).toEqual([true, true, true]);
    expect([on('o1', 5), on('n2', 5)]).toEqual([false, true]);
    expect([on('res1', 6), on('res2', 6), on('res1', 5)]).toEqual([true, true, false]);
  });

  it('virus: DNA virus vào tế bào ở bước xâm nhập; virus mới chỉ có sau lắp ráp và ra khỏi tế bào ở bước cuối', () => {
    const s = PRESETS.BIO_VIRUS_CYCLE;
    if (s.family !== 'PROCESS_STEPS') throw new Error();
    const it = (id: string) => s.data.items.find((i) => i.id === id)!;
    expect(frameAt(it('dna1'), 0)?.o).toBe(0);
    expect(frameAt(it('dna1'), 1)?.y).toBeGreaterThan(110);
    expect(frameAt(it('n1'), 2)).toBeNull();
    const cell = it('cell');
    const inside = (x: number, y: number) => x >= 290 && x <= 560 && y >= 110 && y <= 260;
    expect(inside(frameAt(it('n1'), 3)!.x, frameAt(it('n1'), 3)!.y)).toBe(true);
    expect(inside(frameAt(it('n1'), 4)!.x, frameAt(it('n1'), 4)!.y)).toBe(false);
    expect(frameAt(cell, 4)!.o).toBeLessThan(0.5);
  });
});

describe('mô hình đồ thị sinh học', () => {
  it('điện thế hoạt động: dưới ngưỡng không có xung; trên ngưỡng đỉnh ≈ +30 mV, quá phân cực dưới −70 rồi về nghỉ; xung cùng biên độ', () => {
    const grid = Array.from({length: 800}, (_, i) => i / 100);
    const peak = (stim: number) => Math.max(...grid.map((t) => membranePotential(t, stim)));
    const min = (stim: number) => Math.min(...grid.map((t) => membranePotential(t, stim)));
    expect(peak(10)).toBeLessThan(THRESHOLD_MV);
    expect(peak(14)).toBeLessThan(THRESHOLD_MV);
    expect(peak(15)).toBeGreaterThan(25);
    expect(peak(15)).toBeCloseTo(peak(40), 5);
    expect(peak(25)).toBeGreaterThan(28);
    expect(peak(25)).toBeLessThan(35);
    expect(min(25)).toBeLessThan(REST_MV - 5);
    expect(Math.abs(membranePotential(0, 25) - REST_MV)).toBeLessThan(1e-9);
    expect(Math.abs(membranePotential(8, 25) - REST_MV)).toBeLessThan(6);
  });

  it('kháng thể: thứ phát đến sớm hơn và cao hơn nguyên phát', () => {
    const grid = Array.from({length: 900}, (_, i) => i / 10);
    const t = (f: (d: number) => number, from: number, to: number, level: number) => grid.find((d) => d >= from && d <= to && f(d) >= level)!;
    const first = (d: number) => antibody(d, 35, 5).first;
    const second = (d: number) => antibody(d, 35, 5).total - antibody(d, 35, 5).first;
    const lag1 = t(first, 0, 35, 0.05);
    const lag2 = t(second, 35, 90, 0.05) - 35;
    expect(lag1).toBeGreaterThan(7);
    expect(lag1).toBeLessThan(11);
    expect(lag2).toBeLessThan(lag1);
    expect(lag2).toBeGreaterThanOrEqual(2);
    expect(Math.max(...grid.map((d) => antibody(d, 35, 5).total))).toBeGreaterThan(4 * Math.max(...grid.map(first)));
    expect(bump(-3, 4)).toBe(0);
    expect(bump(4, 4)).toBeCloseTo(1, 10);
  });

  it('tăng trưởng quần thể: chữ S bị chặn bởi K, đi qua K/2 tại điểm uốn; chữ J vượt K', () => {
    const r = 0.4, K = 500, N0 = 10;
    const S = (x: number) => K / (1 + ((K - N0) / N0) * Math.exp(-r * x));
    const tInflect = Math.log((K - N0) / N0) / r;
    expect(S(tInflect)).toBeCloseTo(K / 2, 6);
    expect(S(40)).toBeLessThan(K);
    expect(N0 * Math.exp(r * 40)).toBeGreaterThan(K);
    expect(S(tInflect + 1) - S(tInflect)).toBeGreaterThan(S(tInflect + 6) - S(tInflect + 5)); // tốc độ lớn nhất quanh điểm uốn
  });

  it('enzyme: tối ưu tại nhiệt độ tối ưu; sau nhiệt độ biến tính về 0', () => {
    const f = (x: number) => toleranceCurve(x, 0, 37, 55);
    expect(f(37)).toBeCloseTo(1, 10);
    expect(f(30)).toBeLessThan(f(37));
    expect(f(50)).toBeLessThan(f(40));
    expect(f(55)).toBe(0);
    expect(f(70)).toBe(0);
  });

  it('điểm bù/bão hòa: đọc từ bảng khớp công thức (C₄ bù thấp hơn C₃ cùng hô hấp)', () => {
    const {getByTestId, unmount} = render(<SimulationWidget blueprint={makePresetBlueprint('BIO_LIGHT_COMPENSATION')} />);
    const num = (t: string) => Number(t.replace(',', '.').replace(/[^\d.]/g, ''));
    const c3 = num(getByTestId('curve-readout-0').textContent!);
    const c4 = num(getByTestId('curve-readout-1').textContent!);
    expect(c3).toBeCloseTo(-25 * Math.log(1 - 3 / 20), 0);
    expect(c4).toBeLessThan(c3);
    fireEvent.change(getByTestId('curve-param-rd'), {target: {value: '0'}});
    expect(num(getByTestId('curve-readout-0').textContent!)).toBe(0);
    unmount();
  });
});

describe('hệ điều hòa ngược mới', () => {
  it('ADH: mất nước → tăng rồi về 300; không có điều hòa ngược → cao kéo dài; rượu bia làm đỉnh cao hơn; uống quá nhiều nước → giảm', () => {
    const base = {loss: 30};
    const on = simulateOsmolality(base, {loop: true});
    const off = simulateOsmolality(base, {loop: false});
    const alc = simulateOsmolality(base, {loop: true, alcohol: true});
    expect(on).toHaveLength(241);
    expect(Math.max(...on)).toBeGreaterThan(305);
    expect(Math.abs(on[240] - 300)).toBeLessThan(2);
    expect(off[240]).toBeGreaterThan(310);
    expect(Math.max(...alc)).toBeGreaterThan(Math.max(...on) + 3);
    expect(Math.min(...simulateOsmolality({loss: -30}, {loop: true}))).toBeLessThan(295);
    expect(Math.min(...simulateOsmolality({loss: -30}, {loop: false}))).toBeLessThan(Math.min(...simulateOsmolality({loss: -30}, {loop: true})));
  });

  it('huyết áp: mất máu → giảm rồi hồi phục nhờ phản xạ; tắt phản xạ hoặc đáp ứng yếu → thấp hơn và lâu hơn; căng thẳng → tăng', () => {
    const p = {shock: -40};
    const on = simulatePressure(p, {loop: true});
    const weak = simulatePressure(p, {loop: true, weak: true});
    const off = simulatePressure(p, {loop: false});
    expect(Math.min(...on)).toBeLessThan(110);
    expect(Math.min(...on)).toBeGreaterThan(Math.min(...weak));
    expect(Math.min(...weak)).toBeGreaterThan(Math.min(...off));
    expect(Math.abs(on[240] - 115)).toBeLessThan(1);
    expect(off[240]).toBeLessThan(100);
    expect(Math.max(...simulatePressure({shock: 40}, {loop: true}))).toBeLessThan(Math.max(...simulatePressure({shock: 40}, {loop: false})));
  });

  it('giao diện ADH: tắt điều hòa ngược làm giá trị cuối cao hơn', () => {
    const {getByTestId} = render(<SimulationWidget blueprint={makePresetBlueprint('BIO_OSMOREGULATION_ADH')} />);
    const fin = () => Number(getByTestId('feedback-final').getAttribute('data-value'));
    const f0 = fin();
    fireEvent.click(getByTestId('feedback-toggle-loop'));
    expect(fin()).toBeGreaterThan(f0 + 5);
  });
});
