import React from 'react';
import {describe, it, expect, afterEach} from 'vitest';
import {render, cleanup, fireEvent} from '@testing-library/react';
import {PresetEngine} from '../engines/families';
import {makePresetBlueprint, PRESETS} from '../utils/presets';
import {PHYS_EXPERIMENTS} from '../utils/lab/phys/experiments';

afterEach(cleanup);
const mount = (id: string) => render(<PresetEngine lab blueprint={makePresetBlueprint(id)} />);

describe('Phòng thực hành Vật lí ảo (giao diện)', () => {
  it('mỗi bài có preset riêng và có preset phòng thực hành tự do', () => {
    expect(PRESETS.PHYS_LAB_BENCH).toBeTruthy();
    for (const e of PHYS_EXPERIMENTS) expect(PRESETS[`PHYS_LAB_${e.id}`], e.id).toBeTruthy();
  });

  for (const e of PHYS_EXPERIMENTS) {
    it(`${e.id}: "Xem thao tác mẫu" hoàn thành mọi bước; kiểm tra kết quả đạt`, () => {
      const r = mount(`PHYS_LAB_${e.id}`);
      expect(r.getByTestId('phys-bench').getAttribute('data-experiment')).toBe(e.id);
      fireEvent.click(r.getByTestId('phys-sample'));
      for (let i = 0; i < e.steps.length; i++) expect(r.getByTestId(`phys-step-${i}`).getAttribute('data-done'), e.steps[i].text).toBe('1');
      fireEvent.click(r.getByTestId('phys-check'));
      expect(r.getByTestId('phys-verdict').getAttribute('data-ok')).toBe('1');
      expect(r.getByTestId('phys-report').textContent).toContain(`${e.steps.length}/${e.steps.length} bước`);
    });
  }

  it('đo bằng chuột: mỗi lần đo thêm một dòng với số khác nhau; có đồ thị và đường khớp; xóa dòng và xóa hết', () => {
    const r = mount('PHYS_LAB_FREE_FALL_G');
    expect(r.getByTestId('phys-table').getAttribute('data-rows')).toBe('0');
    for (const h of ['0.3', '0.5', '0.7']) {
      fireEvent.change(r.getByTestId('phys-param-h'), {target: {value: h}});
      fireEvent.click(r.getByTestId('phys-measure'));
    }
    expect(r.getByTestId('phys-table').getAttribute('data-rows')).toBe('3');
    expect(r.getByTestId('phys-chart').getAttribute('data-points')).toBe('3');
    fireEvent.click(r.getByTestId('phys-measure'));
    fireEvent.click(r.getByTestId('phys-measure'));
    const ts = Array.from(r.container.querySelectorAll('[data-testid^="phys-row-"]')).map((tr) => tr.children[2].textContent);
    expect(new Set(ts).size).toBeGreaterThan(2);
    expect(Number(r.getByTestId('phys-result-gfit').getAttribute('data-value'))).toBeGreaterThan(9);
    fireEvent.click(r.container.querySelector('[aria-label="Xóa lần đo 1"]')!);
    expect(r.getByTestId('phys-table').getAttribute('data-rows')).toBe('4');
    fireEvent.click(r.getByTestId('phys-clear'));
    expect(r.getByTestId('phys-table').getAttribute('data-rows')).toBe('0');
  });

  it('kết quả chưa đạt khi chưa đo đủ; không lộ nhận xét trước khi bấm kiểm tra', () => {
    const r = mount('PHYS_LAB_EMF_INTERNAL_R');
    expect(r.container.querySelector('[data-testid="phys-verdict"]')).toBeNull();
    fireEvent.click(r.getByTestId('phys-measure'));
    fireEvent.click(r.getByTestId('phys-check'));
    expect(r.getByTestId('phys-verdict').getAttribute('data-ok')).toBe('0');
  });

  it('đổi dụng cụ: thước kẹp cho sai số tỉ đối nhỏ hơn thước thẳng', () => {
    const r = mount('PHYS_LAB_ERROR_MEASURE');
    for (let i = 0; i < 6; i++) fireEvent.click(r.getByTestId('phys-measure'));
    const rel = () => Number(r.getByTestId('phys-result-rel').getAttribute('data-value'));
    const ruler = rel();
    fireEvent.change(r.getByTestId('phys-param-inst'), {target: {value: 'caliper'}});
    for (let i = 0; i < 6; i++) fireEvent.click(r.getByTestId('phys-measure'));
    expect(rel()).toBeLessThan(ruler / 5);
  });

  it('chọn bài khác trong danh sách đổi bài và xóa số liệu; trả lời câu hỏi có phản hồi', () => {
    const r = mount('PHYS_LAB_BENCH');
    fireEvent.change(r.getByTestId('phys-experiment'), {target: {value: 'OHM_LAW'}});
    expect(r.getByTestId('phys-bench').getAttribute('data-experiment')).toBe('OHM_LAW');
    fireEvent.click(r.getByTestId('phys-measure'));
    fireEvent.change(r.getByTestId('phys-experiment'), {target: {value: 'BOYLE'}});
    expect(r.getByTestId('phys-table').getAttribute('data-rows')).toBe('0');
    fireEvent.click(r.getByTestId('phys-q-0-opt-1'));
    expect(r.getByTestId('phys-q-0').getAttribute('data-correct')).toBe('0');
    fireEvent.click(r.getByTestId('phys-q-0-opt-0'));
    expect(r.getByTestId('phys-q-0').getAttribute('data-correct')).toBe('1');
  });

  it('bài an toàn không có nút đo; chọn "đã đọc" hoàn thành bước', () => {
    const r = mount('PHYS_LAB_SAFETY');
    expect(r.container.querySelector('[data-testid="phys-measure"]')).toBeNull();
    fireEvent.change(r.getByTestId('phys-param-r1'), {target: {value: 'yes'}});
    expect(r.getByTestId('phys-step-0').getAttribute('data-done')).toBe('1');
  });
});
