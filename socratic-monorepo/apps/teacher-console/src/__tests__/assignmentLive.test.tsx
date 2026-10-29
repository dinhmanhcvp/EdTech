import React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import '@testing-library/jest-dom';
import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';

const hub = vi.hoisted(() => ({
  periodSummary: vi.fn(), runSubmissions: vi.fn(), review: vi.fn(), show: vi.fn(), closeRun: vi.fn(), setDue: vi.fn(),
  submissionBlobUrl: vi.fn(), streamTeacher: vi.fn(),
}));
vi.mock('../lib/hub', async () => ({...(await vi.importActual<typeof import('../lib/hub')>('../lib/hub')), hub}));

import {AssignmentLive} from '../components/AssignmentLive';

const metrics = {runId: 'run-1', questions: [
  {questionId: 'q1', label: 'Câu 1', submittedRate: 0.5, correctRate: 1, firstTryRate: 1, wrongAnswers: [], pending: 0},
  {questionId: 'q4', label: 'Câu 4', submittedRate: 0.5, correctRate: null, firstTryRate: null, wrongAnswers: [{answer: 'x = 8', count: 2}], pending: 1},
], students: [{studentId: 's-1', name: 'Lan', score10: 10, pending: 1, done: 2}, {studentId: 's-2', name: 'Minh', score10: null, pending: 0, done: 0}]};

const summary = {periodId: 'p1', pending: 1, needsSupport: [{studentId: 's-2', name: 'Minh', reasons: ['three_wrong_in_a_row']}], resources: [],
  runs: [{runId: 'run-1', code: 'ABCD2345', url: 'u', assignmentId: 'a1', classId: 'cc', periodId: 'p1', openedAt: 1, closedAt: null, dueAt: null, phase: 'in_class', title: 'Phương trình', metrics}]};

const rows = [
  {submissionId: 'sub-1', studentId: 's-1', name: 'Lan', questionId: 'q1', mode: 'choice', status: 'graded', score: 1, attempt: 1, phase: 'in_class', answer: '1', confirmed: null, ocr: null, grade: null, hasPhoto: false},
  {submissionId: 'sub-2', studentId: 's-1', name: 'Lan', questionId: 'q4', mode: 'photo', status: 'pending_teacher', score: null, attempt: 1, phase: 'in_class', answer: 'Vì cân bằng', confirmed: ['Vì cân bằng'], ocr: null, grade: {summary: 'Lập luận đúng hướng'}, hasPhoto: true},
];

let emit: (e: {type: string}) => void = () => {};

beforeEach(() => {
  vi.clearAllMocks();
  hub.periodSummary.mockResolvedValue(summary);
  hub.runSubmissions.mockResolvedValue(rows);
  hub.submissionBlobUrl.mockResolvedValue('blob:photo');
  hub.streamTeacher.mockImplementation((onEvent: (e: {type: string}) => void) => {
    emit = onEvent;
    return () => {};
  });
});

describe('AssignmentLive', () => {
  it('shows the grid with statuses and support flags', async () => {
    render(<AssignmentLive periodId="p1" live />);
    const grid = await screen.findByTestId('grid-run-1');
    const lan = within(grid).getByText('Lan').closest('tr') as HTMLElement;
    expect(within(lan).getByTestId('cell-q1')).toHaveAttribute('data-status', 'graded');
    expect(within(lan).getByTestId('cell-q4')).toHaveAttribute('data-status', 'pending_teacher');
    expect(screen.getByText(/Minh/, {selector: '[data-testid="support"] *'})).toBeInTheDocument();
    expect(screen.getByText('x = 8 (2)')).toBeInTheDocument();
  });

  it('reviews a pending submission and shows it on the board', async () => {
    hub.review.mockResolvedValue({status: 'teacher_confirmed'});
    hub.show.mockResolvedValue({});
    render(<AssignmentLive periodId="p1" live />);
    const item = await screen.findByTestId('pending-sub-2');
    expect(within(item).getByText('Vì cân bằng')).toBeInTheDocument();
    fireEvent.click(within(item).getByTestId('review-correct'));
    await waitFor(() => expect(hub.review).toHaveBeenCalledWith('sub-2', 1));
    fireEvent.click(within(item).getByTestId('show-on-board'));
    await waitFor(() => expect(hub.show).toHaveBeenCalledWith('run-1', 'sub-2'));
  });

  it('reloads when the teacher stream reports a submission', async () => {
    render(<AssignmentLive periodId="p1" live />);
    await screen.findByTestId('grid-run-1');
    expect(hub.periodSummary).toHaveBeenCalledTimes(1);
    await act(async () => emit({type: 'submission_update'}));
    await waitFor(() => expect(hub.periodSummary).toHaveBeenCalledTimes(2));
  });

  it('keeps the grid through one failed refresh and clears the error on the next success', async () => {
    render(<AssignmentLive periodId="p1" live />);
    await screen.findByTestId('grid-run-1');
    hub.periodSummary.mockRejectedValueOnce(new Error('offline'));
    await act(async () => emit({type: 'submission_update'}));
    expect(await screen.findByText(/Không tải được bài tập của tiết./)).toBeInTheDocument();
    expect(screen.getByTestId('grid-run-1')).toBeInTheDocument();
    await act(async () => emit({type: 'submission_update'}));
    await waitFor(() => expect(screen.queryByText(/Không tải được bài tập của tiết./)).not.toBeInTheDocument());
  });

  it('closes a run with a due date', async () => {
    hub.closeRun.mockResolvedValue({});
    render(<AssignmentLive periodId="p1" live />);
    fireEvent.click(await screen.findByTestId('close-run-1'));
    await waitFor(() => expect(hub.closeRun).toHaveBeenCalledWith('run-1'));
  });

  it('shows nothing when the period has no assignments', async () => {
    hub.periodSummary.mockResolvedValue({...summary, runs: [], pending: 0, needsSupport: []});
    render(<AssignmentLive periodId="p1" live={false} />);
    expect(await screen.findByText('Tiết này chưa giao bài tập nào.')).toBeInTheDocument();
  });
});
