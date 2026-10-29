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
export interface RunMetrics {
  runId: string;
  questions: {questionId: string; label: string; submittedRate: number; correctRate: number | null; firstTryRate: number | null; wrongAnswers: {answer: string; count: number}[]; pending: number}[];
  students: {studentId: string; name: string; score10: number | null; pending: number; done: number}[];
}
export interface PeriodRun {runId: string; code: string; url: string; assignmentId: string; classId: string; periodId: string | null; openedAt: number; closedAt: number | null; dueAt: number | null; phase: 'in_class' | 'homework' | 'closed'; title: string; metrics: RunMetrics}
export interface PeriodSummary {periodId: string; runs: PeriodRun[]; resources: unknown[]; pending: number; needsSupport: {studentId: string; name: string; reasons: string[]}[]}
export interface GridRow {
  submissionId: string; studentId: string; name: string; questionId: string; mode: 'choice' | 'typed' | 'photo';
  status: 'graded' | 'pending_teacher' | 'teacher_confirmed'; score: number | null; attempt: number; phase: 'in_class' | 'homework';
  answer: string | null; confirmed: string[] | null; ocr: unknown; grade: {summary?: string; first_error?: number | null} | null; hasPhoto: boolean;
}
export interface HubStudent {id: string; name: string; loginCode: string; parentToken: string | null}

const blobCache = new Map<string, string>();

async function blob(path: string): Promise<string> {
  const hit = blobCache.get(path);
  if (hit) return hit;
  const res = await fetch(`${backendBase()}/api/v1/hub${path}`, {headers: {Authorization: `Bearer ${getToken()}`}});
  if (!res.ok) throw new HubError('Không tải được ảnh.', res.status);
  const url = URL.createObjectURL(await res.blob());
  blobCache.set(path, url);
  return url;
}

function stream(path: string, onEvent: (e: {type: string; [k: string]: unknown}) => void): () => void {
  let stopped = false;
  let ctrl: AbortController | null = null;
  let delay = 1000;
  const run = async () => {
    while (!stopped) {
      ctrl = new AbortController();
      try {
        const res = await fetch(`${backendBase()}/api/v1/hub${path}`, {headers: {Authorization: `Bearer ${getToken()}`}, signal: ctrl.signal});
        if (!res.ok || !res.body) throw new Error('stream');
        delay = 1000;
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        for (;;) {
          const {value, done} = await reader.read();
          if (done) break;
          buf += dec.decode(value, {stream: true});
          const blocks = buf.split('\n\n');
          buf = blocks.pop() || '';
          for (const b of blocks) {
            const line = b.split('\n').find((l) => l.startsWith('data: '));
            if (line) {
              try {
                onEvent(JSON.parse(line.slice(6)));
              } catch {
                /* bỏ qua sự kiện hỏng */
              }
            }
          }
        }
      } catch {
        /* mất kết nối: thử lại */
      }
      if (stopped) return;
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 2, 15000);
    }
  };
  void run();
  return () => {
    stopped = true;
    ctrl?.abort();
  };
}

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

  periodSummary: (periodId: string) => hubFetch<PeriodSummary>('GET', `/console/periods/${periodId}/summary`),
  runSubmissions: (runId: string) => hubFetch<{submissions: GridRow[]}>('GET', `/runs/${runId}/submissions`).then((r) => r.submissions),
  review: (submissionId: string, score: number) => hubFetch<{status: string}>('POST', `/submissions/${submissionId}/review`, {score}),
  show: (runId: string, submissionId: string) => hubFetch<unknown>('POST', `/runs/${runId}/show`, {submissionId}),
  closeRun: (runId: string) => hubFetch<unknown>('POST', `/runs/${runId}/close`),
  setDue: (runId: string, dueAt: number) => hubFetch<unknown>('PUT', `/runs/${runId}`, {dueAt}),
  submissionBlobUrl: (submissionId: string) => blob(`/files/submission/${submissionId}`),
  /** Luồng sự kiện giáo viên (submission_update, metric_delta…): fetch có header, tự nối lại; trả hàm hủy. */
  streamTeacher: (onEvent: (e: {type: string; [k: string]: unknown}) => void) => stream('/stream/teacher', onEvent),

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
