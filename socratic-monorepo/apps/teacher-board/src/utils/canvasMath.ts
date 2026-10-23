// apps/teacher-board/src/utils/canvasMath.ts

const GREEK_MAP: Record<string, string> = {
  '\\alpha': 'α',
  '\\beta': 'β',
  '\\gamma': 'γ',
  '\\Gamma': 'Γ',
  '\\delta': 'δ',
  '\\Delta': 'Δ',
  '\\epsilon': 'ε',
  '\\varepsilon': 'ε',
  '\\zeta': 'ζ',
  '\\eta': 'η',
  '\\theta': 'θ',
  '\\Theta': 'Θ',
  '\\vartheta': 'θ',
  '\\iota': 'ι',
  '\\kappa': 'κ',
  '\\lambda': 'λ',
  '\\Lambda': 'Λ',
  '\\mu': 'μ',
  '\\nu': 'ν',
  '\\xi': 'ξ',
  '\\pi': 'π',
  '\\Pi': 'Π',
  '\\rho': 'ρ',
  '\\sigma': 'σ',
  '\\Sigma': 'Σ',
  '\\tau': 'τ',
  '\\upsilon': 'υ',
  '\\phi': 'φ',
  '\\varphi': 'φ',
  '\\Phi': 'Φ',
  '\\chi': 'χ',
  '\\psi': 'ψ',
  '\\Psi': 'Ψ',
  '\\omega': 'ω',
  '\\Omega': 'Ω',
};

const SUBSCRIPT_DIGITS: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
  '+': '₊',
  '-': '₋',
  '=': '₌',
  '(': '₍',
  ')': '₎',
  'a': 'ₐ',
  'e': 'ₑ',
  'h': 'ₕ',
  'i': 'ᵢ',
  'j': 'ⱼ',
  'k': 'ₖ',
  'l': 'ₗ',
  'm': 'ₘ',
  'n': 'ₙ',
  'o': 'ₒ',
  'p': 'ₚ',
  'r': 'ᵣ',
  's': 'ₛ',
  't': 'ₜ',
  'u': 'ᵤ',
  'v': 'ᵥ',
  'x': 'ₓ',
  'y': 'ᵧ',
};

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
  '=': '⁼',
  '(': '⁽',
  ')': '⁾',
  'n': 'ⁿ',
  'i': 'ⁱ',
};

const SUBSCRIPT_WORDS: Record<string, string> = {
  max: 'ₘₐₓ',
  min: 'ₘᵢₙ',
  ms: 'ₘₛ',
  kin: 'ₖᵢₙ',
  pot: 'ₚₒₜ',
  tot: 'ₜₒₜ',
  total: 'ₜₒₜₐₗ',
  net: 'ₙₑₜ',
  ext: 'ₑₓₜ',
  int: 'ᵢₙₜ',
  eq: 'ₑᵩ',
  R: 'ᵣ',
  L: 'ₗ',
  C: 'c',
  A: 'ₐ',
  B: 'b',
  M: 'ₘ',
  N: 'ₙ',
  P: 'ₚ',
  S: 'ₛ',
  T: 'ₜ',
  E: 'ₑ',
  H: 'ₕ',
  I: 'ᵢ',
  K: 'ₖ',
  X: 'ₓ',
  Y: 'ᵧ',
  Z: 'z',
  đ: 'đ',
  d: 'd',
  t: 'ₜ',
};

/**
 * Converts raw LaTeX mathematical/chemical expressions into clean, publication-grade Unicode.
 * Guaranteed: zero backslashes, zero raw underscores, zero raw carets.
 */
