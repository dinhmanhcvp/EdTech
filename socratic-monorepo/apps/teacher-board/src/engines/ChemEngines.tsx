'use client';

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {SimulationBlueprint, CurriculumLevel} from '@socratic/types';
import {fmtNum} from '../utils/mathExpr';
import {Slider} from './StemModelEngines';
import {GroundShadow, SphereGrad, VisualDefs, useEased, usePrefersReducedMotion, useUid} from './visualKit';
import {M3, mulMM, mulMV, orthonormalize, rotAxis, type V3 as SV3} from '../utils/solids';
import {
  ATOM_R,
  CPK,
  ELECTRODES,
  ION_COLOR,
  LC,
  VSEPR_LIBRARY,
  build3D,
  daniellCell,
  daniellStep,
  lcEquilibrium,
  lcRelax,
  lcView,
  nernstE,
  parseMolecule,
  type DaniellState,
  type VseprMolecule,
} from '../utils/chemModels';

interface Props {
  blueprint: SimulationBlueprint;
  params?: Record<string, number>;
  curriculumLevel?: CurriculumLevel;
}

const card = 'rounded-xl bg-[#F4F3EE] border border-[#E5E3DC] p-3';
const sub = (n: number) => String(n).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[+d]);

// ====================================================================== VSEPR 3D
export const VseprEngine: React.FC<Props> = ({blueprint}) => {
  const start = (blueprint.meta?.molecule as VseprMolecule) ?? VSEPR_LIBRARY[0];
  const [mol, setMol] = useState<VseprMolecule>(start);
  const [R, setR] = useState<M3>(() => mulMM(rotAxis([1, 0, 0], -0.35), rotAxis([0, 1, 0], 0.6)));
  const reducedV = usePrefersReducedMotion();
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (reducedV) setAuto(false); // giảm chuyển động: phân tử không tự xoay, vẫn kéo để xoay
  }, [reducedV]);
  const [showLone, setShowLone] = useState(true);
  const [showDipole, setShowDipole] = useState(false);
  const drag = useRef<{x: number; y: number} | null>(null);
  const s3 = useMemo(() => build3D(mol), [mol]);

  useEffect(() => {
    if (!auto) return;
    let raf = 0;
    const tick = () => {
      if (!drag.current) setR((r) => orthonormalize(mulMM(rotAxis([0, 1, 0], 0.008), r)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [auto]);

  if (!s3) return <div className="p-4 text-xs text-rose-600">Chưa hỗ trợ dạng này.</div>;
  const X = mol.ligands.length;
  const E = mol.lonePairs;
  const S = 78;
  const proj = (p: SV3) => {
    const q = mulMV(R, p);
    const f = 1 + q[2] * 0.07;
    return {x: 210 + q[0] * S * f, y: 165 - q[1] * S * f, z: q[2], f};
  };
  type Item = {z: number; node: React.ReactNode};
  const items: Item[] = [];
  const pc = proj([0, 0, 0]);
  s3.bonds.forEach(([a, b, order], i) => {
    const A = proj(s3.atoms[a].pos);
    const B = proj(s3.atoms[b].pos);
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L;
    const ny = dx / L;
    const lines = order >= 3 ? [-5, 0, 5] : order >= 2 || order === 1.5 ? [-3.2, 3.2] : [0];
    items.push({
      z: (A.z + B.z) / 2 - 0.01,
      node: (
        <g key={`b${i}`}>
          {lines.map((o, k) => (
            <line key={k} x1={A.x + nx * o} y1={A.y + ny * o} x2={B.x + nx * o} y2={B.y + ny * o} stroke="#A8A29E" strokeWidth="4.5" strokeLinecap="round" strokeDasharray={order === 1.5 && k === 1 ? '6 5' : undefined} />
          ))}
        </g>
      ),
    });
  });
  s3.atoms.forEach((a, i) => {
    const P = proj(a.pos);
    const r = (ATOM_R[a.el] ?? 0.5) * 30 * P.f;
    items.push({
      z: P.z,
      node: (
        <g key={`a${i}`} data-testid={a.kind === 'central' ? 'atom-central' : 'atom-ligand'}>
          <circle cx={P.x} cy={P.y} r={r} fill={`url(#g-${a.el})`} stroke="#44403C" strokeWidth="1.2" />
          <text x={P.x} y={P.y + 4} fontSize={Math.max(10, r * 0.8)} textAnchor="middle" fontWeight="700" fill={['H', 'Be', 'F', 'Cl', 'S'].includes(a.el) ? '#1C1917' : '#fff'}>
            {a.el}
          </text>
        </g>
      ),
    });
  });
  if (showLone) {
    s3.lone.forEach((d, i) => {
      const c = proj([d[0] * 0.75, d[1] * 0.75, d[2] * 0.75]);
      const tip = proj([d[0] * 1.25, d[1] * 1.25, d[2] * 1.25]);
      const ang = (Math.atan2(tip.y - pc.y, tip.x - pc.x) * 180) / Math.PI;
      items.push({z: c.z, node: <ellipse key={`l${i}`} data-testid="lone-pair" cx={c.x} cy={c.y} rx={Math.max(16, 34 * c.f * 0.9)} ry={15 * c.f} transform={`rotate(${ang} ${c.x} ${c.y})`} fill="#60A5FA" opacity="0.4" stroke="#2563EB" strokeDasharray="3 3" />});
    });
  }
  if (showDipole && s3.polar) {
    // vectơ lưỡng cực tổng: hướng về phía các nguyên tử âm điện hơn (tính lại từ liên kết)
    let d: SV3 = [0, 0, 0];
    s3.bonds.forEach(([, b]) => {
      const el = s3.atoms[b].el;
      const delta = (({H: 2.2, Be: 1.57, B: 2.04, C: 2.55, N: 3.04, O: 3.44, F: 3.98, P: 2.19, S: 2.58, Cl: 3.16, Br: 2.96, Xe: 2.6}) as Record<string, number>)[el] - (({H: 2.2, Be: 1.57, B: 2.04, C: 2.55, N: 3.04, O: 3.44, F: 3.98, P: 2.19, S: 2.58, Cl: 3.16, Br: 2.96, Xe: 2.6}) as Record<string, number>)[mol.central];
      const p = s3.atoms[b].pos;
      const L = Math.hypot(...p);
      d = [d[0] + (p[0] / L) * delta, d[1] + (p[1] / L) * delta, d[2] + (p[2] / L) * delta];
    });
    const end = proj([d[0] * 0.8, d[1] * 0.8, d[2] * 0.8]);
    items.push({z: 5, node: <g key="dip" data-testid="dipole"><line x1={pc.x} y1={pc.y} x2={end.x} y2={end.y} stroke="#C026D3" strokeWidth="4" markerEnd="url(#dip-arr)" /></g>});
  }
  items.sort((a, b) => a.z - b.z);
  const angleText = mol.angle ? `${fmtNum(mol.angle, 4)}°` : s3.angles.map((a) => `${fmtNum(a, 4)}°`).join(' ; ');
  return (
    <div className="p-4 flex flex-col gap-3" data-testid="vsepr-engine" data-formula={mol.formula} data-shape={s3.geometry.shape} data-polar={s3.polar} data-lone={E}>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-stone-700">
          Phân tử
          <select data-testid="vsepr-select" value={mol.formula} onChange={(e) => setMol(VSEPR_LIBRARY.find((m) => m.formula === e.target.value) ?? parseMolecule(e.target.value) ?? mol)} className="border border-[#DCD9D0] rounded-lg px-2 py-1.5 bg-white text-xs font-mono">
            {VSEPR_LIBRARY.map((m) => (
              <option key={m.formula} value={m.formula}>
                {m.formula} — {m.name}
              </option>
            ))}
            {!VSEPR_LIBRARY.some((m) => m.formula === mol.formula) && <option value={mol.formula}>{mol.formula}</option>}
          </select>
        </label>
        <button data-testid="vsepr-auto" onClick={() => setAuto((a) => !a)} className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${auto ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-700 border-[#DCD9D0]'}`}>Tự xoay</button>
        <button data-testid="vsepr-lone" onClick={() => setShowLone((a) => !a)} className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${showLone ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-stone-700 border-[#DCD9D0]'}`}>Cặp e riêng</button>
        <button data-testid="vsepr-dipole" onClick={() => setShowDipole((a) => !a)} className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${showDipole ? 'bg-fuchsia-600 text-white border-fuchsia-600' : 'bg-white text-stone-700 border-[#DCD9D0]'}`}>Lưỡng cực</button>
        <span className="ml-auto font-mono text-sm font-bold text-stone-900">AX{X > 1 ? sub(X) : ''}{E ? `E${E > 1 ? sub(E) : ''}` : ''}</span>
      </div>
      <svg
        viewBox="0 0 420 330"
        className="w-full rounded-xl border border-[#E6E4DD] bg-gradient-to-b from-white to-stone-100 touch-none cursor-grab active:cursor-grabbing"
        data-testid="vsepr-svg"
        onPointerDown={(e) => {
          drag.current = {x: e.clientX, y: e.clientY};
          (e.currentTarget as SVGSVGElement).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const dx = e.clientX - d.x;
          const dy = e.clientY - d.y;
          drag.current = {x: e.clientX, y: e.clientY};
          setR((r) => orthonormalize(mulMM(rotAxis([0, 1, 0], dx * 0.012), mulMM(rotAxis([1, 0, 0], dy * 0.012), r))));
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <defs>
          {Object.entries(CPK).map(([el, col]) => (
            <radialGradient key={el} id={`g-${el}`} cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
              <stop offset="35%" stopColor={col} />
              <stop offset="100%" stopColor={col} stopOpacity="0.75" />
            </radialGradient>
          ))}
          <marker id="dip-arr" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#C026D3" />
          </marker>
        </defs>
        {items.map((it) => it.node)}
        <text x="10" y="322" fontSize="10.5" fill="#78716C">Kéo để xoay · {s3.geometry.shape}</text>
      </svg>
      <div className={`${card} grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-[11px]`}>
        {([['Dạng hình học', s3.geometry.shape], ['Miền electron', `${s3.geometry.steric} (${s3.geometry.domain})`], ['Lai hóa', s3.geometry.hybrid], ['Góc liên kết', angleText || '—']] as [string, string][]).map(([k, v]) => (
          <div key={k} className="rounded-lg bg-white border border-[#E6E4DD] py-1.5 px-1">
            <div className="text-stone-500">{k}</div>
            <div className="font-bold text-stone-900" data-testid={`vsepr-${k === 'Dạng hình học' ? 'shape' : k === 'Góc liên kết' ? 'angle' : k === 'Lai hóa' ? 'hybrid' : 'domain'}`}>{v}</div>
          </div>
        ))}
        <div className="col-span-2 md:col-span-4 text-left text-xs text-stone-700">
          <b>{mol.name}</b> ({mol.formula}): {X} liên kết σ{mol.bondOrders?.some((o) => o > 1) ? ' (có liên kết bội, tính như một miền electron)' : ''}, {E} cặp electron riêng → {s3.geometry.steric} miền electron. Phân tử{' '}
          <b data-testid="vsepr-polarity" className={s3.polar ? 'text-fuchsia-700' : 'text-emerald-700'}>
            {s3.polar ? `phân cực (μ ≈ ${fmtNum(s3.dipole, 2)} đơn vị tương đối)` : 'không phân cực (các lưỡng cực triệt tiêu)'}
          </b>
          . {E > 0 ? 'Cặp electron riêng chiếm chỗ nhiều hơn cặp liên kết nên ép các góc liên kết nhỏ lại.' : ''}
        </div>
      </div>
    </div>
  );
};

// ====================================================================== LE CHATELIER
export const LeChatelierEngine: React.FC<Props> = () => {
  const N0 = 0.02;
  const [V, setV] = useState(1.5);
  const [Tc, setTc] = useState(25);
  const T = Tc + 273.15;
  const xiEq = lcEquilibrium(N0, V, T);
  const [xi, setXi] = useState(() => lcEquilibrium(N0, 1.5, 298.15));
  const [hist, setHist] = useState<{t: number; c: number; mark?: string}[]>([]);
  const ref = useRef({V, T, xi, t: 0});
  ref.current.V = V;
  ref.current.T = T;
  const eqRef = useRef(xiEq);
  eqRef.current = xiEq;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const tick = (now: number) => {
      const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
      last = now;
      const next = lcRelax(ref.current.xi, eqRef.current, dt);
      ref.current.xi = next;
      ref.current.t += dt;
      acc += dt;
      setXi(next);
      if (acc > 0.12) {
        acc = 0;
        const v = lcView(N0, ref.current.V, ref.current.T, next);
        setHist((h) => [...h.slice(-220), {t: ref.current.t, c: v.cNO2}]);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const view = lcView(N0, V, T, xi);
  const mark = (label: string) => setHist((h) => [...h, {t: ref.current.t, c: lcView(N0, ref.current.V, ref.current.T, ref.current.xi).cNO2, mark: label}]);
  const gasH = 50 + (V / 3) * 190;
  const uid = useUid();
  const reduced = usePrefersReducedMotion();
  const gasHe = useEased(gasH, 14);
  const pistonYe = 275 - gasHe;
  const brown = `rgba(150, 70, 30, ${0.08 + 0.86 * view.color})`;
  const no2n = Math.round((view.nNO2 / N0) * 26);
  const n2o4n = Math.round((view.nN2O4 / (N0 / 2)) * 13);
  const rnd = (i: number, k: number) => {
    const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  const shiftText = {forward: 'Cân bằng đang chuyển dịch theo chiều THUẬN (→ N₂O₄, màu nhạt dần)', reverse: 'Cân bằng đang chuyển dịch theo chiều NGHỊCH (→ NO₂, màu đậm dần)', none: 'Hệ ở trạng thái cân bằng'}[view.shift];
  const cMax = Math.max(0.08, ...hist.map((h) => h.c));
  const t0 = hist.length ? hist[0].t : 0;
  const t1 = hist.length ? hist[hist.length - 1].t : 1;
  const hx = (t: number) => 14 + ((t - t0) / Math.max(t1 - t0, 1)) * 262;
  const hy = (c: number) => 112 - (c / cMax) * 92;
  const setVal = (nv: number, nt: number) => {
    setV(nv);
    setTc(nt);
  };
  return (
    <div className="p-4 flex flex-col gap-3" data-testid="lc-engine" data-shift={view.shift} data-color={view.color.toFixed(3)} data-xi={xi.toFixed(5)} data-eq={xiEq.toFixed(5)}>
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-mono text-sm font-bold text-stone-900">2NO₂ (nâu đỏ) ⇌ N₂O₄ (không màu) &nbsp; ΔH = −57,2 kJ</span>
        <span data-testid="lc-shift" className={`ml-auto px-2.5 py-1 rounded-lg text-xs font-semibold border ${view.shift === 'none' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>{shiftText}</span>
      </div>
      <div className="grid md:grid-cols-[3fr_2fr] gap-3">
        <svg viewBox="0 0 400 300" className="w-full rounded-xl border border-[#E6E4DD] bg-white" data-testid="lc-svg">
          <defs>
            <VisualDefs id={uid} />
            <SphereGrad id={`${uid}-no2a`} light="#FDBA74" base="#C2410C" dark="#7C2D12" />
            <SphereGrad id={`${uid}-no2b`} light="#FB923C" base="#9A3412" dark="#431407" />
            <SphereGrad id={`${uid}-n2o4`} light="#F1F5F9" base="#94A3B8" dark="#475569" />
            <linearGradient id={`${uid}-gas`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#7C2D12" stopOpacity="0.7" />
              <stop offset="1" stopColor="#7C2D12" stopOpacity="1" />
            </linearGradient>
            <radialGradient id={`${uid}-bath`} cx="0.5" cy="1" r="0.9">
              <stop offset="0" stopColor={Tc > 60 ? '#FB923C' : Tc < 5 ? '#7DD3FC' : '#E7E5E4'} stopOpacity={Tc > 60 || Tc < 5 ? 0.55 : 0.25} />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx="200" cy="288" rx="150" ry="9" fill={`url(#${uid}-bath)`} />
          <GroundShadow id={uid} cx={200} cy={282} rx={118} />
          {/* khí trong xi lanh: màu lấy thẳng từ mô hình (đậm lên NGAY khi nén), chỉ piston trượt mượt */}
          <rect x="96" y={pistonYe} width="208" height={gasHe} fill={brown} data-testid="lc-gas" />
          <rect x="96" y={pistonYe} width="208" height={gasHe} fill={`url(#${uid}-gas)`} opacity={0.18 + 0.2 * view.color} pointerEvents="none" />
          {/* thành xi lanh bằng thủy tinh */}
          <rect x="90" y="25" width="6" height="250" rx="2" fill="#A8A29E" />
          <rect x="304" y="25" width="6" height="250" rx="2" fill="#A8A29E" />
          <rect x="90" y="25" width="220" height="250" fill={`url(#${uid}-glass)`} pointerEvents="none" />
          <rect x="88" y="270" width="224" height="10" rx="3" fill={`url(#${uid}-steel)`} stroke="#57534E" strokeWidth="1" />
          {Array.from({length: no2n}, (_, i) => (
            <g key={`n${i}`} transform={`translate(${104 + rnd(i, 1) * 192},${pistonYe + 10 + rnd(i, 2) * Math.max(8, gasHe - 22)})`}>
              <circle r="4.6" fill={`url(#${uid}-no2b)`} />
              <circle cx="7" cy="2" r="3.6" fill={`url(#${uid}-no2a)`} />
              {!reduced && <animateTransform attributeName="transform" type="translate" additive="sum" values="0,0;3,-3;-2,2;0,0" keyTimes="0;0.33;0.66;1" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1" dur={`${1.1 + rnd(i, 3)}s`} repeatCount="indefinite" />}
            </g>
          ))}
          {Array.from({length: n2o4n}, (_, i) => (
            <g key={`d${i}`} transform={`translate(${108 + rnd(i, 4) * 184},${pistonYe + 10 + rnd(i, 5) * Math.max(8, gasHe - 22)})`}>
              <line x1="3" y1="0" x2="6" y2="0" stroke="#475569" strokeWidth="2.4" strokeLinecap="round" />
              <circle r="4.3" fill={`url(#${uid}-n2o4)`} stroke="#475569" strokeWidth="0.8" />
              <circle cx="9" r="4.3" fill={`url(#${uid}-n2o4)`} stroke="#475569" strokeWidth="0.8" />
              {!reduced && <animateTransform attributeName="transform" type="translate" additive="sum" values="0,0;-2,3;3,-1;0,0" keyTimes="0;0.33;0.66;1" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1;0.4 0 0.6 1" dur={`${1.4 + rnd(i, 6)}s`} repeatCount="indefinite" />}
            </g>
          ))}
          {/* piston + thanh truyền bằng thép */}
          <rect x="192" y="6" width="16" height={Math.max(0, pistonYe - 14 - 6)} fill={`url(#${uid}-metal)`} stroke="#57534E" strokeWidth="0.8" />
          <rect x="192" y="6" width="16" height={Math.max(0, pistonYe - 14 - 6)} fill="#78716C" opacity="0.55" pointerEvents="none" />
          <rect x="168" y="2" width="64" height="9" rx="4" fill="#44403C" />
          <rect x="90" y={pistonYe - 14} width="220" height="14" rx="3" fill={`url(#${uid}-steel)`} stroke="#57534E" />
          <rect x="94" y={pistonYe - 12} width="212" height="3" rx="1.5" fill="#fff" opacity="0.5" pointerEvents="none" />
          <text x="320" y={pistonYe + 18} fontSize="11" fill="#57534E">V = {fmtNum(V, 3)} L</text>
          <text x="320" y="262" fontSize="11" fill="#57534E">p = {fmtNum(view.pressure, 3)} atm</text>
          {Tc > 60 && (
            <g>
              <path d="M180,296 q-8,-12 0,-20 q6,8 14,-2 q8,12 -2,22 z" fill="#F97316" />
              <path d="M184,294 q-4,-7 0,-12 q3,5 8,-1 q4,7 -1,13 z" fill="#FDE047" opacity="0.9" />
            </g>
          )}
          {Tc < 5 && <text x="130" y="296" fontSize="12" fill="#0EA5E9">❄ bể nước đá</text>}
          <text x="14" y="292" fontSize="11" fill="#57534E">T = {Tc} °C</text>
        </svg>
        <div className="flex flex-col gap-2">
          <svg viewBox="0 0 290 130" className="w-full rounded-xl border border-[#E6E4DD] bg-white" data-testid="lc-chart">
            <text x="8" y="12" fontSize="10" fill="#78716C">[NO₂] theo thời gian (độ đậm màu nâu)</text>
            <line x1="14" y1="112" x2="278" y2="112" stroke="#57534E" />
            {hist.length > 1 && <polyline points={hist.map((h) => `${hx(h.t).toFixed(1)},${hy(h.c).toFixed(1)}`).join(' ')} fill="none" stroke="#9A3412" strokeWidth="2.2" />}
            {hist.filter((h) => h.mark).map((h, i) => (
              <g key={i}>
                <line x1={hx(h.t)} y1="20" x2={hx(h.t)} y2="112" stroke="#2563EB" strokeDasharray="3 3" />
                <text x={hx(h.t) + 3} y="30" fontSize="9" fill="#1D4ED8">{h.mark}</text>
              </g>
            ))}
          </svg>
          <div className="grid grid-cols-2 gap-2 text-center text-[11px] font-mono">
            {([['[NO₂]', `${fmtNum(view.cNO2, 3)} M`], ['[N₂O₄]', `${fmtNum(view.cN2O4, 3)} M`], ['Qp', Number.isFinite(view.Q) ? fmtNum(view.Q, 3) : '∞'], ['Kp (T)', fmtNum(view.Kp, 3)]] as [string, string][]).map(([k, v]) => (
              <div key={k} className="rounded-lg bg-white border border-[#E6E4DD] py-1.5">
                <div className="text-stone-500">{k}</div>
                <div className="font-bold text-stone-900">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={`${card} flex flex-col gap-2`}>
        <Slider testid="lc-v" label="Thể tích (piston)" value={V} min={0.4} max={3} step={0.05} onChange={(v) => { mark(v < V ? 'nén' : 'giãn'); setV(v); }} fmt={(v) => `${fmtNum(v, 3)} L`} />
        <Slider testid="lc-t" label="Nhiệt độ" value={Tc} min={-20} max={120} step={1} onChange={(v) => { mark(v > Tc ? 'đun' : 'làm lạnh'); setTc(v); }} fmt={(v) => `${v} °C`} />
        <div className="flex flex-wrap gap-2">
          <button data-testid="lc-compress" onClick={() => { mark('nén ×2'); setV((v) => Math.max(0.4, v / 2)); }} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold">Nén piston ×2</button>
          <button data-testid="lc-heat" onClick={() => { mark('đun nóng'); setTc((t) => Math.min(120, t + 40)); }} className="px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-semibold">Đun nóng +40 °C</button>
          <button data-testid="lc-cool" onClick={() => { mark('làm lạnh'); setTc((t) => Math.max(-20, t - 40)); }} className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold">Làm lạnh −40 °C</button>
          <button data-testid="lc-reset" onClick={() => { setVal(1.5, 25); ref.current.xi = lcEquilibrium(N0, 1.5, 298.15); setXi(ref.current.xi); setHist([]); }} className="px-3 py-1.5 rounded-lg border border-[#DCD9D0] bg-white text-xs">Đặt lại</button>
        </div>
        <p className="text-[11px] text-stone-500">Nén piston: màu đậm lên NGAY (nồng độ tăng), rồi nhạt dần khi cân bằng chuyển về N₂O₄ — nhưng vẫn đậm hơn lúc đầu. Đun nóng: cân bằng chuyển về NO₂ (chiều thu nhiệt). Kp(298 K) = {LC.Kp298} atm⁻¹.</p>
      </div>
    </div>
  );
};

// ====================================================================== PIN DANIELL
export const DaniellEngine: React.FC<Props> = ({blueprint}) => {
  const meta = (blueprint.meta ?? {}) as {anode?: string; cathode?: string};
  const [metals, setMetals] = useState<[string, string]>([meta.anode ?? 'Zn', meta.cathode ?? 'Cu']);
  const cell = useMemo(() => daniellCell(metals[0], metals[1]) ?? daniellCell('Zn', 'Cu')!, [metals]);
  const [closed, setClosed] = useState(false);
  const [speed, setSpeed] = useState(20);
  const [st, setSt] = useState<DaniellState>({cAnode: 1, cCathode: 1, dmAnode: 0, dmCathode: 0, charge: 0, t: 0});
  const stRef = useRef(st);
  stRef.current = st;
  const closedRef = useRef(closed);
  closedRef.current = closed;
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const cellRef = useRef(cell);
  cellRef.current = cell;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.max(0, Math.min(0.1, (now - last) / 1000));
      last = now;
      if (closedRef.current) {
        const next = daniellStep(stRef.current, cellRef.current, 1.5, dt * speedRef.current * 6);
        stRef.current = next;
        setSt(next);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const E = nernstE(cell, st.cAnode, st.cCathode);
  const glow = closed ? Math.max(0, Math.min(1, E / Math.max(cell.E0, 0.05))) : 0;
  const lg = (v: number) => Math.log10(Math.max(v, 1e-6));
  const setConc = (side: 'cAnode' | 'cCathode', logv: number) => setSt({...st, [side]: Math.pow(10, logv)});
  const reset = () => setSt({cAnode: 1, cCathode: 1, dmAnode: 0, dmCathode: 0, charge: 0, t: 0});
  const swap = (side: 0 | 1, metal: string) => {
    const m: [string, string] = side === 0 ? [metal, metals[1]] : [metals[0], metal];
    if (m[0] !== m[1]) {
      setMetals(m);
      reset();
    }
  };
  const aT = Math.max(8, 22 + (st.dmAnode / 65) * 40);
  const cT = Math.min(34, 22 + (st.dmCathode / 65) * 40);
  const uid = useUid();
  const reduced = usePrefersReducedMotion();
  const aTe = useEased(aT, 12);
  const cTe = useEased(cT, 12);
  const glowE = useEased(glow, 8);
  const catOpE = useEased(0.45 + 0.35 * Math.min(1, st.cCathode), 8);
  const ionDots = (n: number, x0: number, color: string, key: string) =>
    Array.from({length: n}, (_, i) => <circle key={`${key}${i}`} cx={x0 + ((i * 37) % 70)} cy={150 + ((i * 53) % 60)} r="3.2" fill={color} opacity="0.8" />);
  const nAn = Math.min(14, Math.round(4 + Math.log10(Math.max(st.cAnode, 1e-3) * 1000) * 3));
  const nCat = Math.min(14, Math.round(4 + Math.log10(Math.max(st.cCathode, 1e-3) * 1000) * 3));
  return (
    <div className="p-4 flex flex-col gap-3" data-testid="daniell-engine" data-e={E.toFixed(4)} data-e0={cell.E0.toFixed(3)} data-closed={closed} data-canode={st.cAnode.toFixed(4)} data-ccathode={st.cCathode.toFixed(4)} data-anode={cell.anode.metal} data-cathode={cell.cathode.metal}>
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-mono text-sm font-bold text-stone-900">
          ({cell.anode.metal} | {cell.anode.metal}²⁺ ‖ {cell.cathode.metal}²⁺ | {cell.cathode.metal}) &nbsp; E° = {fmtNum(cell.E0, 3)} V
        </span>
        <span data-testid="daniell-eq" className="ml-auto text-xs font-mono text-stone-700">
          {cell.anode.metal} + {cell.cathode.metal}²⁺ → {cell.anode.metal}²⁺ + {cell.cathode.metal}
        </span>
      </div>
      <svg viewBox="0 0 560 330" className="w-full rounded-xl border border-[#E6E4DD] bg-white" data-testid="daniell-svg">
        <defs>
          <VisualDefs id={uid} />
          <marker id="earr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#F59E0B" />
          </marker>
        </defs>
        {/* dây dẫn + vôn kế + bóng đèn */}
        <path d="M120,120 L120,40 L186,40 M214,40 L258,40 M302,40 L375,40 M405,40 L440,40 L440,120" fill="none" stroke="#44403C" strokeWidth="3.5" strokeLinejoin="round" />
        <circle cx="280" cy="40" r="22" fill="#fff" stroke="#44403C" strokeWidth="3" />
        <text x="280" y="38" fontSize="9" textAnchor="middle" fill="#57534E">V</text>
        <text x="280" y="50" fontSize="11" textAnchor="middle" fontWeight="700" fill="#18181B" data-testid="daniell-voltmeter">{fmtNum(E, 3)}</text>
        <circle cx="200" cy="40" r={14 + 22 * glowE} fill={`url(#${uid}-halo)`} opacity={glowE} pointerEvents="none" />
        <circle cx="200" cy="40" r="14" fill={`rgba(250, 204, 21, ${0.15 + 0.85 * glowE})`} stroke="#A16207" strokeWidth="2.5" />
        {glowE > 0.05 && Array.from({length: 8}, (_, i) => <line key={i} x1={200 + Math.cos((i * Math.PI) / 4) * 18} y1={40 + Math.sin((i * Math.PI) / 4) * 18} x2={200 + Math.cos((i * Math.PI) / 4) * (22 + glowE * 6)} y2={40 + Math.sin((i * Math.PI) / 4) * (22 + glowE * 6)} stroke="#FACC15" strokeWidth="2" strokeLinecap="round" />)}
        <g transform="translate(375,40)" onClick={() => setClosed((c) => !c)} style={{cursor: 'pointer'}} data-testid="daniell-switch">
          <circle r="5" fill="#44403C" />
          <line x1="0" y1="0" x2={closed ? 30 : 24} y2={closed ? 0 : -16} stroke={closed ? '#16A34A' : '#DC2626'} strokeWidth="4" strokeLinecap="round" />
        </g>
        {closed && (
          <g>
            <line x1="130" y1="40" x2="170" y2="40" stroke="#F59E0B" strokeWidth="3" markerEnd="url(#earr)" />
            <line x1="330" y1="40" x2="300" y2="40" stroke="#F59E0B" strokeWidth="0" />
            <line x1="410" y1="40" x2="436" y2="40" stroke="#F59E0B" strokeWidth="3" markerEnd="url(#earr)" />
            <text x="132" y="30" fontSize="10" fill="#B45309">e⁻</text>
            {!reduced && [0, 1, 2].map((k) => (
              <circle key={`e${k}`} r="2.6" fill="#F59E0B" opacity="0.9">
                <animateMotion path="M120,120 L120,40 L440,40 L440,120" dur="3.4s" begin={`${-k * 1.13}s`} repeatCount="indefinite" />
              </circle>
            ))}
          </g>
        )}
        {/* cốc */}
        {[{x: 40, c: ION_COLOR[cell.anode.metal], el: cell.anode, side: 'an'}, {x: 330, c: ION_COLOR[cell.cathode.metal], el: cell.cathode, side: 'cat'}].map(({x, c, el, side}) => (
          <g key={side}>
            <GroundShadow id={uid} cx={x + 95} cy={298} rx={98} />
            <rect x={x} y="130" width="190" height="165" rx="10" fill={c} opacity={side === 'cat' ? catOpE : 0.35} />
            <rect x={x} y="130" width="190" height="165" rx="10" fill={`url(#${uid}-glass)`} stroke="#78716C" strokeWidth="3" pointerEvents="none" />
            <rect x={x + 8} y="138" width="5" height="120" rx="2.5" fill="#fff" opacity="0.55" pointerEvents="none" />
            <text x={x + 95} y="315" fontSize="12" textAnchor="middle" fill="#57534E">{side === 'an' ? `${el.metal}²⁺ ${fmtNum(st.cAnode, 3)} M` : `${el.metal}²⁺ ${fmtNum(st.cCathode, 3)} M`}</text>
          </g>
        ))}
        {ionDots(nAn, 54, '#64748B', 'a')}
        {ionDots(nCat, 345, '#0284C7', 'c')}
        {/* điện cực */}
        <rect data-testid="electrode-anode" x={110 - aTe / 2} y="100" width={aTe} height="150" rx="3" fill={cell.anode.color} stroke="#334155" strokeWidth="2" />
        <rect x={110 - aTe / 2} y="100" width={aTe} height="150" rx="3" fill={`url(#${uid}-metal)`} pointerEvents="none" />
        <text x="110" y="92" fontSize="12" textAnchor="middle" fontWeight="700">(−) {cell.anode.metal}</text>
        <rect data-testid="electrode-cathode" x={440 - cTe / 2} y="100" width={cTe} height="150" rx="3" fill={cell.cathode.color} stroke="#7C2D12" strokeWidth="2" />
        <rect x={440 - cTe / 2} y="100" width={cTe} height="150" rx="3" fill={`url(#${uid}-metal)`} pointerEvents="none" />
        <text x="440" y="92" fontSize="12" textAnchor="middle" fontWeight="700">(+) {cell.cathode.metal}</text>
        {/* cầu muối */}
        <path d="M150,175 L150,110 Q150,100 160,100 L400,100 Q410,100 410,110 L410,175" fill="none" stroke="#FDE68A" strokeWidth="16" strokeLinecap="round" opacity="0.9" />
        <path d="M150,175 L150,110 Q150,100 160,100 L400,100 Q410,100 410,110 L410,175" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 5" />
        <text x="280" y="116" fontSize="10" textAnchor="middle" fill="#92400E">cầu muối KNO₃</text>
        {closed && (
          <>
            <circle r="4" cx={reduced ? 280 : undefined} cy="101" fill="#7C3AED">{!reduced && <animate attributeName="cx" values="170;390" keyTimes="0;1" calcMode="spline" keySplines="0.45 0 0.55 1" dur="2.2s" repeatCount="indefinite" />}</circle>
            <text fontSize="9" fill="#6D28D9" x="285" y="94">K⁺ →</text>
            <circle r="4" cx={reduced ? 300 : undefined} cy="99" fill="#0891B2">{!reduced && <animate attributeName="cx" values="390;170" keyTimes="0;1" calcMode="spline" keySplines="0.45 0 0.55 1" dur="2.6s" repeatCount="indefinite" />}</circle>
            <text fontSize="9" fill="#0E7490" x="226" y="94">← NO₃⁻</text>
          </>
        )}
      </svg>
      <div className={`${card} flex flex-col gap-2`}>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="flex items-center gap-1">Anot (−)
            <select data-testid="daniell-anode" value={metals[0]} onChange={(e) => swap(0, e.target.value)} className="border border-[#DCD9D0] rounded px-1.5 py-1 bg-white">
              {ELECTRODES.map((m) => <option key={m.metal} value={m.metal}>{m.metal}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-1">Catot (+)
            <select data-testid="daniell-cathode" value={metals[1]} onChange={(e) => swap(1, e.target.value)} className="border border-[#DCD9D0] rounded px-1.5 py-1 bg-white">
              {ELECTRODES.map((m) => <option key={m.metal} value={m.metal}>{m.metal}</option>)}
            </select>
          </label>
          <button data-testid="daniell-toggle" onClick={() => setClosed((c) => !c)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${closed ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>{closed ? 'Ngắt mạch' : 'Đóng mạch'}</button>
          <button data-testid="daniell-reset" onClick={reset} className="px-3 py-1.5 rounded-lg border border-[#DCD9D0] bg-white text-xs">Đặt lại nồng độ</button>
        </div>
        <Slider testid="daniell-can" label={`[${cell.anode.metal}²⁺]`} value={lg(st.cAnode)} min={-3} max={0.4} step={0.05} onChange={(v) => setConc('cAnode', v)} fmt={(v) => `${fmtNum(Math.pow(10, v), 3)} M`} />
        <Slider testid="daniell-ccat" label={`[${cell.cathode.metal}²⁺]`} value={lg(st.cCathode)} min={-3} max={0.4} step={0.05} onChange={(v) => setConc('cCathode', v)} fmt={(v) => `${fmtNum(Math.pow(10, v), 3)} M`} />
        <Slider testid="daniell-speed" label="Tốc độ mô phỏng" value={speed} min={1} max={60} step={1} onChange={setSpeed} fmt={(v) => `×${v}`} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-[11px] font-mono">
          {([['E°', `${fmtNum(cell.E0, 3)} V`], ['E (Nernst)', `${fmtNum(E, 3)} V`], [`Δm ${cell.anode.metal}`, `${fmtNum(st.dmAnode * 1000, 3)} mg`], [`Δm ${cell.cathode.metal}`, `+${fmtNum(st.dmCathode * 1000, 3)} mg`]] as [string, string][]).map(([k, v]) => (
            <div key={k} className="rounded-lg bg-white border border-[#E6E4DD] py-1.5">
              <div className="text-stone-500">{k}</div>
              <div className="font-bold text-stone-900">{v}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-stone-500">E = E° − (0,0592/2)·lg([{cell.anode.metal}²⁺]/[{cell.cathode.metal}²⁺]) ở 25 °C. Đóng mạch: {cell.anode.metal} tan, {cell.cathode.metal} bám vào, [{cell.anode.metal}²⁺] tăng, [{cell.cathode.metal}²⁺] giảm → E giảm dần. Cầu muối cho K⁺ sang cực dương và NO₃⁻ sang cực âm để trung hòa điện tích.</p>
      </div>
    </div>
  );
};

