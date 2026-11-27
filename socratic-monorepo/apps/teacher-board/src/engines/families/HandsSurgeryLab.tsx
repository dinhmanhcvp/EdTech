'use client';

import React, {useEffect, useReducer, useRef, useState} from 'react';
import {CHECKLIST, GAUZE_TOTAL, LAYERS, SURG_NAME, SURG_TOOLS, STEP_DO, STEP_TOOL, alarms, bleedRate, capnoAt, debrief, ecgAt, mapOf, newSurg, plethAt, surgReducer, surgStep, type CheckPhase, type SAction} from '../../utils/lab/hands/surgery';
import {ACT_SAFE, CABG_BRIEF, CABG_SIGNOUT, CABG_STEPS, SKIN_STITCHES, WIRES, CABG_TOOLS, CABG_TOOL_NAME, cabgDebrief, cabgReducer, cabgStep, cabgTool, cabgVitals, monitorLanes, newCabg, type CabgAction} from '../../utils/lab/hands/cabg';
import {BTN, BTN_GHOST} from './Controls';
import type {OrView, SliceAxis, SurgMode, SurgeryLive} from './HandsSurgery3D';
import type {HandsInput} from './handsKit';

const Surgery3D = React.lazy(() => import('./HandsSurgery3D'));
type ShellProps = {hint: string; render: (input: HandsInput, onFail: () => void) => React.ReactNode; children: React.ReactNode; lens?: React.ReactNode};
const PILL = (on: boolean) => `min-h-[40px] rounded-full border px-3 text-xs font-medium ${on ? 'border-[#1D1B16] bg-[#1D1B16] text-[#F3EFE6]' : 'border-[#1D1B16]/20 bg-white'}`;
const MODES: [SurgMode, string][] = [
  ['cabg', 'Ca mổ bắc cầu mạch vành'],
  ['surgery', 'Mở màng ngoài tim'],
  ['slice', 'Cắt lớp'],
  ['peel', 'Bóc lớp'],
];
const AXES: [SliceAxis, string][] = [
  ['front', 'Bốn buồng'],
  ['short', 'Ngang'],
  ['side', 'Dọc'],
];
const VIEW_NAME: [OrView, string][] = [
  ['field', 'Trường mổ'],
  ['room', 'Toàn phòng'],
];
/** ba làn sóng của monitor: [màu, tâm làn (phần chiều cao), biên độ] */
const LANES: [string, number, number][] = [
  ['#46F08C', 0.2, 0.15],
  ['#7AD8F7', 0.62, 0.2],
  ['#F7E27A', 0.96, 0.22],
];

/** sinh hiệu đưa lên monitor: ca bắc cầu lấy theo trạng thái tuần hoàn (máy tim phổi, liệt tim, rung thất), chế độ khác theo ca mở màng ngoài tim */
const vitalsOf = (L: SurgeryLive) => {
  if (L.mode !== 'cabg') return L.st.vitals;
  const c = cabgVitals(L.cabg);
  return {...L.st.vitals, hr: c.hr, sys: c.sys, dia: c.dia, spo2: c.spo2, etco2: c.etco2};
};
const monOf = (L: SurgeryLive) => (L.mode === 'cabg' ? cabgVitals(L.cabg) : {rhythm: 'sinus' as const, pulsatile: true, vent: true});

