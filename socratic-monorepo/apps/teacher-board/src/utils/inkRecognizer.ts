// apps/teacher-board/src/utils/inkRecognizer.ts
/**
 * Nhận dạng chữ viết tay toán học CỤC BỘ (offline, vài chục ms, không cần khóa API).
 *
 *  1. Tách các nét thành ký hiệu (nét cắt nhau, dấu chấm của i/j, "=" / ":" xếp chồng).
 *  2. Mỗi ký hiệu: so khớp đám điểm với thư viện mẫu (inkGlyphs.json, dựng từ phông viết tay) bằng
 *     khoảng cách chamfer hai chiều → danh sách ứng viên có điểm.
 *  3. Bố cục 2D: thanh phân số, dấu căn, số mũ, chỉ số dưới, các dòng.
 *  4. Beam search chọn tổ hợp ứng viên tốt nhất theo (điểm hình dạng + ngữ cảnh + biểu thức có phân tích được).
 *
 * Giới hạn trung thực: chỉ tin cậy với công thức/ký hiệu toán một hoặc nhiều dòng (số, chữ Latin, + − × ÷ = ( ) / √ π,
 * mũ, phân số). KHÔNG nhận dạng được tiếng Việt có dấu hay chữ nối: dùng bộ nhận dạng AI (Vision) cho các trường hợp đó.
 */
import glyphData from './inkGlyphs.json';
import {tryCompile, parseEquation} from './mathExpr';

export interface Pt {
  x: number;
  y: number;
}
export interface InkStrokeLike {
  points: Pt[];
}

export interface Candidate {
  ch: string;
  cost: number;
}

export interface RecognizedLine {
  text: string;
  latex: string;
  confidence: number;
  valid: boolean; // biểu thức phân tích được bằng mathExpr
  bbox: {x0: number; y0: number; x1: number; y1: number};
  alternatives: {latex: string; text: string; confidence: number}[];
}

export interface InkRecognition {
  engine: 'local';
  lines: RecognizedLine[];
  text: string;
  latex: string;
  confidence: number;
  symbolCount: number;
  ms: number;
}

// ------------------------------------------------------------------ hình học cơ bản
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const pathLen = (p: Pt[]) => p.reduce((s, q, i) => (i ? s + dist(p[i - 1], q) : 0), 0);

/**
 * Làm sạch dữ liệu PointerEvent trước khi so khớp. Bảng hồng ngoại thường
 * trả nhiều điểm trùng hoặc rung 1–3 px; giữ nguyên góc và đầu nét nhưng
 * bỏ các điểm gần như trùng giúp chamfer ổn định hơn trên nét viết thật.
 */
function cleanStroke(points: Pt[]): Pt[] {
  if (points.length < 3) return points.map((p) => ({...p}));
  const scale = Math.max(pathLen(points) / Math.max(points.length - 1, 1), 0.01);
  const minStep = Math.max(0.012 * scale, 0.15);
  const out: Pt[] = [{...points[0]}];
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    if (dist(p, out[out.length - 1]) < minStep) continue;
    out.push({...p});
  }
  const last = points[points.length - 1];
  if (dist(last, out[out.length - 1]) >= minStep * 0.5) out.push({...last});
  return out.length >= 2 ? out : [{...points[0]}, {...last}];
}

interface BBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
const bboxOf = (pts: Pt[]): BBox => {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const p of pts) {
    if (p.x < x0) x0 = p.x;
    if (p.x > x1) x1 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.y > y1) y1 = p.y;
  }
  return {x0, y0, x1, y1};
};
const unionBox = (a: BBox, b: BBox): BBox => ({x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1)});

/** Lấy mẫu lại theo độ dài cung; n điểm. */
export function resample(p: Pt[], n: number): Pt[] {
  if (p.length === 0) return [];
  if (p.length === 1) return Array.from({length: n}, () => ({...p[0]}));
  const total = pathLen(p);
  if (total < 1e-9) return Array.from({length: n}, () => ({...p[0]}));
  const step = total / (n - 1);
  const out: Pt[] = [{...p[0]}];
  let acc = 0;
  let i = 1;
  let prev = p[0];
  while (i < p.length && out.length < n) {
    const d = dist(prev, p[i]);
    if (acc + d >= step) {
      const t = (step - acc) / d;
      const q = {x: prev.x + t * (p[i].x - prev.x), y: prev.y + t * (p[i].y - prev.y)};
      out.push(q);
      prev = q;
      acc = 0;
    } else {
      acc += d;
      prev = p[i];
      i++;
    }
  }
  while (out.length < n) out.push({...p[p.length - 1]});
  return out;
}

const segIntersect = (a: Pt, b: Pt, c: Pt, d: Pt) => {
  const o = (p: Pt, q: Pt, r: Pt) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = o(a, b, c);
  const d2 = o(a, b, d);
  const d3 = o(c, d, a);
  const d4 = o(c, d, b);
  return d1 * d2 < 0 && d3 * d4 < 0;
};
const polylinesCross = (a: Pt[], b: Pt[]) => {
  const A = resample(a, 24);
  const B = resample(b, 24);
  for (let i = 0; i < A.length - 1; i++) for (let j = 0; j < B.length - 1; j++) if (segIntersect(A[i], A[i + 1], B[j], B[j + 1])) return true;
  return false;
};
const minDist = (a: Pt[], b: Pt[]) => {
  const A = resample(a, 16);
  const B = resample(b, 16);
  let m = Infinity;
  for (const p of A) for (const q of B) m = Math.min(m, dist(p, q));
  return m;
};

// ------------------------------------------------------------------ thư viện mẫu
interface Template {
  c: string;
  pts: Float32Array; // x0,y0,x1,y1,…
  w: number;
  h: number;
  grid: Uint8Array; // lưới chiếm chỗ GN×GN để lọc nhanh
}
const GN = 6;
const gridOf = (pts: Float32Array): Uint8Array => {
  const g = new Uint8Array(GN * GN);
  for (let i = 0; i < pts.length; i += 2) {
    const gx = Math.max(0, Math.min(GN - 1, Math.floor((pts[i] + 0.5) * GN)));
    const gy = Math.max(0, Math.min(GN - 1, Math.floor((pts[i + 1] + 0.5) * GN)));
    g[gy * GN + gx] = 1;
  }
  return g;
};
let TEMPLATES: Template[] | null = null;
const templates = (): Template[] => {
  if (TEMPLATES) return TEMPLATES;
  const d = glyphData as unknown as {n: number; templates: {c: string; w: number; h: number; p: [number, number][]}[]};
  TEMPLATES = d.templates.map((t) => {
    const m = Math.min(t.p.length, NQ);
    const a = new Float32Array(m * 2);
    for (let i = 0; i < m; i++) {
      a[i * 2] = t.p[i][0];
      a[i * 2 + 1] = t.p[i][1];
    }
    return {c: t.c, pts: a, w: t.w, h: t.h, grid: gridOf(a)};
  });
  return TEMPLATES;
};

