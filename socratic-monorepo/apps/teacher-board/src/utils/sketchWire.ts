/**
 * Hình khối giữ nguyên theo nét người vẽ: các đỉnh và cạnh lấy từ nét vẽ (đã nắn thẳng, nối đỉnh), KHÔNG thay bằng mẫu 3D.
 * Mẫu 3D chỉ dùng để (1) đặt tên đỉnh A, B, C… A', B'… và (2) đoán cạnh nào bị khuất để vẽ nét đứt:
 *  - ghép đồ thị nét vẽ vào đồ thị của khối mẫu (đỉnh nào ứng đỉnh nào),
 *  - ước lượng phép chiếu song song (affine 3D → 2D) khớp nhất với các đỉnh đã vẽ,
 *  - từ hướng nhìn suy ra mặt nào thấy, cạnh nào chỉ nằm giữa các mặt khuất.
 * Không khớp được (vẽ phối cảnh quá lệch, thiếu nhiều nét…) thì mọi cạnh để nét liền, nhãn theo thứ tự.
 */
import {centroid, cross, dot, edgesOf, faceNormal, makeSolid, type SolidDims, type V3} from './solids';
import type {SolidKind} from './localRouter';
import type {SketchWireGraph} from './sketchSolid';

export interface SketchWire {
  verts: {x: number; y: number}[];
  edges: {a: number; b: number; hidden: boolean}[];
  labels: string[];
  /** true nếu đã ghép được với khối mẫu (nhãn và nét đứt có căn cứ) */
  fitted: boolean;
}

const LETTERS = 'ABCDEFGHIJKLMNOP'.split('');
const NODE_CAP = 300_000;
/** sai số khớp tối đa (tỉ lệ so với đường chéo hình) để coi là cùng một phép chiếu song song */
const FIT_TOL = 0.085;

/** Giải hệ 4×4 (khử Gauss, chọn trụ); trả null nếu suy biến. */
function solve4(A: number[][], b: number[]): number[] | null {
  const n = 4;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-9) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}

/** Bình phương tối thiểu: [x y z 1]·row ≈ đích. Trả hệ số và sai số bình phương trung bình căn. */
function fitAffine(src: V3[], dst: {x: number; y: number}[]): {rows: [number[], number[]]; rms: number} | null {
  const AtA = [0, 1, 2, 3].map(() => [0, 0, 0, 0]);
  const Atx = [0, 0, 0, 0];
  const Aty = [0, 0, 0, 0];
  src.forEach((v, i) => {
    const a = [v[0], v[1], v[2], 1];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) AtA[r][c] += a[r] * a[c];
      Atx[r] += a[r] * dst[i].x;
      Aty[r] += a[r] * dst[i].y;
    }
  });
  const rx = solve4(AtA, Atx);
  const ry = solve4(AtA, Aty);
  if (!rx || !ry) return null;
  let se = 0;
  src.forEach((v, i) => {
    const px = rx[0] * v[0] + rx[1] * v[1] + rx[2] * v[2] + rx[3];
    const py = ry[0] * v[0] + ry[1] * v[1] + ry[2] * v[2] + ry[3];
    se += (px - dst[i].x) ** 2 + (py - dst[i].y) ** 2;
  });
  return {rows: [rx, ry], rms: Math.sqrt(se / src.length)};
}

