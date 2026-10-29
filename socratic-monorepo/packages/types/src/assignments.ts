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

export const ResourceKindSchema = z.enum(['exercise', 'exam', 'slides']);

function bodySchema<T extends z.ZodTypeAny>(question: T) {
  return z.object({
    title: z.string().min(1).max(160), subject: SubjectSchema, kind: ResourceKindSchema,
    questions: z.array(question).max(ASSIGNMENT_LIMITS.questions),
  }).strict()
    .refine((b) => b.kind === 'slides' || b.questions.length > 0, {message: 'questions_required'})
    .refine((b) => new Set((b.questions as {id: string}[]).map((q) => q.id)).size === b.questions.length, {message: 'duplicate_ids'});
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
  id: z.string(), version: z.number(), title: z.string(), subject: SubjectSchema, kind: ResourceKindSchema,
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
  runId: z.string(), code: z.string(), title: z.string(), kind: ResourceKindSchema, phase: RunPhaseSchema, dueAt: z.number().nullable(),
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

/** Danh sách tài nguyên (GET /hub/assignments, /hub/board/assignments). */
export const ResourceListItemSchema = z.object({
  id: z.string(), title: z.string(), subject: SubjectSchema, kind: ResourceKindSchema, source: z.enum(['file', 'photos', 'bank', 'ai']),
  currentVersion: z.number(), pageCount: z.number(), updatedAt: z.number(),
});

/** Nét viết đè trên trang tài nguyên / nét chữa trên ảnh bài: tọa độ 0–1 theo ảnh. */
export const AnnotationStrokeSchema = z.object({
  p: z.array(z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)])).min(1).max(1500), c: z.string().max(16), w: z.number(),
});

export const MyResourceSchema = z.object({
  assignmentId: z.string(), title: z.string(), kind: ResourceKindSchema, pages: z.array(PageInfoSchema), openedAt: z.number(),
  periodId: z.string(), periodTitle: z.string(),
});

/** Gói cuối tiết cho học sinh (GET /hub/me/periods). */
export const PeriodPackageSchema = z.object({
  periodId: z.string(), title: z.string(), endedAt: z.number().nullable(),
  runs: z.array(MyAssignmentSchema.extend({lessonAvailable: z.boolean()})), resources: z.array(MyResourceSchema),
});

/** Tổng kết tiết cho giáo viên (GET /hub/console/periods/{id}/summary). */
export const PeriodSummarySchema = z.object({
  periodId: z.string(),
  runs: z.array(RunSchema.extend({title: z.string(), metrics: RunMetricsSchema})),
  resources: z.array(MyResourceSchema), pending: z.number(),
  needsSupport: z.array(z.object({studentId: z.string(), name: z.string(), reasons: z.array(z.string())})),
});

export const ProgressSchema = z.object({
  questions: z.array(z.object({questionId: z.string(), submitted: z.number(), correctRate: z.number().nullable()})),
});

/** Một mục trong "Chọn bài để chữa" trên bảng: ẩn danh tuyệt đối. */
export const BoardListItemSchema = z.object({
  submissionId: z.string(), label: z.string(), questionId: z.string(), status: SubmissionStatusSchema,
  firstError: z.number().nullable(), hasPhoto: z.boolean(),
}).strict();

/** Một ô của lưới giáo viên (GET /hub/runs/{id}/submissions): có tên học sinh. */
export const TeacherGridRowSchema = z.object({
  submissionId: z.string(), studentId: z.string(), name: z.string(), questionId: z.string(), mode: z.enum(['choice', 'typed', 'photo']),
  status: SubmissionStatusSchema, score: z.number().nullable(), attempt: z.number(), phase: z.enum(['in_class', 'homework']),
  answer: z.string().nullable(), confirmed: z.array(z.string()).nullable(), ocr: z.unknown(), grade: z.unknown(), hasPhoto: z.boolean(),
});

/** Bài chữa mẫu / bài của em xem trên app học sinh. */
export const StudentSubmissionViewSchema = BoardSubmissionSchema.extend({photo: z.string().nullable()});

export type ResourceKind = z.infer<typeof ResourceKindSchema>;
export type ResourceListItem = z.infer<typeof ResourceListItemSchema>;
export type AnnotationStroke = z.infer<typeof AnnotationStrokeSchema>;
export type MyResource = z.infer<typeof MyResourceSchema>;
export type PeriodPackage = z.infer<typeof PeriodPackageSchema>;
export type PeriodSummary = z.infer<typeof PeriodSummarySchema>;
export type Progress = z.infer<typeof ProgressSchema>;
export type BoardListItem = z.infer<typeof BoardListItemSchema>;
export type TeacherGridRow = z.infer<typeof TeacherGridRowSchema>;
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
export type StudentSubmissionView = z.infer<typeof StudentSubmissionViewSchema>;
