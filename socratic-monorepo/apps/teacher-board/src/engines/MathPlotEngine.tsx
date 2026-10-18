// apps/teacher-board/src/engines/MathPlotEngine.tsx
'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { SimulationBlueprint } from '@socratic/types';
import { Sparkles, Activity, RefreshCw } from 'lucide-react';

interface Props {
  blueprint: SimulationBlueprint;
  params: Record<string, number>;
}

export const MathPlotEngine: React.FC<Props> = ({ blueprint, params }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Check if formula is better suited for SymPy / Python Neon (integrals, harmonic oscillation, etc.)
  const isComplexMath = useMemo(() => {
    const f = (blueprint.recognizedLatex || '').toLowerCase();
    return (
      f.includes('\\int') ||
      f.includes('int') ||
      f.includes('\\pi') ||
      f.includes('\\cos') ||
      f.includes('cos') ||
      blueprint.templateId === 'PYTHON_PLOT' ||
      blueprint.templateId === 'MATH_INTEGRAL'
    );
  }, [blueprint.recognizedLatex, blueprint.templateId]);

  const [viewMode, setViewMode] = useState<'PYTHON_SVG' | 'CANVAS'>(() =>
    isComplexMath ? 'PYTHON_SVG' : 'CANVAS'
  );

  const [svgData, setSvgData] = useState<string | null>(null);
  const [svgLoading, setSvgLoading] = useState(false);
  const [svgError, setSvgError] = useState<string | null>(null);

  // Auto-switch to PYTHON_SVG if an integral or harmonic equation is provided
  useEffect(() => {
    if (isComplexMath) {
      setViewMode('PYTHON_SVG');
    }
  }, [isComplexMath]);

  // Fetch dynamic dark-neon SVG from Python FastAPI backend
  useEffect(() => {
    let isCancelled = false;

    const fetchPythonPlot = async () => {
      setSvgLoading(true);
      setSvgError(null);

      const a = params.a ?? params.A ?? 1;
      const b = params.b ?? 0;
      const c = params.c ?? params.omega ?? 0;
      const d = params.d ?? params.phi ?? 0;
      const eq = blueprint.recognizedLatex || 'A * sin(x)';

      const url = `http://localhost:8000/api/v1/plot?equation=${encodeURIComponent(
        eq
      )}&a=${a}&b=${b}&c=${c}&d=${d}&format=json`;

      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!isCancelled && data.svg) {
          setSvgData(data.svg);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.warn('[MathPlotEngine] Python SVG fetch fallback:', err);
          setSvgError('Không kết nối được Python Backend :8000');
        }
      } finally {
        if (!isCancelled) {
          setSvgLoading(false);
        }
      }
    };

    fetchPythonPlot();

    return () => {
      isCancelled = true;
    };
  }, [blueprint.recognizedLatex, params]);

  // HTML5 60FPS Canvas Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const originX = width / 2;
    const originY = height / 2;
    const scale = 38; // 38px = 1 Oxy unit

    ctx.clearRect(0, 0, width, height);

    // 1. Grid Oxy
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let x = originX % scale; x < width; x += scale) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = originY % scale; y < height; y += scale) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 2. Axes Ox, Oy with arrows and tick labels
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(width, originY);
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, height);
    ctx.stroke();

    // Axis Arrows
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '11px monospace';
    ctx.fillText('x', width - 15, originY - 8);
    ctx.fillText('y', originX + 8, 16);
    ctx.fillText('O', originX - 14, originY + 16);

    // 3. Render according to template
    if (blueprint.templateId === 'MATH_CONIC_2D') {
      const a = params.a ?? 0;
      const b = params.b ?? 0;
      const aAxis = (params.aAxis ?? params.R ?? 3) * scale;
      const bAxis = (params.bAxis ?? params.R ?? 2) * scale;

      ctx.save();
      ctx.strokeStyle = '#c084fc';
      ctx.fillStyle = 'rgba(192, 132, 252, 0.15)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(
        originX + a * scale,
        originY - b * scale,
        Math.abs(aAxis),
        Math.abs(bAxis),
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.fill();

      // Center
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(originX + a * scale, originY - b * scale, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (blueprint.templateId === 'MATH_FUNC_2D') {
      const a = params.a ?? 0;
      const b = params.b ?? 0;
      const c = params.c ?? (a === 0 && b === 0 ? 2 : 0);
      const d = params.d ?? (a === 0 && b === 0 ? 1 : 0);
      const x0 = params.x0 ?? 1;

      const evalY = (xVal: number) => {
        return a * Math.pow(xVal, 3) + b * Math.pow(xVal, 2) + c * xVal + d;
      };

      const evalSlope = (xVal: number) => {
        return 3 * a * Math.pow(xVal, 2) + 2 * b * xVal + c;
      };

      // 1. Plot Main Function Curve
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      let first = true;
      for (let px = 0; px <= width; px += 2) {
        const mx = (px - originX) / scale;
        const my = evalY(mx);
        const py = originY - my * scale;

        if (py >= -200 && py <= height + 200) {
          if (first) {
            ctx.moveTo(px, py);
            first = false;
          } else {
            ctx.lineTo(px, py);
          }
        } else {
          first = true;
        }
      }
      ctx.stroke();

      // 2. Tangent Line at x0
      const y0 = evalY(x0);
      const slope = evalSlope(x0);
      const ptX = originX + x0 * scale;
      const ptY = originY - y0 * scale;

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const tanSpan = 80;
      ctx.moveTo(ptX - tanSpan, ptY + tanSpan * slope);
      ctx.lineTo(ptX + tanSpan, ptY - tanSpan * slope);
      ctx.stroke();

      // Tangent point marker
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(ptX, ptY, 5, 0, Math.PI * 2);
      ctx.fill();

      // 3. Mark Y-intercept (0, d)
      const yIntX = originX;
      const yIntY = originY - d * scale;
      if (yIntY >= 0 && yIntY <= height) {
        ctx.fillStyle = '#34d399';
        ctx.beginPath();
        ctx.arc(yIntX, yIntY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '10px monospace';
        ctx.fillText(`(0, ${d})`, yIntX + 8, yIntY - 4);
      }

      // 4. Mark X-intercept for linear (y = cx + d => x = -d/c)
      if (a === 0 && b === 0 && c !== 0) {
        const rootX = -d / c;
        const rootPx = originX + rootX * scale;
        if (rootPx >= 0 && rootPx <= width) {
          ctx.fillStyle = '#ec4899';
          ctx.beginPath();
          ctx.arc(rootPx, originY, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = '10px monospace';
          ctx.fillText(`(${Number(rootX.toFixed(2))}, 0)`, rootPx - 20, originY + 16);
        }
      }

      // Curve label badge on canvas
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(15, 15, 220, 48);
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(15, 15, 220, 48);

      ctx.fillStyle = '#22d3ee';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(blueprint.recognizedLatex, 25, 34);

      ctx.fillStyle = '#f59e0b';
      ctx.font = '11px sans-serif';
      ctx.fillText(
        `Hệ số góc tại x₀ = ${x0}: k = ${Number(slope.toFixed(2))}`,
        25,
        52
      );
    } else {
      // Default: MATH_TRIG_WAVE -> y = A * sin(omega * x + phi) + D
      const A = params.A ?? 2;
      const omega = params.omega ?? 3;
      const phi = params.phi ?? 0;
      const D = params.D ?? 0;

      // Shaded Area [0, PI]
      ctx.fillStyle = 'rgba(34, 211, 238, 0.18)';
      ctx.beginPath();
      ctx.moveTo(originX, originY - D * scale);
      for (let px = originX; px <= originX + Math.PI * scale; px += 2) {
        const mx = (px - originX) / scale;
        const my = A * Math.sin(omega * mx + phi) + D;
        ctx.lineTo(px, originY - my * scale);
      }
      ctx.lineTo(originX + Math.PI * scale, originY - D * scale);
      ctx.closePath();
      ctx.fill();

      // Sine Curve
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      for (let px = 0; px <= width; px += 2) {
        const mx = (px - originX) / scale;
        const my = A * Math.sin(omega * mx + phi) + D;
        const py = originY - my * scale;
        if (px === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Curve label badge on canvas
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(15, 15, 200, 36);
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(15, 15, 200, 36);

      ctx.fillStyle = '#22d3ee';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(blueprint.recognizedLatex, 25, 38);
    }
  }, [blueprint, params]);

  return (
    <div className="flex flex-col items-center w-full max-w-[620px] gap-2">
      {/* Top Engine Mode Switcher */}
      <div className="flex items-center justify-between w-full px-2">
        <span className="text-[11px] font-mono text-cyan-400 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5" />
          <span>{viewMode === 'PYTHON_SVG' ? 'Python SymPy Matplotlib' : '60FPS HTML5 Canvas'}</span>
        </span>
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => setViewMode('PYTHON_SVG')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition cursor-pointer ${
              viewMode === 'PYTHON_SVG'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🐍 Python Neon
          </button>
          <button
            type="button"
            onClick={() => setViewMode('CANVAS')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition cursor-pointer ${
              viewMode === 'CANVAS'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚡ 60FPS Canvas
          </button>
        </div>
      </div>

      {/* RENDER VIEW AREA */}
      <div className="relative w-full aspect-[620/340] rounded-2xl bg-slate-950 border border-white/10 shadow-inner overflow-hidden flex items-center justify-center">
        {/* Python Neon SVG View */}
        {viewMode === 'PYTHON_SVG' && (
          <div className="w-full h-full flex items-center justify-center p-1">
            {svgLoading && !svgData && (
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Đang render đồ thị Python...</span>
              </div>
            )}
            {svgData ? (
              <div
                className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
                dangerouslySetInnerHTML={{ __html: svgData }}
              />
            ) : svgError ? (
              <div className="flex flex-col items-center gap-1 text-xs text-rose-300 p-4 text-center">
                <span>{svgError}</span>
                <button
                  onClick={() => setViewMode('CANVAS')}
                  className="mt-2 px-3 py-1 rounded-lg bg-white/10 text-cyan-300 text-[11px] hover:bg-white/20"
                >
                  Chuyển sang 60FPS Canvas
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* HTML5 Canvas View (Always kept in DOM for high performance & unit tests) */}
        <canvas
          ref={canvasRef}
          width={620}
          height={340}
          className={`w-full h-full object-contain ${
            viewMode === 'CANVAS' ? 'block' : 'hidden'
          }`}
        />
      </div>
    </div>
  );
};
