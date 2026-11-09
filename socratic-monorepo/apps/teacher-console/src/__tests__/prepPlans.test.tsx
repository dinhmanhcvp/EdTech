import React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import '@testing-library/jest-dom';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';

vi.mock('next/navigation', () => ({useRouter: () => ({replace: vi.fn(), push: vi.fn()}), usePathname: () => '/plans'}));
vi.mock('next/link', () => ({default: ({href, children, ...rest}: any) => <a href={href} {...rest}>{children}</a>}));

const hub = vi.hoisted(() => ({
  linkClass: vi.fn(), students: vi.fn(), addStudents: vi.fn(), rotateParentLink: vi.fn(), reportNow: vi.fn(), classMetrics: vi.fn(),
  plans: vi.fn(), plan: vi.fn(), createPlan: vi.fn(), savePlan: vi.fn(), sectionMetrics: vi.fn(), suggest: vi.fn(), applySuggestion: vi.fn(),
}));
vi.mock('../lib/hub', async () => ({...(await vi.importActual<typeof import('../lib/hub')>('../lib/hub')), hub}));

import {setToken} from '../lib/api';
import {supportReason, type PlanBody} from '../lib/hub';
import {ClassMetricsPanel} from '../components/ClassMetricsPanel';
import {StudentsPanel} from '../components/StudentsPanel';
import {PeriodPrep} from '../components/PeriodPrep';
import {PlanEditor, blankPlan, kcId, planProblems} from '../components/PlanEditor';
import type {Period} from '../lib/types';

const period = (over: Partial<Period> = {}): Period => ({id: 'p1', class_id: null, lesson_id: null, title: 'Tiết 1', goals: '', notes: '', prompts: [], status: 'planned', room_id: null, created_at: 1, started_at: null, ended_at: null, has_snapshot: false, submission_count: 0, ...over});
const CATALOG = [{id: 'PHYS_LAB_PENDULUM_G', engine: 'PHYSICS', title: 'Thực hành: đo g bằng con lắc đơn'}, {id: 'BIO_LAB_ENZYME', engine: 'BIOLOGY', title: 'Thực hành: hoạt tính enzyme amylase'}];
const PLAN: PlanBody = {title: 'Bài 12', subject: 'PHYSICS', boardContext: '', sections: [{id: 's-1', title: 'Khởi động', objective: '', kcs: [{id: 'nem-ngang', label: 'Ném ngang'}], items: [{id: 'it-1', type: 'problem', text: 'Tính tầm xa', answer: '20'}]}]};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  setToken('tok');
  hub.linkClass.mockResolvedValue({hubClassId: 'h1'});
});

describe('chỉ số lớp', () => {
  it('hiện tiến độ, học sinh cần hỗ trợ kèm lí do và bản đồ nắm vững', async () => {
    hub.classMetrics.mockResolvedValue({
      classId: 'h1', progress: 0.5, kcs: [{id: 'pt', label: 'Phương trình'}], heatmap: {},
      students: [
        {studentId: 'a', name: 'An', mastery: {pt: 0.2}, done: 3, total: 6, firstTryRate: 0.33, hintsPerItem: 1, minutes: 12, lastActive: 1700000000, needsSupport: true, supportReasons: ['low_mastery:pt', 'three_wrong_in_a_row']},
        {studentId: 'b', name: 'Bình', mastery: {}, done: 0, total: 6, firstTryRate: null, hintsPerItem: 0, minutes: 0, lastActive: null, needsSupport: false, supportReasons: []},
      ],
    });
    render(<ClassMetricsPanel consoleClassId="c1" />);
    expect(await screen.findByTestId('metrics-progress')).toHaveTextContent('50%');
    expect(screen.getByTestId('metrics-needs')).toHaveTextContent('An: Chưa vững: Phương trình; Sai 3 câu liên tiếp');
    expect(screen.getAllByTestId('metrics-row')).toHaveLength(2);
    const pill = within(screen.getAllByTestId('metrics-row')[0]).getByTestId('status-pill');
    expect(pill).toHaveAttribute('data-level', 'stuck');
    expect(pill).toHaveTextContent('Mắc kẹt');
    expect(pill).toHaveTextContent('20%');
    expect(hub.linkClass).toHaveBeenCalledWith('c1');
    expect(hub.classMetrics).toHaveBeenCalledWith('h1');
  });

  it('báo lỗi tiếng Việt khi không tải được', async () => {
    hub.classMetrics.mockRejectedValue(new Error('x'));
    render(<ClassMetricsPanel consoleClassId="c1" />);
    expect(await screen.findByText('Không tải được chỉ số lớp.')).toBeInTheDocument();
    expect(supportReason('khac', (x) => x)).toBe('khac');
  });
});

