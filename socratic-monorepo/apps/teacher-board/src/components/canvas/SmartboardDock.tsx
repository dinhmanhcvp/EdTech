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
} from 'lucide-react';
import type {CanvasTool, ShapeType, GridPattern} from './SmartboardCanvas';

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

// ====================================================================== NÚT AI NỔI
export interface AiFabProps {
  selectionCount: number;
  busy: boolean;
  listening: boolean;
  onConvert: () => void;
  onVisualize: () => void;
  onLasso: () => void;
  onVoice: () => void;
}

/** Một nút nổi duy nhất cho mọi tác vụ AI; chạm để bung ra các chức năng nhỏ. */
export const AiFab: React.FC<AiFabProps> = ({selectionCount, busy, listening, onConvert, onVisualize, onLasso, onVoice}) => {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement | null>(null);
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

  const items: {id: string; testid: string; label: string; hint: string; icon: React.ReactNode; run: () => void; accent: string; badge?: number}[] = [
    {id: 'voice', testid: 'ai-fab-voice', label: listening ? 'Đang nghe…' : 'Giọng nói', hint: 'Đọc công thức bằng giọng nói', icon: listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />, run: onVoice, accent: 'bg-rose-500'},
    {id: 'lasso', testid: 'ai-fab-lasso', label: 'Khoanh vùng AI', hint: 'Khoanh nét viết hoặc hình vẽ', icon: <Lasso className="w-5 h-5" />, run: onLasso, accent: 'bg-sky-600'},
    {id: 'viz', testid: 'top-toolbar-btn-visualize', label: 'Trực quan hóa', hint: selectionCount ? `Dựng mô phỏng từ ${selectionCount} nét đã chọn` : 'Khoanh vùng trước, rồi chạm', icon: busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />, run: onVisualize, accent: 'bg-blue-600', badge: selectionCount || undefined},
    {id: 'conv', testid: 'tool-convert-ink', label: 'Chữ → Công thức', hint: 'Chuyển chữ viết tay thành công thức chuẩn', icon: <Wand2 className="w-5 h-5" />, run: onConvert, accent: 'bg-violet-600'},
  ];

  return (
    <div ref={root} className="fixed right-5 bottom-5 z-40 flex flex-col items-end gap-2" data-testid="ai-fab-root">
      <div className="flex flex-col items-end gap-2" data-testid="ai-fab-menu" aria-hidden={!open}>
        {items.map((it, i) => (
          <button
            key={it.id}
            data-testid={it.testid}
            tabIndex={open ? 0 : -1}
            onClick={() => {
              it.run();
              setOpen(false);
            }}
            title={it.hint}
            style={{transitionDelay: open ? `${(items.length - 1 - i) * 35}ms` : '0ms'}}
            className={`group flex items-center gap-2.5 transition-all duration-200 ${open ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-3 scale-90 pointer-events-none'}`}
          >
            <span className="px-3 py-1.5 rounded-full bg-white/97 border border-[#E6E4DD] shadow-md text-xs font-semibold text-stone-800 whitespace-nowrap">{it.label}</span>
            <span className={`relative w-11 h-11 rounded-full ${it.accent} text-white shadow-lg flex items-center justify-center group-hover:scale-105 transition-transform`}>
              {it.icon}
              {it.badge ? <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-white text-stone-900 text-[10px] font-bold flex items-center justify-center border border-stone-200">{it.badge}</span> : null}
            </span>
          </button>
        ))}
      </div>
      <button
        data-testid="ai-fab"
        onClick={() => setOpen((o) => !o)}
        title="Công cụ AI"
        className={`relative w-14 h-14 rounded-full shadow-[0_10px_30px_rgba(37,99,235,0.45)] flex items-center justify-center text-white transition-all duration-200 ${open ? 'bg-stone-900 rotate-90' : 'bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 hover:scale-105'}`}
      >
        {open ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
        {!open && selectionCount > 0 && <span className="absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full bg-white text-blue-700 text-[11px] font-bold flex items-center justify-center border border-blue-200">{selectionCount}</span>}
        {busy && <span className="absolute inset-0 rounded-full ring-4 ring-blue-300/60 animate-ping" />}
      </button>
    </div>
  );
};
