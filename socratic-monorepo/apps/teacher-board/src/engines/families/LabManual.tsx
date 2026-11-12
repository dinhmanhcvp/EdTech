'use client';

import React, {useState} from 'react';
import {BASICS, MANUAL, toolsOf} from '../../utils/lab/hands/manual';
import {SUBJECT_OF} from '../../utils/lab/hands/sims/catalog';

/** id của bài đang mở: khung chung của mọi bài đọc để hiện đúng hướng dẫn */
export const LabIdContext = React.createContext('');

/**
 * Tab "Hướng dẫn": mục tiêu, từng bước (làm gì + vì sao) và kết luận. Bài HÓA chỉ hiện thao tác từng bước: tính chất của chất, hiện tượng và phương trình
 * hiện ngay trên chất và trên chính phản ứng trong cảnh 3D (thẻ trên chai, thẻ trên ống), không nằm trong tab này. Bước đang làm mở rộng, các bước khác thu gọn còn một dòng. */
export const LabManual: React.FC<{id: string}> = ({id}) => {
  const m = MANUAL[id];
  const [at, setAt] = useState(0);
  if (!m) return <p className="text-[#4B473D]">Bài này chưa có hướng dẫn.</p>;
  const last = at >= m.steps.length - 1;
  const tools = toolsOf(id);
  const inScene = SUBJECT_OF[id] === 'hoa';
  return (
    <div data-testid="lab-manual" className="flex flex-col gap-2 leading-relaxed">
      <p className="rounded-xl bg-[#2459C9]/[.08] px-3 py-2 text-[#1D1B16]">
        <b className="block text-[11px] font-semibold uppercase tracking-wide text-[#2459C9]">Mục tiêu</b>
        {m.goal}
      </p>
      {inScene && (
        <p data-testid="lab-in-scene" className="rounded-xl bg-[#0E7C66]/[.08] px-3 py-2 text-[#1D1B16]">
          Tính chất của chất, hiện tượng và phương trình phản ứng hiện ngay trên chất và trên dụng cụ trong cảnh 3D: trỏ vào chai, nhìn thẻ trên ống đang phản ứng.
        </p>
      )}
      <details data-testid="lab-basics" className="rounded-xl border border-[#1D1B16]/10 bg-white/60 px-3 py-2">
        <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wide text-[#4B473D]">Trước khi làm: cách dùng tay</summary>
        <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-[#4B473D]">
          {BASICS.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ol>
      </details>
      {tools.length > 0 && (
        <details open data-testid="lab-tools" className="rounded-xl border border-[#1D1B16]/10 bg-white/60 px-3 py-2">
          <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wide text-[#4B473D]">Dụng cụ trên bàn và cách điều khiển</summary>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[#4B473D]">
            {tools.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </details>
      )}
      <ol className="flex flex-col gap-1.5">
        {m.steps.map((s, i) => (
          <li key={i} data-testid={`lab-step-${i}`} data-open={i === at} className={`rounded-xl border px-3 py-2 ${i === at ? 'border-[#D9481C]/50 bg-white' : 'border-[#1D1B16]/10 bg-white/50'}`}>
            <button type="button" aria-expanded={i === at} onClick={() => setAt(i)} className="flex w-full items-start gap-2 text-left">
              <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${i < at ? 'bg-[#1F7A4D] text-white' : i === at ? 'bg-[#D9481C] text-white' : 'bg-[#1D1B16]/10 text-[#4B473D]'}`}>{i < at ? '✓' : i + 1}</span>
              <span className={i === at ? 'font-semibold text-[#1D1B16]' : 'text-[#4B473D]'}>
                <span className="mr-1 font-mono text-[10px] uppercase tracking-wide opacity-60">
                  Bước {i + 1}/{m.steps.length}
                </span>
                {s.do}
              </span>
            </button>
            {i === at && (
              <div className="mt-1.5 flex flex-col gap-1.5 border-l-2 border-[#D9481C]/40 pl-2.5 text-[#4B473D]">
                {s.how && (
                  <ol data-testid="lab-step-how" className="list-[lower-alpha] space-y-1 pl-4 text-[#1D1B16]">
                    {s.how.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ol>
                )}
                {!inScene && s.see && (
                  <p data-testid="lab-step-see">
                    <b className="font-semibold text-[#1F7A4D]">Quan sát: </b>
                    {s.see}
                  </p>
                )}
                {!inScene && (
                  <p>
                    <b className="font-semibold text-[#D9481C]">Giải thích: </b>
                    {s.why}
                  </p>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
      <div className="flex gap-1.5">
        <button type="button" data-testid="lab-step-prev" disabled={at === 0} onClick={() => setAt(at - 1)} className="rounded-full border border-[#1D1B16]/20 bg-white px-4 font-medium disabled:opacity-40">
          ← Bước trước
        </button>
        <button type="button" data-testid="lab-step-next" disabled={last} onClick={() => setAt(at + 1)} className="rounded-full border border-[#1D1B16] bg-[#1D1B16] px-4 font-medium text-[#F3EFE6] disabled:opacity-40">
          Bước tiếp →
        </button>
      </div>
      {last && !inScene && (
        <p data-testid="lab-conclude" className="rounded-xl bg-[#1F7A4D]/[.09] px-3 py-2 text-[#1D1B16]">
          <b className="block text-[11px] font-semibold uppercase tracking-wide text-[#1F7A4D]">Kết luận</b>
          {m.conclude}
        </p>
      )}
    </div>
  );
};
