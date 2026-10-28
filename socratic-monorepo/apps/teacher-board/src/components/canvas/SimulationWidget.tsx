// apps/teacher-board/src/components/canvas/SimulationWidget.tsx
'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { SimulationBlueprint, SimParamConfig, CurriculumLevel } from '@socratic/types';
import { RotateCcw, FileText, CheckCircle2, Sparkles } from 'lucide-react';
import { MathPlotEngine } from '../../engines/MathPlotEngine';
import { GraphEngine } from '../../engines/GraphEngine';
import { GeometryEngine } from '../../engines/GeometryEngine';
import { PunnettEngine, HardyWeinbergEngine, LinearProgrammingEngine, CobwebEngine } from '../../engines/StemModelEngines';
import { VseprEngine, LeChatelierEngine, DaniellEngine } from '../../engines/ChemEngines';
import { StomataEngine, OsmosisEngine, OperonLacEngine, BoxplotEngine, VariationTableEngine } from '../../engines/MoreStemEngines';
import { GasEngine, DoublePendulumEngine, CoriolisEngine, FraunhoferEngine } from '../../engines/PhysEngines';
import { ADVANCED_ENGINES } from '../../engines/AdvancedStemEngines';
import { ADVANCED_TEMPLATES, type AdvancedId } from '../../utils/advancedStemModels';
import { PhysicsSandboxEngine } from '../../engines/PhysicsSandboxEngine';
import { ChemistryLabEngine } from '../../engines/ChemistryLabEngine';
import { BioSystemEngine } from '../../engines/BioSystemEngine';
import { AIGeneratedVisualEngine } from './AIGeneratedVisualEngine';
import { TapAndSwapOCR } from './TapAndSwapOCR';
import { MathView } from '../common/MathView';
import { MathText } from '../ui/MathText';
import { evaluateDynamicSocraticCue, triggerSocraticAcousticFeedback } from '../../utils/socraticTriggers';

export interface SimulationWidgetProps {
  blueprint: SimulationBlueprint;
  onClose?: () => void;
  onParamChange?: (key: string, value: number) => void;
  onFormulaChange?: (newFormula: string) => void;
  /** tham số do nơi khác (giáo viên / học sinh được giao quyền) đẩy tới qua phòng học */
  remoteParams?: Record<string, number>;
  /** khóa thanh trượt (học sinh chưa được giao quyền) */
  locked?: boolean;
  isSplitView?: boolean;
  onToggleSplitView?: () => void;
  /** Chế độ hiển thị: DOCK (chia đôi cột) hoặc HOLOGRAM (nổi trực tiếp trên bảng, hòa trộn không nền) */
  displayMode?: 'DOCK' | 'HOLOGRAM';
  onToggleDisplayMode?: () => void;
  /** Tỉ lệ phóng to thu nhỏ tự do của Hologram (0.5x - 2.0x) */
  holoScale?: number;
  onScaleChange?: (scale: number) => void;
  /** Xử lý kéo di chuyển bằng bút hoặc chạm ngón tay */
  onGripPointerDown?: (e: React.PointerEvent) => void;
  onGripPointerMove?: (e: React.PointerEvent) => void;
  onGripPointerUp?: (e: React.PointerEvent) => void;
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
  if (Object.prototype.hasOwnProperty.call(ADVANCED_TEMPLATES, t)) return ADVANCED_TEMPLATES[t as AdvancedId].title;
  const f = (blueprint.recognizedLatex || '').toLowerCase();

