'use client';

import React, {useCallback, useEffect, useState} from 'react';
import {Pencil, Trash2} from 'lucide-react';
import {ApiError, api} from '../../lib/api';
import type {ClassInfo} from '../../lib/types';
import {ErrorNote, Shell} from '../../components/Shell';

const EMPTY: Omit<ClassInfo, 'id'> = {name: '', grade: '', subject: '', size: 0, notes: ''};

function Classes() {
  const [list, setList] = useState<ClassInfo[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setList(await api.classes());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không tải được danh sách lớp.');
      setList([]);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.saveClass(form, editing ?? undefined);
      setForm(EMPTY);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không lưu được lớp.');
    }
  };

  const f = 'rounded-lg border border-[#DCD9D0] px-3 py-2 text-sm';
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-lg font-semibold">Lớp của tôi</h1>
      <ErrorNote error={error} />
      <form onSubmit={save} data-testid="class-form" className="grid gap-2 rounded-2xl border border-[#E6E4DD] bg-white p-3 sm:grid-cols-[1fr_6rem_9rem_6rem]">
        <input data-testid="class-name" className={f} placeholder="Tên lớp (VD: 10A1)" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} maxLength={80} required />
        <input data-testid="class-grade" className={f} placeholder="Khối" value={form.grade} onChange={(e) => setForm({...form, grade: e.target.value})} maxLength={30} />
        <input data-testid="class-subject" className={f} placeholder="Môn" value={form.subject} onChange={(e) => setForm({...form, subject: e.target.value})} maxLength={60} />
        <input data-testid="class-size" className={f} type="number" min={0} max={200} placeholder="Sĩ số" value={form.size || ''} onChange={(e) => setForm({...form, size: Number(e.target.value) || 0})} />
        <textarea data-testid="class-notes" className={`${f} sm:col-span-4`} rows={2} placeholder="Ghi chú về lớp: trình độ, học sinh cần hỗ trợ, điều đã dạy… (AI sẽ dùng làm ngữ cảnh ở bản sau)" value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} maxLength={3000} />
        <div className="flex gap-2 sm:col-span-4">
          <button data-testid="class-save" disabled={!form.name.trim()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40">
            {editing ? 'Cập nhật lớp' : 'Thêm lớp'}
          </button>
          {editing && (
            <button type="button" onClick={() => (setEditing(null), setForm(EMPTY))} className="rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-stone-100">
              Hủy sửa
            </button>
          )}
        </div>
      </form>

      <ul className="flex flex-col gap-2" data-testid="class-list">
        {list === null && <li className="text-sm text-stone-500">Đang tải…</li>}
        {list?.length === 0 && <li className="rounded-xl bg-white p-6 text-center text-sm text-stone-500">Chưa có lớp nào.</li>}
        {list?.map((c) => (
          <li key={c.id} data-testid="class-item" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E6E4DD] bg-white px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-stone-900">{c.name}</div>
              <div className="text-xs text-stone-500">{[c.grade && `Khối ${c.grade}`, c.subject, c.size ? `${c.size} học sinh` : ''].filter(Boolean).join(' · ') || 'Chưa có thông tin'}</div>
              {c.notes && <div className="mt-1 line-clamp-2 text-xs text-stone-600">{c.notes}</div>}
            </div>
            {confirmDel === c.id ? (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-stone-600">Xóa lớp này?</span>
                <button
                  data-testid="class-confirm-delete"
                  onClick={async () => {
                    try {
                      await api.deleteClass(c.id);
                      setConfirmDel(null);
                      await load();
                    } catch (e) {
                      setError(e instanceof ApiError ? e.message : 'Không xóa được.');
                    }
                  }}
                  className="rounded-lg bg-rose-600 px-2.5 py-1 font-semibold text-white"
                >
                  Xóa
                </button>
                <button onClick={() => setConfirmDel(null)} className="rounded-lg px-2 py-1 text-stone-500 hover:bg-stone-100">
                  Hủy
                </button>
              </div>
            ) : (
              <div className="flex gap-1">
                <button data-testid="class-edit" aria-label="Sửa lớp" onClick={() => (setEditing(c.id), setForm({name: c.name, grade: c.grade, subject: c.subject, size: c.size, notes: c.notes}))} className="rounded-lg p-1.5 text-stone-600 hover:bg-stone-100">
                  <Pencil className="h-4 w-4" />
                </button>
                <button data-testid="class-delete" aria-label="Xóa lớp" onClick={() => setConfirmDel(c.id)} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Page() {
  return (
    <Shell>
      <Classes />
    </Shell>
  );
}
