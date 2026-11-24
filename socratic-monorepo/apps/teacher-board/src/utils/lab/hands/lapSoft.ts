/**
 * Mô mềm cho bài nội soi: mỗi cơ quan là một đám hạt nối bằng ràng buộc khoảng cách (động lực học dựa trên vị trí), có lực kéo về chỗ cũ.
 * Lưới hiển thị bám theo vài hạt gần nhất (`buildSkin`) nên lưới vài nghìn đỉnh chỉ cần vài trăm hạt. Không phụ thuộc three.js để kiểm được bằng test.
 */
import type {P3} from './laparo';

/** độ dài vectơ 3 chiều; `Math.hypot` chậm hơn nhiều lần trong vòng giải nóng của V8 */
const len3 = (x: number, y: number, z: number) => Math.sqrt(x * x + y * y + z * z);

/** kéo xa chỗ cũ quá mức này thì mô rách */
export const TEAR_PULL = 0.95;
const MAX_MOVE = 1.25;
const SUBSTEPS = 2;
const ITER = 3;

export type Edge = [number, number];
export interface SoftTip {
  at: P3;
  r: number;
  h: 0 | 1;
}

export class SoftBody {
  readonly n: number;
  readonly pos: Float32Array;
  readonly rest: Float32Array;
  /** chỗ mô muốn trở về: thường trùng `rest`, đổi được khi mô co lại sau cắt */
  readonly home: Float32Array;
  private readonly prev: Float32Array;
  private readonly pull_: Float32Array;
  private edges: Edge[];
  private lens: number[];
  private readonly held = new Map<number, {i: number; off: P3; at: P3}>();
  moving = false;

  constructor(points: ArrayLike<number>, homeK: number | ((i: number) => number), edges: Edge[]) {
    this.n = Math.floor(points.length / 3);
    this.pos = Float32Array.from(points as ArrayLike<number>);
    this.rest = this.pos.slice();
    this.home = this.pos.slice();
    this.prev = this.pos.slice();
    this.pull_ = Float32Array.from({length: this.n}, (_, i) => (typeof homeK === 'number' ? homeK : homeK(i)));
    this.edges = edges;
    this.lens = edges.map(([a, b]) => this.span(a, b));
  }

