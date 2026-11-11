/**
 * Gợi ý giải bài hình kiểu Socratic: dẫn bằng câu hỏi qua 4 mức, mức 3 gợi ý đường phụ (bấm để vẽ giúp), và kiểm chứng
 * mệnh đề học sinh viết ra trên chính hình (đo số + kéo thử đỉnh). Không đưa lời giải. Logic ở utils/geoCoach.ts, utils/geoClaims.ts.
 */
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Lightbulb, X} from 'lucide-react';
import type {GeoController} from './GeometryProblemPanel';
import {coachHint, goalOf, newFacts, reviewAttempt, type AuxIdea} from '../../utils/geoCoach';
import type {GeoScene} from '../../utils/geometryProblem';
import {askBoard, BoardQaError, type BoardQaAction} from '../../utils/boardQa';
import type {BoardContext} from '../../utils/boardContext';
import {detectFacts} from '../../utils/geoClaims';
import type {GeoTool} from './GeometryProblemPanel';

type Msg = {who: 'coach' | 'me' | 'check'; text: string; tone?: 'ok' | 'bad'};

export const GeoCoachPanel: React.FC<{geo: GeoController; onClose: () => void; askFn?: typeof askBoard}> = ({geo, onClose, askFn = askBoard}) => {
  const sc = geo.scene;
  const goals = useMemo(() => sc.parts.map((p, i) => ({i, label: p.label, goal: goalOf(p.text)})).filter((x) => x.goal), [sc.parts]);
  const [part, setPart] = useState<number | null>(null);
  const cur = goals.find((g) => g.i === part) ?? goals[0] ?? null;
  const statement = cur ? sc.parts[cur.i].text : sc.parts.map((p) => p.text).join(' ');
  const [level, setLevel] = useState<1 | 2 | 3 | 4>(1);
  const [auxIdx, setAuxIdx] = useState(0);
  const [log, setLog] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const pending = useRef<{before: GeoScene; label: string} | null>(null);
  const [facts, setFacts] = useState<string[] | null>(null);
  const hint = useMemo(() => coachHint(sc, statement, level, auxIdx), [sc, statement, level, auxIdx]);
  // đường phụ đang gợi ý: giữ nút vẽ từ mức 3 trở đi (kể cả khi đã sang mức 4)
  const aux = useMemo(() => coachHint(sc, statement, 3, auxIdx).aux, [sc, statement, auxIdx]);
  const key = `${cur?.i ?? -1}`;
  const [aiBusy, setAiBusy] = useState(false);
  const [aiActions, setAiActions] = useState<Extract<BoardQaAction, {type: 'construct'}>[]>([]);

  // đổi phần của đề → bắt đầu lại từ mức 1
  useEffect(() => {
    setLevel(1);
    setAuxIdx(0);
    setLog([]);
    setFacts(null);
  }, [key]);

  // vừa vẽ đường phụ: báo có bao nhiêu quan hệ mới (không nói ra), học sinh tự tìm
  useEffect(() => {
    const p = pending.current;
    if (!p || p.before === sc) return;
    pending.current = null;
    const nf = newFacts(p.before, sc, cur?.goal?.claim);
    setFacts(nf);
    setLevel(4);
    setLog((l) => [...l, {who: 'coach', text: `Đã vẽ: ${p.label}. ${nf.length ? `Trên hình xuất hiện ${nf.length} quan hệ mới. Em tìm xem đó là những quan hệ nào?` : 'Chưa thấy quan hệ mới rõ ràng. Em thử đường khác, hoặc nhìn lại các góc.'}`}]);
  }, [sc]);

  const ask = () => setLog((l) => [...l, {who: 'coach', text: `${hint.title}: ${hint.question}`}]);
  const next = () => {
    const nl = Math.min(4, level + 1) as 1 | 2 | 3 | 4;
    setLevel(nl);
    setLog((l) => [...l, {who: 'coach', text: `${coachHint(sc, statement, nl, auxIdx).title}: ${coachHint(sc, statement, nl, auxIdx).question}`}]);
  };
  const drawAux = (a: AuxIdea) => {
    pending.current = {before: sc, label: a.label};
    geo.applyTool(a.tool, a.names);
  };
  // AI nói tiếp theo kiểu Socrate (cùng quy tắc: chỉ hỏi, không lời giải); không dùng được AI thì bộ gợi ý có sẵn ở trên vẫn chạy
  const askAi = async () => {
    setAiBusy(true);
    const names = sc.order.filter((n) => sc.pts[n]);
    const ctx: BoardContext = {items: [{id: 'fig', kind: 'solid', title: sc.title, names, geo: {problem: sc.parts[0]?.text.slice(0, 400), parts: sc.parts.map((p) => p.text.slice(0, 200)).slice(0, 8), edges: [], points: names, facts: detectFacts(sc, 24), ...(cur ? {goal: cur.goal!.text} : {})}}]};
    const last = [...log].reverse().find((m) => m.who === 'me');
    try {
      const res = await askFn({question: last ? `Em nghĩ: ${last.text}` : 'Gợi ý cho em bước tiếp theo', context: ctx, mode: 'coach', level, history: log.filter((m) => m.who !== 'check').slice(-4).map((m) => (m.who === 'me' ? {q: m.text, a: ''} : {q: '', a: m.text}))});
      const a = res.answer;
      if (a.headline) {
        setLog((l) => [...l, {who: 'coach', text: [a.headline, ...a.steps].join(' ')}]);
        setAiActions(a.actions.filter((x): x is Extract<BoardQaAction, {type: 'construct'}> => x.type === 'construct'));
      } else {
        setLog((l) => [...l, {who: 'coach', text: `${hint.title}: ${hint.question}`}]);
      }
    } catch (e) {
      setLog((l) => [...l, {who: 'coach', text: `${e instanceof BoardQaError ? e.message : 'Chưa gọi được AI.'} Dùng gợi ý có sẵn: ${hint.question}`}]);
    }
    setAiBusy(false);
  };
  const submit = () => {
    const t = draft.trim();
    if (!t) return;
    setDraft('');
    const r = reviewAttempt(sc, t);
    setLog((l) => [...l, {who: 'me', text: t}, {who: 'check', text: r.message, tone: r.verdict === 'holds' ? 'ok' : r.verdict === 'fails' ? 'bad' : undefined}]);
  };

  return (
    <div data-testid="geo-coach" className="absolute right-3 top-14 z-40 flex max-h-[48%] w-[340px] max-w-[calc(100%-24px)] flex-col rounded-2xl border border-amber-200 bg-white/98 shadow-lg pointer-events-auto">
      <div className="flex items-center gap-1.5 border-b border-amber-100 bg-amber-50/70 px-3 py-2 rounded-t-2xl">
        <Lightbulb className="h-4 w-4 text-amber-600" />
        <b className="text-[12px] text-amber-900">Gợi ý giải (Socratic)</b>
        <span className="ml-auto text-[10px] text-amber-700">Mức {level}/4</span>
        <button type="button" data-testid="geo-coach-close" onClick={onClose} className="text-stone-400 hover:text-stone-700" title="Đóng">
          <X className="h-4 w-4" />
        </button>
      </div>
      {goals.length > 1 && (
        <div className="flex flex-wrap gap-1 px-3 pt-2" data-testid="geo-coach-goals">
          {goals.map((g) => (
            <button key={g.i} type="button" onClick={() => setPart(g.i)} className={`rounded-full border px-2 py-0.5 text-[11px] ${cur?.i === g.i ? 'border-amber-400 bg-amber-100 text-amber-900' : 'border-[#DCD9D0] text-stone-600 hover:bg-stone-50'}`}>
              {g.label || `Phần ${g.i}`}
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 space-y-1.5 overflow-y-auto px-3 py-2 text-[12px] leading-snug" data-testid="geo-coach-log">
        {log.length === 0 && <p className="text-stone-600">{cur ? <>Yêu cầu: <b>{cur.goal!.text}</b>. Bấm “Hỏi gợi ý” để bắt đầu; tôi chỉ đặt câu hỏi, em tự tìm lời giải.</> : 'Chưa thấy yêu cầu “Chứng minh …” trong đề. Em vẫn có thể viết một nhận xét bên dưới để kiểm tra trên hình.'}</p>}
        {log.map((m, i) => (
          <p key={i} className={`rounded-lg px-2 py-1 ${m.who === 'me' ? 'ml-6 bg-indigo-50 text-indigo-900' : m.who === 'check' ? (m.tone === 'ok' ? 'bg-emerald-50 text-emerald-900' : m.tone === 'bad' ? 'bg-rose-50 text-rose-900' : 'bg-stone-50 text-stone-700') : 'bg-amber-50 text-stone-800'}`}>
            {m.text}
          </p>
        ))}
        {facts && facts.length > 0 && (
          <button type="button" data-testid="geo-coach-reveal" onClick={() => { setLog((l) => [...l, {who: 'coach', text: `Các quan hệ mới: ${facts.slice(0, 6).join('; ')}. Quan hệ nào dùng được cho bước tiếp theo?`}]); setFacts(null); }} className="rounded-lg border border-amber-300 px-2 py-1 text-[11px] text-amber-800 hover:bg-amber-50">
            Cho tôi xem các quan hệ mới
          </button>
        )}
      </div>
      {aux && level >= 3 && (
        <div className="flex flex-wrap gap-1 px-3 pb-1" data-testid="geo-coach-aux">
          <button type="button" data-testid="geo-coach-draw" onClick={() => drawAux(aux)} className="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700">
            Vẽ giúp: {aux.label}
          </button>
          <button type="button" data-testid="geo-coach-other" onClick={() => { setAuxIdx(auxIdx + 1); setLog((l) => [...l, {who: 'coach', text: `${coachHint(sc, statement, 3, auxIdx + 1).title}: ${coachHint(sc, statement, 3, auxIdx + 1).question}`}]); }} className="rounded-lg border border-[#DCD9D0] px-2 py-1 text-[11px] text-stone-700 hover:bg-stone-50">
            Ý khác
          </button>
        </div>
      )}
      {aiActions.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 pb-1" data-testid="geo-coach-ai-actions">
          {aiActions.map((a, i) => (
            <button key={i} type="button" onClick={() => { pending.current = {before: sc, label: a.label}; geo.applyTool(a.tool as GeoTool, a.names); setAiActions([]); }} className="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700">
              Vẽ giúp: {a.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-1 px-3 pb-1">
        {log.length === 0 ? (
          <button type="button" data-testid="geo-coach-ask" onClick={ask} className="rounded-lg bg-amber-500 px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-amber-600">Hỏi gợi ý</button>
        ) : (
          <button type="button" data-testid="geo-coach-next" disabled={level >= 4} onClick={next} className="rounded-lg bg-amber-500 px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-amber-600 disabled:opacity-40">Gợi ý tiếp</button>
        )}
        <button type="button" data-testid="geo-coach-ai" disabled={aiBusy} onClick={() => void askAi()} className="rounded-lg border border-amber-300 px-2.5 py-1 text-[12px] font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-40">{aiBusy ? 'Đang hỏi AI…' : 'Hỏi AI (Socratic)'}</button>
      </div>
      <form className="flex gap-1 border-t border-[#E6E4DD] p-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <input data-testid="geo-coach-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Em nghĩ rằng… (vd AB ⊥ CD)" className="min-w-0 flex-1 rounded-lg border border-[#DCD9D0] px-2 py-1 text-[12px]" />
        <button type="submit" data-testid="geo-coach-check" className="rounded-lg border border-indigo-300 px-2 text-[12px] font-semibold text-indigo-800 hover:bg-indigo-50">Kiểm tra</button>
      </form>
    </div>
  );
};
