import {z} from 'zod';
import {ClassroomSnapshotSchema} from './lesson';

/**
 * Hub v1: hợp đồng giữa portal giáo viên (đỉnh 1), bảng lớp (đỉnh 2), Socratic app (đỉnh 3) và ai-engine
 * (`services/ai-engine/hub`, `/api/v1/hub/*`). Bản Python: `services/ai-engine/hub/schemas.py`.
 * Xem docs/superpowers/specs/2026-10-29-tam-giac-he-thong-design.md.
 */

export const HUB_LIMITS = {sections: 12, itemsPerSection: 12, boardContext: 1000, pollMin: 2, pollMax: 6, packageBytes: 262144} as const;

const SubjectSchema = z.enum(['MATH', 'PHYSICS', 'CHEMISTRY', 'BIOLOGY']);
const IdSchema = z.string().regex(/^[a-z0-9-]{1,40}$/);

const FormulaItemSchema = z.object({id: IdSchema, type: z.literal('formula'), latex: z.string().min(1).max(400), caption: z.string().max(200).optional()}).strict();
const ProblemItemPublicSchema = z.object({
  id: IdSchema, type: z.literal('problem'), text: z.string().min(1).max(1000), latex: z.string().max(400).optional(), figure: z.boolean().optional(),
}).strict();
const SimItemSchema = z.object({
  id: IdSchema, type: z.literal('sim'), templateId: z.string().regex(/^[A-Z0-9_]{2,40}$/), params: z.record(z.string(), z.number()),
}).strict();
const PollItemPublicSchema = z.object({
  id: IdSchema, type: z.literal('poll'), question: z.string().min(1).max(300),
  options: z.array(z.string().min(1).max(120)).min(HUB_LIMITS.pollMin).max(HUB_LIMITS.pollMax),
}).strict();

/** Mục giáo án đầy đủ (chỉ portal giáo viên thấy): `answer` của đề bài và `correct` của poll nằm ở máy chủ. */
export const PlanItemSchema = z.discriminatedUnion('type', [
  FormulaItemSchema,
  ProblemItemPublicSchema.extend({answer: z.string().min(1).max(200).optional()}).strict(),
  SimItemSchema,
  PollItemPublicSchema.extend({correct: z.number().int().min(0).optional()}).strict()
    .refine((p) => p.correct === undefined || p.correct < p.options.length, {message: 'correct_out_of_range'}),
]);

/** Mục giáo án gửi cho bảng / học sinh: không bao giờ có đáp án. */
export const PlanItemPublicSchema = z.discriminatedUnion('type', [FormulaItemSchema, ProblemItemPublicSchema, SimItemSchema, PollItemPublicSchema]);

const KcSchema = z.object({id: z.string().regex(/^[a-z0-9-]{1,80}$/), label: z.string().min(1).max(80)}).strict();

function sectionSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    id: IdSchema, title: z.string().min(1).max(160), objective: z.string().max(500).default(''),
    kcs: z.array(KcSchema).max(8).default([]), items: z.array(item).max(HUB_LIMITS.itemsPerSection).default([]),
  }).strict();
}

function planSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    title: z.string().min(1).max(160), subject: SubjectSchema, boardContext: z.string().max(HUB_LIMITS.boardContext).default(''),
    sections: z.array(sectionSchema(item)).min(1).max(HUB_LIMITS.sections),
  }).strict().refine((p) => {
    const ids = p.sections.flatMap((s) => [s.id, ...(s.items as {id: string}[]).map((i) => i.id)]);
    return new Set(ids).size === ids.length;
  }, {message: 'duplicate_ids'});
}

export const PlanSectionSchema = sectionSchema(PlanItemSchema);
export const LessonPlanBodySchema = planSchema(PlanItemSchema);
export const LessonPlanBodyPublicSchema = planSchema(PlanItemPublicSchema);

/** Gói tri thức cuối tiết (POST /api/v1/hub/sessions/{id}/package): bọc snapshot v1 của Mode 2 + nối với giáo án. */
export const KnowledgePackageSchema = z.object({
  schema: z.literal('kp/2'),
  sessionId: z.string().min(1).max(80),
  planId: z.string().min(1).max(80),
  planVersion: z.number().int().min(1),
  snapshot: ClassroomSnapshotSchema,
  sections: z.array(z.object({boardSnapshotId: z.string().min(1).max(80), planSectionId: z.string().max(40).nullable(), kcIds: z.array(z.string()).max(8)})).max(40),
  polls: z.array(z.object({
    itemId: z.string().max(40).nullable(), question: z.string().min(1).max(300),
    options: z.array(z.string()).min(2).max(6), counts: z.array(z.number().int().min(0)), total: z.number().int().min(0),
  }).refine((p) => p.counts.length === p.options.length, {message: 'counts_must_match_options'})).max(24),
  usedItemIds: z.array(z.string()).max(200),
});

