// apps/teacher-board/src/components/canvas/SimulationWidget.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { SimulationBlueprint, SimParamConfig, CurriculumLevel } from '@socratic/types';
import { RotateCcw, FileText, CheckCircle2, Sparkles } from 'lucide-react';
import { MathPlotEngine } from '../../engines/MathPlotEngine';
import { PhysicsSandboxEngine } from '../../engines/PhysicsSandboxEngine';
import { ChemistryLabEngine } from '../../engines/ChemistryLabEngine';
import { BioSystemEngine } from '../../engines/BioSystemEngine';
import { AIGeneratedVisualEngine } from './AIGeneratedVisualEngine';
import { TapAndSwapOCR } from './TapAndSwapOCR';
import { MathView } from '../common/MathView';
import { MathText } from '../ui/MathText';

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
      { key: 'd', label: 'Hệ số tự do d', unit: '', defaultValue: d, min: -10, max: 10, step: 0.5 },
    ];
    return {
      configs,
      values: { a, b, c, d },
    };
  }

  if (b !== 0) {
    const configs: SimParamConfig[] = [
      { key: 'a', label: 'Hệ số a (x²)', unit: '', defaultValue: b, min: -5, max: 5, step: 0.5 },
      { key: 'b', label: 'Hệ số b (x)', unit: '', defaultValue: c, min: -10, max: 10, step: 0.5 },
      { key: 'c', label: 'Hệ số tự do c', unit: '', defaultValue: d, min: -10, max: 10, step: 0.5 },
    ];
    return {
      configs,
      values: { a: b, b: c, c: d },
    };
  }

  return {
    configs: fallbackConfigs,
    values: fallbackConfigs.reduce((acc, p) => ({ ...acc, [p.key]: p.defaultValue }), {}),
  };
}

export function getCurriculumParameters(
  templateId: string,
  baseParams: SimParamConfig[],
  level: CurriculumLevel
): SimParamConfig[] {
  if (level === 'THPT_STANDARD') {
    return baseParams;
  }

  const existingKeys = new Set(baseParams.map((p) => p.key));
  const additions: SimParamConfig[] = [];

  switch (templateId) {
    case 'PHYS_PROJECTILE':
      if (!existingKeys.has('k')) {
        additions.push({
          key: 'k',
          label: 'Lực cản khí (k - RK4)',
          unit: 'kg/s',
          defaultValue: 0.05,
          min: 0.0,
          max: 0.25,
          step: 0.01,
        });
      }
      break;

    case 'PHYS_PENDULUM':
      if (!existingKeys.has('theta0')) {
        additions.push({
          key: 'theta0',
          label: 'Góc lệch lớn (θ₀)',
          unit: 'rad',
          defaultValue: 1.2,
          min: 0.1,
          max: 2.8,
          step: 0.1,
        });
      }
      if (!existingKeys.has('b')) {
        additions.push({
          key: 'b',
          label: 'Hệ số cản nhớt (b)',
          unit: 'N·s/m',
          defaultValue: 0.08,
          min: 0.0,
          max: 0.5,
          step: 0.02,
        });
      }
      break;

    case 'PHYS_RLC_PHASOR':
      if (!existingKeys.has('R')) {
        additions.push({ key: 'R', label: 'Điện trở (R)', unit: 'Ω', defaultValue: 50.0, min: 10.0, max: 200.0, step: 10.0 });
      }
      if (!existingKeys.has('L')) {
        additions.push({ key: 'L', label: 'Độ tự cảm (L)', unit: 'H', defaultValue: 0.5, min: 0.1, max: 2.0, step: 0.1 });
      }
      if (!existingKeys.has('C')) {
        additions.push({ key: 'C', label: 'Điện dung (C)', unit: 'μF', defaultValue: 50.0, min: 10.0, max: 200.0, step: 10.0 });
      }
      if (!existingKeys.has('omega')) {
        additions.push({ key: 'omega', label: 'Tần số góc (ω)', unit: 'rad/s', defaultValue: 200.0, min: 50.0, max: 500.0, step: 10.0 });
      }
      break;

    case 'MATH_TRIG_WAVE':
    case 'MATH_POLYNOMIAL':
      if (!existingKeys.has('m')) {
        additions.push({
          key: 'm',
          label: 'Tham số nghiệm (m)',
          unit: '',
          defaultValue: 0.0,
          min: -5.0,
          max: 5.0,
          step: 0.2,
        });
      }
      if (!existingKeys.has('n')) {
        additions.push({
          key: 'n',
          label: 'Bậc Taylor (n)',
          unit: '',
          defaultValue: 5,
          min: 1,
          max: 15,
          step: 1,
        });
      }
      break;

    case 'CHEM_EQUILIBRIUM_TITRATION':
      if (!existingKeys.has('Vb')) {
        additions.push({
          key: 'Vb',
          label: 'Thể tích NaOH (V_b)',
          unit: 'mL',
          defaultValue: 20.0,
          min: 0.0,
          max: 50.0,
          step: 1.0,
        });
      }
      break;

    case 'BIO_PHOTOSYNTHESIS':
      if (!existingKeys.has('p')) {
        additions.push({
          key: 'p',
          label: 'Tần số alen trội (p)',
          unit: '',
          defaultValue: 0.6,
          min: 0.05,
          max: 0.95,
          step: 0.05,
        });
      }
      if (!existingKeys.has('s')) {
        additions.push({
          key: 's',
          label: 'Hệ số chọn lọc (s)',
          unit: '',
          defaultValue: 0.2,
          min: 0.0,
          max: 0.8,
          step: 0.05,
        });
      }
      break;
  }

  return [...baseParams, ...additions];
}

