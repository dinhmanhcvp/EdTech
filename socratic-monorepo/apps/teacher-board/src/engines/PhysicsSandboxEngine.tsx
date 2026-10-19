// apps/teacher-board/src/engines/PhysicsSandboxEngine.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { SimulationBlueprint } from '@socratic/types';
import { computeProjectile, PLANETARY_GRAVITY } from '../utils/physics';

interface Props {
  blueprint: SimulationBlueprint;
  params: Record<string, number>;
}

export const PhysicsSandboxEngine: React.FC<Props> = ({ blueprint, params }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeRef = useRef<number>(0);
  const [hud, setHud] = useState({
    hMax: 0,
    lMax: 0,
    tFlight: 0,
    vx: 0,
    vy: 0,
    isApex: false,
  });

  // Helper to draw vector arrows
  const drawVector = (
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    label: string
  ) => {
    const headLen = 10;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    ctx.font = 'bold 12px monospace';
    ctx.fillText(label, x2 + 6, y2 - 4);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const renderLoop = () => {
      timeRef.current += 0.025;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (blueprint.templateId === 'PHYS_PENDULUM') {
        // Con lắc đơn: d^2(theta)/dt^2 + (b/m)*d(theta)/dt + (g/L)*sin(theta) = 0
        const L = params.L ?? 2.0;
        const g = params.g ?? 9.8;
        const theta0 = ((params.theta0 ?? 30) * Math.PI) / 180;
        const damping = params.b ?? 0.02;

        const omega = Math.sqrt(g / L);
        const theta = theta0 * Math.cos(omega * timeRef.current) * Math.exp(-damping * timeRef.current);

        const pivotX = canvas.width / 2;
        const pivotY = 40;
        const pixelL = L * 90;
        const bobX = pivotX + pixelL * Math.sin(theta);
        const bobY = pivotY + pixelL * Math.cos(theta);

        // String
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(bobX, bobY);
        ctx.stroke();

        // Bob
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(bobX, bobY, 18, 0, Math.PI * 2);
        ctx.fill();

        // Gravity P & Tension T
        drawVector(ctx, bobX, bobY, bobX, bobY + 55, '#f43f5e', 'P');
        drawVector(ctx, bobX, bobY, bobX - 45 * Math.sin(theta), bobY - 45 * Math.cos(theta), '#a855f7', 'T');

      } else if (blueprint.templateId === 'PHYS_INCLINED') {
        // Mặt phẳng nghiêng: a = g*(sin(alpha) - mu*cos(alpha))
        const alpha = ((params.alpha ?? 30) * Math.PI) / 180;
        const mu = params.mu ?? 0.15;
        const m = params.m ?? 2;
        const g = params.g ?? 9.8;

        const originX = 80;
        const originY = 280;
        const rampLen = 420;
        const topX = originX + rampLen * Math.cos(alpha);
        const topY = originY - rampLen * Math.sin(alpha);

        // Ramp triangle
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

        // Block sliding down
        const a = Math.max(0, g * (Math.sin(alpha) - mu * Math.cos(alpha)));
        const sDist = (0.5 * a * Math.pow(timeRef.current % 4, 2) * 15) % rampLen;
        const blockX = topX - sDist * Math.cos(alpha);
        const blockY = topY + sDist * Math.sin(alpha);

        ctx.save();
        ctx.translate(blockX, blockY);
        ctx.rotate(-alpha);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-20, -25, 40, 25);

        // Forces
        drawVector(ctx, 0, 0, 0, 50, '#f43f5e', 'P');
        drawVector(ctx, 0, 0, 0, -40, '#22c55e', 'N');
        drawVector(ctx, 0, 0, 35, 0, '#f59e0b', 'F_ms');
        ctx.restore();

      } else if (blueprint.templateId === 'PHYS_OPTICS_LENS') {
        // Quang hình học Thấu kính: 1/f = 1/d + 1/d' => d' = (d*f)/(d - f)
        const f = params.f ?? 100;
        const d = params.d ?? 220;
        const h = params.h ?? 50;

        const lensX = canvas.width / 2;
        const axisY = canvas.height / 2;

        // Optical axis
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(20, axisY); ctx.lineTo(canvas.width - 20, axisY); ctx.stroke();

        // Thin lens (converging / diverging)
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(lensX, axisY - 120); ctx.lineTo(lensX, axisY + 120); ctx.stroke();

        // Focal points F & F'
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath(); ctx.arc(lensX - f, axisY, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillText('F', lensX - f - 5, axisY + 18);
        ctx.beginPath(); ctx.arc(lensX + f, axisY, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillText("F'", lensX + f - 5, axisY + 18);

        // Object Arrow
        const objX = lensX - d;
        drawVector(ctx, objX, axisY, objX, axisY - h, '#38bdf8', 'AB');

        // Image calculations
        if (Math.abs(d - f) > 5) {
          const dPrime = (d * f) / (d - f);
          const hPrime = - (dPrime / d) * h;
          const imgX = lensX + dPrime;
          const imgY = axisY - hPrime;

          // Light rays
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.6)';
          ctx.lineWidth = 1.5;
          // Ray 1: Parallel to axis, passes through F'
          ctx.beginPath();
          ctx.moveTo(objX, axisY - h);
          ctx.lineTo(lensX, axisY - h);
          ctx.lineTo(imgX, imgY);
          ctx.stroke();

          // Ray 2: Passes through center O without deflection
          ctx.beginPath();
          ctx.moveTo(objX, axisY - h);
          ctx.lineTo(lensX, axisY);
          ctx.lineTo(imgX, imgY);
          ctx.stroke();

          // Image Arrow
          drawVector(ctx, imgX, axisY, imgX, imgY, '#ec4899', "A'B'");
        }

      } else {
        // PHYS_PROJECTILE: Deterministic Real Physics Engine
        const v0 = params.v0 ?? 22;
        const alpha = params.alpha ?? 45;
        const g = params.g ?? 9.8;

        const metrics = computeProjectile(v0, alpha, g);
        const { tFlight, tApex, hMax, lMax, vx } = metrics;

        // Auto-scale canvas bounds to prevent overflow for any v0 (even 50+) or odd alpha (37°)
        const groundY = canvas.height - 35;
        const startX = 45;
        const availW = canvas.width - startX - 35;
        const availH = groundY - 45;

        const maxRangeNeeded = Math.max(lMax, 15);
        const maxHeightNeeded = Math.max(hMax, 8);
        const scaleX = availW / maxRangeNeeded;
        const scaleY = availH / maxHeightNeeded;
        const scale = Math.min(scaleX, scaleY);

        // Ground line with distance ticks
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(20, groundY);
        ctx.lineTo(canvas.width - 20, groundY);
        ctx.stroke();

        // Earth reference ghost trajectory when g != 9.8 (proves gravity change impact)
        if (Math.abs(g - 9.8) > 0.1) {
          const earthMetrics = computeProjectile(v0, alpha, 9.8);
          ctx.save();
          ctx.setLineDash([3, 4]);
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
          ctx.beginPath();
          const eSteps = 40;
          for (let i = 0; i <= eSteps; i++) {
            const st = (earthMetrics.tFlight * i) / eSteps;
            const px = startX + earthMetrics.xAt(st) * scale;
            const py = groundY - earthMetrics.yAt(st) * scale;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
          ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
          ctx.font = '10px monospace';
          const eLpx = startX + earthMetrics.lMax * scale;
          if (eLpx < canvas.width - 40) {
            ctx.fillText(`T.Đất (g=9.8): ${earthMetrics.lMax.toFixed(1)}m`, eLpx - 30, groundY + 18);
          }
          ctx.restore();
        }

        // Active Trajectory Parabola
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const steps = 60;
        for (let i = 0; i <= steps; i++) {
          const st = (tFlight * i) / steps;
          const px = startX + metrics.xAt(st) * scale;
          const py = groundY - metrics.yAt(st) * scale;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Apex marker (H_max, vy = 0)
        const apexX = startX + metrics.xAt(tApex) * scale;
        const apexY = groundY - hMax * scale;
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(apexX, apexY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`H_max = ${hMax.toFixed(1)}m (vy=0)`, apexX - 45, apexY - 8);

        // Landing marker (L_max)
        const landX = startX + lMax * scale;
        ctx.fillStyle = '#34d399';
        ctx.beginPath();
        ctx.arc(landX, groundY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`L = ${lMax.toFixed(1)}m`, landX - 25, groundY + 18);

        // Projectile ball movement
        const t = timeRef.current % (tFlight + 0.6);
        const curT = Math.min(t, tFlight);
        const curX = startX + metrics.xAt(curT) * scale;
        const curY = groundY - metrics.yAt(curT) * scale;
        const curVy = metrics.vyAt(curT);
        const nearApex = Math.abs(curVy) < 1.0;

        // Ball with glow
        ctx.save();
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#22d3ee';
        ctx.beginPath();
        ctx.arc(curX, curY, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Vectors vx and vy
        const vScale = 1.8;
        drawVector(ctx, curX, curY, curX + vx * vScale, curY, '#34d399', 'vx');
        if (Math.abs(curVy) > 0.5) {
          drawVector(ctx, curX, curY, curX, curY - curVy * vScale, '#f43f5e', 'vy');
        } else {
          // At apex: highlight vy = 0
          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 11px monospace';
          ctx.fillText('vy = 0 m/s', curX + 12, curY - 14);
        }

        // Update HUD state every 4 frames
        if (Math.floor(timeRef.current * 40) % 4 === 0) {
          setHud({
            hMax: Number(hMax.toFixed(1)),
            lMax: Number(lMax.toFixed(1)),
            tFlight: Number(tFlight.toFixed(2)),
            vx: Number(vx.toFixed(1)),
            vy: Number(curVy.toFixed(1)),
            isApex: nearApex,
          });
        }
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [blueprint, params]);

  return (
    <div className="relative w-full max-w-[620px] flex flex-col items-center">
      {/* HUD overlay for PHYS_PROJECTILE */}
      {blueprint.templateId === 'PHYS_PROJECTILE' && (
        <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md border border-cyan-500/30 rounded-xl px-3 py-1.5 flex items-center gap-3 text-[11px] font-mono text-cyan-300 pointer-events-none shadow-lg z-10">
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
