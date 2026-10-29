import React from 'react';
import {it, expect, vi, afterEach} from 'vitest';
import {render, screen, fireEvent, waitFor, act} from '@testing-library/react';
import {LessonChat} from '../components/companion/LessonChat';
import {AfterSchoolTutor} from '../components/companion/AfterSchoolTutor';

afterEach(() => vi.unstubAllGlobals());

const plan = {
  lesson_id: 'sess:s1', session_id: 'sess', title: 'Từ bảng lớp', version: 1,
  scenes: [{id: 's1', title: 'Giản đồ Fresnel', subject: 'PHYSICS', latex: '', concept: 'Cộng vector theo pha.', questions: [
    {id: 's1:q1', scene_id: 's1', kind: 'COMPUTE', prompt: 'Viết lại công thức then chốt.', hint_count: 4},
    {id: 's1:q2', scene_id: 's1', kind: 'EXPLAIN_BACK', prompt: 'Giải thích lại ý chính.', hint_count: 4},
  ]}],
};

const sse = (tokens: string[], result: Record<string, unknown>) => {
  const text = tokens.map(t => `event: token\ndata: ${JSON.stringify({text: t})}\n\n`).join('') + `event: done\ndata: ${JSON.stringify(result)}\n\n`;
  const bytes = new TextEncoder().encode(text);
  return {ok: true, body: new ReadableStream({start(c) { c.enqueue(bytes); c.close(); }})};
};
const done = (over: Record<string, unknown> = {}) => ({status: 'NONE', points: 0, tutor_text: 'Em thử nhìn lại ghi chú nhé?', source: 'LLM', next_question_id: null, ...over});

function stub(turn: (body: any) => any) {
  const bodies: any[] = [];
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
    if (init?.method === 'POST') { const body = JSON.parse(String(init.body)); bodies.push(body); return turn(body); }
    return {ok: true, json: async () => plan};
  }));
  return bodies;
}
const input = () => screen.getByTestId('lesson-input') as HTMLInputElement;
const send = () => fireEvent.click(screen.getByTestId('lesson-send'));

it('renders the scene, hides the formula and streams the tutor text', async () => {
  stub(() => sse(['Em thử nhìn ', 'lại ghi chú nhé?'], done()));
  render(<LessonChat />);
  expect(await screen.findByText('Giản đồ Fresnel')).toBeTruthy();
  expect(screen.getByText('Cộng vector theo pha.')).toBeTruthy();
  fireEvent.change(input(), {target: {value: 'U = IR'}});
  send();
  expect(await screen.findByText('Em thử nhìn lại ghi chú nhé?')).toBeTruthy();
});

it('keeps the input and awards no points when the turn fails', async () => {
  stub(() => { throw new Error('offline'); });
  render(<LessonChat />);
  await screen.findByText('Giản đồ Fresnel');
  fireEvent.change(input(), {target: {value: 'U = IR'}});
  send();
  await screen.findByText(/Chưa nhận được phản hồi/);
  expect(input().value).toBe('U = IR');
  expect(screen.getByTestId('lesson-points').textContent).toContain('0');
});

it('reuses the request id when retrying the same message', async () => {
  let n = 0;
  const bodies = stub(() => { if (n++ === 0) throw new Error('offline'); return sse(['ok'], done({tutor_text: 'ok'})); });
  render(<LessonChat />);
  await screen.findByText('Giản đồ Fresnel');
  fireEvent.change(input(), {target: {value: 'U = IR'}});
  send();
  await screen.findByText(/Chưa nhận được phản hồi/);
  send();
  await screen.findByText('ok');
  expect(bodies).toHaveLength(2);
  expect(bodies[0].request_id).toBe(bodies[1].request_id);
});

it('adds points only from a verified-correct result, then loads the next question', async () => {
  stub(() => sse(['Chuẩn rồi!'], done({status: 'VERIFIED_CORRECT', points: 20, tutor_text: 'Chuẩn rồi!', next_question_id: 's1:q2'})));
  render(<LessonChat />);
  await screen.findByText('Giản đồ Fresnel');
  fireEvent.change(input(), {target: {value: 'U = IR'}});
  send();
  await screen.findByText('Chuẩn rồi!');
  await waitFor(() => expect(screen.getByTestId('lesson-points').textContent).toContain('20'));
  expect(await screen.findByText('Giải thích lại ý chính.')).toBeTruthy();
});

