import type {Shape} from './types';

/** Bộ dựng hình nhỏ cho SCENE_LAB: mọi hàm trả Shape[] hoặc Shape để draw() nối lại. */
export const C = {ink: '#44403C', grey: '#A8A29E', light: '#E7E5E4', blue: '#2563EB', red: '#E11D48', green: '#16A34A', orange: '#EA580C', purple: '#7C3AED', teal: '#0D9488', gold: '#CA8A04'};
export const rad = (deg: number) => (deg * Math.PI) / 180;
export const deg = (r: number) => (r * 180) / Math.PI;
export const f1 = (v: number, d = 1) => v.toLocaleString('vi-VN', {maximumFractionDigits: d});
export const f2 = (v: number) => f1(v, 2);
export const f3 = (v: number) => f1(v, 3);

export const txt = (x: number, y: number, s: string, o: Partial<Extract<Shape, {t: 'text'}>> = {}): Shape => ({t: 'text', x, y, s, ...o});
export const ln = (x1: number, y1: number, x2: number, y2: number, o: Partial<Extract<Shape, {t: 'line'}>> = {}): Shape => ({t: 'line', x1, y1, x2, y2, ...o});
export const arrow = (x1: number, y1: number, x2: number, y2: number, stroke = C.blue, w = 2.4): Shape => ({t: 'line', x1, y1, x2, y2, stroke, w, arrow: true});
export const dot = (cx: number, cy: number, r = 4, fill: string = C.ink): Shape => ({t: 'circle', cx, cy, r, fill});
export const ring = (cx: number, cy: number, r: number, stroke: string = C.ink, w = 1.8): Shape => ({t: 'circle', cx, cy, r, stroke, w});
export const box = (x: number, y: number, w: number, h: number, fill?: string, stroke?: string): Shape => ({t: 'rect', x, y, w, h, fill, stroke});
export const poly = (pts: [number, number][], o: Partial<Extract<Shape, {t: 'poly'}>> = {}): Shape => ({t: 'poly', pts, ...o});

/** Vẽ đồ thị y = f(x) trong khung (ox, oy là gốc trên màn hình, kx, ky là px trên đơn vị; y hướng lên). */
export function plot(f: (x: number) => number, x0: number, x1: number, ox: number, oy: number, kx: number, ky: number, stroke: string = C.blue, w = 2.2, dash?: string, clip = 1e4): Shape {
  const pts: [number, number][] = [];
  const n = 160;
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const y = f(x);
    if (Number.isFinite(y) && Math.abs(y) < clip) pts.push([ox + x * kx, oy - y * ky]);
  }
  return {t: 'poly', pts, stroke, w, close: false, dash};
}

/** Hệ trục tọa độ có lưới đơn vị. */
export function axes(ox: number, oy: number, x0: number, x1: number, y0: number, y1: number, kx: number, ky: number, grid = true): Shape[] {
  const out: Shape[] = [];
  if (grid) {
    for (let x = Math.ceil(x0); x <= x1; x++) out.push(ln(ox + x * kx, oy - y0 * ky, ox + x * kx, oy - y1 * ky, {stroke: C.light, w: 1}));
    for (let y = Math.ceil(y0); y <= y1; y++) out.push(ln(ox + x0 * kx, oy - y * ky, ox + x1 * kx, oy - y * ky, {stroke: C.light, w: 1}));
  }
  out.push(arrow(ox + x0 * kx, oy, ox + x1 * kx + 6, oy, C.ink, 1.4), arrow(ox, oy - y0 * ky, ox, oy - y1 * ky - 6, C.ink, 1.4));
  out.push(txt(ox + x1 * kx + 8, oy + 14, 'x', {size: 11, anchor: 'start'}), txt(ox + 10, oy - y1 * ky - 6, 'y', {size: 11, anchor: 'start'}));
  return out;
}

