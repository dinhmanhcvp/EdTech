/** Con lắc ngược trên xe trượt (cart-pole). Logic thuần: động lực học phi tuyến và bộ điều khiển phản hồi trạng thái. */

export const CART = {M: 0.5, m: 0.2, l: 0.3, g: 9.8, /** góc đổ quá mức này (rad) là đã ngã */ fall: 1.2, /** nửa chiều dài ray (m) */ rail: 1.6};
export interface CartState {
  x: number;
  v: number;
  /** góc lệch khỏi phương thẳng đứng (rad), dương = ngả về phía +x */
  th: number;
  w: number;
}
export const START_STATE: CartState = {x: 0, v: 0, th: 0.1, w: 0};
/** hệ số phản hồi u = kx·(x − xref) + kv·v + kθ·θ + kω·ω; đã dò để đứng vững từ lệch 0,1 rad */
export const GAINS = {kx: 3, kv: 4, kth: 40, kw: 6};
export type Gains = typeof GAINS;

/** một bước tích phân nửa ẩn: u là lực ngang đặt lên xe (N). */
export function step(s: CartState, u: number, dt: number): CartState {
  const {M, m, l, g} = CART;
  const c = Math.cos(s.th);
  const sn = Math.sin(s.th);
  const tmp = (u + m * l * s.w * s.w * sn) / (M + m);
  const alpha = (g * sn - c * tmp) / (l * (4 / 3 - (m * c * c) / (M + m)));
  const a = tmp - (m * l * alpha * c) / (M + m);
  const v = s.v + a * dt;
  const w = s.w + alpha * dt;
  return {x: s.x + v * dt, v, th: s.th + w * dt, w};
}
export const control = (s: CartState, xref: number, k: Gains = GAINS): number => k.kx * (s.x - xref) + k.kv * s.v + k.kth * s.th + k.kw * s.w;
export const fallen = (s: CartState): boolean => Math.abs(s.th) > CART.fall || Math.abs(s.x) > CART.rail;

/** Mô phỏng `T` giây với bộ điều khiển; trả trạng thái cuối và thời gian đứng được (s). */
export function simulate(s0: CartState, T: number, opts: {gains?: Gains; xref?: number; auto?: boolean; dt?: number} = {}): {end: CartState; held: number; peak: number} {
  const dt = opts.dt ?? 0.005;
  let s = s0;
  let peak = 0;
  for (let t = 0; t < T; t += dt) {
    s = step(s, opts.auto === false ? 0 : control(s, opts.xref ?? 0, opts.gains), dt);
    peak = Math.max(peak, Math.abs(s.th));
    if (fallen(s)) return {end: s, held: t, peak};
  }
  return {end: s, held: T, peak};
}
