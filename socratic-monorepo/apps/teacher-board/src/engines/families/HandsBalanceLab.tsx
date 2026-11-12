'use client';

import React, {useEffect, useRef, useState} from 'react';
import {BAL, START, directionVerdict, force, measure, measureVerdict, range, reading, type BalState, type Sample} from '../../utils/lab/hands/currentBalance';
import {BTN, BTN_GHOST} from './Controls';
import type {BalanceLive} from './HandsBalance3D';
import type {HandsInput} from './handsKit';

const Balance3D = React.lazy(() => import('./HandsBalance3D'));
type ShellProps = {hint: string; render: (input: HandsInput, onFail: () => void) => React.ReactNode; children: React.ReactNode; hud?: React.ReactNode; lens?: React.ReactNode};
const vn = (x: number, d: number) => x.toFixed(d).replace('.', ',');
const CHIP = (on: boolean) => `min-h-[44px] rounded-full border px-4 text-xs font-medium ${on ? 'border-[#0E7C66]/40 bg-[#0E7C66]/15 text-[#0B5E4E]' : 'border-[#1D1B16]/15 bg-white text-[#1D1B16]'}`;
const LENS = 196;

/**
 * Kính lúp: nhìn dọc theo cạnh đáy khung dây (từ phía sau khung), thấy hai má cực, đường sức từ B, tiết diện dây có dòng I và lực từ F.
 * Vẽ thuần SVG từ trạng thái bài nên luôn khớp với cảnh 3D.
 */
const GapLens: React.FC<{s: BalState}> = ({s}) => {
  const F = force(s);
  const right = !s.revB; // B hướng từ N sang S: mặc định N ở bên trái nên B sang phải
  const into = !s.revI;
  const c = LENS / 2;
  return (
    <svg data-testid="bal-lens-view" data-b={right ? 'right' : 'left'} data-i={into ? 'in' : 'out'} data-f={F > 0 ? 'down' : F < 0 ? 'up' : 'none'} width={LENS} height={LENS} viewBox={`0 0 ${LENS} ${LENS}`} className="rounded-full border-[5px] border-[#11143A] bg-[#FBF9F4] shadow-2xl" role="img" aria-label="Kính lúp: cạnh đáy khung dây trong khe nam châm">
      <defs>
        <clipPath id="bal-lens-clip">
          <circle cx={c} cy={c} r={c} />
        </clipPath>
      </defs>
      <g clipPath="url(#bal-lens-clip)">
        <rect x={0} y={0} width={26} height={LENS} fill={right ? '#C4261A' : '#2459C9'} />
        <rect x={LENS - 26} y={0} width={26} height={LENS} fill={right ? '#2459C9' : '#C4261A'} />
        <text x={13} y={c + 4} textAnchor="middle" fontSize={12} fontWeight={700} fill="#fff">{right ? 'N' : 'S'}</text>
        <text x={LENS - 13} y={c + 4} textAnchor="middle" fontSize={12} fontWeight={700} fill="#fff">{right ? 'S' : 'N'}</text>
        {[-52, -26, 0, 26, 52].map((dy) => (
          <g key={dy} opacity={s.Im > 0.02 ? 1 : 0.2}>
            <line x1={30} x2={LENS - 30} y1={c + dy} y2={c + dy} stroke="#0E7C66" strokeWidth={1.5} strokeDasharray="7 5" />
            <path d={right ? `M${LENS - 44} ${c + dy - 4} l8 4 l-8 4z` : `M44 ${c + dy - 4} l-8 4 l8 4z`} fill="#0E7C66" />
          </g>
        ))}
        {F !== 0 && (
          <g>
            <line x1={c} x2={c} y1={c} y2={c + Math.sign(F) * 58} stroke="#D9481C" strokeWidth={4} />
            <path d={F > 0 ? `M${c - 7} ${c + 54} l7 12 l7 -12z` : `M${c - 7} ${c - 54} l7 -12 l7 12z`} fill="#D9481C" />
            <text x={c + 12} y={c + Math.sign(F) * 50} fontSize={12} fontWeight={700} fill="#D9481C">F</text>
          </g>
        )}
        <circle cx={c} cy={c} r={15} fill={s.K ? '#D9481C' : '#B9BEC5'} stroke="#11143A" strokeWidth={2} />
        {s.K && (into ? <path d={`M${c - 8} ${c - 8} l16 16 M${c + 8} ${c - 8} l-16 16`} stroke="#fff" strokeWidth={3} /> : <circle cx={c} cy={c} r={4} fill="#fff" />)}
        <text x={c + 62} y={c - 30} fontSize={12} fontWeight={700} fill="#0E7C66">B</text>
        <rect x={38} y={20} width={LENS - 76} height={18} rx={4} fill="#fff" opacity={0.9} />
        <text x={c} y={33} textAnchor="middle" fontSize={10} fontWeight={600} fill="#1D1B16">
          {s.K ? `I ${into ? '⊗ vào trong' : '⊙ ra ngoài'} · B ${right ? '→' : '←'} · F ${F > 0 ? '↓' : '↑'}` : 'K mở: chưa có dòng'}
        </text>
        <rect x={38} y={LENS - 40} width={LENS - 76} height={18} rx={4} fill="#fff" opacity={0.9} />
        <text x={c} y={LENS - 27} textAnchor="middle" fontSize={10} fontWeight={700} fill="#C4261A">F = N·B·I·L = {vn(Math.abs(F), 3)} N</text>
      </g>
    </svg>
  );
};

