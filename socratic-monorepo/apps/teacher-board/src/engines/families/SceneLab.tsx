'use client';

import React, {useEffect, useMemo, useState} from 'react';
import type {SceneData, Shape} from '../../utils/presets/types';
import {CHART_BG} from '../visualKit';
import {ControlPanel, initialP, initialS} from './Controls';
import {Slider} from '../StemModelEngines';

const INK = '#44403C';
const fmt = (v: number) => v.toLocaleString('vi-VN', {maximumSignificantDigits: 4});

export function renderShape(sh: Shape, i: number): React.ReactNode {
  switch (sh.t) {
    case 'line': {
      const col = sh.stroke ?? INK;
      const w = sh.w ?? 1.6;
      const L = Math.hypot(sh.x2 - sh.x1, sh.y2 - sh.y1);
      if (!sh.arrow || L < 1) return <line key={i} x1={sh.x1} y1={sh.y1} x2={sh.x2} y2={sh.y2} stroke={col} strokeWidth={w} strokeDasharray={sh.dash} strokeLinecap="round" />;
      const ux = (sh.x2 - sh.x1) / L;
      const uy = (sh.y2 - sh.y1) / L;
      const hl = Math.min(10 + w * 2, L * 0.6);
      const bx = sh.x2 - ux * hl;
      const by = sh.y2 - uy * hl;
      return (
        <g key={i}>
          <line x1={sh.x1} y1={sh.y1} x2={bx} y2={by} stroke={col} strokeWidth={w} strokeDasharray={sh.dash} strokeLinecap="round" />
          <polygon points={`${sh.x2},${sh.y2} ${bx - uy * hl * 0.38},${by + ux * hl * 0.38} ${bx + uy * hl * 0.38},${by - ux * hl * 0.38}`} fill={col} />
        </g>
      );
    }
    case 'circle':
      return <circle key={i} cx={sh.cx} cy={sh.cy} r={sh.r} fill={sh.fill ?? 'none'} stroke={sh.stroke ?? (sh.fill ? 'none' : INK)} strokeWidth={sh.w ?? 1.6} opacity={sh.o} />;
    case 'rect':
      return <rect key={i} x={sh.x} y={sh.y} width={sh.w} height={sh.h} rx={sh.rx} fill={sh.fill ?? 'none'} stroke={sh.stroke ?? (sh.fill ? 'none' : INK)} strokeWidth={sh.sw ?? 1.4} opacity={sh.o} />;
    case 'poly': {
      const pts = sh.pts.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ');
      return sh.close === false && !sh.fill ? (
        <polyline key={i} points={pts} fill="none" stroke={sh.stroke ?? INK} strokeWidth={sh.w ?? 1.8} strokeDasharray={sh.dash} strokeLinejoin="round" opacity={sh.o} />
      ) : (
        <polygon key={i} points={pts} fill={sh.fill ?? 'none'} stroke={sh.stroke ?? (sh.fill ? 'none' : INK)} strokeWidth={sh.w ?? 1.6} strokeDasharray={sh.dash} strokeLinejoin="round" opacity={sh.o} />
      );
    }
    case 'path':
      return <path key={i} d={sh.d} fill={sh.fill ?? 'none'} stroke={sh.stroke ?? (sh.fill ? 'none' : INK)} strokeWidth={sh.w ?? 1.8} strokeDasharray={sh.dash} strokeLinecap="round" strokeLinejoin="round" opacity={sh.o} />;
    case 'text':
      return (
        <text key={i} x={sh.x} y={sh.y} fontSize={sh.size ?? 12} fill={sh.fill ?? INK} textAnchor={sh.anchor ?? 'middle'} fontWeight={sh.bold ? 700 : 400} transform={sh.rot ? `rotate(${sh.rot} ${sh.x} ${sh.y})` : undefined}>
          {sh.s}
        </text>
      );
  }
}

/** Cảnh SVG sinh từ hàm thuần của (tham số, thời gian): dùng cho hình học, cơ–điện–nhiệt, cấu trúc phân tử, ống nghiệm ảo... */
export const SceneLab: React.FC<{id: string; data: SceneData}> = ({id, data}) => {
  const [p, setPs] = useState(() => initialP(data));
  const [s, setSs] = useState(() => initialS(data));
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(!!data.time?.autoplay);
  const tm = data.time;

  useEffect(() => {
    if (!playing || !tm) return;
    const h = setInterval(() => {
      setT((x) => {
        const n = x + 0.05;
        if (n < tm.max) return n;
        if (tm.loop) return 0;
        setPlaying(false);
        return tm.max;
      });
    }, 50);
    return () => clearInterval(h);
  }, [playing, tm]);

  const shapes = useMemo(() => data.draw(p, t, s), [data, p, t, s]);
  const [vw, vh] = data.viewBox;

  return (
    <div className="p-4 flex flex-col gap-3" data-testid="scene-lab" data-preset={id}>
      <svg viewBox={`0 0 ${vw} ${vh}`} className={`w-full rounded-xl border border-[#E6E4DD] ${CHART_BG}`} data-testid="scene-svg" data-shapes={shapes.length}>
        {shapes.map((sh, i) => renderShape(sh, i))}
      </svg>

      <div className="rounded-xl bg-[#F4F3EE] border border-[#E5E3DC] p-3 flex flex-col gap-2">
        {tm && (
          <div className="flex items-center gap-2">
            <button type="button" data-testid="scene-play" onClick={() => { if (!playing && t >= tm.max) setT(0); setPlaying((x) => !x); }} className="rounded-md border border-stone-300 bg-white px-3 py-1 text-xs">
              {playing ? 'Dừng' : 'Chạy'}
            </button>
            <div className="flex-1">
              <Slider testid="scene-time" label={tm.label ?? 'Thời gian'} value={t} min={0} max={tm.max} step={0.05} onChange={(v) => { setPlaying(false); setT(v); }} fmt={(v) => `${fmt(v)}${tm.unit ? ` ${tm.unit}` : ''}`} />
            </div>
          </div>
        )}
        <ControlPanel prefix="scene" c={data} p={p} s={s} setP={(k, v) => setPs((x) => ({...x, [k]: v}))} setS={(k, v) => setSs((x) => ({...x, [k]: v}))} />
        {data.readouts && (
          <ul className="text-xs text-stone-700 mt-1 space-y-0.5" data-testid="scene-readouts">
            {data.readouts.map((r, i) => (
              <li key={r.label}>
                {r.label}: <b data-testid={`scene-readout-${i}`} className="font-mono">{r.value(p, t, s)}</b>
              </li>
            ))}
          </ul>
        )}
        {data.note && <p className="text-[11px] text-stone-500">{data.note}</p>}
      </div>
    </div>
  );
};
