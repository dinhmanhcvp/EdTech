import {z} from 'zod';

export const OnlineTutorProgressSchema = z.object({
  catalog_version: z.literal(1),
  total_points: z.number().int().nonnegative(),
  problems: z.array(z.object({
    problem_id: z.string().min(1),
    kc_id: z.string().min(1),
    step_count: z.number().int().min(1).max(20),
    completed_step: z.number().int().nonnegative(),
    mastery: z.number().min(0).max(1),
  }).refine(p => p.completed_step <= p.step_count)).refine(ps => new Set(ps.map(p => p.problem_id)).size === ps.length),
});

export const OnlineTutorAttemptResultSchema = z.object({
  status: z.enum(['VERIFIED_CORRECT', 'VERIFIED_INCORRECT', 'UNVERIFIED']),
  points: z.union([z.literal(0), z.literal(20)]),
  mastery: z.number().min(0).max(1),
  completed_step: z.number().int().min(0).max(20),
  catalog_version: z.literal(1),
  feedback: z.string(),
  progress: OnlineTutorProgressSchema,
}).refine(r => r.status === 'VERIFIED_CORRECT' || r.points === 0);

export type OnlineTutorProgress = z.infer<typeof OnlineTutorProgressSchema>;
export type OnlineTutorAttemptResult = z.infer<typeof OnlineTutorAttemptResultSchema>;
