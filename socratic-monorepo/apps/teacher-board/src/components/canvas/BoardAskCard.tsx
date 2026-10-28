'use client';

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Mic, MicOff, Play, RotateCw, Send, Sparkles, X} from 'lucide-react';
import {MathView} from '../common/MathView';
import {MathText} from '../ui/MathText';
import {answerDigest, askBoard, BoardQaError, type BoardQaResponse, type BoardQaTurn} from '../../utils/boardQa';
import {suggestQuestions, summarizeContext, type BoardContext} from '../../utils/boardContext';

interface Turn {
  id: number;
  q: string;
  /** những gì AI đã đọc trên bảng lúc hỏi */
  read: string[];
  status: 'loading' | 'done' | 'error';
  res?: BoardQaResponse;
  error?: string;
}

export interface BoardAskCardProps {
  isOpen: boolean;
  /** câu hỏi sẵn (từ giọng nói); tự gửi khi `autoAskNonce` đổi */
  initialQuery?: string;
  autoAskNonce?: number;
  isListening?: boolean;
  onStartVoice?: () => void;
  onClose: () => void;
  /** lấy ảnh chụp trạng thái bảng NGAY LÚC HỎI (không dùng bản cũ) */
  getContext: () => BoardContext;
  subject?: string | null;
  /** hành động "mở mô phỏng" do AI đề xuất: chuyển cho bộ định tuyến của bảng */
  onVisualize: (text: string) => void;
  /** chỉ dùng cho kiểm thử */
  askFn?: typeof askBoard;
}

const SOURCE_LABEL = (r: BoardQaResponse) =>
  r.source === 'offline' ? 'Chưa gọi được AI · chỉ đọc số đo trên bảng' : `${r.source === 'gemini' ? 'Gemini' : 'OpenRouter'}${r.model ? ` · ${r.model}` : ''}`;

