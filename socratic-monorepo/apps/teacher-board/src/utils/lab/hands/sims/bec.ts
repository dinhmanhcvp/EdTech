import type {SimSpec, Values} from './types';

/** Ngưng tụ Bose–Einstein của nguyên tử trong bẫy điều hòa (thí nghiệm 11 của danh mục đỉnh cao). */
export const HBAR = 1.054571817e-34;
export const KB = 1.380649e-23;
/** nhiệt độ tới hạn (nK) trong bẫy điều hòa đẳng hướng: k_B·T_c = 0,94·ħω·N^(1/3) */
export const criticalT = (N: number, fHz: number): number => ((0.94 * HBAR * 2 * Math.PI * fHz * Math.cbrt(N)) / KB) * 1e9;
/** tỉ lệ ngưng tụ N₀/N = 1 − (T/T_c)³ khi T < T_c, bằng 0 khi T ≥ T_c */
export const condensateFraction = (T: number, Tc: number): number => (T >= Tc ? 0 : 1 - (T / Tc) ** 3);

export const BEC: SimSpec = {
  id: 'bec',
  name: 'Ngưng tụ Bose–Einstein',
  task: 'Làm lạnh đám nguyên tử Rb trong bẫy từ cho tới khi hơn một nửa số nguyên tử ngưng tụ vào cùng trạng thái cơ bản (N₀/N ≥ 50 %). Thử đổi số nguyên tử và độ cứng của bẫy: T_c thay đổi thế nào?',
  params: [
    {id: 'T', label: 'Nhiệt độ đám khí', unit: 'nK', min: 30, max: 1000, init: 1000, log: true, digits: 0},
    {id: 'N', label: 'Số nguyên tử', unit: '', min: 1e4, max: 1e6, init: 2e5, log: true},
    {id: 'f', label: 'Tần số bẫy', unit: 'Hz', min: 20, max: 500, init: 100, log: true, digits: 0},
  ],
  solution: {T: 150, N: 2e5, f: 100},
  evaluate: (v: Values) => {
    const Tc = criticalT(v.N, v.f);
    const f0 = condensateFraction(v.T, Tc);
    const ok = f0 >= 0.5;
    return {
      ok,
      head: ok ? `Ngưng tụ: ${(f0 * 100).toFixed(0)} % nguyên tử ở trạng thái cơ bản` : v.T >= Tc ? 'Còn trên T_c: đám khí nhiệt, chưa ngưng tụ' : `Mới ngưng tụ ${(f0 * 100).toFixed(0)} %: cần lạnh hơn nữa`,
      lines: [`T_c = 0,94·ħω·N^(1/3)/k_B ≈ ${Tc.toFixed(0)} nK, T/T_c = ${(v.T / Tc).toFixed(2)}`, `N₀/N = 1 − (T/T_c)³ ≈ ${(f0 * 100).toFixed(0)} % (bẫy điều hòa, khí lí tưởng; không tính tương tác nên chỉ là xấp xỉ)`],
    };
  },
};
