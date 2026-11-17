// apps/teacher-board/src/utils/sketchSolid.ts
/**
 * Nhận ra HÌNH KHỐI giáo viên vẽ tay (hình lập phương, hình hộp, chóp, lăng trụ…) từ các nét thẳng:
 *  nét → đơn giản hóa (Douglas–Peucker) → đoạn thẳng → gộp đỉnh gần nhau + nối chữ T → đồ thị (V đỉnh, E cạnh)
 *  → đối chiếu cấu trúc đồ thị với từng loại khối → ước lượng tỉ lệ cạnh (dài/rộng/cao) từ các nhóm cạnh song song.
 * Không dùng AI; chỉ trả kết quả khi cấu trúc khớp rõ ràng, còn lại trả null (để hệ thống quay về AI/nhận dạng chữ).
 */
import type {SolidKind} from './localRouter';

export interface SketchPt {
  x: number;
  y: number;
}
export interface SketchStrokeLike {
  points: SketchPt[];
}

export interface SketchSolid {
  kind: SolidKind;
  dims: {a?: number; b?: number; c?: number; h?: number};
  confidence: number;
  vertices: number;
  edges: number;
  note: string;
  /** Hình do người vẽ, đã nắn thẳng và nối đỉnh (tọa độ cùng hệ với nét vẽ): dùng để giữ nguyên hình thay vì thay bằng mẫu. */
  wire?: SketchWireGraph;
}

export interface SketchWireGraph {
  verts: SketchPt[];
  edges: [number, number][];
}

const dist = (a: SketchPt, b: SketchPt) => Math.hypot(a.x - b.x, a.y - b.y);

function pathLength(p: SketchPt[]) {
  let s = 0;
  for (let i = 1; i < p.length; i++) s += dist(p[i - 1], p[i]);
  return s;
}

function perpDist(p: SketchPt, a: SketchPt, b: SketchPt) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy);
  if (L < 1e-9) return dist(p, a);
  return Math.abs(dx * (a.y - p.y) - (a.x - p.x) * dy) / L;
}