  private span(a: number, b: number) {
    const p = this.pos;
    return len3(p[a * 3] - p[b * 3], p[a * 3 + 1] - p[b * 3 + 1], p[a * 3 + 2] - p[b * 3 + 2]);
  }
  get edgeCount() {
    return this.edges.length;
  }
  point(i: number): P3 {
    return [this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]];
  }
  /** cầm hạt gần mũi nhất trong tầm `reach`; trả false nếu không có hạt nào */
  grasp(h: number, at: P3, reach: number): boolean {
    if (this.held.has(h)) return true;
    let best = -1;
    let bd = reach;
    for (let i = 0; i < this.n; i++) {
      const d = len3(this.pos[i * 3] - at[0], this.pos[i * 3 + 1] - at[1], this.pos[i * 3 + 2] - at[2]);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    if (best < 0) return false;
    this.held.set(h, {i: best, off: [this.pos[best * 3] - at[0], this.pos[best * 3 + 1] - at[1], this.pos[best * 3 + 2] - at[2]], at: [...at]});
    return true;
  }
  release(h: number) {
    this.held.delete(h);
  }
  holds(h: number) {
    return this.held.has(h);
  }
  /** hạt đang cầm đã bị kéo xa chỗ cũ bao nhiêu */
  pulled(h: number): number {
    const g = this.held.get(h);
    if (!g) return 0;
    const i = g.i * 3;
    return len3(this.pos[i] - this.home[i], this.pos[i + 1] - this.home[i + 1], this.pos[i + 2] - this.home[i + 2]);
  }
  heldPoint(h: number): P3 | null {
    const g = this.held.get(h);
    return g ? this.point(g.i) : null;
  }
  /** đổi lực kéo về chỗ cũ của một hạt (mô được bóc khỏi chỗ bám thì lực này gần như mất) */
  setPull(i: number, k: number) {
    this.pull_[i] = k;
    this.moving = true;
  }
  /** cắt mọi ràng buộc bắc qua mặt phẳng x */
  cutX(x: number) {
    const keep = this.edges.map(([a, b]) => (this.rest[a * 3] - x) * (this.rest[b * 3] - x) > 0);
    this.lens = this.lens.filter((_, i) => keep[i]);
    this.edges = this.edges.filter((_, i) => keep[i]);
    this.moving = true;
  }

  step(dt: number, tips: SoftTip[]) {
    const h = Math.min(dt, 0.05) / SUBSTEPS;
    const {pos, prev, home, pull_} = this;
    for (const t of tips) {
      const g = this.held.get(t.h);
      if (g) g.at = [...t.at];
    }
    let speed = this.held.size ? 1 : 0;
    for (let s = 0; s < SUBSTEPS; s++) {
      for (let i = 0; i < this.n * 3; i += 3) {
        const k = Math.min(1, pull_[i / 3] * h * 60);
        for (let c = 0; c < 3; c++) {
          const v = (pos[i + c] - prev[i + c]) * 0.86;
          prev[i + c] = pos[i + c];
          pos[i + c] += v + (home[i + c] - pos[i + c]) * k;
        }
      }
      for (let it = 0; it < ITER; it++) {
        for (let e = 0; e < this.edges.length; e++) {
          const a = this.edges[e][0] * 3;
          const b = this.edges[e][1] * 3;
          const dx = pos[b] - pos[a];
          const dy = pos[b + 1] - pos[a + 1];
          const dz = pos[b + 2] - pos[a + 2];
          const L = len3(dx, dy, dz) || 1e-6;
          const f = (0.32 * (L - this.lens[e])) / L;
          pos[a] += dx * f;
          pos[a + 1] += dy * f;
          pos[a + 2] += dz * f;
          pos[b] -= dx * f;
          pos[b + 1] -= dy * f;
          pos[b + 2] -= dz * f;
        }
        for (const t of tips) {
          if (this.held.has(t.h)) continue;
          for (let i = 0; i < this.n * 3; i += 3) {
            const dx = pos[i] - t.at[0];
            const dy = pos[i + 1] - t.at[1];
            const dz = pos[i + 2] - t.at[2];
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 >= t.r * t.r) continue;
            const d = Math.sqrt(d2) || 1e-5;
            const push = (t.r - d) / d;
            pos[i] += dx * push * 0.5;
            // mũi ấn từ trên xuống: mô lún nhiều hơn là trượt sang bên
            pos[i + 1] += (dy * push - (t.r - d) * 0.5) * 0.5;
            pos[i + 2] += dz * push * 0.5;
          }
        }
        for (const g of this.held.values()) {
          const i = g.i * 3;
          pos[i] = g.at[0] + g.off[0];
          pos[i + 1] = g.at[1] + g.off[1];
          pos[i + 2] = g.at[2] + g.off[2];
        }
      }
    }
    for (let i = 0; i < this.n * 3; i += 3) {
      const dx = pos[i] - home[i];
      const dy = pos[i + 1] - home[i + 1];
      const dz = pos[i + 2] - home[i + 2];
      const d = len3(dx, dy, dz);
      if (d > MAX_MOVE) {
        const q = MAX_MOVE / d;
        pos[i] = home[i] + dx * q;
        pos[i + 1] = home[i + 1] + dy * q;
        pos[i + 2] = home[i + 2] + dz * q;
      }
      speed = Math.max(speed, Math.abs(pos[i] - prev[i]), Math.abs(pos[i + 1] - prev[i + 1]), Math.abs(pos[i + 2] - prev[i + 2]));
    }
    this.moving = speed > 2e-4;
  }
}

