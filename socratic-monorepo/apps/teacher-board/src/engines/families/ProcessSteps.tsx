'use client';

import React, {useEffect, useState} from 'react';
import type {ProcessData, ProcessFrame, ProcessItem} from '../../utils/presets/types';
import {usePrefersReducedMotion} from '../visualKit';

/** Khung hiệu lực ở bước `step`: khung cuối có at ≤ step; chưa có khung nào thì ẩn. */
export function frameAt(item: ProcessItem, step: number): (ProcessFrame & {o: number}) | null {
  let f: ProcessFrame | null = null;
  for (const fr of item.frames) if (fr.at <= step) f = fr;
  return f ? {...f, o: f.o ?? 1} : null;
}

/** Chuỗi bước/chu trình: các vật xuất hiện, di chuyển, đổi nhãn/màu theo bước; chạy tay hoặc tự động. */
export const ProcessSteps: React.FC<{id: string; data: ProcessData}> = ({id, data}) => {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reduced = usePrefersReducedMotion();
  const last = data.steps.length - 1;

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setStep((s) => (s >= last ? s : s + 1)), 2600);
    return () => clearInterval(t);
  }, [playing, last]);
  useEffect(() => {
    if (step >= last) setPlaying(false);
  }, [step, last]);

  const [vw, vh] = data.viewBox;
  const trans = reduced ? 'none' : 'transform 0.7s ease, opacity 0.5s ease';
  return (
    <div className="p-4 flex flex-col gap-3" data-testid="process-steps" data-preset={id} data-step={step}>
      <svg viewBox={`0 0 ${vw} ${vh}`} className="w-full rounded-xl border border-[#E6E4DD] bg-gradient-to-b from-white to-[#FAF9F6]">
        {data.items.map((it) => {
          const f = frameAt(it, step);
          const x = f?.x ?? it.frames[0]?.x ?? 0;
          const y = f?.y ?? it.frames[0]?.y ?? 0;
          const label = f?.label ?? it.label;
          const fill = f?.fill ?? it.fill;
          const w = it.w ?? 0;
          const h = it.h ?? 0;
          return (
            <g
              key={it.id}
              data-testid={`process-item-${it.id}`}
              data-x={x}
              data-y={y}
              data-o={f ? f.o : 0}
              data-label={label ?? ''}
              style={{transform: `translate(${x}px, ${y}px)`, opacity: f ? f.o : 0, transition: trans}}
              pointerEvents="none"
            >
              {it.kind === 'circle' && <circle r={it.r ?? 10} fill={fill} stroke={it.stroke} strokeWidth="2" />}
              {(it.kind === 'rect' || it.kind === 'pill') && <rect width={w} height={h} rx={it.kind === 'pill' ? h / 2.4 : 4} fill={fill} stroke={it.stroke} strokeWidth="2" />}
              {label && (
                <text
                  x={it.kind === 'text' ? 0 : it.kind === 'circle' ? 0 : w / 2}
                  y={it.kind === 'text' ? 0 : it.kind === 'circle' ? 4 : h / 2 + 4}
                  textAnchor={it.kind === 'text' ? 'start' : 'middle'}
                  fontSize="12"
                  fontWeight="600"
                  fill={it.kind === 'text' ? it.fill : '#292524'}
                >
                  {label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="flex flex-wrap items-center gap-2">
        <button data-testid="process-prev" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-stone-300 bg-white disabled:opacity-40">← Bước trước</button>
        <button data-testid="process-next" disabled={step === last} onClick={() => setStep((s) => Math.min(last, s + 1))} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white disabled:opacity-40">Bước tiếp →</button>
        <button data-testid="process-play" onClick={() => { if (step >= last) setStep(0); setPlaying((v) => !v); }} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-stone-300 bg-white">{playing ? '⏸ Dừng' : '▶ Tự chạy'}</button>
        <span className="text-xs text-stone-500 ml-auto">Bước {step + 1}/{data.steps.length}</span>
      </div>

      <ol className="flex flex-col gap-1.5" data-testid="process-list">
        {data.steps.map((s, i) => (
          <li key={s.title}>
            <button
              data-testid={`process-step-${i}`}
              onClick={() => setStep(i)}
              className={`w-full text-left rounded-lg px-3 py-2 border text-xs transition ${i === step ? 'bg-blue-50 border-blue-300' : 'bg-white border-stone-200 opacity-75'}`}
            >
              <b className="text-stone-900">{i + 1}. {s.title}</b>
              {i === step && <span className="block mt-1 text-stone-700 leading-relaxed">{s.body}</span>}
            </button>
          </li>
        ))}
      </ol>
      {data.note && <p className="text-[11px] text-stone-500">{data.note}</p>}
    </div>
  );
};
