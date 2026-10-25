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

/** Nét → đồ thị đỉnh/cạnh. Trả null nếu hình có nét cong (không phải đa diện). */
export function buildGraph(strokes: SketchStrokeLike[]): {graph: Graph; D: number} | null {
  const all = strokes.flatMap((s) => s.points);
  if (all.length < 4) return null;
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
    if (closed) pts = [...pts, pts[0]];
    const poly = simplify(pts, 0.035 * D);
    // nét cong (vòng tròn, elip, sóng…): quá nhiều đoạn ngắn → không phải hình đa diện
    if (poly.length > 9 && pathLength(poly) / (poly.length - 1) < 0.1 * D) return null;
    for (let i = 1; i < poly.length; i++) if (dist(poly[i - 1], poly[i]) >= 0.05 * D) segs.push([poly[i - 1], poly[i]]);
  }
  if (segs.length < 4) return null;

  // 2. gộp các đầu mút gần nhau thành một đỉnh (liên kết đơn, giới hạn bán kính cụm)
  const r = 0.075 * D;
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

  // 3. nối chữ T: đầu mút lẻ loi nằm sát giữa một cạnh khác → tách cạnh đó tại đỉnh này
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
  for (let iter = 0; iter < 6; iter++) {
    const d = degree();
    let did = false;
    for (let v = 0; v < verts.length && !did; v++) {
      if (d[v] !== 1) continue;
      for (let ei = 0; ei < edges.length; ei++) {
        const [a, b] = edges[ei];
        if (a === v || b === v) continue;
        const A = verts[a];
        const B = verts[b];
        const L = dist(A, B);
        const t = ((verts[v].x - A.x) * (B.x - A.x) + (verts[v].y - A.y) * (B.y - A.y)) / (L * L);
        if (t > 0.12 && t < 0.88 && perpDist(verts[v], A, B) < r) {
          edges.splice(ei, 1, [Math.min(a, v), Math.max(a, v)], [Math.min(v, b), Math.max(v, b)]);
          did = true;
          break;
        }
      }
    }
    if (!did) break;
    edges = dedupe(edges);
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
  if (ratio < (oblique ? 1.3 : 2.4)) return {kind: 'cube', dims: {a: 2}};
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
  const mk = (kind: SolidKind, confidence: number, note: string, dims: SketchSolid['dims'] = {}): SketchSolid => ({kind, dims, confidence, vertices: V, edges: E, note});

  // Hình hộp / lập phương: 8 đỉnh–12 cạnh (vẽ cả nét khuất) hoặc 7 đỉnh–9 cạnh (bỏ nét khuất, đỉnh trong bậc 3)
  if ((V === 8 && E >= 11 && E <= 13) || (V === 7 && E === 9 && interior === 1 && maxDeg === 3)) {
    const bd = boxDims(g);
    return mk(bd.kind, V === 8 && E === 12 ? 0.92 : 0.82, `${V} đỉnh, ${E} cạnh`, bd.dims);
  }
  // Chóp tứ giác: 5 đỉnh, 7–8 cạnh, đỉnh chóp bậc 4
  if (V === 5 && (E === 8 || E === 7) && maxDeg >= 4) return mk('pyramid4', E === 8 ? 0.88 : 0.78, `${V} đỉnh, ${E} cạnh, đỉnh chóp bậc ${maxDeg}`);
  // Lăng trụ tam giác: 6 đỉnh, 9 cạnh (hoặc 8 nếu bỏ một nét khuất), mọi đỉnh bậc 3 (hoặc 2–3)
  if (V === 6 && (E === 9 || E === 8) && maxDeg === 3) return mk('prism3', E === 9 ? 0.85 : 0.7, `${V} đỉnh, ${E} cạnh`);
  // Tứ diện: 4 đỉnh nối đủ 6 cạnh (hai đường chéo cắt nhau hoặc một đỉnh nằm trong tam giác)
  if (V === 4 && E === 6) return mk('pyramid3', 0.7, '4 đỉnh nối đủ 6 cạnh');
  return null;
}
