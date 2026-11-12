import React from 'react';
import {afterEach, describe, expect, it} from 'vitest';
import {cleanup, fireEvent, render} from '@testing-library/react';
import {ALL_EXPERIMENTS, HandsLab} from '../engines/families/HandsLab';
import {BASICS, MANUAL, toolsOf} from '../utils/lab/hands/manual';
import {SIM_BY_ID} from '../utils/lab/hands/sims';

afterEach(cleanup);

describe('tab Hướng dẫn của phòng thực hành', () => {
  it('mọi bài đều có hướng dẫn: mục tiêu, ít nhất 3 bước có việc làm và lời giải thích, kết luận; không có hướng dẫn thừa', () => {
    const ids = ALL_EXPERIMENTS.map(([id]) => id);
    for (const id of ids) {
      const m = MANUAL[id];
      expect(m, id).toBeTruthy();
      expect(m.goal.length, id).toBeGreaterThan(20);
      expect(m.conclude.length, id).toBeGreaterThan(20);
      expect(m.steps.length, id).toBeGreaterThanOrEqual(3);
      for (const s of m.steps) {
        expect(s.do.length, id).toBeGreaterThan(5);
        expect(s.why.length, id).toBeGreaterThan(25);
      }
    }
    expect(Object.keys(MANUAL).filter((k) => !ids.includes(k))).toEqual([]);
  });

  it('mở tab, đi từng bước tới kết luận; quay lại tab Thao tác thì trạng thái thí nghiệm còn nguyên', () => {
    const r = render(<HandsLab experiment="balance" />);
    fireEvent.click(r.getByTestId('bal-K'));
    expect(r.queryByTestId('lab-manual')).toBeNull();
    fireEvent.click(r.getByTestId('lab-panel-guide'));
    expect(r.getByTestId('lab-manual').textContent).toContain('Mục tiêu');
    expect(r.getByTestId('lab-step-0').getAttribute('data-open')).toBe('true');
    expect(r.getByTestId('lab-step-0').textContent).toContain('Giải thích');
    expect(r.getByTestId('lab-step-1').textContent).not.toContain('Giải thích');
    expect(r.queryByTestId('lab-conclude')).toBeNull();
    const n = MANUAL.balance.steps.length;
    for (let i = 1; i < n; i++) fireEvent.click(r.getByTestId('lab-step-next'));
    expect(r.getByTestId(`lab-step-${n - 1}`).getAttribute('data-open')).toBe('true');
    expect(r.getByTestId('lab-conclude').textContent).toContain('Kết luận');
    fireEvent.click(r.getByTestId('lab-panel-do'));
    expect(r.queryByTestId('lab-manual')).toBeNull();
    expect(r.getByTestId('bal-K').getAttribute('aria-pressed')).toBe('true');
  });

  it('bài khác hiện hướng dẫn của chính nó', () => {
    const r = render(<HandsLab experiment="three-phase" />);
    fireEvent.click(r.getByTestId('lab-panel-guide'));
    expect(r.getByTestId('lab-manual').textContent).toContain('aptomat');
  });
  it('bài thao tác trực tiếp có hướng dẫn từng động tác và điều phải thấy; bài mô phỏng nào cũng liệt kê dụng cụ và cách điều khiển', () => {
    // cả 37 bài: mỗi bước có động tác con và điều phải thấy; mỗi bài liệt kê dụng cụ và cách điều khiển
    for (const [id] of ALL_EXPERIMENTS) {
      expect(toolsOf(id).length, id).toBeGreaterThanOrEqual(2);
      for (const s of MANUAL[id].steps) {
        expect(s.how?.length ?? 0, `${id}: ${s.do}`).toBeGreaterThanOrEqual(1);
        for (const h of s.how!) expect(h.length, `${id}: ${h}`).toBeGreaterThan(12);
        expect((s.see ?? '').length, `${id}: ${s.do}`).toBeGreaterThan(10);
      }
    }
    // bài dùng bộ thao tác chung thì danh sách dụng cụ tự sinh phải nhắc đúng tên núm / khay / ổ lắp của bài
    expect(toolsOf('photo').join(' ')).toContain('Điện áp hãm');
    expect(toolsOf('photo').join(' ')).toContain('Tấm catot');
    for (const id of ['collision', 'chlorine', 'alkali', 'no2', 'titration', 'differential', 'turbine', 'stirling', 'balance', 'optics', 'chem', 'bz', 'tweezers', 'three-phase', 'motor', 'engine', 'robot', 'drone', 'pc', 'cartpole']) expect(MANUAL[id].tools!.length, id).toBeGreaterThanOrEqual(2);
    expect(toolsOf('thomson').join(' ')).toContain('Núm xoay');
    expect(toolsOf('photo').join(' ')).toContain('Ổ lắp');
    expect(BASICS.length).toBeGreaterThanOrEqual(5);
  });

  it('tab Hướng dẫn hiện cách dùng tay, dụng cụ trên bàn, các động tác con và mục Quan sát của bước đang mở', () => {
    const r = render(<HandsLab experiment={'titration' as never} />);
    fireEvent.click(r.getByTestId('lab-panel-guide'));
    expect(r.getByTestId('lab-basics').textContent).toContain('chụm');
    expect(r.getByTestId('lab-tools').textContent).toContain('Khóa buret');
    expect(r.getByTestId('lab-step-0').textContent).toContain('Bước 1/');
    expect(r.getByTestId('lab-step-how').querySelectorAll('li').length).toBeGreaterThanOrEqual(2);
    // bài hóa: tính chất / hiện tượng / phản ứng nằm trên chất và dụng cụ trong cảnh, không nằm trong tab Hướng dẫn
    expect(r.getByTestId('lab-in-scene').textContent).toContain('trên chất');
    expect(r.queryByTestId('lab-step-see')).toBeNull();
    expect(r.getByTestId('lab-step-0').textContent).not.toContain('Giải thích');
  });

  it('bài không phải hóa vẫn hiện mục Quan sát và Giải thích trong tab Hướng dẫn', () => {
    const r = render(<HandsLab experiment={'balance' as never} />);
    fireEvent.click(r.getByTestId('lab-panel-guide'));
    expect(r.queryByTestId('lab-in-scene')).toBeNull();
    expect(r.getByTestId('lab-step-see').textContent).toContain('Quan sát');
    expect(r.getByTestId('lab-step-0').textContent).toContain('Giải thích');
  });
});
