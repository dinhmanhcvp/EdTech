/**
 * Vi bài giảng: biến nhật ký vector của tiết học (những gì đã hiện lên bảng, theo thời gian) thành một dàn bài có mốc giờ
 * và một sơ đồ tư duy. Thuần tính toán, không gọi mạng và không bịa: chỉ liệt kê đúng công thức, hình (kèm số đo thật),
 * mô phỏng đã xuất hiện, gom thành các phần theo nhịp tiết học.
 */
import type {BoardJournalData, BoardJournalEvent} from './vectorJournal';
import {VERTEX_LABELS, planeStats} from './inlineShape';

export type MomentKind = 'formula' | 'plane' | 'solid' | 'sim';

export interface LessonMoment {
  /** mốc thời gian (ms) tính từ đầu tiết */
  t: number;
  kind: MomentKind;
  label: string;
  /** số đo / công thức LaTeX đi kèm */
  detail?: string;
}

export interface LessonSection {
  title: string;
  start: number;
  moments: LessonMoment[];
}

export interface MicroLesson {
  title: string;
  subject?: string;
  durationMs: number;
  sections: LessonSection[];
  stats: {formulas: number; figures: number; sims: number; strokes: number};
}

/** nghỉ lâu hơn mức này giữa hai sự kiện thì sang phần mới */
export const SECTION_GAP_MS = 90_000;

const FAMILY: Record<string, string> = {PHYS: 'Vật lí', CHEM: 'Hóa học', BIO: 'Sinh học', MATH: 'Toán', GEO: 'Hình học', STEM: 'STEM'};
const clip = (s: unknown, n: number) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};
const num = (v: number) => (Math.round(v * 100) / 100).toString().replace('.', ',');

export function templateLabel(id: string): string {
  const [head, ...rest] = id.split('_');
  const fam = FAMILY[head];
  const name = (fam ? rest : [head, ...rest]).join(' ').toLowerCase();
  return fam ? `${fam}: ${name}` : name;
}

export function fmtClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function momentOf(ev: BoardJournalEvent): LessonMoment | null {
  if (ev.type === 'SPAWN_SIM') return {t: ev.t, kind: 'sim', label: templateLabel(ev.template)};
  if (ev.type !== 'ADD_OBJECT') return null;
  const sh = ev.shape;
  if (sh?.kind === 'plane') {
    const verts = sh.plane?.verts ?? [];
    let detail: string | undefined;
    if (verts.length >= 3) {
      const st = planeStats(verts);
      const n = verts.length;
      detail = `${verts.map((_, i) => `${VERTEX_LABELS[i]}${VERTEX_LABELS[(i + 1) % n]} = ${num(st.sides[i])}`).join(', ')}; S = ${num(st.area)}`;
    }
    return {t: ev.t, kind: 'plane', label: clip(sh.title, 60) || 'Hình phẳng', detail};
  }
  if (sh) {
    const dims = sh.solid?.dims ? Object.entries(sh.solid.dims).filter(([, v]) => typeof v === 'number').map(([k, v]) => `${k} = ${num(v as number)}`).join(', ') : '';
    return {t: ev.t, kind: 'solid', label: clip(sh.title, 60) || 'Khối hình học', detail: dims || undefined};
  }
  const ts = ev.typeset;
  if (ts && (ts.latex || ts.text)) return {t: ev.t, kind: 'formula', label: clip(ts.text || ts.latex, 60), detail: ts.latex ? clip(ts.latex, 200) : undefined};
  return null;
}

/** Dàn bài từ nhật ký; null nếu chưa có gì đáng ghi (bảng trống hoặc chỉ có nét nháp). */
export function buildMicroLesson(data: BoardJournalData): MicroLesson | null {
  const sections: LessonSection[] = [];
  const stats = {formulas: 0, figures: 0, sims: 0, strokes: 0};
  // đối tượng bị xóa (lúc nào cũng vậy) thì không đưa vào dàn bài
  const gone = new Set(data.events.flatMap((e) => (e.type === 'ERASE_STROKE' ? [e.strokeId] : [])));
  let cur: LessonSection | null = null;
  let lastT = -Infinity;
  let fresh = true; // đầu tiết hoặc vừa xóa bảng: moment kế tiếp mở phần mới

  for (const ev of data.events) {
    if (ev.type === 'CLEAR_CANVAS') {
      fresh = true;
      continue;
    }
    if (ev.type === 'STROKE_START') {
      stats.strokes += 1;
      continue;
    }
    const m = momentOf(ev);
    if (!m) continue;
    if (ev.type === 'ADD_OBJECT' && gone.has(ev.strokeId)) continue;
    const newSection = fresh || !cur || m.t - lastT > SECTION_GAP_MS || m.kind === 'sim';
    if (newSection) {
      cur = {title: m.label, start: m.t, moments: []};
      sections.push(cur);
    }
    cur!.moments.push(m);
    lastT = m.t;
    fresh = false;
    if (m.kind === 'formula') stats.formulas += 1;
    else if (m.kind === 'sim') stats.sims += 1;
    else stats.figures += 1;
  }
  if (sections.length === 0) return null;
  const subject = data.header.subject;
  return {
    title: data.header.title?.trim() || sections[0].title,
    subject,
    durationMs: data.header.durationMs,
    sections,
    stats,
  };
}

