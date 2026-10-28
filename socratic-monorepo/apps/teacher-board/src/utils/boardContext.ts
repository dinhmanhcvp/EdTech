/**
 * Trích NGỮ CẢNH BẢNG để gửi kèm câu hỏi cho AI: công thức đã nhận dạng, hình phẳng/khối (kèm số đo tính sẵn theo TÊN đỉnh),
 * mô phỏng đang mở (giá trị tham số hiện tại), vùng đang chọn. Thuần tính toán, không phụ thuộc React/DOM.
 *
 * Mục tiêu: để "hình này", "đồ thị kia", "góc ở A" trong câu hỏi trỏ được tới đúng đối tượng với đúng số liệu,
 * thay vì AI đoán từ chữ. Chỉ gửi những gì cần (giới hạn số đối tượng và độ dài chữ), không gửi ảnh hay nét thô.
 */
import type {SimulationBlueprint} from '@socratic/types';
import type {Stroke} from './lassoGeometry';
import {VERTEX_LABELS, planeStats} from './inlineShape';
import {KIND_LABEL, evalConstructs} from './planeConstruct';

export const BOARD_W = 1200;
export const BOARD_H = 675;
const MAX_ITEMS = 40;

export interface BoardItem {
  id: string;
  kind: 'formula' | 'plane' | 'solid' | 'ink';
  /** vị trí tương đối trên bảng, ví dụ "trên-trái" (để hiểu "công thức bên trái") */
  where?: string;
  latex?: string;
  text?: string;
  title?: string;
  names?: string[];
  measures?: {
    sides: number[];
    angles: number[];
    area: number;
    sides_named: Record<string, number>;
    angles_named: Record<string, number>;
  };
  constructs?: string[];
  facts?: string[];
  solid?: {kind: string; dims: Record<string, number | undefined>};
  geo?: {problem?: string; parts: string[]; edges: string[]};
  /** nét viết tay chưa nhận dạng: số lượng */
  count?: number;
}

export interface BoardContext {
  subject?: string;
  selection?: {item_ids: string[]};
  items: BoardItem[];
  simulation?: {
    templateId: string;
    engine: string;
    latex: string;
    params: Record<string, number>;
    parameters: {key: string; label: string; unit: string; min: number; max: number}[];
    meta: Record<string, string | number | boolean>;
  };
}

const clip = (s: unknown, n: number) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const r2 = (v: number) => Math.round(v * 100) / 100;

function whereOnBoard(x: number, y: number): string {
  const row = y < BOARD_H / 3 ? 'trên' : y < (2 * BOARD_H) / 3 ? 'giữa' : 'dưới';
  const col = x < BOARD_W / 3 ? 'trái' : x < (2 * BOARD_W) / 3 ? 'giữa' : 'phải';
  return row === 'giữa' && col === 'giữa' ? 'giữa bảng' : `${row}-${col}`;
}

function planeItem(s: Stroke): BoardItem {
  const sh = s.shape!;
  const verts = sh.plane?.verts ?? [];
  const n = verts.length;
  const names = VERTEX_LABELS.slice(0, n);
  const st = planeStats(verts);
  const sides_named: Record<string, number> = {};
  const angles_named: Record<string, number> = {};
  names.forEach((nm, i) => {
    sides_named[`${nm}${names[(i + 1) % n]}`] = r2(st.sides[i]);
    angles_named[nm] = r2(st.angles[i]);
  });
  const drawn = evalConstructs(verts, sh.plane?.constructs);
  return {
    id: s.id,
    kind: 'plane',
    where: whereOnBoard(s.points[0].x, s.points[0].y),
    title: clip(sh.title, 80),
    names,
    measures: {sides: st.sides.map(r2), angles: st.angles.map(r2), area: r2(st.area), sides_named, angles_named},
    constructs: (sh.plane?.constructs ?? []).map((c) => `${KIND_LABEL[c.k]}${c.i !== undefined ? ` ${names[c.i] ?? c.i}` : ''}`),
    facts: drawn.facts.slice(0, 8).map((f) => clip(f, 200)),
  };
}

function solidItem(s: Stroke): BoardItem {
  const sh = s.shape!;
  const item: BoardItem = {id: s.id, kind: 'solid', where: whereOnBoard(s.points[0].x, s.points[0].y), title: clip(sh.title, 80)};
  if (sh.solid) item.solid = {kind: sh.solid.kind, dims: sh.solid.dims};
  if (sh.sketch?.names) {
    item.names = sh.sketch.names.filter(Boolean).slice(0, 30);
    const names = sh.sketch.names;
    item.geo = {
      problem: sh.geo ? clip(sh.geo.source, 400) : undefined,
      parts: (sh.geo?.scene.parts ?? []).map((p) => clip(p.text, 200)).slice(0, 8),
      edges: sh.sketch.edges.slice(0, 60).map((e) => `${names[e.a] ?? '?'}${names[e.b] ?? '?'}${e.hidden ? '(khuất)' : ''}`),
    };
  }
  return item;
}

