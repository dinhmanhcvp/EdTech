import {afterEach, describe, expect, it, vi} from 'vitest';
import {SessionError, lessonContext, loadSession, pairBoard, resumeBoard, saveLessonToConsole, saveSnapshot, storeSession, type BoardSession} from '../utils/boardSession';
import {classroomReducer, initialClassroom} from '../utils/classroomState';
import {cleanPages} from '../utils/lessonLibrary';

afterEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

const PAYLOAD = {
  boardToken: 'BT',
  roomId: 'ROOM77',
  roomToken: 'RT',
  period: {id: 'p1', title: 'Hàm số bậc hai', goals: 'Hiểu parabol', prompts: ['Giải x²-4=0']},
  class: {name: '10A1', grade: '10', subject: 'Toán', size: 40, notes: 'Lớp khá'},
  teacher: {display_name: 'Cô Lan'},
  pages: [[{id: 'a', points: [{x: 1, y: 2}], color: '#111', width: 3}, {id: 'bad'}], 'trang hỏng'],
  resumed: false,
};
const ok = (body: unknown, status = 200) => vi.fn().mockResolvedValue({ok: status < 400, status, json: async () => body} as Response) as unknown as typeof fetch;

describe('pairBoard', () => {
  it('POST mã viết hoa + mã bảng cũ; trả phiên đầy đủ và các trang đã làm sạch', async () => {
    const f = ok(PAYLOAD);
    const r = await pairBoard(' abc234 ', 'OLD', f);
    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/board\/pair$/);
    expect(JSON.parse(init.body as string)).toEqual({code: 'ABC234', previous_board_token: 'OLD'});
    expect(r.session).toMatchObject({boardToken: 'BT', roomId: 'ROOM77', roomToken: 'RT', periodId: 'p1', title: 'Hàm số bậc hai', teacherName: 'Cô Lan', prompts: ['Giải x²-4=0']});
    expect(r.session.classInfo).toMatchObject({name: '10A1', size: 40, notes: 'Lớp khá'});
    expect(r.pages).toHaveLength(2);
    expect(r.pages[0]).toHaveLength(1); // nét hỏng bị bỏ
    expect(r.pages[1]).toEqual([]); // trang hỏng thành trang trống
  });

  it('báo lỗi tiếng Việt: lấy lời của máy chủ, lỗi mạng, dữ liệu lạ', async () => {
    const bad = vi.fn().mockResolvedValue({ok: false, status: 404, json: async () => ({detail: 'Mã ghép sai hoặc đã hết hạn.'})} as Response) as unknown as typeof fetch;
    await expect(pairBoard('XXXXXX', null, bad)).rejects.toMatchObject({message: 'Mã ghép sai hoặc đã hết hạn.', status: 404});
    await expect(pairBoard('XXXXXX', null, vi.fn().mockRejectedValue(new TypeError('x')) as unknown as typeof fetch)).rejects.toThrow(/Không kết nối/);
    await expect(pairBoard('XXXXXX', null, ok({boardToken: 'x'}))).rejects.toBeInstanceOf(SessionError);
  });

  it('tiết không có lớp và không có bài: lớp null, một trang trống', async () => {
    const r = await pairBoard('ABC234', null, ok({...PAYLOAD, class: null, pages: null}));
    expect(r.session.classInfo).toBeNull();
    expect(r.pages).toEqual([[]]);
  });
});

