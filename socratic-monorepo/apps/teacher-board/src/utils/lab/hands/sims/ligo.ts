import type {SimSpec, Values} from './types';

/** Tìm tín hiệu sáp nhập hai lỗ đen trong nhiễu bằng lọc khớp mẫu (thí nghiệm 14 của danh mục đỉnh cao). Bậc thấp nhất của dạng sóng chirp. */
export const MSUN_S = 4.925490947e-6; // G·M☉/c³ (s)
export const TRUE = {m1: 36, m2: 29};
/** tỉ số tín hiệu/nhiễu tối ưu khi dùng mẫu đúng và mức nhiễu 1 */
export const RHO0 = 24;
export const THRESHOLD = 8;

export const chirpMass = (m1: number, m2: number): number => Math.pow(m1 * m2, 0.6) / Math.pow(m1 + m2, 0.2);
const T = (m1: number, m2: number) => chirpMass(m1, m2) * MSUN_S;
/** tần số (Hz) khi còn τ giây nữa tới sáp nhập */
export const freqAt = (tau: number, m1: number, m2: number): number => (1 / Math.PI) * Math.pow(5 / (256 * tau), 3 / 8) * Math.pow(T(m1, m2), -5 / 8);
export const phaseAt = (tau: number, m1: number, m2: number): number => -2 * Math.pow(tau / (5 * T(m1, m2)), 5 / 8);
/** dạng sóng chirp (đơn vị tuỳ ý): biên độ ∝ f^(2/3) */
export const strain = (tau: number, m1: number, m2: number): number => (tau <= 0 ? 0 : Math.pow(freqAt(tau, m1, m2) / 100, 2 / 3) * Math.cos(phaseAt(tau, m1, m2)));

/** Độ khớp |⟨e^{iΔΦ}⟩| giữa mẫu (m1, m2) và tín hiệu thật trong dải 35–250 Hz, có trọng số theo độ nhạy ~ f^(−7/3). */
export function match(m1: number, m2: number): number {
  let re = 0;
  let im = 0;
  let w = 0;
  const N = 600;
  for (let i = 0; i < N; i++) {
    const tau = 0.2 * Math.pow(0.004 / 0.2, i / (N - 1));
    const f = freqAt(tau, TRUE.m1, TRUE.m2);
    if (f < 35 || f > 250) continue;
    const wi = Math.pow(f, -7 / 3) * tau;
    const d = phaseAt(tau, m1, m2) - phaseAt(tau, TRUE.m1, TRUE.m2);
    re += wi * Math.cos(d);
    im += wi * Math.sin(d);
    w += wi;
  }
  return Math.hypot(re, im) / w;
}
export const snr = (m1: number, m2: number, noise: number): number => (RHO0 * match(m1, m2)) / noise;

export const LIGO: SimSpec = {
  id: 'ligo',
  name: 'Sóng hấp dẫn LIGO',
  task: 'Tín hiệu sáp nhập hai lỗ đen chìm trong nhiễu. Chỉnh khối lượng hai lỗ đen của mẫu và mức nhiễu sao cho đỉnh lọc khớp mẫu vượt ngưỡng 8 (ρ ≥ 8). Rồi thử xem các cặp khối lượng khác nhau nhưng cùng khối lượng chirp có cho đỉnh như nhau không.',
  params: [
    {id: 'm1', label: 'Khối lượng lỗ đen 1', unit: 'M☉', min: 10, max: 80, init: 20, digits: 1},
    {id: 'm2', label: 'Khối lượng lỗ đen 2', unit: 'M☉', min: 10, max: 80, init: 20, digits: 1},
    {id: 'n', label: 'Mức nhiễu', unit: '×', min: 1, max: 4, init: 2, digits: 1},
  ],
  solution: {m1: 36, m2: 29, n: 1.5},
  evaluate: (v: Values) => {
    const mt = match(v.m1, v.m2);
    const rho = (RHO0 * mt) / v.n;
    const ok = rho >= THRESHOLD;
    return {
      ok,
      head: ok ? `Phát hiện: ρ = ${rho.toFixed(1)} vượt ngưỡng ${THRESHOLD}` : `Chưa đủ: ρ = ${rho.toFixed(1)} dưới ngưỡng ${THRESHOLD}`,
      lines: [`Khối lượng chirp của mẫu 𝓜c = ${chirpMass(v.m1, v.m2).toFixed(1)} M☉ (dạng sóng chủ yếu phụ thuộc 𝓜c, nên hai cặp khối lượng khác nhau cùng 𝓜c cho đỉnh gần như nhau)`, `Độ khớp mẫu–tín hiệu ≈ ${(mt * 100).toFixed(0)} %`, 'Mô hình rút gọn bậc thấp nhất (không có pha sáp nhập và vòng suy giảm); dữ liệu và nhiễu là giả lập'],
    };
  },
};
