'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Stroke, Point, filterEnclosedStrokes } from '../../utils/lassoGeometry';
import { exportIsolatedWebp } from '../../utils/isolatedExporter';
import { routeLocally, matchStemModel, makeSolidBlueprint, makePlaneGeometryBlueprint, SOLID_TITLES, type SolidKind } from '../../utils/localRouter';
import { detectSolidFromStrokes, detectPlaneShapeFromStrokes, type SketchWireGraph } from '../../utils/sketchSolid';
import { buildSketchWire } from '../../utils/sketchWire';
import { shapeFromBlueprint, solidWire, planeStats, VERTEX_LABELS } from '../../utils/inlineShape';
import { type BoardView, FIT_VIEW, clampView, zoomAt, panBy, bufferQuality } from '../../utils/boardView';
import { BoardViewControls } from './BoardViewControls';
import { looksLikeWords, matchViName } from '../../utils/viKeywords';
import { InlineShape } from './InlineShape';
import { GeometryProblemPanel, type GeoPickConfig, type GeoController } from './GeometryProblemPanel';
import { parseGeometryProblem, type GeoScene } from '../../utils/geometryProblem';
import { layoutGeo } from '../../utils/geoTools';
import { recognizeSketch, type SketchKind } from '../../utils/sketchGestures';
import { SKETCH_ACTIONS, SKETCH_EXTRA } from '../../utils/sketchActions';
import { type Subject, SUBJECT_LABEL } from '../../utils/subjectContext';
import { AUTO_INK_SCENES, AutoInkScene } from '../../utils/autoInkPresets';
import { layoutTypeset, typesetStroke, sourceStrokes, bboxOfStrokes, latexToPlain, type ConvertLine, recognizeLocal, recognizeWithAi, type ConvertResult } from '../../utils/inkConvert';
import { SimulationWidget } from './SimulationWidget';
import { InkConvertPanel } from './InkConvertPanel';
import { SmartboardDock, AiFab } from './SmartboardDock';
import { VoiceAiQaCard } from './VoiceAiQaCard';
import { ClassroomPanel } from './ClassroomPanel';
import { useClassroom } from '../../hooks/useClassroom';
import { slimBlueprint } from '../../utils/classroomState';
import { OcrReviewModal } from './OcrReviewModal';
import { looksMathy, typedToLatex } from '../../utils/typedMath';
import { canonicalFormula } from '../../utils/formulaNormalize';
import { VectorTimeTravelBar } from './VectorTimeTravelBar';
import { useBoardJournal } from '../../hooks/useBoardJournal';
import { findAmbiguousTokens } from '../../utils/ocrConfusions';
import { MathView } from '../common/MathView';
import { FormulaBlock, MathText } from '../ui/MathText';
import { SimulationBlueprint } from '@socratic/types';
import {
  Pen,
  Lasso,
  Trash2,
  Sparkles,
  RefreshCw,
  Circle,
  Square,
  ArrowRight,
  Minus,
  Highlighter,
  Undo2,
  Redo2,
  Download,
  Grid as GridIcon,
  HelpCircle,
  AlertTriangle,
  Eye,
  Send,
  X,
  Mic,
  MicOff,
  QrCode,
  FileText,
  Check,
  Share2,
  Wand2,
  Pencil,
  Loader2,
  Maximize2,
  GraduationCap,
  BookOpen,
} from 'lucide-react';
import { classifyLassoIntent, type LassoIntentResult } from '../../utils/lassoIntent';

const ERASE_R = 14; // bán kính tẩy (đơn vị canvas)

export type CanvasTool = 'PEN' | 'HIGHLIGHTER' | 'SHAPE' | 'LASSO' | 'ERASER' | 'PAN' | 'TEXT';
export type ShapeType = 'CIRCLE' | 'LINE' | 'ARROW' | 'RECTANGLE';
export type GridPattern = 'DOTS' | 'GRID' | 'BLANK';

export interface SmartboardCanvasProps {
  onApiCallSpy?: (endpoint: string, payload?: any) => void;
  apiEndpoint?: string;
  initialBlueprint?: SimulationBlueprint | null;
  initialStrokes?: Stroke[];
  initialSelectedStrokes?: Stroke[];
  initialGeometryLiveMode?: boolean;
}

const PALETTE = [
  { name: 'Mực than', value: '#18181B' },
  { name: 'Xanh Cobalt', value: '#2563EB' },
  { name: 'Đỏ Vermilion', value: '#E11D48' },
  { name: 'Hổ phách', value: '#D97706' },
  { name: 'Xanh Ngọc', value: '#059669' },
  { name: 'Tím Indigo', value: '#6366F1' },
];

const STROKE_WIDTHS = [
  { label: 'Thanh', value: 2.5 },
  { label: 'Vừa', value: 5.0 },
  { label: 'Đậm', value: 9.0 },
];

/**
 * Bộ định tuyến công thức STEM tức thì (Instant STEM Blueprint Matcher: 0ms, 0 API).
 * Nhận dạng ngay các phương trình và mẫu STEM viết tay / gõ chuẩn, kích hoạt mô phỏng lập tức.
 */
/**
 * Nhận dạng chữ viết tay trả LaTeX có ngoặc nhọn, 	ext{}, dấu chấm cuối… (x^{2}+y^{2}+z^{2}=9.).
 * Thử dạng chuẩn hóa trước (để mặt cầu không bị đồ thị nuốt thành hình tròn), rồi mới tới nguyên bản.
 */
export function matchInstantStemBlueprint(effectiveHint: string): SimulationBlueprint | null {
  const raw = (effectiveHint || '').trim();
  if (!raw) return null;
  const norm = canonicalFormula(raw);
  if (norm && norm !== raw) {
    const viaNorm = matchInstantStemBlueprintCore(norm);
    if (viaNorm) return viaNorm;
  }
  return matchInstantStemBlueprintCore(raw);
}

