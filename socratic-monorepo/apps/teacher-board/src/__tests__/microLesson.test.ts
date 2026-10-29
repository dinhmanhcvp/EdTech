import {describe, expect, it} from 'vitest';
import type {BoardJournalData, BoardJournalEvent} from '../utils/vectorJournal';
import {SECTION_GAP_MS, MIND_MAX_LEAVES, buildMicroLesson, fmtClock, lessonMindMap, lessonToMarkdown, templateLabel} from '../utils/microLesson';

const data = (events: BoardJournalEvent[], title?: string, durationMs = 600_000): BoardJournalData => ({
  header: {version: '1', createdAt: 0, durationMs, eventCount: events.length, title, subject: 'MATH'},
  events,
});
const formula = (t: number, id: string, latex: string, text = ''): BoardJournalEvent => ({t, type: 'ADD_OBJECT', strokeId: id, x: 10, y: 10, color: '#111', typeset: {latex, text, size: 20, w: 100, h: 30}});
// A(0,150) B(200,150) C(0,0): AB = 4, BC = 5, CA = 3, S = 6
const tri = (t: number, id: string): BoardJournalEvent => ({
  t, type: 'ADD_OBJECT', strokeId: id, x: 0, y: 0, color: '#111',
  typeset: {latex: '', text: 'Tam giác ABC', size: 20, w: 200, h: 160},
  shape: {kind: 'plane', title: 'Tam giác ABC', plane: {verts: [{x: 0, y: 150}, {x: 200, y: 150}, {x: 0, y: 0}], euler: false}},
});
const sim = (t: number, template: string): BoardJournalEvent => ({t, type: 'SPAWN_SIM', id: `sim${t}`, template, x: 0, y: 0, scale: 1});

describe('buildMicroLesson', () => {
  it('bảng chưa có gì đáng ghi (chỉ nét nháp) thì không có bài giảng', () => {
    expect(buildMicroLesson(data([]))).toBeNull();
    expect(buildMicroLesson(data([{t: 1, type: 'STROKE_START', pointerId: 1, x: 0, y: 0, pressure: 1, color: '#000'}]))).toBeNull();
  });

  it('gom công thức, hình (kèm số đo thật), mô phỏng theo thời gian và đếm đúng', () => {
    const l = buildMicroLesson(data([formula(1000, 'f1', 'y = x^2', 'y = x²'), tri(5000, 't1'), sim(9000, 'PHYS_PROJECTILE')], 'Bài thử'))!;
    expect(l.title).toBe('Bài thử');
    expect(l.stats).toEqual({formulas: 1, figures: 1, sims: 1, strokes: 0});
    const all = l.sections.flatMap((s) => s.moments);
    expect(all.map((m) => m.kind)).toEqual(['formula', 'plane', 'sim']);
    expect(all[1].detail).toBe('AB = 4, BC = 5, CA = 3; S = 6');
    expect(all[2].label).toBe('Vật lí: projectile');
  });

  it('mô phỏng mới, xóa bảng, hoặc nghỉ lâu thì sang phần mới; liên tục thì cùng phần', () => {
    const l = buildMicroLesson(data([formula(1000, 'a', 'x'), formula(2000, 'b', 'y'), sim(3000, 'MATH_PARABOLA'), {t: 4000, type: 'CLEAR_CANVAS'}, formula(5000, 'c', 'z'), formula(5000 + SECTION_GAP_MS + 1, 'd', 'w')]))!;
    expect(l.sections.map((s) => s.moments.length)).toEqual([2, 1, 1, 1]);
    expect(l.sections[1].title).toBe('Toán: parabola');
  });

  it('tiêu đề mặc định lấy từ mục đầu; đối tượng đã bị xóa không có mặt', () => {
    const l = buildMicroLesson(data([formula(1000, 'a', 'x^2', 'x²'), formula(2000, 'b', 'y'), {t: 3000, type: 'ERASE_STROKE', strokeId: 'b'}]))!;
    expect(l.title).toBe('x²');
    expect(l.stats.formulas).toBe(1);
  });
});

describe('xuất Markdown và sơ đồ tư duy', () => {
  const l = buildMicroLesson(data([formula(61_000, 'a', 'y = x^2', 'y = x²'), tri(70_000, 't')], 'Parabol và tam giác'))!;

  it('Markdown có tiêu đề, mốc giờ, công thức LaTeX và số đo', () => {
    const md = lessonToMarkdown(l);
    expect(md).toContain('# Parabol và tam giác');
    expect(md).toContain('## 1. y = x² (1:01)');
    expect(md).toContain('$y = x^2$');
    expect(md).toContain('AB = 4, BC = 5, CA = 3; S = 6');
    expect(fmtClock(61_000)).toBe('1:01');
  });

  it('sơ đồ: một gốc, mỗi phần một nhánh, lá nằm bên phải; nhiều lá được rút gọn', () => {
    const m = lessonMindMap(l);
    expect(m.nodes.filter((n) => n.level === 0)).toHaveLength(1);
    expect(m.nodes.filter((n) => n.level === 1)).toHaveLength(l.sections.length);
    const ids = new Set(m.nodes.map((n) => n.id));
    expect(m.edges.every((e) => ids.has(e.from) && ids.has(e.to))).toBe(true);
    const many = buildMicroLesson(data(Array.from({length: 10}, (_, i) => formula(1000 + i, `f${i}`, 'x'))))!;
    const mm = lessonMindMap(many);
    expect(mm.nodes.filter((n) => n.level === 2)).toHaveLength(MIND_MAX_LEAVES + 1);
    expect(mm.nodes.some((n) => n.label.includes(`${10 - MIND_MAX_LEAVES} mục nữa`))).toBe(true);
  });

  it('tên mẫu lạ vẫn đọc được', () => {
    expect(templateLabel('SOMETHING_ELSE')).toBe('something else');
  });
});
