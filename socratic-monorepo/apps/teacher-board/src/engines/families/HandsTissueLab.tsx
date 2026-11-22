'use client';

import React, {useEffect, useReducer, useRef, useState} from 'react';
import {BTN_GHOST} from './Controls';
import {TTOOLS, TTOOL_NAME, newStats, type TTool, type TissueLive, type TissueStats} from './HandsTissue3D';
import type {HandsInput} from './handsKit';

const Tissue3D = React.lazy(() => import('./HandsTissue3D'));
type ShellProps = {hint: string; render: (input: HandsInput, onFail: () => void) => React.ReactNode; children: React.ReactNode};

/** mục tiêu của ca tập: đọc từ số liệu cảnh, không phải tự khai */
export const GOALS: {do: string; ok: (s: TissueStats) => boolean}[] = [
  {do: 'Rạch qua da theo một đường (ít nhất 6 ô da)', ok: (s) => s.skinCut >= 6},
  {do: 'Rạch sâu vào lớp mỡ, đặt banh vén một mép', ok: (s) => s.deepest !== -1 && s.deepest <= 1 && s.retractors >= 1},
  {do: 'Bóc tách lộ mạch máu nằm trong lớp mỡ', ok: (s) => s.exposed},
  {do: 'Cầm máu hết: đốt điện mao mạch, kẹp mạch nếu cắt trúng', ok: (s) => s.bled && s.active.artery + s.active.vein + s.active.capillary === 0},
  {do: 'Hút sạch máu đọng trong hốc mổ (< 5 mL)', ok: (s) => s.bled && s.field < 5},
  {do: 'Khâu đóng ít nhất 3 mũi qua hai mép', ok: (s) => s.stitches >= 3},
];
const PILL = (on: boolean) => `min-h-[36px] rounded-full border px-2.5 text-xs font-medium ${on ? 'border-[#1D1B16] bg-[#1D1B16] text-[#F3EFE6]' : 'border-[#1D1B16]/20 bg-white'}`;
const HOW: Record<TTool, string> = {
  scalpel: 'Chụm và kéo trên mô: mỗi nhát cắt một lớp; rạch lại cùng đường để vào sâu.',
  forceps: 'Chụm vào mép mô và kéo: buông thì mô trở lại. Kéo quá mạnh thì rách.',
  retractor: 'Chụm vào mép vết mổ, kéo sang bên rồi buông: banh giữ nguyên. Chụm lại vào banh để tháo.',
  suction: 'Giữ chụm trên vũng máu để hút.',
  cautery: 'Giữ chụm trên chỗ rỉ máu: mô trắng rồi xém, khói bốc, mao mạch và tĩnh mạch nhỏ ngừng chảy.',
  clamp: 'Chụm một lần ở đầu mạch bị đứt để kẹp.',
  needle: 'Chụm một lần ở mép bên này, một lần ở mép đối diện: mũi chỉ thắt lại kéo hai mép khép vào.',
};

/**
 * Bài "Mổ mô mềm" (Sinh): khối mô ba lớp (da, mỡ, cơ) mô phỏng vật lý trong `HandsTissue3D` (`xpbd.ts`, `pbf.ts`).
 * Hai tay mỗi tay một dụng cụ (tay thứ hai thường cầm kẹp hoặc banh để vén mô); chuột dùng dụng cụ của tay 1.
 */
