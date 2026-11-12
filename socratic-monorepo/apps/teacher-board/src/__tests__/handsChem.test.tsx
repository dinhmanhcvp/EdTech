import React from 'react';
import {afterEach, describe, expect, it} from 'vitest';
import {cleanup, fireEvent, render} from '@testing-library/react';
import {HandsLab} from '../engines/families/HandsLab';
import {CHEM_EXPERIMENTS} from '../utils/lab/chem/experiments';
import {SUBSTANCES} from '../utils/lab/chem/species';
import {CHEM_GROUPS} from '../engines/families/HandsChem3D';

afterEach(cleanup);

describe('bàn hóa học tự do trong phòng thực hành tay', () => {
  it('mọi hóa chất của cơ sở dữ liệu nằm trong một nhóm kệ; có đủ 33 bài thí nghiệm để chọn', () => {
    for (const s of SUBSTANCES) expect(CHEM_GROUPS as readonly string[], s.id).toContain(s.group);
    const r = render(<HandsLab experiment={'chem' as never} />);
    const opts = r.getByTestId('chem3d-experiment').querySelectorAll('option');
    expect(opts.length).toBe(CHEM_EXPERIMENTS.length + 1);
    expect(CHEM_EXPERIMENTS.length).toBeGreaterThanOrEqual(33);
  });

  it('tự do: cho acid vào dung dịch Na₂CO₃ thì sinh khí và có phương trình; kết tủa tạo ra khi trộn AgNO₃ với NaCl', () => {
    const r = render(<HandsLab experiment={'chem' as never} />);
    const pick = (group: string, sub: string, vessel: number) => {
      fireEvent.click(r.getByTestId(`chem3d-group-${group}`));
      fireEvent.change(r.getByTestId('chem3d-sub'), {target: {value: sub}});
      fireEvent.change(r.getByTestId('chem3d-vessel'), {target: {value: String(vessel)}});
      fireEvent.click(r.getByTestId('chem3d-add'));
    };
    pick('Muối', 'na2co3', 0);
    pick('Acid', 'hcl', 0);
    expect(r.getByTestId('chem3d-log').textContent).toMatch(/khí|sủi|CO/i);
    expect(r.getByTestId('chem3d-equations').textContent).toContain('CO');
    pick('Muối', 'agno3', 1);
    pick('Muối', 'nacl', 1);
    expect(r.getByTestId('chem3d-log').textContent).toMatch(/kết tủa|AgCl/i);
  });

  it('an toàn: chưa đeo kính mà dùng chất độc hại thì ghi vi phạm; đeo kính rồi thì không', () => {
    const r = render(<HandsLab experiment={'chem' as never} />);
    fireEvent.click(r.getByTestId('chem3d-group-Base'));
    fireEvent.change(r.getByTestId('chem3d-sub'), {target: {value: 'naoh'}});
    fireEvent.click(r.getByTestId('chem3d-add'));
    expect(r.getByTestId('chem3d-violations').textContent).toContain('kính');
    fireEvent.click(r.getByTestId('chem3d-reset'));
    fireEvent.click(r.getByTestId('chem3d-goggles'));
    fireEvent.click(r.getByTestId('chem3d-add'));
    expect(r.queryByTestId('chem3d-violations')).toBeNull();
  });

  it('chọn từng bài thí nghiệm và xem thao tác mẫu: mọi bước đều đạt', () => {
    for (const e of CHEM_EXPERIMENTS) {
      const r = render(<HandsLab experiment={'chem' as never} />);
      fireEvent.change(r.getByTestId('chem3d-experiment'), {target: {value: e.id}});
      fireEvent.click(r.getByTestId('chem3d-sample'));
      const n = e.steps.length;
      expect(r.getByTestId('chem3d-report').textContent, e.id).toContain(`${n}/${n} bước`);
      cleanup();
    }
  }, 60000);

  it('dẫn khí, đổ bỏ và làm lại hoạt động', () => {
    const r = render(<HandsLab experiment={'chem' as never} />);
    fireEvent.click(r.getByTestId('chem3d-group-Chất rắn'));
    fireEvent.change(r.getByTestId('chem3d-sub'), {target: {value: 'caco3_f'}});
    fireEvent.click(r.getByTestId('chem3d-add'));
    fireEvent.click(r.getByTestId('chem3d-discard'));
    expect(r.getByTestId('chem3d-readout').textContent).toContain('0.0 mL');
    fireEvent.click(r.getByTestId('chem3d-transfer'));
    fireEvent.click(r.getByTestId('chem3d-reset'));
    expect(r.getByTestId('chem3d-log').textContent).toContain('Chưa có thao tác');
  });
});

