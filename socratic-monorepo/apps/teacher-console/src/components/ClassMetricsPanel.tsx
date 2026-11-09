'use client';

import React, {useEffect, useState} from 'react';
import {HubError, hub, supportReason, type ClassMetrics, type StudentMetrics} from '../lib/hub';
import {LEVEL, levelOf} from '../lib/mastery';
import {XRayDrawer} from './XRayDrawer';

const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);
const ago = (t: number | null) => (t ? new Date(t * 1000).toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit'}) : '—');

/** Ô trạng thái dạng pill có chấm tròn phát sáng nhẹ. */
export function StatusPill({p, onClick, label}: {p: number; onClick?: () => void; label?: string}) {
  const lv = LEVEL[levelOf(p)];
  const body = (
    <>
      <span className={`h-1.5 w-1.5 rounded-full ${lv.dot}`} style={{boxShadow: '0 0 6px currentColor'}} />
      {lv.label}
      <span className="font-mono opacity-70">{pct(p)}</span>
    </>
  );
  const cls = `inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${lv.pill}`;
  return onClick ? (
    <button type="button" data-testid="status-pill" data-level={levelOf(p)} aria-label={label} onClick={onClick} className={`${cls} transition-shadow hover:shadow-card`}>
      {body}
    </button>
  ) : (
    <span data-testid="status-pill" data-level={levelOf(p)} className={cls}>
      {body}
    </span>
  );
}

/**
 * Ma trận lớp: mỗi hàng một học sinh, mỗi cột một kiến thức đã có số liệu, ô là mức nắm vững (Đạt chuẩn / Cần gợi mở / Mắc kẹt).
 * Bấm một ô mở ngăn kéo "X-quang nhận thức" với đúng các lần làm bài của em đó.
 */
export function ClassMetricsPanel({consoleClassId}: {consoleClassId: string}) {
  const [m, setM] = useState<ClassMetrics | null>(null);
  const [hubClassId, setHubClassId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<{student: StudentMetrics; kcId: string | null} | null>(null);

  useEffect(() => {
    let alive = true;
    setM(null);
    setError(null);
    hub
      .linkClass(consoleClassId)
      .then(async ({hubClassId: id}) => {
        const r = await hub.classMetrics(id);
        if (alive) (setHubClassId(id), setM(r));
      })
      .catch((e) => alive && setError(e instanceof HubError ? e.message : 'Không tải được chỉ số lớp.'));
    return () => {
      alive = false;
    };
  }, [consoleClassId]);

  if (error) return <div data-testid="metrics-panel" className="w-full rounded-lg border border-stuck-bd bg-stuck-bg px-3 py-2 text-sm text-stuck-fg">{error}</div>;
  if (!m) return <div data-testid="metrics-panel" className="w-full text-sm text-mute">Đang tải chỉ số…</div>;

  const label = (id: string) => m.kcs.find((k) => k.id === id)?.label ?? id;
  // chỉ cột kiến thức đã có số liệu của lớp này (giáo viên có nhiều môn, kho kiến thức dùng chung)
  const kcIds = [...new Set(m.students.flatMap((s) => Object.keys(s.mastery)))];
  const needs = m.students.filter((s) => s.needsSupport);
  const active = m.students.filter((s) => s.done > 0).length;

  return (
    <div data-testid="metrics-panel" className="flex w-full flex-col gap-4">
      {m.students.length === 0 ? (
        <p className="text-sm text-mute">Lớp chưa có học sinh. Thêm học sinh ở mục Lớp & học sinh để bắt đầu theo dõi.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-10 gap-y-3">
            <Stat label="Tiến độ cả lớp" value={pct(m.progress)} testId="metrics-progress" />
            <Stat label="Đã làm bài" value={`${active}/${m.students.length}`} suffix="em" />
            <Stat label="Cần hỗ trợ" value={String(needs.length)} suffix="em" testId="metrics-needs-count" tone={needs.length ? 'text-stuck-fg' : ''} />
          </div>
          {needs.length > 0 && (
            <ul data-testid="metrics-needs" className="flex flex-col gap-1 rounded-xl border border-stuck-bd bg-stuck-bg px-3 py-2 text-sm text-stuck-fg">
              {needs.map((s) => (
                <li key={s.studentId}>
                  <b className="font-semibold">{s.name}</b>: {s.supportReasons.map((r) => supportReason(r, label)).join('; ')}
                </li>
              ))}
            </ul>
          )}
          <div className="overflow-x-auto">
            <table data-testid="metrics-table" className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="text-[10px] font-semibold uppercase tracking-[.1em] text-mute">
                  <th className="py-2 pr-3 font-semibold">Học sinh</th>
                  <th className="px-2 font-semibold">Hoàn thành</th>
                  <th className="px-2 font-semibold" title="Tỉ lệ câu đúng ngay lần đầu">Đúng lần đầu</th>
                  {kcIds.map((k) => (
                    <th key={k} className="max-w-[9rem] px-2 font-semibold" title={label(k)}>
                      <span className="block truncate">{label(k)}</span>
                    </th>
                  ))}
                  <th className="px-2 text-right font-semibold">Lần cuối</th>
                </tr>
              </thead>
              <tbody>
                {m.students.map((s) => {
                  const done = s.total ? s.done / s.total : 0;
                  return (
                    <tr key={s.studentId} data-testid="metrics-row" className="border-t border-hair">
                      <td className="py-2.5 pr-3">
                        <button type="button" onClick={() => setOpen({student: s, kcId: null})} className={`text-left font-medium hover:underline ${s.needsSupport ? 'text-stuck-fg' : 'text-ink'}`}>
                          {s.name}
                        </button>
                      </td>
                      <td className="min-w-[6.5rem] px-2">
                        <div className="font-mono text-xs">{s.done}/{s.total}</div>
                        <div className="mt-1 h-[3px] w-full overflow-hidden rounded-full bg-sunk" role="presentation">
                          <div className="h-full rounded-full bg-ink" style={{width: `${Math.round(done * 100)}%`}} />
                        </div>
                      </td>
                      <td className="px-2 font-mono text-xs">{pct(s.firstTryRate)}</td>
                      {kcIds.map((k) => (
                        <td key={k} className="px-2">
                          {s.mastery[k] === undefined ? <span className="text-mute">·</span> : <StatusPill p={s.mastery[k]} label={`${s.name}, ${label(k)}: mở X-quang nhận thức`} onClick={() => setOpen({student: s, kcId: k})} />}
                        </td>
                      ))}
                      <td className="px-2 text-right font-mono text-xs text-mute">{ago(s.lastActive)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {kcIds.length === 0 && <p className="text-sm text-mute">Chưa có số liệu theo kiến thức: cần giao bài tập có gắn kiến thức và để học sinh làm bài.</p>}
          <p className="text-xs text-mute">Mắc kẹt dưới 40% · Cần gợi mở 40–70% · Đạt chuẩn từ 70% (xác suất đã nắm vững, ước lượng từ các lần làm bài). Bấm một ô để xem chi tiết.</p>
        </>
      )}
      {open && hubClassId && <XRayDrawer student={open.student} kcId={open.kcId} hubClassId={hubClassId} kcLabel={label} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Stat({label, value, suffix, testId, tone = ''}: {label: string; value: string; suffix?: string; testId?: string; tone?: string}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[.12em] text-mute">{label}</div>
      <div className={`font-serif text-3xl leading-tight ${tone}`}>
        <span data-testid={testId} className="font-mono text-2xl">{value}</span>
        {suffix && <span className="ml-1 text-sm text-mute">{suffix}</span>}
      </div>
    </div>
  );
}