export function buildSketchWire(kind: SolidKind, dims: SolidDims | undefined, graph: SketchWireGraph, origin: {x: number; y: number}): SketchWire {
  const verts = graph.verts.map((p) => ({x: p.x - origin.x, y: p.y - origin.y}));
  const plain: SketchWire = {
    verts,
    edges: graph.edges.map(([a, b]) => ({a, b, hidden: false})),
    labels: verts.map((_, i) => LETTERS[i] ?? ''),
    fitted: false,
  };
  const n = verts.length;
  const solid = makeSolid(kind, dims ?? {});
  const m = solid.verts.length;
  if (n < 4 || n > m) return plain;

  const tEdges = edgesOf(solid.faces);
  const adj = Array.from({length: m}, () => new Array<boolean>(m).fill(false));
  for (const [a, b] of tEdges) adj[a][b] = adj[b][a] = true;

  // thứ tự duyệt: bắt đầu từ đỉnh bậc cao nhất, rồi lần theo cạnh để cắt nhánh sớm
  const sdeg = new Array<number>(n).fill(0);
  const sadj: number[][] = Array.from({length: n}, () => []);
  for (const [a, b] of graph.edges) {
    sdeg[a]++;
    sdeg[b]++;
    sadj[a].push(b);
    sadj[b].push(a);
  }
  const order: number[] = [];
  const seen = new Array<boolean>(n).fill(false);
  const queue = [sdeg.indexOf(Math.max(...sdeg))];
  seen[queue[0]] = true;
  while (queue.length) {
    const v = queue.shift()!;
    order.push(v);
    for (const w of sadj[v].sort((p, q) => sdeg[q] - sdeg[p])) if (!seen[w]) (seen[w] = true), queue.push(w);
  }
  for (let v = 0; v < n; v++) if (!seen[v]) order.push(v);

  const xs = verts.map((p) => p.x);
  const ys = verts.map((p) => p.y);
  const D = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) || 1;

  let best: {map: number[]; rows: [number[], number[]]; rms: number} | null = null;
  const map = new Array<number>(n).fill(-1);
  const used = new Array<boolean>(m).fill(false);
  let nodes = 0;
  const rec = (k: number) => {
    if (nodes++ > NODE_CAP) return;
    if (k === n) {
      const fit = fitAffine(map.map((t) => solid.verts[t]), verts);
      if (fit && (!best || fit.rms < best.rms)) best = {map: [...map], rows: fit.rows, rms: fit.rms};
      return;
    }
    const v = order[k];
    for (let t = 0; t < m; t++) {
      if (used[t]) continue;
      let ok = true;
      for (const w of sadj[v]) if (map[w] >= 0 && !adj[t][map[w]]) ok = false;
      if (!ok) continue;
      map[v] = t;
      used[t] = true;
      rec(k + 1);
      map[v] = -1;
      used[t] = false;
    }
  };
  rec(0);

  const fit = best as {map: number[]; rows: [number[], number[]]; rms: number} | null;
  if (!fit || fit.rms > FIT_TOL * D) return plain;

  // hướng nhìn của phép chiếu = tích có hướng hai hàng của phần tuyến tính
  const r1: V3 = [fit.rows[0][0], fit.rows[0][1], fit.rows[0][2]];
  const r2: V3 = [fit.rows[1][0], fit.rows[1][1], fit.rows[1][2]];
  const d = cross(r1, r2);
  const dl = Math.hypot(d[0], d[1], d[2]);
  if (dl < 1e-9) return {...plain, labels: fit.map.map((t) => solid.labels[t] ?? ''), fitted: true};

  const normals = solid.faces.map((f) => faceNormal(solid.verts, f));
  const screenY = (v: V3) => fit.rows[1][0] * v[0] + fit.rows[1][1] * v[1] + fit.rows[1][2] * v[2] + fit.rows[1][3];
  const faceY = solid.faces.map((f) => screenY(centroid(f.map((i) => solid.verts[i]))));

  // hai cách hiểu (nhìn từ phía nào) đều khớp một hình vẽ; chọn cách nhìn từ trên xuống: các mặt thấy được nằm cao hơn trên bảng
  let visible: boolean[] | null = null;
  let bestScore = Infinity;
  for (const s of [1, -1]) {
    const vis = normals.map((nv) => s * dot(nv, d) / dl > 1e-6);
    const cnt = vis.filter(Boolean).length;
    if (cnt === 0) continue;
    const score = vis.reduce((acc, v, i) => acc + (v ? faceY[i] : 0), 0) / cnt;
    if (score < bestScore) {
      bestScore = score;
      visible = vis;
    }
  }
  if (!visible) return {...plain, labels: fit.map.map((t) => solid.labels[t] ?? ''), fitted: true};

  const hiddenTemplate = (ta: number, tb: number) => {
    const faces = solid.faces.map((f, i) => ({f, i})).filter(({f}) => f.includes(ta) && f.includes(tb));
    return faces.length > 0 && !faces.some(({i}) => visible![i]);
  };
  return {
    verts,
    edges: graph.edges.map(([a, b]) => ({a, b, hidden: hiddenTemplate(fit.map[a], fit.map[b])})),
    labels: fit.map.map((t) => solid.labels[t] ?? ''),
    fitted: true,
  };
}
