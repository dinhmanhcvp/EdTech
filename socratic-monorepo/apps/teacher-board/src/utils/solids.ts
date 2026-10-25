// apps/teacher-board/src/utils/solids.ts
/**
 * Hình học không gian: khối đa diện lồi, phép chiếu phối cảnh, khai triển (unfold) thành mạng phẳng.
 * Thuần toán học (không phụ thuộc React/DOM) để kiểm thử độ chính xác: định lý Euler, diện tích/thể tích,
 * độ dài cạnh được bảo toàn khi gấp/mở, mạng khai triển không chồng mặt.
 */
import type {SolidKind} from './localRouter';

export type V3 = [number, number, number];
export type M3 = [V3, V3, V3]; // ma trận 3x3 theo hàng

export interface Solid {
  kind: SolidKind;
  title: string;
  verts: V3[];
  faces: number[][]; // chỉ số đỉnh, ngược chiều kim đồng hồ khi nhìn từ ngoài vào
  labels: string[];
  dimKeys: {key: string; label: string; min: number; max: number; step: number; value: number}[];
  formulas: {label: string; latex: string; value: number}[];
}

// ------------------------------------------------------------------ véc-tơ
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a: V3): V3 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const centroid = (pts: V3[]): V3 => mul(pts.reduce((s, p) => add(s, p), [0, 0, 0] as V3), 1 / Math.max(1, pts.length));

export const I3: M3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
export const mulMV = (m: M3, v: V3): V3 => [dot(m[0], v), dot(m[1], v), dot(m[2], v)];
export const mulMM = (a: M3, b: M3): M3 => {
  const col = (j: number): V3 => [b[0][j], b[1][j], b[2][j]];
  return [0, 1, 2].map((i) => [0, 1, 2].map((j) => dot(a[i], col(j)))) as unknown as M3;
};
export const transpose = (m: M3): M3 => [
  [m[0][0], m[1][0], m[2][0]],
  [m[0][1], m[1][1], m[2][1]],
  [m[0][2], m[1][2], m[2][2]],
];

/** Ma trận quay quanh trục đơn vị `axis` một góc `ang` (Rodrigues). */
export const rotAxis = (axis: V3, ang: number): M3 => {
  const [x, y, z] = norm(axis);
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const t = 1 - c;
  return [
    [t * x * x + c, t * x * y - s * z, t * x * z + s * y],
    [t * x * y + s * z, t * y * y + c, t * y * z - s * x],
    [t * x * z - s * y, t * y * z + s * x, t * z * z + c],
  ];
};

/** Quay quanh đường thẳng đi qua `p` theo hướng `axis`. */
export const rotAbout = (v: V3, p: V3, axis: V3, ang: number): V3 => add(mulMV(rotAxis(axis, ang), sub(v, p)), p);

/** Phép quay đưa hướng `from` về hướng `to` (kể cả đối nhau). */
export function rotBetween(from: V3, to: V3): M3 {
  const a = norm(from);
  const b = norm(to);
  const c = dot(a, b);
  if (c > 1 - 1e-12) return I3;
  if (c < -1 + 1e-12) {
    const ortho: V3 = Math.abs(a[0]) < 0.9 ? cross(a, [1, 0, 0]) : cross(a, [0, 1, 0]);
    return rotAxis(ortho, Math.PI);
  }
  return rotAxis(cross(a, b), Math.acos(c));
}

// ------------------------------------------------------------------ hình học mặt
export const faceNormal = (verts: V3[], f: number[]): V3 => {
  // Newell: ổn định với mặt nhiều cạnh
  let n: V3 = [0, 0, 0];
  for (let i = 0; i < f.length; i++) n = add(n, cross(verts[f[i]], verts[f[(i + 1) % f.length]]));
  return norm(n);
};
export const faceArea = (verts: V3[], f: number[]) => {
  let n: V3 = [0, 0, 0];
  for (let i = 0; i < f.length; i++) n = add(n, cross(verts[f[i]], verts[f[(i + 1) % f.length]]));
  return len(n) / 2;
};
export const surfaceArea = (s: {verts: V3[]; faces: number[][]}) => s.faces.reduce((t, f) => t + faceArea(s.verts, f), 0);
/** Thể tích bằng tổng thể tích tứ diện có đỉnh tại gốc (định lý phân kì). */
export const volume = (s: {verts: V3[]; faces: number[][]}) => {
  let v = 0;
  for (const f of s.faces) for (let i = 1; i < f.length - 1; i++) v += dot(s.verts[f[0]], cross(s.verts[f[i]], s.verts[f[i + 1]])) / 6;
  return Math.abs(v);
};
export const edgesOf = (faces: number[][]): [number, number][] => {
  const set = new Map<string, [number, number]>();
  for (const f of faces) for (let i = 0; i < f.length; i++) {
    const a = f[i];
    const b = f[(i + 1) % f.length];
    const k = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (!set.has(k)) set.set(k, a < b ? [a, b] : [b, a]);
  }
  return [...set.values()];
};

