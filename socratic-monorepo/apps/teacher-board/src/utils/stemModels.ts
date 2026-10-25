// apps/teacher-board/src/utils/stemModels.ts
/**
 * Bốn mô hình STEM tất định chạy hoàn toàn trên trình duyệt (từ tài liệu nghiên cứu STEM), mỗi mô hình có
 * phần PHÂN TÍCH CHỮ (nhận cú pháp giáo viên viết) và phần TÍNH TOÁN thuần túy, kiểm thử được:
 *  - BIO_PUNNETT_SQUARE   : "P: AaBb x AaBb"  → bảng Punnett, tỉ lệ kiểu gen/kiểu hình, hoán vị gen f
 *  - BIO_HARDY_WEINBERG   : "0,04AA + 0,32Aa + 0,64aa = 1" → tần số alen, so sánh với p², 2pq, q²
 *  - MATH_LINEAR_PROGRAMMING : hệ bất phương trình bậc nhất hai ẩn + hàm mục tiêu → miền nghiệm, đỉnh, giá trị tối ưu
 *  - MATH_COBWEB_CHAOS    : "x_{n+1} = r x_n (1 - x_n)" → đồ thị mạng nhện, điểm bất động, kiểu hội tụ/chu kỳ/hỗn loạn
 */
import {compileExpr, normalizeMathInput, findRoots, derivative, type Vars} from './mathExpr';

// ============================================================ Punnett (di truyền Menđen)
export interface Gamete {
  alleles: string;
  p: number;
}
export interface PunnettCell {
  genotype: string;
  phenotype: string;
  p: number;
}
export interface PunnettResult {
  p1: string;
  p2: string;
  loci: string[];
  gametes1: Gamete[];
  gametes2: Gamete[];
  cells: PunnettCell[][];
  genotypes: {genotype: string; p: number}[];
  phenotypes: {phenotype: string; p: number}[];
  /** "9 : 3 : 3 : 1" nếu quy được về số nguyên nhỏ, ngược lại null */
  ratio: string | null;
  /** hai bố mẹ đều dị hợp 2 cặp → có thể chỉnh tần số hoán vị gen */
  linkageAdjustable: boolean;
}

/** Hợp lệ: các cặp chữ cái giống nhau về tên gen ("AaBb", "aabb", "Aa"). Trả về danh sách cặp. */
export function splitGenotype(g: string): string[] | null {
  const s = g.replace(/\s+/g, '');
  if (!s || s.length % 2 !== 0 || s.length > 6) return null;
  const pairs: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < s.length; i += 2) {
    const a = s[i];
    const b = s[i + 1];
    if (!/[A-Za-z]/.test(a) || !/[A-Za-z]/.test(b) || a.toLowerCase() !== b.toLowerCase()) return null;
    const k = a.toLowerCase();
    if (seen.has(k)) return null;
    seen.add(k);
    pairs.push(a + b);
  }
  return pairs;
}

/** "P: AaBb x AaBb", "Aa × aa", "AaBb X aabb → F1" */
export function parseCross(text: string): {p1: string; p2: string} | null {
  const t = (text || '').replace(/[×✕✖]/g, ' x ').replace(/\\times/g, ' x ');
  const m = /(?:^|[\s:(])([A-Za-z]{2,6})\s*(?:x|X|\*)\s*([A-Za-z]{2,6})(?=$|[\s,;.)→-]|\\)/.exec(t);
  if (!m) return null;
  const a = splitGenotype(m[1]);
  const b = splitGenotype(m[2]);
  if (!a || !b || a.length !== b.length) return null;
  const same = a.every((x, i) => x[0].toLowerCase() === b[i][0].toLowerCase());
  return same ? {p1: m[1], p2: m[2]} : null;
}

const canonPair = (a: string, b: string) => (a === a.toUpperCase() ? a + b : b + a).replace(/^([a-z])([A-Z])$/, '$2$1');

/** Giao tử của một cá thể, có hoán vị gen f nếu dị hợp hai cặp (liên kết đối: AB/ab). */
export function gametesOf(genotype: string, f = 0.5): Gamete[] {
  const pairs = splitGenotype(genotype);
  if (!pairs) return [];
  const het = pairs.map((p) => p[0] !== p[1]);
  let list: Gamete[] = [{alleles: '', p: 1}];
  if (pairs.length === 2 && het[0] && het[1]) {
    const [a, b] = pairs;
    return [
      {alleles: a[0] + b[0], p: (1 - f) / 2},
      {alleles: a[1] + b[1], p: (1 - f) / 2},
      {alleles: a[0] + b[1], p: f / 2},
      {alleles: a[1] + b[0], p: f / 2},
    ].filter((g) => g.p > 1e-12);
  }
  for (const p of pairs) {
    const opts = p[0] === p[1] ? [p[0]] : [p[0], p[1]];
    const w = 1 / opts.length;
    list = list.flatMap((g) => opts.map((o) => ({alleles: g.alleles + o, p: g.p * w})));
  }
  return list;
}

