'use client';

import React, {useEffect, useState} from 'react';
import {Save, X} from 'lucide-react';
import type {PeriodInput} from '../lib/api';
import type {PlanListItem, ResourceItem} from '../lib/hub';
import type {ClassInfo, LessonMeta, Period, SimEntry} from '../lib/types';

interface Props {
  period: Period;
  classes: ClassInfo[];
  lessons: LessonMeta[];
  disabled?: boolean;
  onSave: (input: PeriodInput) => Promise<void> | void;
  /** lưu các chỉnh sửa hiện có rồi bắt đầu tiết (chỉ hiện khi tiết chưa diễn ra) */
  onStart?: (input: PeriodInput) => Promise<void> | void;
  /** ngân hàng tài nguyên, giáo án và danh mục mô phỏng (không tải được thì để trống, phần còn lại vẫn soạn được) */
  resources?: ResourceItem[];
  plans?: PlanListItem[];
  catalog?: SimEntry[];
}

const toInput = (p: Period): PeriodInput => ({
  title: p.title, class_id: p.class_id, lesson_id: p.lesson_id, goals: p.goals, notes: p.notes, prompts: p.prompts,
  resource_ids: p.resource_ids ?? [], sims: p.sims ?? [], plan_id: p.plan_id ?? null,
});
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const KIND: Record<string, string> = {slides: 'Slide', exercise: 'Bài tập', exam: 'Đề'};
const MAX_SIMS = 12;

/**
 * Chuẩn bị tiết: tên, lớp, bài soạn sẽ nạp lên bảng, mục tiêu, ghi chú riêng của giáo viên, và các đề thu bài đã chuẩn bị sẵn
 * (mỗi dòng một đề; trong lúc dạy bấm một lần là gửi cho cả lớp).
 */
