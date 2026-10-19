// apps/teacher-board/src/components/canvas/SimulationWidget.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { SimulationBlueprint, SimParamConfig } from '@socratic/types';
import { RotateCcw, Lightbulb, FileText, CheckCircle2 } from 'lucide-react';
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
  isSplitView?: boolean;
  onToggleSplitView?: () => void;
}

function deriveParametersForFormula(
  formula: string,
  fallbackConfigs: SimParamConfig[]
): { configs: SimParamConfig[]; values: Record<string, number> } {
  const fLow = (formula || '').toLowerCase();

  // 1. Harmonic Oscillation: x(t) = A cos(omega * t + phi)
  if (fLow.includes('t') && (fLow.includes('cos') || fLow.includes('sin') || fLow.includes('dao động'))) {
    let parsedA = 5.0;
    const aMatch = formula.match(/(?:=\s*|^)([0-9\.]+)\s*(?:\\?cos|\\?sin)/i);
    if (aMatch) parsedA = parseFloat(aMatch[1]);

    const configs: SimParamConfig[] = [
      { key: 'A', label: 'Biên độ (A)', unit: 'cm', defaultValue: parsedA, min: 1.0, max: 15.0, step: 0.5 },
      { key: 'omega', label: 'Tần số góc (ω)', unit: 'rad/s', defaultValue: 6.28, min: 0.5, max: 20.0, step: 0.5 },
      { key: 'phi', label: 'Pha ban đầu (φ)', unit: 'rad', defaultValue: 1.57, min: -3.14, max: 3.14, step: 0.1 },
    ];
    return {
      configs,
      values: { A: parsedA, omega: 6.28, phi: 1.57 },
    };
  }

  // 2. Indefinite or Definite Integral: \int x^3 dx, \int x^2 dx, etc.
  if (fLow.includes('int') || fLow.includes('tích phân') || fLow.includes('nguyên hàm')) {
    const configs: SimParamConfig[] = [
      { key: 'd', label: 'Hằng số tích phân (C)', unit: '', defaultValue: 0.0, min: -10.0, max: 10.0, step: 0.5 },
      { key: 'x0', label: 'Cận / Điểm khảo sát (x₀)', unit: '', defaultValue: 2.0, min: -4.0, max: 4.0, step: 0.2 },
    ];
    return {
      configs,
      values: { d: 0.0, x0: 2.0 },
    };
  }

  // 3. Trigonometric Wave: y = A sin(omega * x + phi)
  if (fLow.includes('sin') || fLow.includes('cos')) {
    const configs: SimParamConfig[] = [
      { key: 'A', label: 'Biên độ (A)', unit: '', defaultValue: 2.0, min: 0.5, max: 10.0, step: 0.5 },
      { key: 'omega', label: 'Tần số góc (ω)', unit: '', defaultValue: 3.0, min: 0.5, max: 10.0, step: 0.5 },
      { key: 'phi', label: 'Độ lệch pha (φ)', unit: 'rad', defaultValue: 0.0, min: -3.14, max: 3.14, step: 0.1 },
      { key: 'D', label: 'Dịch chuyển trục (D)', unit: '', defaultValue: 0.0, min: -5.0, max: 5.0, step: 0.5 },
    ];
    return {
      configs,
      values: { A: 2.0, omega: 3.0, phi: 0.0, D: 0.0 },
    };
  }

  // 4. Polynomials (cubic, quadratic, linear)
  const clean = fLow.replace(/\s+/g, '').replace(/^[vy]=/, '');
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

  if (a !== 0) {
    const configs: SimParamConfig[] = [
      { key: 'a', label: 'Hệ số a (x³)', unit: '', defaultValue: a, min: -5, max: 5, step: 0.5 },
      { key: 'b', label: 'Hệ số b (x²)', unit: '', defaultValue: b, min: -5, max: 5, step: 0.5 },
      { key: 'c', label: 'Hệ số c (x)', unit: '', defaultValue: c, min: -10, max: 10, step: 0.5 },
      { key: 'd', label: 'Hệ số d (tự do)', unit: '', defaultValue: d, min: -10, max: 10, step: 0.5 },
      { key: 'x0', label: 'Điểm tiếp điểm (x₀)', unit: '', defaultValue: 1.0, min: -5, max: 5, step: 0.5 },
    ];
    return { configs, values: { a, b, c, d, x0: 1.0 } };
  } else if (b !== 0) {
    const configs: SimParamConfig[] = [
      { key: 'b', label: 'Hệ số a (x²)', unit: '', defaultValue: b, min: -5, max: 5, step: 0.5 },
      { key: 'c', label: 'Hệ số b (x)', unit: '', defaultValue: c, min: -10, max: 10, step: 0.5 },
      { key: 'd', label: 'Hệ số c (tự do)', unit: '', defaultValue: d, min: -10, max: 10, step: 0.5 },
      { key: 'x0', label: 'Điểm tiếp điểm (x₀)', unit: '', defaultValue: 1.0, min: -5, max: 5, step: 0.5 },
    ];
    return { configs, values: { b, c, d, x0: 1.0 } };
  } else if (c !== 0 || d !== 0) {
    const configs: SimParamConfig[] = [
      { key: 'c', label: 'Hệ số góc (k)', unit: '', defaultValue: c || 2, min: -10, max: 10, step: 0.5 },
      { key: 'd', label: 'Tung độ gốc (d)', unit: '', defaultValue: d || 1, min: -10, max: 10, step: 0.5 },
      { key: 'x0', label: 'Điểm tiếp điểm (x₀)', unit: '', defaultValue: 1.0, min: -5, max: 5, step: 0.5 },
    ];
    return { configs, values: { c: c || 2, d: d || 1, x0: 1.0 } };
  }

  // Fallback to whatever configs were passed or default
  const values: Record<string, number> = {};
  fallbackConfigs.forEach((p) => {
    values[p.key] = p.defaultValue;
  });
  return { configs: fallbackConfigs, values };
}

