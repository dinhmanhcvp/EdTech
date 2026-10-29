import React from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import '@testing-library/jest-dom';
import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';

const hb = vi.hoisted(() => ({
  resources: vi.fn(), resource: vi.fn(), open: vi.fn(), getInk: vi.fn(), putInk: vi.fn(), pageUrl: vi.fn(),
  openRun: vi.fn(), closeRun: vi.fn(), progress: vi.fn(), submissions: vi.fn(), stream: vi.fn(),
}));
vi.mock('../utils/hubBoard', async () => ({...(await vi.importActual<typeof import('../utils/hubBoard')>('../utils/hubBoard')), hubBoard: hb}));
vi.mock('qrcode', () => ({default: {toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,QR')}}));

import {BoardHubError, boardHubFetch} from '../utils/hubBoard';
import {ResourcePanel} from '../components/resources/ResourcePanel';
import {ResourceViewer} from '../components/resources/ResourceViewer';

const slides = {id: 'asg-s', version: 1, title: 'Hàm số bậc nhất', subject: 'MATH', kind: 'slides', body: {title: 'x', subject: 'MATH', kind: 'slides', questions: []},
  pages: [{page: 0, width: 1000, height: 1400}, {page: 1, width: 1000, height: 1400}]};
const exam = {id: 'asg-e', version: 2, title: 'Đề 15 phút', subject: 'MATH', kind: 'exam',
  body: {title: 'x', subject: 'MATH', kind: 'exam', questions: [{id: 'q1', type: 'choice', label: 'Câu 1', text: 'Chọn', options: ['1', '2'], kcs: [], page: 0, box: [0.1, 0.5, 0.8, 0.1]}]},
  pages: [{page: 0, width: 1000, height: 1400}]};

beforeEach(() => {
  vi.clearAllMocks();
  hb.pageUrl.mockResolvedValue('blob:page');
  hb.getInk.mockResolvedValue([]);
  hb.putInk.mockResolvedValue(undefined);
  hb.open.mockResolvedValue(undefined);
  hb.stream.mockReturnValue(() => {});
  hb.submissions.mockResolvedValue([]);
  hb.progress.mockResolvedValue({questions: [{questionId: 'q1', submitted: 3, correctRate: 0.67}]});
});
afterEach(() => vi.useRealTimers());

describe('hub client for the board', () => {
  it('sends the board token and refuses without a paired period', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({assignments: []}), {status: 200}));
    await boardHubFetch('GET', '/board/assignments', undefined, 'tok-b', fetchImpl as unknown as typeof fetch);
    expect(fetchImpl.mock.calls[0][1].headers['X-Board-Token']).toBe('tok-b');
    await expect(boardHubFetch('GET', '/board/assignments', undefined, '', fetchImpl as unknown as typeof fetch)).rejects.toBeInstanceOf(BoardHubError);
  });
});

describe('ResourcePanel', () => {
  it('asks to pair first when the board is not paired', () => {
    render(<ResourcePanel paired={false} onOpen={vi.fn()} />);
    fireEvent.click(screen.getByTestId('resources-toggle'));
    expect(screen.getByText('Ghép bảng với tiết để mở tài nguyên.')).toBeInTheDocument();
  });

  it('lists resources by kind and opens one', async () => {
    hb.resources.mockResolvedValue([
      {id: 'asg-s', title: 'Hàm số bậc nhất', subject: 'MATH', kind: 'slides', source: 'file', currentVersion: 1, pageCount: 2, updatedAt: 1},
      {id: 'asg-e', title: 'Đề 15 phút', subject: 'MATH', kind: 'exam', source: 'file', currentVersion: 2, pageCount: 1, updatedAt: 2},
    ]);
    const onOpen = vi.fn();
    render(<ResourcePanel paired onOpen={onOpen} />);
    fireEvent.click(screen.getByTestId('resources-toggle'));
    expect(await screen.findByText('Hàm số bậc nhất')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('rtab-exam'));
    expect(screen.queryByText('Hàm số bậc nhất')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Đề 15 phút'));
    expect(onOpen).toHaveBeenCalledWith('asg-e');
  });
});

describe('ResourceViewer', () => {
  const box = () => screen.getByTestId('viewer-stage');
  const layer = () => screen.getByTestId('viewer-layer');

  it('records the use, pages through and zooms around the wheel', async () => {
    hb.resource.mockResolvedValue(slides);
    render(<ResourceViewer resourceId="asg-s" onClose={vi.fn()} onInsertPage={vi.fn()} size={{w: 1600, h: 900}} />);
    expect(await screen.findByText('Trang 1/2')).toBeInTheDocument();
    expect(hb.open).toHaveBeenCalledWith('asg-s');
    const before = layer().style.transform;
    fireEvent.wheel(box(), {deltaY: -400, clientX: 800, clientY: 450});
    expect(layer().style.transform).not.toBe(before);
    fireEvent.click(screen.getByTestId('viewer-next'));
    expect(screen.getByText('Trang 2/2')).toBeInTheDocument();
    fireEvent.keyDown(window, {key: 'ArrowLeft'});
    expect(screen.getByText('Trang 1/2')).toBeInTheDocument();
  });

  it('draws over the page, saves the ink after 1 s and puts the page on the board', async () => {
    hb.resource.mockResolvedValue(slides);
    const onInsertPage = vi.fn();
    render(<ResourceViewer resourceId="asg-s" onClose={vi.fn()} onInsertPage={onInsertPage} size={{w: 1600, h: 900}} />);
    await screen.findByText('Trang 1/2');
    vi.useFakeTimers({shouldAdvanceTime: true});
    fireEvent.click(screen.getByTestId('viewer-pen'));
    fireEvent.pointerDown(box(), {pointerId: 1, clientX: 800, clientY: 300});
    fireEvent.pointerMove(box(), {pointerId: 1, clientX: 820, clientY: 320});
    fireEvent.pointerUp(box(), {pointerId: 1, clientX: 820, clientY: 320});
    await act(async () => vi.advanceTimersByTime(1100));
    await waitFor(() => expect(hb.putInk).toHaveBeenCalled());
    const [id, pg, strokes] = hb.putInk.mock.calls[0];
    expect([id, pg, strokes.length]).toEqual(['asg-s', 0, 1]);
    expect(strokes[0].p.every(([x, y]: number[]) => x >= 0 && x <= 1 && y >= 0 && y <= 1)).toBe(true);
    fireEvent.click(screen.getByTestId('viewer-insert'));
    expect(onInsertPage).toHaveBeenCalledWith({assignmentId: 'asg-s', page: 0, width: 1000, height: 1400}, strokes);
  });

  it('focuses a question and hands the exam out with a QR code', async () => {
    hb.resource.mockResolvedValue(exam);
    hb.openRun.mockResolvedValue({runId: 'run-1', code: 'ABCD2345', url: 'http://hs/a/ABCD2345', classHasStudents: true});
    render(<ResourceViewer resourceId="asg-e" onClose={vi.fn()} onInsertPage={vi.fn()} size={{w: 1600, h: 900}} />);
    const before = (await screen.findByTestId('viewer-layer')).style.transform;
    fireEvent.click(screen.getByText('Câu 1'));
    expect(layer().style.transform).not.toBe(before);
    fireEvent.click(screen.getByTestId('viewer-handout'));
    const qr = await screen.findByTestId('handout-qr');
    expect(within(qr).getByText('ABCD2345')).toBeInTheDocument();
    expect(within(qr).getByRole('img')).toHaveAttribute('src', 'data:image/png;base64,QR');
    expect(await screen.findByText('3 bài · đúng 67%')).toBeInTheDocument();
  });

  const draw = (x = 800, togglePen = true) => {
    if (togglePen) fireEvent.click(screen.getByTestId('viewer-pen'));
    fireEvent.pointerDown(box(), {pointerId: 1, clientX: x, clientY: 300});
    fireEvent.pointerMove(box(), {pointerId: 1, clientX: x + 20, clientY: 320});
    fireEvent.pointerUp(box(), {pointerId: 1, clientX: x + 20, clientY: 320});
  };

  it('saves the ink of a page at once when leaving the page or closing the viewer', async () => {
    hb.resource.mockResolvedValue(slides);
    const {unmount} = render(<ResourceViewer resourceId="asg-s" onClose={vi.fn()} onInsertPage={vi.fn()} size={{w: 1600, h: 900}} />);
    await screen.findByText('Trang 1/2');
    await waitFor(() => expect(hb.getInk).toHaveBeenCalledWith('asg-s', 0));
    draw();
    fireEvent.click(screen.getByTestId('viewer-next'));
    await waitFor(() => expect(hb.putInk).toHaveBeenCalledWith('asg-s', 0, expect.any(Array)));
    await waitFor(() => expect(hb.getInk).toHaveBeenCalledWith('asg-s', 1));
    draw(700, false);
    unmount();
    expect(hb.putInk).toHaveBeenCalledWith('asg-s', 1, expect.any(Array));
  });

  it('keeps the pen off a page whose saved ink could not be loaded', async () => {
    hb.resource.mockResolvedValue(slides);
    hb.getInk.mockRejectedValue(new BoardHubError('x', 500));
    render(<ResourceViewer resourceId="asg-s" onClose={vi.fn()} onInsertPage={vi.fn()} size={{w: 1600, h: 900}} />);
    await screen.findByText('Trang 1/2');
    expect(await screen.findByText(/Chưa tải được nét viết/)).toBeInTheDocument();
    vi.useFakeTimers({shouldAdvanceTime: true});
    draw();
    await act(async () => vi.advanceTimersByTime(1500));
    expect(hb.putInk).not.toHaveBeenCalled();
  });

  it('hands out once even when "Giao bài" is tapped twice', async () => {
    hb.resource.mockResolvedValue(exam);
    let done: (v: unknown) => void = () => {};
    hb.openRun.mockReturnValue(new Promise((r) => (done = r)));
    render(<ResourceViewer resourceId="asg-e" onClose={vi.fn()} onInsertPage={vi.fn()} size={{w: 1600, h: 900}} />);
    const b = await screen.findByTestId('viewer-handout');
    fireEvent.click(b);
    fireEvent.click(b);
    expect(hb.openRun).toHaveBeenCalledTimes(1);
    await act(async () => done({runId: 'run-1', code: 'ABCD2345', url: 'http://hs/a/ABCD2345', classHasStudents: true}));
  });

  it('shows a retry when a page fails to load', async () => {
    hb.resource.mockResolvedValue(slides);
    hb.pageUrl.mockRejectedValueOnce(new BoardHubError('x', 404)).mockResolvedValue('blob:page');
    render(<ResourceViewer resourceId="asg-s" onClose={vi.fn()} onInsertPage={vi.fn()} size={{w: 1600, h: 900}} />);
    fireEvent.click(await screen.findByTestId('viewer-retry'));
    await waitFor(() => expect(screen.queryByTestId('viewer-retry')).not.toBeInTheDocument());
  });
});
