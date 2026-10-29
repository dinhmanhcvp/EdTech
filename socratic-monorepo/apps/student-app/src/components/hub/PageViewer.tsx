'use client';

import React, {useEffect, useState} from 'react';
import {ChevronLeft, ChevronRight, ZoomIn, ZoomOut} from 'lucide-react';
import {hubApi} from '../../utils/hubApi';

/** Xem trang đề / slide của tiết: lật trang, thu phóng (cuộn để di chuyển khi phóng to). */
export function PageViewer({assignmentId, pages}: {assignmentId: string; pages: {page: number}[]}) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const page = pages[i]?.page ?? 0;

  useEffect(() => {
    let alive = true;
    setUrl(null);
    setFailed(false);
    hubApi.pageUrl(assignmentId, page).then((u) => alive && setUrl(u)).catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [assignmentId, page]);

  if (!pages.length) return null;
  const btn = 'rounded-lg border border-stone-200 bg-white p-1.5 disabled:opacity-40';
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-xs text-stone-600">
        <button aria-label="Trang trước" className={btn} disabled={i === 0} onClick={() => setI(i - 1)}><ChevronLeft className="h-4 w-4" /></button>
        <span>Trang {i + 1}/{pages.length}</span>
        <button aria-label="Trang sau" className={btn} disabled={i >= pages.length - 1} onClick={() => setI(i + 1)}><ChevronRight className="h-4 w-4" /></button>
        <button aria-label="Thu nhỏ" className={`${btn} ml-auto`} disabled={zoom <= 1} onClick={() => setZoom(Math.max(1, zoom - 0.5))}><ZoomOut className="h-4 w-4" /></button>
        <span>{Math.round(zoom * 100)}%</span>
        <button aria-label="Phóng to" className={btn} disabled={zoom >= 4} onClick={() => setZoom(Math.min(4, zoom + 0.5))}><ZoomIn className="h-4 w-4" /></button>
      </div>
      <div className="max-h-[70vh] overflow-auto rounded-lg border border-stone-200 bg-stone-100">
        {url ? <img src={url} alt={`Trang ${i + 1}`} style={{width: `${zoom * 100}%`, maxWidth: 'none'}} className="block" />
          : <div className="p-6 text-center text-xs text-stone-500">{failed ? 'Không tải được trang.' : 'Đang tải trang…'}</div>}
      </div>
    </div>
  );
}
