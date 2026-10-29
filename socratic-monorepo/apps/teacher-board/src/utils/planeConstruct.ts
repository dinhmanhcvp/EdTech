/**
 * Dựng hình ĐỘNG trên hình phẳng (tam giác, đa giác): trung điểm, trung tuyến, đường cao, phân giác, trung trực,
 * đường trung bình, đường song song, đường chéo, các tâm (G, H, I, O) và đường tròn (ngoại tiếp, nội tiếp, 9 điểm).
 *
 * Mỗi phép dựng chỉ lưu LOẠI + chỉ số đỉnh/cạnh (không lưu tọa độ), nên khi kéo đỉnh thì mọi đường dựng tự cập nhật.
 * Thuần tính toán, không phụ thuộc React/DOM. Tọa độ vào/ra cùng hệ px của hình (y hướng xuống).
 */
import {PLANE_UNIT_PX, VERTEX_LABELS, type P2} from './inlineShape';

export type ConstructKind =
  | 'midpoint'
  | 'median'
  | 'altitude'
  | 'bisector'
  | 'perpBisector'
  | 'midline'
  | 'parallel'
  | 'diagonals'
  | 'varignon'
  | 'centroid'
  | 'orthocenter'
  | 'incenter'
  | 'circumcenter'
  | 'circumcircle'
  | 'incircle'
  | 'ninePoint'
  | 'cut';

export interface PlaneConstruct {
  k: ConstructKind;
  /** chỉ số đỉnh (median, altitude, bisector, midline, parallel) hoặc cạnh i = đỉnh i → i+1 (midpoint, perpBisector) */
  i?: number;
  /** chỉ cho 'cut' (cắt hình): cạnh i tại tham số ta ∈ (0,1) nối với cạnh j tại tb; sep = tách mảnh thứ nhất ra khỏi hình */
  j?: number;
  ta?: number;
  tb?: number;
  sep?: boolean;
}

export const KIND_LABEL: Record<ConstructKind, string> = {
  midpoint: 'Trung điểm',
  median: 'Trung tuyến',
  altitude: 'Đường cao',
  bisector: 'Phân giác',
  perpBisector: 'Trung trực',
  midline: 'Đường trung bình',
  parallel: 'Song song cạnh đối',
  diagonals: 'Đường chéo',
  varignon: 'Nối trung điểm các cạnh',
  centroid: 'Trọng tâm G',
  orthocenter: 'Trực tâm H',
  incenter: 'Tâm nội tiếp I',
  circumcenter: 'Tâm ngoại tiếp O',
  circumcircle: 'Đường tròn ngoại tiếp',
  incircle: 'Đường tròn nội tiếp',
  ninePoint: 'Đường tròn 9 điểm',
  cut: 'Cắt hình',
};

export const KIND_COLOR: Record<ConstructKind, string> = {
  midpoint: '#0F766E',
  median: '#16A34A',
  altitude: '#DC2626',
  bisector: '#EA580C',
  perpBisector: '#7C3AED',
  midline: '#0891B2',
  parallel: '#2563EB',
  diagonals: '#475569',
  varignon: '#0891B2',
  centroid: '#16A34A',
  orthocenter: '#DC2626',
  incenter: '#EA580C',
  circumcenter: '#7C3AED',
  circumcircle: '#7C3AED',
  incircle: '#EA580C',
  ninePoint: '#BE185D',
  cut: '#DC2626',
};

/** phép dựng có dùng được với đa giác n đỉnh không */
export function applicable(k: ConstructKind, n: number): boolean {
  if (n < 3) return false;
  switch (k) {
    case 'midpoint':
    case 'bisector':
    case 'perpBisector':
    case 'midline':
    case 'cut':
      return true;
    case 'diagonals':
    case 'varignon':
      return n >= 4;
    default:
      return n === 3;
  }
}

export const constructKey = (c: PlaneConstruct) => (c.k === 'cut' ? `cut:${c.i}-${c.j}-${(c.ta ?? 0).toFixed(2)}-${(c.tb ?? 0).toFixed(2)}` : `${c.k}:${c.i ?? 0}`);
export const hasConstruct = (list: PlaneConstruct[] | undefined, c: PlaneConstruct) => !!list?.some((x) => constructKey(x) === constructKey(c));

/** bật/tắt một phép dựng (chạm lần nữa để bỏ) */
export function toggleConstruct(list: PlaneConstruct[] | undefined, c: PlaneConstruct): PlaneConstruct[] {
  const cur = list ?? [];
  return hasConstruct(cur, c) ? cur.filter((x) => constructKey(x) !== constructKey(c)) : [...cur, c];
}

