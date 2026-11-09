/**
 * Tẩy của bảng: bốn kiểu × bốn cỡ.
 *  - round: tẩy tròn, cắt đúng phần nét nằm trong vòng (nét còn lại giữ nguyên, tách thành nét mới)
 *  - wipe:  khăn lau bảng, hình chữ nhật rộng, kéo qua là lau sạch một dải
 *  - stroke: chạm vào nét nào xóa cả nét đó
 *  - area:  kéo một khung chữ nhật, xóa mọi thứ trong khung
 * Hàm thuần (không đụng React) để kiểm thử được.
 */
import type {Point, Stroke} from './lassoGeometry';

export type EraserKind = 'round' | 'wipe' | 'stroke' | 'area';

export const ERASER_KINDS: {id: EraserKind; label: string; hint: string}[] = [
  {id: 'round', label: 'Tròn', hint: 'Tẩy phần nét nằm trong vòng tròn'},
  {id: 'wipe', label: 'Lau bảng', hint: 'Khăn lau bản rộng: kéo qua là sạch một dải'},
  {id: 'stroke', label: 'Theo nét', hint: 'Chạm vào nét nào xóa cả nét đó'},
  {id: 'area', label: 'Kéo vùng', hint: 'Kéo khung chữ nhật, xóa mọi thứ trong khung'},
];

/** bán kính (đơn vị canvas) */
export const ERASER_SIZES: {label: string; r: number}[] = [
  {label: 'Nhỏ', r: 8},
  {label: 'Vừa', r: 14},
  {label: 'Lớn', r: 28},
  {label: 'Rất lớn', r: 52},
];

export type EraseZone = {x0: number; y0: number; x1: number; y1: number} | {x: number; y: number; r: number};

const isRect = (z: EraseZone): z is Extract<EraseZone, {x0: number}> => 'x0' in z;

/** Vùng tẩy tại điểm `pt` cho kiểu `kind` (area do người dùng kéo nên không dùng hàm này). */
export const zoneAt = (kind: EraserKind, pt: Point, r: number): EraseZone =>
  kind === 'wipe' ? {x0: pt.x - r * 2.4, y0: pt.y - r, x1: pt.x + r * 2.4, y1: pt.y + r} : {x: pt.x, y: pt.y, r};

export const rectOf = (a: Point, b: Point): EraseZone => ({x0: Math.min(a.x, b.x), y0: Math.min(a.y, b.y), x1: Math.max(a.x, b.x), y1: Math.max(a.y, b.y)});

const inZone = (p: Point, z: EraseZone) => (isRect(z) ? p.x >= z.x0 && p.x <= z.x1 && p.y >= z.y0 && p.y <= z.y1 : Math.hypot(p.x - z.x, p.y - z.y) < z.r);

const bounds = (z: EraseZone) => (isRect(z) ? z : {x0: z.x - z.r, y0: z.y - z.r, x1: z.x + z.r, y1: z.y + z.r});

/** Khối công thức/hình chuẩn (khung neo ở points[0], rộng w, cao h) có chạm vùng tẩy không. Trang ảnh tài nguyên không bao giờ bị tẩy. */
const blockHit = (s: Stroke, z: EraseZone): boolean => {
  const t = s.typeset;
  if (!t || s.image) return false;
  const a = s.points[0];
  const b = bounds(z);
  return a.x <= b.x1 && a.x + t.w >= b.x0 && a.y <= b.y1 && a.y + t.h >= b.y0;
};

/** Thêm điểm giữa các điểm cách xa để khi bút lướt nhanh không "nhảy qua" vùng tẩy. */
const densify = (pts: Point[], step = 5): Point[] => {
  const out: Point[] = [];
  pts.forEach((b, i) => {
    if (i > 0) {
      const a = pts[i - 1];
      const n = Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / step);
      for (let k = 1; k <= n; k++) out.push({x: a.x + ((b.x - a.x) * k) / (n + 1), y: a.y + ((b.y - a.y) * k) / (n + 1)});
    }
    out.push(b);
  });
  return out;
};

/**
 * Tẩy mọi thứ trong vùng `z`. `whole` = true: nét nào chạm vùng bị xóa cả nét. Không có gì đổi thì trả đúng mảng cũ (để React khỏi vẽ lại).
 * Khối công thức/hình chuẩn bị xóa cả khối khi chạm.
 */
export function eraseInZone(strokes: Stroke[], z: EraseZone, whole: boolean): Stroke[] {
  const b = bounds(z);
  const pad = 12;
  let changed = false;
  const next: Stroke[] = [];
  for (const s of strokes) {
    if (s.image) {
      next.push(s);
      continue;
    }
    if (s.typeset) {
      if (blockHit(s, z)) changed = true;
      else next.push(s);
      continue;
    }
    const xs = s.points.map((p) => p.x);
    const ys = s.points.map((p) => p.y);
    // khung bao của nét (đoạn thẳng chỉ có hai đầu vẫn được xét)
    if (Math.min(...xs) > b.x1 + pad || Math.max(...xs) < b.x0 - pad || Math.min(...ys) > b.y1 + pad || Math.max(...ys) < b.y0 - pad) {
      next.push(s);
      continue;
    }
    const dense = densify(s.points);
    if (!dense.some((p) => inZone(p, z))) {
      next.push(s);
      continue;
    }
    changed = true;
    if (whole) continue;
    const pieces: Point[][] = [];
    let cur: Point[] = [];
    for (const p of dense) {
      if (inZone(p, z)) {
        if (cur.length > 1) pieces.push(cur);
        cur = [];
      } else cur.push(p);
    }
    if (cur.length > 1) pieces.push(cur);
    pieces.forEach((pts, k) => next.push({...s, id: `${s.id}~${k}-${Math.random().toString(36).slice(2, 6)}`, points: pts}));
  }
  return changed ? next : strokes;
}