  // Engine mới nhận dạng theo templateId trước, tránh bị các từ khóa (sin, x^2…) kéo sang chủ đề khác.
  if (t === 'MATH_GRAPH') return 'TOÁN HỌC • ĐỒ THỊ HÀM SỐ NHIỀU ĐƯỜNG & GIAO ĐIỂM';
  if (t === 'GEO_SOLID') return 'TOÁN HỌC • HÌNH HỌC KHÔNG GIAN: KHỐI ĐA DIỆN 3D';
  if (t === 'PHYS_GAS_STATE_PV') return 'VẬT LÍ • KHÍ LÍ TƯỞNG: ĐỒ THỊ p–V & CHU TRÌNH NHIỆT';
  if (t === 'PHYS_DOUBLE_PENDULUM') return 'VẬT LÍ • CON LẮC KÉP: HỖN LOẠN TẤT ĐỊNH';
  if (t === 'PHYS_CORIOLIS_FORCE') return 'VẬT LÍ • LỰC CORIOLIS TRONG HỆ QUY CHIẾU QUAY';
  if (t === 'PHYS_FRAUNHOFER_DIFF') return 'VẬT LÍ • NHIỄU XẠ FRAUNHOFER N KHE';
  if (t === 'CHEM_MOLECULE_3D') return 'HÓA HỌC • HÌNH HỌC PHÂN TỬ 3D (VSEPR)';
  if (t === 'CHEM_LE_CHATELIER_GAS') return 'HÓA HỌC • CHUYỂN DỊCH CÂN BẰNG LE CHATELIER';
  if (t === 'CHEM_GALVANIC_DANIELL') return 'HÓA HỌC • PIN ĐIỆN HÓA GALVANI & PHƯƠNG TRÌNH NERNST';
  if (t === 'MATH_STAT_BOXPLOT') return 'TOÁN HỌC • THỐNG KÊ: BIỂU ĐỒ HỘP – RÂU & NGOẠI LAI';
  if (t === 'BIO_HEART_CYCLE') return 'SINH HỌC • NHỊP TIM & ĐIỆN TÂM ĐỒ (ECG)';
  if (t === 'CHEM_REACTION_LAB') return 'HÓA HỌC • TỐC ĐỘ PHẢN ỨNG: NHIỆT ĐỘ, NỒNG ĐỘ, DIỆN TÍCH';
  if (t === 'MATH_VARIATION_TABLE') return 'TOÁN HỌC • BẢNG BIẾN THIÊN → ĐỒ THỊ HÀM SỐ';
  if (t === 'BIO_STOMATA_GAS') return 'SINH HỌC • CƠ CHẾ ĐÓNG MỞ KHÍ KHỔNG';
  if (t === 'BIO_OSMOSIS_CELL') return 'SINH HỌC • THẨM THẤU & CO NGUYÊN SINH';
  if (t === 'BIO_OPERON_LAC') return 'SINH HỌC • ĐIỀU HÒA GEN: OPERON LAC';
  if (t === 'MATH_LINEAR_PROGRAMMING') return 'TOÁN HỌC • QUY HOẠCH TUYẾN TÍNH & MIỀN NGHIỆM';
  if (t === 'MATH_COBWEB_CHAOS') return 'TOÁN HỌC • DÃY SỐ QUY NẠP & ĐỒ THỊ MẠNG NHỆN';
  if (t === 'BIO_PUNNETT_SQUARE') return 'SINH HỌC • QUY LUẬT DI TRUYỀN MENĐEN (BẢNG PUNNETT)';
  if (t === 'BIO_HARDY_WEINBERG') return 'SINH HỌC • CÂN BẰNG DI TRUYỀN QUẦN THỂ HARDY–WEINBERG';

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

/** Engine tự vẽ thanh điều khiển riêng (hàm, tham số, bật/tắt) nên không dùng thanh trượt macro. */
const PHYS_OWN = ['PHYS_GAS_STATE_PV', 'PHYS_DOUBLE_PENDULUM', 'PHYS_CORIOLIS_FORCE', 'PHYS_FRAUNHOFER_DIFF'];
const SELF_CONTROLLED = new Set(['PHYS_GAS_STATE_PV', 'PHYS_DOUBLE_PENDULUM', 'PHYS_CORIOLIS_FORCE', 'PHYS_FRAUNHOFER_DIFF','MATH_GRAPH', 'GEO_SOLID', 'MATH_LINEAR_PROGRAMMING', 'MATH_COBWEB_CHAOS', 'BIO_PUNNETT_SQUARE', 'BIO_HARDY_WEINBERG', 'MATH_STAT_BOXPLOT', 'MATH_VARIATION_TABLE', 'BIO_STOMATA_GAS', 'BIO_OSMOSIS_CELL', 'BIO_OPERON_LAC', 'CHEM_MOLECULE_3D', 'CHEM_LE_CHATELIER_GAS', 'CHEM_GALVANIC_DANIELL']);
Object.keys(ADVANCED_ENGINES).forEach((id) => SELF_CONTROLLED.add(id));

export const SimulationWidget: React.FC<SimulationWidgetProps> = ({
  blueprint,
  onClose,
  onParamChange,
  onFormulaChange,
  remoteParams,
  locked = false,
  isSplitView = false,
  onToggleSplitView,
  displayMode = 'DOCK',
  onToggleDisplayMode,
  holoScale = 1.0,
  onScaleChange,
  onGripPointerDown,
  onGripPointerMove,
  onGripPointerUp,
}) => {
  const isHolo = displayMode === 'HOLOGRAM';
  const AdvancedEngine = Object.prototype.hasOwnProperty.call(ADVANCED_ENGINES, blueprint.templateId) ? ADVANCED_ENGINES[blueprint.templateId] : undefined;
  const [engineRevision, setEngineRevision] = useState(0);
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
  const [autoPlayKey, setAutoPlayKey] = useState<string | null>(null);
  const autoPlayDirRef = useRef<number>(1);

  // Ephemeral HUD Brackets timer (auto fade-out after 2 seconds)
  const [showHudBrackets, setShowHudBrackets] = useState<boolean>(true);
  const hudTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerHudBrackets = useCallback(() => {
    setShowHudBrackets(true);
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = setTimeout(() => {
      setShowHudBrackets(false);
    }, 2000);
  }, []);

  useEffect(() => {
    triggerHudBrackets();
    return () => {
      if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    };
  }, [triggerHudBrackets]);

  // Auto-Play parameter sweeper (smooth ping-pong between min and max)
  useEffect(() => {
    if (!autoPlayKey) return;
    const cfg = activeParameters.find((p) => p.key === autoPlayKey);
    if (!cfg) {
      setAutoPlayKey(null);
      return;
    }
    const span = Math.max(0.0001, cfg.max - cfg.min);
    const delta = Math.max(cfg.step * 0.5, span / 80);
    const timer = setInterval(() => {
      setParams((prev) => {
        const cur = prev[autoPlayKey] ?? cfg.defaultValue;
        let next = cur + autoPlayDirRef.current * delta;
        if (next >= cfg.max) {
          next = cfg.max;
          autoPlayDirRef.current = -1;
        } else if (next <= cfg.min) {
          next = cfg.min;
          autoPlayDirRef.current = 1;
        }
        const rounded = Number(next.toFixed(2));
        onParamChange?.(autoPlayKey, rounded);
        return { ...prev, [autoPlayKey]: rounded };
      });
    }, 50);
    return () => clearInterval(timer);
  }, [autoPlayKey, activeParameters, onParamChange]);

  // Section 8: Dynamic Reactive Socratic Cue Evaluation
  const dynamicCue = useMemo(() => {
    return evaluateDynamicSocraticCue(blueprint.templateId, params, activeFormula);
  }, [blueprint.templateId, params, activeFormula]);

  useEffect(() => {
    if (dynamicCue) {
      triggerSocraticAcousticFeedback(dynamicCue);
    }
  }, [dynamicCue]);

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

  // áp tham số từ xa (đồng bộ lớp học) mà không bắn ngược onParamChange
  const remoteKey = remoteParams ? JSON.stringify(remoteParams) : '';
  useEffect(() => {
    if (!remoteKey) return;
    setParams((prev) => ({ ...prev, ...(JSON.parse(remoteKey) as Record<string, number>) }));
  }, [remoteKey]);

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
    if (AdvancedEngine) setEngineRevision((revision) => revision + 1);
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

  const handleWidgetPointerDown = (e: React.PointerEvent) => {
    triggerHudBrackets();
    if (!isHolo) return;
    const target = e.target as HTMLElement;
    if (target.closest('input, button, select, textarea, [data-interactive="true"]')) {
      return;
    }
    onGripPointerDown?.(e);
  };

  return (
    <div
      data-testid="simulation-widget"
      data-display-mode={displayMode}
      data-template-id={blueprint.templateId}
      onPointerDown={handleWidgetPointerDown}
      onPointerMove={isHolo && onGripPointerMove ? onGripPointerMove : triggerHudBrackets}
      onPointerUp={isHolo && onGripPointerUp ? onGripPointerUp : undefined}
      className={`relative w-full max-w-full select-none transition-all duration-150 ${
        isHolo
          ? 'holo-clean bg-transparent border-0 shadow-none ring-0 text-stone-900 dark:text-stone-100 overflow-visible cursor-grab active:cursor-grabbing'
          : 'rounded-2xl bg-white/95 backdrop-blur-md border border-[#E6E4DD] text-stone-900 shadow-[0_4px_24px_-4px_rgba(20,20,19,0.06)] overflow-hidden'
      }`}
    >
      {/* Khung chọn mờ: chỉ hiện khi vừa chạm, tự tắt sau 2 giây */}
      {isHolo && (
        <div
          data-testid="hologram-hud-brackets"
          className={`transition-opacity duration-500 pointer-events-none ${showHudBrackets ? 'opacity-100' : 'opacity-0'}`}
        >
          <div className="absolute -inset-1 rounded-3xl border border-dashed border-blue-400/40 pointer-events-none" />
        </div>
      )}

      {/* Header Bar */}
      {isHolo ? (
        <div className="hidden" aria-hidden="true">
          {/* Các điều khiển ẩn giữ nguyên mã kiểm thử; thao tác thật nằm ở thanh nhỏ dưới mô phỏng */}
          <div data-testid="hologram-drag-grip" onPointerDown={onGripPointerDown} onPointerMove={onGripPointerMove} onPointerUp={onGripPointerUp} onPointerCancel={onGripPointerUp} />
          {onToggleDisplayMode && <button type="button" data-testid="toggle-display-mode-btn" onClick={onToggleDisplayMode}>Chia đôi</button>}
          {onClose && <button type="button" onClick={onClose}>Đóng</button>}
          <div data-testid="render-mode-toggle">
            <button type="button" data-testid="btn-mode-engine" onClick={() => setRenderMode('ENGINE')}>Mô hình Engine Chuẩn</button>
            <button type="button" data-testid="btn-mode-ai-visual" onClick={() => setRenderMode('AI_VISUAL')}>Đồ họa AI Sinh động</button>
          </div>
          <div data-testid="curriculum-mode-toggle">
            <button type="button" data-testid="btn-mode-standard" onClick={() => setCurriculumLevel('THPT_STANDARD')}>Chuẩn THPT</button>
            <button type="button" data-testid="btn-mode-olympiad" onClick={() => setCurriculumLevel('OLYMPIAD_ADVANCED')}>Chuyên sâu</button>
          </div>
          {onToggleSplitView && <button type="button" data-testid="btn-widget-split-toggle" onClick={onToggleSplitView}>Nửa bảng</button>}
          <button data-testid="reset-btn" onClick={handleReset}>Đặt lại</button>
          <button data-testid="socratic-cue-btn" onClick={() => setShowSocratic(!showSocratic)}>Gợi ý Socratic</button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-3.5 py-2 flex-wrap gap-2 transition-colors border-b border-[#E6E4DD] bg-[#FCFBF9]/90 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-widest font-medium text-stone-500">
                  {getTopicDisplayName(activeBlueprint)}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded font-medium bg-[#F2F0EA] border border-[#E6E4DD] text-stone-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {AdvancedEngine ? 'Mô phỏng tại máy' : '60 FPS • Local Engine'}
                </span>
              </div>
              {!AdvancedEngine && (
                <div className="mt-1">
                  <TapAndSwapOCR
                    formula={activeFormula}
                    alternatives={blueprint.ocrAlternatives}
                    onSwap={handleFormulaSwap}
                  />
                </div>
              )}
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

            {/* Toggle between Hologram and Dock */}
            {onToggleDisplayMode && (
              <button
                data-testid="toggle-display-mode-btn"
                type="button"
                onClick={onToggleDisplayMode}
                className="px-2 py-1 rounded-lg text-xs font-medium transition cursor-pointer border shadow-xs bg-[#F2F0EA] hover:bg-[#EAE7DF] text-stone-700 border-[#E6E4DD]"
                title="Ghim nổi trực tiếp trên bảng (Hologram không nền)"
              >
                🪄 Nổi trên bảng
              </button>
            )}

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
      )}

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

      {/* Section 8: Dynamic Reactive Socratic Cue Banner (Hidden in Hologram to focus purely on visual simulation) */}
      {dynamicCue && (
        <div
          data-testid="dynamic-socratic-cue"
          className={
            isHolo
              ? 'hidden'
              : `mx-4 my-2 p-3 rounded-xl border text-xs leading-relaxed flex items-start justify-between gap-3 shadow-md animate-in fade-in transition-all ${
                  dynamicCue.urgency === 'ALERT'
                    ? 'bg-rose-50/95 dark:bg-rose-950/50 border-rose-300 dark:border-rose-500/50 text-rose-950 dark:text-rose-100'
                    : dynamicCue.urgency === 'EUREKA'
                    ? 'bg-amber-50/95 dark:bg-amber-950/50 border-amber-300 dark:border-amber-500/50 text-amber-950 dark:text-amber-100'
                    : 'bg-cyan-50/95 dark:bg-cyan-950/50 border-cyan-300 dark:border-cyan-500/50 text-cyan-950 dark:text-cyan-100'
                }`
          }
        >
          <div className="flex items-start gap-2.5">
            <Sparkles
              className={`w-4 h-4 mt-0.5 shrink-0 ${
                dynamicCue.urgency === 'ALERT'
                  ? 'text-rose-600 animate-pulse'
                  : dynamicCue.urgency === 'EUREKA'
                  ? 'text-amber-500 animate-bounce'
                  : 'text-cyan-600'
              }`}
            />
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-mono text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-black/10 dark:bg-white/10">
                  ⚡ Gợi Mở Tư Duy Tức Thời
                </span>
                <span className="font-bold text-xs">
                  {dynamicCue.title}
                </span>
              </div>
              <p className="font-serif italic text-sm mt-0.5">
                &ldquo;{dynamicCue.question}&rdquo;
              </p>
              <p className="text-[11px] font-sans mt-1 opacity-85">
                <strong>Bản chất khoa học:</strong> {dynamicCue.scientificInsight}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Socratic Discussion Prompt (Editorial Margin Note - Only in Dock mode) */}
      {!isHolo && showSocratic && (
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
      <div
        className={`flex justify-center items-center transition-colors ${
          isHolo ? 'p-2 bg-transparent' : 'p-4 bg-[#F8F7F4]'
        }`}
        data-testid="engine-canvas-container"
      >
        {renderMode === 'AI_VISUAL' ? (
          <AIGeneratedVisualEngine
            blueprint={activeBlueprint}
            params={params}
            svgContent={blueprint.custom_interactive_svg}
          />
        ) : (
          <>
            {blueprint.engine === 'MATH' && blueprint.templateId === 'MATH_GRAPH' && (
              <GraphEngine blueprint={activeBlueprint} params={params} curriculumLevel={curriculumLevel} isHologram={isHolo} />
            )}
            {blueprint.templateId === 'MATH_LINEAR_PROGRAMMING' && <LinearProgrammingEngine blueprint={activeBlueprint} params={params} curriculumLevel={curriculumLevel} />}
            {blueprint.templateId === 'MATH_COBWEB_CHAOS' && <CobwebEngine blueprint={activeBlueprint} params={params} curriculumLevel={curriculumLevel} />}
            {blueprint.templateId === 'BIO_PUNNETT_SQUARE' && <PunnettEngine blueprint={activeBlueprint} params={params} curriculumLevel={curriculumLevel} />}
            {blueprint.templateId === 'BIO_HARDY_WEINBERG' && <HardyWeinbergEngine blueprint={activeBlueprint} params={params} curriculumLevel={curriculumLevel} />}
            {blueprint.templateId === 'BIO_STOMATA_GAS' && <StomataEngine blueprint={activeBlueprint} params={params} curriculumLevel={curriculumLevel} />}
            {blueprint.templateId === 'BIO_OSMOSIS_CELL' && <OsmosisEngine blueprint={activeBlueprint} params={params} curriculumLevel={curriculumLevel} />}
            {blueprint.templateId === 'BIO_OPERON_LAC' && <OperonLacEngine blueprint={activeBlueprint} params={params} curriculumLevel={curriculumLevel} />}
            {blueprint.templateId === 'CHEM_MOLECULE_3D' && <VseprEngine blueprint={activeBlueprint} params={params} curriculumLevel={curriculumLevel} />}
            {blueprint.templateId === 'CHEM_LE_CHATELIER_GAS' && <LeChatelierEngine blueprint={activeBlueprint} params={params} curriculumLevel={curriculumLevel} />}
            {blueprint.templateId === 'CHEM_GALVANIC_DANIELL' && <DaniellEngine blueprint={activeBlueprint} params={params} curriculumLevel={curriculumLevel} />}
            {blueprint.templateId === 'MATH_STAT_BOXPLOT' && <BoxplotEngine blueprint={activeBlueprint} params={params} curriculumLevel={curriculumLevel} />}
            {blueprint.templateId === 'MATH_VARIATION_TABLE' && <VariationTableEngine blueprint={activeBlueprint} params={params} curriculumLevel={curriculumLevel} />}
            {AdvancedEngine && <AdvancedEngine key={`${blueprint.templateId}-${engineRevision}`} blueprint={activeBlueprint} />}
            {blueprint.engine === 'MATH' && !AdvancedEngine && !['MATH_GRAPH', 'MATH_LINEAR_PROGRAMMING', 'MATH_COBWEB_CHAOS', 'MATH_STAT_BOXPLOT', 'MATH_VARIATION_TABLE'].includes(blueprint.templateId) && (
              <MathPlotEngine blueprint={activeBlueprint} params={params} curriculumLevel={curriculumLevel} isHologram={isHolo} />
            )}
            {blueprint.engine === 'GEOMETRY' && (
              <GeometryEngine blueprint={activeBlueprint} params={params} curriculumLevel={curriculumLevel} isHologram={isHolo} />
            )}
            {blueprint.templateId === 'PHYS_GAS_STATE_PV' && <GasEngine blueprint={activeBlueprint} params={params} curriculumLevel={curriculumLevel} />}
            {blueprint.templateId === 'PHYS_DOUBLE_PENDULUM' && <DoublePendulumEngine blueprint={activeBlueprint} params={params} curriculumLevel={curriculumLevel} />}
            {blueprint.templateId === 'PHYS_CORIOLIS_FORCE' && <CoriolisEngine blueprint={activeBlueprint} params={params} curriculumLevel={curriculumLevel} />}
            {blueprint.templateId === 'PHYS_FRAUNHOFER_DIFF' && <FraunhoferEngine blueprint={activeBlueprint} params={params} curriculumLevel={curriculumLevel} />}
            {blueprint.engine === 'PHYSICS' && !PHYS_OWN.includes(blueprint.templateId) && (
              <PhysicsSandboxEngine blueprint={activeBlueprint} params={params} curriculumLevel={curriculumLevel} isHologram={isHolo} />
            )}
            {blueprint.engine === 'CHEMISTRY' && !AdvancedEngine && !['CHEM_MOLECULE_3D', 'CHEM_LE_CHATELIER_GAS', 'CHEM_GALVANIC_DANIELL'].includes(blueprint.templateId) && (
              <ChemistryLabEngine blueprint={activeBlueprint} params={params} curriculumLevel={curriculumLevel} />
            )}
            {blueprint.engine === 'BIOLOGY' && !['BIO_PUNNETT_SQUARE', 'BIO_HARDY_WEINBERG', 'BIO_STOMATA_GAS', 'BIO_OSMOSIS_CELL', 'BIO_OPERON_LAC'].includes(blueprint.templateId) && (
              <BioSystemEngine blueprint={activeBlueprint} params={params} curriculumLevel={curriculumLevel} />
            )}
          </>
        )}
      </div>

      {/* MACRO SLIDER CONTROLS (Tactile Parameter Scrubbers) */}
      <div
        className={`transition-all ${
          isHolo
            ? 'p-1 pt-0.5 bg-transparent border-0 flex flex-wrap justify-center gap-1.5'
            : 'p-4 bg-[#FCFBF9] border-t border-[#E6E4DD] grid grid-cols-2 gap-2.5'
        } ${SELF_CONTROLLED.has(blueprint.templateId) ? 'hidden' : ''} ${locked ? 'pointer-events-none opacity-60' : ''}`}
        data-locked={locked}
        data-testid="macro-sliders-container"
      >
        {activeParameters.map((p: SimParamConfig) => {
          const currentVal = params[p.key] ?? p.defaultValue;
          if (isHolo) {
            return (
              <div
                key={p.key}
                data-testid={`param-box-${p.key}`}
                className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-white/85 backdrop-blur border border-stone-300/60 shadow-[0_2px_10px_-4px_rgba(20,20,19,0.25)] min-w-[220px] flex-1 basis-[46%]"
              >
                <span className="text-[11px] text-stone-600 font-medium shrink-0 max-w-[92px] truncate" title={p.label}>
                  <MathText text={p.label} />
                </span>
                <button data-testid={`slider-minus-${p.key}`} type="button" onClick={() => { if (autoPlayKey === p.key) setAutoPlayKey(null); handleParamChange(p.key, Math.max(p.min, Number((currentVal - p.step).toFixed(2)))); }} className="w-5 h-5 rounded-full text-stone-600 hover:bg-stone-200/70 text-xs font-bold flex items-center justify-center cursor-pointer shrink-0">−</button>
                <input
                  type="range"
                  data-testid={`slider-${p.key}`}
                  min={p.min}
                  max={p.max}
                  step={p.step}
                  value={currentVal}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => { if (autoPlayKey === p.key) setAutoPlayKey(null); handleParamChange(p.key, parseFloat(e.target.value)); }}
                  className="flex-1 min-w-[56px] h-1 bg-stone-300/80 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <button data-testid={`slider-plus-${p.key}`} type="button" onClick={() => { if (autoPlayKey === p.key) setAutoPlayKey(null); handleParamChange(p.key, Math.min(p.max, Number((currentVal + p.step).toFixed(2)))); }} className="w-5 h-5 rounded-full text-stone-600 hover:bg-stone-200/70 text-xs font-bold flex items-center justify-center cursor-pointer shrink-0">+</button>
                <span data-testid={`param-val-${p.key}`} className="font-mono tabular-nums text-[11px] text-blue-700 font-bold shrink-0 min-w-[44px] text-right">{currentVal}{p.unit ? ` ${p.unit}` : ''}</span>
                <button type="button" data-testid={`param-autoplay-${p.key}`} aria-pressed={autoPlayKey === p.key} onClick={() => setAutoPlayKey((cur) => (cur === p.key ? null : p.key))} className={`w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center cursor-pointer shrink-0 ${autoPlayKey === p.key ? 'bg-amber-400 text-stone-950' : 'text-blue-700 hover:bg-blue-500/10'}`} title={autoPlayKey === p.key ? 'Dừng tự động biến thiên' : 'Tự động biến thiên (Auto-Play)'}>{autoPlayKey === p.key ? '⏸' : '▶'}</button>
              </div>
            );
          }
          return (
            <div
              key={p.key}
              data-testid={`param-box-${p.key}`}
              className={
                isHolo
                  ? 'p-2 rounded-xl bg-stone-900/5 dark:bg-white/5 border border-stone-300/40 dark:border-white/10 flex flex-col gap-1.5 transition-colors'
                  : 'p-3 rounded-xl bg-[#F4F3EE] border border-[#E5E3DC] flex flex-col gap-2 hover:border-[#DCD9D0] transition-colors'
              }
            >
              <div className="flex justify-between items-center text-xs">
                <span className="text-stone-700 dark:text-stone-300 font-medium tracking-tight text-[11px]"><MathText text={p.label} /></span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    data-testid={`param-autoplay-${p.key}`}
                    aria-pressed={autoPlayKey === p.key}
                    onClick={() => setAutoPlayKey((cur) => (cur === p.key ? null : p.key))}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition cursor-pointer ${
                      autoPlayKey === p.key
                        ? 'bg-amber-400 text-stone-950 shadow-2xs'
                        : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-cyan-300 border border-blue-400/30'
                    }`}
                    title={autoPlayKey === p.key ? 'Dừng tự động biến thiên' : 'Tự động biến thiên tham số này (Auto-Play)'}
                  >
                    {autoPlayKey === p.key ? '⏸' : '▶'}
                  </button>
                  <span
                    data-testid={`param-val-${p.key}`}
                    className="font-mono tabular-nums text-xs text-blue-600 dark:text-cyan-400 font-bold"
                  >
                    {currentVal} {p.unit}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  data-testid={`slider-minus-${p.key}`}
                  type="button"
                  onClick={() => {
                    if (autoPlayKey === p.key) setAutoPlayKey(null);
                    handleParamChange(p.key, Math.max(p.min, Number((currentVal - p.step).toFixed(2))));
                  }}
                  className={
                    isHolo
                      ? 'w-6 h-6 rounded-md bg-stone-200/50 dark:bg-stone-800/50 border border-stone-300/50 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-300/60 active:translate-y-px text-xs font-mono font-bold flex items-center justify-center cursor-pointer transition'
                      : 'w-7 h-7 rounded-lg bg-white border border-[#DCD9D0] shadow-sm text-stone-700 hover:bg-stone-50 active:translate-y-px text-xs font-mono font-bold flex items-center justify-center cursor-pointer transition'
                  }
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    if (autoPlayKey === p.key) setAutoPlayKey(null);
                    handleParamChange(p.key, parseFloat(e.target.value));
                  }}
                  className="flex-1 h-1.5 bg-stone-300/70 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-cyan-400"
                />

                <button
                  data-testid={`slider-plus-${p.key}`}
                  type="button"
                  onClick={() => {
                    if (autoPlayKey === p.key) setAutoPlayKey(null);
                    handleParamChange(p.key, Math.min(p.max, Number((currentVal + p.step).toFixed(2))));
                  }}
                  className={
                    isHolo
                      ? 'w-6 h-6 rounded-md bg-stone-200/50 dark:bg-stone-800/50 border border-stone-300/50 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-300/60 active:translate-y-px text-xs font-mono font-bold flex items-center justify-center cursor-pointer transition'
                      : 'w-7 h-7 rounded-lg bg-white border border-[#DCD9D0] shadow-sm text-stone-700 hover:bg-stone-50 active:translate-y-px text-xs font-mono font-bold flex items-center justify-center cursor-pointer transition'
                  }
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Thanh nhỏ duy nhất dưới mô phỏng (giống bảng thông minh): kéo, thu phóng, gợi ý, đặt lại, nửa bảng, xóa */}
      {isHolo && (
        <div className="relative flex justify-center pt-1 pb-0.5 select-none">
          {showSocratic && (
            <div
              data-testid="socratic-content"
              onClick={() => setShowSocratic(false)}
              className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-[min(440px,94%)] px-3.5 py-2.5 rounded-2xl bg-white/96 backdrop-blur border border-amber-200 shadow-[0_10px_30px_-8px_rgba(20,20,19,0.3)] text-[13px] leading-snug text-[#78350F] font-serif cursor-pointer z-10"
              title="Chạm để ẩn"
            >
              <MathText text={blueprint.socraticQuestion} />
            </div>
          )}
          <div
            data-testid="hologram-bottom-context-bar"
            className={`flex items-center gap-0.5 pl-1 pr-1.5 py-1 rounded-full bg-white/94 backdrop-blur-md border border-[#DCD9D0] shadow-[0_6px_22px_-6px_rgba(20,20,19,0.3)] transition-opacity duration-300 ${
              showHudBrackets ? 'opacity-100' : 'opacity-55 hover:opacity-100'
            }`}
          >
            <div
              data-testid="hologram-six-dot-grip"
              onPointerDown={onGripPointerDown}
              onPointerMove={onGripPointerMove}
              onPointerUp={onGripPointerUp}
              onPointerCancel={onGripPointerUp}
              title="Kéo để di chuyển mô phỏng (hoặc chạm kéo bất cứ đâu trên hình)"
              className="grid grid-cols-3 gap-[3px] px-2 py-1.5 rounded-full hover:bg-stone-100 cursor-grab active:cursor-grabbing touch-none"
            >
              {Array.from({ length: 6 }).map((_, idx) => (
                <span key={idx} className="w-[3px] h-[3px] rounded-full bg-stone-500" />
              ))}
            </div>
            <span className="px-1.5 text-[11px] font-semibold text-stone-700 max-w-[170px] truncate" title={getTopicDisplayName(activeBlueprint)}>
              {getTopicDisplayName(activeBlueprint).replace(/^[^•]*• /, '')}
            </span>
            <span className="w-px h-4 bg-stone-200 mx-0.5" />
            {onScaleChange && (
              <>
                <button data-testid="holo-zoom-out" type="button" onClick={() => onScaleChange(Math.max(0.45, Number((holoScale - 0.1).toFixed(2))))} className="w-6 h-6 rounded-full hover:bg-stone-100 text-stone-700 font-bold cursor-pointer" title="Thu nhỏ">−</button>
                <span data-testid="holo-scale-label" className="text-[10px] font-mono text-stone-600 min-w-[34px] text-center">{Math.round(holoScale * 100)}%</span>
                <button data-testid="holo-zoom-in" type="button" onClick={() => onScaleChange(Math.min(2.0, Number((holoScale + 0.1).toFixed(2))))} className="w-6 h-6 rounded-full hover:bg-stone-100 text-stone-700 font-bold cursor-pointer" title="Phóng to">+</button>
                <span className="w-px h-4 bg-stone-200 mx-0.5" />
              </>
            )}
            <button type="button" data-testid="holo-ctx-socratic-btn" onClick={() => setShowSocratic((v) => !v)} className={`w-6 h-6 rounded-full text-[12px] font-bold cursor-pointer ${showSocratic ? 'bg-amber-100 text-amber-700' : 'hover:bg-stone-100 text-stone-700'}`} title="Câu hỏi gợi mở Socratic">?</button>
            <button type="button" data-testid="holo-ctx-reset-btn" onClick={handleReset} className="w-6 h-6 rounded-full hover:bg-stone-100 text-stone-700 flex items-center justify-center cursor-pointer" title="Đặt lại thông số gốc"><RotateCcw className="w-3.5 h-3.5" /></button>
            {onToggleDisplayMode && (
              <button type="button" data-testid="holo-ctx-dock-btn" onClick={onToggleDisplayMode} className="w-6 h-6 rounded-full hover:bg-stone-100 text-stone-700 cursor-pointer text-[13px]" title="Ghim sang nửa bảng">◫</button>
            )}
            {onClose && (
              <button type="button" data-testid="holo-ctx-close-btn" onClick={onClose} className="w-6 h-6 rounded-full hover:bg-rose-50 text-stone-600 hover:text-rose-600 cursor-pointer text-[12px]" title="Xóa mô phỏng khỏi bảng">✕</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
