'use client';

import React, {useEffect, useState} from 'react';
import {HubApiError, hubApi} from '../../utils/hubApi';

type Report = Awaited<ReturnType<typeof hubApi.parentReport>>;
const delta = (n: number, unit: string) => (n === 0 ? 'như tuần trước' : `${n > 0 ? 'nhiều hơn' : 'ít hơn'} ${Math.abs(n)} ${unit} so với tuần trước`);

/** Báo cáo tuần cho phụ huynh qua link bí mật: lời lẽ đơn giản, không biệt ngữ. */
export function ParentReportView({token}: {token: string}) {
  const [data, setData] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    hubApi.parentReport(token).then(setData).catch((e) => setError(e instanceof HubApiError && e.status === 404 ? 'Link báo cáo không còn hiệu lực.' : 'Không tải được báo cáo.'));
  }, [token]);

  if (error) return <main className="p-6 text-center text-sm text-rose-700">{error}</main>;
  if (!data) return <main className="p-6 text-center text-sm text-stone-500">Đang tải báo cáo…</main>;
  const w = data.thisWeek;
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-3 p-4 text-stone-800">
      <h1 className="text-lg font-bold">{data.student.name} · {data.student.className}</h1>
      <p className="rounded-xl bg-emerald-50 p-3 text-sm">{w.comment}</p>
      <ul className="flex flex-col gap-1 text-sm">
        <li>Học {w.activeDays} ngày, {w.minutes} phút ({delta(w.vsLastWeek.minutesDelta, 'phút')}).</li>
        <li>Làm {w.done} bài luyện.</li>
        {w.assignments && w.assignments.total > 0 && <li>Bài thầy cô giao: đúng {w.assignments.correct}/{w.assignments.total} câu, nộp đúng hạn {w.assignments.onTime}/{w.assignments.runs} bài.</li>}
        {w.lessons.length > 0 && <li>Bài học: {w.lessons.join(', ')}.</li>}
        {w.improved.length > 0 && <li>Tiến bộ: {w.improved.join(', ')}.</li>}
        {w.needsHelp.length > 0 && <li>Cần luyện thêm: {w.needsHelp.join(', ')}.</li>}
      </ul>
      {w.tips.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold">Gia đình có thể</h2>
          <ul className="list-disc pl-5 text-sm">{w.tips.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      )}
    </main>
  );
}
