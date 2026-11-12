/**
 * Gợi ý giải Socratic cho mọi môn: chẩn đoán chỗ vướng → một bước vừa sức (câu hỏi) → để thời gian tự làm → nâng mức khi vẫn kẹt.
 * Chỉ trình bày lời giải đầy đủ khi học sinh chủ động xin (mức 5, do AI). Khung Polya: ① Tìm hiểu đề ② Lập kế hoạch ③ Thực hiện ④ Kiểm tra lại.
 * Chạy ngoại tuyến từ ngân hàng dạng bài (socraticBank.ts); AI (ask-board mode "solve") chỉ làm câu hỏi sát đề hơn.
 */
import {BANK, GENERIC, SUBJECT_NAME, type ProblemType, type SubjectId} from './socraticBank';
import {extractEquation} from './chemBalanceBlueprint';
import {planEquation} from './chemEquation';
import type {BoardContext} from './boardContext';

export const THINK_TIME = 'Em thử nghĩ 1–2 phút hoặc viết nháp rồi trả lời, tôi chờ.';

const SUBJECT_IDS = Object.keys(SUBJECT_NAME) as SubjectId[];
export const isSubjectId = (s: string | null | undefined): s is SubjectId => !!s && (SUBJECT_IDS as string[]).includes(s);

