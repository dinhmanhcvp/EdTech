'use client';

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Check, ExternalLink, FlaskConical, Search, Sparkles} from 'lucide-react';
import {SGK_ITEMS, SGK_SUBJECTS, type SgkItem, type SgkSubject} from '../../data/sgkCatalog';
import {teacherAppUrl} from '../../utils/apiBase';
import {hubFetch, loadStudent, type HubStudent} from '../../utils/hubApi';
import type {NotebookEntry} from '@socratic/types/src/hub';

const GRADES = [10, 11, 12] as const;
type Grade = (typeof GRADES)[number];
/** số kí tự tối thiểu của dự đoán (mở khung thí nghiệm) và của kết quả (đánh dấu đã học) */
const MIN_NOTE = 15;

/** Bỏ dấu, hạ chữ thường để tìm không cần gõ dấu. */
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase();

// vở ghi và "đã học" luôn có bản trên máy; học sinh đã đăng nhập hub (tab Lớp của em) thì đồng bộ thêm lên lớp để giáo viên đọc. Hỏng localStorage thì trang vẫn chạy
function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeStore(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* bị chặn: bỏ qua */
  }
}

/** Địa chỉ mở học liệu trên bảng: bài thực hành ở /lab (chế độ nhúng: không có nút đổi bài), mô phỏng ở /xem. Rỗng khi chưa cấu hình địa chỉ bảng. */
export function itemHref(item: Pick<SgkItem, 'id' | 'lab'>, board = teacherAppUrl()): string {
  if (!board || board === '#') return '';
  return item.lab ? `${board}/lab?bai=${encodeURIComponent(item.id)}&nhung=1` : `${board}/xem?id=${encodeURIComponent(item.id)}`;
}

const seg = 'px-3 py-1.5 rounded-md text-sm transition cursor-pointer text-mute hover:text-ink aria-[pressed=true]:bg-white aria-[pressed=true]:text-ink aria-[pressed=true]:font-semibold aria-[pressed=true]:shadow-card';

