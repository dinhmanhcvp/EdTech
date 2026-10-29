import React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import '@testing-library/jest-dom/vitest';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';

const api = vi.hoisted(() => ({
  login: vi.fn(), byCode: vi.fn(), answer: vi.fn(), uploadPhoto: vi.fn(), confirm: vi.fn(), myAssignments: vi.fn(), myResources: vi.fn(),
  myPeriods: vi.fn(), pageUrl: vi.fn(), submissionUrl: vi.fn(), mySubmission: vi.fn(), parentReport: vi.fn(),
}));
vi.mock('../utils/hubApi', async () => ({...(await vi.importActual<typeof import('../utils/hubApi')>('../utils/hubApi')), hubApi: api}));
vi.mock('../components/companion/LessonChat', () => ({LessonChat: ({source}: {source?: {runId: string}}) => <div data-testid="lesson-chat">{source?.runId}</div>}));

import {HubApiError, hubFetch, loadStudent, saveStudent} from '../utils/hubApi';
import {AssignmentPage} from '../components/hub/AssignmentPage';
import {HubHome} from '../components/hub/HubHome';
import {ParentReportView} from '../components/hub/ParentReportView';

const run = {
  runId: 'run-1', phase: 'in_class', dueAt: null, id: 'asg-1', version: 2, title: 'Phương trình', subject: 'MATH', kind: 'exercise',
  pages: [{page: 0, width: 1000, height: 1400}],
  body: {title: 'x', subject: 'MATH', kind: 'exercise', questions: [
    {id: 'q1', type: 'choice', label: 'Câu 1', text: 'Nghiệm của $2x=4$', options: ['1', '2'], kcs: []},
    {id: 'q2', type: 'short', label: 'Câu 2', text: 'Tính 3·4', kcs: []},
    {id: 'q3', type: 'essay', label: 'Câu 3', text: 'Giải x+3=5', kcs: []},
  ]},
  mine: {q1: {status: 'graded', score: 1, attempt: 1}},
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  api.pageUrl.mockResolvedValue('blob:page');
});

describe('student hub client', () => {
  it('keeps the student token and sends it', async () => {
    saveStudent({token: 'tok-s', student: {id: 's-1', name: 'Lan', classId: 'cc', className: '10A3'}});
    expect(loadStudent()?.student.name).toBe('Lan');
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({detail: 'not_in_class'}), {status: 403}));
    await expect(hubFetch('GET', '/runs/by-code/X', undefined, fetchImpl as unknown as typeof fetch)).rejects.toThrow('Bài này không dành cho lớp của em.');
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe('Bearer tok-s');
    expect(new HubApiError('x', 1)).toBeInstanceOf(Error);
  });
});

describe('AssignmentPage', () => {
  it('asks for the student code first, then opens the assignment', async () => {
    api.login.mockResolvedValue({token: 'tok', student: {id: 's-1', name: 'Lan', classId: 'cc', className: '10A3'}});
    api.byCode.mockResolvedValue(run);
    render(<AssignmentPage code="ABCD2345" />);
    fireEvent.change(screen.getByTestId('login-code'), {target: {value: 'an2345'}});
    fireEvent.click(screen.getByTestId('login-submit'));
    expect(await screen.findByText('Phương trình')).toBeInTheDocument();
    expect(api.login).toHaveBeenCalledWith('an2345');
    expect(within(screen.getByTestId('q-q1')).getByText('Đúng')).toBeInTheDocument();
  });

  it('answers choice and short questions with the version the student saw', async () => {
    saveStudent({token: 'tok', student: {id: 's-1', name: 'Lan', classId: 'cc', className: '10A3'}});
    api.byCode.mockResolvedValue({...run, mine: {}});
    api.answer.mockResolvedValue({submissionId: 'sub', status: 'graded', score: 0, attempt: 1});
    render(<AssignmentPage code="ABCD2345" />);
    const q1 = await screen.findByTestId('q-q1');
    fireEvent.click(within(q1).getByText('B. 2'));
    await waitFor(() => expect(api.answer).toHaveBeenCalledWith('run-1', expect.objectContaining({questionId: 'q1', version: 2, choice: 1})));
    const q2 = screen.getByTestId('q-q2');
    fireEvent.change(within(q2).getByTestId('short-input'), {target: {value: '12'}});
    fireEvent.click(within(q2).getByTestId('short-submit'));
    await waitFor(() => expect(api.answer).toHaveBeenCalledWith('run-1', expect.objectContaining({questionId: 'q2', text: '12'})));
    expect(await within(q1).findByText('Sai')).toBeInTheDocument();
  });

  it('photo flow: must resolve every uncertain character before submitting', async () => {
    saveStudent({token: 'tok', student: {id: 's-1', name: 'Lan', classId: 'cc', className: '10A3'}});
    api.byCode.mockResolvedValue({...run, mine: {}});
    api.uploadPhoto.mockResolvedValue({photoId: 'p1', lines: [{latex: 'x + 3 = 5'}, {latex: 'x = 2'}], uncertain: [{line: 1, token: '2', alternatives: ['Z'], x: 0.5, y: 0.3}]});
    api.confirm.mockResolvedValue({photoId: 'p1', submissionId: 'p1', status: 'graded', score: 1, attempt: 1});
    render(<AssignmentPage code="ABCD2345" />);
    const q3 = await screen.findByTestId('q-q3');
    const file = new File(['jpg'], 'vo.jpg', {type: 'image/jpeg'});
    fireEvent.change(within(q3).getByTestId('photo-input'), {target: {files: [file]}});
    const confirmBox = await screen.findByTestId('confirm-box');
    const submit = within(confirmBox).getByTestId('confirm-submit');
    expect(submit).toBeDisabled();
    fireEvent.click(within(confirmBox).getByText('Z'));
    expect(within(confirmBox).getByDisplayValue('x = Z')).toBeInTheDocument();
    expect(submit).not.toBeDisabled();
    fireEvent.click(submit);
    await waitFor(() => expect(api.confirm).toHaveBeenCalledWith('run-1', 'p1', {lines: ['x + 3 = 5', 'x = Z'], resolved: [0], photoOnly: false}));
  });

  it('goes back to the code form when the session expires mid-assignment', async () => {
    saveStudent({token: 'tok', student: {id: 's-1', name: 'Lan', classId: 'cc', className: '10A3'}});
    api.byCode.mockResolvedValue({...run, mine: {}});
    api.answer.mockRejectedValue(new HubApiError('Phiên đăng nhập đã hết hạn. Nhập lại mã học sinh.', 401));
    render(<AssignmentPage code="ABCD2345" />);
    fireEvent.click(within(await screen.findByTestId('q-q1')).getByText('A. 1'));
    expect(await screen.findByTestId('login-code')).toBeInTheDocument();
  });

  it('explains when the run is closed or for another class', async () => {
    saveStudent({token: 'tok', student: {id: 's-1', name: 'Lan', classId: 'cc', className: '10A3'}});
    api.byCode.mockRejectedValue(new HubApiError('Đã hết hạn nhận bài.', 410));
    render(<AssignmentPage code="ABCD2345" />);
    expect(await screen.findByText('Đã hết hạn nhận bài.')).toBeInTheDocument();
  });
});

