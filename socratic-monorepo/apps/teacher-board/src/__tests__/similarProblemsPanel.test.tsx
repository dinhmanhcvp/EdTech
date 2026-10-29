import React from 'react';
import {describe, expect, it, vi} from 'vitest';
import '@testing-library/jest-dom';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {SimilarProblemsPanel} from '../components/canvas/SimilarProblemsPanel';
import {SmartboardCanvas} from '../components/canvas/SmartboardCanvas';
import type {SimilarProblem, SimilarResponse} from '../utils/similarProblems';
import type {Stroke} from '../utils/lassoGeometry';

const P = (over: Partial<SimilarProblem> = {}): SimilarProblem => ({statement: 'Cho $AB = 6$, $AC = 8$. Tính $AH$.', steps: ['Dùng công thức đường cao'], answer_text: '4,8 cm', unit: 'cm', status: 'verified', computed: 4.8, ...over});
const R = (over: Partial<SimilarResponse> = {}): SimilarResponse => ({problems: [P(), P({status: 'unverified', statement: 'Đề thứ hai chưa kiểm chứng.'})], dropped: 1, source: 'gemini', ...over});

const open = (askFn: ReturnType<typeof vi.fn>, src = 'Tam giác ABC: AB = 3, AC = 4') => {
  render(<SimilarProblemsPanel getSource={() => src} subject="MATH" askFn={askFn as never} />);
  fireEvent.click(screen.getByTestId('similar-open'));
};

describe('Sinh đề tương tự (giao diện)', () => {
  it('điền sẵn đề từ bảng, gửi đúng số đề/mức/môn, hiện nhãn kiểm chứng và số đề bị loại', async () => {
    const askFn = vi.fn().mockResolvedValue(R());
    open(askFn);
    expect((screen.getByTestId('similar-source') as HTMLTextAreaElement).value).toContain('AB = 3');
    fireEvent.change(screen.getByTestId('similar-count'), {target: {value: '3'}});
    fireEvent.click(screen.getByTestId('similar-level-harder'));
    fireEvent.click(screen.getByTestId('similar-generate'));
    expect(screen.getByTestId('similar-generate')).toBeDisabled();
    await screen.findAllByTestId('similar-item');
    expect(askFn).toHaveBeenCalledWith({source: 'Tam giác ABC: AB = 3, AC = 4', count: 3, level: 'harder', subject: 'MATH'});
    expect(screen.getAllByTestId('similar-item').map((e) => e.getAttribute('data-status'))).toEqual(['verified', 'unverified']);
    const sum = screen.getByTestId('similar-summary').textContent!;
    expect(sum).toContain('1 đề máy đã tính lại');
    expect(sum).toContain('1 đề chưa kiểm chứng');
    expect(sum).toContain('1 đề bị loại');
    expect(sum).toContain('không kiểm tra cách lập luận');
  });

  it('đề gốc trống thì không cho sinh; AI không dùng được thì báo, không có đề bịa', async () => {
    const askFn = vi.fn().mockResolvedValue(R({problems: [], dropped: 0, source: 'offline', note: 'Chưa gọi được mô hình AI.'}));
    open(askFn, '');
    expect(screen.getByTestId('similar-generate')).toBeDisabled();
    fireEvent.change(screen.getByTestId('similar-source'), {target: {value: 'Giải phương trình x^2 - 5x + 6 = 0'}});
    fireEvent.click(screen.getByTestId('similar-generate'));
    expect((await screen.findByTestId('similar-error')).textContent).toContain('Chưa gọi được mô hình AI');
    expect(screen.queryByTestId('similar-list')).toBeNull();
  });

  it('lỗi mạng hiện thông báo tiếng Việt', async () => {
    open(vi.fn().mockRejectedValue(new Error('Không kết nối được máy chủ AI.')));
    fireEvent.click(screen.getByTestId('similar-generate'));
    expect((await screen.findByTestId('similar-error')).textContent).toContain('Không kết nối được');
  });

  it('xuất: HTML có đề và đáp án khi chọn kèm đáp án; bỏ chọn thì chỉ có đề; Markdown mang tiêu đề đã sửa', async () => {
    const blobs: Blob[] = [];
    const names: string[] = [];
    Object.assign(URL, {createObjectURL: (b: Blob) => (blobs.push(b), 'blob:x'), revokeObjectURL: vi.fn()});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      names.push(this.download);
    });
    open(vi.fn().mockResolvedValue(R()));
    fireEvent.click(screen.getByTestId('similar-generate'));
    await screen.findAllByTestId('similar-item');
    fireEvent.change(screen.getByTestId('similar-title'), {target: {value: 'Kiểm tra 15 phút'}});
    fireEvent.click(screen.getByTestId('similar-html'));
    const html = await blobs[0].text();
    expect(html).toContain('Kiểm tra 15 phút');
    expect(html).toContain('class="ans"');
    expect(names[0]).toMatch(/^de-luyen-\d{4}-\d{2}-\d{2}\.html$/);
    fireEvent.click(screen.getByTestId('similar-with-answers'));
    fireEvent.click(screen.getByTestId('similar-md'));
    const md = await blobs[1].text();
    expect(md).toContain('# Kiểm tra 15 phút');
    expect(md).not.toContain('Đáp án');
    click.mockRestore();
  });
});

describe('Sinh đề trên bảng thật', () => {
  it('đề gốc lấy từ công thức trên bảng', () => {
    const f: Stroke = {id: 'f1', points: [{x: 100, y: 100}], color: '#111', width: 3, typeset: {latex: 'x^2 - 5x + 6 = 0', text: '', size: 20, w: 100, h: 30}};
    render(<SmartboardCanvas initialStrokes={[f]} />);
    fireEvent.click(screen.getByTestId('similar-open'));
    expect((screen.getByTestId('similar-source') as HTMLTextAreaElement).value).toContain('x^2 - 5x + 6 = 0');
  });
});