/** thêm nhiều phép dựng, bỏ trùng */
export function addConstructs(list: PlaneConstruct[] | undefined, add: PlaneConstruct[]): PlaneConstruct[] {
  const out = [...(list ?? [])];
  for (const c of add) if (!hasConstruct(out, c)) out.push(c);
  return out;
}

/** Gói "tâm": đường dựng + điểm + đường tròn đi kèm. */
export const BUNDLES: {id: string; label: string; items: PlaneConstruct[]}[] = [
  {id: 'G', label: 'Trọng tâm G', items: [{k: 'median', i: 0}, {k: 'median', i: 1}, {k: 'median', i: 2}, {k: 'centroid'}]},
  {id: 'H', label: 'Trực tâm H', items: [{k: 'altitude', i: 0}, {k: 'altitude', i: 1}, {k: 'altitude', i: 2}, {k: 'orthocenter'}]},
  {id: 'I', label: 'Nội tiếp I', items: [{k: 'bisector', i: 0}, {k: 'bisector', i: 1}, {k: 'bisector', i: 2}, {k: 'incenter'}, {k: 'incircle'}]},
  {id: 'O', label: 'Ngoại tiếp O', items: [{k: 'perpBisector', i: 0}, {k: 'perpBisector', i: 1}, {k: 'perpBisector', i: 2}, {k: 'circumcenter'}, {k: 'circumcircle'}]},
  {id: 'N', label: 'Đường tròn 9 điểm', items: [{k: 'median', i: 0}, {k: 'altitude', i: 0}, {k: 'altitude', i: 1}, {k: 'altitude', i: 2}, {k: 'midpoint', i: 0}, {k: 'midpoint', i: 1}, {k: 'midpoint', i: 2}, {k: 'orthocenter'}, {k: 'circumcenter'}, {k: 'ninePoint'}]},
];

/** Gói dựng nhanh cho đa giác n ≥ 4. */
export function polygonBundles(n: number): {id: string; label: string; items: PlaneConstruct[]}[] {
  if (n < 4) return [];
  return [
    {id: 'D', label: 'Đường chéo', items: [{k: 'diagonals'}]},
    {id: 'V', label: 'Nối trung điểm các cạnh', items: [{k: 'varignon'}]},
    {id: 'T', label: 'Trung trực các cạnh', items: Array.from({length: n}, (_, i) => ({k: 'perpBisector' as const, i}))},
    {id: 'P', label: 'Phân giác các góc', items: Array.from({length: n}, (_, i) => ({k: 'bisector' as const, i}))},
  ];
}

// ------------------------------------------------------------------ kết quả vẽ
export interface DrawPoint {
  x: number;
  y: number;
  label: string;
  color: string;
  /** chấm nhỏ không nhãn (điểm tiếp xúc, 9 điểm) */
  minor?: boolean;
}
export interface DrawSeg {
  a: P2;
  b: P2;
  color: string;
  dashed?: boolean;
  thin?: boolean;
}
export interface DrawCircle {
  c: P2;
  r: number;
  color: string;
  dashed?: boolean;
}
export interface DrawArc {
  at: P2;
  a1: number;
  a2: number;
  r: number;
  /** số cung đồng tâm (đánh dấu các góc bằng nhau) */
  n: number;
  color: string;
}
export interface DrawRight {
  at: P2;
  u: P2;
  v: P2;
  size: number;
  color: string;
}
export interface DrawTick {
  at: P2;
  dir: P2;
  n: number;
  color: string;
}
/** vùng tô màu (mảnh cắt); dashed = chỉ viền nét đứt (vị trí cũ của mảnh đã tách) */
export interface DrawFill {
  pts: P2[];
  color: string;
  opacity: number;
  dashed?: boolean;
}
export interface PlaneDraw {
  fills: DrawFill[];
  points: DrawPoint[];
  segs: DrawSeg[];
  circles: DrawCircle[];
  arcs: DrawArc[];
  rights: DrawRight[];
  ticks: DrawTick[];
  /** các nhận xét đo trực tiếp trên hình (tự cập nhật khi kéo đỉnh) */
  facts: string[];
  degenerate: boolean;
}

