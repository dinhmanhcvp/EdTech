// apps/teacher-board/src/utils/mathExpr.ts
/**
 * Bộ phân tích biểu thức toán học (không phụ thuộc thư viện ngoài).
 * - Nhận văn bản thường, ký hiệu Unicode (², √, π, ×, −) và LaTeX (\frac, \sqrt, \sin, ^{...}).
 * - Hỗ trợ nhân ngầm: 2x, 3sin x, (x+1)(x-1), A sin x + B.
 * - Tự phát hiện tham số tự do (A, B, k, m…) để sinh thanh trượt.
 * - Biên dịch sang hàm số học thuần để vẽ 60 FPS; có đạo hàm, nghiệm, giao điểm, cực trị, tích phân.
 */

export type Vars = Record<string, number>;

export type Node =
  | {t: 'num'; v: number}
  | {t: 'var'; n: string}
  | {t: 'neg'; a: Node}
  | {t: 'bin'; op: '+' | '-' | '*' | '/' | '^'; a: Node; b: Node}
  | {t: 'fn'; n: string; a: Node};

const FUNCS: Record<string, (v: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  cot: (v) => 1 / Math.tan(v),
  sec: (v) => 1 / Math.cos(v),
  csc: (v) => 1 / Math.sin(v),
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  sqrt: Math.sqrt,
  cbrt: Math.cbrt,
  abs: Math.abs,
  ln: Math.log,
  lg: Math.log10,
  log: Math.log10,
  exp: Math.exp,
  floor: Math.floor,
  ceil: Math.ceil,
  sign: Math.sign,
};

const FN_ALIASES: Record<string, string> = {arcsin: 'asin', arccos: 'acos', arctan: 'atan', tg: 'tan', cotg: 'cot', ctg: 'cot'};
const CONSTS: Record<string, number> = {pi: Math.PI, e: Math.E};
const GREEK = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'varepsilon', 'zeta', 'eta', 'theta', 'vartheta', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'rho', 'sigma', 'tau', 'phi', 'varphi', 'chi', 'psi', 'omega'];
const KNOWN_WORDS = [...Object.keys(FUNCS), ...Object.keys(FN_ALIASES), ...GREEK, 'pi'].sort((a, b) => b.length - a.length);
export const RESERVED_VARS = new Set(['x', 'y', 'pi', 'e']);

const UNI_GREEK: Record<string, string> = {α: 'alpha', β: 'beta', γ: 'gamma', δ: 'delta', ε: 'epsilon', θ: 'theta', λ: 'lambda', μ: 'mu', π: 'pi', ρ: 'rho', σ: 'sigma', τ: 'tau', φ: 'phi', ω: 'omega'};
const SUPER: Record<string, string> = {'⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-', '⁺': '+'};

// ------------------------------------------------------------------ LaTeX → văn bản có thể phân tích
const matchBrace = (s: string, i: number): number => {
  // s[i] === '{' → trả về chỉ số '}' tương ứng
  let d = 0;
  for (let k = i; k < s.length; k++) {
    if (s[k] === '{') d++;
    else if (s[k] === '}') {
      d--;
      if (d === 0) return k;
    }
  }
  return -1;
};

