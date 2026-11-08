'use client';

import React, {useCallback, useEffect, useState} from 'react';
import {Plus} from 'lucide-react';
import {api} from '../../lib/api';
import {HubError, hub, type PlanListItem} from '../../lib/hub';
import type {ClassInfo, SimEntry} from '../../lib/types';
import {ErrorNote, Shell} from '../../components/Shell';
import {PlanEditor} from '../../components/PlanEditor';

const SUBJECT: Record<string, string> = {MATH: 'Toán', PHYSICS: 'Vật lí', CHEMISTRY: 'Hóa học', BIOLOGY: 'Sinh học'};

function Plans() {
  const [plans, setPlans] = useState<PlanListItem[] | null>(null);
  const [current, setCurrent] = useState<string | null | undefined>(undefined); // undefined = chưa mở; null = giáo án mới
  const [catalog, setCatalog] = useState<SimEntry[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setPlans(await hub.plans());
    } catch (e) {
      setError(e instanceof HubError ? e.message : 'Không tải được giáo án.');
      setPlans([]);
    }
  }, []);
  useEffect(() => {
    void load();
    api.simCatalog().then(setCatalog).catch(() => setCatalog([]));
    api.classes().then(setClasses).catch(() => setClasses([]));
  }, [load]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="flex-1 text-lg font-semibold">Giáo án theo mục</h1>
        <button data-testid="plan-new" onClick={() => setCurrent(null)} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Giáo án mới
        </button>
      </div>
      <p className="text-sm text-stone-600">
        Mỗi giáo án chia thành phần: mục tiêu, kiến thức, công thức, bài tập, mô phỏng, câu hỏi nhanh. Gắn giáo án vào tiết ở trang soạn tiết để bảng hiện đúng trình tự; sau khi lớp học, AI đọc kết quả của lớp và gợi ý sửa từng phần.
      </p>
      <ErrorNote error={error} />
      <ul data-testid="plan-list" className="flex flex-wrap gap-2">
        {plans === null && <li className="text-sm text-stone-500">Đang tải…</li>}
        {plans?.length === 0 && current === undefined && <li className="text-sm text-stone-500">Chưa có giáo án nào.</li>}
        {plans?.map((p) => (
          <li key={p.id}>
            <button data-testid="plan-open" aria-pressed={current === p.id} onClick={() => setCurrent(p.id)} className="rounded-xl border border-[#E6E4DD] bg-white px-3 py-2 text-left text-sm hover:bg-stone-50 aria-[pressed=true]:border-blue-500 aria-[pressed=true]:bg-blue-50">
              <span className="block font-semibold text-stone-900">{p.title}</span>
              <span className="text-xs text-stone-500">{SUBJECT[p.subject] ?? p.subject} · phiên bản {p.currentVersion}</span>
            </button>
          </li>
        ))}
      </ul>
      {current !== undefined && (
        <PlanEditor
          key={current ?? 'new'}
          planId={current}
          catalog={catalog}
          classes={classes}
          onSaved={(id) => {
            setCurrent(id);
            void load();
          }}
        />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Shell>
      <Plans />
    </Shell>
  );
}
