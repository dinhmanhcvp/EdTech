'use client';

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {SimulationBlueprint, CurriculumLevel} from '@socratic/types';
import {fmtNum} from '../utils/mathExpr';
import {Slider} from './StemModelEngines';
import {CHART_BG, GroundShadow, SphereGrad, VisualDefs, useEased, usePrefersReducedMotion, useUid} from './visualKit';
import {
  along,
  carnotCycle,
  coriolisPath,
  cycleStats,
  dpEnergy,
  dpPositions,
  dpStep,
  envelope,
  intensity,
  ottoCycle,
  principalHalfWidth,
  principalOrders,
  secondaryMaximaBetween,
  triangleCycle,
  wavelengthToRgb,
  type CycleKind,
  type DPParams,
  type DPState,
  type GasState,
  type Process,
} from '../utils/physicsModels';

interface Props {
  blueprint: SimulationBlueprint;
  params?: Record<string, number>;
  curriculumLevel?: CurriculumLevel;
}
const card = 'rounded-xl bg-[#F4F3EE] border border-[#E5E3DC] p-3';
const J = (v: number) => `${Math.round(v).toLocaleString('vi-VN')} J`;

// ====================================================================== KHÍ p–V
const KIND_NAME: Record<string, string> = {isothermal: 'đẳng nhiệt', isobaric: 'đẳng áp', isochoric: 'đẳng tích', adiabatic: 'đoạn nhiệt'};
type CycleMode = CycleKind | 'triangleRev';