/** Nghiêng trung bình (dx/dy) của các đoạn gần thẳng đứng; dùng để "dựng thẳng" chữ viết nghiêng trước khi so khớp. */
function slantOf(strokes: Pt[][]): number {
  let sw = 0;
  let sk = 0;
  for (const s of strokes) {
    for (let i = 1; i < s.length; i++) {
      const dx = s[i].x - s[i - 1].x;
      const dy = s[i].y - s[i - 1].y;
      const l = Math.hypot(dx, dy);
      if (l < 1e-9 || Math.abs(dy) < 0.8 * l * Math.cos(Math.atan(0.6))) continue; // chỉ đoạn cách thẳng đứng < ~31°
      const k = dx / dy; // y hướng xuống: chữ nghiêng phải có dx/dy < 0
      sk += k * l;
      sw += l;
    }
  }
  const k = sw > 0 ? sk / sw : 0;
  return Math.max(-0.3, Math.min(0.3, k));
}
const deslant = (strokes: Pt[][]): Pt[][] => {
  const k = slantOf(strokes);
  if (Math.abs(k) < 0.04) return strokes;
  const b = bboxOf(strokes.flat());
  const yc = (b.y0 + b.y1) / 2;
  return strokes.map((s) => s.map((p) => ({x: p.x - k * (p.y - yc), y: p.y})));
};

const NQ = 32; // số điểm của đám điểm truy vấn; mẫu dùng 32 điểm đầu (thứ tự lấy mẫu xa nhất nên vẫn phủ đều)
/** Đám điểm chuẩn hóa của một ký hiệu (nhiều nét): tâm tại 0, cạnh dài nhất = 1, y hướng lên. */
function symbolCloud(strokes: Pt[][]): {pts: Float32Array; w: number; h: number} {
  // Stroke order trên bảng thay đổi theo người viết (đặc biệt với +, =, t).
  // Canonical ordering giúp cùng một ký hiệu có hình học tương đương.
  // Giữ thứ tự nét: phân số/chữ ghép dùng thứ tự nét để phân bổ trọng số
  // lấy mẫu; việc đổi thứ tự được xử lý ở tầng segment dấu bằng riêng.
  const ordered = strokes;
  const lens = ordered.map(pathLen);
  const total = lens.reduce((a, b) => a + b, 0) || 1;
  const pts: Pt[] = [];
  let remaining = NQ;
  ordered.forEach((s, i) => {
    const left = ordered.length - i - 1;
    const want = i === strokes.length - 1 ? remaining : Math.max(2, Math.min(remaining - left * 2, Math.round((NQ * lens[i]) / total)));
    pts.push(...resample(s, Math.max(2, want)));
    remaining -= Math.max(2, want);
  });
  const b = bboxOf(pts);
  const w = b.x1 - b.x0;
  const h = b.y1 - b.y0;
  const span = Math.max(w, h, 1e-6);
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  const out = new Float32Array(pts.length * 2);
  pts.forEach((p, i) => {
    out[i * 2] = (p.x - cx) / span;
    out[i * 2 + 1] = -(p.y - cy) / span; // đổi sang y hướng lên như mẫu
  });
  return {pts: out, w: w / span, h: h / span};
}

function chamfer(q: Float32Array, t: Float32Array, limit: number): number {
  const nq = q.length / 2;
  const nt = t.length / 2;
  let a = 0;
  const tmin = TMIN.length >= nt ? TMIN : (TMIN = new Float32Array(64));
  for (let j = 0; j < nt; j++) tmin[j] = 1e9;
  for (let i = 0; i < nq; i++) {
    const qx = q[i * 2];
    const qy = q[i * 2 + 1];
    let m = 1e9;
    for (let j = 0; j < nt; j++) {
      const dx = qx - t[j * 2];
      const dy = qy - t[j * 2 + 1];
      const d2 = dx * dx + dy * dy;
      if (d2 < m) m = d2;
      if (d2 < tmin[j]) tmin[j] = d2;
    }
    a += Math.sqrt(m);
    if (a / nq > limit) return 9; // chắc chắn không thắng mẫu tốt nhất hiện có của ký tự này
  }
  let b = 0;
  for (let j = 0; j < nt; j++) b += Math.sqrt(tmin[j]);
  return a / nq + b / nt;
}
let TMIN = new Float32Array(64);

function rotateCloud(q: Float32Array, angle: number): Float32Array {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const out = new Float32Array(q.length);
  for (let i = 0; i < q.length; i += 2) {
    out[i] = q[i] * c - q[i + 1] * s;
    out[i + 1] = q[i] * s + q[i + 1] * c;
  }
  return out;
}

/** Ứng viên ký tự cho một ký hiệu (tối đa k ký tự khác nhau, điểm thấp = giống hơn). */
export function classify(strokes: Pt[][], k = 6): Candidate[] {
  const q = symbolCloud(deslant(strokes));
  // Nét bút trên bảng thường nghiêng theo cổ tay. So khớp thêm hai góc nhỏ
  // để không buộc người viết phải giữ đúng hướng của glyph mẫu.
  const qVariants = [q.pts, rotateCloud(q.pts, -0.12), rotateCloud(q.pts, 0.12)];
  const qg = gridOf(q.pts);
  const best = new Map<string, number>();
  const qar = Math.log(Math.max(q.w, 1e-3) / Math.max(q.h, 1e-3));
  // vòng 1: lọc nhanh bằng khung dẹt/cao và lưới chiếm chỗ → giữ ~PRE mẫu gần nhất
  const PRE = 160;
  const pre: {t: Template; g: number; arPen: number}[] = [];
  for (const t of templates()) {
    const dar = Math.abs(qar - Math.log(Math.max(t.w, 1e-3) / Math.max(t.h, 1e-3)));
    if (dar > 1.5) continue;
    let g = 0;
    for (let i = 0; i < GN * GN; i++) g += qg[i] !== t.grid[i] ? 1 : 0;
    pre.push({t, g, arPen: Math.min(0.12, 0.05 * dar)});
  }
  pre.sort((a, b) => a.g - b.g);
  // vòng 2: chamfer chính xác
  for (const {t, arPen} of pre.slice(0, PRE)) {
    const cur = best.get(t.c);
    const limit = cur === undefined ? 9 : cur - arPen;
    const baseCost = chamfer(qVariants[0], t.pts, limit);
    // Mẫu đã khớp tốt không cần thử thêm góc; chỉ dùng tolerance nghiêng
    // cho vùng cạnh tranh, nơi nó thực sự giúp nét bút lệch cổ tay.
    const c = (baseCost < 0.28
      ? baseCost
      : Math.min(baseCost, chamfer(qVariants[1], t.pts, limit), chamfer(qVariants[2], t.pts, limit))) + arPen;
    if (c < 9 && (cur === undefined || c < cur)) best.set(t.c, c);
  }
  // nét đứng thẳng, hẹp (có thể kèm cờ nhỏ ở đỉnh): "1" / "l" / "|" — mẫu phông hay thua dấu ngoặc ở trường hợp này
  if (strokes.length === 1 && isVerticalStem(strokes[0])) {
    for (const [ch, c] of [['1', 0.05], ['|', 0.06], ['l', 0.06], ['I', 0.065]] as const) {
      const cur = best.get(ch);
      if (cur === undefined || cur > c) best.set(ch, c);
    }
  }
  return [...best.entries()]
    .map(([ch, cost]) => ({ch, cost}))
    .sort((a, b) => a.cost - b.cost)
    .slice(0, k);
}

