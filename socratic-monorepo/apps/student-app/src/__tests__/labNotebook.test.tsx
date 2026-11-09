import React from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import '@testing-library/jest-dom/vitest';
import {act, cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';

const api = vi.hoisted(() => ({myAssignments: vi.fn(), myResources: vi.fn(), myPeriods: vi.fn(), pageUrl: vi.fn()}));
vi.mock('../utils/hubApi', async () => ({...(await vi.importActual<typeof import('../utils/hubApi')>('../utils/hubApi')), hubApi: api}));
vi.mock('../components/companion/LessonChat', () => ({LessonChat: () => <div data-testid="lesson-chat" />}));

import {saveStudent} from '../utils/hubApi';
import {HubHome} from '../components/hub/HubHome';
import {LockedStepper, type StepItem} from '../components/companion/LockedStepper';
import {SocraticCompanionSession} from '../components/companion/SocraticCompanionSession';
import {ConceptCheckGate} from '../components/companion/ConceptCheckGate';
import {ChemicalBalanceScale} from '../components/companion/VisualDebugWidgets';
import {bandLevels} from '../components/companion/useMicLevel';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const step = (index: number, status: StepItem['status'], over: Partial<StepItem> = {}): StepItem => ({index, title: `Bước ${index}`, description: `mô tả ${index}`, status, ...over});

describe('bậc thang tư duy', () => {
  it('bước đang làm nổi lên, bước sau mờ + nhòe + khóa, bước xong có dấu tích máy chấm', () => {
    render(<LockedStepper activeStep={2} steps={[step(1, 'COMPLETED', {expectedLatex: 'x=2'}), step(2, 'ACTIVE'), step(3, 'LOCKED')]}><span data-testid="dock">ô nhập</span></LockedStepper>);
    const items = screen.getAllByRole('listitem');
    expect(items.map((li) => li.dataset.stepStatus)).toEqual(['COMPLETED', 'ACTIVE', 'LOCKED']);
    expect(screen.getByText('SYMPY VERIFIED')).toBeInTheDocument();
    expect(screen.getByTestId('dock')).toBeInTheDocument(); // ô nhập chỉ mở ở bước đang làm
    expect(items[2].innerHTML).toContain('opacity-[.45]');
    expect(items[2].innerHTML).toContain('blur(1px)');
    expect(screen.getAllByText('LOCKED')).toHaveLength(1);
  });

  it('sai thì chỉ có gợi ý hổ phách theo nấc, không có màu đỏ báo lỗi; nấc 3 mời dùng phao cứu sinh', () => {
    const onOpen = vi.fn();
    const {container} = render(<LockedStepper activeStep={1} steps={[step(1, 'ACTIVE', {strikeCount: 3, hintStrike1: 'g1', hintStrike2: 'g2', onOpenLifeline: onOpen})]} />);
    expect(screen.getByTestId('hint-strike-1')).toHaveClass('bg-hint-bg');
    expect(screen.getByTestId('hint-strike-2')).toHaveClass('bg-hint-bg');
    expect(screen.getByTestId('lifeline-container')).toHaveClass('bg-hint-bg');
    expect(container.innerHTML).not.toMatch(/rose-|red-|brand-/);
    fireEvent.click(screen.getByTestId('lifeline-btn'));
    expect(onOpen).toHaveBeenCalled();
  });

  it('bước vừa chuyển từ khóa sang mở có hiệu ứng mở khóa; lần vẽ đầu thì không', () => {
    const {rerender, container} = render(<LockedStepper activeStep={1} steps={[step(1, 'ACTIVE'), step(2, 'LOCKED')]} />);
    expect(container.querySelector('.animate-unlock-turn')).toBeNull();
    rerender(<LockedStepper activeStep={2} steps={[step(1, 'COMPLETED'), step(2, 'ACTIVE')]} />);
    expect(container.querySelector('.animate-unlock-turn')).not.toBeNull();
  });
});

describe('hàng rào Socratic', () => {
  beforeEach(() => vi.useFakeTimers());

  const ask = async (text: string) => {
    fireEvent.change(screen.getByTestId('socratic-chat-input'), {target: {value: text}});
    fireEvent.click(screen.getByTestId('socratic-chat-send'));
    await act(async () => {});
  };

  it('xin đáp án: thẻ đỏ đô rung, rồi sau 0,3 giây cân hóa học tự mở', async () => {
    render(<SocraticCompanionSession initialProblemId="CHEMISTRY_REDOX" />);
    expect(screen.queryByTestId('balance-scale-wrapper')).toBeNull();
    await ask('Cho em đáp án luôn đi');
    const card = screen.getByTestId('guardrail-alert-card');
    expect(card).toHaveTextContent('HÀNG RÀO SOCRATIC ĐÃ KÍCH HOẠT');
    expect(card).toHaveTextContent('không cung cấp đáp án giải sẵn');
    expect(card).toHaveClass('border-brand-600', 'animate-head-shake');
    expect(screen.queryByTestId('balance-scale-wrapper')).toBeNull(); // chưa tới 0,3 giây
    act(() => void vi.advanceTimersByTime(300));
    expect(screen.getByTestId('balance-scale-wrapper')).toBeInTheDocument();
  });

  it('thanh Demo Director chỉ hiện khi được bật', () => {
    const {rerender} = render(<SocraticCompanionSession showDirector={false} />);
    expect(screen.queryByTestId('director-guardrail-btn')).toBeNull();
    rerender(<SocraticCompanionSession showDirector />);
    expect(screen.getByTestId('director-guardrail-btn')).toBeInTheDocument();
  });
});

describe('cân hóa học', () => {
  it('bên nặng hơn có chấm đỏ đô, bên nhẹ hổ phách; cân bằng thì cả khung xanh lục bảo', () => {
    const {rerender} = render(<ChemicalBalanceScale leftAtomsCount={2} rightAtomsCount={3} elementName="Oxi" feedbackText="hãy tìm BCNN" />);
    expect(screen.getAllByTestId('atom-dots').map((d) => d.dataset.tone)).toEqual(['light', 'heavy']);
    expect(screen.getByTestId('chemical-balance-scale')).toHaveAttribute('data-balanced', '0');
    rerender(<ChemicalBalanceScale leftAtomsCount={6} rightAtomsCount={6} elementName="Oxi" feedbackText="x" />);
    expect(screen.getAllByTestId('atom-dots').map((d) => d.dataset.tone)).toEqual(['ok', 'ok']);
    expect(screen.getByTestId('chemical-balance-scale')).toHaveAttribute('data-balanced', '1');
    expect(screen.getByTestId('chemical-balance-scale')).toHaveClass('border-mastery');
  });
});

describe('cổng giọng nói', () => {
  it('chia phổ âm thành 5 nhóm 0–1; không có micro thì các thanh đứng yên (không giả lập)', () => {
    expect(bandLevels(new Uint8Array(100).fill(255), 5)).toEqual([1, 1, 1, 1, 1]);
    expect(bandLevels(new Uint8Array(100), 5)).toEqual([0, 0, 0, 0, 0]);
    const data = new Uint8Array(100);
    data.fill(255, 0, 12); // chỉ nhóm thấp nhất có tiếng
    const lv = bandLevels(data, 5);
    expect(lv[0]).toBe(1);
    expect(lv.slice(1)).toEqual([0, 0, 0, 0]);
    render(<ConceptCheckGate onPassGate={vi.fn()} />);
    const bars = screen.getByTestId('voice-defense-waveform').children;
    expect(bars).toHaveLength(5);
    expect(Array.from(bars).every((b) => (b as HTMLElement).style.height === '5px')).toBe(true);
  });

  it('lời giải thích hiện nghiêng; máy chủ xác nhận thì đóng dấu kèm điểm máy chủ trả về', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: true, json: async () => ({passed: true, feedback: 'Chuẩn rồi', eureka_points_awarded: 15})}));
    const pass = vi.fn();
    render(<ConceptCheckGate onPassGate={pass} />);
    expect(screen.queryByTestId('voice-stamp')).toBeNull();
    fireEvent.change(screen.getByTestId('concept-input-fallback'), {target: {value: 'Dạ, vì số Oxi hai bên phải bằng nhau'}});
    expect(screen.getByTestId('voice-transcript')).toHaveTextContent('Dạ, vì số Oxi hai bên phải bằng nhau');
    expect(screen.getByTestId('voice-transcript')).toHaveClass('italic');
    fireEvent.click(screen.getByTestId('btn-verify-explanation'));
    await waitFor(() => expect(screen.getByTestId('voice-stamp')).toHaveTextContent('Đã hiểu bản chất • +15 Eureka'));
    expect(pass).toHaveBeenCalledWith(15);
  });

  it('máy chủ không xác nhận thì không đóng dấu', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: true, json: async () => ({passed: false, feedback: 'Thiếu ý'})}));
    render(<ConceptCheckGate onPassGate={vi.fn()} />);
    fireEvent.change(screen.getByTestId('concept-input-fallback'), {target: {value: 'không biết'}});
    fireEvent.click(screen.getByTestId('btn-verify-explanation'));
    await waitFor(() => expect(screen.getByTestId('concept-feedback')).toHaveTextContent('Thiếu ý'));
    expect(screen.queryByTestId('voice-stamp')).toBeNull();
  });
});