// ------------------------------------------------------------------ vectơ
const sub = (a: P2, b: P2): P2 => ({x: a.x - b.x, y: a.y - b.y});
const add = (a: P2, b: P2): P2 => ({x: a.x + b.x, y: a.y + b.y});
const mul = (a: P2, k: number): P2 => ({x: a.x * k, y: a.y * k});
const dot = (a: P2, b: P2) => a.x * b.x + a.y * b.y;
const cross = (a: P2, b: P2) => a.x * b.y - a.y * b.x;
const len = (a: P2) => Math.hypot(a.x, a.y);
const unit = (a: P2): P2 => {
  const l = len(a);
  return l < 1e-12 ? {x: 0, y: 0} : {x: a.x / l, y: a.y / l};
};
const perp = (a: P2): P2 => ({x: -a.y, y: a.x});
const lerp = (a: P2, b: P2, t: number): P2 => ({x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t});
const polyArea = (pts: P2[]) => Math.abs(pts.reduce((acc, p, k) => acc + (p.x * pts[(k + 1) % pts.length].y - pts[(k + 1) % pts.length].x * p.y), 0)) / 2;
const mid = (a: P2, b: P2): P2 => ({x: (a.x + b.x) / 2, y: (a.y + b.y) / 2});
const ang = (v: P2) => Math.atan2(v.y, v.x);
const fmt = (v: number) => (Math.abs(v) < 5e-3 ? '0' : v.toFixed(2).replace('.', ','));
const unitLen = (a: P2, b: P2) => len(sub(a, b)) / PLANE_UNIT_PX;

/** chân đường vuông góc hạ từ p xuống đường thẳng ab */
export function footOnLine(p: P2, a: P2, b: P2): P2 {
  const d = sub(b, a);
  const dd = dot(d, d);
  if (dd < 1e-12) return a;
  return add(a, mul(d, dot(sub(p, a), d) / dd));
}

/** giao điểm hai đường thẳng (p + t·d) và (q + s·e); null nếu song song */
export function lineIntersect(p: P2, d: P2, q: P2, e: P2): {t: number; s: number; pt: P2} | null {
  const den = cross(d, e);
  if (Math.abs(den) < 1e-12) return null;
  const w = sub(q, p);
  const t = cross(w, e) / den;
  const s = cross(w, d) / den;
  return {t, s, pt: add(p, mul(d, t))};
}

/** các giao điểm của tia/đường (o + t·d) với các cạnh đa giác (bỏ cạnh có chỉ số trong `skip`), theo t */
function boundaryHits(o: P2, d: P2, verts: P2[], skip: number[]): number[] {
  const n = verts.length;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    if (skip.includes(i)) continue;
    const a = verts[i];
    const b = verts[(i + 1) % n];
    const r = lineIntersect(o, d, a, sub(b, a));
    if (r && r.s >= -1e-9 && r.s <= 1 + 1e-9) out.push(r.t);
  }
  return out;
}

/** khoảng cách từ p tới đường viền đa giác */
export function distToPolygon(p: P2, verts: P2[]): number {
  let best = Infinity;
  for (let i = 0; i < verts.length; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % verts.length];
    const d = sub(b, a);
    const dd = dot(d, d) || 1;
    const t = Math.max(0, Math.min(1, dot(sub(p, a), d) / dd));
    best = Math.min(best, len(sub(p, add(a, mul(d, t)))));
  }
  return best;
}

