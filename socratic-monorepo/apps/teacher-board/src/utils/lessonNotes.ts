/**
 * Nhờ AI viết lời giảng cho vi bài giảng: POST {apiBase}/api/v1/canvas/lesson-notes (services/ai-engine/routers/lesson_notes.py).
 * Chỉ gửi dàn bài (tên, mô tả ngắn, số đo), không gửi nét vẽ hay ảnh. Không có AI thì trả null, không tự bịa lời giảng.
 */
import {apiBase} from './apiBase';
import {BoardQaError, aiHeaders} from './boardQa';
import type {LessonNotes, MicroLesson} from './microLesson';

export interface LessonNotesResponse {
  notes: LessonNotes | null;
  source: 'gemini' | 'openrouter' | 'offline';
  model?: string | null;
  note?: string;
}

export async function askLessonNotes(lesson: MicroLesson, subject?: string | null, fetchImpl: typeof fetch = fetch): Promise<LessonNotesResponse> {
  let res: Response;
  try {
    res = await fetchImpl(`${apiBase()}/api/v1/canvas/lesson-notes`, {
      method: 'POST',
      headers: aiHeaders(),
      body: JSON.stringify({
        title: lesson.title.slice(0, 160),
        subject_hint: subject ?? lesson.subject ?? undefined,
        sections: lesson.sections.slice(0, 12).map((s) => ({
          title: s.title.slice(0, 200),
          moments: s.moments.slice(0, 12).map((m) => ({kind: m.kind, label: m.label.slice(0, 200), detail: (m.detail ?? '').slice(0, 400), t: Math.round(m.t / 1000)})),
        })),
      }),
    });
  } catch {
    throw new BoardQaError('Không kết nối được máy chủ AI. Kiểm tra mạng hoặc địa chỉ máy chủ trong "Kết nối AI".');
  }
  if (res.status === 429) throw new BoardQaError('Gọi AI quá nhanh, đợi vài giây rồi thử lại.', 429);
  if (!res.ok) throw new BoardQaError(`Máy chủ AI trả lỗi ${res.status}.`, res.status);
  const data = (await res.json()) as LessonNotesResponse;
  if (!data || !('notes' in data)) throw new BoardQaError('Máy chủ AI trả về dữ liệu không đọc được.');
  return data;
}