export const BoardAskCard: React.FC<BoardAskCardProps> = ({isOpen, initialQuery = '', autoAskNonce = 0, isListening = false, onStartVoice, onClose, getContext, subject, onVisualize, askFn = askBoard}) => {
  const [query, setQuery] = useState(initialQuery);
  const [turns, setTurns] = useState<Turn[]>([]);
  const nextId = useRef(1);
  const abort = useRef<AbortController | null>(null);
  const lastAuto = useRef(autoAskNonce);
  const endRef = useRef<HTMLDivElement | null>(null);

  // Gợi ý và nhãn "đã đọc" lấy từ bảng lúc mở thẻ, để giáo viên thấy AI sẽ dựa vào đâu.
  const openCtx = useMemo(() => (isOpen ? getContext() : null), [isOpen, getContext, turns.length === 0]); // eslint-disable-line react-hooks/exhaustive-deps
  const chips = useMemo(() => (openCtx ? summarizeContext(openCtx) : []), [openCtx]);
  const suggestions = useMemo(() => (openCtx ? suggestQuestions(openCtx) : []), [openCtx]);

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q) return;
    setQuery('');
    const ctx = getContext();
    const id = nextId.current++;
    const history: BoardQaTurn[] = turns.filter((t) => t.status === 'done' && t.res).slice(-4).map((t) => ({q: t.q, a: answerDigest(t.res!.answer)}));
    setTurns((p) => [...p, {id, q, read: summarizeContext(ctx), status: 'loading'}]);
    abort.current?.abort();
    const ctl = new AbortController();
    abort.current = ctl;
    try {
      const res = await askFn({question: q, context: ctx, history, subject, signal: ctl.signal});
      setTurns((p) => p.map((t) => (t.id === id ? {...t, status: 'done', res} : t)));
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return;
      const msg = e instanceof BoardQaError ? e.message : 'Có lỗi khi hỏi AI. Thử lại nhé.';
      setTurns((p) => p.map((t) => (t.id === id ? {...t, status: 'error', error: msg} : t)));
    }
  };

  useEffect(() => {
    if (isOpen && autoAskNonce !== lastAuto.current && initialQuery.trim()) void ask(initialQuery);
    lastAuto.current = autoAskNonce;
  }, [autoAskNonce, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    endRef.current?.scrollIntoView?.({block: 'end', behavior: 'smooth'});
  }, [turns]);

  if (!isOpen) return null;

  return (
    <div
      data-testid="board-ask-card"
      className="fixed bottom-24 right-6 z-50 flex max-h-[72vh] w-[min(540px,calc(100vw-24px))] flex-col gap-2.5 rounded-2xl border border-[#E6E4DD] bg-white/97 p-3.5 text-stone-900 shadow-[0_20px_60px_-12px_rgba(20,20,19,0.35)] backdrop-blur-xl"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-bold">Hỏi đáp AI về bảng</div>
            <div className="text-[11px] text-stone-500">AI đọc những gì đang có trên bảng rồi mới trả lời</div>
          </div>
        </div>
        <button type="button" data-testid="board-ask-close" onClick={onClose} title="Đóng" className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-0.5" data-testid="board-ask-thread">
        {turns.length === 0 && (
          <div className="flex flex-col gap-2 rounded-xl bg-[#F4F3EE] p-3">
            <div className="text-[11px] font-semibold text-stone-600">AI sẽ dựa vào:</div>
            <div className="flex flex-wrap gap-1.5" data-testid="board-ask-read">
              {chips.length ? (
                chips.map((c) => (
                  <span key={c} className="rounded-full border border-[#DCD9D0] bg-white px-2.5 py-1 text-[11px] text-stone-700">
                    {c}
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-stone-500">Bảng đang trống.</span>
              )}
            </div>
            <div className="mt-1 flex flex-col gap-1.5">
              {suggestions.map((s) => (
                <button key={s} type="button" data-testid="board-ask-suggest" onClick={() => void ask(s)} className="rounded-lg border border-[#DCD9D0] bg-white px-3 py-2 text-left text-[12px] text-stone-800 transition hover:bg-blue-50 active:scale-[0.99]">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((t) => (
          <div key={t.id} className="flex flex-col gap-1.5" data-testid="board-ask-turn">
            <div className="self-end rounded-2xl rounded-br-md bg-blue-600 px-3 py-2 text-[13px] text-white" data-testid="board-ask-question">
              {t.q}
            </div>
            {t.read.length > 0 && <div className="self-end text-[10px] text-stone-400">đã đọc: {t.read.join(' · ')}</div>}
            {t.status === 'loading' && (
              <div className="flex items-center gap-2 rounded-xl bg-[#F4F3EE] px-3 py-2.5 text-[12px] text-stone-600" data-testid="board-ask-loading">
                <RotateCw className="h-3.5 w-3.5 animate-spin" /> Đang đọc bảng và suy luận…
              </div>
            )}
            {t.status === 'error' && (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-800" data-testid="board-ask-error">
                <span>{t.error}</span>
                <button type="button" onClick={() => void ask(t.q)} className="rounded-md bg-white px-2 py-1 font-semibold text-rose-700 hover:bg-rose-100">
                  Thử lại
                </button>
              </div>
            )}
            {t.status === 'done' && t.res && <AnswerView res={t.res} onAsk={(s) => void ask(s)} onVisualize={onVisualize} />}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="flex items-center gap-1.5">
        <input
          type="text"
          data-testid="board-ask-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void ask(query);
          }}
          placeholder="Hỏi về hình, công thức, mô phỏng đang có trên bảng…"
          className="min-h-[44px] flex-1 rounded-xl border border-[#DCD9D0] bg-white px-3 text-[13px] text-stone-900 placeholder-stone-400 focus:border-blue-500 focus:outline-none"
        />
        {onStartVoice && (
          <button
            type="button"
            data-testid="board-ask-mic"
            onClick={onStartVoice}
            title="Nói câu hỏi"
            className={`min-h-[44px] rounded-xl border px-3 transition ${isListening ? 'animate-pulse border-rose-400 bg-rose-600 text-white' : 'border-[#DCD9D0] bg-white text-cyan-700 hover:bg-cyan-50'}`}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        )}
        <button type="button" data-testid="board-ask-send" onClick={() => void ask(query)} disabled={!query.trim()} className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:opacity-40">
          <Send className="h-3.5 w-3.5" /> Hỏi
        </button>
      </div>
    </div>
  );
};

const AnswerView: React.FC<{res: BoardQaResponse; onAsk: (q: string) => void; onVisualize: (text: string) => void}> = ({res, onAsk, onVisualize}) => {
  const a = res.answer;
  return (
    <div className="flex flex-col gap-2 rounded-2xl rounded-bl-md border border-[#E6E4DD] bg-[#FBFAF7] p-3" data-testid="board-ask-answer" data-source={res.source}>
      {a.headline && (
        <div className="text-[13px] font-bold leading-snug text-stone-900" data-testid="board-ask-headline">
          <MathText text={a.headline} />
        </div>
      )}
      {a.clarify && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[12px] text-amber-900" data-testid="board-ask-clarify">
          <MathText text={a.clarify} />
        </div>
      )}
      {a.steps.length > 0 && (
        <ol className="flex list-decimal flex-col gap-1 pl-5 text-[12px] leading-relaxed text-stone-700" data-testid="board-ask-steps">
          {a.steps.map((s, i) => (
            <li key={i}>
              <MathText text={s} />
            </li>
          ))}
        </ol>
      )}
      {a.formula_latex && (
        <div className="overflow-x-auto rounded-lg border border-[#E6E4DD] bg-white px-2.5 py-1.5 text-[13px]" data-testid="board-ask-formula">
          <MathView latex={a.formula_latex} />
        </div>
      )}
      {a.highlights.length > 0 && (
        <div className="text-[11px] text-stone-500" data-testid="board-ask-highlights">
          Liên quan: {a.highlights.join(', ')}
        </div>
      )}
      {a.actions.length > 0 && (
        <div className="flex flex-col gap-1.5" data-testid="board-ask-actions">
          {a.actions.map((act, i) => (
            <button key={i} type="button" data-testid="board-ask-action" onClick={() => onVisualize(act.text)} className="flex min-h-[40px] items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 text-left text-[12px] font-semibold text-cyan-900 transition hover:bg-cyan-100 active:scale-[0.99]">
              <Play className="h-3 w-3 fill-current" /> {act.label}
              <span className="ml-auto text-[10px] font-normal text-cyan-700">minh họa lên bảng</span>
            </button>
          ))}
        </div>
      )}
      {a.follow_ups.length > 0 && (
        <div className="flex flex-wrap gap-1.5" data-testid="board-ask-followups">
          {a.follow_ups.map((f) => (
            <button key={f} type="button" onClick={() => onAsk(f)} className="rounded-full border border-[#DCD9D0] bg-white px-2.5 py-1 text-[11px] text-stone-700 transition hover:bg-blue-50">
              {f}
            </button>
          ))}
        </div>
      )}
      <div className="text-[10px] text-stone-400" data-testid="board-ask-source">
        {SOURCE_LABEL(res)}
        {res.note ? ` — ${res.note}` : ''}
      </div>
    </div>
  );
};
