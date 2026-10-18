'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stroke, Point, filterEnclosedStrokes } from '../../utils/lassoGeometry';
import { exportIsolatedWebp } from '../../utils/isolatedExporter';
import { SimulationWidget } from './SimulationWidget';
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
  { name: 'Trắng phấn', value: '#ffffff' },
  { name: 'Xanh Neon', value: '#22d3ee' },
  { name: 'Vàng rực', value: '#facc15' },
  { name: 'Hồng/Đỏ', value: '#f43f5e' },
  { name: 'Xanh lá', value: '#4ade80' },
  { name: 'Tím Pastel', value: '#c084fc' },
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
  const [strokeColor, setStrokeColor] = useState<string>('#ffffff');
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

    // 1. Draw Grid Pattern
    if (gridPattern === 'DOTS') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      for (let x = 20; x < canvas.width; x += 28) {
        for (let y = 20; y < canvas.height; y += 28) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (gridPattern === 'GRID') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
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
      ctx.strokeStyle = isSelected ? '#38bdf8' : stroke.color;
      ctx.lineWidth = stroke.width + (isSelected ? 2 : 0);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Chalk / glowing soft effect
      ctx.shadowColor = stroke.color;
      ctx.shadowBlur = stroke.color.includes('rgba') ? 0 : 3;

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
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
      } else if (tool === 'HIGHLIGHTER') {
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
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

  // On-demand AI Magic Lasso Compiler
  const handleVisualize = async (overrideHint?: string) => {
    if (selectedStrokes.length === 0 && !overrideHint) return;
    setIsLoading(true);
    setErrorMessage(null);

    const effectiveHint = overrideHint || formulaInput || '';

    try {
      // 1. High-Contrast Thick-Stroke Off-screen crop (min 512x256, 8px ink, #FFFFFF background)
      let cropData: { blob: Blob; dataUrl: string; sizeKb: number } | null = null;
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
          resp = await fetch(`http://localhost:8000${apiEndpoint}`, {
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
      setActiveBlueprint(bp);
      setFormulaInput('');
    } catch (err: any) {
      console.error('[Magic Lasso] Pipeline Error:', err);
      setErrorMessage(`Lỗi nhận diện (${err?.message || 'Không kết nối được server'}). Đã kích hoạt mô phỏng offline.`);

      // Fallback heuristics:
      const h = effectiveHint.toLowerCase();
      if (h.includes('sin') || h.includes('cos') || h.includes('wave')) {
        handleQuickFormula('y = 2\\sin(3x)');
      } else if (h.includes('ném') || h.includes('v0') || h.includes('projectile')) {
        setActiveBlueprint({
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
        });
      } else if (h.includes('fe') || h.includes('cân') || h.includes('o2')) {
        setActiveBlueprint({
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
        });
      } else if (h.includes('quang') || h.includes('25') || h.includes('lá') || h.includes('cây')) {
        setActiveBlueprint({
          engine: 'BIOLOGY',
          templateId: 'BIO_PHOTOSYNTHESIS',
          recognizedLatex: '\\text{Quang hợp: } Rate = f(T = 25.0^\\circ\\text{C}, I = 70.0\\%)',
          ocrAlternatives: ['Rate = f(T = 25^\\circ\\text{C}, I = 70\\%)'],
          parameters: [
            { key: 'temperature', label: 'Nhiệt độ (T)', unit: '°C', defaultValue: 25.0, min: 0.0, max: 60.0, step: 5.0 },
            { key: 'light', label: 'Cường độ sáng (I)', unit: '%', defaultValue: 70.0, min: 10.0, max: 100.0, step: 5.0 },
          ],
          socraticQuestion: 'Tại sao khi nhiệt độ vượt quá 45°C, cường độ quang hợp lại giảm dốc đứng?',
        });
      } else {
        setActiveBlueprint({
          engine: 'MATH',
          templateId: 'MATH_FUNC_2D',
          recognizedLatex: 'y = 2x + 1',
          ocrAlternatives: ['y = 2x + 1', 'y = x^2 - 4', 'y = x^3 - 3x', 'y = 2\\sin(3x)'],
          parameters: [
            { key: 'c', label: 'Hệ số góc (k)', unit: '', defaultValue: 2, min: -10, max: 10, step: 0.5 },
            { key: 'd', label: 'Tung độ gốc (d)', unit: '', defaultValue: 1, min: -10, max: 10, step: 0.5 },
            { key: 'x0', label: 'Điểm tiếp điểm (x₀)', unit: '', defaultValue: 1, min: -5, max: 5, step: 0.5 },
          ],
          socraticQuestion: 'Tại sao khi tăng hệ số góc k = 2 lên k = 4, độ dốc của đường thẳng lại tăng lên?',
        });
      }
    } finally {
      setIsLoading(false);
    }
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
      className="relative w-full h-full min-h-[720px] bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-4 select-none"
    >
      {/* MASTER SMARTBOARD TOOLBAR */}
      <div
        data-testid="smartboard-toolbar"
        className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 rounded-3xl bg-slate-900/90 border border-white/15 backdrop-blur-xl shadow-2xl z-20 max-w-5xl w-full"
      >
        {/* Left Section: Core Tools */}
        <div className="flex items-center gap-1.5">
          {/* Natural Pen */}
          <button
            data-testid="tool-pen"
            onClick={() => { setTool('PEN'); setSelectedStrokes([]); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              tool === 'PEN'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/25'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
            title="Bút viết tự nhiên (Không tự nắn hình tròn)"
          >
            <Pen className="w-4 h-4" />
            <span>Bút viết</span>
          </button>

          {/* Highlighter */}
          <button
            onClick={() => { setTool('HIGHLIGHTER'); setSelectedStrokes([]); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              tool === 'HIGHLIGHTER'
                ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/25'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
            title="Bút dạ quang đánh dấu"
          >
            <Highlighter className="w-4 h-4" />
            <span className="hidden sm:inline">Dạ quang</span>
          </button>

          {/* CHỨC NĂNG HÌNH TRÒN (CHỨC NĂNG RIÊNG, KHÔNG TỰ ĐỘNG NẮN CHỮ VIẾT) */}
          <button
            data-testid="tool-circle"
            onClick={() => { setTool('SHAPE'); setSelectedShape('CIRCLE'); setSelectedStrokes([]); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              tool === 'SHAPE' && selectedShape === 'CIRCLE'
                ? 'bg-purple-500 text-slate-950 shadow-lg shadow-purple-500/25 font-bold'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
            title="Chức năng vẽ hình tròn chuẩn xác (Kéo chuột/chạm trên bảng để vẽ)"
          >
            <Circle className="w-4 h-4 text-purple-300" />
            <span>Hình tròn</span>
          </button>

          {/* Đoạn thẳng */}
          <button
            data-testid="tool-line"
            onClick={() => { setTool('SHAPE'); setSelectedShape('LINE'); setSelectedStrokes([]); }}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              tool === 'SHAPE' && selectedShape === 'LINE'
                ? 'bg-purple-500 text-slate-950 shadow-lg shadow-purple-500/25 font-bold'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
            title="Vẽ đoạn thẳng"
          >
            <Minus className="w-4 h-4 text-purple-300" />
            <span className="hidden xl:inline">Đoạn thẳng</span>
          </button>

          {/* Mũi tên */}
          <button
            data-testid="tool-arrow"
            onClick={() => { setTool('SHAPE'); setSelectedShape('ARROW'); setSelectedStrokes([]); }}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              tool === 'SHAPE' && selectedShape === 'ARROW'
                ? 'bg-purple-500 text-slate-950 shadow-lg shadow-purple-500/25 font-bold'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
            title="Vẽ mũi tên vector"
          >
            <ArrowRight className="w-4 h-4 text-purple-300" />
            <span className="hidden xl:inline">Mũi tên</span>
          </button>

          {/* Hình chữ nhật */}
          <button
            data-testid="tool-rect"
            onClick={() => { setTool('SHAPE'); setSelectedShape('RECTANGLE'); setSelectedStrokes([]); }}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              tool === 'SHAPE' && selectedShape === 'RECTANGLE'
                ? 'bg-purple-500 text-slate-950 shadow-lg shadow-purple-500/25 font-bold'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
            title="Vẽ hình chữ nhật"
          >
            <Square className="w-4 h-4 text-purple-300" />
            <span className="hidden xl:inline">Chữ nhật</span>
          </button>

          {/* Magic Lasso */}
          <button
            data-testid="tool-lasso"
            onClick={() => setTool('LASSO')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              tool === 'LASSO'
                ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/25'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
            title="Magic Lasso: Khoanh tròn nét viết để gọi AI nhận diện"
          >
            <Lasso className="w-4 h-4" />
            <span>Lasso</span>
          </button>

          {/* Eraser */}
          <button
            onClick={() => { setTool('ERASER'); setSelectedStrokes([]); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              tool === 'ERASER'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
            title="Tẩy nét viết"
          >
            <Trash2 className="w-4 h-4" />
            <span>Tẩy</span>
          </button>
        </div>

        {/* Center Section: Color Palette & Stroke Width */}
        <div className="flex items-center gap-3">
          {/* Color Dots */}
          <div className="flex items-center gap-1 bg-black/40 px-2.5 py-1.5 rounded-2xl border border-white/10">
            {PALETTE.map((c) => (
              <button
                key={c.value}
                onClick={() => setStrokeColor(c.value)}
                className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                  strokeColor === c.value ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'hover:scale-110 opacity-70 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </div>

          {/* Thickness Selector */}
          <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-2xl border border-white/10">
            {STROKE_WIDTHS.map((sw) => (
              <button
                key={sw.value}
                onClick={() => setStrokeWidth(sw.value)}
                className={`px-2 py-1 rounded-lg text-[10px] font-mono transition cursor-pointer ${
                  strokeWidth === sw.value ? 'bg-cyan-500 text-black font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {sw.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Section: Board Management & Undo/Redo */}
        <div className="flex items-center gap-1.5">
          {/* Undo / Redo */}
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 disabled:opacity-30 transition cursor-pointer"
            title="Hoàn tác (Undo)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 disabled:opacity-30 transition cursor-pointer"
            title="Làm lại (Redo)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          {/* Grid Toggle */}
          <button
            onClick={() => setGridPattern(gridPattern === 'DOTS' ? 'GRID' : (gridPattern === 'GRID' ? 'BLANK' : 'DOTS'))}
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 text-xs transition cursor-pointer"
            title="Đổi lưới nền: Lưới chấm / Ô ca-rô / Bảng trơn"
          >
            <GridIcon className="w-3.5 h-3.5" />
            <span className="text-[10px] font-mono uppercase">{gridPattern}</span>
          </button>

          {/* Export Board */}
          <button
            onClick={handleExportBoard}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 transition cursor-pointer"
            title="Tải ảnh bảng viết về máy"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Clear */}
          <button
            data-testid="tool-clear"
            onClick={handleClear}
            className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition cursor-pointer"
            title="Xóa toàn bộ bảng"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Top-bar Quick Visualize Trigger (when strokes selected) */}
          {selectedStrokes.length > 0 && (
            <button
              data-testid="btn-visualize"
              onClick={() => handleVisualize()}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500 text-slate-950 shadow-lg shadow-cyan-500/30 hover:scale-105 active:scale-95 transition cursor-pointer ml-1 animate-pulse"
            >
              {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>✨ Visualize ({selectedStrokes.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Visible Error Toast Banner */}
      {errorMessage && (
        <div
          data-testid="error-toast"
          className="flex items-center justify-between gap-3 px-4 py-2.5 mt-2 w-full max-w-5xl rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-200 text-xs shadow-xl backdrop-blur-md animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-white font-bold px-2 py-0.5 rounded transition"
          >
            ✕
          </button>
        </div>
      )}

      {/* Floating Glassmorphism Lasso Action Bar */}
      {selectedStrokes.length > 0 && (
        <div
          data-testid="lasso-action-bar"
          className="flex flex-col md:flex-row items-center gap-3 mt-3 px-5 py-3 rounded-2xl bg-slate-900/95 border border-cyan-500/30 backdrop-blur-2xl shadow-2xl z-20 max-w-5xl w-full animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Debug Preview Thumbnail */}
          <div className="flex items-center gap-2.5 shrink-0">
            {thumbnailUrl ? (
              <div className="relative group">
                <img
                  src={thumbnailUrl}
                  alt="OCR Preview"
                  data-testid="ocr-debug-thumbnail"
                  className="w-16 h-10 object-contain rounded-lg border border-white/20 bg-white shadow-sm"
                />
                <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-mono text-cyan-400 whitespace-nowrap">
                  OCR Preview
                </span>
              </div>
            ) : (
              <div className="w-16 h-10 flex items-center justify-center rounded-lg border border-dashed border-white/20 bg-black/20 text-[10px] text-slate-500">
                Preview
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-xs font-bold text-cyan-300">
                Lasso đã chọn {selectedStrokes.length} nét
              </span>
              <span className="text-[10px] text-slate-400">
                Độ phóng đại 512x256 • Nền trắng tinh
              </span>
            </div>
          </div>

          {/* Text/Voice Override Input */}
          <div className="flex-1 flex items-center gap-2 w-full md:w-auto">
            <input
              type="text"
              data-testid="lasso-formula-input"
              value={formulaInput}
              onChange={(e) => setFormulaInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleVisualize();
              }}
              placeholder="Hoặc nhập nhanh công thức: VD y=2sin(3x), Mg+HCl..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 font-mono transition"
            />
          </div>

          {/* Main Action & Cancel */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleVisualize()}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500 text-slate-950 shadow-lg shadow-cyan-500/30 hover:scale-105 active:scale-95 transition cursor-pointer"
            >
              {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{isLoading ? 'Đang nhận diện...' : '✨ Trực quan hóa'}</span>
            </button>

            <button
              onClick={() => {
                setSelectedStrokes([]);
                setLassoLoop([]);
                setFormulaInput('');
              }}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              title="Bỏ chọn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Quick Demo Preset Pills for Live Demo Guaranteed Triggering */}
      <div className="flex flex-wrap items-center gap-2 mt-2 px-4 py-2 rounded-2xl bg-slate-900/50 border border-white/5 text-xs max-w-5xl w-full">
        <span className="text-slate-400 font-medium text-[11px] shrink-0">Demo kích hoạt tức thì:</span>
        <button
          onClick={() => handleVisualize('y = 2\\sin(3x)')}
          className="px-2.5 py-1 rounded-lg bg-cyan-950/40 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] transition cursor-pointer"
        >
          📐 Đồ thị Sin
        </button>
        <button
          onClick={() => handleVisualize('ném xiên v0 = 22 m/s, alpha = 45 độ')}
          className="px-2.5 py-1 rounded-lg bg-sky-950/40 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 font-mono text-[11px] transition cursor-pointer"
        >
          🚀 Ném xiên
        </button>
        <button
          onClick={() => handleVisualize('4Fe + 3O2 -> 2Fe2O3')}
          className="px-2.5 py-1 rounded-lg bg-amber-950/40 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-mono text-[11px] transition cursor-pointer"
        >
          ⚖️ Cân bằng Hóa
        </button>
        <button
          onClick={() => handleVisualize('quang hợp nhiệt độ 25 độ C')}
          className="px-2.5 py-1 rounded-lg bg-emerald-950/40 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] transition cursor-pointer"
        >
          🌿 Quang hợp 25°C
        </button>
      </div>

      {/* Smartboard Canvas & Side-by-Side Visualization Workspace */}
      <div className="flex flex-col lg:flex-row items-start justify-center gap-4 mt-3 w-full max-w-7xl">
        {/* Drawing Canvas Area (Always visible, NEVER covered) */}
        <div className={`relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-slate-900/80 transition-all duration-300 ${activeBlueprint ? 'w-full lg:w-[54%]' : 'w-full max-w-5xl'}`}>
          <canvas
            ref={canvasRef}
            data-testid="chalkboard-canvas"
            width={960}
            height={540}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="cursor-crosshair touch-none w-full h-auto block"
          />
        </div>

        {/* Side-by-Side Simulation Blueprint (Bên cạnh bảng, không che bảng) */}
        {activeBlueprint && (
          <div
            data-testid="active-simulation-modal"
            className="w-full lg:w-[46%] flex flex-col rounded-3xl overflow-hidden border border-white/15 bg-slate-900/95 backdrop-blur-2xl shadow-2xl animate-in fade-in"
          >
            {/* Header bar with dedicated Close / Hide Visualize Button */}
            <div className="flex items-center justify-between px-5 py-3 bg-slate-950/70 border-b border-white/10">
              <span className="text-xs font-mono font-semibold text-cyan-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-300" />
                Mô phỏng Trực quan (Bên cạnh bảng)
              </span>
              <button
                data-testid="close-visualize-btn"
                onClick={() => setActiveBlueprint(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold transition cursor-pointer"
                title="Tắt visualize để viết bảng toàn màn hình"
              >
                <span>✕ Tắt Visualize</span>
              </button>
            </div>

            <div className="p-3">
              <SimulationWidget
                blueprint={activeBlueprint}
                onClose={() => setActiveBlueprint(null)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

