// apps/teacher-board/src/utils/physicsModels.ts
/**
 * Bốn mô hình Vật lí tất định (tài liệu nghiên cứu, mục 1.2), phần tính toán thuần túy để kiểm thử:
 *  - PHYS_GAS_STATE_PV     : khí lí tưởng pV = nRT; quá trình đẳng nhiệt/áp/tích/đoạn nhiệt; chu trình Carnot, Otto, tam giác; công, nhiệt, hiệu suất
 *  - PHYS_DOUBLE_PENDULUM  : con lắc kép (Lagrange) tích phân RK4; năng lượng; hai con lắc lệch 0,001 rad để thấy hỗn loạn
 *  - PHYS_CORIOLIS_FORCE   : chuyển động trong hệ quy chiếu quay: quỹ đạo trong hệ quán tính và hệ quay, gia tốc Coriolis 2ωv
 *  - PHYS_FRAUNHOFER_DIFF  : nhiễu xạ Fraunhofer qua N khe: I(θ) = I₀(sinβ/β)²(sinNγ/(N sinγ))²
 */

// ============================================================ Khí lí tưởng
export const R_LATM = 0.082057; // L·atm/(mol·K)
export const LATM_J = 101.325; // 1 L·atm = 101,325 J
export const R_GAS = R_LATM * LATM_J; // J/(mol·K) ≈ 8,3145 — dùng cùng một hằng số để nguyên lí I khớp tuyệt đối

export interface GasState {
  p: number; // atm
  V: number; // L
  T: number; // K
}
export type ProcKind = 'isothermal' | 'isobaric' | 'isochoric' | 'adiabatic';
export interface Process {
  kind: ProcKind;
  from: GasState;
  to: GasState;
}

export const gasFromVT = (n: number, V: number, T: number): GasState => ({p: (n * R_LATM * T) / V, V, T});
export const gasFromPV = (n: number, p: number, V: number): GasState => ({p, V, T: (p * V) / (n * R_LATM)});

/** Tạo quá trình từ trạng thái đầu và một đại lượng đích (V đích; riêng đẳng tích là p đích). */
export function makeProcess(kind: ProcKind, from: GasState, target: number, n: number, gamma: number): Process {
  switch (kind) {
    case 'isothermal':
      return {kind, from, to: gasFromVT(n, target, from.T)};
    case 'isobaric':
      return {kind, from, to: gasFromPV(n, from.p, target)};
    case 'isochoric':
      return {kind, from, to: gasFromPV(n, target, from.V)};
    case 'adiabatic': {
      const p = from.p * (from.V / target) ** gamma; // pV^γ = const
      return {kind, from, to: gasFromPV(n, p, target)};
    }
  }
}

/** Trạng thái tại điểm u ∈ [0,1] dọc quá trình (nội suy theo V, riêng đẳng tích theo p). */
export function along(proc: Process, u: number, n: number, gamma: number): GasState {
  const {from: a, to: b, kind} = proc;
  if (kind === 'isochoric') return gasFromPV(n, a.p + (b.p - a.p) * u, a.V);
  const V = a.V + (b.V - a.V) * u;
  if (kind === 'isothermal') return gasFromVT(n, V, a.T);
  if (kind === 'isobaric') return gasFromPV(n, a.p, V);
  return gasFromPV(n, a.p * (a.V / V) ** gamma, V);
}

export interface HeatWork {
  W: number; // công khí sinh ra (J), dương khi giãn
  dU: number;
  Q: number; // nhiệt khí nhận (J), dương khi hấp nhiệt
}

/** cvMol = Cv/R (1,5 khí đơn nguyên tử; 2,5 khí lưỡng nguyên tử). */
export function heatWork(proc: Process, n: number, cvMol: number, gamma: number): HeatWork {
  const {from: a, to: b, kind} = proc;
  const dU = n * cvMol * R_GAS * (b.T - a.T);
  let W: number;
  if (kind === 'isothermal') W = n * R_GAS * a.T * Math.log(b.V / a.V);
  else if (kind === 'isobaric') W = a.p * (b.V - a.V) * LATM_J;
  else if (kind === 'isochoric') W = 0;
  else W = ((a.p * a.V - b.p * b.V) / (gamma - 1)) * LATM_J;
  return {W, dU, Q: dU + W};
}

export interface CycleStats {
  Wnet: number;
  Qin: number;
  Qout: number;
  eta: number;
  per: HeatWork[];
  /** chu trình có khép kín không (sai lệch trạng thái cuối so với đầu) */
  closureError: number;
}

