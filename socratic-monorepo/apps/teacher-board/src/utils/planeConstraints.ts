/**
 * Hình phẳng cứng: sau khi nhận ra loại hình, các đỉnh được khớp vào đúng ràng buộc hình học
 * (hình chữ nhật có 4 góc vuông, hình vuông thêm 4 cạnh bằng nhau, hình bình hành có cạnh đối song song và bằng nhau,
 * hình thoi có 4 cạnh bằng nhau, tam giác đều/cân/vuông/vuông cân…), và kéo một đỉnh thì hình vẫn giữ ràng buộc.
 * Mọi hàm chỉ dùng phép toán véc-tơ nên đúng cho cả hệ trục y hướng lên lẫn y hướng xuống.
 */

export type PlaneConstraintKind =
  | 'triangle_equilateral'
  | 'triangle_right'
  | 'triangle_isosceles'
  | 'triangle_scalene'
  | 'square'
  | 'rectangle'
  | 'rhombus'
  | 'parallelogram'
  | 'quadrilateral';

export interface PlaneVertex {
  x: number;
  y: number;
}

export interface PlaneState {
  kind: PlaneConstraintKind;
  verts: PlaneVertex[];
  /** tam giác cân: chỉ số đỉnh cân (đỉnh chung của hai cạnh bằng nhau) */
  apex?: number;
  /** tam giác vuông: chỉ số đỉnh góc vuông */
  right?: number;
  /** tam giác vuông cân: hai cạnh góc vuông luôn bằng nhau */
  legsEqual?: boolean;
}

const sub = (a: PlaneVertex, b: PlaneVertex): PlaneVertex => ({x: a.x - b.x, y: a.y - b.y});
const add = (a: PlaneVertex, b: PlaneVertex): PlaneVertex => ({x: a.x + b.x, y: a.y + b.y});
const mul = (a: PlaneVertex, k: number): PlaneVertex => ({x: a.x * k, y: a.y * k});
const dot = (a: PlaneVertex, b: PlaneVertex) => a.x * b.x + a.y * b.y;
const len = (a: PlaneVertex) => Math.hypot(a.x, a.y);
const unit = (a: PlaneVertex): PlaneVertex => {
  const l = len(a) || 1;
  return {x: a.x / l, y: a.y / l};
};
const perp = (a: PlaneVertex): PlaneVertex => ({x: -a.y, y: a.x});
const mid = (a: PlaneVertex, b: PlaneVertex): PlaneVertex => ({x: (a.x + b.x) / 2, y: (a.y + b.y) / 2});
const mean = (pts: PlaneVertex[]): PlaneVertex => mul(pts.reduce((s, p) => add(s, p), {x: 0, y: 0}), 1 / Math.max(1, pts.length));
const at = <T,>(arr: T[], i: number): T => arr[((i % arr.length) + arr.length) % arr.length];

/** Góc trung bình có chu kỳ `period` (rad), dùng vòng tròn để tránh nhảy ở biên. */
function circularMean(angles: number[], period: number): number {
  const k = (2 * Math.PI) / period;
  const sx = angles.reduce((s, a) => s + Math.cos(a * k), 0);
  const sy = angles.reduce((s, a) => s + Math.sin(a * k), 0);
  return Math.atan2(sy, sx) / k;
}

const interiorAngleDeg = (p: PlaneVertex, a: PlaneVertex, b: PlaneVertex) => {
  const u = sub(a, p);
  const v = sub(b, p);
  const c = Math.max(-1, Math.min(1, dot(u, v) / ((len(u) || 1) * (len(v) || 1))));
  return (Math.acos(c) * 180) / Math.PI;
};

// ------------------------------------------------------------------ khớp ràng buộc
function snapRect(verts: PlaneVertex[], square: boolean): PlaneVertex[] {
  const c = mean(verts);
  const dirs = verts.map((p, i) => Math.atan2(at(verts, i + 1).y - p.y, at(verts, i + 1).x - p.x));
  const theta = circularMean(dirs, Math.PI / 2); // các cạnh song song hoặc vuông góc nhau → chu kỳ 90°
  const u = {x: Math.cos(theta), y: Math.sin(theta)};
  const v = perp(u);
  const ds = verts.map((p) => sub(p, c));
  let a = ds.reduce((s, d) => s + Math.abs(dot(d, u)), 0) / ds.length;
  let b = ds.reduce((s, d) => s + Math.abs(dot(d, v)), 0) / ds.length;
  if (square) a = b = (a + b) / 2;
  return ds.map((d) => add(c, add(mul(u, Math.sign(dot(d, u)) * a), mul(v, Math.sign(dot(d, v)) * b))));
}

function snapParallelogram(verts: PlaneVertex[]): PlaneVertex[] {
  const m = mid(mid(verts[0], verts[2]), mid(verts[1], verts[3]));
  const m02 = mid(verts[0], verts[2]);
  const m13 = mid(verts[1], verts[3]);
  const s02 = sub(m, m02);
  const s13 = sub(m, m13);
  return [add(verts[0], s02), add(verts[1], s13), add(verts[2], s02), add(verts[3], s13)];
}

