'use client';

import React, {useCallback, useEffect, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {Plus, Radio} from 'lucide-react';
import {ApiError, api} from '../lib/api';
import type {ClassInfo, Period} from '../lib/types';
import {ErrorNote, Shell} from '../components/Shell';

const when = (t: number | null) => (t ? new Date(t * 1000).toLocaleString('vi-VN', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'}) : '');
const STATUS: Record<string, {label: string; cls: string}> = {
  live: {label: 'Đang dạy', cls: 'bg-emerald-100 text-emerald-700'},
  planned: {label: 'Đã soạn', cls: 'bg-blue-50 text-blue-700'},
  ended: {label: 'Đã dạy', cls: 'bg-stone-100 text-stone-600'},
};

function Dashboard() {
  const router = useRouter();
  const [periods, setPeriods] = useState<Period[] | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [title, setTitle] = useState('');
  const [classId, setClassId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([api.periods(), api.classes()]);
      setPeriods(p);
      setClasses(c);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không tải được danh sách.');
      setPeriods([]);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const p = await api.createPeriod({title, class_id: classId || null, lesson_id: null, goals: '', notes: '', prompts: []});
      router.push(`/periods/${p.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không tạo được tiết.');
    }
  };

  const className = (id: string | null) => classes.find((c) => c.id === id)?.name;
  const live = (periods ?? []).filter((p) => p.status === 'live');
  const rest = (periods ?? []).filter((p) => p.status !== 'live');

  return (
    <div className="flex flex-col gap-5">
      <ErrorNote error={error} />
      <form onSubmit={create} data-testid="new-period" className="flex flex-wrap items-end gap-2 rounded-2xl border border-[#E6E4DD] bg-white p-3">
        <label className="flex min-w-[14rem] flex-1 flex-col gap-0.5 text-[11px] text-stone-500">
          Tiết học mới
          <input data-testid="period-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Hàm số bậc hai – tiết 1" maxLength={160} className="rounded-lg border border-[#DCD9D0] px-3 py-2 text-sm text-stone-900" />
        </label>
        <label className="flex w-44 flex-col gap-0.5 text-[11px] text-stone-500">
          Lớp
          <select data-testid="period-class" value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-lg border border-[#DCD9D0] bg-white px-2 py-2 text-sm text-stone-900">
            <option value="">(chưa chọn)</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button data-testid="period-create" disabled={!title.trim()} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
          <Plus className="h-4 w-4" /> Soạn tiết
        </button>
      </form>

      {live.length > 0 && (
        <section data-testid="live-periods" className="flex flex-col gap-2">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
            <Radio className="h-4 w-4" /> Đang dạy
          </h2>
          {live.map((p) => (
            <PeriodRow key={p.id} p={p} cls={className(p.class_id)} />
          ))}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-stone-700">Tiết học của tôi</h2>
        {periods === null && <p className="text-sm text-stone-500">Đang tải…</p>}
        {periods && rest.length === 0 && live.length === 0 && (
          <p data-testid="no-periods" className="rounded-xl bg-white p-6 text-center text-sm text-stone-500">
            Chưa có tiết nào. Soạn tiết đầu tiên ở khung phía trên: chọn lớp, bài soạn, mục tiêu, rồi bắt đầu khi tới giờ dạy.
          </p>
        )}
        {rest.map((p) => (
          <PeriodRow key={p.id} p={p} cls={className(p.class_id)} />
        ))}
      </section>
    </div>
  );
}

function PeriodRow({p, cls}: {p: Period; cls?: string}) {
  const st = STATUS[p.status];
  return (
    <Link href={`/periods/${p.id}`} data-testid="period-row" data-status={p.status} className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E6E4DD] bg-white px-4 py-3 hover:border-blue-300">
      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-stone-900">{p.title}</span>
      {cls && <span className="text-xs text-stone-500">{cls}</span>}
      <span className="font-mono text-[11px] text-stone-400">{when(p.started_at ?? p.created_at)}</span>
      {p.status === 'ended' && p.submission_count > 0 && <span className="text-[11px] text-stone-500">{p.submission_count} bài nộp</span>}
    </Link>
  );
}

export default function Page() {
  return (
    <Shell>
      <Dashboard />
    </Shell>
  );
}
