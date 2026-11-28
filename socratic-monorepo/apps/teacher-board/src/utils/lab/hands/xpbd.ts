/** độ dài vectơ 3 chiều; `Math.hypot` chậm hơn nhiều lần trong vòng giải nóng của V8 */
const len3 = (x: number, y: number, z: number) => Math.sqrt(x * x + y * y + z * z);

/**
 * Mô mềm cho bài "Mổ mô mềm" (/lab): khối tứ diện ba lớp (cơ ở dưới, mỡ, da trên cùng) giải bằng XPBD (động lực học dựa trên vị trí mở rộng):
 *  - ràng buộc độ dài cạnh (độ mềm `compliance` riêng từng lớp; cơ cứng hơn theo hướng thớ x; da căng sẵn) và ràng buộc thể tích tứ diện (mô gần như không nén);
 *  - rạch = XOÁ PHẦN TỬ: tứ diện bị xoá thật, mặt ngoài tính lại từ các mặt chỉ thuộc một tứ diện còn sống → hốc mổ có chiều sâu, mép tự banh ra do da căng;
 *  - kẹp / banh = ràng buộc gắn một đỉnh vào điểm tay; kéo quá ngưỡng (theo lớp) thì cạnh đứt → tứ diện kề bị xoá (mô rách);
 *  - nhiệt (dao đốt): giá trị trên đỉnh, lan theo cạnh; đã cháy thì đổi màu;
 *  - mũi khâu: ràng buộc khoảng cách giữa hai đỉnh hai bên mép, độ dài nghỉ rút dần (thắt nút) kéo hai mép khép lại;
 *  - sợi chỉ: chuỗi hạt có ràng buộc độ dài (không giãn) và độ uốn.
 * Đây là mô hình XPBD tứ diện chạy thời gian thực trong trình duyệt, không phải phần tử hữu hạn đầy đủ.
 * Toạ độ cảnh: x (dài khối), y lên, z (rộng khối); mặt bàn y = 0.
 */

/** ngưỡng ngủ của bộ giải mô: vận tốc đỉnh (đơn vị cảnh/giây) và số bước liên tiếp đứng yên */
export const SLEEP_V = 0.004;
export const SLEEP_N = 30;

export type Layer = 0 | 1 | 2; // 0 cơ, 1 mỡ, 2 da
export const LAYER_NAME = ['Cơ', 'Mỡ', 'Da'] as const;
/** độ mềm XPBD (nghịch đảo độ cứng) của cạnh trong mỗi lớp; cơ: cạnh dọc thớ (x) cứng hơn */
export const COMPLIANCE = {muscle: 4e-5, muscleFiber: 6e-6, fat: 6e-4, skin: 4e-6};
/** tỉ lệ giãn làm đứt cạnh: mỡ dễ tách nhất, da dai nhất */
export const TEAR = [2.0, 1.75, 2.6];
/** da căng sẵn: độ dài nghỉ cạnh ngang của lớp da nhỏ hơn độ dài ban đầu (mép rạch tự banh ra) */
export const SKIN_PRETENSION = 0.07;

export interface TissueSpec {
  nx: number;
  nz: number;
  /** độ dày từng hàng ô từ dưới lên, kèm lớp */
  rows: {h: number; layer: Layer}[];
  sx: number;
  sz: number;
}
export const DEFAULT_SPEC: TissueSpec = {
  nx: 24,
  nz: 16,
  rows: [
    {h: 0.15, layer: 0},
    {h: 0.15, layer: 0},
    {h: 0.13, layer: 1},
    {h: 0.13, layer: 1},
    {h: 0.08, layer: 2},
  ],
  sx: 3,
  sz: 2,
};

/** sáu tứ diện của một ô lục diện, chia theo đường chéo 0–7 (cùng cách chia ở mọi ô nên các ô kề khớp mặt) */
const KUHN = [
  [0, 1, 3, 7],
  [0, 1, 5, 7],
  [0, 2, 3, 7],
  [0, 2, 6, 7],
  [0, 4, 5, 7],
  [0, 4, 6, 7],
];

export interface Attach {
  v: number;
  target: [number, number, number];
  compliance: number;
}
export interface Stitch {
  a: number;
  b: number;
  rest: number;
  goal: number;
}

