'use client';

import React, {useEffect, useState} from 'react';
import {Plus, Sparkles, Trash2} from 'lucide-react';
import {HubError, hub, type Question, type QuestionType, type Resource} from '../lib/hub';
import {KIND_LABEL} from './ResourceList';

const TYPE_LABEL: Record<QuestionType, string> = {choice: 'Trắc nghiệm', short: 'Gõ đáp số', essay: 'Tự luận có đáp số', open: 'Tự luận không đáp án'};

/** KC như hub (hub/schemas.kc_id): môn + nhãn bỏ dấu. */
export function kcId(subject: string, label: string): string {
  const folded = label.replace(/đ/g, 'd').replace(/Đ/g, 'D').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return `${subject.toLowerCase()}-${folded.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`.slice(0, 80).replace(/-+$/, '');
}

function PageThumb({id, page}: {id: string; page: number}) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    hub.pageBlobUrl(id, page).then((u) => alive && setSrc(u)).catch(() => alive && setSrc(null));
    return () => {
      alive = false;
    };
  }, [id, page]);
  return src ? <img src={src} alt={`Trang ${page + 1}`} className="h-40 rounded border border-[#E6E4DD] object-contain" /> : <div className="flex h-40 w-28 items-center justify-center rounded border border-dashed text-xs text-stone-400">Trang {page + 1}</div>;
}

