// apps/teacher-board/src/engines/BioSystemEngine.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { SimulationBlueprint, CurriculumLevel } from '@socratic/types';

interface Props {
  blueprint: SimulationBlueprint;
  params: Record<string, number>;
  curriculumLevel?: CurriculumLevel;
}

export const BioSystemEngine: React.FC<Props> = ({
  blueprint,
  params,
  curriculumLevel = blueprint.curriculumLevel ?? 'THPT_STANDARD',
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tickRef = useRef<number>(0);

  const isOlympiad = curriculumLevel === 'OLYMPIAD_ADVANCED';

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

        const cx = 170;
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
        const ecgX = 310;
        const ecgY = 160;
        const ecgW = 270;
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let x = 0; x < ecgW; x += 3) {
          const tRel = ((x / ecgW) * 2 + tickRef.current) % 1;
          let yOffset = 0;
          if (tRel > 0.35 && tRel < 0.4) yOffset = -15; // P wave
          else if (tRel >= 0.4 && tRel < 0.42) yOffset = 10; // Q
          else if (tRel >= 0.42 && tRel < 0.46) yOffset = -55; // R spike
          else if (tRel >= 0.46 && tRel < 0.48) yOffset = 18; // S
          else if (tRel >= 0.55 && tRel < 0.65) yOffset = -22; // T wave
          const py = ecgY + yOffset;
          x === 0 ? ctx.moveTo(ecgX + x, py) : ctx.lineTo(ecgX + x, py);
        }
        ctx.stroke();

        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(`Nhịp tim: ${bpm} BPM`, 20, 30);
        ctx.font = '11px monospace';
        ctx.fillText('Đang đập theo nhịp tâm thu/tâm trương', 310, 240);

      } else {
        // BIO_PHOTOSYNTHESIS & HARDY-WEINBERG EVOLUTION SIMULATION
        const temp = params.temperature ?? params.T ?? 25;
        const light = params.light ?? params.I ?? 70;
        const pAllel = params.p ?? 0.6; // Allele A frequency
        const selCoeff = params.s ?? (isOlympiad ? 0.25 : 0.0); // Selection pressure against aa

        if (isOlympiad) {
          // OLYMPIAD VIEW: Hardy-Weinberg Allele Dynamics Under Selection
          // Left: Organism Population Circle Sample
          // Right: 50 Generations Analytical Trajectory
          const divX = 260;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(divX, 10);
          ctx.lineTo(divX, canvas.height - 10);
          ctx.stroke();

          // Left Header
          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 12px monospace';
          ctx.fillText('QUẦN THỂ SINH VẬT', 16, 25);

          // Calculate current p, q and genotype frequencies
          const qAllel = 1 - pAllel;
          const p2 = pAllel * pAllel;
          const twoPq = 2 * pAllel * qAllel;
          const q2 = qAllel * qAllel;

          // Draw grid of organisms
          const startX = 30;
          const startY = 55;
          let count = 0;
          for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 6; col++) {
              count++;
              const isDominant = (count / 30) <= (p2 + twoPq);
              const ox = startX + col * 35;
              const oy = startY + row * 38;

              ctx.fillStyle = isDominant ? '#10b981' : '#f43f5e';
              ctx.beginPath();
              ctx.arc(ox, oy, 11, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          ctx.fillStyle = '#cbd5e1';
          ctx.font = '10px monospace';
          ctx.fillText(`Alen A (p): ${pAllel.toFixed(2)} | Alen a (q): ${qAllel.toFixed(2)}`, 16, canvas.height - 40);
          ctx.fillText(`AA: ${p2.toFixed(2)} | Aa: ${twoPq.toFixed(2)} | aa: ${q2.toFixed(2)}`, 16, canvas.height - 22);

          // Right Panel: 50 Generation Analytical Trajectory Graph
          const gLeft = 285;
          const gRight = 595;
          const gTop = 45;
          const gBottom = canvas.height - 35;
          const gW = gRight - gLeft;
          const gH = gBottom - gTop;

          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 12px monospace';
          ctx.fillText('DI TRUYỀN QUẦN THỂ QUA 50 THẾ HỆ', gLeft, 25);

          // Axes
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(gLeft, gBottom);
          ctx.lineTo(gRight, gBottom);
          ctx.moveTo(gLeft, gTop);
          ctx.lineTo(gLeft, gBottom);
          ctx.stroke();

          ctx.fillStyle = '#94a3b8';
          ctx.font = '10px monospace';
          ctx.fillText('Thế hệ t', gRight - 45, gBottom + 20);
          ctx.fillText('Tần số', gLeft + 6, gTop - 6);

          // Simulate generations: p_{t+1} = (p_t^2 + p_t q_t (1-s)) / (1 - s q_t^2)
          let currP = pAllel;
          const pHistory: number[] = [currP];
          for (let gen = 1; gen <= 50; gen++) {
            const currQ = 1 - currP;
            const num = currP * currP + currP * currQ * (1 - selCoeff);
            const den = 1 - selCoeff * currQ * currQ;
            currP = Math.max(0, Math.min(1, num / Math.max(0.001, den)));
            pHistory.push(currP);
          }

          // Draw p(t) trajectory curve (emerald)
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          pHistory.forEach((val, gen) => {
            const gx = gLeft + (gen / 50) * gW;
            const gy = gBottom - val * gH;
            if (gen === 0) ctx.moveTo(gx, gy);
            else ctx.lineTo(gx, gy);
          });
          ctx.stroke();

          // Draw q(t) trajectory curve (rose dashed)
          ctx.save();
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 2;
          ctx.beginPath();
          pHistory.forEach((val, gen) => {
            const gx = gLeft + (gen / 50) * gW;
            const gy = gBottom - (1 - val) * gH;
            if (gen === 0) ctx.moveTo(gx, gy);
            else ctx.lineTo(gx, gy);
          });
          ctx.stroke();
          ctx.restore();

          // Legend
          ctx.fillStyle = '#10b981';
          ctx.font = 'bold 10px monospace';
          ctx.fillText('— Tần số p (Alen A)', gLeft + 20, gTop + 16);
          ctx.fillStyle = '#f43f5e';
          ctx.fillText('--- Tần số q (Alen a)', gLeft + 160, gTop + 16);

        } else {
          // Standard Single View: Photosynthesis Leaf & Stomata
          const tempFactor = Math.max(0, 1 - Math.pow((temp - 30) / 22, 2));
          const photosynthesisRate = Math.round(tempFactor * (light / 100) * 100);
          const stomataAperture = Math.max(2, tempFactor * 28);
          const wiltAngle = temp > 40 ? ((temp - 40) / 20) * 0.6 : 0;

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
          const scX = 430;
          const scY = 170;

          ctx.fillStyle = '#166534';
          ctx.beginPath();
          ctx.ellipse(scX - stomataAperture / 2, scY, 18, 38, -0.15, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.ellipse(scX + stomataAperture / 2, scY, 18, 38, 0.15, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#022c22';
          ctx.beginPath();
          ctx.ellipse(scX, scY, stomataAperture / 2, 26, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#e2e8f0';
          ctx.font = 'bold 15px monospace';
          ctx.fillText(`Cường độ quang hợp: ${photosynthesisRate}%`, 40, 40);
          ctx.font = '12px sans-serif';
          ctx.fillText(`Khí khổng: ${temp > 45 ? 'Đóng chặt chống mất nước' : 'Đang mở trao đổi khí'}`, 330, 250);
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [blueprint, params, curriculumLevel]);

  return (
    <canvas
      ref={canvasRef}
      width={620}
      height={340}
      className="rounded-2xl bg-slate-950 border border-white/10 w-full object-contain"
    />
  );
};