function genotypeOf(g1: string, g2: string): string {
  let out = '';
  for (let i = 0; i < g1.length; i++) out += canonPair(g1[i], g2[i]);
  return out;
}
function phenotypeOf(genotype: string): string {
  let out = '';
  for (let i = 0; i < genotype.length; i += 2) {
    const a = genotype[i];
    const b = genotype[i + 1];
    out += a === a.toUpperCase() || b === b.toUpperCase() ? `${a.toUpperCase()}-` : a + b;
  }
  return out;
}

export function toRatio(probs: number[], maxK = 64): string | null {
  const min = Math.min(...probs.filter((p) => p > 1e-12));
  if (!isFinite(min)) return null;
  for (let k = 1; k <= maxK; k++) {
    const scaled = probs.map((p) => (p / min) * k);
    if (scaled.every((v) => Math.abs(v - Math.round(v)) < 1e-6)) {
      const ints = scaled.map(Math.round);
      const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
      const g = ints.reduce((x, y) => gcd(x, y));
      return ints.map((v) => v / g).join(' : ');
    }
  }
  return null;
}

export function punnett(p1: string, p2: string, f = 0.5): PunnettResult | null {
  const a = splitGenotype(p1);
  const b = splitGenotype(p2);
  if (!a || !b || a.length !== b.length) return null;
  const g1 = gametesOf(p1, f);
  const g2 = gametesOf(p2, f);
  const cells = g2.map((y) => g1.map((x) => {
    const genotype = genotypeOf(x.alleles, y.alleles);
    return {genotype, phenotype: phenotypeOf(genotype), p: x.p * y.p};
  }));
  const gm = new Map<string, number>();
  const pm = new Map<string, number>();
  for (const row of cells) {
    for (const c of row) {
      gm.set(c.genotype, (gm.get(c.genotype) ?? 0) + c.p);
      pm.set(c.phenotype, (pm.get(c.phenotype) ?? 0) + c.p);
    }
  }
  const sort = (m: Map<string, number>) => [...m.entries()].map(([k, p]) => ({k, p})).sort((x, y) => y.p - x.p || (x.k < y.k ? -1 : x.k > y.k ? 1 : 0));
  const genotypes = sort(gm).map((x) => ({genotype: x.k, p: x.p}));
  const phenotypes = sort(pm).map((x) => ({phenotype: x.k, p: x.p}));
  const dihybrid = (s: string) => {
    const ps = splitGenotype(s)!;
    return ps.length === 2 && ps[0][0] !== ps[0][1] && ps[1][0] !== ps[1][1];
  };
  return {
    p1,
    p2,
    loci: a.map((x) => x[0].toUpperCase()),
    gametes1: g1,
    gametes2: g2,
    cells,
    genotypes,
    phenotypes,
    ratio: toRatio(phenotypes.map((x) => x.p)),
    linkageAdjustable: dihybrid(p1) && dihybrid(p2),
  };
}

// ============================================================ Hardy–Weinberg
export interface GenotypeFreqs {
  AA: number;
  Aa: number;
  aa: number;
}
export interface HardyWeinbergResult {
  obs: GenotypeFreqs;
  p: number;
  q: number;
  exp: GenotypeFreqs;
  /** độ lệch lớn nhất giữa quan sát và kỳ vọng */
  maxDev: number;
  equilibrium: boolean;
}