export class Tissue {
  spec: TissueSpec;
  nv: number;
  pos: Float32Array;
  prev: Float32Array;
  vel: Float32Array;
  invMass: Float32Array;
  /** lớp của đỉnh (lớp của hàng ô ngay dưới đỉnh, đỉnh đáy = cơ) */
  vLayer: Uint8Array;
  tets: Int32Array;
  tetLayer: Uint8Array;
  tetCell: Int32Array;
  rest0: Float32Array;
  alive: Uint8Array;
  edges: Int32Array;
  edgeRest: Float32Array;
  edgeComp: Float32Array;
  edgeLayer: Uint8Array;
  /** số tứ diện còn sống chứa cạnh: 0 thì cạnh không còn tác dụng */
  edgeRef: Int32Array;
  /** các tứ diện chứa mỗi cạnh (để đứt cạnh → xoá tứ diện) */
  edgeTets: number[][];
  /** láng giềng của đỉnh (lan nhiệt) */
  nbr: number[][];
  heat: Float32Array;
  burned: Float32Array;
  attaches: Attach[] = [];
  stitches: Stitch[] = [];
  /** tăng mỗi khi tô-pô đổi (cảnh dựng lại mặt ngoài) */
  topo = 0;
  gravity = -2;
  /** đếm tứ diện bị xoá do rách (không phải do dao) */
  torn = 0;

  constructor(spec: TissueSpec = DEFAULT_SPEC) {
    this.spec = spec;
    const {nx, nz, rows, sx, sz} = spec;
    const ny = rows.length;
    const NX = nx + 1;
    const NY = ny + 1;
    const NZ = nz + 1;
    this.nv = NX * NY * NZ;
    this.pos = new Float32Array(this.nv * 3);
    this.invMass = new Float32Array(this.nv);
    this.vLayer = new Uint8Array(this.nv);
    const ys = [0];
    for (const r of rows) ys.push(ys[ys.length - 1] + r.h);
    for (let k = 0; k < NZ; k++)
      for (let j = 0; j < NY; j++)
        for (let i = 0; i < NX; i++) {
          const v = this.vid(i, j, k);
          this.pos.set([(i / nx - 0.5) * sx, ys[j], (k / nz - 0.5) * sz], v * 3);
          // đáy và bốn mặt bên ghim cố định (khối mô đặt trên bàn, mép ngoài được khăn mổ giữ)
          const pinned = j === 0 || i === 0 || i === nx || k === 0 || k === nz;
          this.invMass[v] = pinned ? 0 : 1;
          this.vLayer[v] = rows[Math.max(0, j - 1)].layer;
        }
    this.prev = this.pos.slice();
    this.vel = new Float32Array(this.nv * 3);
    const tets: number[] = [];
    const tl: number[] = [];
    const tc: number[] = [];
    for (let k = 0; k < nz; k++)
      for (let j = 0; j < ny; j++)
        for (let i = 0; i < nx; i++) {
          const c = [0, 1, 2, 3, 4, 5, 6, 7].map((b) => this.vid(i + (b & 1), j + ((b >> 1) & 1), k + ((b >> 2) & 1)));
          for (const t of KUHN) {
            tets.push(c[t[0]], c[t[1]], c[t[2]], c[t[3]]);
            tl.push(rows[j].layer);
            tc.push(this.cid(i, j, k));
          }
        }
    this.tets = Int32Array.from(tets);
    this.tetLayer = Uint8Array.from(tl);
    this.tetCell = Int32Array.from(tc);
    const nt = tl.length;
    this.alive = new Uint8Array(nt).fill(1);
    this.rest0 = new Float32Array(nt);
    for (let t = 0; t < nt; t++) this.rest0[t] = this.tetVolume(t);
    // cạnh: duy nhất, lớp = lớp cao nhất của các tứ diện chứa nó
    const key = new Map<number, number>();
    const E: number[] = [];
    const EL: number[] = [];
    const ET: number[][] = [];
    for (let t = 0; t < nt; t++)
      for (let a = 0; a < 4; a++)
        for (let b = a + 1; b < 4; b++) {
          const u = Math.min(this.tets[t * 4 + a], this.tets[t * 4 + b]);
          const w = Math.max(this.tets[t * 4 + a], this.tets[t * 4 + b]);
          const kk = u * this.nv + w;
          let e = key.get(kk);
          if (e === undefined) {
            e = EL.length;
            key.set(kk, e);
            E.push(u, w);
            EL.push(this.tetLayer[t]);
            ET.push([]);
          } else EL[e] = Math.max(EL[e], this.tetLayer[t]);
          ET[e].push(t);
        }
    this.edges = Int32Array.from(E);
    this.edgeLayer = Uint8Array.from(EL);
    this.edgeTets = ET;
    const ne = EL.length;
    this.edgeRest = new Float32Array(ne);
    this.edgeComp = new Float32Array(ne);
    this.edgeRef = new Int32Array(ne);
    this.nbr = Array.from({length: this.nv}, () => []);
    for (let e = 0; e < ne; e++) {
      const u = E[e * 2];
      const w = E[e * 2 + 1];
      const d = this.dist(u, w);
      const dx = Math.abs(this.pos[u * 3] - this.pos[w * 3]);
      const dy = Math.abs(this.pos[u * 3 + 1] - this.pos[w * 3 + 1]);
      const L = EL[e];
      // da căng: cạnh nằm ngang (không có thành phần y) của lớp da ngắn lại
      this.edgeRest[e] = L === 2 && dy < 1e-6 ? d * (1 - SKIN_PRETENSION) : d;
      this.edgeComp[e] = L === 2 ? COMPLIANCE.skin : L === 1 ? COMPLIANCE.fat : dx > 0.9 * d ? COMPLIANCE.muscleFiber : COMPLIANCE.muscle;
      this.edgeRef[e] = ET[e].length;
      this.nbr[u].push(w);
      this.nbr[w].push(u);
    }
    this.heat = new Float32Array(this.nv);
    this.burned = new Float32Array(this.nv);
  }

