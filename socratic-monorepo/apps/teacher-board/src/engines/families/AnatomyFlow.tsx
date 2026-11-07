'use client';

import React, {useState} from 'react';
import type {AnatomyData} from '../../utils/presets/types';
import {usePrefersReducedMotion} from '../visualKit';

/** Hình giải phẫu/sơ đồ phân lớp: chạm bộ phận xem chú giải, "đi theo" lần lượt, hạt chuyển động dọc đường chảy. */
export const AnatomyFlow: React.FC<{id: string; data: AnatomyData}> = ({id, data}) => {
  const [sel, setSel] = useState<string | null>(null);
  const [tour, setTour] = useState<number | null>(null);
  const [flowOn, setFlowOn] = useState(true);
  const reduced = usePrefersReducedMotion();
  const [vw, vh] = data.viewBox;
  const part = data.parts.find((x) => x.id === sel) ?? null;
  const flowId = `${id}-flow`;

  const startTour = () => {
    if (!data.tour?.length) return;
    setTour(0);
    setSel(data.tour[0]);
  };
  const nextTour = () => {
    if (!data.tour?.length) return;
    const n = tour === null ? 0 : (tour + 1) % data.tour.length;
    setTour(n);
    setSel(data.tour[n]);
  };

  return (
    <div className="p-4 flex flex-col gap-3 md:flex-row" data-testid="anatomy-flow" data-preset={id} data-selected={sel ?? ''}>
      <svg viewBox={`0 0 ${vw} ${vh}`} className="w-full md:w-1/2 max-h-[460px] rounded-xl border border-[#E6E4DD] bg-gradient-to-b from-white to-[#FAF9F6]">
        {data.flow && <path id={flowId} d={data.flow.d} fill="none" stroke={flowOn ? data.flow.color : 'none'} strokeOpacity="0.18" strokeWidth="3" strokeDasharray="2 5" />}
        {data.parts.map((p) => {
          const on = sel === p.id;
          return (
            <g key={p.id} data-testid={`anatomy-part-${p.id}`} data-on={on} onClick={() => setSel(on ? null : p.id)} className="cursor-pointer" opacity={sel && !on ? 0.5 : 1}>
              <path
                d={p.d}
                fill={p.fill ?? 'none'}
                stroke={on ? '#2563EB' : p.stroke ?? '#78716C'}
                strokeWidth={(p.strokeWidth ?? 1.6) + (on ? 2.5 : 0)}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text x={p.labelAt[0]} y={p.labelAt[1]} fontSize="11" fontWeight={on ? 700 : 500} fill={on ? '#1D4ED8' : '#44403C'} pointerEvents="none">
                {p.label}
              </text>
            </g>
          );
        })}
        {data.flow && flowOn && !reduced &&
          [0, 1, 2, 3].map((k) => (
            <circle key={k} r="5" fill={data.flow!.color} pointerEvents="none" data-testid="anatomy-flow-dot">
              <animateMotion dur="14s" begin={`${-k * 3.5}s`} repeatCount="indefinite">
                <mpath href={`#${flowId}`} />
              </animateMotion>
            </circle>
          ))}
      </svg>

      <div className="flex-1 flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {data.tour && (
            <>
              <button data-testid="anatomy-tour-start" onClick={startTour} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white">▶ Đi theo {data.flow ? data.flow.label.toLowerCase().replace('đường đi của ', '') : 'từng bộ phận'}</button>
              <button data-testid="anatomy-tour-next" onClick={nextTour} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-stone-300 bg-white">Bộ phận tiếp</button>
            </>
          )}
          {data.flow && (
            <button data-testid="anatomy-flow-toggle" onClick={() => setFlowOn((v) => !v)} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-stone-300 bg-white">
              {flowOn ? 'Ẩn' : 'Hiện'} đường chảy
            </button>
          )}
        </div>
        <div className="rounded-xl bg-[#F4F3EE] border border-[#E5E3DC] p-3 min-h-[120px]" data-testid="anatomy-info">
          {part ? (
            <>
              <h4 className="text-sm font-bold text-stone-900">{part.title}</h4>
              <p className="text-xs text-stone-700 mt-1 leading-relaxed">{part.body}</p>
              {part.facts && (
                <table className="mt-2 w-full text-xs">
                  <tbody>
                    {part.facts.map(([k, v]) => (
                      <tr key={k} className="border-t border-stone-200">
                        <td className="py-1 pr-2 font-semibold text-stone-600 align-top whitespace-nowrap">{k}</td>
                        <td className="py-1 text-stone-800">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          ) : (
            <p className="text-xs text-stone-500">Chạm một bộ phận trên hình để xem chi tiết.</p>
          )}
        </div>
        {data.note && <p className="text-[11px] text-stone-500">{data.note}</p>}
      </div>
    </div>
  );
};
