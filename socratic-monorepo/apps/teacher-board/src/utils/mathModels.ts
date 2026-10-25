// apps/teacher-board/src/utils/mathModels.ts
/**
 * Hai mô hình Toán (tài liệu nghiên cứu 7.6), tính toán thuần túy và nhận cú pháp viết tay:
 *  - MATH_STAT_BOXPLOT       : biểu đồ hộp–râu, tứ phân vị theo SGK GDPT 2018, giá trị ngoại lai
 *  - MATH_VARIATION_TABLE    : bảng biến thiên → đồ thị hàm số (nội suy đơn điệu qua các điểm cực trị)
 */

// ============================================================ Boxplot
const median = (a: number[]) => {
  const n = a.length;
  if (!n) return NaN;
  return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
};

export interface BoxStats {
  n: number;
  min: number;
  q1: number;
  q2: number;
  q3: number;
  max: number;
  iqr: number;
  lowFence: number;
  highFence: number;
  whiskerLow: number;
  whiskerHigh: number;
  outliers: number[];
  mean: number | null;
  sd: number | null;
}

/**
 * Tứ phân vị theo SGK Toán 11/12 (GDPT 2018): Q₂ là trung vị; Q₁ là trung vị nửa dưới, Q₃ là trung vị nửa trên;
 * khi n lẻ thì KHÔNG đưa trung vị vào hai nửa.
 */
export function quartiles(sorted: number[]): {q1: number; q2: number; q3: number} {
  const n = sorted.length;
  const q2 = median(sorted);
  const lower = sorted.slice(0, Math.floor(n / 2));
  const upper = sorted.slice(Math.ceil(n / 2));
  return {q1: median(lower.length ? lower : sorted), q2, q3: median(upper.length ? upper : sorted)};
}

export function boxStatsFromData(data: number[]): BoxStats | null {
  const d = data.filter(Number.isFinite).sort((a, b) => a - b);
  if (d.length < 2) return null;
  const {q1, q2, q3} = quartiles(d);
  const iqr = q3 - q1;
  const lowFence = q1 - 1.5 * iqr;
  const highFence = q3 + 1.5 * iqr;
  const inside = d.filter((v) => v >= lowFence && v <= highFence);
  const mean = d.reduce((s, v) => s + v, 0) / d.length;
  const sd = Math.sqrt(d.reduce((s, v) => s + (v - mean) ** 2, 0) / d.length);
  return {n: d.length, min: d[0], q1, q2, q3, max: d[d.length - 1], iqr, lowFence, highFence, whiskerLow: inside[0], whiskerHigh: inside[inside.length - 1], outliers: d.filter((v) => v < lowFence || v > highFence), mean, sd};
}

/** Từ năm số tóm tắt (Min, Q1, Q2, Q3, Max) — không có dữ liệu thô nên không tính được trung bình/độ lệch chuẩn. */
export function boxStatsFromSummary(min: number, q1: number, q2: number, q3: number, max: number): BoxStats {
  const iqr = q3 - q1;
  const lowFence = q1 - 1.5 * iqr;
  const highFence = q3 + 1.5 * iqr;
  return {n: 0, min, q1, q2, q3, max, iqr, lowFence, highFence, whiskerLow: Math.max(min, lowFence), whiskerHigh: Math.min(max, highFence), outliers: [min < lowFence ? min : NaN, max > highFence ? max : NaN].filter(Number.isFinite), mean: null, sd: null};
}

export type BoxInput = {kind: 'data'; data: number[]} | {kind: 'summary'; min: number; q1: number; q2: number; q3: number; max: number};

const toNum = (s: string) => parseFloat(s.replace(',', '.'));

