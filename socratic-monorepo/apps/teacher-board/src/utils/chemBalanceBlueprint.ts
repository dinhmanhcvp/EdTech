/**
 * Từ chữ có phương trình hóa học (gõ hoặc viết tay đã nhận dạng, một hoặc hai vế) → bản thiết kế "cân bằng phương trình":
 * mỗi chất của phương trình có MỘT thanh trượt hệ số riêng (cùng thứ tự, cùng tên với phần trực quan), nên hình và thanh điều chỉnh luôn nói về cùng các chất.
 * Có một vế: máy dự đoán sản phẩm (nếu có luật) và nói rõ đó là dự đoán + loại phản ứng.
 */
import {planEquation, parseEquation, normalizeEquation, type Atoms} from './chemEquation';

const SUB = '₀₁₂₃₄₅₆₇₈₉';
/** "Al2(SO4)3" → "Al₂(SO₄)₃" */
export const prettyFormula = (f: string) => f.replace(/\d+/g, (m) => [...m].map((d) => SUB[Number(d)]).join(''));

export interface SpeciesMeta {
  formula: string;
  side: 'L' | 'R';
  atoms: Atoms;
}
export interface EquationMeta {
  species: SpeciesMeta[];
  /** sản phẩm do máy dự đoán */
  predicted: boolean;
  kind: string;
  note: string;
  /** hệ số đúng (theo thứ tự species); null = không cân bằng được / chưa dự đoán */
  solution: number[] | null;
  /** không xảy ra phản ứng */
  none: boolean;
}

export interface ChemEquationMatch {
  templateId: 'CHEM_BALANCE_SCALE';
  title: string;
  recognizedLatex: string;
  meta: EquationMeta;
  parameters: {key: string; label: string; unit: string; defaultValue: number; min: number; max: number; step: number}[];
  question: string;
}

const TOKEN = String.raw`\d*[A-Z][A-Za-z0-9()]*`;
const SIDE = String.raw`${TOKEN}(?:\s*\+\s*${TOKEN})*`;
const CANDIDATE = new RegExp(String.raw`(${SIDE})(?:\s*→\s*(${SIDE}))?`, 'g');

/** Tìm phương trình trong một câu ("Cân bằng Fe + O2 → Fe3O4", "Cho Zn + HCl"); null nếu không có. */
export function extractEquation(raw: string): string | null {
  // "=" viết giữa hai vế cũng là mũi tên (trừ <=>, >=)
  const t = normalizeEquation(raw).replace(/(?<![<>⇌])=(?!>)/g, '→');
  let best: string | null = null;
  for (const m of t.matchAll(CANDIDATE)) {
    const text = m[0].trim();
    const species = text.split(/\+|→/).length;
    if (species < 2 && !text.includes('→')) continue;
    if (!parseEquation(text)) continue;
    if (!best || text.length > best.length) best = text;
  }
  return best;
}

const latexOf = (sp: {formula: string; coef: number | null}[]) => sp.map((s) => `${s.coef && s.coef > 1 ? s.coef : ''}${s.formula.replace(/(\d+)/g, '_{$1}')}`).join(' + ');

export function matchChemEquation(raw: string): ChemEquationMatch | null {
  const text = extractEquation(raw);
  if (!text) return null;
  const plan = planEquation(text);
  if (!plan) return null;
  const right = plan.right ?? [];
  const species: SpeciesMeta[] = [...plan.left.map((s) => ({formula: s.formula, side: 'L' as const, atoms: s.atoms})), ...right.map((s) => ({formula: s.formula, side: 'R' as const, atoms: s.atoms}))];
  const written = [...plan.left, ...right].map((s) => s.coef);
  const maxSol = Math.max(9, ...(plan.solution ?? [0]).map((v) => v + 2));
  const meta: EquationMeta = {species, predicted: plan.predicted, kind: plan.kind, note: plan.note, solution: plan.solution, none: !!plan.none};
  const hasProducts = right.length > 0;
  return {
    templateId: 'CHEM_BALANCE_SCALE',
    title: plan.predicted ? `Phản ứng của ${plan.left.map((s) => prettyFormula(s.formula)).join(' + ')}` : 'Cân bằng phương trình hóa học',
    recognizedLatex: `${latexOf(plan.left)}${hasProducts ? ` \\rightarrow ${latexOf(right)}` : ''}`,
    meta,
    parameters: hasProducts
      ? species.map((s, i) => ({key: `c${i + 1}`, label: `Hệ số ${prettyFormula(s.formula)}`, unit: '', defaultValue: written[i] ?? 1, min: 1, max: maxSol, step: 1}))
      : [],
    question: plan.solution
      ? 'Với mỗi nguyên tố, số nguyên tử ở hai vế đã bằng nhau chưa? Em sẽ điều chỉnh hệ số của chất nào trước, vì sao?'
      : 'Em hãy nêu loại phản ứng này và viết thêm vế phải để kiểm tra cân bằng.',
  };
}