function snapRhombus(verts: PlaneVertex[]): PlaneVertex[] {
  const p = snapParallelogram(verts);
  const m = mid(p[0], p[2]);
  const e = sub(p[0], m);
  const f = sub(p[1], m);
  const n = perp(unit(e));
  const dir = mul(n, Math.sign(dot(f, n)) || 1);
  const f2 = mul(dir, len(f));
  return [p[0], add(m, f2), p[2], sub(m, f2)];
}

function snapEquilateral(verts: PlaneVertex[]): PlaneVertex[] {
  const c = mean(verts);
  const area2 = (verts[1].x - verts[0].x) * (verts[2].y - verts[0].y) - (verts[1].y - verts[0].y) * (verts[2].x - verts[0].x);
  const s = area2 >= 0 ? 1 : -1; // chiều đi của chu trình
  const phis = verts.map((p, k) => Math.atan2(p.y - c.y, p.x - c.x) - s * ((2 * Math.PI * k) / 3));
  const theta = circularMean(phis, 2 * Math.PI);
  const R = verts.reduce((acc, p) => acc + len(sub(p, c)), 0) / 3;
  return verts.map((_, k) => ({x: c.x + R * Math.cos(theta + s * ((2 * Math.PI * k) / 3)), y: c.y + R * Math.sin(theta + s * ((2 * Math.PI * k) / 3))}));
}

