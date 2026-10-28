'use client';

import React, {useEffect, useRef, useState} from 'react';
import {
  Pen,
  Highlighter,
  Eraser,
  Shapes,
  Circle,
  Square,
  ArrowRight,
  Minus,
  MousePointer2,
  Undo2,
  Redo2,
  Grid3x3,
  Trash2,
  MoreHorizontal,
  Download,
  Columns,
  QrCode,
  PenLine,
  Users,
  Sparkles,
  Wand2,
  Lasso,
  Mic,
  MicOff,
  X,
  Loader2,
  GraduationCap,
  BookOpen,
  MessageSquare,
  Hand,
  Type,
  ArrowLeft,
  PenTool,
  FileText,
  Ruler,
  Plus,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  MapPin,
  CornerDownRight,
  Scissors,
  Copy,
  Compass,
  Eye,
  EyeOff,
  Box,
  Palette,
  Layers,
} from 'lucide-react';
import type {CanvasTool, ShapeType, GridPattern} from './SmartboardCanvas';
import { type Subject, SUBJECT_LABEL } from '../../utils/subjectContext';
import { DEFAULT_ORBIT } from '../../utils/geometryProblem';
import { GEO_TOOLS, GEO_MEASURE, type GeoController, type GeoTool } from './GeometryProblemPanel';

export interface DockScene {
  id: string;
  shortLabel: string;
  hotkey: number;
  active: boolean;
  custom: boolean;
}

export interface SmartboardDockProps {
  tool: CanvasTool;
  onTool: (t: CanvasTool) => void;
  selectedShape: ShapeType;
  onShape: (s: ShapeType) => void;
  strokeColor: string;
  onColor: (c: string) => void;
  strokeWidth: number;
  onWidth: (w: number) => void;
  palette: {name: string; value: string}[];
  widths: {label: string; value: number}[];
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  gridPattern: GridPattern;
  onCycleGrid: () => void;
  onClear: () => void;
  onExport: () => void;
  isSplitView: boolean;
  onToggleSplit: () => void;
  onOpenQr: () => void;
  isRecorderOpen: boolean;
  onToggleRecorder: () => void;
  customSlotCount: number;
  isGeometryLiveMode?: boolean;
  onToggleGeometryLiveMode?: () => void;
  scenes: DockScene[];
  onScene: (id: string) => void;
  busyLabel: string | null;
  onOpenClassroom: () => void;
  classroomStudents: number | null;
}

const base = 'flex flex-col items-center justify-center gap-0.5 min-w-[52px] px-2 py-1.5 rounded-xl text-[10px] font-medium leading-none transition cursor-pointer select-none border';
const idle = 'bg-transparent border-transparent text-stone-600 hover:bg-black/5 hover:text-stone-900';
const on = 'bg-stone-900 border-stone-900 text-white shadow-sm';

const ShapeIcon: Record<ShapeType, React.ReactNode> = {
  CIRCLE: <Circle className="w-5 h-5" />,
  LINE: <Minus className="w-5 h-5" />,
  ARROW: <ArrowRight className="w-5 h-5" />,
  RECTANGLE: <Square className="w-5 h-5" />,
};

