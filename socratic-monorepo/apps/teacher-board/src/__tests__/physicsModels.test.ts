import {describe, it, expect} from 'vitest';
import {
  R_LATM,
  gasFromVT,
  makeProcess,
  along,
  heatWork,
  cycleStats,
  carnotCycle,
  ottoCycle,
  triangleCycle,
  dpStep,
  dpEnergy,
  dpRun,
  dpPositions,
  coriolisPath,
  intensity,
  envelope,
  principalOrders,
  principalHalfWidth,
  secondaryMaximaBetween,
  wavelengthToRgb,
  matchPhysKeywords,
  type DPParams,
  type DPState,
  type GratingParams,
} from '../utils/physicsModels';

const near = (a: number, b: number, d = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(d);
const rel = (a: number, b: number, r = 1e-6) => expect(Math.abs(a - b) / Math.max(Math.abs(b), 1e-12)).toBeLessThan(r);

describe('Khí lí tưởng pV = nRT', () => {
  const n = 1;
  const g = 5 / 3;
  it('trạng thái chuẩn: 1 mol, 273,15 K, 22,414 L → 1 atm', () => {
    near(gasFromVT(1, 22.414, 273.15).p, 1, 2e-4);
  });
  it('đẳng nhiệt: pV không đổi; đoạn nhiệt: pV^γ không đổi và T V^(γ−1) không đổi', () => {
    const A = gasFromVT(n, 10, 300);
    const iso = makeProcess('isothermal', A, 20, n, g);
    near(iso.to.p * iso.to.V, A.p * A.V, 1e-9);
    const ad = makeProcess('adiabatic', A, 20, n, g);
    near(ad.to.p * ad.to.V ** g, A.p * A.V ** g, 1e-9);
    near(ad.to.T * ad.to.V ** (g - 1), A.T * A.V ** (g - 1), 1e-9);
    expect(ad.to.T).toBeLessThan(A.T); // giãn đoạn nhiệt thì lạnh đi
  });
  it('along nội suy đúng hai đầu', () => {
    const A = gasFromVT(n, 10, 300);
    for (const k of ['isothermal', 'isobaric', 'adiabatic'] as const) {
      const p = makeProcess(k, A, 25, n, g);
      near(along(p, 0, n, g).V, 10, 1e-9);
      near(along(p, 1, n, g).V, 25, 1e-9);
      near(along(p, 1, n, g).p, p.to.p, 1e-9);
    }
    const iv = makeProcess('isochoric', A, A.p * 2, n, g);
    near(along(iv, 0.5, n, g).p, A.p * 1.5, 1e-9);
  });
  it('nguyên lí I: Q = ΔU + W; đẳng nhiệt ΔU = 0; đoạn nhiệt Q = 0; đẳng tích W = 0', () => {
    const A = gasFromVT(n, 10, 300);
    const cv = 1.5;
    const iso = heatWork(makeProcess('isothermal', A, 20, n, g), n, cv, g);
    near(iso.dU, 0, 1e-9);
    near(iso.W, R_LATM * 101.325 * 300 * Math.log(2), 1e-6);
    const ad = heatWork(makeProcess('adiabatic', A, 20, n, g), n, cv, g);
    near(ad.Q, 0, 1e-6);
    near(ad.W, -ad.dU, 1e-6);
    expect(heatWork(makeProcess('isochoric', A, A.p * 2, n, g), n, cv, g).W).toBe(0);
    const ib = heatWork(makeProcess('isobaric', A, 20, n, g), n, cv, g);
    near(ib.Q, ib.dU + ib.W, 1e-9);
  });
  it('chu trình Carnot khép kín và η = 1 − Tc/Th', () => {
    const Th = 500;
    const Tc = 300;
    const c = carnotCycle(n, Th, Tc, 5, 12, g);
    const s = cycleStats(c, n, 1.5, g);
    expect(s.closureError).toBeLessThan(1e-9);
    rel(s.eta, 1 - Tc / Th, 1e-9);
    expect(s.Wnet).toBeGreaterThan(0);
    near(s.Qin + s.Qout, s.Wnet, 1e-6); // ΔU chu trình = 0
  });
  it('chu trình Otto: η = 1 − r^(1−γ)', () => {
    const gam = 1.4;
    const r = 8;
    const c = ottoCycle(n, 300, 10, r, 1800, gam);
    const s = cycleStats(c, n, 2.5, gam);
    expect(s.closureError).toBeLessThan(1e-9);
    rel(s.eta, 1 - r ** (1 - gam), 1e-6);
  });
  it('chu trình tam giác theo chiều kim đồng hồ: động cơ (W > 0, η < Carnot); ngược chiều: máy lạnh (W < 0) cùng độ lớn', () => {
    const c = triangleCycle(n, 300, 5, 15, g, true);
    const s = cycleStats(c, n, 1.5, g);
    expect(s.closureError).toBeLessThan(1e-9);
    expect(s.Wnet).toBeGreaterThan(0);
    const Tmax = Math.max(...c.flatMap((p) => [p.from.T, p.to.T]));
    const Tmin = Math.min(...c.flatMap((p) => [p.from.T, p.to.T]));
    expect(s.eta).toBeLessThan(1 - Tmin / Tmax);
    const back = cycleStats(triangleCycle(n, 300, 5, 15, g, false), n, 1.5, g);
    expect(back.closureError).toBeLessThan(1e-9);
    expect(back.Wnet).toBeLessThan(0);
    near(back.Wnet, -s.Wnet, 1e-6);
  });
});

describe('Con lắc kép', () => {
  const P: DPParams = {L1: 1, L2: 1, m1: 1, m2: 1, g: 9.81, damping: 0};
  it('đứng yên ở vị trí cân bằng thì giữ nguyên', () => {
    const s = dpRun([0, 0, 0, 0], P, 2);
    s.forEach((v) => near(v, 0, 1e-12));
  });
  it('bảo toàn năng lượng (RK4, bước 2 ms) với biên độ lớn', () => {
    const s0: DPState = [2.0, 1.0, 0, 0];
    const E0 = dpEnergy(s0, P);
    const s = dpRun(s0, P, 10);
    expect(Math.abs(dpEnergy(s, P) - E0) / (2 * P.g * P.L1)).toBeLessThan(2e-4);
  });
  it('có cản thì năng lượng giảm', () => {
    const Pd = {...P, damping: 0.4};
    const s0: DPState = [1.2, 0.6, 0, 0];
    expect(dpEnergy(dpRun(s0, Pd, 8), Pd)).toBeLessThan(dpEnergy(s0, Pd));
  });
  it('biên độ nhỏ: hai con lắc lệch 0,001 rad vẫn ở rất gần nhau; biên độ lớn: tách nhau rất xa (hỗn loạn)', () => {
    const sep = (th1: number, th2: number, T: number) => {
      const a = dpRun([th1, th2, 0, 0], P, T);
      const b = dpRun([th1 + 0.001, th2, 0, 0], P, T);
      const pa = dpPositions(a, P);
      const pb = dpPositions(b, P);
      return Math.hypot(pa.x2 - pb.x2, pa.y2 - pb.y2);
    };
    expect(sep(0.15, 0.1, 15)).toBeLessThan(0.05);
    expect(sep(2.5, 2.2, 15)).toBeGreaterThan(0.3);
  });
  it('vị trí hình học đúng', () => {
    const p = dpPositions([Math.PI / 2, Math.PI / 2, 0, 0], {...P, L1: 2, L2: 3});
    near(p.x1, 2);
    near(p.y1, 0);
    near(p.x2, 5);
    const step = dpStep([0.3, 0.1, 0, 0], P, 0.001);
    expect(step[0]).not.toBe(0.3);
  });
});

describe('Lực Coriolis', () => {
  it('hệ quán tính: thẳng; hệ quay: bán kính giữ nguyên, góc lệch −ωt', () => {
    const c = coriolisPath(2, 1.5, 4);
    expect(c.inertial.every((p) => p.y === 0)).toBe(true);
    c.rotating.forEach((p, i) => near(Math.hypot(p.x, p.y), c.inertial[i].x, 1e-9));
    near(c.tHit, 2);
    near(c.deflection, -3, 1e-12);
    near(Math.atan2(c.rotating[c.rotating.length - 1].y, c.rotating[c.rotating.length - 1].x), -3, 1e-9);
  });
  it('ω > 0 (ngược chiều kim đồng hồ): lệch phải hướng chuyển động; ω < 0: lệch trái; ω = 0: không lệch', () => {
    expect(coriolisPath(2, 0.8, 4).rotating[40].y).toBeLessThan(0);
    expect(coriolisPath(2, -0.8, 4).rotating[40].y).toBeGreaterThan(0);
    expect(coriolisPath(2, 0, 4).rotating.every((p) => Math.abs(p.y) < 1e-12)).toBe(true);
  });
  it('gia tốc Coriolis = 2ωv; tăng ω hoặc v thì quỹ đạo cong hơn / lệch ít hơn khi bắn nhanh', () => {
    near(coriolisPath(3, 2, 5).aCor, 12);
    expect(Math.abs(coriolisPath(1, 1, 4).deflection)).toBeGreaterThan(Math.abs(coriolisPath(4, 1, 4).deflection)); // bắn nhanh → ít lệch
  });
});

describe('Nhiễu xạ Fraunhofer N khe', () => {
  const base: GratingParams = {N: 5, d: 4, b: 1, lambda: 600};
  it('I(0) = 1 và cực đại chính tại sinθ = mλ/d đều có cường độ bằng đường bao', () => {
    near(intensity(0, base), 1);
    for (const o of principalOrders(base).filter((x) => !x.missing)) near(o.I, envelope(o.s, base), 1e-6);
  });
  it('N = 1 trở về nhiễu xạ một khe', () => {
    const one = {...base, N: 1};
    for (const s of [0, 0.05, 0.2, 0.4]) near(intensity(s, one), envelope(s, one), 1e-9);
  });
  it('có N − 2 cực đại phụ giữa hai cực đại chính', () => {
    for (const N of [3, 4, 5, 8]) expect(secondaryMaximaBetween({...base, N, b: 0.5}), `N=${N}`).toBe(N - 2);
  });
  it('bậc thiếu khi d/b nguyên: d = 2b thiếu mọi bậc chẵn', () => {
    const o = principalOrders({N: 6, d: 2, b: 1, lambda: 400});
    expect(o.filter((x) => x.missing).map((x) => Math.abs(x.m)).sort()).toEqual([2, 2, 4, 4]);
    expect(o.find((x) => x.m === 1)!.missing).toBe(false);
  });
  it('tăng N làm cực đại chính hẹp lại (tỉ lệ 1/N) mà đỉnh vẫn bằng 1', () => {
    near(principalHalfWidth({...base, N: 10}), principalHalfWidth({...base, N: 5}) / 2);
    near(intensity(0.0, {...base, N: 40}), 1);
  });
  it('chỉ có các bậc với |sinθ| < 1: d/λ = 6 → bậc −5…5 (bậc 6 đi sát mặt cách tử)', () => {
    expect(principalOrders({N: 4, d: 3, b: 0.5, lambda: 500}).length).toBe(11);
  });
  it('màu bước sóng: đỏ ở 650 nm, lục ở 540 nm, tím/lam ở 450 nm', () => {
    const c = (nm: number) => wavelengthToRgb(nm);
    expect(parseInt(c(650).slice(1, 3), 16)).toBeGreaterThan(200);
    expect(parseInt(c(540).slice(3, 5), 16)).toBeGreaterThan(200);
    expect(parseInt(c(450).slice(5, 7), 16)).toBeGreaterThan(200);
  });
});

describe('nhận từ khóa Vật lí', () => {
  it('bốn mô hình', () => {
    expect(matchPhysKeywords('Con lắc kép')?.templateId).toBe('PHYS_DOUBLE_PENDULUM');
    expect(matchPhysKeywords('lực Coriolis')?.templateId).toBe('PHYS_CORIOLIS_FORCE');
    expect(matchPhysKeywords('Nhiễu xạ 5 khe')).toMatchObject({templateId: 'PHYS_FRAUNHOFER_DIFF', meta: {N: 5}});
    expect(matchPhysKeywords('chu trình Carnot')).toMatchObject({templateId: 'PHYS_GAS_STATE_PV', meta: {cycle: 'carnot'}});
    expect(matchPhysKeywords('pV = nRT')?.templateId).toBe('PHYS_GAS_STATE_PV');
  });
  it('không bắt nhầm', () => {
    expect(matchPhysKeywords('con lắc đơn')).toBeNull();
    expect(matchPhysKeywords('y = x^2')).toBeNull();
    expect(matchPhysKeywords('v_0 = 22 m/s, alpha = 45')).toBeNull();
  });
  it('R_LATM hằng số', () => near(R_LATM, 0.082057, 1e-9));
});