/** Nhận "Min=2, Q1=5, Trung vị=8, Q3=12, Max=20" hoặc một dãy số liệu kèm từ khóa hộp/râu/tứ phân vị. */
export function parseBoxplot(text: string): BoxInput | null {
  const t = (text || '').replace(/Q\s*[_]?\s*\{?([123])\}?/gi, 'Q$1');
  const pick = (re: RegExp) => {
    const m = re.exec(t);
    return m ? toNum(m[1]) : NaN;
  };
  const num = '(-?\\d+(?:[.,]\\d+)?)';
  const min = pick(new RegExp(`(?:min|nhỏ nhất|gtnn)\\s*[=:]\\s*${num}`, 'i'));
  const q1 = pick(new RegExp(`Q1\\s*[=:]\\s*${num}`, 'i'));
  const q2 = pick(new RegExp(`(?:Q2|median|trung vị|tứ phân vị thứ hai)\\s*[=:]\\s*${num}`, 'i'));
  const q3 = pick(new RegExp(`Q3\\s*[=:]\\s*${num}`, 'i'));
  const max = pick(new RegExp(`(?:max|lớn nhất|gtln)\\s*[=:]\\s*${num}`, 'i'));
  if ([min, q1, q2, q3, max].every(Number.isFinite) && min <= q1 && q1 <= q2 && q2 <= q3 && q3 <= max) return {kind: 'summary', min, q1, q2, q3, max};
  if (/hộp|râu|box\s*-?\s*plot|boxplot|tứ phân vị|ngoại lai|mẫu số liệu|dữ liệu|số liệu/i.test(t)) {
    // bỏ phần chữ trước dấu ":" nếu có, rồi lấy mọi số
    const body = t.includes(':') ? t.slice(t.lastIndexOf(':') + 1) : t;
    const nums = (body.match(/-?\d+(?:[.,]\d+)?/g) || []).map(toNum).filter(Number.isFinite);
    if (nums.length >= 5) return {kind: 'data', data: nums};
  }
  return null;
}

// ============================================================ Bảng biến thiên → đồ thị
export interface CriticalPoint {
  x: number;
  y: number;
}
export interface VariationTable {
  /** các điểm tới hạn theo thứ tự tăng dần của x (x₁ < x₂ < …) */
  points: CriticalPoint[];
  /** hướng của hàm trên khoảng (−∞; x₁): 'up' = đồng biến (đi lên về phía x₁) */
  leftDir: 'up' | 'down';
}

export interface TableRows {
  xs: string[];
  signs: string[]; // dấu của y' trên từng khoảng, '+' hoặc '-'
  ys: string[]; // 'max'/'min' hoặc giá trị tại điểm tới hạn
  kinds: ('max' | 'min' | 'flat')[];
}

/** Dấu y' trên từng khoảng suy từ thứ tự giá trị y và hướng bên trái. */
export function signsOf(t: VariationTable): ('+' | '-')[] {
  const out: ('+' | '-')[] = [t.leftDir === 'up' ? '+' : '-'];
  for (let i = 0; i < t.points.length - 1; i++) out.push(t.points[i + 1].y > t.points[i].y ? '+' : '-');
  const last = out[out.length - 1];
  // phía phải: nếu điểm cuối là cực đại thì giảm, cực tiểu thì tăng
  out.push(last === '+' ? '-' : '+');
  return out;
}

export function kindsOf(t: VariationTable): ('max' | 'min' | 'flat')[] {
  const s = signsOf(t);
  return t.points.map((_, i) => (s[i] === '+' && s[i + 1] === '-' ? 'max' : s[i] === '-' && s[i + 1] === '+' ? 'min' : 'flat'));
}

/** Hợp lệ: x tăng thật sự, y liên tiếp khác nhau (để có cực trị xen kẽ). */
export function validateTable(t: VariationTable): string | null {
  if (t.points.length < 1) return 'Cần ít nhất một điểm cực trị.';
  for (let i = 1; i < t.points.length; i++) if (!(t.points[i].x > t.points[i - 1].x)) return 'Các điểm x phải tăng dần.';
  for (let i = 1; i < t.points.length; i++) if (t.points[i].y === t.points[i - 1].y) return 'Hai cực trị liên tiếp phải có giá trị khác nhau.';
  return null;
}

/** Nội suy Hermite khối đơn điệu: đi qua mọi điểm, y' = 0 tại các cực trị, đơn điệu trên từng khoảng. */
function hermite(x: number, a: CriticalPoint, b: CriticalPoint): number {
  const h = b.x - a.x;
  const t = (x - a.x) / h;
  const h00 = 2 * t ** 3 - 3 * t ** 2 + 1;
  const h01 = -2 * t ** 3 + 3 * t ** 2;
  return h00 * a.y + h01 * b.y; // đạo hàm bằng 0 ở hai đầu → chỉ còn hai hạng tử
}