function isoscelesApex(verts: PlaneVertex[]): number {
  let best = 0;
  let bestD = Infinity;
  verts.forEach((p, i) => {
    const d = Math.abs(len(sub(at(verts, i + 1), p)) - len(sub(at(verts, i - 1), p)));
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

function snapIsosceles(verts: PlaneVertex[], apex: number): PlaneVertex[] {
  const j = at(verts, apex + 1);
  const k = at(verts, apex - 1);
  const M = mid(j, k);
  const base = unit(sub(k, j));
  let n = perp(base);
  if (dot(sub(verts[apex], M), n) < 0) n = mul(n, -1);
  const H = dot(sub(verts[apex], M), n);
  const out = verts.map((p) => ({...p}));
  out[((apex % 3) + 3) % 3] = add(M, mul(n, H));
  return out;
}

function rightIndex(verts: PlaneVertex[]): number {
  let best = 0;
  let bestD = Infinity;
  verts.forEach((p, i) => {
    const d = Math.abs(interiorAngleDeg(p, at(verts, i + 1), at(verts, i - 1)) - 90);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

function snapRight(verts: PlaneVertex[], r: number, legsEqual: boolean): PlaneVertex[] {
  const R = verts[r];
  const a = at(verts, r + 1);
  const b = at(verts, r - 1);
  const d1 = unit(sub(a, R));
  let d2 = perp(d1);
  if (dot(sub(b, R), d2) < 0) d2 = mul(d2, -1);
  let L1 = len(sub(a, R));
  let L2 = len(sub(b, R));
  if (legsEqual) L1 = L2 = (L1 + L2) / 2;
  const out = verts.map((p) => ({...p}));
  out[(r + 1) % 3] = add(R, mul(d1, L1));
  out[(r + 2) % 3] = add(R, mul(d2, L2));
  return out;
}

/**
 * Khớp các đỉnh (đã sắp theo chu trình) vào ràng buộc của `kind`. Trả đỉnh mới và các chỉ số cần cho việc kéo đỉnh sau này.
 */
export function snapPlane(kind: PlaneConstraintKind, verts: PlaneVertex[], opts: {legsEqual?: boolean} = {}): PlaneState {
  const v = verts.map((p) => ({...p}));
  switch (kind) {
    case 'rectangle':
      return v.length === 4 ? {kind, verts: snapRect(v, false)} : {kind, verts: v};
    case 'square':
      return v.length === 4 ? {kind, verts: snapRect(v, true)} : {kind, verts: v};
    case 'parallelogram':
      return v.length === 4 ? {kind, verts: snapParallelogram(v)} : {kind, verts: v};
    case 'rhombus':
      return v.length === 4 ? {kind, verts: snapRhombus(v)} : {kind, verts: v};
    case 'triangle_equilateral':
      return v.length === 3 ? {kind, verts: snapEquilateral(v)} : {kind, verts: v};
    case 'triangle_isosceles': {
      if (v.length !== 3) return {kind, verts: v};
      const apex = isoscelesApex(v);
      return {kind, verts: snapIsosceles(v, apex), apex};
    }
    case 'triangle_right': {
      if (v.length !== 3) return {kind, verts: v};
      const right = rightIndex(v);
      const legsEqual = !!opts.legsEqual;
      return {kind, verts: snapRight(v, right, legsEqual), right, legsEqual};
    }
    default:
      return {kind, verts: v};
  }
}

// ------------------------------------------------------------------ kéo đỉnh giữ ràng buộc
/** Vị trí mới của các đỉnh khi kéo đỉnh `i` tới `p`; hình luôn giữ đúng ràng buộc của loại hình. */
export function dragPlane(state: PlaneState, i: number, p: PlaneVertex): PlaneVertex[] {
  const v = state.verts.map((q) => ({...q}));
  const n = v.length;
  const idx = (k: number) => ((k % n) + n) % n;
  switch (state.kind) {
    case 'rectangle':
    case 'square': {
      if (n !== 4) break;
      const F = v[idx(i + 2)];
      const u1 = unit(sub(v[idx(i + 1)], v[i]));
      const u2 = unit(sub(v[idx(i - 1)], v[i]));
      const d = sub(p, F);
      let c1 = dot(d, u1);
      let c2 = dot(d, u2);
      if (state.kind === 'square') {
        const m = (Math.abs(c1) + Math.abs(c2)) / 2;
        c1 = Math.sign(c1 || 1) * m;
        c2 = Math.sign(c2 || 1) * m;
      }
      v[i] = add(F, add(mul(u1, c1), mul(u2, c2)));
      v[idx(i + 1)] = add(F, mul(u2, c2));
      v[idx(i - 1)] = add(F, mul(u1, c1));
      return v;
    }
    case 'parallelogram': {
      if (n !== 4) break;
      v[i] = {...p};
      v[idx(i + 2)] = sub(add(v[idx(i + 1)], v[idx(i - 1)]), p);
      return v;
    }
    case 'rhombus': {
      if (n !== 4) break;
      const m = mid(v[0], v[2]);
      const other = v[idx(i + 1)];
      const fl = len(sub(other, m));
      const e = sub(p, m);
      if (len(e) < 1e-6) break;
      let dir = perp(unit(e));
      if (dot(sub(other, m), dir) < 0) dir = mul(dir, -1);
      v[i] = {...p};
      v[idx(i + 2)] = sub(mul(m, 2), p);
      v[idx(i + 1)] = add(m, mul(dir, fl));
      v[idx(i - 1)] = sub(m, mul(dir, fl));
      return v;
    }
    case 'triangle_equilateral': {
      if (n !== 3) break;
      const j = v[idx(i + 1)];
      const oldK = v[idx(i - 1)];
      const d = sub(p, j);
      const rot = (a: PlaneVertex, t: number) => ({x: a.x * Math.cos(t) - a.y * Math.sin(t), y: a.x * Math.sin(t) + a.y * Math.cos(t)});
      const k1 = add(j, rot(d, Math.PI / 3));
      const k2 = add(j, rot(d, -Math.PI / 3));
      v[i] = {...p};
      v[idx(i - 1)] = len(sub(k1, oldK)) <= len(sub(k2, oldK)) ? k1 : k2;
      return v;
    }
    case 'triangle_isosceles': {
      if (n !== 3 || state.apex === undefined) break;
      const a = state.apex;
      const j = v[idx(a + 1)];
      const k = v[idx(a - 1)];
      if (i === a) {
        const M = mid(j, k);
        const nrm = perp(unit(sub(k, j)));
        v[a] = add(M, mul(nrm, dot(sub(p, M), nrm)));
        return v;
      }
      // kéo đỉnh đáy: đỉnh đáy kia lấy đối xứng qua trục đi qua đỉnh cân
      const apexP = v[a];
      const M = mid(j, k);
      const axis = unit(sub(M, apexP));
      const q = sub(p, apexP);
      const refl = sub(mul(axis, 2 * dot(q, axis)), q);
      v[i] = {...p};
      v[i === idx(a + 1) ? idx(a - 1) : idx(a + 1)] = add(apexP, refl);
      return v;
    }
    case 'triangle_right': {
      if (n !== 3 || state.right === undefined) break;
      const r = state.right;
      const R = v[r];
      if (i === r) {
        // đỉnh góc vuông luôn nằm trên đường tròn đường kính là cạnh huyền
        const a = v[idx(r + 1)];
        const b = v[idx(r - 1)];
        const C = mid(a, b);
        const rad = len(sub(a, b)) / 2;
        const dir = sub(p, C);
        if (len(dir) < 1e-6) break;
        v[r] = add(C, mul(unit(dir), rad));
        return v;
      }
      const u = unit(sub(v[i], R));
      const L = Math.max(8, dot(sub(p, R), u));
      v[i] = add(R, mul(u, L));
      if (state.legsEqual) {
        const j = i === idx(r + 1) ? idx(r - 1) : idx(r + 1);
        v[j] = add(R, mul(unit(sub(v[j], R)), L));
      }
      return v;
    }
    default:
      break;
  }
  v[i] = {...p};
  return v;
}

/** Độ dài cạnh và số đo góc (độ) của đa giác theo thứ tự đỉnh. */
export function planeMeasures(verts: PlaneVertex[]): {sides: number[]; angles: number[]} {
  const n = verts.length;
  return {
    sides: verts.map((p, i) => len(sub(at(verts, i + 1), p))),
    angles: verts.map((p, i) => interiorAngleDeg(p, at(verts, i + 1), at(verts, i - 1))),
    ...(n ? {} : {}),
  };
}