/** Douglas–Peucker (lặp, không đệ quy sâu). */
export function simplify(points: SketchPt[], eps: number): SketchPt[] {
  if (points.length < 3) return points.slice();
  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!;
    let dmax = 0;
    let idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = perpDist(points[i], points[s], points[e]);
      if (d > dmax) {
        dmax = d;
        idx = i;
      }
    }
    if (idx >= 0 && dmax > eps) {
      keep[idx] = true;
      stack.push([s, idx], [idx, e]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function convexHullCount(pts: SketchPt[]): number {
  const p = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
  if (p.length < 3) return p.length;
  const cr = (o: SketchPt, a: SketchPt, b: SketchPt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lo: SketchPt[] = [];
  for (const q of p) {
    while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  const up: SketchPt[] = [];
  for (const q of [...p].reverse()) {
    while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
    up.push(q);
  }
  return lo.length + up.length - 2;
}

interface Graph {
  verts: SketchPt[];
  edges: [number, number][];
}

/** Nét → đồ thị đỉnh/cạnh. Trả null nếu hình có nét cong (không phải đa diện/đa giác). */
export function buildGraph(strokes: SketchStrokeLike[], minSegs = 4): {graph: Graph; D: number} | null {
  const all = strokes.flatMap((s) => s.points);
  if (all.length < 3) return null;
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const p of all) {
    x0 = Math.min(x0, p.x);
    x1 = Math.max(x1, p.x);
    y0 = Math.min(y0, p.y);
    y1 = Math.max(y1, p.y);
  }
  const D = Math.hypot(x1 - x0, y1 - y0);
  if (D < 40) return null;

  // 1. nét → đa tuyến đơn giản; nét gần kín thì khép lại
  const segs: [SketchPt, SketchPt][] = [];
  for (const s of strokes) {
    if (s.points.length < 2 || pathLength(s.points) < 0.05 * D) continue;
    let pts = s.points;
    const closed = dist(pts[0], pts[pts.length - 1]) < 0.09 * D && pathLength(pts) > 0.35 * D;
    if (closed && dist(pts[0], pts[pts.length - 1]) > 1e-6) pts = [...pts, pts[0]];
    const poly = simplify(pts, 0.035 * D);
    // nét cong (vòng tròn, elip, sóng…): quá nhiều đoạn ngắn → không phải hình đa diện
    if (poly.length > 9 && pathLength(poly) / (poly.length - 1) < 0.1 * D) return null;
    for (let i = 1; i < poly.length; i++) if (dist(poly[i - 1], poly[i]) >= 0.05 * D) segs.push([poly[i - 1], poly[i]]);
  }
  if (segs.length < minSegs) return null;

  // 2. gộp các đầu mút gần nhau thành một đỉnh (liên kết đơn, giới hạn bán kính cụm)
  const r = 0.088 * D;
  const ends: SketchPt[] = segs.flatMap(([a, b]) => [a, b]);
  const parent = ends.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < ends.length; i++) for (let j = i + 1; j < ends.length; j++) if (dist(ends[i], ends[j]) < r) parent[find(i)] = find(j);
  const groups = new Map<number, number[]>();
  ends.forEach((_, i) => (groups.get(find(i)) ?? groups.set(find(i), []).get(find(i))!).push(i));
  const ids = [...groups.keys()];
  const verts: SketchPt[] = ids.map((k) => {
    const g = groups.get(k)!;
    return {x: g.reduce((s, i) => s + ends[i].x, 0) / g.length, y: g.reduce((s, i) => s + ends[i].y, 0) / g.length};
  });
  const vid = new Map<number, number>(ids.map((k, i) => [k, i]));
  let edges: [number, number][] = [];
  segs.forEach((_, si) => {
    const a = vid.get(find(si * 2))!;
    const b = vid.get(find(si * 2 + 1))!;
    if (a !== b) edges.push(a < b ? [a, b] : [b, a]);
  });

  // 3. nối chữ T: đầu mút nằm gần thân một cạnh khác → tách cạnh đó tại đỉnh này
  const dedupe = (es: [number, number][]) => {
    const seen = new Set<string>();
    return es.filter(([a, b]) => (seen.has(`${a}-${b}`) ? false : (seen.add(`${a}-${b}`), true)));
  };
  edges = dedupe(edges);
  const degree = () => {
    const d = new Array<number>(verts.length).fill(0);
    for (const [a, b] of edges) {
      d[a]++;
      d[b]++;
    }
    return d;
  };
  for (let iter = 0; iter < 8; iter++) {
    const d = degree();
    let did = false;
    for (let v = 0; v < verts.length && !did; v++) {
      if (d[v] < 1 || d[v] > 2) continue;
      for (let ei = 0; ei < edges.length; ei++) {
        const [a, b] = edges[ei];
        if (a === v || b === v) continue;
        const A = verts[a];
        const B = verts[b];
        const L = dist(A, B);
        if (L < 1e-6) continue;
        const t = ((verts[v].x - A.x) * (B.x - A.x) + (verts[v].y - A.y) * (B.y - A.y)) / (L * L);
        if (t > 0.1 && t < 0.9 && perpDist(verts[v], A, B) < r) {
          edges.splice(ei, 1, [Math.min(a, v), Math.max(a, v)], [Math.min(v, b), Math.max(v, b)]);
          did = true;
          break;
        }
      }
    }
    if (!did) break;
    edges = dedupe(edges);
  }

  // 3b. khử cựa ngắn (spur): đỉnh bậc 1 nối bởi đoạn rất ngắn do nét thừa ở góc
  for (let guard = 0; guard < 8; guard++) {
    const d = degree();
    let did = false;
    for (let ei = 0; ei < edges.length; ei++) {
      const [a, b] = edges[ei];
      if ((d[a] === 1 && d[b] >= 3) || (d[b] === 1 && d[a] >= 3)) {
        if (dist(verts[a], verts[b]) < 0.13 * D) {
          edges.splice(ei, 1);
          did = true;
          break;
        }
      }
    }
    if (!did) break;
  }

  // 4. bỏ đỉnh bậc 2 nằm trên đường thẳng (một cạnh vẽ bằng 2 nét)
  for (let guard = 0; guard < 20; guard++) {
    const d = degree();
    let did = false;
    for (let v = 0; v < verts.length; v++) {
      if (d[v] !== 2) continue;
      const inc = edges.filter(([a, b]) => a === v || b === v);
      const n1 = inc[0][0] === v ? inc[0][1] : inc[0][0];
      const n2 = inc[1][0] === v ? inc[1][1] : inc[1][0];
      if (n1 === n2) continue;
      const a1 = Math.atan2(verts[n1].y - verts[v].y, verts[n1].x - verts[v].x);
      const a2 = Math.atan2(verts[n2].y - verts[v].y, verts[n2].x - verts[v].x);
      let diff = Math.abs(a1 - a2);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      if (diff > (160 * Math.PI) / 180) {
        edges = dedupe([...edges.filter(([a, b]) => a !== v && b !== v), n1 < n2 ? ([n1, n2] as [number, number]) : ([n2, n1] as [number, number])]);
        did = true;
        break;
      }
    }
    if (!did) break;
  }

  // 5. loại đỉnh/cạnh còn sót và đánh số lại
  const d = degree();
  const used = verts.map((_, i) => d[i] > 0);
  const remap = new Map<number, number>();
  const nv: SketchPt[] = [];
  verts.forEach((p, i) => {
    if (used[i]) {
      remap.set(i, nv.length);
      nv.push(p);
    }
  });
  return {graph: {verts: nv, edges: edges.map(([a, b]) => [remap.get(a)!, remap.get(b)!] as [number, number])}, D};
}

/** Gom hướng các cạnh theo góc (mod π) thành các nhóm song song; trả độ dài trung bình, góc và số cạnh từng nhóm. */
function directionGroups(g: Graph): {len: number; ang: number; n: number}[] {
  const TH = (13 * Math.PI) / 180;
  const items = g.edges
    .map(([a, b]) => {
      const dx = g.verts[b].x - g.verts[a].x;
      const dy = g.verts[b].y - g.verts[a].y;
      let ang = Math.atan2(dy, dx);
      if (ang < 0) ang += Math.PI;
      if (ang >= Math.PI) ang -= Math.PI;
      return {ang, len: Math.hypot(dx, dy)};
    })
    .sort((p, q) => p.ang - q.ang);
  let clusters: {ang: number; len: number}[][] = [];
  for (const it of items) {
    const last = clusters[clusters.length - 1];
    const mean = last ? last.reduce((s, q) => s + q.ang, 0) / last.length : 0;
    if (last && it.ang - mean < TH) last.push(it);
    else clusters.push([it]);
  }
  // góc 0 và góc gần π là cùng một hướng
  if (clusters.length > 1) {
    const first = clusters[0];
    const last = clusters[clusters.length - 1];
    const fm = first.reduce((s, q) => s + q.ang, 0) / first.length;
    const lm = last.reduce((s, q) => s + q.ang, 0) / last.length;
    if (fm + Math.PI - lm < TH) {
      clusters = [[...last.map((q) => ({ang: q.ang - Math.PI, len: q.len})), ...first], ...clusters.slice(1, -1)];
    }
  }
  return clusters
    .map((x) => ({ang: (x.reduce((s, q) => s + q.ang, 0) / x.length + Math.PI) % Math.PI, len: x.reduce((s, q) => s + q.len, 0) / x.length, n: x.length}))
    .filter((x) => x.n >= 2)
    .sort((p, q) => q.n - p.n);
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const axisDev = (ang: number) => Math.min(ang % (Math.PI / 2), Math.PI / 2 - (ang % (Math.PI / 2)));

function boxDims(g: Graph): {kind: 'cube' | 'box'; dims: {a?: number; b?: number; c?: number}} {
  const groups = directionGroups(g);
  if (groups.length < 3) return {kind: 'cube', dims: {a: 2}};
  const g3 = groups.slice().sort((p, q) => q.n - p.n).slice(0, 3);
  // nhóm "chiều sâu" = nhóm lệch trục ngang/dọc nhiều nhất; hai nhóm còn lại gần trục → hình chiếu xiên (cabinet)
  const dev = g3.map((x) => axisDev(x.ang));
  const di = dev.indexOf(Math.max(...dev));
  const rest = g3.filter((_, i) => i !== di);
  const oblique = Math.max(...rest.map((x) => axisDev(x.ang))) < (14 * Math.PI) / 180 && dev[di] > (14 * Math.PI) / 180;
  const horiz = rest[0].ang < Math.PI / 4 || rest[0].ang > (3 * Math.PI) / 4 ? rest[0] : rest[1];
  const vert = horiz === rest[0] ? rest[1] : rest[0];
  const w = horiz.len;
  const h = vert.len;
  const dep = oblique ? g3[di].len / 0.6 : g3[di].len;
  const lens = oblique ? [w, dep, h] : g3.map((x) => x.len);
  const ratio = Math.max(...lens) / Math.max(1e-6, Math.min(...lens));
  // hình chiếu xiên đã hiệu chỉnh độ rút ngắn chiều sâu → so sánh chặt; xoay tùy ý thì ba cạnh vốn rút ngắn khác nhau → chỉ coi là hộp khi chênh rất lớn
  if (ratio < (oblique ? 1.55 : 2.4)) return {kind: 'cube', dims: {a: 2}};
  const s = 3 / Math.max(...lens);
  const dims = oblique
    ? {a: clamp(+(w * s).toFixed(1), 1, 5), b: clamp(+(dep * s).toFixed(1), 1, 5), c: clamp(+(h * s).toFixed(1), 1, 5)}
    : {a: clamp(+(lens[0] * s).toFixed(1), 1, 5), b: clamp(+(lens[1] * s).toFixed(1), 1, 5), c: clamp(+(lens[2] * s).toFixed(1), 1, 5)};
  return {kind: 'box', dims};
}

/** Nhận khối từ nét vẽ tay. Trả null nếu cấu trúc không khớp rõ ràng một khối đã hỗ trợ. */
export function detectSolidFromStrokes(strokes: SketchStrokeLike[]): SketchSolid | null {
  const built = buildGraph(strokes);
  if (!built) return null;
  const {graph: g} = built;
  const V = g.verts.length;
  const E = g.edges.length;
  if (V < 4 || E < 5) return null;
  const deg = new Array<number>(V).fill(0);
  for (const [a, b] of g.edges) {
    deg[a]++;
    deg[b]++;
  }
  const H = convexHullCount(g.verts);
  const interior = V - H;
  const maxDeg = Math.max(...deg);
  const deg3Plus = deg.filter((d) => d >= 3).length;
  const pGroups = directionGroups(g);
  const mk = (kind: SolidKind, confidence: number, note: string, dims: SketchSolid['dims'] = {}): SketchSolid => ({
    kind,
    dims,
    confidence,
    vertices: V,
    edges: E,
    note,
    wire: {verts: g.verts.map((p) => ({x: p.x, y: p.y})), edges: g.edges.map(([a, b]) => [a, b] as [number, number])},
  });

  // 1. Hình hộp / lập phương:
  // - Chuẩn: 8 đỉnh, 10–14 cạnh (đủ nét khuất), hoặc 7 đỉnh, 8–10 cạnh (chỉ vẽ 3 mặt nhìn thấy: 6 đỉnh bao lồi + 1 đỉnh trong nối 3 cạnh)
  // - Thực tế vẽ tay: 2 hình vuông/chữ nhật chồng nhau nối bởi 3–4 đoạn xiên (7–9 đỉnh, 9–14 cạnh, có ≥ 2 hướng cạnh song song)
  if (
    (V === 8 && E >= 10 && E <= 14) ||
    (V === 7 && E >= 8 && E <= 11 && interior >= 1 && maxDeg >= 3) ||
    (V >= 7 && V <= 9 && E >= 9 && E <= 14 && pGroups.length >= 2 && deg3Plus >= 4)
  ) {
    const bd = boxDims(g);
    const conf = V === 8 && E === 12 ? 0.94 : V >= 7 && V <= 8 && E >= 9 && E <= 13 ? 0.85 : 0.76;
    return mk(bd.kind, conf, `${V} đỉnh, ${E} cạnh`, bd.dims);
  }

  // 2. Chóp tứ giác S.ABCD:
  // - Chuẩn: 5 đỉnh, 6–9 cạnh, đỉnh chóp S nối xuống 3–4 đỉnh đáy (hoặc đỉnh S cao nhất theo trục y nối với đáy tứ giác)
  if (V === 5 && E >= 6 && E <= 9 && (maxDeg >= 3 || deg3Plus >= 3)) {
    const conf = E === 8 && maxDeg >= 4 ? 0.9 : E >= 7 ? 0.8 : 0.74;
    return mk('pyramid4', conf, `${V} đỉnh, ${E} cạnh, đỉnh chóp bậc ${maxDeg}`);
  }

  // 3. Bát diện đều: 6 đỉnh, 10–12 cạnh, các đỉnh bậc ≥ 3–4
  if (V === 6 && E >= 10 && E <= 13 && maxDeg >= 4 && deg3Plus >= 5) {
    return mk('octahedron', E === 12 ? 0.88 : 0.78, `${V} đỉnh, ${E} cạnh`);
  }

  // 4. Lăng trụ tam giác ABC.A'B'C': 6 đỉnh, 7–10 cạnh, tối đa bậc 3–4
  if (V === 6 && E >= 7 && E <= 10 && deg3Plus >= 4) {
    return mk('prism3', E === 9 ? 0.86 : 0.76, `${V} đỉnh, ${E} cạnh`);
  }

  // 5. Tứ diện / Chóp tam giác S.ABC:
  // - 4 đỉnh nối 5–6 cạnh, hoặc 5 đỉnh 6 cạnh (khi 2 đường chéo cắt nhau tạo giao điểm thứ 5)
  if ((V === 4 && (E === 6 || E === 5)) || (V === 5 && E === 6 && interior === 1)) {
    return mk('pyramid3', E === 6 && V === 4 ? 0.82 : 0.74, `${V} đỉnh, ${E} cạnh`);
  }

  return null;
}

/** Khối vẽ tay trên bảng, kể cả vẽ một nét liền không nhấc bút: từ 4 nét trở lên dùng ngưỡng thường của nơi gọi;
 * ít hơn 4 nét (một nét liền, hay chữ viết liền) chỉ nhận khi cấu trúc khớp rất rõ, để chữ không bị coi là khối. */
export function detectSolidSketch(strokes: SketchStrokeLike[]): SketchSolid | null {
  if (strokes.length === 0) return null;
  const r = detectSolidFromStrokes(strokes);
  return r && (strokes.length >= 4 || r.confidence >= 0.9) ? r : null;
}

export type PlaneShapeKind =
  | 'triangle_equilateral'
  | 'triangle_right'
  | 'triangle_isosceles'
  | 'triangle_scalene'
  | 'square'
  | 'rectangle'
  | 'rhombus'
  | 'trapezoid'
  | 'quadrilateral'
  | 'parallelogram'
  | 'pentagon'
  | 'hexagon'
  | 'heptagon'
  | 'octagon';

export interface SketchPlaneShape {
  kind: PlaneShapeKind;
  title: string;
  /** Tọa độ chuẩn hóa trong miền [-3.5..3.5, -2.2..2.2] cho DynamicGeometryEngine */
  vertices2D: [number, number][];
  confidence: number;
  anglesDeg: number[];
  sideLengths: number[];
  note: string;
}

/**
 * Nhận diện hình phẳng 2D vẽ tay (Tam giác thường / vuông / cân / đều, Hình vuông, Hình chữ nhật, Hình bình hành)
 * từ 1 đến 4 nét bút. Trả về tọa độ đỉnh chuẩn hóa để dựng ngay vào hình học động tương tác.
 */
export function detectPlaneShapeFromStrokes(strokes: SketchStrokeLike[]): SketchPlaneShape | null {
  if (!strokes.length || strokes.length > 8) return null;
  const built = buildGraph(strokes, 3);
  if (!built) return null;
  const {graph: g, D} = built;
  if (D < 45) return null;
  const V = g.verts.length;
  const E = g.edges.length;
  if (V < 3 || V > 8 || E !== V) return null;

  // Mọi đỉnh trong đa giác đơn khép kín phải có bậc đúng bằng 2
  const deg = new Array<number>(V).fill(0);
  for (const [a, b] of g.edges) {
    deg[a]++;
    deg[b]++;
  }
  if (!deg.every((d) => d === 2)) return null;

  // Sắp xếp các đỉnh theo chu trình khép kín ngược chiều kim đồng hồ trong hệ tọa độ toán học (y hướng lên)
  const cx = g.verts.reduce((s, p) => s + p.x, 0) / V;
  const cy = g.verts.reduce((s, p) => s + p.y, 0) / V;
  const ordered = [...g.verts].sort((a, b) => Math.atan2(-(a.y - cy), a.x - cx) - Math.atan2(-(b.y - cy), b.x - cx));

  // Tính độ dài các cạnh và các góc trong (độ)
  const sides: number[] = [];
  const angles: number[] = [];
  let signedArea = 0;
  for (let i = 0; i < V; i++) {
    const cur = ordered[i];
    const nxt = ordered[(i + 1) % V];
    const prv = ordered[(i - 1 + V) % V];
    sides.push(dist(cur, nxt));
    signedArea += cur.x * (-nxt.y) - nxt.x * (-cur.y);

    const v1x = prv.x - cur.x;
    const v1y = -(prv.y - cur.y);
    const v2x = nxt.x - cur.x;
    const v2y = -(nxt.y - cur.y);
    const l1 = Math.hypot(v1x, v1y) || 1;
    const l2 = Math.hypot(v2x, v2y) || 1;
    const cosA = Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / (l1 * l2)));
    angles.push((Math.acos(cosA) * 180) / Math.PI);
  }

  const area = Math.abs(signedArea) * 0.5;
  // Loại bỏ hình quá dẹt (suy biến thành đoạn thẳng hoặc chữ V hẹp)
  if (area < 0.08 * D * D || angles.some((a) => a < 18 || a > 162)) return null;

  // Chuẩn hóa tọa độ các đỉnh về khung [-2.5..2.5, -1.8..1.8] của DynamicGeometryEngine
  const scale = 3.8 / Math.max(D, 1);
  const vertices2D: [number, number][] = ordered.map((p) => [
    Number(((p.x - cx) * scale).toFixed(2)),
    Number((-(p.y - cy) * scale).toFixed(2)),
  ]);

  if (V === 3) {
    const maxS = Math.max(...sides);
    const minS = Math.min(...sides);
    const sideDiffs = [
      Math.abs(sides[0] - sides[1]) / maxS,
      Math.abs(sides[1] - sides[2]) / maxS,
      Math.abs(sides[2] - sides[0]) / maxS,
    ];
    const hasRightAngle = angles.some((a) => Math.abs(a - 90) <= 7);
    const isEquilateral = (maxS - minS) / maxS <= 0.08 && angles.every((a) => Math.abs(a - 60) <= 7);
    const isIsosceles = sideDiffs.some((d) => d <= 0.08);

    let kind: PlaneShapeKind = 'triangle_scalene';
    let title = 'Tam giác ABC';
    if (isEquilateral) {
      kind = 'triangle_equilateral';
      title = 'Tam giác đều ABC';
    } else if (hasRightAngle && isIsosceles) {
      kind = 'triangle_right';
      title = 'Tam giác vuông cân ABC';
    } else if (hasRightAngle) {
      kind = 'triangle_right';
      title = 'Tam giác vuông ABC';
    } else if (isIsosceles) {
      kind = 'triangle_isosceles';
      title = 'Tam giác cân ABC';
    }

    return {
      kind,
      title,
      vertices2D,
      confidence: strokes.length === 3 ? 0.92 : 0.86,
      anglesDeg: angles.map((a) => Math.round(a)),
      sideLengths: sides.map((s) => Number((s * scale).toFixed(2))),
      note: `3 đỉnh, góc ${angles.map((a) => `${Math.round(a)}°`).join(' · ')}`,
    };
  }

  if (V >= 5) {
    // đa giác lồi 5–8 cạnh: góc trong dùng acos nên chỉ đúng với đa giác lồi
    const convex = ordered.every((p, i) => {
      const a = ordered[(i + 1) % V], b = ordered[(i + 2) % V];
      return (a.x - p.x) * (b.y - a.y) - (a.y - p.y) * (b.x - a.x) > 0;
    }) || ordered.every((p, i) => {
      const a = ordered[(i + 1) % V], b = ordered[(i + 2) % V];
      return (a.x - p.x) * (b.y - a.y) - (a.y - p.y) * (b.x - a.x) < 0;
    });
    if (!convex) return null;
    const names = ['', '', '', '', '', 'Ngũ giác', 'Lục giác', 'Thất giác', 'Bát giác'];
    const kinds: PlaneShapeKind[] = ['pentagon', 'hexagon', 'heptagon', 'octagon'];
    const maxS = Math.max(...sides);
    const regular = (maxS - Math.min(...sides)) / maxS <= 0.18 && angles.every((a) => Math.abs(a - ((V - 2) * 180) / V) <= 14);
    const letters = 'ABCDEFGH'.slice(0, V);
    return {
      kind: kinds[V - 5],
      title: `${names[V]}${regular ? ' đều' : ''} ${letters}`,
      vertices2D,
      confidence: regular ? 0.85 : 0.78,
      anglesDeg: angles.map((a) => Math.round(a)),
      sideLengths: sides.map((x) => Number((x * scale).toFixed(2))),
      note: `${V} đỉnh${regular ? ', đa giác đều' : ''}, góc ${angles.map((a) => `${Math.round(a)}°`).join(' · ')}`,
    };
  }

  // V === 4: Tứ giác
  const maxS = Math.max(...sides);
  const minS = Math.min(...sides);
  const oppEqual = Math.abs(sides[0] - sides[2]) / maxS <= 0.18 && Math.abs(sides[1] - sides[3]) / maxS <= 0.18;
  const rightCount = angles.filter((a) => Math.abs(a - 90) <= 14).length;
  const allSidesNear = (maxS - minS) / maxS <= 0.18;

  // hai cạnh đối song song khi góc giữa chúng < ~9°
  const parallel = (i: number, j: number) => {
    const a = ordered[i], b = ordered[(i + 1) % V], c = ordered[j], d = ordered[(j + 1) % V];
    const ux = b.x - a.x, uy = b.y - a.y, vx = d.x - c.x, vy = d.y - c.y;
    return Math.abs(ux * vy - uy * vx) / ((Math.hypot(ux, uy) || 1) * (Math.hypot(vx, vy) || 1)) < 0.156;
  };
  const par02 = parallel(0, 2);
  const par13 = parallel(1, 3);

  let kind: PlaneShapeKind = 'quadrilateral';
  let title = 'Tứ giác ABCD';
  if (rightCount >= 3 && allSidesNear) {
    kind = 'square';
    title = 'Hình vuông ABCD';
  } else if (rightCount >= 3) {
    kind = 'rectangle';
    title = 'Hình chữ nhật ABCD';
  } else if (oppEqual && par02 && par13) {
    kind = allSidesNear ? 'rhombus' : 'parallelogram';
    title = allSidesNear ? 'Hình thoi ABCD' : 'Hình bình hành ABCD';
  } else if (par02 !== par13) {
    kind = 'trapezoid';
    title = 'Hình thang ABCD';
  }

  return {
    kind,
    title,
    vertices2D,
    confidence: rightCount >= 3 ? 0.88 : 0.8,
    anglesDeg: angles.map((a) => Math.round(a)),
    sideLengths: sides.map((s) => Number((s * scale).toFixed(2))),
    note: `4 đỉnh, góc ${angles.map((a) => `${Math.round(a)}°`).join(' · ')}`,
  };
}

/** Các nét LỚN của hình (khung hình); bỏ nhãn đỉnh, dấu góc vuông, dấu bằng nhau… viết kèm. Không có nét nào đủ lớn thì giữ nguyên tất cả. */
export function frameStrokes<T extends {points: {x: number; y: number}[]}>(ink: T[], ratio = 0.3): T[] {
  const side = (q: T) => Math.max(Math.max(...q.points.map((p) => p.x)) - Math.min(...q.points.map((p) => p.x)), Math.max(...q.points.map((p) => p.y)) - Math.min(...q.points.map((p) => p.y)));
  const span = Math.max(1, ...ink.map(side));
  const big = ink.filter((q) => side(q) >= span * ratio);
  if (big.length === 0) return ink;
  // cạnh NGẮN của hình (cạnh bên hình hộp dẹt, cạnh đáy chóp vẽ xa): nét gần thẳng, hai đầu chạm vào khung → vẫn là cạnh, không phải nhãn
  const near = (p: SketchPt, qs: T[]) => qs.some((q) => q.points.some((r) => dist(p, r) < 0.1 * span));
  const keep = new Set(big);
  for (let changed = true; changed; ) {
    changed = false;
    for (const q of ink) {
      if (keep.has(q) || side(q) < 0.12 * span || q.points.length < 2) continue;
      const [a, b] = [q.points[0], q.points[q.points.length - 1]];
      const straight = pathLength(q.points) <= 1.15 * dist(a, b);
      const frame = [...keep];
      if (straight && near(a, frame) && near(b, frame)) {
        keep.add(q);
        changed = true;
      }
    }
  }
  return ink.filter((q) => keep.has(q));
}

/** Đường tròn của công cụ Hình: khép kín (điểm cuối trùng điểm đầu). */
export function circleStrokePoints(cx: number, cy: number, r: number): SketchPt[] {
  const n = Math.max(24, Math.ceil(r / 4));
  return Array.from({length: n + 1}, (_, i) => ({x: cx + Math.cos((2 * Math.PI * i) / n) * r, y: cy + Math.sin((2 * Math.PI * i) / n) * r}));
}

/** Mũi tên của công cụ Hình: thân rồi hai cánh ở đầu, trong MỘT nét (đầu mũi tên không mất khi lưu). */
export function arrowStrokePoints(x1: number, y1: number, x2: number, y2: number, head = 14): SketchPt[] {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = Math.min(head, Math.hypot(x2 - x1, y2 - y1) * 0.45);
  const wing = (s: number) => ({x: x2 - h * Math.cos(a + s * (Math.PI / 7)), y: y2 - h * Math.sin(a + s * (Math.PI / 7))});
  return [{x: x1, y: y1}, {x: x2, y: y2}, wing(1), {x: x2, y: y2}, wing(-1)];
}

/**
 * Cụm nét của hình VỪA vẽ: bắt đầu từ nét cuối, gom các nét có khung chạm/gần (≤ 12% cỡ cụm) nét đã gom.
 * Chữ viết, hình khác ở xa trên bảng không bị nhận nhầm vào hình (và không bị xóa khi thay bằng hình dựng).
 */
export function recentShapeCluster<T extends {points: SketchPt[]}>(strokes: T[]): T[] {
  if (strokes.length === 0) return [];
  const box = (q: T) => {
    const xs = q.points.map((p) => p.x);
    const ys = q.points.map((p) => p.y);
    return {x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys)};
  };
  const boxes = new Map(strokes.map((q) => [q, box(q)]));
  const out = [strokes[strokes.length - 1]];
  for (let grew = true; grew; ) {
    grew = false;
    const bs = out.map((q) => boxes.get(q)!);
    const all = {x0: Math.min(...bs.map((b) => b.x0)), x1: Math.max(...bs.map((b) => b.x1)), y0: Math.min(...bs.map((b) => b.y0)), y1: Math.max(...bs.map((b) => b.y1))};
    const pad = 0.12 * Math.max(40, all.x1 - all.x0, all.y1 - all.y0);
    for (const q of strokes) {
      if (out.includes(q)) continue;
      const b = boxes.get(q)!;
      if (b.x0 <= all.x1 + pad && b.x1 >= all.x0 - pad && b.y0 <= all.y1 + pad && b.y1 >= all.y0 - pad && bs.some((c) => b.x0 <= c.x1 + pad && b.x1 >= c.x0 - pad && b.y0 <= c.y1 + pad && b.y1 >= c.y0 - pad)) {
        out.push(q);
        grew = true;
      }
    }
  }
  return strokes.filter((q) => out.includes(q));
}

