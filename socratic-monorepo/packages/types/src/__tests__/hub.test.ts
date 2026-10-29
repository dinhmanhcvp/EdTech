import {describe, expect, it} from 'vitest';
import {
  HUB_LIMITS, HubStreamEventSchema, KnowledgePackageSchema, LessonPlanBodyPublicSchema, LessonPlanBodySchema,
} from '../hub';

const plan = {
  title: 'Dòng điện xoay chiều', subject: 'PHYSICS', boardContext: 'Lớp hay cộng độ lớn.',
  sections: [
    {id: 'sec-rlc', title: 'Cộng vector RLC', objective: 'Cộng theo pha', kcs: [{id: 'physics-cong-vector-rlc', label: 'Cộng vector RLC'}],
      items: [
        {id: 'it-f1', type: 'formula', latex: '\vec{U} = \vec{U}_R + \vec{U}_L'},
        {id: 'it-p1', type: 'problem', text: 'Tính U.', answer: 'U = 100'},
        {id: 'it-s1', type: 'sim', templateId: 'PHYS_RLC_PHASOR', params: {omega: 200}},
        {id: 'it-q1', type: 'poll', question: 'U = ?', options: ['70 V', '50 V'], correct: 1},
      ]},
    {id: 'sec-fr', title: 'Ma sát', objective: '', kcs: [], items: [{id: 'it-p2', type: 'problem', text: 'Vì sao âm?'}]},
  ],
};

describe('hub contracts', () => {
  it('parses a two-section plan', () => {
    expect(LessonPlanBodySchema.parse(plan).sections).toHaveLength(2);
  });

  it('rejects plans outside the limits', () => {
    const onePoll = structuredClone(plan);
    (onePoll.sections[0].items[3] as {options: string[]}).options = ['chỉ một'];
    expect(LessonPlanBodySchema.safeParse(onePoll).success).toBe(false);
    const many = {...plan, sections: Array.from({length: HUB_LIMITS.sections + 1}, (_, i) => ({...plan.sections[1], id: `s${i}`, items: []}))};
    expect(LessonPlanBodySchema.safeParse(many).success).toBe(false);
    expect(LessonPlanBodySchema.safeParse({...plan, boardContext: 'x'.repeat(HUB_LIMITS.boardContext + 1)}).success).toBe(false);
    const dup = structuredClone(plan);
    dup.sections[1].items[0].id = 'it-f1';
    expect(LessonPlanBodySchema.safeParse(dup).success).toBe(false);
  });

  it('the public plan never carries answers', () => {
    expect(LessonPlanBodyPublicSchema.safeParse(plan).success).toBe(false);
    const stripped = structuredClone(plan);
    delete (stripped.sections[0].items[1] as {answer?: string}).answer;
    delete (stripped.sections[0].items[3] as {correct?: number}).correct;
    expect(LessonPlanBodyPublicSchema.safeParse(stripped).success).toBe(true);
  });

  it('parses a knowledge package wrapping a v1 classroom snapshot', () => {
    const pkg = {
      schema: 'kp/2', sessionId: 'sess-12345678', planId: 'plan-demo-rlc', planVersion: 1,
      snapshot: {sessionId: 'lesson-x', className: '12A1', lessonTitle: 'RLC', updatedAt: '2026-10-29', studentWork: [],
        boardSnapshots: [{id: 'b-rlc', kind: 'BOARD', title: 'RLC', subject: 'PHYSICS', latex: '', templateId: '', note: '', parameters: {}}]},
      sections: [{boardSnapshotId: 'b-rlc', planSectionId: null, kcIds: []}],
      polls: [{itemId: 'it-q1', question: 'U = ?', options: ['70 V', '50 V'], counts: [2, 5], total: 7}],
      usedItemIds: ['it-q1'],
    };
    expect(KnowledgePackageSchema.parse(pkg).sections[0].planSectionId).toBeNull();
    expect(KnowledgePackageSchema.safeParse({...pkg, snapshot: {...pkg.snapshot, boardSnapshots: undefined}}).success).toBe(false);
  });

  it('parses stream events', () => {
    expect(HubStreamEventSchema.parse({type: 'metric_delta', classId: '12a1', studentId: 's-1', sectionId: null}).type).toBe('metric_delta');
    expect(HubStreamEventSchema.parse({type: 'plan_updated', version: 3}).type).toBe('plan_updated');
    expect(HubStreamEventSchema.safeParse({type: 'nope'}).success).toBe(false);
  });
});