export function latexToExpr(input: string): string {
  let s = input || '';
  s = s.replace(/\\left|\\right/g, '').replace(/\\[,;:! ]/g, ' ').replace(/\\(?:quad|qquad)/g, ' ').replace(/\\displaystyle/g, '');
  s = s.replace(/\{,\}/g, '.').replace(/\\cdot|\\times|\\ast/g, '*').replace(/\\div/g, '/').replace(/\\pm/g, '+');
  // \frac{a}{b}, \dfrac, \tfrac
  for (let guard = 0; guard < 40; guard++) {
    const m = /\\[dt]?frac\s*\{/.exec(s);
    if (!m) break;
    const a0 = m.index + m[0].length - 1;
    const a1 = matchBrace(s, a0);
    if (a1 < 0 || s[a1 + 1] !== '{') break;
    const b1 = matchBrace(s, a1 + 1);
    if (b1 < 0) break;
    s = `${s.slice(0, m.index)}((${s.slice(a0 + 1, a1)})/(${s.slice(a1 + 2, b1)}))${s.slice(b1 + 1)}`;
  }
  // \sqrt[n]{a} và \sqrt{a}
  for (let guard = 0; guard < 40; guard++) {
    let m = /\\sqrt\s*\[([^\]]+)\]\s*\{/.exec(s);
    if (m) {
      const a0 = m.index + m[0].length - 1;
      const a1 = matchBrace(s, a0);
      if (a1 < 0) break;
      s = `${s.slice(0, m.index)}((${s.slice(a0 + 1, a1)})^(1/(${m[1]})))${s.slice(a1 + 1)}`;
      continue;
    }
    m = /\\sqrt\s*\{/.exec(s);
    if (!m) break;
    const a0 = m.index + m[0].length - 1;
    const a1 = matchBrace(s, a0);
    if (a1 < 0) break;
    s = `${s.slice(0, m.index)}sqrt(${s.slice(a0 + 1, a1)})${s.slice(a1 + 1)}`;
  }
  s = s.replace(/\\sqrt\s*([0-9a-zA-Z.]+)/g, 'sqrt($1)');
  // ^{...} và _{...}
  s = s.replace(/\^\s*\{([^{}]*)\}/g, '^($1)').replace(/_\s*\{[^{}]*\}/g, '').replace(/_[0-9a-zA-Z]/g, '');
  // \sin → sin, \pi → pi, \alpha → alpha…
  s = s.replace(/\\([a-zA-Z]+)/g, '$1');
  return s.replace(/[{}]/g, (c) => (c === '{' ? '(' : ')'));
}

/** Chuẩn hóa văn bản người dùng/nhận dạng thành biểu thức phân tích được (Unicode, LaTeX, dấu phẩy thập phân…). */
export function normalizeMathInput(input: string): string {
  // chỉ số trên Unicode phải xử lý TRƯỚC NFKC (NFKC sẽ đổi ² thành 2): x²⁺¹ → x^(2+1)
  let s = latexToExpr(input).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+/g, (m) => `^(${[...m].map((c) => SUPER[c] ?? '').join('')})`);
  s = s.normalize('NFKC').replace(/[−–—]/g, '-').replace(/[×·⋅∙]/g, '*').replace(/÷/g, '/');
  s = s.replace(/√\s*\(/g, 'sqrt(').replace(/√\s*([0-9a-zA-Z.]+)/g, 'sqrt($1)').replace(/√/g, 'sqrt');
  s = s.replace(/[αβγδεθλμπρστφω]/g, (c) => ` ${UNI_GREEK[c]} `);
  s = s.replace(/(\d),(\d)/g, '$1.$2'); // 0,5 → 0.5 (dấu phẩy thập phân tiếng Việt)
  return s.replace(/\s+/g, ' ').trim();
}

// ------------------------------------------------------------------ Tokenizer
type Tok = {k: 'num' | 'id' | 'fn' | 'op' | 'lp' | 'rp' | 'bar'; v: string};

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ') {
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      const m = /^(\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+(?![a-zA-Z]))?/.exec(src.slice(i));
      if (!m) throw new Error(`Số không hợp lệ tại "${src.slice(i, i + 4)}"`);
      out.push({k: 'num', v: m[0]});
      i += m[0].length;
      continue;
    }
    if (/[a-zA-Z]/.test(c)) {
      const rest = src.slice(i);
      const word = KNOWN_WORDS.find((w) => rest.toLowerCase().startsWith(w) && !(w.length <= 1));
      // tên đầy đủ khớp từ điển (sin, cos, alpha…); nếu chuỗi chữ dài hơn nhưng không khớp → từng chữ cái là một biến
      if (word) {
        const canon = FN_ALIASES[word] ?? word;
        out.push({k: FUNCS[canon] ? 'fn' : 'id', v: FUNCS[canon] ? canon : word});
        i += word.length;
      } else {
        out.push({k: 'id', v: c});
        i++;
      }
      continue;
    }
    if ('+-*/^'.includes(c)) {
      out.push({k: 'op', v: c});
      i++;
      continue;
    }
    if (c === '(' || c === '[') {
      out.push({k: 'lp', v: '('});
      i++;
      continue;
    }
    if (c === ')' || c === ']') {
      out.push({k: 'rp', v: ')'});
      i++;
      continue;
    }
    if (c === '|') {
      out.push({k: 'bar', v: '|'});
      i++;
      continue;
    }
    throw new Error(`Ký tự không hỗ trợ: "${c}"`);
  }
  return out;
}