/** Xem trang và duyệt danh sách câu của một bài tập / đề (slide chỉ xem trang). */
export function ResourceEditor({id}: {id: string}) {
  const [res, setRes] = useState<Resource | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quick, setQuick] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    hub.resource(id)
      .then((r) => {
        setRes(r);
        setQuestions(r.body?.questions || []);
      })
      .catch((e) => setError(e instanceof HubError ? e.message : 'Không tải được tài nguyên.'));
  }, [id]);

  if (!res) return <div className="text-sm text-stone-500">{error || 'Đang tải…'}</div>;

  const set = (i: number, patch: Partial<Question>) => setQuestions((qs) => qs.map((q, k) => (k === i ? {...q, ...patch} : q)));
  const nextId = () => `q${Math.max(0, ...questions.map((q) => Number(q.id.replace(/\D/g, '')) || 0)) + 1}`;

  const extract = async () => {
    setBusy(true);
    setNote(null);
    try {
      const out = await hub.extract(id);
      if (out.source === 'offline' || !out.questions.length) setNote('AI chưa đọc được đề. Dùng ô tự khai bên dưới (VD: 1B 2C 3: x=2 4: tự luận).');
      else {
        setQuestions(out.questions);
        setNote(`AI đề xuất ${out.questions.length} câu. Kiểm tra loại câu và đáp án trước khi lưu.`);
      }
    } catch (e) {
      setError(e instanceof HubError ? e.message : 'Không gọi được AI.');
    } finally {
      setBusy(false);
    }
  };

  const applyQuick = async () => {
    try {
      setQuestions(await hub.quickKey(quick));
    } catch (e) {
      setError(e instanceof HubError ? e.message : 'Không đọc được ô tự khai.');
    }
  };

  const save = async () => {
    setError(null);
    setNote(null);
    const clean = questions.map((q) => {
      const out: Question = {id: q.id, type: q.type, label: q.label || q.id, text: q.text || q.label || q.id, kcs: q.kcs || []};
      if (q.page !== undefined) out.page = q.page;
      if (q.box) out.box = q.box;
      if (q.type === 'choice') out.options = (q.options || []).filter((o) => o.trim());
      if (q.type !== 'open' && q.answer) out.answer = q.answer;
      return out;
    });
    try {
      const saved = await hub.save(id, {title: res.title, subject: res.subject, kind: res.kind, questions: clean}, res.version);
      setRes({...res, version: saved.version});
      setNote(`Đã lưu (phiên bản ${saved.version}).`);
    } catch (e) {
      setError(e instanceof HubError ? e.message : 'Không lưu được.');
    }
  };

  const f = 'rounded border border-[#DCD9D0] px-2 py-1 text-xs';
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">{res.title}</h1>
        <div className="text-xs text-stone-500">{KIND_LABEL[res.kind]} · {res.pages.length} trang · phiên bản {res.version}</div>
      </div>
      {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      {note && <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">{note}</div>}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {res.pages.map((p) => (
          <PageThumb key={p.page} id={id} page={p.page} />
        ))}
      </div>

      {res.kind !== 'slides' && (
        <div className="flex flex-col gap-2 rounded-2xl border border-[#E6E4DD] bg-white p-3">
          <div className="flex flex-wrap items-center gap-2">
            <button data-testid="extract" disabled={busy || !res.pages.length} onClick={extract} className="flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">
              <Sparkles className="h-3.5 w-3.5" /> {busy ? 'AI đang đọc…' : 'AI tách câu'}
            </button>
            <input data-testid="quick-key" className={`${f} min-w-64 flex-1`} placeholder="Ô tự khai: 1B 2C 3: x=2 4: tự luận 5= 12" value={quick} onChange={(e) => setQuick(e.target.value)} />
            <button data-testid="quick-key-apply" disabled={!quick.trim()} onClick={applyQuick} className="rounded-lg border border-[#DCD9D0] px-3 py-1.5 text-xs disabled:opacity-40">Dùng ô tự khai</button>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="text-stone-500">
              <tr><th>Nhãn</th><th>Loại</th><th>Nội dung</th><th>Phương án (phẩy)</th><th>Đáp án</th><th>KC</th><th /></tr>
            </thead>
            <tbody>
              {questions.map((q, i) => (
                <tr key={q.id} data-testid="question-row" className="border-t border-[#E6E4DD] align-top">
                  <td className="py-1"><input className={`${f} w-16`} value={q.label} onChange={(e) => set(i, {label: e.target.value})} /></td>
                  <td>
                    <select className={f} value={q.type} onChange={(e) => set(i, {type: e.target.value as QuestionType})}>
                      {(Object.keys(TYPE_LABEL) as QuestionType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                    </select>
                  </td>
                  <td><textarea className={`${f} w-full`} rows={2} value={q.text} onChange={(e) => set(i, {text: e.target.value})} /></td>
                  <td>{q.type === 'choice' && <input className={`${f} w-36`} value={(q.options || []).join(', ')} onChange={(e) => set(i, {options: e.target.value.split(',').map((o) => o.trim())})} />}</td>
                  <td>
                    {q.type === 'choice' ? (
                      <select className={f} value={q.answer ?? ''} onChange={(e) => set(i, {answer: e.target.value})}>
                        <option value="">—</option>
                        {(q.options || []).map((o, k) => <option key={k} value={String(k)}>{String.fromCharCode(65 + k)}. {o}</option>)}
                      </select>
                    ) : q.type !== 'open' ? (
                      <input className={`${f} w-28`} placeholder="x = 2" value={q.answer ?? ''} onChange={(e) => set(i, {answer: e.target.value})} />
                    ) : (
                      <span className="text-stone-400">GV chấm</span>
                    )}
                  </td>
                  <td>
                    <input className={`${f} w-32`} placeholder="Phương trình, …" value={(q.kcs || []).map((k) => k.label).join(', ')}
                      onChange={(e) => set(i, {kcs: e.target.value.split(',').map((l) => l.trim()).filter(Boolean).map((label) => ({id: kcId(res.subject, label), label}))})} />
                  </td>
                  <td><button aria-label="Xóa câu" onClick={() => setQuestions((qs) => qs.filter((_, k) => k !== i))} className="p-1 text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-2">
            <button onClick={() => setQuestions((qs) => [...qs, {id: nextId(), type: 'essay', label: `Câu ${qs.length + 1}`, text: '', kcs: []}])} className="flex items-center gap-1 rounded-lg border border-[#DCD9D0] px-3 py-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> Thêm câu
            </button>
            <button data-testid="save" disabled={!questions.length} onClick={save} className="ml-auto rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40">Lưu</button>
          </div>
        </div>
      )}
    </div>
  );
}
