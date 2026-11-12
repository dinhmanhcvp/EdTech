import {collide} from './thptPhys';

/**
 * Băng đệm khí: động học một chiều theo thời gian thực của thí nghiệm va chạm. Logic thuần, đơn vị cảnh (1 m = S đơn vị).
 * Xe 1 được lò xo bắn (dao động điều hòa trong lúc lò xo giãn, rời lò xo ở vị trí tự nhiên với vận tốc v₁), lao vào xe 2 đang đứng yên.
 */
export const S = 2.5;
export const TRACK = {wall: -3.3, end: 3.3, half: 0.3, bump: 0.04, rest: -2.0, maxPull: 0.9, x2: 0.2};
/** vị trí các cổng quang điện; cổng đo tốc độ nhờ lá chắn sáng có chiều dài biết trước */
export const GATES = [-1.0, 2.2];
export const FLAG = 0.06; // m

/** độ nén lò xo (đơn vị cảnh) ứng với vận tốc bắn v₁ (m/s) và ngược lại */
export const pullOf = (v1: number): number => ((v1 - 0.2) / 0.8) * TRACK.maxPull;
export const speedOf = (pull: number): number => 0.2 + 0.8 * Math.min(1, Math.max(0, pull / TRACK.maxPull));

export interface GateReading {
  cart: 1 | 2;
  /** +1 sang phải, −1 sang trái */
  dir: 1 | -1;
  /** m/s đo được = chiều dài lá chắn / thời gian chắn */
  v: number;
}
export interface Run {
  x1: number;
  x2: number;
  /** vận tốc theo đơn vị cảnh/giây */
  v1: number;
  v2: number;
  m1: number;
  m2: number;
  e: number;
  /** vận tốc bắn (m/s) và độ nén */
  vmax: number;
  pull: number;
  phase: 'spring' | 'free';
  hit: boolean;
  t: number;
  /** sau va chạm: vận tốc đo bằng m/s */
  after: {u1: number; u2: number} | null;
  gates: (GateReading | null)[];
}

export function startRun(m1: number, m2: number, v1: number, e: number): Run {
  const pull = pullOf(v1);
  return {x1: TRACK.rest - pull, x2: TRACK.x2, v1: 0, v2: 0, m1, m2, e, vmax: v1, pull, phase: 'spring', hit: false, t: 0, after: null, gates: GATES.map(() => null)};
}

export function step(r: Run, dt: number): void {
  const prev = [r.x1, r.x2];
  r.t += dt;
  if (r.phase === 'spring') {
    const w = (r.vmax * S) / Math.max(r.pull, 1e-6);
    r.v1 += -w * w * (r.x1 - TRACK.rest) * dt;
    r.x1 += r.v1 * dt;
    if (r.x1 >= TRACK.rest) {
      r.phase = 'free';
      r.v1 = r.vmax * S;
    }
  } else r.x1 += r.v1 * dt;
  r.x2 += r.v2 * dt;
  const gap = 2 * (TRACK.half + TRACK.bump);
  if (!r.hit && r.x2 - r.x1 <= gap) {
    r.hit = true;
    const c = collide(r.m1, r.m2, r.v1 / S, r.e);
    r.after = {u1: c.u1, u2: c.u2};
    r.v1 = c.u1 * S;
    r.v2 = c.u2 * S;
    r.x1 = r.x2 - gap;
  }
  if (r.x2 + TRACK.half > TRACK.end) {
    r.x2 = TRACK.end - TRACK.half;
    r.v2 = 0;
  }
  // xe 2 đã dừng ở chặn cuối băng mà xe 1 còn đi tới: xe 1 dừng sát sau nó, không xuyên qua và trôi khỏi băng
  if (r.hit && r.x1 > r.x2 - gap) {
    r.x1 = r.x2 - gap;
    r.v1 = Math.min(r.v1, r.v2);
  }
  if (r.x1 - TRACK.half < TRACK.wall) {
    r.x1 = TRACK.wall + TRACK.half;
    r.v1 = 0;
  }
  GATES.forEach((g, i) => {
    ([[prev[0], r.x1, r.v1, 1], [prev[1], r.x2, r.v2, 2]] as const).forEach(([a, b, v, cart]) => {
      if ((a - g) * (b - g) < 0 && Math.abs(v) > 1e-6) r.gates[i] = {cart, dir: v > 0 ? 1 : -1, v: FLAG / (FLAG / (Math.abs(v) / S))};
    });
  });
}
/** cả hai xe đã đứng yên sau va chạm, hoặc chạy quá lâu */
export const settled = (r: Run): boolean => (r.hit && Math.abs(r.v1) < 1e-3 && Math.abs(r.v2) < 1e-3) || r.t > 14;
