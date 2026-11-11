/** Tệp bài giảng `.socr`: JSON của BoardJournalData, kiểm tra tối thiểu khi nạp. */
import type { BoardJournalData, BoardJournalEvent } from './vectorJournal';

const EVENT_TYPES = new Set([
  'STROKE_START',
  'STROKE_MOVE',
  'STROKE_END',
  'SPAWN_SIM',
  'PARAM_CHANGE',
  'PINCH_TRANSFORM',
  'CLEAR_CANVAS',
  'ERASE_STROKE',
  'ADD_OBJECT',
  'REMOVE_SIM',
]);

export const SOCR_MAX_BYTES = 8 * 1024 * 1024;
export const SOCR_MAX_EVENTS = 200_000;

/** Loại sự kiện có toạ độ NaN/Infinity (tệp hỏng hoặc cố ý) để không làm sập canvas khi phát lại. */
function coordsFinite(e: any): boolean {
  if ('x' in e && !Number.isFinite(e.x)) return false;
  if ('y' in e && !Number.isFinite(e.y)) return false;
  if (Array.isArray(e.pts)) return e.pts.every((p: unknown) => Array.isArray(p) && p.every((v) => Number.isFinite(v)));
  return true;
}

export function serializeSocr(data: BoardJournalData): string {
  return JSON.stringify(data);
}

export function parseSocr(text: string): BoardJournalData {
  if (text.length > SOCR_MAX_BYTES) throw new Error('Tệp .socr quá lớn.');
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Tệp .socr không phải JSON hợp lệ.');
  }
  if (!parsed || !Array.isArray(parsed.events)) throw new Error('Tệp .socr thiếu danh sách sự kiện.');

  if (parsed.events.length > SOCR_MAX_EVENTS) throw new Error('Tệp .socr có quá nhiều sự kiện.');

  const events = (parsed.events as any[])
    .filter((e) => e && typeof e === 'object' && EVENT_TYPES.has(e.type) && Number.isFinite(e.t) && e.t >= 0 && coordsFinite(e))
    .sort((a, b) => a.t - b.t) as BoardJournalEvent[];
  if (events.length === 0 && parsed.events.length > 0) throw new Error('Tệp .socr không có sự kiện hợp lệ nào.');

  const h = parsed.header ?? {};
  return {
    header: {
      version: typeof h.version === 'string' ? h.version : '2.0.0',
      createdAt: Number.isFinite(h.createdAt) ? h.createdAt : Date.now(),
      durationMs: events.length ? events[events.length - 1].t : 0,
      eventCount: events.length,
      title: typeof h.title === 'string' ? h.title : undefined,
      subject: typeof h.subject === 'string' ? h.subject : undefined,
    },
    events,
  };
}
