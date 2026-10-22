// apps/teacher-board/src/engines/BioSystemEngine.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { SimulationBlueprint, CurriculumLevel } from '@socratic/types';
import { Dna, Leaf, Heart, GitBranch, Rotate3d } from 'lucide-react';

interface Props {
  blueprint: SimulationBlueprint;
  params: Record<string, number>;
  curriculumLevel?: CurriculumLevel;
}

interface GasParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'CO2' | 'O2' | 'H2O';
  opacity: number;
}

type BioMode = 'AUTO' | 'DNA_HELIX' | 'LEAF_ANATOMY' | 'HEART_WIGGERS' | 'POPULATION_GENETICS';

// Color palette for DNA Nucleotides
const BASE_COLORS = {
  A: { bg: '#0284C7', text: '#FFFFFF', name: 'Adenine (A)' },
  T: { bg: '#E11D48', text: '#FFFFFF', name: 'Thymine (T)' },
  G: { bg: '#D97706', text: '#FFFFFF', name: 'Guanine (G)' },
  C: { bg: '#059669', text: '#FFFFFF', name: 'Cytosine (C)' },
};

export const BioSystemEngine: React.FC<Props> = ({
  blueprint,
  params,
  curriculumLevel = blueprint.curriculumLevel ?? 'THPT_STANDARD',
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tickRef = useRef<number>(0);
  const particlesRef = useRef<GasParticle[]>([]);

  // 3D Orbit Controls for DNA
  const [rotX, setRotX] = useState<number>(0.2);
  const [rotY, setRotY] = useState<number>(0.0);
  const isDraggingRef = useRef<boolean>(false);
  const lastMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // View Mode
  const [activeMode, setActiveMode] = useState<BioMode>('AUTO');

  const isOlympiad = curriculumLevel === 'OLYMPIAD_ADVANCED';

  // Initialize gas diffusion particles for leaf anatomy
  useEffect(() => {
    const list: GasParticle[] = [];
    for (let i = 0; i < 35; i++) {
      list.push({
        x: 40 + Math.random() * 220,
        y: 120 + Math.random() * 140,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        type: Math.random() > 0.5 ? 'CO2' : Math.random() > 0.5 ? 'O2' : 'H2O',
        opacity: 0.3 + Math.random() * 0.6,
      });
    }
    particlesRef.current = list;
  }, []);

  // Determine current active mode
  const currentMode = React.useMemo<BioMode>(() => {
    if (activeMode !== 'AUTO') return activeMode;
    if (blueprint.templateId === 'BIO_DNA_HELIX') return 'DNA_HELIX';
    if (blueprint.templateId === 'BIO_HEART_CYCLE') return 'HEART_WIGGERS';
    if (blueprint.templateId === 'BIO_PHOTOSYNTHESIS') {
      return isOlympiad ? 'POPULATION_GENETICS' : 'LEAF_ANATOMY';
    }
    return 'DNA_HELIX';
  }, [activeMode, blueprint.templateId, isOlympiad]);

  // Pointer drag to orbit 3D DNA
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };

    setRotY((prev) => prev + dx * 0.012);
    setRotX((prev) => Math.max(-1.2, Math.min(1.2, prev + dy * 0.012)));
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      tickRef.current += 0.025;
      const t = tickRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Editorial Warm Paper Background
      ctx.fillStyle = '#FCFBF9';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Fine architectural millimeter grid
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

      // =========================================================================
      // MODE 1: 3D DNA DOUBLE HELIX & HELICASE REPLICATION FORK
      // =========================================================================
      if (currentMode === 'DNA_HELIX') {
        const unzipProgress = Math.max(0, Math.min(1, (params.unzipProgress ?? params.unzip ?? 20) / 100));
        const autoSpin = !isDraggingRef.current ? t * 0.4 : 0;
        const currentRotY = rotY + autoSpin;
        const currentRotX = rotX;

        // Sequence of base pairs (A-T, G-C, T-A, C-G...)
        const sequence: [keyof typeof BASE_COLORS, keyof typeof BASE_COLORS][] = [
          ['A', 'T'], ['G', 'C'], ['C', 'G'], ['T', 'A'],
          ['A', 'T'], ['C', 'G'], ['G', 'C'], ['T', 'A'],
          ['A', 'T'], ['G', 'C'], ['T', 'A'], ['C', 'G'],
          ['G', 'C'], ['A', 'T'], ['T', 'A'], ['C', 'G'],
          ['A', 'T'], ['G', 'C'], ['C', 'G'], ['T', 'A'],
        ];

        const fov = 340;
        const centerX = 290;
        const centerY = 165;
        const stepY = 12.5;
        const helixRadius = 52;
        const totalPairs = sequence.length;

        interface RenderItem {
          z: number;
          type: 'backbone_segment' | 'base_pair' | 'helicase_wedge';
          draw: () => void;
        }

        const renderList: RenderItem[] = [];

        // Project 3D point
        const project = (x3d: number, y3d: number, z3d: number) => {
          // Rotate around X
          const y1 = y3d * Math.cos(currentRotX) - z3d * Math.sin(currentRotX);
          const z1 = y3d * Math.sin(currentRotX) + z3d * Math.cos(currentRotX);

          // Rotate around Y
          const x2 = x3d * Math.cos(currentRotY) + z1 * Math.sin(currentRotY);
          const z2 = -x3d * Math.sin(currentRotY) + z1 * Math.cos(currentRotY);

          const scale = fov / (fov + z2 + 80);
          return {
            x: centerX + x2 * scale,
            y: centerY + y1 * scale,
            scale,
            depth: z2,
          };
        };

        // Unzip cutoff index
        const unzippedIndex = Math.floor(unzipProgress * totalPairs);

        // Calculate strand positions
        const strandA: { x: number; y: number; scale: number; depth: number }[] = [];
        const strandB: { x: number; y: number; scale: number; depth: number }[] = [];

        for (let i = 0; i < totalPairs; i++) {
          const rawY = (i - totalPairs / 2) * stepY;
          const theta = i * 0.45;

          // Separation factor if unzipped
          let separation = 0;
          if (i <= unzippedIndex) {
            const peelFactor = (unzippedIndex - i + 1) / (unzippedIndex + 1);
            separation = Math.min(85, peelFactor * 90);
          }

          const xA = Math.cos(theta) * helixRadius - separation;
          const zA = Math.sin(theta) * helixRadius;
          const xB = Math.cos(theta + Math.PI) * helixRadius + separation;
          const zB = Math.sin(theta + Math.PI) * helixRadius;

          const pA = project(xA, rawY, zA);
          const pB = project(xB, rawY, zB);

          strandA.push(pA);
          strandB.push(pB);

          // Add base pair rungs
          const isSevered = i <= unzippedIndex;
          const avgZ = (pA.depth + pB.depth) / 2;
          const [baseA, baseB] = sequence[i];

          renderList.push({
            z: avgZ,
            type: 'base_pair',
            draw: () => {
              if (isSevered) {
                // Severed hydrogen bonds: strand A base
                const midAx = pA.x + (pB.x - pA.x) * 0.35;
                const midAy = pA.y + (pB.y - pA.y) * 0.35;

                ctx.strokeStyle = BASE_COLORS[baseA].bg;
                ctx.lineWidth = 4 * pA.scale;
                ctx.beginPath();
                ctx.moveTo(pA.x, pA.y);
                ctx.lineTo(midAx, midAy);
                ctx.stroke();

                // Severed strand B base
                const midBx = pB.x + (pA.x - pB.x) * 0.35;
                const midBy = pB.y + (pA.y - pB.y) * 0.35;

                ctx.strokeStyle = BASE_COLORS[baseB].bg;
                ctx.lineWidth = 4 * pB.scale;
                ctx.beginPath();
                ctx.moveTo(pB.x, pB.y);
                ctx.lineTo(midBx, midBy);
                ctx.stroke();

                // Sparkles at broken bond
                ctx.fillStyle = '#F59E0B';
                ctx.beginPath();
                ctx.arc((midAx + midBx) / 2, (midAy + midBy) / 2, 2 * pA.scale, 0, Math.PI * 2);
                ctx.fill();
              } else {
                // Intact base pair connected with hydrogen bonds
                const midX = (pA.x + pB.x) / 2;
                const midY = (pA.y + pB.y) / 2;

                // Base A half
                ctx.strokeStyle = BASE_COLORS[baseA].bg;
                ctx.lineWidth = 4 * pA.scale;
                ctx.beginPath();
                ctx.moveTo(pA.x, pA.y);
                ctx.lineTo(midX - 3 * pA.scale, midY);
                ctx.stroke();

                // Base B half
                ctx.strokeStyle = BASE_COLORS[baseB].bg;
                ctx.lineWidth = 4 * pB.scale;
                ctx.beginPath();
                ctx.moveTo(pB.x, pB.y);
                ctx.lineTo(midX + 3 * pB.scale, midY);
                ctx.stroke();

                // Hydrogen bonds (2 bonds for A-T, 3 bonds for G-C)
                const numH = (baseA === 'A' || baseA === 'T') ? 2 : 3;
                ctx.save();
                ctx.strokeStyle = '#78716C';
                ctx.setLineDash([2, 2]);
                ctx.lineWidth = 1.5;
                for (let h = 0; h < numH; h++) {
                  const offset = (h - (numH - 1) / 2) * 3;
                  ctx.beginPath();
                  ctx.moveTo(midX - 3, midY + offset);
                  ctx.lineTo(midX + 3, midY + offset);
                  ctx.stroke();
                }
                ctx.restore();
              }

              // Sugar-phosphate backbone nodes (Spheres with PBR glint)
              [
                { pt: pA, col: '#0284C7' },
                { pt: pB, col: '#E11D48' },
              ].forEach(({ pt, col }) => {
                const r = 5.5 * pt.scale;
                const grad = ctx.createRadialGradient(
                  pt.x - r * 0.35,
                  pt.y - r * 0.35,
                  r * 0.1,
                  pt.x,
                  pt.y,
                  r
                );
                grad.addColorStop(0, '#FFFFFF');
                grad.addColorStop(0.3, col);
                grad.addColorStop(1, '#0F172A');

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
                ctx.fill();
              });
            },
          });
        }

        // Draw backbone ribbon segments
        for (let i = 0; i < totalPairs - 1; i++) {
          const pA1 = strandA[i];
          const pA2 = strandA[i + 1];
          const pB1 = strandB[i];
          const pB2 = strandB[i + 1];

          renderList.push({
            z: (pA1.depth + pA2.depth) / 2,
            type: 'backbone_segment',
            draw: () => {
              ctx.strokeStyle = '#0284C7';
              ctx.lineWidth = 2.8 * pA1.scale;
              ctx.beginPath();
              ctx.moveTo(pA1.x, pA1.y);
              ctx.lineTo(pA2.x, pA2.y);
              ctx.stroke();
            },
          });

          renderList.push({
            z: (pB1.depth + pB2.depth) / 2,
            type: 'backbone_segment',
            draw: () => {
              ctx.strokeStyle = '#E11D48';
              ctx.lineWidth = 2.8 * pB1.scale;
              ctx.beginPath();
              ctx.moveTo(pB1.x, pB1.y);
              ctx.lineTo(pB2.x, pB2.y);
              ctx.stroke();
            },
          });
        }

        // Helicase Enzyme Wedge at the replication fork boundary
        if (unzipProgress > 0.05 && unzippedIndex < totalPairs) {
          const forkY = (unzippedIndex - totalPairs / 2) * stepY;
          const forkPt = project(0, forkY, 0);

          renderList.push({
            z: forkPt.depth - 20, // Keep in front of local bonds
            type: 'helicase_wedge',
            draw: () => {
              const hw = 22 * forkPt.scale;
              const hh = 16 * forkPt.scale;

              // Glowing golden enzyme ring
              ctx.save();
              ctx.shadowColor = 'rgba(245, 158, 11, 0.4)';
              ctx.shadowBlur = 10;

              const wedgeGrad = ctx.createRadialGradient(
                forkPt.x - hw * 0.3,
                forkPt.y - hh * 0.3,
                2,
                forkPt.x,
                forkPt.y,
                hw
              );
              wedgeGrad.addColorStop(0, '#FEF08A');
              wedgeGrad.addColorStop(0.5, '#F59E0B');
              wedgeGrad.addColorStop(1, '#B45309');

              ctx.fillStyle = wedgeGrad;
              ctx.beginPath();
              ctx.ellipse(forkPt.x, forkPt.y, hw, hh, 0, 0, Math.PI * 2);
              ctx.fill();

              ctx.strokeStyle = '#78350F';
              ctx.lineWidth = 1.5;
              ctx.stroke();
              ctx.restore();

              // Label
              ctx.fillStyle = '#78350F';
              ctx.font = 'bold 9px monospace';
              ctx.textAlign = 'center';
              ctx.fillText('HELICASE', forkPt.x, forkPt.y + 3);
            },
          });
        }

        // Z-sort all 3D items back-to-front
        renderList.sort((a, b) => b.z - a.z);
        renderList.forEach((item) => item.draw());

        // Header & HUD Telemetry
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('MÔ PHỎNG 3D DNA & CHẠC SAO CHÉP (REPLICATION FORK)', 18, 25);

        ctx.fillStyle = '#57534E';
        ctx.font = '10px monospace';
        ctx.fillText('Kéo chuột để xoay 360° | Thanh trượt tháo xoắn Helicase', 18, 40);

        // Nucleotide Legend (Top-right chips)
        const legX = canvas.width - 205;
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#E6E4DD';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(legX, 12, 190, 72, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('CẶP BASE BỔ SUNG:', legX + 8, 28);

        // A-T (2 H-bonds)
        ctx.fillStyle = BASE_COLORS.A.bg;
        ctx.fillRect(legX + 8, 36, 12, 12);
        ctx.fillStyle = BASE_COLORS.T.bg;
        ctx.fillRect(legX + 22, 36, 12, 12);
        ctx.fillStyle = '#334155';
        ctx.font = '10px monospace';
        ctx.fillText('A = T (2 liên kết H)', legX + 40, 46);

        // G-C (3 H-bonds)
        ctx.fillStyle = BASE_COLORS.G.bg;
        ctx.fillRect(legX + 8, 54, 12, 12);
        ctx.fillStyle = BASE_COLORS.C.bg;
        ctx.fillRect(legX + 22, 54, 12, 12);
        ctx.fillStyle = '#334155';
        ctx.font = '10px monospace';
        ctx.fillText('G ≡ C (3 liên kết H)', legX + 40, 64);

        // Replication Fork Status Badge (Bottom-left)
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#E6E4DD';
        ctx.beginPath();
        ctx.roundRect(18, canvas.height - 48, 270, 36, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`TIẾN ĐỘ THÁO XOẮN: ${(unzipProgress * 100).toFixed(0)}%`, 26, canvas.height - 32);
        ctx.fillStyle = unzipProgress > 0 ? '#059669' : '#57534E';
        ctx.font = '9px sans-serif';
        ctx.fillText(
          unzipProgress > 0.4
            ? 'Đang tổng hợp mạch sớm (Leading) & đoạn Okazaki (Lagging)'
            : 'Enzyme Helicase chưa tách mạch kép',
          26,
          canvas.height - 18
        );

      // =========================================================================
      // MODE 2: MULTI-LAYERED LEAF ANATOMY & STOMATAL GUARD CELLS
      // =========================================================================
      } else if (currentMode === 'LEAF_ANATOMY') {
        const temp = params.temperature ?? params.T ?? 25;
        const light = params.light ?? params.I ?? 70;

        // Photosynthesis Rate Calculation (Bell Curve with peak at 30°C)
        const tempFactor = Math.max(0, 1 - Math.pow((temp - 30) / 20, 2));
        const photosynthesisRate = Math.round(tempFactor * (light / 100) * 100);

        // Stomatal aperture: swollen/open at 25°C, tightly closed at >45°C
        const stomataOpen = temp > 45 ? 2 : Math.max(3, tempFactor * 26);
        const isStomataClosed = temp > 45;

        // Split Layout: Left is Leaf Anatomy (0..340), Right is Bell Curve (350..610)
        const splitX = 345;
        ctx.strokeStyle = '#E6E4DD';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(splitX, 10);
        ctx.lineTo(splitX, canvas.height - 10);
        ctx.stroke();

        // ----------------- LEFT PANEL: LEAF CROSS SECTION -----------------
        ctx.fillStyle = '#059669';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('GIẢI PHẪU LÁ CẮT NGANG & KHÍ KHỔNG', 16, 22);

        // 1. Incoming Sunlight Photon Beams (Golden Shimmering rays)
        const photonCount = Math.floor((light / 100) * 7) + 2;
        ctx.save();
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.lineWidth = 2.5;
        for (let p = 0; p < photonCount; p++) {
          const rayX = 35 + p * 38;
          const rayOffset = (t * 25 + p * 15) % 45;
          ctx.beginPath();
          ctx.moveTo(rayX, 32);
          ctx.lineTo(rayX + 15, 65 + rayOffset);
          ctx.stroke();
        }
        ctx.restore();

        // 2. Upper Cuticle Layer (Translucent waxy barrier)
        ctx.fillStyle = '#E0F2FE';
        ctx.strokeStyle = '#BAE6FD';
        ctx.lineWidth = 1.5;
        ctx.fillRect(25, 68, 300, 6);
        ctx.strokeRect(25, 68, 300, 6);

        // 3. Upper Epidermis Cells (Single layer of clear cells)
        ctx.fillStyle = '#F0FDF4';
        ctx.strokeStyle = '#86EFAC';
        ctx.lineWidth = 1;
        for (let c = 0; c < 10; c++) {
          const cellX = 25 + c * 30;
          ctx.fillRect(cellX, 74, 30, 20);
          ctx.strokeRect(cellX, 74, 30, 20);
          // Nucleus
          ctx.fillStyle = '#BBF7D0';
          ctx.beginPath();
          ctx.arc(cellX + 15, 84, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#F0FDF4';
        }

        // 4. Palisade Mesophyll (Vertical columnar cells with Chloroplasts)
        for (let col = 0; col < 10; col++) {
          const pCellX = 25 + col * 30;
          const pCellY = 94;
          const pCellW = 30;
          const pCellH = 75;

          ctx.fillStyle = '#DCFCE7';
          ctx.strokeStyle = '#4ADE80';
          ctx.lineWidth = 1;
          ctx.fillRect(pCellX, pCellY, pCellW, pCellH);
          ctx.strokeRect(pCellX, pCellY, pCellW, pCellH);

          // Chloroplasts packed inside (Green discs)
          for (let chl = 0; chl < 5; chl++) {
            const chlX = pCellX + 7 + (chl % 2) * 15;
            const chlY = pCellY + 12 + chl * 12;
            ctx.fillStyle = '#16A34A';
            ctx.beginPath();
            ctx.ellipse(chlX, chlY, 5, 3.5, 0.2, 0, Math.PI * 2);
            ctx.fill();

            // Thylakoid grana lines
            ctx.strokeStyle = '#14532D';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(chlX - 3, chlY);
            ctx.lineTo(chlX + 3, chlY);
            ctx.stroke();
          }
        }

        // 5. Spongy Mesophyll & Air Spaces (Loose cells)
        for (let s = 0; s < 14; s++) {
          const sX = 35 + (s % 7) * 42 + (s > 6 ? 15 : 0);
          const sY = 175 + (s > 6 ? 26 : 0);
          ctx.fillStyle = '#86EFAC';
          ctx.strokeStyle = '#22C55E';
          ctx.beginPath();
          ctx.ellipse(sX, sY, 14, 11, s * 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        // 6. Lower Epidermis & Stomatal Guard Cells
        ctx.fillStyle = '#F0FDF4';
        ctx.strokeStyle = '#86EFAC';
        // Left lower epidermis
        for (let c = 0; c < 3; c++) {
          const cellX = 25 + c * 30;
          ctx.fillRect(cellX, 230, 30, 20);
          ctx.strokeRect(cellX, 230, 30, 20);
        }
        // Right lower epidermis
        for (let c = 0; c < 3; c++) {
          const cellX = 235 + c * 30;
          ctx.fillRect(cellX, 230, 30, 20);
          ctx.strokeRect(cellX, 230, 30, 20);
        }

        // Stomatal Guard Cells (Kidney-shaped pair centered at x=175, y=240)
        const scCenter = 175;
        const scY = 240;

        // Left Guard Cell
        ctx.save();
        ctx.translate(scCenter - stomataOpen / 2 - 8, scY);
        ctx.rotate(-0.15);
        ctx.fillStyle = isStomataClosed ? '#A1A1AA' : '#15803D';
        ctx.strokeStyle = '#14532D';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, 10, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Turgor Vacuole inside
        ctx.fillStyle = isStomataClosed ? '#D4D4D8' : '#86EFAC';
        ctx.beginPath();
        ctx.ellipse(0, 0, 4, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Right Guard Cell
        ctx.save();
        ctx.translate(scCenter + stomataOpen / 2 + 8, scY);
        ctx.rotate(0.15);
        ctx.fillStyle = isStomataClosed ? '#A1A1AA' : '#15803D';
        ctx.strokeStyle = '#14532D';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, 10, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Turgor Vacuole inside
        ctx.fillStyle = isStomataClosed ? '#D4D4D8' : '#86EFAC';
        ctx.beginPath();
        ctx.ellipse(0, 0, 4, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Stomatal Pore Aperture opening
        if (!isStomataClosed) {
          ctx.fillStyle = '#0F172A';
          ctx.beginPath();
          ctx.ellipse(scCenter, scY, stomataOpen / 2, 14, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Gas Particles diffusion stream
        particlesRef.current.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 30 || p.x > 320) p.vx *= -1;
          if (p.y < 130 || p.y > 230) p.vy *= -1;

          ctx.fillStyle = p.type === 'CO2' ? '#64748B' : p.type === 'O2' ? '#0284C7' : '#0D9488';
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        });

        // Annotation labels
        ctx.fillStyle = '#0F172A';
        ctx.font = '9px monospace';
        ctx.fillText('Lục lạp (Chloroplast)', 28, 106);
        ctx.fillText('Tế bào hạt đậu (Khí khổng)', 115, 275);
        ctx.fillStyle = isStomataClosed ? '#E11D48' : '#059669';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(
          isStomataClosed ? 'KHÍ KHỔNG ĐÓNG (Chống mất nước >45°C)' : 'KHÍ KHỔNG MỞ (Trao đổi khí CO₂/O₂)',
          115,
          288
        );

        // ----------------- RIGHT PANEL: PHOTOSYNTHESIS RATE BELL CURVE -----------------
        const gLeft = 370;
        const gRight = 600;
        const gTop = 50;
        const gBottom = 265;
        const gW = gRight - gLeft;
        const gH = gBottom - gTop;

        ctx.fillStyle = '#0284C7';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('ĐỒ THỊ TỐC ĐỘ QUANG HỢP', gLeft, 22);

        // Grid & Axes
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(gLeft, gBottom);
        ctx.lineTo(gRight, gBottom);
        ctx.moveTo(gLeft, gTop);
        ctx.lineTo(gLeft, gBottom);
        ctx.stroke();

        ctx.fillStyle = '#57534E';
        ctx.font = '10px monospace';
        ctx.fillText('Nhiệt độ T (°C)', gRight - 75, gBottom + 16);
        ctx.fillText('Hiệu suất (%)', gLeft + 6, gTop - 6);

        // Temperature tick marks: 0, 15, 30 (peak), 45, 60
        [0, 15, 30, 45, 60].forEach((tVal) => {
          const gx = gLeft + (tVal / 60) * gW;
          ctx.fillStyle = '#64748B';
          ctx.font = '9px monospace';
          ctx.fillText(`${tVal}°`, gx - 6, gBottom + 14);

          ctx.strokeStyle = '#E2E8F0';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(gx, gTop);
          ctx.lineTo(gx, gBottom);
          ctx.stroke();
        });

        // Draw Bell Curve R(T) = I * exp(-(T-30)^2 / (2*sigma^2))
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        for (let tStep = 0; tStep <= 60; tStep += 1) {
          const tFactor = Math.max(0, 1 - Math.pow((tStep - 30) / 20, 2));
          const r = tFactor * (light / 100);
          const gx = gLeft + (tStep / 60) * gW;
          const gy = gBottom - r * gH * 0.92;
          if (tStep === 0) ctx.moveTo(gx, gy);
          else ctx.lineTo(gx, gy);
        }
        ctx.stroke();

        // Fill area under curve
        ctx.fillStyle = 'rgba(5, 150, 105, 0.08)';
        ctx.lineTo(gRight, gBottom);
        ctx.lineTo(gLeft, gBottom);
        ctx.closePath();
        ctx.fill();

        // Current operating temperature point
        const curX = gLeft + (temp / 60) * gW;
        const curY = gBottom - (photosynthesisRate / 100) * gH * 0.92;

        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = '#E11D48';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(curX, gBottom);
        ctx.lineTo(curX, curY);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#E11D48';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(curX, curY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Rate Badge
        ctx.fillStyle = '#18181B';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`CƯỜNG ĐỘ QUANG HỢP: ${photosynthesisRate}%`, 16, canvas.height - 22);
        ctx.fillStyle = '#57534E';
        ctx.font = '10px monospace';
        ctx.fillText(`T = ${temp}°C (Tối ưu: 30°C) | Ánh sáng = ${light}%`, 16, canvas.height - 8);

      // =========================================================================
      // MODE 3: CARDIAC WIGGERS CYCLE & 3D PULSE
      // =========================================================================
      } else if (currentMode === 'HEART_WIGGERS') {
        const bpm = params.BPM ?? 75;
        const period = 60 / bpm;
        const phase = (t % period) / period;

        // Cardiac contraction cycle: Isovolumetric contraction -> Ejection -> Relaxation
        const isSystole = phase > 0.15 && phase < 0.45;
        const contraction = Math.exp(-Math.pow((phase - 0.28) * 8, 2)) * 0.38;
        const scaleFactor = 1 + contraction;

        const leftX = 145;
        const leftY = 160;

        // Split view divider
        ctx.strokeStyle = '#E6E4DD';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(280, 10);
        ctx.lineTo(280, canvas.height - 10);
        ctx.stroke();

        ctx.fillStyle = '#E11D48';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('ANATOMICAL HEART 3D PULSE', 16, 22);

        // 3D Heart Muscle Model
        ctx.save();
        ctx.translate(leftX, leftY);
        ctx.scale(scaleFactor, scaleFactor);

        // Heart Shadow
        ctx.fillStyle = 'rgba(225, 29, 72, 0.15)';
        ctx.beginPath();
        ctx.arc(0, 10, 68, 0, Math.PI * 2);
        ctx.fill();

        // 3D Heart Gradient
        const heartGrad = ctx.createRadialGradient(-20, -15, 10, 0, 20, 80);
        heartGrad.addColorStop(0, '#FB7185');
        heartGrad.addColorStop(0.5, '#E11D48');
        heartGrad.addColorStop(1, '#881337');

        ctx.fillStyle = heartGrad;
        ctx.beginPath();
        ctx.moveTo(0, 25);
        ctx.bezierCurveTo(-55, -35, -95, 35, 0, 95);
        ctx.bezierCurveTo(95, 35, 55, -35, 0, 25);
        ctx.fill();

        // Aorta & Pulmonary Artery Arches
        ctx.strokeStyle = '#BE123C';
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-15, 10);
        ctx.bezierCurveTo(-20, -35, 15, -45, 25, -25);
        ctx.stroke();

        ctx.restore();

        // Cardiac state readout
        ctx.fillStyle = '#0F172A';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(isSystole ? 'PHA TÂM THU (SYSTOLE)' : 'PHA TÂM TRƯƠNG (DIASTOLE)', 16, canvas.height - 35);
        ctx.fillStyle = '#57534E';
        ctx.font = '10px monospace';
        ctx.fillText(`Nhịp tim: ${bpm} BPM (T = ${period.toFixed(2)}s)`, 16, canvas.height - 20);

        // Right Panel: Live Wiggers Pressure Graph & ECG
        const wLeft = 300;
        const wRight = 600;
        const wTop = 45;
        const wBottom = 265;
        const wW = wRight - wLeft;
        const wH = wBottom - wTop;

        ctx.fillStyle = '#2563EB';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('ĐỒ THỊ ÁP SUẤT WIGGERS & ECG', wLeft, 22);

        // Axes
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(wLeft, wBottom);
        ctx.lineTo(wRight, wBottom);
        ctx.moveTo(wLeft, wTop);
        ctx.lineTo(wLeft, wBottom);
        ctx.stroke();

        ctx.fillStyle = '#57534E';
        ctx.font = '9px monospace';
        ctx.fillText('Áp suất (mmHg)', wLeft + 6, wTop - 6);

        // Draw Left Ventricular Pressure Curve (Red)
        ctx.strokeStyle = '#E11D48';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let x = 0; x < wW; x += 3) {
          const ph = ((x / wW) * 1.5 + t * 0.4) % 1;
          const pVent = Math.exp(-Math.pow((ph - 0.3) * 6, 2)) * 115 + 8;
          const py = wBottom - (pVent / 140) * wH * 0.9;
          x === 0 ? ctx.moveTo(wLeft + x, py) : ctx.lineTo(wLeft + x, py);
        }
        ctx.stroke();

        // Draw Aortic Pressure Curve (Orange dashed)
        ctx.save();
        ctx.strokeStyle = '#D97706';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x < wW; x += 3) {
          const ph = ((x / wW) * 1.5 + t * 0.4) % 1;
          let pAorta = 80;
          if (ph > 0.2 && ph < 0.45) {
            pAorta = Math.exp(-Math.pow((ph - 0.3) * 6, 2)) * 40 + 80;
          }
          const py = wBottom - (pAorta / 140) * wH * 0.9;
          x === 0 ? ctx.moveTo(wLeft + x, py) : ctx.lineTo(wLeft + x, py);
        }
        ctx.stroke();
        ctx.restore();

        // Legend
        ctx.fillStyle = '#E11D48';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('— Áp suất Thất trái (LV)', wLeft + 15, wTop + 14);
        ctx.fillStyle = '#D97706';
        ctx.fillText('--- Áp suất Động mạch chủ (Aorta)', wLeft + 15, wTop + 28);

      // =========================================================================
      // MODE 4: POPULATION GENETICS (HARDY-WEINBERG UNDER SELECTION)
      // =========================================================================
      } else {
        const pAllel = params.p ?? 0.6;
        const selCoeff = params.s ?? 0.25;
        const qAllel = 1 - pAllel;
        const p2 = pAllel * pAllel;
        const twoPq = 2 * pAllel * qAllel;
        const q2 = qAllel * qAllel;

        const divX = 260;
        ctx.strokeStyle = '#E6E4DD';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(divX, 10);
        ctx.lineTo(divX, canvas.height - 10);
        ctx.stroke();

        ctx.fillStyle = '#059669';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('QUẦN THỂ SINH VẬT', 16, 25);

        // Organisms Grid
        const startX = 30;
        const startY = 55;
        let count = 0;
        for (let row = 0; row < 5; row++) {
          for (let col = 0; col < 6; col++) {
            count++;
            const isDominant = (count / 30) <= (p2 + twoPq);
            const ox = startX + col * 35;
            const oy = startY + row * 38;

            ctx.fillStyle = isDominant ? '#059669' : '#E11D48';
            ctx.beginPath();
            ctx.arc(ox, oy, 11, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.fillStyle = '#18181B';
        ctx.font = '10px monospace';
        ctx.fillText(`Alen A (p): ${pAllel.toFixed(2)} | Alen a (q): ${qAllel.toFixed(2)}`, 16, canvas.height - 40);
        ctx.fillStyle = '#57534E';
        ctx.fillText(`AA: ${p2.toFixed(2)} | Aa: ${twoPq.toFixed(2)} | aa: ${q2.toFixed(2)}`, 16, canvas.height - 22);

        // Right Panel: 50 Generations Analytical Trajectory Graph
        const gLeft = 285;
        const gRight = 595;
        const gTop = 45;
        const gBottom = canvas.height - 35;
        const gW = gRight - gLeft;
        const gH = gBottom - gTop;

        ctx.fillStyle = '#2563EB';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('DI TRUYỀN QUẦN THỂ QUA 50 THẾ HỆ', gLeft, 25);

        // Axes
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(gLeft, gBottom);
        ctx.lineTo(gRight, gBottom);
        ctx.moveTo(gLeft, gTop);
        ctx.lineTo(gLeft, gBottom);
        ctx.stroke();

        let currP = pAllel;
        const pHistory: number[] = [currP];
        for (let gen = 1; gen <= 50; gen++) {
          const currQ = 1 - currP;
          const num = currP * currP + currP * currQ * (1 - selCoeff);
          const den = 1 - selCoeff * currQ * currQ;
          currP = Math.max(0, Math.min(1, num / Math.max(0.001, den)));
          pHistory.push(currP);
        }

        // Draw p(t) trajectory curve (Emerald)
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        pHistory.forEach((val, gen) => {
          const gx = gLeft + (gen / 50) * gW;
          const gy = gBottom - val * gH;
          if (gen === 0) ctx.moveTo(gx, gy);
          else ctx.lineTo(gx, gy);
        });
        ctx.stroke();

        // Draw q(t) trajectory curve (Vermilion Rose dashed)
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = '#E11D48';
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
        ctx.fillStyle = '#059669';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('— Tần số p (Alen A)', gLeft + 20, gTop + 16);
        ctx.fillStyle = '#E11D48';
        ctx.fillText('--- Tần số q (Alen a)', gLeft + 160, gTop + 16);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [currentMode, params, rotX, rotY, isOlympiad]);

  return (
    <div className="relative w-full max-w-[620px] flex flex-col items-center">
      {/* Subject Mode Switcher Ribbon */}
      <div className="w-full flex items-center justify-between px-3 py-1.5 mb-2 bg-white/95 backdrop-blur-md rounded-xl border border-[#E6E4DD] shadow-[0_2px_12px_-2px_rgba(20,20,19,0.04)] flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 font-semibold">Chế độ Sinh học:</span>
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveMode('DNA_HELIX')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
              currentMode === 'DNA_HELIX'
                ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm font-semibold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Dna className="w-3.5 h-3.5 text-blue-600" />
            <span>3D DNA & Helicase</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('LEAF_ANATOMY')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
              currentMode === 'LEAF_ANATOMY'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm font-semibold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Leaf className="w-3.5 h-3.5 text-emerald-600" />
            <span>Giải phẫu Lá & Khí khổng</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('HEART_WIGGERS')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
              currentMode === 'HEART_WIGGERS'
                ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-sm font-semibold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-rose-600" />
            <span>Tim & Wiggers</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('POPULATION_GENETICS')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
              currentMode === 'POPULATION_GENETICS'
                ? 'bg-purple-50 text-purple-700 border border-purple-200 shadow-sm font-semibold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-purple-600" />
            <span>Di truyền Quần thể</span>
          </button>
        </div>
      </div>

      {/* Main Interactive 60FPS Canvas */}
      <canvas
        ref={canvasRef}
        width={620}
        height={340}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="rounded-2xl bg-[#FCFBF9] border border-[#E6E4DD] shadow-[0_4px_24px_-4px_rgba(20,20,19,0.06)] w-full object-contain cursor-grab active:cursor-grabbing touch-none"
      />
    </div>
  );
};
