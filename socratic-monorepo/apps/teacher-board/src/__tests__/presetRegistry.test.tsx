import React from 'react';
import {describe, it, expect, vi, afterEach} from 'vitest';
import {render, cleanup, fireEvent, within, act} from '@testing-library/react';
import {readFileSync} from 'fs';
import {resolve} from 'path';
import {SimulationWidget} from '../components/canvas/SimulationWidget';
import {matchInstantStemBlueprint} from '../components/canvas/SmartboardCanvas';
import {PRESETS, matchPresetId, makePresetBlueprint} from '../utils/presets';
import {toleranceCurve, favourableRange} from '../utils/presets/curve';
import {simulateGlucose} from '../utils/presets/feedback';
import {frameAt} from '../engines/families/ProcessSteps';
import {phaseOf} from '../engines/families/FeedbackSystem';
import {LIVE_CASES} from './liveDemoCases.test';
import type {ProcessData} from '../utils/presets/types';

afterEach(cleanup);

const IDS = Object.keys(PRESETS);
const processData = (): ProcessData => {
  const s = PRESETS.BIO_GENE_ENGINEERING;
  if (s.family !== 'PROCESS_STEPS') throw new Error('sai họ');
  return s.data;
};
const DOC = readFileSync(resolve(__dirname, '../../../../../docs/HUONG_DAN_VIET_DE_TRUC_QUAN.md'), 'utf-8');

