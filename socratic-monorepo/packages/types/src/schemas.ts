import { z } from 'zod';

export const SimParamConfigSchema = z.object({
  key: z.string(),
  label: z.string(),
  unit: z.string(),
  defaultValue: z.number(),
  min: z.number(),
  max: z.number(),
  step: z.number(),
});

export const SimulationBlueprintSchema = z.object({
  engine: z.enum(['MATH', 'PHYSICS', 'CHEMISTRY', 'BIOLOGY']),
  templateId: z.string(),
  recognizedLatex: z.string(),
  ocrAlternatives: z.array(z.string()).optional(),
  expressions: z.array(z.string()).optional(),
  meta: z.record(z.string(), z.any()).optional(),
  parameters: z.array(SimParamConfigSchema),
  socraticQuestion: z.string(),
});

export const StrokePointSchema = z.object({
  x: z.number(),
  y: z.number(),
  pressure: z.number().optional(),
  time: z.number().optional(),
});

export const StrokeSchema = z.object({
  id: z.string().optional(),
  color: z.string().optional(),
  width: z.number().optional(),
  points: z.array(StrokePointSchema),
});

export const CanvasStateSchema = z.object({
  strokes: z.array(StrokeSchema),
  viewportWidth: z.number().optional(),
  viewportHeight: z.number().optional(),
  timestamp: z.number().optional(),
});

export const SocraticStepEvaluationSchema = z.object({
  verification_source: z.enum(['SYMPY_DETERMINISTIC', 'CHROMADB_CACHE', 'LLM_FALLBACK']),
  is_step_correct: z.boolean(),
  error_category: z.enum([
    'STOICHIOMETRY_IMBALANCE',
    'ALGEBRAIC_SIGN_ERROR',
    'FORMULA_MISMATCH',
    'UNIT_INCONSISTENCY',
  ]).nullable(),
  step_status: z.enum([
    'IN_PROGRESS',
    'UNLOCKED_NEXT',
    'CONCEPT_CHECK_REQUIRED',
    'COMPLETED',
  ]),
  socratic_feedback: z.string(),
  visual_debugger: z.any().optional().nullable(),
  eureka_points_delta: z.number(),
});

export type SimulationBlueprintZod = z.infer<typeof SimulationBlueprintSchema>;
export type StrokeZod = z.infer<typeof StrokeSchema>;
export type SocraticStepEvaluationZod = z.infer<typeof SocraticStepEvaluationSchema>;