/** Nhận "0,04AA + 0,32Aa + 0,64aa = 1", "4% AA, 32% Aa, 64% aa", "100AA + 200Aa + 300aa", hoặc "q^2 = 0,16" / "aa = 0,16". */
export function parseGenotypeFreqs(text: string): GenotypeFreqs | null {
  const t = (text || '').replace(/(\d),(\d)/g, '$1.$2').replace(/\s+/g, ' ');
  const re = /(\d+(?:\.\d+)?)\s*(%?)\s*\*?\s*([A-Za-z])\s*([A-Za-z])(?![A-Za-z])/g;
  const found: Record<string, number> = {};
  let letter = '';
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const a = m[3];
    const b = m[4];
    if (a.toLowerCase() !== b.toLowerCase()) continue;
    if (!letter) letter = a.toLowerCase();
    if (a.toLowerCase() !== letter) continue;
    const kind = a === a.toUpperCase() && b === b.toUpperCase() ? 'AA' : a !== a.toLowerCase() && b === b.toLowerCase() ? 'Aa' : b === b.toLowerCase() && a === a.toLowerCase() ? 'aa' : '';
    if (!kind) continue;
    found[kind] = (found[kind] ?? 0) + parseFloat(m[1]) / (m[2] ? 100 : 1);
  }
  const keys = Object.keys(found);
  if (keys.length >= 2 || (keys.length === 1 && /hardy|weinberg|cân bằng|can bang/i.test(t))) {
    const v = {AA: found.AA ?? NaN, Aa: found.Aa ?? NaN, aa: found.aa ?? NaN};
    const known = Object.values(v).filter((x) => !Number.isNaN(x));
    const sum = known.reduce((x, y) => x + y, 0);
    const missing = Object.values(v).filter((x) => Number.isNaN(x)).length;
    if (missing === 1 && sum <= 1.0001) {
      const rest = Math.max(0, 1 - sum);
      return {AA: Number.isNaN(v.AA) ? rest : v.AA, Aa: Number.isNaN(v.Aa) ? rest : v.Aa, aa: Number.isNaN(v.aa) ? rest : v.aa};
    }
    if (missing === 0 && sum > 0) return {AA: v.AA / sum, Aa: v.Aa / sum, aa: v.aa / sum}; // cho phép số đếm cá thể → chuẩn hóa
  }
  // chỉ cho tần số kiểu hình lặn: q² = 0,16 / aa = 0,16
  const rec = /(?:q\s*(?:\^\s*2|²)|aa)\s*=\s*(\d+(?:\.\d+)?)\s*(%?)/i.exec(t);
  if (rec) {
    const q2 = parseFloat(rec[1]) / (rec[2] ? 100 : 1);
    if (q2 >= 0 && q2 <= 1) {
      const q = Math.sqrt(q2);
      const p = 1 - q;
      return {AA: p * p, Aa: 2 * p * q, aa: q2};
    }
  }
  return null;
}

export function hardyWeinberg(obs: GenotypeFreqs, tol = 0.01): HardyWeinbergResult {
  const p = obs.AA + obs.Aa / 2;
  const q = 1 - p;
  const exp = {AA: p * p, Aa: 2 * p * q, aa: q * q};
  const maxDev = Math.max(Math.abs(obs.AA - exp.AA), Math.abs(obs.Aa - exp.Aa), Math.abs(obs.aa - exp.aa));
  return {obs, p, q, exp, maxDev, equilibrium: maxDev <= tol};
}

// ============================================================ Quy hoạch tuyến tính
export interface LinConstraint {
  a: number;
  b: number;
  c: number;
  op: '<=' | '>=' | '=';
  text: string;
}
export interface LinObjective {
  a: number;
  b: number;
  c0: number;
  sense: 'max' | 'min';
}
export interface LPProblem {
  constraints: LinConstraint[];
  objective: LinObjective | null;
}
export interface LPSolution {
  vertices: {x: number; y: number; value: number | null}[];
  feasible: boolean;
  unbounded: boolean;
  best: {x: number; y: number; value: number} | null;
  /** khung nhìn đề nghị */
  bounds: {xMin: number; xMax: number; yMin: number; yMax: number};
}

/** Biểu thức tuyến tính theo x, y → [a, b, c] với giá trị = a·x + b·y + c; null nếu không tuyến tính. */
export function linearForm(expr: string): [number, number, number] | null {
  try {
    const f = compileExpr(expr);
    const v = (x: number, y: number) => f.evalXY(x, y, {});
    const c = v(0, 0);
    const a = v(1, 0) - c;
    const b = v(0, 1) - c;
    if (![a, b, c].every(Number.isFinite)) return null;
    const probe: [number, number][] = [[2, 3], [-4, 1.5], [7, -5]];
    for (const [x, y] of probe) if (Math.abs(v(x, y) - (a * x + b * y + c)) > 1e-6 * (1 + Math.abs(v(x, y)))) return null;
    return [a, b, c];
  } catch {
    return null;
  }
}

