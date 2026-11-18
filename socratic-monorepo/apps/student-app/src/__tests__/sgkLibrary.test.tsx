import React from 'react';
import {describe, expect, it} from 'vitest';
import {fireEvent, render, screen, within} from '@testing-library/react';
import {SGK_ITEMS} from '../data/sgkCatalog';
import {SgkLibrary, itemHref} from '../components/sgk/SgkLibrary';

describe('danh mục học liệu theo SGK', () => {
  it('mỗi môn đủ ba lớp, mỗi dòng có tên bài SGK và câu hỏi, không trùng (mã, lớp)', () => {
    for (const s of ['toan', 'ly', 'hoa', 'sinh']) for (const g of [10, 11, 12]) expect(SGK_ITEMS.some((i) => i.subject === s && i.grade === g)).toBe(true);
    const keys = SGK_ITEMS.map((i) => `${i.id}@${i.grade}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const i of SGK_ITEMS) {
      expect(i.lesson).toMatch(/^(Bài|Hoạt động trải nghiệm)/);
      expect(i.question.length).toBeGreaterThan(20);
    }
  });

  it('bài thực hành mở ở /lab, mô phỏng mở ở /xem; chưa có địa chỉ bảng thì không mở', () => {
    expect(itemHref({id: 'PHYS_LAB_BOYLE', lab: true}, 'http://b')).toBe('http://b/lab?bai=PHYS_LAB_BOYLE');
    expect(itemHref({id: 'PHYS_SHM', lab: false}, 'http://b')).toBe('http://b/xem?id=PHYS_SHM');
    expect(itemHref({id: 'PHYS_SHM', lab: false}, '#')).toBe('');
  });

  it('chọn Vật lí 11 hiện bài sóng dừng; tìm không dấu ra bài ở mọi lớp; đánh dấu đã học được nhớ', () => {
    localStorage.clear();
    const {unmount} = render(<SgkLibrary />);
    fireEvent.click(screen.getByRole('button', {name: 'Lớp 11'}));
    expect(screen.getByTestId('sgk-item-PHYS_LAB_STANDING_WAVE')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText(/Tìm bài/), {target: {value: 'dinh luat boyle'}});
    fireEvent.click(screen.getByTestId('sgk-item-PHYS_LAB_BOYLE'));
    const viewer = screen.getByTestId('sgk-viewer');
    expect(within(viewer).getByText(/Bài 9\. Định luật Boyle/)).toBeTruthy();
    // dự đoán trước: chưa viết thì khung thí nghiệm khóa, không có ô kết quả, không đánh dấu đã học được
    expect(screen.getByTestId('sgk-locked')).toBeTruthy();
    expect(screen.queryByTestId('sgk-note-ket-qua')).toBeNull();
    expect((screen.getByTestId('sgk-done') as HTMLButtonElement).disabled).toBe(true);
    // dán chữ bị chặn
    expect(fireEvent.paste(screen.getByTestId('sgk-note-du-doan'))).toBe(false);
    expect(screen.getByRole('alert').textContent).toMatch(/không nhận dán/);
    fireEvent.change(screen.getByTestId('sgk-note-du-doan'), {target: {value: 'Nén khí thì áp suất tăng gấp đôi'}});
    expect(screen.queryByTestId('sgk-locked')).toBeNull();
    fireEvent.change(screen.getByTestId('sgk-note-ket-qua'), {target: {value: 'pV của em gần như không đổi, lệch 3 %'}});
    fireEvent.click(screen.getByTestId('sgk-done'));
    unmount();
    expect(JSON.parse(localStorage.getItem('sgk_done') || '[]')).toContain('PHYS_LAB_BOYLE');
  });
});