/** Hình vuông kéo từ góc (x1, y1): cạnh = cạnh lớn hơn của khung kéo, theo đúng hướng kéo. */
export function squareStrokePoints(x1: number, y1: number, x2: number, y2: number): SketchPt[] {
  const s = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  const [ex, ey] = [x1 + Math.sign(x2 - x1 || 1) * s, y1 + Math.sign(y2 - y1 || 1) * s];
  return [{x: x1, y: y1}, {x: ex, y: y1}, {x: ex, y: ey}, {x: x1, y: ey}, {x: x1, y: y1}];
}

/** Tam giác cân trong khung kéo: đỉnh ở giữa cạnh phía điểm bắt đầu, đáy ở phía điểm thả. */
export function triangleStrokePoints(x1: number, y1: number, x2: number, y2: number): SketchPt[] {
  return [{x: (x1 + x2) / 2, y: y1}, {x: x2, y: y2}, {x: x1, y: y2}, {x: (x1 + x2) / 2, y: y1}];
}

/** Nét do công cụ Hình tạo (id `shape-…`): vẽ nối thẳng các đỉnh, không làm mượt như nét bút. */
export const isShapeToolStroke = (s: {id?: string}) => !!s.id?.startsWith('shape-');

export interface SketchCircle {
  cx: number;
  cy: number;
  r: number;
  /** nét làm thành đường tròn */
  circle: number[];
  /** các nét còn lại (đa giác nội tiếp, đường kính…) */
  rest: number[];
}

