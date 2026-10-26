/**
 * SOCRATIC VISION BOARD v2.0.0
 * Core Shared Data Contracts & Schemas
 * (Hybrid Edge-First & Deterministic Engine Architecture)
 */

export * from './simulation';
export * from './schemas';
export * from './pilot';

export type SubjectType = 'MATH' | 'PHYSICS' | 'CHEMISTRY' | 'BIOLOGY';

export type EngineType =
  | 'MATH_2D_PLOT'
  | 'PHYSICS_MECHANICS'
  | 'CHEMISTRY_REACTION'
  | 'CHEMISTRY_MOLECULE'
  | 'BIOLOGY_STATE_SIM';

export type PhysicsTemplateId =
  | 'PROJECTILE_MOTION'
  | 'SIMPLE_PENDULUM'
  | 'SPRING_OSCILLATOR'
  | 'INCLINED_PLANE'
  | 'OPTICS_LENS';

export type MathTemplateId =
  | 'TRIGONOMETRIC_WAVE'
  | 'POLYNOMIAL_FUNCTION'
  | 'INTEGRAL_AREA'
  | 'EXPONENTIAL_LOG';

export type ChemistryTemplateId =
  | 'REDOX_REACTION'
  | 'ACID_BASE_TITRATION'
  | 'PRECIPITATION_LAB'
  | 'MOLECULE_3D';

export type BiologyTemplateId =
  | 'HEART_PULSE_BPM'
  | 'LEAF_STOMATA_GAS'
  | 'DNA_REPLICATION_FORK'
  | 'CELL_MITOSIS';

export type TemplateId =
  | PhysicsTemplateId
  | MathTemplateId
  | ChemistryTemplateId
  | BiologyTemplateId
  | string;

export interface SimulationParameter {
  key: string;
  label: string;
  unit: string;
  default: number;
  min: number;
  max: number;
  step: number;
}

export interface VisualEffectsConfig {
  show_vectors?: boolean;
  gas_bubbles?: boolean;
  precipitate_color?: string | null;
  ambient_temperature?: number;
  glow_color?: string;
  particle_density?: number;
}

export interface OCRResult {
  recognized_latex: string;
  subject: SubjectType;
  confidence: number;
  alternatives: string[];
}

export interface SimulationBlueprintCore {
  engine: EngineType;
  template_id: TemplateId;
  expressions: string[];
  smiles: string | null;
  parameters: SimulationParameter[];
  visual_effects: VisualEffectsConfig;
}

export interface SocraticCue {
  question: string;
  target_parameter: string;
  hint?: string;
  follow_up?: string;
}

/**
 * 4.1 Hợp đồng SimulationBlueprint (Trả về từ 1 lần gọi Magic Lasso duy nhất)
 * Endpoint: POST /api/v1/canvas/compile-lasso
 */
export interface UnifiedLassoResponse {
  ocr_result: OCRResult;
  simulation_blueprint: SimulationBlueprintCore;
  socratic_cue: SocraticCue;
}

export type VerificationSource =
  | 'SYMPY_DETERMINISTIC'
  | 'CHROMADB_CACHE'
  | 'LLM_FALLBACK';

export type ErrorCategory =
  | 'STOICHIOMETRY_IMBALANCE'
  | 'ALGEBRAIC_SIGN_ERROR'
  | 'FORMULA_MISMATCH'
  | 'UNIT_INCONSISTENCY'
  | null;

export type StepStatus =
  | 'IN_PROGRESS'
  | 'UNLOCKED_NEXT'
  | 'CONCEPT_CHECK_REQUIRED'
  | 'COMPLETED';

export type VisualDebuggerType =
  | 'CHEMICAL_BALANCE_SCALE'
  | 'FUNCTION_EXTREMA_GRAPH'
  | 'VECTOR_FORCE_POLYGON'
  | 'ATOM_COUNT_BARS';

export interface ChemicalBalancePayload {
  left_atoms: Record<string, number>;
  right_atoms: Record<string, number>;
  reaction_equation?: string;
}

export interface VisualDebuggerConfig {
  widget_type: VisualDebuggerType;
  payload: ChemicalBalancePayload | Record<string, any>;
}

/**
 * 4.2 Hợp đồng SocraticStepEvaluation (Feature 6 - Ưu tiên SymPy & ChromaDB)
 * Endpoint: POST /api/v1/companion/evaluate-step
 */
export interface SocraticStepEvaluation {
  verification_source: VerificationSource;
  is_step_correct: boolean;
  error_category: ErrorCategory;
  step_status: StepStatus;
  socratic_feedback: string;
  visual_debugger?: VisualDebuggerConfig | null;
  eureka_points_delta: number;
}

// User & Session types
export interface User {
  id: string;
  role: 'teacher' | 'student' | 'admin' | 'parent';
  name: string;
  avatarUrl?: string;
  eurekaPoints?: number;
  gritScore?: number;
}

export interface ScaffoldingStep {
  stepIndex: number;
  title: string;
  instruction: string;
  isUnlocked: boolean;
  isCompleted: boolean;
  expectedConceptId: string;
  visualWidget?: VisualDebuggerType | null;
  cachedResponseId?: string;
}

export interface SocraticSession {
  sessionId: string;
  studentId: string;
  subjectId: SubjectType;
  problemStatement: string;
  steps: ScaffoldingStep[];
  currentStepIndex: number;
  isReverseVoiceGateActive: boolean;
  gritAttemptCount: number;
}

export interface KnowledgeHeatmapNode {
  studentId: string;
  studentName: string;
  topicId: string;
  topicName: string;
  masteryLevel: 'green' | 'yellow' | 'red';
  timeSpentMs: number;
  gritScore: number;
  recentError?: string;
}

// Canvas & Realtime Synchronization Types
export interface CanvasStrokePoint {
  x: number;
  y: number;
  pressure?: number;
  time?: number;
}

export interface CanvasStroke {
  id?: string;
  color?: string;
  width?: number;
  points: CanvasStrokePoint[];
}

export interface CanvasState {
  strokes: CanvasStroke[];
  viewportWidth?: number;
  viewportHeight?: number;
  timestamp?: number;
}

export interface SandboxEvent {
  variableKey: string;
  newValue: number | string | boolean;
  senderId?: string;
  timestamp?: number;
  fullState?: Record<string, any>;
}