/** Vòng kín + thân thẳng đứng bên phải: "a" (thân ngang cỡ vòng), "d" (thân vượt lên trên), "q" (thân thò xuống dưới). */
function loopStem(strokes: Pt[][]): 'a' | 'd' | 'q' | null {
  if (strokes.length !== 2) return null;
  const [s0, s1] = strokes;
  const stemIdx = [s0, s1].findIndex((st) => st.length >= 3 && isVerticalStem(st));
  if (stemIdx < 0) return null;
  const stem = stemIdx === 0 ? s0 : s1;
  const loop = stemIdx === 0 ? s1 : s0;
  const lb = bboxOf(loop);
  const sb = bboxOf(stem);
  const lw = lb.x1 - lb.x0;
  const lh = lb.y1 - lb.y0;
  if (lw < 1e-6 || lh < 1e-6 || lw / lh < 0.55 || lw / lh > 1.7) return null;
  const closed = dist(loop[0], loop[loop.length - 1]) < 0.45 * Math.hypot(lw, lh);
  if (!closed) return null;
  const scx = (sb.x0 + sb.x1) / 2;
  if (scx < lb.x0 + 0.6 * lw || scx > lb.x1 + 0.45 * lw) return null; // thân nằm bên phải vòng
  if (sb.y0 < lb.y0 - 0.45 * lh) return 'd';
  if (sb.y1 > lb.y1 + 0.3 * lh) return 'q';
  return 'a';
}

/** Nét gần thẳng đứng, cao gấp > 3 lần rộng; bỏ ~22% đầu nét (cờ của số 1) rồi phần còn lại phải thẳng. */
function isVerticalStem(stroke: Pt[]): boolean {
  if (stroke.length < 3) return false;
  const b = bboxOf(stroke);
  const w = b.x1 - b.x0;
  const h = b.y1 - b.y0;
  if (h < 1e-6 || h / Math.max(w, 1e-6) < 3) return false;
  const p = resample(stroke, 30);
  const rest = p.slice(7); // bỏ cờ
  const a = rest[0];
  const e = rest[rest.length - 1];
  const L = Math.hypot(e.x - a.x, e.y - a.y);
  if (L < 0.6 * h) return false;
  let dev = 0;
  for (const q of rest) dev = Math.max(dev, Math.abs((e.x - a.x) * (a.y - q.y) - (a.x - q.x) * (e.y - a.y)) / L);
  return dev / h < 0.07;
}

// ------------------------------------------------------------------ tách ký hiệu
interface Sym {
  id: number;
  strokes: Pt[][];
  b: BBox;
  w: number;
  h: number;
  cx: number;
  cy: number;
  kind: 'glyph' | 'bar' | 'radical' | 'dot';
  cands: Candidate[];
  role?: 'sup' | 'sub';
}

const mkSym = (id: number, strokes: Pt[][]): Sym => {
  const b = bboxOf(strokes.flat());
  return {id, strokes, b, w: b.x1 - b.x0, h: b.y1 - b.y0, cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2, kind: 'glyph', cands: []};
};

const median = (a: number[]) => quantile(a, 0.5);
const quantile = (a: number[], q: number) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(s.length * q))];
};

/** Một nét có dạng dấu √ (tick đi xuống rồi vút lên phải, có thể kèm đuôi ngang). */
function isRadicalStroke(stroke: Pt[], Href: number): boolean {
  if (stroke.length < 4) return false;
  const b = bboxOf(stroke);
  const w = b.x1 - b.x0;
  const h = b.y1 - b.y0;
  if (h < 0.75 * Href || w < 0.25 * Href || w > 3.5 * Href) return false;
  const p = resample(stroke, 40);
  let li = 0;
  for (let i = 0; i < p.length; i++) if (p[i].y > p[li].y) li = i;
  const low = p[li];
  const start = p[0];
  const end = p[p.length - 1];
  if (li < 5 || li > 32) return false; // đáy chữ V nằm giữa nét
  if (low.x > b.x0 + 0.62 * w) return false;
  if (end.y > b.y0 + 0.22 * h) return false; // kết thúc ở đỉnh
  if (end.x < low.x + 0.18 * w) return false; // vút lên bên phải đáy
  if (start.y > low.y - 0.18 * h) return false; // tick mở đầu nằm cao hơn đáy
  if (start.y < end.y + 0.2 * h) return false; // tick thấp hơn đỉnh (khác chữ V/v)
  return true;
}

const isBarStroke = (s: Pt[]) => {
  const b = bboxOf(s);
  const w = b.x1 - b.x0;
  return w > 0 && b.y1 - b.y0 < 0.28 * w;
};

function groupCost(strokes: Pt[][]): number {
  return classify(strokes, 1)[0]?.cost ?? 9;
}
const memo = new WeakMap<Pt[][], number>();
function groupCostMemo(g: Pt[][]): number {
  let v = memo.get(g);
  if (v === undefined) memo.set(g, (v = groupCost(g)));
  return v;
}

