/**
 * Bảng gọi hub (/api/v1/hub/*) bằng X-Board-Token của tiết đang ghép (utils/boardSession.ts): tài nguyên (slide/bài tập/đề),
 * nét viết đè theo tiết, giao bài, tiến độ, chọn bài để chữa. Ảnh tải bằng fetch có header rồi giữ object URL (không có link công khai).
 */
import {apiBase} from './apiBase';
import {loadSession} from './boardSession';

export class BoardHubError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const MESSAGES: Record<string, string> = {
  board_not_paired: 'Ghép bảng với tiết để mở tài nguyên.',
  period_has_no_class: 'Tiết này chưa chọn lớp: chọn lớp cho tiết trên trang quản lý.',
  not_found: 'Không tìm thấy.',
  too_many_strokes: 'Quá nhiều nét trên một trang.',
};

const token = () => loadSession()?.boardToken || '';

export async function boardHubFetch<T>(method: string, path: string, body?: unknown, tok: string = token(), fetchImpl: typeof fetch = fetch): Promise<T> {
  if (!tok) throw new BoardHubError(MESSAGES.board_not_paired, 401);
  const headers: Record<string, string> = {'X-Board-Token': tok};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await fetchImpl(`${apiBase()}/api/v1/hub${path}`, {method, headers, body: body === undefined ? undefined : JSON.stringify(body)});
  } catch {
    throw new BoardHubError('Không kết nối được máy chủ.', 0);
  }
  if (!res.ok) {
    let detail: unknown = '';
    try {
      detail = (await res.json())?.detail;
    } catch {
      /* không phải JSON */
    }
    throw new BoardHubError((typeof detail === 'string' && MESSAGES[detail]) || `Máy chủ trả lỗi ${res.status}.`, res.status);
  }
  return (await res.json()) as T;
}

export type ResourceKind = 'slides' | 'exercise' | 'exam';
export interface ResourceItem {id: string; title: string; subject: string; kind: ResourceKind; source: string; currentVersion: number; pageCount: number; updatedAt: number}
export interface PublicQuestion {id: string; type: 'choice' | 'short' | 'essay' | 'open'; label: string; text: string; page?: number; box?: number[]; options?: string[]}
export interface PageInfo {page: number; width: number; height: number}
export interface ResourceDetail {
  id: string; version: number; title: string; subject: string; kind: ResourceKind; pages: PageInfo[];
  body: {questions: PublicQuestion[]} | null;
}
export interface InkStroke {p: number[][]; c: string; w: number}
export interface RunInfo {runId: string; code: string; url: string; classHasStudents?: boolean}
export interface Progress {questions: {questionId: string; submitted: number; correctRate: number | null}[]}
export interface BoardListItem {submissionId: string; label: string; questionId: string; status: string; firstError: number | null; hasPhoto: boolean}
export interface BoardSubmission {
  submissionId: string; label: string; questionId: string; status: string; confirmed: string[] | null;
  lines: {text?: string; latex?: string; y0?: number; y1?: number}[] | null;
  grade: {first_error?: number | null; summary?: string; steps?: {index: number; status: string; title?: string; explain?: string; fix?: string}[]} | null;
  correction: {strokes: InkStroke[]} | null; hasPhoto: boolean;
}

const blobs = new Map<string, string>();

async function blob(path: string): Promise<string> {
  const hit = blobs.get(path);
  if (hit) return hit;
  const tok = token();
  if (!tok) throw new BoardHubError(MESSAGES.board_not_paired, 401);
  const res = await fetch(`${apiBase()}/api/v1/hub${path}`, {headers: {'X-Board-Token': tok}});
  if (!res.ok) throw new BoardHubError('Không tải được ảnh.', res.status);
  const url = URL.createObjectURL(await res.blob());
  blobs.set(path, url);
  return url;
}

/** Bộ nhớ đệm ảnh đã tải (đối tượng ảnh trên bảng đọc lại đồng bộ khi vẽ). */
export const cachedPageUrl = (assignmentId: string, page: number): string | undefined => blobs.get(`/files/page/${assignmentId}/${page}`);

function stream(onEvent: (e: {type: string; [k: string]: unknown}) => void): () => void {
  let stopped = false;
  let ctrl: AbortController | null = null;
  let delay = 1000;
  const run = async () => {
    while (!stopped) {
      ctrl = new AbortController();
      try {
        const res = await fetch(`${apiBase()}/api/v1/hub/board/stream`, {headers: {'X-Board-Token': token()}, signal: ctrl.signal});
        if (!res.ok || !res.body) throw new Error('stream');
        delay = 1000;
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        for (;;) {
          const {value, done} = await reader.read();
          if (done) break;
          buf += dec.decode(value, {stream: true});
          const parts = buf.split('\n\n');
          buf = parts.pop() || '';
          for (const part of parts) {
            const line = part.split('\n').find((l) => l.startsWith('data: '));
            if (!line) continue;
            try {
              onEvent(JSON.parse(line.slice(6)));
            } catch {
              /* bỏ qua sự kiện hỏng */
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

export const hubBoard = {
  resources: () => boardHubFetch<{assignments: ResourceItem[]}>('GET', '/board/assignments').then((r) => r.assignments),
  resource: (id: string) => boardHubFetch<ResourceDetail>('GET', `/board/assignments/${id}`),
  open: (id: string) => boardHubFetch<{ok: boolean}>('POST', `/board/resources/${id}/open`).then(() => undefined),
  getInk: (id: string, page: number) => boardHubFetch<{strokes: InkStroke[]}>('GET', `/board/resources/${id}/pages/${page}/annotations`).then((r) => r.strokes),
  putInk: (id: string, page: number, strokes: InkStroke[]) =>
    boardHubFetch<{ok: boolean}>('PUT', `/board/resources/${id}/pages/${page}/annotations`, {strokes}).then(() => undefined),
  pageUrl: (id: string, page: number) => blob(`/files/page/${id}/${page}`),
  openRun: (assignmentId: string) => boardHubFetch<RunInfo>('POST', '/board/runs', {assignmentId}),
  closeRun: (runId: string) => boardHubFetch<unknown>('POST', `/board/runs/${runId}/close`),
  progress: (runId: string) => boardHubFetch<Progress>('GET', `/board/runs/${runId}/progress`),
  submissions: (runId: string, questionId?: string, status?: string) => {
    const q = new URLSearchParams();
    if (questionId) q.set('questionId', questionId);
    if (status) q.set('status', status);
    return boardHubFetch<{submissions: BoardListItem[]}>('GET', `/board/runs/${runId}/submissions${q.toString() ? `?${q}` : ''}`).then((r) => r.submissions);
  },
  submission: (id: string) => boardHubFetch<BoardSubmission>('GET', `/board/submissions/${id}`),
  submissionUrl: (id: string) => blob(`/files/submission/${id}`),
  saveCorrection: (id: string, strokes: InkStroke[]) => boardHubFetch<unknown>('PUT', `/board/submissions/${id}/correction`, {strokes}),
  show: (runId: string, submissionId: string) => boardHubFetch<unknown>('POST', `/board/runs/${runId}/show`, {submissionId}),
  stream,
};