/** Hàm số dựng từ bảng biến thiên. Hai nhánh ngoài là parabol cùng độ cong trung bình để đồ thị tiếp tục lên/xuống tự nhiên. */
export function functionFromTable(t: VariationTable): (x: number) => number {
  const P = t.points;
  const n = P.length;
  const span = n > 1 ? (P[n - 1].x - P[0].x) / (n - 1) : 2;
  const rise = n > 1 ? P.slice(1).reduce((s, p, i) => s + Math.abs(p.y - P[i].y), 0) / (n - 1) : 2;
  const curv = rise / Math.max(span * span, 1e-9) * 0.9;
  const kinds = kindsOf(t);
  return (x: number) => {
    if (x <= P[0].x) {
      const sign = kinds[0] === 'max' ? -1 : 1; // trái điểm đầu: cực đại → thấp hơn; cực tiểu → cao hơn
      return P[0].y + sign * curv * (P[0].x - x) ** 2;
    }
    if (x >= P[n - 1].x) {
      const sign = kinds[n - 1] === 'max' ? -1 : 1;
      return P[n - 1].y + sign * curv * (x - P[n - 1].x) ** 2;
    }
    let i = 0;
    while (i < n - 2 && x > P[i + 1].x) i++;
    return hermite(x, P[i], P[i + 1]);
  };
}

const BIG = /[+\-−]?\s*(?:∞|\\infty|inf|vô cực)/i;

/**
 * Nhận bảng biến thiên viết thành ba dòng:
 *   x | -∞ -1 1 +∞        y' | + 0 - 0 +        y | ↗ 3 ↘ -1 ↗   (dấu | hoặc : ngăn tên dòng)
 * Chỉ cần dòng x (các điểm hữu hạn) và dòng y (các giá trị tại điểm tới hạn); dòng y' dùng để xác định hướng bên trái nếu có.
 */
export function parseVariationTable(text: string): VariationTable | null {
  const rows = (text || '').split(/\n|;|\\\\/).map((r) => r.trim()).filter(Boolean);
  const sep = (r: string) => r.replace(/^\s*(?:y\s*['′]|y\s*\\prime|f\s*['′]|y|f|x)\s*(?:\(x\))?\s*[|:=]\s*/i, '');
  const find = (re: RegExp) => rows.find((r) => re.test(r));
  const rx = find(/^\s*x\s*[|:]/i);
  const rd = find(/^\s*(?:y|f)\s*(?:['′]|\\prime)\s*[|:]/i);
  const ry = find(/^\s*(?:y|f)\s*(?:\(x\))?\s*[|:]/i);
  const ryy = rows.find((r) => /^\s*(?:y|f)\s*(?:\(x\))?\s*[|:]/i.test(r) && !/['′]|\\prime/.test(r.split(/[|:]/)[0]));
  if (!rx || !(ryy ?? ry)) return null;
  const numsIn = (s: string) => (s.replace(new RegExp(BIG.source, 'gi'), ' ').replace(/[↗↘↑↓↗️↘️]/g, ' ').replace(/−/g, '-').match(/-?\d+(?:[.,]\d+)?/g) || []).map(toNum);
  const xs = numsIn(sep(rx));
  const ys = numsIn(sep((ryy ?? ry) as string));
  if (xs.length < 1 || ys.length !== xs.length) return null;
  let leftDir: 'up' | 'down';
  if (rd) {
    const first = sep(rd).replace(/\s/g, '').match(/[+\-−]/);
    leftDir = first && first[0] === '+' ? 'up' : 'down';
  } else {
    // suy từ y: điểm đầu là cực đại → trước đó đi lên; cực tiểu → đi xuống
    const second = ys[1];
    leftDir = second === undefined ? 'up' : ys[0] > second ? 'up' : 'down';
  }
  const table: VariationTable = {points: xs.map((x, i) => ({x, y: ys[i]})), leftDir};
  // nếu có dòng y' thì kiểm tra dấu khớp với thứ tự y; không khớp → bác bỏ (tránh dựng đồ thị sai)
  if (rd) {
    const given = (sep(rd).replace(/−/g, '-').match(/[+-]/g) || []) as ('+' | '-')[];
    const derived = signsOf(table);
    if (given.length === derived.length && given.some((g, i) => g !== derived[i])) return null;
  }
  return validateTable(table) ? null : table;
}

export const tableToRows = (t: VariationTable): TableRows => ({
  xs: ['−∞', ...t.points.map((p) => String(p.x)), '+∞'],
  signs: signsOf(t),
  ys: t.points.map((p) => String(p.y)),
  kinds: kindsOf(t),
});
