import {describe, expect, it} from 'vitest';
import {
  ASSIGNMENT_LIMITS, AssignmentBodySchema, AssignmentStreamEventSchema, BoardSubmissionSchema, QuestionPublicSchema, RunForStudentSchema,
} from '../assignments';

const body = {
  title: 'Phương trình bậc nhất', subject: 'MATH', kind: 'exercise',
  questions: [
    {id: 'q1', type: 'choice', label: 'Câu 1', text: 'Nghiệm của $2x=4$', options: ['1', '2', '3', '4'], answer: '1', kcs: []},
    {id: 'q2', type: 'short', label: 'Câu 2', text: 'Tính 3·4', answer: '12', kcs: []},
    {id: 'q3', type: 'essay', label: 'Câu 3', text: 'Giải $x+3=5$', answer: 'x = 2', kcs: [{id: 'math-phuong-trinh', label: 'Phương trình'}],
      page: 0, box: [0.1, 0.2, 0.8, 0.1]},
    {id: 'q4', type: 'open', label: 'Câu 4', text: 'Giải thích', kcs: []},
  ],
};

describe('assignments contracts', () => {
  it('parses a four-type assignment', () => {
    expect(AssignmentBodySchema.parse(body).questions).toHaveLength(4);
  });

  it('enforces answer rules and limits', () => {
    const open = structuredClone(body);
    (open.questions[3] as {answer?: string}).answer = 'x';
    expect(AssignmentBodySchema.safeParse(open).success).toBe(false);
    const missing = structuredClone(body);
    delete (missing.questions[0] as {answer?: string}).answer;
    expect(AssignmentBodySchema.safeParse(missing).success).toBe(false);
    const many = {...body, questions: Array.from({length: ASSIGNMENT_LIMITS.questions + 1}, (_, i) => ({...body.questions[3], id: `q${i}`}))};
    expect(AssignmentBodySchema.safeParse(many).success).toBe(false);
  });

  it('public questions never carry answers', () => {
    expect(QuestionPublicSchema.safeParse(body.questions[0]).success).toBe(false);
    const {answer: _answer, ...rest} = body.questions[0];
    expect(QuestionPublicSchema.safeParse(rest).success).toBe(true);
  });

  it('board submissions never carry student identity', () => {
    const item = {submissionId: 'sub-1', label: 'Bài 1', questionId: 'q3', status: 'graded', confirmed: ['x = 2'], lines: [], grade: null,
      correction: null, hasPhoto: true};
    expect(BoardSubmissionSchema.parse(item).label).toBe('Bài 1');
    expect(BoardSubmissionSchema.safeParse({...item, studentId: 's-1'}).success).toBe(false);
  });

  it('parses the student run view and stream events', () => {
    const {answer: _a, ...q1} = body.questions[0];
    const run = {runId: 'run-1', phase: 'homework', dueAt: 1, id: 'asg-1', version: 1, title: 'T', subject: 'MATH', kind: 'exercise',
      pages: [{page: 0, width: 1131, height: 1600}], body: {...body, questions: [q1]}, mine: {q1: {status: 'graded', score: 1, attempt: 1}}};
    expect(RunForStudentSchema.parse(run).phase).toBe('homework');
    for (const e of [{type: 'submission_update', runId: 'r', studentId: 's', questionId: 'q1', status: 'graded'},
      {type: 'progress', runId: 'r'}, {type: 'show_submission', runId: 'r', submissionId: 'sub', label: 'Bài 1'}]) {
      expect(AssignmentStreamEventSchema.parse(e).type).toBe(e.type);
    }
  });
});