  vid(i: number, j: number, k: number) {
    const {nx, rows} = this.spec;
    return i + (nx + 1) * (j + (rows.length + 1) * k);
  }
  cid(i: number, j: number, k: number) {
    const {nx, rows} = this.spec;
    return i + nx * (j + rows.length * k);
  }
  dist(u: number, w: number) {
    const p = this.pos;
    return len3(p[u * 3] - p[w * 3], p[u * 3 + 1] - p[w * 3 + 1], p[u * 3 + 2] - p[w * 3 + 2]);
  }
  tetVolume(t: number) {
    const p = this.pos;
    const [a, b, c, d] = [0, 1, 2, 3].map((n) => this.tets[t * 4 + n] * 3);
    const ux = p[b] - p[a];
    const uy = p[b + 1] - p[a + 1];
    const uz = p[b + 2] - p[a + 2];
    const vx = p[c] - p[a];
    const vy = p[c + 1] - p[a + 1];
    const vz = p[c + 2] - p[a + 2];
    const wx = p[d] - p[a];
    const wy = p[d + 1] - p[a + 1];
    const wz = p[d + 2] - p[a + 2];
    return (ux * (vy * wz - vz * wy) - uy * (vx * wz - vz * wx) + uz * (vx * wy - vy * wx)) / 6;
  }
  /** tổng thể tích các tứ diện còn sống (kiểm tra mô không nén) */
  volume() {
    let s = 0;
    // cách chia Kuhn cho tứ diện hướng dương và âm xen kẽ: cộng trị tuyệt đối
    for (let t = 0; t < this.alive.length; t++) if (this.alive[t]) s += Math.abs(this.tetVolume(t));
    return s;
  }

