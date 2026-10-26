/**
 * socratic-monorepo/apps/student-app/src/utils/bktEngine.ts
 * 
 * Bayesian Knowledge Tracing (BKT) Engine & Learning Analytics
 * Theo đặc tả Mục 3 & Mục 7 của NGHIEN_CUU_AI_TUTOR_GIA_SU_SAU_GIO_HOC.md
 * 
 * Mô hình hóa xác suất làm chủ từng Knowledge Component (KC) của học sinh:
 * - P(L_0): Xác suất ban đầu (Prior Mastery)
 * - P(T): Tốc độ tiếp thu (Transit Probability)
 * - P(G): Xác suất đoán mò (Guess Probability)
 * - P(S): Xác suất sơ suất (Slip Probability)
 */

export interface BKTParameters {
  pL0: number; // Prior mastery
  pT: number;  // Transit probability
  pG: number;  // Guess probability
  pS: number;  // Slip probability
}

export interface KnowledgeComponentState {
  id: string;
  name: string;
  subject: 'MATH' | 'PHYSICS' | 'CHEMISTRY' | 'BIOLOGY';
  masteryProbability: number; // P(L_t) trong khoảng [0, 1]
  attemptsCount: number;
  correctCount: number;
  consecutiveCorrect: number;
  lastAttemptTimestamp: number;
  nextReviewIntervalDays: number; // Spaced repetition interval
  misconceptionsDetected: string[];
}

export interface BKTUpdateResult {
  previousMastery: number;
  posteriorMastery: number; // P(L_t | Evidence)
  nextMastery: number;      // P(L_{t+1})
  isMastered: boolean;      // Threshold >= 0.85
  recommendedAction: 'ADVANCE' | 'REINFORCE_VISUAL' | 'SCAFFOLD_DECOMPOSE';
}

export const DEFAULT_BKT_PARAMS: Record<string, BKTParameters> = {
  DEFAULT: { pL0: 0.30, pT: 0.20, pG: 0.15, pS: 0.08 },
  MATH_TRIG: { pL0: 0.35, pT: 0.18, pG: 0.10, pS: 0.06 },
  PHYSICS_PROJECTILE: { pL0: 0.25, pT: 0.22, pG: 0.12, pS: 0.08 },
  CHEM_REDOX: { pL0: 0.20, pT: 0.20, pG: 0.10, pS: 0.05 },
  BIO_STOMATA: { pL0: 0.40, pT: 0.25, pG: 0.18, pS: 0.07 },
};

/**
 * Cập nhật xác suất làm chủ theo công thức Bayes tiêu chuẩn
 */
export function updateMasteryBKT(
  priorMastery: number,
  isCorrect: boolean,
  params: BKTParameters = DEFAULT_BKT_PARAMS.DEFAULT
): BKTUpdateResult {
  const pL = Math.max(0.001, Math.min(0.999, priorMastery));
  const { pT, pG, pS } = params;

  let posterior: number;

  if (isCorrect) {
    // P(L_t | Correct) = [P(L) * (1 - P(S))] / [P(L) * (1 - P(S)) + (1 - P(L)) * P(G)]
    const numerator = pL * (1 - pS);
    const denominator = numerator + (1 - pL) * pG;
    posterior = denominator > 0 ? numerator / denominator : pL;
  } else {
    // P(L_t | Incorrect) = [P(L) * P(S)] / [P(L) * P(S) + (1 - P(L)) * (1 - P(G))]
    const numerator = pL * pS;
    const denominator = numerator + (1 - pL) * (1 - pG);
    posterior = denominator > 0 ? numerator / denominator : pL;
  }

  // Cập nhật bước chuyển tiếp: P(L_{t+1}) = P(L_t | Evidence) + (1 - P(L_t | Evidence)) * P(T)
  const next = posterior + (1 - posterior) * pT;
  const clampedNext = Math.max(0.01, Math.min(0.99, next));

  let recommendedAction: BKTUpdateResult['recommendedAction'] = 'REINFORCE_VISUAL';
  if (clampedNext >= 0.85) {
    recommendedAction = 'ADVANCE';
  } else if (clampedNext < 0.40) {
    recommendedAction = 'SCAFFOLD_DECOMPOSE';
  }

  return {
    previousMastery: Math.round(pL * 100) / 100,
    posteriorMastery: Math.round(posterior * 100) / 100,
    nextMastery: Math.round(clampedNext * 100) / 100,
    isMastered: clampedNext >= 0.85,
    recommendedAction,
  };
}

/**
 * Tính chu kỳ ôn tập ngắt quãng (Spaced Repetition SM-2 Interval)
 */
export function calculateNextReviewInterval(
  consecutiveCorrect: number,
  currentIntervalDays: number = 1
): number {
  if (consecutiveCorrect <= 0) return 1;
  if (consecutiveCorrect === 1) return 1;
  if (consecutiveCorrect === 2) return 3;
  if (consecutiveCorrect === 3) return 7;
  return Math.min(30, Math.round(currentIntervalDays * 2.2));
}

/**
 * Tính chỉ số Productive Struggle Time (PST) và Scaffolding Efficiency Ratio (SER)
 */
export function computeStruggleMetrics(
  totalThinkingTimeSec: number,
  hintCount: number,
  stepsCompleted: number
) {
  const pstMinutes = Math.round((totalThinkingTimeSec / 60) * 10) / 10;
  const ser = stepsCompleted > 0 ? Math.round((hintCount / stepsCompleted) * 10) / 10 : 0;
  
  // Vùng nỗ lực tối ưu: 4 đến 8 phút mỗi bài toán khó
  const isOptimalStruggle = pstMinutes >= 4 && pstMinutes <= 8;

  return {
    pstMinutes,
    ser,
    isOptimalStruggle,
  };
}
