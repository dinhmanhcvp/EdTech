/**
 * Máy khách hub (`/api/v1/hub/*`) cho học sinh: đăng nhập bằng mã học sinh (nhớ trên máy), làm bài được giao qua QR,
 * xem tài liệu và gói cuối tiết. Lỗi máy chủ (mã snake_case) đổi thành câu tiếng Việt để hiện thẳng.
 */
import type {MyAssignment, MyResource, OcrResult, PeriodPackage, RunForStudent, StudentSubmissionView, SubmissionResult} from '@socratic/types/src/assignments';
import type {ParentView} from '@socratic/types/src/hub';

const KEY = 'hub_student';

export interface HubStudent {
  token: string;
  student: {id: string; name: string; classId: string; className: string};
}

export class HubApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const MESSAGES: Record<string, string> = {
  not_in_class: 'Bài này không dành cho lớp của em.',
  run_closed: 'Đã hết hạn nhận bài.',
  invalid_credentials: 'Mã học sinh không đúng.',
  not_found: 'Không tìm thấy bài.',
  too_large: 'Ảnh quá lớn.',
  image_too_large: 'Ảnh quá lớn.',
  request_conflict: 'Bài vừa được nộp từ máy khác.',
  bad_version: 'Thầy cô vừa sửa đề. Tải lại trang rồi làm tiếp.',
  uncertain_unresolved: 'Còn chữ máy chưa chắc, em chọn lại giúp.',
};

export function loadStudent(): HubStudent | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as HubStudent) : null;
  } catch {
    return null;
  }
}

export function saveStudent(s: HubStudent | null) {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {
    // shortcut: không có localStorage (chế độ riêng tư) thì phải nhập lại mã mỗi lần
  }
}

function message(detail: unknown, status: number): string {
  if (typeof detail === 'string' && MESSAGES[detail]) return MESSAGES[detail];
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Nhập lại mã học sinh.';
  if (status === 410) return MESSAGES.run_closed;
  return typeof detail === 'string' ? detail : `Máy chủ trả lỗi ${status}.`;
}

async function call(path: string, init: RequestInit, fetchImpl: typeof fetch): Promise<Response> {
  const tok = loadStudent()?.token;
  const headers: Record<string, string> = {...(init.headers as Record<string, string>)};
  if (tok) headers.Authorization = `Bearer ${tok}`;
  const res = await fetchImpl(`/api/v1/hub${path}`, {...init, headers});
  if (!res.ok) {
    const detail = await res.json().then((j) => j?.detail).catch(() => undefined);
    if (res.status === 401 && tok) saveStudent(null);
    throw new HubApiError(message(detail, res.status), res.status);
  }
  return res;
}

export async function hubFetch<T>(method: string, path: string, body?: unknown, fetchImpl: typeof fetch = fetch): Promise<T> {
  const init: RequestInit = {method, headers: body === undefined ? {} : {'Content-Type': 'application/json'}};
  if (body !== undefined) init.body = JSON.stringify(body);
  return (await call(path, init, fetchImpl)).json() as Promise<T>;
}

const blobUrl = async (path: string) => URL.createObjectURL(await (await call(path, {method: 'GET'}, fetch)).blob());

/** Thu ảnh vở về cạnh dài ≤ 1600 px, JPEG; trình duyệt không giải mã được thì gửi nguyên ảnh. */
export async function compressPhoto(file: File, max = 1600): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * k);
    canvas.height = Math.round(bmp.height * k);
    canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error('toBlob'))), 'image/jpeg', 0.85));
  } catch {
    return file;
  }
}

export const requestId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const hubApi = {
  login: async (loginCode: string) => {
    const s = await hubFetch<HubStudent>('POST', '/auth/student', {loginCode});
    saveStudent(s);
    return s;
  },
  byCode: (code: string) => hubFetch<RunForStudent>('GET', `/runs/by-code/${encodeURIComponent(code)}`),
  answer: (runId: string, body: {questionId: string; version: number; requestId: string; choice?: number; text?: string}) =>
    hubFetch<SubmissionResult>('POST', `/runs/${runId}/answers`, body),
  uploadPhoto: async (runId: string, questionId: string, version: number, file: File) => {
    const form = new FormData();
    form.append('photo', await compressPhoto(file), 'photo.jpg');
    form.append('questionId', questionId);
    form.append('version', String(version));
    form.append('requestId', requestId());
    return (await call(`/runs/${runId}/photos`, {method: 'POST', body: form}, fetch)).json() as Promise<OcrResult>;
  },
  confirm: (runId: string, photoId: string, body: {lines: string[]; resolved: number[]; photoOnly: boolean}) =>
    hubFetch<SubmissionResult>('POST', `/runs/${runId}/photos/${photoId}/confirm`, body),
  myAssignments: async () => (await hubFetch<{assignments: MyAssignment[]}>('GET', '/me/assignments')).assignments,
  myResources: async () => (await hubFetch<{resources: MyResource[]}>('GET', '/me/resources')).resources,
  myPeriods: async () => (await hubFetch<{periods: PeriodPackage[]}>('GET', '/me/periods')).periods,
  mySubmission: (id: string) => hubFetch<StudentSubmissionView>('GET', `/me/submissions/${id}`),
  example: (id: string) => hubFetch<StudentSubmissionView>('GET', `/me/examples/${id}`),
  pageUrl: (assignmentId: string, page: number) => blobUrl(`/files/page/${assignmentId}/${page}`),
  submissionUrl: (submissionId: string) => blobUrl(`/files/submission/${submissionId}`),
  parentReport: (token: string) => hubFetch<ParentView & {thisWeek: {assignments?: {correct: number; total: number; runs: number; onTime: number}}}>('GET', `/parent/${encodeURIComponent(token)}/report`),
};