/** monitor gây mê ở góc cảnh: điện tim, sóng mạch, sóng CO₂ chạy; nhịp, huyết áp, SpO₂, EtCO₂, thân nhiệt, máu mất; bíp theo từng nhịp, tiếng trầm dần khi SpO₂ giảm */
const VitalsMonitor: React.FC<{live: React.MutableRefObject<SurgeryLive>}> = ({live}) => {
  const cv = useRef<HTMLCanvasElement>(null);
  const [, tick] = useReducer((x: number) => x + 1, 0);
  const [sound, setSound] = useState(true);
  const soundRef = useRef(sound);
  soundRef.current = sound;
  useEffect(() => {
    let raf = 0;
    let x = 0;
    let prevY = [0, 0, 0];
    let phase = 0;
    let breath = 0;
    let lastBeep = 0;
    let last = performance.now();
    let ac: AudioContext | null = null;
    const unlock = () => {
      try {
        ac ??= new AudioContext();
        void ac.resume();
      } catch {
        ac = null;
      }
    };
    window.addEventListener('pointerdown', unlock);
    const beep = (hz: number) => {
      if (!ac || ac.state !== 'running') return;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.frequency.value = hz;
      g.gain.setValueAtTime(0.06, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.06);
      o.connect(g).connect(ac.destination);
      o.start();
      o.stop(ac.currentTime + 0.065);
    };
    let ui = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const v = vitalsOf(live.current);
      const m = monOf(live.current);
      const c = cv.current?.getContext('2d');
      if (c && cv.current) {
        const W = cv.current.width;
        const H = cv.current.height;
        phase += (dt * Math.max(0, v.hr)) / 60;
        if (phase >= 1) {
          phase -= 1;
          // bíp 60 ms mỗi nhịp; cao độ giảm theo SpO₂ như monitor phòng mổ, nghe được mà không cần nhìn
          if (soundRef.current && now - lastBeep > 200 && m.rhythm !== 'vf' && v.hr > 0) {
            beep(Math.max(520, 880 - (99 - v.spo2) * 30));
            lastBeep = now;
          }
        }
        // cùng đồng hồ với cảnh 3D (phổi thở, monitor trên máy gây mê): sóng CO₂ khớp nhịp phổi phồng / xẹp
        breath = ((now / 1000) * v.rr / 60) % 1;
        const lanes = monitorLanes(m, [ecgAt(phase), plethAt(phase), capnoAt(breath) * (v.etco2 / 40)], now / 1000);
        const vals = [lanes[0], -lanes[1], -lanes[2]];
        const nx = (x + dt * 70) % W;
        c.fillStyle = '#05130F';
        c.fillRect(x, 0, Math.max(6, nx - x + 6), H);
        c.lineWidth = 1.6;
        const ys = LANES.map(([col, y0, a], i) => {
          const py = H * y0 + vals[i] * H * a;
          c.strokeStyle = i === 0 && alarms(v).length ? '#FF6B5A' : col;
          c.beginPath();
          c.moveTo(x, prevY[i] || py);
          if (nx > x) c.lineTo(nx, py);
          c.stroke();
          return py;
        });
        prevY = ys;
        x = nx < x ? 0 : nx;
      }
      // chữ số cập nhật 4 lần mỗi giây
      if (now - ui > 250) {
        ui = now;
        tick();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointerdown', unlock);
      void ac?.close();
    };
  }, [live]);
  const v = vitalsOf(live.current);
  const m = monOf(live.current);
  const cab = live.current.mode === 'cabg';
  const al = cab ? (m.rhythm === 'vf' ? ['Rung thất'] : m.rhythm === 'arrest' ? ['Tim ngừng (liệt tim)'] : []) : alarms(v);
  const bleed = cab ? 0 : bleedRate(live.current.st);
  return (
    <div data-testid="vitals" data-hr={Math.round(v.hr)} className="pointer-events-auto absolute bottom-9 right-3 z-10 w-[236px] rounded-xl border border-white/10 bg-[#05130F]/95 p-2 font-mono text-[11px] text-[#CFE9DC] shadow-lg">
      <div className="flex items-center justify-between">
        <span className="font-semibold tracking-wide text-[#46F08C]">MONITOR</span>
        <button type="button" onClick={() => setSound((s) => !s)} className="rounded px-1.5 text-[10px] text-[#CFE9DC]/80 ring-1 ring-white/15" aria-pressed={sound}>
          {sound ? 'Tắt tiếng' : 'Bật tiếng'}
        </button>
      </div>
      <canvas ref={cv} width={220} height={92} className="mt-1 block h-[92px] w-[220px] rounded bg-[#05130F]" />
      <div className="mt-1 grid grid-cols-3 gap-1">
        <span>
          <b className={`block text-lg leading-none ${v.hr > 110 || m.rhythm === 'vf' ? 'text-[#FF6B5A]' : 'text-[#46F08C]'}`}>{m.rhythm === 'vf' ? 'VF' : Math.round(v.hr)}</b>nhịp/phút
        </span>
        <span>
          <b className={`block text-lg leading-none ${v.sys < 90 ? 'text-[#FF6B5A]' : 'text-[#F7E27A]'}`}>
            {Math.round(v.sys)}/{Math.round(v.dia)}
          </b>
          mmHg
        </span>
        <span>
          <b className={`block text-lg leading-none ${v.spo2 < 94 ? 'text-[#FF6B5A]' : 'text-[#7AD8F7]'}`}>{Math.round(v.spo2)}</b>SpO₂ %
        </span>
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-[#CFE9DC]/80">
        <span data-testid="vitals-map">MAP {Math.round(mapOf(v))}</span>
        <span data-testid="vitals-etco2" className={v.etco2 < 25 ? 'text-[#FF6B5A]' : 'text-[#F7E27A]'}>
          EtCO₂ {Math.round(v.etco2)}
        </span>
        <span>{m.vent ? `NT ${v.rr}` : 'Ngừng thở máy'}</span>
        <span>{v.temp.toFixed(1)}°C</span>
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-[#CFE9DC]/80">
        <span>{cab ? (cabgVitals(live.current.cabg).pumpFlow ? `Máy ${cabgVitals(live.current.cabg).pumpFlow} L/phút` : 'Máy tim phổi tắt') : `Mất máu ${Math.round(v.loss)} mL`}</span>
        <span className={bleed ? 'text-[#FF6B5A]' : ''}>{bleed ? `Đang chảy ${bleed} mL/s` : v.deficit > 1 ? `Truyền dịch bù, thiếu ${Math.round(v.deficit)} mL` : 'Không chảy máu'}</span>
      </div>
      {al.length > 0 && <div className="mt-1 rounded bg-[#FF6B5A]/20 px-1.5 py-0.5 text-[#FFB3A8]">⚠ {al.join(' · ')}</div>}
    </div>
  );
};

/**
 * Bài "Phẫu thuật tim" (Sinh): ba chế độ trên một quả tim Blender. Cảnh 3D `HandsSurgery3D`, logic thuần ở `surgery.ts`.
 * Cảnh và bảng dùng chung `surgReducer`; nhịp đồng hồ (tick) và hút dịch gửi mỗi khung hình nên React chỉ vẽ lại theo nhịp chậm.
 */
export const SurgeryLab: React.FC<{Shell: React.FC<ShellProps>}> = ({Shell}) => {
  const [, redraw] = useReducer((x: number) => x + 1, 0);
  const lastDraw = useRef(0);
  const [epoch, setEpoch] = useState(0);
  const live = useRef<SurgeryLive>({
    mode: 'cabg',
    st: newSurg(true),
    cabg: newCabg(),
    cabgDispatch: (a: CabgAction) => {
      const L = live.current;
      const next = cabgReducer(L.cabg, a);
      if (next === L.cabg) return;
      L.cabg = next;
      const now = performance.now();
      if ((a.t !== 'tick' && a.t !== 'plegia' && a.t !== 'cut') || now - lastDraw.current > 300) {
        lastDraw.current = now;
        redraw();
      }
    },
    view: 'field',
    peeled: 0,
    slice: {axis: 'front', off: 0.0, tilt: 0, locked: false},
    dispatch: (a: SAction) => {
      const L = live.current;
      const next = surgReducer(L.st, a);
      if (next === L.st) return;
      L.st = next;
      const now = performance.now();
      if ((a.t !== 'tick' && a.t !== 'suck') || now - lastDraw.current > 300) {
        lastDraw.current = now;
        redraw();
      }
    },
    setPeeled: (n: number) => {
      live.current.peeled = Math.max(0, Math.min(LAYERS.length, n));
      redraw();
    },
  });
  const L = live.current;
  if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') (window as unknown as {__surgery?: SurgeryLive}).__surgery = L;
  const st = L.st;
  const step = surgStep(st);
  const setMode = (m: SurgMode) => {
    L.mode = m;
    L.st = {...L.st, warn: ''};
    L.cabg = {...L.cabg, warn: ''};
    redraw();
  };
  const cb = L.cabg;
  const cStep = cabgStep(cb);
  const cNeed = cabgTool(cStep);
  const cv = cabgVitals(cb);
  const mmss = (x: number) => `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
  const team: [CabgAction, string, boolean][] = [
    [{t: 'heparin'}, 'Tiêm heparin', cStep === 'heparin' && !cb.heparin],
    [{t: 'pumpOn'}, 'Lên máy tim phổi', cStep === 'pumpOn'],
    [{t: 'shock'}, 'Sốc điện trong 20 J', cStep === 'defib'],
    [{t: 'wean'}, 'Thở lại, cai máy', cStep === 'wean'],
    [{t: 'protamine'}, 'Tiêm protamine', cStep === 'protamine'],
    [{t: 'flow'}, 'Đo lưu lượng cầu nối', cStep === 'flow'],
    [{t: 'count'}, 'Đếm đủ gạc, kim, dụng cụ', cStep === 'count'],
  ];

  const phase: CheckPhase | null = step === 'signin' || step === 'timeout' || step === 'signout' ? step : null;
  const need = step === 'done' ? null : STEP_TOOL[step];

  return (
    <Shell
      hint="Ca mổ bắc cầu: lấy dụng cụ ở khay bên phải bằng một lần chụm, làm theo vòng cam; bước của kíp (heparin, lên máy, sốc điện, cai máy, protamine) bấm ở bảng điều khiển. Cắt lớp: tay xòe dời mặt cắt. Bóc lớp: chụm vào lớp ngoài cùng rồi kéo ra."
      render={(input, onFail) => <Surgery3D key={epoch} input={input} live={L} onFail={onFail} />}
      lens={<VitalsMonitor live={live} />}
    >
      <p className="leading-relaxed text-[#4B473D]">
        <b className="block font-semibold text-[#1D1B16]">Nhiệm vụ · Sinh 11, bài 9–11 (tuần hoàn)</b>
        Thực hiện một ca mổ tim thật — bắc cầu động mạch vành (động mạch ngực trong trái nối vào động mạch liên thất trước) trên máy tim phổi nhân tạo — và thấy tuần hoàn thay đổi ra sao ở từng bước; hoặc xem cấu tạo tim bằng mặt cắt, bóc lớp, và tập mở màng ngoài tim.
      </p>
      <div role="tablist" aria-label="Chế độ" className="flex gap-1.5">
        {MODES.map(([m, name]) => (
          <button key={m} type="button" role="tab" data-testid={`surg-mode-${m}`} aria-selected={L.mode === m} onClick={() => setMode(m)} className={PILL(L.mode === m)}>
            {name}
          </button>
        ))}
      </div>

      <div role="group" aria-label="Góc nhìn" className="flex gap-1.5">
        {VIEW_NAME.map(([v, name]) => (
          <button key={v} type="button" data-testid={`surg-view-${v}`} aria-pressed={L.view === v} onClick={() => { L.view = v; redraw(); }} className={PILL(L.view === v)}>
            {name}
          </button>
        ))}
      </div>

      {L.mode === 'cabg' && (
        <>
          <div data-testid="cabg-status" data-step={cStep} className={`rounded-xl px-3 py-2 leading-relaxed ${cStep === 'done' ? 'bg-[#1F7A4D]/[.09]' : 'bg-[#1D1B16]/[.05]'}`}>
            {cStep === 'done' ? (
              <b className="block font-semibold text-[#1F7A4D]">Ca mổ hoàn tất</b>
            ) : (
              <>
                <b className="block font-semibold">
                  Bước {CABG_STEPS.findIndex((x) => x.id === cStep) + 1}/{CABG_STEPS.length} · {CABG_STEPS.find((x) => x.id === cStep)!.name}
                </b>
                <span className="block">{CABG_STEPS.find((x) => x.id === cStep)!.how}</span>
                <span className="mt-1 block text-[#4B473D]">Vì sao: {CABG_STEPS.find((x) => x.id === cStep)!.why}</span>
                {cNeed && <span className="mt-1 block">Cần: {CABG_TOOL_NAME[cNeed].toLowerCase()} · đang cầm: {cb.tool ? CABG_TOOL_NAME[cb.tool].toLowerCase() : 'tay không'}</span>}
                {cStep === 'plegia' && cb.plegia > 0 && <span className="block">Đã truyền {cb.plegia.toFixed(1)} s · nhịp {cb.hr}/phút</span>}
                {cStep === 'arteriotomy' && cb.arteriotomy > 0 && <span className="block">Đã mở {Math.round(cb.arteriotomy * 100)} %</span>}
                {cStep === 'anast' && <span className="block">Đã khâu {cb.stitches}/8 mũi</span>}
                {cStep === 'drains' && <span className="block">Đã đặt {cb.drains}/2 ống</span>}
                {cStep === 'deair' && <span className="block">Khí còn lại {Math.round(cb.air * 100)} %</span>}
                {cStep === 'skin' && <span className="block">Đã khâu da {cb.skinStitches}/{SKIN_STITCHES} mũi</span>}
                {cStep === 'wires' && <span className="block">Chỉ thép {Math.floor(cb.wireTaps / 2)}/{WIRES} sợi{cb.wireTaps % 2 ? ' · đã qua mép phải, chụm tiếp mép trái' : ''}</span>}
              </>
            )}
          </div>
          <div data-testid="cabg-circ" className="grid grid-cols-2 gap-1 rounded-xl bg-white px-3 py-2 font-mono text-[11px]">
            <span>
              ACT <b className={cb.act >= ACT_SAFE ? 'text-[#1F7A4D]' : ''}>{Math.round(cb.act)} s</b>
            </span>
            <span>
              Máy: <b>{cv.pumpFlow ? `${cv.pumpFlow} L/ph` : 'tắt'}</b>
            </span>
            <span>
              Chạy máy <b>{mmss(cb.cpbT)}</b>
            </span>
            <span>
              Kẹp ĐMC <b>{mmss(cb.xclampT)}</b>
            </span>
            <span>
              Nhịp: <b className={cv.rhythm === 'vf' ? 'text-[#C4261A]' : ''}>{{sinus: 'xoang', slowing: 'chậm dần', arrest: 'ngừng (liệt tim)', vf: 'rung thất'}[cv.rhythm]}</b>
            </span>
            <span>
              Thở máy: <b>{cv.vent ? 'có' : 'ngừng'}</b>
            </span>
            {cb.drains > 0 && (
              <span className="col-span-2">
                Dẫn lưu: <b>{Math.round(cb.drainMl)} mL</b> {cb.drainMl > 150 ? '(theo dõi chảy máu)' : ''}
              </span>
            )}
          </div>
          {cStep === 'brief' && (
            <fieldset data-testid="cabg-brief" className="flex flex-col gap-1 rounded-xl bg-white px-3 py-2">
              <legend className="px-1 text-xs font-semibold">Dừng lại trước khi bắt đầu · kíp mổ tim</legend>
              {CABG_BRIEF.map((item, i) => (
                <label key={item} className="flex min-h-[32px] items-center gap-2 text-xs">
                  <input type="checkbox" data-testid={`cabg-brief-${i}`} checked={cb.brief[i]} onChange={() => L.cabgDispatch({t: 'brief', i})} className="h-4 w-4 shrink-0 accent-[#1F7A4D]" />
                  {item}
                </label>
              ))}
            </fieldset>
          )}
          {cStep === 'signout' && (
            <fieldset data-testid="cabg-signout" className="flex flex-col gap-1 rounded-xl bg-white px-3 py-2">
              <legend className="px-1 text-xs font-semibold">Bảng kiểm WHO · Trước khi rời phòng mổ</legend>
              {CABG_SIGNOUT.map((item, i) => (
                <label key={item} className="flex min-h-[32px] items-center gap-2 text-xs">
                  <input type="checkbox" data-testid={`cabg-signout-${i}`} checked={cb.signout[i]} onChange={() => L.cabgDispatch({t: 'signout', i})} className="h-4 w-4 shrink-0 accent-[#1F7A4D]" />
                  {item}
                </label>
              ))}
            </fieldset>
          )}
          <div role="group" aria-label="Việc của kíp" className="flex flex-wrap gap-1.5">
            {team.map(([a, name, now]) => (
              <button key={name} type="button" data-testid={`cabg-${a.t}`} onClick={() => L.cabgDispatch(a)} className={now ? BTN : BTN_GHOST}>
                {name}
              </button>
            ))}
          </div>
          {cb.warn && (
            <p data-testid="cabg-warn" role="alert" className="rounded-xl bg-[#C4261A]/[.08] px-3 py-2 font-medium text-[#C4261A]">
              {cb.warn}
            </p>
          )}
          <div role="group" aria-label="Dụng cụ đang cầm" className="flex flex-wrap gap-1.5">
            {CABG_TOOLS.map((t) => (
              <button key={t} type="button" data-testid={`cabg-tool-${t}`} aria-pressed={cb.tool === t} onClick={() => L.cabgDispatch({t: 'tool', tool: cb.tool === t ? null : t})} className={`${PILL(cb.tool === t)} ${cNeed === t && cb.tool !== t ? 'ring-2 ring-[#D9481C]' : ''}`}>
                {CABG_TOOL_NAME[t]}
              </button>
            ))}
          </div>
          <ol className="flex flex-col gap-0.5 text-xs">
            {CABG_STEPS.map((x, i) => {
              const at = cStep === 'done' ? CABG_STEPS.length : CABG_STEPS.findIndex((q) => q.id === cStep);
              return (
                <li key={x.id} data-testid={`cabg-step-${x.id}`} className={`flex gap-2 rounded px-1.5 py-0.5 ${i === at ? 'bg-white font-semibold' : i < at ? 'text-[#1F7A4D]' : 'text-[#4B473D]'}`}>
                  <span className="w-4 shrink-0 text-right">{i < at ? '✓' : i + 1}</span>
                  {x.name}
                </li>
              );
            })}
          </ol>
          {cStep === 'done' && (
            <p data-testid="cabg-debrief" className="rounded-xl bg-[#1F7A4D]/[.09] px-3 py-2 leading-relaxed text-[#1D1B16]">
              <b className="block font-semibold text-[#1F7A4D]">Nhận xét ca mổ</b>
              {cabgDebrief(cb)}
            </p>
          )}
          <p className="leading-relaxed text-[#4B473D]">Mô phỏng học tập, không phải hướng dẫn phẫu thuật. Thời gian được rút gọn (thực tế chạy máy 60–120 phút, kẹp động mạch chủ 30–60 phút cho một cầu nối); ngưỡng ACT, liều sốc điện, lưu lượng cầu nối là mức điển hình trong y văn.</p>
          <button type="button" data-testid="cabg-reset" onClick={() => { L.cabgDispatch({t: 'reset'}); setEpoch((e) => e + 1); }} className={BTN_GHOST}>
            Mổ lại từ đầu
          </button>
        </>
      )}

      {L.mode === 'slice' && (
        <>
          <div role="group" aria-label="Hướng mặt cắt" className="flex flex-wrap gap-1.5">
            {AXES.map(([a, name]) => (
              <button key={a} type="button" data-testid={`surg-axis-${a}`} aria-pressed={L.slice.axis === a} onClick={() => { Object.assign(L.slice, {axis: a, off: 0, tilt: 0}); redraw(); }} className={PILL(L.slice.axis === a)}>
                {name}
              </button>
            ))}
          </div>
          <p className="leading-relaxed text-[#4B473D]">Nắp lát cắt tô kín phần cơ tim bị cắt (vân hồng) nên thấy rõ độ dày thành, vách liên thất và lòng bốn buồng. So sánh: thành thất trái dày gấp khoảng 3 lần thất phải.</p>
          <button type="button" data-testid="surg-lock" aria-pressed={L.slice.locked} onClick={() => { L.slice.locked = !L.slice.locked; redraw(); }} className={BTN_GHOST}>
            {L.slice.locked ? 'Mở khóa lát cắt' : 'Khóa lát cắt'}
          </button>
        </>
      )}

      {L.mode === 'peel' && (
        <>
          <ol className="flex flex-col gap-1">
            {LAYERS.map((l, i) => (
              <li key={l.id} data-testid={`surg-layer-${l.id}`} data-done={i < L.peeled} className={`flex gap-2 rounded-lg px-2 py-1 ${i === L.peeled ? 'bg-white font-semibold text-[#1D1B16]' : 'text-[#4B473D]'}`}>
                <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${i < L.peeled ? 'bg-[#1F7A4D] text-white' : i === L.peeled ? 'bg-[#D9481C] text-white' : 'bg-[#1D1B16]/10'}`}>{i < L.peeled ? '✓' : i + 1}</span>
                <span>
                  {l.name}
                  {i < L.peeled && <span className="block font-normal text-[#4B473D]">{l.fn}</span>}
                </span>
              </li>
            ))}
          </ol>
          <div className="flex gap-1.5">
            <button type="button" data-testid="surg-peel-next" disabled={L.peeled >= LAYERS.length} onClick={() => L.setPeeled(L.peeled + 1)} className={BTN_GHOST}>
              Bóc lớp tiếp
            </button>
            <button type="button" data-testid="surg-peel-reset" disabled={!L.peeled} onClick={() => L.setPeeled(0)} className={BTN_GHOST}>
              Lắp lại tất cả
            </button>
          </div>
        </>
      )}

      {L.mode === 'surgery' && (
        <>
          <div data-testid="surg-status" data-step={step} className={`rounded-xl px-3 py-2 leading-relaxed ${step === 'done' ? 'bg-[#1F7A4D]/[.09]' : 'bg-[#1D1B16]/[.05]'}`}>
            <b className={`block font-semibold ${step === 'done' ? 'text-[#1F7A4D]' : ''}`}>{STEP_DO[step]}</b>
            {need && (
              <span>
                Cần: {SURG_NAME[need].toLowerCase()} · đang cầm: {st.tool ? SURG_NAME[st.tool].toLowerCase() : 'tay không'}
              </span>
            )}
            {step === 'incise' && st.incision > 0 && <span className="block">Đã rạch {Math.round(st.incision * 100)} %</span>}
            {step === 'suture' && st.suture > 0 && <span className="block">Đã khâu {Math.round(st.suture * 100)} %</span>}
            {step === 'suction' && <span className="block">Còn {Math.round(st.field)} mL dịch trong trường mổ</span>}
          </div>
          {phase && (
            <fieldset data-testid="surg-checklist" data-phase={phase} className="flex flex-col gap-1 rounded-xl bg-white px-3 py-2">
              <legend className="px-1 text-xs font-semibold">Bảng kiểm WHO · {CHECKLIST[phase].name}</legend>
              {CHECKLIST[phase].items.map((item, i) => (
                <label key={item} className="flex min-h-[32px] items-center gap-2 text-xs">
                  <input type="checkbox" data-testid={`surg-check-${i}`} checked={st.checks[phase][i]} onChange={() => L.dispatch({t: 'check', phase, i})} className="h-4 w-4 shrink-0 accent-[#1F7A4D]" />
                  {item}
                </label>
              ))}
            </fieldset>
          )}
          {step === 'count' && (
            <div data-testid="surg-count" data-gauze={st.gauze} className="flex flex-col gap-1.5 rounded-xl bg-white px-3 py-2">
              <span className="text-xs">
                Gạc mở ra {GAUZE_TOTAL} · trên khay {GAUZE_TOTAL - st.gauze} · <b className={st.gauze ? 'text-[#C4261A]' : 'text-[#1F7A4D]'}>trong khoang {st.gauze}</b>
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" data-testid="surg-gauze-out" disabled={!st.gauze} onClick={() => L.dispatch({t: 'gauzeOut'})} className={BTN_GHOST}>
                  Lấy một miếng gạc
                </button>
                <button type="button" data-testid="surg-count-ok" onClick={() => L.dispatch({t: 'count'})} className={BTN_GHOST}>
                  Xác nhận đếm đủ
                </button>
              </div>
            </div>
          )}
          {st.warn && (
            <p data-testid="surg-warn" role="alert" className="rounded-xl bg-[#C4261A]/[.08] px-3 py-2 font-medium text-[#C4261A]">
              {st.warn}
            </p>
          )}
          <div role="group" aria-label="Dụng cụ đang cầm" className="flex flex-wrap gap-1.5">
            {SURG_TOOLS.map((t) => (
              <button key={t} type="button" data-testid={`surg-tool-${t}`} aria-pressed={st.tool === t} onClick={() => L.dispatch({t: 'tool', tool: st.tool === t ? null : t})} className={`${PILL(st.tool === t)} ${need === t && st.tool !== t ? 'ring-2 ring-[#D9481C]' : ''}`}>
                {SURG_NAME[t]}
              </button>
            ))}
          </div>
          {step === 'done' && (
            <p data-testid="surg-debrief" className="rounded-xl bg-[#1F7A4D]/[.09] px-3 py-2 leading-relaxed text-[#1D1B16]">
              <b className="block font-semibold text-[#1F7A4D]">Nhận xét ca mổ</b>
              {debrief(st)}
            </p>
          )}
          <p className="leading-relaxed text-[#4B473D]">Mô phỏng học tập, không phải hướng dẫn phẫu thuật thật. Bảng kiểm rút gọn từ Bảng kiểm An toàn Phẫu thuật của WHO. Tốc độ mất máu được phóng đại để thấy phản ứng sinh lí (tim nhanh bù, huyết áp tụt, EtCO₂ giảm) trong vài chục giây.</p>
          <button type="button" data-testid="surg-reset" onClick={() => { L.dispatch({t: 'reset'}); setEpoch((e) => e + 1); }} className={BTN_GHOST}>
            Mổ lại từ đầu
          </button>
        </>
      )}
    </Shell>
  );
};