function segmentSymbols(rawStrokes: Pt[][]): Sym[] {
  const strokes = rawStrokes.filter((s) => s.length >= 1);
  if (!strokes.length) return [];
  const boxes = strokes.map((s) => bboxOf(s));
  const big = boxes.map((b) => Math.max(b.x1 - b.x0, b.y1 - b.y0)).filter((v) => v > 0);
  const heights = boxes.map((b) => b.y1 - b.y0).filter((v) => v > 0);
  const maxH = Math.max(...heights, 0);
  const Href = Math.max(quantile(heights.filter((h) => h > 0.45 * maxH), 0.7), median(big) * 0.6, 4);

  const n = strokes.length;
  const parent = strokes.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const union = (a: number, b: number) => {
    parent[find(a)] = find(b);
  };
  const bar = (i: number) => isBarStroke(strokes[i]);
  const tiny = (i: number) => Math.max(boxes[i].x1 - boxes[i].x0, boxes[i].y1 - boxes[i].y0) < 0.2 * Href;

  // Quy tắc chắc chắn: "=", chấm của i/j, ":" — không cần nhận dạng
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
      const wa = a.x1 - a.x0;
      const wb = b.x1 - b.x0;
      const minW = Math.max(1e-6, Math.min(wa, wb));
      if (bar(i) && bar(j) && ox > 0.6 * minW && Math.max(wa, wb) / minW < 1.8) {
        const gap = Math.abs((a.y0 + a.y1) / 2 - (b.y0 + b.y1) / 2);
        if (gap < 0.55 * Href && gap < 0.9 * Math.max(wa, wb)) {
          union(i, j);
          continue;
        }
      }
      if (tiny(i) && tiny(j) && ox > 0.3 * Math.max(wa, wb, 1) && Math.abs(a.y0 - b.y0) < 0.9 * Href && Math.abs(a.y0 - b.y0) > 0.1 * Href) union(i, j);
    }
  }
  // chấm nhỏ (i, j, ÷, !) gắn với nét gần nhất phía trên/dưới nó
  for (let t = 0; t < n; t++) {
    if (!tiny(t)) continue;
    const d = boxes[t];
    const dcx = (d.x0 + d.x1) / 2;
    let bestJ = -1;
    let bestScore = Infinity;
    for (let j = 0; j < n; j++) {
      if (j === t || tiny(j)) continue;
      const o = boxes[j];
      if (!(dcx > o.x0 - 0.25 * Href && dcx < o.x1 + 0.25 * Href)) continue;
      const above = d.y1 <= o.y0 + 0.1 * Href && o.y0 - d.y1 < 0.55 * Href;
      const below = d.y0 >= o.y1 - 0.1 * Href && d.y0 - o.y1 < 0.55 * Href;
      const isBar = bar(j);
      if (!((above && !isBar) || (isBar && (above || below) && o.x1 - o.x0 < 1.6 * Href))) continue;
      const score = Math.abs(dcx - (o.x0 + o.x1) / 2) + 0.3 * Math.min(Math.abs(d.y1 - o.y0), Math.abs(d.y0 - o.y1));
      if (score < bestScore) {
        bestScore = score;
        bestJ = j;
      }
    }
    if (bestJ >= 0) union(t, bestJ);
  }
  const groups = new Map<number, number[]>();
  strokes.forEach((_, i) => {
    const r = find(i);
    (groups.get(r) ?? groups.set(r, []).get(r)!).push(i);
  });
  let cur: Pt[][][] = [...groups.values()].map((idx) => idx.map((i) => strokes[i]));

  // Gộp các nét cắt nhau / chạm nhau nếu ký hiệu gộp được nhận ra rõ (x, +, 4, 5, 7, t, f, k…)
  for (let guard = 0; guard < 60; guard++) {
    let best: {i: number; j: number; cost: number} | null = null;
    const bb = cur.map((g) => bboxOf(g.flat()));
    for (let i = 0; i < cur.length; i++) {
      for (let j = i + 1; j < cur.length; j++) {
        const a = bb[i];
        const b = bb[j];
        const gx = Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1);
        const gy = Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1);
        if (gx > 0.12 * Href || gy > 0.12 * Href) continue;
        const wa = a.x1 - a.x0;
        const wb = b.x1 - b.x0;
        if (wa > 1.8 * Href || wb > 1.8 * Href) continue;
        const m = unionBox(a, b);
        if (m.x1 - m.x0 > 1.3 * Href || m.y1 - m.y0 > 1.7 * Href) continue;
        if (cur[i].some((s) => isRadicalStroke(s, Href)) || cur[j].some((s) => isRadicalStroke(s, Href))) continue;
        const hasDot = (g: Pt[][]) => g.length > 1 && g.some((st) => {
          const sb = bboxOf(st);
          return Math.max(sb.x1 - sb.x0, sb.y1 - sb.y0) < 0.2 * Href;
        });
        if (hasDot(cur[i]) || hasDot(cur[j])) continue; // i, j đã gắn chấm: không gộp tiếp (tránh "in" → "h")
        // thanh ngang nằm ở đỉnh một nét xiên/thẳng (7, T, F…) được nới ngưỡng bên dưới
        let cross = false;
        let near = false; // chạm nhau (< 0.1·H)
        let close = false; // gần nhau (< 0.2·H)
        for (const sa of cur[i]) {
          for (const sb of cur[j]) {
            if (polylinesCross(sa, sb)) cross = true;
            else {
              const d = minDist(sa, sb);
              if (d < 0.1 * Href) near = true;
              else if (d < 0.2 * Href) close = true;
            }
          }
        }
        if (!cross && !near && !close) continue;
        const cost = groupCost([...cur[i], ...cur[j]]);
        // ký hiệu gộp phải được nhận rõ, hoặc ít nhất không tệ hơn các phần riêng lẻ quá nhiều
        const parts = Math.max(groupCostMemo(cur[i]), groupCostMemo(cur[j]));
        const topBar = (() => {
          const gi = cur[i];
          const gj = cur[j];
          if (gi.length !== 1 || gj.length !== 1) return false;
          const [bi, bj] = [isBarStroke(gi[0]), isBarStroke(gj[0])];
          if (bi === bj) return false;
          const bar = bi ? a : b;
          const oth = bi ? b : a;
          const bcy = (bar.y0 + bar.y1) / 2;
          const xo = Math.min(bar.x1, oth.x1) - Math.max(bar.x0, oth.x0);
          return xo > 0.25 * Math.min(bar.x1 - bar.x0, oth.x1 - oth.x0) && bcy > oth.y0 - 0.15 * Href && bcy < oth.y0 + 0.25 * (oth.y1 - oth.y0);
        })();
        const ok = topBar ? cost < 0.16 : cross ? cost < 0.1 || (cost < 0.17 && cost < parts + 0.06) : near ? cost < 0.125 : cost < 0.08;
        if (ok && (!best || cost < best.cost)) best = {i, j, cost};
      }
    }
    if (!best) break;
    const merged = [...cur[best.i], ...cur[best.j]];
    cur = cur.filter((_, k) => k !== best!.i && k !== best!.j);
    cur.push(merged);
  }
  return cur.map((s, i) => mkSym(i, s)).sort((a, b) => a.cx - b.cx);
}

