import React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import '@testing-library/jest-dom';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';

const push = vi.fn();
const replace = vi.fn();
vi.mock('next/navigation', () => ({useRouter: () => ({push, replace}), usePathname: () => '/'}));
vi.mock('next/link', () => ({default: ({href, children, ...rest}: any) => <a href={href} {...rest}>{children}</a>}));

const mockApi = vi.hoisted(() => ({me: vi.fn(), classes: vi.fn(), periods: vi.fn(), simCatalog: vi.fn(), lessons: vi.fn(), updatePeriod: vi.fn(), startPeriod: vi.fn(), live: vi.fn(), endPeriod: vi.fn(), logout: vi.fn()}));
vi.mock('../lib/api', async () => ({...(await vi.importActual<typeof import('../lib/api')>('../lib/api')), api: mockApi}));
const hub = vi.hoisted(() => ({
  linkClass: vi.fn(), classMetrics: vi.fn(), plan: vi.fn(), resources: vi.fn(), classRuns: vi.fn(), resource: vi.fn(), runSubmissions: vi.fn(),
  periodSummary: vi.fn(), students: vi.fn(),
}));
vi.mock('../lib/hub', async () => ({...(await vi.importActual<typeof import('../lib/hub')>('../lib/hub')), hub}));

import {setToken} from '../lib/api';
import Cockpit from '../app/page';
import Simulations from '../app/simulations/page';
import {XRayDrawer, answerText} from '../components/XRayDrawer';
import type {GridRow, StudentMetrics} from '../lib/hub';
import type {Period} from '../lib/types';

const CLASSES = [{id: 'c1', name: '10A1', grade: '10', subject: 'Vật lí', size: 38, notes: ''}, {id: 'c2', name: '11B2', grade: '11', subject: 'Hóa', size: 34, notes: ''}];
const period = (over: Partial<Period> = {}): Period => ({id: 'p1', class_id: 'c1', lesson_id: 'l1', title: 'Tiết 25 – Ném ngang', goals: 'Tính tầm xa', notes: 'Câu hỏi nhanh đầu giờ.', prompts: ['Vẽ quỹ đạo'], status: 'planned', room_id: null, created_at: 1, started_at: null, ended_at: null, has_snapshot: false, submission_count: 0, resource_ids: ['r1'], sims: ['SIM_B'], plan_id: 'plan1', ...over});
const NOW = Math.floor(Date.now() / 1000);
const student = (name: string, over: Partial<StudentMetrics> = {}): StudentMetrics => ({studentId: name, name, mastery: {nem: 0.2}, done: 3, total: 5, firstTryRate: 0.5, hintsPerItem: 1, minutes: 7, lastActive: NOW - 600, needsSupport: false, supportReasons: [], ...over});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  setToken('tok');
  mockApi.me.mockResolvedValue({teacher: {id: 't', username: 'co', display_name: 'Cô Lan'}});
  mockApi.classes.mockResolvedValue(CLASSES);
  mockApi.periods.mockResolvedValue([period()]);
  mockApi.simCatalog.mockResolvedValue([{id: 'SIM_A', engine: 'PHYSICS', title: 'Thực hành: ném ngang'}, {id: 'SIM_B', engine: 'PHYSICS', title: 'Rơi tự do'}, {id: 'SIM_C', engine: 'BIOLOGY', title: 'Quang hợp'}]);
  mockApi.lessons.mockResolvedValue([{id: 'l1', title: 'Bài ném ngang', folder: 'Lý 10', page_count: 2, stroke_count: 3, created_at: 1, updated_at: 1}]);
  mockApi.updatePeriod.mockResolvedValue(period());
  hub.linkClass.mockResolvedValue({hubClassId: 'h1'});
  hub.classMetrics.mockResolvedValue({classId: 'h1', kcs: [{id: 'nem', label: 'Chuyển động ném'}], heatmap: {}, progress: 0.5, students: [student('An', {needsSupport: true}), student('Bình'), student('Chi', {mastery: {nem: 0.9}})]});
  hub.plan.mockResolvedValue({id: 'plan1', version: 1, body: {title: 'Bài 12', subject: 'PHYSICS', boardContext: '', sections: [{id: 's1', title: 'Khởi động', objective: 'Gợi trực giác', kcs: [], items: []}]}});
  hub.resources.mockResolvedValue([{id: 'r1', title: 'Đề 15 phút', subject: 'PHYSICS', kind: 'exam', source: 'file', currentVersion: 1, pageCount: 2, updatedAt: 1}]);
});

