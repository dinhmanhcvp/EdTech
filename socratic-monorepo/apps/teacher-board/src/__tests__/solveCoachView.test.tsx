import React from 'react';
import {describe, it, expect, vi} from 'vitest';
import '@testing-library/jest-dom';
import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import {BoardAskCard} from '../components/canvas/BoardAskCard';
import {SolveCoachView} from '../components/canvas/SolveCoachView';
import type {BoardContext} from '../utils/boardContext';

const CTX = (text: string): BoardContext => ({items: [{id: 'f1', kind: 'formula', text}]});
const RES = (headline: string, steps: string[] = [], actions: unknown[] = []) => ({source: 'gemini', model: 'm', answer: {headline, steps, formula_latex: '', highlights: [], follow_ups: [], actions, clarify: '', used: []}});
const grade = (steps: unknown[]) => vi.fn().mockResolvedValue({summary: '', first_error: null, steps});

const setup = (text: string, extra: Partial<React.ComponentProps<typeof SolveCoachView>> = {}) => {
  const props = {getContext: () => CTX(text), subject: null, onVisualize: vi.fn(), ...extra};
  render(<SolveCoachView {...props} />);
  return props;
};

describe('Gợi ý giải Socratic (mọi môn)', () => {
  it('lấy đề từ bảng và tự nhận dạng bài; chọn tay được khi máy nhận sai', () => {
    setup('Cân bằng phương trình hóa học Fe + O2 → Fe3O4');
    expect((screen.getByTestId('solve-problem') as HTMLTextAreaElement).value).toContain('Fe + O2');
    expect(screen.getByTestId('solve-type').textContent).toContain('Cân bằng, viết phương trình phản ứng');
    fireEvent.change(screen.getByTestId('solve-type'), {target: {value: 'p_kin'}});
    expect((screen.getByTestId('solve-type') as HTMLSelectElement).value).toBe('p_kin');
  });

  it('chẩn đoán chỗ vướng rồi vào đúng bước Polya; câu hỏi dẫn dắt có dấu hỏi và nhắc thời gian tự làm', () => {
    setup('Giải phương trình 2x^2 - 5x + 3 = 0');
    fireEvent.click(screen.getByTestId('solve-stuck-plan'));
    const t = screen.getByTestId('solve-log').textContent!;
    expect(t).toContain('② Lập kế hoạch');
    expect(t).toMatch(/\?/);
    expect(t).toContain('1–2 phút');
    expect(screen.queryByTestId('solve-diagnose')).toBeNull();
    fireEvent.click(screen.getByTestId('solve-next'));
    expect(screen.getByTestId('solve-log').textContent).toContain('③ Thực hiện');
  });

  it('bước làm sai: hỏi theo loại lỗi, KHÔNG nêu cách sửa; chi tiết chỉ hiện khi bấm xem', async () => {
    const gradeFn = grade([{status: 'error', kind: 'sign', title: 'Sai dấu khi chuyển vế', explain: 'Chuyển vế đổi dấu.', fix: 'Đúng là 2x = 4'}]);
    setup('Giải phương trình 2x + 3 = 7', {gradeFn: gradeFn as never});
    fireEvent.click(screen.getByTestId('solve-stuck-compute'));
    fireEvent.change(screen.getByTestId('solve-input'), {target: {value: '2x = 10'}});
    fireEvent.click(screen.getByTestId('solve-check'));
    await waitFor(() => expect(screen.getByTestId('solve-detail')).toBeInTheDocument());
    const t = screen.getByTestId('solve-log').textContent!;
    expect(t).toMatch(/dấu/);
    expect(t).not.toContain('2x = 4');
    fireEvent.click(screen.getByTestId('solve-detail'));
    expect(screen.getByTestId('solve-log').textContent).toContain('2x = 4');
  });

  it('bước đúng: hỏi vì sao và sang mức kế', async () => {
    setup('Giải phương trình 2x + 3 = 7', {gradeFn: grade([{status: 'ok'}]) as never});
    fireEvent.click(screen.getByTestId('solve-stuck-understand'));
    fireEvent.change(screen.getByTestId('solve-input'), {target: {value: '2x = 4'}});
    fireEvent.click(screen.getByTestId('solve-check'));
    await waitFor(() => expect(screen.getByTestId('solve-log').textContent).toContain('② Lập kế hoạch'));
    expect(screen.getByTestId('solve-log').textContent).toMatch(/vì sao/);
  });

  it('hóa học: đếm nguyên tử ngay trên máy (không gọi máy chủ), không báo hệ số đúng', async () => {
    const gradeFn = vi.fn();
    setup('Cân bằng phương trình hóa học Fe + O2 → Fe3O4', {gradeFn: gradeFn as never});
    fireEvent.click(screen.getByTestId('solve-stuck-compute'));
    fireEvent.change(screen.getByTestId('solve-input'), {target: {value: '2Fe + O2 → Fe3O4'}});
    fireEvent.click(screen.getByTestId('solve-check'));
    await waitFor(() => expect(screen.getByTestId('solve-log').textContent).toMatch(/Nguyên tố/));
    expect(gradeFn).not.toHaveBeenCalled();
    expect(screen.getByTestId('solve-log').textContent).not.toContain('3Fe');
  });

  it('Hỏi AI (Socratic): gửi chế độ solve + mức + đề; hiện câu hỏi và nút mở mô phỏng', async () => {
    const askFn = vi.fn().mockResolvedValue(RES('Vật đi lên rồi rơi xuống: ở đỉnh vận tốc bằng bao nhiêu?', [], [{type: 'visualize', label: 'Ném xiên', text: 'ném xiên'}]));
    const p = setup('Một vật ném xiên với góc 45 độ, tính tầm xa', {askFn: askFn as never, subject: 'PHYSICS'});
    fireEvent.click(screen.getByTestId('solve-stuck-plan'));
    fireEvent.click(screen.getByTestId('solve-ai'));
    await waitFor(() => expect(screen.getByTestId('solve-log').textContent).toContain('ở đỉnh vận tốc'));
    const call = askFn.mock.calls[0][0];
    expect(call.mode).toBe('solve');
    expect(call.level).toBe(2);
    expect(call.context.problem).toContain('ném xiên');
    expect(call.context.problem_type).toBeTruthy();
    fireEvent.click(screen.getByText(/Ném xiên/));
    expect(p.onVisualize).toHaveBeenCalledWith('ném xiên');
  });

  it('Xem lời giải mẫu chỉ khi bấm (mức 5); không có AI thì nói rõ và không bịa', async () => {
    const askFn = vi.fn().mockResolvedValue(RES(''));
    setup('Giải phương trình 2x = 4', {askFn: askFn as never});
    fireEvent.click(screen.getByTestId('solve-stuck-check'));
    expect(askFn).not.toHaveBeenCalled(); // chưa bấm thì không tự đưa lời giải
    fireEvent.click(screen.getByTestId('solve-full'));
    await waitFor(() => expect(askFn).toHaveBeenCalled());
    expect(askFn.mock.calls[0][0].level).toBe(5);
    await waitFor(() => expect(screen.getByTestId('solve-log').textContent).toContain('cần kết nối AI'));
  });
});

describe('thẻ Hỏi đáp AI có chế độ Gợi ý giải', () => {
  it('chuyển tab sang Gợi ý giải và quay lại Hỏi đáp', () => {
    render(<BoardAskCard isOpen onClose={vi.fn()} getContext={() => CTX('Giải phương trình x^2 = 4')} onVisualize={vi.fn()} />);
    expect(screen.getByTestId('board-ask-input')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('board-ask-tab-solve'));
    expect(screen.getByTestId('solve-coach')).toBeInTheDocument();
    expect(screen.queryByTestId('board-ask-input')).toBeNull();
    fireEvent.click(screen.getByTestId('board-ask-tab-ask'));
    expect(screen.getByTestId('board-ask-input')).toBeInTheDocument();
  });
});
