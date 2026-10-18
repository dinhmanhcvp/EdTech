// apps/teacher-board/src/engines/BioSystemEngine.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { SimulationBlueprint } from '@socratic/types';

interface Props {
  blueprint: SimulationBlueprint;
  params: Record<string, number>;
}

export const BioSystemEngine: React.FC<Props> = ({ blueprint, params }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tickRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      tickRef.current += 0.04;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (blueprint.templateId === 'BIO_HEART_CYCLE') {
        // Chu kỳ nhịp tim ECG: S(t) = 1 + A_sys * exp(-k*(t % (60/BPM))^2)
        const bpm = params.BPM ?? 75;
        const period = 60 / bpm;
        const phase = (tickRef.current % period) / period;
        const contraction = Math.exp(-Math.pow((phase - 0.2) * 8, 2)) * 0.35;
        const scaleFactor = 1 + contraction;

        const cx = 200;
        const cy = 160;

        // Draw Anatomical Heart 3D pulse
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scaleFactor, scaleFactor);

        // Heart shape
        ctx.fillStyle = '#f43f5e';
        ctx.shadowColor = '#e11d48';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.moveTo(0, 30);
        ctx.bezierCurveTo(-50, -30, -90, 40, 0, 95);
        ctx.bezierCurveTo(90, 40, 50, -30, 0, 30);
        ctx.fill();
        ctx.restore();

        // Draw live ECG graph on the right
        const ecgX = 340;
        const ecgY = 160;
        const ecgW = 240;
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let x = 0; x < ecgW; x += 3) {
          const tRel = ((x / ecgW) * 2 + tickRef.current) % 1;
          let yOffset = 0;
          if (tRel > 0.35 && tRel < 0.40) yOffset = -15; // P wave
          else if (tRel >= 0.40 && tRel < 0.42) yOffset = 10; // Q
          else if (tRel >= 0.42 && tRel < 0.46) yOffset = -55; // R spike
          else if (tRel >= 0.46 && tRel < 0.48) yOffset = 18; // S
          else if (tRel >= 0.55 && tRel < 0.65) yOffset = -22; // T wave
          const py = ecgY + yOffset;
          x === 0 ? ctx.moveTo(ecgX + x, py) : ctx.lineTo(ecgX + x, py);
        }
        ctx.stroke();

        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 15px monospace';
        ctx.fillText(`Nhịp tim: ${bpm} BPM`, 40, 40);
        ctx.fillText('Đang đập theo nhịp tâm thu/tâm trương', 340, 240);

      } else {
        // BIO_PHOTOSYNTHESIS: Quang hợp & Khí khổng đóng lại ở nhiệt độ cao
        const temp = params.temperature ?? params.T ?? 25;
        const light = params.light ?? params.I ?? 70;

        const tempFactor = Math.max(0, 1 - Math.pow((temp - 30) / 22, 2));
        const photosynthesisRate = Math.round(tempFactor * (light / 100) * 100);
        const stomataAperture = Math.max(2, tempFactor * 28);
        const wiltAngle = temp > 40 ? ((temp - 40) / 20) * 0.6 : 0;

        // Leaf with dynamic wilting angle
        ctx.save();
        ctx.translate(180, 180);
        ctx.rotate(wiltAngle);

        const greenChannel = Math.round(197 - Math.max(0, temp - 35) * 4);
        ctx.fillStyle = `rgb(${temp > 38 ? 210 : 34}, ${greenChannel}, 94)`;
        ctx.beginPath();
        ctx.ellipse(0, 0, 110, 55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Stomata guard cells
        const stomaX = 460;
        const stomaY = 160;
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.ellipse(stomaX, stomaY, 45, stomataAperture + 10, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 15px monospace';
        ctx.fillText(`Cường độ Quang hợp: ${photosynthesisRate}%`, 40, 40);
        ctx.fillText(
          `Trạng thái Khí khổng: ${stomataAperture < 8 ? 'ĐÓNG (Chống mất nước)' : 'MỞ TRAO ĐỔI KHÍ'}`,
          320,
          290
        );
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
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
