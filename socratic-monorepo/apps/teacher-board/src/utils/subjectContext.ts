// apps/teacher-board/src/utils/subjectContext.ts
/**
 * "Vân tay đơn vị" & từ khóa để đoán MÔN HỌC của một đoạn chữ (Tầng 2 trong tài liệu nghiên cứu: phễu nhận diện 4 tầng).
 * Dùng để (1) hiện lý do hệ thống nghĩ đó là môn nào, (2) khóa môn khi giáo viên chọn tay, (3) giải nghĩa ký hiệu nhập nhằng (T, k…).
 */
export type Subject = 'MATH' | 'PHYSICS' | 'CHEMISTRY' | 'BIOLOGY';

export const SUBJECT_LABEL: Record<Subject, string> = {
  MATH: 'Toán',
  PHYSICS: 'Vật lí',
  CHEMISTRY: 'Hóa học',
  BIOLOGY: 'Sinh học',
};

interface Rule {
  re: RegExp;
  weight: number;
  why: string;
}

const RULES: Record<Subject, Rule[]> = {
  PHYSICS: [
    {re: /\bm\s*\/\s*s(?:\s*\^?\s*[2²])?(?![a-z])/i, weight: 3, why: 'đơn vị m/s'},
    {re: /\brad\s*\/\s*s\b/i, weight: 3, why: 'đơn vị rad/s'},
    {re: /\d\s*(?:N|J|W|Hz|kg|Ω|V|A)(?![A-Za-z])/, weight: 2, why: 'đơn vị N, J, W, Hz, kg…'},
    {re: /v_?\{?0\}?|\\alpha|\balpha\b|α/i, weight: 1.5, why: 'v₀, α'},
    {re: /ném|con lắc|lò xo|thấu kính|mặt phẳng nghiêng|ma sát|dao động|sóng|giao thoa|điện xoay chiều|\bRLC\b|fresnel|cộng hưởng/i, weight: 3, why: 'từ khóa vật lí'},
    {re: /\bF\s*=\s*m\s*a\b|\bP\s*=\s*m\s*g\b|\bg\s*=\s*9[.,]8/i, weight: 3, why: 'công thức cơ học'},
  ],
  CHEMISTRY: [
    {re: /\bmol(?:\s*\/\s*L)?\b|\bmL\b|\bkJ\s*\/\s*mol\b|\d\s*M\b/, weight: 3, why: 'đơn vị mol, mL, M, kJ/mol'},
    {re: /\bpH\b|chuẩn độ|axit|bazơ|kết tủa|oxi hóa|khử|cân bằng hóa học|phản ứng/i, weight: 3, why: 'từ khóa hóa học'},
    {re: /(?:→|⇌|->|<->|\\rightarrow|\\rightleftharpoons)/, weight: 1.5, why: 'mũi tên phản ứng'},
    {re: /\b(?:HCl|NaOH|H_?2\s*O|CO_?2|O_?2|H_?2\s*SO_?4|Fe_?2\s*O_?3|NaCl|NH_?3|CH_?4|KMnO_?4)\b/, weight: 3, why: 'công thức hóa học'},
    {re: /\b(?:Fe|Cu|Zn|Mg|Al|Na|Ca)\s*[+\-]/, weight: 1.5, why: 'ký hiệu nguyên tố'},
  ],
  BIOLOGY: [
    {re: /\bmmHg\b|\bBPM\b|\bbp\b|\bkb\b|cá thể\s*\/\s*ha/i, weight: 3, why: 'đơn vị mmHg, BPM, bp…'},
    {re: /\b(?:AA|Aa|aa)\b|AaBb|P\s*:\s*[A-Za-z]{2,}\s*[x×]/, weight: 3, why: 'kí hiệu kiểu gen'},
    {re: /\bADN\b|\bDNA\b|\bATP\b|\bARN\b|helicase|operon|ti thể|khí khổng|quang hợp|hô hấp tế bào|nhịp tim|chu kỳ tim|ecg|thẩm thấu|co nguyên sinh|hardy|weinberg|gen|alen|nhiễm sắc thể|tế bào/i, weight: 3, why: 'từ khóa sinh học'},
  ],
  MATH: [
    {re: /\b(?:sin|cos|tan|cot|lim|log|ln)\b|\\(?:sin|cos|tan|lim|int|sqrt|frac)|∫|√/i, weight: 1.5, why: 'hàm/phép toán'},
    {re: /\b[fy]\s*\(?x?\)?\s*=|x\s*\^|x²|y\s*=/i, weight: 1.5, why: 'hàm số y = f(x)'},
    {re: /đồ thị|hàm số|phương trình|bất phương trình|tích phân|đạo hàm|hình chóp|hình hộp|lập phương|lăng trụ|tiệm cận|cực trị/i, weight: 3, why: 'từ khóa toán học'},
    {re: /[<>≤≥]|\\le|\\ge/, weight: 0.8, why: 'bất phương trình'},
  ],
};