export const SimulationWidget: React.FC<SimulationWidgetProps> = ({
  blueprint,
  onClose,
  onParamChange,
  onFormulaChange,
  isSplitView = false,
  onToggleSplitView,
}: SimulationWidgetProps) => {
  const derived = useMemo(() => {
    if (blueprint.engine === 'MATH') {
      return deriveParametersForFormula(blueprint.recognizedLatex, blueprint.parameters);
    }
    const values = blueprint.parameters.reduce((acc: Record<string, number>, p: SimParamConfig) => {
      acc[p.key] = p.defaultValue;
      return acc;
    }, {} as Record<string, number>);
    return { configs: blueprint.parameters, values };
  }, [blueprint]);

  const [params, setParams] = useState<Record<string, number>>(derived.values);
  const [showSocratic, setShowSocratic] = useState(false);
  const [activeFormula, setActiveFormula] = useState(blueprint.recognizedLatex);
  const [activeParameters, setActiveParameters] = useState<SimParamConfig[]>(derived.configs);

  // Synchronize state when blueprint changes
  useEffect(() => {
    setActiveFormula(blueprint.recognizedLatex);
    if (blueprint.engine === 'MATH') {
      const d = deriveParametersForFormula(blueprint.recognizedLatex, blueprint.parameters);
      setActiveParameters(d.configs);
      setParams(d.values);
    } else {
      setActiveParameters(blueprint.parameters);
      const vals = blueprint.parameters.reduce((acc: Record<string, number>, p: SimParamConfig) => {
        acc[p.key] = p.defaultValue;
        return acc;
      }, {} as Record<string, number>);
      setParams(vals);
    }
  }, [blueprint]);

  const handleParamChange = (key: string, value: number) => {
    setParams((prev: Record<string, number>) => {
      const updated = { ...prev, [key]: value };
      return updated;
    });
    if (onParamChange) {
      onParamChange(key, value);
    }
  };

  const [exporting, setExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const handleExportSmartNotes = async () => {
    setExporting(true);
    const t0 = performance.now();
    const payload = {
      formula: activeFormula,
      template_id: blueprint.templateId,
      engine: blueprint.engine,
      parameters: params,
      socratic_questions: [blueprint.socraticQuestion],
      key_insights: [
        `Mô hình ${blueprint.templateId} xác thực công thức: ${activeFormula}`,
        `Tham số hoạt nghiệm: ${Object.entries(params).map(([k, v]) => `${k}=${v}`).join(', ')}`,
      ],
      class_id: '12A1',
      student_id: 'all_students',
    };

    try {
      let res: Response | null = null;
      try {
        res = await fetch('/api/v1/notes/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch {
        res = await fetch('http://127.0.0.1:8000/api/v1/notes/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      const elapsed = Math.round(performance.now() - t0);
      if (typeof window !== 'undefined') {
        localStorage.setItem('socratic_smart_notes_latest', JSON.stringify({ ...payload, export_ms: elapsed }));
      }
      setExportNotice(`Đã đồng bộ Smart Notes sang HS & GV (${elapsed}ms)`);
      setTimeout(() => setExportNotice(null), 3000);
    } catch {
      const elapsed = Math.round(performance.now() - t0);
      if (typeof window !== 'undefined') {
        localStorage.setItem('socratic_smart_notes_latest', JSON.stringify({ ...payload, export_ms: elapsed }));
      }
      setExportNotice(`Đã lưu Smart Notes offline (${elapsed}ms)`);
      setTimeout(() => setExportNotice(null), 3000);
    } finally {
      setExporting(false);
    }
  };

  const handleReset = () => {
    setParams(derived.values);
    if (onParamChange) {
      Object.entries(derived.values).forEach(([k, v]) => onParamChange(k, v));
    }
  };

  const handleFormulaSwap = (newFormula: string) => {
    setActiveFormula(newFormula);

    if (blueprint.engine === 'MATH') {
      const d = deriveParametersForFormula(newFormula, blueprint.parameters);
      setActiveParameters(d.configs);
      setParams(d.values);
      if (onParamChange) {
        Object.entries(d.values).forEach(([k, v]) => onParamChange(k, v));
      }
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
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-cyan-400">
              {blueprint.engine} ENGINE • {blueprint.templateId}
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
              ⚡ 0 Network Calls @60FPS
            </span>
          </div>
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

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Split-View Dock Toggle Button */}
          {onToggleSplitView && (
            <button
              type="button"
              data-testid="btn-widget-split-toggle"
              onClick={onToggleSplitView}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-xs font-semibold transition cursor-pointer active:scale-95 ${
                isSplitView
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-lg shadow-cyan-500/25'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
              }`}
              title="Ghim sang nửa bảng (Split-Screen): Trái viết phấn, Phải mô phỏng 60FPS"
            >
              <span>◫</span>
              <span>{isSplitView ? 'Toàn màn hình' : 'Ghim nửa bảng'}</span>
            </button>
          )}

          {/* Smart Notes Export Button (Feature 5 / CP6) */}
          <button
            type="button"
            data-testid="btn-export-smart-notes"
            onClick={handleExportSmartNotes}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-teal-500/20 to-cyan-500/20 hover:from-teal-500/30 hover:to-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold shadow-lg transition cursor-pointer active:scale-95"
            title="Đồng bộ công thức chuẩn và dữ liệu bài học sang ứng dụng Học sinh & Giáo viên"
          >
            <FileText className="w-4 h-4 text-cyan-400" />
            <span>{exporting ? 'Đang xuất...' : '📑 Xuất Smart Notes'}</span>
          </button>

          {/* Breathing Socratic lightbulb (Opt-in Cue) */}
          <button
            data-testid="socratic-cue-btn"
            onClick={() => setShowSocratic(!showSocratic)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500/20 border border-amber-400/50 text-amber-300 hover:bg-amber-500/30 transition cursor-pointer shadow-lg shadow-amber-500/10"
            style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
            title="Mở câu hỏi thảo luận Socratic gợi mở"
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

      {/* Export Toast Notification */}
      {exportNotice && (
        <div className="mx-6 mt-3 px-4 py-2 rounded-xl bg-emerald-950/90 border border-emerald-400/40 text-emerald-200 text-xs font-mono flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Planetary Gravity Presets for PHYS_PROJECTILE */}
      {blueprint.templateId === 'PHYS_PROJECTILE' && (
        <div className="flex flex-wrap items-center gap-2 px-6 pt-3 pb-1 border-b border-white/5 bg-slate-950/40">
          <span className="text-[11px] font-mono text-slate-400">Trọng lực hành tinh (g):</span>
          {[
            { name: 'Mặt Trăng', g: 1.62, icon: '🌑' },
            { name: 'Sao Hỏa', g: 3.71, icon: '🪐' },
            { name: 'Trái Đất', g: 9.8, icon: '🌍' },
            { name: 'Sao Mộc', g: 24.79, icon: '⚡' },
          ].map((pl) => (
            <button
              key={pl.name}
              type="button"
              onClick={() => handleParamChange('g', pl.g)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer flex items-center gap-1.5 ${
                params.g === pl.g
                  ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
              }`}
            >
              <span>{pl.icon}</span>
              <span>{pl.name} ({pl.g} m/s²)</span>
            </button>
          ))}
        </div>
      )}

      {/* Socratic Discussion Prompt (Dismissible by click or close button) */}
      {showSocratic && (
        <div
          data-testid="socratic-content"
          onClick={() => setShowSocratic(false)}
          className="mx-6 mt-4 p-4 rounded-2xl bg-indigo-950/90 border border-indigo-400/40 text-indigo-100 text-base leading-relaxed flex items-start justify-between gap-3 shadow-2xl cursor-pointer hover:bg-indigo-950 transition"
          title="Bấm vào để thu gọn gợi ý Socratic"
        >
          <div>
            💡 <strong>Câu hỏi thảo luận:</strong> {blueprint.socraticQuestion}
            <div className="text-[11px] text-indigo-300/80 mt-1 font-mono">
              (Chạm vào hộp thoại hoặc nút ✕ bên phải để đóng)
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowSocratic(false);
            }}
            className="text-xs text-indigo-300 hover:text-white px-2 py-1 rounded-lg bg-white/10 cursor-pointer shrink-0"
          >
            ✕ Đóng
          </button>
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