const TASKS = [
  {id: 1, name: '1. Chiều của lực từ: quy tắc bàn tay trái', text: 'Đóng công tắc K rồi quan sát đòn cân. Đảo chiều dòng điện qua khung, rồi đảo chiều từ trường: mỗi lần lực từ đổi chiều thế nào? Dùng kính lúp để kiểm tra bằng quy tắc bàn tay trái.'},
  {id: 2, name: '2. Đo B: đổi I, đọc lực kế', text: 'Giữ nguyên dòng qua nam châm. Xoay biến trở khung để đổi I, mỗi lần chờ cân đứng yên rồi ghi số đo vào sổ. Cần ít nhất 4 giá trị I trải từ 0,3 A trở lên; độ dốc đường F theo I cho ra B.'},
] as const;

/** Bài "Đo cảm ứng từ bằng cân dòng điện": thiết bị thật trên bàn, điều khiển ngay trên thiết bị; lớp phủ duy nhất là kính lúp B–I–F. */
export const BalanceLab: React.FC<{Shell: React.ComponentType<ShellProps>}> = ({Shell}) => {
  const [s, setS] = useState<BalState>(START);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [seen, setSeen] = useState({down: false, up: false});
  const [task, setTask] = useState<1 | 2>(1);
  const [note, setNote] = useState('');
  const [demo, setDemo] = useState(-1);
  const link = useRef<SVGLineElement>(null);
  const lensBox = useRef<HTMLDivElement>(null);
  const live = useRef<BalanceLive>({
    s,
    set: (patch) => {
      const next = {...live.current.s, ...patch};
      live.current.s = next; // cảnh 3D đọc ngay trong khung hình này, không chờ React
      setS(next);
      const f = force(next);
      if (f) setSeen((q) => ({down: q.down || f > 0, up: q.up || f < 0}));
    },
    record: () => {
      const m = measure(live.current.s);
      setNote(m ? '' : live.current.s.K ? 'Lực kế đang ngoài thang đo: số này không ghi được.' : 'Công tắc K đang mở: chưa có lực từ để ghi.');
      if (m) setSamples((a) => [...a, m]);
    },
    anchor: (x, y) => {
      const b = lensBox.current?.getBoundingClientRect();
      if (!link.current || !b) return;
      link.current.setAttribute('x1', String(b.right - 6));
      link.current.setAttribute('y1', String(b.top + b.height / 2));
      link.current.setAttribute('x2', String(x));
      link.current.setAttribute('y2', String(y));
    },
  });
  live.current.s = s;
  const reset = () => {
    setDemo(-1);
    live.current.s = START;
    setS(START);
    setSamples([]);
    setSeen({down: false, up: false});
    setNote('');
  };
  // làm mẫu cả quy trình: mỗi nhịp một thao tác, như giáo viên làm chậm cho cả lớp xem
  const SCRIPT: (() => void)[] =
    task === 1
      ? [() => live.current.set({K: true, I: 0.4}), () => live.current.set({revI: true}), () => live.current.set({revB: true}), () => live.current.set({revI: false})]
      : [() => live.current.set({K: true, I: 0.2}), ...[0.4, 0.6, 0.8].flatMap((I) => [() => live.current.record(), () => live.current.set({I})]), () => live.current.record()];
  useEffect(() => {
    if (demo < 0) return;
    if (demo >= SCRIPT.length) return setDemo(-1);
    const h = setTimeout(() => {
      SCRIPT[demo]();
      setDemo(demo + 1);
    }, 1100);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- kịch bản chỉ phụ thuộc bước hiện tại
  }, [demo]);

  const verdict = task === 1 ? directionVerdict(seen, s) : measureVerdict(samples, s.Im);
  const used = samples.filter((q) => Math.abs(q.Im - s.Im) < 0.005);
  // độ dốc đường thẳng qua gốc khớp với các số đo đang dùng (N/A)
  const slope = used.length >= 2 ? used.reduce((a, q) => a + q.I * q.F, 0) / Math.max(1e-9, used.reduce((a, q) => a + q.I * q.I, 0)) : 0;
  const W = 280;
  const H = 120;
  const px = (I: number) => 28 + (I / BAL.Imax) * (W - 36);
  const py = (F: number) => H - 18 - (F / 0.4) * (H - 26);

  const overlay = (
    <>
      <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full">
        <line ref={link} stroke="#FBF9F4" strokeWidth={2} strokeDasharray="6 6" opacity={0.85} />
      </svg>
      <div ref={lensBox} className="absolute bottom-6 left-6 z-10">
        <GapLens s={s} />
        <p className="mt-1 rounded-full bg-[#11143A]/85 px-3 py-1 text-center text-[11px] font-medium text-[#E8E6F5]">Cạnh đáy trong khe nam châm: B, I, F</p>
      </div>
    </>
  );

  return (
    <Shell hint="Chụm vào cần công tắc để gạt. Đổi dòng điện: giữ ngón tay trên nút − hoặc + cạnh núm biến trở (không cần chụm; giữ lâu thì đổi nhanh dần), hoặc chụm vào núm rồi đưa tay vòng quanh để xoay. Chụm vào cuốn sổ để ghi số đo." render={(input, onFail) => <Balance3D input={input} live={live.current} onFail={onFail} />} lens={overlay}>
      <b className="text-[11px] font-semibold uppercase tracking-wide text-[#4B473D]">Chọn thí nghiệm</b>
      <div className="grid grid-cols-1 gap-1.5">
        {TASKS.map((t) => (
          <button key={t.id} type="button" data-testid={`bal-task-${t.id}`} aria-pressed={task === t.id} onClick={() => { setTask(t.id); setDemo(-1); }} className={`${CHIP(task === t.id)} !rounded-xl text-left`}>
            {t.name}
          </button>
        ))}
      </div>
      <p className="leading-relaxed text-[#4B473D]">{TASKS[task - 1].text}</p>
      <div data-testid="bal-status" data-ok={verdict.ok} className={`rounded-xl px-3 py-2 leading-relaxed ${verdict.ok ? 'bg-[#1F7A4D]/[.09]' : 'bg-[#1D1B16]/[.05]'}`}>
        <b className={`block font-semibold ${verdict.ok ? 'text-[#1F7A4D]' : ''}`}>{verdict.head}</b>
        {verdict.lines.map((l) => (
          <span key={l} className="block">{l}</span>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" data-testid="bal-demo" disabled={demo >= 0} onClick={() => { reset(); setDemo(0); }} className={`${BTN} disabled:opacity-60`}>
          {demo >= 0 ? `Đang làm mẫu… bước ${demo + 1}/${SCRIPT.length}` : '▶ Làm mẫu cả quy trình'}
        </button>
        <button type="button" data-testid="bal-reset" onClick={reset} className={BTN_GHOST}>↺ Làm lại</button>
      </div>

      <b className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#4B473D]">Bố trí thí nghiệm</b>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" data-testid="bal-K" aria-pressed={s.K} onClick={() => live.current.set({K: !s.K})} className={CHIP(s.K)}>{s.K ? 'Ngắt công tắc K' : 'Đóng công tắc K'}</button>
        <button type="button" data-testid="bal-revI" aria-pressed={s.revI} onClick={() => live.current.set({revI: !s.revI})} className={CHIP(s.revI)}>Đảo chiều dòng qua khung</button>
        <button type="button" data-testid="bal-revB" aria-pressed={s.revB} onClick={() => live.current.set({revB: !s.revB})} className={CHIP(s.revB)}>Đảo chiều dòng qua nam châm</button>
      </div>
      {([['I', 'Dòng qua khung I (biến trở phải)', BAL.Imax], ['Im', 'Dòng qua nam châm (biến trở trái)', BAL.ImMax]] as const).map(([id, label, max]) => (
        <label key={id} className="flex flex-col gap-0.5">
          <span className="flex justify-between text-[#4B473D]">
            {label} <b className="text-[#1D1B16]">{vn(s[id], 2)} A</b>
          </span>
          <input data-testid={`bal-${id}`} type="range" min={0} max={max * 100} value={Math.round(s[id] * 100)} onChange={(e) => live.current.set({[id]: Number(e.target.value) / 100})} />
        </label>
      ))}
      <p data-testid="bal-reading" data-range={range(s)} className="rounded-xl border border-[#1D1B16]/15 bg-white px-3 py-2">
        Lực kế chỉ <b>{vn(reading(s), 3)} N</b> (chưa có dòng: {vn(BAL.F0, 3)} N) · B thật của mô hình được giấu, em tự đo
      </p>

      {task === 2 && (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" data-testid="bal-record" onClick={() => live.current.record()} className={BTN}>Ghi số đo vào sổ</button>
            <span data-testid="bal-count" className="text-[#4B473D]">Đã ghi {samples.length} số đo</span>
          </div>
          {note && <p role="alert" className="rounded-xl bg-[#C4261A]/[.08] px-3 py-2 font-medium text-[#C4261A]">{note}</p>}
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl bg-white" role="img" aria-label="Đồ thị lực từ theo dòng điện">
            <line x1={28} x2={W - 8} y1={H - 18} y2={H - 18} stroke="#1D1B16" />
            <line x1={28} x2={28} y1={8} y2={H - 18} stroke="#1D1B16" />
            <text x={W - 8} y={H - 5} textAnchor="end" fontSize={9} fill="#4B473D">I (A) → 1,0</text>
            <text x={4} y={14} fontSize={9} fill="#4B473D">F (N)</text>
            {slope > 0 && <line x1={px(0)} y1={py(0)} x2={px(1)} y2={py(Math.min(0.4, slope))} stroke="#D9481C" strokeWidth={1.5} strokeDasharray="5 4" />}
            {samples.map((q, i) => (
              <circle key={i} cx={px(q.I)} cy={py(Math.min(0.4, q.F))} r={3.5} fill={Math.abs(q.Im - s.Im) < 0.005 ? '#2459C9' : '#B9BEC5'} />
            ))}
          </svg>
          <p className="leading-relaxed text-[#4B473D]">Chấm xám là số đo ở dòng nam châm khác: không dùng chung một đường thẳng được vì B đã đổi.</p>
        </>
      )}
    </Shell>
  );
};
