import {LessonPlanSchema, LessonTurnResultSchema, type LessonPlan, type LessonTurnRequest, type LessonTurnResult} from '@socratic/types';

const STUDENT_ID = 'student_default';

function authHeaders(): Record<string, string> {
  const token = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_STUDENT_CONTEXT_TOKEN : undefined;
  return token ? {Authorization: `Bearer ${token}`} : {};
}

export async function fetchLesson(signal: AbortSignal): Promise<LessonPlan> {
  const response = await fetch(`/api/v1/student/lesson/${STUDENT_ID}`, {cache: 'no-store', signal, headers: authHeaders()});
  if (!response.ok) throw new Error('lesson_unavailable');
  const parsed = LessonPlanSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error('lesson_unavailable');
  return parsed.data;
}

export const TURN_LOST: LessonTurnResult = {
  status: 'UNVERIFIED', points: 0, source: 'FALLBACK', next_question_id: null,
  tutor_text: 'Chưa nhận được phản hồi. Bài làm vẫn được giữ; thử lại nhé.',
};

/** Parse "event: x\ndata: {...}" blocks; returns the unconsumed tail. */
function drain(buffer: string, onEvent: (name: string, data: unknown) => void): string {
  const blocks = buffer.split('\n\n');
  const tail = blocks.pop() ?? '';
  for (const block of blocks) {
    const name = /^event: (.+)$/m.exec(block)?.[1];
    const data = /^data: (.+)$/m.exec(block)?.[1];
    if (!name || !data) continue;
    try { onEvent(name, JSON.parse(data)); } catch { /* ignore a malformed block */ }
  }
  return tail;
}

/** Streams the tutor reply. `acknowledged:false` means the result may be lost: retry with the same request_id. */
export async function sendLessonTurn(
  req: LessonTurnRequest, onToken: (text: string) => void, signal: AbortSignal,
): Promise<LessonTurnResult & {acknowledged: boolean}> {
  try {
    const response = await fetch(`/api/v1/student/lesson/${STUDENT_ID}/turn`, {
      method: 'POST', headers: {'Content-Type': 'application/json', ...authHeaders()}, body: JSON.stringify(req), signal,
    });
    if (!response.ok) return {...TURN_LOST, acknowledged: false};
    let result: LessonTurnResult | null = null;
    const handle = (name: string, data: unknown) => {
      if (name === 'token' && typeof (data as {text?: unknown}).text === 'string') onToken((data as {text: string}).text);
      if (name === 'done') {
        const parsed = LessonTurnResultSchema.safeParse(data);
        if (parsed.success) result = parsed.data;
      }
    };
    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const {value, done} = await reader.read();
        if (done) break;
        buffer = drain(buffer + decoder.decode(value, {stream: true}), handle);
      }
      drain(buffer + '\n\n', handle);
    } else {
      drain((await response.text()) + '\n\n', handle);
    }
    return result ? {...(result as LessonTurnResult), acknowledged: true} : {...TURN_LOST, acknowledged: false};
  } catch {
    return {...TURN_LOST, acknowledged: false};
  }
}
