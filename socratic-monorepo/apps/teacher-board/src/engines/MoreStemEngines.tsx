'use client';

import React, {useMemo, useState} from 'react';
import {SimulationBlueprint, CurriculumLevel} from '@socratic/types';
import {fmtNum} from '../utils/mathExpr';
import {Slider} from './StemModelEngines';
import {SphereGrad, VisualDefs, useEased, usePrefersReducedMotion, useUid} from './visualKit';
import {stomata, osmosis, operonLac, type CellType, type LacMutant} from '../utils/bioModels';
import {
  boxStatsFromData,
  boxStatsFromSummary,
  functionFromTable,
  kindsOf,
  signsOf,
  validateTable,
  type BoxInput,
  type VariationTable,
} from '../utils/mathModels';

interface Props {
  blueprint: SimulationBlueprint;
  params?: Record<string, number>;
  curriculumLevel?: CurriculumLevel;
}

const card = 'rounded-xl bg-[#F4F3EE] border border-[#E5E3DC] p-3';
const chip = (on: boolean, color = '#2563EB') => `px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${on ? 'text-white' : 'bg-white text-stone-700 border-[#DCD9D0] hover:bg-stone-50'}` + (on ? '' : '') ;
void chip;
const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Các mốc chia đẹp cho trục. */
function ticks(lo: number, hi: number, want = 8): number[] {
  const raw = (hi - lo) / Math.max(want, 1);
  if (!(raw > 0)) return [lo];
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}