/** Đường tròn khớp nhất (bình phương tối thiểu, Kåsa) với các điểm; null nếu suy biến. */
export function fitCircle(pts: SketchPt[]): {cx: number; cy: number; r: number; rms: number; cover: number} | null {
  if (pts.length < 6) return null;
  // hệ chuẩn cho x² + y² + Dx + Ey + F = 0 (dời gốc về trọng tâm cho ổn định số)
  const mx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const my = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  let [sxx, sxy, syy, sx, sy, sxz, syz, sz, n] = [0, 0, 0, 0, 0, 0, 0, 0, pts.length];
  for (const p of pts) {
    const [x, y] = [p.x - mx, p.y - my];
    const z = x * x + y * y;
    sxx += x * x; sxy += x * y; syy += y * y; sx += x; sy += y; sxz += x * z; syz += y * z; sz += z;
  }
  const A = [[sxx, sxy, sx], [sxy, syy, sy], [sx, sy, n]];
  const b = [-sxz, -syz, -sz];
  const det = (m: number[][]) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const d0 = det(A);
  if (Math.abs(d0) < 1e-9) return null;
  const col = (k: number) => A.map((row, i) => row.map((v, j) => (j === k ? b[i] : v)));
  const [D, E, F] = [det(col(0)) / d0, det(col(1)) / d0, det(col(2)) / d0];
  const [cx, cy] = [-D / 2, -E / 2];
  const r2 = cx * cx + cy * cy - F;
  if (!(r2 > 0)) return null;
  const r = Math.sqrt(r2);
  const rms = Math.sqrt(pts.reduce((s, p) => s + (Math.hypot(p.x - mx - cx, p.y - my - cy) - r) ** 2, 0) / pts.length);
  // độ phủ góc: số ô 10° có điểm rơi vào
  const bins = new Set(pts.map((p) => Math.floor(((Math.atan2(p.y - my - cy, p.x - mx - cx) + Math.PI) / (2 * Math.PI)) * 36) % 36));
  return {cx: cx + mx, cy: cy + my, r, rms, cover: (bins.size / 36) * 360};
}

