'use client';

import React, {useEffect, useMemo, useState} from 'react';
import {Check, Plus, Search} from 'lucide-react';
import {ApiError, api} from '../../lib/api';
import type {SimEntry} from '../../lib/types';
import {SUBJECT_HUE, SUBJECT_LABEL} from '../../components/BookShelf';
import {ErrorNote, Shell, useConsole} from '../../components/Shell';

const MAX_SIMS = 12; // giới hạn của máy chủ cho mỗi tiết
const PAGE = 48;
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').toLowerCase();
const ENGINES = ['MATH', 'PHYSICS', 'CHEMISTRY', 'BIOLOGY'];

/** Kho mô phỏng theo chương trình: tìm, lọc theo môn, thêm vào một tiết đã soạn để bảng mở bằng một chạm. */
function Simulations() {
  const {periods, reload} = useConsole();
  const [catalog, setCatalog] = useState<SimEntry[] | null>(null);
  const [q, setQ] = useState('');
  const [engine, setEngine] = useState('all');
  const [target, setTarget] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.simCatalog().then(setCatalog).catch((e) => (setError(e instanceof ApiError ? e.message : 'Không tải được kho mô phỏng.'), setCatalog([])));
  }, []);

  const planned = periods.filter((p) => p.status === 'planned');
  const period = planned.find((p) => p.id === target) ?? null;
  const shown = useMemo(() => {
    const needle = fold(q.trim());
    return (catalog ?? []).filter((c) => (engine === 'all' || c.engine === engine) && (!needle || fold(c.title).includes(needle)));
  }, [catalog, q, engine]);

  const add = async (id: string) => {
    if (!period) return;
    setError(null);
    try {
      await api.updatePeriod(period.id, {
        title: period.title, class_id: period.class_id, lesson_id: period.lesson_id, goals: period.goals, notes: period.notes, prompts: period.prompts,
        resource_ids: period.resource_ids ?? [], sims: [...(period.sims ?? []), id], plan_id: period.plan_id ?? null,
      });
      reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không thêm được mô phỏng.');
    }
  };

  const chip = 'rounded-full border border-rule px-3 py-1 text-xs aria-[pressed=true]:border-ink aria-[pressed=true]:bg-ink aria-[pressed=true]:text-white';
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-serif text-3xl font-medium tracking-tight">Kho mô phỏng</h1>
        <p className="text-sm text-mute">Mô phỏng và phòng thực hành theo chương trình. Thêm vào một tiết đã soạn để mở trên bảng bằng một chạm.</p>
      </div>
      <ErrorNote error={error} />
      <div className="flex flex-wrap items-center gap-2">
        {['all', ...ENGINES].map((e) => (
          <button key={e} data-testid={`sim-engine-${e}`} aria-pressed={engine === e} onClick={() => (setEngine(e), setLimit(PAGE))} className={chip}>
            {e === 'all' ? 'Tất cả' : SUBJECT_LABEL[e]}
          </button>
        ))}
        <label className="relative ml-auto">
          <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-mute" />
          <input data-testid="sim-search" aria-label="Tìm mô phỏng" value={q} onChange={(e) => (setQ(e.target.value), setLimit(PAGE))} placeholder="Tìm: con lắc, quang hợp, thí nghiệm…" className="w-64 rounded-full border border-rule bg-white py-1.5 pl-8 pr-3 text-sm" />
        </label>
        <label className="flex items-center gap-2 text-sm text-mute">
          Thêm vào tiết
          <select data-testid="sim-target" value={target} onChange={(e) => setTarget(e.target.value)} className="rounded-lg border border-rule bg-white px-2 py-1.5 text-sm text-ink">
            <option value="">(chọn tiết đã soạn)</option>
            {planned.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {catalog === null && <p className="text-sm text-mute">Đang tải…</p>}
      {catalog && shown.length === 0 && <p data-testid="sim-empty" className="rounded-xl border border-rule bg-white p-6 text-center text-sm text-mute">Không có mô phỏng nào khớp.</p>}
      <ul data-testid="sim-grid" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shown.slice(0, limit).map((s) => {
          const has = period?.sims?.includes(s.id) ?? false;
          const full = (period?.sims?.length ?? 0) >= MAX_SIMS;
          return (
            <li key={s.id} data-testid="sim-card" className="flex flex-col gap-2 rounded-2xl border border-rule bg-white p-4 shadow-card">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.14em]" style={{color: `hsl(${SUBJECT_HUE[s.engine] ?? SUBJECT_HUE.OTHER} 45% 34%)`}}>
                <span className="h-2 w-2 rounded-full" style={{background: `hsl(${SUBJECT_HUE[s.engine] ?? SUBJECT_HUE.OTHER} 45% 38%)`}} />
                {SUBJECT_LABEL[s.engine] ?? s.engine}
              </div>
              <div className="font-serif text-lg leading-snug">{s.title.replace(/^Thực hành:\s*/, '')}</div>
              <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                <code className="truncate font-mono text-[10px] text-mute">{s.id}</code>
                <button
                  data-testid="sim-add"
                  disabled={!period || has || full}
                  onClick={() => void add(s.id)}
                  title={!period ? 'Chọn tiết ở trên trước' : full ? `Tiết đã có ${MAX_SIMS} mô phỏng` : undefined}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-rule px-2.5 py-1 text-xs font-medium hover:bg-sunk disabled:opacity-40"
                >
                  {has ? <Check className="h-3.5 w-3.5 text-mastery-fg" /> : <Plus className="h-3.5 w-3.5" />}
                  {has ? 'Đã có' : 'Thêm'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {shown.length > limit && (
        <button data-testid="sim-more" onClick={() => setLimit(limit + PAGE)} className="self-center rounded-lg border border-rule px-4 py-2 text-sm font-medium hover:bg-sunk">
          Hiện thêm ({shown.length - limit})
        </button>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Shell>
      <Simulations />
    </Shell>
  );
}
