'use client';

import React, {useState} from 'react';
import {Download, FileText, Shuffle, X} from 'lucide-react';
import {answerLine, askSimilar, problemsToHtml, problemsToMarkdown, type Level, type SimilarProblem, type SimilarResponse} from '../../utils/similarProblems';
import {MathText} from '../ui/MathText';

interface Props {
  /** đề gốc đọc từ bảng lúc mở panel (rỗng nếu bảng chưa có gì); giáo viên sửa được */
  getSource: () => string;
  subject?: string | null;
  /** thay được khi kiểm thử */
  askFn?: typeof askSimilar;
}

const LEVELS: {id: Level; label: string}[] = [
  {id: 'same', label: 'Cùng mức'},
  {id: 'harder', label: 'Khó hơn'},
  {id: 'easier', label: 'Dễ hơn'},
];

const save = (name: string, text: string, type: string) => {
  const url = URL.createObjectURL(new Blob([text], {type}));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Sinh đề tương tự từ đề đang có trên bảng: N đề cùng dạng đổi số, AI viết còn máy tính lại đáp số để loại đề tính sai.
 * Xuất đề (và đáp án) ra HTML in được hoặc Markdown. Đề chưa kiểm chứng được vẫn hiện nhưng gắn nhãn rõ.
 */
export const SimilarProblemsPanel: React.FC<Props> = ({getSource, subject, askFn = askSimilar}) => {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState('');
  const [count, setCount] = useState(5);
  const [level, setLevel] = useState<Level>('same');
  const [title, setTitle] = useState('Đề luyện tập');
  const [withAnswers, setWithAnswers] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<SimilarResponse | null>(null);

  if (!open) {
    return (
      <button
        data-testid="similar-open"
        onClick={() => {
          setSource(getSource());
          setRes(null);
          setErr(null);
          setOpen(true);
        }}
        title="Sinh đề tương tự từ đề trên bảng"
        className="absolute left-3 bottom-[8.75rem] z-30 pointer-events-auto flex items-center gap-1.5 rounded-full bg-white/95 border border-[#DCD9D0] shadow-md px-3 py-1.5 text-[11px] font-medium text-stone-700 hover:bg-stone-50"
      >
        <Shuffle className="w-3.5 h-3.5" />
        Sinh đề
      </button>
    );
  }

  const generate = async () => {
    setBusy(true);
    setErr(null);
    setRes(null);
    try {
      const r = await askFn({source, count, level, subject});
      setRes(r);
      if (r.problems.length === 0) setErr(`${r.note ?? 'AI không trả được đề dùng được.'}${r.dropped ? ` (${r.dropped} đề bị loại vì đáp số tính lại không khớp)` : ''}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Không gọi được AI.');
    } finally {
      setBusy(false);
    }
  };
  const problems: SimilarProblem[] = res?.problems ?? [];
  const stamp = new Date().toISOString().slice(0, 10);

  return (
    <div data-testid="similar" className="absolute inset-0 z-40 flex items-center justify-center bg-stone-900/30 p-4 pointer-events-auto">
      <div className="flex max-h-full w-full max-w-3xl flex-col gap-3 overflow-hidden rounded-2xl border border-[#DCD9D0] bg-white p-4 shadow-xl">
        <div className="flex items-center gap-2">
          <Shuffle className="h-4 w-4 text-blue-600" />
          <h2 className="flex-1 text-sm font-semibold text-stone-900">Sinh đề tương tự</h2>
          <button data-testid="similar-close" onClick={() => setOpen(false)} className="rounded-full p-1 text-stone-500 hover:bg-stone-100" aria-label="Đóng">
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="flex flex-col gap-0.5 text-[11px] text-stone-500">
          Đề gốc (đọc từ bảng, có thể sửa hoặc dán đề khác)
          <textarea data-testid="similar-source" value={source} onChange={(e) => setSource(e.target.value)} rows={3} placeholder="Viết hoặc chọn đề trên bảng rồi mở lại, hoặc dán đề vào đây." className="rounded-md border border-stone-300 px-2 py-1.5 text-sm text-stone-900" />
        </label>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-0.5 text-[11px] text-stone-500">
            Số đề
            <select data-testid="similar-count" value={count} onChange={(e) => setCount(Number(e.target.value))} className="rounded-md border border-stone-300 bg-white px-2 py-1 text-sm text-stone-900">
              {[1, 2, 3, 4, 5, 6, 8].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-1" role="radiogroup" aria-label="Mức khó">
            {LEVELS.map((l) => (
              <button key={l.id} role="radio" aria-checked={level === l.id} data-testid={`similar-level-${l.id}`} onClick={() => setLevel(l.id)} className="rounded-lg border border-stone-300 px-2.5 py-1 text-xs font-medium text-stone-600 hover:bg-stone-50 aria-checked:border-blue-600 aria-checked:bg-blue-600 aria-checked:text-white">
                {l.label}
              </button>
            ))}
          </div>
          <button data-testid="similar-generate" onClick={() => void generate()} disabled={busy || source.trim().length < 3} className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-stone-300">
            {busy ? 'AI đang soạn đề…' : 'Sinh đề'}
          </button>
        </div>

        {err && (
          <p data-testid="similar-error" role="alert" className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs text-rose-700">
            {err}
          </p>
        )}

        {problems.length > 0 && (
          <>
            <div data-testid="similar-summary" className="flex flex-wrap items-center gap-2 text-[11px] text-stone-600">
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">{problems.filter((p) => p.status === 'verified').length} đề máy đã tính lại đáp số</span>
              {problems.some((p) => p.status === 'unverified') && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">{problems.filter((p) => p.status === 'unverified').length} đề chưa kiểm chứng được</span>}
              {res && res.dropped > 0 && <span className="rounded-full bg-stone-100 px-2 py-0.5">{res.dropped} đề bị loại vì đáp số lệch</span>}
              <span className="text-stone-400">Máy chỉ tính lại phép tính, không kiểm tra cách lập luận: hãy đọc lại trước khi giao.</span>
            </div>
            <ol data-testid="similar-list" className="min-h-0 flex-1 overflow-auto rounded-xl border border-stone-200 bg-stone-50/60 p-3">
              {problems.map((p, i) => (
                <li key={i} data-testid="similar-item" data-status={p.status} className="mb-3 last:mb-0">
                  <div className="text-sm text-stone-900">
                    <b>Câu {i + 1}.</b> <MathText text={p.statement} />
                    <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold ${p.status === 'verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{p.status === 'verified' ? '✓ đã tính lại' : 'chưa kiểm chứng'}</span>
                  </div>
                  <details className="mt-1 text-[13px] text-stone-700">
                    <summary className="cursor-pointer text-[11px] text-blue-700">Đáp số và lời giải</summary>
                    <div className="mt-1">
                      Đáp số: <b>{answerLine(p) || '(chưa có)'}</b>
                    </div>
                    <ol className="list-decimal pl-5">
                      {p.steps.map((s, k) => (
                        <li key={k}>
                          <MathText text={s} />
                        </li>
                      ))}
                    </ol>
                  </details>
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap items-center gap-2">
              <input data-testid="similar-title" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Tiêu đề đề" className="min-w-[8rem] flex-1 rounded-md border border-stone-300 px-2 py-1 text-sm" />
              <label className="flex items-center gap-1 text-xs text-stone-600">
                <input data-testid="similar-with-answers" type="checkbox" checked={withAnswers} onChange={(e) => setWithAnswers(e.target.checked)} />
                Kèm đáp án
              </label>
              <button data-testid="similar-html" onClick={() => save(`de-luyen-${stamp}.html`, problemsToHtml(title, problems, withAnswers), 'text/html;charset=utf-8')} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                <FileText className="h-3.5 w-3.5" />
                Tải bản in (HTML)
              </button>
              <button data-testid="similar-md" onClick={() => save(`de-luyen-${stamp}.md`, problemsToMarkdown(title, problems, withAnswers), 'text/markdown;charset=utf-8')} className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50">
                <Download className="h-3.5 w-3.5" />
                Tải Markdown
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
