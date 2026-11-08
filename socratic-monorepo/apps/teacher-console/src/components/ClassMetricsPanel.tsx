'use client';

import React, {useEffect, useState} from 'react';
import {HubError, hub, supportReason, type ClassMetrics} from '../lib/hub';

const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`);
const ago = (t: number | null) => (t ? new Date(t * 1000).toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit'}) : '—');
/** mức nắm vững 0–1 → màu ô bản đồ nhiệt (đỏ yếu → xanh vững); chưa có dữ liệu thì để trống */
const cell = (p: number | undefined) => (p === undefined ? 'bg-stone-50 text-stone-300' : p < 0.4 ? 'bg-rose-100 text-rose-800' : p < 0.7 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800');

/** Chỉ số của một lớp (đọc từ hub): ai cần hỗ trợ, tiến độ làm bài, mức nắm vững từng kiến thức. Dùng để chuẩn bị tiết sau. */
export function ClassMetricsPanel({consoleClassId}: {consoleClassId: string}) {
  const [m, setM] = useState<ClassMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    hub
      .linkClass(consoleClassId)
      .then(({hubClassId}) => hub.classMetrics(hubClassId))
      .then((r) => alive && setM(r))
      .catch((e) => alive && setError(e instanceof HubError ? e.message : 'Không tải được chỉ số lớp.'));
    return () => {
      alive = false;
    };
  }, [consoleClassId]);

  if (error) return <div data-testid="metrics-panel" className="mt-2 w-full rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>;
  if (!m) return <div data-testid="metrics-panel" className="mt-2 w-full text-xs text-stone-500">Đang tải chỉ số…</div>;

  const label = (id: string) => m.kcs.find((k) => k.id === id)?.label ?? id;
  // cột bản đồ nhiệt: mọi kiến thức có nhãn hoặc đã có số liệu của ít nhất một em
  const kcIds = [...new Set([...m.kcs.map((k) => k.id), ...m.students.flatMap((s) => Object.keys(s.mastery))])];
  const needs = m.students.filter((s) => s.needsSupport);
  const active = m.students.filter((s) => s.done > 0).length;

  return (
    <div data-testid="metrics-panel" className="mt-2 flex w-full flex-col gap-3 rounded-xl border border-[#E6E4DD] bg-stone-50 p-3 text-xs">
      {m.students.length === 0 ? (
        <p className="text-stone-500">Lớp chưa có học sinh. Thêm học sinh ở nút danh sách lớp để bắt đầu theo dõi.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-4 text-stone-700">
            <span>Tiến độ cả lớp: <b data-testid="metrics-progress">{pct(m.progress)}</b></span>
            <span>Đã làm bài: <b>{active}/{m.students.length}</b> em</span>
            <span>Cần hỗ trợ: <b data-testid="metrics-needs-count" className={needs.length ? 'text-rose-700' : ''}>{needs.length}</b> em</span>
          </div>
          {needs.length > 0 && (
            <ul data-testid="metrics-needs" className="flex flex-col gap-1 rounded-lg bg-rose-50 p-2 text-rose-900">
              {needs.map((s) => (
                <li key={s.studentId}><b>{s.name}</b>: {s.supportReasons.map((r) => supportReason(r, label)).join('; ')}</li>
              ))}
            </ul>
          )}
          <div className="overflow-x-auto">
            <table data-testid="metrics-table" className="w-full border-collapse text-left">
              <thead className="text-stone-500">
                <tr>
                  <th className="py-1 pr-2">Học sinh</th>
                  <th className="px-1">Đã làm</th>
                  <th className="px-1" title="Tỉ lệ câu đúng ngay lần đầu">Đúng lần đầu</th>
                  <th className="px-1" title="Số gợi ý trung bình mỗi câu">Gợi ý/câu</th>
                  <th className="px-1">Phút học</th>
                  <th className="px-1">Lần cuối</th>
                  {kcIds.map((k) => (
                    <th key={k} className="max-w-[6rem] truncate px-1" title={label(k)}>{label(k)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {m.students.map((s) => (
                  <tr key={s.studentId} data-testid="metrics-row" className="border-t border-[#E6E4DD]">
                    <td className={`py-1 pr-2 font-medium ${s.needsSupport ? 'text-rose-700' : 'text-stone-800'}`}>{s.name}</td>
                    <td className="px-1">{s.done}/{s.total}</td>
                    <td className="px-1">{pct(s.firstTryRate)}</td>
                    <td className="px-1">{s.hintsPerItem}</td>
                    <td className="px-1">{s.minutes}</td>
                    <td className="px-1">{ago(s.lastActive)}</td>
                    {kcIds.map((k) => (
                      <td key={k} className="px-0.5 py-0.5">
                        <span className={`block rounded px-1 text-center ${cell(s.mastery[k])}`}>{s.mastery[k] === undefined ? '·' : pct(s.mastery[k])}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {kcIds.length === 0 && <p className="text-stone-500">Chưa có kiến thức nào được gắn. Gắn kiến thức vào câu bài tập hoặc giáo án để thấy bản đồ nắm vững.</p>}
          <p className="text-stone-400">Màu: đỏ dưới 40% · vàng 40–70% · xanh trên 70% (xác suất đã nắm vững, ước lượng từ các lần làm bài).</p>
        </>
      )}
    </div>
  );
}