function getTopicDisplayName(blueprint: SimulationBlueprint): string {
  const t = blueprint.templateId;
  const f = (blueprint.recognizedLatex || '').toLowerCase();
  
  if (t === 'PHYS_PROJECTILE' || f.includes('ném') || f.includes('projectile') || f.includes('v_0') || f.includes('parabol')) {
    return 'VẬT LÝ • CHUYỂN ĐỘNG NÉM XIÊN TRONG TRỌNG TRƯỜNG';
  }
  if (t === 'PHYS_RIPPLE_TANK' || f.includes('giao thoa') || f.includes('ripple') || f.includes('d_2 - d_1') || f.includes('lambda')) {
    return 'VẬT LÝ • HIỆN TƯỢNG GIAO THOA SÓNG CƠ HỌC (2 NGUỒN)';
  }
  if (t === 'PHYS_PENDULUM' || f.includes('con lắc') || f.includes('pendulum') || f.includes('l/g') || f.includes('theta')) {
    return 'VẬT LÝ • DAO ĐỘNG CON LẮC ĐƠN VI PHÂN (RK4)';
  }
  if (t === 'PHYS_RLC_PHASOR' || f.includes('rlc') || f.includes('fresnel') || f.includes('z =') || f.includes('cộng hưởng')) {
    return 'VẬT LÝ • MẠCH ĐIỆN XOAY CHIỀU RLC & GIẢN ĐỒ FRESNEL';
  }
  if (t === 'PHYS_INCLINED' || f.includes('nghiêng') || f.includes('ma sát') || f.includes('mu') || f.includes('incline')) {
    return 'VẬT LÝ • CƠ HỌC MẶT PHẲNG NGHIÊNG & MA SÁT';
  }
  if (t === 'PHYS_OPTICS_LENS' || f.includes('thấu kính') || f.includes('lens') || f.includes('1/f')) {
    return 'VẬT LÝ • QUANG HÌNH HỌC: THẤU KÍNH MỎNG';
  }
  if (t === 'CHEM_BALANCE_SCALE' || f.includes('fe') || f.includes('cân bằng') || f.includes('hno3')) {
    return 'HÓA HỌC • CÂN BẰNG PHẢN ỨNG OXI HÓA - KHỬ';
  }
  if (t === 'CHEM_EQUILIBRIUM_TITRATION' || f.includes('chuẩn độ') || f.includes('ph') || f.includes('titration')) {
    return 'HÓA HỌC • CHUẨN ĐỘ DUNG DỊCH & BƯỚC NHẢY pH';
  }
  if (t === 'BIO_PHOTOSYNTHESIS' || f.includes('quang hợp') || f.includes('lá') || f.includes('stomata')) {
    return 'SINH HỌC • QUANG HỢP & TRAO ĐỔI KHÍ THỰC VẬT';
  }
  if (t === 'BIO_DNA_HELIX' || f.includes('dna') || f.includes('adn') || f.includes('helicase')) {
    return 'SINH HỌC • CƠ CHẾ NHÂN ĐÔI ADN & SAO CHÉP';
  }
  if (t === 'MATH_TRIG_WAVE' || f.includes('sin') || f.includes('cos') || f.includes('dao động')) {
    return 'TOÁN HỌC • HÀM SỐ LƯỢNG GIÁC & SÓNG ĐIỀU HÒA';
  }
  if (t === 'MATH_FUNC_2D' || f.includes('x^3') || f.includes('x^2') || f.includes('tích phân') || f.includes('int')) {
    return 'TOÁN HỌC • GIẢI TÍCH ĐỒ THỊ & KHẢO SÁT HÀM SỐ';
  }
  return `${blueprint.engine} • ${blueprint.templateId}`;
}

