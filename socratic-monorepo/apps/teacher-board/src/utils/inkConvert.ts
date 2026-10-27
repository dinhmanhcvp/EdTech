// apps/teacher-board/src/utils/inkConvert.ts
/**
 * "Chữ viết tay → văn bản & công thức chuẩn".
 *  - Bước 1 (tức thì, cục bộ): inkRecognizer → hiện kết quả ngay (vài chục ms, không cần mạng/khóa).
 *  - Bước 2 (nền, tùy chọn): gửi ảnh nét viết tới /api/v1/canvas/recognize-ink (Gemini Vision) — đọc được tiếng Việt có dấu,
 *    chữ nối, công thức phức tạp. Có kết quả thì giao diện nâng cấp; lỗi/hết giờ thì giữ bản cục bộ.
 */
import { recognizeInk, type InkRecognition, type RecognizedLine } from './inkRecognizer';
import { exportIsolatedWebp } from './isolatedExporter';
import { routeLocally } from './localRouter';
import { normalizeMathInput } from './mathExpr';
import type { Stroke, TypesetMeta } from './lassoGeometry';
import type { SimulationBlueprint } from '@socratic/types';

export interface ConvertLine {
  text: string;
  latex: string;
  confidence: number;
  valid?: boolean;
  /** vùng nét viết gốc (đơn vị canvas); chỉ có với bộ nhận dạng cục bộ */
  bbox?: { x0: number; y0: number; x1: number; y1: number };
  alternatives: { latex: string; text: string; confidence: number }[];
}

export interface ConvertResult {
  engine: 'local' | 'gemini';
  lines: ConvertLine[];
  confidence: number;
  ms: number;
  model?: string;
}

export const sourceStrokes = (strokes: Stroke[]) => strokes.filter((s) => !s.typeset && s.points.length > 0);

export function bboxOfStrokes(strokes: Stroke[]) {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const s of strokes) {
    for (const p of s.points) {
      if (p.x < x0) x0 = p.x;
      if (p.x > x1) x1 = p.x;
      if (p.y < y0) y0 = p.y;
      if (p.y > y1) y1 = p.y;
    }
  }
  return { x0, y0, x1, y1 };
}

const fromLocal = (r: InkRecognition): ConvertResult => ({
  engine: 'local',
  confidence: r.confidence,
  ms: r.ms,
  lines: r.lines.map((l: RecognizedLine) => ({ text: l.text, latex: l.latex, confidence: l.confidence, valid: l.valid, bbox: l.bbox, alternatives: l.alternatives })),
});

/** Nhận dạng cục bộ, chạy đồng bộ. */
export function recognizeLocal(strokes: Stroke[]): ConvertResult {
  return fromLocal(recognizeInk(sourceStrokes(strokes).map((s) => ({ points: s.points }))));
}

interface AiOptions {
  fetchImpl?: typeof fetch;
  apiKey?: string;
  openrouterKey?: string;
  hint?: string;
  timeoutMs?: number;
  endpoint?: string;
  preferOffline?: boolean;
  /** cho phép kiểm thử thay phần xuất ảnh (jsdom không có canvas thật) */
  exportImage?: (strokes: Stroke[]) => Promise<string>;
}

