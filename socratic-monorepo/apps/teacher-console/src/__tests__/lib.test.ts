import {afterEach, describe, expect, it, vi} from 'vitest';
import {ApiError, api, backendBase, boardBase, clearToken, getToken, setBackendBase, setToken, wsUrl} from '../lib/api';
import {initialLive, liveReducer, type LiveState} from '../lib/live';
import {LessonFileError, lessonToFile, parseLessonFile} from '../lib/lessonFile';

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

const stubFetch = (status: number, body: unknown) => {
  const f = vi.fn().mockResolvedValue({ok: status < 400, status, json: async () => body} as Response);
  vi.stubGlobal('fetch', f);
  return f;
};

describe('api client', () => {
  it('gửi Bearer khi đã đăng nhập, không gửi khi chưa; địa chỉ lấy từ ô nhập tay', async () => {
    setBackendBase('http://srv:9000/');
    const f = stubFetch(200, {teacher: {id: '1'}});
    await api.me();
    expect(f.mock.calls[0][0]).toBe('http://srv:9000/api/v1/console/me');
    expect((f.mock.calls[0][1] as RequestInit).headers).not.toHaveProperty('Authorization');
    setToken('tok123');
    await api.me();
    expect(((f.mock.calls[1][1] as RequestInit).headers as Record<string, string>).Authorization).toBe('Bearer tok123');
    expect(getToken()).toBe('tok123');
    clearToken();
    expect(getToken()).toBe('');
  });

  it('lỗi máy chủ thành ApiError tiếng Việt: lấy detail, có câu mặc định, mất mạng', async () => {
    stubFetch(401, {detail: 'Sai tên đăng nhập hoặc mật khẩu.'});
    await expect(api.login('a', 'b')).rejects.toMatchObject({message: 'Sai tên đăng nhập hoặc mật khẩu.', status: 401});
    stubFetch(404, {});
    await expect(api.period('x')).rejects.toThrow('Không tìm thấy.');
    stubFetch(500, null);
    await expect(api.classes()).rejects.toThrow('Máy chủ trả lỗi 500.');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('x')));
    const e = await api.classes().catch((x) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect(e.status).toBe(0);
    expect(e.message).toContain('Không kết nối');
  });

  it('địa chỉ mặc định theo localhost; WebSocket đổi sang ws/wss và mang vai trò + mã', () => {
    expect(backendBase()).toBe('http://127.0.0.1:8000');
    expect(boardBase()).toBe('http://localhost:3002');
    setBackendBase('https://api.truong.vn');
    const u = new URL(wsUrl('ABC123', {role: 'console', token: 't k'}));
    expect(u.protocol).toBe('wss:');
    expect(u.pathname).toBe('/ws/rooms/ABC123');
    expect(u.searchParams.get('role')).toBe('console');
    expect(u.searchParams.get('token')).toBe('t k');
  });

  it('các thao tác dữ liệu đi đúng phương thức và đường dẫn', async () => {
    const f = stubFetch(200, {});
    await api.saveClass({name: 'A', grade: '', subject: '', size: 0, notes: ''});
    await api.saveClass({name: 'A', grade: '', subject: '', size: 0, notes: ''}, 'c1');
    await api.deleteLesson('l1');
    await api.startPeriod('p1');
    await api.endPeriod('p1');
    expect(f.mock.calls.map((c) => `${(c[1] as RequestInit).method} ${String(c[0]).replace('http://127.0.0.1:8000', '')}`)).toEqual([
      'POST /api/v1/console/classes',
      'PUT /api/v1/console/classes/c1',
      'DELETE /api/v1/console/lessons/l1',
      'POST /api/v1/console/periods/p1/start',
      'POST /api/v1/console/periods/p1/end',
    ]);
  });
});

const run = (msgs: Record<string, unknown>[], from: LiveState = initialLive) => msgs.reduce((s, m) => liveReducer(s, m as {type: string}), from);
const sub = (id: string, name = 'An', rev = 1) => ({type: 'SUBMISSION', studentId: id, name, rev, at: 1, strokes: [{p: [[1, 1]], c: '#111', w: 3}]});

