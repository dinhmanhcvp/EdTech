// apps/teacher-board/src/engines/ChemistryLabEngine.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { SimulationBlueprint } from '@socratic/types';

interface Props {
  blueprint: SimulationBlueprint;
  params: Record<string, number>;
}

interface BubbleParticle {
  x: number;
  y: number;
  r: number;
  vy: number;
}

export const ChemistryLabEngine: React.FC<Props> = ({ blueprint, params }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bubblesRef = useRef<BubbleParticle[]>([]);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      timeRef.current += 0.02;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (blueprint.templateId === 'CHEM_BALANCE_SCALE') {
        // Cân đĩa Bảo toàn Khối lượng
        const c1 = params.c1 ?? 1;
        const c2 = params.c2 ?? 1;
        const c3 = params.c3 ?? 2;
        const leftMass = c1 * 2 + c2 * 2;
        const rightMass = c3 * 3;
        const diff = rightMass - leftMass;
        const tiltAngle = Math.max(-0.35, Math.min(0.35, diff * 0.08));

        const cx = canvas.width / 2;
        const cy = 180;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(tiltAngle);

        // Beam
        ctx.strokeStyle = diff === 0 ? '#34d399' : '#f59e0b';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(-160, 0);
        ctx.lineTo(160, 0);
        ctx.stroke();

        // Left & Right pans
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-190, -35, 60, 35);
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(130, -35, 60, 35);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`Trái: ${leftMass}`, -160, -12);
        ctx.fillText(`Phải: ${rightMass}`, 160, -12);
        ctx.restore();

        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          diff === 0 ? '✅ Cân bằng hoàn hảo (Định luật Bảo toàn Khối lượng)' : '⚠️ Hai vế chưa cân bằng số nguyên tử!',
          cx,
          300
        );

      } else if (blueprint.templateId === 'CHEM_MOLECULE_2D3D') {
        // 3D VSEPR Ball-and-Stick Rotation
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const rotY = (params.thetaY ?? timeRef.current) * 0.8;
        const rotX = (params.thetaX ?? Math.sin(timeRef.current * 0.4) * 0.3);

        const atoms = [
          { type: 'Fe', x: -45, y: -20, z: 0, r: 18, color: '#f97316' },
          { type: 'Fe', x: 45, y: 20, z: 0, r: 18, color: '#f97316' },
          { type: 'O', x: 0, y: 0, z: 25, r: 12, color: '#ef4444' },
          { type: 'O', x: -70, y: 30, z: -20, r: 12, color: '#ef4444' },
          { type: 'O', x: 70, y: -30, z: 20, r: 12, color: '#ef4444' },
        ];

        const projected = atoms.map((a) => {
          const x1 = a.x * Math.cos(rotY) + a.z * Math.sin(rotY);
          const z1 = -a.x * Math.sin(rotY) + a.z * Math.cos(rotY);
          const y1 = a.y * Math.cos(rotX) - z1 * Math.sin(rotX);
          const z2 = a.y * Math.sin(rotX) + z1 * Math.cos(rotX);
          const scale = 250 / (250 + z2);
          return { ...a, px: cx + x1 * scale, py: cy + y1 * scale, pz: z2, pr: a.r * scale };
        });

        projected.sort((a, b) => a.pz - b.pz);

        // Bonds
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 4;
        for (let i = 0; i < projected.length; i++) {
          for (let j = i + 1; j < projected.length; j++) {
            if (Math.hypot(projected[i].px - projected[j].px, projected[i].py - projected[j].py) < 95) {
              ctx.beginPath();
              ctx.moveTo(projected[i].px, projected[i].py);
              ctx.lineTo(projected[j].px, projected[j].py);
              ctx.stroke();
            }
          }
        }

        // Atoms
        projected.forEach((a) => {
          ctx.fillStyle = a.color;
          ctx.shadowColor = a.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(a.px, a.py, a.pr, 0, Math.PI * 2);
          ctx.fill();
        });

      } else {
        // CHEM_REACTION_LAB: Ống nghiệm sủi bọt khí & kết tủa
        const concentration = params.concentration ?? params.CM ?? 1.5;
        const temperature = params.temperature ?? params.T ?? 25;
        const spawnRate = Math.min(0.95, (concentration * (temperature + 10)) / 100);

        const beakerX = 220;
        const beakerY = 60;
        const beakerW = 180;
        const beakerH = 240;

        // Solution
        const rustAlpha = Math.min(1, temperature / 60);
        ctx.fillStyle = `rgba(${Math.round(56 + rustAlpha * 140)}, ${Math.round(189 - rustAlpha * 80)}, 248, 0.25)`;
        ctx.fillRect(beakerX, beakerY + 60, beakerW, beakerH - 60);

        // Precipitate layer at bottom
        ctx.fillStyle = '#b45309';
        ctx.fillRect(beakerX + 10, beakerY + beakerH - 12, beakerW - 20, 10);

        // Gas bubbles
        if (Math.random() < spawnRate) {
          bubblesRef.current.push({
            x: beakerX + 20 + Math.random() * (beakerW - 40),
            y: beakerY + beakerH - 15,
            r: 3 + Math.random() * 5,
            vy: 1 + (temperature / 25) * 1.5,
          });
        }

        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        bubblesRef.current = bubblesRef.current.filter((b: BubbleParticle) => {
          b.y -= b.vy;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fill();
          return b.y > beakerY + 60;
        });

        // Beaker border
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 4;
        ctx.strokeRect(beakerX, beakerY, beakerW, beakerH);
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