// ------------------------------------------------------------------ dựng các khối
const lab = (n: number, prime = false) => Array.from({length: n}, (_, i) => `${String.fromCharCode(65 + i)}${prime ? "'" : ''}`);

function box(a: number, b: number, c: number): Pick<Solid, 'verts' | 'faces' | 'labels'> {
  const verts: V3[] = [
    [0, 0, 0], [a, 0, 0], [a, b, 0], [0, b, 0],
    [0, 0, c], [a, 0, c], [a, b, c], [0, b, c],
  ];
  const faces = [
    [0, 3, 2, 1], // đáy ABCD (z = 0), pháp tuyến −z
    [4, 5, 6, 7], // đỉnh A'B'C'D'
    [0, 1, 5, 4], // y = 0
    [1, 2, 6, 5], // x = a
    [2, 3, 7, 6], // y = b
    [3, 0, 4, 7], // x = 0
  ];
  return {verts, faces, labels: [...lab(4), ...lab(4, true)]};
}

function pyramid(n: number, a: number, h: number): Pick<Solid, 'verts' | 'faces' | 'labels'> {
  const R = a / (2 * Math.sin(Math.PI / n));
  const base: V3[] = Array.from({length: n}, (_, i) => [R * Math.cos((2 * Math.PI * i) / n), R * Math.sin((2 * Math.PI * i) / n), 0]);
  const verts: V3[] = [...base, [0, 0, h]];
  const faces: number[][] = [Array.from({length: n}, (_, i) => n - 1 - i)]; // đáy, pháp tuyến −z
  for (let i = 0; i < n; i++) faces.push([i, (i + 1) % n, n]);
  return {verts, faces, labels: [...lab(n), 'S']};
}

function prism(n: number, a: number, h: number): Pick<Solid, 'verts' | 'faces' | 'labels'> {
  const R = a / (2 * Math.sin(Math.PI / n));
  const ring = (z: number): V3[] => Array.from({length: n}, (_, i) => [R * Math.cos((2 * Math.PI * i) / n), R * Math.sin((2 * Math.PI * i) / n), z]);
  const verts: V3[] = [...ring(0), ...ring(h)];
  const faces: number[][] = [Array.from({length: n}, (_, i) => n - 1 - i), Array.from({length: n}, (_, i) => n + i)];
  for (let i = 0; i < n; i++) faces.push([i, (i + 1) % n, n + ((i + 1) % n), n + i]);
  return {verts, faces, labels: [...lab(n), ...lab(n, true)]};
}

function tetra(a: number): Pick<Solid, 'verts' | 'faces' | 'labels'> {
  const R = a / Math.sqrt(3);
  const h = a * Math.sqrt(2 / 3);
  const base: V3[] = [0, 1, 2].map((i) => [R * Math.cos((2 * Math.PI * i) / 3), R * Math.sin((2 * Math.PI * i) / 3), 0] as V3);
  return {verts: [...base, [0, 0, h]], faces: [[2, 1, 0], [0, 1, 3], [1, 2, 3], [2, 0, 3]], labels: ['A', 'B', 'C', 'D']};
}

function octa(a: number): Pick<Solid, 'verts' | 'faces' | 'labels'> {
  const r = a / Math.SQRT2;
  const verts: V3[] = [[r, 0, 0], [-r, 0, 0], [0, r, 0], [0, -r, 0], [0, 0, r], [0, 0, -r]];
  const faces = [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]];
  return {verts, faces, labels: ['A', 'B', 'C', 'D', 'E', 'F']};
}

const fmt = (v: number) => v;

export interface SolidDims {
  a?: number;
  b?: number;
  c?: number;
  h?: number;
}