export function cycleStats(procs: Process[], n: number, cvMol: number, gamma: number): CycleStats {
  const per = procs.map((p) => heatWork(p, n, cvMol, gamma));
  const Wnet = per.reduce((s, x) => s + x.W, 0);
  const Qin = per.reduce((s, x) => s + Math.max(0, x.Q), 0);
  const Qout = per.reduce((s, x) => s + Math.min(0, x.Q), 0);
  const first = procs[0].from;
  const last = procs[procs.length - 1].to;
  const closureError = Math.abs(last.p - first.p) / first.p + Math.abs(last.V - first.V) / first.V;
  return {Wnet, Qin, Qout, eta: Qin > 0 ? Wnet / Qin : 0, per, closureError};
}

export type CycleKind = 'carnot' | 'otto' | 'triangle';

/** Chu trình Carnot: giãn nhiệt V1→V2 (Th), giãn đoạn nhiệt tới Tc, nén nhiệt, nén đoạn nhiệt về trạng thái đầu. */
export function carnotCycle(n: number, Th: number, Tc: number, V1: number, V2: number, gamma: number): Process[] {
  const k = (Th / Tc) ** (1 / (gamma - 1));
  const A = gasFromVT(n, V1, Th);
  const AB = makeProcess('isothermal', A, V2, n, gamma);
  const BC = makeProcess('adiabatic', AB.to, V2 * k, n, gamma);
  const CD = makeProcess('isothermal', BC.to, V1 * k, n, gamma);
  const DA = makeProcess('adiabatic', CD.to, V1, n, gamma);
  return [AB, BC, CD, DA];
}

/** Chu trình Otto: nén đoạn nhiệt (tỉ số nén r), đẳng tích nóng, giãn đoạn nhiệt, đẳng tích lạnh. */
export function ottoCycle(n: number, T1: number, V1: number, r: number, T3: number, gamma: number): Process[] {
  const A = gasFromVT(n, V1, T1);
  const AB = makeProcess('adiabatic', A, V1 / r, n, gamma);
  const T2 = AB.to.T;
  const p3 = (n * R_LATM * Math.max(T3, T2 + 1)) / AB.to.V;
  const BC = makeProcess('isochoric', AB.to, p3, n, gamma);
  const CD = makeProcess('adiabatic', BC.to, V1, n, gamma);
  const DA = makeProcess('isochoric', CD.to, A.p, n, gamma);
  return [AB, BC, CD, DA];
}

/**
 * Chu trình ba quá trình (đẳng nhiệt, đẳng tích, đẳng áp) như ở tài liệu.
 * clockwise = true  (động cơ, công dương): đẳng áp giãn → đẳng tích làm lạnh → đẳng nhiệt nén về đầu.
 * clockwise = false (máy lạnh, công âm)  : đẳng nhiệt giãn → đẳng tích nung nóng → đẳng áp nén về đầu.
 */
export function triangleCycle(n: number, T1: number, V1: number, V2: number, gamma: number, clockwise = true): Process[] {
  const A = gasFromVT(n, V1, T1);
  if (clockwise) {
    const AC = makeProcess('isobaric', A, V2, n, gamma);
    const p2 = (A.p * V1) / V2; // áp suất trên đường đẳng nhiệt qua A tại V2
    const CB = makeProcess('isochoric', AC.to, p2, n, gamma);
    const BA = makeProcess('isothermal', CB.to, V1, n, gamma);
    return [AC, CB, BA];
  }
  const AB = makeProcess('isothermal', A, V2, n, gamma);
  const BC = makeProcess('isochoric', AB.to, A.p, n, gamma);
  const CA = makeProcess('isobaric', BC.to, V1, n, gamma);
  return [AB, BC, CA];
}

// ============================================================ Con lắc kép
export interface DPParams {
  L1: number;
  L2: number;
  m1: number;
  m2: number;
  g: number;
  /** hệ số cản nhớt (0 = bảo toàn) */
  damping: number;
}
/** [θ1, θ2, ω1, ω2] */
export type DPState = [number, number, number, number];

export function dpDeriv(s: DPState, P: DPParams): DPState {
  const [t1, t2, w1, w2] = s;
  const {L1, L2, m1, m2, g, damping} = P;
  const d = t1 - t2;
  const den = 2 * m1 + m2 - m2 * Math.cos(2 * d);
  const a1 = (-g * (2 * m1 + m2) * Math.sin(t1) - m2 * g * Math.sin(t1 - 2 * t2) - 2 * Math.sin(d) * m2 * (w2 * w2 * L2 + w1 * w1 * L1 * Math.cos(d))) / (L1 * den);
  const a2 = (2 * Math.sin(d) * (w1 * w1 * L1 * (m1 + m2) + g * (m1 + m2) * Math.cos(t1) + w2 * w2 * L2 * m2 * Math.cos(d))) / (L2 * den);
  return [w1, w2, a1 - damping * w1, a2 - damping * w2];
}

