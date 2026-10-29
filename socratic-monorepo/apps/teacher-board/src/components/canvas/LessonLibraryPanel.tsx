'use client';

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Copy, Download, FolderOpen, Library, Trash2, Upload, X} from 'lucide-react';
import type {Stroke} from '../../utils/lassoGeometry';
import {
  DRAFT_KEY,
  LibraryError,
  duplicateLesson,
  folders,
  isEmptyBoard,
  loadDraft,
  localLessonStore,
  makeRecord,
  parseLesson,
  saveDraft,
  searchLessons,
  serializeLesson,
  type Draft,
  type LessonMeta,
  type LessonStore,
} from '../../utils/lessonLibrary';

interface Props {
  /** mọi trang của bảng hiện tại (trang đang vẽ đã gộp vào) */
  getPages: () => Stroke[][];
  /** thay cả bảng bằng các trang này, về trang đầu */
  loadPages: (pages: Stroke[][]) => void;
  /** thay được khi kiểm thử */
  store?: LessonStore;
  autosaveMs?: number;
  /** false khi bảng đang ghép với một tiết của trang quản lý: bài và bản nháp khi đó lưu lên máy chủ theo tiết, không đụng bộ nhớ dùng chung của máy bảng */
  enabled?: boolean;
}

const AUTOSAVE_MS = 20_000;
const when = (t: number) => new Date(t).toLocaleString('vi-VN', {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'});

const browserStorage = (): Storage | null => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
};

/**
 * Thư viện bài giảng: lưu bảng (mọi trang) thành bài có tên/thư mục, mở lại, nhân bản, xuất/nhập tệp. Tự lưu bản nháp mỗi ~20 giây
 * và hỏi khôi phục khi mở lại trang với bảng trống, để mất điện hay lỡ đóng tab không mất bài đang soạn.
 */
export const LessonLibraryPanel: React.FC<Props> = ({getPages, loadPages, store: storeProp, autosaveMs = AUTOSAVE_MS, enabled = true}) => {
  const storage = useMemo(browserStorage, []);
  const store = useMemo(() => storeProp ?? (storage ? localLessonStore(storage) : null), [storeProp, storage]);
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<LessonMeta[]>([]);
  const [query, setQuery] = useState('');
  const [title, setTitle] = useState('');
  const [folder, setFolder] = useState('');
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{kind: 'ok' | 'err'; text: string} | null>(null);
  const [confirm, setConfirm] = useState<{kind: 'open' | 'delete'; id: string} | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const getPagesRef = useRef(getPages);
  getPagesRef.current = getPages;

  // bản nháp: hỏi khôi phục một lần khi vào trang với bảng trống; sau đó tự lưu định kỳ khi bảng có nội dung
  useEffect(() => {
    if (enabled && storage && isEmptyBoard(getPagesRef.current())) setDraft(loadDraft(storage));
    if (!enabled) setDraft(null);
  }, [storage, enabled]);
  const lastDraft = useRef('');
  useEffect(() => {
    if (!enabled || !storage || autosaveMs <= 0) return;
    const id = window.setInterval(() => {
      const pages = getPagesRef.current();
      if (isEmptyBoard(pages)) return;
      const sig = JSON.stringify(pages);
      if (sig === lastDraft.current) return;
      if (saveDraft(storage, pages)) lastDraft.current = sig;
    }, autosaveMs);
    return () => window.clearInterval(id);
  }, [storage, autosaveMs, enabled]);

  const refresh = () => setList(store?.list() ?? []);
  const fail = (e: unknown) => setMsg({kind: 'err', text: e instanceof LibraryError ? e.message : 'Không thực hiện được; thử lại.'});
  const ok = (text: string) => setMsg({kind: 'ok', text});

  if (!store || !enabled) return null;

  // chỉ hỏi khôi phục khi bảng vẫn trống: khôi phục sẽ thay cả bảng nên không được hiện ra khi giáo viên đã bắt đầu viết
  if (draft && !open && isEmptyBoard(getPages())) {
    return (
      <div data-testid="lesson-draft" role="alert" className="absolute left-1/2 top-3 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-amber-300 bg-white/95 px-3 py-2 text-xs shadow-lg pointer-events-auto">
        <span className="text-stone-700">Có bản nháp chưa lưu lúc {when(draft.savedAt)}.</span>
        <button
          data-testid="lesson-draft-restore"
          onClick={() => {
            loadPages(draft.pages);
            setDraft(null);
          }}
          className="rounded-lg bg-amber-500 px-2.5 py-1 font-semibold text-white hover:bg-amber-600"
        >
          Khôi phục
        </button>
        <button
          data-testid="lesson-draft-discard"
          onClick={() => {
            storage?.removeItem(DRAFT_KEY);
            setDraft(null);
          }}
          className="rounded-lg px-2 py-1 text-stone-500 hover:bg-stone-100"
        >
          Bỏ
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        data-testid="lesson-library-open"
        onClick={() => {
          refresh();
          setMsg(null);
          setConfirm(null);
          setOpen(true);
        }}
        title="Lưu và mở lại bài giảng"
        className="absolute left-3 bottom-[6.25rem] z-30 pointer-events-auto flex items-center gap-1.5 rounded-full bg-white/95 border border-[#DCD9D0] shadow-md px-3 py-1.5 text-[11px] font-medium text-stone-700 hover:bg-stone-50"
      >
        <Library className="w-3.5 h-3.5" />
        Thư viện bài
      </button>
    );
  }

  const shown = searchLessons(list, query);
  const saveNow = (asNew: boolean) => {
    try {
      const pages = getPages();
      const prev = !asNew && currentId ? store.get(currentId) : null;
      const rec = makeRecord({title: title || prev?.title || '', folder: folder || prev?.folder || '', pages, id: prev?.id, createdAt: prev?.createdAt});
      store.put(rec);
      setCurrentId(rec.id);
      setTitle(rec.title);
      refresh();
      ok(prev ? `Đã cập nhật “${rec.title}”.` : `Đã lưu “${rec.title}” (${rec.pageCount} trang).`);
    } catch (e) {
      fail(e);
    }
  };
  const openLesson = (id: string) => {
    const rec = store.get(id);
    if (!rec) return fail(new LibraryError('Không đọc được bài này (có thể đã bị xóa).'));
    loadPages(rec.pages);
    setCurrentId(rec.id);
    setTitle(rec.title);
    setFolder(rec.folder);
    setConfirm(null);
    setOpen(false);
  };
  const exportLesson = (id: string) => {
    const rec = store.get(id);
    if (!rec) return;
    const url = URL.createObjectURL(new Blob([serializeLesson(rec)], {type: 'application/json'}));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${rec.title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'bai-giang'}.socrlesson.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const rec = parseLesson(await f.text());
      store.put(rec);
      refresh();
      ok(`Đã nhập “${rec.title}” (${rec.pageCount} trang).`);
    } catch (err) {
      fail(err);
    }
  };

  const boardHasContent = !isEmptyBoard(getPages());

  return (
    <div data-testid="lesson-library" className="absolute inset-0 z-40 flex items-center justify-center bg-stone-900/30 p-4 pointer-events-auto">
      <div className="flex max-h-full w-full max-w-2xl flex-col gap-3 overflow-hidden rounded-2xl border border-[#DCD9D0] bg-white p-4 shadow-xl">
        <div className="flex items-center gap-2">
          <Library className="h-4 w-4 text-blue-600" />
          <h2 className="flex-1 text-sm font-semibold text-stone-900">Thư viện bài giảng</h2>
          <button data-testid="lesson-library-close" onClick={() => setOpen(false)} className="rounded-full p-1 text-stone-500 hover:bg-stone-100" aria-label="Đóng">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-2 rounded-xl bg-stone-50 p-2.5">
          <label className="flex min-w-[10rem] flex-1 flex-col gap-0.5 text-[11px] text-stone-500">
            Tên bài
            <input data-testid="lesson-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Hàm số bậc hai – tiết 1" className="rounded-md border border-stone-300 bg-white px-2 py-1 text-sm text-stone-900" />
          </label>
          <label className="flex w-36 flex-col gap-0.5 text-[11px] text-stone-500">
            Thư mục
            <input data-testid="lesson-folder" value={folder} list="lesson-folders" onChange={(e) => setFolder(e.target.value)} placeholder="VD: Toán 10" className="rounded-md border border-stone-300 bg-white px-2 py-1 text-sm text-stone-900" />
            <datalist id="lesson-folders">
              {folders(list).map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </label>
          <button data-testid="lesson-save" onClick={() => saveNow(false)} disabled={!boardHasContent} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-stone-300">
            {currentId ? 'Cập nhật bài đang mở' : 'Lưu bảng này'}
          </button>
          {currentId && (
            <button data-testid="lesson-save-new" onClick={() => saveNow(true)} disabled={!boardHasContent} className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50">
              Lưu thành bài mới
            </button>
          )}
        </div>

        {msg && (
          <p data-testid="lesson-msg" role={msg.kind === 'err' ? 'alert' : 'status'} className={`rounded-lg px-3 py-1.5 text-xs ${msg.kind === 'err' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
            {msg.text}
          </p>
        )}

        <div className="flex items-center gap-2">
          <input data-testid="lesson-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm theo tên hoặc thư mục…" className="min-w-0 flex-1 rounded-md border border-stone-300 px-2 py-1 text-sm" aria-label="Tìm bài" />
          <button data-testid="lesson-import" onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50">
            <Upload className="h-3.5 w-3.5" />
            Nhập tệp
          </button>
          <input ref={fileRef} data-testid="lesson-import-file" type="file" accept=".json,application/json" className="hidden" onChange={(e) => void onFile(e)} />
        </div>

        <ul data-testid="lesson-list" className="min-h-[6rem] flex-1 overflow-auto rounded-xl border border-stone-200">
          {shown.length === 0 && (
            <li data-testid="lesson-empty" className="px-4 py-6 text-center text-sm text-stone-500">
              {list.length === 0 ? 'Chưa có bài nào. Soạn bảng rồi bấm “Lưu bảng này”.' : 'Không có bài khớp từ khóa.'}
            </li>
          )}
          {shown.map((m) => (
            <li key={m.id} data-testid="lesson-item" data-id={m.id} className="flex flex-wrap items-center gap-2 border-b border-stone-100 px-3 py-2 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-stone-900">
                  {m.title}
                  {m.id === currentId && <span className="ml-1.5 rounded bg-blue-100 px-1 text-[10px] text-blue-700">đang mở</span>}
                </div>
                <div className="text-[11px] text-stone-500">
                  {m.folder ? `${m.folder} · ` : ''}
                  {m.pageCount} trang · {m.strokeCount} đối tượng · {when(m.updatedAt)}
                </div>
              </div>
              {confirm?.id === m.id ? (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-stone-600">{confirm.kind === 'open' ? 'Bảng hiện tại sẽ bị thay.' : 'Xóa hẳn bài này?'}</span>
                  <button
                    data-testid="lesson-confirm"
                    onClick={() => {
                      if (confirm.kind === 'open') return openLesson(m.id);
                      try {
                        store.remove(m.id);
                        if (currentId === m.id) setCurrentId(null);
                        setConfirm(null);
                        refresh();
                      } catch (e) {
                        fail(e);
                      }
                    }}
                    className="rounded-lg bg-rose-600 px-2.5 py-1 font-semibold text-white hover:bg-rose-700"
                  >
                    {confirm.kind === 'open' ? 'Mở bài' : 'Xóa'}
                  </button>
                  <button data-testid="lesson-cancel" onClick={() => setConfirm(null)} className="rounded-lg px-2 py-1 text-stone-500 hover:bg-stone-100">
                    Hủy
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <button data-testid="lesson-open" onClick={() => (boardHasContent ? setConfirm({kind: 'open', id: m.id}) : openLesson(m.id))} className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100">
                    <FolderOpen className="h-3.5 w-3.5" />
                    Mở
                  </button>
                  <button
                    data-testid="lesson-duplicate"
                    title="Nhân bản"
                    aria-label="Nhân bản"
                    onClick={() => {
                      try {
                        duplicateLesson(store, m.id);
                        refresh();
                      } catch (e) {
                        fail(e);
                      }
                    }}
                    className="rounded-lg p-1.5 text-stone-600 hover:bg-stone-100"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button data-testid="lesson-export" title="Xuất tệp" aria-label="Xuất tệp" onClick={() => exportLesson(m.id)} className="rounded-lg p-1.5 text-stone-600 hover:bg-stone-100">
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button data-testid="lesson-delete" title="Xóa" aria-label="Xóa" onClick={() => setConfirm({kind: 'delete', id: m.id})} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-stone-400">Bài được lưu trong trình duyệt của máy này. Hãy xuất tệp để sao lưu hoặc chuyển sang máy khác.</p>
      </div>
    </div>
  );
};
