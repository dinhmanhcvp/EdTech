'use client';

import React, {useMemo, useState} from 'react';
import {fmtNum} from '../../utils/mathExpr';
import type {FeedbackData, P, Phase} from '../../utils/presets/types';
import {CHART_BG, CurvePath} from '../visualKit';
import {Slider} from '../StemModelEngines';

const W = 560;
const H = 250;
const L = 46;
const B = 36;
const T = 12;
const R = 14;

export function phaseOf(x: number, band: [number, number]): Phase {
  return x > band[1] ? 'high' : x < band[0] ? 'low' : 'ok';
}

const PHASE_STYLE: Record<Phase, string> = {
  high: 'bg-rose-50 border-rose-300 text-rose-900',
  low: 'bg-sky-50 border-sky-300 text-sky-900',
  ok: 'bg-emerald-50 border-emerald-300 text-emerald-900',
};
const PHASE_NAME: Record<Phase, string> = {high: 'Cao hơn bình thường', low: 'Thấp hơn bình thường', ok: 'Trong khoảng bình thường'};

/** Hệ điều hòa ngược: biến được điều hòa theo thời gian + sơ đồ tiếp nhận → điều khiển → thực hiện → kết quả. */
export const FeedbackSystem: React.FC<{id: string; data: FeedbackData}> = ({id, data}) => {
  const [vals, setVals] = useState<P>(() => Object.fromEntries(data.params.map((q) => [q.key, q.value])));
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries(data.toggles.map((q) => [q.key, q.value])));
  const [ti, setTi] = useState(Math.round(data.eventAt / data.dt) + 20);
  const series = useMemo(() => data.simulate(vals, on), [data, vals, on]);
  const v = data.variable;
  const n = series.length - 1;
  const i = Math.min(ti, n);
  const sx = (k: number) => L + (k / n) * (W - L - R);
  const sy = (y: number) => H - B - ((Math.min(v.yRange[1], Math.max(v.yRange[0], y)) - v.yRange[0]) / (v.yRange[1] - v.yRange[0])) * (H - B - T);
  const d = series.map((y, k) => `${k ? 'L' : 'M'}${sx(k).toFixed(1)},${sy(y).toFixed(1)}`).join(' ');
  const phase = phaseOf(series[i], v.band);
  const st = data.states[phase];
  const peak = Math.max(...series);
  const fin = series[n];
  const tick = (f: number) => Math.round(f * data.tMax);
  const boxes: [string, string][] = [
    ['Tiếp nhận', data.sense],
    ['Điều khiển', st.control],
    ['Thực hiện', st.effect],
    ['Kết quả', st.result],
  ];

  return (
    <div className="p-4 flex flex-col gap-3" data-testid="feedback-system" data-preset={id} data-phase={phase}>
      <svg viewBox={`0 0 ${W} ${H}`} className={`w-full rounded-xl border border-[#E6E4DD] ${CHART_BG}`} data-testid="feedback-chart">
        <rect x={L} y={sy(v.band[1])} width={W - L - R} height={sy(v.band[0]) - sy(v.band[1])} fill="#10B981" opacity="0.12" />
        <line x1={L} y1={sy(v.setpoint)} x2={W - R} y2={sy(v.setpoint)} stroke="#059669" strokeDasharray="5 4" />
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <text x={sx(f * n)} y={H - B + 14} fontSize="10" textAnchor="middle" fill="#78716C">{tick(f)}</text>
            <text x={L - 6} y={sy(v.yRange[0] + f * (v.yRange[1] - v.yRange[0])) + 3} fontSize="10" textAnchor="end" fill="#78716C">{fmtNum(v.yRange[0] + f * (v.yRange[1] - v.yRange[0]), 3)}</text>
          </g>
        ))}
        <text x={(L + W - R) / 2} y={H - 6} fontSize="11" textAnchor="middle" fill="#57534E">thời gian ({data.timeUnit})</text>
        <text x={sx(data.eventAt / data.dt) + 4} y={T + 10} fontSize="10" fill="#B45309">{data.eventLabel}</text>
        <line x1={sx(data.eventAt / data.dt)} y1={T} x2={sx(data.eventAt / data.dt)} y2={H - B} stroke="#D97706" strokeDasharray="2 3" />
        <CurvePath d={d} color="#2563EB" testid="feedback-curve" />
        <line x1={sx(i)} y1={T} x2={sx(i)} y2={H - B} stroke="#18181B" strokeDasharray="4 3" />
        <circle cx={sx(i)} cy={sy(series[i])} r="5" fill="#fff" stroke="#2563EB" strokeWidth="2.5" />
      </svg>

      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs text-stone-700">
        <span>{v.label} lúc {i * data.dt} {data.timeUnit}: <b data-testid="feedback-now" className="font-mono text-blue-700">{fmtNum(series[i], 3)} {v.unit}</b></span>
        <span>Đỉnh: <b data-testid="feedback-peak" data-value={peak.toFixed(3)} className="font-mono">{fmtNum(peak, 3)}</b></span>
        <span>Cuối: <b data-testid="feedback-final" data-value={fin.toFixed(3)} className="font-mono">{fmtNum(fin, 3)}</b></span>
        <span className={`ml-auto px-2 py-0.5 rounded-md border font-semibold ${PHASE_STYLE[phase]}`} data-testid="feedback-phase-label">{PHASE_NAME[phase]}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2" data-testid="feedback-nodes">
        {boxes.map(([k, text], idx) => (
          <div key={k} className={`rounded-lg border p-2 text-xs ${PHASE_STYLE[phase]}`}>
            <div className="text-[10px] uppercase tracking-wide opacity-70">{idx + 1}. {k}</div>
            <div className="font-medium mt-0.5 leading-snug">{text}</div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-stone-500 -mt-1">Kết quả tác động ngược trở lại bộ phận tiếp nhận (liên hệ ngược).</p>

      <div className="rounded-xl bg-[#F4F3EE] border border-[#E5E3DC] p-3 flex flex-col gap-2">
        <Slider testid="feedback-cursor" label={`Thời điểm (${data.timeUnit})`} value={i} min={0} max={n} step={1} onChange={setTi} fmt={(x) => String(x * data.dt)} />
        {data.params.map((q) => (
          <Slider
            key={q.key}
            testid={`feedback-param-${q.key}`}
            label={`${q.label}${q.unit ? ` (${q.unit})` : ''}`}
            value={vals[q.key]}
            min={q.min}
            max={q.max}
            step={q.step}
            onChange={(x) => setVals((s) => ({...s, [q.key]: x}))}
          />
        ))}
        <div className="flex flex-wrap gap-3">
          {data.toggles.map((q) => (
            <label key={q.key} className="flex items-center gap-1.5 text-xs text-stone-700 cursor-pointer">
              <input data-testid={`feedback-toggle-${q.key}`} type="checkbox" checked={on[q.key]} onChange={(e) => setOn((s) => ({...s, [q.key]: e.target.checked}))} />
              {q.label}
            </label>
          ))}
        </div>
        {data.note && <p className="text-[11px] text-stone-500">{data.note}</p>}
      </div>
    </div>
  );
};