/** Tạo khối theo loại và kích thước; đặt tâm tại gốc để xoay đẹp. */
export function makeSolid(kind: SolidKind, dims: SolidDims = {}): Solid {
  const a = dims.a ?? (kind === 'cube' ? 2 : kind === 'box' ? 3 : 2);
  const b = dims.b ?? 2;
  const c = dims.c ?? 1.5;
  const h = dims.h ?? (kind === 'prism3' || kind === 'prism6' ? 3 : 2.5);
  let g: Pick<Solid, 'verts' | 'faces' | 'labels'>;
  let title = '';
  let dimKeys: Solid['dimKeys'] = [];
  const dk = (key: string, label: string, value: number, min = 1, max = 5, step = 0.5) => ({key, label, min, max, step, value});
  switch (kind) {
    case 'cube':
      g = box(a, a, a);
      title = 'Hình lập phương ABCD.A\'B\'C\'D\'';
      dimKeys = [dk('a', 'Cạnh a', a)];
      break;
    case 'box':
      g = box(a, b, c);
      title = 'Hình hộp chữ nhật ABCD.A\'B\'C\'D\'';
      dimKeys = [dk('a', 'Dài a', a), dk('b', 'Rộng b', b), dk('c', 'Cao c', c)];
      break;
    case 'pyramid4':
      g = pyramid(4, a, h);
      title = 'Hình chóp tứ giác đều S.ABCD';
      dimKeys = [dk('a', 'Cạnh đáy a', a), dk('h', 'Chiều cao h', h)];
      break;
    case 'pyramid3':
      g = tetra(a);
      title = 'Tứ diện đều ABCD';
      dimKeys = [dk('a', 'Cạnh a', a)];
      break;
    case 'prism3':
      g = prism(3, a, h);
      title = 'Lăng trụ tam giác đều ABC.A\'B\'C\'';
      dimKeys = [dk('a', 'Cạnh đáy a', a), dk('h', 'Chiều cao h', h)];
      break;
    case 'prism6':
      g = prism(6, a, h);
      title = 'Lăng trụ lục giác đều';
      dimKeys = [dk('a', 'Cạnh đáy a', a), dk('h', 'Chiều cao h', h)];
      break;
    case 'octahedron':
    default:
      g = octa(a);
      title = 'Bát diện đều';
      dimKeys = [dk('a', 'Cạnh a', a)];
      kind = 'octahedron';
  }
  const ctr = centroid(g.verts);
  const verts = g.verts.map((v) => sub(v, ctr));
  const s = {verts, faces: g.faces};
  const sol: Solid = {kind, title, verts, faces: g.faces, labels: g.labels, dimKeys, formulas: []};
  sol.formulas = [
    {label: 'Diện tích toàn phần', latex: 'S_{tp}', value: fmt(surfaceArea(s))},
    {label: 'Thể tích', latex: 'V', value: fmt(volume(s))},
  ];
  return sol;
}

// ------------------------------------------------------------------ khai triển (unfold)
export interface UnfoldNode {
  face: number;
  parent: number; // chỉ số mặt cha, −1 với mặt gốc
  hinge?: [V3, V3]; // hai đầu cạnh chung trong toạ độ gốc (đã gấp)
  angle: number; // góc quay đầy đủ (có dấu) để phẳng hóa
  order: number;
}
export interface UnfoldPlan {
  root: number;
  nodes: UnfoldNode[];
  valid: boolean; // mạng phẳng không chồng mặt
}

/** Các mặt kề nhau qua một cạnh chung: map mặt → [(mặt kề, a, b)] (a,b là chỉ số đỉnh của cạnh). */
export function faceAdjacency(faces: number[][]) {
  const byEdge = new Map<string, {f: number; a: number; b: number}[]>();
  faces.forEach((f, fi) => {
    for (let i = 0; i < f.length; i++) {
      const a = f[i];
      const b = f[(i + 1) % f.length];
      const k = a < b ? `${a}-${b}` : `${b}-${a}`;
      (byEdge.get(k) ?? byEdge.set(k, []).get(k)!).push({f: fi, a, b});
    }
  });
  const adj: {to: number; a: number; b: number}[][] = faces.map(() => []);
  for (const list of byEdge.values()) if (list.length === 2) {
    adj[list[0].f].push({to: list[1].f, a: list[0].a, b: list[0].b});
    adj[list[1].f].push({to: list[0].f, a: list[1].a, b: list[1].b});
  }
  return adj;
}

