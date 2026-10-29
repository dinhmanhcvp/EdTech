import React from 'react';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {SmartboardCanvas} from '../components/canvas/SmartboardCanvas';
import type {Stroke} from '../utils/lassoGeometry';

vi.mock('../utils/isolatedExporter', async (orig) => ({
  ...(await orig<typeof import('../utils/isolatedExporter')>()),
  exportIsolatedWebp: async () => ({dataUrl: 'data:image/png;base64,AAAA'}),
}));

const ink = (id: string, y: number): Stroke => ({id, color: '#111', width: 3, points: [{x: 120, y}, {x: 220, y: y + 8}, {x: 320, y}, {x: 420, y: y + 6}]});
const strokes = [ink('a', 150), ink('b', 220)];
// nét khác để không trúng bộ nhớ đệm nhận dạng của bài trước
const strokes2 = [ink('c', 163), ink('d', 241)];

const recognition = {
  engine: 'gemini', confidence: 0.85, alternatives: [],
  lines: [
    {text: '2x+3=7', latex: '2x+3=7', confidence: 0.9, y0: 0.05, y1: 0.45},
    {text: '2x=7+S', latex: '2x=7+S', confidence: 0.8, y0: 0.55, y1: 0.95},
  ],
  uncertain: [{line: 1, token: 'S', alternatives: ['3', '5'], x: 0.7, y: 0.75}],
};
const graded = {
  status: 'GRADED', subject: 'MATH_ALGEBRA', final_correct: false, summary: 'Sai dấu khi chuyển vế.', first_error: 1,
  steps: [
    {index: 0, latex: '2x+3=7', status: 'ok', kind: 'other', title: '', explain: '', fix: '', corrected: '', source: 'ai'},
    {index: 1, latex: '2x=7+3', status: 'error', kind: 'transform', title: 'Sai dấu khi chuyển vế', explain: 'Chuyển $+3$ sang vế phải phải đổi dấu.', fix: 'Viết $2x = 7 - 3$.', corrected: '2x = 7 - 3', source: 'machine'},
  ],
};

let gradeBody: any = null;
const mockFetch = () =>
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, init: any) => {
    const u = String(url);
    if (u.includes('recognize-ink')) return {ok: true, status: 200, json: async () => recognition} as Response;
    if (u.includes('grade-steps')) {
      gradeBody = JSON.parse(init.body);
      return {ok: true, status: 200, json: async () => graded} as Response;
    }
    return {ok: false, status: 404, json: async () => ({})} as Response;
  });

afterEach(() => {
  vi.restoreAllMocks();
  gradeBody = null;
});

describe('chấm bài: xác nhận ký tự phân vân rồi chấm theo từng bước', () => {
  it('ký tự phân vân hiện thanh chọn ngay dưới ký tự; chọn xong tự chấm, bôi đỏ bước sai, mở cửa sổ giải thích', async () => {
    mockFetch();
    render(<SmartboardCanvas initialStrokes={strokes} initialSelectedStrokes={strokes} />);
    const bar = await screen.findByTestId('uncertain-bar');
    expect(bar).toBeTruthy();
    // phương án đầu là ký tự AI đã chọn, sau đó là các khả năng khác
    expect(screen.getByTestId('uncertain-pick-0-0').textContent).toBe('S');
    expect(screen.getByTestId('uncertain-pick-0-1').textContent).toBe('3');

    await act(async () => {
      fireEvent.click(screen.getByTestId('ai-fab-grade'));
    });
    // còn ký tự chưa xác nhận: chưa chấm
    expect(gradeBody).toBeNull();
    expect(screen.getByTestId('uncertain-footer').textContent).toContain('Chấm bài sau khi chọn');

    await act(async () => {
      fireEvent.click(screen.getByTestId('uncertain-pick-0-1'));
    });
    await waitFor(() => expect(gradeBody).not.toBeNull());
    expect(gradeBody.lines.map((l: any) => l.latex)).toEqual(['2x+3=7', '2x=7+3']); // đã áp lựa chọn "3"
    expect(screen.queryByTestId('uncertain-bar')).toBeNull();

    expect(await screen.findByTestId('grade-mark-error')).toBeTruthy(); // bôi đỏ dòng sai
    expect(screen.getByTestId('grade-arrow-first').textContent).toContain('Sai ở bước 2');
    const win = await screen.findByTestId('step-explain-window');
    expect(win.textContent).toContain('Sai dấu khi chuyển vế');
    expect(screen.getByTestId('explain-why')).toBeTruthy();
    expect(screen.getByTestId('explain-fix')).toBeTruthy();
    expect(screen.getByTestId('explain-corrected')).toBeTruthy();
    expect(win.textContent).toContain('máy kiểm chứng');
    fireEvent.click(screen.getByTestId('explain-close'));
    expect(screen.queryByTestId('step-explain-window')).toBeNull();
    // chạm mũi tên mở lại cửa sổ
    fireEvent.click(screen.getByTestId('grade-arrow-first'));
    expect(await screen.findByTestId('step-explain-window')).toBeTruthy();
  });

  it('"Giữ như AI đọc" bỏ qua các ký tự phân vân và chấm luôn', async () => {
    mockFetch();
    render(<SmartboardCanvas initialStrokes={strokes} initialSelectedStrokes={strokes} />);
    await screen.findByTestId('uncertain-bar');
    await act(async () => {
      fireEvent.click(screen.getByTestId('ai-fab-grade'));
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId('uncertain-keep-all'));
    });
    await waitFor(() => expect(gradeBody).not.toBeNull());
    expect(gradeBody.lines.map((l: any) => l.latex)).toEqual(['2x+3=7', '2x=7+S']);
  });

  it('không có ký tự phân vân thì chấm ngay; chưa khoanh gì thì nhắc khoanh', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any, init: any) => {
      if (String(url).includes('recognize-ink')) return {ok: true, status: 200, json: async () => ({...recognition, uncertain: []})} as Response;
      gradeBody = JSON.parse(init.body);
      return {ok: true, status: 200, json: async () => ({...graded, first_error: null, final_correct: true, steps: graded.steps.map((s) => ({...s, status: 'ok'}))})} as Response;
    });
    const {unmount} = render(<SmartboardCanvas initialStrokes={strokes2} initialSelectedStrokes={strokes2} />);
    await waitFor(() => expect(spy.mock.calls.some((c) => String(c[0]).includes('recognize-ink'))).toBe(true));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60)); // để kết quả nhận dạng về trạng thái
    });
    expect(screen.queryByTestId('uncertain-bar')).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByTestId('ai-fab-grade'));
    });
    await waitFor(() => expect(gradeBody).not.toBeNull());
    expect(await screen.findAllByTestId('grade-mark-ok')).toHaveLength(2);
    expect(screen.queryByTestId('step-explain-window')).toBeNull(); // không có bước sai thì không bật cửa sổ
    unmount();

    gradeBody = null;
    render(<SmartboardCanvas initialStrokes={strokes} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('ai-fab'));
      fireEvent.click(screen.getByTestId('ai-fab-grade'));
    });
    expect(gradeBody).toBeNull();
    expect((await screen.findByTestId('error-toast')).textContent).toContain('khoanh');
  });
});
