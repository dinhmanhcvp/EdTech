import React from 'react';
import {describe, expect, it, vi} from 'vitest';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {BoardAskCard} from '../components/canvas/BoardAskCard';
import {BoardQaError, askBoard, type BoardQaResponse} from '../utils/boardQa';
import type {BoardContext} from '../utils/boardContext';

const CTX: BoardContext = {
  items: [{id: 's1', kind: 'plane', title: 'Tam giác ABC', names: ['A', 'B', 'C'], measures: {sides: [4, 5, 3], angles: [90, 36.87, 53.13], area: 6, sides_named: {AB: 4, BC: 5, CA: 3}, angles_named: {A: 90, B: 36.87, C: 53.13}}}],
};
const RES = (over: Partial<BoardQaResponse['answer']> = {}, source: BoardQaResponse['source'] = 'openrouter'): BoardQaResponse => ({
  source,
  model: 'm1',
  answer: {headline: 'Tam giác vuông tại A', steps: ['AB² + CA² = 16 + 9 = 25 = BC²'], formula_latex: 'AB^2 + CA^2 = BC^2', highlights: ['A'], follow_ups: ['Tính đường cao AH?'], actions: [], clarify: '', used: ['s1'], ...over},
});
const setup = (askFn: ReturnType<typeof vi.fn>, extra: Partial<React.ComponentProps<typeof BoardAskCard>> = {}) => {
  const props = {isOpen: true, onClose: vi.fn(), getContext: () => CTX, onVisualize: vi.fn(), askFn: askFn as unknown as typeof askBoard, ...extra};
  const r = render(<BoardAskCard {...props} />);
  return {...r, props};
};
const ask = (q: string) => {
  fireEvent.change(screen.getByTestId('board-ask-input'), {target: {value: q}});
  fireEvent.click(screen.getByTestId('board-ask-send'));
};

describe('BoardAskCard', () => {
  it('chưa hỏi: cho thấy AI sẽ dựa vào những gì trên bảng và gợi ý theo bảng', () => {
    setup(vi.fn());
    expect(screen.getByTestId('board-ask-read').textContent).toContain('Tam giác ABC');
    expect(screen.getAllByTestId('board-ask-suggest')[0].textContent).toContain('Tam giác ABC');
  });

  it('hỏi: gửi ĐÚNG ngữ cảnh bảng lúc hỏi, hiện câu trả lời có bước, công thức, nguồn', async () => {
    const askFn = vi.fn().mockResolvedValue(RES());
    setup(askFn);
    ask('Tam giác này là tam giác gì?');
    expect(screen.getByTestId('board-ask-loading')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('board-ask-headline').textContent).toContain('vuông tại A'));
    const arg = askFn.mock.calls[0][0];
    expect(arg.question).toBe('Tam giác này là tam giác gì?');
    expect(arg.context).toBe(CTX);
    expect(screen.getByTestId('board-ask-steps').textContent).toContain('= BC');
    expect(screen.getByTestId('board-ask-formula')).toBeInTheDocument();
    expect(screen.getByTestId('board-ask-source').textContent).toContain('OpenRouter');
    expect(screen.getByTestId('board-ask-highlights').textContent).toContain('A');
  });

  it('câu hỏi tiếp theo mang lịch sử câu trước (hỏi nối tiếp theo ngữ cảnh)', async () => {
    const askFn = vi.fn().mockResolvedValue(RES());
    setup(askFn);
    ask('Tam giác gì?');
    await waitFor(() => screen.getByTestId('board-ask-followups'));
    fireEvent.click(screen.getByText('Tính đường cao AH?'));
    await waitFor(() => expect(askFn).toHaveBeenCalledTimes(2));
    const second = askFn.mock.calls[1][0];
    expect(second.question).toBe('Tính đường cao AH?');
    expect(second.history).toEqual([{q: 'Tam giác gì?', a: expect.stringContaining('vuông tại A')}]);
  });

  it('hành động AI đề xuất: bấm → mở mô phỏng qua bộ định tuyến của bảng', async () => {
    const askFn = vi.fn().mockResolvedValue(RES({actions: [{type: 'visualize', label: 'Mở đồ thị', text: 'đồ thị y = x^2'}]}));
    const {props} = setup(askFn);
    ask('vẽ giúp');
    fireEvent.click(await screen.findByTestId('board-ask-action'));
    expect(props.onVisualize).toHaveBeenCalledWith('đồ thị y = x^2');
  });

  it('hiện câu hỏi làm rõ khi AI thiếu dữ kiện; nguồn ngoại tuyến được ghi rõ', async () => {
    const askFn = vi.fn().mockResolvedValue(RES({headline: '', clarify: 'Bạn muốn nói tam giác nào?'}, 'offline'));
    setup(askFn);
    ask('hình này?');
    expect((await screen.findByTestId('board-ask-clarify')).textContent).toContain('tam giác nào');
    expect(screen.getByTestId('board-ask-source').textContent).toContain('Chưa gọi được AI');
  });

  it('lỗi mạng: báo bằng tiếng Việt và có nút thử lại gọi lại đúng câu hỏi', async () => {
    const askFn = vi.fn().mockRejectedValueOnce(new BoardQaError('Không kết nối được máy chủ AI.')).mockResolvedValueOnce(RES());
    setup(askFn);
    ask('hỏi gì đó');
    expect((await screen.findByTestId('board-ask-error')).textContent).toContain('Không kết nối được');
    fireEvent.click(screen.getByText('Thử lại'));
    await waitFor(() => expect(screen.getAllByTestId('board-ask-answer').length).toBe(1));
    expect(askFn.mock.calls[1][0].question).toBe('hỏi gì đó');
  });

  it('giọng nói: đổi autoAskNonce thì tự gửi câu hỏi đã nghe, không gửi lại khi chỉ render lại', async () => {
    const askFn = vi.fn().mockResolvedValue(RES());
    const {rerender, props} = setup(askFn, {initialQuery: '', autoAskNonce: 0});
    rerender(<BoardAskCard {...props} initialQuery="Đường cao hạ từ A dài bao nhiêu?" autoAskNonce={1} />);
    await waitFor(() => expect(askFn).toHaveBeenCalledTimes(1));
    expect(askFn.mock.calls[0][0].question).toBe('Đường cao hạ từ A dài bao nhiêu?');
    rerender(<BoardAskCard {...props} initialQuery="Đường cao hạ từ A dài bao nhiêu?" autoAskNonce={1} />);
    await act(async () => {});
    expect(askFn).toHaveBeenCalledTimes(1);
  });

  it('không gửi câu hỏi trống; đóng thẻ gọi onClose', () => {
    const askFn = vi.fn();
    const {props} = setup(askFn);
    expect((screen.getByTestId('board-ask-send') as HTMLButtonElement).disabled).toBe(true);
    ask('   ');
    expect(askFn).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('board-ask-close'));
    expect(props.onClose).toHaveBeenCalled();
  });
});

