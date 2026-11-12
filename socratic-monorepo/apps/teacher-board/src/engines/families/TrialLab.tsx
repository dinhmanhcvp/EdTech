'use client';

import React, {useMemo, useState} from 'react';
import type {TrialData} from '../../utils/presets/types';
import {CHART_BG} from '../visualKit';
import {ControlPanel, initialP, initialS} from './Controls';

/** Bộ sinh số giả ngẫu nhiên có hạt giống: cùng hạt giống cho cùng chuỗi thử (kiểm thử được). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 560;
const H = 150;
const pct = (v: number) => `${(100 * v).toLocaleString('vi-VN', {maximumFractionDigits: 1})} %`;
const MAX_TRIALS = 20000;

/** Thí nghiệm ngẫu nhiên lặp: tần suất quan sát so với xác suất lí thuyết, luật số lớn. */
export const TrialLab: React.FC<{id: string; data: TrialData}> = ({id, data}) => {
  const [p, setPs] = useState(() => initialP(data));
  const [s, setSs] = useState(() => initialS(data));
  const [run, setRun] = useState<{seq: number[]; rng: () => number; seed: number}>(() => ({seq: [], rng: mulberry32(1), seed: 1}));
  const [pick, setPick] = useState(0);

  const outs = data.outcomes(p, s);
  const theory = data.theory(p, s);
  const counts = useMemo(() => {
    const c = outs.map(() => 0);
    for (const k of run.seq) if (k >= 0 && k < c.length) c[k]++;
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.seq, outs.length]);
  const n = run.seq.length;
  const sel = Math.min(pick, outs.length - 1);

  const reset = (seed = run.seed + 1) => setRun({seq: [], rng: mulberry32(seed), seed});
  const add = (k: number) =>
    setRun((r) => {
      const seq = r.seq.slice();
      for (let i = 0; i < k && seq.length < MAX_TRIALS; i++) seq.push(data.trial(r.rng, p, s));
      return {...r, seq};
    });
  const change = (fn: () => void) => {
    fn();
    reset(run.seed);
  };

  // tần suất tích lũy của kết quả đang chọn, lấy mẫu ≤ 120 điểm
  const path = useMemo(() => {
    if (n === 0) return '';
    const step = Math.max(1, Math.floor(n / 120));
    let c = 0;
    let d = '';
    for (let i = 1; i <= n; i++) {
      if (run.seq[i - 1] === sel) c++;
      if (i % step === 0 || i === n) d += `${d ? 'L' : 'M'}${(40 + ((i / n) * (W - 56))).toFixed(1)},${(H - 24 - (c / i) * (H - 40)).toFixed(1)}`;
    }
    return d;
  }, [run.seq, n, sel]);
  const ty = H - 24 - (theory[sel] ?? 0) * (H - 40);

  return (
    <div className="p-4 flex flex-col gap-3" data-testid="trial-lab" data-preset={id} data-trials={n}>
      <div className="flex flex-wrap items-center gap-2">
        {[1, 10, 100, 1000].map((k) => (
          <button key={k} type="button" data-testid={`trial-run-${k}`} onClick={() => add(k)} className="inline-flex items-center justify-center min-h-[32px] rounded-[10px] border border-[#1D1B16]/25 bg-white px-3.5 py-1 text-xs font-medium text-[#1D1B16] font-medium hover:bg-stone-50">
            +{k} {data.unit}
          </button>
        ))}
        <button type="button" data-testid="trial-reset" onClick={() => reset()} className="inline-flex items-center justify-center min-h-[32px] rounded-[10px] border border-[#1D1B16]/25 bg-white px-3.5 py-1 text-xs font-medium text-[#1D1B16] text-stone-600">
          Làm lại
        </button>
        <span className="ml-auto text-xs text-stone-600">
          Đã thử <b data-testid="trial-count" className="font-mono">{n}</b> {data.unit}
        </span>
      </div>

      <div className="rounded-2xl border border-[#1D1B16]/15 bg-white p-3 flex flex-col gap-1.5" data-testid="trial-bars">
        {outs.map((o, i) => {
          const f = n ? counts[i] / n : 0;
          return (
            <button key={o.label} type="button" onClick={() => setPick(i)} data-testid={`trial-bar-${i}`} data-count={counts[i]} aria-pressed={i === sel} className={`flex items-center gap-2 text-left text-xs ${i === sel ? 'font-semibold' : ''}`}>
              <span className="w-40 shrink-0 text-stone-700">{o.label}</span>
              <span className="relative h-4 flex-1 rounded bg-stone-100">
                <span className="absolute inset-y-0 left-0 rounded" style={{width: `${100 * f}%`, background: o.color}} />
                <span className="absolute inset-y-[-2px] w-0.5 bg-stone-900" style={{left: `${100 * (theory[i] ?? 0)}%`}} title="xác suất lí thuyết" />
              </span>
              <span className="w-28 shrink-0 font-mono tabular-nums">
                <span data-testid={`trial-freq-${i}`}>{pct(f)}</span> / <span data-testid={`trial-theory-${i}`}>{pct(theory[i] ?? 0)}</span>
              </span>
            </button>
          );
        })}
        <p className="text-[11px] text-stone-500">Thanh màu: tần suất quan sát. Vạch đen: xác suất lí thuyết. Chạm một dòng để theo dõi tần suất tích lũy của nó.</p>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className={`w-full rounded-2xl border border-[#1D1B16]/15 ${CHART_BG}`} data-testid="trial-chart">
        <line x1="40" y1={H - 24} x2={W - 16} y2={H - 24} stroke="#A8A29E" />
        <line x1="40" y1="10" x2="40" y2={H - 24} stroke="#A8A29E" />
        <text x="34" y="14" fontSize="10" textAnchor="end" fill="#78716C">100%</text>
        <text x="34" y={H - 22} fontSize="10" textAnchor="end" fill="#78716C">0</text>
        <text x={(W + 24) / 2} y={H - 6} fontSize="11" textAnchor="middle" fill="#57534E">số lần thử (tần suất tích lũy của “{outs[sel]?.label}”)</text>
        <line x1="40" y1={ty} x2={W - 16} y2={ty} stroke="#18181B" strokeDasharray="5 4" />
        {path && <path d={path} fill="none" stroke={outs[sel]?.color ?? '#2563EB'} strokeWidth="2.2" data-testid="trial-path" />}
      </svg>

      <div className="rounded-2xl bg-[#FBF9F4] border border-[#1D1B16]/15 p-3 flex flex-col gap-2">
        <ControlPanel prefix="trial" c={data} p={p} s={s} setP={(k, v) => change(() => setPs((x) => ({...x, [k]: v})))} setS={(k, v) => change(() => setSs((x) => ({...x, [k]: v})))} />
        {data.note && <p className="text-[11px] text-stone-500">{data.note}</p>}
      </div>
    </div>
  );
};
