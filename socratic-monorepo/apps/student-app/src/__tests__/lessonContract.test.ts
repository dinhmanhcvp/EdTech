import {it, expect} from 'vitest';
import {
  LessonPlanSchema, LessonQuestionSchema, LessonTurnRequestSchema, LessonTurnResultSchema,
} from '@socratic/types';

const question = {id: 's1:q1', scene_id: 's1', kind: 'COMPUTE', prompt: 'Viết lại công thức.', hint_count: 4};
const plan = {
  lesson_id: 'sess:s1', session_id: 'sess', title: 'Bài học', version: 1,
  scenes: [{id: 's1', title: 'RLC', subject: 'PHYSICS', latex: 'U=IR', concept: 'Định luật Ohm', questions: [question]}],
};

it('rejects answer-key fields on public questions', () => {
  expect(LessonQuestionSchema.safeParse({...question, expected_answer: 'x'}).success).toBe(false);
});

it('only a verified-correct turn may carry points', () => {
  const base = {tutor_text: 'ok', source: 'LLM', next_question_id: null};
  expect(LessonTurnResultSchema.safeParse({...base, status: 'VERIFIED_INCORRECT', points: 20}).success).toBe(false);
  expect(LessonTurnResultSchema.safeParse({...base, status: 'VERIFIED_CORRECT', points: 20}).success).toBe(true);
});

it('accepts a valid plan', () => {
  expect(LessonPlanSchema.safeParse(plan).success).toBe(true);
});

it('rejects over-long messages', () => {
  const req = {lesson_id: 'sess:s1', scene_id: 's1', question_id: 's1:q1', kind: 'CHAT', message: 'a'.repeat(401), request_id: 'r1'};
  expect(LessonTurnRequestSchema.safeParse(req).success).toBe(false);
  expect(LessonTurnRequestSchema.safeParse({...req, message: 'a'.repeat(400)}).success).toBe(true);
});
