/**
 * Máy khách REST của trang quản lý. Mã đăng nhập nằm trong localStorage của trình duyệt giáo viên (`console_token`); mọi lời gọi gửi
 * `Authorization: Bearer`. Lỗi máy chủ được đổi thành ApiError có thông báo tiếng Việt để hiện thẳng cho giáo viên.
 */
import type {ClassInfo, LessonMeta, Period, PeriodRecord, StartResult, Teacher} from './types';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const TOKEN_KEY = 'console_token';
const URL_KEY = 'backend_url';

const safe = {
  get(k: string): string {
    try {
      return typeof window !== 'undefined' ? window.localStorage.getItem(k) || '' : '';
    } catch {
      return '';
    }
  },
  set(k: string, v: string) {
    try {
      window.localStorage.setItem(k, v);
    } catch {
      /* bỏ qua: trình duyệt chặn lưu trữ */
    }
  },
  del(k: string) {
    try {
      window.localStorage.removeItem(k);
    } catch {
      /* bỏ qua */
    }
  },
};

export const getToken = () => safe.get(TOKEN_KEY);
export const setToken = (t: string) => safe.set(TOKEN_KEY, t);
export const clearToken = () => safe.del(TOKEN_KEY);

const isLocal = (h: string) => h === 'localhost' || h === '127.0.0.1' || h === '[::1]';

/** Địa chỉ máy chủ AI: ô nhập tay (localStorage) > NEXT_PUBLIC_BACKEND_URL lúc build > máy chủ cục bộ khi chạy trên localhost. */
export function backendBase(): string {
  const stored = safe.get(URL_KEY);
  const env = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_BACKEND_URL || '' : '';
  const local = typeof window !== 'undefined' && isLocal(window.location.hostname) ? 'http://127.0.0.1:8000' : '';
  return (stored || env || local).replace(/\/+$/, '');
}
export const setBackendBase = (u: string) => (u.trim() ? safe.set(URL_KEY, u.trim()) : safe.del(URL_KEY));

/** Địa chỉ ứng dụng bảng chiếu (nơi học sinh vào /join/…): ô nhập tay > NEXT_PUBLIC_BOARD_URL > cổng 3002 cục bộ. */
export function boardBase(): string {
  const stored = safe.get('board_url');
  const env = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_BOARD_URL || '' : '';
  const local = typeof window !== 'undefined' && isLocal(window.location.hostname) ? 'http://localhost:3002' : '';
  return (stored || env || local).replace(/\/+$/, '');
}
export const setBoardBase = (u: string) => (u.trim() ? safe.set('board_url', u.trim()) : safe.del('board_url'));

export function wsUrl(roomId: string, query: Record<string, string>): string {
  const base = backendBase() || (typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8000');
  const u = new URL(`${base}/ws/rooms/${encodeURIComponent(roomId)}`);
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
  return u.toString();
}

async function call<T>(method: string, path: string, body?: unknown, fetchImpl: typeof fetch = fetch): Promise<T> {
  const headers: Record<string, string> = {'Content-Type': 'application/json'};
  const tok = getToken();
  if (tok) headers.Authorization = `Bearer ${tok}`;
  let res: Response;
  try {
    res = await fetchImpl(`${backendBase()}${path}`, {method, headers, body: body === undefined ? undefined : JSON.stringify(body)});
  } catch {
    throw new ApiError('Không kết nối được máy chủ. Kiểm tra mạng hoặc địa chỉ máy chủ.', 0);
  }
  if (!res.ok) {
    let detail = '';
    try {
      const j = await res.json();
      detail = typeof j?.detail === 'string' ? j.detail : '';
    } catch {
      /* không phải JSON */
    }
    const fallback: Record<number, string> = {401: 'Chưa đăng nhập hoặc phiên đã hết hạn.', 404: 'Không tìm thấy.', 413: 'Dữ liệu quá lớn.', 429: 'Thao tác quá nhanh, đợi một chút rồi thử lại.'};
    throw new ApiError(detail || fallback[res.status] || `Máy chủ trả lỗi ${res.status}.`, res.status);
  }
  return (await res.json()) as T;
}

type Auth = {token: string; teacher: Teacher};

export const api = {
  register: (username: string, password: string, display_name: string, invite_code = '') => call<Auth>('POST', '/api/v1/console/register', {username, password, display_name, invite_code}),
  login: (username: string, password: string) => call<Auth>('POST', '/api/v1/console/login', {username, password}),
  logout: () => call<{ok: boolean}>('POST', '/api/v1/console/logout'),
  me: () => call<{teacher: Teacher}>('GET', '/api/v1/console/me'),

  classes: () => call<{classes: ClassInfo[]}>('GET', '/api/v1/console/classes').then((r) => r.classes),
  saveClass: (c: Omit<ClassInfo, 'id'>, id?: string) => (id ? call<ClassInfo>('PUT', `/api/v1/console/classes/${id}`, c) : call<ClassInfo>('POST', '/api/v1/console/classes', c)),
  deleteClass: (id: string) => call<{ok: boolean}>('DELETE', `/api/v1/console/classes/${id}`),

  lessons: () => call<{lessons: LessonMeta[]}>('GET', '/api/v1/console/lessons').then((r) => r.lessons),
  lesson: (id: string) => call<LessonMeta & {pages: unknown[][]}>('GET', `/api/v1/console/lessons/${id}`),
  createLesson: (title: string, folder: string, pages: unknown[][]) => call<LessonMeta>('POST', '/api/v1/console/lessons', {title, folder, pages}),
  deleteLesson: (id: string) => call<{ok: boolean}>('DELETE', `/api/v1/console/lessons/${id}`),

  periods: () => call<{periods: Period[]}>('GET', '/api/v1/console/periods').then((r) => r.periods),
  period: (id: string) => call<Period>('GET', `/api/v1/console/periods/${id}`),
  createPeriod: (p: PeriodInput) => call<Period>('POST', '/api/v1/console/periods', p),
  updatePeriod: (id: string, p: PeriodInput) => call<Period>('PUT', `/api/v1/console/periods/${id}`, p),
  deletePeriod: (id: string) => call<{ok: boolean}>('DELETE', `/api/v1/console/periods/${id}`),
  startPeriod: (id: string) => call<StartResult>('POST', `/api/v1/console/periods/${id}/start`),
  endPeriod: (id: string) => call<Period>('POST', `/api/v1/console/periods/${id}/end`),
  live: (id: string) => call<{roomId: string; token: string}>('GET', `/api/v1/console/periods/${id}/live`),
  record: (id: string) => call<PeriodRecord>('GET', `/api/v1/console/periods/${id}/record`),
};

export interface PeriodInput {
  title: string;
  class_id: string | null;
  lesson_id: string | null;
  goals: string;
  notes: string;
  prompts: string[];
}
