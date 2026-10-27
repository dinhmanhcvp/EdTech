'use client';

import React from 'react';
import {ChevronLeft, ChevronRight, Maximize, Minimize, Minus, Plus, ScanSearch, FilePlus2, Trash2} from 'lucide-react';

interface Props {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  isFullscreen: boolean;
  onFullscreen: () => void;
  page: number;
  pageCount: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onAddPage: () => void;
  onDeletePage: () => void;
}

const btn = 'inline-flex items-center justify-center w-8 h-8 rounded-lg text-stone-700 hover:bg-stone-100 active:bg-stone-200 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer';

/** Thanh nhỏ góc trái dưới như các bảng trắng trực tuyến: trang, thu phóng, vừa khung, toàn màn hình. */
export const BoardViewControls: React.FC<Props> = (p) => (
  <div data-testid="board-view-controls" className="fixed top-3 left-3 z-40 flex items-center gap-1.5 select-none">
    <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E6E4DD] shadow-[0_6px_24px_-8px_rgba(20,20,19,0.25)]">
      <button data-testid="page-prev" className={btn} onClick={p.onPrevPage} disabled={p.page <= 0} title="Trang trước">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span data-testid="page-indicator" className="min-w-[48px] text-center text-xs font-mono font-semibold text-stone-800" title="Trang hiện tại / tổng số trang">
        {p.page + 1} / {p.pageCount}
      </span>
      <button data-testid="page-next" className={btn} onClick={p.onNextPage} disabled={p.page >= p.pageCount - 1} title="Trang sau">
        <ChevronRight className="w-4 h-4" />
      </button>
      <button data-testid="page-add" className={btn} onClick={p.onAddPage} title="Thêm trang trắng mới">
        <FilePlus2 className="w-4 h-4" />
      </button>
      <button data-testid="page-delete" className={btn} onClick={p.onDeletePage} disabled={p.pageCount <= 1} title="Xóa trang này">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
    <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-2xl bg-white/95 backdrop-blur-md border border-[#E6E4DD] shadow-[0_6px_24px_-8px_rgba(20,20,19,0.25)]">
      <button data-testid="zoom-out" className={btn} onClick={p.onZoomOut} title="Thu nhỏ (Ctrl + −)">
        <Minus className="w-4 h-4" />
      </button>
      <button data-testid="zoom-level" className="min-w-[52px] h-8 rounded-lg text-xs font-mono font-semibold text-stone-800 hover:bg-stone-100 cursor-pointer" onClick={p.onFit} title="Về 100% và vừa khung">
        {Math.round(p.zoom * 100)}%
      </button>
      <button data-testid="zoom-in" className={btn} onClick={p.onZoomIn} title="Phóng to (Ctrl + +)">
        <Plus className="w-4 h-4" />
      </button>
      <button data-testid="zoom-fit" className={btn} onClick={p.onFit} title="Vừa khung (Ctrl + 0)">
        <ScanSearch className="w-4 h-4" />
      </button>
      <button data-testid="btn-fullscreen" className={btn} onClick={p.onFullscreen} title="Toàn màn hình: bảng to nhất có thể">
        {p.isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
      </button>
    </div>
  </div>
);
