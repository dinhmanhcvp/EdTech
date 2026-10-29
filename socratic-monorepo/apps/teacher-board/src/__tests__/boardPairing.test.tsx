import React from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import '@testing-library/jest-dom';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {SmartboardCanvas} from '../components/canvas/SmartboardCanvas';
import {PairPanel} from '../components/canvas/PairPanel';
import {loadSession, storeSession, type BoardSession} from '../utils/boardSession';

class FakeWS {
  static OPEN = 1;
  static instances: FakeWS[] = [];
  readyState = 1;
  onopen: (() => void) | null = null;
  onmessage: ((e: {data: string}) => void) | null = null;
  onclose: ((e: {code: number}) => void) | null = null;
  sent: string[] = [];
  constructor(public url: string) {
    FakeWS.instances.push(this);
  }
  send(t: string) {
    this.sent.push(t);
  }
  close() {
    this.readyState = 3;
  }
  emit(m: Record<string, unknown>) {
    this.onmessage?.({data: JSON.stringify(m)});
  }
}

const STROKE = {id: 'lesson-1', points: [{x: 100, y: 100}, {x: 200, y: 150}], color: '#111', width: 3};
const PAYLOAD = (over: Record<string, unknown> = {}) => ({
  boardToken: 'BT1',
  roomId: 'ROOM77',
  roomToken: 'RT1',
  period: {id: 'p1', title: 'Hàm số bậc hai', goals: 'Hiểu parabol', prompts: ['Giải x²-4=0']},
  class: {name: '10A1', grade: '10', subject: 'Toán', size: 40, notes: 'Lớp khá'},
  teacher: {display_name: 'Cô Lan'},
  pages: [[STROKE]],
  resumed: false,
  ...over,
});
const res = (body: unknown, status = 200) => ({ok: status < 400, status, json: async () => body}) as Response;

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  FakeWS.instances = [];
  vi.stubGlobal('WebSocket', FakeWS);
  fetchMock = vi.fn().mockResolvedValue(res(PAYLOAD()));
  vi.stubGlobal('fetch', fetchMock);
  sessionStorage.clear();
  localStorage.clear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  sessionStorage.clear();
  localStorage.clear();
});

const pairVia = async (code = 'ABC234') => {
  fireEvent.click(screen.getByTestId('pair-open'));
  if (screen.queryByTestId('pair-switch')) fireEvent.click(screen.getByTestId('pair-switch')); // đang ghép: chuyển sang tiết khác
  fireEvent.change(screen.getByTestId('pair-code-input'), {target: {value: code}});
  await act(async () => {
    fireEvent.click(screen.getByTestId('pair-submit'));
  });
};
const lastWs = () => FakeWS.instances[FakeWS.instances.length - 1];

describe('PairPanel (giao diện ghép)', () => {
  const S: BoardSession = {boardToken: 'BT', roomId: 'R', roomToken: 'T', periodId: 'p1', title: 'Hàm số', goals: 'Hiểu parabol', prompts: ['Đề 1'], teacherName: 'Cô Lan', classInfo: null};

  it('chưa ghép: nút khóa tới khi đủ 6 ký tự, mã tự viết hoa và lọc ký tự lạ; cảnh báo khi bảng đang có nội dung', async () => {
    const onPair = vi.fn().mockResolvedValue(null);
    render(<PairPanel session={null} boardHasContent onPair={onPair} onSaveLesson={vi.fn()} onUnpair={vi.fn()} />);
    fireEvent.click(screen.getByTestId('pair-open'));
    expect(screen.getByTestId('pair-warning').textContent).toContain('thay toàn bộ bảng');
    expect(screen.getByTestId('pair-submit')).toBeDisabled();
    fireEvent.change(screen.getByTestId('pair-code-input'), {target: {value: 'ab-c2 34zz'}});
    expect((screen.getByTestId('pair-code-input') as HTMLInputElement).value).toBe('ABC234');
    await act(async () => {
      fireEvent.click(screen.getByTestId('pair-submit'));
    });
    expect(onPair).toHaveBeenCalledWith('ABC234');
    expect(screen.queryByTestId('pair-panel')).toBeNull(); // ghép xong thì đóng
  });

  it('ghép lỗi: hiện lời báo và giữ cửa sổ', async () => {
    render(<PairPanel session={null} boardHasContent={false} onPair={vi.fn().mockResolvedValue('Mã ghép sai hoặc đã hết hạn.')} onSaveLesson={vi.fn()} onUnpair={vi.fn()} />);
    fireEvent.click(screen.getByTestId('pair-open'));
    fireEvent.change(screen.getByTestId('pair-code-input'), {target: {value: 'ABCDEF'}});
    await act(async () => {
      fireEvent.click(screen.getByTestId('pair-submit'));
    });
    expect(screen.getByTestId('pair-error').textContent).toContain('hết hạn');
    expect(screen.queryByTestId('pair-warning')).toBeNull();
  });

  it('đã ghép: nút ghi tên giáo viên và tiết; hiện đề chuẩn bị; lưu bài; ngắt ghép phải xác nhận', async () => {
    const onSave = vi.fn().mockResolvedValue({ok: true, text: 'Đã lưu “Bài”.'});
    const onUnpair = vi.fn();
    render(<PairPanel session={S} boardHasContent onPair={vi.fn()} onSaveLesson={onSave} onUnpair={onUnpair} />);
    expect(screen.getByTestId('pair-open').textContent).toContain('Cô Lan · Hàm số');
    fireEvent.click(screen.getByTestId('pair-open'));
    expect(screen.getByText('Đề 1')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('pair-save-title'), {target: {value: 'Bài của tôi'}});
    await act(async () => {
      fireEvent.click(screen.getByTestId('pair-save'));
    });
    expect(onSave).toHaveBeenCalledWith('Bài của tôi');
    expect(screen.getByTestId('pair-note').textContent).toContain('Đã lưu');
    fireEvent.click(screen.getByTestId('pair-unpair'));
    expect(onUnpair).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('pair-unpair-confirm'));
    expect(onUnpair).toHaveBeenCalledTimes(1);
  });
});