function splitLines(text: string): string[] {
  return (text || '')
    .replace(/\\begin\{(?:cases|array)\}(?:\{[^}]*\})?|\\end\{(?:cases|array)\}/g, ';')
    .replace(/\\\\|\\quad|\\qquad|\\text\{[^}]*\}/g, ';')
    .replace(/[{}]/g, ' ')
    .replace(/[\n\r]+/g, ';')
    .split(/;|,\s+|\s+(?:và|and)\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

const OBJ_RE = /(?:^|\b)(max(?:imi[sz]e)?|min(?:imi[sz]e)?|lớn nhất|nhỏ nhất|gtln|gtnn|cực đại|cực tiểu)\b/i;

export function parseLP(text: string): LPProblem | null {
  const constraints: LinConstraint[] = [];
  let objective: LinObjective | null = null;
  let ineqLines = 0;
  for (const rawLine of splitLines(text)) {
    let line = rawLine.replace(/\\le(?:q)?(?![a-z])/g, '<=').replace(/\\ge(?:q)?(?![a-z])/g, '>=').replace(/≤|⩽/g, '<=').replace(/≥|⩾/g, '>=');
    const obj = OBJ_RE.exec(line);
    if (obj) {
      const sense: 'max' | 'min' = /^(max|lớn nhất|gtln|cực đại)/i.test(obj[1]) ? 'max' : 'min';
      const after = line.slice(line.indexOf('=') >= 0 ? line.indexOf('=') + 1 : obj.index + obj[0].length).replace(/^[\s:]+/, '');
      const lf = linearForm(normalizeMathInput(after));
      if (lf && (lf[0] !== 0 || lf[1] !== 0)) objective = {a: lf[0], b: lf[1], c0: lf[2], sense};
      continue;
    }
    line = line.replace(/<(?!=)/g, '<=').replace(/>(?!=)/g, '>=');
    const m = /^(.+?)(<=|>=)(.+)$/.exec(line);
    if (m) {
      const lf = linearForm(`(${normalizeMathInput(m[1])})-(${normalizeMathInput(m[3])})`);
      if (!lf || (lf[0] === 0 && lf[1] === 0)) continue;
      ineqLines++;
      // lf: a x + b y + c0 (op) 0  →  a x + b y (op) -c0
      constraints.push({a: lf[0], b: lf[1], c: -lf[2], op: m[2] as '<=' | '>=', text: rawLine});
    }
  }
  if (ineqLines < 2 && !(objective && ineqLines >= 1)) return null;
  return {constraints, objective};
}

type Poly = {x: number; y: number}[];
function clip(poly: Poly, k: LinConstraint): Poly {
  const inside = (p: {x: number; y: number}) => (k.op === '<=' ? k.a * p.x + k.b * p.y <= k.c + 1e-9 : k.a * p.x + k.b * p.y >= k.c - 1e-9);
  const val = (p: {x: number; y: number}) => k.a * p.x + k.b * p.y - k.c;
  const out: Poly = [];
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i];
    const prev = poly[(i + poly.length - 1) % poly.length];
    const ci = inside(cur);
    const pi = inside(prev);
    if (ci !== pi) {
      const t = val(prev) / (val(prev) - val(cur));
      out.push({x: prev.x + t * (cur.x - prev.x), y: prev.y + t * (cur.y - prev.y)});
    }
    if (ci) out.push(cur);
  }
  return out;
}