  /** xoá một tứ diện; trả true nếu thật sự xoá */
  kill(t: number): boolean {
    if (!this.alive[t]) return false;
    this.alive[t] = 0;
    for (let a = 0; a < 4; a++)
      for (let b = a + 1; b < 4; b++) {
        const e = this.edgeOf(this.tets[t * 4 + a], this.tets[t * 4 + b]);
        if (e >= 0) this.edgeRef[e]--;
      }
    this.topo++;
    return true;
  }
  private edgeIdx: Map<number, number> | null = null;
  edgeOf(u: number, w: number) {
    if (!this.edgeIdx) {
      this.edgeIdx = new Map();
      for (let e = 0; e < this.edgeRest.length; e++) this.edgeIdx.set(this.edges[e * 2] * this.nv + this.edges[e * 2 + 1], e);
    }
    return this.edgeIdx.get(Math.min(u, w) * this.nv + Math.max(u, w)) ?? -1;
  }
  /** xoá cả ô (sáu tứ diện) */
  killCell(i: number, j: number, k: number) {
    const c = this.cid(i, j, k);
    let n = 0;
    for (let t = c * 6; t < c * 6 + 6; t++) if (this.tetCell[t] === c && this.kill(t)) n++;
    return n;
  }
  cellAlive(i: number, j: number, k: number) {
    const c = this.cid(i, j, k);
    for (let t = c * 6; t < c * 6 + 6; t++) if (this.alive[t]) return true;
    return false;
  }
  /** hàng ô cao nhất còn sống ở cột (i, k); −1 nếu cột đã rạch tới đáy */
  topRow(i: number, k: number) {
    for (let j = this.spec.rows.length - 1; j >= 0; j--) if (this.cellAlive(i, j, k)) return j;
    return -1;
  }
  /** ô chứa điểm (x, z) theo vị trí nghỉ */
  cellAt(x: number, z: number): [number, number] | null {
    const {nx, nz, sx, sz} = this.spec;
    const i = Math.floor((x / sx + 0.5) * nx);
    const k = Math.floor((z / sz + 0.5) * nz);
    return i >= 0 && i < nx && k >= 0 && k < nz ? [i, k] : null;
  }
  /**
   * Một nhát dao qua cột (i, k): xoá hàng ô trên cùng còn sống (rạch lại cùng chỗ thì vào sâu thêm một lớp). Mép cột bên không ghim.
   * Trả lớp vừa bị cắt (để sinh rỉ máu mao mạch), hoặc null.
   */
  cut(i: number, k: number): Layer | null {
    const {nx, nz, rows} = this.spec;
    if (i <= 0 || k <= 0 || i >= nx - 1 || k >= nz - 1) return null;
    const j = this.topRow(i, k);
    if (j < 0) return null;
    this.killCell(i, j, k);
    return rows[j].layer;
  }

