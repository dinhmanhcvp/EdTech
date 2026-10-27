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
} from 'lucide-react';
import type {CanvasTool, ShapeType, GridPattern} from './SmartboardCanvas';
import { type Subject, SUBJECT_LABEL } from '../../utils/subjectContext';

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
        <button data-testid="tool-lasso" onClick={() => p.onTool('LASSO')} className={`${base} ${p.tool === 'LASSO' ? on : idle}`} title="Chọn / khoanh vùng để di chuyển hoặc dùng AI">
          <MousePointer2 className="w-5 h-5" />
          Chọn
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

        <button
          data-testid="tool-shape"
          onClick={() => setPop(pop === 'shape' ? null : 'shape')}
          className={`${base} ${shapeActive ? on : idle}`}
          title="Hình vẽ: tròn, thẳng, mũi tên, chữ nhật"
        >
          {shapeActive ? ShapeIcon[p.selectedShape] : <Shapes className="w-5 h-5" />}
          Hình
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
  onGrade?: () => void;
  subjectLock?: Subject | null;
  onCycleSubject?: () => void;
  detectedIntent?: 'VISUALIZE' | 'GRADE' | null;
}

/**
 * Nút công cụ AI đa năng cao cấp:
 * - Có thể chạm giữ và kéo di chuyển tự do khắp mặt bảng bằng tay.
 * - Nhấp nhẹ vào nút để mở vòng tròn tác vụ tròn (Radial Fan-out Menu) xung quanh nút.
 * - Thiết kế kính mờ đa tầng (frosted obsidian glass), quầng sáng huyền ảo và viền kim loại sang trọng.
 */