describe('bàn hóa học trên bảng: giao diện kiểu bảng cảm ứng', () => {
  it('phương trình trực tiếp hiện khi có phản ứng; chạm hóa chất vẫn cho vào ống đang chọn; vùng chạm đủ lớn', async () => {
    const {ChemBench} = await import('../engines/families/ChemBench');
    const r = render(<ChemBench id="CHEM_LAB_BENCH" experiment={null} />);
    expect(r.queryByTestId('chem-live-equation')).toBeNull();
    fireEvent.click(r.getByTestId('chem-sub-na2co3'));
    fireEvent.click(r.getByTestId('chem-sub-hcl'));
    expect(r.getByTestId('chem-live-equation').textContent).toContain('CO');
    expect(r.getByTestId('chem-sub-hcl').className).toContain('min-h-[44px]');
    expect(r.getByTestId('chem-vessel-0').getAttribute('data-liquid')).not.toBe('0.00');
  });
  it('kéo hóa chất thả vào dụng cụ: con trỏ kéo qua một ống rồi thả thì chất được cho vào ống đó', async () => {
    const {ChemBench} = await import('../engines/families/ChemBench');
    const r = render(<ChemBench id="CHEM_LAB_BENCH" experiment={null} />);
    const vessel = r.getByTestId('chem-vessel-2');
    (document as unknown as {elementsFromPoint: () => Element[]}).elementsFromPoint = () => [vessel];
    const chip = r.getByTestId('chem-sub-hcl');
    fireEvent.pointerDown(chip, {clientX: 10, clientY: 10, pointerId: 1});
    fireEvent.pointerMove(chip, {clientX: 120, clientY: 90, pointerId: 1});
    expect(r.getByTestId('chem-drag-ghost').textContent).toContain('Ống 3');
    fireEvent.pointerUp(chip, {clientX: 120, clientY: 90, pointerId: 1});
    expect(Number(r.getByTestId('chem-vessel-2').getAttribute('data-liquid'))).toBeGreaterThan(0);
    expect(Number(r.getByTestId('chem-vessel-0').getAttribute('data-liquid'))).toBe(0);
    expect(r.queryByTestId('chem-drag-ghost')).toBeNull();
    delete (document as unknown as {elementsFromPoint?: unknown}).elementsFromPoint;
  });
});

describe('tính chất hóa học của từng chất (rút từ cơ sở dữ liệu phản ứng)', () => {
  it('mọi chất đều có hồ sơ; acid có phản ứng với muối cacbonat và thẻ chất liệt kê điều kiện, hiện tượng, cặp phản ứng', async () => {
    const {propertiesOf} = await import('../utils/lab/chem/properties');
    for (const s of SUBSTANCES) {
      const p = propertiesOf(s.id);
      expect(p, s.id).toBeTruthy();
      expect(p!.reactions.length, `${s.id} có ít nhất một phản ứng`).toBeGreaterThan(0);
    }
    const hcl = propertiesOf('hcl')!;
    const co3 = hcl.reactions.find((r) => r.id === 'co3-h')!;
    expect(co3.text).toContain('CO₂');
    expect(co3.partners.map((p) => p.id)).toContain('na2co3');
    const nh3 = propertiesOf('nh3')!.reactions.find((r) => r.id === 'nh3-heat')!;
    expect(nh3.conditions.join(' ')).toContain('55');
  });
  it('thẻ chất hiện trong bàn hóa học; chạm "Thử với" cho cả hai chất vào ống và ghi hiện tượng', () => {
    const r = render(<HandsLab experiment={'chem' as never} />);
    expect(r.getByTestId('chem3d-props').textContent).toContain('Tính chất hóa học');
    fireEvent.click(r.getByTestId('chem3d-try-co3-h-na2co3'));
    expect(r.getByTestId('chem3d-log').textContent).toMatch(/sủi bọt khí/);
    expect(r.getByTestId('chem3d-equations').textContent).toContain('CO₂');
    fireEvent.click(r.getByTestId('chem3d-group-Kim loại'));
    fireEvent.change(r.getByTestId('chem3d-sub'), {target: {value: 'zn'}});
    expect(r.getByTestId('chem3d-props').textContent).toContain('Zn');
  });
});

describe('phản ứng bổ sung cho các chất trước đây không có phản ứng', () => {
  it('NaF + CaCl₂ kết tủa CaF₂; CH₃COONa + HCl mùi giấm; MnO₂ + HCl đun nóng ra clo; ethanol làm nhạt màu KMnO₄', async () => {
    const {labReducer, newLab} = await import('../utils/lab/chem/engine');
    const run = (adds: [string, number][], heat = 0, wait = 120) => {
      let s = labReducer(labReducer(newLab(), {type: 'goggles', on: true}), {type: 'add', v: 0, sub: 'water', amount: 2});
      for (const [sub, amount] of adds) s = labReducer(s, {type: 'add', v: 0, sub, amount});
      for (let i = 0; i < heat; i++) s = labReducer(s, {type: 'heat', v: 0});
      return labReducer(s, {type: 'wait', seconds: wait}).vessels[0];
    };
    expect(run([['naf', 2], ['cacl2', 2]]).moles.CaF2).toBeGreaterThan(0);
    expect(run([['ch3coona', 2], ['hcl', 2]]).log.join(' ')).toContain('mùi giấm');
    expect((run([['mno2', 0.5], ['hcl', 5]], 4, 300).moles['Cl2(aq)'] ?? 0)).toBeGreaterThan(0);
    expect(run([['kmno4', 2], ['h2so4', 2], ['ethanol', 1]], 0, 600).moles['MnO4-']).toBeLessThan(0.00004);
  });
});
