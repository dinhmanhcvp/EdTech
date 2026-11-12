'use client';

import React from 'react';
import type {Controls, P, S} from '../../utils/presets/types';
import {Slider} from '../StemModelEngines';

export const initialP = (c: Controls): P => ({
  ...Object.fromEntries((c.sliders ?? []).map((q) => [q.key, q.value])),
  ...Object.fromEntries((c.toggles ?? []).map((q) => [q.key, q.value ? 1 : 0])),
});
export const initialS = (c: Controls): S => ({
  ...Object.fromEntries((c.choices ?? []).map((q) => [q.key, q.value])),
  ...Object.fromEntries((c.texts ?? []).map((q) => [q.key, q.value])),
});

/** Thẻ điều khiển: nền giấy, viền tóc, bo lớn (theo bộ token của bai-giang). */
export const PANEL = 'rounded-2xl bg-[#FBF9F4] border border-[#1D1B16]/15 p-3.5';
/** Nút chính: mực đậm, chữ kem; màu chữ đặt tường minh để không thừa hưởng màu chữ sáng của khung widget ở chế độ tối. */
export const BTN = 'inline-flex items-center justify-center min-h-[36px] rounded-[10px] bg-[#1D1B16] px-4 text-xs font-medium text-[#F3EFE6] hover:brightness-125 active:scale-[.98] transition';
/** Nút phụ: nền trắng, viền tóc. */
export const BTN_GHOST = 'inline-flex items-center justify-center min-h-[36px] rounded-[10px] border border-[#1D1B16]/25 bg-white px-4 text-xs font-medium text-[#1D1B16] hover:bg-[#FBF9F4] active:scale-[.98] transition';

/** Số đọc dạng thẻ nhỏ: nhãn mờ ở trên, giá trị phông đơn cách ở dưới. testid = `${prefix}-readouts`, `${prefix}-readout-${i}`. */
export const Readouts: React.FC<{prefix: string; items: [string, React.ReactNode][]}> = ({prefix, items}) => (
  <ul className="flex flex-wrap gap-1.5" data-testid={`${prefix}-readouts`}>
    {items.map(([label, value], i) => (
      <li key={label} className="rounded-lg border border-[#1D1B16]/10 bg-white px-2.5 py-1.5 text-[11px] leading-tight text-[#5A5548]">
        {label}
        <b data-testid={`${prefix}-readout-${i}`} className="block font-mono text-xs font-semibold tabular-nums text-[#1D1B16]">{value}</b>
      </li>
    ))}
  </ul>
);

/** Thanh trượt, công tắc, ô chọn, ô nhập: dùng chung cho các họ engine có điều khiển. testid = `${prefix}-param-${key}`. */
const shown = (w: [string, string[]] | undefined, s: S) => !w || w[1].includes(s[w[0]]);

export const ControlPanel: React.FC<{prefix: string; c: Controls; p: P; s: S; setP: (k: string, v: number) => void; setS: (k: string, v: string) => void}> = ({prefix, c, p, s, setP, setS}) => (
  <>
    {(c.choices ?? []).filter((q) => shown(q.when, s)).map((q) => (
      <label key={q.key} className="flex items-center gap-3 text-xs text-stone-700">
        <span className="w-28 shrink-0 font-medium">{q.label}</span>
        <select data-testid={`${prefix}-param-${q.key}`} value={s[q.key]} onChange={(e) => setS(q.key, e.target.value)} className="flex-1 rounded-md border border-stone-300 bg-white px-2 py-1">
          {q.options.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </label>
    ))}
    {(c.texts ?? []).map((q) => (
      <label key={q.key} className="flex items-center gap-3 text-xs text-stone-700">
        <span className="w-28 shrink-0 font-medium">{q.label}</span>
        <input data-testid={`${prefix}-param-${q.key}`} type="text" value={s[q.key]} maxLength={q.maxLength ?? 60} onChange={(e) => setS(q.key, e.target.value)} className="flex-1 rounded-md border border-stone-300 bg-white px-2 py-1 font-mono" />
      </label>
    ))}
    {(c.sliders ?? []).filter((q) => shown(q.when, s)).map((q) => (
      <Slider key={q.key} testid={`${prefix}-param-${q.key}`} label={`${q.label}${q.unit ? ` (${q.unit})` : ''}`} value={p[q.key]} min={q.min} max={q.max} step={q.step} onChange={(v) => setP(q.key, v)} />
    ))}
    {(c.toggles ?? []).some((q) => shown(q.when, s)) && (
      <div className="flex flex-wrap gap-2">
        {(c.toggles ?? []).filter((q) => shown(q.when, s)).map((q) => (
          <button
            key={q.key}
            type="button"
            data-testid={`${prefix}-toggle-${q.key}`}
            aria-pressed={p[q.key] === 1}
            onClick={() => setP(q.key, p[q.key] === 1 ? 0 : 1)}
            className={`min-h-[32px] rounded-full border px-3.5 py-1 text-xs font-medium ${p[q.key] === 1 ? 'border-[#1D1B16] bg-[#1D1B16] text-[#F3EFE6]' : 'border-[#1D1B16]/25 bg-white text-[#1D1B16]'}`}
          >
            {q.label}
          </button>
        ))}
      </div>
    )}
  </>
);