function matchInstantStemBlueprintCore(effectiveHint: string): SimulationBlueprint | null {
  const raw = (effectiveHint || '').trim();
  if (!raw) return null;

  // 1. Kiểm tra bộ định tuyến mô hình nâng cao & khối 3D (Oxyz, Punnett, Hardy-Weinberg, Recurrence, LP, Solids...)
  // "phức chất bát diện" là thuyết trường tinh thể, không phải khối bát diện
  if (/phức/i.test(raw)) {
    const cft = routeLocally('CFT d6');
    if (cft) return cft;
  }
  // x = A cos(ωt + φ), u = U₀ sin(ωt): dao động điều hòa theo thời gian t, không phải đường cong ẩn theo x và y
  const harmonic = /^[^;=]*=\s*[^;]*(?<!\p{L})(?:sin|cos)\s*\(?[^;]*(?:ω|\\omega|\\pi\s*t|π\s*t|(?<!\p{L})t(?!\p{L}))/u.test(raw) && !/(?<!\p{L})y\s*=/u.test(raw);
  if (!harmonic) {
    const direct = routeLocally(raw);
    if (direct) return direct;
  } else {
    const stemOnly = matchStemModel(raw);
    if (stemOnly) return stemOnly;
  }

  // 1a. Bỏ chữ đệm đầu câu ("phân tử NH3", "hiện tượng thẩm thấu", "mô phỏng …") rồi định tuyến lại phần còn lại
  const stripped = raw.replace(/^\s*(?:(?:hãy|vẽ|dựng|trực quan hóa|trực quan|mô phỏng|khảo sát|xem|hiện tượng|bài toán|quá trình|sự|phân tử|hợp chất|cấu trúc)\s+)+/i, '');
  if (stripped && stripped !== raw) {
    const sd = routeLocally(stripped);
    if (sd) return sd;
  }

  // 1b. Tên mô phỏng viết bằng chữ tiếng Việt (kể cả bị đọc sai dấu / sai vài ký tự): "khí khổng", "con lắc kép"…
  if (looksLikeWords(raw)) {
    const vi = matchViName(raw);
    if (vi) {
      const viHit = routeLocally(vi.canon) ?? (vi.canon === raw ? null : matchInstantStemBlueprint(vi.canon));
      if (viHit) return viHit;
    }
  }

  const h = raw.toLowerCase();

  // 2. Giao thoa sóng 3D (Ripple Tank)
  if (
    h.includes('giao thoa') || h.includes('ripple') || h.includes('sóng nước') ||
    h.includes('d_2 - d_1') || h.includes('d2 - d1') || h.includes('d2-d1') ||
    h.includes('lambda') || h.includes('\\lambda') || h.includes('k\\lambda') ||
    h.includes('hai nguồn') || h.includes('2a\\cos') || h.includes('2a \\cos')
  ) {
    return {
      engine: 'PHYSICS',
      templateId: 'PHYS_RIPPLE_TANK',
      recognizedLatex: 'u_M = 2A \\cos\\left(\\frac{\\pi(d_2 - d_1)}{\\lambda}\\right) \\cos(\\omega t)',
      ocrAlternatives: ['u_M = 2A \\cos(\\pi(d_2 - d_1)/\\lambda) \\cos(\\omega t)', 'd_2 - d_1 = k\\lambda'],
      parameters: [
        { key: 'lambda', label: 'Bước sóng (λ)', unit: 'px', defaultValue: 24.0, min: 10.0, max: 60.0, step: 2.0 },
        { key: 'f', label: 'Tần số dao động (f)', unit: 'Hz', defaultValue: 2.5, min: 1.0, max: 5.0, step: 0.5 },
        { key: 'd', label: 'Khoảng cách 2 nguồn (d)', unit: 'px', defaultValue: 130.0, min: 60.0, max: 240.0, step: 10.0 },
        { key: 'deltaPhi', label: 'Độ lệch pha (Δφ)', unit: 'rad', defaultValue: 0.0, min: -3.14, max: 3.14, step: 0.314 },
      ],
      socraticQuestion: 'Khi hai nguồn dao động cùng pha, những điểm có hiệu khoảng cách d₂ - d₁ = kλ sẽ dao động với biên độ cực đại hay cực tiểu?',
      curriculumLevel: 'THPT_STANDARD',
    };
  }

  // 3. Con lắc đơn vi phân RK4 (Pendulum)
  if (
    h.includes('con lắc') || h.includes('con lac') || h.includes('pendulum') ||
    h.includes('l/g') || h.includes('m/k') || h.includes('\\ddot{\\theta}') ||
    h.includes('chu kỳ') || (h.includes('t = 2') && h.includes('pi')) ||
    h.includes('s_0\\cos') || h.includes('rk4')
  ) {
    return {
      engine: 'PHYSICS',
      templateId: 'PHYS_PENDULUM',
      recognizedLatex: 'T = 2\\pi\\sqrt{\\frac{l}{g}}, \\quad \\ddot{\\theta} + \\frac{g}{L}\\sin\\theta = 0',
      ocrAlternatives: ['T = 2\\pi\\sqrt{l/g}', '\\ddot{\\theta} + (g/L)\\sin\\theta = 0'],
      parameters: [
        { key: 'L', label: 'Chiều dài dây (L)', unit: 'm', defaultValue: 2.0, min: 0.5, max: 5.0, step: 0.1 },
        { key: 'theta0', label: 'Góc lệch đầu (θ₀)', unit: 'rad', defaultValue: 0.5, min: 0.1, max: 2.8, step: 0.1 },
        { key: 'g', label: 'Trọng trường (g)', unit: 'm/s²', defaultValue: 9.8, min: 1.6, max: 25.0, step: 0.1 },
        { key: 'b', label: 'Lực cản môi trường (b)', unit: '', defaultValue: 0.02, min: 0.0, max: 0.2, step: 0.01 },
      ],
      socraticQuestion: 'Khi tăng góc lệch ban đầu θ₀ lên góc lớn (> 30°), chu kỳ dao động thực tế có còn tuân theo công thức gần đúng T = 2π√(l/g) không?',
      curriculumLevel: 'OLYMPIAD_ADVANCED',
    };
  }

  // 4. Cơ học Mặt phẳng nghiêng & Ma sát trượt (Inclined Plane)
  if (
    h.includes('nghiêng') || h.includes('nghieng') || h.includes('incline') ||
    h.includes('ma sát') || h.includes('ma sat') || h.includes('\\mu') || /(?<!\p{L})mu(?!\p{L})/u.test(h) ||
    h.includes('f_{ms}') || h.includes('fms') || h.includes('mg\\sin') || h.includes('mg\\cos')
  ) {
    return {
      engine: 'PHYSICS',
      templateId: 'PHYS_INCLINED',
      recognizedLatex: 'a = g(\\sin\\alpha - \\mu\\cos\\alpha)',
      ocrAlternatives: ['a = g(\\sin\\alpha - \\mu\\cos\\alpha)', 'N = mg\\cos\\alpha', 'F_{ms} = \\mu N'],
      parameters: [
        { key: 'alpha', label: 'Góc nghiêng (α)', unit: 'độ', defaultValue: 30.0, min: 5.0, max: 75.0, step: 5.0 },
        { key: 'mu', label: 'Hệ số ma sát (μ)', unit: '', defaultValue: 0.15, min: 0.0, max: 0.8, step: 0.05 },
        { key: 'm', label: 'Khối lượng vật (m)', unit: 'kg', defaultValue: 2.0, min: 0.5, max: 10.0, step: 0.5 },
        { key: 'g', label: 'Gia tốc g', unit: 'm/s²', defaultValue: 9.8, min: 1.6, max: 25.0, step: 0.1 },
      ],
      socraticQuestion: 'Điều kiện nào giữa góc nghiêng α và hệ số ma sát μ để vật bắt đầu trượt xuống (tan α > μ)?',
      curriculumLevel: 'THPT_STANDARD',
    };
  }

  // 5. Chuyển động ném xiên trong trọng trường (Projectile)
  if (h.includes('ném') || /(?<!\p{L})nem(?!\p{L})/u.test(h) || h.includes('v0') || h.includes('v_0') || h.includes('projectile') || h.includes('parabol')) {
    return {
      engine: 'PHYSICS',
      templateId: 'PHYS_PROJECTILE',
      recognizedLatex: 'v_0 = 22\\text{ m/s}, \\quad \\alpha = 45^\\circ',
      ocrAlternatives: ['v_0 = 22\\text{ m/s}, \\alpha = 45^\\circ', 'y = -\\frac{g}{2v_0^2\\cos^2\\alpha}x^2 + x\\tan\\alpha'],
      parameters: [
        { key: 'v0', label: 'Vận tốc đầu (v₀)', unit: 'm/s', defaultValue: 22.0, min: 5.0, max: 50.0, step: 1.0 },
        { key: 'alpha', label: 'Góc ném (α)', unit: 'độ', defaultValue: 45.0, min: 15.0, max: 85.0, step: 5.0 },
        { key: 'g', label: 'Gia tốc g', unit: 'm/s²', defaultValue: 9.8, min: 1.6, max: 25.0, step: 0.1 },
      ],
      socraticQuestion: 'Tại sao với cùng vận tốc đầu v₀, góc ném 45° lại cho tầm xa cực đại trên mặt phẳng nằm ngang?',
    };
  }

  // 6. Mạch điện xoay chiều RLC & Giản đồ Fresnel
  if (
    h.includes('rlc') || h.includes('fresnel') || h.includes('điện xoay chiều') ||
    h.includes('cộng hưởng') || h.includes('z_l') || h.includes('z_c') ||
    h.includes('z =') || h.includes('omega') || h.includes('phasor')
  ) {
    return {
      engine: 'PHYSICS',
      templateId: 'PHYS_RLC_PHASOR',
      recognizedLatex: 'Z = \\sqrt{R^2 + (Z_L - Z_C)^2}, \\quad u = U_0\\cos(\\omega t + \\varphi)',
      ocrAlternatives: ['Z = \\sqrt{R^2 + (Z_L - Z_C)^2}', 'u = U_0\\cos(\\omega t)', 'i = I_0\\cos(\\omega t - \\varphi)'],
      parameters: [
        { key: 'R', label: 'Điện trở (R)', unit: 'Ω', defaultValue: 50.0, min: 10.0, max: 200.0, step: 10.0 },
        { key: 'L', label: 'Độ tự cảm (L)', unit: 'H', defaultValue: 0.5, min: 0.1, max: 2.0, step: 0.1 },
        { key: 'C', label: 'Điện dung (C)', unit: 'μF', defaultValue: 50.0, min: 10.0, max: 200.0, step: 10.0 },
        { key: 'omega', label: 'Tần số góc (ω)', unit: 'rad/s', defaultValue: 200.0, min: 50.0, max: 500.0, step: 10.0 },
        { key: 'U', label: 'Điện áp (U)', unit: 'V', defaultValue: 120.0, min: 20.0, max: 240.0, step: 10.0 },
      ],
      socraticQuestion: 'Khi điều chỉnh tần số góc ω tiến dần về giá trị cộng hưởng ω₀ = 1/√(LC), góc lệch pha φ và công suất P biến đổi thế nào?',
      curriculumLevel: 'OLYMPIAD_ADVANCED',
    };
  }

  // 7. Cân bằng phản ứng Oxi hóa - Khử
  if (/(?<!\p{L})fe(?!\p{L})/u.test(h) || h.includes('cân') || /(?<!\p{L})o_?\{?2/u.test(h) || h.includes('hno3') || h.includes('redox') || h.includes('oxi')) {
    return {
      engine: 'CHEMISTRY',
      templateId: 'CHEM_BALANCE_SCALE',
      recognizedLatex: '4\\text{Fe} + 3\\text{O}_2 \\rightarrow 2\\text{Fe}_2\\text{O}_3',
      ocrAlternatives: ['4\\text{Fe} + 3\\text{O}_2 \\rightarrow 2\\text{Fe}_2\\text{O}_3', '3\\text{Fe}_3\\text{O}_4 + 28\\text{HNO}_3 \\rightarrow 9\\text{Fe(NO}_3)_3 + \\text{NO} + 14\\text{H}_2\\text{O}'],
      parameters: [
        { key: 'c1', label: 'Hệ số Fe', unit: '', defaultValue: 4.0, min: 1.0, max: 6.0, step: 1.0 },
        { key: 'c2', label: 'Hệ số O₂', unit: '', defaultValue: 3.0, min: 1.0, max: 6.0, step: 1.0 },
        { key: 'c3', label: 'Hệ số Fe₂O₃', unit: '', defaultValue: 2.0, min: 1.0, max: 4.0, step: 1.0 },
      ],
      socraticQuestion: 'Em cần chọn bội chung nhỏ nhất là mấy để số nguyên tử và điện tích electron hai vế thăng bằng?',
    };
  }

  // 8. Chuẩn độ axit - bazơ & Đường cong pH
  if (h.includes('chuẩn độ') || h.includes('titration') || /(?<!\p{L})ph(?!\p{L})/u.test(h) || h.includes('naoh') || h.includes('hcl')) {
    return {
      engine: 'CHEMISTRY',
      templateId: 'CHEM_EQUILIBRIUM_TITRATION',
      recognizedLatex: '\\text{HCl} + \\text{NaOH} \\rightarrow \\text{NaCl} + \\text{H}_2\\text{O}, \\quad \\text{Chuẩn độ pH}',
      ocrAlternatives: ['HCl + NaOH -> NaCl + H2O'],
      parameters: [
        { key: 'Vb', label: 'Thể tích NaOH (V_b)', unit: 'mL', defaultValue: 20.0, min: 0.0, max: 50.0, step: 1.0 },
      ],
      socraticQuestion: 'Tại sao tại điểm tương đương (V_NaOH = 25mL), đường cong pH lại có một bước nhảy vọt dốc đứng?',
      curriculumLevel: 'OLYMPIAD_ADVANCED',
    };
  }

  // 9. Cơ chế phân tử nhân đôi ADN
  if (h.includes('dna') || h.includes('adn') || h.includes('helicase') || h.includes('xoắn')) {
    return {
      engine: 'BIOLOGY',
      templateId: 'BIO_DNA_HELIX',
      recognizedLatex: '\\text{DNA Replication: } 5\' \\to 3\', \\quad A=T, \\, G\\equiv C',
      ocrAlternatives: ['A=T, G=C', '5\' -> 3\' Helicase'],
      parameters: [
        { key: 'unzipProgress', label: 'Tháo xoắn Helicase', unit: '%', defaultValue: 25.0, min: 0.0, max: 100.0, step: 5.0 },
        { key: 'turnCount', label: 'Số chu kỳ xoắn', unit: 'vòng', defaultValue: 3.0, min: 1.0, max: 6.0, step: 1.0 },
      ],
      socraticQuestion: 'Tại sao liên kết hydro giữa A-T lại dễ bị bẻ gãy hơn G-C trong quá trình tháo xoắn của enzyme Helicase?',
    };
  }

  // 10. Quang hợp và trao đổi chất thực vật
  if (/quang hợp|quang hop|photosynth|(?<!\p{L})photo(?!\p{L})|(?<!\p{L})(?:lá|cây)(?!\p{L})/u.test(h)) {
    return {
      engine: 'BIOLOGY',
      templateId: 'BIO_PHOTOSYNTHESIS',
      recognizedLatex: '\\text{Quang hợp: } Rate = f(T = 25.0^\\circ\\text{C}, I = 70.0\\%)',
      ocrAlternatives: ['Rate = f(T = 25^\\circ\\text{C}, I = 70\\%)'],
      parameters: [
        { key: 'temperature', label: 'Nhiệt độ (T)', unit: '°C', defaultValue: 25.0, min: 0.0, max: 60.0, step: 5.0 },
        { key: 'light', label: 'Cường độ sáng (I)', unit: '%', defaultValue: 70.0, min: 10.0, max: 100.0, step: 5.0 },
      ],
      socraticQuestion: 'Tại sao khi nhiệt độ vượt quá 45°C, cường độ quang hợp lại giảm dốc đứng do biến tính enzyme?',
    };
  }

  // 11. Hàm số lượng giác & Sóng điều hòa
  if (/(?<!\p{L})(?:sin|cos)(?!\p{L})/u.test(h) || h.includes('wave') || h.includes('dao động') || h.includes('harmonic')) {
    return {
      engine: 'MATH',
      templateId: 'MATH_TRIG_WAVE',
      recognizedLatex: raw || 'y = 2\\sin(3x)',
      ocrAlternatives: ['y = 2\\sin(3x)', 'x = 5\\cos(2\\pi t + \\frac{\\pi}{2})', 'y = 2\\cos(3x)'],
      parameters: [
        { key: 'A', label: 'Biên độ (A)', unit: 'cm', defaultValue: 2.0, min: 0.5, max: 5.0, step: 0.5 },
        { key: 'omega', label: 'Tần số góc (ω)', unit: 'rad/s', defaultValue: 3.0, min: 1.0, max: 10.0, step: 1.0 },
        { key: 'phi', label: 'Pha ban đầu (φ)', unit: 'rad', defaultValue: 0.0, min: -3.14, max: 3.14, step: 0.1 },
        { key: 'D', label: 'Độ lệch trục (D)', unit: '', defaultValue: 0.0, min: -3.0, max: 3.0, step: 0.5 },
      ],
      socraticQuestion: 'Nếu giữ nguyên biên độ A = 2 nhưng tăng tần số góc ω lên gấp đôi, đồ thị sẽ thay đổi như thế nào?',
    };
  }

  // 12. Giải tích & Khảo sát hàm số (Math Func 2D)
  if (/(?<!\p{L})int(?!\p{L})/u.test(h) || h.includes('\\int') || h.includes('tích phân') || h.includes('nguyên hàm')) {
    return {
      engine: 'MATH',
      templateId: 'MATH_FUNC_2D',
      recognizedLatex: raw || 'y = \\int x^3 dx',
      ocrAlternatives: ['y = \\int x^3 dx', 'y = \\int x^2 dx', 'y = x^2 - 4'],
      parameters: [
        { key: 'a', label: 'Hệ số a (x³)', unit: '', defaultValue: 1, min: -5, max: 5, step: 0.5 },
        { key: 'b', label: 'Hệ số b (x²)', unit: '', defaultValue: 0, min: -5, max: 5, step: 0.5 },
        { key: 'c', label: 'Hệ số c (x)', unit: '', defaultValue: 0, min: -10, max: 10, step: 0.5 },
        { key: 'd', label: 'Hằng số tích phân C', unit: '', defaultValue: 0, min: -10, max: 10, step: 0.5 },
      ],
      socraticQuestion: 'Nguyên hàm của x³ là x⁴/4 + C. Diện tích dưới đường cong thay đổi như thế nào khi x tăng?',
    };
  }

  // 13. Đồ thị hàm số phẳng (nếu là hàm số y = ... hoặc phương trình ẩn)
  const graphMatch = routeLocally(raw, { explicitGraph: true });
  if (graphMatch) return graphMatch;

  return null;
}

export const SmartboardCanvas: React.FC<SmartboardCanvasProps> = ({
  onApiCallSpy,
  apiEndpoint = '/api/v1/canvas/compile-lasso',
  initialBlueprint = null,
  initialStrokes = [],
  initialSelectedStrokes = [],
  initialGeometryLiveMode = false,
}) => {
  const [tool, setTool] = useState<CanvasTool>('PEN');
  const [selectedShape, setSelectedShape] = useState<ShapeType>('CIRCLE');
  const [strokeColor, setStrokeColor] = useState<string>('#18181B');
  const [strokeWidth, setStrokeWidth] = useState<number>(3.5);
  const [gridPattern, setGridPattern] = useState<GridPattern>('DOTS');

  const [strokes, setStrokes] = useState<Stroke[]>(initialStrokes);
  const [undoStack, setUndoStack] = useState<Stroke[][]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[][]>([]);

  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [eraserHover, setEraserHover] = useState<Point | null>(null);
  const [shapeStart, setShapeStart] = useState<Point | null>(null);
  const [shapeCurrent, setShapeCurrent] = useState<Point | null>(null);

  const [lassoLoop, setLassoLoop] = useState<Point[]>([]);
  const [selectedStrokes, setSelectedStrokes] = useState<Stroke[]>(initialSelectedStrokes);
  const [instantResult, setInstantResult] = useState<ConvertResult | null>(null);
  const [aiVisionResult, setAiVisionResult] = useState<ConvertResult | null>(null);
  const [isAiVisionScanning, setIsAiVisionScanning] = useState<boolean>(false);
  // Phân tầng nhận dạng: Vision trước, bản cục bộ chỉ khi Vision hỏng/không có khóa
  const visionPromiseRef = useRef<Promise<ConvertResult | null> | null>(null);
  const visionPendingRef = useRef(false);
  const formulaTouchedRef = useRef(false);
  // Chuyển chữ viết tay → công thức chuẩn: nguồn nét (hoặc công thức đang sửa)
  const [convertCtx, setConvertCtx] = useState<{
    source: Stroke[];
    editing?: { id: string; latex: string; text: string } | null;
    initialTab?: 'VISUAL' | 'GRADE';
  } | null>(null);

  // Vị trí và trạng thái của Nút công cụ AI đa năng (Draggable Radial AI Hub)
  const [aiHubPos, setAiHubPos] = useState<{ x: number; y: number } | null>(null);
  const [isRadialOpen, setIsRadialOpen] = useState<boolean>(false);
  const isDraggingAiHubRef = useRef<boolean>(false);
  const aiHubDragOriginRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);

  const [boardScale, setBoardScale] = useState(1);
  // lớp học BYOD
  const room = useClassroom();
  const [isClassroomOpen, setIsClassroomOpen] = useState(false);
  // hình dựng từ đề bài: hộp thoại nhập đề / bảng dụng cụ vẽ thêm
  const [geoPanel, setGeoPanel] = useState<{ mode: 'new'; text?: string } | { mode: 'edit'; id: string } | null>(null);
  const [geoPickCfg, setGeoPickCfg] = useState<GeoPickConfig | null>(null);
  // AI hub phân tầng: bộ điều khiển hình đang chọn + yêu cầu mở hub tại tầng 'Vẽ hình'
  const [geoCtl, setGeoCtl] = useState<GeoController | null>(null);
  const [hubOpenAt, setHubOpenAt] = useState<{ path: string[]; nonce: number } | null>(null);
  // khóa môn học (bộ chọn phân môn nhanh): ép ngữ cảnh nhận diện cho bộ biên dịch AI
  const [subjectLock, setSubjectLock] = useState<Subject | null>(null);
  // phương án thay thế khi hình phác thảo mơ hồ (Tap & Swap)
  const [sketchAlts, setSketchAlts] = useState<{ label: string; run: () => void }[] | null>(null);
  const boardWrapRef = useRef<HTMLDivElement | null>(null);
  const [activeBlueprint, setActiveBlueprint] = useState<SimulationBlueprint | null>(initialBlueprint);
  // Bảng luôn được gắn sẵn (chỉ ẩn khi sang Mode 02/03), nên khi Mode 03 đẩy bài mới lên thì phải nạp lại mẫu.
  useEffect(() => {
    if (initialBlueprint) setActiveBlueprint(initialBlueprint);
  }, [initialBlueprint]);
  const [isLoading, setIsLoading] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [formulaInput, setFormulaInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tự động phân loại intent: Trực quan hóa công thức hay Chấm bài học sinh
  const detectedLassoIntent: LassoIntentResult | null = useMemo(() => {
    if (selectedStrokes.length === 0) return null;
    const activeFormula = formulaInput || aiVisionResult?.lines.map((l) => l.latex).join(' ') || instantResult?.lines.map((l) => l.latex).join(' ') || '';
    return classifyLassoIntent(selectedStrokes, activeFormula, subjectLock || undefined);
  }, [selectedStrokes, formulaInput, aiVisionResult, instantResult, subjectLock]);

  // Ergonomic Split-View Dock & Voice & QR Recap States (v3.0)
  const [isSplitView, setIsSplitView] = useState<boolean>(true);
  const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [isVoiceQaOpen, setIsVoiceQaOpen] = useState<boolean>(false);
  const [voiceQaQuery, setVoiceQaQuery] = useState<string>('Trong hình lập phương, thiết diện nào có diện tích lớn nhất?');
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [qrCopied, setQrCopied] = useState<boolean>(false);

  // Hologram On-Board Overlay vs Split-View Dock States
  const [displayMode, setDisplayMode] = useState<'HOLOGRAM' | 'DOCK'>('HOLOGRAM');
  const [holoPosition, setHoloPosition] = useState<{ x: number; y: number }>({ x: 580, y: 35 });
  const journal = useBoardJournal(
    strokes,
    currentStroke.length > 0,
    activeBlueprint ? { key: activeBlueprint, template: activeBlueprint.templateId, x: holoPosition.x, y: holoPosition.y } : null,
  );
  const [holoScale, setHoloScale] = useState<number>(1.0);

  // ---- Thu phóng / di chuyển bảng, nhiều trang, chữ, toàn màn hình (như các bảng trắng trực tuyến) ----
  const [view, setViewState] = useState<BoardView>(FIT_VIEW);
  const viewRef = useRef<BoardView>(FIT_VIEW);
  const applyView = (v: BoardView) => {
    const el = boardWrapRef.current;
    const next = clampView(v, el?.clientWidth || 1200, el?.clientHeight || 675);
    viewRef.current = next;
    setViewState(next);
  };
  const panRef = useRef<{ id: number; sx: number; sy: number; tx: number; ty: number } | null>(null);
  const spaceDownRef = useRef(false);
  const gestureRef = useRef<{ touches: Map<number, { x: number; y: number }>; active: boolean; d0: number; k0: number; mid0: { x: number; y: number }; v0: BoardView }>({
    touches: new Map(),
    active: false,
    d0: 1,
    k0: 1,
    mid0: { x: 0, y: 0 },
    v0: FIT_VIEW,
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pages, setPages] = useState<Stroke[][]>([[]]);
  const [pageIdx, setPageIdx] = useState(0);
  const [textDraft, setTextDraft] = useState<{ x: number; y: number; value: string } | null>(null);

  // Chế độ trực quan hình học tự động: khi vẽ xong đa giác/khối 3D, tự biến nét vẽ thành mô hình tương tác tại chỗ
  const [isGeometryLiveMode, setIsGeometryLiveMode] = useState<boolean>(initialGeometryLiveMode);
  const autoGeoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);
  useEffect(() => {
    return () => {
      if (autoGeoTimerRef.current) clearTimeout(autoGeoTimerRef.current);
    };
  }, []);
  const isDraggingHoloRef = useRef(false);
  const holoDragStartRef = useRef<{ startX: number; startY: number; origX: number; origY: number }>({
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });
  const activeHoloPointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartDistRef = useRef<number>(0);
  const pinchStartScaleRef = useRef<number>(1.0);
  const isPinchingHoloRef = useRef<boolean>(false);
  const isResizingHoloRef = useRef<boolean>(false);
  const holoResizeStartRef = useRef<{ startX: number; startY: number; origScale: number }>({
    startX: 0,
    startY: 0,
    origScale: 1.0,
  });

  const handleHoloPointerDownAnywhere = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('input, button, select, textarea, [data-interactive="true"]')) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    activeHoloPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activeHoloPointersRef.current.size === 2) {
      // 2 ngón tay chạm cùng lúc: kích hoạt cử chỉ chụm hai ngón phóng to/thu nhỏ (pinch-to-zoom)
      const pts = Array.from(activeHoloPointersRef.current.values());
      pinchStartDistRef.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStartScaleRef.current = holoScale;
      isPinchingHoloRef.current = true;
      isDraggingHoloRef.current = false;
    } else if (activeHoloPointersRef.current.size === 1) {
      // 1 ngón tay / bút: di chuyển vị trí mô phỏng trên bảng
      isDraggingHoloRef.current = true;
      isPinchingHoloRef.current = false;
      holoDragStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: holoPosition.x,
        origY: holoPosition.y,
      };
    }
  };

  const handleHoloGripDown = (e: React.PointerEvent) => {
    handleHoloPointerDownAnywhere(e);
  };

  const handleHoloGripMove = (e: React.PointerEvent) => {
    if (activeHoloPointersRef.current.has(e.pointerId)) {
      activeHoloPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (isPinchingHoloRef.current && activeHoloPointersRef.current.size >= 2) {
      const pts = Array.from(activeHoloPointersRef.current.values());
      const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinchStartDistRef.current > 10) {
        const factor = currentDist / pinchStartDistRef.current;
        const targetScale = Math.max(0.5, Math.min(2.5, Number((pinchStartScaleRef.current * factor).toFixed(2))));
        setHoloScale(targetScale);
      }
      return;
    }

    if (isResizingHoloRef.current) {
      const dx = (e.clientX - holoResizeStartRef.current.startX) / (boardScale || 1);
      const dy = (e.clientY - holoResizeStartRef.current.startY) / (boardScale || 1);
      const deltaScale = (dx + dy) / 380;
      const targetScale = Math.max(0.5, Math.min(2.5, Number((holoResizeStartRef.current.origScale + deltaScale).toFixed(2))));
      setHoloScale(targetScale);
      return;
    }

    if (isDraggingHoloRef.current) {
      const dx = (e.clientX - holoDragStartRef.current.startX) / (boardScale || 1);
      const dy = (e.clientY - holoDragStartRef.current.startY) / (boardScale || 1);
      setHoloPosition({
        x: Math.max(0, Math.min(1000, Math.round(holoDragStartRef.current.origX + dx))),
        y: Math.max(0, Math.min(550, Math.round(holoDragStartRef.current.origY + dy))),
      });
    }
  };

  const handleHoloGripUp = (e: React.PointerEvent) => {
    activeHoloPointersRef.current.delete(e.pointerId);
    if (activeHoloPointersRef.current.size < 2) {
      isPinchingHoloRef.current = false;
    }
    if (activeHoloPointersRef.current.size === 0) {
      isDraggingHoloRef.current = false;
      isResizingHoloRef.current = false;
    }
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleHoloResizeHandleDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    isResizingHoloRef.current = true;
    isDraggingHoloRef.current = false;
    isPinchingHoloRef.current = false;
    holoResizeStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origScale: holoScale,
    };
  };

  const handleHoloWheelZoom = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = -e.deltaY * 0.0018;
    setHoloScale((prev) => Math.max(0.5, Math.min(2.5, Number((prev + delta).toFixed(2)))));
  };

  // OCR Verification Modal States
  const [isOcrReviewOpen, setIsOcrReviewOpen] = useState(false);
  const [pendingBlueprint, setPendingBlueprint] = useState<SimulationBlueprint | null>(null);
  const [reviewFormula, setReviewFormula] = useState<string>('');
  const [reviewConfidence, setReviewConfidence] = useState<number>(0.98);
  const [reviewThumbnailUrl, setReviewThumbnailUrl] = useState<string | null>(null);
  const [reviewAlternatives, setReviewAlternatives] = useState<string[]>([]);
  // Temporal Scene Chunking (Pre-Clear Commit) để bảo toàn bài học cả tiết qua các lần xóa bảng
  const [recordedScenes, setRecordedScenes] = useState<Array<{
    id: string;
    timestamp: number;
    strokeCount: number;
    recognizedLatex?: string;
    templateId?: string;
    previewSummary: string;
  }>>([]);

  // Auto-Ink Calligraphy & 450ms Shimmer States (Apple-Keynote Showcase)
  const [activeAutoScene, setActiveAutoScene] = useState<string | null>(null);
  const [isAutoInking, setIsAutoInking] = useState<boolean>(false);
  const [isCompilingShimmer, setIsCompilingShimmer] = useState<boolean>(false);
  const [compilingScene, setCompilingScene] = useState<AutoInkScene | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Studio Handwriting Recorder & Tracing Guide States
  const [isStudioRecorderOpen, setIsStudioRecorderOpen] = useState<boolean>(false);
  const [showWatermarkGuide, setShowWatermarkGuide] = useState<boolean>(false);
  const [selectedRecordSlot, setSelectedRecordSlot] = useState<string>('SCENE_1_PHYSICS');
  const [recorderNotice, setRecorderNotice] = useState<string | null>(null);
  const [hasCustomSlots, setHasCustomSlots] = useState<Record<string, boolean>>({});

  // Hydrate custom handwriting slots from both localStorage and server disk API
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const initialSlots: Record<string, boolean> = {};
    const localPendingUpload: Record<string, any> = {};

    AUTO_INK_SCENES.forEach((s) => {
      const localVal = localStorage.getItem(`socratic_user_ink_${s.id}`);
      if (localVal) {
        initialSlots[s.id] = true;
        try {
          localPendingUpload[s.id] = JSON.parse(localVal);
        } catch {}
      }
    });
    setHasCustomSlots(initialSlots);

    // Fetch disk-saved ink from API to guarantee cross-reload persistence
    if (process.env.NODE_ENV === 'test') return;

    fetch('/api/v1/canvas/user-ink')
      .then((res) => (res.ok ? res.json() : {}))
      .then((diskData: Record<string, any>) => {
        if (!diskData || typeof diskData !== 'object') return;
        const updatedSlots = { ...initialSlots };

        Object.keys(diskData).forEach((slotId) => {
          if (diskData[slotId] && Array.isArray(diskData[slotId])) {
            updatedSlots[slotId] = true;
            try {
              localStorage.setItem(`socratic_user_ink_${slotId}`, JSON.stringify(diskData[slotId]));
            } catch {}
          }
        });

        // If local storage had takes not yet on server disk, upload them now
        const slotsToSyncToDisk: Record<string, any> = {};
        Object.keys(localPendingUpload).forEach((slotId) => {
          if (!diskData[slotId]) {
            slotsToSyncToDisk[slotId] = localPendingUpload[slotId];
          }
        });

        if (Object.keys(slotsToSyncToDisk).length > 0) {
          fetch('/api/v1/canvas/user-ink', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ allSlots: slotsToSyncToDisk }),
          }).catch((err) => console.warn('Sync to disk error:', err));
        }

        setHasCustomSlots(updatedSlots);
      })
      .catch((err) => console.warn('Failed to load user saved ink from disk:', err));
  }, []);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  // Debug Preview Thumbnail & Instant Recognition Engine (Off-screen render & < 30ms OCR)
  useEffect(() => {
    let alive = true;
    const src = sourceStrokes(selectedStrokes);
    if (src.length > 0) {
      exportIsolatedWebp(src)
        .then((res) => {
          if (alive) setThumbnailUrl(res.dataUrl);
        })
        .catch((err) => {
          console.warn('Thumbnail generation failed:', err);
          if (alive) setThumbnailUrl(null);
        });

      let fallbackFormula = '';
      formulaTouchedRef.current = false;
      try {
        // Ưu tiên kiểm tra hình khối 3D hoặc đa giác phẳng 2D trước khi nhận dạng chữ viết tay,
        // tránh việc bộ nhận dạng ký tự biến hình lập phương hoặc tam giác thành các ký tự rời rạc.
        // Nhiều nét chữ tiếng Việt (tên mô phỏng) hay bị nhầm thành khối hình: nếu chữ đọc ra gần tên một mô phỏng thì ưu tiên chữ.
        const localTry = recognizeLocal(src);
        const localLatex = localTry?.lines.map((l) => l.latex).join(' ') ?? '';
        const textHit = looksLikeWords(localLatex) && !!matchViName(localLatex);
        const solidSk = !textHit && src.length >= 4 ? detectSolidFromStrokes(src) : null;
        const planeSk = !textHit && !solidSk && src.length >= 1 && src.length <= 4 ? detectPlaneShapeFromStrokes(src) : null;
        if (solidSk && solidSk.confidence >= 0.72) {
          if (alive) {
            setInstantResult(null);
            setFormulaInput((prev) => (!prev.trim() ? SOLID_TITLES[solidSk.kind] : prev));
          }
        } else if (planeSk && planeSk.confidence >= 0.78) {
          if (alive) {
            setInstantResult(null);
            setFormulaInput((prev) => (!prev.trim() ? planeSk.title : prev));
          }
        } else {
          const res = localTry;
          if (res && res.lines.length > 0 && res.lines.some((l) => l.latex.trim().length > 0)) {
            if (alive) {
              setInstantResult(res);
              const fullLatex = res.lines.map((l) => l.latex).join(' \\\\ ');
              // Bản cục bộ chỉ là DỰ PHÒNG: không điền vào ô công thức ngay, chờ Vision; nếu Vision hỏng mới dùng.
              // Chữ tiếng Việt không phải công thức thì không đưa chuỗi ký tự đọc bừa vào ô.
              const wordy = looksLikeWords(fullLatex);
              const viName = wordy ? matchViName(fullLatex) : null;
              fallbackFormula = wordy ? (viName ? viName.canon : '') : fullLatex;
            }
          } else {
            if (alive) setInstantResult(null);
          }
        }
      } catch (err) {
        if (alive) setInstantResult(null);
      }

      // Khởi tạo vị trí Nút AI nổi phía trên cụm nét vẽ
      const bb = bboxOfStrokes(src);
      setAiHubPos((prev) => {
        if (prev) return prev;
        return {
          x: Math.max(60, Math.min(1140, (bb.x0 + bb.x1) / 2)),
          y: Math.max(60, bb.y0 - 54),
        };
      });

      // Tự động kích hoạt Gemini Vision ở chế độ chạy nền ngay khi giáo viên khoanh Lasso
      setIsAiVisionScanning(true);
      visionPendingRef.current = true;
      const visionP = recognizeWithAi(src);
      visionPromiseRef.current = visionP;
      visionP
        .then((aiRes) => {
          visionPendingRef.current = false;
          if (!alive) return;
          setIsAiVisionScanning(false);
          const isGeo =
            (src.length >= 4 && (detectSolidFromStrokes(src)?.confidence ?? 0) >= 0.72) ||
            (src.length >= 1 && src.length <= 4 && (detectPlaneShapeFromStrokes(src)?.confidence ?? 0) >= 0.78);
          if (!aiRes || aiRes.lines.length === 0) {
            // Vision không dùng được (không khóa, hết hạn mức, lỗi mạng): dùng bản đọc cục bộ
            if (!isGeo && fallbackFormula && !formulaTouchedRef.current) setFormulaInput((prev) => (prev.trim() ? prev : fallbackFormula));
          }
          if (aiRes && aiRes.lines.length > 0) {
            setAiVisionResult(aiRes);
            const aiLatex = aiRes.lines.map((l) => l.latex).join(' \\\\ ');
            const isGeoSketch =
              (src.length >= 4 && (detectSolidFromStrokes(src)?.confidence ?? 0) >= 0.72) ||
              (src.length >= 1 && src.length <= 4 && (detectPlaneShapeFromStrokes(src)?.confidence ?? 0) >= 0.78);
            if (aiLatex.trim() && !isGeoSketch && !formulaTouchedRef.current) {
              // Vision đọc chữ có thể sai dấu ("con lốc kép"): nếu gần tên một mô phỏng thì dùng tên chuẩn
              const aiPlain = aiRes.lines.map((l) => l.text).join(' ');
              const aiViName = looksLikeWords(aiPlain) ? matchViName(aiPlain) : null;
              setFormulaInput(aiViName ? aiViName.canon : aiLatex);
            }
          }
        })
        .catch(() => {
          visionPendingRef.current = false;
          if (!alive) return;
          setIsAiVisionScanning(false);
          if (fallbackFormula && !formulaTouchedRef.current) setFormulaInput((prev) => (prev.trim() ? prev : fallbackFormula));
        });
    } else {
      setThumbnailUrl(null);
      setInstantResult(null);
      setAiVisionResult(null);
      setIsAiVisionScanning(false);
      setAiHubPos(null);
      setIsRadialOpen(false);
    }
    return () => {
      alive = false;
    };
  }, [selectedStrokes]);

  // ---- Vẽ nét: làm mượt bằng đường cong bậc 2 qua trung điểm; có áp lực bút thì đổi độ dày theo từng đoạn ----
  const paintStroke = (ctx: CanvasRenderingContext2D, pts: Point[], color: string, width: number) => {
    if (pts.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const pressured = pts.some((p) => p.p !== undefined && p.p > 0 && p.p !== 0.5);
    if (pressured) {
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const pr = ((a.p ?? 0.5) + (b.p ?? 0.5)) / 2;
        ctx.lineWidth = Math.max(0.8, width * (0.45 + 1.1 * pr));
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      return;
    }
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    if (pts.length === 2) {
      ctx.lineTo(pts[1].x, pts[1].y);
    } else {
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2;
        const my = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
      }
      const last = pts[pts.length - 1];
      ctx.lineTo(last.x, last.y);
    }
    ctx.stroke();
  };

  // Lớp nền đã vẽ sẵn (giấy + lưới + nét đã chốt): chỉ vẽ lại khi các thứ này đổi, còn nét đang viết chỉ chồng lên trên
  const bufQ = bufferQuality(view.k);
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const baseKeyRef = useRef<unknown[] | null>(null);

  const renderBase = useCallback(
    (w: number, h: number, q = 1) => {
      let base = baseCanvasRef.current;
      if (!base) {
        base = document.createElement('canvas');
        baseCanvasRef.current = base;
      }
      if (base.width !== Math.round(w * q) || base.height !== Math.round(h * q)) {
        base.width = Math.round(w * q);
        base.height = Math.round(h * q);
      }
      const ctx = base.getContext('2d');
      if (!ctx) return null;
      ctx.setTransform(q, 0, 0, q, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Warm Alabaster Paper Surface Fill
      ctx.fillStyle = '#F8F7F4';
      ctx.fillRect(0, 0, w, h);

      // 1. Grid pattern
      if (gridPattern === 'DOTS') {
        ctx.fillStyle = '#E5E3DC';
        ctx.beginPath();
        for (let x = 20; x < w; x += 28) {
          for (let y = 20; y < h; y += 28) {
            ctx.moveTo(x + 1.2, y);
            ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          }
        }
        ctx.fill();
      } else if (gridPattern === 'GRID') {
        ctx.strokeStyle = '#EFECE6';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x < w; x += 32) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
        }
        for (let y = 0; y < h; y += 32) {
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
        }
        ctx.stroke();
      }

      // 1b. Tracing watermark guide (phòng thu nét)
      if (showWatermarkGuide) {
        ctx.save();
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.38)';
        ctx.fillStyle = 'rgba(100, 116, 139, 0.65)';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 4]);
        const targetPreset = AUTO_INK_SCENES.find((s) => s.id === selectedRecordSlot);
        if (targetPreset) {
          for (const stroke of targetPreset.strokes) {
            if (stroke.points.length > 1) {
              ctx.beginPath();
              ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
              for (let i = 1; i < stroke.points.length; i++) ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
              ctx.stroke();
            }
          }
        }
        ctx.setLineDash([]);
        ctx.fillStyle = '#475569';
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.fillText(`VIỀN MỜ HƯỚNG DẪN • Cầm bút/chuột viết đè theo nét đứt này, sau đó bấm [Lưu Vào Kịch Bản]`, 24, 28);
        ctx.restore();
      }

      // 2. Committed strokes
      const selIds = new Set(selectedStrokes.map((s) => s.id));
      for (const stroke of strokes) {
        if (stroke.typeset || stroke.points.length < 2) continue;
        const isSelected = selIds.has(stroke.id);
        paintStroke(ctx, stroke.points, isSelected ? '#2563EB' : stroke.color, stroke.width + (isSelected ? 2 : 0));
      }
      return base;
    },
    [strokes, selectedStrokes, gridPattern, showWatermarkGuide, selectedRecordSlot],
  );

  // Redraw: blit lớp nền rồi vẽ nét đang viết / hình xem trước / vòng lasso / vòng tẩy
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const key = [strokes, selectedStrokes, gridPattern, showWatermarkGuide, selectedRecordSlot, canvas.width, canvas.height];
    const prevKey = baseKeyRef.current;
    let base = baseCanvasRef.current;
    if (!base || !prevKey || prevKey.length !== key.length || key.some((k, i) => k !== prevKey[i])) {
      base = renderBase(canvas.width / bufQ, canvas.height / bufQ, bufQ);
      baseKeyRef.current = key;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (base) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(base, 0, 0);
    }
    ctx.setTransform(bufQ, 0, 0, bufQ, 0, 0); // từ đây vẽ theo tọa độ bảng 1200×675

    // 3. Active freehand stroke
    if (currentStroke.length > 1) {
      ctx.save();
      if (tool === 'LASSO') {
        // Chọn bằng khung chữ nhật: hộp bao của đường kéo (kéo chéo ra đúng khung; khoanh vòng cũng ra khung bao quanh)
        const xs = currentStroke.map((q) => q.x);
        const ys = currentStroke.map((q) => q.y);
        const rx = Math.min(...xs);
        const ry = Math.min(...ys);
        ctx.fillStyle = 'rgba(37, 99, 235, 0.08)';
        ctx.strokeStyle = '#2563EB';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 5]);
        ctx.fillRect(rx, ry, Math.max(...xs) - rx, Math.max(...ys) - ry);
        ctx.strokeRect(rx, ry, Math.max(...xs) - rx, Math.max(...ys) - ry);
      } else if (tool === 'HIGHLIGHTER') {
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.5)';
        ctx.lineWidth = 18;
        ctx.lineCap = 'square';
        ctx.beginPath();
        ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
        for (let i = 1; i < currentStroke.length; i++) ctx.lineTo(currentStroke[i].x, currentStroke[i].y);
        ctx.stroke();
      } else {
        paintStroke(ctx, currentStroke, strokeColor, strokeWidth);
      }
      ctx.restore();
    }

    // 4. Shape preview
    if (tool === 'SHAPE' && shapeStart && shapeCurrent) {
      ctx.save();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const x1 = shapeStart.x;
      const y1 = shapeStart.y;
      const x2 = shapeCurrent.x;
      const y2 = shapeCurrent.y;

      if (selectedShape === 'CIRCLE') {
        const radius = Math.hypot(x2 - x1, y2 - y1);
        ctx.beginPath();
        ctx.arc(x1, y1, radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (selectedShape === 'RECTANGLE') {
        ctx.beginPath();
        ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      } else if (selectedShape === 'LINE') {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      } else if (selectedShape === 'ARROW') {
        const headlen = 14;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.fillStyle = strokeColor;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // 5. Magic Lasso loop
    if (lassoLoop.length > 2) {
      ctx.save();
      ctx.fillStyle = 'rgba(37, 99, 235, 0.08)';
      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth = 2.0;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(lassoLoop[0].x, lassoLoop[0].y);
      for (let i = 1; i < lassoLoop.length; i++) ctx.lineTo(lassoLoop[i].x, lassoLoop[i].y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 6. Vòng tẩy
    if (tool === 'ERASER' && eraserHover) {
      ctx.save();
      ctx.strokeStyle = 'rgba(24,24,27,0.55)';
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(eraserHover.x, eraserHover.y, ERASE_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }, [strokes, currentStroke, selectedStrokes, lassoLoop, tool, strokeColor, strokeWidth, gridPattern, shapeStart, shapeCurrent, selectedShape, showWatermarkGuide, selectedRecordSlot, renderBase, eraserHover, bufQ]);

  useEffect(() => {
    redraw();
  }, [redraw, activeBlueprint]);

  // Giáo viên bật/đổi mô phỏng → học sinh trong phòng thấy ngay
  useEffect(() => {
    if (room.state.role === 'teacher' && room.state.status === 'open' && activeBlueprint) {
      room.send({ type: 'BLUEPRINT', blueprint: slimBlueprint(activeBlueprint) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBlueprint, room.state.status, room.state.role]);

  // Auto-Ink Calligraphy Runner (Smooth ~800ms natural ink playback)
  const triggerAutoInk = useCallback((sceneId: string) => {
    const scene = AUTO_INK_SCENES.find((s) => s.id === sceneId);
    if (!scene) return;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    setActiveAutoScene(sceneId);
    setActiveBlueprint(null);
    setLassoLoop([]);
    setSelectedStrokes([]);
    setIsAutoInking(true);
    setIsCompilingShimmer(false);

    let fullStrokes = scene.strokes;
    let targetLasso = scene.lassoLoop;

    // Check if user has recorded an authentic custom handwriting take for this slot
    if (typeof window !== 'undefined') {
      const savedInk = localStorage.getItem(`socratic_user_ink_${sceneId}`);
      if (savedInk) {
        try {
          const parsed = JSON.parse(savedInk);
          if (Array.isArray(parsed) && parsed.length > 0) {
            fullStrokes = parsed;

            // Compute dynamic bounding box to generate smooth organic lasso loop
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const s of fullStrokes) {
              if (s.points && Array.isArray(s.points)) {
                for (const p of s.points) {
                  if (p.x < minX) minX = p.x;
                  if (p.y < minY) minY = p.y;
                  if (p.x > maxX) maxX = p.x;
                  if (p.y > maxY) maxY = p.y;
                }
              }
            }

            if (Number.isFinite(minX) && minX < maxX) {
              const pad = 28;
              const x1 = Math.max(10, minX - pad);
              const y1 = Math.max(10, minY - pad);
              const x2 = maxX + pad;
              const y2 = maxY + pad;
              const cx = (x1 + x2) / 2;
              const cy = (y1 + y2) / 2;
              const rx = (x2 - x1) / 2;
              const ry = (y2 - y1) / 2;

              const loop: Point[] = [];
              for (let i = 0; i < 16; i++) {
                const theta = (i / 16) * Math.PI * 2;
                loop.push({
                  x: Math.round(cx + rx * Math.cos(theta)),
                  y: Math.round(cy + ry * Math.sin(theta)),
                });
              }
              targetLasso = loop;
            }
          }
        } catch (e) {
          console.warn('Failed to parse saved user ink for', sceneId, e);
        }
      }
    }

    const totalPoints = fullStrokes.reduce((acc, s) => acc + (s.points?.length || 0), 0);
    const durationMs = 800;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);

      const targetPoints = Math.floor(progress * totalPoints);
      let budget = targetPoints;
      const progressiveStrokes: Stroke[] = [];

      for (const stroke of fullStrokes) {
        if (budget <= 0) break;
        const pts = stroke.points || [];
        if (budget >= pts.length) {
          progressiveStrokes.push(stroke);
          budget -= pts.length;
        } else {
          progressiveStrokes.push({
            ...stroke,
            points: pts.slice(0, Math.max(2, budget)),
          });
          budget = 0;
        }
      }

      setStrokes(progressiveStrokes);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Step 1: Commit full strokes
        setStrokes(fullStrokes);
        setIsAutoInking(false);

        // Step 2: Render Magic Lasso Loop
        setLassoLoop(targetLasso);
        setSelectedStrokes(fullStrokes);

        // Step 3: Trigger 450ms AI Semantic Compiling Shimmer
        setIsCompilingShimmer(true);
        setCompilingScene(scene);

        setTimeout(() => {
          setIsCompilingShimmer(false);
          setActiveBlueprint(scene.blueprint);
        }, 450);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, []);

  // Custom handwriting recorder actions
  const handleSaveCustomWriting = useCallback(() => {
    if (strokes.length === 0) {
      setRecorderNotice('Chưa có nét viết nào trên bảng. Bạn hãy viết hoặc vẽ thử trước khi lưu!');
      setTimeout(() => setRecorderNotice(null), 3000);
      return;
    }
    try {
      localStorage.setItem(`socratic_user_ink_${selectedRecordSlot}`, JSON.stringify(strokes));
      setHasCustomSlots((prev) => ({ ...prev, [selectedRecordSlot]: true }));
      setRecorderNotice(`Đã lưu vĩnh viễn nét viết thật cho Slot ${selectedRecordSlot}! Khi tải lại trang (F5) hoặc quay video, nét viết thật của bạn luôn được giữ nguyên.`);

      // Persist to server disk storage (permanent cross-session persistence)
      fetch('/api/v1/canvas/user-ink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId: selectedRecordSlot, strokes }),
      }).catch((err) => console.warn('Disk save warning:', err));

      setTimeout(() => setRecorderNotice(null), 4000);
    } catch (e) {
      setRecorderNotice('Không thể lưu nét viết vào bộ nhớ trình duyệt.');
      setTimeout(() => setRecorderNotice(null), 3000);
    }
  }, [strokes, selectedRecordSlot]);

  const handleResetSlotToDefault = useCallback((slotId: string) => {
    try {
      localStorage.removeItem(`socratic_user_ink_${slotId}`);
      setHasCustomSlots((prev) => ({ ...prev, [slotId]: false }));
      setRecorderNotice(`Đã khôi phục về mẫu viết mặc định của hệ thống cho Slot ${slotId}.`);

      // Remove from server disk storage
      fetch(`/api/v1/canvas/user-ink?slotId=${encodeURIComponent(slotId)}`, {
        method: 'DELETE',
      }).catch((err) => console.warn('Disk reset warning:', err));

      setTimeout(() => setRecorderNotice(null), 3000);
    } catch (e) {
      console.warn(e);
    }
  }, []);

  // Global Director Hotkeys (1, 2, 3, 4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.key === '1') {
        e.preventDefault();
        triggerAutoInk('SCENE_1_PHYSICS');
      } else if (e.key === '2') {
        e.preventDefault();
        triggerAutoInk('SCENE_2_CHEMISTRY');
      } else if (e.key === '3') {
        e.preventDefault();
        triggerAutoInk('SCENE_3_BIOLOGY');
      } else if (e.key === '4') {
        e.preventDefault();
        triggerAutoInk('SCENE_4_MATH');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [triggerAutoInk]);

  // Pointer Interaction — bút/ngón tay/chuột, bắt con trỏ (không đứt nét khi ra ngoài), nhận mọi điểm trung gian, áp lực bút, chống chạm lòng bàn tay
  const activePointerRef = useRef<number | null>(null);
  const lastPenAtRef = useRef(0);
  const livePointsRef = useRef<Point[]>([]);
  const frameRef = useRef<number | null>(null);
  const moveRef = useRef<{ last: Point; saved: boolean } | null>(null);
  const eraserGestureRef = useRef(false);

  const toBoard = (canvas: HTMLCanvasElement, clientX: number, clientY: number, pressure?: number, pen = false): Point => {
    const rect = canvas.getBoundingClientRect();
    const sx = 1200 / (rect.width || 1);
    const sy = 675 / (rect.height || 1);
    const pt: Point = { x: (clientX - rect.left) * sx, y: (clientY - rect.top) * sy };
    if (pen && pressure !== undefined && pressure > 0) pt.p = pressure;
    return pt;
  };

  const flushLive = () => {
    frameRef.current = null;
    setCurrentStroke(livePointsRef.current.slice());
  };
  const scheduleLive = () => {
    if (frameRef.current === null) frameRef.current = requestAnimationFrame(flushLive);
  };

  const selectionBox = () => {
    const bb = bboxOfStrokes(selectedStrokes);
    const pad = 14;
    return { x0: bb.x0 - pad, y0: bb.y0 - pad, x1: bb.x1 + pad, y1: bb.y1 + pad };
  };

  const moveSelectionBy = (dx: number, dy: number) => {
    const ids = new Set(selectedStrokes.map((s) => s.id));
    const shift = (s: Stroke): Stroke => (ids.has(s.id) ? { ...s, points: s.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy })) } : s);
    setStrokes((prev) => prev.map(shift));
    setSelectedStrokes((prev) => prev.map(shift));
    setLassoLoop((prev) => prev.map((p) => ({ x: p.x + dx, y: p.y + dy })));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // chống chạm lòng bàn tay: khi vừa dùng bút thì bỏ qua cảm ứng ngón/lòng bàn tay; chỉ nhận một con trỏ mỗi lúc
    if (e.pointerType === 'pen') lastPenAtRef.current = performance.now();
    if (e.pointerType === 'touch' && performance.now() - lastPenAtRef.current < 1500) return;
    if (gestureRef.current.active) return;
    // Di chuyển bảng: công cụ Tay, giữ Space, hoặc chuột giữa
    if (tool === 'PAN' || spaceDownRef.current || (e.pointerType === 'mouse' && e.button === 1)) {
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* bỏ qua */
      }
      panRef.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, tx: viewRef.current.tx, ty: viewRef.current.ty };
      return;
    }
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (activePointerRef.current !== null && activePointerRef.current !== e.pointerId) return;

    const canvas = e.currentTarget;
    activePointerRef.current = e.pointerId;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* bỏ qua: một số trình duyệt/jsdom không hỗ trợ */
    }
    const pt = toBoard(canvas, e.clientX, e.clientY, e.pressure, e.pointerType === 'pen');
    if (tool === 'TEXT') {
      activePointerRef.current = null;
      // mở ô nhập sau khi sự kiện chuột kết thúc, nếu không thao tác nhấn sẽ lấy mất focus của ô vừa mở
      window.setTimeout(() => setTextDraft({ x: pt.x, y: pt.y, value: '' }), 60);
      return;
    }
    isDrawingRef.current = true;

    // đầu tẩy của bút (nút 32) hoặc công cụ Tẩy
    const eraserByPen = e.pointerType === 'pen' && (e.buttons & 32) !== 0;
    eraserGestureRef.current = tool === 'ERASER' || eraserByPen;

    if (eraserGestureRef.current) {
      saveToUndo();
      eraseAtPoint(pt);
      setEraserHover(pt);
      return;
    }

    // Kéo vùng đã chọn bằng Lasso: nhấn vào bên trong khung vùng chọn → di chuyển
    if (tool === 'LASSO' && selectedStrokes.length > 0) {
      const b = selectionBox();
      if (pt.x >= b.x0 && pt.x <= b.x1 && pt.y >= b.y0 && pt.y <= b.y1) {
        moveRef.current = { last: pt, saved: false };
        return;
      }
    }

    if (tool === 'SHAPE') {
      setShapeStart(pt);
      setShapeCurrent(pt);
      return;
    }

    livePointsRef.current = [pt];
    setCurrentStroke([pt]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const pan = panRef.current;
    if (pan && pan.id === e.pointerId) {
      const el = boardWrapRef.current;
      applyView(
        panBy({ ...viewRef.current, tx: pan.tx, ty: pan.ty }, e.clientX - pan.sx, e.clientY - pan.sy, el?.clientWidth || 1200, el?.clientHeight || 675),
      );
      return;
    }
    if (!isDrawingRef.current) {
      if (tool === 'ERASER' && e.pointerType !== 'touch') setEraserHover(toBoard(canvas, e.clientX, e.clientY));
      return;
    }
    if (activePointerRef.current !== e.pointerId) return;

    // mọi điểm trung gian giữa hai khung hình → nét mượt, không "gãy khúc" khi vẽ nhanh
    const native = e.nativeEvent as PointerEvent;
    const events = typeof native.getCoalescedEvents === 'function' && native.getCoalescedEvents().length > 0 ? native.getCoalescedEvents() : [native];
    const pen = e.pointerType === 'pen';
    const pts = events.map((ev) => toBoard(canvas, ev.clientX, ev.clientY, ev.pressure, pen));

    if (eraserGestureRef.current) {
      for (const p of pts) eraseAtPoint(p);
      setEraserHover(pts[pts.length - 1]);
      return;
    }

    if (moveRef.current) {
      const m = moveRef.current;
      const last = pts[pts.length - 1];
      const dx = last.x - m.last.x;
      const dy = last.y - m.last.y;
      if (!m.saved && Math.hypot(dx, dy) > 1) {
        saveToUndo();
        m.saved = true;
      }
      if (m.saved) {
        moveSelectionBy(dx, dy);
        m.last = last;
      }
      return;
    }

    if (tool === 'SHAPE') {
      setShapeCurrent(pts[pts.length - 1]);
      return;
    }

    const live = livePointsRef.current;
    for (const p of pts) {
      const q = live[live.length - 1];
      if (!q || Math.hypot(p.x - q.x, p.y - q.y) >= 1.2) live.push(p);
    }
    scheduleLive();
  };

  const endPointer = (e: React.PointerEvent<HTMLCanvasElement>, cancelled = false) => {
    if (panRef.current && panRef.current.id === e.pointerId) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* bỏ qua */
      }
      panRef.current = null;
      return;
    }
    if (activePointerRef.current !== null && e.pointerId !== undefined && activePointerRef.current !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* bỏ qua */
    }
    activePointerRef.current = null;
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    commitPointer(cancelled);
  };
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => endPointer(e, false);
  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => endPointer(e, true);

  const commitPointer = (cancelled: boolean) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (eraserGestureRef.current) {
      eraserGestureRef.current = false;
      return;
    }
    if (moveRef.current) {
      moveRef.current = null;
      return;
    }
    const stroke = livePointsRef.current;
    livePointsRef.current = [];

    // 1. Commit Shape
    if (tool === 'SHAPE' && shapeStart && shapeCurrent) {
      const x1 = shapeStart.x;
      const y1 = shapeStart.y;
      const x2 = shapeCurrent.x;
      const y2 = shapeCurrent.y;
      const dist = Math.hypot(x2 - x1, y2 - y1);

      if (!cancelled && dist > 8) {
        let pts: Point[] = [];
        if (selectedShape === 'CIRCLE') {
          const r = dist;
          for (let a = 0; a <= Math.PI * 2; a += 0.12) {
            pts.push({ x: x1 + Math.cos(a) * r, y: y1 + Math.sin(a) * r });
          }
        } else if (selectedShape === 'RECTANGLE') {
          pts = [
            { x: x1, y: y1 }, { x: x2, y: y1 },
            { x: x2, y: y2 }, { x: x1, y: y2 },
            { x: x1, y: y1 }
          ];
        } else {
          // Line or Arrow
          pts = [{ x: x1, y: y1 }, { x: x2, y: y2 }];
        }

        saveToUndo();
        const shapeStroke: Stroke = {
          id: `shape-${Date.now()}-${Math.random()}`,
          points: pts,
          color: strokeColor,
          width: strokeWidth,
        };
        setStrokes((prev) => [...prev, shapeStroke]);
      }

      setShapeStart(null);
      setShapeCurrent(null);
      return;
    }

    // chấm tròn: chạm một lần bằng bút → vẽ một dấu chấm (cần cho dấu chấm của i, dấu thập phân, dấu nhân)
    let pts = stroke;
    if (pts.length === 1 && (tool === 'PEN')) {
      const p = pts[0];
      pts = [p, { ...p, x: p.x + 0.1, y: p.y + 0.1 }];
    }
    if (cancelled || pts.length < 2) {
      setCurrentStroke([]);
      // chạm một điểm vào chỗ trống với công cụ Chọn: bỏ chọn
      if (!cancelled && tool === 'LASSO') {
        setLassoLoop([]);
        setSelectedStrokes([]);
      }
      return;
    }

    // 2. Commit Freehand Pen
    if (tool === 'PEN' || tool === 'HIGHLIGHTER') {
      saveToUndo();
      const rawStroke: Stroke = {
        id: `stroke-${Date.now()}-${Math.random()}`,
        points: pts,
        color: tool === 'HIGHLIGHTER' ? 'rgba(250, 204, 21, 0.4)' : strokeColor,
        width: tool === 'HIGHLIGHTER' ? 18 : strokeWidth,
      };

      // Pure Natural Ink: Handwriting NEVER automatically turns into circles!
      setStrokes((prev) => [...prev, rawStroke]);
      setCurrentStroke([]);

      // Chế độ trực quan hình học tự động: nhận diện và chuyển nét vẽ thành hình tương tác tại chỗ
      if (isGeometryLiveMode) {
        if (autoGeoTimerRef.current) clearTimeout(autoGeoTimerRef.current);
        autoGeoTimerRef.current = setTimeout(() => {
          const allCur = strokesRef.current;
          if (allCur.length >= 1) {
            const recent = allCur.slice(-12).filter((s) => !s.typeset);
            if (recent.length >= 1) {
              const solidSk = recent.length >= 4 ? detectSolidFromStrokes(recent) : null;
              const planeSk = !solidSk && recent.length >= 1 && recent.length <= 4 ? detectPlaneShapeFromStrokes(recent) : null;
              if (solidSk && solidSk.confidence >= 0.70) {
                transformStrokesToGeometryInPlace(recent, makeSolidBlueprint(solidSk.kind, solidSk.dims, solidSk.wire));
              } else if (planeSk && planeSk.confidence >= 0.78) {
                transformStrokesToGeometryInPlace(recent, makePlaneGeometryBlueprint(planeSk));
              }
            }
          }
        }, 850);
      }
    } else if (tool === 'LASSO') {
      // Magic Lasso Vector Hit-testing (Forgiving: >=25% points OR >=30% BBox overlap + 24px pad)
      const x0 = Math.min(...pts.map((q) => q.x));
      const x1 = Math.max(...pts.map((q) => q.x));
      const y0 = Math.min(...pts.map((q) => q.y));
      const y1 = Math.max(...pts.map((q) => q.y));
      if (x1 - x0 < 6 && y1 - y0 < 6) {
        // chạm một điểm: bỏ chọn
        setLassoLoop([]);
        setSelectedStrokes([]);
      } else {
        const loop: Point[] = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }, { x: x0, y: y0 }];
        setLassoLoop(loop);
        setSelectedStrokes(filterEnclosedStrokes(strokes, loop));
      }
      setCurrentStroke([]);
    }
  };

  // Tẩy từng đoạn: chỉ cắt phần nét nằm trong bán kính tẩy, phần còn lại giữ nguyên (tách thành nét mới)
  const eraseAtPoint = (pt: Point) => {
    setStrokes((prev) => {
      let changed = false;
      const next: Stroke[] = [];
      for (const stroke of prev) {
        if (stroke.typeset) {
          const t = stroke.typeset;
          const a = stroke.points[0];
          if (pt.x >= a.x - ERASE_R && pt.x <= a.x + t.w + ERASE_R && pt.y >= a.y - ERASE_R && pt.y <= a.y + t.h + ERASE_R) {
            changed = true; // chạm vào công thức chuẩn → xóa cả khối
            continue;
          }
          next.push(stroke);
          continue;
        }
        // nhanh: bỏ qua nét ở xa
        let near = false;
        for (let i = 0; i < stroke.points.length; i++) {
          const p = stroke.points[i];
          if (Math.abs(p.x - pt.x) < ERASE_R + 12 && Math.abs(p.y - pt.y) < ERASE_R + 12) {
            near = true;
            break;
          }
        }
        if (!near) {
          next.push(stroke);
          continue;
        }
        // làm dày điểm để không "nhảy" qua bán kính tẩy khi bút di chuyển nhanh
        const dense: Point[] = [];
        for (let i = 0; i < stroke.points.length; i++) {
          const b = stroke.points[i];
          if (i > 0) {
            const a = stroke.points[i - 1];
            const n = Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 5);
            for (let k = 1; k <= n; k++) dense.push({ x: a.x + ((b.x - a.x) * k) / (n + 1), y: a.y + ((b.y - a.y) * k) / (n + 1) });
          }
          dense.push(b);
        }
        const pieces: Point[][] = [];
        let cur: Point[] = [];
        let hit = false;
        for (const p of dense) {
          if (Math.hypot(p.x - pt.x, p.y - pt.y) < ERASE_R) {
            hit = true;
            if (cur.length > 1) pieces.push(cur);
            cur = [];
          } else cur.push(p);
        }
        if (cur.length > 1) pieces.push(cur);
        if (!hit) {
          next.push(stroke);
          continue;
        }
        changed = true;
        pieces.forEach((pts, k) => next.push({ ...stroke, id: `${stroke.id}~${k}-${Math.random().toString(36).slice(2, 6)}`, points: pts }));
      }
      return changed ? next : prev;
    });
  };

  const saveToUndo = () => {
    setUndoStack((prev) => [...prev.slice(-20), strokes]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((r) => [...r, strokes]);
    setStrokes(prev);
    setUndoStack((u) => u.slice(0, -1));
    setSelectedStrokes([]);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((u) => [...u, strokes]);
    setStrokes(next);
    setRedoStack((r) => r.slice(0, -1));
  };

  const handleClear = () => {
    setSketchAlts(null);
    // Pre-Clear Commit: Tự động kết đọng cảnh bài giảng vào chuỗi nhật ký tiết học trước khi xóa bảng
    if (strokes.length > 0 || activeBlueprint) {
      const sceneId = `scene-${Date.now()}`;
      setRecordedScenes((prev) => [
        ...prev,
        {
          id: sceneId,
          timestamp: Date.now(),
          strokeCount: strokes.length,
          recognizedLatex: activeBlueprint?.recognizedLatex,
          templateId: activeBlueprint?.templateId,
          previewSummary: activeBlueprint?.socraticQuestion || `Phân cảnh ${prev.length + 1} (${strokes.length} nét viết)`,
        },
      ]);
    }
    if (strokes.length > 0) saveToUndo();
    setStrokes([]);
    setSelectedStrokes([]);
    setCurrentStroke([]);
    setLassoLoop([]);
    setActiveBlueprint(null);
  };

  // ---------- Điều khiển Nút AI Đa năng di chuyển khắp mặt bảng & Menu tròn ----------
  const handleAiHubPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    isDraggingAiHubRef.current = false;
    const curX = aiHubPos?.x ?? 600;
    const curY = aiHubPos?.y ?? 200;
    aiHubDragOriginRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: curX,
      initY: curY,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleAiHubPointerMove = (e: React.PointerEvent) => {
    if (!aiHubDragOriginRef.current) return;
    const dx = e.clientX - aiHubDragOriginRef.current.startX;
    const dy = e.clientY - aiHubDragOriginRef.current.startY;
    if (Math.hypot(dx, dy) > 4) {
      isDraggingAiHubRef.current = true;
      const rect = boardWrapRef.current?.getBoundingClientRect();
      const scaleX = rect && rect.width > 0 ? 1200 / rect.width : 1;
      const scaleY = rect && rect.height > 0 ? 675 / rect.height : 1;
      const nextX = Math.max(50, Math.min(1150, aiHubDragOriginRef.current.initX + dx * scaleX));
      const nextY = Math.max(50, Math.min(625, aiHubDragOriginRef.current.initY + dy * scaleY));
      setAiHubPos({ x: nextX, y: nextY });
    }
  };

  const handleAiHubPointerUp = (e: React.PointerEvent) => {
    if (!isDraggingAiHubRef.current) {
      // Chạm nhẹ mà không kéo -> Đóng/mở vòng tròn tác vụ tròn xung quanh nút AI
      setIsRadialOpen((prev) => !prev);
    }
    aiHubDragOriginRef.current = null;
    isDraggingAiHubRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  // ---------- Chữ viết tay → văn bản & công thức chuẩn ----------
  const flashError = (msg: string, ms = 3500) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage((cur) => (cur === msg ? null : cur)), ms);
  };

  const openConvert = (initialTab: 'VISUAL' | 'GRADE' = 'VISUAL') => {
    const src = sourceStrokes(selectedStrokes.length > 0 ? selectedStrokes : strokes);
    if (src.length === 0) {
      flashError('Chưa có nét viết nào để chuyển. Hãy viết công thức lên bảng (hoặc kéo khung chọn quanh nét cần chuyển) rồi bấm lại.');
      return;
    }
    setConvertCtx({ source: src, initialTab });
  };

  const applyConvert = (lines: ConvertLine[], mode: 'replace' | 'insert') => {
    const ctx = convertCtx;
    if (!ctx) return;
    saveToUndo();
    if (ctx.editing) {
      const edit = ctx.editing;
      const l = lines[0];
      setStrokes((prev) =>
        prev.map((s) =>
          s.id === edit.id && s.typeset
            ? { ...s, typeset: { ...s.typeset, latex: l.latex, text: l.text, w: Math.max(s.typeset.size, l.latex.length * s.typeset.size * 0.5) } }
            : s,
        ),
      );
    } else {
      const placements = layoutTypeset(lines, ctx.source, mode);
      const ink = ctx.source.find((s) => /^#/.test(s.color))?.color ?? '#18181B';
      const made = placements.map((p) => typesetStroke(p, ink));
      const drop = new Set(mode === 'replace' ? ctx.source.map((s) => s.id) : []);
      setStrokes((prev) => [...prev.filter((s) => !drop.has(s.id)), ...made]);
    }
    setSelectedStrokes([]);
    setLassoLoop([]);
    setConvertCtx(null);
  };

  const typesetDragRef = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const onTypesetGripDown = (e: React.PointerEvent<HTMLElement>, s: Stroke) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    typesetDragRef.current = { id: s.id, sx: e.clientX, sy: e.clientY, ox: s.points[0].x, oy: s.points[0].y, moved: false };
  };
  const onTypesetGripMove = (e: React.PointerEvent<HTMLElement>) => {
    const d = typesetDragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.sx) / (boardScale || 1);
    const dy = (e.clientY - d.sy) / (boardScale || 1);
    if (!d.moved && Math.hypot(dx, dy) < 2) return;
    if (!d.moved) {
      d.moved = true;
      saveToUndo();
    }
    setStrokes((prev) => prev.map((s) => (s.id === d.id ? { ...s, points: [{ x: Math.max(0, Math.min(1180, d.ox + dx)), y: Math.max(0, Math.min(650, d.oy + dy)) }] } : s)));
  };
  const onTypesetGripUp = () => {
    typesetDragRef.current = null;
  };
  // Đặt hình dựng từ đề lên bảng; `origin` = tọa độ bảng của góc trên-trái của hình gốc
  const insertGeoFigure = (scene: GeoScene, upTo: number, source: string, at?: { x: number; y: number }) => {
    const origin = at ?? { x: 450, y: 170 };
    const L = layoutGeo(scene, upTo, origin);
    const id = `geo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const made: Stroke = {
      id,
      points: [{ x: L.ax, y: L.ay }],
      color: strokeColor || '#18181B',
      width: 3,
      typeset: { latex: '', text: scene.title, size: 20, w: L.w, h: L.h },
      shape: { kind: 'solid', title: scene.title, sketch: L.sketch, geo: { scene, upTo, origin, source } },
    };
    saveToUndo();
    setStrokes((prev) => [...prev, made]);
    setGeoPanel({ mode: 'edit', id });
    setSelectedStrokes([]);
    setLassoLoop([]);
  };
  const applyGeo = (id: string, scene: GeoScene, upTo: number) => {
    setStrokes((prev) =>
      prev.map((q) => {
        if (q.id !== id || !q.shape?.geo) return q;
        const L = layoutGeo(scene, upTo, q.shape.geo.origin);
        return {
          ...q,
          points: [{ x: L.ax, y: L.ay }],
          typeset: { ...q.typeset!, w: L.w, h: L.h },
          shape: { ...q.shape, sketch: L.sketch, geo: { ...q.shape.geo, scene, upTo } },
        };
      }),
    );
  };
  const geoStroke = geoPanel?.mode === 'edit' ? strokes.find((q) => q.id === geoPanel.id && q.shape?.geo) : undefined;

  const deleteTypeset = (id: string) => {
    saveToUndo();
    setStrokes((prev) => prev.filter((s) => s.id !== id));
    setSelectedStrokes((prev) => prev.filter((s) => s.id !== id));
  };
  // Mở hình tại chỗ thành mô phỏng đầy đủ (khai triển, thông số) trong hologram; hình trên bảng vẫn giữ nguyên
  const openShapeFull = (s: Stroke) => {
    const sh = s.shape;
    if (!sh) return;
    let bp: SimulationBlueprint | null = null;
    if (sh.kind === 'solid' && sh.solid) {
      bp = makeSolidBlueprint(sh.solid.kind as SolidKind, sh.solid.dims);
    } else if (sh.kind === 'plane' && sh.plane) {
      const v = sh.plane.verts;
      const cx = v.reduce((a, p) => a + p.x, 0) / v.length;
      const cy = v.reduce((a, p) => a + p.y, 0) / v.length;
      const D = Math.max(...v.map((p) => Math.hypot(p.x - cx, p.y - cy)), 1) * 2;
      const k = 3.8 / D;
      const st = planeStats(v);
      bp = {
        engine: 'MATH',
        templateId: 'MATH_DYNAMIC_GEOMETRY',
        recognizedLatex: `\\text{${sh.title}}`,
        ocrAlternatives: [],
        parameters: [],
        meta: {
          planeKind: 'custom',
          planeTitle: sh.title,
          vertices2D: v.map((p) => [Number(((p.x - cx) * k).toFixed(2)), Number((-(p.y - cy) * k).toFixed(2))]),
          anglesDeg: st.angles,
          sideLengths: st.sides,
        },
        socraticQuestion: 'Khi kéo các đỉnh của tam giác, ba điểm O, G, H có luôn thẳng hàng trên đường thẳng Euler không? Khoảng cách GH gấp mấy lần GO?',
        curriculumLevel: 'THPT_STANDARD',
      } as SimulationBlueprint;
    }
    if (!bp) return;
    setHoloPosition({ x: Math.max(10, Math.min(630, s.points[0].x)), y: Math.max(10, Math.min(290, s.points[0].y)) });
    setDisplayMode('HOLOGRAM');
    setActiveBlueprint(bp);
  };

  // Vẽ hình tại chỗ lên ảnh xuất
  const drawShapeOnCtx = (ctx: CanvasRenderingContext2D, s: Stroke) => {
    const sh = s.shape;
    const t = s.typeset;
    if (!sh || !t) return;
    const ox = s.points[0].x;
    const oy = s.points[0].y;
    ctx.save();
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
    ctx.lineWidth = Math.max(2.5, s.width || 3);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.font = 'italic 700 16px "Times New Roman", serif';
    if (sh.kind === 'plane' && sh.plane) {
      ctx.beginPath();
      sh.plane.verts.forEach((p, i) => (i ? ctx.lineTo(ox + p.x, oy + p.y) : ctx.moveTo(ox + p.x, oy + p.y)));
      ctx.closePath();
      ctx.stroke();
      sh.plane.verts.forEach((p, i) => ctx.fillText(VERTEX_LABELS[i], ox + p.x + 6, oy + p.y - 6));
    } else if (sh.kind === 'solid' && sh.sketch) {
      const sk = sh.sketch;
      for (const e of sk.edges) {
        ctx.setLineDash(e.hidden ? [7, 6] : []);
        ctx.beginPath();
        ctx.moveTo(ox + sk.verts[e.a].x, oy + sk.verts[e.a].y);
        ctx.lineTo(ox + sk.verts[e.b].x, oy + sk.verts[e.b].y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      sk.verts.forEach((p, i) => ctx.fillText(sk.labels[i] ?? '', ox + p.x + 6, oy + p.y - 6));
    } else if (sh.kind === 'solid' && sh.solid) {
      const wire = solidWire(sh.solid.kind as SolidKind, sh.solid.dims, sh.solid.yaw, sh.solid.pitch, t.w, t.h);
      for (const e of wire.edges) {
        ctx.setLineDash(e.hidden ? [7, 6] : []);
        ctx.beginPath();
        ctx.moveTo(ox + wire.pts[e.a].x, oy + wire.pts[e.a].y);
        ctx.lineTo(ox + wire.pts[e.b].x, oy + wire.pts[e.b].y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      wire.pts.forEach((p, i) => ctx.fillText(wire.labels[i] ?? '', ox + p.x + 6, oy + p.y - 6));
    }
    ctx.restore();
  };

  // ---------------------------------------------------------------- thu phóng / di chuyển / trang / chữ
  const wrapSize = () => ({ W: boardWrapRef.current?.clientWidth || 1200, H: boardWrapRef.current?.clientHeight || 675 });
  const zoomStep = (f: number) => {
    const { W, H } = wrapSize();
    applyView(zoomAt(viewRef.current, viewRef.current.k * f, W / 2, H / 2, W, H));
  };
  const fitView = () => applyView(FIT_VIEW);
  const toggleFullscreen = () => {
    try {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen?.();
    } catch {
      /* trình duyệt không cho phép */
    }
  };

  const duplicateSelection = () => {
    if (selectedStrokes.length === 0) return;
    saveToUndo();
    const stamp = Date.now().toString(36);
    const clones: Stroke[] = selectedStrokes.map((s, i) => ({
      ...s,
      id: `${s.id.split('-dup')[0]}-dup${stamp}${i}`,
      points: s.points.map((p) => ({ ...p, x: Math.min(1190, p.x + 32), y: Math.min(660, p.y + 32) })),
    }));
    setStrokes((prev) => [...prev, ...clones]);
    setSelectedStrokes(clones);
  };

  const resetPageState = () => {
    setSelectedStrokes([]);
    setLassoLoop([]);
    setUndoStack([]);
    setRedoStack([]);
    setSketchAlts(null);
    setTextDraft(null);
  };
  const withCurrentPage = () => {
    const n = pages.slice();
    n[pageIdx] = strokes;
    return n;
  };
  const goPage = (to: number) => {
    if (to < 0 || to >= pages.length || to === pageIdx) return;
    const n = withCurrentPage();
    setPages(n);
    setPageIdx(to);
    setStrokes(n[to] ?? []);
    resetPageState();
  };
  const addPage = () => {
    const n = withCurrentPage();
    n.splice(pageIdx + 1, 0, []);
    setPages(n);
    setPageIdx(pageIdx + 1);
    setStrokes([]);
    resetPageState();
  };
  const deletePage = () => {
    if (pages.length <= 1) return;
    const n = withCurrentPage();
    n.splice(pageIdx, 1);
    const to = Math.min(pageIdx, n.length - 1);
    setPages(n);
    setPageIdx(to);
    setStrokes(n[to] ?? []);
    resetPageState();
  };

  const escapeTex = (t: string) => t.replace(/\\/g, '\\textbackslash{}').replace(/([{}%#&_$^~])/g, (m) => (m === '^' || m === '~' ? `\\${m}{}` : `\\${m}`));
  const commitText = () => {
    const d = textDraft;
    setTextDraft(null);
    const val = d?.value.trim();
    if (!d || !val) return;
    const size = 30;
    const w = Math.max(size, val.length * size * 0.55);
    const st: Stroke = {
      id: `text-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      points: [{ x: Math.min(d.x, 1150), y: Math.min(d.y, 640) }],
      color: strokeColor,
      width: 0,
      typeset: { latex: looksMathy(val) ? typedToLatex(val) : `\\text{${escapeTex(val)}}`, text: val, size, w, h: size * 1.5 },
    };
    saveToUndo();
    setStrokes((prev) => [...prev, st]);
  };

  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  // phím tắt: Space giữ để kéo bảng; Ctrl + / − / 0; Ctrl+Z/Y; Ctrl+D nhân đôi; Delete xóa vùng chọn
  const kbRef = useRef<{ undo: () => void; redo: () => void; del: () => void; dup: () => void; zoom: (f: number) => void; fit: () => void; hasSel: boolean } | null>(null);
  kbRef.current = { undo: handleUndo, redo: handleRedo, del: () => handleDeleteSelection(), dup: duplicateSelection, zoom: zoomStep, fit: fitView, hasSel: selectedStrokes.length > 0 };
  useEffect(() => {
    const editable = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
    };
    const down = (e: KeyboardEvent) => {
      if (editable(e.target)) return;
      const k = kbRef.current;
      if (!k) return;
      const mod = e.ctrlKey || e.metaKey;
      if (e.code === 'Space') {
        spaceDownRef.current = true;
        e.preventDefault();
        (document.activeElement as HTMLElement | null)?.blur?.(); // nút dock đang giữ focus sẽ bị Space "bấm" nếu không bỏ focus
        return;
      }
      if (mod && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        k.zoom(1.25);
      } else if (mod && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        k.zoom(0.8);
      } else if (mod && e.key === '0') {
        e.preventDefault();
        k.fit();
      } else if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) k.redo();
        else k.undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        k.redo();
      } else if (mod && e.key.toLowerCase() === 'd' && k.hasSel) {
        e.preventDefault();
        k.dup();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && k.hasSel) {
        e.preventDefault();
        k.del();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceDownRef.current = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // Ctrl/⌘ + cuộn (hoặc chụm trên bàn di chuột) = thu phóng quanh con trỏ; cuộn khi đã phóng to = di chuyển bảng
  useEffect(() => {
    const el = boardWrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.('[data-testid="hologram-simulation-overlay"]')) return;
      const v = viewRef.current;
      const r = el.getBoundingClientRect();
      const W = el.clientWidth;
      const H = el.clientHeight;
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        applyView(zoomAt(v, v.k * Math.exp(-e.deltaY * 0.0025), e.clientX - r.left, e.clientY - r.top, W, H));
      } else if (v.k > 1) {
        e.preventDefault();
        applyView(panBy(v, -(e.shiftKey ? e.deltaY : e.deltaX), e.shiftKey ? 0 : -e.deltaY, W, H));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Hai ngón chụm/kéo trên cảm ứng: thu phóng + di chuyển bảng (hủy nét đang vẽ dở)
  const gestureDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch') return;
    const g = gestureRef.current;
    g.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (g.touches.size === 2) {
      const [a, b] = Array.from(g.touches.values());
      g.active = true;
      g.d0 = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      g.mid0 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      g.v0 = viewRef.current;
      livePointsRef.current = [];
      setCurrentStroke([]);
      isDrawingRef.current = false;
      activePointerRef.current = null;
      moveRef.current = null;
      e.stopPropagation();
    } else if (g.active) {
      e.stopPropagation();
    }
  };
  const gestureMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (e.pointerType !== 'touch' || !g.touches.has(e.pointerId)) return;
    g.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!g.active || g.touches.size < 2) return;
    e.stopPropagation();
    const el = boardWrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const [a, b] = Array.from(g.touches.values());
    const d = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const z = zoomAt(g.v0, g.v0.k * (d / g.d0), g.mid0.x - r.left, g.mid0.y - r.top, el.clientWidth, el.clientHeight);
    applyView(panBy(z, mid.x - g.mid0.x, mid.y - g.mid0.y, el.clientWidth, el.clientHeight));
  };
  const gestureUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch') return;
    const g = gestureRef.current;
    const had = g.active;
    g.touches.delete(e.pointerId);
    if (had) e.stopPropagation();
    if (g.touches.size === 0) g.active = false;
  };

  const handleDeleteSelection = () => {
    if (selectedStrokes.length === 0) return;
    saveToUndo();
    const ids = new Set(selectedStrokes.map((s) => s.id));
    setStrokes((prev) => prev.filter((s) => !ids.has(s.id)));
    setSelectedStrokes([]);
    setLassoLoop([]);
  };

  // Hologram cao hơn bảng thì bảng cắt mất thanh trượt phía dưới: tự thu nhỏ vừa khung và đẩy lên cho thấy đủ.
  // Chỉ chạy khi mô phỏng mới mở (người dùng tự kéo/phóng sau đó thì giữ nguyên).
  useEffect(() => {
    if (!activeBlueprint || displayMode !== 'HOLOGRAM') return;
    const fit = () => {
      const el = boardWrapRef.current?.querySelector('[data-testid="hologram-simulation-overlay"]') as HTMLElement | null;
      if (!el || !boardScale) return;
      const hCanvas = el.offsetHeight / boardScale;
      const avail = 675 - 24;
      if (hCanvas <= 0) return;
      setHoloScale((cur) => {
        const next = hCanvas * cur > avail ? Math.max(0.45, avail / hCanvas) : cur;
        const nh = hCanvas * next;
        setHoloPosition((p) => {
          const y = Math.max(8, Math.min(p.y, 675 - nh - 8));
          return y === p.y ? p : { ...p, y: Math.round(y) };
        });
        return next;
      });
    };
    const t1 = setTimeout(fit, 700);
    const t2 = setTimeout(fit, 1700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [activeBlueprint?.templateId, activeBlueprint?.recognizedLatex, displayMode, boardScale]);

  // Theo dõi tỉ lệ hiển thị của bảng (canvas 1200 px → chiều rộng thật) để đặt công thức đúng cỡ
  useEffect(() => {
    const el = boardWrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setBoardScale((el.clientWidth || 1200) / 1200));
    ro.observe(el);
    setBoardScale((el.clientWidth || 1200) / 1200);
    return () => ro.disconnect();
  }, []);

  // Export board as clean PNG
  const handleExportBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Công thức chuẩn nằm ở lớp DOM: ghép vào ảnh xuất dưới dạng văn bản (Unicode) để không bị mất
    const out = document.createElement('canvas');
    out.width = canvas.width;
    out.height = canvas.height;
    const octx = out.getContext('2d');
    let href = canvas.toDataURL('image/png');
    if (octx) {
      octx.drawImage(canvas, 0, 0);
      octx.scale(canvas.width / 1200, canvas.height / 675);
      for (const s of strokes) {
        if (!s.typeset) continue;
        if (s.shape) {
          drawShapeOnCtx(octx, s);
          continue;
        }
        octx.fillStyle = s.color;
        octx.font = `italic ${Math.round(s.typeset.size)}px "Times New Roman", serif`;
        octx.textBaseline = 'top';
        const lines = (s.typeset.text || latexToPlain(s.typeset.latex)).split('\n');
        lines.forEach((ln, i) => octx.fillText(ln, s.points[0].x, s.points[0].y + i * s.typeset!.size * 1.2));
      }
      href = out.toDataURL('image/png');
    }
    const a = document.createElement('a');
    a.href = href;
    a.download = `socratic-board-${Date.now()}.png`;
    a.click();
  };

  // Pack Smart Notes & QR Recap auto-sync to backend
  const handleOpenQrModal = async () => {
    setIsQrModalOpen(true);
    try {
      const payload = {
        formula: activeBlueprint?.recognizedLatex || 'y = 2\\sin(3x)',
        template_id: activeBlueprint?.templateId || 'MATH_TRIG_WAVE',
        engine: activeBlueprint?.engine || 'MATH',
        parameters: activeBlueprint?.parameters
          ? Object.fromEntries(activeBlueprint.parameters.map((p) => [p.key, p.defaultValue]))
          : { A: 2.0, omega: 3.0 },
        socratic_questions: [
          activeBlueprint?.socraticQuestion || 'Quan sát sự biến thiên của hàm số khi thay đổi tham số.'
        ],
        key_insights: [
          'Đã đồng bộ trực tiếp từ Bảng Smartboard sang App học sinh qua Live Sync API',
          'Mô phỏng 60FPS đã được đóng gói và nạp vào Smart Notes'
        ],
        class_id: '12A1',
        student_id: 'all_students',
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
        const data = await res.json();
        if (typeof window !== 'undefined' && data.note) {
          localStorage.setItem('socratic_smart_notes_latest', JSON.stringify(data.note));
        }
      }
    } catch (err) {
      console.warn('[SmartboardCanvas] QR Notes auto-export fallback:', err);
    }
  };

  // Voice-to-Blueprint Web Speech API Handler (v3.0)
  const handleVoiceDictation = () => {
    if (isVoiceListening) {
      setIsVoiceListening(false);
      setVoiceNotice(null);
      return;
    }

    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      try {
        const recognition = new SpeechRec();
        recognition.lang = 'vi-VN';
        recognition.continuous = false;
        recognition.interimResults = false;
        setIsVoiceListening(true);
        setVoiceNotice('Đang lắng nghe... Nói ví dụ: "Vẽ đồ thị sin 2x" hoặc "Ném xiên"');

        recognition.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          setIsVoiceListening(false);
          setVoiceNotice(`Đã nhận: "${text}"`);
          if (/\?|thiết diện|lập phương|lớn nhất|tương giao|tại sao|như thế nào|mấy điểm|là gì/i.test(text)) {
            setVoiceQaQuery(text);
            setIsVoiceQaOpen(true);
            setTimeout(() => setVoiceNotice(null), 1200);
            return;
          }
          setFormulaInput(text);
          setTimeout(() => {
            handleVisualize(text);
            setVoiceNotice(null);
          }, 400);
        };

        recognition.onerror = () => {
          setIsVoiceListening(false);
          setVoiceNotice('Không thu được âm thanh. Đang nạp mẫu chuẩn.');
          setTimeout(() => setVoiceNotice(null), 2500);
        };

        recognition.onend = () => {
          setIsVoiceListening(false);
        };

        recognition.start();
        return;
      } catch (err) {
        console.warn('SpeechRecognition initialization failed:', err);
      }
    }

    // Graceful offline fallback if browser environment has no mic permissions
    setIsVoiceListening(true);
    setVoiceNotice('Đang nhận diện giọng nói: "Vẽ đồ thị sin 2x"...');
    setTimeout(() => {
      setIsVoiceListening(false);
      setFormulaInput('y = 2\\sin(3x)');
      handleVisualize('y = 2\\sin(3x)');
      setVoiceNotice(null);
    }, 800);
  };

  // On-demand AI Magic Lasso Compiler
  const runSketchAction = (kind: SketchKind, others: SketchKind[]) => {
    const act = (k: SketchKind, extra = false) => (extra ? SKETCH_EXTRA[k] : SKETCH_ACTIONS[k]());
    const exec = (a: { label: string; blueprint?: SimulationBlueprint; hint?: string } | undefined) => {
      if (!a) return;
      if (a.blueprint) {
        setActiveBlueprint(a.blueprint);
        setSelectedStrokes([]);
        setLassoLoop([]);
      } else if (a.hint) {
        handleVisualize(a.hint);
      }
    };
    const main = act(kind);
    const list = [{ label: main!.label, run: () => exec(main) }];
    const extra = act(kind, true);
    if (extra) list.push({ label: extra.label, run: () => exec(extra) });
    for (const k of others) {
      const a = act(k);
      if (a) list.push({ label: a.label, run: () => exec(a) });
    }
    setSketchAlts(list.length > 1 ? list : null);
    exec(main);
  };

  // Chuyển nét vẽ thành hình tương tác ngay tại vị trí vừa vẽ trên bảng đen (Zero-Background Chalkboard Living Geometry)
  const transformStrokesToGeometryInPlace = useCallback(
    (strokesToTransform: Stroke[], bp: SimulationBlueprint) => {
      if (!strokesToTransform || strokesToTransform.length === 0) return;
      const bb = bboxOfStrokes(strokesToTransform);
      const centerX = (bb.x0 + bb.x1) / 2;
      const centerY = (bb.y0 + bb.y1) / 2;

      // Hình sạch thay thẳng cho nét vẽ trên bảng (như chữ → công thức chuẩn), không đưa vào hologram
      const isSolid = bp.templateId === 'GEO_SOLID';
      const bw = bb.x1 - bb.x0;
      const bh = bb.y1 - bb.y0;
      // Khối vẽ tay: giữ đúng hình người vẽ (nắn thẳng + nối đỉnh), khung ôm sát nét; chỉ khi không có đồ thị nét mới dùng khối mẫu
      const sketchGraph = isSolid ? (bp.meta?.sketch as SketchWireGraph | undefined) : undefined;
      const PAD = 28;
      const keepDrawn = !!sketchGraph && bw >= 20 && bh >= 20;
      const side = Math.max(bw, bh, 170);
      const sw = keepDrawn ? bw + 2 * PAD : isSolid ? side : Math.max(bw, 110);
      const sh = keepDrawn ? bh + 2 * PAD : isSolid ? side : Math.max(bh, 110);
      const shape = shapeFromBlueprint(bp, sw, sh);
      if (shape) {
        const ax = keepDrawn ? Math.max(0, Math.min(1200 - sw, bb.x0 - PAD)) : Math.max(0, Math.min(1200 - sw, centerX - sw / 2));
        const ay = keepDrawn ? Math.max(0, Math.min(675 - sh, bb.y0 - PAD)) : Math.max(0, Math.min(675 - sh, centerY - sh / 2));
        if (keepDrawn && shape.solid) {
          shape.sketch = buildSketchWire(shape.solid.kind as SolidKind, shape.solid.dims, sketchGraph!, {x: ax, y: ay});
        }
        const ids = new Set(strokesToTransform.map((s) => s.id));
        const inkColor = strokesToTransform[0].color || '#18181B';
        const made: Stroke = {
          id: `shape-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
          points: [{ x: ax, y: ay }],
          color: inkColor,
          width: Math.max(2.5, Math.min(4, strokesToTransform[0].width || 3)),
          typeset: { latex: '', text: shape.title, size: 20, w: sw, h: sh },
          shape,
        };
        saveToUndo();
        setStrokes((prev) => [...prev.filter((s) => !ids.has(s.id)), made]);
        setSelectedStrokes([]);
        setLassoLoop([]);
        setFormulaInput('');
        setIsLoading(false);
        return;
      }

      const targetW = 560;
      const targetH = 380;
      const newX = Math.max(10, Math.min(1200 - targetW - 10, centerX - targetW / 2));
      const newY = Math.max(10, Math.min(675 - targetH - 10, centerY - targetH / 2));

      saveToUndo();
      const selIds = new Set(strokesToTransform.map((s) => s.id));
      setStrokes((prev) => prev.filter((s) => !selIds.has(s.id)));

      setHoloPosition({ x: Math.round(newX), y: Math.round(newY) });
      setDisplayMode('HOLOGRAM');
      setActiveBlueprint(bp);
      setSelectedStrokes([]);
      setLassoLoop([]);
      setFormulaInput('');
      setIsLoading(false);
    },
    [strokes],
  );

  const handleVisualize = async (overrideHint?: string) => {
    if (selectedStrokes.length === 0 && !overrideHint) return;
    setIsLoading(true);
    setErrorMessage(null);

    // Công thức đã gõ chuẩn (typeset) được chọn → dùng luôn LaTeX của nó làm gợi ý, khỏi phải nhận dạng lại
    const typesetHint = selectedStrokes
      .filter((s) => s.typeset)
      .map((s) => (s.id.startsWith('text-') ? s.typeset!.text : s.typeset!.latex))
      .join(' \\\\ ');
    const inkSelected = sourceStrokes(selectedStrokes);
    // Vision đang đọc mà người dùng chưa gõ gì: chờ tối đa 9 s (bản cục bộ yếu, không dùng làm kết quả chính)
    let awaitedAi: ConvertResult | null = null;
    if (!overrideHint && !formulaInput.trim() && visionPendingRef.current && visionPromiseRef.current) {
      awaitedAi = await Promise.race([visionPromiseRef.current, new Promise<null>((r) => setTimeout(() => r(null), 9000))]);
    }
    const aiRes = awaitedAi && awaitedAi.lines.length > 0 ? awaitedAi : aiVisionResult;
    let detectedInstantLatex = instantResult ? instantResult.lines.map((l) => l.latex).join(' \\\\ ') : '';
    const aiVisionLatex = aiRes ? aiRes.lines.map((l) => l.latex).join(' \\\\ ') : '';
    if (!detectedInstantLatex && !overrideHint && !formulaInput && inkSelected.length > 0) {
      try {
        const localRec = recognizeLocal(inkSelected);
        if (localRec && localRec.lines.length > 0) {
          detectedInstantLatex = localRec.lines.map((l) => l.latex).join(' \\\\ ');
        }
      } catch (e) {
        // bỏ qua nếu lỗi
      }
    }
    // Chữ tiếng Việt đọc từ máy (không phải công thức) mà không giống tên mô phỏng nào thì bỏ đi, đừng coi chuỗi ký tự bừa là công thức
    const wordSources = [detectedInstantLatex, aiRes ? aiRes.lines.map((l) => l.text).join(' ') : ''];
    const namedWords = wordSources.some((t) => !!t && looksLikeWords(t) && !!matchViName(t));
    if (detectedInstantLatex && looksLikeWords(detectedInstantLatex)) {
      const viLocal = matchViName(detectedInstantLatex);
      detectedInstantLatex = viLocal ? viLocal.canon : '';
    }
    const effectiveHint = overrideHint || formulaInput || aiVisionLatex || typesetHint || detectedInstantLatex || '';

    // -1. Đề bài hình học (viết đủ hoặc tóm tắt, có ký hiệu ⊥ ∥ ∩ ≡): dựng hình từng phần ngay trên bảng
    if (!overrideHint) {
      // đề gõ chữ hoặc VIẾT TAY (Vision đọc ra chữ và LaTeX): thử lần lượt các nguồn chữ, lấy nguồn đầu tiên dựng được hình
      const sources = [formulaInput, aiRes ? aiRes.lines.map((l) => l.text).join('\n') : '', aiRes ? aiRes.lines.map((l) => l.latex).join('\n') : '', typesetHint, effectiveHint].filter((x) => x && x.trim());
      let gp = null as ReturnType<typeof parseGeometryProblem> | null;
      let gpSource = '';
      for (const src of sources) {
        const r = parseGeometryProblem(src);
        if (r.scene && r.isProblem) {
          gp = r;
          gpSource = src;
          break;
        }
      }
      if (gp && gp.scene) {
        const bbSel = selectedStrokes.length > 0 ? bboxOfStrokes(selectedStrokes) : null;
        const at = bbSel ? { x: Math.min(820, bbSel.x1 + 50), y: Math.max(20, bbSel.y0) } : undefined;
        insertGeoFigure(gp.scene, gp.scene.parts.length > 1 ? 0 : gp.scene.parts.length - 1, gpSource, at);
        setFormulaInput('');
        setIsLoading(false);
        return;
      }
    }

    // 0. Chữ tiếng Việt gọi tên một mô phỏng: mở thẳng (không cho nét chữ bị nhầm thành khối hình)
    if (!overrideHint && !typesetHint && namedWords && effectiveHint && looksLikeWords(effectiveHint)) {
      const wordBp = matchInstantStemBlueprint(effectiveHint);
      if (wordBp) {
        setActiveBlueprint(wordBp);
        setSelectedStrokes([]);
        setLassoLoop([]);
        setFormulaInput('');
        setIsLoading(false);
        return;
      }
    }

    // 1. Hình khối 3D vẽ tay (lập phương, hộp, chóp, lăng trụ, tứ diện, bát diện): ưu tiên nhận ngay từ cấu trúc đồ thị nét vẽ
    if (!overrideHint && !typesetHint && !namedWords && inkSelected.length >= 4) {
      const sk = detectSolidFromStrokes(inkSelected);
      if (sk && sk.confidence >= 0.7) {
        transformStrokesToGeometryInPlace(inkSelected, makeSolidBlueprint(sk.kind, sk.dims, sk.wire));
        return;
      }
    }

    // 2. Đa giác phẳng 2D vẽ tay (tam giác thường/vuông/cân/đều, hình vuông, chữ nhật, bình hành): chuyển ngay sang Hình học động tương tác
    if (!overrideHint && !typesetHint && !namedWords && inkSelected.length >= 1 && inkSelected.length <= 4) {
      const planeSk = detectPlaneShapeFromStrokes(inkSelected);
      if (planeSk && planeSk.confidence >= 0.78) {
        transformStrokesToGeometryInPlace(inkSelected, makePlaneGeometryBlueprint(planeSk));
        return;
      }
    }

    // 3. Định tuyến tức thì cục bộ (< 25ms, 0 API): nhận ra ngay công thức STEM và đồ thị mà không cần chờ mạng
    const instantBp = matchInstantStemBlueprint(effectiveHint);
    if (instantBp) {
      setActiveBlueprint(instantBp);
      setSelectedStrokes([]);
      setLassoLoop([]);
      setFormulaInput('');
      setIsLoading(false);
      return;
    }

    // 4. Hình phác thảo STEM (lò xo, sóng, parabol, elip, mạch điện, chạc Y, khí khổng): nhận ngay trên máy
    if (!overrideHint && !typesetHint && inkSelected.length >= 1 && inkSelected.length <= 3) {
      const sk = recognizeSketch(inkSelected.map((s) => ({ points: s.points })));
      if (sk) {
        setIsLoading(false);
        runSketchAction(sk.best.kind, sk.alternatives.map((a) => a.kind));
        return;
      }
    }
    let cropData: { blob: Blob; dataUrl: string; sizeKb: number } | null = null;

    try {
      // 1. High-Contrast Thick-Stroke Off-screen crop (min 512x256, 8px ink, #FFFFFF background)
      if (inkSelected.length > 0) {
        try {
          cropData = await exportIsolatedWebp(inkSelected);
        } catch (err) {
          cropData = { blob: new Blob([]), dataUrl: 'data:image/png;base64,mock', sizeKb: 3.5 };
        }
      }

      const rawStoredGeminiKey = typeof window !== 'undefined' ? (localStorage.getItem('gemini_api_key') || '') : '';
      const rawStoredOrKey = typeof window !== 'undefined' ? (localStorage.getItem('openrouter_api_key') || '') : '';
      const storedGeminiKey = rawStoredGeminiKey.replace(/[\r\n]+/g, ',').replace(/[,;\s]+/g, ',').replace(/^,|,$/g, '').trim();
      const storedOrKey = rawStoredOrKey.replace(/[\r\n]+/g, ',').replace(/[,;\s]+/g, ',').replace(/^,|,$/g, '').trim();
      const payload: Record<string, unknown> = {
        image_base64: cropData ? cropData.dataUrl : '',
        hint_text: effectiveHint,
        hint_subject: effectiveHint,
        raw_strokes_json: JSON.stringify(inkSelected),
        gemini_api_key: storedGeminiKey,
        openrouter_api_key: storedOrKey,
        subject_lock: subjectLock,
      };

      const requestHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (storedGeminiKey) {
        requestHeaders['x-gemini-api-key'] = storedGeminiKey;
      }
      if (storedOrKey) {
        requestHeaders['x-openrouter-api-key'] = storedOrKey;
      }

      if (onApiCallSpy) {
        onApiCallSpy(apiEndpoint, { strokeCount: selectedStrokes.length, hint: effectiveHint });
      }

      let resp: Response;
      const customBackend = (typeof window !== 'undefined' ? window.localStorage.getItem('backend_url') : '') || (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_BACKEND_URL : '') || '';
      try {
        resp = await fetch(apiEndpoint, {
          method: 'POST',
          headers: requestHeaders,
          body: JSON.stringify(payload),
        });
      } catch (fetchErr) {
        if (apiEndpoint.startsWith('/')) {
          if (customBackend) {
            resp = await fetch(`${customBackend.replace(/\/+$/, '')}${apiEndpoint}`, {
              method: 'POST',
              headers: requestHeaders,
              body: JSON.stringify(payload),
            });
          } else {
            resp = await fetch(`http://127.0.0.1:8000${apiEndpoint}`, {
              method: 'POST',
              headers: requestHeaders,
              body: JSON.stringify(payload),
            });
          }
        } else {
          throw fetchErr;
        }
      }

      if (!resp.ok && apiEndpoint.startsWith('/') && customBackend) {
        try {
          const directResp = await fetch(`${customBackend.replace(/\/+$/, '')}${apiEndpoint}`, {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify(payload),
          });
          if (directResp.ok) resp = directResp;
        } catch {}
      }


      if (!resp.ok) {
        const errText = await resp.text();
        console.error('[Magic Lasso API Error]', resp.status, errText);
        throw new Error(`Mã lỗi HTTP ${resp.status}`);
      }

      const data = await resp.json();
      const bp = data.simulation_blueprint || data;
      const formula = data.ocr_result?.recognized_latex || bp.recognizedLatex || effectiveHint || 'y = 2x + 1';
      const conf = data.ocr_result?.confidence ?? 0.98;
      const alts = data.ocr_result?.alternatives || bp.ocrAlternatives || [];

      const finalBp: SimulationBlueprint = {
        ...bp,
        recognizedLatex: formula,
        ocrAlternatives: alts,
      };

      // Kiểm tra độ tin cậy của ký hiệu / công thức nhận diện:
      // Màn hình check lại/sửa (OcrReviewModal) CHỈ hiện khi độ tin cậy của AI Vision thực sự thấp (< 0.80)
      // Nếu AI Vision tự tin (>= 0.80) hoặc dùng bộ nhận diện offline -> chuyển thẳng sang mô phỏng 60FPS
      const isAiVisionUsed = Boolean(
        aiVisionResult ||
        (data?.simulation_blueprint?.meta?.engine && String(data.simulation_blueprint.meta.engine).includes('VISION')) ||
        (data?.ocr_result && data.ocr_result.confidence !== undefined && conf < 0.80)
      );
      const isLowConfidence = isAiVisionUsed && conf < 0.80;

      if (isLowConfidence) {
        setPendingBlueprint(finalBp);
        setReviewFormula(formula);
        setReviewConfidence(conf);
        setReviewThumbnailUrl(cropData ? cropData.dataUrl : null);
        setReviewAlternatives(alts);
        setIsOcrReviewOpen(true);
      } else {
        // CP1 Mandate: [Trực quan hóa] always mounts SimulationWidget in <1.5s
        setActiveBlueprint(finalBp);
        setSelectedStrokes([]);
        setLassoLoop([]);
        setFormulaInput('');
      }
    } catch (err: any) {
      console.error('[Magic Lasso] Pipeline Error:', err);
      setErrorMessage(`Lỗi nhận diện (${err?.message || 'Không kết nối được server'}). Đã kích hoạt mô phỏng offline.`);

      // Comprehensive fallback heuristics: dynamically map ANY written formula to its exact knowledge visualizer
      const fallbackBp = matchInstantStemBlueprint(effectiveHint) || {
        engine: 'MATH',
        templateId: 'MATH_FUNC_2D',
        recognizedLatex: effectiveHint || 'y = 2x + 1',
        ocrAlternatives: ['y = 2x + 1', 'y = x^2 - 4', 'y = x^3 - 3x', 'y = 2\\sin(3x)'],
        parameters: [
          { key: 'c', label: 'Hệ số góc (k)', unit: '', defaultValue: 2, min: -10, max: 10, step: 0.5 },
          { key: 'd', label: 'Tung độ gốc (d)', unit: '', defaultValue: 1, min: -10, max: 10, step: 0.5 },
          { key: 'x0', label: 'Điểm tiếp điểm (x₀)', unit: '', defaultValue: 1, min: -5, max: 5, step: 0.5 },
        ],
        socraticQuestion: 'Tại sao khi tăng hệ số góc k = 2 lên k = 4, độ dốc của đường thẳng lại tăng lên?',
      };

      setActiveBlueprint(fallbackBp);
      setSelectedStrokes([]);
      setLassoLoop([]);
      setFormulaInput('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReview = (finalFormula: string) => {
    let bp = pendingBlueprint;
    if (!bp) {
      bp = {
        engine: 'MATH',
        templateId: finalFormula.includes('sin') || finalFormula.includes('cos') ? 'MATH_TRIG_WAVE' : 'MATH_FUNC_2D',
        recognizedLatex: finalFormula,
        parameters: [],
        socraticQuestion: 'Làm thế nào để xác định đặc trưng biến thiên của đồ thị này?',
      };
    } else {
      bp = {
        ...bp,
        recognizedLatex: finalFormula,
      };
      if (finalFormula.includes('sin') || finalFormula.includes('cos')) {
        bp.engine = 'MATH';
        bp.templateId = 'MATH_TRIG_WAVE';
      }
    }

    setActiveBlueprint(bp);
    setIsOcrReviewOpen(false);
    setPendingBlueprint(null);
    setSelectedStrokes([]);
    setLassoLoop([]);
    setFormulaInput('');
  };

  const handleCancelReview = () => {
    setIsOcrReviewOpen(false);
    setPendingBlueprint(null);
  };

  const handleQuickFormula = (latex: string) => {
    if (latex.includes('sin') || latex.includes('cos')) {
      setActiveBlueprint({
        engine: 'MATH',
        templateId: 'MATH_TRIG_WAVE',
        recognizedLatex: latex,
        ocrAlternatives: ['y = 2\\sin(3x)', 'y = 2\\cos(3x)', 'y = 3\\sin(2x)'],
        parameters: [
          { key: 'A', label: 'Biên độ (A)', unit: 'cm', defaultValue: 2.0, min: 0.5, max: 5.0, step: 0.5 },
          { key: 'omega', label: 'Tần số góc (ω)', unit: 'rad/s', defaultValue: 3.0, min: 1.0, max: 10.0, step: 1.0 },
          { key: 'phi', label: 'Pha ban đầu (φ)', unit: 'rad', defaultValue: 0.0, min: -3.14, max: 3.14, step: 0.1 },
          { key: 'D', label: 'Độ lệch trục (D)', unit: '', defaultValue: 0.0, min: -3.0, max: 3.0, step: 0.5 },
        ],
        socraticQuestion: 'Nếu tăng tần số góc ω lên gấp đôi, đồ thị sẽ thay đổi như thế nào?',
      });
    } else {
      const isQuad = latex.includes('^2') || latex.includes('²');
      const b = isQuad ? 1 : 0;
      const c = isQuad ? 0 : 2;
      const d = isQuad ? -4 : 1;
      setActiveBlueprint({
        engine: 'MATH',
        templateId: 'MATH_FUNC_2D',
        recognizedLatex: latex,
        ocrAlternatives: ['y = 2x + 1', 'y = x^2 - 4', 'y = x^3 - 3x'],
        parameters: isQuad
          ? [
              { key: 'b', label: 'Hệ số a (x²)', unit: '', defaultValue: b, min: -5, max: 5, step: 0.5 },
              { key: 'c', label: 'Hệ số b (x)', unit: '', defaultValue: c, min: -10, max: 10, step: 0.5 },
              { key: 'd', label: 'Hệ số c (tự do)', unit: '', defaultValue: d, min: -10, max: 10, step: 0.5 },
              { key: 'x0', label: 'Điểm tiếp điểm (x₀)', unit: '', defaultValue: 1, min: -5, max: 5, step: 0.5 },
            ]
          : [
              { key: 'c', label: 'Hệ số góc (k)', unit: '', defaultValue: c, min: -10, max: 10, step: 0.5 },
              { key: 'd', label: 'Tung độ gốc (d)', unit: '', defaultValue: d, min: -10, max: 10, step: 0.5 },
              { key: 'x0', label: 'Điểm tiếp điểm (x₀)', unit: '', defaultValue: 1, min: -5, max: 5, step: 0.5 },
            ],
        socraticQuestion: 'Hệ số tự do d quyết định điểm cắt của đồ thị với trục tung Oy như thế nào?',
      });
    }
  };

  return (
    <div
      data-testid="smartboard-container"
      className="relative w-full min-h-screen bg-[#F8F7F4] text-[#18181B] flex flex-col items-center justify-start p-2 pb-28 select-none"
    >
      {/* CHỮ VIẾT TAY → CÔNG THỨC CHUẨN */}
      {convertCtx && (
        <InkConvertPanel
          source={convertCtx.source}
          editing={convertCtx.editing ?? null}
          initialTab={convertCtx.initialTab ?? 'VISUAL'}
          initialAiResult={aiVisionResult}
          isAiScanning={isAiVisionScanning}
          initialSubject={subjectLock}
          onSubjectChange={setSubjectLock}
          enableGrading
          onClose={() => setConvertCtx(null)}
          onApply={applyConvert}
          onVisualizeLocal={(bp) => {
            const ink = convertCtx?.source && convertCtx.source.length > 0 ? convertCtx.source : selectedStrokes;
            if (ink && ink.length > 0 && (bp.engine === 'GEOMETRY' || bp.templateId === 'MATH_DYNAMIC_GEOMETRY')) {
              transformStrokesToGeometryInPlace(ink, bp);
            } else {
              if (ink && ink.length > 0) {
                const ids = new Set(ink.map((s: Stroke) => s.id));
                const bb = bboxOfStrokes(ink);
                const centerX = (bb.x0 + bb.x1) / 2;
                const centerY = (bb.y0 + bb.y1) / 2;
                const targetW = 560;
                const targetH = 380;
                const newX = Math.max(10, Math.min(1200 - targetW - 10, centerX - targetW / 2));
                const newY = Math.max(10, Math.min(675 - targetH - 10, centerY - targetH / 2));
                setHoloPosition({ x: Math.round(newX), y: Math.round(newY) });
                saveToUndo();
                setStrokes((prev) => prev.filter((s) => !ids.has(s.id)));
              }
              setDisplayMode('HOLOGRAM');
              setActiveBlueprint(bp);
              setSelectedStrokes([]);
              setLassoLoop([]);
            }
            setConvertCtx(null);
          }}
          onVisualizeAi={(latex) => {
            setConvertCtx(null);
            handleVisualize(latex);
          }}
        />
      )}

      {/* STUDIO HANDWRITING RECORDER CONSOLE */}
      {isStudioRecorderOpen && (
        <div
          data-testid="studio-recorder-console"
          className="flex flex-col gap-3 mt-2 px-4 py-3 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E6E4DD] shadow-[0_8px_30px_rgb(0,0,0,0.06)] z-25 max-w-5xl w-full animate-in fade-in duration-150"
        >
          {/* Top Row: Title, Description, and Close Button */}
          <div className="flex items-center justify-between border-b border-[#E6E4DD] pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-stone-900 text-white font-mono text-[10px] uppercase font-bold tracking-wider">
                Demo Studio
              </span>
              <h3 className="text-xs font-semibold text-stone-900">
                Phòng Thu & Lưu Nét Viết Demo (One-Take Handwriting Recorder)
              </h3>
              <span className="text-[11px] text-stone-500 hidden md:inline">
                • Bật viền mờ để viết đè theo mẫu rồi bấm [Lưu Vào Kịch Bản]
              </span>
            </div>
            <button
              onClick={() => setIsStudioRecorderOpen(false)}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition"
              title="Đóng phòng thu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Slot Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono uppercase text-stone-500 font-semibold shrink-0">
              Chọn Kịch Bản:
            </span>
            {AUTO_INK_SCENES.map((scene, idx) => {
              const hotkey = idx + 1;
              const isSelected = selectedRecordSlot === scene.id;
              const hasCustom = hasCustomSlots[scene.id];
              return (
                <button
                  key={scene.id}
                  type="button"
                  data-testid={`studio-slot-btn-${hotkey}`}
                  onClick={() => setSelectedRecordSlot(scene.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition cursor-pointer border ${
                    isSelected
                      ? 'bg-[#18181B] text-white border-[#18181B] font-medium shadow-xs'
                      : 'bg-[#F8F7F4] hover:bg-[#EFECE6] border-[#E6E4DD] text-stone-700'
                  }`}
                >
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                    isSelected ? 'bg-white text-stone-900' : 'bg-stone-200 text-stone-700'
                  }`}>
                    {hotkey}
                  </span>
                  <span>{scene.shortLabel}</span>
                  {hasCustom ? (
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${
                      isSelected ? 'bg-emerald-400 text-stone-950 font-bold' : 'bg-emerald-100 text-emerald-800 font-semibold'
                    }`}>
                      Đã lưu nét thật ✓
                    </span>
                  ) : (
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full ${
                      isSelected ? 'bg-stone-700 text-stone-300' : 'bg-stone-100 text-stone-500'
                    }`}>
                      Mặc định
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Prompt description for selected slot */}
          <div className="bg-[#F8F7F4] border border-[#E6E4DD] rounded-xl px-3 py-2 text-xs text-stone-700 flex flex-wrap items-center gap-2.5">
            <span className="text-[10px] font-bold text-blue-700 uppercase bg-blue-50 px-2 py-0.5 rounded border border-blue-200 shrink-0">
              Công thức mẫu:
            </span>
            <div className="flex flex-wrap items-center gap-2.5">
              {selectedRecordSlot === 'SCENE_1_PHYSICS' && (
                <>
                  <span className="text-stone-600 font-medium">Vật lý:</span>
                  <div className="bg-white px-2 py-0.5 rounded border border-[#E6E4DD] shadow-2xs">
                    <MathView latex="Z = \sqrt{R^2 + (Z_L - Z_C)^2}" displayMode={false} />
                  </div>
                  <span className="text-stone-400">&</span>
                  <div className="bg-white px-2 py-0.5 rounded border border-[#E6E4DD] shadow-2xs">
                    <MathView latex="v_0 = 24\text{ m/s}, \quad \alpha = 45^\circ" displayMode={false} />
                  </div>
                </>
              )}
              {selectedRecordSlot === 'SCENE_2_CHEMISTRY' && (
                <>
                  <span className="text-stone-600 font-medium">Hóa học:</span>
                  <div className="bg-white px-2 py-0.5 rounded border border-[#E6E4DD] shadow-2xs">
                    <MathView latex="\text{N}_2 + 3\text{H}_2 \rightleftharpoons 2\text{NH}_3 \quad (\Delta H < 0)" displayMode={false} />
                  </div>
                  <span className="text-stone-400">&</span>
                  <div className="bg-white px-2 py-0.5 rounded border border-[#E6E4DD] shadow-2xs">
                    <MathView latex="4\text{Fe} + 3\text{O}_2 \rightarrow 2\text{Fe}_2\text{O}_3" displayMode={false} />
                  </div>
                </>
              )}
              {selectedRecordSlot === 'SCENE_3_BIOLOGY' && (
                <>
                  <span className="text-stone-600 font-medium">Sinh học:</span>
                  <div className="bg-white px-2 py-0.5 rounded border border-[#E6E4DD] shadow-2xs">
                    <MathView latex="6\text{CO}_2 + 6\text{H}_2\text{O} \rightarrow \text{C}_6\text{H}_{12}\text{O}_6 + 6\text{O}_2" displayMode={false} />
                  </div>
                  <span className="text-stone-400">&</span>
                  <div className="bg-white px-2 py-0.5 rounded border border-[#E6E4DD] shadow-2xs">
                    <MathView latex="\text{ADN}: A = T, \quad G = X" displayMode={false} />
                  </div>
                </>
              )}
              {selectedRecordSlot === 'SCENE_4_MATH' && (
                <>
                  <span className="text-stone-600 font-medium">Toán học:</span>
                  <div className="bg-white px-2 py-0.5 rounded border border-[#E6E4DD] shadow-2xs">
                    <MathView latex="y = \int_{-2}^{2} (x^3 - 3x)\,dx" displayMode={false} />
                  </div>
                  <span className="text-stone-400">&</span>
                  <div className="bg-white px-2 py-0.5 rounded border border-[#E6E4DD] shadow-2xs">
                    <MathView latex="f'(x) = 3x^2 - 3 = 0 \iff x = \pm 1" displayMode={false} />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#F2F0EA]">
            {/* Left Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="btn-toggle-watermark"
                onClick={() => setShowWatermarkGuide((w) => !w)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                  showWatermarkGuide
                    ? 'bg-blue-50 text-blue-700 border-blue-200 font-semibold'
                    : 'bg-white hover:bg-stone-50 border-[#DCD9D0] text-stone-700'
                }`}
                title="Bật/Tắt viền mờ mẫu trên bảng viết"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showWatermarkGuide ? 'Đang bật viền mờ mẫu' : 'Bật viền mờ mẫu'}</span>
              </button>

              <button
                type="button"
                data-testid="btn-clear-for-practice"
                onClick={handleClear}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-white hover:bg-stone-50 border border-[#DCD9D0] text-stone-700 transition cursor-pointer"
                title="Xóa các nét trên bảng để viết lại"
              >
                <Trash2 className="w-3.5 h-3.5 text-stone-500" />
                <span>Xóa để viết lại</span>
              </button>
            </div>

            {/* Right Controls: Save & Playback */}
            <div className="flex items-center gap-2">
              {hasCustomSlots[selectedRecordSlot] && (
                <button
                  type="button"
                  data-testid="btn-reset-slot"
                  onClick={() => handleResetSlotToDefault(selectedRecordSlot)}
                  className="px-2.5 py-1.5 rounded-lg text-xs text-rose-700 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
                  title="Xóa bản viết tay đã lưu và quay lại mẫu hệ thống"
                >
                  Khôi phục mẫu gốc
                </button>
              )}

              <button
                type="button"
                data-testid="btn-test-playback"
                onClick={() => triggerAutoInk(selectedRecordSlot)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#F2F0EA] hover:bg-[#EAE7DF] border border-[#DCD9D0] text-stone-800 transition cursor-pointer"
                title="Chạy thử chuyển động viết và kích hoạt mô phỏng"
              >
                <Sparkles className="w-3.5 h-3.5 text-stone-600" />
                <span>Phát thử (Test 0.8s)</span>
              </button>

              <button
                type="button"
                data-testid="btn-save-custom-ink"
                onClick={handleSaveCustomWriting}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
                title="Lưu lại các nét vừa viết trên bảng cho kịch bản này"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Lưu Bản Viết Này Vào Kịch Bản</span>
              </button>
            </div>
          </div>

          {/* Recorder Notice Banner */}
          {recorderNotice && (
            <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono">
              <span>{recorderNotice}</span>
              <button onClick={() => setRecorderNotice(null)} className="text-emerald-800 font-bold">✕</button>
            </div>
          )}
        </div>
      )}

      {/* Visible Error Toast Banner */}
      {errorMessage && (
        <div
          data-testid="error-toast"
          className="flex items-center justify-between gap-3 px-4 py-2 mt-2 w-full max-w-5xl rounded-xl bg-[#FFF1F2] border border-[#FECDD3] text-[#9F1239] text-xs shadow-sm animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 hover:text-rose-900 font-mono px-2 py-0.5 rounded transition"
          >
            ✕
          </button>
        </div>
      )}

      {/* Voice Recognition Notice Banner */}
      {voiceNotice && (
        <div
          data-testid="voice-notice-banner"
          className="flex items-center gap-2 px-4 py-2 mt-2 w-full max-w-5xl rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] text-xs shadow-sm"
        >
          <Mic className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>{voiceNotice}</span>
        </div>
      )}

      {/* Mọi tác vụ trên vùng khoanh nằm trong thẻ của nút AI nổi (xem <AiFab panel=…>) */}

      {/* Smartboard Canvas & Side-by-Side Ergonomic Split-View Workspace */}
      <div className="flex flex-col lg:flex-row items-start justify-center gap-3 mt-1 w-full max-w-[1500px]">
        {/* Drawing Canvas Area (Always visible, NEVER covered, high-def 1200x675) */}
        <div
          ref={boardWrapRef}
          onPointerDownCapture={gestureDown}
          onPointerMoveCapture={gestureMove}
          onPointerUpCapture={gestureUp}
          onPointerCancelCapture={gestureUp}
          data-testid="board-wrap"
          data-zoom={view.k.toFixed(3)}
          style={{ maxWidth: 'min(1800px, calc((100vh - 120px) * 1.7778))' }}
          className={`relative rounded-2xl overflow-hidden border border-[#E6E4DD] bg-[#EDEBE5] shadow-sm ${
            (activeBlueprint && displayMode === 'DOCK') || isCompilingShimmer
              ? isSplitView
                ? 'w-full lg:w-1/2'
                : 'w-full lg:w-[52%]'
              : 'w-full'
          }`}
        >
          <div
            data-testid="board-stage"
            className="relative origin-top-left"
            style={{ transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.k})`, willChange: view.k === 1 ? undefined : 'transform' }}
          >
          <canvas
            ref={canvasRef}
            data-testid="chalkboard-canvas"
            width={Math.round(1200 * bufQ)}
            height={Math.round(675 * bufQ)}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onPointerLeave={() => setEraserHover(null)}
            className={`${tool === 'PAN' ? 'cursor-grab' : tool === 'TEXT' ? 'cursor-text' : tool === 'ERASER' ? 'cursor-none' : tool === 'LASSO' && selectedStrokes.length > 0 ? 'cursor-move' : 'cursor-crosshair'} touch-none w-full h-auto block`}
          />

          {sketchAlts && (
            <div data-testid="sketch-alts" className="absolute left-3 top-3 z-20 flex flex-wrap items-center gap-1.5 rounded-xl bg-white/95 backdrop-blur border border-[#DCD9D0] shadow-md px-2.5 py-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500">Hình giống</span>
              {sketchAlts.map((a, i) => (
                <button
                  key={a.label}
                  data-testid={`sketch-alt-${i}`}
                  onClick={a.run}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition border ${i === 0 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-stone-700 border-[#DCD9D0] hover:bg-stone-50'}`}
                >
                  {a.label}
                </button>
              ))}
              <button onClick={() => setSketchAlts(null)} className="ml-1 text-stone-400 hover:text-stone-700" title="Ẩn">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <VectorTimeTravelBar getJournal={journal.snapshot} eventCount={journal.eventCount} />

          {geoPanel?.mode === 'new' && (
            <GeometryProblemPanel
              mode="new"
              initialText={geoPanel.text}
              onClose={() => setGeoPanel(null)}
              onCreate={(sc, upTo, src) => insertGeoFigure(sc, upTo, src)}
            />
          )}
          {geoPanel?.mode === 'edit' && geoStroke?.shape?.geo && (
            <GeometryProblemPanel
              key={geoStroke.id}
              mode="edit"
              scene={geoStroke.shape.geo.scene}
              upTo={geoStroke.shape.geo.upTo}
              onClose={() => {
                setGeoPanel(null);
                setGeoPickCfg(null);
              }}
              onApply={(sc, upTo) => applyGeo(geoStroke.id, sc, upTo)}
              onDeleteFigure={() => {
                deleteTypeset(geoStroke.id);
                setGeoPanel(null);
                setGeoPickCfg(null);
              }}
              onPickConfig={setGeoPickCfg}
              onController={setGeoCtl}
            />
          )}

          {/* Lớp công thức chuẩn (KaTeX) đặt trên canvas; chỉ phần tay cầm nhận chuột nên bút vẫn viết xuyên qua được */}
          <div className="absolute inset-0 pointer-events-none" data-testid="typeset-layer">
            {textDraft && (
              <input
                data-testid="text-draft-input"
                autoFocus
                value={textDraft.value}
                onChange={(e) => setTextDraft((d) => (d ? { ...d, value: e.target.value } : d))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitText();
                  else if (e.key === 'Escape') setTextDraft(null);
                }}
                onBlur={commitText}
                placeholder="Gõ chữ rồi Enter…"
                className="absolute pointer-events-auto bg-white/90 border-2 border-blue-500 rounded-md px-2 outline-none shadow-md"
                style={{ left: `${(textDraft.x / 1200) * 100}%`, top: `${(textDraft.y / 675) * 100}%`, fontSize: Math.max(10, 30 * boardScale), color: strokeColor, minWidth: 160 * boardScale + 120, lineHeight: 1.3 }}
              />
            )}
            {strokes
              .filter((s) => s.shape && s.typeset)
              .map((s) => (
                <InlineShape
                  key={s.id}
                  stroke={s}
                  boardScale={boardScale}
                  picked={selectedStrokes.some((q) => q.id === s.id)}
                  onChange={(shape) => setStrokes((prev) => prev.map((q) => (q.id === s.id ? { ...q, shape } : q)))}
                  onDelete={() => deleteTypeset(s.id)}
                  onOpenFull={() => openShapeFull(s)}
                  onMoveStart={(e) => onTypesetGripDown(e, s)}
                  onMove={onTypesetGripMove}
                  onMoveEnd={onTypesetGripUp}
                  onInteractStart={saveToUndo}
                  onOpenTools={s.shape?.geo ? () => { setGeoPanel({ mode: 'edit', id: s.id }); setHubOpenAt({ path: ['draw'], nonce: Date.now() }); } : undefined}
                  pickMode={geoPanel?.mode === 'edit' && geoPanel.id === s.id ? geoPickCfg?.pickMode ?? null : null}
                  pickedNames={geoPanel?.mode === 'edit' && geoPanel.id === s.id ? geoPickCfg?.picks : undefined}
                  onPickPoint={geoPickCfg?.onPickPoint}
                  onPickEdge={geoPickCfg?.onPickEdge}
                />
              ))}
            {strokes
              .filter((s) => s.typeset && !s.shape)
              .map((s) => {
                const t = s.typeset!;
                const picked = selectedStrokes.some((q) => q.id === s.id);
                return (
                  <div
                    key={s.id}
                    data-testid="typeset-item"
                    data-latex={t.latex}
                    className="absolute"
                    style={{
                      left: `${(s.points[0].x / 1200) * 100}%`,
                      top: `${(s.points[0].y / 675) * 100}%`,
                      fontSize: Math.max(8, t.size * boardScale),
                      color: s.color,
                      lineHeight: 1.3,
                      whiteSpace: 'nowrap',
                      outline: picked ? '2px solid #2563EB' : 'none',
                      outlineOffset: 3,
                      borderRadius: 4,
                    }}
                  >
                    <div className="pointer-events-auto absolute left-0 -top-[22px] flex items-center gap-px rounded-md bg-white/90 border border-[#DCD9D0] shadow-sm text-[10px] opacity-40 hover:opacity-100 transition-opacity" style={{ fontSize: 11 }}>
                      <span
                        data-testid="typeset-grip"
                        title="Kéo để di chuyển"
                        onPointerDown={(e) => onTypesetGripDown(e, s)}
                        onPointerMove={onTypesetGripMove}
                        onPointerUp={onTypesetGripUp}
                        className="px-1.5 cursor-grab active:cursor-grabbing select-none touch-none text-stone-500"
                      >
                        ⠿
                      </span>
                      <button
                        data-testid="typeset-edit"
                        title="Sửa công thức"
                        onClick={() => setConvertCtx({ source: [], editing: { id: s.id, latex: t.latex, text: t.text } })}
                        className="px-1 py-0.5 hover:bg-stone-100 text-stone-600"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button data-testid="typeset-delete" title="Xóa" onClick={() => deleteTypeset(s.id)} className="px-1 py-0.5 hover:bg-rose-50 text-stone-600 hover:text-rose-600">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <MathView latex={t.latex} />
                  </div>
                );
              })}

          </div>

          </div>

          {/* Chế độ Trực quan Hình học Tự động HUD Banner */}
          {isGeometryLiveMode && (
            <div
              data-testid="geo-live-mode-badge"
              className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3.5 py-1.5 whitespace-nowrap rounded-full bg-blue-600/95 backdrop-blur-md text-white text-xs font-semibold shadow-lg border border-blue-400/40 animate-in fade-in"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>Trực quan hình học: vẽ xong, hình tự thành mô hình</span>
              <button
                type="button"
                data-testid="geo-live-mode-close"
                onClick={() => setIsGeometryLiveMode(false)}
                className="ml-1 p-0.5 hover:bg-white/20 rounded-full cursor-pointer transition"
                title="Tắt chế độ trực quan hình học tự động"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Hologram Simulation Overlay - Zero-Background Living Ink on Blackboard */}
          {activeBlueprint && !isCompilingShimmer && displayMode === 'HOLOGRAM' && (
            <div
              data-testid="hologram-simulation-overlay"
              onPointerDown={handleHoloPointerDownAnywhere}
              onPointerMove={handleHoloGripMove}
              onPointerUp={handleHoloGripUp}
              onPointerCancel={handleHoloGripUp}
              onWheel={handleHoloWheelZoom}
              className="absolute z-20 pointer-events-auto select-none cursor-grab active:cursor-grabbing touch-none group"
              style={{
                left: `${(holoPosition.x / 1200) * 100}%`,
                top: `${(holoPosition.y / 675) * 100}%`,
                transform: `scale(${holoScale})`,
                transformOrigin: 'top left',
                width: '560px',
                maxWidth: '92%',
                transition: isDraggingHoloRef.current || isPinchingHoloRef.current || isResizingHoloRef.current ? 'none' : 'transform 0.15s ease-out',
              }}
            >
              <SimulationWidget
                key={`${activeBlueprint.templateId}|${activeBlueprint.recognizedLatex}|holo`}
                blueprint={activeBlueprint}
                displayMode="HOLOGRAM"
                onToggleDisplayMode={() => setDisplayMode('DOCK')}
                holoScale={holoScale}
                onScaleChange={setHoloScale}
                onGripPointerDown={handleHoloPointerDownAnywhere}
                onGripPointerMove={handleHoloGripMove}
                onGripPointerUp={handleHoloGripUp}
                remoteParams={room.state.role === 'teacher' ? room.state.params : undefined}
                onParamChange={(k, v) => {
                  if (room.state.role === 'teacher') room.send({ type: 'SLIDER', key: k, value: v });
                }}
                onClose={() => setActiveBlueprint(null)}
                isSplitView={isSplitView}
                onToggleSplitView={() => setIsSplitView(!isSplitView)}
              />

              {/* Smooth Touch & Stylus Corner Resize Handle */}
              <div
                data-testid="holo-touch-resize-handle"
                onPointerDown={handleHoloResizeHandleDown}
                onPointerMove={handleHoloGripMove}
                onPointerUp={handleHoloGripUp}
                onPointerCancel={handleHoloGripUp}
                className="absolute -bottom-2.5 -right-2.5 w-7 h-7 rounded-full bg-blue-600/90 hover:bg-blue-600 text-white flex items-center justify-center cursor-nwse-resize shadow-md backdrop-blur border border-white/60 active:scale-125 transition-transform z-30 touch-none select-none"
                title="Dùng ngón tay hoặc bút kéo để phóng to / thu nhỏ mô phỏng mượt mà"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </div>
            </div>
          )}
        </div>

        {/* 450ms AI Semantic Compiling Skeleton Shimmer Card */}
        {isCompilingShimmer && (
          <div
            data-testid="ai-semantic-compiling-shimmer"
            className={`flex flex-col rounded-2xl border border-blue-200 bg-white shadow-xl animate-in fade-in transition-all duration-150 max-h-[calc(100vh-140px)] overflow-y-auto ${
              isSplitView ? 'w-full lg:w-1/2' : 'w-full lg:w-[48%]'
            }`}
          >
            <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-2.5 bg-blue-50/95 backdrop-blur-sm border-b border-blue-100">
              <span className="text-xs font-mono font-semibold text-blue-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                <span>AI Semantic Compiling (450ms)...</span>
              </span>
              <span className="text-[10px] font-mono text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md font-semibold">
                60FPS Studio Dock
              </span>
            </div>
            <div className="p-6 flex flex-col gap-4 bg-[#FCFBF9]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100/80 border border-blue-200 flex items-center justify-center text-blue-600 animate-pulse shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-stone-900 font-sans">
                    Biên dịch Nét viết sang Mô hình 60FPS
                  </div>
                  <div className="text-[11px] font-mono text-stone-500 mt-0.5">
                    {compilingScene?.title || 'Đang trích xuất cấu trúc và giải tích...'}
                  </div>
                </div>
              </div>

              {/* Glowing Shimmer Progress Bar */}
              <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden relative">
                <div className="bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 h-full w-full animate-pulse" />
              </div>

              {/* Shimmer Placeholder Metrics */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-3 bg-white rounded-xl border border-[#E6E4DD] flex flex-col gap-1">
                  <span className="text-[10px] font-mono uppercase text-stone-400">Động học / Không gian</span>
                  <div className="h-4 bg-stone-100 rounded animate-pulse w-3/4" />
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#E6E4DD] flex flex-col gap-1">
                  <span className="text-[10px] font-mono uppercase text-stone-400">Giải tích / KaTeX</span>
                  <div className="h-4 bg-stone-100 rounded animate-pulse w-2/3" />
                </div>
              </div>

              {/* Token Badges */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E6E4DD]">
                <span className="px-2.5 py-1 rounded-lg bg-white border border-[#E6E4DD] text-[11px] font-mono text-stone-700 flex items-center gap-1.5 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  KaTeX Tokenized
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white border border-[#E6E4DD] text-[11px] font-mono text-stone-700 flex items-center gap-1.5 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Dual-View Ready
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white border border-[#E6E4DD] text-[11px] font-mono text-stone-700 flex items-center gap-1.5 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Socratic Cue Armed
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Side-by-Side Simulation Blueprint */}
        {activeBlueprint && !isCompilingShimmer && displayMode === 'DOCK' && (
          <div
            data-testid="active-simulation-modal"
            className={`flex flex-col rounded-2xl border border-[#E6E4DD] bg-white shadow-xl animate-in fade-in transition-all duration-200 max-h-[calc(100vh-140px)] overflow-y-auto ${
              isSplitView ? 'w-full lg:w-1/2' : 'w-full lg:w-[48%]'
            }`}
          >
            {/* Header bar with dedicated Close / Hide Visualize Button */}
            <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-2 bg-[#FCFBF9]/95 backdrop-blur-sm border-b border-[#E6E4DD]">
              <span className="text-xs font-mono font-medium text-stone-700 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                <span>Mô phỏng trực quan ({isSplitView ? 'Nửa bảng phải' : 'Bên cạnh'})</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  data-testid="dock-switch-holo-btn"
                  onClick={() => setDisplayMode('HOLOGRAM')}
                  className="px-2 py-0.5 rounded-md bg-white hover:bg-cyan-50 border border-cyan-300 text-cyan-800 text-xs font-mono shadow-xs transition cursor-pointer flex items-center gap-1"
                  title="Chuyển sang chế độ nổi trực tiếp trên bảng (Hologram không nền)"
                >
                  🪄 Nổi trên bảng
                </button>
                <button
                  type="button"
                  onClick={() => setIsSplitView(!isSplitView)}
                  className="px-2 py-0.5 rounded-md bg-white hover:bg-stone-50 border border-[#DCD9D0] text-stone-700 text-xs font-mono shadow-xs transition cursor-pointer"
                  title="Chuyển đổi tỷ lệ nửa bảng"
                >
                  {isSplitView ? '50:50' : 'Tự do'}
                </button>
                <button
                  data-testid="close-visualize-btn"
                  onClick={() => setActiveBlueprint(null)}
                  className="px-2 py-0.5 rounded-md bg-white hover:bg-stone-50 border border-[#DCD9D0] text-stone-600 hover:text-stone-900 text-xs font-medium shadow-xs transition cursor-pointer"
                  title="Tắt visualize để viết bảng toàn màn hình"
                >
                  ✕ Đóng
                </button>
              </div>
            </div>

            <div className="p-2.5 bg-[#F8F7F4]">
              <SimulationWidget
                key={`${activeBlueprint.templateId}|${activeBlueprint.recognizedLatex}|${(activeBlueprint.expressions || []).join('|')}`}
                blueprint={activeBlueprint}
                displayMode="DOCK"
                onToggleDisplayMode={() => setDisplayMode('HOLOGRAM')}
                remoteParams={room.state.role === 'teacher' ? room.state.params : undefined}
                onParamChange={(k, v) => {
                  if (room.state.role === 'teacher') room.send({ type: 'SLIDER', key: k, value: v });
                }}
                onClose={() => setActiveBlueprint(null)}
                isSplitView={isSplitView}
                onToggleSplitView={() => setIsSplitView(!isSplitView)}
              />
            </div>
          </div>
        )}
      </div>

      {/* THANH TÁC VỤ BẢNG THÔNG MINH + NÚT AI NỔI */}
      <SmartboardDock
        tool={tool}
        onTool={(t) => {
          setTool(t);
          if (t !== 'LASSO') setSelectedStrokes([]);
        }}
        selectedShape={selectedShape}
        onShape={(sh) => {
          setTool('SHAPE');
          setSelectedShape(sh);
          setSelectedStrokes([]);
        }}
        strokeColor={strokeColor}
        onColor={setStrokeColor}
        strokeWidth={strokeWidth}
        onWidth={setStrokeWidth}
        palette={PALETTE}
        widths={STROKE_WIDTHS}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        gridPattern={gridPattern}
        onCycleGrid={() => setGridPattern(gridPattern === 'DOTS' ? 'GRID' : gridPattern === 'GRID' ? 'BLANK' : 'DOTS')}
        onClear={handleClear}
        onExport={handleExportBoard}
        isSplitView={isSplitView}
        onToggleSplit={() => setIsSplitView((v) => !v)}
        onOpenQr={handleOpenQrModal}
        isRecorderOpen={isStudioRecorderOpen}
        onToggleRecorder={() => setIsStudioRecorderOpen((o) => !o)}
        customSlotCount={Object.values(hasCustomSlots).filter(Boolean).length}
        isGeometryLiveMode={isGeometryLiveMode}
        onToggleGeometryLiveMode={() => setIsGeometryLiveMode((o) => !o)}
        scenes={AUTO_INK_SCENES.map((sc, i) => ({ id: sc.id, shortLabel: sc.shortLabel, hotkey: i + 1, active: activeAutoScene === sc.id, custom: !!hasCustomSlots[sc.id] }))}
        onScene={triggerAutoInk}
        busyLabel={isAutoInking ? 'Đang viết thư pháp…' : isCompilingShimmer ? 'AI đang biên dịch…' : null}
        onOpenClassroom={() => setIsClassroomOpen(true)}
        classroomStudents={room.state.role === 'teacher' && room.state.roomId ? room.state.studentCount : null}
      />
      <BoardViewControls
        zoom={view.k}
        onZoomIn={() => zoomStep(1.25)}
        onZoomOut={() => zoomStep(0.8)}
        onFit={fitView}
        isFullscreen={isFullscreen}
        onFullscreen={toggleFullscreen}
        page={pageIdx}
        pageCount={pages.length}
        onPrevPage={() => goPage(pageIdx - 1)}
        onNextPage={() => goPage(pageIdx + 1)}
        onAddPage={addPage}
        onDeletePage={deletePage}
      />
      <AiFab
        selectionCount={selectedStrokes.length}
        busy={isLoading}
        listening={isVoiceListening}
        onConvert={() => openConvert('VISUAL')}
        onGrade={() => openConvert('GRADE')}
        subjectLock={subjectLock}
        onCycleSubject={() => {
          const subjects: (Subject | null)[] = [null, 'MATH', 'PHYSICS', 'CHEMISTRY', 'BIOLOGY'];
          const curIdx = subjects.indexOf(subjectLock);
          const nextIdx = (curIdx + 1) % subjects.length;
          setSubjectLock(subjects[nextIdx]);
        }}
        detectedIntent={detectedLassoIntent?.intent ?? null}
        onVisualize={() => {
          if (selectedStrokes.length > 0) handleVisualize();
          else {
            setTool('LASSO');
            flashError('Hãy kéo khung chọn quanh nét viết hoặc hình vẽ cần trực quan hóa, rồi chạm lại nút này.');
          }
        }}
        onLasso={() => setTool('LASSO')}
        onVoice={handleVoiceDictation}
        onAskQa={() => setIsVoiceQaOpen(true)}
        geo={geoPanel?.mode === 'edit' && geoStroke ? geoCtl : null}
        onGeoNew={() => setGeoPanel({ mode: 'new' })}
        openAtPath={hubOpenAt}
        anchor={(() => {
          if (selectedStrokes.length === 0 || !canvasRef.current) return null;
          const bb = bboxOfStrokes(selectedStrokes);
          const r = canvasRef.current.getBoundingClientRect();
          return { x: r.left + (bb.x1 / 1200) * r.width + 46, y: r.top + (bb.y0 / 675) * r.height + 20 };
        })()}
        panel={
          selectedStrokes.length > 0 && !convertCtx
            ? (() => {
                const src = sourceStrokes(selectedStrokes);
                const solidSk = src.length >= 4 ? detectSolidFromStrokes(src) : null;
                const planeSk = !solidSk && src.length >= 1 && src.length <= 4 ? detectPlaneShapeFromStrokes(src) : null;
                const geoTitle =
                  solidSk && solidSk.confidence >= 0.7 ? SOLID_TITLES[solidSk.kind] : planeSk && planeSk.confidence >= 0.78 ? planeSk.title : null;
                const isGrade = detectedLassoIntent?.intent === 'GRADE';
                const chip = 'px-2 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer border';
                return (
                  <div data-testid="lasso-action-bar" className="flex flex-col gap-2 p-2.5">
                    {/* Đầu thẻ: ảnh nét viết, trạng thái đọc, ý định tự nhận, đóng */}
                    <div className="flex items-center gap-2">
                      {thumbnailUrl ? (
                        <img src={thumbnailUrl} alt="OCR Preview" data-testid="ocr-debug-thumbnail" className="w-11 h-8 object-contain rounded-lg border border-[#E6E4DD] bg-[#FCFBF9]" />
                      ) : (
                        <div className="w-11 h-8 flex items-center justify-center rounded-lg border border-dashed border-[#E6E4DD] text-[9px] text-stone-400 font-mono">Lasso</div>
                      )}
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-xs font-semibold text-stone-900 leading-tight">{selectedStrokes.length} nét</span>
                        <span className="text-[10px] text-stone-500 font-mono leading-tight truncate">
                          {isAiVisionScanning ? (
                            <span className="text-violet-700 font-medium inline-flex items-center gap-1 animate-pulse">
                              <Loader2 className="w-2.5 h-2.5 animate-spin" /> Đang đọc chữ…
                            </span>
                          ) : aiVisionResult ? (
                            <span className="text-violet-700 font-medium">AI đọc {Math.round(aiVisionResult.confidence * 100)}%</span>
                          ) : instantResult ? (
                            <span className="text-emerald-700 font-medium">Đọc nhanh {Math.round(instantResult.confidence * 100)}%</span>
                          ) : (
                            'Đã chọn'
                          )}
                        </span>
                      </div>
                      {detectedLassoIntent && (
                        <div
                          data-testid="detected-intent-badge"
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                            isGrade ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-blue-50 text-blue-800 border-blue-300'
                          }`}
                          title={detectedLassoIntent.reason}
                        >
                          {isGrade ? 'Chấm bài' : 'Công thức STEM'} {Math.round(detectedLassoIntent.confidence * 100)}%
                        </div>
                      )}
                      <button
                        type="button"
                        data-testid="sel-btn-deselect"
                        onClick={() => {
                          setSelectedStrokes([]);
                          setLassoLoop([]);
                          setFormulaInput('');
                        }}
                        className="w-6 h-6 rounded-full hover:bg-stone-100 text-stone-500 hover:text-stone-900 flex items-center justify-center cursor-pointer shrink-0"
                        title="Bỏ chọn vùng"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Ô công thức / tên mô phỏng, xem trước KaTeX */}
                    <div className="relative">
                      {formulaInput.trim().length > 0 && (
                        <div data-testid="live-teacher-formula-preview" className="mb-1.5 px-2.5 py-1 rounded-xl bg-blue-50/70 border border-blue-100 text-xs overflow-x-auto text-stone-900 font-semibold">
                          <FormulaBlock latex={formulaInput} />
                        </div>
                      )}
                      <input
                        type="text"
                        data-testid="lasso-formula-input"
                        value={formulaInput}
                        onChange={(e) => {
                          formulaTouchedRef.current = true;
                          setFormulaInput(e.target.value);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleVisualize();
                        }}
                        placeholder={isAiVisionScanning ? 'AI đang đọc chữ…' : 'Công thức hoặc tên mô phỏng…'}
                        className="w-full px-3 py-2 rounded-xl bg-[#F8F7F4] border border-[#E6E4DD] text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-blue-500 font-mono transition"
                      />
                    </div>

                    {/* Hành động chính */}
                    <button
                      data-testid="btn-visualize"
                      onClick={() => handleVisualize()}
                      disabled={isLoading}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold transition cursor-pointer disabled:opacity-50 ${
                        isGrade ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                      }`}
                      title="Dựng mô phỏng trực quan"
                    >
                      {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      <span>{isLoading ? 'Đang dựng…' : 'Trực quan hóa'}</span>
                    </button>
                    {geoTitle && (
                      <button
                        data-testid="sel-btn-geo-inplace"
                        onClick={() => handleVisualize()}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition cursor-pointer"
                        title="Biến nét vẽ thành hình sạch ngay tại chỗ trên bảng"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>{geoTitle} (hình tại chỗ)</span>
                      </button>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" data-testid="btn-convert-ink" onClick={() => openConvert('VISUAL')} className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer border bg-violet-50 hover:bg-violet-100 border-violet-200 text-violet-700" title="Chuyển chữ viết tay thành công thức chuẩn">
                        <Wand2 className="w-3.5 h-3.5" /> Chuyển công thức
                      </button>
                      <button
                        type="button"
                        data-testid="btn-grade-ink"
                        onClick={() => openConvert('GRADE')}
                        className={`flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer border ${
                          isGrade ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800'
                        }`}
                        title="Chấm bài giải của học sinh trên bảng"
                      >
                        <GraduationCap className="w-3.5 h-3.5" /> Chấm bài
                      </button>
                    </div>

                    {/* Môn học + công cụ nhanh */}
                    <div className="flex items-center gap-1 flex-wrap" data-testid="subject-lock">
                      <button data-testid="subject-auto" onClick={() => setSubjectLock(null)} className={`${chip} ${subjectLock === null ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-[#DCD9D0] hover:bg-stone-50'}`}>
                        Tự động
                      </button>
                      {([['MATH', '#2563EB'], ['PHYSICS', '#7C3AED'], ['CHEMISTRY', '#D97706'], ['BIOLOGY', '#059669']] as [Subject, string][]).map(([k, c]) => (
                        <button
                          key={k}
                          data-testid={`subject-${k.toLowerCase()}`}
                          onClick={() => setSubjectLock(subjectLock === k ? null : k)}
                          className={chip}
                          style={subjectLock === k ? { background: c, color: '#fff', borderColor: c } : { color: c, borderColor: `${c}55`, background: `${c}0c` }}
                        >
                          {SUBJECT_LABEL[k]}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 border-t border-[#EFECE6] pt-2">
                      <button
                        type="button"
                        data-testid="voice-blueprint-mic-btn"
                        onClick={handleVoiceDictation}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium cursor-pointer ${isVoiceListening ? 'bg-rose-50 text-rose-700 animate-pulse' : 'text-stone-600 hover:bg-stone-100'}`}
                        title="Đọc công thức bằng giọng nói"
                      >
                        {isVoiceListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />} Nói
                      </button>
                      <button data-testid="sel-btn-duplicate" onClick={duplicateSelection} className="px-2 py-1 rounded-lg text-[11px] font-medium text-stone-600 hover:bg-stone-100 cursor-pointer" title="Nhân đôi vùng chọn (Ctrl+D)">
                        Nhân đôi
                      </button>
                      <button data-testid="sel-btn-delete" onClick={handleDeleteSelection} className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-stone-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer" title="Xóa vùng chọn (Delete)">
                        <Trash2 className="w-3.5 h-3.5" /> Xóa
                      </button>
                    </div>
                  </div>
                );
              })()
            : null
        }
      />
      <VoiceAiQaCard
        isOpen={isVoiceQaOpen}
        initialQuery={voiceQaQuery}
        isListening={isVoiceListening}
        onStartVoice={handleVoiceDictation}
        onClose={() => setIsVoiceQaOpen(false)}
        onSpawnBlueprint={(bp) => {
          setActiveBlueprint(bp);
          setIsVoiceQaOpen(false);
        }}
      />
      {isClassroomOpen && <ClassroomPanel room={room} templateId={activeBlueprint?.templateId ?? null} onClose={() => setIsClassroomOpen(false)} />}

      {/* 1-Tap QR Smart Notes Modal */}
      {isQrModalOpen && (
        <div
          data-testid="smart-notes-qr-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-white border border-[#E6E4DD] rounded-2xl p-5 shadow-2xl flex flex-col gap-3.5 text-stone-900 relative">
            <div className="flex items-center justify-between border-b border-[#E6E4DD] pb-2.5">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-600" />
                <h3 className="font-semibold text-sm text-stone-900 tracking-tight">Đóng gói Smart Notes & QR</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="p-1 rounded-md bg-[#F2F0EA] hover:bg-[#EAE7DF] text-stone-600 hover:text-stone-900 border border-[#E6E4DD]"
              >
                ✕
              </button>
            </div>

            {/* QR Code Graphic (SVG) */}
            <div className="flex flex-col items-center justify-center p-3.5 bg-white rounded-xl border border-[#E6E4DD] shadow-xs">
              <svg
                width="140"
                height="140"
                viewBox="0 0 100 100"
                className="w-36 h-36"
              >
                <rect width="100" height="100" fill="#ffffff" />
                <rect x="5" y="5" width="26" height="26" fill="#000000" />
                <rect x="9" y="9" width="18" height="18" fill="#ffffff" />
                <rect x="13" y="13" width="10" height="10" fill="#000000" />

                <rect x="69" y="5" width="26" height="26" fill="#000000" />
                <rect x="73" y="9" width="18" height="18" fill="#ffffff" />
                <rect x="77" y="13" width="10" height="10" fill="#000000" />

                <rect x="5" y="69" width="26" height="26" fill="#000000" />
                <rect x="9" y="73" width="18" height="18" fill="#ffffff" />
                <rect x="13" y="77" width="10" height="10" fill="#000000" />

                <rect x="36" y="8" width="8" height="8" fill="#000000" />
                <rect x="48" y="12" width="6" height="10" fill="#000000" />
                <rect x="58" y="6" width="6" height="8" fill="#000000" />

                <rect x="10" y="36" width="8" height="6" fill="#000000" />
                <rect x="22" y="44" width="8" height="8" fill="#000000" />
                <rect x="36" y="36" width="14" height="14" fill="#000000" />
                <rect x="56" y="40" width="8" height="8" fill="#000000" />
                <rect x="70" y="36" width="12" height="6" fill="#000000" />
                <rect x="86" y="44" width="8" height="10" fill="#000000" />

                <rect x="38" y="58" width="10" height="8" fill="#000000" />
                <rect x="54" y="54" width="8" height="12" fill="#000000" />
                <rect x="68" y="58" width="14" height="8" fill="#000000" />

                <rect x="36" y="74" width="8" height="14" fill="#000000" />
                <rect x="48" y="70" width="12" height="8" fill="#000000" />
                <rect x="66" y="74" width="8" height="14" fill="#000000" />
                <rect x="80" y="70" width="14" height="8" fill="#000000" />
              </svg>
              <span className="text-[10px] font-mono font-medium text-stone-800 mt-1.5">
                socratic.edu.vn/recap/12A1-09
              </span>
            </div>

            {/* Lesson Recap Info */}
            <div className="bg-[#F8F7F4] p-3 rounded-xl border border-[#E6E4DD] text-xs flex flex-col gap-1.5">
              <div className="flex justify-between text-stone-600">
                <span>Lớp:</span>
                <span className="text-stone-900 font-mono font-medium">12A1 • Tiết 3 KHTN</span>
              </div>
              <div className="flex justify-between items-center text-stone-600">
                <span>Nội dung:</span>
                <span className="text-stone-900 font-medium">
                  {activeBlueprint?.recognizedLatex ? (
                    <MathView latex={activeBlueprint.recognizedLatex} displayMode={false} />
                  ) : (
                    'Đồ thị & Dao động điều hòa'
                  )}
                </span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Mô phỏng 60FPS:</span>
                <span className="text-emerald-700 font-mono font-medium">Đã đóng gói tương tác</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Nhật ký bài giảng (qua các lần xóa bảng):</span>
                <span className="text-blue-700 font-mono font-medium" data-testid="recap-scenes-count">
                  {Math.max(1, recordedScenes.length + (strokes.length > 0 ? 1 : 0))} phân cảnh
                </span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Lộ trình tự học tối nay:</span>
                <span className="text-purple-700 font-mono font-medium">
                  Socratic AI Tutor phân hóa (Chuẩn & Chuyên)
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator?.clipboard?.writeText('https://socratic.edu.vn/recap/12A1-09');
                  setQrCopied(true);
                  setTimeout(() => setQrCopied(false), 2000);
                }}
                className="flex-1 py-2 rounded-xl bg-[#F2F0EA] hover:bg-[#EAE7DF] border border-[#E6E4DD] text-xs font-medium text-stone-700 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                {qrCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{qrCopied ? 'Đã sao chép link' : 'Sao chép link'}</span>
              </button>

              <button
                type="button"
                data-testid="btn-preview-student-view"
                onClick={() => {
                  setIsQrModalOpen(false);
                  if (typeof window !== 'undefined') {
                    window.open('http://localhost:3002', '_blank');
                  }
                }}
                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer shadow-sm"
              >
                Mở góc nhìn HS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OCR Review & Verification Modal */}
      <OcrReviewModal
        isOpen={isOcrReviewOpen}
        thumbnailUrl={reviewThumbnailUrl}
        recognizedLatex={reviewFormula}
        confidence={reviewConfidence}
        alternatives={reviewAlternatives}
        onConfirm={handleConfirmReview}
        onCancel={handleCancelReview}
      />
    </div>
  );
};

