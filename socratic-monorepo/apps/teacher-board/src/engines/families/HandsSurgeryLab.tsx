'use client';

import React, {useEffect, useReducer, useRef, useState} from 'react';
import {CHECKLIST, GAUZE_TOTAL, LAYERS, SURG_NAME, SURG_TOOLS, STEP_DO, STEP_TOOL, alarms, bleedRate, capnoAt, debrief, ecgAt, mapOf, newSurg, plethAt, surgReducer, surgStep, type CheckPhase, type SAction} from '../../utils/lab/hands/surgery';
import {BTN_GHOST} from './Controls';
import type {OrView, SliceAxis, SurgMode, SurgeryLive} from './HandsSurgery3D';
import type {HandsInput} from './handsKit';

const Surgery3D = React.lazy(() => import('./HandsSurgery3D'));
type ShellProps = {hint: string; render: (input: HandsInput, onFail: () => void) => React.ReactNode; children: React.ReactNode; lens?: React.ReactNode};
const PILL = (on: boolean) => `min-h-[40px] rounded-full border px-3 text-xs font-medium ${on ? 'border-[#1D1B16] bg-[#1D1B16] text-[#F3EFE6]' : 'border-[#1D1B16]/20 bg-white'}`;
const MODES: [SurgMode, string][] = [
  ['slice', 'Cắt lớp'],
  ['peel', 'Bóc lớp'],
  ['surgery', 'Phẫu thuật'],
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
      const v = live.current.st.vitals;
      const c = cv.current?.getContext('2d');
      if (c && cv.current) {
        const W = cv.current.width;
        const H = cv.current.height;
        phase += (dt * v.hr) / 60;
        if (phase >= 1) {
          phase -= 1;
          // bíp 60 ms mỗi nhịp; cao độ giảm theo SpO₂ như monitor phòng mổ, nghe được mà không cần nhìn
          if (soundRef.current && now - lastBeep > 200) {
            beep(Math.max(520, 880 - (99 - v.spo2) * 30));
            lastBeep = now;
          }
        }
        breath = (breath + (dt * v.rr) / 60) % 1;
        const vals = [ecgAt(phase), -plethAt(phase), -capnoAt(breath) * (v.etco2 / 40)];
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
  const v = live.current.st.vitals;
  const al = alarms(v);
  const bleed = bleedRate(live.current.st);
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
          <b className={`block text-lg leading-none ${v.hr > 110 ? 'text-[#FF6B5A]' : 'text-[#46F08C]'}`}>{Math.round(v.hr)}</b>nhịp/phút
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
        <span>NT {v.rr}</span>
        <span>{v.temp.toFixed(1)}°C</span>
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-[#CFE9DC]/80">
        <span>Mất máu {Math.round(v.loss)} mL</span>
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
    mode: 'slice',
    st: newSurg(true),
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
    redraw();
  };

  const phase: CheckPhase | null = step === 'signin' || step === 'timeout' || step === 'signout' ? step : null;
  const need = step === 'done' ? null : STEP_TOOL[step];

  return (
    <Shell
      hint="Cắt lớp: tay xòe dời mặt cắt. Bóc lớp: chụm vào lớp ngoài cùng rồi kéo ra. Phẫu thuật: hoàn thành bảng kiểm, lấy dụng cụ ở khay bên phải bằng một lần chụm, làm theo vòng cam."
      render={(input, onFail) => <Surgery3D key={epoch} input={input} live={L} onFail={onFail} />}
      lens={<VitalsMonitor live={live} />}
    >
      <p className="leading-relaxed text-[#4B473D]">
        <b className="block font-semibold text-[#1D1B16]">Nhiệm vụ · Sinh 11, bài 9–11 (tuần hoàn)</b>
        Quan sát cấu tạo tim người bằng mặt cắt và bóc từng lớp, rồi thực hiện một ca mở màng ngoài tim trong phòng mổ: làm bảng kiểm an toàn, rạch đúng đường giải phẫu, xử lí chảy máu, hút sạch, đếm gạc, khâu đóng.
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
