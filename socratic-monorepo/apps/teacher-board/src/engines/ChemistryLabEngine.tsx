// apps/teacher-board/src/engines/ChemistryLabEngine.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { SimulationBlueprint, CurriculumLevel } from '@socratic/types';

interface Props {
  blueprint: SimulationBlueprint;
  params: Record<string, number>;
  curriculumLevel?: CurriculumLevel;
}

interface BubbleParticle {
  x: number;
  y: number;
  r: number;
  vy: number;
}

export const ChemistryLabEngine: React.FC<Props> = ({
  blueprint,
  params,
  curriculumLevel = blueprint.curriculumLevel ?? 'THPT_STANDARD',
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bubblesRef = useRef<BubbleParticle[]>([]);
  const timeRef = useRef<number>(0);

  const isOlympiad = curriculumLevel === 'OLYMPIAD_ADVANCED';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      timeRef.current += 0.02;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Daylight Technical Graph Paper Background
      ctx.fillStyle = '#FCFBF9';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Fine millimeter grid
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

      // ==============================================================
      // 1. CHEM_EQUILIBRIUM_TITRATION: Chuẩn độ Axit - Bazơ & Đường cong pH
      // ==============================================================
      if (blueprint.templateId === 'CHEM_EQUILIBRIUM_TITRATION') {
        const Va = 25.0; // mL of 0.1M HCl
        const Ca = 0.1; // M
        const Cb = 0.1; // M
        const Vb = Math.max(0, Math.min(50, params.Vb ?? 20.0)); // mL NaOH added
        const Veq = (Ca * Va) / Cb; // 25 mL

        // Calculate pH
        let pH = 7.0;
        if (Vb < Veq - 0.05) {
          const remH = (Ca * Va - Cb * Vb) / (Va + Vb);
          pH = -Math.log10(Math.max(1e-7, remH));
        } else if (Vb > Veq + 0.05) {
          const remOH = (Cb * Vb - Ca * Va) / (Va + Vb);
          const pOH = -Math.log10(Math.max(1e-7, remOH));
          pH = 14.0 - pOH;
        } else {
          pH = 7.0;
        }
        pH = Math.max(1.0, Math.min(13.0, pH));

        // Indicator color (Phenolphthalein)
        let solColor = 'rgba(241, 245, 249, 0.5)'; // colorless acidic
        let indicatorName = 'Chưa đổi màu (Không màu)';
        if (pH >= 8.2 && pH <= 10.0) {
          const alpha = (pH - 8.2) / 1.8;
          solColor = `rgba(244, 63, 94, ${0.2 + alpha * 0.4})`;
          indicatorName = 'Hồng nhạt (Khoảng chuyển màu)';
        } else if (pH > 10.0) {
          solColor = 'rgba(225, 29, 72, 0.75)';
          indicatorName = 'Hồng tím đậm (Dư bazơ)';
        }

        // DUAL VIEW: Left = Titration Apparatus, Right = pH Curve
        // -------------------------------------------------------------
        // Divider
        ctx.strokeStyle = '#E6E4DD';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(270, 10);
        ctx.lineTo(270, canvas.height - 10);
        ctx.stroke();

        // Left Apparatus: Burette + Erlenmeyer Conical Flask
        const bX = 135;
        const bY = 25;
        const bW = 18;
        const bH = 150;

        // Burette Tube
        ctx.strokeStyle = '#78716C';
        ctx.lineWidth = 2;
        ctx.strokeRect(bX, bY, bW, bH);

        // Burette Liquid (dropping as Vb increases)
        const liquidH = Math.max(5, (1 - Vb / 50) * bH);
        ctx.fillStyle = 'rgba(37, 99, 235, 0.25)';
        ctx.fillRect(bX + 2, bY + (bH - liquidH), bW - 4, liquidH);

        // Burette Tip & Stopcock
        ctx.beginPath();
        ctx.moveTo(bX + bW / 2, bY + bH);
        ctx.lineTo(bX + bW / 2, bY + bH + 25);
        ctx.stroke();

        // Droplet animation
        const dropPhase = (timeRef.current * 2) % 1;
        const dropY = bY + bH + 25 + dropPhase * 30;
        ctx.fillStyle = '#2563EB';
        ctx.beginPath();
        ctx.arc(bX + bW / 2, dropY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Conical Flask below burette
        const flaskTopX = bX + bW / 2;
        const flaskTopY = bY + bH + 60;
        const flaskW = 100;
        const flaskH = 75;

        ctx.beginPath();
        ctx.moveTo(flaskTopX - 15, flaskTopY);
        ctx.lineTo(flaskTopX - 15, flaskTopY + 15);
        ctx.lineTo(flaskTopX - flaskW / 2, flaskTopY + flaskH);
        ctx.lineTo(flaskTopX + flaskW / 2, flaskTopY + flaskH);
        ctx.lineTo(flaskTopX + 15, flaskTopY + 15);
        ctx.lineTo(flaskTopX + 15, flaskTopY);
        ctx.closePath();
        ctx.strokeStyle = '#78716C';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Solution inside flask with dynamic indicator color
        ctx.fillStyle = solColor;
        ctx.beginPath();
        ctx.moveTo(flaskTopX - 25, flaskTopY + 30);
        ctx.lineTo(flaskTopX - flaskW / 2 + 5, flaskTopY + flaskH - 3);
        ctx.lineTo(flaskTopX + flaskW / 2 - 5, flaskTopY + flaskH - 3);
        ctx.lineTo(flaskTopX + 25, flaskTopY + 30);
        ctx.closePath();
        ctx.fill();

        // Flask labels
        ctx.fillStyle = '#18181B';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('Buret: NaOH 0.1M', 18, 30);
        ctx.fillStyle = '#57534E';
        ctx.fillText(`V_thêm: ${Vb.toFixed(1)} mL`, 18, 45);
        ctx.font = '10px monospace';
        ctx.fillStyle = pH >= 8.2 ? '#E11D48' : '#78716C';
        ctx.fillText(`Chỉ thị: ${indicatorName}`, 18, canvas.height - 15);

        // -------------------------------------------------------------
        // Right Panel: Analytical Acid-Base Titration Curve (pH vs Vb)
        const pLeft = 295;
        const pRight = 595;
        const pTop = 45;
        const pBottom = canvas.height - 35;
        const pW = pRight - pLeft;
        const pH_H = pBottom - pTop;

        // Header
        ctx.fillStyle = '#2563EB';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('ĐƯỜNG CONG CHUẨN ĐỘ AXIT - BAZƠ', pLeft, 24);

        // Axes (0 to 50 mL on X, 0 to 14 on Y)
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pLeft, pBottom);
        ctx.lineTo(pRight, pBottom);
        ctx.moveTo(pLeft, pTop);
        ctx.lineTo(pLeft, pBottom);
        ctx.stroke();

        ctx.fillStyle = '#57534E';
        ctx.font = '10px monospace';
        ctx.fillText('V_NaOH (mL)', pRight - 65, pBottom + 20);
        ctx.fillText('pH', pLeft + 6, pTop - 6);

        // Reference lines: pH = 7 (Equivalence)
        const y7 = pBottom - (7 / 14) * pH_H;
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = '#CBD5E1';
        ctx.beginPath();
        ctx.moveTo(pLeft, y7);
        ctx.lineTo(pRight, y7);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#78716C';
        ctx.fillText('pH=7', pLeft + 5, y7 - 4);

        // Plot Titration Curve in Cobalt Blue
        ctx.strokeStyle = '#2563EB';
        ctx.lineWidth = 2.75;
        ctx.beginPath();
        let firstPt = true;

        for (let v = 0; v <= 50; v += 0.5) {
          let phVal = 7.0;
          if (v < Veq - 0.05) {
            const h = (Ca * Va - Cb * v) / (Va + v);
            phVal = -Math.log10(Math.max(1e-7, h));
          } else if (v > Veq + 0.05) {
            const oh = (Cb * v - Ca * Va) / (Va + v);
            phVal = 14.0 - (-Math.log10(Math.max(1e-7, oh)));
          } else {
            phVal = 7.0;
          }
          phVal = Math.max(1.0, Math.min(13.0, phVal));

          const px = pLeft + (v / 50) * pW;
          const py = pBottom - (phVal / 14) * pH_H;
          if (firstPt) {
            ctx.moveTo(px, py);
            firstPt = false;
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.stroke();

        // Equivalence Point Marker (Veq = 25mL, pH = 7)
        const xEq = pLeft + (Veq / 50) * pW;
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = '#D97706';
        ctx.beginPath();
        ctx.moveTo(xEq, pTop);
        ctx.lineTo(xEq, pBottom);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#D97706';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('Điểm TĐ (V=25, pH=7)', xEq - 55, pTop + 14);

        // Current point marker - Tactile Porcelain
        const curPx = pLeft + (Vb / 50) * pW;
        const curPy = pBottom - (pH / 14) * pH_H;
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = pH >= 8.2 ? '#E11D48' : '#2563EB';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(curPx, curPy, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Telemetry readout
        ctx.fillStyle = '#18181B';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`pH hiện tại: ${pH.toFixed(2)}`, pLeft + 15, canvas.height - 15);

      // ==============================================================
      // 2. CHEM_BALANCE_SCALE: Cân đĩa Bảo toàn Khối lượng
      // ==============================================================
      } else if (blueprint.templateId === 'CHEM_BALANCE_SCALE') {
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

        ctx.strokeStyle = diff === 0 ? '#059669' : '#D97706';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-160, 0);
        ctx.lineTo(160, 0);
        ctx.stroke();

        ctx.fillStyle = '#2563EB';
        ctx.fillRect(-190, -35, 60, 35);
        ctx.fillStyle = '#E11D48';
        ctx.fillRect(130, -35, 60, 35);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`Trái: ${leftMass}`, -160, -12);
        ctx.fillText(`Phải: ${rightMass}`, 160, -12);
        ctx.restore();

        ctx.fillStyle = diff === 0 ? '#059669' : '#D97706';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          diff === 0 ? '[Bảo toàn] Cân bằng hoàn hảo (Định luật Bảo toàn Khối lượng)' : '[Chưa cân bằng] Hai vế chưa cân bằng số nguyên tử!',
          cx,
          300
        );
        ctx.textAlign = 'start';

      // ==============================================================
      // 3. CHEM_MOLECULE_2D3D: 3D VSEPR Ball-and-Stick Rotation
      // ==============================================================
      } else if (blueprint.templateId === 'CHEM_MOLECULE_2D3D') {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const rotY = (params.thetaY ?? timeRef.current) * 0.8;
        const rotX = (params.thetaX ?? Math.sin(timeRef.current * 0.4) * 0.3);

        const atoms = [
          { type: 'Fe', x: -45, y: -20, z: 0, r: 18, color: '#D97706' },
          { type: 'Fe', x: 45, y: 20, z: 0, r: 18, color: '#D97706' },
          { type: 'O', x: 0, y: 0, z: 25, r: 12, color: '#E11D48' },
          { type: 'O', x: -70, y: 30, z: -20, r: 12, color: '#E11D48' },
          { type: 'O', x: 70, y: -30, z: 20, r: 12, color: '#E11D48' },
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

        ctx.strokeStyle = '#CBD5E1';
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

        projected.forEach((a) => {
          ctx.fillStyle = a.color;
          ctx.beginPath();
          ctx.arc(a.px, a.py, a.pr, 0, Math.PI * 2);
          ctx.fill();
        });

      // ==============================================================
      // 4. CHEM_REACTION_LAB: Ống nghiệm + Arrhenius Energy Diagram (Olympiad)
      // ==============================================================
      } else {
        const concentration = params.concentration ?? params.CM ?? 1.5;
        const temperature = params.temperature ?? params.T ?? 25;
        const hasCatalyst = isOlympiad ? (params.catalyst ?? 1) > 0 : false;
        const spawnRate = Math.min(0.95, (concentration * (temperature + 10)) / 100);

        if (isOlympiad) {
          // DUAL VIEW: Left Beaker, Right Arrhenius Activation Energy Profile
          const bkrX = 65;
          const bkrY = 60;
          const bkrW = 140;
          const bkrH = 200;

          // Solution
          const rustAlpha = Math.min(1, temperature / 60);
          ctx.fillStyle = `rgba(${Math.round(37 + rustAlpha * 140)}, ${Math.round(99 - rustAlpha * 50)}, 235, 0.2)`;
          ctx.fillRect(bkrX, bkrY + 50, bkrW, bkrH - 50);

          // Precipitate
          ctx.fillStyle = '#b45309';
          ctx.fillRect(bkrX + 8, bkrY + bkrH - 10, bkrW - 16, 10);

          // Bubbles
          if (Math.random() < spawnRate) {
            bubblesRef.current.push({
              x: bkrX + 15 + Math.random() * (bkrW - 30),
              y: bkrY + bkrH - 12,
              r: 2.5 + Math.random() * 4,
              vy: 1 + (temperature / 25) * 1.5,
            });
          }

          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          bubblesRef.current = bubblesRef.current.filter((b) => {
            b.y -= b.vy;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();
            return b.y > bkrY + 50;
          });

          ctx.strokeStyle = '#78716C';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(bkrX, bkrY, bkrW, bkrH);

          // Right View: Arrhenius Potential Energy Diagram
          const eLeft = 280;
          const eRight = 590;
          const eTop = 50;
          const eBottom = canvas.height - 40;
          const eW = eRight - eLeft;
          const eH = eBottom - eTop;

          ctx.fillStyle = '#D97706';
          ctx.font = 'bold 12px monospace';
          ctx.fillText('GIẢN ĐỒ NĂNG LƯỢNG HOẠT HÓA (ARRHENIUS)', eLeft, 24);

          // Potential Energy Curve: Reactants -> Barrier Ea -> Products
          const rLevel = eBottom - 0.45 * eH;
          const pLevel = eBottom - 0.25 * eH; // Exothermic ΔH < 0
          const eaUncatPeak = eTop + 0.15 * eH;
          const eaCatPeak = eTop + 0.38 * eH; // Lowered by catalyst

          // Curve 1: Uncatalyzed (solid vermilion rose)
          ctx.strokeStyle = '#E11D48';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(eLeft + 15, rLevel);
          ctx.bezierCurveTo(eLeft + 50, rLevel, eLeft + 80, eaUncatPeak, eLeft + 150, eaUncatPeak);
          ctx.bezierCurveTo(eLeft + 220, eaUncatPeak, eLeft + 250, pLevel, eRight - 15, pLevel);
          ctx.stroke();

          // Curve 2: Catalyzed (dashed emerald)
          ctx.save();
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = '#059669';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(eLeft + 15, rLevel);
          ctx.bezierCurveTo(eLeft + 50, rLevel, eLeft + 80, eaCatPeak, eLeft + 150, eaCatPeak);
          ctx.bezierCurveTo(eLeft + 220, eaCatPeak, eLeft + 250, pLevel, eRight - 15, pLevel);
          ctx.stroke();
          ctx.restore();

          // Labels
          ctx.fillStyle = '#E11D48';
          ctx.font = '10px monospace';
          ctx.fillText('E_a (Không xúc tác)', eLeft + 80, eaUncatPeak - 8);

          ctx.fillStyle = '#059669';
          ctx.fillText('E_a (Có xúc tác - Giảm rào cản)', eLeft + 70, eaCatPeak + 18);

          ctx.fillStyle = '#57534E';
          ctx.fillText('Chất phản ứng', eLeft + 15, rLevel + 16);
          ctx.fillText('Sản phẩm (ΔH < 0)', eRight - 105, pLevel + 16);

        } else {
          // Standard Single View Beaker
          const beakerX = 220;
          const beakerY = 60;
          const beakerW = 180;
          const beakerH = 240;

          const rustAlpha = Math.min(1, temperature / 60);
          ctx.fillStyle = `rgba(${Math.round(37 + rustAlpha * 140)}, ${Math.round(99 - rustAlpha * 50)}, 235, 0.2)`;
          ctx.fillRect(beakerX, beakerY + 60, beakerW, beakerH - 60);

          ctx.fillStyle = '#b45309';
          ctx.fillRect(beakerX + 10, beakerY + beakerH - 12, beakerW - 20, 10);

          if (Math.random() < spawnRate) {
            bubblesRef.current.push({
              x: beakerX + 20 + Math.random() * (beakerW - 40),
              y: beakerY + beakerH - 15,
              r: 3 + Math.random() * 5,
              vy: 1 + (temperature / 25) * 1.5,
            });
          }

          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          bubblesRef.current = bubblesRef.current.filter((b) => {
            b.y -= b.vy;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();
            return b.y > beakerY + 60;
          });

          ctx.strokeStyle = '#78716C';
          ctx.lineWidth = 3;
          ctx.strokeRect(beakerX, beakerY, beakerW, beakerH);
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
      className="rounded-2xl bg-[#FCFBF9] border border-[#E6E4DD] shadow-[0_4px_24px_-4px_rgba(20,20,19,0.06)] w-full object-contain"
    />
  );
};
