'use client';

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Download, Trash2, Upload} from 'lucide-react';
import {ApiError, api} from '../../lib/api';
import {LessonFileError, lessonToFile, parseLessonFile} from '../../lib/lessonFile';
import type {LessonMeta} from '../../lib/types';
import {ErrorNote, Shell} from '../../components/Shell';
import {BookShelf, SUBJECT_HUE, SUBJECT_LABEL, subjectFromText, type Book} from '../../components/BookShelf';

const when = (t: number) => new Date(t * 1000).toLocaleString('vi-VN', {day: '2-digit', month: '2-digit', year: 'numeric'});

function Lessons() {
  const [list, setList] = useState<LessonMeta[] | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
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
      setFocusId(saved.id);
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

  const byId = useMemo(() => new Map((list ?? []).map((m) => [m.id, m])), [list]);
  const books = useMemo<Book[] | null>(
    () =>
      list &&
      list.map((m) => {
        const subj = subjectFromText(m.folder);
        return {id: m.id, title: m.title, tag: `${SUBJECT_LABEL[subj]}${m.folder ? ` · ${m.folder}` : ''}`, meta: `${m.page_count} trang · ${m.stroke_count} đối tượng`, hue: SUBJECT_HUE[subj], group: subj, search: `${m.title} ${m.folder}`.toLowerCase()};
      }),
    [list],
  );
  const deleteLesson = async (id: string) => {
    try {
      await api.deleteLesson(id);
      setConfirmDel(null);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không xóa được.');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto font-serif text-2xl font-medium tracking-tight">Bài soạn của tôi</h1>
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
      <BookShelf
        testId="lesson-list"
        books={books}
        focusId={focusId}
        searchTestId="lesson-search"
        searchPlaceholder="Tìm theo tên hoặc thư mục…"
        tabs={Object.keys(SUBJECT_LABEL).map((k) => ({key: k, label: SUBJECT_LABEL[k]}))}
        emptyAll="Chưa có bài soạn nào."
        emptyMatch="Không có bài khớp từ khóa."
        actions={(b) => {
          const m = byId.get(b.id);
          return (
            <div className="flex items-center gap-2 text-xs text-stone-500">
              {m && <span>Cập nhật {when(m.updated_at)}</span>}
              {confirmDel === b.id ? (
                <span className="flex items-center gap-1.5">
                  <span className="text-stone-600">Xóa hẳn bài này?</span>
                  <button data-testid="lesson-confirm-delete" onClick={() => void deleteLesson(b.id)} className="rounded-lg bg-rose-600 px-2.5 py-1 font-semibold text-white">Xóa</button>
                  <button onClick={() => setConfirmDel(null)} className="rounded-lg px-2 py-1 text-stone-500 hover:bg-stone-100">Hủy</button>
                </span>
              ) : (
                <>
                  <button data-testid="lesson-export" aria-label="Xuất tệp" onClick={() => m && void exportLesson(m)} className="rounded-lg p-1.5 text-stone-600 hover:bg-stone-100">
                    <Download className="h-4 w-4" />
                  </button>
                  <button data-testid="lesson-delete" aria-label="Xóa bài" onClick={() => setConfirmDel(b.id)} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          );
        }}
      />
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