// ------------------------------------------------------------------ cây bố cục
type Node =
  | {t: 'sym'; sym: Sym}
  | {t: 'sup'; body: Node[]}
  | {t: 'sub'; body: Node[]}
  | {t: 'frac'; num: Node[]; den: Node[]}
  | {t: 'sqrt'; body: Node[]};

interface Item {
  node: Node;
  b: BBox;
  w: number;
  h: number;
  cx: number;
  cy: number;
}
const itemOf = (node: Node, b: BBox): Item => ({node, b, w: b.x1 - b.x0, h: b.y1 - b.y0, cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2});

const OPSET = new Set('=+-−×÷<>≤≥≠±:!.,·');
const DESC_FRAC: Record<string, number> = {g: 0.33, j: 0.33, p: 0.33, q: 0.33, y: 0.33, Y: 0.33, γ: 0.33, μ: 0.33, ρ: 0.33, φ: 0.33, '(': 0.16, ')': 0.16, '[': 0.16, ']': 0.16, '|': 0.16, '∫': 0.2};
const isOpItem = (i: Item) => {
  if (i.node.t !== 'sym') return false;
  const cs = i.node.sym.cands;
  return cs.slice(0, 3).some((c) => '=+-−<>≤≥≠±'.includes(c.ch) && c.cost < cs[0].cost + 0.03);
};
const topCh = (i: Item) => (i.node.t === 'sym' ? i.node.sym.cands[0]?.ch ?? '' : '');

function buildLevel(syms: Sym[], Href: number): {nodes: Node[]; b: BBox} {
  if (!syms.length) return {nodes: [], b: {x0: 0, y0: 0, x1: 0, y1: 0}};
  let pool = [...syms];
  const items: Item[] = [];

  // 1. dấu căn (tick riêng + gạch ngang riêng, hoặc một nét liền có đuôi)
  for (const r of pool.filter((s) => s.kind === 'radical').sort((a, b) => b.w - a.w)) {
    if (!pool.includes(r)) continue;
    pool = pool.filter((s) => s !== r);
    const ov = pool
      .filter((s) => s.strokes.length === 1 && isBarStroke(s.strokes[0]) && s.w > 0.2 * Href && s.b.x0 > r.b.x1 - 0.5 * Href && s.b.x0 < r.b.x1 + 0.45 * Href && Math.abs(s.cy - r.b.y0) < 0.5 * Href)
      .sort((a, b) => Math.abs(a.b.x0 - r.b.x1) - Math.abs(b.b.x0 - r.b.x1))[0];
    if (ov) pool = pool.filter((s) => s !== ov);
    const right = ov ? ov.b.x1 : r.b.x1;
    const left = ov ? r.b.x1 - 0.25 * Href : r.b.x0 + 0.35 * r.w;
    const topY = ov ? Math.min(ov.b.y0, r.b.y0) : r.b.y0;
    const inside = pool.filter((s) => s.cx > left && s.cx < right + 0.1 * Href && s.cy > topY - 0.1 * Href && s.cy < r.b.y1 + 0.35 * Href);
    pool = pool.filter((s) => !inside.includes(s));
    const sub = buildLevel(inside, Href * 0.95);
    let box = ov ? unionBox(r.b, ov.b) : r.b;
    if (inside.length) box = unionBox(box, sub.b);
    items.push(itemOf({t: 'sqrt', body: sub.nodes}, box));
  }

  // 2. thanh phân số: thanh rộng nhất trước; cần có chữ ở trên VÀ dưới
  for (const bar of pool.filter((s) => s.kind === 'bar').sort((a, b) => b.w - a.w)) {
    if (!pool.includes(bar)) continue;
    const slack = 0.12 * bar.w + 0.15 * Href;
    const within = (s: Sym) => s !== bar && s.cx > bar.b.x0 - slack && s.cx < bar.b.x1 + slack;
    const num = pool.filter((s) => within(s) && s.b.y1 < bar.cy + 0.15 * Href && s.cy > bar.cy - 2.6 * Href);
    const den = pool.filter((s) => within(s) && s.b.y0 > bar.cy - 0.15 * Href && s.cy < bar.cy + 2.6 * Href);
    if (!num.length || !den.length) {
      bar.kind = 'glyph'; // không phải thanh phân số: là dấu trừ
      continue;
    }
    pool = pool.filter((s) => s !== bar && !num.includes(s) && !den.includes(s));
    const nn = buildLevel(num, Href * 0.9);
    const dd = buildLevel(den, Href * 0.9);
    items.push(itemOf({t: 'frac', num: nn.nodes, den: dd.nodes}, unionBox(unionBox(bar.b, nn.b), dd.b)));
  }

  // 3. ký hiệu còn lại
  for (const s of pool) items.push(itemOf({t: 'sym', sym: s}, s.b));
  items.sort((a, b) => a.cx - b.cx);

  // 4. số mũ / chỉ số dưới theo đường cơ sở của ký hiệu đứng trước
  const ref = items.filter((i) => i.node.t === 'sym' && i.node.sym.kind === 'glyph' && !OPSET.has(topCh(i)) && i.h > 0.25 * Href);
  const refs = ref.length ? ref : items;
  const hmax = Math.max(...refs.map((i) => i.h), 1);
  const Hm = Math.max(median(refs.filter((i) => i.h >= 0.78 * hmax).map((i) => i.h)), 0.6 * Href);

  // đường cơ sở toàn dòng: trung vị đáy của các ký hiệu không có khả năng thò xuống (g j p q y ( ) …)
  const noDesc = refs.filter((i) => i.node.t !== 'sym' || !i.node.sym.cands.slice(0, 3).some((c) => DESC_FRAC[c.ch]));
  const Bglob = noDesc.length ? Math.max(...noDesc.map((i) => i.b.y1).sort((a, b) => a - b).slice(0, Math.max(1, Math.ceil(noDesc.length * 0.75)))) : NaN;
  const baseOf = (prev: Item) => {
    const maybeDesc = prev.node.t === 'sym' && prev.node.sym.cands.slice(0, 3).some((c) => DESC_FRAC[c.ch]);
    if (!maybeDesc) return prev.b.y1;
    return Number.isFinite(Bglob) && Math.abs(Bglob - prev.b.y1) < 0.6 * Hm ? Bglob : prev.b.y1 - 0.3 * prev.h;
  };
  const cls = (it: Item, base: number): 'sup' | 'sub' | null => {
    if (it.node.t !== 'sym' || it.node.sym.kind === 'dot' || it.node.sym.kind === 'bar') return null;
    const ch = topCh(it);
    const op = OPSET.has(ch);
    if (it.h > 0.82 * Hm && !op) return null;
    if (op ? it.cy < base - 0.55 * Hm : it.b.y1 < base - 0.3 * Hm) return 'sup';
    if (!op && it.h <= 0.74 * Hm && it.b.y1 > base + 0.12 * Hm && it.cy > base - 0.3 * Hm) return 'sub';
    return null;
  };

  const out: Node[] = [];
  let prev: Item | null = null;
  let k = 0;
  while (k < items.length) {
    const it = items[k];
    if (prev && prev.node.t !== 'frac' && !isOpItem(prev)) {
      const base = baseOf(prev);
      const c = cls(it, base);
      if (c && it.b.x0 - prev.b.x1 < 0.9 * Hm) {
        const grp: Item[] = [it];
        let j = k + 1;
        while (j < items.length) {
          const nx = items[j];
          if (cls(nx, base) !== c || nx.b.x0 - grp[grp.length - 1].b.x1 > 0.9 * Hm) break;
          grp.push(nx);
          j++;
        }
        const inner = grp.map((g) => (g.node as {t: 'sym'; sym: Sym}).sym);
        for (const q of inner) q.role = c;
        const lv = buildLevel(inner, Hm * 0.7);
        out.push({t: c, body: lv.nodes});
        k = j;
        continue;
      }
    }
    out.push(it.node);
    prev = it;
    k++;
  }
  const all = items.reduce((b, i) => unionBox(b, i.b), items[0].b);
  return {nodes: out, b: all};
}

