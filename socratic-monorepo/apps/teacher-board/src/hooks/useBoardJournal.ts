import { useCallback, useEffect, useRef, useState } from 'react';
import type { Stroke } from '../utils/lassoGeometry';
import { diffSimEvents, diffStrokesToEvents } from '../utils/journalDiff';
import { VectorJournalRecorder, type BoardJournalData } from '../utils/vectorJournal';

/** Mô phỏng đang hiện: `key` là đối tượng blueprint (đổi tham chiếu = mô phỏng mới). */
export interface JournalSim {
  key: object;
  template: string;
  x: number;
  y: number;
}

/**
 * Tự ghi nhật ký vector của bảng: theo dõi `strokes`, `isDrawing` (đang có nét dở) và mô phỏng đang hiện,
 * không cần sửa pointer handler. Bản ghi sống trong bộ nhớ trang; `snapshot()` lấy ra khi cần tua lại hoặc lưu.
 * Chưa ghi PARAM_CHANGE/PINCH_TRANSFORM: chúng nằm trong state riêng của từng engine.
 */
export function useBoardJournal(strokes: Stroke[], isDrawing: boolean, sim: JournalSim | null = null) {
  const recorderRef = useRef<VectorJournalRecorder | null>(null);
  if (!recorderRef.current) {
    recorderRef.current = new VectorJournalRecorder();
    recorderRef.current.start();
  }
  const prevRef = useRef<Stroke[]>(strokes);
  const drawStartRef = useRef<number | null>(null);
  const simRef = useRef<{ key: object; id: string } | null>(null);
  const simCounter = useRef(0);
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    if (isDrawing && drawStartRef.current === null) {
      drawStartRef.current = recorderRef.current!.getElapsedTime();
    }
  }, [isDrawing]);

  useEffect(() => {
    const rec = recorderRef.current!;
    if (prevRef.current === strokes) return;
    const now = rec.getElapsedTime();
    const started = drawStartRef.current ?? now;
    const events = diffStrokesToEvents(prevRef.current, strokes, started, now);
    prevRef.current = strokes;
    drawStartRef.current = null;
    if (events.length === 0) return;
    for (const ev of events) rec.recordEvent(ev);
    setEventCount(rec.getEvents().length);
  }, [strokes]);

  const simKey = sim?.key ?? null;
  useEffect(() => {
    const rec = recorderRef.current!;
    const cur = simRef.current;
    if ((cur?.key ?? null) === simKey) return;
    const next = sim ? { key: sim.key, id: `sim-${++simCounter.current}` } : null;
    const events = diffSimEvents(
      cur?.id ?? null,
      next && sim ? { id: next.id, template: sim.template, x: sim.x, y: sim.y } : null,
      rec.getElapsedTime(),
    );
    simRef.current = next;
    for (const ev of events) rec.recordEvent(ev);
    if (events.length) setEventCount(rec.getEvents().length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simKey]);

  const snapshot = useCallback((): BoardJournalData => {
    const data = recorderRef.current!.exportJournal();
    // nét dài được ghi lùi về lúc bắt đầu vẽ nên sắp lại theo thời gian trước khi phát
    data.events.sort((a, b) => a.t - b.t);
    data.header.durationMs = data.events.length ? data.events[data.events.length - 1].t : 0;
    return data;
  }, []);

  return { snapshot, eventCount };
}