/** Vị trí các đỉnh của mọi mặt tại tham số gấp u ∈ [0,1] (0 = khối, 1 = mạng phẳng). Trả về đỉnh riêng cho từng mặt. */
export function unfoldedFaces(solid: {verts: V3[]; faces: number[][]}, plan: UnfoldPlan, u: number): V3[][] {
  const out: V3[][] = solid.faces.map((f) => f.map((i) => solid.verts[i]));
  // áp dụng theo thứ tự cha → con: v' = M_cha( R_u(v) ); ta duy trì danh sách phép biến đổi theo mặt
  type Tf = (v: V3) => V3;
  const tf: Tf[] = [];
  const byFace = new Map<number, UnfoldNode>(plan.nodes.map((n) => [n.face, n]));
  const done = new Set<number>();
  const apply = (face: number): Tf => {
    if (tf[face]) return tf[face];
    const n = byFace.get(face)!;
    if (n.parent < 0) return (tf[face] = (v) => v);
    const parentTf = apply(n.parent);
    const [p, q] = n.hinge!;
    const axis = sub(q, p);
    const th = n.angle * u;
    return (tf[face] = (v) => parentTf(rotAbout(v, p, axis, th)));
  };
  for (const n of plan.nodes) {
    const f = apply(n.face);
    out[n.face] = solid.faces[n.face].map((i) => f(solid.verts[i]));
    done.add(n.face);
  }
  return out;
}

const polyOverlap2D = (A: [number, number][], B: [number, number][], eps = 1e-6): boolean => {
  // Định lý trục phân tách cho đa giác lồi; "chạm cạnh" không tính là chồng
  const axes = (P: [number, number][]) =>
    P.map((p, i) => {
      const q = P[(i + 1) % P.length];
      const e = [q[0] - p[0], q[1] - p[1]];
      const l = Math.hypot(e[0], e[1]) || 1;
      return [-e[1] / l, e[0] / l] as [number, number];
    });
  for (const ax of [...axes(A), ...axes(B)]) {
    const pa = A.map((p) => p[0] * ax[0] + p[1] * ax[1]);
    const pb = B.map((p) => p[0] * ax[0] + p[1] * ax[1]);
    if (Math.max(...pa) <= Math.min(...pb) + eps || Math.max(...pb) <= Math.min(...pa) + eps) return false;
  }
  return true;
};

/** Mạng phẳng (u = 1) có chồng mặt không? Chiếu mọi mặt lên mặt phẳng của mặt gốc. */
export function netOverlaps(solid: {verts: V3[]; faces: number[][]}, plan: UnfoldPlan): boolean {
  const flat = unfoldedFaces(solid, plan, 1);
  const n = faceNormal(solid.verts, solid.faces[plan.root]);
  const e1 = norm(Math.abs(n[0]) < 0.9 ? cross(n, [1, 0, 0]) : cross(n, [0, 1, 0]));
  const e2 = cross(n, e1);
  const poly = flat.map((f) => f.map((v) => [dot(v, e1), dot(v, e2)] as [number, number]));
  for (let i = 0; i < poly.length; i++) for (let j = i + 1; j < poly.length; j++) if (polyOverlap2D(poly[i], poly[j])) return true;
  return false;
}

/**
 * Lập kế hoạch khai triển từ mặt gốc `root`: duyệt cây bao trùm các mặt kề nhau; thử nhiều thứ tự duyệt
 * cho tới khi mạng phẳng không chồng mặt (hình lập phương, hộp, chóp, lăng trụ luôn có).
 */
export function planUnfold(solid: {verts: V3[]; faces: number[][]}, root = 0): UnfoldPlan {
  const adj = faceAdjacency(solid.faces);
  const centers = solid.faces.map((f) => centroid(f.map((i) => solid.verts[i])));
  const tryOrder = (perm: number): UnfoldPlan => {
    const nodes: UnfoldNode[] = [{face: root, parent: -1, angle: 0, order: 0}];
    const seen = new Set([root]);
    const queue = [root];
    // perm = 0: BFS thứ tự cạnh; perm > 0: đổi chiều/xoay vòng thứ tự láng giềng
    while (queue.length) {
      const cur = queue.shift()!;
      const nb = [...adj[cur]];
      if (perm % 2) nb.reverse();
      const rot = Math.floor(perm / 2) % Math.max(1, nb.length);
      nb.push(...nb.splice(0, rot));
      for (const e of nb) {
        if (seen.has(e.to)) continue;
        seen.add(e.to);
        const p = solid.verts[e.a];
        const q = solid.verts[e.b];
        const axis = sub(q, p);
        // mặt con quay quanh bản lề để cùng phẳng với mặt cha và nằm phía đối diện
        const fc = centers[e.to];
        const pc = centers[cur];
        const nF = faceNormal(solid.verts, solid.faces[e.to]);
        const nP = faceNormal(solid.verts, solid.faces[cur]);
        const dihedral = Math.PI - Math.acos(Math.max(-1, Math.min(1, dot(nF, nP)))); // góc trong
        const full = Math.PI - dihedral;
        const hingeMid = mul(add(p, q), 0.5);
        let best = full;
        let bestDot = Infinity;
        for (const s of [1, -1]) {
          const c2 = rotAbout(fc, p, axis, s * full);
          const d = dot(sub(c2, hingeMid), sub(pc, hingeMid)); // phẳng & phía đối diện → âm
          if (d < bestDot) {
            bestDot = d;
            best = s * full;
          }
        }
        nodes.push({face: e.to, parent: cur, hinge: [p, q], angle: best, order: nodes.length});
        queue.push(e.to);
      }
    }
    return {root, nodes, valid: false};
  };
  let last = tryOrder(0);
  for (let perm = 0; perm < 40; perm++) {
    const plan = tryOrder(perm);
    if (plan.nodes.length === solid.faces.length && !netOverlaps(solid, plan)) return {...plan, valid: true};
    last = plan;
  }
  return {...last, valid: false};
}