export function PeriodPrep({period, classes, lessons, disabled, onSave, onStart, resources = [], plans = [], catalog = []}: Props) {
  const [f, setF] = useState<PeriodInput>(toInput(period));
  const [promptText, setPromptText] = useState(period.prompts.join('\n'));
  const [saved, setSaved] = useState(false);
  const [simQuery, setSimQuery] = useState('');

  useEffect(() => {
    setF(toInput(period));
    setPromptText(period.prompts.join('\n'));
  }, [period]);

  const cls = classes.find((c) => c.id === f.class_id);
  const field = 'rounded-lg border border-[#DCD9D0] bg-white px-3 py-2 text-sm text-stone-900 disabled:bg-stone-50';
  const label = 'flex flex-col gap-0.5 text-[11px] text-stone-500';
  const build = (): PeriodInput => ({...f, prompts: promptText.split('\n').map((s) => s.trim()).filter(Boolean)});

  return (
    <form
      data-testid="period-prep"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSave(build());
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }}
      className="grid gap-3 rounded-2xl border border-[#E6E4DD] bg-white p-4 sm:grid-cols-2"
    >
      <label className={`${label} sm:col-span-2`}>
        Tên tiết
        <input data-testid="prep-title" className={field} value={f.title} onChange={(e) => setF({...f, title: e.target.value})} maxLength={160} required disabled={disabled} />
      </label>
      <label className={label}>
        Lớp
        <select data-testid="prep-class" className={field} value={f.class_id ?? ''} onChange={(e) => setF({...f, class_id: e.target.value || null})} disabled={disabled}>
          <option value="">(chưa chọn)</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className={label}>
        Bài soạn nạp lên bảng
        <select data-testid="prep-lesson" className={field} value={f.lesson_id ?? ''} onChange={(e) => setF({...f, lesson_id: e.target.value || null})} disabled={disabled}>
          <option value="">(bảng trống)</option>
          {lessons.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
              {l.folder ? ` – ${l.folder}` : ''}
            </option>
          ))}
        </select>
      </label>
      {cls && (cls.notes || cls.size > 0) && (
        <div data-testid="prep-class-context" className="rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-600 sm:col-span-2">
          <b>{cls.name}</b>
          {cls.size ? ` · ${cls.size} học sinh` : ''}
          {cls.notes ? ` — ${cls.notes}` : ''}
        </div>
      )}
      <label className={`${label} sm:col-span-2`}>
        Mục tiêu tiết học
        <textarea data-testid="prep-goals" className={field} rows={2} value={f.goals} onChange={(e) => setF({...f, goals: e.target.value})} maxLength={3000} disabled={disabled} placeholder="Học sinh cần hiểu/làm được gì sau tiết này?" />
      </label>
      <label className={`${label} sm:col-span-2`}>
        Đề thu bài chuẩn bị sẵn (mỗi dòng một đề)
        <textarea data-testid="prep-prompts" className={`${field} font-mono`} rows={3} value={promptText} onChange={(e) => setPromptText(e.target.value)} disabled={disabled} placeholder={'Giải phương trình x² − 5x + 6 = 0\nVẽ đồ thị y = x² − 4'} />
      </label>
      <fieldset data-testid="prep-resources" className="flex flex-col gap-1 sm:col-span-2" disabled={disabled}>
        <legend className="text-[11px] text-stone-500">Tài nguyên mở sẵn trên bảng (slide, bài tập, đề)</legend>
        {resources.length === 0 ? (
          <p className="text-xs text-stone-400">Chưa có tài nguyên. Tải lên ở mục Tài nguyên.</p>
        ) : (
          <div className="flex max-h-40 flex-col gap-0.5 overflow-y-auto rounded-lg border border-[#DCD9D0] p-2">
            {resources.map((r) => {
              const on = (f.resource_ids ?? []).includes(r.id);
              return (
                <label key={r.id} className="flex items-center gap-2 text-sm text-stone-800">
                  <input type="checkbox" data-testid={`prep-res-${r.id}`} checked={on} onChange={() => setF({...f, resource_ids: on ? (f.resource_ids ?? []).filter((x) => x !== r.id) : [...(f.resource_ids ?? []), r.id]})} />
                  <span className="rounded bg-stone-100 px-1.5 text-[10px] text-stone-600">{KIND[r.kind] ?? r.kind}</span>
                  <span className="truncate">{r.title}</span>
                </label>
              );
            })}
          </div>
        )}
      </fieldset>
      <div data-testid="prep-sims" className="flex flex-col gap-1 sm:col-span-2">
        <span className="text-[11px] text-stone-500">Mô phỏng định mở (bảng mở bằng một chạm)</span>
        {(f.sims ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {(f.sims ?? []).map((id) => (
              <span key={id} data-testid="prep-sim-chip" className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-800">
                {catalog.find((c) => c.id === id)?.title ?? id}
                {!disabled && (
                  <button type="button" aria-label="Bỏ mô phỏng" onClick={() => setF({...f, sims: (f.sims ?? []).filter((x) => x !== id)})} className="rounded-full hover:bg-blue-100">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
        {!disabled && catalog.length > 0 && (f.sims ?? []).length < MAX_SIMS && (
          <>
            <input data-testid="prep-sim-search" className={field} value={simQuery} onChange={(e) => setSimQuery(e.target.value)} placeholder="Tìm mô phỏng: con lắc, quang hợp, thí nghiệm…" />
            {fold(simQuery.trim()).length >= 2 && (
              <ul className="max-h-48 overflow-y-auto rounded-lg border border-[#DCD9D0] bg-white">
                {catalog
                  .filter((c) => !(f.sims ?? []).includes(c.id) && fold(c.title).includes(fold(simQuery.trim())))
                  .slice(0, 8)
                  .map((c) => (
                    <li key={c.id}>
                      <button type="button" data-testid={`prep-sim-add-${c.id}`} onClick={() => (setF({...f, sims: [...(f.sims ?? []), c.id]}), setSimQuery(''))} className="w-full px-3 py-1.5 text-left text-sm hover:bg-stone-50">
                        {c.title}
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </>
        )}
      </div>
      <label className={`${label} sm:col-span-2`}>
        Giáo án theo mục (hiện trên bảng để giáo viên bám theo)
        <select data-testid="prep-plan" className={field} value={f.plan_id ?? ''} onChange={(e) => setF({...f, plan_id: e.target.value || null})} disabled={disabled}>
          <option value="">(không dùng giáo án)</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </label>
      <label className={`${label} sm:col-span-2`}>
        Ghi chú riêng (chỉ bạn thấy)
        <textarea data-testid="prep-notes" className={field} rows={3} value={f.notes} onChange={(e) => setF({...f, notes: e.target.value})} maxLength={6000} disabled={disabled} placeholder="Lưu ý khi dạy, câu hỏi gợi mở, lỗi sai thường gặp…" />
      </label>
      {!disabled && (
        <div className="flex items-center gap-2 sm:col-span-2">
          <button data-testid="prep-save" disabled={!f.title.trim()} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
            <Save className="h-4 w-4" /> Lưu chuẩn bị
          </button>
          {onStart && (
            <button type="button" data-testid="prep-start" disabled={!f.title.trim()} onClick={() => void onStart(build())} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
              Bắt đầu tiết
            </button>
          )}
          {saved && (
            <span data-testid="prep-saved" role="status" className="text-xs text-emerald-700">
              Đã lưu.
            </span>
          )}
        </div>
      )}
    </form>
  );
}