/** Điểm khớp từ khóa của dạng: mỗi lần khớp 1 điểm + thưởng nhỏ theo độ dài (từ khóa dài thường đặc trưng hơn). 0 = không khớp. */
const hits = (re: RegExp, text: string) => {
  let s = 0;
  for (const m of text.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`))) s += 1 + m[0].length / 100;
  return s;
};
/** Dạng có từ khóa chung chung (xuất hiện ở nhiều môn/dạng): nhường dạng đặc trưng hơn khi hòa. */
const GENERAL_WEIGHT: Record<string, number> = {m_eq: 0.6, c_solution: 0.7, m_geo: 0.85, p_kin: 0.85};

/** Nhận diện dạng bài từ lời đề (và môn đang khóa, nếu có). Không chắc thì trả dạng chung của môn. */
export function classifyProblem(text: string, subjectHint?: string | null): ProblemType {
  const t = text || '';
  const hint = isSubjectId(subjectHint) ? subjectHint : null;
  const chemFormula = !!extractEquation(t);
  let best: ProblemType | null = null;
  let bestScore = 0;
  for (const ty of BANK) {
    if (!ty.re) continue;
    let s = hits(ty.re, t) * (GENERAL_WEIGHT[ty.id] ?? 1);
    if (!s) continue;
    if (hint && ty.subject === hint) s += 1.5;
    if (hint && ty.subject !== hint) s -= 1;
    if (chemFormula && ty.subject === 'CHEMISTRY') s += 2;
    if (chemFormula && ty.subject === 'MATH') s -= 1;
    if (s > bestScore) {
      best = ty;
      bestScore = s;
    }
  }
  if (best && bestScore > 0) return best;
  return GENERIC[hint ?? (chemFormula ? 'CHEMISTRY' : 'GENERAL')];
}

export const typesOfSubject = (s: SubjectId): ProblemType[] => [...BANK.filter((t) => t.subject === s), GENERIC[s]];

// ------------------------------------------------------------------ chẩn đoán và thang gợi ý
export type Stuck = 'understand' | 'plan' | 'compute' | 'check';
export const STUCK_OPTIONS: {id: Stuck; label: string}[] = [
  {id: 'understand', label: 'Em chưa hiểu đề hỏi gì'},
  {id: 'plan', label: 'Em hiểu đề nhưng chưa biết dùng kiến thức nào'},
  {id: 'compute', label: 'Em biết hướng nhưng làm ra kết quả sai / bí'},
  {id: 'check', label: 'Em có kết quả nhưng chưa chắc đúng'},
];
export const levelAfterDiagnosis = (s: Stuck): Level => (s === 'understand' ? 1 : s === 'plan' ? 2 : s === 'compute' ? 3 : 4);

export type Level = 1 | 2 | 3 | 4;
export const STAGE_TITLE: Record<Level, string> = {1: '① Tìm hiểu đề', 2: '② Lập kế hoạch', 3: '③ Thực hiện', 4: '④ Kiểm tra lại'};

export interface SolveHint {
  level: Level;
  title: string;
  question: string;
  /** gợi ý cho học sinh có thời gian tự làm (mức 1–3) */
  wait?: string;
}

/** Một câu hỏi dẫn dắt ở mức `level`; `variant` chọn câu khác cùng mức (Ý khác). */
export function hintAt(ty: ProblemType, level: Level, variant = 0): SolveHint {
  const title = STAGE_TITLE[level];
  if (level === 1) return {level, title, question: ty.given, wait: THINK_TIME};
  if (level === 2) return {level, title, question: ty.plan[variant % ty.plan.length], wait: THINK_TIME};
  if (level === 3) return {level, title, question: ty.step, wait: THINK_TIME};
  return {level, title, question: ty.check};
}

/** Câu hỏi về bẫy thường gặp (khi học sinh làm sai hoặc kẹt), lần lượt từng bẫy. */
export const pitfallQuestion = (ty: ProblemType, n: number): string => ty.pitfalls[n % ty.pitfalls.length];

export interface SolveState {
  level: Level;
  variant: number;
  pitfall: number;
  /** số lần làm sai/kẹt liên tiếp ở mức hiện tại */
  misses: number;
}
export const newSolveState = (): SolveState => ({level: 1, variant: 0, pitfall: 0, misses: 0});

/**
 * Sau một lượt: đúng → sang mức kế (không quá ④); sai/kẹt lần 1 → hỏi bẫy thường gặp ở cùng mức;
 * sai/kẹt lần 2 trở đi → nâng mức gợi ý (cụ thể hơn) nhưng vẫn là câu hỏi.
 */
export function advance(s: SolveState, outcome: 'ok' | 'miss'): {state: SolveState; ask: 'next' | 'pitfall' | 'deeper'} {
  if (outcome === 'ok') return {state: {...s, level: Math.min(4, s.level + 1) as Level, variant: 0, misses: 0}, ask: 'next'};
  const misses = s.misses + 1;
  if (misses === 1) return {state: {...s, misses, pitfall: s.pitfall + 1}, ask: 'pitfall'};
  return {state: {...s, misses, level: Math.min(4, s.level + 1) as Level, variant: s.variant + 1}, ask: 'deeper'};
}

// ------------------------------------------------------------------ nhận xét một bước làm (câu hỏi, không sửa hộ)
const KIND_QUESTION: Record<string, string> = {
  sign: 'Em kiểm tra lại dấu ở bước này (chuyển vế, nhân với số âm, dấu ngoặc)?',
  calculation: 'Em tính lại phép tính này bằng một cách khác (hoặc thế số đơn giản) xem có ra cùng kết quả không?',
  transform: 'Biến đổi này có tương đương với dòng trước không? Em đã dùng tính chất nào?',
  concept: 'Định lí/công thức em dùng ở đây có đủ điều kiện áp dụng không? Em thử nêu điều kiện đó.',
  unit: 'Đơn vị hai vế đã khớp chưa? Em đổi tất cả về cùng một hệ đơn vị thử.',
  balance: 'Số nguyên tử mỗi nguyên tố ở hai vế đã bằng nhau chưa? Em đếm lại từng nguyên tố.',
  missing: 'Em có bỏ sót bước hoặc điều kiện nào giữa hai dòng này không?',
};

export interface StepReview {
  verdict: 'ok' | 'miss' | 'unknown';
  question: string;
  /** chi tiết (giải thích, cách sửa) chỉ hiện khi học sinh bấm xem */
  detail?: string;
}

/** Nhận xét kết quả chấm (từ máy chủ) cho MỘT bước, dưới dạng câu hỏi. */
export function reviewFromGrade(step: {status: string; kind?: string; title?: string; explain?: string; fix?: string} | undefined): StepReview {
  if (!step) return {verdict: 'unknown', question: 'Tôi chưa kiểm tra được bước này. Em tự kiểm tra bằng cách thử số hoặc đổi cách làm nhé; bước đó dựa vào điều gì?'};
  if (step.status === 'ok') return {verdict: 'ok', question: 'Bước này hợp lí. Em nói vì sao em được phép làm như vậy, rồi bước kế tiếp của em là gì?'};
  if (step.status === 'warn' || step.status === 'unchecked') return {verdict: 'unknown', question: `Tôi chưa chắc chắn về bước này${step.title ? ` (${step.title})` : ''}. Em giải thích lí do em làm vậy được không?`};
  const q = KIND_QUESTION[step.kind ?? ''] ?? 'Em xem lại bước này: có điều kiện hay quy tắc nào em chưa dùng đúng?';
  return {verdict: 'miss', question: `${step.title ? `Ở bước này có chỗ chưa ổn (${step.title}). ` : 'Ở bước này có chỗ chưa ổn. '}${q}`, detail: [step.explain, step.fix].filter(Boolean).join(' ')};
}

/** Nhận xét NGOẠI TUYẾN cho một dòng là phương trình hóa học: đếm nguyên tử, không báo hệ số đúng. */
export function reviewChemLine(text: string): StepReview | null {
  const eq = extractEquation(text);
  const plan = eq ? planEquation(eq) : null;
  if (!plan || !plan.right || !plan.solution) return null;
  const all = [...plan.left, ...plan.right];
  if (all.some((s) => s.coef === null) && all.every((s) => s.coef === null)) return {verdict: 'unknown', question: 'Em ghi cả hệ số của từng chất để tôi cùng em kiểm tra số nguyên tử hai vế nhé.'};
  const coefs = all.map((s) => s.coef ?? 1);
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const count = (side: typeof plan.left, off: number) => {
    const out: Record<string, number> = {};
    side.forEach((s, i) => Object.entries(s.atoms).forEach(([e, c]) => (out[e] = (out[e] ?? 0) + c * coefs[off + i])));
    return out;
  };
  const L = count(plan.left, 0);
  const R = count(plan.right, plan.left.length);
  const off = [...new Set([...Object.keys(L), ...Object.keys(R)])].filter((e) => (L[e] ?? 0) !== (R[e] ?? 0));
  if (off.length) return {verdict: 'miss', question: `Nguyên tố ${off.slice(0, 3).join(', ')} đang chưa bằng nhau giữa hai vế. Em điều chỉnh hệ số của chất nào, và vì sao?`};
  if (coefs.reduce(gcd, 0) > 1) return {verdict: 'miss', question: 'Hai vế đã bằng nhau, nhưng hệ số chưa tối giản. Em có chia chung được cho số nào không?'};
  return {verdict: 'ok', question: 'Số nguyên tử mỗi nguyên tố hai vế đã bằng nhau. Em cho biết đây là loại phản ứng gì, và điều kiện để phản ứng xảy ra?'};
}

// ------------------------------------------------------------------ lấy đề từ bảng
/** Lời đề: chữ/công thức trong vùng đang chọn, không có vùng chọn thì toàn bộ chữ/công thức trên bảng. */
export function problemFromContext(ctx: BoardContext, max = 1500): string {
  const sel = new Set(ctx.selection?.item_ids ?? []);
  const items = ctx.items.filter((i) => i.kind === 'formula' || (i.kind === 'solid' && i.geo?.problem));
  const chosen = sel.size ? items.filter((i) => sel.has(i.id)) : items;
  return chosen
    .map((i) => (i.kind === 'solid' ? i.geo?.problem ?? '' : i.text || i.latex || ''))
    .filter(Boolean)
    .join('\n')
    .slice(0, max);
}