/** Tab "Học theo SGK": mô phỏng của bảng và bài thực hành 3D của phòng lab, xếp đúng bài trong SGK Kết nối tri thức 10–12. */
export function SgkLibrary() {
  const [subject, setSubject] = useState<SgkSubject>('ly');
  const [grade, setGrade] = useState<Grade>(10);
  const [q, setQ] = useState('');
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [pasteWarn, setPasteWarn] = useState(false);
  const viewerRef = useRef<HTMLElement>(null);
  const [who, setWho] = useState<HubStudent | null>(null);
  const [sync, setSync] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const timers = useRef<Record<string, number>>({});

  useEffect(() => {
    const localNotes = readStore<Record<string, string>>('sgk_notes', {});
    const localDone = readStore<string[]>('sgk_done', []);
    setDone(localDone);
    setNotes(localNotes);
    const me = loadStudent();
    setWho(me);
    if (!me) return;
    // bản trên lớp thắng bản trên máy; bài chỉ có trên máy thì đẩy lên một lần
    hubFetch<{entries: NotebookEntry[]}>('GET', '/me/notebook')
      .then(({entries}) => {
        const n = {...localNotes};
        const d = new Set(localDone);
        for (const e of entries) {
          n[`${e.itemKey}:du-doan`] = e.prediction;
          n[`${e.itemKey}:ket-qua`] = e.result;
          if (e.done) d.add(e.itemKey);
          else d.delete(e.itemKey);
        }
        setNotes(n);
        setDone([...d]);
        writeStore('sgk_notes', n);
        writeStore('sgk_done', [...d]);
        const onServer = new Set(entries.map((e) => e.itemKey));
        const localOnly = new Set([...Object.keys(localNotes).map((k) => k.split(':')[0]), ...localDone].filter((id) => !onServer.has(id)));
        localOnly.forEach((id) => void push(id, n, [...d]));
      })
      .catch(() => setSync('error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Lưu một học liệu lên lớp; chỉ khi đã đăng nhập hub. */
  const push = (id: string, n: Record<string, string>, d: string[]) => {
    if (!loadStudent()) return Promise.resolve();
    setSync('saving');
    return hubFetch('PUT', `/me/notebook/${encodeURIComponent(id)}`, {prediction: n[`${id}:du-doan`] ?? '', result: n[`${id}:ket-qua`] ?? '', done: d.includes(id)})
      .then(() => setSync('saved'))
      .catch(() => setSync('error'));
  };
  // gõ liên tục thì chỉ gửi sau 0,8 s ngừng gõ
  const queue = (id: string, n: Record<string, string>, d: string[]) => {
    if (!who) return;
    window.clearTimeout(timers.current[id]);
    timers.current[id] = window.setTimeout(() => void push(id, n, d), 800);
  };

  const inGrade = useMemo(() => SGK_ITEMS.filter((i) => i.subject === subject && i.grade === grade), [subject, grade]);
  const needle = fold(q.trim());
  // có chữ tìm thì tìm khắp môn, mọi lớp
  const shown = needle ? SGK_ITEMS.filter((i) => i.subject === subject && fold(`${i.lesson} ${i.title}`).includes(needle)) : inGrade;
  const groups = useMemo(() => {
    const m = new Map<string, SgkItem[]>();
    for (const i of shown) {
      const k = needle ? `Lớp ${i.grade} · ${i.lesson}` : i.lesson;
      m.set(k, [...(m.get(k) ?? []), i]);
    }
    return [...m.entries()];
  }, [shown, needle]);

  const keyOf = (i: SgkItem) => `${i.id}@${i.grade}`;
  const current = shown.find((i) => keyOf(i) === openKey) ?? shown[0] ?? null;
  const doneInGrade = inGrade.filter((i) => done.includes(i.id)).length;

  // màn hẹp: khung xem nằm dưới danh sách, chọn bài xong phải đưa nó lên
  const open = (key: string) => {
    setOpenKey(key);
    if (window.matchMedia?.('(max-width: 1023px)').matches) window.setTimeout(() => viewerRef.current?.scrollIntoView?.({behavior: 'smooth', block: 'start'}), 0);
  };
  const toggleDone = (id: string) => {
    const next = done.includes(id) ? done.filter((x) => x !== id) : [...done, id];
    setDone(next);
    writeStore('sgk_done', next);
    queue(id, notes, next);
  };
  const setNote = (key: string, text: string) => {
    const next = {...notes, [key]: text};
    setNotes(next);
    writeStore('sgk_notes', next);
    queue(key.split(':')[0], next, done);
  };

  const href = current ? itemHref(current) : '';
  const noteOf = (part: string) => (current ? notes[`${current.id}:${part}`] ?? '' : '');
  const unlocked = noteOf('du-doan').trim().length >= MIN_NOTE;
  // chặn dán: học sinh phải tự viết dự đoán và giải thích (cùng cách với ô nhập của MathNumpad)
  const blockPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    setPasteWarn(true);
    window.setTimeout(() => setPasteWarn(false), 4000);
  };
  const noteBox = (part: string, label: string, placeholder: string) => (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-mute">{label}</span>
      <textarea
        data-testid={`sgk-note-${part}`}
        value={noteOf(part)}
        onChange={(e) => current && setNote(`${current.id}:${part}`, e.target.value)}
        onPaste={blockPaste}
        onDrop={(e) => e.preventDefault()}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-lg border border-rule p-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink/20"
      />
    </label>
  );

  return (
    <section data-testid="sgk-library" className="w-full flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Môn" className="flex bg-sunk p-0.5 rounded-lg border border-rule">
          {SGK_SUBJECTS.map((s) => (
            <button key={s.id} type="button" aria-pressed={subject === s.id} onClick={() => { setSubject(s.id); setOpenKey(null); }} className={seg}>
              {s.label}
            </button>
          ))}
        </div>
        <div role="group" aria-label="Lớp" className="flex bg-sunk p-0.5 rounded-lg border border-rule">
          {GRADES.map((g) => (
            <button key={g} type="button" aria-pressed={!needle && grade === g} onClick={() => { setGrade(g); setQ(''); setOpenKey(null); }} className={seg}>
              Lớp {g}
            </button>
          ))}
        </div>
        <label className="relative flex-1 min-w-[180px] max-w-sm">
          <span className="sr-only">Tìm bài</span>
          <Search aria-hidden className="w-4 h-4 text-mute absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm bài, ví dụ: sóng dừng" className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-rule bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ink/20" />
        </label>
        {!needle && <span className="ml-auto text-xs text-mute">Đã học {doneInGrade}/{inGrade.length}</span>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(260px,340px)_1fr]">
        <nav aria-label="Danh sách bài" className="bg-white border border-rule rounded-xl shadow-card max-h-[70vh] overflow-y-auto">
          {groups.length === 0 && <p className="p-4 text-sm text-mute">Không có bài nào khớp.</p>}
          {groups.map(([lesson, items]) => (
            <div key={lesson} className="border-b border-hair last:border-0">
              <h3 className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-mute">{lesson}</h3>
              <ul className="pb-2">
                {items.map((i) => (
                  <li key={keyOf(i)}>
                    <button
                      type="button"
                      data-testid={`sgk-item-${i.id}`}
                      aria-current={current && keyOf(current) === keyOf(i) ? 'true' : undefined}
                      onClick={() => open(keyOf(i))}
                      className="w-full text-left px-3 py-2 flex items-start gap-2 text-sm hover:bg-sunk aria-[current=true]:bg-sunk aria-[current=true]:font-semibold cursor-pointer"
                    >
                      {i.lab ? <FlaskConical aria-label="Thực hành 3D" className="w-4 h-4 mt-0.5 shrink-0 text-hint" /> : <Sparkles aria-label="Mô phỏng" className="w-4 h-4 mt-0.5 shrink-0 text-mute" />}
                      <span className="flex-1">{i.title}</span>
                      {done.includes(i.id) && <Check aria-label="Đã học" className="w-4 h-4 mt-0.5 shrink-0 text-mastery" />}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {current && (
          <article ref={viewerRef} data-testid="sgk-viewer" className="bg-white border border-rule rounded-xl shadow-card p-4 flex flex-col gap-3 min-w-0">
            <header className="flex flex-wrap items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-mute">{SGK_SUBJECTS.find((s) => s.id === current.subject)!.label} {current.grade} · {current.lesson}</p>
                <h2 className="text-lg font-semibold leading-snug">{current.title}</h2>
              </div>
              {href && unlocked && (
                <a href={href} target="_blank" rel="noreferrer" className="text-sm border border-rule rounded-lg px-2.5 py-1 flex items-center gap-1 hover:bg-sunk">
                  Toàn màn hình <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </header>

            <div className="rounded-lg bg-hint-bg border border-hint-bd p-3">
              <p className="text-xs font-semibold text-hint-fg mb-1">Câu hỏi khám phá</p>
              <p className="text-sm">{current.question}</p>
            </div>

            {noteBox('du-doan', '1. Dự đoán của em (trước khi làm)', 'Em đoán điều gì sẽ xảy ra, vì sao?')}

            {!href ? (
              <p className="rounded-lg border border-dashed border-rule p-6 text-sm text-mute text-center">Chưa cấu hình địa chỉ bảng (NEXT_PUBLIC_TEACHER_URL) nên chưa mở được học liệu.</p>
            ) : unlocked ? (
              <iframe
                key={href}
                src={href}
                title={current.title}
                allow="camera; fullscreen"
                loading="lazy"
                className="w-full aspect-[16/10] min-h-[360px] rounded-lg border border-rule bg-sunk"
              />
            ) : (
              <p data-testid="sgk-locked" className="rounded-lg border border-dashed border-rule p-6 text-sm text-mute text-center">
                Viết dự đoán của em trước (ít nhất {MIN_NOTE} kí tự) rồi {current.lab ? 'thí nghiệm' : 'mô phỏng'} mới mở. Dự đoán sai cũng không sao: so với kết quả mới là lúc em học được nhiều nhất.
              </p>
            )}
            {current.lab && href && unlocked && <p className="text-xs text-mute">Bài thực hành điều khiển bằng tay qua webcam; trình duyệt sẽ hỏi quyền dùng camera.</p>}

            {unlocked && noteBox('ket-qua', '2. Kết quả của em và giải thích', 'Số liệu, hiện tượng em thấy; khác dự đoán ở đâu, vì sao?')}
            {pasteWarn && <p role="alert" className="text-xs text-hint-fg">Vở ghi không nhận dán chữ: hãy tự viết bằng lời của em.</p>}

            <button
              type="button"
              data-testid="sgk-done"
              aria-pressed={done.includes(current.id)}
              disabled={!done.includes(current.id) && noteOf('ket-qua').trim().length < MIN_NOTE}
              title={noteOf('ket-qua').trim().length < MIN_NOTE ? 'Ghi kết quả và giải thích của em trước' : undefined}
              onClick={() => toggleDone(current.id)}
              className="self-start text-sm rounded-lg px-3 py-1.5 border border-rule hover:bg-sunk disabled:opacity-50 disabled:cursor-not-allowed aria-[pressed=true]:bg-mastery-bg aria-[pressed=true]:border-mastery-bd aria-[pressed=true]:text-mastery-fg flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" /> {done.includes(current.id) ? 'Đã học' : 'Đánh dấu đã học'}
            </button>
            <p data-testid="sgk-sync" className="text-xs text-mute">
              {who
                ? {idle: `Vở ghi lưu lên lớp ${who.student.className}: thầy cô đọc được.`, saving: 'Đang lưu lên lớp…', saved: `Đã lưu lên lớp ${who.student.className}.`, error: 'Chưa lưu lên lớp được (mất mạng?). Vở vẫn còn trên máy; em sửa tiếp là thử lại.'}[sync]
                : 'Vở ghi đang chỉ lưu trên máy này. Vào "Lớp của em", nhập mã học sinh để thầy cô đọc được vở.'}
            </p>
          </article>
        )}
      </div>
    </section>
  );
}
