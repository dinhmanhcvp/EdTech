/**
 * Máy khách API hub (`/api/v1/hub/*`) của trang quản lý: dùng chung phiên đăng nhập console (hub nhận token console như giáo viên).
 * Lỗi máy chủ (mã snake_case) được đổi thành câu tiếng Việt để hiện thẳng cho giáo viên.
 */
import {backendBase, getToken} from './api';

export class HubError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const MESSAGES: Record<string, string> = {
  in_use: 'Tài nguyên đã được giao cho lớp, không xóa được.',
  not_found: 'Không tìm thấy.',
  version_conflict: 'Bài vừa được sửa ở nơi khác. Tải lại trang rồi sửa tiếp.',
  too_many_pages: 'File quá 20 trang. Hãy tách file rồi tải lên lần lượt.',
  file_too_large: 'File quá 15 MB.',
  unsupported_file_type: 'Chỉ nhận PDF hoặc ảnh (JPG, PNG). File Word hãy xuất sang PDF trước.',
  unreadable_file: 'Không đọc được file.',
  image_too_large: 'Ảnh có kích thước quá lớn.',
  one_pdf_or_images: 'Mỗi lần tải một file PDF, hoặc nhiều ảnh.',
  period_has_no_class: 'Tiết này chưa chọn lớp.',
  answer_not_gradable: 'Có đáp án máy không đọc được. Viết đáp số dạng "x = 2" hoặc "12".',
};

function message(detail: unknown, status: number): string {
  if (typeof detail === 'string') return MESSAGES[detail] || detail;
  if (Array.isArray(detail)) {
    const text = detail.map((d) => (typeof d?.msg === 'string' ? d.msg : '')).join(' ');
    const known = Object.keys(MESSAGES).find((k) => text.includes(k));
    return known ? MESSAGES[known] : 'Bài chưa hợp lệ: kiểm tra loại câu, phương án và đáp án.';
  }
  return ({401: 'Chưa đăng nhập hoặc phiên đã hết hạn.', 404: 'Không tìm thấy.'} as Record<number, string>)[status] || `Máy chủ trả lỗi ${status}.`;
}

export async function hubFetch<T>(method: string, path: string, body?: unknown, fetchImpl: typeof fetch = fetch): Promise<T> {
  const headers: Record<string, string> = {};
  const tok = getToken();
  if (tok) headers.Authorization = `Bearer ${tok}`;
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await fetchImpl(`${backendBase()}/api/v1/hub${path}`, {method, headers, body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body)});
  } catch {
    throw new HubError('Không kết nối được máy chủ. Kiểm tra mạng hoặc địa chỉ máy chủ.', 0);
  }
  if (!res.ok) {
    let detail: unknown = '';
    try {
      detail = (await res.json())?.detail;
    } catch {
      /* không phải JSON */
    }
    throw new HubError(message(detail, res.status), res.status);
  }
  return (await res.json()) as T;
}

/** Link phụ huynh: trang /parent/<token> của app học sinh. */
export function studentLink(studentAppBase: string, parentToken: string): string {
  return `${studentAppBase.replace(/\/+$/, '')}/parent/${parentToken}`;
}

export function studentAppBase(): string {
  const env = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_STUDENT_APP_URL || '' : '';
  const local = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname) ? 'http://localhost:3002' : '';
  return env || local;
}

export type ResourceKind = 'exercise' | 'exam' | 'slides';
export type QuestionType = 'choice' | 'short' | 'essay' | 'open';
export interface Question {
  id: string;
  type: QuestionType;
  label: string;
  text: string;
  page?: number;
  box?: number[];
  options?: string[];
  answer?: string;
  kcs: {id: string; label: string}[];
  points?: number;
}
export interface ResourceItem {id: string; title: string; subject: string; kind: ResourceKind; source: string; currentVersion: number; pageCount: number; updatedAt: number}
export interface Resource {
  id: string; teacherId: string; version: number; title: string; subject: string; kind: ResourceKind; source: string;
  body: {title: string; subject: string; kind: ResourceKind; questions: Question[]} | null;
  pages: {page: number; width: number; height: number}[];
}
export interface HubStudent {id: string; name: string; loginCode: string; parentToken: string | null}

const blobCache = new Map<string, string>();

export const hub = {
  linkClass: (consoleClassId: string) => hubFetch<{hubClassId: string}>('POST', `/console/classes/${consoleClassId}/link`),
  students: (hubClassId: string) => hubFetch<{students: HubStudent[]}>('GET', `/classes/${hubClassId}/students`).then((r) => r.students),
  addStudents: (hubClassId: string, names: string[]) => hubFetch<{students: HubStudent[]}>('POST', `/classes/${hubClassId}/students`, {names}).then((r) => r.students),
  rotateParentLink: (studentId: string) => hubFetch<{parentToken: string}>('POST', `/students/${studentId}/parent-link`),

  resources: (subject?: string) => hubFetch<{assignments: ResourceItem[]}>('GET', `/assignments${subject ? `?subject=${subject}` : ''}`).then((r) => r.assignments),
  upload: ({title, subject, kind, files}: {title: string; subject: string; kind: ResourceKind; files: File[]}) => {
    const form = new FormData();
    form.set('title', title);
    form.set('subject', subject);
    form.set('kind', kind);
    if (files.length === 1 && files[0].type === 'application/pdf') form.set('file', files[0]);
    else files.forEach((f) => form.append('files', f));
    return hubFetch<{id: string; pages: number}>('POST', '/assignments/upload', form);
  },
  remove: (id: string) => hubFetch<{ok: boolean}>('DELETE', `/assignments/${id}`),
  resource: (id: string) => hubFetch<Resource>('GET', `/assignments/${id}`),
  extract: (id: string) => hubFetch<{questions: Question[]; source: string}>('POST', `/assignments/${id}/extract`),
  quickKey: (text: string) => hubFetch<{questions: Question[]}>('POST', '/assignments/quick-key', {text}).then((r) => r.questions),
  save: (id: string, body: NonNullable<Resource['body']>, baseVersion: number) => hubFetch<{id: string; version: number}>('PUT', `/assignments/${id}`, {body, baseVersion}),

  /** Ảnh trang (có kiểm quyền): tải bằng fetch có token rồi giữ object URL trong bộ nhớ đệm. */
  pageBlobUrl: async (id: string, page: number): Promise<string> => {
    const key = `${id}:${page}`;
    const hit = blobCache.get(key);
    if (hit) return hit;
    const res = await fetch(`${backendBase()}/api/v1/hub/files/page/${id}/${page}`, {headers: {Authorization: `Bearer ${getToken()}`}});
    if (!res.ok) throw new HubError('Không tải được trang.', res.status);
    const url = URL.createObjectURL(await res.blob());
    blobCache.set(key, url);
    return url;
  },
};