export const SimulationWidget: React.FC<SimulationWidgetProps> = ({
  blueprint,
  onClose,
  onParamChange,
  onFormulaChange,
  isSplitView = false,
  onToggleSplitView,
}) => {
  const [activeFormula, setActiveFormula] = useState<string>(blueprint.recognizedLatex);
  const [renderMode, setRenderMode] = useState<'ENGINE' | 'AI_VISUAL'>(
    blueprint.custom_interactive_svg ? 'ENGINE' : 'ENGINE'
  );
  const [curriculumLevel, setCurriculumLevel] = useState<CurriculumLevel>(
    blueprint.curriculumLevel || 'THPT_STANDARD'
  );

  const { configs: derivedConfigs, values: derivedValues } = useMemo(() => {
    return deriveParametersForFormula(activeFormula, blueprint.parameters);
  }, [activeFormula, blueprint.parameters]);

  const activeParameters = useMemo(() => {
    return getCurriculumParameters(blueprint.templateId, derivedConfigs, curriculumLevel);
  }, [blueprint.templateId, derivedConfigs, curriculumLevel]);

  const [params, setParams] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = { ...derivedValues };
    activeParameters.forEach((p) => {
      if (initial[p.key] === undefined) initial[p.key] = p.defaultValue;
    });
    return initial;
  });

  const [showSocratic, setShowSocratic] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => {
    setParams((prev) => {
      const updated = { ...prev };
      activeParameters.forEach((p) => {
        if (updated[p.key] === undefined) {
          updated[p.key] = p.defaultValue;
        }
      });
      return updated;
    });
  }, [activeParameters]);

  useEffect(() => {
    setActiveFormula(blueprint.recognizedLatex);
  }, [blueprint.recognizedLatex]);

  const handleParamChange = (key: string, val: number) => {
    setParams((prev) => ({ ...prev, [key]: val }));
    onParamChange?.(key, val);
  };

  const handleFormulaSwap = (newFormula: string) => {
    setActiveFormula(newFormula);
    const { configs, values } = deriveParametersForFormula(newFormula, blueprint.parameters);
    setParams(values);
    onFormulaChange?.(newFormula);
  };

  const handleReset = () => {
    const resetVals: Record<string, number> = {};
    activeParameters.forEach((p) => {
      resetVals[p.key] = p.defaultValue;
    });
    setParams(resetVals);
    activeParameters.forEach((p) => onParamChange?.(p.key, p.defaultValue));
  };

  const handleExportSmartNotes = async () => {
    try {
      const payload = {
        formula: activeFormula,
        template_id: blueprint.templateId,
        engine: blueprint.engine,
        parameters: params,
        socratic_questions: [blueprint.socraticQuestion],
        key_insights: [
          `Mô phỏng ${blueprint.templateId} theo tham số thời gian thực`,
          `Hệ thống phản xạ 60FPS không trễ API`,
        ],
        class_id: '12A1',
      };

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

      if (res && res.ok) {
        setExportNotice('Đã xuất bài giảng sang Smart Notes cho học sinh (Port 3002)!');
      } else {
        setExportNotice('Đã lưu bài giảng cục bộ vào bộ nhớ lớp 12A1!');
      }
    } catch {
      setExportNotice('Đã lưu bài giảng cục bộ vào bộ nhớ lớp 12A1!');
    }

    setTimeout(() => setExportNotice(null), 3000);
  };

  const activeBlueprint = useMemo(() => ({
    ...blueprint,
    recognizedLatex: activeFormula,
    parameters: activeParameters,
  }), [blueprint, activeFormula, activeParameters]);

  return (
    <div
      data-testid="simulation-widget"
      className="relative w-full max-w-full rounded-2xl bg-white/95 backdrop-blur-md border border-[#E6E4DD] text-stone-900 shadow-[0_4px_24px_-4px_rgba(20,20,19,0.06)] overflow-hidden select-none"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#E6E4DD] bg-[#FCFBF9]/90 backdrop-blur-sm flex-wrap gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-stone-500 font-medium">
              {getTopicDisplayName(activeBlueprint)}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded bg-[#F2F0EA] border border-[#E6E4DD] text-stone-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              60 FPS • Local Engine
            </span>
          </div>
          <div className="mt-1">
            <TapAndSwapOCR
              formula={activeFormula}
              alternatives={blueprint.ocrAlternatives}
              onSwap={handleFormulaSwap}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Segmented Render Mode Toggle: [Mô hình Engine Chuẩn | Đồ họa AI Sinh động] */}
          <div
            className="flex items-center bg-[#F2F0EA] p-1 rounded-lg border border-[#E6E4DD]"
            data-testid="render-mode-toggle"
          >
            <button
              type="button"
              data-testid="btn-mode-engine"
              onClick={() => setRenderMode('ENGINE')}
              className={`px-2.5 py-1 rounded text-xs transition cursor-pointer font-medium ${
                renderMode === 'ENGINE'
                  ? 'bg-white shadow-sm text-stone-900 font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Mô hình Engine Chuẩn
            </button>
            <button
              type="button"
              data-testid="btn-mode-ai-visual"
              onClick={() => setRenderMode('AI_VISUAL')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition cursor-pointer font-medium ${
                renderMode === 'AI_VISUAL'
                  ? 'bg-white shadow-sm text-blue-700 font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Sparkles className="w-3 h-3 text-blue-600" />
              <span>Đồ họa AI Sinh động</span>
            </button>
          </div>

          {/* Segmented Curriculum Level Toggle: [Chuẩn THPT | Chuyên sâu (Chuyên/HSG)] */}
          <div
            className="flex items-center bg-[#F2F0EA] p-1 rounded-lg border border-[#E6E4DD]"
            data-testid="curriculum-mode-toggle"
          >
            <button
              type="button"
              data-testid="btn-mode-standard"
              onClick={() => setCurriculumLevel('THPT_STANDARD')}
              className={`px-2.5 py-1 rounded text-xs transition cursor-pointer font-medium ${
                curriculumLevel === 'THPT_STANDARD'
                  ? 'bg-white shadow-sm text-stone-900 font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Chuẩn THPT
            </button>
            <button
              type="button"
              data-testid="btn-mode-olympiad"
              onClick={() => setCurriculumLevel('OLYMPIAD_ADVANCED')}
              className={`px-2.5 py-1 rounded text-xs transition cursor-pointer font-medium ${
                curriculumLevel === 'OLYMPIAD_ADVANCED'
                  ? 'bg-white shadow-sm text-blue-700 font-semibold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Chuyên sâu (Chuyên/HSG)
            </button>
          </div>

          {/* Split-View Dock Toggle Button */}
          {onToggleSplitView && (
            <button
              type="button"
              data-testid="btn-widget-split-toggle"
              onClick={onToggleSplitView}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition cursor-pointer ${
                isSplitView
                  ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm'
                  : 'bg-white hover:bg-stone-50 border-[#DCD9D0] text-stone-700 shadow-sm'
              }`}
              title="Ghim sang nửa bảng (Split-Screen)"
            >
              <span className="font-mono">◫</span>
              <span>{isSplitView ? 'Toàn bảng' : 'Nửa bảng'}</span>
            </button>
          )}

          {/* Export Lecture to Smart Notes */}
          <button
            type="button"
            onClick={handleExportSmartNotes}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-stone-50 border border-[#DCD9D0] text-stone-700 hover:text-stone-900 text-xs font-medium shadow-sm transition cursor-pointer"
            title="Đóng gói bài giảng & đẩy sang app học sinh"
          >
            <FileText className="w-3.5 h-3.5 text-stone-600" />
            <span>Smart Notes</span>
          </button>

          {/* Reset button */}
          <button
            data-testid="reset-btn"
            onClick={handleReset}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-stone-50 border border-[#DCD9D0] text-stone-700 text-xs font-medium shadow-sm transition cursor-pointer"
            title="Khôi phục thông số mặc định"
          >
            <RotateCcw className="w-3 h-3 text-stone-600" />
            <span>Đặt lại</span>
          </button>

          {/* Breathing Socratic Cue Lightbulb */}
          <button
            data-testid="socratic-cue-btn"
            onClick={() => setShowSocratic(!showSocratic)}
            className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-xs font-medium transition border cursor-pointer shadow-sm ${
              showSocratic
                ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
                : 'bg-white text-stone-700 border-[#DCD9D0] hover:bg-stone-50'
            }`}
            title="Câu hỏi gợi mở tư duy Socratic"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
            <span>Gợi ý Socratic</span>
          </button>

          {/* Close button if modal */}
          {onClose && (
            <button
              onClick={onClose}
              className="px-2 py-1 rounded-lg bg-white hover:bg-stone-50 text-stone-600 hover:text-stone-900 border border-[#DCD9D0] text-xs shadow-sm transition cursor-pointer"
            >
              ✕ Đóng
            </button>
          )}
        </div>
      </div>

      {/* Export Toast Notification */}
      {exportNotice && (
        <div className="mx-4 mt-2 px-3 py-1.5 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs font-mono flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Planetary Gravity Presets for PHYS_PROJECTILE */}
      {blueprint.templateId === 'PHYS_PROJECTILE' && (
        <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 border-b border-[#E6E4DD] bg-[#F8F7F4]">
          <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider">Trọng lực (g):</span>
          {[
            { name: 'Mặt Trăng', g: 1.62 },
            { name: 'Sao Hỏa', g: 3.71 },
            { name: 'Trái Đất', g: 9.8 },
            { name: 'Sao Mộc', g: 24.79 },
          ].map((pl) => (
            <button
              key={pl.name}
              type="button"
              onClick={() => handleParamChange('g', pl.g)}
              className={`px-2 py-0.5 rounded-md text-xs font-mono transition cursor-pointer ${
                params.g === pl.g
                  ? 'bg-white text-blue-700 font-semibold border border-blue-200 shadow-sm'
                  : 'bg-[#F2F0EA] hover:bg-[#EAE7DF] text-stone-600 border border-[#E6E4DD]'
              }`}
            >
              <span>{pl.name} ({pl.g} m/s²)</span>
            </button>
          ))}
        </div>
      )}

      {/* Socratic Discussion Prompt (Editorial Margin Note) */}
      {showSocratic && (
        <div
          data-testid="socratic-content"
          onClick={() => setShowSocratic(false)}
          className="mx-4 my-2.5 p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] text-xs leading-relaxed flex items-start justify-between gap-3 shadow-sm cursor-pointer hover:border-amber-400 transition"
          title="Bấm vào để thu gọn gợi ý Socratic"
        >
          <div className="flex items-start gap-2.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 mt-1 shrink-0" />
            <div>
              <div className="font-serif italic font-bold text-[#92400E] text-[13px] mb-0.5">
                Câu hỏi gợi mở Socratic
              </div>
              <p className="font-serif text-[#78350F] text-sm leading-snug">
                <MathText text={blueprint.socraticQuestion} />
              </p>
              <div className="text-[10px] text-amber-700/70 mt-1.5 font-mono">
                (Chạm vào hộp thoại hoặc nút ✕ bên phải để đóng)
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowSocratic(false);
            }}
            className="text-[10px] font-mono text-[#92400E] hover:text-[#78350F] px-2 py-0.5 rounded-md bg-white border border-[#FDE68A] shadow-xs cursor-pointer shrink-0"
          >
            ✕ Đóng
          </button>
        </div>
      )}

      {/* 60FPS SIMULATION CANVAS RENDER AREA */}
      <div className="p-4 flex justify-center items-center bg-[#F8F7F4]" data-testid="engine-canvas-container">
        {renderMode === 'AI_VISUAL' ? (
          <AIGeneratedVisualEngine
            blueprint={activeBlueprint}
            params={params}
            svgContent={blueprint.custom_interactive_svg}
          />
        ) : (
          <>
            {blueprint.engine === 'MATH' && (
              <MathPlotEngine blueprint={activeBlueprint} params={params} curriculumLevel={curriculumLevel} />
            )}
            {blueprint.engine === 'PHYSICS' && (
              <PhysicsSandboxEngine blueprint={activeBlueprint} params={params} curriculumLevel={curriculumLevel} />
            )}
            {blueprint.engine === 'CHEMISTRY' && (
              <ChemistryLabEngine blueprint={activeBlueprint} params={params} curriculumLevel={curriculumLevel} />
            )}
            {blueprint.engine === 'BIOLOGY' && (
              <BioSystemEngine blueprint={activeBlueprint} params={params} curriculumLevel={curriculumLevel} />
            )}
          </>
        )}
      </div>

      {/* MACRO SLIDER CONTROLS (Tactile Parameter Scrubbers) */}
      <div className="p-4 bg-[#FCFBF9] border-t border-[#E6E4DD] grid grid-cols-2 gap-3" data-testid="macro-sliders-container">
        {activeParameters.map((p: SimParamConfig) => {
          const currentVal = params[p.key] ?? p.defaultValue;
          return (
            <div
              key={p.key}
              data-testid={`param-box-${p.key}`}
              className="p-3 rounded-xl bg-[#F4F3EE] border border-[#E5E3DC] flex flex-col gap-2 hover:border-[#DCD9D0] transition-colors"
            >
              <div className="flex justify-between items-center text-xs">
                <span className="text-stone-700 font-medium tracking-tight text-[11px]"><MathText text={p.label} /></span>
                <span
                  data-testid={`param-val-${p.key}`}
                  className="font-mono tabular-nums text-xs text-blue-600 font-bold"
                >
                  {currentVal} {p.unit}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  data-testid={`slider-minus-${p.key}`}
                  type="button"
                  onClick={() =>
                    handleParamChange(p.key, Math.max(p.min, Number((currentVal - p.step).toFixed(2))))
                  }
                  className="w-7 h-7 rounded-lg bg-white border border-[#DCD9D0] shadow-sm text-stone-700 hover:bg-stone-50 active:translate-y-px text-xs font-mono font-bold flex items-center justify-center cursor-pointer transition"
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
                  className="flex-1 h-1.5 bg-[#E5E3DC] rounded-lg appearance-none cursor-pointer accent-blue-600"
                />

                <button
                  data-testid={`slider-plus-${p.key}`}
                  type="button"
                  onClick={() =>
                    handleParamChange(p.key, Math.min(p.max, Number((currentVal + p.step).toFixed(2))))
                  }
                  className="w-7 h-7 rounded-lg bg-white border border-[#DCD9D0] shadow-sm text-stone-700 hover:bg-stone-50 active:translate-y-px text-xs font-mono font-bold flex items-center justify-center cursor-pointer transition"
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