describe('khung chung: thanh gạt ba trạng thái', () => {
  it('chọn lớp, đổi trạng thái bằng phím 1/2/3 nhưng không khi đang gõ chữ, nhớ lựa chọn', async () => {
    render(<Cockpit />);
    expect(await screen.findByTestId('class-picker')).toHaveValue('c1');
    expect(screen.getByTestId('stage-before')).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(window, {key: '3'});
    expect(screen.getByTestId('stage-after')).toHaveAttribute('aria-selected', 'true');
    expect(localStorage.getItem('console_stage')).toBe('after');
    const box = document.createElement('input');
    document.body.appendChild(box);
    fireEvent.keyDown(box, {key: '2'});
    expect(screen.getByTestId('stage-after')).toHaveAttribute('aria-selected', 'true'); // gõ số vào ô nhập không đổi trạng thái
    fireEvent.keyDown(window, {key: '2', ctrlKey: true});
    expect(screen.getByTestId('stage-after')).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByTestId('stage-live'));
    expect(screen.getByTestId('stage-live')).toHaveAttribute('aria-selected', 'true');
    fireEvent.change(screen.getByTestId('class-picker'), {target: {value: 'c2'}});
    expect(localStorage.getItem('console_class')).toBe('c2');
  });

  it('thanh bên liệt kê tiết sắp tới của lớp đang xem, tiết đang dạy lên đầu', async () => {
    mockApi.periods.mockResolvedValue([period({id: 'a', title: 'Đã soạn'}), period({id: 'b', title: 'Đang dạy', status: 'live'}), period({id: 'c', title: 'Đã dạy', status: 'ended'}), period({id: 'd', title: 'Lớp khác', class_id: 'c2'})]);
    render(<Cockpit />);
    await waitFor(() => expect(screen.getAllByTestId('upcoming-item')).toHaveLength(2));
    expect(screen.getAllByTestId('upcoming-item').map((e) => e.textContent)).toEqual([expect.stringContaining('Đang dạy'), expect.stringContaining('Đã soạn')]);
  });
});

