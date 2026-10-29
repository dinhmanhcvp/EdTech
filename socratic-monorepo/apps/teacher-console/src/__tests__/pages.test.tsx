import React from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import '@testing-library/jest-dom';
import {fireEvent, render, screen, waitFor, within} from '@testing-library/react';

const replace = vi.fn();
const push = vi.fn();
vi.mock('next/navigation', () => ({useRouter: () => ({replace, push}), usePathname: () => '/'}));
vi.mock('next/link', () => ({default: ({href, children, ...rest}: any) => <a href={href} {...rest}>{children}</a>}));

const mockApi = vi.hoisted(() => ({
  register: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
  classes: vi.fn(),
  saveClass: vi.fn(),
  deleteClass: vi.fn(),
  lessons: vi.fn(),
  lesson: vi.fn(),
  createLesson: vi.fn(),
  deleteLesson: vi.fn(),
  periods: vi.fn(),
  period: vi.fn(),
  createPeriod: vi.fn(),
  updatePeriod: vi.fn(),
  deletePeriod: vi.fn(),
  startPeriod: vi.fn(),
  endPeriod: vi.fn(),
  live: vi.fn(),
  record: vi.fn(),
}));
vi.mock('../lib/api', async () => ({...(await vi.importActual<typeof import('../lib/api')>('../lib/api')), api: mockApi}));

import {ApiError, setToken} from '../lib/api';
import LoginPage from '../app/login/page';
import Dashboard from '../app/page';
import ClassesPage from '../app/classes/page';
import LessonsPage from '../app/lessons/page';
import PeriodRoute from '../app/periods/[id]/page';
import {PeriodPrep} from '../components/PeriodPrep';
import {LiveControl} from '../components/LiveControl';
import {initialLive, type LiveState} from '../lib/live';
import {lessonToFile} from '../lib/lessonFile';
import type {Period} from '../lib/types';

const TEACHER = {id: 't1', username: 'co_lan', display_name: 'Cô Lan'};
const period = (over: Partial<Period> = {}): Period => ({id: 'p1', class_id: null, lesson_id: null, title: 'Tiết 1', goals: '', notes: '', prompts: [], status: 'planned', room_id: null, created_at: 1700000000, started_at: null, ended_at: null, has_snapshot: false, submission_count: 0, ...over});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  setToken('tok');
  mockApi.me.mockResolvedValue({teacher: TEACHER});
  mockApi.classes.mockResolvedValue([]);
  mockApi.lessons.mockResolvedValue([]);
  mockApi.periods.mockResolvedValue([]);
});
afterEach(() => localStorage.clear());

describe('Đăng nhập', () => {
  it('đăng nhập thành công lưu mã và vào trang chính; sai mật khẩu hiện lỗi tiếng Việt', async () => {
    mockApi.login.mockRejectedValueOnce(new ApiError('Sai tên đăng nhập hoặc mật khẩu.', 401)).mockResolvedValueOnce({token: 'NEW', teacher: TEACHER});
    render(<LoginPage />);
    fireEvent.change(screen.getByTestId('username'), {target: {value: 'co_lan'}});
    fireEvent.change(screen.getByTestId('password'), {target: {value: 'matkhau-123'}});
    fireEvent.click(screen.getByTestId('login-submit'));
    expect((await screen.findByTestId('login-error')).textContent).toContain('Sai tên đăng nhập');
    expect(replace).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('login-submit'));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(localStorage.getItem('console_token')).toBe('NEW');
  });

  it('tạo tài khoản gửi tên hiển thị và mã mời; nút bị khóa khi thiếu thông tin', async () => {
    mockApi.register.mockResolvedValue({token: 'T2', teacher: TEACHER});
    render(<LoginPage />);
    expect(screen.getByTestId('login-submit')).toBeDisabled();
    fireEvent.click(screen.getByTestId('tab-register'));
    fireEvent.change(screen.getByTestId('username'), {target: {value: 'thay_nam'}});
    fireEvent.change(screen.getByTestId('display-name'), {target: {value: 'Thầy Nam'}});
    fireEvent.change(screen.getByTestId('password'), {target: {value: 'matkhau-123'}});
    fireEvent.change(screen.getByTestId('invite'), {target: {value: 'TRUONG'}});
    fireEvent.click(screen.getByTestId('login-submit'));
    await waitFor(() => expect(mockApi.register).toHaveBeenCalledWith('thay_nam', 'matkhau-123', 'Thầy Nam', 'TRUONG'));
  });

  it('địa chỉ máy chủ đã lưu không bị xóa khi đăng nhập lại', async () => {
    localStorage.setItem('backend_url', 'https://api.truong.vn');
    mockApi.login.mockResolvedValue({token: 'x', teacher: TEACHER});
    render(<LoginPage />);
    await waitFor(() => expect((screen.getByTestId('server-url') as HTMLInputElement).value).toBe('https://api.truong.vn'));
    fireEvent.change(screen.getByTestId('username'), {target: {value: 'a_b_c'}});
    fireEvent.change(screen.getByTestId('password'), {target: {value: 'matkhau-123'}});
    fireEvent.click(screen.getByTestId('login-submit'));
    await waitFor(() => expect(replace).toHaveBeenCalled());
    expect(localStorage.getItem('backend_url')).toBe('https://api.truong.vn');
  });
});

