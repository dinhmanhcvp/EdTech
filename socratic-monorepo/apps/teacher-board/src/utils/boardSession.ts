/**
 * Phiên ghép bảng với một tiết học của trang quản lý (services/ai-engine/routers/console.py, nhóm /api/v1/board/*).
 *
 * Bảng chung do nhiều giáo viên dùng lần lượt, mỗi tiết một giáo viên. Trong lúc ghép:
 *  - bài và ảnh chụp bảng lưu LÊN MÁY CHỦ theo tiết (không dùng localStorage dùng chung của máy bảng);
 *  - hết tiết (hoặc ghép sang tiết khác) bảng tự dọn sạch, giáo viên sau không thấy gì của người trước.
 * Mã bảng nằm trong sessionStorage của thẻ trình duyệt: làm mới trang giữa tiết vẫn khôi phục được, đóng thẻ thì mất.
 */
import {apiBase} from './apiBase';
import type {Stroke} from './lassoGeometry';
import {cleanPages} from './lessonLibrary';

export interface BoardSession {
  boardToken: string;
  roomId: string;
  roomToken: string;
  periodId: string;
  title: string;
  goals: string;
  prompts: string[];
  teacherName: string;
  /** lớp của tiết (nếu giáo viên đã chọn): ngữ cảnh cho AI hỏi đáp */
  classInfo: {name: string; grade: string; subject: string; size: number; notes: string} | null;
}

export interface PairResult {
  session: BoardSession;
  pages: Stroke[][];
  resumed: boolean;
}

export class SessionError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

const KEY = 'socratic_board_session';

export function loadSession(storage: Pick<Storage, 'getItem'> | null = typeof window !== 'undefined' ? window.sessionStorage : null): BoardSession | null {
  try {
    const v = JSON.parse(storage?.getItem(KEY) || 'null');
    return v && typeof v.boardToken === 'string' && typeof v.roomId === 'string' && typeof v.roomToken === 'string' && typeof v.periodId === 'string' ? (v as BoardSession) : null;
  } catch {
    return null;
  }
}

export function storeSession(s: BoardSession | null, storage: Pick<Storage, 'setItem' | 'removeItem'> | null = typeof window !== 'undefined' ? window.sessionStorage : null): void {
  try {
    if (s) storage?.setItem(KEY, JSON.stringify(s));
    else storage?.removeItem(KEY);
  } catch {
    /* trình duyệt chặn lưu trữ: phiên chỉ sống trong bộ nhớ trang */
  }
}

const fail = (res: Response, fallback: string, detail?: string) => new SessionError(detail || fallback, res.status);

async function detailOf(res: Response): Promise<string | undefined> {
  try {
    const j = await res.json();
    return typeof j?.detail === 'string' ? j.detail : undefined;
  } catch {
    return undefined;
  }
}

function toPairResult(d: any): PairResult {
  if (!d?.boardToken || !d?.roomId || !d?.roomToken || !d?.period?.id) throw new SessionError('Máy chủ trả về dữ liệu không đọc được.');
  return {
    session: {
      boardToken: d.boardToken,
      roomId: d.roomId,
      roomToken: d.roomToken,
      periodId: d.period.id,
      title: String(d.period.title ?? ''),
      goals: String(d.period.goals ?? ''),
      prompts: Array.isArray(d.period.prompts) ? d.period.prompts.map(String) : [],
      teacherName: String(d.teacher?.display_name ?? ''),
      classInfo: d.class ? {name: String(d.class.name ?? ''), grade: String(d.class.grade ?? ''), subject: String(d.class.subject ?? ''), size: Number(d.class.size) || 0, notes: String(d.class.notes ?? '')} : null,
    },
    pages: cleanPages(d.pages),
    resumed: !!d.resumed,
  };
}