describe('Bảng chung ghép với tiết (tích hợp)', () => {
  it('ghép bằng mã: nạp bài của tiết, nối phòng đúng vai trò giáo viên, tắt thư viện cục bộ, lưu phiên trong thẻ trình duyệt', async () => {
    render(<SmartboardCanvas />);
    expect(screen.getByTestId('lesson-library-open')).toBeInTheDocument();
    await pairVia();
    await waitFor(() => expect(screen.getByTestId('pair-open').textContent).toContain('Cô Lan · Hàm số bậc hai'));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({code: 'ABC234', previous_board_token: ''});
    expect(lastWs().url).toContain('/ws/rooms/ROOM77');
    expect(lastWs().url).toContain('role=teacher');
    expect(lastWs().url).toContain('token=RT1');
    expect(screen.queryByTestId('lesson-library-open')).toBeNull(); // thư viện/bản nháp dùng chung tắt khi ghép
    expect(loadSession()?.boardToken).toBe('BT1');
    expect(localStorage.getItem('socratic_board_draft')).toBeNull();
    expect(screen.getByTestId('info-toast').textContent).toContain('Hàm số bậc hai');
  });

  it('bảng đã ghép có ngữ cảnh tiết cho AI hỏi đáp', async () => {
    render(<SmartboardCanvas />);
    await pairVia();
    await waitFor(() => expect(loadSession()).not.toBeNull());
    fireEvent.click(screen.getByTestId('ai-fab'));
    const q = screen.queryByTestId('ai-fab-voiceqa') ?? screen.queryByTestId('ai-fab-ask');
    if (q) fireEvent.click(q);
    // ngữ cảnh được dựng từ phiên: kiểm tra trực tiếp qua hàm dựng để không phụ thuộc vị trí nút
    const {lessonContext} = await import('../utils/boardSession');
    expect(lessonContext(loadSession())).toMatchObject({title: 'Hàm số bậc hai', goals: 'Hiểu parabol', class: {name: '10A1', notes: 'Lớp khá'}});
  });

  it('giáo viên chọn chiếu bài từ trang quản lý: thêm trang mới với nét ẩn danh, không có tên nào trên bảng', async () => {
    render(<SmartboardCanvas />);
    await pairVia();
    await waitFor(() => expect(lastWs()).toBeDefined());
    await act(async () => {
      lastWs().emit({type: 'STATE', role: 'teacher', roomId: 'ROOM77', teacherOnline: true});
    });
    expect(screen.getByTestId('page-indicator').textContent).toContain('1 / 1');
    await act(async () => {
      lastWs().emit({type: 'SHOW_SUBMISSION', studentId: 'S1', rev: 1, label: 'Bài 2', strokes: [{p: [[10, 10], [300, 200]], c: '#2563EB', w: 3}]});
    });
    expect(screen.getByTestId('page-indicator').textContent).toContain('2 / 2');
    expect(screen.getByTestId('info-toast').textContent).toContain('Bài 2');
    expect(document.body.textContent).not.toMatch(/Nguyễn|Trần/);
  });

  it('giáo viên kết thúc tiết ở trang quản lý: bảng nhận CLOSED và tự dọn sạch cho giáo viên sau', async () => {
    render(<SmartboardCanvas />);
    await pairVia();
    await waitFor(() => expect(lastWs()).toBeDefined());
    await act(async () => {
      lastWs().emit({type: 'STATE', role: 'teacher', roomId: 'ROOM77'});
    });
    await act(async () => {
      lastWs().emit({type: 'SHOW_SUBMISSION', studentId: 'S1', rev: 1, label: 'Bài 1', strokes: [{p: [[1, 1], [9, 9]], c: '#111', w: 3}]});
    });
    expect(screen.getByTestId('page-indicator').textContent).toContain('2 / 2');
    await act(async () => {
      lastWs().emit({type: 'CLOSED'});
    });
    await waitFor(() => expect(screen.getByTestId('pair-open').textContent).toContain('Ghép tiết'));
    expect(screen.getByTestId('page-indicator').textContent).toContain('1 / 1'); // mọi trang của giáo viên trước biến mất
    expect(loadSession()).toBeNull();
    expect(screen.getByTestId('info-toast').textContent).toContain('đã kết thúc');
    expect(screen.getByTestId('lesson-library-open')).toBeInTheDocument(); // bảng độc lập dùng lại bình thường
  });

  it('tự lưu ảnh chụp theo tiết mỗi 10 giây, kèm mã bảng; không đổi thì không gửi lại', async () => {
    vi.useFakeTimers();
    render(<SmartboardCanvas />);
    await pairVia();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_100);
    });
    const snap = fetchMock.mock.calls.find((c) => String(c[0]).endsWith('/api/v1/board/snapshot'));
    expect(snap).toBeTruthy();
    expect(snap![1].method).toBe('PUT');
    expect(snap![1].headers['X-Board-Token']).toBe('BT1');
    expect(JSON.parse(snap![1].body).pages[0][0].id).toBe('lesson-1');
    const before = fetchMock.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_100);
    });
    expect(fetchMock.mock.calls.length).toBe(before);
  });

  it('máy chủ báo tiết đã hết (410) khi lưu: bảng tự dọn và hiện thông báo', async () => {
    vi.useFakeTimers();
    render(<SmartboardCanvas />);
    await pairVia();
    fetchMock.mockResolvedValue(res({}, 410));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_100);
    });
    expect(loadSession()).toBeNull();
    expect(screen.getByTestId('pair-open').textContent).toContain('Ghép tiết');
    expect(screen.getByTestId('info-toast').textContent).toContain('đã được dọn');
  });

  it('làm mới trang giữa tiết: tự nhận lại tiết bằng mã bảng đã lưu; tiết đã hết thì xóa mã', async () => {
    const S: BoardSession = {boardToken: 'BT1', roomId: 'ROOM77', roomToken: 'RT1', periodId: 'p1', title: 'Hàm số bậc hai', goals: '', prompts: [], teacherName: 'Cô Lan', classInfo: null};
    storeSession(S);
    fetchMock.mockResolvedValueOnce(res(PAYLOAD({resumed: true})));
    const {unmount} = render(<SmartboardCanvas />);
    await waitFor(() => expect(screen.getByTestId('pair-open').textContent).toContain('Cô Lan'));
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/board\/resume$/);
    expect(fetchMock.mock.calls[0][1].headers['X-Board-Token']).toBe('BT1');
    expect(screen.getByTestId('info-toast').textContent).toContain('ghép lại');
    unmount();
    FakeWS.instances = [];
    fetchMock.mockResolvedValueOnce(res({}, 410));
    render(<SmartboardCanvas />);
    await waitFor(() => expect(loadSession()).toBeNull());
    expect(screen.getByTestId('pair-open').textContent).toContain('Ghép tiết');
    expect(FakeWS.instances).toHaveLength(0); // không nối phòng của tiết đã hết
  });

  it('ghép sang tiết khác khi đang ghép: gửi kèm mã bảng cũ để máy chủ khép tiết trước', async () => {
    render(<SmartboardCanvas />);
    await pairVia('AAAAAA');
    await waitFor(() => expect(loadSession()?.boardToken).toBe('BT1'));
    fetchMock.mockResolvedValueOnce(res(PAYLOAD({boardToken: 'BT2', roomId: 'ROOM88', period: {id: 'p2', title: 'Tiết của Nam', goals: '', prompts: []}, teacher: {display_name: 'Thầy Nam'}, class: null, pages: null})));
    await pairVia('BBBBBB');
    await waitFor(() => expect(screen.getByTestId('pair-open').textContent).toContain('Thầy Nam'));
    const second = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/board/pair'))[1];
    expect(JSON.parse(second[1].body)).toEqual({code: 'BBBBBB', previous_board_token: 'BT1'});
    expect(loadSession()?.boardToken).toBe('BT2');
    expect(lastWs().url).toContain('ROOM88');
    expect(screen.getByTestId('page-indicator').textContent).toContain('1 / 1'); // bắt đầu sạch, không giữ bài của Cô Lan
  });

  it('lớp học trên bảng đã ghép chỉ hiện mã vào lớp, không có quản lý (thu bài, chiếu, bình chọn)', async () => {
    render(<SmartboardCanvas />);
    await pairVia();
    await waitFor(() => expect(loadSession()).not.toBeNull());
    await act(async () => {
      lastWs().emit({type: 'STATE', role: 'teacher', roomId: 'ROOM77', teacherOnline: true});
      lastWs().emit({type: 'ROSTER', count: 3, control: null});
    });
    fireEvent.click(screen.getByTestId('btn-classroom'));
    expect(await screen.findByTestId('classroom-managed')).toBeInTheDocument();
    expect(screen.getByTestId('classroom-managed').textContent).toContain('Cô Lan');
    expect(screen.queryByTestId('submissions-section')).toBeNull();
    expect(screen.queryByTestId('classroom-poll-start')).toBeNull();
    expect(screen.queryByTestId('classroom-end')).toBeNull();
  });
});