describe('Khung đăng nhập (Shell)', () => {
  it('chưa có mã đăng nhập → chuyển về /login, không gọi dữ liệu', async () => {
    localStorage.clear();
    render(<Dashboard />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(mockApi.periods).not.toHaveBeenCalled();
  });
  it('phiên hết hạn (401) → xóa mã và về /login', async () => {
    mockApi.me.mockRejectedValue(new ApiError('hết hạn', 401));
    render(<Dashboard />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(localStorage.getItem('console_token')).toBeNull();
  });
  it('hiện tên giáo viên; đăng xuất hủy phiên và về /login', async () => {
    mockApi.logout.mockResolvedValue({ok: true});
    render(<Dashboard />);
    expect((await screen.findByTestId('teacher-name')).textContent).toBe('Cô Lan');
    fireEvent.click(screen.getByTestId('logout'));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(mockApi.logout).toHaveBeenCalled();
    expect(localStorage.getItem('console_token')).toBeNull();
  });
});

describe('Trang chính: tiết học', () => {
  it('chưa có tiết: hướng dẫn; có tiết: tách "Đang dạy" lên đầu, hiện tên lớp', async () => {
    render(<Dashboard />);
    expect(await screen.findByTestId('no-periods')).toBeInTheDocument();
    mockApi.classes.mockResolvedValue([{id: 'c1', name: '10A1', grade: '10', subject: 'Toán', size: 40, notes: ''}]);
    mockApi.periods.mockResolvedValue([period({id: 'a', title: 'Đã soạn', status: 'planned'}), period({id: 'b', title: 'Đang dạy ngay', status: 'live', class_id: 'c1'}), period({id: 'c', title: 'Đã xong', status: 'ended', submission_count: 3})]);
    render(<Dashboard />);
    const live = await screen.findByTestId('live-periods');
    expect(within(live).getByText('Đang dạy ngay')).toBeInTheDocument();
    expect(within(live).getByText('10A1')).toBeInTheDocument();
    expect(screen.getByText('3 bài nộp')).toBeInTheDocument();
  });

  it('soạn tiết mới → tạo rồi chuyển sang trang tiết', async () => {
    mockApi.createPeriod.mockResolvedValue(period({id: 'new1'}));
    render(<Dashboard />);
    await screen.findByTestId('no-periods');
    expect(screen.getByTestId('period-create')).toBeDisabled();
    fireEvent.change(screen.getByTestId('period-title'), {target: {value: ' Hàm số bậc hai '}});
    fireEvent.click(screen.getByTestId('period-create'));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/periods/new1'));
    expect(mockApi.createPeriod.mock.calls[0][0]).toMatchObject({title: ' Hàm số bậc hai ', class_id: null, lesson_id: null});
  });
});

describe('Lớp', () => {
  it('thêm lớp, sửa lớp, xóa lớp phải xác nhận', async () => {
    const cls = {id: 'c1', name: '10A1', grade: '10', subject: 'Toán', size: 40, notes: 'Lớp khá'};
    mockApi.classes.mockResolvedValueOnce([]).mockResolvedValue([cls]);
    mockApi.saveClass.mockResolvedValue(cls);
    render(<ClassesPage />);
    await screen.findByTestId('class-form');
    fireEvent.change(screen.getByTestId('class-name'), {target: {value: '10A1'}});
    fireEvent.change(screen.getByTestId('class-size'), {target: {value: '40'}});
    fireEvent.click(screen.getByTestId('class-save'));
    await waitFor(() => expect(mockApi.saveClass).toHaveBeenCalledWith(expect.objectContaining({name: '10A1', size: 40}), undefined));
    expect(await screen.findByTestId('class-item')).toHaveTextContent('40 học sinh');
    fireEvent.click(screen.getByTestId('class-edit'));
    expect((screen.getByTestId('class-name') as HTMLInputElement).value).toBe('10A1');
    fireEvent.change(screen.getByTestId('class-name'), {target: {value: '10A2'}});
    fireEvent.click(screen.getByTestId('class-save'));
    await waitFor(() => expect(mockApi.saveClass).toHaveBeenLastCalledWith(expect.objectContaining({name: '10A2'}), 'c1'));
    fireEvent.click(screen.getByTestId('class-delete'));
    expect(mockApi.deleteClass).not.toHaveBeenCalled();
    mockApi.deleteClass.mockResolvedValue({ok: true});
    fireEvent.click(screen.getByTestId('class-confirm-delete'));
    await waitFor(() => expect(mockApi.deleteClass).toHaveBeenCalledWith('c1'));
  });
});

describe('Bài soạn', () => {
  const meta = {id: 'l1', title: 'Hàm số', folder: 'Toán 10', page_count: 2, stroke_count: 5, created_at: 1700000000, updated_at: 1700000000};
  it('liệt kê, tìm kiếm theo tên/thư mục, xóa phải xác nhận', async () => {
    mockApi.lessons.mockResolvedValue([meta, {...meta, id: 'l2', title: 'Con lắc', folder: 'Lý 11'}]);
    render(<LessonsPage />);
    expect(await screen.findAllByTestId('lesson-item')).toHaveLength(2);
    fireEvent.change(screen.getByTestId('lesson-search'), {target: {value: 'lý'}});
    expect(screen.getAllByTestId('lesson-item')).toHaveLength(1);
    fireEvent.change(screen.getByTestId('lesson-search'), {target: {value: 'không có gì'}});
    expect(screen.getByTestId('lesson-empty')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('lesson-search'), {target: {value: ''}});
    fireEvent.click(screen.getAllByTestId('lesson-delete')[0]);
    expect(mockApi.deleteLesson).not.toHaveBeenCalled();
    mockApi.deleteLesson.mockResolvedValue({ok: true});
    fireEvent.click(screen.getByTestId('lesson-confirm-delete'));
    await waitFor(() => expect(mockApi.deleteLesson).toHaveBeenCalledWith('l1'));
  });

  it('nhập tệp xuất từ bảng: gửi đúng tên/thư mục/trang; tệp lạ bị từ chối', async () => {
    mockApi.createLesson.mockResolvedValue({...meta, title: 'Từ tệp'});
    render(<LessonsPage />);
    await screen.findByTestId('lesson-empty');
    const good = new File([lessonToFile('Từ tệp', 'Toán', [[{id: 'a'}]])], 'a.json', {type: 'application/json'});
    fireEvent.change(screen.getByTestId('lesson-import-file'), {target: {files: [good]}});
    await waitFor(() => expect(mockApi.createLesson).toHaveBeenCalledWith('Từ tệp', 'Toán', [[{id: 'a'}]]));
    expect((await screen.findByTestId('lesson-note')).textContent).toContain('Đã nhập');
    const bad = new File(['{"x":1}'], 'b.json', {type: 'application/json'});
    fireEvent.change(screen.getByTestId('lesson-import-file'), {target: {files: [bad]}});
    expect((await screen.findByTestId('error-note')).textContent).toContain('không phải tệp bài giảng');
    expect(mockApi.createLesson).toHaveBeenCalledTimes(1);
  });
});

describe('Soạn tiết', () => {
  const classes = [{id: 'c1', name: '10A1', grade: '10', subject: 'Toán', size: 40, notes: 'Lớp khá, vài bạn yếu hình'}];
  const lessons = [{id: 'l1', title: 'Hàm số', folder: 'Toán 10', page_count: 2, stroke_count: 5, created_at: 1, updated_at: 1}];

  it('hiện ngữ cảnh lớp khi chọn lớp; lưu gửi đúng các trường; đề thu bài tách theo dòng', async () => {
    const onSave = vi.fn();
    render(<PeriodPrep period={period({prompts: ['Giải x²-4=0']})} classes={classes} lessons={lessons} onSave={onSave} />);
    expect(screen.queryByTestId('prep-class-context')).toBeNull();
    fireEvent.change(screen.getByTestId('prep-class'), {target: {value: 'c1'}});
    expect(screen.getByTestId('prep-class-context').textContent).toContain('Lớp khá, vài bạn yếu hình');
    fireEvent.change(screen.getByTestId('prep-lesson'), {target: {value: 'l1'}});
    fireEvent.change(screen.getByTestId('prep-goals'), {target: {value: 'Hiểu parabol'}});
    fireEvent.change(screen.getByTestId('prep-prompts'), {target: {value: 'Đề 1\n\n  Đề 2  \n'}});
    fireEvent.submit(screen.getByTestId('period-prep'));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toEqual({title: 'Tiết 1', class_id: 'c1', lesson_id: 'l1', goals: 'Hiểu parabol', notes: '', prompts: ['Đề 1', 'Đề 2']});
    expect(await screen.findByTestId('prep-saved')).toBeInTheDocument();
  });

  it('"Bắt đầu tiết" gửi cả chỉnh sửa chưa lưu; tiết đã diễn ra thì khóa form', () => {
    const onStart = vi.fn();
    const {rerender} = render(<PeriodPrep period={period()} classes={classes} lessons={lessons} onSave={vi.fn()} onStart={onStart} />);
    fireEvent.change(screen.getByTestId('prep-title'), {target: {value: 'Tiết sửa chưa lưu'}});
    fireEvent.click(screen.getByTestId('prep-start'));
    expect(onStart.mock.calls[0][0].title).toBe('Tiết sửa chưa lưu');
    rerender(<PeriodPrep period={period({status: 'live'})} classes={classes} lessons={lessons} onSave={vi.fn()} disabled />);
    expect(screen.getByTestId('prep-title')).toBeDisabled();
    expect(screen.queryByTestId('prep-save')).toBeNull();
  });

  it('trang tiết "đã soạn": Bắt đầu → lưu rồi mở tiết (nhận mã ghép), chuyển sang điều khiển', async () => {
    mockApi.period.mockResolvedValue(period());
    mockApi.updatePeriod.mockResolvedValue(period({title: 'Tiết sửa'}));
    mockApi.startPeriod.mockResolvedValue({pairCode: 'ABC234', expiresIn: 600, roomId: 'ROOM77', period: period({status: 'live', room_id: 'ROOM77'})});
    mockApi.live.mockResolvedValue({roomId: 'ROOM77', token: 'rt'});
    vi.stubGlobal('WebSocket', class {static OPEN = 1; readyState = 0; onopen: any; onmessage: any; onclose: any; close() {} send() {}} as any);
    render(<PeriodRoute params={{id: 'p1'}} />);
    fireEvent.click(await screen.findByTestId('prep-start'));
    expect((await screen.findByTestId('pair-code')).textContent).toBe('ABC234');
    expect(mockApi.updatePeriod).toHaveBeenCalledWith('p1', expect.objectContaining({title: 'Tiết 1'}));
    expect(screen.getByTestId('room-code').textContent).toBe('ROOM77');
    expect(screen.getByTestId('period-status')).toHaveAttribute('data-status', 'live');
    vi.unstubAllGlobals();
  });

  it('tiết đang dạy nhưng phòng đã mất: báo rõ và cho mở lại phòng', async () => {
    mockApi.period.mockResolvedValue(period({status: 'live', room_id: 'GONE'}));
    mockApi.live.mockRejectedValue(new ApiError('Tiết chưa diễn ra', 404));
    render(<PeriodRoute params={{id: 'p1'}} />);
    expect(await screen.findByTestId('room-lost')).toBeInTheDocument();
    expect(screen.getByTestId('reopen-room')).toBeInTheDocument();
  });

  it('tiết đã kết thúc: xem lại bảng cuối và bài học sinh đã nộp (có tên, chỉ cho giáo viên)', async () => {
    mockApi.period.mockResolvedValue(period({status: 'ended', started_at: 1700000000, ended_at: 1700003000, goals: 'Hiểu parabol'}));
    mockApi.record.mockResolvedValue({period: period({status: 'ended'}), pages: [[{id: 'a'}], [{id: 'b'}, {id: 'c'}]], submissions: [{name: 'Nguyễn An', rev: 1, at: 1, strokes: [{p: [[1, 1], [9, 9]], c: '#111', w: 3}]}]});
    render(<PeriodRoute params={{id: 'p1'}} />);
    expect((await screen.findByTestId('record-board')).textContent).toContain('2 trang, 3 đối tượng');
    expect(within(screen.getByTestId('record-submissions')).getByText('Nguyễn An')).toBeInTheDocument();
  });

  it('xóa tiết đã soạn phải xác nhận rồi về trang chính', async () => {
    mockApi.period.mockResolvedValue(period());
    mockApi.deletePeriod.mockResolvedValue({ok: true});
    render(<PeriodRoute params={{id: 'p1'}} />);
    fireEvent.click(await screen.findByTestId('delete-period'));
    expect(mockApi.deletePeriod).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('delete-confirm'));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
  });
});

describe('Điều khiển tiết đang dạy (LiveControl)', () => {
  const live = (over: Partial<LiveState> = {}): LiveState => ({...initialLive, status: 'open', boardOnline: true, studentCount: 2, roster: [{id: 'S1', name: 'Nguyễn An'}, {id: 'S2', name: 'Trần Bình'}], ...over});
  const sub = (id: string, name: string, rev = 1) => ({studentId: id, name, rev, at: 1, strokes: [{p: [[10, 10], [200, 100]] as [number, number][], c: '#111', w: 3}]});
  const mount = (state: LiveState, send: ReturnType<typeof vi.fn> = vi.fn().mockReturnValue(true), over: Partial<React.ComponentProps<typeof LiveControl>> = {}) => {
    const onRepair = vi.fn();
    const onEnd = vi.fn();
    render(<LiveControl roomId="ROOM77" live={state} send={send as unknown as (m: Record<string, unknown>) => boolean} prompts={[]} pairCode={null} onRepair={onRepair} onEnd={onEnd} {...over} />);
    return {send, onRepair, onEnd};
  };

  it('hiện học sinh kèm tên, tình trạng bảng; giao quyền điều khiển gửi đúng lệnh', () => {
    const {send} = mount(live());
    expect(screen.getByTestId('roster').textContent).toContain('Nguyễn An');
    expect(screen.getByTestId('live-board').textContent).toBe('Bảng đã ghép');
    fireEvent.click(screen.getByTestId('delegate-S2'));
    expect(send).toHaveBeenCalledWith({type: 'DELEGATE', studentId: 'S2'});
  });

  it('đề chuẩn bị sẵn: bấm một lần điền vào ô, rồi bắt đầu thu bài gửi đề đó', () => {
    const {send} = mount(live(), undefined, {prompts: ['Giải x²-4=0', 'Vẽ đồ thị']});
    fireEvent.click(screen.getAllByTestId('prepared-prompt')[1]);
    expect((screen.getByTestId('collect-prompt') as HTMLInputElement).value).toBe('Vẽ đồ thị');
    fireEvent.click(screen.getByTestId('collect-start'));
    expect(send).toHaveBeenCalledWith({type: 'COLLECT_START', prompt: 'Vẽ đồ thị'});
  });

  it('không có học sinh thì không cho bắt đầu thu bài', () => {
    mount(live({studentCount: 0, roster: []}));
    expect(screen.getByTestId('collect-start')).toBeDisabled();
  });

  it('chiếu bài: gửi studentId + nhãn ẨN DANH, tuyệt đối không gửi tên, dù đang hiện tên ở màn hình giáo viên', () => {
    const {send} = mount(live({collect: {prompt: 'x', open: true}, submissions: [sub('S1', 'Nguyễn An'), sub('S2', 'Trần Bình', 2)]}));
    expect(screen.getByTestId('collect-count').textContent).toContain('2/2');
    const labels = () => screen.getAllByTestId('submission-label').map((e) => e.textContent);
    expect(labels()).toEqual(['Nguyễn An', 'Trần Bình']); // trang quản lý riêng tư: mặc định hiện tên
    fireEvent.click(screen.getByTestId('names-toggle'));
    expect(labels()).toEqual(['Bài 1', 'Bài 2']);
    fireEvent.click(screen.getByTestId('names-toggle'));
    fireEvent.click(within(screen.getAllByTestId('submission-card')[1]).getByTestId('submission-show'));
    expect(send).toHaveBeenCalledWith({type: 'SHOW', studentId: 'S2', label: 'Bài 2'});
    expect(JSON.stringify(send.mock.calls)).not.toContain('Trần');
  });

  it('bảng chưa ghép thì nút Chiếu bị khóa', () => {
    mount(live({boardOnline: false, collect: {prompt: '', open: false}, submissions: [sub('S1', 'An')]}));
    expect(screen.getByTestId('submission-show')).toBeDisabled();
  });

  it('mã ghép hiện to khi có; lấy mã mới; kết thúc tiết phải xác nhận', () => {
    const {onRepair, onEnd} = mount(live(), undefined, {pairCode: 'ABC234'});
    expect(screen.getByTestId('pair-code').textContent).toBe('ABC234');
    fireEvent.click(screen.getByTestId('repair'));
    expect(onRepair).toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('end-period'));
    expect(onEnd).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('end-confirm'));
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('bình chọn: gửi câu hỏi và lựa chọn đã tách dòng', () => {
    const {send} = mount(live());
    fireEvent.change(screen.getByTestId('poll-options'), {target: {value: 'A\nB, C\n\n'}});
    fireEvent.click(screen.getByTestId('poll-start'));
    expect(send).toHaveBeenCalledWith({type: 'POLL_START', question: 'Dự đoán: kết quả sẽ thay đổi thế nào?', options: ['A', 'B', 'C']});
  });
});