describe('HubHome', () => {
  beforeEach(() => saveStudent({token: 'tok', student: {id: 's-1', name: 'Lan', classId: 'cc', className: '10A3'}}));

  it('lists assignments and opens the Socratic review once the run is over', async () => {
    api.myAssignments.mockResolvedValue([{runId: 'run-1', code: 'ABCD2345', title: 'Phương trình', kind: 'exercise', phase: 'homework', dueAt: 2000000000, score10: 7.5,
      questions: [{questionId: 'q1', label: 'Câu 1', status: 'graded', score: 1}], corrections: [], classExamples: []}]);
    api.myResources.mockResolvedValue([]);
    api.myPeriods.mockResolvedValue([{periodId: 'p1', title: 'Tiết 3', endedAt: 1, resources: [], runs: [{runId: 'run-9', code: 'C', title: 'Đề cũ', kind: 'exam', phase: 'closed', dueAt: 1, score10: 6,
      questions: [], corrections: [], classExamples: [], lessonAvailable: true}]}]);
    render(<HubHome />);
    expect(await screen.findByText('Phương trình')).toBeInTheDocument();
    expect(screen.getByText('7.5/10')).toBeInTheDocument();
    expect(screen.getByRole('link', {name: /Làm tiếp/})).toHaveAttribute('href', '/a/ABCD2345');
    fireEvent.click(screen.getByTestId('htab-periods'));
    fireEvent.click(await screen.findByText('Học lại với gia sư'));
    expect(screen.getByTestId('lesson-chat')).toHaveTextContent('run-9');
  });

  it('shows the class resources and opens a page viewer', async () => {
    api.myAssignments.mockResolvedValue([]);
    api.myPeriods.mockResolvedValue([]);
    api.myResources.mockResolvedValue([{assignmentId: 'asg-s', title: 'Bài giảng hàm số', kind: 'slides', pages: [{page: 0, width: 1000, height: 1400}, {page: 1, width: 1000, height: 1400}], openedAt: 1, periodId: 'p1', periodTitle: 'Tiết 3'}]);
    render(<HubHome />);
    fireEvent.click(screen.getByTestId('htab-resources'));
    fireEvent.click(await screen.findByText('Bài giảng hàm số'));
    expect(await screen.findByText('Trang 1/2')).toBeInTheDocument();
  });
});

describe('ParentReportView', () => {
  it('shows the weekly report in plain words', async () => {
    api.parentReport.mockResolvedValue({student: {name: 'Lan', className: '10A3'}, lastWeek: null,
      thisWeek: {week: '2026-W44', lessons: ['Phương trình'], activeDays: 3, minutes: 42, done: 9, improved: ['Phương trình'], needsHelp: [], tips: ['Khen con vì đã học đều đặn.'],
        comment: 'Tuần này con học 3 ngày.', source: 'template', vsLastWeek: {minutesDelta: 10, activeDaysDelta: 1}, assignments: {correct: 4, total: 5, runs: 2, onTime: 2}}});
    render(<ParentReportView token="tok-p" />);
    expect(await screen.findByText('Lan · 10A3')).toBeInTheDocument();
    expect(screen.getByText('Tuần này con học 3 ngày.')).toBeInTheDocument();
    expect(screen.getByText('Khen con vì đã học đều đặn.')).toBeInTheDocument();
    expect(api.parentReport).toHaveBeenCalledWith('tok-p');
  });
});
