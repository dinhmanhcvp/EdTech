// apps/teacher-board/src/engines/PhysicsSandboxEngine.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { SimulationBlueprint, CurriculumLevel } from '@socratic/types';
import { computeProjectile } from '../utils/physics';
import { Waves, Zap, Compass, ArrowUpRight, Scale } from 'lucide-react';
import { formatCanvasMath } from '../utils/canvasMath';
import { MathText } from '../components/ui/MathText';

interface Props {
  blueprint: SimulationBlueprint;
  params: Record<string, number>;
  curriculumLevel?: CurriculumLevel;
  isHologram?: boolean;
}

interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

// RK4 Integrator helper for non-linear pendulum: d²θ/dt² + (b/m) dθ/dt + (g/L) sinθ = 0
function stepPendulumRK4(
  theta: number,
  omega: number,
  dt: number,
  g: number,
  L: number,
  b: number,
  m: number
): { theta: number; omega: number } {
  const dTheta = (_t: number, w: number) => w;
  const dOmega = (t: number, w: number) => -(g / L) * Math.sin(t) - (b / m) * w;

  const k1_th = dTheta(theta, omega);
  const k1_om = dOmega(theta, omega);

  const k2_th = dTheta(theta + 0.5 * dt * k1_th, omega + 0.5 * dt * k1_om);
  const k2_om = dOmega(theta + 0.5 * dt * k1_th, omega + 0.5 * dt * k1_om);

  const k3_th = dTheta(theta + 0.5 * dt * k2_th, omega + 0.5 * dt * k2_om);
  const k3_om = dOmega(theta + 0.5 * dt * k2_th, omega + 0.5 * dt * k2_om);

  const k4_th = dTheta(theta + dt * k3_th, omega + dt * k3_om);
  const k4_om = dOmega(theta + dt * k3_th, omega + dt * k3_om);

  const nextTheta = theta + (dt / 6) * (k1_th + 2 * k2_th + 2 * k3_th + k4_th);
  const nextOmega = omega + (dt / 6) * (k1_om + 2 * k2_om + 2 * k3_om + k4_om);

  return { theta: nextTheta, omega: nextOmega };
}

// RK4 Projectile with quadratic air drag: F_drag = -k * v * vec(v)
function computeProjectileRK4(
  v0: number,
  alphaDeg: number,
  g: number,
  kDrag: number
): { points: { x: number; y: number }[]; lMax: number; hMax: number; tFlight: number } {
  const alpha = (alphaDeg * Math.PI) / 180;
  let x = 0;
  let y = 0;
  let vx = v0 * Math.cos(alpha);
  let vy = v0 * Math.sin(alpha);
  const dt = 0.01;
  const points: { x: number; y: number }[] = [{ x: 0, y: 0 }];
  let hMax = 0;
  let t = 0;

  while (y >= 0 && t < 25) {
    const v = Math.hypot(vx, vy);
    const ax1 = -kDrag * v * vx;
    const ay1 = -g - kDrag * v * vy;

    const vx_mid = vx + 0.5 * dt * ax1;
    const vy_mid = vy + 0.5 * dt * ay1;
    const v_mid = Math.hypot(vx_mid, vy_mid);
    const ax2 = -kDrag * v_mid * vx_mid;
    const ay2 = -g - kDrag * v_mid * vy_mid;

    x += vx_mid * dt;
    y += vy_mid * dt;
    vx += ax2 * dt;
    vy += ay2 * dt;
    t += dt;

    if (y > hMax) hMax = y;
    if (y >= 0) points.push({ x, y });
  }

  const lMax = points.length > 0 ? points[points.length - 1].x : 0;
  return { points, lMax, hMax, tFlight: t };
}

