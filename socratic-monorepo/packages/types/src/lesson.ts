import {z} from 'zod';

const SubjectSchema = z.enum(['MATH', 'PHYSICS', 'CHEMISTRY', 'BIOLOGY']);

/** Public question: never carries an answer key (the server owns it). */
export const LessonQuestionSchema = z.object({
  id: z.string().min(1),
  scene_id: z.string().min(1),
  kind: z.enum(['COMPUTE', 'PREDICT', 'FIND_ERROR', 'EXPLAIN_BACK']),
  prompt: z.string().min(1),
  hint_count: z.literal(4),
}).strict();

export const LessonSceneSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  subject: SubjectSchema,
  latex: z.string(),
  concept: z.string(),
  questions: z.array(LessonQuestionSchema),
});

export const LessonPlanSchema = z.object({
  lesson_id: z.string().min(1),
  session_id: z.string(),
  title: z.string(),
  version: z.literal(1),
  scenes: z.array(LessonSceneSchema),
});

export const LessonTurnRequestSchema = z.object({
  lesson_id: z.string().min(1),
  scene_id: z.string().min(1),
  question_id: z.string().min(1),
  kind: z.enum(['ANSWER', 'HINT', 'CHAT']),
  message: z.string().max(400),
  request_id: z.string().min(1).max(80),
}).strict();

export const LessonTurnResultSchema = z.object({
  status: z.enum(['VERIFIED_CORRECT', 'VERIFIED_INCORRECT', 'UNVERIFIED', 'NONE']),
  points: z.union([z.literal(0), z.literal(20)]),
  tutor_text: z.string(),
  source: z.enum(['LLM', 'FALLBACK']),
  next_question_id: z.string().nullable(),
}).refine(r => r.status === 'VERIFIED_CORRECT' || r.points === 0);

/** What Teacher Board publishes for a class (PUT /api/v1/student/snapshot) and the board lesson is built from. */
export const ClassroomBoardSnapshotSchema = z.object({
  id: z.string().min(1).max(80),
  kind: z.enum(['BOARD', 'SLIDE', 'STUDENT_WORK']),
  title: z.string().max(200),
  subject: SubjectSchema,
  /** The section's key formula (LaTeX); empty when the section has none. */
  latex: z.string().max(400),
  templateId: z.string().max(80),
  note: z.string().max(700),
  parameters: z.record(z.string(), z.number()),
});

export const ClassroomSnapshotSchema = z.object({
  sessionId: z.string().min(1).max(120),
  className: z.string().max(80),
  lessonTitle: z.string().max(200),
  updatedAt: z.string(),
  boardSnapshots: z.array(ClassroomBoardSnapshotSchema).max(40),
  studentWork: z.array(z.object({}).passthrough()),
  summary: z.string().max(500).optional(),
  keyPoints: z.array(z.string().max(240)).max(8).optional(),
  reviewQuestions: z.array(z.string().max(240)).max(8).optional(),
});

export type ClassroomBoardSnapshot = z.infer<typeof ClassroomBoardSnapshotSchema>;
export type ClassroomSnapshot = z.infer<typeof ClassroomSnapshotSchema>;

export type LessonQuestion = z.infer<typeof LessonQuestionSchema>;
export type LessonScene = z.infer<typeof LessonSceneSchema>;
export type LessonPlan = z.infer<typeof LessonPlanSchema>;
export type LessonTurnRequest = z.infer<typeof LessonTurnRequestSchema>;
export type LessonTurnResult = z.infer<typeof LessonTurnResultSchema>;