/** Gọi Neural OCR (Pix2Text-MFR-1.5 ONNX cục bộ hoặc Gemini Vision) qua máy chủ. Trả null nếu không kết nối được — khi đó dùng bản cục bộ tức thì. */
export async function recognizeWithAi(strokes: Stroke[], opts: AiOptions = {}): Promise<ConvertResult | null> {
  const src = sourceStrokes(strokes);
  if (!src.length) return null;
  const doFetch = opts.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : undefined);
  if (!doFetch) return null;
  const key = opts.apiKey ?? (typeof window !== 'undefined' ? window.localStorage.getItem('gemini_api_key') || '' : '');
  const openrouterKey = opts.openrouterKey ?? (typeof window !== 'undefined' ? window.localStorage.getItem('openrouter_api_key') || '' : '');
  const endpoint = opts.endpoint ?? '/api/v1/canvas/recognize-ink';
  const t0 = Date.now();
  let image: string;
  try {
    image = opts.exportImage ? await opts.exportImage(src) : (await exportIsolatedWebp(src)).dataUrl;
  } catch {
    return null;
  }
  const bodyPayload: Record<string, unknown> = {
    image_base64: image,
    raw_strokes_json: JSON.stringify(src),
    allow_local_onnx: opts.preferOffline ?? true,
    hint: opts.hint ?? '',
    gemini_api_key: key,
  };
  if (openrouterKey) {
    bodyPayload.openrouter_api_key = openrouterKey;
  }
  const body = JSON.stringify(bodyPayload);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (key) headers['x-gemini-api-key'] = key;
  if (openrouterKey) headers['x-openrouter-api-key'] = openrouterKey;

  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 35000) : null;
  try {
    let resp: Response;
    const customBackend = (typeof window !== 'undefined' ? window.localStorage.getItem('backend_url') : '') || (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_BACKEND_URL : '') || '';
    const cleanCustom = customBackend.replace(/\/+$/, '');
    const isHosted = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
    const targetUrl = isHosted && cleanCustom && endpoint.startsWith('/') ? `${cleanCustom}${endpoint}` : endpoint;

    try {
      resp = await doFetch(targetUrl, { method: 'POST', headers, body, signal: ctrl?.signal });
    } catch (e) {
      if (!endpoint.startsWith('/')) throw e;
      if (cleanCustom && targetUrl !== `${cleanCustom}${endpoint}`) {
        resp = await doFetch(`${cleanCustom}${endpoint}`, { method: 'POST', headers, body, signal: ctrl?.signal });
      } else {
        resp = await doFetch(`http://127.0.0.1:8000${endpoint}`, { method: 'POST', headers, body, signal: ctrl?.signal });
      }
    }
    if (!resp.ok && endpoint.startsWith('/') && cleanCustom && targetUrl !== `${cleanCustom}${endpoint}`) {
      try {
        const directResp = await doFetch(`${cleanCustom}${endpoint}`, { method: 'POST', headers, body, signal: ctrl?.signal });
        if (directResp.ok) resp = directResp;
      } catch { }
    }
    if (!resp.ok) return null; // 503 = chưa có khóa / mô hình không phản hồi

    const j = await resp.json();
    const lines: ConvertLine[] = (j.lines || []).map((l: { text?: string; latex?: string; confidence?: number }) => ({
      text: String(l.text ?? l.latex ?? ''),
      latex: String(l.latex ?? l.text ?? ''),
      confidence: typeof l.confidence === 'number' ? l.confidence : 0.8,
      alternatives: [],
    }));
    if (!lines.length) return null;
    const alts = ((j.alternatives || []) as string[]).map((a) => ({ latex: a, text: a, confidence: 0.5 }));
    if (alts.length) lines[0].alternatives = alts;
    return { engine: 'gemini', lines, confidence: typeof j.confidence === 'number' ? j.confidence : 0.8, ms: Date.now() - t0, model: j.model };
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// ------------------------------------------------------------------ đặt công thức chuẩn lên bảng
export interface Placement {
  x: number;
  y: number;
  meta: TypesetMeta;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const estWidth = (latex: string, size: number) => Math.max(size * 0.8, latex.replace(/\\[a-zA-Z]+/g, 'x').replace(/[{}^_]/g, '').length * size * 0.56);

/** Mỗi dòng thành một đối tượng công thức, đặt đúng chỗ nét viết cũ (hoặc bên phải nếu `mode` là chèn). */
export function layoutTypeset(lines: ConvertLine[], source: Stroke[], mode: 'replace' | 'insert'): Placement[] {
  const live = lines.filter((l) => l.latex.trim());
  if (!live.length) return [];
  const sb = bboxOfStrokes(source);
  const srcH = Math.max(sb.y1 - sb.y0, 20);
  const out: Placement[] = [];
  live.forEach((l, i) => {
    let x: number;
    let y: number;
    let size: number;
    if (l.bbox) {
      const h = Math.max(l.bbox.y1 - l.bbox.y0, 12);
      const tall = /\\frac|\\sqrt/.test(l.latex);
      size = clamp(h * (tall ? 0.46 : 0.8), 22, 64);
      x = l.bbox.x0;
      y = l.bbox.y0 - (tall ? 0 : size * 0.12);
    } else {
      const lineH = srcH / live.length;
      size = clamp(lineH * 0.7, 22, 52);
      x = sb.x0;
      y = sb.y0 + i * lineH + (lineH - size * 1.3) / 2;
    }
    if (mode === 'insert') {
      x = sb.x1 + 28;
    }
    const w = estWidth(l.latex, size);
    out.push({ x, y, meta: { latex: l.latex, text: l.text, size, w, h: size * 1.5 } });
  });
  return out;
}

export const typesetStroke = (p: Placement, color: string): Stroke => ({
  id: `typeset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
  points: [{ x: p.x, y: p.y }],
  color,
  width: 0,
  typeset: p.meta,
});

/** Công thức đã nhận dạng có dựng được ngay (đồ thị / khối 3D) mà không cần AI không? */
export function localVisualization(latexOrText: string): SimulationBlueprint | null {
  const plain = normalizeMathInput(latexOrText.replace(/\\\\/g, '\n'));
  return routeLocally(plain, { explicitGraph: true }) ?? routeLocally(latexOrText, { explicitGraph: true });
}

export { latexToPlain } from './latexPlain';
