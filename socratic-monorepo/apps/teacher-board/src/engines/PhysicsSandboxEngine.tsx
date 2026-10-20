// apps/teacher-board/src/engines/PhysicsSandboxEngine.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { SimulationBlueprint, CurriculumLevel } from '@socratic/types';
import { computeProjectile, PLANETARY_GRAVITY } from '../utils/physics';

interface Props {
  blueprint: SimulationBlueprint;
  params: Record<string, number>;
  curriculumLevel?: CurriculumLevel;
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
    // Acceleration
    const ax1 = -kDrag * v * vx;
    const ay1 = -g - kDrag * v * vy;

    // Standard RK4 or Euler-Heun
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

export const PhysicsSandboxEngine: React.FC<Props> = ({
  blueprint,
  params,
  curriculumLevel = blueprint.curriculumLevel ?? 'THPT_STANDARD',
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeRef = useRef<number>(0);

  // Simulation persistent states
  const pendulumStateRef = useRef<{ theta: number; omega: number }>({ theta: 0.5, omega: 0 });
  const phaseTrailRef = useRef<{ theta: number; omega: number }[]>([]);

  const [hud, setHud] = useState({
    hMax: 0,
    lMax: 0,
    tFlight: 0,
    vx: 0,
    vy: 0,
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

  // Helper to draw vector arrows
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
    ctx.lineWidth = 2.2;

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

    ctx.font = 'bold 11px monospace';
    ctx.fillText(label, x2 + 5, y2 - 4);
    ctx.restore();
  };

  useEffect(() => {
    // Reset state when template changes
    pendulumStateRef.current = {
      theta: ((params.theta0 ?? 35) * Math.PI) / 180,
      omega: 0,
    };
    phaseTrailRef.current = [];
  }, [blueprint.templateId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const renderLoop = () => {
      timeRef.current += 0.02;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // ==============================================================
      // 1. PHYS_RLC_PHASOR: Điện xoay chiều & Giản đồ Fresnel (Lớp 12 & Chuyên)
      // ==============================================================
      if (blueprint.templateId === 'PHYS_RLC_PHASOR') {
        const R = params.R ?? 50.0; // Ohm
        const L = params.L ?? 0.5; // Henry
        const C_uF = params.C ?? 50.0; // microFarad
        const C = C_uF * 1e-6; // Farad
        const omega = params.omega ?? 200.0; // rad/s
        const U = params.U ?? 120.0; // Volt

        // Core AC Calculations
        const Z_L = omega * L;
        const Z_C = 1.0 / (omega * C);
        const Z = Math.sqrt(R * R + (Z_L - Z_C) * (Z_L - Z_C));
        const I = U / Z;
        const U_R = I * R;
        const U_L = I * Z_L;
        const U_C = I * Z_C;
        const U_LC = U_L - U_C;
        const tanPhi = (Z_L - Z_C) / R;
        const phi = Math.atan(tanPhi);
        const cosPhi = R / Z;
        const P = U * I * cosPhi;
        const omega0 = 1.0 / Math.sqrt(L * C);
        const isResonant = Math.abs(omega - omega0) / omega0 < 0.04;

        // DUAL-VIEW LAYOUT:
        // Left View (0..300): Fresnel Phasor Diagram (Giản đồ Fresnel)
        // Right View (310..610): Resonance Curve I(omega) (Đường cong cộng hưởng)
        const leftCenterX = 150;
        const leftCenterY = 175;

        // Divider
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(305, 10);
        ctx.lineTo(305, canvas.height - 10);
        ctx.stroke();

        // Left Panel Header
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('GIẢN ĐỒ FRESNEL (PHASOR)', 18, 22);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.fillText('Trục I làm chuẩn (nằm ngang)', 18, 36);

        // Reference axes at left center
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(leftCenterX - 110, leftCenterY);
        ctx.lineTo(leftCenterX + 130, leftCenterY);
        ctx.moveTo(leftCenterX, leftCenterY - 110);
        ctx.lineTo(leftCenterX, leftCenterY + 110);
        ctx.stroke();

        // Scale voltage to pixels
        const maxV = Math.max(U, U_R, U_L, U_C, 100);
        const vPixScale = 90 / maxV;

        const urPix = U_R * vPixScale;
        const ulPix = U_L * vPixScale;
        const ucPix = U_C * vPixScale;
        const ulcPix = U_LC * vPixScale;

        // Vectors from origin:
        // 1. Current vector I reference
        drawVector(ctx, leftCenterX, leftCenterY, leftCenterX + 45, leftCenterY, '#22c55e', 'i');

        // 2. U_R (along I, horizontal)
        drawVector(ctx, leftCenterX, leftCenterY, leftCenterX + urPix, leftCenterY, '#10b981', `U_R (${U_R.toFixed(0)}V)`);

        // 3. U_L (leads by +90 deg, pointing UP)
        drawVector(ctx, leftCenterX, leftCenterY, leftCenterX, leftCenterY - ulPix, '#f59e0b', `U_L (${U_L.toFixed(0)}V)`);

        // 4. U_C (lags by -90 deg, pointing DOWN)
        drawVector(ctx, leftCenterX, leftCenterY, leftCenterX, leftCenterY + ucPix, '#ec4899', `U_C (${U_C.toFixed(0)}V)`);

        // 5. U_LC = U_L + U_C (vertical resultant)
        drawVector(ctx, leftCenterX + urPix, leftCenterY, leftCenterX + urPix, leftCenterY - ulcPix, '#a855f7', 'U_LC', true);

        // 6. Total U resultant (gold glowing vector)
        ctx.save();
        ctx.shadowColor = '#eab308';
        ctx.shadowBlur = isResonant ? 16 : 8;
        drawVector(ctx, leftCenterX, leftCenterY, leftCenterX + urPix, leftCenterY - ulcPix, '#eab308', `U (${U.toFixed(0)}V)`);
        ctx.restore();

        // Phase angle arc φ
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(leftCenterX, leftCenterY, 32, -Math.max(0, phi), -Math.min(0, phi), phi < 0);
        ctx.stroke();
        ctx.fillStyle = '#38bdf8';
        ctx.font = '10px monospace';
        const phiDeg = (phi * 180) / Math.PI;
        ctx.fillText(`φ = ${phiDeg.toFixed(1)}°`, leftCenterX + 38, leftCenterY - (phiDeg * 0.3));

        // RIGHT VIEW: Analytical Resonance Curve I(omega)
        const plotLeft = 330;
        const plotRight = 595;
        const plotTop = 45;
        const plotBottom = canvas.height - 35;
        const plotW = plotRight - plotLeft;
        const plotH = plotBottom - plotTop;

        // Header
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('ĐƯỜNG CONG CỘNG HƯỞNG I(ω)', plotLeft, 22);

        // Axes
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(plotLeft, plotBottom);
        ctx.lineTo(plotRight, plotBottom);
        ctx.moveTo(plotLeft, plotTop);
        ctx.lineTo(plotLeft, plotBottom);
        ctx.stroke();

        // X and Y axis labels
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.fillText('ω (rad/s)', plotRight - 45, plotBottom + 20);
        ctx.fillText('I (A)', plotLeft + 6, plotTop - 8);

        // Plot Range: omega from 20 to 500 rad/s
        const minW = 20;
        const maxW = 500;
        const iMaxRes = U / R;

        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        let first = true;
        for (let w = minW; w <= maxW; w += 4) {
          const zL_w = w * L;
          const zC_w = 1.0 / (w * C);
          const z_w = Math.sqrt(R * R + (zL_w - zC_w) * (zL_w - zC_w));
          const i_w = U / z_w;

          const px = plotLeft + ((w - minW) / (maxW - minW)) * plotW;
          const py = plotBottom - (i_w / iMaxRes) * (plotH * 0.9);
          if (first) {
            ctx.moveTo(px, py);
            first = false;
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.stroke();

        // Resonance peak marker
        if (omega0 >= minW && omega0 <= maxW) {
          const resX = plotLeft + ((omega0 - minW) / (maxW - minW)) * plotW;
          ctx.save();
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = '#eab308';
          ctx.beginPath();
          ctx.moveTo(resX, plotTop);
          ctx.lineTo(resX, plotBottom);
          ctx.stroke();
          ctx.restore();

          ctx.fillStyle = '#eab308';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(`ω₀ = ${omega0.toFixed(0)}`, resX - 25, plotTop + 14);
        }

        // Current operating point on curve
        const curPx = plotLeft + ((omega - minW) / (maxW - minW)) * plotW;
        const curPy = plotBottom - (I / iMaxRes) * (plotH * 0.9);

        ctx.save();
        ctx.fillStyle = isResonant ? '#eab308' : '#38bdf8';
        ctx.shadowColor = isResonant ? '#eab308' : '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(curPx, curPy, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Update HUD
        if (Math.floor(timeRef.current * 50) % 4 === 0) {
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
      // 2. PHYS_PENDULUM: RK4 Non-linear Large-Angle & Phase Space Portrait
      // ==============================================================
      } else if (blueprint.templateId === 'PHYS_PENDULUM') {
        const L = params.L ?? 2.0; // length in m
        const g = params.g ?? 9.8; // gravity
        const theta0Deg = params.theta0 ?? 45.0; // initial angle in deg
        const b = params.b ?? (isOlympiad ? 0.08 : 0.02); // damping
        const m = params.m ?? 1.0;

        // Step RK4 non-linear differential equation
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

        // Store phase trail for Phase Space Portrait
        phaseTrailRef.current.push({ theta, omega });
        if (phaseTrailRef.current.length > 250) phaseTrailRef.current.shift();

        if (isOlympiad) {
          // DUAL-VIEW: Left is Spatial Motion, Right is Phase Space (omega vs theta)
          const leftPivotX = 145;
          const leftPivotY = 40;
          const pixelL = L * 75;
          const bobX = leftPivotX + pixelL * Math.sin(theta);
          const bobY = leftPivotY + pixelL * Math.cos(theta);

          // Divider
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(295, 10);
          ctx.lineTo(295, canvas.height - 10);
          ctx.stroke();

          // Left Panel: Pendulum Motion
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 12px monospace';
          ctx.fillText('RK4 CON LẮC GÓC LỚN', 16, 22);

          // String
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(leftPivotX, leftPivotY);
          ctx.lineTo(bobX, bobY);
          ctx.stroke();

          // Bob
          ctx.fillStyle = '#38bdf8';
          ctx.shadowColor = '#0284c7';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(bobX, bobY, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Vectors: Velocity, Tension, Weight
          const v = L * omega;
          drawVector(ctx, bobX, bobY, bobX + v * 18 * Math.cos(theta), bobY - v * 18 * Math.sin(theta), '#22c55e', 'v');
          drawVector(ctx, bobX, bobY, bobX, bobY + 45, '#f43f5e', 'P');

          // Mechanical Energy Telemetry
          const W_kin = 0.5 * m * Math.pow(L * omega, 2);
          const W_pot = m * g * L * (1 - Math.cos(theta));
          const W_tot = W_kin + W_pot;

          ctx.fillStyle = '#cbd5e1';
          ctx.font = '10px monospace';
          ctx.fillText(`θ: ${((theta * 180) / Math.PI).toFixed(1)}°`, 16, canvas.height - 35);
          ctx.fillText(`W_đ: ${W_kin.toFixed(1)}J | W_t: ${W_pot.toFixed(1)}J`, 16, canvas.height - 20);

          // Right Panel: Phase Space Portrait (Không gian pha: omega theo theta)
          const pOriginX = 450;
          const pOriginY = 170;
          const pScaleTheta = 70; // px per rad
          const pScaleOmega = 22; // px per rad/s

          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 12px monospace';
          ctx.fillText('KHÔNG GIAN PHA (PHASE PORTRAIT)', 310, 22);
          ctx.fillStyle = '#94a3b8';
          ctx.font = '10px monospace';
          ctx.fillText('Đạo hàm vận tốc góc (ω) theo li độ góc (θ)', 310, 36);

          // Phase axes
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pOriginX - 130, pOriginY);
          ctx.lineTo(pOriginX + 130, pOriginY);
          ctx.moveTo(pOriginX, pOriginY - 110);
          ctx.lineTo(pOriginX, pOriginY + 110);
          ctx.stroke();

          ctx.fillStyle = '#94a3b8';
          ctx.font = '10px monospace';
          ctx.fillText('θ (rad)', pOriginX + 105, pOriginY + 15);
          ctx.fillText('ω (rad/s)', pOriginX + 8, pOriginY - 95);

          // Draw Phase Trajectory Trail (Orbit spiral)
          if (phaseTrailRef.current.length > 1) {
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            phaseTrailRef.current.forEach((pt, i) => {
              const px = pOriginX + pt.theta * pScaleTheta;
              const py = pOriginY - pt.omega * pScaleOmega;
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            });
            ctx.stroke();
          }

          // Current state dot
          const curPx = pOriginX + theta * pScaleTheta;
          const curPy = pOriginY - omega * pScaleOmega;
          ctx.fillStyle = '#38bdf8';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(curPx, curPy, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

        } else {
          // Standard Single View: Harmonic/Damped Pendulum
          const pivotX = canvas.width / 2;
          const pivotY = 40;
          const pixelL = L * 90;
          const bobX = pivotX + pixelL * Math.sin(theta);
          const bobY = pivotY + pixelL * Math.cos(theta);

          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(pivotX, pivotY);
          ctx.lineTo(bobX, bobY);
          ctx.stroke();

          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(bobX, bobY, 18, 0, Math.PI * 2);
          ctx.fill();

          drawVector(ctx, bobX, bobY, bobX, bobY + 55, '#f43f5e', 'P');
          drawVector(ctx, bobX, bobY, bobX - 45 * Math.sin(theta), bobY - 45 * Math.cos(theta), '#a855f7', 'T');
        }

      // ==============================================================
      // 3. PHYS_INCLINED & PHYS_OPTICS_LENS: (Giữ nguyên độ tương thích)
      // ==============================================================
      } else if (blueprint.templateId === 'PHYS_INCLINED') {
        const alpha = ((params.alpha ?? 30) * Math.PI) / 180;
        const mu = params.mu ?? 0.15;
        const m = params.m ?? 2;
        const g = params.g ?? 9.8;

        const originX = 80;
        const originY = 280;
        const rampLen = 420;
        const topX = originX + rampLen * Math.cos(alpha);
        const topY = originY - rampLen * Math.sin(alpha);

        ctx.strokeStyle = '#64748b';
        ctx.fillStyle = 'rgba(100, 116, 139, 0.15)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(topX, originY);
        ctx.lineTo(topX, topY);
        ctx.closePath();
        ctx.stroke();
        ctx.fill();

        const a = Math.max(0, g * (Math.sin(alpha) - mu * Math.cos(alpha)));
        const sDist = (0.5 * a * Math.pow(timeRef.current % 4, 2) * 15) % rampLen;
        const blockX = topX - sDist * Math.cos(alpha);
        const blockY = topY + sDist * Math.sin(alpha);

        ctx.save();
        ctx.translate(blockX, blockY);
        ctx.rotate(-alpha);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-20, -25, 40, 25);
        drawVector(ctx, 0, 0, 0, 50, '#f43f5e', 'P');
        drawVector(ctx, 0, 0, 0, -40, '#22c55e', 'N');
        drawVector(ctx, 0, 0, 35, 0, '#f59e0b', 'F_ms');
        ctx.restore();

      } else if (blueprint.templateId === 'PHYS_OPTICS_LENS') {
        const f = params.f ?? 100;
        const d = params.d ?? 220;
        const h = params.h ?? 50;

        const lensX = canvas.width / 2;
        const axisY = canvas.height / 2;

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(20, axisY); ctx.lineTo(canvas.width - 20, axisY); ctx.stroke();

        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(lensX, axisY - 120); ctx.lineTo(lensX, axisY + 120); ctx.stroke();

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath(); ctx.arc(lensX - f, axisY, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillText('F', lensX - f - 5, axisY + 18);
        ctx.beginPath(); ctx.arc(lensX + f, axisY, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillText("F'", lensX + f - 5, axisY + 18);

        const objX = lensX - d;
        drawVector(ctx, objX, axisY, objX, axisY - h, '#38bdf8', 'AB');

        if (Math.abs(d - f) > 5) {
          const dPrime = (d * f) / (d - f);
          const hPrime = - (dPrime / d) * h;
          const imgX = lensX + dPrime;
          const imgY = axisY - hPrime;

          ctx.strokeStyle = 'rgba(250, 204, 21, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(objX, axisY - h);
          ctx.lineTo(lensX, axisY - h);
          ctx.lineTo(imgX, imgY);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(objX, axisY - h);
          ctx.lineTo(lensX, axisY);
          ctx.lineTo(imgX, imgY);
          ctx.stroke();

          drawVector(ctx, imgX, axisY, imgX, imgY, '#ec4899', "A'B'");
        }

      // ==============================================================
      // 4. PHYS_PROJECTILE: Projectile with Air Drag & Ghost Trail (Lớp 10 & Chuyên)
      // ==============================================================
      } else {
        const v0 = params.v0 ?? 22;
        const alpha = params.alpha ?? 45;
        const g = params.g ?? 9.8;
        const kDrag = isOlympiad ? (params.k ?? 0.04) : 0; // Air drag coefficient

        // Analytical vacuum metrics
        const metrics = computeProjectile(v0, alpha, g);
        const { tFlight, tApex, hMax, lMax, vx } = metrics;

        // Baseline (defaultValue) for Ghost Trail comparison
        const baseV0 = blueprint.parameters?.find((p) => p.key === 'v0')?.defaultValue ?? 22;
        const baseAlpha = blueprint.parameters?.find((p) => p.key === 'alpha')?.defaultValue ?? 45;
        const baseG = blueprint.parameters?.find((p) => p.key === 'g')?.defaultValue ?? 9.8;
        const baseMetrics = computeProjectile(baseV0, baseAlpha, baseG);
        const hasBaseDelta =
          Math.abs(v0 - baseV0) > 0.05 ||
          Math.abs(alpha - baseAlpha) > 0.05 ||
          Math.abs(g - baseG) > 0.05;

        // Auto-scale canvas bounds
        const groundY = canvas.height - 35;
        const startX = 45;
        const availW = canvas.width - startX - 35;
        const availH = groundY - 45;

        const maxRangeNeeded = Math.max(lMax, baseMetrics.lMax, 15);
        const maxHeightNeeded = Math.max(hMax, baseMetrics.hMax, 8);
        const scaleX = availW / maxRangeNeeded;
        const scaleY = availH / maxHeightNeeded;
        const scale = Math.min(scaleX, scaleY);

        // Ground line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(20, groundY);
        ctx.lineTo(canvas.width - 20, groundY);
        ctx.stroke();

        // 1. Ghost Trail: Baseline Trajectory
        if (hasBaseDelta) {
          ctx.save();
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let step = 0; step <= 60; step++) {
            const tRatio = step / 60;
            const t = tRatio * baseMetrics.tFlight;
            const x = baseMetrics.vx * t;
            const y = (baseV0 * Math.sin((baseAlpha * Math.PI) / 180)) * t - 0.5 * baseG * t * t;
            const px = startX + x * scale;
            const py = groundY - y * scale;
            if (step === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
          ctx.restore();
        }

        // 2. Active Trajectory: Either Vacuum or Olympiad Air Drag (RK4)
        if (kDrag > 0) {
          const rk4Res = computeProjectileRK4(v0, alpha, g, kDrag);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3;
          ctx.beginPath();
          rk4Res.points.forEach((pt, i) => {
            const px = startX + pt.x * scale;
            const py = groundY - pt.y * scale;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();

          // Label
          ctx.fillStyle = '#38bdf8';
          ctx.font = '10px monospace';
          ctx.fillText(`Cản khí: k=${kDrag} | L=${rk4Res.lMax.toFixed(1)}m`, startX + 10, 40);
        } else {
          // Pure vacuum parabola
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3;
          ctx.beginPath();
          for (let step = 0; step <= 80; step++) {
            const tRatio = step / 80;
            const t = tRatio * tFlight;
            const x = vx * t;
            const y = (v0 * Math.sin((alpha * Math.PI) / 180)) * t - 0.5 * g * t * t;
            const px = startX + x * scale;
            const py = groundY - y * scale;
            if (step === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }

        // Animated Ball
        const tLoop = tFlight > 0 ? (timeRef.current * 0.8) % tFlight : 0;
        const curX = startX + vx * tLoop * scale;
        const curYVal = (v0 * Math.sin((alpha * Math.PI) / 180)) * tLoop - 0.5 * g * tLoop * tLoop;
        const curY = groundY - Math.max(0, curYVal) * scale;
        const curVy = v0 * Math.sin((alpha * Math.PI) / 180) - g * tLoop;

        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(curX, curY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Vectors
        const vScale = 1.6;
        drawVector(ctx, curX, curY, curX + vx * vScale, curY, '#34d399', 'vx');
        if (Math.abs(curVy) > 0.5) {
          drawVector(ctx, curX, curY, curX, curY - curVy * vScale, '#f43f5e', 'vy');
        }

        // Update HUD
        if (Math.floor(timeRef.current * 40) % 4 === 0) {
          setHud((prev) => ({
            ...prev,
            hMax: Number(hMax.toFixed(1)),
            lMax: Number(lMax.toFixed(1)),
            tFlight: Number(tFlight.toFixed(2)),
            vx: Number(vx.toFixed(1)),
            vy: Number(curVy.toFixed(1)),
            isApex: Math.abs(tLoop - tApex) < 0.08,
            deltaL: Number((lMax - baseMetrics.lMax).toFixed(1)),
            deltaH: Number((hMax - baseMetrics.hMax).toFixed(1)),
            hasDelta: hasBaseDelta,
          }));
        }
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [blueprint, params, curriculumLevel]);

  return (
    <div className="relative w-full max-w-[620px] flex flex-col items-center">
      {/* HUD overlay for PHYS_PROJECTILE */}
      {blueprint.templateId === 'PHYS_PROJECTILE' && (
        <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md border border-cyan-500/30 rounded-xl px-3 py-1.5 flex items-center gap-2.5 text-[11px] font-mono text-cyan-300 pointer-events-none shadow-lg z-10 flex-wrap">
          <div>
            <span className="text-slate-400">H_max:</span>{' '}
            <span className="text-amber-300 font-bold">{hud.hMax}m</span>
          </div>
          <div className="w-[1px] h-3 bg-white/10" />
          <div>
            <span className="text-slate-400">L_max:</span>{' '}
            <span className="text-emerald-300 font-bold">{hud.lMax}m</span>
          </div>
          <div className="w-[1px] h-3 bg-white/10" />
          <div>
            <span className="text-slate-400">T_bay:</span>{' '}
            <span className="text-cyan-200">{hud.tFlight}s</span>
          </div>
          <div className="w-[1px] h-3 bg-white/10" />
          <div>
            <span className="text-slate-400">vy:</span>{' '}
            <span className={hud.isApex ? 'text-amber-400 font-bold' : 'text-rose-400'}>
              {hud.vy} m/s {hud.isApex && '(ĐỈNH)'}
            </span>
          </div>

          {hud.hasDelta && (
            <>
              <div className="w-[1px] h-3 bg-white/20" />
              <div className="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/40 text-sky-200 font-bold">
                ΔTầm xa: {hud.deltaL >= 0 ? '+' : ''}{hud.deltaL}m
              </div>
              <div className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-200 font-bold">
                ΔH_max: {hud.deltaH >= 0 ? '+' : ''}{hud.deltaH}m
              </div>
            </>
          )}
        </div>
      )}

      {/* HUD overlay for PHYS_RLC_PHASOR */}
      {blueprint.templateId === 'PHYS_RLC_PHASOR' && (
        <div className="absolute top-3 right-3 bg-slate-900/95 backdrop-blur-md border border-amber-500/30 rounded-xl px-3 py-1.5 flex items-center gap-2.5 text-[11px] font-mono text-amber-300 pointer-events-none shadow-lg z-10 flex-wrap">
          <div>
            <span className="text-slate-400">Tổng trở Z:</span>{' '}
            <span className="text-cyan-300 font-bold">{hud.rlcZ} Ω</span>
          </div>
          <div className="w-[1px] h-3 bg-white/10" />
          <div>
            <span className="text-slate-400">Dòng I:</span>{' '}
            <span className="text-emerald-300 font-bold">{hud.rlcI} A</span>
          </div>
          <div className="w-[1px] h-3 bg-white/10" />
          <div>
            <span className="text-slate-400">cos φ:</span>{' '}
            <span className="text-amber-300 font-bold">{hud.rlcCosPhi}</span>
          </div>
          <div className="w-[1px] h-3 bg-white/10" />
          <div>
            <span className="text-slate-400">Công suất P:</span>{' '}
            <span className="text-purple-300 font-bold">{hud.rlcP} W</span>
          </div>
          {hud.rlcResonance && (
            <div className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold font-mono text-[10px] uppercase tracking-wider">
              Cộng hưởng (Resonance)
            </div>
          )}
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={620}
        height={340}
        className="rounded-2xl bg-slate-950 border border-white/10 w-full object-contain shadow-inner"
      />
    </div>
  );
};
