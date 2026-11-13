/**
 * Vị trí chữ tên đỉnh trên hình dựng từ đề: mặc định đặt vào KHE TRỐNG rộng nhất giữa các nét đi qua đỉnh (không đè lên cạnh/đường tròn),
 * người dùng kéo được nhưng chỉ trong bán kính MAX_LABEL_DRIFT quanh đỉnh để vẫn biết chữ đó thuộc đỉnh nào.
 */
export type XY = {x: number; y: number};

/** khoảng cách mặc định từ đỉnh tới tâm chữ (đơn vị bảng) */
export const LABEL_R = 14;
/** chữ kéo ra xa đỉnh nhất bao nhiêu (đơn vị bảng) */
export const MAX_LABEL_DRIFT = 38;

const TAU = Math.PI * 2;

/** Hướng (radian) các nét đi qua đỉnh p: cạnh, và tiếp tuyến của đường cong đi qua p. */
function strokeAngles(p: XY, verts: XY[], edges: {a: number; b: number}[], idx: number, curves: {pts: XY[]}[]): number[] {
  const out: number[] = [];
  for (const e of edges) {
    const o = e.a === idx ? verts[e.b] : e.b === idx ? verts[e.a] : null;
    if (o && (o.x !== p.x || o.y !== p.y)) out.push(Math.atan2(o.y - p.y, o.x - p.x));
  }
  for (const c of curves) {
    const k = c.pts.findIndex((q) => Math.hypot(q.x - p.x, q.y - p.y) < 2.5);
    if (k < 0) continue;
    const a = c.pts[Math.max(0, k - 2)];
    const b = c.pts[Math.min(c.pts.length - 1, k + 2)];
    const t = Math.atan2(b.y - a.y, b.x - a.x);
    out.push(t, t + Math.PI);
  }
  return out;
}

/** Hướng đặt chữ cho đỉnh idx: phân giác của khe góc lớn nhất giữa các nét; không có nét nào thì chếch lên phải. */
export function labelAngle(verts: XY[], edges: {a: number; b: number}[], idx: number, curves: {pts: XY[]}[] = []): number {
  const p = verts[idx];
  const as = strokeAngles(p, verts, edges, idx, curves)
    .map((a) => ((a % TAU) + TAU) % TAU)
    .sort((x, y) => x - y);
  if (as.length === 0) return -Math.PI / 4;
  let best = -1;
  let mid = 0;
  for (let i = 0; i < as.length; i++) {
    const next = i + 1 < as.length ? as[i + 1] : as[0] + TAU;
    const gap = next - as[i];
    if (gap > best + 1e-9) {
      best = gap;
      mid = as[i] + gap / 2;
    }
  }
  return mid;
}

/** Độ lệch mặc định của chữ so với đỉnh. */
export function defaultLabelOffset(verts: XY[], edges: {a: number; b: number}[], idx: number, curves: {pts: XY[]}[] = []): XY {
  const a = labelAngle(verts, edges, idx, curves);
  return {x: Math.cos(a) * LABEL_R, y: Math.sin(a) * LABEL_R};
}

/** Giữ chữ trong bán kính cho phép quanh đỉnh. */
export function clampLabelOffset(o: XY, max = MAX_LABEL_DRIFT): XY {
  const d = Math.hypot(o.x, o.y);
  return d <= max || d === 0 ? o : {x: (o.x / d) * max, y: (o.y / d) * max};
}
