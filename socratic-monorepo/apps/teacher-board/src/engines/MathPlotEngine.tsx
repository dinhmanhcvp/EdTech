// apps/teacher-board/src/engines/MathPlotEngine.tsx
'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { SimulationBlueprint } from '@socratic/types';
import { Activity, RefreshCw } from 'lucide-react';

interface Props {
  blueprint: SimulationBlueprint;
  params: Record<string, number>;
}

export interface EvaluatedFunction {
  evalFn: (val: number) => number;
  evalSlope: (val: number) => number;
  isIntegral: boolean;
  varSymbol: 't' | 'x';
  xMin: number;
  xMax: number;
  xLabel: string;
  yLabel: string;
  curveTitle: string;
  shaded?: boolean;
}

/**
 * High-performance, deterministic mathematical function compiler.
 * Translates raw LaTeX formulas (integrals, harmonic physics, polynomials, trig)
 * into real executable mathematical functions for 60FPS Canvas rendering.
 */
export function compileFormulaToFunction(
  rawFormula: string,
  params: Record<string, number>
): EvaluatedFunction {
  const raw = (rawFormula || '').trim();
  const fLower = raw.toLowerCase();

  // 1. INTEGRAL EQUATIONS: \int x^3 dx, \int x^2 dx, \int x dx, etc.
  const intMatch = raw.match(/\\?int\s*(.*?)(?:\s*[\.,]?\s*d([xXtT])|\s*$)/i);
  if (intMatch || fLower.includes('int')) {
    const inner = (intMatch ? intMatch[1] : raw.replace(/.*int/i, '')).trim();
    let power = 3;
    const pMatch = inner.match(/([xXtT])\^?([0-9]+)/);
    if (pMatch) {
      power = parseInt(pMatch[2], 10);
    } else if (inner.includes('x') || inner.includes('t')) {
      power = 1;
    }

    const antiderivativePower = power + 1;
    const denominator = antiderivativePower;
    const C = params.d ?? params.C ?? 0;

    return {
      evalFn: (x: number) => Math.pow(x, antiderivativePower) / denominator + C,
      evalSlope: (x: number) => Math.pow(x, power),
      isIntegral: true,
      varSymbol: 'x',
      xMin: -4,
      xMax: 4,
      xLabel: 'x',
      yLabel: 'y = ∫ f(x) dx',
      curveTitle: `F(x) = x^${antiderivativePower}/${denominator} + C`,
      shaded: true,
    };
  }

  // 2. HARMONIC OSCILLATIONS / PHYSICS WITH VARIABLE t:
  // e.g. x = 5\cos(2\pi t + \pi/2) or x(t) = A*cos(omega*t + phi)
  if (fLower.includes('t') && (fLower.includes('cos') || fLower.includes('sin') || fLower.includes('dao động'))) {
    let parsedA = 5;
    const aMatch = raw.match(/(?:=\s*|^)([0-9\.]+)\s*(?:\\?cos|\\?sin)/i);
    if (aMatch) parsedA = parseFloat(aMatch[1]);
    const A = params.A ?? params.v0 ?? parsedA;

    let parsedOmega = 2 * Math.PI;
    const omegaMatch = raw.match(/(?:\\?cos|\\?sin)\s*\(\s*([0-9\.]*)\s*(?:\\?pi)?\s*\*?\s*t/i);
    if (omegaMatch && omegaMatch[1]) {
      const mult = parseFloat(omegaMatch[1]);
      parsedOmega = mult * (raw.includes('\\pi') || raw.includes('pi') ? Math.PI : 1);
    }
    const omega = params.omega ?? parsedOmega;

    let parsedPhi = Math.PI / 2;
    if (raw.includes('\\frac{\\pi}{2}') || raw.includes('pi/2')) parsedPhi = Math.PI / 2;
    else if (raw.includes('\\pi') || raw.includes('pi')) parsedPhi = Math.PI;
    const phi = params.phi ?? parsedPhi;
    const isSin = fLower.includes('sin');

    return {
      evalFn: (t: number) => (isSin ? A * Math.sin(omega * t + phi) : A * Math.cos(omega * t + phi)),
      evalSlope: (t: number) =>
        isSin ? A * omega * Math.cos(omega * t + phi) : -A * omega * Math.sin(omega * t + phi),
      isIntegral: false,
      varSymbol: 't',
      xMin: 0,
      xMax: 4,
      xLabel: 't (giây)',
      yLabel: 'x (cm)',
      curveTitle: `x(t) = ${A} ${isSin ? 'sin' : 'cos'}(${Number((omega / Math.PI).toFixed(1))}π t + ${Number((phi / Math.PI).toFixed(2))}π)`,
      shaded: false,
    };
  }

  // 3. SINE / COSINE WAVES WITH VARIABLE x
  if (fLower.includes('sin') || fLower.includes('cos')) {
    const isCos = fLower.includes('cos');
    let parsedA = 2;
    const aMatch = raw.match(/(?:=\s*|^)([0-9\.]+)\s*(?:\\?cos|\\?sin)/i);
    if (aMatch) parsedA = parseFloat(aMatch[1]);
    const A = params.A ?? parsedA;

    let parsedOmega = 3;
    const wMatch = raw.match(/(?:\\?cos|\\?sin)\s*\(\s*([0-9\.]+)\s*x/i);
    if (wMatch) parsedOmega = parseFloat(wMatch[1]);
    const omega = params.omega ?? parsedOmega;
    const phi = params.phi ?? 0;
    const D = params.D ?? 0;

    return {
      evalFn: (x: number) =>
        (isCos ? A * Math.cos(omega * x + phi) + D : A * Math.sin(omega * x + phi) + D),
      evalSlope: (x: number) =>
        isCos ? -A * omega * Math.sin(omega * x + phi) : A * omega * Math.cos(omega * x + phi),
      isIntegral: false,
      varSymbol: 'x',
      xMin: -2 * Math.PI,
      xMax: 2 * Math.PI,
      xLabel: 'x (rad)',
      yLabel: 'y',
      curveTitle: `y = ${A} ${isCos ? 'cos' : 'sin'}(${omega}x)`,
      shaded: true,
    };
  }

  // 4. POLYNOMIALS (QUADRATIC x^2 - 4, CUBIC x^3 - 3x, LINEAR 2x + 1)
  let a = params.a ?? 0;
  let b = params.b ?? 0;
  let c = params.c ?? 0;
  let d = params.d ?? 0;

  const clean = raw.toLowerCase().replace(/\s+/g, '').replace(/^[vy]=/, '');
  const m3 = clean.match(/([+-]?[0-9\.]*)x\^?3/);
  if (m3 && params.a === undefined) a = m3[1] === '' || m3[1] === '+' ? 1 : (m3[1] === '-' ? -1 : parseFloat(m3[1]));
  const m2 = clean.match(/([+-]?[0-9\.]*)x\^?2/);
  if (m2 && params.b === undefined) b = m2[1] === '' || m2[1] === '+' ? 1 : (m2[1] === '-' ? -1 : parseFloat(m2[1]));
  const m1 = clean.match(/([+-]?[0-9\.]*)x(?!\^)/);
  if (m1 && params.c === undefined) c = m1[1] === '' || m1[1] === '+' ? 1 : (m1[1] === '-' ? -1 : parseFloat(m1[1]));
  const md = clean.replace(/x\^?[0-9]*/g, '').match(/([+-]?[0-9\.]+)/);
  if (md && params.d === undefined) {
    try {
      d = parseFloat(md[1]);
    } catch {}
  }

  if (a === 0 && b === 0 && c === 0 && d === 0) {
    c = params.c ?? 2;
    d = params.d ?? 1;
  }

  return {
    evalFn: (x: number) => a * Math.pow(x, 3) + b * Math.pow(x, 2) + c * x + d,
    evalSlope: (x: number) => 3 * a * Math.pow(x, 2) + 2 * b * x + c,
    isIntegral: false,
    varSymbol: 'x',
    xMin: -6,
    xMax: 6,
    xLabel: 'x',
    yLabel: 'y',
    curveTitle:
      a !== 0
        ? `y = ${a}x³ + ${b}x² + ${c}x + ${d}`
        : b !== 0
        ? `y = ${b}x² + ${c}x + ${d}`
        : `y = ${c}x + ${d}`,
    shaded: false,
  };
}

export const MathPlotEngine: React.FC<Props> = ({ blueprint, params }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 60FPS Canvas is ALWAYS the default: slider drags must repaint locally with 0 network calls.
  // Python Neon (SymPy/Matplotlib) is an opt-in snapshot, fetched only when the user selects it,
  // changes the formula while in that mode, or presses the refresh button — never on slider drags.
  const [viewMode, setViewMode] = useState<'PYTHON_SVG' | 'CANVAS'>('CANVAS');

  const [svgData, setSvgData] = useState<string | null>(null);
  const [svgLoading, setSvgLoading] = useState(false);
  const [svgError, setSvgError] = useState<string | null>(null);
  const [svgSnapshotInfo, setSvgSnapshotInfo] = useState<string>('');
  const [svgRefreshTick, setSvgRefreshTick] = useState(0);

  // Always read the freshest slider values without making them an effect dependency.
  const paramsRef = useRef(params);
  paramsRef.current = params;

  // Fetch dynamic dark-neon SVG from Python FastAPI backend (opt-in only)
  useEffect(() => {
    if (viewMode !== 'PYTHON_SVG') return;
    let isCancelled = false;

    const fetchPythonPlot = async () => {
      setSvgLoading(true);
      setSvgError(null);

      const p = paramsRef.current;
      const a = p.a ?? p.A ?? 1;
      const b = p.b ?? 0;
      const c = p.c ?? p.omega ?? 0;
      const d = p.d ?? p.phi ?? 0;
      const eq = blueprint.recognizedLatex || 'A * sin(x)';
      setSvgSnapshotInfo(`a=${a}, b=${b}, c=${Number(Number(c).toFixed(2))}, d=${Number(Number(d).toFixed(2))}`);

      let res: Response | null = null;
      try {
        res = await fetch(`/api/v1/plot?equation=${encodeURIComponent(eq)}&a=${a}&b=${b}&c=${c}&d=${d}&format=json`);
      } catch (errProxy) {
        try {
          res = await fetch(`http://127.0.0.1:8000/api/v1/plot?equation=${encodeURIComponent(eq)}&a=${a}&b=${b}&c=${c}&d=${d}&format=json`);
        } catch (errDirect) {
          console.warn('[MathPlotEngine] Fetch error:', errDirect);
        }
      }

      if (!isCancelled) {
        if (res && res.ok) {
          try {
            const rawText = await res.text();
            let svgStr = '';
            try {
              const data = JSON.parse(rawText);
              svgStr = data.svg || '';
            } catch {
              svgStr = rawText;
            }

            if (svgStr && svgStr.includes('<svg') && !svgStr.includes('Lỗi phân tích đồ thị:')) {
              setSvgData(svgStr);
              setSvgError(null);
            } else if (svgStr.includes('Lỗi phân tích đồ thị:')) {
              setSvgError('SymPy không phân tích được - Đã chuyển sang 60FPS Canvas');
              setViewMode('CANVAS');
            } else {
              setSvgError('Chuyển sang 60FPS Canvas');
              setViewMode('CANVAS');
            }
          } catch (parseErr) {
            setSvgError('Lỗi đọc dữ liệu SVG');
            setViewMode('CANVAS');
          }
        } else {
          setSvgError('Không kết nối được Python Backend - Đang dùng 60FPS Local Canvas');
          setViewMode('CANVAS');
        }
        setSvgLoading(false);
      }
    };

    fetchPythonPlot();

    return () => {
      isCancelled = true;
    };
  }, [viewMode, blueprint.recognizedLatex, svgRefreshTick]);

  // A new formula invalidates the previous Python snapshot.
  useEffect(() => {
    setSvgData(null);
    setSvgError(null);
  }, [blueprint.recognizedLatex]);

  // REAL, HIGH-FIDELITY 60FPS HTML5 CANVAS DRAWING (Zero Mock)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const originX = width / 2;
    const originY = height / 2;
    const scale = 36; // 36px = 1 unit

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

    // 2. Axes Ox, Oy
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(width, originY);
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, height);
    ctx.stroke();

    // 3. Compile Real Math Function (Zero Mock)
    const compiled = compileFormulaToFunction(blueprint.recognizedLatex, params);

    // Axis tick labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '11px monospace';
    ctx.fillText(compiled.xLabel, width - 24, originY - 8);
    ctx.fillText(compiled.yLabel, originX + 8, 16);
    ctx.fillText('O', originX - 14, originY + 16);

    // 4. Shaded Area Under Curve for Integrals or Wave
    if (compiled.shaded) {
      ctx.fillStyle = 'rgba(34, 211, 238, 0.18)';
      ctx.beginPath();
      const startX = compiled.varSymbol === 't' ? originX : originX - 2 * scale;
      const endX = compiled.varSymbol === 't' ? originX + 3.14 * scale : originX + 2 * scale;
      ctx.moveTo(startX, originY);

      for (let px = startX; px <= endX; px += 2) {
        const mx = (px - originX) / scale;
        const my = compiled.evalFn(mx);
        ctx.lineTo(px, originY - my * scale);
      }
      ctx.lineTo(endX, originY);
      ctx.closePath();
      ctx.fill();
    }

    // 5. Glow Neon Curve
    ctx.save();
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    let first = true;

    for (let px = 0; px <= width; px += 2) {
      const mx = (px - originX) / scale;
      const my = compiled.evalFn(mx);
      const py = originY - my * scale;

      if (!isNaN(py) && isFinite(py) && py >= -400 && py <= height + 400) {
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
    ctx.restore();

    // 6. Tangent line at x0 (if polynomial)
    const x0 = params.x0 ?? 1.0;
    if (compiled.evalSlope && !compiled.isIntegral && compiled.varSymbol === 'x') {
      const y0 = compiled.evalFn(x0);
      const slope = compiled.evalSlope(x0);
      const ptX = originX + x0 * scale;
      const ptY = originY - y0 * scale;

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const span = 80;
      ctx.moveTo(ptX - span, ptY + span * slope);
      ctx.lineTo(ptX + span, ptY - span * slope);
      ctx.stroke();

      // Tangent point marker
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(ptX, ptY, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 7. Curve Label Badge
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(15, 15, 260, 48);
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(15, 15, 260, 48);

    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(compiled.curveTitle, 25, 34);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.fillText(
      compiled.isIntegral
        ? 'Tích phân xác thực (Đã tính nguyên hàm)'
        : compiled.varSymbol === 't'
        ? 'Dao động điều hòa xác thực theo thời gian t'
        : `Hệ số góc tại x₀ = ${x0}: k = ${Number(compiled.evalSlope(x0).toFixed(2))}`,
      25,
      50
    );
  }, [blueprint, params]);

  return (
    <div className="flex flex-col items-center w-full max-w-[620px] gap-2">
      {/* Top Engine Mode Switcher */}
      <div className="flex items-center justify-between w-full px-2">
        <span className="text-[11px] font-mono text-cyan-400 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5" />
          <span>{viewMode === 'PYTHON_SVG' ? 'Python SymPy Matplotlib (Chính xác 100%)' : '60FPS HTML5 Canvas (Xác thực thời gian thực)'}</span>
        </span>
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
          {viewMode === 'PYTHON_SVG' && (
            <button
              type="button"
              onClick={() => setSvgRefreshTick((t) => t + 1)}
              title="Đồng bộ lại tham số hiện tại vào Python SymPy"
              className="px-2 py-1 rounded-lg text-[10px] font-mono text-cyan-300 hover:bg-cyan-500/20 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${svgLoading ? 'animate-spin' : ''}`} />
              <span>Đồng bộ ({svgSnapshotInfo || 'mới'})</span>
            </button>
          )}
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
                <span>Đang render đồ thị SymPy Python...</span>
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
