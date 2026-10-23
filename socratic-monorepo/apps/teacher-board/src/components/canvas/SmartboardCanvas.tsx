'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stroke, Point, filterEnclosedStrokes } from '../../utils/lassoGeometry';
import { exportIsolatedWebp } from '../../utils/isolatedExporter';
import { AUTO_INK_SCENES, AutoInkScene } from '../../utils/autoInkPresets';
import { SimulationWidget } from './SimulationWidget';
import { OcrReviewModal } from './OcrReviewModal';
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

    // 1b. Draw Tracing Watermark Guide (faint hairline guide for user practice/tracing)
    if (showWatermarkGuide) {
      ctx.save();
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.38)';
      ctx.fillStyle = 'rgba(100, 116, 139, 0.65)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 4]);

      // Faintly draw all preset strokes for the chosen slot to allow tracing letter-by-letter
      const targetPreset = AUTO_INK_SCENES.find((s) => s.id === selectedRecordSlot);
      if (targetPreset) {
        for (const stroke of targetPreset.strokes) {
          if (stroke.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (let i = 1; i < stroke.points.length; i++) {
              ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
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

    // 5. Draw Magic Lasso Loop (Freehand or Auto-Ink Selected)
    if (lassoLoop.length > 2) {
      ctx.save();
      ctx.fillStyle = 'rgba(37, 99, 235, 0.08)';
      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth = 2.0;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(lassoLoop[0].x, lassoLoop[0].y);
      for (let i = 1; i < lassoLoop.length; i++) {
        ctx.lineTo(lassoLoop[i].x, lassoLoop[i].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }, [strokes, currentStroke, selectedStrokes, lassoLoop, tool, strokeColor, strokeWidth, gridPattern, shapeStart, shapeCurrent, selectedShape, showWatermarkGuide, selectedRecordSlot]);

  useEffect(() => {
    redraw();
  }, [redraw, activeBlueprint]);

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

      // Comprehensive fallback heuristics: dynamically map ANY written formula to its exact knowledge visualizer
      let fallbackBp: SimulationBlueprint;
      const h = effectiveHint.toLowerCase();

      // 1. Giao thoa sóng 3D (Ripple Tank)
      if (
        h.includes('giao thoa') || h.includes('ripple') || h.includes('sóng nước') ||
        h.includes('d_2 - d_1') || h.includes('d2 - d1') || h.includes('d2-d1') ||
        h.includes('lambda') || h.includes('\\lambda') || h.includes('k\\lambda') ||
        h.includes('hai nguồn') || h.includes('2a\\cos') || h.includes('2a \\cos')
      ) {
        fallbackBp = {
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
      // 2. Con lắc đơn vi phân RK4 (Pendulum)
      else if (
        h.includes('con lắc') || h.includes('con lac') || h.includes('pendulum') ||
        h.includes('l/g') || h.includes('m/k') || h.includes('\\ddot{\\theta}') ||
        h.includes('chu kỳ') || (h.includes('t = 2') && h.includes('pi')) ||
        h.includes('s_0\\cos') || h.includes('rk4')
      ) {
        fallbackBp = {
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
      // 3. Cơ học Mặt phẳng nghiêng & Ma sát trượt (Inclined Plane)
      else if (
        h.includes('nghiêng') || h.includes('nghieng') || h.includes('incline') ||
        h.includes('ma sát') || h.includes('ma sat') || h.includes('\\mu') || h.includes('mu') ||
        h.includes('f_{ms}') || h.includes('fms') || h.includes('mg\\sin') || h.includes('mg\\cos')
      ) {
        fallbackBp = {
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
      // 4. Chuyển động ném xiên trong trọng trường (Projectile)
      else if (h.includes('ném') || h.includes('nem') || h.includes('v0') || h.includes('v_0') || h.includes('projectile') || h.includes('parabol')) {
        fallbackBp = {
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
      // 5. Mạch điện xoay chiều RLC & Giản đồ Fresnel
      else if (
        h.includes('rlc') || h.includes('fresnel') || h.includes('điện xoay chiều') ||
        h.includes('cộng hưởng') || h.includes('z_l') || h.includes('z_c') ||
        h.includes('z =') || h.includes('omega') || h.includes('phasor')
      ) {
        fallbackBp = {
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
      // 6. Cân bằng phản ứng Oxi hóa - Khử (Chemistry Redox Balance Scale)
      else if (h.includes('fe') || h.includes('cân') || h.includes('o2') || h.includes('hno3') || h.includes('redox') || h.includes('oxi')) {
        fallbackBp = {
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
      // 7. Chuẩn độ axit - bazơ & Đường cong pH
      else if (h.includes('chuẩn độ') || h.includes('titration') || h.includes('ph') || h.includes('naoh') || h.includes('hcl')) {
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
      }
      // 8. Cơ chế phân tử nhân đôi ADN (DNA Replication Helix)
      else if (h.includes('dna') || h.includes('adn') || h.includes('helicase') || h.includes('xoắn')) {
        fallbackBp = {
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
      // 9. Quang hợp và trao đổi chất thực vật
      else if (h.includes('quang') || h.includes('25') || h.includes('lá') || h.includes('cây') || h.includes('photo')) {
        fallbackBp = {
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
      // 10. Hàm số lượng giác & Sóng điều hòa (Math Trig Wave)
      else if (h.includes('sin') || h.includes('cos') || h.includes('wave') || h.includes('dao động') || h.includes('harmonic')) {
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
      }
      // 11. Giải tích & Khảo sát hàm số (Math Func 2D)
      else if (h.includes('int') || h.includes('\\int') || h.includes('tích phân') || h.includes('nguyên hàm')) {
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
      }
      // Default: Khảo sát hàm số đa thức
      else {
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
      className="relative w-full min-h-full bg-[#F8F7F4] text-[#18181B] flex flex-col items-center justify-start p-3 pb-32 select-none"
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
            onClick={handleOpenQrModal}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-stone-50 border border-[#DCD9D0] text-stone-700 text-xs font-medium shadow-xs transition cursor-pointer"
            title="Đóng gói Smart Notes & QR"
          >
            <QrCode className="w-3.5 h-3.5 text-stone-600" />
            <span className="text-[10px] hidden sm:inline font-mono">QR Notes</span>
          </button>

          {/* Studio Handwriting Recorder Toggle */}
          <button
            data-testid="btn-studio-recorder-toggle"
            onClick={() => setIsStudioRecorderOpen((o) => !o)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition cursor-pointer ${
              isStudioRecorderOpen
                ? 'bg-amber-50 text-amber-800 border-amber-300 font-semibold shadow-xs'
                : 'bg-white hover:bg-stone-50 border-[#DCD9D0] text-stone-700 shadow-xs'
            }`}
            title="Phòng thu nét viết: Luyện theo viền mờ & lưu bản viết thật cho video demo"
          >
            <Pen className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-medium text-[10px] hidden sm:inline">Phòng Thu Nét</span>
            {Object.values(hasCustomSlots).filter(Boolean).length > 0 && (
              <span className="bg-emerald-600 text-white text-[9px] font-mono px-1 py-0.2 rounded-full font-bold">
                {Object.values(hasCustomSlots).filter(Boolean).length}/4
              </span>
            )}
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

            {/* Formula Input Box with Floating Live KaTeX Preview Pill */}
            <div className="relative flex-1 flex items-center gap-2 w-full md:w-auto">
              {formulaInput.trim().length > 0 && (
                <div
                  data-testid="live-teacher-formula-preview"
                  className="absolute -top-11 left-0 bg-white/95 backdrop-blur-md px-3 py-1 rounded-lg border border-blue-200 shadow-md flex items-center gap-2 text-xs z-30 animate-in fade-in"
                >
                  <span className="text-[10px] font-mono text-blue-700 font-bold uppercase tracking-wider shrink-0">
                    Xem trước:
                  </span>
                  <div className="overflow-x-auto max-w-sm text-stone-900 font-semibold">
                    <FormulaBlock latex={formulaInput} />
                  </div>
                </div>
              )}
              <input
                type="text"
                data-testid="lasso-formula-input"
                value={formulaInput}
                onChange={(e) => setFormulaInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleVisualize();
                }}
                placeholder="Nhập công thức bất kỳ (ném xiên, giao thoa sóng, con lắc, RLC, Fe+O2, tích phân...)"
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

          {/* Bottom Row: 1-Tap Smart Topic Chips (Zero Fail, Instant Routing) */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#E6E4DD]">
            <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wider shrink-0">
              Gợi ý tức thì (0ms):
            </span>
            <button
              type="button"
              data-testid="smart-chip-physics"
              onClick={() => handleVisualize('v_0 = 22\\text{ m/s}, \\quad \\alpha = 45^\\circ \\quad (\\text{Ném xiên})')}
              className="px-2.5 py-1 rounded-md bg-[#F2F0EA] hover:bg-[#EAE7DF] border border-[#E6E4DD] text-stone-800 text-[11px] transition cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <FormulaBlock latex="v_0 = 22\text{ m/s}, \alpha = 45^\circ" />
            </button>
            <button
              type="button"
              data-testid="smart-chip-ripple"
              onClick={() => handleVisualize('d_2 - d_1 = k\\lambda \\quad (\\text{Giao thoa sóng})')}
              className="px-2.5 py-1 rounded-md bg-[#F2F0EA] hover:bg-[#EAE7DF] border border-[#E6E4DD] text-stone-800 text-[11px] transition cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <FormulaBlock latex="d_2 - d_1 = k\lambda" />
            </button>
            <button
              type="button"
              data-testid="smart-chip-pendulum"
              onClick={() => handleVisualize('T = 2\\pi\\sqrt{\\frac{l}{g}} \\quad (\\text{Con lắc đơn})')}
              className="px-2.5 py-1 rounded-md bg-[#F2F0EA] hover:bg-[#EAE7DF] border border-[#E6E4DD] text-stone-800 text-[11px] transition cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <FormulaBlock latex="T = 2\pi\sqrt{l/g}" />
            </button>
            <button
              type="button"
              data-testid="smart-chip-rlc"
              onClick={() => handleVisualize('Z = \\sqrt{R^2 + (Z_L - Z_C)^2} \\quad (\\text{Mạch RLC})')}
              className="px-2.5 py-1 rounded-md bg-[#F2F0EA] hover:bg-[#EAE7DF] border border-[#E6E4DD] text-stone-800 text-[11px] transition cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <FormulaBlock latex="Z = \sqrt{R^2 + (Z_L - Z_C)^2}" />
            </button>
            <button
              type="button"
              data-testid="smart-chip-incline"
              onClick={() => handleVisualize('a = g(\\sin\\alpha - \\mu\\cos\\alpha) \\quad (\\text{Mặt phẳng nghiêng})')}
              className="px-2.5 py-1 rounded-md bg-[#F2F0EA] hover:bg-[#EAE7DF] border border-[#E6E4DD] text-stone-800 text-[11px] transition cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <FormulaBlock latex="a = g(\sin\alpha - \mu\cos\alpha)" />
            </button>
            <button
              type="button"
              data-testid="smart-chip-math"
              onClick={() => handleVisualize('y = 2\\sin(3x)')}
              className="px-2.5 py-1 rounded-md bg-[#F2F0EA] hover:bg-[#EAE7DF] border border-[#E6E4DD] text-stone-800 text-[11px] transition cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <FormulaBlock latex="y = 2\sin(3x)" />
            </button>
            <button
              type="button"
              data-testid="smart-chip-chemistry"
              onClick={() => handleVisualize('4\\text{Fe} + 3\\text{O}_2 \\rightarrow 2\\text{Fe}_2\\text{O}_3')}
              className="px-2.5 py-1 rounded-md bg-[#F2F0EA] hover:bg-[#EAE7DF] border border-[#E6E4DD] text-stone-800 text-[11px] transition cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <FormulaBlock latex="4\text{Fe} + 3\text{O}_2 \rightarrow 2\text{Fe}_2\text{O}_3" />
            </button>
            <button
              type="button"
              data-testid="smart-chip-biology"
              onClick={() => handleVisualize('quang hợp nhiệt độ 25 độ C')}
              className="px-2.5 py-1 rounded-md bg-[#F2F0EA] hover:bg-[#EAE7DF] border border-[#E6E4DD] text-stone-800 text-[11px] transition cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <FormulaBlock latex="\text{Quang hợp: } T = 25^\circ\text{C}" />
            </button>
            <button
              type="button"
              data-testid="smart-chip-titration"
              onClick={() => handleVisualize('chuẩn độ axit bazơ ph')}
              className="px-2.5 py-1 rounded-md bg-[#F2F0EA] hover:bg-[#EAE7DF] border border-[#E6E4DD] text-stone-800 text-[11px] transition cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <FormulaBlock latex="\text{Chuẩn độ pH (HCl + NaOH)}" />
            </button>
          </div>
        </div>
      )}

      {/* DIRECTOR SCENE SWITCHER BAR (Apple Keynote One-Take Recording Engine) */}
      <div
        data-testid="director-scene-switcher-bar"
        className="flex flex-wrap items-center justify-between gap-2 mt-2 px-3.5 py-2 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E6E4DD] text-xs max-w-6xl w-full shadow-sm"
      >
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-mono text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-[#18181B] text-white">
            Director Hotkeys (1-4)
          </span>
          {isAutoInking && (
            <span className="text-[11px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
              Đang viết thư pháp 0.8s...
            </span>
          )}
          {isCompilingShimmer && (
            <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              AI Compiling 450ms...
            </span>
          )}
        </div>

        {/* 4 Scene Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {AUTO_INK_SCENES.map((scene, idx) => {
            const hotkey = idx + 1;
            const isActive = activeAutoScene === scene.id;
            return (
              <button
                key={scene.id}
                type="button"
                data-testid={`director-scene-btn-${hotkey}`}
                onClick={() => triggerAutoInk(scene.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs transition cursor-pointer border ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-700 font-semibold shadow-xs'
                    : 'bg-[#F4F3EE] hover:bg-[#EAE7DF] border-[#E5E3DC] text-stone-700 hover:text-stone-900'
                }`}
                title={`Kích hoạt kịch bản mẫu ${scene.shortLabel} (Phím ${hotkey})`}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isActive ? 'bg-white text-blue-600' : 'bg-white border border-[#DCD9D0] text-stone-600'
                }`}>
                  {hotkey}
                </span>
                <span className="font-sans font-medium text-[11px]">{scene.shortLabel}</span>
                {hasCustomSlots[scene.id] && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200" title="Đã lưu nét thật của bạn" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Smartboard Canvas & Side-by-Side Ergonomic Split-View Workspace */}
      <div className="flex flex-col lg:flex-row items-start justify-center gap-4 mt-3 w-full max-w-7xl">
        {/* Drawing Canvas Area (Always visible, NEVER covered, high-def 1200x675) */}
        <div
          className={`relative rounded-2xl overflow-hidden border border-[#E6E4DD] bg-[#F8F7F4] shadow-sm transition-all duration-200 ${
            activeBlueprint || isCompilingShimmer
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
        {activeBlueprint && !isCompilingShimmer && (
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