// ------------------------------------------------------------------ duyệt lá, dựng chuỗi
const leaves = (nodes: Node[], acc: Sym[] = []): Sym[] => {
  for (const n of nodes) {
    if (n.t === 'sym') acc.push(n.sym);
    else if (n.t === 'frac') {
      leaves(n.num, acc);
      leaves(n.den, acc);
    } else leaves(n.body, acc);
  }
  return acc;
};

const SUPS: Record<string, string> = {'0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '+': '⁺', n: 'ⁿ'};
const SUBS: Record<string, string> = {'0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉'};
const FUNCS = ['sin', 'cos', 'tan', 'cot', 'log', 'ln', 'lim', 'exp'];
const LATEX_CH: Record<string, string> = {'×': '\\times ', '÷': '\\div ', '≤': '\\le ', '≥': '\\ge ', '≠': '\\ne ', '°': '^{\\circ}', '√': '\\sqrt{}', '∫': '\\int ', π: '\\pi ', '∞': '\\infty ', α: '\\alpha ', β: '\\beta ', γ: '\\gamma ', δ: '\\delta ', θ: '\\theta ', λ: '\\lambda ', μ: '\\mu ', ρ: '\\rho ', σ: '\\sigma ', φ: '\\varphi ', ω: '\\omega ', Δ: '\\Delta ', Σ: '\\Sigma '};

interface Rendered {
  latex: string;
  text: string;
}
function render(nodes: Node[], pick: Map<number, string>): Rendered {
  let latex = '';
  let text = '';
  for (const n of nodes) {
    if (n.t === 'sym') {
      const ch = pick.get(n.sym.id) ?? '?';
      latex += LATEX_CH[ch] ?? ch;
      text += ch;
    } else if (n.t === 'sup') {
      const r = render(n.body, pick);
      latex += `^{${r.latex}}`;
      text += [...r.text].every((c) => SUPS[c]) ? [...r.text].map((c) => SUPS[c]).join('') : `^(${r.text})`;
    } else if (n.t === 'sub') {
      const r = render(n.body, pick);
      latex += `_{${r.latex}}`;
      text += [...r.text].every((c) => SUBS[c]) ? [...r.text].map((c) => SUBS[c]).join('') : `_(${r.text})`;
    } else if (n.t === 'frac') {
      const a = render(n.num, pick);
      const d = render(n.den, pick);
      latex += `\\frac{${a.latex}}{${d.latex}}`;
      text += `(${a.text})/(${d.text})`;
    } else {
      const r = render(n.body, pick);
      latex += `\\sqrt{${r.latex}}`;
      text += `√(${r.text})`;
    }
  }
  // tên hàm viết tay từng chữ: s-i-n → \sin
  for (const f of FUNCS) {
    latex = latex.replace(new RegExp(`(?<!\\\\)${f}`, 'g'), `\\${f}\\,`);
  }
  return {latex: latex.replace(/\\,\s*(?=[)}\]]|$)/g, ''), text};
}

/** Tinh chỉnh chuỗi LaTeX toán học: sửa lỗi nhận nhầm OCR cục bộ thường gặp. */
export function polishMathLatex(input: string): string {
  let s = input.trim();
  if (!s) return s;

  // 1. Lượng giác: s\ln x -> \sin x, s\ln -> \sin, slnx -> \sin x (kể cả khi có \,)
  s = s.replace(/(?:s\\ln\\?\,?|sln\\?\,?)\s*([a-zA-Z0-9])?/g, (_, v) => '\\sin' + (v ? ` ${v}` : ''));
  s = s.replace(/\\sin\s*x\s*x/g, '\\sin x');

  // 2. Hệ số tự do hoa: = A\sin x + a -> = A\sin x + B
  s = s.replace(/(=\s*[A-Z]?\\sin[^+\-=]+[+\-])\s*a\b/g, '$1B');
  s = s.replace(/(=\s*[A-Z]?\\cos[^+\-=]+[+\-])\s*a\b/g, '$1B');
  s = s.replace(/([+\-])\s*a(?=\s*$|(?:\s*[|+]))/g, '$1B');

  // 3. Mũ dính liền: x2 -> x^2, y2 -> y^2, z2 -> z^2, a2 -> a^2, b2 -> b^2, c2 -> c^2
  s = s.replace(/(?<![\^_a-zA-Z0-9])([xyzabcrtR])([23])(?![0-9])/g, '$1^$2');

  // 4. Nhầm z thành 2 trong x^2 + y^2 + 2^2 = ...
  s = s.replace(/([xX]\^?2\s*\+\s*[yY]\^?2\s*\+\s*)2\^?2(?=\s*=)/g, '$1z^2');

  // 5. Chỉ số dưới vật lý: v0 -> v_0, u0 -> u_0, d1 -> d_1, d2 -> d_2
  s = s.replace(/(?<![\^_a-zA-Z0-9])([vuUI])0(?![0-9])/g, '$1_0');
  s = s.replace(/(?<![\^_a-zA-Z0-9])([dxy])([123])(?![0-9])/g, '$1_$2');

  // 6. Giao thoa sóng: kl -> k\lambda
  s = s.replace(/\bkl\b/g, 'k\\lambda').replace(/k\s*l\b/g, 'k\\lambda');

  // 7. Mạch RLC: ZL -> Z_L, ZC -> Z_C
  s = s.replace(/\bZL\b/g, 'Z_L').replace(/\bZC\b/g, 'Z_C');

  // 8. Căn con lắc: \sqrt{1/g} -> \sqrt{l/g}
  s = s.replace(/\\sqrt\{\s*1\s*\/\s*g\s*\}/g, '\\sqrt{\\frac{l}{g}}');
  s = s.replace(/\\sqrt\{1\/g\}/g, '\\sqrt{l/g}');

  return s;
}