export const GasEngine: React.FC<Props> = ({blueprint}) => {
  const preset = (blueprint.meta?.cycle as CycleKind | undefined) ?? 'carnot';
  const [mode, setMode] = useState<CycleMode>(preset);
  const [diatomic, setDiatomic] = useState(false);
  const [n, setN] = useState(1);
  const [Th, setTh] = useState(600);
  const [Tc, setTc] = useState(300);
  const [ratio, setRatio] = useState(3);
  const [u, setU] = useState(0);
  const [play, setPlay] = useState(true);
  const gamma = diatomic ? 7 / 5 : 5 / 3;
  const cv = diatomic ? 2.5 : 1.5;
  const V1 = 5;
  const uid = useUid();
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    if (reduced) setPlay(false); // giảm chuyển động: chu trình không tự chạy, bấm ▶ để chạy
  }, [reduced]);

  const procs: Process[] = useMemo(() => {
    if (mode === 'carnot') return carnotCycle(n, Math.max(Th, Tc + 20), Tc, V1, V1 * ratio, gamma);
    if (mode === 'otto') return ottoCycle(n, Tc, V1 * ratio, ratio, Math.max(Th * 3, Tc * ratio ** (gamma - 1) + 200), gamma).map((p) => p);
    return triangleCycle(n, Th, V1, V1 * ratio, gamma, mode === 'triangle');
  }, [mode, n, Th, Tc, ratio, gamma]);
  const stats = useMemo(() => cycleStats(procs, n, cv, gamma), [procs, n, cv, gamma]);

  useEffect(() => {
    if (!play) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); // rAF có thể báo mốc sớm hơn performance.now() → dt âm làm chỉ số mảng âm
      last = now;
      setU((x) => (x + dt / 10) % 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [play]);

  const seg = Math.max(0, Math.min(procs.length - 1, Math.floor(u * procs.length)));
  const local = u * procs.length - seg;
  const cur: GasState = along(procs[seg], local, n, gamma);
  const pts: GasState[] = procs.flatMap((p) => Array.from({length: 40}, (_, i) => along(p, i / 39, n, gamma)));
  const Vmax = Math.max(...pts.map((s) => s.V)) * 1.12;
  const pmax = Math.max(...pts.map((s) => s.p)) * 1.15;
  const sx = (V: number) => 44 + (V / Vmax) * 300;
  const sy = (p: number) => 200 - (p / pmax) * 180;
  const path = pts.map((s, i) => `${i ? 'L' : 'M'}${sx(s.V).toFixed(1)},${sy(s.p).toFixed(1)}`).join(' ');
  const hot = Math.min(1, Math.max(0, (cur.T - 200) / 900));
  const gasH = 30 + (cur.V / Vmax) * 150;
  const speed = Math.sqrt(cur.T / 300);
  const rnd = (i: number, k: number) => {
    const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  const carnotEta = 1 - Math.min(...pts.map((s) => s.T)) / Math.max(...pts.map((s) => s.T));
  return (
    <div className="p-4 flex flex-col gap-3" data-testid="gas-engine" data-eta={stats.eta.toFixed(4)} data-wnet={stats.Wnet.toFixed(2)} data-cycle={mode} data-closure={stats.closureError.toExponential(1)}>
      <div className="flex flex-wrap items-center gap-2">
        {([['carnot', 'Carnot'], ['otto', 'Otto'], ['triangle', 'Tam giác (động cơ)'], ['triangleRev', 'Tam giác (ngược)']] as [CycleMode, string][]).map(([k, l]) => (
          <button key={k} data-testid={`gas-cycle-${k}`} onClick={() => setMode(k)} className={`px-3.5 py-2 min-h-[40px] rounded-lg transition active:scale-[0.97] border text-xs font-semibold ${mode === k ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-700 border-[#DCD9D0]'}`}>{l}</button>
        ))}
        <label className="flex items-center gap-1.5 text-xs ml-auto">Khí
          <select data-testid="gas-type" value={diatomic ? 'di' : 'mono'} onChange={(e) => setDiatomic(e.target.value === 'di')} className="border border-[#DCD9D0] rounded px-1.5 py-1 bg-white">
            <option value="mono">đơn nguyên tử (γ = 5/3)</option>
            <option value="di">lưỡng nguyên tử (γ = 7/5)</option>
          </select>
        </label>
        <button data-testid="gas-play" onClick={() => setPlay((p) => !p)} className="px-3.5 py-2 min-h-[40px] rounded-lg transition active:scale-[0.97] border border-[#DCD9D0] bg-white text-xs">{play ? '⏸ Dừng' : '▶ Chạy'}</button>
      </div>
      <div className="grid md:grid-cols-[2fr_3fr] gap-3">
        <svg viewBox="0 0 220 230" className={`w-full rounded-xl border border-[#E6E4DD] ${CHART_BG}`} data-testid="gas-cylinder">
          <defs>
            <VisualDefs id={uid} />
            <SphereGrad id={`${uid}-cold`} light="#BFDBFE" base="#2563EB" dark="#1E3A8A" />
            <SphereGrad id={`${uid}-hot`} light="#FECACA" base="#DC2626" dark="#7F1D1D" />
          </defs>
          <GroundShadow id={uid} cx={110} cy={220} rx={78} ry={5} />
          <rect x="40" y={205 - gasH} width="140" height={gasH} fill={`rgba(${Math.round(60 + 195 * hot)},${Math.round(130 - 60 * hot)},${Math.round(230 - 190 * hot)},0.3)`} />
          <rect x="36" y="20" width="6" height="190" rx="2" fill="#A8A29E" />
          <rect x="178" y="20" width="6" height="190" rx="2" fill="#A8A29E" />
          <rect x="40" y="20" width="140" height="190" fill={`url(#${uid}-glass)`} pointerEvents="none" />
          <rect x="34" y="208" width="152" height="8" rx="3" fill={`url(#${uid}-steel)`} stroke="#57534E" strokeWidth="0.8" />
          {Array.from({length: 22}, (_, i) => (
            <circle key={i} cx={52 + rnd(i, 1) * 116} cy={205 - gasH + 6 + rnd(i, 2) * Math.max(gasH - 14, 4)} r="3.4" fill={`url(#${uid}-${hot > 0.5 ? 'hot' : 'cold'})`}>
              {!reduced && <animate attributeName="cx" values={`${52 + rnd(i, 1) * 116};${52 + rnd(i, 5) * 116};${52 + rnd(i, 1) * 116}`} keyTimes="0;0.5;1" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" dur={`${(1.6 + rnd(i, 3)) / speed}s`} repeatCount="indefinite" />}
            </circle>
          ))}
          <rect x="104" y="6" width="12" height={Math.max(0, 205 - gasH - 18)} fill="#78716C" stroke="#57534E" strokeWidth="0.6" />
          <rect x="104" y="6" width="12" height={Math.max(0, 205 - gasH - 18)} fill={`url(#${uid}-metal)`} pointerEvents="none" />
          <rect x="40" y={205 - gasH - 12} width="140" height="12" rx="3" fill={`url(#${uid}-steel)`} stroke="#57534E" />
          <rect x="44" y={205 - gasH - 10} width="132" height="2.5" rx="1.2" fill="#fff" opacity="0.5" pointerEvents="none" />
          <text x="6" y="226" fontSize="10" fill="#57534E">T = {fmtNum(cur.T, 4)} K · V = {fmtNum(cur.V, 3)} L</text>
        </svg>
        <svg viewBox="0 0 370 232" className={`w-full rounded-xl border border-[#E6E4DD] ${CHART_BG}`} data-testid="gas-pv">
          <line x1="44" y1="200" x2="350" y2="200" stroke="#57534E" />
          <line x1="44" y1="200" x2="44" y2="12" stroke="#57534E" />
          <text x="340" y="216" fontSize="10" fill="#57534E">V (L)</text>
          <text x="4" y="16" fontSize="10" fill="#57534E">p (atm)</text>
          <path d={path + ' Z'} fill={stats.Wnet >= 0 ? '#2563EB' : '#E11D48'} opacity="0.13" />
          <path d={path} fill="none" stroke="#1D4ED8" strokeWidth="2.4" />
          {procs.map((p, i) => {
            const mid = along(p, 0.5, n, gamma);
            const right = sx(mid.V) > 270;
            return <text key={i} x={sx(mid.V) + (right ? -6 : 5)} y={sy(mid.p) - 5} textAnchor={right ? 'end' : 'start'} fontSize="9.5" fill="#44403C">{i + 1}: {KIND_NAME[p.kind]}</text>;
          })}
          {procs.map((p, i) => <circle key={`c${i}`} cx={sx(p.from.V)} cy={sy(p.from.p)} r="3.4" fill="#18181B" />)}
          <circle cx={sx(cur.V)} cy={sy(cur.p)} r="6.5" fill="#E11D48" stroke="#fff" strokeWidth="2" data-testid="gas-point" />
          <text x="130" y="228" fontSize="10" fill={stats.Wnet >= 0 ? '#1D4ED8' : '#BE123C'}>{stats.Wnet >= 0 ? 'Chiều kim đồng hồ: khí sinh công' : 'Ngược chiều kim đồng hồ: nhận công'}</text>
        </svg>
      </div>
      <table className="w-full text-xs font-mono rounded-xl border border-[#E6E4DD] bg-white overflow-hidden" data-testid="gas-table">
        <thead><tr className="bg-stone-100 text-stone-600"><th className="text-left px-3 py-1">Quá trình</th><th>W (khí sinh)</th><th>ΔU</th><th>Q (khí nhận)</th></tr></thead>
        <tbody>
          {procs.map((p, i) => (
            <tr key={i} className={`border-t border-[#F0EEE8] ${i === seg ? 'bg-amber-50' : ''}`}>
              <td className="px-3 py-1">{i + 1}. {KIND_NAME[p.kind]}</td>
              <td className="text-right px-2">{J(stats.per[i].W)}</td>
              <td className="text-right px-2">{J(stats.per[i].dU)}</td>
              <td className={`text-right px-2 ${stats.per[i].Q >= 0 ? 'text-rose-700' : 'text-sky-700'}`}>{J(stats.per[i].Q)}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-stone-300 font-bold">
            <td className="px-3 py-1">Cả chu trình</td>
            <td className="text-right px-2" data-testid="gas-wnet">{J(stats.Wnet)}</td>
            <td className="text-right px-2">{J(stats.per.reduce((s, x) => s + x.dU, 0))}</td>
            <td className="text-right px-2">{J(stats.Qin + stats.Qout)}</td>
          </tr>
        </tbody>
      </table>
      <div className={`${card} flex flex-col gap-2`}>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span data-testid="gas-eta" className="font-bold text-stone-900">Hiệu suất η = {stats.Wnet > 0 ? `${fmtNum(stats.eta * 100, 4)} %` : '— (không phải động cơ)'}</span>
          <span className="text-stone-500">η Carnot cùng T cực trị = {fmtNum(carnotEta * 100, 4)} %</span>
        </div>
        <Slider testid="gas-pos" label="Vị trí trên chu trình" value={u} min={0} max={0.999} step={0.001} onChange={(v) => { setPlay(false); setU(v); }} fmt={(v) => `${Math.round(v * 100)}%`} />
        <Slider testid="gas-n" label="Số mol khí" value={n} min={0.5} max={3} step={0.1} onChange={setN} fmt={(v) => `${fmtNum(v, 3)} mol`} />
        {mode !== 'otto' && <Slider testid="gas-th" label={mode === 'carnot' ? 'Nhiệt độ nguồn nóng' : 'Nhiệt độ đẳng nhiệt'} value={Th} min={350} max={900} step={10} onChange={setTh} fmt={(v) => `${v} K`} />}
        {mode === 'carnot' && <Slider testid="gas-tc" label="Nhiệt độ nguồn lạnh" value={Tc} min={200} max={Math.max(Th - 50, 250)} step={10} onChange={setTc} fmt={(v) => `${v} K`} />}
        <Slider testid="gas-ratio" label={mode === 'otto' ? 'Tỉ số nén r' : 'Tỉ số V₂/V₁'} value={ratio} min={mode === 'otto' ? 2 : 1.5} max={mode === 'otto' ? 12 : 6} step={0.1} onChange={setRatio} fmt={(v) => fmtNum(v, 3)} />
        <p className="text-[11px] text-stone-500">Thử: tăng nhiệt độ nguồn nóng hoặc hạ nguồn lạnh thì η của Carnot tăng; không chu trình nào vượt η Carnot cùng hai nhiệt độ cực trị. Chạy chu trình tam giác theo hai chiều để thấy khí sinh công hay nhận công.</p>
      </div>
    </div>
  );
};

// ====================================================================== CON LẮC KÉP
export const DoublePendulumEngine: React.FC<Props> = () => {
  const [a1, setA1] = useState(150);
  const [a2, setA2] = useState(120);
  const [L2, setL2] = useState(1);
  const [m2, setM2] = useState(1);
  const [damp, setDamp] = useState(0);
  const [running, setRunning] = useState(true);
  const [tick, setTick] = useState(0);
  const uid = useUid();
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    if (reduced) setRunning(false); // giảm chuyển động: con lắc không tự thả, bấm ▶ để chạy
  }, [reduced]);
  const P: DPParams = useMemo(() => ({L1: 1, L2, m1: 1, m2, g: 9.81, damping: damp}), [L2, m2, damp]);
  const sim = useRef<{A: DPState; B: DPState; t: number; trailA: [number, number][]; trailB: [number, number][]; sep: [number, number][]; E0: number}>({
    A: [0, 0, 0, 0], B: [0, 0, 0, 0], t: 0, trailA: [], trailB: [], sep: [], E0: 0,
  });
  const reset = () => {
    const r = (d: number) => (d * Math.PI) / 180;
    sim.current = {A: [r(a1), r(a2), 0, 0], B: [r(a1) + 0.001, r(a2), 0, 0], t: 0, trailA: [], trailB: [], sep: [], E0: dpEnergy([r(a1), r(a2), 0, 0], P)};
    setTick((x) => x + 1);
  };
  useEffect(reset, [a1, a2, P]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.max(0, Math.min(0.033, (now - last) / 1000));
      last = now;
      const S = sim.current;
      const steps = Math.max(1, Math.ceil(dt / 0.0025));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        S.A = dpStep(S.A, P, h);
        S.B = dpStep(S.B, P, h);
      }
      S.t += dt;
      const pa = dpPositions(S.A, P);
      const pb = dpPositions(S.B, P);
      S.trailA.push([pa.x2, pa.y2]);
      S.trailB.push([pb.x2, pb.y2]);
      if (S.trailA.length > 260) {
        S.trailA.shift();
        S.trailB.shift();
      }
      S.sep.push([S.t, Math.hypot(pa.x2 - pb.x2, pa.y2 - pb.y2)]);
      if (S.sep.length > 600) S.sep.shift();
      setTick((x) => x + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, P]);

  void tick;
  const S = sim.current;
  const sc = 78;
  const ox = 190;
  const oy = 128;
  const X = (x: number) => ox + x * sc;
  const Y = (y: number) => oy - y * sc;
  const pa = dpPositions(S.A, P);
  const pb = dpPositions(S.B, P);
  const sepNow = Math.hypot(pa.x2 - pb.x2, pa.y2 - pb.y2);
  const drift = S.E0 !== 0 ? Math.abs(dpEnergy(S.A, P) - S.E0) / (2 * P.g * P.L1) : 0;
  const sepMax = Math.max(0.01, ...S.sep.map((p) => p[1]));
  const tMax = Math.max(5, S.t);
  const rod = (p: ReturnType<typeof dpPositions>, color: string, op: number, grad: string) => (
    <g opacity={op}>
      <line x1={X(0)} y1={Y(0)} x2={X(p.x1)} y2={Y(p.y1)} stroke="#CBD5E1" strokeWidth="3.4" strokeLinecap="round" />
      <line x1={X(p.x1)} y1={Y(p.y1)} x2={X(p.x2)} y2={Y(p.y2)} stroke="#CBD5E1" strokeWidth="3.4" strokeLinecap="round" />
      <line x1={X(0)} y1={Y(0)} x2={X(p.x1)} y2={Y(p.y1)} stroke={color} strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
      <line x1={X(p.x1)} y1={Y(p.y1)} x2={X(p.x2)} y2={Y(p.y2)} stroke={color} strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
      <circle cx={X(p.x1)} cy={Y(p.y1)} r={9 + 3 * P.m1} fill={color} opacity="0.22" filter={`url(#${uid}-soft)`} />
      <circle cx={X(p.x2)} cy={Y(p.y2)} r={9 + 3 * P.m2} fill={color} opacity="0.3" filter={`url(#${uid}-soft)`} />
      <circle cx={X(p.x1)} cy={Y(p.y1)} r={7 + 3 * P.m1} fill={`url(#${uid}-${grad})`} />
      <circle cx={X(p.x2)} cy={Y(p.y2)} r={7 + 3 * P.m2} fill={`url(#${uid}-${grad})`} />
    </g>
  );
  return (
    <div className="p-4 flex flex-col gap-3" data-testid="dp-engine" data-t={S.t.toFixed(2)} data-sep={sepNow.toFixed(4)}>
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-mono text-sm font-bold text-stone-900">Hai con lắc kép thả lệch nhau 0,001 rad</span>
        <span data-testid="dp-verdict" className={`ml-auto px-2.5 py-1 rounded-lg text-xs font-semibold border ${sepNow > 0.5 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
          {sepNow > 0.5 ? `Đã tách xa ${fmtNum(sepNow, 3)} m — hỗn loạn` : `Còn gần nhau (${fmtNum(sepNow * 1000, 3)} mm)`}
        </span>
      </div>
      <div className="grid md:grid-cols-[3fr_2fr] gap-3">
        <svg viewBox="0 0 380 270" className="w-full rounded-xl border border-[#E6E4DD] bg-slate-900" data-testid="dp-svg">
          <defs>
            <VisualDefs id={uid} />
            <SphereGrad id={`${uid}-bobA`} light="#E0F2FE" base="#38BDF8" dark="#0369A1" />
            <SphereGrad id={`${uid}-bobB`} light="#FFE4E6" base="#F43F5E" dark="#9F1239" />
          </defs>
          <polyline points={S.trailB.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' ')} fill="none" stroke="#FB7185" strokeWidth="1.6" opacity="0.7" />
          <polyline points={S.trailA.map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`).join(' ')} fill="none" stroke="#60A5FA" strokeWidth="1.6" opacity="0.8" />
          {rod(pb, '#F43F5E', 0.8, 'bobB')}
          {rod(pa, '#38BDF8', 0.95, 'bobA')}
          <circle cx={X(0)} cy={Y(0)} r="5" fill="#E2E8F0" stroke="#64748B" strokeWidth="1.5" />
        </svg>
        <svg viewBox="0 0 280 160" className={`w-full rounded-xl border border-[#E6E4DD] ${CHART_BG}`} data-testid="dp-chart">
          <text x="8" y="12" fontSize="10" fill="#78716C">Khoảng cách giữa hai quả nặng cuối (m)</text>
          <line x1="14" y1="140" x2="270" y2="140" stroke="#57534E" />
          <polyline points={S.sep.map(([t, d]) => `${(14 + (t / tMax) * 256).toFixed(1)},${(140 - (d / sepMax) * 110).toFixed(1)}`).join(' ')} fill="none" stroke="#E11D48" strokeWidth="2" />
          <text x="150" y="154" fontSize="9" fill="#78716C">t = {fmtNum(S.t, 3)} s · max {fmtNum(sepMax, 3)} m</text>
        </svg>
      </div>
      <div className={`${card} flex flex-col gap-2`}>
        <div className="flex gap-2 flex-wrap">
          <button data-testid="dp-run" onClick={() => setRunning((r) => !r)} className="px-3.5 py-2 min-h-[40px] rounded-lg transition active:scale-[0.97] border border-[#DCD9D0] bg-white text-xs">{running ? '⏸ Dừng' : '▶ Chạy'}</button>
          <button data-testid="dp-reset" onClick={reset} className="px-3.5 py-2 min-h-[40px] rounded-lg transition active:scale-[0.97] bg-blue-600 text-white text-xs font-semibold">Thả lại</button>
          <button data-testid="dp-small" onClick={() => { setA1(10); setA2(8); }} className="px-3.5 py-2 min-h-[40px] rounded-lg transition active:scale-[0.97] border border-[#DCD9D0] bg-white text-xs">Biên độ nhỏ (10°, 8°)</button>
          <button data-testid="dp-large" onClick={() => { setA1(150); setA2(120); }} className="px-3.5 py-2 min-h-[40px] rounded-lg transition active:scale-[0.97] border border-[#DCD9D0] bg-white text-xs">Biên độ lớn (150°, 120°)</button>
        </div>
        <Slider testid="dp-a1" label="Góc thả θ₁" value={a1} min={0} max={180} step={1} onChange={setA1} fmt={(v) => `${v}°`} />
        <Slider testid="dp-a2" label="Góc thả θ₂" value={a2} min={0} max={180} step={1} onChange={setA2} fmt={(v) => `${v}°`} />
        <Slider testid="dp-l2" label="Chiều dài L₂/L₁" value={L2} min={0.4} max={1.6} step={0.05} onChange={setL2} fmt={(v) => fmtNum(v, 3)} />
        <Slider testid="dp-m2" label="Khối lượng m₂/m₁" value={m2} min={0.2} max={3} step={0.1} onChange={setM2} fmt={(v) => fmtNum(v, 3)} />
        <Slider testid="dp-damp" label="Cản nhớt" value={damp} min={0} max={0.5} step={0.01} onChange={setDamp} fmt={(v) => fmtNum(v, 3)} />
        <p className="text-[11px] text-stone-500 font-mono">Sai số năng lượng (RK4): {(drift * 100).toExponential(1)} % · {damp === 0 ? 'bảo toàn năng lượng' : 'có cản: năng lượng giảm dần'}. Thử biên độ nhỏ rồi biên độ lớn: vì sao sai khác 0,001 rad ban đầu chỉ lớn lên ở trường hợp thứ hai?</p>
      </div>
    </div>
  );
};

// ====================================================================== CORIOLIS
export const CoriolisEngine: React.FC<Props> = () => {
  const [omega, setOmega] = useState(0.6);
  const [v, setV] = useState(3);
  const [frame, setFrame] = useState<'rot' | 'in'>('rot');
  const [t, setT] = useState(0);
  const R = 4;
  const uid = useUid();
  const reduced = usePrefersReducedMotion();
  const path = useMemo(() => coriolisPath(v, omega, R), [v, omega]);
  useEffect(() => {
    if (reduced) {
      setT(path.tHit); // giảm chuyển động: hiện sẵn toàn bộ quỹ đạo
      return;
    }
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); // rAF có thể báo mốc sớm hơn performance.now() → dt âm làm chỉ số mảng âm
      last = now;
      setT((x) => (x + dt > path.tHit + 0.7 ? 0 : x + dt));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [path.tHit, reduced]);
  const tt = Math.min(t, path.tHit);
  const idx = Math.min(path.inertial.length - 1, Math.round((tt / Math.max(path.tHit, 1e-9)) * (path.inertial.length - 1)));
  const sc = 34;
  const cx = 200;
  const cy = 150;
  const trail = (frame === 'rot' ? path.rotating : path.inertial).slice(0, idx + 1);
  const ball = (frame === 'rot' ? path.rotating : path.inertial)[idx];
  const diskAngle = frame === 'in' ? omega * tt : 0;
  const X = (x: number) => cx + x * sc;
  const Y = (y: number) => cy - y * sc;
  // vectơ trong hệ quay: vận tốc quan sát và lực Coriolis = −2ω×v (hướng vuông góc, lệch phải khi ω > 0)
  const vRot = (() => {
    const i2 = Math.min(path.rotating.length - 1, idx + 1);
    const a = path.rotating[idx];
    const b = path.rotating[i2];
    const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return {x: (b.x - a.x) / L, y: (b.y - a.y) / L};
  })();
  const fc = {x: vRot.y * Math.sign(omega || 1), y: -vRot.x * Math.sign(omega || 1)}; // vuông góc, bên phải khi ω > 0
  const dev = (path.deflection * 180) / Math.PI;
  return (
    <div className="p-4 flex flex-col gap-3" data-testid="coriolis-engine" data-frame={frame} data-deflection={dev.toFixed(2)} data-acor={path.aCor.toFixed(3)}>
      <div className="flex flex-wrap items-center gap-2">
        {([['rot', 'Hệ quy chiếu quay (trên đĩa)'], ['in', 'Hệ quán tính (bên ngoài)']] as ['rot' | 'in', string][]).map(([k, l]) => (
          <button key={k} data-testid={`cor-frame-${k}`} onClick={() => setFrame(k)} className={`px-3.5 py-2 min-h-[40px] rounded-lg transition active:scale-[0.97] border text-xs font-semibold ${frame === k ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-700 border-[#DCD9D0]'}`}>{l}</button>
        ))}
        <span data-testid="cor-text" className="ml-auto text-xs font-semibold text-stone-800">
          {frame === 'rot' ? `Quỹ đạo cong: lệch ${fmtNum(Math.abs(dev), 3)}° ${omega > 0 ? 'sang phải' : omega < 0 ? 'sang trái' : '(không lệch)'}` : 'Vật chuyển động thẳng đều; chỉ có đĩa quay bên dưới'}
        </span>
      </div>
      <svg viewBox="0 0 400 300" className={`w-full rounded-xl border border-[#E6E4DD] ${CHART_BG}`} data-testid="cor-svg">
        <g transform={`rotate(${(-diskAngle * 180) / Math.PI} ${cx} ${cy})`}>
          <circle cx={cx} cy={cy} r={R * sc} fill={`url(#${uid}-disk)`} stroke="#0369A1" strokeWidth="3" />
          {Array.from({length: 12}, (_, i) => {
            const a = (i * Math.PI) / 6;
            return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(a) * R * sc} y2={cy + Math.sin(a) * R * sc} stroke="#BAE6FD" strokeWidth="1" />;
          })}
          <circle cx={cx} cy={cy} r="4" fill="#0369A1" />
          <line x1={cx} y1={cy} x2={cx + R * sc} y2={cy} stroke="#F59E0B" strokeWidth="3" />
          <text x={cx + R * sc - 22} y={cy - 6} fontSize="10" fill="#B45309">mốc</text>
        </g>
        <polyline points={trail.map((p) => `${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ')} fill="none" stroke="#E11D48" strokeWidth="2.6" />
        <circle cx={X(ball.x) + 2} cy={Y(ball.y) + 4} r="8" fill="#292524" opacity="0.2" filter={`url(#${uid}-soft)`} />
        <circle cx={X(ball.x)} cy={Y(ball.y)} r="8" fill={`url(#${uid}-ball)`} stroke="#fff" strokeWidth="2" data-testid="cor-ball" />
        {frame === 'rot' && omega !== 0 && tt < path.tHit && (
          <g>
            <line x1={X(ball.x)} y1={Y(ball.y)} x2={X(ball.x) + vRot.x * 40} y2={Y(ball.y) - vRot.y * 40} stroke="#16A34A" strokeWidth="3" markerEnd="url(#cva)" />
            <line x1={X(ball.x)} y1={Y(ball.y)} x2={X(ball.x) + fc.x * 38} y2={Y(ball.y) - fc.y * 38} stroke="#7C3AED" strokeWidth="3" markerEnd="url(#cfa)" />
            <text x={X(ball.x) + fc.x * 42} y={Y(ball.y) - fc.y * 42} fontSize="10" fill="#6D28D9">F_Cor</text>
          </g>
        )}
        <defs>
          <VisualDefs id={uid} />
          <radialGradient id={`${uid}-disk`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#F0F9FF" />
            <stop offset="1" stopColor="#BAE6FD" />
          </radialGradient>
          <SphereGrad id={`${uid}-ball`} light="#FECDD3" base="#E11D48" dark="#881337" />
          <marker id="cva" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#16A34A" /></marker>
          <marker id="cfa" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#7C3AED" /></marker>
        </defs>
        <text x="8" y="14" fontSize="10" fill="#57534E">ω = {fmtNum(omega, 3)} rad/s {omega >= 0 ? '(ngược chiều kim đồng hồ, như Bắc bán cầu nhìn từ trên cực)' : '(cùng chiều kim đồng hồ, như Nam bán cầu)'}</text>
      </svg>
      <div className={`${card} flex flex-col gap-2`}>
        <Slider testid="cor-omega" label="Tốc độ góc ω" value={omega} min={-3} max={3} step={0.1} onChange={(x) => { setOmega(x); setT(0); }} fmt={(x) => `${fmtNum(x, 3)} rad/s`} />
        <Slider testid="cor-v" label="Tốc độ bắn v" value={v} min={0.5} max={5} step={0.1} onChange={(x) => { setV(x); setT(0); }} fmt={(x) => `${fmtNum(x, 3)} m/s`} />
        <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono">
          {([['a_Cor = 2ωv', `${fmtNum(path.aCor, 3)} m/s²`], ['Thời gian tới mép', `${fmtNum(path.tHit, 3)} s`], ['Góc lệch', `${fmtNum(Math.abs(dev), 3)}°`]] as [string, string][]).map(([k, val]) => (
            <div key={k} className="rounded-lg bg-white border border-[#E6E4DD] py-1.5"><div className="text-stone-500">{k}</div><div className="font-bold text-stone-900">{val}</div></div>
          ))}
        </div>
        <p className="text-[11px] text-stone-500">Trong hệ quán tính không có lực nào làm vật cong; trong hệ quay, vật cong vì có thêm "lực" quán tính Coriolis F = −2m(ω × v) vuông góc với vận tốc. Bắn nhanh hơn thì lệch ít hơn (thời gian ngắn hơn). Đảo dấu ω để thấy Nam bán cầu.</p>
      </div>
    </div>
  );
};

// ====================================================================== FRAUNHOFER N KHE
export const FraunhoferEngine: React.FC<Props> = ({blueprint}) => {
  const [N, setN] = useState<number>((blueprint.meta?.N as number | undefined) ?? 5);
  const [d, setD] = useState(4);
  const [bRaw, setB] = useState(1);
  const [lambda, setLambda] = useState(600);
  const b = Math.min(bRaw, d);
  const P = useMemo(() => ({N, d, b, lambda}), [N, d, b, lambda]);
  const lam = lambda * 1e-3;
  const smax = Math.min(0.95, Math.max(0.12, 4.6 * (lam / d)));
  const W = 560;
  const sx = (s: number) => 20 + ((s + smax) / (2 * smax)) * (W - 40);
  const sy = (I: number) => 170 - I * 140;
  const samples = 1400;
  const pts = useMemo(() => Array.from({length: samples + 1}, (_, i) => {
    const s = -smax + (2 * smax * i) / samples;
    return {s, I: intensity(s, P), E: envelope(s, P)};
  }), [P, smax]);
  const orders = useMemo(() => principalOrders(P), [P]);
  const missing = orders.filter((o) => o.missing);
  const secondary = useMemo(() => secondaryMaximaBetween(P), [P]);
  const hw = principalHalfWidth(P);
  const lamE = useEased(lambda, 12);
  const color = wavelengthToRgb(lamE); // đổi λ: màu vân chuyển mượt, đường cong vẫn tính theo λ thật
  const uid = useUid();
  const strip = pts.filter((_, i) => i % 2 === 0);
  return (
    <div className="p-4 flex flex-col gap-3" data-testid="fraunhofer-engine" data-n={N} data-secondary={secondary} data-orders={orders.length} data-missing={missing.length}>
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-mono text-sm font-bold text-stone-900">I(θ) = I₀ (sin β / β)² (sin Nγ / N sin γ)²</span>
        <span className="ml-auto text-xs text-stone-600">β = πb sinθ/λ · γ = πd sinθ/λ</span>
      </div>
      <svg viewBox={`0 0 ${W} 240`} className={`w-full rounded-xl border border-[#E6E4DD] ${CHART_BG}`} data-testid="fraunhofer-chart">
        <defs>
          <linearGradient id={`${uid}-area`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color === '#000000' ? '#2563EB' : color} stopOpacity="0.35" />
            <stop offset="1" stopColor={color === '#000000' ? '#2563EB' : color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.s).toFixed(1)},${sy(p.I).toFixed(1)}`).join(' ')} L${sx(smax).toFixed(1)},170 L${sx(-smax).toFixed(1)},170 Z`} fill={`url(#${uid}-area)`} pointerEvents="none" />
        <line x1="20" y1="170" x2={W - 20} y2="170" stroke="#57534E" />
        {[-1, -0.5, 0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={sx(f * smax)} y1="170" x2={sx(f * smax)} y2="175" stroke="#57534E" />
            <text x={sx(f * smax)} y="187" fontSize="9" textAnchor="middle" fill="#78716C">{fmtNum(f * smax, 2)}</text>
          </g>
        ))}
        <text x={W - 24} y="200" fontSize="9.5" textAnchor="end" fill="#57534E">sinθ</text>
        <path d={pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.s).toFixed(1)},${sy(p.E).toFixed(1)}`).join(' ')} fill="none" stroke="#F59E0B" strokeWidth="1.6" strokeDasharray="5 4" />
        <path d={pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.s).toFixed(1)},${sy(p.I).toFixed(1)}`).join(' ')} fill="none" stroke={color === '#000000' ? '#2563EB' : '#1D4ED8'} strokeWidth="1.8" data-testid="fraunhofer-curve" />
        {orders.filter((o) => Math.abs(o.s) <= smax).map((o) => (
          <g key={o.m}>
            <text x={sx(o.s)} y={o.missing ? 160 : Math.max(16, sy(o.I) - 5)} fontSize="9.5" textAnchor="middle" fill={o.missing ? '#BE123C' : '#18181B'} fontWeight="700">{o.missing ? '✕' : o.m}</text>
          </g>
        ))}
        {/* màn quan sát */}
        <rect x="20" y="205" width={W - 40} height="24" fill="#000" rx="3" />
        {strip.map((p, i) => <rect key={i} x={sx(p.s)} y="205" width={(W - 40) / strip.length + 0.6} height="24" fill={color} opacity={Math.min(1, Math.pow(p.I, 0.45))} />)}
      </svg>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-[11px] font-mono">
        {([['Cực đại phụ giữa hai bậc chính', `${secondary} (N − 2 = ${Math.max(0, N - 2)})`], ['Nửa độ rộng cực đại chính', `Δ(sinθ) = ${fmtNum(hw, 3)}`], ['Số bậc quan sát', String(orders.length)], ['Bậc bị thiếu', missing.length ? [...new Set(missing.map((m) => Math.abs(m.m)))].join(', ') : 'không']] as [string, string][]).map(([k, val]) => (
          <div key={k} className="rounded-lg bg-white border border-[#E6E4DD] py-1.5 px-1"><div className="text-stone-500">{k}</div><div className="font-bold text-stone-900">{val}</div></div>
        ))}
      </div>
      <div className={`${card} flex flex-col gap-2`}>
        <Slider testid="fr-n" label="Số khe N" value={N} min={1} max={50} step={1} onChange={setN} />
        <Slider testid="fr-d" label="Chu kì khe d" value={d} min={1} max={20} step={0.1} onChange={setD} fmt={(v) => `${fmtNum(v, 3)} μm`} />
        <Slider testid="fr-b" label="Độ rộng khe b" value={b} min={0.2} max={d} step={0.05} onChange={setB} fmt={(v) => `${fmtNum(v, 3)} μm`} />
        <Slider testid="fr-lambda" label="Bước sóng λ" value={lambda} min={380} max={780} step={5} onChange={setLambda} fmt={(v) => `${v} nm`} />
        <p className="text-[11px] text-stone-500">Đường cam đứt là đường bao nhiễu xạ một khe. Tăng N: cực đại chính hẹp lại (∝ 1/N) và có N − 2 cực đại phụ rất yếu ở giữa. Đặt d = 2b hoặc d = 3b: các bậc 2, 4… (hoặc 3, 6…) biến mất vì rơi đúng vào cực tiểu của đường bao.</p>
      </div>
    </div>
  );
};