/** Thanh tác vụ duy nhất của bảng thông minh: các chức năng chuẩn, tùy chọn con mở bằng bảng nhỏ phía trên. */
export const SmartboardDock: React.FC<SmartboardDockProps> = (p) => {
  const [pop, setPop] = useState<null | 'pen' | 'shape' | 'more'>(null);
  const root = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const away = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setPop(null);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setPop(null);
    document.addEventListener('pointerdown', away);
    window.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      window.removeEventListener('keydown', esc);
    };
  }, []);

  const shapeActive = p.tool === 'SHAPE';
  const popCls = (k: string) => `${pop === k ? 'flex' : 'hidden'} absolute bottom-[calc(100%+10px)] z-50 rounded-2xl bg-white/97 backdrop-blur-md border border-[#E6E4DD] shadow-[0_12px_40px_rgba(0,0,0,0.16)] p-2.5 animate-in fade-in slide-in-from-bottom-2 duration-150`;

  return (
    <div ref={root} data-testid="smartboard-toolbar" className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-96px)]">
      {/* Bảng nhỏ: màu & độ dày bút */}
      <div data-testid="pen-popover" className={`${popCls('pen')} left-[88px] flex-col gap-2.5`}>
        <div className="flex items-center gap-2">
          {p.palette.map((c) => (
            <button
              key={c.value}
              title={c.name}
              onClick={() => p.onColor(c.value)}
              className={`w-8 h-8 rounded-full border border-black/10 transition-transform ${p.strokeColor === c.value ? 'scale-110 ring-2 ring-stone-900 ring-offset-2' : 'hover:scale-105'}`}
              style={{backgroundColor: c.value}}
            />
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          {p.widths.map((w) => (
            <button
              key={w.value}
              onClick={() => p.onWidth(w.value)}
              className={`flex-1 flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg border text-[10px] transition ${p.strokeWidth === w.value ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-[#DCD9D0] hover:bg-stone-50'}`}
            >
              <span className="rounded-full bg-current" style={{width: 28, height: Math.max(2, w.value)}} />
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bảng nhỏ: hình */}
      <div data-testid="shape-popover" className={`${popCls('shape')} left-[250px] items-center gap-1`}>
        {([['CIRCLE', 'tool-circle', 'Hình tròn'], ['LINE', 'tool-line', 'Đoạn thẳng'], ['ARROW', 'tool-arrow', 'Mũi tên'], ['RECTANGLE', 'tool-rect', 'Chữ nhật']] as [ShapeType, string, string][]).map(([s, id, label]) => (
          <button
            key={s}
            data-testid={id}
            onClick={() => {
              p.onShape(s);
              setPop(null);
            }}
            className={`${base} ${shapeActive && p.selectedShape === s ? on : idle}`}
            title={label}
          >
            {ShapeIcon[s]}
            {label}
          </button>
        ))}
        {p.onToggleGeometryLiveMode && (
          <button
            data-testid="tool-geo-live-mode-toggle"
            onClick={() => {
              p.onToggleGeometryLiveMode?.();
              setPop(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ml-1 ${
              p.isGeometryLiveMode
                ? 'bg-blue-600 border-blue-700 text-white shadow-xs'
                : 'bg-white border-[#DCD9D0] text-blue-700 hover:bg-blue-50'
            }`}
            title="Bật/Tắt chế độ vẽ hình tự động biến thành mô hình tương tác tại chỗ"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Trực quan hình học {p.isGeometryLiveMode ? '(BẬT)' : ''}</span>
          </button>
        )}
      </div>

      {/* Bảng nhỏ: thêm */}
      <div data-testid="more-popover" className={`${popCls('more')} right-0 flex-col gap-2 w-[min(420px,calc(100vw-110px))]`}>
        <div className="grid grid-cols-4 gap-1">
          <button data-testid="btn-split-view-toggle" onClick={p.onToggleSplit} className={`${base} ${p.isSplitView ? on : idle}`} title="Ghim mô phỏng sang nửa bảng">
            <Columns className="w-5 h-5" />
            {p.isSplitView ? 'Nửa bảng' : 'Toàn bảng'}
          </button>
          <button data-testid="btn-pack-smart-notes" onClick={p.onOpenQr} className={`${base} ${idle}`} title="Đóng gói Smart Notes & QR">
            <QrCode className="w-5 h-5" />
            QR Notes
          </button>
          <button onClick={p.onExport} className={`${base} ${idle}`} title="Tải ảnh bảng về máy">
            <Download className="w-5 h-5" />
            Xuất ảnh
          </button>
          <button data-testid="btn-studio-recorder-toggle" onClick={p.onToggleRecorder} className={`${base} ${p.isRecorderOpen ? on : idle} relative`} title="Phòng thu nét viết cho video demo">
            <PenLine className="w-5 h-5" />
            Phòng thu
            {p.customSlotCount > 0 && <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[9px] rounded-full px-1">{p.customSlotCount}/4</span>}
          </button>
        </div>
        <div data-testid="director-scene-switcher-bar" className="border-t border-[#E6E4DD] pt-2">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500">Cảnh mẫu (phím 1–4)</span>
            {p.busyLabel && <span className="text-[10px] font-mono text-blue-600">{p.busyLabel}</span>}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {p.scenes.map((s) => (
              <button
                key={s.id}
                type="button"
                data-testid={`director-scene-btn-${s.hotkey}`}
                onClick={() => {
                  p.onScene(s.id);
                  setPop(null);
                }}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] transition ${s.active ? 'bg-blue-600 text-white border-blue-700 font-semibold' : 'bg-[#F4F3EE] border-[#E5E3DC] text-stone-700 hover:bg-[#EAE7DF]'}`}
                title={`Kích hoạt kịch bản mẫu ${s.shortLabel} (Phím ${s.hotkey})`}
              >
                <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${s.active ? 'bg-white text-blue-600' : 'bg-white border border-[#DCD9D0] text-stone-600'}`}>{s.hotkey}</span>
                {s.shortLabel}
                {s.custom && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-auto" title="Đã lưu nét thật" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* THANH TÁC VỤ */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 rounded-[22px] bg-white/95 backdrop-blur-md border border-[#E6E4DD] shadow-[0_8px_32px_-6px_rgba(20,20,19,0.22)]">
        <button data-testid="tool-lasso" onClick={() => p.onTool('LASSO')} className={`${base} ${p.tool === 'LASSO' ? on : idle}`} title="Chọn / khoanh vùng: kéo khung chữ nhật quanh nét viết để di chuyển hoặc dùng AI">
          <MousePointer2 className="w-5 h-5" />
          Chọn
        </button>

        <button data-testid="tool-pan" onClick={() => p.onTool('PAN')} className={`${base} ${p.tool === 'PAN' ? on : idle}`} title="Di chuyển bảng (hoặc giữ Space, hoặc hai ngón)">
          <Hand className="w-5 h-5" />
          Tay
        </button>

        <button
          data-testid="tool-pen"
          onClick={() => {
            if (p.tool === 'PEN') setPop(pop === 'pen' ? null : 'pen');
            else {
              p.onTool('PEN');
              setPop(null);
            }
          }}
          className={`${base} ${p.tool === 'PEN' ? on : idle} relative`}
          title="Bút viết (chạm lần nữa để chọn màu, độ dày)"
        >
          <Pen className="w-5 h-5" />
          Bút
          <span className="absolute bottom-0.5 right-1 w-2 h-2 rounded-full border border-white/70" style={{backgroundColor: p.strokeColor}} />
        </button>

        <button onClick={() => p.onTool('HIGHLIGHTER')} className={`${base} ${p.tool === 'HIGHLIGHTER' ? 'bg-amber-400 border-amber-400 text-stone-900' : idle}`} title="Bút dạ quang">
          <Highlighter className="w-5 h-5" />
          Dạ quang
        </button>

        <button data-testid="tool-text" onClick={() => p.onTool('TEXT')} className={`${base} ${p.tool === 'TEXT' ? on : idle}`} title="Chèn chữ: chạm vào bảng, gõ rồi Enter">
          <Type className="w-5 h-5" />
          Chữ
        </button>

        <button
          data-testid="tool-shape"
          onClick={() => setPop(pop === 'shape' ? null : 'shape')}
          className={`${base} ${shapeActive ? on : idle} relative`}
          title={p.isGeometryLiveMode ? 'Hình vẽ (Chế độ trực quan hình học: Đang BẬT)' : 'Hình vẽ: tròn, thẳng, mũi tên, chữ nhật, trực quan hình học'}
        >
          {shapeActive ? ShapeIcon[p.selectedShape] : <Shapes className="w-5 h-5" />}
          Hình
          {p.isGeometryLiveMode && (
            <span
              data-testid="dock-geo-live-indicator"
              className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white animate-pulse"
              title="Chế độ trực quan hình học tự động đang bật"
            />
          )}
        </button>

        <button data-testid="tool-eraser" onClick={() => p.onTool('ERASER')} className={`${base} ${p.tool === 'ERASER' ? on : idle}`} title="Tẩy từng đoạn nét">
          <Eraser className="w-5 h-5" />
          Tẩy
        </button>

        <span className="w-px h-8 bg-[#E6E4DD] mx-1" />

        <button onClick={p.onUndo} disabled={!p.canUndo} className={`${base} ${idle} disabled:opacity-30 disabled:pointer-events-none min-w-[44px]`} title="Hoàn tác (Undo)">
          <Undo2 className="w-5 h-5" />
          Hoàn tác
        </button>
        <button onClick={p.onRedo} disabled={!p.canRedo} className={`${base} ${idle} disabled:opacity-30 disabled:pointer-events-none min-w-[44px]`} title="Làm lại (Redo)">
          <Redo2 className="w-5 h-5" />
          Làm lại
        </button>

        <span className="w-px h-8 bg-[#E6E4DD] mx-1" />

        <button onClick={p.onCycleGrid} className={`${base} ${idle} min-w-[44px]`} title="Đổi nền: chấm / ô vuông / trơn">
          <Grid3x3 className="w-5 h-5" />
          Nền
        </button>
        <button data-testid="tool-clear" onClick={p.onClear} className={`${base} ${idle} min-w-[44px] hover:!text-rose-600`} title="Xóa toàn bộ bảng">
          <Trash2 className="w-5 h-5" />
          Xóa
        </button>

        <span className="w-px h-8 bg-[#E6E4DD] mx-1" />

        <button data-testid="btn-classroom" onClick={p.onOpenClassroom} className={`${base} ${p.classroomStudents !== null ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : idle} relative`} title="Lớp học: học sinh quét QR vào xem và tương tác">
          <Users className="w-5 h-5" />
          Lớp học
          {p.classroomStudents !== null && <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[9px] rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">{p.classroomStudents}</span>}
        </button>
        <button data-testid="btn-more" onClick={() => setPop(pop === 'more' ? null : 'more')} className={`${base} ${pop === 'more' ? on : idle} min-w-[44px]`} title="Thêm: nửa bảng, QR, xuất ảnh, cảnh mẫu">
          <MoreHorizontal className="w-5 h-5" />
          Thêm
        </button>
      </div>
    </div>
  );
};

// ====================================================================== NÚT AI NỔI ĐA NĂNG
export interface AiFabProps {
  selectionCount: number;
  busy: boolean;
  listening: boolean;
  onConvert: () => void;
  onVisualize: () => void;
  onLasso: () => void;
  onVoice: () => void;
  onAskQa?: () => void;
  onGrade?: () => void;
  subjectLock?: Subject | null;
  onCycleSubject?: () => void;
  detectedIntent?: 'VISUALIZE' | 'GRADE' | null;
  /** Thẻ tác vụ cho vùng đang khoanh (công thức, trực quan, chấm bài…) — hiện ngay cạnh nút AI */
  panel?: React.ReactNode;
  /** Toạ độ màn hình cạnh vùng khoanh: nút AI nhảy tới đây khi vừa khoanh xong */
  anchor?: {x: number; y: number} | null;
  /** Vẽ hình từ đề: bộ điều khiển của hình đang chọn (null/undefined nếu chưa có hình) */
  geo?: GeoController | null;
  /** mở hộp nhập đề mới */
  onGeoNew?: () => void;
  /** vẽ hình từ nét đã khoanh (đề bài viết tay hoặc gõ chữ trong vùng khoanh) */
  onDrawSelected?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onDeselect?: () => void;
  /** yêu cầu mở hub tại một tầng (vd ['draw','tools']); đổi `nonce` để kích hoạt lại */
  openAtPath?: {path: string[]; nonce: number} | null;
}

interface HubItem {
  id: string;
  testid: string;
  aliasTestId?: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  run: () => void;
  tone: string;
  activeTone: string;
  badge?: number;
  highlight: boolean;
  /** true: giữ đĩa mở (đi tầng khác, bấm lặp lại) */
  keep?: boolean;
  disabled?: boolean;
}

const GEO_TOOL_ICONS: Record<GeoTool, React.ReactNode> = {
  segment: <Minus className="w-4 h-4" />,
  midpoint: <CircleDot className="w-4 h-4" />,
  onEdge: <MapPin className="w-4 h-4" />,
  foot: <CornerDownRight className="w-4 h-4" />,
  section: <Scissors className="w-4 h-4" />,
  dist: <Ruler className="w-4 h-4" />,
  angle: <Compass className="w-4 h-4" />,
};

/**
 * Đĩa Xoay AI Trung Tâm (Solid White AI Radial Turntable Disc):
 * - Thu gọn: Nút tròn trắng tinh khiết, gọn gàng, có thể chạm giữ và kéo trượt khắp mặt bảng (0ms latency).
 * - Mở rộng: Nở thành một Đĩa Tròn Đặc Màu Trắng (216px × 216px) liền khối, tâm đĩa in chữ "AI",
 *   vành đĩa chia đều các tác vụ (Icon mảnh + Nhãn 2 chữ nằm gọn bên trong mặt đĩa trắng, không bao giờ chồng lấp hay tràn mép).
 */
export const AiFab: React.FC<AiFabProps> = ({
  selectionCount,
  busy,
  listening,
  onConvert,
  onVisualize,
  onLasso,
  onVoice,
  onAskQa,
  onGrade,
  subjectLock,
  onCycleSubject,
  detectedIntent,
  panel,
  anchor,
  geo,
  onGeoNew,
  onDrawSelected,
  onDuplicate,
  onDelete,
  onDeselect,
  openAtPath,
}) => {
  const [open, setOpen] = useState(false);
  // phân tầng: [] = tầng 1; ['draw'] = Vẽ hình; ['draw','tools'] / ['draw','parts'] = tầng 3
  const [path, setPath] = useState<string[]>([]);
  const hasPanel = !!panel;
  const prevHasPanel = useRef(false);
  const root = useRef<HTMLDivElement | null>(null);

  // Vị trí kéo di chuyển của nút AI trên toàn màn hình bảng
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const justToggledByPointerRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);

  useEffect(() => {
    const away = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) {
        setOpen(false);
        setPath([]);
      }
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setPath([]);
      }
    };
    document.addEventListener('pointerdown', away);
    window.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      window.removeEventListener('keydown', esc);
    };
  }, []);

  useEffect(() => {
    if (openAtPath) {
      setPath(openAtPath.path);
      setOpen(true);
    }
  }, [openAtPath?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (hasPanel && !prevHasPanel.current) {
      // khoanh xong: hub bay tới vùng khoanh và tự mở bộ chức năng của vùng
      setPath([]);
      setOpen(true);
      if (anchor) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        setPos({ x: Math.max(40, Math.min(w - 40, anchor.x)), y: Math.max(40, Math.min(h - 40, anchor.y)) });
      }
    }
    prevHasPanel.current = hasPanel;
  }, [hasPanel, anchor]);

  const winW = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const winH = typeof window !== 'undefined' ? window.innerHeight : 675;
  const defaultX = Math.max(120, winW - 96);
  const defaultY = Math.max(120, winH - 116);
  const rawX = pos ? pos.x : defaultX;
  const rawY = pos ? pos.y : defaultY;

  // Khi mở đĩa tròn 216px (bán kính 108px), tự động dịch tâm vào trong nếu nút đang sát mép màn hình để đĩa tròn hiển thị trọn vẹn 360°
  const discMargin = 114;
  const displayX = open ? Math.max(discMargin, Math.min(winW - discMargin, rawX)) : rawX;
  const displayY = open ? Math.max(discMargin, Math.min(winH - discMargin, rawY)) : rawY;

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    isDraggingRef.current = false;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: rawX,
      initY: rawY,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    if (Math.hypot(dx, dy) > 4) {
      isDraggingRef.current = true;
      const nextX = Math.max(36, Math.min(winW - 36, dragStartRef.current.initX + dx));
      const nextY = Math.max(36, Math.min(winH - 36, dragStartRef.current.initY + dy));
      setPos({ x: nextX, y: nextY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) {
      justToggledByPointerRef.current = true;
      setOpen((o) => !o);
      setTimeout(() => {
        justToggledByPointerRef.current = false;
      }, 80);
    }
    dragStartRef.current = null;
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleClick = () => {
    if (justToggledByPointerRef.current) return;
    setOpen((o) => !o);
  };

  let rootItems: HubItem[] = [
    {
      id: 'viz',
      testid: 'top-toolbar-btn-visualize',
      aliasTestId: 'radial-action-visualize',
      label: 'Trực quan',
      hint: selectionCount ? `Dựng mô phỏng từ ${selectionCount} nét đã chọn` : 'Khoanh vùng rồi kích hoạt mô phỏng',
      icon: busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />,
      run: onVisualize,
      tone: 'text-blue-600',
      activeTone: 'bg-blue-50 text-blue-700 ring-1 ring-blue-300 font-bold',
      badge: selectionCount || undefined,
      highlight: detectedIntent === 'VISUALIZE',
    },
    {
      id: 'conv',
      testid: 'tool-convert-ink',
      aliasTestId: 'radial-action-latex',
      label: 'Chuyển LaTeX',
      hint: 'Chuyển chữ viết tay thành công thức chuẩn',
      icon: <Wand2 className="w-4 h-4" />,
      run: onConvert,
      tone: 'text-violet-600',
      activeTone: 'bg-violet-50 text-violet-700 ring-1 ring-violet-300',
      badge: undefined,
      highlight: false,
    },
    {
      id: 'grade',
      testid: 'ai-fab-grade',
      aliasTestId: 'radial-action-grade',
      label: 'Chấm bài',
      hint: 'Chấm bài giải học sinh theo bước',
      icon: <GraduationCap className="w-4 h-4" />,
      run: onGrade || onConvert,
      tone: 'text-emerald-600',
      activeTone: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300 font-bold',
      badge: undefined,
      highlight: detectedIntent === 'GRADE',
    },
    {
      id: 'subject',
      testid: 'ai-fab-subject',
      aliasTestId: 'radial-action-subject',
      label: subjectLock ? SUBJECT_LABEL[subjectLock] : 'Môn: Tự động',
      hint: 'Đổi ngữ cảnh phân môn Toán, Lý, Hóa, Sinh',
      icon: <BookOpen className="w-4 h-4" />,
      run: onCycleSubject || (() => {}),
      tone: 'text-amber-600',
      activeTone: 'bg-amber-50 text-amber-700 ring-1 ring-amber-300',
      badge: undefined,
      highlight: Boolean(subjectLock),
    },
    {
      id: 'voice',
      testid: 'ai-fab-voice',
      aliasTestId: 'radial-action-voice',
      label: listening ? 'Đang nghe…' : 'Giọng nói',
      hint: 'Đọc công thức hoặc hỏi đáp AI bằng giọng nói',
      icon: listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />,
      run: () => {
        onVoice();
        onAskQa?.();
      },
      tone: listening ? 'text-rose-600 animate-pulse' : 'text-rose-600',
      activeTone: 'bg-rose-50 text-rose-700 ring-1 ring-rose-300',
      badge: undefined,
      highlight: listening,
    },
    {
      id: 'qa',
      testid: 'ai-fab-qa',
      aliasTestId: 'radial-action-qa',
      label: 'Hỏi đáp AI',
      hint: 'Mở thẻ hỏi đáp AI kèm mô hình minh họa động tức thì',
      icon: <MessageSquare className="w-4 h-4" />,
      run: onAskQa || onVoice,
      tone: 'text-cyan-600',
      activeTone: 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-300',
      badge: undefined,
      highlight: false,
    },
    {
      id: 'draw',
      testid: 'ai-fab-draw',
      aliasTestId: 'radial-action-draw',
      label: 'Vẽ hình',
      hint: 'Vẽ hình hình học từ đề bài, vẽ từng phần và vẽ thêm trên hình',
      icon: <PenTool className="w-4 h-4" />,
      // bấm là chạy ngay theo loại vùng khoanh (nét vẽ tay, tên hình, cả đề), rồi mở tầng 2 gồm các công cụ chuyên sâu
      run: () => {
        if (selectionCount > 0) onDrawSelected?.();
        setPath(['draw']);
      },
      keep: true,
      tone: 'text-emerald-600',
      activeTone: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300 font-bold',
      badge: undefined,
      highlight: !!geo,
    },
  ];

  const selItem = (id: string, label: string, hint: string, icon: React.ReactNode, run: () => void, tone: string): HubItem => ({
    id,
    testid: `sel-btn-${id}`,
    label,
    hint,
    icon,
    run,
    tone,
    activeTone: '',
    highlight: false,
  });
  if (selectionCount > 0) {
    const pick = (id: string) => rootItems.find((r) => r.id === id)!;
    rootItems = [
      pick('viz'),
      pick('conv'),
      pick('grade'),
      pick('draw'),
      pick('subject'),
      selItem('duplicate', 'Nhân đôi', 'Nhân đôi vùng chọn (Ctrl+D)', <Copy className="w-4 h-4" />, () => onDuplicate?.(), 'text-stone-600'),
      selItem('delete', 'Xóa', 'Xóa vùng chọn (Delete)', <Trash2 className="w-4 h-4" />, () => onDelete?.(), 'text-rose-600'),
      selItem('deselect', 'Bỏ chọn', 'Bỏ chọn vùng', <X className="w-4 h-4" />, () => onDeselect?.(), 'text-stone-500'),
    ];
  }

  const back: HubItem = {
    id: 'back',
    testid: 'ai-fab-back',
    label: 'Quay lại',
    hint: 'Về tầng trước',
    icon: <ArrowLeft className="w-4 h-4" />,
    run: () => setPath((pt) => pt.slice(0, -1)),
    keep: true,
    tone: 'text-stone-600',
    activeTone: '',
    highlight: false,
  };
  const sub = (id: string, label: string, hint: string, icon: React.ReactNode, run: () => void, extra: Partial<HubItem> = {}): HubItem => ({
    id,
    testid: `ai-fab-draw-${id}`,
    label,
    hint,
    icon,
    run,
    tone: 'text-emerald-600',
    activeTone: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300',
    highlight: false,
    ...extra,
  });

  const tierKey = path.join('/');
  let items: HubItem[] = rootItems;
  if (tierKey === 'draw') {
    items = [
      back,
      ...(geo
        ? [
            sub('tools', 'Dựng', 'Đoạn nối, trung điểm, điểm trên cạnh, chân vuông góc, thiết diện', <Ruler className="w-4 h-4" />, () => setPath(['draw', 'tools']), {keep: true, highlight: GEO_TOOLS.some((t) => t.id === geo.tool)}),
            sub('measure', 'Đo', 'Đo độ dài đoạn thẳng và số đo góc ngay trên hình', <Compass className="w-4 h-4" />, () => setPath(['draw', 'measure']), {keep: true, highlight: GEO_MEASURE.some((t) => t.id === geo.tool)}),
            sub('parts', `Phần ${geo.upTo + 1}/${geo.parts}`, 'Hiện thêm hoặc ẩn bớt từng phần. Muốn thêm yêu cầu: viết lên bảng (VD: vẽ đường tròn ngoại tiếp) rồi khoanh và bấm Vẽ hình', <ChevronRight className="w-4 h-4" />, () => setPath(['draw', 'parts']), {keep: true}),
            sub('view', 'Hiển thị', 'Xoay 3D, tô màu mặt, nét khuất, mở mô phỏng 3D, xuất TikZ', <Eye className="w-4 h-4" />, () => setPath(['draw', 'view']), {keep: true}),
            ...(geo.canNet
              ? [
                  sub('net', geo.net > 0.5 ? 'Gấp lại' : 'Khai triển', geo.net > 0.5 ? 'Gấp lưới phẳng lại thành khối' : 'Mở khối thành lưới phẳng các mặt (có hoạt họa gấp/mở)', <Layers className="w-4 h-4" />, () => geo.setNet(geo.net > 0.5 ? 0 : 1), {keep: true, highlight: geo.net > 0}),
                  sub('slice', 'Cắt ngang', 'Mặt phẳng cắt song song đáy: kéo lên xuống để thiết diện đổi theo', <Scissors className="w-4 h-4" />, () => {
                    if (geo.slice === null) geo.setSlice(0.5);
                    setPath(['draw', 'slice']);
                  }, {keep: true, highlight: geo.slice !== null}),
                ]
              : []),
            sub('edit', 'Chỉnh sửa', 'Hoàn tác, làm lại, xóa hình', <PenLine className="w-4 h-4" />, () => setPath(['draw', 'edit']), {keep: true}),
          ]
        : [
            sub(
              'new',
              selectionCount > 0 ? 'Vẽ từ vùng' : 'Khoanh đề',
              selectionCount > 0 ? 'Dựng hình từ vùng đang khoanh: nét vẽ tay, tên hình (S.ABCD…) hoặc cả đề bài' : 'Khoanh quanh nét vẽ, tên hình hoặc đề bài rồi chọn lại Vẽ hình',
              <Lasso className="w-4 h-4" />,
              () => (selectionCount > 0 ? onDrawSelected?.() : onLasso()),
            ),
            sub('typed', 'Gõ đề', 'Dán hoặc gõ đề bài (đủ hoặc tóm tắt) để dựng hình', <FileText className="w-4 h-4" />, () => onGeoNew?.()),
            // các chức năng chuyên sâu luôn hiện để biết có gì; mờ cho tới khi có hình
            sub('tools', 'Dựng', 'Cần có hình trước: vẽ từ vùng khoanh hoặc gõ đề', <Ruler className="w-4 h-4" />, () => undefined, {disabled: true}),
            sub('measure', 'Đo', 'Cần có hình trước: đo độ dài và góc', <Compass className="w-4 h-4" />, () => undefined, {disabled: true}),
            sub('view', 'Hiển thị', 'Cần có hình trước: xoay 3D, tô màu mặt, nét khuất, xem 3D, xuất TikZ', <Eye className="w-4 h-4" />, () => undefined, {disabled: true}),
          ]),
    ];
  } else if (tierKey === 'draw/tools' && geo) {
    items = [
      back,
      ...GEO_TOOLS.map((t) =>
        sub(t.id, t.label, t.hint, GEO_TOOL_ICONS[t.id], () => geo.setTool(geo.tool === t.id ? null : t.id), {highlight: geo.tool === t.id}),
      ),
    ];
  } else if (tierKey === 'draw/measure' && geo) {
    items = [
      back,
      ...GEO_MEASURE.map((t) =>
        sub(t.id, t.label, t.hint, GEO_TOOL_ICONS[t.id], () => geo.setTool(geo.tool === t.id ? null : t.id), {highlight: geo.tool === t.id}),
      ),
    ];
  } else if (tierKey === 'draw/view' && geo) {
    items = [
      back,
      ...(geo.is3D
        ? [
            sub('orbit', geo.rot ? 'Góc SGK' : 'Xoay tự do', geo.rot ? 'Về góc nhìn chuẩn sách giáo khoa (chiếu xiên, song song giữ song song)' : 'Bật xoay 3D: kéo ngón tay trên hình để xoay, cạnh khuất tự thành nét đứt', <Box className="w-4 h-4" />, () => (geo.rot ? geo.resetView() : geo.setRot(DEFAULT_ORBIT.yaw, DEFAULT_ORBIT.pitch)), {keep: true, highlight: !!geo.rot}),
            sub('colors', geo.colors ? 'Bỏ màu mặt' : 'Tô màu mặt', 'Tô màu từng mặt của khối để phân biệt các mặt', <Palette className="w-4 h-4" />, () => geo.toggleColors(), {keep: true, highlight: geo.colors}),
          ]
        : []),
      sub('hidden', geo.hideHidden ? 'Hiện nét đứt' : 'Ẩn nét khuất', 'Đổi giữa nét đứt chuẩn SGK cho cạnh bị che và ẩn hẳn các cạnh đó', geo.hideHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />, () => geo.toggleHidden(), {keep: true, highlight: geo.hideHidden}),
      sub('view3d', 'Xem 3D', 'Mở mô phỏng 3D của khối: xoay, cắt thiết diện, khai triển', <Box className="w-4 h-4" />, () => geo.open3D()),
      sub('export', 'Xuất TikZ', 'Chép mã TikZ của hình (nét đứt đúng chuẩn) để dán vào LaTeX', <Download className="w-4 h-4" />, () => geo.exportTikz(), {keep: true}),
    ];
  } else if (tierKey === 'draw/slice' && geo) {
    const sl = geo.slice ?? 0.5;
    items = [
      back,
      sub('up', 'Lên', 'Nâng mặt phẳng cắt lên 10%', <ChevronRight className="w-4 h-4 -rotate-90" />, () => geo.setSlice(Math.min(0.95, sl + 0.1)), {keep: true, disabled: geo.slice === null || sl >= 0.95}),
      sub('down', 'Xuống', 'Hạ mặt phẳng cắt xuống 10%', <ChevronRight className="w-4 h-4 rotate-90" />, () => geo.setSlice(Math.max(0.05, sl - 0.1)), {keep: true, disabled: geo.slice === null || sl <= 0.05}),
      sub('off', 'Tắt cắt', 'Bỏ mặt phẳng cắt', <X className="w-4 h-4" />, () => geo.setSlice(null), {keep: true, disabled: geo.slice === null}),
    ];
  } else if (tierKey === 'draw/parts' && geo) {
    items = [
      back,
      sub('prev', 'Ẩn phần cuối', 'Bớt phần vừa vẽ', <ChevronLeft className="w-4 h-4" />, () => geo.prev(), {keep: true, disabled: geo.upTo <= 0}),
      sub('next', 'Vẽ phần tiếp', 'Hiện thêm phần tiếp theo của đề', <ChevronRight className="w-4 h-4" />, () => geo.next(), {keep: true, disabled: geo.upTo >= geo.parts - 1}),
    ];
  } else if (tierKey === 'draw/edit' && geo) {
    items = [
      back,
      sub('undo', 'Hoàn tác', 'Quay lại bước vẽ trước', <Undo2 className="w-4 h-4" />, () => geo.undo(), {keep: true, disabled: !geo.canUndo}),
      sub('redo', 'Làm lại', 'Làm lại bước vừa hoàn tác', <Redo2 className="w-4 h-4" />, () => geo.redo(), {keep: true, disabled: !geo.canRedo}),
      sub('remove', 'Xóa hình', 'Xóa hình đang chọn khỏi bảng', <Trash2 className="w-4 h-4" />, () => geo.remove(), {tone: 'text-rose-600'}),
    ];
  }

  // Chia đều 360 độ quanh tâm đĩa trắng (bắt đầu từ góc -90 độ đỉnh trên)
  const stepAngle = 360 / items.length;
  const angles = items.map((_, i) => -90 + i * stepAngle);

  return (
    <div
      ref={root}
      data-testid="ai-fab-root"
      className="fixed z-40 select-none touch-none transition-[left,top] duration-150 ease-out"
      style={{
        left: `${displayX}px`,
        top: `${displayY}px`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div data-testid="draggable-ai-hub" className="relative flex items-center justify-center">
        {/* ĐĨA XOAY TRÒN ĐẶC MÀU TRẮNG (Solid White Radial Turntable Disc) */}
        <div
          data-testid="ai-fab-menu"
          aria-hidden={!open}
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[216px] h-[216px] rounded-full bg-white/98 backdrop-blur-xl border border-[#E2E0D8] shadow-[0_18px_50px_rgba(15,23,42,0.26),0_2px_8px_rgba(15,23,42,0.08)] transition-all duration-200 flex items-center justify-center ${
            open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-50 pointer-events-none'
          }`}
        >
          {/* Vạch chia cung mảnh trên mặt đĩa trắng (Turntable Sector Dividers) */}
          <svg
            viewBox="0 0 216 216"
            className="absolute inset-0 w-full h-full pointer-events-none"
            aria-hidden="true"
          >
            <circle cx="108" cy="108" r="103" fill="none" stroke="#F1EFEA" strokeWidth="1" />
            <circle cx="108" cy="108" r="36" fill="none" stroke="#E6E4DD" strokeWidth="1" strokeDasharray="2 2" />
            {angles.map((ang, idx) => {
              const boundaryRad = ((ang + stepAngle / 2) * Math.PI) / 180;
              const x1 = 108 + 38 * Math.cos(boundaryRad);
              const y1 = 108 + 38 * Math.sin(boundaryRad);
              const x2 = 108 + 98 * Math.cos(boundaryRad);
              const y2 = 108 + 98 * Math.sin(boundaryRad);
              return (
                <line
                  key={idx}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#EFECE6"
                  strokeWidth="1"
                />
              );
            })}
          </svg>

          {/* Vành nút tác vụ nằm gọn bên trong mặt đĩa trắng */}
          <div data-testid="radial-action-menu" data-tier={tierKey || 'root'} key={tierKey} className="contents">
            {items.map((it, i) => {
              const rad = (angles[i] * Math.PI) / 180;
              const dist = 72;
              const rx = Math.round(108 + dist * Math.cos(rad));
              const ry = Math.round(108 + dist * Math.sin(rad));
              return (
                <button
                  key={it.id}
                  type="button"
                  data-testid={it.testid}
                  tabIndex={open ? 0 : -1}
                  disabled={it.disabled}
                  onClick={() => {
                    it.run();
                    if (!it.keep) setOpen(false);
                  }}
                  title={it.hint}
                  style={{
                    left: `${rx}px`,
                    top: `${ry}px`,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-[56px] h-[48px] rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all duration-150 hover:bg-stone-100/90 active:scale-95 cursor-pointer disabled:opacity-30 disabled:pointer-events-none ${
                    it.highlight ? it.activeTone : 'text-stone-700'
                  }`}
                >
                  <span data-testid={it.aliasTestId} className="pointer-events-none flex flex-col items-center justify-center gap-0.5">
                    <span className={it.tone}>{it.icon}</span>
                    <span className="text-[9.5px] font-medium text-stone-700 leading-none tracking-tight whitespace-nowrap">
                      {it.label}
                    </span>
                  </span>
                  {it.badge ? (
                    <span className="absolute -top-0.5 right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center shadow-2xs">
                      {it.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* THẺ TÁC VỤ CHO VÙNG ĐANG KHOANH: nằm ngay cạnh nút AI, không còn thanh riêng */}
        {hasPanel && (
          <div
            data-testid="ai-hub-panel"
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute z-20 w-[300px] max-w-[calc(100vw-24px)] rounded-2xl bg-white/97 backdrop-blur-xl border border-[#E2E0D8] shadow-[0_18px_50px_rgba(15,23,42,0.24)]"
            style={{
              ...(displayY > 360 ? { bottom: open ? 'calc(50% + 114px)' : 'calc(100% + 12px)' } : { top: open ? 'calc(50% + 114px)' : 'calc(100% + 12px)' }),
              ...(displayX > winW - 340 ? { right: '-14px' } : { left: open ? '50%' : '4px', ...(open ? { transform: 'translateX(-50%)' } : {}) }),
            }}
          >
            {panel}
          </div>
        )}

        {/* NÚT TÂM "AI" MÀU TRẮNG TINH KHIẾT (Center White Hub / Collapsed Floating Button) */}
        <button
          type="button"
          data-testid="ai-fab"
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          title="Đĩa xoay AI: Chạm giữ để kéo di chuyển khắp bảng • Chạm nhẹ để đóng/mở đĩa công cụ AI"
          className={`relative z-10 rounded-full flex flex-col items-center justify-center cursor-grab active:cursor-grabbing transition-all duration-200 select-none ${
            open
              ? 'w-[64px] h-[64px] bg-[#F8F7F4] hover:bg-stone-100 border-2 border-[#DCD9D0] text-stone-900 shadow-inner'
              : 'w-[54px] h-[54px] bg-white hover:bg-stone-50 border border-[#DCD9D0] text-stone-900 shadow-[0_8px_28px_rgba(15,23,42,0.22),0_2px_6px_rgba(15,23,42,0.08)] hover:scale-105'
          }`}
        >
          <span
            data-testid="radial-ai-hub-btn"
            className="flex flex-col items-center justify-center w-full h-full pointer-events-none"
          >
            {busy ? (
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            ) : (
              <>
                <span className="text-[15px] font-extrabold tracking-tight text-stone-800 leading-none font-sans">
                  AI
                </span>
                <span
                  className={`mt-0.5 text-[7.5px] font-semibold uppercase tracking-wider leading-none ${
                    detectedIntent === 'GRADE'
                      ? 'text-emerald-600'
                      : detectedIntent === 'VISUALIZE'
                      ? 'text-blue-600'
                      : 'text-stone-400'
                  }`}
                >
                  {geo?.tool ? (GEO_TOOLS.find((g) => g.id === geo.tool)?.label ?? 'Vẽ') : detectedIntent === 'GRADE' ? 'Chấm' : detectedIntent === 'VISUALIZE' ? 'Đồ thị' : open ? 'Đóng' : 'Công cụ'}
                </span>
              </>
            )}
          </span>

          {/* Chấm tròn báo số nét đang chọn */}
          {!open && selectionCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[9.5px] font-bold flex items-center justify-center border-2 border-white shadow-sm">
              {selectionCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
