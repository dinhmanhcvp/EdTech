'use client';

import React, {useCallback, useEffect, useState} from 'react';
import {Camera} from 'lucide-react';
import type {OcrResult, QuestionPublic, RunForStudent, SubmissionResult} from '@socratic/types/src/assignments';
import {HubApiError, hubApi, loadStudent, requestId, type HubStudent} from '../../utils/hubApi';
import {PageViewer} from './PageViewer';

type Mine = RunForStudent['mine'][string];
const errText = (e: unknown, fallback: string) => (e instanceof HubApiError ? e.message : fallback);

/** Nhập mã học sinh một lần, nhớ trên máy. */
export function LoginForm({onLogin}: {onLogin: (s: HubStudent) => void}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      onLogin(await hubApi.login(code.trim()));
    } catch (err) {
      setError(errText(err, 'Chưa đăng nhập được.'));
    }
  };
  return (
    <form onSubmit={submit} className="mx-auto flex max-w-sm flex-col gap-2 rounded-xl border border-stone-200 bg-white p-4">
      <label className="text-sm font-semibold text-stone-800" htmlFor="login-code">Mã học sinh</label>
      <input id="login-code" data-testid="login-code" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off"
        className="rounded-lg border border-stone-300 px-3 py-2 font-mono uppercase" placeholder="Mã thầy cô phát" />
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <button data-testid="login-submit" type="submit" disabled={!code.trim()} className="rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white disabled:opacity-50">Vào lớp</button>
    </form>
  );
}

export function StatusBadge({mine}: {mine?: {status: Mine['status'] | null; score: number | null} | null}) {
  if (!mine?.status) return null;
  if (mine.status === 'pending_teacher') return <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">Chờ thầy cô duyệt</span>;
  return mine.score === 1 ? <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-800">Đúng</span>
    : mine.score === 0 ? <span className="rounded bg-rose-100 px-1.5 py-0.5 text-xs text-rose-800">Sai</span>
    : <span className="rounded bg-sky-100 px-1.5 py-0.5 text-xs text-sky-800">Đã chấm {Math.round((mine.score ?? 0) * 100)}%</span>;
}

/** Thay chữ máy chưa chắc: lấy lần xuất hiện gần vị trí x (0–1 theo dòng) nhất. */
function replaceNear(line: string, from: string, to: string, x?: number) {
  const hits: number[] = [];
  for (let k = line.indexOf(from); k >= 0; k = line.indexOf(from, k + 1)) hits.push(k);
  if (!hits.length) return line;
  const target = (x ?? 0) * line.length;
  const at = hits.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a));
  return line.slice(0, at) + to + line.slice(at + from.length);
}

/** Màn xác nhận sau khi chụp vở: em sửa dòng máy đọc, chọn lại mọi chữ máy chưa chắc rồi mới nộp. */
function ConfirmBox({ocr, onSubmit, onCancel}: {ocr: OcrResult; onSubmit: (b: {lines: string[]; resolved: number[]; photoOnly: boolean}) => void; onCancel: () => void}) {
  const [lines, setLines] = useState(() => ocr.lines.map((l) => l.latex ?? l.text ?? ''));
  const [picked, setPicked] = useState<Record<number, string>>({});
  const pick = (i: number, value: string) => {
    const u = ocr.uncertain[i];
    const current = picked[i] ?? u.token;
    setLines((ls) => ls.map((l, n) => (n === u.line ? replaceNear(l, current, value, u.x) : l)));
    setPicked((p) => ({...p, [i]: value}));
  };
  const resolved = Object.keys(picked).map(Number).sort((a, b) => a - b);
  const ready = resolved.length === ocr.uncertain.length;
  return (
    <div data-testid="confirm-box" className="mt-2 flex flex-col gap-2 rounded-lg border border-blue-200 bg-blue-50 p-2">
      <p className="text-xs text-stone-700">Máy đọc vở của em như sau. Sửa nếu sai, chọn lại các chữ được tô vàng.</p>
      {lines.map((l, n) => (
        <input key={n} value={l} onChange={(e) => setLines((ls) => ls.map((x, k) => (k === n ? e.target.value : x)))} className="rounded border border-stone-300 bg-white px-2 py-1 font-mono text-sm" />
      ))}
      {ocr.uncertain.map((u, i) => (
        <div key={i} className="flex flex-wrap items-center gap-1 text-xs">
          <span className="text-stone-600">Dòng {u.line + 1}, chữ “{u.token}” là:</span>
          {[u.token, ...u.alternatives.filter((a) => a !== u.token)].map((v) => (
            <button key={v} type="button" onClick={() => pick(i, v)}
              className={`rounded px-2 py-0.5 font-mono ${picked[i] === v ? 'bg-blue-600 text-white' : 'bg-amber-200 text-stone-900'}`}>{v}</button>
          ))}
        </div>
      ))}
      <div className="flex gap-2">
        <button data-testid="confirm-submit" disabled={!ready} onClick={() => onSubmit({lines, resolved, photoOnly: false})} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Nộp bài</button>
        <button onClick={() => onSubmit({lines: [], resolved: [], photoOnly: true})} className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs">Máy đọc sai nhiều — chỉ nộp ảnh</button>
        <button onClick={onCancel} className="ml-auto text-xs text-stone-500">Chụp lại</button>
      </div>
    </div>
  );
}