export function formatToCleanUnicode(raw: string): string {
  if (!raw) return '';
  let str = String(raw).trim();

  // Strip dollar signs
  str = str.replace(/^\$\$|\$\$$/g, '').replace(/^\$|\$$/g, '');

  // 1. Vectors: \vec{X} or \vec X -> X⃗
  str = str.replace(/\\vec\{([a-zA-Z0-9]+)\}/g, '$1⃗');
  str = str.replace(/\\vec\s+([a-zA-Z0-9])/g, '$1⃗');

  // 2. Greek Letters
  for (const [tex, uni] of Object.entries(GREEK_MAP)) {
    const reg = new RegExp(tex.replace(/\\/g, '\\\\') + '(?![a-zA-Z])', 'g');
    str = str.replace(reg, uni);
  }

  // 3. Mathematical operators & symbols
  str = str
    .replace(/\\rightarrow|\\to/g, '→')
    .replace(/\\rightleftharpoons|<=>/g, '⇌')
    .replace(/\\leftarrow/g, '←')
    .replace(/\\uparrow/g, '↑')
    .replace(/\\downarrow/g, '↓')
    .replace(/\\times/g, '×')
    .replace(/\\cdot/g, '·')
    .replace(/\\pm/g, '±')
    .replace(/\\approx/g, '≈')
    .replace(/\\neq/g, '≠')
    .replace(/\\leq|\\le/g, '≤')
    .replace(/\\geq|\\ge/g, '≥')
    .replace(/\\infty/g, '∞')
    .replace(/\\int/g, '∫')
    .replace(/\\sum/g, '∑')
    .replace(/\\partial/g, '∂')
    .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
    .replace(/\\sqrt/g, '√')
    .replace(/\^\\circ|\\circ|\\degree/g, '°')
    .replace(/\\Delta/g, 'Δ')
    .replace(/\\nabla/g, '∇')
    .replace(/\\ddot\{([^}]+)\}/g, '$1̈')
    .replace(/\\dot\{([^}]+)\}/g, '$1̇');

  // 4. Fractions: \frac{a}{b} -> (a)/(b)
  str = str.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');

  // 5. Common chemical formulas in plain text: Fe2O3 -> Fe₂O₃, CO2 -> CO₂, etc.
  str = str.replace(/\bFe3O4\b/g, 'Fe₃O₄');
  str = str.replace(/\bFe2O3\b/g, 'Fe₂O₃');
  str = str.replace(/\bHNO3\b/g, 'HNO₃');
  str = str.replace(/\bH2O\b/g, 'H₂O');
  str = str.replace(/\bCO2\b/g, 'CO₂');
  str = str.replace(/\bO2\b/g, 'O₂');
  str = str.replace(/\bN2\b/g, 'N₂');
  str = str.replace(/\bNH3\b/g, 'NH₃');
  str = str.replace(/\bH2SO4\b/g, 'H₂SO₄');
  str = str.replace(/\bCaCO3\b/g, 'CaCO₃');
  str = str.replace(/\bCH4\b/g, 'CH₄');
  str = str.replace(/\bC6H12O6\b/g, 'C₆H₁₂O₆');

  // 6. Subscript words: _max, _min, _ms, etc.
  for (const [w, sub] of Object.entries(SUBSCRIPT_WORDS)) {
    const regWord = new RegExp(`_\\{?${w}\\}?`, 'g');
    str = str.replace(regWord, sub);
  }

  // Subscripts: _{123} or _1
  str = str.replace(/_\{([a-zA-Z0-9+\-=()]+)\}/g, (_, inner) => {
    return inner.split('').map((c: string) => SUBSCRIPT_DIGITS[c] || SUBSCRIPT_WORDS[c] || c).join('');
  });
  str = str.replace(/_([0-9a-zA-Z])/g, (_, char) => {
    return SUBSCRIPT_DIGITS[char] || SUBSCRIPT_WORDS[char] || char;
  });

  // 7. Superscripts: ^{123} or ^2
  str = str.replace(/\^\{([0-9+\-()]+)\}/g, (_, inner) => {
    return inner.split('').map((c: string) => SUPERSCRIPT_DIGITS[c] || c).join('');
  });
  str = str.replace(/\^([0-9+\-])/g, (_, char) => {
    return SUPERSCRIPT_DIGITS[char] || char;
  });

  // 8. Stripping LaTeX wrapper commands: \text{...}, \mathrm{...}, \mathbf{...}, \quad, etc.
  str = str
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\mathrm\{([^}]+)\}/g, '$1')
    .replace(/\\mathbf\{([^}]+)\}/g, '$1')
    .replace(/\\mathit\{([^}]+)\}/g, '$1')
    .replace(/\\left|\\right/g, '')
    .replace(/\\quad|\\qquad/g, ' ')
    .replace(/\\,|\\;|\\!/g, ' ');

  // 9. Final cleanup: eradicate any remaining raw backslashes, underscores, carets, or braces
  str = str.replace(/[_^\\{}]/g, '');

  return str.trim();
}

/**
 * Format math/science strings specifically for HTML5 canvas ctx.fillText()
 * Guarantees zero backslashes, zero raw underscores, zero raw carets on canvas!
 */
export function formatCanvasMath(raw: string): string {
  if (!raw) return '';
  return formatToCleanUnicode(raw);
}
