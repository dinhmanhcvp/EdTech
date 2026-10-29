'use client';

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {CheckCircle2, Monitor, XCircle} from 'lucide-react';
import {HubError, hub, type GridRow, type PeriodRun, type PeriodSummary} from '../lib/hub';

const STATUS_STYLE: Record<string, string> = {
  graded: 'bg-emerald-100 text-emerald-800',
  teacher_confirmed: 'bg-emerald-100 text-emerald-800',
  pending_teacher: 'bg-amber-100 text-amber-800',
};
const REASON: Record<string, string> = {three_wrong_in_a_row: 'sai 3 lần liền'};
const PHASE: Record<PeriodRun['phase'], string> = {in_class: 'Đang nhận bài', homework: 'Bài về nhà', closed: 'Đã hết hạn'};

function cell(row: GridRow | undefined): {text: string; status: string} {
  if (!row) return {text: '·', status: 'none'};
  if (row.status === 'pending_teacher') return {text: 'chờ', status: row.status};
  return {text: (row.score ?? 0) >= 0.5 ? 'đúng' : 'sai', status: row.status};
}

function Photo({submissionId}: {submissionId: string}) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    hub.submissionBlobUrl(submissionId).then(setSrc).catch(() => setSrc(null));
  }, [submissionId]);
  return src ? <img src={src} alt="Ảnh bài làm" className="max-h-48 rounded border border-[#E6E4DD] object-contain" /> : null;
}

