// apps/teacher-board/src/utils/graphModel.ts
/**
 * Mô hình tính toán thuần cho đồ thị đa hàm (tách khỏi React để kiểm thử và chạy 60 FPS):
 * biên dịch danh sách hàm, tham số tự động, khung nhìn, lấy mẫu có xử lý tiệm cận,
 * giao điểm / nghiệm / cực trị, diện tích giữa hai đường cong.
 */
import {Compiled, Vars, compileExpr, parseEquation, findIntersections, findRoots, findExtrema, integrate, derivative, fmtNum} from './mathExpr';

export const FN_COLORS = ['#E11D48', '#2563EB', '#059669', '#D97706', '#7C3AED', '#0891B2', '#DB2777', '#4D7C0F'];

export interface GraphFn {
  id: string;
  text: string;
  color: string;
  visible: boolean;
}

export interface CompiledFn extends GraphFn {
  kind: 'explicit' | 'implicit' | 'error';
  compiled?: Compiled;
  error?: string;
  params: string[];
  latex: string;
  /** y = f(x) đã chuẩn hóa để hiển thị */
  label: string;
}

export interface ParamCfg {
  key: string;
  value: number;
  min: number;
  max: number;
  step: number;
}

export interface View {
  cx: number; // toạ độ x ở tâm khung
  cy: number;
  sx: number; // pixel / đơn vị theo x
  sy: number; // pixel / đơn vị theo y
}

export const compileGraphFn = (fn: GraphFn): CompiledFn => {
  try {
    const eq = parseEquation(fn.text);
    if (eq.kind === 'implicit') return {...fn, kind: 'implicit', compiled: eq.fn, params: eq.fn.params, latex: `${latexOfSide(eq.lhs)} = ${latexOfSide(eq.rhs)}`, label: fn.text};
    const c = eq.fn;
    const name = eq.kind === 'explicit' ? eq.name : 'y';
    return {...fn, kind: 'explicit', compiled: c, params: c.params, latex: `${name === 'y' ? 'y' : `${name}(x)`} = ${c.latex}`, label: fn.text};
  } catch (e) {
    return {...fn, kind: 'error', error: e instanceof Error ? e.message : String(e), params: [], latex: '', label: fn.text};
  }
};

const latexOfSide = (s: string) => {
  try {
    return compileExpr(s).latex;
  } catch {
    return s;
  }
};

export const compileGraphFns = (fns: GraphFn[]) => fns.map(compileGraphFn);

/** Tham số tự do của mọi hàm đang có (A, B, k…), theo thứ tự xuất hiện đầu tiên. */
export const collectParams = (cfns: CompiledFn[]): string[] => {
  const seen: string[] = [];
  for (const f of cfns) for (const p of f.params) if (!seen.includes(p)) seen.push(p);
  return seen;
};

/** Giá trị mặc định và khoảng thanh trượt hợp lý theo vai trò của tham số. */
export const defaultParam = (key: string): ParamCfg => {
  const k = key.toLowerCase();
  if (k === 'omega' || k === 'w') return {key, value: 1, min: 0.2, max: 6, step: 0.1};
  if (k === 'phi' || k === 'varphi' || k === 'theta' || k === 'alpha' || k === 'beta') return {key, value: 0, min: -3.14, max: 3.14, step: 0.05};
  if (k === 'a' || k === 'k') return {key, value: 2, min: -5, max: 5, step: 0.1};
  if (k === 'n') return {key, value: 2, min: 1, max: 8, step: 1};
  return {key, value: 1, min: -5, max: 5, step: 0.1};
};

export const syncParams = (keys: string[], prev: Record<string, ParamCfg>): Record<string, ParamCfg> => {
  const next: Record<string, ParamCfg> = {};
  for (const k of keys) next[k] = prev[k] ?? defaultParam(k);
  return next;
};

export const paramValues = (cfg: Record<string, ParamCfg>): Vars => Object.fromEntries(Object.entries(cfg).map(([k, v]) => [k, v.value]));

// ------------------------------------------------------------------ khung nhìn
export const defaultView = (w: number, h: number, halfX = 6): View => {
  const sx = w / (2 * halfX);
  return {cx: 0, cy: 0, sx, sy: sx};
};

export const toScreen = (v: View, w: number, h: number, x: number, y: number) => ({px: w / 2 + (x - v.cx) * v.sx, py: h / 2 - (y - v.cy) * v.sy});
export const toWorld = (v: View, w: number, h: number, px: number, py: number) => ({x: v.cx + (px - w / 2) / v.sx, y: v.cy - (py - h / 2) / v.sy});
export const viewBounds = (v: View, w: number, h: number) => ({xMin: v.cx - w / 2 / v.sx, xMax: v.cx + w / 2 / v.sx, yMin: v.cy - h / 2 / v.sy, yMax: v.cy + h / 2 / v.sy});