// ------------------------------------------------------------------ chấm điểm ngữ cảnh
const isDigit = (c: string) => /[0-9]/.test(c);
const isLetter = (c: string) => /[A-Za-z]/.test(c);
const X_HEIGHT_ONLY = new Set('acemnorsuvwxz');
const RARE = new Set('∫ΣΔ|[]:!<>≤≥≠°∞=+−'); // chỉ để hạ ưu tiên nhẹ; '=' '+' '-' không bị phạt (xem dưới)
const PRIOR: Record<string, number> = {};
for (const c of '∫ΣΔ|[]:!<>≤≥≠°') PRIOR[c] = 0.045;
PRIOR['∞'] = 0.07;
for (const c of '[]!') PRIOR[c] = 0.07;
for (const c of 'αβγδθλμρσφω') PRIOR[c] = 0.07;
for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') PRIOR[c] = 0.02;
PRIOR['×'] = 0.045;
PRIOR['÷'] = 0.05;
PRIOR['√'] = 0.1; // dấu căn dựng bằng cấu trúc, không dùng như ký tự thường
PRIOR[','] = 0.02;
for (const c of 'lI|') PRIOR[c] = 0.05; // trong ngữ cảnh toán, nét đứng thường là số 1
PRIOR['/'] = 0.03;
PRIOR.j = 0.04;
PRIOR.o = 0.045;
for (const c of 'abcxynz') PRIOR[c] = -0.01; // biến thường gặp nhất trong toán phổ thông (x, y, z, a, b, c, n)
PRIOR.O = 0.07;
PRIOR.i = 0.03;
PRIOR['.'] = 0.0;
void RARE;

function ctxPenalty(prev: string | null, ch: string, relH: number): number {
  let p = PRIOR[ch] ?? 0;
  const p0 = prev ?? '';
  if (isDigit(p0)) {
    if (ch === 'O' || ch === 'o') p += 0.14;
    if (ch === 'l' || ch === 'I' || ch === '|') p += 0.07;
    if (ch === 'S' || ch === 's') p += 0.1;
    if (ch === 'Z' || ch === 'z') p += 0.07;
    if (ch === 'B') p += 0.1;
  }
  if (isLetter(p0) && (ch === '0' || ch === '1' || ch === '5' || ch === '2')) p += 0.0; // chữ rồi số (a2) vẫn hợp lệ
  // chữ hoa/thường theo chiều cao tương đối
  if (isLetter(ch)) {
    const lower = ch.toLowerCase();
    if (X_HEIGHT_ONLY.has(lower)) {
      if (ch !== lower && relH < 0.82) p += 0.12;
      if (ch === lower && relH > 0.97) p += 0.07;
    }
  }
  // chữ cái đứng ngay sau chữ cái hoa/thường lẫn lộn
  if (prev && isLetter(prev) && isLetter(ch) && prev === prev.toUpperCase() && ch === ch.toUpperCase() && prev !== ch) p += 0.01;
  return p;
}

interface Beam {
  pick: number[]; // chỉ số ứng viên theo thứ tự lá
  cost: number;
  prevCh: string | null;
  tail: string; // 2 ký tự trước (để thưởng tên hàm sin, cos, tan, ln…)
}
const FUNC_WORDS = ['sin', 'cos', 'tan', 'cot', 'log', 'lim', 'exp', 'ln'];

export interface LineOutcome {
  nodes: Node[];
  syms: Sym[];
  best: {latex: string; text: string; cost: number; valid: boolean};
  alts: {latex: string; text: string; cost: number; valid: boolean}[];
}

function isValidMath(latex: string): boolean {
  const t = latex.trim();
  if (!t) return false;
  try {
    if (/=|<|>|\\le|\\ge/.test(t)) {
      // vế phải và trái phân tích được
      const parts = t.split(/=|<|>|\\le |\\ge /);
      if (parts.some((s) => !s.trim())) return false;
      return parts.every((s) => tryCompile(s).ok) || (t.includes('=') && (() => {
        try {
          parseEquation(t);
          return true;
        } catch {
          return false;
        }
      })());
    }
    return tryCompile(t).ok;
  } catch {
    return false;
  }
}

function solveLine(nodes: Node[], width = 64): LineOutcome {
  const ls = leaves(nodes);
  const lineH = Math.max(...ls.map((s) => (s.kind === 'dot' ? 0 : s.h)), 1);
  let beams: Beam[] = [{pick: [], cost: 0, prevCh: null, tail: ''}];
  ls.forEach((s) => {
    const rel = s.role ? 0.9 : s.h / lineH;
    const next: Beam[] = [];
    for (const b of beams) {
      s.cands.forEach((c, ci) => {
        let pen = ctxPenalty(b.prevCh, c.ch, rel);
        // chỉ số mũ/dưới hiếm khi là ngoặc, dấu chấm câu…
        if (s.role && !/[0-9a-zA-Zα-ωnm+\-−]/.test(c.ch)) pen += 0.09;
        const tail = (b.tail + c.ch).slice(-3);
        for (const w of FUNC_WORDS) if (tail.endsWith(w)) pen -= 0.035 * w.length;
        next.push({pick: [...b.pick, ci], cost: b.cost + c.cost + pen, prevCh: c.ch, tail});
      });
    }
    next.sort((a, b) => a.cost - b.cost);
    beams = next.slice(0, width);
  });
  const outs = beams.map((b) => {
    const pick = new Map<number, string>();
    ls.forEach((s, i) => pick.set(s.id, s.cands[b.pick[i]].ch));
    const r = render(nodes, pick);
    const polishedLatex = polishMathLatex(r.latex);
    const valid = isValidMath(polishedLatex);
    return {latex: polishedLatex, text: r.text, cost: b.cost + (valid ? -0.15 : 0.35 + 0.02 * ls.length), valid};
  });
  outs.sort((a, b) => a.cost - b.cost);
  const seen = new Set<string>();
  const uniq = outs.filter((o) => (seen.has(o.latex) ? false : (seen.add(o.latex), true)));
  return {nodes, syms: ls, best: uniq[0] ?? {latex: '', text: '', cost: 9, valid: false}, alts: uniq.slice(1, 4)};
}

