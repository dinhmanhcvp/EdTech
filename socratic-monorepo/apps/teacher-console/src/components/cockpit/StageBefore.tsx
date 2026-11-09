'use client';

import React, {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {ArrowRight, Check, Circle} from 'lucide-react';
import {ApiError, api} from '../../lib/api';
import {buildBriefing, withAdvice} from '../../lib/briefing';
import {HubError, hub, type ClassMetrics} from '../../lib/hub';
import {startAndRemember} from '../../lib/pairing';
import {buildScenes, type Scene} from '../../lib/timeline';
import type {Period} from '../../lib/types';
import {useConsole, useTeacher} from '../Shell';
import {LessonTimeline} from './LessonTimeline';

const card = 'rounded-2xl border border-rule bg-white p-5 shadow-card';
const eyebrow = 'text-[10px] font-semibold uppercase tracking-[.14em] text-mute';
const greeting = (h: number) => (h < 11 ? 'Chào buổi sáng' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối');

/** Giữ nguyên mọi trường của tiết khi chỉ sửa một trường (API PUT nhận cả bộ). */
const asInput = (p: Period, over: Partial<Period> = {}) => {
  const q = {...p, ...over};
  return {title: q.title, class_id: q.class_id, lesson_id: q.lesson_id, goals: q.goals, notes: q.notes, prompts: q.prompts, resource_ids: q.resource_ids ?? [], sims: q.sims ?? [], plan_id: q.plan_id ?? null};
};

/** Trạng thái 1, Trước giờ học: tóm tắt sáng từ số liệu học sau giờ, tiết kế tiếp và kịch bản của nó dạng playlist. */
export function StageBefore() {
  const {classes, classId, periods, reload, setStage} = useConsole();
  const teacher = useTeacher();
  const cls = classes.find((c) => c.id === classId);
  const next = useMemo(() => periods.filter((p) => p.status === 'planned' && (!classId || p.class_id === classId)).sort((a, b) => a.created_at - b.created_at)[0], [periods, classId]);

  const [metrics, setMetrics] = useState<ClassMetrics | null | 'error'>(null);
  const [scenes, setScenes] = useState<Scene[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setMetrics(null);
    if (!cls) return;
    hub
      .linkClass(cls.id)
      .then(({hubClassId}) => hub.classMetrics(hubClassId))
      .then((m) => alive && setMetrics(m))
      .catch(() => alive && setMetrics('error'));
    return () => {
      alive = false;
    };
  }, [cls]);

  useEffect(() => {
    let alive = true;
    setScenes(null);
    if (!next) return setScenes([]);
    // thiếu một nguồn (mạng, đã xóa) thì dựng tiếp từ các nguồn còn lại
    const safe = <T,>(f: () => Promise<T>, fallback: T) => f().catch(() => fallback);
    void Promise.all([
      next.plan_id ? safe(() => hub.plan(next.plan_id as string).then((p) => p.body), null) : Promise.resolve(null),
      safe(() => hub.resources(), []),
      safe(() => api.simCatalog(), []),
      next.lesson_id ? safe(() => api.lessons(), []) : Promise.resolve([]),
    ]).then(([plan, resources, catalog, lessons]) => {
      if (!alive) return;
      setScenes(buildScenes({lessonTitle: lessons.find((l) => l.id === next.lesson_id)?.title ?? null, plan, resources: (next.resource_ids ?? []).map((id) => resources.find((r) => r.id === id)).filter((r): r is NonNullable<typeof r> => !!r), sims: next.sims ?? [], catalog}));
    });
    return () => {
      alive = false;
    };
  }, [next]);

  const briefing = useMemo(() => (cls && metrics && metrics !== 'error' ? buildBriefing(cls.name, metrics, Date.now() / 1000) : null), [cls, metrics]);

  const push = async () => {
    if (!next || !briefing?.advice) return;
    setError(null);
    try {
      await api.updatePeriod(next.id, asInput(next, {notes: withAdvice(next.notes, briefing.advice)}));
      setNote(`Đã thêm gợi ý vào ghi chú của “${next.title}”. Mở tiết để xem.`);
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không cập nhật được tiết.');
    }
  };

  const start = async () => {
    if (!next) return;
    setError(null);
    try {
      await startAndRemember(next.id);
      reload();
      setStage('live');
    } catch (e) {
      setError(e instanceof ApiError || e instanceof HubError ? e.message : 'Không bắt đầu được tiết.');
    }
  };

  const ready: [string, boolean, string?][] = next
    ? [['Bài soạn trên bảng', !!next.lesson_id], ['Giáo án', !!next.plan_id], ['Tài nguyên', (next.resource_ids?.length ?? 0) > 0, `${next.resource_ids?.length ?? 0}`], ['Mô phỏng', (next.sims?.length ?? 0) > 0, `${next.sims?.length ?? 0}`], ['Mục tiêu', !!next.goals.trim()]]
    : [];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <section data-testid="briefing" className={`${card} lg:col-span-8`}>
        <div className={eyebrow}>Tóm tắt sáng{cls ? ` · Lớp ${cls.name}` : ''}</div>
        <h2 className="mt-1 font-serif text-2xl font-medium">
          {greeting(new Date().getHours())}
          {teacher ? `, ${teacher.display_name}` : ''}.
        </h2>
        {!cls && <p className="mt-3 text-sm text-mute">Chưa có lớp nào. Tạo lớp và thêm học sinh ở mục Lớp & học sinh để có tóm tắt.</p>}
        {cls && metrics === null && <p className="mt-3 text-sm text-mute">Đang đọc số liệu của lớp…</p>}
        {cls && metrics === 'error' && <p className="mt-3 text-sm text-mute">Chưa đọc được số liệu của lớp. Kiểm tra kết nối máy chủ rồi tải lại.</p>}
        {briefing && (
          <div className="mt-3 flex flex-col gap-2">
            {briefing.sentences.map((s) => (
              <p key={s} className="font-serif text-lg leading-relaxed text-ink/90">
                {s}
              </p>
            ))}
          </div>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-hair pt-4">
          <button data-testid="briefing-push" disabled={!next || !briefing?.advice} onClick={() => void push()} className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40">
            Đẩy vào kịch bản tiết{next ? ` “${next.title}”` : ''} <ArrowRight className="h-4 w-4" />
          </button>
          <span className="text-xs text-mute">{!next ? 'Chưa có tiết đã soạn để đẩy vào.' : !briefing?.advice ? 'Chưa đủ số liệu để gợi ý.' : 'Thêm một dòng gợi ý vào ghi chú của tiết. Tính trực tiếp từ số liệu, không qua AI.'}</span>
        </div>
        {note && <p data-testid="briefing-note" role="status" className="mt-3 rounded-lg border border-mastery-bd bg-mastery-bg px-3 py-2 text-sm text-mastery-fg">{note}</p>}
        {error && <p role="alert" className="mt-3 rounded-lg border border-stuck-bd bg-stuck-bg px-3 py-2 text-sm text-stuck-fg">{error}</p>}
      </section>

      <section data-testid="next-period" className={`${card} flex flex-col gap-3 lg:col-span-4`}>
        <div className={eyebrow}>Tiết kế tiếp</div>
        {next ? (
          <>
            <h2 className="font-serif text-2xl font-medium leading-tight">{next.title}</h2>
            {next.goals && <p className="line-clamp-3 text-sm text-mute">{next.goals}</p>}
            <ul className="flex flex-col gap-1 text-sm">
              {ready.map(([label, ok, n]) => (
                <li key={label} className="flex items-center gap-2" data-ready={ok ? '1' : '0'}>
                  {ok ? <Check className="h-3.5 w-3.5 text-mastery-fg" /> : <Circle className="h-3.5 w-3.5 text-mute" />}
                  <span className={ok ? 'text-ink' : 'text-mute'}>{label}</span>
                  {ok && n && <span className="ml-auto font-mono text-xs text-mute">{n}</span>}
                </li>
              ))}
            </ul>
            <div className="mt-auto flex gap-2 pt-2">
              <Link href={`/periods/${next.id}`} className="flex-1 rounded-lg border border-rule px-3 py-2 text-center text-sm font-medium hover:bg-sunk">
                Soạn tiết
              </Link>
              <button data-testid="next-start" onClick={() => void start()} className="flex-1 rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-white hover:bg-ink/85">
                Bắt đầu tiết
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-mute">Chưa có tiết nào đã soạn{cls ? ` cho lớp ${cls.name}` : ''}.</p>
            <Link href="/periods" className="mt-auto rounded-lg border border-rule px-3 py-2 text-center text-sm font-medium hover:bg-sunk">
              Soạn tiết mới
            </Link>
          </>
        )}
      </section>

      <section className={`${card} lg:col-span-12`}>
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <div className={eyebrow}>Kịch bản tiết học</div>
            <h2 className="font-serif text-xl font-medium">{next ? next.title : 'Chưa chọn tiết'}</h2>
          </div>
          {next && (
            <Link href="/plans" className="text-xs font-medium text-brand-600 hover:underline">
              Sửa thứ tự ở Giáo án
            </Link>
          )}
        </div>
        {next ? <LessonTimeline scenes={scenes} periodId={next.id} /> : <p className="text-sm text-mute">Soạn một tiết để dựng kịch bản.</p>}
      </section>
    </div>
  );
}
