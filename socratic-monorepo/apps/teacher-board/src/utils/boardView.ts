// apps/teacher-board/src/utils/boardView.ts
/** Phép nhìn (thu phóng + di chuyển) của bảng. tx, ty tính bằng px màn hình của khung bảng; k là hệ số phóng. */
export interface BoardView {
  k: number;
  tx: number;
  ty: number;
}

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 5;
export const FIT_VIEW: BoardView = {k: 1, tx: 0, ty: 0};
const KEEP_PX = 80; // luôn chừa lại ít nhất ngần này px của tờ giấy trong khung

/** Giữ bảng trong tầm nhìn: k ≤ 1 thì căn giữa; k > 1 thì cho di chuyển nhưng không kéo trượt hẳn ra ngoài. */
export function clampView(v: BoardView, W: number, H: number): BoardView {
  const k = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, v.k));
  if (k <= 1) return {k, tx: (W - W * k) / 2, ty: (H - H * k) / 2};
  return {
    k,
    tx: Math.max(KEEP_PX - W * k, Math.min(W - KEEP_PX, v.tx)),
    ty: Math.max(KEEP_PX - H * k, Math.min(H - KEEP_PX, v.ty)),
  };
}

/** Phóng/thu về hệ số `k2` sao cho điểm (cx, cy) trong khung đứng yên dưới con trỏ. */
export function zoomAt(v: BoardView, k2: number, cx: number, cy: number, W: number, H: number): BoardView {
  const k = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, k2));
  const r = k / v.k;
  return clampView({k, tx: cx - (cx - v.tx) * r, ty: cy - (cy - v.ty) * r}, W, H);
}

export const panBy = (v: BoardView, dx: number, dy: number, W: number, H: number): BoardView => clampView({...v, tx: v.tx + dx, ty: v.ty + dy}, W, H);

/** Điểm màn hình (trong khung) → tọa độ trước khi phóng (px của khung chưa phóng). */
export const toContent = (v: BoardView, x: number, y: number) => ({x: (x - v.tx) / v.k, y: (y - v.ty) / v.k});

/** Độ phân giải bộ đệm của canvas theo mức phóng, để nét còn sắc khi phóng to. */
export const bufferQuality = (k: number) => (k <= 1 ? 1.5 : k <= 2 ? 2.5 : 4);
