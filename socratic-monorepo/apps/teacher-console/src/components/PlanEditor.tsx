'use client';

import React, {useEffect, useMemo, useState} from 'react';
import {ArrowDown, ArrowUp, Plus, Save, Sparkles, Trash2, X} from 'lucide-react';
import {HubError, hub, type PlanBody, type PlanItem, type PlanSection, type SectionMetrics, type Subject, type Suggestion} from '../lib/hub';
import type {ClassInfo, SimEntry} from '../lib/types';

const SUBJECTS: [Subject, string][] = [['MATH', 'Toán'], ['PHYSICS', 'Vật lí'], ['CHEMISTRY', 'Hóa học'], ['BIOLOGY', 'Sinh học']];
const ITEM_LABEL: Record<PlanItem['type'], string> = {formula: 'Công thức', problem: 'Bài tập', sim: 'Mô phỏng', poll: 'Câu hỏi nhanh'};
const SG_LABEL: Record<Suggestion['type'], string> = {add_example: 'Thêm ví dụ', add_question: 'Thêm câu hỏi', reorder: 'Sắp lại thứ tự', add_note: 'Ghi chú khi dạy'};
const MAX_SECTIONS = 12;
const MAX_ITEMS = 12;

const rid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 10)}`;
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
/** mã kiến thức (a-z0-9-) sinh từ tên: cùng tên ở hai giáo án cho cùng mã, nên chỉ số gộp được */
export const kcId = (label: string) => fold(label).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || rid('kc');
const blankSection = (n: number): PlanSection => ({id: rid('s'), title: `Phần ${n}`, objective: '', kcs: [], items: []});
export const blankPlan = (): PlanBody => ({title: '', subject: 'MATH', boardContext: '', sections: [blankSection(1)]});
const newItem = (type: PlanItem['type']): PlanItem =>
  type === 'formula' ? {id: rid('it'), type, latex: ''} : type === 'problem' ? {id: rid('it'), type, text: ''} : type === 'sim' ? {id: rid('it'), type, templateId: '', params: {}} : {id: rid('it'), type, question: '', options: ['', '']};

/** Lỗi phải sửa trước khi lưu (máy chủ cũng kiểm lại theo schema). */
export function planProblems(b: PlanBody): string[] {
  const out: string[] = [];
  if (!b.title.trim()) out.push('Giáo án cần có tên.');
  b.sections.forEach((s, i) => {
    if (!s.title.trim()) out.push(`Phần ${i + 1} cần có tên.`);
    s.items.forEach((it, j) => {
      const at = `Phần ${i + 1}, mục ${j + 1}`;
      if (it.type === 'formula' && !it.latex.trim()) out.push(`${at}: chưa nhập công thức.`);
      if (it.type === 'problem' && !it.text.trim()) out.push(`${at}: chưa nhập đề bài.`);
      if (it.type === 'sim' && !it.templateId) out.push(`${at}: chưa chọn mô phỏng.`);
      if (it.type === 'poll' && (!it.question.trim() || it.options.filter((o) => o.trim()).length < 2)) out.push(`${at}: câu hỏi nhanh cần câu hỏi và ít nhất 2 phương án.`);
    });
  });
  return out;
}

/** Bỏ trường rỗng tùy chọn để khớp schema của máy chủ (chuỗi rỗng không hợp lệ ở một số trường). */
function clean(b: PlanBody): PlanBody {
  return {
    ...b,
    title: b.title.trim(),
    sections: b.sections.map((s) => ({
      ...s,
      title: s.title.trim(),
      items: s.items.map((it): PlanItem => {
        if (it.type === 'formula') return {id: it.id, type: it.type, latex: it.latex.trim(), ...(it.caption?.trim() ? {caption: it.caption.trim()} : {})};
        if (it.type === 'problem') return {id: it.id, type: it.type, text: it.text.trim(), ...(it.answer?.trim() ? {answer: it.answer.trim()} : {})};
        if (it.type === 'poll') {
          const options = it.options.map((o) => o.trim()).filter(Boolean);
          return {id: it.id, type: it.type, question: it.question.trim(), options, ...(it.correct !== undefined && it.correct < options.length ? {correct: it.correct} : {})};
        }
        return it;
      }),
    })),
  };
}

function SimPicker({catalog, value, onPick}: {catalog: SimEntry[]; value: string; onPick: (id: string) => void}) {
  const [q, setQ] = useState('');
  const hit = catalog.find((c) => c.id === value);
  const matches = fold(q.trim()).length >= 2 ? catalog.filter((c) => fold(c.title).includes(fold(q.trim()))).slice(0, 8) : [];
  return (
    <div className="flex flex-col gap-1">
      {hit && <span className="text-sm text-stone-800">{hit.title}</span>}
      <input data-testid="plan-sim-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={hit ? 'Đổi mô phỏng…' : 'Tìm mô phỏng…'} className="rounded-lg border border-[#DCD9D0] px-2 py-1 text-sm" />
      {matches.length > 0 && (
        <ul className="max-h-40 overflow-y-auto rounded-lg border border-[#DCD9D0] bg-white">
          {matches.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => (onPick(c.id), setQ(''))} className="w-full px-2 py-1 text-left text-sm hover:bg-stone-50">{c.title}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ItemFields({it, set, catalog}: {it: PlanItem; set: (it: PlanItem) => void; catalog: SimEntry[]}) {
  const inp = 'rounded-lg border border-[#DCD9D0] px-2 py-1 text-sm';
  if (it.type === 'formula')
    return (
      <div className="grid gap-1 sm:grid-cols-2">
        <input className={`${inp} font-mono`} value={it.latex} onChange={(e) => set({...it, latex: e.target.value})} placeholder="Công thức LaTeX, ví dụ v = v_0 + at" maxLength={400} />
        <input className={inp} value={it.caption ?? ''} onChange={(e) => set({...it, caption: e.target.value})} placeholder="Chú thích (không bắt buộc)" maxLength={200} />
      </div>
    );
  if (it.type === 'problem')
    return (
      <div className="grid gap-1">
        <textarea className={inp} rows={2} value={it.text} onChange={(e) => set({...it, text: e.target.value})} placeholder="Đề bài" maxLength={1000} />
        <input className={inp} value={it.answer ?? ''} onChange={(e) => set({...it, answer: e.target.value})} placeholder='Đáp số để máy chấm (ví dụ "x = 2"); chỉ bạn thấy' maxLength={200} />
      </div>
    );
  if (it.type === 'sim') return <SimPicker catalog={catalog} value={it.templateId} onPick={(id) => set({...it, templateId: id})} />;
  return (
    <div className="grid gap-1">
      <input className={inp} value={it.question} onChange={(e) => set({...it, question: e.target.value})} placeholder="Câu hỏi nhanh cho cả lớp" maxLength={300} />
      {it.options.map((o, k) => (
        <div key={k} className="flex items-center gap-1">
          <input type="radio" aria-label={`Đáp án đúng là phương án ${k + 1}`} checked={it.correct === k} onChange={() => set({...it, correct: k})} />
          <input className={`${inp} flex-1`} value={o} onChange={(e) => set({...it, options: it.options.map((x, j) => (j === k ? e.target.value : x))})} placeholder={`Phương án ${k + 1}`} maxLength={120} />
          {it.options.length > 2 && (
            <button type="button" aria-label="Bỏ phương án" onClick={() => set({...it, options: it.options.filter((_, j) => j !== k), correct: it.correct === k ? undefined : it.correct !== undefined && it.correct > k ? it.correct - 1 : it.correct})} className="rounded p-1 text-stone-400 hover:bg-stone-100">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
      {it.options.length < 6 && (
        <button type="button" onClick={() => set({...it, options: [...it.options, '']})} className="self-start text-xs text-blue-700">+ Phương án</button>
      )}
    </div>
  );
}

const describe = (sg: Suggestion, catalog: SimEntry[]): string => {
  const it = sg.item;
  if (it?.type === 'formula') return it.latex;
  if (it?.type === 'problem') return it.text + (it.answer ? ` (đáp số: ${it.answer})` : '');
  if (it?.type === 'poll') return `${it.question} [${it.options.join(' / ')}]`;
  if (it?.type === 'sim') return catalog.find((c) => c.id === it.templateId)?.title ?? it.templateId;
  return sg.note ?? (sg.order ? 'Đổi thứ tự các mục của phần này.' : '');
};

/** Soạn giáo án theo mục (lưu ở hub, có version). AI gợi ý sửa từng mục từ kết quả học của một lớp; giáo viên áp dụng từng gợi ý. */
export function PlanEditor({planId, catalog, classes, onSaved}: {planId: string | null; catalog: SimEntry[]; classes: ClassInfo[]; onSaved: (id: string) => void}) {
  const [body, setBody] = useState<PlanBody | null>(planId ? null : blankPlan());
  const [saved, setSaved] = useState<{id: string; version: number; json: string} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [classId, setClassId] = useState('');
  const [hubClassId, setHubClassId] = useState<string | null>(null);
  const [ai, setAi] = useState<Record<string, {loading?: boolean; list?: Suggestion[]; note?: string; metrics?: SectionMetrics | null; grounded?: boolean}>>({});

  useEffect(() => {
    setError(null);
    setAi({});
    if (!planId) {
      setBody(blankPlan());
      setSaved(null);
      return;
    }
    let alive = true;
    setBody(null);
    hub
      .plan(planId)
      .then((p) => alive && (setBody(p.body), setSaved({id: p.id, version: p.version, json: JSON.stringify(p.body)})))
      .catch((e) => alive && setError(e instanceof HubError ? e.message : 'Không tải được giáo án.'));
    return () => {
      alive = false;
    };
  }, [planId]);

  useEffect(() => {
    setHubClassId(null);
    if (!classId) return;
    hub.linkClass(classId).then((r) => setHubClassId(r.hubClassId)).catch(() => setError('Không liên kết được lớp.'));
  }, [classId]);

  const dirty = useMemo(() => !body || !saved || JSON.stringify(body) !== saved.json, [body, saved]);
  const problems = body ? planProblems(body) : [];

  if (!body) return error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : <p className="text-sm text-stone-500">Đang tải giáo án…</p>;

  const setSection = (i: number, s: PlanSection) => setBody({...body, sections: body.sections.map((x, j) => (j === i ? s : x))});
  const move = <T,>(arr: T[], i: number, d: number) => {
    const out = [...arr];
    [out[i], out[i + d]] = [out[i + d], out[i]];
    return out;
  };

  const save = async () => {
    setError(null);
    setBusy(true);
    try {
      const b = clean(body);
      const r = saved ? await hub.savePlan(saved.id, b, saved.version) : await hub.createPlan(b);
      setBody(r.body);
      setSaved({id: r.id, version: r.version, json: JSON.stringify(r.body)});
      if (!saved) onSaved(r.id);
    } catch (e) {
      setError(e instanceof HubError ? e.message : 'Không lưu được giáo án.');
    } finally {
      setBusy(false);
    }
  };

  const askAi = async (s: PlanSection) => {
    if (!saved || !hubClassId) return;
    setAi((a) => ({...a, [s.id]: {loading: true}}));
    const [metrics, sg] = await Promise.all([
      hub.sectionMetrics(saved.id, s.id, hubClassId).catch(() => null),
      hub.suggest(saved.id, s.id, hubClassId).catch((e) => ({suggestions: [] as Suggestion[], source: 'error', note: e instanceof HubError ? e.message : 'Không gọi được AI.'})),
    ]);
    setAi((a) => ({...a, [s.id]: {list: sg.suggestions, note: sg.suggestions.length ? undefined : sg.note ?? 'AI không có gợi ý nào cho phần này.', metrics, grounded: 'grounded' in sg ? sg.grounded !== false : true}}));
  };

  const apply = async (sectionId: string, sg: Suggestion) => {
    if (!saved) return;
    setError(null);
    try {
      const r = await hub.applySuggestion(saved.id, sg.id);
      setBody(r.body);
      setSaved({id: saved.id, version: r.version, json: JSON.stringify(r.body)});
      setAi((a) => ({...a, [sectionId]: {...a[sectionId], list: a[sectionId]?.list?.filter((x) => x.id !== sg.id)}}));
    } catch (e) {
      setError(e instanceof HubError ? e.message : 'Không áp dụng được gợi ý.');
    }
  };

  const f = 'rounded-lg border border-[#DCD9D0] bg-white px-3 py-2 text-sm';
  return (
    <div data-testid="plan-editor" className="flex flex-col gap-3">
      <div className="grid gap-2 rounded-2xl border border-[#E6E4DD] bg-white p-3 sm:grid-cols-[1fr_10rem]">
        <input data-testid="plan-title" className={f} value={body.title} onChange={(e) => setBody({...body, title: e.target.value})} placeholder="Tên giáo án, ví dụ: Bài 12. Chuyển động ném" maxLength={160} />
        <select data-testid="plan-subject" className={f} value={body.subject} onChange={(e) => setBody({...body, subject: e.target.value as Subject})}>
          {SUBJECTS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <textarea className={`${f} sm:col-span-2`} rows={2} value={body.boardContext} onChange={(e) => setBody({...body, boardContext: e.target.value})} placeholder="Ghi chú cho AI trên bảng: lớp đã học gì, cần nhấn mạnh gì (AI hỏi đáp dùng làm ngữ cảnh)" maxLength={1000} />
      </div>

      {body.sections.map((s, i) => {
        const st = ai[s.id];
        return (
          <section key={s.id} data-testid="plan-section" className="flex flex-col gap-2 rounded-2xl border border-[#E6E4DD] bg-white p-3">
            <div className="flex items-center gap-2">
              <input data-testid="section-title" className={`${f} flex-1 font-semibold`} value={s.title} onChange={(e) => setSection(i, {...s, title: e.target.value})} placeholder="Tên phần" maxLength={160} />
              <button type="button" aria-label="Chuyển phần lên" disabled={i === 0} onClick={() => setBody({...body, sections: move(body.sections, i, -1)})} className="rounded p-1.5 text-stone-500 hover:bg-stone-100 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
              <button type="button" aria-label="Chuyển phần xuống" disabled={i === body.sections.length - 1} onClick={() => setBody({...body, sections: move(body.sections, i, 1)})} className="rounded p-1.5 text-stone-500 hover:bg-stone-100 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
              <button type="button" aria-label="Xóa phần" disabled={body.sections.length === 1} onClick={() => setBody({...body, sections: body.sections.filter((_, j) => j !== i)})} className="rounded p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
            </div>
            <textarea className={f} rows={2} value={s.objective} onChange={(e) => setSection(i, {...s, objective: e.target.value})} placeholder="Mục tiêu của phần này" maxLength={500} />
            <div className="flex flex-wrap items-center gap-1 text-xs">
              <span className="text-stone-500">Kiến thức:</span>
              {s.kcs.map((k) => (
                <span key={k.id} data-testid="kc-chip" className="flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-violet-800">
                  {k.label}
                  <button type="button" aria-label="Bỏ kiến thức" onClick={() => setSection(i, {...s, kcs: s.kcs.filter((x) => x.id !== k.id)})}><X className="h-3 w-3" /></button>
                </span>
              ))}
              {s.kcs.length < 8 && (
                <input
                  data-testid="kc-input"
                  className="rounded-full border border-[#DCD9D0] px-2 py-0.5"
                  placeholder="+ thêm (Enter)"
                  maxLength={80}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    const label = e.currentTarget.value.trim();
                    const id = kcId(label);
                    if (label && !s.kcs.some((k) => k.id === id)) setSection(i, {...s, kcs: [...s.kcs, {id, label}]});
                    e.currentTarget.value = '';
                  }}
                />
              )}
            </div>

            <ol className="flex flex-col gap-2">
              {s.items.map((it, j) => (
                <li key={it.id} data-testid="plan-item" data-type={it.type} className="flex gap-2 rounded-lg bg-stone-50 p-2">
                  <span className="mt-1 w-20 shrink-0 text-[11px] font-semibold text-stone-500">{ITEM_LABEL[it.type]}</span>
                  <div className="min-w-0 flex-1">
                    <ItemFields it={it} catalog={catalog} set={(x) => setSection(i, {...s, items: s.items.map((y, k) => (k === j ? x : y))})} />
                  </div>
                  <div className="flex flex-col">
                    <button type="button" aria-label="Lên" disabled={j === 0} onClick={() => setSection(i, {...s, items: move(s.items, j, -1)})} className="rounded p-1 text-stone-400 hover:bg-stone-100 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button type="button" aria-label="Xuống" disabled={j === s.items.length - 1} onClick={() => setSection(i, {...s, items: move(s.items, j, 1)})} className="rounded p-1 text-stone-400 hover:bg-stone-100 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                    <button type="button" aria-label="Xóa mục" onClick={() => setSection(i, {...s, items: s.items.filter((_, k) => k !== j)})} className="rounded p-1 text-rose-500 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </li>
              ))}
            </ol>
            {s.items.length < MAX_ITEMS && (
              <div className="flex flex-wrap gap-1 text-xs">
                {(Object.keys(ITEM_LABEL) as PlanItem['type'][]).map((t) => (
                  <button key={t} type="button" data-testid={`add-${t}`} onClick={() => setSection(i, {...s, items: [...s.items, newItem(t)]})} className="flex items-center gap-1 rounded-full border border-[#DCD9D0] px-2.5 py-1 text-stone-700 hover:bg-stone-50">
                    <Plus className="h-3 w-3" /> {ITEM_LABEL[t]}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-1 rounded-lg border border-dashed border-violet-200 bg-violet-50/40 p-2 text-xs">
              <button type="button" data-testid="ai-suggest" disabled={!saved || dirty || !hubClassId || st?.loading} onClick={() => void askAi(s)} className="flex items-center gap-1 self-start rounded-lg bg-violet-600 px-2.5 py-1 font-semibold text-white disabled:opacity-40">
                <Sparkles className="h-3.5 w-3.5" /> {st?.loading ? 'AI đang xem kết quả lớp…' : 'AI gợi ý sửa phần này'}
              </button>
              {(!saved || dirty) && <span className="text-stone-500">Lưu giáo án trước khi nhờ AI gợi ý.</span>}
              {saved && !dirty && !hubClassId && <span className="text-stone-500">Chọn lớp ở trên để AI đọc kết quả học của lớp đó.</span>}
              {st?.metrics && (
                <span data-testid="section-metrics" className="text-stone-600">
                  {st.metrics.attemptedRate > 0
                    ? `Lớp đã làm: ${Math.round(st.metrics.attemptedRate * 100)}% học sinh · đúng lần đầu ${st.metrics.firstTryRate === null ? '—' : `${Math.round(st.metrics.firstTryRate * 100)}%`} · ${st.metrics.avgHints} gợi ý/câu${st.metrics.weakestKc ? ` · yếu nhất: ${s.kcs.find((k) => k.id === st.metrics?.weakestKc)?.label ?? st.metrics.weakestKc}` : ''}`
                    : 'Chưa có kết quả học của lớp cho phần này (dạy bằng giáo án này và để học sinh học lại sau giờ).'}
                </span>
              )}
              {st?.note && <span data-testid="ai-note" className="text-stone-600">{st.note}</span>}
              {st?.list && st.list.length > 0 && st.grounded === false && <span data-testid="ai-ungrounded" className="font-semibold text-amber-800">Gợi ý chung: lớp chưa có số liệu cho phần này, AI chưa dựa trên kết quả của lớp.</span>}
              {st?.list?.map((sg) => (
                <div key={sg.id} data-testid="suggestion" className="flex items-start gap-2 rounded-lg bg-white p-2">
                  <div className="min-w-0 flex-1">
                    <b>{SG_LABEL[sg.type]}:</b> {describe(sg, catalog)}
                    <div className="text-stone-500">Vì: {sg.rationale}</div>
                  </div>
                  <button type="button" data-testid="apply-suggestion" onClick={() => void apply(s.id, sg)} className="rounded-lg border border-violet-300 px-2 py-0.5 text-violet-800 hover:bg-violet-50">Áp dụng</button>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {body.sections.length < MAX_SECTIONS && (
        <button type="button" data-testid="add-section" onClick={() => setBody({...body, sections: [...body.sections, blankSection(body.sections.length + 1)]})} className="flex items-center gap-1 self-start rounded-lg border border-[#DCD9D0] bg-white px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50">
          <Plus className="h-4 w-4" /> Thêm phần
        </button>
      )}

      {problems.length > 0 && dirty && (
        <ul data-testid="plan-problems" className="list-disc rounded-lg bg-amber-50 py-2 pl-6 pr-3 text-xs text-amber-900">
          {problems.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}
      {error && <p data-testid="plan-error" role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-[#E6E4DD] bg-[#F7F6F2]/95 py-2">
        <button data-testid="plan-save" disabled={busy || !dirty || problems.length > 0} onClick={() => void save()} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
          <Save className="h-4 w-4" /> {saved ? 'Lưu thay đổi' : 'Tạo giáo án'}
        </button>
        {saved && <span data-testid="plan-version" className="text-xs text-stone-500">Phiên bản {saved.version}{dirty ? ' · có thay đổi chưa lưu' : ' · đã lưu'}</span>}
        <label className="ml-auto flex items-center gap-1 text-xs text-stone-600">
          Lớp để AI xem kết quả:
          <select data-testid="plan-class" value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-lg border border-[#DCD9D0] bg-white px-2 py-1">
            <option value="">(chọn lớp)</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}