function simulationOf(bp: SimulationBlueprint | null | undefined, live?: Record<string, number>): BoardContext['simulation'] | undefined {
  if (!bp) return undefined;
  const params: Record<string, number> = {};
  for (const p of bp.parameters ?? []) params[p.key] = r2(live?.[p.key] ?? p.defaultValue);
  const meta: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(bp.meta ?? {})) {
    if (Object.keys(meta).length >= 12) break;
    if (typeof v === 'number' || typeof v === 'boolean') meta[k] = v;
    else if (typeof v === 'string' && v.length <= 120 && !v.trim().startsWith('<')) meta[k] = v; // bỏ SVG/chuỗi dài
  }
  return {
    templateId: bp.templateId,
    engine: bp.engine,
    latex: clip(bp.recognizedLatex, 300),
    params,
    parameters: (bp.parameters ?? []).slice(0, 12).map((p) => ({key: p.key, label: clip(p.label, 40), unit: p.unit, min: p.min, max: p.max})),
    meta,
  };
}

export function buildBoardContext(input: {
  strokes: Stroke[];
  selected?: Stroke[];
  blueprint?: SimulationBlueprint | null;
  params?: Record<string, number>;
  subject?: string | null;
}): BoardContext {
  const items: BoardItem[] = [];
  let ink = 0;
  let inkWhere = '';
  for (const s of input.strokes) {
    if (s.shape && s.typeset) items.push(s.shape.kind === 'plane' ? planeItem(s) : solidItem(s));
    else if (s.typeset?.latex || s.typeset?.text) {
      items.push({id: s.id, kind: 'formula', where: whereOnBoard(s.points[0].x, s.points[0].y), latex: clip(s.typeset.latex, 300), text: clip(s.typeset.text, 200)});
    } else if (s.points.length > 1) {
      ink += 1;
      inkWhere ||= whereOnBoard(s.points[0].x, s.points[0].y);
    }
  }
  const ctx: BoardContext = {items: items.slice(0, MAX_ITEMS)};
  if (ink) ctx.items.push({id: 'ink', kind: 'ink', count: ink, where: inkWhere});
  const ids = new Set(ctx.items.map((i) => i.id));
  const sel = (input.selected ?? []).map((s) => s.id).filter((id) => ids.has(id));
  if (sel.length) ctx.selection = {item_ids: sel};
  const sim = simulationOf(input.blueprint, input.params);
  if (sim) ctx.simulation = sim;
  if (input.subject) ctx.subject = input.subject;
  return ctx;
}

// ------------------------------------------------------------------ hiển thị cho người dùng
/** Những gì AI "đã đọc" trên bảng, dạng nhãn ngắn để giáo viên thấy ngay AI dựa vào đâu. */
export function summarizeContext(ctx: BoardContext): string[] {
  const chips: string[] = [];
  const picked = ctx.selection ? new Set(ctx.selection.item_ids) : null;
  for (const it of ctx.items) {
    if (picked && !picked.has(it.id)) continue;
    if (it.kind === 'plane') chips.push(`△ ${it.title || 'Hình phẳng'}`);
    else if (it.kind === 'solid') chips.push(`⬡ ${it.title || 'Khối hình học'}`);
    else if (it.kind === 'formula') chips.push(`ƒ ${clip(it.text || it.latex, 28)}`);
    else if (it.kind === 'ink') chips.push(`✎ ${it.count} nét chưa nhận dạng`);
  }
  if (ctx.simulation) chips.push(`▶ Mô phỏng ${ctx.simulation.templateId.replace(/^[A-Z]+_/, '').toLowerCase()}`);
  if (picked) chips.unshift('▭ Vùng đang chọn');
  return chips.slice(0, 8);
}

/** Câu hỏi gợi ý bám theo những gì đang có trên bảng (không phải danh sách cố định). */
export function suggestQuestions(ctx: BoardContext): string[] {
  const out: string[] = [];
  const picked = ctx.selection ? new Set(ctx.selection.item_ids) : null;
  const items = ctx.items.filter((i) => !picked || picked.has(i.id));
  const plane = items.find((i) => i.kind === 'plane');
  const solid = items.find((i) => i.kind === 'solid');
  const formula = items.find((i) => i.kind === 'formula');
  if (plane) {
    out.push(`${plane.title || 'Hình này'} thuộc loại nào? Giải thích vì sao.`);
    out.push('Tính diện tích và đường cao của hình này.');
    if (plane.constructs?.length) out.push('Các đường vừa dựng cho biết điều gì?');
  }
  if (solid) out.push(`Từ ${solid.title || 'khối này'}, thiết diện nào có diện tích lớn nhất?`);
  if (formula) out.push(`Giải thích ý nghĩa của ${clip(formula.text || formula.latex, 40)}.`);
  if (ctx.simulation) out.push('Khi kéo các tham số, đại lượng nào thay đổi và vì sao?');
  if (!out.length) out.push('Hãy viết công thức hoặc vẽ hình lên bảng rồi hỏi mình nhé.');
  return out.slice(0, 3);
}
