'use client';

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Download, Trash2, Upload} from 'lucide-react';
import {ApiError, api} from '../../lib/api';
import {LessonFileError, lessonToFile, parseLessonFile} from '../../lib/lessonFile';
import type {LessonMeta} from '../../lib/types';
import {ErrorNote, Shell} from '../../components/Shell';

const when = (t: number) => new Date(t * 1000).toLocaleString('vi-VN', {day: '2-digit', month: '2-digit', year: 'numeric'});

function Lessons() {
  const [list, setList] = useState<LessonMeta[] | null>(null);
  const [query, setQuery] = useState('');
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    try {
      setList(await api.lessons());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không tải được bài soạn.');
      setList([]);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setError(null);
    setNote(null);
    try {
      const l = parseLessonFile(await f.text());
      const saved = await api.createLesson(l.title, l.folder, l.pages);
      setNote(`Đã nhập “${saved.title}” (${saved.page_count} trang).`);
      await load();
    } catch (err) {
      setError(err instanceof LessonFileError || err instanceof ApiError ? err.message : 'Không nhập được tệp.');
    }
  };

  const exportLesson = async (m: LessonMeta) => {
    try {
      const full = await api.lesson(m.id);
      const url = URL.createObjectURL(new Blob([lessonToFile(full.title, full.folder, full.pages)], {type: 'application/json'}));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${m.title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'bai-giang'}.socrlesson.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không xuất được bài.');
    }
  };

  const k = query.trim().toLowerCase();
  const shown = (list ?? []).filter((m) => !k || `${m.title} ${m.folder}`.toLowerCase().includes(k));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-lg font-semibold">Bài soạn của tôi</h1>
        <input data-testid="lesson-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo tên hoặc thư mục…" aria-label="Tìm bài" className="rounded-lg border border-[#DCD9D0] px-3 py-1.5 text-sm" />
        <button data-testid="lesson-import" onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50">
          <Upload className="h-4 w-4" /> Nhập tệp
        </button>
        <input ref={fileRef} data-testid="lesson-import-file" type="file" accept=".json,application/json" className="hidden" onChange={(e) => void onFile(e)} />
      </div>
      <p className="text-xs text-stone-500">Soạn bài trên bảng chiếu, bấm “Lưu vào bài của tôi” khi đang dạy, hoặc nhập tệp xuất từ thư viện bài trên bảng. Bài nằm trong tài khoản của riêng bạn, giáo viên khác không thấy.</p>
      <ErrorNote error={error} />
      {note && (
        <p data-testid="lesson-note" role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {note}
        </p>
      )}
      <ul data-testid="lesson-list" className="flex flex-col gap-2">
        {list === null && <li className="text-sm text-stone-500">Đang tải…</li>}
        {list && shown.length === 0 && (
          <li data-testid="lesson-empty" className="rounded-xl bg-white p-6 text-center text-sm text-stone-500">
            {list.length === 0 ? 'Chưa có bài soạn nào.' : 'Không có bài khớp từ khóa.'}
          </li>
        )}
        {shown.map((m) => (
          <li key={m.id} data-testid="lesson-item" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#E6E4DD] bg-white px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-stone-900">{m.title}</div>
              <div className="text-xs text-stone-500">
                {m.folder ? `${m.folder} · ` : ''}
                {m.page_count} trang · {m.stroke_count} đối tượng · {when(m.updated_at)}
              </div>
            </div>
            {confirmDel === m.id ? (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-stone-600">Xóa hẳn bài này?</span>
                <button
                  data-testid="lesson-confirm-delete"
                  onClick={async () => {
                    try {
                      await api.deleteLesson(m.id);
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
                <button data-testid="lesson-export" aria-label="Xuất tệp" onClick={() => void exportLesson(m)} className="rounded-lg p-1.5 text-stone-600 hover:bg-stone-100">
                  <Download className="h-4 w-4" />
                </button>
                <button data-testid="lesson-delete" aria-label="Xóa bài" onClick={() => setConfirmDel(m.id)} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50">
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
      <Lessons />
    </Shell>
  );
}