export function dpStep(s: DPState, P: DPParams, dt: number): DPState {
  const add = (a: DPState, b: DPState, k: number): DPState => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k, a[3] + b[3] * k];
  const k1 = dpDeriv(s, P);
  const k2 = dpDeriv(add(s, k1, dt / 2), P);
  const k3 = dpDeriv(add(s, k2, dt / 2), P);
  const k4 = dpDeriv(add(s, k3, dt), P);
  return [0, 1, 2, 3].map((i) => s[i] + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])) as DPState;
}

/** Năng lượng toàn phần (gốc thế năng tại điểm treo). */
export function dpEnergy(s: DPState, P: DPParams): number {
  const [t1, t2, w1, w2] = s;
  const {L1, L2, m1, m2, g} = P;
  const T = 0.5 * (m1 + m2) * L1 * L1 * w1 * w1 + 0.5 * m2 * L2 * L2 * w2 * w2 + m2 * L1 * L2 * w1 * w2 * Math.cos(t1 - t2);
  const U = -(m1 + m2) * g * L1 * Math.cos(t1) - m2 * g * L2 * Math.cos(t2);
  return T + U;
}

export const dpPositions = (s: DPState, P: DPParams): {x1: number; y1: number; x2: number; y2: number} => {
  const x1 = P.L1 * Math.sin(s[0]);
  const y1 = -P.L1 * Math.cos(s[0]);
  return {x1, y1, x2: x1 + P.L2 * Math.sin(s[1]), y2: y1 - P.L2 * Math.cos(s[1])};
};

/** Chạy đến thời điểm T với bước dt; trả trạng thái cuối. */
export function dpRun(s: DPState, P: DPParams, T: number, dt = 0.002): DPState {
  let cur = s;
  for (let t = 0; t < T - 1e-12; t += dt) cur = dpStep(cur, P, Math.min(dt, T - t));
  return cur;
}

// ============================================================ Coriolis
export interface CoriolisPath {
  /** tọa độ trong hệ quán tính (đứng yên) */
  inertial: {x: number; y: number}[];
  /** tọa độ trong hệ quay cùng đĩa */
  rotating: {x: number; y: number}[];
  /** thời gian chạm mép đĩa */
  tHit: number;
  /** góc lệch của điểm chạm trong hệ quay so với hướng bắn (rad, âm = lệch phải khi ω > 0) */
  deflection: number;
  /** độ lớn gia tốc Coriolis 2ωv */
  aCor: number;
}

/**
 * Vật được bắn từ tâm đĩa với tốc độ v theo hướng +x (trong hệ quán tính) lúc t = 0; đĩa quay đều ω (rad/s, ngược chiều kim đồng hồ khi > 0).
 * R: bán kính đĩa.
 */
export function coriolisPath(v: number, omega: number, R: number, steps = 120): CoriolisPath {
  const tHit = v > 0 ? R / v : 0;
  const inertial: {x: number; y: number}[] = [];
  const rotating: {x: number; y: number}[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (tHit * i) / steps;
    const x = v * t;
    inertial.push({x, y: 0});
    const a = -omega * t; // quay ngược lại góc đĩa đã quay
    rotating.push({x: x * Math.cos(a), y: x * Math.sin(a)});
  }
  return {inertial, rotating, tHit, deflection: -omega * tHit, aCor: 2 * Math.abs(omega) * v};
}

// ============================================================ Nhiễu xạ Fraunhofer
export interface GratingParams {
  N: number;
  /** chu kì khe (μm) */
  d: number;
  /** độ rộng khe (μm) */
  b: number;
  /** bước sóng (nm) */
  lambda: number;
}

const sinc = (x: number) => (Math.abs(x) < 1e-9 ? 1 : Math.sin(x) / x);
/** sin(Nγ)/(N sinγ) — nhân tử giao thoa chuẩn hóa về 1 tại cực đại chính. */
const gratingFactor = (N: number, g: number) => {
  const s = Math.sin(g);
  if (Math.abs(s) < 1e-9) return 1;
  return Math.sin(N * g) / (N * s);
};

/** Cường độ chuẩn hóa (I₀ = 1 tại θ = 0) theo s = sinθ. */
export function intensity(s: number, P: GratingParams): number {
  const lam = P.lambda * 1e-3; // μm
  const beta = (Math.PI * P.b * s) / lam;
  const gamma = (Math.PI * P.d * s) / lam;
  return sinc(beta) ** 2 * gratingFactor(P.N, gamma) ** 2;
}
/** Đường bao nhiễu xạ một khe. */
export function envelope(s: number, P: GratingParams): number {
  const beta = (Math.PI * P.b * s) / (P.lambda * 1e-3);
  return sinc(beta) ** 2;
}

