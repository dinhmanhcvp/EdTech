/**
 * Phương trình hóa học: đọc công thức/phương trình (một hoặc hai vế), dự đoán sản phẩm khi chỉ có vế trái (các loại phản ứng THPT),
 * cân bằng bằng đại số (không tra bảng), đếm nguyên tử từng nguyên tố hai vế.
 * Trung thực: chỉ dự đoán những loại phản ứng đã có luật; ngoài đó trả null (bảng nói "chưa dự đoán chắc"), không đoán bừa.
 * Mọi sản phẩm dự đoán đều phải cân bằng được mới được trả về.
 */

export const ELEMENTS = new Set('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Zr Ag Cd Sn Sb I Xe Cs Ba W Pt Au Hg Pb Bi'.split(' '));
export type Atoms = Record<string, number>;

const SUB = '₀₁₂₃₄₅₆₇₈₉';

/** Chuẩn hóa chữ viết (LaTeX, chỉ số dưới Unicode, mũi tên) về dạng ASCII dễ phân tích. */
export function normalizeEquation(raw: string): string {
  return (raw || '')
    .replace(/[₀-₉]/g, (c) => String(SUB.indexOf(c)))
    .replace(/\\(?:text|mathrm|ce)\s*\{([^}]*)\}/g, '$1')
    .replace(/_\s*\{?\s*(\d+)\s*\}?/g, '$1')
    .replace(/\\(?:rightarrow|longrightarrow|to)\b|⟶|⇒|=>|->|→/g, '→')
    .replace(/\\cdot|·/g, '.')
    .replace(/[↑↓]|\\uparrow|\\downarrow/g, '')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Số nguyên tử mỗi nguyên tố của một công thức ("Al2(SO4)3"); null nếu không phải công thức hợp lệ. */
export function parseFormula(f: string): Atoms | null {
  const s = f.replace(/\s+/g, '');
  if (!s || /[^A-Za-z0-9()]/.test(s)) return null;
  let i = 0;
  const num = () => {
    let j = i;
    while (j < s.length && /\d/.test(s[j])) j++;
    const n = j > i ? Number(s.slice(i, j)) : 1;
    i = j;
    return n;
  };
  const group = (): Atoms | null => {
    const out: Atoms = {};
    while (i < s.length && s[i] !== ')') {
      if (s[i] === '(') {
        i++;
        const inner = group();
        if (!inner || s[i] !== ')') return null;
        i++;
        const k = num();
        for (const [e, c] of Object.entries(inner)) out[e] = (out[e] ?? 0) + c * k;
      } else {
        const m = /^[A-Z][a-z]?/.exec(s.slice(i));
        if (!m) return null;
        let el = m[0];
        if (!ELEMENTS.has(el)) {
          el = el[0]; // "Co" hợp lệ nhưng "Cu"→ có; nếu hai chữ không phải nguyên tố thì thử một chữ
          if (!ELEMENTS.has(el)) return null;
          i += 1;
        } else i += m[0].length;
        out[el] = (out[el] ?? 0) + num();
      }
    }
    return out;
  };
  const r = group();
  return r && i === s.length && Object.keys(r).length ? r : null;
}

export interface Species {
  formula: string;
  /** hệ số người dùng đã viết (null = chưa viết) */
  coef: number | null;
  atoms: Atoms;
}

const parseSide = (text: string): Species[] | null => {
  const out: Species[] = [];
  for (const raw of text.split('+')) {
    const t = raw.trim();
    const m = /^(\d+)?\s*(.+)$/.exec(t);
    if (!m) return null;
    const atoms = parseFormula(m[2]);
    if (!atoms) return null;
    out.push({formula: m[2].replace(/\s+/g, ''), coef: m[1] ? Number(m[1]) : null, atoms});
  }
  return out.length ? out : null;
};

export interface ParsedEquation {
  left: Species[];
  /** null = người dùng mới viết một vế */
  right: Species[] | null;
}