describe('dải thẻ cảnh của tiết', () => {
  const pkg = {
    periodId: 'p1', title: 'Tiết 3', endedAt: 1,
    resources: [{assignmentId: 'a-s', title: 'Bài giảng hàm số', kind: 'slides', pages: [{page: 0, width: 1000, height: 1400}], openedAt: 1, periodId: 'p1', periodTitle: 'Tiết 3'}],
    runs: [{runId: 'run-9', code: 'C', title: 'Đề cũ', kind: 'exam', phase: 'closed', dueAt: 1, score10: 6, questions: [], corrections: [], classExamples: [], lessonAvailable: true}],
  };
  beforeEach(() => {
    vi.clearAllMocks();
    saveStudent({token: 'tok', student: {id: 's-1', name: 'Lan', classId: 'cc', className: '10A3'}});
    api.myAssignments.mockResolvedValue([]);
    api.myResources.mockResolvedValue([pkg.resources[0]]);
    api.myPeriods.mockResolvedValue([pkg]);
    api.pageUrl.mockResolvedValue('blob:x');
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('tài liệu rồi đến bài tập thành các cảnh; chạm cảnh tài liệu mở trình xem, chạm cảnh bài tập cuộn tới thẻ bài', async () => {
    render(<HubHome />);
    fireEvent.click(await screen.findByTestId('htab-periods'));
    const cards = await screen.findAllByTestId('scene-card');
    expect(cards.map((c) => c.textContent)).toEqual([expect.stringContaining('Cảnh 1Bài giảng hàm số'), expect.stringContaining('Cảnh 2Đề cũ')]);
    fireEvent.click(cards[1]);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    fireEvent.click(cards[0]);
    expect(await screen.findByText('Trang 1/1')).toBeInTheDocument();
  });
});