/** Nhập mã ghép một lần; `previous` là mã bảng của lần ghép trước (nếu có) để máy chủ khép tiết cũ. */
export async function pairBoard(code: string, previous: string | null, fetchImpl: typeof fetch = fetch): Promise<PairResult> {
  let res: Response;
  try {
    res = await fetchImpl(`${apiBase()}/api/v1/board/pair`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({code: code.trim().toUpperCase(), previous_board_token: previous ?? ''}),
    });
  } catch {
    throw new SessionError('Không kết nối được máy chủ. Kiểm tra mạng hoặc địa chỉ máy chủ trong "Kết nối AI".');
  }
  if (!res.ok) throw fail(res, res.status === 429 ? 'Thử quá nhanh, đợi vài giây rồi nhập lại.' : `Máy chủ trả lỗi ${res.status}.`, await detailOf(res));
  return toPairResult(await res.json());
}

/**
 * Làm mới trang bảng giữa tiết: cùng mã bảng nhận lại tiết và ảnh chụp mới nhất.
 * 'gone' = tiết đã kết thúc hoặc bảng đã ghép sang tiết khác; 'unavailable' = mạng/máy chủ lỗi hoặc phòng mất (không đoán, để giáo viên ghép lại).
 */
export async function resumeBoard(token: string, fetchImpl: typeof fetch = fetch): Promise<PairResult | 'gone' | 'unavailable'> {
  try {
    const res = await fetchImpl(`${apiBase()}/api/v1/board/resume`, {headers: {'X-Board-Token': token}});
    if (res.status === 410) return 'gone';
    if (!res.ok) return 'unavailable';
    return toPairResult(await res.json());
  } catch {
    return 'unavailable';
  }
}

/** Lưu ảnh chụp bảng của tiết. 'gone' = tiết đã kết thúc hoặc bảng đã ghép sang tiết khác (bảng phải tự dọn). */
export async function saveSnapshot(token: string, pages: Stroke[][], fetchImpl: typeof fetch = fetch): Promise<'ok' | 'gone' | 'error'> {
  try {
    const res = await fetchImpl(`${apiBase()}/api/v1/board/snapshot`, {method: 'PUT', headers: {'Content-Type': 'application/json', 'X-Board-Token': token}, body: JSON.stringify({pages})});
    return res.ok ? 'ok' : res.status === 410 ? 'gone' : 'error';
  } catch {
    return 'error';
  }
}

/** Lưu bảng đang dạy vào kho bài của CHÍNH giáo viên đang dạy tiết này. */
export async function saveLessonToConsole(token: string, title: string, folder: string, pages: Stroke[][], fetchImpl: typeof fetch = fetch): Promise<{id: string; title: string; page_count: number}> {
  let res: Response;
  try {
    res = await fetchImpl(`${apiBase()}/api/v1/board/lessons`, {method: 'POST', headers: {'Content-Type': 'application/json', 'X-Board-Token': token}, body: JSON.stringify({title, folder, pages})});
  } catch {
    throw new SessionError('Không kết nối được máy chủ.');
  }
  if (!res.ok) throw fail(res, res.status === 410 ? 'Tiết đã kết thúc, không lưu được.' : res.status === 413 ? 'Bài quá lớn để lưu.' : `Máy chủ trả lỗi ${res.status}.`, res.status === 410 ? undefined : await detailOf(res));
  return res.json();
}

/** Ngữ cảnh tiết/lớp gửi kèm câu hỏi AI để câu trả lời đúng mức độ (không có thì bỏ). */
export function lessonContext(s: BoardSession | null): {title: string; goals?: string; class?: {name: string; grade?: string; subject?: string; size?: number; notes?: string}} | undefined {
  if (!s) return undefined;
  const c = s.classInfo;
  return {
    title: s.title.slice(0, 160),
    ...(s.goals ? {goals: s.goals.slice(0, 600)} : {}),
    ...(c ? {class: {name: c.name, ...(c.grade ? {grade: c.grade} : {}), ...(c.subject ? {subject: c.subject} : {}), ...(c.size ? {size: c.size} : {}), ...(c.notes ? {notes: c.notes.slice(0, 600)} : {})}} : {}),
  };
}
