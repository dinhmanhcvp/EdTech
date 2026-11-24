'use client';

import React, {useEffect, useReducer, useRef, useState} from 'react';
import {clampScope, BENCH, CHOLE_PHASES, LAP_TASKS, PASS_SCORE, RIGHT_TOOL_NAME, lapScore, newLap, type LapTaskId, type RightTool} from '../../utils/lab/hands/laparo';
import {BAND, MEMB, WINDOW, clearedIn} from '../../utils/lab/hands/lapDissect';
import {BTN_GHOST} from './Controls';
import type {LaparoLive} from './HandsLaparo3D';
import type {HandsInput} from './handsKit';

const Laparo3D = React.lazy(() => import('./HandsLaparo3D'));
type ShellProps = {hint: string; render: (input: HandsInput, onFail: () => void) => React.ReactNode; children: React.ReactNode; lens?: React.ReactNode};
const PILL = (on: boolean) => `min-h-[40px] rounded-full border px-3 text-xs font-medium ${on ? 'border-[#1D1B16] bg-[#1D1B16] text-[#F3EFE6]' : 'border-[#1D1B16]/20 bg-white'}`;
const RIGHT_TOOLS: RightTool[] = ['grasper', 'hook', 'clip', 'scissors'];
const clock = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

/** đồng hồ của lượt tập trên hình ống soi */
const ScopeFrame: React.FC<{live: LaparoLive}> = ({live}) => {
  const [, tick] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, []);
  return (
    <>
      <div data-testid="lap-clock" className="pointer-events-none absolute right-4 top-24 z-10 rounded-lg bg-black/65 px-2.5 py-1 font-mono text-sm tabular-nums text-[#E8F4EE]">
        {clock(live.st.t)}
      </div>
    </>
  );
};

/**
 * Bài "Trạm tập nội soi" (Sinh): hai dụng cụ qua trocar có hiệu ứng điểm tựa, ba bài kỹ năng, chấm theo thời gian, quãng đường và an toàn.
 * Cảnh `HandsLaparo3D`, logic thuần ở `laparo.ts`.
 */