/** Phép quay đưa pháp tuyến của mặt gốc về phía người xem (+z) để thấy mạng phẳng chính diện. */
export function viewAlign(solid: {verts: V3[]; faces: number[][]}, root: number): M3 {
  const n = faceNormal(solid.verts, solid.faces[root]);
  return rotBetween(n, [0, 0, 1]);
}

// ------------------------------------------------------------------ chiếu phối cảnh
export interface Cam {
  R: M3; // quay của khối
  zoom: number; // pixel / đơn vị
  cx: number;
  cy: number;
  dist: number; // khoảng cách camera (đơn vị); phối cảnh nhẹ
}
export const project = (cam: Cam, v: V3, center: V3 = [0, 0, 0]) => {
  const p = mulMV(cam.R, sub(v, center));
  const k = cam.dist / (cam.dist - p[2]);
  return {x: cam.cx + p[0] * cam.zoom * k, y: cam.cy - p[1] * cam.zoom * k, z: p[2], k};
};

/** Điểm nằm trong đa giác (xử lý đa giác lồi/lõm) */
export const pointInPoly = (poly: {x: number; y: number}[], x: number, y: number) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
};

export const FACE_PALETTE = ['#EF4444', '#F97316', '#FACC15', '#22C55E', '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899'];
export const defaultFaceColors = (n: number) => Array.from({length: n}, (_, i) => FACE_PALETTE[i % FACE_PALETTE.length]);

// ------------------------------------------------------------------ nội suy phép quay
/** Tách ma trận quay thành (trục, góc) */
export function matToAxisAngle(m: M3): {axis: V3; angle: number} {
  const tr = m[0][0] + m[1][1] + m[2][2];
  const angle = Math.acos(Math.max(-1, Math.min(1, (tr - 1) / 2)));
  if (angle < 1e-9) return {axis: [0, 0, 1], angle: 0};
  if (Math.abs(angle - Math.PI) < 1e-6) {
    // góc π: R = 2·a·aᵀ − I nên (R + I) = 2·a·aᵀ; mỗi cột của (R + I) song song với trục → lấy cột dài nhất
    const cols = [0, 1, 2].map((i) => [m[0][i] + (i === 0 ? 1 : 0), m[1][i] + (i === 1 ? 1 : 0), m[2][i] + (i === 2 ? 1 : 0)] as V3);
    const best = cols.reduce((p, q) => (len(q) > len(p) ? q : p));
    return {axis: norm(best), angle};
  }
  const k = 1 / (2 * Math.sin(angle));
  return {axis: [(m[2][1] - m[1][2]) * k, (m[0][2] - m[2][0]) * k, (m[1][0] - m[0][1]) * k], angle};
}

/** Quay dần R0 về R1 theo t ∈ [0,1] theo cung ngắn nhất. */
export function slerpRot(R0: M3, R1: M3, t: number): M3 {
  const rel = mulMM(R1, transpose(R0));
  const {axis, angle} = matToAxisAngle(rel);
  return mulMM(rotAxis(axis, angle * t), R0);
}

/** Gram–Schmidt để giữ ma trận quay trực giao sau nhiều phép nhân liên tiếp. */
export function orthonormalize(m: M3): M3 {
  const r0 = norm(m[0]);
  const r1 = norm(sub(m[1], mul(r0, dot(m[1], r0))));
  const r2 = cross(r0, r1);
  return [r0, r1, r2];
}
