'use client';

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {Pencil, Trash2, Upload} from 'lucide-react';
import {HubError, hub, type ResourceItem, type ResourceKind} from '../lib/hub';
import {BookShelf, SUBJECT_HUE, SUBJECT_LABEL, type Book} from './BookShelf';

export const KIND_LABEL: Record<ResourceKind, string> = {slides: 'Slide', exercise: 'Bài tập', exam: 'Đề'};
const SUBJECTS: [string, string][] = [['MATH', 'Toán'], ['PHYSICS', 'Vật lí'], ['CHEMISTRY', 'Hóa học'], ['BIOLOGY', 'Sinh học']];

/** Kho tài nguyên của giáo viên (đỉnh 1): slide, bài tập, đề — mở được trên bảng. */
export function ResourceList() {
  const [items, setItems] = useState<ResourceItem[] | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{title: string; subject: string; kind: ResourceKind; files: File[]}>({title: '', subject: 'MATH', kind: 'exercise', files: []});
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await hub.resources());
    } catch (e) {
      setError(e instanceof HubError ? e.message : 'Không tải được tài nguyên.');
      setItems([]);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const books = useMemo<Book[] | null>(
    () =>
      items &&
      items.map((r) => ({
        id: r.id,
        title: r.title,
        tag: `${KIND_LABEL[r.kind]} · ${SUBJECT_LABEL[r.subject] ?? r.subject}`,
        meta: `${r.pageCount} trang`,
        hue: SUBJECT_HUE[r.subject] ?? SUBJECT_HUE.OTHER,
        group: r.kind,
        search: r.title.toLowerCase(),
        note: r.kind !== 'slides' && r.currentVersion === 0 ? 'Chưa duyệt câu' : undefined,
      })),
    [items],
  );
  // ảnh trang đầu làm bìa (mất quyền hoặc lỗi mạng thì dùng bìa tự vẽ)
  const loadCover = useCallback(async (id: string) => (items?.find((r) => r.id === id)?.pageCount ? await hub.pageBlobUrl(id, 0) : null), [items]);

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.files.length || !form.title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await hub.upload({...form, title: form.title.trim()});
      setForm({...form, title: '', files: []});
      await load();
      if (r?.id) setFocusId(r.id); // cuốn vừa lưu mở bìa ngay trên kệ
    } catch (err) {
      setError(err instanceof HubError ? err.message : 'Không tải lên được.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await hub.remove(id);
      setConfirmDel(null);
      await load();
    } catch (err) {
      setConfirmDel(null);
      setError(err instanceof HubError ? err.message : 'Không xóa được.');
    }
  };

  const f = 'rounded-lg border border-[#DCD9D0] px-3 py-2 text-sm';
  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-serif text-2xl font-medium tracking-tight">Tài nguyên</h1>
      {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      <form onSubmit={upload} className="grid gap-2 rounded-2xl border border-rule bg-white shadow-card p-3 sm:grid-cols-[1fr_8rem_8rem]">
        <input data-testid="upload-title" className={f} placeholder="Tên (VD: Đề 15 phút hàm số)" value={form.title} maxLength={160} onChange={(e) => setForm({...form, title: e.target.value})} />
        <select data-testid="upload-kind" className={f} value={form.kind} onChange={(e) => setForm({...form, kind: e.target.value as ResourceKind})}>
          {(Object.keys(KIND_LABEL) as ResourceKind[]).map((k) => (
            <option key={k} value={k}>{KIND_LABEL[k]}</option>
          ))}
        </select>
        <select data-testid="upload-subject" className={f} value={form.subject} onChange={(e) => setForm({...form, subject: e.target.value})}>
          {SUBJECTS.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <input data-testid="upload-file" type="file" multiple accept="application/pdf,image/*" className="text-sm sm:col-span-2" onChange={(e) => setForm({...form, files: Array.from(e.target.files || [])})} />
        <button data-testid="upload-submit" disabled={busy || !form.files.length || !form.title.trim()} className="flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
          <Upload className="h-4 w-4" /> {busy ? 'Đang tải…' : 'Tải lên'}
        </button>
        <p className="text-xs text-stone-500 sm:col-span-3">Một file PDF (tối đa 20 trang, 15 MB) hoặc nhiều ảnh. File Word/PowerPoint hãy xuất sang PDF trước.</p>
      </form>

      <BookShelf
        testId="resource-list"
        books={books}
        focusId={focusId}
        loadCover={loadCover}
        tabs={(Object.keys(KIND_LABEL) as ResourceKind[]).map((k) => ({key: k, label: KIND_LABEL[k], testId: `kind-${k}`}))}
        searchPlaceholder="Tìm theo tên"
        emptyAll="Kệ còn trống. Tải slide, bài tập hoặc đề lên để bắt đầu."
        actions={(b) => (
          <div className="flex items-center gap-1">
            <Link href={`/resources/${b.id}`} data-testid="resource-open" className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">
              <Pencil className="h-3.5 w-3.5" /> Mở & soạn câu
            </Link>
            {confirmDel === b.id ? (
              <span className="flex items-center gap-1 text-xs">
                Xóa?
                <button data-testid="resource-confirm-delete" onClick={() => remove(b.id)} className="rounded-lg bg-rose-600 px-2 py-1 font-semibold text-white">Xóa</button>
                <button onClick={() => setConfirmDel(null)} className="rounded-lg px-2 py-1 text-stone-500 hover:bg-stone-100">Hủy</button>
              </span>
            ) : (
              <button data-testid="resource-delete" aria-label="Xóa tài nguyên" onClick={() => setConfirmDel(b.id)} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      />
    </div>
  );
}
