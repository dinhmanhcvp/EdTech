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

/**
 * Giữ bảng trong tầm nhìn. CH = chiều cao tờ giấy (px khung, chưa phóng); bảng kéo dài thì CH > H.
 * Chiều nào giấy nhỏ hơn khung thì căn giữa; giấy cao hơn khung (đã kéo dài) mà chưa phóng to thì cuộn dọc trong mép giấy;
 * phóng to thì cho di chuyển nhưng không kéo trượt hẳn ra ngoài.
 */
export function clampView(v: BoardView, W: number, H: number, CH = H): BoardView {
  const k = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, v.k));
  const tx = k <= 1 ? (W - W * k) / 2 : Math.max(KEEP_PX - W * k, Math.min(W - KEEP_PX, v.tx));
  const h = CH * k;
  const ty = h <= H ? (H - h) / 2 : k <= 1 ? Math.max(H - h, Math.min(0, v.ty)) : Math.max(KEEP_PX - h, Math.min(H - KEEP_PX, v.ty));
  return {k, tx, ty};
}

/** Phóng/thu về hệ số `k2` sao cho điểm (cx, cy) trong khung đứng yên dưới con trỏ. */
export function zoomAt(v: BoardView, k2: number, cx: number, cy: number, W: number, H: number, CH = H): BoardView {
  const k = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, k2));
  const r = k / v.k;
  return clampView({k, tx: cx - (cx - v.tx) * r, ty: cy - (cy - v.ty) * r}, W, H, CH);
}

export const panBy = (v: BoardView, dx: number, dy: number, W: number, H: number, CH = H): BoardView => clampView({...v, tx: v.tx + dx, ty: v.ty + dy}, W, H, CH);

/** một trang dài tối đa ngần này màn hình (dài hơn nữa thì thêm trang mới) */
export const MAX_SCREENS = 6;

/** Chiều cao bảng (đơn vị bảng, rộng 1200): đủ phủ khung theo tỉ lệ màn hình, cộng phần kéo dài thêm, và luôn chừa nửa màn trống dưới nét thấp nhất. */
export function boardHeight(wrapW: number, wrapH: number, extra: number, contentBottom: number): number {
  const screen = Math.max(675, Math.round((1200 * wrapH) / Math.max(1, wrapW)));
  const step = Math.round(screen / 2);
  const auto = contentBottom > 0 ? Math.ceil((contentBottom + step) / step) * step : 0;
  return Math.min(screen * MAX_SCREENS, Math.max(screen + extra, auto));
}

/** Điểm màn hình (trong khung) → tọa độ trước khi phóng (px của khung chưa phóng). */
export const toContent = (v: BoardView, x: number, y: number) => ({x: (x - v.tx) / v.k, y: (y - v.ty) / v.k});

/** Độ phân giải bộ đệm của canvas theo mức phóng, để nét còn sắc khi phóng to. */
export const bufferQuality = (k: number) => (k <= 1 ? 1.5 : k <= 2 ? 2.5 : 4);
