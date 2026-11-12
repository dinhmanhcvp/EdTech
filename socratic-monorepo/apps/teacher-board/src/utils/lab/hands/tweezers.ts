/** Kẹp quang học kéo sợi DNA đơn lẻ. Logic thuần: mô hình chuỗi mềm (Marko–Siggia), quá kéo giãn, cân bằng bẫy – DNA. Đơn vị: nm, pN. */

export const KT = 4.11; // pN·nm ở 298 K
export const DNA = {L: 16500, P: 50, /** lực quá kéo giãn (pN) */ overstretch: 65, /** độ cứng bẫy (pN/nm) */ kappa: 0.05};

const wlc = (u: number): number => (KT / DNA.P) * (1 / (4 * (1 - u) ** 2) - 0.25 + u);
/** tỉ lệ x/L tại đó WLC đạt lực quá kéo giãn (tìm bằng chia đôi) */
const U0 = (() => {
  let lo = 0;
  let hi = 0.999;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (wlc(mid) < DNA.overstretch) lo = mid;
    else hi = mid;
  }
  return lo;
})();
/** phần dài thêm của vùng quá kéo giãn: DNA dài thêm ~70 % */
const PLATEAU = 0.7;

/** lực kéo lại của DNA (pN) khi hai đầu cách nhau `x` (nm) */
export function dnaForce(x: number): number {
  const u = x / DNA.L;
  if (u <= 0) return 0;
  if (u <= U0) return wlc(u);
  if (u <= U0 * (1 + PLATEAU)) return DNA.overstretch;
  return DNA.overstretch + 2000 * (u - U0 * (1 + PLATEAU)); // vùng sợi đã duỗi hết: cứng hẳn lên
}

/** Cân bằng khi tâm bẫy ở `trap` (nm): κ(trap − x) = F_DNA(x). Trả độ giãn x, lực đo F = κ(trap − x) và độ lệch hạt. */
export function settle(trap: number): {x: number; force: number; offset: number} {
  const k = DNA.kappa;
  let lo = 0;
  let hi = Math.max(trap, 0);
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (k * (trap - mid) > dnaForce(mid)) lo = mid;
    else hi = mid;
  }
  const x = (lo + hi) / 2;
  return {x, force: Math.max(0, k * (trap - x)), offset: trap - x};
}
/** biên độ dao động nhiệt của hạt trong bẫy (nm) */
export const jitter = (): number => Math.sqrt(KT / DNA.kappa);

/** Một điểm đo: ghi lại cặp (độ giãn, lực). Khớp P từ các điểm trong vùng WLC bằng bình phương tối thiểu trên F·… (chia đôi theo sai số). */
export interface Sample {
  x: number;
  f: number;
}
export function fitPersistence(samples: Sample[]): number | null {
  const pts = samples.filter((s) => s.f > 0.05 && s.x / DNA.L < U0 * 0.98);
  if (pts.length < 3) return null;
  // F = (kT/P)·g(u) tuyến tính theo 1/P nên bình phương tối thiểu có nghiệm kín: kT/P = Σ F·g / Σ g²
  const g = (u: number) => 1 / (4 * (1 - u) ** 2) - 0.25 + u;
  let num = 0;
  let den = 0;
  for (const s of pts) {
    const gv = g(s.x / DNA.L);
    num += s.f * gv;
    den += gv * gv;
  }
  return num > 0 ? (KT * den) / num : null;
}
export const OVERSTRETCH_X = U0 * DNA.L;
