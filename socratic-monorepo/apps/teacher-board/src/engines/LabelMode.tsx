'use client';

/**
 * Nhãn đại lượng hai chế độ: "Kí hiệu" (gọn: Fₐ, ρ chất lỏng…) hoặc "Chữ" (đầy đủ: Lực đẩy Archimedes…). Lựa chọn nhớ trong máy.
 * Môn học (để chọn đúng bộ kí hiệu) và chế độ đặt ở SimulationWidget; một mô phỏng có thể khai báo cả bộ nhãn của nó
 * (LabelSet) để rút gọn mà không trùng kí hiệu giữa hai đại lượng.
 */
import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {compactLabel, compactLabels, type CompactLabel, type Subject} from '../utils/quantityLabel';

export type LabelMode = 'symbol' | 'word';
const KEY = 'svb.labelMode';

interface Ctx {
  mode: LabelMode;
  setMode: (m: LabelMode) => void;
  subject?: Subject;
}
const ModeCtx = createContext<Ctx>({mode: 'symbol', setMode: () => undefined});
const SetCtx = createContext<Map<string, CompactLabel> | null>(null);

export const LabelModeProvider: React.FC<{subject?: Subject; children: React.ReactNode}> = ({subject, children}) => {
  const [mode, setModeState] = useState<LabelMode>('symbol');
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(KEY);
      if (v === 'word' || v === 'symbol') setModeState(v);
    } catch {
      /* không có localStorage */
    }
  }, []);
  const setMode = (m: LabelMode) => {
    setModeState(m);
    try {
      window.localStorage.setItem(KEY, m);
    } catch {
      /* bỏ qua */
    }
  };
  return <ModeCtx.Provider value={{mode, setMode, subject}}>{children}</ModeCtx.Provider>;
};

export const useLabelMode = () => useContext(ModeCtx);

/** Bộ nhãn của một mô phỏng: rút gọn cùng nhau để không trùng kí hiệu. */
export const LabelSet: React.FC<{labels: string[]; children: React.ReactNode}> = ({labels, children}) => {
  const {subject} = useLabelMode();
  const key = labels.join('\u0001');
  const map = useMemo(() => {
    const list = compactLabels(labels, subject);
    return new Map(labels.map((l, i) => [l.replace(/\s+/g, ' ').trim(), list[i]]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, subject]);
  return <SetCtx.Provider value={map}>{children}</SetCtx.Provider>;
};

export function useCompact(label: string): CompactLabel {
  const {subject} = useLabelMode();
  const set = useContext(SetCtx);
  const k = label.replace(/\s+/g, ' ').trim();
  return set?.get(k) ?? compactLabel(k, subject);
}

/** Nhãn hiển thị theo chế độ; luôn có chú thích tên đầy đủ khi rê chuột. Kí hiệu in nghiêng kiểu SGK. */
export const QLabel: React.FC<{text: string}> = ({text}) => {
  const {mode} = useLabelMode();
  const c = useCompact(text);
  if (mode === 'word' || c.short === c.full) return <span title={c.full}>{c.full}</span>;
  const rest = c.sym && c.short.startsWith(c.sym) ? c.short.slice(c.sym.length) : null;
  return (
    <span title={c.full} data-label-full={c.full}>
      {rest !== null ? (
        <>
          <i className="font-serif italic text-[1.1em]">{c.sym}</i>
          {rest}
        </>
      ) : (
        c.short
      )}
    </span>
  );
};

/** Nút đổi Chữ / Kí hiệu và dòng "Kí hiệu: ρ – khối lượng riêng…" cho các nhãn đang rút gọn. */
export const LabelFooter: React.FC<{labels: string[]}> = ({labels}) => {
  const {mode, setMode, subject} = useLabelMode();
  const set = useContext(SetCtx);
  const legend = useMemo(() => {
    const out = new Map<string, string>();
    for (const l of labels) {
      const c = set?.get(l.replace(/\s+/g, ' ').trim()) ?? compactLabel(l, subject);
      if (c.sym && c.name && c.short !== c.full && !out.has(c.sym)) out.set(c.sym, c.name);
    }
    return [...out];
  }, [labels, set, subject]);
  const changed = labels.some((l) => {
    const c = set?.get(l.replace(/\s+/g, ' ').trim()) ?? compactLabel(l, subject);
    return c.short !== c.full;
  });
  if (!changed) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#5A5548]" data-testid="label-footer">
      <div className="inline-flex overflow-hidden rounded-full border border-[#1D1B16]/20" role="group" aria-label="Cách ghi nhãn">
        {(['symbol', 'word'] as const).map((m) => (
          <button
            key={m}
            type="button"
            data-testid={`label-mode-${m}`}
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={`min-h-[32px] px-3 ${mode === m ? 'bg-[#1D1B16] text-[#F3EFE6]' : 'bg-white text-[#1D1B16]'}`}
          >
            {m === 'symbol' ? 'Kí hiệu' : 'Chữ'}
          </button>
        ))}
      </div>
      {mode === 'symbol' && legend.length > 0 && (
        <span data-testid="label-legend">
          {legend.map(([s, n], i) => (
            <span key={s}>
              {i > 0 && ' · '}
              <i className="font-serif">{s}</i>: {n}
            </span>
          ))}
        </span>
      )}
    </div>
  );
};
