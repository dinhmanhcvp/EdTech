// apps/teacher-board/src/utils/latexPlain.ts
/** LaTeX → văn bản thuần dễ đọc/gõ (x², √(x), (a)/(b), π, ≤ …). Dùng cho "Chép văn bản" và khi xuất bảng. */

const SUP: Record<string, string> = {'0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻', n: 'ⁿ'};
const GREEK: Record<string, string> = {alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', theta: 'θ', lambda: 'λ', mu: 'μ', pi: 'π', rho: 'ρ', sigma: 'σ', phi: 'φ', varphi: 'φ', omega: 'ω', Delta: 'Δ', Sigma: 'Σ', Omega: 'Ω'};

/** Đọc một nhóm {...} hoặc một ký tự bắt đầu tại i; trả [nội dung, vị trí sau nhóm]. */
function grab(str: string, i: number): [string, number] {
  if (str[i] !== '{') return [str[i] ?? '', i + 1];
  let d = 0;
  for (let j = i; j < str.length; j++) {
    if (str[j] === '{') d++;
    else if (str[j] === '}' && --d === 0) return [str.slice(i + 1, j), j + 1];
  }
  return [str.slice(i + 1), str.length];
}

/** Thay \frac{a}{b}, \sqrt{a}, \text{a} từ trong ra ngoài (đệ quy theo nhóm cân bằng). */
function structural(s: string): string {
  let out = '';
  let i = 0;
  while (i < s.length) {
    if (s.startsWith('\\frac', i)) {
      const [a, j] = grab(s, i + 5);
      const [b, k] = grab(s, j);
      out += `(${structural(a)})/(${structural(b)})`;
      i = k;
    } else if (s.startsWith('\\sqrt', i)) {
      const [a, j] = grab(s, i + 5);
      out += `√(${structural(a)})`;
      i = j;
    } else if (s.startsWith('\\text', i)) {
      const [a, j] = grab(s, i + 5);
      out += structural(a);
      i = j;
    } else {
      out += s[i];
      i++;
    }
  }
  return out;
}

export function latexToPlain(latex: string): string {
  return structural(latex)
    .replace(/\\(le|leq)(?![a-zA-Z])/g, '≤')
    .replace(/\\(ge|geq)(?![a-zA-Z])/g, '≥')
    .replace(/\\ne(?![a-zA-Z])/g, '≠')
    .replace(/\\times(?![a-zA-Z])/g, '×')
    .replace(/\\div(?![a-zA-Z])/g, '÷')
    .replace(/\\cdot(?![a-zA-Z])/g, '·')
    .replace(/\\pm(?![a-zA-Z])/g, '±')
    .replace(/\\infty(?![a-zA-Z])/g, '∞')
    .replace(/\\int(?![a-zA-Z])/g, '∫')
    .replace(/\^\{\\circ\}|\^\\circ/g, '°')
    .replace(/\\(sin|cos|tan|cot|log|ln|lim|exp)(?![a-zA-Z])/g, '$1')
    .replace(/\\([A-Za-z]+)/g, (_m, n: string) => GREEK[n] ?? n)
    .replace(/\\[,;! ]/g, ' ')
    .replace(/\^\{([^{}]*)\}|\^(\w)/g, (_m, a: string | undefined, b: string | undefined) => {
      const t = a ?? b ?? '';
      return [...t].every((c) => SUP[c]) ? [...t].map((c) => SUP[c]).join('') : `^(${t})`;
    })
    .replace(/_\{([^{}]*)\}|_(\w)/g, (_m, a: string | undefined, b: string | undefined) => `_${a ?? b}`)
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