describe('liveReducer (phòng của tiết đang dạy)', () => {
  it('STATE nối lại khôi phục đợt thu bài, bài đã nộp (có tên), bảng có đang ghép không', () => {
    const s = run([{type: 'STATE', role: 'console', collect: {prompt: 'Giải', open: true}, submissions: [sub('S1', 'An'), sub('S2', 'Bình')], teacherOnline: true}]);
    expect(s.status).toBe('open');
    expect(s.submissions.map((x) => x.name)).toEqual(['An', 'Bình']);
    expect(s.collect).toEqual({prompt: 'Giải', open: true});
    expect(s.boardOnline).toBe(true);
  });

  it('danh sách học sinh có tên, sĩ số, quyền điều khiển', () => {
    const s = run([{type: 'ROSTER', count: 2, students: [{id: 'S1', name: 'An'}, {id: 'S2', name: 'Bình'}], control: 'S2'}]);
    expect(s.roster).toHaveLength(2);
    expect(s.studentCount).toBe(2);
    expect(s.control).toBe('S2');
  });

  it('bài nộp thêm theo thứ tự đầu tiên, nộp lại thay đúng chỗ; đợt mới xóa bài cũ, đóng đợt giữ lại', () => {
    let s = run([{type: 'COLLECT', prompt: 'A', open: true}, sub('S1'), sub('S2', 'Bình'), sub('S1', 'An', 2)]);
    expect(s.submissions.map((x) => [x.studentId, x.rev])).toEqual([['S1', 2], ['S2', 1]]);
    s = liveReducer(s, {type: 'COLLECT', prompt: 'A', open: false});
    expect(s.submissions).toHaveLength(2);
    s = liveReducer(s, {type: 'COLLECT', prompt: 'B', open: true});
    expect(s.submissions).toEqual([]);
  });

  it('bình chọn, trạng thái bảng, đóng phòng, lỗi có lời tiếng Việt', () => {
    let s = run([{type: 'POLL', question: 'Q?', options: ['a', 'b'], open: true}, {type: 'POLL_RESULT', counts: {a: 1, b: 0}, percents: {a: 100, b: 0}, total: 1, students: 3, final: false}]);
    expect(s.poll?.open).toBe(true);
    expect(s.result?.total).toBe(1);
    s = liveReducer(s, {type: 'TEACHER_STATUS', online: true});
    expect(s.boardOnline).toBe(true);
    expect(liveReducer(s, {type: 'ERROR', code: 'use_console'}).error).toContain('kết thúc tiết');
    expect(liveReducer(s, {type: 'ERROR', code: 'zzz'}).error).toBe('Lỗi: zzz');
    expect(liveReducer(s, {type: 'CLOSED'}).status).toBe('closed');
    expect(liveReducer(s, {type: 'LẠ'})).toBe(s);
  });
});

describe('tệp bài soạn', () => {
  const file = lessonToFile('Hàm số', 'Toán 10', [[{id: 'a'}], [{id: 'b'}, {id: 'c'}]]);
  it('xuất rồi nhập lại giữ tên, thư mục, trang', () => {
    expect(parseLessonFile(file)).toEqual({title: 'Hàm số', folder: 'Toán 10', pages: [[{id: 'a'}], [{id: 'b'}, {id: 'c'}]]});
  });
  it('tệp lạ bị từ chối bằng tiếng Việt; phần tử hỏng bị lọc', () => {
    expect(() => parseLessonFile('xx')).toThrow(LessonFileError);
    expect(() => parseLessonFile('{"a":1}')).toThrow(/không phải tệp bài giảng/);
    expect(() => parseLessonFile(JSON.stringify({format: 'socratic-lesson', lesson: {pages: []}}))).toThrow(/không phải tệp bài giảng/);
    expect(() => parseLessonFile(JSON.stringify({format: 'socratic-lesson', lesson: {pages: Array(101).fill([])}}))).toThrow(/quá nhiều trang/);
    expect(() => parseLessonFile('x'.repeat(8 * 1024 * 1024 + 1))).toThrow(/quá lớn/);
    const dirty = parseLessonFile(JSON.stringify({format: 'socratic-lesson', lesson: {title: 7, pages: [[{id: 'ok'}, null, 5, 'x'], 'trang hỏng']}}));
    expect(dirty.title).toBe('Bài nhập từ tệp');
    expect(dirty.pages).toEqual([[{id: 'ok'}], []]);
  });
});
