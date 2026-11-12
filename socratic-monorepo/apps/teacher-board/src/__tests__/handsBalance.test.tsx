import React from 'react';
import {afterEach, describe, expect, it} from 'vitest';
import {cleanup, fireEvent, render} from '@testing-library/react';
import {ALL_EXPERIMENTS, HandsLab} from '../engines/families/HandsLab';
import {SUBJECT_OF} from '../utils/lab/hands/sims/catalog';

afterEach(cleanup);

describe('bài cân dòng điện trong /lab (không có WebGL vẫn làm được bằng bảng điều khiển)', () => {
  it('có trong danh sách bài và thuộc nhóm Vật lí', () => {
    expect(ALL_EXPERIMENTS.some(([id]) => id === 'balance')).toBe(true);
    expect(SUBJECT_OF.balance).toBe('ly');
  });

  it('thí nghiệm 1: đóng K thấy lực xuống, đảo chiều dòng thấy lực lên thì đạt; kính lúp đổi theo', () => {
    const r = render(<HandsLab experiment="balance" />);
    const lens = () => r.getByTestId('bal-lens-view');
    expect(r.getByTestId('bal-status').getAttribute('data-ok')).toBe('false');
    expect(lens().getAttribute('data-f')).toBe('none');
    fireEvent.click(r.getByTestId('bal-K'));
    expect(lens().getAttribute('data-f')).toBe('down');
    expect(lens().getAttribute('data-i')).toBe('in');
    fireEvent.click(r.getByTestId('bal-revI'));
    expect(lens().getAttribute('data-f')).toBe('up');
    expect(lens().getAttribute('data-i')).toBe('out');
    expect(r.getByTestId('bal-status').getAttribute('data-ok')).toBe('true');
    fireEvent.click(r.getByTestId('bal-revB'));
    expect(lens().getAttribute('data-f')).toBe('down'); // đảo cả hai: lực giữ chiều ban đầu
    expect(lens().getAttribute('data-b')).toBe('left');
  });

  it('thí nghiệm 2: K mở thì không ghi được; ghi 4 giá trị dòng thì đo được B; đặt lại thì xoá sổ', () => {
    const r = render(<HandsLab experiment="balance" />);
    fireEvent.click(r.getByTestId('bal-task-2'));
    fireEvent.click(r.getByTestId('bal-record'));
    expect(r.getByTestId('bal-count').textContent).toContain('0 số đo');
    fireEvent.click(r.getByTestId('bal-K'));
    for (const I of [20, 40, 60, 80]) {
      fireEvent.change(r.getByTestId('bal-I'), {target: {value: String(I)}});
      fireEvent.click(r.getByTestId('bal-record'));
    }
    expect(r.getByTestId('bal-count').textContent).toContain('4 số đo');
    expect(r.getByTestId('bal-status').getAttribute('data-ok')).toBe('true');
    expect(r.getByTestId('bal-status').textContent).toMatch(/B ≈ (19,9|20,0|20,1) mT/);
    // dòng nam châm 2 A, dòng khung 1 A: vượt thang lực kế
    fireEvent.change(r.getByTestId('bal-Im'), {target: {value: '200'}});
    fireEvent.change(r.getByTestId('bal-I'), {target: {value: '100'}});
    expect(r.getByTestId('bal-reading').getAttribute('data-range')).toBe('over');
    fireEvent.click(r.getByTestId('bal-reset'));
    expect(r.getByTestId('bal-count').textContent).toContain('0 số đo');
    expect(r.getByTestId('bal-status').getAttribute('data-ok')).toBe('false');
  });
});