// ------------------------------------------------------------------ Parser
class Parser {
  private p = 0;
  private barOpen = 0;
  constructor(private toks: Tok[]) {}

  private peek = () => this.toks[this.p];
  private next = () => this.toks[this.p++];
  private isOp = (v: string) => this.peek()?.k === 'op' && this.peek().v === v;

  parse(): Node {
    const n = this.expr();
    if (this.p < this.toks.length) throw new Error(`Thừa ký hiệu "${this.peek().v}"`);
    return n;
  }

  private expr(): Node {
    let l = this.term();
    while (this.isOp('+') || this.isOp('-')) {
      const op = this.next().v as '+' | '-';
      l = {t: 'bin', op, a: l, b: this.term()};
    }
    return l;
  }

  private startsAtom(): boolean {
    const t = this.peek();
    if (!t) return false;
    if (t.k === 'num' || t.k === 'id' || t.k === 'fn' || t.k === 'lp') return true;
    // dấu | mở trị tuyệt đối chỉ khi chưa có | đang mở (tránh nhầm với | đóng)
    return t.k === 'bar' && this.barOpen === 0;
  }

  private term(): Node {
    let l = this.unary();
    for (;;) {
      if (this.isOp('*') || this.isOp('/')) {
        const op = this.next().v as '*' | '/';
        l = {t: 'bin', op, a: l, b: this.unary()};
      } else if (this.startsAtom()) {
        l = {t: 'bin', op: '*', a: l, b: this.power()}; // nhân ngầm: 2x, 3(x+1), (x+1)(x-1)
      } else break;
    }
    return l;
  }

  private unary(): Node {
    if (this.isOp('-')) {
      this.next();
      return {t: 'neg', a: this.unary()};
    }
    if (this.isOp('+')) {
      this.next();
      return this.unary();
    }
    return this.power();
  }

  private power(): Node {
    const base = this.atom();
    if (this.isOp('^')) {
      this.next();
      return {t: 'bin', op: '^', a: base, b: this.exponent()};
    }
    return base;
  }

  private exponent(): Node {
    if (this.isOp('-')) {
      this.next();
      return {t: 'neg', a: this.exponent()};
    }
    if (this.isOp('+')) {
      this.next();
      return this.exponent();
    }
    const a = this.atom();
    return this.isOp('^') ? (this.next(), {t: 'bin', op: '^', a, b: this.exponent()}) : a;
  }

  /** Đối số của hàm không có ngoặc: dãy thừa số (số, biến, ngoặc) có thể kèm lũy thừa, dừng ở toán tử hoặc hàm khác. */
  private bareArg(): Node {
    let l = this.power();
    while (this.peek() && (this.peek().k === 'num' || this.peek().k === 'id' || this.peek().k === 'lp')) l = {t: 'bin', op: '*', a: l, b: this.power()};
    return l;
  }

