// apps/teacher-board/src/components/canvas/SimulationWidget.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { SimulationBlueprint, SimParamConfig } from '@socratic/types';
import { RotateCcw, Lightbulb } from 'lucide-react';
import { MathPlotEngine } from '../../engines/MathPlotEngine';
import { PhysicsSandboxEngine } from '../../engines/PhysicsSandboxEngine';
import { ChemistryLabEngine } from '../../engines/ChemistryLabEngine';
import { BioSystemEngine } from '../../engines/BioSystemEngine';
import { TapAndSwapOCR } from './TapAndSwapOCR';
import { MathView } from '../common/MathView';

export interface SimulationWidgetProps {
  blueprint: SimulationBlueprint;
  onClose?: () => void;
  onParamChange?: (key: string, value: number) => void;
  onFormulaChange?: (newFormula: string) => void;
}

export const SimulationWidget: React.FC<SimulationWidgetProps> = ({
  blueprint,
  onClose,
  onParamChange,
  onFormulaChange,
}: SimulationWidgetProps) => {
  // Initialize parameter state from blueprint defaultValue
  const initialParams = useMemo(() => {
    return blueprint.parameters.reduce((acc: Record<string, number>, p: SimParamConfig) => {
      acc[p.key] = p.defaultValue;
      return acc;
    }, {} as Record<string, number>);
  }, [blueprint]);

  const [params, setParams] = useState<Record<string, number>>(initialParams);
  const [showSocratic, setShowSocratic] = useState(false);
  const [activeFormula, setActiveFormula] = useState(blueprint.recognizedLatex);
  const [activeParameters, setActiveParameters] = useState<SimParamConfig[]>(blueprint.parameters);

  const handleParamChange = (key: string, value: number) => {
    setParams((prev: Record<string, number>) => {
      const updated = { ...prev, [key]: value };
      return updated;
    });
    if (onParamChange) {
      onParamChange(key, value);
    }
  };

  const handleReset = () => {
    setParams(initialParams);
    if (onParamChange) {
      Object.entries(initialParams).forEach(([k, v]) => onParamChange(k, v));
    }
  };

  const handleFormulaSwap = (newFormula: string) => {
    setActiveFormula(newFormula);

    // If MATH engine, dynamically adapt parameters to the new formula
    if (blueprint.engine === 'MATH' && blueprint.templateId === 'MATH_FUNC_2D') {
      const clean = newFormula.toLowerCase().replace(/\s+/g, '').replace(/^[vy]=/, '');
      let a = 0, b = 0, c = 0, d = 0;
      const m3 = clean.match(/([+-]?[0-9\.]*)x\^?3/);
      if (m3) a = m3[1] === '' || m3[1] === '+' ? 1 : (m3[1] === '-' ? -1 : parseFloat(m3[1]));
      const m2 = clean.match(/([+-]?[0-9\.]*)x\^?2/);
      if (m2) b = m2[1] === '' || m2[1] === '+' ? 1 : (m2[1] === '-' ? -1 : parseFloat(m2[1]));
      const m1 = clean.match(/([+-]?[0-9\.]*)x(?!\^)/);
      if (m1) c = m1[1] === '' || m1[1] === '+' ? 1 : (m1[1] === '-' ? -1 : parseFloat(m1[1]));
      const md = clean.replace(/x\^?[0-9]*/g, '').match(/([+-]?[0-9\.]+)/);
      if (md) {
        try { d = parseFloat(md[1]); } catch {}
      }

      const updatedParams = { ...params, a, b, c, d };
      setParams(updatedParams);

      // Dynamically generate sliders for the new formula
      const newConfigs: SimParamConfig[] = [];
      if (a !== 0) {
        newConfigs.push({ key: 'a', label: 'Hệ số a (x³)', unit: '', defaultValue: a, min: -5, max: 5, step: 0.5 });
        newConfigs.push({ key: 'b', label: 'Hệ số b (x²)', unit: '', defaultValue: b, min: -5, max: 5, step: 0.5 });
        newConfigs.push({ key: 'c', label: 'Hệ số c (x)', unit: '', defaultValue: c, min: -10, max: 10, step: 0.5 });
        newConfigs.push({ key: 'd', label: 'Hệ số d (tự do)', unit: '', defaultValue: d, min: -10, max: 10, step: 0.5 });
      } else if (b !== 0) {
        newConfigs.push({ key: 'b', label: 'Hệ số a (x²)', unit: '', defaultValue: b, min: -5, max: 5, step: 0.5 });
        newConfigs.push({ key: 'c', label: 'Hệ số b (x)', unit: '', defaultValue: c, min: -10, max: 10, step: 0.5 });
        newConfigs.push({ key: 'd', label: 'Hệ số c (tự do)', unit: '', defaultValue: d, min: -10, max: 10, step: 0.5 });
      } else {
        newConfigs.push({ key: 'c', label: 'Hệ số góc (k)', unit: '', defaultValue: c, min: -10, max: 10, step: 0.5 });
        newConfigs.push({ key: 'd', label: 'Tung độ gốc (d)', unit: '', defaultValue: d, min: -10, max: 10, step: 0.5 });
      }
      newConfigs.push({ key: 'x0', label: 'Điểm tiếp điểm (x₀)', unit: '', defaultValue: 1.0, min: -5, max: 5, step: 0.5 });
      setActiveParameters(newConfigs);
    }

    if (onFormulaChange) {
      onFormulaChange(newFormula);
    }
  };

  // Active blueprint with updated formula
  const activeBlueprint: SimulationBlueprint = useMemo(() => ({
    ...blueprint,
    recognizedLatex: activeFormula,
    parameters: activeParameters,
  }), [blueprint, activeFormula, activeParameters]);

  return (
    <div
      data-testid="simulation-widget"
      className="relative w-full max-w-full rounded-3xl bg-slate-900/90 backdrop-blur-2xl border border-white/15 shadow-2xl text-slate-100 overflow-hidden select-none"
    >
      {/* Header + Breathing Socratic Cue (Feature 3) */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">
            {blueprint.engine} ENGINE • {blueprint.templateId}
          </span>
          <div className="mt-1">
            <TapAndSwapOCR
              formula={activeFormula}
              alternatives={blueprint.ocrAlternatives}
              onSwap={handleFormulaSwap}
            />
          </div>
          {activeFormula && (
            <div className="mt-1.5 px-3 py-1 rounded-xl bg-slate-950/80 border border-cyan-500/20 text-cyan-100 text-sm inline-block">
              <MathView latex={activeFormula} displayMode={false} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Breathing Socratic lightbulb (Opt-in Cue) */}
          <button
            data-testid="socratic-cue-btn"
            onClick={() => setShowSocratic(!showSocratic)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 animate-pulse hover:bg-amber-500/30 transition cursor-pointer"
          >
            <Lightbulb className="w-5 h-5 text-amber-300" />
            <span className="text-sm font-medium">Gợi mở Socratic</span>
          </button>

          {/* Reset button (Feature 4) */}
          <button
            data-testid="reset-btn"
            onClick={handleReset}
            className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition cursor-pointer"
            title="Khôi phục thông số gốc"
          >
            <RotateCcw className="w-5 h-5 text-slate-300" />
          </button>

          {/* Close button if modal */}
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-2xl bg-white/5 hover:bg-red-500/20 hover:text-red-300 border border-white/10 text-xs transition cursor-pointer"
            >
              ✕ Đóng
            </button>
          )}
        </div>
      </div>

      {/* Socratic Discussion Prompt */}
      {showSocratic && (
        <div
          data-testid="socratic-content"
          className="mx-6 mt-4 p-4 rounded-2xl bg-indigo-950/80 border border-indigo-400/30 text-indigo-100 text-base leading-relaxed"
        >
          💡 <strong>Câu hỏi thảo luận:</strong> {blueprint.socraticQuestion}
        </div>
      )}

      {/* 60FPS SIMULATION CANVAS RENDER AREA */}
      <div className="p-6 flex justify-center items-center bg-slate-950/60" data-testid="engine-canvas-container">
        {blueprint.engine === 'MATH' && (
          <MathPlotEngine blueprint={activeBlueprint} params={params} />
        )}
        {blueprint.engine === 'PHYSICS' && (
          <PhysicsSandboxEngine blueprint={activeBlueprint} params={params} />
        )}
        {blueprint.engine === 'CHEMISTRY' && (
          <ChemistryLabEngine blueprint={activeBlueprint} params={params} />
        )}
        {blueprint.engine === 'BIOLOGY' && (
          <BioSystemEngine blueprint={activeBlueprint} params={params} />
        )}
      </div>

      {/* MACRO SLIDER CONTROLS (Feature 4 - 80x80px Touch Friendly Placed Below Canvas) */}
      <div className="p-6 bg-slate-900/95 border-t border-white/10 grid grid-cols-2 gap-4" data-testid="macro-sliders-container">
        {activeParameters.map((p: SimParamConfig) => {
          const currentVal = params[p.key] ?? p.defaultValue;
          return (
            <div
              key={p.key}
              data-testid={`param-box-${p.key}`}
              className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2"
            >
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-300">{p.label}</span>
                <span
                  data-testid={`param-val-${p.key}`}
                  className="text-lg font-mono font-bold text-cyan-400"
                >
                  {currentVal} {p.unit}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Large touch button [-] */}
                <button
                  data-testid={`slider-minus-${p.key}`}
                  onClick={() =>
                    handleParamChange(p.key, Math.max(p.min, Number((currentVal - p.step).toFixed(2))))
                  }
                  className="w-12 h-12 min-w-[48px] rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xl font-bold flex items-center justify-center cursor-pointer"
                >
                  -
                </button>

                <input
                  type="range"
                  data-testid={`slider-${p.key}`}
                  min={p.min}
                  max={p.max}
                  step={p.step}
                  value={currentVal}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleParamChange(p.key, parseFloat(e.target.value))
                  }
                  className="flex-1 h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />

                {/* Large touch button [+] */}
                <button
                  data-testid={`slider-plus-${p.key}`}
                  onClick={() =>
                    handleParamChange(p.key, Math.min(p.max, Number((currentVal + p.step).toFixed(2))))
                  }
                  className="w-12 h-12 min-w-[48px] rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xl font-bold flex items-center justify-center cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
