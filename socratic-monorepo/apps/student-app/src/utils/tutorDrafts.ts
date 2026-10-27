/** Tab-scoped recovery only. Drafts never determine grades or mastery. */
interface TutorDraft {answer: string; requestId?: string}

export function createTutorDraftStore(studentId: string) {
  const memory = new Map<string, TutorDraft>();
  const key = (problem: string, step: number) => `socratic:tutor:v1:${encodeURIComponent(studentId)}:${problem}:${step}`;
  const read = (problem: string, step: number): TutorDraft => {
    const id = key(problem, step);
    if (memory.has(id)) return memory.get(id)!;
    let draft: TutorDraft = {answer: ''};
    try {
      const saved = JSON.parse(sessionStorage.getItem(id) || 'null');
      if (saved && typeof saved.answer === 'string' && saved.answer.length <= 200) {
        draft = {answer: saved.answer};
        if (typeof saved.requestId === 'string' && saved.requestId.length > 0 && saved.requestId.length <= 80) draft.requestId = saved.requestId;
      }
    } catch { /* Storage may be unavailable on shared/private devices. */ }
    memory.set(id, draft);
    return draft;
  };
  const save = (problem: string, step: number, draft: TutorDraft) => {
    const id = key(problem, step);
    memory.set(id, draft);
    try {
      if (!draft.answer) sessionStorage.removeItem(id);
      else sessionStorage.setItem(id, JSON.stringify(draft));
    } catch { /* Keep the in-memory copy when browser storage is blocked. */ }
  };
  return {
    read,
    write(problem: string, step: number, answer: string) {
      const previous = read(problem, step);
      save(problem, step, answer === previous.answer ? previous : {answer});
    },
    beginAttempt(problem: string, step: number, answer: string) {
      const previous = read(problem, step);
      const requestId = previous.answer === answer && previous.requestId ? previous.requestId : crypto.randomUUID();
      save(problem, step, {answer, requestId});
      return requestId;
    },
    acknowledge(problem: string, step: number, correct: boolean) {
      save(problem, step, {answer: correct ? '' : read(problem, step).answer});
    },
    resumeStep(problem: string, completed: number, count: number) {
      // An unresolved response can belong to an already completed server step.
      for (let step = 0; step < count; step++) if (read(problem, step).answer.trim()) return step;
      return Math.min(completed, count - 1);
    },
  };
}
