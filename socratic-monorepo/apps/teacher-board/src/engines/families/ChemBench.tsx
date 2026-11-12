'use client';

import React, {useMemo, useReducer, useRef, useState} from 'react';
import {CHEM_EXPERIMENTS, EXPERIMENT_BY_ID} from '../../utils/lab/chem/experiments';
import {derive, labReducer, newLab, stepsDone} from '../../utils/lab/chem/engine';
import {RULES} from '../../utils/lab/chem/rules';
import {SUBSTANCES} from '../../utils/lab/chem/species';
import type {Derived, Vessel} from '../../utils/lab/chem/types';

const fmt = (v: number, d = 1) => v.toLocaleString('vi-VN', {maximumFractionDigits: d});
const GROUPS = ['Acid', 'Base', 'Muối', 'Halogen', 'Kim loại', 'Chất rắn', 'Hữu cơ', 'Chỉ thị'];
const RULE_BY_ID = new Map(RULES.map((r) => [r.id, r]));

/** mặt thoáng gợn sóng nhẹ: hai pha đường cong, SVG tự nội suy */
const wave = (x0: number, w: number, y: number, ph: number) => `M${x0} ${y} q${w / 4} ${ph} ${w / 2} 0 t${w / 2} 0 V${y + 400} H${x0} Z`;

const VesselSvg: React.FC<{i: number; v: Vessel; d: Derived; active: boolean; hot: boolean; onClick: () => void}> = ({i, v, d, active, hot, onClick}) => {
  const beaker = v.kind === 'beaker';
  const w = beaker ? 78 : 38;
  const h = beaker ? 112 : 150;
  const x0 = (beaker ? 495 : 70 + i * 100) - w / 2;
  const y0 = 205 - h;
  const frac = Math.min(1, v.liquidMl / (v.capacityMl * (beaker ? 0.4 : 1)));
  const lh = frac * (h - 8);
  const top = 205 - 6 - lh;
  const bubbles = Math.round(d.bubbles * 7);
  const clip = `chemclip-${i}`;
  let stack = 0;
  const outline = beaker ? `M${x0} ${y0} V${205} H${x0 + w} V${y0}` : `M${x0} ${y0} V${205 - w / 2} A${w / 2} ${w / 2} 0 0 0 ${x0 + w} ${205 - w / 2} V${y0}`;
  return (
    <g onClick={onClick} style={{cursor: 'pointer'}} data-testid={`chem-vessel-${i}`} data-liquid={v.liquidMl.toFixed(2)} data-color={d.color} data-temp={d.temp.toFixed(1)} data-ph={d.ph === null ? '' : d.ph.toFixed(2)} data-turbidity={d.turbidity.toFixed(2)} data-bubbles={d.bubbles.toFixed(2)} data-precip={d.precipitates.map((p) => p.species).join(',')}>
      <defs>
        <clipPath id={clip}>
          <path d={`${outline} Z`} />
        </clipPath>
        <linearGradient id={`chemwall-${i}`} x1="0" x2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity=".34" />
          <stop offset=".35" stopColor="#CFE3FF" stopOpacity=".07" />
          <stop offset=".8" stopColor="#CFE3FF" stopOpacity=".12" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity=".3" />
        </linearGradient>
      </defs>
      {/* vòng hít (snap) khi kéo chất tới, và viền chọn */}
      <rect x={x0 - 10} y={y0 - 14} width={w + 20} height={h + 36} rx="14" fill={hot ? 'rgba(127,162,240,.16)' : active ? 'rgba(255,255,255,.05)' : 'transparent'} stroke={hot ? '#7FA2F0' : active ? 'rgba(232,230,245,.45)' : 'transparent'} strokeWidth={hot ? 2.5 : 1.5} strokeDasharray={hot ? '6 4' : undefined} />
      <g clipPath={`url(#${clip})`}>
        {lh > 0 && (
          <>
            <path d={wave(x0 - 2, w + 4, top, 2.2)} fill={d.color} opacity={d.colorAlpha}>
              <animate attributeName="d" dur="2.6s" repeatCount="indefinite" values={`${wave(x0 - 2, w + 4, top, 2.2)};${wave(x0 - 2, w + 4, top, -2.2)};${wave(x0 - 2, w + 4, top, 2.2)}`} />
            </path>
            {d.turbidity > 0.02 && <rect x={x0} y={top} width={w} height={lh} fill="#FFFBEB" opacity={d.turbidity} />}
            <rect x={x0} y={top} width={w} height={Math.min(10, lh)} fill="url(#chemwall-0)" opacity=".5" />
            <ellipse cx={x0 + w / 2} cy={top + 1} rx={w / 2 - 3} ry="2" fill="#FFFFFF" opacity=".28" />
          </>
        )}
        {d.precipitates.map((p) => {
          const ph = Math.min(18, 4 + Math.log10(1 + p.mol * 4e4) * 4);
          stack += ph;
          return <rect key={p.species} x={x0 + 2} y={205 - 6 - stack} width={w - 4} height={ph} fill={p.color} stroke="rgba(0,0,0,0.3)" strokeWidth="0.6" rx="2" />;
        })}
        {Array.from({length: bubbles}).map((_, k) => (
          <circle key={k} cx={x0 + 8 + ((k * 11) % (w - 14))} cy={205 - 10} r={2 + (k % 2)} fill="rgba(255,255,255,.12)" stroke="#FFFFFF" strokeWidth="1.2">
            <animate attributeName="cy" from={205 - 10} to={205 - 8 - Math.max(lh, 12)} dur={`${1.1 + (k % 3) * 0.4}s`} repeatCount="indefinite" begin={`${(k % 4) * 0.2}s`} />
          </circle>
        ))}
        <rect x={x0} y={y0} width={w} height={h} fill={`url(#chemwall-${i})`} />
      </g>
      <path d={outline} fill="none" stroke="#CFE3FF" strokeOpacity=".75" strokeWidth="1.8" strokeLinecap="round" />
      <path d={`M${x0 + 5} ${y0 + 8} V${y0 + h * 0.55}`} stroke="#FFFFFF" strokeOpacity=".55" strokeWidth="3" strokeLinecap="round" fill="none" />
      {!beaker && <rect x={x0 - 3} y={y0 - 5} width={w + 6} height="6" rx="3" fill="#E5D3A8" stroke="#B49A6A" strokeWidth=".8" />}
      {beaker && <path d={`M${x0 - 4} ${y0 - 2} H${x0 + w + 4}`} stroke="#CFE3FF" strokeOpacity=".8" strokeWidth="2" strokeLinecap="round" />}
      <text x={x0 + w / 2} y={226} textAnchor="middle" fontSize="11" fontWeight="700" fill="#E8E6F5">{v.id}</text>
      <text x={x0 + w / 2} y={240} textAnchor="middle" fontSize="10" fill="#9AA3C7" style={{fontVariantNumeric: 'tabular-nums'}}>{fmt(d.temp, 0)} °C{d.ph !== null ? ` · pH ${fmt(d.ph)}` : ''}</text>
    </g>
  );
};

