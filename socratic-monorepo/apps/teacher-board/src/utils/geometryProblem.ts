/**
 * Vẽ hình từ ĐỀ BÀI hình học (offline, không dùng AI): đọc đề tiếng Việt viết đầy đủ hoặc viết tóm tắt (GT/KL),
 * hiểu ký hiệu hình học (⊥ ∥ ∩ ≡ ∈ ∠ △), dựng tọa độ rồi chiếu xuống bảng.
 *
 * Hình hỗ trợ: tam giác (thường, vuông, cân, đều), hình vuông / chữ nhật / bình hành / thoi / thang,
 * hình chóp, tứ diện, lăng trụ, hình hộp, hình lập phương.
 * Điểm và đường phụ: trung điểm, điểm thuộc cạnh, trọng tâm, tâm đáy, hình chiếu (chân đường cao), giao của hai đường,
 * giao của đường với mặt phẳng, giao tuyến hai mặt phẳng, thiết diện, điểm trùng nhau, đoạn nối hai điểm.
 * Phần nào không hiểu được thì trả về trong `ignored` để người dùng biết, không bịa.
 */
import {add, cross, dot, len, mul, norm, sub, type V3} from './solids';
import {faceOnView, sliceSection, unfoldNet} from './netUnfold';

export interface DrawnFigure {
  title: string;
  dim: 2 | 3;
  verts: {x: number; y: number}[];
  labels: string[];
  edges: {a: number; b: number; hidden: boolean; aux: boolean}[];
  /** chỉ số đỉnh vẽ chấm (điểm phụ) */
  marks: number[];
  /** đa giác tô nhạt (thiết diện), chỉ số đỉnh theo thứ tự */
  polys: number[][];
  /** đường cong (đường tròn ngoại/nội tiếp…) đã chiếu xuống bảng, tọa độ cùng hệ với verts */
  curves: {pts: {x: number; y: number}[]; label: string; dashed?: boolean; own?: boolean}[];
  /** mặt của khối đã chiếu (khi bật tô màu): chỉ số đỉnh, màu, mặt nhìn thấy hay bị che */
  faces: {poly: number[]; color: string; visible: boolean}[];
}

/** bảng màu các mặt (tô nhạt, dễ phân biệt mặt nào là mặt nào) */
export const FACE_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

/** góc nhìn khởi đầu khi chuyển từ góc chuẩn SGK sang xoay tự do */
export const DEFAULT_ORBIT = {yaw: 0.6, pitch: 0.4};

export interface GeometryParse {
  figure: DrawnFigure | null;
  /** đề có điều kiện/điểm phụ cụ thể hay chỉ là tên hình (để không giành mất câu "hình chóp S.ABCD" trần) */
  isProblem: boolean;
  notes: string[];
  ignored: string[];
}

// ------------------------------------------------------------------ chuẩn hóa chữ
const KEYWORDS = [
  'hình chóp', 'hình lập phương', 'hình hộp chữ nhật', 'hình hộp', 'hình vuông', 'hình chữ nhật', 'hình bình hành', 'hình thoi', 'hình thang vuông',
  'hình thang cân', 'hình thang', 'tứ diện', 'lăng trụ', 'tam giác', 'chóp đều', 'đôi một', 'vuông góc', 'song song', 'trung điểm', 'trọng tâm',
  'đường cao', 'chiều cao', 'giao tuyến', 'giao điểm', 'thiết diện', 'hình chiếu', 'mặt phẳng', 'đường thẳng', 'đường chéo', 'cạnh', 'đáy', 'vuông', 'cân',
  'đều', 'tâm', 'thuộc', 'giao', 'trùng', 'là', 'tại', 'cắt', 'bằng', 'góc', 'giữa', 'qua', 'kẻ', 'nối', 'đoạn', 'lên', 'trên', 'với', 'của', 'và', 'đứng',
  'tính', 'cho', 'gọi', 'chân', 'đường tròn', 'đường kính', 'ngoại tiếp', 'nội tiếp', 'trực tâm', 'trung tuyến', 'phân giác', 'lần lượt', 'sao cho', 'hình nón', 'hình trụ', 'hình cầu', 'khối nón', 'khối trụ', 'khối cầu', 'mặt cầu', 'bán kính', 'đường sinh',
];
const KW_RE = new RegExp(`(?<!\\p{L})(?:${KEYWORDS.map((k) => k.replace(/ /g, '\\s+')).join('|')})(?!\\p{L})`, 'giu');