  /**
   * NGỦ: mô không bị cầm / kéo / cắt / khâu và đã đứng yên (mọi đỉnh chậm hơn `SLEEP_V`) suốt `SLEEP_N` bước thì bỏ qua bước giải
   * (bộ giải là phần tốn nhất của bài mổ mô mềm). Bất cứ thay đổi nào của điểm ghim, mũi khâu, tứ diện hay trọng lực đều đánh thức ngay.
   */
  asleep = false;
  private calm = 0;
  private lastSig = NaN;
  /** chữ ký các tác động bên ngoài: đổi là phải giải lại */
  private signature(): number {
    let s = this.topo * 1e6 + this.attaches.length * 1e3 + this.stitches.length * 7 + this.gravity;
    for (const a of this.attaches) s += Math.round((a.target[0] * 3 + a.target[1] * 5 + a.target[2] * 7) * 1e4) + a.v;
    for (const st of this.stitches) s += Math.round(st.rest * 1e4);
    return s;
  }
  /** đánh thức (ví dụ khi cảnh sửa thẳng `pos`) */
  wake() {
    this.calm = 0;
    this.asleep = false;
  }
  /** một bước thời gian: `sub` bước con XPBD, mỗi bước con một lượt giải mọi ràng buộc */
  step(dt: number, sub = 6) {
    const sig = this.signature();
    if (sig !== this.lastSig) {
      this.lastSig = sig;
      this.calm = 0;
    }
    if (this.calm >= SLEEP_N) {
      this.asleep = true;
      for (const st of this.stitches) st.rest += (st.goal - st.rest) * Math.min(1, dt * 3);
      return;
    }
    this.asleep = false;
    const h = dt / sub;
    const {pos, prev, vel, invMass} = this;
    for (let s = 0; s < sub; s++) {
      for (let v = 0; v < this.nv; v++) {
        if (!invMass[v]) continue;
        vel[v * 3 + 1] += this.gravity * h;
        prev[v * 3] = pos[v * 3];
        prev[v * 3 + 1] = pos[v * 3 + 1];
        prev[v * 3 + 2] = pos[v * 3 + 2];
        pos[v * 3] += vel[v * 3] * h;
        pos[v * 3 + 1] += vel[v * 3 + 1] * h;
        pos[v * 3 + 2] += vel[v * 3 + 2] * h;
        // không xuyên mặt bàn
        if (pos[v * 3 + 1] < 0) pos[v * 3 + 1] = 0;
      }
      this.solveEdges(h);
      this.solveVolumes(h);
      this.solveAttach(h);
      for (let v = 0; v < this.nv; v++) {
        if (!invMass[v]) continue;
        // giảm chấn mạnh: mô sống nhiều nước, không nảy
        const damp = 1 - Math.min(1, 6 * h);
        vel[v * 3] = ((pos[v * 3] - prev[v * 3]) / h) * damp;
        vel[v * 3 + 1] = ((pos[v * 3 + 1] - prev[v * 3 + 1]) / h) * damp;
        vel[v * 3 + 2] = ((pos[v * 3 + 2] - prev[v * 3 + 2]) / h) * damp;
      }
    }
    for (const st of this.stitches) st.rest += (st.goal - st.rest) * Math.min(1, dt * 3);
    let vmax = 0;
    for (let i = 0; i < vel.length; i++) vmax = Math.max(vmax, Math.abs(vel[i]));
    this.calm = vmax < SLEEP_V ? this.calm + 1 : 0;
  }
  private pull(u: number, w: number, rest: number, comp: number, h: number) {
    const p = this.pos;
    const wu = this.invMass[u];
    const ww = this.invMass[w];
    const W = wu + ww;
    if (!W) return;
    const dx = p[u * 3] - p[w * 3];
    const dy = p[u * 3 + 1] - p[w * 3 + 1];
    const dz = p[u * 3 + 2] - p[w * 3 + 2];
    const L = len3(dx, dy, dz);
    if (L < 1e-9) return;
    const C = L - rest;
    const lam = -C / (W + comp / (h * h));
    const k = lam / L;
    p[u * 3] += dx * k * wu;
    p[u * 3 + 1] += dy * k * wu;
    p[u * 3 + 2] += dz * k * wu;
    p[w * 3] -= dx * k * ww;
    p[w * 3 + 1] -= dy * k * ww;
    p[w * 3 + 2] -= dz * k * ww;
  }
  private solveEdges(h: number) {
    const ne = this.edgeRest.length;
    for (let e = 0; e < ne; e++) if (this.edgeRef[e] > 0) this.pull(this.edges[e * 2], this.edges[e * 2 + 1], this.edgeRest[e], this.edgeComp[e], h);
    // chỉ thắt vừa tay: hơi mềm để không xé mép mô quanh mũi khâu
    for (const st of this.stitches) this.pull(st.a, st.b, st.rest, 1.5e-5, h);
  }
  private solveVolumes(h: number) {
    const p = this.pos;
    const im = this.invMass;
    const T = this.tets;
    const comp = 1e-6 / (h * h);
    const g = this.vg;
    // mặt đối diện từng đỉnh (thứ tự cho gradient thể tích hướng đúng)
    const O = Tissue.ORDER;
    const id = this.vid4;
    for (let t = 0; t < this.alive.length; t++) {
      if (!this.alive[t]) continue;
      id[0] = T[t * 4];
      id[1] = T[t * 4 + 1];
      id[2] = T[t * 4 + 2];
      id[3] = T[t * 4 + 3];
      let W = 0;
      for (let n = 0; n < 4; n++) {
        const a = id[O[n * 3]] * 3;
        const b = id[O[n * 3 + 1]] * 3;
        const c = id[O[n * 3 + 2]] * 3;
        const ux = p[b] - p[a];
        const uy = p[b + 1] - p[a + 1];
        const uz = p[b + 2] - p[a + 2];
        const vx = p[c] - p[a];
        const vy = p[c + 1] - p[a + 1];
        const vz = p[c + 2] - p[a + 2];
        g[n * 3] = (uy * vz - uz * vy) / 6;
        g[n * 3 + 1] = (uz * vx - ux * vz) / 6;
        g[n * 3 + 2] = (ux * vy - uy * vx) / 6;
        W += im[id[n]] * (g[n * 3] * g[n * 3] + g[n * 3 + 1] * g[n * 3 + 1] + g[n * 3 + 2] * g[n * 3 + 2]);
      }
      if (W < 1e-12) continue;
      const a = id[0] * 3;
      const b = id[1] * 3;
      const c = id[2] * 3;
      const d = id[3] * 3;
      const ux = p[b] - p[a];
      const uy = p[b + 1] - p[a + 1];
      const uz = p[b + 2] - p[a + 2];
      const vx = p[c] - p[a];
      const vy = p[c + 1] - p[a + 1];
      const vz = p[c + 2] - p[a + 2];
      const wx = p[d] - p[a];
      const wy = p[d + 1] - p[a + 1];
      const wz = p[d + 2] - p[a + 2];
      const V = (ux * (vy * wz - vz * wy) - uy * (vx * wz - vz * wx) + uz * (vx * wy - vy * wx)) / 6;
      const lam = -(V - this.rest0[t]) / (W + comp);
      for (let n = 0; n < 4; n++) {
        const k = lam * im[id[n]];
        if (!k) continue;
        p[id[n] * 3] += g[n * 3] * k;
        p[id[n] * 3 + 1] += g[n * 3 + 1] * k;
        p[id[n] * 3 + 2] += g[n * 3 + 2] * k;
      }
    }
  }
  static ORDER = Int32Array.from([1, 3, 2, 0, 2, 3, 0, 3, 1, 0, 1, 2]);
  private vg = new Float32Array(12);
  private vid4 = new Int32Array(4);
  private solveAttach(h: number) {
    const p = this.pos;
    for (const a of this.attaches) {
      const w = this.invMass[a.v];
      if (!w) continue;
      const k = w / (w + a.compliance / (h * h));
      for (let c = 0; c < 3; c++) p[a.v * 3 + c] += (a.target[c] - p[a.v * 3 + c]) * k;
    }
  }

