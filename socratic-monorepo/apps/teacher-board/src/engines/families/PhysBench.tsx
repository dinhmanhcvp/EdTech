'use client';

import React, {useMemo, useReducer, useState} from 'react';
import {BIO_BY_ID, BIO_EXPERIMENTS} from '../../utils/lab/bio/experiments';
import {PHYS_BY_ID, PHYS_EXPERIMENTS} from '../../utils/lab/phys/experiments';
import {initialPhys, linearFit, physCtx, physReducer, physStepsDone} from '../../utils/lab/phys/engine';
import type {PhysAction, PhysExperiment, PhysState} from '../../utils/lab/phys/types';
import {CHART_BG} from '../visualKit';
import {ControlPanel} from './Controls';
import {renderShape} from './SceneLab';

const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toLocaleString('vi-VN', {maximumFractionDigits: d, minimumFractionDigits: 0}) : '—');

const Chart: React.FC<{e: PhysExperiment; st: PhysState}> = ({e, st}) => {
  const ch = e.chart;
  if (!ch || st.rows.length === 0) return null;
  const xs = st.rows.map((r) => r[ch.x]);
  const ys = st.rows.map((r) => r[ch.y]);
  const x0 = Math.min(0, ...xs);
  const x1 = Math.max(...xs) * 1.08;
  const y0 = Math.min(0, ...ys);
  const y1 = Math.max(...ys) * 1.1;
  const W = 520;
  const H = 220;
  const sx = (x: number) => 52 + ((x - x0) / (x1 - x0 || 1)) * (W - 70);
  const sy = (y: number) => H - 36 - ((y - y0) / (y1 - y0 || 1)) * (H - 56);
  const fit = ch.fit ? linearFit(xs, ys) : null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`w-full rounded-xl border border-[#E6E4DD] ${CHART_BG}`} data-testid="phys-chart" data-points={st.rows.length}>
      <line x1="52" y1={sy(y0)} x2={W - 14} y2={sy(y0)} stroke="#78716C" />
      <line x1={sx(x0)} y1="14" x2={sx(x0)} y2={H - 36} stroke="#78716C" />
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <text x={sx(x0 + t * (x1 - x0))} y={H - 22} fontSize="9" textAnchor="middle" fill="#78716C">{fmt(x0 + t * (x1 - x0), 3)}</text>
          <text x="48" y={sy(y0 + t * (y1 - y0)) + 3} fontSize="9" textAnchor="end" fill="#78716C">{fmt(y0 + t * (y1 - y0), 3)}</text>
        </g>
      ))}
      <text x={(W + 40) / 2} y={H - 6} fontSize="11" textAnchor="middle" fill="#57534E">{ch.xLabel}</text>
      <text x="10" y={H / 2} fontSize="11" textAnchor="middle" fill="#57534E" transform={`rotate(-90 10 ${H / 2})`}>{ch.yLabel}</text>
      {fit && Number.isFinite(fit.slope) && <line x1={sx(x0)} y1={sy(fit.intercept + fit.slope * x0)} x2={sx(x1)} y2={sy(fit.intercept + fit.slope * x1)} stroke="#E11D48" strokeWidth="1.8" strokeDasharray="6 4" />}
      {st.rows.map((r, i) => (
        <circle key={i} cx={sx(r[ch.x])} cy={sy(r[ch.y])} r="4.5" fill="#2563EB" />
      ))}
    </svg>
  );
};

const BY_ID = {...PHYS_BY_ID, ...BIO_BY_ID};