function RunCard({run, rows, onChanged, live}: {run: PeriodRun; rows: GridRow[]; onChanged: () => void; live: boolean}) {
  const [error, setError] = useState<string | null>(null);
  const byCell = new Map(rows.map((r) => [`${r.studentId}:${r.questionId}`, r]));
  const pending = rows.filter((r) => r.status === 'pending_teacher');
  const act = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      onChanged();
    } catch (e) {
      setError(e instanceof HubError ? e.message : 'Thao tác chưa thành công.');
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[#E6E4DD] bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-stone-900">{run.title}</h3>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">{PHASE[run.phase]}</span>
        <span className="font-mono text-xs text-stone-500">mã {run.code}</span>
        {run.phase === 'in_class' && (
          <button data-testid={`close-${run.runId}`} onClick={() => act(() => hub.closeRun(run.runId))} className="ml-auto rounded-lg border border-[#DCD9D0] px-2.5 py-1 text-xs">
            Đóng nhận bài (thành bài về nhà)
          </button>
        )}
      </div>
      {error && <div className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs text-rose-700">{error}</div>}
      <div className="overflow-x-auto">
        <table data-testid={`grid-${run.runId}`} className="text-xs">
          <thead>
            <tr className="text-stone-500">
              <th className="pr-3 text-left">Học sinh</th>
              {run.metrics.questions.map((q) => <th key={q.questionId} className="px-1.5">{q.label}</th>)}
              <th className="px-1.5">Điểm</th>
            </tr>
          </thead>
          <tbody>
            {run.metrics.students.map((s) => (
              <tr key={s.studentId} className="border-t border-[#E6E4DD]">
                <td className="py-1 pr-3 font-medium text-stone-800">{s.name}</td>
                {run.metrics.questions.map((q) => {
                  const c = cell(byCell.get(`${s.studentId}:${q.questionId}`));
                  return (
                    <td key={q.questionId} className="px-1.5 text-center">
                      <span data-testid={`cell-${q.questionId}`} data-status={c.status} className={`rounded px-1.5 py-0.5 ${STATUS_STYLE[c.status] || 'text-stone-400'}`}>{c.text}</span>
                    </td>
                  );
                })}
                <td className="px-1.5 text-center">{s.score10 ?? '—'}</td>
              </tr>
            ))}
            <tr className="border-t border-[#E6E4DD] text-stone-500">
              <td className="py-1 pr-3">Tỉ lệ đúng</td>
              {run.metrics.questions.map((q) => <td key={q.questionId} className="text-center">{q.correctRate === null ? '—' : `${Math.round(q.correctRate * 100)}%`}</td>)}
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      {run.metrics.questions.some((q) => q.wrongAnswers.length) && (
        <div className="text-xs text-stone-600">
          <b>Đáp số sai hay gặp:</b>{' '}
          {run.metrics.questions.flatMap((q) => q.wrongAnswers.map((w) => <span key={q.questionId + w.answer} className="mr-2">{q.label}: <span>{`${w.answer} (${w.count})`}</span></span>))}
        </div>
      )}
      {pending.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold text-amber-800">Chờ giáo viên duyệt ({pending.length})</h4>
          {pending.map((r) => (
            <div key={r.submissionId} data-testid={`pending-${r.submissionId}`} className="flex flex-wrap gap-3 rounded-xl border border-amber-200 bg-amber-50 p-2">
              {r.hasPhoto && <Photo submissionId={r.submissionId} />}
              <div className="min-w-0 flex-1 text-xs">
                <div className="font-semibold text-stone-800">{r.name} · {run.metrics.questions.find((q) => q.questionId === r.questionId)?.label}</div>
                {(r.confirmed || (r.answer ? [r.answer] : [])).map((l, i) => <div key={i} className="font-mono text-stone-700">{l}</div>)}
                {r.grade?.summary && <div className="mt-1 text-stone-600">AI: {r.grade.summary}</div>}
                <div className="mt-2 flex gap-1.5">
                  <button data-testid="review-correct" onClick={() => act(() => hub.review(r.submissionId, 1))} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 font-semibold text-white"><CheckCircle2 className="h-3.5 w-3.5" /> Đúng</button>
                  <button data-testid="review-wrong" onClick={() => act(() => hub.review(r.submissionId, 0))} className="flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 font-semibold text-white"><XCircle className="h-3.5 w-3.5" /> Sai</button>
                  <button data-testid="review-half" onClick={() => act(() => hub.review(r.submissionId, 0.5))} className="rounded-lg border border-[#DCD9D0] px-2.5 py-1">Nửa điểm</button>
                  {live && r.hasPhoto && (
                    <button data-testid="show-on-board" onClick={() => act(() => hub.show(run.runId, r.submissionId))} className="ml-auto flex items-center gap-1 rounded-lg border border-blue-300 px-2.5 py-1 text-blue-700"><Monitor className="h-3.5 w-3.5" /> Chiếu lên bảng</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Bài tập của một tiết console: lưới học sinh × câu, hàng chờ duyệt, chiếu bài; khi tiết đã xong là phần tổng kết. */
export function AssignmentLive({periodId, live}: {periodId: string; live: boolean}) {
  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [rows, setRows] = useState<Record<string, GridRow[]>>({});
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const s = await hub.periodSummary(periodId);
      setSummary(s);
      const all = await Promise.all(s.runs.map((r) => hub.runSubmissions(r.runId)));
      setRows(Object.fromEntries(s.runs.map((r, i) => [r.runId, all[i]])));
      setError(null);
    } catch (e) {
      setError(e instanceof HubError ? e.message : 'Không tải được bài tập của tiết.');
    }
  }, [periodId]);

  useEffect(() => {
    void load();
    if (!live) return;
    const soon = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void load(), 300);
    };
    const stop = hub.streamTeacher((e) => {
      if (e.type === 'submission_update' || e.type === 'metric_delta') soon();
    });
    const poll = setInterval(() => void load(), 15000);
    return () => {
      stop();
      clearInterval(poll);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load, live]);

  if (error && !summary) return <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>;
  if (!summary) return <div className="text-sm text-stone-500">Đang tải bài tập…</div>;
  return (
    <div data-testid="assignment-live" className="flex flex-col gap-3">
      {error && <div className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs text-rose-700">{error} Đang thử lại…</div>}
      <h2 className="text-sm font-semibold text-stone-800">Bài tập trong tiết{summary.pending ? ` · ${summary.pending} bài chờ duyệt` : ''}</h2>
      {summary.runs.length === 0 && <p className="text-xs text-stone-500">Tiết này chưa giao bài tập nào.</p>}
      {summary.needsSupport.length > 0 && (
        <div data-testid="support" className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-800">
          Cần hỗ trợ: {summary.needsSupport.map((s) => <span key={s.studentId} className="mr-2">{s.name} ({s.reasons.map((r) => REASON[r] || 'nắm chưa chắc kiến thức').join(', ')})</span>)}
        </div>
      )}
      {summary.runs.map((r) => <RunCard key={r.runId} run={r} rows={rows[r.runId] || []} onChanged={() => void load()} live={live} />)}
    </div>
  );
}