/** Các bậc cực đại chính nhìn thấy được (|sinθ| < 1) kèm cường độ; bậc bị thiếu khi d/b nguyên. */
export function principalOrders(P: GratingParams): {m: number; s: number; I: number; missing: boolean}[] {
  const lam = P.lambda * 1e-3;
  const out: {m: number; s: number; I: number; missing: boolean}[] = [];
  const mMax = Math.floor(P.d / lam - 1e-9);
  for (let m = -mMax; m <= mMax; m++) {
    const s = (m * lam) / P.d;
    const I = intensity(s, P);
    out.push({m, s, I, missing: I < 1e-6 && m !== 0});
  }
  return out;
}

/** Nửa độ rộng góc của cực đại chính (khoảng tới cực tiểu kề): Δ(sinθ) = λ/(N d). */
export const principalHalfWidth = (P: GratingParams) => (P.lambda * 1e-3) / (P.N * P.d);

/** Đếm cực đại phụ giữa hai cực đại chính kề bậc 0 và 1 (lí thuyết: N − 2). */
export function secondaryMaximaBetween(P: GratingParams, samples = 6000): number {
  const lam = P.lambda * 1e-3;
  const s1 = lam / P.d;
  if (s1 >= 1) return 0;
  let count = 0;
  let prev = intensity(0, P);
  let prev2 = prev;
  for (let i = 1; i <= samples; i++) {
    const cur = intensity((s1 * i) / samples, P);
    if (i > 2 && prev > prev2 && prev > cur && prev < 0.5) count++;
    prev2 = prev;
    prev = cur;
  }
  return count;
}

/** Màu thấy được gần đúng của bước sóng (nm) → "#rrggbb". */
export function wavelengthToRgb(nm: number): string {
  let r = 0;
  let g = 0;
  let b = 0;
  if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else if (nm <= 780) { r = 1; }
  const f = nm < 420 ? 0.3 + (0.7 * (nm - 380)) / 40 : nm > 700 ? 0.3 + (0.7 * (780 - nm)) / 80 : 1;
  const h = (v: number) => Math.round(255 * Math.pow(Math.max(0, v) * f, 0.8)).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

// ============================================================ nhận từ khóa
export type PhysMatch =
  | {templateId: 'PHYS_GAS_STATE_PV'; meta: {cycle?: CycleKind}; title: string}
  | {templateId: 'PHYS_DOUBLE_PENDULUM'; meta: Record<string, never>; title: string}
  | {templateId: 'PHYS_CORIOLIS_FORCE'; meta: Record<string, never>; title: string}
  | {templateId: 'PHYS_FRAUNHOFER_DIFF'; meta: {N?: number}; title: string};

export function matchPhysKeywords(text: string): PhysMatch | null {
  const t = (text || '').toLowerCase();
  if (/con lắc kép|double\s*pendulum|hỗn loạn.*con lắc|con lắc.*hỗn loạn/.test(t)) return {templateId: 'PHYS_DOUBLE_PENDULUM', meta: {}, title: 'Con lắc kép'};
  if (/coriolis|hệ quy chiếu quay|lực quán tính ly tâm|bão.*xoáy.*bán cầu/.test(t)) return {templateId: 'PHYS_CORIOLIS_FORCE', meta: {}, title: 'Lực Coriolis'};
  if (/fraunhofer|nhiễu xạ|cách tử|\bn\s*khe\b|nhieu xa/.test(t)) {
    const m = /(\d+)\s*khe/.exec(t);
    return {templateId: 'PHYS_FRAUNHOFER_DIFF', meta: {N: m ? Math.min(50, Math.max(1, parseInt(m[1], 10))) : undefined}, title: 'Nhiễu xạ nhiều khe'};
  }
  if (/p\s*[-–]\s*v\b|chu trình (?:carnot|otto|kín|nhiệt)|carnot|\bpv\s*=\s*nrt|khí lí tưởng|khí lý tưởng|đồ thị p-v|động cơ nhiệt/.test(t)) {
    const cycle: CycleKind | undefined = /carnot/.test(t) ? 'carnot' : /otto/.test(t) ? 'otto' : /đẳng nhiệt.*đẳng tích.*đẳng áp|tam giác/.test(t) ? 'triangle' : undefined;
    return {templateId: 'PHYS_GAS_STATE_PV', meta: {cycle}, title: 'Khí lí tưởng p–V'};
  }
  return null;
}