/**
 * Khung nhìn ban đầu: luôn tỉ lệ 1:1 (hình không méo), luôn chứa gốc tọa độ và phần "đáng chú ý" của các đường
 * (giá trị |y| ≤ 12 trong x ∈ [-6, 6]); phần vọt lên rất cao nằm ngoài khung thay vì kéo cả khung đi xa gốc.
 */
export function fitView(cfns: CompiledFn[], params: Vars, w: number, h: number, halfX = 6): View {
  let lo = 0;
  let hi = 0;
  let any = false;
  for (const f of cfns) {
    if (f.kind !== 'explicit' || !f.visible || !f.compiled) continue;
    for (let i = 0; i <= 160; i++) {
      const y = f.compiled.eval(-halfX + (2 * halfX * i) / 160, params);
      if (Number.isFinite(y) && Math.abs(y) <= 12) {
        lo = Math.min(lo, y);
        hi = Math.max(hi, y);
        any = true;
      }
    }
  }
  const sx0 = w / (2 * halfX);
  if (!any) return {cx: 0, cy: 0, sx: sx0, sy: sx0};
  const needHalfY = Math.max(((hi - lo) / 2) * 1.3, 3);
  const s = Math.min(sx0, h / (2 * needHalfY));
  return {cx: 0, cy: (lo + hi) / 2, sx: s, sy: s};
}

/** Bước lưới "đẹp" (1, 2, 5 × 10ⁿ) theo độ rộng khung. */
export function niceStep(range: number, targetLines = 8): number {
  const raw = range / targetLines;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const r = raw / mag;
  return (r < 1.5 ? 1 : r < 3.5 ? 2 : r < 7.5 ? 5 : 10) * mag;
}

// ------------------------------------------------------------------ lấy mẫu
export type Sample = {x: number; y: number} | null; // null = ngắt nét (tiệm cận / ngoài miền)

export function sampleExplicit(f: CompiledFn, params: Vars, view: View, w: number, h: number): Sample[] {
  if (f.kind !== 'explicit' || !f.compiled) return [];
  const {xMin, xMax, yMin, yMax} = viewBounds(view, w, h);
  const out: Sample[] = [];
  const n = Math.max(120, Math.ceil(w)); // ~1 mẫu mỗi pixel
  const yRange = yMax - yMin;
  let prev: number | null = null;
  for (let i = 0; i <= n; i++) {
    const x = xMin + ((xMax - xMin) * i) / n;
    const y = f.compiled.eval(x, params);
    if (!Number.isFinite(y)) {
      out.push(null);
      prev = null;
      continue;
    }
    // nhảy lớn giữa hai mẫu liền kề → tiệm cận đứng (tan, 1/x): ngắt nét
    if (prev !== null && Math.abs(y - prev) > yRange * 1.5 && Math.sign(y) !== Math.sign(prev)) out.push(null);
    out.push({x, y});
    prev = y;
  }
  return out;
}

/** Đường cong ẩn F(x,y)=0 bằng marching squares; trả về các đoạn thẳng [x1,y1,x2,y2]. */
export function implicitSegments(f: CompiledFn, params: Vars, view: View, w: number, h: number, cell = 6): number[][] {
  if (f.kind !== 'implicit' || !f.compiled) return [];
  const {xMin, xMax, yMin, yMax} = viewBounds(view, w, h);
  const nx = Math.ceil(w / cell);
  const ny = Math.ceil(h / cell);
  const dx = (xMax - xMin) / nx;
  const dy = (yMax - yMin) / ny;
  const val = new Float64Array((nx + 1) * (ny + 1));
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) val[j * (nx + 1) + i] = f.compiled.evalXY(xMin + i * dx, yMin + j * dy, params);
  const segs: number[][] = [];
  const lerp = (a: number, b: number, fa: number, fb: number) => a + ((b - a) * fa) / (fa - fb);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const v0 = val[j * (nx + 1) + i];
      const v1 = val[j * (nx + 1) + i + 1];
      const v2 = val[(j + 1) * (nx + 1) + i + 1];
      const v3 = val[(j + 1) * (nx + 1) + i];
      if (![v0, v1, v2, v3].every(Number.isFinite)) continue;
      const x0 = xMin + i * dx;
      const x1 = x0 + dx;
      const y0 = yMin + j * dy;
      const y1 = y0 + dy;
      const pts: number[][] = [];
      if (v0 * v1 < 0) pts.push([lerp(x0, x1, v0, v1), y0]);
      if (v1 * v2 < 0) pts.push([x1, lerp(y0, y1, v1, v2)]);
      if (v3 * v2 < 0) pts.push([lerp(x0, x1, v3, v2), y1]);
      if (v0 * v3 < 0) pts.push([x0, lerp(y0, y1, v0, v3)]);
      if (pts.length === 2) segs.push([pts[0][0], pts[0][1], pts[1][0], pts[1][1]]);
      else if (pts.length === 4) segs.push([pts[0][0], pts[0][1], pts[1][0], pts[1][1]], [pts[2][0], pts[2][1], pts[3][0], pts[3][1]]);
    }
  }
  return segs;
}

