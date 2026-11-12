/**
 * Gợi ý giải Socratic cho MỌI môn (chế độ thứ hai của thẻ Hỏi đáp AI): chẩn đoán chỗ vướng → một câu hỏi dẫn dắt → học sinh tự làm →
 * kiểm tra bước vừa viết (hóa học đếm nguyên tử ngay trên máy; còn lại chấm từng bước qua máy chủ) → hỏi tiếp / hỏi bẫy thường gặp / nâng mức.
 * Lời giải mẫu chỉ có khi học sinh chủ động xin (mức 5, cần AI). Logic ở utils/socraticSolve.ts và utils/socraticBank.ts.
 */
import React, {useMemo, useRef, useState} from 'react';
import {Lightbulb} from 'lucide-react';
import {askBoard, BoardQaError, type BoardQaResponse} from '../../utils/boardQa';
import type {BoardContext} from '../../utils/boardContext';
import {gradeSteps as gradeStepsApi} from '../../utils/gradeUi';
import {SUBJECT_NAME, type SubjectId} from '../../utils/socraticBank';
import {STAGE_TITLE, STUCK_OPTIONS, advance, classifyProblem, hintAt, levelAfterDiagnosis, newSolveState, pitfallQuestion, problemFromContext, reviewChemLine, reviewFromGrade, typesOfSubject, type Level, type SolveState, type Stuck, type StepReview} from '../../utils/socraticSolve';

type Msg = {who: 'coach' | 'me' | 'check'; text: string; tone?: 'ok' | 'bad'};

