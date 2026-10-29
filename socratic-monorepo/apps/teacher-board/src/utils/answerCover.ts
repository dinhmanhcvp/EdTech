/**
 * Che / lộ đáp án trên bảng: giáo viên chọn phần lời giải rồi "Che" (một tấm) hoặc "Che từng dòng" (mỗi dòng một tấm, lộ lần lượt
 * từng bước bằng nút "Lộ bước kế"). Tấm che là một nét đặc biệt trên bảng (`Stroke.cover`) nên được lưu, di chuyển, tẩy,
 * nhân đôi và nằm trong thư viện bài giống mọi đối tượng khác. Thuần tính toán, không phụ thuộc React.
 */
import type {Stroke} from './lassoGeometry';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const COVER_PAD = 8;
export const BOARD_W = 1200;
export const BOARD_H = 675;

export const isCover = (s: Stroke): boolean => !!s.cover;

/** hộp bao của một đối tượng trên bảng (công thức/hình dùng w,h đã lưu; nét tay dùng các điểm) */
export function strokeRect(s: Stroke): Rect | null {
  if (s.typeset) {
    const p = s.points[0];
    return p ? {x: p.x, y: p.y, w: s.typeset.w, h: s.typeset.h} : null;
  }
  if (s.points.length === 0) return null;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of s.points) {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x);
    y1 = Math.max(y1, p.y);
  }
  return {x: x0, y: y0, w: x1 - x0, h: y1 - y0};
}

const union = (a: Rect, b: Rect): Rect => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y};
};

/** nới hộp ra một chút và giữ trong khung bảng */
export function padRect(r: Rect, pad = COVER_PAD): Rect {
  const x = Math.max(0, r.x - pad);
  const y = Math.max(0, r.y - pad);
  return {x, y, w: Math.min(BOARD_W, r.x + r.w + pad) - x, h: Math.min(BOARD_H, r.y + r.h + pad) - y};
}

/** Một tấm che phủ toàn bộ vùng chọn; null nếu không còn gì để che (chỉ có tấm che hoặc trống). */
export function coverWhole(selected: Stroke[]): Rect[] {
  const rects = selected.filter((s) => !isCover(s)).map(strokeRect).filter((r): r is Rect => !!r && (r.w > 0 || r.h > 0));
  if (rects.length === 0) return [];
  return [padRect(rects.reduce(union))];
}

/**
 * Chia vùng chọn thành các dòng theo chiều dọc: hai đối tượng cùng dòng khi phần chồng nhau theo trục y
 * chiếm ≥ 40% đối tượng thấp hơn. Mỗi dòng một tấm che, xếp từ trên xuống (thứ tự lộ).
 */
export function coverLines(selected: Stroke[]): Rect[] {
  const rects = selected
    .filter((s) => !isCover(s))
    .map(strokeRect)
    .filter((r): r is Rect => !!r && (r.w > 0 || r.h > 0))
    .sort((a, b) => a.y + a.h / 2 - (b.y + b.h / 2));
  const lines: Rect[] = [];
  for (const r of rects) {
    const last = lines[lines.length - 1];
    if (last) {
      const overlap = Math.min(last.y + last.h, r.y + r.h) - Math.max(last.y, r.y);
      if (overlap >= 0.4 * Math.max(1, Math.min(last.h, r.h))) {
        lines[lines.length - 1] = union(last, r);
        continue;
      }
    }
    lines.push(r);
  }
  return lines.map((r) => padRect(r));
}

let seq = 0;
/** Tạo các nét "tấm che" (đang che), thứ tự lộ nối tiếp sau các tấm đã có trên trang. */
export function makeCovers(rects: Rect[], existing: Stroke[]): Stroke[] {
  const base = existing.reduce((m, s) => (s.cover ? Math.max(m, s.cover.order) : m), -1) + 1;
  return rects.map((r, i) => ({
    id: `cover-${Date.now().toString(36)}-${(seq++).toString(36)}`,
    points: [{x: r.x, y: r.y}],
    color: '#475569',
    width: 3,
    typeset: {latex: '', text: '', size: 20, w: r.w, h: r.h},
    cover: {hidden: true, order: base + i},
  }));
}

export const hiddenCovers = (strokes: Stroke[]): Stroke[] => strokes.filter((s) => s.cover?.hidden).sort((a, b) => a.cover!.order - b.cover!.order);
export const coverCount = (strokes: Stroke[]): number => strokes.filter(isCover).length;

/** Lộ tấm che kế tiếp theo thứ tự (không đổi gì nếu đã lộ hết). */
export function revealNext(strokes: Stroke[]): Stroke[] {
  const next = hiddenCovers(strokes)[0];
  if (!next) return strokes;
  return strokes.map((s) => (s.id === next.id ? {...s, cover: {...s.cover!, hidden: false}} : s));
}

export function setCoverHidden(strokes: Stroke[], id: string, hidden: boolean): Stroke[] {
  return strokes.map((s) => (s.id === id && s.cover ? {...s, cover: {...s.cover, hidden}} : s));
}

export function hideAllCovers(strokes: Stroke[]): Stroke[] {
  return strokes.map((s) => (s.cover && !s.cover.hidden ? {...s, cover: {...s.cover, hidden: true}} : s));
}