  private atom(): Node {
    const t = this.next();
    if (!t) throw new Error('Biểu thức chưa hoàn chỉnh');
    if (t.k === 'num') return {t: 'num', v: parseFloat(t.v)};
    if (t.k === 'id') return CONSTS[t.v] !== undefined && t.v !== 'e' ? {t: 'num', v: CONSTS[t.v]} : {t: 'var', n: t.v};
    if (t.k === 'lp') {
      const saved = this.barOpen;
      this.barOpen = 0;
      const n = this.expr();
      this.barOpen = saved;
      if (this.next()?.k !== 'rp') throw new Error('Thiếu dấu đóng ngoặc )');
      return n;
    }
    if (t.k === 'bar') {
      this.barOpen++;
      const n = this.expr();
      this.barOpen--;
      if (this.next()?.k !== 'bar') throw new Error('Thiếu dấu | đóng');
      return {t: 'fn', n: 'abs', a: n};
    }
    if (t.k === 'fn') {
      // sin²x, sin^2(x) → (sin x)^2
      let expo: Node | null = null;
      if (this.isOp('^')) {
        this.next();
        expo = this.exponent();
      }
      let arg: Node;
      if (this.peek()?.k === 'lp') {
        this.next();
        const saved = this.barOpen;
        this.barOpen = 0;
        arg = this.expr();
        this.barOpen = saved;
        if (this.next()?.k !== 'rp') throw new Error('Thiếu dấu đóng ngoặc )');
      } else if (this.peek()?.k === 'bar' || !this.peek() || this.peek().k === 'op' || this.peek().k === 'rp') {
        if (this.peek()?.k === 'bar') arg = this.atom();
        else throw new Error(`Hàm ${t.v} thiếu đối số`);
      } else arg = this.bareArg();
      const call: Node = {t: 'fn', n: t.v, a: arg};
      return expo ? {t: 'bin', op: '^', a: call, b: expo} : call;
    }
    throw new Error(`Không hiểu "${t.v}"`);
  }
}

export function parseExpr(src: string): Node {
  const norm = normalizeMathInput(src);
  if (!norm) throw new Error('Biểu thức rỗng');
  return new Parser(tokenize(norm)).parse();
}

// ------------------------------------------------------------------ Phân tích cấu trúc
export function freeVars(n: Node, acc = new Set<string>()): Set<string> {
  if (n.t === 'var') acc.add(n.n);
  else if (n.t === 'neg' || n.t === 'fn') freeVars(n.a, acc);
  else if (n.t === 'bin') {
    freeVars(n.a, acc);
    freeVars(n.b, acc);
  }
  return acc;
}

export type EvalFn = (vars: Vars) => number;

export function compileNode(n: Node): EvalFn {
  switch (n.t) {
    case 'num': {
      const v = n.v;
      return () => v;
    }
    case 'var': {
      const name = n.n;
      return name === 'e' ? (v) => v.e ?? Math.E : (v) => v[name] ?? NaN;
    }
    case 'neg': {
      const a = compileNode(n.a);
      return (v) => -a(v);
    }
    case 'fn': {
      const a = compileNode(n.a);
      const f = FUNCS[n.n];
      return (v) => f(a(v));
    }
    case 'bin': {
      const a = compileNode(n.a);
      const b = compileNode(n.b);
      switch (n.op) {
        case '+':
          return (v) => a(v) + b(v);
        case '-':
          return (v) => a(v) - b(v);
        case '*':
          return (v) => a(v) * b(v);
        case '/':
          return (v) => a(v) / b(v);
        default:
          return (v) => {
            const base = a(v);
            const ex = b(v);
            // căn bậc lẻ của số âm: x^(1/3) → -(|x|^(1/3))
            if (base < 0 && !Number.isInteger(ex)) {
              const inv = 1 / ex;
              if (Number.isInteger(inv) && inv % 2 !== 0) return -Math.pow(-base, ex);
            }
            return Math.pow(base, ex);
          };
      }
    }
  }
}

// ------------------------------------------------------------------ Đối tượng hàm số
export interface Compiled {
  src: string;
  ast: Node;
  params: string[]; // tham số tự do, đã sắp xếp (A, B, k…)
  variables: string[]; // x hoặc y xuất hiện
  eval: (x: number, p?: Vars) => number;
  evalXY: (x: number, y: number, p?: Vars) => number;
  latex: string;
}