// 3D PBR Sphere Renderer with specular glint and soft ambient shadow
function drawPbrSphere(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  baseColor: string = '#2563EB',
  highlightColor: string = '#FFFFFF'
) {
  ctx.save();
  // Soft ground contact shadow
  ctx.fillStyle = 'rgba(15, 23, 42, 0.12)';
  ctx.beginPath();
  ctx.ellipse(x, y + radius * 0.9, radius * 0.9, radius * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  // Radial Specular 3D Lighting
  const grad = ctx.createRadialGradient(
    x - radius * 0.35,
    y - radius * 0.35,
    radius * 0.08,
    x,
    y,
    radius
  );
  grad.addColorStop(0, highlightColor);
  grad.addColorStop(0.2, baseColor);
  grad.addColorStop(0.85, baseColor);
  grad.addColorStop(1, '#0F172A');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Crisp specular glint
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.beginPath();
  ctx.arc(x - radius * 0.35, y - radius * 0.35, radius * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Helper to draw metallic bezier spring coils
function drawMetallicSpring(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  coils: number = 10,
  radius: number = 12
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);

  ctx.save();
  ctx.translate(x1, y1);
  ctx.rotate(angle);

  // Gradient for metallic look
  const grad = ctx.createLinearGradient(0, -radius, 0, radius);
  grad.addColorStop(0, '#CBD5E1');
  grad.addColorStop(0.5, '#475569');
  grad.addColorStop(1, '#94A3B8');

  ctx.strokeStyle = grad;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(15, 0);

  const coilLength = (dist - 30) / coils;
  for (let i = 0; i < coils; i++) {
    const cx = 15 + i * coilLength;
    ctx.bezierCurveTo(
      cx + coilLength * 0.25, -radius,
      cx + coilLength * 0.75, radius,
      cx + coilLength, 0
    );
  }

  ctx.lineTo(dist, 0);
  ctx.stroke();
  ctx.restore();
}

export type PhysicsMode = 'AUTO' | 'PROJECTILE' | 'PENDULUM' | 'RIPPLE_TANK' | 'RLC_PHASOR' | 'OPTICS_LENS' | 'INCLINED';

export const PHYSICS_CONTENT_MAP: Record<Exclude<PhysicsMode, 'AUTO'>, {
  shortTitle: string;
  badgeLabel: string;
  fullTopic: string;
}> = {
  PROJECTILE: {
    shortTitle: 'Ném xiên (Parabol)',
    badgeLabel: 'Chuyển động Ném xiên trong Trọng trường',
    fullTopic: 'VẬT LÝ 10 • NÉM XIÊN VI PHÂN & TRỌNG TRƯỜNG',
  },
  RIPPLE_TANK: {
    shortTitle: 'Giao thoa Sóng',
    badgeLabel: 'Giao thoa Sóng cơ học (2 Nguồn kết hợp)',
    fullTopic: 'VẬT LÝ 11 • GIAO THOA SÓNG NƯỚC 3D (d₂ - d₁ = kλ)',
  },
  PENDULUM: {
    shortTitle: 'Con lắc đơn',
    badgeLabel: 'Dao động Con lắc đơn (RK4 vi phân)',
    fullTopic: 'VẬT LÝ 11 • CON LẮC ĐƠN PHI TUYẾN GÓC LỚN',
  },
  RLC_PHASOR: {
    shortTitle: 'Mạch điện RLC',
    badgeLabel: 'Mạch Dao động RLC & Giản đồ Fresnel',
    fullTopic: 'VẬT LÝ 12 • DÒNG ĐIỆN XOAY CHIỀU & CỘNG HƯỞNG',
  },
  INCLINED: {
    shortTitle: 'Mặt phẳng nghiêng',
    badgeLabel: 'Mặt phẳng nghiêng & Ma sát trượt',
    fullTopic: 'VẬT LÝ 10 • ĐỘNG LỰC HỌC & ĐỊNH LUẬT II NEWTON',
  },
  OPTICS_LENS: {
    shortTitle: 'Quang học Thấu kính',
    badgeLabel: 'Quang hình học: Thấu kính mỏng & Tiêu cự',
    fullTopic: 'VẬT LÝ 11 • QUANG HÌNH HỌC (1/f = 1/d + 1/d\')',
  },
};

export function detectPhysicsModeFromFormula(formula: string, templateId?: string): Exclude<PhysicsMode, 'AUTO'> {
  const f = (formula || '').toLowerCase();
  const t = templateId || '';

  // 1. Giao thoa sóng cơ học
  if (
    t === 'PHYS_RIPPLE_TANK' ||
    f.includes('giao thoa') || f.includes('ripple') || f.includes('sóng nước') ||
    f.includes('d_2 - d_1') || f.includes('d2 - d1') || f.includes('d2-d1') ||
    f.includes('lambda') || f.includes('\\lambda') || f.includes('k\\lambda') ||
    f.includes('hai nguồn') || f.includes('cực đại giao thoa') || f.includes('cực tiểu giao thoa') ||
    f.includes('2a\\cos') || f.includes('2a \\cos')
  ) {
    return 'RIPPLE_TANK';
  }

  // 2. Con lắc đơn vi phân RK4
  if (
    t === 'PHYS_PENDULUM' ||
    f.includes('con lắc') || f.includes('con lac') || f.includes('pendulum') ||
    f.includes('2\\pi\\sqrt') || f.includes('l/g') || f.includes('m/k') ||
    f.includes('\\ddot{\\theta}') || f.includes('\\theta') || f.includes('theta') ||
    f.includes('dây') || f.includes('s_0\\cos') || f.includes('s_0') || f.includes('rk4')
  ) {
    return 'PENDULUM';
  }

  // 3. Mạch dao động RLC & Giản đồ Fresnel
  if (
    t === 'PHYS_RLC_PHASOR' ||
    f.includes('rlc') || f.includes('fresnel') || f.includes('điện xoay chiều') ||
    f.includes('z =') || f.includes('z_l') || f.includes('z_c') ||
    f.includes('\\omega l') || f.includes('1/\\omega c') || f.includes('cộng hưởng') ||
    f.includes('u_0\\cos') || f.includes('u = u_0')
  ) {
    return 'RLC_PHASOR';
  }

  // 4. Mặt phẳng nghiêng & Ma sát trượt
  if (
    t === 'PHYS_INCLINED' ||
    f.includes('nghiêng') || f.includes('nghieng') || f.includes('incline') ||
    f.includes('ma sát') || f.includes('ma sat') ||
    f.includes('\\mu') || f.includes('mu') || f.includes('f_{ms}') || f.includes('fms') ||
    f.includes('mg\\sin') || f.includes('mg\\cos') || f.includes('g(\\sin')
  ) {
    return 'INCLINED';
  }

  // 5. Quang học thấu kính
  if (
    t === 'PHYS_OPTICS_LENS' ||
    f.includes('thấu kính') || f.includes('thau kinh') || f.includes('lens') ||
    f.includes('1/f') || f.includes('tiêu cự')
  ) {
    return 'OPTICS_LENS';
  }

  // 6. Chuyển động ném xiên trong trọng trường
  if (
    t === 'PHYS_PROJECTILE' ||
    f.includes('ném') || f.includes('nem') || f.includes('projectile') ||
    f.includes('v_0') || f.includes('v0') || f.includes('parabol') ||
    (f.includes('\\alpha') && (f.includes('cos') || f.includes('sin') || f.includes('g')))
  ) {
    return 'PROJECTILE';
  }

  // Fallback based on templateId
  if (t === 'PHYS_RIPPLE_TANK') return 'RIPPLE_TANK';
  if (t === 'PHYS_RLC_PHASOR') return 'RLC_PHASOR';
  if (t === 'PHYS_PENDULUM') return 'PENDULUM';
  if (t === 'PHYS_INCLINED') return 'INCLINED';
  if (t === 'PHYS_OPTICS_LENS') return 'OPTICS_LENS';
  return 'PROJECTILE';
}

export const PhysicsSandboxEngine: React.FC<Props> = ({
  blueprint,
  params,
  curriculumLevel = blueprint.curriculumLevel ?? 'THPT_STANDARD',
  isHologram = false,
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeRef = useRef<number>(0);

  // Motion trails for Projectile and Pendulum
  const projectileTrailRef = useRef<TrailPoint[]>([]);
  const pendulumTrailRef = useRef<TrailPoint[]>([]);

  // Simulation persistent states
  const pendulumStateRef = useRef<{ theta: number; omega: number }>({ theta: 0.5, omega: 0 });
  const phaseTrailRef = useRef<{ theta: number; omega: number }[]>([]);

  // View Mode: AUTO automatically maps incoming formulas to the correct knowledge topic
  const [activeMode, setActiveMode] = useState<PhysicsMode>('AUTO');

  // Reset activeMode to AUTO when a new formula or template arrives so it dynamically points to that knowledge
  useEffect(() => {
    setActiveMode('AUTO');
  }, [blueprint.recognizedLatex, blueprint.templateId]);

  const [hud, setHud] = useState({
    hMax: 0,
    lMax: 0,
    tFlight: 0,
    vx: 0,
    vy: 0,
    wKin: 0,
    wPot: 0,
    wTotal: 0,
    isApex: false,
    deltaL: 0,
    deltaH: 0,
    hasDelta: false,
    rlcResonance: false,
    rlcZ: 0,
    rlcI: 0,
    rlcCosPhi: 1,
    rlcOmega0: 0,
    rlcP: 0,
  });

  const isOlympiad = curriculumLevel === 'OLYMPIAD_ADVANCED';

  // Determine active mode automatically from formula
  const currentMode = React.useMemo<Exclude<PhysicsMode, 'AUTO'>>(() => {
    if (activeMode !== 'AUTO') return activeMode;
    return detectPhysicsModeFromFormula(blueprint.recognizedLatex || '', blueprint.templateId);
  }, [activeMode, blueprint.recognizedLatex, blueprint.templateId]);

  // Helper to draw laser-sharp vector arrows with glass readouts
  const drawVector = (
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    label: string,
    dashed: boolean = false
  ) => {
    const headLen = 9;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.save();
    if (dashed) ctx.setLineDash([3, 3]);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2.4;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    // Laser pill label
    ctx.font = 'bold 10px monospace';
    ctx.fillText(formatCanvasMath(label), x2 + 5, y2 - 4);
    ctx.restore();
  };

  useEffect(() => {
    pendulumStateRef.current = {
      theta: ((params.theta0 ?? 35) * Math.PI) / 180,
      omega: 0,
    };
    phaseTrailRef.current = [];
    projectileTrailRef.current = [];
    pendulumTrailRef.current = [];
  }, [blueprint.templateId, currentMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const renderLoop = () => {
      timeRef.current += 0.02;
      const t = timeRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!isHologram) {
        // Warm Alabaster Technical Graph Paper
        ctx.fillStyle = '#FCFBF9';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Millimeter grid
        ctx.strokeStyle = '#EFECE6';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 20) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 20) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }
      } else {
        // Zero-background chalk grid directly on board
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 20) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 20) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }
      }

      // ==============================================================
      // 1. PHYS_RIPPLE_TANK: 3D Wave Interference Studio (Giao thoa sóng)
      // ==============================================================
      if (currentMode === 'RIPPLE_TANK') {
        const lambda = params.lambda ?? 24; // Wavelength in px
        const freq = params.f ?? 2.5; // Frequency in Hz
        const sourceDist = params.d ?? 130; // Distance between sources
        const deltaPhi = params.deltaPhi ?? 0; // Phase diff in rad

        const tankW = 340;
        const tankH = 310;
        const tankLeft = 15;
        const tankTop = 15;

        // Divider
        ctx.strokeStyle = '#E6E4DD';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(370, 10);
        ctx.lineTo(370, canvas.height - 10);
        ctx.stroke();

        // Left Header
        ctx.fillStyle = '#0284C7';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('BỂ SÓNG GIAO THOA 2 NGUỒN KẾT HỢP (RIPPLE TANK)', 16, 25);

        // Source positions
        const cy = tankTop + tankH / 2;
        const s1x = tankLeft + (tankW / 2) - sourceDist / 2;
        const s2x = tankLeft + (tankW / 2) + sourceDist / 2;

        // Render Wave Interference Field via Iso-phase Hyperbolic Fringes
        const kWave = (2 * Math.PI) / lambda;
        const omegaWave = 2 * Math.PI * freq;

        // Simulated water tank pool with reflections
        ctx.fillStyle = 'rgba(2, 132, 199, 0.04)';
        ctx.fillRect(tankLeft, tankTop + 20, tankW, tankH - 30);
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(tankLeft, tankTop + 20, tankW, tankH - 30);

        // Draw interference hyperbolic fringes: r1 - r2 = m * lambda
        const maxM = Math.floor(sourceDist / lambda);
        for (let m = -maxM; m <= maxM; m++) {
          const isCentral = m === 0;
          ctx.strokeStyle = isCentral ? '#0284C7' : 'rgba(2, 132, 199, 0.45)';
          ctx.lineWidth = isCentral ? 2.5 : 1.5;
          ctx.beginPath();

          for (let y = tankTop + 25; y <= tankTop + tankH - 15; y += 4) {
            // Find x where r1 - r2 = m * lambda + phase shift
            const dy = y - cy;
            const pathDiff = m * lambda;
            // Hyperbola: x as function of y
            const a = pathDiff / 2;
            const c = sourceDist / 2;
            if (Math.abs(a) < c && a !== 0) {
              const b = Math.sqrt(c * c - a * a);
              const xRel = a * Math.sqrt(1 + (dy * dy) / (b * b));
              const px = tankLeft + (tankW / 2) + xRel;
              if (px >= tankLeft && px <= tankLeft + tankW) {
                y === tankTop + 25 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
              }
            } else if (a === 0) {
              // Center line
              const px = tankLeft + tankW / 2;
              y === tankTop + 25 ? ctx.moveTo(px, y) : ctx.lineTo(px, y);
            }
          }
          ctx.stroke();
        }

        // Concentric circular waves emanating from S1 and S2
        const waveRadiusMax = 150;
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(14, 165, 233, 0.25)';
        for (let r = ((t * freq * 18) % lambda); r < waveRadiusMax; r += lambda) {
          ctx.beginPath();
          ctx.arc(s1x, cy, r, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(s2x, cy, r, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();

        // 3D Vibrating Source Needles (PBR Dippers)
        const dip1Y = cy + Math.sin(omegaWave * t) * 4;
        const dip2Y = cy + Math.sin(omegaWave * t + deltaPhi) * 4;

        drawPbrSphere(ctx, s1x, dip1Y, 7, '#0284C7', '#FFFFFF');
        drawPbrSphere(ctx, s2x, dip2Y, 7, '#0284C7', '#FFFFFF');

        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('S₁', s1x - 7, cy - 12);
        ctx.fillText('S₂', s2x - 7, cy - 12);

        // Right Panel: Standing Wave Profile Across S1-S2 Line
        const rLeft = 390;
        const rRight = 605;
        const rTop = 55;
        const rBottom = 265;
        const rW = rRight - rLeft;
        const rH = rBottom - rTop;
        const rMidY = (rTop + rBottom) / 2;

        ctx.fillStyle = '#D97706';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(formatCanvasMath('BIÊN ĐỘ GIAO THOA (A_max = 2A)'), rLeft, 25);
        ctx.fillStyle = '#57534E';
        ctx.font = '9px monospace';
        ctx.fillText(formatCanvasMath('Cực đại: d₂ - d₁ = kλ | Cực tiểu: d₂ - d₁ = (k+0.5)λ'), rLeft, 38);

        // Axes
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(rLeft, rMidY);
        ctx.lineTo(rRight, rMidY);
        ctx.moveTo(rLeft, rTop);
        ctx.lineTo(rLeft, rBottom);
        ctx.stroke();

        ctx.fillStyle = '#57534E';
        ctx.font = '9px monospace';
        ctx.fillText(formatCanvasMath('Tọa độ x (cm)'), rRight - 65, rMidY + 16);
        ctx.fillText(formatCanvasMath('+2A'), rLeft + 6, rTop + 10);
        ctx.fillText(formatCanvasMath('-2A'), rLeft + 6, rBottom - 6);

        // Draw Amplitude envelope curve across central line
        ctx.strokeStyle = '#0284C7';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let x = 0; x <= rW; x += 2) {
          const xWorld = ((x - rW / 2) / (rW / 2)) * (sourceDist / 2 + 30);
          const r1 = Math.abs(xWorld - (-sourceDist / 2));
          const r2 = Math.abs(xWorld - (sourceDist / 2));
          const deltaD = r1 - r2;
          const amp = 2 * Math.abs(Math.cos((kWave * deltaD - deltaPhi) / 2));
          const py = rMidY - (amp / 2) * (rH * 0.42) * Math.sin(omegaWave * t);
          x === 0 ? ctx.moveTo(rLeft + x, py) : ctx.lineTo(rLeft + x, py);
        }
        ctx.stroke();

        // Telemetry badges
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(formatCanvasMath(`Bước sóng λ: ${lambda}px | f: ${freq}Hz`), 16, canvas.height - 18);
        ctx.fillText(formatCanvasMath(`Khoảng cách 2 nguồn d: ${sourceDist}px (${(sourceDist / lambda).toFixed(1)}λ)`), 16, canvas.height - 6);

      // ==============================================================
      // 2. PHYS_RLC_PHASOR: Fresnel Vector Phasor Studio (Điện xoay chiều)
      // ==============================================================
      } else if (currentMode === 'RLC_PHASOR') {
        const R = params.R ?? 50.0;
        const L = params.L ?? 0.5;
        const C_uF = params.C ?? 50.0;
        const C = C_uF * 1e-6;
        const omega = params.omega ?? 200.0;
        const U = params.U ?? 120.0;

        const Z_L = omega * L;
        const Z_C = 1.0 / (omega * C);
        const Z = Math.sqrt(R * R + (Z_L - Z_C) * (Z_L - Z_C));
        const I = U / Z;
        const U_R = I * R;
        const U_L = I * Z_L;
        const U_C = I * Z_C;
        const U_LC = U_L - U_C;
        const phi = Math.atan((Z_L - Z_C) / R);
        const cosPhi = R / Z;
        const P = U * I * cosPhi;
        const omega0 = 1.0 / Math.sqrt(L * C);
        const isResonant = Math.abs(omega - omega0) / omega0 < 0.04;

        const leftCenterX = 150;
        const leftCenterY = 175;

        // Divider
        ctx.strokeStyle = '#E6E4DD';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(305, 10);
        ctx.lineTo(305, canvas.height - 10);
        ctx.stroke();

        ctx.fillStyle = '#2563EB';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(formatCanvasMath('GIẢN ĐỒ FRESNEL (PHASOR)'), 18, 22);

        // Reference axes
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(leftCenterX - 110, leftCenterY);
        ctx.lineTo(leftCenterX + 130, leftCenterY);
        ctx.moveTo(leftCenterX, leftCenterY - 110);
        ctx.lineTo(leftCenterX, leftCenterY + 110);
        ctx.stroke();

        // Vector scale
        const vScale = 0.9;
        const uRx = leftCenterX + U_R * vScale;
        const uRy = leftCenterY;
        const uLx = leftCenterX;
        const uLy = leftCenterY - U_L * vScale;
        const uCx = leftCenterX;
        const uCy = leftCenterY + U_C * vScale;
        const uTotalX = uRx;
        const uTotalY = leftCenterY - U_LC * vScale;

        // Draw rotating vectors with 3D arcs
        drawVector(ctx, leftCenterX, leftCenterY, uRx, uRy, '#059669', `U_R (${U_R.toFixed(0)}V)`);
        drawVector(ctx, leftCenterX, leftCenterY, uLx, uLy, '#2563EB', `U_L (${U_L.toFixed(0)}V)`);
        drawVector(ctx, leftCenterX, leftCenterY, uCx, uCy, '#D97706', `U_C (${U_C.toFixed(0)}V)`);
        drawVector(ctx, leftCenterX, leftCenterY, uTotalX, uTotalY, '#E11D48', `U (${U.toFixed(0)}V)`);

        // Phase angle arc φ
        ctx.save();
        ctx.strokeStyle = '#E11D48';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(leftCenterX, leftCenterY, 32, 0, -phi, phi > 0);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#E11D48';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(formatCanvasMath(`φ: ${((phi * 180) / Math.PI).toFixed(1)}°`), leftCenterX + 38, leftCenterY - 6);

        // Right Panel: Resonance Curve I(omega)
        const plotLeft = 330;
        const plotRight = 595;
        const plotTop = 50;
        const plotBottom = 265;
        const plotW = plotRight - plotLeft;
        const plotH = plotBottom - plotTop;

        ctx.fillStyle = '#059669';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(formatCanvasMath('ĐƯỜNG CONG CỘNG HƯỞNG I(ω)'), plotLeft, 22);

        // Curve axes
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(plotLeft, plotBottom);
        ctx.lineTo(plotRight, plotBottom);
        ctx.moveTo(plotLeft, plotTop);
        ctx.lineTo(plotLeft, plotBottom);
        ctx.stroke();

        const minW = 20;
        const maxW = 450;
        const iMaxRes = U / R;

        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let step = 0; step <= 80; step++) {
          const w = minW + (step / 80) * (maxW - minW);
          const zStep = Math.sqrt(R * R + Math.pow(w * L - 1.0 / (w * C), 2));
          const iStep = U / zStep;
          const px = plotLeft + (step / 80) * plotW;
          const py = plotBottom - (iStep / iMaxRes) * (plotH * 0.9);
          step === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Resonance operating point marker
        const curPx = plotLeft + ((omega - minW) / (maxW - minW)) * plotW;
        const curPy = plotBottom - (I / iMaxRes) * (plotH * 0.9);

        drawPbrSphere(ctx, curPx, curPy, 6, isResonant ? '#D97706' : '#2563EB', '#FFFFFF');

        // Update HUD
        if (Math.floor(t * 50) % 4 === 0) {
          setHud((prev) => ({
            ...prev,
            rlcResonance: isResonant,
            rlcZ: Number(Z.toFixed(1)),
            rlcI: Number(I.toFixed(2)),
            rlcCosPhi: Number(cosPhi.toFixed(3)),
            rlcOmega0: Number(omega0.toFixed(1)),
            rlcP: Number(P.toFixed(1)),
          }));
        }

      // ==============================================================
      // 3. PHYS_PENDULUM: RK4 Large-Angle with Glowing Comet Trail & Phase Portrait
      // ==============================================================
      } else if (currentMode === 'PENDULUM') {
        const L = params.L ?? 2.0;
        const g = params.g ?? 9.8;
        const b = params.b ?? (isOlympiad ? 0.08 : 0.02);
        const m = params.m ?? 1.0;

        const dt = 0.025;
        const next = stepPendulumRK4(
          pendulumStateRef.current.theta,
          pendulumStateRef.current.omega,
          dt,
          g,
          L,
          b,
          m
        );
        pendulumStateRef.current = next;
        const { theta, omega } = next;

        phaseTrailRef.current.push({ theta, omega });
        if (phaseTrailRef.current.length > 250) phaseTrailRef.current.shift();

        const pivotX = isOlympiad ? 145 : canvas.width / 2;
        const pivotY = 40;
        const pixelL = L * (isOlympiad ? 75 : 95);
        const bobX = pivotX + pixelL * Math.sin(theta);
        const bobY = pivotY + pixelL * Math.cos(theta);

        // Store comet motion trail (last 40 points)
        pendulumTrailRef.current.push({ x: bobX, y: bobY, alpha: 1.0 });
        if (pendulumTrailRef.current.length > 40) pendulumTrailRef.current.shift();

        if (isOlympiad) {
          ctx.strokeStyle = '#E6E4DD';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(295, 10);
          ctx.lineTo(295, canvas.height - 10);
          ctx.stroke();

          ctx.fillStyle = '#2563EB';
          ctx.font = 'bold 12px monospace';
          ctx.fillText(formatCanvasMath('RK4 CON LẮC GÓC LỚN'), 16, 22);

          // Right Panel: Phase Space Portrait
          const pOriginX = 450;
          const pOriginY = 170;
          const pScaleTheta = 70;
          const pScaleOmega = 22;

          ctx.fillStyle = '#D97706';
          ctx.font = 'bold 12px monospace';
          ctx.fillText(formatCanvasMath('KHÔNG GIAN PHA (PHASE PORTRAIT)'), 310, 22);

          // Phase axes
          ctx.strokeStyle = '#94A3B8';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pOriginX - 130, pOriginY);
          ctx.lineTo(pOriginX + 130, pOriginY);
          ctx.moveTo(pOriginX, pOriginY - 110);
          ctx.lineTo(pOriginX, pOriginY + 110);
          ctx.stroke();

          // Phase Trajectory Trail
          if (phaseTrailRef.current.length > 1) {
            ctx.strokeStyle = '#6366F1';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            phaseTrailRef.current.forEach((pt, i) => {
              const px = pOriginX + pt.theta * pScaleTheta;
              const py = pOriginY - pt.omega * pScaleOmega;
              i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            });
            ctx.stroke();
          }

          drawPbrSphere(ctx, pOriginX + theta * pScaleTheta, pOriginY - omega * pScaleOmega, 5, '#2563EB', '#FFFFFF');
        }

        // Draw Comet Motion Trail behind Pendulum Bob
        const trail = pendulumTrailRef.current;
        for (let i = 0; i < trail.length - 1; i++) {
          const ratio = (i + 1) / trail.length;
          ctx.strokeStyle = `rgba(37, 99, 235, ${ratio * 0.55})`;
          ctx.lineWidth = ratio * 6.5;
          ctx.beginPath();
          ctx.moveTo(trail[i].x, trail[i].y);
          ctx.lineTo(trail[i + 1].x, trail[i + 1].y);
          ctx.stroke();
        }

        // String
        ctx.strokeStyle = '#78716C';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(bobX, bobY);
        ctx.stroke();

        // 3D PBR Bob with specular glint
        drawPbrSphere(ctx, bobX, bobY, 16, '#2563EB', '#FFFFFF');

        // Dynamic Vectors
        const v = L * omega;
        drawVector(ctx, bobX, bobY, bobX + v * 18 * Math.cos(theta), bobY - v * 18 * Math.sin(theta), '#059669', 'v');
        drawVector(ctx, bobX, bobY, bobX, bobY + 45, '#E11D48', 'P');

        // Mechanical Energy Telemetry
        const wKin = 0.5 * m * Math.pow(L * omega, 2);
        const wPot = m * g * L * (1 - Math.cos(theta));
        const wTotal = wKin + wPot;

        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(formatCanvasMath(`θ: ${((theta * 180) / Math.PI).toFixed(1)}° | ω: ${omega.toFixed(2)} rad/s`), 16, canvas.height - 25);
        ctx.fillStyle = '#57534E';
        ctx.fillText(formatCanvasMath(`W_đ: ${wKin.toFixed(2)}J | W_t: ${wPot.toFixed(2)}J | Cơ năng: ${wTotal.toFixed(2)}J`), 16, canvas.height - 10);

      // ==============================================================
      // 4. PHYS_OPTICS_LENS: Optical Bench & Real/Virtual Rays
      // ==============================================================
      } else if (currentMode === 'OPTICS_LENS') {
        const f = params.f ?? 100;
        const d = params.d ?? 220;
        const h = params.h ?? 50;

        const lensX = canvas.width / 2;
        const axisY = canvas.height / 2;

        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(20, axisY);
        ctx.lineTo(canvas.width - 20, axisY);
        ctx.stroke();

        // Lens body
        ctx.strokeStyle = '#2563EB';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(lensX, axisY - 120);
        ctx.lineTo(lensX, axisY + 120);
        ctx.stroke();

        // Focal Points F and F'
        drawPbrSphere(ctx, lensX - f, axisY, 4.5, '#D97706', '#FFFFFF');
        ctx.fillText('F', lensX - f - 5, axisY + 18);
        drawPbrSphere(ctx, lensX + f, axisY, 4.5, '#D97706', '#FFFFFF');
        ctx.fillText("F'", lensX + f - 5, axisY + 18);

        const objX = lensX - d;
        drawVector(ctx, objX, axisY, objX, axisY - h, '#2563EB', 'AB');

        if (Math.abs(d - f) > 5) {
          const dPrime = (d * f) / (d - f);
          const hPrime = -(dPrime / d) * h;
          const imgX = lensX + dPrime;
          const imgY = axisY - hPrime;

          // Ray 1: Parallel to principal axis then passes through F'
          ctx.strokeStyle = '#D97706';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(objX, axisY - h);
          ctx.lineTo(lensX, axisY - h);
          ctx.lineTo(imgX, imgY);
          ctx.stroke();

          // Ray 2: Passes through optical center O undeflected
          ctx.beginPath();
          ctx.moveTo(objX, axisY - h);
          ctx.lineTo(lensX, axisY);
          ctx.lineTo(imgX, imgY);
          ctx.stroke();

          drawVector(ctx, imgX, axisY, imgX, imgY, '#E11D48', "A'B'");

          ctx.fillStyle = '#0F172A';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(formatCanvasMath(`d' = ${dPrime.toFixed(1)}px (${dPrime > 0 ? 'Ảnh thật' : 'Ảnh ảo'}) | Độ phóng đại k = ${(-dPrime / d).toFixed(2)}`), 20, 30);
        }

      // ==============================================================
      // 5. PHYS_INCLINED: Inclined Plane & Metallic Spring / Friction
      // ==============================================================
      } else if (currentMode === 'INCLINED') {
        const alpha = ((params.alpha ?? 30) * Math.PI) / 180;
        const mu = params.mu ?? 0.15;
        const m = params.m ?? 2;
        const g = params.g ?? 9.8;

        const originX = 70;
        const originY = 280;
        const rampLen = 440;
        const topX = originX + rampLen * Math.cos(alpha);
        const topY = originY - rampLen * Math.sin(alpha);

        // Ramp Wedge
        ctx.strokeStyle = '#94A3B8';
        ctx.fillStyle = '#F2F0EA';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(topX, originY);
        ctx.lineTo(topX, topY);
        ctx.closePath();
        ctx.stroke();
        ctx.fill();

        const a = Math.max(0, g * (Math.sin(alpha) - mu * Math.cos(alpha)));
        const sDist = (0.5 * a * Math.pow(t % 4, 2) * 16) % rampLen;
        const blockX = topX - sDist * Math.cos(alpha);
        const blockY = topY + sDist * Math.sin(alpha);

        // Spring attached to the top of ramp
        drawMetallicSpring(ctx, topX, topY, blockX, blockY, 8, 10);

        ctx.save();
        ctx.translate(blockX, blockY);
        ctx.rotate(-alpha);

        // Block with 3D shadow
        ctx.fillStyle = '#2563EB';
        ctx.strokeStyle = '#1D4ED8';
        ctx.lineWidth = 1.5;
        ctx.fillRect(-22, -26, 44, 26);
        ctx.strokeRect(-22, -26, 44, 26);

        drawVector(ctx, 0, 0, 0, 50, '#E11D48', 'P');
        drawVector(ctx, 0, 0, 0, -42, '#059669', 'N');
        drawVector(ctx, 0, 0, 35, 0, '#D97706', 'F_ms');
        ctx.restore();

        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(formatCanvasMath(`Gia tốc trượt: a = ${a.toFixed(2)} m/s² | Góc nghiêng α: ${((alpha * 180) / Math.PI).toFixed(0)}°`), 20, 30);

      // ==============================================================
      // 6. PHYS_PROJECTILE: Projectile with Air Drag & Glowing Comet Trail
      // ==============================================================
      } else {
        const v0 = params.v0 ?? 22;
        const alpha = params.alpha ?? 45;
        const g = params.g ?? 9.8;
        const kDrag = isOlympiad ? (params.k ?? 0.04) : 0;

        const metrics = computeProjectile(v0, alpha, g);
        const { tFlight, tApex, hMax, lMax, vx } = metrics;

        const groundY = canvas.height - 35;
        const startX = 45;
        const availW = canvas.width - startX - 35;
        const availH = groundY - 45;

        const scaleX = availW / Math.max(lMax, 15);
        const scaleY = availH / Math.max(hMax, 8);
        const scale = Math.min(scaleX, scaleY);

        // Ground line
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(20, groundY);
        ctx.lineTo(canvas.width - 20, groundY);
        ctx.stroke();

        // Parabola Trajectory Guide
        ctx.save();
        ctx.strokeStyle = '#CBD5E1';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let step = 0; step <= 80; step++) {
          const tRatio = step / 80;
          const tCurr = tRatio * tFlight;
          const x = vx * tCurr;
          const y = (v0 * Math.sin((alpha * Math.PI) / 180)) * tCurr - 0.5 * g * tCurr * tCurr;
          const px = startX + x * scale;
          const py = groundY - y * scale;
          step === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();

        // Projectile loop time
        const tLoop = tFlight > 0 ? (t * 0.8) % tFlight : 0;
        const curX = startX + vx * tLoop * scale;
        const curYVal = (v0 * Math.sin((alpha * Math.PI) / 180)) * tLoop - 0.5 * g * tLoop * tLoop;
        const curY = groundY - Math.max(0, curYVal) * scale;
        const curVy = v0 * Math.sin((alpha * Math.PI) / 180) - g * tLoop;

        // Reset trail on loop restart
        if (tLoop < 0.08) {
          projectileTrailRef.current = [];
        }

        // Store comet trail point
        projectileTrailRef.current.push({ x: curX, y: curY, alpha: 1.0 });
        if (projectileTrailRef.current.length > 40) projectileTrailRef.current.shift();

        // Draw Glowing Comet Trail
        const pTrail = projectileTrailRef.current;
        for (let i = 0; i < pTrail.length - 1; i++) {
          const ratio = (i + 1) / pTrail.length;
          ctx.strokeStyle = `rgba(37, 99, 235, ${ratio * 0.6})`;
          ctx.lineWidth = ratio * 7.5;
          ctx.beginPath();
          ctx.moveTo(pTrail[i].x, pTrail[i].y);
          ctx.lineTo(pTrail[i + 1].x, pTrail[i + 1].y);
          ctx.stroke();
        }

        // 3D PBR Ball with specular glint
        drawPbrSphere(ctx, curX, curY, 8.5, '#2563EB', '#FFFFFF');

        // Dynamic Vectors
        const vScale = 1.6;
        drawVector(ctx, curX, curY, curX + vx * vScale, curY, '#059669', 'v_x');
        if (Math.abs(curVy) > 0.5) {
          drawVector(ctx, curX, curY, curX, curY - curVy * vScale, '#E11D48', 'v_y');
        }

        // Mechanical Energy readouts
        const curV = Math.hypot(vx, curVy);
        const wKin = 0.5 * 1.0 * curV * curV;
        const wPot = 1.0 * g * Math.max(0, curYVal);
        const wTotal = wKin + wPot;

        // Update HUD
        if (Math.floor(t * 40) % 4 === 0) {
          setHud((prev) => ({
            ...prev,
            hMax: Number(hMax.toFixed(1)),
            lMax: Number(lMax.toFixed(1)),
            tFlight: Number(tFlight.toFixed(2)),
            vx: Number(vx.toFixed(1)),
            vy: Number(curVy.toFixed(1)),
            wKin: Number(wKin.toFixed(1)),
            wPot: Number(wPot.toFixed(1)),
            wTotal: Number(wTotal.toFixed(1)),
            isApex: Math.abs(tLoop - tApex) < 0.08,
          }));
        }
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [blueprint, params, currentMode, isOlympiad]);

  return (
    <div className="relative w-full max-w-[620px] flex flex-col items-center">
      {/* Subject Content Ribbon */}
      <div className={isHologram ? "hidden" : "w-full flex items-center justify-between px-3 py-1.5 mb-2 bg-white/95 backdrop-blur-md rounded-xl border border-[#E6E4DD] shadow-[0_2px_12px_-2px_rgba(20,20,19,0.04)] flex-wrap gap-2"}>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 font-semibold">
            Nội dung Vật lý:
          </span>
          <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 text-xs font-semibold font-mono border border-stone-200">
            {PHYSICS_CONTENT_MAP[currentMode]?.badgeLabel || 'Chuyển động Ném xiên trong Trọng trường'}
          </span>
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          <button
            type="button"
            data-testid="mode-btn-projectile"
            onClick={() => setActiveMode('PROJECTILE')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
              currentMode === 'PROJECTILE'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm font-semibold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
            <span>Ném xiên (Parabol)</span>
          </button>

          <button
            type="button"
            data-testid="mode-btn-ripple"
            onClick={() => setActiveMode('RIPPLE_TANK')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
              currentMode === 'RIPPLE_TANK'
                ? 'bg-sky-50 text-sky-700 border border-sky-200 shadow-sm font-semibold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Waves className="w-3.5 h-3.5 text-sky-600" />
            <span>Giao thoa Sóng</span>
          </button>

          <button
            type="button"
            data-testid="mode-btn-pendulum"
            onClick={() => setActiveMode('PENDULUM')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
              currentMode === 'PENDULUM'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm font-semibold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-indigo-600" />
            <span>Con lắc đơn</span>
          </button>

          <button
            type="button"
            data-testid="mode-btn-rlc"
            onClick={() => setActiveMode('RLC_PHASOR')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
              currentMode === 'RLC_PHASOR'
                ? 'bg-amber-50 text-amber-700 border border-amber-200 shadow-sm font-semibold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-600" />
            <span>Mạch điện RLC</span>
          </button>

          <button
            type="button"
            data-testid="mode-btn-inclined"
            onClick={() => setActiveMode('INCLINED')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
              currentMode === 'INCLINED'
                ? 'bg-purple-50 text-purple-700 border border-purple-200 shadow-sm font-semibold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Scale className="w-3.5 h-3.5 text-purple-600" />
            <span>Mặt phẳng nghiêng</span>
          </button>
        </div>
      </div>

      {/* Pill-shaped Glass HUD Overlay for PHYS_PROJECTILE */}
      {currentMode === 'PROJECTILE' && (
        <div className={`absolute top-2 left-3 rounded-xl px-3 py-1.5 flex items-center gap-2.5 text-[11px] font-mono pointer-events-none z-10 flex-wrap ${
          isHologram
            ? 'bg-stone-900/10 dark:bg-black/30 backdrop-blur-xs border border-stone-400/20 text-stone-800 dark:text-stone-200 shadow-none'
            : 'bg-white/95 backdrop-blur-md border border-[#E6E4DD] text-stone-800 shadow-[0_4px_24px_-4px_rgba(20,20,19,0.06)]'
        }`}>
          <div className="flex items-center gap-1">
            <span className="text-stone-500"><MathText text="H_{\max}:" /></span>{' '}
            <span className="text-stone-900 dark:text-stone-100 font-bold tabular-nums">{hud.hMax}m</span>
          </div>
          <div className="w-[1px] h-3 bg-stone-300 dark:bg-stone-700" />
          <div className="flex items-center gap-1">
            <span className="text-stone-500"><MathText text="L_{\max}:" /></span>{' '}
            <span className="text-stone-900 dark:text-stone-100 font-bold tabular-nums">{hud.lMax}m</span>
          </div>
          <div className="w-[1px] h-3 bg-stone-300 dark:bg-stone-700" />
          <div className="flex items-center gap-1">
            <span className="text-stone-500"><MathText text="t_{\text{bay}}:" /></span>{' '}
            <span className="text-stone-900 dark:text-stone-100 font-bold tabular-nums">{hud.tFlight}s</span>
          </div>
          <div className="w-[1px] h-3 bg-stone-300 dark:bg-stone-700" />
          <div className="flex items-center gap-1">
            <span className="text-stone-500"><MathText text="W_đ:" /></span>{' '}
            <span className="text-emerald-700 dark:text-emerald-400 font-bold tabular-nums">{hud.wKin}J</span>
          </div>
          <div className="w-[1px] h-3 bg-stone-300 dark:bg-stone-700" />
          <div className="flex items-center gap-1">
            <span className="text-stone-500"><MathText text="W_t:" /></span>{' '}
            <span className="text-rose-700 dark:text-rose-400 font-bold tabular-nums">{hud.wPot}J</span>
          </div>
          <div className="w-[1px] h-3 bg-stone-300 dark:bg-stone-700" />
          <div className="flex items-center gap-1">
            <span className="text-stone-500">Cơ năng W:</span>{' '}
            <span className="text-blue-700 dark:text-cyan-400 font-bold tabular-nums">{hud.wTotal}J</span>
          </div>
        </div>
      )}

      {/* Pill-shaped Glass HUD Overlay for PHYS_RLC_PHASOR */}
      {currentMode === 'RLC_PHASOR' && (
        <div className={`absolute top-2 right-3 rounded-xl px-3 py-1.5 flex items-center gap-2.5 text-[11px] font-mono pointer-events-none z-10 flex-wrap ${
          isHologram
            ? 'bg-stone-900/10 dark:bg-black/30 backdrop-blur-xs border border-stone-400/20 text-stone-800 dark:text-stone-200 shadow-none'
            : 'bg-white/95 backdrop-blur-md border border-[#E6E4DD] text-stone-800 shadow-[0_4px_24px_-4px_rgba(20,20,19,0.06)]'
        }`}>
          <div className="flex items-center gap-1">
            <span className="text-stone-500">Tổng trở Z:</span>{' '}
            <span className="text-stone-900 dark:text-stone-100 font-bold tabular-nums">{hud.rlcZ} Ω</span>
          </div>
          <div className="w-[1px] h-3 bg-stone-300 dark:bg-stone-700" />
          <div className="flex items-center gap-1">
            <span className="text-stone-500">Dòng I:</span>{' '}
            <span className="text-stone-900 dark:text-stone-100 font-bold tabular-nums">{hud.rlcI} A</span>
          </div>
          <div className="w-[1px] h-3 bg-stone-300 dark:bg-stone-700" />
          <div className="flex items-center gap-1">
            <span className="text-stone-500"><MathText text="\cos\varphi:" /></span>{' '}
            <span className="text-stone-900 dark:text-stone-100 font-bold tabular-nums">{hud.rlcCosPhi}</span>
          </div>
          <div className="w-[1px] h-3 bg-stone-300 dark:bg-stone-700" />
          <div className="flex items-center gap-1">
            <span className="text-stone-500">Công suất P:</span>{' '}
            <span className="text-stone-900 dark:text-stone-100 font-bold tabular-nums">{hud.rlcP} W</span>
          </div>
          {hud.rlcResonance && (
            <div className="px-2 py-0.5 rounded bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] font-semibold font-mono text-[10px] uppercase tracking-wider">
              Cộng hưởng (Resonance)
            </div>
          )}
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={620}
        height={340}
        className={
          isHologram
            ? "w-full object-contain bg-transparent border-0 shadow-none"
            : "rounded-2xl bg-[#FCFBF9] border border-[#E6E4DD] w-full object-contain shadow-[0_4px_24px_-4px_rgba(20,20,19,0.06)]"
        }
      />
    </div>
  );
};