it('shows the basic-mode badge when the reply is a fallback', async () => {
  stub(() => sse(['Thử lại nhé'], done({source: 'FALLBACK', tutor_text: 'Thử lại nhé'})));
  render(<LessonChat />);
  await screen.findByText('Giản đồ Fresnel');
  fireEvent.change(input(), {target: {value: 'x'}});
  send();
  expect(await screen.findByText('Chế độ cơ bản')).toBeTruthy();
});

it('hint button sends a HINT turn', async () => {
  const bodies = stub(() => sse(['Gợi ý'], done({tutor_text: 'Gợi ý'})));
  render(<LessonChat />);
  await screen.findByText('Giản đồ Fresnel');
  fireEvent.click(screen.getByTestId('lesson-hint'));
  await screen.findByText('Gợi ý');
  expect(bodies[0].kind).toBe('HINT');
});

it('shows a friendly message for an empty plan', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: true, json: async () => ({...plan, scenes: []})}));
  render(<LessonChat />);
  expect(await screen.findByText(/Chưa có nội dung bảng/)).toBeTruthy();
});

it('shows a retry state when the lesson cannot load', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: false, status: 500, json: async () => ({})}));
  render(<LessonChat />);
  expect(await screen.findByText(/Chưa tải được bài học/)).toBeTruthy();
});

it('is reachable from the after-school tutor as its fifth mode', async () => {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
    if (url.includes('/lesson/')) return {ok: true, json: async () => plan};
    if (url.endsWith('/progress')) return {ok: true, json: async () => ({catalog_version: 1, total_points: 0, problems: []})};
    throw new Error('unrelated');
  }));
  render(<AfterSchoolTutor />);
  fireEvent.click(screen.getByTestId('mode-board-lesson'));
  expect(await screen.findByTestId('lesson-chat')).toBeTruthy();
});

it('sends only one turn when the send button is pressed twice before the first returns', async () => {
  let release: (v: unknown) => void = () => {};
  const gate = new Promise(resolve => { release = resolve; });
  const bodies = stub(async () => { await gate; return sse(['ok'], done({status: 'VERIFIED_CORRECT', points: 20, tutor_text: 'ok'})); });
  render(<LessonChat />);
  await screen.findByText('Giản đồ Fresnel');
  fireEvent.change(input(), {target: {value: 'U = IR'}});
  act(() => { const button = screen.getByTestId('lesson-send'); button.click(); button.click(); }); // same tick: state has not re-rendered yet
  release(null);
  await screen.findByText('ok');
  expect(bodies).toHaveLength(1);
  await waitFor(() => expect(screen.getByTestId('lesson-points').textContent).toContain('20'));
  expect(screen.getByTestId('lesson-points').textContent).not.toContain('40');
});

it('hands $...$ in the teacher note and in tutor messages to the maths renderer instead of printing raw text', async () => {
  const solvedPlan = {...plan, scenes: [{...plan.scenes[0], latex: '', concept: 'Ta quan sát công thức $y = x^{2} - 3$ trên bảng.'}]};
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'POST') return sse(['Chuẩn rồi, $x^2$ đúng!'], done({tutor_text: 'Chuẩn rồi, $x^2$ đúng!'}));
    return {ok: true, json: async () => solvedPlan};
  }));
  render(<LessonChat />);
  await screen.findByText('Giản đồ Fresnel');
  // MathText splits the sentence: the formula goes to its own FormulaBlock (KaTeX in the browser, plain text under test).
  const note = screen.getByText(/Ta quan sát công thức/).closest('p')!;
  expect(note.querySelector('[data-testid="formula-block"]')?.textContent).toBe('$y = x^{2} - 3$');
  expect(screen.getByText(/Ta quan sát công thức/).textContent).not.toContain('$');
  fireEvent.change(input(), {target: {value: 'x'}});
  send();
  const bubble = (await screen.findByText(/Chuẩn rồi/)).closest('div')!;
  await waitFor(() => expect(bubble.querySelector('[data-testid="formula-block"]')).toBeTruthy());
  expect(screen.getByText(/Chuẩn rồi/).textContent).not.toContain('$');
});