export const LaparoLab: React.FC<{Shell: React.FC<ShellProps>}> = ({Shell}) => {
  const live = useRef<LaparoLive>({st: newLap('touch'), mouseHand: 0, right: 'grasper'}).current;
  const [epoch, setEpoch] = useState(0);
  const [, tick] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const swap = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.('input, textarea, select')) return;
      // ống soi: mũi tên lia tâm nhìn, +/− (hoặc PageUp/PageDown) đưa ống soi vào / ra, 0 về khung chuẩn
      const sc = live.scope ?? {zoom: 1, x: 0, z: 0};
      const PAN: Record<string, [number, number]> = {ArrowLeft: [-0.25, 0], ArrowRight: [0.25, 0], ArrowUp: [0, -0.25], ArrowDown: [0, 0.25]};
      if (PAN[e.code]) {
        e.preventDefault();
        live.scope = clampScope({...sc, x: sc.x + PAN[e.code][0], z: sc.z + PAN[e.code][1]});
        return;
      }
      if (e.key === '+' || e.key === '=' || e.code === 'PageUp' || e.key === '-' || e.code === 'PageDown') {
        e.preventDefault();
        live.scope = clampScope({...sc, zoom: sc.zoom * (e.key === '+' || e.key === '=' || e.code === 'PageUp' ? 0.88 : 1.14)});
        return;
      }
      if (e.key === '0') {
        live.scope = {zoom: 1, x: 0, z: 0};
        return;
      }
      if (e.code !== 'Space') return;
      e.preventDefault();
      live.mouseHand = live.mouseHand ? 0 : 1;
      tick();
    };
    // lăn chuột trên cảnh = đưa ống soi vào / ra (Stage3D chặn lăn để không cuộn trang; nghe ở pha bắt)
    const wheel = (e: WheelEvent) => {
      if (!(e.target as HTMLElement | null)?.closest?.('[data-testid=scene-3d]')) return;
      const sc = live.scope ?? {zoom: 1, x: 0, z: 0};
      live.scope = clampScope({...sc, zoom: sc.zoom * Math.exp(e.deltaY * 0.0012)});
    };
    window.addEventListener('keydown', swap);
    window.addEventListener('wheel', wheel, {capture: true, passive: true});
    return () => {
      window.removeEventListener('keydown', swap);
      window.removeEventListener('wheel', wheel, {capture: true});
    };
  }, [live]);
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as {__laparo?: LaparoLive}).__laparo = live;
  const s = live.st;
  const score = lapScore(s);
  const b = BENCH[s.task];
  const restart = (task: LapTaskId) => {
    live.st = newLap(task);
    live.scope = {zoom: 1, x: 0, z: 0};
    live.right = task === 'clip' ? 'clip' : task === 'chole' ? 'hook' : 'grasper';
    live.mouseHand = task === 'clip' || task === 'chole' ? 1 : 0;
    setEpoch((e) => e + 1);
  };
  const task = LAP_TASKS.find((t) => t.id === s.task)!;
  return (
    <Shell
      hint="Mỗi tay điều khiển một dụng cụ qua điểm tựa ở thành bụng: tay sang phải thì mũi sang trái. Chụm để kẹp, nhả để buông. Dùng chuột: Space đổi tay; ở bước cần giữ, bấm một lần để khóa kẹp, bấm lần nữa để nhả. Ống soi (người phụ mổ): lăn chuột hoặc +/− để đưa vào / ra, phím mũi tên để lia, 0 về khung chuẩn."
      render={(input, onFail) => <Laparo3D key={epoch} input={input} live={live} onFail={onFail} />}
      lens={<ScopeFrame live={live} />}
    >
      <p className="leading-relaxed text-[#4B473D]">
        <b className="block font-semibold text-[#1D1B16]">Nhiệm vụ · {task.name}</b>
        {task.goal}
      </p>
      <div role="tablist" aria-label="Bài tập" className="flex flex-wrap gap-1.5">
        {LAP_TASKS.map((t) => (
          <button key={t.id} type="button" role="tab" data-testid={`lap-task-${t.id}`} aria-selected={s.task === t.id} onClick={() => restart(t.id)} className={PILL(s.task === t.id)}>
            {t.name}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Chuột điều khiển" className="flex flex-wrap items-center gap-1.5">
        <span className="w-full text-xs font-semibold">Chuột điều khiển (phím Space để đổi tay)</span>
        {(['Tay trái', 'Tay phải'] as const).map((n, h) => (
          <button key={n} type="button" data-testid={`lap-hand-${h}`} aria-pressed={live.mouseHand === h} onClick={() => { live.mouseHand = h as 0 | 1; tick(); }} className={PILL(live.mouseHand === h)}>
            {n}
          </button>
        ))}
      </div>
      {s.task === 'chole' && (
        <ol data-testid="lap-phases" data-phase={s.phase} className="flex flex-col gap-1">
          {CHOLE_PHASES.map((p, i) => {
            const at = CHOLE_PHASES.findIndex((q) => q.id === s.phase);
            const ok = i < at || (s.done && !s.bled);
            const now = i === at && !s.done;
            const pct = p.id === 'expose' ? clearedIn(s.memb, MEMB, WINDOW) / 0.85 : p.id === 'cvs' ? s.cvs.filter(Boolean).length / 2 : p.id === 'bed' ? clearedIn(s.band, BAND) / 0.92 : p.id === 'bag' ? (s.bagged ? 1 : s.gbHeld ? 0.5 : 0) : 0;
            return (
              <li key={p.id} className={`flex gap-2 rounded-lg px-2 py-1 text-xs ${now ? 'bg-white font-semibold' : ''}`}>
                <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${ok ? 'bg-[#1F7A4D] text-white' : now ? 'bg-[#D9481C] text-white' : 'bg-[#1D1B16]/10'}`}>{ok ? '✓' : i + 1}</span>
                <span>
                  {p.name}
                  {now && pct > 0 ? ` · ${Math.min(100, Math.round(pct * 100))} %` : ''}
                  {now && <span className="block font-normal text-[#4B473D]">{p.how}</span>}
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {(s.task === 'clip' || s.task === 'chole') && (
        <div role="group" aria-label="Dụng cụ tay phải" className="flex flex-wrap items-center gap-1.5">
          <span className="w-full text-xs font-semibold">Dụng cụ tay phải</span>
          {RIGHT_TOOLS.map((t) => (
            <button key={t} type="button" data-testid={`lap-tool-${t}`} aria-pressed={live.right === t} onClick={() => { live.right = t; tick(); }} className={PILL(live.right === t)}>
              {RIGHT_TOOL_NAME[t]}
            </button>
          ))}
        </div>
      )}
      {s.warn && (
        <p role="alert" data-testid="lap-warn" className="rounded-xl bg-[#C4261A]/[.08] px-3 py-2 text-xs font-medium text-[#C4261A]">
          {s.warn}
        </p>
      )}
      <div data-testid="lap-metrics" className="grid grid-cols-2 gap-x-3 gap-y-0.5 rounded-xl bg-[#1D1B16]/[.05] px-3 py-2 text-xs tabular-nums">
        <span>Thời gian</span>
        <b>{clock(s.t)} / {clock(b.time)}</b>
        <span>Quãng đường tay trái</span>
        <b>{s.path[0].toFixed(1)}</b>
        <span>Quãng đường tay phải</span>
        <b>{s.path[1].toFixed(1)}</b>
        <span>Va chạm cơ quan</span>
        <b className={s.errors.collide ? 'text-[#C4261A]' : ''}>{s.errors.collide}</b>
        <span>Rơi vòng</span>
        <b className={s.errors.drop ? 'text-[#C4261A]' : ''}>{s.errors.drop}</b>
        <span>Thao tác sai</span>
        <b className={s.errors.miss ? 'text-[#C4261A]' : ''}>{s.errors.miss}</b>
        {(s.task === 'clip' || s.task === 'chole') && (
          <>
            <span>Máu mất</span>
            <b data-testid="lap-loss" className={s.bleed ? 'text-[#C4261A]' : ''}>{s.loss.toFixed(0)} mL{s.bleed ? ' · đang chảy' : ''}</b>
          </>
        )}
      </div>
      {s.done && (
        <div data-testid="lap-score" data-total={score.total} data-pass={score.pass} className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${score.pass ? 'bg-[#1F7A4D]/[.09]' : 'bg-[#C4261A]/[.08]'}`}>
          <b className={`block text-sm font-semibold ${score.pass ? 'text-[#1F7A4D]' : 'text-[#C4261A]'}`}>
            {score.total}/100 · {score.pass ? 'Đạt' : `Chưa đạt (cần ${PASS_SCORE})`}
          </b>
          Thời gian {score.time}/30 · Tiết kiệm đường đi {score.economy}/30 · An toàn {score.safety}/40
          {s.bled && <span className="block font-medium text-[#C4261A]">Cắt khi chưa đủ clip nên không đạt dù các phần khác tốt.</span>}
        </div>
      )}
      <button type="button" data-testid="lap-restart" onClick={() => restart(s.task)} className={BTN_GHOST}>
        Tập lại bài này
      </button>
      <p className="text-xs leading-relaxed text-[#4B473D]">Mô phỏng học tập, không phải hướng dẫn phẫu thuật. Không có phản hồi lực; mức điểm do dự án tự đặt, chưa kiểm định với phẫu thuật viên, không dùng để đánh giá tay nghề lâm sàng.</p>
    </Shell>
  );
};