describe('báo cáo phụ huynh', () => {
  it('chốt báo cáo tuần của một học sinh và xem trước', async () => {
    hub.students.mockResolvedValue([{id: 's1', name: 'An', loginCode: 'ABC', parentToken: 'pt'}]);
    hub.reportNow.mockResolvedValue({week: '2026-W45', lessons: [], activeDays: 3, minutes: 40, done: 9, improved: ['Phương trình'], needsHelp: [], tips: ['Học đều mỗi ngày'], comment: 'Con chăm chỉ.', source: 'template', vsLastWeek: {minutesDelta: 0, activeDaysDelta: 0}});
    render(<StudentsPanel consoleClassId="c1" />);
    fireEvent.click(await screen.findByTestId('report-now'));
    const box = await screen.findByTestId('report-preview');
    expect(box).toHaveTextContent('Tuần 2026-W45 · 3 ngày học · 40 phút · 9 câu');
    expect(box).toHaveTextContent('Con chăm chỉ.');
    expect(box).toHaveTextContent('Tiến bộ: Phương trình');
    expect(hub.reportNow).toHaveBeenCalledWith('s1');
  });
});

describe('soạn tiết: tài nguyên, mô phỏng, giáo án', () => {
  it('chọn tài nguyên, thêm mô phỏng bằng tìm kiếm không dấu, chọn giáo án; lưu gửi đủ', async () => {
    const onSave = vi.fn();
    render(
      <PeriodPrep period={period()} classes={[]} lessons={[]} onSave={onSave}
        resources={[{id: 'r1', title: 'Đề 15 phút', subject: 'MATH', kind: 'exam', source: 'pdf', currentVersion: 1, pageCount: 1, updatedAt: 1}]}
        plans={[{id: 'plan1', title: 'Bài 12', subject: 'PHYSICS', currentVersion: 2}]} catalog={CATALOG} />,
    );
    fireEvent.click(screen.getByTestId('prep-pick-r1')); // tài nguyên duy nhất trên kệ đang mở bìa
    fireEvent.change(screen.getByTestId('prep-sim-search'), {target: {value: 'con lac'}});
    fireEvent.click(screen.getByTestId('prep-sim-add-PHYS_LAB_PENDULUM_G'));
    expect(screen.getByTestId('prep-sim-chip')).toHaveTextContent('con lắc đơn');
    fireEvent.change(screen.getByTestId('prep-plan'), {target: {value: 'plan1'}});
    fireEvent.submit(screen.getByTestId('period-prep'));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toMatchObject({resource_ids: ['r1'], sims: ['PHYS_LAB_PENDULUM_G'], plan_id: 'plan1'});
  });

  it('nạp lại lựa chọn đã lưu; bỏ mô phỏng bằng nút ×', () => {
    render(<PeriodPrep period={period({sims: ['BIO_LAB_ENZYME']})} classes={[]} lessons={[]} onSave={vi.fn()} catalog={CATALOG} />);
    expect(screen.getByTestId('prep-sim-chip')).toHaveTextContent('enzyme');
    fireEvent.click(screen.getByLabelText('Bỏ mô phỏng'));
    expect(screen.queryByTestId('prep-sim-chip')).toBeNull();
  });
});

