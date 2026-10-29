'use client';

import React, {useCallback, useEffect, useRef, useState} from 'react';
import QRCode from 'qrcode';
import {ChevronLeft, ChevronRight, LayoutPanelTop, Maximize2, Minus, PenLine, Plus, QrCode, X} from 'lucide-react';
import {fitTo, focusBox, panBy, toPage, zoomAt, type Size, type View} from '../../utils/viewport';
import {BoardHubError, hubBoard, type InkStroke, type Progress, type ResourceDetail, type RunInfo} from '../../utils/hubBoard';
import type {PageRef} from '../../utils/boardImage';
import {CorrectionPanel} from './CorrectionPanel';

interface Props {
  resourceId: string;
  onClose: () => void;
  /** "Đưa trang này lên bảng": ảnh trang + nét viết đè (tọa độ 0–1 theo trang) */
  onInsertPage: (ref: PageRef, ink: InkStroke[]) => void;
  /** kích thước vùng xem (mặc định: cửa sổ) — truyền khi kiểm thử */
  size?: Size;
}

const PEN_COLOR = '#e11d48';
const SAVE_DELAY_MS = 1000;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Trình xem tài nguyên toàn màn hình trên bảng: slide, bài tập, đề. */
export function ResourceViewer({resourceId, onClose, onInsertPage, size}: Props) {
  const stageSize = size ?? {w: typeof window !== 'undefined' ? window.innerWidth : 1600, h: typeof window !== 'undefined' ? window.innerHeight - 56 : 900};
  const [res, setRes] = useState<ResourceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageIdx, setPageIdx] = useState(0);
  const [view, setView] = useState<View | null>(null);
  const [urls, setUrls] = useState<Record<number, string>>({});
  const [ink, setInk] = useState<Record<number, InkStroke[]>>({});
  const [pen, setPen] = useState(false);
  const [drawing, setDrawing] = useState<InkStroke | null>(null);
  const [run, setRun] = useState<RunInfo | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const pointers = useRef(new Map<number, {x: number; y: number}>());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef(new Map<number, InkStroke[]>()); // nét chưa gửi, theo trang
  const [handingOut, setHandingOut] = useState(false);
  const stage = useRef<HTMLDivElement | null>(null);

  const page = res?.pages[pageIdx];
  const pageSize = page ? {w: page.width, h: page.height} : null;

  useEffect(() => {
    let alive = true;
    hubBoard.resource(resourceId)
      .then((r) => alive && setRes(r))
      .catch((e) => alive && setError(e instanceof BoardHubError ? e.message : 'Không mở được tài nguyên.'));
    hubBoard.open(resourceId).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [resourceId]);

  const loadPage = useCallback(
    (n: number) => {
      setUrls((u) => {
        const rest = {...u};
        delete rest[n];
        return rest;
      });
      hubBoard.pageUrl(resourceId, n).then((u) => setUrls((m) => ({...m, [n]: u}))).catch(() => setUrls((m) => ({...m, [n]: 'error'})));
    },
    [resourceId],
  );

  useEffect(() => {
    if (!res || !page) return;
    setView(fitTo({w: page.width, h: page.height}, stageSize));
    if (!(pageIdx in urls)) loadPage(pageIdx);
    if (!(pageIdx in ink)) {
      // tải lỗi thì không coi là trang trống: lưu đè sẽ xóa nét đã có, nên khóa bút trên trang đó
      hubBoard.getInk(resourceId, pageIdx).then((s) => setInk((m) => ({...m, [pageIdx]: s})))
        .catch(() => setSaveNote('Chưa tải được nét viết của trang này nên tạm khóa bút. Mở lại trình xem để thử lại.'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res, pageIdx]);

  const go = useCallback((d: number) => res && setPageIdx((i) => Math.min(res.pages.length - 1, Math.max(0, i + d))), [res]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') go(1);
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(-1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  // tiến độ nộp bài của lượt đang giao
  useEffect(() => {
    if (!run) return;
    const load = () => hubBoard.progress(run.runId).then(setProgress).catch(() => undefined);
    void load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [run]);

  const flush = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    for (const [n, strokes] of pending.current) {
      hubBoard.putInk(resourceId, n, strokes).then(() => setSaveNote(null)).catch(() => setSaveNote('Chưa lưu được nét viết, sẽ thử lại lần sau.'));
    }
    pending.current.clear();
  }, [resourceId]);
  const scheduleSave = (n: number, strokes: InkStroke[]) => {
    pending.current.set(n, strokes);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, SAVE_DELAY_MS);
  };
  // rời trang, đóng trình xem hay đưa trang lên bảng: gửi ngay, không chờ hết 1 giây
  useEffect(() => flush, [pageIdx, flush]);

  const local = (e: React.PointerEvent | React.WheelEvent) => {
    const r = stage.current?.getBoundingClientRect();
    return {x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0)};
  };
  const pagePoint = (p: {x: number; y: number}): [number, number] => {
    const q = toPage(view!, p);
    return [clamp01(q.x / pageSize!.w), clamp01(q.y / pageSize!.h)];
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!view || !pageSize) return;
    try {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch {
      /* jsdom / trình duyệt cũ */
    }
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    if (pen && pageIdx in ink && pointers.current.size === 1) setDrawing({p: [pagePoint(p)], c: PEN_COLOR, w: 3});
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!view || !pageSize || !pointers.current.has(e.pointerId)) return;
    const p = local(e);
    const prev = pointers.current.get(e.pointerId)!;
    if (pen && drawing && pointers.current.size === 1) {
      setDrawing({...drawing, p: [...drawing.p, pagePoint(p)]});
    } else if (pointers.current.size === 1) {
      setView(panBy(view, p.x - prev.x, p.y - prev.y));
    } else if (pointers.current.size === 2) {
      const other = [...pointers.current.entries()].find(([id]) => id !== e.pointerId)![1];
      const before = Math.hypot(prev.x - other.x, prev.y - other.y) || 1;
      const after = Math.hypot(p.x - other.x, p.y - other.y) || 1;
      setView(zoomAt(view, {x: (p.x + other.x) / 2, y: (p.y + other.y) / 2}, after / before));
    }
    pointers.current.set(e.pointerId, p);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (drawing) {
      const next = [...(ink[pageIdx] || []), drawing];
      setInk((m) => ({...m, [pageIdx]: next}));
      setDrawing(null);
      scheduleSave(pageIdx, next);
    }
  };
  const onWheel = (e: React.WheelEvent) => {
    if (!view) return;
    setView(zoomAt(view, local(e), Math.exp(-e.deltaY * 0.0015)));
  };

  const focus = (q: NonNullable<ResourceDetail['body']>['questions'][number]) => {
    if (!res) return;
    const n = q.page ?? pageIdx;
    const pg = res.pages[n];
    if (!pg) return;
    setPageIdx(n);
    if (q.box && q.box.length === 4) {
      const [x, y, w, h] = q.box;
      const target = focusBox({x, y, w, h}, {w: pg.width, h: pg.height}, stageSize);
      setView(target);
      // câu ở trang khác: hiệu ứng đổi trang đặt lại "vừa màn hình" sau lần vẽ này, nên đặt lại khung câu một lần nữa
      if (n !== pageIdx) setTimeout(() => setView(target), 0);
    }
  };

  const handout = async () => {
    if (handingOut) return;
    setHandingOut(true);
    setError(null);
    try {
      const r = await hubBoard.openRun(resourceId);
      setRun(r);
      setQr(await QRCode.toDataURL(r.url, {margin: 1, width: 360}));
      if (r.classHasStudents === false) setError('Lớp chưa có học sinh: thêm ở mục Học sinh trên trang quản lý.');
    } catch (e) {
      setError(e instanceof BoardHubError ? e.message : 'Không giao bài được.');
    } finally {
      setHandingOut(false);
    }
  };

  const closeRun = async () => {
    if (!run) return;
    try {
      await hubBoard.closeRun(run.runId);
      setQr(null);
    } catch (e) {
      setError(e instanceof BoardHubError ? e.message : 'Không đóng nhận bài được.');
    }
  };

  const questions = res?.body?.questions || [];
  const progressOf = (qid: string) => progress?.questions.find((q) => q.questionId === qid);
  const btn = 'flex items-center gap-1 rounded-lg bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-stone-700 shadow hover:bg-white disabled:opacity-40';
  const strokesHere = [...(ink[pageIdx] || []), ...(drawing ? [drawing] : [])];

  return (
    <div data-testid="resource-viewer" className="fixed inset-0 z-[80] flex flex-col bg-stone-900/95">
      <div className="flex flex-wrap items-center gap-2 p-2">
        <span className="mr-2 truncate text-sm font-semibold text-white">{res?.title || 'Đang mở…'}</span>
        <button className={btn} aria-label="Trang trước" onClick={() => go(-1)} disabled={!res || pageIdx === 0}><ChevronLeft className="h-4 w-4" /></button>
        <span className="text-xs text-white">{res ? `Trang ${pageIdx + 1}/${res.pages.length}` : ''}</span>
        <button data-testid="viewer-next" className={btn} aria-label="Trang sau" onClick={() => go(1)} disabled={!res || pageIdx >= res.pages.length - 1}><ChevronRight className="h-4 w-4" /></button>
        <button className={btn} aria-label="Thu nhỏ" onClick={() => view && setView(zoomAt(view, {x: stageSize.w / 2, y: stageSize.h / 2}, 1 / 1.25))}><Minus className="h-4 w-4" /></button>
        <button className={btn} aria-label="Phóng to" onClick={() => view && setView(zoomAt(view, {x: stageSize.w / 2, y: stageSize.h / 2}, 1.25))}><Plus className="h-4 w-4" /></button>
        <button className={btn} aria-label="Vừa màn hình" onClick={() => pageSize && setView(fitTo(pageSize, stageSize))}><Maximize2 className="h-4 w-4" /></button>
        <button data-testid="viewer-pen" className={`${btn} ${pen ? 'ring-2 ring-rose-500' : ''}`} aria-pressed={pen} onClick={() => setPen((v) => !v)}><PenLine className="h-4 w-4" /> Bút</button>
        <button data-testid="viewer-insert" className={btn} disabled={!page} onClick={() => page && onInsertPage({assignmentId: resourceId, page: page.page, width: page.width, height: page.height}, ink[pageIdx] || [])}>
          <LayoutPanelTop className="h-4 w-4" /> Đưa trang này lên bảng
        </button>
        {res && res.kind !== 'slides' && (
          <button data-testid="viewer-handout" className={`${btn} bg-blue-600 text-white hover:bg-blue-700`} onClick={handout} disabled={handingOut}><QrCode className="h-4 w-4" /> Giao bài</button>
        )}
        <button className={`${btn} ml-auto`} aria-label="Đóng" onClick={onClose}><X className="h-4 w-4" /></button>
      </div>
      {(error || saveNote) && <div className="mx-2 rounded-lg bg-amber-100 px-3 py-1.5 text-xs text-amber-900">{error || saveNote}</div>}
      <div className="relative flex min-h-0 flex-1">
        <div
          ref={stage}
          data-testid="viewer-stage"
          className={`relative min-h-0 flex-1 overflow-hidden touch-none ${pen ? 'cursor-crosshair' : 'cursor-grab'}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          onDoubleClick={() => pageSize && setView(fitTo(pageSize, stageSize))}
        >
          {view && pageSize && (
            <div data-testid="viewer-layer" className="absolute left-0 top-0 origin-top-left" style={{width: pageSize.w, height: pageSize.h, transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`}}>
              {urls[pageIdx] && urls[pageIdx] !== 'error' ? (
                <img src={urls[pageIdx]} alt={`Trang ${pageIdx + 1}`} draggable={false} className="h-full w-full select-none bg-white" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-stone-200 text-2xl text-stone-500">
                  {urls[pageIdx] === 'error' ? (
                    <>
                      Không tải được trang {pageIdx + 1}
                      <button data-testid="viewer-retry" onClick={() => loadPage(pageIdx)} className="rounded-lg bg-white px-4 py-2 text-xl">Thử lại</button>
                    </>
                  ) : (
                    'Đang tải…'
                  )}
                </div>
              )}
              <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none">
                {strokesHere.map((s, i) => (
                  <polyline key={i} points={s.p.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={s.c} strokeWidth={s.w / 600} strokeLinecap="round" strokeLinejoin="round" />
                ))}
              </svg>
            </div>
          )}
        </div>
        {(questions.length > 0 || run) && (
          <aside className="flex w-64 flex-col gap-2 overflow-y-auto bg-white/95 p-2">
            {qr && run && (
              <div data-testid="handout-qr" className="flex flex-col items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 p-2">
                <img src={qr} alt="QR giao bài" className="h-48 w-48" />
                <span className="font-mono text-lg font-bold tracking-widest">{run.code}</span>
                <span className="text-center text-[11px] text-stone-600">Quét bằng app học sinh, hoặc vào {run.url}</span>
                <button onClick={closeRun} className="rounded-lg border border-stone-300 px-2 py-1 text-xs">Đóng nhận bài</button>
              </div>
            )}
            {questions.map((q) => {
              const pr = progressOf(q.id);
              return (
                <button key={q.id} onClick={() => focus(q)} className="rounded-lg border border-stone-200 px-2 py-1.5 text-left text-xs hover:bg-stone-50">
                  <span className="block font-semibold text-stone-800">{q.label}</span>
                  {pr && <span className="text-[11px] text-stone-500">{`${pr.submitted} bài · đúng ${pr.correctRate === null ? '—' : Math.round(pr.correctRate * 100)}%`}</span>}
                </button>
              );
            })}
            {run && <CorrectionPanel runId={run.runId} questions={questions} />}
          </aside>
        )}
      </div>
      {res && res.pages.length > 1 && (
        <div className="flex gap-1 overflow-x-auto p-2">
          {res.pages.map((p) => (
            <button key={p.page} aria-label={`Tới trang ${p.page + 1}`} aria-current={p.page === pageIdx} onClick={() => setPageIdx(p.page)} className="h-10 min-w-8 rounded bg-white/20 px-2 text-xs text-white aria-[current=true]:bg-white aria-[current=true]:text-stone-900">
              {p.page + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
