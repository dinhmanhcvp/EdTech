/**
 * Chữ gõ bằng công cụ "Chèn chữ": phần lớn là chú thích, nhưng giáo viên cũng gõ công thức (x^2 + y^2 = 9, Fe + O2 -> Fe2O3)
 * hoặc câu lẫn cả hai ("thấu kính hội tụ f = 100", "Mg + HCl 40°C"). Công thức phải hiện như công thức,
 * chữ thường phải hiện như chữ, không dính liền và không ra `\text{x\^{}2}`.
 */

const REACTION = /->|→|<=>|⇌|⇄/;
const MATHY = /[\^_=+*/<>°]|->|→|⇌|⇄|\\[a-zA-Z]/;
const FUNCS = new Set(['sin', 'cos', 'tan', 'cot', 'log', 'ln', 'exp', 'lim', 'max', 'min']);

/** Có dấu hiệu công thức (mũ, bằng, cộng, mũi tên phản ứng, độ, lệnh LaTeX) thay vì chữ thường. */
export function looksMathy(text: string): boolean {
  return MATHY.test(text);
}

/** Một "từ" cần chữ thẳng: có dấu tiếng Việt, hoặc ≥ 3 chữ cái có chữ thường (từ, tên chất như HCl, NaOH). */
const isWord = (run: string) => /[^\u0000-\u007f]/.test(run) || (run.length >= 3 && /[a-z]/.test(run) && !FUNCS.has(run));

/** Chuyển cách gõ thường sang LaTeX: mũ/chỉ số, mũi tên phản ứng, độ, chữ tiếng Việt xen giữa công thức. */
export function typedToLatex(text: string): string {
  let s = text.trim();
  const chem = REACTION.test(s);
  s = s.replace(/<=>|⇌|⇄/g, ' \\rightleftharpoons ').replace(/->|→/g, ' \\to ');
  s = s.replace(/(\d)\s*°\s*([CFK])?/g, (_m, d: string, u?: string) => `${d}^{\\circ}${u ? '\\text{' + u + '}' : ''}`);
  s = s.replace(/sqrt\s*\(([^()]*)\)/g, '\\sqrt{$1}');
  if (chem) s = s.replace(/([A-Za-z)])(\d+)/g, '$1_{$2}');
  s = s.replace(/\^\s*(\([^)]*\)|-?[A-Za-z0-9.]+)/g, (_m, g: string) => `^{${g.replace(/^\(|\)$/g, '')}}`);
  s = s.replace(/_(?!\{)\s*(\([^)]*\)|[A-Za-z0-9]+)/g, (_m, g: string) => `_{${g.replace(/^\(|\)$/g, '')}}`);
  s = s.replace(/<=/g, '\\le ').replace(/>=/g, '\\ge ').replace(/\*/g, '\\cdot ');

  // chữ xen giữa: hàm toán học thành \sin…, từ thành \text{…} (bỏ qua phần đã là lệnh LaTeX hoặc nằm trong \text{…})
  let hasWord = false;
  s = s.replace(/\\text\{[^{}]*\}|\\[a-zA-Z]+|(?<![\\A-Za-z])([\p{L}]{2,})(?![\p{L}])/gu, (m, run?: string) => {
    if (!run) return m;
    if (FUNCS.has(run)) return `\\${run} `;
    if (isWord(run)) {
      hasWord = true;
      return `\\text{${run}}`;
    }
    return m;
  });
  // trong chế độ toán, dấu cách bị nuốt: có chữ thì chèn khoảng trắng cố định giữa các thành phần
  if (hasWord) s = s.replace(/\s+/g, '\\ ');
  return s.replace(/[ \t]{2,}/g, ' ').trim();
}
