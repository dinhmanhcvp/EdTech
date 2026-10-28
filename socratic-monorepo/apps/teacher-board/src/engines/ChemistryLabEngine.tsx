// apps/teacher-board/src/engines/ChemistryLabEngine.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { setupHiDpiCanvas } from './visualKit';
import { hudCard, roundRectPath } from '../utils/canvasKit';
import { SimulationBlueprint, CurriculumLevel } from '@socratic/types';
import { Sparkles, Layers, RotateCw, Eye } from 'lucide-react';
import { formatCanvasMath } from '../utils/canvasMath';

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
  opacity: number;
}

interface PrecipitateCrystal {
  x: number;
  y: number;
  size: number;
  rotation: number;
  color: string;
}

type MoleculePreset = 'BENZENE' | 'WATER' | 'METHANE' | 'AMMONIA' | 'ETHANOL';

export const ChemistryLabEngine: React.FC<Props> = ({
  blueprint,
  params,
  curriculumLevel = blueprint.curriculumLevel ?? 'THPT_STANDARD',
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bubblesRef = useRef<BubbleParticle[]>([]);
  const crystalsRef = useRef<PrecipitateCrystal[]>([]);
  const timeRef = useRef<number>(0);

  // 3D Orbit Controls State
  const [rotX, setRotX] = useState<number>(0.25);
  const [rotY, setRotY] = useState<number>(0.6);
  const isDraggingRef = useRef<boolean>(false);
  const lastMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Molecule Selector
  const [selectedMolecule, setSelectedMolecule] = useState<MoleculePreset>('BENZENE');
  const [activeSubMode, setActiveSubMode] = useState<'AUTO' | 'MOLECULAR_3D' | 'REACTION_GLASSWARE'>('AUTO');

  const isOlympiad = curriculumLevel === 'OLYMPIAD_ADVANCED';

  // Initialize random precipitate crystals once
  useEffect(() => {
    const list: PrecipitateCrystal[] = [];
    for (let i = 0; i < 48; i++) {
      list.push({
        x: 70 + Math.random() * 110,
        y: 235 + Math.random() * 18,
        size: 3 + Math.random() * 5,
        rotation: Math.random() * Math.PI,
        color: i % 3 === 0 ? '#b45309' : (i % 3 === 1 ? '#d97706' : '#92400e'),
      });
    }
    crystalsRef.current = list;
  }, []);

  // Mouse interaction for 3D Orbiting
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMouseRef.current.x;
    const dy = e.clientY - lastMouseRef.current.y;
    lastMouseRef.current = { x: e.clientX, y: e.clientY };

    setRotY((y) => y + dx * 0.012);
    setRotX((x) => Math.max(-1.4, Math.min(1.4, x + dy * 0.012)));
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const LW = 620; // kích thước logic của canvas; nền được nâng độ phân giải trong setupHiDpiCanvas
    const LH = 340;
    setupHiDpiCanvas(canvas, ctx, LW, LH);

    let animId: number;

    const render = () => {
      timeRef.current += 0.025;
      const t = timeRef.current;

      ctx.clearRect(0, 0, LW, LH);

      // Warm Daylight Technical Graph Paper Background
      ctx.fillStyle = '#FCFBF9';
      ctx.fillRect(0, 0, LW, LH);

      // Precise architectural millimeter grid
      ctx.strokeStyle = '#EFECE6';
      ctx.lineWidth = 1;
      for (let x = 0; x < LW; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, LH);
        ctx.stroke();
      }
      for (let y = 0; y < LH; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(LW, y);
        ctx.stroke();
      }

      // Determine display mode
      const isMolecularMode =
        activeSubMode === 'MOLECULAR_3D' ||
        (activeSubMode === 'AUTO' && blueprint.templateId === 'CHEM_MOLECULE_2D3D');

      // ==============================================================
      // 1. MODE A: 3D MOLECULAR STUDIO (PBR Ball-and-Stick + Pi-Cloud)
      // ==============================================================
      if (isMolecularMode) {
        const cx = LW / 2;
        const cy = LH / 2 + 10;

        // Auto slow rotation if not dragging
        const effectiveRotY = isDraggingRef.current ? rotY : rotY + t * 0.3;
        const effectiveRotX = rotX;

        // Dynamic parameters
        const tempKelvin = params.temperature ?? params.T ?? 298; // Room temp 298K
        const thermalJitter = Math.min(6, (tempKelvin / 300) * 1.8);
        const bondAngleSpread = ((params.bondAngle ?? 104.5) / 104.5);
        const piCloudOpacity = Math.max(0.1, Math.min(0.85, (params.electronCloud ?? 65) / 100));

        interface AtomDef {
          element: 'C' | 'H' | 'O' | 'N';
          x: number;
          y: number;
          z: number;
          radius: number;
          baseColor: string;
          highlightColor: string;
          shadowColor: string;
        }

        interface BondDef {
          from: number;
          to: number;
          order: 1 | 2;
        }

        let atoms: AtomDef[] = [];
        let bonds: BondDef[] = [];
        let hasDelocalizedRing = false;

        if (selectedMolecule === 'BENZENE') {
          hasDelocalizedRing = true;
          // Hexagonal Carbon Ring
          const cRadius = 65;
          const hRadius = 115;
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            // Thermal jitter
            const jx = Math.sin(t * 12 + i) * thermalJitter;
            const jy = Math.cos(t * 12 + i) * thermalJitter;
            atoms.push({
              element: 'C',
              x: Math.cos(angle) * cRadius + jx,
              y: Math.sin(angle) * cRadius + jy,
              z: (i % 2 === 0 ? 3 : -3),
              radius: 17,
              baseColor: '#3F3F46',
              highlightColor: '#71717A',
              shadowColor: '#18181B',
            });
            // Hydrogens
            atoms.push({
              element: 'H',
              x: Math.cos(angle) * hRadius + jx * 1.2,
              y: Math.sin(angle) * hRadius + jy * 1.2,
              z: (i % 2 === 0 ? 5 : -5),
              radius: 10,
              baseColor: '#E4E4E7',
              highlightColor: '#FFFFFF',
              shadowColor: '#A1A1AA',
            });
          }
          // Bonds
          for (let i = 0; i < 6; i++) {
            const next = (i + 1) % 6;
            bonds.push({ from: i * 2, to: next * 2, order: 1 }); // C-C
            bonds.push({ from: i * 2, to: i * 2 + 1, order: 1 }); // C-H
          }
        } else if (selectedMolecule === 'WATER') {
          // Bent molecule H2O (Oxygen center, 2 Hydrogens at bondAngle)
          const rad = (104.5 * bondAngleSpread * Math.PI) / 360;
          const dist = 75;
          atoms = [
            {
              element: 'O',
              x: 0,
              y: -15,
              z: 0,
              radius: 22,
              baseColor: '#E11D48',
              highlightColor: '#FB7185',
              shadowColor: '#9F1239',
            },
            {
              element: 'H',
              x: -Math.sin(rad) * dist,
              y: Math.cos(rad) * dist - 15,
              z: 10,
              radius: 12,
              baseColor: '#F4F4F5',
              highlightColor: '#FFFFFF',
              shadowColor: '#D4D4D8',
            },
            {
              element: 'H',
              x: Math.sin(rad) * dist,
              y: Math.cos(rad) * dist - 15,
              z: -10,
              radius: 12,
              baseColor: '#F4F4F5',
              highlightColor: '#FFFFFF',
              shadowColor: '#D4D4D8',
            },
          ];
          bonds = [
            { from: 0, to: 1, order: 1 },
            { from: 0, to: 2, order: 1 },
          ];
        } else if (selectedMolecule === 'METHANE') {
          // Tetrahedral CH4
          const d = 70;
          atoms = [
            { element: 'C', x: 0, y: 0, z: 0, radius: 19, baseColor: '#3F3F46', highlightColor: '#71717A', shadowColor: '#18181B' },
            { element: 'H', x: 0, y: -d, z: 0, radius: 11, baseColor: '#F4F4F5', highlightColor: '#FFFFFF', shadowColor: '#D4D4D8' },
            { element: 'H', x: d * 0.94, y: d * 0.33, z: 0, radius: 11, baseColor: '#F4F4F5', highlightColor: '#FFFFFF', shadowColor: '#D4D4D8' },
            { element: 'H', x: -d * 0.47, y: d * 0.33, z: d * 0.81, radius: 11, baseColor: '#F4F4F5', highlightColor: '#FFFFFF', shadowColor: '#D4D4D8' },
            { element: 'H', x: -d * 0.47, y: d * 0.33, z: -d * 0.81, radius: 11, baseColor: '#F4F4F5', highlightColor: '#FFFFFF', shadowColor: '#D4D4D8' },
          ];
          bonds = [
            { from: 0, to: 1, order: 1 },
            { from: 0, to: 2, order: 1 },
            { from: 0, to: 3, order: 1 },
            { from: 0, to: 4, order: 1 },
          ];
        } else if (selectedMolecule === 'AMMONIA') {
          // Trigonal Pyramidal NH3
          const d = 65;
          atoms = [
            { element: 'N', x: 0, y: -25, z: 0, radius: 20, baseColor: '#2563EB', highlightColor: '#60A5FA', shadowColor: '#1E3A8A' },
            { element: 'H', x: -d * 0.86, y: 30, z: -20, radius: 11, baseColor: '#F4F4F5', highlightColor: '#FFFFFF', shadowColor: '#D4D4D8' },
            { element: 'H', x: d * 0.86, y: 30, z: -20, radius: 11, baseColor: '#F4F4F5', highlightColor: '#FFFFFF', shadowColor: '#D4D4D8' },
            { element: 'H', x: 0, y: 30, z: d * 0.9, radius: 11, baseColor: '#F4F4F5', highlightColor: '#FFFFFF', shadowColor: '#D4D4D8' },
          ];
          bonds = [
            { from: 0, to: 1, order: 1 },
            { from: 0, to: 2, order: 1 },
            { from: 0, to: 3, order: 1 },
          ];
        } else {
          // Ethanol C2H5OH
          atoms = [
            { element: 'C', x: -45, y: 0, z: 0, radius: 18, baseColor: '#3F3F46', highlightColor: '#71717A', shadowColor: '#18181B' },
            { element: 'C', x: 15, y: 0, z: 0, radius: 18, baseColor: '#3F3F46', highlightColor: '#71717A', shadowColor: '#18181B' },
            { element: 'O', x: 65, y: -30, z: 15, radius: 19, baseColor: '#E11D48', highlightColor: '#FB7185', shadowColor: '#9F1239' },
            { element: 'H', x: 110, y: -20, z: 25, radius: 10, baseColor: '#F4F4F5', highlightColor: '#FFFFFF', shadowColor: '#D4D4D8' },
            { element: 'H', x: -85, y: 0, z: 0, radius: 10, baseColor: '#F4F4F5', highlightColor: '#FFFFFF', shadowColor: '#D4D4D8' },
            { element: 'H', x: -45, y: -45, z: 20, radius: 10, baseColor: '#F4F4F5', highlightColor: '#FFFFFF', shadowColor: '#D4D4D8' },
            { element: 'H', x: -45, y: 45, z: -20, radius: 10, baseColor: '#F4F4F5', highlightColor: '#FFFFFF', shadowColor: '#D4D4D8' },
            { element: 'H', x: 15, y: 45, z: 20, radius: 10, baseColor: '#F4F4F5', highlightColor: '#FFFFFF', shadowColor: '#D4D4D8' },
            { element: 'H', x: 15, y: -45, z: -20, radius: 10, baseColor: '#F4F4F5', highlightColor: '#FFFFFF', shadowColor: '#D4D4D8' },
          ];
          bonds = [
            { from: 0, to: 1, order: 1 },
            { from: 1, to: 2, order: 1 },
            { from: 2, to: 3, order: 1 },
            { from: 0, to: 4, order: 1 },
            { from: 0, to: 5, order: 1 },
            { from: 0, to: 6, order: 1 },
            { from: 1, to: 7, order: 1 },
            { from: 1, to: 8, order: 1 },
          ];
        }

        // 3D Matrix Projection
        const cosY = Math.cos(effectiveRotY);
        const sinY = Math.sin(effectiveRotY);
        const cosX = Math.cos(effectiveRotX);
        const sinX = Math.sin(effectiveRotX);

        const projectedAtoms = atoms.map((a, idx) => {
          // Rotate Y
          const x1 = a.x * cosY + a.z * sinY;
          const z1 = -a.x * sinY + a.z * cosY;
          // Rotate X
          const y1 = a.y * cosX - z1 * sinX;
          const z2 = a.y * sinX + z1 * cosX;

          // Perspective scaling
          const fov = 320;
          const scale = fov / (fov + z2);
          return {
            idx,
            element: a.element,
            px: cx + x1 * scale,
            py: cy + y1 * scale,
            pz: z2,
            pr: a.radius * scale,
            scale,
            baseColor: a.baseColor,
            highlightColor: a.highlightColor,
            shadowColor: a.shadowColor,
          };
        });

        // 3D Depth Sorting (Back to Front)
        projectedAtoms.sort((a, b) => a.pz - b.pz);

        // Draw Delocalized Pi-Electron Torus Cloud for Benzene (Behind center)
        if (hasDelocalizedRing) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(1, cosX);
          ctx.rotate(effectiveRotY);

          // Top and Bottom Pi-Clouds
          [-22, 22].forEach((zOffset) => {
            const grad = ctx.createRadialGradient(0, zOffset * sinX, 35, 0, zOffset * sinX, 75);
            grad.addColorStop(0, `rgba(99, 102, 241, 0)`);
            grad.addColorStop(0.5, `rgba(99, 102, 241, ${piCloudOpacity})`);
            grad.addColorStop(0.85, `rgba(139, 92, 246, ${piCloudOpacity * 0.6})`);
            grad.addColorStop(1, `rgba(139, 92, 246, 0)`);

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, zOffset * sinX, 75, 0, Math.PI * 2);
            ctx.fill();

            // Delocalized circular ring outline
            ctx.strokeStyle = `rgba(129, 140, 248, ${piCloudOpacity * 1.2})`;
            ctx.lineWidth = 2.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(0, zOffset * sinX, 55, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
          });
          ctx.restore();
        }

        // Draw 3D Cylindrical Chemical Bonds
        bonds.forEach((b) => {
          const a1 = projectedAtoms.find((a) => a.idx === b.from);
          const a2 = projectedAtoms.find((a) => a.idx === b.to);
          if (!a1 || !a2) return;

          const bondWidth = Math.max(2.5, 5 * ((a1.scale + a2.scale) / 2));
          const grad = ctx.createLinearGradient(a1.px, a1.py, a2.px, a2.py);
          grad.addColorStop(0, '#A1A1AA');
          grad.addColorStop(0.5, '#E4E4E7');
          grad.addColorStop(1, '#A1A1AA');

          ctx.strokeStyle = grad;
          ctx.lineWidth = bondWidth;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(a1.px, a1.py);
          ctx.lineTo(a2.px, a2.py);
          ctx.stroke();
        });

        // Draw Photorealistic PBR Shaded Spheres
        projectedAtoms.forEach((a) => {
          ctx.save();
          // Drop Shadow
          ctx.shadowColor = 'rgba(24, 24, 27, 0.18)';
          ctx.shadowBlur = Math.round(10 * a.scale);
          ctx.shadowOffsetX = Math.round(3 * a.scale);
          ctx.shadowOffsetY = Math.round(5 * a.scale);

          // PBR Radial Specular Gradient
          const lightOffsetX = -a.pr * 0.32;
          const lightOffsetY = -a.pr * 0.36;
          const pbrGrad = ctx.createRadialGradient(
            a.px + lightOffsetX,
            a.py + lightOffsetY,
            a.pr * 0.08,
            a.px,
            a.py,
            a.pr
          );
          pbrGrad.addColorStop(0, '#FFFFFF'); // Specular highlight glint
          pbrGrad.addColorStop(0.25, a.highlightColor); // Surface diffused color
          pbrGrad.addColorStop(0.75, a.baseColor); // Deep material
          pbrGrad.addColorStop(1, a.shadowColor); // Ambient occlusion edge

          ctx.fillStyle = pbrGrad;
          ctx.beginPath();
          ctx.arc(a.px, a.py, a.pr, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();

          // Element symbol label
          if (a.pr > 13) {
            ctx.fillStyle = a.element === 'H' ? '#18181B' : '#FFFFFF';
            ctx.font = `bold ${Math.round(11 * a.scale)}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(a.element, a.px, a.py);
          }
        });

        // HUD Overlay Readout
        ctx.textAlign = 'left';
        ctx.fillStyle = '#18181B';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(formatCanvasMath(`MÔ HÌNH KHÔNG GIAN 3D PBR: ${selectedMolecule}`), 18, 26);
        ctx.font = '10px monospace';
        ctx.fillStyle = '#71717A';
        ctx.fillText(formatCanvasMath(`Nhiệt độ T: ${tempKelvin}K (Dao động nhiệt) • Kéo chuột để xoay 360°`), 18, 42);

      // ==============================================================
      // 2. MODE B: HIGH-CRAFT REACTION GLASSWARE & ARRHENIUS CURVE
      // ==============================================================
      } else if (
        blueprint.templateId === 'CHEM_REACTION_LAB' ||
        activeSubMode === 'REACTION_GLASSWARE'
      ) {
        const concentration = params.concentration ?? params.CM ?? 1.5;
        const temperature = params.temperature ?? params.T ?? 25;
        const hasCatalyst = isOlympiad ? (params.catalyst ?? 1) > 0 : false;
        const rateFactor = Math.min(1.0, (concentration * (temperature + 10)) / 100);

        // LEFT VIEW: Studio Glassware Beaker (Graduated Cylinder)
        const bkrX = 55;
        const bkrY = 55;
        const bkrW = 150;
        const bkrH = 210;

        // Glass Beaker Drop Shadow & Backdrop
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(bkrX, bkrY, bkrW, bkrH);

        // Liquid fill with dynamic temperature color
        const liquidTopY = bkrY + 45;
        const liquidH = bkrH - 45;
        const rustFactor = Math.min(1, temperature / 75);
        const liqGrad = ctx.createLinearGradient(bkrX, liquidTopY, bkrX + bkrW, bkrY + bkrH);
        liqGrad.addColorStop(0, `rgba(${Math.round(37 + rustFactor * 180)}, ${Math.round(99 - rustFactor * 60)}, 235, 0.35)`);
        liqGrad.addColorStop(1, `rgba(${Math.round(30 + rustFactor * 190)}, ${Math.round(64 - rustFactor * 40)}, 175, 0.55)`);

        ctx.fillStyle = liqGrad;
        ctx.beginPath();
        ctx.moveTo(bkrX, liquidTopY);
        // Sinusoidal liquid surface meniscus wave
        for (let x = 0; x <= bkrW; x += 5) {
          const waveY = liquidTopY + Math.sin(x * 0.05 + t * 4) * 2.2;
          ctx.lineTo(bkrX + x, waveY);
        }
        ctx.lineTo(bkrX + bkrW, bkrY + bkrH);
        ctx.lineTo(bkrX, bkrY + bkrH);
        ctx.closePath();
        ctx.fill();

        // Precipitate Crystal Sedimentation at bottom
        crystalsRef.current.forEach((c) => {
          ctx.save();
          ctx.translate(c.x, c.y);
          ctx.rotate(c.rotation + Math.sin(t) * 0.05);
          ctx.fillStyle = c.color;
          ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size);
          ctx.restore();
        });

        // Rising Gas Bubbles with Specular Glint
        if (Math.random() < 0.65 * rateFactor) {
          bubblesRef.current.push({
            x: bkrX + 15 + Math.random() * (bkrW - 30),
            y: bkrY + bkrH - 15,
            r: 2.5 + Math.random() * 4.5,
            vy: 1.2 + (temperature / 25) * 1.8,
            opacity: 0.85,
          });
        }

        bubblesRef.current = bubblesRef.current.filter((b) => {
          b.y -= b.vy;
          // Render 3D bubble
          const bGrad = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.1, b.x, b.y, b.r);
          bGrad.addColorStop(0, '#FFFFFF');
          bGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.7)');
          bGrad.addColorStop(0.9, 'rgba(147, 197, 253, 0.3)');
          bGrad.addColorStop(1, 'rgba(37, 99, 235, 0.5)');

          ctx.fillStyle = bGrad;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fill();
          return b.y > liquidTopY;
        });

        // Realistic Glass Highlights & Tick Marks
        ctx.strokeStyle = '#78716C';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(bkrX, bkrY, bkrW, bkrH);

        // Glass Specular Vertical White Streaks
        const glassStreak = ctx.createLinearGradient(bkrX, 0, bkrX + bkrW, 0);
        glassStreak.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
        glassStreak.addColorStop(0.08, 'rgba(255, 255, 255, 0.05)');
        glassStreak.addColorStop(0.88, 'rgba(255, 255, 255, 0.1)');
        glassStreak.addColorStop(1, 'rgba(255, 255, 255, 0.8)');
        ctx.fillStyle = glassStreak;
        ctx.fillRect(bkrX + 2, bkrY + 2, bkrW - 4, bkrH - 4);

        // Graduated Volume Ticks
        ctx.fillStyle = '#57534E';
        ctx.font = '9px monospace';
        [50, 100, 150, 200].forEach((ml, idx) => {
          const ty = bkrY + bkrH - (idx + 1) * 38;
          ctx.beginPath();
          ctx.moveTo(bkrX + bkrW - 14, ty);
          ctx.lineTo(bkrX + bkrW - 2, ty);
          ctx.strokeStyle = '#78716C';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillText(`${ml}ml`, bkrX + bkrW - 44, ty + 3);
        });

        // RIGHT VIEW: Arrhenius Activation Energy Profile
        const eLeft = 270;
        const eRight = 595;
        const eTop = 45;
        const eBottom = LH - 35;
        const eW = eRight - eLeft;
        const eH = eBottom - eTop;

        // Header
        ctx.fillStyle = '#2563EB';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(formatCanvasMath('GIẢN ĐỒ NĂNG LƯỢNG HOẠT HÓA (ARRHENIUS PROFILE)'), eLeft, 24);

        // Axes
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(eLeft, eBottom);
        ctx.lineTo(eRight, eBottom);
        ctx.moveTo(eLeft, eTop);
        ctx.lineTo(eLeft, eBottom);
        ctx.stroke();

        ctx.fillStyle = '#57534E';
        ctx.font = '10px monospace';
        ctx.fillText(formatCanvasMath('Tiến trình phản ứng'), eRight - 85, eBottom + 20);
        ctx.fillText(formatCanvasMath('Thế năng E (kJ/mol)'), eLeft + 8, eTop - 6);

        // Energy levels
        const rLevel = eBottom - 0.42 * eH; // Reactants
        const pLevel = eBottom - 0.22 * eH; // Products (Exothermic ΔH < 0)
        const uncatEaPeak = eTop + 0.12 * eH;
        const catEaPeak = eTop + 0.32 * eH; // Lowered by catalyst

        // Uncatalyzed Profile (Vermilion Rose)
        ctx.strokeStyle = '#E11D48';
        ctx.lineWidth = 2.75;
        ctx.beginPath();
        ctx.moveTo(eLeft + 15, rLevel);
        ctx.bezierCurveTo(eLeft + 65, rLevel, eLeft + 90, uncatEaPeak, eLeft + 160, uncatEaPeak);
        ctx.bezierCurveTo(eLeft + 230, uncatEaPeak, eLeft + 250, pLevel, eRight - 15, pLevel);
        ctx.stroke();

        // Catalyzed Profile if Olympiad (Cobalt Blue dashed)
        if (hasCatalyst || isOlympiad) {
          ctx.save();
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = '#2563EB';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(eLeft + 15, rLevel);
          ctx.bezierCurveTo(eLeft + 65, rLevel, eLeft + 90, catEaPeak, eLeft + 160, catEaPeak);
          ctx.bezierCurveTo(eLeft + 230, catEaPeak, eLeft + 250, pLevel, eRight - 15, pLevel);
          ctx.stroke();
          ctx.restore();

          // Catalyst Energy Drop Annotation
          ctx.fillStyle = '#2563EB';
          ctx.font = 'bold 10px monospace';
          ctx.fillText(formatCanvasMath(`↓ Ea giảm khi có xúc tác (ΔEa = 45 kJ)`), eLeft + 175, catEaPeak - 6);
        }

        // Reactants & Products Labels
        ctx.fillStyle = '#18181B';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(formatCanvasMath('Chất tham gia (Fe + O₂)'), eLeft + 10, rLevel - 8);
        ctx.fillText(formatCanvasMath('Sản phẩm (Fe₂O₃)'), eRight - 105, pLevel - 8);

        // Exothermic ΔH readout
        ctx.fillStyle = '#059669';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(formatCanvasMath('Tỏa nhiệt: ΔH = -824.2 kJ/mol'), eLeft + 30, LH - 12);

      // ==============================================================
      // 3. MODE C: ACID-BASE TITRATION & PH CURVE
      // ==============================================================
      } else if (blueprint.templateId === 'CHEM_EQUILIBRIUM_TITRATION') {
        const Va = 25.0;
        const Ca = 0.1;
        const Cb = 0.1;
        const Vb = Math.max(0, Math.min(50, params.Vb ?? 20.0));
        const Veq = (Ca * Va) / Cb;

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

        let solColor = 'rgba(241, 245, 249, 0.5)';
        let indicatorName = 'Chưa đổi màu (Không màu)';
        if (pH >= 8.2 && pH <= 10.0) {
          const alpha = (pH - 8.2) / 1.8;
          solColor = `rgba(244, 63, 94, ${0.2 + alpha * 0.4})`;
          indicatorName = 'Hồng nhạt (Khoảng chuyển màu)';
        } else if (pH > 10.0) {
          solColor = 'rgba(225, 29, 72, 0.75)';
          indicatorName = 'Hồng tím đậm (Dư bazơ)';
        }

        // Left Burette & Conical Flask
        const bX = 125;
        const bY = 25;
        const bW = 18;
        const bH = 140;

        // Burette thủy tinh: thân trong, chất lỏng có bóng và mặt khum, vạch chia mỗi 5 mL
        const bGlass = ctx.createLinearGradient(bX, 0, bX + bW, 0);
        bGlass.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        bGlass.addColorStop(0.35, 'rgba(226, 232, 240, 0.35)');
        bGlass.addColorStop(1, 'rgba(148, 163, 184, 0.45)');
        roundRectPath(ctx, bX, bY, bW, bH, 4);
        ctx.fillStyle = bGlass;
        ctx.fill();

        const liquidH = Math.max(5, (1 - Vb / 50) * bH);
        const liqTop = bY + (bH - liquidH);
        const bLiquid = ctx.createLinearGradient(bX, 0, bX + bW, 0);
        bLiquid.addColorStop(0, 'rgba(147, 197, 253, 0.9)');
        bLiquid.addColorStop(0.5, 'rgba(59, 130, 246, 0.6)');
        bLiquid.addColorStop(1, 'rgba(30, 64, 175, 0.55)');
        ctx.fillStyle = bLiquid;
        ctx.fillRect(bX + 2, liqTop, bW - 4, liquidH);
        ctx.strokeStyle = 'rgba(30, 64, 175, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bX + 2, liqTop);
        ctx.quadraticCurveTo(bX + bW / 2, liqTop + 3.5, bX + bW - 2, liqTop);
        ctx.stroke();

        ctx.strokeStyle = '#78716C';
        ctx.fillStyle = '#57534E';
        ctx.lineWidth = 1;
        ctx.font = '9px ui-monospace, monospace';
        ctx.textAlign = 'right';
        for (let v = 0; v <= 50; v += 5) {
          const ty = bY + (v / 50) * bH;
          const long = v % 10 === 0;
          ctx.beginPath();
          ctx.moveTo(bX, ty);
          ctx.lineTo(bX + (long ? 8 : 5), ty);
          ctx.stroke();
          if (long) ctx.fillText(String(v), bX - 4, ty + 3);
        }
        ctx.textAlign = 'start';
        ctx.strokeStyle = '#78716C';
        ctx.lineWidth = 2;
        roundRectPath(ctx, bX, bY, bW, bH, 4);
        ctx.stroke();
        // Khóa burette
        ctx.fillStyle = '#A8A29E';
        ctx.fillRect(bX + bW / 2 - 9, bY + bH + 2, 18, 5);
        ctx.fillRect(bX + bW / 2 + 5, bY + bH - 1, 10, 3);

        // Burette tip
        ctx.beginPath();
        ctx.moveTo(bX + bW / 2, bY + bH);
        ctx.lineTo(bX + bW / 2, bY + bH + 20);
        ctx.stroke();

        // Droplets
        const dropY = bY + bH + 20 + ((t * 2.5) % 1) * 32;
        ctx.fillStyle = '#2563EB';
        ctx.beginPath();
        ctx.arc(bX + bW / 2, dropY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Conical flask
        const flaskTopX = bX + bW / 2;
        const flaskTopY = bY + bH + 55;
        const flaskW = 110;
        const flaskH = 80;

        ctx.fillStyle = 'rgba(20, 20, 19, 0.1)';
        ctx.beginPath();
        ctx.ellipse(flaskTopX, flaskTopY + flaskH + 3, flaskW / 2 + 6, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(flaskTopX - 16, flaskTopY);
        ctx.lineTo(flaskTopX - 16, flaskTopY + 15);
        ctx.lineTo(flaskTopX - flaskW / 2, flaskTopY + flaskH);
        ctx.lineTo(flaskTopX + flaskW / 2, flaskTopY + flaskH);
        ctx.lineTo(flaskTopX + 16, flaskTopY + 15);
        ctx.lineTo(flaskTopX + 16, flaskTopY);
        ctx.closePath();
        ctx.strokeStyle = '#78716C';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = solColor;
        ctx.beginPath();
        ctx.moveTo(flaskTopX - 25, flaskTopY + 30);
        ctx.lineTo(flaskTopX - flaskW / 2 + 5, flaskTopY + flaskH - 3);
        ctx.lineTo(flaskTopX + flaskW / 2 - 5, flaskTopY + flaskH - 3);
        ctx.lineTo(flaskTopX + 25, flaskTopY + 30);
        ctx.closePath();
        ctx.fill();
        const flaskShade = ctx.createLinearGradient(flaskTopX - flaskW / 2, 0, flaskTopX + flaskW / 2, 0);
        flaskShade.addColorStop(0.12, 'rgba(255, 255, 255, 0.45)');
        flaskShade.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
        flaskShade.addColorStop(1, 'rgba(15, 23, 42, 0.14)');
        ctx.fillStyle = flaskShade;
        ctx.fill();
        // vệt sáng trên thành bình
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(flaskTopX - 12, flaskTopY + 6);
        ctx.lineTo(flaskTopX - 12, flaskTopY + 16);
        ctx.lineTo(flaskTopX - flaskW / 2 + 12, flaskTopY + flaskH - 12);
        ctx.stroke();

        // Right Panel: Analytical Titration Curve
        const pLeft = 285;
        const pRight = 595;
        const pTop = 45;
        const pBottom = LH - 35;
        const pW = pRight - pLeft;
        const pH_H = pBottom - pTop;

        ctx.fillStyle = '#2563EB';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(formatCanvasMath('ĐƯỜNG CONG CHUẨN ĐỘ AXIT - BAZƠ'), pLeft, 24);

        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pLeft, pBottom);
        ctx.lineTo(pRight, pBottom);
        ctx.moveTo(pLeft, pTop);
        ctx.lineTo(pLeft, pBottom);
        ctx.stroke();

        // Dải đổi màu của chỉ thị (pH 8,2–10) và điểm tương đương
        const yBandTop = pBottom - (10 / 14) * pH_H;
        const yBandBot = pBottom - (8.2 / 14) * pH_H;
        ctx.fillStyle = 'rgba(244, 63, 94, 0.1)';
        ctx.fillRect(pLeft, yBandTop, pW, yBandBot - yBandTop);
        ctx.font = '9px ui-monospace, monospace';
        ctx.fillStyle = '#E11D48';
        ctx.fillText('chỉ thị đổi màu', pRight - 80, yBandTop - 3);
        const eqX = pLeft + (Veq / 50) * pW;
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.7)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(eqX, pTop);
        ctx.lineTo(eqX, pBottom);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#B45309';
        ctx.fillText(`V tương đương = ${Veq.toFixed(0)} mL`, eqX + 4, pTop + 10);
        ctx.fillStyle = '#78716C';
        ctx.textAlign = 'center';
        for (const xv of [0, 25, 50]) ctx.fillText(`${xv}`, pLeft + (xv / 50) * pW, pBottom + 12);
        ctx.fillText('V bazơ (mL)', pLeft + pW / 2, pBottom + 24);
        ctx.textAlign = 'right';
        for (const yv of [0, 7, 14]) ctx.fillText(`${yv}`, pLeft - 4, pBottom - (yv / 14) * pH_H + 3);
        ctx.textAlign = 'start';

        // Sigmoidal Curve
        ctx.strokeStyle = '#2563EB';
        ctx.lineWidth = 2.75;
        ctx.beginPath();
        for (let v = 0; v <= 50; v += 0.5) {
          let phVal = 7.0;
          if (v < Veq - 0.05) {
            const h = (Ca * Va - Cb * v) / (Va + v);
            phVal = -Math.log10(Math.max(1e-7, h));
          } else if (v > Veq + 0.05) {
            const oh = (Cb * v - Ca * Va) / (Va + v);
            phVal = 14.0 - (-Math.log10(Math.max(1e-7, oh)));
          }
          phVal = Math.max(1.0, Math.min(13.0, phVal));
          const px = pLeft + (v / 50) * pW;
          const py = pBottom - (phVal / 14) * pH_H;
          if (v === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Current Indicator Point
        const curPx = pLeft + (Vb / 50) * pW;
        const curPy = pBottom - (pH / 14) * pH_H;
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = pH >= 8.2 ? '#E11D48' : '#2563EB';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(curPx, curPy, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        hudCard(
          ctx,
          [
            { text: formatCanvasMath(`pH hiện tại: ${pH.toFixed(2)}`), bold: true, color: pH >= 8.2 ? '#BE123C' : '#1D4ED8' },
            { text: formatCanvasMath(indicatorName), color: '#57534E' },
          ],
          pRight - 176,
          pBottom - 54,
        );

      // ==============================================================
      // 4. MODE D: CHEMICAL BALANCE SCALE (Bảo toàn khối lượng)
      // ==============================================================
      } else {
        const c1 = params.c1 ?? 4;
        const c2 = params.c2 ?? 3;
        const c3 = params.c3 ?? 2;
        const leftMass = c1 * 2 + c2 * 2;
        const rightMass = c3 * 3;
        const diff = rightMass - leftMass;
        const tiltAngle = Math.max(-0.25, Math.min(0.25, diff * 0.06));

        const cx = LW / 2;
        const cy = 175;

        // Beam
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(tiltAngle);

        ctx.strokeStyle = diff === 0 ? '#059669' : '#D97706';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(-170, 0);
        ctx.lineTo(170, 0);
        ctx.stroke();

        // Left Pan
        ctx.fillStyle = '#2563EB';
        ctx.fillRect(-205, -35, 70, 35);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`Trái: ${leftMass} O`, -195, -12);

        // Right Pan
        ctx.fillStyle = '#E11D48';
        ctx.fillRect(135, -35, 70, 35);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`Phải: ${rightMass} O`, 145, -12);
        ctx.restore();

        // Fulcrum Stand
        ctx.fillStyle = '#78716C';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - 25, cy + 90);
        ctx.lineTo(cx + 25, cy + 90);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = diff === 0 ? '#059669' : '#D97706';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          diff === 0
            ? 'Cân bằng hoàn hảo! Định luật Bảo toàn Khối lượng Lomonosov được thỏa mãn'
            : 'Hai vế chưa thăng bằng số nguyên tử Oxi! Đĩa cân đang bị lệch',
          cx,
          LH - 25
        );
        ctx.textAlign = 'start';
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [blueprint, params, curriculumLevel, selectedMolecule, activeSubMode, rotX, rotY]);

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Molecule Preset Pills (only shown if molecular mode) */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 font-semibold">
            Chế độ Hóa học:
          </span>
          <button
            type="button"
            onClick={() => setActiveSubMode('MOLECULAR_3D')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition cursor-pointer border ${
              activeSubMode === 'MOLECULAR_3D'
                ? 'bg-blue-50 text-blue-700 border-blue-200 font-bold shadow-xs'
                : 'bg-white text-stone-600 border-[#E6E4DD] hover:bg-stone-50'
            }`}
          >
            3D Molecular Studio
          </button>
          <button
            type="button"
            onClick={() => setActiveSubMode('REACTION_GLASSWARE')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition cursor-pointer border ${
              activeSubMode === 'REACTION_GLASSWARE'
                ? 'bg-blue-50 text-blue-700 border-blue-200 font-bold shadow-xs'
                : 'bg-white text-stone-600 border-[#E6E4DD] hover:bg-stone-50'
            }`}
          >
            Ống nghiệm & Arrhenius
          </button>
          <button
            type="button"
            onClick={() => setActiveSubMode('AUTO')}
            className={`px-2 py-1 rounded-md text-[10px] font-mono transition cursor-pointer border ${
              activeSubMode === 'AUTO'
                ? 'bg-[#F2F0EA] text-stone-900 border-[#DCD9D0] font-bold'
                : 'bg-white text-stone-500 border-[#E6E4DD]'
            }`}
          >
            Tự động theo bài
          </button>
        </div>

        {activeSubMode === 'MOLECULAR_3D' && (
          <div className="flex items-center gap-1 bg-[#F2F0EA] p-0.5 rounded-lg border border-[#E6E4DD]">
            {(['BENZENE', 'WATER', 'METHANE', 'AMMONIA', 'ETHANOL'] as MoleculePreset[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedMolecule(m)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition cursor-pointer ${
                  selectedMolecule === m
                    ? 'bg-white text-stone-900 shadow-2xs font-bold'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {m === 'BENZENE' ? 'C₆H₆' : m === 'WATER' ? 'H₂O' : m === 'METHANE' ? 'CH₄' : m === 'AMMONIA' ? 'NH₃' : 'C₂H₅OH'}
              </button>
            ))}
          </div>
        )}
      </div>

      <canvas
        ref={canvasRef}
        width={620}
        height={340}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="rounded-2xl bg-[#FCFBF9] border border-[#E6E4DD] shadow-[0_4px_24px_-4px_rgba(20,20,19,0.06)] w-full object-contain cursor-grab active:cursor-grabbing"
      />
    </div>
  );
};