/** Đọc "Fe + O2", "Fe + O2 → Fe3O4", "2H2 + O2 -> 2H2O". Có ít nhất một công thức chứa chữ thường hoặc chữ số (tránh nhầm "AB + CD" của hình học). */
export function parseEquation(raw: string): ParsedEquation | null {
  let t = normalizeEquation(raw);
  if (!t.includes('→') && /=/.test(t) && !/[<>]/.test(t)) t = t.replace('=', '→');
  const sides = t.split('→');
  if (sides.length > 2 || (sides.length === 2 && !sides[0].trim())) return null;
  const left = parseSide(sides[0]);
  if (!left) return null;
  const right = sides.length === 2 && sides[1].trim() ? parseSide(sides[1]) : null;
  if (sides.length === 2 && sides[1].trim() && !right) return null;
  const all = [...left, ...(right ?? [])];
  if (!right && left.length < 2 && !/[a-z]|\d/.test(left[0].formula)) return null;
  if (!all.some((s) => /[a-z\d]/.test(s.formula))) return null;
  return {left, right};
}

// ------------------------------------------------------------------ cân bằng
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
type Frac = [number, number];
const fr = (n: number, d = 1): Frac => {
  const g = gcd(n, d) || 1;
  return d < 0 ? [-n / g, -d / g] : [n / g, d / g];
};
const fsub = (a: Frac, b: Frac): Frac => fr(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
const fmul = (a: Frac, b: Frac): Frac => fr(a[0] * b[0], a[1] * b[1]);
const fdiv = (a: Frac, b: Frac): Frac => fr(a[0] * b[1], a[1] * b[0]);

/** Hệ số nguyên dương nhỏ nhất cân bằng phương trình (không gian nghiệm 1 chiều); null nếu không cân bằng được hoặc không duy nhất. */
export function balance(left: Atoms[], right: Atoms[]): number[] | null {
  const n = left.length + right.length;
  const els = [...new Set([...left, ...right].flatMap((a) => Object.keys(a)))];
  const M: Frac[][] = els.map((e) => [...left.map((a) => fr(a[e] ?? 0)), ...right.map((a) => fr(-(a[e] ?? 0)))]);
  const piv: number[] = [];
  let row = 0;
  for (let c = 0; c < n && row < M.length; c++) {
    let p = row;
    while (p < M.length && M[p][c][0] === 0) p++;
    if (p === M.length) continue;
    [M[row], M[p]] = [M[p], M[row]];
    const d = M[row][c];
    M[row] = M[row].map((x) => fdiv(x, d));
    for (let r = 0; r < M.length; r++) {
      if (r !== row && M[r][c][0] !== 0) {
        const f = M[r][c];
        M[r] = M[r].map((x, k) => fsub(x, fmul(f, M[row][k])));
      }
    }
    piv.push(c);
    row++;
  }
  const free = Array.from({length: n}, (_, i) => i).filter((i) => !piv.includes(i));
  if (free.length !== 1) return null;
  const x: Frac[] = Array.from({length: n}, () => fr(0));
  x[free[0]] = fr(1);
  piv.forEach((c, r) => (x[c] = fr(-M[r][free[0]][0], M[r][free[0]][1])));
  const L = x.reduce((l, f) => (l * f[1]) / gcd(l, f[1]), 1);
  const ints = x.map((f) => (f[0] * L) / f[1]);
  if (ints.some((v) => v === 0) || !(ints.every((v) => v > 0) || ints.every((v) => v < 0))) return null;
  const g = ints.reduce((a, b) => gcd(a, b), 0);
  return ints.map((v) => Math.abs(v / g));
}

/** Số nguyên tử mỗi nguyên tố ở một vế với hệ số đã cho. */
export function sideCounts(side: Atoms[], coefs: number[]): Atoms {
  const out: Atoms = {};
  side.forEach((a, i) => {
    for (const [e, c] of Object.entries(a)) out[e] = (out[e] ?? 0) + c * (coefs[i] ?? 1);
  });
  return out;
}

// ------------------------------------------------------------------ dự đoán sản phẩm
const ACTIVITY = ['K', 'Na', 'Ba', 'Ca', 'Mg', 'Al', 'Zn', 'Fe', 'Ni', 'Sn', 'Pb', 'H', 'Cu', 'Ag', 'Au'];
const VAL: Record<string, number> = {Li: 1, Na: 1, K: 1, Ag: 1, Mg: 2, Ca: 2, Ba: 2, Zn: 2, Fe: 2, Ni: 2, Pb: 2, Cu: 2, Sn: 2, Al: 3};
const METAL_OXIDE: Record<string, string> = {Li: 'Li2O', Na: 'Na2O', K: 'K2O', Mg: 'MgO', Ca: 'CaO', Ba: 'BaO', Al: 'Al2O3', Zn: 'ZnO', Fe: 'Fe3O4', Cu: 'CuO', Pb: 'PbO', Ni: 'NiO'};
const NONMETAL_OXIDE: Record<string, string> = {C: 'CO2', S: 'SO2', P: 'P2O5', H2: 'H2O', Si: 'SiO2'};
const ANION_CHARGE: Record<string, number> = {Cl: 1, SO4: 2, NO3: 1, OH: 1, CO3: 2};
const POLY = new Set(['SO4', 'NO3', 'OH', 'CO3']);
const INSOLUBLE = new Set(['AgCl', 'BaSO4', 'CaCO3', 'BaCO3', 'MgCO3', 'PbSO4', 'PbCl2', 'Cu(OH)2', 'Fe(OH)2', 'Fe(OH)3', 'Al(OH)3', 'Mg(OH)2', 'Zn(OH)2', 'CuCO3', 'Ag2CO3']);
const ACIDS: Record<string, string> = {HCl: 'Cl', H2SO4: 'SO4', HNO3: 'NO3'};

const gcdNum = gcd;

/** Công thức hợp chất ion: cation hóa trị v với anion (Cl, SO4, NO3, OH, CO3). */
export function ionic(m: string, v: number, an: string): string {
  const ch = ANION_CHARGE[an];
  const g = gcdNum(v, ch);
  const x = ch / g;
  const y = v / g;
  return `${m}${x > 1 ? x : ''}${y > 1 ? (POLY.has(an) ? `(${an})${y}` : `${an}${y}`) : an}`;
}

/** Tách hợp chất ion thành cation, hóa trị và anion; null nếu không thuộc dạng đã biết. */
function splitIonic(f: string): {m: string; v: number; an: string} | null {
  const m = /^([A-Z][a-z]?)(\d*)(?:\((Cl|SO4|NO3|OH|CO3)\)|(Cl|SO4|NO3|OH|CO3))(\d*)$/.exec(f);
  if (!m) return null;
  const an = (m[3] ?? m[4]) as string;
  const x = m[2] ? Number(m[2]) : 1;
  const y = m[5] ? Number(m[5]) : 1;
  if (!ELEMENTS.has(m[1])) return null;
  const v = (ANION_CHARGE[an] * y) / x;
  return Number.isInteger(v) && v > 0 ? {m: m[1], v, an} : null;
}

export interface Prediction {
  products: string[];
  kind: string;
  note: string;
}
export type PredictResult = Prediction | {none: true; kind: string; note: string} | null;

const isMetal = (f: string) => f in VAL;

/** Dự đoán sản phẩm của vế trái (danh sách công thức) theo các loại phản ứng THPT; null = chưa có luật. */
export function predictProducts(reactants: string[]): PredictResult {
  const R = [...reactants].sort();
  const has = (f: string) => R.includes(f);
  const oneOf = (pred: (f: string) => boolean) => R.find(pred);
  if (R.length === 1) {
    const DEC: Record<string, [string[], string]> = {
      KClO3: [['KCl', 'O2'], 'nhiệt phân, xúc tác MnO2'],
      KMnO4: [['K2MnO4', 'MnO2', 'O2'], 'nhiệt phân'],
      CaCO3: [['CaO', 'CO2'], 'nhiệt phân'],
      H2O2: [['H2O', 'O2'], 'phân hủy (xúc tác MnO2)'],
      H2O: [['H2', 'O2'], 'điện phân'],
      HgO: [['Hg', 'O2'], 'nhiệt phân'],
      'Cu(OH)2': [['CuO', 'H2O'], 'nhiệt phân'],
      'Fe(OH)3': [['Fe2O3', 'H2O'], 'nhiệt phân'],
    };
    const d = DEC[R[0]];
    return d ? {products: d[0], kind: 'phản ứng phân hủy', note: d[1]} : null;
  }
  if (R.length !== 2) return null;
  const [a, b] = R;
  // kim loại + O2
  const metalO2 = has('O2') ? oneOf((f) => isMetal(f) && f in METAL_OXIDE) : undefined;
  if (metalO2) return {products: [METAL_OXIDE[metalO2]], kind: 'phản ứng hóa hợp với oxi', note: metalO2 === 'Fe' ? 'đốt sắt trong oxi tạo oxit sắt từ Fe₃O₄' : 'kim loại cháy trong oxi tạo oxit'};
  const nonmetal = has('O2') ? oneOf((f) => f in NONMETAL_OXIDE) : undefined;
  if (nonmetal) return {products: [NONMETAL_OXIDE[nonmetal]], kind: 'phản ứng cháy', note: 'oxi dư, tạo oxit cao nhất'};
  const org = has('O2') ? oneOf((f) => { const at = parseFormula(f); return !!at && !!at.C && !!at.H && Object.keys(at).every((e) => e === 'C' || e === 'H' || e === 'O'); }) : undefined;
  if (org) return {products: ['CO2', 'H2O'], kind: 'phản ứng cháy hoàn toàn', note: 'hợp chất hữu cơ cháy hoàn toàn'};
  // kim loại + axit loãng
  const acid = oneOf((f) => f in ACIDS && f !== 'HNO3');
  const metal = oneOf(isMetal);
  if (acid && metal) {
    if (ACTIVITY.indexOf(metal) > ACTIVITY.indexOf('H')) return {none: true, kind: 'không phản ứng', note: `${metal} đứng sau H trong dãy hoạt động hóa học`};
    const v = metal === 'Fe' ? 2 : VAL[metal];
    return {products: [ionic(metal, v, ACIDS[acid]), 'H2'], kind: 'phản ứng thế (kim loại + axit loãng)', note: metal === 'Fe' ? 'Fe tạo muối sắt(II) với axit loãng' : 'kim loại đứng trước H đẩy H₂ ra khỏi axit'};
  }
  // kim loại hoạt động + nước
  if (metal && has('H2O') && ['Li', 'Na', 'K', 'Ca', 'Ba'].includes(metal)) return {products: [ionic(metal, VAL[metal], 'OH'), 'H2'], kind: 'phản ứng với nước', note: 'kim loại kiềm / kiềm thổ tan trong nước tạo bazơ và H₂'};
  // kim loại + muối
  const salt = oneOf((f) => !!splitIonic(f) && splitIonic(f)!.an !== 'OH' && splitIonic(f)!.an !== 'CO3');
  if (metal && salt && metal !== salt) {
    const s = splitIonic(salt)!;
    if (ACTIVITY.indexOf(metal) > ACTIVITY.indexOf(s.m)) return {none: true, kind: 'không phản ứng', note: `${metal} yếu hơn ${s.m} nên không đẩy được ${s.m} khỏi muối`};
    if (['K', 'Na', 'Ca', 'Ba'].includes(metal)) return null; // kim loại mạnh phản ứng với nước trước
    const v = metal === 'Fe' ? 2 : VAL[metal];
    return {products: [ionic(metal, v, s.an), s.m], kind: 'phản ứng thế (kim loại + muối)', note: `${metal} đứng trước ${s.m} trong dãy hoạt động nên đẩy ${s.m} ra khỏi muối`};
  }
  // axit + bazơ / oxit bazơ / muối cacbonat
  if (acid) {
    const an = ACIDS[acid];
    const other = R.find((f) => f !== acid)!;
    const ion = splitIonic(other);
    if (ion && ion.an === 'OH') return {products: [ionic(ion.m, ion.v, an), 'H2O'], kind: 'phản ứng trung hòa', note: 'axit + bazơ → muối + nước'};
    if (ion && ion.an === 'CO3') return {products: [ionic(ion.m, ion.v, an), 'CO2', 'H2O'], kind: 'axit + muối cacbonat', note: 'tạo muối mới, khí CO₂ và nước'};
    const at = parseFormula(other);
    const mo = at && at.O && Object.keys(at).length === 2 ? Object.keys(at).find((e) => e !== 'O') : undefined;
    if (mo && VAL[mo] && Number.isInteger((2 * at!.O) / at![mo])) return {products: [ionic(mo, (2 * at!.O) / at![mo], an), 'H2O'], kind: 'axit + oxit bazơ', note: 'oxit bazơ tan trong axit tạo muối và nước'};
  }
  // CO2 + bazơ
  if (has('CO2')) {
    const base = R.find((f) => f !== 'CO2')!;
    const ion = splitIonic(base);
    if (ion && ion.an === 'OH') return {products: [ionic(ion.m, ion.v, 'CO3'), 'H2O'], kind: 'oxit axit + bazơ', note: 'CO₂ + bazơ → muối cacbonat + nước (CO₂ không dư)'};
  }
  // muối/bazơ + muối: trao đổi ion, chỉ khi có kết tủa
  const ia = splitIonic(a);
  const ib = splitIonic(b);
  if (ia && ib && ia.m !== ib.m && ia.an !== ib.an) {
    const p1 = ionic(ia.m, ia.v, ib.an);
    const p2 = ionic(ib.m, ib.v, ia.an);
    const prod = [p1, p2];
    const ppt = prod.find((p) => INSOLUBLE.has(p));
    if (ppt) return {products: prod, kind: 'phản ứng trao đổi', note: `có kết tủa ${ppt}`};
    return {none: true, kind: 'không phản ứng', note: 'hai muối tan, không tạo kết tủa hay khí nên không xảy ra phản ứng trao đổi'};
  }
  return null;
}

/** Tên loại phản ứng cho nhãn hiển thị. */
export interface EquationPlan {
  left: Species[];
  right: Species[] | null;
  /** sản phẩm do máy dự đoán (vế phải không do người dùng viết) */
  predicted: boolean;
  kind: string;
  note: string;
  /** hệ số cân bằng đúng (theo thứ tự trái rồi phải); null nếu không cân bằng được */
  solution: number[] | null;
  /** không có phản ứng */
  none?: boolean;
}

/** Từ chữ người dùng viết → kế hoạch: đọc, dự đoán sản phẩm nếu thiếu vế phải, cân bằng. */
export function planEquation(raw: string): EquationPlan | null {
  const eq = parseEquation(raw);
  if (!eq) return null;
  let right = eq.right;
  let predicted = false;
  let kind = 'phản ứng đã cho';
  let note = '';
  if (!right) {
    const pr = predictProducts(eq.left.map((s) => s.formula));
    if (!pr) return {left: eq.left, right: null, predicted: false, kind: 'chưa dự đoán chắc', note: 'Chưa có luật cho loại phản ứng này: em hãy viết thêm vế phải để tôi cân bằng giúp.', solution: null};
    if ('none' in pr) return {left: eq.left, right: null, predicted: false, kind: pr.kind, note: pr.note, solution: null, none: true};
    const sp = pr.products.map((f) => ({formula: f, coef: null, atoms: parseFormula(f)!}));
    if (sp.some((s) => !s.atoms)) return null;
    right = sp;
    predicted = true;
    kind = pr.kind;
    note = pr.note;
  }
  const solution = balance(eq.left.map((s) => s.atoms), right.map((s) => s.atoms));
  if (predicted && !solution) return {left: eq.left, right: null, predicted: false, kind: 'chưa dự đoán chắc', note: 'Sản phẩm dự đoán không cân bằng được nên tôi không đưa ra.', solution: null};
  return {left: eq.left, right, predicted, kind, note, solution};
}
