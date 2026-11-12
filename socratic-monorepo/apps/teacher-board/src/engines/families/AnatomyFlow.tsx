'use client';

import React, {Suspense, useEffect, useState} from 'react';
import type {AnatomyData} from '../../utils/presets/types';
import {usePrefersReducedMotion} from '../visualKit';
import {StageBackdrop, canWebGL} from './SceneLab';

/** Sơ đồ có bản 3D thật (chạm chọn bộ phận); bản SVG luôn còn làm dự phòng. */
export const ANATOMY_3D = new Set(['BIO_HEART_CIRCULATION', 'BIO_EUKARYOTE_CELL', 'BIO_FLOWER_STRUCTURE']);
const Organ3D = React.lazy(() => import('./Organ3D'));

/** Hình giải phẫu/sơ đồ phân lớp: chạm bộ phận xem chú giải, "đi theo" lần lượt, hạt chuyển động dọc đường chảy. */
export const AnatomyFlow: React.FC<{id: string; data: AnatomyData}> = ({id, data}) => {
  const [sel, setSel] = useState<string | null>(null);
  const [hov, setHov] = useState<string | null>(null);
  const [tour, setTour] = useState<number | null>(null);
  const [flowOn, setFlowOn] = useState(true);
  const reduced = usePrefersReducedMotion();
  const has3d = ANATOMY_3D.has(id);
  const [in3d, setIn3d] = useState(false);
  useEffect(() => {
    if (has3d && canWebGL()) setIn3d(true);
  }, [has3d]);
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
      <div className="w-full md:w-1/2 flex flex-col gap-2">
        {has3d && (
          <div className="flex gap-1 self-end" data-testid="anatomy-view-toggle">
            {[true, false].map((on) => (
              <button key={String(on)} type="button" aria-pressed={in3d === on} onClick={() => setIn3d(on)} className={`min-h-[30px] rounded-full border px-3.5 text-xs font-medium ${in3d === on ? 'border-[#1D1B16] bg-[#1D1B16] text-[#F3EFE6]' : 'border-[#1D1B16]/25 bg-white text-[#1D1B16]'}`}>
                {on ? '3D' : '2D'}
              </button>
            ))}
          </div>
        )}
        {has3d && in3d ? (
          <Suspense fallback={<div className="w-full aspect-[560/340] rounded-2xl border border-[#1D1B16]/15 bg-[#EEEAE0]" />}>
            <Organ3D id={id} p={{}} s={{sel: sel ?? '', flow: flowOn ? '1' : '0', ...Object.fromEntries(data.parts.map((x) => [`L:${x.id}`, x.label]))}} onPick={(pid) => setSel((cur) => (pid && pid !== cur ? pid : null))} onFail={() => setIn3d(false)} />
          </Suspense>
        ) : (
      <svg viewBox={`0 0 ${vw} ${vh}`} className="w-full max-h-[460px] rounded-2xl border border-[#1D1B16]/15">
        <StageBackdrop vw={vw} vh={vh} night={false} id={`af${id.replace(/\W/g, '')}`} />
        {data.flow && <path id={flowId} d={data.flow.d} fill="none" stroke={flowOn ? data.flow.color : 'none'} strokeOpacity="0.18" strokeWidth="3" strokeDasharray="2 5" />}
        {data.parts.map((p) => {
          const on = sel === p.id;
          const hot = on || hov === p.id;
          return (
            <g key={p.id} data-testid={`anatomy-part-${p.id}`} data-on={on} onClick={() => setSel(on ? null : p.id)} onPointerEnter={() => setHov(p.id)} onPointerLeave={() => setHov((h) => (h === p.id ? null : h))} className="cursor-pointer" opacity={sel && !on ? 0.5 : 1} style={{transition: 'opacity .3s ease'}}>
              {/* vùng chạm rộng (ngón tay trên bảng cảm ứng không cần trúng nét mảnh) và quầng sáng khi chọn */}
              <path d={p.d} fill="none" stroke="transparent" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" pointerEvents="stroke" />
              {on && <path d={p.d} fill="none" stroke="#D9481C" strokeOpacity=".22" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />}
              <path
                d={p.d}
                fill={p.fill ?? 'none'}
                stroke={on ? '#A8481C' : p.stroke ?? '#78716C'}
                style={{filter: hot ? 'drop-shadow(0 0 5px rgba(217,72,28,.5))' : p.fill ? 'drop-shadow(0 2px 2px rgba(29,27,22,.16))' : undefined, transition: 'stroke .2s ease, stroke-width .2s ease, filter .25s ease'}}
                strokeWidth={(p.strokeWidth ?? 1.6) + (on ? 2.5 : hot ? 1.2 : 0)}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text x={p.labelAt[0]} y={p.labelAt[1]} fontSize="11" fontWeight={on ? 700 : 500} fill={on ? '#A8481C' : '#2B2823'} stroke="#FBF9F4" strokeWidth={3} strokeLinejoin="round" paintOrder="stroke" pointerEvents="none">
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
        )}
      </div>

      <div className="flex-1 flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {data.tour && (
            <>
              <button data-testid="anatomy-tour-start" onClick={startTour} className="inline-flex items-center justify-center min-h-[44px] rounded-[10px] bg-[#1D1B16] px-4 text-xs font-medium text-[#F3EFE6] disabled:opacity-40">▶ Đi theo {data.flow ? data.flow.label.toLowerCase().replace('đường đi của ', '') : 'từng bộ phận'}</button>
              <button data-testid="anatomy-tour-next" onClick={nextTour} className="inline-flex items-center justify-center min-h-[44px] rounded-[10px] border border-[#1D1B16]/25 bg-white px-3.5 text-xs font-medium text-[#1D1B16] disabled:opacity-40">Bộ phận tiếp</button>
            </>
          )}
          {data.flow && (
            <button data-testid="anatomy-flow-toggle" onClick={() => setFlowOn((v) => !v)} className="inline-flex items-center justify-center min-h-[44px] rounded-[10px] border border-[#1D1B16]/25 bg-white px-3.5 text-xs font-medium text-[#1D1B16] disabled:opacity-40">
              {flowOn ? 'Ẩn' : 'Hiện'} đường chảy
            </button>
          )}
        </div>
        <div className="rounded-2xl bg-[#FBF9F4] border border-[#1D1B16]/15 p-3 min-h-[120px]" data-testid="anatomy-info">
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