describe('resumeBoard / saveSnapshot / saveLessonToConsole', () => {
  it('resume: thành công trả phiên; 410 = hết tiết; lỗi khác hoặc mất mạng = chưa dùng được', async () => {
    const f = ok({...PAYLOAD, resumed: true});
    const r = await resumeBoard('BT', f);
    expect(typeof r === 'object' && r.resumed).toBe(true);
    expect(((f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit).headers).toEqual({'X-Board-Token': 'BT'});
    expect(await resumeBoard('BT', ok({}, 410))).toBe('gone');
    expect(await resumeBoard('BT', ok({}, 409))).toBe('unavailable');
    expect(await resumeBoard('BT', vi.fn().mockRejectedValue(new Error('x')) as unknown as typeof fetch)).toBe('unavailable');
  });

  it('snapshot: ok / gone (410) / error; gửi mã bảng trong tiêu đề', async () => {
    const f = ok({ok: true});
    expect(await saveSnapshot('BT', [[]], f)).toBe('ok');
    expect(((f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1] as RequestInit).headers).toMatchObject({'X-Board-Token': 'BT'});
    expect(await saveSnapshot('BT', [[]], ok({}, 410))).toBe('gone');
    expect(await saveSnapshot('BT', [[]], ok({}, 500))).toBe('error');
    expect(await saveSnapshot('BT', [[]], vi.fn().mockRejectedValue(new Error('x')) as unknown as typeof fetch)).toBe('error');
  });

  it('lưu bài: trả kết quả; 410 báo tiết đã kết thúc; 413 báo quá lớn', async () => {
    expect(await saveLessonToConsole('BT', 'Bài', '10A1', [[]], ok({id: 'l1', title: 'Bài', page_count: 1}))).toMatchObject({id: 'l1'});
    await expect(saveLessonToConsole('BT', 'Bài', '', [[]], ok({}, 410))).rejects.toThrow(/Tiết đã kết thúc/);
    await expect(saveLessonToConsole('BT', 'Bài', '', [[]], ok({}, 413))).rejects.toThrow(/quá lớn/);
  });
});

describe('phiên trong thẻ trình duyệt và ngữ cảnh AI', () => {
  const S: BoardSession = {boardToken: 'BT', roomId: 'R', roomToken: 'T', periodId: 'p1', title: 'Hàm số', goals: 'Hiểu parabol', prompts: [], teacherName: 'Cô Lan', classInfo: {name: '10A1', grade: '10', subject: 'Toán', size: 40, notes: 'Yếu hình'}};
  it('lưu/đọc/xóa bằng sessionStorage (không phải localStorage dùng chung); dữ liệu hỏng thì bỏ qua', () => {
    storeSession(S);
    expect(loadSession()).toEqual(S);
    expect(localStorage.length).toBe(0);
    storeSession(null);
    expect(loadSession()).toBeNull();
    sessionStorage.setItem('socratic_board_session', '{hỏng');
    expect(loadSession()).toBeNull();
    sessionStorage.setItem('socratic_board_session', JSON.stringify({boardToken: 1}));
    expect(loadSession()).toBeNull();
  });
  it('ngữ cảnh gửi AI: có tên tiết, mục tiêu, lớp; bỏ trường rỗng; không ghép thì không có', () => {
    expect(lessonContext(null)).toBeUndefined();
    expect(lessonContext(S)).toEqual({title: 'Hàm số', goals: 'Hiểu parabol', class: {name: '10A1', grade: '10', subject: 'Toán', size: 40, notes: 'Yếu hình'}});
    expect(lessonContext({...S, goals: '', classInfo: null})).toEqual({title: 'Hàm số'});
  });
});

describe('bài chiếu từ trang quản lý (SHOW_SUBMISSION)', () => {
  it('reducer nhận nhãn ẩn danh + nét, tăng nonce mỗi lần; không có trường tên', () => {
    const msg = {type: 'SHOW_SUBMISSION', studentId: 'S1', rev: 2, label: 'Bài 3', strokes: [{p: [[1, 1]], c: '#111', w: 3}]};
    let s = classroomReducer(initialClassroom, msg);
    expect(s.shown).toMatchObject({studentId: 'S1', rev: 2, label: 'Bài 3', nonce: 1});
    s = classroomReducer(s, msg);
    expect(s.shown?.nonce).toBe(2);
    expect(Object.keys(s.shown!)).not.toContain('name');
    expect(classroomReducer(s, {type: 'ERROR', code: 'use_console'}).error).toContain('trang quản lý');
  });
  it('cleanPages luôn trả ít nhất một trang', () => {
    expect(cleanPages(null)).toEqual([[]]);
    expect(cleanPages([])).toEqual([[]]);
  });
});
