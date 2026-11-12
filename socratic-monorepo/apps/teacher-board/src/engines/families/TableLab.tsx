'use client';

import React, {useMemo, useState} from 'react';
import type {TableData} from '../../utils/presets/types';

const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
/** Thang màu trắng ấm → xanh đậm */
const ramp = (t: number) => `rgb(${lerp(250, 37, t)},${lerp(244, 99, t)},${lerp(230, 235, t)})`;

/** Bảng ô tương tác: tô theo nhóm hoặc theo một thuộc tính số, chạm ô xem chi tiết (bảng tuần hoàn, bảng mã di truyền...). */
export const TableLab: React.FC<{id: string; data: TableData}> = ({id, data}) => {
  const [colorBy, setColorBy] = useState('group');
  const [sel, setSel] = useState<string | null>(null);
  const groupColor = useMemo(() => new Map(data.groups.map((g) => [g.id, g.color])), [data.groups]);
  const numeric = data.propDefs.filter((d) => d.numeric);
  const range = useMemo(() => {
    if (colorBy === 'group') return null;
    const vals = data.cells.map((c) => Number(c.props?.[colorBy])).filter((v) => Number.isFinite(v));
    return vals.length ? ([Math.min(...vals), Math.max(...vals)] as const) : null;
  }, [colorBy, data.cells]);
  const cell = data.cells.find((c) => c.id === sel) ?? null;
  const fill = (id: string): string => {
    const c = data.cells.find((x) => x.id === id)!;
    if (colorBy === 'group' || !range) return groupColor.get(c.group) ?? '#F5F5F4';
    const v = Number(c.props?.[colorBy]);
    return Number.isFinite(v) ? ramp(range[1] === range[0] ? 0.5 : (v - range[0]) / (range[1] - range[0])) : '#F5F5F4';
  };

  return (
    <div className="p-4 flex flex-col gap-3" data-testid="table-lab" data-preset={id} data-selected={sel ?? ''} data-colorby={colorBy}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button type="button" data-testid="table-colorby-group" aria-pressed={colorBy === 'group'} onClick={() => setColorBy('group')} className={`rounded-full border px-3 py-1 ${colorBy === 'group' ? 'border-[#1D1B16] bg-[#1D1B16] text-white' : 'border-stone-300 bg-white'}`}>
          Theo nhóm
        </button>
        {numeric.map((d) => (
          <button key={d.key} type="button" data-testid={`table-colorby-${d.key}`} aria-pressed={colorBy === d.key} onClick={() => setColorBy(d.key)} className={`rounded-full border px-3 py-1 ${colorBy === d.key ? 'border-[#1D1B16] bg-[#1D1B16] text-white' : 'border-stone-300 bg-white'}`}>
            {d.label}
          </button>
        ))}
      </div>

      <div className="overflow-auto rounded-2xl border border-[#1D1B16]/15 bg-white p-2">
        <div className="grid gap-[3px]" style={{gridTemplateColumns: `repeat(${data.cols}, minmax(${data.dense ? 44 : 30}px, 1fr))`, gridTemplateRows: `repeat(${data.rows}, auto)`}}>
          {data.cells.map((c) => (
            <button
              key={c.id}
              type="button"
              data-testid={`table-cell-${c.id}`}
              data-group={c.group}
              aria-pressed={sel === c.id}
              onClick={() => setSel((x) => (x === c.id ? null : c.id))}
              style={{gridRow: c.row + 1, gridColumn: c.col + 1, background: fill(c.id)}}
              className={`rounded-md border px-0.5 py-1 text-center leading-tight ${sel === c.id ? 'border-stone-900 ring-2 ring-stone-900' : 'border-stone-200'}`}
              title={c.title}
            >
              <span className={`block font-bold text-stone-900 ${data.dense ? 'text-[11px]' : 'text-sm'}`}>{c.label}</span>
              {c.sub && <span className="block text-[9px] text-stone-600">{c.sub}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-stone-600" data-testid="table-legend">
        {data.groups.map((g) => (
          <span key={g.id} className="flex items-center gap-1">
            <i className="inline-block h-3 w-3 rounded-sm border border-stone-300" style={{background: g.color}} />
            {g.label}
          </span>
        ))}
      </div>

      <div className="rounded-2xl bg-[#FBF9F4] border border-[#1D1B16]/15 p-3 text-xs text-stone-700" data-testid="table-detail">
        {cell ? (
          <>
            <b className="text-sm text-stone-900">{cell.title}</b>
            {cell.body && <p className="mt-1">{cell.body}</p>}
            <ul className="mt-1 space-y-0.5">
              {data.propDefs.filter((d) => cell.props?.[d.key] !== undefined).map((d) => (
                <li key={d.key}>
                  {d.label}: <b className="font-mono">{typeof cell.props![d.key] === 'number' ? (cell.props![d.key] as number).toLocaleString('vi-VN', {maximumFractionDigits: 3}) : String(cell.props![d.key])}{d.unit ? ` ${d.unit}` : ''}</b>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <span>Chạm một ô để xem chi tiết.</span>
        )}
        {data.note && <p className="mt-2 text-[11px] text-stone-500">{data.note}</p>}
      </div>
    </div>
  );
};