// ------------------------------------------------------------------ điểm đặc biệt
export interface SpecialPoint {
  kind: 'intersection' | 'zero' | 'max' | 'min';
  x: number;
  y: number;
  fn: number[]; // chỉ số hàm liên quan
}

export function specialPoints(cfns: CompiledFn[], params: Vars, xMin: number, xMax: number, want = {intersections: true, zeros: true, extrema: true}): SpecialPoint[] {
  const out: SpecialPoint[] = [];
  const ex = cfns.map((f, i) => ({f, i})).filter(({f}) => f.kind === 'explicit' && f.visible && f.compiled);
  const ev = (f: CompiledFn) => (x: number) => f.compiled!.eval(x, params);
  if (want.intersections) {
    for (let a = 0; a < ex.length; a++) {
      for (let b = a + 1; b < ex.length; b++) {
        for (const p of findIntersections(ev(ex[a].f), ev(ex[b].f), xMin, xMax)) out.push({kind: 'intersection', x: p.x, y: p.y, fn: [ex[a].i, ex[b].i]});
      }
    }
  }
  if (want.zeros) for (const {f, i} of ex) for (const r of findRoots(ev(f), xMin, xMax)) out.push({kind: 'zero', x: r, y: 0, fn: [i]});
  if (want.extrema) for (const {f, i} of ex) for (const e of findExtrema(ev(f), xMin, xMax)) out.push({kind: e.kind === 'max' ? 'max' : 'min', x: e.x, y: e.y, fn: [i]});
  return out;
}

/** Diện tích hình phẳng giới hạn bởi hai đường: lấy hai giao điểm kề nhau gần gốc nhất (hoặc đoạn đã cho). */
export function areaBetween(f: CompiledFn, g: CompiledFn, params: Vars, a?: number, b?: number, xMin = -8, xMax = 8) {
  const ff = (x: number) => f.compiled!.eval(x, params);
  const gg = (x: number) => g.compiled!.eval(x, params);
  let lo = a;
  let hi = b;
  if (lo === undefined || hi === undefined) {
    const pts = findIntersections(ff, gg, xMin, xMax);
    if (pts.length < 2) return null;
    // cặp giao điểm liền kề có trung điểm gần gốc nhất
    let best = 0;
    let bestScore = Infinity;
    for (let i = 0; i < pts.length - 1; i++) {
      const score = Math.abs((pts[i].x + pts[i + 1].x) / 2);
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    }
    lo = pts[best].x;
    hi = pts[best + 1].x;
  }
  const area = integrate((x) => Math.abs(ff(x) - gg(x)), lo, hi, 600);
  return {a: lo, b: hi, area};
}

/** Điểm gần con trỏ nhất trên các đường hiển thị (theo khoảng cách pixel). */
export function nearestOnCurves(cfns: CompiledFn[], params: Vars, view: View, w: number, h: number, px: number, py: number, maxDist = 28) {
  const wp = toWorld(view, w, h, px, py);
  type Hit = {fn: number; x: number; y: number; dist: number; slope: number};
  let best: Hit | null = null as Hit | null;
  for (let i = 0; i < cfns.length; i++) {
    const f = cfns[i];
    if (f.kind !== 'explicit' || !f.visible || !f.compiled) continue;
    const ev = (x: number) => f.compiled!.eval(x, params);
    // quét các x lân cận con trỏ để tìm điểm gần nhất theo khoảng cách pixel
    const x0 = wp.x - (maxDist * 2) / view.sx;
    const x1 = wp.x + (maxDist * 2) / view.sx;
    for (let k = 0; k <= 60; k++) {
      const x = x0 + ((x1 - x0) * k) / 60;
      const y = ev(x);
      if (!Number.isFinite(y)) continue;
      const s = toScreen(view, w, h, x, y);
      const d = Math.hypot(s.px - px, s.py - py);
      if (d <= maxDist && (!best || d < best.dist)) best = {fn: i, x, y, dist: d, slope: derivative(ev, x)};
    }
  }
  return best;
}

export const coordLabel = (x: number, y: number) => `(${fmtNum(x, 2)} ; ${fmtNum(y, 2)})`;
