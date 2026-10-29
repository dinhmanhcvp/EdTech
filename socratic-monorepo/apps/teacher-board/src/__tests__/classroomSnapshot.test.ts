import {describe, it, expect, vi} from 'vitest';
import {ClassroomSnapshotSchema} from '@socratic/types';
import type {LessonNotes, MicroLesson} from '../utils/microLesson';
import {buildClassroomSnapshot, publishClassroomSnapshot} from '../utils/classroomSnapshot';

const NOW = new Date('2026-10-29T08:00:00Z');
const lesson: MicroLesson = {
  title: 'Dao động điều hòa',
  subject: 'STEM',
  durationMs: 600_000,
  stats: {formulas: 2, figures: 1, sims: 1, strokes: 9},
  sections: [
    {title: 'x = A cos(ωt)', start: 1000, moments: [
      {t: 1000, kind: 'formula', label: 'x = A cos(ωt)', detail: 'x = A\\cos(\\omega t)'},
      {t: 2000, kind: 'formula', label: 'v = -Aω sin(ωt)', detail: 'v = -A\\omega\\sin(\\omega t)'},
    ]},
    {title: 'Vật lí: con lắc đơn', start: 200_000, moments: [{t: 200_000, kind: 'sim', label: 'Vật lí: pendulum'}]},
    {title: 'Tam giác ABC', start: 400_000, moments: [{t: 400_000, kind: 'plane', label: 'Tam giác ABC', detail: 'AB = 3, BC = 4; S = 6'}]},
  ],
};
const notes: LessonNotes = {
  summary: 'Tiết học về dao động.',
  narrations: ['Chúng ta bắt đầu với phương trình dao động.', '', ''],
  key_points: ['x biến thiên điều hòa'],
  review_questions: ['Vì sao v lệch pha so với x?'],
};

describe('buildClassroomSnapshot', () => {
  it('turns every section into one board snapshot that satisfies the shared contract', () => {
    const snap = buildClassroomSnapshot(lesson, notes, {className: '12A1', now: NOW});
    expect(ClassroomSnapshotSchema.safeParse(snap).success).toBe(true);
    expect(snap.boardSnapshots.map((b) => b.id)).toEqual(['sec-1', 'sec-2', 'sec-3']);
    expect(snap.lessonTitle).toBe('Dao động điều hòa');
    expect(snap.className).toBe('12A1');
    expect(snap.studentWork).toEqual([]);
  });

  it('uses the first formula as the section key and leaves it empty when there is none', () => {
    const snap = buildClassroomSnapshot(lesson, null, {now: NOW});
    expect(snap.boardSnapshots[0].latex).toBe('x = A\\cos(\\omega t)');
    expect(snap.boardSnapshots[1].latex).toBe('');
    expect(snap.boardSnapshots[2].latex).toBe('');
  });

  it('infers the subject per section because the journal header only says STEM', () => {
    const snap = buildClassroomSnapshot(lesson, null, {now: NOW});
    expect(snap.boardSnapshots[1].subject).toBe('PHYSICS');
    expect(snap.boardSnapshots[2].subject).toBe('MATH');
  });

  it('carries the AI narration as the note, else a plain list of what was shown, and never invents text', () => {
    const withAi = buildClassroomSnapshot(lesson, notes, {now: NOW});
    expect(withAi.boardSnapshots[0].note).toBe('Chúng ta bắt đầu với phương trình dao động.');
    expect(withAi.boardSnapshots[2].note).toContain('AB = 3, BC = 4; S = 6');
    expect(withAi.summary).toBe('Tiết học về dao động.');
    expect(withAi.keyPoints).toEqual(['x biến thiên điều hòa']);
    expect(withAi.reviewQuestions).toEqual(['Vì sao v lệch pha so với x?']);
    const plain = buildClassroomSnapshot(lesson, null, {now: NOW});
    expect(plain.summary).toBeUndefined();
    expect(plain.reviewQuestions).toBeUndefined();
  });

  it('keeps the session id stable for the same lesson and day, and different for another lesson', () => {
    const a = buildClassroomSnapshot(lesson, null, {now: NOW}).sessionId;
    expect(buildClassroomSnapshot(lesson, notes, {now: NOW}).sessionId).toBe(a);
    expect(buildClassroomSnapshot({...lesson, title: 'Sóng cơ'}, null, {now: NOW}).sessionId).not.toBe(a);
  });

  it('caps the number of sections and the length of text', () => {
    const many: MicroLesson = {...lesson, sections: Array.from({length: 60}, (_, i) => ({title: `P${i}`, start: i, moments: [{t: i, kind: 'formula' as const, label: 'x', detail: 'y'.repeat(900)}]}))};
    const snap = buildClassroomSnapshot(many, null, {now: NOW});
    expect(snap.boardSnapshots.length).toBe(40);
    expect(snap.boardSnapshots[0].latex.length).toBeLessThanOrEqual(400);
    expect(ClassroomSnapshotSchema.safeParse(snap).success).toBe(true);
  });
});

describe('publishClassroomSnapshot', () => {
  const snap = buildClassroomSnapshot(lesson, null, {now: NOW});

  it('PUTs the snapshot with the class id to the student snapshot endpoint', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ok: true, status: 200, json: async () => ({status: 'saved'})});
    const r = await publishClassroomSnapshot(snap, {classId: '12A1'}, fetchImpl as unknown as typeof fetch);
    expect(r).toEqual({sections: 3});
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/v1\/student\/snapshot$/);
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({class_id: '12A1', snapshot: snap});
  });

  it('explains auth and network failures in Vietnamese', async () => {
    const f = (status: number) => vi.fn().mockResolvedValue({ok: false, status, json: async () => ({})}) as unknown as typeof fetch;
    await expect(publishClassroomSnapshot(snap, {}, f(401))).rejects.toThrow(/đăng nhập/i);
    await expect(publishClassroomSnapshot(snap, {}, f(403))).rejects.toThrow(/quyền/i);
    await expect(publishClassroomSnapshot(snap, {}, f(500))).rejects.toThrow(/500/);
    await expect(publishClassroomSnapshot(snap, {}, vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch)).rejects.toThrow(/kết nối/i);
  });

  it('refuses to publish an empty lesson', async () => {
    const fetchImpl = vi.fn();
    await expect(publishClassroomSnapshot({...snap, boardSnapshots: []}, {}, fetchImpl as unknown as typeof fetch)).rejects.toThrow(/chưa có/i);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