export interface SubjectGuess {
  subject: Subject | null;
  scores: Record<Subject, number>;
  evidence: string[];
  confidence: number;
}

export function detectSubject(text: string): SubjectGuess {
  const t = text || '';
  const scores: Record<Subject, number> = {MATH: 0, PHYSICS: 0, CHEMISTRY: 0, BIOLOGY: 0};
  const evidence: Record<Subject, string[]> = {MATH: [], PHYSICS: [], CHEMISTRY: [], BIOLOGY: []};
  for (const s of Object.keys(RULES) as Subject[]) {
    for (const r of RULES[s]) {
      if (r.re.test(t)) {
        scores[s] += r.weight;
        evidence[s].push(r.why);
      }
    }
  }
  const ranked = (Object.keys(scores) as Subject[]).sort((a, b) => scores[b] - scores[a]);
  const top = ranked[0];
  const total = ranked.reduce((s, k) => s + scores[k], 0);
  if (scores[top] < 1.5) return {subject: null, scores, evidence: [], confidence: 0};
  return {subject: top, scores, evidence: evidence[top], confidence: Math.min(1, scores[top] / Math.max(total, 1e-9)) * Math.min(1, scores[top] / 4)};
}

/** Giải nghĩa ký hiệu nhập nhằng theo ngữ cảnh (tài liệu 7.3). Trả null nếu không đủ dấu hiệu. */
export function disambiguateSymbol(symbol: 'T' | 'k', text: string): {meaning: string; templateId: string} | null {
  const t = text || '';
  if (symbol === 'T') {
    if (/\bN\b|\d\s*N\b|dây/i.test(t) && !/°\s*C|\bK\b/.test(t)) return {meaning: 'Lực căng dây (N)', templateId: 'PHYS_PENDULUM'};
    if (/2\s*(?:π|\\pi|pi)|sqrt\s*\(?\s*L|\\sqrt\{?\s*\\?frac\{?L|\bs\b|giây|chu kỳ/i.test(t)) return {meaning: 'Chu kì dao động (s)', templateId: 'PHYS_PENDULUM'};
    if (/°\s*C|\bK\b|pV\s*=\s*nRT|nhiệt độ/i.test(t)) return {meaning: 'Nhiệt độ', templateId: 'CHEM_REACTION_LAB'};
    if (/lympho|CD4|CD8/i.test(t)) return {meaning: 'Tế bào lympho T', templateId: 'BIO_HEART_CYCLE'};
    return null;
  }
  if (/f\s*'|\\prime|tiếp tuyến|hệ số góc/i.test(t)) return {meaning: 'Hệ số góc tiếp tuyến', templateId: 'MATH_FUNC_2D'};
  if (/N\s*\/\s*m|lò xo|độ cứng/i.test(t)) return {meaning: 'Độ cứng lò xo (N/m)', templateId: 'PHYS_PENDULUM'};
  if (/\[\s*[A-Z]\s*\]|tốc độ phản ứng|v\s*=\s*k\s*\[/i.test(t)) return {meaning: 'Hằng số tốc độ phản ứng', templateId: 'CHEM_REACTION_LAB'};
  return null;
}
