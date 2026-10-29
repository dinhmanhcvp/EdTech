/**
 * Thu phóng / di chuyển trang tài nguyên (slide, đề) trên bảng. Toán thuần, không phụ thuộc DOM:
 * điểm trên trang (px ảnh) → màn hình = (x, y) + điểm * scale.
 */
export interface View {
  /** px màn hình cho mỗi px ảnh */
  scale: number;
  x: number;
  y: number;
  /** tỉ lệ "vừa màn hình" của trang hiện tại (mốc cho giới hạn thu phóng) */
  fit: number;
}
export interface Size {
  w: number;
  h: number;
}
export interface Pt {
  x: number;
  y: number;
}

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 5;

export function fitTo(page: Size, screen: Size): View {
  const scale = Math.min(screen.w / page.w, screen.h / page.h);
  return {scale, fit: scale, x: (screen.w - page.w * scale) / 2, y: (screen.h - page.h * scale) / 2};
}

export function clampScale(view: View, scale: number): number {
  return Math.min(view.fit * MAX_ZOOM, Math.max(view.fit * MIN_ZOOM, scale));
}

/** Điểm màn hình → điểm trên trang (px ảnh). */
export function toPage(view: View, p: Pt): Pt {
  return {x: (p.x - view.x) / view.scale, y: (p.y - view.y) / view.scale};
}

/** Phóng theo hệ số quanh một điểm màn hình: điểm trang dưới ngón tay/chuột đứng yên. */
export function zoomAt(view: View, p: Pt, factor: number): View {
  const scale = clampScale(view, view.scale * factor);
  const k = scale / view.scale;
  return {...view, scale, x: p.x - (p.x - view.x) * k, y: p.y - (p.y - view.y) * k};
}

export function panBy(view: View, dx: number, dy: number): View {
  return {...view, x: view.x + dx, y: view.y + dy};
}

/** Phóng tới khung một câu (tỉ lệ 0–1 theo trang), chừa lề `margin` mỗi phía, căn giữa màn hình. */
export function focusBox(box: {x: number; y: number; w: number; h: number}, page: Size, screen: Size, margin = 0.08): View {
  const base = fitTo(page, screen);
  const bw = Math.max(1, box.w * page.w);
  const bh = Math.max(1, box.h * page.h);
  const want = Math.min((screen.w * (1 - 2 * margin)) / bw, (screen.h * (1 - 2 * margin)) / bh);
  const scale = clampScale(base, want);
  const cx = (box.x + box.w / 2) * page.w;
  const cy = (box.y + box.h / 2) * page.h;
  return {...base, scale, x: screen.w / 2 - cx * scale, y: screen.h / 2 - cy * scale};
}