  /** cạnh giãn quá ngưỡng của lớp thì đứt: xoá các tứ diện chứa nó. Trả số tứ diện rách */
  tear(): number {
    let n = 0;
    for (let e = 0; e < this.edgeRest.length; e++) {
      if (this.edgeRef[e] <= 0) continue;
      const r = this.dist(this.edges[e * 2], this.edges[e * 2 + 1]) / this.edgeRest[e];
      if (r > TEAR[this.edgeLayer[e]]) for (const t of this.edgeTets[e]) if (this.kill(t)) n++;
    }
    this.torn += n;
    return n;
  }

  /** dao đốt: nung các đỉnh trong bán kính r quanh điểm; nhiệt lan theo cạnh và nguội dần; `burned` giữ mức cao nhất đã đạt */
  cauterize(at: [number, number, number], r: number, amount: number) {
    for (let v = 0; v < this.nv; v++) {
      const d = len3(this.pos[v * 3] - at[0], this.pos[v * 3 + 1] - at[1], this.pos[v * 3 + 2] - at[2]);
      if (d < r) this.heat[v] += amount * (1 - d / r);
    }
  }
  diffuseHeat(dt: number) {
    const next = this.heat.slice();
    for (let v = 0; v < this.nv; v++) {
      const nb = this.nbr[v];
      if (!nb.length) continue;
      let s = 0;
      for (const w of nb) s += this.heat[w];
      next[v] += (s / nb.length - this.heat[v]) * Math.min(1, dt * 2.5);
      next[v] *= 1 - Math.min(1, dt * 0.8);
      if (next[v] > this.burned[v]) this.burned[v] = next[v];
    }
    this.heat = next;
  }