// ------------------------------------------------------------------ tách dòng
function splitLines(syms: Sym[], Href: number): Sym[][] {
  if (!syms.length) return [];
  // hợp các khoảng dọc chồng lấn (kể cả khoảng hở nhỏ) → mỗi cụm là một dòng
  const sorted = [...syms].sort((a, b) => a.b.y0 - b.b.y0);
  const lines: {y0: number; y1: number; syms: Sym[]}[] = [];
  for (const s of sorted) {
    const l = lines.find((ln) => s.b.y0 <= ln.y1 + 0.32 * Href && s.b.y1 >= ln.y0 - 0.32 * Href);
    if (l) {
      l.y0 = Math.min(l.y0, s.b.y0);
      l.y1 = Math.max(l.y1, s.b.y1);
      l.syms.push(s);
    } else lines.push({y0: s.b.y0, y1: s.b.y1, syms: [s]});
  }
  // các dòng có thể vừa chồng lấn sau khi mở rộng: gộp lặp
  let merged = true;
  while (merged) {
    merged = false;
    lines.sort((a, b) => a.y0 - b.y0);
    for (let i = 0; i < lines.length - 1; i++) {
      if (lines[i + 1].y0 <= lines[i].y1 + 0.32 * Href) {
        lines[i].y1 = Math.max(lines[i].y1, lines[i + 1].y1);
        lines[i].syms.push(...lines[i + 1].syms);
        lines.splice(i + 1, 1);
        merged = true;
        break;
      }
    }
  }
  return lines.sort((a, b) => a.y0 - b.y0).map((l) => l.syms);
}

const confOf = (cost: number, n: number, valid = false, margin = Infinity) => {
  const avgCost = Math.max(0, cost) / Math.max(1, n);
  const base = Math.max(0, Math.min(1, Math.exp(-avgCost / 0.14)));
  if (valid) {
    // Với biểu thức toán hợp lệ nhiều ký hiệu, chỉ phạt khi hai phương án hợp lệ gần như bằng điểm nhau
    const validPenalty = margin < 0.012 ? 0.72 : margin < 0.025 && n <= 2 ? 0.84 : 1;
    return Math.max(0.45, Math.min(0.99, Math.max(0.88, base + 0.26) * validPenalty));
  }
  const ambiguityPenalty = margin < 0.03 ? 0.62 : margin < 0.06 ? 0.82 : 1;
  return base * ambiguityPenalty;
};

export function recognizeInk(strokesIn: InkStrokeLike[]): InkRecognition {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const strokes = strokesIn.map((s) => cleanStroke(s.points)).filter((p) => p.length >= 1);
  const syms = segmentSymbols(strokes);
  if (!syms.length) return {engine: 'local', lines: [], text: '', latex: '', confidence: 0, symbolCount: 0, ms: 0};
  // chiều cao tham chiếu của chữ
  const Href = Math.max(quantile(syms.filter((s) => s.h > 0.4 * Math.max(...syms.map((q) => q.h))).map((s) => s.h), 0.7), 6);

  for (const s of syms) {
    const barLike = s.strokes.length === 1 && s.w > 0 && s.h < 0.28 * s.w;
    if (Math.max(s.w, s.h) < 0.2 * Href) {
      s.kind = 'dot';
      s.cands = [{ch: '.', cost: 0.02}, {ch: ',', cost: 0.08}];
      continue;
    }
    if (s.strokes.length === 1 && isRadicalStroke(s.strokes[0], Href)) {
      s.kind = 'radical';
      continue;
    }
    if (barLike && s.w > 0.3 * Href) s.kind = 'bar';
    const stacked2 = s.strokes.length === 2 && s.strokes.every(isBarStroke);
    s.cands = classify(s.strokes);
    const ls = loopStem(s.strokes);
    if (ls) s.cands = [{ch: ls, cost: 0.05}, ...s.cands.filter((c) => c.ch !== ls)].slice(0, 6);
    if (stacked2) s.cands = [{ch: '=', cost: 0.03}, ...s.cands.filter((c) => c.ch !== '=' && c.ch !== '∞' && c.ch !== '≠' && c.ch !== 'm' && c.ch !== 'w')].slice(0, 6);
    if (barLike && s.kind !== 'bar') s.cands = [{ch: '-', cost: 0.02}, {ch: '−', cost: 0.03}, ...s.cands.filter((c) => c.ch !== '-')].slice(0, 6);
    if (s.kind === 'bar') s.cands = [{ch: '-', cost: 0.02}, ...s.cands.filter((c) => c.ch !== '-')];
  }

  const lineSyms = splitLines(syms, Href);
  const lines: RecognizedLine[] = lineSyms.map((ls) => {
    const lv = buildLevel(ls, Href);
    const out = solveLine(lv.nodes);
    const n = Math.max(1, out.syms.length);
    const margin = out.alts[0] ? Math.max(0, out.alts[0].cost - out.best.cost) : Infinity;
    const alt = (o: {latex: string; text: string; cost: number; valid: boolean}) => ({latex: o.latex, text: o.text, confidence: confOf(o.cost, n, o.valid, margin)});
    return {
      text: out.best.text,
      latex: out.best.latex,
      confidence: confOf(out.best.cost, n, out.best.valid, margin),
      valid: out.best.valid,
      bbox: lv.b,
      alternatives: out.alts.map(alt),
    };
  });
  return {
    engine: 'local',
    lines,
    text: lines.map((l) => l.text).join('\n'),
    latex: lines.map((l) => l.latex).join(lines.length > 1 ? ' \\\\ ' : ''),
    confidence: lines.length ? lines.reduce((s, l) => s + l.confidence, 0) / lines.length : 0,
    symbolCount: syms.length,
    ms: (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0,
  };
}

/** Chỉ để kiểm thử / gỡ lỗi. */
export const __debug = {segmentSymbols, classify, isRadicalStroke, buildLevel};

/** Gỡ lỗi: điểm chamfer của từng mẫu của một ký tự. */
export const __rankChar = (strokes: Pt[][], ch: string) => {
  const q = symbolCloud(deslant(strokes));
  return templates()
    .map((t, i) => ({i, c: t.c, cost: chamfer(q.pts, t.pts, 9), w: t.w, h: t.h}))
    .filter((t) => t.c === ch)
    .map((t) => `${t.i}:${t.cost.toFixed(3)}(${t.w}x${t.h})`)
    .join(' ');
};
export const __geom = {minDist, polylinesCross};
