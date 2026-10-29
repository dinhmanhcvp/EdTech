'use client';

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {PenLine, Save, X} from 'lucide-react';
import {fitTo, toPage, type Size} from '../../utils/viewport';
import {BoardHubError, hubBoard, type BoardListItem, type BoardSubmission, type InkStroke, type PublicQuestion} from '../../utils/hubBoard';

const STATUS: Record<string, string> = {graded: 'đã chấm', teacher_confirmed: 'đã duyệt', pending_teacher: 'chờ duyệt'};
const DEFAULT_PAGE = {w: 1200, h: 1600};
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Chữa bài ngay trên bảng: ảnh bài (ẩn danh), dòng sai đầu tiên tô đỏ, thẻ giải thích, bút chữa và lưu phần chữa. */
function CorrectionView({submissionId, size, onClose}: {submissionId: string; size: Size; onClose: () => void}) {
  const [sub, setSub] = useState<BoardSubmission | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [page, setPage] = useState(DEFAULT_PAGE);
  const [strokes, setStrokes] = useState<InkStroke[]>([]);
  const [drawing, setDrawing] = useState<InkStroke | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const stage = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    hubBoard.submission(submissionId).then((s) => {
      if (!alive) return;
      setSub(s);
      setStrokes(s.correction?.strokes || []);
    }).catch((e) => alive && setNote(e instanceof BoardHubError ? e.message : 'Không mở được bài.'));
    hubBoard.submissionUrl(submissionId).then((u) => alive && setUrl(u)).catch(() => alive && setNote('Không tải được ảnh bài.'));
    return () => {
      alive = false;
    };
  }, [submissionId]);

  const view = fitTo(page, size);
  const local = (e: React.PointerEvent) => {
    const r = stage.current?.getBoundingClientRect();
    return {x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0)};
  };
  const norm = (e: React.PointerEvent): [number, number] => {
    const q = toPage(view, local(e));
    return [clamp01(q.x / page.w), clamp01(q.y / page.h)];
  };

  const first = sub?.grade?.first_error ?? null;
  const line = first !== null && sub?.lines ? sub.lines[first] : undefined;
  const step = first !== null ? sub?.grade?.steps?.find((s) => s.index === first) : undefined;

  const save = async () => {
    try {
      await hubBoard.saveCorrection(submissionId, strokes);
      setNote('Đã lưu phần chữa');
    } catch (e) {
      setNote(e instanceof BoardHubError ? e.message : 'Chưa lưu được phần chữa.');
    }
  };

  return (
    <div data-testid="correction-view" className="fixed inset-0 z-[90] flex flex-col bg-stone-900/95">
      <div className="flex items-center gap-2 p-2">
        <span className="text-sm font-semibold text-white">{sub ? `${sub.label} · chữa bài` : 'Đang mở bài…'}</span>
        <span className="flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-xs text-stone-700"><PenLine className="h-3.5 w-3.5" /> Viết để chữa</span>
        <button data-testid="save-correction" onClick={save} className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white"><Save className="h-4 w-4" /> Lưu phần chữa</button>
        {note && <span className="text-xs text-amber-200">{note}</span>}
        <button aria-label="Đóng" onClick={onClose} className="ml-auto rounded-lg bg-white/90 p-1.5"><X className="h-4 w-4" /></button>
      </div>
      <div className="relative flex min-h-0 flex-1">
        <div
          ref={stage}
          data-testid="correction-stage"
          className="relative min-h-0 flex-1 cursor-crosshair touch-none overflow-hidden"
          onPointerDown={(e) => setDrawing({p: [norm(e)], c: '#e11d48', w: 4})}
          onPointerMove={(e) => drawing && setDrawing({...drawing, p: [...drawing.p, norm(e)]})}
          onPointerUp={() => {
            if (drawing) setStrokes((s) => [...s, drawing]);
            setDrawing(null);
          }}
        >
          <div className="absolute left-0 top-0 origin-top-left" style={{width: page.w, height: page.h, transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`}}>
            {url ? (
              <img src={url} alt="Bài làm" draggable={false} className="h-full w-full select-none bg-white" onLoad={(e) => {
                const im = e.currentTarget;
                if (im.naturalWidth && im.naturalHeight) setPage({w: im.naturalWidth, h: im.naturalHeight});
              }} />
            ) : (
              <div className="h-full w-full bg-stone-200" />
            )}
            {line && line.y0 !== undefined && line.y1 !== undefined && (
              <div data-testid="first-error-band" className="pointer-events-none absolute left-0 w-full border-y-4 border-rose-500 bg-rose-500/15"
                style={{top: `${Math.round(line.y0 * 100)}%`, height: `${Math.round((line.y1 - line.y0) * 100)}%`}} />
            )}
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none">
              {[...strokes, ...(drawing ? [drawing] : [])].map((s, i) => (
                <polyline key={i} points={s.p.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={s.c} strokeWidth={s.w / 600} strokeLinecap="round" strokeLinejoin="round" />
              ))}
            </svg>
          </div>
        </div>
        {(step || sub?.confirmed) && (
          <aside data-testid="error-card" className="w-72 overflow-y-auto bg-white p-3 text-sm">
            {step ? (
              <>
                <div className="font-semibold text-rose-700">{step.title || `Bước ${(first ?? 0) + 1} sai`}</div>
                {step.explain && <p className="mt-1 text-stone-700">{step.explain}</p>}
                {step.fix && <p className="mt-2 rounded bg-emerald-50 px-2 py-1 text-emerald-800">Sửa: {step.fix}</p>}
              </>
            ) : (
              <div className="text-stone-500">Máy chưa chỉ ra bước sai.</div>
            )}
            {sub?.confirmed && (
              <ol className="mt-3 list-decimal pl-5 font-mono text-xs text-stone-700">
                {sub.confirmed.map((l, i) => <li key={i} className={i === first ? 'text-rose-700' : ''}>{l}</li>)}
              </ol>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

/** "Chọn bài để chữa" của một lượt giao: danh sách ẩn danh, lọc theo câu/trạng thái; tự mở bài giáo viên chọn trên trang quản lý. */
export function CorrectionPanel({runId, questions, size}: {runId: string; questions: PublicQuestion[]; size?: Size}) {
  const stageSize = size ?? {w: typeof window !== 'undefined' ? window.innerWidth - 288 : 1300, h: typeof window !== 'undefined' ? window.innerHeight - 56 : 900};
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [items, setItems] = useState<BoardListItem[] | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    hubBoard.submissions(runId, question || undefined, status || undefined).then(setItems).catch((e) => setError(e instanceof BoardHubError ? e.message : 'Không tải được bài nộp.'));
  }, [runId, question, status]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(
    () =>
      hubBoard.stream((e) => {
        if (e.type === 'show_submission' && e.runId === runId && typeof e.submissionId === 'string') setCurrent(e.submissionId);
        if (e.type === 'progress' && e.runId === runId) load(); // có bài mới: danh sách tự cập nhật
      }),
    [runId, load],
  );

  const label = (qid: string) => questions.find((q) => q.id === qid)?.label || qid;
  return (
    <div className="flex flex-col gap-1">
      <button data-testid="pick-toggle" onClick={() => setOpen((v) => !v)} className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-semibold text-rose-700">
        Chọn bài để chữa
      </button>
      {open && (
        <div className="flex flex-col gap-1 rounded-lg border border-stone-200 p-1.5">
          <div className="flex gap-1">
            <select data-testid="pick-question" value={question} onChange={(e) => setQuestion(e.target.value)} className="flex-1 rounded border border-stone-200 text-xs">
              <option value="">Mọi câu</option>
              {questions.map((q) => <option key={q.id} value={q.id}>{q.label}</option>)}
            </select>
            <select data-testid="pick-status" value={status} onChange={(e) => setStatus(e.target.value)} className="flex-1 rounded border border-stone-200 text-xs">
              <option value="">Mọi bài</option>
              <option value="graded">Đã chấm</option>
              <option value="pending_teacher">Chờ duyệt</option>
            </select>
          </div>
          {error && <p className="text-xs text-rose-600">{error}</p>}
          {items?.length === 0 && <p className="text-xs text-stone-500">Chưa có bài nộp.</p>}
          {items?.map((it) => (
            <button key={it.submissionId} onClick={() => setCurrent(it.submissionId)} disabled={!it.hasPhoto} className="flex items-center justify-between rounded px-2 py-1 text-left text-xs hover:bg-stone-50 disabled:opacity-50">
              <span className="font-semibold">{it.label}</span>
              <span className="text-stone-500">{label(it.questionId)} · {STATUS[it.status] || it.status}</span>
            </button>
          ))}
        </div>
      )}
      {current && <CorrectionView submissionId={current} size={stageSize} onClose={() => setCurrent(null)} />}
    </div>
  );
}
