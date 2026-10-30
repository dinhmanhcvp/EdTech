/**
 * Gửi vi bài giảng sang học sinh (Mode 2): đóng gói MicroLesson (utils/microLesson.ts) thành ClassroomSnapshot của
 * @socratic/types rồi PUT {apiBase}/api/v1/student/snapshot (services/ai-engine/routers/student_context.py).
 * Không bịa nội dung: mỗi phần của vi bài giảng là một cảnh; công thức đầu tiên của phần là công thức then chốt;
 * lời giảng chỉ có khi giáo viên đã bấm "AI viết lời giảng".
 */
import type {ClassroomBoardSnapshot, ClassroomSnapshot} from '@socratic/types';
import {apiBase} from './apiBase';
import type {LessonNotes, LessonSection, MicroLesson} from './microLesson';

type Subject = ClassroomBoardSnapshot['subject'];

const MAX_SECTIONS = 40;
const SUBJECT_BY_FAMILY: Record<string, Subject> = {
  'Vật lí': 'PHYSICS',
  'Hóa học': 'CHEMISTRY',
  'Sinh học': 'BIOLOGY',
  'Toán': 'MATH',
  'Hình học': 'MATH',
};
const VALID_SUBJECTS = new Set<string>(['MATH', 'PHYSICS', 'CHEMISTRY', 'BIOLOGY']);

const clip = (s: unknown, n: number) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n) : t;
};

/** Nhật ký chỉ ghi môn "STEM", nên môn của từng phần suy ra từ mô phỏng (nhãn "Vật lí: …") hoặc loại hình. */
function subjectOf(lesson: MicroLesson, section: LessonSection): Subject {
  for (const m of section.moments) {
    if (m.kind === 'sim') {
      const family = SUBJECT_BY_FAMILY[m.label.split(':')[0].trim()];
      if (family) return family;
    }
    if (m.kind === 'plane' || m.kind === 'solid') return 'MATH';
  }
  const hinted = (lesson.subject ?? '').toUpperCase();
  return VALID_SUBJECTS.has(hinted) ? (hinted as Subject) : 'MATH';
}

function hash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export interface BuildOptions {
  className?: string;
  /** thay được khi kiểm thử */
  now?: Date;
}

export function buildClassroomSnapshot(lesson: MicroLesson, notes?: LessonNotes | null, opts: BuildOptions = {}): ClassroomSnapshot {
  const now = opts.now ?? new Date();
  const boardSnapshots: ClassroomBoardSnapshot[] = lesson.sections.slice(0, MAX_SECTIONS).map((section, i) => {
    const formula = section.moments.find((m) => m.kind === 'formula' && m.detail);
    const shown = section.moments.filter((m) => m.kind !== 'formula').map((m) => (m.detail ? `${m.label} — ${m.detail}` : m.label));
    return {
      id: `sec-${i + 1}`,
      kind: 'BOARD',
      title: clip(section.title, 200),
      subject: subjectOf(lesson, section),
      latex: clip(formula?.detail ?? '', 400),
      templateId: section.moments.some((m) => m.kind === 'sim') ? 'SIM_SECTION' : 'LESSON_SECTION',
      note: clip(notes?.narrations[i]?.trim() || shown.join('; '), 700),
      parameters: {},
    };
  });
  const snapshot: ClassroomSnapshot = {
    sessionId: `lesson-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${hash(lesson.title)}`,
    className: clip(opts.className ?? '12A1', 80),
    lessonTitle: clip(lesson.title, 200),
    updatedAt: now.toISOString(),
    boardSnapshots,
    studentWork: [],
  };
  if (notes?.summary?.trim()) snapshot.summary = clip(notes.summary, 500);
  if (notes?.key_points.length) snapshot.keyPoints = notes.key_points.slice(0, 8).map((k) => clip(k, 240));
  if (notes?.review_questions.length) snapshot.reviewQuestions = notes.review_questions.slice(0, 8).map((q) => clip(q, 240));
  return snapshot;
}

function authHeaders(): Record<string, string> {
  const token = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_TEACHER_CONTEXT_TOKEN : undefined;
  return token ? {Authorization: `Bearer ${token}`} : {};
}

export class SnapshotPublishError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'SnapshotPublishError';
  }
}

async function sendSnapshot(
  method: 'PUT' | 'POST',
  path: string,
  snapshot: ClassroomSnapshot,
  classId: string | undefined,
  fetchImpl: typeof fetch,
): Promise<Response> {
  if (snapshot.boardSnapshots.length === 0) throw new SnapshotPublishError('Bảng chưa có nội dung nào để gửi cho học sinh.');
  let res: Response;
  try {
    res = await fetchImpl(`${apiBase()}${path}`, {
      method,
      headers: {'Content-Type': 'application/json', ...authHeaders()},
      body: JSON.stringify({class_id: classId ?? '12A1', snapshot}),
    });
  } catch {
    throw new SnapshotPublishError('Không kết nối được máy chủ. Kiểm tra mạng hoặc địa chỉ máy chủ trong "Kết nối AI".');
  }
  if (res.status === 401) throw new SnapshotPublishError('Phiên đăng nhập của giáo viên đã hết hạn. Hãy đăng nhập lại.', 401);
  if (res.status === 403) throw new SnapshotPublishError('Tài khoản này không có quyền gửi bài cho lớp.', 403);
  if (res.status === 422) throw new SnapshotPublishError('Máy chủ từ chối nội dung gửi (quá lớn hoặc sai định dạng).', 422);
  if (!res.ok) throw new SnapshotPublishError(`Máy chủ trả lỗi ${res.status}.`, res.status);
  return res;
}

/** Trả số phần đã gửi; ném SnapshotPublishError với thông báo tiếng Việt khi không gửi được. */
export async function publishClassroomSnapshot(
  snapshot: ClassroomSnapshot,
  opts: {classId?: string} = {},
  fetchImpl: typeof fetch = fetch,
): Promise<{sections: number}> {
  await sendSnapshot('PUT', '/api/v1/student/snapshot', snapshot, opts.classId, fetchImpl);
  return {sections: snapshot.boardSnapshots.length};
}

/** Đóng gói cả tiết thành bản xem lại có mã riêng; học sinh mở /r/<mã> (qua QR) mà không cần đăng nhập. */
export async function publishRecap(snapshot: ClassroomSnapshot, fetchImpl: typeof fetch = fetch): Promise<{code: string; sections: number}> {
  const res = await sendSnapshot('POST', '/api/v1/student/recap', snapshot, undefined, fetchImpl);
  const {code} = (await res.json()) as {code?: string};
  if (!code) throw new SnapshotPublishError('Máy chủ không trả mã xem lại.');
  return {code, sections: snapshot.boardSnapshots.length};
}
