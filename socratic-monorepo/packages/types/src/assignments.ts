import {z} from 'zod';

/**
 * Assignments v1: bài tập / đề trong tiết (giao bằng QR, nộp ảnh vở, chấm có kiểm soát OCR, chữa trên bảng).
 * Máy chủ: services/ai-engine/hub/assignments (+ routers/hub_assignments.py, hub_runs.py, hub_files.py), tiền tố /api/v1/hub.
 * Bản Python: hub/assignments/schema.py. Xem docs/superpowers/specs/2026-10-29-bai-tap-trong-tiet-design.md.
 */

export const ASSIGNMENT_LIMITS = {
  questions: 40, options: [2, 6] as const, pages: 20, uploadBytes: 15 * 1024 * 1024, photoBytes: 2 * 1024 * 1024, homeworkSeconds: 259200,
} as const;

const SubjectSchema = z.enum(['MATH', 'PHYSICS', 'CHEMISTRY', 'BIOLOGY']);
const IdSchema = z.string().regex(/^[a-z0-9-]{1,40}$/);
const KcSchema = z.object({id: z.string().regex(/^[a-z0-9-]{1,80}$/), label: z.string().min(1).max(80)}).strict();

export const QuestionTypeSchema = z.enum(['choice', 'short', 'essay', 'open']);

const questionShape = {
  id: IdSchema,
  type: QuestionTypeSchema,
  label: z.string().min(1).max(40),
  text: z.string().min(1).max(2000),
  page: z.number().int().min(0).max(19).optional(),
  box: z.array(z.number().min(0).max(1)).length(4).optional(),
  options: z.array(z.string().min(1).max(200)).min(ASSIGNMENT_LIMITS.options[0]).max(ASSIGNMENT_LIMITS.options[1]).optional(),
  kcs: z.array(KcSchema).max(8).default([]),
  points: z.number().positive().max(100).optional(),
};

/** Câu đầy đủ (chỉ giáo viên): `answer` bắt buộc với choice/short/essay (choice: chỉ số 0-based dạng chuỗi), cấm với open. */
export const QuestionSchema = z.object({...questionShape, answer: z.string().min(1).max(200).optional()}).strict().superRefine((q, ctx) => {
  if (q.type === 'open' && q.answer !== undefined) ctx.addIssue({code: 'custom', message: 'open_has_no_answer'});
  if (q.type !== 'open' && q.answer === undefined) ctx.addIssue({code: 'custom', message: 'answer_required'});
  if (q.type === 'choice' && (!q.options || !/^\d+$/.test(q.answer ?? '') || Number(q.answer) >= q.options.length)) {
    ctx.addIssue({code: 'custom', message: 'choice_answer_out_of_range'});
  }
});

/** Câu gửi cho bảng / học sinh: không bao giờ có đáp án. */
export const QuestionPublicSchema = z.object(questionShape).strict();

function bodySchema<T extends z.ZodTypeAny>(question: T) {
  return z.object({
    title: z.string().min(1).max(160), subject: SubjectSchema, kind: z.enum(['exercise', 'exam']),
    questions: z.array(question).min(1).max(ASSIGNMENT_LIMITS.questions),
  }).strict().refine((b) => new Set((b.questions as {id: string}[]).map((q) => q.id)).size === b.questions.length, {message: 'duplicate_ids'});
}

export const AssignmentBodySchema = bodySchema(QuestionSchema);
export const AssignmentBodyPublicSchema = bodySchema(QuestionPublicSchema);

export const PageInfoSchema = z.object({page: z.number().int(), width: z.number(), height: z.number()});
export const RunPhaseSchema = z.enum(['in_class', 'homework', 'closed']);
export const SubmissionStatusSchema = z.enum(['graded', 'pending_teacher', 'teacher_confirmed']);

export const RunSchema = z.object({
  runId: z.string(), code: z.string(), url: z.string(), assignmentId: z.string(), classId: z.string(), periodId: z.string().nullable(),
  openedAt: z.number(), closedAt: z.number().nullable(), dueAt: z.number().nullable(), phase: RunPhaseSchema,
});

