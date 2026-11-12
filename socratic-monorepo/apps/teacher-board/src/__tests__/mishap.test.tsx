import React from 'react';
import {afterEach, describe, expect, it} from 'vitest';
import {cleanup, fireEvent, render} from '@testing-library/react';
import {HandsLab} from '../engines/families/HandsLab';
import {MISHAPS, chemMishapOf, mishapOf, spillOf} from '../utils/lab/hands/mishap';
import {SIMS} from '../utils/lab/hands/sims';
import {initial} from '../utils/lab/hands/sims/types';
import {labReducer, newLab} from '../utils/lab/chem/engine';

afterEach(cleanup);

describe('hậu quả thao tác sai: danh mục và phát hiện', () => {
  it('mỗi sự cố có đủ lời giải thích (chuyện gì xảy ra, ngoài đời, cách tránh) và loại hiệu ứng hợp lệ', () => {
    for (const m of Object.values(MISHAPS)) {
      expect(m.title.length, m.id).toBeGreaterThan(8);
      expect(m.what.length, m.id).toBeGreaterThan(40);
      expect(m.real.length, m.id).toBeGreaterThan(40);
      expect(m.avoid.length, m.id).toBeGreaterThan(40);
      expect(['short', 'fire', 'explosion', 'acid', 'scald', 'shock', 'break', 'burn']).toContain(m.kind);
    }
  });

  it('trạng thái ban đầu và lời giải mẫu của mọi bài KHÔNG gây sự cố (làm đúng thì an toàn)', () => {
    for (const s of SIMS) {
      expect(mishapOf(s.id, initial(s)), `${s.id} ban đầu`).toBeNull();
      expect(mishapOf(s.id, s.solution), `${s.id} lời giải mẫu`).toBeNull();
    }
  });

  it('thao tác sai thì gây đúng sự cố: trượt răng, gãy mỏi, cuộn dây quá tải; máy có công tắc (tuabin, nghịch lưu) không tự gây sự cố khi tắt', () => {
    expect(mishapOf('turbine', {throttle: 100, far: 35})).toBeNull(); // sự cố tới từ cảnh khi máy đang chạy
    expect(mishapOf('foc', {rpm: 12000, iq: 40, id: 0})).toBeNull();
    expect(mishapOf('harmonic', {zf: 200, rpm: 3000, load: 140})).toBe('gear-shear');
    expect(mishapOf('fatigue', {ds: 300, a0: 5, alloy: 1})).toBe('fatigue-fracture');
    expect(mishapOf('thomson', {U: 200, I: 1.9, Ua: 3000})).toBe('coil-burn');
    expect(mishapOf('bz', {f: 1, eps: 0.04})).toBeNull(); // bài không có sự cố theo tham số
  });

  it('mọi vi phạm an toàn của bàn hóa có hậu quả tương ứng; câu lạ thì không', () => {
    expect(chemMishapOf('Rót nước vào acid đặc: phải rót acid vào nước')).toBe('acid-into-water');
    expect(chemMishapOf('Dùng quá nhiều natri: chỉ lấy mẩu bằng hạt đậu')).toBe('sodium-excess');
    expect(chemMishapOf('Đun trực tiếp chất dễ cháy trong Ống 1')).toBe('flammable-heat');
    expect(chemMishapOf('Làm đầy tràn Ống 2')).toBe('overflow');
    expect(chemMishapOf('Chưa đeo kính bảo hộ khi dùng HCl')).toBe('no-goggles');
    expect(chemMishapOf('một câu bất kì')).toBeNull();
    // mọi id trả về đều có trong danh mục; các loại đổ ra bàn cũng vậy
    for (const id of ['acid-into-water', 'sodium-excess', 'flammable-heat', 'overflow', 'no-goggles', spillOf('acid'), spillOf('base'), spillOf('hot'), spillOf('other')]) expect(MISHAPS[id], id).toBeTruthy();
  });

  it('động cơ hóa thật sự sinh ra vi phạm mà danh mục xử lí: rót nước vào acid đặc, thiếu kính bảo hộ', () => {
    let lab = labReducer(newLab(), {type: 'add', v: 0, sub: 'h2so4_conc', amount: 1});
    lab = labReducer(lab, {type: 'add', v: 0, sub: 'water', amount: 5});
    expect(lab.violations.map(chemMishapOf)).toContain('acid-into-water');
    expect(lab.violations.map(chemMishapOf)).toContain('no-goggles'); // acid đặc là chất nguy hiểm mà chưa đeo kính
    for (const text of lab.violations) expect(chemMishapOf(text), text).not.toBeNull(); // không có vi phạm nào bị bỏ sót
  });
});

describe('thẻ sự cố trong giao diện', () => {
  it('bộ truyền quá tải: thẻ hiện ngay với ba phần giải thích; "Đã hiểu" đóng; làm lại thì về giá trị ban đầu', () => {
    const r = render(<HandsLab experiment={'harmonic' as never} />);
    expect(r.queryByTestId('incident')).toBeNull();
    fireEvent.change(r.getByTestId('sim-load'), {target: {value: '1000'}});
    const card = r.getByTestId('incident');
    expect(card.getAttribute('data-id')).toBe('gear-shear');
    expect(card.getAttribute('data-level')).toBe('danger');
    expect(r.getByTestId('incident-what').textContent).toContain('Mô-men');
    expect(r.getByTestId('incident-real').textContent).toContain('robot');
    expect(r.getByTestId('incident-avoid').textContent.length).toBeGreaterThan(40);
    fireEvent.click(r.getByTestId('incident-ok'));
    expect(r.queryByTestId('incident')).toBeNull();
    // đưa về an toàn rồi làm sai lần nữa thì thẻ hiện lại
    fireEvent.change(r.getByTestId('sim-load'), {target: {value: '200'}});
    fireEvent.change(r.getByTestId('sim-load'), {target: {value: '1000'}});
    expect(r.getByTestId('incident').getAttribute('data-id')).toBe('gear-shear');
    fireEvent.click(r.getByTestId('incident-reset'));
    expect(r.queryByTestId('incident')).toBeNull();
    expect(r.getByTestId('sim-status').getAttribute('data-ok')).toBe('false');
  });

  it('đấu động cơ 3 pha: nối hai pha vào nhau thì chập mạch; đấu đúng thì không có thẻ', () => {
    const r = render(<HandsLab experiment={'three-phase' as never} />);
    fireEvent.click(r.getByTestId('hands-sample-star'));
    fireEvent.click(r.getByTestId('hands-breaker'));
    expect(r.queryByTestId('incident')).toBeNull();
    fireEvent.click(r.getByTestId('hands-breaker')); // cắt điện
    fireEvent.click(r.getByTestId('hands-sample-short'));
    fireEvent.click(r.getByTestId('hands-breaker'));
    expect(r.getByTestId('incident').getAttribute('data-id')).toBe('electric-short');
    expect(r.getByTestId('incident-real').textContent).toContain('cháy');
    fireEvent.click(r.getByTestId('incident-ok'));
    expect(r.queryByTestId('incident')).toBeNull();
  });
});
