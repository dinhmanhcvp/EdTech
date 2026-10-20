import { describe, it, expect } from 'vitest';
import { computeProjectile, PLANETARY_GRAVITY } from '../utils/physics';

describe('Deterministic Physics Engine: Projectile Motion (CP2)', () => {
  it('calculates correct metrics for standard 45-degree trajectory', () => {
    const res = computeProjectile(20, 45, 9.8);
    // L = v0^2 * sin(2*alpha) / g = 400 * 1 / 9.8 = ~40.816 m
    expect(res.lMax).toBeCloseTo(40.816, 2);
    // H = v0^2 * sin^2(alpha) / 2g = 400 * 0.5 / 19.6 = ~10.204 m
    expect(res.hMax).toBeCloseTo(10.204, 2);
    // At apex: vy = 0
    expect(res.vyAt(res.tApex)).toBeCloseTo(0, 4);
    // Total flight time = 2 * tApex
    expect(res.tFlight).toBeCloseTo(2 * res.tApex, 4);
  });

  it('handles odd decimal parameters (v0 = 17.5 m/s, alpha = 37 deg)', () => {
    const res = computeProjectile(17.5, 37, 9.8);
    expect(res.v0).toBe(17.5);
    expect(res.alphaDeg).toBe(37);
    expect(res.lMax).toBeGreaterThan(0);
    expect(res.hMax).toBeGreaterThan(0);
    expect(res.vyAt(res.tApex)).toBeCloseTo(0, 4);
  });

  it('jupiter gravity shrinks projectile range compared to Earth', () => {
    const earth = computeProjectile(25, 45, 9.8);
    const jupiter = computeProjectile(25, 45, 24.79);
    const moon = computeProjectile(25, 45, 1.62);

    // Range: Moon >> Earth >> Jupiter
    expect(jupiter.lMax).toBeLessThan(earth.lMax);
    expect(earth.lMax).toBeLessThan(moon.lMax);
    expect(jupiter.hMax).toBeLessThan(earth.hMax);
  });

  it('provides all 4 planetary gravity presets', () => {
    expect(PLANETARY_GRAVITY).toHaveLength(4);
    const names = PLANETARY_GRAVITY.map((p) => p.name);
    expect(names).toContain('Mặt Trăng');
    expect(names).toContain('Sao Hỏa');
    expect(names).toContain('Trái Đất');
    expect(names).toContain('Sao Mộc');
  });
});

describe('Olympiad-Grade Physics & Chemistry Formulas (v4.0)', () => {
  it('calculates correct RLC resonance frequency and impedance', () => {
    const R = 50.0; // Ohm
    const L = 0.5; // Henry
    const C = 50.0 * 1e-6; // 50 uF = 50e-6 F
    const omega0 = 1.0 / Math.sqrt(L * C); // ~200 rad/s
    expect(omega0).toBeCloseTo(200, 0);

    // At resonance: omega = omega0 => Z_L = Z_C => Z = R
    const Z_L = omega0 * L;
    const Z_C = 1.0 / (omega0 * C);
    expect(Z_L).toBeCloseTo(Z_C, 2);
    const Z_res = Math.sqrt(R * R + Math.pow(Z_L - Z_C, 2));
    expect(Z_res).toBeCloseTo(R, 2);
    const cosPhi = R / Z_res;
    expect(cosPhi).toBeCloseTo(1.0, 4); // Max power factor at resonance!
  });

  it('determines acid-base titration equivalence point at pH = 7.0 for strong acid-base', () => {
    const Va = 25.0; // mL
    const Ca = 0.1; // M
    const Cb = 0.1; // M
    const Veq = (Ca * Va) / Cb; // 25.0 mL
    expect(Veq).toBe(25.0);

    // Before equivalence point (Vb = 20 mL)
    const Vb_before = 20.0;
    const remH = (Ca * Va - Cb * Vb_before) / (Va + Vb_before);
    const pH_before = -Math.log10(remH);
    expect(pH_before).toBeLessThan(7.0);
    expect(pH_before).toBeCloseTo(1.95, 1);

    // After equivalence point (Vb = 30 mL)
    const Vb_after = 30.0;
    const remOH = (Cb * Vb_after - Ca * Va) / (Va + Vb_after);
    const pOH_after = -Math.log10(remOH);
    const pH_after = 14.0 - pOH_after;
    expect(pH_after).toBeGreaterThan(7.0);
    expect(pH_after).toBeCloseTo(11.96, 1);
  });
});

