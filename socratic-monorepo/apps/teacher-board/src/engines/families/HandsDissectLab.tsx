'use client';

import React, {useReducer, useRef, useState} from 'react';
import {DISSECT_BY_ID, TOOLS, TOOL_NAME, beatRate, current, dissectReducer, newDissect, stepDone, toolOf, type DAction} from '../../utils/lab/hands/dissect';
import {BTN_GHOST} from './Controls';
import type {DissectLive} from './HandsDissect3D';
import type {HandsInput} from './handsKit';

const Dissect3D = React.lazy(() => import('./HandsDissect3D'));
type ShellProps = {hint: string; render: (input: HandsInput, onFail: () => void) => React.ReactNode; children: React.ReactNode};

/**
 * Bài mổ / quan sát cấu tạo (Sinh): cảnh 3D `HandsDissect3D` + cột bên phải (dụng cụ đang cầm, các bước, cảnh báo, làm lại).
 * Cảnh và bảng dùng chung một `dissectReducer`: chụm trong cảnh, bấm nút trên bảng hay test đều đi cùng một đường.
 */
export const DissectLab: React.FC<{id: string; Shell: React.FC<ShellProps>}> = ({id, Shell}) => {
  const spec = DISSECT_BY_ID[id];
  const [st, dispatch] = useReducer((s: ReturnType<typeof newDissect>, a: DAction) => dissectReducer(spec, s, a), undefined, newDissect);
  // cảnh đọc trạng thái mới ngay trong khung hình tiếp theo, không chờ React vẽ lại (chụm lấy dụng cụ rồi chụm làm ngay vẫn đúng)
  const live = useRef<DissectLive>({spec, st, dispatch: (a) => {
    live.current.st = dissectReducer(spec, live.current.st, a);
    dispatch(a);
  }});
  // làm lại: dựng lại cảnh (kim đã cắm, lớp đã lật về như lúc đầu)
  const [epoch, setEpoch] = useState(0);
  Object.assign(live.current, {spec, st});
  // chỉ khi phát triển: cho phép máy dò trình duyệt nhảy tới một bước (`window.__dissect.run(id)` làm đúng mọi bước tới bước n)
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as {__dissect?: DissectLive}).__dissect = live.current;
  const cur = current(spec, st);
  const done = cur >= spec.steps.length;
  const need = done ? null : toolOf(spec.steps[cur]);
  const rate = beatRate(spec, st);

  return (
    <Shell hint="Lấy dụng cụ ở khay bên phải bằng một lần chụm, rồi làm theo vòng cam trên mẫu. Giữ yên tay trên một cơ quan để gọi tên." render={(input, onFail) => <Dissect3D key={epoch} input={input} live={live.current} onFail={onFail} />}>
      <p className="leading-relaxed text-[#4B473D]">
        <b className="block font-semibold text-[#1D1B16]">Nhiệm vụ · {spec.lesson}</b>
        {spec.goal}
      </p>
      <div data-testid="dissect-status" data-done={done} data-step={cur} className={`rounded-xl px-3 py-2 leading-relaxed ${done ? 'bg-[#1F7A4D]/[.09]' : 'bg-[#1D1B16]/[.05]'}`}>
        <b className={`block font-semibold ${done ? 'text-[#1F7A4D]' : ''}`}>{done ? 'Hoàn thành tất cả các bước' : `Bước ${cur + 1}/${spec.steps.length}: ${spec.steps[cur].do}`}</b>
        {!done && need && <span>Cần: {TOOL_NAME[need].toLowerCase()} · đang cầm: {st.tool ? TOOL_NAME[st.tool].toLowerCase() : 'tay không'}</span>}
        {!done && !need && <span>Chỉ vào cơ quan bằng tay không hoặc dụng cụ nào cũng được.</span>}
        {rate > 0 && <span data-testid="dissect-rate" className="block">Nhịp tim ếch ≈ {rate} lần/phút{st.drops > 0 ? ' (sau khi nhỏ adrenaline)' : ''}</span>}
      </div>
      {st.warn && (
        <p data-testid="dissect-warn" role="alert" className="rounded-xl bg-[#C4261A]/[.08] px-3 py-2 font-medium text-[#C4261A]">
          {st.warn}
        </p>
      )}
      <div role="group" aria-label="Dụng cụ đang cầm" className="flex flex-wrap gap-1.5">
        {TOOLS.map((t) => (
          <button key={t} type="button" data-testid={`dissect-tool-${t}`} aria-pressed={st.tool === t} onClick={() => live.current.dispatch({t: 'tool', tool: st.tool === t ? null : t})} className={`min-h-[44px] rounded-full border px-3 text-xs font-medium ${st.tool === t ? 'border-[#1D1B16] bg-[#1D1B16] text-[#F3EFE6]' : 'border-[#1D1B16]/20 bg-white'} ${need === t && st.tool !== t ? 'ring-2 ring-[#D9481C]' : ''}`}>
            {TOOL_NAME[t]}
          </button>
        ))}
      </div>
      <ol className="flex flex-col gap-1">
        {spec.steps.map((s, i) => {
          const ok = stepDone(spec, st, i);
          const extra = s.kind === 'name' ? ` (${s.organs.filter((o) => st.named.includes(o)).length}/${s.organs.length})` : s.kind === 'pin' ? ` (${st.pins[i]?.length ?? 0}/${s.targets.length})` : s.kind === 'cut' && !ok && (st.cut[i] ?? 0) > 0 ? ` (${Math.round((st.cut[i] ?? 0) * 100)} %)` : '';
          return (
            <li key={i} data-testid={`dissect-step-${i}`} data-done={ok} className={`flex gap-2 rounded-lg px-2 py-1 ${i === cur ? 'bg-white font-semibold text-[#1D1B16]' : 'text-[#4B473D]'}`}>
              <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${ok ? 'bg-[#1F7A4D] text-white' : i === cur ? 'bg-[#D9481C] text-white' : 'bg-[#1D1B16]/10'}`}>{ok ? '✓' : i + 1}</span>
              <span>
                {s.do}
                {extra}
              </span>
            </li>
          );
        })}
      </ol>
      {done && (
        <p data-testid="dissect-conclude" className="rounded-xl bg-[#1F7A4D]/[.09] px-3 py-2 leading-relaxed text-[#1D1B16]">
          <b className="block font-semibold text-[#1F7A4D]">Kết luận</b>
          {spec.conclude}
        </p>
      )}
      <p className="leading-relaxed text-[#4B473D]">{spec.safety}</p>
      <button type="button" data-testid="dissect-reset" onClick={() => { live.current.dispatch({t: 'reset'}); setEpoch((e) => e + 1); }} className={BTN_GHOST}>
        Làm lại từ đầu
      </button>
    </Shell>
  );
};
