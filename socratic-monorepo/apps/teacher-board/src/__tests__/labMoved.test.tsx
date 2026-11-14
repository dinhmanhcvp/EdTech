import React from 'react';
import {describe, it, expect, afterEach} from 'vitest';
import {render, cleanup, fireEvent, waitFor} from '@testing-library/react';
import {SimulationWidget} from '../components/canvas/SimulationWidget';
import LabPage from '../app/lab/page';
import {matchInstantStemBlueprint} from '../components/canvas/SmartboardCanvas';
import {isLabTemplate, makePresetBlueprint, PRESETS} from '../utils/presets';

afterEach(() => {
  cleanup();
  window.history.pushState({}, '', '/');
});

describe('bài thực hành / thí nghiệm chuyển sang /lab', () => {
  it('mọi preset CHEM_LAB_, PHYS_LAB_, BIO_LAB_ thuộc phòng thực hành; preset khái niệm thì không', () => {
    const lab = Object.keys(PRESETS).filter(isLabTemplate);
    expect(lab.length).toBe(Object.keys(PRESETS).filter((id) => /^(CHEM|PHYS|BIO)_LAB_/.test(id)).length + 2);
    expect(lab.length).toBeGreaterThan(80);
    for (const id of ['CHEM_HALOGEN_LAB', 'CHEM_VIRTUAL_TESTTUBE', 'CHEM_EQUILIBRIUM_TITRATION']) expect(isLabTemplate(id), id).toBe(true);
    expect(isLabTemplate('PHYS_RADIOACTIVE_DECAY')).toBe(false);
  });

  it('trên bảng: không dựng giá thí nghiệm, chỉ có thẻ dẫn sang /lab?bai=<mã>', async () => {
    const r = render(<SimulationWidget blueprint={makePresetBlueprint('PHYS_LAB_HOOKE')} />);
    expect((await r.findByTestId('lab-moved-link')).getAttribute('href')).toBe('/lab?bai=PHYS_LAB_HOOKE');
    expect(r.queryByTestId('phys-bench')).toBeNull();
  });

  it('chuẩn độ (template lõi): bảng chỉ có thẻ dẫn, thanh trượt ẩn; /lab mở bài tay đã gộp', async () => {
    const bp = matchInstantStemBlueprint('chuẩn độ HCl bằng NaOH')!;
    const r = render(<SimulationWidget blueprint={bp} />);
    expect((await r.findByTestId('lab-moved-link')).getAttribute('href')).toBe('/lab?bai=CHEM_EQUILIBRIUM_TITRATION');
    expect(r.getByTestId('macro-sliders-container').className).toContain('hidden');
    cleanup();
    window.history.pushState({}, '', '/lab?bai=CHEM_EQUILIBRIUM_TITRATION');
    const lab = render(<LabPage />);
    await waitFor(() => expect(lab.getByTestId('lab-menu').textContent).toContain('Chuẩn độ acid – base'));
  });

  it('/lab?bai=<mã> mở thẳng bài; bảng chọn bài: tab môn, hai nhóm, tìm không dấu, URL theo bài', async () => {
    window.history.pushState({}, '', '/lab?bai=CHEM_LAB_HALIDE_ID');
    const r = render(<LabPage />);
    await waitFor(() => expect((r.getByTestId('chem3d-experiment') as HTMLSelectElement).value).toBe('HALIDE_ID'));
    fireEvent.click(r.getByTestId('lab-menu'));
    expect(r.getByTestId('lab-subject-hoa').getAttribute('aria-selected')).toBe('true');
    expect(r.getByTestId('lab-tab-CHEM_LAB_HALIDE_ID').getAttribute('aria-current')).toBe('true');
    expect(r.getByTestId('lab-group-hands')).toBeTruthy();
    expect(r.getByTestId('lab-group-sgk')).toBeTruthy();
    expect(r.queryByTestId('lab-tab-BIO_LAB_ENZYME')).toBeNull();
    // bài đã gộp không còn trong danh sách
    expect(r.queryByTestId('lab-tab-CHEM_LAB_BENCH')).toBeNull();
    expect(r.queryByTestId('lab-tab-CHEM_EQUILIBRIUM_TITRATION')).toBeNull();
    fireEvent.change(r.getByTestId('lab-search'), {target: {value: 'chuan do'}});
    expect(r.getByTestId('lab-tab-titration')).toBeTruthy();
    expect(r.queryByTestId('lab-tab-CHEM_LAB_HALIDE_ID')).toBeNull();
    fireEvent.change(r.getByTestId('lab-search'), {target: {value: 'zzz'}});
    expect(r.getByTestId('lab-empty')).toBeTruthy();
    fireEvent.change(r.getByTestId('lab-search'), {target: {value: ''}});
    fireEvent.click(r.getByTestId('lab-subject-sinh'));
    fireEvent.click(r.getByTestId('lab-tab-BIO_LAB_ENZYME'));
    expect(r.queryByTestId('lab-picker')).toBeNull();
    expect(window.location.search).toBe('?bai=BIO_LAB_ENZYME');
    expect(r.getByTestId('phys-bench').getAttribute('data-experiment')).toBe('ENZYME');
  });
});