export const TissueLab: React.FC<{Shell: React.FC<ShellProps>}> = ({Shell}) => {
  const live = useRef<TissueLive>({tools: ['scalpel', 'retractor'], stats: newStats(), warn: ''}).current;
  const [epoch, setEpoch] = useState(0);
  const [, tick] = useReducer((x: number) => x + 1, 0);
  // số liệu do cảnh ghi mỗi khung; bảng đọc 4 lần mỗi giây
  useEffect(() => {
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, []);
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as {__tissue?: TissueLive}).__tissue = live;
  const s = live.stats;
  const done = GOALS.filter((g) => g.ok(s)).length;
  const reset = () => {
    Object.assign(live, {stats: newStats(), warn: ''});
    setEpoch((e) => e + 1);
  };
  return (
    <Shell
      hint="Mỗi tay một dụng cụ: chụm vào khay bên phải để lấy. Tay 1 rạch / đốt / khâu, tay 2 cầm banh hoặc kẹp để vén mô. Chụm và kéo trên mô để thao tác."
      render={(input, onFail) => <Tissue3D key={epoch} input={input} live={live} onFail={onFail} />}
    >
      <p className="leading-relaxed text-[#4B473D]">
        <b className="block font-semibold text-[#1D1B16]">Nhiệm vụ · tập mổ mô mềm</b>
        Khối mô thật theo vật lý: da dai và căng, mỡ mềm dễ tách, cơ có thớ. Rạch vào sâu từng lớp, vén mép, tìm mạch máu trong lớp mỡ, cầm máu, hút sạch rồi khâu đóng.
      </p>
      {(['Tay 1 (và chuột)', 'Tay 2'] as const).map((lbl, h) => (
        <div key={lbl} role="group" aria-label={lbl} className="flex flex-wrap items-center gap-1">
          <span className="w-full text-xs font-semibold">{lbl}</span>
          {TTOOLS.map((t) => (
            <button key={t} type="button" data-testid={`tissue-tool-${h}-${t}`} aria-pressed={live.tools[h] === t} onClick={() => { live.tools[h] = t; tick(); }} className={PILL(live.tools[h] === t)}>
              {TTOOL_NAME[t]}
            </button>
          ))}
          <span className="w-full text-xs text-[#4B473D]">{HOW[live.tools[h]]}</span>
        </div>
      ))}
      {live.warn && (
        <p role="alert" data-testid="tissue-warn" className="rounded-xl bg-[#C4261A]/[.08] px-3 py-2 text-xs font-medium text-[#C4261A]">
          {live.warn}
        </p>
      )}
      <ol data-testid="tissue-goals" data-done={done} className="flex flex-col gap-1">
        {GOALS.map((g, i) => {
          const ok = g.ok(s);
          return (
            <li key={i} className="flex gap-2 text-xs">
              <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${ok ? 'bg-[#1F7A4D] text-white' : 'bg-[#1D1B16]/10'}`}>{ok ? '✓' : i + 1}</span>
              {g.do}
            </li>
          );
        })}
      </ol>
      <div data-testid="tissue-stats" className="grid grid-cols-2 gap-x-3 gap-y-0.5 rounded-xl bg-[#1D1B16]/[.05] px-3 py-2 text-xs tabular-nums">
        <span>Máu đã mất</span>
        <b>{s.loss.toFixed(0)} mL</b>
        <span>Máu đọng hốc mổ</span>
        <b>{s.field.toFixed(0)} mL</b>
        <span>Đã hút</span>
        <b>{s.sucked.toFixed(0)} mL</b>
        <span>Đang chảy</span>
        <b className={s.active.artery + s.active.vein + s.active.capillary ? 'text-[#C4261A]' : ''}>{[s.active.artery && `động mạch ${s.active.artery}`, s.active.vein && `tĩnh mạch ${s.active.vein}`, s.active.capillary && `mao mạch ${s.active.capillary}`].filter(Boolean).join(', ') || 'không'}</b>
        <span>Banh đang đặt</span>
        <b>{s.retractors}</b>
        <span>Mũi khâu</span>
        <b>{s.stitches}</b>
        <span>Phần tử mô rách</span>
        <b className={s.torn ? 'text-[#C4261A]' : ''}>{s.torn}</b>
      </div>
      <p className="text-xs leading-relaxed text-[#4B473D]">
        Mô hình: khối tứ diện giải bằng động lực học dựa trên vị trí (độ cứng riêng từng lớp, da căng sẵn, rạch = xoá phần tử, kéo quá ngưỡng = rách); máu là chất lỏng hạt đọng theo mặt hốc mổ; chỉ khâu là chuỗi hạt không giãn. Mô phỏng học tập, không phải mô hình phần tử hữu hạn đầy đủ.
      </p>
      <button type="button" data-testid="tissue-reset" onClick={reset} className={BTN_GHOST}>
        Làm lại khối mô mới
      </button>
    </Shell>
  );
};
