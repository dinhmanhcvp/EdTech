/**
 * Chấm theo bước và xác nhận ký tự phân vân: phần thuần (không giao diện) để dùng chung cho mọi chức năng nhận diện.
 */
import type { ConvertResult } from './inkConvert';
import { imagePointToBoard } from './isolatedExporter';
import { apiBase } from './apiBase';

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface Uncertain {
  line: number;
  token: string;
  alternatives: string[];
  /** vị trí trong ảnh gửi AI, tỉ lệ 0..1 */
  x: number;
  y: number;
}

/** Chọn một phương án cho ký tự phân vân: thay lần xuất hiện đầu tiên của ký tự trong dòng đó (latex và text), rồi bỏ mục này. */
export function applyPick(r: ConvertResult, idx: number, choice: string): ConvertResult {
  const u = r.uncertain?.[idx];
  if (!u) return r;
  const swap = (s: string) => (choice !== u.token && s.includes(u.token) ? s.replace(u.token, choice) : s);
  return {
    ...r,
    lines: r.lines.map((l, i) => (i === u.line ? { ...l, latex: swap(l.latex), text: swap(l.text) } : l)),
    uncertain: (r.uncertain ?? []).filter((_, i) => i !== idx),
  };
}

/** Vị trí (tọa độ bảng) để đặt thanh chọn: ngay dưới ký tự phân vân. */
export const uncertainBoardPos = (bbox: Box, u: Uncertain) => imagePointToBoard(bbox, u.x, u.y);

/** Hộp (tọa độ bảng) của dòng i: theo y0,y1 do AI trả; không có thì chia đều chiều cao vùng quét theo số dòng. */
export function lineBox(bbox: Box, r: ConvertResult, i: number): Box {
  const l = r.lines[i];
  if (l?.y0 !== undefined && l?.y1 !== undefined) {
    const a = imagePointToBoard(bbox, 0, l.y0);
    const b = imagePointToBoard(bbox, 1, l.y1);
    return { x0: bbox.x0, x1: bbox.x1, y0: Math.max(bbox.y0 - 4, a.y), y1: Math.min(bbox.y1 + 4, b.y) };
  }
  const n = Math.max(1, r.lines.length);
  const h = (bbox.y1 - bbox.y0) / n;
  return { x0: bbox.x0, x1: bbox.x1, y0: bbox.y0 + h * i, y1: bbox.y0 + h * (i + 1) };
}

export type StepStatus = 'ok' | 'error' | 'carry' | 'warn' | 'unchecked';

export interface GradeStep {
  index: number;
  latex: string;
  status: StepStatus;
  kind: string;
  title: string;
  explain: string;
  fix: string;
  corrected: string;
  source: 'machine' | 'ai' | 'none';
}

export interface GradeResult {
  status: 'GRADED' | 'OFFLINE';
  subject: string;
  final_correct: boolean | null;
  summary: string;
  first_error: number | null;
  steps: GradeStep[];
}

const keyOf = (name: string) => (typeof window !== 'undefined' ? window.localStorage.getItem(name) || '' : '').replace(/[\r\n]+/g, ',').replace(/[,;\s]+/g, ',').replace(/^,|,$/g, '').trim();

/** Gửi các dòng bài làm (LaTeX đã xác nhận) cho máy chủ chấm theo từng bước. null nếu không gọi được. */
export async function gradeSteps(lines: string[], subject?: string, doFetch: typeof fetch = fetch): Promise<GradeResult | null> {
  const g = keyOf('gemini_api_key');
  const o = keyOf('openrouter_api_key');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (g) headers['x-gemini-api-key'] = g;
  if (o) headers['x-openrouter-api-key'] = o;
  try {
    const r = await doFetch(`${apiBase()}/api/v1/canvas/grade-steps`, { method: 'POST', headers, body: JSON.stringify({ lines: lines.map((latex) => ({ latex })), subject }) });
    return r.ok ? ((await r.json()) as GradeResult) : null;
  } catch {
    return null;
  }
}
