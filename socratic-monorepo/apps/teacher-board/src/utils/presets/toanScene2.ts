import type {P, PresetSpec, Shape} from './types';
import {C, arrow, axes, box, deg, dot, f1, f2, f3, ln, plot, poly, rad, ring, tick, txt} from './sceneKit';
import {cross3, dot3, len3} from './toanScene1';

// ------------------------------------------------------------------ đếm
export const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
export const arrangement = (n: number, k: number): number => (k < 0 || k > n ? 0 : fact(n) / fact(n - k));
export const combination = (n: number, k: number): number => (k < 0 || k > n ? 0 : Math.round(fact(n) / (fact(k) * fact(n - k))));

// ------------------------------------------------------------------ thống kê
export function parseData(text: string): number[] {
  return text
    .split(/[\s,;]+/)
    .map((x) => Number(x))
    .filter((x) => Number.isFinite(x))
    .slice(0, 80);
}
export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}
/** Trung vị của nửa dưới/trên (cách SGK: Q₁, Q₃ là trung vị hai nửa, không tính trung vị khi n lẻ). */
export function quartiles(sorted: number[]): [number, number, number] {
  const med = (a: number[]) => quantile(a, 0.5);
  const n = sorted.length;
  const half = Math.floor(n / 2);
  return [med(sorted.slice(0, half)), med(sorted), med(sorted.slice(n - half))];
}
export function describe(data: number[]) {
  const s = [...data].sort((a, b) => a - b);
  const n = s.length;
  const mean = n ? s.reduce((x, y) => x + y, 0) / n : NaN;
  const variance = n ? s.reduce((x, y) => x + (y - mean) ** 2, 0) / n : NaN;
  const freq = new Map<number, number>();
  s.forEach((x) => freq.set(x, (freq.get(x) ?? 0) + 1));
  const top = Math.max(0, ...freq.values());
  const modes = [...freq].filter(([, c]) => c === top && top > 1).map(([v]) => v);
  const [q1, med, q3] = n >= 2 ? quartiles(s) : [NaN, NaN, NaN];
  return {n, mean, variance, sd: Math.sqrt(variance), median: med, q1, q3, iqr: q3 - q1, range: n ? s[n - 1] - s[0] : NaN, modes, min: s[0], max: s[n - 1], sorted: s};
}

// ------------------------------------------------------------------ dãy số
export function seqTerm(kind: string, n: number, u1: number, r: number): number {
  if (kind === 'csc') return u1 + (n - 1) * r;
  if (kind === 'csn') return u1 * Math.pow(r, n - 1);
  return (2 * n + 1) / (n + 1) + (r === 0 ? 0 : 0); // dãy có giới hạn 2
}
/** Số hạng đầu N nhỏ nhất sao cho |u_n − 2| < ε với mọi n > N (dãy (2n+1)/(n+1)): |u_n − 2| = 1/(n+1). */
export const limitN = (eps: number) => Math.max(0, Math.ceil(1 / eps - 1));

// ------------------------------------------------------------------ hàm cho đạo hàm, khảo sát, tích phân
export interface Fn {
  label: string;
  f: (x: number) => number;
  df: (x: number) => number;
}
export const DERIV_FNS: Record<string, Fn> = {
  sq: {label: 'f(x) = x²', f: (x) => x * x, df: (x) => 2 * x},
  cubic: {label: 'f(x) = x³ − 3x', f: (x) => x ** 3 - 3 * x, df: (x) => 3 * x * x - 3},
  sin: {label: 'f(x) = sin x', f: Math.sin, df: Math.cos},
  exp: {label: 'f(x) = eˣ', f: Math.exp, df: Math.exp},
};

export interface StudyFn {
  label: string;
  f: (x: number) => number;
  df: (x: number) => number;
  crit: number[];
  vAsym?: number;
  hAsym?: number;
  domain: string;
  dfText: string;
}
export const STUDY_FNS: Record<string, StudyFn> = {
  cubic: {label: 'y = x³ − 3x + 2', f: (x) => x ** 3 - 3 * x + 2, df: (x) => 3 * x * x - 3, crit: [-1, 1], domain: 'ℝ', dfText: "y′ = 3x² − 3 = 3(x − 1)(x + 1)"},
  quartic: {label: 'y = x⁴ − 2x² − 1', f: (x) => x ** 4 - 2 * x * x - 1, df: (x) => 4 * x ** 3 - 4 * x, crit: [-1, 0, 1], domain: 'ℝ', dfText: "y′ = 4x³ − 4x = 4x(x − 1)(x + 1)"},
  rational: {label: 'y = (2x − 1)/(x + 1)', f: (x) => (2 * x - 1) / (x + 1), df: (x) => 3 / (x + 1) ** 2, crit: [], vAsym: -1, hAsym: 2, domain: 'ℝ \\ {−1}', dfText: "y′ = 3/(x + 1)² > 0"},
};

export interface IntFn {
  label: string;
  f: (x: number) => number;
  F: (x: number) => number;
  lo: number;
  hi: number;
}
export const INT_FNS: Record<string, IntFn> = {
  sq: {label: 'f(x) = x²', f: (x) => x * x, F: (x) => x ** 3 / 3, lo: 0, hi: 4},
  sin1: {label: 'f(x) = sin x + 1', f: (x) => Math.sin(x) + 1, F: (x) => -Math.cos(x) + x, lo: 0, hi: 6},
  sqrt: {label: 'f(x) = √x', f: (x) => Math.sqrt(Math.max(0, x)), F: (x) => (2 / 3) * Math.max(0, x) ** 1.5, lo: 0, hi: 4},
  para: {label: 'f(x) = 4 − x²', f: (x) => 4 - x * x, F: (x) => 4 * x - x ** 3 / 3, lo: -2, hi: 2},
};
export function riemann(fn: IntFn, a: number, b: number, n: number, method: string): number {
  const h = (b - a) / n;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const x0 = a + i * h;
    s += method === 'left' ? fn.f(x0) : method === 'right' ? fn.f(x0 + h) : method === 'mid' ? fn.f(x0 + h / 2) : (fn.f(x0) + fn.f(x0 + h)) / 2;
  }
  return s * h;
}