/** Giá thí nghiệm Hóa: ống nghiệm, cốc, kệ hóa chất, đun, chờ, nhật kí hiện tượng và bài thí nghiệm có bước kiểm tra. */
export const ChemBench: React.FC<{id: string; experiment: string | null}> = ({id, experiment}) => {
  const [lab, dispatch] = useReducer(labReducer, undefined, newLab);
  const [active, setActive] = useState(0);
  const [exp, setExp] = useState<string>(experiment ?? '');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [target, setTarget] = useState(1);
  const [drag, setDrag] = useState<{id: string; label: string; x: number; y: number; hover: number} | null>(null);
  const dragStart = useRef<{x: number; y: number; moved: boolean} | null>(null);
  const justDragged = useRef(false);
  /** dụng cụ nào đang nằm dưới điểm (x, y) của màn hình */
  const vesselAt = (x: number, y: number): number => {
    const el = document.elementsFromPoint?.(x, y).find((n) => n.closest?.('[data-testid^="chem-vessel-"]'));
    const m = el?.closest('[data-testid^="chem-vessel-"]')?.getAttribute('data-testid')?.match(/chem-vessel-(\d+)/);
    return m ? Number(m[1]) : -1;
  };
  const e = exp ? EXPERIMENT_BY_ID[exp] : undefined;
  const ds = useMemo(() => lab.vessels.map(derive), [lab]);
  const done = useMemo(() => (e ? stepsDone(e, lab) : []), [e, lab]);
  const av = lab.vessels[active];
  const ad = ds[active];
  const equations = useMemo(() => {
    const ids = new Set<string>();
    lab.vessels.forEach((v) => v.fired.forEach((f) => ids.add(f)));
    return [...ids].map((r) => RULE_BY_ID.get(r)?.eq).filter(Boolean) as string[];
  }, [lab]);
  const correct = e ? e.questions.filter((q, i) => answers[`${e.id}:${i}`] === q.answer).length : 0;
  const reset = () => {
    dispatch({type: 'reset'});
    setAnswers({});
  };
  const sample = () => {
    if (!e) return;
    dispatch({type: 'reset'});
    for (const a of e.script) dispatch(a);
  };

  return (
    <div className="p-4 flex flex-col gap-3" data-testid="chem-bench" data-preset={id} data-experiment={exp}>
      {drag && (
        <div data-testid="chem-drag-ghost" className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-[130%] rounded-full border border-white/40 bg-[#11143A]/90 px-3 py-1.5 text-xs font-semibold text-[#FBF9F4] shadow-lg backdrop-blur" style={{left: drag.x, top: drag.y}}>
          {drag.label}
          {drag.hover >= 0 ? ` → ${lab.vessels[drag.hover].id}` : ''}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <select data-testid="chem-experiment" value={exp} onChange={(ev) => { setExp(ev.target.value); reset(); }} className="rounded-md border border-stone-300 bg-white px-2 py-1 max-w-full">
          <option value="">Tự do: không theo bài</option>
          {CHEM_EXPERIMENTS.map((x) => (
            <option key={x.id} value={x.id}>{x.lesson}: {x.title}</option>
          ))}
        </select>
        <button type="button" data-testid="chem-goggles" aria-pressed={lab.goggles} onClick={() => dispatch({type: 'goggles', on: !lab.goggles})} className={`rounded-full border px-3 py-1 ${lab.goggles ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-stone-300 bg-white'}`}>
          {lab.goggles ? 'Đã đeo kính và găng' : 'Chưa đeo kính, găng'}
        </button>
        <button type="button" data-testid="chem-reset" onClick={reset} className="inline-flex items-center justify-center min-h-[32px] rounded-[10px] border border-[#1D1B16]/25 bg-white px-3.5 py-1 font-medium text-[#1D1B16]">Làm lại</button>
        {e && <button type="button" data-testid="chem-sample" onClick={sample} className="inline-flex items-center justify-center min-h-[32px] rounded-[10px] border border-[#1D1B16]/25 bg-white px-3.5 py-1 font-medium text-[#1D1B16]">Xem thao tác mẫu</button>}
      </div>

      {e && (
        <div className="rounded-2xl bg-[#FBF9F4] border border-[#1D1B16]/15 p-3 text-xs text-stone-700">
          <b className="text-sm text-stone-900">{e.title}</b>
          <span className="ml-2 text-stone-500">({e.lesson})</span>
          <p className="mt-1">{e.goal}</p>
          {e.hazards.length > 0 && <p className="mt-1 text-rose-700">An toàn: {e.hazards.join('; ')}.</p>}
        </div>
      )}

      <svg viewBox="0 0 560 250" className="w-full rounded-2xl border border-[#1D1B16]/15 select-none touch-none" data-testid="chem-bench-svg">
        <defs>
          <linearGradient id="chemstage" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1B2150" />
            <stop offset="1" stopColor="#0E1030" />
          </linearGradient>
          <radialGradient id="chemglow" cx=".5" cy=".35" r=".7">
            <stop offset="0" stopColor="#5A6BC8" stopOpacity=".28" />
            <stop offset="1" stopColor="#5A6BC8" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="560" height="250" fill="url(#chemstage)" />
        <rect width="560" height="250" fill="url(#chemglow)" />
        <rect x="20" y="206" width="520" height="7" rx="3.5" fill="#3A3E7A" />
        <rect x="20" y="206" width="520" height="2" rx="1" fill="#8B91B8" opacity=".6" />
        {/* phương trình trực tiếp: phản ứng mới nhất ở giữa đỉnh bảng, chữ lớn dễ đọc từ xa */}
        {equations.length > 0 && (
          <text data-testid="chem-live-equation" x="280" y="26" textAnchor="middle" fontSize="17" fontWeight="600" fill="#FBF9F4" fontFamily="Georgia, 'Times New Roman', serif">{equations[equations.length - 1]}</text>
        )}
        {lab.log.length > 0 && (
          <text x="280" y="44" textAnchor="middle" fontSize="11" fill="#9AA3C7">{lab.log[lab.log.length - 1].text}</text>
        )}
        {lab.vessels.map((v, i) => (
          <VesselSvg key={v.id} i={i} v={v} d={ds[i]} active={i === active} hot={drag?.hover === i} onClick={() => setActive(i)} />
        ))}
      </svg>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <b>{av.id}:</b>
        <button type="button" data-testid="chem-heat" onClick={() => dispatch({type: 'heat', v: active})} className="inline-flex items-center justify-center min-h-[32px] rounded-[10px] border border-[#1D1B16]/25 bg-white px-3.5 py-1 font-medium text-[#1D1B16]">Đun nóng</button>
        <button type="button" data-testid="chem-light" aria-pressed={av.light} onClick={() => dispatch({type: 'light', v: active, on: !av.light})} className={`rounded-md border px-3 py-1 ${av.light ? 'border-amber-500 bg-amber-100' : 'border-stone-300 bg-white'}`}>Chiếu sáng</button>
        <button type="button" data-testid="chem-discard" onClick={() => dispatch({type: 'discard', v: active})} className="inline-flex items-center justify-center min-h-[32px] rounded-[10px] border border-[#1D1B16]/25 bg-white px-3.5 py-1 font-medium text-[#1D1B16]">Đổ bỏ</button>
        <span className="text-stone-500">Dẫn khí sang</span>
        <select data-testid="chem-gas-to" value={target} onChange={(ev) => setTarget(Number(ev.target.value))} className="rounded-md border border-stone-300 bg-white px-1 py-1">
          {lab.vessels.map((v, i) => (i === active ? null : <option key={v.id} value={i}>{v.id}</option>))}
        </select>
        <button type="button" data-testid="chem-transfer" onClick={() => dispatch({type: 'transferGas', v: active, to: target === active ? (active + 1) % lab.vessels.length : target})} className="inline-flex items-center justify-center min-h-[32px] rounded-[10px] border border-[#1D1B16]/25 bg-white px-3.5 py-1 font-medium text-[#1D1B16]">Dẫn</button>
        <span className="ml-auto flex items-center gap-1">
          Chờ:
          {[5, 30, 120].map((sec) => (
            <button key={sec} type="button" data-testid={`chem-wait-${sec}`} onClick={() => dispatch({type: 'wait', seconds: sec})} className="rounded-md border border-stone-300 bg-white px-2 py-1">{sec < 60 ? `${sec} s` : `${sec / 60} phút`}</button>
          ))}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-stone-600" data-testid="chem-readout">
        <span>Thể tích: <b>{fmt(ad.volumeMl)}</b> mL</span>
        <span>Nhiệt độ: <b>{fmt(ad.temp)}</b> °C</span>
        <span>pH: <b>{ad.ph === null ? '—' : fmt(ad.ph)}</b></span>
        <span>Mùi: <b>{ad.smell.length ? ad.smell.join(', ') : 'không'}</b></span>
        <span className="flex items-center gap-1" title="Đèn thử dẫn điện">
          Đèn:
          <i data-testid="chem-lamp" data-level={ad.conducts.toFixed(2)} className="inline-block h-3.5 w-3.5 rounded-full border border-stone-400" style={{background: `rgba(250,204,21,${ad.conducts})`}} />
        </span>
        <span className="ml-auto text-[11px] text-stone-500">Đồng hồ: {fmt(lab.clock, 0)} s</span>
      </div>

      <div className="rounded-2xl border border-[#1D1B16]/15 bg-white p-3 flex flex-col gap-2" data-testid="chem-shelf">
        {GROUPS.map((g) => {
          const items = SUBSTANCES.filter((s) => (g === 'Chất rắn' ? s.group === 'Chất rắn' : s.group === g));
          if (!items.length) return null;
          return (
            <div key={g} className="flex flex-wrap items-center gap-1.5">
              <span className="w-16 shrink-0 text-[11px] font-semibold text-stone-500">{g}</span>
              {items.map((s) => {
                const val = amounts[s.id] ?? s.amounts[Math.min(1, s.amounts.length - 1)].value;
                return (
                  <span key={s.id} className="inline-flex overflow-hidden rounded-md border border-stone-300 text-[11px]">
                    <button
                      type="button"
                      data-testid={`chem-sub-${s.id}`}
                      title={s.hazard}
                      style={{touchAction: 'none'}}
                      onClick={() => {
                        if (justDragged.current) return (justDragged.current = false);
                        dispatch({type: 'add', v: active, sub: s.id, amount: val});
                      }}
                      onPointerDown={(e) => {
                        dragStart.current = {x: e.clientX, y: e.clientY, moved: false};
                        e.currentTarget.setPointerCapture?.(e.pointerId);
                      }}
                      onPointerMove={(e) => {
                        const st = dragStart.current;
                        if (!st) return;
                        if (!st.moved && Math.hypot(e.clientX - st.x, e.clientY - st.y) < 8) return;
                        st.moved = true;
                        setDrag({id: s.id, label: s.label, x: e.clientX, y: e.clientY, hover: vesselAt(e.clientX, e.clientY)});
                      }}
                      onPointerUp={(e) => {
                        const st = dragStart.current;
                        dragStart.current = null;
                        if (st?.moved) {
                          justDragged.current = true;
                          const vi = vesselAt(e.clientX, e.clientY);
                          if (vi >= 0) {
                            setActive(vi);
                            dispatch({type: 'add', v: vi, sub: s.id, amount: val});
                          }
                        }
                        setDrag(null);
                      }}
                      onPointerCancel={() => {
                        dragStart.current = null;
                        setDrag(null);
                      }}
                      className={`min-h-[44px] px-2.5 py-1 hover:bg-stone-50 ${s.hazard ? 'text-rose-700' : ''}`}
                    >{s.label}</button>
                    <select data-testid={`chem-amount-${s.id}`} value={val} onChange={(ev) => setAmounts((a) => ({...a, [s.id]: Number(ev.target.value)}))} className="border-l border-stone-200 bg-stone-50 px-0.5">
                      {s.amounts.map((a) => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl bg-[#FBF9F4] border border-[#1D1B16]/15 p-3 text-xs" data-testid="chem-log">
          <b className="text-stone-900">Nhật kí hiện tượng</b>
          {lab.log.length === 0 ? <p className="mt-1 text-stone-500">Chưa có thao tác.</p> : (
            <ul className="mt-1 max-h-40 overflow-auto space-y-0.5">
              {[...lab.log].reverse().slice(0, 40).map((l, i) => (
                <li key={`${l.t}-${i}`}><span className="text-stone-400">{fmt(l.t, 0)} s · {lab.vessels[l.v].id}:</span> {l.text}</li>
              ))}
            </ul>
          )}
          {equations.length > 0 && (
            <>
              <b className="mt-2 block text-stone-900">Phương trình đã xảy ra</b>
              <ul className="mt-1 space-y-0.5 font-mono text-[11px]" data-testid="chem-equations">{equations.map((q) => <li key={q}>{q}</li>)}</ul>
            </>
          )}
          {lab.violations.length > 0 && (
            <>
              <b className="mt-2 block text-rose-700">Vi phạm an toàn</b>
              <ul className="mt-1 space-y-0.5 text-rose-700" data-testid="chem-violations">{lab.violations.map((q) => <li key={q}>{q}</li>)}</ul>
            </>
          )}
        </div>

        {e && (
          <div className="rounded-2xl bg-[#FBF9F4] border border-[#1D1B16]/15 p-3 text-xs" data-testid="chem-steps">
            <b className="text-stone-900">Các bước ({done.filter(Boolean).length}/{e.steps.length})</b>
            <ul className="mt-1 space-y-1">
              {e.steps.map((s, i) => (
                <li key={s.text} data-testid={`chem-step-${i}`} data-done={done[i] ? '1' : '0'} className={done[i] ? 'text-emerald-700' : 'text-stone-700'}>
                  {done[i] ? '✓' : '○'} {s.text}
                </li>
              ))}
            </ul>
            <b className="mt-2 block text-stone-900">Câu hỏi sau thí nghiệm</b>
            {e.questions.map((q, qi) => {
              const key = `${e.id}:${qi}`;
              const picked = answers[key];
              return (
                <div key={key} className="mt-1" data-testid={`chem-q-${qi}`} data-correct={picked === undefined ? '' : picked === q.answer ? '1' : '0'}>
                  <p>{q.q}</p>
                  <div className="flex flex-wrap gap-1">
                    {q.options.map((o, oi) => (
                      <button key={o} type="button" data-testid={`chem-q-${qi}-opt-${oi}`} onClick={() => setAnswers((a) => ({...a, [key]: oi}))} className={`rounded-md border px-2 py-0.5 ${picked === oi ? (oi === q.answer ? 'border-emerald-600 bg-emerald-50' : 'border-rose-500 bg-rose-50') : 'border-stone-300 bg-white'}`}>{o}</button>
                    ))}
                  </div>
                  {picked !== undefined && <p className={picked === q.answer ? 'text-emerald-700' : 'text-rose-700'}>{picked === q.answer ? 'Đúng. ' : 'Chưa đúng. '}{q.why}</p>}
                </div>
              );
            })}
            <p className="mt-2 text-stone-600" data-testid="chem-report">Báo cáo: {done.filter(Boolean).length}/{e.steps.length} bước · {correct}/{e.questions.length} câu đúng · {lab.violations.length} vi phạm an toàn</p>
          </div>
        )}
      </div>
    </div>
  );
};
