'use client';

import React, {useEffect, useState} from 'react';
import {X} from 'lucide-react';
import type {MyAssignment, MyResource, PeriodPackage, StudentSubmissionView} from '@socratic/types/src/assignments';
import {LessonChat} from '../companion/LessonChat';
import {HubApiError, hubApi, loadStudent, saveStudent, type HubStudent} from '../../utils/hubApi';
import {LoginForm, StatusBadge} from './AssignmentPage';
import {PageViewer} from './PageViewer';

type Tab = 'assignments' | 'resources' | 'periods';
const PHASE: Record<string, string> = {in_class: 'Đang làm trên lớp', homework: 'Bài về nhà', closed: 'Đã hết hạn'};

/** Bài của em / bài mẫu cả lớp đã chữa: ảnh vở, nét chữa của thầy cô, dòng sai đầu tiên. */
function SubmissionModal({id, example, onClose}: {id: string; example: boolean; onClose: () => void}) {
  const [sub, setSub] = useState<StudentSubmissionView | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (example ? hubApi.example(id) : hubApi.mySubmission(id)).then((s) => {
      setSub(s);
      if (s.photo) hubApi.submissionUrl(id).then(setUrl).catch(() => setError('Không tải được ảnh bài.'));
    }).catch((e) => setError(e instanceof HubApiError ? e.message : 'Không mở được bài.'));
  }, [id, example]);
  const first = (sub?.grade as {first_error?: number | null} | null)?.first_error ?? null;
  const strokes = (sub?.correction?.strokes || []) as {p: [number, number][]; c: string; w: number}[];
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-900/90 p-3">
      <div className="flex items-center gap-2 text-white">
        <span className="text-sm font-semibold">{example ? `Bài mẫu ${sub?.label ?? ''}` : 'Bài của em'}</span>
        <button aria-label="Đóng" onClick={onClose} className="ml-auto rounded bg-white/90 p-1 text-stone-800"><X className="h-4 w-4" /></button>
      </div>
      {error && <p className="text-xs text-rose-300">{error}</p>}
      <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2 overflow-auto md:flex-row">
        {url && (
          <div className="relative self-start">
            <img src={url} alt="Bài làm" className="block max-w-full bg-white md:max-w-xl" />
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none">
              {strokes.map((s, i) => <polyline key={i} points={s.p.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={s.c} strokeWidth={s.w / 600} />)}
            </svg>
          </div>
        )}
        {sub?.confirmed && (
          <ol className="list-decimal rounded bg-white p-3 pl-7 font-mono text-xs text-stone-800">
            {sub.confirmed.map((l, i) => <li key={i} className={i === first ? 'font-bold text-rose-700' : ''}>{l}</li>)}
          </ol>
        )}
      </div>
    </div>
  );
}