describe('Trước giờ học', () => {
  it('tóm tắt từ số liệu thật, kịch bản ghép từ giáo án và tài nguyên của tiết kế tiếp', async () => {
    render(<Cockpit />);
    const brief = await screen.findByTestId('briefing');
    await waitFor(() => expect(brief).toHaveTextContent('3/3 học sinh lớp 10A1 học sau giờ'));
    expect(brief).toHaveTextContent('1 em cần hỗ trợ: An.');
    expect(brief).toHaveTextContent('Chuyển động ném');
    await waitFor(() => expect(screen.getAllByTestId('scene').map((s) => s.dataset.kind)).toEqual(['board', 'plan', 'sim', 'resource']));
    expect(screen.getByTestId('next-period')).toHaveTextContent('Tiết 25 – Ném ngang');
  });

  it('"Đẩy vào kịch bản" chỉ thêm một dòng vào ghi chú, giữ nguyên mọi trường khác của tiết', async () => {
    render(<Cockpit />);
    await waitFor(() => expect(screen.getByTestId('briefing-push')).toBeEnabled());
    fireEvent.click(screen.getByTestId('briefing-push'));
    await waitFor(() => expect(mockApi.updatePeriod).toHaveBeenCalledTimes(1));
    const [id, body] = mockApi.updatePeriod.mock.calls[0];
    expect(id).toBe('p1');
    expect(body.notes).toMatch(/^Câu hỏi nhanh đầu giờ\.\n\[Gợi ý từ số liệu học sau giờ\] Đầu giờ ôn nhanh “Chuyển động ném”/);
    expect(body).toMatchObject({title: 'Tiết 25 – Ném ngang', class_id: 'c1', lesson_id: 'l1', goals: 'Tính tầm xa', prompts: ['Vẽ quỹ đạo'], resource_ids: ['r1'], sims: ['SIM_B'], plan_id: 'plan1'});
    expect(await screen.findByTestId('briefing-note')).toBeInTheDocument();
  });

  it('không có tiết đã soạn thì không đẩy được và nói rõ', async () => {
    mockApi.periods.mockResolvedValue([]);
    render(<Cockpit />);
    await waitFor(() => expect(screen.getByText('Chưa có tiết đã soạn để đẩy vào.')).toBeInTheDocument());
    expect(screen.getByTestId('briefing-push')).toBeDisabled();
    expect(screen.getByText('Soạn một tiết để dựng kịch bản.')).toBeInTheDocument();
    expect(mockApi.updatePeriod).not.toHaveBeenCalled();
  });

  it('"Bắt đầu tiết" gọi máy chủ, nhớ mã ghép và chuyển sang trạng thái Đang dạy', async () => {
    mockApi.startPeriod.mockResolvedValue({pairCode: 'ABC123', expiresIn: 600, roomId: 'r', period: period({status: 'live'})});
    render(<Cockpit />);
    fireEvent.click(await screen.findByTestId('next-start'));
    await waitFor(() => expect(screen.getByTestId('stage-live')).toHaveAttribute('aria-selected', 'true'));
    expect(mockApi.startPeriod).toHaveBeenCalledWith('p1');
    expect(sessionStorage.getItem('console_pair_p1')).toBe('ABC123');
  });
});

