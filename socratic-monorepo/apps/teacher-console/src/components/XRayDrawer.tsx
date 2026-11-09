'use client';

import React, {useEffect, useRef, useState} from 'react';
import {X} from 'lucide-react';
import {HubError, hub, supportReason, type GridRow, type Question, type StudentMetrics} from '../lib/hub';
import {StatusPill} from './ClassMetricsPanel';

interface Item {
  key: string;
  assignment: string;
  question: Question | null;
  row: GridRow;
}

const MAX_RUNS = 4;
const clip = (t: string, n = 140) => (t.length > n ? `${t.slice(0, n)}…` : t);

/** Câu trả lời của học sinh dạng đọc được: trắc nghiệm lấy chữ của phương án, tự luận lấy các dòng đã xác nhận. */
export function answerText(row: GridRow, q: Question | null): string {
  if (row.mode === 'choice' && row.answer !== null && q?.options) return q.options[Number(row.answer)] ?? row.answer;
  if (row.confirmed?.length) return row.confirmed.join('\n');
  return row.answer ?? (row.mode === 'photo' ? '(bài chụp ảnh)' : '—');
}

/**
 * Ngăn kéo "X-quang nhận thức": trượt từ bên phải, không rời trang ma trận. Cho thấy chính các lần làm bài của học sinh
 * (đáp án, kết quả chấm, nhận xét của máy chấm) ở các lượt giao gần nhất của lớp, ưu tiên các câu thuộc kiến thức được chọn.
 */
export function XRayDrawer({student, kcId, hubClassId, kcLabel, onClose}: {student: StudentMetrics; kcId: string | null; hubClassId: string; kcLabel: (id: string) => string; onClose: () => void}) {
  const [shown, setShown] = useState(false);
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    setItems(null);
    setError(null);
    (async () => {
      const runs = (await hub.classRuns(hubClassId)).sort((a, b) => b.openedAt - a.openedAt).slice(0, MAX_RUNS);
      const out: Item[] = [];
      for (const run of runs) {
        const [asg, rows] = await Promise.all([hub.resource(run.assignmentId), hub.runSubmissions(run.runId)]);
        for (const row of rows.filter((r) => r.studentId === student.studentId)) {
          out.push({key: `${run.runId}:${row.submissionId}`, assignment: asg.title, question: asg.body?.questions.find((q) => q.id === row.questionId) ?? null, row});
        }
      }
      if (alive) setItems(out);
    })().catch((e) => alive && (setError(e instanceof HubError ? e.message : 'Không tải được bài làm.'), setItems([])));
    return () => {
      alive = false;
    };
  }, [hubClassId, student.studentId]);

  const matching = kcId && items ? items.filter((i) => i.question?.kcs.some((k) => k.id === kcId)) : null;
  const shownItems = matching && matching.length ? matching : items;
  const reasons = student.supportReasons.map((r) => supportReason(r, kcLabel));

  return (
    <div className="fixed inset-0 z-40" data-testid="xray">
      <div className={`absolute inset-0 bg-ink/30 transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} aria-hidden />
      <aside role="dialog" aria-modal="true" aria-label={`X-quang nhận thức: ${student.name}`} className={`absolute right-0 top-0 flex h-full w-full max-w-[440px] flex-col overflow-y-auto border-l border-rule bg-paper shadow-2xl transition-transform duration-300 ease-out ${shown ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-start gap-3 border-b border-rule p-5">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[.14em] text-mute">X-quang nhận thức</div>
            <h2 className="truncate font-serif text-2xl font-medium">{student.name}</h2>
            {kcId && <div className="mt-1 text-sm text-mute">Đang xem: {kcLabel(kcId)}</div>}
          </div>
          <button ref={closeRef} data-testid="xray-close" aria-label="Đóng" onClick={onClose} className="rounded-lg p-1.5 text-mute hover:bg-sunk">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-5 p-5">
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              ['Đúng lần đầu', student.firstTryRate === null ? '—' : `${Math.round(student.firstTryRate * 100)}%`],
              ['Gợi ý / câu', String(student.hintsPerItem)],
              ['Phút học', String(student.minutes)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-rule bg-white py-2 shadow-card">
                <div className="font-mono text-lg">{v}</div>
                <div className="text-[10px] uppercase tracking-wider text-mute">{k}</div>
              </div>
            ))}
          </div>

          {reasons.length > 0 && (
            <ul data-testid="xray-reasons" className="rounded-xl border border-stuck-bd bg-stuck-bg px-3 py-2 text-sm text-stuck-fg">
              {reasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
          )}

          <section>
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-mute">Mức nắm vững theo kiến thức</h3>
            {Object.keys(student.mastery).length === 0 && <p className="text-sm text-mute">Chưa có số liệu.</p>}
            {Object.entries(student.mastery).map(([id, p]) => (
              <div key={id} className={`border-t border-hair py-2 ${id === kcId ? 'font-semibold' : ''}`}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{kcLabel(id)}</span>
                  <StatusPill p={p} />
                </div>
                <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-sunk"><div className="h-full rounded-full bg-ink" style={{width: `${Math.round(p * 100)}%`}} /></div>
              </div>
            ))}
          </section>

          <section>
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-mute">Các lần làm bài gần nhất</h3>
            {items === null && <p className="text-sm text-mute">Đang tải bài làm…</p>}
            {error && <p role="alert" className="text-sm text-stuck-fg">{error}</p>}
            {items && items.length === 0 && !error && <p data-testid="xray-empty" className="text-sm text-mute">Em chưa nộp câu nào trong các lượt giao gần đây của lớp.</p>}
            {kcId && matching && matching.length === 0 && items && items.length > 0 && <p className="mb-2 text-xs text-mute">Chưa có câu nào gắn kiến thức này; hiện mọi câu em đã làm.</p>}
            <ol className="flex flex-col gap-3">
              {shownItems?.map(({key, assignment, question, row}) => {
                const wrong = row.score !== null && row.score < 0.5;
                const right = row.score !== null && row.score >= 0.5;
                return (
                  <li key={key} data-testid="xray-item" className="rounded-xl border border-rule bg-white p-3 shadow-card">
                    <div className="flex items-center justify-between gap-2 text-[11px] text-mute">
                      <span className="truncate">{assignment} · {question?.label ?? 'Câu hỏi'}</span>
                      <span className={`rounded-full border px-2 py-0.5 font-medium ${right ? 'border-mastery-bd bg-mastery-bg text-mastery-fg' : wrong ? 'border-stuck-bd bg-stuck-bg text-stuck-fg' : 'border-hint-bd bg-hint-bg text-hint-fg'}`}>
                        {right ? 'Đúng' : wrong ? 'Sai' : row.status === 'pending_teacher' ? 'Chờ duyệt' : 'Chưa chấm'}
                      </span>
                    </div>
                    {question && <p className="mt-1.5 text-sm">{clip(question.text.replace(/\$/g, ''))}</p>}
                    <p className="mt-2 whitespace-pre-wrap rounded-lg bg-sunk px-2.5 py-1.5 font-mono text-xs">{answerText(row, question)}</p>
                    {row.grade?.summary && <p className="mt-2 border-l-2 border-hint-fg pl-2.5 font-serif text-sm italic text-mute">{row.grade.summary}</p>}
                    {typeof row.grade?.first_error === 'number' && <p className="mt-1 text-xs text-stuck-fg">Sai từ dòng {row.grade.first_error + 1}.</p>}
                    {row.attempt > 1 && <p className="mt-1 text-[11px] text-mute">Lần làm thứ {row.attempt}</p>}
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      </aside>
    </div>
  );
}
