'use client';

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Lightbulb, Send} from 'lucide-react';
import type {LessonPlan, LessonQuestion, LessonScene} from '@socratic/types';
import {MathView} from '../common/MathView';
import {MathText} from '../ui/MathText';
import {fetchLesson, sendLessonTurn} from '../../utils/lessonApi';

interface ChatMessage {role: 'student' | 'tutor'; text: string}
type LoadState = 'loading' | 'ready' | 'error';

export function LessonChat() {
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [load, setLoad] = useState<LoadState>('loading');
  const [reload, setReload] = useState(0);
  const [questionId, setQuestionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [points, setPoints] = useState(0);
  const [basicMode, setBasicMode] = useState(false);
  // Same message again before an acknowledged result => same request id (server dedupes).
  const pending = useRef<{key: string; id: string} | null>(null);
  // State updates lag a same-tick double press; a ref does not.
  const inFlight = useRef(false);

  const loadPlan = useCallback(async (signal: AbortSignal, keepQuestion: boolean) => {
    try {
      const next = await fetchLesson(signal);
      setPlan(next);
      setLoad('ready');
      if (!keepQuestion) setQuestionId(next.scenes[0]?.questions[0]?.id ?? null);
    } catch {
      if (!signal.aborted) setLoad('error');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoad('loading');
    void loadPlan(controller.signal, false);
    return () => controller.abort();
  }, [loadPlan, reload]);

  const scene: LessonScene | undefined = plan?.scenes.find(s => s.questions.some(q => q.id === questionId));
  const question: LessonQuestion | undefined = scene?.questions.find(q => q.id === questionId);

  const submit = async (kind: 'ANSWER' | 'HINT') => {
    if (!plan || !scene || !question || busy || inFlight.current) return;
    const message = kind === 'HINT' ? '' : text.trim();
    if (kind === 'ANSWER' && !message) return;
    const key = `${question.id}|${kind}|${message}`;
    if (kind === 'HINT' || pending.current?.key !== key) pending.current = {key, id: crypto.randomUUID()};
    const requestId = pending.current.id;
    inFlight.current = true;
    setBusy(true);
    setMessages(m => [...m, ...(message ? [{role: 'student' as const, text: message}] : []), {role: 'tutor', text: ''}]);
    const controller = new AbortController();
    const result = await sendLessonTurn(
      {lesson_id: plan.lesson_id, scene_id: scene.id, question_id: question.id, kind, message, request_id: requestId},
      chunk => setMessages(m => [...m.slice(0, -1), {role: 'tutor', text: m[m.length - 1].text + chunk}]),
      controller.signal,
    );
    setMessages(m => [...m.slice(0, -1), {role: 'tutor', text: result.tutor_text}]);
    inFlight.current = false;
    setBusy(false);
    if (!result.acknowledged) return; // keep the input; retry reuses the same request id
    pending.current = null;
    if (kind === 'ANSWER') setText('');
    setBasicMode(result.source === 'FALLBACK');
    if (result.status === 'VERIFIED_CORRECT') {
      setPoints(p => p + result.points);
      void loadPlan(new AbortController().signal, true); // reveals the formula once solved
    }
    if (result.next_question_id) setQuestionId(result.next_question_id);
  };

  if (load === 'loading') return <div role="status" className="p-6 text-sm text-stone-600">Đang chuẩn bị bài học từ bảng…</div>;
  if (load === 'error') {
    return (
      <div role="alert" className="p-6 text-sm text-stone-700">
        Chưa tải được bài học. <button type="button" className="underline" onClick={() => setReload(n => n + 1)}>Thử lại</button>
      </div>
    );
  }
  if (!plan || plan.scenes.length === 0) {
    return <div className="p-6 text-sm text-stone-600">Chưa có nội dung bảng cho buổi học này. Khi thầy cô lưu bài giảng, bài học sẽ hiện ở đây.</div>;
  }

  return (
    <section data-testid="lesson-chat" className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-2">
        <h3 className="font-display text-xl text-stone-900">{plan.title}</h3>
        <div className="flex items-center gap-2 text-xs font-mono">
          {basicMode && <span className="px-2 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-800">Chế độ cơ bản</span>}
          <span data-testid="lesson-points" className="px-2 py-0.5 rounded border border-[#E6E4DD] bg-stone-50">{points} điểm</span>
        </div>
      </header>

      {scene && (
        <div className="rounded-2xl border border-[#E6E4DD] bg-stone-50 p-4">
          <div className="text-sm font-medium text-stone-900">{scene.title}</div>
          <p className="mt-1 text-sm text-stone-600"><MathText text={scene.concept} /></p>
          <div className="mt-3 min-h-[2.5rem] rounded-xl bg-white border border-[#E6E4DD] p-3 text-center">
            {scene.latex
              ? <MathView latex={scene.latex} displayMode={false} />
              : <span className="text-xs text-stone-500">Công thức đang được ẩn — em nhớ lại xem thầy cô đã viết gì nhé.</span>}
          </div>
        </div>
      )}

      {question && <div className="text-sm font-medium text-stone-800">{question.prompt}</div>}

      <div className="flex flex-col gap-2" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.role === 'tutor' ? 'self-start bg-white border border-[#E6E4DD] text-stone-800' : 'self-end bg-stone-900 text-white'}`}>
            {m.text ? <MathText text={m.text} /> : '…'}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          data-testid="lesson-input" value={text} disabled={busy} maxLength={400}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void submit('ANSWER'); }}
          placeholder="Trả lời của em…"
          className="flex-1 rounded-xl border border-[#E6E4DD] bg-white px-3 py-2 text-sm"
        />
        <button type="button" data-testid="lesson-hint" disabled={busy} onClick={() => void submit('HINT')}
          className="inline-flex items-center gap-1 rounded-xl border border-[#E6E4DD] px-3 py-2 text-xs text-stone-700 cursor-pointer">
          <Lightbulb className="w-3.5 h-3.5" /> Gợi ý
        </button>
        <button type="button" data-testid="lesson-send" disabled={busy} onClick={() => void submit('ANSWER')}
          className="inline-flex items-center gap-1 rounded-xl bg-stone-900 px-3 py-2 text-xs text-white cursor-pointer">
          <Send className="w-3.5 h-3.5" /> Gửi
        </button>
      </div>
    </section>
  );
}
