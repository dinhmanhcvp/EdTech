'use client';

import React, {useEffect, useState} from 'react';
import {Save} from 'lucide-react';
import type {PeriodInput} from '../lib/api';
import type {ClassInfo, LessonMeta, Period} from '../lib/types';

interface Props {
  period: Period;
  classes: ClassInfo[];
  lessons: LessonMeta[];
  disabled?: boolean;
  onSave: (input: PeriodInput) => Promise<void> | void;
  /** lưu các chỉnh sửa hiện có rồi bắt đầu tiết (chỉ hiện khi tiết chưa diễn ra) */
  onStart?: (input: PeriodInput) => Promise<void> | void;
}

const toInput = (p: Period): PeriodInput => ({title: p.title, class_id: p.class_id, lesson_id: p.lesson_id, goals: p.goals, notes: p.notes, prompts: p.prompts});

/**
 * Chuẩn bị tiết: tên, lớp, bài soạn sẽ nạp lên bảng, mục tiêu, ghi chú riêng của giáo viên, và các đề thu bài đã chuẩn bị sẵn
 * (mỗi dòng một đề; trong lúc dạy bấm một lần là gửi cho cả lớp).
 */
export function PeriodPrep({period, classes, lessons, disabled, onSave, onStart}: Props) {
  const [f, setF] = useState<PeriodInput>(toInput(period));
  const [promptText, setPromptText] = useState(period.prompts.join('\n'));
  const [saved, setSaved] = useState(false);

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