  /** mặt ngoài hiện tại: mọi mặt tam giác chỉ thuộc một tứ diện còn sống, kèm lớp và chỉ số của tứ diện đó; hướng pháp tuyến ra ngoài */
  boundary(): {tri: Int32Array; layer: Uint8Array; tet: Int32Array} {
    const cnt = new Map<number, {f: [number, number, number]; t: number; n: number}>();
    const nv = this.nv;
    const FACES = [
      [0, 2, 1],
      [0, 1, 3],
      [0, 3, 2],
      [1, 2, 3],
    ];
    for (let t = 0; t < this.alive.length; t++) {
      if (!this.alive[t]) continue;
      const id = [this.tets[t * 4], this.tets[t * 4 + 1], this.tets[t * 4 + 2], this.tets[t * 4 + 3]];
      // bảo đảm thứ tự đỉnh dương (thể tích nghỉ > 0) để mặt quay ra ngoài
      if (this.rest0[t] < 0) [id[1], id[2]] = [id[2], id[1]];
      for (const f of FACES) {
        const tri: [number, number, number] = [id[f[0]], id[f[1]], id[f[2]]];
        const lo = Math.min(tri[0], tri[1], tri[2]);
        const hi = Math.max(tri[0], tri[1], tri[2]);
        const key = (lo * nv + (tri[0] + tri[1] + tri[2] - lo - hi)) * nv + hi;
        const c = cnt.get(key);
        if (c) c.n++;
        else cnt.set(key, {f: tri, t, n: 1});
      }
    }
    const tri: number[] = [];
    const layer: number[] = [];
    const tet: number[] = [];
    for (const c of cnt.values())
      if (c.n === 1) {
        tri.push(...c.f);
        layer.push(this.tetLayer[c.t]);
        tet.push(c.t);
      }
    return {tri: Int32Array.from(tri), layer: Uint8Array.from(layer), tet: Int32Array.from(tet)};
  }
  /**
   * Cột (i, k) mà nhát dao chạm mặt ngoài (a, b, c) của tứ diện `t` thuộc về. Mặt nằm ngang (da, đáy rãnh): cột của chính ô đó.
   * Mặt đứng (vách rãnh: lộ ra vì ô cùng hàng ở cột bên đã bị rạch): cột bên kia vách, tức chính rãnh, để rạch lại thì rãnh sâu thêm
   * chứ không xén sang vách. Vách ngoài cùng của khối (bên kia không còn cột) giữ cột của ô.
   * Tính theo chỉ số lưới nên đúng cả khi mô đã biến dạng (mép rãnh banh ra vì da căng), khác `cellAt` (theo vị trí nghỉ).
   */
  faceColumn(a: number, b: number, c: number, t: number): [number, number] {
    const {nx, nz, rows} = this.spec;
    const NX = nx + 1;
    const NY = rows.length + 1;
    const cell = this.tetCell[t];
    const ci = cell % nx;
    const ck = Math.floor(cell / (nx * rows.length));
    const gi = (v: number) => v % NX;
    const gj = (v: number) => Math.floor(v / NX) % NY;
    const gk = (v: number) => Math.floor(v / (NX * NY));
    if (gj(a) === gj(b) && gj(b) === gj(c)) return [ci, ck];
    if (gi(a) === gi(b) && gi(b) === gi(c)) {
      const ni = gi(a) === ci ? ci - 1 : ci + 1;
      return ni >= 0 && ni < nx ? [ni, ck] : [ci, ck];
    }
    if (gk(a) === gk(b) && gk(b) === gk(c)) {
      const nk = gk(a) === ck ? ck - 1 : ck + 1;
      return nk >= 0 && nk < nz ? [ci, nk] : [ci, ck];
    }
    return [ci, ck];
  }
  /** đỉnh gần điểm nhất (chỉ đỉnh còn thuộc ít nhất một tứ diện sống) */
  nearest(at: [number, number, number], maxD = Infinity): number {
    let best = -1;
    let bd = maxD;
    const used = new Uint8Array(this.nv);
    for (let t = 0; t < this.alive.length; t++) if (this.alive[t]) for (let n = 0; n < 4; n++) used[this.tets[t * 4 + n]] = 1;
    for (let v = 0; v < this.nv; v++) {
      if (!used[v]) continue;
      const d = len3(this.pos[v * 3] - at[0], this.pos[v * 3 + 1] - at[1], this.pos[v * 3 + 2] - at[2]);
      if (d < bd) {
        bd = d;
        best = v;
      }
    }
    return best;
  }
  /** nội suy vị trí hiện tại của một điểm nghỉ (x, y, z) theo 8 đỉnh ô chứa nó: mạch máu, nguồn chảy máu đi theo mô */
  embed(x: number, y: number, z: number): (out: [number, number, number]) => [number, number, number] {
    const {nx, nz, rows, sx, sz} = this.spec;
    const fx = Math.min(nx - 1e-6, Math.max(0, (x / sx + 0.5) * nx));
    const fz = Math.min(nz - 1e-6, Math.max(0, (z / sz + 0.5) * nz));
    let j = 0;
    let y0 = 0;
    while (j < rows.length - 1 && y > y0 + rows[j].h) y0 += rows[j++].h;
    const i = Math.floor(fx);
    const k = Math.floor(fz);
    const u = fx - i;
    const w = fz - k;
    const t = Math.min(1, Math.max(0, (y - y0) / rows[j].h));
    const c = [0, 1, 2, 3, 4, 5, 6, 7].map((b) => this.vid(i + (b & 1), j + ((b >> 1) & 1), k + ((b >> 2) & 1)));
    const wt = [0, 1, 2, 3, 4, 5, 6, 7].map((b) => (b & 1 ? u : 1 - u) * ((b >> 1) & 1 ? t : 1 - t) * ((b >> 2) & 1 ? w : 1 - w));
    return (out) => {
      out[0] = out[1] = out[2] = 0;
      for (let n = 0; n < 8; n++) for (let a = 0; a < 3; a++) out[a] += this.pos[c[n] * 3 + a] * wt[n];
      return out;
    };
  }
  /** ô chứa điểm nghỉ (để biết dao đã cắt vào chưa) */
  cellOf(x: number, y: number, z: number): [number, number, number] | null {
    const ik = this.cellAt(x, z);
    if (!ik) return null;
    let j = 0;
    let y0 = 0;
    const {rows} = this.spec;
    while (j < rows.length - 1 && y > y0 + rows[j].h) y0 += rows[j++].h;
    return [ik[0], j, ik[1]];
  }
}

