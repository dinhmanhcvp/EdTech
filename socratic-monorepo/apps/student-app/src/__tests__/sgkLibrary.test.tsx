import React from 'react';
import {describe, expect, it, vi} from 'vitest';
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
    expect(itemHref({id: 'PHYS_LAB_BOYLE', lab: true}, 'http://b')).toBe('http://b/lab?bai=PHYS_LAB_BOYLE&nhung=1');
    expect(itemHref({id: 'PHYS_SHM', lab: false}, 'http://b')).toBe('http://b/xem?id=PHYS_SHM');
    expect(itemHref({id: 'PHYS_SHM', lab: false}, '#')).toBe('');
  });

  it('đã đăng nhập hub: nạp vở từ lớp, sửa thì lưu lên lớp; chưa đăng nhập thì không gọi mạng', async () => {
    localStorage.clear();
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'GET') return new Response(JSON.stringify({entries: [{itemKey: 'PHYS_LAB_SAFETY', prediction: 'Dây điện hở dễ gây giật', result: '', done: false, updatedAt: 1}]}), {status: 200});
      return new Response(JSON.stringify({ok: true}), {status: 200});
    });
    vi.stubGlobal('fetch', fetchMock);
    // chưa đăng nhập
    let r = render(<SgkLibrary />);
    expect(screen.getByTestId('sgk-sync').textContent).toMatch(/chỉ lưu trên máy/);
    r.unmount();
    expect(fetchMock).not.toHaveBeenCalled();
    // đã đăng nhập
    localStorage.setItem('hub_student', JSON.stringify({token: 't', student: {id: 's1', name: 'An', classId: 'c', className: '10A1'}}));
    r = render(<SgkLibrary />);
    await screen.findByDisplayValue('Dây điện hở dễ gây giật');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/hub/me/notebook');
    fireEvent.change(screen.getByTestId('sgk-note-ket-qua'), {target: {value: 'Em thấy ổ cắm có nắp che, dây gọn'}});
    await new Promise((res) => setTimeout(res, 1000));
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')!;
    expect(put[0]).toBe('/api/v1/hub/me/notebook/PHYS_LAB_SAFETY');
    expect(JSON.parse(put[1]!.body as string)).toEqual({prediction: 'Dây điện hở dễ gây giật', result: 'Em thấy ổ cắm có nắp che, dây gọn', done: false});
    expect((put[1]!.headers as Record<string, string>).Authorization).toBe('Bearer t');
    expect(screen.getByTestId('sgk-sync').textContent).toMatch(/Đã lưu lên lớp 10A1/);
    r.unmount();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('màn hẹp: chọn bài thì cuộn tới khung xem; màn rộng thì không', async () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    for (const narrow of [true, false]) {
      scroll.mockClear();
      window.matchMedia = vi.fn().mockReturnValue({matches: narrow}) as unknown as typeof window.matchMedia;
      const {unmount} = render(<SgkLibrary />);
      fireEvent.click(screen.getByTestId('sgk-item-PHYS_LAB_SPEED'));
      await new Promise((r) => setTimeout(r, 10));
      expect(scroll).toHaveBeenCalledTimes(narrow ? 1 : 0);
      unmount();
    }
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