describe('askBoard (máy khách)', () => {
  const ok = (body: unknown, status = 200) => vi.fn().mockResolvedValue({ok: status < 400, status, json: async () => body} as Response);

  it('POST đúng địa chỉ, gửi câu hỏi + ngữ cảnh + lịch sử đã cắt; khóa AI đi qua tiêu đề', async () => {
    localStorage.setItem('gemini_api_key', ' KG ');
    localStorage.setItem('openrouter_api_key', 'KO');
    const f = ok(RES());
    const history = Array.from({length: 6}, (_, i) => ({q: `q${i}`, a: `a${i}`}));
    await askBoard({question: '  hỏi  ', context: CTX, history, subject: 'MATH'}, f as unknown as typeof fetch);
    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/canvas\/ask-board$/);
    const headers = init.headers as Record<string, string>;
    expect(headers['x-gemini-api-key']).toBe('KG');
    expect(headers['x-openrouter-api-key']).toBe('KO');
    const body = JSON.parse(init.body as string);
    expect(body.question).toBe('hỏi');
    expect(body.history).toHaveLength(4);
    expect(body.context.items[0].id).toBe('s1');
    expect(body.subject_hint).toBe('MATH');
    localStorage.clear();
  });

  it('phân loại lỗi: 429, 422, 500, mạng đứt, dữ liệu rỗng', async () => {
    const run = (f: typeof fetch) => askBoard({question: 'q', context: CTX}, f);
    await expect(run(ok({}, 429) as unknown as typeof fetch)).rejects.toThrow(/quá nhanh/);
    await expect(run(ok({}, 422) as unknown as typeof fetch)).rejects.toThrow(/không hợp lệ/);
    await expect(run(ok({}, 500) as unknown as typeof fetch)).rejects.toThrow(/500/);
    await expect(run(vi.fn().mockRejectedValue(new TypeError('x')) as unknown as typeof fetch)).rejects.toThrow(/Không kết nối/);
    await expect(run(ok({}) as unknown as typeof fetch)).rejects.toThrow(/không đọc được/);
  });
});
