// apps/teacher-board/src/utils/physics.ts
/**
 * Deterministic physics engine utility for projectile and classical mechanics.
 * Guarantees zero network calls and sub-millisecond evaluation.
 */

export interface ProjectileMetrics {
  v0: number;
  alphaDeg: number;
  alphaRad: number;
  g: number;
  tFlight: number;
  tApex: number;
  hMax: number;
  lMax: number;
  vx: number;
  vyAt: (t: number) => number;
  xAt: (t: number) => number;
  yAt: (t: number) => number;
}

export function computeProjectile(v0: number, alphaDeg: number, g: number = 9.8): ProjectileMetrics {
  const safeG = g > 0 ? g : 9.8;
  const safeV0 = Math.max(0, v0);
  const alphaRad = (alphaDeg * Math.PI) / 180;
  const sinA = Math.sin(alphaRad);
  const cosA = Math.cos(alphaRad);
  const sin2A = Math.sin(2 * alphaRad);

  const tFlight = safeG > 0 ? (2 * safeV0 * sinA) / safeG : 0;
  const tApex = safeG > 0 ? (safeV0 * sinA) / safeG : 0;
  const hMax = safeG > 0 ? (safeV0 * safeV0 * sinA * sinA) / (2 * safeG) : 0;
  const lMax = safeG > 0 ? (safeV0 * safeV0 * sin2A) / safeG : 0;
  const vx = safeV0 * cosA;

  return {
    v0: safeV0,
    alphaDeg,
    alphaRad,
    g: safeG,
    tFlight,
    tApex,
    hMax,
    lMax,
    vx,
    vyAt: (t: number) => safeV0 * sinA - safeG * t,
    xAt: (t: number) => vx * t,
    yAt: (t: number) => Math.max(0, safeV0 * sinA * t - 0.5 * safeG * t * t),
  };
}

export const PLANETARY_GRAVITY = [
  { name: 'Mặt Trăng', g: 1.62, icon: '🌑' },
  { name: 'Sao Hỏa', g: 3.71, icon: '🪐' },
  { name: 'Trái Đất', g: 9.8, icon: '🌍' },
  { name: 'Sao Mộc', g: 24.79, icon: '⚡' },
];
