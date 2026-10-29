import {describe, expect, it, vi} from 'vitest';
import {askLessonNotes} from '../utils/lessonNotes';
import {BoardQaError} from '../utils/boardQa';
import type {MicroLesson} from '../utils/microLesson';

const L: MicroLesson = {
  title: 'Bài thử', subject: 'MATH', durationMs: 60000, stats: {formulas: 1, figures: 0, sims: 0, strokes: 0},
  sections: [{title: 'x', start: 1000, moments: [{t: 1500, kind: 'formula', label: 'y = x²', detail: 'y = x^2'}]}],
};
const ok = (body: unknown, status = 200) => vi.fn().mockResolvedValue({ok: status < 400, status, json: async () => body} as Response) as unknown as typeof fetch;

describe('askLessonNotes', () => {
  it('POST đúng địa chỉ, chỉ gửi dàn bài (không có nét vẽ), khóa AI đi qua tiêu đề', async () => {
    localStorage.setItem('gemini_api_key', ' KG ');
    const f = ok({notes: null, source: 'offline'});
    await askLessonNotes(L, null, f);
    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/canvas\/lesson-notes$/);
    expect((init.headers as Record<string, string>)['x-gemini-api-key']).toBe('KG');
    const body = JSON.parse(init.body as string);
    expect(body.subject_hint).toBe('MATH');
    expect(body.sections[0].moments[0]).toEqual({kind: 'formula', label: 'y = x²', detail: 'y = x^2', t: 2});
    expect(Object.keys(body).sort()).toEqual(['sections', 'subject_hint', 'title']);
    localStorage.clear();
  });

  it('phân loại lỗi: 429, 500, mạng đứt, dữ liệu lạ', async () => {
    await expect(askLessonNotes(L, null, ok({}, 429))).rejects.toThrow(/quá nhanh/);
    await expect(askLessonNotes(L, null, ok({}, 500))).rejects.toThrow(/500/);
    await expect(askLessonNotes(L, null, vi.fn().mockRejectedValue(new TypeError('x')) as unknown as typeof fetch)).rejects.toBeInstanceOf(BoardQaError);
    await expect(askLessonNotes(L, null, ok({}))).rejects.toThrow(/không đọc được/);
  });
});