export function normalizeProblem(raw: string): string {
  let t = raw || '';
  t = t.replace(/[’′`´]/g, "'");
  t = t.replace(/\\sqrt\s*\{([^}]*)\}/g, '√($1)').replace(/\\frac\s*\{([^}]*)\}\s*\{([^}]*)\}/g, '(($1)/($2))');
  t = t.replace(/⊥|\\perp/g, ' vuông góc ').replace(/∥|\\parallel|\/\//g, ' song song ').replace(/∩|\\cap/g, ' giao ');
  t = t.replace(/≡|\\equiv/g, ' trùng ').replace(/∈|\\in(?![a-z])/g, ' thuộc ').replace(/∠|\\widehat|\\angle|\^/g, ' góc ');
  t = t.replace(/[△Δ∆]|\\triangle/g, ' tam giác ').replace(/[⇒⟹→⟶]/g, ';').replace(/°|\\circ|độ/g, '°');
  t = t.replace(/(?<!\p{L})(?:GT|KL|Giả thiết|Kết luận|Tóm tắt|Đề bài)\s*[:：]/giu, ';');
  t = t.replace(/([A-Z'])\s*\.\s*([A-Z])/g, '$1.$2');
  t = t.replace(KW_RE, (m) => m.toLowerCase().replace(/\s+/g, ' '));
  return t.replace(/[ \t]+/g, ' ');
}

// ------------------------------------------------------------------ biểu thức độ dài (a = 1)
export function evalLength(src: string): number | null {
  const s = src
    .replace(/\\sqrt\s*\{([^}]*)\}/g, 'sqrt($1)')
    .replace(/\s+/g, '')
    .replace(/√/g, 'sqrt')
    .replace(/[{}]/g, '')
    .replace(/,/g, '.')
    .replace(/sqrt(\d+(?:\.\d+)?)/g, 'sqrt($1)');
  let i = 0;
  const peek = () => s[i];
  const num = (): number | null => {
    const m = /^\d+(?:\.\d+)?/.exec(s.slice(i));
    if (!m) return null;
    i += m[0].length;
    return parseFloat(m[0]);
  };
  const factor = (): number | null => {
    if (peek() === '-') {
      i++;
      const f = factor();
      return f === null ? null : -f;
    }
    if (peek() === '(') {
      i++;
      const e = expr();
      if (peek() !== ')') return null;
      i++;
      return e;
    }
    if (s.startsWith('sqrt', i)) {
      i += 4;
      if (peek() !== '(') return null;
      i++;
      const e = expr();
      if (e === null || peek() !== ')' || e < 0) return null;
      i++;
      return Math.sqrt(e);
    }
    if (peek() === 'a') {
      i++;
      return 1;
    }
    return num();
  };
  const startsFactor = () => /[\d(a]/.test(peek() ?? '') || s.startsWith('sqrt', i);
  const term = (): number | null => {
    let v = factor();
    while (v !== null && i < s.length) {
      if (peek() === '*') {
        i++;
        const f = factor();
        v = f === null ? null : v * f;
      } else if (peek() === '/') {
        i++;
        const f = factor();
        v = f === null || f === 0 ? null : v / f;
      } else if (startsFactor()) {
        const f = factor(); // nhân ngầm: 2a, a√2
        v = f === null ? null : v * f;
      } else break;
    }
    return v;
  };
  function expr(): number | null {
    let v = term();
    while (v !== null && (peek() === '+' || peek() === '-')) {
      const op = s[i++];
      const t = term();
      v = t === null ? null : op === '+' ? v + t : v - t;
    }
    return v;
  }
  const r = expr();
  return r !== null && i === s.length && Number.isFinite(r) && r > 0 ? r : null;
}

// ------------------------------------------------------------------ tên điểm/đoạn
const PT = "[A-Z]'?";
const SEG = new RegExp(`^(${PT})(${PT})$`);
const segOf = (name: string): [string, string] | null => {
  const m = SEG.exec(name);
  return m ? [m[1], m[2]] : null;
};
const pointsIn = (s: string): string[] => s.match(/[A-Z]'?/g) ?? [];
const key2 = (a: string, b: string) => (a < b ? `${a}${b}` : `${b}${a}`);

// ------------------------------------------------------------------ hình đáy (hệ tọa độ phẳng, y hướng lên)
type BaseKind = 'tri' | 'tri_obtuse' | 'tri_right' | 'tri_iso' | 'tri_eq' | 'square' | 'rect' | 'para' | 'rhombus' | 'trap' | 'trap_right' | 'trap_iso';
interface BaseDesc {
  kind: BaseKind;
  at?: string;
}
type P2 = [number, number];

function describeBase(text: string, names: string[]): BaseDesc {
  const n = names.length;
  const nm = names.join('');
  const near = new RegExp(`(?:đáy\\s*(?:${nm})?|${nm}|tam giác\\s*${nm})\\s*(?:là|:)?\\s*(?:một\\s*)?(?:hình\\s*)?(vuông cân|vuông|chữ nhật|bình hành|thoi|thang vuông|thang cân|thang|tam giác đều|đều|cân)(?:\\s*tại\\s*(${PT}))?`).exec(text);
  const word = near?.[1] ?? '';
  const at = near?.[2];
  if (n === 4) {
    if (word.startsWith('vuông')) return {kind: 'square'};
    if (word === 'chữ nhật') return {kind: 'rect'};
    if (word === 'bình hành') return {kind: 'para'};
    if (word === 'thoi') return {kind: 'rhombus'};
    if (word === 'thang vuông') return {kind: 'trap_right'};
    if (word === 'thang cân') return {kind: 'trap_iso'};
    if (word === 'thang') return {kind: 'trap'};
    return {kind: /hình vuông/.test(text) ? 'square' : /hình chữ nhật/.test(text) ? 'rect' : 'para'};
  }
  if (word === 'tam giác đều' || word === 'đều') return {kind: 'tri_eq'};
  const r = new RegExp(`vuông\\s*(?:cân\\s*)?tại\\s*(${PT})`).exec(text);
  if (word.startsWith('vuông') || r) return {kind: 'tri_right', at: at ?? r?.[1] ?? names[0]};
  if (word === 'cân') return {kind: 'tri_iso', at: at ?? names[0]};
  const c = new RegExp(`cân\\s*tại\\s*(${PT})`).exec(text);
  if (c) return {kind: 'tri_iso', at: c[1]};
  if (/tam giác[^;,]*đều|đều/.test(text) && !/chóp đều|lăng trụ đều/.test(text)) return {kind: 'tri_eq'};
  return {kind: 'tri'};
}

/** Tọa độ phẳng của đa giác đáy theo loại, kích thước lấy từ L (độ dài các cạnh đã biết). */
function baseCoords(desc: BaseDesc, names: string[], L: (a: string, b: string) => number | undefined, side?: number, angleDeg?: number): Record<string, P2> {
  const out: Record<string, P2> = {};
  const [A, B, C, D] = names;
  if (names.length === 3) {
    if (desc.kind === 'tri_eq') {
      const s = side ?? L(A, B) ?? L(B, C) ?? L(A, C) ?? 1.6;
      out[A] = [0, 0];
      out[B] = [s, 0];
      out[C] = [s / 2, (s * Math.sqrt(3)) / 2];
      return out;
    }
    if (desc.kind === 'tri_right') {
      const r = desc.at && names.includes(desc.at) ? desc.at : A;
      const i = names.indexOf(r);
      const v1 = names[(i + 1) % 3];
      const v2 = names[(i + 2) % 3];
      let l1 = L(r, v1);
      let l2 = L(r, v2);
      const hyp = L(v1, v2);
      if (hyp !== undefined) {
        if (l1 !== undefined && l2 === undefined && hyp > l1) l2 = Math.sqrt(hyp * hyp - l1 * l1);
        if (l2 !== undefined && l1 === undefined && hyp > l2) l1 = Math.sqrt(hyp * hyp - l2 * l2);
      }
      if (side !== undefined) l1 = l2 = side;
      out[r] = [0, 0];
      out[v1] = [l1 ?? 1.6, 0];
      out[v2] = [0, l2 ?? (l1 ?? 1.6) * 0.75];
      return out;
    }
    if (desc.kind === 'tri_iso') {
      const apex = desc.at && names.includes(desc.at) ? desc.at : A;
      const i = names.indexOf(apex);
      const b1 = names[(i + 1) % 3];
      const b2 = names[(i + 2) % 3];
      const base = L(b1, b2) ?? 1.6;
      const eq = L(apex, b1) ?? L(apex, b2);
      const h = eq !== undefined && eq > base / 2 ? Math.sqrt(eq * eq - (base * base) / 4) : base * 0.85;
      out[b1] = [-base / 2, 0];
      out[b2] = [base / 2, 0];
      out[apex] = [0, h];
      return out;
    }
    if (desc.kind === 'tri_obtuse') {
      out[A] = [0, 0];
      out[B] = [2, 0];
      out[C] = [-0.6, 0.85];
      return out;
    }
    const ab = L(A, B);
    const bc = L(B, C);
    const ac = L(A, C);
    if (ab && bc && ac && ab + bc > ac && ab + ac > bc && bc + ac > ab) {
      out[A] = [0, 0];
      out[B] = [ab, 0];
      const cx = (ab * ab + ac * ac - bc * bc) / (2 * ab);
      out[C] = [cx, Math.sqrt(Math.max(0, ac * ac - cx * cx))];
      return out;
    }
    out[A] = [0, 0];
    out[B] = [ab ?? 2, 0];
    out[C] = [0.35 * (ab ?? 2), ac ? Math.sqrt(Math.max(0.1, ac * ac - (0.35 * (ab ?? 2)) ** 2)) : 1.4];
    return out;
  }
  if (names.length === 4) {
    const ab = side ?? L(A, B);
    const ad = side ?? L(A, D);
    const phi = ((angleDeg ?? 60) * Math.PI) / 180;
    switch (desc.kind) {
      case 'square': {
        const s = ab ?? ad ?? 1.6;
        Object.assign(out, {[A]: [0, 0], [B]: [s, 0], [C]: [s, s], [D]: [0, s]});
        return out;
      }
      case 'rect': {
        const w = ab ?? 2;
        const h = ad ?? w * 0.6;
        Object.assign(out, {[A]: [0, 0], [B]: [w, 0], [C]: [w, h], [D]: [0, h]});
        return out;
      }
      case 'rhombus': {
        const s = ab ?? ad ?? 1.6;
        Object.assign(out, {[A]: [0, 0], [B]: [s, 0], [D]: [s * Math.cos(phi), s * Math.sin(phi)], [C]: [s + s * Math.cos(phi), s * Math.sin(phi)]});
        return out;
      }
      case 'trap':
      case 'trap_right':
      case 'trap_iso': {
        const big = ab ?? 2.4;
        const small = L(C, D) ?? big * 0.5;
        const h = (L(A, D) && desc.kind === 'trap_right' ? L(A, D)! : undefined) ?? big * 0.5;
        const x0 = desc.kind === 'trap_right' ? 0 : (big - small) / 2;
        Object.assign(out, {[A]: [0, 0], [B]: [big, 0], [C]: [x0 + small, h], [D]: [x0, h]});
        return out;
      }
      default: {
        // hình bình hành
        const w = ab ?? 2;
        const s = ad ?? w * 0.55;
        const dx = s * Math.cos(phi) * (angleDeg ? 1 : 0.7);
        const dy = s * Math.sin(phi);
        Object.assign(out, {[A]: [0, 0], [B]: [w, 0], [D]: [dx, dy], [C]: [w + dx, dy]});
        return out;
      }
    }
  }
  // đa giác đều n đỉnh (n ≥ 5)
  const n = names.length;
  const R = (side ?? 1.6) / (2 * Math.sin(Math.PI / n));
  names.forEach((nme, i) => (out[nme] = [R * Math.cos(Math.PI / 2 + (2 * Math.PI * i) / n), R * Math.sin(Math.PI / 2 + (2 * Math.PI * i) / n)]));
  return out;
}

// ------------------------------------------------------------------ mô hình hình học
/** Điểm xác định theo điểm khác (kéo được / tự cập nhật khi điểm gốc đổi). */
export type GeoDef = {k: 'seg'; a: string; b: string; t: number} | {k: 'foot'; p: string; a: string; b: string};

/** Thiết diện cắt bởi mặt phẳng qua ba điểm: tính lại lúc vẽ nên theo kịp khi kéo điểm. */
export interface GeoSection {
  plane: string[];
  part: number;
}

export interface GeoCircle {
  center: V3;
  normal: V3;
  r: number;
  /** phần của đề đã thêm đường tròn này */
  part: number;
  label: string;
  /** 'sphere': đường viền của mặt cầu (hình tròn có tâm và bán kính bằng của cầu, không nằm trong một mặt phẳng cố định) */
  kind?: 'circle' | 'sphere';
  /** thuộc về chính khối (nón, trụ, cầu): vẽ cùng màu nét, không phải đường tròn thêm */
  own?: boolean;
  /** nửa xa người xem bị che: vẽ nét đứt (đường tròn đáy dưới của nón, trụ; xích đạo cầu) */
  hideBack?: boolean;
}

interface Model {
  pts: Map<string, V3>;
  order: string[];
  edges: [string, string][];
  aux: [string, string][];
  faces: string[][];
  marks: Set<string>;
  polys: string[][];
  merged: Map<string, string[]>; // tên gốc → các tên trùng cùng điểm
  /** phần của đề (0 = hình gốc, 1.. = các phần sau) đang được xử lý, và phần của từng điểm/đường/thiết diện */
  cur: number;
  ptPart: Map<string, number>;
  auxPart: number[];
  polyPart: number[];
  mergedPart: Map<string, number>;
  circles: GeoCircle[];
  sections: GeoSection[];
  defs: Map<string, GeoDef>;
  /** khung chiếu cố định theo hình gốc: thêm phần sau không làm hình dịch chuyển hay đổi tỉ lệ */
  view?: {k: number; bx: number; by: number};
  dim: 2 | 3;
  title: string;
  notes: string[];
  ignored: string[];
}

const near = (a: V3, b: V3) => len(sub(a, b)) < 1e-6;
const centroid = (ps: V3[]): V3 => mul(ps.reduce((s, p) => add(s, p), [0, 0, 0] as V3), 1 / Math.max(1, ps.length));

function baseTo3D(c: Record<string, P2>): Record<string, V3> {
  const o: Record<string, V3> = {};
  for (const [k, [x, y]] of Object.entries(c)) o[k] = [x, 0, -y];
  return o;
}

function lenTable(text: string): {get: (a: string, b: string) => number | undefined; all: number | undefined; angle?: number} {
  const m = new Map<string, number>();
  const re = /([A-Z]'?[A-Z]'?)\s*=\s*([^;,=<>]+?)(?=$|[;,]|\.(?:\s|$)|\s+(?:và|,)|\s+[A-Z]'?[A-Z]'?\s*=)/g;
  let r: RegExpExecArray | null;
  while ((r = re.exec(text))) {
    const sg = segOf(r[1]);
    const v = evalLength(r[2].replace(/\s*(?:đơn vị|cm|m)\b.*$/, ''));
    if (sg && v !== null && !/°/.test(r[2])) m.set(key2(sg[0], sg[1]), v);
  }
  const allM = /cạnh\s*(?:đáy\s*)?(?:bằng|=)?\s*([a0-9√][^;,\s]*(?:\s*[√/*]\s*[0-9a()]+)*)/.exec(text);
  const all = allM ? evalLength(allM[1]) ?? undefined : undefined;
  const ang = /góc\s*(?:[A-Z]{1,3}\s*)?(?:=|bằng)\s*(\d+(?:[.,]\d+)?)\s*°/.exec(text);
  return {get: (a, b) => m.get(key2(a, b)), all, angle: ang ? parseFloat(ang[1].replace(',', '.')) : undefined};
}

function buildFigure(text: string, notes: string[]): Model | null {
  const T = lenTable(text);
  const L = (a: string, b: string) => T.get(a, b);
  const model = (title: string, dim: 2 | 3): Model => ({pts: new Map(), order: [], edges: [], aux: [], faces: [], marks: new Set(), polys: [], merged: new Map(), cur: 0, ptPart: new Map(), auxPart: [], polyPart: [], mergedPart: new Map(), circles: [], sections: [], defs: new Map(), dim, title, notes, ignored: []});
  const put = (m: Model, name: string, p: V3) => {
    if (!m.pts.has(name)) m.order.push(name);
    m.pts.set(name, p);
    m.ptPart.set(name, 0);
  };
  const cycle = (names: string[]): [string, string][] => names.map((n, i) => [n, names[(i + 1) % names.length]]);

  // ---- hình nón, hình trụ, hình cầu (khối tròn xoay): dựng bằng điểm, đường sinh và các đường tròn
  const roundKind = /(?:hình|khối|mặt)\s*(nón|trụ|cầu)(?![\p{L}])/u.exec(text);
  if (roundKind) {
    const val = (re: RegExp): number | null => {
      const mm = re.exec(text);
      return mm ? evalLength(mm[1].replace(/[.,]+$/, '')) : null;
    };
    const NUM = '([\\d.,√a/()*+\\-]+)';
    const rr = val(new RegExp(`bán kính(?: đáy)?\\s*(?:[rR]\\s*)?=\\s*${NUM}`)) ?? val(new RegExp(`(?<![A-Za-z])[rR]\\s*=\\s*${NUM}`));
    const hh = val(new RegExp(`(?:chiều cao|đường cao)\\s*(?:[hH]\\s*)?=\\s*${NUM}`)) ?? val(new RegExp(`(?<![A-Za-z])h\\s*=\\s*${NUM}`));
    const ll = val(new RegExp(`đường sinh\\s*(?:[lL]\\s*)?=\\s*${NUM}`));
    const kind = roundKind[1];
    const mk = (title: string): Model => model(title, 3);
    const addPt = (m: Model, n: string, p: V3, mark = false) => {
      put(m, n, p);
      if (mark) m.marks.add(n);
    };
    const nameOf = (re: RegExp, dflt: string) => re.exec(text)?.[1] ?? dflt;
    if (kind === 'cầu') {
      const R = rr ?? 1;
      const O = nameOf(/(?:tâm|cầu)\s*(?:là\s*)?([A-Z]'?)(?![A-Za-z'])/u, 'O');
      const m = mk('Hình cầu');
      addPt(m, O, [0, 0, 0], true);
      addPt(m, 'A', [-R, 0, 0]);
      addPt(m, 'B', [R, 0, 0]);
      m.aux.push(['A', 'B']);
      m.auxPart.push(0);
      m.circles.push({center: [0, 0, 0], normal: [0, 1, 0], r: R, part: 0, label: 'mặt cầu', kind: 'sphere', own: true});
      m.circles.push({center: [0, 0, 0], normal: [0, 1, 0], r: R, part: 0, label: 'đường xích đạo', own: true, hideBack: true});
      m.notes.push(`mặt cầu tâm ${O}, bán kính ${+R.toFixed(3)}`);
      return m;
    }
    let r = rr ?? 1;
    let h = hh ?? 1.5;
    if (ll !== null) {
      if (rr !== null && hh === null) h = Math.sqrt(Math.max(1e-6, ll * ll - r * r));
      else if (hh !== null && rr === null) r = Math.sqrt(Math.max(1e-6, ll * ll - h * h));
      else if (rr === null && hh === null) {
        r = ll * 0.6;
        h = ll * 0.8;
      }
    }
    if (kind === 'nón') {
      const S = nameOf(/đỉnh\s*([A-Z]'?)(?![A-Za-z'])/u, 'S');
      const O = nameOf(/tâm(?: đáy)?\s*([A-Z]'?)(?![A-Za-z'])/u, 'O');
      const m = mk('Hình nón');
      addPt(m, S, [0, h, 0], true);
      addPt(m, O, [0, 0, 0], true);
      addPt(m, 'A', [-r, 0, 0]);
      addPt(m, 'B', [r, 0, 0]);
      m.edges.push([S, 'A'], [S, 'B']);
      m.aux.push([S, O], [O, 'B']);
      m.auxPart.push(0, 0);
      m.circles.push({center: [0, 0, 0], normal: [0, 1, 0], r, part: 0, label: 'đường tròn đáy', own: true, hideBack: true});
      m.notes.push(`hình nón đỉnh ${S}, bán kính đáy ${+r.toFixed(3)}, chiều cao ${+h.toFixed(3)}, đường sinh ${+Math.hypot(r, h).toFixed(3)}`);
      return m;
    }
    const O = nameOf(/tâm(?: đáy)?\s*([A-Z]'?)(?![A-Za-z'])/u, 'O');
    const O2 = `${O}'`;
    const m = mk('Hình trụ');
    addPt(m, O, [0, 0, 0], true);
    addPt(m, O2, [0, h, 0], true);
    addPt(m, 'A', [-r, 0, 0]);
    addPt(m, 'B', [r, 0, 0]);
    addPt(m, "A'", [-r, h, 0]);
    addPt(m, "B'", [r, h, 0]);
    m.edges.push(['A', "A'"], ['B', "B'"]);
    m.aux.push([O, O2], [O, 'B']);
    m.auxPart.push(0, 0);
    m.circles.push({center: [0, 0, 0], normal: [0, 1, 0], r, part: 0, label: 'đường tròn đáy', own: true, hideBack: true});
    m.circles.push({center: [0, h, 0], normal: [0, 1, 0], r, part: 0, label: 'đường tròn đáy trên', own: true});
    m.notes.push(`hình trụ bán kính ${+r.toFixed(3)}, chiều cao ${+h.toFixed(3)}`);
    return m;
  }

  // ---- hình lập phương / hình hộp
  const box =
    /(hình lập phương|hình hộp chữ nhật|hình hộp)\s*([A-Z]{4})\.([A-Z]'[A-Z]'[A-Z]'[A-Z]')/.exec(text) ??
    /(hình lập phương|hình hộp chữ nhật|hình hộp)\s*([A-Z]{4})\.([A-Z]{4})/.exec(text) ??
    (() => {
      const bare = /(?<![A-Za-z'.])([A-Z]{4})\.([A-Z]'[A-Z]'[A-Z]'[A-Z]')(?![A-Za-z'])/.exec(text);
      if (!bare) return null;
      const kind = /lập phương/.test(text) ? 'hình lập phương' : /chữ nhật/.test(text) ? 'hình hộp chữ nhật' : 'hình hộp';
      return [bare[0], kind, bare[1], bare[2]] as unknown as RegExpExecArray;
    })();
  if (box) {
    const base = pointsIn(box[2]);
    const top = pointsIn(box[3]).length === 4 ? pointsIn(box[3]) : base.map((n) => `${n}'`);
    const isCube = box[1] === 'hình lập phương';
    const isRect = isCube || box[1] === 'hình hộp chữ nhật';
    const side = T.all;
    const w = isCube ? side ?? 1.6 : L(base[0], base[1]) ?? side ?? 1.8;
    const d = isCube ? w : L(base[0], base[3]) ?? side ?? w * 0.7;
    const h = isCube ? w : L(base[0], top[0]) ?? side ?? w * 0.9;
    const m = model(`${box[1][0].toUpperCase()}${box[1].slice(1)} ${base.join('')}.${top.join('')}`, 3);
    const c = baseCoords({kind: isRect ? 'rect' : 'para'}, base, (a, b) => (key2(a, b) === key2(base[0], base[1]) ? w : key2(a, b) === key2(base[0], base[3]) ? d : undefined), undefined, T.angle);
    const c3 = baseTo3D(c);
    base.forEach((n, i) => {
      put(m, n, c3[n]);
      put(m, top[i], add(c3[n], isRect ? [0, h, 0] : [0.45 * w, h, -0.1 * w]));
    });
    m.edges.push(...cycle(base), ...cycle(top), ...base.map((n, i) => [n, top[i]] as [string, string]));
    m.faces.push(base, top, ...base.map((n, i) => [n, base[(i + 1) % 4], top[(i + 1) % 4], top[i]]));
    return m;
  }

  // ---- lăng trụ
  const pr = /lăng trụ[^A-Z]*([A-Z]{3,4})\.([A-Z]'(?:[A-Z]')+)/.exec(text) ?? (/(?<![A-Za-z'.])([A-Z]{3})\.([A-Z]'[A-Z]'[A-Z]')(?![A-Za-z'])/.exec(text) as RegExpExecArray | null);
  if (pr) {
    const base = pointsIn(pr[1]);
    const top = pointsIn(pr[2]);
    if (base.length === top.length && base.length >= 3) {
      const desc = describeBase(text, base);
      const c = baseCoords(desc, base, L, T.all, T.angle);
      const c3 = baseTo3D(c);
      const ext = Math.max(...Object.values(c).map((p) => Math.hypot(p[0], p[1])), 1);
      const h = L(base[0], top[0]) ?? (/chiều cao\s*(?:bằng|=)\s*([^;,]+)/.exec(text) ? evalLength(/chiều cao\s*(?:bằng|=)\s*([^;,]+)/.exec(text)![1]) ?? undefined : undefined) ?? ext * 1.1;
      const upright = /lăng trụ\s*(?:tam giác\s*|tứ giác\s*)?(?:đứng|đều)|vuông góc\s*(?:với\s*)?(?:\(?\s*[A-Z]{3,4}\s*\)?|đáy)/.test(text) || /đều/.test(text);
      const m = model(`Lăng trụ ${base.join('')}.${top.join('')}`, 3);
      base.forEach((n, i) => {
        put(m, n, c3[n]);
        put(m, top[i], add(c3[n], upright ? [0, h, 0] : [0.5, h, -0.2]));
      });
      m.edges.push(...cycle(base), ...cycle(top), ...base.map((n, i) => [n, top[i]] as [string, string]));
      m.faces.push(base, top, ...base.map((n, i) => [n, base[(i + 1) % base.length], top[(i + 1) % base.length], top[i]]));
      return m;
    }
  }

  // ---- hình chóp / tứ diện
  const py = /hình chóp[^A-Z.]*([A-Z]'?)\.([A-Z]'?(?:[A-Z]'?){2,5})/.exec(text) ?? (/(?<![A-Za-z'.])([A-Z])\.([A-Z]{3,5})(?![A-Za-z'.])/.exec(text) as RegExpExecArray | null);
  const td = /tứ diện\s*(?:đều\s*)?([A-Z]{4})/.exec(text);
  if (py || td) {
    let apex: string;
    let base: string[];
    if (py) {
      apex = py[1];
      base = pointsIn(py[2]);
    } else {
      const ns = pointsIn(td![1]);
      apex = ns[0];
      base = ns.slice(1);
    }
    const orth = /đôi một vuông góc/.test(text) && base.length === 3;
    const regularTetra = !!td && /đều/.test(text.slice(td.index, td.index + 20) + (/tứ diện đều/.test(text) ? 'đều' : ''));
    const m = model(py ? `Hình chóp ${apex}.${base.join('')}` : `Tứ diện ${apex}${base.join('')}`, 3);
    if (orth) {
      const la = L(apex, base[0]) ?? 1.6;
      const lb = L(apex, base[1]) ?? 1.3;
      const lc = L(apex, base[2]) ?? 1.6;
      put(m, apex, [0, 0, 0]);
      put(m, base[0], [la, 0, 0]);
      put(m, base[1], [0, 0, -lb]);
      put(m, base[2], [0, lc, 0]);
      m.edges.push(...base.map((n) => [apex, n] as [string, string]), ...cycle(base));
      m.faces.push(...cycle(base).map(([p, q]) => [apex, p, q]), base);
      return m;
    }
    const desc = regularTetra || (py && /chóp\s*(?:tam giác\s*|tứ giác\s*)?đều/.test(text) && base.length === 3) ? {kind: 'tri_eq' as BaseKind} : describeBase(text, base);
    const c = baseCoords(desc, base, L, T.all, T.angle);
    const c3 = baseTo3D(c);
    base.forEach((n) => put(m, n, c3[n]));
    const cen = centroid(base.map((n) => c3[n]));
    const baseSize = Math.max(...base.map((n) => len(sub(c3[n], cen))), 1);

    // chân đường cao
    let foot: V3 = cen;
    const perp = [...text.matchAll(/([A-Z]'?[A-Z]'?)\s*vuông góc\s*(?:với\s*)?(?:mặt phẳng\s*)?(\(?\s*(?:đáy|[A-Z]{3,5})\s*\)?|[A-Z]'?[A-Z]'?)?/g)];
    const sTo = (nm: string): string | null => {
      const sg = segOf(nm);
      return sg && sg[0] === apex && base.includes(sg[1]) ? sg[1] : sg && sg[1] === apex && base.includes(sg[0]) ? sg[0] : null;
    };
    let hit: string | null = null;
    const toBaseLines = new Set<string>();
    for (const p of perp) {
      const v = sTo(p[1]);
      if (!v) continue;
      const tgt = (p[2] ?? '').replace(/[()\s]/g, '');
      if (tgt === 'đáy' || (tgt.length >= 3 && base.every((b) => tgt.includes(b[0])) )) hit = v;
      else if (tgt.length === 2 && tgt.includes(v)) toBaseLines.add(v);
    }
    for (const v of toBaseLines) {
      // SA ⊥ AB và SA ⊥ AD: cạnh vuông với hai cạnh đáy đi qua A
      const cnt = [...text.matchAll(new RegExp(`${apex}${v}\\s*vuông góc\\s*(?:với\\s*)?[A-Z]'?[A-Z]'?`, 'g'))].length;
      if (cnt >= 2) hit = v;
    }
    const proj = /hình chiếu(?:\s*vuông góc)?\s*của\s*([A-Z]'?)\s*(?:lên|trên|xuống)\s*(?:mặt phẳng\s*)?(?:\(?\s*[A-Z]{3,5}\s*\)?|đáy)\s*(?:là|trùng với)\s*(?:trung điểm\s*(?:của\s*)?([A-Z]'?[A-Z]'?)|trọng tâm\s*(?:tam giác\s*)?([A-Z]{3})|tâm|([A-Z]'?))/.exec(text);
    if (hit) {
      foot = c3[hit];
      notes.push(`${apex}${hit} vuông góc với đáy`);
    } else if (proj && proj[1] === apex) {
      if (proj[2]) {
        const sg = segOf(proj[2]);
        if (sg && c3[sg[0]] && c3[sg[1]]) foot = mul(add(c3[sg[0]], c3[sg[1]]), 0.5);
      } else if (proj[3]) {
        foot = centroid(pointsIn(proj[3]).map((n) => c3[n]).filter(Boolean));
      } else if (proj[4] && c3[proj[4]]) foot = c3[proj[4]];
    }

    // chiều cao
    let h: number | undefined;
    const hm = /(?:chiều cao|đường cao)\s*(?:[A-Z]{2}\s*)?(?:bằng|=)\s*([^;,]+)/.exec(text);
    if (hm) h = evalLength(hm[1]) ?? undefined;
    if (h === undefined) {
      for (const n of base) {
        const l = L(apex, n);
        if (l !== undefined) {
          const dd = len(sub(foot, c3[n]));
          if (l > dd + 1e-6) {
            h = Math.sqrt(l * l - dd * dd);
            break;
          }
        }
      }
    }
    if (h === undefined) {
      const ang = /góc giữa\s*(?:cạnh\s*|đường thẳng\s*)?([A-Z]'?[A-Z]'?)\s*và\s*(?:mặt phẳng\s*)?(?:đáy|\(?[A-Z]{3,5}\)?)\s*(?:bằng|=)\s*(\d+(?:[.,]\d+)?)\s*°/.exec(text);
      const sg = ang ? segOf(ang[1]) : null;
      const v = sg ? (sg[0] === apex ? sg[1] : sg[1] === apex ? sg[0] : null) : null;
      if (ang && v && c3[v]) h = Math.tan((parseFloat(ang[2].replace(',', '.')) * Math.PI) / 180) * len(sub(foot, c3[v]));
    }
    if (regularTetra && h === undefined) h = Math.sqrt(2 / 3) * (T.all ?? L(base[0], base[1]) ?? 1.6);
    const hh = Math.min(Math.max(h ?? baseSize * 1.35, 0.3), baseSize * 4);
    put(m, apex, add(foot, [0, hh, 0]));
    m.edges.push(...cycle(base), ...base.map((n) => [apex, n] as [string, string]));
    m.faces.push(base, ...cycle(base).map(([p, q]) => [apex, p, q]));
    return m;
  }

  // ---- tam giác / tứ giác phẳng
  const quad = /(hình vuông|hình chữ nhật|hình bình hành|hình thoi|hình thang(?: vuông| cân)?)\s*([A-Z]{4})/.exec(text);
  const tri = /tam giác\s*(?:nhọn|tù|thường|bất kỳ|đều|cân|vuông cân|vuông)?\s*([A-Z]{3})(?![A-Z])/.exec(text);
  if (quad || tri) {
    const names = pointsIn(quad ? quad[2] : tri![1]);
    const desc: BaseDesc = quad
      ? {kind: ({'hình vuông': 'square', 'hình chữ nhật': 'rect', 'hình bình hành': 'para', 'hình thoi': 'rhombus', 'hình thang': 'trap', 'hình thang vuông': 'trap_right', 'hình thang cân': 'trap_iso'} as Record<string, BaseKind>)[quad[1]]}
      : /tam giác\s*tù/.test(text)
        ? {kind: 'tri_obtuse'}
        : describeBase(text, names);
    const c = baseCoords(desc, names, L, T.all, T.angle);
    const m = model(quad ? `${quad[1][0].toUpperCase()}${quad[1].slice(1)} ${names.join('')}` : `Tam giác ${names.join('')}`, 2);
    names.forEach((n) => put(m, n, [c[n][0], c[n][1], 0]));
    m.edges.push(...cycle(names));
    return m;
  }
  return null;
}

// ------------------------------------------------------------------ điểm phụ, đường phụ
const lineIntersect = (p1: V3, p2: V3, p3: V3, p4: V3): V3 | null => {
  const d1 = sub(p2, p1);
  const d2 = sub(p4, p3);
  const n = cross(d1, d2);
  const nn = dot(n, n);
  if (nn < 1e-12) return null;
  const w = sub(p3, p1);
  if (Math.abs(dot(w, n)) > 1e-6 * Math.sqrt(nn) * Math.max(1, len(w))) return null; // chéo nhau
  const t = dot(cross(w, d2), n) / nn;
  return add(p1, mul(d1, t));
};
const planeOf = (a: V3, b: V3, c: V3): {n: V3; d: number} | null => {
  const n = cross(sub(b, a), sub(c, a));
  const l = len(n);
  if (l < 1e-9) return null;
  const nn = mul(n, 1 / l);
  return {n: nn, d: dot(nn, a)};
};
const footOnLine = (p: V3, a: V3, b: V3): V3 => {
  const d = sub(b, a);
  return add(a, mul(d, dot(sub(p, a), d) / dot(d, d)));
};
const footOnPlane = (p: V3, pl: {n: V3; d: number}): V3 => sub(p, mul(pl.n, dot(pl.n, p) - pl.d));

/**
 * "Gọi M, N lần lượt là trung điểm của AB và CC'" → "M là trung điểm AB; N là trung điểm CC'"
 * ", sao cho" được gộp vào câu trước (không bị tách ở dấu phẩy).
 */
export function expandRespectively(text: string): string {
  const t = text.replace(/,\s*(?=sao cho)/g, ' ');
  const re = /((?:[A-Z]'?\s*(?:,|và)\s*)+[A-Z]'?)\s*lần lượt\s*(là|thuộc)\s*(trung điểm|trọng tâm|các cạnh|cạnh|đoạn thẳng|đoạn)?\s*(?:của\s*)?([^;.\n]*)/gu;
  return t.replace(re, (whole, namesRaw: string, rel: string, what: string | undefined, rest: string) => {
    const names = namesRaw.match(/[A-Z]'?/g) ?? [];
    const objs = rest.split(/\s*(?:,|và)\s*/).map((s) => s.trim()).filter(Boolean);
    if (names.length < 2 || objs.length !== names.length) return whole;
    const relation = rel === 'thuộc' ? 'thuộc' : what === 'trọng tâm' ? 'là trọng tâm' : 'là trung điểm';
    return names.map((n, i) => `${n} ${relation} ${objs[i]}`).join('; ');
  });
}

/** Vị trí t ∈ (0,1) của điểm M trên đoạn XY (từ X) theo "sao cho SM = 2MA", "AM = 2/3 AB"…; null nếu không có/không hiểu. */
export function ratioOnSegment(clause: string, X: string, Y: string, M: string): number | null {
  const mm = /sao cho\s*([A-Z]'?[A-Z]'?)\s*=\s*(\(?\s*\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?\s*\)?)?\s*\*?\s*([A-Z]'?[A-Z]'?)/.exec(clause);
  if (!mm) return null;
  let c = 1;
  if (mm[2]) {
    const raw = mm[2].replace(/[()\s]/g, '').replace(/,/g, '.');
    const parts = raw.split('/').map(parseFloat);
    c = parts.length === 2 ? parts[0] / parts[1] : parts[0];
  }
  if (!(c > 0) || !Number.isFinite(c)) return null;
  const kind = (tok: string): 'whole' | 'p1' | 'p2' | null => {
    const ns = pointsIn(tok);
    if (ns.length !== 2) return null;
    const has2 = (a: string, b: string) => (ns[0] === a && ns[1] === b) || (ns[0] === b && ns[1] === a);
    if (has2(X, Y)) return 'whole';
    if (has2(X, M)) return 'p1';
    if (has2(M, Y)) return 'p2';
    return null;
  };
  const L = kind(mm[1]);
  const R = kind(mm[3]);
  if (!L || !R || L === R) return null;
  let t: number | null = null;
  if (R === 'whole') t = L === 'p1' ? c : 1 - c;
  else if (L === 'whole') t = R === 'p1' ? 1 / c : 1 - 1 / c;
  else if (L === 'p1' && R === 'p2') t = c / (1 + c);
  else if (L === 'p2' && R === 'p1') t = 1 / (1 + c);
  return t !== null && t > 0.01 && t < 0.99 ? t : null;
}

/** Các giao điểm của mặt phẳng qua ba điểm `plane` với các cạnh, đã sắp theo vòng quanh tâm; null nếu không cắt thành đa giác. */
export function sectionHits(edges: [string, string][], P: (n: string) => V3 | undefined, plane: string[]): V3[] | null {
  const [a, b, c] = plane.slice(0, 3).map(P);
  if (!a || !b || !c) return null;
  const pl = planeOf(a, b, c);
  if (!pl) return null;
  const hits: V3[] = [];
  const push = (p: V3) => {
    if (!hits.some((q) => near(p, q))) hits.push(p);
  };
  for (const [u, v] of edges) {
    const pu = P(u);
    const pv2 = P(v);
    if (!pu || !pv2) continue;
    const du = dot(pl.n, pu) - pl.d;
    const dv = dot(pl.n, pv2) - pl.d;
    if (Math.abs(du) < 1e-7) push(pu);
    if (Math.abs(dv) < 1e-7) push(pv2);
    if (du * dv < -1e-12) push(add(pu, mul(sub(pv2, pu), du / (du - dv))));
  }
  if (hits.length < 3) return null;
  const cen = centroid(hits);
  const e1 = norm(sub(hits[0], cen));
  const e2 = cross(pl.n, e1);
  return hits.sort((p, q) => Math.atan2(dot(sub(p, cen), e2), dot(sub(p, cen), e1)) - Math.atan2(dot(sub(q, cen), e2), dot(sub(q, cen), e1)));
}

function addExtras(m: Model, text0: string): void {
  // câu mới bắt đầu bằng chữ hoa ngay sau dấu chấm ("…CC'.Tìm giao điểm…") phải tách câu; "S.ABCD" (chữ hoa liền chữ hoa) thì giữ nguyên
  const text = expandRespectively(text0.replace(/([A-Za-z0-9')])\.([A-ZĐ][a-zà-ỹ])/g, '$1; $2'));
  const P = (n: string) => m.pts.get(n);
  const has = (n: string) => m.pts.has(n);
  const clauses = text.split(/[;\n]|,(?!\d)|\.(?![A-Z]|\d)|\s+và\s+/).map((s) => s.trim()).filter(Boolean);
  const addAux = (a: string, b: string) => {
    if (a === b || !has(a) || !has(b)) return;
    const k = key2(a, b);
    if (m.edges.some(([p, q]) => key2(p, q) === k) || m.aux.some(([p, q]) => key2(p, q) === k)) return;
    m.aux.push([a, b]);
    m.auxPart.push(m.cur);
  };
  const define = (name: string, p: V3, note: string) => {
    if (has(name)) return;
    for (const [other, q] of m.pts) {
      if (near(p, q)) {
        m.merged.set(other, [...(m.merged.get(other) ?? []), name]);
        m.mergedPart.set(name, m.cur);
        m.notes.push(`${name} trùng ${other}`);
        return;
      }
    }
    m.pts.set(name, p);
    m.order.push(name);
    m.marks.add(name);
    m.ptPart.set(name, m.cur);
    m.notes.push(note);
  };

  for (let pass = 0; pass < 2; pass++) {
    for (const c of clauses) {
      let r: RegExpExecArray | null;
      // trung điểm
      if ((r = /([A-Z]'?)\s*là\s*trung điểm\s*(?:của\s*|cạnh\s*|đoạn(?: thẳng)?\s*)?([A-Z]'?[A-Z]'?)/.exec(c))) {
        const s = segOf(r[2]);
        if (s && P(s[0]) && P(s[1])) {
          const fresh = !has(r[1]);
          define(r[1], mul(add(P(s[0])!, P(s[1])!), 0.5), `${r[1]} là trung điểm ${r[2]}`);
          if (fresh && has(r[1])) m.defs.set(r[1], {k: 'seg', a: s[0], b: s[1], t: 0.5});
          continue;
        }
      }
      // trọng tâm
      if ((r = /([A-Z]'?)\s*là\s*trọng tâm\s*(?:của\s*)?(?:tam giác\s*)?((?:[A-Z]'?){3})/.exec(c))) {
        const ps = pointsIn(r[2]).map((n) => P(n));
        if (ps.every(Boolean)) {
          define(r[1], centroid(ps as V3[]), `${r[1]} là trọng tâm tam giác ${r[2]}`);
          continue;
        }
      }
      // tâm đáy / giao điểm hai đường chéo
      if ((r = /([A-Z]'?)\s*là\s*(?:tâm|giao điểm(?: của)?\s*(?:hai\s*)?đường chéo)/.exec(c)) && /(?:đáy|đường chéo|hình (?:vuông|chữ nhật|bình hành|thoi)|[A-Z]{4})/.test(c)) {
        const quadNames = pointsIn((/(?:hình [a-zA-Zà-ỹ ]+|đáy)\s*([A-Z]{4})/.exec(c) ?? [])[1] ?? '');
        const baseNames = quadNames.length === 4 ? quadNames : m.faces[0]?.length === 4 ? m.faces[0] : m.order.slice(0, 4);
        if (baseNames.length === 4 && baseNames.every(has)) {
          define(r[1], mul(add(P(baseNames[0])!, P(baseNames[2])!), 0.5), `${r[1]} là tâm ${baseNames.join('')}`);
          addAux(baseNames[0], baseNames[2]);
          addAux(baseNames[1], baseNames[3]);
          continue;
        }
      }
      // điểm thuộc cạnh
      if ((r = /([A-Z]'?)\s*thuộc\s*(?:cạnh\s*|đoạn(?: thẳng)?\s*)?([A-Z]'?[A-Z]'?)/.exec(c)) && !has(r[1]) && !new RegExp(`[A-Z]'?${r[1]}\\s*vuông góc`).test(c)) {
        const s = segOf(r[2]);
        if (s && P(s[0]) && P(s[1])) {
          const tt = ratioOnSegment(c, s[0], s[1], r[1]) ?? 1 / 3;
          const fresh2 = !has(r[1]);
          if (fresh2) m.defs.set(r[1], {k: 'seg', a: s[0], b: s[1], t: tt});
          define(r[1], add(P(s[0])!, mul(sub(P(s[1])!, P(s[0])!), tt)), `${r[1]} thuộc ${r[2]}${tt !== 1 / 3 ? ` (tỉ lệ ${+tt.toFixed(3)})` : ''}`);
          if (!has(r[1])) m.defs.delete(r[1]);
          continue;
        }
      }
      // hình chiếu / chân đường cao
      if ((r = /([A-Z]'?)\s*là\s*(?:hình chiếu(?: vuông góc)?|chân đường cao)\s*(?:của\s*|kẻ từ\s*)([A-Z]'?)\s*(?:lên|trên|xuống)\s*(?:đường thẳng\s*|mặt phẳng\s*)?\(?\s*([A-Z]'?[A-Z]'?(?:[A-Z]'?)*)\s*\)?/.exec(c))) {
        const tgt = pointsIn(r[3]);
        const src = P(r[2]);
        if (src && tgt.length === 2 && P(tgt[0]) && P(tgt[1])) {
          define(r[1], footOnLine(src, P(tgt[0])!, P(tgt[1])!), `${r[1]} là hình chiếu của ${r[2]} lên ${tgt.join('')}`);
          addAux(r[2], r[1]);
          continue;
        }
        if (src && tgt.length >= 3 && tgt.every(has)) {
          const pl = planeOf(P(tgt[0])!, P(tgt[1])!, P(tgt[2])!);
          if (pl) {
            define(r[1], footOnPlane(src, pl), `${r[1]} là hình chiếu của ${r[2]} lên (${tgt.join('')})`);
            addAux(r[2], r[1]);
            continue;
          }
        }
      }
      // AH vuông góc BC (H chưa có): chân đường vuông góc
      if ((r = /([A-Z]'?)([A-Z]'?)\s*vuông góc\s*(?:với\s*)?([A-Z]'?)([A-Z]'?)(?![A-Z'])/.exec(c))) {
        const [a, h, b, d] = [r[1], r[2], r[3], r[4]];
        if (has(a) && !has(h) && P(b) && P(d)) {
          define(h, footOnLine(P(a)!, P(b)!, P(d)!), `${a}${h} vuông góc ${b}${d} tại ${h}`);
          addAux(a, h);
          continue;
        }
      }
      // đường cao AH
      if ((r = /đường cao\s*([A-Z]'?)([A-Z]'?)/.exec(c)) && has(r[1]) && !has(r[2])) {
        const tri = m.faces.length === 0 && m.order.length === 3 ? m.order : null;
        if (tri) {
          const opp = tri.filter((n) => n !== r![1]);
          define(r[2], footOnLine(P(r[1])!, P(opp[0])!, P(opp[1])!), `đường cao ${r[1]}${r[2]}`);
          addAux(r[1], r[2]);
          continue;
        }
      }
      // giao của hai đường: "AC giao BD = O", "giao điểm của AC và BD là O"
      const rev = /(?<![A-Za-z'])([A-Z]'?)\s*=\s*\{?\s*([A-Z]'?[A-Z]'?)\s*giao\s*([A-Z]'?[A-Z]'?)(?![A-Za-z'])/.exec(c);
      const gi: RegExpExecArray | null = rev
        ? ([rev[0], rev[2], rev[3], rev[1]] as unknown as RegExpExecArray)
        : /([A-Z]'?[A-Z]'?)\s*giao\s*([A-Z]'?[A-Z]'?)\s*(?:=|tại|là)\s*\{?\s*([A-Z]'?)\s*\}?/.exec(c) ?? /giao điểm\s*(?:của\s*)?([A-Z]'?[A-Z]'?)\s*(?:và|với)\s*([A-Z]'?[A-Z]'?)\s*(?:là|tại|=)\s*([A-Z]'?)/.exec(c);
      if (gi) {
        const s1 = segOf(gi[1]);
        const s2 = segOf(gi[2]);
        if (s1 && s2 && [s1[0], s1[1], s2[0], s2[1]].every(has)) {
          const X = lineIntersect(P(s1[0])!, P(s1[1])!, P(s2[0])!, P(s2[1])!);
          if (X) {
            define(gi[3], X, `${gi[3]} là giao điểm ${gi[1]} và ${gi[2]}`);
            for (const [u, v] of [s1, s2]) {
              const t = dot(sub(X, P(u)!), sub(P(v)!, P(u)!)) / dot(sub(P(v)!, P(u)!), sub(P(v)!, P(u)!));
              if (t >= -1e-6 && t <= 1 + 1e-6) {
                addAux(u, gi[3]);
                addAux(gi[3], v);
              } else addAux(t < 0 ? u : v, gi[3]);
            }
            continue;
          }
          m.ignored.push(`${gi[1]} và ${gi[2]} chéo nhau, không có giao điểm`);
          continue;
        }
      }
      // đường thẳng giao mặt phẳng: "MN giao (ABCD) = K"
      const lp = /([A-Z]'?[A-Z]'?)\s*giao\s*\(\s*([A-Z]{3,5})\s*\)\s*(?:=|tại|là)\s*\{?\s*([A-Z]'?)\s*\}?/.exec(c);
      if (lp) {
        const s1 = segOf(lp[1]);
        const pn = pointsIn(lp[2]);
        if (s1 && has(s1[0]) && has(s1[1]) && pn.length >= 3 && pn.every(has)) {
          const pl = planeOf(P(pn[0])!, P(pn[1])!, P(pn[2])!);
          const d = sub(P(s1[1])!, P(s1[0])!);
          const den = pl ? dot(pl.n, d) : 0;
          if (pl && Math.abs(den) > 1e-9) {
            const t = (pl.d - dot(pl.n, P(s1[0])!)) / den;
            const X = add(P(s1[0])!, mul(d, t));
            define(lp[3], X, `${lp[3]} là giao của ${lp[1]} với (${lp[2]})`);
            addAux(t < 0 ? s1[0] : s1[1], lp[3]);
            addAux(s1[0], s1[1]);
            continue;
          }
        }
      }
      // "tìm giao điểm của MN với mặt phẳng (A'B'C'D')" (không cho tên: tự đặt)
      const lp2 = /giao điểm\s*(?:của\s*)?(?:đường thẳng\s*)?([A-Z]'?[A-Z]'?)\s*(?:và|với)\s*(?:mặt phẳng\s*)?\(\s*((?:[A-Z]'?){3,5})\s*\)(?:\s*(?:là|tại|=)\s*([A-Z]'?))?/.exec(c);
      if (lp2) {
        const s1 = segOf(lp2[1]);
        const pn = pointsIn(lp2[2]);
        const nm = lp2[3] ?? ['K', 'I', 'J', 'H', 'L', 'E', 'F', 'G', 'Q', 'R'].find((x) => !has(x) && !(m.merged.get(x) ?? []).length && ![...m.merged.values()].some((al) => al.includes(x)));
        if (s1 && nm && !has(nm) && has(s1[0]) && has(s1[1]) && pn.length >= 3 && pn.every(has)) {
          const pl = planeOf(P(pn[0])!, P(pn[1])!, P(pn[2])!);
          const d = sub(P(s1[1])!, P(s1[0])!);
          const den = pl ? dot(pl.n, d) : 0;
          if (pl && Math.abs(den) > 1e-9) {
            const t = (pl.d - dot(pl.n, P(s1[0])!)) / den;
            define(nm, add(P(s1[0])!, mul(d, t)), `${nm} là giao của ${lp2[1]} với (${lp2[2]})`);
            addAux(t < 0 ? s1[0] : s1[1], nm);
            addAux(s1[0], s1[1]);
            continue;
          }
          m.ignored.push(`${lp2[1]} song song với (${lp2[2]}), không có giao điểm`);
          continue;
        }
      }
      // qua M kẻ đường thẳng song song AB cắt XY tại N
      const pa = /qua\s*([A-Z]'?)\s*(?:kẻ|vẽ|dựng)?\s*(?:đường thẳng\s*)?song song\s*(?:với\s*)?([A-Z]'?[A-Z]'?)\s*cắt\s*([A-Z]'?[A-Z]'?)\s*tại\s*([A-Z]'?)/.exec(c);
      if (pa) {
        const sa = segOf(pa[2]);
        const sb = segOf(pa[3]);
        if (sa && sb && has(pa[1]) && [sa[0], sa[1], sb[0], sb[1]].every(has)) {
          const dir = sub(P(sa[1])!, P(sa[0])!);
          const X = lineIntersect(P(pa[1])!, add(P(pa[1])!, dir), P(sb[0])!, P(sb[1])!);
          if (X) {
            define(pa[4], X, `${pa[4]} thuộc ${pa[3]}, ${pa[1]}${pa[4]} song song ${pa[2]}`);
            addAux(pa[1], pa[4]);
            continue;
          }
        }
      }
      // trùng nhau: "M trùng N", "M ≡ N"
      if ((r = /([A-Z]'?)\s*trùng\s*(?:với\s*)?([A-Z]'?)(?![A-Z'])/.exec(c))) {
        if (has(r[2]) && !has(r[1])) {
          m.merged.set(r[2], [...(m.merged.get(r[2]) ?? []), r[1]]);
          m.mergedPart.set(r[1], m.cur);
          m.notes.push(`${r[1]} trùng ${r[2]}`);
          continue;
        }
        if (has(r[1]) && !has(r[2])) {
          m.merged.set(r[1], [...(m.merged.get(r[1]) ?? []), r[2]]);
          m.mergedPart.set(r[2], m.cur);
          m.notes.push(`${r[2]} trùng ${r[1]}`);
          continue;
        }
      }
    }
  }

  // giao tuyến hai mặt phẳng
  const gt = /\(\s*([A-Z]{3,5})\s*\)\s*giao\s*\(\s*([A-Z]{3,5})\s*\)\s*(?:=|là)?\s*\{?\s*([a-z])?\s*\}?/.exec(text) ?? /giao tuyến\s*(?:của|giữa)?\s*(?:hai\s*mặt phẳng\s*)?\(\s*([A-Z]{3,5})\s*\)\s*(?:và|với)?\s*\(\s*([A-Z]{3,5})\s*\)/.exec(text);
  if (gt) {
    const a = pointsIn(gt[1]);
    const b = pointsIn(gt[2]);
    if (a.length >= 3 && b.length >= 3 && [...a, ...b].every((n) => m.pts.has(n))) {
      const p1 = planeOf(m.pts.get(a[0])!, m.pts.get(a[1])!, m.pts.get(a[2])!);
      const p2 = planeOf(m.pts.get(b[0])!, m.pts.get(b[1])!, m.pts.get(b[2])!);
      const dir = p1 && p2 ? cross(p1.n, p2.n) : null;
      if (p1 && p2 && dir && len(dir) > 1e-9) {
        const dd = norm(dir);
        // một điểm trên giao tuyến: giải hệ n1·x = d1, n2·x = d2, dd·x = 0
        const n1 = p1.n;
        const n2 = p2.n;
        const det = dot(n1, cross(n2, dd));
        if (Math.abs(det) > 1e-12) {
          const x0 = mul(add(add(mul(cross(n2, dd), p1.d), mul(cross(dd, n1), p2.d)), mul(cross(n1, n2), 0)), 1 / det);
          const ref = centroid([...a, ...b].map((n) => m.pts.get(n)!));
          const tRef = dot(sub(ref, x0), dd);
          const ext = Math.max(...[...m.pts.values()].map((p) => len(sub(p, ref))), 1);
          const c = add(x0, mul(dd, tRef));
          const nm = gt[3] ?? 'd';
          const e1 = add(c, mul(dd, -ext * 1.1));
          const e2 = add(c, mul(dd, ext * 1.1));
          m.pts.set(`#${nm}1`, e1);
          m.pts.set(`#${nm}2`, e2);
          m.order.push(`#${nm}1`, `#${nm}2`);
          m.ptPart.set(`#${nm}1`, m.cur);
          m.ptPart.set(`#${nm}2`, m.cur);
          m.aux.push([`#${nm}1`, `#${nm}2`]);
          m.auxPart.push(m.cur);
          m.merged.set(`#${nm}2`, [nm]);
          m.mergedPart.set(nm, m.cur);
          m.notes.push(`giao tuyến (${gt[1]}) và (${gt[2]}) là đường thẳng ${nm}`);
        }
      } else m.ignored.push(`(${gt[1]}) và (${gt[2]}) song song hoặc trùng nhau, không có giao tuyến`);
    }
  }

  // đoạn thẳng nhắc tên rõ ràng
  for (const mm of text.matchAll(/(?:đoạn(?: thẳng)?|đường thẳng|nối|đường|kẻ)\s*([A-Z]'?[A-Z]'?)(?![A-Za-z'])/g)) {
    const s = segOf(mm[1]);
    if (s) addAux(s[0], s[1]);
  }
  for (const c of clauses) {
    if (/song song|vuông góc|giao/.test(c) && !/\(/.test(c)) {
      for (const tok of c.match(/(?<![A-Za-z'])[A-Z]'?[A-Z]'?(?![A-Za-z'])/g) ?? []) {
        const s = segOf(tok);
        if (s) addAux(s[0], s[1]);
      }
    }
  }

  // thiết diện: lưu mặt phẳng cắt (tính lại lúc vẽ để theo kịp khi kéo điểm)
  const sec = /(?:thiết diện|mặt phẳng)[^;]*?\(\s*([A-Z]'?[A-Z]'?[A-Z]'?(?:[A-Z]'?)?)\s*\)/.exec(text);
  if (/thiết diện/.test(text) && sec) {
    const ns = pointsIn(sec[1]);
    if (ns.length >= 3 && ns.every(has) && m.faces.length > 0) {
      const hits = sectionHits(m.edges, P, ns);
      if (hits) {
        if (!m.sections.some((x) => x.part === m.cur && x.plane.join('') === ns.slice(0, 3).join(''))) m.sections.push({plane: ns.slice(0, 3), part: m.cur});
        m.notes.push(`thiết diện qua (${sec[1]}) là ${hits.length}-giác`);
      } else m.ignored.push(`mặt phẳng (${sec[1]}) không cắt hình thành thiết diện`);
    }
  }

  // điểm được định nghĩa ("X là …") nhưng không dựng được: báo rõ để người dùng sửa câu chữ
  for (const c of clauses) {
    const def = /(?<![\p{L}'])([A-Z]'?)\s+là\s+/u.exec(c);
    if (!def) continue;
    const known = has(def[1]) || [...m.merged.values()].some((al) => al.includes(def[1]));
    if (!known) m.ignored.push(`Chưa hiểu: "${c.slice(0, 70)}"`);
  }

  // ---- yêu cầu bằng lời trên hình đang có: đường tròn ngoại/nội tiếp, đường tròn đường kính, tâm, trực tâm, trung tuyến, phân giác
  const basePoly = (): string[] | null => {
    if (m.faces.length > 0) return m.faces[0].length === 3 || m.faces[0].length === 4 ? m.faces[0] : null;
    const base = new Set(m.edges.flat());
    const ns = m.order.filter((n) => base.has(n));
    return ns.length === 3 || ns.length === 4 ? ns : null;
  };
  const polyFor = (c: string): string[] | null => {
    const tri = /tam giác\s*((?:[A-Z]'?){3})(?![A-Za-z'])/.exec(c);
    if (tri) return pointsIn(tri[1]);
    const par = /\(\s*((?:[A-Z]'?){3,4})\s*\)/.exec(c);
    if (par) return pointsIn(par[1]);
    const quad = /(?:hình\s*[\p{L}\s]*?|đáy|tứ giác)\s*((?:[A-Z]'?){4})(?![A-Za-z'])/u.exec(c);
    if (quad) return pointsIn(quad[1]);
    return basePoly();
  };
  const normalOf = (ns: string[]): V3 => {
    const pl = ns.length >= 3 && ns.every(has) ? planeOf(P(ns[0])!, P(ns[1])!, P(ns[2])!) : null;
    return pl ? pl.n : ([0, 0, 1] as V3);
  };
  const addCircle = (center: V3, normal: V3, r: number, label: string) => {
    if (!(r > 1e-9)) return;
    if (m.circles.some((q) => near(q.center, center) && Math.abs(q.r - r) < 1e-6)) return;
    m.circles.push({center, normal: norm(normal), r, part: m.cur, label});
    m.notes.push(label);
  };
  const circumOf = (ns: string[]): {center: V3; r: number; normal: V3} | null => {
    if (ns.length < 3 || !ns.every(has)) return null;
    const [A, B, C] = [P(ns[0])!, P(ns[1])!, P(ns[2])!];
    const ca = sub(A, C);
    const cb = sub(B, C);
    const n0 = cross(ca, cb);
    const nn = dot(n0, n0);
    if (nn < 1e-12) return null;
    const center = add(C, mul(cross(sub(mul(cb, dot(ca, ca)), mul(ca, dot(cb, cb))), n0), 1 / (2 * nn)));
    const r = len(sub(center, A));
    if (ns.length === 4 && Math.abs(len(sub(P(ns[3])!, center)) - r) > 1e-5) return null;
    return {center, r, normal: n0};
  };
  for (const c of clauses) {
    let r: RegExpExecArray | null;
    // "O là tâm đường tròn ngoại tiếp tam giác ABC" cũng vẽ đường tròn đó
    const nameCenter = /([A-Z]'?)\s*là\s*tâm\s*đường tròn\s*(?:ngoại|nội)\s*tiếp/u.exec(c);
    const kind = /đường tròn\s*(ngoại|nội)\s*tiếp|(?<![\p{L}])(ngoại|nội)\s*tiếp/u.exec(c);
    if (kind) {
      const inner = /nội/i.test(kind[1] ?? kind[2] ?? '');
      const ns = polyFor(c);
      const label = `đường tròn ${inner ? 'nội' : 'ngoại'} tiếp ${ns ? ns.join('') : ''}`.trim();
      if (!ns || !ns.every(has)) {
        m.ignored.push(`${label}: chưa xác định được đa giác (ghi rõ "tam giác ABC")`);
      } else if (inner) {
        if (ns.length !== 3) m.ignored.push('đường tròn nội tiếp chỉ vẽ được cho tam giác');
        else {
          const [A, B, C] = [P(ns[0])!, P(ns[1])!, P(ns[2])!];
          const a = len(sub(B, C));
          const b = len(sub(A, C));
          const cc = len(sub(A, B));
          const sum = a + b + cc;
          const n0 = cross(sub(B, A), sub(C, A));
          const center = mul(add(add(mul(A, a), mul(B, b)), mul(C, cc)), 1 / sum);
          addCircle(center, n0, len(n0) / sum, label);
          if (nameCenter && !has(nameCenter[1])) define(nameCenter[1], center, `${nameCenter[1]} là tâm đường tròn nội tiếp ${ns.join('')}`);
        }
      } else {
        const ci = circumOf(ns);
        if (!ci) m.ignored.push(`${ns.join('')} không có đường tròn ngoại tiếp (không nằm trên một đường tròn)`);
        else {
          addCircle(ci.center, ci.normal, ci.r, label);
          if (nameCenter && !has(nameCenter[1])) define(nameCenter[1], ci.center, `${nameCenter[1]} là tâm đường tròn ngoại tiếp ${ns.join('')}`);
        }
      }
      continue;
    }
    // đường tròn đường kính AB
    if ((r = /đường tròn\s*đường kính\s*([A-Z]'?[A-Z]'?)/u.exec(c))) {
      const s = segOf(r[1]);
      if (s && has(s[0]) && has(s[1])) {
        const bp = basePoly();
        addCircle(mul(add(P(s[0])!, P(s[1])!), 0.5), bp ? normalOf(bp) : ([0, 0, 1] as V3), len(sub(P(s[0])!, P(s[1])!)) / 2, `đường tròn đường kính ${r[1]}`);
      }
      continue;
    }
    // H là trực tâm tam giác ABC
    if ((r = /([A-Z]'?)\s*là\s*trực tâm\s*(?:của\s*)?(?:tam giác\s*)?((?:[A-Z]'?){3})/u.exec(c))) {
      const ns = pointsIn(r[2]);
      const ci = circumOf(ns);
      if (ci && !has(r[1])) define(r[1], sub(add(add(P(ns[0])!, P(ns[1])!), P(ns[2])!), mul(ci.center, 2)), `${r[1]} là trực tâm tam giác ${ns.join('')}`);
      continue;
    }
    // trung tuyến AM / phân giác AD (tam giác cơ sở)
    if ((r = /(trung tuyến|phân giác)\s*(?:xuất phát từ\s*|kẻ từ\s*)?([A-Z]'?)([A-Z]'?)?/u.exec(c)) && has(r[2])) {
      const tri = polyFor(c.replace(r[0], ''));
      const t3 = tri && tri.length === 3 && tri.includes(r[2]) ? tri : basePoly()?.length === 3 && basePoly()!.includes(r[2]) ? basePoly()! : null;
      if (t3) {
        const [b, d] = t3.filter((n) => n !== r![2]);
        const name = r[3] && !has(r[3]) ? r[3] : null;
        if (name) {
          const isMedian = /trung tuyến/i.test(r[1]);
          const ab = len(sub(P(r[2])!, P(b)!));
          const ad = len(sub(P(r[2])!, P(d)!));
          const k = isMedian ? 0.5 : ab / (ab + ad);
          define(name, add(P(b)!, mul(sub(P(d)!, P(b)!), k)), `${isMedian ? 'trung tuyến' : 'phân giác'} ${r[2]}${name}`);
          addAux(r[2], name);
        }
      }
    }
  }
}

/** Các điểm mẫu trên đường tròn (mặt cầu: sáu điểm trên ba trục). */
export function circleSamples(c: GeoCircle, n = 96): V3[] {
  if (c.kind === 'sphere') {
    return ([[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as V3[]).map((d) => add(c.center, mul(d, c.r)));
  }
  const ref = len(cross(c.normal, [1, 0, 0] as V3)) > 0.1 ? cross(c.normal, [1, 0, 0] as V3) : cross(c.normal, [0, 1, 0] as V3);
  const u = norm(ref);
  const w = cross(c.normal, u);
  const out: V3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    out.push(add(c.center, add(mul(u, c.r * Math.cos(t)), mul(w, c.r * Math.sin(t)))));
  }
  return out;
}

// ------------------------------------------------------------------ khung chiếu cố định
const KX = 0.5 * Math.cos(Math.PI / 4);
const KY = 0.5 * Math.sin(Math.PI / 4);
const rawProject = (m: Model, p: V3) => (m.dim === 2 ? {x: p[0], y: -p[1]} : {x: p[0] - KX * p[2], y: -(p[1] - KY * p[2])});

/** Khung chiếu lấy từ HÌNH GỐC (các đỉnh nằm trên cạnh của hình): các phần vẽ thêm sau không làm hình dịch hay đổi tỉ lệ. */
function fixView(m: Model, target = 300): void {
  const base = new Set(m.edges.length > 0 ? m.edges.flat() : [...m.pts.keys()]);
  const ps = [...base].map((n) => rawProject(m, m.pts.get(n)!));
  for (const c of m.circles) if (c.own) for (const q of circleSamples(c, 24)) ps.push(rawProject(m, q));
  const xs = ps.map((p) => p.x);
  const ys = ps.map((p) => p.y);
  const bx = Math.min(...xs);
  const by = Math.min(...ys);
  m.view = {k: target / Math.max(Math.max(...xs) - bx, Math.max(...ys) - by, 1e-6), bx, by};
}

// ------------------------------------------------------------------ cảnh (dạng lưu được) ⇄ mô hình
export interface GeoScene {
  dim: 2 | 3;
  title: string;
  pts: Record<string, V3>;
  order: string[];
  edges: [string, string][];
  aux: [string, string, number][];
  faces: string[][];
  marks: string[];
  polys: {names: string[]; part: number}[];
  merged: Record<string, string[]>;
  mergedPart: Record<string, number>;
  ptPart: Record<string, number>;
  /** các phần của đề: 0 = hình gốc, 1.. = phần/yêu cầu thêm */
  parts: {label: string; text: string}[];
  view: {k: number; bx: number; by: number};
  notes: string[];
  ignored: string[];
  circles?: GeoCircle[];
  sections?: GeoSection[];
  defs?: Record<string, GeoDef>;
  /** xoay tự do (phép chiếu trực giao); không có = góc chuẩn SGK (chiếu xiên cố định) */
  rot?: {yaw: number; pitch: number};
  /** tô màu từng mặt của khối */
  colors?: boolean;
  /** các phần của đề đang ẨN (bật/tắt từng phần a, b, c…); phần 0 luôn hiện. Nét tự vẽ thêm bằng dụng cụ thuộc phần 0 nên không mất khi bật/tắt */
  hiddenParts?: number[];
  /** khai triển thành lưới phẳng: 0 = khối, 1 = lưới (đang gấp/mở khi ở giữa) */
  net?: number;
  /** mặt phẳng cắt ngang song song đáy ở độ cao 0..1 (thiết diện đổi theo khi kéo) */
  slice?: number;
  /** ẩn hẳn nét khuất (mặc định vẽ nét đứt theo chuẩn SGK) */
  hideHidden?: boolean;
}

const toScene = (m: Model, parts: GeoScene['parts']): GeoScene => ({
  dim: m.dim,
  title: m.title,
  pts: Object.fromEntries(m.pts),
  order: [...m.order],
  edges: m.edges.map(([a, b]) => [a, b]),
  aux: m.aux.map(([a, b], i) => [a, b, m.auxPart[i] ?? 0]),
  faces: m.faces.map((f) => [...f]),
  marks: [...m.marks],
  polys: m.polys.map((names, i) => ({names: [...names], part: m.polyPart[i] ?? 0})),
  merged: Object.fromEntries(m.merged),
  mergedPart: Object.fromEntries(m.mergedPart),
  ptPart: Object.fromEntries(m.ptPart),
  parts,
  view: m.view ?? {k: 1, bx: 0, by: 0},
  notes: [...m.notes],
  ignored: [...m.ignored],
  circles: m.circles.map((c) => ({...c, center: [...c.center] as V3, normal: [...c.normal] as V3})),
  sections: m.sections.map((x) => ({plane: [...x.plane], part: x.part})),
  defs: Object.fromEntries(m.defs),
});

export const modelFromScene = (sc: GeoScene): Model => ({
  pts: new Map(Object.entries(sc.pts)),
  order: [...sc.order],
  edges: sc.edges.map(([a, b]) => [a, b]),
  aux: sc.aux.map(([a, b]) => [a, b]),
  faces: sc.faces.map((f) => [...f]),
  marks: new Set(sc.marks),
  polys: sc.polys.map((p) => [...p.names]),
  merged: new Map(Object.entries(sc.merged)),
  cur: 0,
  ptPart: new Map(Object.entries(sc.ptPart)),
  auxPart: sc.aux.map((a) => a[2]),
  polyPart: sc.polys.map((p) => p.part),
  mergedPart: new Map(Object.entries(sc.mergedPart)),
  circles: (sc.circles ?? []).map((c) => ({...c, center: [...c.center] as V3, normal: [...c.normal] as V3})),
  sections: (sc.sections ?? []).map((x) => ({plane: [...x.plane], part: x.part})),
  defs: new Map(Object.entries(sc.defs ?? {})),
  view: sc.view,
  dim: sc.dim,
  title: sc.title,
  notes: [...sc.notes],
  ignored: [...sc.ignored],
});

export const sceneFromModel = toScene;

// ------------------------------------------------------------------ chiếu xuống bảng
/** Vẽ cảnh đến hết phần `upTo` (mặc định tất cả). Tọa độ theo khung cố định của hình gốc (có thể âm với phần vẽ thêm ra ngoài). */
/** Quay quanh trục đứng (yaw) rồi trục ngang (pitch); +z hướng về phía người xem. */
function rotYP(p: V3, yaw: number, pitch: number): V3 {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const x1 = p[0] * cy + p[2] * sy;
  const z1 = -p[0] * sy + p[2] * cy;
  return [x1, p[1] * cp - z1 * sp, p[1] * sp + z1 * cp];
}

/** Hình đang khai triển (t > 0): mỗi mặt là một đa giác riêng, nhãn đỉnh lặp ở từng mặt, máy ảnh chuyển dần sang nhìn thẳng vào lưới. */
function renderNet(sc: GeoScene, t: number): DrawnFigure | null {
  const st = unfoldNet(sc, t);
  if (!st) return null;
  const base = sc.rot ?? DEFAULT_ORBIT;
  const fo = faceOnView(st.rootNormal);
  const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
  const yaw = base.yaw + wrap(fo.yaw - base.yaw) * t;
  const pitch = base.pitch + (fo.pitch - base.pitch) * t;
  const solidPts = [...new Set(sc.faces.flat())].map((n) => sc.pts[n]);
  const R0 = Math.max(1e-6, ...solidPts.map((p) => len(sub(p, st.solidCenter))));
  const lerp = (a: number, b: number) => a + (b - a) * t;
  const R = lerp(R0, st.flatRadius);
  const center = add(mul(st.solidCenter, 1 - t), mul(st.flatCenter, t));
  const k = 300 / (2.2 * R);
  const proj = (p: V3) => {
    const q = rotYP(sub(p, center), yaw, pitch);
    return {x: Math.round((150 + k * q[0]) * 10) / 10, y: Math.round((150 - k * q[1]) * 10) / 10, z: q[2]};
  };
  const order = st.faces
    .map((f, i) => ({f, i, z: f.pts.reduce((s, p) => s + proj(p).z, 0) / f.pts.length}))
    .sort((a, b) => a.z - b.z);
  const verts: {x: number; y: number}[] = [];
  const labels: string[] = [];
  const edges: DrawnFigure['edges'] = [];
  const faces: DrawnFigure['faces'] = [];
  for (const {f, i} of order) {
    const first = verts.length;
    f.pts.forEach((p, j) => {
      const q = proj(p);
      verts.push({x: q.x, y: q.y});
      labels.push(f.names[j].startsWith('#') ? '' : f.names[j]);
    });
    for (let j = 0; j < f.pts.length; j++) edges.push({a: first + j, b: first + ((j + 1) % f.pts.length), hidden: false, aux: false});
    faces.push({poly: f.pts.map((_, j) => first + j), color: FACE_COLORS[i % FACE_COLORS.length], visible: rotYP(f.normal, yaw, pitch)[2] > -0.05});
  }
  return {title: sc.title, dim: 3, verts, labels, edges, marks: [], polys: [], curves: [], faces};
}

/** Phần p của đề có đang hiện không (phần 0 luôn hiện). */
export const partShown = (sc: GeoScene, p: number, upTo = Infinity) => p === 0 || (p <= upTo && !(sc.hiddenParts ?? []).includes(p));

export function renderScene(sc: GeoScene, upTo = Infinity): DrawnFigure {
  if (sc.net && sc.net > 0 && sc.dim === 3) {
    const nf = renderNet(sc, Math.min(1, sc.net));
    if (nf) return nf;
  }
  const m = modelFromScene(sc);
  const included = (n: string) => partShown(sc, m.ptPart.get(n) ?? 0, upTo);
  const names = m.order.filter(included);
  const idx = new Map(names.map((n, i) => [n, i]));
  const v = m.view ?? {k: 1, bx: 0, by: 0};
  const rot = sc.rot && m.dim === 3 ? sc.rot : null;
  const baseSet = new Set(m.edges.length > 0 ? m.edges.flat() : [...m.pts.keys()]);
  const basePts = [...m.pts.entries()].filter(([n]) => baseSet.has(n)).map(([, p]) => p);
  const cen0 = centroid(basePts);
  const R0 = Math.max(1e-6, ...basePts.map((p) => len(sub(p, cen0))), ...m.circles.filter((c) => c.own).flatMap((c) => circleSamples(c, 24).map((p) => len(sub(p, cen0)))));
  // xoay tự do: quay quanh trục đứng (yaw) rồi trục ngang (pitch); +z hướng về phía người xem
  const rotate = (p: V3): V3 => {
    if (!rot) return p;
    const cy = Math.cos(rot.yaw);
    const sy = Math.sin(rot.yaw);
    const cp = Math.cos(rot.pitch);
    const sp = Math.sin(rot.pitch);
    const x1 = p[0] * cy + p[2] * sy;
    const z1 = -p[0] * sy + p[2] * cy;
    return [x1, p[1] * cp - z1 * sp, p[1] * sp + z1 * cp];
  };
  const pv = (p: V3) => {
    if (rot) {
      const q = rotate(sub(p, cen0));
      const k = 300 / (2.2 * R0);
      return {x: Math.round((150 + k * q[0]) * 10) / 10, y: Math.round((150 - k * q[1]) * 10) / 10};
    }
    const r = rawProject(m, p);
    return {x: Math.round((r.x - v.bx) * v.k * 10) / 10, y: Math.round((r.y - v.by) * v.k * 10) / 10};
  };
  const verts = names.map((n) => pv(m.pts.get(n)!));

  // mặt thấy được: nhìn theo r = (KX, KY, 1) (phía sau là z âm)
  const cen = centroid(basePts);
  const R: V3 = [KX, KY, 1];
  const facePts = m.faces.map((f) => f.map((n) => m.pts.get(n)!));
  const normals = facePts.map((fp) => {
    let n: V3 = [0, 0, 0];
    for (let i = 0; i < fp.length; i++) n = add(n, cross(fp[i], fp[(i + 1) % fp.length]));
    n = norm(n);
    return dot(n, sub(centroid(fp), cen)) < 0 ? mul(n, -1) : n;
  });
  const faceVisible = normals.map((n) => (rot ? rotate(n)[2] > 1e-6 : dot(n, R) > 1e-6));
  const onFace = (p: V3): number[] => {
    const out: number[] = [];
    facePts.forEach((fp, i) => {
      if (Math.abs(dot(normals[i], sub(p, fp[0]))) > 1e-6) return;
      let sgn = 0;
      for (let j = 0; j < fp.length; j++) {
        const e = sub(fp[(j + 1) % fp.length], fp[j]);
        const t = dot(cross(e, sub(p, fp[j])), normals[i]);
        if (Math.abs(t) < 1e-9) continue;
        if (sgn === 0) sgn = Math.sign(t);
        else if (Math.sign(t) !== sgn) return;
      }
      out.push(i);
    });
    return out;
  };

  const edges: DrawnFigure['edges'] = [];
  for (const [a, b] of m.edges) {
    let hidden = false;
    if (m.faces.length > 0) {
      const adj = m.faces.map((f, i) => ({f, i})).filter(({f}) => f.includes(a) && f.includes(b));
      hidden = adj.length > 0 && !adj.some(({i}) => faceVisible[i]);
    }
    if (hidden && sc.hideHidden) continue;
    edges.push({a: idx.get(a)!, b: idx.get(b)!, hidden, aux: false});
  }
  m.aux.forEach(([a, b], i) => {
    if (!partShown(sc, m.auxPart[i] ?? 0, upTo) || !idx.has(a) || !idx.has(b)) return;
    let hidden = false;
    if (m.faces.length > 0) hidden = !onFace(mul(add(m.pts.get(a)!, m.pts.get(b)!), 0.5)).some((f) => faceVisible[f]);
    if (hidden && sc.hideHidden) return;
    edges.push({a: idx.get(a)!, b: idx.get(b)!, hidden, aux: true});
  });

  const labels = names.map((n) => {
    if (n.startsWith('#') && !m.merged.has(n)) return '';
    const extra = (m.merged.get(n) ?? []).filter((al) => partShown(sc, m.mergedPart.get(al) ?? 0, upTo));
    return [n.startsWith('#') ? '' : n, ...extra].filter(Boolean).join('≡');
  });
  // mặt phẳng cắt ngang kéo được: thiết diện song song đáy
  const polysOut = m.polys.map((p, i) => ({p, part: m.polyPart[i] ?? 0})).filter(({p, part}) => partShown(sc, part, upTo) && p.every((n) => idx.has(n))).map(({p}) => p.map((n) => idx.get(n)!));
  for (const sx of sc.sections ?? []) {
    if (!partShown(sc, sx.part, upTo) || !sx.plane.every((n) => idx.has(n))) continue;
    const hits = sectionHits(m.edges, (n) => m.pts.get(n), sx.plane);
    if (!hits) continue;
    const ids = hits.map((p) => {
      for (const [n, q] of m.pts) if (idx.has(n) && !n.startsWith('#') && near(p, q)) return idx.get(n)!;
      verts.push(pv(p));
      labels.push('');
      return verts.length - 1;
    });
    ids.forEach((id, k) => edges.push({a: id, b: ids[(k + 1) % ids.length], hidden: false, aux: true}));
    polysOut.push(ids);
  }
  if (sc.slice !== undefined && m.dim === 3) {
    const sec = sliceSection(sc, sc.slice);
    if (sec) {
      const first = verts.length;
      sec.forEach((p) => {
        verts.push(pv(p));
        labels.push('');
      });
      sec.forEach((_, i) => edges.push({a: first + i, b: first + ((i + 1) % sec.length), hidden: false, aux: true}));
      polysOut.push(sec.map((_, i) => first + i));
    }
  }
  return {
    title: m.title,
    dim: m.dim,
    verts,
    labels,
    edges,
    marks: [...m.marks].filter((n) => idx.has(n)).map((n) => idx.get(n)!),
    polys: polysOut,
    curves: m.circles
      .filter((c) => partShown(sc, c.part, upTo))
      .flatMap((c) => {
        const own = !!c.own;
        if (c.kind === 'sphere') {
          // đường viền mặt cầu: hình tròn bán kính R quanh tâm (tỉ lệ theo phép chiếu đang dùng)
          const c2 = pv(c.center);
          const px = rot ? 300 / (2.2 * R0) : v.k;
          const pts: {x: number; y: number}[] = [];
          for (let i = 0; i <= 96; i++) {
            const t = (i / 96) * Math.PI * 2;
            pts.push({x: Math.round((c2.x + c.r * px * Math.cos(t)) * 10) / 10, y: Math.round((c2.y + c.r * px * Math.sin(t)) * 10) / 10});
          }
          return [{pts, label: c.label, own}];
        }
        const samples = circleSamples(c, 96);
        if (!c.hideBack) return [{pts: samples.map(pv), label: c.label, own}];
        // nửa xa người xem bị thân khối che: tách thành các đoạn nét liền (gần) và nét đứt (xa)
        const dir: V3 = rot ? [0, 0, 1] : [KX, KY, 1];
        const depth = (p: V3) => dot(rot ? rotate(sub(p, c.center)) : sub(p, c.center), dir);
        const runs: {pts: {x: number; y: number}[]; dashed: boolean}[] = [];
        samples.forEach((p, i) => {
          const dashed = depth(p) < -1e-9;
          const last = runs[runs.length - 1];
          if (!last || last.dashed !== dashed) {
            const prev = i > 0 ? pv(samples[i - 1]) : null;
            runs.push({pts: prev ? [prev, pv(p)] : [pv(p)], dashed});
          } else last.pts.push(pv(p));
        });
        // đường tròn khép kín: đoạn đầu và đoạn cuối cùng loại nét là một đoạn liền
        if (runs.length > 1 && runs[0].dashed === runs[runs.length - 1].dashed) {
          const first = runs.shift()!;
          runs[runs.length - 1].pts.push(...first.pts.slice(1));
        }
        return runs.map((r) => ({pts: r.pts, label: c.label, dashed: r.dashed, own}));
      }),
    faces: sc.colors
      ? m.faces
          .map((f, i) => ({f, i}))
          .filter(({f}) => f.every((n) => idx.has(n)))
          .map(({f, i}) => ({poly: f.map((n) => idx.get(n)!), color: FACE_COLORS[i % FACE_COLORS.length], visible: faceVisible[i]}))
      : [],
  };
}

// ------------------------------------------------------------------ tách đề thành các phần
export function splitParts(raw: string): {label: string; text: string}[] {
  const text = raw || '';
  type Cut = {idx: number; skip: number; label: string};
  const cuts: Cut[] = [];
  const kl = /(?:^|[\n;])\s*(?:KL|Kết luận|Yêu cầu)\s*[:：]/i.exec(text);
  if (kl) cuts.push({idx: kl.index, skip: kl[0].length, label: 'KL'});
  for (const mm of text.matchAll(/(?:^|(?<=[\s;.:]))(?:(?:câu|ý|phần)\s*)?([a-e]|[1-9])\s*\)\s*/giu)) {
    if (mm.index === undefined) continue;
    // "S.ABCD" và "(ABCD)" không bị nhầm: chỉ nhận a)…e) hoặc 1)…9) đứng sau khoảng trắng/dấu câu
    cuts.push({idx: mm.index, skip: mm[0].length, label: `${mm[1].toLowerCase()})`});
  }
  cuts.sort((a, b) => a.idx - b.idx);
  const parts: {label: string; text: string}[] = [];
  let pos = 0;
  let label = 'Đề';
  for (const c of cuts) {
    parts.push({label, text: text.slice(pos, c.idx)});
    pos = c.idx + c.skip;
    label = c.label;
  }
  parts.push({label, text: text.slice(pos)});
  return parts.filter((p, i) => i === 0 || p.text.trim()).map((p) => ({label: p.label, text: p.text.trim()}));
}

// ------------------------------------------------------------------ vào chính
export interface SceneBuild {
  scene: GeoScene | null;
  notes: string[];
  ignored: string[];
}

/**
 * Đề VIẾT TAY: bộ nhận dạng trả LaTeX lẫn chữ (\text{...}, A^{\prime}, \perp, \widehat{ABC}, dòng ngăn bằng \\, chữ cái đỉnh bị tách cách "A B C D").
 * Đưa về văn bản thường mà bộ phân tích đề hiểu; đề gõ chữ đi qua đây không đổi gì đáng kể.
 */
export function cleanHandwritten(raw: string): string {
  let t = raw || '';
  t = t.replace(/\$+/g, ' ');
  t = t.replace(/\\\\(?![a-zA-Z])/g, '\n').replace(/\\(?:quad|qquad|,|;|:|!)/g, ' ').replace(/\\(?:left|right|displaystyle|big|Big)(?![a-zA-Z])\s*/g, '');
  t = t.replace(/\\(?:text|textrm|mathrm|mathbf|textbf|operatorname)\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g, '$1');
  t = t.replace(/\^\s*\{\s*\\prime\s*\}|\^\s*\\prime|\\prime|\^\s*\{\s*'\s*\}/g, "'");
  t = t.replace(/\\(?:bot|perp)(?![a-zA-Z])/g, ' ⊥ ').replace(/\\(?:parallel|Vert|mid\s*\\mid)(?![a-zA-Z])/g, ' ∥ ').replace(/\\cap(?![a-zA-Z])/g, ' ∩ ');
  t = t.replace(/\\in(?![a-zA-Z])/g, ' ∈ ').replace(/\\equiv(?![a-zA-Z])/g, ' ≡ ').replace(/\\(?:triangle|bigtriangleup)(?![a-zA-Z])/g, ' △ ');
  t = t.replace(/\\(?:widehat|hat|angle)\s*\{?\s*([A-Z]'?[A-Z]'?[A-Z]'?)\s*\}?/g, ' góc $1 ');
  t = t.replace(/\\(?:overline|overrightarrow|vec|overleftrightarrow)\s*\{\s*([A-Z]'?[A-Z]'?)\s*\}/g, '$1');
  t = t.replace(/\\(?:Rightarrow|Longrightarrow|Leftrightarrow|rightarrow|to)(?![a-zA-Z])/g, ';').replace(/\\sqrt\s*(\d)/g, '√$1').replace(/\\cdot|\\times/g, '*');
  t = t.replace(/[´‘’′]/g, "'").replace(/⟂|⊥/g, '⊥').replace(/\u2225|\|\|/g, '∥');
  // chữ cái đỉnh bị đọc tách: "A B C D", "S . A B C D", "A ' B ' C '" → ABCD, S.ABCD, A'B'C'
  t = t.replace(/(?<![A-Za-z'])([A-Z])\s*['`]\s*(?=[A-Z]\s*'|\s|$|[.,;)])/g, "$1'");
  t = t.replace(/(?<![\p{L}'])((?:[A-Z]'?)(?:\s+[A-Z]'?){2,})(?![\p{L}'])/gu, (m) => m.replace(/\s+/g, ''));
  // đoạn hai chữ cái bị tách ("S A ⊥", "trung điểm S B"): chỉ gộp khi đứng trước ký hiệu/từ quan hệ hoặc sau từ chỉ đoạn
  t = t.replace(/(?<![\p{L}'])([A-Z]'?)\s+([A-Z]'?)(?=\s*(?:⊥|∥|∩|≡|=|vuông|song|trùng|giao|là\s|cắt)(?![\p{L}]))/gu, '$1$2');
  t = t.replace(/(?<=(?:điểm|nối|đoạn|cạnh|thẳng|đường)\s)([A-Z]'?)\s+([A-Z]'?)(?![\p{L}'])/gu, '$1$2');
  t = t.replace(/(?<![\p{L}'])([A-Z]'?)\s*\.\s*((?:[A-Z]'?){3,})/gu, '$1.$2');
  return t.replace(/[ \t]+/g, ' ').trim();
}

/** Tọa độ trong đề: A(1;2;3) (Oxyz) hoặc A(1;2) (Oxy), cũng nhận dấu phẩy. */
export function parseCoords(raw: string): Map<string, V3> {
  const out = new Map<string, V3>();
  const num = (s: string) => parseFloat(s.replace(',', '.'));
  for (const mm of raw.matchAll(/(?<![A-Za-z'])([A-Z]'?)\s*\(\s*(-?\d+(?:[.,]\d+)?)\s*[;,]\s*(-?\d+(?:[.,]\d+)?)(?:\s*[;,]\s*(-?\d+(?:[.,]\d+)?))?\s*\)/g)) {
    out.set(mm[1], [num(mm[2]), num(mm[3]), mm[4] !== undefined ? num(mm[4]) : 0]);
  }
  return out;
}

/** Có ít nhất một điểm cho bằng ba tọa độ → hệ Oxyz. */
const coordsAre3D = (raw: string) => /(?<![A-Za-z'])[A-Z]'?\s*\(\s*-?\d+(?:[.,]\d+)?\s*[;,]\s*-?\d+(?:[.,]\d+)?\s*[;,]\s*-?\d+(?:[.,]\d+)?\s*\)/.test(raw);

export function buildScene(raw0: string): SceneBuild {
  const raw = cleanHandwritten(raw0);
  const parts = splitParts(raw);
  const notes: string[] = [];
  const base = normalizeProblem(parts[0]?.text ?? '');
  let m = buildFigure(base, notes);
  let figText = base;
  if (!m) {
    figText = normalizeProblem(raw);
    m = buildFigure(figText, notes);
  }
  // tọa độ cho sẵn: đặt các điểm đúng chỗ (hình không nhận ra nhưng có ≥ 2 điểm có tọa độ → vẽ các điểm đó)
  const coords = parseCoords(raw);
  if (coords.size > 0) {
    const is3D = coordsAre3D(raw);
    if (m && (m.dim === 3) === is3D) {
      for (const [n, p] of coords) if (m.pts.has(n)) m.pts.set(n, p);
      m.notes.push(`đặt tọa độ ${[...coords.keys()].filter((n) => m!.pts.has(n)).join(', ')}`);
    } else if (!m && coords.size >= 2) {
      const bare: Model = {pts: new Map(), order: [], edges: [], aux: [], faces: [], marks: new Set(), polys: [], merged: new Map(), cur: 0, ptPart: new Map(), auxPart: [], polyPart: [], mergedPart: new Map(), circles: [], sections: [], defs: new Map(), dim: is3D ? 3 : 2, title: is3D ? 'Hình trong không gian Oxyz' : 'Hình trong mặt phẳng Oxy', notes, ignored: []};
      for (const [n, p] of coords) {
        bare.pts.set(n, is3D ? p : [p[0], p[1], 0]);
        bare.order.push(n);
        bare.ptPart.set(n, 0);
        bare.marks.add(n);
      }
      m = bare;
      m.notes.push(`${coords.size} điểm theo tọa độ`);
    }
  }
  if (!m) return {scene: null, notes, ignored: raw.trim() ? ['Chưa nhận ra hình trong đề (cần tên hình và các đỉnh, ví dụ "hình chóp S.ABCD" hoặc "tam giác ABC vuông tại A")'] : []};
  fixView(m);
  m.cur = 0;
  addExtras(m, figText);
  parts.forEach((pt, i) => {
    if (i === 0) return;
    m!.cur = i;
    addExtras(m!, normalizeProblem(pt.text));
  });
  return {scene: toScene(m, parts.length ? parts : [{label: 'Đề', text: raw}]), notes: m.notes, ignored: m.ignored};
}

/** Thêm một phần/yêu cầu mới vào cảnh đang có (phần cũ giữ nguyên). Trả cảnh mới. */
export function appendPart(sc: GeoScene, text: string, label?: string): GeoScene {
  const m = modelFromScene(sc);
  const n = sc.parts.length;
  m.cur = n;
  const before = m.order.length + m.aux.length + m.polys.length + m.merged.size + m.circles.length + m.sections.length;
  m.notes = [];
  m.ignored = [];
  addExtras(m, normalizeProblem(text));
  const changed = m.order.length + m.aux.length + m.polys.length + m.merged.size + m.circles.length + m.sections.length > before;
  const next = toScene(m, [...sc.parts, {label: label ?? `+${n}`, text}]);
  if (!changed && m.ignored.length === 0) next.ignored = [...sc.ignored, `Chưa hiểu yêu cầu: ${text.trim().slice(0, 60)}`];
  else next.ignored = [...sc.ignored, ...m.ignored];
  next.notes = [...sc.notes, ...m.notes];
  return next;
}

export interface GeometryParse {
  figure: DrawnFigure | null;
  scene: GeoScene | null;
  /** đề có điều kiện/điểm phụ cụ thể hay chỉ là tên hình (để không giành mất câu "hình chóp S.ABCD" trần) */
  isProblem: boolean;
  notes: string[];
  ignored: string[];
}

export function parseGeometryProblem(raw: string): GeometryParse {
  const b = buildScene(raw);
  if (!b.scene) return {figure: null, scene: null, isProblem: false, notes: b.notes, ignored: b.ignored};
  const sc = b.scene;
  const text = normalizeProblem(raw);
  const extra = sc.order.length > Object.values(sc.ptPart).filter((p) => p === 0).length || sc.aux.length > 0 || (sc.sections?.length ?? 0) > 0 || Object.keys(sc.merged).length > 0 || sc.parts.length > 1;
  const detail = extra || text.trim().length > 40 || /đáy|vuông|cân|đều|bằng|=|cạnh/.test(text.replace(/hình vuông|hình chữ nhật/g, ''));
  return {figure: renderScene(sc), scene: sc, isProblem: detail, notes: sc.notes, ignored: sc.ignored};
}

/** Trong các nguồn đề (ô công thức, chữ AI đọc, LaTeX…), lấy nguồn dựng được hình có nhiều phần a), b)… nhất:
 * tên hình đoán từ nét (VD "Hình chóp S.ABCD") không được giành chỗ của đề đầy đủ vừa đọc từ chữ viết tay. Hòa thì giữ nguồn đứng trước. */
export function parseRichestGeometry(sources: string[]): {scene: GeoScene; src: string} | null {
  let best: {scene: GeoScene; src: string} | null = null;
  for (const src of sources) {
    if (!src || !src.trim()) continue;
    const r = parseGeometryProblem(src);
    if (r.scene && (!best || r.scene.parts.length > best.scene.parts.length)) best = {scene: r.scene, src};
  }
  return best;
}