export const PairingSchema = z.object({code: z.string(), boardId: z.string(), boardSecret: z.string(), expiresAt: z.number()});
export const TeacherLoginResultSchema = z.object({token: z.string(), teacher: z.object({id: z.string(), name: z.string()})});
export const StudentLoginResultSchema = z.object({
  token: z.string(), student: z.object({id: z.string(), name: z.string(), classId: z.string(), className: z.string()}),
});

export const HubLessonListItemSchema = z.object({
  sessionId: z.string(), title: z.string(), subject: SubjectSchema.nullable(), endedAt: z.number().nullable(), total: z.number(), done: z.number(),
});

export const StudentMetricsSchema = z.object({
  studentId: z.string(), name: z.string(), mastery: z.record(z.string(), z.number()), done: z.number(), total: z.number(),
  firstTryRate: z.number().nullable(), hintsPerItem: z.number(), minutes: z.number(), lastActive: z.number().nullable(),
  needsSupport: z.boolean(), supportReasons: z.array(z.string()),
});

export const SectionMetricsSchema = z.object({
  sectionId: z.string(), attemptedRate: z.number(), firstTryRate: z.number().nullable(), avgHints: z.number(),
  weakestKc: z.string().nullable(), needsSupport: z.array(z.string()), wrongAnswers: z.array(z.object({answer: z.string(), count: z.number()})),
});

export const ClassMetricsSchema = z.object({
  classId: z.string(), kcs: z.array(z.object({id: z.string(), label: z.string()})), students: z.array(StudentMetricsSchema),
  heatmap: z.record(z.string(), z.record(z.string(), z.number())), progress: z.number(),
});

export const PlanSuggestionSchema = z.object({
  id: z.string(), type: z.enum(['add_example', 'add_question', 'reorder', 'add_note']), rationale: z.string(),
  item: PlanItemSchema.optional(), order: z.array(z.string()).optional(), note: z.string().optional(),
});

export const ParentReportSchema = z.object({
  week: z.string(), lessons: z.array(z.string()), activeDays: z.number(), minutes: z.number(), done: z.number(),
  improved: z.array(z.string()), needsHelp: z.array(z.string()), tips: z.array(z.string()), comment: z.string(),
  source: z.enum(['ai', 'template']), vsLastWeek: z.object({minutesDelta: z.number(), activeDaysDelta: z.number()}),
});

export const ParentViewSchema = z.object({
  student: z.object({name: z.string(), className: z.string()}), lastWeek: ParentReportSchema.nullable(), thisWeek: ParentReportSchema,
});

/** Sự kiện trên các luồng text/event-stream của hub (pairing / board / teacher). */
export const HubStreamEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('paired'), boardToken: z.string(), session: z.object({id: z.string(), startedAt: z.number()}),
    class: z.object({id: z.string(), name: z.string()}), plan: z.object({id: z.string(), version: z.number(), body: LessonPlanBodyPublicSchema}),
  }),
  z.object({type: z.literal('plan_updated'), version: z.number()}),
  z.object({type: z.literal('session_closed')}),
  z.object({type: z.literal('metric_delta'), classId: z.string(), studentId: z.string(), sectionId: z.string().nullable()}),
]);

export type PlanItem = z.infer<typeof PlanItemSchema>;
export type PlanItemPublic = z.infer<typeof PlanItemPublicSchema>;
export type PlanSection = z.infer<typeof PlanSectionSchema>;
export type LessonPlanBody = z.infer<typeof LessonPlanBodySchema>;
export type LessonPlanBodyPublic = z.infer<typeof LessonPlanBodyPublicSchema>;
export type KnowledgePackage = z.infer<typeof KnowledgePackageSchema>;
export type Pairing = z.infer<typeof PairingSchema>;
export type TeacherLoginResult = z.infer<typeof TeacherLoginResultSchema>;
export type StudentLoginResult = z.infer<typeof StudentLoginResultSchema>;
export type HubLessonListItem = z.infer<typeof HubLessonListItemSchema>;
export type StudentMetrics = z.infer<typeof StudentMetricsSchema>;
export type SectionMetrics = z.infer<typeof SectionMetricsSchema>;
export type ClassMetrics = z.infer<typeof ClassMetricsSchema>;
export type PlanSuggestion = z.infer<typeof PlanSuggestionSchema>;
export type ParentReport = z.infer<typeof ParentReportSchema>;
export type ParentView = z.infer<typeof ParentViewSchema>;
export type HubStreamEvent = z.infer<typeof HubStreamEventSchema>;