function QuestionCard({run, q, mine, onResult}: {run: RunForStudent; q: QuestionPublic; mine?: Mine; onResult: (r: SubmissionResult) => void}) {
  const [text, setText] = useState('');
  const [ocr, setOcr] = useState<OcrResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errText(e, 'Chưa gửi được, thử lại.'));
    } finally {
      setBusy(false);
    }
  };
  const answer = (body: {choice?: number; text?: string}) => act(async () => onResult(await hubApi.answer(run.runId, {questionId: q.id, version: run.version, requestId: requestId(), ...body})));

  return (
    <div data-testid={`q-${q.id}`} className="rounded-xl border border-stone-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-stone-900">{q.label}</span>
        <StatusBadge mine={mine} />
      </div>
      {q.text && <p className="mt-1 whitespace-pre-wrap text-sm text-stone-700">{q.text}</p>}
      {q.type === 'choice' && (
        <div className="mt-2 flex flex-wrap gap-2">
          {(q.options || []).map((o, i) => (
            <button key={i} disabled={busy} onClick={() => answer({choice: i})} className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50">{`${'ABCDEF'[i]}. ${o}`}</button>
          ))}
        </div>
      )}
      {q.type === 'short' && (
        <div className="mt-2 flex gap-2">
          <input data-testid="short-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={200} className="flex-1 rounded-lg border border-stone-300 px-2 py-1.5 text-sm" placeholder="Đáp số" />
          <button data-testid="short-submit" disabled={busy || !text.trim()} onClick={() => answer({text: text.trim()})} className="rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white disabled:opacity-50">Gửi</button>
        </div>
      )}
      {(q.type === 'essay' || q.type === 'open') && !ocr && (
        <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-stone-800 px-3 py-1.5 text-xs font-semibold text-white">
          <Camera className="h-4 w-4" /> {busy ? 'Đang đọc vở…' : 'Chụp vở'}
          <input data-testid="photo-input" type="file" accept="image/*" capture="environment" className="hidden" disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) act(async () => setOcr(await hubApi.uploadPhoto(run.runId, q.id, run.version, f)));
            }} />
        </label>
      )}
      {ocr && (
        <ConfirmBox ocr={ocr} onCancel={() => setOcr(null)} onSubmit={(body) => act(async () => {
          onResult(await hubApi.confirm(run.runId, ocr.photoId, body));
          setOcr(null);
        })} />
      )}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

/** Trang làm bài khi quét QR trên bảng: `/a/<mã>`. */
export function AssignmentPage({code}: {code: string}) {
  const [student, setStudent] = useState<HubStudent | null>(null);
  const [ready, setReady] = useState(false);
  const [run, setRun] = useState<RunForStudent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStudent(loadStudent());
    setReady(true);
  }, []);

  const load = useCallback(() => {
    hubApi.byCode(code).then(setRun).catch((e) => {
      if (e instanceof HubApiError && e.status === 401) setStudent(null);
      setError(errText(e, 'Không mở được bài.'));
    });
  }, [code]);

  useEffect(() => {
    if (student) load();
  }, [student, load]);

  if (!ready) return null;
  if (!student) return <main className="p-4"><LoginForm onLogin={(s) => { setError(null); setStudent(s); }} /></main>;
  if (error) return <main className="p-4 text-center text-sm text-rose-700">{error}</main>;
  if (!run) return <main className="p-4 text-center text-sm text-stone-500">Đang mở bài…</main>;

  const setResult = (qid: string) => (r: SubmissionResult) => setRun((cur) => cur && {...cur, mine: {...cur.mine, [qid]: {status: r.status, score: r.score, attempt: r.attempt}}});
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-3 p-3">
      <header>
        <h1 className="text-lg font-bold text-stone-900">{run.title}</h1>
        <p className="text-xs text-stone-500">{student.student.name} · {student.student.className}
          {run.phase === 'homework' && run.dueAt ? ` · Hạn nộp ${new Date(run.dueAt * 1000).toLocaleString('vi-VN')}` : ''}</p>
      </header>
      {run.pages.length > 0 && <PageViewer assignmentId={run.id} pages={run.pages} />}
      {run.body.questions.map((q) => <QuestionCard key={q.id} run={run} q={q} mine={run.mine[q.id]} onResult={setResult(q.id)} />)}
    </main>
  );
}