/** Ống nghiệm: thân chữ U, chất lỏng theo mức (0–1), kết tủa đáy và bọt khí tùy chọn. */
export function tube(cx: number, top: number, h: number, liquid: string, level = 0.6, precip?: string, bubbles = 0, t = 0): Shape[] {
  const w = 34;
  const x0 = cx - w / 2;
  const bottom = top + h;
  const ly = bottom - h * level;
  const out: Shape[] = [];
  out.push({t: 'path', d: `M${x0} ${ly} V${bottom - w / 2} A${w / 2} ${w / 2} 0 0 0 ${x0 + w} ${bottom - w / 2} V${ly} Z`, fill: liquid, o: 0.85});
  if (precip) out.push({t: 'path', d: `M${x0 + 3} ${bottom - 14} Q${cx} ${bottom - 30} ${x0 + w - 3} ${bottom - 14} A${w / 2 - 3} ${w / 2 - 3} 0 0 1 ${x0 + 3} ${bottom - 14} Z`, fill: precip});
  for (let i = 0; i < bubbles; i++) out.push({t: 'circle', cx: cx - 8 + ((i * 7) % 16), cy: bottom - 20 - (((t * 30 + i * 23) % (h * level - 22)) | 0), r: 2.2 + (i % 2), stroke: '#FFFFFF', w: 1.4});
  out.push({t: 'path', d: `M${x0} ${top} V${bottom - w / 2} A${w / 2} ${w / 2} 0 0 0 ${x0 + w} ${bottom - w / 2} V${top}`, stroke: C.ink, w: 2});
  return out;
}

/** Lưới nhãn tọa độ số trên trục (rút gọn). */
export const tick = (x: number, y: number, s: string, anchor: 'start' | 'middle' | 'end' = 'middle'): Shape => txt(x, y, s, {size: 10, fill: '#78716C', anchor});

/** Bộ sinh số giả ngẫu nhiên có hạt giống (cùng hạt giống cho cùng dãy). */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Số ngẫu nhiên theo phân bố chuẩn chuẩn tắc (Box–Muller). */
export function gauss(rng: () => number): number {
  return Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
}

/** Lò xo dạng zigzag giữa hai điểm. */
export function spring(x1: number, y1: number, x2: number, y2: number, coils = 8, amp = 9, stroke: string = C.ink): Shape {
  const L = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / L;
  const uy = (y2 - y1) / L;
  const pts: [number, number][] = [[x1, y1]];
  const lead = Math.min(10, L * 0.12);
  for (let i = 0; i < coils * 2; i++) {
    const s = lead + ((L - 2 * lead) * (i + 0.5)) / (coils * 2);
    const sg = i % 2 === 0 ? 1 : -1;
    pts.push([x1 + ux * s - uy * amp * sg, y1 + uy * s + ux * amp * sg]);
  }
  pts.push([x2, y2]);
  return {t: 'poly', pts, stroke, w: 1.8, close: false};
}

/** Đồ thị nhỏ y(t) tự co giãn trục, có con trỏ thời gian. Trả về hình và hàm đổi tọa độ. */
export function miniGraph(ox: number, oy: number, w: number, h: number, fn: (t: number) => number, t0: number, t1: number, color: string, label: string, cursor?: number, yFixed?: [number, number]): Shape[] {
  const ys = Array.from({length: 81}, (_, i) => fn(t0 + ((t1 - t0) * i) / 80));
  let lo = yFixed ? yFixed[0] : Math.min(...ys, 0);
  let hi = yFixed ? yFixed[1] : Math.max(...ys, 0);
  if (hi - lo < 1e-9) {
    lo -= 1;
    hi += 1;
  }
  const X = (t: number) => ox + ((t - t0) / (t1 - t0)) * w;
  const Y = (y: number) => oy + h - ((y - lo) / (hi - lo)) * h;
  const out: Shape[] = [box(ox, oy, w, h, '#FFFFFF', C.light), ln(ox, Y(0), ox + w, Y(0), {stroke: C.grey, w: 1}), txt(ox + 4, oy + 12, label, {size: 10, anchor: 'start', fill: color, bold: true})];
  out.push(poly(ys.map((y, i) => [X(t0 + ((t1 - t0) * i) / 80), Y(y)] as [number, number]), {stroke: color, w: 2, close: false}));
  if (cursor !== undefined) out.push(ln(X(cursor), oy, X(cursor), oy + h, {stroke: C.ink, dash: '3 3', w: 1}), dot(X(cursor), Y(fn(cursor)), 4, color));
  return out;
}
