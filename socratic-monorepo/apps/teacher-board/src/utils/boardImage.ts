/**
 * Đưa một trang tài nguyên (slide/đề) lên bảng: đối tượng ảnh (Stroke.image, kích thước ở typeset.w/h như công thức nên
 * chọn/di chuyển/tẩy được) + nét viết đè của giáo viên đổi sang tọa độ bảng 1200×675 thành nét thường.
 */
import type {Stroke} from './lassoGeometry';

export const BOARD_W = 1200;
export const BOARD_H = 675;
const FILL = 0.94;

export interface PageRef {
  assignmentId: string;
  page: number;
  width: number;
  height: number;
}
export interface PageInk {
  p: [number, number][] | number[][];
  c: string;
  w: number;
}

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export function imageStroke(ref: PageRef): Stroke {
  const k = Math.min((BOARD_W * FILL) / ref.width, (BOARD_H * FILL) / ref.height);
  const w = ref.width * k;
  const h = ref.height * k;
  return {
    id: nextId('img'),
    points: [{x: (BOARD_W - w) / 2, y: (BOARD_H - h) / 2}],
    color: '#000000',
    width: 1,
    typeset: {latex: '', text: '', size: 20, w, h},
    image: {assignmentId: ref.assignmentId, page: ref.page},
  };
}

/** Nét 0–1 theo trang → nét bảng trong khung của đối tượng ảnh. */
export function annotationsToBoard(ink: PageInk[], image: Stroke): Stroke[] {
  const o = image.points[0];
  const t = image.typeset!;
  return ink.map((s) => ({
    id: nextId('ink'),
    points: s.p.map(([x, y]) => ({x: o.x + x * t.w, y: o.y + y * t.h})),
    color: s.c,
    width: s.w,
  }));
}

export function insertPageStrokes(ref: PageRef, ink: PageInk[]): Stroke[] {
  const img = imageStroke(ref);
  return [img, ...annotationsToBoard(ink, img)];
}

/** Tẩy điểm chạm vào khối công thức thì xóa cả khối; trang ảnh phủ gần hết bảng nên tẩy không bao giờ xóa nó (xóa bằng nút × hoặc chọn). */
export function eraserHitsBlock(stroke: Stroke, pt: {x: number; y: number}, r: number): boolean {
  const t = stroke.typeset;
  if (!t || stroke.image) return false;
  const a = stroke.points[0];
  return pt.x >= a.x - r && pt.x <= a.x + t.w + r && pt.y >= a.y - r && pt.y <= a.y + t.h + r;
}
