'use client';

import React, {useMemo, useState} from 'react';
import {SimulationBlueprint, CurriculumLevel} from '@socratic/types';
import {fmtNum, compileExpr} from '../utils/mathExpr';
import {defaultParam} from '../utils/graphModel';
import {punnett, hardyWeinberg, parseLP, solveLP, cobweb, parseRecurrence, type GenotypeFreqs} from '../utils/stemModels';

interface Props {
  blueprint: SimulationBlueprint;
  params?: Record<string, number>;
  curriculumLevel?: CurriculumLevel;
}

const PALETTE = ['#2563EB', '#E11D48', '#059669', '#D97706', '#7C3AED', '#0891B2', '#DB2777', '#4D7C0F'];
const pct = (v: number) => `${fmtNum(v * 100, 3)}%`;

const Slider: React.FC<{label: React.ReactNode; value: number; min: number; max: number; step: number; onChange: (v: number) => void; testid: string; fmt?: (v: number) => string}> = ({label, value, min, max, step, onChange, testid, fmt}) => (
  <label className="flex items-center gap-3 text-xs text-stone-700">
    <span className="w-28 shrink-0 font-medium">{label}</span>
    <input data-testid={testid} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="flex-1 h-3 accent-blue-600 cursor-pointer" />
    <span className="w-16 text-right font-mono tabular-nums text-blue-600 font-bold">{fmt ? fmt(value) : fmtNum(value, 3)}</span>
  </label>
);