export function compileExpr(src: string): Compiled {
  const ast = parseExpr(src);
  const fv = freeVars(ast);
  const fn = compileNode(ast);
  const params = [...fv].filter((n) => !RESERVED_VARS.has(n)).sort((a, b) => a.localeCompare(b));
  return {
    src,
    ast,
    params,
    variables: [...fv].filter((n) => n === 'x' || n === 'y'),
    eval: (x, p = {}) => fn({...p, x}),
    evalXY: (x, y, p = {}) => fn({...p, x, y}),
    latex: toLatex(ast),
  };
}

export function tryCompile(src: string): {ok: true; value: Compiled} | {ok: false; error: string} {
  try {
    return {ok: true, value: compileExpr(src)};
  } catch (e) {
    return {ok: false, error: e instanceof Error ? e.message : String(e)};
  }
}

// ------------------------------------------------------------------ Phương trình / hàm số
export type ParsedEquation =
  | {kind: 'explicit'; name: string; rhs: string; fn: Compiled} // y = f(x)
  | {kind: 'implicit'; lhs: string; rhs: string; fn: Compiled} // F(x,y) = G(x,y) → F − G = 0
  | {kind: 'expression'; fn: Compiled};

/** Nhận "y = x^2 - 3", "f(x) = 2sin x + 1", "x^2 + y^2 = 4", hoặc chỉ "x^2 - 3". */
export function parseEquation(text: string): ParsedEquation {
  const clean = normalizeMathInput(text).replace(/\s*=\s*/g, '=');
  const parts = clean.split('=');
  if (parts.length === 1) return {kind: 'expression', fn: compileExpr(clean)};
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error('Phương trình cần đúng một dấu =');
  const [l, r] = parts;
  if (/^(y|f\(x\)|f|g\(x\)|g|h\(x\)|h|y\(x\))$/i.test(l)) {
    const name = l.toLowerCase().startsWith('y') ? 'y' : l.replace(/\(x\)/i, '');
    const fn = compileExpr(r);
    if (!fn.variables.includes('y')) return {kind: 'explicit', name, rhs: r, fn};
  }
  const fn = compileExpr(`(${l})-(${r})`);
  return {kind: 'implicit', lhs: l, rhs: r, fn};
}

// ------------------------------------------------------------------ Biểu thức → LaTeX chuẩn
const PREC = (n: Node): number => (n.t === 'bin' ? ({'+': 1, '-': 1, '*': 2, '/': 2, '^': 4} as const)[n.op] : n.t === 'neg' ? 3 : 5);
const GREEK_TEX = new Set(GREEK);

