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
            className={`rounded-full border px-3 py-1 text-xs ${p[q.key] === 1 ? 'border-blue-600 bg-blue-600 text-white' : 'border-stone-300 bg-white text-stone-700'}`}
          >
            {q.label}
          </button>
        ))}
      </div>
    )}
  </>
);
