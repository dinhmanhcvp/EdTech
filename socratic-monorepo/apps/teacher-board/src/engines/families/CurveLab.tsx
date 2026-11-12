'use client';

import React, {useMemo, useState} from 'react';

import type {CurveData, P} from '../../utils/presets/types';
import {CHART_BG, CurvePath} from '../visualKit';
import {Slider} from '../StemModelEngines';
import {Readouts} from './Controls';

const W = 560;
const H = 300;
const L = 52;
const B = 40;
const T = 14;
const R = 16;
const N = 200;
const fmt = (v: number, _digits?: number) => v.toLocaleString('vi-VN', {maximumSignificantDigits: 4});

const resolve = <V,>(v: V | ((p: P) => V), p: P): V => (typeof v === 'function' ? (v as (p: P) => V)(p) : v);

/** Đồ thị đáp ứng có thanh trượt tham số, con trỏ x và bảng giá trị: dùng chung cho nhiều mô phỏng. */
export const CurveLab: React.FC<{id: string; data: CurveData}> = ({id, data}) => {
  const [vals, setVals] = useState<P>(() => Object.fromEntries(data.params.map((q) => [q.key, q.value])));
  const [cur, setCur] = useState(0.35);
  const [x0, x1] = resolve(data.xRange, vals);
  const [y0, y1] = resolve(data.yRange, vals);
  const sx = (x: number) => L + ((x - x0) / (x1 - x0)) * (W - L - R);
  const sy = (y: number) => H - B - ((y - y0) / (y1 - y0)) * (H - B - T);
  const xc = x0 + cur * (x1 - x0);

  const paths = useMemo(
    () =>
      data.curves.map((c) => {
        let d = '';
        let pen = false;
        for (let i = 0; i <= N; i++) {
          const x = x0 + ((x1 - x0) * i) / N;
          const y = c.fn(x, vals);
          if (!Number.isFinite(y)) {
            pen = false;
            continue;
          }
          const yy = Math.max(y0, Math.min(y1, y));
          d += `${pen ? 'L' : 'M'}${sx(x).toFixed(1)},${sy(yy).toFixed(1)}`;
          pen = true;
        }
        return d;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, vals, x0, x1, y0, y1],
  );
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="p-4 flex flex-wrap items-start gap-3" data-testid="curve-lab" data-preset={id}>
      <div className="flex-[3_1_320px] min-w-0 flex flex-col gap-3">
      <svg viewBox={`0 0 ${W} ${H}`} className={`w-full rounded-2xl border border-[#1D1B16]/15 ${CHART_BG}`} data-testid="curve-chart">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={sx(x0 + t * (x1 - x0))} y1={sy(y0)} x2={sx(x0 + t * (x1 - x0))} y2={sy(y1)} stroke="#E9E4D8" />
            <line x1={sx(x0)} y1={sy(y0 + t * (y1 - y0))} x2={sx(x1)} y2={sy(y0 + t * (y1 - y0))} stroke="#E9E4D8" />
            <text x={sx(x0 + t * (x1 - x0))} y={H - B + 14} fontSize="10" textAnchor="middle" fill="#78716C">{fmt(x0 + t * (x1 - x0), 3)}</text>
            <text x={L - 6} y={sy(y0 + t * (y1 - y0)) + 3} fontSize="10" textAnchor="end" fill="#78716C">{fmt(y0 + t * (y1 - y0), 3)}</text>
          </g>
        ))}
        <text x={(L + W - R) / 2} y={H - 6} fontSize="11" textAnchor="middle" fill="#57534E">{data.xLabel}</text>
        <text x={12} y={(T + H - B) / 2} fontSize="11" textAnchor="middle" fill="#57534E" transform={`rotate(-90 12 ${(T + H - B) / 2})`}>{data.yLabel}</text>
        {data.curves.map((c, i) => (
          <CurvePath key={c.id} d={paths[i]} color={c.color} dashed={c.dashed ? '6 4' : undefined} testid={`curve-path-${c.id}`} />
        ))}
        <line x1={sx(xc)} y1={sy(y0)} x2={sx(xc)} y2={sy(y1)} stroke="#18181B" strokeDasharray="4 3" />
        {data.curves.map((c) => {
          const y = c.fn(xc, vals);
          return Number.isFinite(y) ? <circle key={c.id} cx={sx(xc)} cy={sy(Math.max(y0, Math.min(y1, y)))} r="5" fill="#fff" stroke={c.color} strokeWidth="2.5" /> : null;
        })}
      </svg>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" data-testid="curve-legend">
        {data.curves.map((c) => (
          <span key={c.id} className="flex items-center gap-1.5">
            <i className="inline-block w-5 h-0.5" style={{background: c.color}} />
            <span className="text-stone-700">{c.label}</span>
            <b data-testid={`curve-value-${c.id}`} className="font-mono tabular-nums" style={{color: c.color}}>{fmt(c.fn(xc, vals), 3)}</b>
          </span>
        ))}
      </div>

      </div>

      <div className="rounded-2xl bg-[#FBF9F4] border border-[#1D1B16]/15 p-3.5 flex-[2_1_260px] min-w-0 flex flex-col gap-2.5">
        <Slider testid="curve-cursor" label={data.xLabel} value={cur} min={0} max={1} step={0.005} onChange={setCur} fmt={() => fmt(xc, 4)} />
        {data.params.map((q) => (
          <Slider
            key={q.key}
            testid={`curve-param-${q.key}`}
            label={`${q.label}${q.unit ? ` (${q.unit})` : ''}`}
            value={vals[q.key]}
            min={q.min}
            max={q.max}
            step={q.step}
            onChange={(v) => setVals((s) => ({...s, [q.key]: v}))}
          />
        ))}
        {data.readouts && <Readouts prefix="curve" items={data.readouts.map((r) => [r.label, r.value(vals)])} />}
        {data.note && <p className="text-[11px] leading-relaxed text-[#5A5548]">{data.note}</p>}
      </div>
    </div>
  );
};
