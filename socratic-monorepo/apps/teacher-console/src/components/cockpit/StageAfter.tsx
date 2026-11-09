'use client';

import React from 'react';
import Link from 'next/link';
import {useConsole} from '../Shell';
import {ClassMetricsPanel} from '../ClassMetricsPanel';

const card = 'rounded-2xl border border-rule bg-white p-5 shadow-card';
const when = (t: number | null) => (t ? new Date(t * 1000).toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit'}) : '');

/** Trạng thái 3, Sau giờ học: ma trận lớp (bản đồ nhiệt điểm nghẽn nhận thức) và các tiết đã dạy gần nhất. */
export function StageAfter() {
  const {classes, classId, periods} = useConsole();
  const cls = classes.find((c) => c.id === classId);
  const taught = periods.filter((p) => p.status === 'ended' && p.class_id === classId).slice(0, 4);

  if (!cls) return <p className={`${card} max-w-xl text-sm text-mute`}>Chưa có lớp nào. Tạo lớp ở mục Lớp & học sinh để có ma trận.</p>;
  return (
    <div className="flex flex-col gap-4">
      <section data-testid="matrix-card" className={card}>
        <div className="mb-4">
          <div className="text-[10px] font-semibold uppercase tracking-[.14em] text-mute">Ma trận lớp · {cls.name}</div>
          <h2 className="font-serif text-2xl font-medium">Điểm nghẽn nhận thức của lớp</h2>
        </div>
        <ClassMetricsPanel key={cls.id} consoleClassId={cls.id} />
      </section>
      {taught.length > 0 && (
        <section className={card}>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-mute">Tiết đã dạy gần đây</div>
          <ul>
            {taught.map((p) => (
              <li key={p.id} className="border-t border-hair first:border-t-0">
                <Link href={`/periods/${p.id}`} className="flex items-center gap-3 py-2.5 text-sm hover:text-brand-600">
                  <span className="min-w-0 flex-1 truncate font-medium">{p.title}</span>
                  <span className="font-mono text-xs text-mute">{when(p.ended_at ?? p.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