describe('giáo án theo mục', () => {
  it('mã kiến thức bỏ dấu, ổn định; kiểm lỗi trước khi lưu', () => {
    expect(kcId('Phương trình bậc hai')).toBe('phuong-trinh-bac-hai');
    expect(planProblems(blankPlan())).toEqual(['Giáo án cần có tên.']);
    expect(planProblems({...PLAN, sections: [{...PLAN.sections[0], items: [{id: 'x', type: 'poll', question: 'Hỏi?', options: ['A', '']}]}]})[0]).toContain('ít nhất 2 phương án');
  });

  it('tạo giáo án mới: thêm phần, kiến thức, mục mô phỏng; gửi bản đã làm sạch', async () => {
    const onSaved = vi.fn();
    hub.createPlan.mockImplementation(async (body: PlanBody) => ({id: 'plan9', version: 1, body}));
    render(<PlanEditor planId={null} catalog={CATALOG} classes={[]} onSaved={onSaved} />);
    expect(screen.getByTestId('plan-save')).toBeDisabled();
    fireEvent.change(screen.getByTestId('plan-title'), {target: {value: '  Bài 12  '}});
    fireEvent.keyDown(Object.assign(screen.getByTestId('kc-input'), {value: 'Ném ngang'}), {key: 'Enter'});
    expect(screen.getByTestId('kc-chip')).toHaveTextContent('Ném ngang');
    fireEvent.click(screen.getByTestId('add-sim'));
    expect(screen.getByTestId('plan-problems')).toHaveTextContent('chưa chọn mô phỏng');
    fireEvent.change(screen.getByTestId('plan-sim-search'), {target: {value: 'enzyme'}});
    fireEvent.click(screen.getByText('Thực hành: hoạt tính enzyme amylase'));
    fireEvent.click(screen.getByTestId('plan-save'));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('plan9'));
    const sent = hub.createPlan.mock.calls[0][0] as PlanBody;
    expect(sent.title).toBe('Bài 12');
    expect(sent.sections[0].kcs).toEqual([{id: 'nem-ngang', label: 'Ném ngang'}]);
    expect(sent.sections[0].items[0]).toMatchObject({type: 'sim', templateId: 'BIO_LAB_ENZYME'});
    expect(sent.sections[0].items[0].id).toMatch(/^[a-z0-9-]{1,40}$/);
    expect(await screen.findByTestId('plan-version')).toHaveTextContent('Phiên bản 1 · đã lưu');
  });

  it('AI gợi ý một phần theo kết quả lớp; áp dụng tạo phiên bản mới', async () => {
    hub.plan.mockResolvedValue({id: 'plan1', version: 3, body: PLAN});
    hub.sectionMetrics.mockResolvedValue({sectionId: 's-1', attemptedRate: 0.8, firstTryRate: 0.25, avgHints: 1.5, weakestKc: 'nem-ngang', needsSupport: [], wrongAnswers: []});
    hub.suggest.mockResolvedValue({source: 'gemini', suggestions: [{id: 'sg1', type: 'add_question', rationale: 'Nhiều em sai tầm xa', item: {id: 'it-9', type: 'problem', text: 'Ném ngang từ 5 m', answer: '10'}}]});
    const next: PlanBody = {...PLAN, sections: [{...PLAN.sections[0], items: [...PLAN.sections[0].items, {id: 'it-9', type: 'problem', text: 'Ném ngang từ 5 m', answer: '10'}]}]};
    hub.applySuggestion.mockResolvedValue({version: 4, body: next});
    render(<PlanEditor planId="plan1" catalog={CATALOG} classes={[{id: 'c1', name: '10A1', grade: '', subject: '', size: 0, notes: ''}]} onSaved={vi.fn()} />);
    expect(await screen.findByTestId('plan-version')).toHaveTextContent('Phiên bản 3');
    expect(screen.getByTestId('ai-suggest')).toBeDisabled(); // chưa chọn lớp
    fireEvent.change(screen.getByTestId('plan-class'), {target: {value: 'c1'}});
    await waitFor(() => expect(screen.getByTestId('ai-suggest')).toBeEnabled());
    fireEvent.click(screen.getByTestId('ai-suggest'));
    expect(await screen.findByTestId('suggestion')).toHaveTextContent('Thêm câu hỏi: Ném ngang từ 5 m (đáp số: 10)');
    expect(screen.getByTestId('section-metrics')).toHaveTextContent('đúng lần đầu 25%');
    expect(screen.getByTestId('section-metrics')).toHaveTextContent('yếu nhất: Ném ngang');
    expect(hub.suggest).toHaveBeenCalledWith('plan1', 's-1', 'h1');
    fireEvent.click(screen.getByTestId('apply-suggestion'));
    await waitFor(() => expect(screen.getByTestId('plan-version')).toHaveTextContent('Phiên bản 4 · đã lưu'));
    expect(screen.getAllByTestId('plan-item')).toHaveLength(2);
    expect(screen.queryByTestId('suggestion')).toBeNull();
  });

  it('lớp chưa có số liệu: gợi ý được đánh dấu là gợi ý chung', async () => {
    hub.plan.mockResolvedValue({id: 'plan1', version: 1, body: PLAN});
    hub.sectionMetrics.mockResolvedValue({sectionId: 's-1', attemptedRate: 0, firstTryRate: null, avgHints: 0, weakestKc: null, needsSupport: [], wrongAnswers: []});
    hub.suggest.mockResolvedValue({source: 'gemini', grounded: false, suggestions: [{id: 'sg1', type: 'add_note', rationale: 'Chưa có số liệu của lớp: nội dung hay nhầm', note: 'Nhấn mạnh tính độc lập'}]});
    render(<PlanEditor planId="plan1" catalog={CATALOG} classes={[{id: 'c1', name: '10A1', grade: '', subject: '', size: 0, notes: ''}]} onSaved={vi.fn()} />);
    await screen.findByTestId('plan-version');
    fireEvent.change(screen.getByTestId('plan-class'), {target: {value: 'c1'}});
    await waitFor(() => expect(screen.getByTestId('ai-suggest')).toBeEnabled());
    fireEvent.click(screen.getByTestId('ai-suggest'));
    expect(await screen.findByTestId('ai-ungrounded')).toHaveTextContent('Gợi ý chung');
  });

  it('AI chưa sẵn sàng: báo, không bịa gợi ý; sửa chưa lưu thì khóa nút AI', async () => {
    hub.plan.mockResolvedValue({id: 'plan1', version: 1, body: PLAN});
    hub.sectionMetrics.mockResolvedValue({sectionId: 's-1', attemptedRate: 0, firstTryRate: null, avgHints: 0, weakestKc: null, needsSupport: [], wrongAnswers: []});
    hub.suggest.mockResolvedValue({suggestions: [], source: 'offline', note: 'AI chưa sẵn sàng.'});
    render(<PlanEditor planId="plan1" catalog={CATALOG} classes={[{id: 'c1', name: '10A1', grade: '', subject: '', size: 0, notes: ''}]} onSaved={vi.fn()} />);
    await screen.findByTestId('plan-version');
    fireEvent.change(screen.getByTestId('plan-class'), {target: {value: 'c1'}});
    await waitFor(() => expect(screen.getByTestId('ai-suggest')).toBeEnabled());
    fireEvent.click(screen.getByTestId('ai-suggest'));
    expect(await screen.findByTestId('ai-note')).toHaveTextContent('AI chưa sẵn sàng.');
    expect(screen.getByTestId('section-metrics')).toHaveTextContent('Chưa có kết quả học');
    fireEvent.change(screen.getByTestId('plan-title'), {target: {value: 'Bài 12 sửa'}});
    expect(screen.getByTestId('ai-suggest')).toBeDisabled();
  });
});