// ====================================================================== PUNNETT
export const PunnettEngine: React.FC<Props> = ({blueprint}) => {
  const cross = (blueprint.meta?.cross as {p1: string; p2: string}) ?? {p1: 'AaBb', p2: 'AaBb'};
  const [f, setF] = useState(0.5);
  const [pick, setPick] = useState<string | null>(null);
  const res = useMemo(() => punnett(cross.p1, cross.p2, f), [cross.p1, cross.p2, f]);
  if (!res) return <div className="p-4 text-xs text-rose-600">Không đọc được phép lai.</div>;
  const colorOf = new Map(res.phenotypes.map((x, i) => [x.phenotype, PALETTE[i % PALETTE.length]]));
  const big = res.cells.length > 4;
  const cell = big ? 'px-1 py-1 text-[10px]' : 'px-3 py-2 text-xs';
  return (
    <div className="p-4 flex flex-col gap-3" data-testid="punnett-engine" data-ratio={res.ratio ?? ''} data-cells={res.cells.flat().length}>
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-mono text-sm font-bold text-stone-900">P: {cross.p1} × {cross.p2}</span>
        <span className="text-xs text-stone-500">{res.gametes1.length} loại giao tử × {res.gametes2.length} loại giao tử → {res.cells.flat().length} ô</span>
        <span data-testid="punnett-ratio" className="ml-auto font-mono text-sm font-bold text-blue-700">Tỉ lệ kiểu hình {res.ratio ?? res.phenotypes.map((x) => pct(x.p)).join(' : ')}</span>
      </div>

      <div className="overflow-auto rounded-xl border border-[#E6E4DD] bg-white">
        <table className="border-collapse w-full text-center font-mono" data-testid="punnett-table">
          <thead>
            <tr>
              <th className={`${cell} bg-stone-100 text-stone-400`}>♀＼♂</th>
              {res.gametes1.map((g, i) => (
                <th key={i} className={`${cell} bg-stone-100 text-stone-800 font-bold`}>
                  {g.alleles}
                  {Math.abs(g.p - 1 / res.gametes1.length) > 1e-9 && <span className="block text-[9px] text-stone-500">{pct(g.p)}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {res.cells.map((row, r) => (
              <tr key={r}>
                <th className={`${cell} bg-stone-100 text-stone-800 font-bold`}>
                  {res.gametes2[r].alleles}
                  {Math.abs(res.gametes2[r].p - 1 / res.gametes2.length) > 1e-9 && <span className="block text-[9px] text-stone-500">{pct(res.gametes2[r].p)}</span>}
                </th>
                {row.map((c, k) => {
                  const on = !pick || pick === c.phenotype;
                  return (
                    <td
                      key={k}
                      data-phenotype={c.phenotype}
                      onClick={() => setPick(pick === c.phenotype ? null : c.phenotype)}
                      className={`${cell} border border-white cursor-pointer transition-opacity ${on ? 'opacity-100' : 'opacity-20'}`}
                      style={{background: `${colorOf.get(c.phenotype)}22`, color: colorOf.get(c.phenotype)}}
                      title={`${c.genotype} · ${pct(c.p)}`}
                    >
                      <span className="font-bold">{c.genotype}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2" data-testid="punnett-phenotypes">
        {res.phenotypes.map((x) => (
          <button
            key={x.phenotype}
            onClick={() => setPick(pick === x.phenotype ? null : x.phenotype)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-mono transition ${pick === x.phenotype ? 'ring-2 ring-offset-1' : ''}`}
            style={{borderColor: colorOf.get(x.phenotype), color: colorOf.get(x.phenotype), background: `${colorOf.get(x.phenotype)}14`}}
          >
            <b>{x.phenotype}</b> · {pct(x.p)}
          </button>
        ))}
        <span className="text-[11px] text-stone-500 self-center">Chạm một kiểu hình để gộp các ô đồng kiểu hình.</span>
      </div>

      <div className="text-[11px] text-stone-600 font-mono" data-testid="punnett-genotypes">
        Kiểu gen: {res.genotypes.map((x) => `${x.genotype} ${pct(x.p)}`).join(' · ')}
      </div>

      {res.linkageAdjustable && (
        <div className="rounded-xl bg-[#F4F3EE] border border-[#E5E3DC] p-3">
          <Slider testid="punnett-f" label="Tần số hoán vị f" value={f} min={0} max={0.5} step={0.01} onChange={setF} fmt={(v) => `${Math.round(v * 100)}%`} />
          <p className="text-[11px] text-stone-500 mt-1">f = 50%: phân li độc lập (9:3:3:1). f = 0%: liên kết gen hoàn toàn. Giữa hai giá trị: hoán vị gen.</p>
        </div>
      )}
    </div>
  );
};

// ====================================================================== HARDY–WEINBERG
export const HardyWeinbergEngine: React.FC<Props> = ({blueprint}) => {
  const obs = (blueprint.meta?.freqs as GenotypeFreqs) ?? {AA: 0.04, Aa: 0.32, aa: 0.64};
  const hw = useMemo(() => hardyWeinberg(obs), [obs]);
  const [p, setP] = useState(hw.p);
  const W = 560;
  const H = 300;
  const L = 44;
  const B = 34;
  const T = 14;
  const R = 16;
  const sx = (x: number) => L + x * (W - L - R);
  const sy = (y: number) => H - B - y * (H - B - T);
  const curve = (fn: (x: number) => number) => Array.from({length: 101}, (_, i) => `${i ? 'L' : 'M'}${sx(i / 100).toFixed(1)},${sy(fn(i / 100)).toFixed(1)}`).join(' ');
  const q = 1 - p;
  const cur = {AA: p * p, Aa: 2 * p * q, aa: q * q};
  const cols = {AA: '#2563EB', Aa: '#7C3AED', aa: '#E11D48'};
  const rows: [keyof GenotypeFreqs, string][] = [['AA', 'p²'], ['Aa', '2pq'], ['aa', 'q²']];
  return (
    <div className="p-4 flex flex-col gap-3" data-testid="hw-engine" data-p={fmtNum(hw.p, 4)} data-equilibrium={hw.equilibrium}>
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-mono text-sm font-bold text-stone-900">p(A) = {fmtNum(hw.p, 3)} · q(a) = {fmtNum(hw.q, 3)}</span>
        <span data-testid="hw-verdict" className={`ml-auto px-2.5 py-1 rounded-lg text-xs font-semibold ${hw.equilibrium ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
          {hw.equilibrium ? 'Quần thể đang cân bằng Hardy–Weinberg' : `Chưa cân bằng (lệch tối đa ${pct(hw.maxDev)}) — sau 1 thế hệ ngẫu phối sẽ về p², 2pq, q²`}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl border border-[#E6E4DD] bg-white" data-testid="hw-chart">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={sx(t)} y1={sy(0)} x2={sx(t)} y2={sy(1)} stroke="#EFECE6" />
            <line x1={sx(0)} y1={sy(t)} x2={sx(1)} y2={sy(t)} stroke="#EFECE6" />
            <text x={sx(t)} y={H - 14} fontSize="10" textAnchor="middle" fill="#78716C">{t}</text>
            <text x={L - 6} y={sy(t) + 3} fontSize="10" textAnchor="end" fill="#78716C">{t}</text>
          </g>
        ))}
        <text x={sx(0.5)} y={H - 2} fontSize="11" textAnchor="middle" fill="#57534E">tần số alen p(A)</text>
        <path d={curve((x) => x * x)} fill="none" stroke={cols.AA} strokeWidth="2.2" />
        <path d={curve((x) => 2 * x * (1 - x))} fill="none" stroke={cols.Aa} strokeWidth="2.2" />
        <path d={curve((x) => (1 - x) * (1 - x))} fill="none" stroke={cols.aa} strokeWidth="2.2" />
        <text x={sx(0.9)} y={sy(0.82) - 6} fontSize="11" fill={cols.AA} fontWeight="700">AA = p²</text>
        <text x={sx(0.5) + 6} y={sy(0.5) - 8} fontSize="11" fill={cols.Aa} fontWeight="700">Aa = 2pq</text>
        <text x={sx(0.02)} y={sy(0.97)} fontSize="11" fill={cols.aa} fontWeight="700">aa = q²</text>
        <line x1={sx(p)} y1={sy(0)} x2={sx(p)} y2={sy(1)} stroke="#18181B" strokeDasharray="4 3" />
        {rows.map(([k]) => (
          <circle key={k} cx={sx(p)} cy={sy(cur[k])} r="5" fill="#fff" stroke={cols[k]} strokeWidth="2.5" />
        ))}
        {rows.map(([k]) => (
          <rect key={`o${k}`} x={sx(hw.p) - 5} y={sy(obs[k]) - 5} width="10" height="10" transform={`rotate(45 ${sx(hw.p)} ${sy(obs[k])})`} fill={cols[k]} opacity="0.85" />
        ))}
      </svg>
      <div className="rounded-xl bg-[#F4F3EE] border border-[#E5E3DC] p-3 flex flex-col gap-2">
        <Slider testid="hw-p" label="Tần số alen p(A)" value={p} min={0} max={1} step={0.01} onChange={setP} />
        <table className="w-full text-xs font-mono text-center" data-testid="hw-table">
          <thead>
            <tr className="text-stone-500">
              <th className="text-left">Kiểu gen</th>
              <th>Quan sát (◆)</th>
              <th>Kỳ vọng tại p (○)</th>
              <th>Kỳ vọng tại p quan sát</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([k, f]) => (
              <tr key={k}>
                <td className="text-left font-bold" style={{color: cols[k]}}>{k} = {f}</td>
                <td>{fmtNum(obs[k], 3)}</td>
                <td>{fmtNum(cur[k], 3)}</td>
                <td>{fmtNum(hw.exp[k], 3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[11px] text-stone-500">◆ là số liệu giáo viên viết; ○ chạy theo thanh trượt. Cân bằng khi ◆ nằm trên đường cong tương ứng.</p>
      </div>
    </div>
  );
};

// ====================================================================== QUY HOẠCH TUYẾN TÍNH
const coef = (v: number, name: string, first: boolean) => {
  if (Math.abs(v) < 1e-12) return '';
  const mag = Math.abs(v) === 1 ? '' : fmtNum(Math.abs(v), 3);
  return `${v < 0 ? (first ? '−' : ' − ') : first ? '' : ' + '}${mag}${name}`;
};
const fmtConstraint = (k: {a: number; b: number; c: number; op: string}) => {
  const lhs = coef(k.a, 'x', true) + coef(k.b, 'y', !coef(k.a, 'x', true));
  return `${lhs} ${k.op === '<=' ? '≤' : k.op === '>=' ? '≥' : '='} ${fmtNum(k.c, 3)}`;
};
export const LinearProgrammingEngine: React.FC<Props> = ({blueprint}) => {
  const text = blueprint.expressions?.[0] ?? '';
  const pb = useMemo(() => parseLP(text), [text]);
  const sol = useMemo(() => (pb ? solveLP(pb) : null), [pb]);
  const [level, setLevel] = useState<number | null>(null);
  if (!pb || !sol) return <div className="p-4 text-xs text-rose-600">Không đọc được hệ bất phương trình.</div>;
  const obj = pb.objective;
  const W = 600;
  const H = 400;
  const {xMin, xMax, yMin, yMax} = sol.bounds;
  const sx = (x: number) => ((x - xMin) / (xMax - xMin)) * W;
  const sy = (y: number) => H - ((y - yMin) / (yMax - yMin)) * H;
  /** cắt đường thẳng ax+by=c bởi khung nhìn */
  const segment = (a: number, b: number, c: number) => {
    const pts: [number, number][] = [];
    if (Math.abs(b) > 1e-12) {
      for (const x of [xMin, xMax]) {
        const y = (c - a * x) / b;
        if (y >= yMin - 1e-9 && y <= yMax + 1e-9) pts.push([x, y]);
      }
    }
    if (Math.abs(a) > 1e-12) {
      for (const y of [yMin, yMax]) {
        const x = (c - b * y) / a;
        if (x >= xMin - 1e-9 && x <= xMax + 1e-9) pts.push([x, y]);
      }
    }
    return pts.length >= 2 ? [pts[0], pts[pts.length - 1]] : null;
  };
  const vals = sol.vertices.map((v) => v.value).filter((v): v is number => v !== null);
  const vmin = vals.length ? Math.min(...vals) : 0;
  const vmax = vals.length ? Math.max(...vals) : 1;
  const span = Math.max(vmax - vmin, 1);
  const c0 = level ?? sol.best?.value ?? (vmin + vmax) / 2;
  const polyPts = (() => {
    const vs = [...sol.vertices];
    if (vs.length < 3) return vs;
    const cx = vs.reduce((s, v) => s + v.x, 0) / vs.length;
    const cy = vs.reduce((s, v) => s + v.y, 0) / vs.length;
    return vs.sort((u, v) => Math.atan2(u.y - cy, u.x - cx) - Math.atan2(v.y - cy, v.x - cx));
  })();
  const tick = (lo: number, hi: number) => {
    const raw = (hi - lo) / 8;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
    const out: number[] = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(+v.toFixed(10));
    return out;
  };
  const lvl = obj ? segment(obj.a, obj.b, c0 - obj.c0) : null;
  return (
    <div className="p-4 flex flex-col gap-3" data-testid="lp-engine" data-feasible={sol.feasible} data-unbounded={sol.unbounded} data-best={sol.best ? `${fmtNum(sol.best.x, 3)},${fmtNum(sol.best.y, 3)},${fmtNum(sol.best.value, 3)}` : ''} data-vertices={sol.vertices.length}>
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-mono text-sm font-bold text-stone-900">Quy hoạch tuyến tính · {pb.constraints.length} ràng buộc</span>
        <span data-testid="lp-verdict" className="ml-auto text-xs font-semibold text-stone-800">
          {!sol.feasible
            ? 'Miền nghiệm rỗng (hệ vô nghiệm)'
            : obj && sol.best
              ? `${obj.sense === 'max' ? 'Giá trị lớn nhất' : 'Giá trị nhỏ nhất'} F = ${fmtNum(sol.best.value, 3)} tại (${fmtNum(sol.best.x, 3)} ; ${fmtNum(sol.best.y, 3)})`
              : obj && sol.unbounded
                ? `Miền không bị chặn: F không có ${obj.sense === 'max' ? 'giá trị lớn nhất' : 'giá trị nhỏ nhất'}`
                : sol.unbounded
                  ? 'Miền nghiệm không bị chặn'
                  : 'Miền nghiệm là đa giác lồi'}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl border border-[#E6E4DD] bg-white" data-testid="lp-chart">
        {tick(xMin, xMax).map((v) => (
          <g key={`x${v}`}>
            <line x1={sx(v)} y1={0} x2={sx(v)} y2={H} stroke={v === 0 ? '#57534E' : '#EFECE6'} strokeWidth={v === 0 ? 1.5 : 1} />
            <text x={sx(v) + 2} y={Math.min(H - 3, Math.max(11, sy(0) + 12))} fontSize="10" fill="#78716C">{v}</text>
          </g>
        ))}
        {tick(yMin, yMax).map((v) => (
          <g key={`y${v}`}>
            <line x1={0} y1={sy(v)} x2={W} y2={sy(v)} stroke={v === 0 ? '#57534E' : '#EFECE6'} strokeWidth={v === 0 ? 1.5 : 1} />
            <text x={Math.min(W - 24, Math.max(2, sx(0) + 3))} y={sy(v) - 2} fontSize="10" fill="#78716C">{v}</text>
          </g>
        ))}
        {polyPts.length >= 3 && <polygon data-testid="lp-region" points={polyPts.map((v) => `${sx(v.x)},${sy(v.y)}`).join(' ')} fill="#2563EB" fillOpacity="0.14" stroke="#2563EB" strokeWidth="1.5" />}
        {pb.constraints.map((k, i) => {
          const s = segment(k.a, k.b, k.c);
          return s ? <line key={i} x1={sx(s[0][0])} y1={sy(s[0][1])} x2={sx(s[1][0])} y2={sy(s[1][1])} stroke={PALETTE[i % PALETTE.length]} strokeWidth="1.8" opacity="0.8" /> : null;
        })}
        {lvl && <line data-testid="lp-level" x1={sx(lvl[0][0])} y1={sy(lvl[0][1])} x2={sx(lvl[1][0])} y2={sy(lvl[1][1])} stroke="#E11D48" strokeWidth="2.4" strokeDasharray="6 4" />}
        {sol.vertices.map((v, i) => {
          const best = sol.best && Math.abs(v.x - sol.best.x) < 1e-6 && Math.abs(v.y - sol.best.y) < 1e-6;
          return (
            <g key={i}>
              <circle cx={sx(v.x)} cy={sy(v.y)} r={best ? 7 : 4.5} fill={best ? '#E11D48' : '#fff'} stroke={best ? '#E11D48' : '#1D4ED8'} strokeWidth="2" />
              <text x={sx(v.x) + 8} y={sy(v.y) - 8} fontSize="10.5" fill="#18181B" fontWeight={best ? 700 : 500}>
                ({fmtNum(v.x, 2)} ; {fmtNum(v.y, 2)}){v.value !== null ? ` F=${fmtNum(v.value, 2)}` : ''}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="rounded-xl bg-[#F4F3EE] border border-[#E5E3DC] p-3 flex flex-col gap-2">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-mono text-stone-700">
          {pb.constraints.map((k, i) => (
            <span key={i} style={{color: PALETTE[i % PALETTE.length]}}>
              {fmtConstraint(k)}
            </span>
          ))}
        </div>
        {obj && (
          <Slider
            testid="lp-level-slider"
            label={`Đường mức F = ${fmtNum(obj.a, 2)}x + ${fmtNum(obj.b, 2)}y`}
            value={c0}
            min={vmin - span * 0.4}
            max={vmax + span * 0.4}
            step={span / 200}
            onChange={setLevel}
            fmt={(v) => fmtNum(v, 3)}
          />
        )}
        {obj && <p className="text-[11px] text-stone-500">Kéo đường mức: giá trị tối ưu đạt tại đỉnh cuối cùng mà đường mức còn chạm miền nghiệm.</p>}
      </div>
    </div>
  );
};

// ====================================================================== MẠNG NHỆN
export const CobwebEngine: React.FC<Props> = ({blueprint}) => {
  const rec = (blueprint.meta?.recurrence as {expr: string; params: string[]; name?: string}) ?? (parseRecurrence(blueprint.expressions?.[0] ?? '') ?? {expr: 'x', params: []});
  const [pv, setPv] = useState<Record<string, number>>(() => {
    const o: Record<string, number> = {};
    for (const k of rec.params) o[k] = k === 'r' ? 2.8 : defaultParam(k).value;
    return o;
  });
  const [x0, setX0] = useState(0.2);
  const res = useMemo(() => cobweb(rec.expr, pv, x0, 60), [rec.expr, pv, x0]);
  const W = 460;
  const H = 400;
  // khung nhìn: [0,1] nếu hàm giữ [0,1] trong [0,1]; ngược lại bám quỹ đạo
  const {lo, hi, evalF} = useMemo(() => {
    const ev = (x: number) => cobwebEval(rec.expr, pv, x);
    const ys = Array.from({length: 51}, (_, i) => ev(i / 50));
    const inUnit = ys.every((y) => Number.isFinite(y) && y >= -0.05 && y <= 1.05);
    if (inUnit) return {lo: 0, hi: 1, evalF: ev};
    const pts = [...res.orbit.slice(0, 30).filter((v) => Math.abs(v) < 1e6), ...res.fixedPoints.map((p) => p.x), x0, 0];
    const a = Math.min(...pts);
    const b = Math.max(...pts);
    const pad = Math.max(0.2, (b - a) * 0.15);
    return {lo: a - pad, hi: b + pad, evalF: ev};
  }, [rec.expr, pv, res, x0]);
  const sx = (x: number) => 36 + ((x - lo) / (hi - lo)) * (W - 48);
  const sy = (y: number) => H - 30 - ((y - lo) / (hi - lo)) * (H - 44);
  const curve = Array.from({length: 201}, (_, i) => {
    const x = lo + ((hi - lo) * i) / 200;
    const y = evalF(x);
    return Number.isFinite(y) && y >= lo - (hi - lo) && y <= hi + (hi - lo) ? `${i ? 'L' : 'M'}${sx(x).toFixed(1)},${sy(y).toFixed(1)}` : '';
  }).join(' ');
  const label: Record<string, string> = {
    converges: `Hội tụ về ${res.limit !== null ? fmtNum(res.limit, 5) : ''}`,
    periodic: `Dao động chu kỳ ${res.period}`,
    chaotic: 'Hỗn loạn: không hội tụ, không có chu kỳ',
    diverges: 'Phân kỳ ra vô cực',
  };
  const tone = res.behavior === 'converges' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : res.behavior === 'periodic' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200';
  const tail = res.orbit.slice(0, 40);
  const tmin = Math.min(...tail.filter(Number.isFinite), lo);
  const tmax = Math.max(...tail.filter(Number.isFinite), hi);
  return (
    <div className="p-4 flex flex-col gap-3" data-testid="cobweb-engine" data-behavior={res.behavior} data-period={res.period ?? ''} data-limit={res.limit !== null ? fmtNum(res.limit, 5) : ''}>
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-mono text-sm font-bold text-stone-900">{rec.name ?? 'x'}ₙ₊₁ = f({rec.name ?? 'x'}ₙ)</span>
        <span data-testid="cobweb-verdict" className={`ml-auto px-2.5 py-1 rounded-lg text-xs font-semibold border ${tone}`}>{label[res.behavior]}</span>
      </div>
      <div className="grid md:grid-cols-[3fr_2fr] gap-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl border border-[#E6E4DD] bg-white" data-testid="cobweb-chart">
          <line x1={sx(lo)} y1={sy(lo)} x2={sx(hi)} y2={sy(hi)} stroke="#A8A29E" strokeDasharray="5 4" />
          <line x1={sx(lo)} y1={sy(lo)} x2={sx(hi)} y2={sy(lo)} stroke="#57534E" />
          <line x1={sx(lo)} y1={sy(lo)} x2={sx(lo)} y2={sy(hi)} stroke="#57534E" />
          <text x={sx(hi) - 4} y={sy(hi) + 12} fontSize="10" textAnchor="end" fill="#78716C">y = x</text>
          <path d={curve} fill="none" stroke="#2563EB" strokeWidth="2.4" />
          <polyline data-testid="cobweb-path" points={res.path.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')} fill="none" stroke="#E11D48" strokeWidth="1.3" opacity="0.85" />
          {res.fixedPoints.map((p, i) => (
            <circle key={i} cx={sx(p.x)} cy={sy(p.x)} r="5.5" fill={p.stable ? '#059669' : '#fff'} stroke={p.stable ? '#059669' : '#E11D48'} strokeWidth="2.2">
              <title>{`x* = ${fmtNum(p.x, 4)} (${p.stable ? 'ổn định' : 'không ổn định'}, f′ = ${fmtNum(p.slope, 3)})`}</title>
            </circle>
          ))}
          <circle cx={sx(x0)} cy={sy(lo)} r="4" fill="#18181B" />
        </svg>
        <svg viewBox="0 0 300 240" className="w-full rounded-xl border border-[#E6E4DD] bg-white" data-testid="cobweb-series">
          <text x="8" y="14" fontSize="10" fill="#78716C">xₙ theo n</text>
          {tail.map((v, i) => {
            const y = 220 - ((Math.max(tmin, Math.min(tmax, v)) - tmin) / Math.max(tmax - tmin, 1e-9)) * 190;
            const x = 12 + (i / (tail.length - 1)) * 276;
            const prev = i ? 220 - ((Math.max(tmin, Math.min(tmax, tail[i - 1])) - tmin) / Math.max(tmax - tmin, 1e-9)) * 190 : y;
            const px = 12 + ((i - 1) / (tail.length - 1)) * 276;
            return (
              <g key={i}>
                {i > 0 && <line x1={px} y1={prev} x2={x} y2={y} stroke="#2563EB" strokeWidth="1.2" />}
                <circle cx={x} cy={y} r="2.4" fill="#2563EB" />
              </g>
            );
          })}
        </svg>
      </div>
      <div className="rounded-xl bg-[#F4F3EE] border border-[#E5E3DC] p-3 flex flex-col gap-2">
        {rec.params.map((k) => {
          const d = defaultParam(k);
          const rng = k === 'r' ? {min: 0, max: 4, step: 0.01} : {min: d.min, max: d.max, step: d.step};
          return <Slider key={k} testid={`cobweb-param-${k}`} label={k} value={pv[k] ?? d.value} min={rng.min} max={rng.max} step={rng.step} onChange={(v) => setPv((s) => ({...s, [k]: v}))} />;
        })}
        <Slider testid="cobweb-x0" label="Giá trị đầu x₀" value={x0} min={lo} max={hi} step={(hi - lo) / 200} onChange={setX0} />
        <p className="text-[11px] text-stone-500">Chấm xanh đặc: điểm bất động ổn định (|f′| &lt; 1). Chấm rỗng: không ổn định. Với hàm logistic, thử r = 2,8 → 3,2 → 3,5 → 3,9.</p>
      </div>
    </div>
  );
};

const evalCache = new Map<string, ReturnType<typeof compileExpr>>();
function cobwebEval(expr: string, params: Record<string, number>, x: number): number {
  let c = evalCache.get(expr);
  if (!c) {
    c = compileExpr(expr);
    evalCache.set(expr, c);
  }
  return c.eval(x, params);
}