// ====================================================================== KHÍ KHỔNG
export const StomataEngine: React.FC<Props> = () => {
  const [light, setLight] = useState(75);
  const [moisture, setMoisture] = useState(75);
  const [temp, setTemp] = useState(26);
  const r = useMemo(() => stomata(light, moisture, temp), [light, moisture, temp]);
  const uid = useUid();
  const gap = useEased(r.aperture * 40, 9); // khe khí khổng mở/đóng mượt; số liệu vẫn lấy từ mô hình
  const turgorE = useEased(r.turgor, 9);
  const rx = 30;
  const cx = 260;
  const turgorCol = `hsl(${140 - 40 * (1 - turgorE)}, ${45 + 25 * turgorE}%, ${70 - 22 * turgorE}%)`;
  const kDots = Math.round(r.potassium * 14);
  const label = {open: 'Mở rộng', narrow: 'Mở hẹp', closed: 'Đóng kín'}[r.state];
  const arrows = (n: number, down: boolean, color: string, x0: number) =>
    Array.from({length: n}, (_, i) => {
      const x = x0 + (i - (n - 1) / 2) * 16;
      const y1 = down ? 36 : 82;
      const y2 = down ? 82 : 36;
      return <line key={i} x1={x} y1={y1} x2={x} y2={y2} stroke={color} strokeWidth="2.4" markerEnd="url(#arr)" opacity="0.85" />;
    });
  return (
    <div className="p-4 flex flex-col gap-3" data-testid="stomata-engine" data-aperture={r.aperture.toFixed(3)} data-state={r.state}>
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-mono text-sm font-bold text-stone-900">Khí khổng: {label} ({pct(r.aperture)})</span>
        <span data-testid="stomata-reason" className="text-xs text-stone-600 flex-1 min-w-[220px]">{r.reason}</span>
      </div>
      <svg viewBox="0 0 520 300" className="w-full rounded-xl border border-[#E6E4DD] bg-gradient-to-b from-sky-50 to-white" data-testid="stomata-svg">
        <defs>
          <VisualDefs id={uid} />
          <SphereGrad id={`${uid}-chl`} light="#BBF7D0" base="#16A34A" dark="#14532D" />
          <SphereGrad id={`${uid}-k`} light="#EDE9FE" base="#7C3AED" dark="#4C1D95" />
          <linearGradient id={`${uid}-epi`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#DCFCE7" />
            <stop offset="1" stopColor="#86EFAC" />
          </linearGradient>
          <radialGradient id={`${uid}-guard`} cx="0.35" cy="0.3" r="0.9">
            <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
            <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.14" />
          </radialGradient>
          <marker id="arr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="context-stroke" />
          </marker>
        </defs>
        <rect x="0" y="120" width="520" height="62" fill={`url(#${uid}-epi)`} opacity="0.7" />
        <text x="12" y="116" fontSize="11" fill="#166534">Biểu bì lá</text>
        {/* hai tế bào bảo vệ */}
        {[-1, 1].map((side) => {
          const x = cx + side * (gap / 2 + rx);
          return (
            <g key={side} data-testid={side < 0 ? 'guard-left' : 'guard-right'}>
              <ellipse cx={x} cy={151} rx={rx} ry={52 + 6 * turgorE} fill={turgorCol} stroke="#15803D" strokeWidth="2.5" />
              <ellipse cx={x} cy={151} rx={rx} ry={52 + 6 * turgorE} fill={`url(#${uid}-guard)`} pointerEvents="none" />
              {[0, 1, 2].map((i) => (
                <circle key={i} cx={x + (i - 1) * 9} cy={146 + (i % 2) * 14} r="4.8" fill={`url(#${uid}-chl)`} />
              ))}
              {Array.from({length: kDots}, (_, i) => (
                <circle key={`k${i}`} cx={x - 18 + (i % 4) * 12} cy={118 + Math.floor(i / 4) * 12} r="2.9" fill={`url(#${uid}-k)`} />
              ))}
            </g>
          );
        })}
        <ellipse cx={cx} cy={151} rx={Math.max(gap / 2, 0.8)} ry={46} fill="#E0F2FE" opacity={r.aperture > 0.02 ? 1 : 0} data-testid="stomata-pore" />
        {/* khí ra vào */}
        <g transform="translate(0,0)">{arrows(Math.round(r.co2Uptake * 4), true, '#2563EB', cx)}</g>
        <text x={cx + 78} y="58" fontSize="11" fill="#2563EB">CO₂ vào</text>
        <g transform="translate(0,200)">{arrows(Math.round(r.waterLoss * 4), false, '#0891B2', cx)}</g>
        <text x={cx + 78} y="262" fontSize="11" fill="#0891B2">H₂O thoát</text>
        <text x="14" y="288" fontSize="10.5" fill="#6D28D9">● K⁺ trong tế bào bảo vệ</text>
        <text x="190" y="288" fontSize="10.5" fill="#16A34A">● lục lạp</text>
      </svg>
      <div className={`${card} flex flex-col gap-2`}>
        <Slider testid="stomata-light" label="Ánh sáng" value={light} min={0} max={100} step={1} onChange={setLight} fmt={(v) => `${v}%`} />
        <Slider testid="stomata-moisture" label="Độ ẩm đất" value={moisture} min={0} max={100} step={1} onChange={setMoisture} fmt={(v) => `${v}%`} />
        <Slider testid="stomata-temp" label="Nhiệt độ" value={temp} min={10} max={50} step={1} onChange={setTemp} fmt={(v) => `${v} °C`} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-[11px] font-mono">
          {([['K⁺', r.potassium], ['Áp suất trương', r.turgor], ['Hấp thụ CO₂', r.co2Uptake], ['Quang hợp', r.photosynthesis]] as [string, number][]).map(([k, v]) => (
            <div key={k} className="rounded-lg bg-white border border-[#E6E4DD] py-1.5">
              <div className="text-stone-500">{k}</div>
              <div className="font-bold text-stone-900">{pct(v)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ====================================================================== THẨM THẤU
export const OsmosisEngine: React.FC<Props> = ({blueprint}) => {
  const meta = (blueprint.meta ?? {}) as {cellType?: CellType; cOut?: number};
  const [type, setType] = useState<CellType>(meta.cellType ?? 'plant');
  const [c, setC] = useState<number>(meta.cOut ?? 3);
  const r = useMemo(() => osmosis(type, c), [type, c]);
  const curve = useMemo(() => Array.from({length: 120}, (_, i) => {
    const cc = 0.05 + (i / 119) * 5.95;
    return {c: cc, v: osmosis(type, cc).volume};
  }), [type]);
  const vmax = Math.max(1.6, ...curve.map((p) => p.v));
  const gx = (cc: number) => 28 + (cc / 6) * 240;
  const gy = (v: number) => 130 - (v / vmax) * 110;
  const flowCol = r.waterFlow === 'in' ? '#2563EB' : r.waterFlow === 'out' ? '#E11D48' : '#A8A29E';
  const arrowsN = r.waterFlow === 'none' ? 0 : 4;
  const wallW = 190;
  const wallH = 130;
  const scale = type === 'plant' ? Math.max(0.35, r.volume) : Math.sqrt(Math.max(r.volume, 0.2));
  const burst = r.state === 'burst';
  const uid = useUid();
  const reduced = usePrefersReducedMotion();
  const scaleE = useEased(scale, 8); // tế bào co/trương mượt; trạng thái (vỡ, teo) vẫn lấy từ mô hình
  return (
    <div className="p-4 flex flex-col gap-3" data-testid="osmosis-engine" data-state={r.state} data-volume={r.volume.toFixed(3)} data-type={type}>
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-mono text-sm font-bold text-stone-900">{type === 'plant' ? 'Tế bào thực vật' : 'Hồng cầu'} · NaCl {fmtNum(c, 3)}% ({c < 0.85 ? 'nhược trương' : c > 0.95 ? 'ưu trương' : 'đẳng trương'})</span>
        <span data-testid="osmosis-label" className="ml-auto text-xs font-semibold text-stone-800">{r.label}</span>
      </div>
      <div className="grid md:grid-cols-[3fr_2fr] gap-3">
        <svg viewBox="0 0 400 260" className="w-full rounded-xl border border-[#E6E4DD] bg-sky-50/60" data-testid="osmosis-svg">
          <defs>
            <VisualDefs id={uid} />
            <radialGradient id={`${uid}-rbc`} cx="0.38" cy="0.32" r="0.8">
              <stop offset="0" stopColor="#FECACA" />
              <stop offset="0.55" stopColor="#F87171" />
              <stop offset="1" stopColor="#B91C1C" />
            </radialGradient>
            <radialGradient id={`${uid}-vac`} cx="0.5" cy="0.4" r="0.7">
              <stop offset="0" stopColor="#E0F2FE" />
              <stop offset="1" stopColor="#93C5FD" />
            </radialGradient>
            <linearGradient id={`${uid}-proto`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#DCFCE7" />
              <stop offset="1" stopColor="#86EFAC" />
            </linearGradient>
            <SphereGrad id={`${uid}-chl`} light="#BBF7D0" base="#16A34A" dark="#14532D" />
            <marker id="oarr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill={flowCol} />
            </marker>
          </defs>
          {type === 'plant' ? (
            <g transform="translate(200,130)">
              <rect x={-wallW / 2} y={-wallH / 2} width={wallW} height={wallH} rx="16" fill="#FEF3C7" stroke="#B45309" strokeWidth="5" />
              <rect x={-wallW / 2} y={-wallH / 2} width={wallW} height={wallH} rx="16" fill={`url(#${uid}-glass)`} pointerEvents="none" />
              <rect data-testid="protoplast" x={(-wallW / 2 + 7) * Math.min(scaleE, 1)} y={(-wallH / 2 + 7) * Math.min(scaleE, 1)} width={(wallW - 14) * Math.min(scaleE, 1)} height={(wallH - 14) * Math.min(scaleE, 1)} rx="14" fill={`url(#${uid}-proto)`} stroke="#16A34A" strokeWidth="3" />
              <ellipse cx="0" cy="0" rx={50 * Math.min(scaleE, 1.05)} ry={30 * Math.min(scaleE, 1.05)} fill={`url(#${uid}-vac)`} opacity="0.9" />
              <circle cx={-60 * Math.min(scaleE, 1)} cy={-24 * Math.min(scaleE, 1)} r="8" fill={`url(#${uid}-chl)`} />
              <circle cx={58 * Math.min(scaleE, 1)} cy={26 * Math.min(scaleE, 1)} r="8" fill={`url(#${uid}-chl)`} />
            </g>
          ) : burst ? (
            <g transform="translate(200,130)" data-testid="rbc-burst">
              {Array.from({length: 9}, (_, i) => {
                const a = (i / 9) * Math.PI * 2;
                return <ellipse key={i} cx={Math.cos(a) * 64} cy={Math.sin(a) * 52} rx="14" ry="8" transform={`rotate(${(a * 180) / Math.PI} ${Math.cos(a) * 64} ${Math.sin(a) * 52})`} fill="#FCA5A5" opacity="0.8" />;
              })}
              <text x="0" y="5" textAnchor="middle" fontSize="12" fill="#9F1239" fontWeight="700">Tan huyết</text>
            </g>
          ) : (
            <g transform="translate(200,130)" data-testid="rbc">
              {r.state === 'crenated' ? (
                <path d={Array.from({length: 33}, (_, i) => {
                  const a = (i / 32) * Math.PI * 2;
                  const rad = 52 * scaleE * (i % 2 ? 1.12 : 0.9);
                  return `${i ? 'L' : 'M'}${(Math.cos(a) * rad).toFixed(1)},${(Math.sin(a) * rad).toFixed(1)}`;
                }).join(' ') + 'Z'} fill={`url(#${uid}-rbc)`} stroke="#B91C1C" strokeWidth="2.5" />
              ) : (
                <>
                  <ellipse cx="0" cy="0" rx={78 * scaleE} ry={78 * scaleE} fill={`url(#${uid}-rbc)`} stroke="#B91C1C" strokeWidth="3" />
                  <ellipse cx="0" cy="0" rx={r.state === 'swollen' ? 8 : 28 * scaleE} ry={r.state === 'swollen' ? 6 : 18 * scaleE} fill="#FECACA" opacity="0.9" />
                </>
              )}
            </g>
          )}
          {Array.from({length: arrowsN}, (_, i) => {
            const x = 70 + i * 86;
            const inward = r.waterFlow === 'in';
            return (
              <g key={i}>
                <line x1={x} y1={inward ? 18 : 50} x2={x} y2={inward ? 50 : 18} stroke={flowCol} strokeWidth="3" strokeLinecap="round" markerEnd="url(#oarr)" />
                <line x1={x} y1={inward ? 242 : 210} x2={x} y2={inward ? 210 : 242} stroke={flowCol} strokeWidth="3" strokeLinecap="round" markerEnd="url(#oarr)" />
                {!reduced && <circle cx={x + 10} r="2.6" fill={flowCol} opacity="0.7"><animate attributeName="cy" values={inward ? '18;60' : '60;18'} keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.6 1" dur="1.6s" begin={`${-i * 0.4}s`} repeatCount="indefinite" /></circle>}
              </g>
            );
          })}
          <text x="10" y="252" fontSize="11" fill={flowCol} fontWeight="700">{r.waterFlow === 'in' ? 'Nước đi vào tế bào' : r.waterFlow === 'out' ? 'Nước đi ra khỏi tế bào' : 'Không có dòng nước thực'}</text>
        </svg>
        <svg viewBox="0 0 290 160" className="w-full rounded-xl border border-[#E6E4DD] bg-white" data-testid="osmosis-chart">
          <text x="8" y="12" fontSize="10" fill="#78716C">Thể tích tương đối theo nồng độ NaCl ngoài (%)</text>
          <line x1="28" y1="130" x2="270" y2="130" stroke="#57534E" />
          <line x1="28" y1="14" x2="28" y2="130" stroke="#57534E" />
          {[0, 1, 2, 3, 4, 5, 6].map((t) => (
            <g key={t}>
              <line x1={gx(t)} y1="130" x2={gx(t)} y2="134" stroke="#57534E" />
              <text x={gx(t)} y="146" fontSize="9" textAnchor="middle" fill="#78716C">{t}</text>
            </g>
          ))}
          <line x1={gx(0.9)} y1="14" x2={gx(0.9)} y2="130" stroke="#10B981" strokeDasharray="3 3" />
          <text x={gx(0.9) + 3} y="26" fontSize="9" fill="#047857">đẳng trương</text>
          <path d={curve.map((p, i) => `${i ? 'L' : 'M'}${gx(p.c).toFixed(1)},${gy(Math.min(p.v, vmax)).toFixed(1)}`).join(' ')} fill="none" stroke="#2563EB" strokeWidth="2.2" />
          <circle cx={gx(Math.min(c, 6))} cy={gy(Math.min(r.volume, vmax))} r="5" fill="#E11D48" />
        </svg>
      </div>
      <div className={`${card} flex flex-col gap-2`}>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-28 shrink-0 font-medium text-stone-700">Loại tế bào</span>
          {(['plant', 'rbc'] as CellType[]).map((t) => (
            <button key={t} data-testid={`osmosis-type-${t}`} onClick={() => setType(t)} className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${type === t ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-stone-700 border-[#DCD9D0] hover:bg-stone-50'}`}>
              {t === 'plant' ? 'Thực vật' : 'Hồng cầu'}
            </button>
          ))}
        </div>
        <Slider testid="osmosis-c" label="NaCl bên ngoài" value={c} min={0} max={6} step={0.05} onChange={setC} fmt={(v) => `${fmtNum(v, 3)}%`} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-[11px] font-mono">
          {([['Π ngoài', `${fmtNum(r.piOut, 3)} atm`], ['Π trong', `${fmtNum(r.piIn, 3)} atm`], ['Áp suất trương', type === 'plant' ? `${fmtNum(r.turgor, 3)} atm` : '—'], ['Thể tích', `${fmtNum(r.volume * 100, 3)}%`]] as [string, string][]).map(([k, v]) => (
            <div key={k} className="rounded-lg bg-white border border-[#E6E4DD] py-1.5">
              <div className="text-stone-500">{k}</div>
              <div className="font-bold text-stone-900">{v}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-stone-500">Π tính theo van 't Hoff cho NaCl (i = 1,86) ở 37 °C. Thử kéo từ 0,1 % lên 3 % với cả hai loại tế bào: vì sao thực vật không vỡ còn hồng cầu thì có?</p>
      </div>
    </div>
  );
};

// ====================================================================== OPERON LAC
export const OperonLacEngine: React.FC<Props> = ({blueprint}) => {
  const meta = (blueprint.meta ?? {}) as {glucose?: boolean; lactose?: boolean};
  const [glucose, setGlucose] = useState(!!meta.glucose);
  const [lactose, setLactose] = useState(meta.lactose ?? true);
  const [mutant, setMutant] = useState<LacMutant>('none');
  const r = useMemo(() => operonLac(glucose, lactose, mutant), [glucose, lactose, mutant]);
  const genes = [
    {k: 'lacZ', x: 330, w: 92, n: 'β-galactosidase', v: r.enzymes.lacZ},
    {k: 'lacY', x: 424, w: 70, n: 'permease', v: r.enzymes.lacY},
    {k: 'lacA', x: 496, w: 70, n: 'transacetylase', v: r.enzymes.lacA},
  ];
  const uid = useUid();
  const reduced = usePrefersReducedMotion();
  const exprE = useEased(r.expression, 8);
  const brkE = useEased(r.lactoseBreakdown, 8);
  const ezZ = useEased(r.enzymes.lacZ, 8);
  const ezY = useEased(r.enzymes.lacY, 8);
  const ezA = useEased(r.enzymes.lacA, 8);
  const mrnaLen = Math.round(exprE * 236);
  const polStill = {transcribing: 260, weak: 180, blocked: 140, none: 140}[r.rnaPol as string] ?? 140; // giảm chuyển động: RNA pol đứng yên ở vị trí đặc trưng
  const toggle = (on: boolean, set: (b: boolean) => void, label: string, color: string, id: string) => (
    <button data-testid={id} onClick={() => set(!on)} className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition ${on ? 'text-white border-transparent' : 'bg-white text-stone-600 border-[#DCD9D0]'}`} style={on ? {background: color} : undefined}>
      {label}: {on ? 'CÓ' : 'KHÔNG'}
    </button>
  );
  return (
    <div className="p-4 flex flex-col gap-3" data-testid="lac-engine" data-expression={r.expression.toFixed(2)} data-pol={r.rnaPol} data-repressor={r.repressorBound}>
      <div className="flex flex-wrap items-center gap-2">
        {toggle(glucose, setGlucose, 'Glucose', '#D97706', 'lac-glucose')}
        {toggle(lactose, setLactose, 'Lactose', '#2563EB', 'lac-lactose')}
        <label className="flex items-center gap-1.5 text-xs text-stone-700 ml-auto">
          Đột biến
          <select data-testid="lac-mutant" value={mutant} onChange={(e) => setMutant(e.target.value as LacMutant)} className="border border-[#DCD9D0] rounded-lg px-2 py-1.5 bg-white text-xs">
            <option value="none">Kiểu dại</option>
            <option value="lacI-">lacI⁻ (hỏng chất ức chế)</option>
            <option value="lacOc">lacOᶜ (toán tử đột biến)</option>
            <option value="cap-">CAP⁻ (hỏng hoạt hóa)</option>
          </select>
        </label>
      </div>
      <svg viewBox="0 0 600 300" className="w-full rounded-xl border border-[#E6E4DD] bg-white" data-testid="lac-svg">
        <defs>
          <VisualDefs id={uid} />
          <SphereGrad id={`${uid}-pol`} light="#BFDBFE" base="#2563EB" dark="#1E3A8A" />
          <SphereGrad id={`${uid}-pol0`} light="#E7E5E4" base="#A8A29E" dark="#57534E" />
          <linearGradient id={`${uid}-dna`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F5F5F4" />
            <stop offset="1" stopColor="#D6D3D1" />
          </linearGradient>
        </defs>
        {/* sợi ADN */}
        <rect x="20" y="150" width="560" height="14" rx="7" fill={`url(#${uid}-dna)`} stroke="#D6D3D1" />
        {[
          {x: 40, w: 56, n: 'CAP', c: '#BBF7D0'},
          {x: 100, w: 82, n: 'Promoter', c: '#BFDBFE'},
          {x: 186, w: 56, n: 'Toán tử O', c: '#FECACA'},
        ].map((s) => (
          <g key={s.n}>
            <rect x={s.x} y="138" width={s.w} height="38" rx="6" fill={s.c} stroke="#78716C" />
            <rect x={s.x} y="138" width={s.w} height="38" rx="6" fill={`url(#${uid}-glass)`} pointerEvents="none" />
            <text x={s.x + s.w / 2} y="162" fontSize="10.5" textAnchor="middle" fill="#292524">{s.n}</text>
          </g>
        ))}
        {genes.map((g) => (
          <g key={g.k}>
            <rect x={g.x} y="138" width={g.w} height="38" rx="6" fill="#FDE68A" stroke="#78716C" />
            <rect x={g.x} y="138" width={g.w} height="38" rx="6" fill={`url(#${uid}-glass)`} pointerEvents="none" />
            <text x={g.x + g.w / 2} y="162" fontSize="11" textAnchor="middle" fill="#292524" fontWeight="700">{g.k}</text>
          </g>
        ))}
        <rect x="20" y="40" width="165" height="52" rx="8" fill="#F5F5F4" stroke="#D6D3D1" />
        <text x="28" y="56" fontSize="10" fill="#57534E">lacI (gen điều hòa) →</text>
        <text x="28" y="72" fontSize="10" fill={mutant === 'lacI-' ? '#B91C1C' : '#57534E'}>{mutant === 'lacI-' ? 'chất ức chế HỎNG' : 'tạo chất ức chế'}</text>
        {/* chất ức chế */}
        {r.repressorBound ? (
          <g data-testid="repressor-bound">
            <polygon points="214,106 232,116 232,134 214,144 196,134 196,116" fill="#DC2626" stroke="#7F1D1D" strokeWidth="2" transform="translate(0,-4)" />
            <text x="214" y="128" fontSize="9.5" textAnchor="middle" fill="#fff" fontWeight="700">R</text>
          </g>
        ) : (
          <g data-testid="repressor-free" opacity={mutant === 'lacI-' ? 0.35 : 1}>
            <polygon points="150,60 168,70 168,88 150,98 132,88 132,70" fill={mutant === 'lacI-' ? '#A8A29E' : '#F87171'} stroke="#7F1D1D" strokeWidth="2" transform="translate(120,-20)" />
            <text x="270" y="64" fontSize="9.5" textAnchor="middle" fill="#fff" fontWeight="700">R</text>
            {r.allolactose && mutant !== 'lacI-' && <circle cx="292" cy="58" r="6" fill="#2563EB" stroke="#fff" strokeWidth="1.5" />}
          </g>
        )}
        {/* CAP–cAMP */}
        {r.capActive && (
          <g data-testid="cap-active">
            <circle cx="68" cy="126" r="13" fill="#16A34A" stroke="#14532D" strokeWidth="2" />
            <text x="68" y="130" fontSize="8.5" textAnchor="middle" fill="#fff" fontWeight="700">CAP</text>
            <circle cx="82" cy="115" r="5" fill="#FACC15" stroke="#854D0E" />
          </g>
        )}
        {/* RNA polymerase */}
        <g data-testid="rna-pol">
          <ellipse cx={reduced ? polStill : 140} cy="118" rx="26" ry="15" fill={`url(#${uid}-${r.rnaPol === 'blocked' ? 'pol0' : 'pol'})`} stroke="#1E3A8A" strokeWidth="2">
            {!reduced && r.rnaPol === 'transcribing' && <animate attributeName="cx" values="140;260;380;520;140" keyTimes="0;0.25;0.5;0.75;1" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1" dur="3.2s" repeatCount="indefinite" />}
            {!reduced && r.rnaPol === 'weak' && <animate attributeName="cx" values="140;230;140" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" dur="5s" repeatCount="indefinite" />}
          </ellipse>
          <text x={reduced ? polStill : 140} y="122" fontSize="9" textAnchor="middle" fill="#fff" fontWeight="700">
            RNA pol
            {!reduced && r.rnaPol === 'transcribing' && <animate attributeName="x" values="140;260;380;520;140" keyTimes="0;0.25;0.5;0.75;1" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1" dur="3.2s" repeatCount="indefinite" />}
            {!reduced && r.rnaPol === 'weak' && <animate attributeName="x" values="140;230;140" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" dur="5s" repeatCount="indefinite" />}
          </text>
        </g>
        {r.rnaPol === 'blocked' && (
          <g>
            <line x1="228" y1="96" x2="258" y2="126" stroke="#DC2626" strokeWidth="4" />
            <line x1="258" y1="96" x2="228" y2="126" stroke="#DC2626" strokeWidth="4" />
          </g>
        )}
        {/* mRNA */}
        <path d={`M 330 200 q 20 -16 40 0 t 40 0 t 40 0 t 40 0 t 40 0 t 40 0`} fill="none" stroke="#7C3AED" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${mrnaLen} 600`} data-testid="mrna" />
        <text x="330" y="226" fontSize="10.5" fill="#6D28D9">mARN lacZYA {pct(r.expression)}</text>
        {/* enzyme */}
        {genes.map((g) => (
          <g key={`e${g.k}`}>
            <rect x={g.x} y="248" width={g.w} height="8" rx="4" fill="#E7E5E4" />
            <rect x={g.x} y="248" width={g.w * (g.k === 'lacZ' ? ezZ : g.k === 'lacY' ? ezY : ezA)} height="8" rx="4" fill="#16A34A" />
            <text x={g.x + g.w / 2} y="272" fontSize="8.5" textAnchor="middle" fill="#57534E">{g.n}</text>
          </g>
        ))}
        <text x="28" y="262" fontSize="10.5" fill="#57534E">Phân giải lactose</text>
        <rect x="28" y="268" width="180" height="8" rx="4" fill="#E7E5E4" />
        <rect x="28" y="268" width={180 * brkE} height="8" rx="4" fill="#2563EB" />
      </svg>
      <div className={`${card} flex flex-col gap-1.5`}>
        <p data-testid="lac-explanation" className="text-xs text-stone-800">{r.explanation}</p>
        <p className="text-[11px] text-stone-500">Kéo qua 4 tổ hợp glucose/lactose và thử các đột biến. Khi có cả hai loại đường, vi khuẩn dùng loại nào trước, và vì sao?</p>
      </div>
    </div>
  );
};

// ====================================================================== BOXPLOT
export const BoxplotEngine: React.FC<Props> = ({blueprint}) => {
  const reduced = usePrefersReducedMotion();
  const input = (blueprint.meta?.input as BoxInput) ?? {kind: 'data', data: [3, 5, 7, 8, 12, 15, 18, 21, 24, 40]};
  const [data, setData] = useState<number[]>(input.kind === 'data' ? input.data : []);
  const [summary, setSummary] = useState(input.kind === 'summary' ? input : null);
  const [draft, setDraft] = useState('');
  const stats = useMemo(() => (summary ? boxStatsFromSummary(summary.min, summary.q1, summary.q2, summary.q3, summary.max) : boxStatsFromData(data)), [data, summary]);
  if (!stats) return <div className="p-4 text-xs text-rose-600">Cần ít nhất 2 giá trị.</div>;
  const sorted = summary ? [] : [...data].sort((a, b) => a - b);
  const lo = Math.min(stats.min, stats.lowFence > stats.min ? stats.min : stats.lowFence);
  const hi = stats.max;
  const pad = Math.max((hi - lo) * 0.08, 1);
  const x0 = lo - pad;
  const x1 = hi + pad;
  const W = 600;
  const sx = (v: number) => 24 + ((v - x0) / (x1 - x0)) * (W - 48);
  const maxVal = summary ? summary.max : sorted[sorted.length - 1];
  const setMax = (v: number) => {
    if (summary) setSummary({...summary, max: Math.max(v, summary.q3)});
    else {
      const idx = data.indexOf(sorted[sorted.length - 1]);
      setData(data.map((d, i) => (i === idx ? v : d)));
    }
  };
  const rows: [string, string][] = [
    ['n', stats.n ? String(stats.n) : '—'],
    ['Min', fmtNum(stats.min, 4)],
    ['Q₁', fmtNum(stats.q1, 4)],
    ['Q₂ (trung vị)', fmtNum(stats.q2, 4)],
    ['Q₃', fmtNum(stats.q3, 4)],
    ['Max', fmtNum(stats.max, 4)],
    ['ΔQ = Q₃ − Q₁', fmtNum(stats.iqr, 4)],
    ['Rào dưới', fmtNum(stats.lowFence, 4)],
    ['Rào trên', fmtNum(stats.highFence, 4)],
    ['Trung bình', stats.mean !== null ? fmtNum(stats.mean, 4) : '—'],
    ['Độ lệch chuẩn', stats.sd !== null ? fmtNum(stats.sd, 4) : '—'],
    ['Ngoại lai', stats.outliers.length ? stats.outliers.map((v) => fmtNum(v, 4)).join('; ') : 'không có'],
  ];
  const addValue = () => {
    const v = parseFloat(draft.replace(',', '.'));
    if (Number.isFinite(v) && !summary) {
      setData([...data, v]);
      setDraft('');
    }
  };
  return (
    <div className="p-4 flex flex-col gap-3" data-testid="boxplot-engine" data-outliers={stats.outliers.length} data-q1={stats.q1} data-q2={stats.q2} data-q3={stats.q3}>
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-mono text-sm font-bold text-stone-900">Biểu đồ hộp – râu</span>
        <span data-testid="boxplot-verdict" className={`ml-auto px-2.5 py-1 rounded-lg text-xs font-semibold border ${stats.outliers.length ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
          {stats.outliers.length ? `Có ${stats.outliers.length} giá trị ngoại lai` : 'Không có giá trị ngoại lai'}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} 190`} className="w-full rounded-xl border border-[#E6E4DD] bg-white" data-testid="boxplot-svg">
        {ticks(x0, x1).map((t) => (
          <g key={t}>
            <line x1={sx(t)} y1="20" x2={sx(t)} y2="150" stroke="#EFECE6" />
            <text x={sx(t)} y="168" fontSize="10" textAnchor="middle" fill="#78716C">{t}</text>
          </g>
        ))}
        <line x1={sx(stats.lowFence)} y1="28" x2={sx(stats.lowFence)} y2="112" stroke="#F59E0B" strokeDasharray="4 3" />
        <line x1={sx(stats.highFence)} y1="28" x2={sx(stats.highFence)} y2="112" stroke="#F59E0B" strokeDasharray="4 3" />
        <line x1={sx(stats.whiskerLow)} y1="70" x2={sx(stats.q1)} y2="70" stroke="#18181B" strokeWidth="2" />
        <line x1={sx(stats.q3)} y1="70" x2={sx(stats.whiskerHigh)} y2="70" stroke="#18181B" strokeWidth="2" />
        <line x1={sx(stats.whiskerLow)} y1="56" x2={sx(stats.whiskerLow)} y2="84" stroke="#18181B" strokeWidth="2" />
        <line x1={sx(stats.whiskerHigh)} y1="56" x2={sx(stats.whiskerHigh)} y2="84" stroke="#18181B" strokeWidth="2" />
        <rect data-testid="box" x={sx(stats.q1)} y="42" width={Math.max(sx(stats.q3) - sx(stats.q1), 1)} height="56" fill="#BFDBFE" stroke="#1D4ED8" strokeWidth="2.2" />
        <line x1={sx(stats.q2)} y1="42" x2={sx(stats.q2)} y2="98" stroke="#DC2626" strokeWidth="3.4" />
        {[['Q₁', stats.q1], ['Q₂', stats.q2], ['Q₃', stats.q3]].map(([k, v]) => (
          <text key={String(k)} x={sx(v as number)} y="36" fontSize="10.5" textAnchor="middle" fill="#1E3A8A" fontWeight="700">{k}</text>
        ))}
        {stats.outliers.map((o, i) => (
          <g key={i} data-testid="outlier">
            <circle cx={sx(o)} cy="70" r="6" fill="#E11D48" stroke="#fff" strokeWidth="1.5">
              {!reduced && <animate attributeName="r" values="6;8.5;6" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" dur="1.2s" repeatCount="indefinite" />}
            </circle>
            <text x={sx(o)} y="56" fontSize="10" textAnchor="middle" fill="#BE123C" fontWeight="700">{fmtNum(o, 4)}</text>
          </g>
        ))}
        {sorted.map((v, i) => {
          const out = v < stats.lowFence || v > stats.highFence;
          return <circle key={i} cx={sx(v)} cy={124 + (i % 3) * 7} r="3.2" fill={out ? '#E11D48' : '#2563EB'} opacity="0.75" />;
        })}
      </svg>
      <div className="grid md:grid-cols-[1fr_1fr] gap-3">
        <div className={`${card} flex flex-col gap-2`}>
          <Slider testid="boxplot-max" label="Kéo giá trị lớn nhất" value={maxVal} min={Math.floor(stats.q3)} max={Math.ceil(stats.q3 + Math.max(stats.iqr, 1) * 6)} step={Math.max(stats.iqr / 40, 0.1)} onChange={setMax} fmt={(v) => fmtNum(v, 4)} />
          <p className="text-[11px] text-stone-500">Kéo qua rào trên ({fmtNum(stats.highFence, 4)}): điểm hóa đỏ vì &gt; Q₃ + 1,5ΔQ. Hộp và trung vị đổi thế nào? Trung bình thì sao?</p>
          {!summary && (
            <div className="flex items-center gap-2">
              <input data-testid="boxplot-input" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addValue()} placeholder="Thêm giá trị" className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#DCD9D0] text-xs bg-white" />
              <button data-testid="boxplot-add" onClick={addValue} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold">Thêm</button>
            </div>
          )}
          {!summary && (
            <div className="flex flex-wrap gap-1">
              {sorted.map((v, i) => (
                <button key={i} onClick={() => setData(data.filter((_, k) => k !== data.indexOf(v)))} title="Bấm để xóa" className="px-1.5 py-0.5 rounded bg-white border border-[#E6E4DD] text-[11px] font-mono hover:bg-rose-50">
                  {fmtNum(v, 4)}
                </button>
              ))}
            </div>
          )}
        </div>
        <table className="w-full text-xs font-mono rounded-xl border border-[#E6E4DD] bg-white overflow-hidden" data-testid="boxplot-table">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-b border-[#F0EEE8] last:border-0">
                <td className="px-3 py-1 text-stone-500">{k}</td>
                <td className="px-3 py-1 text-right font-bold text-stone-900">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ====================================================================== BẢNG BIẾN THIÊN → ĐỒ THỊ
const ARROW = {'+': '↗', '-': '↘'} as const;

export const VariationTableEngine: React.FC<Props> = ({blueprint}) => {
  const init = (blueprint.meta?.table as VariationTable) ?? {points: [{x: -1, y: 3}, {x: 1, y: -1}], leftDir: 'up'};
  const [table, setTable] = useState<VariationTable>(init);
  const [x0, setX0] = useState(0);
  const err = validateTable(table);
  const signs = err ? [] : signsOf(table);
  const kinds = err ? [] : kindsOf(table);
  const f = useMemo(() => (err ? null : functionFromTable(table)), [table, err]);
  const xs = table.points.map((p) => p.x);
  const xMin = Math.min(...xs) - Math.max(2, (Math.max(...xs) - Math.min(...xs)) * 0.5);
  const xMax = Math.max(...xs) + Math.max(2, (Math.max(...xs) - Math.min(...xs)) * 0.5);
  const samples = useMemo(() => (f ? Array.from({length: 241}, (_, i) => {
    const x = xMin + ((xMax - xMin) * i) / 240;
    return {x, y: f(x)};
  }) : []), [f, xMin, xMax]);
  const ys = table.points.map((p) => p.y);
  const yLo = Math.min(...ys) - Math.max(1.5, (Math.max(...ys) - Math.min(...ys)) * 0.45);
  const yHi = Math.max(...ys) + Math.max(1.5, (Math.max(...ys) - Math.min(...ys)) * 0.45);
  const W = 560;
  const H = 320;
  const sx = (x: number) => 30 + ((x - xMin) / (xMax - xMin)) * (W - 50);
  const sy = (y: number) => H - 24 - ((y - yLo) / (yHi - yLo)) * (H - 44);
  const slope = f ? (f(x0 + 1e-4) - f(x0 - 1e-4)) / 2e-4 : 0;
  const tx0 = f ? f(x0) : 0;
  const upd = (i: number, k: 'x' | 'y', v: number) => setTable({...table, points: table.points.map((p, j) => (j === i ? {...p, [k]: v} : p))});
  const addPoint = () => {
    const last = table.points[table.points.length - 1];
    const prev = table.points[table.points.length - 2];
    const dy = prev ? last.y - prev.y : 2;
    setTable({...table, points: [...table.points, {x: last.x + 2, y: last.y - dy}]});
  };
  const cell = 'px-2 py-1.5 text-center border border-[#E5E3DC]';
  const inp = 'w-14 text-center bg-white border border-[#DCD9D0] rounded px-1 py-0.5 text-xs font-mono';
  return (
    <div className="p-4 flex flex-col gap-3" data-testid="variation-engine" data-valid={!err} data-kinds={kinds.join(',')} data-signs={signs.join('')}>
      <div className="overflow-x-auto rounded-xl border border-[#E6E4DD] bg-white">
        <table className="w-full text-xs font-mono border-collapse" data-testid="variation-table">
          <tbody>
            <tr>
              <th className={`${cell} bg-stone-100 w-12`}>x</th>
              <td className={cell}>−∞</td>
              {table.points.map((p, i) => (
                <React.Fragment key={i}>
                  <td className={cell}>
                    <input data-testid={`vt-x-${i}`} type="number" step="0.5" value={p.x} onChange={(e) => upd(i, 'x', parseFloat(e.target.value))} className={inp} />
                  </td>
                  <td className={cell}>{i < table.points.length - 1 ? '' : '+∞'}</td>
                </React.Fragment>
              ))}
            </tr>
            <tr>
              <th className={`${cell} bg-stone-100`}>y′</th>
              <td className={`${cell} font-bold`}>{signs[0] ?? ''}</td>
              {table.points.map((_, i) => (
                <React.Fragment key={i}>
                  <td className={cell}>0</td>
                  <td className={`${cell} font-bold`}>{signs[i + 1] ?? ''}</td>
                </React.Fragment>
              ))}
            </tr>
            <tr>
              <th className={`${cell} bg-stone-100`}>y</th>
              <td className={`${cell} text-lg`}>{signs[0] ? ARROW[signs[0] as '+' | '-'] : ''}</td>
              {table.points.map((p, i) => (
                <React.Fragment key={i}>
                  <td className={cell}>
                    <input data-testid={`vt-y-${i}`} type="number" step="0.5" value={p.y} onChange={(e) => upd(i, 'y', parseFloat(e.target.value))} className={inp} />
                    <div className={`text-[10px] font-bold ${kinds[i] === 'max' ? 'text-rose-600' : 'text-blue-600'}`}>{kinds[i] === 'max' ? 'cực đại' : kinds[i] === 'min' ? 'cực tiểu' : ''}</div>
                  </td>
                  <td className={`${cell} text-lg`}>{signs[i + 1] ? ARROW[signs[i + 1] as '+' | '-'] : ''}</td>
                </React.Fragment>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button data-testid="vt-add" onClick={addPoint} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold">+ Thêm cực trị</button>
        <button data-testid="vt-remove" onClick={() => table.points.length > 1 && setTable({...table, points: table.points.slice(0, -1)})} disabled={table.points.length <= 1} className="px-3 py-1.5 rounded-lg border border-[#DCD9D0] bg-white text-xs disabled:opacity-40">− Bớt điểm cuối</button>
        <button data-testid="vt-flip" onClick={() => setTable({...table, leftDir: table.leftDir === 'up' ? 'down' : 'up'})} className="px-3 py-1.5 rounded-lg border border-[#DCD9D0] bg-white text-xs">Đổi chiều biến thiên đầu: {table.leftDir === 'up' ? '↗ đồng biến' : '↘ nghịch biến'}</button>
        {err && <span data-testid="vt-error" className="text-xs text-rose-700">{err}</span>}
      </div>
      {f && (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl border border-[#E6E4DD] bg-white" data-testid="variation-graph">
          {ticks(xMin, xMax, 10).map((t) => (
            <g key={`x${t}`}>
              <line x1={sx(t)} y1="8" x2={sx(t)} y2={H - 24} stroke={t === 0 ? '#57534E' : '#EFECE6'} strokeWidth={t === 0 ? 1.5 : 1} />
              <text x={sx(t)} y={H - 8} fontSize="10" textAnchor="middle" fill="#78716C">{t}</text>
            </g>
          ))}
          {ticks(yLo, yHi, 8).map((t) => (
            <g key={`y${t}`}>
              <line x1="30" y1={sy(t)} x2={W - 20} y2={sy(t)} stroke={t === 0 ? '#57534E' : '#EFECE6'} strokeWidth={t === 0 ? 1.5 : 1} />
              <text x="26" y={sy(t) + 3} fontSize="10" textAnchor="end" fill="#78716C">{t}</text>
            </g>
          ))}
          <path data-testid="variation-curve" d={samples.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(Math.max(yLo - 5, Math.min(yHi + 5, p.y))).toFixed(1)}`).join(' ')} fill="none" stroke="#2563EB" strokeWidth="2.6" />
          {Math.abs(slope) < 1e3 && (
            <line x1={sx(x0 - 1.5)} y1={sy(tx0 - 1.5 * slope)} x2={sx(x0 + 1.5)} y2={sy(tx0 + 1.5 * slope)} stroke="#E11D48" strokeWidth="2" strokeDasharray="6 4" data-testid="variation-tangent" />
          )}
          <circle cx={sx(x0)} cy={sy(tx0)} r="4.5" fill="#E11D48" />
          {table.points.map((p, i) => (
            <g key={i}>
              <circle cx={sx(p.x)} cy={sy(p.y)} r="6" fill="#fff" stroke={kinds[i] === 'max' ? '#E11D48' : '#1D4ED8'} strokeWidth="2.5" />
              <text x={sx(p.x) + 9} y={sy(p.y) + (kinds[i] === 'max' ? -9 : 17)} fontSize="11" fontWeight="700" fill="#18181B">({fmtNum(p.x, 3)} ; {fmtNum(p.y, 3)})</text>
            </g>
          ))}
        </svg>
      )}
      <div className={`${card} flex flex-col gap-1.5`}>
        <Slider testid="vt-x0" label="Tiếp tuyến tại x₀" value={x0} min={xMin} max={xMax} step={(xMax - xMin) / 300} onChange={setX0} fmt={(v) => fmtNum(v, 3)} />
        <p data-testid="vt-slope" className="text-xs font-mono text-stone-700">Hệ số góc k = f′(x₀) ≈ {fmtNum(Math.abs(slope) < 1e-3 ? 0 : slope, 3)} {Math.abs(slope) < 1e-2 ? '→ tiếp tuyến nằm ngang' : slope > 0 ? '→ hàm đồng biến tại đây' : '→ hàm nghịch biến tại đây'}</p>
        <p className="text-[11px] text-stone-500">Đồ thị được dựng sao cho đi qua các điểm cực trị với f′ = 0 và đơn điệu giữa chúng; hai nhánh ngoài là gợi ý hình dạng, không phải công thức duy nhất.</p>
      </div>
    </div>
  );
};
