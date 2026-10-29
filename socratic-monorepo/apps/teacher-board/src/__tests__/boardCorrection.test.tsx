import React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import '@testing-library/jest-dom';
import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';

const hb = vi.hoisted(() => ({submissions: vi.fn(), submission: vi.fn(), submissionUrl: vi.fn(), saveCorrection: vi.fn(), stream: vi.fn()}));
vi.mock('../utils/hubBoard', async () => ({...(await vi.importActual<typeof import('../utils/hubBoard')>('../utils/hubBoard')), hubBoard: hb}));

import {CorrectionPanel} from '../components/resources/CorrectionPanel';

const questions = [{id: 'q3', type: 'essay' as const, label: 'Câu 3', text: 'Giải'}, {id: 'q4', type: 'open' as const, label: 'Câu 4', text: 'Giải thích'}];
const detail = {
  submissionId: 'sub-1', label: 'Bài 1', questionId: 'q3', status: 'graded', confirmed: ['x + 3 = 5', 'x = 8'],
  lines: [{latex: 'x + 3 = 5', y0: 0.1, y1: 0.2}, {latex: 'x = 8', y0: 0.3, y1: 0.4}],
  grade: {first_error: 1, steps: [{index: 0, status: 'ok'}, {index: 1, status: 'error', title: 'Chuyển vế sai dấu', explain: '3 sang vế phải phải đổi dấu', fix: 'x = 5 - 3'}]},
  correction: null, hasPhoto: true,
};
let emit: (e: {type: string; [k: string]: unknown}) => void = () => {};

beforeEach(() => {
  vi.clearAllMocks();
  hb.submissions.mockResolvedValue([
    {submissionId: 'sub-1', label: 'Bài 1', questionId: 'q3', status: 'graded', firstError: 1, hasPhoto: true},
    {submissionId: 'sub-2', label: 'Bài 2', questionId: 'q4', status: 'pending_teacher', firstError: null, hasPhoto: true},
  ]);
  hb.submission.mockResolvedValue(detail);
  hb.submissionUrl.mockResolvedValue('blob:photo');
  hb.saveCorrection.mockResolvedValue({});
  hb.stream.mockImplementation((onEvent: typeof emit) => {
    emit = onEvent;
    return () => {};
  });
});

describe('CorrectionPanel', () => {
  it('lists anonymous submissions and filters by question', async () => {
    render(<CorrectionPanel runId="run-1" questions={questions} size={{w: 1600, h: 900}} />);
    fireEvent.click(screen.getByTestId('pick-toggle'));
    expect(await screen.findByText('Bài 1')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('pick-question'), {target: {value: 'q4'}});
    await waitFor(() => expect(hb.submissions).toHaveBeenLastCalledWith('run-1', 'q4', undefined));
  });

  it('opens a submission with the first wrong line in red and its explanation', async () => {
    render(<CorrectionPanel runId="run-1" questions={questions} size={{w: 1600, h: 900}} />);
    fireEvent.click(screen.getByTestId('pick-toggle'));
    fireEvent.click(await screen.findByText('Bài 1'));
    const band = await screen.findByTestId('first-error-band');
    expect(band.style.top).toBe('30%');
    expect(band.style.height).toBe('10%');
    const card = screen.getByTestId('error-card');
    expect(within(card).getByText('Chuyển vế sai dấu')).toBeInTheDocument();
    expect(within(card).getByText('3 sang vế phải phải đổi dấu')).toBeInTheDocument();
  });

  it('saves the teacher correction strokes in image coordinates', async () => {
    render(<CorrectionPanel runId="run-1" questions={questions} size={{w: 1600, h: 900}} />);
    fireEvent.click(screen.getByTestId('pick-toggle'));
    fireEvent.click(await screen.findByText('Bài 1'));
    const stage = await screen.findByTestId('correction-stage');
    fireEvent.pointerDown(stage, {pointerId: 1, clientX: 800, clientY: 400});
    fireEvent.pointerMove(stage, {pointerId: 1, clientX: 830, clientY: 420});
    fireEvent.pointerUp(stage, {pointerId: 1});
    fireEvent.click(screen.getByTestId('save-correction'));
    await waitFor(() => expect(hb.saveCorrection).toHaveBeenCalled());
    const [id, strokes] = hb.saveCorrection.mock.calls[0];
    expect(id).toBe('sub-1');
    expect(strokes).toHaveLength(1);
    expect(strokes[0].p.every(([x, y]: number[]) => x >= 0 && x <= 1 && y >= 0 && y <= 1)).toBe(true);
    expect(await screen.findByText('Đã lưu phần chữa')).toBeInTheDocument();
  });

  it('opens the submission the teacher chose on the console', async () => {
    render(<CorrectionPanel runId="run-1" questions={questions} size={{w: 1600, h: 900}} />);
    await act(async () => emit({type: 'show_submission', runId: 'run-1', submissionId: 'sub-1', label: 'Bài 1'}));
    expect(await screen.findByTestId('correction-view')).toBeInTheDocument();
    expect(hb.submission).toHaveBeenCalledWith('sub-1');
  });
});
