import React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import '@testing-library/jest-dom';
import {render, screen, within} from '@testing-library/react';

const mockApi = vi.hoisted(() => ({simCatalog: vi.fn()}));
vi.mock('../lib/api', async () => ({...(await vi.importActual<typeof import('../lib/api')>('../lib/api')), api: mockApi}));
const hub = vi.hoisted(() => ({linkClass: vi.fn(), classNotebook: vi.fn()}));
vi.mock('../lib/hub', async () => ({...(await vi.importActual<typeof import('../lib/hub')>('../lib/hub')), hub}));

import {HubError} from '../lib/hub';
import {NotebookPanel} from '../components/NotebookPanel';

beforeEach(() => {
  vi.clearAllMocks();
  hub.linkClass.mockResolvedValue({hubClassId: 'h1'});
  mockApi.simCatalog.mockResolvedValue([{id: 'CHEM_LAB_TOLLENS', engine: 'CHEMISTRY', title: 'Thực hành: Phản ứng tráng bạc của aldehyde'}]);
});

describe('vở ghi SGK của lớp', () => {
  it('nhóm theo học sinh, hiện tên học liệu, dự đoán, kết quả và bài chưa ghi kết quả', async () => {
    hub.classNotebook.mockResolvedValue([
      {itemKey: 'CHEM_LAB_TOLLENS', prediction: 'Có lớp bạc', result: 'Bạc bám thành ống khi đun nhẹ', done: true, updatedAt: 1, studentId: 's1', studentName: 'An'},
      {itemKey: 'PHYS_SHM', prediction: 'Chu kì không đổi', result: '', done: false, updatedAt: 2, studentId: 's1', studentName: 'An'},
      {itemKey: 'PHYS_SHM', prediction: 'Chu kì tăng', result: '', done: false, updatedAt: 3, studentId: 's2', studentName: 'Bảo'},
    ]);
    render(<NotebookPanel consoleClassId="c1" />);
    const groups = await screen.findAllByTestId('notebook-student');
    expect(hub.classNotebook).toHaveBeenCalledWith('h1');
    expect(groups).toHaveLength(2);
    const an = within(groups[0]);
    expect(an.getByText(/1\/2 bài đã ghi kết quả/)).toBeInTheDocument();
    expect(await an.findByText('Thực hành: Phản ứng tráng bạc của aldehyde')).toBeInTheDocument();
    expect(an.getByText('Bạc bám thành ống khi đun nhẹ')).toBeInTheDocument();
    expect(an.getAllByText('chưa ghi')).toHaveLength(1);
  });

  it('lớp chưa có vở thì hướng dẫn; lỗi máy chủ thì báo câu tiếng Việt', async () => {
    hub.classNotebook.mockResolvedValue([]);
    const {unmount} = render(<NotebookPanel consoleClassId="c1" />);
    expect(await screen.findByText(/Chưa có vở ghi nào/)).toBeInTheDocument();
    unmount();
    hub.classNotebook.mockRejectedValue(new HubError('Không tìm thấy.', 404));
    render(<NotebookPanel consoleClassId="c1" />);
    expect(await screen.findByText('Không tìm thấy.')).toBeInTheDocument();
  });
});