/** đường tròn đi qua 3 điểm; null nếu thẳng hàng */
export function circumcircleOf(a: P2, b: P2, c: P2): {O: P2; R: number} | null {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 1e-6) return null;
  const a2 = a.x * a.x + a.y * a.y;
  const b2 = b.x * b.x + b.y * b.y;
  const c2 = c.x * c.x + c.y * c.y;
  const O = {x: (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d, y: (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d};
  return {O, R: len(sub(a, O))};
}

/** đường tròn nội tiếp tam giác */
export function incircleOf(a: P2, b: P2, c: P2): {I: P2; r: number} | null {
  const la = len(sub(b, c));
  const lb = len(sub(c, a));
  const lc = len(sub(a, b));
  const p = la + lb + lc;
  const area2 = Math.abs(cross(sub(b, a), sub(c, a)));
  if (p < 1e-9 || area2 < 1e-6) return null;
  return {I: {x: (la * a.x + lb * b.x + lc * c.x) / p, y: (la * a.y + lb * b.y + lc * c.y) / p}, r: area2 / p};
}

/** đường dẫn SVG của cung góc từ tia a1 đến tia a2 (cung nhỏ), tâm `at`, bán kính r */
export function arcPath(at: P2, a1: number, a2: number, r: number): string {
  let d = a2 - a1;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  const p1 = {x: at.x + r * Math.cos(a1), y: at.y + r * Math.sin(a1)};
  const p2 = {x: at.x + r * Math.cos(a2), y: at.y + r * Math.sin(a2)};
  return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${r} ${r} 0 0 ${d > 0 ? 1 : 0} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
}

// ------------------------------------------------------------------ bộ cấp nhãn điểm
const MID_POOL = 'MNPQRSUVWXYZ'.split('');
const FOOT_POOL = 'DEFKLTUVWXYZ'.split('');

class Labels {
  private map = new Map<string, string>();
  private taken: Set<string>;
  constructor(n: number) {
    this.taken = new Set(VERTEX_LABELS.slice(0, n).concat(['G', 'H', 'I', 'O']));
  }
  get(key: string, pool: string[]): string {
    const had = this.map.get(key);
    if (had) return had;
    if (pool.length === 1) {
      this.map.set(key, pool[0]); // tên cố định (G, H, I, O)
      return pool[0];
    }
    const l = pool.find((x) => !this.taken.has(x)) ?? `${pool[0]}${this.map.size}`;
    this.taken.add(l);
    this.map.set(key, l);
    return l;
  }
}

// ------------------------------------------------------------------ tính toán chính
export function evalConstructs(verts: P2[], list: PlaneConstruct[] | undefined): PlaneDraw {
  const out: PlaneDraw = {fills: [], points: [], segs: [], circles: [], arcs: [], rights: [], ticks: [], facts: [], degenerate: false};
  const cs = list ?? [];
  const n = verts.length;
  if (n < 3 || cs.length === 0) return out;
  const V = (i: number) => verts[((i % n) + n) % n];
  const names = VERTEX_LABELS;
  const L = new Labels(n);
  const has = (k: ConstructKind) => cs.some((c) => c.k === k);
  const tri = n === 3 ? {A: verts[0], B: verts[1], C: verts[2]} : null;
  const area2 = tri ? Math.abs(cross(sub(tri.B, tri.A), sub(tri.C, tri.A))) : 1;
  if (tri && area2 < 1e-3) {
    out.degenerate = true;
    out.facts.push('Ba đỉnh thẳng hàng: không dựng được. Hãy kéo một đỉnh ra khỏi đường thẳng.');
    return out;
  }
  const cc = tri ? circumcircleOf(tri.A, tri.B, tri.C) : null;
  const G = tri ? {x: (tri.A.x + tri.B.x + tri.C.x) / 3, y: (tri.A.y + tri.B.y + tri.C.y) / 3} : null;
  const H = cc && G ? {x: 3 * G.x - 2 * cc.O.x, y: 3 * G.y - 2 * cc.O.y} : null;
  const ic = tri ? incircleOf(tri.A, tri.B, tri.C) : null;
  const seen = new Set<string>();

  const point = (key: string, p: P2, pool: string[], color: string) => {
    if (seen.has(key)) return L.get(key, pool);
    seen.add(key);
    const label = L.get(key, pool);
    out.points.push({x: p.x, y: p.y, label, color});
    return label;
  };
  const midPoint = (side: number, color: string) => {
    const M = mid(V(side), V(side + 1));
    return {M, label: point(`mid:${side}`, M, MID_POOL, color)};
  };
  const ticksHalf = (a: P2, b: P2, k: number, color: string) => {
    const M = mid(a, b);
    out.ticks.push({at: mid(a, M), dir: unit(sub(b, a)), n: k, color}, {at: mid(M, b), dir: unit(sub(b, a)), n: k, color});
  };

  for (const c of cs) {
    if (!applicable(c.k, n)) continue;
    const color = KIND_COLOR[c.k];
    const i = c.i ?? 0;
    switch (c.k) {
      case 'midpoint': {
        const {M} = midPoint(i, color);
        ticksHalf(V(i), V(i + 1), 1 + (i % 3), color);
        void M;
        break;
      }
      case 'median': {
        const A = V(i);
        const {M, label} = midPoint(i + 1, color);
        out.segs.push({a: A, b: M, color});
        ticksHalf(V(i + 1), V(i + 2), 1 + ((i + 1) % 3), color);
        out.facts.push(`${names[i]}${label} là trung tuyến: ${label}${names[(i + 1) % n]} = ${label}${names[(i + 2) % n]} = ${fmt(unitLen(V(i + 1), V(i + 2)) / 2)}`);
        break;
      }
      case 'altitude': {
        const A = V(i);
        const B = V(i + 1);
        const C = V(i + 2);
        const F = footOnLine(A, B, C);
        const label = point(`foot:${i}`, F, FOOT_POOL, color);
        let start = A;
        let end = F;
        if (has('orthocenter') && H) {
          const d = unit(sub(F, A));
          const tF = len(sub(F, A));
          const tH = dot(sub(H, A), d);
          start = add(A, mul(d, Math.min(0, tH)));
          end = add(A, mul(d, Math.max(tF, tH)));
        }
        out.segs.push({a: start, b: end, color});
        // cạnh đối kéo dài (nét đứt) khi chân đường cao rơi ngoài đoạn BC
        const tF = dot(sub(F, B), unit(sub(C, B)));
        const lenBC = len(sub(C, B));
        if (tF < -1e-6) out.segs.push({a: F, b: B, color, dashed: true, thin: true});
        else if (tF > lenBC + 1e-6) out.segs.push({a: F, b: C, color, dashed: true, thin: true});
        const toward = tF < 0 ? B : tF > lenBC ? C : mid(B, C);
        out.rights.push({at: F, u: unit(sub(A, F)), v: unit(sub(toward, F)), size: 9, color});
        const deg = (Math.acos(Math.max(-1, Math.min(1, dot(unit(sub(A, F)), unit(sub(C, B)))))) * 180) / Math.PI;
        out.facts.push(`${names[i]}${label} ⟂ ${names[(i + 1) % n]}${names[(i + 2) % n]} (góc ${fmt(deg)}°), độ dài đường cao = ${fmt(unitLen(A, F))}`);
        break;
      }
      case 'bisector': {
        const A = V(i);
        const P = V(i - 1);
        const N = V(i + 1);
        const u = unit(sub(P, A));
        const w = unit(sub(N, A));
        let d = add(u, w);
        if (len(d) < 1e-9) d = perp(u);
        d = unit(d);
        const hits = boundaryHits(A, d, verts, [(i - 1 + n) % n, i]).filter((t) => t > 1e-6);
        if (hits.length === 0) break;
        const t = Math.min(...hits);
        const D = add(A, mul(d, t));
        const label = point(`bis:${i}`, D, FOOT_POOL, color);
        out.segs.push({a: A, b: D, color});
        const k = 1 + (i % 3);
        out.arcs.push({at: A, a1: ang(u), a2: ang(d), r: 20, n: k, color}, {at: A, a1: ang(d), a2: ang(w), r: 20, n: k, color});
        const half = (Math.acos(Math.max(-1, Math.min(1, dot(u, w)))) * 180) / Math.PI / 2;
        out.facts.push(`${names[i]}${label} là phân giác: hai góc bằng nhau = ${fmt(half)}°`);
        if (tri) {
          const sb = unitLen(D, V(i + 1));
          const sc = unitLen(D, V(i + 2));
          const ab = unitLen(A, V(i + 1));
          const ac = unitLen(A, V(i + 2));
          out.facts.push(`${label}${names[(i + 1) % n]}/${label}${names[(i + 2) % n]} = ${fmt(sb / (sc || 1))} và ${names[i]}${names[(i + 1) % n]}/${names[i]}${names[(i + 2) % n]} = ${fmt(ab / (ac || 1))}`);
        }
        break;
      }
      case 'perpBisector': {
        const a = V(i);
        const b = V(i + 1);
        const {M, label} = midPoint(i, color);
        const d = unit(perp(sub(b, a)));
        const hits = boundaryHits(M, d, verts, [i]);
        const pos = hits.filter((t) => t > 1e-6);
        const neg = hits.filter((t) => t < -1e-6);
        let t1 = pos.length ? Math.min(...pos) : 50;
        let t0 = neg.length ? Math.max(...neg) : -50;
        if (has('circumcenter') && cc) {
          const tO = dot(sub(cc.O, M), d);
          t1 = Math.max(t1, tO);
          t0 = Math.min(t0, tO);
        }
        const over = 16;
        out.segs.push({a: add(M, mul(d, t0 - over)), b: add(M, mul(d, t1 + over)), color});
        ticksHalf(a, b, 1 + (i % 3), color);
        out.rights.push({at: M, u: unit(sub(b, a)), v: d, size: 9, color});
        out.facts.push(`Đường trung trực của ${names[i]}${names[(i + 1) % n]} đi qua ${label}, vuông góc cạnh: ${label}${names[i]} = ${label}${names[(i + 1) % n]} = ${fmt(unitLen(a, b) / 2)}`);
        break;
      }
      case 'midline': {
        const s0 = (i - 1 + n) % n;
        const m1 = midPoint(s0, color);
        const m2 = midPoint(i, color);
        out.segs.push({a: m1.M, b: m2.M, color});
        if (tri) {
          const opp = unitLen(V(i + 1), V(i + 2));
          out.facts.push(`${m1.label}${m2.label} // ${names[(i + 1) % n]}${names[(i + 2) % n]} và ${m1.label}${m2.label} = ${fmt(unitLen(m1.M, m2.M))} = ½ · ${fmt(opp)}`);
        }
        break;
      }
      case 'parallel': {
        const A = V(i);
        const d = unit(sub(V(i + 2), V(i + 1)));
        const span = Math.max(unitLen(V(0), V(1)), unitLen(V(1), V(2)), unitLen(V(2), V(0))) * PLANE_UNIT_PX * 0.85;
        out.segs.push({a: add(A, mul(d, -span)), b: add(A, mul(d, span)), color, dashed: true});
        out.facts.push(`Đường thẳng qua ${names[i]} song song ${names[(i + 1) % n]}${names[(i + 2) % n]}`);
        break;
      }
      case 'diagonals': {
        for (let a = 0; a < n; a++)
          for (let b = a + 2; b < n; b++) {
            if (a === 0 && b === n - 1) continue;
            out.segs.push({a: V(a), b: V(b), color});
          }
        if (n === 4) {
          const r = lineIntersect(V(0), sub(V(2), V(0)), V(1), sub(V(3), V(1)));
          if (r) {
            point('diag:O', r.pt, ['O'], color);
            const ao = unitLen(V(0), r.pt);
            const oc = unitLen(r.pt, V(2));
            const bo = unitLen(V(1), r.pt);
            const od = unitLen(r.pt, V(3));
            out.facts.push(`OA : OC = ${fmt(ao / (oc || 1))} ; OB : OD = ${fmt(bo / (od || 1))}${Math.abs(ao - oc) < 0.02 && Math.abs(bo - od) < 0.02 ? ' → hai đường chéo cắt nhau tại trung điểm mỗi đường' : ''}`);
          }
        }
        break;
      }
      case 'varignon': {
        const ms = verts.map((_, s) => mid(V(s), V(s + 1)));
        ms.forEach((m, s) => {
          point(`mid:${s}`, m, MID_POOL, color);
          out.segs.push({a: m, b: ms[(s + 1) % n], color});
        });
        if (n === 4) {
          const s1 = unitLen(ms[0], ms[1]);
          const s2 = unitLen(ms[1], ms[2]);
          const s3 = unitLen(ms[2], ms[3]);
          const s4 = unitLen(ms[3], ms[0]);
          out.facts.push(`Nối trung điểm 4 cạnh: ${fmt(s1)} ; ${fmt(s2)} ; ${fmt(s3)} ; ${fmt(s4)}${Math.abs(s1 - s3) < 0.02 && Math.abs(s2 - s4) < 0.02 ? ' → các cặp cạnh đối bằng nhau (hình bình hành)' : ''}`);
        }
        break;
      }
      case 'centroid': {
        if (!G || !tri) break;
        point('G', G, ['G'], color);
        const M = mid(tri.B, tri.C);
        out.facts.push(`G: AG : GM = ${fmt(unitLen(tri.A, G) / (unitLen(G, M) || 1))} (luôn bằng 2)`);
        break;
      }
      case 'orthocenter': {
        if (!H || !tri) break;
        point('H', H, ['H'], color);
        const right = [0, 1, 2].find((k) => Math.abs(dot(unit(sub(V(k + 1), V(k))), unit(sub(V(k + 2), V(k))))) < 1e-3);
        const obtuse = [0, 1, 2].some((k) => dot(sub(V(k + 1), V(k)), sub(V(k + 2), V(k))) < -1e-6);
        out.facts.push(right !== undefined ? `H trùng đỉnh ${names[right]} (tam giác vuông tại ${names[right]})` : obtuse ? 'H nằm NGOÀI tam giác (tam giác tù)' : 'H nằm trong tam giác (tam giác nhọn)');
        break;
      }
      case 'incenter': {
        if (!ic || !tri) break;
        point('I', ic.I, ['I'], color);
        out.facts.push(`I cách đều ba cạnh: r = ${fmt(ic.r / PLANE_UNIT_PX)}`);
        break;
      }
      case 'circumcenter': {
        if (!cc || !tri) break;
        point('O', cc.O, ['O'], color);
        const obtuse = [0, 1, 2].some((k) => dot(sub(V(k + 1), V(k)), sub(V(k + 2), V(k))) < -1e-6);
        out.facts.push(`OA = OB = OC = R = ${fmt(cc.R / PLANE_UNIT_PX)}${obtuse ? ' ; O nằm ngoài tam giác (tam giác tù)' : ''}`);
        break;
      }
      case 'circumcircle': {
        if (!cc) break;
        out.circles.push({c: cc.O, r: cc.R, color, dashed: true});
        point('O', cc.O, ['O'], color);
        for (const v of verts) out.segs.push({a: cc.O, b: v, color, dashed: true, thin: true});
        break;
      }
      case 'incircle': {
        if (!ic || !tri) break;
        out.circles.push({c: ic.I, r: ic.r, color});
        point('I', ic.I, ['I'], color);
        for (let s = 0; s < 3; s++) {
          const T = footOnLine(ic.I, V(s), V(s + 1));
          out.points.push({x: T.x, y: T.y, label: '', color, minor: true});
          out.segs.push({a: ic.I, b: T, color, dashed: true, thin: true});
          out.rights.push({at: T, u: unit(sub(ic.I, T)), v: unit(sub(V(s + 1), V(s))), size: 7, color});
        }
        break;
      }
      case 'cut': {
        const j = c.j ?? -1;
        const ta = c.ta ?? 0.5;
        const tb = c.tb ?? 0.5;
        if (j < 0 || j >= n || i >= n || j === i || ta < 0.02 || ta > 0.98 || tb < 0.02 || tb > 0.98) break;
        const P = lerp(V(i), V(i + 1), ta);
        const Q = lerp(V(j), V(j + 1), tb);
        const walk = (from: number, to: number) => {
          const ids = [((from % n) + n) % n];
          while (ids[ids.length - 1] !== ((to % n) + n) % n) ids.push((ids[ids.length - 1] + 1) % n);
          return ids.map((k) => verts[k]);
        };
        const part1 = [P, ...walk(i + 1, j), Q];
        const part2 = [Q, ...walk(j + 1, i), P];
        const lp = point(`cutP:${constructKey(c)}`, P, MID_POOL, color);
        const lq = point(`cutQ:${constructKey(c)}`, Q, MID_POOL, color);
        out.segs.push({a: P, b: Q, color});
        const s1 = polyArea(part1) / (PLANE_UNIT_PX * PLANE_UNIT_PX);
        const s2 = polyArea(part2) / (PLANE_UNIT_PX * PLANE_UNIT_PX);
        if (c.sep) {
          // mảnh 1 tách ra phía ngoài, vuông góc với đường cắt; chỗ cũ chỉ còn viền nét đứt
          const centroid = (pts: P2[]) => mul(pts.reduce((a, b) => add(a, b), {x: 0, y: 0}), 1 / pts.length);
          const nrm = unit(perp(sub(Q, P)));
          const off = mul(nrm, (dot(nrm, sub(centroid(part1), centroid(part2))) >= 0 ? 1 : -1) * 16);
          out.fills.push({pts: part1, color, opacity: 0, dashed: true}, {pts: part1.map((q) => add(q, off)), color, opacity: 0.34});
        } else {
          out.fills.push({pts: part1, color, opacity: 0.3});
        }
        // góc giữa đường cắt và hai cạnh bị cắt, ở phía mảnh 1
        const a1 = ang(sub(V(i + 1), P));
        const a2 = ang(sub(Q, P));
        const b1 = ang(sub(V(j), Q));
        const b2 = ang(sub(P, Q));
        out.arcs.push({at: P, a1, a2, r: 16, n: 1, color}, {at: Q, a1: b1, a2: b2, r: 16, n: 1, color});
        const degAt = (at: P2, u: P2, v: P2) => (Math.acos(Math.max(-1, Math.min(1, dot(unit(sub(u, at)), unit(sub(v, at)))))) * 180) / Math.PI;
        const gP = degAt(P, V(i + 1), Q);
        const gQ = degAt(Q, V(j), P);
        out.facts.push(
          `Cắt ${lp}${lq} = ${fmt(unitLen(P, Q))}: S₁ = ${fmt(s1)}, S₂ = ${fmt(s2)} (tổng ${fmt(s1 + s2)}); góc tại ${lp} = ${gP.toFixed(0)}°, tại ${lq} = ${gQ.toFixed(0)}°`,
        );
        break;
      }
      case 'ninePoint': {
        if (!cc || !G || !H || !tri) break;
        const N9 = mid(cc.O, H);
        out.circles.push({c: N9, r: cc.R / 2, color});
        out.points.push({x: N9.x, y: N9.y, label: 'N₉', color});
        const nine: P2[] = [];
        for (let s = 0; s < 3; s++) {
          nine.push(mid(V(s), V(s + 1)), footOnLine(V(s), V(s + 1), V(s + 2)), mid(V(s), H));
        }
        nine.forEach((p) => out.points.push({x: p.x, y: p.y, label: '', color, minor: true}));
        out.facts.push(`Đường tròn 9 điểm: tâm N₉ là trung điểm OH, bán kính = R/2 = ${fmt(cc.R / PLANE_UNIT_PX / 2)}`);
        break;
      }
    }
  }
  return out;
}

// ------------------------------------------------------------------ vẽ lên canvas (xuất ảnh)
export function drawConstructsOnCtx(ctx: CanvasRenderingContext2D, d: PlaneDraw, ox: number, oy: number): void {
  ctx.save();
  ctx.lineCap = 'round';
  for (const f of d.fills) {
    ctx.beginPath();
    f.pts.forEach((p, k) => (k ? ctx.lineTo(ox + p.x, oy + p.y) : ctx.moveTo(ox + p.x, oy + p.y)));
    ctx.closePath();
    if (f.dashed) {
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.globalAlpha = f.opacity;
      ctx.fillStyle = f.color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  for (const c of d.circles) {
    ctx.strokeStyle = c.color;
    ctx.lineWidth = 1.8;
    ctx.setLineDash(c.dashed ? [6, 5] : []);
    ctx.beginPath();
    ctx.arc(ox + c.c.x, oy + c.c.y, c.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const s of d.segs) {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.thin ? 1.2 : 2;
    ctx.setLineDash(s.dashed ? [6, 5] : []);
    ctx.beginPath();
    ctx.moveTo(ox + s.a.x, oy + s.a.y);
    ctx.lineTo(ox + s.b.x, oy + s.b.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  for (const a of d.arcs) {
    ctx.strokeStyle = a.color;
    ctx.lineWidth = 1.4;
    let diff = a.a2 - a.a1;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff <= -Math.PI) diff += 2 * Math.PI;
    for (let k = 0; k < a.n; k++) {
      ctx.beginPath();
      ctx.arc(ox + a.at.x, oy + a.at.y, a.r + k * 4, a.a1, a.a1 + diff, diff < 0);
      ctx.stroke();
    }
  }
  for (const r of d.rights) {
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(ox + r.at.x + r.u.x * r.size, oy + r.at.y + r.u.y * r.size);
    ctx.lineTo(ox + r.at.x + (r.u.x + r.v.x) * r.size, oy + r.at.y + (r.u.y + r.v.y) * r.size);
    ctx.lineTo(ox + r.at.x + r.v.x * r.size, oy + r.at.y + r.v.y * r.size);
    ctx.stroke();
  }
  for (const t of d.ticks) {
    ctx.strokeStyle = t.color;
    ctx.lineWidth = 1.6;
    const nx = -t.dir.y;
    const ny = t.dir.x;
    for (let k = 0; k < t.n; k++) {
      const off = (k - (t.n - 1) / 2) * 4;
      const cx = ox + t.at.x + t.dir.x * off;
      const cy = oy + t.at.y + t.dir.y * off;
      ctx.beginPath();
      ctx.moveTo(cx - nx * 5, cy - ny * 5);
      ctx.lineTo(cx + nx * 5, cy + ny * 5);
      ctx.stroke();
    }
  }
  for (const p of d.points) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(ox + p.x, oy + p.y, p.minor ? 2.2 : 3.6, 0, Math.PI * 2);
    ctx.fill();
    if (p.label) ctx.fillText(p.label, ox + p.x + 6, oy + p.y - 6);
  }
  ctx.restore();
}

/** cạnh gần điểm p nhất (khoảng cách ≤ maxDist), kèm tham số t ∈ [0,1] dọc cạnh i → i+1; bỏ qua cạnh `except` */
export function nearestSide(verts: P2[], p: P2, maxDist: number, except = -1): {i: number; t: number; d: number} | null {
  let best: {i: number; t: number; d: number} | null = null;
  verts.forEach((a, i) => {
    if (i === except) return;
    const b = verts[(i + 1) % verts.length];
    const d2 = sub(b, a);
    const dd = dot(d2, d2);
    if (dd < 1e-9) return;
    const t = Math.max(0, Math.min(1, dot(sub(p, a), d2) / dd));
    const d = len(sub(p, lerp(a, b, t)));
    if (d <= maxDist && (!best || d < best.d)) best = {i, t, d};
  });
  return best;
}