/** chọn đều các điểm của một lưới theo ô lưới cạnh `spacing` */
export function sampleCloud(verts: ArrayLike<number>, spacing: number): number[] {
  const seen = new Set<string>();
  const out: number[] = [];
  for (let i = 0; i + 2 < verts.length; i += 3) {
    const key = `${Math.floor(verts[i] / spacing)},${Math.floor(verts[i + 1] / spacing)},${Math.floor(verts[i + 2] / spacing)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(verts[i], verts[i + 1], verts[i + 2]);
  }
  return out;
}

/** nối các hạt cách nhau không quá `r`; `base` cộng vào chỉ số khi đám hạt nằm trong một thân lớn hơn */
export function linkWithin(pts: ArrayLike<number>, r: number, base = 0): Edge[] {
  const n = Math.floor(pts.length / 3);
  const grid = new Map<string, number[]>();
  const cell = (v: number) => Math.floor(v / r);
  for (let i = 0; i < n; i++) {
    const k = `${cell(pts[i * 3])},${cell(pts[i * 3 + 1])},${cell(pts[i * 3 + 2])}`;
    const l = grid.get(k);
    if (l) l.push(i);
    else grid.set(k, [i]);
  }
  const out: Edge[] = [];
  for (let i = 0; i < n; i++) {
    const [x, y, z] = [pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2]];
    for (let a = -1; a <= 1; a++)
      for (let b = -1; b <= 1; b++)
        for (let c = -1; c <= 1; c++)
          for (const j of grid.get(`${cell(x) + a},${cell(y) + b},${cell(z) + c}`) ?? []) {
            if (j <= i) continue;
            if (len3(pts[j * 3] - x, pts[j * 3 + 1] - y, pts[j * 3 + 2] - z) <= r) out.push([i + base, j + base]);
          }
  }
  return out;
}

export interface Skin {
  k: number;
  idx: Int32Array;
  w: Float32Array;
}
/** mỗi đỉnh bám `k` hạt gần nhất (trọng số nghịch bình phương khoảng cách); `only` giới hạn hạt được bám */
export function buildSkin(verts: ArrayLike<number>, pts: ArrayLike<number>, k = 4, only?: (i: number) => boolean): Skin {
  const nv = Math.floor(verts.length / 3);
  const np = Math.floor(pts.length / 3);
  const cand = Array.from({length: np}, (_, i) => i).filter((i) => !only || only(i));
  const idx = new Int32Array(nv * k);
  const w = new Float32Array(nv * k);
  const bi = new Int32Array(k);
  const bd = new Float32Array(k);
  for (let v = 0; v < nv; v++) {
    bd.fill(Infinity);
    bi.fill(cand[0] ?? 0);
    for (const p of cand) {
      const dx = verts[v * 3] - pts[p * 3];
      const dy = verts[v * 3 + 1] - pts[p * 3 + 1];
      const dz = verts[v * 3 + 2] - pts[p * 3 + 2];
      const d = dx * dx + dy * dy + dz * dz;
      if (d >= bd[k - 1]) continue;
      let q = k - 1;
      while (q > 0 && bd[q - 1] > d) {
        bd[q] = bd[q - 1];
        bi[q] = bi[q - 1];
        q--;
      }
      bd[q] = d;
      bi[q] = p;
    }
    let sum = 0;
    for (let q = 0; q < k; q++) sum += Number.isFinite(bd[q]) ? 1 / (bd[q] + 1e-3) : 0;
    for (let q = 0; q < k; q++) {
      idx[v * k + q] = bi[q];
      w[v * k + q] = Number.isFinite(bd[q]) ? 1 / (bd[q] + 1e-3) / sum : 0;
    }
  }
  return {k, idx, w};
}
/** đỉnh mới = đỉnh nghỉ + trung bình dịch chuyển của các hạt nó bám */
export function applySkin(s: Skin, restV: ArrayLike<number>, b: SoftBody, out: Float32Array) {
  const nv = Math.floor(restV.length / 3);
  for (let v = 0; v < nv; v++) {
    let dx = 0;
    let dy = 0;
    let dz = 0;
    for (let q = 0; q < s.k; q++) {
      const p = s.idx[v * s.k + q] * 3;
      const w = s.w[v * s.k + q];
      dx += (b.pos[p] - b.rest[p]) * w;
      dy += (b.pos[p + 1] - b.rest[p + 1]) * w;
      dz += (b.pos[p + 2] - b.rest[p + 2]) * w;
    }
    out[v * 3] = restV[v * 3] + dx;
    out[v * 3 + 1] = restV[v * 3 + 1] + dy;
    out[v * 3 + 2] = restV[v * 3 + 2] + dz;
  }
}
