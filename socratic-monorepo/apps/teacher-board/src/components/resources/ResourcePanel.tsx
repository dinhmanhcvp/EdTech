'use client';

import React, {useEffect, useState} from 'react';
import {FolderOpen, X} from 'lucide-react';
import {BoardHubError, hubBoard, type ResourceItem, type ResourceKind} from '../../utils/hubBoard';

const TABS: [ResourceKind, string][] = [['slides', 'Slide'], ['exercise', 'Bài tập'], ['exam', 'Đề']];

/** Ngăn "Tài nguyên": slide / bài tập / đề của giáo viên đang dạy (cần bảng đã ghép tiết). */
export function ResourcePanel({paired, onOpen}: {paired: boolean; onOpen: (id: string) => void}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ResourceKind>('slides');
  const [items, setItems] = useState<ResourceItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !paired) return;
    setError(null);
    hubBoard.resources().then(setItems).catch((e) => setError(e instanceof BoardHubError ? e.message : 'Không tải được tài nguyên.'));
  }, [open, paired]);

  return (
    <>
      {/* cột nút bên trái cách nhau 2,5rem: dòng thời gian 3 · vi bài giảng 14 · thư viện 6,25 · sinh đề 8,75 · ghép tiết 11,25 · tài nguyên 13,75 */}
      <button data-testid="resources-toggle" onClick={() => setOpen((v) => !v)}
        className="absolute left-3 bottom-[13.75rem] z-30 pointer-events-auto flex items-center gap-1.5 rounded-full border border-[#DCD9D0] bg-white/95 px-3 py-1.5 text-[11px] font-medium text-stone-700 shadow-md hover:bg-stone-50">
        <FolderOpen className="h-3.5 w-3.5" /> Tài nguyên
      </button>
      {open && (
        <div data-testid="resources-panel" className="absolute left-3 bottom-[16.25rem] z-40 pointer-events-auto w-72 rounded-xl border border-stone-200 bg-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-stone-800">Tài nguyên của tiết</span>
            <button aria-label="Đóng" onClick={() => setOpen(false)} className="rounded p-1 text-stone-500 hover:bg-stone-100"><X className="h-4 w-4" /></button>
          </div>
          {!paired ? (
            <p className="text-xs text-stone-500">Ghép bảng với tiết để mở tài nguyên.</p>
          ) : (
            <>
              <div className="mb-2 flex gap-1">
                {TABS.map(([k, label]) => (
                  <button key={k} data-testid={`rtab-${k}`} aria-pressed={tab === k} onClick={() => setTab(k)} className="rounded-full border border-stone-200 px-2.5 py-0.5 text-xs aria-[pressed=true]:border-blue-600 aria-[pressed=true]:bg-blue-50 aria-[pressed=true]:text-blue-700">
                    {label}
                  </button>
                ))}
              </div>
              {error && <p className="text-xs text-rose-600">{error}</p>}
              {items === null && !error && <p className="text-xs text-stone-500">Đang tải…</p>}
              <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
                {items?.filter((i) => i.kind === tab).map((i) => (
                  <li key={i.id}>
                    <button onClick={() => (onOpen(i.id), setOpen(false))} className="w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-stone-100">
                      <span className="block font-medium text-stone-800">{i.title}</span>
                      <span className="text-[11px] text-stone-500">{i.pageCount} trang</span>
                    </button>
                  </li>
                ))}
                {items && !items.some((i) => i.kind === tab) && <li className="text-xs text-stone-500">Chưa có mục nào. Tải lên ở trang quản lý → Tài nguyên.</li>}
              </ul>
            </>
          )}
        </div>
      )}
    </>
  );
}
