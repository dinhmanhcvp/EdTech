import React from 'react';
import Link from 'next/link';
import {FileText, FlaskConical, LayoutTemplate, MonitorUp} from 'lucide-react';
import type {Scene} from '../../lib/timeline';

const ICON = {board: MonitorUp, plan: LayoutTemplate, sim: FlaskConical, resource: FileText};

/** Kịch bản tiết học như một dải thẻ ngang (playlist): bảng soạn sẵn, từng phần giáo án, mô phỏng, tài nguyên. */
export function LessonTimeline({scenes, periodId}: {scenes: Scene[] | null; periodId: string}) {
  if (scenes === null) return <p className="text-sm text-mute">Đang dựng kịch bản…</p>;
  if (scenes.length === 0)
    return (
      <p data-testid="timeline-empty" className="text-sm text-mute">
        Tiết này chưa có gì để dựng kịch bản.{' '}
        <Link href={`/periods/${periodId}`} className="font-medium text-brand-600 underline">
          Gắn giáo án, tài nguyên hoặc mô phỏng
        </Link>
        .
      </p>
    );
  return (
    <ol data-testid="timeline" className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
      {scenes.map((s, i) => {
        const Icon = ICON[s.kind];
        return (
          <li key={s.key} data-testid="scene" data-kind={s.kind} className="relative flex w-56 shrink-0 flex-col gap-2 rounded-xl border border-rule bg-paper p-3.5">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[.14em] text-mute">
              <span>Cảnh {i + 1}</span>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="font-serif text-lg leading-snug">{s.title}</div>
            <div className="line-clamp-2 text-xs text-mute">{s.detail}</div>
            {s.chips.length > 0 && (
              <div className="mt-auto flex flex-wrap gap-1">
                {s.chips.map((c) => (
                  <span key={c} className="rounded-full border border-rule bg-white px-2 py-0.5 font-mono text-[10px] text-mute">
                    {c}
                  </span>
                ))}
              </div>
            )}
            {i < scenes.length - 1 && <span aria-hidden className="absolute -right-[13px] top-1/2 z-10 h-px w-3.5 bg-rule" />}
          </li>
        );
      })}
    </ol>
  );
}