/** sợi chỉ: chuỗi hạt không giãn có độ uốn; đầu 0 neo vào điểm khâu cuối, đầu cuối theo kim */
export class Thread {
  n: number;
  pos: Float32Array;
  prev: Float32Array;
  seg: number;
  constructor(n = 24, seg = 0.05, at: [number, number, number] = [0, 0.8, 0]) {
    this.n = n;
    this.seg = seg;
    this.pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) this.pos.set([at[0] + i * seg, at[1], at[2]], i * 3);
    this.prev = this.pos.slice();
  }
  /** `a` = neo đầu chỉ (null = tự do), `b` = mũi kim */
  step(dt: number, a: [number, number, number] | null, b: [number, number, number], floor = 0) {
    const p = this.pos;
    const n = this.n;
    for (let i = 0; i < n; i++) {
      const vx = (p[i * 3] - this.prev[i * 3]) * 0.96;
      const vy = (p[i * 3 + 1] - this.prev[i * 3 + 1]) * 0.96;
      const vz = (p[i * 3 + 2] - this.prev[i * 3 + 2]) * 0.96;
      this.prev[i * 3] = p[i * 3];
      this.prev[i * 3 + 1] = p[i * 3 + 1];
      this.prev[i * 3 + 2] = p[i * 3 + 2];
      p[i * 3] += vx;
      p[i * 3 + 1] += vy - 2 * dt * dt;
      p[i * 3 + 2] += vz;
    }
    for (let it = 0; it < 12; it++) {
      if (a) p.set(a, 0);
      p.set(b, (n - 1) * 3);
      for (let i = 0; i < n - 1; i++) {
        const fixA = (i === 0 && a) || false;
        const fixB = i + 1 === n - 1;
        const dx = p[i * 3 + 3] - p[i * 3];
        const dy = p[i * 3 + 4] - p[i * 3 + 1];
        const dz = p[i * 3 + 5] - p[i * 3 + 2];
        const L = len3(dx, dy, dz) || 1e-9;
        const C = (L - this.seg) / L;
        const wa = fixA ? 0 : 1;
        const wb = fixB ? 0 : 1;
        const W = wa + wb;
        if (!W) continue;
        p[i * 3] += (dx * C * wa) / W;
        p[i * 3 + 1] += (dy * C * wa) / W;
        p[i * 3 + 2] += (dz * C * wa) / W;
        p[i * 3 + 3] -= (dx * C * wb) / W;
        p[i * 3 + 4] -= (dy * C * wb) / W;
        p[i * 3 + 5] -= (dz * C * wb) / W;
      }
      // độ uốn: kéo nhẹ hạt giữa về trung điểm hai hạt bên
      for (let i = 1; i < n - 1; i++)
        for (let c = 0; c < 3; c++) p[i * 3 + c] += ((p[(i - 1) * 3 + c] + p[(i + 1) * 3 + c]) / 2 - p[i * 3 + c]) * 0.04;
      for (let i = 0; i < n; i++) if (p[i * 3 + 1] < floor) p[i * 3 + 1] = floor;
    }
  }
  length() {
    let s = 0;
    for (let i = 0; i < this.n - 1; i++) s += len3(this.pos[i * 3 + 3] - this.pos[i * 3], this.pos[i * 3 + 4] - this.pos[i * 3 + 1], this.pos[i * 3 + 5] - this.pos[i * 3 + 2]);
    return s;
  }
}