describe('Ngăn kéo X-quang nhận thức', () => {
  const row = (over: Partial<GridRow>): GridRow => ({submissionId: 's', studentId: 'An', name: 'An', questionId: 'q1', mode: 'typed', status: 'graded', score: 0, attempt: 1, phase: 'in_class', answer: '0', confirmed: null, ocr: null, grade: null, hasPhoto: false, ...over});
  const asg = {id: 'a1', title: 'Bài tập ném', body: {title: 'Bài tập ném', subject: 'PHYSICS', kind: 'exercise', questions: [
    {id: 'q1', type: 'short', label: 'Câu 2', text: 'Ném ngang từ 20 m, thời gian rơi?', kcs: [{id: 'nem', label: 'Chuyển động ném'}]},
    {id: 'q2', type: 'choice', label: 'Câu 1', text: 'Quỹ đạo là', options: ['Thẳng', 'Parabol'], kcs: [{id: 'khac', label: 'Khác'}]},
  ]}};
  const open = (kc: string | null) => {
    const onClose = vi.fn();
    render(<XRayDrawer student={student('An', {supportReasons: ['low_mastery:nem', 'three_wrong_in_a_row']})} kcId={kc} hubClassId="h1" kcLabel={(id) => (id === 'nem' ? 'Chuyển động ném' : id)} onClose={onClose} />);
    return onClose;
  };
  beforeEach(() => {
    hub.classRuns.mockResolvedValue([{runId: 'r1', assignmentId: 'a1', classId: 'h1', periodId: null, openedAt: 5, closedAt: null, dueAt: null, phase: 'homework'}]);
    hub.resource.mockResolvedValue(asg);
    hub.runSubmissions.mockResolvedValue([row({}), row({submissionId: 's2', studentId: 'An', questionId: 'q2', mode: 'choice', answer: '1', score: 1, status: 'graded'}), row({submissionId: 's3', studentId: 'Khác', answer: '9'})]);
  });

  it('hiện lí do cần hỗ trợ, mức nắm vững, và chỉ bài của em đó thuộc kiến thức đang xem, kèm nhận xét máy chấm', async () => {
    hub.runSubmissions.mockResolvedValue([row({grade: {summary: 'Quên đổi dấu khi chuyển vế', first_error: 1}}), row({submissionId: 's9', studentId: 'Khác'})]);
    open('nem');
    const items = await screen.findAllByTestId('xray-item');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('Sai');
    expect(items[0]).toHaveTextContent('Quên đổi dấu khi chuyển vế');
    expect(items[0]).toHaveTextContent('Sai từ dòng 2.');
    expect(screen.getByTestId('xray-reasons')).toHaveTextContent('Chưa vững: Chuyển động ném');
    expect(screen.getByTestId('xray-reasons')).toHaveTextContent('Sai 3 câu liên tiếp');
    expect(hub.runSubmissions).toHaveBeenCalledWith('r1');
  });

  it('kiến thức chưa có câu nào thì hiện mọi câu em đã làm và nói rõ; trắc nghiệm hiện chữ phương án', async () => {
    open('khong-co');
    expect(await screen.findAllByTestId('xray-item')).toHaveLength(2);
    expect(screen.getByText('Chưa có câu nào gắn kiến thức này; hiện mọi câu em đã làm.')).toBeInTheDocument();
    expect(screen.getByText('Parabol')).toBeInTheDocument();
    expect(answerText(row({mode: 'photo', answer: null, confirmed: ['x = 2', 'x + 1']}), null)).toBe('x = 2\nx + 1');
  });

  it('đóng bằng phím Esc, nút đóng và bấm nền; lỗi mạng báo bằng tiếng Việt', async () => {
    const onClose = open(null);
    await screen.findAllByTestId('xray-item');
    fireEvent.keyDown(window, {key: 'Escape'});
    fireEvent.click(screen.getByTestId('xray-close'));
    expect(onClose).toHaveBeenCalledTimes(2);
    hub.classRuns.mockRejectedValue(new Error('x'));
    open(null);
    expect(await screen.findByText('Không tải được bài làm.')).toBeInTheDocument();
  });

  it('em chưa nộp bài nào thì nói rõ', async () => {
    hub.runSubmissions.mockResolvedValue([]);
    open(null);
    expect(await screen.findByTestId('xray-empty')).toBeInTheDocument();
  });
});

describe('Kho mô phỏng', () => {
  it('tìm không dấu, lọc theo môn, chỉ thêm được sau khi chọn tiết, không thêm trùng', async () => {
    mockApi.periods.mockResolvedValue([period()]);
    render(<Simulations />);
    await waitFor(() => expect(screen.getAllByTestId('sim-card')).toHaveLength(3));
    expect(screen.getAllByTestId('sim-add')[0]).toBeDisabled();
    fireEvent.change(screen.getByTestId('sim-search'), {target: {value: 'nem ngang'}});
    expect(screen.getAllByTestId('sim-card')).toHaveLength(1);
    fireEvent.change(screen.getByTestId('sim-search'), {target: {value: ''}});
    fireEvent.click(screen.getByTestId('sim-engine-BIOLOGY'));
    expect(screen.getAllByTestId('sim-card')).toHaveLength(1);
    fireEvent.click(screen.getByTestId('sim-engine-all'));
    fireEvent.change(screen.getByTestId('sim-target'), {target: {value: 'p1'}});
    const cards = screen.getAllByTestId('sim-card');
    expect(within(cards[1]).getByTestId('sim-add')).toBeDisabled(); // SIM_B đã có trong tiết
    fireEvent.click(within(cards[0]).getByTestId('sim-add'));
    await waitFor(() => expect(mockApi.updatePeriod).toHaveBeenCalledTimes(1));
    expect(mockApi.updatePeriod.mock.calls[0][1]).toMatchObject({sims: ['SIM_B', 'SIM_A'], resource_ids: ['r1'], plan_id: 'plan1', title: 'Tiết 25 – Ném ngang'});
  });
});
