import type {SimSpec, Values} from './types';

/** Giao thoa của phân tử lớn qua cách tử nano (thí nghiệm 10 của danh mục đỉnh cao). */
export const H = 6.62607015e-34;
export const KB = 1.380649e-23;
export const AMU = 1.66053907e-27;
export const GRATING = {d: 100e-9, a: 50e-9, L: 1.25};

/** tốc độ trung bình của phân tử bay hơi từ lò ở nhiệt độ T (K), khối lượng m (u) */
export const speed = (T: number, mu: number): number => Math.sqrt((8 * KB * T) / (Math.PI * mu * AMU));
export const wavelength = (T: number, mu: number): number => H / (mu * AMU * speed(T, mu));
/** khoảng cách hai vân trên màn (m) */
export const fringe = (T: number, mu: number): number => (wavelength(T, mu) * GRATING.L) / GRATING.d;
/** độ tương phản vân: va chạm với khí dư làm mất kết hợp (mô hình rút gọn: giảm theo hàm mũ của áp suất) */
export const visibility = (p: number): number => Math.exp(-p / 4e-8);
/** xác suất tương đối của bậc nhiễu xạ n (bao đơn khe sinc² với a/d = 1/2: bậc chẵn bị triệt tiêu) */
export const orderWeight = (n: number): number => {
  const x = (Math.PI * n * GRATING.a) / GRATING.d;
  return n === 0 ? 1 : (Math.sin(x) / x) ** 2;
};

export const MATTERWAVE: SimSpec = {
  id: 'matterwave',
  name: 'Giao thoa phân tử C₆₀',
  task: 'Chỉnh nhiệt độ lò, khối lượng phân tử và áp suất khí dư để vân giao thoa tách rõ (≥ 20 µm) và đủ tương phản (≥ 60 %). Quan sát từng phân tử rơi trên màn.',
  params: [
    {id: 'T', label: 'Nhiệt độ lò', unit: 'K', min: 500, max: 1100, init: 900, digits: 0},
    {id: 'm', label: 'Khối lượng phân tử', unit: 'u', min: 200, max: 1200, init: 720, digits: 0},
    {id: 'p', label: 'Áp suất khí dư', unit: 'mbar', min: 1e-10, max: 1e-6, init: 1e-6, log: true},
  ],
  solution: {T: 900, m: 720, p: 1e-8},
  evaluate: (v: Values) => {
    const lam = wavelength(v.T, v.m);
    const dy = fringe(v.T, v.m);
    const vis = visibility(v.p);
    const ok = dy >= 20e-6 && vis >= 0.6;
    return {
      ok,
      head: ok ? 'Thấy vân giao thoa rõ' : vis < 0.6 ? 'Khí dư làm phân tử mất kết hợp: vân mờ' : 'Hai vân quá sát nhau để tách',
      lines: [`v ≈ ${speed(v.T, v.m).toFixed(0)} m/s, λ = h/(mv) ≈ ${(lam * 1e12).toFixed(2)} pm`, `Khoảng cách vân λL/d ≈ ${(dy * 1e6).toFixed(1)} µm (cách tử d = 100 nm, màn cách 1,25 m)`, `Độ tương phản ≈ ${(vis * 100).toFixed(0)} % (mô hình rút gọn, không phải số đo)`],
    };
  },
};