export const AiFab: React.FC<AiFabProps> = ({
  selectionCount,
  busy,
  listening,
  onConvert,
  onVisualize,
  onLasso,
  onVoice,
  onGrade,
  subjectLock,
  onCycleSubject,
  detectedIntent,
}) => {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement | null>(null);

  // Vị trí kéo di chuyển của nút AI trên toàn màn hình bảng
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const justToggledByPointerRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);

  useEffect(() => {
    const away = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', away);
    window.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      window.removeEventListener('keydown', esc);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    isDraggingRef.current = false;
    const winW = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 675;
    const curX = pos?.x ?? winW - 56;
    const curY = pos?.y ?? winH - 56;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: curX,
      initY: curY,
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
      const winW = typeof window !== 'undefined' ? window.innerWidth : 1200;
      const winH = typeof window !== 'undefined' ? window.innerHeight : 675;
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

  const winW = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const winH = typeof window !== 'undefined' ? window.innerHeight : 675;
  const curX = pos ? pos.x : winW - 56;
  const curY = pos ? pos.y : winH - 56;

  const isNearRight = curX > winW - 160;
  const isNearBottom = curY > winH - 160;
  const isNearLeft = curX < 160;
  const isNearTop = curY < 160;

  const items = [
    {
      id: 'conv',
      testid: 'tool-convert-ink',
      aliasTestId: 'radial-action-latex',
      label: 'Chuyển LaTeX',
      hint: 'Chuyển chữ viết tay thành công thức chuẩn',
      icon: <Wand2 className="w-5 h-5" />,
      run: onConvert,
      accent: 'bg-gradient-to-br from-violet-600 to-indigo-700 text-white border-violet-300 shadow-violet-500/35',
      badge: undefined,
      highlight: false,
    },
    {
      id: 'viz',
      testid: 'top-toolbar-btn-visualize',
      aliasTestId: 'radial-action-visualize',
      label: 'Trực quan hóa',
      hint: selectionCount ? `Dựng mô phỏng từ ${selectionCount} nét đã chọn` : 'Khoanh vùng rồi kích hoạt mô phỏng',
      icon: busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />,
      run: onVisualize,
      accent: 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white border-blue-300 shadow-blue-500/35',
      badge: selectionCount || undefined,
      highlight: detectedIntent === 'VISUALIZE',
    },
    {
      id: 'grade',
      testid: 'ai-fab-grade',
      aliasTestId: 'radial-action-grade',
      label: 'Chấm bài',
      hint: 'Chấm bài giải học sinh theo bước',
      icon: <GraduationCap className="w-5 h-5" />,
      run: onGrade || onConvert,
      accent: 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white border-emerald-300 shadow-emerald-500/35',
      badge: undefined,
      highlight: detectedIntent === 'GRADE',
    },
    {
      id: 'lasso',
      testid: 'ai-fab-lasso',
      aliasTestId: 'radial-action-close',
      label: 'Khoanh vùng AI',
      hint: 'Khoanh nét viết hoặc hình vẽ trên bảng',
      icon: <Lasso className="w-5 h-5" />,
      run: onLasso,
      accent: 'bg-gradient-to-br from-sky-500 to-blue-600 text-white border-sky-300 shadow-sky-500/35',
      badge: undefined,
      highlight: false,
    },
    {
      id: 'subject',
      testid: 'ai-fab-subject',
      aliasTestId: 'radial-action-subject',
      label: subjectLock ? SUBJECT_LABEL[subjectLock] : 'Môn: Tự động',
      hint: 'Đổi ngữ cảnh phân môn Toán, Lý, Hóa, Sinh',
      icon: <BookOpen className="w-5 h-5" />,
      run: onCycleSubject || (() => {}),
      accent: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white border-amber-300 shadow-amber-500/35',
      badge: undefined,
      highlight: false,
    },
    {
      id: 'voice',
      testid: 'ai-fab-voice',
      aliasTestId: 'radial-action-voice',
      label: listening ? 'Đang nghe…' : 'Giọng nói',
      hint: 'Đọc công thức bằng giọng nói',
      icon: listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />,
      run: onVoice,
      accent: listening
        ? 'bg-gradient-to-br from-rose-600 to-red-600 text-white border-rose-300 shadow-rose-500/35 animate-pulse'
        : 'bg-gradient-to-br from-rose-500 to-pink-600 text-white border-rose-300 shadow-rose-500/35',
      badge: undefined,
      highlight: false,
    },
  ];

  const getAngles = (): number[] => {
    const count = items.length;
    if (isNearRight && isNearBottom) {
      const start = -195;
      const end = -75;
      const step = (end - start) / (count - 1);
      return items.map((_, i) => start + i * step);
    }
    if (isNearLeft && isNearBottom) {
      const start = -105;
      const end = 15;
      const step = (end - start) / (count - 1);
      return items.map((_, i) => start + i * step);
    }
    if (isNearTop) {
      const start = 15;
      const end = 165;
      const step = (end - start) / (count - 1);
      return items.map((_, i) => start + i * step);
    }
    if (isNearRight) {
      const start = 110;
      const end = 250;
      const step = (end - start) / (count - 1);
      return items.map((_, i) => start + i * step);
    }
    const step = 360 / count;
    return items.map((_, i) => -90 + i * step);
  };

  const angles = getAngles();

  return (
    <div
      ref={root}
      data-testid="ai-fab-root"
      className="fixed z-40 select-none touch-none"
      style={
        pos
          ? { left: `${pos.x}px`, top: `${pos.y}px`, transform: 'translate(-50%, -50%)' }
          : { right: '24px', bottom: '24px' }
      }
    >
      <div data-testid="draggable-ai-hub" className="contents">
        {/* Vòng tròn tác vụ bung tròn đều xung quanh nút AI */}
        <div
          data-testid="ai-fab-menu"
          aria-hidden={!open}
          className="absolute inset-0 pointer-events-none"
        >
          <div data-testid="radial-action-menu" className="contents">
            {items.map((it, i) => {
              const rad = (angles[i] * Math.PI) / 180;
              const dist = 94;
              const rx = Math.round(dist * Math.cos(rad));
              const ry = Math.round(dist * Math.sin(rad));
              return (
                <div
                  key={it.id}
                  style={{
                    left: `${rx}px`,
                    top: `${ry}px`,
                    transitionDelay: open ? `${i * 25}ms` : '0ms',
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 transition-all duration-200 ${
                    open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-75 pointer-events-none'
                  }`}
                >
                  <button
                    type="button"
                    data-testid={it.testid}
                    tabIndex={open ? 0 : -1}
                    onClick={() => {
                      it.run();
                      setOpen(false);
                    }}
                    title={it.hint}
                    className={`relative w-12 h-12 rounded-full border-2 shadow-xl flex items-center justify-center transition-all duration-150 hover:scale-115 active:scale-95 cursor-pointer ${
                      it.accent
                    } ${it.highlight ? 'ring-4 ring-white/80 shadow-[0_0_20px_rgba(255,255,255,0.7)] animate-pulse' : ''}`}
                  >
                    <span data-testid={it.aliasTestId} className="hidden" />
                    {it.icon}
                    {it.badge ? (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-white text-stone-900 text-[10px] font-bold flex items-center justify-center border border-stone-200 shadow-sm">
                        {it.badge}
                      </span>
                    ) : null}
                  </button>
                  <span className="px-2.5 py-0.5 rounded-full bg-stone-900/90 backdrop-blur-md border border-white/20 shadow-lg text-[10px] font-semibold text-white whitespace-nowrap select-none">
                    {it.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Nút AI chính: Thiết kế kính mờ cao cấp, viền phát quang và kéo di chuyển khắp bảng */}
        <div className="relative group flex items-center justify-center">
          {/* Luminous Glow Ambient Ring */}
          <div
            className={`absolute -inset-1.5 rounded-full bg-gradient-to-tr from-blue-500/40 via-violet-500/30 to-amber-400/40 blur-md transition-opacity duration-300 pointer-events-none ${
              open ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'
            }`}
          />

          <button
            type="button"
            data-testid="ai-fab"
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            title="Công cụ AI: Chạm giữ để kéo di chuyển khắp bảng • Nhấp để mở vòng tròn tác vụ"
            className={`relative w-15 h-15 rounded-full flex flex-col items-center justify-center cursor-grab active:cursor-grabbing border-2 shadow-[0_12px_36px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.35)] transition-all duration-200 select-none ${
              open
                ? 'bg-stone-900 border-white/40 ring-4 ring-white/10 scale-95'
                : detectedIntent === 'GRADE'
                ? 'bg-gradient-to-b from-stone-900 via-stone-900 to-emerald-950 border-emerald-400 ring-4 ring-emerald-500/25 hover:scale-105'
                : 'bg-gradient-to-b from-stone-900 via-stone-900 to-blue-950 border-cyan-400/80 ring-4 ring-cyan-500/25 hover:scale-105'
            }`}
          >
            <span data-testid="radial-ai-hub-btn" className="hidden" />

            {/* 3 tactile grip micro-dots */}
            <div className="flex items-center gap-0.5 absolute top-1.5 opacity-60">
              <span className="w-1 h-1 rounded-full bg-white/80" />
              <span className="w-1 h-1 rounded-full bg-white/80" />
              <span className="w-1 h-1 rounded-full bg-white/80" />
            </div>

            {/* Center Glyph */}
            {open ? (
              <X className="w-6 h-6 text-white transition-transform duration-200 rotate-90" />
            ) : busy ? (
              <Loader2 className="w-6 h-6 text-cyan-300 animate-spin" />
            ) : (
              <Sparkles className="w-6 h-6 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)] animate-pulse" />
            )}

            {/* Sub-label pill attached to bottom */}
            <span
              className={`absolute -bottom-2 text-[8px] font-bold tracking-wider uppercase px-2 py-0.2 rounded-full shadow-md border ${
                detectedIntent === 'GRADE'
                  ? 'bg-emerald-600 text-white border-emerald-300'
                  : detectedIntent === 'VISUALIZE'
                  ? 'bg-blue-600 text-white border-blue-300'
                  : 'bg-stone-800 text-stone-200 border-stone-600'
              }`}
            >
              {detectedIntent === 'GRADE' ? 'CHẤM' : detectedIntent === 'VISUALIZE' ? 'TRỰC QUAN' : 'AI HUB'}
            </span>

            {/* Selection badge */}
            {!open && selectionCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] font-extrabold flex items-center justify-center border border-white/60 shadow-md animate-bounce">
                {selectionCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