export const SolveCoachView: React.FC<{
  getContext: () => BoardContext;
  subject?: string | null;
  onVisualize: (text: string) => void;
  askFn?: typeof askBoard;
  gradeFn?: typeof gradeStepsApi;
}> = ({getContext, subject, onVisualize, askFn = askBoard, gradeFn = gradeStepsApi}) => {
  const initial = useMemo(() => problemFromContext(getContext()), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [problem, setProblem] = useState(initial);
  const [typeId, setTypeId] = useState<string>('auto');
  const auto = useMemo(() => classifyProblem(problem, subject), [problem, subject]);
  const ty = useMemo(() => (typeId === 'auto' ? auto : (Object.keys(SUBJECT_NAME) as SubjectId[]).flatMap((s) => typesOfSubject(s)).find((t) => t.id === typeId) ?? auto), [typeId, auto]);
  const [st, setSt] = useState<SolveState>(newSolveState());
  const [log, setLog] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const [vis, setVis] = useState<{label: string; text: string}[]>([]);
  const pushCoach = (text: string) => setLog((l) => [...l, {who: 'coach', text}]);
  const lastReview = useRef<StepReview | null>(null);

  const say = (level: Level, variant = st.variant) => {
    const h = hintAt(ty, level, variant);
    pushCoach(`${h.title}: ${h.question}${h.wait ? ` (${h.wait})` : ''}`);
  };
  const diagnose = (s: Stuck) => {
    const level = levelAfterDiagnosis(s);
    setSt({...newSolveState(), level});
    say(level, 0);
  };
  const next = () => {
    const level = Math.min(4, st.level + 1) as Level;
    setSt({...st, level, variant: 0, misses: 0});
    say(level, 0);
  };
  const another = () => {
    const variant = st.variant + 1;
    setSt({...st, variant});
    say(st.level, variant);
  };
  const pitfall = () => {
    setSt({...st, pitfall: st.pitfall + 1});
    pushCoach(`Bẫy hay gặp: ${pitfallQuestion(ty, st.pitfall)}`);
  };

  const ctxFor = (note?: string): BoardContext => ({...getContext(), problem, problem_type: ty.label, stage: STAGE_TITLE[st.level], ...(note ? {student_note: note} : {})});
  const askAi = async (level: number, note?: string) => {
    setBusy(true);
    try {
      const res: BoardQaResponse = await askFn({question: note ? `Em nghĩ: ${note}` : level >= 5 ? 'Cho em xem lời giải mẫu' : 'Gợi ý cho em bước tiếp theo', context: ctxFor(note), mode: 'solve', level, subject});
      const a = res.answer;
      if (a.headline || a.steps.length) {
        pushCoach([a.headline, ...a.steps].filter(Boolean).join(level >= 5 ? '\n' : ' '));
        setVis(a.actions.filter((x): x is Extract<typeof x, {type: 'visualize'}> => x.type === 'visualize').map((x) => ({label: x.label, text: x.text})));
      } else {
        say(st.level);
        if (level >= 5) pushCoach('Lời giải mẫu cần kết nối AI (khóa Gemini/OpenRouter trong "Kết nối AI"). Trong lúc đó em thử làm theo các câu hỏi trên nhé.');
      }
    } catch (e) {
      pushCoach(`${e instanceof BoardQaError ? e.message : 'Chưa gọi được AI.'} Em dùng gợi ý có sẵn: ${hintAt(ty, st.level, st.variant).question}`);
    }
    setBusy(false);
  };

  const submit = async () => {
    const t = draft.trim();
    if (!t) return;
    setDraft('');
    setDetail(null);
    setBusy(true);
    setLog((l) => [...l, {who: 'me', text: t}]);
    let r: StepReview | null = ty.subject === 'CHEMISTRY' || /→|->/.test(t) ? reviewChemLine(t) : null;
    if (!r) {
      const out = await gradeFn([t], subject ?? undefined, fetch, {problem});
      r = reviewFromGrade(out?.steps?.[0]);
      if (!out) r = {verdict: 'unknown', question: 'Chưa chấm được bước này (máy chủ không phản hồi). Em tự kiểm tra bằng cách thử số hoặc đổi cách làm: bước vừa rồi dựa vào điều gì?'};
    }
    lastReview.current = r;
    setLog((l) => [...l, {who: 'check', text: r!.question, tone: r!.verdict === 'ok' ? 'ok' : r!.verdict === 'miss' ? 'bad' : undefined}]);
    if (r.detail) setDetail(r.detail);
    if (r.verdict !== 'unknown') {
      const a = advance(st, r.verdict === 'ok' ? 'ok' : 'miss');
      setSt(a.state);
      if (a.ask === 'next') say(a.state.level, 0);
      else if (a.ask === 'pitfall') pushCoach(`Bẫy hay gặp: ${pitfallQuestion(ty, st.pitfall)}`);
      else say(a.state.level, a.state.variant);
    }
    setBusy(false);
  };

  const started = log.length > 0;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2" data-testid="solve-coach">
      <div className="flex flex-col gap-1.5 rounded-xl bg-[#F4F3EE] p-2.5">
        <label className="text-[11px] font-semibold text-stone-600" htmlFor="solve-problem">Đề bài (lấy từ bảng, sửa được)</label>
        <textarea id="solve-problem" data-testid="solve-problem" value={problem} onChange={(e) => setProblem(e.target.value)} rows={3} placeholder="Viết/dán đề lên bảng rồi mở lại, hoặc gõ vào đây" className="w-full resize-none rounded-lg border border-[#DCD9D0] bg-white px-2 py-1.5 text-[12px]" />
        <div className="flex items-center gap-1.5 text-[11px] text-stone-600">
          <span>Dạng bài:</span>
          <select data-testid="solve-type" value={typeId} onChange={(e) => { setTypeId(e.target.value); setLog([]); setSt(newSolveState()); }} className="min-w-0 flex-1 rounded-md border border-[#DCD9D0] bg-white px-1 py-1 text-[11px]">
            <option value="auto">Tự nhận: {SUBJECT_NAME[auto.subject]} · {auto.label}</option>
            {(Object.keys(SUBJECT_NAME) as SubjectId[]).filter((s) => s !== 'GENERAL').map((s) => (
              <optgroup key={s} label={SUBJECT_NAME[s]}>
                {typesOfSubject(s).map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto" data-testid="solve-log">
        {!started && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-2.5 text-[12px] text-stone-700" data-testid="solve-diagnose">
            <div className="mb-1.5 font-semibold text-amber-900">Em đang vướng ở đâu?</div>
            <div className="flex flex-col gap-1">
              {STUCK_OPTIONS.map((o) => (
                <button key={o.id} type="button" data-testid={`solve-stuck-${o.id}`} onClick={() => diagnose(o.id)} className="rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-left hover:bg-amber-50">{o.label}</button>
              ))}
            </div>
          </div>
        )}
        {log.map((m, i) => (
          <p key={i} className={`whitespace-pre-line rounded-lg px-2 py-1 text-[12px] leading-snug ${m.who === 'me' ? 'ml-8 bg-indigo-50 text-indigo-900' : m.who === 'check' ? (m.tone === 'ok' ? 'bg-emerald-50 text-emerald-900' : m.tone === 'bad' ? 'bg-rose-50 text-rose-900' : 'bg-stone-50 text-stone-700') : 'bg-amber-50 text-stone-800'}`}>{m.text}</p>
        ))}
        {detail && (
          <button type="button" data-testid="solve-detail" onClick={() => { pushCoach(`Giải thích chi tiết: ${detail}`); setDetail(null); }} className="self-start rounded-lg border border-[#DCD9D0] px-2 py-1 text-[11px] text-stone-700 hover:bg-stone-50">Cho tôi xem giải thích chi tiết</button>
        )}
        {vis.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {vis.map((v, i) => <button key={i} type="button" onClick={() => onVisualize(v.text)} className="rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-1 text-[11px] text-cyan-900 hover:bg-cyan-100">▶ {v.label}</button>)}
          </div>
        )}
      </div>

      {started && (
        <div className="flex flex-wrap gap-1" data-testid="solve-actions">
          <button type="button" data-testid="solve-next" disabled={st.level >= 4} onClick={next} className="rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-600 disabled:opacity-40">Gợi ý tiếp</button>
          <button type="button" data-testid="solve-other" onClick={another} className="rounded-lg border border-[#DCD9D0] px-2 py-1 text-[11px] text-stone-700 hover:bg-stone-50">Ý khác</button>
          <button type="button" data-testid="solve-pitfall" onClick={pitfall} className="rounded-lg border border-[#DCD9D0] px-2 py-1 text-[11px] text-stone-700 hover:bg-stone-50">Bẫy thường gặp</button>
          <button type="button" data-testid="solve-ai" disabled={busy} onClick={() => void askAi(st.level)} className="rounded-lg border border-amber-300 px-2 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-40">{busy ? 'Đang hỏi AI…' : 'Hỏi AI (Socratic)'}</button>
          <button type="button" data-testid="solve-full" disabled={busy} onClick={() => void askAi(5)} title="Chỉ xem khi em đã thử và muốn xem lời giải mẫu" className="rounded-lg border border-stone-300 px-2 py-1 text-[11px] text-stone-600 hover:bg-stone-50 disabled:opacity-40">Xem lời giải mẫu</button>
        </div>
      )}
      <form className="flex gap-1" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <input data-testid="solve-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Em viết bước làm của mình (vd 2x = 4)…" className="min-w-0 flex-1 rounded-lg border border-[#DCD9D0] px-2 py-1.5 text-[12px]" />
        <button type="submit" data-testid="solve-check" disabled={busy} className="flex items-center gap-1 rounded-lg border border-indigo-300 px-2.5 text-[12px] font-semibold text-indigo-800 hover:bg-indigo-50 disabled:opacity-40"><Lightbulb className="h-3.5 w-3.5" />Kiểm tra</button>
      </form>
    </div>
  );
};
