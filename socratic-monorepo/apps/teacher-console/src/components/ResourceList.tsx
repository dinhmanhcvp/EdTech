'use client';

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {FileText, Trash2, Upload} from 'lucide-react';
import {HubError, hub, type ResourceItem, type ResourceKind} from '../lib/hub';

export const KIND_LABEL: Record<ResourceKind, string> = {slides: 'Slide', exercise: 'Bài tập', exam: 'Đề'};
const SUBJECTS: [string, string][] = [['MATH', 'Toán'], ['PHYSICS', 'Vật lí'], ['CHEMISTRY', 'Hóa học'], ['BIOLOGY', 'Sinh học']];

/** Kho tài nguyên của giáo viên (đỉnh 1): slide, bài tập, đề — mở được trên bảng. */
export function ResourceList() {
  const [items, setItems] = useState<ResourceItem[] | null>(null);
  const [kind, setKind] = useState<ResourceKind | 'all'>('all');
  const [q, setQ] = useState('');
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

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (items || []).filter((i) => (kind === 'all' || i.kind === kind) && (!needle || i.title.toLowerCase().includes(needle)));
  }, [items, kind, q]);

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.files.length || !form.title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await hub.upload({...form, title: form.title.trim()});
      setForm({...form, title: '', files: []});
      await load();
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
      <h1 className="text-lg font-semibold">Tài nguyên</h1>
      {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      <form onSubmit={upload} className="grid gap-2 rounded-2xl border border-[#E6E4DD] bg-white p-3 sm:grid-cols-[1fr_8rem_8rem]">
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
        <button data-testid="upload-submit" disabled={busy || !form.files.length || !form.title.trim()} className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
          <Upload className="h-4 w-4" /> {busy ? 'Đang tải…' : 'Tải lên'}
        </button>
        <p className="text-xs text-stone-500 sm:col-span-3">Một file PDF (tối đa 20 trang, 15 MB) hoặc nhiều ảnh. File Word/PowerPoint hãy xuất sang PDF trước.</p>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'slides', 'exercise', 'exam'] as const).map((k) => (
          <button key={k} data-testid={`kind-${k}`} aria-pressed={kind === k} onClick={() => setKind(k)} className="rounded-full border border-[#DCD9D0] px-3 py-1 text-xs aria-[pressed=true]:border-blue-600 aria-[pressed=true]:bg-blue-50 aria-[pressed=true]:text-blue-700">
            {k === 'all' ? 'Tất cả' : KIND_LABEL[k]}
          </button>
        ))}
        <input className={`${f} ml-auto w-56 py-1`} placeholder="Tìm theo tên" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <ul className="flex flex-col gap-2" data-testid="resource-list">
        {items === null && <li className="text-sm text-stone-500">Đang tải…</li>}
        {items !== null && shown.length === 0 && <li className="rounded-xl bg-white p-6 text-center text-sm text-stone-500">Chưa có tài nguyên nào.</li>}
        {shown.map((r) => (
          <li key={r.id} className="flex items-center gap-3 rounded-xl border border-[#E6E4DD] bg-white px-4 py-3">
            <FileText className="h-5 w-5 text-stone-400" />
            <div className="min-w-0 flex-1">
              <Link href={`/resources/${r.id}`} className="text-sm font-semibold text-stone-900 hover:underline">{r.title}</Link>
              <div className="text-xs text-stone-500">
                {KIND_LABEL[r.kind]} · {r.pageCount} trang
                {r.kind !== 'slides' && r.currentVersion === 0 && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">Chưa duyệt câu</span>}
              </div>
            </div>
            {confirmDel === r.id ? (
              <span className="flex items-center gap-1 text-xs">
                Xóa?
                <button data-testid="resource-confirm-delete" onClick={() => remove(r.id)} className="rounded-lg bg-rose-600 px-2 py-1 font-semibold text-white">Xóa</button>
                <button onClick={() => setConfirmDel(null)} className="rounded-lg px-2 py-1 text-stone-500 hover:bg-stone-100">Hủy</button>
              </span>
            ) : (
              <button data-testid="resource-delete" aria-label="Xóa tài nguyên" onClick={() => setConfirmDel(r.id)} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
