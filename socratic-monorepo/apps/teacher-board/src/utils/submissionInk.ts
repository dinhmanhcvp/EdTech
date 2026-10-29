/**
 * Bài làm vẽ tay của học sinh gửi qua phòng học BYOD: nén nét trước khi gửi (khớp giới hạn máy chủ), và chuyển bài nhận được thành
 * nét trên bảng giáo viên để chiếu/chấm. Thuần tính toán, không phụ thuộc React.
 * Tọa độ ở không gian bảng 1200×675 (cùng hệ với bảng giáo viên), nên bài hiện đúng vị trí và tỉ lệ.
 */
import type {Stroke} from './lassoGeometry';

export const PAD_W = 1200;
export const PAD_H = 675;
// phải khớp services/ai-engine/routers/classroom_ws.py
export const MAX_SUB_STROKES = 200;
export const MAX_SUB_POINTS = 3000;
export const MAX_SUB_STROKE_POINTS = 1500;

export type Pt = [number, number];
export interface InkStroke {
  p: Pt[];
  c: string;
  w: number;
}

export interface Submission {
  studentId: string;
  name: string;
  rev: number;
  at: number;
  strokes: InkStroke[];
}

const r1 = (v: number) => Math.round(v * 10) / 10;

/** bỏ các điểm gần nhau hơn `minDist` (giữ điểm đầu và cuối để nét không ngắn đi) */
export function decimate(p: Pt[], minDist: number): Pt[] {
  if (p.length <= 2) return p;
  const out: Pt[] = [p[0]];
  for (let i = 1; i < p.length - 1; i++) {
    const last = out[out.length - 1];
    if (Math.hypot(p[i][0] - last[0], p[i][1] - last[1]) >= minDist) out.push(p[i]);
  }
  out.push(p[p.length - 1]);
  return out;
}

export type PrepareResult = {ok: true; strokes: InkStroke[]; points: number} | {ok: false; reason: 'empty' | 'too_many_strokes' | 'too_large'};

/**
 * Chuẩn bị bài để gửi: làm tròn, bỏ nét rỗng, rút gọn điểm (tăng dần ngưỡng) cho tới khi vừa giới hạn máy chủ.
 * Bài có quá nhiều nét thì từ chối thay vì cắt bớt lặng lẽ (học sinh sẽ thấy bài mất nét).
 */
export function prepareSubmission(strokes: InkStroke[]): PrepareResult {
  const live = strokes.filter((s) => s.p.length > 0);
  if (live.length === 0) return {ok: false, reason: 'empty'};
  if (live.length > MAX_SUB_STROKES) return {ok: false, reason: 'too_many_strokes'};
  const clamp = (v: number, hi: number) => Math.min(hi, Math.max(0, v));
  const base = live.map((s) => ({...s, p: s.p.map(([x, y]) => [r1(clamp(x, PAD_W)), r1(clamp(y, PAD_H))] as Pt)}));
  for (let minDist = 1.5; minDist < 60; minDist *= 1.5) {
    const out = base.map((s) => ({...s, p: decimate(s.p, minDist)}));
    // một nét dài quá giới hạn riêng cũng phải rút gọn thêm
    const total = out.reduce((n, s) => n + s.p.length, 0);
    if (total <= MAX_SUB_POINTS && out.every((s) => s.p.length <= MAX_SUB_STROKE_POINTS)) return {ok: true, strokes: out, points: total};
  }
  return {ok: false, reason: 'too_large'};
}

/** Bài nhận được → nét trên bảng giáo viên (id duy nhất theo học sinh + lần nộp). */
export function toBoardStrokes(sub: Submission): Stroke[] {
  return sub.strokes.map((s, i) => ({
    id: `sub-${sub.studentId}-${sub.rev}-${i}`,
    points: s.p.map(([x, y]) => ({x, y})),
    color: s.c,
    width: s.w,
  }));
}

/** Nhãn ẩn danh theo thứ tự nộp: "Bài 1", "Bài 2"… */
export const anonymousLabel = (index: number) => `Bài ${index + 1}`;

/** Chuỗi điểm cho <polyline> của hình thu nhỏ trong khung w×h (giữ tỉ lệ bảng). */
export function thumbPoints(stroke: InkStroke, w: number, h: number): string {
  const sx = w / PAD_W;
  const sy = h / PAD_H;
  return stroke.p.map(([x, y]) => `${r1(x * sx)},${r1(y * sy)}`).join(' ');
}