describe('khung preset: toàn vẹn dữ liệu', () => {
  it('mã mô phỏng không trùng tên template cũ và đúng tiền tố môn', () => {
    for (const id of IDS) expect(id, id).toMatch(/^(MATH|PHYS|CHEM|BIO)_[A-Z0-9_]+$/);
    expect(new Set(IDS).size).toBe(IDS.length);
  });

  it('mỗi preset có tiêu đề, câu hỏi Socratic, từ khóa và câu mẫu', () => {
    for (const id of IDS) {
      const s = PRESETS[id];
      expect(s.title.length, id).toBeGreaterThan(3);
      expect(s.question.endsWith('?'), id).toBe(true);
      expect(s.examples.length, id).toBeGreaterThan(0);
    }
  });

  it('từ khóa viết không dấu, chữ thường (nếu không sẽ không bao giờ khớp)', () => {
    for (const id of IDS) expect(PRESETS[id].keywords.flags, id).not.toContain('i');
  });

  it('mọi preset đều có mục trong docs/HUONG_DAN_VIET_DE_TRUC_QUAN.md', () => {
    const documented = new Set([...DOC.matchAll(/^###\s+([A-Z0-9_]+)\s+—/gm)].map((m) => m[1]));
    expect(IDS.filter((id) => !documented.has(id))).toEqual([]);
  });
});

describe('khung preset: định tuyến và va chạm từ khóa', () => {
  it('mọi câu mẫu mở đúng preset', () => {
    const bad: string[] = [];
    for (const id of IDS) for (const ex of PRESETS[id].examples) if (matchInstantStemBlueprint(ex)?.templateId !== id) bad.push(`${id} <- ${ex}`);
    expect(bad).toEqual([]);
  });

  it('câu mẫu của một preset không bị preset khác nhận', () => {
    const bad: string[] = [];
    for (const id of IDS) for (const ex of PRESETS[id].examples) if (matchPresetId(ex) !== id) bad.push(`${id} <- ${ex}`);
    expect(bad).toEqual([]);
  });

  it('không cướp câu của template cũ: ca trình diễn và câu mẫu trong hướng dẫn không khớp preset nào', () => {
    const phrases: [string, string][] = LIVE_CASES.map((c) => [c.id, c.input]);
    let cur: string | null = null;
    for (const line of DOC.split(/\r?\n/)) {
      const h = /^###\s+([A-Z0-9_]+)\s+—/.exec(line);
      if (h) cur = h[1];
      else if (cur && /^- \*\*Viết:\*\*/.test(line)) for (const m of line.matchAll(/`([^`]+)`/g)) phrases.push([cur, m[1]]);
    }
    const bad = phrases.filter(([id, text]) => !IDS.includes(id) && matchPresetId(text) !== null).map(([id, t]) => `${id} <- ${t}`);
    expect(bad).toEqual([]);
  });

  it('câu thường, tên riêng và công thức không mở preset', () => {
    for (const s of ['Hà Nội', 'y = x^2', 'tính tiêu thụ điện', 'heartbreak hotel', 'x^2 + y^2 = 9']) expect(matchPresetId(s), s).toBeNull();
  });

  it('gõ không dấu, hoa thường, có \\text{} vẫn mở đúng', () => {
    expect(matchInstantStemBlueprint('GIOI HAN SINH THAI')?.templateId).toBe('BIO_ECOLOGICAL_LIMITS');
    expect(matchInstantStemBlueprint('\\text{hệ tiêu hóa}')?.templateId).toBe('BIO_DIGESTIVE_SYSTEM');
    expect(matchInstantStemBlueprint('chu ky ban ra cua C-14')?.templateId).toBe('PHYS_RADIOACTIVE_DECAY');
  });
});

describe('khung preset: mọi preset dựng được widget', () => {
  for (const id of IDS) {
    it(`${id} dựng đúng, ẩn thanh trượt macro, không lỗi React`, () => {
      const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const {container} = render(<SimulationWidget blueprint={makePresetBlueprint(id)} />);
      expect(container.querySelector(`[data-template-id="${id}"]`)).toBeTruthy();
      expect(container.querySelector(`[data-preset="${id}"]`), 'engine họ đã dựng').toBeTruthy();
      expect(container.querySelector('[data-testid="macro-sliders-container"]')?.className).toContain('hidden');
      const bad = err.mock.calls.filter((a) => /Error|không hợp lệ|Cannot|undefined is not/i.test(String(a[0])) && !/not wrapped in act|ReactDOMTestUtils/.test(String(a[0])));
      err.mockRestore();
      expect(bad).toEqual([]);
    });
  }
});

describe('CURVE_LAB', () => {
  it('toleranceCurve: 0 ở hai điểm gây chết, 1 tại cực thuận, giữa hai bên giảm dần', () => {
    expect(toleranceCurve(10, 10, 30, 42)).toBe(0);
    expect(toleranceCurve(42, 10, 30, 42)).toBe(0);
    expect(toleranceCurve(30, 10, 30, 42)).toBeCloseTo(1, 10);
    expect(toleranceCurve(20, 10, 30, 42)).toBeLessThan(toleranceCurve(25, 10, 30, 42));
    expect(toleranceCurve(38, 10, 30, 42)).toBeLessThan(toleranceCurve(34, 10, 30, 42));
    expect(favourableRange((x) => 100 * toleranceCurve(x, 10, 30, 42), 0, 50, 50)).toBeTruthy();
  });

  it('giới hạn sinh thái: kéo thanh trượt đổi khoảng thuận lợi và chiều rộng giới hạn', () => {
    const {getByTestId} = render(<SimulationWidget blueprint={makePresetBlueprint('BIO_ECOLOGICAL_LIMITS')} />);
    expect(getByTestId('curve-readout-0').textContent).toContain('10–42');
    fireEvent.change(getByTestId('curve-param-tmax'), {target: {value: '48'}});
    expect(getByTestId('curve-readout-0').textContent).toContain('10–48');
    fireEvent.change(getByTestId('curve-param-tmin'), {target: {value: '0'}});
    expect(getByTestId('curve-readout-0').textContent).toContain('rộng 48');
  });

  it('phóng xạ: sau 1T còn 50 %, tuổi mẫu còn 25 % = 2T; đổi T đổi trục thời gian', () => {
    const {getByTestId, container} = render(<SimulationWidget blueprint={makePresetBlueprint('PHYS_RADIOACTIVE_DECAY')} />);
    fireEvent.change(getByTestId('curve-cursor'), {target: {value: String(1 / 6)}}); // t = 1T
    expect(Number(getByTestId('curve-value-left').textContent!.replace(',', '.'))).toBeCloseTo(50, 0);
    expect(getByTestId('curve-readout-1').textContent).toMatch(/11\.460|11\s460|11460/);
    fireEvent.change(getByTestId('curve-param-T'), {target: {value: '1000'}});
    expect(getByTestId('curve-readout-1').textContent).toMatch(/2\.000|2000|2\s000/);
    expect(container.querySelectorAll('[data-testid^="curve-path-"]').length).toBe(2);
  });
});

describe('ANATOMY_FLOW', () => {
  it('chạm bộ phận hiện chú giải đúng enzyme; chạm lại thì bỏ chọn', () => {
    const {getByTestId} = render(<SimulationWidget blueprint={makePresetBlueprint('BIO_DIGESTIVE_SYSTEM')} />);
    expect(getByTestId('anatomy-info').textContent).toContain('Chạm một bộ phận');
    fireEvent.click(getByTestId('anatomy-part-stomach'));
    expect(getByTestId('anatomy-info').textContent).toContain('pepsin');
    fireEvent.click(getByTestId('anatomy-part-small'));
    expect(getByTestId('anatomy-info').textContent).toContain('250–300');
    fireEvent.click(getByTestId('anatomy-part-small'));
    expect(getByTestId('anatomy-flow').getAttribute('data-selected')).toBe('');
  });

  it('đi theo thức ăn: đúng thứ tự miệng → thực quản → dạ dày → … rồi quay vòng', () => {
    const {getByTestId} = render(<SimulationWidget blueprint={makePresetBlueprint('BIO_DIGESTIVE_SYSTEM')} />);
    const seq: string[] = [];
    fireEvent.click(getByTestId('anatomy-tour-start'));
    seq.push(getByTestId('anatomy-flow').getAttribute('data-selected')!);
    for (let i = 0; i < 9; i++) {
      fireEvent.click(getByTestId('anatomy-tour-next'));
      seq.push(getByTestId('anatomy-flow').getAttribute('data-selected')!);
    }
    expect(seq).toEqual(['mouth', 'esophagus', 'stomach', 'liver', 'gallbladder', 'pancreas', 'small', 'large', 'anus', 'mouth']);
  });

  it('mọi bộ phận trong lộ trình tồn tại; hạt chuyển động dùng được và ẩn đường chảy được', () => {
    const d = PRESETS.BIO_DIGESTIVE_SYSTEM.data as {tour: string[]; parts: {id: string}[]};
    const ids = new Set(d.parts.map((p) => p.id));
    expect(d.tour.filter((t) => !ids.has(t))).toEqual([]);
    const {getByTestId, queryAllByTestId} = render(<SimulationWidget blueprint={makePresetBlueprint('BIO_DIGESTIVE_SYSTEM')} />);
    fireEvent.click(getByTestId('anatomy-flow-toggle'));
    expect(queryAllByTestId('anatomy-flow-dot')).toHaveLength(0);
  });
});

describe('PROCESS_STEPS', () => {
  it('frameAt: ẩn trước khung đầu, giữ nguyên trạng thái cho tới khung kế', () => {
    const it = processData().items.find((x) => x.id === 'enzyme')!;
    expect(frameAt(it, 0)).toBeNull();
    expect(frameAt(it, 1)?.o).toBe(1);
    expect(frameAt(it, 2)?.o).toBe(0);
    expect(frameAt(it, 4)?.o).toBe(0);
  });

  it('chạy từng bước: enzyme chỉ hiện ở bước 2, plasmid thành tái tổ hợp rồi vào vi khuẩn', () => {
    const {getByTestId} = render(<SimulationWidget blueprint={makePresetBlueprint('BIO_GENE_ENGINEERING')} />);
    const o = (id: string) => getByTestId(`process-item-${id}`).getAttribute('data-o');
    const label = (id: string) => getByTestId(`process-item-${id}`).getAttribute('data-label');
    expect(o('enzyme')).toBe('0');
    expect(getByTestId('process-prev')).toHaveProperty('disabled', true);
    fireEvent.click(getByTestId('process-next'));
    expect(o('enzyme')).toBe('1');
    expect(label('plasmid')).toBe('plasmid mở');
    fireEvent.click(getByTestId('process-next'));
    expect(label('plasmid')).toBe('tái tổ hợp');
    expect(o('ligase')).toBe('1');
    expect(o('gene')).toBe('0');
    fireEvent.click(getByTestId('process-next'));
    expect(getByTestId('process-item-plasmid').getAttribute('data-x')).toBe('480');
    expect(o('cell')).toBe('1');
    fireEvent.click(getByTestId('process-next'));
    expect(getByTestId('process-next')).toHaveProperty('disabled', true);
    expect(o('prod1')).toBe('1');
    fireEvent.click(getByTestId('process-step-0'));
    expect(getByTestId('process-steps').getAttribute('data-step')).toBe('0');
    expect(o('cell')).toBe('0');
  });

  it('tự chạy tiến từng bước theo thời gian rồi dừng ở bước cuối', () => {
    vi.useFakeTimers();
    try {
      const {getByTestId} = render(<SimulationWidget blueprint={makePresetBlueprint('BIO_GENE_ENGINEERING')} />);
      fireEvent.click(getByTestId('process-play'));
      for (let i = 0; i < 8; i++) act(() => { vi.advanceTimersByTime(2600); });
      expect(getByTestId('process-steps').getAttribute('data-step')).toBe('4');
      expect(getByTestId('process-play').textContent).toContain('Tự chạy');
    } finally {
      vi.useRealTimers();
    }
  });

  it('khung của mọi vật nằm trong viewBox và các bước có nội dung', () => {
    const d = processData();
    const [vw, vh] = d.viewBox;
    for (const it of d.items) for (const f of it.frames) expect(f.x >= 0 && f.x <= vw && f.y >= 0 && f.y <= vh, `${it.id}@${f.at}`).toBe(true);
    for (const s of d.steps) expect(s.body.length).toBeGreaterThan(20);
  });
});

describe('FEEDBACK_SYSTEM', () => {
  const base = {meal: 6, sens: 1};
  it('glucose: bình thường tăng nhẹ sau ăn rồi về điểm đặt; tắt điều hòa ngược thì tăng cao kéo dài', () => {
    const on = simulateGlucose(base, {loop: true});
    const off = simulateGlucose(base, {loop: false});
    expect(on).toHaveLength(241);
    expect(Math.max(...on)).toBeGreaterThan(5.5);
    expect(Math.max(...on)).toBeLessThan(8);
    expect(Math.abs(on[240] - 5)).toBeLessThan(0.3);
    expect(off[240]).toBeGreaterThan(12);
    expect(off[240]).toBeGreaterThan(on[240] + 7);
  });

  it('glucose: ít nhạy insulin → đỉnh cao hơn; ăn nhiều → đỉnh cao hơn; chạy bộ làm tụt dưới ngưỡng rồi glucagon kéo lên', () => {
    const peak = (p: {meal: number; sens: number}) => Math.max(...simulateGlucose(p, {loop: true}));
    expect(peak({meal: 6, sens: 0.2})).toBeGreaterThan(peak({meal: 6, sens: 3}));
    expect(peak({meal: 12, sens: 1})).toBeGreaterThan(peak({meal: 2, sens: 1}));
    const run = simulateGlucose(base, {loop: true, exercise: true});
    expect(Math.min(...run.slice(120, 190))).toBeLessThan(3.9);
    expect(Math.abs(run[240] - 5)).toBeLessThan(0.6);
  });

  it('phaseOf theo khoảng bình thường 3,9–6,4', () => {
    expect(phaseOf(7, [3.9, 6.4])).toBe('high');
    expect(phaseOf(5, [3.9, 6.4])).toBe('ok');
    expect(phaseOf(3, [3.9, 6.4])).toBe('low');
  });

  it('giao diện: tắt điều hòa ngược làm đỉnh và giá trị cuối tăng; con trỏ đổi pha và sơ đồ 4 khối', () => {
    const {getByTestId} = render(<SimulationWidget blueprint={makePresetBlueprint('BIO_FEEDBACK_LOOP')} />);
    const peak = () => Number(getByTestId('feedback-peak').getAttribute('data-value'));
    const fin = () => Number(getByTestId('feedback-final').getAttribute('data-value'));
    const p0 = peak();
    expect(fin()).toBeLessThan(5.5);
    fireEvent.click(getByTestId('feedback-toggle-loop'));
    expect(peak()).toBeGreaterThan(p0 + 5);
    expect(fin()).toBeGreaterThan(12);
    fireEvent.click(getByTestId('feedback-toggle-loop'));
    fireEvent.change(getByTestId('feedback-cursor'), {target: {value: '45'}});
    expect(getByTestId('feedback-system').getAttribute('data-phase')).toBe('high');
    expect(within(getByTestId('feedback-nodes')).getByText(/INSULIN/)).toBeTruthy();
    fireEvent.change(getByTestId('feedback-cursor'), {target: {value: '5'}});
    expect(getByTestId('feedback-system').getAttribute('data-phase')).toBe('ok');
  });
});
