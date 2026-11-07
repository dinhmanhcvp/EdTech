import React from 'react';
import {describe, it, expect, afterEach} from 'vitest';
import {render, cleanup, fireEvent} from '@testing-library/react';
import {SimulationWidget} from '../components/canvas/SimulationWidget';
import {makePresetBlueprint, PRESETS} from '../utils/presets';
import {CHEM_EXPERIMENTS} from '../utils/lab/chem/experiments';

afterEach(cleanup);
const mount = (id: string) => render(<SimulationWidget blueprint={makePresetBlueprint(id)} />);

describe('Giá thí nghiệm Hóa ảo (giao diện)', () => {
  it('mỗi bài thí nghiệm có preset riêng và một preset phòng thí nghiệm tự do', () => {
    expect(PRESETS.CHEM_LAB_BENCH).toBeTruthy();
    for (const e of CHEM_EXPERIMENTS) expect(PRESETS[`CHEM_LAB_${e.id}`], e.id).toBeTruthy();
  });

  for (const e of CHEM_EXPERIMENTS) {
    it(`${e.id}: "Xem thao tác mẫu" hoàn thành mọi bước và báo cáo cập nhật`, () => {
      const r = mount(`CHEM_LAB_${e.id}`);
      expect(r.getByTestId('chem-bench').getAttribute('data-experiment')).toBe(e.id);
      for (let i = 0; i < e.steps.length; i++) expect(r.getByTestId(`chem-step-${i}`).getAttribute('data-done')).toBe('0');
      fireEvent.click(r.getByTestId('chem-sample'));
      for (let i = 0; i < e.steps.length; i++) expect(r.getByTestId(`chem-step-${i}`).getAttribute('data-done'), e.steps[i].text).toBe('1');
      expect(r.getByTestId('chem-report').textContent).toContain(`${e.steps.length}/${e.steps.length} bước`);
    });
  }

  it('thao tác bằng chuột: trung hòa HCl và NaOH làm cốc nóng lên; nhật kí ghi lại; làm lại xóa sạch', () => {
    const r = mount('CHEM_LAB_NEUTRAL_TEMP');
    fireEvent.click(r.getByTestId('chem-goggles'));
    fireEvent.click(r.getByTestId('chem-vessel-4'));
    fireEvent.change(r.getByTestId('chem-amount-hcl'), {target: {value: '10'}});
    fireEvent.click(r.getByTestId('chem-sub-hcl'));
    const t0 = Number(r.getByTestId('chem-vessel-4').getAttribute('data-temp'));
    fireEvent.change(r.getByTestId('chem-amount-naoh'), {target: {value: '10'}});
    fireEvent.click(r.getByTestId('chem-sub-naoh'));
    expect(Number(r.getByTestId('chem-vessel-4').getAttribute('data-temp'))).toBeGreaterThan(t0 + 2.5);
    expect(r.getByTestId('chem-log').textContent).toContain('HCl 0,5 M');
    expect(r.getByTestId('chem-equations').textContent).toContain('H⁺ + OH⁻ → H₂O');
    expect(r.getByTestId('chem-step-2').getAttribute('data-done')).toBe('1');
    fireEvent.click(r.getByTestId('chem-reset'));
    expect(r.getByTestId('chem-vessel-4').getAttribute('data-liquid')).toBe('0.00');
  });

  it('an toàn: chọn chất ăn da khi chưa đeo kính ghi vi phạm; đeo kính thì không', () => {
    const r = mount('CHEM_LAB_BENCH');
    fireEvent.click(r.getByTestId('chem-sub-naoh'));
    expect(r.getByTestId('chem-violations').textContent).toContain('kính bảo hộ');
    fireEvent.click(r.getByTestId('chem-reset'));
    fireEvent.click(r.getByTestId('chem-goggles'));
    fireEvent.click(r.getByTestId('chem-sub-naoh'));
    expect(r.container.querySelector('[data-testid="chem-violations"]')).toBeNull();
  });

  it('kết tủa hiện đúng màu: AgNO₃ vào NaCl; đèn thử dẫn điện sáng với dung dịch muối', () => {
    const r = mount('CHEM_LAB_BENCH');
    fireEvent.click(r.getByTestId('chem-sub-nacl'));
    expect(Number(r.getByTestId('chem-lamp').getAttribute('data-level'))).toBeGreaterThan(0.1);
    fireEvent.click(r.getByTestId('chem-sub-agno3'));
    expect(r.getByTestId('chem-vessel-0').getAttribute('data-precip')).toContain('AgCl');
    expect(r.getByTestId('chem-log').textContent).toContain('kết tủa trắng AgCl');
  });

  it('chọn bài khác trong danh sách đổi bài và xóa thao tác; đun nóng, chiếu sáng, dẫn khí hoạt động', () => {
    const r = mount('CHEM_LAB_BENCH');
    fireEvent.change(r.getByTestId('chem-experiment'), {target: {value: 'CARBONATE_ACID'}});
    expect(r.getByTestId('chem-bench').getAttribute('data-experiment')).toBe('CARBONATE_ACID');
    fireEvent.change(r.getByTestId('chem-amount-na2co3'), {target: {value: '2'}});
    fireEvent.click(r.getByTestId('chem-sub-na2co3'));
    fireEvent.click(r.getByTestId('chem-sub-hcl'));
    expect(Number(r.getByTestId('chem-vessel-0').getAttribute('data-bubbles'))).toBeGreaterThan(0);
    fireEvent.click(r.getByTestId('chem-vessel-1'));
    fireEvent.click(r.getByTestId('chem-sub-limewater'));
    fireEvent.click(r.getByTestId('chem-vessel-0'));
    fireEvent.change(r.getByTestId('chem-gas-to'), {target: {value: '1'}});
    fireEvent.click(r.getByTestId('chem-transfer'));
    expect(r.getByTestId('chem-vessel-1').getAttribute('data-precip')).toContain('CaCO3');
    fireEvent.click(r.getByTestId('chem-heat'));
    expect(Number(r.getByTestId('chem-vessel-0').getAttribute('data-temp'))).toBeGreaterThan(30);
    fireEvent.click(r.getByTestId('chem-light'));
    expect(r.getByTestId('chem-light').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(r.getByTestId('chem-wait-30'));
    fireEvent.click(r.getByTestId('chem-discard'));
    expect(r.getByTestId('chem-vessel-0').getAttribute('data-liquid')).toBe('0.00');
  });

  it('trả lời câu hỏi sau thí nghiệm: đúng và sai đều có phản hồi', () => {
    const r = mount('CHEM_LAB_HALIDE_ID');
    fireEvent.click(r.getByTestId('chem-q-0-opt-1'));
    expect(r.getByTestId('chem-q-0').getAttribute('data-correct')).toBe('0');
    fireEvent.click(r.getByTestId('chem-q-0-opt-0'));
    expect(r.getByTestId('chem-q-0').getAttribute('data-correct')).toBe('1');
    expect(r.getByTestId('chem-report').textContent).toContain('1/2 câu đúng');
  });
});