/**
 * Đường tròn vẽ tay (một nét, hoặc vài cung nối lại): nét CONG (Douglas–Peucker giữ ≥ 8 đỉnh, không có góc gãy như đa giác),
 * sai lệch bán kính ≤ 9% và phủ ≥ 300°. Hình vuông/đa giác vẽ một nét không bị nhận là tròn.
 */
export function detectCircleSketch(strokes: SketchStrokeLike[]): SketchCircle | null {
  const round = (pts: SketchPt[]) => {
    const f = fitCircle(pts);
    if (!f || f.r < 15 || f.rms > 0.09 * f.r || f.cover < 300) return null;
    return simplify(pts, 0.04 * 2 * f.r).length >= 8 ? f : null;
  };
  const curved = (pts: SketchPt[]) => pts.length >= 6 && pathLength(pts) > 1.25 * dist(pts[0], pts[pts.length - 1]) && simplify(pts, 0.04 * pathLength(pts) / 3).length >= 5;
  for (let i = 0; i < strokes.length; i++) {
    const f = round(strokes[i].points);
    if (f) return {cx: f.cx, cy: f.cy, r: f.r, circle: [i], rest: strokes.map((_, k) => k).filter((k) => k !== i)};
  }
  // vài cung (nhấc bút giữa chừng): gộp các nét cong
  const cur = strokes.map((s, i) => (curved(s.points) ? i : -1)).filter((i) => i >= 0);
  if (cur.length >= 2) {
    const f = round(cur.flatMap((i) => strokes[i].points));
    if (f) return {cx: f.cx, cy: f.cy, r: f.r, circle: cur, rest: strokes.map((_, k) => k).filter((k) => !cur.includes(k))};
  }
  return null;
}