export function toLatex(n: Node): string {
  const wrap = (c: Node, min: number) => (PREC(c) < min ? `\\left(${toLatex(c)}\\right)` : toLatex(c));
  switch (n.t) {
    case 'num': {
      if (Math.abs(n.v - Math.PI) < 1e-12) return '\\pi';
      return Number.isInteger(n.v) ? String(n.v) : String(+n.v.toFixed(6)).replace('.', '{,}');
    }
    case 'var':
      return GREEK_TEX.has(n.n) ? `\\${n.n}` : n.n;
    case 'neg':
      return `-${wrap(n.a, 3)}`;
    case 'fn': {
      if (n.n === 'sqrt') return `\\sqrt{${toLatex(n.a)}}`;
      if (n.n === 'abs') return `\\left|${toLatex(n.a)}\\right|`;
      if (n.n === 'cbrt') return `\\sqrt[3]{${toLatex(n.a)}}`;
      const name = ['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'ln', 'log', 'exp', 'sinh', 'cosh', 'tanh'].includes(n.n) ? `\\${n.n}` : n.n === 'lg' ? '\\lg' : `\\operatorname{${n.n}}`;
      const simple = n.a.t === 'var' || n.a.t === 'num' || (n.a.t === 'bin' && n.a.op === '*' && n.a.a.t === 'num' && n.a.b.t === 'var');
      return simple ? `${name}\\,${toLatex(n.a)}` : `${name}\\left(${toLatex(n.a)}\\right)`;
    }
    case 'bin': {
      switch (n.op) {
        case '+':
          return `${toLatex(n.a)} + ${toLatex(n.b)}`;
        case '-':
          return `${toLatex(n.a)} - ${wrap(n.b, 2)}`;
        case '/':
          return `\\frac{${toLatex(n.a)}}{${toLatex(n.b)}}`;
        case '^':
          return `${wrap(n.a, 5)}^{${toLatex(n.b)}}`;
        default: {
          // 2x, 3\sin x, (x+1)(x-1): bỏ dấu nhân khi hợp lệ
          const a = wrap(n.a, 2);
          const b = wrap(n.b, 3);
          const bStartsNum = n.b.t === 'num' || (n.b.t === 'bin' && n.b.op === '*' && n.b.a.t === 'num');
          return bStartsNum ? `${a} \\cdot ${b}` : `${a}${/[0-9]$/.test(a) && /^[0-9]/.test(b) ? ' \\cdot ' : ' '}${b}`.replace(/ +/g, ' ');
        }
      }
    }
  }
}

// ------------------------------------------------------------------ Công cụ số học
export const derivative = (f: (x: number) => number, x: number, h = 1e-5) => (f(x + h) - f(x - h)) / (2 * h);

/** Nghiệm của f trên [a, b]: quét đổi dấu rồi chia đôi (loại điểm gián đoạn). */
export function findRoots(f: (x: number) => number, a: number, b: number, samples = 600): number[] {
  const roots: number[] = [];
  let x0 = a;
  let y0 = f(x0);
  for (let i = 1; i <= samples; i++) {
    const x1 = a + ((b - a) * i) / samples;
    const y1 = f(x1);
    if (Number.isFinite(y0) && Number.isFinite(y1)) {
      if (y0 === 0) roots.push(x0);
      else if (y0 * y1 < 0) {
        let lo = x0;
        let hi = x1;
        let flo = y0;
        for (let k = 0; k < 60; k++) {
          const mid = (lo + hi) / 2;
          const fm = f(mid);
          if (flo * fm <= 0) hi = mid;
          else {
            lo = mid;
            flo = fm;
          }
        }
        const r = (lo + hi) / 2;
        // bỏ nghiệm giả do gián đoạn (|f| lớn tại điểm đổi dấu, ví dụ tan, 1/x)
        if (Math.abs(f(r)) < 1e-3 * Math.max(1, Math.abs(y0), Math.abs(y1))) roots.push(r);
      }
    }
    x0 = x1;
    y0 = y1;
  }
  return dedupe(roots, (b - a) / samples);
}

const dedupe = (xs: number[], tol: number) => xs.sort((p, q) => p - q).filter((v, i, arr) => i === 0 || Math.abs(v - arr[i - 1]) > tol);

export function findIntersections(f: (x: number) => number, g: (x: number) => number, a: number, b: number) {
  return findRoots((x) => f(x) - g(x), a, b).map((x) => ({x, y: f(x)}));
}

/** Cực trị địa phương: đổi dấu của đạo hàm. */
export function findExtrema(f: (x: number) => number, a: number, b: number) {
  return findRoots((x) => derivative(f, x, 1e-4), a, b, 800)
    .map((x) => {
      const h = (b - a) / 4000;
      const d2 = f(x + h) - 2 * f(x) + f(x - h);
      return {x, y: f(x), kind: d2 > 0 ? ('min' as const) : d2 < 0 ? ('max' as const) : ('flat' as const)};
    })
    .filter((e) => e.kind !== 'flat' && Number.isFinite(e.y));
}

/** Tích phân Simpson. */
export function integrate(f: (x: number) => number, a: number, b: number, n = 400): number {
  const m = n % 2 ? n + 1 : n;
  const h = (b - a) / m;
  let s = f(a) + f(b);
  for (let i = 1; i < m; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
}

/** Định dạng số cho nhãn (dấu phẩy thập phân kiểu Việt Nam). */
export function fmtNum(v: number, digits = 3): string {
  if (!Number.isFinite(v)) return '—';
  if (Math.abs(v) < 5e-4) return '0';
  const s = Math.abs(v) >= 1000 ? v.toExponential(2) : String(+v.toFixed(digits));
  return s.replace('.', ',');
}
