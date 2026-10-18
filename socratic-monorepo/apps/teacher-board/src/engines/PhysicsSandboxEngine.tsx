// apps/teacher-board/src/engines/PhysicsSandboxEngine.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { SimulationBlueprint } from '@socratic/types';

interface Props {
  blueprint: SimulationBlueprint;
  params: Record<string, number>;
}

export const PhysicsSandboxEngine: React.FC<Props> = ({ blueprint, params }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeRef = useRef<number>(0);

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
        // Default: PHYS_PROJECTILE
        const v0 = params.v0 ?? 22;
        const alpha = ((params.alpha ?? 45) * Math.PI) / 180;
        const g = params.g ?? 9.8;
        const scale = 8;
        const groundY = canvas.height - 30;
        const startX = 40;

        const tFlight = (2 * v0 * Math.sin(alpha)) / g;
        const t = timeRef.current % (tFlight + 0.5);

        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.beginPath();
        for (let stepT = 0; stepT <= tFlight; stepT += 0.05) {
          const px = startX + v0 * Math.cos(alpha) * stepT * scale;
          const py = groundY - (v0 * Math.sin(alpha) * stepT - 0.5 * g * stepT * stepT) * scale;
          stepT === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        const curT = Math.min(t, tFlight);
        const curX = startX + v0 * Math.cos(alpha) * curT * scale;
        const curY = groundY - (v0 * Math.sin(alpha) * curT - 0.5 * g * curT * curT) * scale;
        const vx = v0 * Math.cos(alpha);
        const vy = v0 * Math.sin(alpha) - g * curT;

        ctx.fillStyle = '#22d3ee';
        ctx.beginPath();
        ctx.arc(curX, curY, 10, 0, Math.PI * 2);
        ctx.fill();

        drawVector(ctx, curX, curY, curX + vx * 2, curY, '#34d399', 'vx');
        drawVector(ctx, curX, curY, curX, curY - vy * 2, '#f43f5e', 'vy');
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [blueprint, params]);

  return (
    <canvas
      ref={canvasRef}
      width={620}
      height={340}
      className="rounded-2xl bg-slate-950 border border-white/10"
    />
  );
};