/** Lời giảng do AI viết lại từ dàn bài (utils/lessonNotes.ts); narrations[i] ứng với phần i, có thể rỗng. */
export interface LessonNotes {
  summary: string;
  narrations: string[];
  key_points: string[];
  review_questions: string[];
}

export function lessonToMarkdown(l: MicroLesson, notes?: LessonNotes | null): string {
  const out = [`# ${l.title}`, ''];
  const bits = [`Thời lượng ${fmtClock(l.durationMs)}`, `${l.stats.formulas} công thức`, `${l.stats.figures} hình`, `${l.stats.sims} mô phỏng`];
  out.push(`*${[l.subject, ...bits].filter(Boolean).join(' · ')}*`, '');
  if (notes?.summary) out.push(notes.summary, '');
  l.sections.forEach((s, i) => {
    out.push(`## ${i + 1}. ${s.title} (${fmtClock(s.start)})`, '');
    if (notes?.narrations[i]) out.push(notes.narrations[i], '');
    for (const m of s.moments) {
      const icon = {formula: 'ƒ', plane: '△', solid: '⬡', sim: '▶'}[m.kind];
      out.push(`- ${icon} **${m.label}** (${fmtClock(m.t)})${m.detail && m.kind !== 'formula' ? ` — ${m.detail}` : ''}`);
      if (m.kind === 'formula' && m.detail) out.push(`  - $${m.detail}$`);
    }
    out.push('');
  });
  if (notes?.key_points.length) out.push('## Ý cần nhớ', '', ...notes.key_points.map((k) => `- ${k}`), '');
  if (notes?.review_questions.length) out.push('## Câu hỏi ôn tập', '', ...notes.review_questions.map((q, i) => `${i + 1}. ${q}`), '');
  return out.join('\n');
}

// ------------------------------------------------------------------ sơ đồ tư duy
export interface MindNode {
  id: string;
  label: string;
  x: number;
  y: number;
  level: 0 | 1 | 2;
  kind?: MomentKind;
}
export interface MindMap {
  width: number;
  height: number;
  nodes: MindNode[];
  edges: {from: string; to: string}[];
}

export const MIND_MAX_LEAVES = 6;
const ROW_H = 30;

/** Bố cục cây nằm ngang: gốc bên trái, các phần ở giữa, các mục ở bên phải. */
export function lessonMindMap(l: MicroLesson, width = 760): MindMap {
  const nodes: MindNode[] = [];
  const edges: MindMap['edges'] = [];
  const colX = [width * 0.08, width * 0.36, width * 0.7];
  let row = 0;
  const sectionRows: number[] = [];
  l.sections.forEach((s, si) => {
    const shown = s.moments.slice(0, MIND_MAX_LEAVES);
    const extra = s.moments.length - shown.length;
    const first = row;
    shown.forEach((m, mi) => {
      nodes.push({id: `m${si}-${mi}`, label: m.label, x: colX[2], y: row * ROW_H + ROW_H / 2, level: 2, kind: m.kind});
      edges.push({from: `s${si}`, to: `m${si}-${mi}`});
      row += 1;
    });
    if (extra > 0) {
      nodes.push({id: `m${si}-more`, label: `… và ${extra} mục nữa`, x: colX[2], y: row * ROW_H + ROW_H / 2, level: 2});
      edges.push({from: `s${si}`, to: `m${si}-more`});
      row += 1;
    }
    sectionRows.push(((first + row - 1) / 2) * ROW_H + ROW_H / 2);
  });
  l.sections.forEach((s, si) => {
    nodes.push({id: `s${si}`, label: `${si + 1}. ${clip(s.title, 28)}`, x: colX[1], y: sectionRows[si], level: 1});
    edges.push({from: 'root', to: `s${si}`});
  });
  const mid = sectionRows.length ? (sectionRows[0] + sectionRows[sectionRows.length - 1]) / 2 : ROW_H / 2;
  nodes.push({id: 'root', label: clip(l.title, 24), x: colX[0], y: mid, level: 0});
  return {width, height: Math.max(row, 1) * ROW_H, nodes, edges};
}