export function solveLP(pb: LPProblem, R = 1e4): LPSolution {
  let poly: Poly = [{x: -R, y: -R}, {x: R, y: -R}, {x: R, y: R}, {x: -R, y: R}];
  for (const k of pb.constraints) {
    if (k.op === '=') {
      poly = clip(clip(poly, {...k, op: '<='}), {...k, op: '>='});
    } else poly = clip(poly, k);
    if (!poly.length) break;
  }
  // gộp đỉnh trùng
  const uniq: Poly = [];
  for (const p of poly) if (!uniq.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 1e-6 * R)) uniq.push(p);
  const feasible = uniq.length >= 1;
  const unbounded = uniq.some((p) => Math.abs(p.x) > 0.99 * R || Math.abs(p.y) > 0.99 * R);
  const real = uniq.filter((p) => Math.abs(p.x) < 0.99 * R && Math.abs(p.y) < 0.99 * R);
  const obj = pb.objective;
  const val = (p: {x: number; y: number}) => (obj ? obj.a * p.x + obj.b * p.y + obj.c0 : null);
  const vertices = real.map((p) => ({x: p.x, y: p.y, value: val(p)}));
  let best: LPSolution['best'] = null;
  if (obj && vertices.length) {
    const sorted = [...vertices].sort((u, v) => (obj.sense === 'max' ? v.value! - u.value! : u.value! - v.value!));
    best = {x: sorted[0].x, y: sorted[0].y, value: sorted[0].value!};
    // miền không bị chặn theo hướng làm tốt hơn → không có tối ưu
    if (unbounded) {
      const dir = obj.sense === 'max' ? 1 : -1;
      const farBetter = uniq.some((p) => (Math.abs(p.x) > 0.99 * R || Math.abs(p.y) > 0.99 * R) && dir * (obj.a * p.x + obj.b * p.y) > dir * (best!.value - obj.c0) + 1);
      if (farBetter) best = null;
    }
  }
  const xs = real.map((p) => p.x).concat(0);
  const ys = real.map((p) => p.y).concat(0);
  const pad = (a: number[]) => Math.max(1, (Math.max(...a) - Math.min(...a)) * 0.25);
  const bounds = {xMin: Math.min(...xs) - pad(xs), xMax: Math.max(...xs) + pad(xs), yMin: Math.min(...ys) - pad(ys), yMax: Math.max(...ys) + pad(ys)};
  return {vertices, feasible, unbounded, best, bounds};
}

// ============================================================ Dãy số quy nạp & đồ thị mạng nhện
export interface Recurrence {
  /** vế phải theo biến x (x = x_n) */
  expr: string;
  name: string;
  params: string[];
}

export function parseRecurrence(text: string): Recurrence | null {
  const t = (text || '').trim();
  const m = /([A-Za-z])\s*(?:_\s*\{?\s*n\s*\+\s*1\s*\}?|\(\s*n\s*\+\s*1\s*\))\s*=\s*(.+)$/.exec(t);
  if (!m) return null;
  const name = m[1];
  let rhs = m[2];
  rhs = rhs.replace(new RegExp(`${name}\\s*(?:_\\s*\\{?\\s*n\\s*\\}?|\\(\\s*n\\s*\\))`, 'g'), 'x');
  rhs = rhs.replace(/\s*(?:,|;|\\\\).*$/, '');
  try {
    const c = compileExpr(rhs);
    if (!c.variables.includes('x')) return null;
    return {expr: rhs, name, params: c.params};
  } catch {
    return null;
  }
}

export interface CobwebResult {
  orbit: number[];
  path: {x: number; y: number}[];
  fixedPoints: {x: number; stable: boolean; slope: number}[];
  behavior: 'converges' | 'periodic' | 'chaotic' | 'diverges';
  period: number | null;
  limit: number | null;
}

export function cobweb(expr: string, params: Vars, x0: number, n = 60): CobwebResult {
  const c = compileExpr(expr);
  const f = (x: number) => c.eval(x, params);
  const orbit = [x0];
  const path: {x: number; y: number}[] = [{x: x0, y: 0}];
  let x = x0;
  for (let i = 0; i < n; i++) {
    const y = f(x);
    path.push({x, y}, {x: y, y});
    if (!Number.isFinite(y) || Math.abs(y) > 1e9) {
      orbit.push(y);
      return {orbit, path, fixedPoints: [], behavior: 'diverges', period: null, limit: null};
    }
    orbit.push(y);
    x = y;
  }
  const lo = Math.min(...orbit.slice(0, 40), -2);
  const hi = Math.max(...orbit.slice(0, 40), 2);
  const fps = findRoots((t) => f(t) - t, lo, hi, 800).map((r) => {
    const slope = derivative(f, r);
    return {x: r, stable: Math.abs(slope) < 1, slope};
  });
  const tail = orbit.slice(-40);
  const lastStep = Math.abs(tail[tail.length - 1] - tail[tail.length - 2]);
  let behavior: CobwebResult['behavior'] = 'chaotic';
  let period: number | null = null;
  let limit: number | null = null;
  if (lastStep < 1e-6) {
    behavior = 'converges';
    limit = tail[tail.length - 1];
  } else {
    for (let p = 2; p <= 16; p++) {
      if (Math.abs(tail[tail.length - 1] - tail[tail.length - 1 - p]) < 1e-4 && Math.abs(tail[tail.length - 2] - tail[tail.length - 2 - p]) < 1e-4) {
        behavior = 'periodic';
        period = p;
        break;
      }
    }
  }
  return {orbit, path, fixedPoints: fps, behavior, period, limit};
}
