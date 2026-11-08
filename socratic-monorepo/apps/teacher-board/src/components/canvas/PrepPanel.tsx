'use client';

import React, {useState} from 'react';
import {ClipboardList, X} from 'lucide-react';
import type {BoardPrep} from '../../utils/boardSession';

const KIND: Record<string, string> = {slides: 'Slide', exercise: 'Bài tập', exam: 'Đề'};

/**
 * "Chuẩn bị của tiết": những gì giáo viên soạn trước ở trang quản lý (tài nguyên, mô phỏng định mở, giáo án theo mục).
 * Một chạm mở tài nguyên hoặc mô phỏng; giáo án hiện để giáo viên bám trình tự (đáp án không bao giờ tới bảng).
 */
export function PrepPanel({prep, onOpenResource, onOpenSim}: {prep: BoardPrep; onOpenResource: (id: string) => void; onOpenSim: (templateId: string) => void}) {
  const [open, setOpen] = useState(false);
  const plan = prep.plan?.body;
  const sims = new Map([...Object.entries(prep.simTitles), ...prep.sims.map((s): [string, string] => [s.id, s.title])]);
  return (
    <>
      <button data-testid="prep-toggle" onClick={() => setOpen((v) => !v)}
        className="absolute left-3 bottom-[16.25rem] z-30 pointer-events-auto flex items-center gap-1.5 rounded-full border border-blue-300 bg-blue-50/95 px-3 py-1.5 text-[11px] font-medium text-blue-800 shadow-md hover:bg-blue-100">
        <ClipboardList className="h-3.5 w-3.5" /> Chuẩn bị của tiết
      </button>
      {open && (
        <div data-testid="prep-panel" className="absolute left-3 bottom-[18.75rem] z-40 pointer-events-auto flex max-h-[60vh] w-80 flex-col gap-2 overflow-y-auto rounded-xl border border-stone-200 bg-white p-3 text-sm shadow-xl">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-stone-800">Chuẩn bị của tiết</span>
            <button aria-label="Đóng" onClick={() => setOpen(false)} className="rounded p-1 text-stone-500 hover:bg-stone-100"><X className="h-4 w-4" /></button>
          </div>
          {prep.resources.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase text-stone-500">Tài nguyên</div>
              {prep.resources.map((r) => (
                <button key={r.id} data-testid="prep-resource" onClick={() => (onOpenResource(r.id), setOpen(false))} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-stone-100">
                  <span className="rounded bg-stone-100 px-1.5 text-[10px] text-stone-600">{KIND[r.kind] ?? r.kind}</span>
                  <span className="truncate">{r.title}</span>
                </button>
              ))}
            </div>
          )}
          {prep.sims.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase text-stone-500">Mô phỏng</div>
              {prep.sims.map((s) => (
                <button key={s.id} data-testid="prep-sim" onClick={() => (onOpenSim(s.id), setOpen(false))} className="w-full rounded-lg px-2 py-1.5 text-left hover:bg-stone-100">{s.title}</button>
              ))}
            </div>
          )}
          {plan && (
            <div data-testid="prep-plan">
              <div className="text-[11px] font-semibold uppercase text-stone-500">Giáo án: {plan.title}</div>
              <ol className="flex flex-col gap-2">
                {plan.sections.map((sec, i) => (
                  <li key={sec.id} className="rounded-lg bg-stone-50 p-2">
                    <div className="font-semibold text-stone-800">{i + 1}. {sec.title}</div>
                    {sec.objective && <div className="text-xs text-stone-500">{sec.objective}</div>}
                    <ul className="mt-1 flex flex-col gap-1 text-xs">
                      {sec.items.map((it) => (
                        <li key={it.id}>
                          {it.type === 'formula' && <span className="font-mono text-stone-700">{it.latex}{it.caption ? ` — ${it.caption}` : ''}</span>}
                          {it.type === 'problem' && <span className="text-stone-700">Bài: {it.text}</span>}
                          {it.type === 'poll' && <span className="text-stone-700">Hỏi nhanh: {it.question} ({it.options.join(' / ')})</span>}
                          {it.type === 'sim' && (
                            <button data-testid="prep-plan-sim" onClick={() => (onOpenSim(it.templateId), setOpen(false))} className="rounded border border-blue-200 px-1.5 py-0.5 text-blue-800 hover:bg-blue-50">
                              ▶ {sims.get(it.templateId) ?? 'Mở mô phỏng'}
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </>
  );
}
