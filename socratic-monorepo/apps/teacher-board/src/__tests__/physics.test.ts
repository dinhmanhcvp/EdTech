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