export const RunForStudentSchema = z.object({
  runId: z.string(), phase: RunPhaseSchema, dueAt: z.number().nullable(),
  id: z.string(), version: z.number(), title: z.string(), subject: SubjectSchema, kind: z.enum(['exercise', 'exam']),
  pages: z.array(PageInfoSchema), body: AssignmentBodyPublicSchema,
  mine: z.record(z.string(), z.object({status: SubmissionStatusSchema, score: z.number().nullable(), attempt: z.number()})),
});

export const OcrLineSchema = z.object({
  text: z.string().optional(), latex: z.string().optional(), confidence: z.number().optional(), y0: z.number().optional(), y1: z.number().optional(),
});
export const OcrResultSchema = z.object({
  photoId: z.string(), lines: z.array(OcrLineSchema),
  uncertain: z.array(z.object({line: z.number(), token: z.string(), alternatives: z.array(z.string()), x: z.number().optional(), y: z.number().optional()})),
});

export const SubmissionResultSchema = z.object({
  submissionId: z.string(), status: SubmissionStatusSchema, score: z.number().nullable(), attempt: z.number(), photoId: z.string().optional(),
});

/** Bài nộp trên bảng: ẩn danh tuyệt đối (không id hay tên học sinh). */
export const BoardSubmissionSchema = z.object({
  submissionId: z.string(), label: z.string(), questionId: z.string(), status: SubmissionStatusSchema,
  confirmed: z.array(z.string()).nullable(), lines: z.array(OcrLineSchema).nullable().optional(), grade: z.record(z.string(), z.unknown()).nullable(),
  correction: z.object({strokes: z.array(z.unknown()), savedAt: z.number().optional()}).nullable(), hasPhoto: z.boolean(),
}).strict();

export const RunMetricsSchema = z.object({
  runId: z.string(),
  questions: z.array(z.object({
    questionId: z.string(), label: z.string(), submittedRate: z.number(), correctRate: z.number().nullable(), firstTryRate: z.number().nullable(),
    wrongAnswers: z.array(z.object({answer: z.string(), count: z.number()})), pending: z.number(),
  })),
  students: z.array(z.object({studentId: z.string(), name: z.string(), score10: z.number().nullable(), pending: z.number(), done: z.number()})),
});

export const MyAssignmentSchema = z.object({
  runId: z.string(), code: z.string(), title: z.string(), kind: z.enum(['exercise', 'exam']), phase: RunPhaseSchema, dueAt: z.number().nullable(),
  score10: z.number().nullable(),
  questions: z.array(z.object({questionId: z.string(), label: z.string(), status: SubmissionStatusSchema.nullable(), score: z.number().nullable()})),
  corrections: z.array(z.object({submissionId: z.string(), questionId: z.string()})),
  classExamples: z.array(z.object({submissionId: z.string(), questionId: z.string(), label: z.string()})),
});

export const AssignmentStreamEventSchema = z.discriminatedUnion('type', [
  z.object({type: z.literal('submission_update'), runId: z.string(), studentId: z.string(), questionId: z.string(), status: z.string()}),
  z.object({type: z.literal('progress'), runId: z.string()}),
  z.object({type: z.literal('show_submission'), runId: z.string(), submissionId: z.string(), label: z.string()}),
]);

export type QuestionType = z.infer<typeof QuestionTypeSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type QuestionPublic = z.infer<typeof QuestionPublicSchema>;
export type AssignmentBody = z.infer<typeof AssignmentBodySchema>;
export type AssignmentBodyPublic = z.infer<typeof AssignmentBodyPublicSchema>;
export type RunPhase = z.infer<typeof RunPhaseSchema>;
export type SubmissionStatus = z.infer<typeof SubmissionStatusSchema>;
export type Run = z.infer<typeof RunSchema>;
export type RunForStudent = z.infer<typeof RunForStudentSchema>;
export type OcrResult = z.infer<typeof OcrResultSchema>;
export type SubmissionResult = z.infer<typeof SubmissionResultSchema>;
export type BoardSubmission = z.infer<typeof BoardSubmissionSchema>;
export type RunMetrics = z.infer<typeof RunMetricsSchema>;
export type MyAssignment = z.infer<typeof MyAssignmentSchema>;
export type AssignmentStreamEvent = z.infer<typeof AssignmentStreamEventSchema>;