// ------------------------------------------------------------------ hình học không gian (lập phương)
export type V3 = [number, number, number];
const sub3 = (u: number[], v: number[]): V3 => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
/** Góc (độ) giữa đường thẳng có hướng d và mặt phẳng có pháp tuyến n. */
export const angleLinePlane = (d: number[], n: number[]) => deg(Math.asin(Math.abs(dot3(d, n)) / (len3(d) * len3(n))));
/** Góc (độ) giữa hai mặt phẳng theo hai pháp tuyến. */
export const anglePlanes = (n1: number[], n2: number[]) => deg(Math.acos(Math.abs(dot3(n1, n2)) / (len3(n1) * len3(n2))));
export const distPointPlane = (pt: number[], q: number[], n: number[]) => Math.abs(dot3(sub3(pt, q), n)) / len3(n);
export const distSkew = (p1: number[], d1: number[], p2: number[], d2: number[]) => {
  const n = cross3(d1, d2);
  return Math.abs(dot3(sub3(p2, p1), n)) / len3(n);
};
export const CUBE: Record<string, V3> = {A: [0, 0, 0], B: [1, 0, 0], C: [1, 1, 0], D: [0, 1, 0], A1: [0, 0, 1], B1: [1, 0, 1], C1: [1, 1, 1], D1: [0, 1, 1]};
export const CUBE_EDGES: [string, string][] = [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A'], ['A1', 'B1'], ['B1', 'C1'], ['C1', 'D1'], ['D1', 'A1'], ['A', 'A1'], ['B', 'B1'], ['C', 'C1'], ['D', 'D1']];
export const CUBE_QUESTIONS: Record<string, {label: string; value: (a: number) => number; unit: string; text: string}> = {
  lineplane: {label: 'Góc giữa AC′ và mặt phẳng (ABCD)', value: () => angleLinePlane(sub3(CUBE.C1, CUBE.A), [0, 0, 1]), unit: '°', text: 'tan φ = AA′ / AC = 1/√2'},
  planes: {label: 'Góc giữa hai mặt phẳng (A′BD) và (ABCD)', value: () => anglePlanes(cross3(sub3(CUBE.B, CUBE.A1), sub3(CUBE.D, CUBE.A1)), [0, 0, 1]), unit: '°', text: 'Nhị diện cạnh BD: tan φ = AA′ / (AC/2) = √2'},
  pointplane: {label: 'Khoảng cách từ A đến (BDD′B′)', value: (a) => a * distPointPlane(CUBE.A, CUBE.B, cross3(sub3(CUBE.D, CUBE.B), [0, 0, 1])), unit: '', text: 'AC ⟂ (BDD′B′) nên d = AC/2 = a√2/2'},
  skew: {label: 'Khoảng cách hai đường chéo nhau AC và BD′', value: (a) => a * distSkew(CUBE.A, sub3(CUBE.C, CUBE.A), CUBE.B, sub3(CUBE.D1, CUBE.B)), unit: '', text: 'd = |[AC, BD′]·AB| / |[AC, BD′]| = a/√6'},
};
export const CUBE_HIGHLIGHT: Record<string, {lines: [string, string][]; planePts: string[]; col: string}> = {
  lineplane: {lines: [['A', 'C1'], ['A', 'C']], planePts: ['A', 'B', 'C', 'D'], col: C.blue},
  planes: {lines: [['A1', 'B'], ['A1', 'D'], ['B', 'D']], planePts: ['A1', 'B', 'D'], col: C.red},
  pointplane: {lines: [['A', 'C']], planePts: ['B', 'D', 'D1', 'B1'], col: C.green},
  skew: {lines: [['A', 'C'], ['B', 'D1']], planePts: [], col: C.purple},
};

// ------------------------------------------------------------------ mặt bậc hai
type Surf = (u: number, v: number) => [number, number, number];
export const SURFACES: Record<string, {label: string; fn: Surf; u: [number, number]; v: [number, number]; eq: string}> = {
  ellipsoid: {label: 'Elipxoit', fn: (u, v) => [2.2 * Math.sin(u) * Math.cos(v), 1.5 * Math.sin(u) * Math.sin(v), 1.2 * Math.cos(u)], u: [0, Math.PI], v: [0, 2 * Math.PI], eq: 'x²/a² + y²/b² + z²/c² = 1'},
  hyper1: {label: 'Hypeboloit một tầng', fn: (u, v) => [Math.sqrt(1 + u * u) * Math.cos(v) * 1.4, Math.sqrt(1 + u * u) * Math.sin(v) * 1.4, u * 1.4], u: [-1.4, 1.4], v: [0, 2 * Math.PI], eq: 'x²/a² + y²/b² − z²/c² = 1'},
  cone: {label: 'Mặt nón', fn: (u, v) => [u * Math.cos(v) * 1.2, u * Math.sin(v) * 1.2, u * 1.4], u: [-1.5, 1.5], v: [0, 2 * Math.PI], eq: 'x²/a² + y²/b² = z²/c²'},
  paraboloid: {label: 'Paraboloit elip', fn: (u, v) => [u * Math.cos(v) * 1.5, u * Math.sin(v) * 1.5, u * u * 1.2 - 1.2], u: [0, 1.5], v: [0, 2 * Math.PI], eq: 'z = x²/a² + y²/b²'},
  saddle: {label: 'Paraboloit hypebolic (yên ngựa)', fn: (u, v) => [u * 1.6, v * 1.6, (u * u - v * v) * 0.9], u: [-1.4, 1.4], v: [-1.4, 1.4], eq: 'z = x²/a² − y²/b²'},
  mobius: {label: 'Dải Möbius (một mặt)', fn: (u, v) => [(1.7 + v * Math.cos(u / 2)) * Math.cos(u), (1.7 + v * Math.cos(u / 2)) * Math.sin(u), v * Math.sin(u / 2)], u: [0, 2 * Math.PI], v: [-0.6, 0.6], eq: 'dải một mặt, một mép'},
};

export const TOAN_SCENE2_PRESETS: Record<string, PresetSpec> = {
  MATH_COUNTING_TREE: {
    family: 'SCENE_LAB',
    engine: 'MATH',
    title: 'Quy tắc đếm, hoán vị, chỉnh hợp, tổ hợp và tam giác Pascal',
    question: 'Vì sao chọn k phần tử không tính thứ tự lại chia cho k! so với chọn có thứ tự? Mỗi số trong tam giác Pascal được tạo từ hai số nào ở hàng trên?',
    keywords: /quy tac (?:cong|nhan)|hoan vi|chinh hop|to hop|tam giac pascal|\bpascal\b|nhi thuc newton|so do cay dem|dem so cach/,
    examples: ['quy tắc cộng quy tắc nhân', 'hoán vị chỉnh hợp tổ hợp', 'tam giác Pascal', 'nhị thức Newton'],
    data: {
      viewBox: [560, 340],
      choices: [{key: 'mode', label: 'Hình', value: 'pascal', options: [['pascal', 'Tam giác Pascal'], ['tree', 'Sơ đồ cây (quy tắc nhân)']]}],
      sliders: [
        {key: 'n', label: 'n', min: 1, max: 9, step: 1, value: 5},
        {key: 'k', label: 'k', min: 0, max: 9, step: 1, value: 2},
        {key: 'm', label: 'Số cách chọn bước 1 (cây)', min: 1, max: 4, step: 1, value: 3},
        {key: 'l', label: 'Số cách chọn bước 2 (cây)', min: 1, max: 4, step: 1, value: 2},
      ],
      draw: (p, _t, s) => {
        const out: Shape[] = [];
        if (s.mode === 'tree') {
          out.push(txt(70, 30, 'Bước 1', {bold: true}), txt(260, 30, 'Bước 2', {bold: true}), txt(470, 30, 'Kết quả', {bold: true}), dot(40, 170, 6));
          const total = p.m * p.l;
          let leaf = 0;
          for (let i = 0; i < p.m; i++) {
            const y1 = 170 + (i - (p.m - 1) / 2) * 76 * (p.l / 2 + 0.5);
            out.push(ln(40, 170, 170, y1, {stroke: C.blue}), dot(170, y1, 5, C.blue), txt(170, y1 - 10, `a${i + 1}`, {size: 11}));
            for (let j = 0; j < p.l; j++) {
              const y2 = 40 + ((leaf + 0.5) * 270) / total;
              out.push(ln(170, y1, 350, y2, {stroke: C.red}), dot(350, y2, 4, C.red), txt(372, y2 + 4, `(a${i + 1}, b${j + 1})`, {size: 11, anchor: 'start'}));
              leaf++;
            }
          }
          return out;
        }
        const n = Math.round(p.n);
        const k = Math.min(Math.round(p.k), n);
        const rowH = 28;
        const cell = 46;
        for (let r = 0; r <= n; r++) {
          for (let c = 0; c <= r; c++) {
            const x = 280 + (c - r / 2) * cell;
            const y = 30 + r * rowH;
            const hit = r === n && c === k;
            out.push({t: 'circle', cx: x, cy: y - 4, r: 13, fill: hit ? C.orange : r === n ? 'rgba(37,99,235,0.15)' : '#F5F5F4'}, txt(x, y, String(combination(r, c)), {size: r > 7 ? 10 : 12, bold: hit, fill: hit ? '#fff' : C.ink}));
          }
        }
        return out;
      },
      readouts: [
        {label: 'n! · Aₙᵏ (có thứ tự)', value: (p) => `${fact(Math.round(p.n)).toLocaleString('vi-VN')} · ${arrangement(Math.round(p.n), Math.round(p.k)).toLocaleString('vi-VN')}`},
        {label: 'Cₙᵏ = n! / (k!(n − k)!)', value: (p) => combination(Math.round(p.n), Math.round(p.k)).toLocaleString('vi-VN')},
        {label: 'Quy tắc nhân: m × l', value: (p) => String(p.m * p.l)},
        {label: '(a + b)ⁿ có tổng hệ số', value: (p) => (2 ** Math.round(p.n)).toLocaleString('vi-VN')},
      ],
      note: 'Cₙᵏ = Cₙ₋₁ᵏ⁻¹ + Cₙ₋₁ᵏ; hàng n của tam giác Pascal chính là hệ số khai triển (a + b)ⁿ.',
    },
  },

  MATH_STAT_DESCRIPTIVE: {
    family: 'SCENE_LAB',
    engine: 'MATH',
    title: 'Thống kê mô tả: số trung bình, trung vị, tứ phân vị, độ lệch chuẩn',
    question: 'Khi thêm một giá trị rất lớn vào mẫu số liệu, số trung bình và trung vị thay đổi khác nhau như thế nào? Khoảng tứ phân vị và độ lệch chuẩn phản ánh điều gì?',
    keywords: /thong ke mo ta|so trung binh cong|do lech chuan|tu phan vi|khoang bien thien|phuong sai|mau (?:so lieu )?ghep nhom/,
    examples: ['thống kê mô tả', 'độ lệch chuẩn và phương sai', 'tứ phân vị của mẫu số liệu', 'mẫu số liệu ghép nhóm'],
    data: {
      viewBox: [560, 300],
      texts: [{key: 'data', label: 'Mẫu số liệu', value: '4 5 5 6 7 7 7 8 9 10 12', maxLength: 120}],
      sliders: [{key: 'bins', label: 'Số nhóm của biểu đồ cột', min: 2, max: 12, step: 1, value: 5}],
      draw: (p, _t, s) => {
        const d = describe(parseData(s.data));
        if (d.n === 0) return [txt(280, 150, 'Nhập các số cách nhau bởi dấu cách', {size: 14, fill: C.red})];
        const x0 = d.min;
        const x1 = d.max === d.min ? d.min + 1 : d.max;
        const bins = Math.round(p.bins);
        const bw = (x1 - x0) / bins;
        const counts = Array(bins).fill(0);
        d.sorted.forEach((v) => counts[Math.min(bins - 1, Math.floor((v - x0) / bw))]++);
        const maxC = Math.max(...counts);
        const px = (v: number) => 50 + ((v - x0) / (x1 - x0)) * 460;
        const out: Shape[] = [ln(50, 215, 520, 215, {stroke: C.ink, w: 1.3})];
        counts.forEach((c, i) => out.push(box(50 + (i * 460) / bins + 1, 215 - (c / maxC) * 140, 460 / bins - 2, (c / maxC) * 140, 'rgba(37,99,235,0.35)', C.blue), txt(50 + ((i + 0.5) * 460) / bins, 210 - (c / maxC) * 140, String(c), {size: 11})));
        for (let i = 0; i <= bins; i++) out.push(tick(50 + (i * 460) / bins, 230, f1(x0 + i * bw)));
        // hộp
        const by = 262;
        out.push(ln(px(d.min), by, px(d.q1), by, {stroke: C.ink, w: 2}), ln(px(d.q3), by, px(d.max), by, {stroke: C.ink, w: 2}), box(px(d.q1), by - 14, Math.max(2, px(d.q3) - px(d.q1)), 28, 'rgba(234,88,12,0.25)', C.orange), ln(px(d.median), by - 14, px(d.median), by + 14, {stroke: C.red, w: 3}));
        out.push(ln(px(d.mean), by - 22, px(d.mean), by + 22, {stroke: C.green, w: 2, dash: '4 3'}), txt(px(d.mean), by - 26, 'TB', {size: 10, fill: C.green, bold: true}), txt(px(d.median), by + 28, 'Me', {size: 10, fill: C.red, bold: true}));
        return out;
      },
      readouts: [
        {label: 'n · trung bình · trung vị', value: (_p, _t, s) => {
          const d = describe(parseData(s.data));
          return d.n ? `${d.n} · ${f2(d.mean)} · ${f2(d.median)}` : '—';
        }},
        {label: 'Mốt', value: (_p, _t, s) => {
          const d = describe(parseData(s.data));
          return d.modes.length ? d.modes.join('; ') : 'không có';
        }},
        {label: 'Q₁ · Q₃ · khoảng tứ phân vị', value: (_p, _t, s) => {
          const d = describe(parseData(s.data));
          return d.n >= 2 ? `${f2(d.q1)} · ${f2(d.q3)} · ${f2(d.iqr)}` : '—';
        }},
        {label: 'Khoảng biến thiên · phương sai · độ lệch chuẩn', value: (_p, _t, s) => {
          const d = describe(parseData(s.data));
          return d.n ? `${f2(d.range)} · ${f2(d.variance)} · ${f2(d.sd)}` : '—';
        }},
      ],
      note: 'Hộp màu cam là khoảng tứ phân vị (Q₁–Q₃), vạch đỏ là trung vị, vạch xanh nét đứt là số trung bình. Thử thêm số rất lớn (ví dụ 60).',
    },
  },

  MATH_APPROX_ERROR: {
    family: 'SCENE_LAB',
    engine: 'MATH',
    title: 'Số gần đúng và sai số',
    question: 'Quy tròn đến mấy chữ số thập phân thì sai số tuyệt đối không vượt quá nửa đơn vị hàng quy tròn? Sai số tương đối khác sai số tuyệt đối ở điểm nào khi so sánh độ chính xác?',
    keywords: /so gan dung|sai so tuyet doi|sai so tuong doi|quy tron so|do chinh xac cua so gan dung/,
    examples: ['số gần đúng và sai số', 'sai số tuyệt đối sai số tương đối', 'quy tròn số gần đúng'],
    data: {
      viewBox: [560, 220],
      choices: [{key: 'c', label: 'Giá trị đúng', value: 'pi', options: [['pi', 'π'], ['sqrt2', '√2'], ['e', 'e'], ['third', '1/3'], ['phi', 'φ (tỉ lệ vàng)']]}],
      sliders: [{key: 'd', label: 'Quy tròn đến chữ số thập phân thứ', min: 0, max: 6, step: 1, value: 2}],
      draw: (p, _t, s) => {
        const v = APPROX[s.c];
        const d = Math.round(p.d);
        const approx = Math.round(v * 10 ** d) / 10 ** d;
        const half = 0.5 * 10 ** -d;
        const lo = v - 1.6 * 10 ** -d;
        const hi = v + 1.6 * 10 ** -d;
        const X = (x: number) => 40 + ((x - lo) / (hi - lo)) * 480;
        return [
          ln(40, 120, 520, 120, {stroke: C.ink, w: 1.4}),
          box(X(approx - half), 100, X(approx + half) - X(approx - half), 40, 'rgba(22,163,74,0.15)', C.green),
          ln(X(v), 90, X(v), 150, {stroke: C.blue, w: 2.4}), txt(X(v), 82, 'giá trị đúng a', {fill: C.blue, size: 11}),
          ln(X(approx), 90, X(approx), 150, {stroke: C.red, w: 2.4}), txt(X(approx), 168, 'số gần đúng ā', {fill: C.red, size: 11}),
          txt(280, 28, `ā = ${approx.toFixed(d)}`, {size: 18, bold: true}),
          txt(280, 200, 'Vùng xanh: ā ± ½ đơn vị hàng quy tròn', {size: 11, fill: C.green}),
        ];
      },
      readouts: [
        {label: 'Sai số tuyệt đối Δ = |a − ā|', value: (p, _t, s) => {
          const v = APPROX[s.c];
          const d = Math.round(p.d);
          return (Math.abs(v - Math.round(v * 10 ** d) / 10 ** d)).toExponential(2);
        }},
        {label: 'Sai số tuyệt đối không vượt quá', value: (p) => (0.5 * 10 ** -Math.round(p.d)).toString().replace('.', ',')},
        {label: 'Sai số tương đối δ = Δ / |a|', value: (p, _t, s) => {
          const v = APPROX[s.c];
          const d = Math.round(p.d);
          return `${((100 * Math.abs(v - Math.round(v * 10 ** d) / 10 ** d)) / Math.abs(v)).toExponential(2)} %`;
        }},
      ],
      note: 'Quy tròn đến hàng 10⁻ᵈ thì Δ ≤ ½·10⁻ᵈ. Muốn so độ chính xác của hai phép đo khác đơn vị ta dùng sai số tương đối.',
    },
  },

  MATH_SEQUENCE_LAB: {
    family: 'SCENE_LAB',
    engine: 'MATH',
    title: 'Dãy số: cấp số cộng, cấp số nhân, giới hạn của dãy',
    question: 'Khi nào cấp số nhân có tổng vô hạn? Với dãy có giới hạn L, cho ε nhỏ bao nhiêu thì từ số hạng nào trở đi mọi số hạng đều nằm trong dải (L − ε, L + ε)?',
    keywords: /cap so cong|cap so nhan|gioi han cua day so|tong cap so nhan lui vo han|day so co gioi han|day so tang|day so giam|cong sai|cong boi/,
    examples: ['cấp số cộng', 'cấp số nhân', 'giới hạn của dãy số', 'tổng cấp số nhân lùi vô hạn'],
    data: {
      viewBox: [560, 320],
      choices: [{key: 'kind', label: 'Dãy', value: 'csc', options: [['csc', 'Cấp số cộng uₙ = u₁ + (n−1)d'], ['csn', 'Cấp số nhân uₙ = u₁·qⁿ⁻¹'], ['lim', 'Dãy uₙ = (2n+1)/(n+1) → 2']]}],
      sliders: [
        {key: 'u1', label: 'u₁', min: -5, max: 5, step: 0.5, value: 2},
        {key: 'r', label: 'd hoặc q', min: -3, max: 3, step: 0.1, value: 1.5},
        {key: 'N', label: 'Số số hạng vẽ', min: 5, max: 30, step: 1, value: 12},
        {key: 'eps', label: 'ε (dãy có giới hạn)', min: 0.05, max: 1, step: 0.05, value: 0.2},
      ],
      draw: (p, _t, s) => {
        const N = Math.round(p.N);
        const vals = Array.from({length: N}, (_, i) => seqTerm(s.kind, i + 1, p.u1, s.kind === 'csn' ? p.r : p.r));
        const ymin = Math.min(0, ...vals);
        const ymax = Math.max(0.5, ...vals);
        const span = ymax - ymin || 1;
        const X = (n: number) => 50 + (n / (N + 1)) * 470;
        const Y = (v: number) => 270 - ((Math.max(-1e6, Math.min(1e6, v)) - ymin) / span) * 230;
        const out: Shape[] = [arrow(40, Y(0), 530, Y(0), C.ink, 1.3), arrow(50, 280, 50, 20, C.ink, 1.3), txt(536, Y(0) + 4, 'n', {size: 11})];
        if (s.kind === 'lim') {
          out.push(box(50, Y(2 + p.eps), 470, Y(2 - p.eps) - Y(2 + p.eps), 'rgba(22,163,74,0.14)', 'none'), ln(50, Y(2), 520, Y(2), {stroke: C.green, dash: '5 4', w: 1.4}), txt(56, Y(2) - 6, 'L = 2', {fill: C.green, size: 11, anchor: 'start'}));
          const n0 = limitN(p.eps);
          if (n0 < N) out.push(ln(X(n0 + 0.5), 30, X(n0 + 0.5), 280, {stroke: C.red, dash: '4 3', w: 1.4}), txt(X(n0 + 0.5) + 4, 40, `n > ${n0}`, {size: 11, fill: C.red, anchor: 'start'}));
        }
        vals.forEach((v, i) => out.push(dot(X(i + 1), Y(v), 4, C.blue)));
        return out;
      },
      readouts: [
        {label: 'Số hạng thứ N', value: (p, _t, s) => f3(seqTerm(s.kind, Math.round(p.N), p.u1, p.r))},
        {label: 'Tổng N số hạng đầu', value: (p, _t, s) => {
          const N = Math.round(p.N);
          if (s.kind === 'csc') return f2((N * (2 * p.u1 + (N - 1) * p.r)) / 2);
          if (s.kind === 'csn') return Math.abs(p.r - 1) < 1e-9 ? f2(N * p.u1) : f2((p.u1 * (1 - p.r ** N)) / (1 - p.r));
          return f2(Array.from({length: N}, (_, i) => seqTerm('lim', i + 1, 0, 0)).reduce((a, b) => a + b, 0));
        }},
        {label: 'Tổng vô hạn / số hạng cần cho |uₙ − 2| < ε', value: (p, _t, s) => {
          if (s.kind === 'csn') return Math.abs(p.r) < 1 ? f2(p.u1 / (1 - p.r)) : 'không có (|q| ≥ 1)';
          if (s.kind === 'lim') return `n > ${limitN(p.eps)}`;
          return 'không có';
        }},
      ],
      note: 'Cấp số nhân lùi vô hạn (|q| < 1) có tổng S = u₁ / (1 − q). Dãy (2n+1)/(n+1) có |uₙ − 2| = 1/(n+1) < ε khi n > 1/ε − 1.',
    },
  },

  MATH_LIMIT_CONTINUITY: {
    family: 'SCENE_LAB',
    engine: 'MATH',
    title: 'Giới hạn hàm số theo ε–δ và tính liên tục',
    question: 'Với mỗi dải sai lệch ε quanh giới hạn, ta tìm được khoảng δ quanh x₀ để mọi giá trị hàm trong khoảng đó nằm trong dải: hàm nào làm điều này được, hàm nào không?',
    keywords: /gioi han ham so|epsilon delta|\bepsilon\b|ham so lien tuc|gian doan tai|tiem can ngang|tiem can dung/,
    examples: ['giới hạn hàm số', 'hàm số liên tục tại một điểm', 'tiệm cận đứng và tiệm cận ngang'],
    data: {
      viewBox: [560, 320],
      choices: [{key: 'fn', label: 'Hàm số', value: 'hole', options: [['hole', 'f(x) = (x²−1)/(x−1), x₀ = 1'], ['sinc', 'f(x) = sin x / x, x₀ = 0'], ['step', 'f(x) = x/|x|, x₀ = 0'], ['inv', 'f(x) = 1/x², x₀ = 0']]}],
      sliders: [{key: 'eps', label: 'ε', min: 0.05, max: 1, step: 0.05, value: 0.3}],
      draw: (p, _t, s) => {
        const L = LIM[s.fn];
        const kx = 110;
        const ky = 60;
        const ox = 280;
        const oy = 200;
        const out: Shape[] = [...axes(ox, oy, -2.4, 2.4, -2, 2.6, kx, ky, false)];
        const segs = s.fn === 'step' ? [[-2.2, -0.001], [0.001, 2.2]] : s.fn === 'inv' ? [[-2.2, -0.35], [0.35, 2.2]] : [[-2.2, 2.2]];
        for (const [a, b] of segs) out.push(plot((x) => L.f(x + L.x0), a, b, ox, oy, kx, ky, C.blue, 2.4, undefined, 3));
        if (L.limit !== null) {
          const d = deltaFor(s.fn, p.eps);
          out.push(box(40, oy - (L.limit + p.eps) * ky, 480, 2 * p.eps * ky, 'rgba(22,163,74,0.14)', 'none'), ln(40, oy - L.limit * ky, 520, oy - L.limit * ky, {stroke: C.green, dash: '5 4', w: 1.2}));
          out.push(box(ox - d * kx, 30, 2 * d * kx, 250, 'rgba(234,88,12,0.12)', 'none'));
          if (L.hole) out.push(ring(ox, oy - L.limit * ky, 5, C.blue, 2));
        }
        out.push(dot(ox, oy, 2.5, C.ink));
        return out;
      },
      readouts: [
        {label: 'Giới hạn khi x → x₀', value: (_p, _t, s) => LIM[s.fn].text},
        {label: 'δ lớn nhất (cho ε đã chọn)', value: (p, _t, s) => {
          if (LIM[s.fn].limit === null) return 'không tồn tại δ';
          const d = deltaFor(s.fn, p.eps);
          return d >= 2 ? '≥ 2' : f3(d);
        }},
        {label: 'Liên tục tại x₀?', value: (_p, _t, s) => LIM[s.fn].cont},
      ],
      note: 'Dải xanh: |f(x) − L| < ε. Dải cam: |x − x₀| < δ. Hàm có giới hạn L khi với mọi ε đều tìm được δ.',
    },
  },

  MATH_SPACE_RELATIONS: {
    family: 'SCENE_LAB',
    engine: 'MATH',
    title: 'Quan hệ trong không gian: góc và khoảng cách trên hình lập phương',
    question: 'Góc giữa đường thẳng và mặt phẳng, góc nhị diện và khoảng cách giữa hai đường chéo nhau được xác định bằng hình chiếu hoặc đoạn vuông góc chung như thế nào?',
    keywords: /goc giua duong thang va mat phang|goc nhi dien|khoang cach giua hai duong thang cheo nhau|duong thang cheo nhau|ba duong vuong goc|khoang cach tu diem den mat phang/,
    examples: ['góc giữa đường thẳng và mặt phẳng', 'góc nhị diện', 'khoảng cách hai đường thẳng chéo nhau'],
    data: {
      viewBox: [560, 340],
      choices: [{key: 'q', label: 'Bài toán', value: 'lineplane', options: Object.entries(CUBE_QUESTIONS).map(([k, v]) => [k, v.label] as [string, string])}],
      sliders: [{key: 'a', label: 'Cạnh hình lập phương a', min: 1, max: 6, step: 0.5, value: 3}],
      draw: (_p, _t, s) => {
        const k = 130;
        const ox = 190;
        const oy = 280;
        const pr = (v: number[]): [number, number] => [ox + k * (v[0] + 0.5 * v[1]), oy - k * (v[2] + 0.4 * v[1])];
        const out: Shape[] = [];
        const hl = CUBE_HIGHLIGHT[s.q];
        if (hl.planePts.length) out.push(poly(hl.planePts.map((n) => pr(CUBE[n])), {fill: 'rgba(37,99,235,0.14)', stroke: hl.col, w: 1.4}));
        for (const [a, b] of CUBE_EDGES) {
          const back = a === 'D' || b === 'D' ? (a === 'D' && (b === 'A' || b === 'C' || b === 'D1')) || (b === 'D' && (a === 'A' || a === 'C' || a === 'D1')) : false;
          const q1 = pr(CUBE[a]);
          const q2 = pr(CUBE[b]);
          out.push(ln(q1[0], q1[1], q2[0], q2[1], {stroke: C.ink, w: 1.6, dash: back ? '5 4' : undefined}));
        }
        for (const [a, b] of hl.lines) {
          const q1 = pr(CUBE[a]);
          const q2 = pr(CUBE[b]);
          out.push(ln(q1[0], q1[1], q2[0], q2[1], {stroke: hl.col, w: 3.2}));
        }
        for (const [n, v] of Object.entries(CUBE)) {
          const q = pr(v);
          out.push(dot(q[0], q[1], 3.5), txt(q[0] + (v[0] === 1 ? 12 : -12), q[1] - (v[2] === 1 ? 8 : -14), n.replace('1', '′'), {bold: true, size: 13}));
        }
        out.push(txt(410, 70, CUBE_QUESTIONS[s.q].text, {size: 12, anchor: 'start'}));
        return out;
      },
      readouts: [
        {label: 'Kết quả', value: (p, _t, s) => {
          const q = CUBE_QUESTIONS[s.q];
          return `${f2(q.value(p.a))}${q.unit}`;
        }},
        {label: 'Thể tích · đường chéo khối', value: (p) => `${f2(p.a ** 3)} · ${f2(p.a * Math.sqrt(3))}`},
      ],
      note: 'Góc đường–mặt = góc giữa đường thẳng và hình chiếu của nó. Khoảng cách hai đường chéo nhau = độ dài đoạn vuông góc chung.',
    },
  },

  MATH_DERIVATIVE_LAB: {
    family: 'SCENE_LAB',
    engine: 'MATH',
    title: 'Đạo hàm: từ cát tuyến đến tiếp tuyến',
    question: 'Khi điểm thứ hai tiến sát điểm đang xét, hệ số góc cát tuyến dần tới giá trị nào? Giá trị đó cho ta biết gì về tốc độ thay đổi của hàm?',
    keywords: /dinh nghia dao ham|y nghia (?:hinh hoc )?cua dao ham|cat tuyen|he so goc cua tiep tuyen|toc do thay doi tuc thoi/,
    examples: ['định nghĩa đạo hàm', 'ý nghĩa hình học của đạo hàm', 'từ cát tuyến đến tiếp tuyến'],
    data: {
      viewBox: [560, 320],
      choices: [{key: 'fn', label: 'Hàm số', value: 'cubic', options: Object.entries(DERIV_FNS).map(([k, v]) => [k, v.label] as [string, string])}],
      sliders: [
        {key: 'x0', label: 'x₀', min: -2.5, max: 2.5, step: 0.1, value: 1},
        {key: 'h', label: 'h (khoảng cách tới điểm thứ hai)', min: 0.01, max: 2, step: 0.01, value: 1.2},
      ],
      draw: (p, _t, s) => {
        const F = DERIV_FNS[s.fn];
        const k = 56;
        const ox = 280;
        const oy = 190;
        const X = (x: number) => ox + x * k;
        const Y = (y: number) => oy - y * k * 0.6;
        const y0 = F.f(p.x0);
        const y1 = F.f(p.x0 + p.h);
        const slope = (y1 - y0) / p.h;
        const out: Shape[] = [...axes(ox, oy, -4.5, 4.5, -3.5, 3.5, k, k * 0.6, true), plot(F.f, -4.4, 4.4, ox, oy, k, k * 0.6, C.blue, 2.4, undefined, 12)];
        const line = (m: number, col: string, dash?: string, w = 2) => ln(X(-4.5), Y(y0 + m * (-4.5 - p.x0)), X(4.5), Y(y0 + m * (4.5 - p.x0)), {stroke: col, w, dash});
        out.push(line(F.df(p.x0), C.green, '6 4', 1.8), line(slope, C.red), dot(X(p.x0), Y(y0), 5, C.ink), dot(X(p.x0 + p.h), Y(y1), 5, C.red));
        return out;
      },
      readouts: [
        {label: 'Hệ số góc cát tuyến (f(x₀+h) − f(x₀)) / h', value: (p, _t, s) => f3((DERIV_FNS[s.fn].f(p.x0 + p.h) - DERIV_FNS[s.fn].f(p.x0)) / p.h)},
        {label: "f′(x₀) (tiếp tuyến, nét đứt xanh)", value: (p, _t, s) => f3(DERIV_FNS[s.fn].df(p.x0))},
        {label: 'Chênh lệch', value: (p, _t, s) => f3(Math.abs((DERIV_FNS[s.fn].f(p.x0 + p.h) - DERIV_FNS[s.fn].f(p.x0)) / p.h - DERIV_FNS[s.fn].df(p.x0)))},
      ],
      note: 'Kéo h về 0: đường đỏ (cát tuyến) trùng đường xanh nét đứt (tiếp tuyến) và hệ số góc tiến tới f′(x₀).',
    },
  },

  MATH_FUNCTION_STUDY: {
    family: 'SCENE_LAB',
    engine: 'MATH',
    title: 'Khảo sát và vẽ đồ thị hàm số theo từng bước',
    question: 'Bảng biến thiên được lập từ dấu của y′ như thế nào, và nó cho ta biết gì về cực trị, tiệm cận và hình dạng đồ thị?',
    keywords: /khao sat (?:va ve do thi )?(?:ham so|su bien thien)|cac buoc khao sat/,
    examples: ['khảo sát hàm số', 'các bước khảo sát và vẽ đồ thị'],
    data: {
      viewBox: [560, 400],
      choices: [{key: 'fn', label: 'Hàm số', value: 'cubic', options: Object.entries(STUDY_FNS).map(([k, v]) => [k, v.label] as [string, string])}],
      sliders: [{key: 'step', label: 'Bước (1 TXĐ · 2 y′ · 3 BBT · 4 tiệm cận · 5 đồ thị)', min: 1, max: 5, step: 1, value: 5}],
      draw: (p, _t, s) => {
        const F = STUDY_FNS[s.fn];
        const step = Math.round(p.step);
        const out: Shape[] = [txt(20, 24, F.label, {size: 15, bold: true, anchor: 'start'}), txt(20, 46, `Bước 1 — TXĐ: D = ${F.domain}`, {size: 12, anchor: 'start'})];
        if (step >= 2) out.push(txt(20, 66, `Bước 2 — ${F.dfText}`, {size: 12, anchor: 'start'}));
        if (step >= 3) {
          const xs = [-Infinity, ...F.crit, Infinity];
          const colW = 480 / (xs.length + (F.vAsym !== undefined ? 1 : 0));
          const ty = 92;
          out.push(box(20, ty, 520, 24, '#F5F5F4', C.grey), box(20, ty + 24, 520, 24, undefined, C.grey), box(20, ty + 48, 520, 56, undefined, C.grey), txt(36, ty + 17, 'x', {bold: true}), txt(36, ty + 41, "y′", {bold: true}), txt(36, ty + 80, 'y', {bold: true}));
          const pts = F.vAsym !== undefined ? [-Infinity, F.vAsym, Infinity] : xs;
          pts.forEach((x, i) => {
            const cx = 80 + (i * 440) / (pts.length - 1);
            out.push(txt(cx, ty + 17, x === -Infinity ? '−∞' : x === Infinity ? '+∞' : f1(x), {size: 12}));
            if (Number.isFinite(x) && F.vAsym === undefined) out.push(txt(cx, ty + 41, '0', {size: 12}), txt(cx, ty + 84, f1(F.f(x)), {size: 12, bold: true}));
            if (x === F.vAsym) out.push(txt(cx, ty + 41, '‖', {size: 14}));
            if (i < pts.length - 1) {
              const mid = (Number.isFinite(pts[i]) ? pts[i] : (pts[i + 1] as number) - 2) / 2 + (Number.isFinite(pts[i + 1]) ? pts[i + 1] : (pts[i] as number) + 2) / 2;
              const up = F.df(mid) > 0;
              const cx2 = 80 + ((i + 0.5) * 440) / (pts.length - 1);
              out.push(txt(cx2, ty + 41, up ? '+' : '−', {size: 14, fill: up ? C.green : C.red, bold: true}), arrow(cx2 - 28, up ? ty + 96 : ty + 62, cx2 + 28, up ? ty + 62 : ty + 96, up ? C.green : C.red, 1.6));
            }
          });
        }
        if (step >= 4) out.push(txt(20, 222, F.vAsym !== undefined ? `Bước 4 — Tiệm cận đứng x = ${F.vAsym}; tiệm cận ngang y = ${F.hAsym}` : 'Bước 4 — Không có tiệm cận (đa thức)', {size: 12, anchor: 'start'}));
        if (step >= 5) {
          const k = 48;
          const ox = 280;
          const oy = 320;
          out.push(...axes(ox, oy, -4.5, 4.5, -1.5, 1.5, k, k * 0.5, false));
          if (F.vAsym !== undefined) out.push(ln(ox + F.vAsym * k, 235, ox + F.vAsym * k, 390, {stroke: C.red, dash: '5 4', w: 1.2}), ln(40, oy - (F.hAsym ?? 0) * k * 0.5, 520, oy - (F.hAsym ?? 0) * k * 0.5, {stroke: C.red, dash: '5 4', w: 1.2}));
          const segs = F.vAsym !== undefined ? [[-4.4, F.vAsym - 0.06], [F.vAsym + 0.06, 4.4]] : [[-3.2, 3.2]];
          for (const [a, b] of segs) out.push(plot(F.f, a, b, ox, oy, k, k * 0.5, C.blue, 2.4, undefined, 5));
          for (const x of F.crit) out.push(dot(ox + x * k, oy - F.f(x) * k * 0.5, 4.5, C.orange));
        }
        return out;
      },
      readouts: [
        {label: 'Điểm cực trị (x; y)', value: (_p, _t, s) => {
          const F = STUDY_FNS[s.fn];
          return F.crit.length ? F.crit.map((x) => `(${f1(x)}; ${f1(F.f(x))})`).join(' · ') : 'không có';
        }},
        {label: 'Giá trị y tại x = 0', value: (_p, _t, s) => f1(STUDY_FNS[s.fn].f(0))},
      ],
      note: 'Quy trình: TXĐ → y′ và dấu → bảng biến thiên → tiệm cận → điểm đặc biệt → đồ thị. Kéo thanh bước để xem từng giai đoạn.',
    },
  },

  MATH_INTEGRAL_AREA: {
    family: 'SCENE_LAB',
    engine: 'MATH',
    title: 'Tích phân và diện tích: tổng Riemann hội tụ về tích phân',
    question: 'Khi chia nhỏ khoảng [a, b] thành nhiều phần hơn, tổng diện tích các hình chữ nhật tiến tới đại lượng nào? Cách chọn điểm đại diện (trái, phải, giữa) ảnh hưởng ra sao tới sai số?',
    keywords: /dien tich (?:hinh phang )?(?:duoi|gioi han boi) (?:do thi|duong cong)|tich phan xac dinh|hinh thang va hinh chu nhat xap xi dien tich|hinh thang va hinh chu nhat xap xi|ung dung cua tich phan/,
    examples: ['diện tích dưới đường cong', 'tích phân xác định', 'hình thang và hình chữ nhật xấp xỉ diện tích'],
    data: {
      viewBox: [560, 320],
      choices: [
        {key: 'fn', label: 'Hàm số', value: 'sq', options: Object.entries(INT_FNS).map(([k, v]) => [k, v.label] as [string, string])},
        {key: 'method', label: 'Điểm đại diện', value: 'mid', options: [['left', 'Đầu mút trái'], ['right', 'Đầu mút phải'], ['mid', 'Trung điểm'], ['trap', 'Hình thang']]},
      ],
      sliders: [{key: 'n', label: 'Số phần chia n', min: 1, max: 60, step: 1, value: 6}],
      draw: (p, _t, s) => {
        const F = INT_FNS[s.fn];
        const n = Math.round(p.n);
        const w = F.hi - F.lo;
        const ymax = Math.max(...Array.from({length: 61}, (_, i) => F.f(F.lo + (w * i) / 60)), 0.5);
        const ymin = Math.min(...Array.from({length: 61}, (_, i) => F.f(F.lo + (w * i) / 60)), 0);
        const kx = 440 / w;
        const ky = 220 / (ymax - ymin);
        const ox = 60 - F.lo * kx;
        const oy = 270 + ymin * ky;
        const out: Shape[] = [ln(40, oy, 520, oy, {stroke: C.ink, w: 1.3}), ln(ox, 40, ox, 290, {stroke: C.ink, w: 1.3})];
        const h = w / n;
        for (let i = 0; i < n; i++) {
          const x0 = F.lo + i * h;
          const y0 = F.f(x0);
          const y1 = F.f(x0 + h);
          if (s.method === 'trap') out.push(poly([[ox + x0 * kx, oy], [ox + x0 * kx, oy - y0 * ky], [ox + (x0 + h) * kx, oy - y1 * ky], [ox + (x0 + h) * kx, oy]], {fill: 'rgba(37,99,235,0.2)', stroke: C.blue, w: 0.8}));
          else {
            const yy = s.method === 'left' ? y0 : s.method === 'right' ? y1 : F.f(x0 + h / 2);
            out.push(box(ox + x0 * kx, oy - Math.max(0, yy) * ky, h * kx, Math.abs(yy) * ky, 'rgba(37,99,235,0.2)', C.blue));
          }
        }
        out.push(plot(F.f, F.lo, F.hi, ox, oy, kx, ky, C.red, 2.6));
        out.push(tick(ox + F.lo * kx, oy + 16, String(F.lo)), tick(ox + F.hi * kx, oy + 16, String(F.hi)));
        return out;
      },
      readouts: [
        {label: 'Tổng xấp xỉ', value: (p, _t, s) => f3(riemann(INT_FNS[s.fn], INT_FNS[s.fn].lo, INT_FNS[s.fn].hi, Math.round(p.n), s.method))},
        {label: 'Tích phân đúng F(b) − F(a)', value: (_p, _t, s) => f3(INT_FNS[s.fn].F(INT_FNS[s.fn].hi) - INT_FNS[s.fn].F(INT_FNS[s.fn].lo))},
        {label: 'Sai số', value: (p, _t, s) => f3(Math.abs(riemann(INT_FNS[s.fn], INT_FNS[s.fn].lo, INT_FNS[s.fn].hi, Math.round(p.n), s.method) - (INT_FNS[s.fn].F(INT_FNS[s.fn].hi) - INT_FNS[s.fn].F(INT_FNS[s.fn].lo))))},
      ],
      note: 'Khi n tăng, mọi cách xấp xỉ đều hội tụ về ∫ₐᵇ f(x)dx = F(b) − F(a); trung điểm và hình thang hội tụ nhanh hơn đầu mút.',
    },
  },

  MATH_QUADRIC_SURFACES: {
    family: 'SCENE_LAB',
    engine: 'MATH',
    title: 'Mặt bậc hai và dải Möbius',
    question: 'Các mặt cắt song song với mặt phẳng tọa độ của elipxoit, hypeboloit, paraboloit là những đường nào? Vì sao dải Möbius chỉ có một mặt?',
    keywords: /mat bac hai|elipxoit|ellipsoid|hypeboloit|paraboloit|dai mobius|mobius|mat non/,
    examples: ['mặt bậc hai', 'elipxoit hypeboloit paraboloit', 'dải Möbius'],
    data: {
      viewBox: [560, 340],
      choices: [{key: 's', label: 'Mặt', value: 'ellipsoid', options: Object.entries(SURFACES).map(([k, v]) => [k, v.label] as [string, string])}],
      sliders: [
        {key: 'az', label: 'Xoay quanh trục z', unit: '°', min: 0, max: 360, step: 5, value: 35},
        {key: 'el', label: 'Độ nghiêng nhìn', unit: '°', min: 5, max: 85, step: 5, value: 25},
      ],
      draw: (p, t, s) => {
        const S = SURFACES[s.s];
        const az = rad(p.az + t * 30);
        const el = rad(p.el);
        const proj = (v: number[]): [number, number] => {
          const x = v[0] * Math.cos(az) - v[1] * Math.sin(az);
          const y = v[0] * Math.sin(az) + v[1] * Math.cos(az);
          return [280 + 62 * x, 180 - 62 * (v[2] * Math.cos(el) - y * Math.sin(el))];
        };
        const out: Shape[] = [];
        const NU = 14;
        const NV = 28;
        for (let i = 0; i <= NU; i++) {
          const u = S.u[0] + ((S.u[1] - S.u[0]) * i) / NU;
          out.push(poly(Array.from({length: NV + 1}, (_, j) => proj(S.fn(u, S.v[0] + ((S.v[1] - S.v[0]) * j) / NV))), {stroke: C.blue, w: 1, close: false, o: 0.75}));
        }
        for (let j = 0; j <= NU; j++) {
          const v = S.v[0] + ((S.v[1] - S.v[0]) * j) / NU;
          out.push(poly(Array.from({length: NV + 1}, (_, i) => proj(S.fn(S.u[0] + ((S.u[1] - S.u[0]) * i) / NV, v))), {stroke: C.red, w: 1, close: false, o: 0.6}));
        }
        const o = proj([0, 0, 0]);
        for (const [v, n] of [[[3, 0, 0], 'x'], [[0, 3, 0], 'y'], [[0, 0, 2.4], 'z']] as [number[], string][]) {
          const q = proj(v);
          out.push(arrow(o[0], o[1], q[0], q[1], C.grey, 1.2), txt(q[0] + 8, q[1] + 4, n, {size: 11, fill: C.grey}));
        }
        return out;
      },
      time: {max: 12, loop: true, label: 'Tự xoay', unit: 's'},
      readouts: [{label: 'Phương trình chính tắc', value: (_p, _t, s) => SURFACES[s.s].eq}],
      note: 'Bấm Chạy để mặt tự xoay. Đường xanh và đỏ là hai họ đường tham số hóa mặt.',
    },
  },
};

const APPROX: Record<string, number> = {pi: Math.PI, sqrt2: Math.SQRT2, e: Math.E, third: 1 / 3, phi: (1 + Math.sqrt(5)) / 2};

interface LimSpec {
  f: (x: number) => number;
  x0: number;
  limit: number | null;
  text: string;
  cont: string;
  hole?: boolean;
}
const LIM: Record<string, LimSpec> = {
  hole: {f: (x) => (Math.abs(x - 1) < 1e-9 ? NaN : (x * x - 1) / (x - 1)), x0: 1, limit: 2, text: 'lim = 2', cont: 'Không: f(1) không xác định (lỗ thủng), có thể bổ sung f(1) = 2', hole: true},
  sinc: {f: (x) => (Math.abs(x) < 1e-9 ? NaN : Math.sin(x) / x), x0: 0, limit: 1, text: 'lim = 1', cont: 'Không xác định tại 0, bổ sung f(0) = 1 thì liên tục', hole: true},
  step: {f: (x) => (x === 0 ? NaN : x / Math.abs(x)), x0: 0, limit: null, text: 'không tồn tại (trái −1, phải +1)', cont: 'Không: gián đoạn (nhảy)'},
  inv: {f: (x) => (x === 0 ? NaN : 1 / (x * x)), x0: 0, limit: null, text: '+∞ (tiệm cận đứng x = 0)', cont: 'Không: gián đoạn vô cực'},
};
/** δ lớn nhất (≤ 2) sao cho |f(x) − L| < ε với 0 < |x − x₀| < δ, tìm bằng quét lưới. */
export function deltaFor(fn: string, eps: number): number {
  const L = LIM[fn];
  if (L.limit === null) return 0;
  let d = 0;
  for (let k = 1; k <= 2000; k++) {
    const t = k * 0.001;
    const ok = [-t, t].every((dx) => !Number.isFinite(L.f(L.x0 + dx)) || Math.abs(L.f(L.x0 + dx) - L.limit!) < eps);
    if (!ok) break;
    d = t;
  }
  return d;
}
export type {P};
