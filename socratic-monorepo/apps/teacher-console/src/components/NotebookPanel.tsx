'use client';

import React, {useEffect, useState} from 'react';
import {api} from '../lib/api';
import {HubError, hub, type ClassNotebookEntry} from '../lib/hub';

const day = (t: number) => new Date(t * 1000).toLocaleString('vi-VN', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'});

/**
 * Vở ghi "Học theo SGK" của cả lớp: mỗi học sinh một nhóm, mỗi học liệu một dòng dự đoán → kết quả của chính em.
 * Giáo viên đọc để thấy em nghĩ gì trước khi làm và em giải thích kết quả ra sao (không chấm tự động).
 */
export function NotebookPanel({consoleClassId}: {consoleClassId: string}) {
  const [entries, setEntries] = useState<ClassNotebookEntry[] | null>(null);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setEntries(null);
    setError(null);
    // tên học liệu chỉ để đọc cho dễ; thiếu danh mục thì hiện mã
    api.simCatalog().then((sims) => alive && setTitles(Object.fromEntries(sims.map((s) => [s.id, s.title])))).catch(() => undefined);
    hub
      .linkClass(consoleClassId)
      .then(({hubClassId}) => hub.classNotebook(hubClassId))
      .then((r) => alive && setEntries(r))
      .catch((e) => alive && setError(e instanceof HubError ? e.message : 'Không tải được vở ghi của lớp.'));
    return () => {
      alive = false;
    };
  }, [consoleClassId]);

  if (error) return <div data-testid="notebook-panel" className="w-full rounded-lg border border-stuck-bd bg-stuck-bg px-3 py-2 text-sm text-stuck-fg">{error}</div>;
  if (!entries) return <div data-testid="notebook-panel" className="w-full text-sm text-mute">Đang tải vở ghi…</div>;
  if (!entries.length)
    return (
      <p data-testid="notebook-panel" className="w-full text-sm text-mute">
        Chưa có vở ghi nào. Học sinh mở tab “Học theo SGK” trong app sau khi đã nhập mã học sinh, viết dự đoán và kết quả thì vở hiện ở đây.
      </p>
    );

  const byStudent = new Map<string, ClassNotebookEntry[]>();
  for (const e of entries) byStudent.set(e.studentName, [...(byStudent.get(e.studentName) ?? []), e]);

  return (
    <div data-testid="notebook-panel" className="flex w-full flex-col gap-3">
      {[...byStudent].map(([name, list]) => (
        <section key={name} data-testid="notebook-student" className="rounded-xl border border-rule bg-paper p-3">
          <h3 className="mb-2 text-sm font-semibold text-stone-900">
            {name} <span className="font-normal text-stone-500">· {list.filter((e) => e.result.trim()).length}/{list.length} bài đã ghi kết quả</span>
          </h3>
          <ul className="flex flex-col gap-2">
            {list.map((e) => (
              <li key={e.itemKey} className="rounded-lg bg-white p-2.5 text-sm">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium text-stone-900">{titles[e.itemKey] ?? e.itemKey}</span>
                  {e.done && <span className="rounded-full bg-mastery-bg px-2 text-[11px] text-mastery-fg">đã học</span>}
                  <span className="ml-auto text-[11px] text-stone-500">{day(e.updatedAt)}</span>
                </div>
                <p className="mt-1 text-stone-700"><span className="text-stone-500">Dự đoán: </span>{e.prediction || '—'}</p>
                <p className="text-stone-700"><span className="text-stone-500">Kết quả và giải thích: </span>{e.result || <em className="text-stone-400">chưa ghi</em>}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