/** Phòng thực hành Vật lí (và Sinh học, cùng khung đo đạc): dụng cụ, số đo có nhiễu và sai số dụng cụ, bảng ghi, đồ thị, kết quả và nhận xét. */
export const PhysBench: React.FC<{id: string; experiment: string}> = ({id, experiment}) => {
  const list = BIO_BY_ID[experiment] ? BIO_EXPERIMENTS : PHYS_EXPERIMENTS;
  const [exp, setExp] = useState(BY_ID[experiment] ? experiment : list[0].id);
  const e = BY_ID[exp];
  const [st, dispatch] = useReducer((s: PhysState, a: PhysAction | {type: 'reset'; e: PhysExperiment}) => (a.type === 'reset' ? initialPhys(a.e) : physReducer(e, s, a)), BY_ID[BY_ID[experiment] ? experiment : list[0].id], (x) => initialPhys(x));
  const [checked, setChecked] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const last = st.rows.length ? st.rows[st.rows.length - 1] : null;
  const done = useMemo(() => physStepsDone(e, st), [e, st]);
  const ctx = useMemo(() => physCtx(e, st), [e, st]);
  const results = useMemo(() => e.results(st.rows, st.p, st.s), [e, st]);
  const verdict = useMemo(() => (checked ? e.verdict(ctx) : null), [checked, e, ctx]);
  const correct = e.questions.filter((q, i) => answers[`${e.id}:${i}`] === q.answer).length;
  const controls = {sliders: e.sliders, choices: e.choices};

  const switchTo = (next: string) => {
    setExp(next);
    setChecked(false);
    setAnswers({});
    dispatch({type: 'reset', e: BY_ID[next]});
  };
  const sample = () => {
    dispatch({type: 'reset', e});
    setChecked(false);
    for (const a of e.script) dispatch(a);
  };

  return (
    <div className="p-4 flex flex-col gap-3" data-testid="phys-bench" data-preset={id} data-experiment={exp}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <select data-testid="phys-experiment" value={exp} onChange={(ev) => switchTo(ev.target.value)} className="rounded-md border border-stone-300 bg-white px-2 py-1 max-w-full">
          {list.map((x) => (
            <option key={x.id} value={x.id}>{x.lesson}: {x.title}</option>
          ))}
        </select>
        <button type="button" data-testid="phys-sample" onClick={sample} className="rounded-md border border-stone-300 bg-white px-3 py-1">Xem thao tác mẫu</button>
      </div>

      <div className="rounded-xl bg-[#F4F3EE] border border-[#E5E3DC] p-3 text-xs text-stone-700">
        <b className="text-sm text-stone-900">{e.title}</b>
        <span className="ml-2 text-stone-500">({e.lesson})</span>
        <p className="mt-1">{e.goal}</p>
        <p className="mt-1 text-stone-500">Dụng cụ: {e.apparatus}.</p>
        {e.hazards.length > 0 && <p className="mt-1 text-rose-700">An toàn: {e.hazards.join('; ')}.</p>}
      </div>

      <svg viewBox={`0 0 ${e.viewBox[0]} ${e.viewBox[1]}`} className={`w-full rounded-xl border border-[#E6E4DD] ${CHART_BG}`} data-testid="phys-scene">
        {e.scene(st.p, st.s, last).map((sh, i) => renderShape(sh, i))}
      </svg>

      <div className="rounded-xl bg-[#F4F3EE] border border-[#E5E3DC] p-3 flex flex-col gap-2">
        <ControlPanel prefix="phys" c={controls} p={st.p} s={st.s} setP={(k, v) => dispatch({type: 'set', key: k, value: v})} setS={(k, v) => dispatch({type: 'choose', key: k, value: v})} />
        {e.columns.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button type="button" data-testid="phys-measure" onClick={() => dispatch({type: 'measure'})} className="rounded-md border border-blue-600 bg-blue-600 px-4 py-1.5 font-semibold text-white">Đo (lần {st.rows.length + 1})</button>
            <button type="button" data-testid="phys-clear" onClick={() => dispatch({type: 'clear'})} className="rounded-md border border-stone-300 bg-white px-3 py-1.5">Xóa số liệu</button>
            <span className="text-stone-500">Mỗi lần đo cho một số khác nhau do sai số ngẫu nhiên và độ chia nhỏ nhất của dụng cụ.</span>
          </div>
        )}
      </div>

      {e.columns.length > 0 && (
        <div className="overflow-auto rounded-xl border border-[#E6E4DD] bg-white" data-testid="phys-table" data-rows={st.rows.length}>
          <table className="w-full border-collapse text-center text-xs font-mono">
            <thead>
              <tr className="bg-stone-100 text-stone-600">
                <th className="px-2 py-1">#</th>
                {e.columns.map((c) => (
                  <th key={c.key} className="px-2 py-1 font-semibold">{c.label}{c.unit ? ` (${c.unit})` : ''}</th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {st.rows.map((r, i) => (
                <tr key={i} data-testid={`phys-row-${i}`} className="border-t border-stone-100">
                  <td className="px-2 py-1 text-stone-400">{i + 1}</td>
                  {e.columns.map((c) => (
                    <td key={c.key} className="px-2 py-1">{fmt(r[c.key], c.digits ?? 2)}</td>
                  ))}
                  <td><button type="button" aria-label={`Xóa lần đo ${i + 1}`} onClick={() => dispatch({type: 'delete', i})} className="px-2 text-stone-400 hover:text-rose-600">×</button></td>
                </tr>
              ))}
              {st.rows.length === 0 && (
                <tr><td colSpan={e.columns.length + 2} className="px-2 py-3 text-stone-400">Chưa có số liệu. Bấm “Đo”.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Chart e={e} st={st} />

      {results.length > 0 && st.rows.length > 0 && (
        <ul className="rounded-xl border border-[#E6E4DD] bg-white p-3 text-xs space-y-0.5" data-testid="phys-results">
          {results.map((r) => (
            <li key={r.key}>
              {r.label}: <b data-testid={`phys-result-${r.key}`} data-value={Number.isFinite(r.value) ? r.value : ''} className="font-mono">{fmt(r.value, r.digits ?? 3)}{r.unit ? ` ${r.unit}` : ''}</b>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-[#F4F3EE] border border-[#E5E3DC] p-3 text-xs" data-testid="phys-steps">
          <b className="text-stone-900">Các bước ({done.filter(Boolean).length}/{e.steps.length})</b>
          <ul className="mt-1 space-y-1">
            {e.steps.map((s, i) => (
              <li key={s.text} data-testid={`phys-step-${i}`} data-done={done[i] ? '1' : '0'} className={done[i] ? 'text-emerald-700' : 'text-stone-700'}>
                {done[i] ? '✓' : '○'} {s.text}
              </li>
            ))}
          </ul>
          <button type="button" data-testid="phys-check" onClick={() => setChecked(true)} className="mt-2 rounded-md border border-stone-300 bg-white px-3 py-1">Kiểm tra kết quả của em</button>
          {verdict && (
            <p data-testid="phys-verdict" data-ok={verdict.ok ? '1' : '0'} className={`mt-1 ${verdict.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{verdict.ok ? 'Đạt. ' : 'Chưa đạt. '}{verdict.text}</p>
          )}
        </div>
        <div className="rounded-xl bg-[#F4F3EE] border border-[#E5E3DC] p-3 text-xs" data-testid="phys-questions">
          <b className="text-stone-900">Câu hỏi sau thí nghiệm</b>
          {e.questions.map((q, qi) => {
            const key = `${e.id}:${qi}`;
            const picked = answers[key];
            return (
              <div key={key} className="mt-1" data-testid={`phys-q-${qi}`} data-correct={picked === undefined ? '' : picked === q.answer ? '1' : '0'}>
                <p>{q.q}</p>
                <div className="flex flex-wrap gap-1">
                  {q.options.map((o, oi) => (
                    <button key={o} type="button" data-testid={`phys-q-${qi}-opt-${oi}`} onClick={() => setAnswers((a) => ({...a, [key]: oi}))} className={`rounded-md border px-2 py-0.5 ${picked === oi ? (oi === q.answer ? 'border-emerald-600 bg-emerald-50' : 'border-rose-500 bg-rose-50') : 'border-stone-300 bg-white'}`}>{o}</button>
                  ))}
                </div>
                {picked !== undefined && <p className={picked === q.answer ? 'text-emerald-700' : 'text-rose-700'}>{picked === q.answer ? 'Đúng. ' : 'Chưa đúng. '}{q.why}</p>}
              </div>
            );
          })}
          <p className="mt-2 text-stone-600" data-testid="phys-report">Báo cáo: {done.filter(Boolean).length}/{e.steps.length} bước · {correct}/{e.questions.length} câu đúng · {st.rows.length} lần đo</p>
        </div>
      </div>
    </div>
  );
};
