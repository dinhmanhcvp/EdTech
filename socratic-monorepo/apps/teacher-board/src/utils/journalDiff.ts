/**
 * Chuyển thay đổi của danh sách nét (state của SmartboardCanvas) thành sự kiện vector journal.
 * Không chạm vào pointer handler: chỉ so sánh trước/sau nên ghi được mọi nguồn thay đổi
 * (viết, tẩy, lasso di chuyển, undo, xóa bảng, đổi nét thành công thức/hình).
 */
import type { Stroke } from './lassoGeometry';
import type { DraftBoardJournalEvent } from './vectorJournal';

/** Số điểm tối đa trong một sự kiện STROKE_MOVE khi trải thời gian vẽ của một nét. */
const MOVE_CHUNK = 6;

/** Công thức chuẩn và hình tại chỗ là đối tượng neo một điểm, không phải nét mực. */
const isObject = (s: Stroke) => !!(s.typeset || s.shape);

const same = (a: Stroke, b: Stroke) =>
  a.typeset === b.typeset &&
  a.shape === b.shape &&
  (a.points === b.points ||
    (a.points.length === b.points.length && a.points.every((p, i) => p.x === b.points[i].x && p.y === b.points[i].y)));

/**
 * @param startedAt/endedAt khoảng thời gian (ms tương đối bản ghi) người dùng vẽ nét mới; các điểm được trải đều trong đó.
 */
export function diffStrokesToEvents(
  prev: Stroke[],
  next: Stroke[],
  startedAt: number,
  endedAt: number,
): DraftBoardJournalEvent[] {
  if (prev.length > 0 && next.length === 0) return [{ type: 'CLEAR_CANVAS', t: endedAt }];

  const prevById = new Map(prev.map((s) => [s.id, s]));
  const nextIds = new Set(next.map((s) => s.id));
  const out: DraftBoardJournalEvent[] = [];

  for (const s of prev) {
    if (!nextIds.has(s.id)) out.push({ type: 'ERASE_STROKE', strokeId: s.id, t: endedAt });
  }

  next.forEach((s, idx) => {
    const old = prevById.get(s.id);
    if (old && same(old, s)) return;
    if (old) out.push({ type: 'ERASE_STROKE', strokeId: s.id, t: endedAt });
    if (s.points.length === 0) return;

    if (isObject(s)) {
      out.push({
        type: 'ADD_OBJECT',
        strokeId: s.id,
        x: s.points[0].x,
        y: s.points[0].y,
        color: s.color,
        width: s.width,
        typeset: s.typeset,
        shape: s.shape,
        t: endedAt,
      });
      return;
    }

    // nét mới trải theo thời gian vẽ; nét bị sửa (di chuyển) hiện tức thì
    const begin = old ? endedAt : Math.min(startedAt, endedAt);
    const [first, ...rest] = s.points;
    const pid = 1000 + idx;
    out.push({
      type: 'STROKE_START',
      pointerId: pid,
      x: first.x,
      y: first.y,
      pressure: first.p ?? 0.5,
      color: s.color,
      width: s.width,
      strokeId: s.id,
      t: begin,
    });
    const chunks = Math.ceil(rest.length / MOVE_CHUNK);
    for (let c = 0; c < chunks; c++) {
      const pts = rest
        .slice(c * MOVE_CHUNK, (c + 1) * MOVE_CHUNK)
        .map((p) => [p.x, p.y, p.p ?? 0.5] as [number, number, number]);
      const t = begin + ((endedAt - begin) * (c + 1)) / (chunks + 1);
      out.push({ type: 'STROKE_MOVE', pointerId: pid, pts, t });
    }
    out.push({ type: 'STROKE_END', pointerId: pid, strokeId: s.id, t: endedAt });
  });

  return out;
}

/** Sự kiện mô phỏng khi blueprint đang hiển thị đổi (mở mới, thay bằng cái khác, hoặc đóng). */
export function diffSimEvents(
  prevId: string | null,
  next: { id: string; template: string; x: number; y: number } | null,
  t: number,
): DraftBoardJournalEvent[] {
  if (prevId === (next?.id ?? null)) return [];
  const out: DraftBoardJournalEvent[] = [];
  if (prevId) out.push({ type: 'REMOVE_SIM', id: prevId, t });
  if (next) out.push({ type: 'SPAWN_SIM', id: next.id, template: next.template, x: next.x, y: next.y, scale: 1, t });
  return out;
}
