import type {Shape} from './types';

/** Bộ dựng hình nhỏ cho SCENE_LAB: mọi hàm trả Shape[] hoặc Shape để draw() nối lại. */
/**
 * Bảng màu của cảnh (học từ sắc độ của kho bai-giang): mực ấm thay cho đen xám, màu đã trầm bớt để nền sáng không chói và nhiều màu đứng cạnh nhau vẫn dễ nhìn.
 * red = cam đỏ dành cho tia sáng, lực, trường (nét chính của hình); các màu còn lại là màu môn: blue (Lí), green (Địa), teal (Hóa), purple (Toán), gold (Sử), rose (Sinh).
 */
export const C = {ink: '#2B2823', grey: '#A39E93', light: '#E6E2D8', blue: '#2459C9', red: '#D9481C', green: '#2E7D32', orange: '#C2751A', purple: '#6B4BC8', teal: '#0E7C66', gold: '#B26A1A', rose: '#C2184A'};
/** Bóng tiếp xúc mềm dưới một vật đặt trên sàn: hai lớp elip chồng nhau cho mép mờ dần (không cần bộ lọc làm mờ). */
export const groundShadow = (cx: number, cy: number, rx: number, ry = rx * 0.22): Shape[] => [
  {t: 'path', d: `M${cx - rx * 1.25} ${cy} a${rx * 1.25} ${ry * 1.35} 0 1 0 ${rx * 2.5} 0 a${rx * 1.25} ${ry * 1.35} 0 1 0 ${-rx * 2.5} 0`, fill: '#1D1B16', o: 0.05},
  {t: 'path', d: `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${rx * 2} 0 a${rx} ${ry} 0 1 0 ${-rx * 2} 0`, fill: '#1D1B16', o: 0.1},
];
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

/**
 * Nhãn chú thích kiểu viên thuốc (học từ bài giảng của bai-giang): chấm màu + chữ trên nền giấy, nối bằng đường đứt nét tới chi tiết cần chỉ (vòng nhỏ ở đầu).
 * (tx, ty) = chi tiết cần chỉ; (px, py) = góc trái trên của nhãn.
 */
export function callout(tx: number, ty: number, px: number, py: number, label: string, color: string = C.blue): Shape[] {
  const w = Math.round(label.length * 6.6 + 30);
  const h = 22;
  const ex = Math.min(Math.max(tx, px), px + w);
  const ey = ty < py ? py : ty > py + h ? py + h : py + h / 2;
  return [
    {t: 'line', x1: tx, y1: ty, x2: ex, y2: ey, stroke: C.grey, w: 1, dash: '3 3'},
    {t: 'circle', cx: tx, cy: ty, r: 3.5, stroke: color, w: 1.5, fill: '#FBF9F4'},
    {t: 'rect', x: px, y: py, w, h, rx: 11, fill: '#FBF9F4', stroke: C.light, sw: 1, o: 0.96},
    {t: 'circle', cx: px + 11, cy: py + h / 2, r: 3.6, fill: color},
    {t: 'text', x: px + 21, y: py + h / 2 + 4, s: label, size: 12, anchor: 'start', fill: C.ink},
  ];
}

/** Vòng phóng to ("phóng to minh họa"): hình bên trong do người gọi vẽ trong bán kính r quanh (cx, cy); hàm thêm viền kính, vệt sáng và nhãn. */
export function lensFrame(cx: number, cy: number, r: number, label: string): {back: Shape[]; front: Shape[]} {
  return {
    back: [{t: 'circle', cx, cy, r, fill: '#FFFFFF', o: 0.78}],
    front: [
      {t: 'circle', cx, cy, r, stroke: C.ink, w: 2.2},
      {t: 'circle', cx, cy, r: r + 4, stroke: C.light, w: 3, o: 0.9},
      {t: 'path', d: `M${cx - r * 0.7} ${cy - r * 0.45} A${r * 0.85} ${r * 0.85} 0 0 1 ${cx - r * 0.15} ${cy - r * 0.82}`, stroke: '#FFFFFF', w: 3, o: 0.8},
      {t: 'text', x: cx, y: cy + r + 18, s: label, size: 12, fill: C.ink, bold: true},
    ],
  };
}

/** Bệ kính trong suốt đặt dưới vật (nét chung của các bài trong thư viện): mặt trên sáng, cạnh trước xanh nhạt, bóng mờ phía dưới. */
export const glassPlinth = (cx: number, y: number, w: number, d = 26, h = 11): Shape[] => [
  ...groundShadow(cx, y + h + d * 0.35, w * 0.42, d * 0.5),
  {t: 'poly', pts: [[cx - w / 2, y], [cx + w / 2, y], [cx + w / 2 + 16, y + d], [cx - w / 2 + 16 - 32, y + d]], fill: '#DDEBFA', stroke: '#B7CDE6', w: 1.2, close: true, o: 0.92},
  {t: 'poly', pts: [[cx - w / 2 - 16, y + d], [cx + w / 2 + 16, y + d], [cx + w / 2 + 16, y + d + h], [cx - w / 2 - 16, y + d + h]], fill: '#A9C8E8', stroke: '#8BB1D8', w: 1, close: true, o: 0.9},
  {t: 'line', x1: cx - w / 2 - 12, y1: y + d + 2.5, x2: cx + w / 2 + 12, y2: y + d + 2.5, stroke: '#FFFFFF', w: 1.4},
];
