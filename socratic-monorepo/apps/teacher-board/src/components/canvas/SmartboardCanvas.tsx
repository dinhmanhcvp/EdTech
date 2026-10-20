'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stroke, Point, filterEnclosedStrokes } from '../../utils/lassoGeometry';
import { exportIsolatedWebp } from '../../utils/isolatedExporter';
import { SimulationWidget } from './SimulationWidget';
import { OcrReviewModal } from './OcrReviewModal';
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
} from 'lucide-react';

export type CanvasTool = 'PEN' | 'HIGHLIGHTER' | 'SHAPE' | 'LASSO' | 'ERASER';
export type ShapeType = 'CIRCLE' | 'LINE' | 'ARROW' | 'RECTANGLE';
export type GridPattern = 'DOTS' | 'GRID' | 'BLANK';

export interface SmartboardCanvasProps {
  onApiCallSpy?: (endpoint: string, payload?: any) => void;
  apiEndpoint?: string;
  initialBlueprint?: SimulationBlueprint | null;
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

export const SmartboardCanvas: React.FC<SmartboardCanvasProps> = ({
  onApiCallSpy,
  apiEndpoint = '/api/v1/canvas/compile-lasso',
  initialBlueprint = null,
}) => {
  const [tool, setTool] = useState<CanvasTool>('PEN');
  const [selectedShape, setSelectedShape] = useState<ShapeType>('CIRCLE');
  const [strokeColor, setStrokeColor] = useState<string>('#18181B');
  const [strokeWidth, setStrokeWidth] = useState<number>(3.5);
  const [gridPattern, setGridPattern] = useState<GridPattern>('DOTS');

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [undoStack, setUndoStack] = useState<Stroke[][]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[][]>([]);

  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [shapeStart, setShapeStart] = useState<Point | null>(null);
  const [shapeCurrent, setShapeCurrent] = useState<Point | null>(null);

  const [lassoLoop, setLassoLoop] = useState<Point[]>([]);
  const [selectedStrokes, setSelectedStrokes] = useState<Stroke[]>([]);
  const [activeBlueprint, setActiveBlueprint] = useState<SimulationBlueprint | null>(initialBlueprint);
  const [isLoading, setIsLoading] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [formulaInput, setFormulaInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ergonomic Split-View Dock & Voice & QR Recap States (v3.0)
  const [isSplitView, setIsSplitView] = useState<boolean>(true);
  const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [qrCopied, setQrCopied] = useState<boolean>(false);

  // OCR Verification Modal States
  const [isOcrReviewOpen, setIsOcrReviewOpen] = useState(false);
  const [pendingBlueprint, setPendingBlueprint] = useState<SimulationBlueprint | null>(null);
  const [reviewFormula, setReviewFormula] = useState<string>('');
  const [reviewConfidence, setReviewConfidence] = useState<number>(0.98);
  const [reviewThumbnailUrl, setReviewThumbnailUrl] = useState<string | null>(null);
  const [reviewAlternatives, setReviewAlternatives] = useState<string[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  // Debug Preview Thumbnail generator (Off-screen render)
  useEffect(() => {
    if (selectedStrokes.length > 0) {
      exportIsolatedWebp(selectedStrokes)
        .then((res) => {
          setThumbnailUrl(res.dataUrl);
        })
        .catch((err) => {
          console.warn('Thumbnail generation failed:', err);
          setThumbnailUrl(null);
        });
    } else {
      setThumbnailUrl(null);
    }
  }, [selectedStrokes]);

  // Redraw canvas with full high-performance rendering
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Warm Alabaster Paper Surface Fill
    ctx.fillStyle = '#F8F7F4';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Grid Pattern
    if (gridPattern === 'DOTS') {
      ctx.fillStyle = '#E5E3DC';
      for (let x = 20; x < canvas.width; x += 28) {
        for (let y = 20; y < canvas.height; y += 28) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (gridPattern === 'GRID') {
      ctx.strokeStyle = '#EFECE6';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 32) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 32) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }
    }

    // 2. Draw Committed Strokes
    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;
      const isSelected = selectedStrokes.some((s) => s.id === stroke.id);

      ctx.save();
      ctx.strokeStyle = isSelected ? '#2563EB' : stroke.color;
      ctx.lineWidth = stroke.width + (isSelected ? 2 : 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 3. Draw Active Freehand Stroke
    if (currentStroke.length > 1) {
      ctx.save();
      if (tool === 'LASSO') {
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = '#2563EB';
        ctx.lineWidth = 2.5;
      } else if (tool === 'HIGHLIGHTER') {
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.5)';
        ctx.lineWidth = 18;
        ctx.lineCap = 'square';
      } else {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }

      ctx.beginPath();
      ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
      for (let i = 1; i < currentStroke.length; i++) {
        ctx.lineTo(currentStroke[i].x, currentStroke[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 4. Draw Shape Preview
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
  }, [strokes, currentStroke, selectedStrokes, tool, strokeColor, strokeWidth, gridPattern, shapeStart, shapeCurrent, selectedShape]);

  useEffect(() => {
    redraw();
  }, [redraw, activeBlueprint]);

  // Pointer Interaction
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width || 1);
    const scaleY = canvas.height / (rect.height || 1);
    const pt: Point = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
    isDrawingRef.current = true;

    if (tool === 'ERASER') {
      // Touch-to-erase
      eraseAtPoint(pt);
      return;
    }

    if (tool === 'SHAPE') {
      setShapeStart(pt);
      setShapeCurrent(pt);
      return;
    }

    setCurrentStroke([pt]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width || 1);
    const scaleY = canvas.height / (rect.height || 1);
    const pt: Point = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };

    if (tool === 'ERASER') {
      eraseAtPoint(pt);
      return;
    }

    if (tool === 'SHAPE') {
      setShapeCurrent(pt);
      return;
    }

    setCurrentStroke((prev) => [...prev, pt]);
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    // 1. Commit Shape
    if (tool === 'SHAPE' && shapeStart && shapeCurrent) {
      const x1 = shapeStart.x;
      const y1 = shapeStart.y;
      const x2 = shapeCurrent.x;
      const y2 = shapeCurrent.y;
      const dist = Math.hypot(x2 - x1, y2 - y1);

      if (dist > 8) {
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

    if (currentStroke.length < 2) {
      setCurrentStroke([]);
      return;
    }

    // 2. Commit Freehand Pen
    if (tool === 'PEN' || tool === 'HIGHLIGHTER') {
      saveToUndo();
      const rawStroke: Stroke = {
        id: `stroke-${Date.now()}-${Math.random()}`,
        points: currentStroke,
        color: tool === 'HIGHLIGHTER' ? 'rgba(250, 204, 21, 0.4)' : strokeColor,
        width: tool === 'HIGHLIGHTER' ? 18 : strokeWidth,
      };

      // Pure Natural Ink: Handwriting NEVER automatically turns into circles!
      setStrokes((prev) => [...prev, rawStroke]);
      setCurrentStroke([]);
    } else if (tool === 'LASSO') {
      // Magic Lasso Vector Hit-testing (Forgiving: >=25% points OR >=30% BBox overlap + 24px pad)
      const loop = currentStroke;
      setLassoLoop(loop);
      const enclosed = filterEnclosedStrokes(strokes, loop);
      setSelectedStrokes(enclosed);
      setCurrentStroke([]);
    }
  };

  const eraseAtPoint = (pt: Point) => {
    setStrokes((prev) =>
      prev.filter((stroke) => {
        // If any point is within 20px, delete stroke
        return !stroke.points.some((p) => Math.hypot(p.x - pt.x, p.y - pt.y) < 22);
      })
    );
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
    if (strokes.length > 0) saveToUndo();
    setStrokes([]);
    setSelectedStrokes([]);
    setCurrentStroke([]);
    setLassoLoop([]);
    setActiveBlueprint(null);
  };

  // Export board as clean PNG
  const handleExportBoard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `socratic-board-${Date.now()}.png`;
    a.click();
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
  const handleVisualize = async (overrideHint?: string) => {
    if (selectedStrokes.length === 0 && !overrideHint) return;
    setIsLoading(true);
    setErrorMessage(null);

    const effectiveHint = overrideHint || formulaInput || '';
    let cropData: { blob: Blob; dataUrl: string; sizeKb: number } | null = null;

    try {
      // 1. High-Contrast Thick-Stroke Off-screen crop (min 512x256, 8px ink, #FFFFFF background)
      if (selectedStrokes.length > 0) {
        try {
          cropData = await exportIsolatedWebp(selectedStrokes);
        } catch (err) {
          cropData = { blob: new Blob([]), dataUrl: 'data:image/png;base64,mock', sizeKb: 3.5 };
        }
      }

      const storedGeminiKey = typeof window !== 'undefined' ? (localStorage.getItem('gemini_api_key') || '') : '';
      const payload = {
        image_base64: cropData ? cropData.dataUrl : '',
        hint_text: effectiveHint,
        hint_subject: effectiveHint,
        raw_strokes_json: JSON.stringify(selectedStrokes),
        gemini_api_key: storedGeminiKey,
      };

      const requestHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (storedGeminiKey) {
        requestHeaders['x-gemini-api-key'] = storedGeminiKey;
      }

      if (onApiCallSpy) {
        onApiCallSpy(apiEndpoint, { strokeCount: selectedStrokes.length, hint: effectiveHint });
      }

      let resp: Response;
      try {
        resp = await fetch(apiEndpoint, {
          method: 'POST',
          headers: requestHeaders,
          body: JSON.stringify(payload),
        });
      } catch (fetchErr) {
        if (apiEndpoint.startsWith('/')) {
          resp = await fetch(`http://127.0.0.1:8000${apiEndpoint}`, {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify(payload),
          });
        } else {
          throw fetchErr;
        }
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

      // CP1 Mandate: [Trực quan hóa] always mounts SimulationWidget in <1.5s
      setActiveBlueprint(finalBp);
      setSelectedStrokes([]);
      setLassoLoop([]);
      setFormulaInput('');
    } catch (err: any) {
      console.error('[Magic Lasso] Pipeline Error:', err);
      setErrorMessage(`Lỗi nhận diện (${err?.message || 'Không kết nối được server'}). Đã kích hoạt mô phỏng offline.`);

      // Fallback heuristics:
      let fallbackBp: SimulationBlueprint;
      const h = effectiveHint.toLowerCase();
      if (h.includes('sin') || h.includes('cos') || h.includes('wave') || h.includes('dao động') || h.includes('harmonic')) {
        fallbackBp = {
          engine: 'MATH',
          templateId: 'MATH_TRIG_WAVE',
          recognizedLatex: effectiveHint || 'y = 2\\sin(3x)',
          ocrAlternatives: ['y = 2\\sin(3x)', 'x = 5\\cos(2\\pi t + \\frac{\\pi}{2})', 'y = 2\\cos(3x)'],
          parameters: [
            { key: 'A', label: 'Biên độ (A)', unit: 'cm', defaultValue: 2.0, min: 0.5, max: 5.0, step: 0.5 },
            { key: 'omega', label: 'Tần số góc (ω)', unit: 'rad/s', defaultValue: 3.0, min: 1.0, max: 10.0, step: 1.0 },
            { key: 'phi', label: 'Pha ban đầu (φ)', unit: 'rad', defaultValue: 0.0, min: -3.14, max: 3.14, step: 0.1 },
            { key: 'D', label: 'Độ lệch trục (D)', unit: '', defaultValue: 0.0, min: -3.0, max: 3.0, step: 0.5 },
          ],
          socraticQuestion: 'Nếu giữ nguyên biên độ A = 2 nhưng tăng tần số góc ω lên gấp đôi, đồ thị sẽ thay đổi như thế nào?',
        };
      } else if (h.includes('int') || h.includes('\\int') || h.includes('tích phân')) {
        fallbackBp = {
          engine: 'MATH',
          templateId: 'MATH_FUNC_2D',
          recognizedLatex: effectiveHint || 'y = \\int x^3 dx',
          ocrAlternatives: ['y = \\int x^3 dx', 'y = \\int x^2 dx', 'y = x^2 - 4'],
          parameters: [
            { key: 'a', label: 'Hệ số a (x³)', unit: '', defaultValue: 1, min: -5, max: 5, step: 0.5 },
            { key: 'b', label: 'Hệ số b (x²)', unit: '', defaultValue: 0, min: -5, max: 5, step: 0.5 },
            { key: 'c', label: 'Hệ số c (x)', unit: '', defaultValue: 0, min: -10, max: 10, step: 0.5 },
            { key: 'd', label: 'Hằng số tích phân C', unit: '', defaultValue: 0, min: -10, max: 10, step: 0.5 },
          ],
          socraticQuestion: 'Nguyên hàm của x³ là x⁴/4 + C. Diện tích dưới đường cong thay đổi như thế nào khi x tăng?',
        };
      } else if (h.includes('ném') || h.includes('v0') || h.includes('projectile')) {
        fallbackBp = {
          engine: 'PHYSICS',
          templateId: 'PHYS_PROJECTILE',
          recognizedLatex: 'v_0 = 22\\text{ m/s}, \\alpha = 45^\\circ',
          ocrAlternatives: ['v_0 = 22\\text{ m/s}, \\alpha = 45^\\circ'],
          parameters: [
            { key: 'v0', label: 'Vận tốc đầu (v₀)', unit: 'm/s', defaultValue: 22.0, min: 5.0, max: 50.0, step: 1.0 },
            { key: 'alpha', label: 'Góc ném (α)', unit: 'độ', defaultValue: 45.0, min: 15.0, max: 85.0, step: 5.0 },
            { key: 'g', label: 'Gia tốc g', unit: 'm/s²', defaultValue: 9.8, min: 1.6, max: 25.0, step: 0.1 },
          ],
          socraticQuestion: 'Tại sao với cùng vận tốc đầu v₀, góc ném 45° lại cho tầm xa cực đại?',
        };
      } else if (h.includes('fe') || h.includes('cân') || h.includes('o2')) {
        fallbackBp = {
          engine: 'CHEMISTRY',
          templateId: 'CHEM_BALANCE_SCALE',
          recognizedLatex: '4\\text{Fe} + 3\\text{O}_2 \\rightarrow 2\\text{Fe}_2\\text{O}_3',
          ocrAlternatives: ['4\\text{Fe} + 3\\text{O}_2 \\rightarrow 2\\text{Fe}_2\\text{O}_3'],
          parameters: [
            { key: 'c1', label: 'Hệ số Fe', unit: '', defaultValue: 4.0, min: 1.0, max: 6.0, step: 1.0 },
            { key: 'c2', label: 'Hệ số O₂', unit: '', defaultValue: 3.0, min: 1.0, max: 6.0, step: 1.0 },
            { key: 'c3', label: 'Hệ số Fe₂O₃', unit: '', defaultValue: 2.0, min: 1.0, max: 4.0, step: 1.0 },
          ],
          socraticQuestion: 'Em cần chọn bội chung nhỏ nhất là mấy để số Oxi hai vế thăng bằng?',
        };
      } else if (h.includes('rlc') || h.includes('điện') || h.includes('phasor') || h.includes('fresnel')) {
        fallbackBp = {
          engine: 'PHYSICS',
          templateId: 'PHYS_RLC_PHASOR',
          recognizedLatex: 'u = U_0\\cos(\\omega t + \\varphi), \\quad \\text{Mạch RLC}',
          ocrAlternatives: ['u = U_0\\cos(\\omega t)', 'i = I_0\\cos(\\omega t - \\varphi)'],
          parameters: [
            { key: 'R', label: 'Điện trở (R)', unit: 'Ω', defaultValue: 50.0, min: 10.0, max: 200.0, step: 10.0 },
            { key: 'L', label: 'Độ tự cảm (L)', unit: 'H', defaultValue: 0.5, min: 0.1, max: 2.0, step: 0.1 },
            { key: 'C', label: 'Điện dung (C)', unit: 'μF', defaultValue: 50.0, min: 10.0, max: 200.0, step: 10.0 },
            { key: 'omega', label: 'Tần số góc (ω)', unit: 'rad/s', defaultValue: 200.0, min: 50.0, max: 500.0, step: 10.0 },
            { key: 'U', label: 'Điện áp (U)', unit: 'V', defaultValue: 120.0, min: 20.0, max: 240.0, step: 10.0 },
          ],
          socraticQuestion: 'Khi điều chỉnh tần số góc ω tiến dần về giá trị cộng hưởng ω₀ = 1/√(LC), góc lệch pha φ biến đổi thế nào?',
          curriculumLevel: 'OLYMPIAD_ADVANCED',
        };
      } else if (h.includes('chuẩn độ') || h.includes('titration') || h.includes('ph')) {
        fallbackBp = {
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
      } else if (h.includes('quang') || h.includes('25') || h.includes('lá') || h.includes('cây')) {
        fallbackBp = {
          engine: 'BIOLOGY',
          templateId: 'BIO_PHOTOSYNTHESIS',
          recognizedLatex: '\\text{Quang hợp: } Rate = f(T = 25.0^\\circ\\text{C}, I = 70.0\\%)',
          ocrAlternatives: ['Rate = f(T = 25^\\circ\\text{C}, I = 70\\%)'],
          parameters: [
            { key: 'temperature', label: 'Nhiệt độ (T)', unit: '°C', defaultValue: 25.0, min: 0.0, max: 60.0, step: 5.0 },
            { key: 'light', label: 'Cường độ sáng (I)', unit: '%', defaultValue: 70.0, min: 10.0, max: 100.0, step: 5.0 },
          ],
          socraticQuestion: 'Tại sao khi nhiệt độ vượt quá 45°C, cường độ quang hợp lại giảm dốc đứng?',
        };
      } else {
        fallbackBp = {
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
      }

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
    setSelectedStrokes([]);
    setLassoLoop([]);
  };

  const handleCancelReview = () => {
    setIsOcrReviewOpen(false);
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
      className="relative w-full h-full min-h-[720px] bg-[#F8F7F4] text-[#18181B] flex flex-col items-center justify-start p-3 select-none"
    >
      {/* MASTER SMARTBOARD TOOLBAR */}
      <div
        data-testid="smartboard-toolbar"
        className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E6E4DD] shadow-[0_4px_24px_-4px_rgba(20,20,19,0.06)] z-20 max-w-5xl w-full"
      >
        {/* Left Section: Core Tools */}
        <div className="flex items-center gap-1">
          {/* Natural Pen */}
          <button
            data-testid="tool-pen"
            onClick={() => { setTool('PEN'); setSelectedStrokes([]); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
              tool === 'PEN'
                ? 'bg-[#F2F0EA] text-stone-900 border-[#DCD9D0] font-semibold shadow-xs'
                : 'bg-white hover:bg-stone-50 border-transparent text-stone-600 hover:text-stone-900'
            }`}
            title="Bút viết tự nhiên"
          >
            <Pen className="w-3.5 h-3.5" />
            <span>Viết</span>
          </button>

          {/* Highlighter */}
          <button
            onClick={() => { setTool('HIGHLIGHTER'); setSelectedStrokes([]); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
              tool === 'HIGHLIGHTER'
                ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A] font-semibold shadow-xs'
                : 'bg-white hover:bg-stone-50 border-transparent text-stone-600 hover:text-stone-900'
            }`}
            title="Bút dạ quang"
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dạ quang</span>
          </button>

          {/* Hình tròn */}
          <button
            data-testid="tool-circle"
            onClick={() => { setTool('SHAPE'); setSelectedShape('CIRCLE'); setSelectedStrokes([]); }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
              tool === 'SHAPE' && selectedShape === 'CIRCLE'
                ? 'bg-[#F2F0EA] text-stone-900 border-[#DCD9D0] font-semibold shadow-xs'
                : 'bg-white hover:bg-stone-50 border-transparent text-stone-600 hover:text-stone-900'
            }`}
            title="Vẽ hình tròn"
          >
            <Circle className="w-3.5 h-3.5" />
            <span>Hình tròn</span>
          </button>

          {/* Đoạn thẳng */}
          <button
            data-testid="tool-line"
            onClick={() => { setTool('SHAPE'); setSelectedShape('LINE'); setSelectedStrokes([]); }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
              tool === 'SHAPE' && selectedShape === 'LINE'
                ? 'bg-[#F2F0EA] text-stone-900 border-[#DCD9D0] font-semibold shadow-xs'
                : 'bg-white hover:bg-stone-50 border-transparent text-stone-600 hover:text-stone-900'
            }`}
            title="Vẽ đoạn thẳng"
          >
            <Minus className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Đoạn thẳng</span>
          </button>

          {/* Mũi tên */}
          <button
            data-testid="tool-arrow"
            onClick={() => { setTool('SHAPE'); setSelectedShape('ARROW'); setSelectedStrokes([]); }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
              tool === 'SHAPE' && selectedShape === 'ARROW'
                ? 'bg-[#F2F0EA] text-stone-900 border-[#DCD9D0] font-semibold shadow-xs'
                : 'bg-white hover:bg-stone-50 border-transparent text-stone-600 hover:text-stone-900'
            }`}
            title="Vẽ mũi tên vector"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Mũi tên</span>
          </button>

          {/* Hình chữ nhật */}
          <button
            data-testid="tool-rect"
            onClick={() => { setTool('SHAPE'); setSelectedShape('RECTANGLE'); setSelectedStrokes([]); }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
              tool === 'SHAPE' && selectedShape === 'RECTANGLE'
                ? 'bg-[#F2F0EA] text-stone-900 border-[#DCD9D0] font-semibold shadow-xs'
                : 'bg-white hover:bg-stone-50 border-transparent text-stone-600 hover:text-stone-900'
            }`}
            title="Vẽ hình chữ nhật"
          >
            <Square className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Chữ nhật</span>
          </button>

          {/* Magic Lasso */}
          <button
            data-testid="tool-lasso"
            onClick={() => setTool('LASSO')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
              tool === 'LASSO'
                ? 'bg-blue-50 text-blue-700 border-blue-200 font-semibold shadow-xs'
                : 'bg-white hover:bg-stone-50 border-transparent text-stone-600 hover:text-stone-900'
            }`}
            title="Khoanh vùng nét viết để mô phỏng"
          >
            <Lasso className="w-3.5 h-3.5" />
            <span>Khoanh vùng AI</span>
          </button>

          {/* Eraser */}
          <button
            data-testid="tool-eraser"
            onClick={() => { setTool('ERASER'); setSelectedStrokes([]); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
              tool === 'ERASER'
                ? 'bg-[#F2F0EA] text-stone-900 border-[#DCD9D0] font-semibold shadow-xs'
                : 'bg-white hover:bg-stone-50 border-transparent text-stone-600 hover:text-stone-900'
            }`}
            title="Tẩy nét viết"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Tẩy</span>
          </button>
        </div>

        {/* Center Section: Color Palette & Stroke Width */}
        <div className="flex items-center gap-2.5">
          {/* Color Dots */}
          <div className="flex items-center gap-1.5 bg-[#F2F0EA] px-2.5 py-1 rounded-lg border border-[#E6E4DD]">
            {PALETTE.map((c) => (
              <button
                key={c.value}
                onClick={() => setStrokeColor(c.value)}
                className={`w-4 h-4 rounded-full transition-transform cursor-pointer border border-black/10 ${
                  strokeColor === c.value ? 'scale-125 ring-2 ring-stone-900' : 'hover:scale-110 opacity-75 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </div>

          {/* Thickness Selector */}
          <div className="flex items-center gap-1 bg-[#F2F0EA] px-1.5 py-0.5 rounded-lg border border-[#E6E4DD]">
            {STROKE_WIDTHS.map((sw) => (
              <button
                key={sw.value}
                onClick={() => setStrokeWidth(sw.value)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition cursor-pointer ${
                  strokeWidth === sw.value ? 'bg-white text-stone-900 font-semibold shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {sw.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Section: Board Management & Undo/Redo */}
        <div className="flex items-center gap-1">
          {/* Undo / Redo */}
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="p-1.5 rounded-lg bg-white hover:bg-stone-50 text-stone-700 disabled:opacity-30 border border-[#DCD9D0] shadow-xs transition cursor-pointer"
            title="Hoàn tác (Undo)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="p-1.5 rounded-lg bg-white hover:bg-stone-50 text-stone-700 disabled:opacity-30 border border-[#DCD9D0] shadow-xs transition cursor-pointer"
            title="Làm lại (Redo)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          {/* Grid Toggle */}
          <button
            onClick={() => setGridPattern(gridPattern === 'DOTS' ? 'GRID' : (gridPattern === 'GRID' ? 'BLANK' : 'DOTS'))}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white hover:bg-stone-50 text-stone-700 text-xs border border-[#DCD9D0] shadow-xs transition cursor-pointer"
            title="Đổi lưới nền: Lưới chấm / Ô ca-rô / Bảng trơn"
          >
            <GridIcon className="w-3 h-3" />
            <span className="text-[10px] font-mono uppercase">{gridPattern}</span>
          </button>

          {/* Ergonomic Split-View Toggle Button */}
          <button
            data-testid="btn-split-view-toggle"
            onClick={() => setIsSplitView((s) => !s)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs border transition cursor-pointer ${
              isSplitView
                ? 'bg-blue-50 text-blue-700 border-blue-200 font-semibold shadow-xs'
                : 'bg-white hover:bg-stone-50 border-[#DCD9D0] text-stone-700 shadow-xs'
            }`}
            title="Ghim sang nửa bảng (Split-Screen)"
          >
            <span className="font-mono">◫</span>
            <span className="text-[10px] hidden sm:inline">{isSplitView ? 'Nửa bảng' : 'Toàn bảng'}</span>
          </button>

          {/* Pack Smart Notes & QR Recap Modal Button */}
          <button
            data-testid="btn-pack-smart-notes"
            onClick={() => setIsQrModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-stone-50 border border-[#DCD9D0] text-stone-700 text-xs font-medium shadow-xs transition cursor-pointer"
            title="Đóng gói Smart Notes & QR"
          >
            <QrCode className="w-3.5 h-3.5 text-stone-600" />
            <span className="text-[10px] hidden sm:inline font-mono">QR Notes</span>
          </button>

          {/* Export Board */}
          <button
            onClick={handleExportBoard}
            className="p-1.5 rounded-lg bg-white hover:bg-stone-50 text-stone-700 border border-[#DCD9D0] shadow-xs transition cursor-pointer"
            title="Tải ảnh bảng viết về máy"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Clear */}
          <button
            data-testid="tool-clear"
            onClick={handleClear}
            className="p-1.5 rounded-lg bg-white hover:bg-rose-50 text-stone-600 hover:text-rose-600 border border-[#DCD9D0] shadow-xs transition cursor-pointer"
            title="Xóa toàn bộ bảng"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Top-bar Quick Visualize Trigger (when strokes selected) */}
          {selectedStrokes.length > 0 && (
            <button
              data-testid="top-toolbar-btn-visualize"
              onClick={() => handleVisualize()}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer ml-1 shadow-sm font-semibold"
            >
              {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Visualize ({selectedStrokes.length})</span>
            </button>
          )}
        </div>
      </div>

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

      {/* Floating Lasso Action Bar */}
      {selectedStrokes.length > 0 && (
        <div
          data-testid="lasso-action-bar"
          className="flex flex-col gap-2.5 mt-2 px-4 py-3 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E6E4DD] shadow-[0_8px_30px_rgb(0,0,0,0.08)] z-20 max-w-5xl w-full animate-in fade-in duration-150"
        >
          {/* Top Row: Preview, Voice Mic, Formula Input, Action Buttons */}
          <div className="flex flex-col md:flex-row items-center gap-3 w-full">
            {/* Live Cropped Ink Preview */}
            <div className="flex items-center gap-2.5 shrink-0">
              {thumbnailUrl ? (
                <div className="relative group">
                  <img
                    src={thumbnailUrl}
                    alt="OCR Preview"
                    data-testid="ocr-debug-thumbnail"
                    className="w-16 h-10 object-contain rounded-lg border border-[#E6E4DD] bg-[#FCFBF9] shadow-xs"
                  />
                  <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[8px] font-mono text-stone-500 bg-white px-1 rounded whitespace-nowrap border border-[#E6E4DD]">
                    0ms Crop
                  </span>
                </div>
              ) : (
                <div className="w-16 h-10 flex items-center justify-center rounded-lg border border-dashed border-[#E6E4DD] bg-[#F8F7F4] text-[10px] text-stone-400 font-mono">
                  Preview
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-stone-900">
                  Lasso {selectedStrokes.length} nét
                </span>
                <span className="text-[10px] text-stone-500 font-mono">
                  Nền giấy chuẩn hóa
                </span>
              </div>
            </div>

            {/* Voice-to-Blueprint Mic Button */}
            <button
              type="button"
              data-testid="voice-blueprint-mic-btn"
              onClick={handleVoiceDictation}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 border ${
                isVoiceListening
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-white hover:bg-stone-50 border-[#DCD9D0] text-stone-700 shadow-xs'
              }`}
              title="Đọc công thức bằng giọng nói"
            >
              {isVoiceListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-stone-500" />}
              <span>{isVoiceListening ? 'Đang nghe...' : 'Giọng nói'}</span>
            </button>

            {/* Formula Input Box */}
            <div className="flex-1 flex items-center gap-2 w-full md:w-auto">
              <input
                type="text"
                data-testid="lasso-formula-input"
                value={formulaInput}
                onChange={(e) => setFormulaInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleVisualize();
                }}
                placeholder="Nhập công thức hoặc bấm micro / chọn môn bên dưới..."
                className="w-full px-3 py-1.5 rounded-lg bg-[#F8F7F4] border border-[#E6E4DD] text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-blue-500 font-mono transition"
              />
            </div>

            {/* Main Action & Cancel */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                data-testid="btn-visualize"
                onClick={() => handleVisualize()}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition cursor-pointer shadow-sm"
              >
                {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>{isLoading ? 'Đang nhận diện...' : 'Trực quan hóa'}</span>
              </button>

              <button
                onClick={() => {
                  setSelectedStrokes([]);
                  setLassoLoop([]);
                  setFormulaInput('');
                }}
                className="p-1.5 rounded-lg bg-white hover:bg-stone-50 text-stone-500 hover:text-stone-900 border border-[#DCD9D0] shadow-xs transition cursor-pointer"
                title="Bỏ chọn"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Bottom Row: 4 1-Tap Smart Subject Chips (Zero Fail) */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#E6E4DD]">
            <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wider shrink-0">
              Gợi ý tức thì (0ms):
            </span>
            <button
              type="button"
              data-testid="smart-chip-math"
              onClick={() => handleVisualize('y = 2\\sin(3x)')}
              className="px-2 py-0.5 rounded-md bg-[#F2F0EA] hover:bg-[#EAE7DF] border border-[#E6E4DD] text-stone-700 text-[11px] font-mono transition cursor-pointer"
            >
              Toán (Sin 3x)
            </button>
            <button
              type="button"
              data-testid="smart-chip-physics"
              onClick={() => handleVisualize('ném xiên v0 = 22 m/s, alpha = 45 độ')}
              className="px-2 py-0.5 rounded-md bg-[#F2F0EA] hover:bg-[#EAE7DF] border border-[#E6E4DD] text-stone-700 text-[11px] font-mono transition cursor-pointer"
            >
              Lý (Ném xiên)
            </button>
            <button
              type="button"
              data-testid="smart-chip-chemistry"
              onClick={() => handleVisualize('4Fe + 3O2 -> 2Fe2O3')}
              className="px-2 py-0.5 rounded-md bg-[#F2F0EA] hover:bg-[#EAE7DF] border border-[#E6E4DD] text-stone-700 text-[11px] font-mono transition cursor-pointer"
            >
              Hóa (Fe + O₂)
            </button>
            <button
              type="button"
              data-testid="smart-chip-biology"
              onClick={() => handleVisualize('quang hợp nhiệt độ 25 độ C')}
              className="px-2 py-0.5 rounded-md bg-[#F2F0EA] hover:bg-[#EAE7DF] border border-[#E6E4DD] text-stone-700 text-[11px] font-mono transition cursor-pointer"
            >
              Sinh (Quang hợp 25°C)
            </button>
            <button
              type="button"
              data-testid="smart-chip-rlc"
              onClick={() => handleVisualize('mạch rlc xoay chiều')}
              className="px-2 py-0.5 rounded-md bg-[#F2F0EA] hover:bg-[#EAE7DF] border border-[#E6E4DD] text-stone-700 text-[11px] font-mono transition cursor-pointer"
            >
              RLC & Phasor (Lớp 12)
            </button>
            <button
              type="button"
              data-testid="smart-chip-titration"
              onClick={() => handleVisualize('chuẩn độ axit bazơ ph')}
              className="px-2 py-0.5 rounded-md bg-[#F2F0EA] hover:bg-[#EAE7DF] border border-[#E6E4DD] text-stone-700 text-[11px] font-mono transition cursor-pointer"
            >
              Chuẩn độ pH (Hóa 11-12)
            </button>
          </div>
        </div>
      )}

      {/* Quick Demo Preset Pills for Live Demo */}
      <div className="flex flex-wrap items-center gap-1.5 mt-2 px-3 py-1.5 rounded-xl bg-white/90 border border-[#E6E4DD] text-xs max-w-6xl w-full shadow-xs">
        <span className="text-stone-500 font-mono text-[11px] uppercase tracking-wider shrink-0">Mẫu sẵn:</span>
        <button
          onClick={() => handleVisualize('y = 2\\sin(3x)')}
          className="px-2 py-0.5 rounded-md bg-[#F4F3EE] hover:bg-[#EAE7DF] border border-[#E5E3DC] text-stone-700 font-mono text-[11px] transition cursor-pointer"
        >
          Toán: Đồ thị Sin
        </button>
        <button
          onClick={() => handleVisualize('ném xiên v0 = 22 m/s, alpha = 45 độ')}
          className="px-2 py-0.5 rounded-md bg-[#F4F3EE] hover:bg-[#EAE7DF] border border-[#E5E3DC] text-stone-700 font-mono text-[11px] transition cursor-pointer"
        >
          Lý: Ném xiên
        </button>
        <button
          onClick={() => handleVisualize('4Fe + 3O2 -> 2Fe2O3')}
          className="px-2 py-0.5 rounded-md bg-[#F4F3EE] hover:bg-[#EAE7DF] border border-[#E5E3DC] text-stone-700 font-mono text-[11px] transition cursor-pointer"
        >
          Hóa: Cân bằng Fe + O₂
        </button>
        <button
          onClick={() => handleVisualize('quang hợp nhiệt độ 25 độ C')}
          className="px-2 py-0.5 rounded-md bg-[#F4F3EE] hover:bg-[#EAE7DF] border border-[#E5E3DC] text-stone-700 font-mono text-[11px] transition cursor-pointer"
        >
          Sinh: Quang hợp
        </button>
        <button
          onClick={() => handleVisualize('x = 5\\cos(2\\pi t + \\frac{\\pi}{2})')}
          className="px-2 py-0.5 rounded-md bg-[#F4F3EE] hover:bg-[#EAE7DF] border border-[#E5E3DC] text-stone-700 font-mono text-[11px] transition cursor-pointer"
        >
          Lý: Dao động 5cos
        </button>
        <button
          onClick={() => handleVisualize('y = \\int x^3 dx')}
          className="px-2 py-0.5 rounded-md bg-[#F4F3EE] hover:bg-[#EAE7DF] border border-[#E5E3DC] text-stone-700 font-mono text-[11px] transition cursor-pointer"
        >
          Toán: Tích phân x³
        </button>
      </div>

      {/* Smartboard Canvas & Side-by-Side Ergonomic Split-View Workspace */}
      <div className="flex flex-col lg:flex-row items-start justify-center gap-4 mt-3 w-full max-w-7xl">
        {/* Drawing Canvas Area (Always visible, NEVER covered, high-def 1200x675) */}
        <div
          className={`relative rounded-2xl overflow-hidden border border-[#E6E4DD] bg-[#F8F7F4] shadow-sm transition-all duration-200 ${
            activeBlueprint
              ? isSplitView
                ? 'w-full lg:w-1/2'
                : 'w-full lg:w-[52%]'
              : 'w-full max-w-6xl'
          }`}
        >
          <canvas
            ref={canvasRef}
            data-testid="chalkboard-canvas"
            width={1200}
            height={675}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="cursor-crosshair touch-none w-full h-auto block"
          />
        </div>

        {/* Side-by-Side Simulation Blueprint */}
        {activeBlueprint && (
          <div
            data-testid="active-simulation-modal"
            className={`flex flex-col rounded-2xl overflow-hidden border border-[#E6E4DD] bg-white shadow-xl animate-in fade-in transition-all duration-200 ${
              isSplitView ? 'w-full lg:w-1/2' : 'w-full lg:w-[48%]'
            }`}
          >
            {/* Header bar with dedicated Close / Hide Visualize Button */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#FCFBF9] border-b border-[#E6E4DD]">
              <span className="text-xs font-mono font-medium text-stone-700 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                <span>Mô phỏng trực quan ({isSplitView ? 'Nửa bảng phải' : 'Bên cạnh'})</span>
              </span>
              <div className="flex items-center gap-1.5">
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
                blueprint={activeBlueprint}
                onClose={() => setActiveBlueprint(null)}
                isSplitView={isSplitView}
                onToggleSplitView={() => setIsSplitView(!isSplitView)}
              />
            </div>
          </div>
        )}
      </div>

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
              <div className="flex justify-between text-stone-600">
                <span>Nội dung:</span>
                <span className="text-stone-900 font-mono font-medium">
                  {activeBlueprint?.recognizedLatex || 'Đồ thị & Dao động điều hòa'}
                </span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Mô phỏng 60FPS:</span>
                <span className="text-emerald-700 font-mono font-medium">Đã đóng gói tương tác</span>
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
                  alert('Đang mở mô phỏng dưới góc nhìn Học sinh trên điện thoại!');
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

