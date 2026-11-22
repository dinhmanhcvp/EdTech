/**
 * Máu trong trường mổ: chất lỏng hạt dựa trên vị trí (PBF: ràng buộc mật độ theo hạt nhân SPH, lưới băm để tìm láng giềng).
 * Hạt rơi xuống mặt mô (hàm `floor(x, z)` lấy từ mặt trên cột mô còn sống) nên đọng lại trong hốc rạch và tràn ra khi đầy.
 * Ống hút xoá hạt trong bán kính quanh đầu ống. Mỗi hạt đại diện `ML_PER` mL máu (để đếm lượng máu trong trường mổ).
 */
export const ML_PER = 0.25;

export class Fluid {
  max: number;
  n = 0;
  pos: Float32Array;
  prev: Float32Array;
  vel: Float32Array;
  /** 0 = máu động mạch (đỏ tươi), 1 = tĩnh mạch / mao mạch (đỏ sẫm) */
  kind: Uint8Array;
  h: number;
  rho0: number;
  gravity = -6;
  /** biên hộp (x, z) và đáy */
  bound: [number, number, number, number];
  private lambda: Float32Array;
  private grid = new Map<number, number[]>();

  constructor(max = 1500, h = 0.07, bound: [number, number, number, number] = [-2.4, 2.4, -1.6, 1.6]) {
    this.max = max;
    this.h = h;
    this.pos = new Float32Array(max * 3);
    this.prev = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.kind = new Uint8Array(max);
    this.lambda = new Float32Array(max);
    this.bound = bound;
    // mật độ nghỉ: hạt xếp cách nhau ~h/2 (khối lập phương), tính bằng chính hạt nhân
    let r = 0;
    const s = h / 2;
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) for (let c = -2; c <= 2; c++) r += this.poly6((a * s) ** 2 + (b * s) ** 2 + (c * s) ** 2);
    this.rho0 = r;
  }
  private poly6(r2: number) {
    const h2 = this.h * this.h;
    return r2 >= h2 ? 0 : (315 / (64 * Math.PI * this.h ** 9)) * (h2 - r2) ** 3;
  }
  private spikyGrad(r: number) {
    return r >= this.h || r < 1e-9 ? 0 : (-45 / (Math.PI * this.h ** 6)) * (this.h - r) ** 2;
  }
  add(x: number, y: number, z: number, vx: number, vy: number, vz: number, kind = 1): boolean {
    if (this.n >= this.max) return false;
    const i = this.n++;
    this.pos.set([x, y, z], i * 3);
    this.prev.set([x, y, z], i * 3);
    this.vel.set([vx, vy, vz], i * 3);
    this.kind[i] = kind;
    return true;
  }
  /** xoá hạt i bằng cách chép hạt cuối vào chỗ của nó */
  remove(i: number) {
    const j = --this.n;
    if (i === j) return;
    this.pos.copyWithin(i * 3, j * 3, j * 3 + 3);
    this.prev.copyWithin(i * 3, j * 3, j * 3 + 3);
    this.vel.copyWithin(i * 3, j * 3, j * 3 + 3);
    this.kind[i] = this.kind[j];
  }
  /** ống hút: xoá các hạt trong bán kính r; trả số hạt đã hút */
  suck(x: number, y: number, z: number, r: number): number {
    let n = 0;
    for (let i = this.n - 1; i >= 0; i--) {
      if (Math.hypot(this.pos[i * 3] - x, this.pos[i * 3 + 1] - y, this.pos[i * 3 + 2] - z) < r) {
        this.remove(i);
        n++;
      }
    }
    return n;
  }
  private key(x: number, y: number, z: number) {
    const h = this.h;
    return ((Math.floor(x / h) + 512) * 1024 + (Math.floor(y / h) + 512)) * 1024 + (Math.floor(z / h) + 512);
  }
  private build() {
    this.grid.clear();
    for (let i = 0; i < this.n; i++) {
      const k = this.key(this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]);
      const c = this.grid.get(k);
      if (c) c.push(i);
      else this.grid.set(k, [i]);
    }
  }
  private nbStart = new Int32Array(1);
  private nbList = new Int32Array(1);
  /** láng giềng (trong bán kính h) của mọi hạt, tính một lần mỗi bước */
  private neighbors() {
    const p = this.pos;
    const h = this.h;
    const n = this.n;
    if (this.nbStart.length < n + 1) this.nbStart = new Int32Array(this.max + 1);
    let m = 0;
    for (let i = 0; i < n; i++) {
      this.nbStart[i] = m;
      const x = p[i * 3];
      const y = p[i * 3 + 1];
      const z = p[i * 3 + 2];
      for (let a = -1; a <= 1; a++)
        for (let b = -1; b <= 1; b++)
          for (let c = -1; c <= 1; c++) {
            const cell = this.grid.get(this.key(x + a * h, y + b * h, z + c * h));
            if (!cell) continue;
            for (const j of cell) {
              if (j === i) continue;
              const dx = x - p[j * 3];
              const dy = y - p[j * 3 + 1];
              const dz = z - p[j * 3 + 2];
              if (dx * dx + dy * dy + dz * dz >= h * h * 1.2) continue;
              if (m >= this.nbList.length) {
                const nl = new Int32Array(this.nbList.length * 2 + 1024);
                nl.set(this.nbList);
                this.nbList = nl;
              }
              this.nbList[m++] = j;
            }
          }
    }
    this.nbStart[n] = m;
  }
  /** một bước: trọng lực, ràng buộc mật độ (`iters` lượt), va chạm mặt mô và biên */
  step(dt: number, floor: (x: number, z: number) => number, iters = 2) {
    const {pos, prev, vel, n} = this;
    for (let i = 0; i < n; i++) {
      vel[i * 3 + 1] += this.gravity * dt;
      prev[i * 3] = pos[i * 3];
      prev[i * 3 + 1] = pos[i * 3 + 1];
      prev[i * 3 + 2] = pos[i * 3 + 2];
      pos[i * 3] += vel[i * 3] * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
    }
    this.collide(floor);
    this.build();
    this.neighbors();
    const eps = 600;
    const NS = this.nbStart;
    const NL = this.nbList;
    const h = this.h;
    const self = this.poly6(0);
    for (let it = 0; it < iters; it++) {
      for (let i = 0; i < n; i++) {
        let rho = self;
        let sg = 0;
        let gx = 0;
        let gy = 0;
        let gz = 0;
        for (let q = NS[i]; q < NS[i + 1]; q++) {
          const j = NL[q];
          const dx = pos[i * 3] - pos[j * 3];
          const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
          const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
          const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (r >= h) continue;
          rho += this.poly6(r * r);
          if (r < 1e-9) continue;
          const g = this.spikyGrad(r) / this.rho0 / r;
          gx += dx * g;
          gy += dy * g;
          gz += dz * g;
          sg += (dx * dx + dy * dy + dz * dz) * g * g;
        }
        sg += gx * gx + gy * gy + gz * gz;
        // chỉ đẩy ra khi nén (không kéo hạt lại khi thưa): máu tràn tự do như chất lỏng có mặt thoáng
        const C = Math.max(0, rho / this.rho0 - 1);
        this.lambda[i] = -C / (sg + eps);
      }
      for (let i = 0; i < n; i++) {
        let dx0 = 0;
        let dy0 = 0;
        let dz0 = 0;
        for (let q = NS[i]; q < NS[i + 1]; q++) {
          const j = NL[q];
          const dx = pos[i * 3] - pos[j * 3];
          const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
          const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
          const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (r >= h || r < 1e-9) continue;
          const s = ((this.lambda[i] + this.lambda[j]) * this.spikyGrad(r)) / this.rho0 / r;
          dx0 += dx * s;
          dy0 += dy * s;
          dz0 += dz * s;
        }
        pos[i * 3] += dx0;
        pos[i * 3 + 1] += dy0;
        pos[i * 3 + 2] += dz0;
      }
      this.collide(floor);
    }
    for (let i = 0; i < n; i++) {
      vel[i * 3] = ((pos[i * 3] - prev[i * 3]) / dt) * 0.98;
      vel[i * 3 + 1] = ((pos[i * 3 + 1] - prev[i * 3 + 1]) / dt) * 0.98;
      vel[i * 3 + 2] = ((pos[i * 3 + 2] - prev[i * 3 + 2]) / dt) * 0.98;
    }
  }
  private collide(floor: (x: number, z: number) => number) {
    const p = this.pos;
    const [x0, x1, z0, z1] = this.bound;
    for (let i = 0; i < this.n; i++) {
      p[i * 3] = Math.min(x1, Math.max(x0, p[i * 3]));
      p[i * 3 + 2] = Math.min(z1, Math.max(z0, p[i * 3 + 2]));
      const f = floor(p[i * 3], p[i * 3 + 2]) + this.h * 0.25;
      if (p[i * 3 + 1] < f) {
        p[i * 3 + 1] = f;
        // ma sát với mặt mô ướt: máu bám, trườn chậm
        p[i * 3] = p[i * 3] * 0.7 + this.prev[i * 3] * 0.3;
        p[i * 3 + 2] = p[i * 3 + 2] * 0.7 + this.prev[i * 3 + 2] * 0.3;
      }
    }
  }
  /** máu trong trường mổ (mL) */
  ml() {
    return this.n * ML_PER;
  }
}