function RunCard({a, onOpen, onLesson}: {a: MyAssignment & {lessonAvailable?: boolean}; onOpen: (id: string, example: boolean) => void; onLesson?: () => void}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-stone-900">{a.title}</span>
        {a.score10 !== null && <span className="rounded bg-stone-100 px-1.5 py-0.5 text-xs font-semibold">{a.score10}/10</span>}
        <span className="ml-auto text-xs text-stone-500">{PHASE[a.phase]}{a.phase === 'homework' && a.dueAt ? ` · hạn ${new Date(a.dueAt * 1000).toLocaleDateString('vi-VN')}` : ''}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
        {a.questions.map((q) => <span key={q.questionId} className="flex items-center gap-1">{q.label} {q.status ? <StatusBadge mine={q} /> : <span className="text-stone-400">chưa làm</span>}</span>)}
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {a.phase !== 'closed' && <a href={`/a/${a.code}`} className="rounded-lg bg-blue-600 px-3 py-1 font-semibold text-white">Làm tiếp</a>}
        {a.corrections.map((c) => <button key={c.submissionId} onClick={() => onOpen(c.submissionId, false)} className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700">Thầy cô chữa bài em ({c.questionId})</button>)}
        {a.classExamples.map((c) => <button key={c.submissionId} onClick={() => onOpen(c.submissionId, true)} className="rounded-lg border border-stone-200 px-2 py-1">Chữa trên lớp: {c.label}</button>)}
        {onLesson && <button onClick={onLesson} className="rounded-lg bg-emerald-600 px-3 py-1 font-semibold text-white">Học lại với gia sư</button>}
      </div>
    </div>
  );
}

/** Tab "Lớp của em": bài được giao, tài liệu các tiết, gói cuối tiết (phần chữa, học lại với gia sư Socratic). */
export function HubHome() {
  const [student, setStudent] = useState<HubStudent | null>(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>('assignments');
  const [assignments, setAssignments] = useState<MyAssignment[] | null>(null);
  const [resources, setResources] = useState<MyResource[] | null>(null);
  const [periods, setPeriods] = useState<PeriodPackage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<MyResource | null>(null);
  const [opened, setOpened] = useState<{id: string; example: boolean} | null>(null);
  const [lessonRun, setLessonRun] = useState<string | null>(null);

  useEffect(() => {
    setStudent(loadStudent());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!student) return;
    const fail = (e: unknown) => {
      if (e instanceof HubApiError && e.status === 401) setStudent(null);
      setError(e instanceof HubApiError ? e.message : 'Không tải được dữ liệu lớp.');
    };
    hubApi.myAssignments().then(setAssignments).catch(fail);
    hubApi.myResources().then(setResources).catch(fail);
    hubApi.myPeriods().then(setPeriods).catch(fail);
  }, [student]);

  if (!ready) return null;
  if (!student) return <LoginForm onLogin={setStudent} />;
  if (lessonRun) {
    return (
      <div className="flex flex-col gap-2">
        <button onClick={() => setLessonRun(null)} className="self-start text-xs text-stone-500">← Về Lớp của em</button>
        <LessonChat source={{studentId: student.student.id, token: student.token, runId: lessonRun}} />
      </div>
    );
  }

  const tabBtn = (t: Tab, label: string) => (
    <button data-testid={`htab-${t}`} onClick={() => setTab(t)} className={`rounded-md px-3 py-1 text-xs ${tab === t ? 'bg-white font-semibold shadow-sm' : 'text-stone-500'}`}>{label}</button>
  );
  const empty = (text: string) => <p className="text-sm text-stone-500">{text}</p>;
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-stone-800">{student.student.name} · {student.student.className}</span>
        <button onClick={() => { saveStudent(null); setStudent(null); }} className="ml-auto text-xs text-stone-500 underline">Đổi học sinh</button>
      </div>
      <div className="flex gap-1 self-start rounded-lg bg-stone-100 p-1">
        {tabBtn('assignments', 'Bài tập')}
        {tabBtn('resources', 'Tài liệu của tiết')}
        {tabBtn('periods', 'Tiết học')}
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      {tab === 'assignments' && (assignments?.length === 0 ? empty('Chưa có bài nào được giao.')
        : assignments?.map((a) => <RunCard key={a.runId} a={a} onOpen={(id, example) => setOpened({id, example})} />))}
      {tab === 'resources' && (viewing ? (
        <div className="flex flex-col gap-2">
          <button onClick={() => setViewing(null)} className="self-start text-xs text-stone-500">← Danh sách tài liệu</button>
          <h3 className="font-semibold">{viewing.title}</h3>
          <PageViewer assignmentId={viewing.assignmentId} pages={viewing.pages} />
        </div>
      ) : resources?.length === 0 ? empty('Chưa có tài liệu nào thầy cô mở trên lớp.') : resources?.map((r) => (
        <button key={`${r.periodId}-${r.assignmentId}`} onClick={() => setViewing(r)} className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-3 text-left">
          <span className="font-semibold text-stone-900">{r.title}</span>
          <span className="text-xs text-stone-500">{r.periodTitle} · {r.pages.length} trang</span>
        </button>
      )))}
      {tab === 'periods' && (periods?.length === 0 ? empty('Chưa có tiết nào kết thúc.') : periods?.map((p) => (
        <div key={p.periodId} className="flex flex-col gap-2 rounded-xl bg-stone-50 p-3">
          <h3 className="text-sm font-bold text-stone-800">{p.title}{p.endedAt ? ` · ${new Date(p.endedAt * 1000).toLocaleDateString('vi-VN')}` : ''}</h3>
          {p.runs.map((r) => <RunCard key={r.runId} a={r} onOpen={(id, example) => setOpened({id, example})} onLesson={r.lessonAvailable ? () => setLessonRun(r.runId) : undefined} />)}
          {p.resources.map((r) => (
            <button key={r.assignmentId} onClick={() => { setViewing(r); setTab('resources'); }} className="self-start text-xs text-blue-700 underline">Tài liệu: {r.title}</button>
          ))}
        </div>
      )))}
      {opened && <SubmissionModal id={opened.id} example={opened.example} onClose={() => setOpened(null)} />}
    </section>
  );
}
