'use client';

import React, { useState } from 'react';
import { PILOT, vn } from '@socratic/types';
import { MathView } from '../common/MathView';

/** Số thập phân kiểu Việt Nam trong KaTeX: 7.74 → 7{,}74 */
const tex = (n: number, digits = 2) => vn(n, digits).replace(',', '{,}');

const S = PILOT.study;
const SC = PILOT.scores;
const OPS = PILOT.ops;

const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <div className={`border border-[#E6E4DD] bg-white rounded-2xl p-5 shadow-[0_2px_12px_-2px_rgba(20,20,19,0.04)] ${className}`}>
    {children}
  </div>
);

const Kicker: React.FC<{ children: React.ReactNode; tone?: string }> = ({ children, tone = 'text-stone-500' }) => (
  <span className={`text-[10px] font-mono uppercase tracking-[0.16em] ${tone}`}>{children}</span>
);

// ---------------------------------------------------------------- KPI
const KpiStrip: React.FC = () => {
  const kpis = [
    {
      label: 'Điểm TB nhóm thực nghiệm',
      value: <MathView latex={`${tex(SC.post.exp.mean)} \\pm ${tex(SC.post.exp.sd)}`} />,
      badge: `+${vn(SC.growth.exp.pts, 2)} điểm`,
      note: <MathView latex={`d = ${tex(SC.cohenD)},\\ p = ${SC.post.p.replace('.', '{,}')}`} />,
      tone: 'text-[#141413]',
    },
    {
      label: 'Phần II · Đúng/Sai bản chất',
      value: `${vn(PILOT.parts[1].exp)}%`,
      badge: `+${vn(PILOT.parts[1].delta)}%`,
      note: 'so với nhóm đối chứng',
      tone: 'text-blue-600',
    },
    {
      label: 'Kiên trì sau lần sai đầu',
      value: `${vn(OPS.persistence.after)}%`,
      badge: `×${vn(OPS.persistence.times)}`,
      note: `từ ${vn(OPS.persistence.before)}% · gỡ lỗi bằng hình + chia nhỏ bước`,
      tone: 'text-amber-600',
    },
    {
      label: 'Phiên không tốn token AI',
      value: `${vn(OPS.offload.zeroToken)}%`,
      badge: `$${OPS.api.costUsd} / tiết`,
      note: `${vn(OPS.offload.sympy)}% SymPy + ${vn(OPS.offload.cache)}% kho gợi mở`,
      tone: 'text-emerald-600',
    },
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3" data-testid="pilot-kpi-strip">
      {kpis.map((k) => (
        <Card key={k.label} className="!p-4 flex flex-col gap-1.5">
          <Kicker>{k.label}</Kicker>
          <div className="flex items-baseline justify-between gap-2 mt-1">
            <span className={`text-2xl font-mono font-bold tabular-nums ${k.tone}`}>{k.value}</span>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 tabular-nums whitespace-nowrap">
              {k.badge}
            </span>
          </div>
          <span className="text-[11px] text-stone-500 font-mono">{k.note}</span>
        </Card>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------- Điểm trước / sau (dumbbell ± SD)
const ScoreDumbbell: React.FC = () => {
  const W = 520;
  const H = 190;
  const x0 = 120;
  const x1 = W - 24;
  const lo = 4;
  const hi = 10;
  const sx = (v: number) => x0 + ((v - lo) / (hi - lo)) * (x1 - x0);
  const rows = [
    { name: `Đối chứng`, n: S.n2, pre: SC.pre.control, post: SC.post.control, color: '#A8A29E', y: 70 },
    { name: `Thực nghiệm`, n: S.n1, pre: SC.pre.exp, post: SC.post.exp, color: '#2563EB', y: 140 },
  ];
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Kicker tone="text-blue-600">Điểm kiểm tra · thang 10</Kicker>
          <h4 className="font-display text-[22px] leading-tight text-[#141413] mt-1">
            Xuất phát như nhau, <em className="text-blue-600">về đích cách nhau {vn(SC.post.delta, 2)} điểm</em>
          </h4>
        </div>
        <span className="text-[11px] font-mono text-stone-500 bg-[#F2F0EA] border border-[#E5E3DC] px-2 py-0.5 rounded-md whitespace-nowrap">
          <MathView latex={`N = ${S.N}`} />
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Điểm trung bình trước và sau thí điểm của hai nhóm">
        {[4, 5, 6, 7, 8, 9, 10].map((v) => (
          <g key={v}>
            <line x1={sx(v)} x2={sx(v)} y1={30} y2={H - 26} stroke="#EFEDE7" />
            <text x={sx(v)} y={H - 8} textAnchor="middle" className="font-mono" fontSize={11} fill="#A8A29E">{v}</text>
          </g>
        ))}
        <text x={sx(SC.pre.exp.mean)} y={20} textAnchor="middle" fontSize={11} className="font-mono" fill="#A8A29E">TRƯỚC</text>
        <text x={sx(SC.post.exp.mean)} y={20} textAnchor="middle" fontSize={11} className="font-mono" fill="#2563EB">SAU</text>
        {rows.map((r) => (
          <g key={r.name}>
            <text x={0} y={r.y - 4} fontSize={13} fontWeight={600} fill="#141413">{r.name}</text>
            <text x={0} y={r.y + 13} fontSize={11} className="font-mono" fill="#A8A29E">n = {r.n}</text>
            {/* ± SD của bài sau */}
            <line x1={sx(r.post.mean - r.post.sd)} x2={sx(r.post.mean + r.post.sd)} y1={r.y} y2={r.y} stroke={r.color} strokeOpacity={0.25} strokeWidth={10} strokeLinecap="round" />
            <line x1={sx(r.pre.mean)} x2={sx(r.post.mean)} y1={r.y} y2={r.y} stroke={r.color} strokeWidth={2} />
            <circle cx={sx(r.pre.mean)} cy={r.y} r={6} fill="#fff" stroke={r.color} strokeWidth={2} />
            <circle cx={sx(r.post.mean)} cy={r.y} r={7} fill={r.color} />
            <text x={sx(r.pre.mean)} y={r.y + 24} textAnchor="middle" fontSize={11} className="font-mono" fill="#57534E">{vn(r.pre.mean, 2)}</text>
            <text x={sx(r.post.mean)} y={r.y - 14} textAnchor="middle" fontSize={12} fontWeight={700} className="font-mono" fill={r.color}>{vn(r.post.mean, 2)}</text>
          </g>
        ))}
      </svg>
      <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-stone-600">
        <div className="p-2 rounded-lg bg-[#F8F7F4] border border-[#E6E4DD]">
          Trước: <MathView latex={`p = ${SC.pre.p.replace('.', '{,}')}`} /> <span className="text-stone-400">(tương đương)</span>
        </div>
        <div className="p-2 rounded-lg bg-[#F8F7F4] border border-[#E6E4DD]">
          Sau: <MathView latex={`p = ${SC.post.p.replace('.', '{,}')}`} />
        </div>
        <div className="p-2 rounded-lg bg-[#ECFDF5] border border-emerald-200 text-emerald-800">
          Hiệu ứng: <MathView latex={`d = ${tex(SC.cohenD)}`} /> (lớn)
        </div>
      </div>
    </Card>
  );
};

// ---------------------------------------------------------------- Theo phần đề thi (di chuột để xem chênh lệch)
const PartBars: React.FC = () => {
  const [hover, setHover] = useState<string | null>('II');
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Kicker tone="text-blue-600">Độ chính xác theo phần · đề THPT từ 2025</Kicker>
          <h4 className="font-display text-[22px] leading-tight text-[#141413] mt-1">
            Khác biệt lớn nhất nằm ở <em className="text-amber-600">câu Đúng/Sai và câu nhiều bước</em>
          </h4>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-stone-500 whitespace-nowrap">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-stone-300" />Đối chứng</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-600" />Thực nghiệm</span>
        </div>
      </div>
      <div className="flex flex-col gap-2.5" data-testid="pilot-part-bars">
        {PILOT.parts.map((p) => {
          const on = hover === p.key;
          return (
            <div
              key={p.key}
              onMouseEnter={() => setHover(p.key)}
              className={`grid grid-cols-[150px_1fr_64px] items-center gap-3 p-2 rounded-xl transition cursor-default ${on ? 'bg-[#F8F7F4]' : ''}`}
            >
              <span className="text-xs font-semibold text-[#141413] leading-tight">{p.label}</span>
              <div className="flex flex-col gap-1">
                {[
                  { v: p.control, c: 'bg-stone-300', t: 'text-stone-500' },
                  { v: p.exp, c: 'bg-blue-600', t: 'text-blue-700' },
                ].map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex-1 h-2.5 rounded-full bg-[#F2F0EA] overflow-hidden">
                      <div className={`h-full rounded-full ${b.c} transition-all duration-500`} style={{ width: `${b.v}%` }} />
                    </div>
                    <span className={`w-12 text-right text-[11px] font-mono tabular-nums ${b.t}`}>{vn(b.v)}%</span>
                  </div>
                ))}
              </div>
              <span
                className={`text-right text-xs font-mono font-bold tabular-nums ${p.delta >= 20 ? 'text-emerald-600' : 'text-stone-500'}`}
              >
                +{vn(p.delta)}%
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-stone-500 font-mono">
        {S.weeks} tuần · {S.lessons} tiết · {S.N} HS lớp {S.grades} ({S.n1} thực nghiệm gồm {S.n1Core} THPT + {S.n1Gifted} chuyên, {S.n2} đối chứng) · {S.teachers} GV
      </p>
    </Card>
  );
};

// ---------------------------------------------------------------- Phễu 3 tầng + thời gian soạn + chi phí
const FunnelCost: React.FC = () => {
  const tiers = [
    { name: 'Tầng 1 · SymPy', pct: OPS.offload.sympy, lat: `< ${OPS.offload.sympyMs} ms · 0 đ`, color: 'bg-emerald-600' },
    { name: 'Tầng 2 · Kho gợi mở', pct: OPS.offload.cache, lat: `< ${OPS.offload.cacheMs} ms · 0 đ`, color: 'bg-blue-600' },
    { name: 'Tầng 3 · LLM có rào chắn', pct: OPS.offload.llm, lat: 'gọi khi cần', color: 'bg-amber-500' },
  ];
  return (
    <Card className="flex flex-col gap-4">
      <div>
        <Kicker tone="text-emerald-700">Kiểm chứng 3 tầng · {vn(S.tutorSessions, 0)} phiên gia sư</Kicker>
        <h4 className="font-display text-[22px] leading-tight text-[#141413] mt-1">
          <em className="text-emerald-600">{vn(OPS.offload.zeroToken)}%</em> phiên được chấm mà không cần gọi LLM
        </h4>
      </div>
      <div className="flex h-9 rounded-xl overflow-hidden border border-[#E6E4DD]" data-testid="pilot-funnel">
        {tiers.map((t) => (
          <div key={t.name} className={`${t.color} flex items-center justify-center text-white text-[11px] font-mono font-bold tabular-nums`} style={{ width: `${t.pct}%` }} title={`${t.name}: ${vn(t.pct)}%`}>
            {vn(t.pct)}%
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {tiers.map((t) => (
          <div key={t.name} className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#141413]"><span className={`w-2 h-2 rounded-full ${t.color}`} />{t.name}</span>
            <span className="text-[10px] font-mono text-stone-500 pl-3.5">{t.lat}</span>
          </div>
        ))}
      </div>
      <div className="h-px bg-[#E6E4DD]" />
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Kicker>Thời gian soạn mô phỏng / tiết</Kicker>
          {[
            { l: 'Trước', v: OPS.prepMin.before, c: 'bg-stone-300' },
            { l: 'Nay', v: OPS.prepMin.after, c: 'bg-blue-600' },
          ].map((b) => (
            <div key={b.l} className="flex items-center gap-2">
              <span className="w-9 text-[11px] font-mono text-stone-500">{b.l}</span>
              <div className="flex-1 h-2.5 rounded-full bg-[#F2F0EA] overflow-hidden">
                <div className={`h-full ${b.c}`} style={{ width: `${(b.v / OPS.prepMin.before) * 100}%` }} />
              </div>
              <span className="w-16 text-right text-[11px] font-mono tabular-nums text-[#141413]">{vn(b.v)} phút</span>
            </div>
          ))}
          <span className="text-[11px] font-mono font-bold text-emerald-600">{vn(OPS.prepMin.pct)}%</span>
        </div>
        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#18181B] text-[#F8F7F4]">
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-stone-400">Chi phí AI / tiết 45 phút</span>
          <span className="text-2xl font-mono font-bold tabular-nums">${OPS.api.costUsd}</span>
          <span className="text-[11px] font-mono text-stone-300">≈ {OPS.api.costVnd} đ · {vn(OPS.api.callsPerLesson)} lần khoanh</span>
          <span className="text-[11px] font-mono text-emerald-400">−{vn(OPS.api.reductionPct)}% so với gọi AI liên tục</span>
        </div>
      </div>
    </Card>
  );
};

// ---------------------------------------------------------------- Phản hồi thực địa & cải tiến
const FieldNotes: React.FC = () => {
  const [open, setOpen] = useState(true);
  return (
    <Card className="flex flex-col gap-3">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center justify-between text-left cursor-pointer">
        <div>
          <Kicker tone="text-amber-700">Phản hồi thực địa & cải tiến trong thí điểm</Kicker>
          <h4 className="font-display text-[22px] leading-tight text-[#141413] mt-1">Người dùng thật nói gì, và chúng tôi đã sửa gì</h4>
        </div>
        <span className="text-[11px] font-mono text-stone-500 border border-[#E6E4DD] rounded-md px-2 py-0.5">{open ? 'Thu gọn' : 'Mở'}</span>
      </button>
      {open && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="pilot-feedback">
          {PILOT.feedback.map((f) => (
            <figure key={f.who} className="p-4 rounded-xl bg-[#F8F7F4] border border-[#E6E4DD] flex flex-col gap-3">
              <blockquote className="font-display text-[17px] leading-snug text-[#141413]">“{f.quote}”</blockquote>
              <figcaption className="mt-auto text-[11px] font-mono text-stone-500">
                <span className="font-semibold text-stone-700">{f.who}</span> · {f.meta}
              </figcaption>
            </figure>
          ))}
          <div className="p-4 rounded-xl bg-[#FFFBEB] border border-amber-200 flex flex-col gap-3">
            <Kicker tone="text-amber-700">Bộ chặn xin đáp án</Kicker>
            <span className="text-2xl font-mono font-bold tabular-nums text-[#141413]">
              {OPS.guard.blocked}/{OPS.guard.total}
              <span className="text-sm text-amber-700 ml-2">{vn(OPS.guard.pct)}%</span>
            </span>
            <ol className="flex flex-col gap-2">
              {PILOT.iterations.map((it) => (
                <li key={it.week} className="text-[11px] text-stone-600 leading-snug">
                  <span className="font-mono font-semibold text-amber-700">{it.week}: </span>
                  {it.what}. <span className="text-stone-800">{it.fix}.</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </Card>
  );
};

/** Khối "Thí điểm 4 tuần" của Mode 03: KPI, biểu đồ, phễu chi phí, phản hồi. Mọi số đọc từ PILOT. */
export const PilotImpactPanel: React.FC = () => (
  <section className="flex flex-col gap-4" aria-label="Kết quả thí điểm">
    <div className="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <Kicker tone="text-blue-600">Thí điểm {S.weeks} tuần · bán thực nghiệm có nhóm đối chứng</Kicker>
        <h2 className="font-display text-[34px] leading-[1.1] text-[#141413] mt-1">
          Học sinh dùng Socratic Vision Board <em className="text-blue-600">làm đúng câu Đúng/Sai nhiều hơn {vn(PILOT.parts[1].delta)} điểm %</em>
        </h2>
      </div>
      <span className="text-[11px] font-mono text-stone-500">{S.assessment}</span>
    </div>
    <KpiStrip />
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <ScoreDumbbell />
      <PartBars />
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.4fr] gap-4">
      <FunnelCost />
      <FieldNotes />
    </div>
  </section>
);
